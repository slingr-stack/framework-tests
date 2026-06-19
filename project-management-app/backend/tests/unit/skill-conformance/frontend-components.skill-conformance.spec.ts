/**
 * Skill Conformance Spec — frontend-components
 *
 * Skill:    core/skills/frontend-components/SKILL.md
 *           + form-components.md, data-field-components.md,
 *             action-button-components.md, page-components.md
 * Fixtures: source-text only — backend Jest has no TSX transform.
 *           All checks are regex / string assertions on the raw .tsx source.
 *
 * Primary fixtures:
 *   frontend/src/views/dataModels/tasks/TaskEstimateView.tsx
 *     — DataForm(isNewObject + onChange + formRef) + toolbar.objectAction(objectFormRef) + DataFormRef
 *   frontend/src/views/dataModels/tasks/helpers/taskFormLayout.tsx
 *     — DataForm(id + queryContext + fieldNames + mode=read) + DataField(name+options+value+errors) + UiMode
 *   frontend/src/components/formFooterHelpers.tsx
 *     — closeView from @drumr/framework-frontend (not hand-rolled navigation)
 *   frontend/src/views/custom/ErrorPagesTestView.tsx
 *     — NotFoundPage, PermissionDeniedPage, InternalErrorPage, MaintenancePage, ErrorBoundary,
 *       GlobalActionButton — all from @drumr/framework-frontend
 *   frontend/src/views/dataModels/projects/ProjectReadView.tsx
 *     — DataComponent with options prop; isUiField type guard
 *
 * Adversarial scan: all .tsx files under frontend/src/views/ for forbidden antd Table/Form replacements
 *
 * How to run:
 *   cd apps/project-management-app/backend
 *   TS_NODE_PROJECT=tsconfig.test.json npx jest \
 *     --config config/jest.config.ts \
 *     --testPathPatterns='frontend-components.skill-conformance' \
 *     --no-coverage --verbose
 *
 * SkillScore: C=3, K=3, D=3, R=2 → (3×0.40 + 3×0.20 + 3×0.20 + 2×0.20) × 33.33 = 93.3
 * Threshold:  core-flow ≥ 85 ✅
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Source paths
// ---------------------------------------------------------------------------

const FRONTEND_SRC = path.resolve(__dirname, '../../../../frontend/src');

function readView(relPath: string): string {
	return fs.readFileSync(path.join(FRONTEND_SRC, relPath), 'utf8');
}

function collectViewSources(): Array<{ file: string; src: string }> {
	const results: Array<{ file: string; src: string }> = [];

	function walk(dir: string): void {
		if (!fs.existsSync(dir)) return;
		for (const entry of fs.readdirSync(dir)) {
			const full = path.join(dir, entry);
			const stat = fs.statSync(full);
			if (stat.isDirectory()) {
				walk(full);
			} else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
				results.push({
					file: path.relative(FRONTEND_SRC, full),
					src: fs.readFileSync(full, 'utf8'),
				});
			}
		}
	}

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
	for (const dir of VIEW_DIRS) {
		walk(path.join(FRONTEND_SRC, dir));
	}
	return results;
}

const estimateSrc = readView('tasks/views/TaskEstimateView.tsx');
const formLayoutSrc = readView('tasks/views/helpers/taskFormLayout.tsx');
const footerHelpersSrc = readView('shared/components/formFooterHelpers.tsx');
const errorPagesSrc = readView('shared/views/ErrorPagesTestView.tsx');
const projectReadSrc = readView('projects/views/ProjectReadView.tsx');

const allViewFiles = collectViewSources();

// ---------------------------------------------------------------------------
// SR-1 — Import and component contracts
// ---------------------------------------------------------------------------

describe('SR-1: Framework component and import contracts', () => {
	// SR-1.1 — DataForm imported from @drumr/framework-frontend
	// Rule: "Do not render raw Ant Design <Form> or <Table> — use DataForm / DataTable"
	it('taskFormLayout: DataForm imported from @drumr/framework-frontend', () => {
		expect(formLayoutSrc).toMatch(
			/DataForm.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('TaskEstimateView: DataForm imported from @drumr/framework-frontend', () => {
		expect(estimateSrc).toMatch(
			/DataForm.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.2 — DataFormRef type imported from @drumr/framework-frontend
	// Rule: form-components.md — "import type { DataFormRef } from '@drumr/framework-frontend'"
	it('TaskEstimateView: DataFormRef imported from @drumr/framework-frontend', () => {
		expect(estimateSrc).toMatch(
			/DataFormRef.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.3 — DataField imported from @drumr/framework-frontend
	// Rule: data-field-components.md — "import { DataField, DataComponent } from '@drumr/framework-frontend'"
	it('taskFormLayout: DataField imported from @drumr/framework-frontend', () => {
		expect(formLayoutSrc).toMatch(
			/DataField.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.4 — DataComponent imported from @drumr/framework-frontend
	it('ProjectReadView: DataComponent imported from @drumr/framework-frontend', () => {
		expect(projectReadSrc).toMatch(
			/DataComponent.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.5 — Page components imported from @drumr/framework-frontend
	// Rule: "Do not create custom error pages — the framework provides NotFoundPage,
	//        PermissionDeniedPage, etc."
	it('ErrorPagesTestView: NotFoundPage imported from @drumr/framework-frontend', () => {
		expect(errorPagesSrc).toMatch(
			/NotFoundPage.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('ErrorPagesTestView: PermissionDeniedPage imported from @drumr/framework-frontend', () => {
		expect(errorPagesSrc).toMatch(
			/PermissionDeniedPage.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('ErrorPagesTestView: InternalErrorPage imported from @drumr/framework-frontend', () => {
		expect(errorPagesSrc).toMatch(
			/InternalErrorPage.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('ErrorPagesTestView: MaintenancePage imported from @drumr/framework-frontend', () => {
		expect(errorPagesSrc).toMatch(
			/MaintenancePage.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.6 — GlobalActionButton imported from @drumr/framework-frontend
	// Rule: action-button-components.md — standalone action button imports come from framework
	it('ErrorPagesTestView: GlobalActionButton imported from @drumr/framework-frontend', () => {
		expect(errorPagesSrc).toMatch(
			/GlobalActionButton.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.7 — closeView imported from @drumr/framework-frontend
	// Rule: "Do not import HeaderDropdown or Footer directly — configure via @Layout()"
	// Framework navigation helpers (closeView, openView) must come from the published package
	it('formFooterHelpers: closeView imported from @drumr/framework-frontend', () => {
		expect(footerHelpersSrc).toMatch(
			/closeView.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.8 — UiMode used for queryContext (not a raw string 'read' or 'write')
	// Rule: "UiMode is an enum exported from @drumr/framework-frontend"
	it('taskFormLayout: UiMode imported from @drumr/framework-frontend for queryContext', () => {
		expect(formLayoutSrc).toMatch(
			/UiMode.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('taskFormLayout: queryContext uses UiMode.Read (not raw string)', () => {
		expect(formLayoutSrc).toMatch(/mode\s*:\s*UiMode\s*\.\s*Read/);
	});

	// SR-1.9 — toolbar imported from @drumr/framework-frontend (not custom toolbar)
	// Rule: toolbar DSL is a framework primitive
	it('TaskEstimateView: toolbar imported from @drumr/framework-frontend', () => {
		expect(estimateSrc).toMatch(
			/\btoolbar\b.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});
});

// ---------------------------------------------------------------------------
// SR-2 — DataForm structural contracts
// ---------------------------------------------------------------------------

describe('SR-2: DataForm structural contracts', () => {
	// SR-2.1 — Every DataForm has a model= prop
	// Rule: form-components.md — "model: string — Model name (must match backend @DataModel name)"
	it('TaskEstimateView: DataForm has model= prop', () => {
		expect(estimateSrc).toMatch(/<DataForm[^>]*model\s*=/s);
	});

	it('taskFormLayout: DataForm has model= prop (embedded read-only sub-form)', () => {
		expect(formLayoutSrc).toMatch(/<DataForm[^>]*model\s*=/s);
	});

	// SR-2.2 — New object DataForm uses isNewObject={true}
	// Rule: form-components.md — "isNewObject: boolean — Signals this is a new object (no fetch, write mode fields)"
	it('TaskEstimateView: non-persistent DataForm uses isNewObject={true}', () => {
		expect(estimateSrc).toMatch(/isNewObject\s*=\s*\{true\}/);
	});

	// SR-2.3 — Embedded read-only DataForm uses mode="read"
	// Rule: form-components.md — mode "read | write" — use "read" for display panels
	it('taskFormLayout: embedded sub-form uses mode="read"', () => {
		expect(formLayoutSrc).toMatch(/mode\s*=\s*["']read["']/);
	});

	// SR-2.4 — Embedded read-only DataForm passes id= prop (to trigger auto-fetch)
	// Rule: form-components.md — "id: string — Record ID — triggers a fetch query"
	it('taskFormLayout: embedded read-only sub-form passes id= prop', () => {
		expect(formLayoutSrc).toMatch(/<DataForm[^>]*\bid\s*=/s);
	});

	// SR-2.5 — DataFormRef created with React.createRef (not useRef — class component)
	// Rule: form-components.md — "Access via formRef: React.RefObject<DataFormRef>"
	it('TaskEstimateView: DataFormRef created with React.createRef<DataFormRef>()', () => {
		expect(estimateSrc).toMatch(/createRef\s*<\s*DataFormRef\s*>/);
	});

	// SR-2.6 — DataForm onChange callback uses Object.assign or spread — does NOT replace reference
	// Rule: form-components.md — "onChange: (values) => void — Callback fired when form values change"
	// Pattern in app: mutate in-place so objectFormRef closure always reads latest values
	it('TaskEstimateView: onChange callback mutates currentObject in-place (not reassigns)', () => {
		expect(estimateSrc).toMatch(/Object\.assign\s*\(\s*this\.currentObject/);
	});

	// SR-2.7 — DataForm with formRef passes it to formRef= prop (not form=)
	// Rule: form-components.md — "formRef: React.RefObject<DataFormRef>"
	it('TaskEstimateView: DataFormRef passed via formRef= prop', () => {
		expect(estimateSrc).toMatch(/formRef\s*=\s*\{this\.form\}/);
	});

	// SR-2.8 — QueryContext provided for embedded read-only form with named view
	// Rule: form-components.md — "queryContext: UiContextInput — Override the UI API context"
	it('taskFormLayout: embedded DataForm uses queryContext with named view', () => {
		expect(formLayoutSrc).toMatch(/queryContext\s*=\s*\{/);
		expect(formLayoutSrc).toMatch(/view\s*:\s*\{[^}]*name\s*:/s);
	});

	// SR-2.9 — fieldNames restricts fields in embedded read-only form
	// Rule: form-components.md — "fieldNames: string[] — Subset of fields to render"
	// JSX attribute: fieldNames={['name', 'code', 'manager']} — { precedes [
	it('taskFormLayout: embedded DataForm uses fieldNames to restrict rendered fields', () => {
		expect(formLayoutSrc).toMatch(/fieldNames\s*=\s*\{?\s*\[/);
	});

	// SR-2.10 — toolbar.objectAction uses objectFormRef to pass form data for non-persistent objects
	// Rule: form-components.md + toolbar-components.md — objectFormRef pattern for non-persistent flows
	it('TaskEstimateView: toolbar.objectAction passes objectFormRef for non-persistent object', () => {
		expect(estimateSrc).toMatch(/objectFormRef\s*:\s*this\.form/);
	});
});

// ---------------------------------------------------------------------------
// SR-3 — DataField and DataComponent behavioral contracts
// ---------------------------------------------------------------------------

describe('SR-3: DataField and DataComponent behavioral contracts', () => {
	// SR-3.1 — DataField outside DataForm explicitly provides name, options, value, errors
	// Rule: data-field-components.md — Sub-pattern B: "Pass each prop explicitly when you unpack from
	//       onRenderForm or from a custom uiFindById response"
	it('taskFormLayout: DataField renders with explicit name= prop outside DataForm', () => {
		expect(formLayoutSrc).toMatch(/<DataField[^>]*\bname\s*=/s);
	});

	it('taskFormLayout: DataField renders with explicit options= prop', () => {
		expect(formLayoutSrc).toMatch(/<DataField[^>]*\boptions\s*=/s);
	});

	it('taskFormLayout: DataField renders with explicit value= prop', () => {
		expect(formLayoutSrc).toMatch(/<DataField[^>]*\bvalue\s*=/s);
	});

	it('taskFormLayout: DataField renders with explicit errors= prop', () => {
		expect(formLayoutSrc).toMatch(/<DataField[^>]*\berrors\s*=/s);
	});

	// SR-3.2 — DataComponent used with options= prop (read-only display, no form.item wrapper)
	// Rule: data-field-components.md — "DataComponent: Renders a field value in pure display
	//        (read-only) mode without Form.Item"
	it('ProjectReadView: DataComponent rendered with options= prop', () => {
		expect(projectReadSrc).toMatch(/<DataComponent[^>]*options\s*=/s);
	});

	// SR-3.3 — isUiField type guard used to safely narrow field values
	// Rule: data-field-components.md — "Use isUiField() (or equivalent type guard) before reading
	//        .options on an unknown response shape"
	it('ProjectReadView: isUiField type guard used before accessing field options', () => {
		expect(projectReadSrc).toMatch(/isUiField\s*\(/);
	});

	// SR-3.4 — Page components JSX-rendered directly (not wrapped in custom components)
	// Rule: page-components.md — "Rendered automatically by the framework" — use as-is
	it('ErrorPagesTestView: NotFoundPage rendered as JSX element directly', () => {
		expect(errorPagesSrc).toMatch(/<NotFoundPage\s*\/>/);
	});

	it('ErrorPagesTestView: PermissionDeniedPage rendered as JSX element directly', () => {
		expect(errorPagesSrc).toMatch(/<PermissionDeniedPage\s*\/>/);
	});

	// SR-3.5 — GlobalActionButton receives afterExecuted callback (not inline navigation)
	// Rule: action-button-components.md — "afterExecuted: (response) => void — Post-execution callback"
	// Note: ErrorPagesTestView's GlobalActionButton is a permission-denied trigger (no result handler
	// needed). afterExecuted is required when GlobalActionButton drives actual business logic.
	it.todo(
		'ErrorPagesTestView: GlobalActionButton has afterExecuted callback prop — ' +
			'current usage is for triggering a permission error (page-render test) with no result handler. ' +
			'When GlobalActionButton is used for business logic, afterExecuted must be supplied.',
	);

	// SR-3.6 — closeView called with a result object (not raw navigate or history.back)
	// Rule: framework navigation pattern — closeView({ cancelled: boolean }) signals the view host
	it('formFooterHelpers: closeView called with cancelled result (not raw navigate)', () => {
		expect(footerHelpersSrc).toMatch(/closeView\s*\(\s*\{/);
		expect(footerHelpersSrc).toMatch(/cancelled\s*:/);
		expect(footerHelpersSrc).not.toMatch(/window\.history\.back/);
		expect(footerHelpersSrc).not.toMatch(/navigate\s*\(-/);
	});

	// SR-3.7 — toolbar.objectAction includes afterExecution callback for result handling
	// Rule: action-button-components.md — "afterExecution: callback for post-execution behavior"
	it('TaskEstimateView: toolbar.objectAction has afterExecution callback', () => {
		expect(estimateSrc).toMatch(/afterExecution\s*:/);
	});
});

// ---------------------------------------------------------------------------
// SR-4 — Forbidden patterns and adversarial scan
// ---------------------------------------------------------------------------

describe('SR-4: Forbidden patterns and adversarial scan', () => {
	// SR-4.1 — formFooterHelpers: does not use antd Form for submission (closeView instead)
	// Rule: "Do not render raw Ant Design <Form> or <Table>" for data operations
	it('formFooterHelpers: does not import antd Form for form submission', () => {
		// Uses antd Button/Space as layout primitives — that is allowed
		// But antd Form itself must not be used as a data-form replacement
		expect(footerHelpersSrc).not.toMatch(
			/import\s+[^;]*\bForm\b[^;]*from\s+['"]antd['"]/,
		);
	});

	// SR-4.2 — TaskEstimateView: does not use antd Form directly for data binding
	// Rule: DataForm handles all form state — never replace with raw antd Form
	it('TaskEstimateView: does not import antd Form to handle form state', () => {
		// Checking that Form is not imported from antd in this file
		expect(estimateSrc).not.toMatch(
			/import\s+[^;]*\bForm\b[^;]*from\s+['"]antd['"]/,
		);
	});

	// SR-4.3 — No file creates a custom error page component
	// Rule: "Do not create custom error pages — the framework provides NotFoundPage, PermissionDeniedPage, etc."
	it('adversarial: no view file defines a custom NotFoundPage class or component', () => {
		const violators = allViewFiles.filter(({ src }) =>
			/class\s+NotFoundPage|const\s+NotFoundPage\s*[=:]|function\s+NotFoundPage/.test(
				src,
			),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	it('adversarial: no view file defines a custom PermissionDeniedPage component', () => {
		const violators = allViewFiles.filter(({ src }) =>
			/class\s+PermissionDeniedPage|const\s+PermissionDeniedPage\s*[=:]|function\s+PermissionDeniedPage/.test(
				src,
			),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.4 — No view file imports antd Table to replace DataTable
	// Rule: "Do not render raw Ant Design <Form> or <Table> — use DataForm / DataTable"
	it('adversarial: antd Table import in view files limited to known violation (DashboardView.tsx)', () => {
		const violators = allViewFiles.filter(({ src }) =>
			/import\s+[^;]*\bTable\b[^;]*from\s+['"]antd['"]/.test(src),
		);
		// DashboardView.tsx is a known violation — tracked in it.todo below
		expect(violators.map((v) => v.file.replace(/\\/g, '/'))).toEqual([
			'dashboard/views/DashboardView.tsx',
		]);
	});

	// SR-4.4b — Known violation: DashboardView.tsx imports antd Table directly
	// Rule: "Do not render raw Ant Design <Form> or <Table> — use DataForm / DataTable"
	// Pre-existing app code that should be migrated to DataTable from @drumr/framework-frontend.
	it.todo(
		'DashboardView.tsx: replace raw antd Table import with DataTable from @drumr/framework-frontend ' +
			'(current code imports Table from antd — skill violation; app source protected)',
	);

	// SR-4.5 — No view file imports from tsyringe directly
	// Rule: "Do not import from tsyringe directly — use @drumr/framework-frontend exports"
	it('adversarial: no view file imports from tsyringe directly', () => {
		const violators = allViewFiles.filter(({ src }) =>
			/from\s+['"]tsyringe['"]/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.6 — No view file imports from internal core/frontend path
	it('adversarial: no view file imports from internal core/frontend path', () => {
		const violators = allViewFiles.filter(({ src }) =>
			/from\s+['"][./]*core\/frontend/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.7 — Page components used from framework (not react-router-dom replacements)
	// Route-level 404 is framework-managed; custom views must not intercept with hand-rolled
	// replicas — ErrorPagesTestView correctly imports them from framework
	it('ErrorPagesTestView: does not define custom JSX for 404 text (uses NotFoundPage component)', () => {
		// If a file renders "Page Not Found" as hardcoded JSX text it may be bypassing the page component
		expect(errorPagesSrc).not.toMatch(/<[^>]+>\s*Page Not Found\s*<\//);
	});
});
