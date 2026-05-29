import { type Socket } from "socket.io-client";

/**
 * WebRTCManager — Mengelola daur hidup RTCPeerConnection untuk arsitektur Mesh P2P.
 *
 * Menggantikan pengiriman audio Socket.IO chunks dengan aliran WebRTC/Opus asli
 * guna mencapai latensi <20ms.
 */
export class WebRTCManager {
  private localStream: MediaStream | null = null;
  private rawStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private pendingConnectionAttempts = new Set<string>();
  private localStreamPromise: Promise<void> | null = null;
  private socket: Socket;
  private destroyed = false;
  private currentEq = { bass: 0, mid: 0, treble: 0 };

  // Equalizer Nodes
  private eqBassNode: BiquadFilterNode | null = null;
  private eqMidNode: BiquadFilterNode | null = null;
  private eqTrebleNode: BiquadFilterNode | null = null;

  private readonly rtcConfig: RTCConfiguration = {
    iceServers: WebRTCManager.buildIceServers(),
    iceCandidatePoolSize: 4,
  };

  private static buildIceServers(): RTCIceServer[] {
    const stunUrls = (
      import.meta.env.VITE_STUN_URLS ||
      "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun2.l.google.com:19302"
    )
      .split(",")
      .map((url: string) => url.trim())
      .filter(Boolean);

    const turnUrls = (import.meta.env.VITE_TURN_URLS || "")
      .split(",")
      .map((url: string) => url.trim())
      .filter(Boolean);

    const iceServers: RTCIceServer[] = stunUrls.map((url: string) => ({
      urls: url,
    }));

    if (turnUrls.length > 0) {
      const username = import.meta.env.VITE_TURN_USERNAME || undefined;
      const credential = import.meta.env.VITE_TURN_CREDENTIAL || undefined;
      iceServers.push({ urls: turnUrls, username, credential });
    }

    return iceServers;
  }

  // Callback ke UI/Store
  private onRemoteStreamAdded: (peerId: string, stream: MediaStream) => void;
  private onRemoteStreamRemoved: (peerId: string) => void;

  constructor(
    socket: Socket,
    onRemoteStreamAdded: (peerId: string, stream: MediaStream) => void,
    onRemoteStreamRemoved: (peerId: string) => void,
  ) {
    this.socket = socket;
    this.onRemoteStreamAdded = onRemoteStreamAdded;
    this.onRemoteStreamRemoved = onRemoteStreamRemoved;

    this.registerSignalingEvents();
  }

  /** Mendaftarkan pendengar sinyal jabat tangan WebRTC */
  private registerSignalingEvents(): void {
    this.socket.on(
      "webrtc-offer",
      async (data: { senderId: string; sdp: RTCSessionDescriptionInit }) => {
        if (this.destroyed) return;
        console.log("[WebRTC] Menerima SDP Offer dari:", data.senderId);

        try {
          const audioMode = this.getAudioMode();
          await this.initializeLocalStream(audioMode);

          let pc = this.peerConnections.get(data.senderId);
          if (!pc) {
            pc = this.createPeerConnection(data.senderId);
          }

          const hasOfferCollision = pc.signalingState !== "stable";
          if (hasOfferCollision && this.shouldInitiateOffer(data.senderId)) {
            console.warn(
              "[WebRTC] Mengabaikan colliding offer dari peer prioritas lebih rendah:",
              data.senderId,
            );
            return;
          }

          if (hasOfferCollision) {
            await pc.setLocalDescription({
              type: "rollback",
            } as RTCSessionDescriptionInit);
          }

          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();

          // Optimalisasi SDP Opus pada Answer
          const tunedSdp = this.customizeSdp(answer.sdp || "", audioMode);
          const tunedAnswer = new RTCSessionDescription({
            type: answer.type,
            sdp: tunedSdp,
          });
          await pc.setLocalDescription(tunedAnswer);

          this.socket.emit("webrtc-answer", {
            targetId: data.senderId,
            sdp: tunedAnswer,
          });
        } catch (err) {
          console.error("[WebRTC] Gagal memproses SDP Offer:", err);
        }
      },
    );

    this.socket.on(
      "webrtc-answer",
      async (data: { senderId: string; sdp: RTCSessionDescriptionInit }) => {
        if (this.destroyed) return;
        console.log("[WebRTC] Menerima SDP Answer dari:", data.senderId);

        const pc = this.peerConnections.get(data.senderId);
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          } catch (err) {
            console.error(
              "[WebRTC] Gagal menyetel Remote Description (Answer):",
              err,
            );
          }
        }
      },
    );

    this.socket.on(
      "webrtc-ice",
      async (data: { senderId: string; candidate: RTCIceCandidateInit }) => {
        if (this.destroyed) return;
        console.log("[WebRTC] Menerima ICE Candidate dari:", data.senderId);

        const pc = this.peerConnections.get(data.senderId);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (err) {
            console.error("[WebRTC] Gagal menambahkan ICE Candidate:", err);
          }
        }
      },
    );
  }

  /** Inisialisasi Aliran Mikrofon Lokal */
  public async initializeLocalStream(
    audioMode: "discussion" | "music" = "music",
  ): Promise<void> {
    if (this.localStream) return;
    if (this.localStreamPromise) return this.localStreamPromise;

    this.localStreamPromise = this.createLocalStream(audioMode);
    try {
      await this.localStreamPromise;
    } finally {
      this.localStreamPromise = null;
    }
  }

  private async createLocalStream(
    audioMode: "discussion" | "music",
  ): Promise<void> {
    console.log("[WebRTC] Initializing local stream with mode:", audioMode);

    const baseConstraints =
      audioMode === "discussion"
        ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000,
          }
        : {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 2,
            sampleRate: 48000,
          };

    let preferredInputDeviceId = "";
    try {
      preferredInputDeviceId =
        localStorage.getItem("vwt_audio_input_device_id") || "";
    } catch (err) {
      console.warn("[WebRTC] Gagal membaca preferensi perangkat input:", err);
    }

    const constraints: MediaTrackConstraints = {
      ...baseConstraints,
      ...(preferredInputDeviceId
        ? { deviceId: { exact: preferredInputDeviceId } }
        : {}),
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: constraints,
      });
      this.rawStream = stream;

      // Mute gerbang suara mikrofon secara default (PTT belum ditekan)
      this.rawStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });

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

      // Terapkan pemrosesan audio DSP jika dalam mode discussion (Walkie-Talkie simulator)
      this.localStream = this.applyAudioDSP(stream, audioMode);

      // Pastikan trek stream keluaran DSP juga mengikuti status mute/aktif awal
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    } catch (err) {
      console.error("[WebRTC] Gagal mengakses mikrofon lokal:", err);
      alert(
        "Akses mikrofon ditolak atau tidak tersedia. Pastikan izin mikrofon telah diberikan.",
      );
      throw err;
    }
  }

  public async ensureLocalStreamReady(
    audioMode: "discussion" | "music" = this.getAudioMode(),
  ): Promise<boolean> {
    if (!this.localStream) {
      await this.initializeLocalStream(audioMode);
    }
    return this.hasUsableLocalStream();
  }

  /** Memperbarui mode audio secara dinamis dan mengganti track pada peer active */

  /** Memperbarui perangkat input audio tanpa mengekstrak/mengunduh media apa pun */
  public async updateAudioInputDevice(deviceId: string): Promise<void> {
    if (this.destroyed) return;
    console.log(
      "[WebRTC] Mengubah perangkat input audio:",
      deviceId || "default",
    );

    try {
      localStorage.setItem("vwt_audio_input_device_id", deviceId);
    } catch (err) {
      console.warn("[WebRTC] Gagal menyimpan perangkat input audio:", err);
    }

    const audioMode = this.getAudioMode();
    await this.updateAudioMode(audioMode);
  }

  public async updateAudioMode(
    audioMode: "discussion" | "music",
  ): Promise<void> {
    if (this.destroyed) return;
    console.log("[WebRTC] Mengubah mode audio dinamis ke:", audioMode);

    if (!this.rawStream && !this.localStream) {
      console.log("[WebRTC] Aliran lokal tidak aktif, lewati pergantian trek");
      return;
    }

    const isMuted = this.rawStream
      ? this.rawStream.getAudioTracks().every((track) => !track.enabled)
      : true;

    if (this.rawStream) {
      this.rawStream.getTracks().forEach((track) => track.stop());
      this.rawStream = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    await this.initializeLocalStream(audioMode);

    const localStream = this.getMediaStream();
    if (!localStream) return;

    this.setMute(isMuted);

    const newTrack = localStream.getAudioTracks()[0];
    if (!newTrack) return;

    for (const [peerId, pc] of this.peerConnections.entries()) {
      const senders = pc.getSenders();
      const audioSender = senders.find((s) => s.track?.kind === "audio");
      if (audioSender) {
        try {
          await audioSender.replaceTrack(newTrack);
          console.log(
            "[WebRTC] Sukses mengganti trek audio untuk peer:",
            peerId,
          );
        } catch (err) {
          console.error(
            "[WebRTC] Gagal mengganti trek audio untuk peer:",
            peerId,
            err,
          );
        }
      }
    }
  }

  /** Membuat koneksi peer baru (Melakukan penawaran/sdp-offer) */
  public async connectToPeer(peerId: string): Promise<void> {
    if (
      this.destroyed ||
      this.peerConnections.has(peerId) ||
      this.pendingConnectionAttempts.has(peerId)
    )
      return;

    if (!this.shouldInitiateOffer(peerId)) {
      console.log(
        "[WebRTC] Menunggu offer dari peer prioritas lebih tinggi:",
        peerId,
      );
      return;
    }

    this.pendingConnectionAttempts.add(peerId);
    console.log("[WebRTC] Memulai negosiasi P2P baru dengan:", peerId);

    try {
      const audioMode = this.getAudioMode();
      await this.initializeLocalStream(audioMode);

      if (this.destroyed || this.peerConnections.has(peerId)) return;

      const pc = this.createPeerConnection(peerId);
      const offer = await pc.createOffer();

      // Optimalisasi SDP Opus pada Offer
      const tunedSdp = this.customizeSdp(offer.sdp || "", audioMode);
      const tunedOffer = new RTCSessionDescription({
        type: offer.type,
        sdp: tunedSdp,
      });
      await pc.setLocalDescription(tunedOffer);

      this.socket.emit("webrtc-offer", {
        targetId: peerId,
        sdp: tunedOffer,
      });
    } catch (err) {
      console.error("[WebRTC] Gagal membuat SDP Offer untuk:", peerId, err);
      this.disconnectFromPeer(peerId);
    } finally {
      this.pendingConnectionAttempts.delete(peerId);
    }
  }

  /** Membuat RTCPeerConnection beserta pendengar event pendukung */
  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(peerId, pc);

    // Salurkan track mikrofon lokal jika sudah aktif
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && !this.destroyed) {
        this.socket.emit("webrtc-ice", {
          targetId: peerId,
          candidate: event.candidate,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(
        `[WebRTC] Peer ${peerId} ICE Connection State:`,
        pc.iceConnectionState,
      );
      if (pc.iceConnectionState === "failed") {
        console.warn(
          `[WebRTC] Peer ${peerId} ICE Connection failed. Memulai ICE Restart...`,
        );
        this.attemptIceRestart(peerId).catch((err) => {
          console.error(
            `[WebRTC] ICE Restart gagal untuk peer ${peerId}:`,
            err,
          );
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(
        `[WebRTC] Peer ${peerId} Connection State:`,
        pc.connectionState,
      );
      if (pc.connectionState === "closed") {
        this.disconnectFromPeer(peerId);
      } else if (pc.connectionState === "failed") {
        // Pemulihan dengan Grace Period: tunggu 15 detik sebelum memutuskan secara permanen
        setTimeout(() => {
          if (pc.connectionState === "failed") {
            console.warn(
              `[WebRTC] Koneksi dengan peer ${peerId} tetap gagal setelah timeout 15s. Memutuskan...`,
            );
            this.disconnectFromPeer(peerId);
          }
        }, 15000);
      }
    };

    pc.ontrack = (event) => {
      console.log("[WebRTC] Mendapatkan Remote Audio Track dari:", peerId);
      if (event.streams && event.streams[0]) {
        this.onRemoteStreamAdded(peerId, event.streams[0]);
      }
    };

    return pc;
  }

  /** Kontrol Mute/Unmute instan untuk tombol PTT (Latency <5ms) */
  public setMute(isMuted: boolean): boolean {
    if (!this.hasUsableLocalStream()) {
      console.warn(
        "[WebRTC] Local stream belum siap, skip perubahan mute:",
        isMuted,
      );
      if (isMuted && this.socket.connected) {
        this.socket.emit("speaking-status", false);
      }
      return false;
    }

    if (this.rawStream) {
      this.rawStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
    console.log("[WebRTC] Mengubah mute lokal:", isMuted);

    if (this.socket.connected) {
      this.socket.emit("speaking-status", !isMuted);
    }

    return true;
  }

  /** Memutuskan koneksi peer secara manual */
  public disconnectFromPeer(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
      console.log("[WebRTC] Menutup koneksi dengan:", peerId);
    }
    this.onRemoteStreamRemoved(peerId);
  }

  /** Memutus seluruh koneksi dan membersihkan alokasi memori */
  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    console.log("[WebRTC] Membersihkan WebRTC Manager...");

    for (const [peerId, pc] of this.peerConnections.entries()) {
      pc.close();
      this.onRemoteStreamRemoved(peerId);
    }
    this.peerConnections.clear();

    if (this.rawStream) {
      this.rawStream.getTracks().forEach((track) => track.stop());
      this.rawStream = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {
        /* ignore */
      });
      this.audioContext = null;
    }

    this.socket.off("webrtc-offer");
    this.socket.off("webrtc-answer");
    this.socket.off("webrtc-ice");
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public getMediaStream(): MediaStream | null {
    return this.localStream;
  }

  /** Memicu jabat tangan ICE Restart untuk memulihkan koneksi P2P */
  private async attemptIceRestart(peerId: string): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc || this.destroyed) return;
    if (!this.shouldInitiateOffer(peerId)) {
      console.log(
        `[WebRTC] Menunggu peer prioritas lebih tinggi melakukan ICE restart: ${peerId}`,
      );
      return;
    }

    try {
      console.log(`[WebRTC] Memicu ICE Restart untuk peer: ${peerId}`);
      const offer = await pc.createOffer({ iceRestart: true });

      const audioMode = this.getAudioMode();
      const tunedSdp = this.customizeSdp(offer.sdp || "", audioMode);
      const tunedOffer = new RTCSessionDescription({
        type: offer.type,
        sdp: tunedSdp,
      });
      await pc.setLocalDescription(tunedOffer);

      this.socket.emit("webrtc-offer", {
        targetId: peerId,
        sdp: tunedOffer,
      });
      console.log(
        `[WebRTC] ICE Restart offer berhasil dikirim ke peer: ${peerId}`,
      );
    } catch (err) {
      console.error(
        `[WebRTC] Gagal memicu ICE Restart untuk peer: ${peerId}`,
        err,
      );
    }
  }

  private getAudioMode(): "discussion" | "music" {
    try {
      const mode = localStorage.getItem("vwt_audio_mode");
      return mode === "discussion" || mode === "music" ? mode : "music";
    } catch {
      return "music";
    }
  }

  private shouldInitiateOffer(peerId: string): boolean {
    const myId = this.socket.id;
    return Boolean(myId && myId < peerId);
  }

  private hasUsableLocalStream(): boolean {
    const hasLocalTrack =
      this.localStream
        ?.getAudioTracks()
        .some((track) => track.readyState === "live") ?? false;
    const hasRawTrack =
      this.rawStream
        ?.getAudioTracks()
        .some((track) => track.readyState === "live") ?? false;

    return hasLocalTrack && hasRawTrack;
  }

  /** Menyisipkan parameter optimalisasi Opus (FEC, Bitrate, Stereo) ke dalam SDP */
  private customizeSdp(sdp: string, audioMode: "discussion" | "music"): string {
    let lines = sdp.split("\r\n");
    const opusPayloadType = this.findOpusPayloadType(lines);
    if (!opusPayloadType) return sdp;

    lines = lines.map((line) => {
      if (line.startsWith(`a=fmtp:${opusPayloadType}`)) {
        // Ekstrak parameter format asli
        const parts = line.split(" ");
        const fmtpVal = parts[1] || "";
        let formatParams = fmtpVal ? fmtpVal.split(";") : [];

        // Hapus parameter lama agar tidak duplikat
        formatParams = formatParams.filter(
          (p) =>
            !p.trim().startsWith("maxaveragebitrate") &&
            !p.trim().startsWith("useinbandfec") &&
            !p.trim().startsWith("stereo"),
        );

        // Suntikkan setelan optimalisasi NextVWT
        if (audioMode === "discussion") {
          formatParams.push("maxaveragebitrate=32000"); // Hemat bandwidth suara mono jernih
          formatParams.push("useinbandfec=1"); // FEC aktif untuk memulihkan paket drop
          formatParams.push("stereo=0");
        } else {
          formatParams.push("maxaveragebitrate=128000"); // Hi-Fi Stereo berkualitas tinggi
          formatParams.push("useinbandfec=1");
          formatParams.push("stereo=1");
        }

        parts[1] = formatParams.join(";");
        return parts.join(" ");
      }
      return line;
    });

    return lines.join("\r\n");
  }

  private findOpusPayloadType(lines: string[]): string | null {
    for (const line of lines) {
      if (
        line.startsWith("a=rtpmap:") &&
        line.toLowerCase().includes("opus/48000")
      ) {
        // Contoh: a=rtpmap:111 opus/48000/2
        const match = line.match(/a=rtpmap:(\d+)\s+opus\/48000/i);
        if (match) return match[1];
      }
    }
    return null;
  }

  /** Menerapkan DSP Audio (Bandpass filter 300Hz-3kHz & Waveshaper Distortion) untuk walkie-talkie analog */
  private applyAudioDSP(
    rawStream: MediaStream,
    audioMode: "discussion" | "music",
  ): MediaStream {
    if (!this.audioContext) return rawStream;

    const source = this.audioContext.createMediaStreamSource(rawStream);
    const dest = this.audioContext.createMediaStreamDestination();

    // -- 1. Equalizer 3-Band (Global untuk semua mode) --
    this.eqBassNode = this.audioContext.createBiquadFilter();
    this.eqBassNode.type = "lowshelf";
    this.eqBassNode.frequency.value = 250;

    this.eqMidNode = this.audioContext.createBiquadFilter();
    this.eqMidNode.type = "peaking";
    this.eqMidNode.frequency.value = 1000;
    this.eqMidNode.Q.value = 1;

    this.eqTrebleNode = this.audioContext.createBiquadFilter();
    this.eqTrebleNode.type = "highshelf";
    this.eqTrebleNode.frequency.value = 4000;

    // Terapkan nilai awal EQ
    this.eqBassNode.gain.value = this.currentEq.bass;
    this.eqMidNode.gain.value = this.currentEq.mid;
    this.eqTrebleNode.gain.value = this.currentEq.treble;

    // Hubungkan EQ
    source.connect(this.eqBassNode);
    this.eqBassNode.connect(this.eqMidNode);
    this.eqMidNode.connect(this.eqTrebleNode);

    // -- 2. Dynamic Audio Processing --
    if (audioMode !== "discussion") {
      console.log(
        "[WebRTC DSP] Mode musik terdeteksi. Bypass compressor (hanya EQ).",
      );
      this.eqTrebleNode.connect(dest);
      return dest.stream;
    }

    console.log(
      "[WebRTC DSP] Mengaktifkan broadcast-quality vocal processor (Crystal Clear Audio)",
    );

    // Gunakan DynamicsCompressorNode agar vokal terdengar stabil, lantang, dan tidak pecah (clipping)
    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.value = -24; // Titik mulai kompresi
    compressor.knee.value = 30; // Kurva halus
    compressor.ratio.value = 12; // Rasio kompresi tinggi untuk menyamakan volume
    compressor.attack.value = 0.003; // Tanggap cepat terhadap suara meledak (plosif)
    compressor.release.value = 0.25;

    // Gain node tambahan untuk mengimbangi volume yang ditekan compressor (make-up gain)
    const makeupGain = this.audioContext.createGain();
    makeupGain.gain.value = 1.8; // Boost volume yang hilang akibat kompresi

    // Hubungkan graf: EQ -> Compressor -> Makeup Gain -> Destination
    this.eqTrebleNode.connect(compressor);
    compressor.connect(makeupGain);
    makeupGain.connect(dest);

    return dest.stream;
  }

  public setEqualizer(bass: number, mid: number, treble: number) {
    this.currentEq = { bass, mid, treble };
    if (this.eqBassNode) this.eqBassNode.gain.value = bass;
    if (this.eqMidNode) this.eqMidNode.gain.value = mid;
    if (this.eqTrebleNode) this.eqTrebleNode.gain.value = treble;
  }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const k = amount;
    const n_samples = 44100;
    const curve: Float32Array<ArrayBuffer> = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x) / (3 + k * Math.abs(x));
    }
    return curve;
  }
}
