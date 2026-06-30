/**
 * Electron shell for Prospectus AI.
 *
 * Development: run `npm run dev` in frontend/web, then `npm start` here — loads /workspace
 *
 * Packaged macOS: runtime lives in Contents/Resources/prospectus/
 * Packaged Windows: flat layout beside Prospectus AI.exe (agent1.py + web/)
 */

const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");
const { spawn } = require("child_process");

const DEV_URL = "http://127.0.0.1:3000";
const DEFAULT_PORT = process.env.PROSPECTUS_PORT || "3000";
/** Desktop app opens the drafting workspace, not the public marketing homepage. */
const APP_ENTRY_PATH = process.env.PROSPECTUS_ELECTRON_ENTRY || "/workspace";

let serverChild = null;
let mainWindow = null;

function appHomeUrl(baseUrl) {
  const base = baseUrl.replace(/\/$/, "");
  const entry = APP_ENTRY_PATH.startsWith("/") ? APP_ENTRY_PATH : `/${APP_ENTRY_PATH}`;
  return `${base}${entry}`;
}

function iconPath() {
  const p = path.join(__dirname, "build", "icon.png");
  return fs.existsSync(p) ? p : undefined;
}

function venvBinDir(prospectusRoot) {
  return process.platform === "win32"
    ? path.join(prospectusRoot, "venv", "Scripts")
    : path.join(prospectusRoot, "venv", "bin");
}

function venvPython(prospectusRoot) {
  return process.platform === "win32"
    ? path.join(prospectusRoot, "venv", "Scripts", "python.exe")
    : path.join(prospectusRoot, "venv", "bin", "python3");
}

function bundledProspectusRoot() {
  if (!app.isPackaged || process.platform !== "darwin") return null;
  const bundled = path.join(process.resourcesPath, "prospectus");
  if (fs.existsSync(path.join(bundled, "agent1.py")) && fs.existsSync(path.join(bundled, "web", "server.js"))) {
    return bundled;
  }
  return null;
}

function ensureMacWorkspace(bundleRoot, workspaceRoot) {
  fs.mkdirSync(workspaceRoot, { recursive: true });
  for (const rel of ["prospectus_kg_output/inputs"]) {
    const src = path.join(bundleRoot, rel);
    const dst = path.join(workspaceRoot, rel);
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      fs.cpSync(src, dst, { recursive: true });
    }
  }
}

/**
 * Layout from packaging scripts:
 * - macOS DMG: Contents/Resources/prospectus/
 * - Windows portable: InstallRoot/agent1.py beside the .exe
 */
function findProspectusInstallNearExe() {
  const bundled = bundledProspectusRoot();
  if (bundled) {
    const workspaceRoot = app.getPath("userData");
    ensureMacWorkspace(bundled, workspaceRoot);
    return {
      prospectusRoot: bundled,
      webRoot: path.join(bundled, "web"),
      workspaceRoot,
    };
  }

  const candidates = [];
  const exeDir = path.dirname(process.execPath);
  candidates.push(exeDir);

  if (process.platform === "darwin") {
    const macOsDir = path.join("Contents", "MacOS");
    if (exeDir.endsWith(macOsDir) || exeDir.includes(`${path.sep}Contents${path.sep}MacOS`)) {
      candidates.push(path.resolve(exeDir, "..", "..", ".."));
    }
  }

  const seen = new Set();
  for (const dir of candidates) {
    const normalized = path.resolve(dir);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    const webServer = path.join(normalized, "web", "server.js");
    const agent = path.join(normalized, "agent1.py");
    if (fs.existsSync(webServer) && fs.existsSync(agent)) {
      return { prospectusRoot: normalized, webRoot: path.join(normalized, "web") };
    }
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

function portIsFree(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findAvailablePort(startPort) {
  const first = Number.parseInt(String(startPort), 10) || 3000;
  for (let port = first; port <= first + 99; port += 1) {
    if (await portIsFree(port, "127.0.0.1")) return port;
  }
  throw new Error(`No free TCP port from ${first} to ${first + 99} on 127.0.0.1`);
}

function startNextStandalone(layout, port) {
  return new Promise((resolve, reject) => {
    const serverJs = path.join(layout.webRoot, "server.js");
    if (!fs.existsSync(serverJs)) {
      reject(new Error(`Missing server.js: ${serverJs}`));
      return;
    }

    const embeddedNode =
      process.platform === "win32"
        ? path.join(layout.prospectusRoot, "node", "node.exe")
        : path.join(layout.prospectusRoot, "node", "bin", "node");
    const serverNode = fs.existsSync(embeddedNode) ? embeddedNode : process.execPath;

    const env = {
      ...process.env,
      PROSPECTUS_ROOT: layout.prospectusRoot,
      AGENT1_PYTHON: venvPython(layout.prospectusRoot),
      PATH: `${venvBinDir(layout.prospectusRoot)}${path.delimiter}${process.env.PATH || ""}`,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      ELECTRON_RUN_AS_NODE: "1",
    };
    if (layout.workspaceRoot) {
      env.WORKSPACE_ROOT = layout.workspaceRoot;
    }

    serverChild = spawn(serverNode, [serverJs], {
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
    return { url: appHomeUrl(DEV_URL), startedServer: false };
  }
  const layout = findProspectusInstallNearExe();
  if (!layout) {
    return { url: null, startedServer: false, missingLayout: true };
  }
  const port = await findAvailablePort(DEFAULT_PORT);
  await startNextStandalone(layout, port);
  return { url: appHomeUrl(`http://127.0.0.1:${port}`), startedServer: true };
}

async function createWindow() {
  const { url, missingLayout } = await resolveStartUrl();

  if (missingLayout) {
    await dialog.showMessageBox({
      type: "error",
      title: "Prospectus AI",
      message: "Install folder not found",
      detail:
        process.platform === "darwin"
          ? "The app bundle is missing its bundled runtime (Contents/Resources/prospectus).\n\nRebuild with: npm run pack:mac"
          : "Place this program in the same folder as agent1.py and the web folder (the output of packaging/windows/build.ps1).\n\n" +
            "Or for development, run from the repo: npm run dev in frontend/web, then npm start in platform/desktop (unpackaged).",
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
