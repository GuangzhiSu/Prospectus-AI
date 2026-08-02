const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("workspaceAuth", {
  submit(username, password) {
    ipcRenderer.send("workspace-auth-submit", { username, password });
  },
});
