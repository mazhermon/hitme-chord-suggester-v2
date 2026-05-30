import { defineConfig, devices } from '@playwright/test'

// Visual-regression specs live alongside the rest of e2e but are excluded
// from the default `npm run e2e` run (one browser is enough, and three
// browsers × seven viewports of baselines = 63 PNGs we don't want by
// default). Run them with `npm run e2e:visual` (chromium only).
const VISUAL_PATTERN = /visual\.spec\.ts$/

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: VISUAL_PATTERN,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: VISUAL_PATTERN,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
