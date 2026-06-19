#!/usr/bin/env node
// deploy.js - Manual deployment script for project-management-app to GCP.
// Mirrors the Cloud Build pipeline steps for local or hotfix deployments.
//
// Prerequisites:
//   - setup-gcp.js and setup-secrets.js completed
//   - gcloud init (sets authenticated account + default project)
//   - Docker running
//   - Run from the app root directory
//
// Usage:
//   node ops/scripts/deploy.js
//
//   Override project or region if needed:
//   PROJECT_ID=my-project REGION=europe-west1 node ops/scripts/deploy.js
//
//   Override resource naming if production resources use a shorter slug:
//   RESOURCE_PREFIX=project-mgmt node ops/scripts/deploy.js

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
	getProjectIdFromGcloud,
	prompt,
	run,
	runCapture,
	step,
	buildCommand,
	ensureDockerRunning,
	createOrUpdateSecret,
} = require("./_utils");
const {
	normalizeFrontendHosting,
	isProdFrontendHosting,
	getFrontendResources,
	getFrontendUrl,
} = require("./_frontendHosting");
const {
	loadOrCollectConfig,
	updateEnvFile,
	loadEnvFile,
	filterRuntimeEnvForDeploy,
	formatEnvVarsFlag,
	chooseChainNext,
	runChildScript,
	secretNameFromEnvKey,
} = require("./_deployEnv");

const DEPLOY_ENV_PATH = path.resolve(__dirname, "..", "deploy.env");
const DEPLOY_ENV_HEADER = [
	"# Deploy-script configuration — written by ops/scripts/ after first run.",
	"# Committed to git (non-secret identifiers only). Secrets are never written here.",
].join("\n");
const BACKEND_ENV_PATH = path.resolve(__dirname, "..", "..", "backend", ".env");

function getFallbackTag() {
	return `manual-${new Date()
		.toISOString()
		.replace(/[-:]/g, "")
		.replace(/\.\d{3}Z$/, "z")
		.toLowerCase()}`;
}

// Walk up from appDir looking for the framework monorepo's CLI entrypoint.
// This avoids `git rev-parse --show-toplevel`, which returns the app's own
// .git directory when the app has been initialized as its own repo — causing
// isMonorepo to be false and skipping the local framework/CLI build.
function findMonorepoRoot(start) {
	let current = path.dirname(start);
	while (current !== path.dirname(current)) {
		if (fs.existsSync(path.join(current, "cli", "bin", "run.js"))) {
			return current;
		}
		current = path.dirname(current);
	}
	return null;
}

function getWorkspaceBuildScript(appDir) {
	const packageJsonPath = path.join(appDir, "package.json");
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
	const scripts = packageJson.scripts || {};

	if (scripts["build:all"]) {
		return "build:all";
	}
	if (scripts.build) {
		return "build";
	}

	throw new Error(
		'No workspace build script found. Add "build" or "build:all" to package.json scripts.',
	);
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

function buildSetSecretsFlag({
	dbSecretName,
	jwtSecretName,
	appName,
	appEnvSecrets,
}) {
	return [
		`DB_PASSWORD=${dbSecretName}:latest`,
		`JWT_SECRET=${jwtSecretName}:latest`,
		...Object.keys(appEnvSecrets).map(
			(key) => `${key}=${secretNameFromEnvKey(appName, key)}:latest`,
		),
	].join(",");
}

async function main() {
	const isInteractive = process.stdin.isTTY;

	if (isInteractive) {
		console.log("");
		console.log("==> Deployment — project-management-app");
		console.log("");
	}

	const fallbackProjectId = process.env.PROJECT_ID || getProjectIdFromGcloud();
	const fallbackFilesBucket =
		process.env.GCS_BUCKET || "project-mgmt-app-files";

	const { values: cfg, toPersist } = await loadOrCollectConfig({
		deployEnvPath: DEPLOY_ENV_PATH,
		isInteractive,
		prompt,
		specs: [
			{
				name: "APP_NAME",
				prompt: "  App name",
				default: "project-mgmt",
				required: true,
			},
			{
				name: "RESOURCE_PREFIX",
				prompt: "  Resource prefix",
				default: "project-mgmt",
				required: true,
			},
			{
				name: "PROJECT_ID",
				prompt: "  GCP Project ID",
				default: fallbackProjectId,
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
				name: "DB_NAME",
				prompt: "  Database name",
				default: "project_management_app",
				required: true,
			},
			{
				name: "BACKEND_MAX_INSTANCES",
				prompt: "  Backend max instances",
				default: "1",
				required: true,
			},
			{
				name: "BACKEND_ALWAYS_ON",
				prompt:
					"  Always-on backend — no CPU throttling, min 1 instance [true/false]",
				default: "false",
				required: true,
			},
			{
				name: "FRONTEND_HOSTING",
				prompt: "  Frontend hosting (simple|prod)",
				default: "simple",
				required: true,
			},
			{
				name: "STORAGE_TYPE",
				prompt: "  File storage type",
				default: "gcs",
				required: true,
			},
			{
				name: "GCS_BUCKET",
				prompt: "  File storage GCS bucket",
				default: fallbackFilesBucket,
				required: true,
			},
			{
				name: "SEED_USER_EMAIL",
				prompt: "  Seed admin email",
				default: "sys@app.com",
				required: true,
			},
			{
				name: "DB_PRIVATE_IP",
				prompt: "  Cloud SQL private IP",
				required: true,
			},
			{
				name: "VPC_NAME",
				prompt: "  VPC network name",
				default: `${process.env.RESOURCE_PREFIX || "project-mgmt"}-vpc`,
				required: true,
			},
			{
				name: "SUBNET_NAME",
				prompt: "  Subnet name",
				default: `${process.env.RESOURCE_PREFIX || "project-mgmt"}-subnet`,
				required: true,
			},
		],
	});

	const appName = cfg.APP_NAME;
	const resourcePrefix = cfg.RESOURCE_PREFIX;
	const projectId = cfg.PROJECT_ID;
	const region = cfg.REGION;
	const arRepo = cfg.AR_REPO;
	const dbInstanceName = cfg.DB_INSTANCE_NAME;
	const dbName = cfg.DB_NAME;
	const backendMaxInstances = cfg.BACKEND_MAX_INSTANCES;
	const backendAlwaysOn = cfg.BACKEND_ALWAYS_ON === "true";
	const frontendHosting = normalizeFrontendHosting(cfg.FRONTEND_HOSTING);
	const storageType = cfg.STORAGE_TYPE;
	const filesBucket = cfg.GCS_BUCKET;
	const seedUserEmail = cfg.SEED_USER_EMAIL;
	const dbPrivateIp = cfg.DB_PRIVATE_IP;
	const vpcName = cfg.VPC_NAME;
	const subnetName = cfg.SUBNET_NAME;

	let seedUserPass = process.env.SEED_USER_PASS || "";
	let seedPassAutoGenerated = false;
	if (!seedUserPass) {
		if (isInteractive) {
			console.log("");
			console.log(
				"  Seed admin password — used for the first login. Press Enter to auto-generate.",
			);
		}
		const typedPass = await prompt("  Seed admin password", {
			hidden: true,
			displayDefault: "auto-generate",
		});
		if (!typedPass) {
			const confirm = await prompt(
				"  Auto-generate a random password? Press Enter to confirm, or type a password now",
				{ hidden: true, displayDefault: "confirm" },
			);
			seedUserPass = confirm || crypto.randomBytes(16).toString("hex");
			seedPassAutoGenerated = !confirm;
		} else {
			seedUserPass = typedPass;
		}
	}

	if (!projectId || projectId === "(unset)") {
		throw new Error(
			"No active GCP project. Run gcloud init first, or pass PROJECT_ID as an env var.",
		);
	}

	// ── 2. Resolve paths and tag ──────────────────────────────────────────────────
	const appDir = path.resolve(__dirname, "..", "..");
	const monorepoRoot = findMonorepoRoot(appDir);
	const isMonorepo = monorepoRoot !== null;
	const repoRoot = monorepoRoot || appDir;
	if (!isMonorepo) {
		console.log("    (no framework monorepo detected - using standalone mode)");
	}

	let tag = process.argv[2];
	if (!tag) {
		try {
			tag = runCapture("git", ["rev-parse", "--short", "HEAD"], {
				cwd: appDir,
			});
		} catch (_error) {
			tag = getFallbackTag();
		}
	}

	// ── 3. Derive resource names ──────────────────────────────────────────────────
	const backendService = `${resourcePrefix}-backend`;
	const backendSa = `${backendService}@${projectId}.iam.gserviceaccount.com`;
	const dbSecretName = `${resourcePrefix}-db-password`;
	const jwtSecretName = `${resourcePrefix}-jwt-secret`;
	const jobName = `${resourcePrefix}-migrate`;
	const seedAdminSecretName = `${resourcePrefix}-seed-admin-pass`;
	const imageBase = `${region}-docker.pkg.dev/${projectId}/${arRepo}/${backendService}`;
	const frontendResources = getFrontendResources({ projectId, resourcePrefix });
	// Runtime connects to Cloud SQL over its private IP via Direct VPC egress
	// (no Cloud SQL Auth Proxy / public IP). `private-ranges-only` keeps internet
	// egress on the default path, so no Cloud NAT is required.
	const vpcEgressArgs = [
		`--network=${vpcName}`,
		`--subnet=${subnetName}`,
		"--vpc-egress=private-ranges-only",
	];

	// ── 4. Summary + confirmation ─────────────────────────────────────────────────
	const pad = (s) => s.padEnd(30);
	console.log("");
	console.log("==> Deployment summary");
	console.log("");
	console.log("    Inputs:");
	console.log(`      ${pad("App name")}${appName}`);
	console.log(`      ${pad("Resource prefix")}${resourcePrefix}`);
	console.log(`      ${pad("GCP Project ID")}${projectId}`);
	console.log(`      ${pad("Region")}${region}`);
	console.log(`      ${pad("Artifact Registry repo")}${arRepo}`);
	console.log(`      ${pad("Cloud SQL instance")}${dbInstanceName}`);
	console.log(`      ${pad("Database name")}${dbName}`);
	console.log(`      ${pad("Frontend hosting")}${frontendHosting}`);
	console.log(`      ${pad("File storage type")}${storageType}`);
	console.log(`      ${pad("File storage bucket")}gs://${filesBucket}`);
	console.log(`      ${pad("Backend max instances")}${backendMaxInstances}`);
	console.log(
		`      ${pad("Backend always-on")}${backendAlwaysOn ? "yes (no CPU throttling, min 1 instance)" : "no (scale to zero)"}`,
	);
	console.log(`      ${pad("Image tag")}${tag}`);
	console.log(`      ${pad("Seed admin email")}${seedUserEmail}`);
	console.log(
		`      ${pad("Seed admin password")}${seedPassAutoGenerated ? "(auto-generated)" : "(provided, hidden)"}`,
	);
	console.log("");
	console.log("    GCP resources that will be updated:");
	console.log(`      ${pad("Cloud Run service")}${backendService}`);
	console.log(`      ${pad("Migration job")}${jobName}`);
	if (isProdFrontendHosting(frontendHosting)) {
		console.log(
			`      ${pad("Frontend GCS bucket")}gs://${frontendResources.frontendBucket}`,
		);
		console.log(`      ${pad("URL map")}${frontendResources.urlMapName}`);
	} else {
		console.log(
			`      ${pad("Frontend")}baked into backend container (simple mode)`,
		);
	}
	console.log(`      ${pad("Files GCS bucket")}gs://${filesBucket}`);
	console.log(`      ${pad("Docker image")}${imageBase}:${tag}`);
	console.log("");

	if (isInteractive) {
		await prompt("  Press Enter to start deployment, or Ctrl+C to abort");
		console.log("");
	}

	updateEnvFile(DEPLOY_ENV_PATH, toPersist, { header: DEPLOY_ENV_HEADER });
	console.log(
		`  (Saved configuration to ${path.relative(process.cwd(), DEPLOY_ENV_PATH)})`,
	);
	console.log("");

	// ── 5. Build & deploy ─────────────────────────────────────────────────────────
	step("Ensuring Docker is running...");
	await ensureDockerRunning();

	step("Generating metadata (views, GraphQL types)...");
	runDrumr(appDir, repoRoot, ["sync-metadata"]);

	step("Building app (backend + frontend)...");
	const buildScript = getWorkspaceBuildScript(appDir);
	run("npm", ["run", buildScript], { cwd: appDir });

	step("Building backend image...");
	const npmToken = runCapture("gcloud", ["auth", "print-access-token"]);
	run("docker", ["pull", `${imageBase}:latest`], {
		allowFailure: true,
		suppressOutput: true,
	});
	run(
		"docker",
		[
			"build",
			"--platform=linux/amd64",
			`--cache-from=${imageBase}:latest`,
			"--secret",
			"id=npm_token,env=NPM_TOKEN",
			"-f",
			"backend/Dockerfile",
			"-t",
			`${imageBase}:${tag}`,
			"-t",
			`${imageBase}:latest`,
			".",
		],
		{
			cwd: appDir,
			env: { ...process.env, NPM_TOKEN: npmToken, DOCKER_BUILDKIT: "1" },
		},
	);

	step("Pushing backend image...");
	run("docker", ["push", `${imageBase}:${tag}`]);
	run("docker", ["push", `${imageBase}:latest`]);

	step("Running schema sync job...");
	const runtimeEnv = loadEnvFile(BACKEND_ENV_PATH);
	const { forwarded: appEnvSecrets, dropped: droppedEnv } =
		filterRuntimeEnvForDeploy(runtimeEnv);

	step("Syncing app secrets from backend/.env to Secret Manager...");
	if (Object.keys(runtimeEnv).length === 0) {
		console.log(
			"    (no backend/.env found — only infra secrets will be set on Cloud Run)",
		);
	} else {
		for (const [key] of Object.entries(droppedEnv)) {
			console.log(
				`    Skipping ${key} (managed by deploy script / setup-secrets.js).`,
			);
		}
		// Keep this serial for predictable logs and fail-fast behavior during deploys.
		for (const [key, value] of Object.entries(appEnvSecrets)) {
			const secretName = secretNameFromEnvKey(appName, key);
			console.log(`    Syncing ${key} -> ${secretName}`);
			createOrUpdateSecret(projectId, backendSa, secretName, value);
		}
	}

	// The migrate job also seeds the initial admin user in-region (the framework
	// seeds when NODE_ENV=migration and SEED_ADMIN_* are set). Store the seed
	// password in Secret Manager so it can be injected without a public DB IP.
	step(`Storing seed admin password secret (${seedAdminSecretName})...`);
	createOrUpdateSecret(projectId, backendSa, seedAdminSecretName, seedUserPass);

	const migrateArgs = [
		`--image=${imageBase}:${tag}`,
		`--region=${region}`,
		`--service-account=${backendSa}`,
		...vpcEgressArgs,
		`--set-secrets=DB_PASSWORD=${dbSecretName}:latest,SEED_ADMIN_PASSWORD=${seedAdminSecretName}:latest`,
		`--set-env-vars=STORAGE_TYPE=${storageType},GCS_BUCKET=${filesBucket},DB_HOST=${dbPrivateIp},DB_PORT=5432,DB_USER=postgres,DB_NAME=${dbName},DB_SSL=true,DB_SYNCHRONIZE=true,NODE_ENV=migration,SEED_ADMIN_EMAIL=${seedUserEmail}`,
		"--max-retries=1",
		"--task-timeout=120",
		`--project=${projectId}`,
	];

	const jobExists =
		run(
			"gcloud",
			[
				"run",
				"jobs",
				"describe",
				jobName,
				`--region=${region}`,
				`--project=${projectId}`,
			],
			{ allowFailure: true, suppressOutput: true },
		).status === 0;

	if (jobExists) {
		run("gcloud", ["run", "jobs", "update", jobName, ...migrateArgs]);
	} else {
		run("gcloud", ["run", "jobs", "create", jobName, ...migrateArgs]);
	}

	run("gcloud", [
		"run",
		"jobs",
		"execute",
		jobName,
		`--region=${region}`,
		"--wait",
		`--project=${projectId}`,
	]);

	console.log(
		`  Migration job executed; check the job logs to confirm whether the initial admin user (${seedUserEmail}) was seeded or already existed.`,
	);

	const reservedEnv = {
		DB_HOST: dbPrivateIp,
		DB_PORT: "5432",
		DB_USER: "postgres",
		DB_NAME: dbName,
		DB_SSL: "true",
		DB_SYNCHRONIZE: "true",
		NODE_ENV: "production",
		HOST: "0.0.0.0",
		STORAGE_TYPE: "gcs",
		GCS_BUCKET: filesBucket,
		// Disable built-in SPA serving when prod mode hosts the frontend separately.
		...(isProdFrontendHosting(frontendHosting) && { DRUMR_SKIP_UI: "true" }),
	};

	step("Deploying backend Cloud Run service...");
	// BACKEND_ALWAYS_ON=true: keeps CPU allocated and a warm instance running.
	// Needed when the app has background workers (DBOS workflows, schedulers,
	// queue/notification listeners) that fire between requests — without it the
	// pg pool and timers are starved while CPU-throttled, causing
	// "Connection terminated due to connection timeout" errors.
	// Default (false): scale to zero, cheapest option for simple/test apps.
	const cpuScalingFlags = backendAlwaysOn
		? ["--no-cpu-throttling", "--min-instances=1"]
		: ["--min-instances=0"];
	run("gcloud", [
		"run",
		"deploy",
		backendService,
		`--image=${imageBase}:${tag}`,
		`--region=${region}`,
		"--platform=managed",
		`--service-account=${backendSa}`,
		...vpcEgressArgs,
		`--set-secrets=${buildSetSecretsFlag({ dbSecretName, jwtSecretName, appName, appEnvSecrets })}`,
		`--set-env-vars=${formatEnvVarsFlag(reservedEnv)}`,
		`--max-instances=${backendMaxInstances}`,
		...cpuScalingFlags,
		"--allow-unauthenticated",
		`--project=${projectId}`,
	]);

	if (isProdFrontendHosting(frontendHosting)) {
		step(
			`Deploying frontend to GCS bucket gs://${frontendResources.frontendBucket}...`,
		);
		run("node", ["ops/scripts/deploy-frontend-prod.js"], {
			cwd: appDir,
			env: {
				...process.env,
				PROJECT_ID: projectId,
				RESOURCE_PREFIX: resourcePrefix,
				FRONTEND_GCP_BUCKET: frontendResources.frontendBucket,
				URL_MAP_NAME: frontendResources.urlMapName,
			},
		});
	} else {
		step(
			"Skipping separate frontend deploy (simple mode — frontend is baked into the container)...",
		);
	}

	console.log("");
	console.log("✓ Deployment complete.");
	const backendUrl = runCapture("gcloud", [
		"run",
		"services",
		"describe",
		backendService,
		`--region=${region}`,
		`--project=${projectId}`,
		"--format=value(status.url)",
	]);
	let frontendIp = "";
	if (isProdFrontendHosting(frontendHosting)) {
		try {
			frontendIp = runCapture("gcloud", [
				"compute",
				"forwarding-rules",
				"describe",
				frontendResources.forwardingRuleName,
				"--global",
				"--format=value(IPAddress)",
				`--project=${projectId}`,
			]);
		} catch (_error) {
			frontendIp = "";
		}
	}
	console.log(`  Backend  : ${backendUrl}`);
	console.log(
		`  Frontend : ${getFrontendUrl({ frontendHosting, frontendIp, backendUrl })}`,
	);
	console.log("");
	console.log("  First login credentials");
	console.log(`    Email    : ${seedUserEmail}`);
	if (seedPassAutoGenerated) {
		console.log(
			`    Password : ${seedUserPass}  ← save this, it will not be shown again`,
		);
	} else {
		console.log("    Password : (as provided)");
	}

	const choice = await chooseChainNext({
		isInteractive,
		prompt,
		defaultIndex: 2,
		choices: [
			{
				label: "Run setup-domain.js  (configure custom domain + HTTPS)",
				script: "ops/scripts/setup-domain.js",
			},
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
