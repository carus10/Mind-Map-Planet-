import React from 'react'
import type { LearnEngineData, LearnMode } from '../../types/learn'
import type { translations } from '../../i18n/translations'

interface Props {
    data: LearnEngineData
    t: (typeof translations)['en']
    modeLabel: (mode: LearnMode) => string
    onSelectMode: (mode: LearnMode) => void
}

const MODE_ICONS: Record<string, string> = {
    cloze: '✏️',
    imageOcclusion: '🖼️',
    conceptMatch: '🔗',
    quiz: '❓',
    outputPrediction: '💻',
    apiRecall: '📚',
    realProblem: '🧩',
}

export function LearnOverview({ data, t, modeLabel, onSelectMode }: Props): React.ReactElement {
    const totalItems =
        data.clozeItems.length +
        data.imageOcclusionItems.length +
        data.conceptMatchItems.length +
        data.quizItems.length +
        data.outputPredictionItems.length +
        data.apiRecallItems.length +
        data.realProblemItems.length

    const distribution: { mode: LearnMode; count: number }[] = [
        { mode: 'cloze', count: data.clozeItems.length },
        { mode: 'imageOcclusion', count: data.imageOcclusionItems.length },
        { mode: 'conceptMatch', count: data.conceptMatchItems.length },
        { mode: 'quiz', count: data.quizItems.length },
        { mode: 'outputPrediction', count: data.outputPredictionItems.length },
        { mode: 'apiRecall', count: data.apiRecallItems.length },
        { mode: 'realProblem', count: data.realProblemItems.length },
    ]

    const maxCount = Math.max(1, ...distribution.map((d) => d.count))

    const lastStudied = data.stats.lastStudiedAt
        ? new Date(data.stats.lastStudiedAt).toLocaleDateString()
        : t.learnNever

    // Recent items: collect all items with createdAt, sort desc, take 5
    const allItems = [
        ...data.clozeItems.map((i) => ({ type: 'cloze' as const, label: i.sourceText.slice(0, 50), createdAt: i.createdAt })),
        ...data.imageOcclusionItems.map((i) => ({ type: 'imageOcclusion' as const, label: i.title, createdAt: i.createdAt })),
        ...data.conceptMatchItems.map((i) => ({ type: 'conceptMatch' as const, label: i.title, createdAt: i.createdAt })),
        ...data.quizItems.map((i) => ({ type: 'quiz' as const, label: i.question.slice(0, 50), createdAt: i.createdAt })),
        ...data.outputPredictionItems.map((i) => ({ type: 'outputPrediction' as const, label: i.code.slice(0, 50), createdAt: i.createdAt })),
        ...data.apiRecallItems.map((i) => ({ type: 'apiRecall' as const, label: i.apiName, createdAt: i.createdAt })),
        ...data.realProblemItems.map((i) => ({ type: 'realProblem' as const, label: i.title, createdAt: i.createdAt })),
    ].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)

    return (
        <div>
            {/* Stats */}
            <div className="le-overview-grid">
                <div className="le-overview-stat">
                    <div className="le-overview-stat-value">{totalItems}</div>
                    <div className="le-overview-stat-label">{t.learnTotalItems}</div>
                </div>
                <div className="le-overview-stat">
                    <div className="le-overview-stat-value">{data.stats.completedSessions}</div>
                    <div className="le-overview-stat-label">{t.learnCompletedSessions}</div>
                </div>
                <div className="le-overview-stat">
                    <div className="le-overview-stat-value" style={{ fontSize: '1rem' }}>{lastStudied}</div>
                    <div className="le-overview-stat-label">{t.learnLastStudied}</div>
                </div>
            </div>

            {/* Quick Start */}
            <h3 className="le-section-title">{t.learnQuickStart}</h3>
            <div className="le-quick-start-grid" style={{ marginBottom: 24 }}>
                {distribution.map((d) => (
                    <button key={d.mode} className="le-quick-btn" onClick={() => onSelectMode(d.mode)}>
                        <span>{MODE_ICONS[d.mode]}</span>
                        <span>{modeLabel(d.mode)}</span>
                    </button>
                ))}
            </div>

            {/* Distribution */}
            <h3 className="le-section-title">{t.learnDistribution}</h3>
            <div className="le-card" style={{ marginBottom: 24 }}>
                {distribution.map((d) => (
                    <div className="le-distribution-row" key={d.mode}>
                        <span className="le-distribution-icon">{MODE_ICONS[d.mode]}</span>
                        <span className="le-distribution-name">{modeLabel(d.mode)}</span>
                        <span className="le-distribution-count">{d.count}</span>
                        <div className="le-distribution-bar">
                            <div className="le-distribution-fill" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent */}
            {allItems.length > 0 && (
                <>
                    <h3 className="le-section-title">{t.learnRecentItems}</h3>
                    <div className="le-card">
                        {allItems.map((item, idx) => (
                            <div key={idx} className="le-distribution-row" style={{ cursor: 'pointer' }} onClick={() => onSelectMode(item.type)}>
                                <span className="le-distribution-icon">{MODE_ICONS[item.type]}</span>
                                <span className="le-distribution-name">{item.label || '...'}</span>
                                <span className="le-distribution-count" style={{ fontSize: '0.75rem' }}>
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
