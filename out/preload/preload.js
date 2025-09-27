"use strict";
const electron = require("electron");
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electronAPI", {
      minimize: () => electron.ipcRenderer.invoke("window-minimize"),
      maximize: () => electron.ipcRenderer.invoke("window-maximize"),
      close: () => electron.ipcRenderer.invoke("window-close")
    });
    electron.contextBridge.exposeInMainWorld("claudeAPI", {
      // Will be implemented when we copy backend management
      placeholder: true
    });
  } catch (error) {
    console.error(error);
  }
}
