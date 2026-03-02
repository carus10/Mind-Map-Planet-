import React, { useState, useRef, useCallback } from 'react'
import { useMapStore } from '../store/mapStore'
import { PLANET_APPEARANCES, getAppearance } from '../utils/planetAppearances'
import type { HierarchyNode } from '../types/hierarchy'
import './PlanetAppearanceDialog.css'

interface Props {
    planet: HierarchyNode
    onClose: () => void
}

/* ── Mini SVG Planet Preview ──────────────────────────────── */

function MiniPlanetPreview({ appearanceKey, size = 54 }: { appearanceKey: string; size?: number }): React.ReactElement {
    const app = getAppearance(appearanceKey)
    const cx = size / 2
    const cy = size / 2
    const r = size * 0.38
    const id = `prev-${appearanceKey}-${size}`

    if (app.type === 'custom') {
        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={cx} cy={cy} r={r} fill="#2a3050" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.28} fill="rgba(255,255,255,0.6)">🖼️</text>
            </svg>
        )
    }

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
            <defs>
                <radialGradient id={`${id}-surf`} cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stopColor={app.colorCenter} stopOpacity="1" />
                    <stop offset="60%" stopColor={app.colorCenter} stopOpacity="0.85" />
                    <stop offset="100%" stopColor={app.colorEdge} stopOpacity="1" />
                </radialGradient>
                <radialGradient id={`${id}-atmo`} cx="50%" cy="50%" r="50%">
                    <stop offset="75%" stopColor="transparent" />
                    <stop offset="90%" stopColor={app.glowColor} />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <clipPath id={`${id}-clip`}>
                    <circle cx={cx} cy={cy} r={r} />
                </clipPath>
                <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
                </filter>
            </defs>

            {/* Glow */}
            <circle cx={cx} cy={cy} r={r + 3} fill={app.glowColor} filter={`url(#${id}-glow)`} />

            {/* Saturn ring behind */}
            {app.hasRing && app.key === 'saturn' && (
                <ellipse cx={cx} cy={cy + r * 0.1} rx={r * 1.7} ry={r * 0.35}
                    fill="none" stroke={app.ringColor ?? 'rgba(210,180,100,0.4)'} strokeWidth={r * 0.25}
                    style={{ opacity: 0.6 }}
                />
            )}

            {/* Planet surface */}
            <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-surf)`} />

            {/* Bands (Jupiter style) */}
            {app.bands && (
                <g clipPath={`url(#${id}-clip)`}>
                    {app.bands.slice(0, 5).map((band, bi) => {
                        const bandH = (r * 2) / (app.bands!.length)
                        const yy = cy - r + bi * bandH
                        return (
                            <rect key={bi} x={cx - r} y={yy} width={r * 2} height={bandH}
                                fill={band} opacity={0.4 + (bi % 2) * 0.15} />
                        )
                    })}
                </g>
            )}

            {/* Earth continents */}
            {app.key === 'earth' && app.featureColor && (
                <g clipPath={`url(#${id}-clip)`} opacity={0.65}>
                    <ellipse cx={cx - r * 0.15} cy={cy - r * 0.1} rx={r * 0.22} ry={r * 0.3} fill={app.featureColor} />
                    <ellipse cx={cx + r * 0.2} cy={cy + r * 0.15} rx={r * 0.28} ry={r * 0.2} fill={app.featureColor} />
                    <ellipse cx={cx - r * 0.3} cy={cy + r * 0.3} rx={r * 0.15} ry={r * 0.12} fill={app.featureColor} />
                </g>
            )}

            {/* Mars dark patches */}
            {app.key === 'mars' && app.featureColor && (
                <g clipPath={`url(#${id}-clip)`} opacity={0.5}>
                    <ellipse cx={cx + r * 0.1} cy={cy - r * 0.2} rx={r * 0.25} ry={r * 0.18} fill={app.featureColor} />
                    <ellipse cx={cx - r * 0.25} cy={cy + r * 0.2} rx={r * 0.18} ry={r * 0.14} fill={app.featureColor} />
                </g>
            )}

            {/* Craters */}
            {app.hasCraters && (
                <g clipPath={`url(#${id}-clip)`} opacity={0.4}>
                    {[
                        [cx - r * 0.3, cy - r * 0.2, r * 0.1],
                        [cx + r * 0.2, cy + r * 0.3, r * 0.08],
                        [cx + r * 0.35, cy - r * 0.1, r * 0.06],
                        [cx - r * 0.1, cy + r * 0.1, r * 0.07],
                    ].map(([px, py, pr], ci) => (
                        <circle key={ci} cx={px} cy={py} r={pr}
                            fill="none" stroke={app.colorEdge} strokeWidth={1.5} />
                    ))}
                </g>
            )}

            {/* Polar cap */}
            {app.hasPolarCap && app.polarCapColor && (
                <g clipPath={`url(#${id}-clip)`}>
                    <ellipse cx={cx} cy={cy - r * 0.82} rx={r * 0.42} ry={r * 0.18} fill={app.polarCapColor} />
                </g>
            )}

            {/* Uranus ring */}
            {app.hasRing && app.key === 'uranus' && (
                <ellipse cx={cx} cy={cy} rx={r * 1.5} ry={r * 0.25}
                    fill="none" stroke={app.ringColor ?? 'rgba(140,230,240,0.3)'} strokeWidth={r * 0.18}
                    opacity={0.5}
                />
            )}

            {/* Atmosphere overlay */}
            <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-atmo)`} pointerEvents="none" />

            {/* Highlight */}
            <circle cx={cx - r * 0.25} cy={cy - r * 0.25} r={r * 0.2}
                fill="rgba(255,255,255,0.08)" pointerEvents="none" />
        </svg>
    )
}

/* ── Main Dialog ──────────────────────────────────────────── */

export function PlanetAppearanceDialog({ planet, onClose }: Props): React.ReactElement {
    const planetAppearances = useMapStore(s => s.planetAppearances)
    const setPlanetAppearance = useMapStore(s => s.setPlanetAppearance)
    const setCustomPlanetImage = useMapStore(s => s.setCustomPlanetImage)

    const currentKey = planetAppearances[planet.id] ?? 'earth'
    const [selectedKey, setSelectedKey] = useState(currentKey)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const allOptions = [
        ...PLANET_APPEARANCES,
        { key: 'custom', name: 'Özel Görsel', emoji: '🖼️', description: 'Kendi görselinizi yükleyin' },
    ]

    const handleCustomFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string
            if (dataUrl) {
                setCustomPlanetImage(planet.id, dataUrl)
                onClose()
            }
        }
        reader.readAsDataURL(file)
    }, [planet.id, setCustomPlanetImage, onClose])

    const handleApply = useCallback(() => {
        if (selectedKey === 'custom') {
            fileInputRef.current?.click()
            return
        }
        setPlanetAppearance(planet.id, selectedKey)
        onClose()
    }, [selectedKey, planet.id, setPlanetAppearance, onClose])

    return (
        <div className="pa-overlay" onClick={onClose}>
            <div className="pa-dialog" onClick={e => e.stopPropagation()}>
                <div className="pa-header">
                    <div className="pa-header-icon">🪐</div>
                    <div>
                        <h2 className="pa-title">Gezegen Görünümü</h2>
                        <p className="pa-subtitle">{planet.name}</p>
                    </div>
                    <button className="pa-close" onClick={onClose} aria-label="Kapat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="pa-grid">
                    {allOptions.map(opt => {
                        const isSelected = selectedKey === opt.key
                        return (
                            <button
                                key={opt.key}
                                className={`pa-card ${isSelected ? 'pa-card--selected' : ''}`}
                                onClick={() => setSelectedKey(opt.key)}
                            >
                                <div className="pa-card-preview">
                                    <MiniPlanetPreview appearanceKey={opt.key} size={60} />
                                </div>
                                <div className="pa-card-info">
                                    <span className="pa-card-emoji">{opt.emoji}</span>
                                    <span className="pa-card-name">{opt.name}</span>
                                </div>
                                {isSelected && (
                                    <div className="pa-card-check">✓</div>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Description */}
                <div className="pa-desc">
                    {selectedKey === 'custom'
                        ? '📂 Dosya seçici açılır — JPG, PNG, WebP, GIF desteklenir'
                        : (() => {
                            const found = PLANET_APPEARANCES.find(a => a.key === selectedKey)
                            return found ? found.description : ''
                        })()
                    }
                </div>

                {/* Actions */}
                <div className="pa-actions">
                    <button className="pa-btn-cancel" onClick={onClose}>İptal</button>
                    <button className="pa-btn-apply" onClick={handleApply}>
                        {selectedKey === 'custom' ? '🖼️ Görsel Seç' : '✓ Uygula'}
                    </button>
                </div>

                {/* Hidden file input for custom image */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleCustomFile}
                />
            </div>
        </div>
    )
}
