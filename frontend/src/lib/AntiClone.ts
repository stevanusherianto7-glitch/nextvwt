/**
 * AntiClone.ts
 * Skrip ini bertugas sebagai pelindung pertama (first line of defense).
 * Ini akan dijalankan seawal mungkin sebelum React dan pustaka lain dimuat.
 */

const ALLOWED_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "nextvwt.com", // Domain resmi yang diizinkan pengguna
  "www.nextvwt.com",
];

// Skema yang diizinkan (misalnya capacitor untuk Android)
const ALLOWED_PROTOCOLS = ["capacitor:", "file:", "http:", "https:"];

export function runAntiCloneProtection() {
  try {
    const currentHostname = window.location.hostname;
    const currentProtocol = window.location.protocol;

    // 1. Cek Protokol (Apakah ini dijalankan di Capacitor/Local atau Web?)
    if (!ALLOWED_PROTOCOLS.includes(currentProtocol)) {
      triggerSelfDestruct();
      return;
    }

    // 2. Cek Hostname (Domain Locking)
    // Jika protokolnya HTTP/HTTPS, pastikan hostnamenya ada di whitelist.
    // Jika protokolnya capacitor/file, kita anggap aman secara default karena itu adalah build lokal Android/iOS.
    if (
      (currentProtocol === "http:" || currentProtocol === "https:") &&
      currentHostname
    ) {
      if (!ALLOWED_DOMAINS.includes(currentHostname)) {
        triggerSelfDestruct();
        return;
      }
    }
  } catch (e) {
    // Jika terjadi error saat mengecek window.location (biasanya karena lingkungan terisolasi / iframe sandbox ketat yang berbahaya)
    triggerSelfDestruct();
  }
}

function triggerSelfDestruct() {
  console.error(
    "FATAL ERROR: APLIKASI DIJALANKAN DI LINGKUNGAN YANG TIDAK DIIZINKAN (HOST ILEGAL)!",
  );

  // 1. Hapus memori lokal (Mencegah penjiplak mendapatkan sisa data profil/token)
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {}

  // 2. Hancurkan DOM agar UI menjadi putih/kosong
  try {
    document.body.innerHTML = "";
    document.head.innerHTML = "";
  } catch (e) {}

  // 3. Infinite loop ringan untuk membekukan eksekusi skrip lainnya (Soft Hang)
  // Tidak menggunakan while(true) biasa agar tidak memicu deteksi 'Page Unresponsive' terlalu cepat,
  // melainkan menggunakan timer rekursif yang memblokir.
  setInterval(() => {
    for (let i = 0; i < 1000; i++) {
      const dummy = document.createElement("div");
      dummy.innerHTML = "DESTROY";
    }
    debugger; // Jika DevTools kebetulan terbuka, ini akan membuat debugger macet terus-menerus
  }, 10);

  // 4. Lemparkan error ke atas agar proses eksekusi terhenti
  throw new Error("Application Context Destroyed");
}
