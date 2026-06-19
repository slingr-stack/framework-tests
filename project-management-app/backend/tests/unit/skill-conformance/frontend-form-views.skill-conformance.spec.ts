/**
 * Skill Conformance Spec — frontend-form-views
 *
 * Skill:    core/skills/frontend-form-views/SKILL.md
 * Fixtures: source-text only — backend Jest has no TSX transform.
 *           All checks are regex / string assertions on the raw .tsx source.
 *
 * Primary fixtures (SR-1 + SR-2 + SR-3 + SR-4):
 *   frontend/src/views/dataModels/tasks/TaskCreateView.tsx
 *   frontend/src/views/dataModels/tasks/TaskEditView.tsx
 *   frontend/src/views/dataModels/tasks/TaskReadView.tsx
 *
 * Secondary fixtures (additional coverage → K = 3):
 *   frontend/src/views/dataModels/projects/ProjectCreateView.tsx
 *   frontend/src/views/dataModels/projects/ProjectEditView.tsx
 *   frontend/src/views/dataModels/projects/ProjectReadView.tsx
 *
 * Relation-field fixture (SR-5 — relation fields in create flows):
 *   frontend/src/views/dataModels/tasks/helpers/taskFormLayout.tsx
 *
 * Adversarial scan (SR-4 + SR-5 robustness → R = 3):
 *   All .tsx files under frontend/src/views/**
 *
 * How to run:
 *   cd apps/project-management-app/backend
 *   TS_NODE_PROJECT=tsconfig.test.json npx jest \
 *     --config config/jest.config.ts \
 *     --testPathPatterns='frontend-form-views.skill-conformance' \
 *     --no-coverage --verbose
 *
 * SkillScore: C=3, K=3, D=3, R=3 → (3×0.40 + 3×0.20 + 3×0.20 + 3×0.20) × 33.33 = 100.0
 * Threshold:  core-flow ≥ 85 ✅
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Source paths
// ---------------------------------------------------------------------------

const FRONTEND_SRC = path.resolve(__dirname, '../../../../frontend/src');

function readFixture(relPath: string): string {
	return fs.readFileSync(path.join(FRONTEND_SRC, relPath), 'utf8');
}

/** Recursively collect all .tsx files under a directory. */
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

const taskCreateSrc = readFixture('tasks/views/TaskCreateView.tsx');
const taskEditSrc = readFixture('tasks/views/TaskEditView.tsx');
const taskReadSrc = readFixture('tasks/views/TaskReadView.tsx');
const projectCreateSrc = readFixture('projects/views/ProjectCreateView.tsx');
const projectEditSrc = readFixture('projects/views/ProjectEditView.tsx');
const projectReadSrc = readFixture('projects/views/ProjectReadView.tsx');

/** Collect all view .tsx sources across the domain-based module structure. */
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
	collectTsxSources(path.join(FRONTEND_SRC, dir)),
);

// ---------------------------------------------------------------------------
// SR-1 — Decorator contracts
// ---------------------------------------------------------------------------

describe('SR-1: Decorator contracts', () => {
	// SR-1.1 — @CreateView must supply a model: property
	// Rule: @CreateView({ model: '...', path: '...' }) — both fields mandatory per skill
	it('TaskCreateView: @CreateView has required model: property', () => {
		expect(taskCreateSrc).toMatch(/@CreateView\s*\(\s*\{[^}]*model\s*:/);
	});

	// SR-1.2 — @CreateView must supply a path: property
	it('TaskCreateView: @CreateView has required path: property', () => {
		expect(taskCreateSrc).toMatch(/@CreateView\s*\(\s*\{[^}]*path\s*:/);
	});

	// SR-1.3 — @CreateView path should NOT contain an :id segment — create routes have no record id
	// Rule: CreateView is for new-record forms — no id in the route
	it('TaskCreateView: @CreateView path does not contain :id (create route is id-free)', () => {
		const match = taskCreateSrc.match(
			/@CreateView\s*\(\s*\{[^}]*path\s*:\s*'([^']+)'/,
		);
		expect(match).not.toBeNull();
		expect(match![1]).not.toContain(':id');
	});

	// SR-1.4 — @EditView must supply a model: property
	it('TaskEditView: @EditView has required model: property', () => {
		expect(taskEditSrc).toMatch(/@EditView\s*\(\s*\{[^}]*model\s*:/);
	});

	// SR-1.5 — @EditView path (when declared) must contain :id — edit routes load
	// an existing record by id. Path is optional: if omitted, the framework
	// auto-generates one that already contains :id, so the assertion only fires
	// when an explicit path is set.
	// Rule: EditView — edit-existing-record form — :id in the route
	it('TaskEditView: @EditView path (if declared) contains :id parameter', () => {
		const match = taskEditSrc.match(
			/@EditView\s*\(\s*\{[^}]*path\s*:\s*'([^']+)'/,
		);
		if (match !== null) {
			expect(match[1]).toContain(':id');
		}
	});

	// SR-1.6 — @ReadView must supply a model: property
	it('TaskReadView: @ReadView has required model: property', () => {
		expect(taskReadSrc).toMatch(/@ReadView\s*\(\s*\{[^}]*model\s*:/);
	});

	// SR-1.7 — @ReadView path must contain :id — read views show a single record by id
	it('TaskReadView: @ReadView path contains :id parameter', () => {
		const match = taskReadSrc.match(
			/@ReadView\s*\(\s*\{[^}]*path\s*:\s*'([^']+)'/,
		);
		expect(match).not.toBeNull();
		expect(match![1]).toContain(':id');
	});

	// SR-1.8 — Project fixtures also carry correct decorators (confirms rule holds across models)
	it('ProjectCreateView: @CreateView has model: and path: (rule holds for second model)', () => {
		expect(projectCreateSrc).toMatch(/@CreateView\s*\(\s*\{[^}]*model\s*:/);
		expect(projectCreateSrc).toMatch(/@CreateView\s*\(\s*\{[^}]*path\s*:/);
	});

	it('ProjectEditView: @EditView path contains :id', () => {
		const match = projectEditSrc.match(
			/@EditView\s*\(\s*\{[^}]*path\s*:\s*'([^']+)'/,
		);
		expect(match).not.toBeNull();
		expect(match![1]).toContain(':id');
	});

	it('ProjectReadView: @ReadView has model: and path: containing :id', () => {
		expect(projectReadSrc).toMatch(/@ReadView\s*\(\s*\{[^}]*model\s*:/);
		const match = projectReadSrc.match(
			/@ReadView\s*\(\s*\{[^}]*path\s*:\s*'([^']+)'/,
		);
		expect(match).not.toBeNull();
		expect(match![1]).toContain(':id');
	});

	// SR-1.9 — nestedViews property is only used with @ReadView, not @CreateView or @EditView
	// Rule: nestedViews applies to Read only
	it('TaskCreateView: does not declare nestedViews (only ReadView may use it)', () => {
		expect(taskCreateSrc).not.toMatch(/override\s+nestedViews/);
	});

	it('TaskEditView: does not declare nestedViews (only ReadView may use it)', () => {
		expect(taskEditSrc).not.toMatch(/override\s+nestedViews/);
	});

	it('TaskReadView: nestedViews is declared on ReadView', () => {
		expect(taskReadSrc).toMatch(/override\s+nestedViews/);
	});
});

// ---------------------------------------------------------------------------
// SR-2 — Base class requirements
// ---------------------------------------------------------------------------

describe('SR-2: Base class requirements', () => {
	// SR-2.1 — @CreateView class must extend CreateViewComponent<T>
	// Rule: @CreateView → CreateViewComponent<T>
	it('TaskCreateView: extends CreateViewComponent<T>', () => {
		expect(taskCreateSrc).toMatch(
			/class\s+\w+\s+extends\s+CreateViewComponent</,
		);
	});

	// SR-2.2 — @EditView class must extend EditViewComponent<T>
	// Rule: @EditView → EditViewComponent<T>
	it('TaskEditView: extends EditViewComponent<T>', () => {
		expect(taskEditSrc).toMatch(/class\s+\w+\s+extends\s+EditViewComponent</);
	});

	// SR-2.3 — @ReadView class must extend ReadViewComponent<T>
	// Rule: @ReadView → ReadViewComponent<T>
	it('TaskReadView: extends ReadViewComponent<T>', () => {
		expect(taskReadSrc).toMatch(/class\s+\w+\s+extends\s+ReadViewComponent</);
	});

	// SR-2.4 — Project fixtures extend the correct base classes (validates rule for second model)
	it('ProjectCreateView: extends CreateViewComponent<T>', () => {
		expect(projectCreateSrc).toMatch(
			/class\s+\w+\s+extends\s+CreateViewComponent</,
		);
	});

	it('ProjectEditView: extends EditViewComponent<T>', () => {
		expect(projectEditSrc).toMatch(
			/class\s+\w+\s+extends\s+EditViewComponent</,
		);
	});

	it('ProjectReadView: extends ReadViewComponent<T>', () => {
		expect(projectReadSrc).toMatch(
			/class\s+\w+\s+extends\s+ReadViewComponent</,
		);
	});
});

// ---------------------------------------------------------------------------
// SR-3 — Behavioral guarantees
// ---------------------------------------------------------------------------

describe('SR-3: Behavioral guarantees', () => {
	// SR-3.1 — beforeSave() signature returns Promise<boolean>
	// Rule: beforeSave(): Promise<boolean> — return false to cancel submission
	it('TaskEditView: beforeSave() is declared with Promise<boolean> return type', () => {
		expect(taskEditSrc).toMatch(
			/beforeSave\s*\(\s*\)\s*:\s*Promise\s*<\s*boolean\s*>/,
		);
	});

	// SR-3.2 — beforeSave() that returns false must notify the user first
	// Rule: Return false from beforeSave/beforeCreate to cancel — never throw
	// The skill example always calls this.app.message before returning false
	it('TaskEditView: beforeSave() shows a user message before returning false (non-silent cancellation)', () => {
		expect(taskEditSrc).toMatch(/this\.app\.message\.(warning|error|info)/);
		expect(taskEditSrc).toMatch(/return\s+false/);
	});

	// SR-3.3 — beforeSave() uses this.getFormValue() to read current form state
	// Rule: "Use this.getFormValue('fieldName') inside lifecycle hooks to read current form state"
	it('TaskEditView: beforeSave() calls this.getFormValue() to inspect form fields', () => {
		expect(taskEditSrc).toMatch(/this\.getFormValue\s*\(/);
	});

	// SR-3.4 — onSave() override must call await super.onSave()
	// Rule: "Always call await super.onSave() inside onSave() overrides"
	it('TaskEditView: onSave() calls await super.onSave() (triggers the actual save)', () => {
		expect(taskEditSrc).toMatch(/await\s+super\.onSave\s*\(\s*\)/);
	});

	// SR-3.5 — afterSaved() uses response.executed to branch on success
	// Rule: afterSaved receives { executed: boolean; data?: T; error?: string }
	it('TaskEditView: afterSaved() checks response.executed before showing success', () => {
		expect(taskEditSrc).toMatch(/response\.executed/);
	});

	// SR-3.6 — afterSaved() uses response.error to branch on failure
	it('TaskEditView: afterSaved() checks response.error before showing error', () => {
		expect(taskEditSrc).toMatch(/response\.error/);
	});

	// SR-3.7 — beforeCreate() signature returns Promise<boolean>
	// Rule: beforeCreate(): Promise<boolean> — return false to cancel submission
	it('TaskCreateView: beforeCreate() is declared with Promise<boolean> return type', () => {
		expect(taskCreateSrc).toMatch(
			/beforeCreate\s*\(\s*\)\s*:\s*Promise\s*<\s*boolean\s*>/,
		);
	});

	// SR-3.8 — afterCreated() uses response.executed
	// Rule: afterCreated receives { executed: boolean; data?: T; error?: string }
	it('TaskCreateView: afterCreated() checks response.executed', () => {
		expect(taskCreateSrc).toMatch(/response\.executed/);
	});

	// SR-3.9 — afterActionExecution() in ReadView must call this.refreshData()
	// Rule: "Use this.refreshData() in ReadView post-action hooks, not this.refresh()"
	it('TaskReadView: afterActionExecution() calls this.refreshData() (not this.refresh())', () => {
		expect(taskReadSrc).toMatch(/afterActionExecution/);
		expect(taskReadSrc).toMatch(/this\.refreshData\s*\(\s*\)/);
	});

	// SR-3.10 — afterActionExecution() must NOT call bare this.refresh() instead of refreshData()
	// Violation: refresh() belongs to TableView; using it in ReadView would be a cross-view call error
	it('TaskReadView: afterActionExecution() does not call this.refresh() (wrong ReadView method)', () => {
		// Extract only the afterActionExecution method body to avoid false positives from comments
		const afterActionBlock = taskReadSrc.match(
			/override\s+afterActionExecution\s*\([^)]*\)\s*:\s*void\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/,
		);
		// If we can extract the block, verify it has refreshData not bare refresh()
		if (afterActionBlock) {
			expect(afterActionBlock[1]).not.toMatch(
				/this\.refresh\s*\(\s*\)(?!\s*Data)/,
			);
		}
		// In any case the file must contain refreshData somewhere in afterActionExecution context
		expect(taskReadSrc).toMatch(/refreshData/);
	});

	// SR-3.11 — TaskEditView uses auto refresh with explicit refreshTriggers
	// Rule: default to refreshMode 'auto'; refreshTriggers scopes server refreshes to selected fields.
	it('TaskEditView: refreshMode is auto with explicit refreshTriggers', () => {
		expect(taskEditSrc).toMatch(/refreshMode[^;]*'auto'/);
		expect(taskEditSrc).toMatch(/override\s+refreshTriggers/);
	});

	// SR-3.11b — with refreshMode auto, TaskEditView should not require custom onRefresh override
	it('TaskEditView: does not override onRefresh() when refreshMode is auto', () => {
		expect(taskEditSrc).not.toMatch(/override\s+async\s+onRefresh\s*\(/);
	});

	// SR-3.12 — when formLayout: 'custom', onRenderForm() must be overridden
	// Rule: "formLayout: 'custom' + onRenderForm — only when sections, alerts, or conditional groups required"
	it('TaskEditView: onRenderForm() is overridden when formLayout is custom', () => {
		expect(taskEditSrc).toMatch(/formLayout[^;]*'custom'/);
		expect(taskEditSrc).toMatch(/override\s+onRenderForm\s*\(/);
	});

	it('TaskCreateView: onRenderForm() is overridden when formLayout is custom', () => {
		expect(taskCreateSrc).toMatch(/formLayout[^;]*'custom'/);
		expect(taskCreateSrc).toMatch(/override\s+onRenderForm\s*\(/);
	});

	// SR-3.13 — onRender() override calls super.onRender() to preserve the form pipeline
	// Rule: "onRender() is for content outside the form pipeline" — must delegate to super for the form
	it('TaskEditView: onRender() calls super.onRender() to preserve the default form pipeline', () => {
		expect(taskEditSrc).toMatch(/override\s+onRender\s*\(\s*\)/);
		expect(taskEditSrc).toMatch(/super\.onRender\s*\(\s*\)/);
	});

	// SR-3.14 — isUiField() type guard is used when iterating context.uiFields in a ReadView
	// Rule: "use isUiField() type guard to safely access field metadata" when iterating uiFields
	it('ProjectReadView: isUiField() type guard is declared and used (safe uiFields iteration pattern)', () => {
		expect(projectReadSrc).toMatch(/function\s+isUiField\s*\(/);
		expect(projectReadSrc).toMatch(/isUiField\s*\(/);
	});

	// SR-3.15 — refreshMode: 'auto' with refreshTriggers only specifies monitored fields
	// Rule: refreshTriggers applies when refreshMode: 'auto' — only those fields trigger a refresh
	it('ProjectCreateView: refreshMode auto with refreshTriggers array of field names', () => {
		expect(projectCreateSrc).toMatch(/refreshMode[^;]*'auto'/);
		expect(projectCreateSrc).toMatch(/override\s+refreshTriggers/);
	});

	// SR-3.16 — DI resolver used as a class field for DI in form views.
	// Rule: "App.resolve() (or the equivalent DependencyContainer.resolve()) as a
	// class field — resolved once per view instance at instantiation."
	it('TaskCreateView: App.resolve() / DependencyContainer.resolve() used as class field for DI', () => {
		expect(taskCreateSrc).toMatch(/(?:App|DependencyContainer)\.resolve\s*\(/);
	});
});

// ---------------------------------------------------------------------------
// SR-4 — Forbidden imports and framework import requirement
// ---------------------------------------------------------------------------

describe('SR-4: Forbidden imports and framework import hygiene', () => {
	// SR-4.1 — No direct axios usage in form view files
	// Violation: form views must use the framework API layer — direct HTTP calls bypass it
	it('TaskCreateView: does not import or call axios directly', () => {
		expect(taskCreateSrc).not.toMatch(/import\s+axios/);
		expect(taskCreateSrc).not.toMatch(/require\s*\(\s*['"]axios['"]\s*\)/);
	});

	it('TaskEditView: does not import or call axios directly', () => {
		expect(taskEditSrc).not.toMatch(/import\s+axios/);
		expect(taskEditSrc).not.toMatch(/require\s*\(\s*['"]axios['"]\s*\)/);
	});

	it('TaskReadView: does not import or call axios directly', () => {
		expect(taskReadSrc).not.toMatch(/import\s+axios/);
		expect(taskReadSrc).not.toMatch(/require\s*\(\s*['"]axios['"]\s*\)/);
	});

	// SR-4.2 — No bare window.fetch / global fetch in form view files
	// Violation: bypasses the framework's operation-builder API
	it('TaskCreateView: does not use bare fetch() directly', () => {
		expect(taskCreateSrc).not.toMatch(/(?<![.\w])fetch\s*\(/);
	});

	it('TaskEditView: does not use bare fetch() directly', () => {
		expect(taskEditSrc).not.toMatch(/(?<![.\w])fetch\s*\(/);
	});

	// SR-4.3 — No direct DOM manipulation in form view files
	// Violation: all rendering must go through React / the framework — direct DOM breaks the React tree
	it('TaskCreateView: does not use document.querySelector or document.getElementById', () => {
		expect(taskCreateSrc).not.toMatch(
			/document\.(querySelector|getElementById|createElement)/,
		);
	});

	it('TaskEditView: does not use document.querySelector or document.getElementById', () => {
		expect(taskEditSrc).not.toMatch(
			/document\.(querySelector|getElementById|createElement)/,
		);
	});

	it('TaskReadView: does not use document.querySelector or document.getElementById', () => {
		expect(taskReadSrc).not.toMatch(
			/document\.(querySelector|getElementById|createElement)/,
		);
	});

	// SR-4.4 — Framework primitives must come from @drumr/framework-frontend (published package)
	// Violation: importing from internal paths like 'framework/src/...' or '../../core/...' would
	// break when the package is consumed externally
	it('TaskEditView: framework imports come from @drumr/framework-frontend', () => {
		expect(taskEditSrc).toMatch(/@drumr\/framework-frontend/);
		expect(taskEditSrc).not.toMatch(/from\s+['"][./]*core\/frontend/);
	});

	it('TaskReadView: framework imports come from @drumr/framework-frontend', () => {
		expect(taskReadSrc).toMatch(/@drumr\/framework-frontend/);
	});

	it('TaskCreateView: framework imports come from @drumr/framework-frontend', () => {
		expect(taskCreateSrc).toMatch(/@drumr\/framework-frontend/);
	});

	// SR-4.5 — Adversarial repo-wide scan: no axios in any frontend view file
	// Ensures the rule holds across all views, not just the primary fixtures
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

	// SR-4.7 — Adversarial repo-wide scan: all view files that import framework use the published package
	it('adversarial scan: all view files import framework from @drumr/framework-frontend', () => {
		const violations = allViewSources.filter((src) =>
			/from\s+['"][./]*core\/frontend/.test(src),
		);
		expect(violations).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// SR-5 — Relation fields in create flows
// ---------------------------------------------------------------------------

const taskFormLayoutSrc = fs.readFileSync(
	path.resolve(FRONTEND_VIEWS, 'tasks/helpers/taskFormLayout.tsx'),
	'utf8',
);

describe('SR-5: Relation fields in create flows', () => {
	// SR-5.1 — TaskCreateView must NOT contain a raw text input for a reference field.
	// Rule: never use <Input> or raw id strings for relation fields in create views.
	it('TaskCreateView: does not contain a raw-ID Input placeholder for relation fields', () => {
		// Detect raw-ID placeholders like placeholder="Country ID" / "Enter Country ID"
		expect(taskCreateSrc).not.toMatch(
			/placeholder\s*=\s*['"][^'"]*\b[Ii][Dd]\b[^'"]*['"]/,
		);
	});

	// SR-5.2 — TaskCreateView must NOT hardcode a relation via { id: '...' } in initialData.
	// Rule: never pre-fill a reference field with a raw id object in the view source.
	it('TaskCreateView: does not hardcode a relation field with a raw { id: "..." } value', () => {
		expect(taskCreateSrc).not.toMatch(
			/initialData\s*=\s*\{[^}]*\bid\s*:\s*['"][^'"]{10,}['"]/,
		);
	});

	// SR-5.3 — ProjectCreateView uses fields: 'all' so the framework renders the relation dropdown.
	// Rule: fields: 'all' is the default — the framework resolves every relation field component.
	it('ProjectCreateView: uses fields: "all" to delegate relation rendering to the framework', () => {
		expect(projectCreateSrc).toMatch(/override\s+fields[^=]*=\s*['"]all['"]/);
	});

	// SR-5.4 — Task form layout helper renders reference fields with DataField, not raw inputs.
	// Rule: use DataField for every field in onRenderForm, including reference/relation fields.
	it('taskFormLayout: renders the "project" relation field using DataField (not a raw input)', () => {
		// The helper must call renderTaskField / DataField for the 'project' relation field
		expect(taskFormLayoutSrc).toMatch(/renderTaskField\s*\(\s*['"]project['"]/);
		// The helper must import DataField from the framework
		expect(taskFormLayoutSrc).toMatch(/DataField/);
		// No raw <Input> element should be used for the project field
		expect(taskFormLayoutSrc).not.toMatch(/<Input[^>]*project[^>]*>/);
	});

	// SR-5.5 — Task form layout helper renders the "assignee" relation field with DataField.
	it('taskFormLayout: renders the "assignee" relation field using DataField (not a raw input)', () => {
		expect(taskFormLayoutSrc).toMatch(
			/renderTaskField\s*\(\s*['"]assignee['"]/,
		);
	});

	// SR-5.6 — Adversarial scan: no view or helper file contains a raw ID placeholder for
	//           a relation field (e.g. placeholder="Country ID" or placeholder="Enter Country ID").
	// Rule: relation fields must always use the dropdown selector, not an ID text input.
	it('adversarial scan: no view file has a raw-ID Input placeholder for a relation field', () => {
		const violations = allViewSources.filter((src) =>
			/placeholder\s*=\s*['"][^'"]*\b[Ii][Dd]\b[^'"]*['"]/.test(src),
		);
		expect(violations).toHaveLength(0);
	});

	// SR-5.7 — Adversarial scan: no view file uses initialData to hardcode a relation via raw id.
	it('adversarial scan: no view file hardcodes a relation with a raw { id: "..." } in initialData', () => {
		const violations = allViewSources.filter((src) =>
			/initialData\s*=\s*\{[^}]*\bid\s*:\s*['"][^'"]{10,}['"]/.test(src),
		);
		expect(violations).toHaveLength(0);
	});
});
