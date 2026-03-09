import React, { useState, useRef, useCallback } from 'react'
import type { LearnEngineData, ImageOcclusionItem, OcclusionMask } from '../../types/learn'
import type { translations } from '../../i18n/translations'
import { generateId } from '../../utils/learnStorage'
import { useConfirm } from './ConfirmDialog'

interface Props {
    data: LearnEngineData
    t: (typeof translations)['en']
    onSave: (data: LearnEngineData) => Promise<void>
}

type View = 'list' | 'create' | 'edit' | 'study'

export function ImageOcclusionBuilder({ data, t, onSave }: Props): React.ReactElement {
    const [view, setView] = useState<View>('list')
    const [editingItem, setEditingItem] = useState<ImageOcclusionItem | null>(null)
    const [studyIdx, setStudyIdx] = useState(0)
    const [revealedMasks, setRevealedMasks] = useState<Set<string>>(new Set())

    // Form state
    const [title, setTitle] = useState('')
    const [imageDataUrl, setImageDataUrl] = useState('')
    const [masks, setMasks] = useState<OcclusionMask[]>([])
    const [drawing, setDrawing] = useState(false)
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
    const imgRef = useRef<HTMLImageElement>(null)
    const tempMaskRef = useRef<HTMLDivElement>(null)

    const confirmAsync = useConfirm()
    const items = data.imageOcclusionItems || []

    const resetForm = (): void => {
        setTitle('')
        setImageDataUrl('')
        setMasks([])
        setEditingItem(null)
        setDrawing(false)
        setDrawStart(null)
    }

    const openCreate = (): void => {
        resetForm()
        setView('create')
    }

    const openEdit = (item: ImageOcclusionItem): void => {
        setTitle(item.title)
        setImageDataUrl(item.imageDataUrl)
        setMasks([...item.masks])
        setEditingItem(item)
        setView('edit')
    }

    const handleImageLoad = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            setImageDataUrl(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const getRelativePosition = useCallback((e: React.MouseEvent): { x: number; y: number } => {
        const img = imgRef.current
        if (!img) return { x: 0, y: 0 }
        const rect = img.getBoundingClientRect()
        return {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
        }
    }, [])

    const handleMouseDown = (e: React.MouseEvent): void => {
        if (view !== 'create' && view !== 'edit') return
        const pos = getRelativePosition(e)
        if (tempMaskRef.current) {
            tempMaskRef.current.style.display = 'block'
            tempMaskRef.current.style.left = `${pos.x}%`
            tempMaskRef.current.style.top = `${pos.y}%`
            tempMaskRef.current.style.width = `0%`
            tempMaskRef.current.style.height = `0%`
        }
        setDrawStart(pos)
        setDrawing(true)
    }

    const handleMouseMove = (e: React.MouseEvent): void => {
        if (!drawing || !drawStart) return
        const pos = getRelativePosition(e)
        const x = Math.min(drawStart.x, pos.x)
        const y = Math.min(drawStart.y, pos.y)
        const width = Math.abs(pos.x - drawStart.x)
        const height = Math.abs(pos.y - drawStart.y)

        if (tempMaskRef.current) {
            tempMaskRef.current.style.left = `${x}%`
            tempMaskRef.current.style.top = `${y}%`
            tempMaskRef.current.style.width = `${width}%`
            tempMaskRef.current.style.height = `${height}%`
        }
    }

    const handleMouseUp = (e: React.MouseEvent): void => {
        if (!drawing || !drawStart) return
        const pos = getRelativePosition(e)
        const x = Math.min(drawStart.x, pos.x)
        const y = Math.min(drawStart.y, pos.y)
        const width = Math.abs(pos.x - drawStart.x)
        const height = Math.abs(pos.y - drawStart.y)
        if (width > 2 && height > 2) {
            const newMask: OcclusionMask = { id: generateId(), x, y, width, height }
            setMasks((prev) => [...prev, newMask])
        }
        if (tempMaskRef.current) {
            tempMaskRef.current.style.display = 'none'
        }
        setDrawing(false)
        setDrawStart(null)
    }

    const removeMask = (id: string): void => {
        setMasks((prev) => prev.filter((m) => m.id !== id))
    }

    const updateMaskLabel = (id: string, label: string): void => {
        setMasks((prev) => prev.map((m) => (m.id === id ? { ...m, answerLabel: label } : m)))
    }

    const handleSubmit = async (): Promise<void> => {
        if (!imageDataUrl || masks.length === 0) return
        if (view === 'edit' && editingItem) {
            const updated: ImageOcclusionItem = { ...editingItem, title, imageDataUrl, masks }
            await onSave({ ...data, imageOcclusionItems: data.imageOcclusionItems.map((i) => (i.id === updated.id ? updated : i)) })
        } else {
            const newItem: ImageOcclusionItem = {
                id: generateId(),
                title: title || t.learnUntitled,
                imageDataUrl,
                masks,
                createdAt: Date.now(),
            }
            await onSave({ ...data, imageOcclusionItems: [...data.imageOcclusionItems, newItem] })
        }
        resetForm()
        setView('list')
    }

    const handleDelete = async (id: string): Promise<void> => {
        if (!(await confirmAsync(t.learnDeleteConfirm))) return
        await onSave({ ...data, imageOcclusionItems: data.imageOcclusionItems.filter((i) => i.id !== id) })
    }

    const startStudy = (): void => {
        setStudyIdx(0)
        setRevealedMasks(new Set())
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
                    <p className="le-card-title" style={{ marginBottom: 4 }}>{current.title}</p>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(200,190,255,0.7)', marginBottom: 12 }}>
                        {t.learnIOInstruction}
                    </p>
                    <div className="le-io-canvas-wrapper">
                        <img src={current.imageDataUrl} alt={current.title} />
                        {current.masks.map((m) => (
                            <div
                                key={m.id}
                                className={`le-io-mask ${revealedMasks.has(m.id) ? 'revealed' : ''}`}
                                style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.width}%`, height: `${m.height}%` }}
                                onClick={() => setRevealedMasks((prev) => new Set(prev).add(m.id))}
                            >
                                {revealedMasks.has(m.id) && m.answerLabel ? m.answerLabel : ''}
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <button className="le-btn le-btn-primary" onClick={() => setRevealedMasks(new Set(current.masks.map((m) => m.id)))}>
                            {t.learnReveal}
                        </button>
                        <button className="le-btn le-btn-success" onClick={() => { setRevealedMasks(new Set()); setStudyIdx(studyIdx + 1); }}>
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
                    <span className="le-section-title" style={{ marginBottom: 0 }}>
                        {view === 'edit' ? t.learnEditItem : t.learnCreateItem}
                    </span>
                </div>
                <div className="le-card">
                    <label className="le-label">{t.learnIOTitle}</label>
                    <input className="le-input" value={title} onChange={(e) => setTitle(e.target.value)} />

                    <label className="le-label">{t.learnIOLoadImage}</label>
                    <input type="file" accept="image/*" onChange={handleImageLoad} style={{ marginBottom: 12 }} />

                    {imageDataUrl && (
                        <>
                            <p style={{ fontSize: '0.78rem', color: 'rgba(200,190,255,0.5)', marginBottom: 8 }}>{t.learnIOAddMask}</p>
                            <div
                                className="le-io-canvas-wrapper"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                style={{ cursor: 'crosshair', userSelect: 'none' }}
                            >
                                <img ref={imgRef} src={imageDataUrl} alt="occlusion" draggable={false} style={{ pointerEvents: 'none' }} />
                                {masks.map((m) => (
                                    <div
                                        key={m.id}
                                        className="le-io-mask"
                                        style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.width}%`, height: `${m.height}%` }}
                                    >
                                        <span style={{ fontSize: '0.65rem' }}>✕</span>
                                    </div>
                                ))}
                                <div ref={tempMaskRef} className="le-io-mask" style={{ display: 'none', background: 'rgba(50, 180, 80, 0.4)', borderColor: '#69f0ae', pointerEvents: 'none' }} />
                            </div>
                            {masks.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                    {masks.map((m, idx) => (
                                        <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                            <span style={{ fontSize: '0.78rem', color: 'rgba(200,190,255,0.5)', width: 60 }}>Mask {idx + 1}</span>
                                            <input
                                                className="le-input"
                                                style={{ flex: 1 }}
                                                placeholder={t.learnIOMaskLabel}
                                                value={m.answerLabel ?? ''}
                                                onChange={(e) => updateMaskLabel(m.id, e.target.value)}
                                            />
                                            <button className="le-btn le-btn-sm le-btn-danger" onClick={() => removeMask(m.id)}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button className="le-btn le-btn-primary" onClick={handleSubmit} disabled={!imageDataUrl || masks.length === 0}>
                            {t.learnSave}
                        </button>
                        <button className="le-btn" onClick={() => { resetForm(); setView('list') }}>
                            {t.learnCancel}
                        </button>
                        {(!imageDataUrl || masks.length === 0) && (
                            <span style={{ fontSize: '0.75rem', color: '#ff8a80', marginLeft: 8 }}>{t.learnIOReqMask}</span>
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
                {items.length > 0 && <button className="le-btn le-btn-success" onClick={startStudy}>{t.learnStartStudy}</button>}
            </div>
            {items.length === 0 ? (
                <div className="le-empty">{t.learnNoItems}</div>
            ) : (
                items.map((item) => (
                    <div className="le-card" key={item.id}>
                        <div className="le-card-header">
                            <span className="le-card-title">{item.title} ({item.masks.length} {t.learnMasks})</span>
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
