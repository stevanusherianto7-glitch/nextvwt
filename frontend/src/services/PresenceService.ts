import { type Socket } from "socket.io-client";
import { useRealtimeStore } from "../store/useRealtimeStore";

/**
 * PresenceService — Heartbeat manager untuk user presence.
 *
 * Kirim heartbeat ke server setiap 5 detik agar server tahu user masih aktif.
 * Ini memungkinkan server membersihkan zombie users yang socketnya sudah putus
 * tapi belum menerima event 'disconnect' (edge case mobile/network switch).
 */
export class PresenceService {
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_INTERVAL_MS = 5000;

  constructor(private socket: Socket) {
    this.socket.on("heartbeat_ack", (data: { timestamp: number }) => {
      if (data?.timestamp) {
        const latency = Date.now() - data.timestamp;
        useRealtimeStore.getState().setServerLatency(latency);
      }
    });
  }

  startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.socket.connected) {
        this.socket.emit("heartbeat", { timestamp: Date.now() });
      }
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  destroy(): void {
    this.stopHeartbeat();
    this.socket.off("heartbeat_ack");
  }
}
