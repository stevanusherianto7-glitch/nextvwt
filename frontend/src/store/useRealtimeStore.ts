import { create } from "zustand";

export interface RealtimeUser {
  id: string;
  name: string;
  channel: string;
  locationState: string;
  isSpeaking: boolean;
  avatarDataUrl?: string;
}

interface RealtimeState {
  // Connection
  connected: boolean;
  socketId: string | null;

  // Channel
  currentChannel: string;

  // Users — normalized map untuk O(1) lookup
  users: Record<string, RealtimeUser>;

  // Audio state
  isTransmitting: boolean;
  isReceiving: boolean;

  // Network health
  serverLatency: number;

  // Actions
  setConnected: (connected: boolean, socketId?: string) => void;
  setChannel: (channel: string) => void;
  upsertUser: (user: RealtimeUser) => void;
  removeUser: (id: string) => void;
  setSpeaking: (id: string, speaking: boolean) => void;
  setUsersFromList: (users: RealtimeUser[]) => void;
  setTransmitting: (transmitting: boolean) => void;
  setReceiving: (receiving: boolean) => void;
  setServerLatency: (latency: number) => void;
  clearChannelUsers: () => void;
  reset: () => void;
}

const initialState = {
  connected: false,
  socketId: null,
  currentChannel: "100",
  users: {} as Record<string, RealtimeUser>,
  isTransmitting: false,
  isReceiving: false,
  serverLatency: 0,
};

export const useRealtimeStore = create<RealtimeState>((set) => ({
  ...initialState,

  setConnected: (connected, socketId) =>
    set((state) => ({
      connected,
      socketId: socketId ?? state.socketId,
      // Bersihkan users saat disconnect untuk menghindari stale state
      users: connected ? state.users : {},
    })),

  setChannel: (currentChannel) => set({ currentChannel }),

  upsertUser: (user) =>
    set((state) => ({
      users: { ...state.users, [user.id]: user },
    })),

  removeUser: (id) =>
    set((state) => {
      const next = { ...state.users };
      delete next[id];
      return { users: next };
    }),

  setSpeaking: (id, speaking) =>
    set((state) => {
      const user = state.users[id];
      if (!user || user.isSpeaking === speaking) return state; // skip jika tidak berubah
      return {
        users: { ...state.users, [id]: { ...user, isSpeaking: speaking } },
      };
    }),

  setUsersFromList: (users) =>
    set(() => {
      const map: Record<string, RealtimeUser> = {};
      users.forEach((u) => {
        map[u.id] = u;
      });
      return { users: map };
    }),

  setTransmitting: (isTransmitting) => set({ isTransmitting }),

  setReceiving: (isReceiving) => set({ isReceiving }),

  setServerLatency: (serverLatency) => set({ serverLatency }),

  clearChannelUsers: () => set({ users: {} }),

  reset: () => set(initialState),
}));

/** Selector: dapatkan users sebagai array (untuk render list) */
export const selectUsersArray = (state: RealtimeState): RealtimeUser[] =>
  Object.values(state.users);

/** Selector: cek apakah ada user lain yang sedang berbicara */
export const selectSomeoneElseSpeaking = (
  state: RealtimeState,
  myId: string | null,
): boolean =>
  Object.values(state.users).some((u) => u.isSpeaking && u.id !== myId);
