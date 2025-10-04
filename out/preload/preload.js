"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
    electron.contextBridge.exposeInMainWorld("fileAPI", {
      readDirectory: async (dirPath) => {
        return await electron.ipcRenderer.invoke("read-directory", dirPath);
      },
      readFile: async (filePath) => {
        return await electron.ipcRenderer.invoke("read-file", filePath);
      },
      getHomeDir: async () => {
        return await electron.ipcRenderer.invoke("get-home-dir");
      },
      selectDirectory: async () => {
        return await electron.ipcRenderer.invoke("select-directory");
      }
    });
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
