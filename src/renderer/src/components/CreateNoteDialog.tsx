import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useMapStore } from '../store/mapStore'
import { translations } from '../i18n/translations'
import type { VaultHierarchy, HierarchyNode } from '../types/hierarchy'
import './CreateNoteDialog.css'

interface Props {
    onClose: () => void
    onRescan: (path: string) => void
}

export function CreateNoteDialog({ onClose, onRescan }: Props): React.ReactElement {
    const { hierarchy, language, setError } = useMapStore((s) => ({
        hierarchy: s.hierarchy,
        language: s.language,
        setError: s.setError
    }))
    const t = translations[language]

    const [noteName, setNoteName] = useState('')
    const [selectedFolderId, setSelectedFolderId] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // Flatten all folders for the dropdown
    const allFolders = useMemo(() => {
        if (!hierarchy) return []
        const folders: { id: string; name: string; path: string; depth: number }[] = []

        const traverse = (node: HierarchyNode, depth: number, accPath: string) => {
            // If it has children, it's a folder (or if it's a top-level planet)
            if (node.children || depth === 0) {
                folders.push({
                    id: node.id,
                    name: node.name,
                    path: node.absolutePath,
                    depth
                })
                if (node.children) {
                    node.children.forEach(c => traverse(c, depth + 1, `${accPath}/${c.name}`))
                }
            }
        }

        // Add root (the Vault itself) as a fallback
        folders.push({
            id: 'root',
            name: hierarchy.vaultName || 'Root',
            path: hierarchy.vaultPath,
            depth: 0
        })

        hierarchy.countries.forEach(c => traverse(c, 0, c.name))
        return folders
    }, [hierarchy])

    useEffect(() => {
        if (allFolders.length > 0 && !selectedFolderId) {
            setSelectedFolderId(allFolders[0].id)
        }
        setTimeout(() => inputRef.current?.focus(), 50)
    }, [allFolders, selectedFolderId])

    const handleConfirm = async (): Promise<void> => {
        const finalName = noteName.trim()
        if (!finalName || !selectedFolderId || isSubmitting || !hierarchy) return

        const folder = allFolders.find(f => f.id === selectedFolderId)
        if (!folder) return

        setIsSubmitting(true)
        try {
            const result = await window.api.createNote(folder.path, finalName)
            if (result && !result.success) {
                setError(result.error ?? 'Could not create note.')
            } else {
                // Force rescan instantly
                onRescan(hierarchy.vaultPath)

                // Open the newly created note in Obsidian
                // Obsidian URI format requires vault name and relative path inside the vault.
                // folder.name is NOT sufficient for path because it's just the basename.
                // We need to calculate the relative path from the absolute path.
                const relativeFolderPath = folder.path.replace(hierarchy.vaultPath, '').replace(/^\\|^\//, '')
                const relativeFilePath = relativeFolderPath ? `${relativeFolderPath}/${finalName}` : finalName
                const encodedPath = encodeURIComponent(relativeFilePath.replace(/\\/g, '/'))
                const fileUrl = `obsidian://open?vault=${encodeURIComponent(hierarchy.vaultName)}&file=${encodedPath}`
                window.api.openObsidian(fileUrl)

                onClose()
            }
        } catch {
            setError('An error occurred while creating the note.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter') handleConfirm()
        if (e.key === 'Escape') onClose()
    }

    return (
        <div className="dialog-overlay create-note-overlay" onClick={onClose}>
            <div className="dialog create-note-dialog" onClick={(e) => e.stopPropagation()}>
                <h3 className="dialog-title">Quick Add Note</h3>

                <div className="form-group">
                    <label>Note Name</label>
                    <input
                        ref={inputRef}
                        className="dialog-input"
                        value={noteName}
                        onChange={(e) => setNoteName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g. Captain's Log"
                        disabled={isSubmitting}
                    />
                </div>

                <div className="form-group">
                    <label>Destination Folder</label>
                    <select
                        className="dialog-select"
                        value={selectedFolderId}
                        onChange={e => setSelectedFolderId(e.target.value)}
                        disabled={isSubmitting}
                    >
                        {allFolders.map(f => (
                            <option key={f.id} value={f.id}>
                                {'\u00A0'.repeat(f.depth * 4)}{f.depth > 0 ? '↳ ' : ''}{f.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="dialog-actions">
                    <button className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                    <button className="btn-primary" onClick={handleConfirm} disabled={!noteName.trim() || isSubmitting}>
                        {isSubmitting ? 'Creating...' : 'Create & Open'}
                    </button>
                </div>
            </div>
        </div>
    )
}
