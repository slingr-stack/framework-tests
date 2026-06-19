#!/usr/bin/env node

const path = require("node:path");
const { run } = require("./_utils");

function main() {
	const projectId = process.env.PROJECT_ID;
	const resourcePrefix = process.env.RESOURCE_PREFIX;
	if (!projectId) {
		throw new Error("PROJECT_ID is required.");
	}
	if (!resourcePrefix) {
		throw new Error("RESOURCE_PREFIX is required.");
	}

	const frontendBucket =
		process.env.FRONTEND_GCP_BUCKET ||
		`${projectId}-${resourcePrefix}-frontend`;
	const urlMapName = process.env.URL_MAP_NAME || `${resourcePrefix}-url-map`;
	const appDir = path.resolve(__dirname, "..", "..");

	run(
		"gcloud",
		[
			"storage",
			"rsync",
			"-r",
			"--delete-unmatched-destination-objects",
			"frontend/dist",
			`gs://${frontendBucket}`,
		],
		{ cwd: appDir },
	);
	run(
		"gcloud",
		[
			"storage",
			"objects",
			"update",
			`gs://${frontendBucket}/index.html`,
			"--cache-control=no-cache,no-store,must-revalidate",
		],
		{ cwd: appDir },
	);
	run(
		"gcloud",
		[
			"compute",
			"url-maps",
			"invalidate-cdn-cache",
			urlMapName,
			"--path=/*",
			"--global",
			`--project=${projectId}`,
		],
		{ cwd: appDir },
	);
}

try {
	main();
} catch (error) {
	console.error(`ERROR: ${error.message}`);
	process.exit(1);
}
