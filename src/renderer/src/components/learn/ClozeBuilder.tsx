import React, { useState } from 'react'
import type { LearnEngineData, ClozeItem } from '../../types/learn'
import type { translations } from '../../i18n/translations'
import { generateId } from '../../utils/learnStorage'

interface Props {
    data: LearnEngineData
    t: (typeof translations)['en']
    onSave: (data: LearnEngineData) => Promise<void>
}

type View = 'list' | 'create' | 'edit' | 'study'

export function ClozeBuilder({ data, t, onSave }: Props): React.ReactElement {
    const [view, setView] = useState<View>('list')
    const [editingItem, setEditingItem] = useState<ClozeItem | null>(null)
    const [studyIdx, setStudyIdx] = useState(0)
    const [revealed, setRevealed] = useState(false)

    // Form state
    const [sourceText, setSourceText] = useState('')
    const [hiddenText, setHiddenText] = useState('')
    const [hint, setHint] = useState('')
    const [tags, setTags] = useState('')

    const items = data.clozeItems

    const resetForm = (): void => {
        setSourceText('')
        setHiddenText('')
        setHint('')
        setTags('')
        setEditingItem(null)
    }

    const openCreate = (): void => {
        resetForm()
        setView('create')
    }

    const openEdit = (item: ClozeItem): void => {
        setSourceText(item.sourceText)
        setHiddenText(item.hiddenText)
        setHint(item.hint ?? '')
        setTags(item.tags.join(', '))
        setEditingItem(item)
        setView('edit')
    }

    const buildRenderedPrompt = (source: string, hidden: string): string => {
        return source.replace(hidden, '______')
    }

    const handleSubmit = async (): Promise<void> => {
        if (!sourceText.trim() || !hiddenText.trim()) return
        const renderedPrompt = buildRenderedPrompt(sourceText, hiddenText)

        if (view === 'edit' && editingItem) {
            const updated: ClozeItem = {
                ...editingItem,
                sourceText,
                hiddenText,
                renderedPrompt,
                answer: hiddenText,
                hint: hint || undefined,
                tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
            }
            await onSave({
                ...data,
                clozeItems: data.clozeItems.map((i) => (i.id === updated.id ? updated : i)),
            })
        } else {
            const newItem: ClozeItem = {
                id: generateId(),
                sourceText,
                hiddenText,
                renderedPrompt,
                answer: hiddenText,
                hint: hint || undefined,
                tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
                createdAt: Date.now(),
            }
            await onSave({ ...data, clozeItems: [...data.clozeItems, newItem] })
        }
        resetForm()
        setView('list')
    }

    const handleDelete = async (id: string): Promise<void> => {
        if (!confirm(t.learnDeleteConfirm)) return
        await onSave({ ...data, clozeItems: data.clozeItems.filter((i) => i.id !== id) })
    }

    const startStudy = (): void => {
        setStudyIdx(0)
        setRevealed(false)
        setView('study')
    }

    // ── Study view ──
    if (view === 'study') {
        if (items.length === 0) return <div className="le-empty">{t.learnNoItems}</div>
        const current = items[studyIdx % items.length]
        return (
            <div>
                <div className="le-toolbar">
                    <button className="le-btn" onClick={() => setView('list')}>← {t.learnBack}</button>
                    <span style={{ color: 'rgba(200,190,255,0.6)', fontSize: '0.82rem' }}>
                        {studyIdx + 1} / {items.length}
                    </span>
                </div>
                <div className="le-card">
                    <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#e8eaf6', marginBottom: 16 }}>
                        {current.renderedPrompt}
                    </p>
                    {current.hint && !revealed && (
                        <p style={{ fontSize: '0.82rem', color: 'rgba(200,190,255,0.5)', marginBottom: 12 }}>
                            💡 {t.learnHint}: {current.hint}
                        </p>
                    )}
                    {!revealed ? (
                        <button className="le-btn le-btn-primary" onClick={() => setRevealed(true)}>
                            {t.learnClozeShowAnswer}
                        </button>
                    ) : (
                        <div>
                            <p className="le-badge-correct" style={{ fontSize: '1.1rem', marginBottom: 12 }}>
                                {current.answer}
                            </p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="le-btn le-btn-danger" onClick={() => { setRevealed(false); }}>
                                    {t.learnClozeAgain}
                                </button>
                                <button className="le-btn le-btn-success" onClick={() => { setRevealed(false); setStudyIdx(studyIdx + 1); }}>
                                    {t.learnClozeGood}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ── Create / Edit form ──
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
                    <label className="le-label">{t.learnClozeSourceText}</label>
                    <textarea className="le-textarea" value={sourceText} onChange={(e) => setSourceText(e.target.value)} />

                    <label className="le-label">{t.learnClozeHiddenText}</label>
                    <input className="le-input" value={hiddenText} onChange={(e) => setHiddenText(e.target.value)} />

                    <label className="le-label">{t.learnClozeHint}</label>
                    <input className="le-input" value={hint} onChange={(e) => setHint(e.target.value)} />

                    <label className="le-label">{t.learnClozeTags}</label>
                    <input className="le-input" value={tags} onChange={(e) => setTags(e.target.value)} />

                    {sourceText && hiddenText && (
                        <div style={{ marginTop: 16, padding: 12, background: 'rgba(120,80,220,0.08)', borderRadius: 8 }}>
                            <span style={{ fontSize: '0.78rem', color: 'rgba(200,190,255,0.5)' }}>Preview:</span>
                            <p style={{ color: '#e8eaf6', marginTop: 4 }}>{buildRenderedPrompt(sourceText, hiddenText)}</p>
                        </div>
                    )}

                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        <button className="le-btn le-btn-primary" onClick={handleSubmit}>
                            {t.learnSave}
                        </button>
                        <button className="le-btn" onClick={() => { resetForm(); setView('list') }}>
                            {t.learnCancel}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ── List view ──
    return (
        <div>
            <div className="le-toolbar">
                <button className="le-btn le-btn-primary" onClick={openCreate}>{t.learnAddNew}</button>
                {items.length > 0 && (
                    <button className="le-btn le-btn-success" onClick={startStudy}>{t.learnStartStudy}</button>
                )}
            </div>
            {items.length === 0 ? (
                <div className="le-empty">{t.learnNoItems}</div>
            ) : (
                items.map((item) => (
                    <div className="le-card" key={item.id}>
                        <div className="le-card-header">
                            <span className="le-card-title">{item.renderedPrompt}</span>
                            <div className="le-card-actions">
                                <button className="le-btn le-btn-sm" onClick={() => openEdit(item)}>{t.learnEditMode}</button>
                                <button className="le-btn le-btn-sm le-btn-danger" onClick={() => handleDelete(item.id)}>✕</button>
                            </div>
                        </div>
                        {item.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {item.tags.map((tag, i) => (
                                    <span key={i} style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(120,80,220,0.15)', borderRadius: 10, color: 'rgba(200,190,255,0.7)' }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    )
}
