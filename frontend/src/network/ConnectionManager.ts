import { io, type Socket } from "socket.io-client";
import { CryptoService } from "../services/CryptoService";

/**
 * ConnectionManager — Singleton socket manager.
 *
 * Stabil untuk React StrictMode/dev:
 * - Jangan buat socket baru ketika socket lama masih CONNECTING/RECONNECTING.
 * - Dukung signaling URL eksplisit via VITE_SIGNALING_URL.
 * - Fallback otomatis ke http://localhost:3000 jika UI dibuka dari Vite port 5173/preview.
 */
export class ConnectionManager {
  private static instance: ConnectionManager | null = null;
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private connecting = false;
  private lastServerUrl = "";
  private offlineQueue: Array<{
    event: string;
    payload?: unknown;
    encrypted?: boolean;
  }> = [];

  private constructor() {}

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  private resolveServerUrl(serverUrl?: string): string {
    if (serverUrl && serverUrl.trim()) return serverUrl.trim();

    const envUrl = import.meta.env.VITE_SIGNALING_URL as string | undefined;
    if (envUrl && envUrl.trim()) return envUrl.trim();

    if (typeof window !== "undefined") {
      const { protocol, hostname, port } = window.location;
      const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

      // Jika app tidak dibuka dari server terpadu port 3000, arahkan Socket.IO
      // ke backend dev default. Ini mencegah status RECONNECTING saat user
      // membuka UI dari Vite standalone/preview tetapi backend ada di 3000.
      if (isLocalhost && port && port !== "3000") {
        return `${protocol}//${hostname}:3000`;
      }
    }

    return "/";
  }

  connect(serverUrl?: string): Socket {
    const resolvedUrl = this.resolveServerUrl(serverUrl);

    if (this.socket) {
      const sameTarget = this.lastServerUrl === resolvedUrl;
      const socketAny = this.socket as Socket & { active?: boolean };

      if (
        sameTarget &&
        (this.socket.connected || this.connecting || socketAny.active)
      ) {
        return this.socket;
      }

      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.connecting = false;
    }

    this.lastServerUrl = resolvedUrl;
    this.connecting = true;

    this.socket = io(resolvedUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.3,
      timeout: 10000,
      forceNew: false,
      autoConnect: true,
      auth: {},
    });

    this.registerCoreEvents();
    return this.socket;
  }

  private registerCoreEvents(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log(`[ConnectionManager] Connected: ${this.socket?.id}`);
      this.reconnectAttempts = 0;
      this.connecting = false;
      this.flushOfflineQueue();
    });

    this.socket.on("disconnect", (reason) => {
      console.warn("[ConnectionManager] Disconnected:", reason);
      this.connecting = false;
    });

    this.socket.io.on("reconnect_attempt", (attempt) => {
      this.reconnectAttempts = attempt;
      this.connecting = true;
      console.log(`[ConnectionManager] Reconnect attempt #${attempt}`);
    });

    this.socket.io.on("reconnect", () => {
      this.connecting = false;
      this.reconnectAttempts = 0;
    });

    this.socket.io.on("reconnect_error", (error) => {
      this.connecting = true;
      console.error("[ConnectionManager] Reconnect error:", error.message);
    });

    this.socket.on("connect_error", (error) => {
      this.connecting = false;
      console.error("[ConnectionManager] Connection error:", error.message);
      if (typeof window !== "undefined") {
        console.error(
          "[ConnectionManager] Target URL:",
          this.lastServerUrl || window.location.origin,
        );
      }
    });
  }

  emit(event: string, payload?: unknown): void {
    if (!this.socket?.connected) {
      console.warn(
        `[ConnectionManager] Socket offline. Buffering emit: '${event}'`,
      );

      if (
        event === "speaking-status" ||
        event === "join-channel" ||
        event === "chat-message"
      ) {
        if (this.offlineQueue.length > 50) this.offlineQueue.shift();
        this.offlineQueue.push({ event, payload, encrypted: false });
      }
      return;
    }
    this.socket.emit(event, payload);
  }

  async emitEncrypted(event: string, payload: unknown): Promise<void> {
    const encryptedPayload = await CryptoService.encrypt(payload);

    if (!this.socket?.connected) {
      console.warn(
        `[ConnectionManager] Socket offline. Buffering encrypted emit: '${event}'`,
      );

      // Hindari mem-buffer stream audio yang memakan memori
      if (event !== "audio-stream" && event !== "voice-data") {
        if (this.offlineQueue.length > 50) this.offlineQueue.shift();
        this.offlineQueue.push({
          event,
          payload: encryptedPayload,
          encrypted: true,
        });
      }
      return;
    }
    this.socket.emit(event, encryptedPayload);
  }

  onEncrypted<T>(event: string, callback: (payload: T) => void): void {
    if (!this.socket) return;
    this.socket.on(event, async (encryptedPayload: string) => {
      const decrypted = await CryptoService.decrypt<T>(encryptedPayload);
      if (decrypted !== null) {
        callback(decrypted);
      }
    });
  }

  private flushOfflineQueue(): void {
    if (this.offlineQueue.length === 0 || !this.socket?.connected) return;
    console.log(
      `[ConnectionManager] Flushing ${this.offlineQueue.length} queued events`,
    );
    while (this.offlineQueue.length > 0) {
      const item = this.offlineQueue.shift();
      if (item) {
        this.socket.emit(item.event, item.payload);
      }
    }
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.socket) return;
    this.socket.off(event, callback);
    this.socket.on(event, callback);
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    this.socket?.off(event, callback);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.connecting = false;
    this.lastServerUrl = "";
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  get isConnecting(): boolean {
    const socketAny = this.socket as (Socket & { active?: boolean }) | null;
    return (
      this.connecting || Boolean(socketAny?.active && !this.socket?.connected)
    );
  }

  get attempts(): number {
    return this.reconnectAttempts;
  }
}
