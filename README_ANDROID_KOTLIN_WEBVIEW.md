# NexVWT Android Kotlin WebView Prototype

Project ini adalah wrapper Android native Kotlin untuk membuka NextVWT melalui WebView.

## Cara kerja

- Aplikasi Android membuka server NextVWT dari URL LAN, contoh `http://192.168.1.25:3000`.
- UI dan fitur NextVWT tetap berasal dari web app React yang sudah dibuat.
- Android native menangani izin microphone, galeri/file picker, WebView permission, reload, dan pengaturan alamat server.

## Fitur v1

- Kotlin Android native.
- WebView fullscreen.
- Tombol `Set Server` untuk mengisi alamat server NextVWT.
- Tombol `Reload`.
- Izin microphone untuk PTT/WebRTC.
- Izin galeri untuk upload avatar.
- File chooser WebView untuk avatar.
- Cleartext HTTP LAN diizinkan untuk prototype.
- Keep screen awake saat aplikasi dibuka.
- Debug WebView console log aktif.

## Cara menjalankan server web NextVWT di laptop

Di folder NextVWT web prototype terbaru:

```powershell
powershell -ExecutionPolicy Bypass -File .\RUN_PROD_SAFE_PNPM.ps1
```

Pastikan muncul:

```text
[Server] NextVWT PTT running on http://0.0.0.0:3000
```

Cek IP laptop:

```powershell
ipconfig
```

Ambil IPv4 WiFi, contoh:

```text
192.168.1.25
```

Di Android NexVWT, isi server:

```text
http://192.168.1.25:3000
```

## Cara build APK di Android Studio

1. Buka Android Studio.
2. Pilih **Open**.
3. Pilih folder `nextvwt_android_kotlin_webview_v1`.
4. Tunggu Gradle Sync selesai.
5. Klik **Run** untuk install ke HP, atau:
   - **Build > Build Bundle(s) / APK(s) > Build APK(s)**

## Catatan prototype

- HP dan laptop harus berada di jaringan WiFi yang sama.
- Jangan gunakan `localhost` di HP. `localhost` di HP berarti HP itu sendiri, bukan laptop.
- Untuk HP fisik gunakan IP laptop, contoh `http://192.168.1.25:3000`.
- Untuk emulator Android gunakan `http://10.0.2.2:3000`.
- Windows Firewall harus mengizinkan Node.js/port 3000.

## Fitur NextVWT yang tetap didukung dari WebView

- Join channel.
- PTT/WebRTC.
- Daftar user channel.
- User yang sedang bermodulasi.
- Avatar upload dari galeri.
- Avatar WebP dari sistem web.
- Set/Pengaturan.
- Lokasi provinsi/kota.
- Musik/Karaoke floating.
- Soundcard/mixer sebagai input microphone jika perangkat Android mendukung input tersebut.
