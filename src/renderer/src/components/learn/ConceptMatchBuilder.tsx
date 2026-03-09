import React, { useState, useMemo } from 'react'
import type { LearnEngineData, ConceptMatchItem, ConceptMatchPair } from '../../types/learn'
import type { translations } from '../../i18n/translations'
import { generateId } from '../../utils/learnStorage'
import { useConfirm } from './ConfirmDialog'

interface Props {
    data: LearnEngineData
    t: (typeof translations)['en']
    onSave: (data: LearnEngineData) => Promise<void>
}

type View = 'list' | 'create' | 'edit' | 'study'

export function ConceptMatchBuilder({ data, t, onSave }: Props): React.ReactElement {
    const [view, setView] = useState<View>('list')
    const [editingItem, setEditingItem] = useState<ConceptMatchItem | null>(null)
    const [studyIdx, setStudyIdx] = useState(0)

    // Form
    const [title, setTitle] = useState('')
    const [pairs, setPairs] = useState<ConceptMatchPair[]>([{ left: '', right: '' }])

    // Study state
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
    const [checked, setChecked] = useState(false)

    const confirmAsync = useConfirm()
    const items = data.conceptMatchItems || []

    const currentStudyItem = items.length > 0 ? items[studyIdx % items.length] : null
    // Shuffle right-side options deterministically per card
    const shuffledRights = useMemo(
        () => {
            if (!currentStudyItem) return []
            return [...currentStudyItem.pairs.map((p) => p.right)].sort(() => Math.random() - 0.5)
        },
        // eslint-disable-next-line
        [studyIdx]
    )

    const resetForm = (): void => {
        setTitle('')
        setPairs([{ left: '', right: '' }])
        setEditingItem(null)
    }

    const openCreate = (): void => {
        resetForm()
        setView('create')
    }

    const openEdit = (item: ConceptMatchItem): void => {
        setTitle(item.title)
        setPairs([...item.pairs])
        setEditingItem(item)
        setView('edit')
    }

    const addPair = (): void => {
        setPairs([...pairs, { left: '', right: '' }])
    }

    const updatePair = (idx: number, field: 'left' | 'right', value: string): void => {
        setPairs(pairs.map((p, i) => (i === idx ? { ...p, [field]: value } : p)))
    }

    const removePair = (idx: number): void => {
        if (pairs.length <= 1) return
        setPairs(pairs.filter((_, i) => i !== idx))
    }

    const handleSubmit = async (): Promise<void> => {
        const validPairs = pairs.filter((p) => p.left.trim() && p.right.trim())
        if (!title.trim() || validPairs.length < 2) return
        if (view === 'edit' && editingItem) {
            const updated: ConceptMatchItem = { ...editingItem, title, pairs: validPairs }
            await onSave({ ...data, conceptMatchItems: data.conceptMatchItems.map((i) => (i.id === updated.id ? updated : i)) })
        } else {
            const newItem: ConceptMatchItem = { id: generateId(), title, pairs: validPairs, createdAt: Date.now() }
            await onSave({ ...data, conceptMatchItems: [...data.conceptMatchItems, newItem] })
        }
        resetForm()
        setView('list')
    }

    const handleDelete = async (id: string): Promise<void> => {
        if (!(await confirmAsync(t.learnDeleteConfirm))) return
        await onSave({ ...data, conceptMatchItems: data.conceptMatchItems.filter((i) => i.id !== id) })
    }

    const startStudy = (): void => {
        setStudyIdx(0)
        setSelectedAnswers({})
        setChecked(false)
        setView('study')
    }

    // ── Study view ──
    if (view === 'study') {
        if (items.length === 0) return <div className="le-empty">{t.learnNoItems}</div>
        const current = items[studyIdx % items.length]

        const allSelected = Object.keys(selectedAnswers).length === current.pairs.length

        const handleCheck = (): void => {
            setChecked(true)
        }

        const handleNext = (): void => {
            setSelectedAnswers({})
            setChecked(false)
            setStudyIdx(studyIdx + 1)
        }

        return (
            <div>
                <div className="le-toolbar">
                    <button className="le-btn" onClick={() => setView('list')}>← {t.learnBack}</button>
                    <span style={{ color: 'rgba(200,190,255,0.6)', fontSize: '0.82rem' }}>
                        {studyIdx + 1} / {items.length}
                    </span>
                </div>
                <div className="le-card">
                    <p className="le-card-title" style={{ marginBottom: 16 }}>{current.title}</p>
                    <div className="le-cm-game">
                        {current.pairs.map((pair, idx) => {
                            const isCorrect = checked && selectedAnswers[idx] === pair.right
                            const isWrong = checked && selectedAnswers[idx] && selectedAnswers[idx] !== pair.right
                            return (
                                <div className="le-cm-row" key={idx}>
                                    <div className="le-cm-left">{pair.left}</div>
                                    <span className="le-cm-arrow">→</span>
                                    <div className="le-cm-select" style={{ flex: 1 }}>
                                        <select
                                            className="le-select"
                                            value={selectedAnswers[idx] ?? ''}
                                            onChange={(e) => setSelectedAnswers({ ...selectedAnswers, [idx]: e.target.value })}
                                            disabled={checked}
                                            style={isCorrect ? { borderColor: '#69f0ae' } : isWrong ? { borderColor: '#ff8a80' } : undefined}
                                        >
                                            <option value="">{t.learnCMSelect}</option>
                                            {shuffledRights.map((r, ri) => (
                                                <option key={ri} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {checked && (
                                        <span className={isCorrect ? 'le-badge-correct' : 'le-badge-incorrect'}>
                                            {isCorrect ? '✓' : '✗'}
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        {!checked ? (
                            <button className="le-btn le-btn-primary" onClick={handleCheck} disabled={!allSelected}>
                                {t.learnQuizCheck}
                            </button>
                        ) : (
                            <button className="le-btn le-btn-success" onClick={handleNext}>
                                {t.learnQuizNext}
                            </button>
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
                    <span className="le-section-title" style={{ marginBottom: 0 }}>
                        {view === 'edit' ? t.learnEditItem : t.learnCreateItem}
                    </span>
                </div>
                <div className="le-card">
                    <label className="le-label">{t.learnCMTitle}</label>
                    <input className="le-input" value={title} onChange={(e) => setTitle(e.target.value)} />

                    {pairs.map((pair, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
                            <div style={{ flex: 1 }}>
                                <label className="le-label">{t.learnCMConcept} {idx + 1}</label>
                                <input className="le-input" value={pair.left} onChange={(e) => updatePair(idx, 'left', e.target.value)} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="le-label">{t.learnCMDefinition} {idx + 1}</label>
                                <input className="le-input" value={pair.right} onChange={(e) => updatePair(idx, 'right', e.target.value)} />
                            </div>
                            {pairs.length > 1 && (
                                <button className="le-btn le-btn-sm le-btn-danger" style={{ marginTop: 20 }} onClick={() => removePair(idx)}>✕</button>
                            )}
                        </div>
                    ))}

                    <button className="le-btn" style={{ marginTop: 12 }} onClick={addPair}>{t.learnCMAddPair}</button>

                    <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button className="le-btn le-btn-primary" onClick={handleSubmit} disabled={!title.trim() || pairs.filter((p) => p.left.trim() && p.right.trim()).length < 2}>{t.learnSave}</button>
                        <button className="le-btn" onClick={() => { resetForm(); setView('list') }}>{t.learnCancel}</button>
                        {(!title.trim() || pairs.filter((p) => p.left.trim() && p.right.trim()).length < 2) && (
                            <span style={{ fontSize: '0.75rem', color: '#ff8a80', marginLeft: 8 }}>{t.learnCMReqPairs}</span>
                        )}
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
                {items.length > 0 && <button className="le-btn le-btn-success" onClick={startStudy}>{t.learnCMPlay}</button>}
            </div>
            {items.length === 0 ? (
                <div className="le-empty">{t.learnNoItems}</div>
            ) : (
                items.map((item) => (
                    <div className="le-card" key={item.id}>
                        <div className="le-card-header">
                            <span className="le-card-title">{item.title} ({item.pairs.length} {t.learnCMConcept.toLowerCase()})</span>
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
