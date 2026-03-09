import React, { useState } from 'react'
import type { LearnEngineData, BugHuntItem } from '../../types/learn'
import type { translations } from '../../i18n/translations'
import { generateId, updateItemProgress } from '../../utils/learnStorage'
import { useConfirm } from './ConfirmDialog'

interface Props {
    data: LearnEngineData
    t: (typeof translations)['en']
    onSave: (data: LearnEngineData) => Promise<void>
}

type View = 'list' | 'create' | 'edit' | 'study'

/** Prevent pointer events from propagating to VoronoiMap drag handlers */
const stopPointer = (e: React.MouseEvent | React.PointerEvent): void => {
    e.stopPropagation()
}

export function BugHuntBuilder({ data, t, onSave }: Props): React.ReactElement {
    const [view, setView] = useState<View>('list')
    const [editingItem, setEditingItem] = useState<BugHuntItem | null>(null)
    const [studyIdx, setStudyIdx] = useState(0)
    const [guess, setGuess] = useState('')
    const [revealed, setRevealed] = useState(false)

    // Form
    const [title, setTitle] = useState('')
    const [language, setLanguage] = useState('javascript')
    const [buggyCode, setBuggyCode] = useState('')
    const [expectedIssue, setExpectedIssue] = useState('')
    const [explanation, setExplanation] = useState('')
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')

    const confirmAsync = useConfirm()
    const items = data.bugHuntItems || []

    const resetForm = (): void => {
        setTitle('')
        setLanguage('javascript')
        setBuggyCode('')
        setExpectedIssue('')
        setExplanation('')
        setDifficulty('medium')
        setEditingItem(null)
    }

    const openCreate = (): void => { resetForm(); setView('create') }

    const openEdit = (item: BugHuntItem): void => {
        setTitle(item.title)
        setLanguage(item.language)
        setBuggyCode(item.buggyCode)
        setExpectedIssue(item.expectedIssue)
        setExplanation(item.explanation ?? '')
        setDifficulty(item.difficulty ?? 'medium')
        setEditingItem(item)
        setView('edit')
    }

    const handleSubmit = async (): Promise<void> => {
        if (!title.trim() || !buggyCode.trim() || !expectedIssue.trim()) return
        if (view === 'edit' && editingItem) {
            const updated: BugHuntItem = { ...editingItem, title, language, buggyCode, expectedIssue, explanation: explanation || undefined, difficulty }
            await onSave({ ...data, bugHuntItems: items.map((i) => (i.id === updated.id ? updated : i)) })
        } else {
            const newItem: BugHuntItem = { id: generateId(), title, language, buggyCode, expectedIssue, explanation: explanation || undefined, difficulty, createdAt: Date.now() }
            await onSave({ ...data, bugHuntItems: [...items, newItem] })
        }
        resetForm()
        setView('list')
    }

    const handleDelete = async (id: string): Promise<void> => {
        if (!(await confirmAsync(t.learnDeleteConfirm))) return
        await onSave({ ...data, bugHuntItems: items.filter((i) => i.id !== id) })
    }

    const startStudy = (): void => {
        setStudyIdx(0)
        setGuess('')
        setRevealed(false)
        setView('study')
    }

    // ── Study ──
    if (view === 'study') {
        if (items.length === 0) return <div className="le-empty">{t.learnNoItems}</div>
        const current = items[studyIdx % items.length]
        return (
            <div onPointerDown={stopPointer} onMouseDown={stopPointer}>
                <div className="le-toolbar">
                    <button className="le-btn" onClick={() => setView('list')}>← {t.learnBack}</button>
                    <span style={{ color: 'rgba(200,190,255,0.6)', fontSize: '0.82rem' }}>{studyIdx + 1} / {items.length}</span>
                </div>
                <div className="le-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#b39ddb' }}>{current.title}</h3>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span className="le-code-lang">{current.language}</span>
                            {current.difficulty && <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>{current.difficulty}</span>}
                        </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label className="le-label" style={{ color: '#ff8a80' }}>{t.learnBHWhatsWrong}</label>
                        <pre className="le-code-block" style={{ whiteSpace: 'pre-wrap' }}>{current.buggyCode}</pre>
                    </div>

                    {!revealed && (
                        <div style={{ marginTop: 16 }}>
                            <label className="le-label">{t.learnYourAnswer}</label>
                            <textarea
                                className="le-textarea"
                                value={guess}
                                onChange={(e) => setGuess(e.target.value)}
                                onPointerDown={stopPointer}
                                onMouseDown={stopPointer}
                                placeholder={t.learnBHWhatsWrong}
                            />
                        </div>
                    )}

                    {!revealed ? (
                        <button className="le-btn le-btn-primary" style={{ marginTop: 12 }} onClick={() => setRevealed(true)}>
                            {t.learnReveal}
                        </button>
                    ) : (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(255, 138, 128, 0.1)', border: '1px solid rgba(255, 138, 128, 0.3)', marginBottom: 16 }}>
                                <label className="le-label" style={{ color: '#ff8a80', marginBottom: 8 }}>{t.learnExpectedIssue}</label>
                                <p style={{ color: '#e8eaf6', whiteSpace: 'pre-wrap', margin: 0 }}>{current.expectedIssue}</p>
                            </div>

                            {current.explanation && (
                                <p style={{ fontSize: '0.85rem', color: 'rgba(200,190,255,0.6)', marginBottom: 16 }}>{current.explanation}</p>
                            )}

                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button className="le-btn le-btn-success" onClick={() => {
                                    onSave(updateItemProgress(data, current.id, true))
                                    setGuess(''); setRevealed(false); setStudyIdx(studyIdx + 1)
                                }}>{t.learnIssueFound}</button>
                                <button className="le-btn le-btn-danger" onClick={() => {
                                    onSave(updateItemProgress(data, current.id, false))
                                    setGuess(''); setRevealed(false); setStudyIdx(studyIdx + 1)
                                }}>{t.learnIssueMissed}</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ── Create / Edit ──
    if (view === 'create' || view === 'edit') {
        return (
            <div onPointerDown={stopPointer} onMouseDown={stopPointer}>
                <div className="le-toolbar">
                    <button className="le-btn" onClick={() => { resetForm(); setView('list') }}>← {t.learnBack}</button>
                    <span className="le-section-title" style={{ marginBottom: 0 }}>{view === 'edit' ? t.learnEditItem : t.learnCreateItem}</span>
                </div>
                <div className="le-card">
                    <label className="le-label">{t.learnBHTitle}</label>
                    <input className="le-input" value={title} onChange={(e) => setTitle(e.target.value)} onPointerDown={stopPointer} onMouseDown={stopPointer} />

                    <label className="le-label">{t.learnOPLanguage}</label>
                    <input className="le-input" value={language} onChange={(e) => setLanguage(e.target.value)} onPointerDown={stopPointer} onMouseDown={stopPointer} />

                    <label className="le-label">{t.learnBuggyCode}</label>
                    <textarea className="le-textarea" style={{ fontFamily: 'monospace', minHeight: 120 }} value={buggyCode} onChange={(e) => setBuggyCode(e.target.value)} onPointerDown={stopPointer} onMouseDown={stopPointer} />

                    <label className="le-label">{t.learnExpectedIssue}</label>
                    <textarea className="le-textarea" style={{ minHeight: 60 }} value={expectedIssue} onChange={(e) => setExpectedIssue(e.target.value)} onPointerDown={stopPointer} onMouseDown={stopPointer} />

                    <label className="le-label">{t.learnOPExplanation}</label>
                    <textarea className="le-textarea" value={explanation} onChange={(e) => setExplanation(e.target.value)} onPointerDown={stopPointer} onMouseDown={stopPointer} />

                    <label className="le-label">{t.learnBHDifficulty}</label>
                    <select className="le-input" value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')} onPointerDown={stopPointer} onMouseDown={stopPointer}>
                        <option value="easy">{t.learnRPEasy}</option>
                        <option value="medium">{t.learnRPMedium}</option>
                        <option value="hard">{t.learnRPHard}</option>
                    </select>

                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        <button className="le-btn le-btn-primary" onClick={handleSubmit} disabled={!title.trim() || !buggyCode.trim() || !expectedIssue.trim()}>{t.learnSave}</button>
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
                <button className="le-btn le-btn-primary" onClick={openCreate}>{t.learnAddBugHunt}</button>
                {items.length > 0 && <button className="le-btn le-btn-success" onClick={startStudy}>{t.learnStartStudy}</button>}
            </div>
            {items.length === 0 ? (
                <div className="le-empty">{t.learnNoItems}</div>
            ) : (
                items.map((item) => (
                    <div className="le-card" key={item.id}>
                        <div className="le-card-header">
                            <div>
                                <span className="le-card-title">{item.title}</span>
                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                    <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: 3, background: 'rgba(120,80,220,0.2)', color: '#b39ddb' }}>{item.language}</span>
                                    {item.difficulty && <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.1)' }}>{item.difficulty}</span>}
                                </div>
                            </div>
                            <div className="le-card-actions">
                                <button className="le-btn le-btn-sm" onClick={() => openEdit(item)}>{t.learnEditMode}</button>
                                <button className="le-btn le-btn-sm le-btn-danger" onClick={() => handleDelete(item.id)}>✕</button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}
