import React from 'react'
import { useMapStore } from '../store/mapStore'
import type { HierarchyNode } from '../types/hierarchy'
import { translations } from '../i18n/translations'
import './NodeContextMenu.css'

interface Props {
    node: HierarchyNode
    x: number
    y: number
    onClose: () => void
    onRename: () => void
    onDelete: () => void
    onCreateFolder: () => void
    onAppearance?: () => void
    isPlanet?: boolean
}

export function NodeContextMenu({ node, x, y, onClose, onRename, onDelete, onCreateFolder, onAppearance, isPlanet }: Props): React.ReactElement {
    const isFolder = node.type !== 'home'
    const language = useMapStore(s => s.language)
    const t = translations[language]

    // Clamp so menu never goes offscreen
    const clampedX = Math.min(x, window.innerWidth - 220)
    const clampedY = Math.min(y, window.innerHeight - 200)

    return (
        <>
            {/* Invisible backdrop to close menu on click outside */}
            <div className="ctx-backdrop" onClick={onClose} />
            <div
                className="ctx-menu"
                style={{ left: clampedX, top: clampedY }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="ctx-header">
                    <span className="ctx-icon">{isPlanet ? '🪐' : isFolder ? '📁' : '📄'}</span>
                    <span className="ctx-name" title={node.name}>{node.name}</span>
                </div>
                <div className="ctx-divider" />

                {/* Görünüm — sadece gezegenlerde görünür */}
                {isPlanet && onAppearance && (
                    <>
                        <button className="ctx-item ctx-item-appearance" onClick={onAppearance}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="4" />
                                <line x1="12" y1="2" x2="12" y2="6" />
                                <line x1="12" y1="18" x2="12" y2="22" />
                                <line x1="2" y1="12" x2="6" y2="12" />
                                <line x1="18" y1="12" x2="22" y2="12" />
                            </svg>
                            {t.contextMenuAppearance}
                        </button>
                        <div className="ctx-divider" />
                    </>
                )}

                <button className="ctx-item" onClick={() => { onRename(); onClose() }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    {t.contextMenuRename}
                </button>
                {isFolder && (
                    <button className="ctx-item" onClick={onCreateFolder}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>
                        {t.contextMenuNewFolder}
                    </button>
                )}
                <div className="ctx-divider" />
                <button className="ctx-item ctx-item-danger" onClick={onDelete}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
                    {t.contextMenuDelete}
                </button>
            </div>
        </>
    )
}

export { }
