#!/usr/bin/env node

const { spawn, spawnSync } = require("node:child_process");
const net = require("node:net");
const readline = require("node:readline");

function escapeWindowsArg(arg) {
	if (/^[A-Za-z0-9_./=:@,()*-]+$/.test(arg)) {
		return arg;
	}

	return `"${arg.replace(/"/g, '\\"')}"`;
}

function buildCommand(command, args = []) {
	if (process.platform !== "win32") {
		return { command, args };
	}

	// When invoking through cmd.exe, arguments must be escaped for cmd parsing
	// before they reach the target executable. Build a single command string so
	// patterns containing cmd metacharacters (for example ^develop$) are passed
	// through unchanged.
	const cmdCommand = [
		escapeWindowsArg(command),
		...args.map(escapeWindowsArg),
	].join(" ");

	return {
		command: "cmd.exe",
		args: ["/d", "/s", "/c", cmdCommand],
	};
}

function run(command, args = [], options = {}) {
	const {
		allowFailure = false,
		cwd,
		env,
		input,
		suppressOutput = false,
	} = options;

	const stdio = suppressOutput
		? ["pipe", "pipe", "pipe"]
		: input !== undefined
			? ["pipe", "inherit", "inherit"]
			: "inherit";

	const executable = buildCommand(command, args);

	const result = spawnSync(executable.command, executable.args, {
		cwd,
		env,
		stdio,
		encoding: "utf8",
		input,
		windowsVerbatimArguments: true,
	});

	if (result.error) {
		throw result.error;
	}

	if ((result.status ?? 1) !== 0 && !allowFailure) {
		throw new Error(
			`Command failed (${result.status}): ${command} ${args.join(" ")}`,
		);
	}

	return result;
}

function runCapture(command, args = [], options = {}) {
	const { allowFailure = false, cwd, env } = options;

	const executable = buildCommand(command, args);

	const result = spawnSync(executable.command, executable.args, {
		cwd,
		env,
		stdio: ["ignore", "pipe", "pipe"],
		encoding: "utf8",
		windowsVerbatimArguments: true,
	});

	if (result.error) {
		throw result.error;
	}

	if ((result.status ?? 1) !== 0) {
		if (allowFailure) {
			return "";
		}

		const stderr = (result.stderr || "").trim();
		throw new Error(
			`Command failed (${result.status}): ${command} ${args.join(" ")}${stderr ? `\n${stderr}` : ""}`,
		);
	}

	return (result.stdout || "").trim();
}

function step(label) {
	console.log(`==> ${label}`);
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPort(host, port, timeoutMs = 15000, intervalMs = 1000) {
	const start = Date.now();

	while (Date.now() - start < timeoutMs) {
		const connected = await new Promise((res) => {
			const socket = net.connect({ host, port });

			socket.once("connect", () => {
				socket.end();
				res(true);
			});

			socket.once("error", () => {
				socket.destroy();
				res(false);
			});
		});

		if (connected) {
			return;
		}

		await sleep(intervalMs);
	}

	throw new Error(`Timed out waiting for ${host}:${port}`);
}

function prompt(message, options = {}) {
	const { hidden = false } = options;
	const defaultValue = options.default;
	// displayDefault controls what appears in brackets; default falls back to defaultValue
	const displayDefault =
		options.displayDefault !== undefined
			? options.displayDefault
			: defaultValue;

	const label =
		displayDefault !== undefined ? `${message} [${displayDefault}]: ` : message;

	// Non-interactive (CI) mode: return the default immediately without prompting
	if (!process.stdin.isTTY) {
		return Promise.resolve(
			defaultValue !== undefined ? String(defaultValue) : "",
		);
	}

	if (!hidden) {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		return new Promise((resolve) => {
			rl.question(label, (answer) => {
				rl.close();
				resolve(
					answer !== ""
						? answer
						: defaultValue !== undefined
							? String(defaultValue)
							: answer,
				);
			});
		});
	}

	return new Promise((resolve, reject) => {
		const stdin = process.stdin;
		let value = "";

		process.stdout.write(label);

		const cleanup = () => {
			stdin.removeListener("data", onData);
			if (stdin.isTTY) {
				stdin.setRawMode(false);
			}
			stdin.pause();
			process.stdout.write("\n");
		};

		const onData = (chunk) => {
			const char = chunk.toString("utf8");

			if (char === "\u0003") {
				cleanup();
				reject(new Error("Prompt cancelled."));
				return;
			}

			if (char === "\r" || char === "\n") {
				cleanup();
				resolve(
					value !== ""
						? value
						: defaultValue !== undefined
							? String(defaultValue)
							: "",
				);
				return;
			}

			if (char === "\u0008" || char === "\u007f") {
				value = value.slice(0, -1);
				return;
			}

			value += char;
		};

		stdin.setEncoding("utf8");
		stdin.resume();
		if (stdin.isTTY) {
			stdin.setRawMode(true);
		}
		stdin.on("data", onData);
	});
}

function getProjectIdFromGcloud() {
	return runCapture("gcloud", ["config", "get-value", "project"], {
		allowFailure: true,
	});
}

async function ensureDockerRunning() {
	const dockerInstalled =
		run("docker", ["--version"], { allowFailure: true, suppressOutput: true })
			.status === 0;
	if (!dockerInstalled) {
		throw new Error("Docker CLI is not installed or not available on PATH.");
	}

	const dockerReady = () =>
		run("docker", ["info"], { allowFailure: true, suppressOutput: true })
			.status === 0;
	if (dockerReady()) {
		return;
	}

	console.log("  Docker is not running. Attempting to start it...");

	const startCommands =
		process.platform === "darwin"
			? [{ command: "open", args: ["-a", "Docker"] }]
			: process.platform === "win32"
				? [
						{
							command: "powershell.exe",
							args: [
								"-NoProfile",
								"-Command",
								'Start-Process "Docker Desktop"',
							],
						},
					]
				: [
						{
							command: "systemctl",
							args: ["--user", "start", "docker-desktop"],
						},
						{ command: "systemctl", args: ["start", "docker"] },
						{ command: "service", args: ["docker", "start"] },
					];

	let startAttempted = false;
	for (const startCommand of startCommands) {
		const executable = buildCommand(startCommand.command, startCommand.args);
		const result = spawnSync(executable.command, executable.args, {
			stdio: "ignore",
			windowsHide: true,
		});
		if (!result.error && (result.status ?? 1) === 0) {
			startAttempted = true;
			break;
		}
	}

	if (!startAttempted) {
		console.log(
			"  (Automatic Docker start command was not available; waiting in case Docker is already starting.)",
		);
	}

	for (let attempt = 0; attempt < 30; attempt += 1) {
		if (dockerReady()) {
			console.log("  Docker is ready.");
			return;
		}
		await sleep(2000);
	}

	throw new Error(
		"Docker is installed but not running. Start Docker and re-run the script.",
	);
}

function createOrUpdateSecret(projectId, backendSa, secretName, secretValue) {
	const exists =
		run(
			"gcloud",
			["secrets", "describe", secretName, `--project=${projectId}`],
			{
				allowFailure: true,
				suppressOutput: true,
			},
		).status === 0;

	if (exists) {
		console.log(`  Rotating '${secretName}'...`);
		run(
			"gcloud",
			[
				"secrets",
				"versions",
				"add",
				secretName,
				"--data-file=-",
				`--project=${projectId}`,
			],
			{
				input: secretValue,
			},
		);
	} else {
		console.log(`  Creating '${secretName}'...`);
		run(
			"gcloud",
			[
				"secrets",
				"create",
				secretName,
				"--replication-policy=automatic",
				"--data-file=-",
				`--project=${projectId}`,
			],
			{ input: secretValue },
		);
	}

	run("gcloud", [
		"secrets",
		"add-iam-policy-binding",
		secretName,
		`--member=serviceAccount:${backendSa}`,
		"--role=roles/secretmanager.secretAccessor",
		`--project=${projectId}`,
		"--quiet",
	]);
}

function resolveCommand(command) {
	if (process.platform === "win32") {
		return "cmd.exe";
	}

	return command;
}

module.exports = {
	getProjectIdFromGcloud,
	prompt,
	run,
	runCapture,
	sleep,
	step,
	waitForPort,
	resolveCommand,
	buildCommand,
	spawn,
	ensureDockerRunning,
	createOrUpdateSecret,
};
