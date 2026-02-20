import React, { Component } from 'react'

interface Props {
    children: React.ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('ErrorBoundary caught:', error, errorInfo)
    }

    render(): React.ReactNode {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: '100vh', background: '#0a0a14', color: '#e0e0ff', fontFamily: 'Inter, sans-serif', padding: 40
                }}>
                    <h2 style={{ marginBottom: 16, color: '#ef5350' }}>⚠️ Bir hata oluştu</h2>
                    <pre style={{
                        background: '#1a1a2e', padding: 20, borderRadius: 12, maxWidth: 600, overflow: 'auto',
                        fontSize: 13, color: '#f87171', border: '1px solid rgba(239,83,80,0.2)', whiteSpace: 'pre-wrap'
                    }}>
                        {this.state.error?.message}
                        {'\n\n'}
                        {this.state.error?.stack}
                    </pre>
                    <button
                        onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
                        style={{
                            marginTop: 20, padding: '10px 24px', background: 'linear-gradient(135deg, #5c6bc0, #7e57c2)',
                            color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer'
                        }}
                    >
                        Yeniden Yükle
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
