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
    electron.contextBridge.exposeInMainWorld("electronAPI", {
      auth: {
        checkStatus: async () => {
          return await electron.ipcRenderer.invoke("auth:check-status");
        },
        startOAuth: async () => {
          return await electron.ipcRenderer.invoke("auth:start-oauth");
        },
        completeOAuth: async (code) => {
          return await electron.ipcRenderer.invoke("auth:complete-oauth", code);
        },
        signOut: async () => {
          return await electron.ipcRenderer.invoke("auth:sign-out");
        }
      },
      // IPC renderer for additional operations
      ipcRenderer: {
        invoke: async (channel, ...args) => {
          const allowedChannels = ["dialog:select-directory"];
          if (allowedChannels.includes(channel)) {
            return await electron.ipcRenderer.invoke(channel, ...args);
          }
          throw new Error(`IPC channel '${channel}' is not allowed`);
        }
      }
    });
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
