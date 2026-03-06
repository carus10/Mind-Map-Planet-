import React, { useEffect, useState } from 'react'
import { useMapStore } from '../store/mapStore'
import './SuccessToast.css'

export function SuccessToast(): React.ReactElement | null {
    const { successMessage, setSuccessMessage } = useMapStore((s) => ({
        successMessage: s.successMessage,
        setSuccessMessage: s.setSuccessMessage,
    }))
    const [exiting, setExiting] = useState(false)

    useEffect(() => {
        if (!successMessage) {
            setExiting(false)
            return
        }
        // Start exit animation after 1.7s, then clear after 0.3s fade
        const exitTimer = setTimeout(() => setExiting(true), 1700)
        const clearTimer = setTimeout(() => {
            setSuccessMessage(null)
            setExiting(false)
        }, 2000)

        return () => {
            clearTimeout(exitTimer)
            clearTimeout(clearTimer)
        }
    }, [successMessage, setSuccessMessage])

    if (!successMessage) return null

    return (
        <div
            className={`success-toast ${exiting ? 'success-toast--exiting' : ''}`}
            onClick={() => {
                setSuccessMessage(null)
                setExiting(false)
            }}
        >
            <span className="success-toast-icon">✅</span>
            <span className="success-toast-msg">{successMessage}</span>
        </div>
    )
}
