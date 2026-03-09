import React, { useState } from 'react'
import type { LearnEngineData, CodeCompletionItem } from '../../types/learn'
import type { translations } from '../../i18n/translations'
import { generateId, updateItemProgress } from '../../utils/learnStorage'

interface Props {
    data: LearnEngineData
    t: (typeof translations)['en']
    onSave: (data: LearnEngineData) => Promise<void>
}

type View = 'list' | 'create' | 'edit' | 'study'

export function CodeCompletionBuilder({ data, t, onSave }: Props): React.ReactElement {
    const [view, setView] = useState<View>('list')
    const [editingItem, setEditingItem] = useState<CodeCompletionItem | null>(null)
    const [studyIdx, setStudyIdx] = useState(0)
    const [revealed, setRevealed] = useState(false)

    // An array of user guess strings for each blank in the current item
    const [guesses, setGuesses] = useState<string[]>([])
    const [checked, setChecked] = useState(false)

    // Form state
    const [language, setLanguage] = useState('javascript')
    const [codeText, setCodeText] = useState('')
    const [answersText, setAnswersText] = useState('')
    const [explanation, setExplanation] = useState('')

    const items = data.codeCompletionItems || []

    const resetForm = (): void => {
        setLanguage('javascript')
        setCodeText('')
        setAnswersText('')
        setExplanation('')
        setEditingItem(null)
    }

    const openCreate = (): void => {
        resetForm()
        setView('create')
    }

    const openEdit = (item: CodeCompletionItem): void => {
        setLanguage(item.language)
        setCodeText(item.codeLines.join('____'))
        setAnswersText(item.blanks.join('\n'))
        setExplanation(item.explanation ?? '')
        setEditingItem(item)
        setView('edit')
    }

    const handleSubmit = async (): Promise<void> => {
        if (!codeText.trim() || !answersText.trim()) return

        const codeLines = codeText.split(/_{3,}/)
        const blanks = answersText.split('\n').map(b => b.trim()).filter(Boolean)

        if (blanks.length !== codeLines.length - 1) {
            alert(`The number of blanks (___ or ____) in your code (${codeLines.length - 1}) must match the number of answers provided (${blanks.length}).`)
            return
        }

        if (view === 'edit' && editingItem) {
            const updated: CodeCompletionItem = {
                ...editingItem,
                language,
                codeLines,
                blanks,
                explanation: explanation || undefined,
            }
            await onSave({
                ...data,
                codeCompletionItems: data.codeCompletionItems.map((i) => (i.id === updated.id ? updated : i)),
            })
        } else {
            const newItem: CodeCompletionItem = {
                id: generateId(),
                language,
                codeLines,
                blanks,
                explanation: explanation || undefined,
                createdAt: Date.now(),
            }
            await onSave({ ...data, codeCompletionItems: [...(data.codeCompletionItems || []), newItem] })
        }
        resetForm()
        setView('list')
    }

    const handleDelete = async (id: string): Promise<void> => {
        if (!confirm(t.learnDeleteConfirm)) return
        await onSave({ ...data, codeCompletionItems: data.codeCompletionItems.filter((i) => i.id !== id) })
    }

    const startStudy = (): void => {
        setStudyIdx(0)
        setRevealed(false)
        setChecked(false)
        setGuesses(Array(items[0]?.blanks.length || 0).fill(''))
        setView('study')
    }

    // ── Study view ──
    if (view === 'study') {
        if (items.length === 0) return <div className="le-empty">{t.learnNoItems}</div>
        const current = items[studyIdx % items.length]

        const handleCheck = (): void => {
            const isAllFilled = guesses.every(g => g.trim().length > 0)
            if (!isAllFilled) {
                alert(t.learnPleaseFillAll)
                return
            }
            setChecked(true)
            const isAllCorrect = guesses.every((g, i) => g.trim() === current.blanks[i].trim())
            onSave(updateItemProgress(data, current.id, isAllCorrect))
        }

        const handleNext = (): void => {
            setRevealed(false)
            setChecked(false)
            setStudyIdx((prev) => prev + 1)
            const nextItem = items[(studyIdx + 1) % items.length]
            setGuesses(Array(nextItem.blanks.length).fill(''))
        }

        const isAllCorrect = checked && guesses.every((g, i) => g.trim() === current.blanks[i].trim())

        return (
            <div>
                <div className="le-toolbar">
                    <button className="le-btn" onClick={() => setView('list')}>← {t.learnBack}</button>
                    <span style={{ color: 'rgba(200,190,255,0.6)', fontSize: '0.82rem' }}>
                        {studyIdx + 1} / {items.length}
                    </span>
                </div>
                <div className="le-card">
                    <div className="le-code-lang">{current.language}</div>
                    <pre className="le-code-block" style={{ whiteSpace: 'pre-wrap', lineHeight: 2 }}>
                        {current.codeLines.map((part, idx) => (
                            <React.Fragment key={idx}>
                                {part}
                                {idx < current.codeLines.length - 1 && (
                                    <span style={{ display: 'inline-block', margin: '0 4px' }}>
                                        {revealed ? (
                                            <span style={{ color: '#69f0ae', fontWeight: 'bold' }}>{current.blanks[idx]}</span>
                                        ) : (
                                            <input
                                                className="le-input le-cloze-input"
                                                style={{
                                                    width: Math.max(80, guesses[idx]?.length * 10 + 20) + 'px',
                                                    padding: '2px 8px',
                                                    background: checked ? (guesses[idx].trim() === current.blanks[idx].trim() ? 'rgba(105, 240, 174, 0.2)' : 'rgba(255, 138, 128, 0.2)') : 'rgba(10,10,25,0.6)',
                                                    border: checked ? (guesses[idx].trim() === current.blanks[idx].trim() ? '1px solid #69f0ae' : '1px solid #ff8a80') : '1px solid rgba(120,80,220,0.5)',
                                                    color: '#e8eaf6'
                                                }}
                                                value={guesses[idx]}
                                                onChange={(e) => {
                                                    const newGuesses = [...guesses]
                                                    newGuesses[idx] = e.target.value
                                                    setGuesses(newGuesses)
                                                }}
                                                disabled={checked || revealed}
                                                placeholder="..."
                                            />
                                        )}
                                    </span>
                                )}
                            </React.Fragment>
                        ))}
                    </pre>

                    {checked && !revealed && (
                        <div style={{ marginTop: 16 }}>
                            {isAllCorrect ? (
                                <p className="le-badge-correct" style={{ fontSize: '1.1rem', marginBottom: 12 }}>
                                    ✓ {t.learnCorrect}
                                </p>
                            ) : (
                                <p className="le-badge-incorrect" style={{ fontSize: '1.1rem', marginBottom: 12 }}>
                                    ✗ {t.learnSomeIncorrect}
                                </p>
                            )}
                        </div>
                    )}

                    {!checked && !revealed && (
                        <button className="le-btn le-btn-primary" style={{ marginTop: 16 }} onClick={handleCheck} disabled={guesses.some(g => !g.trim())}>
                            {t.learnCheckCode}
                        </button>
                    )}

                    {checked && !revealed && !isAllCorrect && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                            <button className="le-btn le-btn-primary" onClick={() => {
                                setChecked(false)
                                setGuesses(Array(current.blanks.length).fill(''))
                            }}>
                                {t.learnTryAgain}
                            </button>
                            <button className="le-btn le-btn-danger" onClick={() => setRevealed(true)}>
                                {t.learnShowAnswers}
                            </button>
                        </div>
                    )}

                    {(isAllCorrect || revealed) && (
                        <div style={{ marginTop: 16 }}>
                            {current.explanation && (
                                <p style={{ fontSize: '0.85rem', color: 'rgba(200,190,255,0.6)', marginTop: 8, marginBottom: 16 }}>
                                    {current.explanation}
                                </p>
                            )}
                            <button className="le-btn le-btn-success" onClick={handleNext}>
                                {t.nextQuestion}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ── Create / Edit form ──
    if (view === 'create' || view === 'edit') {
        const currentLines = codeText.split(/_{3,}/).length
        const blanksNeeded = Math.max(0, currentLines - 1)
        const currentAnswers = answersText.split('\n').filter(b => b.trim()).length

        return (
            <div>
                <div className="le-toolbar">
                    <button className="le-btn" onClick={() => { resetForm(); setView('list') }}>← {t.learnBack}</button>
                    <span className="le-section-title" style={{ marginBottom: 0 }}>
                        {view === 'edit' ? t.learnEditItem : t.learnCreateItem}
                    </span>
                </div>
                <div className="le-card">
                    <label className="le-label">{t.learnCCLanguage}</label>
                    <input className="le-input" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. javascript, python, rust" />

                    <label className="le-label" style={{ marginTop: 16 }}>{t.learnCCCodeInfo}</label>
                    <textarea
                        className="le-textarea"
                        style={{ fontFamily: 'monospace', minHeight: 120 }}
                        value={codeText}
                        onChange={(e) => setCodeText(e.target.value)}
                        placeholder="function add(a, b) {&#10;  return ____ + b;&#10;}"
                    />

                    <label className="le-label" style={{ marginTop: 16 }}>{t.learnCCAnswersInfo}</label>
                    <textarea
                        className="le-textarea"
                        value={answersText}
                        onChange={(e) => setAnswersText(e.target.value)}
                        placeholder="a"
                        rows={5}
                    />
                    <div style={{ fontSize: '0.8rem', color: blanksNeeded === currentAnswers ? '#69f0ae' : '#ff8a80', marginTop: 4 }}>
                        {t.learnCCBlanksCount}: {blanksNeeded} | {t.learnCCAnswersProvided}: {currentAnswers}
                    </div>

                    <label className="le-label" style={{ marginTop: 16 }}>{t.learnCCExplanationInfo}</label>
                    <textarea className="le-textarea" value={explanation} onChange={(e) => setExplanation(e.target.value)} />

                    <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                        <button className="le-btn le-btn-primary" onClick={handleSubmit} disabled={blanksNeeded === 0 || blanksNeeded !== currentAnswers}>
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
                            <span className="le-card-title">{item.language}: {item.codeLines[0]?.slice(0, 40)}...____...</span>
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
