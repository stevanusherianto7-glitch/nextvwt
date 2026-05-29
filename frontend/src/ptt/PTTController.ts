/**
 * PTTController — Anti double-transmit lock untuk Push-to-Talk.
 *
 * Masalah yang diselesaikan:
 * - Race condition saat user tap/click cepat berulang
 * - Ghost transmit (transmit masih aktif padahal sudah dilepas)
 * - Async startRecording belum selesai saat stopRecording dipanggil
 */
export class PTTController {
  private pressed = false;
  private lock = false;

  /**
   * Tekan PTT — panggil onStart callback.
   * Tidak akan re-trigger jika sudah ditekan atau sedang lock.
   */
  async press(onStart: () => Promise<void>): Promise<void> {
    if (this.pressed || this.lock) return;

    this.lock = true;
    try {
      await onStart();
      this.pressed = true;
    } catch (err) {
      console.error("[PTTController] press() error:", err);
    } finally {
      this.lock = false;
    }
  }

  /**
   * Lepas PTT — panggil onStop callback.
   * Tidak akan re-trigger jika belum ditekan atau sedang lock.
   */
  async release(onStop: () => void): Promise<void> {
    if (!this.pressed || this.lock) return;

    this.lock = true;
    try {
      onStop();
      this.pressed = false;
    } catch (err) {
      console.error("[PTTController] release() error:", err);
    } finally {
      this.lock = false;
    }
  }

  /** Force reset state — dipakai saat koneksi putus atau engine destroy */
  reset(): void {
    this.pressed = false;
    this.lock = false;
  }

  get isPressed(): boolean {
    return this.pressed;
  }

  get isLocked(): boolean {
    return this.lock;
  }
}
