import * as path from 'node:path';
import * as fs from 'fs-extra';

export function getBackendPath(cwd: string = process.cwd()): string {
  return path.join(cwd, 'backend');
}

export async function hasDrumrFramework(cwd: string = process.cwd()): Promise<boolean> {
  const backendPath = getBackendPath(cwd);
  const packageJsonPath = path.join(backendPath, 'package.json');

  if (!(await fs.pathExists(packageJsonPath))) {
    return false;
  }

  const packageJson = await fs.readJSON(packageJsonPath);
  const deps = packageJson.dependencies || {};
  const devDeps = packageJson.devDependencies || {};

  return !!deps['@drumr/framework-backend'] || !!devDeps['@drumr/framework-backend'];
}

export async function getFrameworkPath(cwd: string = process.cwd()): Promise<string | null> {
  const backendPath = getBackendPath(cwd);

  const candidates = [
    path.join(backendPath, 'node_modules', '@drumr', 'framework-backend'),
    path.join(cwd, 'node_modules', '@drumr', 'framework-backend'),
  ];

  for (const frameworkPath of candidates) {
    if (!(await fs.pathExists(frameworkPath))) {
      continue;
    }

    const stats = await fs.lstat(frameworkPath);
    if (stats.isSymbolicLink()) {
      return await fs.realpath(frameworkPath);
    }

    return frameworkPath;
  }

  return null;
}
