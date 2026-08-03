export {};

declare global {
  interface Window {
    cdssBridge?: {
      apiBaseUrl: string;
      platform: string;
      versions: { electron: string; chrome: string };
    };
  }
}
