import type { PointerEvent } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

interface PTTButtonProps {
  isTransmitting: boolean;
  someOneElseSpeaking: boolean;
  onClick: (e: PointerEvent | React.MouseEvent) => void;
}

export function PTTButton({
  isTransmitting,
  someOneElseSpeaking,
  onClick,
}: PTTButtonProps) {
  const pttState = isTransmitting
    ? "modulating"
    : someOneElseSpeaking
      ? "busy"
      : "idle";

  return (
    <div className="relative flex w-full justify-center mt-2 mb-2 shrink-0 select-none">
      {/* Matte black physical socket groove */}
      <div className="absolute w-[80%] h-[75%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-[#111] to-[#333] rounded-[2.8rem] shadow-[inset_0_10px_20px_rgba(0,0,0,0.9)] z-[0] pointer-events-none"></div>

      <motion.button
        id="ptt-button"
        whileHover={{ scale: 1.02, filter: "brightness(1.05)" }}
        whileTap={{ scale: 0.96, y: 4 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        data-state={pttState}
        data-channel-busy={someOneElseSpeaking}
        aria-label={
          someOneElseSpeaking
            ? "Channel sedang dipakai, tunggu giliran"
            : "Tekan untuk bicara"
        }
        aria-pressed={isTransmitting}
        onClick={onClick as any}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "w-[85%] font-bold text-4xl tracking-widest py-6 rounded-[3rem] select-none touch-none relative z-10 overflow-hidden cursor-pointer",
          isTransmitting
            ? "bg-gradient-to-b from-[#ef4444] to-[#991b1b] text-white shadow-[0_4px_8px_rgba(0,0,0,0.4),inset_0_4px_8px_rgba(255,255,255,0.45),inset_0_-8px_16px_rgba(0,0,0,0.3)] border border-[#ef4444]"
            : "bg-gradient-to-b from-[#22c55e] to-[#15803d] text-white shadow-[0_15px_30px_rgba(0,0,0,0.4),0_5px_10px_rgba(0,0,0,0.3),inset_0_4px_10px_rgba(255,255,255,0.55),inset_0_-10px_20px_rgba(0,0,0,0.3)] border-t-[2px] border-white/50 border-b-[4px] border-b-black/60 border-x border-white/20",
        )}
      >
        <div className="absolute inset-x-3 top-2 h-[45%] bg-gradient-to-b from-white/40 via-white/5 to-transparent rounded-t-[2.5rem] pointer-events-none z-10"></div>

        <span className="font-black text-white tracking-widest relative z-20">
          PTT
        </span>

        <div className="absolute inset-0 rounded-[3rem] border-[1.5px] border-white/10 pointer-events-none z-20 mix-blend-overlay"></div>
      </motion.button>
    </div>
  );
}
