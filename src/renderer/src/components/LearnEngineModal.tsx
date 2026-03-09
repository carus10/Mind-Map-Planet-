import React, { useState, useEffect, useCallback } from 'react'
import { useMapStore } from '../store/mapStore'
import { translations } from '../i18n/translations'
import type { HierarchyNode } from '../types/hierarchy'
import type { LearnEngineData, LearnMode } from '../types/learn'
import { loadLearnData, saveLearnData, emptyLearnData, loadNoteTags } from '../utils/learnStorage'
import { LearnOverview } from './learn/LearnOverview'
import { ClozeBuilder } from './learn/ClozeBuilder'
import { ImageOcclusionBuilder } from './learn/ImageOcclusionBuilder'
import { ConceptMatchBuilder } from './learn/ConceptMatchBuilder'
import { QuizBuilder } from './learn/QuizBuilder'
import { OutputPredictionBuilder } from './learn/OutputPredictionBuilder'
import { ApiRecallBuilder } from './learn/ApiRecallBuilder'
import { RealProblemBuilder } from './learn/RealProblemBuilder'
import { CodeCompletionBuilder } from './learn/CodeCompletionBuilder'
import { MixedPracticeBuilder } from './learn/MixedPracticeBuilder'
import './LearnEngineModal.css'

interface Props {
    noteNode: HierarchyNode
    onClose: () => void
}

const MODES: LearnMode[] = [
    'overview',
    'cloze',
    'imageOcclusion',
    'conceptMatch',
    'quiz',
    'outputPrediction',
    'apiRecall',
    'realProblem',
    'codeCompletion',
    'mixedPractice',
]

const MODE_ICONS: Record<LearnMode, string> = {
    overview: '📊',
    cloze: '✏️',
    imageOcclusion: '🖼️',
    conceptMatch: '🔗',
    quiz: '❓',
    outputPrediction: '💻',
    apiRecall: '📚',
    realProblem: '🧩',
    codeCompletion: '📝',
    mixedPractice: '🔀',
}

export function LearnEngineModal({ noteNode, onClose }: Props): React.ReactElement {
    const { language } = useMapStore((s) => ({ language: s.language }))
    const t = translations[language] as any

    const [activeMode, setActiveMode] = useState<LearnMode>('overview')
    const [data, setData] = useState<LearnEngineData>(emptyLearnData(noteNode.id, noteNode.absolutePath))
    const [tags, setTags] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')

    // Filter modes based on tags
    const availableModes = React.useMemo(() => {
        const isCodeRelated = tags.some(t => ['code', 'backend', 'frontend', 'algorithm', 'api'].includes(t.toLowerCase()))
        if (isCodeRelated) return MODES
        return MODES.filter(m => !['outputPrediction', 'apiRecall', 'realProblem', 'codeCompletion'].includes(m))
    }, [tags])

    // Mode label lookup
    const modeLabel = useCallback(
        (mode: LearnMode): string => {
            const map: Record<LearnMode, string> = {
                overview: t.learnOverview,
                cloze: t.learnCloze,
                imageOcclusion: t.learnImageOcclusion,
                conceptMatch: t.learnConceptMatch,
                quiz: t.learnQuiz,
                outputPrediction: t.learnOutputPrediction,
                apiRecall: t.learnApiRecall || 'API Recall',
                realProblem: t.learnRealProblem || 'Real Problem',
                codeCompletion: t.learnCodeCompletion || 'Code Completion',
                mixedPractice: 'Mixed Practice',
            }
            return map[mode]
        },
        [t],
    )

    // Load data and tags on mount
    useEffect(() => {
        let cancelled = false
        setLoading(true)
        Promise.all([
            loadLearnData(noteNode.id, noteNode.absolutePath).catch(() => emptyLearnData(noteNode.id, noteNode.absolutePath)),
            loadNoteTags(noteNode.absolutePath).catch(() => [])
        ]).then(([loadedData, loadedTags]) => {
            if (!cancelled) {
                setData(loadedData)
                setTags(loadedTags)

                // If the current active mode is not available in the filtered modes, fallback to overview
                const isCodeRelated = loadedTags.some(t => ['code', 'backend', 'frontend', 'algorithm', 'api'].includes(t.toLowerCase()))
                const currentRestricted = ['outputPrediction', 'apiRecall', 'realProblem', 'codeCompletion'].includes(activeMode)
                if (currentRestricted && !isCodeRelated) {
                    setActiveMode('overview')
                }
            }
        }).finally(() => {
            if (!cancelled) setLoading(false)
        })
        return () => {
            cancelled = true
        }
    }, [noteNode.id, noteNode.absolutePath])

    // Escape to close
    useEffect(() => {
        const handler = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    // Save handler (used by child components)
    const handleSave = useCallback(
        async (updated: LearnEngineData) => {
            setData(updated)
            try {
                await saveLearnData(updated)
                setSaveStatus('saved')
                setTimeout(() => setSaveStatus('idle'), 2000)
            } catch {
                // silently ignore save errors — data is still in state
            }
        },
        [],
    )

    const renderContent = (): React.ReactElement => {
        if (loading) {
            return <div className="le-loading">{t.editorLoading}</div>
        }

        switch (activeMode) {
            case 'overview':
                return <LearnOverview data={data} t={t} modeLabel={modeLabel} onSelectMode={setActiveMode} />
            case 'cloze':
                return <ClozeBuilder data={data} t={t} onSave={handleSave} />
            case 'imageOcclusion':
                return <ImageOcclusionBuilder data={data} t={t} onSave={handleSave} />
            case 'conceptMatch':
                return <ConceptMatchBuilder data={data} t={t} onSave={handleSave} />
            case 'quiz':
                return <QuizBuilder data={data} t={t} onSave={handleSave} />
            case 'outputPrediction':
                return <OutputPredictionBuilder data={data} t={t} onSave={handleSave} />
            case 'apiRecall':
                return <ApiRecallBuilder data={data} t={t} onSave={handleSave} />
            case 'realProblem':
                return <RealProblemBuilder data={data} t={t} onSave={handleSave} />
            case 'codeCompletion':
                return <CodeCompletionBuilder data={data} t={t} onSave={handleSave} />
            case 'mixedPractice':
                return <MixedPracticeBuilder data={data} t={t} onSave={handleSave} availableModes={availableModes} />
            default:
                return <LearnOverview data={data} t={t} modeLabel={modeLabel} onSelectMode={setActiveMode} />
        }
    }

    // Sidebar collapsed on narrow viewport is handled via CSS

    return (
        <div className="le-overlay">
            <div className="le-container">
                {/* ── Top Bar ── */}
                <header className="le-topbar">
                    <button className="le-topbar-back" onClick={onClose} title={t.learnClose}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                    </button>
                    <span className="le-topbar-note">{noteNode.name}</span>
                    <span className="le-topbar-mode">{modeLabel(activeMode)}</span>
                    {saveStatus === 'saved' && <span className="le-topbar-saved">✓ {t.learnSaved}</span>}
                    <div className="le-topbar-spacer" />
                    <button className="le-topbar-close" onClick={onClose} title={t.learnClose}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </header>

                <div className="le-body">
                    {/* ── Sidebar ── */}
                    <nav className="le-sidebar">
                        {availableModes.map((mode) => (
                            <button
                                key={mode}
                                className={`le-sidebar-item ${activeMode === mode ? 'active' : ''}`}
                                onClick={() => setActiveMode(mode)}
                                title={modeLabel(mode)}
                            >
                                <span className="le-sidebar-icon">{MODE_ICONS[mode]}</span>
                                <span className="le-sidebar-label">{modeLabel(mode)}</span>
                            </button>
                        ))}
                    </nav>

                    {/* ── Content ── */}
                    <main className="le-content">{renderContent()}</main>
                </div>
            </div>
        </div>
    )
}
