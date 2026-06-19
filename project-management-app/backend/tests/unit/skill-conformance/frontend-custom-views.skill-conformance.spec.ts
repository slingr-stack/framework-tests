/**
 * Skill Conformance Spec — frontend-custom-views
 *
 * Skill:    core/skills/frontend-custom-views/SKILL.md
 * Approach: Source-text only — backend Jest has no TSX/JSX transform.
 *
 * Primary fixtures:
 *   frontend/src/views/custom/ActivityLogView.tsx
 *     — @CustomView({ path }), extends CustomViewComponent, override header: ViewHeaderConfig,
 *       override onLoad(), override onRender(), override state, this.setState()
 *   frontend/src/views/custom/DashboardView.tsx
 *     — @CustomView({ path: '/' }), extends CustomViewComponent, override header: ViewHeaderConfig,
 *       override onLoad(), override onRender(), this.openView() for navigation
 *   frontend/src/views/custom/SummaryView.tsx
 *     — @CustomView({ path }), extends CustomViewComponent, override onRender(),
 *       this.app.message.info() (not direct antd message.*), this.openView() for modal
 *
 * Adversarial scan: all .tsx files under frontend/src/views/
 *
 * How to run:
 *   cd apps/project-management-app/backend
 *   TS_NODE_PROJECT=tsconfig.test.json npx jest \
 *     --config config/jest.config.ts \
 *     --testPathPatterns='frontend-custom-views.skill-conformance' \
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

const activityLogViewSrc = readFrontend(
	'activityLog/views/ActivityLogView.tsx',
);
const dashboardViewSrc = readFrontend('dashboard/views/DashboardView.tsx');
const summaryViewSrc = readFrontend('dashboard/views/SummaryView.tsx');

const allViewFiles = collectViewSources();

// ---------------------------------------------------------------------------
// SR-1 — @CustomView decorator and import contracts
// ---------------------------------------------------------------------------

describe('SR-1: @CustomView decorator and import contracts', () => {
	// SR-1.1 — @CustomView and CustomViewComponent imported from @drumr/framework-frontend
	// Rule: "import { CustomView, CustomViewComponent } from '@drumr/framework-frontend'"
	it('ActivityLogView: CustomView and CustomViewComponent imported from @drumr/framework-frontend', () => {
		expect(activityLogViewSrc).toMatch(
			/CustomView.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
		expect(activityLogViewSrc).toMatch(
			/CustomViewComponent.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('DashboardView: CustomView and CustomViewComponent imported from @drumr/framework-frontend', () => {
		expect(dashboardViewSrc).toMatch(
			/CustomView.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
		expect(dashboardViewSrc).toMatch(
			/CustomViewComponent.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('SummaryView: CustomView and CustomViewComponent imported from @drumr/framework-frontend', () => {
		expect(summaryViewSrc).toMatch(
			/CustomView.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
		expect(summaryViewSrc).toMatch(
			/CustomViewComponent.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.2 — @CustomView decorator has path option (required)
	// Rule: "path — Route path. Required."
	it('ActivityLogView: @CustomView has path option', () => {
		expect(activityLogViewSrc).toMatch(/@CustomView\s*\(\s*\{[^}]*path\s*:/);
	});

	it('DashboardView: @CustomView has path option', () => {
		expect(dashboardViewSrc).toMatch(/@CustomView\s*\(\s*\{[^}]*path\s*:/);
	});

	// SR-1.3 — No `name` in @CustomView decorator
	// Rule: "Do not use `name` in @CustomView(...) — it is not part of CustomViewOptions"
	it('ActivityLogView: @CustomView does not use the invalid name option', () => {
		// Extract just the decorator call to limit scope
		const decoratorMatch = activityLogViewSrc.match(
			/@CustomView\s*\(\s*\{[^}]*\}\s*\)/,
		);
		const decorator = decoratorMatch?.[0] ?? '';
		expect(decorator).not.toMatch(/\bname\s*:/);
	});

	it('DashboardView: @CustomView does not use the invalid name option', () => {
		const decoratorMatch = dashboardViewSrc.match(
			/@CustomView\s*\(\s*\{[^}]*\}\s*\)/,
		);
		const decorator = decoratorMatch?.[0] ?? '';
		expect(decorator).not.toMatch(/\bname\s*:/);
	});

	// SR-1.4 — ViewHeaderConfig type-imported from @drumr/framework-frontend
	// Rule: "Prefer class-level override header: ViewHeaderConfig = ..."
	it('ActivityLogView: ViewHeaderConfig imported from @drumr/framework-frontend', () => {
		expect(activityLogViewSrc).toMatch(
			/ViewHeaderConfig.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('DashboardView: ViewHeaderConfig imported from @drumr/framework-frontend', () => {
		expect(dashboardViewSrc).toMatch(
			/ViewHeaderConfig.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});
});

// ---------------------------------------------------------------------------
// SR-2 — CustomViewComponent extension and structural constraints
// ---------------------------------------------------------------------------

describe('SR-2: CustomViewComponent extension and structural constraints', () => {
	// SR-2.1 — All custom view classes extend CustomViewComponent
	// Rule: "Always extend CustomViewComponent"
	it('ActivityLogView: extends CustomViewComponent', () => {
		expect(activityLogViewSrc).toMatch(
			/class\s+ActivityLogView\s+extends\s+CustomViewComponent/,
		);
	});

	it('DashboardView: extends CustomViewComponent', () => {
		expect(dashboardViewSrc).toMatch(
			/class\s+DashboardView\s+extends\s+CustomViewComponent/,
		);
	});

	it('SummaryView: extends CustomViewComponent', () => {
		expect(summaryViewSrc).toMatch(
			/class\s+SummaryView\s+extends\s+CustomViewComponent/,
		);
	});

	// SR-2.2 — override header declared at class level (not in decorator)
	// Rule: "Prefer class-level override header: ViewHeaderConfig for standard views"
	it('ActivityLogView: header declared with override keyword and ViewHeaderConfig type', () => {
		expect(activityLogViewSrc).toMatch(
			/override\s+header\s*:\s*ViewHeaderConfig/,
		);
	});

	it('DashboardView: header declared with override keyword and ViewHeaderConfig type', () => {
		expect(dashboardViewSrc).toMatch(
			/override\s+header\s*:\s*ViewHeaderConfig/,
		);
	});

	// SR-2.3 — onRender() implemented with override keyword (required lifecycle hook)
	// Rule: "Always implement onRender() — only content hook"
	it('ActivityLogView: onRender() declared with override keyword', () => {
		expect(activityLogViewSrc).toMatch(/override\s+onRender\s*\(\s*\)/);
	});

	it('DashboardView: onRender() declared with override keyword', () => {
		expect(dashboardViewSrc).toMatch(/override\s+onRender\s*\(\s*\)/);
	});

	it('SummaryView: onRender() declared with override keyword', () => {
		expect(summaryViewSrc).toMatch(/override\s+onRender\s*\(\s*\)/);
	});

	// SR-2.4 — No override of render(), componentDidMount, componentWillUnmount, componentDidUpdate
	// Rule: "Never override render(), componentDidMount, componentWillUnmount, componentDidUpdate"
	it('ActivityLogView: does not override render() or React lifecycle methods', () => {
		expect(activityLogViewSrc).not.toMatch(/override\s+render\s*\(\s*\)/);
		expect(activityLogViewSrc).not.toMatch(
			/override\s+componentDidMount\s*\(\s*\)/,
		);
		expect(activityLogViewSrc).not.toMatch(
			/override\s+componentWillUnmount\s*\(\s*\)/,
		);
	});

	it('DashboardView: does not override render() or React lifecycle methods', () => {
		expect(dashboardViewSrc).not.toMatch(/override\s+render\s*\(\s*\)/);
		expect(dashboardViewSrc).not.toMatch(
			/override\s+componentDidMount\s*\(\s*\)/,
		);
		expect(dashboardViewSrc).not.toMatch(
			/override\s+componentWillUnmount\s*\(\s*\)/,
		);
	});
});

// ---------------------------------------------------------------------------
// SR-3 — Lifecycle hook and navigation behavioral guarantees
// ---------------------------------------------------------------------------

describe('SR-3: Lifecycle hook and navigation behavioral guarantees', () => {
	// SR-3.1 — onLoad() used for initial data fetching (not componentDidMount)
	// Rule: "onLoad() — After component mounts: fetch data, set up subscriptions"
	it('ActivityLogView: onLoad() declared with override keyword (framework lifecycle for data fetch)', () => {
		expect(activityLogViewSrc).toMatch(/override\s+onLoad\s*\(\s*\)/);
	});

	it('DashboardView: onLoad() declared with override keyword', () => {
		expect(dashboardViewSrc).toMatch(/override\s+onLoad\s*\(\s*\)/);
	});

	// SR-3.2 — this.setState() used for state updates (not direct mutation)
	// Rule: "Set state with this.setState()" — standard React class component update
	it('ActivityLogView: uses this.setState() for state updates', () => {
		expect(activityLogViewSrc).toMatch(/this\.setState\s*\(/);
	});

	it('DashboardView: uses this.setState() for state updates', () => {
		expect(dashboardViewSrc).toMatch(/this\.setState\s*\(/);
	});

	// SR-3.3 — this.openView() used for navigation (not router.push or window.location)
	// Rule: "Use this.openView instead of manual route pushes"
	it('DashboardView: uses this.openView() for navigation', () => {
		expect(dashboardViewSrc).toMatch(/this\.openView\s*\(/);
		expect(dashboardViewSrc).not.toMatch(/window\.location\.href\s*=/);
	});

	it('SummaryView: uses this.openView() for navigation to modal', () => {
		expect(summaryViewSrc).toMatch(/this\.openView\s*\(/);
	});

	// SR-3.4 — this.app.message used for notifications (not direct antd message.*)
	// Rule: "Notify via this.app.message — direct antd message.* calls break Ant Design App context"
	it('SummaryView: uses this.app.message.info() for notifications (not direct antd message.*)', () => {
		expect(summaryViewSrc).toMatch(/this\.app\.message\./);
		// Confirm no bare `message.info(` or `message.success(` calls (antd's static message)
		expect(summaryViewSrc).not.toMatch(
			/(?<![this.app.])message\.(info|success|error|warning)\s*\(/,
		);
	});

	// SR-3.5 — override state declares the typed state interface (not class field without override)
	// Rule: state is a class property — consistent with CustomViewComponent pattern
	it('ActivityLogView: state declared with override keyword', () => {
		expect(activityLogViewSrc).toMatch(/override\s+state\s*:/);
	});

	it('DashboardView: state declared with override keyword', () => {
		expect(dashboardViewSrc).toMatch(/override\s+state\s*:/);
	});
});

// ---------------------------------------------------------------------------
// SR-4 — Forbidden patterns and adversarial scan
// ---------------------------------------------------------------------------

describe('SR-4: Forbidden patterns and adversarial scan', () => {
	// SR-4.1 — No view uses useParams() (React hook — not available in class components)
	// Rule: "Use this.getParams() / this.getQuery() — not useParams / useSearchParams"
	it('adversarial: no view file uses the useParams React hook', () => {
		const violators = allViewFiles.filter(({ src }) =>
			/\buseParams\s*\(/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.2 — No view overrides render() directly
	// Rule: "Never override render() — base render() integrates PageContainer"
	it('adversarial: no view file overrides render() instead of onRender()', () => {
		const violators = allViewFiles.filter(({ src }) =>
			/override\s+render\s*\(\s*\)/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.3 — No CustomView-decorated class uses `name` in decorator
	// Rule: "Do not use `name` in @CustomView(...) — not a valid property of CustomViewOptions"
	it('adversarial: no @CustomView decorator uses the invalid name option', () => {
		const customViewFiles = allViewFiles.filter(({ src }) =>
			/@CustomView\s*\(/.test(src),
		);
		const violators = customViewFiles.filter(({ src }) => {
			const decoratorMatch = src.match(/@CustomView\s*\(\s*\{[^}]*\}\s*\)/);
			const decorator = decoratorMatch?.[0] ?? '';
			return /\bname\s*:/.test(decorator);
		});
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.4 — All CustomView-decorated files import from @drumr/framework-frontend
	it('adversarial: every @CustomView-decorated file imports from @drumr/framework-frontend', () => {
		const customViewFiles = allViewFiles.filter(({ src }) =>
			/@CustomView\s*\(/.test(src),
		);
		const violators = customViewFiles.filter(
			({ src }) => !/from\s+['"]@drumr\/framework-frontend['"]/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.5 — No view uses window.location for navigation
	// Rule: Anti-pattern — "Use openView instead of manual route pushes"
	it('adversarial: no view file uses window.location.href assignment for navigation', () => {
		const violators = allViewFiles.filter(({ src }) =>
			/window\.location\.href\s*=/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});
});
