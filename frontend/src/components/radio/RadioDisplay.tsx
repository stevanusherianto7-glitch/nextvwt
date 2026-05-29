import { useState } from "react";
import { Activity, Radio } from "lucide-react";
import { cn } from "../../lib/utils";
import { User3D } from "./User3D";
import { type User } from "../../store/useAppStore";
import {
  useRealtimeStore,
  type RealtimeUser,
} from "../../store/useRealtimeStore";

interface RadioDisplayProps {
  bootStatus: "off" | "fetching" | "authorizing" | "complete";
  currentUser: User | null;
  usersArray: RealtimeUser[];
  currentChannel: string;
  isConnected: boolean;
  signalStrength: number;
  isTransmitting: boolean;
  isLocalSpeaking: boolean;
  blinkUsers: boolean;
  fallbackUsername: string;
  setShowChannelInfo: (val: boolean) => void;
  setUserListOpen: (val: boolean) => void;
  setActiveUserAction: (val: { id: string; name: string } | null) => void;
  theme?: string;
}

export function RadioDisplay({
  bootStatus,
  currentUser,
  usersArray,
  currentChannel,
  isConnected,
  signalStrength,
  isTransmitting,
  isLocalSpeaking,
  blinkUsers,
  fallbackUsername,
  setShowChannelInfo,
  setUserListOpen,
  setActiveUserAction,
  theme = "Klasik",
}: RadioDisplayProps) {
  const [showLatency, setShowLatency] = useState(false);
  const serverLatency = useRealtimeStore((s) => s.serverLatency);

  const getSignalColorClass = (barIndex: number) => {
    if (!isConnected || signalStrength < barIndex) {
      return "bg-white";
    }
    // Hanya merah saat sinyal tinggal 1 bar (paling kecil)
    if (signalStrength === 1) return "bg-[#ef4444]";
    // Semua kondisi lain: hijau
    return "bg-[#16a34a]";
  };

  let lcdBg = "bg-[#ff8c00]";
  let lcdShadow = "shadow-[inset_0_6px_22px_rgba(160,50,0,0.95),inset_0_0_12px_rgba(0,0,0,0.4)]";

  if (theme === "Taktis (Hijau)") {
    lcdBg = "bg-[#4ade80]";
    lcdShadow = "shadow-[inset_0_6px_22px_rgba(20,100,30,0.95),inset_0_0_12px_rgba(0,0,0,0.4)]";
  } else if (theme === "Siber (Biru)") {
    lcdBg = "bg-[#38bdf8]";
    lcdShadow = "shadow-[inset_0_6px_22px_rgba(10,80,150,0.95),inset_0_0_12px_rgba(0,0,0,0.4)]";
  } else if (theme === "Monokrom (Putih)") {
    lcdBg = "bg-[#f8fafc]";
    lcdShadow = "shadow-[inset_0_6px_22px_rgba(150,150,160,0.95),inset_0_0_12px_rgba(0,0,0,0.4)]";
  }

  return (
    <div className="w-full bg-[linear-gradient(160deg,#f8fafc_0%,#cbd5e1_25%,#94a3b8_50%,#cbd5e1_75%,#f1f5f9_100%)] p-3 rounded-[2rem] shadow-[0_12px_32px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-3px_5px_rgba(0,0,0,0.3)] border-[2px] border-[#64748b] border-t-[#ffffff] border-b-[#475569] mb-5 shrink-0 select-none relative overflow-hidden">
      {/* Glossy specular highlight reflection for the metal frame */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent pointer-events-none rounded-[2rem]"></div>
      <div className={cn("h-[120px] rounded-[1.2rem] p-3 border-[3px] border-[#161616] flex flex-col justify-between relative overflow-hidden shrink-0", lcdBg, lcdShadow)}>
        {/* Bezel scanlines and shadow effect */}
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.14) 50%)",
            backgroundSize: "100% 4px",
            opacity: 0.2,
          }}
        />

        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/12 to-transparent pointer-events-none rounded-t-[1rem] z-10"></div>

        {bootStatus === "off" ? null : bootStatus === "fetching" || bootStatus === "authorizing" ? (
          <div className="w-full h-full flex flex-col items-center justify-center relative z-10 text-center px-2 pt-2">
            <p className="font-sans font-bold text-[18px] text-[#111] drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]">
              {bootStatus === "fetching"
                ? "Mengambil data dari server..."
                : "Otorisasi..."}
            </p>
          </div>
        ) : (
          <>
            <div
              className="flex justify-between items-start mt-1 px-1 z-10"
              style={{
                filter: "drop-shadow(1px 1px 0px rgba(255,255,255,0.2))",
              }}
            >
              {/* User Callsign Indicator */}
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() =>
                  setActiveUserAction(
                    currentUser
                      ? { id: currentUser.id, name: currentUser.name }
                      : { id: "2DYUA", name: "Pebe Herianto" },
                  )
                }
              >
                <User3D color1="#38bdf8" color2="#0284c7" size={25} />
                <span className="font-sans text-[22px] font-bold text-[#1a0c02] tracking-tight truncate max-w-[150px] drop-shadow-[0_1px_0px_rgba(255,255,255,0.35)]">
                  {currentUser?.name || fallbackUsername}
                </span>
              </div>

              {/* Signal Strength & Latency Meter */}
              <div
                className="relative flex items-end gap-[1px] h-7 pb-1 mr-1 cursor-pointer"
                onClick={() => {
                  setShowLatency(true);
                  setTimeout(() => setShowLatency(false), 3000);
                }}
              >
                {showLatency && (
                  <div className="absolute top-full -right-2 mt-1 bg-black/90 text-white text-[10px] whitespace-nowrap px-1.5 py-0.5 rounded shadow-lg z-50">
                    Latency: {serverLatency}ms
                  </div>
                )}
                {!isConnected && (
                  <span
                    className="absolute -top-1.5 -left-3 text-red-700 font-black text-2xl leading-none"
                    style={{ WebkitTextStroke: "1px rgba(255,255,255,0.5)" }}
                  >
                    ×
                  </span>
                )}
                <div
                  className={cn(
                    "w-[7px] h-2.5 border border-[#374151] rounded-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]",
                    getSignalColorClass(1),
                  )}
                ></div>
                <div
                  className={cn(
                    "w-[7px] h-4 border border-[#374151] rounded-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]",
                    getSignalColorClass(2),
                  )}
                ></div>
                <div
                  className={cn(
                    "w-[7px] h-5.5 border border-[#374151] rounded-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]",
                    getSignalColorClass(3),
                  )}
                ></div>
                <div
                  className={cn(
                    "w-[7px] h-7 border border-[#374151] rounded-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]",
                    getSignalColorClass(4),
                  )}
                ></div>
              </div>
            </div>

            {/* LCD Bottom Channel and Active Users row */}
            <div
              className="flex items-end justify-between px-1 z-10"
              style={{
                filter: "drop-shadow(1px 1px 0px rgba(255,255,255,0.2))",
              }}
            >
              <div
                className="flex items-end gap-1.5 mt-2 cursor-pointer"
                onClick={() => setShowChannelInfo(true)}
              >
                <span className="font-bold text-[18px] mb-0.5 text-[#1a0c02] tracking-wide drop-shadow-[0_1px_0px_rgba(255,255,255,0.35)]">
                  CH
                </span>
                <div className="relative leading-none h-[2.5rem] w-[4.25rem]">
                  <span
                    className="text-[2.5rem] text-[#b43200]/15 absolute bottom-0 left-0 tracking-normal not-italic"
                    style={{
                      fontFamily: "'DSEG7-Classic-MINI', monospace",
                      fontStyle: "normal",
                      fontWeight: "bold",
                    }}
                  >
                    888
                  </span>
                  <span
                    className="text-[2.5rem] text-[#fffbeb] relative z-10 tracking-normal flex items-end h-full not-italic"
                    style={{
                      fontFamily: "'DSEG7-Classic-MINI', monospace",
                      fontStyle: "normal",
                      fontWeight: "bold",
                      textShadow:
                        "0 0 6px rgba(255, 140, 0, 0.95), 0 0 12px rgba(255, 69, 0, 0.8)",
                      filter: "drop-shadow(0 0 1px rgba(255, 255, 255, 0.45))",
                    }}
                  >
                    {currentChannel.padStart(3, "0")}
                  </span>
                </div>
              </div>

              {/* Active User List & Count Button */}
              <div className="flex flex-col items-end gap-0.5">
                <button
                  id="user-list-btn"
                  onClick={() => setUserListOpen(true)}
                  className="flex items-center gap-1.5 mb-1.5 hover:bg-black/10 px-1 py-0.5 rounded-lg cursor-pointer transition-colors shrink-0"
                >
                  <div
                    className={cn(
                      "relative w-[32px] h-[26px]",
                      blinkUsers ? "animate-pulse" : "",
                    )}
                  >
                    <div className="absolute right-0 top-0">
                      <User3D color1="#fef08a" color2="#ca8a04" size={20} />
                    </div>
                    <div className="absolute left-0 bottom-0">
                      <User3D color1="#38bdf8" color2="#0284c7" size={20} />
                    </div>
                  </div>
                  <span className="text-[1.75rem] font-medium font-sans text-black tracking-tight leading-none">
                    {usersArray.length.toString().padStart(2, "0")}
                  </span>
                </button>
              </div>
            </div>

            {/* Speaking Status Badges */}
            {isTransmitting && (
              <div className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 bg-[#ff8c00]/95 backdrop-blur-sm border border-black/40 px-3 py-1 shadow-lg pointer-events-none rounded-full z-20 transition-all duration-300 scale-90 origin-top">
                <Activity
                  className={cn(
                    "w-3 h-3 text-black",
                    isLocalSpeaking ? "animate-bounce" : "animate-pulse",
                  )}
                />
                <span className="text-[10px] font-bold text-black uppercase tracking-widest leading-none">
                  MODULASI
                </span>
              </div>
            )}

            {/* Offline Resilience Reconnecting Overlay Badge */}
            {!isConnected && (
              <div className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 bg-red-600/90 backdrop-blur-sm border border-black/40 px-3 py-1 shadow-lg pointer-events-none rounded-full z-20 animate-pulse scale-90 origin-top">
                <Radio className="w-3 h-3 text-white animate-spin-slow" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">
                  OFFLINE
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
