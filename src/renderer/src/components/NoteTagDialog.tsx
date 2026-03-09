import React, { useState, useEffect } from 'react'
import { loadNoteTags, saveNoteTags } from '../utils/learnStorage'
import { translations } from '../i18n/translations'
import { useMapStore } from '../store/mapStore'
import type { HierarchyNode } from '../types/hierarchy'
import './NoteTagDialog.css'

interface Props {
    node: HierarchyNode
    onClose: () => void
}

const PREDEFINED_TAGS = ['code', 'backend', 'frontend', 'algorithm', 'api', 'theory', 'general']

export function NoteTagDialog({ node, onClose }: Props): React.ReactElement {
    const language = useMapStore(s => s.language)
    const setSuccessMessage = useMapStore(s => s.setSuccessMessage)
    const t = translations[language as keyof typeof translations]

    const [tags, setTags] = useState<string[]>([])
    const [customTag, setCustomTag] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        loadNoteTags(node.absolutePath).then((loadedTags: string[]) => {
            if (mounted) {
                setTags(loadedTags)
                setLoading(false)
            }
        })
        return () => { mounted = false }
    }, [node.absolutePath])

    const toggleTag = (tag: string) => {
        setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
    }

    const addCustomTag = () => {
        const trimmed = customTag.trim()
        if (trimmed && !tags.includes(trimmed)) {
            setTags(prev => [...prev, trimmed])
        }
        setCustomTag('')
    }

    const handleSave = async () => {
        await saveNoteTags(node.absolutePath, tags)
        setSuccessMessage(t.toastAppearanceUpdated)
        onClose()
    }

    return (
        <>
            <div className="pt-backdrop" onClick={onClose} />
            <div className="pt-dialog">
                <header className="pt-header">
                    <h2>{t.noteTags}</h2>
                    <button className="pt-close-btn" onClick={onClose} title={t.closeBtn}>×</button>
                </header>

                <div className="pt-body">
                    {loading ? (
                        <div className="pt-loading">{t.editorLoading}</div>
                    ) : (
                        <>
                            <div className="nt-tags-container">
                                {PREDEFINED_TAGS.map(tag => {
                                    const key = `${tag}Tag` as keyof typeof t
                                    const label = t[key] || tag
                                    return (
                                        <label key={tag} className="nt-tag-chip">
                                            <input
                                                type="checkbox"
                                                checked={tags.includes(tag)}
                                                onChange={() => toggleTag(tag)}
                                            />
                                            {label}
                                        </label>
                                    )
                                })}
                            </div>
                            {tags.filter(t => !PREDEFINED_TAGS.includes(t)).length > 0 && (
                                <div className="nt-custom-tags-container">
                                    <h4 className="nt-custom-title">Custom:</h4>
                                    <div className="nt-tags-container">
                                        {tags.filter(t => !PREDEFINED_TAGS.includes(t)).map(tag => (
                                            <label key={tag} className="nt-tag-chip custom-chip">
                                                <input
                                                    type="checkbox"
                                                    checked={tags.includes(tag)}
                                                    onChange={() => toggleTag(tag)}
                                                />
                                                {tag}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="nt-add-custom">
                                <input
                                    type="text"
                                    value={customTag}
                                    onChange={e => setCustomTag(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addCustomTag()}
                                    placeholder={t.addCustomTag}
                                />
                                <button onClick={addCustomTag}>+</button>
                            </div>
                        </>
                    )}
                </div>

                <footer className="pt-footer">
                    <button className="pt-btn pt-btn-cancel" onClick={onClose}>{t.cancel}</button>
                    <button className="pt-btn pt-btn-submit" onClick={handleSave} disabled={loading}>{t.saveTags}</button>
                </footer>
            </div>
        </>
    )
}
