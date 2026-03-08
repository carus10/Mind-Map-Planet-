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
import { getAppearance, DEFAULT_APPEARANCE_KEY } from '../utils/planetAppearances'
import { translations } from '../i18n/translations'
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

const DEPTH_LABELS = ['Solar System', 'Continents', 'Regions', 'Cities', 'Structures', 'Rooms']

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
    const [hoveredLinkIdx, setHoveredLinkIdx] = useState<number | null>(null)
    const [hoveredGlobalLinkIdx, setHoveredGlobalLinkIdx] = useState<number | null>(null)
    const [linkHoverPos, setLinkHoverPos] = useState<{ x: number, y: number } | null>(null)

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
    const setContextMenuTarget = useMapStore((s) => s.setContextMenuTarget)
    const setError = useMapStore((s) => s.setError)
    const setSuccessMessage = useMapStore((s) => s.setSuccessMessage)
    const setHierarchy = useMapStore((s) => s.setHierarchy)
    const stashNode = useMapStore((s) => s.stashNode)
    const unstashNode = useMapStore((s) => s.unstashNode)
    const activeDraggedNode = useMapStore((s) => s.activeDraggedNode)
    const setActiveDraggedNode = useMapStore((s) => s.setActiveDraggedNode)
    const planetAppearances = useMapStore((s) => s.planetAppearances)
    const customPlanetImages = useMapStore((s) => s.customPlanetImages)
    const planetSizes = useMapStore((s) => s.planetSizes)
    const ensurePlanetAppearance = useMapStore((s) => s.ensurePlanetAppearance)

    const depth = voronoiPath.length
    const isSolarSystem = depth === 0
    const isSolarRef = useRef(isSolarSystem)
    isSolarRef.current = isSolarSystem
    const hierarchyRef = useRef(hierarchy)
    hierarchyRef.current = hierarchy
    const activeDraggedRef = useRef(activeDraggedNode)
    activeDraggedRef.current = activeDraggedNode
    const voronoiPathRef = useRef(voronoiPath)
    voronoiPathRef.current = voronoiPath

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

        // rootCountry: bu node'un ait olduğu üst düzey gezegen
        // parentCountry null ise bu node'un kendisi bir köktür → parentMap'e ekleme
        const traverse = (node: HierarchyNode, rootCountry: HierarchyNode | null) => {
            nm.set(node.name, node)
            if (node.id) nm.set(node.id, node)
            // Kök ülkeler kendi kendilerinin parent'ı OLMAMALI
            if (rootCountry && rootCountry.id !== node.id) {
                pm.set(node.id, rootCountry)
            }
            if (node.children) {
                node.children.forEach(c => traverse(c, rootCountry || node))
            }
        }

        // Kök ülkeler için null geçiyoruz ki kendi kendilerini pm'ye eklemesinler
        hierarchy.countries.forEach(c => traverse(c, null))
        return { nodeMap: nm, parentMap: pm }
    }, [hierarchy])

    /* ── Ters Bağlantı Haritası (Gelen linkler için) ─────────── */
    // resolvedId → [bu linki içeren node'lar] haritası
    const reverseNodeMap = useMemo(() => {
        const rm = new Map<string, HierarchyNode[]>()
        const traverse = (node: HierarchyNode) => {
            if (node.type === 'home' && node.links) {
                node.links.forEach(l => {
                    const lObj = l as any
                    if (!lObj.isBroken && lObj.resolvedId) {
                        const existing = rm.get(lObj.resolvedId) ?? []
                        rm.set(lObj.resolvedId, [...existing, node])
                    }
                })
            }
            node.children?.forEach(traverse)
        }
        hierarchy.countries.forEach(traverse)
        return rm
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
        // baseRadius: her zaman appearance sizeRatio ile çarpılacak
        // Earth (sizeRatio=1.0) için baz boyut
        const baseRadius = Math.min(width, height) * 0.09
        const spreadFactor = baseRadius * 6.5

        return countries.map((node, i) => {
            // Varsayılan earth görünümünü ata (yeni gezegen ise)
            ensurePlanetAppearance(node.id)

            const appearanceKey = planetAppearances[node.id] ?? DEFAULT_APPEARANCE_KEY
            const appearance = getAppearance(appearanceKey)

            // Boyut: appearance.sizeRatio × baseRadius
            // Ek küçük ayar: çok az çocuğu olan gezegenler biraz küçülür
            const childCount = node.children?.length || 0
            const contentBonus = 0.85 + 0.3 * Math.min(childCount / 20, 1)
            const customSizeMultiplier = planetSizes[node.id] ?? 1.0
            const radius = baseRadius * appearance.sizeRatio * contentBonus * customSizeMultiplier

            const angle = i * 2.39996 // Altın açı (137.5 derece)
            const distance = i === 0 ? 0 : Math.sqrt(i) * spreadFactor
            const randDist = (hashStr(node.name) % 100) / 100 * distance * 0.2
            const finalDist = distance + randDist

            const cx = width / 2 + Math.cos(angle) * finalDist
            const cy = height / 2 + Math.sin(angle) * finalDist

            // colorSet fallback (enerji köprüleri için still gerekli)
            const colorSet = PLANET_COLORS[hashStr(node.name) % PLANET_COLORS.length]

            return { node, cx, cy, radius, colorSet, appearance, appearanceKey }
        })
    }, [isSolarSystem, hierarchy.countries, dimensions, planetAppearances, planetSizes, ensurePlanetAppearance])

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
                        if (node.type === 'home' && node.links) {
                            node.links.forEach(l => {
                                const lObj = l as any
                                if (!lObj.isBroken && lObj.resolvedId) {
                                    const isTargetPlanetB = lObj.resolvedId === planetB.id || parentMap.get(lObj.resolvedId)?.id === planetB.id
                                    if (isTargetPlanetB) {
                                        c++
                                    }
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
    }, [isSolarSystem, planets, parentMap])

    /* ── Solar System: Native DOM Event Listeners ─────────── */

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const onPointerDown = (e: PointerEvent): void => {
            if (!isSolarRef.current) return
            isDraggingRef.current = true
            setDidDrag(false)
            dragStartRef.current = { x: e.clientX, y: e.clientY, panX: panXRef.current, panY: panYRef.current }
            el.style.cursor = 'grabbing'
        }

        const onPointerMove = (e: PointerEvent): void => {
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

        const onPointerUp = (): void => {
            if (dragTimerRef.current) {
                clearTimeout(dragTimerRef.current)
                dragTimerRef.current = null
            }

            if (draggedNodeRef.current || activeDraggedRef.current) {
                const src = draggedNodeRef.current || activeDraggedRef.current
                let dst = dropTargetRef.current

                // If dropping active cargo item into empty space inside a planet, default to that planet's folder
                if (!dst && !isSolarRef.current && activeDraggedRef.current) {
                    const p = voronoiPathRef.current
                    if (p.length > 0) dst = p[p.length - 1]
                }

                if (src && dst && src.id !== dst.id) {
                    const t = translations[useMapStore.getState().language]

                    if (dst.type === 'home') {
                        setError(t.cannotDropIntoNote)
                        draggedNodeRef.current = null
                        dropTargetRef.current = null
                        setDraggedNode(null)
                        setDropTargetId(null)
                        setActiveDraggedNode(null)
                        isDraggingRef.current = false
                        if (isSolarRef.current && el) el.style.cursor = 'grab'
                        return
                    }

                    if (src.type === 'home' && dst.type === 'country') {
                        setError(t.cannotDropNoteToPlanet)
                        draggedNodeRef.current = null
                        dropTargetRef.current = null
                        setDraggedNode(null)
                        setDropTargetId(null)
                        setActiveDraggedNode(null)
                        isDraggingRef.current = false
                        if (isSolarRef.current && el) el.style.cursor = 'grab'
                        return
                    }

                    const wasFromCargo = !!activeDraggedRef.current
                    // Yöntem 2 için (Kargo'dan çıkarılan dosyanın hedefe taşınması)
                    window.api.moveNode(src.absolutePath, dst.absolutePath).then(res => {
                        if (res && res.success) {
                            if (wasFromCargo) {
                                unstashNode(src.id)
                                useMapStore.getState().clearStash() // Otomatik kargoyu kapat
                            }
                            useMapStore.getState().setSuccessMessage(`📦 ${src.name} → ${dst.name} ${t.toastMoved}`)
                            window.api.scanVault(hierarchyRef.current.vaultPath).then(updated => {
                                if (updated) setHierarchy(updated as never)
                            })
                        } else {
                            setError(res ? res.error || "Failed to move node" : "Failed to move node")
                        }
                    })
                } else if (!dst) {
                    if (isSolarRef.current && activeDraggedRef.current) {
                        // Kargo'dan çıkarılan dosyanın ana ekrana (boşluğa) bırakılması -> Gezegene dönüşür
                        window.api.moveNode(src!.absolutePath, hierarchyRef.current.vaultPath).then(res => {
                            if (res && res.success) {
                                unstashNode(src!.id)
                                useMapStore.getState().clearStash() // Otomatik kargoyu kapat
                                useMapStore.getState().setSuccessMessage(`🌟 ${translations[useMapStore.getState().language].toastConvertedToPlanet} ${src!.name}`)
                                window.api.scanVault(hierarchyRef.current.vaultPath).then(updated => {
                                    if (updated) setHierarchy(updated as never)
                                })
                            } else {
                                setError(res ? res.error || "Failed to convert to planet" : "Failed to convert to planet")
                            }
                        })
                    } else if (draggedNodeRef.current) {
                        // Sadece harita içinden kaldırılanlar kargoya konur, kargodan alınanlar tekrar konmaz
                        stashNode(src as HierarchyNode)
                        useMapStore.getState().setSuccessMessage(`📦 ${translations[useMapStore.getState().language].toastStashed} ${src!.name}`)
                    }
                }

                draggedNodeRef.current = null
                dropTargetRef.current = null
                setDraggedNode(null)
                setDropTargetId(null)
                setActiveDraggedNode(null)

                isDraggingRef.current = false // FIX: Prevent screen freeze

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

        el.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)
        el.addEventListener('wheel', onWheel, { passive: false })

        return () => {
            el.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('pointermove', onPointerMove)
            window.removeEventListener('pointerup', onPointerUp)
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
            target: { x: number, y: number, id: string, isForeign: boolean, index: number, isBroken?: boolean },
            details: { sourceName: string, targetName: string, sourcePlanetName?: string, targetPlanetName?: string, isBroken?: boolean }[]
        }[] = []

        const cellMap = new Map<string, { x: number, y: number, index: number, id: string }>()

        const registerDescendants = (node: HierarchyNode, centroid: { x: number, y: number, index: number, id: string }) => {
            cellMap.set(node.name, centroid)
            if (node.id) cellMap.set(node.id, centroid)
            node.children?.forEach(child => registerDescendants(child, centroid))
        }

        cells.forEach((c, i) => {
            const info = { x: c.centroid[0], y: c.centroid[1], index: i, id: c.node.id }
            registerDescendants(c.node, info)
        })

        const addedForeignKeys = new Set<string>()

        const addForeignLink = (
            cellIdx: number,
            cellCentroid: [number, number],
            foreignNodeId: string,
        ) => {
            const foreignRoot = parentMap.get(foreignNodeId)
            const key = `${cellIdx}:${foreignRoot?.id ?? foreignNodeId}`
            if (addedForeignKeys.has(key)) return
            addedForeignKeys.add(key)

            const dx = cellCentroid[0] - planetGeometry.cx
            const dy = cellCentroid[1] - planetGeometry.cy
            const dist = Math.hypot(dx, dy) || 1
            const spreadOut = planetGeometry.radius * 0.95
            const edgeX = planetGeometry.cx + (dx / dist) * spreadOut
            const edgeY = planetGeometry.cy + (dy / dist) * spreadOut

            links.push({
                source: { x: cellCentroid[0], y: cellCentroid[1], id: foreignNodeId, index: cellIdx },
                target: { x: edgeX, y: edgeY, id: foreignNodeId, isForeign: true, index: -1 },
                details: []
            })
        }

        // ── Pass 1: GİDEN (outgoing) bağlantılar ────────────────────────
        cells.forEach((cell, i) => {
            const gatherLinks = (node: HierarchyNode) => {
                if (node.type === 'home' && node.links) {
                    node.links.forEach((_l) => {
                        const l = _l as any // Cast for convenience
                        if (l.isBroken) {
                            // Add a stub line
                            links.push({
                                source: { x: cell.centroid[0], y: cell.centroid[1], id: cell.node.id, index: i },
                                target: { x: cell.centroid[0] + 20, y: cell.centroid[1] - 20, id: 'broken', isForeign: false, index: -1, isBroken: true },
                                details: [{ sourceName: node.name, targetName: l.raw, isBroken: true }]
                            })
                            return
                        }

                        const targetNode = l.resolvedId ? nodeMap.get(l.resolvedId) : undefined
                        if (!targetNode) return

                        // Aynı gezegende mi?
                        if (cellMap.has(targetNode.name) || cellMap.has(targetNode.id)) {
                            const targetInfo = cellMap.get(targetNode.name) ?? cellMap.get(targetNode.id)!
                            if (targetInfo.index === i) return // self-loop engelle

                            const existingLink = links.find(ln => ln.source.index === i && ln.target.index === targetInfo.index && !ln.target.isBroken)
                            if (existingLink) {
                                existingLink.details.push({ sourceName: node.name, targetName: targetNode.name })
                            } else {
                                links.push({
                                    source: { x: cell.centroid[0], y: cell.centroid[1], id: cell.node.id, index: i },
                                    target: { x: targetInfo.x, y: targetInfo.y, id: targetInfo.id || targetNode.id, isForeign: false, index: targetInfo.index },
                                    details: [{ sourceName: node.name, targetName: targetNode.name }]
                                })
                            }
                        } else if (parentMap.has(targetNode.id)) {
                            // Yabancı gezegen → kenar noktasına çizgi (giden)
                            const foreignRootId = parentMap.get(targetNode.id)?.id || targetNode.id
                            const key = `${i}:${foreignRootId}`

                            let existingLink = links.find(ln => ln.source.index === i && ln.target.isForeign && addedForeignKeys.has(key) && !ln.target.isBroken)
                            if (!existingLink) {
                                addForeignLink(i, cell.centroid, targetNode.id)
                                existingLink = links[links.length - 1]
                            }
                            existingLink.details.push({ sourceName: node.name, targetName: targetNode.name, targetPlanetName: parentMap.get(targetNode.id)?.name || 'Unknown Planet' })
                        }
                    })
                }
                node.children?.forEach(gatherLinks)
            }
            gatherLinks(cell.node)
        })

        // ── Pass 2: GELEN (incoming) yabancı bağlantılar ──────────────
        cells.forEach((cell, i) => {
            const gatherIncoming = (node: HierarchyNode) => {
                if (node.type !== 'home') {
                    node.children?.forEach(gatherIncoming)
                    return
                }

                if (node.id) {
                    const sourcers = reverseNodeMap.get(node.id) ?? []
                    sourcers.forEach(sourceNode => {
                        // Kaynak aynı gezegende mi?
                        if (cellMap.has(sourceNode.id)) return
                        if (!parentMap.has(sourceNode.id)) return

                        const foreignRootId = parentMap.get(sourceNode.id)?.id || sourceNode.id
                        const linkKey = `${i}:${foreignRootId}`

                        let existingLink = links.find(ln => ln.source.index === i && ln.target.isForeign && addedForeignKeys.has(linkKey) && !ln.target.isBroken)
                        if (!existingLink) {
                            addForeignLink(i, cell.centroid, sourceNode.id)
                            existingLink = links[links.length - 1]
                        }

                        // Prevent duplicates
                        const isDuplicate = existingLink.details.some((d: any) => d.sourceName === sourceNode.name && d.targetName === node.name)
                        if (!isDuplicate) {
                            existingLink.details.push({ sourceName: sourceNode.name, targetName: node.name, sourcePlanetName: parentMap.get(sourceNode.id)?.name || 'Unknown Planet' })
                        }
                    })
                }
                node.children?.forEach(gatherIncoming)
            }
            gatherIncoming(cell.node)
        })

        return links
    }, [isSolarSystem, cells, nodeMap, parentMap, reverseNodeMap, planetGeometry])

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
            useMapStore.getState().setActionNoteTarget(cell.node)
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

    const handleContextMenu = useCallback((e: React.MouseEvent, node: HierarchyNode, isPlanet = false) => {
        e.preventDefault()
        e.stopPropagation()
        setContextMenuTarget({ node, x: e.clientX, y: e.clientY, isPlanet })
    }, [setContextMenuTarget])

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

                        {/* Gezegen appearance'a göre dinamik gradyanlar */}
                        {planets.map((p, i) => {
                            const app = p.appearance
                            return (
                                <React.Fragment key={`planet-defs-${i}`}>
                                    <radialGradient id={`planet-surface-${i}`} cx="35%" cy="30%" r="65%">
                                        <stop offset="0%" stopColor={app.colorCenter} stopOpacity="1" />
                                        <stop offset="55%" stopColor={app.colorCenter} stopOpacity="0.9" />
                                        <stop offset="100%" stopColor={app.colorEdge} stopOpacity="1" />
                                    </radialGradient>
                                    <radialGradient id={`planet-atmo-${i}`} cx="50%" cy="50%" r="50%">
                                        <stop offset="78%" stopColor="transparent" />
                                        <stop offset="90%" stopColor={app.glowColor} />
                                        <stop offset="100%" stopColor="transparent" />
                                    </radialGradient>
                                    <filter id={`planet-glow-${i}`} x="-70%" y="-70%" width="240%" height="240%">
                                        <feGaussianBlur in="SourceGraphic" stdDeviation={Math.max(6, p.radius * 0.2)} />
                                    </filter>
                                    <clipPath id={`planet-clip-${i}`}>
                                        <circle cx={p.cx} cy={p.cy} r={p.radius} />
                                    </clipPath>
                                </React.Fragment>
                            )
                        })}
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
                                let opacity = isFocus ? 0.4 : 0.05

                                if (hoveredGlobalLinkIdx !== null) {
                                    opacity = hoveredGlobalLinkIdx === idx ? 0.8 : 0.05
                                }

                                return (
                                    <g key={`glink-${idx}`} style={{ opacity, transition: 'opacity 0.3s ease' }}>
                                        {/* Tıklanabilir Görünmez Tampon */}
                                        <path
                                            d={pathData}
                                            fill="none"
                                            stroke="transparent"
                                            strokeWidth="20"
                                            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                                            onMouseEnter={(e) => {
                                                setHoveredGlobalLinkIdx(idx)
                                                setLinkHoverPos({ x: e.clientX, y: e.clientY })
                                            }}
                                            onMouseLeave={() => {
                                                setHoveredGlobalLinkIdx(null)
                                                setLinkHoverPos(null)
                                            }}
                                            onPointerMove={(e) => setLinkHoverPos({ x: e.clientX, y: e.clientY })}
                                        />
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
                            const app = p.appearance

                            // Zoom out yapıldığında yazıların okunabilir kalması için ters ölçekleme
                            const scaleFactor = Math.max(0.3, zoom)
                            const nameFontSize = Math.max(9, Math.min(15, p.radius * 0.22)) / scaleFactor
                            const countFontSize = 9 / scaleFactor
                            const nameYOffset = Math.max(16, p.radius * 0.3) / scaleFactor
                            const countYOffset = nameYOffset + 14 / scaleFactor

                            // Özel görsel var mı?
                            const customImg = p.appearanceKey === 'custom' ? customPlanetImages[p.node.id] : null

                            return (
                                <g
                                    key={p.node.id}
                                    className="voronoi-planet"
                                    style={{ opacity: draggedNode?.id === p.node.id ? 0.4 : 1 }}
                                >
                                    <title>{p.node.name} ({app.name})</title>

                                    {/* Satürn halkası — gezegen arkasında */}
                                    {app.hasRing && app.key === 'saturn' && (
                                        <ellipse
                                            cx={p.cx} cy={p.cy + p.radius * 0.08}
                                            rx={p.radius * 1.75} ry={p.radius * 0.38}
                                            fill="none"
                                            stroke={app.ringColor ?? 'rgba(210,180,100,0.5)'}
                                            strokeWidth={p.radius * 0.3}
                                            opacity={0.55}
                                            pointerEvents="none"
                                        />
                                    )}

                                    {/* Glow */}
                                    <circle
                                        cx={p.cx} cy={p.cy}
                                        r={p.radius + (dropTargetId === p.node.id ? 14 : isHovered ? 10 : 5)}
                                        fill={dropTargetId === p.node.id ? 'rgba(255,255,255,0.15)' : app.glowColor}
                                        filter={`url(#planet-glow-${i})`}
                                        className="voronoi-planet__glow"
                                        style={{ transition: 'all 0.25s ease' }}
                                        pointerEvents="none"
                                    />

                                    {/* Özel görsel (custom image) */}
                                    {customImg ? (
                                        <>
                                            <circle cx={p.cx} cy={p.cy} r={p.radius} fill={app.colorEdge} />
                                            <image
                                                href={customImg}
                                                x={p.cx - p.radius} y={p.cy - p.radius}
                                                width={p.radius * 2} height={p.radius * 2}
                                                clipPath={`url(#planet-clip-${i})`}
                                                preserveAspectRatio="xMidYMid slice"
                                            />
                                        </>
                                    ) : (
                                        <>
                                            {/* Gezegen yüzeyi — temel gradient */}
                                            <circle
                                                cx={p.cx} cy={p.cy} r={p.radius}
                                                fill={`url(#planet-surface-${i})`}
                                                className="voronoi-planet__surface"
                                            />

                                            {/* Bantlar (Jüpiter, Satürn, Neptün) */}
                                            {app.bands && (
                                                <g clipPath={`url(#planet-clip-${i})`} pointerEvents="none">
                                                    {app.bands.map((band, bi) => {
                                                        const bandH = (p.radius * 2) / app.bands!.length
                                                        const yy = p.cy - p.radius + bi * bandH
                                                        return (
                                                            <rect key={bi}
                                                                x={p.cx - p.radius} y={yy}
                                                                width={p.radius * 2} height={bandH}
                                                                fill={band}
                                                                opacity={0.32 + (bi % 2) * 0.14}
                                                            />
                                                        )
                                                    })}
                                                </g>
                                            )}

                                            {/* Dünya kıtaları */}
                                            {app.key === 'earth' && (
                                                <g clipPath={`url(#planet-clip-${i})`} opacity={0.65} pointerEvents="none">
                                                    <ellipse cx={p.cx - p.radius * 0.15} cy={p.cy - p.radius * 0.05}
                                                        rx={p.radius * 0.25} ry={p.radius * 0.35} fill={app.featureColor ?? '#2d8a4a'} />
                                                    <ellipse cx={p.cx + p.radius * 0.22} cy={p.cy + p.radius * 0.18}
                                                        rx={p.radius * 0.32} ry={p.radius * 0.22} fill={app.featureColor ?? '#2d8a4a'} />
                                                    <ellipse cx={p.cx - p.radius * 0.28} cy={p.cy + p.radius * 0.35}
                                                        rx={p.radius * 0.18} ry={p.radius * 0.13} fill={app.featureColor ?? '#2d8a4a'} />
                                                    <ellipse cx={p.cx + p.radius * 0.05} cy={p.cy - p.radius * 0.42}
                                                        rx={p.radius * 0.12} ry={p.radius * 0.08} fill={app.featureColor ?? '#2d8a4a'} />
                                                </g>
                                            )}

                                            {/* Mars leke ve patch */}
                                            {app.key === 'mars' && (
                                                <g clipPath={`url(#planet-clip-${i})`} opacity={0.5} pointerEvents="none">
                                                    <ellipse cx={p.cx + p.radius * 0.1} cy={p.cy - p.radius * 0.18}
                                                        rx={p.radius * 0.28} ry={p.radius * 0.2} fill={app.featureColor ?? '#8b3612'} />
                                                    <ellipse cx={p.cx - p.radius * 0.3} cy={p.cy + p.radius * 0.22}
                                                        rx={p.radius * 0.2} ry={p.radius * 0.15} fill={app.featureColor ?? '#8b3612'} />
                                                    <ellipse cx={p.cx + p.radius * 0.35} cy={p.cy + p.radius * 0.1}
                                                        rx={p.radius * 0.12} ry={p.radius * 0.1} fill={app.featureColor ?? '#8b3612'} />
                                                </g>
                                            )}

                                            {/* Kraterlery (Ay, Merkür, Plüton) */}
                                            {app.hasCraters && (
                                                <g clipPath={`url(#planet-clip-${i})`} opacity={0.5} pointerEvents="none">
                                                    {[
                                                        [p.cx - p.radius * 0.3, p.cy - p.radius * 0.2, p.radius * 0.14],
                                                        [p.cx + p.radius * 0.22, p.cy + p.radius * 0.3, p.radius * 0.1],
                                                        [p.cx + p.radius * 0.38, p.cy - p.radius * 0.1, p.radius * 0.08],
                                                        [p.cx - p.radius * 0.12, p.cy + p.radius * 0.12, p.radius * 0.09],
                                                        [p.cx + p.radius * 0.05, p.cy - p.radius * 0.38, p.radius * 0.07],
                                                        [p.cx - p.radius * 0.4, p.cy + p.radius * 0.3, p.radius * 0.06],
                                                    ].map(([px, py, pr], ci) => (
                                                        <circle key={ci}
                                                            cx={px} cy={py} r={pr}
                                                            fill="none"
                                                            stroke={app.colorEdge}
                                                            strokeWidth={Math.max(1, pr * 0.4)}
                                                        />
                                                    ))}
                                                </g>
                                            )}

                                            {/* Kutup buzu (Dünya, Mars, Plüton) */}
                                            {app.hasPolarCap && app.polarCapColor && (
                                                <g clipPath={`url(#planet-clip-${i})`} pointerEvents="none">
                                                    <ellipse
                                                        cx={p.cx} cy={p.cy - p.radius * 0.82}
                                                        rx={p.radius * 0.42} ry={p.radius * 0.2}
                                                        fill={app.polarCapColor}
                                                    />
                                                </g>
                                            )}
                                        </>
                                    )}

                                    {/* Uranüs halkası */}
                                    {app.hasRing && app.key === 'uranus' && (
                                        <ellipse
                                            cx={p.cx} cy={p.cy}
                                            rx={p.radius * 1.55} ry={p.radius * 0.28}
                                            fill="none"
                                            stroke={app.ringColor ?? 'rgba(140,230,240,0.3)'}
                                            strokeWidth={p.radius * 0.2}
                                            opacity={0.5}
                                            pointerEvents="none"
                                        />
                                    )}

                                    {/* Atmosfer overlay */}
                                    <circle
                                        cx={p.cx} cy={p.cy} r={p.radius}
                                        fill={`url(#planet-atmo-${i})`}
                                        pointerEvents="none"
                                    />

                                    {/* Aydınlatma highlight (sol üst) */}
                                    <circle
                                        cx={p.cx - p.radius * 0.28} cy={p.cy - p.radius * 0.28}
                                        r={p.radius * 0.22}
                                        fill="rgba(255,255,255,0.07)"
                                        pointerEvents="none"
                                    />

                                    {/* Hover kenarlık */}
                                    {isHovered && (
                                        <circle
                                            cx={p.cx} cy={p.cy} r={p.radius}
                                            fill="none"
                                            stroke={app.colorCenter}
                                            strokeWidth={2.5}
                                            opacity={0.7}
                                            pointerEvents="none"
                                        />
                                    )}

                                    {/* Drop target ring */}
                                    {dropTargetId === p.node.id && (
                                        <circle
                                            cx={p.cx} cy={p.cy} r={p.radius + 6}
                                            fill="none"
                                            stroke="rgba(255,255,255,0.7)"
                                            strokeWidth={2}
                                            strokeDasharray="6 4"
                                            pointerEvents="none"
                                        />
                                    )}

                                    {/* Hitbox: Gezegen etrafında tüm etkileşimleri tek noktada yakalayan şeffaf alan */}
                                    <circle
                                        cx={p.cx} cy={p.cy} r={p.radius + (dropTargetId === p.node.id ? 14 : 6)}
                                        fill="transparent"
                                        className="voronoi-planet__hitbox"
                                        style={{ cursor: isDraggingRef.current ? 'grabbing' : 'pointer' }}
                                        onClick={() => { if (!didDrag) drillIntoPlanet(p.node) }}
                                        onContextMenu={(e) => handleContextMenu(e, p.node, true)}
                                        onPointerDown={(e) => handleNodePointerDown(e, p.node)}
                                        onPointerEnter={(e) => handleNodePointerEnter(e, p.node)}
                                        onPointerLeave={handleNodePointerLeave}
                                        onMouseEnter={() => setHoveredIndex(i)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    />

                                    {/* İsim */}
                                    <text
                                        x={p.cx} y={p.cy + p.radius + nameYOffset}
                                        textAnchor="middle"
                                        className="voronoi-planet__name"
                                        fontSize={nameFontSize}
                                    >
                                        {p.node.name.length > 14 ? p.node.name.slice(0, 14) + '…' : p.node.name}
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
                    <span className="voronoi-depth-label__text">{translations[useMapStore.getState().language].solarSystem}</span>
                    <span className="voronoi-depth-label__level">{planets.length} {planets.length === 1 ? translations[useMapStore.getState().language].planetCount : translations[useMapStore.getState().language].planetsCount}</span>
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
                            animation: 'voronoi-pulse 1s infinite alternate'
                        }} />
                        {dropTargetId ? '↳ Drop here' : (activeDraggedNode ? 'Hold to move' : '↑ Quick Stash')} | {(draggedNode || activeDraggedNode)?.name}
                    </div>
                )}

                {/* Global Hover Tooltip */}
                {hoveredGlobalLinkIdx !== null && linkHoverPos && isSolarSystem && globalLinks[hoveredGlobalLinkIdx] && (
                    <div
                        className="voronoi-link-tooltip"
                        style={{
                            position: 'fixed',
                            left: linkHoverPos.x + 15,
                            top: linkHoverPos.y + 15,
                            background: 'rgba(10, 15, 30, 0.85)',
                            border: '1px solid rgba(80, 140, 255, 0.5)',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '13px',
                            pointerEvents: 'none',
                            zIndex: 10000,
                            backdropFilter: 'blur(4px)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        {planets[globalLinks[hoveredGlobalLinkIdx].source]?.node.name}
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>↔</span>
                        {planets[globalLinks[hoveredGlobalLinkIdx].target]?.node.name}
                        <span style={{ color: '#40c4ff', fontSize: '11px', marginLeft: '4px' }}>
                            ({globalLinks[hoveredGlobalLinkIdx].count})
                        </span>
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

                                // Link hover olduğunda kaynak/hedef hücreler parlak, diğerleri karardı
                                let cellOpacity = draggedNode?.id === cell.node.id ? 0.3 : 1
                                if (hoveredLinkIdx !== null) {
                                    const hl = localLinks[hoveredLinkIdx]
                                    if (hl) {
                                        const isLinked = hl.source.index === i || (!hl.target.isForeign && hl.target.index === i)
                                        cellOpacity = isLinked ? 1 : 0.25
                                    }
                                }

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
                                        style={{ opacity: cellOpacity, transition: 'opacity 0.25s ease' }}
                                    >
                                        <title>{cell.node.name}</title>
                                        <path className="voronoi-cell__path" d={polygonToPath(cell.polygon)}
                                            stroke={dropTargetId === cell.node.id ? '#fff' : 'none'}
                                            strokeWidth={dropTargetId === cell.node.id ? 4 : 0}
                                            fill={isHovered || dropTargetId === cell.node.id ? hoverPalette[hashStr(cell.node.name) % hoverPalette.length] : `url(#cell-grad-${i})`}
                                            style={{ transition: 'all 0.2s ease' }}
                                        />
                                        <text className="voronoi-cell__label" x={cell.centroid[0]}
                                            y={cell.centroid[1] - (subLabel ? labelSize * 0.3 : 0)} fontSize={labelSize}>
                                            {cell.node.name.length > 12 ? cell.node.name.slice(0, 12) + '...' : cell.node.name}
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
                                // — Opacity Mantığı —
                                // 1. Bir link hover'lanmışsa: yalnızca o link tam parlak, diğerleri sönük
                                // 2. Bir hücre hover'lanmışsa: bağlı linkler parlak, diğerleri sönük
                                // 3. Hiçbir şey hover'lanmamışsa: standart yarı şeffaf görünüm
                                const isThisLinkHovered = hoveredLinkIdx === idx
                                const isSourceCellHovered = hoveredIndex === link.source.index
                                const isTargetCellHovered = !link.target.isForeign && hoveredIndex === link.target.index

                                let opacity: number
                                let strokeWidth: number
                                let glowFilter = 'none'

                                if (hoveredLinkIdx !== null) {
                                    // Bir link aktif hover'da
                                    if (isThisLinkHovered) {
                                        opacity = 1
                                        strokeWidth = 4.5
                                        const glowColor = link.target.isForeign ? 'rgba(255,64,129,0.9)' : 'rgba(64,196,255,0.9)'
                                        glowFilter = `drop-shadow(0 0 6px ${glowColor}) drop-shadow(0 0 12px ${glowColor})`
                                    } else {
                                        opacity = 0.06
                                        strokeWidth = 2.5
                                    }
                                } else if (hoveredIndex !== null) {
                                    // Bir hücre hover'da
                                    if (isSourceCellHovered || isTargetCellHovered) {
                                        opacity = 0.95
                                        strokeWidth = 3.5
                                        const glowColor = link.target.isForeign ? 'rgba(255,64,129,0.7)' : 'rgba(64,196,255,0.7)'
                                        glowFilter = `drop-shadow(0 0 4px ${glowColor})`
                                    } else {
                                        opacity = 0.06
                                        strokeWidth = 2.5
                                    }
                                } else {
                                    // Standart durum — hiç hover yok
                                    opacity = 0.35
                                    strokeWidth = 2.5
                                }

                                // Kıvrımlı çizgi (Bezier)
                                const mx = (link.source.x + link.target.x) / 2
                                const my = (link.source.y + link.target.y) / 2
                                const cx = mx - (link.target.y - link.source.y) * 0.15
                                const cy = my + (link.target.x - link.source.x) * 0.15

                                const pathData = link.target.isForeign || link.target.isBroken
                                    ? `M ${link.source.x} ${link.source.y} L ${link.target.x} ${link.target.y}`
                                    : `M ${link.source.x} ${link.source.y} Q ${cx} ${cy} ${link.target.x} ${link.target.y}`

                                const strokeColor = link.target.isBroken ? '#ff5555' : link.target.isForeign ? '#ff4081' : '#40c4ff'

                                return (
                                    <g
                                        key={`local-link-${idx}`}
                                        style={{ opacity, transition: 'opacity 0.2s ease', filter: glowFilter }}
                                        className="voronoi-local-link"
                                    >
                                        {/* Tıklanabilir Görünmez Tampon (geniş hit alanı) */}
                                        <path
                                            d={pathData}
                                            fill="none"
                                            stroke="transparent"
                                            strokeWidth="18"
                                            strokeLinecap="round"
                                            style={{
                                                cursor: link.target.isForeign ? 'pointer' : 'default',
                                                pointerEvents: 'auto'
                                            }}
                                            onClick={() => {
                                                if (link.target.isForeign) handleLinkJump(link.target.id)
                                            }}
                                            onMouseEnter={(e) => {
                                                setHoveredLinkIdx(idx)
                                                setHoveredIndex(null) // Hücre hover'ını temizle — karışmasın
                                                setLinkHoverPos({ x: e.clientX, y: e.clientY })
                                            }}
                                            onMouseLeave={() => {
                                                setHoveredLinkIdx(null)
                                                setLinkHoverPos(null)
                                            }}
                                            onPointerMove={(e) => setLinkHoverPos({ x: e.clientX, y: e.clientY })}
                                        />

                                        {/* Görünür Ana Çizgi */}
                                        <path
                                            d={pathData}
                                            fill="none"
                                            stroke={strokeColor}
                                            strokeWidth={strokeWidth}
                                            strokeLinecap="round"
                                            strokeDasharray={link.target.isBroken ? '4 4' : 'none'}
                                            style={{ transition: 'stroke-width 0.2s ease', pointerEvents: 'none' }}
                                            className={`voronoi-trade-route ${link.target.isForeign ? 'voronoi-trade-route--jump' : ''}`}
                                        />

                                        {/* Akan Işık Animasyonu */}
                                        <path
                                            d={pathData}
                                            fill="none"
                                            stroke="#fff"
                                            strokeWidth={isThisLinkHovered ? 2.5 : 1.5}
                                            strokeDasharray={isThisLinkHovered ? '6 10' : '4 14'}
                                            style={{ pointerEvents: 'none', transition: 'stroke-width 0.2s ease' }}
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

            {/* Local Hover Tooltip */}
            {hoveredLinkIdx !== null && linkHoverPos && !isSolarSystem && localLinks[hoveredLinkIdx] && (
                <div
                    className="voronoi-link-tooltip"
                    style={{
                        position: 'fixed',
                        left: linkHoverPos.x + 15,
                        top: linkHoverPos.y + 15,
                        background: 'rgba(10, 15, 30, 0.9)',
                        border: `1px solid ${localLinks[hoveredLinkIdx].target.isBroken ? 'rgba(255, 85, 85, 0.5)' : localLinks[hoveredLinkIdx].target.isForeign ? 'rgba(255, 64, 129, 0.5)' : 'rgba(64, 196, 255, 0.5)'}`,
                        padding: '12px',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '13px',
                        pointerEvents: 'none',
                        zIndex: 10000,
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                        minWidth: '200px'
                    }}
                >
                    <div style={{
                        marginBottom: '8px',
                        paddingBottom: '8px',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        fontWeight: 600,
                        color: localLinks[hoveredLinkIdx].target.isBroken ? '#ff5555' : localLinks[hoveredLinkIdx].target.isForeign ? '#ff4081' : '#40c4ff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        {localLinks[hoveredLinkIdx].target.isBroken ? (
                            <>⚠️ {translations[useMapStore.getState().language].brokenLink || 'Kırık Bağlantı'}</>
                        ) : localLinks[hoveredLinkIdx].target.isForeign ? (
                            <>🚀 {translations[useMapStore.getState().language].foreignLink || 'Yabancı Gezegen Rotası'}</>
                        ) : (
                            <>⚡ {translations[useMapStore.getState().language].localLink || 'Yerel Bağlantı'}</>
                        )}
                        <span style={{
                            background: 'rgba(255,255,255,0.1)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            marginLeft: 'auto'
                        }}>
                            {localLinks[hoveredLinkIdx].details.length} {translations[useMapStore.getState().language].linkCount || 'bağ'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                        {localLinks[hoveredLinkIdx].details.map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.9)' }}>{d.sourceName}</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span>
                                <span style={{ color: d.isBroken ? '#ff8a8a' : localLinks[hoveredLinkIdx].target.isForeign ? '#ff80ab' : '#80d8ff', textDecoration: d.isBroken ? 'line-through' : 'none' }}>
                                    {d.targetPlanetName ? `[${d.targetPlanetName}] ` : ''}{d.targetName}
                                </span>
                            </div>
                        ))}
                    </div>
                    {localLinks[hoveredLinkIdx].target.isForeign && !localLinks[hoveredLinkIdx].target.isBroken && (
                        <div style={{
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px dotted rgba(255,255,255,0.2)',
                            fontSize: '11px',
                            color: 'rgba(255,255,255,0.5)',
                            textAlign: 'center'
                        }}>
                            {translations[useMapStore.getState().language].jumpToLinkedNote || 'Gitmek için tıklayın'}
                        </div>
                    )}
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
