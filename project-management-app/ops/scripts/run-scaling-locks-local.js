#!/usr/bin/env node
// run-scaling-locks-local.js - End-to-end local orchestrator for distributed
// lock scaling tests using the local framework source (no private npm publish
// dependency).
//
// What it does:
//   1. Ensures Docker is running.
//   2. Builds core/backend and stages it into backend/.local-framework-backend.
//   3. Syncs metadata and builds the frontend bundle.
//   4. Starts a dedicated scaling stack with backend/Dockerfile.local.
//   5. Waits for GraphQL readiness behind nginx.
//   6. Executes ops/scripts/test-scaling-locks.js assertions.
//
// Usage:
//   node ops/scripts/run-scaling-locks-local.js
//   node ops/scripts/run-scaling-locks-local.js --replicas=3 --concurrency=50

const fs = require("node:fs");
const path = require("node:path");
const {
	run,
	step,
	ensureDockerRunning,
} = require("./_utils");

function parseArgs() {
	const replicasArg = process.argv.find((a) => a.startsWith("--replicas="));
	const concurrencyArg = process.argv.find((a) =>
		a.startsWith("--concurrency="),
	);

	const replicas = replicasArg ? parseInt(replicasArg.split("=")[1], 10) : 3;
	const concurrency = concurrencyArg
		? parseInt(concurrencyArg.split("=")[1], 10)
		: 20;

	if (!Number.isFinite(replicas) || replicas < 2) {
		throw new Error("--replicas must be an integer >= 2");
	}
	if (!Number.isFinite(concurrency) || concurrency < 2) {
		throw new Error("--concurrency must be an integer >= 2");
	}

	return { replicas, concurrency };
}

function runDrumr(appDir, repoRoot, args) {
	const isMonorepo = repoRoot !== appDir;

	if (isMonorepo) {
		const localCliPath = path
			.relative(appDir, path.join(repoRoot, "cli", "bin", "run.js"))
			.replace(/\\/g, "/");
		run("node", [localCliPath, ...args], { cwd: appDir });
		return;
	}

	run("npx", ["@drumr/cli", ...args], { cwd: appDir });
}

function findMonorepoRoot(startDir) {
	let current = startDir;
	while (true) {
		const hasCoreBackend = fs.existsSync(
			path.join(current, "core", "backend", "package.json"),
		);
		const hasLocalCli = fs.existsSync(path.join(current, "cli", "bin", "run.js"));
		if (hasCoreBackend && hasLocalCli) {
			return current;
		}

		const parent = path.dirname(current);
		if (parent === current) {
			break;
		}
		current = parent;
	}
	return null;
}

function buildLocalFrameworkBackend(repoRoot, appDir) {
	const coreBackendDir = path.join(repoRoot, "core", "backend");
	const stagingDir = path.join(appDir, "backend", ".local-framework-backend");

	if (!fs.existsSync(coreBackendDir)) {
		throw new Error(
			`Expected local framework backend at ${coreBackendDir}, but it was not found.`,
		);
	}

	step("Building local framework backend package...");
	run("npm", ["run", "build"], { cwd: coreBackendDir });

	const builtDistPath = path.join(coreBackendDir, "dist");
	if (!fs.existsSync(builtDistPath)) {
		throw new Error(
			`Expected built framework output at ${builtDistPath}, but it was not found.`,
		);
	}

	step("Staging local framework backend for Docker context...");
	fs.rmSync(stagingDir, { recursive: true, force: true });
	fs.mkdirSync(stagingDir, { recursive: true });
	fs.copyFileSync(
		path.join(coreBackendDir, "package.json"),
		path.join(stagingDir, "package.json"),
	);
	fs.cpSync(builtDistPath, path.join(stagingDir, "dist"), { recursive: true });

	console.log(`    Staged ${path.relative(appDir, stagingDir)}`);
}

async function waitForGraphqlReady(timeoutMs = 120000, intervalMs = 2000) {
	const start = Date.now();
	const queryBody = JSON.stringify({ query: "{ __typename }" });

	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch("http://localhost:8080/graphql", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: queryBody,
			});

			// 200 = ready. 401/403 may appear if auth middleware is strict; both
			// still prove backend reachability behind nginx.
			if (res.status === 200 || res.status === 401 || res.status === 403) {
				return;
			}
		} catch {
			// Keep polling until timeout.
		}

		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}

	throw new Error("Timed out waiting for GraphQL endpoint readiness on http://localhost:8080/graphql");
}

async function main() {
	const { replicas, concurrency } = parseArgs();
	const appDir = path.resolve(__dirname, "..", "..");
	const repoRoot = findMonorepoRoot(appDir);

	if (!repoRoot) {
		throw new Error(
			"Could not locate monorepo root. This script requires local framework sources.",
		);
	}

	step("Ensuring Docker is running...");
	await ensureDockerRunning();

	buildLocalFrameworkBackend(repoRoot, appDir);

	step("Syncing metadata...");
	runDrumr(appDir, repoRoot, ["sync-metadata"]);

	step("Building frontend production bundle...");
	run("npm", ["run", "build"], { cwd: path.join(appDir, "frontend") });

	step("Starting dedicated scaling stack...");
	run(
		"docker",
		[
			"compose",
			"-f",
			"docker-compose.yml",
			"-f",
			"docker-compose.scaling-local.yml",
			"up",
			"--build",
			"--scale",
			`backend=${replicas}`,
			"-d",
		],
		{ cwd: appDir, env: { ...process.env, DOCKER_BUILDKIT: "1" } },
	);

	step("Waiting for GraphQL readiness...");
	await waitForGraphqlReady();

	step("Running scaling lock assertions...");
	run(
		"node",
		["ops/scripts/test-scaling-locks.js", `--concurrency=${concurrency}`],
		{ cwd: appDir },
	);

	console.log("");
	console.log("Scaling lock test finished successfully.");
	console.log("To stop the stack run:");
	console.log(
		"  docker compose -f docker-compose.yml -f docker-compose.scaling-local.yml down",
	);
}

main().catch((error) => {
	console.error(`ERROR: ${error.message}`);
	process.exit(1);
});
