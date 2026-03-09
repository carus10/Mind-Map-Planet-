import React, { useState, useEffect, useRef } from 'react'

// Error catcher for debugging black screens — reuses a single overlay
const getOrCreateErrorOverlay = (): HTMLDivElement => {
  let div = document.getElementById('__fatal_error_overlay') as HTMLDivElement | null;
  if (!div) {
    div = document.createElement('div');
    div.id = '__fatal_error_overlay';
    div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(20,0,0,0.9);color:#ff8a80;z-index:999999;font-family:monospace;padding:2rem;overflow:auto;white-space:pre-wrap;';
    document.body.appendChild(div);
  }
  return div;
};

window.addEventListener('error', (event) => {
  const div = getOrCreateErrorOverlay();
  div.innerHTML = `<h1>Fatal Error</h1><p>${event.error?.message}</p><pre>${event.error?.stack}</pre>`;
});

window.addEventListener('unhandledrejection', (event) => {
  const div = getOrCreateErrorOverlay();
  div.innerHTML = `<h1>Unhandled Promise Rejection</h1><p>${event.reason}</p><pre>${event.reason?.stack}</pre>`;
});
import { useMapStore } from './store/mapStore'
import { WelcomeScreen } from './components/WelcomeScreen'
import { VaultSwitcher } from './components/VaultSwitcher'
import { VoronoiMap } from './components/VoronoiMap'
import { NavBar } from './components/NavBar'
import { RenameDialog } from './components/RenameDialog'
import { ErrorToast } from './components/ErrorToast'
import { SuccessToast } from './components/SuccessToast'
import { SettingsPanel } from './components/SettingsPanel'
import { CreateNoteDialog } from './components/CreateNoteDialog'
import { CreatePlanetDialog } from './components/CreatePlanetDialog'
import { CreateFolderDialog } from './components/CreateFolderDialog'
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog'
import { NodeContextMenu } from './components/NodeContextMenu'
import { PlanetAppearanceDialog } from './components/PlanetAppearanceDialog'
import { OmniSearch } from './components/OmniSearch'
import { CargoHold } from './components/CargoHold'
import { UserGuideModal } from './components/UserGuideModal'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NoteActionDialog } from './components/NoteActionDialog'
import { NoteEditor } from './components/NoteEditor'
import { LearnEngineModal } from './components/LearnEngineModal'
import { NoteTagDialog } from './components/NoteTagDialog'
import { buildObsidianUrl } from './utils/obsidianUrl'
import type { VaultHierarchy } from './types/hierarchy'
import './index.css'

export function App(): React.ReactElement {
  const { hierarchy, setHierarchy, setError, contextMenuTarget, setContextMenuTarget, setRenameTarget, backgroundTheme, actionNoteTarget, setActionNoteTarget, editingNoteTarget, setEditingNoteTarget, learnEngineTarget, isLearnEngineOpen, setLearnEngineTarget, setIsLearnEngineOpen, tagNodeTarget, setTagNodeTarget } = useMapStore((s) => ({
    hierarchy: s.hierarchy,
    setHierarchy: s.setHierarchy,
    setError: s.setError,
    contextMenuTarget: s.contextMenuTarget,
    setContextMenuTarget: s.setContextMenuTarget,
    setRenameTarget: s.setRenameTarget,
    backgroundTheme: s.backgroundTheme,
    actionNoteTarget: s.actionNoteTarget,
    setActionNoteTarget: s.setActionNoteTarget,
    editingNoteTarget: s.editingNoteTarget,
    setEditingNoteTarget: s.setEditingNoteTarget,
    learnEngineTarget: s.learnEngineTarget,
    isLearnEngineOpen: s.isLearnEngineOpen,
    setLearnEngineTarget: s.setLearnEngineTarget,
    setIsLearnEngineOpen: s.setIsLearnEngineOpen,
    tagNodeTarget: s.tagNodeTarget,
    setTagNodeTarget: s.setTagNodeTarget,
  }))
  const [showSettings, setShowSettings] = useState(false)
  const [showCreateNote, setShowCreateNote] = useState(false)
  const [showCreatePlanet, setShowCreatePlanet] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showOmniSearch, setShowOmniSearch] = useState(false)
  const [showAppearance, setShowAppearance] = useState(false)
  const [showVaultSwitcher, setShowVaultSwitcher] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      // Skip if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'k':
            e.preventDefault()
            setShowOmniSearch(true)
            break
          case 'n':
            e.preventDefault()
            setShowCreateNote(true)
            break
          case 'p':
            e.preventDefault()
            setShowCreatePlanet(true)
            break
          case ',':
            e.preventDefault()
            setShowSettings(true)
            break
          case 'h':
            e.preventDefault()
            setShowGuide(true)
            break
        }
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
      <div className={`app theme-${backgroundTheme}`}>
        {backgroundTheme === 'meteors' && (
          <div className="meteor-container">
            <div className="meteor"></div>
            <div className="meteor"></div>
            <div className="meteor"></div>
            <div className="meteor"></div>
            <div className="meteor"></div>
            <div className="meteor"></div>
            <div className="meteor"></div>
            <div className="meteor"></div>
            <div className="meteor"></div>
            <div className="meteor"></div>
          </div>
        )}
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
              onGuide={() => setShowGuide(true)}
            />
            <div className="canvas-container">
              <VoronoiMap hierarchy={hierarchy} />
            </div>
          </>
        )}
        <RenameDialog />
        <ErrorToast />
        <SuccessToast />
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
            onTag={contextMenuTarget.node.type === 'home' ? () => setTagNodeTarget(contextMenuTarget.node) : undefined}
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
        {showGuide && <UserGuideModal onClose={() => setShowGuide(false)} />}
        {showVaultSwitcher && (
          <VaultSwitcher
            onVaultSelected={handleVaultSelected}
            onClose={() => setShowVaultSwitcher(false)}
          />
        )}
        {actionNoteTarget && hierarchy && (
          <NoteActionDialog
            noteName={actionNoteTarget.name}
            onClose={() => setActionNoteTarget(null)}
            onOpenObsidian={() => {
              const url = buildObsidianUrl(hierarchy.vaultName, actionNoteTarget.relativePath)
              window.api.openObsidian(url).catch(() => setError('Could not open Obsidian.'))
              setActionNoteTarget(null)
            }}
            onOpenApp={() => {
              setEditingNoteTarget(actionNoteTarget)
              setActionNoteTarget(null)
            }}
            onOpenLearnEngine={() => {
              setLearnEngineTarget(actionNoteTarget)
              setIsLearnEngineOpen(true)
              setActionNoteTarget(null)
            }}
          />
        )}
        {editingNoteTarget && (
          <NoteEditor
            filePath={editingNoteTarget.absolutePath}
            noteName={editingNoteTarget.name}
            onClose={() => setEditingNoteTarget(null)}
          />
        )}
        {isLearnEngineOpen && learnEngineTarget && (
          <LearnEngineModal
            noteNode={learnEngineTarget}
            onClose={() => {
              setIsLearnEngineOpen(false)
              setLearnEngineTarget(null)
            }}
          />
        )}
        {tagNodeTarget && (
          <NoteTagDialog
            node={tagNodeTarget}
            onClose={() => setTagNodeTarget(null)}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
