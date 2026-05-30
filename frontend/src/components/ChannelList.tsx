import { motion } from "framer-motion";
import { Users, X } from "lucide-react";
import { cn } from "../lib/utils";

interface Channel {
  id: string;
  name: string;
  description: string;
}

const ALL_CHANNELS: Channel[] = [
  { id: "000", name: "DUKUNGAN & BANTUAN", description: "WWW.NEXTVWT.ID" },
  ...Array.from({ length: 200 }, (_, i) => {
    const id = (i + 1).toString().padStart(3, "0");
    if (id === "007")
      return {
        id,
        name: "SATU ASPAL",
        description: "HAPPY ANNIVERSARY 1Thn CHANNEL 0...",
      };
    if (id === "018")
      return {
        id,
        name: "THE WINNER",
        description: "DONAT BIKIN NGAKAK AWET MUDA...",
      };
    if (id === "090")
      return {
        id,
        name: "FAMILY NUSANTARA",
        description: "SILATURAHIM DOMPET PEDULI GUNA...",
      };
    if (id === "100")
      return {
        id,
        name: "LANDING - ECHO CHANNEL",
        description: "BHINNEKA TUNGGAL IKA",
      };
    return {
      id,
      name: `CHANNEL ${id}`,
      description: "Available. Hubungi Sys Admin untuk klaim kepengurusan.",
    };
  }),
];

export function ChannelList({
  onSelect,
  onClose,
  currentChannelId,
}: {
  onSelect: (id: string) => void;
  onClose: () => void;
  currentChannelId: string;
}) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-slate-900 border-t border-slate-700/50 flex flex-col pt-12 md:pt-4"
    >
      <div className="flex items-center gap-3 px-4 pb-4 border-b border-slate-800">
        <button
          onClick={onClose}
          className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-base md:text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent whitespace-nowrap">
          NEXT VIRTUAL WALKIE TALKIE
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {ALL_CHANNELS.map((channel) => (
          <button
            key={channel.id}
            onClick={() => {
              onSelect(channel.id);
              onClose();
            }}
            className={cn(
              "w-full text-left flex items-stretch border-b border-slate-800 transition-colors hover:bg-orange-500/20",
              currentChannelId === channel.id ? "bg-slate-800" : "",
            )}
          >
            {/* Channel Number Box */}
            <div
              className={cn(
                "w-20 shrink-0 flex items-center justify-center text-xl font-bold font-mono text-white",
                channel.id === "000"
                  ? "bg-slate-800"
                  : channel.id === "100"
                    ? "bg-slate-700"
                    : parseInt(channel.id) < 50
                      ? "bg-blue-600"
                      : parseInt(channel.id) < 100
                        ? "bg-blue-500"
                        : "bg-cyan-600",
              )}
            >
              {channel.id}
            </div>

            {/* Channel Info */}
            <div className="px-4 py-3 flex-1 flex flex-col justify-center">
              <div className="font-bold text-slate-100 uppercase tracking-wide">
                {channel.name}
              </div>
              <div className="text-xs text-slate-400 mt-1 line-clamp-1">
                {channel.description}
              </div>
            </div>

            {/* Active Indicator */}
            {currentChannelId === channel.id && (
              <div className="px-4 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />
              </div>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
