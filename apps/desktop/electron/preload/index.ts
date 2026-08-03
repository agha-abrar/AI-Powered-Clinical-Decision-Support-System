import { contextBridge } from "electron";

/**
 * The renderer gets exactly this surface — nothing else. No ipcRenderer, no
 * Node globals, no process.env. The API base URL is the one configuration
 * value the renderer needs; everything sensitive (OpenRouter key, DB creds,
 * JWT secrets) lives only in the backend processes and is never reachable
 * from here.
 */
contextBridge.exposeInMainWorld("cdssBridge", {
  apiBaseUrl: process.env.VITE_API_BASE_URL ?? "http://localhost:3000",
  platform: process.platform,
  versions: { electron: process.versions.electron, chrome: process.versions.chrome },
});

export {};
