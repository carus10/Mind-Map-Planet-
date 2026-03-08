import React, { useState } from 'react'
import type { LearnEngineData, OutputPredictionItem } from '../../types/learn'
import type { translations } from '../../i18n/translations'
import { generateId } from '../../utils/learnStorage'

interface Props {
    data: LearnEngineData
    t: (typeof translations)['en']
    onSave: (data: LearnEngineData) => Promise<void>
}

type View = 'list' | 'create' | 'edit' | 'study'

export function OutputPredictionBuilder({ data, t, onSave }: Props): React.ReactElement {
    const [view, setView] = useState<View>('list')
    const [editingItem, setEditingItem] = useState<OutputPredictionItem | null>(null)
    const [studyIdx, setStudyIdx] = useState(0)
    const [guess, setGuess] = useState('')
    const [revealed, setRevealed] = useState(false)

    // Form
    const [language, setLanguage] = useState('javascript')
    const [code, setCode] = useState('')
    const [expectedOutput, setExpectedOutput] = useState('')
    const [explanation, setExplanation] = useState('')

    const items = data.outputPredictionItems

    const resetForm = (): void => {
        setLanguage('javascript')
        setCode('')
        setExpectedOutput('')
        setExplanation('')
        setEditingItem(null)
    }

    const openCreate = (): void => { resetForm(); setView('create') }

    const openEdit = (item: OutputPredictionItem): void => {
        setLanguage(item.language)
        setCode(item.code)
        setExpectedOutput(item.expectedOutput)
        setExplanation(item.explanation ?? '')
        setEditingItem(item)
        setView('edit')
    }

    const handleSubmit = async (): Promise<void> => {
        if (!code.trim() || !expectedOutput.trim()) return
        if (view === 'edit' && editingItem) {
            const updated: OutputPredictionItem = { ...editingItem, language, code, expectedOutput, explanation: explanation || undefined }
            await onSave({ ...data, outputPredictionItems: data.outputPredictionItems.map((i) => (i.id === updated.id ? updated : i)) })
        } else {
            const newItem: OutputPredictionItem = { id: generateId(), language, code, expectedOutput, explanation: explanation || undefined, createdAt: Date.now() }
            await onSave({ ...data, outputPredictionItems: [...data.outputPredictionItems, newItem] })
        }
        resetForm()
        setView('list')
    }

    const handleDelete = async (id: string): Promise<void> => {
        if (!confirm(t.learnDeleteConfirm)) return
        await onSave({ ...data, outputPredictionItems: data.outputPredictionItems.filter((i) => i.id !== id) })
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
        const isMatch = revealed && guess.trim() === current.expectedOutput.trim()
        return (
            <div>
                <div className="le-toolbar">
                    <button className="le-btn" onClick={() => setView('list')}>← {t.learnBack}</button>
                    <span style={{ color: 'rgba(200,190,255,0.6)', fontSize: '0.82rem' }}>{studyIdx + 1} / {items.length}</span>
                </div>
                <div className="le-card">
                    <div className="le-code-lang">{current.language}</div>
                    <pre className="le-code-block">{current.code}</pre>

                    <label className="le-label" style={{ marginTop: 16 }}>{t.learnOPYourGuess}</label>
                    <textarea className="le-textarea" value={guess} onChange={(e) => setGuess(e.target.value)} disabled={revealed} />

                    {!revealed ? (
                        <button className="le-btn le-btn-primary" style={{ marginTop: 12 }} onClick={() => setRevealed(true)}>
                            {t.learnOPCheck}
                        </button>
                    ) : (
                        <div style={{ marginTop: 12 }}>
                            <p className={isMatch ? 'le-badge-correct' : 'le-badge-incorrect'}>
                                {isMatch ? `✓ ${t.learnCorrect}` : `✗ ${t.learnIncorrect}`}
                            </p>
                            <div style={{ marginTop: 8 }}>
                                <span style={{ fontSize: '0.82rem', color: 'rgba(200,190,255,0.5)' }}>{t.learnOPExpected}:</span>
                                <pre className="le-code-block" style={{ marginTop: 4 }}>{current.expectedOutput}</pre>
                            </div>
                            {current.explanation && (
                                <p style={{ fontSize: '0.85rem', color: 'rgba(200,190,255,0.6)', marginTop: 8 }}>{current.explanation}</p>
                            )}
                            <button className="le-btn le-btn-success" style={{ marginTop: 12 }} onClick={() => { setGuess(''); setRevealed(false); setStudyIdx(studyIdx + 1) }}>
                                {t.learnQuizNext}
                            </button>
                        </div>
                    )}
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
                    <label className="le-label">{t.learnOPLanguage}</label>
                    <input className="le-input" value={language} onChange={(e) => setLanguage(e.target.value)} />

                    <label className="le-label">{t.learnOPCode}</label>
                    <textarea className="le-textarea" style={{ fontFamily: 'monospace', minHeight: 100 }} value={code} onChange={(e) => setCode(e.target.value)} />

                    <label className="le-label">{t.learnOPExpected}</label>
                    <textarea className="le-textarea" value={expectedOutput} onChange={(e) => setExpectedOutput(e.target.value)} />

                    <label className="le-label">{t.learnOPExplanation}</label>
                    <textarea className="le-textarea" value={explanation} onChange={(e) => setExplanation(e.target.value)} />

                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        <button className="le-btn le-btn-primary" onClick={handleSubmit} disabled={!code.trim() || !expectedOutput.trim()}>{t.learnSave}</button>
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
                            <span className="le-card-title">{item.language}: {item.code.slice(0, 60)}...</span>
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
