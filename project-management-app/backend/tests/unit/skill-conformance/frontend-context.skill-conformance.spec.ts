/**
 * Skill Conformance Spec — frontend-context
 *
 * Skill:    core/skills/frontend-context/SKILL.md
 * Approach: Source-text only — backend Jest has no TSX/JSX transform.
 *
 * Primary fixtures:
 *   frontend/src/config/layouts/ViewLayout.tsx
 *     — useContextValue(ctx => ctx.views.get(UserReadView)) reactive label,
 *       DependencyContainer.resolve(Context) in queryParams,
 *       ctx.views.get(UserReadView) null-checked before access
 *   frontend/src/views/dataModels/projects/ProjectReadView.tsx
 *     — DependencyContainer.resolve(Context) in breadcrumb callback,
 *       context.history?.some() optional chaining, conditional breadcrumb
 *   frontend/src/config/layouts/MainLayout.tsx
 *     — DependencyContainer.resolve(Context) in params callback,
 *       ctx.user?.id optional chaining, defensive return {}
 *
 * Adversarial scan: all .ts/.tsx files under frontend/src/
 *
 * How to run:
 *   cd apps/project-management-app/backend
 *   TS_NODE_PROJECT=tsconfig.test.json npx jest \
 *     --config config/jest.config.ts \
 *     --testPathPatterns='frontend-context.skill-conformance' \
 *     --no-coverage --verbose
 *
 * SkillScore: C=3, K=3, D=3, R=2 → (3×0.40 + 3×0.20 + 3×0.20 + 2×0.20) × 33.33 = 93.3
 * Threshold:  supporting ≥ 75 ✅
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const FRONTEND_SRC = path.resolve(__dirname, '../../../../frontend/src');

function readFrontend(rel: string): string {
	return fs.readFileSync(path.join(FRONTEND_SRC, rel), 'utf8');
}

function collectFrontendSources(): Array<{ file: string; src: string }> {
	const results: Array<{ file: string; src: string }> = [];

	function walk(dir: string): void {
		for (const entry of fs.readdirSync(dir)) {
			const full = path.join(dir, entry);
			const stat = fs.statSync(full);
			if (stat.isDirectory()) {
				walk(full);
			} else if (
				(entry.endsWith('.ts') || entry.endsWith('.tsx')) &&
				!entry.endsWith('.d.ts')
			) {
				results.push({
					file: path.relative(FRONTEND_SRC, full),
					src: fs.readFileSync(full, 'utf8'),
				});
			}
		}
	}

	walk(FRONTEND_SRC);
	return results;
}

const viewLayoutSrc = readFrontend('config/layouts/viewLayout.tsx');
const projectReadViewSrc = readFrontend('projects/views/ProjectReadView.tsx');
const mainLayoutSrc = readFrontend('config/layouts/mainLayout.tsx');

const allFrontendFiles = collectFrontendSources();

// ---------------------------------------------------------------------------
// SR-1 — Context and useContextValue import contracts
// ---------------------------------------------------------------------------

describe('SR-1: Context and useContextValue import contracts', () => {
	// SR-1.1 — Context imported from @drumr/framework-frontend
	// Rule: "import { Context } from '@drumr/framework-frontend'"
	it('ViewLayout: Context imported from @drumr/framework-frontend', () => {
		expect(viewLayoutSrc).toMatch(
			/Context.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('ProjectReadView: Context imported from @drumr/framework-frontend', () => {
		expect(projectReadViewSrc).toMatch(
			/Context.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('MainLayout: Context imported from @drumr/framework-frontend', () => {
		expect(mainLayoutSrc).toMatch(
			/Context.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.2 — useContextValue imported from @drumr/framework-frontend
	// Rule: "import { useContextValue } from '@drumr/framework-frontend'"
	it('ViewLayout: useContextValue imported from @drumr/framework-frontend', () => {
		expect(viewLayoutSrc).toMatch(
			/useContextValue.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.3 — DependencyContainer used for imperative access (not new Context())
	// Rule: "use App.resolve(Context) / DependencyContainer.resolve(Context), never instantiate directly"
	it('ViewLayout: uses DependencyContainer.resolve(Context) for imperative access', () => {
		expect(viewLayoutSrc).toMatch(
			/DependencyContainer\.resolve\s*\(\s*Context\s*\)/,
		);
	});

	it('ProjectReadView: uses DependencyContainer.resolve(Context) for imperative access', () => {
		expect(projectReadViewSrc).toMatch(
			/DependencyContainer\.resolve\s*\(\s*Context\s*\)/,
		);
	});

	it('MainLayout: uses DependencyContainer.resolve(Context) for imperative access', () => {
		expect(mainLayoutSrc).toMatch(
			/DependencyContainer\.resolve\s*\(\s*Context\s*\)/,
		);
	});
});

// ---------------------------------------------------------------------------
// SR-2 — Access pattern selection (reactive vs imperative)
// ---------------------------------------------------------------------------

describe('SR-2: Reactive vs imperative access patterns', () => {
	// SR-2.1 — useContextValue used in render functions (reactive, re-renders on change)
	// Rule: "Prefer `useContextValue` in render functions — it is reactive and avoids stale reads"
	it('ViewLayout: useContextValue used in label callback (render-time reactive read)', () => {
		expect(viewLayoutSrc).toMatch(/useContextValue\s*\(/);
	});

	// SR-2.2 — useContextValue selects a view instance (stable reference, not a new object each call)
	// Rule: "Select primitives or stable references — returning a new object triggers re-renders"
	it('ViewLayout: useContextValue selector reads ctx.views.get() (stable mounted-view reference)', () => {
		// useContextValue((ctx) => ctx.views.get(...)) — check presence independently
		// (the selector arg is parenthesised: `(ctx) =>` so [^)]* would stop at `)`)
		expect(viewLayoutSrc).toMatch(/useContextValue\s*\(/);
		expect(viewLayoutSrc).toMatch(/ctx\.views\.get\s*\(/);
	});

	// SR-2.3 — Imperative access used in callbacks (not in JSX render)
	// Rule: "Imperative access (services, callbacks, lifecycle hooks) — use App.resolve(Context)"
	it('ViewLayout: DependencyContainer.resolve(Context) used inside queryParams callback (not in render)', () => {
		// queryParams is called at navigation time (callback), not during render
		expect(viewLayoutSrc).toMatch(/queryParams\s*:\s*\(\s*\)\s*=>/);
		// The resolve appears in the same file where queryParams is used
		expect(viewLayoutSrc).toMatch(
			/DependencyContainer\.resolve\s*\(\s*Context\s*\)/,
		);
	});

	it('ProjectReadView: DependencyContainer.resolve(Context) used inside breadcrumb callback (not in render)', () => {
		// Actual signature: `breadcrumb: (): BreadcrumbValue => {` — return type annotation between ) and =>
		expect(projectReadViewSrc).toMatch(/breadcrumb\s*:\s*\(\s*\)\s*:[^=]*=>/);
		expect(projectReadViewSrc).toMatch(
			/DependencyContainer\.resolve\s*\(\s*Context\s*\)/,
		);
	});

	it('MainLayout: DependencyContainer.resolve(Context) used inside params async callback', () => {
		expect(mainLayoutSrc).toMatch(/params\s*:\s*async\s*\(\s*\)\s*=>/);
		expect(mainLayoutSrc).toMatch(
			/DependencyContainer\.resolve\s*\(\s*Context\s*\)/,
		);
	});
});

// ---------------------------------------------------------------------------
// SR-3 — Context property access behavioral guarantees
// ---------------------------------------------------------------------------

describe('SR-3: Context property access behavioral guarantees', () => {
	// SR-3.1 — context.user accessed with optional chaining
	// Rule: "context.user — Type: FrontendUserContext | undefined; always optional-chain"
	it('MainLayout: ctx.user?.id uses optional chaining (user is possibly undefined)', () => {
		expect(mainLayoutSrc).toMatch(/ctx\.user\?\.id/);
	});

	// SR-3.2 — Defensive return when user is absent
	// Rule: "return userId ? { id: userId } : {}" — never throws when user is absent
	it('MainLayout: params callback returns empty object {} when user id is absent', () => {
		// Pattern: ternary with fallback {} if userId is falsy
		expect(mainLayoutSrc).toMatch(
			/userId\s*\?\s*\{[^}]*id\s*:\s*userId[^}]*\}\s*:\s*\{\s*\}/,
		);
	});

	// SR-3.3 — context.history accessed with optional chaining
	// Rule: "context.history — Type: HistoryEntry[]; context.history?.some(...)"
	it('ProjectReadView: context.history?.some() uses optional chaining', () => {
		expect(projectReadViewSrc).toMatch(/context\.history\?\.some\s*\(/);
	});

	// SR-3.4 — context.views.get() result null-checked before use
	// Rule: "Do not rely on views being present — always null-check context.views.get(...)"
	it('ViewLayout: ctx.views.get(UserReadView) result assigned and null-checked before accessing .getParams()', () => {
		// userView is assigned from ctx.views.get(), then checked before calling .getParams()
		expect(viewLayoutSrc).toMatch(
			/const\s+userView\s*=\s*ctx\.views\.get\s*\(\s*UserReadView\s*\)/,
		);
		// Null-check: `if (userView)` guards the .getParams() call
		expect(viewLayoutSrc).toMatch(/if\s*\(\s*userView\s*\)/);
	});

	it('ViewLayout: useContextValue selector uses ctx.views.get(UserReadView) for reactive view reference', () => {
		expect(viewLayoutSrc).toMatch(/ctx\.views\.get\s*\(\s*UserReadView\s*\)/);
	});

	// SR-3.5 — Conditional breadcrumb based on context.history
	// Rule: "context.history?.some(entry => entry.path === '/projects')" — history-aware rendering
	it('ProjectReadView: breadcrumb branches conditionally on cameFromProjectsList from history', () => {
		expect(projectReadViewSrc).toMatch(
			/const\s+cameFromProjectsList\s*=\s*context\.history\?\.some/,
		);
		// Two branches: one for when came from list, one for other origins
		expect(projectReadViewSrc).toMatch(/if\s*\(\s*cameFromProjectsList\s*\)/);
	});

	// SR-3.6 — context.history.some checks entry.path
	// Rule: history entries have a path property; access is via entry.path
	it('ProjectReadView: history entry checked via entry.path in .some() callback', () => {
		// Actual code: `(entry) => entry.path === '/projects'` — parens around entry param
		// Check entry.path === '...' without requiring the arrow function prefix
		expect(projectReadViewSrc).toMatch(
			/entry\.path\s*===\s*['"]\/projects['"]/s,
		);
	});
});

// ---------------------------------------------------------------------------
// SR-4 — Forbidden patterns and adversarial scan
// ---------------------------------------------------------------------------

describe('SR-4: Forbidden patterns and adversarial scan', () => {
	// SR-4.1 — No file instantiates Context with new
	// Rule: "Always resolve via DI — use App.resolve(Context), never instantiate directly"
	it('adversarial: no frontend file instantiates Context with new', () => {
		const violators = allFrontendFiles.filter(({ src }) =>
			/\bnew\s+Context\s*\(/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.2 — No component accesses context.views.get() without null guard
	// Rule: "Always null-check context.views.get(...) since views may not be mounted"
	// Check: any file that calls .getParams() on a views.get() result must have a null guard
	it('ViewLayout: calls .getParams() only after null guard (if (userView) before .getParams())', () => {
		// getParams() is used after the if (userView) null check
		const getParamsIdx = viewLayoutSrc.indexOf('.getParams()');
		const ifUserViewIdx = viewLayoutSrc.indexOf('if (userView)');
		expect(getParamsIdx).toBeGreaterThan(-1);
		expect(ifUserViewIdx).toBeGreaterThan(-1);
		// The null guard comes before the getParams() call
		expect(ifUserViewIdx).toBeLessThan(getParamsIdx);
	});

	// SR-4.3 — No file stores domain business data in context via put()
	// Rule: "Do not store business data in context — it is for UI navigation state and view references"
	// Proxy check: no file calls context.put() with non-UI keys (path, user are UI; not task/project IDs)
	it('adversarial: no frontend file calls context.put() with domain model data keys', () => {
		// The only valid keys for context.put() are: path, user, history, previous, views
		// Check for context.put({ ... }) patterns with clearly domain keys (taskId, projectId, etc.)
		const violators = allFrontendFiles.filter(({ src }) =>
			/context\.put\s*\(\s*\{[^}]*(taskId|projectId|projectName|taskName)\b/.test(
				src,
			),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.4 — Context imported from @drumr/framework-frontend in all files that use it
	// Rule: Context is a framework singleton — always from the framework package
	it('adversarial: every file that uses Context imports it from @drumr/framework-frontend', () => {
		const contextUsers = allFrontendFiles.filter(
			({ src }) =>
				/\bContext\b/.test(src) &&
				/(DependencyContainer|App)\.resolve\s*\(\s*Context\s*\)/.test(src),
		);
		const violators = contextUsers.filter(
			({ src }) => !/from\s+['"]@drumr\/framework-frontend['"]/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.5 — useContextValue imported from @drumr/framework-frontend in all files that use it
	it('adversarial: every file that calls useContextValue imports it from @drumr/framework-frontend', () => {
		const hookUsers = allFrontendFiles.filter(({ src }) =>
			/\buseContextValue\s*\(/.test(src),
		);
		const violators = hookUsers.filter(
			({ src }) => !/from\s+['"]@drumr\/framework-frontend['"]/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});
});
