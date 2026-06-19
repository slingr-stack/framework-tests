#!/usr/bin/env node
// teardown-gcp.js - Deletes all GCP resources created by setup-gcp.js,
// setup-secrets.js, and deploy.js for project-management-app.
//
// ⚠  DESTRUCTIVE — this deletes data and cannot be undone.
//
// Usage:
//   node ops/scripts/teardown-gcp.js
//
//   Override project or region if needed:
//   PROJECT_ID=my-project REGION=europe-west1 node ops/scripts/teardown-gcp.js

const { getProjectIdFromGcloud, prompt, run, step } = require("./_utils");
const {
	normalizeFrontendHosting,
	isSimpleFrontendHosting,
	isProdFrontendHosting,
	getFrontendResources,
} = require("./_frontendHosting");

function deleteIfExists(args, label) {
	const result = run("gcloud", [...args, "--quiet"], {
		allowFailure: true,
		suppressOutput: true,
	});
	if ((result.status ?? 1) === 0) {
		return;
	}

	const output = `${result.stdout || ""}\n${result.stderr || ""}`;
	if (/not found|NOT_FOUND|404|does not exist/i.test(output)) {
		console.log(`  (${label} not found, skipping)`);
		return;
	}

	// Print the error but keep going — partial teardowns are recoverable
	console.warn(
		`  WARNING: failed to delete ${label}: ${(result.stderr || result.stdout || "").trim()}`,
	);
}

async function main() {
	const isInteractive = process.stdin.isTTY;

	if (isInteractive) {
		console.log("");
		console.log("==> Teardown — project-management-app");
		console.log(
			"    ⚠  This will permanently delete all GCP resources for this app.",
		);
		console.log("    Press Enter to accept the default shown in [brackets].");
		console.log("    All values can also be set via environment variables.");
		console.log("");
	}

	const gcpProjectId = process.env.PROJECT_ID || getProjectIdFromGcloud();

	const appName = await prompt(
		"  App name (prefix used for all GCP resource names)",
		{ default: process.env.APP_NAME || "project-management-app" },
	);
	const resourcePrefix = await prompt("  Resource prefix", {
		default: process.env.RESOURCE_PREFIX || appName,
	});
	const projectId = await prompt("  GCP Project ID", { default: gcpProjectId });
	const region = await prompt("  Region", {
		default: process.env.REGION || "us-central1",
	});
	const arRepo = await prompt("  Artifact Registry repository", {
		default: process.env.AR_REPO || "drumr-apps",
	});
	const dbInstanceName = await prompt("  Cloud SQL instance name", {
		default: process.env.DB_INSTANCE_NAME || `${appName}-db`,
	});
	const frontendHosting = normalizeFrontendHosting(
		await prompt("  Frontend hosting (simple|prod)", {
			default: process.env.FRONTEND_HOSTING || "simple",
		}),
	);
	const domain = (
		process.env.DOMAIN ||
		(await prompt("  Custom domain (leave blank if none)", { default: "" }))
	).trim();

	if (!projectId || projectId === "(unset)") {
		throw new Error(
			"No active GCP project. Run gcloud init first, or pass PROJECT_ID as an env var.",
		);
	}

	// ── Derive the same resource names used by setup-gcp.js and deploy.js ────────
	const backendSaName = `${resourcePrefix}-backend`;
	const backendSa = `${backendSaName}@${projectId}.iam.gserviceaccount.com`;
	const backendService = `${resourcePrefix}-backend`;
	const jobName = `${resourcePrefix}-migrate`;
	const dbSecretName = `${resourcePrefix}-db-password`;
	const jwtSecretName = `${resourcePrefix}-jwt-secret`;
	const imageBase = `${region}-docker.pkg.dev/${projectId}/${arRepo}/${backendService}`;
	const frontendResources = getFrontendResources({ projectId, resourcePrefix });

	// ── Summary ───────────────────────────────────────────────────────────────────
	const pad = (s) => s.padEnd(36);
	console.log("");
	console.log("==> Resources that will be DELETED:");
	console.log("");
	console.log("    Cloud Run:");
	console.log(`      ${pad("Service")}${backendService}  (${region})`);
	console.log(`      ${pad("Job")}${jobName}  (${region})`);
	if (domain && isSimpleFrontendHosting(frontendHosting)) {
		console.log(`      ${pad("Domain mapping")}${domain}`);
	}
	console.log("");
	console.log("    Storage:");
	if (isProdFrontendHosting(frontendHosting)) {
		console.log(
			`      ${pad("Frontend GCS bucket")}gs://${frontendResources.frontendBucket}`,
		);
		console.log(`      ${pad("URL map")}${frontendResources.urlMapName}`);
	}
	console.log("");
	console.log("    Artifact Registry:");
	console.log(`      ${pad("Docker image (all tags)")}${imageBase}`);
	console.log(
		`      NOTE: the '${arRepo}' repository itself is shared and will NOT be deleted.`,
	);
	console.log("");
	console.log("    Cloud SQL:");
	console.log(`      ${pad("Instance (all data)")}${dbInstanceName}`);
	console.log("");
	console.log("    Secrets:");
	console.log(`      ${pad("Secret")}${dbSecretName}`);
	console.log(`      ${pad("Secret")}${jwtSecretName}`);
	console.log("");
	console.log("    IAM:");
	console.log(`      ${pad("Service account")}${backendSa}`);
	console.log("");

	if (isInteractive) {
		const confirm = await prompt(
			'  Type "yes" to confirm teardown, or Ctrl+C to abort',
		);
		if (!/^yes$/i.test(confirm.trim())) {
			console.log("  Aborted.");
			process.exit(0);
		}
		console.log("");
	}

	// ── 1. Cloud Run service and job ──────────────────────────────────────────────
	step("Deleting Cloud Run service...");
	deleteIfExists(
		[
			"run",
			"services",
			"delete",
			backendService,
			`--region=${region}`,
			`--project=${projectId}`,
		],
		`Cloud Run service ${backendService}`,
	);

	step("Deleting Cloud Run job...");
	deleteIfExists(
		[
			"run",
			"jobs",
			"delete",
			jobName,
			`--region=${region}`,
			`--project=${projectId}`,
		],
		`Cloud Run job ${jobName}`,
	);

	// ── 2. Domain mapping (simple mode only) ──────────────────────────────────────
	if (domain && isSimpleFrontendHosting(frontendHosting)) {
		step(`Deleting Cloud Run domain mapping for '${domain}'...`);
		deleteIfExists(
			[
				"beta",
				"run",
				"domain-mappings",
				"delete",
				`--domain=${domain}`,
				`--region=${region}`,
				`--project=${projectId}`,
			],
			`domain mapping ${domain}`,
		);
	}

	// ── 3. Frontend hosting (prod mode) ──────────────────────────────────────────
	if (isProdFrontendHosting(frontendHosting)) {
		step("Deleting GCP frontend load balancer resources...");
		deleteIfExists(
			[
				"compute",
				"forwarding-rules",
				"delete",
				frontendResources.httpsForwardingRuleName,
				"--global",
				`--project=${projectId}`,
			],
			`HTTPS forwarding rule ${frontendResources.httpsForwardingRuleName}`,
		);
		deleteIfExists(
			[
				"compute",
				"target-https-proxies",
				"delete",
				frontendResources.httpsProxyName,
				`--project=${projectId}`,
			],
			`HTTPS proxy ${frontendResources.httpsProxyName}`,
		);
		deleteIfExists(
			[
				"compute",
				"ssl-certificates",
				"delete",
				frontendResources.sslCertificateName,
				"--global",
				`--project=${projectId}`,
			],
			`SSL certificate ${frontendResources.sslCertificateName}`,
		);
		deleteIfExists(
			[
				"compute",
				"forwarding-rules",
				"delete",
				frontendResources.forwardingRuleName,
				"--global",
				`--project=${projectId}`,
			],
			`HTTP forwarding rule ${frontendResources.forwardingRuleName}`,
		);
		deleteIfExists(
			[
				"compute",
				"target-http-proxies",
				"delete",
				frontendResources.httpProxyName,
				`--project=${projectId}`,
			],
			`HTTP proxy ${frontendResources.httpProxyName}`,
		);
		deleteIfExists(
			[
				"compute",
				"url-maps",
				"delete",
				frontendResources.urlMapName,
				`--project=${projectId}`,
			],
			`URL map ${frontendResources.urlMapName}`,
		);
		deleteIfExists(
			[
				"compute",
				"backend-buckets",
				"delete",
				frontendResources.backendBucketRes,
				`--project=${projectId}`,
			],
			`backend bucket ${frontendResources.backendBucketRes}`,
		);
		deleteIfExists(
			[
				"compute",
				"backend-services",
				"delete",
				frontendResources.backendServiceRes,
				"--global",
				`--project=${projectId}`,
			],
			`backend service ${frontendResources.backendServiceRes}`,
		);
		deleteIfExists(
			[
				"compute",
				"network-endpoint-groups",
				"delete",
				frontendResources.negName,
				`--region=${region}`,
				`--project=${projectId}`,
			],
			`NEG ${frontendResources.negName}`,
		);

		run(
			"gcloud",
			[
				"storage",
				"rm",
				"--recursive",
				`gs://${frontendResources.frontendBucket}/**`,
				"--quiet",
			],
			{ allowFailure: true, suppressOutput: true },
		);
		deleteIfExists(
			[
				"storage",
				"buckets",
				"delete",
				`gs://${frontendResources.frontendBucket}`,
				`--project=${projectId}`,
			],
			`frontend bucket ${frontendResources.frontendBucket}`,
		);
	}

	// ── 4. Artifact Registry — delete images for this backend service ──────────────
	step(
		`Deleting Docker images for '${backendService}' from Artifact Registry...`,
	);
	{
		const listResult = run(
			"gcloud",
			[
				"artifacts",
				"docker",
				"images",
				"list",
				imageBase,
				"--include-tags",
				"--format=value(digest)",
				`--project=${projectId}`,
			],
			{ allowFailure: true, suppressOutput: true },
		);

		const digests = (listResult.stdout || "")
			.split("\n")
			.map((d) => d.trim())
			.filter(Boolean);

		if (digests.length === 0) {
			console.log("  (no images found, skipping)");
		} else {
			for (const digest of digests) {
				deleteIfExists(
					[
						"artifacts",
						"docker",
						"images",
						"delete",
						`${imageBase}@${digest}`,
						"--delete-tags",
						`--project=${projectId}`,
					],
					`image ${digest}`,
				);
			}
		}
	}

	// ── 5. Cloud SQL instance (deletes all databases inside it) ──────────────────
	step(
		`Deleting Cloud SQL instance '${dbInstanceName}' (all data will be lost)...`,
	);
	deleteIfExists(
		["sql", "instances", "delete", dbInstanceName, `--project=${projectId}`],
		`Cloud SQL instance ${dbInstanceName}`,
	);

	// ── 6. Secrets ────────────────────────────────────────────────────────────────
	step("Deleting secrets from Secret Manager...");
	deleteIfExists(
		["secrets", "delete", dbSecretName, `--project=${projectId}`],
		`secret ${dbSecretName}`,
	);
	deleteIfExists(
		["secrets", "delete", jwtSecretName, `--project=${projectId}`],
		`secret ${jwtSecretName}`,
	);

	// ── 7. Service account ────────────────────────────────────────────────────────
	step(`Deleting service account '${backendSa}'...`);
	deleteIfExists(
		["iam", "service-accounts", "delete", backendSa, `--project=${projectId}`],
		`service account ${backendSa}`,
	);

	// ── Done ──────────────────────────────────────────────────────────────────────
	console.log("");
	console.log("✓ Teardown complete.");
	console.log("");
	console.log(
		"  The following shared resources were intentionally left intact:",
	);
	console.log(`    Artifact Registry  : ${arRepo}  (shared across apps)`);
	console.log("    GCP APIs           : (enabled APIs remain enabled)");
	console.log("    Cloud Build SA roles : (project-level bindings remain)");
	console.log("");
	console.log("  To remove the entire GCP project, run:");
	console.log(`    gcloud projects delete ${projectId}`);
	console.log("");
}

main().catch((error) => {
	console.error(`ERROR: ${error.message}`);
	process.exit(1);
});
