import React, { useState, useEffect } from 'react'
import { useMapStore } from '../store/mapStore'
import { translations } from '../i18n/translations'
import './VaultSwitcher.css'

interface VaultInfo {
    path: string
    name: string
}

interface Props {
    onVaultSelected: (path: string) => void
    onClose: () => void
}

export function VaultSwitcher({ onVaultSelected, onClose }: Props): React.ReactElement {
    const { language } = useMapStore((s) => ({
        language: s.language
    }))
    const t = translations[language]

    const [vaults, setVaults] = useState<VaultInfo[]>([])
    const [detecting, setDetecting] = useState(true)
    const [selectedVault, setSelectedVault] = useState<string | null>(null)

    useEffect(() => {
        setDetecting(true)
        window.api
            .detectObsidianVaults()
            .then((detected) => {
                setVaults(detected)
            })
            .catch((err) => {
                console.error('Failed to detect vaults:', err)
            })
            .finally(() => {
                setDetecting(false)
            })
    }, [])

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    const handleContinue = (): void => {
        if (selectedVault) {
            onVaultSelected(selectedVault)
            onClose()
        }
    }

    const handleBrowse = async (): Promise<void> => {
        const path = await window.api.selectVault()
        if (path) {
            onVaultSelected(path)
            onClose()
        }
    }

    return (
        <div className="vs-overlay" onClick={onClose}>
            <div className="vs-panel" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="vs-header">
                    <h2 className="vs-title">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 8, verticalAlign: -3 }}>
                            <path d="M1 3.5A1.5 1.5 0 012.5 2h3.879a1.5 1.5 0 011.06.44l1.122 1.12A1.5 1.5 0 009.62 4H13.5A1.5 1.5 0 0115 5.5v7a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9z" />
                        </svg>
                        {t.selectVaultLabel}
                    </h2>
                    <button className="vs-close" onClick={onClose}>✕</button>
                </div>

                {/* Vault list */}
                <div className="vs-body">
                    {detecting ? (
                        <div className="vs-detecting">
                            <div className="vs-spinner" />
                            <span>{t.detectingVaults}</span>
                        </div>
                    ) : vaults.length === 0 ? (
                        <p className="vs-empty">{t.noVaultsFound}</p>
                    ) : (
                        <div className="vs-vault-list">
                            {vaults.map((v) => (
                                <div
                                    key={v.path}
                                    className={`vs-vault-card ${selectedVault === v.path ? 'vs-vault-selected' : ''}`}
                                    onClick={() => setSelectedVault(v.path)}
                                    title={v.path}
                                >
                                    <div className="vs-vault-icon">📦</div>
                                    <div className="vs-vault-info">
                                        <div className="vs-vault-name">{v.name}</div>
                                        <div className="vs-vault-path">{v.path}</div>
                                    </div>
                                    {selectedVault === v.path && (
                                        <div className="vs-vault-check">✓</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="vs-footer">
                    <button className="vs-btn-browse" onClick={handleBrowse}>
                        📂 {t.browseManually}
                    </button>
                    <button
                        className="vs-btn-continue"
                        onClick={handleContinue}
                        disabled={!selectedVault}
                    >
                        {t.continueBtn} →
                    </button>
                </div>
            </div>
        </div>
    )
}
