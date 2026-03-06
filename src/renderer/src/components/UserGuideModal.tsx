import React, { useState, useEffect } from 'react'
import { useMapStore } from '../store/mapStore'
import { translations } from '../i18n/translations'
import './UserGuideModal.css'

interface Props {
    onClose: () => void
}

type GuideSection =
    | 'navigation'
    | 'interaction'
    | 'search'
    | 'notes'
    | 'dragdrop'
    | 'traderoutes'
    | 'appearance'
    | 'shortcuts'

interface SectionDef {
    id: GuideSection
    icon: string
    labelKey: string
}

const SECTIONS: SectionDef[] = [
    { id: 'navigation', icon: '🧭', labelKey: 'guideNavTitle' },
    { id: 'interaction', icon: '👆', labelKey: 'guideInterTitle' },
    { id: 'search', icon: '🔍', labelKey: 'guideSearchTitle' },
    { id: 'notes', icon: '📝', labelKey: 'guideNotesTitle' },
    { id: 'dragdrop', icon: '📦', labelKey: 'guideDragTitle' },
    { id: 'traderoutes', icon: '🌌', labelKey: 'guideRoutesTitle' },
    { id: 'appearance', icon: '🎨', labelKey: 'guideAppearTitle' },
    { id: 'shortcuts', icon: '⌨️', labelKey: 'guideShortcutsTitle' },
]

interface ShortcutDef {
    icon: string
    labelKey: string
    keys: string[]
}

const SHORTCUTS: ShortcutDef[] = [
    { icon: '📝', labelKey: 'shortcutNewNote', keys: ['Ctrl', 'N'] },
    { icon: '🪐', labelKey: 'shortcutNewPlanet', keys: ['Ctrl', 'P'] },
    { icon: '🔍', labelKey: 'shortcutSearch', keys: ['Ctrl', 'K'] },
    { icon: '⚙️', labelKey: 'shortcutSettings', keys: ['Ctrl', ','] },
    { icon: '📖', labelKey: 'shortcutGuide', keys: ['Ctrl', 'H'] },
    { icon: '↩️', labelKey: 'shortcutBack', keys: ['Esc'] },
]

interface FeatureDef {
    icon: string
    nameKey: string
    descKey: string
}

const NAV_FEATURES: FeatureDef[] = [
    { icon: '🖱️', nameKey: 'guideNavClick', descKey: 'guideNavClickDesc' },
    { icon: '🖐️', nameKey: 'guideNavPan', descKey: 'guideNavPanDesc' },
    { icon: '🔄', nameKey: 'guideNavZoom', descKey: 'guideNavZoomDesc' },
    { icon: '🎯', nameKey: 'guideNavCenter', descKey: 'guideNavCenterDesc' },
]

const INTER_FEATURES: FeatureDef[] = [
    { icon: '📂', nameKey: 'guideInterFolder', descKey: 'guideInterFolderDesc' },
    { icon: '📄', nameKey: 'guideInterNote', descKey: 'guideInterNoteDesc' },
    { icon: '✏️', nameKey: 'guideInterRename', descKey: 'guideInterRenameDesc' },
    { icon: '🗑️', nameKey: 'guideInterDelete', descKey: 'guideInterDeleteDesc' },
    { icon: '📁', nameKey: 'guideInterSubfolder', descKey: 'guideInterSubfolderDesc' },
]

const SEARCH_FEATURES: FeatureDef[] = [
    { icon: '🔍', nameKey: 'guideSearchOpen', descKey: 'guideSearchOpenDesc' },
    { icon: '⚡', nameKey: 'guideSearchJump', descKey: 'guideSearchJumpDesc' },
]

const NOTES_FEATURES: FeatureDef[] = [
    { icon: '📝', nameKey: 'guideNotesNew', descKey: 'guideNotesNewDesc' },
    { icon: '🪐', nameKey: 'guideNotesPlanet', descKey: 'guideNotesPlanetDesc' },
]

const DRAG_FEATURES: FeatureDef[] = [
    { icon: '📦', nameKey: 'guideDragCargo', descKey: 'guideDragCargoDesc' },
    { icon: '🚀', nameKey: 'guideDragMove', descKey: 'guideDragMoveDesc' },
]

const ROUTE_FEATURES: FeatureDef[] = [
    { icon: '🔗', nameKey: 'guideRoutesWhat', descKey: 'guideRoutesWhatDesc' },
    { icon: '💫', nameKey: 'guideRoutesJump', descKey: 'guideRoutesJumpDesc' },
]

const APPEAR_FEATURES: FeatureDef[] = [
    { icon: '🎨', nameKey: 'guideAppearChange', descKey: 'guideAppearChangeDesc' },
    { icon: '📏', nameKey: 'guideAppearSize', descKey: 'guideAppearSizeDesc' },
    { icon: '🖼️', nameKey: 'guideAppearCustom', descKey: 'guideAppearCustomDesc' },
    { icon: '🎲', nameKey: 'guideAppearRandom', descKey: 'guideAppearRandomDesc' },
]

export function UserGuideModal({ onClose }: Props): React.ReactElement {
    const language = useMapStore((s) => s.language)
    const t = translations[language] as Record<string, string>
    const [activeSection, setActiveSection] = useState<GuideSection>('navigation')

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                onClose()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    const renderFeatures = (features: FeatureDef[]): React.ReactElement => (
        <div className="guide-feature-list">
            {features.map((f, i) => (
                <div className="guide-feature-card" key={i}>
                    <div className="guide-feature-header">
                        <div className="guide-feature-icon">{f.icon}</div>
                        <div className="guide-feature-name">{t[f.nameKey]}</div>
                    </div>
                    <p className="guide-feature-desc">{t[f.descKey]}</p>
                </div>
            ))}
        </div>
    )

    const renderShortcuts = (): React.ReactElement => (
        <div className="guide-shortcuts-grid">
            {SHORTCUTS.map((s, i) => (
                <div className="guide-shortcut-row" key={i}>
                    <div className="guide-shortcut-label">
                        <span className="guide-shortcut-label-icon">{s.icon}</span>
                        {t[s.labelKey]}
                    </div>
                    <div className="guide-shortcut-keys">
                        {s.keys.map((k, ki) => (
                            <React.Fragment key={ki}>
                                {ki > 0 && <span className="guide-kbd-separator">+</span>}
                                <kbd className="guide-kbd">{k}</kbd>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )

    const sectionContent: Record<GuideSection, () => React.ReactElement> = {
        navigation: () => (
            <div className="guide-section-card">
                <h2 className="guide-section-title">{t.guideNavTitle}</h2>
                <p className="guide-section-subtitle">{t.guideNavSubtitle}</p>
                {renderFeatures(NAV_FEATURES)}
            </div>
        ),
        interaction: () => (
            <div className="guide-section-card">
                <h2 className="guide-section-title">{t.guideInterTitle}</h2>
                <p className="guide-section-subtitle">{t.guideInterSubtitle}</p>
                {renderFeatures(INTER_FEATURES)}
            </div>
        ),
        search: () => (
            <div className="guide-section-card">
                <h2 className="guide-section-title">{t.guideSearchTitle}</h2>
                <p className="guide-section-subtitle">{t.guideSearchSubtitle}</p>
                {renderFeatures(SEARCH_FEATURES)}
            </div>
        ),
        notes: () => (
            <div className="guide-section-card">
                <h2 className="guide-section-title">{t.guideNotesTitle}</h2>
                <p className="guide-section-subtitle">{t.guideNotesSubtitle}</p>
                {renderFeatures(NOTES_FEATURES)}
            </div>
        ),
        dragdrop: () => (
            <div className="guide-section-card">
                <h2 className="guide-section-title">{t.guideDragTitle}</h2>
                <p className="guide-section-subtitle">{t.guideDragSubtitle}</p>
                {renderFeatures(DRAG_FEATURES)}
                <div className="guide-tip">
                    <span className="guide-tip-icon">💡</span>
                    <p className="guide-tip-text">{t.guideDragTip}</p>
                </div>
            </div>
        ),
        traderoutes: () => (
            <div className="guide-section-card">
                <h2 className="guide-section-title">{t.guideRoutesTitle}</h2>
                <p className="guide-section-subtitle">{t.guideRoutesSubtitle}</p>
                {renderFeatures(ROUTE_FEATURES)}
            </div>
        ),
        appearance: () => (
            <div className="guide-section-card">
                <h2 className="guide-section-title">{t.guideAppearTitle}</h2>
                <p className="guide-section-subtitle">{t.guideAppearSubtitle}</p>
                {renderFeatures(APPEAR_FEATURES)}
            </div>
        ),
        shortcuts: () => (
            <div className="guide-section-card">
                <h2 className="guide-section-title">{t.guideShortcutsTitle}</h2>
                <p className="guide-section-subtitle">{t.guideShortcutsSubtitle}</p>
                {renderShortcuts()}
            </div>
        ),
    }

    return (
        <div className="guide-overlay" onClick={onClose}>
            <div className="guide-modal" onClick={(e) => e.stopPropagation()}>

                <div className="guide-modal-header">
                    <h2 className="guide-modal-title">
                        <span className="guide-modal-title-icon">📖</span>
                        {t.guideModalTitle}
                    </h2>
                    <button className="guide-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="guide-modal-body">
                    {/* Sidebar */}
                    <div className="guide-sidebar">
                        {SECTIONS.map((sec) => (
                            <button
                                key={sec.id}
                                className={`guide-nav-btn ${activeSection === sec.id ? 'active' : ''}`}
                                onClick={() => setActiveSection(sec.id)}
                            >
                                <span className="guide-nav-icon">{sec.icon}</span>
                                {t[sec.labelKey]}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="guide-content" key={activeSection}>
                        {sectionContent[activeSection]()}
                    </div>
                </div>

            </div>
        </div>
    )
}
