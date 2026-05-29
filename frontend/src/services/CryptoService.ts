// In a real production app, this key should be dynamically exchanged or derived securely.
// For this walkie-talkie app, we use a static pre-shared key (PSK) as a foundational layer.
const ENCRYPTION_KEY_RAW = import.meta.env.VITE_ENCRYPTION_KEY;

export class CryptoService {
  private static keyCache: CryptoKey | null = null;

  private static async getKey(): Promise<CryptoKey> {
    if (this.keyCache) return this.keyCache;

    if (!ENCRYPTION_KEY_RAW) {
      throw new Error(
        "[CryptoService] VITE_ENCRYPTION_KEY is missing from environment variables!",
      );
    }

    const encoder = new TextEncoder();
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      "raw",
      encoder.encode(ENCRYPTION_KEY_RAW),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"],
    );

    this.keyCache = await globalThis.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("nextvwt-salt-2026"),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );

    return this.keyCache;
  }

  private static arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = "";
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  /**
   * Mengenkripsi payload (string atau object) menggunakan AES-256-GCM.
   * @param payload Data yang akan dienkripsi
   * @returns Ciphertext string
   */
  static async encrypt(payload: unknown): Promise<string> {
    try {
      const dataString =
        typeof payload === "string" ? payload : JSON.stringify(payload);
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(dataString);

      const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
      const key = await this.getKey();

      const ciphertext = await globalThis.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encodedData,
      );

      // Gabungkan IV dan Ciphertext
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(ciphertext), iv.length);

      return this.arrayBufferToBase64(combined);
    } catch (error) {
      console.error("[CryptoService] Error encrypting payload:", error);
      throw new Error("Encryption failed");
    }
  }

  /**
   * Mendekripsi ciphertext kembali menjadi format aslinya menggunakan AES-256-GCM.
   * @param ciphertextStr String yang terenkripsi
   * @returns Objek atau string asli
   */
  static async decrypt<T = unknown>(ciphertextStr: string): Promise<T | null> {
    try {
      const binaryStr = atob(ciphertextStr);
      const combined = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        combined[i] = binaryStr.charCodeAt(i);
      }

      const iv = combined.slice(0, 12);
      const data = combined.slice(12);
      const key = await this.getKey();

      const decrypted = await globalThis.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        data,
      );

      const decoder = new TextDecoder();
      const decryptedString = decoder.decode(decrypted);

      if (!decryptedString) return null;

      try {
        return JSON.parse(decryptedString) as T;
      } catch {
        return decryptedString as unknown as T;
      }
    } catch (error) {
      console.error("[CryptoService] Error decrypting payload:", error);
      return null;
    }
  }
}
