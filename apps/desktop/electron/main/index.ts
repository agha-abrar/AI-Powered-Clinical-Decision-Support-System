import { app, BrowserWindow, session, shell } from "electron";
import path from "node:path";

const isDev = !app.isPackaged;

// Renderer never receives environment variables directly (spec section 5) —
// the only value it needs is the API base URL, passed via a safe IPC channel
// exposed by the preload bridge, not via process.env.
const API_BASE_URL = process.env.VITE_API_BASE_URL ?? "http://localhost:3000";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Strict Content-Security-Policy applied to every response.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const devConnectOrigins = isDev ? " http://localhost:5173 ws://localhost:5173" : "";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; " +
            `connect-src 'self' ${API_BASE_URL}${devConnectOrigins}; ` +
            "img-src 'self' data:; " +
            "style-src 'self' 'unsafe-inline'; " +
            `script-src 'self'${isDev ? " 'unsafe-inline'" : ""}; ` +
            "object-src 'none'; " +
            "base-uri 'self'",
        ],
      },
    });
  });

  // Deny camera/mic/geolocation/notifications unless explicitly requested by
  // a feature that has its own authorization flow (none currently do).
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));

  // Prevent arbitrary navigation and unapproved new-window creation.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowed = isDev ? url.startsWith("http://localhost:5173") : url.startsWith("app://");
    if (!allowed) event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
