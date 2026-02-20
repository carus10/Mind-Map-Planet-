import React, { useState, useEffect, useRef } from 'react'
import { useMapStore } from '../store/mapStore'
import { translations } from '../i18n/translations'
import type { VaultHierarchy } from '../types/hierarchy'
import './RenameDialog.css'

export function RenameDialog(): React.ReactElement | null {
  const { renameTarget, setRenameTarget, setError, setHierarchy, hierarchy, language } = useMapStore((s) => ({
    renameTarget: s.renameTarget,
    setRenameTarget: s.setRenameTarget,
    setError: s.setError,
    setHierarchy: s.setHierarchy,
    hierarchy: s.hierarchy,
    language: s.language
  }))
  const t = translations[language]
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renameTarget) {
      setValue(renameTarget.name)
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [renameTarget])

  if (!renameTarget) return null

  const handleConfirm = async (): Promise<void> => {
    const newName = value.trim()
    if (!newName || newName === renameTarget.name) {
      setRenameTarget(null)
      return
    }
    try {
      const result = await window.api.renameFile(renameTarget.absolutePath, newName)
      if (result && !result.success) {
        setError(result.error ?? t.renameError)
      } else {
        // Rescan vault to reflect changes
        if (hierarchy) {
          const updated = await window.api.scanVault(hierarchy.vaultPath)
          if (updated) setHierarchy(updated as VaultHierarchy)
        }
      }
      setRenameTarget(null)
    } catch {
      setError(t.renameError)
      setRenameTarget(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') setRenameTarget(null)
  }

  return (
    <div className="dialog-overlay" onClick={() => setRenameTarget(null)}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">{t.rename}</h3>
        <input
          ref={inputRef}
          className="dialog-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <div className="dialog-actions">
          <button className="btn-secondary" onClick={() => setRenameTarget(null)}>Cancel</button>
          <button className="btn-primary" onClick={handleConfirm}>OK</button>
        </div>
      </div>
    </div>
  )
}
