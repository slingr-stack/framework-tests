const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { ensureDrumrDataset } = require('./framework/dataset-manager.cjs');

function run(command, cwd, silent = false) {
  return execSync(command, {
    cwd,
    stdio: silent ? 'pipe' : 'inherit',
    encoding: 'utf8',
    env: process.env,
  });
}

function listSpecs(e2eDir) {
  return fs
    .readdirSync(e2eDir)
    .filter((name) => name.endsWith('.spec.ts'))
    .sort();
}

function main() {
  const appRoot = path.resolve(__dirname, '../../../..');
  const e2eDir = path.resolve(__dirname);
  const specs = listSpecs(e2eDir);

  const onlyArg = process.argv.find((arg) => arg.startsWith('--spec='));
  const only = onlyArg ? onlyArg.replace('--spec=', '').trim() : '';
  const passthroughArgs = process.argv
    .slice(2)
    .filter((arg) => !arg.startsWith('--spec='));
  const passthrough =
    passthroughArgs.length > 0 ? ` ${passthroughArgs.join(' ')}` : '';
  const selected = only
    ? specs.filter((spec) => spec === only || spec.includes(only))
    : specs;

  if (selected.length === 0) {
    throw new Error(`No specs matched '${only}'.`);
  }

  for (const spec of selected) {
    const profile = ensureDrumrDataset(spec);
    console.log(
      `\n[dataset] ${spec} -> profile '${profile.profileName}' (dataset '${profile.dataset}')`,
    );

    run(
      `npx playwright test frontend/tests/e2e/${spec} --workers=1${passthrough}`,
      appRoot,
    );
  }
}

main();
