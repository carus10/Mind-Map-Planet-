import React, { useState, useEffect } from 'react'
import { useMapStore } from './store/mapStore'
import { WelcomeScreen } from './components/WelcomeScreen'
import { VaultSwitcher } from './components/VaultSwitcher'
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
import { PlanetAppearanceDialog } from './components/PlanetAppearanceDialog'
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
  const [showAppearance, setShowAppearance] = useState(false)
  const [showVaultSwitcher, setShowVaultSwitcher] = useState(false)
  const [vaultPath, setVaultPath] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  // Controls whether WelcomeScreen is shown (only on first launch or no saved vault)
  const [showWelcome, setShowWelcome] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)

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

  // On startup: check if a vault was previously saved
  // If yes → auto-load it (skip WelcomeScreen)
  // If no → show WelcomeScreen (first launch)
  useEffect(() => {
    window.api.storeGet('vaultPath').then((saved) => {
      const path = saved as string | null
      if (path) {
        // Returning user — auto-load saved vault
        setVaultPath(path)
        setShowWelcome(false)
        doScan(path)
      }
      // else: first launch — showWelcome stays true
    }).catch(() => { }).finally(() => {
      setInitialLoading(false)
    })
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
    setShowWelcome(false)
    doScan(path)
  }

  // If still loading saved vault, show nothing
  if (initialLoading) {
    return <div className="app" />
  }

  return (
    <ErrorBoundary>
      <div className="app">
        {showWelcome && !hierarchy ? (
          <WelcomeScreen onVaultSelected={handleVaultSelected} scanning={scanning} />
        ) : !hierarchy ? (
          // Loading state after auto-load
          <div className="app" />
        ) : (
          <>
            <NavBar
              onSettings={() => setShowSettings(true)}
              onChangeVault={() => setShowVaultSwitcher(true)}
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
        {contextMenuTarget && !showDelete && !showCreateFolder && !showAppearance && (
          <NodeContextMenu
            node={contextMenuTarget.node}
            x={contextMenuTarget.x}
            y={contextMenuTarget.y}
            isPlanet={contextMenuTarget.isPlanet}
            onClose={() => setContextMenuTarget(null)}
            onRename={() => { setRenameTarget(contextMenuTarget.node); setContextMenuTarget(null) }}
            onDelete={() => setShowDelete(true)}
            onCreateFolder={() => setShowCreateFolder(true)}
            onAppearance={contextMenuTarget.isPlanet ? () => setShowAppearance(true) : undefined}
          />
        )}
        {showAppearance && contextMenuTarget?.isPlanet && (
          <PlanetAppearanceDialog
            planet={contextMenuTarget.node}
            onClose={() => { setShowAppearance(false); setContextMenuTarget(null) }}
          />
        )}
        {showOmniSearch && hierarchy && <OmniSearch onClose={() => setShowOmniSearch(false)} />}
        {hierarchy && <CargoHold />}
        {showVaultSwitcher && (
          <VaultSwitcher
            onVaultSelected={handleVaultSelected}
            onClose={() => setShowVaultSwitcher(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
