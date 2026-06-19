/**
 * TypeScript entry point for dataset management utilities.
 *
 * Re-exports from the CJS implementation at ../framework/dataset-manager.cjs
 * so spec files can import with a clean TS module path.
 *
 * API:
 *   ensureDrumrDataset(specFileName)   — looks up the profile from spec-datasets.json
 *                                        and runs reset + load. Pass the spec's own
 *                                        filename so the mapping is honoured.
 *
 *   ensureDrumrDatasetProfile(name)    — skips the spec→profile mapping and loads
 *                                        the named profile directly. Use this when you
 *                                        want a specific profile regardless of spec name.
 *
 *   resetDataset()   — bare reset (no load).
 *   loadDataset(name) — bare load of a named dataset.
 *   cleanupDataset() — alias for resetDataset; call in afterAll when needed.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dm = require('../framework/dataset-manager.cjs') as {
  ensureDrumrDataset: (specFileName: string) => Record<string, unknown>;
  ensureDrumrDatasetProfile: (profileName: string) => Record<string, unknown>;
  resetDataset: () => void;
  loadDataset: (datasetName: string) => void;
  cleanupDataset: () => void;
};

export const ensureDrumrDataset = dm.ensureDrumrDataset;
export const ensureDrumrDatasetProfile = dm.ensureDrumrDatasetProfile;
export const resetDataset = dm.resetDataset;
export const loadDataset = dm.loadDataset;
export const cleanupDataset = dm.cleanupDataset;
