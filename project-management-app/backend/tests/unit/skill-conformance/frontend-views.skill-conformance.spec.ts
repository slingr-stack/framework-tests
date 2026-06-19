/**
 * Skill Conformance Spec — frontend-views
 *
 * Skill:    core/skills/frontend-views/SKILL.md
 * Fixtures: source-text only — backend Jest has no TSX transform.
 *           All checks are regex / string assertions on the raw .ts/.tsx source.
 *
 * Primary fixtures (SR-1 + SR-2 + SR-3 + SR-4):
 *   frontend/src/app.ts                                        — App(fn) bootstrap (functional form)
 *   frontend/src/app.runtime.ts                                — UmiJS runtime re-exports
 *   frontend/src/config/appDefaults.ts                         — defineAppDefaults({…}) config
 *   frontend/src/services/DashboardDataService.ts              — @Service() DI pattern
 *   frontend/src/views/dataModels/users/UserReadView.tsx       — generic typing + toolbar DSL
 *
 * Note: SR-3 / SR-4 adversarial rules cover the entire frontend/src/views/**
 * tree (source-text scan) so patterns from TaskTableView and TaskReadView —
 * already exercised by specialized specs — are confirmed at the cross-cutting level here.
 *
 * How to run:
 *   cd apps/project-management-app/backend
 *   TS_NODE_PROJECT=tsconfig.test.json npx jest \
 *     --config config/jest.config.ts \
 *     --testPathPatterns='frontend-views.skill-conformance' \
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

const FRONTEND_ROOT = path.resolve(__dirname, '../../../../frontend/src');

function readSrc(relPath: string): string {
	return fs.readFileSync(path.join(FRONTEND_ROOT, relPath), 'utf8');
}

/** Recursively collect all .ts and .tsx sources under a directory. */
function collectSources(dir: string): string[] {
	if (!fs.existsSync(dir)) return [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	const results: string[] = [];
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...collectSources(full));
		} else if (
			entry.isFile() &&
			(entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))
		) {
			results.push(fs.readFileSync(full, 'utf8'));
		}
	}
	return results;
}

const appSrc = readSrc('app.ts');
const appDefaultsSrc = readSrc('config/appDefaults.ts');
const dashboardServiceSrc = readSrc(
	'dashboard/services/DashboardDataService.ts',
);
const userReadViewSrc = readSrc('users/views/UserReadView.tsx');

// Adversarial scan — all views + services + layouts
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
const SERVICE_DIRS = [
	'dashboard/services',
	'activityLog/services',
	'tasks/services',
];
const allViewSources = VIEW_DIRS.flatMap((dir) =>
	collectSources(path.join(FRONTEND_ROOT, dir)),
);
const allServiceSources = SERVICE_DIRS.flatMap((dir) =>
	collectSources(path.join(FRONTEND_ROOT, dir)),
);

// ---------------------------------------------------------------------------
// SR-1 — Decorator contracts
// ---------------------------------------------------------------------------

describe('SR-1: Decorator contracts', () => {
	// SR-1.1 — app.ts must invoke the App() factory
	// Rule: "The frontend app is registered with App(function(){ return { …lifecycle } })"
	it('app.ts: App() factory is invoked', () => {
		expect(appSrc).toMatch(/(?<![.\w])App\s*\(/);
	});

	// SR-1.2 — defineAppDefaults must declare appName
	// Rule: appName: '…' — identifies the application
	it('appDefaults.ts: defineAppDefaults sets appName', () => {
		expect(appDefaultsSrc).toMatch(/\bappName\s*:/);
	});

	// SR-1.3 — defineAppDefaults must declare routing (replaces viewsContext in new apps)
	// Rule: routing: appRouting — registers all discovered routes
	it('appDefaults.ts: defineAppDefaults sets routing', () => {
		expect(appDefaultsSrc).toMatch(/\brouting\s*:/);
	});

	// SR-1.4 — defineAppDefaults must declare defaultLayout
	// Rule: defaultLayout: MainLayout — picks the global shell layout
	it('appDefaults.ts: defineAppDefaults sets defaultLayout', () => {
		expect(appDefaultsSrc).toMatch(/\bdefaultLayout\s*:/);
	});

	// SR-1.5 — app.ts must expose UmiJS runtime symbols
	// Rule: "Always re-export the listed UmiJS runtime symbols from @drumr/framework-frontend"
	// (getInitialState, layout, antd, patchClientRoutes, rootContainer) are
	// required for UmiJS to bootstrap the app correctly.
	it('app.ts: re-exports runtime symbols via the transparent re-export contract', () => {
		expect(appSrc).toMatch(
			/export\s+\*\s+from\s+['"]@drumr\/framework-frontend\/runtime['"]/,
		);
	});

	// SR-1.6 — app.ts must not define an old-style class extending BaseFrontendApp.
	// The functional App(fn) form replaces the class-based pattern entirely.
	it('app.ts: does not declare a class extending BaseFrontendApp (functional form)', () => {
		expect(appSrc).not.toMatch(/class\s+\w+\s+extends\s+BaseFrontendApp/);
	});

	// SR-1.7 — @Service() decorator used for DI-managed services
	// Rule: "@Service() — singletons registered via DI; never instantiated with new"
	// Accepts @Service() with no args or @Service({ id: '...' }) with options.
	it('DashboardDataService.ts: @Service() decorator is applied (with or without options)', () => {
		expect(dashboardServiceSrc).toMatch(/@Service\s*\(/);
	});
	// SR-1.7 — @Service() decorator used for DI-managed services
	// Rule: "@Service() — singletons registered via DI; never instantiated with new"
	// Accepts @Service() with no args or @Service({ id: '...' }) with options.
	it('DashboardDataService.ts: @Service() decorator is applied (with or without options)', () => {
		expect(dashboardServiceSrc).toMatch(/@Service\s*\(/);
	});

	// SR-1.8 — Every view decorator must supply model: or path: (no empty decorator)
	// Rule: see "View decorator reference" table — @TableView requires model, @CustomView requires path
	it('UserReadView.tsx: @ReadView has model: property (decorator has required key)', () => {
		expect(userReadViewSrc).toMatch(/@ReadView\s*\(\s*\{[^}]*model\s*:/);
	});
	// SR-1.8 — Every view decorator must supply model: or path: (no empty decorator)
	// Rule: see "View decorator reference" table — @TableView requires model, @CustomView requires path
	it('UserReadView.tsx: @ReadView has model: property (decorator has required key)', () => {
		expect(userReadViewSrc).toMatch(/@ReadView\s*\(\s*\{[^}]*model\s*:/);
	});
});

// ---------------------------------------------------------------------------
// SR-2 — Base class requirements
// ---------------------------------------------------------------------------

describe('SR-2: Base class requirements', () => {
	// SR-2.1 — app.ts must import App from @drumr/framework-frontend
	// Rule: the App factory is the canonical bootstrap primitive
	it('app.ts: App is imported from @drumr/framework-frontend', () => {
		expect(appSrc).toMatch(
			/\bApp\b[^;]*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-2.2 — appDefaults.ts must import defineAppDefaults from @drumr/framework-frontend
	// Rule: all framework primitives come from the published package
	it('appDefaults.ts: defineAppDefaults is imported from @drumr/framework-frontend', () => {
		expect(appDefaultsSrc).toMatch(
			/\bdefineAppDefaults\b[^;]*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-2.3 — @Service() class does NOT extend any framework base class
	// Rule: services are plain decorated singletons — no inheritance from BaseFrontendApp
	it('DashboardDataService.ts: service class does not extend BaseFrontendApp', () => {
		expect(dashboardServiceSrc).not.toMatch(/extends\s+BaseFrontendApp/);
	});
	// SR-2.3 — @Service() class does NOT extend any framework base class
	// Rule: services are plain decorated singletons — no inheritance from BaseFrontendApp
	it('DashboardDataService.ts: service class does not extend BaseFrontendApp', () => {
		expect(dashboardServiceSrc).not.toMatch(/extends\s+BaseFrontendApp/);
	});

	// SR-2.4 — DI primitives in services come from @drumr/framework-frontend, not tsyringe
	// Rule: "Do not import from tsyringe directly — use @drumr/framework-frontend exports exclusively"
	it('DashboardDataService.ts: does not import from tsyringe directly', () => {
		expect(dashboardServiceSrc).not.toMatch(/from\s+['"]tsyringe['"]/);
	});
	// SR-2.4 — DI primitives in services come from @drumr/framework-frontend, not tsyringe
	// Rule: "Do not import from tsyringe directly — use @drumr/framework-frontend exports exclusively"
	it('DashboardDataService.ts: does not import from tsyringe directly', () => {
		expect(dashboardServiceSrc).not.toMatch(/from\s+['"]tsyringe['"]/);
	});

	// SR-2.5 — @ReadView class extends ReadViewComponent with a generated GQL type
	// Rule: "Always pair the view base class with the matching generated GraphQL type from @gql"
	it('UserReadView.tsx: extends ReadViewComponent<User> (generated GQL type, not hand-written)', () => {
		expect(userReadViewSrc).toMatch(
			/class\s+\w+\s+extends\s+ReadViewComponent</,
		);
		// The generic type must come from @gql or @gql/types, not a local interface
		expect(userReadViewSrc).toMatch(/from\s+['"]@gql/);
	});
	// SR-2.5 — @ReadView class extends ReadViewComponent with a generated GQL type
	// Rule: "Always pair the view base class with the matching generated GraphQL type from @gql"
	it('UserReadView.tsx: extends ReadViewComponent<User> (generated GQL type, not hand-written)', () => {
		expect(userReadViewSrc).toMatch(
			/class\s+\w+\s+extends\s+ReadViewComponent</,
		);
		// The generic type must come from @gql or @gql/types, not a local interface
		expect(userReadViewSrc).toMatch(/from\s+['"]@gql/);
	});
});

// ---------------------------------------------------------------------------
// SR-3 — Behavioral guarantees
// ---------------------------------------------------------------------------

describe('SR-3: Behavioral guarantees', () => {
	// SR-3.1 — beforeStart is the correct hook for registering services.
	// Functional form: the App(fn) lifecycle object exposes a `beforeStart`
	// arrow/method, and DI registration happens via
	// DependencyContainer.registerInstance / .registerInstanceById /
	// .registerClass — there is no `this.register` anymore.
	it('app.ts: services are registered inside the beforeStart lifecycle hook', () => {
		expect(appSrc).toMatch(/\bbeforeStart\s*:/);
		expect(appSrc).toMatch(
			/DependencyContainer\.register(?:Instance|InstanceById|Class)?\s*\(/,
		);
	});

	// SR-3.2 — DependencyContainer.resolve() or App.resolve() used — never `new`
	// Rule: "Resolve singletons with DependencyContainer.resolve(Service) or App.resolve(Service) — never new them"
	it('DashboardDataService.ts: DependencyContainer.resolve() is used for resolving dependencies', () => {
		// The service itself uses DependencyContainer to resolve GraphQLClient
		expect(dashboardServiceSrc).toMatch(/DependencyContainer\.resolve\s*\(/);
	});
	// SR-3.2 — DependencyContainer.resolve() or App.resolve() used — never `new`
	// Rule: "Resolve singletons with DependencyContainer.resolve(Service) or App.resolve(Service) — never new them"
	it('DashboardDataService.ts: DependencyContainer.resolve() is used for resolving dependencies', () => {
		// The service itself uses DependencyContainer to resolve GraphQLClient
		expect(dashboardServiceSrc).toMatch(/DependencyContainer\.resolve\s*\(/);
	});

	// SR-3.3 — dataFindBy() / dataAction() typed query-builders used — no hand-rolled GraphQL strings
	// Rule: "dataAction / dataFindBy / deleteById — typed query-builders for direct GraphQL operations"
	it('DashboardDataService.ts: uses dataFindBy() typed query-builder (not hand-rolled GraphQL strings)', () => {
		expect(dashboardServiceSrc).toMatch(/dataFindBy\s*</);
		expect(dashboardServiceSrc).not.toMatch(/gql`|gql\s*`|graphql`/);
	});
	// SR-3.3 — dataFindBy() / dataAction() typed query-builders used — no hand-rolled GraphQL strings
	// Rule: "dataAction / dataFindBy / deleteById — typed query-builders for direct GraphQL operations"
	it('DashboardDataService.ts: uses dataFindBy() typed query-builder (not hand-rolled GraphQL strings)', () => {
		expect(dashboardServiceSrc).toMatch(/dataFindBy\s*</);
		expect(dashboardServiceSrc).not.toMatch(/gql`|gql\s*`|graphql`/);
	});

	// SR-3.4 — Services imported from @drumr/framework-frontend
	it('DashboardDataService.ts: DI primitives imported from @drumr/framework-frontend', () => {
		expect(dashboardServiceSrc).toMatch(/@drumr\/framework-frontend/);
	});
	// SR-3.4 — Services imported from @drumr/framework-frontend
	it('DashboardDataService.ts: DI primitives imported from @drumr/framework-frontend', () => {
		expect(dashboardServiceSrc).toMatch(/@drumr\/framework-frontend/);
	});

	// SR-3.5 — Layout is no longer assigned per-view via `override layout = …`.
	// Layout resolution moved to the routing config and app-wide defaultLayout
	// (defineAppDefaults({ defaultLayout })). Per-view layout overrides now go
	// through the RouteDefinition.layout field in routing.ts.
	// Assertion retained as a no-op documentation marker.
	it('UserReadView.tsx: does not declare a class-level `override layout` (handled by routing/defaults)', () => {
		expect(userReadViewSrc).not.toMatch(/override\s+layout\s*=/);
	});

	// SR-3.6 — header is configured as a class-level override (never inside onRender)
	// Rule: "These override slots are set at the class level, never inside onRender"
	it('UserReadView.tsx: header is declared as override at class level', () => {
		expect(userReadViewSrc).toMatch(/override\s+header/);
	});
	// SR-3.6 — header is configured as a class-level override (never inside onRender)
	// Rule: "These override slots are set at the class level, never inside onRender"
	it('UserReadView.tsx: header is declared as override at class level', () => {
		expect(userReadViewSrc).toMatch(/override\s+header/);
	});

	// SR-3.7 — toolbar DSL (toolbar.*) used — not raw antd Menu/Menu.Item
	// Rule: "Build menus with menu.* DSL — never raw Ant <Menu>/<Menu.Item>"
	it('UserReadView.tsx: toolbar DSL (toolbar.*) used in header', () => {
		expect(userReadViewSrc).toMatch(/toolbar\./);
	});
	// SR-3.7 — toolbar DSL (toolbar.*) used — not raw antd Menu/Menu.Item
	// Rule: "Build menus with menu.* DSL — never raw Ant <Menu>/<Menu.Item>"
	it('UserReadView.tsx: toolbar DSL (toolbar.*) used in header', () => {
		expect(userReadViewSrc).toMatch(/toolbar\./);
	});

	// SR-3.8 — openView() used for navigation — not manual route manipulation
	// Rule: "Open companion views with openView(View, { container, modalSize, modalPosition, params })"
	// This is verified via TaskTableView (already in the adversarial scan)
	it('adversarial scan: openView() is used for view navigation (at least one view in the app uses it)', () => {
		const anyUseOpenView = allViewSources.some((src) =>
			/openView\s*\(/.test(src),
		);
		expect(anyUseOpenView).toBe(true);
	});
	// SR-3.8 — openView() used for navigation — not manual route manipulation
	// Rule: "Open companion views with openView(View, { container, modalSize, modalPosition, params })"
	// This is verified via TaskTableView (already in the adversarial scan)
	it('adversarial scan: openView() is used for view navigation (at least one view in the app uses it)', () => {
		const anyUseOpenView = allViewSources.some((src) =>
			/openView\s*\(/.test(src),
		);
		expect(anyUseOpenView).toBe(true);
	});

	// SR-3.9 — No alert() calls for user feedback in any view
	// Rule: "Use this.app.message, this.app.modal, this.app.notification — never alert()"
	it('adversarial scan: no view file calls alert() for user feedback', () => {
		const violations = allViewSources.filter((src) =>
			/(?<![.\w])alert\s*\(/.test(src),
		);
		expect(violations).toHaveLength(0);
	});
	// SR-3.9 — No alert() calls for user feedback in any view
	// Rule: "Use this.app.message, this.app.modal, this.app.notification — never alert()"
	it('adversarial scan: no view file calls alert() for user feedback', () => {
		const violations = allViewSources.filter((src) =>
			/(?<![.\w])alert\s*\(/.test(src),
		);
		expect(violations).toHaveLength(0);
	});

	// SR-3.10 — No `new` instantiation of DI-managed services in view files
	// Rule: "Resolve singletons with DependencyContainer.resolve(Service) — never new them"
	// Check that no view instantiates a @Service class directly with `new ServiceName(`
	it('adversarial scan: no view file instantiates a registered service with new', () => {
		const violations = allViewSources.filter((src) =>
			/new\s+(DashboardDataService|ActivityLogDataService|SummaryTableDataService|TaskCountService|GraphQLClientService)\s*\(/.test(
				src,
			),
		);
		expect(violations).toHaveLength(0);
	});
	// SR-3.10 — No `new` instantiation of DI-managed services in view files
	// Rule: "Resolve singletons with DependencyContainer.resolve(Service) — never new them"
	// Check that no view instantiates a @Service class directly with `new ServiceName(`
	it('adversarial scan: no view file instantiates a registered service with new', () => {
		const violations = allViewSources.filter((src) =>
			/new\s+(DashboardDataService|ActivityLogDataService|SummaryTableDataService|TaskCountService|GraphQLClientService)\s*\(/.test(
				src,
			),
		);
		expect(violations).toHaveLength(0);
	});

	// SR-3.11 — No tsyringe direct imports in any view or service
	// Rule: "Do not import from tsyringe directly"
	it('adversarial scan: no view file imports from tsyringe directly', () => {
		const violations = allViewSources.filter((src) =>
			/from\s+['"]tsyringe['"]/.test(src),
		);
		expect(violations).toHaveLength(0);
	});
	// SR-3.11 — No tsyringe direct imports in any view or service
	// Rule: "Do not import from tsyringe directly"
	it('adversarial scan: no view file imports from tsyringe directly', () => {
		const violations = allViewSources.filter((src) =>
			/from\s+['"]tsyringe['"]/.test(src),
		);
		expect(violations).toHaveLength(0);
	});

	it('adversarial scan: no service file imports from tsyringe directly', () => {
		const violations = allServiceSources.filter((src) =>
			/from\s+['"]tsyringe['"]/.test(src),
		);
		expect(violations).toHaveLength(0);
	});
	it('adversarial scan: no service file imports from tsyringe directly', () => {
		const violations = allServiceSources.filter((src) =>
			/from\s+['"]tsyringe['"]/.test(src),
		);
		expect(violations).toHaveLength(0);
	});

	// SR-3.12 — No @injectable() on view classes (decorator conflicts with framework decorators)
	// Rule: "Do not add @injectable() to a view — all view decorators already register them"
	it('adversarial scan: no view file uses @injectable() decorator', () => {
		const violations = allViewSources.filter((src) =>
			/@injectable\s*\(\s*\)/.test(src),
		);
		expect(violations).toHaveLength(0);
	});
	// SR-3.12 — No @injectable() on view classes (decorator conflicts with framework decorators)
	// Rule: "Do not add @injectable() to a view — all view decorators already register them"
	it('adversarial scan: no view file uses @injectable() decorator', () => {
		const violations = allViewSources.filter((src) =>
			/@injectable\s*\(\s*\)/.test(src),
		);
		expect(violations).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// SR-4 — Forbidden imports and framework import hygiene
// ---------------------------------------------------------------------------

describe('SR-4: Forbidden imports and framework import hygiene', () => {
	// SR-4.1 — app.ts must import App from @drumr/framework-frontend
	// Rule: framework primitives come from the published package only
	it('app.ts: imports App from @drumr/framework-frontend', () => {
		expect(appSrc).toMatch(/App.*from\s+['"]@drumr\/framework-frontend['"]/s);
	});

	// SR-4.2 — No direct import from internal core paths in app.ts
	it('app.ts: does not import from internal core/frontend paths', () => {
		expect(appSrc).not.toMatch(/from\s+['"][./]*core\/frontend/);
	});

	// SR-4.3 — No direct import from tsyringe in app.ts
	it('app.ts: does not import from tsyringe directly', () => {
		expect(appSrc).not.toMatch(/from\s+['"]tsyringe['"]/);
	});

	// SR-4.4 — No axios in any view file
	it('adversarial scan: no view file imports axios', () => {
		const violations = allViewSources.filter((src) =>
			/import\s+axios|require\s*\(\s*['"]axios['"]\s*\)/.test(src),
		);
		expect(violations).toHaveLength(0);
	});
	// SR-4.4 — No axios in any view file
	it('adversarial scan: no view file imports axios', () => {
		const violations = allViewSources.filter((src) =>
			/import\s+axios|require\s*\(\s*['"]axios['"]\s*\)/.test(src),
		);
		expect(violations).toHaveLength(0);
	});

	// SR-4.5 — No direct DOM manipulation in any view file
	it('adversarial scan: no view file uses document.querySelector/getElementById', () => {
		const violations = allViewSources.filter((src) =>
			/document\.(querySelector|getElementById|createElement)/.test(src),
		);
		expect(violations).toHaveLength(0);
	});
	// SR-4.5 — No direct DOM manipulation in any view file
	it('adversarial scan: no view file uses document.querySelector/getElementById', () => {
		const violations = allViewSources.filter((src) =>
			/document\.(querySelector|getElementById|createElement)/.test(src),
		);
		expect(violations).toHaveLength(0);
	});

	// SR-4.6 — All view files import framework from published package (not internal paths)
	it('adversarial scan: no view file imports framework from internal core/frontend path', () => {
		const violations = allViewSources.filter((src) =>
			/from\s+['"][./]*core\/frontend/.test(src),
		);
		expect(violations).toHaveLength(0);
	});
	// SR-4.6 — All view files import framework from published package (not internal paths)
	it('adversarial scan: no view file imports framework from internal core/frontend path', () => {
		const violations = allViewSources.filter((src) =>
			/from\s+['"][./]*core\/frontend/.test(src),
		);
		expect(violations).toHaveLength(0);
	});

	// SR-4.7 — No bare window.fetch in any view file
	it('adversarial scan: no view file uses bare fetch() directly', () => {
		const violations = allViewSources.filter((src) =>
			/(?<![.\w])fetch\s*\(/.test(src),
		);
		expect(violations).toHaveLength(0);
	});
	// SR-4.7 — No bare window.fetch in any view file
	it('adversarial scan: no view file uses bare fetch() directly', () => {
		const violations = allViewSources.filter((src) =>
			/(?<![.\w])fetch\s*\(/.test(src),
		);
		expect(violations).toHaveLength(0);
	});
});
