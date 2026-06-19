/**
 * Skill Conformance Spec — frontend-action-views
 *
 * Skill:    core/skills/frontend-action-views/SKILL.md
 * Approach: Source-text only — backend Jest has no TSX/JSX transform.
 *
 * Primary fixtures:
 *   frontend/src/views/globalActions/GetDashboardSummaryView.tsx
 *     — GlobalAction, @ActionView({ action }), formLayout: 'custom', refreshMode: 'custom',
 *       onLoad() with await super.onLoad() first + this.initialData, onRefresh() +
 *       this.app.message.warning(), onRenderForm() with DataField
 *   frontend/src/views/dataModels/projects/actions/UpdateProjectStatusView.tsx
 *     — ObjectAction, full lifecycle: onLoad(), beforeExecute() returns Promise<boolean>,
 *       onExecute() + await super.onExecute(), afterExecuted(response: ActionResponse),
 *       this.app.message.*
 *   frontend/src/views/dataModels/tasks/actions/AssignTaskView.tsx
 *     — ObjectAction minimal, ActionViewComponent<void, Task>, await super.onLoad(),
 *       this.targetObject access, refreshMode: 'auto'
 *   frontend/src/views/dataModels/tasks/actions/CompleteTaskView.tsx
 *     — ObjectAction with generics ActionViewComponent<CompleteTaskParamsUi, Task>,
 *       formLayout: 'custom', onRenderForm(context: DataFormContextValue<Task>), DataField
 *
 * Adversarial scan: all .tsx files under frontend/src/views/
 *
 * How to run:
 *   cd apps/project-management-app/backend
 *   TS_NODE_PROJECT=tsconfig.test.json npx jest \
 *     --config config/jest.config.ts \
 *     --testPathPatterns='frontend-action-views.skill-conformance' \
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

function collectViewSources(): Array<{ file: string; src: string }> {
	const results: Array<{ file: string; src: string }> = [];

	function walk(dir: string): void {
		if (!fs.existsSync(dir)) return;
		for (const entry of fs.readdirSync(dir)) {
			const full = path.join(dir, entry);
			const stat = fs.statSync(full);
			if (stat.isDirectory()) {
				walk(full);
			} else if (entry.endsWith('.tsx') && !entry.endsWith('.d.ts')) {
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

const getDashboardSummarySrc = readFrontend(
	'global/views/GetDashboardSummaryView.tsx',
);
const updateProjectStatusSrc = readFrontend(
	'projects/views/actions/UpdateProjectStatusView.tsx',
);
const assignTaskSrc = readFrontend('tasks/views/actions/AssignTaskView.tsx');
const completeTaskSrc = readFrontend(
	'tasks/views/actions/CompleteTaskView.tsx',
);

const allViewFiles = collectViewSources();
const allActionFiles = allViewFiles.filter(({ src }) =>
	/@ActionView\s*\(/.test(src),
);

// ---------------------------------------------------------------------------
// SR-1 — @ActionView decorator and import contracts
// ---------------------------------------------------------------------------

describe('SR-1: @ActionView decorator and import contracts', () => {
	// SR-1.1 — @ActionView imported from @drumr/framework-frontend
	// Rule: "import { ActionView, ActionViewComponent } from '@drumr/framework-frontend'"
	it('GetDashboardSummaryView: ActionView and ActionViewComponent imported from @drumr/framework-frontend', () => {
		expect(getDashboardSummarySrc).toMatch(
			/ActionView.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
		expect(getDashboardSummarySrc).toMatch(
			/ActionViewComponent.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('UpdateProjectStatusView: ActionView and ActionViewComponent imported from @drumr/framework-frontend', () => {
		expect(updateProjectStatusSrc).toMatch(
			/ActionView.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
		expect(updateProjectStatusSrc).toMatch(
			/ActionViewComponent.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('AssignTaskView: ActionView and ActionViewComponent imported from @drumr/framework-frontend', () => {
		expect(assignTaskSrc).toMatch(
			/ActionView.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
		expect(assignTaskSrc).toMatch(
			/ActionViewComponent.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.2 — @ActionView decorator uses only the `action` key (no `model` key)
	// Rule: "@ActionView does not take a model key — only action"
	it('GetDashboardSummaryView: @ActionView decorator has action key and no model key', () => {
		const decorator =
			getDashboardSummarySrc.match(/@ActionView\s*\(\s*\{[^}]*\}\s*\)/)?.[0] ??
			'';
		expect(decorator).toMatch(/\baction\s*:/);
		expect(decorator).not.toMatch(/\bmodel\s*:/);
	});

	it('UpdateProjectStatusView: @ActionView decorator has action key and no model key', () => {
		const decorator =
			updateProjectStatusSrc.match(/@ActionView\s*\(\s*\{[^}]*\}\s*\)/)?.[0] ??
			'';
		expect(decorator).toMatch(/\baction\s*:/);
		expect(decorator).not.toMatch(/\bmodel\s*:/);
	});

	it('CompleteTaskView: @ActionView decorator has action key and no model key', () => {
		const decorator =
			completeTaskSrc.match(/@ActionView\s*\(\s*\{[^}]*\}\s*\)/)?.[0] ?? '';
		expect(decorator).toMatch(/\baction\s*:/);
		expect(decorator).not.toMatch(/\bmodel\s*:/);
	});
});

// ---------------------------------------------------------------------------
// SR-2 — ActionViewComponent extension and structural contracts
// ---------------------------------------------------------------------------

describe('SR-2: ActionViewComponent extension and structural contracts', () => {
	// SR-2.1 — All action views extend ActionViewComponent
	// Rule: "The base class is ActionViewComponent"
	it('GetDashboardSummaryView: extends ActionViewComponent', () => {
		expect(getDashboardSummarySrc).toMatch(
			/class\s+GetDashboardSummaryView\s+extends\s+ActionViewComponent/,
		);
	});

	it('UpdateProjectStatusView: extends ActionViewComponent', () => {
		expect(updateProjectStatusSrc).toMatch(
			/class\s+UpdateProjectStatusView\s+extends\s+ActionViewComponent/,
		);
	});

	it('AssignTaskView: extends ActionViewComponent with generic type parameter', () => {
		// Rule: "prefer extends ActionViewComponent<Ui<MyAction>Params> for type-safe params models"
		expect(assignTaskSrc).toMatch(
			/class\s+AssignTaskView\s+extends\s+ActionViewComponent</,
		);
	});

	it('CompleteTaskView: extends ActionViewComponent with typed generic params', () => {
		expect(completeTaskSrc).toMatch(
			/class\s+CompleteTaskView\s+extends\s+ActionViewComponent</,
		);
	});

	// SR-2.2 — formLayout: 'custom' paired with onRenderForm() implementation
	// Rule: "use 'custom' + onRenderForm for sectioned layouts"
	it('GetDashboardSummaryView: formLayout custom is paired with onRenderForm()', () => {
		expect(getDashboardSummarySrc).toMatch(/formLayout[^=]*=.*'custom'/);
		expect(getDashboardSummarySrc).toMatch(/override\s+onRenderForm\s*\(/);
	});

	it('CompleteTaskView: formLayout custom is paired with onRenderForm()', () => {
		expect(completeTaskSrc).toMatch(/formLayout[^=]*=.*'custom'/);
		expect(completeTaskSrc).toMatch(/override\s+onRenderForm\s*\(/);
	});

	// SR-2.3 — refreshMode: 'custom' paired with onRefresh() implementation
	// Rule: "use 'custom' + onRefresh for cross-field validation"
	it('GetDashboardSummaryView: refreshMode custom is paired with onRefresh()', () => {
		expect(getDashboardSummarySrc).toMatch(/refreshMode[^=]*=.*'custom'/);
		expect(getDashboardSummarySrc).toMatch(/override\s+onRefresh\s*\(/);
	});

	// SR-2.4 — layout is no longer assigned on the view class.
	// Layout resolution moved to routing/app defaults; assertions removed.
});

// ---------------------------------------------------------------------------
// SR-3 — Lifecycle hook behavioral guarantees
// ---------------------------------------------------------------------------

describe('SR-3: Lifecycle hook behavioral guarantees', () => {
	// SR-3.1 — await super.onLoad() called FIRST before this.initialData
	// Rule: "Always await super.onLoad() before setting initialData"
	it('GetDashboardSummaryView: await super.onLoad() called before this.initialData assignment', () => {
		expect(getDashboardSummarySrc).toMatch(/await\s+super\.onLoad\s*\(\s*\)/);
		const superLoadIdx = getDashboardSummarySrc.indexOf('super.onLoad()');
		const initialDataIdx = getDashboardSummarySrc.indexOf('this.initialData');
		expect(superLoadIdx).toBeGreaterThan(-1);
		expect(initialDataIdx).toBeGreaterThan(-1);
		expect(superLoadIdx).toBeLessThan(initialDataIdx);
	});

	it('UpdateProjectStatusView: await super.onLoad() called in onLoad()', () => {
		expect(updateProjectStatusSrc).toMatch(/await\s+super\.onLoad\s*\(\s*\)/);
	});

	it('AssignTaskView: await super.onLoad() called in onLoad()', () => {
		expect(assignTaskSrc).toMatch(/await\s+super\.onLoad\s*\(\s*\)/);
	});

	// SR-3.2 — beforeExecute() returns Promise<boolean>
	// Rule: "return false to cancel — never throw"
	it('UpdateProjectStatusView: beforeExecute() returns Promise<boolean> (not void)', () => {
		expect(updateProjectStatusSrc).toMatch(
			/protected override async beforeExecute\s*\(\s*\)\s*:\s*Promise<boolean>/,
		);
	});

	it('UpdateProjectStatusView: beforeExecute() uses return false to cancel (not throw)', () => {
		// beforeExecute body should contain "return false" not "throw new Error"
		expect(updateProjectStatusSrc).toMatch(/return\s+false/);
		expect(updateProjectStatusSrc).not.toMatch(
			/throw\s+new\s+Error.*(?=protected override async afterExecuted)/s,
		);
	});

	// SR-3.3 — onExecute() calls await super.onExecute() to trigger actual server call
	// Rule: "await super.onExecute() — triggers the actual action"
	it('UpdateProjectStatusView: onExecute() calls await super.onExecute()', () => {
		expect(updateProjectStatusSrc).toMatch(
			/await\s+super\.onExecute\s*\(\s*\)/,
		);
	});

	// SR-3.4 — afterExecuted() receives ActionResponse and uses this.app.message.*
	// Rule: "afterExecuted(response: ActionResponse) — post-execution feedback"
	it('UpdateProjectStatusView: afterExecuted() accepts ActionResponse parameter', () => {
		// Multi-line signatures have a trailing comma: afterExecuted(\n    response: ActionResponse,\n  )
		// Check presence of the method declaration and the typed parameter separately
		expect(updateProjectStatusSrc).toMatch(
			/protected override async afterExecuted\s*\(/,
		);
		expect(updateProjectStatusSrc).toMatch(/response\s*:\s*ActionResponse/);
	});

	it('UpdateProjectStatusView: afterExecuted() uses this.app.message for notifications', () => {
		expect(updateProjectStatusSrc).toMatch(/this\.app\.message\./);
	});

	// SR-3.5 — onRefresh() uses this.app.message.warning() for validation feedback
	// Rule: "Use this.app.message.warning() for validation feedback inside onRefresh"
	it('GetDashboardSummaryView: onRefresh() uses this.app.message.warning() for date validation', () => {
		expect(getDashboardSummarySrc).toMatch(/this\.app\.message\.warning\s*\(/);
	});

	// SR-3.6 — DataField used for param fields in onRenderForm (not raw antd inputs)
	// Rule: "Bind every field via <DataField> — never render a raw Ant Design input for a param field"
	it('GetDashboardSummaryView: onRenderForm uses DataField for param fields', () => {
		expect(getDashboardSummarySrc).toMatch(
			/DataField.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
		expect(getDashboardSummarySrc).toMatch(/<DataField\s/);
	});

	it('CompleteTaskView: onRenderForm uses DataField for param fields', () => {
		expect(completeTaskSrc).toMatch(
			/DataField.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
		expect(completeTaskSrc).toMatch(/<DataField\s/);
	});
});

// ---------------------------------------------------------------------------
// SR-4 — Forbidden patterns and adversarial scan
// ---------------------------------------------------------------------------

describe('SR-4: Forbidden patterns and adversarial scan', () => {
	// SR-4.1 — No @ActionView decorator uses the invalid `model` key
	// Rule: "@ActionView does not take a model key — only action"
	it('adversarial: no @ActionView decorator uses the invalid model key', () => {
		const violators = allActionFiles.filter(({ src }) => {
			const decorator =
				src.match(/@ActionView\s*\(\s*\{[^}]*\}\s*\)/)?.[0] ?? '';
			return /\bmodel\s*:/.test(decorator);
		});
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.2 — All @ActionView files import ActionView + ActionViewComponent from framework
	it('adversarial: every @ActionView-decorated file imports from @drumr/framework-frontend', () => {
		const violators = allActionFiles.filter(
			({ src }) => !/from\s+['"]@drumr\/framework-frontend['"]/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.3 — When both super.onLoad() and this.initialData appear together,
	//           super.onLoad() must come first
	// Rule: "Always await super.onLoad() before setting initialData"
	it('adversarial: every action view calls super.onLoad() before setting this.initialData', () => {
		const violators = allActionFiles.filter(({ src }) => {
			const superLoadIdx = src.indexOf('super.onLoad()');
			const initialDataIdx = src.indexOf('this.initialData');
			// Only check files that have both
			if (superLoadIdx === -1 || initialDataIdx === -1) return false;
			return superLoadIdx > initialDataIdx;
		});
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.4 — Files with onRenderForm() import DataField from framework
	//           (not render raw Ant Design inputs for param fields)
	it('adversarial: every file with onRenderForm() imports DataField from @drumr/framework-frontend', () => {
		const filesWithRenderForm = allActionFiles.filter(({ src }) =>
			/override\s+onRenderForm\s*\(/.test(src),
		);
		const violators = filesWithRenderForm.filter(
			({ src }) =>
				!/DataField.*from\s+['"]@drumr\/framework-frontend['"]/s.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.5 — beforeExecute() implementations return false (not throw) to cancel
	// Rule: "Return false from beforeExecute() to cancel — never throw"
	it('adversarial: no beforeExecute() body uses throw to cancel instead of return false', () => {
		const filesWithBeforeExecute = allActionFiles.filter(({ src }) =>
			/beforeExecute\s*\(/.test(src),
		);
		const violators = filesWithBeforeExecute.filter(({ src }) => {
			// Extract beforeExecute body (heuristic: between beforeExecute and the next override)
			const match = src.match(
				/beforeExecute\s*\([^)]*\)[^{]*\{([\s\S]*?)(?=\n\s{2}(?:protected\s+)?override|\n\s{2}[a-z])/,
			);
			const body = match?.[1] ?? '';
			return /\bthrow\s+new\s+Error\b/.test(body);
		});
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});
});
