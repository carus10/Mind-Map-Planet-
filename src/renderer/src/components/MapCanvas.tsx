import React, { useRef, useEffect, useCallback } from 'react'
import { useMapStore } from '../store/mapStore'
import { useMapRenderer } from '../hooks/useMapRenderer'
import type { MapItem } from '../types/hierarchy'
import { buildObsidianUrl } from '../utils/obsidianUrl'

const COLORS = {
  bg: '#0f1117',
  itemFill: '#1e2130',
  itemFillHover: '#2a3050',
  itemFillEmpty: '#161820',
  itemBorder: '#3a4060',
  itemBorderHover: '#6a7aff',
  itemBorderEmpty: '#252830',
  textPrimary: '#e8eaf6',
  textSecondary: '#6b7280',
  shadow: 'rgba(106,122,255,0.25)',
  homeFill: '#1a2a1a',
  homeBorder: '#3a6040',
  homeBorderHover: '#6aff8a'
}

function drawItem(ctx: CanvasRenderingContext2D, item: MapItem): void {
  const { x, y, width, height, node, isHovered } = item
  const isEmpty = node.isEmpty
  const isHome = node.type === 'home'

  ctx.save()

  // Shadow
  if (isHovered || !isEmpty) {
    ctx.shadowColor = isHome ? 'rgba(106,255,138,0.3)' : COLORS.shadow
    ctx.shadowBlur = isHovered ? 20 : 10
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 4
  }

  // Fill
  const radius = 10
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)

  if (isHome) {
    ctx.fillStyle = isHovered ? '#1f3a1f' : COLORS.homeFill
  } else if (isEmpty) {
    ctx.fillStyle = COLORS.itemFillEmpty
  } else {
    ctx.fillStyle = isHovered ? COLORS.itemFillHover : COLORS.itemFill
  }
  ctx.fill()

  // Border
  ctx.shadowBlur = 0
  ctx.strokeStyle = isHome
    ? (isHovered ? COLORS.homeBorderHover : COLORS.homeBorder)
    : (isHovered ? COLORS.itemBorderHover : (isEmpty ? COLORS.itemBorderEmpty : COLORS.itemBorder))
  ctx.lineWidth = isHovered ? 2 : 1
  ctx.stroke()

  // Icon
  const icons: Record<string, string> = { country: '🌍', city: '🏙️', town: '🏘️', home: '📄' }
  ctx.font = '22px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(icons[node.type] ?? '📄', x + width / 2, y + height / 2 - 14)

  // Name
  ctx.font = `${isHovered ? 600 : 500} 13px -apple-system, BlinkMacSystemFont, sans-serif`
  ctx.fillStyle = isEmpty ? COLORS.textSecondary : COLORS.textPrimary
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const maxWidth = width - 16
  let name = node.name
  if (ctx.measureText(name).width > maxWidth) {
    while (ctx.measureText(name + '…').width > maxWidth && name.length > 0) {
      name = name.slice(0, -1)
    }
    name += '…'
  }
  ctx.fillText(name, x + width / 2, y + height / 2 + 6)

  // Child count badge
  if (!isHome && node.children.length > 0) {
    ctx.font = '11px sans-serif'
    ctx.fillStyle = COLORS.textSecondary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`${node.children.length}`, x + width / 2, y + height - 8)
  }

  ctx.restore()
}

function hitTest(items: MapItem[], wx: number, wy: number): MapItem | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const { x, y, width, height } = items[i]
    if (wx >= x && wx <= x + width && wy >= y && wy <= y + height) return items[i]
  }
  return null
}

export function MapCanvas(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const items = useMapRenderer()
  const { camera, setCamera, drillDown, setHovered, setRenameTarget, setError, hierarchy, language } = useMapStore((s) => ({
    camera: s.camera,
    setCamera: s.setCamera,
    drillDown: s.drillDown,
    setHovered: s.setHovered,
    setRenameTarget: s.setRenameTarget,
    setError: s.setError,
    hierarchy: s.hierarchy,
    language: s.language
  }))

  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const cameraRef = useRef(camera)
  cameraRef.current = camera

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
    }

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.translate(camera.x + w / 2, camera.y + h / 2)
    ctx.scale(camera.scale, camera.scale)

    // Center items
    const cols = Math.min(5, items.length)
    const totalW = cols * 160 + (cols - 1) * 60
    ctx.translate(-totalW / 2, -Math.ceil(items.length / 5) * 160 / 2)

    for (const item of items) drawItem(ctx, item)

    ctx.restore()

    // Empty state
    if (items.length === 0) {
      ctx.font = '16px sans-serif'
      ctx.fillStyle = COLORS.textSecondary
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('No items to display', w / 2, h / 2)
    }
  }, [items, camera])

  const toWorld = useCallback((cx: number, cy: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { wx: 0, wy: 0 }
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    const cam = cameraRef.current
    const cols = Math.min(5, items.length)
    const totalW = cols * 160 + (cols - 1) * 60
    const offsetX = cam.x + w / 2 - (totalW / 2) * cam.scale
    const offsetY = cam.y + h / 2 - (Math.ceil(items.length / 5) * 160 / 2) * cam.scale
    return {
      wx: (cx - offsetX) / cam.scale,
      wy: (cy - offsetY) / cam.scale
    }
  }, [items.length])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const cam = cameraRef.current
    setCamera({ scale: cam.scale * delta })
  }, [setCamera])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      isPanning.current = true
      lastMouse.current = { x: e.clientX, y: e.clientY }
    }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const { wx, wy } = toWorld(cx, cy)
    const hit = hitTest(items, wx, wy)
    setHovered(hit?.node.id ?? null)

    if (isPanning.current) {
      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      lastMouse.current = { x: e.clientX, y: e.clientY }
      const cam = cameraRef.current
      setCamera({ x: cam.x + dx, y: cam.y + dy })
    }
  }, [items, toWorld, setHovered, setCamera])

  const onMouseUp = useCallback(() => { isPanning.current = false }, [])

  const onClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const { wx, wy } = toWorld(cx, cy)
    const hit = hitTest(items, wx, wy)
    if (!hit) return

    if (hit.node.type === 'home') {
      if (!hierarchy) return
      const url = buildObsidianUrl(hierarchy.vaultName, hit.node.relativePath)
      window.api.openObsidian(url).catch(() => {
        setError(language === 'tr' ? 'Obsidian açılamadı.' : 'Could not open Obsidian.')
      })
    } else {
      drillDown(hit.node)
    }
  }, [items, toWorld, hierarchy, drillDown, setError, language])

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const { wx, wy } = toWorld(cx, cy)
    const hit = hitTest(items, wx, wy)
    if (hit) setRenameTarget(hit.node)
  }, [items, toWorld, setRenameTarget])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', cursor: isPanning.current ? 'grabbing' : 'default' }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onClick={onClick}
      onContextMenu={onContextMenu}
    />
  )
}
