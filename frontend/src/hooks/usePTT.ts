import { useCallback, useRef, type MouseEvent, type PointerEvent } from "react";
import { type SafeAudioEngine } from "../audio/SafeAudioEngine";
import { PTTController } from "../ptt/PTTController";

interface UsePTTOptions {
  engine: SafeAudioEngine | null;
  disabled?: boolean;
  onTransmitStart?: () => void;
  onTransmitStop?: () => void;
  onBlocked?: () => void; // Dipanggil saat PTT diblok (ada orang lain sedang bicara)
}

interface PTTHandlers {
  handlePointerDown: (e: PointerEvent) => void;
  handlePointerUp: (e: PointerEvent) => void;
  handlePointerLeave: (e: PointerEvent) => void;
  handlePointerCancel: (e: PointerEvent) => void;
  handleContextMenu: (e: MouseEvent) => void;
}

/**
 * usePTT — Mobile-safe PTT hook.
 *
 * Masalah yang diselesaikan:
 * - Touch cancel tidak stop transmit
 * - Double tap start dua rekaman
 * - Context menu muncul di mobile saat long press PTT
 * - Async startRecording belum selesai saat stop dipanggil
 */
export function usePTT(options: UsePTTOptions): PTTHandlers {
  const {
    engine,
    disabled = false,
    onTransmitStart,
    onTransmitStop,
    onBlocked,
  } = options;
  const controllerRef = useRef(new PTTController());

  const startTransmit = useCallback(async () => {
    if (!engine || disabled) return;

    await controllerRef.current.press(async () => {
      await engine.startRecording();
      onTransmitStart?.();
    });
  }, [engine, disabled, onTransmitStart]);

  const stopTransmit = useCallback(async () => {
    if (!engine) return;

    await controllerRef.current.release(() => {
      engine.stopRecording();
      onTransmitStop?.();
    });
  }, [engine, onTransmitStop]);

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.cancelable) e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      if (disabled) {
        onBlocked?.();
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        return;
      }

      if (navigator.vibrate) navigator.vibrate(40);
      startTransmit();
    },
    [disabled, startTransmit, onBlocked],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (e.cancelable) e.preventDefault();
      if (navigator.vibrate) navigator.vibrate(30);
      stopTransmit();
    },
    [stopTransmit],
  );

  const handlePointerLeave = useCallback(
    (e: PointerEvent) => {
      if (e.cancelable) e.preventDefault();
      stopTransmit();
    },
    [stopTransmit],
  );

  const handlePointerCancel = useCallback(
    (e: PointerEvent) => {
      if (e.cancelable) e.preventDefault();
      stopTransmit();
    },
    [stopTransmit],
  );

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault(); // Blok context menu saat long press di mobile
  }, []);

  return {
    handlePointerDown,
    handlePointerUp,
    handlePointerLeave,
    handlePointerCancel,
    handleContextMenu,
  };
}
