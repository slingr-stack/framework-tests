import path from "node:path";
import { defineConfig } from "@playwright/test";

const isCI = !!process.env.CI;
const AUTH_FILE = path.resolve(__dirname, ".auth/admin.json");

export default defineConfig({
	testDir: "./frontend/tests/e2e",
	testMatch: "**/*.spec.ts",
	globalSetup: "./frontend/tests/e2e/framework/global-setup",
	timeout: isCI ? 120_000 : 45_000,
	expect: { timeout: 5_000 },
	fullyParallel: true,
	retries: isCI ? 2 : 0,
	workers: isCI ? 1 : 2,
	reporter: isCI
		? [
				["./playwright-progress-reporter.cjs"],
				["github"],
				["html", { open: "never", outputFolder: "playwright-report" }],
				["junit", { outputFile: "test-results/e2e-junit.xml" }],
			]
		: [["html", { open: "never", outputFolder: "playwright-report" }]],
	outputDir: "test-results",
	use: {
		baseURL: "http://localhost:8000",
		storageState: AUTH_FILE,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { browserName: "chromium" },
		},
	],
});
