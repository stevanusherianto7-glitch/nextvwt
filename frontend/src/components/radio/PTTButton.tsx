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
  // =========================================================================
  // 🔒 LOCKED VIP DESIGN - DO NOT MODIFY BY ANY AI AGENT
  // The specific margins (mb-8), absolute positioning, border thicknesses,
  // and box-shadow coordinates have been explicitly calibrated to prevent CLS
  // (Layout Shifts) and to provide an ultra-realistic tactile depression effect.
  // DO NOT change any styling logic in this component without explicit permission.
  // =========================================================================
  const pttState = isTransmitting
    ? "modulating"
    : someOneElseSpeaking
      ? "busy"
      : "idle";

  return (
    <div className="relative flex w-full justify-center mt-2 mb-12 shrink-0 select-none overflow-visible">
      {/* 
        =========================================================================
        🔒 LOCKED VIP GLOSSY PILL DESIGN - DO NOT MODIFY BY ANY AI AGENT
        - The perfectly concentric Glass Reflection (`h-[40px] rounded-t-[40px] left-[2px] right-[2px]`)
        - The `mix-blend-overlay` gradient for the glowing neon look
        - The glossy neon rim `border-[#00ff66]` & pill shape
        HAVE ALL BEEN APPROVED AND MATHEMATICALLY PERFECTED. 
        DO NOT TOUCH, MODIFY, OR TAMPER WITH THIS PTT BUTTON DESIGN.
        =========================================================================
      */}
      <motion.button
        id="ptt-button"
        whileHover={{ filter: "brightness(1.05)" }}
        whileTap={{ scale: 0.97 }}
        animate={{
          y: isTransmitting ? 4 : 0,
          scale: isTransmitting ? 0.98 : 1,
        }}
        transition={{ type: "spring", stiffness: 350, damping: 20 }}
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
          "w-[85%] h-[84px] flex items-center justify-center font-bold text-[38px] tracking-[0.1em] rounded-full select-none touch-none relative z-10 overflow-hidden cursor-pointer transition-all duration-150 border-[3px]",
          isTransmitting
            ? "bg-gradient-to-b from-[#ef4444] to-[#b91c1c] text-white shadow-[0_6px_16px_rgba(220,38,38,0.4),0_2px_4px_rgba(0,0,0,0.2),inset_0_-10px_20px_rgba(60,0,0,0.6)] border-[#ff7777]"
            : "bg-gradient-to-b from-[#1ada5f] to-[#0d993d] text-white shadow-[0_15px_30px_rgba(0,0,0,0.25),0_6px_12px_rgba(0,0,0,0.15),inset_0_-12px_24px_rgba(0,60,20,0.45)] border-[#00ff66]",
        )}
      >
        {/* Perfect Concentric Glass Reflection (No seam/gap) */}
        <div className={cn(
          "absolute top-[2px] left-[2px] right-[2px] h-[40px] bg-gradient-to-b from-white/90 from-[5%] via-transparent via-[50%] to-transparent rounded-t-[40px] pointer-events-none z-10 transition-opacity duration-200 mix-blend-overlay",
          isTransmitting ? "opacity-40" : "opacity-100"
        )}></div>

        <span className="text-white relative z-20 drop-shadow-md">
          PTT
        </span>
      </motion.button>
    </div>
  );
}
