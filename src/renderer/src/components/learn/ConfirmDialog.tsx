import React, { useState, useCallback, useRef, createContext, useContext } from 'react'

interface ConfirmState {
    message: string
    resolve: (value: boolean) => void
}

interface ConfirmContextValue {
    confirmAsync: (message: string) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function useConfirm(): (message: string) => Promise<boolean> {
    const ctx = useContext(ConfirmContext)
    if (!ctx) {
        // fallback to native confirm if context is not available
        return (msg: string) => Promise.resolve(window.confirm(msg))
    }
    return ctx.confirmAsync
}

interface ProviderProps {
    children: React.ReactNode
}

export function ConfirmProvider({ children }: ProviderProps): React.ReactElement {
    const [state, setState] = useState<ConfirmState | null>(null)
    const resolveRef = useRef<((value: boolean) => void) | null>(null)

    const confirmAsync = useCallback((message: string): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve
            setState({ message, resolve })
        })
    }, [])

    const handleConfirm = useCallback(() => {
        resolveRef.current?.(true)
        setState(null)
        resolveRef.current = null
    }, [])

    const handleCancel = useCallback(() => {
        resolveRef.current?.(false)
        setState(null)
        resolveRef.current = null
    }, [])

    return (
        <ConfirmContext.Provider value={{ confirmAsync }}>
            {children}
            {state && (
                <div
                    className="le-confirm-overlay"
                    onClick={handleCancel}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="le-confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="le-confirm-icon">⚠️</div>
                        <p className="le-confirm-message">{state.message}</p>
                        <div className="le-confirm-actions">
                            <button className="le-confirm-btn le-confirm-btn-cancel" onClick={handleCancel}>
                                ✕
                            </button>
                            <button className="le-confirm-btn le-confirm-btn-ok" onClick={handleConfirm} autoFocus>
                                ✓
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    )
}
