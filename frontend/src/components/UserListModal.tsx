import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Radio, User as UserIcon } from "lucide-react";
import { type RealtimeUser } from "../store/useRealtimeStore";
import { cn } from "../lib/utils";

export function UserListModal({
  users,
  onClose,
  currentUserId,
  isTransmitting,
}: {
  users: RealtimeUser[];
  onClose: () => void;
  currentUserId: string;
  isTransmitting: boolean;
}) {
  const channelUsers = users.map((user) =>
    user.id === currentUserId && isTransmitting
      ? { ...user, isSpeaking: true }
      : user,
  );

  const modulatingUsers = channelUsers.filter((user) => user.isSpeaking);

  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600); // Premium skeleton loading effect
    return () => clearTimeout(t);
  }, []);

  const renderUserCard = (
    user: RealtimeUser,
    mode: "modulating" | "joined",
  ) => (
    <div
      key={`${mode}-${user.id}`}
      onClick={(e) => e.stopPropagation()}
      data-testid={
        mode === "modulating" ? "modulating-user-card" : "joined-user-card"
      }
      className={cn(
        "flex items-center gap-3.5 p-3 rounded-2xl border transition-all duration-150 cursor-default shadow-[0_4px_10px_rgba(0,0,0,0.1),inset_0_2px_0_rgba(255,255,255,0.8),inset_0_-3px_0_rgba(0,0,0,0.06)] transform hover:scale-[1.01] active:scale-[0.98]",
        user.isSpeaking
          ? "bg-gradient-to-b from-green-50 to-green-100/50 border-green-300 shadow-[0_6px_12px_rgba(34,197,94,0.15),inset_0_2px_0_rgba(255,255,255,0.8),inset_0_-3px_0_rgba(20,100,30,0.1)]"
          : "bg-gradient-to-b from-white to-[#f1f5f9] border-slate-200/85",
      )}
    >
      <div
        className={cn(
          "w-11 h-11 shrink-0 bg-gradient-to-b from-[#e2e8f0] to-[#f1f5f9] rounded-xl flex items-center justify-center relative overflow-hidden border shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.08)] transition-all",
          user.isSpeaking ? "border-green-400" : "border-slate-200",
        )}
      >
        {user.avatarDataUrl ? (
          <img
            src={user.avatarDataUrl}
            alt={`Foto ${user.name}`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <UserIcon
            className={cn(
              "w-5.5 h-5.5 transition-colors",
              user.isSpeaking ? "text-green-600" : "text-slate-500",
            )}
          />
        )}
        {user.isSpeaking && (
          <div className="absolute inset-0 bg-green-500/5 animate-pulse pointer-events-none" />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="font-bold text-slate-800 text-[15.5px] leading-tight truncate">
          {user.name} {user.id === currentUserId && " (You)"}
        </div>
        <div className="text-[12px] text-slate-400 truncate mt-1 flex items-center gap-1.5">
          <span className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-600 shadow-sm leading-none flex items-center justify-center">
            {user.id.substring(0, 5).toUpperCase()}
          </span>
          <span className="text-slate-500 truncate">
            {user.locationState || "Unknown Region"}
          </span>
        </div>
      </div>

      {user.isSpeaking ? (
        <div className="flex items-center gap-1 rounded-full border border-green-200 bg-green-100 px-2 py-1 text-[10px] font-black text-green-700">
          <Radio className="h-3 w-3" /> TX
        </div>
      ) : (
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="flex-1 w-full z-50 bg-gradient-to-b from-[#ffffff] to-[#f8fafc] shadow-[inset_0_2px_8px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden select-none min-h-0"
    >
      <button
        id="close-user-list-btn"
        onClick={onClose}
        className="absolute top-0 right-0 w-1 h-1 opacity-0 pointer-events-auto cursor-default"
        aria-hidden="true"
      />

      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0 shadow-sm">
        <h3 className="font-bold text-slate-700 text-[15px]">Daftar Pengguna ({channelUsers.length})</h3>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 font-bold hover:bg-slate-300 transition-colors shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_1px_2px_rgba(0,0,0,0.1)]">
          ✕
        </button>
      </div>

      <div 
        className="flex-1 overflow-y-auto bg-transparent [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-3.5 space-y-3"
      >
        {isLoading ? (
          <section className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-200/85 bg-slate-50/50 animate-pulse shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-200 shrink-0"></div>
                <div className="flex-1 space-y-2.5 py-1">
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                </div>
                <div className="w-3 h-3 rounded-full bg-slate-200 shrink-0 mr-2"></div>
              </div>
            ))}
          </section>
        ) : (
          <>
            {modulatingUsers.length > 0 && (
              <section data-testid="modulating-users" className="space-y-2">
                {modulatingUsers.map((user) =>
                  renderUserCard(user, "modulating"),
                )}
              </section>
            )}

            <section data-testid="joined-users" className="space-y-2">
              {channelUsers.map((user) => renderUserCard(user, "joined"))}
            </section>
          </>
        )}
      </div>
    </motion.div>
  );
}
