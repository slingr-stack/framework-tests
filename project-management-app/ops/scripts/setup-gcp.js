#!/usr/bin/env node
// setup-gcp.js - One-time GCP infrastructure setup for project-management-app.
// Run this once per GCP project before the first deployment. Idempotent.
//
// Prerequisites:
//   - gcloud init (sets authenticated account + default project)
//   - Billing enabled on the project
//   - Owner or Editor role on the project
//
// Usage:
//   node ops/scripts/setup-gcp.js
//
//   Override project or region if needed:
//   PROJECT_ID=my-project REGION=europe-west1 node ops/scripts/setup-gcp.js

const {
	getProjectIdFromGcloud,
	prompt,
	run,
	runCapture,
	sleep,
	step,
	buildCommand,
} = require("./_utils");

const {
	loadOrCollectConfig,
	updateEnvFile,
	chooseChainNext,
	runChildScript,
} = require("./_deployEnv");
const {
	normalizeFrontendHosting,
	isProdFrontendHosting,
	getFrontendResources,
} = require("./_frontendHosting");
const path = require("node:path");

const DEPLOY_ENV_PATH = path.resolve(__dirname, "..", "deploy.env");
const DEPLOY_ENV_HEADER = [
	"# Deploy-script configuration — written by ops/scripts/ after first run.",
	"# Committed to git (non-secret identifiers only). Secrets are never written here.",
].join("\n");

function runIdempotent(args, message) {
	const result = run("gcloud", args, {
		allowFailure: true,
		suppressOutput: true,
	});
	if ((result.status ?? 1) === 0) {
		return;
	}

	const output = `${result.stdout || ""}\n${result.stderr || ""}`;
	if (
		/already exists|ALREADY_EXISTS|409|Duplicate network endpoint groups/.test(
			output,
		)
	) {
		console.log(`  (${message})`);
		return;
	}

	throw new Error(
		`Command failed: gcloud ${args.join(" ")}\n${(result.stderr || result.stdout || "").trim()}`,
	);
}

// Cloud SQL instance creation can return INTERNAL_ERROR even when GCP accepted
// the request and the instance is being provisioned. This function creates the
// instance (handling both success and transient INTERNAL_ERROR) and then polls
// until the instance reaches RUNNABLE state before returning.
async function createAndWaitForCloudSqlInstance(
	instanceName,
	createArgs,
	projectId,
) {
	const result = run("gcloud", createArgs, {
		allowFailure: true,
		suppressOutput: true,
	});
	const output = `${result.stdout || ""}\n${result.stderr || ""}`;

	if ((result.status ?? 1) !== 0) {
		if (/already exists|ALREADY_EXISTS|409/.test(output)) {
			console.log("  (already exists, skipping)");
		} else if (/INTERNAL_ERROR/.test(output)) {
			console.log(
				"  (Cloud SQL returned INTERNAL_ERROR — verifying instance was accepted...)",
			);
		} else {
			throw new Error(
				`Command failed: gcloud ${createArgs.join(" ")}\n${(result.stderr || result.stdout || "").trim()}`,
			);
		}
	}

	// Poll until RUNNABLE (or confirm the instance exists after INTERNAL_ERROR)
	console.log(
		`  Waiting for Cloud SQL instance '${instanceName}' to be ready...`,
	);
	for (let attempt = 0; attempt < 40; attempt += 1) {
		const describeResult = run(
			"gcloud",
			[
				"sql",
				"instances",
				"describe",
				instanceName,
				`--project=${projectId}`,
				"--format=value(state)",
			],
			{ allowFailure: true, suppressOutput: true },
		);
		const state = (describeResult.stdout || "").trim();

		if (state === "RUNNABLE") {
			console.log("  Instance ready.");
			return;
		}

		if (state && state !== "PENDING_CREATE" && state !== "MAINTENANCE") {
			throw new Error(
				`Cloud SQL instance '${instanceName}' is in unexpected state: ${state}`,
			);
		}

		await sleep(15000);
	}

	throw new Error(
		`Timed out waiting for Cloud SQL instance '${instanceName}' to become RUNNABLE.`,
	);
}

async function ensureServiceAccountExists(serviceAccountEmail, projectId) {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		const result = run(
			"gcloud",
			[
				"iam",
				"service-accounts",
				"describe",
				serviceAccountEmail,
				`--project=${projectId}`,
			],
			{ allowFailure: true, suppressOutput: true },
		);

		if ((result.status ?? 1) === 0) {
			return;
		}

		await new Promise((resolve) => setTimeout(resolve, 1500));
	}

	throw new Error(
		`Service account not found after creation: ${serviceAccountEmail}`,
	);
}

async function main() {
	const isInteractive = process.stdin.isTTY;

	// ── 1. Collect configuration ──────────────────────────────────────────────
	if (isInteractive) {
		console.log("");
		console.log("==> GCP infrastructure setup — project-management-app");
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
				name: "DB_USER",
				prompt: "  Database user",
				default: "postgres",
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
		],
	});

	if (isInteractive) {
		console.log("");
		console.log(
			"  DB password — will be set on the Cloud SQL user and stored in Secret Manager.",
		);
	}
	const dbPassword =
		process.env.DB_PASSWORD ||
		(await prompt("  DB password", { hidden: true }));
	if (!dbPassword) throw new Error("DB password cannot be empty.");

	const appName = cfg.APP_NAME;
	const resourcePrefix = cfg.RESOURCE_PREFIX;
	const projectId = cfg.PROJECT_ID;
	const region = cfg.REGION;
	const arRepoName = cfg.AR_REPO;
	const dbInstanceName = cfg.DB_INSTANCE_NAME;
	const dbName = cfg.DB_NAME;
	const dbUser = cfg.DB_USER;
	const frontendHosting = normalizeFrontendHosting(cfg.FRONTEND_HOSTING);
	const storageType = cfg.STORAGE_TYPE;
	const filesBucket = cfg.GCS_BUCKET;

	if (!projectId || projectId === "(unset)") {
		throw new Error(
			"No active GCP project. Run gcloud init first, or set PROJECT_ID.",
		);
	}

	// ── 2. Derive resource names ──────────────────────────────────────────────────
	const backendSaName = `${resourcePrefix}-backend`;
	const backendService = `${resourcePrefix}-backend`;
	const dbSecretName = `${resourcePrefix}-db-password`;
	const jwtSecretName = `${resourcePrefix}-jwt-secret`;
	const cloudsqlInstance = `${projectId}:${region}:${dbInstanceName}`;
	const backendSa = `${backendSaName}@${projectId}.iam.gserviceaccount.com`;
	const frontendResources = getFrontendResources({ projectId, resourcePrefix });

	// Private networking for the private-IP Cloud SQL connection (all apps).
	const vpcName = `${resourcePrefix}-vpc`;
	const subnetName = `${resourcePrefix}-subnet`;
	const psaRangeName = `${resourcePrefix}-psa`;
	const subnetRange = process.env.SUBNET_RANGE || "10.10.0.0/24";
	const vpcSelfLink = `projects/${projectId}/global/networks/${vpcName}`;
	const projectNumber = runCapture("gcloud", [
		"projects",
		"describe",
		projectId,
		"--format=value(projectNumber)",
	]);
	const cloudbuildSa = `${projectNumber}@cloudbuild.gserviceaccount.com`;

	const cloudbuildSaRoles = [
		"roles/run.admin",
		"roles/iam.serviceAccountUser",
		"roles/secretmanager.secretAccessor",
		"roles/artifactregistry.writer",
		"roles/cloudsql.client",
		"roles/storage.objectAdmin",
		"roles/logging.logWriter",
		...(isProdFrontendHosting(frontendHosting)
			? ["roles/compute.loadBalancerAdmin"]
			: []),
	];

	// ── 3. Summary + confirmation ─────────────────────────────────────────────────
	const pad = (s) => s.padEnd(30);
	console.log("");
	console.log("==> Configuration summary");
	console.log("");
	console.log("    Inputs:");
	console.log(`      ${pad("App name")}${appName}`);
	console.log(`      ${pad("Resource prefix")}${resourcePrefix}`);
	console.log(`      ${pad("GCP Project ID")}${projectId}`);
	console.log(`      ${pad("Region")}${region}`);
	console.log(`      ${pad("Artifact Registry repo")}${arRepoName}`);
	console.log(`      ${pad("Cloud SQL instance")}${dbInstanceName}`);
	console.log(`      ${pad("Database name")}${dbName}`);
	console.log(`      ${pad("Database user")}${dbUser}`);
	console.log(`      ${pad("Frontend hosting")}${frontendHosting}`);
	console.log(`      ${pad("File storage type")}${storageType}`);
	console.log(`      ${pad("File storage bucket")}gs://${filesBucket}`);
	console.log(`      ${pad("DB password")}(provided, hidden)`);
	console.log("");
	console.log("    Resources that will be created:");
	console.log(`      ${pad("Backend service account")}${backendSa}`);
	console.log(`      ${pad("Cloud Run service")}${backendService}`);
	if (isProdFrontendHosting(frontendHosting)) {
		console.log(
			`      ${pad("Frontend GCS bucket")}gs://${frontendResources.frontendBucket}`,
		);
		console.log(`      ${pad("URL map")}${frontendResources.urlMapName}`);
	}
	if (storageType === "gcs") {
		console.log(`      ${pad("File storage GCS bucket")}gs://${filesBucket}`);
	}
	console.log(`      ${pad("Cloud SQL connection")}${cloudsqlInstance}`);
	console.log("");
	console.log("    Secret Manager secrets (created by setup-secrets.js):");
	console.log(`      ${pad("DB password secret")}${dbSecretName}`);
	console.log(`      ${pad("JWT secret")}${jwtSecretName}`);
	console.log("");

	if (isInteractive) {
		await prompt("  Press Enter to start setup, or Ctrl+C to abort");
		console.log("");
	}

	// Persist non-secret values to ops/deploy.env for silent reuse on later runs.
	updateEnvFile(DEPLOY_ENV_PATH, toPersist, { header: DEPLOY_ENV_HEADER });
	console.log(
		`  (Saved configuration to ${path.relative(process.cwd(), DEPLOY_ENV_PATH)})`,
	);
	console.log("");

	// ── 4. Execute GCP setup ──────────────────────────────────────────────────────
	step(`Setting active project to ${projectId}`);
	run("gcloud", ["config", "set", "project", projectId]);

	step("Enabling GCP APIs...");
	const enabledApis = [
		"run.googleapis.com",
		"sqladmin.googleapis.com",
		"artifactregistry.googleapis.com",
		"cloudbuild.googleapis.com",
		"secretmanager.googleapis.com",
		"storage.googleapis.com",
		// compute + servicenetworking power the dedicated VPC and Private Service
		// Access that the private-IP Cloud SQL connection needs (every app, both
		// simple and prod hosting).
		"compute.googleapis.com",
		"servicenetworking.googleapis.com",
	];
	run("gcloud", ["services", "enable", ...enabledApis]);

	step("Securing project: Removing default VPC and open firewall rules...");
	run(
		"gcloud",
		[
			"compute",
			"firewall-rules",
			"delete",
			"default-allow-ssh",
			"default-allow-rdp",
			"default-allow-icmp",
			"default-allow-internal",
			"--quiet",
		],
		{ allowFailure: true, suppressOutput: true },
	);
	run("gcloud", ["compute", "networks", "delete", "default", "--quiet"], {
		allowFailure: true,
		suppressOutput: true,
	});

	step("Securing project: Enabling OS Login...");
	run(
		"gcloud",
		[
			"compute",
			"project-info",
			"add-metadata",
			"--metadata=enable-oslogin=TRUE",
			"--quiet",
		],
		{ allowFailure: true },
	);

	step("Securing project: Enforcing Uniform Bucket Level Access...");
	run(
		"gcloud",
		[
			"resource-manager",
			"org-policies",
			"enable-enforce",
			"constraints/storage.uniformBucketLevelAccess",
			`--project=${projectId}`,
		],
		{ allowFailure: true },
	);

	step(`Creating Artifact Registry repository '${arRepoName}'...`);
	runIdempotent(
		[
			"artifacts",
			"repositories",
			"create",
			arRepoName,
			"--repository-format=docker",
			`--location=${region}`,
			"--description=Drumr-app-images",
			"--quiet",
		],
		"already exists",
	);

	run("gcloud", [
		"auth",
		"configure-docker",
		`${region}-docker.pkg.dev`,
		"--quiet",
	]);

	// ── Private networking (private-IP Cloud SQL) ─────────────────────────────────
	step(`Creating VPC network '${vpcName}' for private database connectivity...`);
	runIdempotent(
		["compute", "networks", "create", vpcName, "--subnet-mode=custom", "--quiet"],
		"VPC already exists",
	);
	runIdempotent(
		[
			"compute",
			"networks",
			"subnets",
			"create",
			subnetName,
			`--network=${vpcName}`,
			`--region=${region}`,
			`--range=${subnetRange}`,
			"--quiet",
		],
		"subnet already exists",
	);

	step("Configuring Private Service Access for Cloud SQL...");
	runIdempotent(
		[
			"compute",
			"addresses",
			"create",
			psaRangeName,
			"--global",
			"--purpose=VPC_PEERING",
			"--prefix-length=16",
			`--network=${vpcName}`,
			"--quiet",
		],
		"PSA range already exists",
	);
	// `vpc-peerings connect` errors if the peering already exists; tolerate that.
	const peeringResult = run(
		"gcloud",
		[
			"services",
			"vpc-peerings",
			"connect",
			"--service=servicenetworking.googleapis.com",
			`--ranges=${psaRangeName}`,
			`--network=${vpcName}`,
			`--project=${projectId}`,
		],
		{ allowFailure: true, suppressOutput: true },
	);
	if ((peeringResult.status ?? 1) !== 0) {
		const out = `${peeringResult.stdout || ""}\n${peeringResult.stderr || ""}`;
		if (/already|exists|Cannot modify allocated ranges|range.*in use/i.test(out)) {
			console.log("  (Private Service Access peering already configured)");
		} else {
			throw new Error(
				`Failed to create Private Service Access peering:\n${(peeringResult.stderr || peeringResult.stdout || "").trim()}`,
			);
		}
	}

	step("Granting subnet access for Direct VPC egress...");
	const serverlessRobotSa = `service-${projectNumber}@serverless-robot-prod.iam.gserviceaccount.com`;
	for (const member of [
		`serviceAccount:${backendSa}`,
		`serviceAccount:${cloudbuildSa}`,
		`serviceAccount:${serverlessRobotSa}`,
	]) {
		run(
			"gcloud",
			[
				"compute",
				"networks",
				"subnets",
				"add-iam-policy-binding",
				subnetName,
				`--region=${region}`,
				`--member=${member}`,
				"--role=roles/compute.networkUser",
				`--project=${projectId}`,
				"--quiet",
			],
			{ allowFailure: true, suppressOutput: true },
		);
	}

	step(`Creating Cloud SQL instance '${dbInstanceName}' (private IP only)...`);
	await createAndWaitForCloudSqlInstance(
		dbInstanceName,
		[
			"sql",
			"instances",
			"create",
			dbInstanceName,
			"--database-version=POSTGRES_15",
			"--tier=db-f1-micro",
			`--region=${region}`,
			"--storage-auto-increase",
			"--no-backup",
			"--ssl-mode=ENCRYPTED_ONLY",
			// Private IP only: attach to the VPC and do not assign a public IP.
			// Runtime connects over the private IP via Direct VPC egress.
			`--network=${vpcSelfLink}`,
			"--no-assign-ip",
			"--quiet",
		],
		projectId,
	);

	// Discover the allocated private IP and persist it for deploy.js / cloudbuild.
	const ipJson = runCapture("gcloud", [
		"sql",
		"instances",
		"describe",
		dbInstanceName,
		`--project=${projectId}`,
		"--format=json(ipAddresses)",
	]);
	let dbPrivateIp = "";
	try {
		const ips = JSON.parse(ipJson).ipAddresses || [];
		dbPrivateIp = (ips.find((ip) => ip.type === "PRIVATE") || {}).ipAddress || "";
	} catch (_error) {
		dbPrivateIp = "";
	}
	if (!dbPrivateIp) {
		throw new Error(
			`Could not determine the private IP for Cloud SQL instance '${dbInstanceName}'.`,
		);
	}
	updateEnvFile(
		DEPLOY_ENV_PATH,
		{ DB_PRIVATE_IP: dbPrivateIp, VPC_NAME: vpcName, SUBNET_NAME: subnetName },
		{ header: DEPLOY_ENV_HEADER },
	);
	console.log(`  Cloud SQL private IP: ${dbPrivateIp} (saved as DB_PRIVATE_IP)`);

	step(`Creating database '${dbName}'...`);
	runIdempotent(
		[
			"sql",
			"databases",
			"create",
			dbName,
			`--instance=${dbInstanceName}`,
			"--quiet",
		],
		"already exists",
	);

	step(`Setting password for Cloud SQL user '${dbUser}'...`);
	run("gcloud", [
		"sql",
		"users",
		"set-password",
		dbUser,
		`--instance=${dbInstanceName}`,
		`--password=${dbPassword}`,
		`--project=${projectId}`,
	]);

	step(`Creating service account '${backendSaName}'...`);
	runIdempotent(
		[
			"iam",
			"service-accounts",
			"create",
			backendSaName,
			`--display-name=${appName}-Backend-Cloud-Run-SA`,
			"--quiet",
		],
		"already exists",
	);

	await ensureServiceAccountExists(backendSa, projectId);

	step("Granting roles to backend service account...");
	for (const role of [
		"roles/cloudsql.client",
		"roles/secretmanager.secretAccessor",
		"roles/logging.logWriter",
		"roles/artifactregistry.writer",
		"roles/run.admin",
		"roles/iam.serviceAccountUser",
		"roles/storage.admin",
		"roles/storage.objectAdmin",
	]) {
		run("gcloud", [
			"projects",
			"add-iam-policy-binding",
			projectId,
			`--member=serviceAccount:${backendSa}`,
			`--role=${role}`,
			"--quiet",
		]);
	}

	step("Granting Cloud Build service account permissions...");
	for (const role of cloudbuildSaRoles) {
		run("gcloud", [
			"projects",
			"add-iam-policy-binding",
			projectId,
			`--member=serviceAccount:${cloudbuildSa}`,
			`--role=${role}`,
			"--quiet",
		]);
	}

	run("gcloud", [
		"iam",
		"service-accounts",
		"add-iam-policy-binding",
		backendSa,
		`--member=serviceAccount:${cloudbuildSa}`,
		"--role=roles/iam.serviceAccountUser",
		"--quiet",
	]);

	if (storageType === "gcs") {
		step(`Creating file storage bucket 'gs://${filesBucket}'...`);
		runIdempotent(
			[
				"storage",
				"buckets",
				"create",
				`gs://${filesBucket}`,
				`--location=${region}`,
				"--uniform-bucket-level-access",
				"--quiet",
			],
			"already exists",
		);
		// Grant backend SA full access to the files bucket (upload, download, delete)
		run("gcloud", [
			"storage",
			"buckets",
			"add-iam-policy-binding",
			`gs://${filesBucket}`,
			`--member=serviceAccount:${backendSa}`,
			"--role=roles/storage.objectAdmin",
			"--quiet",
		]);

		console.log(`  Files bucket created: gs://${filesBucket}`);
		console.log(
			`  Backend SA '${backendSa}' granted roles/storage.objectAdmin on files bucket.`,
		);
	}

	if (isProdFrontendHosting(frontendHosting)) {
		step(
			`Creating frontend bucket 'gs://${frontendResources.frontendBucket}'...`,
		);
		runIdempotent(
			[
				"storage",
				"buckets",
				"create",
				`gs://${frontendResources.frontendBucket}`,
				`--location=${region}`,
				"--uniform-bucket-level-access",
				"--quiet",
			],
			"already exists",
		);

		run("gcloud", [
			"storage",
			"buckets",
			"add-iam-policy-binding",
			`gs://${frontendResources.frontendBucket}`,
			"--member=allUsers",
			"--role=roles/storage.objectViewer",
			"--quiet",
		]);

		run("gcloud", [
			"storage",
			"buckets",
			"update",
			`gs://${frontendResources.frontendBucket}`,
			"--web-main-page-suffix=index.html",
			"--web-error-page=index.html",
		]);

		step("Creating load balancer resources for prod frontend hosting...");
		runIdempotent(
			[
				"compute",
				"network-endpoint-groups",
				"create",
				frontendResources.negName,
				`--region=${region}`,
				"--network-endpoint-type=serverless",
				`--cloud-run-service=${backendService}`,
				"--quiet",
			],
			"NEG already exists",
		);

		runIdempotent(
			[
				"compute",
				"backend-services",
				"create",
				frontendResources.backendServiceRes,
				"--load-balancing-scheme=EXTERNAL_MANAGED",
				"--global",
				"--quiet",
			],
			"backend service already exists",
		);

		runIdempotent(
			[
				"compute",
				"backend-services",
				"add-backend",
				frontendResources.backendServiceRes,
				`--network-endpoint-group=${frontendResources.negName}`,
				`--network-endpoint-group-region=${region}`,
				"--global",
				"--quiet",
			],
			"backend already added",
		);

		runIdempotent(
			[
				"compute",
				"backend-buckets",
				"create",
				frontendResources.backendBucketRes,
				`--gcs-bucket-name=${frontendResources.frontendBucket}`,
				"--enable-cdn",
				"--quiet",
			],
			"backend bucket already exists",
		);

		runIdempotent(
			[
				"compute",
				"url-maps",
				"create",
				frontendResources.urlMapName,
				`--default-backend-bucket=${frontendResources.backendBucketRes}`,
				"--quiet",
			],
			"URL map already exists",
		);

		runIdempotent(
			[
				"compute",
				"url-maps",
				"add-path-matcher",
				frontendResources.urlMapName,
				"--path-matcher-name=api-matcher",
				`--default-backend-bucket=${frontendResources.backendBucketRes}`,
				"--backend-service-path-rules",
				`/graphql=${frontendResources.backendServiceRes}`,
				"--backend-service-path-rules",
				`/auth/*=${frontendResources.backendServiceRes}`,
				"--backend-service-path-rules",
				`/files=${frontendResources.backendServiceRes}`,
				"--backend-service-path-rules",
				`/files/*=${frontendResources.backendServiceRes}`,
				"--backend-service-path-rules",
				`/data/*=${frontendResources.backendServiceRes}`,
				"--new-hosts",
				"*",
				"--quiet",
			],
			"path matcher already exists",
		);

		runIdempotent(
			[
				"compute",
				"target-http-proxies",
				"create",
				frontendResources.httpProxyName,
				`--url-map=${frontendResources.urlMapName}`,
				"--quiet",
			],
			"HTTP proxy already exists",
		);

		runIdempotent(
			[
				"compute",
				"forwarding-rules",
				"create",
				frontendResources.forwardingRuleName,
				"--load-balancing-scheme=EXTERNAL_MANAGED",
				"--global",
				`--target-http-proxy=${frontendResources.httpProxyName}`,
				"--ports=80",
				"--quiet",
			],
			"forwarding rule already exists",
		);
	}

	console.log("");
	console.log("✓ GCP setup complete.");
	console.log("");
	console.log(`  Frontend hosting : ${frontendHosting}`);
	if (isProdFrontendHosting(frontendHosting)) {
		const lbIp =
			runCapture(
				"gcloud",
				[
					"compute",
					"forwarding-rules",
					"describe",
					frontendResources.forwardingRuleName,
					"--global",
					"--format=value(IPAddress)",
					`--project=${projectId}`,
				],
				{ allowFailure: true },
			) || "<pending>";
		console.log(`  Frontend bucket : gs://${frontendResources.frontendBucket}`);
		console.log(`  URL map         : ${frontendResources.urlMapName}`);
		console.log(`  LB IP           : ${lbIp}`);
	} else {
		console.log(
			"  Frontend served : from the backend Cloud Run container (simple mode)",
		);
	}
	console.log("");
	console.log("  ⚠  Manual step required:");
	console.log(
		"  The Cloud Build SA needs read access to the Drumr npm registry to install",
	);
	console.log("  @drumr/* packages. Ask your Drumr admin to run:");
	console.log("");
	console.log(
		`    gcloud projects add-iam-policy-binding future-name-492914-n5 \\`,
	);
	console.log(`      --member=serviceAccount:${cloudbuildSa} \\`);
	console.log("      --role=roles/artifactregistry.reader");
	console.log("");
	console.log(
		"  Without this, Cloud Build will fail to install @drumr/* packages.",
	);
	console.log("");
	console.log(
		"  Next: run setup-secrets.js, then deploy.js for the first deployment.",
	);
	if (isProdFrontendHosting(frontendHosting)) {
		console.log(
			"  After the first deploy, run setup-domain.js to add a custom domain.",
		);
	}
	console.log("");

	const choice = await chooseChainNext({
		isInteractive,
		prompt,
		defaultIndex: 1,
		choices: [
			{
				label: "Run setup-secrets.js  (required before first deploy)",
				script: "ops/scripts/setup-secrets.js",
				env: { DB_PASSWORD: dbPassword },
			},
			{
				label: "Run setup-trigger.js  (optional — automated GitHub deploys)",
				script: "ops/scripts/setup-trigger.js",
			},
			{ label: "Exit", script: null },
		],
	});

	if (choice?.script) {
		console.log("");
		await runChildScript({
			scriptPath: choice.script,
			env: choice.env || {},
			buildCommand,
		});
	} else {
		console.log("  Next: run `node ops/scripts/setup-secrets.js` when ready.");
	}
}

main().catch((error) => {
	console.error(`ERROR: ${error.message}`);
	process.exit(1);
});
