/**
 * VoiceProcessor AudioWorklet — Voice Activity Detection (VAD).
 *
 * Berjalan di audio rendering thread (bukan main thread) untuk:
 * - Zero blocking terhadap UI
 * - Sub-millisecond latency detection
 * - Hemat CPU vs polling di main thread
 *
 * Ditempatkan di /public/worklets/ agar bisa di-load via URL statis.
 */
class VoiceProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // RMS threshold — sesuaikan jika terlalu sensitif/tidak sensitif
    this._threshold = 0.015;
    this._consecutiveSpeakingFrames = 0;
    this._consecutiveSilentFrames = 0;
    this._isSpeaking = false;
    // Hysteresis: butuh 3 frame berbicara untuk ON, 8 frame silent untuk OFF
    this._speakingThreshold = 3;
    this._silentThreshold = 8;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const samples = input[0];

    // Hitung RMS (Root Mean Square) — lebih akurat daripada peak detection
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      sumSquares += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSquares / samples.length);
    const loud = rms > this._threshold;

    if (loud) {
      this._consecutiveSpeakingFrames++;
      this._consecutiveSilentFrames = 0;
    } else {
      this._consecutiveSilentFrames++;
      this._consecutiveSpeakingFrames = 0;
    }

    const wasSpaking = this._isSpeaking;

    if (!this._isSpeaking && this._consecutiveSpeakingFrames >= this._speakingThreshold) {
      this._isSpeaking = true;
    } else if (this._isSpeaking && this._consecutiveSilentFrames >= this._silentThreshold) {
      this._isSpeaking = false;
    }

    // Hanya emit jika state berubah (hemat bandwidth port messaging)
    if (this._isSpeaking !== wasSpaking) {
      this.port.postMessage({ type: 'voice-activity', speaking: this._isSpeaking });
    }

    return true;
  }
}

registerProcessor('voice-processor', VoiceProcessor);
