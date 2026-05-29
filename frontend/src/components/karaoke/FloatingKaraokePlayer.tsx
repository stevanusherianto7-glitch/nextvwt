import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  GripVertical,
  Maximize2,
  Minimize2,
  Music2,
  X,
  Youtube,
} from "lucide-react";
import { KaraokeLyrics } from "./KaraokeLyrics";

const extractYouTubeVideoId = (rawUrl: string): string | null => {
  const value = rawUrl.trim();
  if (!value) return null;

  // Terima video id langsung untuk memudahkan input cepat.
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (url.hostname.includes("youtube.com")) {
      if (
        url.pathname.startsWith("/shorts/") ||
        url.pathname.startsWith("/embed/")
      ) {
        return url.pathname.split("/").filter(Boolean)[1] || null;
      }
      return url.searchParams.get("v");
    }
  } catch {
    return null;
  }

  return null;
};

export function FloatingKaraokePlayer({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPinnedCompact, setIsPinnedCompact] = useState(false);

  const videoId = useMemo(() => extractYouTubeVideoId(url), [url]);
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1`
    : "";

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.96 }}
      data-testid="karaoke-floating-player"
      className="absolute right-3 top-20 z-[60] w-[calc(100%-1.5rem)] max-w-[390px] rounded-2xl border border-cyan-300/40 bg-slate-950/95 text-white shadow-2xl shadow-cyan-950/40 overflow-hidden backdrop-blur"
      style={{ width: isPinnedCompact ? 280 : undefined }}
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-gradient-to-r from-slate-900 to-cyan-950 px-3 py-2">
        <GripVertical className="h-5 w-5 cursor-move text-cyan-200/80" />
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-950/40">
          <Youtube className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold tracking-wide">
            Karaoke Floating Player
          </div>
          <div className="truncate text-[10px] text-cyan-100/70">
            Embed resmi YouTube • tanpa download • tanpa ekstraksi audio
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized((v) => !v)}
          className="rounded-lg p-2 text-cyan-100 hover:bg-white/10 active:scale-95"
          aria-label={isMinimized ? "Buka player" : "Minimize player"}
        >
          {isMinimized ? (
            <Maximize2 className="h-4 w-4" />
          ) : (
            <Minimize2 className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-red-100 hover:bg-red-500/20 active:scale-95"
          aria-label="Tutup player"
          data-testid="karaoke-close-button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!isMinimized && (
        <div className="space-y-3 p-3">
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              data-testid="karaoke-url-input"
              placeholder="Paste link YouTube karaoke atau video ID"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setIsPinnedCompact((v) => !v)}
              className="rounded-xl border border-white/10 bg-white/10 px-3 text-xs font-bold text-cyan-100 hover:bg-white/15"
              title="Ubah ukuran floating player"
            >
              {isPinnedCompact ? "WIDE" : "MINI"}
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
            {embedUrl ? (
              <iframe
                data-testid="karaoke-youtube-iframe"
                title="YouTube Karaoke Player"
                src={embedUrl}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-3 p-4 text-center text-slate-300">
                <Music2 className="h-10 w-10 text-cyan-300" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    Masukkan link video karaoke YouTube
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Audio musik tidak diambil oleh aplikasi. Untuk siaran musik,
                    arahkan output YouTube ke mixer/soundcard eksternal.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Karaoke Lyrics Visualizer */}
          {embedUrl && <KaraokeLyrics isActive={!isMinimized} />}

          <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-[11px] leading-relaxed text-amber-50">
            <b>Workflow karaoke:</b> YouTube diputar di player ini, mic vokal +
            musik digabung lewat mini mixer/soundcard, lalu pilih perangkat
            mixer sebagai input audio NextVWT.
          </div>
        </div>
      )}
    </motion.div>
  );
}
