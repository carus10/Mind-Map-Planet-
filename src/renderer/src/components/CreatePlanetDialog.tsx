import React, { useState, useEffect, useRef } from 'react'
import { useMapStore } from '../store/mapStore'
import { translations } from '../i18n/translations'
import './CreatePlanetDialog.css'

interface Props {
    onClose: () => void
    onRescan: (path: string) => void
}

export function CreatePlanetDialog({ onClose, onRescan }: Props): React.ReactElement {
    const { hierarchy, setError, setSuccessMessage, language } = useMapStore((s) => ({
        hierarchy: s.hierarchy,
        setError: s.setError,
        setSuccessMessage: s.setSuccessMessage,
        language: s.language,
    }))
    const t = translations[language]

    const [planetName, setPlanetName] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50)
    }, [])

    const handleConfirm = async (): Promise<void> => {
        const finalName = planetName.trim()
        if (!finalName || isSubmitting || !hierarchy) return

        setIsSubmitting(true)
        try {
            const result = await window.api.createFolder(hierarchy.vaultPath, finalName)
            if (result && !result.success) {
                setError(result.error ?? 'Could not create planet.')
            } else {
                setSuccessMessage(`🪐 ${t.toastPlanetCreated} ${finalName}`)
                onRescan(hierarchy.vaultPath)
                onClose()
            }
        } catch {
            setError('An error occurred while creating the planet.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter') handleConfirm()
        if (e.key === 'Escape') onClose()
    }

    return (
        <div className="dialog-overlay create-planet-overlay" onClick={onClose}>
            <div className="dialog create-planet-dialog" onClick={(e) => e.stopPropagation()}>
                {/* Decorative planet */}
                <div className="planet-icon-wrapper" aria-hidden="true">
                    <div className="planet-sphere">
                        <div className="planet-ring" />
                    </div>
                </div>

                <h3 className="dialog-title">Create New Planet</h3>
                <p className="planet-subtitle">A new top-level world in your vault</p>

                <div className="form-group">
                    <label>Planet Name</label>
                    <input
                        ref={inputRef}
                        className="dialog-input planet-input"
                        value={planetName}
                        onChange={(e) => setPlanetName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g. Deep Space Archives"
                        disabled={isSubmitting}
                        maxLength={80}
                    />
                </div>

                <div className="dialog-actions">
                    <button className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button
                        className="btn-primary btn-planet"
                        onClick={handleConfirm}
                        disabled={!planetName.trim() || isSubmitting}
                    >
                        {isSubmitting ? 'Creating…' : '🪐 Create Planet'}
                    </button>
                </div>
            </div>
        </div>
    )
}
