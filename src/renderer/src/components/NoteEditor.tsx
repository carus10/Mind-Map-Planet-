import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useMapStore } from '../store/mapStore'
import { translations } from '../i18n/translations'
import { NoteLinkPicker } from './NoteLinkPicker'
import './NoteEditor.css'

interface Props {
    filePath: string
    noteName: string
    onClose: () => void
}

// ── Preview Themes ────────────────────────────────────────────────────────
type PreviewTheme = 'dark' | 'light' | 'sepia'
// theme meta is built inside component so labels use translations

// ── Markdown Renderer ─────────────────────────────────────────────────────
function renderMarkdown(raw: string): string {
    let html = raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\[\[([^\]]+)\]\]/g, '<span class="md-wikilink">[[<strong>$1</strong>]]</span>')
        .replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>')
        .replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>')
        .replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>')
        .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
        .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
        .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/^[-*]\s+\[x\]\s+(.+)$/gim, '<li class="md-check md-check--done">$1</li>')
        .replace(/^[-*]\s+\[ \]\s+(.+)$/gim, '<li class="md-check">$1</li>')
        .replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>')
        .replace(/^\d+\.\s+(.+)$/gm, '<li class="md-ol">$1</li>')
        .replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '<hr/>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        .split(/\n{2,}/).map(p => {
            p = p.trim()
            if (!p) return ''
            if (/^<(h[1-6]|blockquote|li|hr)/.test(p)) return p
            return `<p>${p.replace(/\n/g, '<br/>')}</p>`
        }).join('\n')
    return html
}

export function NoteEditor({ filePath, noteName: initialNoteName, onClose }: Props): React.ReactElement {
    const { language, setError, setSuccessMessage, hierarchy } = useMapStore(s => ({
        language: s.language,
        setError: s.setError,
        setSuccessMessage: s.setSuccessMessage,
        hierarchy: s.hierarchy,
    }))
    const t = translations[language]

    const [content, setContent] = useState('')
    const [originalContent, setOriginalContent] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [mode, setMode] = useState<'edit' | 'preview'>('edit')
    const [previewTheme, setPreviewTheme] = useState<PreviewTheme>('dark')
    const [showLinkPicker, setShowLinkPicker] = useState(false)

    const PREVIEW_THEMES: Record<PreviewTheme, { label: string; bg: string; text: string; icon: string }> = {
        dark: { label: t.editorThemeDark, bg: '#0b0d17', text: '#c8cde8', icon: '🌑' },
        light: { label: t.editorThemeLight, bg: '#f8f8f2', text: '#2a2a2a', icon: '☀️' },
        sepia: { label: t.editorThemeSepia, bg: '#f5ead8', text: '#3b2e1a', icon: '📜' },
    }

    // ── Inline title editing ──────────────────────────────────────────────
    const [noteName, setNoteName] = useState(initialNoteName)
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [titleDraft, setTitleDraft] = useState(initialNoteName)
    const titleInputRef = useRef<HTMLInputElement>(null)

    const startEditTitle = () => {
        setTitleDraft(noteName)
        setIsEditingTitle(true)
        setTimeout(() => { titleInputRef.current?.select() }, 0)
    }

    const commitTitle = async () => {
        const trimmed = titleDraft.trim()
        if (!trimmed || trimmed === noteName) {
            setIsEditingTitle(false)
            return
        }
        // Always pass the filename with .md extension to renameNode
        const newFileName = trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`
        const result = await window.api.renameNode(filePath, newFileName)
        if (result?.success) {
            // Display without .md extension
            setNoteName(trimmed.replace(/\.md$/i, ''))
            setSuccessMessage(`${t.editorRenamedSuccess} ${trimmed}`)
        } else {
            setError(result?.error || t.editorRenameError)
        }
        setIsEditingTitle(false)
    }

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') commitTitle()
        if (e.key === 'Escape') setIsEditingTitle(false)
    }

    // ── Load file ─────────────────────────────────────────────────────────
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const cursorRef = useRef<{ start: number; end: number } | null>(null)

    useEffect(() => {
        ; (async () => {
            setIsLoading(true)
            const result = await window.api.readNote(filePath)
            if (result?.success && result.content !== undefined) {
                setContent(result.content)
                setOriginalContent(result.content)
            } else {
                setError(result?.error || t.editorLoadError)
            }
            setIsLoading(false)
        })()
    }, [filePath, setError])

    // ── Save ──────────────────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (content === originalContent) return
        setIsSaving(true)
        const result = await window.api.writeNote(filePath, content)
        if (result?.success) {
            setOriginalContent(content)
            setSuccessMessage(`${t.toastNoteSaved} ${noteName}`)
        } else {
            setError(result?.error || t.editorSaveError)
        }
        setIsSaving(false)
    }, [content, originalContent, filePath, noteName, setError, setSuccessMessage, t])

    // ── Refs for auto-save (avoid stale closure) ───────────────────────────
    const contentRef = useRef(content)
    const originalContentRef = useRef(originalContent)
    useEffect(() => { contentRef.current = content }, [content])
    useEffect(() => { originalContentRef.current = originalContent }, [originalContent])

    // Auto-save on unmount — uses refs so always gets the latest value
    useEffect(() => {
        return () => {
            if (contentRef.current !== originalContentRef.current) {
                window.api.writeNote(filePath, contentRef.current).catch(console.error)
            }
        }
    }, [filePath]) // filePath is stable; refs ensure fresh values

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (isEditingTitle) return
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave() }
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [handleSave, onClose, isEditingTitle])

    // ── Insert at cursor ──────────────────────────────────────────────────
    const insertAtCursor = useCallback((before: string, after = '', placeholder = '') => {
        const ta = textareaRef.current
        if (!ta) return
        ta.focus()
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const selected = content.slice(start, end) || placeholder
        setContent(content.slice(0, start) + before + selected + after + content.slice(end))
        setTimeout(() => {
            ta.focus()
            ta.setSelectionRange(start + before.length, start + before.length + selected.length)
        }, 0)
    }, [content])

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value)
        cursorRef.current = { start: e.target.selectionStart, end: e.target.selectionEnd }
    }

    // ── Link picker ───────────────────────────────────────────────────────
    const openLinkPicker = () => {
        const ta = textareaRef.current
        if (ta) cursorRef.current = { start: ta.selectionStart, end: ta.selectionEnd }
        setShowLinkPicker(true)
    }

    const handleLinkSelect = (selected: { noteName: string, path: string, isDuplicate: boolean }) => {
        const ta = textareaRef.current
        let start = cursorRef.current?.start ?? 0
        let end = cursorRef.current?.end ?? 0
        if (document.activeElement === ta) { start = ta!.selectionStart; end = ta!.selectionEnd }

        const safePath = selected.path.replace(/\\/g, '/').replace(/\.md$/i, '')
        const wikiLink = selected.isDuplicate ? `[[${safePath}]]` : `[[${selected.noteName}]]`

        setContent(content.slice(0, start) + wikiLink + content.slice(end))
        setShowLinkPicker(false)
        setTimeout(() => { ta?.focus(); const p = start + wikiLink.length; ta?.setSelectionRange(p, p) }, 0)
    }

    const hasUnsavedChanges = content !== originalContent
    const theme = PREVIEW_THEMES[previewTheme]

    // ── Toolbar groups ────────────────────────────────────────────────────
    const toolbarGroups: Array<Array<{ icon: string; title: string; action: () => void }>> = [
        [
            { icon: 'B', title: t.tbBold, action: () => insertAtCursor('**', '**', t.tbPlaceholderText) },
            { icon: 'I', title: t.tbItalic, action: () => insertAtCursor('*', '*', t.tbPlaceholderText) },
            { icon: 'S̶', title: t.tbStrike, action: () => insertAtCursor('~~', '~~', t.tbPlaceholderText) },
        ],
        [
            { icon: 'H1', title: t.tbH1, action: () => insertAtCursor('# ') },
            { icon: 'H2', title: t.tbH2, action: () => insertAtCursor('## ') },
            { icon: 'H3', title: t.tbH3, action: () => insertAtCursor('### ') },
        ],
        [
            { icon: '•', title: t.tbList, action: () => insertAtCursor('- ') },
            { icon: '1.', title: t.tbOrderedList, action: () => insertAtCursor('1. ') },
            { icon: '☐', title: t.tbTask, action: () => insertAtCursor('- [ ] ') },
        ],
        [
            { icon: '`', title: t.tbCode, action: () => insertAtCursor('`', '`', t.tbPlaceholderCode) },
            { icon: '❝', title: t.tbQuote, action: () => insertAtCursor('> ', '', t.tbPlaceholderText) },
        ],
    ]

    return (
        <div className="ne-overlay">
            <div className="ne-shell">

                {/* ── Header ──────────────────────────────────────── */}
                <header className="ne-header">
                    <div className="ne-header-left">
                        <span className="ne-note-icon">📝</span>

                        {/* Inline-editable title */}
                        {isEditingTitle ? (
                            <input
                                ref={titleInputRef}
                                className="ne-title-input"
                                value={titleDraft}
                                onChange={e => setTitleDraft(e.target.value)}
                                onBlur={commitTitle}
                                onKeyDown={handleTitleKeyDown}
                                autoFocus
                            />
                        ) : (
                            <h1
                                className="ne-title ne-title--clickable"
                                onClick={startEditTitle}
                                title={t.editorTitleHint}
                            >
                                {noteName}
                                <span className="ne-title-edit-hint">✎</span>
                            </h1>
                        )}

                        {hasUnsavedChanges && <span className="ne-unsaved-dot" title={t.editorUnsaved} />}
                    </div>

                    <div className="ne-header-right">
                        {/* Mode toggle */}
                        <div className="ne-mode-toggle">
                            <button
                                className={`ne-mode-btn ${mode === 'edit' ? 'ne-mode-btn--active' : ''}`}
                                onClick={() => setMode('edit')}
                            >{t.editorEdit}</button>
                            <button
                                className={`ne-mode-btn ${mode === 'preview' ? 'ne-mode-btn--active' : ''}`}
                                onClick={() => setMode('preview')}
                            >{t.editorPreview}</button>
                        </div>

                        {/* Preview theme chips (only visible in preview mode) */}
                        {mode === 'preview' && (
                            <div className="ne-theme-picker">
                                {(Object.entries(PREVIEW_THEMES) as [PreviewTheme, typeof PREVIEW_THEMES[PreviewTheme]][]).map(([key, th]) => (
                                    <button
                                        key={key}
                                        className={`ne-theme-chip ${previewTheme === key ? 'ne-theme-chip--active' : ''}`}
                                        onClick={() => setPreviewTheme(key)}
                                        title={th.label}
                                        style={{ background: th.bg, color: th.text }}
                                    >
                                        {th.icon}
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            className={`ne-save-btn ${hasUnsavedChanges ? 'ne-save-btn--dirty' : ''}`}
                            onClick={handleSave}
                            disabled={isSaving || !hasUnsavedChanges}
                            title={t.editorSaveShortcut}
                        >
                            {isSaving ? t.editorSaving : `↑ ${t.editorSave}`}
                        </button>

                        <button className="ne-close-btn" onClick={onClose} title={t.editorClose}>
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </header>

                {/* ── Toolbar (edit mode only) ─────────────────────── */}
                {mode === 'edit' && (
                    <div className="ne-toolbar">
                        {toolbarGroups.map((group, gi) => (
                            <React.Fragment key={gi}>
                                {gi > 0 && <div className="ne-toolbar-sep" />}
                                {group.map(btn => (
                                    <button
                                        key={btn.title}
                                        className="ne-toolbar-btn"
                                        title={btn.title}
                                        onMouseDown={e => { e.preventDefault(); btn.action() }}
                                    >{btn.icon}</button>
                                ))}
                            </React.Fragment>
                        ))}
                        <div className="ne-toolbar-sep" />
                        <button
                            className="ne-toolbar-btn ne-toolbar-btn--link"
                            title={t.editorLinkTitle}
                            onMouseDown={e => { e.preventDefault(); openLinkPicker() }}
                        >{t.editorLinkBtn}</button>
                    </div>
                )}

                {/* ── Body ────────────────────────────────────────── */}
                <div className="ne-body">
                    {isLoading ? (
                        <div className="ne-loading">
                            <div className="ne-spinner" />
                            <span>{t.editorLoading}</span>
                        </div>
                    ) : mode === 'edit' ? (
                        <textarea
                            ref={textareaRef}
                            className="ne-textarea"
                            value={content}
                            onChange={handleTextareaChange}
                            spellCheck={false}
                            placeholder={t.editorPlaceholder}
                        />
                    ) : (
                        <div
                            className="ne-preview"
                            data-theme={previewTheme}
                            style={{ background: theme.bg, color: theme.text }}
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                        />
                    )}
                </div>
            </div>

            {/* ── Note Link Picker ─────────────────────────────── */}
            {showLinkPicker && hierarchy && (
                <NoteLinkPicker
                    hierarchy={hierarchy}
                    onSelect={handleLinkSelect}
                    onClose={() => setShowLinkPicker(false)}
                />
            )}
        </div>
    )
}
