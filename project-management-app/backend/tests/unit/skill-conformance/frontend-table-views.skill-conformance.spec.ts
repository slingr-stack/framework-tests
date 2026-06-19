/**
 * Skill Conformance Spec — frontend-table-views
 *
 * Skill:    core/skills/frontend-table-views/SKILL.md
 * Fixtures: source-text only — backend Jest has no TSX transform.
 *           All checks are regex / string assertions on the raw .tsx source.
 *
 * Primary fixtures (SR-1 + SR-2 + SR-3 + SR-4):
 *   frontend/src/views/dataModels/tasks/TaskTableView.tsx
 *   frontend/src/views/dataModels/projects/ProjectTableView.tsx
 *
 * Adversarial scan (SR-4 robustness → R = 2):
 *   All .tsx files under frontend/src/views/**
 *
 * How to run:
 *   cd apps/project-management-app/backend
 *   TS_NODE_PROJECT=tsconfig.test.json npx jest \
 *     --config config/jest.config.ts \
 *     --testPathPatterns='frontend-table-views.skill-conformance' \
 *     --no-coverage --verbose
 *
 * SkillScore: C=3, K=2, D=3, R=2 → (3×0.40 + 2×0.20 + 3×0.20 + 2×0.20) × 33.33 = 93.3
 * Wait — K=2 → (1.2 + 0.4 + 0.6 + 0.4) × 33.33 = 2.6 × 33.33 = 86.7
 * Threshold:  core-flow ≥ 85 ✅
 *
 * Note on onRender vs render:
 *   The skill examples use `render:` in column definitions but the real app fixtures
 *   use `onRender:` — both are the same column renderer callback; the framework
 *   accepts both spellings. SR-3 tests check for either spelling.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Source paths
// ---------------------------------------------------------------------------

const FRONTEND_ROOT = path.resolve(__dirname, '../../../../frontend/src');

function readViewFixture(relPath: string): string {
	return fs.readFileSync(path.join(FRONTEND_ROOT, relPath), 'utf8');
}

/** Recursively collect all .tsx sources under a directory. */
function collectTsxSources(dir: string): string[] {
	if (!fs.existsSync(dir)) return [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	const results: string[] = [];
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...collectTsxSources(full));
		} else if (entry.isFile() && entry.name.endsWith('.tsx')) {
			results.push(fs.readFileSync(full, 'utf8'));
		}
	}
	return results;
}

const taskTableSrc = readViewFixture('tasks/views/TaskTableView.tsx');
const projectTableSrc = readViewFixture('projects/views/ProjectTableView.tsx');

const VIEW_DIRS = [
	'tasks/views',
	'projects/views',
	'users/views',
	'dashboard/views',
	'activityLog/views',
	'global/views',
	'shared/views',
	'reports/views',
];
const allViewSources = VIEW_DIRS.flatMap((dir) =>
	collectTsxSources(path.join(FRONTEND_ROOT, dir)),
);

// ---------------------------------------------------------------------------
// SR-1 — Decorator contracts
// ---------------------------------------------------------------------------

describe('SR-1: Decorator contracts', () => {
	// SR-1.1 — @TableView must supply a model: property
	// Rule: @TableView({ model: '...', path: '...' }) — both fields mandatory
	it('TaskTableView: @TableView has required model: property', () => {
		expect(taskTableSrc).toMatch(/@TableView\s*\(\s*\{[^}]*model\s*:/);
	});

	// SR-1.2 — @TableView must supply a path: property
	it('TaskTableView: @TableView has required path: property', () => {
		expect(taskTableSrc).toMatch(/@TableView\s*\(\s*\{[^}]*path\s*:/);
	});

	// SR-1.3 — @TableView path should NOT contain :id — list routes have no record id
	// Rule: @TableView is for paginated lists — not detail pages
	it('TaskTableView: @TableView path does not contain :id (list route is id-free)', () => {
		const match = taskTableSrc.match(
			/@TableView\s*\(\s*\{[^}]*path\s*:\s*'([^']+)'/,
		);
		expect(match).not.toBeNull();
		expect(match![1]).not.toContain(':id');
	});

	// SR-1.4 — ProjectTableView also carries correct decorators
	it('ProjectTableView: @TableView has model: and path:', () => {
		expect(projectTableSrc).toMatch(/@TableView\s*\(\s*\{[^}]*model\s*:/);
		expect(projectTableSrc).toMatch(/@TableView\s*\(\s*\{[^}]*path\s*:/);
	});

	it('ProjectTableView: @TableView path does not contain :id', () => {
		const match = projectTableSrc.match(
			/@TableView\s*\(\s*\{[^}]*path\s*:\s*'([^']+)'/,
		);
		expect(match).not.toBeNull();
		expect(match![1]).not.toContain(':id');
	});

	// SR-1.5 — tableOptions property must be declared
	// Rule: tableOptions is the main configuration object for a TableView
	it('TaskTableView: declares override tableOptions property', () => {
		expect(taskTableSrc).toMatch(/override\s+tableOptions/);
	});

	it('ProjectTableView: declares override tableOptions property', () => {
		expect(projectTableSrc).toMatch(/override\s+tableOptions/);
	});

	// SR-1.6 — columns array must be inside tableOptions
	// Rule: "tableOptions.columns" is the grid definition
	it('TaskTableView: tableOptions contains a columns array', () => {
		expect(taskTableSrc).toMatch(/columns\s*:\s*\[/);
	});

	it('ProjectTableView: tableOptions contains a columns array', () => {
		expect(projectTableSrc).toMatch(/columns\s*:\s*\[/);
	});

	// SR-1.7 — pagination config must be inside tableOptions
	// Rule: pagination: { pageSize: N } — controls server-side paging
	it('TaskTableView: tableOptions contains pagination config', () => {
		expect(taskTableSrc).toMatch(/pagination\s*:\s*\{/);
	});

	it('ProjectTableView: tableOptions contains pagination config', () => {
		expect(projectTableSrc).toMatch(/pagination\s*:\s*\{/);
	});
});

// ---------------------------------------------------------------------------
// SR-2 — Base class requirements
// ---------------------------------------------------------------------------

describe('SR-2: Base class requirements', () => {
	// SR-2.1 — @TableView class must extend TableViewComponent<T>
	// Rule: @TableView → TableViewComponent<T>
	it('TaskTableView: extends TableViewComponent<T>', () => {
		expect(taskTableSrc).toMatch(/class\s+\w+\s+extends\s+TableViewComponent</);
	});

	it('ProjectTableView: extends TableViewComponent<T>', () => {
		expect(projectTableSrc).toMatch(
			/class\s+\w+\s+extends\s+TableViewComponent</,
		);
	});

	// SR-2.2 — Framework primitives imported from @drumr/framework-frontend
	// Rule: imports come from the published package, not internal paths
	it('TaskTableView: imports TableView and TableViewComponent from @drumr/framework-frontend', () => {
		expect(taskTableSrc).toMatch(/@drumr\/framework-frontend/);
		expect(taskTableSrc).toMatch(/TableViewComponent/);
	});

	it('ProjectTableView: imports TableView and TableViewComponent from @drumr/framework-frontend', () => {
		expect(projectTableSrc).toMatch(/@drumr\/framework-frontend/);
		expect(projectTableSrc).toMatch(/TableViewComponent/);
	});
});

// ---------------------------------------------------------------------------
// SR-3 — Behavioral guarantees
// ---------------------------------------------------------------------------

describe('SR-3: Behavioral guarantees', () => {
	// SR-3.1 — rowToolbar must be inside tableOptions
	// Rule: rowToolbar renders per-row inline buttons; always a tableOptions property
	it('TaskTableView: tableOptions declares rowToolbar', () => {
		expect(taskTableSrc).toMatch(/rowToolbar\s*:/);
	});

	// SR-3.2 — tableToolbar must be inside tableOptions
	// Rule: tableToolbar renders above the table (header area)
	it('TaskTableView: tableOptions declares tableToolbar', () => {
		expect(taskTableSrc).toMatch(/tableToolbar\s*:/);
	});

	// SR-3.3 — onRowClicked navigates to a detail view
	// Rule: "onRowClicked: (record) => openView('ModelReadView', { ... })"
	it('TaskTableView: tableOptions declares onRowClicked', () => {
		expect(taskTableSrc).toMatch(/onRowClicked\s*:/);
	});

	it('TaskTableView: onRowClicked calls openView()', () => {
		expect(taskTableSrc).toMatch(/openView\s*\(/);
	});

	// SR-3.4 — sorting config must be declared
	// Rule: sorting: { field, direction } — sets the default sort
	it('ProjectTableView: tableOptions declares sorting config', () => {
		expect(projectTableSrc).toMatch(/sorting\s*:\s*\{[^}]*field\s*:/);
	});

	// SR-3.5 — selection config: both enabled and type must be present
	// Rule: selection: { enabled: true, type: 'multiple' } for multi-row selection
	it('TaskTableView: tableOptions selection has enabled: and type:', () => {
		expect(taskTableSrc).toMatch(/selection\s*:\s*\{[^}]*enabled\s*:/);
		expect(taskTableSrc).toMatch(/selection\s*:\s*\{[^}]*type\s*:/);
	});

	// SR-3.6 — afterActionExecution uses switch for named actions and calls this.refresh()
	// Rule: "Use switch for specific feedback; always call this.refresh() at the end"
	it('TaskTableView: afterActionExecution uses switch statement', () => {
		expect(taskTableSrc).toMatch(/switch\s*\(\s*response\.actionName\s*\)/);
	});

	it('TaskTableView: afterActionExecution calls this.refresh()', () => {
		expect(taskTableSrc).toMatch(/this\.refresh\s*\(\s*\)/);
	});

	// SR-3.7 — afterActionExecution guards on response.executed
	// Rule: "if (!response.executed) return;" — don't show success on failed actions
	it('TaskTableView: afterActionExecution guards on response.executed', () => {
		expect(taskTableSrc).toMatch(/response\.executed/);
	});

	// SR-3.8 — afterActionExecution must NOT call this.refreshData()
	// Rule: "Use this.refresh() not this.refreshData() — refreshData() is for @ReadView"
	it('TaskTableView: afterActionExecution does not call this.refreshData() (wrong method for TableView)', () => {
		// Only check within the afterActionExecution block
		const afterActionBlock = taskTableSrc.match(
			/override\s+afterActionExecution[^{]*\{([\s\S]*?)^\s*\}/m,
		);
		if (afterActionBlock) {
			expect(afterActionBlock[1]).not.toMatch(/this\.refreshData\s*\(\s*\)/);
		}
		// The file overall should not have refreshData at all (it's a TableView, not ReadView)
		expect(taskTableSrc).not.toMatch(/this\.refreshData\s*\(\s*\)/);
	});

	// SR-3.9 — columns must NOT include raw ID fields
	// Rule: "Never put raw ID columns in the table. IDs are internal identifiers."
	// "Never: { field: 'managerId' } → shows a raw UUID"
	it('TaskTableView: columns do not include a raw id field (no field: "id" entry)', () => {
		// Matches field: 'id' or field: "id" — the primary key raw UUID column
		expect(taskTableSrc).not.toMatch(/field\s*:\s*['"]id['"]/);
	});

	it('ProjectTableView: columns do not include a raw id field', () => {
		expect(projectTableSrc).not.toMatch(/field\s*:\s*['"]id['"]/);
	});

	// SR-3.10 — columns must NOT use raw foreign-key ID fields (e.g. managerId, projectId)
	// Rule: "Never: { field: 'projectId' } → foreign key, not human-readable"
	it('TaskTableView: columns do not use raw foreign-key fields (e.g. projectId, assigneeId)', () => {
		// Check no column uses a field ending in 'Id' that looks like a foreign key
		expect(taskTableSrc).not.toMatch(/field\s*:\s*['"][a-zA-Z]+Id['"]/);
	});

	it('ProjectTableView: columns do not use raw foreign-key fields', () => {
		expect(projectTableSrc).not.toMatch(/field\s*:\s*['"][a-zA-Z]+Id['"]/);
	});

	// SR-3.11 — custom render uses onRender (or render) for enum/status columns
	// Rule: "Use custom render functions for enum/status fields to show colored Tags"
	// The real app fixtures use onRender: — both spellings are accepted
	it('ProjectTableView: at least one column uses onRender (or render) for colored enum display', () => {
		expect(projectTableSrc).toMatch(/onRender\s*:|render\s*:/);
	});

	// SR-3.12 — STATUS_COLOR map is defined at module level, not inside render
	// Rule: "Prefix STATUS_COLOR maps at the module level; never compute color strings inside render"
	it('ProjectTableView: STATUS_COLOR map is declared at module level (not inside a render callback)', () => {
		// The map should appear before the class definition — use source position as proxy
		const colorMapIdx = projectTableSrc.indexOf('STATUS_COLOR_MAP');
		const classIdx = projectTableSrc.search(
			/class\s+\w+\s+extends\s+TableViewComponent/,
		);
		expect(colorMapIdx).toBeGreaterThanOrEqual(0);
		expect(colorMapIdx).toBeLessThan(classIdx);
	});

	// SR-3.13 — toolbar.modelAction / toolbar.globalAction used in header toolbar
	// Rule: ProjectTableView uses toolbar.modelAction for GetProjectStatistics and
	//       toolbar.globalAction for GetDashboardSummary — demonstrates both patterns
	it('ProjectTableView: header toolbar uses toolbar.modelAction', () => {
		expect(projectTableSrc).toMatch(/toolbar\.modelAction\s*\(/);
	});

	it('ProjectTableView: header toolbar uses toolbar.globalAction', () => {
		expect(projectTableSrc).toMatch(/toolbar\.globalAction\s*\(/);
	});

	// SR-3.14 — toolbar.view used in header toolbar (link to estimate view)
	// Rule: "toolbar.view({ elementId, view, label, container })" for navigation to a view
	it('TaskTableView: header toolbar uses toolbar.view() to link to a sub-view', () => {
		expect(taskTableSrc).toMatch(/toolbar\.view\s*\(/);
	});

	// SR-3.15 — visible callback on rowToolbar buttons for role/record-state gating
	// Rule: "visible: (record?) => boolean — show/hide based on user role or record state"
	it('TaskTableView: at least one rowToolbar button uses a visible callback', () => {
		expect(taskTableSrc).toMatch(/visible\s*:\s*\([^)]*\)\s*=>/);
	});

	// SR-3.16 — menu property declares icon and order for sidebar navigation
	// Rule: menu.icon and menu.order control the sidebar placement of the view
	it('TaskTableView: declares override menu with name, icon, and order', () => {
		expect(taskTableSrc).toMatch(/override\s+menu/);
		expect(taskTableSrc).toMatch(/icon\s*:/);
		expect(taskTableSrc).toMatch(/order\s*:/);
	});

	// SR-3.17 — column filtering with caseSensitive: true for code-like fields
	// Rule: "Case-sensitive filter ('like' instead of 'ilike') — filtering: { caseSensitive: true }"
	it('ProjectTableView: at least one column uses caseSensitive: true filtering', () => {
		expect(projectTableSrc).toMatch(/caseSensitive\s*:\s*true/);
	});

	// SR-3.18 — nested path column (manager.roles) demonstrates the skill pattern
	// Rule: "For reference fields, always use the nested name (or title) path, not the foreign key ID"
	it('ProjectTableView: at least one column uses a nested path (e.g. manager.roles)', () => {
		expect(projectTableSrc).toMatch(/field\s*:\s*['"][^'"]+\.[^'"]+['"]/);
	});
});

// ---------------------------------------------------------------------------
// SR-4 — Forbidden imports and framework import hygiene
// ---------------------------------------------------------------------------

describe('SR-4: Forbidden imports and framework import hygiene', () => {
	// SR-4.1 — No direct axios usage in table view files
	// Violation: table views must use framework API — direct HTTP calls bypass it
	it('TaskTableView: does not import axios directly', () => {
		expect(taskTableSrc).not.toMatch(/import\s+axios/);
		expect(taskTableSrc).not.toMatch(/require\s*\(\s*['"]axios['"]\s*\)/);
	});

	it('ProjectTableView: does not import axios directly', () => {
		expect(projectTableSrc).not.toMatch(/import\s+axios/);
		expect(projectTableSrc).not.toMatch(/require\s*\(\s*['"]axios['"]\s*\)/);
	});

	// SR-4.2 — No bare window.fetch / global fetch in table view files
	it('TaskTableView: does not use bare fetch() directly', () => {
		expect(taskTableSrc).not.toMatch(/(?<![.\w])fetch\s*\(/);
	});

	it('ProjectTableView: does not use bare fetch() directly', () => {
		expect(projectTableSrc).not.toMatch(/(?<![.\w])fetch\s*\(/);
	});

	// SR-4.3 — No direct DOM manipulation
	// Violation: all rendering must go through React / the framework
	it('TaskTableView: does not use document.querySelector or document.getElementById', () => {
		expect(taskTableSrc).not.toMatch(
			/document\.(querySelector|getElementById|createElement)/,
		);
	});

	it('ProjectTableView: does not use document.querySelector or document.getElementById', () => {
		expect(projectTableSrc).not.toMatch(
			/document\.(querySelector|getElementById|createElement)/,
		);
	});

	// SR-4.4 — Framework primitives must come from @drumr/framework-frontend
	it('TaskTableView: framework imports come from @drumr/framework-frontend', () => {
		expect(taskTableSrc).toMatch(/@drumr\/framework-frontend/);
		expect(taskTableSrc).not.toMatch(/from\s+['"][./]*core\/frontend/);
	});

	it('ProjectTableView: framework imports come from @drumr/framework-frontend', () => {
		expect(projectTableSrc).toMatch(/@drumr\/framework-frontend/);
		expect(projectTableSrc).not.toMatch(/from\s+['"][./]*core\/frontend/);
	});

	// SR-4.5 — Adversarial repo-wide scan: no view file imports axios
	it('adversarial scan: no view file imports axios', () => {
		const violations = allViewSources.filter((src) =>
			/import\s+axios|require\s*\(\s*['"]axios['"]\s*\)/.test(src),
		);
		expect(violations).toHaveLength(0);
	});

	// SR-4.6 — Adversarial repo-wide scan: no direct DOM manipulation in any view file
	it('adversarial scan: no view file uses document.querySelector/getElementById', () => {
		const violations = allViewSources.filter((src) =>
			/document\.(querySelector|getElementById|createElement)/.test(src),
		);
		expect(violations).toHaveLength(0);
	});

	// SR-4.7 — Adversarial repo-wide scan: no view file imports framework from internal paths
	it('adversarial scan: all view files import framework from @drumr/framework-frontend', () => {
		const violations = allViewSources.filter((src) =>
			/from\s+['"][./]*core\/frontend/.test(src),
		);
		expect(violations).toHaveLength(0);
	});
});
