/**
 * Skill Conformance Spec — frontend-services
 *
 * Skill:    core/skills/frontend-services/SKILL.md
 * Approach: Source-text only — backend Jest has no TSX/JSX transform.
 *
 * Primary fixtures:
 *   frontend/src/services/DashboardDataService.ts
 *     — @Service({ id: 'dashboardDataService' }), DependencyContainer.resolve in helper fn
 *   frontend/src/services/ActivityLogDataService.ts
 *     — bare @Service(), constructor injection of GraphQLClient
 *   frontend/src/services/GraphQLClientService.ts
 *     — @Service() no constructor deps; imported from @drumr/framework-frontend
 *   frontend/src/views/custom/ActivityLogView.tsx
 *     — DependencyContainer.resolve() in class field (not new Service())
 *   frontend/src/views/custom/DashboardView.tsx
 *     — DependencyContainer.resolveById() for ID-based dynamic resolution
 *
 * Adversarial scan: all .ts/.tsx files under frontend/src/
 *
 * How to run:
 *   cd apps/project-management-app/backend
 *   TS_NODE_PROJECT=tsconfig.test.json npx jest \
 *     --config config/jest.config.ts \
 *     --testPathPatterns='frontend-services.skill-conformance' \
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

const dashboardSvcSrc = readFrontend(
	'dashboard/services/DashboardDataService.ts',
);
const activitySvcSrc = readFrontend(
	'activityLog/services/ActivityLogDataService.ts',
);
const gqlClientSvcSrc = readFrontend('shared/GraphQLClientService.ts');
const activityViewSrc = readFrontend('activityLog/views/ActivityLogView.tsx');
const dashboardViewSrc = readFrontend('dashboard/views/DashboardView.tsx');

const allFrontendFiles = collectFrontendSources();

// ---------------------------------------------------------------------------
// SR-1 — @Service decorator and import contracts
// ---------------------------------------------------------------------------

describe('SR-1: @Service decorator and import contracts', () => {
	// SR-1.1 — @Service() imported from @drumr/framework-frontend
	// Rule: "import { Service } from '@drumr/framework-frontend'"
	it('DashboardDataService: Service imported from @drumr/framework-frontend', () => {
		expect(dashboardSvcSrc).toMatch(
			/Service.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('ActivityLogDataService: Service imported from @drumr/framework-frontend', () => {
		expect(activitySvcSrc).toMatch(
			/Service.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('GraphQLClientService: Service imported from @drumr/framework-frontend', () => {
		expect(gqlClientSvcSrc).toMatch(
			/Service.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.2 — @Service() decorator applied to service classes
	// Rule: "Singleton service with @Service()" — all services decorated
	it('DashboardDataService: @Service({ id }) decorator applied', () => {
		expect(dashboardSvcSrc).toMatch(/@Service\s*\(\s*\{/);
	});

	it('ActivityLogDataService: bare @Service() decorator applied', () => {
		expect(activitySvcSrc).toMatch(/@Service\s*\(/);
	});

	it('GraphQLClientService: @Service() decorator applied', () => {
		expect(gqlClientSvcSrc).toMatch(/@Service\s*\(/);
	});

	// SR-1.3 — @Service({ id: '...' }) uses a string id for named services
	// Rule: "Use explicit IDs only when runtime dynamic lookup is required"
	it('DashboardDataService: @Service has explicit string id (dashboardDataService)', () => {
		expect(dashboardSvcSrc).toMatch(
			/@Service\s*\(\s*\{[^}]*id\s*:\s*['"]dashboardDataService['"]/,
		);
	});

	// SR-1.4 — DependencyContainer imported from @drumr/framework-frontend
	// Rule: "Resolve services from the container in view classes"
	it('ActivityLogView: DependencyContainer imported from @drumr/framework-frontend', () => {
		expect(activityViewSrc).toMatch(
			/DependencyContainer.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.5 — No tsyringe direct import in service files
	// Rule: DI managed by framework package — never import tsyringe directly
	it('DashboardDataService: does not import from tsyringe directly', () => {
		expect(dashboardSvcSrc).not.toMatch(/from\s+['"]tsyringe['"]/);
	});

	it('ActivityLogDataService: does not import from tsyringe directly', () => {
		expect(activitySvcSrc).not.toMatch(/from\s+['"]tsyringe['"]/);
	});
});

// ---------------------------------------------------------------------------
// SR-2 — Constructor injection pattern
// ---------------------------------------------------------------------------

describe('SR-2: Constructor injection pattern', () => {
	// SR-2.1 — Services with dependencies use constructor injection
	// Rule: "Prefer constructor injection over manual container access inside methods"
	it('DashboardDataService: GraphQLClient constructor-injected', () => {
		expect(dashboardSvcSrc).toMatch(
			/constructor\s*\([^)]*GraphQLClient[^)]*\)/,
		);
	});

	it('ActivityLogDataService: GraphQLClient constructor-injected', () => {
		expect(activitySvcSrc).toMatch(/constructor\s*\([^)]*GraphQLClient[^)]*\)/);
	});

	// SR-2.2 — Constructor-injected dependency stored as readonly private field
	// Rule: "constructor(private readonly gql: GraphQLClient) {}"
	it('DashboardDataService: injected GraphQLClient stored as readonly private field', () => {
		expect(dashboardSvcSrc).toMatch(
			/private\s+readonly\s+\w+\s*:\s*GraphQLClient/,
		);
	});

	it('ActivityLogDataService: injected GraphQLClient stored as readonly private field', () => {
		expect(activitySvcSrc).toMatch(
			/private\s+readonly\s+\w+\s*:\s*GraphQLClient/,
		);
	});

	// SR-2.3 — No new Service() in constructor body (injection, not manual instantiation)
	// Rule: "Do not instantiate service classes with new" — DI manages it
	it('DashboardDataService: constructor does not call new on any service', () => {
		const ctorMatch = dashboardSvcSrc.match(
			/constructor\s*\([^)]*\)\s*\{([^}]*)\}/s,
		);
		const ctorBody = ctorMatch?.[1] ?? '';
		expect(ctorBody).not.toMatch(/new\s+\w+Service\s*\(/);
	});
});

// ---------------------------------------------------------------------------
// SR-3 — DependencyContainer consumption in views
// ---------------------------------------------------------------------------

describe('SR-3: DependencyContainer consumption in views', () => {
	// SR-3.1 — DependencyContainer.resolve() used in view (not new Service())
	// Rule: "Resolve services from the container in view classes. Do not instantiate with new."
	it('ActivityLogView: uses DependencyContainer.resolve() to get service (not new)', () => {
		expect(activityViewSrc).toMatch(/DependencyContainer\.resolve\s*\(/);
		// Confirm it does NOT new the service
		expect(activityViewSrc).not.toMatch(/new\s+ActivityLogDataService\s*\(/);
	});

	// SR-3.2 — DependencyContainer.resolveById() used for ID-based dynamic resolution
	// Rule: "Use ID-based resolution only for dynamic or plugin-like dispatch"
	it('DashboardView: uses DependencyContainer.resolveById() for named service lookup', () => {
		expect(dashboardViewSrc).toMatch(/DependencyContainer\.resolveById\s*\(/);
	});

	it('DashboardView: resolveById called with the dashboardDataService id', () => {
		expect(dashboardViewSrc).toMatch(
			/resolveById\s*\(\s*['"]dashboardDataService['"]/,
		);
	});

	// SR-3.3 — No view creates a service with new
	// Rule: Anti-pattern — "Instantiating service classes manually with new in views"
	it('ActivityLogView: does not instantiate ActivityLogDataService with new', () => {
		expect(activityViewSrc).not.toMatch(/new\s+ActivityLogDataService\s*\(/);
	});

	it('DashboardView: does not instantiate DashboardDataService with new', () => {
		expect(dashboardViewSrc).not.toMatch(/new\s+DashboardDataService\s*\(/);
	});

	// SR-3.4 — Service resolved in class field (immediately available), not inside render/onRender
	// Rule: "Resolve services from the container in view classes" — class field resolution is correct
	it('ActivityLogView: DependencyContainer.resolve() used at class field level (not inside render)', () => {
		// Matches "private readonly ... = DependencyContainer.resolve(...)" class field pattern
		expect(activityViewSrc).toMatch(
			/private\s+readonly\s+\w+\s*=\s*DependencyContainer\.resolve\s*\(/,
		);
	});

	// SR-3.5 — DependencyContainer.resolve helper factory in service module
	// Rule: skill example shows a factory helper: "export function getDashboardDataService()"
	// DashboardDataService.ts exports a getDashboardDataService() factory that wraps resolve()
	it('DashboardDataService: exports a factory helper that calls DependencyContainer.resolve', () => {
		expect(dashboardSvcSrc).toMatch(
			/DependencyContainer\.resolve\s*\(\s*DashboardDataService\s*\)/,
		);
	});
});

// ---------------------------------------------------------------------------
// SR-4 — Forbidden patterns and adversarial scan
// ---------------------------------------------------------------------------

describe('SR-4: Forbidden patterns and adversarial scan', () => {
	// SR-4.1 — No view or service file instantiates a service class with new
	// Rule: Anti-pattern — "Instantiating service classes manually with new in views"
	it('adversarial: no view file directly instantiates a *Service class with new', () => {
		const viewFiles = allFrontendFiles.filter(
			({ file }) => file.startsWith('views/') || file.startsWith('layouts/'),
		);
		const violators = viewFiles.filter(({ src }) =>
			/\bnew\s+\w+(?:Service|DataService)\s*\(/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.2 — No service file imports from tsyringe directly
	it('adversarial: no service file imports from tsyringe directly', () => {
		const serviceFiles = allFrontendFiles.filter(({ file }) =>
			file.startsWith('services/'),
		);
		const violators = serviceFiles.filter(({ src }) =>
			/from\s+['"]tsyringe['"]/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.3 — No service file imports from internal core/frontend path
	it('adversarial: no service file imports from internal core/frontend path', () => {
		const serviceFiles = allFrontendFiles.filter(({ file }) =>
			file.startsWith('services/'),
		);
		const violators = serviceFiles.filter(({ src }) =>
			/from\s+['"][./]*core\/frontend/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.4 — All @Service-decorated files import Service from @drumr/framework-frontend
	// (not from a custom barrel or another package)
	it('adversarial: every file that uses @Service imports it from @drumr/framework-frontend', () => {
		const serviceDecoratedFiles = allFrontendFiles.filter(({ src }) =>
			/@Service\s*\(/.test(src),
		);
		// Check: file uses @Service( AND has a matching import — checked independently
		// (import appears before the decorator, so order-dependent regex fails)
		const violators = serviceDecoratedFiles.filter(
			({ src }) => !/from\s+['"]@drumr\/framework-frontend['"]/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.5 — No service mixes navigation (openView) with data fetching
	// Rule: Anti-pattern — "Mixing unrelated concerns in one service (transport + UI state + navigation)"
	it('adversarial: no service file imports openView from framework (navigation in services is an anti-pattern)', () => {
		const serviceFiles = allFrontendFiles.filter(({ file }) =>
			file.startsWith('services/'),
		);
		const violators = serviceFiles.filter(({ src }) =>
			/\bopenView\b/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});
});
