import { defineConfig, devices } from '@playwright/test';

const uiPort = Number(process.env.NEXT_UI_PORT ?? 6005);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${uiPort}`;

export default defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: true,
  timeout: 60_000,
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: `http://localhost:${uiPort}`,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_UI_PORT: String(uiPort)
    }
  }
});
