/**
 * PlaybackQueue — Audio playback queue yang anti-overlap.
 * Setiap chunk audio diputar secara sequential, bukan concurrent.
 * Memory-safe: URL object selalu di-revoke setelah selesai.
 */
export class PlaybackQueue {
  private queue: Blob[] = [];
  private isPlaying = false;
  private destroyed = false;
  private isSuspended = false;
  private currentAudio: HTMLAudioElement | null = null;

  /** Tambahkan audio blob ke antrian dan mulai playback jika idle */
  enqueue(blob: Blob): void {
    if (this.destroyed) return;
    this.queue.push(blob);
    if (!this.isPlaying && !this.isSuspended) {
      this.playNext();
    }
  }

  /** Suspend antrean (misal saat PTT ditekan) */
  suspend(): void {
    this.isSuspended = true;
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
  }

  /** Lanjutkan antrean (saat PTT dilepas) */
  resume(): void {
    this.isSuspended = false;
    if (this.currentAudio && this.isPlaying) {
      this.currentAudio.play().catch(err => {
        console.warn("[PlaybackQueue] Error resuming audio:", err);
        this.currentAudio = null;
        this.playNext();
      });
    } else if (!this.isPlaying) {
      this.playNext();
    }
  }

  private async playNext(): Promise<void> {
    if (this.destroyed || this.queue.length === 0 || this.isSuspended) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const blob = this.queue.shift()!;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    this.currentAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      this.currentAudio = null;
      this.playNext();
    };

    audio.onerror = (err) => {
      console.warn("[PlaybackQueue] Error memutar audio chunk:", err);
      URL.revokeObjectURL(url);
      this.currentAudio = null;
      this.playNext();
    };

    try {
      await audio.play();
    } catch (err) {
      console.warn("[PlaybackQueue] play() gagal:", err);
      URL.revokeObjectURL(url);
      this.currentAudio = null;
      this.playNext();
    }
  }

  /** Kosongkan antrian dan stop audio yang sedang berjalan */
  clear(): void {
    this.queue = [];
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = "";
      this.currentAudio = null;
    }
    this.isPlaying = false;
  }

  /** Destroy total — gunakan saat component unmount */
  destroy(): void {
    this.destroyed = true;
    this.clear();
  }

  get queueLength(): number {
    return this.queue.length;
  }
}
