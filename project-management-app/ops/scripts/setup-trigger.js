#!/usr/bin/env node
// setup-trigger.js - Create or update the Cloud Build GitHub trigger for project-management-app.
// Safe to re-run: if the trigger already exists, it is updated in place.
//
// Prerequisites:
//   - setup-gcp.js completed successfully
//   - GitHub repository connected to Cloud Build
//
// Usage:
//   node ops/scripts/setup-trigger.js
//
//   Optional env overrides:
//   PROJECT_ID=my-project REGION=us-central1 APP_NAME=project-management-app \
//   REPO_OWNER=my-org REPO_NAME=deployment-support BRANCH=develop \
//   node ops/scripts/setup-trigger.js

const {
	getProjectIdFromGcloud,
	prompt,
	run,
	runCapture,
	step,
} = require("./_utils");
const { normalizeFrontendHosting } = require("./_frontendHosting");

function normalizeBranchPattern(rawInput) {
	const value = String(rawInput || "").trim() || "develop";
	const withoutStart = value.replace(/^\^+/, "");
	const withoutAnchors = withoutStart.replace(/\$+$/, "");
	return `^${withoutAnchors}$`;
}

function buildSubstitutions({
	projectId,
	region,
	arRepo,
	resourcePrefix,
	backendService,
	backendMaxInstances,
	backendSa,
	dbInstanceName,
	vpcName,
	subnetName,
	dbSecretName,
	jwtSecretName,
	seedAdminSecretName,
	frontendHosting,
}) {
	return [
		`_PROJECT_ID=${projectId}`,
		`_REGION=${region}`,
		`_AR_REPO=${arRepo}`,
		`_RESOURCE_PREFIX=${resourcePrefix}`,
		`_BACKEND_SERVICE=${backendService}`,
		`_BACKEND_MAX_INSTANCES=${backendMaxInstances}`,
		`_BACKEND_SA=${backendSa}`,
		`_DB_INSTANCE_NAME=${dbInstanceName}`,
		`_VPC_NAME=${vpcName}`,
		`_SUBNET_NAME=${subnetName}`,
		`_DB_SECRET_NAME=${dbSecretName}`,
		`_JWT_SECRET_NAME=${jwtSecretName}`,
		`_SEED_ADMIN_SECRET_NAME=${seedAdminSecretName}`,
		`_FRONTEND_HOSTING=${frontendHosting}`,
	].join(",");
}

function normalizeBackendServiceAccount(rawValue, fallbackLocalPart) {
	const value = String(rawValue || "").trim();
	if (!value) {
		return fallbackLocalPart;
	}

	return value.split("@")[0] || fallbackLocalPart;
}

function parseTriggerList(rawJson) {
	if (!rawJson) {
		return [];
	}

	try {
		const parsed = JSON.parse(rawJson);
		return Array.isArray(parsed) ? parsed : [];
	} catch (error) {
		throw new Error(`Failed to parse trigger list JSON: ${error.message}`);
	}
}

function hasInvalidArgumentError(result) {
	const output = `${result.stdout || ""}\n${result.stderr || ""}`;
	return /INVALID_ARGUMENT/i.test(output);
}

function hasNotFoundError(result) {
	const output = `${result.stdout || ""}\n${result.stderr || ""}`;
	return /(NOT_FOUND|not found)/i.test(output);
}

function listConnections(projectId, region) {
	const raw = runCapture(
		"gcloud",
		[
			"builds",
			"connections",
			"list",
			`--project=${projectId}`,
			`--region=${region}`,
			"--format=json",
		],
		{ allowFailure: true },
	);

	if (!raw) {
		return [];
	}

	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch (_error) {
		return [];
	}
}

function throwHelpfulTriggerError({
	mode,
	result,
	projectId,
	region,
	repoOwner,
	repoName,
	repositoryResource,
}) {
	const baseOutput = (result.stderr || result.stdout || "")
		.trim()
		.replace(/^ERROR:\s*/i, "");
	const connectionHelp = [
		"Cloud Build could not validate the repository binding.",
		mode === "v2"
			? `Repository resource used: ${repositoryResource}`
			: `GitHub repository used: ${repoOwner}/${repoName}`,
		"",
		"Verify repository connection first:",
		"  1. Open https://console.cloud.google.com/cloud-build/triggers/connect",
		"  2. Install/authorize the Cloud Build GitHub app for the repository",
		"  3. Re-run setup-trigger.js",
		"",
		"CLI alternative (2nd gen):",
		`  gcloud builds connections create github <CONNECTION_NAME> --region=${region} --project=${projectId}`,
		`  gcloud builds repositories create <REPO_NAME> --remote-uri=https://github.com/<ORG>/<REPO>.git --connection=<CONNECTION_NAME> --region=${region} --project=${projectId}`,
		"  Then re-run using REPOSITORY=<projects/.../locations/.../connections/.../repositories/...>.",
	].join("\n");

	if (hasInvalidArgumentError(result) || hasNotFoundError(result)) {
		throw new Error(`${baseOutput}\n\n${connectionHelp}`);
	}

	throw new Error(
		baseOutput || "Unknown gcloud error while creating/updating trigger.",
	);
}

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

	if (isInteractive) {
		console.log("");
		console.log("==> Cloud Build trigger setup — project-management-app");
		console.log("    Press Enter to accept defaults shown in [brackets].");
		console.log("");
	}

	const fallbackProjectId = process.env.PROJECT_ID || getProjectIdFromGcloud();

	const { values: cfg } = await loadOrCollectConfig({
		deployEnvPath: DEPLOY_ENV_PATH,
		isInteractive,
		prompt,
		specs: [
			{
				name: "PROJECT_ID",
				prompt: "  GCP Project ID",
				default: fallbackProjectId,
				required: true,
			},
			{
				name: "APP_NAME",
				prompt: "  App name",
				default: "project-management-app",
				required: true,
			},
			{
				name: "RESOURCE_PREFIX",
				prompt: "  Resource prefix",
				default: "project-mgmt",
				required: true,
			},
			{
				name: "REGION",
				prompt: "  Region",
				default: "us-central1",
				required: true,
			},
			{
				name: "AR_REPO",
				prompt: "  Artifact Registry repository",
				default: "drumr-apps",
				required: true,
			},
			{
				name: "DB_INSTANCE_NAME",
				prompt: "  Cloud SQL instance name",
				default: "project-mgmt-db",
				required: true,
			},
			{
				name: "BACKEND_MAX_INSTANCES",
				prompt: "  Backend max instances",
				default: "1",
				required: true,
			},
			{
				name: "FRONTEND_HOSTING",
				prompt: "  Frontend hosting (simple|prod)",
				default: "simple",
				required: true,
			},
			{
				name: "REPO_OWNER",
				prompt: "  GitHub repo owner (org/user)",
				required: false,
			},
			{
				name: "REPO_NAME",
				prompt: "  GitHub repo name",
				default: "project-management-app",
				required: false,
			},
			{
				name: "BRANCH",
				prompt: "  Deploy branch (name only)",
				default: "develop",
				required: true,
			},
		],
	});

	const projectId = cfg.PROJECT_ID;
	const appName = cfg.APP_NAME;
	const resourcePrefix = cfg.RESOURCE_PREFIX;
	const region = cfg.REGION;
	const arRepoName = cfg.AR_REPO;
	const dbInstanceName = cfg.DB_INSTANCE_NAME;
	const backendMaxInstances = cfg.BACKEND_MAX_INSTANCES;
	const frontendHosting = normalizeFrontendHosting(cfg.FRONTEND_HOSTING);

	if (!projectId || projectId === "(unset)") {
		throw new Error(
			"No active GCP project. Run gcloud init first, or set PROJECT_ID in ops/deploy.env.",
		);
	}

	const repositoryResource = (process.env.REPOSITORY || "").trim();
	const useV2Repository = repositoryResource !== "";
	const repoOwner = useV2Repository ? "" : cfg.REPO_OWNER;
	const repoName = useV2Repository ? "" : cfg.REPO_NAME;
	const rawBranch = cfg.BRANCH;

	if (!useV2Repository && !repoOwner) {
		throw new Error(
			"GitHub repo owner is required when REPOSITORY is not set. Add REPO_OWNER to ops/deploy.env or pass REPO_OWNER=... as env var.",
		);
	}
	if (!useV2Repository && !repoName) {
		throw new Error("GitHub repo name is required when REPOSITORY is not set.");
	}

	const branchPattern = normalizeBranchPattern(rawBranch);
	const triggerName = process.env.TRIGGER_NAME || `${appName}-deploy-develop`;
	const buildConfig = process.env.BUILD_CONFIG || "ops/cloudbuild.yaml";
	const backendService = `${resourcePrefix}-backend`;
	const backendSaLocalPart = normalizeBackendServiceAccount(
		process.env.BACKEND_SA,
		backendService,
	);
	const backendSa = `${backendSaLocalPart}@${projectId}.iam.gserviceaccount.com`;
	const serviceAccount =
		process.env.TRIGGER_SERVICE_ACCOUNT ||
		`projects/${projectId}/serviceAccounts/${backendSa}`;
	const description =
		process.env.TRIGGER_DESCRIPTION ||
		`Auto-deploy ${appName} on branch updates`;
	const dbSecretName = `${resourcePrefix}-db-password`;
	const jwtSecretName = `${resourcePrefix}-jwt-secret`;
	const vpcName = `${resourcePrefix}-vpc`;
	const subnetName = `${resourcePrefix}-subnet`;
	const seedAdminSecretName = `${resourcePrefix}-seed-admin-pass`;

	const substitutions = buildSubstitutions({
		projectId,
		region,
		arRepo: arRepoName,
		resourcePrefix,
		backendService,
		backendMaxInstances,
		backendSa: backendSaLocalPart,
		dbInstanceName,
		vpcName,
		subnetName,
		dbSecretName,
		jwtSecretName,
		seedAdminSecretName,
		frontendHosting,
	});

	console.log("");
	console.log("==> Trigger configuration summary");
	console.log(`  Project ID    : ${projectId}`);
	console.log(`  Trigger name  : ${triggerName}`);
	console.log(`  Description   : ${description}`);
	console.log(`  Resource pref.: ${resourcePrefix}`);
	console.log(`  Service acct  : ${serviceAccount}`);
	console.log(`  Max instances : ${backendMaxInstances}`);
	console.log(`  Frontend      : ${frontendHosting}`);
	if (useV2Repository) {
		console.log(`  Repository    : ${repositoryResource}`);
		console.log("  Trigger mode  : GitHub 2nd gen");
	} else {
		console.log(`  Repo          : ${repoOwner}/${repoName}`);
		console.log("  Trigger mode  : GitHub 1st gen");
	}
	console.log(`  Branch regex  : ${branchPattern}`);
	console.log(`  Build config  : ${buildConfig}`);
	console.log("");

	if (isInteractive) {
		await prompt("  Press Enter to continue, or Ctrl+C to abort");
		console.log("");
	}

	step(`Setting active project to ${projectId}`);
	run("gcloud", ["config", "set", "project", projectId]);

	step(`Checking whether trigger '${triggerName}' already exists...`);
	const triggersRaw = runCapture(
		"gcloud",
		["builds", "triggers", "list", `--project=${projectId}`, "--format=json"],
		{ allowFailure: true },
	);
	const existingTrigger = parseTriggerList(triggersRaw).find(
		(trigger) => trigger.name === triggerName,
	);

	const sharedArgs = useV2Repository
		? [
				`--project=${projectId}`,
				`--region=${region}`,
				`--repository=${repositoryResource}`,
				"--branch-pattern",
				branchPattern,
				`--build-config=${buildConfig}`,
				`--substitutions=${substitutions}`,
				"--description",
				description,
				`--service-account=${serviceAccount}`,
			]
		: [
				`--project=${projectId}`,
				"--region=global",
				`--repo-name=${repoName}`,
				`--repo-owner=${repoOwner}`,
				"--branch-pattern",
				branchPattern,
				`--build-config=${buildConfig}`,
				`--substitutions=${substitutions}`,
				"--description",
				description,
				`--service-account=${serviceAccount}`,
			];

	if (!useV2Repository) {
		const v2Connections = listConnections(projectId, region);
		if (v2Connections.length === 0) {
			console.log(
				"  (No Cloud Build V2 connections found in this project/region; continuing with 1st-gen GitHub mode)",
			);
		}
	}

	if (existingTrigger) {
		step(`Updating existing trigger '${triggerName}'...`);
		const updateArgs = sharedArgs.map((arg) =>
			typeof arg === "string" && arg.startsWith("--substitutions=")
				? `--update-substitutions=${arg.slice("--substitutions=".length)}`
				: arg,
		);
		const updateResult = run(
			"gcloud",
			[
				"builds",
				"triggers",
				"update",
				"github",
				existingTrigger.id,
				...updateArgs,
			],
			{ allowFailure: true, suppressOutput: true },
		);

		if ((updateResult.status ?? 1) !== 0) {
			throwHelpfulTriggerError({
				mode: useV2Repository ? "v2" : "v1",
				result: updateResult,
				projectId,
				region,
				repoOwner,
				repoName,
				repositoryResource,
			});
		}
	} else {
		step(`Creating trigger '${triggerName}'...`);
		const createResult = run(
			"gcloud",
			[
				"builds",
				"triggers",
				"create",
				"github",
				`--name=${triggerName}`,
				...sharedArgs,
			],
			{ allowFailure: true, suppressOutput: true },
		);

		if ((createResult.status ?? 1) !== 0) {
			throwHelpfulTriggerError({
				mode: useV2Repository ? "v2" : "v1",
				result: createResult,
				projectId,
				region,
				repoOwner,
				repoName,
				repositoryResource,
			});
		}
	}

	console.log("");
	console.log("✓ Trigger is configured.");
	console.log(`  Trigger name : ${triggerName}`);
	console.log(`  Branch regex : ${branchPattern}`);

	const choice = await chooseChainNext({
		isInteractive,
		prompt,
		defaultIndex: 2,
		choices: [
			{ label: "Run deploy.js  (deploy now)", script: "ops/scripts/deploy.js" },
			{ label: "Exit (default)", script: null },
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
