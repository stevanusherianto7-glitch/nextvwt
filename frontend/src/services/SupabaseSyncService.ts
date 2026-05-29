import { supabase } from "../lib/supabase";
import { useAppStore } from "../store/useAppStore";

export class SupabaseSyncService {
  private static instance: SupabaseSyncService;
  private isOnline: boolean = navigator.onLine;

  private constructor() {
    window.addEventListener("online", this.handleOnline.bind(this));
    window.addEventListener("offline", this.handleOffline.bind(this));

    // Subscribe to realtime changes in profiles
    supabase
      .channel("public:profiles")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => this.handleProfileUpdate(payload),
      )
      .subscribe();

    // Subscribe to local Zustand state changes to push to Supabase
    let previousSettings = useAppStore.getState().settings;
    useAppStore.subscribe((state) => {
      const currentSettings = state.settings;
      if (
        currentSettings.username !== previousSettings.username ||
        currentSettings.avatarDataUrl !== previousSettings.avatarDataUrl
      ) {
        previousSettings = currentSettings;
        // Gunakan debounce ringan agar tidak mengirim saat mengetik per karakter
        this.syncProfileToSupabaseDebounced();
      }
    });
  }

  private syncTimeout: any = null;
  private syncProfileToSupabaseDebounced() {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(() => {
      this.syncProfileToSupabase();
    }, 1500);
  }

  public static getInstance(): SupabaseSyncService {
    if (!SupabaseSyncService.instance) {
      SupabaseSyncService.instance = new SupabaseSyncService();
    }
    return SupabaseSyncService.instance;
  }

  private handleOnline() {
    this.isOnline = true;
    console.log("[SupabaseSync] Network Online. Pushing pending changes...");
    this.syncProfileToSupabase();
  }

  private handleOffline() {
    this.isOnline = false;
    console.log(
      "[SupabaseSync] Network Offline. Operating in local cache mode.",
    );
  }

  private handleProfileUpdate(payload: any) {
    const { new: newProfile } = payload;
    const session = this.getCurrentSession();
    if (session && session.user.id === newProfile.id) {
      // Remote changes pushed to local
      console.log(
        "[SupabaseSync] Received profile update from remote.",
        newProfile,
      );
      useAppStore.getState().updateSettings({
        username: newProfile.username,
        avatarDataUrl: newProfile.avatar_url || "",
      });
    }
  }

  private getCurrentSession() {
    // Synchronously grab session. Not ideal, but good enough for this service.
    // In a real app we'd keep session in a store.
    const sessionItem =
      localStorage.getItem("sb-nextvwt-auth-token") ||
      localStorage.getItem("supabase.auth.token");
    if (sessionItem) {
      try {
        return JSON.parse(sessionItem);
      } catch {
        return null;
      }
    }
    return null;
  }

  public async loadProfileFromSupabase(userId: string) {
    if (!this.isOnline) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) {
        useAppStore.getState().updateSettings({
          username: data.username,
          avatarDataUrl: data.avatar_url || "",
        });
      }
    } catch (err) {
      console.error("[SupabaseSync] Failed to load profile:", err);
    }
  }

  public async syncProfileToSupabase() {
    if (!this.isOnline) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const state = useAppStore.getState();
      const { username, avatarDataUrl } = state.settings;

      await supabase
        .from("profiles")
        .update({
          username: username,
          avatar_url: avatarDataUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);

      console.log(
        "[SupabaseSync] Successfully pushed profile delta to Supabase.",
      );
    } catch (err) {
      console.error("[SupabaseSync] Failed to sync profile to Supabase:", err);
    }
  }
}
