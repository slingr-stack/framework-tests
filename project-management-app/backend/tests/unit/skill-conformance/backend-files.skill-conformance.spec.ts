/**
 * Skill Conformance Spec — backend-files
 *
 * Skill:    core/skills/backend-files/SKILL.md
 * Approach: Source-text only — reads .ts files as strings.
 *
 * Primary fixtures:
 *   backend/src/dataModels/File.ts
 *     — concrete "class File extends AppFile", @DataModel with crud/ui, @TextField for description
 *   backend/src/dataModels/Task.ts
 *     — @ReferenceField({ type: () => File }) for File[] attachments array, fileInput() component
 *   backend/src/dataModels/ProjectReport.ts
 *     — @ReferenceField({ type: () => File }) required single-file field, fileLabel()/fileInput()
 *   backend/src/auth/permissions.ts
 *     — can('access', File) + can('read', File) granted alongside model with file references
 *
 * Adversarial scan: all .ts files under backend/src/
 *
 * How to run:
 *   cd apps/project-management-app/backend
 *   TS_NODE_PROJECT=tsconfig.test.json npx jest \
 *     --config config/jest.config.ts \
 *     --testPathPatterns='backend-files.skill-conformance' \
 *     --no-coverage --verbose
 *
 * SkillScore: C=3, K=3, D=3, R=2 → (3×0.40 + 3×0.20 + 3×0.20 + 2×0.20) × 33.33 = 93.3
 * Threshold:  optional ≥ 65 ✅
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const BACKEND_SRC = path.resolve(__dirname, '../../../src');

function readBackend(rel: string): string {
	return fs.readFileSync(path.join(BACKEND_SRC, rel), 'utf8');
}

function collectBackendSources(): Array<{ file: string; src: string }> {
	const results: Array<{ file: string; src: string }> = [];

	function walk(dir: string): void {
		for (const entry of fs.readdirSync(dir)) {
			const full = path.join(dir, entry);
			const stat = fs.statSync(full);
			if (stat.isDirectory()) {
				walk(full);
			} else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
				results.push({
					file: path.relative(BACKEND_SRC, full),
					src: fs.readFileSync(full, 'utf8'),
				});
			}
		}
	}

	walk(BACKEND_SRC);
	return results;
}

const fileModelSrc = readBackend('support/data-models/file.data-model.ts');
const taskModelSrc = readBackend('tasks/data-models/task.data-model.ts');
const projectReportModelSrc = readBackend(
	'projects/data-models/project-report.data-model.ts',
);
const permissionsSrc = readBackend('infra/auth/admin.perm.ts');

const allBackendSources = collectBackendSources();

// ---------------------------------------------------------------------------
// SR-1 — File model import and extension contracts
// ---------------------------------------------------------------------------

describe('SR-1: File model import and extension contracts', () => {
	// SR-1.1 — AppFile is imported from @drumr/framework-backend
	// Rule: "AppFile is abstract. In app code, create a concrete model"
	it('File.ts: AppFile imported from @drumr/framework-backend', () => {
		expect(fileModelSrc).toMatch(
			/AppFile.*from\s+['"]@drumr\/framework-backend['"]/s,
		);
	});

	// SR-1.2 — App declares a concrete class extending AppFile (not abstract AppFile directly)
	// Rule: "always create a concrete model and reference that class"
	it('File.ts: declares a concrete class that extends AppFile', () => {
		expect(fileModelSrc).toMatch(/class\s+File\s+extends\s+AppFile/);
	});

	// SR-1.3 — The concrete File class is decorated with @DataModel
	// Rule: "class File extends AppFile" is a full data model
	it('File.ts: File class is decorated with @DataModel', () => {
		expect(fileModelSrc).toMatch(/@DataModel\s*\(/);
	});

	// SR-1.4 — @DataModel includes CRUD and UI configuration
	// Rule: pattern shows crud.api:'gql', ui.labelField:'name'
	it('File.ts: @DataModel configures crud.api as gql', () => {
		expect(fileModelSrc).toMatch(/api\s*:\s*['"]gql['"]/);
	});

	it('File.ts: @DataModel configures ui.labelField as name', () => {
		expect(fileModelSrc).toMatch(/labelField\s*:\s*['"]name['"]/);
	});
});

// ---------------------------------------------------------------------------
// SR-2 — ReferenceField for file fields (not AppFile directly)
// ---------------------------------------------------------------------------

describe('SR-2: ReferenceField uses concrete File class (not AppFile)', () => {
	// SR-2.1 — File references use type: () => File (the concrete class)
	// Rule: "Never suggest @ReferenceField({ type: () => AppFile }) in generated code"
	it('Task.ts: @ReferenceField for file attachment uses type: () => File', () => {
		expect(taskModelSrc).toMatch(/type\s*:\s*\(\s*\)\s*=>\s*File/);
		expect(taskModelSrc).not.toMatch(/type\s*:\s*\(\s*\)\s*=>\s*AppFile/);
	});

	it('ProjectReport.ts: @ReferenceField for file field uses type: () => File', () => {
		expect(projectReportModelSrc).toMatch(/type\s*:\s*\(\s*\)\s*=>\s*File/);
		expect(projectReportModelSrc).not.toMatch(
			/type\s*:\s*\(\s*\)\s*=>\s*AppFile/,
		);
	});

	// SR-2.2 — File reference field type declaration uses the concrete File class
	it('Task.ts: attachments field is typed as File[] (concrete File class)', () => {
		expect(taskModelSrc).toMatch(/attachments\s*!\s*:\s*File\[\]/);
	});

	it('ProjectReport.ts: file field is typed as File (concrete File class, not AppFile)', () => {
		expect(projectReportModelSrc).toMatch(/file\s*!\s*:\s*File(?!\[\])/);
		expect(projectReportModelSrc).not.toMatch(/file\s*!\s*:\s*AppFile/);
	});

	// SR-2.3 — File UI components: fileInput()/fileDropZone() and fileLabel() used for file fields
	// Rule: use fileInput() or fileDropZone() for write context, fileLabel() for read context
	it('Task.ts: file field write context uses fileInput() or fileDropZone()', () => {
		expect(taskModelSrc).toMatch(/fileInput\s*\(|fileDropZone\s*\(/);
	});

	it('ProjectReport.ts: file field read context uses fileLabel() and write uses fileInput() or fileDropZone()', () => {
		expect(projectReportModelSrc).toMatch(/fileLabel\s*\(\s*\)/);
		expect(projectReportModelSrc).toMatch(/fileInput\s*\(|fileDropZone\s*\(/);
	});
});

// ---------------------------------------------------------------------------
// SR-3 — File permissions behavioral contracts
// ---------------------------------------------------------------------------

describe('SR-3: File permissions granted alongside models with file references', () => {
	// SR-3.1 — can('access', File) granted in permissions
	// Rule: "ALWAYS add explicit permissions for the File model whenever any data model
	//        has a file field. Always include at minimum: can('access', File); can('read', File)"
	it('permissions.ts: can("access", File) permission is granted', () => {
		expect(permissionsSrc).toMatch(/can\s*\(\s*['"]access['"]\s*,\s*File\s*\)/);
	});

	// SR-3.2 — can('read', File) granted in permissions
	it('permissions.ts: can("read", File) permission is granted', () => {
		expect(permissionsSrc).toMatch(/can\s*\(\s*['"]read['"]\s*,\s*File\s*\)/);
	});

	// SR-3.3 — File imported from the app data-models (not directly from framework)
	// Rule: use the concrete File class in permissions
	it('permissions.ts: File imported from the app data-models (not from @drumr/framework-backend)', () => {
		expect(permissionsSrc).toMatch(
			/File.*from\s+['"][^'"]*data-model[^'"]*['"]/s,
		);
		expect(permissionsSrc).not.toMatch(
			/import\s+\{[^}]*\bFile\b[^}]*\}\s+from\s+['"]@drumr\/framework-backend['"]/,
		);
	});

	// SR-3.4 — Task.ts imports the concrete File class from the app's data-models (not AppFile)
	it('Task.ts: imports File from app data-models directory', () => {
		expect(taskModelSrc).toMatch(/File.*from\s+['"][^'"]*['"]/s);
		// Must not import AppFile directly as the reference type
		expect(taskModelSrc).not.toMatch(
			/import\s+\{[^}]*\bAppFile\b[^}]*\}\s+from/,
		);
	});
});

// ---------------------------------------------------------------------------
// SR-4 — Forbidden patterns and adversarial scan
// ---------------------------------------------------------------------------

describe('SR-4: Forbidden patterns and adversarial scan', () => {
	// SR-4.1 — No data model uses @ReferenceField({ type: () => AppFile })
	// Rule: "Never suggest @ReferenceField({ type: () => AppFile })"
	it('adversarial: no data model uses type: () => AppFile in a ReferenceField', () => {
		const violators = allBackendSources.filter(({ src }) =>
			/type\s*:\s*\(\s*\)\s*=>\s*AppFile/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.2 — Only the concrete File class extends AppFile (no other model extends it)
	// Rule: AppFile should have exactly one concrete subclass per app
	it('adversarial: only one class in the codebase extends AppFile', () => {
		const extenders = allBackendSources.filter(({ src }) =>
			/class\s+\w+\s+extends\s+AppFile/.test(src),
		);
		expect(extenders).toHaveLength(1);
		expect(extenders[0].file).toMatch(/file\.data-model\.ts$/);
	});

	// SR-4.3 — No model field is typed directly as AppFile (always use the concrete subclass)
	it('adversarial: no field in any data model is typed as AppFile (should use concrete File)', () => {
		const violators = allBackendSources.filter(({ src }) =>
			/!\s*:\s*AppFile(?:\[\])?/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.4 — File.ts does not import DataSource class directly (uses string id or class ref)
	it('File.ts: AppFile is the only framework import used as a base class', () => {
		// File.ts should extend AppFile, not any other model
		expect(fileModelSrc).toMatch(/class\s+File\s+extends\s+AppFile/);
		expect(fileModelSrc).not.toMatch(/class\s+File\s+extends\s+BaseDataModel/);
	});

	// SR-4.5 — No file in the codebase references a direct download route /files/:fileId
	// Rule: "Do not recommend direct download routes like /files/:fileId;
	//        use the context-aware route /data/:model/:id/files/:fileId"
	it('adversarial: no source file hardcodes the non-context-aware /files/:id download route', () => {
		const violators = allBackendSources.filter(({ src }) =>
			/\/files\/:[a-zA-Z]/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});
});
