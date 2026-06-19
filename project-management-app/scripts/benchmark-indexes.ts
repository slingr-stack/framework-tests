#!/usr/bin/env tsx
/**
 * benchmark-indexes.ts
 *
 * Demonstrates the real-world performance difference between querying a
 * column decorated with @Index() versus a plain non-indexed column.
 *
 * Why we use email (high cardinality) instead of status (low cardinality)
 * ────────────────────────────────────────────────────────────────────────
 * PostgreSQL's query planner is smart: for a low-cardinality column like
 * `status` (10 distinct values, ~10 % selectivity per value) it correctly
 * prefers a Seq Scan that stops early — even if an index exists.
 *
 * A B-tree index shines on high-cardinality lookups, e.g.:
 *   WHERE email = 'user_75432@example.com'   → 1 row out of 150 000
 *
 * With that query, a Seq Scan must read ~75 000 rows on average before
 * finding a match, while an Index Scan jumps straight to the leaf page.
 * This is exactly the @Index({ unique: true }) pattern used in the app on
 * Project.code and User.email.
 *
 * What it does
 * ────────────
 *  1. Connects to the same PostgreSQL instance used by the app.
 *  2. Creates two scratch tables:
 *       • bm_users_indexed   – B-tree index on `email`  ← @Index({ unique: true })
 *       • bm_users_no_index  – no index on `email`
 *  3. Bulk-inserts ROW_COUNT rows (unique email per row) into both tables.
 *  4. Runs EXPLAIN (ANALYZE, BUFFERS) to show "Index Scan" vs "Seq Scan".
 *  5. Times ITERATIONS exact-match lookups against each table.
 *  6. Prints a colour-coded summary with the speedup ratio.
 *  7. Drops both scratch tables on exit (pass --keep to skip cleanup).
 *
 * Usage
 * ─────
 *  npx tsx scripts/benchmark-indexes.ts
 *  npx tsx scripts/benchmark-indexes.ts --keep
 *  ROWS=300000 ITERATIONS=200 npx tsx scripts/benchmark-indexes.ts
 *
 * Prerequisites
 * ─────────────
 *  docker compose up -d   (container must be running)
 */

import { Client } from "pg";

// ── Configuration ─────────────────────────────────────────────────────────────

const DB_CONFIG = {
	host: "localhost",
	port: 5433,
	user: "postgres",
	password: "postgres",
	database: "project_management_app",
};

/** Rows per table. More rows → bigger timing gap. */
const ROW_COUNT = Number(process.env.ROWS ?? 150_000);
/** Lookup iterations per table for the timing test. */
const ITERATIONS = Number(process.env.ITERATIONS ?? 100);

const TABLE_INDEXED = "bm_users_indexed";
const TABLE_NO_INDEX = "bm_users_no_index";
const INDEX_NAME = "bm_idx_users_indexed_email";

// ── ANSI colour helpers ───────────────────────────────────────────────────────

const c = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
};

function log(msg: string, colour = c.reset): void {
	console.log(`${colour}${msg}${c.reset}`);
}

function header(title: string): void {
	console.log("");
	log("─".repeat(62), c.dim);
	log(` ${title}`, c.bold + c.white);
	log("─".repeat(62), c.dim);
}

function fmt(ms: number): string {
	return ms < 1000 ? `${ms.toFixed(2)} ms` : `${(ms / 1000).toFixed(3)} s`;
}

// ── Bulk-insert ───────────────────────────────────────────────────────────────

async function bulkInsert(client: Client, table: string): Promise<number> {
	const BATCH = 2_000;
	const start = performance.now();

	for (let offset = 0; offset < ROW_COUNT; offset += BATCH) {
		const count = Math.min(BATCH, ROW_COUNT - offset);
		const values: string[] = [];
		const params: (string | number)[] = [];
		let p = 1;

		for (let i = 0; i < count; i++) {
			const row = offset + i;
			values.push(`($${p++}, $${p++}, $${p++})`);
			params.push(
				`user_${row}@example.com`,
				`User ${row}`,
				row % 2 === 0 ? "active" : "inactive",
			);
		}

		await client.query(
			`INSERT INTO "${table}" (email, full_name, status) VALUES ${values.join(", ")}`,
			params,
		);
	}

	return performance.now() - start;
}

// ── EXPLAIN ANALYZE ───────────────────────────────────────────────────────────

interface ExplainResult {
	lines: string[];
	/** Execution Time reported by EXPLAIN ANALYZE in milliseconds, or null if not found */
	executionMs: number | null;
}

async function explainQuery(
	client: Client,
	table: string,
	email: string,
): Promise<ExplainResult> {
	const result = await client.query<Record<string, string>>(
		`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
     SELECT id, email, full_name FROM "${table}" WHERE email = $1`,
		[email],
	);
	const lines = result.rows.map((r) => Object.values(r)[0] ?? "");
	const execLine = lines.find((l) => /^\s*Execution Time:/i.test(l));
	const execMs = execLine ? parseFloat(execLine.replace(/[^0-9.]/g, "")) : null;
	return { lines, executionMs: execMs };
}

// ── Timed lookup loop ─────────────────────────────────────────────────────────

async function timeQueries(client: Client, table: string): Promise<number> {
	// Build a list of ITERATIONS email addresses spread evenly across the dataset
	const emails: string[] = [];
	const step = Math.floor(ROW_COUNT / ITERATIONS);
	for (let i = 0; i < ITERATIONS; i++) {
		emails.push(`user_${i * step}@example.com`);
	}

	// Warm-up (not timed)
	await client.query(`SELECT id, email FROM "${table}" WHERE email = $1`, [
		emails[0],
	]);

	const start = performance.now();
	for (const email of emails) {
		await client.query(
			`SELECT id, email, full_name FROM "${table}" WHERE email = $1`,
			[email],
		);
	}
	return performance.now() - start;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	const keepTables = process.argv.includes("--keep");

	// Banner
	console.log("");
	log(
		"╔══════════════════════════════════════════════════════════════╗",
		c.cyan,
	);
	log(
		"║           @Index Decorator — Performance Benchmark           ║",
		c.cyan + c.bold,
	);
	log(
		"╚══════════════════════════════════════════════════════════════╝",
		c.cyan,
	);
	log(`  Rows per table   : ${ROW_COUNT.toLocaleString()}`, c.dim);
	log(`  Lookup iterations: ${ITERATIONS}`, c.dim);
	log(
		`  Query pattern    : WHERE email = 'user_N@example.com'  (1 row match)`,
		c.dim,
	);

	// Connect
	header("Connecting to PostgreSQL");
	const client = new Client(DB_CONFIG);
	try {
		await client.connect();
	} catch (err: unknown) {
		const code = (err as NodeJS.ErrnoException).code ?? "";
		const msg =
			err instanceof Error && err.message ? err.message : code || String(err);
		log(`✖  Could not connect: ${msg}`, c.red);
		log(
			"   Make sure the Docker container is running (docker compose up -d).",
			c.yellow,
		);
		process.exit(1);
	}
	log(
		`✔  Connected to ${DB_CONFIG.database} on port ${DB_CONFIG.port}`,
		c.green,
	);

	try {
		// Setup
		header("Setting up scratch tables");

		await client.query(`DROP TABLE IF EXISTS "${TABLE_INDEXED}"`);
		await client.query(`DROP TABLE IF EXISTS "${TABLE_NO_INDEX}"`);

		const ddl = `(
      id        SERIAL PRIMARY KEY,
      email     TEXT NOT NULL,
      full_name TEXT NOT NULL,
      status    TEXT NOT NULL
    )`;
		await client.query(`CREATE TABLE "${TABLE_INDEXED}"  ${ddl}`);
		await client.query(`CREATE TABLE "${TABLE_NO_INDEX}" ${ddl}`);

		// This is what @Index({ unique: true }) generates in the Drumr migration engine
		await client.query(
			`CREATE UNIQUE INDEX "${INDEX_NAME}" ON "${TABLE_INDEXED}" USING btree (email)`,
		);

		log(
			`✔  "${TABLE_INDEXED}"   — unique B-tree index on 'email'  ← @Index({ unique: true })`,
			c.green,
		);
		log(
			`✔  "${TABLE_NO_INDEX}"  — no index on 'email'              ← plain field`,
			c.green,
		);

		// Populate
		header(`Inserting ${ROW_COUNT.toLocaleString()} rows into each table`);

		process.stdout.write(`   "${TABLE_INDEXED}"   … `);
		const tInsertIdx = await bulkInsert(client, TABLE_INDEXED);
		log(`${fmt(tInsertIdx)}`, c.green);

		process.stdout.write(`   "${TABLE_NO_INDEX}"  … `);
		const tInsertNone = await bulkInsert(client, TABLE_NO_INDEX);
		log(`${fmt(tInsertNone)}`, c.green);

		// Update planner statistics
		await client.query(`ANALYZE "${TABLE_INDEXED}"`);
		await client.query(`ANALYZE "${TABLE_NO_INDEX}"`);

		// EXPLAIN ANALYZE — use a row in the middle of the dataset to avoid caching bias
		const probeEmail = `user_${Math.floor(ROW_COUNT / 2)}@example.com`;
		header(`Query plans for: WHERE email = '${probeEmail}'`);

		log(`\n  ► WITH index  (${TABLE_INDEXED})\n`, c.cyan);
		const planIdx = await explainQuery(client, TABLE_INDEXED, probeEmail);
		planIdx.lines.forEach((line) => {
			const isIndex = /index (scan|only scan|cond)|bitmap/i.test(line);
			const isExec = /execution time/i.test(line);
			log(`     ${line}`, isIndex || isExec ? c.green + c.bold : c.dim);
		});

		log(`\n  ► WITHOUT index  (${TABLE_NO_INDEX})\n`, c.yellow);
		const planNone = await explainQuery(client, TABLE_NO_INDEX, probeEmail);
		planNone.lines.forEach((line) => {
			const isSeq = /seq scan/i.test(line);
			const isExec = /execution time/i.test(line);
			log(`     ${line}`, isSeq || isExec ? c.red + c.bold : c.dim);
		});

		// Timing
		header(`Timing: ${ITERATIONS} exact-match lookups on each table`);

		process.stdout.write(`   Querying "${TABLE_INDEXED}"  … `);
		const tIdx = await timeQueries(client, TABLE_INDEXED);
		log(`total ${fmt(tIdx)}  (avg ${fmt(tIdx / ITERATIONS)} / query)`, c.green);

		process.stdout.write(`   Querying "${TABLE_NO_INDEX}" … `);
		const tNone = await timeQueries(client, TABLE_NO_INDEX);
		log(
			`total ${fmt(tNone)}  (avg ${fmt(tNone / ITERATIONS)} / query)`,
			c.yellow,
		);

		// Summary
		header("Results");

		const avgIdx = tIdx / ITERATIONS;
		const avgNone = tNone / ITERATIONS;
		const wallSpeedup = tNone / tIdx;
		const pctSaved = ((tNone - tIdx) / tNone) * 100;
		const execSpeedup =
			planIdx.executionMs !== null &&
			planNone.executionMs !== null &&
			planIdx.executionMs > 0
				? planNone.executionMs / planIdx.executionMs
				: null;

		const col = (v: string, highlight: boolean) =>
			highlight
				? `${c.green}${c.bold}${v}${c.reset}`
				: `${c.red}${v}${c.reset}`;

		log(
			`  ┌──────────────────────────────────────┬──────────────┬──────────────┐`,
			c.dim,
		);
		log(
			`  │ Metric                               │  With @Index │  No index    │`,
			c.bold + c.white,
		);
		log(
			`  ├──────────────────────────────────────┼──────────────┼──────────────┤`,
			c.dim,
		);
		if (planIdx.executionMs !== null && planNone.executionMs !== null) {
			log(
				`  │ Pure DB exec (EXPLAIN ANALYZE)       │ ` +
					`${col(fmt(planIdx.executionMs).padStart(12), true)} │ ` +
					`${col(fmt(planNone.executionMs).padStart(12), false)} │`,
			);
			log(
				`  ├──────────────────────────────────────┼──────────────┼──────────────┤`,
				c.dim,
			);
		}
		log(
			`  │ Wall-clock total (${String(ITERATIONS).padEnd(3)} round-trips)  │ ` +
				`${col(fmt(tIdx).padStart(12), wallSpeedup >= 1)} │ ` +
				`${col(fmt(tNone).padStart(12), wallSpeedup < 1)} │`,
		);
		log(
			`  │ Wall-clock avg per query             │ ` +
				`${col(fmt(avgIdx).padStart(12), wallSpeedup >= 1)} │ ` +
				`${col(fmt(avgNone).padStart(12), wallSpeedup < 1)} │`,
		);
		log(
			`  └──────────────────────────────────────┴──────────────┴──────────────┘`,
			c.dim,
		);

		console.log("");
		if (execSpeedup !== null && execSpeedup >= 10) {
			log(
				`  🚀  Pure query execution is  ${c.green}${c.bold}${execSpeedup.toFixed(0)}× faster${c.reset}` +
					`  with the index  (${fmt(planIdx.executionMs ?? 0)} vs ${fmt(planNone.executionMs ?? 0)}).`,
			);
			log(
				`     Wall-clock difference (${wallSpeedup.toFixed(2)}×) is smaller because`,
				c.dim,
			);
			log(
				`     network round-trip time is included in the timing test.`,
				c.dim,
			);
		} else if (wallSpeedup >= 1.5) {
			log(
				`  🚀  Index lookup is  ${c.green}${c.bold}${wallSpeedup.toFixed(1)}× faster${c.reset}` +
					`  (${pctSaved.toFixed(0)} % time saved).`,
			);
		} else if (wallSpeedup >= 1.0) {
			log(
				`  ✔  Index lookup is ${c.green}${wallSpeedup.toFixed(2)}× faster${c.reset}.`,
				c.reset,
			);
			log(`     The gap grows with more rows and cold page cache.`, c.dim);
		} else {
			log(
				`  ℹ  Both tables ran at similar speed (data likely fully cached).`,
				c.yellow,
			);
			log(
				`     Run again with a fresh container or increase ROWS for a larger gap.`,
				c.dim,
			);
		}

		// Context
		header("How this maps to your Drumr models");

		log(
			`  @Index({ unique: true }) on a high-cardinality field like 'email'`,
			c.reset,
		);
		log(`  gives PostgreSQL a direct path to the matching row:`, c.reset);
		console.log("");
		log(`    @TextField({ required: true })`, c.cyan);
		log(
			`    @Index({ unique: true })   // → CREATE UNIQUE INDEX USING btree (email)`,
			c.cyan,
		);
		log(`    email!: string;`, c.cyan);
		console.log("");
		log(
			`  @Index() without unique is ideal for filtered queries on FK / enum fields:`,
			c.reset,
		);
		console.log("");
		log(`    @ChoiceField({ required: true, type: () => TaskStatus })`, c.cyan);
		log(
			`    @Index()                   // → CREATE INDEX USING btree (status)`,
			c.cyan,
		);
		log(`    status: TaskStatus = TaskStatus.ToDo;`, c.cyan);
		console.log("");
		log(`  Project-management-app indexed fields:`, c.reset);
		log(`    • Project.code        @Index({ unique: true })`, c.dim);
		log(`    • Task.status         @Index()`, c.dim);
		log(`    • Task.priority       @Index()`, c.dim);
		log(`    • Task.dueDate        @Index()`, c.dim);
	} finally {
		if (!keepTables) {
			header("Cleaning up");
			await client.query(`DROP TABLE IF EXISTS "${TABLE_INDEXED}"`);
			await client.query(`DROP TABLE IF EXISTS "${TABLE_NO_INDEX}"`);
			log(`✔  Scratch tables dropped.`, c.green);
		} else {
			header("Tables kept (--keep flag)");
			log(`   SELECT * FROM "${TABLE_INDEXED}"  LIMIT 5;`, c.dim);
			log(`   SELECT * FROM "${TABLE_NO_INDEX}" LIMIT 5;`, c.dim);
		}

		await client.end();
		console.log("");
		log("Benchmark complete.", c.bold + c.green);
		console.log("");
	}
}

main().catch((err: unknown) => {
	const msg = err instanceof Error ? err.message : String(err);
	console.error(`\n${c.red}Fatal error: ${msg}${c.reset}\n`);
	process.exit(1);
});
