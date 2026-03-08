import React, { useEffect } from 'react'
import { useMapStore } from '../store/mapStore'
import { translations } from '../i18n/translations'
import './NoteActionDialog.css'

interface Props {
    noteName: string
    onClose: () => void
    onOpenObsidian: () => void
    onOpenApp: () => void
    onOpenLearnEngine: () => void
}

export function NoteActionDialog({ noteName, onClose, onOpenObsidian, onOpenApp, onOpenLearnEngine }: Props): React.ReactElement {
    const { language } = useMapStore(s => ({ language: s.language }))
    const t = translations[language]

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    return (
        <div className="dialog-overlay note-action-overlay" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}>
            <div className="dialog note-action-dialog" onClick={(e) => e.stopPropagation()}>
                <button className="dialog-close-btn" onClick={onClose} aria-label="Close" title={t.closeBtn}>
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <div className="note-action-icon">📝</div>
                <h3 className="dialog-title">{noteName}</h3>

                <div className="note-action-buttons">
                    <button className="btn-secondary" onClick={onOpenObsidian}>
                        <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: '8px' }} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        {t.openInObsidian}
                    </button>
                    <button className="btn-primary" onClick={onOpenApp}>
                        <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: '8px' }} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        {t.actionOpenApp}
                    </button>
                    <button className="btn-learn-engine" onClick={onOpenLearnEngine}>
                        <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: '8px' }} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                        {t.actionLearnEngine}
                    </button>
                </div>
            </div>
        </div>
    )
}
