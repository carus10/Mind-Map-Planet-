import React, { useState } from 'react'
import type { LearnEngineData, ApiRecallItem } from '../../types/learn'
import type { translations } from '../../i18n/translations'
import { generateId } from '../../utils/learnStorage'
import { useConfirm } from './ConfirmDialog'

interface Props {
    data: LearnEngineData
    t: (typeof translations)['en']
    onSave: (data: LearnEngineData) => Promise<void>
}

type View = 'list' | 'create' | 'edit' | 'study'

export function ApiRecallBuilder({ data, t, onSave }: Props): React.ReactElement {
    const [view, setView] = useState<View>('list')
    const [editingItem, setEditingItem] = useState<ApiRecallItem | null>(null)
    const [studyIdx, setStudyIdx] = useState(0)
    const [flipped, setFlipped] = useState(false)

    // Form
    const [apiName, setApiName] = useState('')
    const [signature, setSignature] = useState('')
    const [usageDescription, setUsageDescription] = useState('')
    const [example, setExample] = useState('')
    const [returnInfo, setReturnInfo] = useState('')

    const confirmAsync = useConfirm()
    const items = data.apiRecallItems || []

    const resetForm = (): void => {
        setApiName('')
        setSignature('')
        setUsageDescription('')
        setExample('')
        setReturnInfo('')
        setEditingItem(null)
    }

    const openCreate = (): void => { resetForm(); setView('create') }

    const openEdit = (item: ApiRecallItem): void => {
        setApiName(item.apiName)
        setSignature(item.signature ?? '')
        setUsageDescription(item.usageDescription)
        setExample(item.example ?? '')
        setReturnInfo(item.returnInfo ?? '')
        setEditingItem(item)
        setView('edit')
    }

    const handleSubmit = async (): Promise<void> => {
        if (!apiName.trim() || !usageDescription.trim()) return
        if (view === 'edit' && editingItem) {
            const updated: ApiRecallItem = { ...editingItem, apiName, signature: signature || undefined, usageDescription, example: example || undefined, returnInfo: returnInfo || undefined }
            await onSave({ ...data, apiRecallItems: data.apiRecallItems.map((i) => (i.id === updated.id ? updated : i)) })
        } else {
            const newItem: ApiRecallItem = { id: generateId(), apiName, signature: signature || undefined, usageDescription, example: example || undefined, returnInfo: returnInfo || undefined, createdAt: Date.now() }
            await onSave({ ...data, apiRecallItems: [...data.apiRecallItems, newItem] })
        }
        resetForm()
        setView('list')
    }

    const handleDelete = async (id: string): Promise<void> => {
        if (!(await confirmAsync(t.learnDeleteConfirm))) return
        await onSave({ ...data, apiRecallItems: data.apiRecallItems.filter((i) => i.id !== id) })
    }

    const startStudy = (): void => {
        setStudyIdx(0)
        setFlipped(false)
        setView('study')
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
                <div className="le-flip-card" onClick={() => setFlipped(!flipped)}>
                    <div className={`le-flip-inner ${flipped ? 'flipped' : ''}`}>
                        {/* Front */}
                        <div className="le-flip-front">
                            <div className="le-card" style={{ minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <p style={{ fontSize: '1.3rem', fontWeight: 600, color: '#c5b8ff', marginBottom: 8 }}>{current.apiName}</p>
                                {current.signature && <pre className="le-code-block" style={{ fontSize: '0.82rem', padding: 8, marginBottom: 8 }}>{current.signature}</pre>}
                                <p style={{ fontSize: '0.82rem', color: 'rgba(200,190,255,0.4)', marginTop: 12 }}>{t.learnARFlip}</p>
                            </div>
                        </div>
                        {/* Back */}
                        <div className="le-flip-back">
                            <div className="le-card" style={{ minHeight: 200 }}>
                                <p style={{ fontSize: '0.95rem', color: '#e8eaf6', marginBottom: 12 }}>{current.usageDescription}</p>
                                {current.example && (
                                    <>
                                        <span style={{ fontSize: '0.78rem', color: 'rgba(200,190,255,0.5)' }}>{t.learnARExample}:</span>
                                        <pre className="le-code-block" style={{ marginTop: 4, marginBottom: 8 }}>{current.example}</pre>
                                    </>
                                )}
                                {current.returnInfo && (
                                    <p style={{ fontSize: '0.82rem', color: 'rgba(200,190,255,0.6)' }}>↩ {current.returnInfo}</p>
                                )}
                                <p style={{ fontSize: '0.82rem', color: 'rgba(200,190,255,0.4)', marginTop: 12, textAlign: 'center' }}>{t.learnARFlip}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button className="le-btn le-btn-success" onClick={() => { setFlipped(false); setStudyIdx(studyIdx + 1) }}>{t.learnQuizNext}</button>
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
                    <label className="le-label">{t.learnARName}</label>
                    <input className="le-input" value={apiName} onChange={(e) => setApiName(e.target.value)} />

                    <label className="le-label">{t.learnARSignature}</label>
                    <input className="le-input" value={signature} onChange={(e) => setSignature(e.target.value)} />

                    <label className="le-label">{t.learnARDescription}</label>
                    <textarea className="le-textarea" value={usageDescription} onChange={(e) => setUsageDescription(e.target.value)} />

                    <label className="le-label">{t.learnARExample}</label>
                    <textarea className="le-textarea" style={{ fontFamily: 'monospace' }} value={example} onChange={(e) => setExample(e.target.value)} />

                    <label className="le-label">{t.learnARReturn}</label>
                    <input className="le-input" value={returnInfo} onChange={(e) => setReturnInfo(e.target.value)} />

                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        <button className="le-btn le-btn-primary" onClick={handleSubmit} disabled={!apiName.trim() || !usageDescription.trim()}>{t.learnSave}</button>
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
                            <span className="le-card-title">{item.apiName}</span>
                            <div className="le-card-actions">
                                <button className="le-btn le-btn-sm" onClick={() => openEdit(item)}>{t.learnEditMode}</button>
                                <button className="le-btn le-btn-sm le-btn-danger" onClick={() => handleDelete(item.id)}>✕</button>
                            </div>
                        </div>
                        {item.signature && <pre style={{ fontSize: '0.75rem', color: 'rgba(200,190,255,0.5)', fontFamily: 'monospace' }}>{item.signature}</pre>}
                    </div>
                ))
            )}
        </div>
    )
}
