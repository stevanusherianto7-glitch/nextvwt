import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { platform } from 'node:os';

const candidatesByPlatform = {
  linux: [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/microsoft-edge',
    '/usr/bin/microsoft-edge-stable',
  ],
  win32: [
    `${process.env.PROGRAMFILES || 'C:\\Program Files'}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)'}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA || ''}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.PROGRAMFILES || 'C:\\Program Files'}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)'}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
};

function findBrowser() {
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  }

  const candidates = candidatesByPlatform[platform()] ?? [];
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

const executablePath = findBrowser();

if (!executablePath) {
  console.error('Tidak menemukan Chrome/Chromium/Edge terpasang di sistem.');
  console.error('Set manual dengan PLAYWRIGHT_EXECUTABLE_PATH=/path/to/browser lalu ulangi command ini.');
  process.exit(1);
}

console.log(`Menjalankan Playwright dengan browser sistem: ${executablePath}`);

const result = spawnSync(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', '--project=system-browser', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_EXECUTABLE_PATH: executablePath,
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
    },
  },
);

process.exit(result.status ?? 1);
