"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  selectVault: () => electron.ipcRenderer.invoke("vault:select"),
  scanVault: (vaultPath) => electron.ipcRenderer.invoke("vault:scan", vaultPath),
  renameNode: (oldPath, newName) => electron.ipcRenderer.invoke("file:rename", oldPath, newName),
  renameFile: (oldPath, newName) => electron.ipcRenderer.invoke("file:rename", oldPath, newName),
  createNote: (folderPath, noteName) => electron.ipcRenderer.invoke("file:create", folderPath, noteName),
  moveNode: (sourcePath, targetFolderPath) => electron.ipcRenderer.invoke("file:move", sourcePath, targetFolderPath),
  openObsidian: (url) => electron.ipcRenderer.invoke("obsidian:open", url),
  storeGet: (key) => electron.ipcRenderer.invoke("store:get", key),
  storeSet: (key, value) => electron.ipcRenderer.invoke("store:set", key, value),
  loadAdmin1: () => electron.ipcRenderer.invoke("geo:admin1")
});
