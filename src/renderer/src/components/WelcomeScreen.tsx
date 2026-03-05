import React, { useState, useEffect } from 'react'
import { useMapStore } from '../store/mapStore'
import { translations } from '../i18n/translations'
import './WelcomeScreen.css'

interface VaultInfo {
  path: string
  name: string
}

interface Props {
  onVaultSelected: (path: string) => void
  scanning?: boolean
}

export function WelcomeScreen({ onVaultSelected, scanning }: Props): React.ReactElement {
  const { language, error, setError } = useMapStore((s) => ({
    language: s.language,
    error: s.error,
    setError: s.setError
  }))
  const t = translations[language]

  const [vaults, setVaults] = useState<VaultInfo[]>([])
  const [detecting, setDetecting] = useState(true)
  const [selectedVault, setSelectedVault] = useState<string | null>(null)

  // Detect Obsidian vaults on mount
  useEffect(() => {
    setDetecting(true)
    window.api
      .detectObsidianVaults()
      .then((detected) => {
        setVaults(detected)
        // Auto-select if single vault
        if (detected.length === 1) {
          setSelectedVault(detected[0].path)
        }
      })
      .catch((err) => {
        console.error('Failed to detect vaults:', err)
      })
      .finally(() => {
        setDetecting(false)
      })
  }, [])

  const handleContinue = (): void => {
    if (selectedVault) {
      setError(null)
      onVaultSelected(selectedVault)
    }
  }

  const handleBrowse = async (): Promise<void> => {
    const path = await window.api.selectVault()
    if (path) {
      setError(null)
      onVaultSelected(path)
    }
  }

  // Generate random stars for the background
  const stars = React.useMemo(() => {
    const arr: { x: number; y: number; size: number; delay: number; duration: number }[] = []
    for (let i = 0; i < 80; i++) {
      arr.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 0.5,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 2
      })
    }
    return arr
  }, [])

  return (
    <div className="welcome">
      {/* Animated star field */}
      <div className="welcome-stars">
        {stars.map((s, i) => (
          <div
            key={i}
            className="welcome-star"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`
            }}
          />
        ))}
      </div>

      {/* Nebula glow overlays */}
      <div className="welcome-nebula welcome-nebula-1" />
      <div className="welcome-nebula welcome-nebula-2" />

      <div className="welcome-card">
        {/* Planet icon */}
        <div className="welcome-planet">
          <div className="welcome-planet-ring" />
          <div className="welcome-planet-body">🪐</div>
        </div>

        <h1 className="welcome-title">Mind Map Planet</h1>
        <p className="welcome-subtitle">{t.welcomeSubtitle}</p>

        <div className="welcome-divider" />

        {/* Content depending on state */}
        {detecting ? (
          <div className="welcome-detecting">
            <div className="welcome-spinner" />
            <span>{t.detectingVaults}</span>
          </div>
        ) : vaults.length === 0 ? (
          /* No vaults found */
          <div className="welcome-no-vaults">
            <p className="welcome-no-vaults-text">{t.noVaultsFound}</p>
            {scanning ? (
              <button className="btn-primary" disabled>
                <div className="welcome-spinner welcome-spinner-sm" />
              </button>
            ) : (
              <button className="btn-primary btn-browse" onClick={handleBrowse}>
                <span className="btn-icon">📂</span>
                {t.browseManually}
              </button>
            )}
          </div>
        ) : vaults.length === 1 ? (
          /* Single vault — direct continue */
          <div className="welcome-single-vault">
            <div
              className="vault-card vault-card-selected"
              title={vaults[0].path}
            >
              <div className="vault-card-icon">📦</div>
              <div className="vault-card-info">
                <div className="vault-card-name">{vaults[0].name}</div>
                <div className="vault-card-path">{vaults[0].path}</div>
              </div>
              <div className="vault-card-check">✓</div>
            </div>
            {scanning ? (
              <button className="btn-primary btn-continue" disabled>
                <div className="welcome-spinner welcome-spinner-sm" />
              </button>
            ) : (
              <button className="btn-primary btn-continue" onClick={handleContinue}>
                {t.continueBtn} →
              </button>
            )}
            <button className="btn-ghost" onClick={handleBrowse}>
              {t.browseManually}
            </button>
          </div>
        ) : (
          /* Multiple vaults — selection list */
          <div className="welcome-multi-vault">
            <p className="welcome-vault-label">
              {t.selectVaultLabel}
              <span className="welcome-vault-count">
                {vaults.length} {vaults.length === 1 ? t.vaultCount : t.vaultCountPlural}
              </span>
            </p>
            <div className="vault-list">
              {vaults.map((v) => (
                <div
                  key={v.path}
                  className={`vault-card ${selectedVault === v.path ? 'vault-card-selected' : ''}`}
                  onClick={() => setSelectedVault(v.path)}
                  title={v.path}
                >
                  <div className="vault-card-icon">📦</div>
                  <div className="vault-card-info">
                    <div className="vault-card-name">{v.name}</div>
                    <div className="vault-card-path">{v.path}</div>
                  </div>
                  {selectedVault === v.path && (
                    <div className="vault-card-check">✓</div>
                  )}
                </div>
              ))}
            </div>
            {scanning ? (
              <button className="btn-primary btn-continue" disabled>
                <div className="welcome-spinner welcome-spinner-sm" />
              </button>
            ) : (
              <button
                className="btn-primary btn-continue"
                onClick={handleContinue}
                disabled={!selectedVault}
              >
                {t.continueBtn} →
              </button>
            )}
            <button className="btn-ghost" onClick={handleBrowse}>
              {t.browseManually}
            </button>
          </div>
        )}

        {error && <p className="welcome-error">{error}</p>}
      </div>
    </div>
  )
}
