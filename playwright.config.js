import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,
  expect: { timeout: 10 * 1000 },
  fullyParallel: true,
  // Cap concurrency: every test opens PLP→popup PDP tabs (scan loops open
  // several), so the default worker count floods staging + local Chromium and
  // causes timeouts. 2 workers keeps the live suite stable; raise if staging
  // can take it. Override per-run with `--workers=N`.
  workers: 1,
  // Live-site E2E: one retry absorbs transient network/animation blips.
  retries: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'report/results.json' }],
  ],
  use: {
    baseURL: 'https://reliancejewels.snghostz5.de',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // staging site uses a self-signed / non-public cert
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
