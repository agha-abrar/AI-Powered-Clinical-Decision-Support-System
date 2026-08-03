import { create } from "zustand";
/**
 * Tokens are held only in memory (a Zustand store, not persisted storage).
 * This is a browser/Vite dev context; in the packaged Electron app, refresh
 * tokens for "remember me" sessions would additionally be handed to the main
 * process to store via Electron's safeStorage, never via localStorage.
 */
export const useAuthStore = create((set, get) => ({
    accessToken: null,
    refreshToken: null,
    roles: [],
    permissions: [],
    setSession: ({ accessToken, refreshToken, roles, permissions }) => set({ accessToken, refreshToken, roles, permissions }),
    clearSession: () => set({ accessToken: null, refreshToken: null, roles: [], permissions: [] }),
    hasPermission: (p) => get().permissions.includes(p),
}));
