import { defineConfig, devices } from '@playwright/test';

const systemBrowserExecutable = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const browserLaunchArgs = [
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--no-first-run',
  '--disable-component-update',
  '--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights',
];

/**
 * Playwright Config — Dioptimalkan untuk pengujian audio WebRTC P2P multi-user.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false, // Matikan paralel agar pengujian sekuensial mesh P2P tidak berantakan
  workers: 1,           // Jalankan 1 worker untuk stabilitas port lokal
  reporter: 'line',
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: browserLaunchArgs,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chrome-installed',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'msedge-installed',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'system-browser',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: browserLaunchArgs,
          ...(systemBrowserExecutable ? { executablePath: systemBrowserExecutable } : {}),
        },
      },
    },
  ],
});
