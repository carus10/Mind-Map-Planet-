import React, { useState } from 'react'
import type { LearnEngineData, QuizItem } from '../../types/learn'
import type { translations } from '../../i18n/translations'
import { generateId } from '../../utils/learnStorage'

interface Props {
    data: LearnEngineData
    t: (typeof translations)['en']
    onSave: (data: LearnEngineData) => Promise<void>
}

type View = 'list' | 'create' | 'edit' | 'study'

export function QuizBuilder({ data, t, onSave }: Props): React.ReactElement {
    const [view, setView] = useState<View>('list')
    const [editingItem, setEditingItem] = useState<QuizItem | null>(null)
    const [studyIdx, setStudyIdx] = useState(0)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [checked, setChecked] = useState(false)

    // Form
    const [question, setQuestion] = useState('')
    const [options, setOptions] = useState<string[]>(['', ''])
    const [correctIndex, setCorrectIndex] = useState(0)
    const [explanation, setExplanation] = useState('')

    const items = data.quizItems

    const resetForm = (): void => {
        setQuestion('')
        setOptions(['', ''])
        setCorrectIndex(0)
        setExplanation('')
        setEditingItem(null)
    }

    const openCreate = (): void => { resetForm(); setView('create') }

    const openEdit = (item: QuizItem): void => {
        setQuestion(item.question)
        setOptions([...item.options])
        setCorrectIndex(item.correctIndex)
        setExplanation(item.explanation ?? '')
        setEditingItem(item)
        setView('edit')
    }

    const addOption = (): void => setOptions([...options, ''])

    const updateOption = (idx: number, value: string): void => {
        setOptions(options.map((o, i) => (i === idx ? value : o)))
    }

    const removeOption = (idx: number): void => {
        if (options.length <= 2) return
        setOptions(options.filter((_, i) => i !== idx))
        if (correctIndex >= idx && correctIndex > 0) setCorrectIndex(correctIndex - 1)
    }

    const handleSubmit = async (): Promise<void> => {
        const validOptions = options.filter((o) => o.trim())
        if (!question.trim() || validOptions.length < 2) return

        // Bug fix: if options are removed, correct index might point out of bounds
        // Fallback to 0 if out of bounds after filtering
        const safeCorrectIndex = correctIndex < validOptions.length ? correctIndex : 0;

        if (view === 'edit' && editingItem) {
            const updated: QuizItem = { ...editingItem, question, options: validOptions, correctIndex: safeCorrectIndex, explanation: explanation || undefined }
            await onSave({ ...data, quizItems: data.quizItems.map((i) => (i.id === updated.id ? updated : i)) })
        } else {
            const newItem: QuizItem = { id: generateId(), question, options: validOptions, correctIndex: safeCorrectIndex, explanation: explanation || undefined, createdAt: Date.now() }
            await onSave({ ...data, quizItems: [...data.quizItems, newItem] })
        }
        resetForm()
        setView('list')
    }

    const handleDelete = async (id: string): Promise<void> => {
        if (!confirm(t.learnDeleteConfirm)) return
        await onSave({ ...data, quizItems: data.quizItems.filter((i) => i.id !== id) })
    }

    const startStudy = (): void => {
        setStudyIdx(0)
        setSelectedOption(null)
        setChecked(false)
        setView('study')
    }

    // ── Study ──
    if (view === 'study') {
        if (items.length === 0) return <div className="le-empty">{t.learnNoItems}</div>
        const current = items[studyIdx % items.length]
        const isCorrect = selectedOption === current.correctIndex
        return (
            <div>
                <div className="le-toolbar">
                    <button className="le-btn" onClick={() => setView('list')}>← {t.learnBack}</button>
                    <span style={{ color: 'rgba(200,190,255,0.6)', fontSize: '0.82rem' }}>{studyIdx + 1} / {items.length}</span>
                </div>
                <div className="le-card">
                    <p style={{ fontSize: '1.05rem', fontWeight: 500, color: '#e8eaf6', marginBottom: 16 }}>{current.question}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {current.options.map((opt, idx) => {
                            let optStyle: React.CSSProperties = { padding: '10px 14px', borderRadius: 8, cursor: checked ? 'default' : 'pointer', border: '1px solid rgba(120,80,220,0.2)', background: 'rgba(10,10,25,0.5)', color: '#e8eaf6', textAlign: 'left' as const, fontSize: '0.88rem', transition: 'all 0.2s ease' }
                            if (selectedOption === idx && !checked) {
                                optStyle = { ...optStyle, borderColor: 'rgba(120,80,220,0.6)', background: 'rgba(120,80,220,0.2)' }
                            }
                            if (checked && idx === current.correctIndex) {
                                optStyle = { ...optStyle, borderColor: '#69f0ae', background: 'rgba(50,180,80,0.15)' }
                            }
                            if (checked && selectedOption === idx && idx !== current.correctIndex) {
                                optStyle = { ...optStyle, borderColor: '#ff8a80', background: 'rgba(220,50,50,0.15)' }
                            }
                            return <button key={idx} style={optStyle} onClick={() => { if (!checked) setSelectedOption(idx) }}>{opt}</button>
                        })}
                    </div>
                    {checked && (
                        <div style={{ marginTop: 12 }}>
                            <p className={isCorrect ? 'le-badge-correct' : 'le-badge-incorrect'}>
                                {isCorrect ? `✓ ${t.learnCorrect}` : `✗ ${t.learnIncorrect}`}
                            </p>
                            {current.explanation && <p style={{ fontSize: '0.85rem', color: 'rgba(200,190,255,0.6)', marginTop: 6 }}>{current.explanation}</p>}
                        </div>
                    )}
                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        {!checked ? (
                            <button className="le-btn le-btn-primary" onClick={() => setChecked(true)} disabled={selectedOption === null}>{t.learnQuizCheck}</button>
                        ) : (
                            <button className="le-btn le-btn-success" onClick={() => { setSelectedOption(null); setChecked(false); setStudyIdx(studyIdx + 1) }}>{t.learnQuizNext}</button>
                        )}
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
                    <label className="le-label">{t.learnQuizQuestion}</label>
                    <textarea className="le-textarea" value={question} onChange={(e) => setQuestion(e.target.value)} />

                    {options.map((opt, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                            <button
                                className={`le-btn le-btn-sm ${correctIndex === idx ? 'le-btn-success' : ''}`}
                                onClick={() => setCorrectIndex(idx)}
                                title={t.learnQuizMarkCorrect}
                            >
                                ✓
                            </button>
                            <input className="le-input" style={{ flex: 1 }} placeholder={`${t.learnQuizOption} ${idx + 1}`} value={opt} onChange={(e) => updateOption(idx, e.target.value)} />
                            {options.length > 2 && <button className="le-btn le-btn-sm le-btn-danger" onClick={() => removeOption(idx)}>✕</button>}
                        </div>
                    ))}
                    <button className="le-btn" style={{ marginTop: 8 }} onClick={addOption}>{t.learnQuizAddOption}</button>

                    <label className="le-label">{t.learnQuizExplanation}</label>
                    <textarea className="le-textarea" value={explanation} onChange={(e) => setExplanation(e.target.value)} />

                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        <button className="le-btn le-btn-primary" onClick={handleSubmit} disabled={!question.trim() || options.filter(o => o.trim()).length < 2}>{t.learnSave}</button>
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
                            <span className="le-card-title">{item.question}</span>
                            <div className="le-card-actions">
                                <button className="le-btn le-btn-sm" onClick={() => openEdit(item)}>{t.learnEditMode}</button>
                                <button className="le-btn le-btn-sm le-btn-danger" onClick={() => handleDelete(item.id)}>✕</button>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(200,190,255,0.5)' }}>{item.options.length} {t.learnQuizOption.toLowerCase()}s</div>
                    </div>
                ))
            )}
        </div>
    )
}
