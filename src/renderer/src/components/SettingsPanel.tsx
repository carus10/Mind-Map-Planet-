import React, { useState } from 'react'
import { useMapStore } from '../store/mapStore'
import { translations } from '../i18n/translations'
import type { Language } from '../i18n/translations'
import './SettingsPanel.css'

interface Props {
  onClose: () => void
}

export function SettingsPanel({ onClose }: Props): React.ReactElement {
  const { language, setLanguage, backgroundTheme, setBackgroundTheme } = useMapStore((s) => ({
    language: s.language,
    setLanguage: s.setLanguage,
    backgroundTheme: s.backgroundTheme,
    setBackgroundTheme: s.setBackgroundTheme,
  }))
  const setSuccessMessage = useMapStore((s) => s.setSuccessMessage)
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

              <div style={{ marginTop: '2rem' }}>
                <label className="settings-label">{t.bgTheme}</label>
                <div className="theme-options" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { val: 'default', label: t.bgDefault },
                    { val: 'galaxy', label: t.bgGalaxy },
                    { val: 'meteors', label: t.bgMeteors },
                    { val: 'constellation', label: t.bgConstellation },
                    { val: 'supernova', label: t.bgSupernova }
                  ].map((th) => (
                    <button
                      key={th.val}
                      className={`lang-btn ${backgroundTheme === th.val ? 'active' : ''}`}
                      onClick={() => {
                        setBackgroundTheme(th.val as any)
                        setSuccessMessage(`🎨 ${t.toastTheme} ${th.label}`)
                      }}
                      style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>{th.label}</span>
                      {backgroundTheme === th.val && <span style={{ color: '#88aaff' }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <label className="settings-label">{t.randomizePlanetsBtn}</label>
                <p style={{ fontSize: '0.8rem', color: '#ffb300', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                  {t.randomizePlanetsDesc}
                </p>
                <button
                  className="lang-btn"
                  onClick={() => {
                    useMapStore.getState().randomizeAllAppearances()
                    setSuccessMessage(`🎲 ${t.toastAllRandomized}`)
                    onClose()
                  }}
                  style={{ width: '100%', borderColor: '#ffb300', color: '#ffb300' }}
                >
                  {t.randomizePlanetsBtn}
                </button>
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
