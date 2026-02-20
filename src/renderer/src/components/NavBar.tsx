import React from 'react'
import { useMapStore } from '../store/mapStore'
import { translations } from '../i18n/translations'
import './NavBar.css'

interface Props {
  onSettings: () => void
  onChangeVault: () => void
  onCreateNote: () => void
}

export function NavBar({ onSettings, onChangeVault, onCreateNote }: Props): React.ReactElement {
  const { hierarchy, language, voronoiPath, voronoiGoBack, voronoiNavigateToIndex } = useMapStore((s) => ({
    hierarchy: s.hierarchy,
    language: s.language,
    voronoiPath: s.voronoiPath,
    voronoiGoBack: s.voronoiGoBack,
    voronoiNavigateToIndex: s.voronoiNavigateToIndex,
  }))
  const t = translations[language]

  // Voronoi breadcrumb: root (vault) + her path seviyesi
  const crumbs: { label: string; index: number }[] = [
    { label: '🗺️ ' + (hierarchy?.vaultName || t.world), index: -1 },
  ]
  for (let i = 0; i < voronoiPath.length; i++) {
    crumbs.push({ label: voronoiPath[i].name, index: i })
  }

  return (
    <div className="navbar">
      <div className="navbar-left">
        {voronoiPath.length > 0 && (
          <button className="btn-back" onClick={voronoiGoBack}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <nav className="breadcrumb">
          {crumbs.map((c, i) => (
            <span key={i} className="crumb-item">
              {i > 0 && <span className="crumb-sep">/</span>}
              <button
                className={`crumb-btn ${i === crumbs.length - 1 ? 'crumb-active' : 'crumb-parent'}`}
                onClick={() => voronoiNavigateToIndex(c.index)}
              >
                {c.label}
                {i === 0 && hierarchy && (
                  <span className="crumb-count">{hierarchy.countries.length}</span>
                )}
                {i > 0 && voronoiPath[c.index] && voronoiPath[c.index].children && voronoiPath[c.index].children.length > 0 && (
                  <span className="crumb-count">{voronoiPath[c.index].children.length}</span>
                )}
              </button>
            </span>
          ))}
        </nav>
      </div>
      <div className="navbar-right">
        {hierarchy && (
          <button className="vault-name clickable" onClick={onChangeVault} title="Kasayı Değiştir">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 4, verticalAlign: -2 }}>
              <path d="M1 3.5A1.5 1.5 0 012.5 2h3.879a1.5 1.5 0 011.06.44l1.122 1.12A1.5 1.5 0 009.62 4H13.5A1.5 1.5 0 0115 5.5v7a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9z" />
            </svg>
            {hierarchy.vaultName}
          </button>
        )}
        <button className="btn-icon" onClick={onCreateNote} title="New Note" style={{ marginRight: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button className="btn-icon" onClick={onSettings} title={t.settings}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}
