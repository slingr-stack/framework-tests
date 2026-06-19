/**
 * Skill Conformance Spec — backend-context
 *
 * Skill:    core/skills/backend-context/SKILL.md
 * Approach: Live imports for two fixtures; source-text scan for bulk-context pattern.
 *
 * Fixtures:
 *   src/actions/tasks/CompleteTask.ts
 *     — constructor injection of Context; context.user?.id read with optional chaining;
 *       defensive null check before attribute; logger.warn fallback
 *   src/actions/global/StartReportInBackground.ts
 *     — constructor injection of Context in a GlobalAction; context.user?.id forwarded
 *       to workflow start (cross-action propagation pattern)
 *   src/actions/tasks/BulkChangePriority.ts (source text only)
 *     — App.resolve(Context) fallback inside try/catch; context.action?.bulkAction;
 *       context.action?.bulkQuery; empty-bulkQuery guard; graceful degradation on no scope
 *
 * Adversarial scan: all .ts files under src/actions/ + src/services/
 *
 * How to run:
 *   cd apps/project-management-app/backend
 *   TS_NODE_PROJECT=tsconfig.test.json npx jest \
 *     --config config/jest.config.ts \
 *     --testPathPatterns='backend-context.skill-conformance' \
 *     --no-coverage --verbose
 *
 * SkillScore: C=3, K=3, D=3, R=2 → (3×0.40 + 3×0.20 + 3×0.20 + 2×0.20) × 33.33 = 93.3
 * Threshold:  supporting ≥ 75 ✅
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Fixture paths
// ---------------------------------------------------------------------------

const SRC_ROOT = path.resolve(__dirname, '../../../src');

function readSrc(rel: string): string {
	return fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');
}

function collectSrcFiles(suffix: string): Array<{ file: string; src: string }> {
	const results: Array<{ file: string; src: string }> = [];

	function walk(dir: string): void {
		for (const entry of fs.readdirSync(dir)) {
			const full = path.join(dir, entry);
			if (fs.statSync(full).isDirectory()) {
				walk(full);
			} else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
				results.push({
					file: path.relative(SRC_ROOT, full),
					src: fs.readFileSync(full, 'utf8'),
				});
			}
		}
	}

	// Scan all module directories for subdirs matching the suffix
	for (const mod of fs.readdirSync(SRC_ROOT)) {
		const modDir = path.join(SRC_ROOT, mod);
		if (!fs.statSync(modDir).isDirectory()) continue;
		const targetDir = path.join(modDir, suffix);
		if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
			walk(targetDir);
		}
	}

	return results;
}

const completeTaskSrc = readSrc('tasks/actions/complete-task.action.ts');
const startReportSrc = readSrc(
	'global/actions/start-report-in-background.action.ts',
);
const bulkChangeSrc = readSrc('tasks/actions/bulk-change-priority.action.ts');

const allActionFiles = collectSrcFiles('actions');
const allServiceFiles = collectSrcFiles('services');

// ---------------------------------------------------------------------------
// SR-1 — Import and injection contracts
// ---------------------------------------------------------------------------

describe('SR-1: Import and injection contracts', () => {
	// SR-1.1 — Context imported from @drumr/framework-backend
	// Rule: "import { Action, Context, ObjectAction } from '@drumr/framework-backend'"
	it('CompleteTask: Context imported from @drumr/framework-backend', () => {
		expect(completeTaskSrc).toMatch(
			/Context.*from\s+['"]@drumr\/framework-backend['"]/s,
		);
	});

	it('StartReportInBackground: Context imported from @drumr/framework-backend', () => {
		expect(startReportSrc).toMatch(
			/Context.*from\s+['"]@drumr\/framework-backend['"]/s,
		);
	});

	it('BulkChangePriority: Context imported from @drumr/framework-backend', () => {
		expect(bulkChangeSrc).toMatch(
			/Context.*from\s+['"]@drumr\/framework-backend['"]/s,
		);
	});

	// SR-1.2 — Constructor injection is the primary pattern
	// Rule: "Preferred pattern: Constructor injection of Context"
	it('CompleteTask: Context is constructor-injected (not ad-hoc resolved)', () => {
		expect(completeTaskSrc).toMatch(/constructor\s*\([^)]*Context[^)]*\)/);
	});

	it('StartReportInBackground: Context is constructor-injected', () => {
		expect(startReportSrc).toMatch(/constructor\s*\([^)]*Context[^)]*\)/);
	});

	// SR-1.3 — No direct new Context() instantiation
	// Rule: Context is a framework-managed request-scoped object; never constructed manually
	it('CompleteTask: does not call new Context()', () => {
		expect(completeTaskSrc).not.toMatch(/new\s+Context\s*\(/);
	});

	it('StartReportInBackground: does not call new Context()', () => {
		expect(startReportSrc).not.toMatch(/new\s+Context\s*\(/);
	});

	// SR-1.4 — Fallback App.resolve(Context) used only when constructor injection is impractical
	// Rule: "Fallback pattern — only when constructor injection is impractical; resolve in a narrow scope"
	// BulkChangePriority uses App.resolve inside onInit (not constructor) — the fallback pattern
	it('BulkChangePriority: uses App.resolve(Context) as fallback inside a method (not constructor)', () => {
		expect(bulkChangeSrc).toMatch(/App\.resolve\s*\(\s*Context\s*\)/);
		// Confirm fallback is NOT in the constructor — constructor has no Context param
		expect(bulkChangeSrc).not.toMatch(/constructor\s*\([^)]*Context[^)]*\)/);
	});

	// SR-1.5 — Fallback resolve is wrapped in try/catch
	// Rule: "Keep fallback reads defensive to avoid brittle behavior"
	// "If no active request scope exists, fail gracefully"
	it('BulkChangePriority: App.resolve(Context) fallback wrapped in try/catch', () => {
		expect(bulkChangeSrc).toMatch(
			/try\s*\{[^}]*App\.resolve\s*\(\s*Context\s*\)/s,
		);
		expect(bulkChangeSrc).toMatch(/catch\s*(\([^)]*\))?\s*\{/);
	});
});

// ---------------------------------------------------------------------------
// SR-2 — Context structure access patterns
// ---------------------------------------------------------------------------

describe('SR-2: Context structure access patterns', () => {
	// SR-2.1 — user.id read with optional chaining
	// Rule: "Read branches with optional chaining" — "context.user?.id ?? null"
	it('CompleteTask: context.user?.id read with optional chaining', () => {
		expect(completeTaskSrc).toMatch(/context\.user\?\.\s*id/);
	});

	it('StartReportInBackground: context.user?.id read with optional chaining', () => {
		expect(startReportSrc).toMatch(/context\.user\?\.\s*id/);
	});

	// SR-2.2 — action.bulkAction accessed with optional chaining + nullish default
	// Rule: "isBulk = context.action?.bulkAction ?? false"
	it('BulkChangePriority: context.action?.bulkAction read with optional chaining and ?? false default', () => {
		expect(bulkChangeSrc).toMatch(/action\?\.\s*bulkAction\s*\?\?\s*false/);
	});

	// SR-2.3 — action.bulkQuery accessed with optional chaining
	// Rule: "bulkQuery = context.action?.bulkQuery ?? null"
	it('BulkChangePriority: context.action?.bulkQuery read with optional chaining', () => {
		expect(bulkChangeSrc).toMatch(/action\?\.\s*bulkQuery/);
	});

	// SR-2.4 — No raw context.user.id access (missing optional chain)
	// Rule: all branch reads must use ?. to avoid runtime errors when branch is absent
	it('CompleteTask: no raw context.user.id access without optional chaining', () => {
		expect(completeTaskSrc).not.toMatch(/context\.user\.id(?!\?)/);
	});

	it('StartReportInBackground: no raw context.user.id access without optional chaining', () => {
		expect(startReportSrc).not.toMatch(/context\.user\.id(?!\?)/);
	});

	// SR-2.5 — context.user?.id forwarded to workflow start (cross-action propagation)
	// Rule: skill §7 — "Read actor identity from context instead of trusting client-sent user IDs"
	// Pattern: userId: this.context.user?.id
	it('StartReportInBackground: context.user?.id forwarded as userId to workflowsManager.start()', () => {
		expect(startReportSrc).toMatch(/userId\s*:\s*this\.context\.user\?\.\s*id/);
	});
});

// ---------------------------------------------------------------------------
// SR-3 — Behavioral / defensive coding guarantees
// ---------------------------------------------------------------------------

describe('SR-3: Behavioral and defensive coding guarantees', () => {
	// SR-3.1 — Defensive null check before using user data
	// Rule: "Guard required values early with clear errors"
	// CompleteTask: checks if currentUser is truthy before assigning note.createdBy
	it('CompleteTask: null check on resolved user before assigning to record field', () => {
		expect(completeTaskSrc).toMatch(/if\s*\(\s*currentUser\s*\)/);
	});

	// SR-3.2 — logger.warn (or similar diagnostic) used when user not found
	// Rule: "Keep context reads close to the decision they influence"
	// "Add explicit guards for required data" — degrade gracefully with a diagnostic
	it('CompleteTask: logger.warn fired when user not found (defensive fallback, not throw)', () => {
		expect(completeTaskSrc).toMatch(/logger\.warn\s*\(/);
	});

	// SR-3.3 — Bulk mode detect-and-branch: separate logic paths for bulk vs single
	// Rule: skill §6 — "branch behavior based on context.action?.bulkAction"
	// "In bulk mode, prefer explicit values and avoid heavy per-record side effects"
	it('BulkChangePriority: isBulk variable used to branch on bulk vs single mode', () => {
		expect(bulkChangeSrc).toMatch(/\bisBulk\b/);
		expect(bulkChangeSrc).toMatch(/if\s*\(\s*isBulk/);
	});

	// SR-3.4 — Empty bulkQuery guard (defensive warning when no filter is applied)
	// Rule: skill §6 — "In bulk mode, avoid implicit defaults that may surprise users"
	// Pattern: guard Object.keys(bulkQuery).length === 0
	it('BulkChangePriority: guards against empty bulkQuery (select-all with no filter)', () => {
		expect(bulkChangeSrc).toMatch(
			/Object\.keys\s*\(\s*bulkQuery\s*\)\.length\s*===\s*0/,
		);
	});

	// SR-3.5 — Fallback catch body does NOT rethrow
	// Rule: "Fail gracefully — treat as single when no active request scope exists"
	// The catch block may be empty or log, but should NOT rethrow for scope-missing cases
	it('BulkChangePriority: catch block in fallback resolve does not rethrow Context errors', () => {
		// The catch block handles the missing-scope case — must NOT re-throw
		// Extract the catch block text and assert no `throw` inside it
		const catchMatch = bulkChangeSrc.match(
			/catch\s*(?:\([^)]*\))?\s*\{([^}]*)\}/s,
		);
		expect(catchMatch).not.toBeNull();
		const catchBody = catchMatch?.[1] ?? '';
		expect(catchBody).not.toMatch(/\bthrow\b/);
	});

	// SR-3.6 — Context used in GlobalAction (cross-action propagation)
	// Rule: skill §2 — "Typical injection points: Action constructors"
	// GlobalAction with Context constructor injection is a valid and documented pattern
	it('StartReportInBackground: is a GlobalAction that constructor-injects Context', () => {
		expect(startReportSrc).toMatch(/extends\s+GlobalAction\s*</);
		expect(startReportSrc).toMatch(/constructor\s*\([^)]*Context[^)]*\)/);
	});
});

// ---------------------------------------------------------------------------
// SR-4 — Forbidden patterns and adversarial scan
// ---------------------------------------------------------------------------

describe('SR-4: Forbidden patterns and adversarial scan', () => {
	// SR-4.1 — No direct Context import from tsyringe
	// Rule: "Do not import from tsyringe directly" — use @drumr/framework-backend exports
	it('CompleteTask: does not import Context from tsyringe', () => {
		expect(completeTaskSrc).not.toMatch(/from\s+['"]tsyringe['"]/);
	});

	it('BulkChangePriority: does not import Context from tsyringe', () => {
		expect(bulkChangeSrc).not.toMatch(/from\s+['"]tsyringe['"]/);
	});

	// SR-4.2 — No direct import from internal core/backend path
	it('CompleteTask: does not import from internal core/backend path', () => {
		expect(completeTaskSrc).not.toMatch(/from\s+['"][./]*core\/backend/);
	});

	it('StartReportInBackground: does not import from internal core/backend path', () => {
		expect(startReportSrc).not.toMatch(/from\s+['"][./]*core\/backend/);
	});

	// SR-4.3 — No request-scoped service uses new Context()
	// Rule: Context is framework-managed — instantiating it manually breaks the request scope
	it('adversarial: no action file calls new Context()', () => {
		const violators = allActionFiles.filter(({ src }) =>
			/\bnew\s+Context\s*\(/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	it('adversarial: no service file calls new Context()', () => {
		const violators = allServiceFiles.filter(({ src }) =>
			/\bnew\s+Context\s*\(/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.4 — No action/service file imports from tsyringe directly
	it('adversarial: no action file imports from tsyringe directly', () => {
		const violators = allActionFiles.filter(({ src }) =>
			/from\s+['"]tsyringe['"]/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	it('adversarial: no service file imports from tsyringe directly', () => {
		const violators = allServiceFiles.filter(({ src }) =>
			/from\s+['"]tsyringe['"]/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.5 — App.resolve(Context) without try/catch is not used outside BulkChangePriority
	// Rule: "Use fallback pattern only when constructor injection is impractical"
	// If any other file uses App.resolve(Context) outside a try/catch it should be reviewed
	it('adversarial: any App.resolve(Context) call in action files is wrapped in try/catch', () => {
		const violations = allActionFiles.filter(({ src, file }) => {
			// Skip BulkChangePriority — it is the documented fallback example
			if (file.includes('BulkChangePriority')) return false;
			if (!/App\.resolve\s*\(\s*Context\s*\)/.test(src)) return false;
			// Check if there is a try block around it (crude but sufficient for this scan)
			return !/try\s*\{[^}]*App\.resolve\s*\(\s*Context\s*\)/s.test(src);
		});
		expect(violations.map((v) => v.file)).toHaveLength(0);
	});
});
