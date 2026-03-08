import { ipcMain, dialog, shell, app } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import { scanVault } from './vaultScanner'
import { renameNode, createNote, moveNode, createFolder, deleteNode, readNote, writeNote } from './fileSystem'
import { store } from './store'

interface ObsidianVaultInfo {
  path: string
  name: string
}

function detectObsidianVaults(): ObsidianVaultInfo[] {
  try {
    // Obsidian stores vault list in obsidian.json
    // Windows: %APPDATA%/Obsidian/obsidian.json
    // macOS:   ~/Library/Application Support/Obsidian/obsidian.json
    // Linux:   ~/.config/Obsidian/obsidian.json
    const appData = app.getPath('appData')
    const obsidianJsonPath = join(appData, 'Obsidian', 'obsidian.json')

    if (!existsSync(obsidianJsonPath)) {
      console.log('[detectObsidianVaults] obsidian.json not found at:', obsidianJsonPath)
      return []
    }

    const raw = readFileSync(obsidianJsonPath, 'utf8')
    const data = JSON.parse(raw)

    // obsidian.json has a "vaults" object: { "hash": { "path": "...", "ts": ... }, ... }
    const vaults: ObsidianVaultInfo[] = []
    if (data.vaults && typeof data.vaults === 'object') {
      for (const key of Object.keys(data.vaults)) {
        const entry = data.vaults[key]
        if (entry && entry.path && existsSync(entry.path)) {
          vaults.push({
            path: entry.path,
            name: basename(entry.path)
          })
        }
      }
    }

    console.log('[detectObsidianVaults] Found', vaults.length, 'vaults')
    return vaults
  } catch (err) {
    console.error('[detectObsidianVaults] Error:', err)
    return []
  }
}

export function registerIpcHandlers(): void {
  // Vault klasörü seç
  ipcMain.handle('vault:select', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Vault tara
  ipcMain.handle('vault:scan', (_e, vaultPath: string) => {
    if (!existsSync(vaultPath)) return null
    return scanVault(vaultPath)
  })

  // Dosya/klasör yeniden adlandır
  ipcMain.handle('file:rename', (_e, oldPath: string, newName: string) => {
    return renameNode(oldPath, newName)
  })

  // Yeni Not Oluştur
  ipcMain.handle('file:create', (_e, folderPath: string, noteName: string) => {
    return createNote(folderPath, noteName)
  })

  // Dosya Oku
  ipcMain.handle('file:read', (_e, filePath: string) => {
    return readNote(filePath)
  })

  // Dosya Yaz
  ipcMain.handle('file:write', (_e, filePath: string, content: string) => {
    return writeNote(filePath, content)
  })

  // Klasör Taşıma (Sürükle & Bırak)
  ipcMain.handle('file:move', (_e, sourcePath: string, targetFolderPath: string) => {
    return moveNode(sourcePath, targetFolderPath)
  })

  // Yeni Gezegen/Klasör Oluştur
  ipcMain.handle('file:createFolder', (_e, parentPath: string, folderName: string) => {
    return createFolder(parentPath, folderName)
  })

  // Dosya / Klasör Sil
  ipcMain.handle('file:delete', (_e, targetPath: string) => {
    return deleteNode(targetPath)
  })

  // Obsidian'da aç
  ipcMain.handle('obsidian:open', async (_e, url: string) => {
    try {
      await shell.openExternal(url)
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // Load admin-1 GeoJSON data
  ipcMain.handle('geo:admin1', () => {
    try {
      // Production: out/main/../renderer/ne_10m_admin_1.json
      // Dev: src/renderer/public/ne_10m_admin_1.json
      let filePath = join(__dirname, '../renderer/ne_10m_admin_1.json')
      if (!existsSync(filePath)) {
        // Fallback for dev mode
        filePath = join(__dirname, '../../src/renderer/public/ne_10m_admin_1.json')
      }
      if (!existsSync(filePath)) {
        // Another fallback - assets directory
        filePath = join(__dirname, '../../src/renderer/src/assets/ne_10m_admin_1.json')
      }
      if (!existsSync(filePath)) {
        console.error('[geo:admin1] File not found at any path')
        return null
      }
      console.log('[geo:admin1] Loading from:', filePath)
      const raw = readFileSync(filePath, 'utf8')
      return JSON.parse(raw)
    } catch (err) {
      console.error('[geo:admin1] Error:', err)
      return null
    }
  })

  // Store get/set
  ipcMain.handle('store:get', (_e, key: string) => store.get(key))
  ipcMain.handle('store:set', (_e, key: string, value: unknown) => { store.set(key, value) })

  // Obsidian vault'larını otomatik algıla
  ipcMain.handle('vault:detectObsidianVaults', () => {
    return detectObsidianVaults()
  })
}
