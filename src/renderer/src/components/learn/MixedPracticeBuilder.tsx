import React, { useState, useMemo } from 'react'
import { updateItemProgress } from '../../utils/learnStorage'
import type { LearnEngineData, LearnMode, LearnItemProgress, CodeCompletionItem } from '../../types/learn'
import type { translations } from '../../i18n/translations'

interface Props {
    data: LearnEngineData
    t: (typeof translations)['en']
    onSave: (updated: LearnEngineData) => void
    availableModes: LearnMode[]
}

type MixedItemType =
    | { mode: 'cloze', item: any }
    | { mode: 'imageOcclusion', item: any }
    | { mode: 'conceptMatch', item: any }
    | { mode: 'quiz', item: any }
    | { mode: 'outputPrediction', item: any }
    | { mode: 'apiRecall', item: any }
    | { mode: 'realProblem', item: any }
    | { mode: 'codeCompletion', item: any }

export function MixedPracticeBuilder({ data, t, onSave, availableModes }: Props): React.ReactElement {
    const [isStudying, setIsStudying] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [studyMode, setStudyMode] = useState<'normal' | 'onlyNew' | 'onlyWeak' | 'quickReview'>('normal')

    // Shared generic state for different item types
    const [guess, setGuess] = useState('')
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [checked, setChecked] = useState(false)
    const [revealed, setRevealed] = useState(false)
    const [pairs, setPairs] = useState<{ left: string; rightId: string }[]>([])
    const [ccGuesses, setCcGuesses] = useState<string[]>([])
    // We will initialize pairs when a conceptMatch item is rendered

    // Aggregate all available items across the allowed modes
    const allItems = useMemo(() => {
        const items: MixedItemType[] = []
        if (availableModes.includes('cloze')) {
            (data.clozeItems || []).forEach(i => items.push({ mode: 'cloze', item: i }))
        }
        if (availableModes.includes('imageOcclusion')) {
            (data.imageOcclusionItems || []).forEach(i => items.push({ mode: 'imageOcclusion', item: i }))
        }
        if (availableModes.includes('conceptMatch')) {
            (data.conceptMatchItems || []).forEach(i => items.push({ mode: 'conceptMatch', item: i }))
        }
        if (availableModes.includes('quiz')) {
            (data.quizItems || []).forEach(i => items.push({ mode: 'quiz', item: i }))
        }
        if (availableModes.includes('outputPrediction')) {
            (data.outputPredictionItems || []).forEach(i => items.push({ mode: 'outputPrediction', item: i }))
        }
        if (availableModes.includes('apiRecall')) {
            (data.apiRecallItems || []).forEach(i => items.push({ mode: 'apiRecall', item: i }))
        }
        if (availableModes.includes('realProblem')) {
            (data.realProblemItems || []).forEach(i => items.push({ mode: 'realProblem', item: i }))
        }
        if (availableModes.includes('codeCompletion')) {
            (data.codeCompletionItems || []).forEach(i => items.push({ mode: 'codeCompletion', item: i }))
        }

        // Filter based on study mode
        let filtered = items
        if (studyMode === 'onlyNew') {
            filtered = items.filter(i => {
                const prog = data.progress?.[i.item.id]
                return !prog || (prog.correctCount === 0 && prog.wrongCount === 0)
            })
        } else if (studyMode === 'onlyWeak') {
            filtered = items.filter(i => {
                const prog = data.progress?.[i.item.id]
                if (!prog) return true // unstudied counts as weak
                const total = prog.correctCount + prog.wrongCount
                if (total === 0) return true
                return (prog.correctCount / total) < 0.75 // less than 75% accuracy
            })
        }

        // Shuffle items for mixed practice
        for (let i = filtered.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
        }

        if (studyMode === 'quickReview') {
            return filtered.slice(0, 10) // Only take 10 random items
        }

        return filtered
    }, [data, availableModes, studyMode])

    const currentMixedItem = allItems[currentIndex]

    // Initialize concept match state if needed
    React.useEffect(() => {
        if (isStudying && currentMixedItem?.mode === 'conceptMatch') {
            const item = currentMixedItem.item
            setPairs(item.pairs.map((p: any) => ({ left: p.left, rightId: '' })))
        } else if (isStudying && currentMixedItem?.mode === 'codeCompletion') {
            setCcGuesses(Array(currentMixedItem.item.blanks.length).fill(''))
        }
    }, [currentIndex, currentMixedItem, isStudying])

    const startStudy = () => {
        if (allItems.length === 0) return
        setCurrentIndex(0)
        setIsStudying(true)
    }

    if (!isStudying) {
        return (
            <div className="le-builder">
                <div className="le-builder-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <h2>Mixed Practice</h2>
                        <select className="le-input" style={{ width: 140, padding: '4px 8px' }} value={studyMode} onChange={(e) => setStudyMode(e.target.value as any)}>
                            <option value="normal">{t.normalMode || 'Normal'}</option>
                            <option value="onlyNew">{t.onlyNewMode || 'Only New'}</option>
                            <option value="onlyWeak">{t.onlyWeakMode || 'Only Weak'}</option>
                            <option value="quickReview">{t.quickReviewMode || 'Quick Review'}</option>
                        </select>
                    </div>
                    <div className="le-builder-actions">
                        <button className="le-btn le-btn-primary" onClick={startStudy} disabled={allItems.length === 0}>
                            {t.mixedPracticeStart}
                        </button>
                    </div>
                </div>
                {allItems.length === 0 ? (
                    <div className="le-empty-state">
                        <div className="le-empty-icon">🔀</div>
                        <p>{t.mixedPracticeEmpty}</p>
                    </div>
                ) : (
                    <div className="le-editor-section" style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔀</div>
                        <h3>{allItems.length} {t.mixedPracticeReady}</h3>
                        <p style={{ color: 'var(--text-muted)' }}>{t.mixedPracticeDesc}</p>
                    </div>
                )}
            </div>
        )
    }

    const handleNext = () => {
        if (currentIndex < allItems.length - 1) {
            setCurrentIndex(prev => prev + 1)
            // Reset generic states for the next item
            setGuess('')
            setSelectedOption(null)
            setChecked(false)
            setRevealed(false)
            setPairs([])
            setCcGuesses([])
        } else {
            setIsStudying(false)
        }
    }

    const renderCloze = (item: any) => {
        const isMatch = revealed && guess.trim().toLowerCase() === item.answer.trim().toLowerCase()
        return (
            <div className="le-card">
                <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#e8eaf6' }}>
                    {item.renderedPrompt.split('____').map((part: string, idx: number, arr: string[]) => (
                        <React.Fragment key={idx}>
                            <span>{part}</span>
                            {idx < arr.length - 1 && (
                                <span className={revealed && !isMatch ? 'le-cloze-blank-error' : 'le-cloze-blank'}>
                                    {revealed ? item.answer : '.........'}
                                </span>
                            )}
                        </React.Fragment>
                    ))}
                </p>
                {item.hint && <p style={{ fontSize: '0.85rem', color: 'rgba(200,190,255,0.6)', marginTop: 8 }}>{t.learnHint}: {item.hint}</p>}

                <div style={{ marginTop: 24 }}>
                    <label className="le-label">Your Answer</label>
                    <input className="le-input" style={{ fontSize: '1.1rem', padding: '12px 16px' }} value={guess} onChange={(e) => setGuess(e.target.value)} disabled={revealed} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && !revealed && guess.trim()) setRevealed(true) }} />
                </div>

                <div style={{ marginTop: 16 }}>
                    {!revealed ? (
                        <button className="le-btn le-btn-primary" onClick={() => {
                            setRevealed(true)
                            const isCorrect = guess.trim().toLowerCase() === item.answer.trim().toLowerCase()
                            onSave(updateItemProgress(data, item.id, isCorrect))
                        }} disabled={!guess.trim()}>Check Answer</button>
                    ) : (
                        <div>
                            <p className={isMatch ? 'le-badge-correct' : 'le-badge-incorrect'}>{isMatch ? `✓ ${t.learnCorrect}` : `✗ ${t.learnIncorrect}`}</p>
                            {!isMatch && <p style={{ marginTop: 8, color: '#e8eaf6' }}>Correct Answer: <span style={{ color: '#69f0ae', fontWeight: 600 }}>{item.answer}</span></p>}
                            <button className="le-btn le-btn-success" style={{ marginTop: 16 }} onClick={handleNext}>Next Item</button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const renderQuiz = (item: any) => {
        const isCorrect = selectedOption === item.correctIndex
        return (
            <div className="le-card">
                <p style={{ fontSize: '1.05rem', fontWeight: 500, color: '#e8eaf6', marginBottom: 16 }}>{item.question}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {item.options.map((opt: string, idx: number) => {
                        let optStyle: React.CSSProperties = { padding: '10px 14px', borderRadius: 8, cursor: checked ? 'default' : 'pointer', border: '1px solid rgba(120,80,220,0.2)', background: 'rgba(10,10,25,0.5)', color: '#e8eaf6', textAlign: 'left', fontSize: '0.88rem', transition: 'all 0.2s ease' }
                        if (selectedOption === idx && !checked) optStyle = { ...optStyle, borderColor: 'rgba(120,80,220,0.6)', background: 'rgba(120,80,220,0.2)' }
                        if (checked && idx === item.correctIndex) optStyle = { ...optStyle, borderColor: '#69f0ae', background: 'rgba(50,180,80,0.15)' }
                        if (checked && selectedOption === idx && idx !== item.correctIndex) optStyle = { ...optStyle, borderColor: '#ff8a80', background: 'rgba(220,50,50,0.15)' }
                        return <button key={idx} style={optStyle} onClick={() => { if (!checked) setSelectedOption(idx) }}>{opt}</button>
                    })}
                </div>
                {checked && (
                    <div style={{ marginTop: 12 }}>
                        <p className={isCorrect ? 'le-badge-correct' : 'le-badge-incorrect'}>{isCorrect ? `✓ ${t.learnCorrect}` : `✗ ${t.learnIncorrect}`}</p>
                        {item.explanation && <p style={{ fontSize: '0.85rem', color: 'rgba(200,190,255,0.6)', marginTop: 6 }}>{item.explanation}</p>}
                    </div>
                )}
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                    {!checked ? (
                        <button className="le-btn le-btn-primary" onClick={() => {
                            setChecked(true)
                            const isCorrect = selectedOption === item.correctIndex
                            onSave(updateItemProgress(data, item.id, isCorrect))
                        }} disabled={selectedOption === null}>{t.learnQuizCheck}</button>
                    ) : (
                        <button className="le-btn le-btn-success" onClick={handleNext}>{t.learnQuizNext}</button>
                    )}
                </div>
            </div>
        )
    }

    const renderOutputPrediction = (item: any) => {
        const isMatch = revealed && guess.trim() === item.expectedOutput.trim()
        return (
            <div className="le-card">
                <div className="le-code-lang">{item.language}</div>
                <pre className="le-code-block">{item.code}</pre>
                <label className="le-label" style={{ marginTop: 16 }}>{t.learnOPYourGuess}</label>
                <textarea className="le-textarea" value={guess} onChange={(e) => setGuess(e.target.value)} disabled={revealed} />
                {!revealed ? (
                    <button className="le-btn le-btn-primary" style={{ marginTop: 12 }} onClick={() => {
                        setRevealed(true)
                        const isCorrect = guess.trim() === item.expectedOutput.trim()
                        onSave(updateItemProgress(data, item.id, isCorrect))
                    }} disabled={!guess.trim()}>Check Answer</button>
                ) : (
                    <div style={{ marginTop: 12 }}>
                        <p className={isMatch ? 'le-badge-correct' : 'le-badge-incorrect'}>{isMatch ? `✓ ${t.learnCorrect}` : `✗ ${t.learnIncorrect}`}</p>
                        <div style={{ marginTop: 8 }}>
                            <span style={{ fontSize: '0.82rem', color: 'rgba(200,190,255,0.5)' }}>Expected:</span>
                            <pre className="le-code-block" style={{ marginTop: 4 }}>{item.expectedOutput}</pre>
                        </div>
                        {item.explanation && <p style={{ fontSize: '0.85rem', color: 'rgba(200,190,255,0.6)', marginTop: 8 }}>{item.explanation}</p>}
                        <button className="le-btn le-btn-success" style={{ marginTop: 12 }} onClick={handleNext}>Next Item</button>
                    </div>
                )}
            </div>
        )
    }

    const renderApiRecall = (item: any) => {
        return (
            <div className="le-card">
                <p style={{ fontSize: '1.05rem', fontWeight: 500, color: '#e8eaf6', marginBottom: 8 }}>{item.usageDescription}</p>
                {!revealed ? (
                    <button className="le-btn le-btn-primary" style={{ marginTop: 16 }} onClick={() => setRevealed(true)}>Reveal API</button>
                ) : (
                    <div style={{ marginTop: 16 }}>
                        <div className="le-code-lang">API Name</div>
                        <pre className="le-code-block" style={{ fontSize: '1.2rem', color: '#69f0ae' }}>{item.apiName}</pre>
                        {item.signature && <div style={{ marginTop: 12 }}><div className="le-code-lang">Signature</div><pre className="le-code-block">{item.signature}</pre></div>}
                        {item.example && <div style={{ marginTop: 12 }}><div className="le-code-lang">Example</div><pre className="le-code-block">{item.example}</pre></div>}
                        {item.returnInfo && <p style={{ fontSize: '0.85rem', color: 'rgba(200,190,255,0.7)', marginTop: 12 }}>{t.learnARReturn}: {item.returnInfo}</p>}
                        <div style={{ marginTop: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'rgba(200,190,255,0.5)' }}>Did you remember it?</span>
                            <button className="le-btn le-btn-success" onClick={() => {
                                onSave(updateItemProgress(data, item.id, true))
                                handleNext()
                            }}>Yes</button>
                            <button className="le-btn le-btn-danger" onClick={() => {
                                onSave(updateItemProgress(data, item.id, false))
                                handleNext()
                            }}>No</button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    const renderRealProblem = (item: any) => {
        return (
            <div className="le-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#b39ddb' }}>{item.title}</h3>
                    {item.difficulty && <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>{item.difficulty}</span>}
                </div>
                <p style={{ fontSize: '0.95rem', color: '#e8eaf6', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.problemStatement}</p>

                {item.hints && item.hints.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                        <button className="le-btn le-btn-sm" onClick={() => setSelectedOption(selectedOption === null ? 0 : selectedOption + 1)} disabled={selectedOption !== null && selectedOption >= item.hints.length - 1}>
                            Show Hint ({selectedOption === null ? 0 : selectedOption + 1}/{item.hints.length})
                        </button>
                        {selectedOption !== null && (
                            <div style={{ marginTop: 12, padding: 12, borderRadius: 6, background: 'rgba(255,255,0,0.05)', borderLeft: '3px solid rgba(255,210,0,0.5)' }}>
                                {item.hints[selectedOption]}
                            </div>
                        )}
                    </div>
                )}

                <div style={{ marginTop: 24, padding: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {!revealed ? (
                        <button className="le-btn le-btn-primary" onClick={() => setRevealed(true)}>Reveal Expected Approach</button>
                    ) : (
                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'rgba(200,190,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Expected Approach</span>
                            <p style={{ fontSize: '0.95rem', color: '#69f0ae', marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.expectedApproach}</p>
                            {item.solutionNotes && (
                                <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 8, background: 'rgba(100,150,255,0.1)', color: '#b3e5fc', fontSize: '0.85rem' }}>
                                    {item.solutionNotes}
                                </div>
                            )}
                            <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button className="le-btn le-btn-success" onClick={() => {
                                    onSave(updateItemProgress(data, item.id, true))
                                    handleNext()
                                }}>Solved Internally (Correct)</button>
                                <button className="le-btn le-btn-danger" onClick={() => {
                                    onSave(updateItemProgress(data, item.id, false))
                                    handleNext()
                                }}>Failed / Needed Hint</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const renderCodeCompletion = (item: any) => {
        const isAllCorrect = checked && ccGuesses.every((g, i) => g.trim() === item.blanks[i].trim())

        return (
            <div className="le-card">
                <div className="le-code-lang">{item.language}</div>
                <pre className="le-code-block" style={{ whiteSpace: 'pre-wrap', lineHeight: 2 }}>
                    {item.codeLines.map((part: string, idx: number) => (
                        <React.Fragment key={idx}>
                            {part}
                            {idx < item.codeLines.length - 1 && (
                                <span style={{ display: 'inline-block', margin: '0 4px' }}>
                                    {revealed ? (
                                        <span style={{ color: '#69f0ae', fontWeight: 'bold' }}>{item.blanks[idx]}</span>
                                    ) : (
                                        <input
                                            className="le-input le-cloze-input"
                                            style={{
                                                width: Math.max(80, (ccGuesses[idx]?.length || 0) * 10 + 20) + 'px',
                                                padding: '2px 8px',
                                                background: checked ? (ccGuesses[idx]?.trim() === item.blanks[idx].trim() ? 'rgba(105, 240, 174, 0.2)' : 'rgba(255, 138, 128, 0.2)') : 'rgba(10,10,25,0.6)',
                                                border: checked ? (ccGuesses[idx]?.trim() === item.blanks[idx].trim() ? '1px solid #69f0ae' : '1px solid #ff8a80') : '1px solid rgba(120,80,220,0.5)',
                                                color: '#e8eaf6'
                                            }}
                                            value={ccGuesses[idx] || ''}
                                            onChange={(e) => {
                                                const newGuesses = [...ccGuesses]
                                                newGuesses[idx] = e.target.value
                                                setCcGuesses(newGuesses)
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
                                ✗ Some answers are incorrect. Try again!
                            </p>
                        )}
                    </div>
                )}

                {!checked && !revealed && (
                    <button className="le-btn le-btn-primary" style={{ marginTop: 16 }} onClick={() => {
                        const isAllFilled = ccGuesses.every(g => g && g.trim().length > 0)
                        if (!isAllFilled) {
                            alert('Please fill in all blanks before checking.')
                            return
                        }
                        setChecked(true)
                        const allCorrect = ccGuesses.every((g, i) => g.trim() === item.blanks[i].trim())
                        onSave(updateItemProgress(data, item.id, allCorrect))
                    }} disabled={ccGuesses.some(g => !g || !g.trim())}>
                        Check Code
                    </button>
                )}

                {checked && !revealed && !isAllCorrect && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button className="le-btn le-btn-primary" onClick={() => {
                            setChecked(false)
                            setCcGuesses(Array(item.blanks.length).fill(''))
                        }}>
                            Try Again
                        </button>
                        <button className="le-btn le-btn-danger" onClick={() => setRevealed(true)}>
                            Show Answers
                        </button>
                    </div>
                )}

                {(isAllCorrect || revealed) && (
                    <div style={{ marginTop: 16 }}>
                        {item.explanation && (
                            <p style={{ fontSize: '0.85rem', color: 'rgba(200,190,255,0.6)', marginTop: 8, marginBottom: 16 }}>
                                {item.explanation}
                            </p>
                        )}
                        <button className="le-btn le-btn-success" onClick={handleNext}>
                            Next Item
                        </button>
                    </div>
                )}
            </div>
        )
    }

    const renderStudyItem = () => {
        const type = currentMixedItem.mode
        const item = currentMixedItem.item

        switch (type) {
            case 'cloze': return renderCloze(item)
            case 'quiz': return renderQuiz(item)
            case 'outputPrediction': return renderOutputPrediction(item)
            case 'apiRecall': return renderApiRecall(item)
            case 'realProblem': return renderRealProblem(item)
            case 'codeCompletion': return renderCodeCompletion(item)
            case 'conceptMatch':
            case 'imageOcclusion':
                return (
                    <div className="le-card" style={{ textAlign: 'center' }}>
                        <p style={{ color: 'rgba(200,190,255,0.6)', padding: '40px 0' }}>
                            <i>{type}</i> mode is too complex to inline here for now. Please test it in its respective normal mode!
                        </p>
                        <button className="le-btn le-btn-primary" onClick={handleNext}>Skip</button>
                    </div>
                )
            default: return <div>Unknown item type</div>
        }
    }

    // TODO: Render actual study views based on currentMixedItem.mode
    // For now, returning a placeholder until we extract the study views or replicate them
    return (
        <div className="le-builder">
            <div className="le-builder-header">
                <h2>Mixed Practice ({currentIndex + 1} / {allItems.length})</h2>
                <div className="le-builder-actions">
                    <button className="le-btn le-btn-secondary" onClick={() => setIsStudying(false)}>
                        {'End Session'}
                    </button>
                    <button className="le-btn le-btn-primary" onClick={handleNext}>
                        {'Next'}
                    </button>
                </div>
            </div>
            <div className="le-editor-section">
                <div style={{ marginBottom: 16 }}>
                    <span className="le-badge" style={{ background: 'rgba(120,80,220,0.3)', color: '#b39ddb', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                        {currentMixedItem.mode} Test
                    </span>
                </div>
                {renderStudyItem()}
            </div>
        </div>
    )
}
