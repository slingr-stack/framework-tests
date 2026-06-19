import { test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

test.describe
  .serial('Authentication Token Expiration E2E', () => {
    test.setTimeout(60_000);

    test('redirects to login when token is tampered (simulated expiration)', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);

      await app.loginAsAdmin();
      await app.expectLoggedIn();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      const tokenTampered = await page.evaluate(() => {
        const sanitizeAppStorageId = (value: string): string =>
          value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');

        const getCurrentAppStorageId = (): string => {
          const runtimeStorageId = window.DRUMR_APP_STORAGE_ID;
          if (typeof runtimeStorageId === 'string' && runtimeStorageId.trim()) {
            return sanitizeAppStorageId(runtimeStorageId);
          }

          const appTitle = window.DRUMR_APP_TITLE || window.location.hostname;
          return sanitizeAppStorageId(`${appTitle}@${window.location.origin}`);
        };

        const appStorageId = getCurrentAppStorageId();
        const preferredTokenKey = `drumr_${appStorageId}_token`;

        const allKeys = Object.keys(localStorage);
        const fallbackTokenKeys = allKeys.filter((key) => {
          const lower = key.toLowerCase();
          return (
            lower.includes('drumr') &&
            (lower.endsWith('_token') ||
              lower.endsWith(':token') ||
              lower.endsWith(' token'))
          );
        });

        const orderedCandidates = [
          ...(allKeys.includes(preferredTokenKey) ? [preferredTokenKey] : []),
          ...fallbackTokenKeys,
        ];

        const uniqueCandidates = Array.from(new Set(orderedCandidates));

        for (const key of uniqueCandidates) {
          const token = localStorage.getItem(key);
          if (!token || token.length === 0) {
            continue;
          }

          const lastChar = token[token.length - 1];
          const replacement = lastChar === 'x' ? 'y' : 'x';
          const tamperedToken = `${token.slice(0, -1)}${replacement}`;
          localStorage.setItem(key, tamperedToken);
          return true;
        }

        return false;
      });

      if (!tokenTampered) {
        throw new Error('No Drumr token key found in localStorage to tamper.');
      }

      // Trigger a protected GraphQL request from the table-row interaction
      // (same path where the issue was observed in manual testing).
      await app.clickFirstTableRow();
      await app.expectOnLoginPage();
    });
  });
