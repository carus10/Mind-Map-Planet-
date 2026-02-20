import React from 'react'
import { useMapStore } from '../store/mapStore'
import { translations } from '../i18n/translations'
import './WelcomeScreen.css'

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

  const handleBrowse = async (): Promise<void> => {
    const path = await window.api.selectVault()
    if (path) {
      setError(null)
      onVaultSelected(path)
    }
  }

  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-icon">🗺️</div>
        <h1 className="welcome-title">Mind Map Planet</h1>
        <p className="welcome-desc">{t.selectVaultDesc}</p>
        {scanning ? (
          <button className="btn-primary" disabled>Scanning...</button>
        ) : (
          <button className="btn-primary" onClick={handleBrowse}>{t.browse}</button>
        )}
        {error && <p className="welcome-error">{error}</p>}
      </div>
    </div>
  )
}
