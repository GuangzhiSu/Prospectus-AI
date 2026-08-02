/**
 * Thin Electron client for Prospectus AI.
 *
 * The desktop bundle intentionally contains no prompts, Python agents, model
 * runtime, or API credentials. It loads the protected workspace hosted by the
 * Prospectus AI server; user input is submitted to that origin over HTTPS.
 */

const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

const DEFAULT_SERVER_URL = "https://ai-prospectus.com";
const DEV_SERVER_URL = "http://127.0.0.1:3000";
const APP_ENTRY_PATH = process.env.PROSPECTUS_ELECTRON_ENTRY || "/workspace";

const DESKTOP_MARKETING_REDIRECTS = {
  "/": "/workspace",
  "/zh": "/zh/workspace",
  "/download": "/workspace",
  "/zh/download": "/zh/workspace",
  "/eligibility": "/workspace",
  "/zh/eligibility": "/zh/workspace",
};

let mainWindow = null;
let trustedAppOrigin = null;
let authWindow = null;

function configuredServerUrl() {
  const configured = process.env.PROSPECTUS_SERVER_URL;
  if (configured) return configured;
  return app.isPackaged ? DEFAULT_SERVER_URL : DEV_SERVER_URL;
}

function appHomeUrl(baseUrl) {
  const base = new URL(baseUrl);
  if (!["http:", "https:"].includes(base.protocol)) {
    throw new Error("PROSPECTUS_SERVER_URL must use http or https");
  }
  const entry = APP_ENTRY_PATH.startsWith("/") ? APP_ENTRY_PATH : `/${APP_ENTRY_PATH}`;
  return new URL(entry, `${base.origin}/`).toString();
}

function iconPath() {
  const candidate = path.join(__dirname, "build", "icon.png");
  return fs.existsSync(candidate) ? candidate : undefined;
}

function isTrustedAppNavigation(navigationUrl) {
  try {
    const url = new URL(navigationUrl);
    return ["http:", "https:"].includes(url.protocol) && url.origin === trustedAppOrigin;
  } catch {
    return false;
  }
}

function openExternalNavigation(navigationUrl) {
  shell.openExternal(navigationUrl).catch(() => {
    // The remote workspace remains usable if the operating system rejects it.
  });
}

function redirectDesktopMarketingNavigation(event, navigationUrl) {
  try {
    const url = new URL(navigationUrl);
    const destination = DESKTOP_MARKETING_REDIRECTS[url.pathname];
    if (!destination || !mainWindow || mainWindow.isDestroyed()) return;
    event.preventDefault();
    void mainWindow.loadURL(new URL(destination, `${url.origin}/`).toString());
  } catch {
    // Ignore malformed URLs.
  }
}

function attachDesktopNavigationGuards(webContents) {
  webContents.on("will-navigate", (event, url) => {
    if (!isTrustedAppNavigation(url)) {
      event.preventDefault();
      openExternalNavigation(url);
      return;
    }
    redirectDesktopMarketingNavigation(event, url);
  });

  webContents.setWindowOpenHandler(({ url }) => {
    if (!isTrustedAppNavigation(url)) {
      openExternalNavigation(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
}

function requestWorkspaceCredentials(authInfo) {
  return new Promise((resolve) => {
    if (authWindow && !authWindow.isDestroyed()) {
      authWindow.focus();
      resolve(null);
      return;
    }

    authWindow = new BrowserWindow({
      parent: mainWindow || undefined,
      modal: Boolean(mainWindow),
      width: 440,
      height: 330,
      resizable: false,
      minimizable: false,
      maximizable: false,
      title: "Sign in to Prospectus AI",
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "login-preload.cjs"),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    let settled = false;
    const finish = (credentials) => {
      if (settled) return;
      settled = true;
      ipcMain.removeListener("workspace-auth-submit", handleSubmit);
      resolve(credentials);
      if (authWindow && !authWindow.isDestroyed()) authWindow.close();
      authWindow = null;
    };
    const handleSubmit = (event, credentials) => {
      if (!authWindow || event.sender !== authWindow.webContents) return;
      const username = typeof credentials?.username === "string" ? credentials.username : "";
      const password = typeof credentials?.password === "string" ? credentials.password : "";
      finish(username && password ? { username, password } : null);
    };

    ipcMain.on("workspace-auth-submit", handleSubmit);
    authWindow.on("closed", () => finish(null));
    void authWindow.loadFile(path.join(__dirname, "login.html"), {
      query: { host: authInfo.host || "Prospectus AI" },
    });
  });
}

async function createWindow() {
  let startUrl;
  try {
    startUrl = appHomeUrl(configuredServerUrl());
    trustedAppOrigin = new URL(startUrl).origin;
  } catch (error) {
    await dialog.showMessageBox({
      type: "error",
      title: "Prospectus AI",
      message: "Invalid server configuration",
      detail: error instanceof Error ? error.message : String(error),
    });
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "Prospectus AI",
    icon: iconPath(),
    show: false,
    autoHideMenuBar: app.isPackaged,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  attachDesktopNavigationGuards(mainWindow.webContents);

  try {
    await mainWindow.loadURL(startUrl);
  } catch (error) {
    await dialog.showMessageBox({
      type: "error",
      title: "Prospectus AI",
      message: "Could not connect to the Prospectus AI server",
      detail:
        `${error instanceof Error ? error.message : String(error)}\n\n` +
        `Server: ${trustedAppOrigin}\nCheck your network connection and try again.`,
    });
    app.quit();
  }

  if (!app.isPackaged && process.env.PROSPECTUS_ELECTRON_DEVTOOLS) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("login", (event, _webContents, details, authInfo, callback) => {
    let requestedOrigin;
    try {
      requestedOrigin = new URL(details.url).origin;
    } catch {
      callback();
      return;
    }
    if (authInfo.isProxy || requestedOrigin !== trustedAppOrigin) {
      callback();
      return;
    }

    event.preventDefault();
    void requestWorkspaceCredentials(authInfo).then((credentials) => {
      if (!credentials) callback();
      else callback(credentials.username, credentials.password);
    });
  });

  app.on("second-instance", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    void createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow();
    });
  });

  app.on("window-all-closed", () => app.quit());
}
