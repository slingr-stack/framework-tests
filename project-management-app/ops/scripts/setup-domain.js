#!/usr/bin/env node

const path = require("node:path");
const {
	getProjectIdFromGcloud,
	prompt,
	run,
	runCapture,
	step,
} = require("./_utils");
const { loadOrCollectConfig, updateEnvFile } = require("./_deployEnv");
const {
	normalizeFrontendHosting,
	isSimpleFrontendHosting,
	getFrontendResources,
} = require("./_frontendHosting");

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
	if (/already exists|ALREADY_EXISTS|409/.test(output)) {
		console.log(`  (${message})`);
		return;
	}

	throw new Error(
		`Command failed: gcloud ${args.join(" ")}\n${(result.stderr || result.stdout || "").trim()}`,
	);
}

async function main() {
	const isInteractive = process.stdin.isTTY;
	const fallbackProjectId = process.env.PROJECT_ID || getProjectIdFromGcloud();

	const { values: cfg, toPersist } = await loadOrCollectConfig({
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
				name: "FRONTEND_HOSTING",
				prompt: "  Frontend hosting (simple|prod)",
				default: "simple",
				required: true,
			},
			{
				name: "DOMAIN",
				prompt: "  Custom domain (e.g. app.example.com)",
				required: false,
			},
		],
	});

	const projectId = cfg.PROJECT_ID;
	const resourcePrefix = cfg.RESOURCE_PREFIX;
	const region = cfg.REGION;
	const frontendHosting = normalizeFrontendHosting(cfg.FRONTEND_HOSTING);
	const domain = cfg.DOMAIN;

	updateEnvFile(DEPLOY_ENV_PATH, toPersist, { header: DEPLOY_ENV_HEADER });

	if (isSimpleFrontendHosting(frontendHosting)) {
		const backendService = `${resourcePrefix}-backend`;
		console.log(
			"In monolith mode, the frontend is served by the backend Cloud Run service.",
		);

		const backendUrlRaw = runCapture(
			"gcloud",
			[
				"run",
				"services",
				"describe",
				backendService,
				`--region=${region}`,
				`--project=${projectId}`,
				"--format=value(status.url)",
			],
			{ allowFailure: true },
		);
		const backendUrl = (backendUrlRaw || "").trim();

		if (backendUrl) {
			console.log(`  App URL : ${backendUrl}`);
		} else {
			console.log(
				"  Service not yet deployed. Deploy first, then re-run this script.",
			);
		}

		if (!domain) {
			console.log("");
			console.log("  To map a custom domain, re-run with:");
			console.log(
				"    DOMAIN=your-domain.example.com node ops/scripts/setup-domain.js",
			);
			return;
		}

		// Extract base domain for verification check (e.g. "app.example.com" → "example.com")
		const domainParts = domain.split(".");
		const baseDomain = domainParts.slice(-2).join(".");

		step("Checking domain verification status...");
		const verifiedRaw =
			runCapture("gcloud", ["domains", "list-user-verified"], {
				allowFailure: true,
			}) || "";
		const verifiedDomains = verifiedRaw
			.split("\n")
			.map((l) => l.trim().replace(/\.$/, ""));
		const isVerified = verifiedDomains.some(
			(d) => d === baseDomain || d === domain,
		);

		if (!isVerified) {
			console.log("");
			console.log(`  Domain '${baseDomain}' is not yet verified with Google.`);
			console.log("  Start domain verification:");
			console.log(`    gcloud domains verify ${baseDomain}`);
			console.log("  Then re-run this script once verification is complete.");
			return;
		}

		step(`Creating Cloud Run domain mapping for '${domain}'...`);
		const mappingResult = run(
			"gcloud",
			[
				"beta",
				"run",
				"domain-mappings",
				"create",
				`--service=${backendService}`,
				`--domain=${domain}`,
				`--region=${region}`,
				`--project=${projectId}`,
			],
			{ allowFailure: true, suppressOutput: true },
		);

		const mappingOutput = `${mappingResult.stdout || ""}\n${mappingResult.stderr || ""}`;
		if (
			(mappingResult.status ?? 1) !== 0 &&
			!/already exists|ALREADY_EXISTS/i.test(mappingOutput)
		) {
			throw new Error(
				`Domain mapping failed:\n${(mappingResult.stderr || mappingResult.stdout || "").trim()}`,
			);
		}
		if (/already exists|ALREADY_EXISTS/i.test(mappingOutput)) {
			console.log("  (mapping already exists — fetching current DNS records)");
		}

		step("Fetching DNS records...");
		const describeRaw =
			runCapture(
				"gcloud",
				[
					"beta",
					"run",
					"domain-mappings",
					"describe",
					`--domain=${domain}`,
					`--region=${region}`,
					`--project=${projectId}`,
					"--format=json",
				],
				{ allowFailure: true },
			) || "";

		console.log("");
		console.log("✓ Domain mapping configured.");
		if (backendUrl) {
			console.log(`  Cloud Run URL : ${backendUrl}`);
		}
		console.log(`  Custom domain : https://${domain}`);

		if (describeRaw) {
			try {
				const mapping = JSON.parse(describeRaw);
				const records = mapping.status?.resourceRecords || [];
				if (records.length > 0) {
					console.log("");
					console.log("  Add these DNS records with your registrar:");
					for (const record of records) {
						const name = record.name || "@";
						console.log(
							`    ${String(record.type).padEnd(6)} ${name} → ${record.rrdata}`,
						);
					}
				}
			} catch (_err) {
				// JSON parse failed — describe output may still be in flux
			}
		}

		console.log("");
		console.log(
			"  SSL is provisioned automatically (15 min – 24 h after DNS propagates).",
		);
		console.log("  Check mapping status:");
		console.log(
			`    gcloud beta run domain-mappings describe --domain=${domain} --region=${region} --project=${projectId}`,
		);
		return;
	}

	if (!domain) {
		console.log("No domain provided, skipping.");
		return;
	}

	const {
		forwardingRuleName,
		httpsProxyName,
		httpsForwardingRuleName,
		sslCertificateName,
		urlMapName,
	} = getFrontendResources({ projectId, resourcePrefix });

	const lbIp = runCapture("gcloud", [
		"compute",
		"forwarding-rules",
		"describe",
		forwardingRuleName,
		"--global",
		"--format=value(IPAddress)",
		`--project=${projectId}`,
	]);

	step(`Creating managed SSL certificate for ${domain}...`);
	runIdempotent(
		[
			"compute",
			"ssl-certificates",
			"create",
			sslCertificateName,
			`--domains=${domain}`,
			"--global",
			`--project=${projectId}`,
		],
		"already exists, skipping",
	);

	step("Creating HTTPS target proxy...");
	runIdempotent(
		[
			"compute",
			"target-https-proxies",
			"create",
			httpsProxyName,
			`--url-map=${urlMapName}`,
			`--ssl-certificates=${sslCertificateName}`,
			`--project=${projectId}`,
		],
		"already exists, skipping",
	);

	step("Creating HTTPS forwarding rule...");
	runIdempotent(
		[
			"compute",
			"forwarding-rules",
			"create",
			httpsForwardingRuleName,
			"--load-balancing-scheme=EXTERNAL_MANAGED",
			"--global",
			`--target-https-proxy=${httpsProxyName}`,
			"--ports=443",
			`--address=${lbIp}`,
			`--project=${projectId}`,
		],
		"already exists, skipping",
	);

	console.log("");
	console.log("✓ Domain setup initiated.");
	console.log(`  Point '${domain}' to A record ${lbIp}`);
	console.log(
		`  Check certificate status with: gcloud compute ssl-certificates describe ${sslCertificateName} --global --format=value(managed.status)`,
	);
}

main().catch((error) => {
	console.error(`ERROR: ${error.message}`);
	process.exit(1);
});
