import { useEffect, useState, useRef } from "react";

/**
 * useVoiceActivity — Hook VAD berbasis AudioWorklet.
 *
 * Mendeteksi apakah user sedang berbicara berdasarkan input mikrofon aktif.
 * Dipakai untuk menampilkan visual indicator saat transmit.
 *
 * @param audioContext - AudioContext yang aktif (dari SafeAudioEngine)
 * @param stream - MediaStream dari mikrofon yang aktif
 * @returns boolean isSpeaking
 */
export function useVoiceActivity(
  audioContext: AudioContext | null,
  stream: MediaStream | null,
): boolean {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);

  useEffect(() => {
    if (!audioContext || !stream) {
      setIsSpeaking(false);
      return;
    }

    let mounted = true;

    async function setup() {
      try {
        await audioContext!.audioWorklet.addModule(
          "/worklets/VoiceProcessor.worklet.js",
        );

        if (!mounted) return;

        sourceRef.current = audioContext!.createMediaStreamSource(stream!);
        workletRef.current = new AudioWorkletNode(
          audioContext!,
          "voice-processor",
        );

        workletRef.current.port.onmessage = (event) => {
          if (!mounted) return;
          if (event.data?.type === "voice-activity") {
            setIsSpeaking(event.data.speaking);
          }
        };

        sourceRef.current.connect(workletRef.current);
        // Tidak connect ke destination — kita tidak mau output suara sendiri terdengar
      } catch (err) {
        console.warn(
          "[useVoiceActivity] AudioWorklet tidak tersedia, fallback disabled:",
          err,
        );
      }
    }

    setup();

    return () => {
      mounted = false;
      setIsSpeaking(false);

      try {
        sourceRef.current?.disconnect();
        workletRef.current?.disconnect();
        workletRef.current?.port.close();
      } catch {
        // ignore cleanup errors
      }

      sourceRef.current = null;
      workletRef.current = null;
    };
  }, [audioContext, stream]);

  return isSpeaking;
}
