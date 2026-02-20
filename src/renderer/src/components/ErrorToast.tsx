import React, { useEffect } from 'react'
import { useMapStore } from '../store/mapStore'
import './ErrorToast.css'

export function ErrorToast(): React.ReactElement | null {
  const { error, setError } = useMapStore((s) => ({ error: s.error, setError: s.setError }))

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(null), 3000)
    return () => clearTimeout(timer)
  }, [error, setError])

  if (!error) return null

  return (
    <div className="toast" onClick={() => setError(null)}>
      <span className="toast-icon">⚠️</span>
      <span className="toast-msg">{error}</span>
    </div>
  )
}
