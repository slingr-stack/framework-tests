#!/usr/bin/env node
// setup-secrets.js - Create or rotate Secret Manager secrets for project-management-app.
// Re-run any time you need to rotate credentials.
//
// Prerequisites: setup-gcp.js completed, gcloud init run
//
// Usage: node ops/scripts/setup-secrets.js
//   Override project if needed: PROJECT_ID=my-project node ops/scripts/setup-secrets.js

const crypto = require("node:crypto");
const {
	getProjectIdFromGcloud,
	prompt,
	step,
	createOrUpdateSecret,
} = require("./_utils");

async function main() {
	const path = require("node:path");
	const {
		loadOrCollectConfig,
		chooseChainNext,
		runChildScript,
	} = require("./_deployEnv");
	const { buildCommand } = require("./_utils");

	const DEPLOY_ENV_PATH = path.resolve(__dirname, "..", "deploy.env");
	const isInteractive = process.stdin.isTTY;
	const fallbackProjectId = process.env.PROJECT_ID || getProjectIdFromGcloud();

	const { values: cfg } = await loadOrCollectConfig({
		deployEnvPath: DEPLOY_ENV_PATH,
		isInteractive,
		prompt,
		specs: [
			{
				name: "APP_NAME",
				prompt: "  App name",
				default: "project-management-app",
				required: true,
			},
			{
				name: "PROJECT_ID",
				prompt: "  GCP Project ID",
				default: fallbackProjectId,
				required: true,
			},
		],
	});

	const projectId = cfg.PROJECT_ID;
	const appName = cfg.APP_NAME;

	if (!projectId || projectId === "(unset)") {
		throw new Error(
			"No active GCP project. Run gcloud init first, or pass PROJECT_ID as an env var.",
		);
	}

	const backendSa = `${appName}-backend@${projectId}.iam.gserviceaccount.com`;
	const chainedPassword = process.env.DB_PASSWORD;

	if (isInteractive && !chainedPassword) {
		console.log("");
		console.log(
			"  ⚠  Standalone run: the DB password you enter below must match the one",
		);
		console.log(
			"     used with setup-gcp.js. For first-time setup, run setup-gcp.js first",
		);
		console.log(
			"     (it chains into this script automatically) or pass DB_PASSWORD as an env var.",
		);
		console.log("");
	}

	step("DB password");
	const dbPassword =
		chainedPassword ||
		(await prompt("  Enter DB password (input hidden): ", { hidden: true }));
	if (!dbPassword) {
		throw new Error("DB password cannot be empty.");
	}
	if (chainedPassword && isInteractive) {
		console.log("  Using DB password received from setup-gcp.js.");
	}
	await createOrUpdateSecret(
		projectId,
		backendSa,
		`${appName}-db-password`,
		dbPassword,
	);

	step("JWT signing secret");
	let jwtSecret = await prompt(
		"  Enter JWT secret (Enter to auto-generate): ",
		{ hidden: true },
	);
	if (!jwtSecret) {
		jwtSecret = crypto.randomBytes(48).toString("base64");
		console.log("  Auto-generated.");
	}
	await createOrUpdateSecret(
		projectId,
		backendSa,
		`${appName}-jwt-secret`,
		jwtSecret,
	);

	console.log("");
	console.log(
		`✓ Secrets stored. View at: https://console.cloud.google.com/security/secret-manager?project=${projectId}`,
	);
	console.log("");

	const choice = await chooseChainNext({
		isInteractive,
		prompt,
		defaultIndex: 1,
		choices: [
			{
				label: "Run deploy.js  (first deployment)",
				script: "ops/scripts/deploy.js",
			},
			{
				label: "Run setup-trigger.js  (optional — GitHub trigger)",
				script: "ops/scripts/setup-trigger.js",
			},
			{ label: "Exit", script: null },
		],
	});

	if (choice?.script) {
		console.log("");
		await runChildScript({ scriptPath: choice.script, buildCommand });
	}
}

main().catch((error) => {
	console.error(`ERROR: ${error.message}`);
	process.exit(1);
});
