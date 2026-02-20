import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  selectVault: () => ipcRenderer.invoke('vault:select'),
  scanVault: (vaultPath: string) => ipcRenderer.invoke('vault:scan', vaultPath),
  renameNode: (oldPath: string, newName: string) => ipcRenderer.invoke('file:rename', oldPath, newName),
  renameFile: (oldPath: string, newName: string) => ipcRenderer.invoke('file:rename', oldPath, newName),
  createNote: (folderPath: string, noteName: string) => ipcRenderer.invoke('file:create', folderPath, noteName),
  moveNode: (sourcePath: string, targetFolderPath: string) => ipcRenderer.invoke('file:move', sourcePath, targetFolderPath),
  openObsidian: (url: string) => ipcRenderer.invoke('obsidian:open', url),
  storeGet: (key: string) => ipcRenderer.invoke('store:get', key),
  storeSet: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
  loadAdmin1: () => ipcRenderer.invoke('geo:admin1')
})
