import {
  Suspense,
  lazy,
  useEffect,
  useState,
  useRef,
  useCallback,
  type FormEvent,
  type PointerEvent,
} from "react";
import { Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import { cn } from "./lib/utils";

import { useAppStore } from "./store/useAppStore";
import {
  useRealtimeStore,
  selectUsersArray,
  selectSomeoneElseSpeaking,
} from "./store/useRealtimeStore";
import { useVoiceActivity } from "./hooks/useVoiceActivity";
import { supabase } from "./lib/supabase";
import { AuthForm } from "./components/auth/AuthForm";
import { SupabaseSyncService } from "./services/SupabaseSyncService";
import { ChannelList } from "./components/ChannelList";
import { UserListModal } from "./components/UserListModal";
import { SettingsModal } from "./components/SettingsModal";

// Sub-komponen modular Walkie-Talkie
import { TopHeader } from "./components/radio/TopHeader";
import { RadioDisplay } from "./components/radio/RadioDisplay";
import { RadioControls } from "./components/radio/RadioControls";
import { PTTButton } from "./components/radio/PTTButton";
import { WalkieTalkieSFX } from "./audio/WalkieTalkieSFX";
import { MobileLifecycleManager } from "./mobile/MobileLifecycleManager";

const FloatingKaraokePlayer = lazy(() =>
  import("./components/karaoke/FloatingKaraokePlayer").then((module) => ({
    default: module.FloatingKaraokePlayer,
  })),
);

const DEFAULT_CHANNELS = [
  { id: "0", name: "DUKUNGAN & BANTUAN" },
  { id: "100", name: "CHANNEL 100" },
  { id: "350", name: "MOPIO HITZ" },
  { id: "229", name: "SAHABAT AKP" },
  { id: "7", name: "SATU ASPAL" },
  { id: "18", name: "THE WINNER" },
  { id: "90", name: "FAMILY NUSANTARA" },
];

const getCasingClass = (theme: string) => {
  switch (theme) {
    case "Taktis (Hijau)":
      return "casing-taktis";
    case "Siber (Biru)":
      return "casing-siber";
    case "Monokrom (Putih)":
      return "casing-monokrom";
    case "Motif Serat Karbon":
      return "casing-carbon";
    case "Motif Teraso Terang":
      return "casing-terrazzo";
    case "Motif Galaxy Cosmic":
      return "casing-cosmic";
    default:
      return "casing-klasik";
  }
};

const getInnerContainerClass = (theme: string) => {
  switch (theme) {
    case "Taktis (Hijau)":
      return "bg-gradient-to-b from-[#2e3f33]/90 via-[#1f2b23]/95 to-[#121915]/98 border-[#3b4f41]/40 text-[#dcfce7]/90 shadow-[0_15px_25px_rgba(0,0,0,0.45),inset_0_4px_8px_rgba(255,255,255,0.1)]";
    case "Siber (Biru)":
      return "bg-gradient-to-b from-[#0f172a]/90 via-[#020617]/95 to-black/98 border-[#1e293b]/40 text-[#f0f9ff]/90 shadow-[0_15px_25px_rgba(0,0,0,0.45),inset_0_4px_8px_rgba(255,255,255,0.1)]";
    case "Motif Serat Karbon":
      return "bg-gradient-to-b from-[#1c1c1c]/90 via-[#121212]/95 to-black/98 border-[#2d2d2d]/50 text-white shadow-[0_15px_25px_rgba(0,0,0,0.6),inset_0_4px_8px_rgba(255,255,255,0.05)]";
    case "Motif Teraso Terang":
      return "bg-gradient-to-b from-[#faf9f5]/80 via-[#f1f5f9]/85 to-[#e2e8f0]/90 border-[#cbd5e1]/40 text-gray-900 shadow-[0_15px_25px_rgba(0,0,0,0.15),inset_0_4px_8px_rgba(255,255,255,0.8)]";
    case "Motif Galaxy Cosmic":
      return "bg-gradient-to-b from-[#170e30]/85 via-[#080415]/95 to-black/98 border-[#6366f1]/30 text-white shadow-[0_15px_25px_rgba(0,0,0,0.5),inset_0_4px_8px_rgba(99,102,241,0.1)]";
    default: // Klasik (Oranye), Monokrom (Putih)
      return "bg-gradient-to-b from-[#ffffff] from-20% via-[#f1f5f9] via-70% to-[#cbd5e1] border-[#e5e7eb] text-gray-900 shadow-[0_15px_25px_rgba(0,0,0,0.25),0_5px_10px_rgba(0,0,0,0.1),inset_0_4px_8px_rgba(255,255,255,1),inset_0_-4px_10px_rgba(0,0,0,0.1)]";
  }
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [isInitializingAuth, setIsInitializingAuth] = useState(true);

  const {
    initializeSocket,
    isConnected,
    socket,
    joinChannel,
    currentUser,
    currentChannel,
    isChannelListOpen,
    setChannelListOpen,
    isUserListOpen,
    setUserListOpen,
    isSettingsOpen,
    setSettingsOpen,
    webRtcManager,
    settings,
  } = useAppStore();

  // Ambil users dari RealtimeStore — lebih efisien (normalized map)
  const usersArray = useRealtimeStore(useShallow(selectUsersArray));
  const isTransmitting = useRealtimeStore((s) => s.isTransmitting);
  const setTransmitting = useRealtimeStore((s) => s.setTransmitting);
  const someOneElseSpeaking = useRealtimeStore((s) =>
    selectSomeoneElseSpeaking(s, currentUser?.id ?? null),
  );

  // Selector boolean primitif untuk mendeteksi suara aktif (anti infinite-loop)
  const anySpeaking = useRealtimeStore(
    (s) => Object.values(s.users).some((u) => u.isSpeaking) || s.isTransmitting,
  );

  const serverLatency = useRealtimeStore((s) => s.serverLatency);

  // ── Engine state ────────────────────────────────────────────────────
  const [isOn, setIsOn] = useState(false);
  const [bootStatus, setBootStatus] = useState<
    "off" | "fetching" | "authorizing" | "complete"
  >("off");
  const [name, setName] = useState(
    () => localStorage.getItem("vwt_username") || "",
  );
  const [location, setLocation] = useState(
    () => localStorage.getItem("vwt_location") || "",
  );

  // ── Voice Activity Detection (VAD) state & hook ─────────────────────
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [activeContext, setActiveContext] = useState<AudioContext | null>(null);
  const isLocalSpeaking = useVoiceActivity(activeContext, activeStream);

  // ── Display state ───────────────────────────────────────────────────
  const [audioLevel, setAudioLevel] = useState(5);
  const [signalStrength, setSignalStrength] = useState(4);
  const [blinkUsers, setBlinkUsers] = useState(false);
  const [showLatency, setShowLatency] = useState(false);
  const [isKaraokePlayerOpen, setKaraokePlayerOpen] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [activeUserAction, setActiveUserAction] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showUserInfo, setShowUserInfo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const prevUserCount = useRef(0);
  const initialJoinedRef = useRef(false);
  const prevSomeoneElseSpeaking = useRef(false);

  // ── Efek derau statis (Squelch Tail) saat penerimaan audio remote selesai ──
  useEffect(() => {
    if (!someOneElseSpeaking && prevSomeoneElseSpeaking.current) {
      const storeSettings = useAppStore.getState().settings;
      if (storeSettings.tonesStartEnd) {
        WalkieTalkieSFX.playSquelchTail();
      }
    }
    prevSomeoneElseSpeaking.current = someOneElseSpeaking;
  }, [someOneElseSpeaking]);

  // ── User blink animation ────────────────────────────────────────────
  useEffect(() => {
    if (usersArray.length > prevUserCount.current && usersArray.length > 1) {
      setBlinkUsers(true);
      const t = setTimeout(() => setBlinkUsers(false), 2000);
      prevUserCount.current = usersArray.length;
      return () => clearTimeout(t);
    }
    prevUserCount.current = usersArray.length;
  }, [usersArray.length]);

  // ── Signal Strength Simulator ───────────────────────────────────────
  useEffect(() => {
    if (!isConnected) {
      setSignalStrength(0);
      return;
    }
    const interval = setInterval(() => {
      setSignalStrength(
        Math.random() > 0.8
          ? Math.floor(Math.random() * 2) + 1
          : Math.floor(Math.random() * 2) + 3,
      );
    }, 4500);
    return () => clearInterval(interval);
  }, [isConnected]);

  // ── Audio Level Visualizer ──────────────────────────────────────────
  useEffect(() => {
    if (!anySpeaking || !isOn) {
      setAudioLevel(5);
      return;
    }
    const interval = setInterval(() => {
      setAudioLevel(Math.floor(Math.random() * 80) + 20);
    }, 100);
    return () => clearInterval(interval);
  }, [anySpeaking, isOn]);

  // ── Boot sequence ───────────────────────────────────────────────────  // 💡 Auth Effect
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session) {
          setSession(session);
          SupabaseSyncService.getInstance().loadProfileFromSupabase(
            session.user.id,
          );
          const fallbackName =
            localStorage.getItem("vwt_username") ||
            session.user.email?.split("@")[0] ||
            "Guest";
          setName(fallbackName);
          useAppStore.getState().updateSettings({
            username: fallbackName,
            location: location || "Unknown Region",
          });
        }
        setIsInitializingAuth(false);
      })
      .catch((err) => {
        console.error("[Auth] Offline / Error:", err);
        // Fallback: Lanjutkan saja ke form Auth tanpa memblokir aplikasi
        setIsInitializingAuth(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) {
        setSession(newSession);
        SupabaseSyncService.getInstance().loadProfileFromSupabase(
          newSession.user.id,
        );
      } else {
        // Prevent Supabase from clearing our offline mock session
        setSession((prev) => {
          if (prev && prev.access_token === "mock") return prev;
          return null;
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 💡 Auto-boot dihandle melalui saklar Power (onPowerToggle)
  const handlePowerToggle = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (isOn) {
        // Matikan secara graceful, jangan reload page (karena akan mereset auth state/session offline)
        setIsOn(false);
        setBootStatus("off");
        const rtc = useAppStore.getState().webRtcManager;
        if (rtc) {
          rtc.setMute(true);
        }
        setActiveStream(null);
        setActiveContext(null);
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      } else {
        if (!session) return;
        setIsOn(true);
        setBootStatus("fetching");
        if (navigator.vibrate) navigator.vibrate(40);
      }
    },
    [isOn, session],
  );

  useEffect(() => {
    if (bootStatus === "fetching") {
      const t = setTimeout(() => setBootStatus("authorizing"), 1500);
      return () => clearTimeout(t);
    }
    if (bootStatus === "authorizing") {
      const t = setTimeout(() => {
        setBootStatus("complete");
        initializeSocket();
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [bootStatus, initializeSocket]);

  // ── WebRTC Inisialisasi — setelah terhubung dan join channel ──────────
  useEffect(() => {
    if (bootStatus !== "complete" || !isConnected || !socket || !isOn) return;

    if (!initialJoinedRef.current) {
      joinChannel("100", name, location || "Unknown Region");
      initialJoinedRef.current = true;

      // Pemanasan awal aliran mikrofon lokal agar prompt perizinan browser muncul instan
      if (webRtcManager) {
        const initialMode =
          (localStorage.getItem("vwt_audio_mode") as "discussion" | "music") ||
          "music";
        webRtcManager.initializeLocalStream(initialMode).catch((err) => {
          console.warn(
            "[WebRTC] Gagal melakukan inisialisasi mikrofon awal:",
            err,
          );
        });
      }
    }
  }, [
    bootStatus,
    isConnected,
    socket,
    isOn,
    webRtcManager,
    joinChannel,
    name,
    location,
  ]);

  // ── Channel selection ───────────────────────────────────────────────
  const handleChannelSelect = useCallback(
    (channelId: string) => {
      joinChannel(channelId, name, location || "Unknown Region");
    },
    [joinChannel, name, location],
  );

  const pttLockRef = useRef(false);
  const pttPressedRef = useRef(false);

  const togglePtt = useCallback(
    async (e: React.MouseEvent | PointerEvent) => {
      if (e.cancelable) e.preventDefault();
      
      if (!isOn) return; // Prevent PTT if power is OFF

      // Jika sedang transmit, maka hentikan
      if (pttPressedRef.current) {
        if (!webRtcManager) return;

        webRtcManager.setMute(true);
        pttPressedRef.current = false;
        setTransmitting(false);

        const storeSettings = useAppStore.getState().settings;
        if (storeSettings.tonesStartEnd) {
          WalkieTalkieSFX.playRogerBeep();
          setTimeout(() => {
            WalkieTalkieSFX.playSquelchTail();
          }, 160);
        }

        setActiveStream(null);
        setActiveContext(null);

        if (navigator.vibrate) navigator.vibrate(30);
        return;
      }

      // Jika tidak transmit, maka mulai transmit
      if (someOneElseSpeaking && !settings.fullDuplexMode) {
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        return;
      }

      if (pttLockRef.current) return;
      if (!webRtcManager) return;

      pttLockRef.current = true;
      try {
        const storeSettings = useAppStore.getState().settings;
        const isStreamReady = await webRtcManager.ensureLocalStreamReady(
          storeSettings.audioMode,
        );
        if (!isStreamReady) return;

        if (!webRtcManager.setMute(false)) {
          throw new Error("Local audio stream is not ready");
        }

        pttPressedRef.current = true;
        setTransmitting(true);

        if (storeSettings.tonesStartEnd) {
          WalkieTalkieSFX.playStartTone();
        }

        setActiveStream(webRtcManager.getMediaStream());
        setActiveContext(webRtcManager.getAudioContext());

        if (navigator.vibrate) navigator.vibrate(40);
      } catch (err) {
        console.error("[PTT] toggleRecording error:", err);
        webRtcManager.setMute(true);
        pttPressedRef.current = false;
        setTransmitting(false);
        setActiveStream(null);
        setActiveContext(null);
      } finally {
        pttLockRef.current = false;
      }
    },
    [
      isOn,
      someOneElseSpeaking,
      settings.fullDuplexMode,
      setTransmitting,
      webRtcManager,
    ],
  );

  // stopPtt dipanggil saat komponen di-unmount atau background
  const stopPtt = useCallback(() => {
    if (!pttPressedRef.current || !webRtcManager) return;
    webRtcManager.setMute(true);
    pttPressedRef.current = false;
    setTransmitting(false);
    setActiveStream(null);
    setActiveContext(null);
  }, [setTransmitting, webRtcManager]);

  // ── Mobile Lifecycle Management ─────────────────────────────────────
  useEffect(() => {
    if (bootStatus !== "complete" || !webRtcManager) return;

    const lifecycleManager = new MobileLifecycleManager();
    lifecycleManager.initialize({
      onBackground: () => {
        // Hentikan PTT jika sedang mentransmisikan audio
        if (useRealtimeStore.getState().isTransmitting) {
          console.log(
            "[MobileLifecycle] Menghentikan PTT karena masuk background",
          );
          stopPtt();
        }

        // Tangguhkan AudioContext untuk menghemat daya
        const ctx = webRtcManager.getAudioContext();
        if (ctx && ctx.state !== "suspended") {
          ctx
            .suspend()
            .then(() => {
              console.log(
                "[MobileLifecycle] AudioContext berhasil ditangguhkan",
              );
            })
            .catch((err) => {
              console.warn(
                "[MobileLifecycle] Gagal menangguhkan AudioContext:",
                err,
              );
            });
        }
      },
      onForeground: () => {
        // Pulihkan AudioContext saat kembali aktif
        const ctx = webRtcManager.getAudioContext();
        if (ctx && ctx.state === "suspended") {
          ctx
            .resume()
            .then(() => {
              console.log("[MobileLifecycle] AudioContext berhasil dipulihkan");
            })
            .catch((err) => {
              console.warn(
                "[MobileLifecycle] Gagal memulihkan AudioContext:",
                err,
              );
            });
        }
      },
    });

    return () => {
      lifecycleManager.destroy();
    };
  }, [bootStatus, webRtcManager, stopPtt]);

  // ── Karaoke Open Mic Mode ────────────────────────────────────────────
  useEffect(() => {
    if (!isOn || !webRtcManager) return;

    const shouldOpenMic =
      settings.audioMode === "music" &&
      (settings.karaokeOpenMic ||
        settings.karaokeSessionMode === "karaoke_open_mic");
    if (!shouldOpenMic) {
      if (!pttPressedRef.current) {
        webRtcManager.setMute(true);
        setTransmitting(false);
        setActiveStream(null);
        setActiveContext(null);
      }
      return;
    }

    let cancelled = false;
    webRtcManager
      .ensureLocalStreamReady("music")
      .then((ready) => {
        if (cancelled || !ready) return;
        webRtcManager.setMute(false);
        setTransmitting(true);
        setActiveStream(webRtcManager.getMediaStream());
        setActiveContext(webRtcManager.getAudioContext());
      })
      .catch((err) => {
        console.error("[Karaoke] Gagal mengaktifkan Open Mic:", err);
      });

    return () => {
      cancelled = true;
      if (!pttPressedRef.current) {
        webRtcManager.setMute(true);
        setTransmitting(false);
        setActiveStream(null);
        setActiveContext(null);
      }
    };
  }, [
    isOn,
    webRtcManager,
    settings.karaokeOpenMic,
    settings.karaokeSessionMode,
    settings.audioMode,
    setTransmitting,
  ]);

  // ── Login Screen ────────────────────────────────────────────────────  // 💡 Loading Auth
  if (isInitializingAuth) {
    return (
      <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-amber-500 font-bold tracking-widest text-sm animate-pulse">
          AUTENTIKASI SISTEM...
        </p>
      </div>
    );
  }

  // 💡 Login Auth Screen
  if (!session) {
    return (
      <AuthForm
        onLoginSuccess={(username) => {
          if (username) setName(username);
          // Fallback if somehow login succeeds but session is still null (Offline Mock Bypass)
          if (!session) {
            setSession({
              user: {
                id: username || "offline-mock-user",
                email: "mock@nextvwt.local",
              },
              access_token: "mock",
            });
          }
        }}
      />
    );
  }

  const channelObj = DEFAULT_CHANNELS.find((c) => c.id === currentChannel);
  const currentChannelName = channelObj
    ? channelObj.name
    : `CHANNEL ${currentChannel}`;

  // ── Main App ────────────────────────────────────────────────────────
  return (
    <div className="h-[100dvh] w-full flex items-center justify-center font-sans overflow-hidden bg-black">
      <div className={cn("w-full sm:max-w-[420px] overflow-hidden relative flex flex-col h-full shrink-0", getCasingClass(settings.theme))}>
        {/* Top App Bar */}
        <TopHeader
          isLocalSpeaking={isLocalSpeaking}
          isTransmitting={isTransmitting}
          someOneElseSpeaking={someOneElseSpeaking}
          currentUser={currentUser}
          currentChannelName={currentChannelName}
          isOn={isOn}
          onPowerToggle={handlePowerToggle}
        />

        <div className="p-3 flex flex-col items-center flex-1 min-h-0">
          {!isUserListOpen && (
            <div className={cn("w-full rounded-t-[2.5rem] rounded-b-[5rem] p-4 pb-4 border-[1px] mb-2 flex flex-col shrink-0 transition-all duration-300", getInnerContainerClass(settings.theme))}>
              <RadioDisplay
                bootStatus={bootStatus}
                currentUser={currentUser}
                usersArray={usersArray}
                currentChannel={currentChannel}
                isConnected={isConnected}
                signalStrength={signalStrength}
                isTransmitting={isTransmitting}
                isLocalSpeaking={isLocalSpeaking}
                blinkUsers={blinkUsers}
                fallbackUsername={name}
                setShowChannelInfo={setShowChannelInfo}
                setUserListOpen={setUserListOpen}
                setActiveUserAction={setActiveUserAction}
                theme={settings.theme}
              />
              <RadioControls
                audioLevel={audioLevel}
                currentChannel={currentChannel}
                setChannelListOpen={setChannelListOpen}
                setSettingsOpen={setSettingsOpen}
                handleChannelSelect={handleChannelSelect}
              />
            </div>
          )}

          {isUserListOpen ? (
            <Suspense
              fallback={
                <div className="flex-1 w-full bg-gradient-to-b from-[#ffffff] to-[#f8fafc] p-3.5">
                  <div className="w-full h-12 bg-slate-100 rounded-2xl animate-pulse"></div>
                </div>
              }
            >
              <UserListModal
                users={usersArray}
                currentUserId={currentUser?.id || ""}
                isTransmitting={isTransmitting}
                onClose={() => setUserListOpen(false)}
              />
            </Suspense>
          ) : (
            <div className="flex-1"></div>
          )}

          {/* PTT Button */}
          <PTTButton
            isTransmitting={isTransmitting}
            someOneElseSpeaking={someOneElseSpeaking}
            onClick={togglePtt}
          />
        </div>

        {/* ── Modals ── */}
        <AnimatePresence>
          {showChannelInfo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-[320px] overflow-hidden flex flex-col"
              >
                <div className="flex items-center gap-2 p-3 font-semibold text-gray-700 border-b">
                  <div className="w-5 h-5 flex items-center justify-center border border-gray-400 rounded-sm bg-blue-50">
                    <span className="text-[10px] text-blue-600 font-bold">
                      i
                    </span>
                  </div>
                  <span>Channel {currentChannel}</span>
                </div>
                <div className="p-4 flex flex-col items-center">
                  <div className="w-40 h-40 relative flex items-center justify-center bg-[#f8fafc] rounded-full mb-4 border-[3px] border-[#fbbf24] shadow-inner">
                    <div className="absolute inset-0 flex items-center justify-center text-blue-600/10">
                      <Radio size={80} />
                    </div>
                    <div className="z-10 text-center font-bold">
                      <div className="flex justify-center mb-1">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-[10px]">LOGO</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-blue-800 uppercase tracking-widest">
                        Indonesia Virtual Walkie Talkie
                      </span>
                      <br />
                      <span className="text-2xl text-blue-600 uppercase tracking-tight">
                        NEXVWT
                      </span>
                    </div>
                  </div>
                  <div className="w-full text-[13px]">
                    <div className="flex border-b py-2">
                      <span className="w-14 font-semibold text-gray-500">
                        Nama
                      </span>
                      <span className="font-bold flex-1 text-gray-800">
                        LANDING - ECHO CHANNEL
                      </span>
                    </div>
                    <div className="flex py-2">
                      <span className="w-14 font-semibold text-gray-500">
                        Info
                      </span>
                      <span className="flex-1 font-medium text-gray-800 leading-tight">
                        🇮🇩 BHINNEKA TUNGGAL IKA
                        <br />
                        🇮🇩 TAN HANA DHARMA
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
              <div
                className="absolute inset-0 -z-10"
                onClick={() => setShowChannelInfo(false)}
              />
            </motion.div>
          )}

          {activeUserAction && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-lg shadow-2xl w-full max-w-[280px] overflow-hidden"
              >
                <div className="bg-[#1a1a1a] p-4 flex items-center gap-3">
                  <div className="relative w-7 h-7 flex items-center justify-center bg-blue-500/20 rounded-full">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-blue-400"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <span className="text-white font-medium text-[17px]">
                    {activeUserAction.name}
                  </span>
                </div>
                <div className="p-0">
                  <button
                    onClick={() => {
                      setShowUserInfo({
                        id: activeUserAction.id,
                        name: activeUserAction.name,
                      });
                      setActiveUserAction(null);
                    }}
                    className="w-full text-left px-5 py-3.5 text-black hover:bg-gray-100 font-medium text-[15px] border-b border-gray-100 transition-colors"
                  >
                    Info
                  </button>
                </div>
              </motion.div>
              <div
                className="absolute inset-0 -z-10"
                onClick={() => setActiveUserAction(null)}
              />
            </motion.div>
          )}

          {showUserInfo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-lg shadow-2xl w-full max-w-[280px] overflow-hidden flex flex-col pt-5"
              >
                <h3 className="px-5 font-bold text-[17px] mb-4 text-gray-800">
                  Info{" "}
                  {showUserInfo.id.substring(0, 5).toUpperCase() || "2DYUA"}
                </h3>
                <div className="px-5 text-[15px] flex flex-col gap-1.5 mb-6 text-gray-800">
                  <p>
                    <span className="font-bold w-16 inline-block">Nama</span>{" "}
                    {showUserInfo.name}
                  </p>
                  <p>
                    <span className="font-bold w-16 inline-block">Lokasi</span>{" "}
                    BANDUNG, JABAR
                  </p>
                  <p className="mt-2">
                    <span className="font-bold w-16 inline-block">Latensi</span>{" "}
                    {serverLatency}ms
                  </p>
                  <p>
                    <span className="font-bold w-16 inline-block">Via</span>{" "}
                    Laut
                  </p>
                  <p>
                    <span className="font-bold w-16 inline-block">Versi</span>{" "}
                    2.3.4
                  </p>
                </div>
                <div className="px-3 py-2 flex justify-end">
                  <button
                    onClick={() => setShowUserInfo(null)}
                    className="text-[#38bdf8] font-bold uppercase text-[15px] px-4 py-2 hover:bg-blue-50 rounded transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </motion.div>
              <div
                className="absolute inset-0 -z-10"
                onClick={() => setShowUserInfo(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {settings.karaokeModuleEnabled && isKaraokePlayerOpen && (
          <Suspense
            fallback={
              <div className="absolute right-3 top-20 z-[60] rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-cyan-100 shadow-xl">
                Memuat modul karaoke...
              </div>
            }
          >
            <FloatingKaraokePlayer
              onClose={() => setKaraokePlayerOpen(false)}
            />
          </Suspense>
        )}
        {isChannelListOpen && (
          <Suspense
            fallback={
              <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            }
          >
            <ChannelList
              currentChannelId={currentChannel}
              onSelect={handleChannelSelect}
              onClose={() => setChannelListOpen(false)}
            />
          </Suspense>
        )}
        {isSettingsOpen && (
          <Suspense
            fallback={
              <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            }
          >
            <SettingsModal
              onClose={() => setSettingsOpen(false)}
              onOpenKaraoke={() => {
                setSettingsOpen(false);
                setKaraokePlayerOpen(true);
              }}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
