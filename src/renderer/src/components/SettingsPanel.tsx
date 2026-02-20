import React, { useState } from 'react'
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
  const [activeTab, setActiveTab] = useState<'general' | 'guide'>('general')

  const langs: { value: Language; label: string }[] = [
    { value: 'en', label: t.english },
    { value: 'tr', label: t.turkish }
  ]

  return (
    <div className={`settings-overlay ${activeTab === 'guide' ? 'guide-mode-overlay' : ''}`} onClick={onClose}>
      <div className={`settings-panel ${activeTab === 'guide' ? 'guide-mode' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>{t.settings}</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            {t.tabGeneral}
          </button>
          <button
            className={`tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => setActiveTab('guide')}
          >
            {t.tabGuide}
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'general' && (
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
          )}

          {activeTab === 'guide' && (
            <div className="settings-section guide-section">
              <p className="guide-intro">{t.guideIntro}</p>

              <div className="guide-block">
                <h3>{t.guideNavigation}</h3>
                <p>{t.guideNavigationDesc}</p>
                <div className="instructions-list compact">
                  <div className="instruction-item"><span>🐁</span> {t.howToNavigate}</div>
                  <div className="instruction-item"><span>🖐️</span> {t.howToPan}</div>
                  <div className="instruction-item"><span>📜</span> {t.howToZoom}</div>
                </div>
              </div>

              <div className="guide-block">
                <h3>{t.guideInteraction}</h3>
                <p>{t.guideInteractionDesc}</p>
                <div className="instructions-list compact">
                  <div className="instruction-item"><span>✏️</span> {t.howToRename}</div>
                  <div className="instruction-item"><span>↩️</span> {t.howToBack}</div>
                </div>
              </div>

              <div className="guide-block">
                <h3>{t.guideSearch}</h3>
                <p>{t.guideSearchDesc}</p>
              </div>

              <div className="guide-block">
                <h3>{t.guideQuickNotes}</h3>
                <p>{t.guideQuickNotesDesc}</p>
              </div>

              <div className="guide-block">
                <h3>{t.guideDragDrop}</h3>
                <p>{t.guideDragDropDesc}</p>
              </div>

              <div className="guide-block">
                <h3>{t.guideTradeRoutes}</h3>
                <p>{t.guideTradeRoutesDesc}</p>
                <div className="instructions-list compact">
                  <div className="instruction-item"><span>🌌</span> {t.howToJump}</div>
                </div>
              </div>

              <div className="guide-block">
                <h3>{t.guideReturn}</h3>
                <p>{t.guideReturnDesc}</p>
                <div className="instructions-list compact">
                  <div className="instruction-item"><span>↩️</span> {t.howToBack}</div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
