/**
 * Playwright globalSetup — runs once before any worker starts.
 *
 * Authenticates via the REST API (no UI form interaction), then injects
 * the JWT into the page's localStorage and saves the resulting storage state
 * to .auth/admin.json.  Every worker loads that file via `use.storageState`
 * in playwright.config.ts, so no test ever hits the login endpoint again —
 * eliminating the concurrent-login bottleneck that caused timeouts under
 * parallel execution.
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium, FullConfig, request } from '@playwright/test';

// Playwright does not apply .env auto-loading to globalSetup, so load it manually.
const envPath = path.resolve(__dirname, '../../../../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

function getFirstEnvValue(candidates: string[]): string | undefined {
  for (const envVar of candidates) {
    const value = process.env[envVar]?.trim();
    if (value) return value;
  }
  return undefined;
}

const ADMIN_EMAIL =
  getFirstEnvValue(['E2E_EMAIL', 'E2E_USERNAME', 'E2E_ADMIN_EMAIL']) ??
  'sys@app.com';
const ADMIN_PASSWORD =
  getFirstEnvValue(['E2E_PASSWORD', 'E2E_ADMIN_PASSWORD']) ?? '12345678';
const AUTH_FILE = path.resolve(__dirname, '../../../../.auth/admin.json');

export default async function globalSetup(config: FullConfig): Promise<void> {
  const ADMIN_EMAIL = getFirstEnvValue([
    'E2E_EMAIL',
    'E2E_USERNAME',
    'E2E_ADMIN_EMAIL',
  ]);
  const ADMIN_PASSWORD = getFirstEnvValue([
    'E2E_PASSWORD',
    'E2E_ADMIN_PASSWORD',
  ]);
  const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:3000';

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    const missing: string[] = [];
    if (!ADMIN_EMAIL)
      missing.push('identity (E2E_EMAIL or E2E_USERNAME or E2E_ADMIN_EMAIL)');
    if (!ADMIN_PASSWORD)
      missing.push('password (E2E_PASSWORD or E2E_ADMIN_PASSWORD)');
    throw new Error(
      `globalSetup: missing admin credentials: ${missing.join(', ')}. ` +
        'Set the env vars before running E2E tests.',
    );
  }

  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:8000';

  // Ensure the .auth directory exists.
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  // ── Step 1: Obtain JWT via REST API (no browser form interaction) ──────
  const apiContext = await request.newContext({ baseURL: API_BASE_URL });
  const loginResponse = await apiContext.post('/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  if (!loginResponse.ok()) {
    const body = await loginResponse.text().catch(() => '');
    throw new Error(
      `globalSetup: admin login failed (HTTP ${loginResponse.status()}): ${body}`,
    );
  }

  const loginData = (await loginResponse.json()) as {
    token: string;
    userId: string;
    email: string;
    roles: string[];
  };
  const { token } = loginData;
  await apiContext.dispose();

  // ── Step 2: Load the app in a real browser to discover the localStorage ─
  //           key (it's derived from window.DRUMR_APP_STORAGE_ID / hostname)
  //           then inject the token so the SPA considers itself authenticated.
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  // Navigate to the app root so React and the auth utils are loaded.
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });

  // Wait for the app JS to initialize DRUMR_APP_STORAGE_ID (set by initialStateFactory).
  // On a cold dev server the bundle compiles on-demand and can take several seconds;
  // domcontentloaded fires before the JS runs, causing the token to be stored under the
  // wrong key (hostname fallback) and forcing every test to repeat the UI login.
  await page
    .waitForFunction(() => !!(window as any).DRUMR_APP_STORAGE_ID, {
      timeout: 30_000,
    })
    .catch(() => {
      // App did not set DRUMR_APP_STORAGE_ID in time — proceed with the hostname fallback.
      // Tests will fall back to UI login, which is slower but functional.
    });

  // Diagnostic: show where we actually landed and what globals are set.
  const diagnostics = await page.evaluate(() => ({
    url: window.location.href,
    storageId: (window as any).DRUMR_APP_STORAGE_ID ?? '(not set)',
    appTitle: (window as any).DRUMR_APP_TITLE ?? '(not set)',
    existingKeys: Object.keys(localStorage).filter((k) =>
      k.startsWith('drumr'),
    ),
  }));
  console.log(
    '[globalSetup] page diagnostics:',
    JSON.stringify(diagnostics, null, 2),
  );

  // Inject the token using the same key logic as getAuthStorageKeys().
  const injectedKey = await page.evaluate(
    ({ token, email, userId, roles }) => {
      const prefix = 'drumr';
      const storageId = (window as any).DRUMR_APP_STORAGE_ID;
      let appId: string;
      if (storageId?.trim()) {
        appId = storageId
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
      } else {
        const title =
          (window as any).DRUMR_APP_TITLE || window.location.hostname;
        appId = `${title}@${window.location.origin}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
      }
      const tokenKey = `${prefix}_${appId}_token`;
      const emailKey = `${prefix}_${appId}_user_email`;
      const userIdKey = `${prefix}_${appId}_user_id`;
      const rolesKey = `${prefix}_${appId}_user_roles`;
      localStorage.setItem(tokenKey, token);
      localStorage.setItem(emailKey, email);
      localStorage.setItem(userIdKey, userId);
      localStorage.setItem(rolesKey, JSON.stringify(roles));
      return tokenKey;
    },
    {
      token,
      email: ADMIN_EMAIL,
      userId: loginData.userId as string,
      roles: loginData.roles as string[],
    },
  );
  console.log('[globalSetup] injected token under key:', injectedKey);

  // ── Step 3: Save storage state for all workers ─────────────────────────
  // We save immediately after injection — no reload needed. Each worker's
  // browser context will start with these localStorage keys pre-populated,
  // so the SPA authenticates on their first page.goto() call.
  await context.storageState({ path: AUTH_FILE });
  await browser.close();
}
