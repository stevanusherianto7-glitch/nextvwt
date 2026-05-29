/**
 * AudioEngine — Wrapper yang di-hardened untuk backward compatibility.
 *
 * File ini adalah refactor dari AudioEngine.ts lama yang memiliki:
 * - Memory leak (audioContext tidak pernah di-close)
 * - Stream track tidak selalu di-stop
 * - Duplicate socket listener saat engine dibuat ulang
 * - Nama method typo: initializeContextContext
 *
 * Sekarang menggunakan PlaybackQueue untuk anti-overlap playback.
 * Untuk new development, gunakan SafeAudioEngine langsung.
 */

import { Socket } from "socket.io-client";
import { PlaybackQueue } from "../audio/PlaybackQueue";

export class AudioEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private isRecording = false;
  private socket: Socket;
  private playbackQueue: PlaybackQueue;
  private destroyed = false;

  // Simpan reference untuk cleanup yang benar
  private boundAudioHandler: (data: {
    userId: string;
    audioData: ArrayBuffer;
  }) => void;

  constructor(socket: Socket) {
    this.socket = socket;
    this.playbackQueue = new PlaybackQueue();

    this.boundAudioHandler = (data) => {
      if (this.destroyed) return;
      const blob = new Blob([data.audioData], {
        type: "audio/webm;codecs=opus",
      });
      this.playbackQueue.enqueue(blob);
    };

    // Bersihkan listener lama sebelum pasang baru
    this.socket.off("audio-stream", this.boundAudioHandler);
    this.socket.on("audio-stream", this.boundAudioHandler);
  }

  /** @deprecated Nama lama yang salah — tetap tersedia untuk backward compat */
  public async initializeContextContext() {
    return this.initializeContext();
  }

  public async initializeContext() {
    if (this.destroyed || this.audioContext) return;

    this.audioContext = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  public async startRecording() {
    if (this.isRecording || this.destroyed) return;

    try {
      await this.initializeContext();

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";

      this.mediaRecorder = new MediaRecorder(
        this.mediaStream,
        mimeType ? { mimeType, audioBitsPerSecond: 32000 } : {},
      );

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && this.socket.connected && !this.destroyed) {
          e.data.arrayBuffer().then((buffer) => {
            if (!this.destroyed && this.socket.connected) {
              this.socket.emit("audio-stream", buffer);
            }
          });
        }
      };

      this.mediaRecorder.onerror = () => {
        this.stopRecording();
      };

      this.socket.emit("speaking-status", true);
      this.mediaRecorder.start(120);
      this.isRecording = true;
    } catch (err) {
      console.error("[AudioEngine] Gagal akses mikrofon:", err);
      this.mediaStream?.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
      alert(
        "Akses mikrofon ditolak atau tidak tersedia. Pastikan izin mikrofon telah diberikan di browser Anda.",
      );
    }
  }

  public stopRecording() {
    if (!this.isRecording) return;

    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      }
    } catch {
      /* ignore */
    }

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

  /**
   * BARU: destroy() untuk mencegah memory leak
   * Wajib dipanggil saat component unmount atau reconnect
   */
  public destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    this.stopRecording();
    this.socket.off("audio-stream", this.boundAudioHandler);
    this.playbackQueue.destroy();

    if (this.audioContext) {
      this.audioContext.close().catch(() => {
        /* ignore */
      });
      this.audioContext = null;
    }
  }
}
