import React, { useState, useEffect, useMemo, useCallback } from 'react'
import type { LearnEngineData, LearnMode, LinkedLearningSet } from '../../types/learn'
import type { HierarchyNode, ResolvedLink } from '../../types/hierarchy'
import type { translations } from '../../i18n/translations'
import { loadLearnData, generateId, loadNoteTags } from '../../utils/learnStorage'
import { useConfirm } from './ConfirmDialog'

interface Props {
    data: LearnEngineData
    t: (typeof translations)['en']
    onSave: (data: LearnEngineData) => Promise<void>
    noteNode: HierarchyNode
    hierarchy: HierarchyNode[]
}

/** Resolved linked note info */
interface LinkedNoteInfo {
    node: HierarchyNode
    linkRaw: string
    isBroken: boolean
    isAmbiguous: boolean
}

const CODE_TAGS = ['code', 'backend', 'frontend', 'algorithm', 'api']

/** All modes that can produce study items (excluding meta-modes) */
const STUDYABLE_MODES: LearnMode[] = [
    'cloze', 'imageOcclusion', 'conceptMatch', 'quiz',
    'outputPrediction', 'apiRecall', 'realProblem',
    'codeCompletion', 'bugHunt', 'refactorRecall',
]

/** Modes that require code tags */
const CODE_MODES: LearnMode[] = [
    'outputPrediction', 'apiRecall', 'realProblem',
    'codeCompletion', 'bugHunt', 'refactorRecall',
]

type MixedItem = { mode: string; item: { id: string;[key: string]: unknown } }

/** Prevent pointer events from propagating to VoronoiMap drag handlers */
const stopPointer = (e: React.MouseEvent | React.PointerEvent): void => {
    e.stopPropagation()
}

/** Find a node by its id in the hierarchy tree */
function findNodeById(nodes: HierarchyNode[], id: string): HierarchyNode | null {
    for (const n of nodes) {
        if (n.id === id) return n
        const found = findNodeById(n.children, id)
        if (found) return found
    }
    return null
}

/** Find a node by its absolute path in the hierarchy tree */
function findNodeByPath(nodes: HierarchyNode[], path: string): HierarchyNode | null {
    for (const n of nodes) {
        if (n.absolutePath === path) return n
        const found = findNodeByPath(n.children, path)
        if (found) return found
    }
    return null
}

/** Get resolved linked notes from a note's links — BIDIRECTIONAL */
function getResolvedLinkedNotes(noteNode: HierarchyNode, hierarchy: HierarchyNode[]): LinkedNoteInfo[] {
    const results: LinkedNoteInfo[] = []
    const seen = new Set<string>()
    // Don't include the note itself
    seen.add(noteNode.id)

    // ── Pass 1: Outgoing links (notes this note links TO) ──
    const links: ResolvedLink[] = noteNode.links || []
    for (const link of links) {
        if (link.isBroken) {
            results.push({ node: null as unknown as HierarchyNode, linkRaw: link.raw, isBroken: true, isAmbiguous: false })
            continue
        }
        if (link.isAmbiguous) {
            results.push({ node: null as unknown as HierarchyNode, linkRaw: link.raw, isBroken: false, isAmbiguous: true })
            continue
        }
        if (!link.resolvedId && !link.resolvedPath) continue

        let targetNode: HierarchyNode | null = null
        if (link.resolvedId) {
            targetNode = findNodeById(hierarchy, link.resolvedId)
        }
        if (!targetNode && link.resolvedPath) {
            targetNode = findNodeByPath(hierarchy, link.resolvedPath)
        }

        if (targetNode && !seen.has(targetNode.id)) {
            seen.add(targetNode.id)
            results.push({ node: targetNode, linkRaw: link.raw, isBroken: false, isAmbiguous: false })
        }
    }

    // ── Pass 2: Incoming backlinks (notes that link TO this note) ──
    const collectBacklinks = (nodes: HierarchyNode[]): void => {
        for (const node of nodes) {
            if (node.id !== noteNode.id && !seen.has(node.id) && node.links) {
                for (const link of node.links) {
                    if (link.isBroken || link.isAmbiguous) continue
                    const pointsHere =
                        (link.resolvedId && link.resolvedId === noteNode.id) ||
                        (link.resolvedPath && link.resolvedPath === noteNode.absolutePath)
                    if (pointsHere) {
                        seen.add(node.id)
                        results.push({ node, linkRaw: `← ${node.name}`, isBroken: false, isAmbiguous: false })
                        break // One match is enough per node
                    }
                }
            }
            if (node.children.length > 0) {
                collectBacklinks(node.children)
            }
        }
    }
    collectBacklinks(hierarchy)

    return results
}

/** Collect study items from learn data for given modes */
function collectItems(learnData: LearnEngineData, modes: LearnMode[]): MixedItem[] {
    const items: MixedItem[] = []
    if (modes.includes('cloze')) (learnData.clozeItems || []).forEach(i => items.push({ mode: 'cloze', item: i as unknown as MixedItem['item'] }))
    if (modes.includes('quiz')) (learnData.quizItems || []).forEach(i => items.push({ mode: 'quiz', item: i as unknown as MixedItem['item'] }))
    if (modes.includes('outputPrediction')) (learnData.outputPredictionItems || []).forEach(i => items.push({ mode: 'outputPrediction', item: i as unknown as MixedItem['item'] }))
    if (modes.includes('apiRecall')) (learnData.apiRecallItems || []).forEach(i => items.push({ mode: 'apiRecall', item: i as unknown as MixedItem['item'] }))
    if (modes.includes('realProblem')) (learnData.realProblemItems || []).forEach(i => items.push({ mode: 'realProblem', item: i as unknown as MixedItem['item'] }))
    if (modes.includes('codeCompletion')) (learnData.codeCompletionItems || []).forEach(i => items.push({ mode: 'codeCompletion', item: i as unknown as MixedItem['item'] }))
    if (modes.includes('bugHunt')) (learnData.bugHuntItems || []).forEach(i => items.push({ mode: 'bugHunt', item: i as unknown as MixedItem['item'] }))
    if (modes.includes('refactorRecall')) (learnData.refactorRecallItems || []).forEach(i => items.push({ mode: 'refactorRecall', item: i as unknown as MixedItem['item'] }))
    // imageOcclusion and conceptMatch are complex to inline, skip for linked sessions
    return items
}

/** Shuffle array in place */
function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

const MODE_LABELS: Record<string, string> = {
    cloze: '✏️ Cloze',
    quiz: '❓ Quiz',
    outputPrediction: '💻 Output Prediction',
    apiRecall: '📚 API Recall',
    realProblem: '🧩 Real Problem',
    codeCompletion: '📝 Code Completion',
    bugHunt: '🐛 Bug Hunt',
    refactorRecall: '♻️ Refactor Recall',
}

export function LinkedLearningView({ data, t, onSave, noteNode, hierarchy }: Props): React.ReactElement {
    // Linked notes from the current note
    const linkedNotes = useMemo(() => getResolvedLinkedNotes(noteNode, hierarchy), [noteNode, hierarchy])
    const resolvedNotes = useMemo(() => linkedNotes.filter(ln => !ln.isBroken && !ln.isAmbiguous), [linkedNotes])

    // Selection state for creating sets
    const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())
    const [selectedModes, setSelectedModes] = useState<Set<LearnMode>>(new Set(['cloze', 'quiz']))
    const [titleValue, setTitleValue] = useState('')
    const confirmAsync = useConfirm()

    // Tags cache for linked notes
    const [noteTagsCache, setNoteTagsCache] = useState<Record<string, string[]>>({})

    // Session state
    const [sessionItems, setSessionItems] = useState<MixedItem[]>([])
    const [sessionIdx, setSessionIdx] = useState(0)
    const [isSessionActive, setIsSessionActive] = useState(false)
    const [sessionResults, setSessionResults] = useState<{ total: number; correct: number }>({ total: 0, correct: 0 })
    const [sessionEnded, setSessionEnded] = useState(false)

    // Study item state
    const [guess, setGuess] = useState('')
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [checked, setChecked] = useState(false)
    const [revealed, setRevealed] = useState(false)

    const sets = data.linkedLearningSets || []

    // Load tags for resolved linked notes
    useEffect(() => {
        let cancelled = false
        const loadTags = async (): Promise<void> => {
            const cache: Record<string, string[]> = {}
            for (const ln of resolvedNotes) {
                try {
                    const tags = await loadNoteTags(ln.node.absolutePath)
                    if (!cancelled) cache[ln.node.id] = tags
                } catch { /* noop */ }
            }
            if (!cancelled) setNoteTagsCache(cache)
        }
        loadTags()
        return () => { cancelled = true }
    }, [resolvedNotes])

    // Determine which modes are available based on selected notes' tags
    const availableModesForSelection = useMemo(() => {
        const hasCodeTag = Array.from(selectedNoteIds).some(id => {
            const tags = noteTagsCache[id] || []
            return tags.some(tag => CODE_TAGS.includes(tag.toLowerCase()))
        })
        if (hasCodeTag) return STUDYABLE_MODES
        return STUDYABLE_MODES.filter(m => !CODE_MODES.includes(m))
    }, [selectedNoteIds, noteTagsCache])

    const toggleNote = (id: string): void => {
        setSelectedNoteIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleMode = (mode: LearnMode): void => {
        setSelectedModes(prev => {
            const next = new Set(prev)
            if (next.has(mode)) next.delete(mode)
            else next.add(mode)
            return next
        })
    }

    const handleCreateSet = async (): Promise<void> => {
        if (!titleValue.trim() || selectedNoteIds.size === 0) return
        const selectedNodes = resolvedNotes.filter(ln => selectedNoteIds.has(ln.node.id))
        const newSet: LinkedLearningSet = {
            id: generateId(),
            title: titleValue.trim(),
            notePaths: selectedNodes.map(ln => ln.node.absolutePath),
            noteIds: selectedNodes.map(ln => ln.node.id),
            includedModes: Array.from(selectedModes) as LearnMode[],
            createdAt: Date.now(),
        }
        await onSave({
            ...data,
            linkedLearningSets: [...sets, newSet],
        })
        setTitleValue('')
        setSelectedNoteIds(new Set())
    }

    const handleDeleteSet = async (id: string): Promise<void> => {
        if (!(await confirmAsync(t.learnDeleteConfirm))) return
        await onSave({
            ...data,
            linkedLearningSets: sets.filter(s => s.id !== id),
        })
    }

    const startLinkedSession = useCallback(async (linkedSet: LinkedLearningSet): Promise<void> => {
        const allItems: MixedItem[] = []

        for (const notePath of linkedSet.notePaths) {
            try {
                // Find the node in hierarchy to get its id
                const node = findNodeByPath(hierarchy, notePath)
                if (!node) continue
                const noteData = await loadLearnData(node.id, notePath)
                // Get tags for this note to filter code modes
                const tags = await loadNoteTags(notePath).catch(() => [] as string[])
                const hasCodeTag = tags.some(tag => CODE_TAGS.includes(tag.toLowerCase()))

                // Filter modes based on tag compatibility
                const safeModes = linkedSet.includedModes.filter(m => {
                    if (CODE_MODES.includes(m)) return hasCodeTag
                    return true
                })

                const items = collectItems(noteData, safeModes)
                allItems.push(...items)
            } catch { /* skip failed note loads */ }
        }

        shuffle(allItems)
        setSessionItems(allItems)
        setSessionIdx(0)
        setSessionResults({ total: 0, correct: 0 })
        setSessionEnded(false)
        setGuess('')
        setSelectedOption(null)
        setChecked(false)
        setRevealed(false)
        setIsSessionActive(true)
    }, [hierarchy])

    const handleSessionNext = (wasCorrect: boolean): void => {
        const newResults = {
            total: sessionResults.total + 1,
            correct: sessionResults.correct + (wasCorrect ? 1 : 0),
        }
        setSessionResults(newResults)
        if (sessionIdx < sessionItems.length - 1) {
            setSessionIdx(prev => prev + 1)
            setGuess('')
            setSelectedOption(null)
            setChecked(false)
            setRevealed(false)
        } else {
            // Session complete — mark as ended
            setIsSessionActive(false)
            setSessionEnded(true)
        }
    }

    // ── Active Session ──
    if (isSessionActive && sessionItems.length > 0) {
        const currentItem = sessionItems[sessionIdx]
        if (!currentItem) {
            // Guard: shouldn't happen, but handle gracefully
            return (
                <div className="le-empty">
                    <p>No items available.</p>
                    <button className="le-btn le-btn-primary" onClick={() => { setIsSessionActive(false); setSessionEnded(false) }}>
                        {t.learnBack}
                    </button>
                </div>
            )
        }
        return (
            <div className="le-builder" onPointerDown={stopPointer} onMouseDown={stopPointer}>
                <div className="le-builder-header">
                    <h2>{t.learnLinkedLearning} ({sessionIdx + 1} / {sessionItems.length})</h2>
                    <div className="le-builder-actions">
                        <button className="le-btn le-btn-secondary" onClick={() => { setIsSessionActive(false); setSessionEnded(false) }}>
                            {t.learnEndSession}
                        </button>
                    </div>
                </div>
                <div className="le-editor-section">
                    <div style={{ marginBottom: 16 }}>
                        <span style={{ background: 'rgba(120,80,220,0.3)', color: '#b39ddb', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {currentItem.mode}
                        </span>
                    </div>
                    {renderSessionItem(currentItem, t, guess, setGuess, selectedOption, setSelectedOption, checked, setChecked, revealed, setRevealed, handleSessionNext)}
                </div>
            </div>
        )
    }

    // ── Session Summary (shown after session completes) ──
    if (sessionEnded && sessionResults.total > 0) {
        return (
            <div className="le-builder">
                <div className="le-builder-header">
                    <h2>{t.learnLinkedSessionSummary}</h2>
                </div>
                <div className="le-editor-section" style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                    <h3>{t.learnSessionComplete}</h3>
                    <div className="le-overview-grid" style={{ maxWidth: 400, margin: '24px auto' }}>
                        <div className="le-overview-stat">
                            <div className="le-overview-stat-value">{sessionResults.total}</div>
                            <div className="le-overview-stat-label">{t.learnTotalAnswered}</div>
                        </div>
                        <div className="le-overview-stat" style={{ background: 'rgba(105, 240, 174, 0.1)', border: '1px solid rgba(105, 240, 174, 0.2)' }}>
                            <div className="le-overview-stat-value" style={{ color: '#69f0ae' }}>{sessionResults.correct}</div>
                            <div className="le-overview-stat-label">{t.learnCorrect}</div>
                        </div>
                    </div>
                    <button className="le-btn le-btn-primary" style={{ marginTop: 16 }} onClick={() => { setSessionResults({ total: 0, correct: 0 }); setSessionEnded(false) }}>
                        {t.learnBack}
                    </button>
                </div>
            </div>
        )
    }

    // ── Main View ──
    return (
        <div onPointerDown={stopPointer} onMouseDown={stopPointer}>
            {/* Linked Notes List */}
            <h3 className="le-section-title">{t.learnLinkedNotes}</h3>
            {linkedNotes.length === 0 ? (
                <div className="le-empty">{t.learnNoLinkedNotesAvailable}</div>
            ) : (
                <div className="le-card" style={{ marginBottom: 24 }}>
                    {linkedNotes.map((ln, idx) => {
                        if (ln.isBroken) {
                            return (
                                <div key={`broken-${idx}`} className="le-distribution-row" style={{ opacity: 0.4 }}>
                                    <span className="le-distribution-icon">⚠️</span>
                                    <span className="le-distribution-name" style={{ color: '#ff8a80' }}>{ln.linkRaw}</span>
                                    <span className="le-distribution-count" style={{ fontSize: '0.7rem', color: '#ff8a80' }}>{t.learnUnresolvedLinkedNote}</span>
                                </div>
                            )
                        }
                        if (ln.isAmbiguous) {
                            return (
                                <div key={`ambiguous-${idx}`} className="le-distribution-row" style={{ opacity: 0.5 }}>
                                    <span className="le-distribution-icon">❓</span>
                                    <span className="le-distribution-name" style={{ color: '#ffab40' }}>{ln.linkRaw}</span>
                                    <span className="le-distribution-count" style={{ fontSize: '0.7rem', color: '#ffab40' }}>{t.learnAmbiguousLinkedNote}</span>
                                </div>
                            )
                        }
                        const isSelected = selectedNoteIds.has(ln.node.id)
                        const tags = noteTagsCache[ln.node.id] || []
                        return (
                            <div
                                key={ln.node.id}
                                className="le-distribution-row"
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                    // Prevent checkbox input clicks from double-toggling
                                    if ((e.target as HTMLElement).tagName === 'INPUT') return
                                    toggleNote(ln.node.id)
                                }}
                            >
                                <span className="le-distribution-icon">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleNote(ln.node.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </span>
                                <span className="le-distribution-name">{ln.node.name}</span>
                                <span className="le-distribution-count" style={{ display: 'flex', gap: 4 }}>
                                    {tags.slice(0, 3).map((tag, i) => (
                                        <span key={i} style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: 3, background: 'rgba(120,80,220,0.2)', color: '#b39ddb' }}>{tag}</span>
                                    ))}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Create Set */}
            {resolvedNotes.length > 0 && (
                <>
                    <h3 className="le-section-title">{t.learnCreateLearningSet}</h3>
                    <div className="le-card" style={{ marginBottom: 24 }}>
                        <label className="le-label">{t.learnLearningSetTitle}</label>
                        <input
                            className="le-input"
                            value={titleValue}
                            onChange={(e) => setTitleValue(e.target.value)}
                            onPointerDown={stopPointer}
                            onMouseDown={stopPointer}
                        />

                        <label className="le-label" style={{ marginTop: 12 }}>{t.learnIncludedModes}</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                            {availableModesForSelection.map(mode => (
                                <label key={mode} style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '4px 10px', borderRadius: 6,
                                    background: selectedModes.has(mode) ? 'rgba(120,80,220,0.3)' : 'rgba(255,255,255,0.05)',
                                    border: selectedModes.has(mode) ? '1px solid rgba(120,80,220,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                    cursor: 'pointer', fontSize: '0.8rem', color: '#e8eaf6',
                                    transition: 'all 0.2s ease',
                                }}>
                                    <input type="checkbox" checked={selectedModes.has(mode)} onChange={() => toggleMode(mode)} style={{ display: 'none' }} />
                                    {MODE_LABELS[mode] || mode}
                                </label>
                            ))}
                        </div>

                        <button
                            className="le-btn le-btn-primary"
                            style={{ marginTop: 16 }}
                            onClick={handleCreateSet}
                            disabled={!titleValue.trim() || selectedNoteIds.size === 0 || selectedModes.size === 0}
                        >
                            {t.learnCreateLearningSet}
                        </button>
                    </div>
                </>
            )}

            {/* Saved Sets */}
            {sets.length > 0 && (
                <>
                    <h3 className="le-section-title">{t.learnSavedSets}</h3>
                    {sets.map(s => (
                        <div className="le-card" key={s.id} style={{ marginBottom: 8 }}>
                            <div className="le-card-header">
                                <div>
                                    <span className="le-card-title">{s.title}</span>
                                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'rgba(200,190,255,0.5)' }}>
                                            {s.notePaths.length} {t.learnLinkedNotes.toLowerCase()} •{' '}
                                            {s.includedModes.length} {t.learnIncludedModes.toLowerCase()}
                                        </span>
                                    </div>
                                </div>
                                <div className="le-card-actions">
                                    <button className="le-btn le-btn-sm le-btn-success" onClick={() => startLinkedSession(s)}>
                                        {t.learnStartLinkedSession}
                                    </button>
                                    <button className="le-btn le-btn-sm le-btn-danger" onClick={() => handleDeleteSet(s.id)}>✕</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </>
            )}
        </div>
    )
}

// ── Inline session item renderer (simplified mixed practice) ──
function renderSessionItem(
    mixedItem: MixedItem,
    t: (typeof translations)['en'],
    guess: string,
    setGuess: (v: string) => void,
    selectedOption: number | null,
    setSelectedOption: (v: number | null) => void,
    checked: boolean,
    setChecked: (v: boolean) => void,
    revealed: boolean,
    setRevealed: (v: boolean) => void,
    onNext: (wasCorrect: boolean) => void,
): React.ReactElement {
    const item = mixedItem.item as Record<string, unknown>

    switch (mixedItem.mode) {
        case 'cloze': {
            const renderedPrompt = (item.renderedPrompt as string) || ''
            const answer = (item.answer as string) || ''
            const isMatch = revealed && guess.trim().toLowerCase() === answer.trim().toLowerCase()
            return (
                <div className="le-card">
                    <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#e8eaf6' }}>
                        {renderedPrompt.split('____').map((part: string, idx: number, arr: string[]) => (
                            <React.Fragment key={idx}>
                                <span>{part}</span>
                                {idx < arr.length - 1 && (
                                    <span className={revealed && !isMatch ? 'le-cloze-blank-error' : 'le-cloze-blank'}>
                                        {revealed ? answer : '.........'}
                                    </span>
                                )}
                            </React.Fragment>
                        ))}
                    </p>
                    <div style={{ marginTop: 24 }}>
                        <input
                            className="le-input"
                            style={{ fontSize: '1.1rem', padding: '12px 16px' }}
                            value={guess}
                            onChange={(e) => setGuess(e.target.value)}
                            onPointerDown={stopPointer}
                            onMouseDown={stopPointer}
                            disabled={revealed}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter' && !revealed && guess.trim()) setRevealed(true) }}
                        />
                    </div>
                    {!revealed ? (
                        <button className="le-btn le-btn-primary" style={{ marginTop: 12 }} onClick={() => setRevealed(true)} disabled={!guess.trim()}>{t.learnCheckAnswer}</button>
                    ) : (
                        <div style={{ marginTop: 12 }}>
                            <p className={isMatch ? 'le-badge-correct' : 'le-badge-incorrect'}>{isMatch ? `✓ ${t.learnCorrect}` : `✗ ${t.learnIncorrect}`}</p>
                            {!isMatch && <p style={{ marginTop: 8, color: '#e8eaf6' }}>{answer}</p>}
                            <button className="le-btn le-btn-success" style={{ marginTop: 12 }} onClick={() => onNext(isMatch)}>{t.learnQuizNext}</button>
                        </div>
                    )}
                </div>
            )
        }
        case 'quiz': {
            const question = (item.question as string) || ''
            const options = (item.options as string[]) || []
            const correctIndex = (item.correctIndex as number) ?? 0
            const explanation = item.explanation as string | undefined
            const isCorrect = selectedOption === correctIndex
            return (
                <div className="le-card">
                    <p style={{ fontSize: '1.05rem', fontWeight: 500, color: '#e8eaf6', marginBottom: 16 }}>{question}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {options.map((opt, idx) => {
                            let optStyle: React.CSSProperties = { padding: '10px 14px', borderRadius: 8, cursor: checked ? 'default' : 'pointer', border: '1px solid rgba(120,80,220,0.2)', background: 'rgba(10,10,25,0.5)', color: '#e8eaf6', textAlign: 'left', fontSize: '0.88rem' }
                            if (selectedOption === idx && !checked) optStyle = { ...optStyle, borderColor: 'rgba(120,80,220,0.6)', background: 'rgba(120,80,220,0.2)' }
                            if (checked && idx === correctIndex) optStyle = { ...optStyle, borderColor: '#69f0ae', background: 'rgba(50,180,80,0.15)' }
                            if (checked && selectedOption === idx && idx !== correctIndex) optStyle = { ...optStyle, borderColor: '#ff8a80', background: 'rgba(220,50,50,0.15)' }
                            return <button key={idx} style={optStyle} onClick={() => { if (!checked) setSelectedOption(idx) }}>{opt}</button>
                        })}
                    </div>
                    {!checked ? (
                        <button className="le-btn le-btn-primary" style={{ marginTop: 16 }} onClick={() => setChecked(true)} disabled={selectedOption === null}>{t.learnQuizCheck}</button>
                    ) : (
                        <div style={{ marginTop: 12 }}>
                            <p className={isCorrect ? 'le-badge-correct' : 'le-badge-incorrect'}>{isCorrect ? `✓ ${t.learnCorrect}` : `✗ ${t.learnIncorrect}`}</p>
                            {explanation && <p style={{ fontSize: '0.85rem', color: 'rgba(200,190,255,0.6)', marginTop: 6 }}>{explanation}</p>}
                            <button className="le-btn le-btn-success" style={{ marginTop: 12 }} onClick={() => onNext(isCorrect)}>{t.learnQuizNext}</button>
                        </div>
                    )}
                </div>
            )
        }
        case 'bugHunt': {
            const bgCode = (item.buggyCode as string) || ''
            const expIssue = (item.expectedIssue as string) || ''
            const expl = item.explanation as string | undefined
            return (
                <div className="le-card">
                    <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', color: '#b39ddb' }}>{(item.title as string) || ''}</h3>
                    <label className="le-label" style={{ color: '#ff8a80' }}>{t.learnBHWhatsWrong}</label>
                    <pre className="le-code-block" style={{ whiteSpace: 'pre-wrap' }}>{bgCode}</pre>
                    {!revealed ? (
                        <button className="le-btn le-btn-primary" style={{ marginTop: 12 }} onClick={() => setRevealed(true)}>{t.learnReveal}</button>
                    ) : (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(255, 138, 128, 0.1)', border: '1px solid rgba(255, 138, 128, 0.3)', marginBottom: 16 }}>
                                <label className="le-label" style={{ color: '#ff8a80' }}>{t.learnExpectedIssue}</label>
                                <p style={{ color: '#e8eaf6', whiteSpace: 'pre-wrap', margin: 0 }}>{expIssue}</p>
                            </div>
                            {expl && <p style={{ fontSize: '0.85rem', color: 'rgba(200,190,255,0.6)', marginBottom: 16 }}>{expl}</p>}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="le-btn le-btn-success" onClick={() => onNext(true)}>{t.learnIssueFound}</button>
                                <button className="le-btn le-btn-danger" onClick={() => onNext(false)}>{t.learnIssueMissed}</button>
                            </div>
                        </div>
                    )}
                </div>
            )
        }
        case 'refactorRecall': {
            const origCode = (item.originalCode as string) || ''
            const expRefactor = (item.expectedRefactor as string) || ''
            const expl = item.explanation as string | undefined
            return (
                <div className="le-card">
                    <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', color: '#b39ddb' }}>{(item.title as string) || ''}</h3>
                    <label className="le-label" style={{ color: '#ffab40' }}>{t.learnRRHowImprove}</label>
                    <pre className="le-code-block" style={{ whiteSpace: 'pre-wrap' }}>{origCode}</pre>
                    {!revealed ? (
                        <button className="le-btn le-btn-primary" style={{ marginTop: 12 }} onClick={() => setRevealed(true)}>{t.learnRRShowRefactored}</button>
                    ) : (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                <div>
                                    <label className="le-label" style={{ color: '#ff8a80' }}>{t.learnOriginalCode}</label>
                                    <pre className="le-code-block" style={{ whiteSpace: 'pre-wrap', borderLeft: '3px solid rgba(255, 138, 128, 0.5)' }}>{origCode}</pre>
                                </div>
                                <div>
                                    <label className="le-label" style={{ color: '#69f0ae' }}>{t.learnExpectedRefactor}</label>
                                    <pre className="le-code-block" style={{ whiteSpace: 'pre-wrap', borderLeft: '3px solid rgba(105, 240, 174, 0.5)' }}>{expRefactor}</pre>
                                </div>
                            </div>
                            {expl && <p style={{ fontSize: '0.85rem', color: 'rgba(200,190,255,0.6)', marginBottom: 16 }}>{expl}</p>}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="le-btn le-btn-success" onClick={() => onNext(true)}>{t.learnIssueFound}</button>
                                <button className="le-btn le-btn-danger" onClick={() => onNext(false)}>{t.learnIssueMissed}</button>
                            </div>
                        </div>
                    )}
                </div>
            )
        }
        case 'outputPrediction': {
            const code = (item.code as string) || ''
            const expectedOutput = (item.expectedOutput as string) || ''
            const isMatch = revealed && guess.trim() === expectedOutput.trim()
            return (
                <div className="le-card">
                    <div className="le-code-lang">{(item.language as string) || ''}</div>
                    <pre className="le-code-block">{code}</pre>
                    <label className="le-label" style={{ marginTop: 16 }}>{t.learnOPYourGuess}</label>
                    <textarea
                        className="le-textarea"
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        onPointerDown={stopPointer}
                        onMouseDown={stopPointer}
                        disabled={revealed}
                    />
                    {!revealed ? (
                        <button className="le-btn le-btn-primary" style={{ marginTop: 12 }} onClick={() => setRevealed(true)} disabled={!guess.trim()}>{t.learnOPCheck}</button>
                    ) : (
                        <div style={{ marginTop: 12 }}>
                            <p className={isMatch ? 'le-badge-correct' : 'le-badge-incorrect'}>{isMatch ? `✓ ${t.learnCorrect}` : `✗ ${t.learnIncorrect}`}</p>
                            <pre className="le-code-block" style={{ marginTop: 8 }}>{expectedOutput}</pre>
                            <button className="le-btn le-btn-success" style={{ marginTop: 12 }} onClick={() => onNext(isMatch)}>{t.learnQuizNext}</button>
                        </div>
                    )}
                </div>
            )
        }
        case 'apiRecall': {
            const usageDesc = (item.usageDescription as string) || ''
            const apiName = (item.apiName as string) || ''
            return (
                <div className="le-card">
                    <p style={{ fontSize: '1.05rem', fontWeight: 500, color: '#e8eaf6', marginBottom: 8 }}>{usageDesc}</p>
                    {!revealed ? (
                        <button className="le-btn le-btn-primary" style={{ marginTop: 16 }} onClick={() => setRevealed(true)}>{t.learnARFlip}</button>
                    ) : (
                        <div style={{ marginTop: 16 }}>
                            <pre className="le-code-block" style={{ fontSize: '1.2rem', color: '#69f0ae' }}>{apiName}</pre>
                            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                                <button className="le-btn le-btn-success" onClick={() => onNext(true)}>{t.learnIssueFound}</button>
                                <button className="le-btn le-btn-danger" onClick={() => onNext(false)}>{t.learnIssueMissed}</button>
                            </div>
                        </div>
                    )}
                </div>
            )
        }
        default:
            return (
                <div className="le-card" style={{ textAlign: 'center' }}>
                    <p style={{ color: 'rgba(200,190,255,0.6)', padding: '40px 0' }}>
                        <i>{mixedItem.mode}</i> mode is not available in linked sessions.
                    </p>
                    <button className="le-btn le-btn-primary" onClick={() => onNext(false)}>Skip</button>
                </div>
            )
    }
}
