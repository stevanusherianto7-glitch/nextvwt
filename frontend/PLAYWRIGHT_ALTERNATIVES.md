# Alternatif saat `npx playwright install` gagal

Jika `npx playwright install` gagal karena DNS, proxy, firewall, atau CDN Playwright tidak bisa diakses, gunakan salah satu opsi berikut.

## Opsi 1 — Pakai browser sistem yang sudah terpasang

Ini opsi tercepat untuk lokal/server yang sudah punya Chrome, Chromium, atau Edge.

```bash
npm run test:e2e:system-browser
```

Script akan mencoba menemukan browser di lokasi umum:

- Linux: `/usr/bin/chromium`, `/usr/bin/google-chrome`, `/usr/bin/microsoft-edge`
- Windows: Chrome/Edge di `Program Files` atau `LocalAppData`
- macOS: Chrome/Edge/Chromium di `/Applications`

Jika browser ada di lokasi lain:

```bash
PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chrome npm run test:e2e:system-browser
```

Windows PowerShell:

```powershell
$Env:PLAYWRIGHT_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run test:e2e:system-browser
```

Catatan: browser sistem tidak 100% dijamin sama dengan bundled Chromium Playwright, tetapi cukup baik untuk smoke test dan environment yang tidak bisa download CDN.

## Opsi 2 — Pakai Chrome atau Edge channel bawaan Playwright

Jika Google Chrome atau Microsoft Edge sudah terpasang:

```bash
npm run test:e2e:chrome
```

atau:

```bash
npm run test:e2e:edge
```

## Opsi 3 — Gunakan mirror internal / artifact repository

Playwright secara default mengunduh browser dari CDN Microsoft. Untuk jaringan kantor/private CI, arahkan download ke mirror internal:

```bash
PLAYWRIGHT_DOWNLOAD_HOST=https://mirror-internal.example.com npx playwright install chromium
```

Windows PowerShell:

```powershell
$Env:PLAYWRIGHT_DOWNLOAD_HOST="https://mirror-internal.example.com"
npx playwright install chromium
```

## Opsi 4 — Cache browser Playwright

Pada CI, cache folder browser agar tidak perlu download ulang setiap run.

Linux path umum:

```text
~/.cache/ms-playwright
```

Windows path umum:

```text
%USERPROFILE%\AppData\Local\ms-playwright
```

macOS path umum:

```text
~/Library/Caches/ms-playwright
```

## Opsi 5 — Docker image resmi Playwright

Untuk CI Linux, gunakan Docker image Playwright yang sudah membawa browser dan dependency OS. Ini menghindari install browser manual pada runner.

Contoh command lokal:

```bash
docker run --rm -it -v "$PWD:/work" -w /work mcr.microsoft.com/playwright:v1.60.0-noble bash -lc "npm ci && npm run test:e2e:playwright"
```

## Opsi 6 — Skip browser download saat install dependency

Jika browser dikelola terpisah, dependency bisa di-install tanpa browser download:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci
```

Lalu jalankan test dengan browser sistem:

```bash
npm run test:e2e:system-browser
```
