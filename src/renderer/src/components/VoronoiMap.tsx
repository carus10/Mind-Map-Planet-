/* ═══════════════════════════════════════════════════════════
   VoronoiMap — Planet-Style Knowledge Map + Solar System
   ═══════════════════════════════════════════════════════════
   depth 0 → Solar System: her üst klasör = ayrı gezegen
   depth > 0 → Planet View: Voronoi subdivision
   ═══════════════════════════════════════════════════════════ */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Delaunay } from 'd3-delaunay'
import { polygonCentroid, polygonArea, polygonContains } from 'd3-polygon'
import { useMapStore } from '../store/mapStore'
import { buildObsidianUrl } from '../utils/obsidianUrl'
import type { HierarchyNode, VaultHierarchy } from '../types/hierarchy'
import './VoronoiMap.css'

/* ── Tip Tanımları ────────────────────────────────────────── */

interface VoronoiCell {
    node: HierarchyNode
    polygon: [number, number][]
    centroid: [number, number]
    area: number
    color: string
}

/* ── Gezegen Renk Paleti (Solar System) ───────────────────── */

const PLANET_COLORS = [
    { base: '#1a5276', glow: 'rgba(40,120,200,0.3)', accent: '#2980b9' },   // mavi
    { base: '#1e6f5c', glow: 'rgba(40,180,130,0.3)', accent: '#27ae60' },   // yeşil
    { base: '#6d4c41', glow: 'rgba(160,100,60,0.3)', accent: '#a0522d' },   // kahverengi
    { base: '#5b2c6f', glow: 'rgba(120,60,160,0.3)', accent: '#8e44ad' },   // mor
    { base: '#7b241c', glow: 'rgba(180,60,50,0.3)', accent: '#c0392b' },    // kırmızı
    { base: '#6e5c10', glow: 'rgba(180,160,40,0.3)', accent: '#d4ac0d' },   // altın
    { base: '#1a4d6e', glow: 'rgba(40,100,160,0.3)', accent: '#2471a3' },   // çelik mavi
    { base: '#145a32', glow: 'rgba(30,140,70,0.3)', accent: '#1e8449' },    // koyu yeşil
    { base: '#6c3461', glow: 'rgba(150,70,130,0.3)', accent: '#a93296' },   // fuşya
    { base: '#4a4a5a', glow: 'rgba(100,100,140,0.3)', accent: '#7f8c8d' },  // gri-mavi
]

/* ── Derinlik Renk Paletleri (Planet View) ────────────────── */

const DEPTH_PALETTES: string[][] = [
    ['#1a4d6e', '#2d6a4f', '#5c3d2e', '#6d5c10', '#4a3060', '#8b3a3a', '#2e5065', '#4a6741', '#6e4b35', '#3a4a5c',
        '#1e6f5c', '#7a5038', '#553a6a', '#887520', '#944040', '#0d3b66', '#355e3b', '#634530', '#756215', '#48305c'],
    ['#2d6a4f', '#3a5a2c', '#4a6741', '#1a5276', '#355e3b', '#2e5339', '#3d6b4f', '#1e6f5c', '#186a5e', '#4d7045',
        '#2b5233', '#436a3d', '#385e35', '#0f4c5c', '#145a5e', '#14506a', '#1b5e7a', '#1a4d6e', '#0d3b66', '#0e4460'],
    ['#5c3d2e', '#6b4433', '#7a5038', '#634530', '#6e4b35', '#7d5540', '#5a3b2b', '#74503a', '#684838', '#7f5842',
        '#8b5a40', '#925e45', '#553020', '#6a3d28', '#7e5035', '#8a5a3d', '#4d3020', '#704535', '#855840', '#604030'],
    ['#6d5c10', '#7a6a18', '#887520', '#756215', '#836f1d', '#917c25', '#6b5a0e', '#7f6d1a', '#736018', '#8a7722',
        '#9a8530', '#5d5008', '#6a5a12', '#8c7820', '#a09028', '#544808', '#786818', '#968028', '#604e0a', '#847220'],
    ['#3a4a5c', '#44566a', '#4e6078', '#3e5060', '#485a6e', '#52647c', '#384858', '#4c5e72', '#425468', '#566880',
        '#606e80', '#364050', '#505e70', '#5a6878', '#3c4e60', '#465a6c', '#546474', '#384a5a', '#4a5c6e', '#586878'],
    ['#4a3060', '#553a6a', '#604478', '#4e345e', '#5a3e68', '#644876', '#48305c', '#5c4070', '#523864', '#66507a',
        '#704880', '#3e2850', '#583868', '#6a4c7c', '#462c58', '#523a66', '#604474', '#3c2a52', '#564070', '#684e80'],
]

const DEPTH_HOVER: string[][] = [
    ['#2a6d8e', '#3d8a6f', '#8c5d4e', '#9d8c30', '#6a5080', '#ab5a5a', '#4e7085', '#6a8761'],
    ['#4d8a6f', '#5a9a5c', '#6a8761', '#2a7296', '#457e4b', '#3e7349', '#4d8b6f', '#2e8a7a'],
    ['#7c5d4e', '#8b6453', '#9a7058', '#836550', '#8e6b55', '#9d7a60', '#7a5540', '#946858'],
    ['#8d7c30', '#9a8a38', '#a89540', '#958235', '#a38f3d', '#b09a48', '#8a7828', '#9e8c38'],
    ['#5a6a7c', '#64768a', '#6e8098', '#5e7080', '#687a8e', '#728498', '#566878', '#6c7e90'],
    ['#6a5080', '#755a8a', '#806498', '#6e547e', '#7a5e88', '#8468a0', '#664c78', '#7c5a90'],
]

const DEPTH_LABELS = ['Güneş Sistemi', 'Kıtalar', 'Bölgeler', 'Şehirler', 'Yapılar', 'Odalar']

function getDepthPalette(depth: number): string[] {
    return DEPTH_PALETTES[Math.min(depth, DEPTH_PALETTES.length - 1)]
}
function getDepthHover(depth: number): string[] {
    return DEPTH_HOVER[Math.min(depth, DEPTH_HOVER.length - 1)]
}
function getDepthLabel(depth: number): string {
    return DEPTH_LABELS[Math.min(depth, DEPTH_LABELS.length - 1)]
}

/* ── Yardımcı Fonksiyonlar ────────────────────────────────── */

function hashStr(s: string): number {
    let h = 0
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0
    }
    return Math.abs(h)
}

function pickColor(name: string, depth: number): string {
    const palette = getDepthPalette(depth)
    return palette[hashStr(name) % palette.length]
}

/* ── Geometri ─────────────────────────────────────────────── */

function circleToPolygon(cx: number, cy: number, r: number, segments: number = 64): [number, number][] {
    const poly: [number, number][] = []
    for (let i = 0; i < segments; i++) {
        const angle = (2 * Math.PI * i) / segments - Math.PI / 2
        poly.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
    }
    return poly
}

function polygonBounds(poly: [number, number][]): {
    minX: number; minY: number; maxX: number; maxY: number; width: number; height: number
} {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const [x, y] of poly) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

function clipPolygon(subject: [number, number][], clip: [number, number][]): [number, number][] {
    if (subject.length === 0 || clip.length === 0) return []
    let output: [number, number][] = [...subject]
    for (let i = 0; i < clip.length; i++) {
        if (output.length === 0) return []
        const input = [...output]
        output = []
        const edgeStart = clip[i]
        const edgeEnd = clip[(i + 1) % clip.length]
        for (let j = 0; j < input.length; j++) {
            const current = input[j]
            const previous = input[(j + input.length - 1) % input.length]
            const currInside = isInside(current, edgeStart, edgeEnd)
            const prevInside = isInside(previous, edgeStart, edgeEnd)
            if (currInside) {
                if (!prevInside) {
                    const inter = intersection(previous, current, edgeStart, edgeEnd)
                    if (inter) output.push(inter)
                }
                output.push(current)
            } else if (prevInside) {
                const inter = intersection(previous, current, edgeStart, edgeEnd)
                if (inter) output.push(inter)
            }
        }
    }
    return output
}

function isInside(point: [number, number], edgeStart: [number, number], edgeEnd: [number, number]): boolean {
    return (edgeEnd[0] - edgeStart[0]) * (point[1] - edgeStart[1]) - (edgeEnd[1] - edgeStart[1]) * (point[0] - edgeStart[0]) >= 0
}

function intersection(p1: [number, number], p2: [number, number], p3: [number, number], p4: [number, number]): [number, number] | null {
    const x1 = p1[0], y1 = p1[1], x2 = p2[0], y2 = p2[1]
    const x3 = p3[0], y3 = p3[1], x4 = p4[0], y4 = p4[1]
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if (Math.abs(denom) < 1e-10) return null
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)]
}

function randomPointInPolygon(poly: [number, number][], seed: number): [number, number] {
    const bounds = polygonBounds(poly)
    let s = seed
    const rand = (): number => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff }
    for (let attempt = 0; attempt < 500; attempt++) {
        const x = bounds.minX + rand() * bounds.width
        const y = bounds.minY + rand() * bounds.height
        if (polygonContains(poly, [x, y])) return [x, y]
    }
    return polygonCentroid(poly)
}

function generateSeedPoints(parentPolygon: [number, number][], children: HierarchyNode[]): [number, number][] {
    const points: [number, number][] = []
    for (let i = 0; i < children.length; i++) {
        const seed = hashStr(children[i].name + children[i].id) + i * 7919
        points.push(randomPointInPolygon(parentPolygon, seed))
    }
    return points
}

/* ── Voronoi Hesaplama ────────────────────────────────────── */

function computeVoronoiCells(parentPolygon: [number, number][], children: HierarchyNode[], depth: number): VoronoiCell[] {
    if (children.length === 0) return []
    if (children.length === 1) {
        const child = children[0]
        return [{
            node: child, polygon: parentPolygon, centroid: polygonCentroid(parentPolygon),
            area: Math.abs(polygonArea(parentPolygon)), color: child.color || pickColor(child.name, depth),
        }]
    }
    const bounds = polygonBounds(parentPolygon)
    const points = generateSeedPoints(parentPolygon, children)
    const delaunay = Delaunay.from(points)
    const voronoi = delaunay.voronoi([bounds.minX, bounds.minY, bounds.maxX, bounds.maxY])
    const cells: VoronoiCell[] = []
    for (let i = 0; i < children.length; i++) {
        const cellPoly = voronoi.cellPolygon(i)
        if (!cellPoly || cellPoly.length < 3) continue
        let rawPoly: [number, number][] = cellPoly.map((p) => [p[0], p[1]] as [number, number])
        if (rawPoly.length > 1 && rawPoly[0][0] === rawPoly[rawPoly.length - 1][0] && rawPoly[0][1] === rawPoly[rawPoly.length - 1][1]) {
            rawPoly = rawPoly.slice(0, -1)
        }
        const clipped = clipPolygon(rawPoly, parentPolygon)
        if (clipped.length < 3) continue
        const area = Math.abs(polygonArea(clipped))
        if (area < 1) continue
        cells.push({
            node: children[i], polygon: clipped, centroid: polygonCentroid(clipped),
            area, color: children[i].color || pickColor(children[i].name, depth),
        })
    }
    return cells
}

function polygonToPath(poly: [number, number][]): string {
    if (poly.length === 0) return ''
    return poly.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ') + ' Z'
}

function computeLabelSize(area: number, totalArea: number, planetRadius: number): number {
    const fraction = area / totalArea
    const base = Math.sqrt(fraction) * planetRadius * 0.18
    return Math.max(7, Math.min(22, base))
}

/* ── Yıldız Üreteci ──────────────────────────────────────── */

interface Star { cx: number; cy: number; r: number; opacity: number; delay: number; duration: number }

function generateStars(width: number, height: number, count: number): Star[] {
    const stars: Star[] = []
    let s = 42
    const rand = (): number => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff }
    for (let i = 0; i < count; i++) {
        stars.push({
            cx: rand() * width, cy: rand() * height, r: 0.3 + rand() * 1.5,
            opacity: 0.2 + rand() * 0.6, delay: rand() * 8, duration: 2 + rand() * 5,
        })
    }
    return stars
}

/* ═══════════════════════════════════════════════════════════
   React Bileşeni
   ═══════════════════════════════════════════════════════════ */

interface VoronoiMapProps { hierarchy: VaultHierarchy }

export function VoronoiMap({ hierarchy }: VoronoiMapProps): React.ReactElement {
    const containerRef = useRef<HTMLDivElement>(null)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const [transitioning, setTransitioning] = useState(false)
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

    // Solar system pan + zoom — useRef for immediate drag tracking
    const panXRef = useRef(0)
    const panYRef = useRef(0)
    const zoomRef = useRef(1)
    const [panX, setPanX] = useState(0)
    const [panY, setPanY] = useState(0)
    const [zoom, setZoom] = useState(1)
    const [didDrag, setDidDrag] = useState(false)
    const isDraggingRef = useRef(false)
    const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

    const voronoiPath = useMapStore((s) => s.voronoiPath)
    const voronoiDrillDown = useMapStore((s) => s.voronoiDrillDown)
    const voronoiGoBack = useMapStore((s) => s.voronoiGoBack)
    const voronoiJumpTo = useMapStore((s) => s.voronoiJumpTo)
    const setRenameTarget = useMapStore((s) => s.setRenameTarget)
    const setError = useMapStore((s) => s.setError)
    const setHierarchy = useMapStore((s) => s.setHierarchy)
    const stashNode = useMapStore((s) => s.stashNode)
    const unstashNode = useMapStore((s) => s.unstashNode)
    const activeDraggedNode = useMapStore((s) => s.activeDraggedNode)
    const setActiveDraggedNode = useMapStore((s) => s.setActiveDraggedNode)

    const depth = voronoiPath.length
    const isSolarSystem = depth === 0
    const isSolarRef = useRef(isSolarSystem)
    isSolarRef.current = isSolarSystem
    const hierarchyRef = useRef(hierarchy)
    hierarchyRef.current = hierarchy
    const activeDraggedRef = useRef(activeDraggedNode)
    activeDraggedRef.current = activeDraggedNode

    // Drag & Drop
    const dragTimerRef = useRef<NodeJS.Timeout | null>(null)
    const dragPointerDownRef = useRef({ x: 0, y: 0 })
    const dragPointerDownRefRaw = useRef({ x: 0, y: 0 }) // For raw X,Y caching
    const draggedNodeRef = useRef<HierarchyNode | null>(null)
    const dragPendingNodeRef = useRef<HierarchyNode | null>(null)
    const dropTargetRef = useRef<HierarchyNode | null>(null)

    const [draggedNode, setDraggedNode] = useState<HierarchyNode | null>(null)
    const [dropTargetId, setDropTargetId] = useState<string | null>(null)
    const [dragPos, setDragPos] = useState({ x: 0, y: 0 })

    const dragPointerDownCacheRef = dragPointerDownRefRaw

    const handleNodePointerDown = useCallback((e: React.PointerEvent, node: HierarchyNode) => {
        if (e.button !== 0) return
        if (dragTimerRef.current) clearTimeout(dragTimerRef.current)

        dragPointerDownCacheRef.current = { x: e.clientX, y: e.clientY }
        dragPendingNodeRef.current = node

        dragTimerRef.current = setTimeout(() => {
            draggedNodeRef.current = dragPendingNodeRef.current
            setDraggedNode(dragPendingNodeRef.current)
            setDragPos({ x: e.clientX, y: e.clientY })
            if (containerRef.current) containerRef.current.style.cursor = 'grabbing'
            dragPendingNodeRef.current = null
            dragTimerRef.current = null
        }, 250)
    }, [])

    const handleNodePointerEnter = useCallback((e: React.PointerEvent, node: HierarchyNode) => {
        const dragging = draggedNodeRef.current || activeDraggedRef.current
        if (dragging && dragging.id !== node.id) {
            dropTargetRef.current = node
            setDropTargetId(node.id)
        }
    }, [])

    const handleNodePointerLeave = useCallback((e: React.PointerEvent) => {
        const dragging = draggedNodeRef.current || activeDraggedRef.current
        if (dragging) {
            dropTargetRef.current = null
            setDropTargetId(null)
        }
    }, [])

    /* ── Link Çözümleme Haritaları ────────────────────────── */
    const { nodeMap, parentMap } = useMemo(() => {
        const nm = new Map<string, HierarchyNode>()
        const pm = new Map<string, HierarchyNode>()

        const traverse = (node: HierarchyNode, parentCountry: HierarchyNode | null) => {
            nm.set(node.name, node)
            if (node.id) nm.set(node.id, node)
            if (parentCountry) pm.set(node.id, parentCountry)
            if (node.children) {
                node.children.forEach(c => traverse(c, parentCountry || node))
            }
        }

        hierarchy.countries.forEach(c => traverse(c, c))
        return { nodeMap: nm, parentMap: pm }
    }, [hierarchy])

    /* ── Boyut Takibi ─────────────────────────────────────── */
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const update = (): void => {
            const rect = el.getBoundingClientRect()
            setDimensions({ width: rect.width, height: rect.height })
        }
        update()
        const observer = new ResizeObserver(update)
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    /* ── Yıldızlar ────────────────────────────────────────── */
    const stars = useMemo(
        () => generateStars(dimensions.width * 2, dimensions.height, 300),
        [dimensions.width, dimensions.height]
    )

    /* ── Solar System: Gezegen Yerleşimi ───────────────────── */

    const planets = useMemo(() => {
        if (!isSolarSystem) return []
        const countries = hierarchy.countries
        if (countries.length === 0) return []

        const { width, height } = dimensions
        const baseRadius = Math.min(width, height) * 0.14
        const spreadFactor = baseRadius * 4.5 // Gezegenler arası ortalama mesafe

        return countries.map((node, i) => {
            const childCount = node.children?.length || 0
            const radius = baseRadius * (0.7 + 0.5 * Math.min(childCount / 15, 1))

            // Dağınık, galaksi benzeri yerleşim (Phyllotaxis spiral tabanlı)
            // İlk gezegen merkezde, diğerleri dışa doğru açılır
            const angle = i * 2.39996 // Altın açı (137.5 derece)
            const distance = i === 0 ? 0 : Math.sqrt(i) * spreadFactor

            // Hafif rastgelelik ekle (çok uzaklaşmamaları için distance'ın %20'si kadar)
            const randDist = (hashStr(node.name) % 100) / 100 * distance * 0.2
            const finalDist = distance + randDist

            const cx = width / 2 + Math.cos(angle) * finalDist
            const cy = height / 2 + Math.sin(angle) * finalDist

            const colorSet = PLANET_COLORS[hashStr(node.name) % PLANET_COLORS.length]
            return { node, cx, cy, radius, colorSet }
        })
    }, [isSolarSystem, hierarchy.countries, dimensions])

    /* ── Solar System: Global Link Hesaplaması ──────────────── */
    const globalLinks = useMemo(() => {
        if (!isSolarSystem || planets.length === 0) return []
        const links: { source: number, target: number, count: number }[] = []
        const n = planets.length

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                let count = 0

                const countLinks = (planetA: HierarchyNode, planetB: HierarchyNode) => {
                    let c = 0
                    const check = (node: HierarchyNode) => {
                        if (node.links) {
                            node.links.forEach(l => {
                                // Obsidian link format is usually just title. We use nodeMap.
                                const target = nodeMap.get(l)
                                if (target && parentMap.get(target.id)?.id === planetB.id) {
                                    c++
                                }
                            })
                        }
                        node.children?.forEach(check)
                    }
                    check(planetA)
                    return c
                }

                count += countLinks(planets[i].node, planets[j].node)
                count += countLinks(planets[j].node, planets[i].node)

                if (count > 0) {
                    links.push({ source: i, target: j, count })
                }
            }
        }
        return links
    }, [isSolarSystem, planets, nodeMap, parentMap])

    /* ── Solar System: Native DOM Event Listeners ─────────── */

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const onMouseDown = (e: MouseEvent): void => {
            if (!isSolarRef.current) return
            isDraggingRef.current = true
            setDidDrag(false)
            dragStartRef.current = { x: e.clientX, y: e.clientY, panX: panXRef.current, panY: panYRef.current }
            el.style.cursor = 'grabbing'
        }

        const onMouseMove = (e: MouseEvent): void => {
            if (activeDraggedRef.current) {
                setDragPos({ x: e.clientX, y: e.clientY })
                return
            }

            if (draggedNodeRef.current) {
                setDragPos({ x: e.clientX, y: e.clientY })
                return
            }

            if (dragTimerRef.current) {
                const dx = e.clientX - dragPointerDownCacheRef.current.x
                const dy = e.clientY - dragPointerDownCacheRef.current.y

                if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                    clearTimeout(dragTimerRef.current)
                    dragTimerRef.current = null

                    // User moved the mouse quickly while clicking a node
                    // Insta-trigger the drag instead of canceling it (fixes stuttering)
                    if (dragPendingNodeRef.current) {
                        draggedNodeRef.current = dragPendingNodeRef.current
                        setDraggedNode(dragPendingNodeRef.current)
                        setDragPos({ x: e.clientX, y: e.clientY })
                        if (containerRef.current) containerRef.current.style.cursor = 'grabbing'
                        dragPendingNodeRef.current = null
                        return // Skip standard panning processing for this frame
                    }
                }
            }

            if (!isDraggingRef.current) return
            const dx = e.clientX - dragStartRef.current.x
            const dy = e.clientY - dragStartRef.current.y
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) setDidDrag(true)

            // Kamera pozisyonu: Sürükleme hızını mevcut zoom'a bölüyoruz ki fare ile 1:1 kaysın
            const newPanX = dragStartRef.current.panX - dx / zoomRef.current
            const newPanY = dragStartRef.current.panY - dy / zoomRef.current
            panXRef.current = newPanX
            panYRef.current = newPanY
            setPanX(newPanX)
            setPanY(newPanY)
        }

        const onMouseUp = (): void => {
            if (dragTimerRef.current) {
                clearTimeout(dragTimerRef.current)
                dragTimerRef.current = null
            }

            if (draggedNodeRef.current || activeDraggedRef.current) {
                const src = draggedNodeRef.current || activeDraggedRef.current
                const dst = dropTargetRef.current

                if (src && dst && src.id !== dst.id) {
                    // Yöntem 2 için (Kargo'dan çıkarılan dosyanın hedefe taşınması)
                    window.api.moveNode(src.absolutePath, dst.absolutePath).then(res => {
                        if (res && res.success) {
                            if (activeDraggedRef.current) unstashNode(src.id) // Kargodan başarıyla çıktı
                            window.api.scanVault(hierarchyRef.current.vaultPath).then(updated => {
                                if (updated) setHierarchy(updated as never)
                            })
                        } else {
                            setError(res ? res.error || "Failed to move node" : "Failed to move node")
                        }
                    })
                } else if (!dst && draggedNodeRef.current) {
                    // Sadece harita içinden kaldırılanlar kargoya konur, kargodan alınanlar tekrar konmaz
                    stashNode(src as HierarchyNode)
                }

                draggedNodeRef.current = null
                dropTargetRef.current = null
                setDraggedNode(null)
                setDropTargetId(null)
                setActiveDraggedNode(null)

                if (isSolarRef.current && el) el.style.cursor = 'grab'
                return
            }

            isDraggingRef.current = false
            if (isSolarRef.current && el) el.style.cursor = 'grab'
        }

        const onWheel = (e: WheelEvent): void => {
            if (!isSolarRef.current) return
            e.preventDefault()
            const factor = e.deltaY > 0 ? 0.9 : 1.1
            const newZoom = Math.max(0.25, Math.min(3, zoomRef.current * factor))
            zoomRef.current = newZoom
            setZoom(newZoom)
        }

        el.addEventListener('mousedown', onMouseDown)
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
        el.addEventListener('wheel', onWheel, { passive: false })

        return () => {
            el.removeEventListener('mousedown', onMouseDown)
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
            el.removeEventListener('wheel', onWheel)
        }
    }, [dimensions])

    /* ── Planet View: Aktif Node ──────────────────────────── */

    const currentNode = useMemo(() => {
        if (voronoiPath.length === 0) return null
        return voronoiPath[voronoiPath.length - 1]
    }, [voronoiPath])

    /* ── Planet View: Geometri ────────────────────────────── */

    const planetGeometry = useMemo(() => {
        const { width, height } = dimensions
        const cx = width / 2
        const cy = height / 2
        const radius = Math.min(width, height) * 0.42
        return { cx, cy, radius }
    }, [dimensions])

    const currentPolygon = useMemo(
        () => circleToPolygon(planetGeometry.cx, planetGeometry.cy, planetGeometry.radius, 64),
        [planetGeometry]
    )

    const cells = useMemo(() => {
        if (!currentNode || dimensions.width === 0 || dimensions.height === 0) return []
        const children = currentNode.children || []
        if (children.length === 0) return []
        return computeVoronoiCells(currentPolygon, children, depth)
    }, [currentNode, currentPolygon, dimensions, depth])

    const totalArea = useMemo(
        () => cells.reduce((sum, c) => sum + c.area, 0),
        [cells]
    )

    /* ── Planet View: Local Link Hesaplaması ──────────────── */
    const localLinks = useMemo(() => {
        if (isSolarSystem || cells.length === 0) return []

        const links: {
            source: { x: number, y: number, id: string, index: number },
            target: { x: number, y: number, id: string, isForeign: boolean, index: number },
        }[] = []

        const cellMap = new Map<string, { x: number, y: number, index: number }>()
        cells.forEach((c, i) => {
            cellMap.set(c.node.name, { x: c.centroid[0], y: c.centroid[1], index: i })
            if (c.node.id) cellMap.set(c.node.id, { x: c.centroid[0], y: c.centroid[1], index: i })
        })

        cells.forEach((cell, i) => {
            const node = cell.node
            if (!node.links) return

            node.links.forEach((l) => {
                const targetNode = nodeMap.get(l)
                if (!targetNode) return

                // Aynı gezegende mi?
                if (cellMap.has(targetNode.name)) {
                    const targetInfo = cellMap.get(targetNode.name)!
                    links.push({
                        source: { x: cell.centroid[0], y: cell.centroid[1], id: node.id, index: i },
                        target: { x: targetInfo.x, y: targetInfo.y, id: targetNode.id, isForeign: false, index: targetInfo.index }
                    })
                } else if (parentMap.has(targetNode.id)) {
                    // Yabancı gezegen bağlantısı (Inter-planetary)
                    const dx = cell.centroid[0] - planetGeometry.cx
                    const dy = cell.centroid[1] - planetGeometry.cy
                    const dist = Math.hypot(dx, dy) || 1
                    const spreadOut = planetGeometry.radius * 0.95

                    const edgeX = planetGeometry.cx + (dx / dist) * spreadOut
                    const edgeY = planetGeometry.cy + (dy / dist) * spreadOut

                    links.push({
                        source: { x: cell.centroid[0], y: cell.centroid[1], id: node.id, index: i },
                        target: { x: edgeX, y: edgeY, id: targetNode.id, isForeign: true, index: -1 }
                    })
                }
            })
        })

        return links
    }, [isSolarSystem, cells, nodeMap, parentMap, planetGeometry])

    /* ── Navigasyon ───────────────────────────────────────── */

    const drillIntoPlanet = useCallback((node: HierarchyNode) => {
        if (!node.children || node.children.length === 0) return
        setTransitioning(true)
        setTimeout(() => {
            voronoiDrillDown(node)
            setHoveredIndex(null)
            setTransitioning(false)
        }, 400)
    }, [voronoiDrillDown])

    const drillDown = useCallback((cell: VoronoiCell) => {
        if (!cell.node.children || cell.node.children.length === 0) {
            if (cell.node.relativePath && hierarchy.vaultName) {
                const url = buildObsidianUrl(hierarchy.vaultName, cell.node.relativePath)
                window.api.openObsidian(url)
            }
            return
        }
        setTransitioning(true)
        setTimeout(() => {
            voronoiDrillDown(cell.node)
            setHoveredIndex(null)
            setTransitioning(false)
        }, 350)
    }, [voronoiDrillDown, hierarchy.vaultName])

    const handleLinkJump = useCallback((targetId: string) => {
        const targetNode = nodeMap.get(targetId)
        if (!targetNode || !hierarchy.countries) return

        setTransitioning(true)
        setTimeout(() => {
            // Sadece haritayı hedef notun ebeveyn gezegenine uçur (Notu Obsidian'da açma)
            voronoiJumpTo(targetNode, hierarchy.countries)
            setHoveredIndex(null)
            setTransitioning(false)
        }, 350)
    }, [nodeMap, hierarchy.countries, voronoiJumpTo])

    const handleContextMenu = useCallback((e: React.MouseEvent, node: HierarchyNode) => {
        e.preventDefault()
        e.stopPropagation()
        setRenameTarget(node)
    }, [setRenameTarget])

    useEffect(() => {
        const handler = (e: KeyboardEvent): void => {
            if (e.key === 'Escape' && voronoiPath.length > 0) {
                e.preventDefault()
                setTransitioning(true)
                setTimeout(() => {
                    voronoiGoBack()
                    setTransitioning(false)
                }, 350)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [voronoiPath, voronoiGoBack])

    /* ── Render ────────────────────────────────────────────── */

    if (dimensions.width === 0 || dimensions.height === 0) {
        return <div ref={containerRef} className="voronoi-map" />
    }

    /* ═══════════════════════════════════════════════════════
       SOLAR SYSTEM MODE (depth === 0)
       ═══════════════════════════════════════════════════════ */
    if (isSolarSystem) {
        return (
            <div
                ref={containerRef}
                className="voronoi-map voronoi-solar"
            >
                <svg
                    className="voronoi-map__svg"
                    viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        <radialGradient id="space-bg" cx="50%" cy="50%" r="70%">
                            <stop offset="0%" stopColor="#0a0e1a" />
                            <stop offset="50%" stopColor="#060912" />
                            <stop offset="100%" stopColor="#02030a" />
                        </radialGradient>

                        {/* Gezegen yüzey gradientleri */}
                        {planets.map((p, i) => (
                            <React.Fragment key={`planet-defs-${i}`}>
                                <radialGradient id={`planet-surface-${i}`} cx="35%" cy="30%" r="65%">
                                    <stop offset="0%" stopColor={p.colorSet.accent} stopOpacity="0.9" />
                                    <stop offset="50%" stopColor={p.colorSet.base} stopOpacity="0.85" />
                                    <stop offset="100%" stopColor="#0a0e18" stopOpacity="0.7" />
                                </radialGradient>
                                <radialGradient id={`planet-atmo-${i}`} cx="50%" cy="50%" r="50%">
                                    <stop offset="80%" stopColor="transparent" />
                                    <stop offset="92%" stopColor={p.colorSet.glow} />
                                    <stop offset="100%" stopColor="transparent" />
                                </radialGradient>
                                <filter id={`planet-glow-${i}`} x="-60%" y="-60%" width="220%" height="220%">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
                                </filter>
                            </React.Fragment>
                        ))}
                    </defs>

                    {/* Uzay arka planı */}
                    <rect x="0" y="0" width={dimensions.width} height={dimensions.height} fill="url(#space-bg)" />

                    {/* Yıldızlar — pan ile X ve Y ekseninde paralaks */}
                    {stars.map((star, i) => (
                        <circle
                            key={`star-${i}`}
                            cx={star.cx - panX * 0.15 * zoom}
                            cy={star.cy - panY * 0.15 * zoom}
                            r={star.r}
                            fill="#fff"
                            opacity={star.opacity}
                            className="voronoi-star"
                            style={{ animationDelay: `${star.delay}s`, animationDuration: `${star.duration}s` }}
                        />
                    ))}

                    {/* Gezegenler ve Enerji Köprüleri */}
                    <g
                        transform={`translate(${dimensions.width / 2}, ${dimensions.height / 2}) scale(${zoom}) translate(${-dimensions.width / 2 - panX}, ${-dimensions.height / 2 - panY})`}
                        className={`voronoi-solar-group ${transitioning ? 'voronoi-solar-group--entering' : ''}`}
                    >
                        {/* Enerji Köprüleri */}
                        <g className="voronoi-global-links">
                            {globalLinks.map((link, idx) => {
                                const source = planets[link.source]
                                const target = planets[link.target]

                                // Kavisli yol kontrol noktası (Bezı̇er)
                                const mx = (source.cx + target.cx) / 2
                                const my = (source.cy + target.cy) / 2
                                const dist = Math.hypot(target.cx - source.cx, target.cy - source.cy)
                                const cx = mx - (target.cy - source.cy) * 0.2 // Dik açıya doğru kavis
                                const cy = my + (target.cx - source.cx) * 0.2

                                const pathData = `M ${source.cx} ${source.cy} Q ${cx} ${cy} ${target.cx} ${target.cy}`

                                // Kalınlık bağlantı sayısıyla logaritmik artar
                                const strokeWidth = Math.max(1, Math.min(8, Math.log2(link.count + 1) * 1.5))
                                const strokeColor = source.colorSet.accent

                                const isFocus = hoveredIndex === null || hoveredIndex === link.source || hoveredIndex === link.target
                                const opacity = isFocus ? 0.4 : 0.05

                                return (
                                    <g key={`glink-${idx}`} style={{ opacity, transition: 'opacity 0.3s ease' }}>
                                        <path
                                            d={pathData}
                                            fill="none"
                                            stroke={strokeColor}
                                            strokeWidth={strokeWidth}
                                            className="voronoi-energy-bridge"
                                            strokeLinecap="round"
                                        />
                                        <path
                                            d={pathData}
                                            fill="none"
                                            stroke="#fff"
                                            strokeWidth={Math.max(1, strokeWidth * 0.4)}
                                            strokeDasharray="4 24"
                                            className="voronoi-energy-bridge-flow"
                                            style={{ animationDuration: `${Math.max(1.5, 5 - link.count * 0.5)}s` }}
                                        />
                                    </g>
                                )
                            })}
                        </g>

                        {planets.map((p, i) => {
                            const isHovered = hoveredIndex === i
                            const childCount = p.node.children?.length || 0

                            // Zoom out yapıldığında yazıların okunabilir kalması için ters ölçekleme
                            const scaleFactor = Math.max(0.3, zoom)
                            const nameFontSize = Math.max(11, Math.min(16, p.radius * 0.18)) / scaleFactor
                            const countFontSize = 10 / scaleFactor
                            const nameYOffset = 24 / scaleFactor
                            const countYOffset = 40 / scaleFactor

                            return (
                                <g
                                    key={p.node.id}
                                    className="voronoi-planet"
                                    onClick={() => { if (!didDrag) drillIntoPlanet(p.node) }}
                                    onContextMenu={(e) => handleContextMenu(e, p.node)}
                                    onPointerDown={(e) => handleNodePointerDown(e, p.node)}
                                    onPointerEnter={(e) => handleNodePointerEnter(e, p.node)}
                                    onPointerLeave={handleNodePointerLeave}
                                    onMouseEnter={() => setHoveredIndex(i)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    style={{ cursor: isDraggingRef.current ? 'grabbing' : 'pointer', opacity: draggedNode?.id === p.node.id ? 0.4 : 1 }}
                                >
                                    {/* Glow */}
                                    <circle
                                        cx={p.cx} cy={p.cy} r={p.radius + (dropTargetId === p.node.id ? 12 : 6)}
                                        fill={dropTargetId === p.node.id ? '#fff' : p.colorSet.glow}
                                        filter={`url(#planet-glow-${i})`}
                                        className="voronoi-planet__glow"
                                        style={{ transition: 'all 0.2s ease' }}
                                    />

                                    {/* Gezegen yüzeyi */}
                                    <circle
                                        cx={p.cx} cy={p.cy} r={p.radius}
                                        fill={`url(#planet-surface-${i})`}
                                        stroke={isHovered ? p.colorSet.accent : 'rgba(100,160,255,0.12)'}
                                        strokeWidth={isHovered ? 2 : 1}
                                        className="voronoi-planet__surface"
                                    />

                                    {/* Atmosfer */}
                                    <circle
                                        cx={p.cx} cy={p.cy} r={p.radius}
                                        fill={`url(#planet-atmo-${i})`}
                                        pointerEvents="none"
                                    />

                                    {/* İsim */}
                                    <text
                                        x={p.cx} y={p.cy + p.radius + nameYOffset}
                                        textAnchor="middle"
                                        className="voronoi-planet__name"
                                        fontSize={nameFontSize}
                                    >
                                        {p.node.name}
                                    </text>

                                    {/* Alt klasör sayısı */}
                                    {childCount > 0 && (
                                        <text
                                            x={p.cx} y={p.cy + p.radius + countYOffset}
                                            textAnchor="middle"
                                            className="voronoi-planet__count"
                                            fontSize={countFontSize}
                                        >
                                            {childCount} bölge
                                        </text>
                                    )}
                                </g>
                            )
                        })}
                    </g>
                </svg>

                {/* Derinlik etiketi */}
                <div className="voronoi-depth-label">
                    <span className="voronoi-depth-label__icon">☀</span>
                    <span className="voronoi-depth-label__text">Güneş Sistemi</span>
                    <span className="voronoi-depth-label__level">{planets.length} gezegen</span>
                </div>

                {/* İpucu */}
                <div className="voronoi-info">
                    Sürükle veya kaydır · Gezegene tıkla
                </div>

                {/* Drag Ghost Element */}
                {(draggedNode || activeDraggedNode) && (dragPos.x !== 0) && (
                    <div
                        className="voronoi-drag-ghost"
                        style={{
                            position: 'fixed',
                            left: dragPos.x,
                            top: dragPos.y,
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                            background: dropTargetId ? 'rgba(99,255,140,0.3)' : 'rgba(80,140,255,0.25)',
                            backdropFilter: 'blur(8px)',
                            border: `1px solid ${dropTargetId ? 'rgba(99,255,140,0.8)' : 'rgba(80,140,255,0.7)'}`,
                            padding: '8px 18px',
                            borderRadius: '30px',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 600,
                            boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${dropTargetId ? 'rgba(99,255,140,0.4)' : 'rgba(80,140,255,0.4)'}`,
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {/* Glowing cursor ring indicator */}
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: dropTargetId ? '#63ff8c' : '#508cff',
                            boxShadow: `0 0 10px ${dropTargetId ? '#63ff8c' : '#508cff'}`,
                            animation: 'pulse 1s infinite alternate'
                        }} />
                        {dropTargetId ? '↳ Drop here' : (activeDraggedNode ? 'Hold to move' : '↑ Quick Stash')} | {(draggedNode || activeDraggedNode)?.name}
                    </div>
                )}
            </div>
        )
    }

    /* ═══════════════════════════════════════════════════════
       PLANET VIEW MODE (depth > 0)
       ═══════════════════════════════════════════════════════ */

    const { cx, cy, radius } = planetGeometry
    const hasChildren = currentNode && currentNode.children && currentNode.children.length > 0
    const depthLabel = getDepthLabel(depth)
    const hoverPalette = getDepthHover(depth)

    return (
        <div ref={containerRef} className="voronoi-map">
            <svg
                className="voronoi-map__svg"
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <clipPath id="planet-clip">
                        <circle cx={cx} cy={cy} r={radius} />
                    </clipPath>
                    <filter id="planet-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="glow" />
                        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="inner-shadow" x="-10%" y="-10%" width="120%" height="120%">
                        <feComponentTransfer in="SourceAlpha"><feFuncA type="table" tableValues="1 0" /></feComponentTransfer>
                        <feGaussianBlur stdDeviation="20" />
                        <feOffset dx="0" dy="4" result="offsetblur" />
                        <feFlood floodColor="#000" floodOpacity="0.5" result="color" />
                        <feComposite in2="offsetblur" operator="in" />
                        <feComposite in2="SourceAlpha" operator="in" />
                        <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode /></feMerge>
                    </filter>
                    <radialGradient id="atmosphere" cx="50%" cy="50%" r="50%">
                        <stop offset="85%" stopColor="transparent" />
                        <stop offset="92%" stopColor="rgba(80,140,255,0.08)" />
                        <stop offset="96%" stopColor="rgba(80,140,255,0.15)" />
                        <stop offset="100%" stopColor="rgba(60,120,255,0.05)" />
                    </radialGradient>
                    <radialGradient id="space-bg-planet" cx="50%" cy="50%" r="70%">
                        <stop offset="0%" stopColor="#0a0e1a" />
                        <stop offset="50%" stopColor="#060912" />
                        <stop offset="100%" stopColor="#02030a" />
                    </radialGradient>
                    {cells.map((cell, i) => (
                        <radialGradient key={`grad-${i}`} id={`cell-grad-${i}`} cx="40%" cy="35%" r="70%">
                            <stop offset="0%" stopColor={cell.color} stopOpacity="0.95" />
                            <stop offset="70%" stopColor={cell.color} stopOpacity="0.7" />
                            <stop offset="100%" stopColor={cell.color} stopOpacity="0.5" />
                        </radialGradient>
                    ))}
                </defs>

                <rect x="0" y="0" width={dimensions.width} height={dimensions.height} fill="url(#space-bg-planet)" />

                {stars.slice(0, 200).map((star, i) => (
                    <circle key={`star-${i}`} cx={star.cx * 0.5} cy={star.cy} r={star.r} fill="#fff"
                        opacity={star.opacity} className="voronoi-star"
                        style={{ animationDelay: `${star.delay}s`, animationDuration: `${star.duration}s` }}
                    />
                ))}

                <circle cx={cx} cy={cy} r={radius + 8} fill="none" stroke="rgba(80,140,255,0.12)"
                    strokeWidth="16" filter="url(#planet-glow)" className="voronoi-planet-glow" />

                {hasChildren ? (
                    <g clipPath="url(#planet-clip)" filter="url(#inner-shadow)">
                        <circle cx={cx} cy={cy} r={radius} fill="#0c1220" />
                        <g className={`voronoi-transition-group ${transitioning ? 'voronoi-transition-group--entering' : 'voronoi-transition-group--active'}`}>
                            {cells.map((cell, i) => {
                                const isLeaf = !cell.node.children || cell.node.children.length === 0
                                const isHovered = hoveredIndex === i
                                const labelSize = computeLabelSize(cell.area, totalArea, radius)
                                const childCount = cell.node.children?.length || 0
                                const subLabel = isLeaf
                                    ? (cell.node.preview ? cell.node.preview.slice(0, 25) : '')
                                    : `${childCount} alt bölge`
                                return (
                                    <g key={cell.node.id}
                                        className={`voronoi-cell ${isLeaf ? 'voronoi-cell--leaf' : ''}`}
                                        onMouseEnter={() => setHoveredIndex(i)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                        onClick={() => drillDown(cell)}
                                        onContextMenu={(e) => handleContextMenu(e, cell.node)}
                                        onPointerDown={(e) => handleNodePointerDown(e, cell.node)}
                                        onPointerEnter={(e) => handleNodePointerEnter(e, cell.node)}
                                        onPointerLeave={handleNodePointerLeave}
                                        style={{ opacity: draggedNode?.id === cell.node.id ? 0.3 : 1 }}
                                    >
                                        <path className="voronoi-cell__path" d={polygonToPath(cell.polygon)}
                                            stroke={dropTargetId === cell.node.id ? '#fff' : 'none'}
                                            strokeWidth={dropTargetId === cell.node.id ? 4 : 0}
                                            fill={isHovered || dropTargetId === cell.node.id ? hoverPalette[hashStr(cell.node.name) % hoverPalette.length] : `url(#cell-grad-${i})`}
                                            style={{ transition: 'all 0.2s ease' }}
                                        />
                                        <text className="voronoi-cell__label" x={cell.centroid[0]}
                                            y={cell.centroid[1] - (subLabel ? labelSize * 0.3 : 0)} fontSize={labelSize}>
                                            {cell.node.name}
                                        </text>
                                        {subLabel && labelSize > 10 && (
                                            <text className="voronoi-cell__label voronoi-cell__label--sub"
                                                x={cell.centroid[0]} y={cell.centroid[1] + labelSize * 0.6}
                                                fontSize={Math.max(7, labelSize * 0.45)}>
                                                {subLabel}
                                            </text>
                                        )}
                                    </g>
                                )
                            })}

                            {/* Neon Trade Routes (Local Links) */}
                            {localLinks.map((link, idx) => {
                                const isSourceHovered = hoveredIndex === link.source.index
                                const isTargetHovered = !link.target.isForeign && hoveredIndex === link.target.index
                                const isFocus = hoveredIndex === null || isSourceHovered || isTargetHovered

                                // Saydamlık: Oku veya hedefi odaklanmışsa çok parlak, yoksa normal veya çok sönük
                                let opacity = 0.15
                                if (hoveredIndex === null) opacity = 0.35 // Standart
                                else if (isFocus) opacity = 0.9 // Parlak vurgu

                                // Kıvrımlı çizgi (Bezier)
                                const mx = (link.source.x + link.target.x) / 2
                                const my = (link.source.y + link.target.y) / 2
                                const dist = Math.hypot(link.target.x - link.source.x, link.target.y - link.source.y)
                                const cx = mx - (link.target.y - link.source.y) * 0.15
                                const cy = my + (link.target.x - link.source.x) * 0.15

                                const pathData = link.target.isForeign
                                    ? `M ${link.source.x} ${link.source.y} L ${link.target.x} ${link.target.y}`
                                    : `M ${link.source.x} ${link.source.y} Q ${cx} ${cy} ${link.target.x} ${link.target.y}`

                                const strokeColor = link.target.isForeign ? "#ff4081" : "#40c4ff"

                                return (
                                    <g key={`local-link-${idx}`} style={{ opacity, transition: 'opacity 0.3s ease' }} className="voronoi-local-link">
                                        {/* Tıklanabilir Görünmez Tampon Sınır (Kullanıcı isabet etsin diye kalınlaştırdık) */}
                                        <path
                                            d={pathData}
                                            fill="none"
                                            stroke="transparent"
                                            strokeWidth="15"
                                            strokeLinecap="round"
                                            style={{ cursor: link.target.isForeign ? 'pointer' : 'default', pointerEvents: 'auto' }}
                                            onClick={() => {
                                                if (link.target.isForeign) handleLinkJump(link.target.id)
                                            }}
                                            onMouseEnter={() => setHoveredIndex(link.source.index)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                        />

                                        {/* Görünür Çizgi */}
                                        <path
                                            d={pathData}
                                            fill="none"
                                            stroke={strokeColor}
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            className={`voronoi-trade-route ${link.target.isForeign ? 'voronoi-trade-route--jump' : ''}`}
                                        />

                                        {/* Akan Işık Animasyonu */}
                                        <path
                                            d={pathData}
                                            fill="none"
                                            stroke="#fff"
                                            strokeWidth="1.5"
                                            strokeDasharray="4 14"
                                            className="voronoi-trade-route-flow"
                                        />
                                    </g>
                                )
                            })}
                        </g>
                    </g>
                ) : (
                    <g clipPath="url(#planet-clip)">
                        <circle cx={cx} cy={cy} r={radius} fill="#0c1220" />
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                            fill="rgba(180,195,230,0.4)" fontSize="14" fontFamily="'Outfit', sans-serif">
                            Bu bölgede alt klasör bulunmuyor
                        </text>
                    </g>
                )}

                <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(100,160,255,0.15)" strokeWidth="1.5" pointerEvents="none" />
            </svg>

            {/* Drag Ghost Element */}
            {(draggedNode || activeDraggedNode) && (dragPos.x !== 0) && (
                <div
                    className="voronoi-drag-ghost"
                    style={{
                        position: 'fixed',
                        left: dragPos.x,
                        top: dragPos.y,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                        background: dropTargetId ? 'rgba(99,255,140,0.3)' : 'rgba(80,140,255,0.25)',
                        backdropFilter: 'blur(8px)',
                        border: `1px solid ${dropTargetId ? 'rgba(99,255,140,0.8)' : 'rgba(80,140,255,0.7)'}`,
                        padding: '8px 18px',
                        borderRadius: '30px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 600,
                        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${dropTargetId ? 'rgba(99,255,140,0.4)' : 'rgba(80,140,255,0.4)'}`,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    {/* Glowing cursor ring indicator */}
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: dropTargetId ? '#63ff8c' : '#508cff',
                        boxShadow: `0 0 10px ${dropTargetId ? '#63ff8c' : '#508cff'}`,
                        animation: 'voronoi-pulse 1s infinite alternate'
                    }} />
                    {dropTargetId ? '↳ Drop here' : (activeDraggedNode ? 'Hold to move' : '↑ Quick Stash')} | {(draggedNode || activeDraggedNode)?.name}
                </div>
            )}

            <div className="voronoi-depth-label">
                <span className="voronoi-depth-label__icon">◉</span>
                <span className="voronoi-depth-label__text">{depthLabel}</span>
                <span className="voronoi-depth-label__level">Seviye {depth}</span>
            </div>

            <div className="voronoi-info">
                {cells.length} bölge · {depthLabel}
            </div>
        </div>
    )
}
