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

  // =========================================================================
  // 🔒 LOCKED VIP DESIGN - DO NOT MODIFY BY ANY AI AGENT
  // The Gold bezel (displayFrame), LCD inner shadows, font weights,
  // and ghost segments removal have been permanently approved by the user.
  // DO NOT change these hardcoded values under any circumstances.
  // =========================================================================
  let lcdBg = "bg-[#ff8c00]";
  let lcdShadow = "shadow-[0_2px_3px_rgba(255,255,255,0.75),inset_0_15px_30px_rgba(160,50,0,0.8),inset_0_0_20px_rgba(0,0,0,0.5)]";
  let lcdTextColor = "text-[#1a0c02]";
  let lcdTextShadow = "0 0 6px rgba(255, 140, 0, 0.95), 0 0 12px rgba(255, 69, 0, 0.8)";
  let lcdTextBgColor = "text-[#b43200]/15";
  let displayFrame = "bg-[linear-gradient(160deg,#fffbeb_0%,#fde047_15%,#ca8a04_30%,#451a03_48%,#eab308_65%,#fef08a_85%,#451a03_100%)] border-[#ca8a04] border-t-[#fffbeb] border-b-[#2e1002]";

  if (theme === "Taktis (Hijau)") {
    lcdBg = "bg-[#4ade80]";
    lcdShadow = "shadow-[inset_0_6px_22px_rgba(20,100,30,0.95),inset_0_0_12px_rgba(0,0,0,0.4)]";
    lcdTextColor = "text-[#052e16]";
    lcdTextShadow = "0 0 6px rgba(34, 197, 94, 0.95), 0 0 12px rgba(21, 128, 61, 0.8)";
    lcdTextBgColor = "text-[#15803d]/15";
  } else if (theme === "Siber (Biru)") {
    lcdBg = "bg-[#38bdf8]";
    lcdShadow = "shadow-[inset_0_6px_22px_rgba(10,80,150,0.95),inset_0_0_12px_rgba(0,0,0,0.4)]";
    lcdTextColor = "text-[#082f49]";
    lcdTextShadow = "0 0 6px rgba(56, 189, 248, 0.95), 0 0 12px rgba(2, 132, 199, 0.8)";
    lcdTextBgColor = "text-[#0284c7]/15";
  } else if (theme === "Monokrom (Putih)") {
    lcdBg = "bg-[#f8fafc]";
    lcdShadow = "shadow-[inset_0_6px_22px_rgba(150,150,160,0.95),inset_0_0_12px_rgba(0,0,0,0.4)]";
    lcdTextColor = "text-[#0f172a]";
    lcdTextShadow = "0 0 6px rgba(148, 163, 184, 0.95), 0 0 12px rgba(100, 116, 139, 0.8)";
    lcdTextBgColor = "text-[#64748b]/15";
  } else if (theme === "Motif Serat Karbon") {
    lcdBg = "bg-[#f59e0b]";
    lcdShadow = "shadow-[inset_0_6px_22px_rgba(180,100,0,0.95),inset_0_0_12px_rgba(0,0,0,0.4)]";
    lcdTextColor = "text-[#3f1d0b]";
    lcdTextShadow = "0 0 6px rgba(245, 158, 11, 0.95), 0 0 12px rgba(217, 119, 6, 0.8)";
    lcdTextBgColor = "text-[#d97706]/15";
    displayFrame = "bg-[linear-gradient(160deg,#333333_0%,#222222_25%,#111111_50%,#222222_75%,#333333_100%)] border-[#444444] border-t-[#555555] border-b-[#222222] shadow-[0_12px_32px_rgba(0,0,0,0.8)]";
  } else if (theme === "Motif Teraso Terang") {
    lcdBg = "bg-[#ccfbf1]";
    lcdShadow = "shadow-[inset_0_6px_22px_rgba(20,120,120,0.4),inset_0_0_12px_rgba(0,0,0,0.15)]";
    lcdTextColor = "text-[#0f766e]";
    lcdTextShadow = "0 0 6px rgba(45, 212, 191, 0.95), 0 0 12px rgba(13, 148, 136, 0.8)";
    lcdTextBgColor = "text-[#0d9488]/15";
    displayFrame = "bg-[linear-gradient(160deg,#ffffff_0%,#f1f5f9_50%,#e2e8f0_100%)] border-[#cbd5e1] border-t-[#ffffff] border-b-[#94a3b8] shadow-[0_12px_32px_rgba(0,0,0,0.15)]";
  } else if (theme === "Motif Galaxy Cosmic") {
    lcdBg = "bg-[#06b6d4]";
    lcdShadow = "shadow-[inset_0_6px_22px_rgba(0,100,150,0.95),inset_0_0_12px_rgba(0,0,0,0.4)]";
    lcdTextColor = "text-[#083344]";
    lcdTextShadow = "0 0 6px rgba(6, 182, 212, 0.95), 0 0 12px rgba(8, 145, 178, 0.8)";
    lcdTextBgColor = "text-[#0891b2]/15";
    displayFrame = "bg-[linear-gradient(160deg,#2e1065_0%,#090514_50%,#020617_100%)] border-[#6366f1] border-t-[#818cf8] border-b-[#4f46e5] shadow-[0_12px_32px_rgba(99,102,241,0.25)]";
  }
  const speakingUsers = usersArray.filter((u) => u.isSpeaking);
  const activeSpeakerName = isLocalSpeaking
    ? currentUser?.name || fallbackUsername
    : speakingUsers.length > 0
      ? speakingUsers[0].name
      : null;

  return (
    <div className={cn("w-full p-3 rounded-[2rem] shadow-[0_25px_50px_-5px_rgba(0,0,0,0.35),0_10px_20px_-3px_rgba(0,0,0,0.25),inset_0_10px_20px_rgba(255,255,255,0.8),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-8px_20px_rgba(69,26,3,0.6)] border-[2px] mb-5 shrink-0 select-none relative overflow-hidden", displayFrame)}>
      {/* Ultra Glossy specular highlight reflection for the metal frame */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/20 to-transparent pointer-events-none mix-blend-overlay z-0"></div>
      
      {/* Diagonal realistic shine slash */}
      <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[150%] bg-gradient-to-tr from-transparent via-white/40 to-transparent -rotate-[35deg] pointer-events-none mix-blend-overlay z-0"></div>

      <div className={cn("h-[120px] rounded-[1.2rem] p-3 border-[3px] border-[#161616] flex flex-col justify-between relative overflow-hidden shrink-0 z-10", lcdBg, lcdShadow)}>
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

        <div className="absolute top-0 left-0 right-0 h-[55%] bg-gradient-to-b from-white/25 to-transparent pointer-events-none z-10 mix-blend-overlay"></div>

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
                <User3D color1="#38bdf8" color2="#0284c7" size={30} />
                <span className={cn("font-sans text-[18px] font-medium tracking-tight truncate max-w-[150px] drop-shadow-[0_1px_0px_rgba(255,255,255,0.35)]", lcdTextColor)}>
                  {currentUser?.name || fallbackUsername}
                </span>
              </div>

              {/* Signal Strength & Latency Meter */}
              <div
                data-testid="signal-indicator"
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
            >
              <div
                className="flex items-end gap-1.5 mt-2 cursor-pointer"
                onClick={() => setShowChannelInfo(true)}
              >
                <span className={cn("font-bold text-[22px] translate-y-[1px] tracking-wide drop-shadow-[0_1px_0px_rgba(255,255,255,0.35)]", lcdTextColor)}>
                  CH
                </span>
                <div className="relative leading-none h-[2.5rem] w-[4.25rem]">
                  <span
                    className="text-[2.5rem] text-[#fffbeb] relative z-10 tracking-normal flex items-end h-full not-italic"
                    style={{
                      fontFamily: "'DSEG7-Classic-MINI', monospace",
                      fontStyle: "normal",
                      fontWeight: "bold",
                      textShadow: lcdTextShadow,
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
                  className="flex items-end gap-1.5 pb-0.5 hover:bg-black/10 px-1 rounded-lg cursor-pointer transition-colors shrink-0"
                >
                  <div
                    className={cn(
                      "relative w-[38px] h-[32px]",
                      blinkUsers ? "animate-pulse" : "",
                    )}
                  >
                    <div className="absolute right-0 top-0">
                      <User3D color1="#fef08a" color2="#ca8a04" size={24} />
                    </div>
                    <div className="absolute left-0 bottom-0">
                      <User3D color1="#38bdf8" color2="#0284c7" size={24} />
                    </div>
                  </div>
                  <span className="text-[22px] font-medium font-sans text-black tracking-tight leading-none mb-[2px]">
                    {usersArray.length.toString().padStart(2, "0")}
                  </span>
                </button>
              </div>
            </div>

            {/* Speaking Status Badges */}
            {(isTransmitting || speakingUsers.length > 0) && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 bg-black/85 backdrop-blur-sm px-3 py-1.5 shadow-[0_4px_10px_rgba(0,0,0,0.5)] pointer-events-none rounded-full z-20 transition-all duration-300">
                <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-[#222]">
                  <User3D color1="#38bdf8" color2="#0284c7" size={18} />
                </div>
                <span className="text-[12px] font-bold text-white tracking-wide leading-none truncate max-w-[120px]">
                  {activeSpeakerName}
                </span>
                <Activity className="w-3.5 h-3.5 text-green-400 animate-pulse" />
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
