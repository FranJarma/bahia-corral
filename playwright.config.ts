import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        env:
          process.env.CI && process.env.E2E_TEST_DATABASE === '1'
            ? {
                NODE_OPTIONS: [
                  process.env.NODE_OPTIONS,
                  '--import ' +
                    pathToFileURL(resolve('tests/e2e/support/mercadopago-fixture.mjs')).href,
                ]
                  .filter(Boolean)
                  .join(' '),
                MERCADO_PAGO_ACCESS_TOKEN: 'e2e-refund-fixture-only',
              }
            : undefined,
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
