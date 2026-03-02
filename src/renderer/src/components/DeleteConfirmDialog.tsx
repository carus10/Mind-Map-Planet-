import React, { useState } from 'react'
import { useMapStore } from '../store/mapStore'
import type { HierarchyNode, VaultHierarchy } from '../types/hierarchy'
import './DeleteConfirmDialog.css'

interface Props {
    node: HierarchyNode
    onClose: () => void
    onRescan: (path: string) => void
}

export function DeleteConfirmDialog({ node, onClose, onRescan }: Props): React.ReactElement {
    const { hierarchy, setError, voronoiPath, voronoiNavigateToIndex } = useMapStore((s) => ({
        hierarchy: s.hierarchy,
        setError: s.setError,
        voronoiPath: s.voronoiPath,
        voronoiNavigateToIndex: s.voronoiNavigateToIndex,
    }))
    const [isDeleting, setIsDeleting] = useState(false)

    const isFolder = node.children !== undefined

    const handleDelete = async (): Promise<void> => {
        if (isDeleting || !hierarchy) return
        setIsDeleting(true)
        try {
            const result = await window.api.deleteNode(node.absolutePath)
            if (result && !result.success) {
                setError(result.error ?? 'Could not delete.')
            } else {
                // If we're inside the deleted folder go back to root
                const deletedInPath = voronoiPath.some(p => p.id === node.id)
                if (deletedInPath) voronoiNavigateToIndex(-1)
                onRescan(hierarchy.vaultPath)
                onClose()
            }
        } catch {
            setError('An error occurred while deleting.')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter') handleDelete()
        if (e.key === 'Escape') onClose()
    }

    return (
        <div className="dialog-overlay delete-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
            <div className="dialog delete-dialog" onClick={e => e.stopPropagation()}>
                <div className="delete-warning-icon" aria-hidden="true">⚠️</div>
                <h3 className="dialog-title delete-title">Delete {isFolder ? 'Folder' : 'Note'}?</h3>
                <p className="delete-body">
                    <strong className="delete-target-name">"{node.name}"</strong>
                    {isFolder
                        ? ' and all its contents will be permanently deleted. This cannot be undone.'
                        : ' will be permanently deleted. This cannot be undone.'
                    }
                </p>
                <div className="dialog-actions">
                    <button className="btn-secondary" onClick={onClose} disabled={isDeleting}>
                        Cancel
                    </button>
                    <button className="btn-danger" onClick={handleDelete} disabled={isDeleting} autoFocus>
                        {isDeleting ? 'Deleting…' : `Delete ${isFolder ? 'Folder' : 'Note'}`}
                    </button>
                </div>
            </div>
        </div>
    )
}
