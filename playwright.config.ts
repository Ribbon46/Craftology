import { defineConfig, devices } from '@playwright/test';

const PORT = 3300;
const baseURL = `http://localhost:${PORT}`;

// E2E against a real Next server (dev, so no build step is needed). Tests are
// behavior-level and resilient to the live catalog's exact contents. Run with
// `npm run test:e2e`.
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 12_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    // Pin to light so the theme toggle test is deterministic regardless of the
    // host's prefers-color-scheme.
    colorScheme: 'light',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
