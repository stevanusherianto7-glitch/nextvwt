import { create } from "zustand";
import { Socket } from "socket.io-client";
import { useRealtimeStore, type RealtimeUser } from "./useRealtimeStore";
import { PresenceService } from "../services/PresenceService";
import { WebRTCManager } from "../network/WebRTCManager";
import { ConnectionManager } from "../network/ConnectionManager";

export interface User {
  id: string;
  name: string;
  channel: string;
  locationState: string;
  isSpeaking: boolean;
  avatarDataUrl?: string;
}

const getSafeLocalStorage = (key: string, defaultValue: string): string => {
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch (err) {
    console.warn(`[LocalStorage] Gagal membaca key '${key}':`, err);
    return defaultValue;
  }
};

const getSafeLocalStorageBool = (
  key: string,
  defaultValue: boolean,
): boolean => {
  try {
    const val = localStorage.getItem(key);
    if (val === null) return defaultValue;
    return val !== "false";
  } catch (err) {
    console.warn(`[LocalStorage] Gagal membaca bool key '${key}':`, err);
    return defaultValue;
  }
};

const getSafeLocalStorageNum = (key: string, defaultValue: number): number => {
  try {
    const val = localStorage.getItem(key);
    if (val === null) return defaultValue;
    const parsed = Number(val);
    return isNaN(parsed) ? defaultValue : parsed;
  } catch (err) {
    console.warn(`[LocalStorage] Gagal membaca number key '${key}':`, err);
    return defaultValue;
  }
};

interface AppState {
  socket: Socket | null;
  presenceService: PresenceService | null;
  webRtcManager: WebRTCManager | null;
  isConnected: boolean;
  currentUser: User | null;
  currentChannel: string;

  // Settings State
  settings: {
    username: string;
    location: string;
    showMyPhoto: boolean;
    avatarDataUrl: string;
    showOtherPhotos: boolean;
    listShowPhotos: boolean;
    fastClick: boolean;
    showModulator: boolean;
    showPtt: boolean;
    maxQueueSize: number;
    audioMode: "discussion" | "music";
    preferredInputDeviceId: string;
    preferredInputDeviceLabel: string;
    karaokeModuleEnabled: boolean;
    karaokeOpenMic: boolean;
    karaokeSessionMode:
      | "normal"
      | "sing_song_ptt"
      | "karaoke_open_mic"
      | "moderator";
    pttSize: number;
    pttThreshold: number;
    pttToggle: boolean;
    pttVolume: number;
    vibrateStart: boolean;
    tonesStartEnd: boolean;
    runInBackground: boolean;
    fullDuplexMode: boolean;
    theme: string;
    equalizer: { bass: number; mid: number; treble: number };
  };

  // UI Modal State (terpisah dari realtime state)
  isChannelListOpen: boolean;
  isUserListOpen: boolean;
  isSettingsOpen: boolean;

  // Actions
  initializeSocket: () => void;
  joinChannel: (channel: string, username: string, location: string) => void;
  destroySocket: () => void;
  updateSettings: (newSettings: Partial<AppState["settings"]>) => void;

  setChannelListOpen: (isOpen: boolean) => void;
  setUserListOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  socket: null,
  presenceService: null,
  webRtcManager: null,
  isConnected: false,
  currentUser: null,
  currentChannel: "100",

  settings: {
    username: getSafeLocalStorage("vwt_username", ""),
    location: getSafeLocalStorage("vwt_location", "BANDUNG, JAWA BARAT"),
    showMyPhoto: getSafeLocalStorageBool("vwt_show_my_photo", true),
    avatarDataUrl: getSafeLocalStorage("vwt_avatar_data_url", ""),
    showOtherPhotos: getSafeLocalStorageBool("vwt_show_other_photos", true),
    listShowPhotos: getSafeLocalStorageBool("vwt_list_show_photos", true),
    fastClick: getSafeLocalStorageBool("vwt_fast_click", true),
    showModulator: getSafeLocalStorageBool("vwt_show_modulator", true),
    showPtt: getSafeLocalStorageBool("vwt_show_ptt", true),
    maxQueueSize: getSafeLocalStorageNum("vwt_max_queue_size", 99999),
    audioMode: getSafeLocalStorage("vwt_audio_mode", "music") as
      | "discussion"
      | "music",
    preferredInputDeviceId: getSafeLocalStorage(
      "vwt_audio_input_device_id",
      "",
    ),
    preferredInputDeviceLabel: getSafeLocalStorage(
      "vwt_audio_input_device_label",
      "",
    ),
    karaokeModuleEnabled: getSafeLocalStorageBool(
      "vwt_karaoke_module_enabled",
      true,
    ),
    karaokeOpenMic: getSafeLocalStorageBool("vwt_karaoke_open_mic", false),
    karaokeSessionMode: getSafeLocalStorage(
      "vwt_karaoke_session_mode",
      "normal",
    ) as "normal" | "sing_song_ptt" | "karaoke_open_mic" | "moderator",
    pttSize: getSafeLocalStorageNum("vwt_ptt_size", 20),
    pttThreshold: getSafeLocalStorageNum("vwt_ptt_threshold", 30),
    pttToggle: getSafeLocalStorageBool("vwt_ptt_toggle", false),
    pttVolume: getSafeLocalStorageNum("vwt_ptt_volume", 40),
    vibrateStart: getSafeLocalStorageBool("vwt_vibrate_start", true),
    tonesStartEnd: getSafeLocalStorageBool("vwt_tones_start_end", true),
    runInBackground: getSafeLocalStorageBool("vwt_run_in_background", true),
    fullDuplexMode: getSafeLocalStorageBool("vwt_full_duplex_mode", false),
    theme: getSafeLocalStorage("vwt_theme", "Monokrom"),
    equalizer: {
      bass: getSafeLocalStorageNum("vwt_eq_bass", 0),
      mid: getSafeLocalStorageNum("vwt_eq_mid", 0),
      treble: getSafeLocalStorageNum("vwt_eq_treble", 0),
    },
  },

  isChannelListOpen: false,
  isUserListOpen: false,
  isSettingsOpen: false,

  initializeSocket: () => {
    const {
      socket: existingSocket,
      presenceService: existingPresence,
      webRtcManager: existingWebRtc,
    } = get();

    const connectionManager = ConnectionManager.getInstance();

    // Guard React StrictMode/dev: jika socket sudah connected ATAU masih proses
    // connecting/reconnecting, jangan diputus lalu dibuat ulang. Ini adalah
    // penyebab umum badge RECONNECTING tertahan di browser saat development.
    if (
      existingSocket &&
      (existingSocket.connected || connectionManager.isConnecting)
    ) {
      console.log(
        "[useAppStore] Socket sudah aktif / sedang connecting, skip init",
      );
      return;
    }

    // Jika ada socket lama yang benar-benar idle/disconnected, bersihkan dulu.
    if (existingPresence) {
      existingPresence.destroy();
    }
    if (existingWebRtc) {
      existingWebRtc.destroy();
    }
    if (existingSocket) {
      existingSocket.removeAllListeners();
      existingSocket.disconnect();
      set({ socket: null, presenceService: null, webRtcManager: null });
    }

    const socket = connectionManager.connect();

    // Inisialisasi dan jalankan PresenceService (detak jantung otomatis)
    const presenceService = new PresenceService(socket);
    presenceService.startHeartbeat();

    // Inisialisasi WebRTCManager untuk koordinasi Mesh P2P audio
    const webRtcManager = new WebRTCManager(
      socket,
      (peerId, stream) => {
        console.log("[WebRTC] Memutar aliran suara remote untuk:", peerId);

        // Hapus elemen audio lama jika ada
        const existingAudio = document.getElementById(
          `webrtc-audio-${peerId}`,
        ) as HTMLAudioElement;
        if (existingAudio) {
          existingAudio.srcObject = null;
          existingAudio.remove();
        }

        const audio = document.createElement("audio");
        audio.id = `webrtc-audio-${peerId}`;
        audio.srcObject = stream;
        audio.autoplay = true;
        audio.style.display = "none";
        document.body.appendChild(audio);

        audio.play().catch((err) => {
          console.warn(
            "[WebRTC] Gagal memutar suara remote dari peer:",
            peerId,
            err,
          );
        });
      },
      (peerId) => {
        console.log("[WebRTC] Menghentikan aliran suara remote dari:", peerId);
        const audio = document.getElementById(
          `webrtc-audio-${peerId}`,
        ) as HTMLAudioElement;
        if (audio) {
          audio.srcObject = null;
          audio.remove();
        }
      },
    );

    // Suntikkan konfigurasi EQ awal (memutus circular dependency antara useAppStore & WebRTCManager)
    const currentEq = get().settings.equalizer;
    webRtcManager.setEqualizer(currentEq.bass, currentEq.mid, currentEq.treble);

    const realtimeStore = useRealtimeStore.getState();

    // ── Connection Events ──────────────────────────────────────────────
    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
      set({ isConnected: true });
      realtimeStore.setConnected(true, socket.id);

      const state = get();

      // Delta Sync & LWW Conflict Resolution:
      // Periksa apakah ada perubahan profil offline yang belum tersinkronisasi
      let currentUsername = state.currentUser?.name || state.settings.username;
      let currentLocation =
        state.currentUser?.locationState || state.settings.location;

      try {
        if (localStorage.getItem("vwt_profile_dirty") === "true") {
          const cachedName = localStorage.getItem("vwt_username");
          const cachedLocation = localStorage.getItem("vwt_location");
          if (cachedName) currentUsername = cachedName;
          if (cachedLocation) currentLocation = cachedLocation;

          console.log(
            `[Offline Sync] Delta Sync terdeteksi. Menyinkronkan profil LWW: ${currentUsername} (${currentLocation})`,
          );

          localStorage.removeItem("vwt_profile_dirty");
          localStorage.removeItem("vwt_profile_timestamp");
        }
      } catch (err) {
        console.warn(
          "[Offline Sync] Gagal memeriksa status kotor profil offline:",
          err,
        );
      }

      if (state.currentUser || state.settings.username) {
        console.log(
          `[Socket] Auto-rejoining channel ${state.currentChannel} as ${currentUsername}`,
        );
        socket.emit("join-channel", {
          name: currentUsername,
          channel: state.currentChannel,
          locationState: currentLocation,
          avatarDataUrl: state.settings.showMyPhoto
            ? state.settings.avatarDataUrl
            : "",
        });

        // Perbarui currentUser lokal dengan socket.id baru dan data tersinkronisasi
        set({
          currentUser: {
            id: socket.id || "",
            name: currentUsername,
            channel: state.currentChannel,
            locationState: currentLocation,
            isSpeaking: false,
            avatarDataUrl: state.settings.showMyPhoto
              ? state.settings.avatarDataUrl
              : "",
          },
        });
      }
    });

    socket.on("disconnect", (reason) => {
      console.warn("[Socket] Disconnected:", reason);
      set({ isConnected: false });
      realtimeStore.setConnected(false);

      // Reset speaking state semua user saat disconnect
      const users = useRealtimeStore.getState().users;
      Object.keys(users).forEach((id) => {
        useRealtimeStore.getState().setSpeaking(id, false);
      });
    });

    socket.on("join-success", (user: RealtimeUser) => {
      console.log(`[Socket] Join channel berhasil: ${user.channel}`);

      set({
        currentChannel: user.channel,
        currentUser: {
          id: user.id,
          name: user.name,
          channel: user.channel,
          locationState: user.locationState,
          isSpeaking: false,
          avatarDataUrl: user.avatarDataUrl || "",
        },
        isChannelListOpen: false,
        isUserListOpen: false,
      });

      realtimeStore.setChannel(user.channel);
      useRealtimeStore.getState().upsertUser(user);
    });

    socket.on(
      "join-error",
      (error: { code?: string; channel?: string; message?: string }) => {
        const channel =
          typeof error.channel === "string"
            ? error.channel
            : get().currentChannel;
        const message = error.message || "Gagal masuk channel.";
        console.warn("[Socket] Join channel ditolak:", error);

        if (
          (error.code === "PASSWORD_REQUIRED" ||
            error.code === "UNAUTHORIZED") &&
          typeof window !== "undefined"
        ) {
          const pin = window.prompt(
            `${message}\n\nMasukkan password channel ${channel}:`,
          );
          if (pin !== null) {
            const state = get();
            const username =
              state.settings.username || state.currentUser?.name || "Guest";
            const locationState =
              state.settings.location ||
              state.currentUser?.locationState ||
              "Unknown Region";
            socket.emit("join-channel", {
              name: username,
              channel,
              locationState,
              pin,
              avatarDataUrl: state.settings.showMyPhoto
                ? state.settings.avatarDataUrl
                : "",
            });
          }
          return;
        }

        if (typeof window !== "undefined") {
          window.alert(message);
        }
      },
    );

    // ── User Events ────────────────────────────────────────────────────
    socket.on("user-joined", (user: RealtimeUser) => {
      useRealtimeStore.getState().upsertUser(user);

      // WebRTC: Mulai jabat tangan penawaran koneksi P2P jika bukan diri sendiri
      if (user.id !== socket.id && get().webRtcManager) {
        get().webRtcManager!.connectToPeer(user.id);
      }
    });

    socket.on("user-left", (userId: string) => {
      useRealtimeStore.getState().removeUser(userId);

      // WebRTC: Tutup koneksi peer dengan user yang keluar
      if (get().webRtcManager) {
        get().webRtcManager!.disconnectFromPeer(userId);
      }
    });

    socket.on("channel-users", (users: RealtimeUser[]) => {
      useRealtimeStore.getState().setUsersFromList(users);

      // WebRTC: Koneksikan P2P ke seluruh user yang sudah ada di channel saat kita baru join
      const myId = socket.id;
      const rtc = get().webRtcManager;
      if (rtc) {
        users.forEach((user) => {
          if (user.id !== myId) {
            rtc.connectToPeer(user.id);
          }
        });
      }
    });

    socket.on(
      "user-speaking",
      ({ userId, isSpeaking }: { userId: string; isSpeaking: boolean }) => {
        useRealtimeStore.getState().setSpeaking(userId, isSpeaking);
      },
    );

    set({ socket, presenceService, webRtcManager });
  },

  joinChannel: (channel: string, username: string, location: string) => {
    const { socket } = get();
    if (!socket?.connected) {
      console.warn("[useAppStore] joinChannel: socket belum connected");
      return;
    }

    // Server adalah sumber kebenaran. Semua channel bebas dikunjungi,
    // kecuali channel yang memang diproteksi password oleh pengelola.
    // State lokal baru dipindah setelah event 'join-success'.
    const cachedPin = (() => {
      try {
        return localStorage.getItem(`vwt_channel_pin_${channel}`) || undefined;
      } catch {
        return undefined;
      }
    })();

    const state = get();
    socket.emit("join-channel", {
      name: username,
      channel,
      locationState: location,
      pin: cachedPin,
      avatarDataUrl: state.settings.showMyPhoto
        ? state.settings.avatarDataUrl
        : "",
    });
  },

  destroySocket: () => {
    const { presenceService, webRtcManager } = get();
    if (presenceService) {
      presenceService.destroy();
    }
    if (webRtcManager) {
      webRtcManager.destroy();
    }
    ConnectionManager.getInstance().disconnect();
    set({
      socket: null,
      presenceService: null,
      webRtcManager: null,
      isConnected: false,
      currentUser: null,
    });
    useRealtimeStore.getState().reset();
  },

  updateSettings: (newSettings) => {
    const current = get().settings;
    const updated = { ...current, ...newSettings };

    try {
      localStorage.setItem("vwt_username", updated.username);
      localStorage.setItem("vwt_location", updated.location);
      localStorage.setItem("vwt_show_my_photo", String(updated.showMyPhoto));
      localStorage.setItem("vwt_avatar_data_url", updated.avatarDataUrl);
      localStorage.setItem(
        "vwt_show_other_photos",
        String(updated.showOtherPhotos),
      );
      localStorage.setItem(
        "vwt_list_show_photos",
        String(updated.listShowPhotos),
      );
      localStorage.setItem("vwt_fast_click", String(updated.fastClick));
      localStorage.setItem("vwt_show_modulator", String(updated.showModulator));
      localStorage.setItem("vwt_show_ptt", String(updated.showPtt));
      localStorage.setItem("vwt_max_queue_size", String(updated.maxQueueSize));
      localStorage.setItem("vwt_audio_mode", updated.audioMode);
      localStorage.setItem(
        "vwt_audio_input_device_id",
        updated.preferredInputDeviceId,
      );
      localStorage.setItem(
        "vwt_audio_input_device_label",
        updated.preferredInputDeviceLabel,
      );
      localStorage.setItem(
        "vwt_karaoke_module_enabled",
        String(updated.karaokeModuleEnabled),
      );
      localStorage.setItem(
        "vwt_karaoke_open_mic",
        String(updated.karaokeOpenMic),
      );
      localStorage.setItem(
        "vwt_karaoke_session_mode",
        updated.karaokeSessionMode,
      );
      localStorage.setItem("vwt_ptt_size", String(updated.pttSize));
      localStorage.setItem("vwt_ptt_threshold", String(updated.pttThreshold));
      localStorage.setItem("vwt_ptt_toggle", String(updated.pttToggle));
      localStorage.setItem("vwt_ptt_volume", String(updated.pttVolume));
      localStorage.setItem("vwt_vibrate_start", String(updated.vibrateStart));
      localStorage.setItem(
        "vwt_tones_start_end",
        String(updated.tonesStartEnd),
      );
      localStorage.setItem(
        "vwt_run_in_background",
        String(updated.runInBackground),
      );
      localStorage.setItem(
        "vwt_full_duplex_mode",
        String(updated.fullDuplexMode),
      );
      localStorage.setItem("vwt_theme", updated.theme);
    } catch (err) {
      console.warn("[LocalStorage] Gagal menyimpan pengaturan:", err);
    }

    set({ settings: updated });

    // Real-time Profile Broadcast & Offline Dirty Tracking
    if (
      newSettings.username !== undefined ||
      newSettings.location !== undefined ||
      newSettings.avatarDataUrl !== undefined ||
      newSettings.showMyPhoto !== undefined
    ) {
      const isOnline = get().isConnected;
      if (isOnline) {
        console.log(
          `[Profile Broadcast] Menyiarkan identitas baru online: ${updated.username} (${updated.location})`,
        );
        get().joinChannel(
          get().currentChannel,
          updated.username,
          updated.location,
        );
      } else {
        try {
          localStorage.setItem("vwt_profile_dirty", "true");
          localStorage.setItem("vwt_profile_timestamp", String(Date.now()));
          console.log(
            `[Profile Sync] Offline. Menandai profil kotor untuk sinkronisasi delta (LWW) nanti.`,
          );
        } catch (err) {
          console.warn("[LocalStorage] Gagal menandai profil kotor:", err);
        }
      }
    }

    // Perbarui mode audio WebRTC jika manager aktif
    const rtc = get().webRtcManager;
    if (
      rtc &&
      newSettings.audioMode &&
      newSettings.audioMode !== current.audioMode
    ) {
      rtc.updateAudioMode(newSettings.audioMode).catch((err) => {
        console.error(
          "[WebRTC] Gagal memperbarui mode audio secara dinamis:",
          err,
        );
      });
    }

    if (
      rtc &&
      newSettings.preferredInputDeviceId !== undefined &&
      newSettings.preferredInputDeviceId !== current.preferredInputDeviceId
    ) {
      rtc
        .updateAudioInputDevice(newSettings.preferredInputDeviceId)
        .catch((err) => {
          console.error(
            "[WebRTC] Gagal memperbarui perangkat input audio:",
            err,
          );
        });
    }
  },

  setChannelListOpen: (isOpen) => set({ isChannelListOpen: isOpen }),
  setUserListOpen: (isOpen) => set({ isUserListOpen: isOpen }),
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
}));
