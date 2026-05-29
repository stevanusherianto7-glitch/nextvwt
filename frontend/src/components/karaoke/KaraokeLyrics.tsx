import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const DUMMY_LYRICS = [
  { time: 2, text: "Berbagi modulasi di udara..." },
  { time: 6, text: "Satu nusa, satu bangsa, satu bahasa" },
  { time: 10, text: "Menyambung tali silaturahmi" },
  { time: 14, text: "Tanpa batas ruang dan waktu" },
  { time: 18, text: "(Jeda Musik)" },
  { time: 22, text: "NKRI harga mati!" },
  { time: 26, text: "Pawon Salam dan Kedai Elvera 57" },
  { time: 30, text: "Selalu di hati kita semua..." },
];

export function KaraokeLyrics({ isActive }: { isActive: boolean }) {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setCurrentTime(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime((prev) => (prev >= 35 ? 0 : prev + 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  const activeIndex = DUMMY_LYRICS.findIndex(
    (line, idx) =>
      currentTime >= line.time &&
      (idx === DUMMY_LYRICS.length - 1 ||
        currentTime < DUMMY_LYRICS[idx + 1].time),
  );

  return (
    <div className="w-full bg-black/60 rounded-lg p-3 mt-3 shadow-inner relative overflow-hidden backdrop-blur-sm border border-emerald-500/30">
      <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-black/80 to-transparent z-10" />
      <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/80 to-transparent z-10" />

      <div className="flex flex-col items-center justify-center space-y-2 h-[80px]">
        {DUMMY_LYRICS.map((line, idx) => {
          const isPast = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isFuture = idx > activeIndex;

          if (idx < activeIndex - 1 || idx > activeIndex + 1) return null;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: isCurrent ? 1 : 0.4,
                y: isCurrent ? 0 : isPast ? -10 : 10,
                scale: isCurrent ? 1.05 : 0.95,
              }}
              transition={{ duration: 0.4 }}
              className={cn(
                "text-center font-bold tracking-wide transition-colors duration-300",
                isCurrent
                  ? "text-emerald-400 text-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : "text-gray-400 text-sm",
              )}
            >
              {line.text}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
