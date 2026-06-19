/**
 * Skill Conformance Spec — frontend-layout
 *
 * Skill:    core/skills/frontend-layout/SKILL.md
 * Approach: Source-text only — backend Jest has no TSX/JSX transform.
 *
 * Primary fixtures:
 *   frontend/src/config/layouts/MainLayout.tsx
 *     — navigation='mix', leftMenu (menu.group + menu.view), topMenu (menu.view,
 *       position='header'), userMenu (menu.myProfileAction), collapsible,
 *       header/footer, lifecycle hooks (onMenuClick, onMenuCollapse)
 *   frontend/src/config/layouts/ViewLayout.tsx
 *     — navigation='left', leftMenu only, dynamic label (useContextValue),
 *       queryParams using DependencyContainer.resolve
 *   frontend/src/config/layouts/FormLayout.tsx
 *     — navigation='top', topMenu only (features.leftMenu=false), menu.subMenu in
 *       topMenu, lazy view refs (view: () => Class), lifecycle hooks
 *
 * Adversarial scan: all .tsx files under frontend/src/config/layouts/
 *
 * How to run:
 *   cd apps/project-management-app/backend
 *   TS_NODE_PROJECT=tsconfig.test.json npx jest \
 *     --config config/jest.config.ts \
 *     --testPathPatterns='frontend-layout.skill-conformance' \
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

function collectLayoutSources(): Array<{ file: string; src: string }> {
	const layoutDir = path.join(FRONTEND_SRC, 'config', 'layouts');
	return fs
		.readdirSync(layoutDir)
		.filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
		.map((f) => ({
			file: `config/layouts/${f}`,
			src: fs.readFileSync(path.join(layoutDir, f), 'utf8'),
		}));
}

const mainLayoutSrc = readFrontend('config/layouts/mainLayout.tsx');
const viewLayoutSrc = readFrontend('config/layouts/viewLayout.tsx');
const formLayoutSrc = readFrontend('config/layouts/formLayout.tsx');

const allLayoutFiles = collectLayoutSources();

// ---------------------------------------------------------------------------
// SR-1 — defineLayout() factory and import contracts
// ---------------------------------------------------------------------------

describe('SR-1: defineLayout() factory and import contracts', () => {
	// SR-1.1 — defineLayout imported from @drumr/framework-frontend
	// Rule: canonical layout API — defineLayout() replaces class-based @Layout() + BaseLayout
	it('MainLayout: defineLayout imported from @drumr/framework-frontend', () => {
		expect(mainLayoutSrc).toMatch(
			/defineLayout.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('ViewLayout: defineLayout imported from @drumr/framework-frontend', () => {
		expect(viewLayoutSrc).toMatch(
			/defineLayout.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('FormLayout: defineLayout imported from @drumr/framework-frontend', () => {
		expect(formLayoutSrc).toMatch(
			/defineLayout.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.2 — `menu` namespace imported from @drumr/framework-frontend
	// Rule: "Import `menu` from '@drumr/framework-frontend' — do not use old standalone helpers"
	it('MainLayout: menu imported from @drumr/framework-frontend', () => {
		expect(mainLayoutSrc).toMatch(
			/\bmenu\b.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});
	// SR-1.2 — `menu` namespace imported from @drumr/framework-frontend
	// Rule: "Import `menu` from '@drumr/framework-frontend' — do not use old standalone helpers"
	it('MainLayout: menu imported from @drumr/framework-frontend', () => {
		expect(mainLayoutSrc).toMatch(
			/\bmenu\b.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('ViewLayout: menu imported from @drumr/framework-frontend', () => {
		expect(viewLayoutSrc).toMatch(
			/\bmenu\b.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});
	it('ViewLayout: menu imported from @drumr/framework-frontend', () => {
		expect(viewLayoutSrc).toMatch(
			/\bmenu\b.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	it('FormLayout: menu imported from @drumr/framework-frontend', () => {
		expect(formLayoutSrc).toMatch(
			/\bmenu\b.*from\s+['"]@drumr\/framework-frontend['"]/s,
		);
	});

	// SR-1.3 — defineLayout() called to produce the layout
	// Rule: layouts are defined via defineLayout() config object, not class declaration
	it('MainLayout: defined via defineLayout() call', () => {
		expect(mainLayoutSrc).toMatch(/=\s*defineLayout\s*\(/);
	});

	it('ViewLayout: defined via defineLayout() call', () => {
		expect(viewLayoutSrc).toMatch(/=\s*defineLayout\s*\(/);
	});

	it('FormLayout: defined via defineLayout() call', () => {
		expect(formLayoutSrc).toMatch(/=\s*defineLayout\s*\(/);
	});
});

// ---------------------------------------------------------------------------
// SR-2 — Layout config structure
// ---------------------------------------------------------------------------

describe('SR-2: Layout config structure', () => {
	// SR-2.1 — All layout files use defineLayout() (not class-based pattern)
	// Rule: "defineLayout() is the canonical API; class-based @Layout() + BaseLayout is deprecated"
	it('MainLayout: uses defineLayout() config object (not class-based)', () => {
		expect(mainLayoutSrc).not.toMatch(/class\s+\w+\s+extends\s+BaseLayout/);
		expect(mainLayoutSrc).toMatch(/defineLayout\s*\(\s*\{/);
	});

	it('ViewLayout: uses defineLayout() config object (not class-based)', () => {
		expect(viewLayoutSrc).not.toMatch(/class\s+\w+\s+extends\s+BaseLayout/);
		expect(viewLayoutSrc).toMatch(/defineLayout\s*\(\s*\{/);
	});

	it('FormLayout: uses defineLayout() config object (not class-based)', () => {
		expect(formLayoutSrc).not.toMatch(/class\s+\w+\s+extends\s+BaseLayout/);
		expect(formLayoutSrc).toMatch(/defineLayout\s*\(\s*\{/);
	});

	// SR-2.2 — Required config keys are present in each layout
	it('MainLayout: navigation config key present', () => {
		expect(mainLayoutSrc).toMatch(/\bnavigation\s*:/);
	});

	it('MainLayout: contentWidth config key present', () => {
		expect(mainLayoutSrc).toMatch(/\bcontentWidth\s*:/);
	});

	it('MainLayout: features config key present', () => {
		expect(mainLayoutSrc).toMatch(/\bfeatures\s*:/);
	});

	it('MainLayout: header config key present', () => {
		expect(mainLayoutSrc).toMatch(/\bheader\s*:/);
	});

	it('MainLayout: footer config key present', () => {
		expect(mainLayoutSrc).toMatch(/\bfooter\s*:/);
	});
});

// ---------------------------------------------------------------------------
// SR-3 — Navigation mode rules and menu behavioral guarantees
// ---------------------------------------------------------------------------

describe('SR-3: Navigation mode rules and menu behavioral guarantees', () => {
	// SR-3.1 — navigation = 'mix' layout defines both leftMenu and topMenu
	it("MainLayout: navigation='mix' and has both leftMenu and topMenu config keys", () => {
		expect(mainLayoutSrc).toMatch(/\bnavigation\s*:\s*['"]mix['"]/);
		expect(mainLayoutSrc).toMatch(/\bleftMenu\s*:/);
		expect(mainLayoutSrc).toMatch(/\btopMenu\s*:/);
	});

	// SR-3.2 — navigation = 'left' layout defines leftMenu
	it("ViewLayout: navigation='left' and has leftMenu config key", () => {
		expect(viewLayoutSrc).toMatch(/\bnavigation\s*:\s*['"]left['"]/);
		expect(viewLayoutSrc).toMatch(/\bleftMenu\s*:/);
	});

	// SR-3.3 — navigation = 'top' layout does NOT define leftMenu
	it("FormLayout: navigation='top' and has no leftMenu config key", () => {
		expect(formLayoutSrc).toMatch(/\bnavigation\s*:\s*['"]top['"]/);
		expect(formLayoutSrc).toMatch(/\btopMenu\s*:/);
		expect(formLayoutSrc).not.toMatch(/\bleftMenu\s*:\s*\{/);
	});

	// SR-3.4 — topMenu always declares position: 'header'
	it("MainLayout: topMenu.position = 'header'", () => {
		expect(mainLayoutSrc).toMatch(/position\s*:\s*['"]header['"]/);
	});

	it("FormLayout: topMenu.position = 'header'", () => {
		expect(formLayoutSrc).toMatch(/position\s*:\s*['"]header['"]/);
	});
	it("FormLayout: topMenu.position = 'header'", () => {
		expect(formLayoutSrc).toMatch(/position\s*:\s*['"]header['"]/);
	});

	// SR-3.5 — menu.myProfileAction() in userMenu
	it('MainLayout: userMenu includes menu.myProfileAction()', () => {
		expect(mainLayoutSrc).toMatch(/menu\.myProfileAction\s*\(/);
	});

	// SR-3.6 — menu.group() valid in leftMenu
	it('MainLayout: leftMenu uses menu.group()', () => {
		expect(mainLayoutSrc).toMatch(/menu\.group\s*\(/);
	});

	it('ViewLayout: leftMenu uses menu.group()', () => {
		expect(viewLayoutSrc).toMatch(/menu\.group\s*\(/);
	});

	// SR-3.7 — menu.subMenu() used in topMenu
	it('FormLayout: topMenu uses menu.subMenu()', () => {
		expect(formLayoutSrc).toMatch(/menu\.subMenu\s*\(/);
	});

	// SR-3.8 — Lazy view refs in FormLayout
	it('FormLayout: menu.view() uses lazy view refs (view: () => ViewClass)', () => {
		expect(formLayoutSrc).toMatch(/view\s*:\s*\(\s*\)\s*=>/);
	});

	// SR-3.9 — menu.divider() usage
	it.todo('MainLayout: uses menu.divider() for visual separation');

	// SR-3.10 — Lifecycle hooks in config object
	it('MainLayout: lifecycle hooks present as config keys (onMenuClick, onMenuCollapse)', () => {
		expect(mainLayoutSrc).toMatch(/\bonMenuClick\s*:/);
		expect(mainLayoutSrc).toMatch(/\bonMenuCollapse\s*:/);
	});

	it('FormLayout: lifecycle hooks present as config keys (onMenuClick, onMenuCollapse)', () => {
		expect(formLayoutSrc).toMatch(/\bonMenuClick\s*:/);
		expect(formLayoutSrc).toMatch(/\bonMenuCollapse\s*:/);
	});

	// SR-3.11 — Dynamic menu label using React component
	it('MainLayout: menu.view() uses a React component (TaskCountLabel) as dynamic label', () => {
		expect(mainLayoutSrc).toMatch(/label\s*:\s*TaskCountLabel/);
	});

	// SR-3.12 — Dynamic queryParams via DependencyContainer.resolve
	it('ViewLayout: menu.view() uses queryParams with DependencyContainer.resolve(Context)', () => {
		expect(viewLayoutSrc).toMatch(/queryParams\s*:\s*\(\s*\)\s*=>/);
		expect(viewLayoutSrc).toMatch(
			/DependencyContainer\.resolve\s*\(\s*Context\s*\)/,
		);
	});
});

// ---------------------------------------------------------------------------
// SR-4 — Forbidden patterns and adversarial scan
// ---------------------------------------------------------------------------

describe('SR-4: Forbidden patterns and adversarial scan', () => {
	// SR-4.1 — No obsolete standalone menu helpers imported
	it('adversarial: no layout file uses the obsolete viewButton standalone helper', () => {
		const violators = allLayoutFiles.filter(({ src }) => {
			const stripped = src.replace(/\/\/[^\n]*/g, '');
			return (
				/import\s*{[^}]*\bviewButton\b[^}]*}/.test(stripped) ||
				/\bviewButton\s*\(/.test(stripped)
			);
		});
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	it('adversarial: no layout file uses the obsolete menuGroup standalone helper', () => {
		const violators = allLayoutFiles.filter(({ src }) =>
			/import\s*{[^}]*\bmenuGroup\b[^}]*}/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});
	it('adversarial: no layout file uses the obsolete menuGroup standalone helper', () => {
		const violators = allLayoutFiles.filter(({ src }) =>
			/import\s*{[^}]*\bmenuGroup\b[^}]*}/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	it('adversarial: no layout file uses the obsolete menuDivider standalone helper', () => {
		const violators = allLayoutFiles.filter(({ src }) =>
			/import\s*{[^}]*\bmenuDivider\b[^}]*}/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});
	it('adversarial: no layout file uses the obsolete menuDivider standalone helper', () => {
		const violators = allLayoutFiles.filter(({ src }) =>
			/import\s*{[^}]*\bmenuDivider\b[^}]*}/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	it('adversarial: no layout file imports standalone subMenu (obsolete; use menu.subMenu instead)', () => {
		const violators = allLayoutFiles.filter(({ src }) =>
			/import\s*{[^}]*\bsubMenu\b[^}]*}/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.2 — All layout files import from @drumr/framework-frontend
	it('adversarial: every layout file imports from @drumr/framework-frontend', () => {
		const violators = allLayoutFiles.filter(
			({ src }) => !/from\s+['"]@drumr\/framework-frontend['"]/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.3 — No layout file imports tsyringe directly
	it('adversarial: no layout file imports from tsyringe directly', () => {
		const violators = allLayoutFiles.filter(({ src }) =>
			/from\s+['"]tsyringe['"]/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});

	// SR-4.4 — No layout file uses class-based pattern (deprecated)
	it('adversarial: no layout file uses deprecated class-based @Layout() + BaseLayout pattern', () => {
		const violators = allLayoutFiles.filter(({ src }) =>
			/class\s+\w+\s+extends\s+BaseLayout/.test(src),
		);
		expect(violators.map((v) => v.file)).toHaveLength(0);
	});
});
