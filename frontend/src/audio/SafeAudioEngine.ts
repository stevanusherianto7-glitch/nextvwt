import { type Socket } from "socket.io-client";
import { PlaybackQueue } from "./PlaybackQueue";

/**
 * SafeAudioEngine — Engine audio yang aman untuk production.
 *
 * Perbaikan dari AudioEngine lama:
 * - destroy() yang benar: stop track, close context, remove listener
 * - Method naming fix (initializeContextContext → initializeContext)
 * - Guard double-record
 * - PlaybackQueue terintegrasi (anti-overlap playback)
 * - Reconnect-safe: listener dibersihkan saat destroy
 */
export class SafeAudioEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private isRecording = false;
  private destroyed = false;
  private socket: Socket;
  private playbackQueue: PlaybackQueue;

  // Simpan reference listener agar bisa di-remove
  private boundAudioStreamHandler: (data: {
    userId: string;
    audioData: ArrayBuffer;
  }) => void;

  constructor(socket: Socket) {
    this.socket = socket;
    this.playbackQueue = new PlaybackQueue();

    // Buat handler sebagai bound function agar bisa di-remove
    this.boundAudioStreamHandler = (data) => {
      if (this.destroyed) return;
      const blob = new Blob([data.audioData], {
        type: "audio/webm;codecs=opus",
      });
      this.playbackQueue.enqueue(blob);
    };

    // Bersihkan listener lama sebelum daftar yang baru (prevent duplicate)
    this.socket.off("audio-stream", this.boundAudioStreamHandler);
    this.socket.on("audio-stream", this.boundAudioStreamHandler);
  }

  /** Inisialisasi / resume AudioContext */
  async initializeContext(): Promise<void> {
    if (this.destroyed) return;

    if (!this.audioContext) {
      this.audioContext = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )({
        latencyHint: "interactive",
        sampleRate: 48000,
      });
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  /** Mulai merekam — idempotent (aman dipanggil berkali-kali) */
  async startRecording(): Promise<void> {
    if (this.destroyed) {
      console.warn("[SafeAudioEngine] Engine sudah di-destroy");
      return;
    }
    if (this.isRecording) {
      console.warn("[SafeAudioEngine] Sudah merekam, skip");
      return;
    }

    try {
      await this.initializeContext();

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      this.mediaRecorder = new MediaRecorder(
        this.mediaStream,
        mimeType ? { mimeType, audioBitsPerSecond: 32000 } : {},
      );

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.socket.connected && !this.destroyed) {
          event.data.arrayBuffer().then((buffer) => {
            if (!this.destroyed && this.socket.connected) {
              this.socket.emit("audio-stream", buffer);
            }
          });
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error("[SafeAudioEngine] MediaRecorder error:", event);
        this.stopRecording();
      };

      // Chunk 120ms — sweet spot antara latency dan overhead
      this.mediaRecorder.start(120);
      this.isRecording = true;

      if (this.socket.connected) {
        this.socket.emit("speaking-status", true);
      }
    } catch (err) {
      console.error("[SafeAudioEngine] Gagal akses mikrofon:", err);
      // Cleanup stream jika sudah terbuka tapi gagal di langkah berikutnya
      this.mediaStream?.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
      throw err; // biarkan caller handle error ini
    }
  }

  /** Stop merekam — idempotent */
  stopRecording(): void {
    if (!this.isRecording) return;

    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      }
    } catch (err) {
      console.warn("[SafeAudioEngine] Error stopping recorder:", err);
    }

    // Selalu stop tracks agar LED mikrofon mati
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.isRecording = false;

    if (this.socket.connected) {
      this.socket.emit("speaking-status", false);
    }
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  /** Suspend AudioContext saat app ke background */
  async suspend(): Promise<void> {
    if (this.audioContext?.state === "running") {
      await this.audioContext.suspend();
    }
  }

  /** Resume AudioContext saat app kembali ke foreground */
  async resume(): Promise<void> {
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  /**
   * Destroy total engine — WAJIB dipanggil saat komponen unmount
   * atau saat membuat engine baru untuk koneksi baru.
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.stopRecording();

    // Remove socket listener agar tidak leak
    this.socket.off("audio-stream", this.boundAudioStreamHandler);

    // Destroy playback queue
    this.playbackQueue.destroy();

    // Close AudioContext (release OS audio resources)
    if (this.audioContext) {
      this.audioContext.close().catch(() => {
        /* ignore */
      });
      this.audioContext = null;
    }
  }

  get recording(): boolean {
    return this.isRecording;
  }
}
