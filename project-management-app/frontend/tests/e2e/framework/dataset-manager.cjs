const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function run(command, cwd, silent = false) {
  return execSync(command, {
    cwd,
    stdio: silent ? 'pipe' : 'inherit',
    encoding: 'utf8',
    env: process.env,
  });
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getAppRoot() {
  return path.resolve(__dirname, '../../../..');
}

function getDatasetConfig(specFileName) {
  const datasetsDir = path.resolve(__dirname, '../datasets');
  const profiles = loadJson(path.join(datasetsDir, 'profiles.json'));
  const mapping = loadJson(path.join(datasetsDir, 'spec-datasets.json'));

  const profileName =
    mapping.specProfiles?.[specFileName] || mapping.defaultProfile;
  const profile = profiles[profileName];
  if (!profile) {
    throw new Error(
      `Dataset profile '${profileName}' is not defined for ${specFileName}`,
    );
  }
  return { profileName, ...profile };
}

function ensureDrumrDataset(specFileName) {
  const appRoot = getAppRoot();
  const cfg = getDatasetConfig(specFileName);

  resetDataset(appRoot);
  loadDataset(cfg.dataset, appRoot);

  return cfg;
}

/**
 * Reset and load a specific dataset profile by name, bypassing the
 * spec-to-profile mapping in spec-datasets.json.
 *
 * Use this when a spec explicitly wants a particular profile rather
 * than relying on the automatic lookup by spec filename.
 */
function ensureDrumrDatasetProfile(profileName) {
  const datasetsDir = path.resolve(__dirname, '../datasets');
  const profiles = loadJson(path.join(datasetsDir, 'profiles.json'));
  const profile = profiles[profileName];
  if (!profile) {
    throw new Error(
      `Dataset profile '${profileName}' is not defined in profiles.json`,
    );
  }

  const appRoot = getAppRoot();
  resetDataset(appRoot);
  loadDataset(profile.dataset, appRoot);

  return { profileName, ...profile };
}

function resetDataset(appRoot = getAppRoot()) {
  // Reset before each spec to guarantee isolation from previously mutated state.
  run('npx drumr ds main.ds reset', appRoot);
}

function loadDataset(datasetName, appRoot = getAppRoot()) {
  // Load configured baseline dataset profile.
  run(`npx drumr ds main.ds load ${datasetName}`, appRoot);
}

function cleanupDataset(appRoot = getAppRoot()) {
  // Cleanup is equivalent to a reset because each spec starts from a full reload.
  resetDataset(appRoot);
}

module.exports = {
  cleanupDataset,
  ensureDrumrDataset,
  ensureDrumrDatasetProfile,
  getDatasetConfig,
  loadDataset,
  resetDataset,
};
