NEXTVWT WINDOWS READY V3

Gunakan script utama ini dari folder yang berisi package.json:

powershell -ExecutionPolicy Bypass -File .\RUN_WINDOWS_CHROME_PNPM.ps1

Script ini sengaja memakai Corepack PNPM agar tidak bergantung pada npm ci/npm install yang di beberapa mesin Windows bisa gagal/hang.

Jika Corepack PNPM gagal, coba mode npm bypass:

powershell -ExecutionPolicy Bypass -File .\RUN_WINDOWS_CHROME_NPM_BYPASS.ps1

Catatan:
- Node LTS disarankan: v24.x
- npm 10.x lebih stabil daripada npm 11.x di beberapa Windows setup
- Google Chrome harus tersedia di C:\Program Files\Google\Chrome\Application\chrome.exe atau lokasi standar lain
