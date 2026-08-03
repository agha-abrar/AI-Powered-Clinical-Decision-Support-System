import { create } from "zustand";
import { PermissionKey } from "@cdss/shared";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  roles: string[];
  permissions: PermissionKey[];
  setSession: (s: { accessToken: string; refreshToken: string; roles: string[]; permissions: PermissionKey[] }) => void;
  clearSession: () => void;
  hasPermission: (p: PermissionKey) => boolean;
}

/**
 * Tokens are held only in memory (a Zustand store, not persisted storage).
 * This is a browser/Vite dev context; in the packaged Electron app, refresh
 * tokens for "remember me" sessions would additionally be handed to the main
 * process to store via Electron's safeStorage, never via localStorage.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  roles: [],
  permissions: [],
  setSession: ({ accessToken, refreshToken, roles, permissions }) =>
    set({ accessToken, refreshToken, roles, permissions }),
  clearSession: () => set({ accessToken: null, refreshToken: null, roles: [], permissions: [] }),
  hasPermission: (p) => get().permissions.includes(p),
}));
