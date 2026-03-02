import React, { useState, useEffect } from 'react'
import { useMapStore } from './store/mapStore'
import { WelcomeScreen } from './components/WelcomeScreen'
import { VoronoiMap } from './components/VoronoiMap'
import { NavBar } from './components/NavBar'
import { RenameDialog } from './components/RenameDialog'
import { ErrorToast } from './components/ErrorToast'
import { SettingsPanel } from './components/SettingsPanel'
import { CreateNoteDialog } from './components/CreateNoteDialog'
import { CreatePlanetDialog } from './components/CreatePlanetDialog'
import { CreateFolderDialog } from './components/CreateFolderDialog'
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog'
import { NodeContextMenu } from './components/NodeContextMenu'
import { OmniSearch } from './components/OmniSearch'
import { CargoHold } from './components/CargoHold'
import { ErrorBoundary } from './components/ErrorBoundary'
import type { VaultHierarchy } from './types/hierarchy'
import './index.css'

export function App(): React.ReactElement {
  const { hierarchy, setHierarchy, setError, contextMenuTarget, setContextMenuTarget, setRenameTarget } = useMapStore((s) => ({
    hierarchy: s.hierarchy,
    setHierarchy: s.setHierarchy,
    setError: s.setError,
    contextMenuTarget: s.contextMenuTarget,
    setContextMenuTarget: s.setContextMenuTarget,
    setRenameTarget: s.setRenameTarget,
  }))
  const [showSettings, setShowSettings] = useState(false)
  const [showCreateNote, setShowCreateNote] = useState(false)
  const [showCreatePlanet, setShowCreatePlanet] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showOmniSearch, setShowOmniSearch] = useState(false)
  const [vaultPath, setVaultPath] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  const doScan = async (path: string): Promise<void> => {
    setScanning(true)
    try {
      const result = await window.api.scanVault(path)
      if (result) {
        setHierarchy(result as VaultHierarchy)
      } else {
        setError('Vault could not be scanned. Check the folder path.')
      }
    } catch (e) {
      setError('Vault scan failed: ' + String(e))
    } finally {
      setScanning(false)
    }
  }

  // Load persisted vault path on startup
  useEffect(() => {
    window.api.storeGet('vaultPath').then((saved) => {
      const path = saved as string | null
      if (path) {
        setVaultPath(path)
        doScan(path)
      }
    }).catch(() => { })
  }, [])

  // Periodic rescan
  useEffect(() => {
    if (!vaultPath) return
    const interval = setInterval(() => doScan(vaultPath), 30_000)
    return () => clearInterval(interval)
  }, [vaultPath])

  // Global OmniSearch Hotkey (Cmd/Ctrl + K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowOmniSearch(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleVaultSelected = (path: string): void => {
    window.api.storeSet('vaultPath', path)
    setVaultPath(path)
    doScan(path)
  }

  const handleChangeVault = async (): Promise<void> => {
    try {
      const selectedPath = await window.api.selectVault()
      if (selectedPath) {
        handleVaultSelected(selectedPath)
      }
    } catch (e) {
      setError('Could not select vault folder: ' + String(e))
    }
  }

  return (
    <ErrorBoundary>
      <div className="app">
        {!hierarchy ? (
          <WelcomeScreen onVaultSelected={handleVaultSelected} scanning={scanning} />
        ) : (
          <>
            <NavBar
              onSettings={() => setShowSettings(true)}
              onChangeVault={handleChangeVault}
              onCreateNote={() => setShowCreateNote(true)}
              onCreatePlanet={() => setShowCreatePlanet(true)}
            />
            <div className="canvas-container">
              <VoronoiMap hierarchy={hierarchy} />
            </div>
          </>
        )}
        <RenameDialog />
        <ErrorToast />
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
        {showCreateNote && vaultPath && <CreateNoteDialog onClose={() => setShowCreateNote(false)} onRescan={doScan} />}
        {showCreatePlanet && vaultPath && <CreatePlanetDialog onClose={() => setShowCreatePlanet(false)} onRescan={doScan} />}
        {showDelete && contextMenuTarget && (
          <DeleteConfirmDialog
            node={contextMenuTarget.node}
            onClose={() => { setShowDelete(false); setContextMenuTarget(null) }}
            onRescan={doScan}
          />
        )}
        {showCreateFolder && contextMenuTarget && (
          <CreateFolderDialog
            parentNode={contextMenuTarget.node}
            onClose={() => { setShowCreateFolder(false); setContextMenuTarget(null) }}
            onRescan={doScan}
          />
        )}
        {contextMenuTarget && !showDelete && !showCreateFolder && (
          <NodeContextMenu
            node={contextMenuTarget.node}
            x={contextMenuTarget.x}
            y={contextMenuTarget.y}
            onClose={() => setContextMenuTarget(null)}
            onRename={() => { setRenameTarget(contextMenuTarget.node); setContextMenuTarget(null) }}
            onDelete={() => setShowDelete(true)}
            onCreateFolder={() => setShowCreateFolder(true)}
          />
        )}
        {showOmniSearch && hierarchy && <OmniSearch onClose={() => setShowOmniSearch(false)} />}
        {hierarchy && <CargoHold />}
      </div>
    </ErrorBoundary>
  )
}
