import { useEffect, useRef, useState } from "react";
import { Headphones, Mic2, RefreshCw, Volume2 } from "lucide-react";
import { cn } from "../../lib/utils";

export function AudioInputDevicePanel({
  selectedDeviceId,
  onSelect,
}: {
  selectedDeviceId: string;
  onSelect: (deviceId: string, label: string) => void;
}) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(
    "Klik refresh untuk membaca microphone/soundcard yang tersedia.",
  );
  const [meterLevel, setMeterLevel] = useState(0);
  const [meterStatus, setMeterStatus] = useState("Belum memantau input audio.");
  const meterCleanupRef = useRef<(() => void) | null>(null);

  const stopMeter = () => {
    meterCleanupRef.current?.();
    meterCleanupRef.current = null;
    setMeterLevel(0);
  };

  const refreshDevices = async () => {
    setIsLoading(true);
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        setMessage("Browser belum mendukung enumerateDevices.");
        return;
      }

      // Minta izin singkat agar label perangkat muncul. Track langsung dimatikan.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        // Jika user menolak, enumerate tetap dicoba walau label mungkin kosong.
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter(
        (device) => device.kind === "audioinput",
      );
      setDevices(audioInputs);
      setMessage(
        audioInputs.length
          ? "Pilih microphone, USB soundcard, atau output mini mixer."
          : "Tidak ada input audio terdeteksi.",
      );
    } catch (err) {
      console.warn("[AudioInputDevicePanel] gagal membaca perangkat:", err);
      setMessage("Gagal membaca perangkat input audio.");
    } finally {
      setIsLoading(false);
    }
  };

  const startMeter = async () => {
    stopMeter();
    if (!navigator.mediaDevices?.getUserMedia) {
      setMeterStatus("Browser belum mendukung akses microphone.");
      return;
    }

    try {
      setMeterStatus("Meminta izin dan memantau input...");
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId
          ? {
              deviceId: { exact: selectedDeviceId },
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            }
          : {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const AudioContextCtor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextCtor) throw new Error("AudioContext tidak tersedia");

      const ctx = new AudioContextCtor();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);
      let frame = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / data.length);
        const nextLevel = Math.min(100, Math.round(rms * 260));
        setMeterLevel(nextLevel);
        frame = window.requestAnimationFrame(tick);
      };
      tick();
      setMeterStatus(
        "Meter aktif. Bicara/putar output mixer untuk mengecek sinyal masuk.",
      );

      meterCleanupRef.current = () => {
        window.cancelAnimationFrame(frame);
        source.disconnect();
        stream.getTracks().forEach((track) => track.stop());
        ctx.close().catch(() => undefined);
        setMeterStatus("Meter dimatikan.");
      };
    } catch (err) {
      console.warn("[AudioInputDevicePanel] gagal memulai meter:", err);
      setMeterStatus(
        "Gagal memantau input. Pastikan izin microphone diberikan dan perangkat aktif.",
      );
      setMeterLevel(0);
    }
  };

  useEffect(() => {
    const handler = () => refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
      stopMeter();
    };
  }, []);

  useEffect(() => {
    stopMeter();
  }, [selectedDeviceId]);

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-2 text-gray-900">
          <Mic2 className="h-5 w-5 text-emerald-700" />
          <div className="font-semibold">Input Audio / Soundcard</div>
        </div>
        <p className="text-xs leading-relaxed text-gray-600">
          Pilih perangkat yang masuk ke NextVWT. Untuk karaoke, pilih USB
          soundcard/mini mixer yang sudah menggabungkan mic vokal dan musik.
        </p>

        <button
          type="button"
          onClick={refreshDevices}
          className="flex w-full items-center justify-center gap-2 rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800 active:scale-[0.99]"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh Perangkat Input
        </button>

        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 active:bg-gray-100">
            <input
              type="radio"
              name="audioInputDevice"
              checked={!selectedDeviceId}
              onChange={() => onSelect("", "Default microphone")}
              className="h-4 w-4 accent-emerald-600"
            />
            <Headphones className="h-4 w-4 text-gray-500" />
            Default microphone browser
          </label>

          {devices.map((device, index) => {
            const label = device.label || `Audio input ${index + 1}`;
            return (
              <label
                key={device.deviceId || `${device.kind}-${index}`}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 active:bg-gray-100"
              >
                <input
                  type="radio"
                  name="audioInputDevice"
                  checked={selectedDeviceId === device.deviceId}
                  onChange={() => onSelect(device.deviceId, label)}
                  className="h-4 w-4 accent-emerald-600"
                />
                <Mic2 className="h-4 w-4 text-emerald-700" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
              </label>
            );
          })}
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs font-bold text-emerald-900">
            <span className="flex items-center gap-1.5">
              <Volume2 className="h-4 w-4" /> Level input live
            </span>
            <span>{meterLevel}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white ring-1 ring-emerald-100">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-100",
                meterLevel > 75
                  ? "bg-red-500"
                  : meterLevel > 45
                    ? "bg-amber-500"
                    : "bg-emerald-500",
              )}
              style={{ width: `${meterLevel}%` }}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={startMeter}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white active:scale-[0.99]"
            >
              Test Input
            </button>
            <button
              type="button"
              onClick={stopMeter}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 active:scale-[0.99]"
            >
              Stop Meter
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-emerald-900/80">
            {meterStatus}
          </p>
        </div>

        <p className="text-[11px] leading-relaxed text-gray-500">{message}</p>
      </div>
    </div>
  );
}
