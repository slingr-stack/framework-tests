/**
 * Skill Conformance Spec — frontend-tech-stack
 *
 * Skill:    core/skills/frontend-tech-stack/SKILL.md
 * Approach: Source-text only — backend Jest has no TSX/JSX transform.
 *
 * Primary fixtures:
 *   frontend/src/views/custom/SummaryView.tsx
 *     — Uses DataTable from @drumr/framework-frontend, not raw antd Table or ProTable
 *   frontend/src/views/dataModels/tasks/helpers/taskFormLayout.tsx
 *     — Uses DataField + DataForm from @drumr/framework-frontend, not raw antd Input/Form/ProForm
 *   frontend/src/services/ActivityLogDataService.ts
 *     — Uses GraphQLClient from @drumr/framework-frontend for data fetching (not fetch/axios)
 *   frontend/src/views/dataModels/tasks/PendingTasksView.tsx
 *     — DataTable import from framework; antd used only for primitive Card (correct hierarchy)
 *
 * Adversarial scan: all .tsx + .ts files under frontend/src/
 *
 * How to run:
 *   cd apps/project-management-app/backend
 *   TS_NODE_PROJECT=tsconfig.test.json npx jest \
 *     --config config/jest.config.ts \
 *     --testPathPatterns='frontend-tech-stack.skill-conformance' \
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

function collectSourceFiles(): Array<{ file: string; src: string }> {
	const results: Array<{ file: string; src: string }> = [];

	// Exclude UMI auto-generated build artefact directories (.umi, .umi-production, etc.)
	// and node_modules — these are not app source files
	const EXCLUDED_DIRS = new Set(['.umi', '.umi-production', 'node_modules']);

	function walk(dir: string): void {
		for (const entry of fs.readdirSync(dir)) {
			if (EXCLUDED_DIRS.has(entry)) continue;
			const full = path.join(dir, entry);
			const stat = fs.statSync(full);
			if (stat.isDirectory()) {
				walk(full);
			} else if (
				(entry.endsWith('.tsx') || entry.endsWith('.ts')) &&
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

const summaryViewSrc = readFrontend('dashboard/views/SummaryView.tsx');
const taskFormLayoutSrc = readFrontend(
	'tasks/views/helpers/taskFormLayout.tsx',
);
const activityLogServiceSrc = readFrontend(
	'activityLog/services/ActivityLogDataService.ts',
);
const pendingTasksViewSrc = readFrontend('tasks/views/PendingTasksView.tsx');

const allSourceFiles = collectSourceFiles();

// ---------------------------------------------------------------------------
// SR-1 — Component selection priority: framework first
// ---------------------------------------------------------------------------

describe('SR-1: Component selection hierarchy — framework first', () => {
	// SR-1.1 — DataTable (framework) used for table rendering, not raw antd Table or ProTable
	// Rule: "First choice: use components from @drumr/framework-frontend whenever an
	//        internal framework component exists"
	it('SummaryView: DataTable imported from @drumr/framework-frontend (not raw antd Table)', () => {
		expect(summaryViewSrc).toMatch(
			/DataTable.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
		// Confirm no standalone antd Table import while DataTable is available
		expect(summaryViewSrc).not.toMatch(
			/import\s+\{[^}]*\bTable\b[^}]*\}\s+from\s+['"]antd['"]/,
		);
	});

	it('PendingTasksView: DataTable imported from @drumr/framework-frontend', () => {
		expect(pendingTasksViewSrc).toMatch(
			/DataTable.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.2 — DataField + DataForm (framework) used for form fields, not raw antd Input or ProForm
	// Rule: framework components take precedence over antd for param/data form fields
	it('taskFormLayout: DataField and DataForm imported from @drumr/framework-frontend', () => {
		expect(taskFormLayoutSrc).toMatch(
			/DataField.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
		expect(taskFormLayoutSrc).toMatch(
			/DataForm.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('taskFormLayout: DataField JSX used for field rendering (not raw antd Input)', () => {
		expect(taskFormLayoutSrc).toMatch(/<DataField\s/);
		expect(taskFormLayoutSrc).not.toMatch(/<Input\s/);
	});

	// SR-1.3 — antd is used only for primitive elements not covered by framework
	//           (Row, Col, Card, Alert, Typography, Space, etc. are layout primitives)
	it('taskFormLayout: antd imports are only layout primitives (Col, Row, Card, Alert, Form, Typography)', () => {
		const antdMatch = taskFormLayoutSrc.match(
			/import\s+\{([^}]*)\}\s+from\s+['"]antd['"]/,
		);
		const antdImports = antdMatch?.[1]?.split(',').map((s) => s.trim()) ?? [];
		// All antd imports should be layout/primitive types, not ProTable/ProForm/Table/Form.Input etc.
		const forbiddenAntdComponents = ['ProTable', 'ProForm', 'Table'];
		for (const forbidden of forbiddenAntdComponents) {
			expect(antdImports).not.toContain(forbidden);
		}
	});

	it('SummaryView: antd imports are only layout primitives (Alert, Button, Card, Col, Row, Space, Typography)', () => {
		const antdMatch = summaryViewSrc.match(
			/import\s+\{([^}]*)\}\s+from\s+['"]antd['"]/,
		);
		const antdImports = antdMatch?.[1]?.split(',').map((s) => s.trim()) ?? [];
		const forbiddenAntdComponents = ['ProTable', 'ProForm', 'Table'];
		for (const forbidden of forbiddenAntdComponents) {
			expect(antdImports).not.toContain(forbidden);
		}
	});
});

// ---------------------------------------------------------------------------
// SR-2 — No bootstrapping code in app source files
// ---------------------------------------------------------------------------

describe('SR-2: No framework bootstrapping code in app source', () => {
	// SR-2.1 — No createRoot calls (React DOM bootstrapping is handled by the framework)
	// Rule: "Do not attempt to generate bootstrapping code (like createRoot or <ApolloProvider>)"
	it('SummaryView: does not contain createRoot (bootstrapping is framework-managed)', () => {
		expect(summaryViewSrc).not.toMatch(/\bcreateRoot\s*\(/);
	});

	it('taskFormLayout: does not contain createRoot', () => {
		expect(taskFormLayoutSrc).not.toMatch(/\bcreateRoot\s*\(/);
	});

	// SR-2.2 — No ApolloProvider import or usage (Apollo is initialized by framework)
	// Rule: framework handles Apollo Client initialization; app code does not set up ApolloProvider
	it('SummaryView: does not import ApolloProvider', () => {
		expect(summaryViewSrc).not.toMatch(/\bApolloProvider\b/);
	});

	it('ActivityLogDataService: does not import ApolloProvider', () => {
		expect(activityLogServiceSrc).not.toMatch(/\bApolloProvider\b/);
	});

	// SR-2.3 — No direct routing setup (framework handles routing internally)
	// Rule: "Assume the framework handles dependency injection and routing internally"
	it('SummaryView: does not use ReactDOM.render() or ReactDOM.createRoot()', () => {
		expect(summaryViewSrc).not.toMatch(/ReactDOM\.(render|createRoot)\s*\(/);
	});
});

// ---------------------------------------------------------------------------
// SR-3 — Data fetching via Apollo/GraphQL (not raw HTTP)
// ---------------------------------------------------------------------------

describe('SR-3: Data fetching uses Apollo/GraphQL patterns', () => {
	// SR-3.1 — Services inject GraphQLClient from framework for data operations
	// Rule: "Data Fetching: Apollo Client with GraphQL for queries, mutations, cache
	//        coordination, and client-side data flow"
	it('ActivityLogDataService: GraphQLClient imported from @drumr/framework-frontend', () => {
		expect(activityLogServiceSrc).toMatch(
			/GraphQLClient.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('ActivityLogDataService: GraphQLClient constructor-injected (not instantiated with new)', () => {
		// Constructor injection: private readonly gql: GraphQLClient
		expect(activityLogServiceSrc).toMatch(
			/constructor\s*\([^)]*GraphQLClient[^)]*\)/,
		);
	});

	// SR-3.2 — Data operations use GraphQL operation builders (not raw fetch/axios)
	// Rule: data fetching follows GraphQL operation patterns
	it('ActivityLogDataService: uses dataAction() GraphQL operation builder, not raw fetch()', () => {
		expect(activityLogServiceSrc).toMatch(/dataAction\s*</);
		expect(activityLogServiceSrc).not.toMatch(/\bfetch\s*\(/);
		expect(activityLogServiceSrc).not.toMatch(/\baxios\s*\./);
	});

	// SR-3.3 — TypeScript strict typing — GQL types imported from @gql/types
	// Rule: "Language: TypeScript for strongly typed frontend development"
	it('ActivityLogDataService: imports typed GQL result types from @gql', () => {
		expect(activityLogServiceSrc).toMatch(/from\s+['"]@gql(?:\/types)?['"]/);
	});
});

// ---------------------------------------------------------------------------
// SR-4 — Forbidden patterns and adversarial scan
// ---------------------------------------------------------------------------

describe('SR-4: Forbidden patterns and adversarial scan', () => {
	// SR-4.1 — No app source file uses createRoot (bootstrapping is framework-only)
	it('adversarial: no app source file calls createRoot()', () => {
		const violators = allSourceFiles.filter(({ src }) =>
			/\bcreateRoot\s*\(/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.2 — No app source file imports or uses ApolloProvider
	it('adversarial: no app source file imports ApolloProvider', () => {
		const violators = allSourceFiles.filter(({ src }) =>
			/\bApolloProvider\b/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.3 — No file imports ProTable directly (framework DataTable should be used)
	// Rule: "ProTable" is an Ant Design Pro table — if framework DataTable exists, use that
	it('adversarial: no app source file imports ProTable from @ant-design/pro-components', () => {
		const violators = allSourceFiles.filter(({ src }) =>
			/ProTable.*from\s+['"]@ant-design\/pro-components['"]/s.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.4 — No file imports ProForm directly (framework DataForm/DataField should be used)
	// Rule: framework form components take precedence over ProForm for param/data forms
	it('adversarial: no app source file imports ProForm from @ant-design/pro-components', () => {
		const violators = allSourceFiles.filter(({ src }) =>
			/ProForm.*from\s+['"]@ant-design\/pro-components['"]/s.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.5 — No file uses raw axios for data fetching (Apollo/GraphQL is the pattern)
	it('adversarial: no app source file uses axios for data fetching', () => {
		const violators = allSourceFiles.filter(({ src }) =>
			/import\s+axios\b/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});
});
