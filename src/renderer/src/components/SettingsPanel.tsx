import React from 'react'
import { useMapStore } from '../store/mapStore'
import { translations } from '../i18n/translations'
import type { Language } from '../i18n/translations'
import './SettingsPanel.css'

interface Props {
  onClose: () => void
}

export function SettingsPanel({ onClose }: Props): React.ReactElement {
  const { language, setLanguage } = useMapStore((s) => ({ language: s.language, setLanguage: s.setLanguage }))
  const t = translations[language]

  const langs: { value: Language; label: string }[] = [
    { value: 'en', label: t.english },
    { value: 'tr', label: t.turkish }
  ]

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>{t.settings}</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="settings-section">
          <label className="settings-label">{t.language}</label>
          <div className="lang-options">
            {langs.map((l) => (
              <button
                key={l.value}
                className={`lang-btn ${language === l.value ? 'active' : ''}`}
                onClick={() => setLanguage(l.value)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-section">
          <label className="settings-label">{t.howToUse}</label>
          <div className="instructions-list">
            <div className="instruction-item"><span>🐁</span> {t.howToNavigate}</div>
            <div className="instruction-item"><span>🖐️</span> {t.howToPan}</div>
            <div className="instruction-item"><span>📜</span> {t.howToZoom}</div>
            <div className="instruction-item"><span>✏️</span> {t.howToRename}</div>
            <div className="instruction-item"><span>🌌</span> {t.howToJump}</div>
            <div className="instruction-item"><span>↩️</span> {t.howToBack}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
