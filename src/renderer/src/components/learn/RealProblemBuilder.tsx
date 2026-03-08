import React, { useState } from 'react'
import type { LearnEngineData, RealProblemItem } from '../../types/learn'
import type { translations } from '../../i18n/translations'
import { generateId } from '../../utils/learnStorage'

interface Props {
    data: LearnEngineData
    t: (typeof translations)['en']
    onSave: (data: LearnEngineData) => Promise<void>
}

type View = 'list' | 'create' | 'edit' | 'study'

export function RealProblemBuilder({ data, t, onSave }: Props): React.ReactElement {
    const [view, setView] = useState<View>('list')
    const [editingItem, setEditingItem] = useState<RealProblemItem | null>(null)
    const [studyIdx, setStudyIdx] = useState(0)
    const [revealedHints, setRevealedHints] = useState(0)
    const [showSolution, setShowSolution] = useState(false)

    // Form
    const [title, setTitle] = useState('')
    const [problemStatement, setProblemStatement] = useState('')
    const [hintsText, setHintsText] = useState('')
    const [expectedApproach, setExpectedApproach] = useState('')
    const [solutionNotes, setSolutionNotes] = useState('')
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')

    const items = data.realProblemItems

    const resetForm = (): void => {
        setTitle('')
        setProblemStatement('')
        setHintsText('')
        setExpectedApproach('')
        setSolutionNotes('')
        setDifficulty('medium')
        setEditingItem(null)
    }

    const openCreate = (): void => { resetForm(); setView('create') }

    const openEdit = (item: RealProblemItem): void => {
        setTitle(item.title)
        setProblemStatement(item.problemStatement)
        setHintsText(item.hints.join('\n'))
        setExpectedApproach(item.expectedApproach)
        setSolutionNotes(item.solutionNotes ?? '')
        setDifficulty(item.difficulty ?? 'medium')
        setEditingItem(item)
        setView('edit')
    }

    const handleSubmit = async (): Promise<void> => {
        if (!title.trim() || !problemStatement.trim() || !expectedApproach.trim()) return
        const hints = hintsText.split('\n').map((h) => h.trim()).filter(Boolean)
        if (view === 'edit' && editingItem) {
            const updated: RealProblemItem = { ...editingItem, title, problemStatement, hints, expectedApproach, solutionNotes: solutionNotes || undefined, difficulty }
            await onSave({ ...data, realProblemItems: data.realProblemItems.map((i) => (i.id === updated.id ? updated : i)) })
        } else {
            const newItem: RealProblemItem = { id: generateId(), title, problemStatement, hints, expectedApproach, solutionNotes: solutionNotes || undefined, difficulty, createdAt: Date.now() }
            await onSave({ ...data, realProblemItems: [...data.realProblemItems, newItem] })
        }
        resetForm()
        setView('list')
    }

    const handleDelete = async (id: string): Promise<void> => {
        if (!confirm(t.learnDeleteConfirm)) return
        await onSave({ ...data, realProblemItems: data.realProblemItems.filter((i) => i.id !== id) })
    }

    const startStudy = (): void => {
        setStudyIdx(0)
        setRevealedHints(0)
        setShowSolution(false)
        setView('study')
    }

    const diffLabel = (d?: string): string => {
        if (d === 'easy') return t.learnRPEasy
        if (d === 'hard') return t.learnRPHard
        return t.learnRPMedium
    }

    const diffClass = (d?: string): string => {
        if (d === 'easy') return 'le-diff-easy'
        if (d === 'hard') return 'le-diff-hard'
        return 'le-diff-medium'
    }

    // ── Study ──
    if (view === 'study') {
        if (items.length === 0) return <div className="le-empty">{t.learnNoItems}</div>
        const current = items[studyIdx % items.length]
        return (
            <div>
                <div className="le-toolbar">
                    <button className="le-btn" onClick={() => setView('list')}>← {t.learnBack}</button>
                    <span style={{ color: 'rgba(200,190,255,0.6)', fontSize: '0.82rem' }}>{studyIdx + 1} / {items.length}</span>
                </div>
                <div className="le-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <p className="le-card-title" style={{ flex: 1 }}>{current.title}</p>
                        <span className={diffClass(current.difficulty)} style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                            {diffLabel(current.difficulty)}
                        </span>
                    </div>

                    <div style={{ padding: 16, background: 'rgba(10,10,25,0.6)', borderRadius: 8, marginBottom: 16 }}>
                        <p style={{ color: '#e8eaf6', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{current.problemStatement}</p>
                    </div>

                    {/* Hints */}
                    {current.hints.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            {current.hints.slice(0, revealedHints).map((hint, idx) => (
                                <div key={idx} style={{ padding: '8px 12px', background: 'rgba(120,80,220,0.08)', borderRadius: 6, marginBottom: 6, fontSize: '0.85rem', color: 'rgba(200,190,255,0.7)' }}>
                                    💡 {hint}
                                </div>
                            ))}
                            {revealedHints < current.hints.length && (
                                <button className="le-btn" onClick={() => setRevealedHints(revealedHints + 1)}>
                                    {t.learnRPShowHint} ({revealedHints + 1}/{current.hints.length})
                                </button>
                            )}
                        </div>
                    )}

                    {/* Solution */}
                    {!showSolution ? (
                        <button className="le-btn le-btn-primary" onClick={() => setShowSolution(true)}>
                            {t.learnRPShowSolution}
                        </button>
                    ) : (
                        <div style={{ marginTop: 12 }}>
                            <h4 style={{ fontSize: '0.88rem', color: '#c5b8ff', marginBottom: 8 }}>{t.learnRPApproach}</h4>
                            <div style={{ padding: 14, background: 'rgba(50,180,80,0.08)', borderRadius: 8, border: '1px solid rgba(50,180,80,0.2)', whiteSpace: 'pre-wrap', color: '#e8eaf6', fontSize: '0.88rem', lineHeight: 1.6 }}>
                                {current.expectedApproach}
                            </div>
                            {current.solutionNotes && (
                                <>
                                    <h4 style={{ fontSize: '0.88rem', color: '#c5b8ff', marginBottom: 8, marginTop: 12 }}>{t.learnRPSolution}</h4>
                                    <div style={{ padding: 14, background: 'rgba(120,80,220,0.08)', borderRadius: 8, whiteSpace: 'pre-wrap', color: '#e8eaf6', fontSize: '0.88rem', lineHeight: 1.6 }}>
                                        {current.solutionNotes}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <div style={{ marginTop: 16 }}>
                        <button className="le-btn le-btn-success" onClick={() => { setRevealedHints(0); setShowSolution(false); setStudyIdx(studyIdx + 1) }}>
                            {t.learnQuizNext}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ── Create / Edit ──
    if (view === 'create' || view === 'edit') {
        return (
            <div>
                <div className="le-toolbar">
                    <button className="le-btn" onClick={() => { resetForm(); setView('list') }}>← {t.learnBack}</button>
                    <span className="le-section-title" style={{ marginBottom: 0 }}>{view === 'edit' ? t.learnEditItem : t.learnCreateItem}</span>
                </div>
                <div className="le-card">
                    <label className="le-label">{t.learnRPTitle}</label>
                    <input className="le-input" value={title} onChange={(e) => setTitle(e.target.value)} />

                    <label className="le-label">{t.learnRPStatement}</label>
                    <textarea className="le-textarea" style={{ minHeight: 120 }} value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} />

                    <label className="le-label">{t.learnRPHints}</label>
                    <textarea className="le-textarea" value={hintsText} onChange={(e) => setHintsText(e.target.value)} />

                    <label className="le-label">{t.learnRPApproach}</label>
                    <textarea className="le-textarea" value={expectedApproach} onChange={(e) => setExpectedApproach(e.target.value)} />

                    <label className="le-label">{t.learnRPSolution}</label>
                    <textarea className="le-textarea" value={solutionNotes} onChange={(e) => setSolutionNotes(e.target.value)} />

                    <label className="le-label">{t.learnRPDifficulty}</label>
                    <select className="le-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}>
                        <option value="easy">{t.learnRPEasy}</option>
                        <option value="medium">{t.learnRPMedium}</option>
                        <option value="hard">{t.learnRPHard}</option>
                    </select>

                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        <button className="le-btn le-btn-primary" onClick={handleSubmit}>{t.learnSave}</button>
                        <button className="le-btn" onClick={() => { resetForm(); setView('list') }}>{t.learnCancel}</button>
                    </div>
                </div>
            </div>
        )
    }

    // ── List ──
    return (
        <div>
            <div className="le-toolbar">
                <button className="le-btn le-btn-primary" onClick={openCreate}>{t.learnAddNew}</button>
                {items.length > 0 && <button className="le-btn le-btn-success" onClick={startStudy}>{t.learnStartStudy}</button>}
            </div>
            {items.length === 0 ? (
                <div className="le-empty">{t.learnNoItems}</div>
            ) : (
                items.map((item) => (
                    <div className="le-card" key={item.id}>
                        <div className="le-card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="le-card-title">{item.title}</span>
                                <span className={diffClass(item.difficulty)} style={{ fontSize: '0.72rem' }}>
                                    {diffLabel(item.difficulty)}
                                </span>
                            </div>
                            <div className="le-card-actions">
                                <button className="le-btn le-btn-sm" onClick={() => openEdit(item)}>{t.learnEditMode}</button>
                                <button className="le-btn le-btn-sm le-btn-danger" onClick={() => handleDelete(item.id)}>✕</button>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'rgba(200,190,255,0.5)', marginTop: 4 }}>
                            {item.problemStatement.slice(0, 80)}{item.problemStatement.length > 80 ? '...' : ''}
                        </p>
                    </div>
                ))
            )}
        </div>
    )
}
