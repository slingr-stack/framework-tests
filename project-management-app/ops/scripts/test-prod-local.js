#!/usr/bin/env node
// test-prod-local.js - Build and run the full production stack locally.
//
// Mirrors the GCP deployment topology so you can smoke-test the production
// build before pushing to the cloud.
//
// Prerequisites:
//   - Docker installed
//   - gcloud CLI authenticated (for npm registry token)
//   - Run from the app root directory
//
// Usage:
//   node ops/scripts/test-prod-local.js

const path = require("node:path");
const { run, runCapture, step, ensureDockerRunning } = require("./_utils");

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

async function main() {
	const appDir = path.resolve(__dirname, "..", "..");
	let repoRoot = appDir;
	try {
		repoRoot = runCapture("git", ["rev-parse", "--show-toplevel"], {
			cwd: appDir,
		});
	} catch {
		console.log("    (no git repository detected - using standalone mode)");
	}

	step("Ensuring Docker is running...");
	await ensureDockerRunning();

	step("[1/3] Generating view metadata and GraphQL types...");
	runDrumr(appDir, repoRoot, ["sync-metadata"]);

	step("[2/3] Building frontend production bundle...");
	run("npm", ["run", "build"], { cwd: path.join(appDir, "frontend") });

	step("[3/3] Starting full production stack (Ctrl-C to stop)...");
	const npmToken = runCapture("gcloud", ["auth", "print-access-token"]);
	run(
		"docker",
		[
			"compose",
			"--profile",
			"frontend",
			"-f",
			"docker-compose.yml",
			"-f",
			"docker-compose.prod-test.yml",
			"up",
			"--build",
		],
		{
			cwd: appDir,
			env: { ...process.env, NPM_TOKEN: npmToken, DOCKER_BUILDKIT: "1" },
		},
	);

	console.log("");
	console.log("Stack stopped.");
}

main().catch((error) => {
	console.error(`ERROR: ${error.message}`);
	process.exit(1);
});
