#!/usr/bin/env node
// test-scaling-locks.js — Verify distributed locking across multiple backend
// replicas behind the dedicated scaling-local nginx load balancer.
//
// What it does:
//   1. Connects to the scaling-local postgres on localhost:5433 (compose port mapping).
//   2. Upserts a known User + Project + Task so the test is idempotent and
//      survives re-runs without manual cleanup. The task is reset to status
//      'to_do' on every run so contention can be observed each time.
//   3. Mints a JWT using the JWT_SECRET baked into docker-compose.scaling-local.yml.
//   4. Fires N concurrent ClaimAndStartTask GraphQL mutations through nginx
//      on http://localhost:8080. With `--scale backend=N`, nginx fans out
//      across replicas via Docker DNS round-robin (see ops/nginx/scaling-local.conf).
//   5. Asserts exactly 1 mutation returns Task (the winner) and N-1 return
//      CannotExecuteErrorType (lost the race). Any other outcome fails.
//
// Prerequisites — full scaling-local stack must be running with N>=2 backend replicas:
//   node ops/scripts/run-scaling-locks-local.js --replicas=3
//
// Usage (from the app root):
//   node ops/scripts/test-scaling-locks.js              # N=20 concurrent claims
//   node ops/scripts/test-scaling-locks.js --concurrency=50

const { Client } = require("pg");
const jwt = require("jsonwebtoken");

const ENDPOINT = "http://localhost:8080/graphql";
const JWT_SECRET = "local-test-secret-not-for-production";

// Known fixture IDs. Idempotent UPSERTs let the script run repeatedly.
const USER_ID = "00000000-0000-0000-0000-00000000aaaa";
const PROJECT_ID = "00000000-0000-0000-0000-00000000bbbb";
const TASK_ID = "00000000-0000-0000-0000-00000000cccc";

const PG_CONFIG = {
	host: "localhost",
	port: 5433,
	user: "postgres",
	password: "postgres",
	database: "project_management_app",
};

function parseConcurrency() {
	const arg = process.argv.find((a) => a.startsWith("--concurrency="));
	const n = arg ? parseInt(arg.split("=")[1], 10) : 20;
	if (!Number.isFinite(n) || n < 2) {
		throw new Error("--concurrency must be an integer >= 2");
	}
	return n;
}

async function seedFixtures(client) {
	// User
	await client.query(
		`INSERT INTO "user" (id, "firstName", "lastName", "fullName", email, status, "createdAt", "updatedAt")
		 VALUES ($1, 'Scaling', 'Tester', 'Scaling Tester', 'scaling.tester@example.com', 'active', NOW(), NOW())
		 ON CONFLICT (id) DO UPDATE SET status = 'active', "updatedAt" = NOW()`,
		[USER_ID],
	);
	// Roles: drop and re-insert to keep idempotent
	await client.query(`DELETE FROM user_roles WHERE parent_id = $1`, [USER_ID]);
	await client.query(
		`INSERT INTO user_roles (id, value, array_index, parent_id)
		 VALUES (gen_random_uuid(), 'system', 0, $1)`,
		[USER_ID],
	);

	// Project
	await client.query(
		`INSERT INTO project (id, name, code, status, priority, "isArchived", "createdAt", "updatedAt")
		 VALUES ($1, 'Scaling Test Project', 'SCALE-1', 'active', 'medium', false, NOW(), NOW())
		 ON CONFLICT (id) DO UPDATE SET status = 'active', "updatedAt" = NOW()`,
		[PROJECT_ID],
	);

	// Task — reset to ToDo on every run so contention is observable.
	await client.query(
		`INSERT INTO task (id, title, status, priority, "isBillable", "projectId", "assigneeId", "startedAt", "createdAt", "updatedAt")
		 VALUES ($1, 'Scaling Test Task', 'to_do', 'medium', false, $2, NULL, NULL, NOW(), NOW())
		 ON CONFLICT (id) DO UPDATE SET status = 'to_do', "assigneeId" = NULL, "startedAt" = NULL, "updatedAt" = NOW()`,
		[TASK_ID, PROJECT_ID],
	);
}

function mintToken() {
	return jwt.sign(
		{ id: USER_ID, email: "scaling.tester@example.com", roles: ["system"] },
		JWT_SECRET,
		{ expiresIn: "1h" },
	);
}

async function fireClaim(token) {
	const body = JSON.stringify({
		query: `
			mutation Claim($id: String!) {
				TaskClaimAndStartTask(id: $id) {
					__typename
					... on Task { id status startedAt }
					... on CannotExecuteErrorType { _displayValue }
				}
			}
		`,
		variables: { id: TASK_ID },
	});

	const res = await fetch(ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body,
	});

	if (!res.ok) {
		return { kind: "http_error", status: res.status, body: await res.text() };
	}

	const payload = await res.json();
	if (payload.errors) {
		return { kind: "graphql_error", errors: payload.errors };
	}

	const result = payload?.data?.TaskClaimAndStartTask;
	if (!result || !result.__typename) {
		return { kind: "unexpected_shape", payload };
	}

	if (result.__typename === "Task") {
		return { kind: "winner", task: result };
	}
	if (result.__typename === "CannotExecuteErrorType") {
		return { kind: "rejected" };
	}
	return { kind: "unexpected_variant", typename: result.__typename };
}

async function main() {
	const concurrency = parseConcurrency();
	console.log(`Concurrency: ${concurrency}`);
	console.log(`Endpoint:    ${ENDPOINT}`);

	const client = new Client(PG_CONFIG);
	await client.connect();
	try {
		console.log("Seeding fixtures...");
		await seedFixtures(client);
	} finally {
		await client.end();
	}

	const token = mintToken();

	console.log(`Firing ${concurrency} concurrent ClaimAndStartTask mutations...`);
	const started = Date.now();
	const results = await Promise.all(
		Array.from({ length: concurrency }, () => fireClaim(token)),
	);
	const elapsed = Date.now() - started;

	const winners = results.filter((r) => r.kind === "winner");
	const rejections = results.filter((r) => r.kind === "rejected");
	const unexpected = results.filter(
		(r) => r.kind !== "winner" && r.kind !== "rejected",
	);

	console.log("");
	console.log(`Elapsed:     ${elapsed}ms`);
	console.log(`Winners:     ${winners.length}`);
	console.log(`Rejections:  ${rejections.length}`);
	console.log(`Unexpected:  ${unexpected.length}`);

	if (unexpected.length > 0) {
		console.log("");
		console.log("Unexpected outcomes:");
		for (const u of unexpected.slice(0, 5)) {
			console.log(JSON.stringify(u));
		}
		console.log("FAIL");
		process.exit(1);
	}

	if (winners.length !== 1 || rejections.length !== concurrency - 1) {
		console.log("");
		console.log(
			`FAIL: expected 1 winner and ${concurrency - 1} rejections, ` +
				`got ${winners.length} winners and ${rejections.length} rejections.`,
		);
		process.exit(1);
	}

	console.log("");
	console.log(
		`PASS: 1 winner, ${rejections.length} contention rejections, 0 unexpected.`,
	);
}

main().catch((err) => {
	console.error("Script error:", err);
	process.exit(1);
});
