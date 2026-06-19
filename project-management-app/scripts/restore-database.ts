#!/usr/bin/env ts-node
/**
 * Database Restoration Script
 * Recreates the database, creates schema, and loads data in the correct order
 * Order: User → Project → Task (respects foreign key dependencies)
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

// Configuration
const DB_NAME = "project_management_app";
const DB_USER = "postgres";
const CONTAINER_NAME = "project-management-app-postgres-db-db-1";

function resolveDatasetDir(): string {
	const backendSrc = path.join(__dirname, "../backend/src");
	const roots = [
		path.join(backendSrc, "datasets"),
		path.join(backendSrc, "dataSets"),
	];
	const candidates: string[] = [];

	for (const root of roots) {
		if (!fs.existsSync(root)) {
			continue;
		}
		for (const datasourceDir of fs.readdirSync(root)) {
			candidates.push(path.join(root, datasourceDir, "default"));
		}
	}

	const found = candidates.find(
		(candidate) =>
			fs.existsSync(candidate) &&
			fs.existsSync(path.join(candidate, "User.jsonl")),
	);
	if (!found) {
		throw new Error(
			`Could not find default dataset directory. Checked: ${candidates.join(" and ")}`,
		);
	}
	return found;
}

// Colors for output
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
};

function log(message: string, color: string = colors.reset) {
	console.log(`${color}${message}${colors.reset}`);
}

function exec(command: string, silent: boolean = false): string {
	try {
		return execSync(command, {
			encoding: "utf-8",
			stdio: silent ? "pipe" : "inherit",
		});
	} catch (error) {
		if (!silent) {
			log(`Error executing: ${command}`, colors.red);
			log((error as Error).message, colors.red);
		}
		throw error;
	}
}

async function main() {
	log("========================================", colors.blue);
	log("Tasky app - Database Restore", colors.blue);
	log("========================================", colors.blue);
	console.log("");

	// Step 1: Check if Docker container is running
	log("[1/6] Checking Docker container...", colors.yellow);
	try {
		const containers = exec(`docker ps --format '{{.Names}}'`, true);
		if (!containers.includes(CONTAINER_NAME)) {
			log(`Error: Container '${CONTAINER_NAME}' is not running`, colors.red);
			log(
				"Please start the container first with: docker compose up -d",
				colors.red,
			);
			process.exit(1);
		}
		log("✓ Container is running", colors.green);
	} catch {
		log("Error: Docker is not running or container not found", colors.red);
		process.exit(1);
	}
	console.log("");

	// Step 2: Drop existing database
	log("[2/6] Dropping existing database...", colors.yellow);
	try {
		exec(
			`docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -c "DROP DATABASE IF EXISTS ${DB_NAME};"`,
			true,
		);
	} catch {
		// Ignore error if database doesn't exist
	}
	log("✓ Database dropped", colors.green);
	console.log("");

	// Step 3: Create fresh database
	log("[3/6] Creating fresh database...", colors.yellow);
	exec(
		`docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -c "CREATE DATABASE ${DB_NAME};"`,
		false,
	);
	log("✓ Database created", colors.green);
	console.log("");

	// Step 4: Create schema
	log("[4/6] Creating database schema...", colors.yellow);
	log("Running application with schema synchronization...", colors.blue);
	try {
		exec("DB_SYNCHRONIZE=true timeout 5 npm run dev", true);
	} catch {
		// Timeout is expected, ignore
	}
	log("✓ Schema created", colors.green);
	console.log("");

	// Step 5: Load data in correct order via the drumr CLI
	log("[5/6] Loading data in correct order...", colors.yellow);
	const DATASET_DIR = resolveDatasetDir();

	// The drumr CLI resolves datasets within the datasource folder. Reuse the
	// datasource folder where we discovered the default dataset.
	const TEMP_DS_GROUP_DIR = path.dirname(DATASET_DIR);

	const loadOrder = ["User", "Project", "Task"];

	for (const modelName of loadOrder) {
		const jsonlFile = path.join(DATASET_DIR, `${modelName}.jsonl`);

		if (!fs.existsSync(jsonlFile)) {
			log(
				`  Warning: ${modelName}.jsonl not found, skipping...`,
				colors.yellow,
			);
			continue;
		}

		log(`  Loading ${modelName}...`, colors.blue);

		const datasetName = `${modelName.toLowerCase()}-only`;
		const tempDatasetDir = path.join(TEMP_DS_GROUP_DIR, datasetName);

		fs.mkdirSync(tempDatasetDir, { recursive: true });
		fs.copyFileSync(jsonlFile, path.join(tempDatasetDir, `${modelName}.jsonl`));

		try {
			exec(`npx drumr ds mainDs load ${datasetName}`, false);
			log(`    ✓ ${modelName} loaded`, colors.green);
		} finally {
			fs.rmSync(tempDatasetDir, { recursive: true, force: true });
		}
	}

	console.log("");
	log("✓ All data loaded successfully", colors.green);
	console.log("");

	// Step 6: Verify data
	log("[6/6] Verifying data...", colors.yellow);

	const userCount = exec(
		`docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM \\"user\\";"`,
		true,
	).trim();

	const projectCount = exec(
		`docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM project;"`,
		true,
	).trim();

	const taskCount = exec(
		`docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM task;"`,
		true,
	).trim();

	log(`  Users:    ${userCount}`, colors.green);
	log(`  Projects: ${projectCount}`, colors.green);
	log(`  Tasks:    ${taskCount}`, colors.green);
	console.log("");

	log("========================================", colors.green);
	log("Database restoration completed!", colors.green);
	log("========================================", colors.green);
	console.log("");
	log("You can now start the application with: npm run dev");
}

main().catch((error) => {
	log("Fatal error:", colors.red);
	console.error(error);
	process.exit(1);
});
