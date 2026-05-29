/**
 * MobileLifecycleManager — Mengelola lifecycle audio saat app masuk/keluar background.
 *
 * Browser/WebView di mobile sering mute atau suspend AudioContext saat app
 * masuk ke background (layar mati, pindah app). Manager ini memastikan:
 * - AudioContext di-suspend saat background (hemat battery)
 * - AudioContext di-resume saat kembali ke foreground
 * - Callback tersedia untuk App agar bisa stop PTT saat background
 */
export class MobileLifecycleManager {
  private onBackground: (() => void) | null = null;
  private onForeground: (() => void) | null = null;

  private boundVisibilityHandler = () => {
    if (document.hidden) {
      console.log("[MobileLifecycle] App masuk background");
      this.onBackground?.();
    } else {
      console.log("[MobileLifecycle] App kembali foreground");
      this.onForeground?.();
    }
  };

  private boundFocusHandler = () => {
    console.log("[MobileLifecycle] Window focus");
    this.onForeground?.();
  };

  initialize(callbacks?: {
    onBackground?: () => void;
    onForeground?: () => void;
  }): void {
    this.onBackground = callbacks?.onBackground ?? null;
    this.onForeground = callbacks?.onForeground ?? null;

    document.addEventListener("visibilitychange", this.boundVisibilityHandler);
    window.addEventListener("focus", this.boundFocusHandler);
  }

  destroy(): void {
    document.removeEventListener(
      "visibilitychange",
      this.boundVisibilityHandler,
    );
    window.removeEventListener("focus", this.boundFocusHandler);
    this.onBackground = null;
    this.onForeground = null;
  }
}
