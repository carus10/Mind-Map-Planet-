import React, { useState, useMemo, useRef, useEffect } from 'react'
import type { HierarchyNode, VaultHierarchy } from '../types/hierarchy'
import './NoteLinkPicker.css'

interface Props {
    hierarchy: VaultHierarchy
    onSelect: (noteName: string) => void
    onClose: () => void
}

function flattenNotes(node: HierarchyNode, path: string[] = []): Array<{ node: HierarchyNode; path: string[] }> {
    const items: Array<{ node: HierarchyNode; path: string[] }> = []
    const currentPath = [...path, node.name]

    if (node.type === 'home') {
        items.push({ node, path: currentPath })
    }
    if (node.children) {
        for (const child of node.children) {
            items.push(...flattenNotes(child, currentPath.slice(0, -1)))
        }
    }
    return items
}

export function NoteLinkPicker({ hierarchy, onSelect, onClose }: Props): React.ReactElement {
    const [query, setQuery] = useState('')
    const [selectedIdx, setSelectedIdx] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const allNotes = useMemo(() => {
        const notes: Array<{ node: HierarchyNode; path: string[] }> = []
        for (const country of hierarchy.countries) {
            notes.push(...flattenNotes(country))
        }
        return notes
    }, [hierarchy])

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim()
        if (!q) return allNotes
        return allNotes.filter(({ node, path }) =>
            node.name.toLowerCase().includes(q) ||
            path.join('/').toLowerCase().includes(q)
        )
    }, [query, allNotes])

    useEffect(() => {
        setSelectedIdx(0)
    }, [query])

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIdx(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (filtered[selectedIdx]) {
                onSelect(filtered[selectedIdx].node.name)
            }
        } else if (e.key === 'Escape') {
            onClose()
        }
    }

    // Scroll selected item into view
    useEffect(() => {
        const list = listRef.current
        if (!list) return
        const item = list.querySelector('.nlp-item--selected') as HTMLElement
        if (item) item.scrollIntoView({ block: 'nearest' })
    }, [selectedIdx])

    return (
        <div className="nlp-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className="nlp-panel">
                <div className="nlp-header">
                    <div className="nlp-search-row">
                        <svg className="nlp-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input
                            ref={inputRef}
                            className="nlp-input"
                            placeholder="Not ara…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button className="nlp-close" onClick={onClose}>✕</button>
                    </div>
                    <p className="nlp-hint">↑↓ seç · Enter bağla · Esc kapat</p>
                </div>

                <div className="nlp-list" ref={listRef}>
                    {filtered.length === 0 ? (
                        <div className="nlp-empty">Not bulunamadı</div>
                    ) : (
                        filtered.map(({ node, path }, idx) => {
                            const folderPath = path.slice(0, -1).join(' › ')
                            return (
                                <div
                                    key={node.id}
                                    className={`nlp-item ${idx === selectedIdx ? 'nlp-item--selected' : ''}`}
                                    onClick={() => onSelect(node.name)}
                                    onMouseEnter={() => setSelectedIdx(idx)}
                                >
                                    <span className="nlp-item-icon">📄</span>
                                    <div className="nlp-item-info">
                                        <span className="nlp-item-name">{node.name}</span>
                                        {folderPath && <span className="nlp-item-path">{folderPath}</span>}
                                    </div>
                                    <span className="nlp-item-arrow">→</span>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
