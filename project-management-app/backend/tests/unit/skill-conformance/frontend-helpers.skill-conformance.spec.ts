/**
 * Skill Conformance Spec — frontend-helpers
 *
 * Skill:    core/skills/frontend-helpers/SKILL.md
 * Approach: Source-text only — backend Jest has no TSX/JSX transform.
 *
 * Primary fixtures:
 *   frontend/src/components/formFooterHelpers.tsx
 *     — closeView from @drumr/framework-frontend, closeView({ cancelled: true }) pattern
 *   frontend/src/views/dataModels/tasks/TaskTableView.tsx
 *     — openView + toolbar from framework; toolbar.objectAction, toolbar.view
 *   frontend/src/views/dataModels/projects/ProjectTableView.tsx
 *     — toolbar from framework; toolbar.modelAction, toolbar.dropdown, toolbar.globalAction
 *   frontend/src/services/DashboardDataService.ts
 *     — dataFindBy from framework; .paginate() called on every list query
 *   frontend/src/services/GraphQLClientService.ts
 *     — getAuthStorageKeys from framework (auth helpers)
 *
 * Known deviation (it.todo):
 *   ProjectReadView.tsx defines a local isUiField() type guard instead of importing from framework
 *
 * Adversarial scan: all .ts/.tsx files under frontend/src/ for non-exported helpers
 *
 * How to run:
 *   cd apps/project-management-app/backend
 *   TS_NODE_PROJECT=tsconfig.test.json npx jest \
 *     --config config/jest.config.ts \
 *     --testPathPatterns='frontend-helpers.skill-conformance' \
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

const formFooterHelpersSrc = readFrontend(
	'shared/components/formFooterHelpers.tsx',
);
const taskTableViewSrc = readFrontend('tasks/views/TaskTableView.tsx');
const projectTableViewSrc = readFrontend('projects/views/ProjectTableView.tsx');
const dashboardDataServiceSrc = readFrontend(
	'dashboard/services/DashboardDataService.ts',
);
const gqlClientServiceSrc = readFrontend('shared/GraphQLClientService.ts');

const allFrontendFiles = collectFrontendSources();

// ---------------------------------------------------------------------------
// SR-1 — Helper import contracts (all from @drumr/framework-frontend)
// ---------------------------------------------------------------------------

describe('SR-1: Helper import contracts', () => {
	// SR-1.1 — closeView imported from @drumr/framework-frontend (not a manual route push)
	// Rule: "openView and closeView are the canonical navigation APIs"
	it('formFooterHelpers: closeView imported from @drumr/framework-frontend', () => {
		expect(formFooterHelpersSrc).toMatch(
			/closeView.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.2 — openView imported from @drumr/framework-frontend
	it('TaskTableView: openView imported from @drumr/framework-frontend', () => {
		expect(taskTableViewSrc).toMatch(
			/openView.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.3 — toolbar namespace imported from @drumr/framework-frontend
	// Rule: "Toolbar elements can be used in view headers, table header toolbars, row toolbars"
	it('TaskTableView: toolbar imported from @drumr/framework-frontend', () => {
		expect(taskTableViewSrc).toMatch(
			/toolbar.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('ProjectTableView: toolbar imported from @drumr/framework-frontend', () => {
		expect(projectTableViewSrc).toMatch(
			/toolbar.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.4 — dataFindBy imported from @drumr/framework-frontend
	// Rule: query-builder helpers from framework package
	it('DashboardDataService: dataFindBy imported from @drumr/framework-frontend', () => {
		expect(dashboardDataServiceSrc).toMatch(
			/dataFindBy.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.5 — getAuthStorageKeys imported from @drumr/framework-frontend (auth helper)
	// Rule: "Use auth helpers from @drumr/framework-frontend"
	it('GraphQLClientService: getAuthStorageKeys imported from @drumr/framework-frontend', () => {
		expect(gqlClientServiceSrc).toMatch(
			/getAuthStorageKeys.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});
});

// ---------------------------------------------------------------------------
// SR-2 — Toolbar DSL structural rules
// ---------------------------------------------------------------------------

describe('SR-2: Toolbar DSL structural rules', () => {
	// SR-2.1 — toolbar.objectAction used in row toolbar (valid DSL method)
	// Rule: "toolbar.objectAction — invoke backend actions per row"
	it('TaskTableView: rowToolbar uses toolbar.objectAction()', () => {
		expect(taskTableViewSrc).toMatch(/toolbar\.objectAction\s*[<(]/);
	});

	// SR-2.2 — toolbar.view used in row toolbar (valid DSL method)
	// Rule: "toolbar.view expects a view class, elementId, and label"
	it('TaskTableView: rowToolbar uses toolbar.view()', () => {
		expect(taskTableViewSrc).toMatch(/toolbar\.view\s*[<(]/);
	});

	// SR-2.3 — toolbar.modelAction valid in table toolbar
	// Rule: "toolbar.modelAction — model-level action from table header toolbar"
	it('ProjectTableView: tableToolbar uses toolbar.modelAction()', () => {
		expect(projectTableViewSrc).toMatch(/toolbar\.modelAction\s*\(/);
	});

	// SR-2.4 — toolbar.dropdown valid in table toolbar (groups actions)
	// Rule: "toolbar.dropdown — wraps a menu inside a dropdown in the toolbar"
	it('ProjectTableView: tableToolbar uses toolbar.dropdown()', () => {
		expect(projectTableViewSrc).toMatch(/toolbar\.dropdown\s*\(/);
	});

	// SR-2.5 — toolbar.globalAction valid in table toolbar
	// Rule: "toolbar.globalAction — invoke a global backend action from toolbar"
	it('ProjectTableView: tableToolbar uses toolbar.globalAction()', () => {
		expect(projectTableViewSrc).toMatch(/toolbar\.globalAction\s*\(/);
	});

	// SR-2.6 — toolbar.view has elementId and label properties
	// Rule: "toolbar.view expects a view class (or lazy factory), elementId, and label"
	it('TaskTableView: toolbar.view() call includes elementId and label properties', () => {
		expect(taskTableViewSrc).toMatch(/toolbar\.view\s*[<(][^)]*elementId/s);
		expect(taskTableViewSrc).toMatch(/toolbar\.view\s*[<(][^)]*label/s);
	});
});

// ---------------------------------------------------------------------------
// SR-3 — Navigation and query builder behavioral guarantees
// ---------------------------------------------------------------------------

describe('SR-3: Navigation and query builder behavioral guarantees', () => {
	// SR-3.1 — closeView called with returnData (cancelled) not raw void
	// Rule: "onClose only receives what the opened view returns via closeView(returnData)"
	it('formFooterHelpers: closeView called with { cancelled: true } return data object', () => {
		expect(formFooterHelpersSrc).toMatch(
			/closeView\s*\(\s*\{[^}]*cancelled\s*:\s*true[^}]*\}\s*\)/,
		);
	});

	// SR-3.2 — openView used instead of manual route push
	// Rule: "Use openView instead of manual route pushes to preserve framework navigation stack"
	it('TaskTableView: openView() called for navigation (not window.location or router.push)', () => {
		expect(taskTableViewSrc).toMatch(/openView\s*\(/);
		// Confirm no router.push or window.location.href assignment for navigation
		expect(taskTableViewSrc).not.toMatch(/window\.location\.href\s*=/);
		expect(taskTableViewSrc).not.toMatch(/router\.push\s*\(/);
	});

	// SR-3.3 — dataFindBy always calls .paginate(n)
	// Rule: "uiFindBy and dataFindBy are paginated — always call .paginate(n).
	//        Without it, a default page size applies and you silently receive only a subset"
	it('DashboardDataService: every dataFindBy() call chains .paginate(n)', () => {
		// Count dataFindBy calls vs .paginate() calls — they should balance
		const findByCount = (
			dashboardDataServiceSrc.match(/dataFindBy\s*[<(]/g) ?? []
		).length;
		const paginateCount = (
			dashboardDataServiceSrc.match(/\.paginate\s*\(/g) ?? []
		).length;
		expect(findByCount).toBeGreaterThan(0);
		expect(paginateCount).toEqual(findByCount);
	});

	// SR-3.4 — dataFindBy used in service (plain values for dashboard, not UI-wrapped)
	// Rule: "data* builders return plain values (suitable for services, dashboards)"
	it('DashboardDataService: uses dataFindBy (not uiFindBy) for plain dashboard data', () => {
		expect(dashboardDataServiceSrc).toMatch(/dataFindBy\s*[<(]/);
		// Confirm uiFindBy is NOT used in this data service (would wrap in {value, options, errors})
		expect(dashboardDataServiceSrc).not.toMatch(/\buiFindBy\s*[<(]/);
	});

	// SR-3.5 — getAuthStorageKeys used to read auth token key (not hardcoded string)
	// Rule: "Use auth helpers from @drumr/framework-frontend for authenticated requests"
	it('GraphQLClientService: getAuthStorageKeys() used to retrieve tokenKey (not hardcoded)', () => {
		expect(gqlClientServiceSrc).toMatch(/getAuthStorageKeys\s*\(\s*\)/);
		// tokenKey extracted via destructuring OR property access
		expect(gqlClientServiceSrc).toMatch(/\btokenKey\b/);
		// Confirm token key is NOT hardcoded as a string literal
		expect(gqlClientServiceSrc).not.toMatch(
			/localStorage\.getItem\s*\(\s*['"]token['"]\s*\)/,
		);
	});
});

// ---------------------------------------------------------------------------
// SR-4 — Forbidden patterns: non-exported helpers and adversarial scan
// ---------------------------------------------------------------------------

describe('SR-4: Forbidden patterns and adversarial scan', () => {
	// SR-4.1 — No file imports isReferenceObject (not exported from framework)
	// Rule: "isReferenceObject exists in source but is not exported from @drumr/framework-frontend"
	it('adversarial: no file imports isReferenceObject from @drumr/framework-frontend', () => {
		const violators = allFrontendFiles.filter(({ src }) =>
			/import\s*{[^}]*\bisReferenceObject\b/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.2 — No file imports uiRefresh (not exported from framework)
	// Rule: "uiRefresh exists in shared query-builder source but not exported"
	it('adversarial: no file imports uiRefresh from @drumr/framework-frontend', () => {
		const violators = allFrontendFiles.filter(({ src }) =>
			/import\s*{[^}]*\buiRefresh\b/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.3 — No file imports workflowCancel (not exported from framework)
	it('adversarial: no file imports workflowCancel from @drumr/framework-frontend', () => {
		const violators = allFrontendFiles.filter(({ src }) =>
			/import\s*{[^}]*\bworkflowCancel\b/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.4 — No file imports buildReferenceFindByDocument (not exported)
	it('adversarial: no file imports buildReferenceFindByDocument from @drumr/framework-frontend', () => {
		const violators = allFrontendFiles.filter(({ src }) =>
			/import\s*{[^}]*\bbuildReferenceFindByDocument\b/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.5 — No file imports isArrayField (not exported)
	it('adversarial: no file imports isArrayField from @drumr/framework-frontend', () => {
		const violators = allFrontendFiles.filter(({ src }) =>
			/import\s*{[^}]*\bisArrayField\b/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.6 — No file imports getApiBaseUrl (not exported)
	it('adversarial: no file imports getApiBaseUrl from @drumr/framework-frontend', () => {
		const violators = allFrontendFiles.filter(({ src }) =>
			/import\s*{[^}]*\bgetApiBaseUrl\b/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.7 — No file uses toolbar.group (invalid API name)
	// Rule: Anti-pattern — "Do not use toolbar.group... those names are invalid in current exports"
	it('adversarial: no file calls toolbar.group() (invalid toolbar API)', () => {
		const violators = allFrontendFiles.filter(({ src }) =>
			/toolbar\.group\s*\(/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.8 — No file uses menu.action (invalid API name)
	// Rule: Anti-pattern — "Do not use... menu.action; those names are invalid"
	it('adversarial: no file calls menu.action() (invalid menu API)', () => {
		const violators = allFrontendFiles.filter(({ src }) =>
			/menu\.action\s*\(/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.9 — Known deviation: ProjectReadView.tsx defines isUiField locally instead of importing from framework
	// Rule: "isUiField is exported from @drumr/framework-frontend" — local redefinition is an anti-pattern
	it.todo(
		'ProjectReadView: should import isUiField from @drumr/framework-frontend instead of defining a local type guard — pre-existing deviation',
	);
});
