# NextVWT Hardening Notes

## Perubahan yang sudah diterapkan

- Dependency diselaraskan: `framer-motion` dipakai sesuai import kode, `motion` dihapus.
- Type React ditambahkan: `@types/react` dan `@types/react-dom`.
- `npm run lint` sudah lolos.
- `npm run build` sudah lolos setelah permission executable `node_modules/.bin/*` diperbaiki di environment audit.
- Server Socket.IO diperkeras:
  - CORS dikontrol via `ALLOWED_ORIGINS`.
  - `PORT` dikontrol via env.
  - `maxHttpBufferSize` dibatasi 64 KB.
  - Rate limit per socket/event.
  - Validasi channel numeric 1–6 digit.
  - Sanitasi nama dan lokasi.
  - Batas user per channel via `MAX_CHANNEL_USERS`.
  - PIN global opsional via `CHANNEL_JOIN_SECRET`.
  - Healthcheck `/healthz`.
- WebRTC ICE dapat dikonfigurasi via env:
  - `VITE_STUN_URLS`
  - `VITE_TURN_URLS`
  - `VITE_TURN_USERNAME`
  - `VITE_TURN_CREDENTIAL`
- `dangerouslySetInnerHTML` untuk CSS marquee dihapus dan dipindahkan ke `src/index.css`.
- Full-duplex mode sekarang dihormati pada logic PTT: channel busy hanya memblokir saat `fullDuplexMode` mati.
- `.gitignore` ditambah untuk artefak build/test dan file lokal Android.

## Wajib diisi sebelum production

```env
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://domain-resmi-anda.com
MAX_CHANNEL_USERS=10
CHANNEL_JOIN_SECRET=pin-kuat-opsional
VITE_TURN_URLS=turn:turn.domain-anda.com:3478
VITE_TURN_USERNAME=username-turn
VITE_TURN_CREDENTIAL=password-turn
```

Tanpa TURN server, WebRTC bisa gagal di jaringan mobile carrier, NAT ketat, atau firewall kantor.

## Command validasi

```bash
npm ci
npm run lint
npm run build
npm audit --omit=dev
```

Untuk E2E Playwright, install browser dulu bila environment belum punya browser:

```bash
npx playwright install chromium
npm run test:e2e:playwright
```
