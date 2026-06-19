#!/usr/bin/env node
// _deployEnv.js — helpers for deploy-script config.
// Loaded by every ops script via require('./_deployEnv'). Most helpers are
// pure (caller owns all prompts, banners, exit codes). The only exception is
// chooseChainNext, which renders the end-of-script chain menu via console.log
// so callers don't each have to re-implement identical numbered-menu output.

const fs = require("node:fs");
const path = require("node:path");

/**
 * Parse a KEY=VALUE .env-style file body into an object.
 *   - Lines starting with `#` (after trim) are ignored.
 *   - Blank lines are ignored.
 *   - Values surrounded by matching single or double quotes are unquoted.
 *   - Everything after the first `=` is the value (values may contain `=`).
 *   - Whitespace around keys is trimmed; whitespace around values is trimmed
 *     before unquoting (so `KEY = "value"` works).
 */
function parseEnvText(contents) {
	const result = {};
	if (!contents) return result;
	for (const rawLine of String(contents).split(/\r?\n/)) {
		const trimmed = rawLine.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = rawLine.indexOf("=");
		if (eq < 0) continue;
		const key = rawLine.slice(0, eq).trim();
		if (!key) continue;
		let value = rawLine.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
			(value.startsWith("'") && value.endsWith("'") && value.length >= 2)
		) {
			value = value.slice(1, -1);
		}
		result[key] = value;
	}
	return result;
}

/**
 * Load and parse a .env file. Returns {} if the file does not exist.
 * Throws only on genuine I/O errors (permission denied, etc.).
 */
function loadEnvFile(filePath) {
	try {
		const text = fs.readFileSync(filePath, "utf8");
		return parseEnvText(text);
	} catch (error) {
		if (error && error.code === "ENOENT") return {};
		throw error;
	}
}

/**
 * Serialize an object to .env text. Values that contain whitespace, `#`,
 * or end with whitespace get wrapped in double quotes. Empty values emit
 * `KEY=` (not `KEY=""`).
 */
function serializeEnvText(obj, { header = "" } = {}) {
	const lines = [];
	if (header) lines.push(header.replace(/\n+$/, ""));
	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined || value === null || value === "") {
			lines.push(`${key}=`);
			continue;
		}
		const stringValue = String(value);
		const needsQuotes = /[\s#]/.test(stringValue) || /\s$/.test(stringValue);
		lines.push(
			needsQuotes
				? `${key}="${stringValue.replace(/"/g, '\\"')}"`
				: `${key}=${stringValue}`,
		);
	}
	return `${lines.join("\n")}\n`;
}

/**
 * Update a .env file in place, preserving unlisted keys. Keys whose value
 * is undefined in `updates` are left alone.
 */
function updateEnvFile(filePath, updates, { header = "" } = {}) {
	const existing = loadEnvFile(filePath);
	const merged = { ...existing };
	for (const [k, v] of Object.entries(updates)) {
		if (v !== undefined) merged[k] = v;
	}
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, serializeEnvText(merged, { header }));
	return merged;
}

/**
 * Build the resolved deploy-script configuration, preferring in this order:
 *   1. process.env[name]  (explicit override for this run)
 *   2. file-backed value  (previously written ops/deploy.env)
 *   3. prompt() default   (first-time prompt)
 *
 * `specs` is an ordered array of:
 *   { name, prompt, default?, hidden?, required?, persist? }
 * where:
 *   - name     = env var / .env key
 *   - prompt   = label passed to the provided prompt function
 *   - default  = fallback shown in brackets when we prompt
 *   - hidden   = pass through to prompt for password-style input
 *   - required = if true and empty after resolution, throw
 *   - persist  = if false, the value is NOT included in the return's
 *                `toPersist` set (used for secrets that must not be written)
 *
 * Returns { values, promptedKeys, toPersist }.
 *
 * The caller owns the prompt function (so this module stays I/O-free).
 * In non-TTY (CI) environments, missing values that are `required` and
 * have no default throw immediately — the caller should set env vars.
 */
async function loadOrCollectConfig({
	deployEnvPath,
	specs,
	prompt,
	isInteractive,
}) {
	const fileValues = loadEnvFile(deployEnvPath);
	const values = {};
	const promptedKeys = [];
	const toPersist = {};

	for (const spec of specs) {
		const {
			name,
			prompt: label,
			default: defaultValue,
			hidden,
			required = false,
			persist = true,
		} = spec;
		const envValue = process.env[name];
		const fileValue = fileValues[name];

		let resolved;
		if (envValue !== undefined && envValue !== "") {
			resolved = envValue;
		} else if (fileValue !== undefined && fileValue !== "") {
			resolved = fileValue;
		} else if (isInteractive) {
			// eslint-disable-next-line no-await-in-loop
			resolved = await prompt(label, { default: defaultValue, hidden });
			if (!resolved && defaultValue !== undefined)
				resolved = String(defaultValue);
			if (resolved !== "" && resolved !== undefined) promptedKeys.push(name);
		} else {
			resolved = defaultValue !== undefined ? String(defaultValue) : "";
		}

		if (required && (resolved === undefined || resolved === "")) {
			throw new Error(
				`Required value '${name}' is missing. Set ${name}=... or run interactively.`,
			);
		}

		values[name] = resolved;
		if (persist && resolved !== "" && resolved !== undefined) {
			toPersist[name] = resolved;
		}
	}

	return { values, promptedKeys, toPersist };
}

/**
 * Keys in backend/.env that are managed by the deploy pipeline.
 * These are never converted into app-level runtime secrets because deploy.js
 * sets them directly as infrastructure configuration.
 */
const DEPLOY_RESERVED_KEYS = Object.freeze([
	"HOST",
	"PORT",
	"DB_HOST",
	"DB_PORT",
	"DB_USER",
	"DB_NAME",
	"DB_SYNCHRONIZE",
	"NODE_ENV",
	"DB_PASSWORD",
	"JWT_SECRET",
	"STORAGE_TYPE",
	"GCS_BUCKET",
]);

function secretNameFromEnvKey(appName, key) {
	return `${appName}-${key.toLowerCase().replace(/_/g, "-")}`;
}

/**
 * Given a parsed backend/.env object, split its keys into:
 *   - forwarded: safe to pass to `gcloud run deploy --set-env-vars`
 *   - dropped:   reserved keys that were present (caller should log one
 *                warning per dropped key so devs know why their local
 *                value is not reaching production)
 */
function filterRuntimeEnvForDeploy(envObject, reserved = DEPLOY_RESERVED_KEYS) {
	const forwarded = {};
	const dropped = {};
	const reservedSet = new Set(reserved);
	for (const [key, value] of Object.entries(envObject || {})) {
		if (reservedSet.has(key)) dropped[key] = value;
		else forwarded[key] = value;
	}
	return { forwarded, dropped };
}

/**
 * Serialize an object to the `K1=V1,K2=V2` shape that
 * `gcloud run deploy --set-env-vars` and `--update-env-vars` accept.
 * Commas inside values are escaped as `^^` per gcloud's --delimiter rules
 * is NOT supported here — callers that need commas in values should use
 * a --env-vars-file instead. We detect and throw on unsupported values.
 */
function formatEnvVarsFlag(envObject) {
	const parts = [];
	for (const [key, value] of Object.entries(envObject || {})) {
		const stringValue =
			value === undefined || value === null ? "" : String(value);
		if (stringValue.includes(",")) {
			throw new Error(
				`Env var '${key}' contains a comma. Split on commas is ambiguous for gcloud --set-env-vars. ` +
					`Rename or remove the variable, or refactor this call to use --env-vars-file.`,
			);
		}
		parts.push(`${key}=${stringValue}`);
	}
	return parts.join(",");
}

const { spawn: nativeSpawn } = require("node:child_process");

/**
 * Parse the user's answer to a numbered-choice chain prompt.
 * Accepts:
 *   - empty string → defaultIndex
 *   - '1', '2', ...   → 1-based index
 *   - anything else   → null (caller should re-prompt or treat as 'stop')
 * `count` is the number of options.
 */
function parseChainChoice(answer, { count, defaultIndex }) {
	const trimmed = String(answer || "").trim();
	if (trimmed === "") return defaultIndex;
	const n = Number.parseInt(trimmed, 10);
	if (!Number.isInteger(n) || n < 1 || n > count) return null;
	return n;
}

/**
 * Render a numbered-choice chain prompt and return the selected option
 * (an element of `choices`) or null if the user picked the "stop" option.
 *
 * `choices` = [{ label, script, env? }, ...]
 * Each entry has:
 *   - label  = text shown after `[N] `
 *   - script = script path relative to the app root (null = stop)
 *   - env    = optional env-var overrides for the child (e.g. DB_PASSWORD)
 *
 * Non-TTY: returns null immediately (CI never chains beyond the script it
 * was invoked to run).
 */
async function chooseChainNext({
	choices,
	defaultIndex = 1,
	prompt,
	isInteractive,
}) {
	if (!isInteractive) return null;
	console.log("");
	console.log("What do you want to do next?");
	choices.forEach((choice, i) => {
		const marker = i + 1 === defaultIndex ? " (default)" : "";
		console.log(`  [${i + 1}] ${choice.label}${marker}`);
	});
	const answer = await prompt("  Choice", { default: String(defaultIndex) });
	const pick = parseChainChoice(answer, {
		count: choices.length,
		defaultIndex,
	});
	if (pick == null) {
		console.log("  (unrecognized choice — exiting)");
		return null;
	}
	const selected = choices[pick - 1];
	if (!selected.script) return null;
	return selected;
}

/**
 * Spawn a child node script with inherited stdio and optional env overrides.
 * Rejects on non-zero exit. Spawns node directly (without cmd.exe) so Windows
 * paths with backslashes are not double-quoted by the shell wrapper.
 */
function runChildScript({ scriptPath, env = {} }) {
	return new Promise((resolve, reject) => {
		// Resolve the script path relative to the app root (two dirs above this file)
		// so the chain works regardless of the directory the user invoked from.
		const appRoot = path.resolve(__dirname, "..", "..");
		const resolvedPath = path.isAbsolute(scriptPath)
			? scriptPath
			: path.resolve(appRoot, scriptPath);
		const child = nativeSpawn("node", [resolvedPath], {
			env: { ...process.env, ...env },
			stdio: "inherit",
			cwd: appRoot,
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${scriptPath} exited with code ${code}`));
		});
	});
}

module.exports = {
	parseEnvText,
	loadEnvFile,
	serializeEnvText,
	updateEnvFile,
	loadOrCollectConfig,
	filterRuntimeEnvForDeploy,
	formatEnvVarsFlag,
	parseChainChoice,
	chooseChainNext,
	runChildScript,
	DEPLOY_RESERVED_KEYS,
	secretNameFromEnvKey,
};
