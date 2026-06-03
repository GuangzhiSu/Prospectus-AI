/**
 * Electron shell for Prospectus AI.
 *
 * Development: run `npm run dev` in apps/web, then `npm start` here — loads http://127.0.0.1:3000
 *
 * Packaged: place the built app next to a full Prospectus install (agent1.py + web/server.js),
 * e.g. the output of packaging/windows/build.ps1 — same folder layout as start-prospectus-ui.bat.
 */

const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");
const { spawn } = require("child_process");

const DEV_URL = "http://127.0.0.1:3000";
const DEFAULT_PORT = process.env.PROSPECTUS_PORT || "3000";

let serverChild = null;
let mainWindow = null;

function iconPath() {
  const p = path.join(__dirname, "build", "icon.png");
  return fs.existsSync(p) ? p : undefined;
}

/**
 * Layout from packaging/windows/build.ps1: InstallRoot/agent1.py, InstallRoot/web/server.js
 */
function findProspectusInstallNearExe() {
  const exeDir = path.dirname(process.execPath);
  const webServer = path.join(exeDir, "web", "server.js");
  const agent = path.join(exeDir, "agent1.py");
  if (fs.existsSync(webServer) && fs.existsSync(agent)) {
    return { prospectusRoot: exeDir, webRoot: path.join(exeDir, "web") };
  }
  return null;
}

function waitForPort(port, host, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const socket = net.connect({ port, host }, () => {
        socket.end();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`Server did not listen on ${host}:${port} within ${timeoutMs}ms`));
        } else {
          setTimeout(tryOnce, 400);
        }
      });
    };
    tryOnce();
  });
}

function startNextStandalone(layout, port) {
  return new Promise((resolve, reject) => {
    const serverJs = path.join(layout.webRoot, "server.js");
    if (!fs.existsSync(serverJs)) {
      reject(new Error(`Missing server.js: ${serverJs}`));
      return;
    }
    const env = {
      ...process.env,
      PROSPECTUS_ROOT: layout.prospectusRoot,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      ELECTRON_RUN_AS_NODE: "1",
    };
    serverChild = spawn(process.execPath, [serverJs], {
      cwd: layout.webRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    serverChild.on("error", reject);
    serverChild.stdout?.on("data", (d) => {
      if (process.env.PROSPECTUS_ELECTRON_DEBUG) console.log(String(d));
    });
    serverChild.stderr?.on("data", (d) => {
      if (process.env.PROSPECTUS_ELECTRON_DEBUG) console.error(String(d));
    });
    serverChild.on("exit", (code) => {
      if (code && code !== 0 && mainWindow && !mainWindow.isDestroyed()) {
        dialog.showMessageBox(mainWindow, {
          type: "warning",
          message: "Prospectus server exited",
          detail: `Node process exited with code ${code}. Close this window or restart the app.`,
        });
      }
    });
    waitForPort(Number(port), "127.0.0.1", 120000).then(resolve).catch(reject);
  });
}

async function resolveStartUrl() {
  if (!app.isPackaged) {
    return { url: DEV_URL, startedServer: false };
  }
  const layout = findProspectusInstallNearExe();
  if (!layout) {
    return { url: null, startedServer: false, missingLayout: true };
  }
  const port = DEFAULT_PORT;
  await startNextStandalone(layout, port);
  return { url: `http://127.0.0.1:${port}`, startedServer: true };
}

async function createWindow() {
  const { url, missingLayout } = await resolveStartUrl();

  if (missingLayout) {
    await dialog.showMessageBox({
      type: "error",
      title: "Prospectus AI",
      message: "Install folder not found next to this app",
      detail:
        "Place this program in the same folder as agent1.py and the web folder (the output of packaging/windows/build.ps1).\n\n" +
        "Or for development, run from the repo: npm run dev in apps/web, then npm start in apps/desktop (unpackaged).",
    });
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    icon: iconPath(),
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  try {
    await mainWindow.loadURL(url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await dialog.showMessageBox({
      type: "error",
      title: "Prospectus AI",
      message: "Could not load the app",
      detail: msg,
    });
    app.quit();
    return;
  }

  if (!app.isPackaged && process.env.PROSPECTUS_ELECTRON_DEVTOOLS) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

app.whenReady().then(() => {
  void createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  if (serverChild) {
    serverChild.kill();
    serverChild = null;
  }
  app.quit();
});
