/**
 * Skill Conformance Spec — backend-datasets
 *
 * Skill:    core/skills/backend-datasets/SKILL.md
 * Approach: File-structure + content analysis — parses JSONL files and datasetOptions.json.
 *           No TypeScript import/class patterns — this skill is about file layout and data format.
 *
 * Primary fixtures:
 *   backend/src/dataSets/postgres-db/default/   — canonical dataset with all model files
 *   backend/src/dataSets/postgres-db/test-loading/  — includes File.jsonl with __path
 *   backend/src/dataSets/postgres-db/index-test/    — minimal 3-model dataset
 *
 * Adversarial scan: all .jsonl files under backend/src/dataSets/
 *
 * How to run:
 *   cd apps/project-management-app/backend
 *   TS_NODE_PROJECT=tsconfig.test.json npx jest \
 *     --config config/jest.config.ts \
 *     --testPathPatterns='backend-datasets.skill-conformance' \
 *     --no-coverage --verbose
 *
 * SkillScore: C=3, K=3, D=3, R=2 → (3×0.40 + 3×0.20 + 3×0.20 + 2×0.20) × 33.33 = 93.3
 * Threshold:  optional ≥ 65 ✅
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const DATASETS_ROOT = path.resolve(
	__dirname,
	'../../../src/config/data-sources/main/datasets',
);

function readDataset(rel: string): string {
	return fs.readFileSync(path.join(DATASETS_ROOT, rel), 'utf8');
}

function readDatasetJson(rel: string): unknown {
	return JSON.parse(readDataset(rel));
}

/** Parse a JSONL file — returns an array of parsed objects (one per non-empty line). */
function parseJsonl(content: string): unknown[] {
	return content
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => JSON.parse(line));
}

function readJsonl(rel: string): unknown[] {
	return parseJsonl(readDataset(rel));
}

/** Collect all .jsonl files under dataSets/. Returns [{ rel, records }] */
function collectAllJsonlFiles(): Array<{
	rel: string;
	content: string;
	records: unknown[];
}> {
	const results: Array<{ rel: string; content: string; records: unknown[] }> =
		[];

	function walk(dir: string): void {
		for (const entry of fs.readdirSync(dir)) {
			const full = path.join(dir, entry);
			const stat = fs.statSync(full);
			if (stat.isDirectory()) {
				walk(full);
			} else if (entry.endsWith('.jsonl')) {
				const content = fs.readFileSync(full, 'utf8');
				results.push({
					rel: path.relative(DATASETS_ROOT, full),
					content,
					records: parseJsonl(content),
				});
			}
		}
	}

	walk(DATASETS_ROOT);
	return results;
}

/** Collect all datasetOptions.json files */
function collectDatasetOptions(): Array<{
	rel: string;
	options: {
		includeModels?: string[];
		excludeModels?: string[];
	};
}> {
	const results: Array<{
		rel: string;
		options: { includeModels?: string[]; excludeModels?: string[] };
	}> = [];

	function walk(dir: string): void {
		for (const entry of fs.readdirSync(dir)) {
			const full = path.join(dir, entry);
			const stat = fs.statSync(full);
			if (stat.isDirectory()) {
				walk(full);
			} else if (entry === 'datasetOptions.json') {
				const options = JSON.parse(fs.readFileSync(full, 'utf8'));
				results.push({
					rel: path.relative(DATASETS_ROOT, full),
					options,
				});
			}
		}
	}

	walk(DATASETS_ROOT);
	return results;
}

const defaultUserRecords = readJsonl('default/User.jsonl');
const defaultProjectRecords = readJsonl('default/Project.jsonl');
const testLoadingFileRecords = readJsonl('test-loading/File.jsonl');
const testLoadingProjectRecords = readJsonl('test-loading/Project.jsonl');
const defaultOptions = readDatasetJson('default/datasetOptions.json') as Record<
	string,
	unknown
>;
const testLoadingOptions = readDatasetJson(
	'test-loading/datasetOptions.json',
) as Record<string, unknown>;

const allJsonlFiles = collectAllJsonlFiles();
const allDatasetOptions = collectDatasetOptions();

// ---------------------------------------------------------------------------
// SR-1 — Dataset path and file structure conventions
// ---------------------------------------------------------------------------

describe('SR-1: Dataset path and file structure conventions', () => {
	// SR-1.1 — Dataset directories follow <datasource-id>/<dataset-name>/ModelName.jsonl
	// Rule: "backend/src/dataSets/<idDataSource>/<dataset-name>/ModelName.jsonl"
	it('datasets are organized under config/data-sources/<datasourceDir>/datasets/<dataset>/ModelName.jsonl path structure', () => {
		// Verify known datasets exist at their expected paths
		expect(fs.existsSync(path.join(DATASETS_ROOT, 'default/User.jsonl'))).toBe(
			true,
		);
		expect(
			fs.existsSync(path.join(DATASETS_ROOT, 'default/Project.jsonl')),
		).toBe(true);
		expect(
			fs.existsSync(path.join(DATASETS_ROOT, 'test-loading/User.jsonl')),
		).toBe(true);
		expect(
			fs.existsSync(path.join(DATASETS_ROOT, 'test-loading/File.jsonl')),
		).toBe(true);
	});

	it('each dataset directory contains one model per JSONL file (no model duplicates)', () => {
		// In each dataset directory, filenames should be unique
		const datasets = new Map<string, string[]>();
		for (const { rel } of allJsonlFiles) {
			const parts = rel.split(path.sep);
			if (parts.length >= 2) {
				const dataset = parts[0];
				const filename = parts[parts.length - 1];
				if (!datasets.has(dataset)) datasets.set(dataset, []);
				datasets.get(dataset)!.push(filename);
			}
		}
		for (const [dataset, files] of datasets.entries()) {
			const uniqueFiles = new Set(files);
			expect(uniqueFiles.size).toBe(files.length);
		}
	});

	// SR-1.2 — datasetOptions.json may co-exist in each dataset directory
	// Rule: "datasetOptions.json may narrow the load with includeModels and excludeModels"
	it('default dataset has a datasetOptions.json alongside model files', () => {
		expect(
			fs.existsSync(path.join(DATASETS_ROOT, 'default/datasetOptions.json')),
		).toBe(true);
	});

	it('test-loading dataset has a datasetOptions.json alongside model files', () => {
		expect(
			fs.existsSync(
				path.join(DATASETS_ROOT, 'test-loading/datasetOptions.json'),
			),
		).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// SR-2 — JSONL format and record structural contracts
// ---------------------------------------------------------------------------

describe('SR-2: JSONL format and record structural contracts', () => {
	// SR-2.1 — JSONL files have one JSON object per line (no array root)
	// Rule: "File content must be JSONL (one JSON object per line, no array wrapper)"
	it('default/User.jsonl: content is JSONL — no array wrapper, each line is a JSON object', () => {
		const rawContent = readDataset('default/User.jsonl');
		// Must not start with '[' (array wrapper)
		expect(rawContent.trimStart()).not.toMatch(/^\[/);
		// Each non-empty line parses as an object (not array or primitive)
		for (const record of defaultUserRecords) {
			expect(typeof record).toBe('object');
			expect(Array.isArray(record)).toBe(false);
		}
	});

	it('default/Project.jsonl: content is JSONL — no array wrapper', () => {
		const rawContent = readDataset('default/Project.jsonl');
		expect(rawContent.trimStart()).not.toMatch(/^\[/);
		expect(defaultProjectRecords.length).toBeGreaterThan(0);
	});

	it('test-loading/File.jsonl: content is JSONL — no array wrapper', () => {
		const rawContent = readDataset('test-loading/File.jsonl');
		expect(rawContent.trimStart()).not.toMatch(/^\[/);
		expect(testLoadingFileRecords.length).toBeGreaterThan(0);
	});

	// SR-2.2 — Each JSONL record is a non-empty object
	it('default/User.jsonl: every record has at least one field', () => {
		for (const record of defaultUserRecords) {
			expect(Object.keys(record as object).length).toBeGreaterThan(0);
		}
	});

	it('test-loading/Project.jsonl: every record has at least one field', () => {
		for (const record of testLoadingProjectRecords) {
			expect(Object.keys(record as object).length).toBeGreaterThan(0);
		}
	});

	// SR-2.3 — AppFile records with __path declare an id field
	// Rule: "AppFile records that use __path must declare an id so the loader knows the storage target"
	it('test-loading/File.jsonl: every record with __path has an id field declared', () => {
		for (const record of testLoadingFileRecords) {
			const r = record as Record<string, unknown>;
			if ('__path' in r) {
				expect(r.id).toBeDefined();
				expect(typeof r.id).toBe('string');
				expect((r.id as string).length).toBeGreaterThan(0);
			}
		}
	});

	// SR-2.4 — __path must be a relative path (not absolute)
	// Rule: "__path must be a non-empty relative path; absolute paths are rejected"
	it('test-loading/File.jsonl: __path values are relative (not absolute paths)', () => {
		for (const record of testLoadingFileRecords) {
			const r = record as Record<string, unknown>;
			if ('__path' in r) {
				const pathValue = r.__path as string;
				// Relative paths start with . or a filename, not /
				expect(pathValue.startsWith('/')).toBe(false);
				expect(pathValue.length).toBeGreaterThan(0);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// SR-3 — datasetOptions.json model-filter contracts
// ---------------------------------------------------------------------------

describe('SR-3: datasetOptions.json model-filter contracts', () => {
	// SR-3.1 — datasetOptions.json contains includeModels and/or excludeModels arrays
	// Rule: "datasetOptions.json may narrow the load with includeModels and excludeModels"
	it('default/datasetOptions.json: includeModels field is an array', () => {
		const includeModels = defaultOptions.includeModels;
		expect(Array.isArray(includeModels)).toBe(true);
	});

	it('test-loading/datasetOptions.json: includeModels field is an array', () => {
		const includeModels = testLoadingOptions.includeModels;
		expect(Array.isArray(includeModels)).toBe(true);
	});

	// SR-3.2 — includeModels must list non-empty model name strings when non-empty
	it('default/datasetOptions.json: all includeModels entries are non-empty strings', () => {
		const includeModels = defaultOptions.includeModels as string[];
		for (const model of includeModels) {
			expect(typeof model).toBe('string');
			expect(model.length).toBeGreaterThan(0);
		}
	});

	// SR-3.3 — includeModels and excludeModels must not both be non-empty simultaneously
	// Rule: "--includeModels and --excludeModels are mutually exclusive"
	it('default/datasetOptions.json: includeModels and excludeModels are not both non-empty', () => {
		const include =
			(defaultOptions.includeModels as string[] | undefined) ?? [];
		const exclude =
			(defaultOptions.excludeModels as string[] | undefined) ?? [];
		// At most one of the two arrays should be non-empty
		const bothNonEmpty = include.length > 0 && exclude.length > 0;
		expect(bothNonEmpty).toBe(false);
	});

	it('test-loading/datasetOptions.json: includeModels and excludeModels are not both non-empty', () => {
		const include =
			(testLoadingOptions.includeModels as string[] | undefined) ?? [];
		const exclude =
			(testLoadingOptions.excludeModels as string[] | undefined) ?? [];
		const bothNonEmpty = include.length > 0 && exclude.length > 0;
		expect(bothNonEmpty).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// SR-4 — Forbidden patterns and adversarial scan
// ---------------------------------------------------------------------------

describe('SR-4: Forbidden patterns and adversarial scan', () => {
	// SR-4.1 — No JSONL file uses an array wrapper
	// Rule: "no array wrapper ([])"
	it('adversarial: no JSONL file starts with an array wrapper [', () => {
		const violators = allJsonlFiles.filter(({ content }) =>
			content.trimStart().startsWith('['),
		);
		expect(violators.map((v) => v.rel)).toHaveLength(0);
	});

	// SR-4.2 — All JSONL files parse without errors (valid JSON per line)
	it('adversarial: all JSONL files contain only valid JSON per line', () => {
		const violators: string[] = [];
		for (const { rel, content } of allJsonlFiles) {
			const lines = content
				.split('\n')
				.map((l) => l.trim())
				.filter((l) => l.length > 0);
			for (const line of lines) {
				try {
					JSON.parse(line);
				} catch {
					violators.push(rel);
					break;
				}
			}
		}
		expect(violators).toHaveLength(0);
	});

	// SR-4.3 — No __path value is an absolute path
	// Rule: "absolute paths are rejected"
	it('adversarial: no JSONL record contains an absolute __path', () => {
		const violators: string[] = [];
		for (const { rel, records } of allJsonlFiles) {
			for (const record of records) {
				const r = record as Record<string, unknown>;
				if (typeof r.__path === 'string' && r.__path.startsWith('/')) {
					violators.push(rel);
					break;
				}
			}
		}
		expect(violators).toHaveLength(0);
	});

	// SR-4.4 — No datasetOptions.json has both includeModels and excludeModels non-empty
	// Rule: "--includeModels and --excludeModels are mutually exclusive"
	it('adversarial: no datasetOptions.json has both includeModels and excludeModels non-empty', () => {
		const violators = allDatasetOptions.filter(({ options }) => {
			const include = options.includeModels ?? [];
			const exclude = options.excludeModels ?? [];
			return include.length > 0 && exclude.length > 0;
		});
		expect(violators.map((v) => v.rel)).toHaveLength(0);
	});

	// SR-4.5 — Every JSONL file has at least one record
	it('adversarial: no JSONL file is empty (has at least one record)', () => {
		const violators = allJsonlFiles.filter(
			({ records }) => records.length === 0,
		);
		expect(violators.map((v) => v.rel)).toHaveLength(0);
	});
});
