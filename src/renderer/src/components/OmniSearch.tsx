import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useMapStore } from '../store/mapStore'
import type { HierarchyNode } from '../types/hierarchy'
import './OmniSearch.css'

interface SearchResult {
    node: HierarchyNode
    pathDescriptor: string // Example: "Earth / Europe"
    matchScore: number
    isFolder: boolean
}

interface Props {
    onClose: () => void
}

export function OmniSearch({ onClose }: Props): React.ReactElement {
    const { hierarchy, voronoiJumpTo } = useMapStore(s => ({
        hierarchy: s.hierarchy,
        voronoiJumpTo: s.voronoiJumpTo
    }))

    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Extract all searchable nodes from hierarchy into a flat list
    const allNodes = useMemo(() => {
        if (!hierarchy || !hierarchy.countries) return []
        const results: { node: HierarchyNode; path: string; isFolder: boolean }[] = []

        const traverse = (node: HierarchyNode, prefix: string) => {
            const isFolder = !!node.children
            results.push({ node, path: prefix, isFolder })
            if (node.children) {
                node.children.forEach(c => traverse(c, prefix ? `${prefix} / ${node.name}` : node.name))
            }
        }

        hierarchy.countries.forEach(c => traverse(c, ''))
        return results
    }, [hierarchy])

    // Filter and score results dynamically
    const filteredResults = useMemo(() => {
        if (!query.trim()) return []
        const lowerQ = query.toLowerCase()
        const scored = allNodes.map((item) => {
            let score = 0
            const nameL = item.node.name.toLowerCase()
            if (nameL === lowerQ) score = 100
            else if (nameL.startsWith(lowerQ)) score = 50
            else if (nameL.includes(lowerQ)) score = 10

            const pathL = item.path.toLowerCase()
            if (pathL.includes(lowerQ)) score += 5

            return { ...item, pathDescriptor: item.path, matchScore: score } as SearchResult
        })

        return scored
            .filter(r => r.matchScore > 0)
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 50) // Limit for performance
    }, [query, allNodes])

    // Auto-focus and scroll management
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50)
    }, [])

    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

    useEffect(() => {
        if (scrollRef.current) {
            const selectedEl = scrollRef.current.children[selectedIndex] as HTMLElement
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: 'nearest' })
            }
        }
    }, [selectedIndex, filteredResults])

    const executeJump = (targetNode: HierarchyNode) => {
        if (hierarchy?.countries) {
            voronoiJumpTo(targetNode, hierarchy.countries)
        }
        onClose()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose()
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => Math.min(prev + 1, filteredResults.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (filteredResults.length > 0 && filteredResults[selectedIndex]) {
                executeJump(filteredResults[selectedIndex].node)
            }
        }
    }

    return (
        <div className="omnisearch-overlay" onClick={onClose}>
            <div className="omnisearch-modal" onClick={e => e.stopPropagation()}>
                <div className="omnisearch-input-wrapper">
                    <svg className="omnisearch-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        ref={inputRef}
                        className="omnisearch-input"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search planets, folders, or notes... (Cmd/Ctrl + K)"
                    />
                </div>

                {query && filteredResults.length > 0 && (
                    <div className="omnisearch-results" ref={scrollRef}>
                        {filteredResults.map((res, i) => (
                            <div
                                key={res.node.id || i}
                                className={`omnisearch-item ${i === selectedIndex ? 'selected' : ''}`}
                                onClick={() => executeJump(res.node)}
                                onMouseEnter={() => setSelectedIndex(i)}
                            >
                                <div className="omnisearch-item-icon">
                                    {res.isFolder ? '🌍' : '📄'}
                                </div>
                                <div className="omnisearch-item-content">
                                    <div className="omnisearch-item-title">{res.node.name}</div>
                                    <div className="omnisearch-item-path">{res.pathDescriptor}</div>
                                </div>
                                <div className="omnisearch-item-action">
                                    Jump ↵
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {query && filteredResults.length === 0 && (
                    <div className="omnisearch-empty">No signals found in the galaxy.</div>
                )}
            </div>
        </div>
    )
}
