import React, { useState, useEffect, useRef } from 'react'
import { useMapStore } from '../store/mapStore'
import { translations } from '../i18n/translations'
import type { HierarchyNode } from '../types/hierarchy'
import './CreateFolderDialog.css'

interface Props {
    parentNode: HierarchyNode   // The folder to create inside
    onClose: () => void
    onRescan: (path: string) => void
}

export function CreateFolderDialog({ parentNode, onClose, onRescan }: Props): React.ReactElement {
    const { hierarchy, setError, setSuccessMessage, language } = useMapStore((s) => ({
        hierarchy: s.hierarchy,
        setError: s.setError,
        setSuccessMessage: s.setSuccessMessage,
        language: s.language,
    }))
    const t = translations[language]
    const [folderName, setFolderName] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50)
    }, [])

    const handleConfirm = async (): Promise<void> => {
        const finalName = folderName.trim()
        if (!finalName || isSubmitting || !hierarchy) return
        setIsSubmitting(true)
        try {
            const result = await window.api.createFolder(parentNode.absolutePath, finalName)
            if (result && !result.success) {
                setError(result.error ?? 'Could not create folder.')
            } else {
                setSuccessMessage(`📁 ${t.toastFolderCreated} ${finalName}`)
                onRescan(hierarchy.vaultPath)
                onClose()
            }
        } catch {
            setError('An error occurred while creating the folder.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter') handleConfirm()
        if (e.key === 'Escape') onClose()
    }

    return (
        <div className="dialog-overlay create-folder-overlay" onClick={onClose}>
            <div className="dialog create-folder-dialog" onClick={e => e.stopPropagation()}>
                <div className="folder-icon-wrapper" aria-hidden="true">📁</div>
                <h3 className="dialog-title">New Subfolder</h3>
                <p className="folder-subtitle">
                    Inside <strong className="folder-parent-name">{parentNode.name}</strong>
                </p>

                <div className="form-group">
                    <label>Folder Name</label>
                    <input
                        ref={inputRef}
                        className="dialog-input"
                        value={folderName}
                        onChange={e => setFolderName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g. Chapter 1"
                        disabled={isSubmitting}
                        maxLength={80}
                    />
                </div>

                <div className="dialog-actions">
                    <button className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleConfirm}
                        disabled={!folderName.trim() || isSubmitting}
                    >
                        {isSubmitting ? 'Creating…' : '📁 Create Folder'}
                    </button>
                </div>
            </div>
        </div>
    )
}
