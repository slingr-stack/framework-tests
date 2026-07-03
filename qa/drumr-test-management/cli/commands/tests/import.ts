import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ImportOptions {
  targetDir: string;
  presetDir?: string;
}

export async function importTestManager(options: ImportOptions): Promise<void> {
  const { targetDir } = options;
  const presetDir = options.presetDir ?? path.resolve(__dirname, '..', '..');
  const presetRoot = path.resolve(presetDir);

  const sourceCommands = path.join(presetRoot, 'commands', 'tests');
  const sourceUtils = path.join(presetRoot, 'utils');
  const sourceTemplates = path.join(presetRoot, 'templates', 'test-ui');

  const destCommands = path.join(targetDir, 'cli', 'src', 'commands', 'tests');
  const destUtils = path.join(targetDir, 'cli', 'src', 'utils');
  const destTemplates = path.join(targetDir, 'cli', 'src', 'templates', 'test-ui');

  // Validate preset directory
  for (const dir of [sourceCommands, sourceUtils, sourceTemplates]) {
    if (!(await fs.pathExists(dir))) {
      console.error(`Preset source not found: ${dir}`);
      process.exit(1);
    }
  }

  // Validate target directory
  const targetPkg = path.join(targetDir, 'package.json');
  if (!(await fs.pathExists(targetPkg))) {
    console.error(`Target does not appear to be a valid project: ${targetDir}`);
    process.exit(1);
  }

  // Copy commands (except import.ts itself)
  await fs.ensureDir(destCommands);
  const commandFiles = await fs.readdir(sourceCommands);
  for (const file of commandFiles) {
    if (file === 'import.ts') continue;
    await fs.copy(path.join(sourceCommands, file), path.join(destCommands, file), { overwrite: true });
    console.log(`  copied  cli/src/commands/tests/${file}`);
  }

  // Copy utils
  await fs.ensureDir(destUtils);
  const utilFiles = await fs.readdir(sourceUtils);
  for (const file of utilFiles) {
    await fs.copy(path.join(sourceUtils, file), path.join(destUtils, file), { overwrite: true });
    console.log(`  copied  cli/src/utils/${file}`);
  }

  // Copy templates
  await fs.ensureDir(destTemplates);
  await fs.copy(sourceTemplates, destTemplates, { overwrite: true });
  console.log(`  copied  cli/src/templates/test-ui/`);

  console.log('\nTest-manager preset imported successfully.');
  console.log('Run "drumr tests setup" to scaffold test infrastructure.');
  console.log('Run "drumr tests open" to launch the Test Manager UI.');
}

// Allow running as a standalone script
const isMain = process.argv[1] && (
  process.argv[1] === __filename ||
  process.argv[1].endsWith('/import.ts') ||
  process.argv[1].endsWith('/import.js')
);

if (isMain) {
  const args = process.argv.slice(2);
  const targetIndex = args.indexOf('--target');
  const presetIndex = args.indexOf('--preset');

  const targetDir = targetIndex !== -1 ? args[targetIndex + 1] : process.cwd();
  const presetDir = presetIndex !== -1 ? args[presetIndex + 1] : undefined;

  if (!targetDir) {
    console.error('Usage: tsx import.ts --target /path/to/target-app [--preset /path/to/preset-root]');
    process.exit(1);
  }

  importTestManager({ targetDir, presetDir }).catch(err => {
    console.error('Import failed:', err);
    process.exit(1);
  });
}
