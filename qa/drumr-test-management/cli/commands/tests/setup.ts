import fs from 'fs-extra';
import path from 'node:path';

import { hasDrumrFramework } from '../../utils/checkFramework.js';

const DEFAULT_TEST_PLANS: object = {
  plans: [],
  caseFolders: [],
};

const TEST_MANAGEMENT_DIR = 'testsManagement';
const TEST_PLANS_FILE = path.join(TEST_MANAGEMENT_DIR, 'test-plans.json');

const E2E_DIRS = [
  'frontend/tests/e2e',
  'frontend/tests/e2e/fixtures',
  'frontend/tests/e2e/helpers',
];

const UNIT_DIRS = [
  'backend/tests/unit',
];

const INTEGRATION_DIRS = [
  'backend/tests/integration',
];

export async function setupTests(cwd: string = process.cwd()): Promise<void> {
  if (!(await hasDrumrFramework(cwd))) {
    console.error(
      'This directory does not contain a Drumr application.\n' +
        "Run this command from your app's root directory.",
    );
    process.exit(1);
  }

  const allDirs = [TEST_MANAGEMENT_DIR, ...E2E_DIRS, ...UNIT_DIRS, ...INTEGRATION_DIRS];
  let directoriesCreated = 0;

  for (const dir of allDirs) {
    const abs = path.join(cwd, dir);
    if (!(await fs.pathExists(abs))) {
      await fs.ensureDir(abs);
      console.log(`  created  ${dir}/`);
      directoriesCreated++;
    }
  }

  const testPlansPath = path.join(cwd, TEST_PLANS_FILE);

  if (await fs.pathExists(testPlansPath)) {
    console.log(`  exists   ${path.relative(cwd, testPlansPath)} (skipped)`);
  } else {
    await fs.ensureDir(path.dirname(testPlansPath));
    await fs.writeJson(testPlansPath, DEFAULT_TEST_PLANS, { spaces: 2 });
    console.log(`  created  ${path.relative(cwd, testPlansPath)}`);
  }

  const summary = directoriesCreated > 0
    ? `Created ${directoriesCreated} director${directoriesCreated === 1 ? 'y' : 'ies'}.`
    : 'All directories already exist.';

  console.log(`\nTest infrastructure ready. ${summary}`);
  console.log('Run "drumr tests open" to launch the Test Manager UI.');
}
