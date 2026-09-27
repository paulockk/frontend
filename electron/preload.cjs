const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
});
