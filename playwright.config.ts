import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
  },
  projects: [
    { name: 'api', testDir: './api' },
    {
      name: 'e2e',
      testDir: './e2e/tests',
      retries: process.env.CI ? 1 : 0,
      use: {
        ...devices['Desktop Chrome'],
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
      },
    },
  ],
});

