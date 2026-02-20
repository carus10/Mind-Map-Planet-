import React from 'react'
import { useMapStore } from '../store/mapStore'
import './CargoHold.css'

export function CargoHold(): React.ReactElement | null {
    const { stashedNodes, unstashNode, clearStash, setActiveDraggedNode } = useMapStore((s) => ({
        stashedNodes: s.stashedNodes,
        unstashNode: s.unstashNode,
        clearStash: s.clearStash,
        setActiveDraggedNode: s.setActiveDraggedNode
    }))

    if (stashedNodes.length === 0) return null

    return (
        <div className="cargo-hold">
            <div className="cargo-hold-header">
                <span>Space Cargo ({stashedNodes.length})</span>
                <button className="cargo-clear-btn" onClick={clearStash}>Clear</button>
            </div>
            <div className="cargo-hold-items">
                {stashedNodes.map(node => (
                    <div key={node.id} className="cargo-item">
                        <span className="cargo-item-icon">📄</span>
                        <span className="cargo-item-name">{node.name}</span>
                        <button
                            className="cargo-item-remove"
                            onClick={() => unstashNode(node.id)}
                            title="Remove from cargo"
                        >
                            ×
                        </button>
                        <div
                            className="cargo-item-drag-handle"
                            onPointerDown={(e) => {
                                e.stopPropagation()
                                setActiveDraggedNode(node)
                            }}
                        >
                            ☷
                        </div>
                    </div>
                ))}
            </div>
            <div className="cargo-instruction">
                Drag items from here to a planet to relocate them.
            </div>
        </div>
    )
}
