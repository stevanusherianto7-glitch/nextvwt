/**
 * WalkieTalkieSFX — Mesin Efek Suara Walkie-Talkie berbasis Web Audio API murni.
 *
 * Menghasilkan nada dan derau statis fisik secara real-time tanpa membutuhkan
 * berkas audio eksternal (.mp3/.wav), menjamin pemutaran instan berlatensi rendah (<5ms).
 */
export class WalkieTalkieSFX {
  private static audioCtx: AudioContext | null = null;

  /** Mengambil atau membuat AudioContext tunggal (Singleton) */
  private static getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Memutar Nada Mulai Transmisi (PTT Press Beep)
   * Menggunakan kombinasi Dual-Tone sinusoidal singkat (800Hz -> 1000Hz)
   */
  static playStartTone(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.setValueAtTime(1000, now + 0.06); // naikkan frekuensi di tengah jalan

      // Envelope volume
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
      gain.gain.setValueAtTime(0.08, now + 0.11);
      gain.gain.linearRampToValueAtTime(0, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (err) {
      console.warn("[SFX] Gagal memutar nada mulai PTT:", err);
    }
  }

  /**
   * Memutar Roger Beep Akhir Transmisi (Classic Roger Beep)
   * Menggunakan transisi frekuensi menurun (1200Hz -> 880Hz) khas radio komersial
   */
  static playRogerBeep(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.setValueAtTime(880, now + 0.08); // turunkan frekuensi di tengah jalan

      // Envelope volume
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
      gain.gain.setValueAtTime(0.08, now + 0.15);
      gain.gain.linearRampToValueAtTime(0, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (err) {
      console.warn("[SFX] Gagal memutar roger beep:", err);
    }
  }

  /**
   * Memutar Derau Statis Squelch Tail (White Noise Burst)
   * Mensimulasikan semburan derau statis akibat putusnya sinyal udara sesaat
   * ketika pemancar dimatikan. Menggunakan bandpass filter 1000Hz dan decay envelope.
   */
  static playSquelchTail(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Membuat White Noise Buffer berdurasi 0.15 detik
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Mengisi buffer dengan angka acak antara -1 dan 1
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // Menambahkan Bandpass Filter agar terdengar seperti speaker fisik walkie-talkie
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1000, now); // frekuensi resonansi speaker vokal
      filter.Q.setValueAtTime(1.2, now);

      const gain = ctx.createGain();

      // Exponential decay envelope (penurunan cepat volume derau)
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + 0.15);
    } catch (err) {
      console.warn("[SFX] Gagal memutar derau statis squelch tail:", err);
    }
  }
}
