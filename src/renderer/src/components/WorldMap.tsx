import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { geoNaturalEarth1, geoPath, geoCentroid, geoBounds } from 'd3-geo'
import { feature } from 'topojson-client'
import { Delaunay } from 'd3-delaunay'
import { useMapStore } from '../store/mapStore'
import type { HierarchyNode } from '../types/hierarchy'
import { buildObsidianUrl } from '../utils/obsidianUrl'

/* ── Types ────────────────────────────────────────────────── */
interface GeoFeat {
  type: string; id?: string
  properties: { name?: string }
  geometry: GeoJSON.Geometry
}

/* ── Load world ───────────────────────────────────────────── */
let cachedFeats: GeoFeat[] | null = null
async function loadWorld(): Promise<GeoFeat[]> {
  if (cachedFeats) return cachedFeats
  const topo = await import('world-atlas/countries-110m.json')
  const d = topo.default ?? topo
  const fc = feature(d as never, (d as any).objects.countries) as any
  cachedFeats = fc.features as GeoFeat[]
  return cachedFeats
}

/* ── Country assignment ───────────────────────────────────── */
const ASSIGN_IDS = [
  '840', '156', '076', '643', '356', '036', '124', '012', '032', '404',
  '276', '250', '392', '380', '724', '792', '818', '566', '710', '484',
]

/* ── Deterministic hash ───────────────────────────────────── */
function hashStr(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/* ── Grid Subdivision ─────────────────────────────────────── */
interface SubRegion {
  node: HierarchyNode
  polygon: GeoJSON.Feature
  center: [number, number]
  computedLocal?: boolean
  cachedGeographicSeeds?: { pt: [number, number]; owner: number }[]
}

function subdivideCountry(
  countryFeat: GeoFeat, children: HierarchyNode[]
): SubRegion[] {
  if (children.length === 0) return []
  const bounds = geoBounds(countryFeat.geometry as any)
  const [minLon, minLat] = bounds[0]
  const [maxLon, maxLat] = bounds[1]
  return gridSubdivide(minLon, maxLon, minLat, maxLat, children)
}

function subdivideRegion(
  parentCenter: [number, number], parentSize: [number, number], children: HierarchyNode[]
): SubRegion[] {
  if (children.length === 0) return []
  const [cx, cy] = parentCenter; const [pw, ph] = parentSize
  return gridSubdivide(cx - pw / 2, cx + pw / 2, cy - ph / 2, cy + ph / 2, children)
}

function gridSubdivide(
  minLon: number, maxLon: number, minLat: number, maxLat: number,
  children: HierarchyNode[]
): SubRegion[] {
  const w = maxLon - minLon; const h = maxLat - minLat
  const n = children.length
  const cols = Math.ceil(Math.sqrt(n * (w / Math.max(h, 0.01))))
  const rows = Math.ceil(n / cols)
  const cellW = w / cols; const cellH = h / rows

  return children.map((node, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x0 = minLon + col * cellW
    const y0 = maxLat - row * cellH
    const x1 = x0 + cellW
    const y1 = y0 - cellH
    const coords: [number, number][] = [
      [x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]
    ]
    return {
      node,
      polygon: {
        type: 'Feature' as const, properties: {},
        geometry: { type: 'Polygon' as const, coordinates: [coords] }
      },
      center: [(x0 + x1) / 2, (y0 + y1) / 2] as [number, number]
    }
  })
}

/* ── Colors ───────────────────────────────────────────────── */
const OCEAN = '#080c18'
const LAND_DIM = '#0e1520'
const LAND_DIM_BORDER = '#162030'
const FILLS = ['#1a3a6a', '#1a5a3a', '#4a1a5a', '#5a2a1a', '#1a4a5a', '#4a4a1a', '#5a1a3a', '#2a3a5a']
const BORDERS = ['#4a7abf', '#4abf7a', '#9a4abf', '#bf7a4a', '#4abfcf', '#bfbf4a', '#bf4a7a', '#6a9abf']
const HOVERS = ['#2a4a8a', '#2a6a4a', '#5a2a6a', '#6a3a2a', '#2a5a6a', '#5a5a2a', '#6a2a4a', '#3a4a6a']

/* ── Camera ───────────────────────────────────────────────── */
interface Cam { cx: number; cy: number; scale: number }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function ease(t: number) {
  // Cubic ease-in-out — daha yumuşak animasyon
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/* ── Component ────────────────────────────────────────────── */
export function WorldMap(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { hierarchy, navigation, drillDown, setRenameTarget, setError, language } = useMapStore((s) => ({
    hierarchy: s.hierarchy, navigation: s.navigation, drillDown: s.drillDown,
    setRenameTarget: s.setRenameTarget, setError: s.setError, language: s.language
  }))

  const [features, setFeatures] = useState<GeoFeat[]>([])
  const [hovered, setHovered] = useState<string | null>(null)
  const hovRef = useRef<string | null>(null); hovRef.current = hovered

  const cam = useRef<Cam>({ cx: 0, cy: 0, scale: 1 })
  const animFrom = useRef<Cam>({ cx: 0, cy: 0, scale: 1 })
  const animTo = useRef<Cam>({ cx: 0, cy: 0, scale: 1 })
  const animStart = useRef(0); const animActive = useRef(false)
  const panning = useRef(false); const panLast = useRef({ x: 0, y: 0 }); const panMoved = useRef(false)
  const subRegions = useRef<SubRegion[]>([])
  const voronoiRef = useRef<{ delaunay: any; nodes: HierarchyNode[]; ownerMap?: number[] } | null>(null)
  const testCanvasRef = useRef<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)

  const vaultCountries = hierarchy?.countries ?? []
  const assignMap = useRef(new Map<string, HierarchyNode>())
  const nodeToFeat = useRef(new Map<string, string>())
  const linkToPathMap = useRef(new Map<string, string>())
  const globalNodesMap = useRef(new Map<string, HierarchyNode>())

  useEffect(() => {
    assignMap.current.clear(); nodeToFeat.current.clear()
    vaultCountries.forEach((vc, i) => {
      const fid = ASSIGN_IDS[i % ASSIGN_IDS.length]
      assignMap.current.set(fid, vc)
      nodeToFeat.current.set(vc.id, fid)
    })

    const lPath = new Map<string, string>()
    const gNodes = new Map<string, HierarchyNode>()
    const traverse = (n: HierarchyNode) => {
      // Suffixesiz dosya ismi (örn. "Not 1") ile absolute/relative path eşleştirme
      lPath.set(n.name.toLowerCase(), n.id)
      gNodes.set(n.id, n) // Global erişim için ID (path) ile sakla
      n.children.forEach(traverse)
    }
    vaultCountries.forEach(traverse)
    linkToPathMap.current = lPath
    globalNodesMap.current = gNodes
  }, [vaultCountries])

  useEffect(() => { loadWorld().then(setFeatures) }, [])

  /* ── Build sub-regions on level change ── */
  useEffect(() => {
    const nav = navigation
    if (nav.level === 'world') {
      subRegions.current = []
      voronoiRef.current = null
    } else if (nav.level === 'country' && nav.selectedCountry) {
      const fid = nodeToFeat.current.get(nav.selectedCountry.id)
      const feat = fid ? features.find(f => f.id === fid) : null
      if (feat) {
        subRegions.current = subdivideCountry(feat, nav.selectedCountry.children)
      }
    } else if (nav.level === 'city' && nav.selectedCity && nav.selectedCountry) {
      // Find parent sub-region
      const fid = nodeToFeat.current.get(nav.selectedCountry.id)
      const feat = fid ? features.find(f => f.id === fid) : null
      if (feat) {
        const parentSubs = subdivideCountry(feat, nav.selectedCountry.children)
        const parentSub = parentSubs.find(s => s.node.id === nav.selectedCity!.id)
        if (parentSub) {
          const bounds = geoBounds(parentSub.polygon.geometry as any)
          const size: [number, number] = [bounds[1][0] - bounds[0][0], bounds[1][1] - bounds[0][1]]
          subRegions.current = subdivideRegion(parentSub.center, size, nav.selectedCity.children)
        }
      }
    } else if (nav.level === 'town' && nav.selectedTown && nav.selectedCity && nav.selectedCountry) {
      const fid = nodeToFeat.current.get(nav.selectedCountry.id)
      const feat = fid ? features.find(f => f.id === fid) : null
      if (feat) {
        const countrySubs = subdivideCountry(feat, nav.selectedCountry.children)
        const citySub = countrySubs.find(s => s.node.id === nav.selectedCity!.id)
        if (citySub) {
          const cBounds = geoBounds(citySub.polygon.geometry as any)
          const cSize: [number, number] = [cBounds[1][0] - cBounds[0][0], cBounds[1][1] - cBounds[0][1]]
          const townSubs = subdivideRegion(citySub.center, cSize, nav.selectedCity!.children)
          const townSub = townSubs.find(s => s.node.id === nav.selectedTown!.id)
          if (townSub) {
            const tBounds = geoBounds(townSub.polygon.geometry as any)
            const tSize: [number, number] = [tBounds[1][0] - tBounds[0][0], tBounds[1][1] - tBounds[0][1]]
            subRegions.current = subdivideRegion(townSub.center, tSize, nav.selectedTown.children)
          }
        }
      }
    }
  }, [navigation.level, navigation.selectedCountry?.id, navigation.selectedCity?.id, navigation.selectedTown?.id, features])

  /* ── Animate camera ── */
  useEffect(() => {
    let target: Cam = { cx: 0, cy: 0, scale: 1 }
    const canvas = canvasRef.current
    const w = canvas?.clientWidth ?? 1280
    const h = canvas?.clientHeight ?? 800

    if (navigation.level === 'world') {
      target = { cx: 0, cy: 0, scale: 1 }
    } else if (navigation.selectedCountry) {
      // Ülke feature'ını bul ve centroid üzerinden kamerayı hesapla
      const fid = nodeToFeat.current.get(navigation.selectedCountry.id)
      const feat = fid ? features.find(f => f.id === fid) : null
      if (feat) {
        // geoCentroid antimeridian-safe (geoBounds değil!)
        const c = geoCentroid(feat.geometry as any)
        const proj = geoNaturalEarth1().scale(200).translate([w / 2, h / 2])
        const screen = proj(c)
        if (screen && isFinite(screen[0]) && isFinite(screen[1])) {
          // Ülke ekran boyutunu pathGen.bounds ile hesapla
          const pathCheck = geoPath(proj)
          const bounds = pathCheck.bounds(feat.geometry as any)
          let zoomLevel = 2.5
          if (bounds) {
            const bboxW = Math.abs(bounds[1][0] - bounds[0][0])
            const bboxH = Math.abs(bounds[1][1] - bounds[0][1])
            if (isFinite(bboxW) && isFinite(bboxH) && bboxW > 0 && bboxH > 0) {
              const scaleX = (w * 0.8) / bboxW
              const scaleY = (h * 0.8) / bboxH
              const fitScale = Math.min(scaleX, scaleY)
              const minZoom = navigation.level === 'country' ? 2.5 : navigation.level === 'city' ? 5 : 10
              zoomLevel = Math.max(minZoom, fitScale)
            }
          }
          // Çok büyük zoom engelle
          zoomLevel = Math.min(zoomLevel, 20)
          target = { cx: (w / 2 - screen[0]) / 200, cy: (h / 2 - screen[1]) / 200, scale: zoomLevel }
        }
      }
    }

    // NaN guard — kamera asla NaN olmasın
    if (!isFinite(target.cx) || !isFinite(target.cy) || !isFinite(target.scale)) {
      target = { cx: 0, cy: 0, scale: 1 }
    }

    // animFrom da NaN ise sıfırla
    const from = cam.current
    if (!isFinite(from.cx) || !isFinite(from.cy) || !isFinite(from.scale)) {
      cam.current = { cx: 0, cy: 0, scale: 1 }
    }

    animFrom.current = { ...cam.current }
    animTo.current = target
    animStart.current = performance.now()
    animActive.current = true
    rafRef.current = requestAnimationFrame(draw)
  }, [navigation.level, navigation.selectedCountry?.id, navigation.selectedCity?.id, navigation.selectedTown?.id, features])

  /* ── Draw ── */
  const draw = useCallback((time?: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    try {
      // Her frame temiz canvas state ile başla
      ctx.save()

      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth; const h = canvas.clientHeight
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr; canvas.height = h * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (animActive.current && time) {
        const t = ease(Math.min(1, (time - animStart.current) / 700))
        cam.current = {
          cx: lerp(animFrom.current.cx, animTo.current.cx, t),
          cy: lerp(animFrom.current.cy, animTo.current.cy, t),
          scale: lerp(animFrom.current.scale, animTo.current.scale, t)
        }
        if (t >= 1) animActive.current = false
        else rafRef.current = requestAnimationFrame(draw)
      }

      const c = cam.current
      const proj = geoNaturalEarth1()
        .scale(200 * c.scale)
        .translate([w / 2 + c.cx * 200 * c.scale, h / 2 + c.cy * 200 * c.scale])
      const pathGen = geoPath(proj, ctx)

      ctx.fillStyle = OCEAN; ctx.fillRect(0, 0, w, h)

      // All countries
      for (const feat of features) {
        const vn = assignMap.current.get(feat.id ?? '')
        const isActive = !!vn
        const isHov = isActive && vn!.id === hovRef.current && navigation.level === 'world'
        const idx = isActive ? vaultCountries.indexOf(vn!) : 0

        ctx.beginPath(); pathGen(feat.geometry as any)

        if (isActive) {
          ctx.shadowColor = BORDERS[idx % BORDERS.length]
          ctx.shadowBlur = isHov ? 25 : 0
          ctx.fillStyle = isHov ? HOVERS[idx % HOVERS.length] : FILLS[idx % FILLS.length]
        } else {
          ctx.shadowBlur = 0; ctx.fillStyle = LAND_DIM
        }

        ctx.fill(); ctx.shadowBlur = 0
        ctx.strokeStyle = isActive ? BORDERS[idx % BORDERS.length] : LAND_DIM_BORDER
        ctx.lineWidth = isActive ? (isHov ? 2.5 : 1.5) : 0.3
        ctx.stroke()

        // Country label (world level only)
        if (isActive && navigation.level === 'world') {
          const centroid = pathGen.centroid(feat.geometry as any)
          if (centroid && !isNaN(centroid[0])) {
            const fs = Math.max(10, Math.min(16, 12 * c.scale * 0.3))
            ctx.font = `${isHov ? 700 : 600} ${fs}px -apple-system, sans-serif`
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
            ctx.fillStyle = isHov ? '#fff' : '#d0d4f0'
            ctx.fillText(vn!.name, centroid[0], centroid[1])
            if (vn!.children.length > 0) {
              ctx.font = `${Math.max(8, fs * 0.7)}px sans-serif`
              ctx.fillStyle = BORDERS[idx % BORDERS.length]
              ctx.fillText(`${vn!.children.length}`, centroid[0], centroid[1] + fs + 2)
            }
          }
        }
        ctx.globalAlpha = 1
      }

      // Sub-regions — grid polygons clipped to country
      if (navigation.level !== 'world' && subRegions.current.length > 0) {
        const countryFeat = (() => {
          if (!navigation.selectedCountry) return null
          const fid = nodeToFeat.current.get(navigation.selectedCountry.id)
          return fid ? features.find(f => f.id === fid) : null
        })()

        if (countryFeat) {
          // Clip to country shape
          ctx.save()
          ctx.beginPath()
          pathGen(countryFeat.geometry as any)
          ctx.clip()

          // Draw each sub-region polygon
          for (let ci = 0; ci < subRegions.current.length; ci++) {
            const sr = subRegions.current[ci]
            const isHov = sr.node.id === hovRef.current
            const colorIdx = ci % FILLS.length

            let fill: string, fillHov: string
            if (sr.node.color) {
              fill = sr.node.color; fillHov = sr.node.color
            } else if (sr.node.type === 'town') {
              const townFills = ['#2d1b69', '#1b3a69', '#1b6945', '#69451b', '#4a1b69']
              const townHovers = ['#3b2480', '#2a4a8a', '#2a6a4a', '#6a3a2a', '#5a2a6a']
              fill = townFills[colorIdx % townFills.length]; fillHov = townHovers[colorIdx % townHovers.length]
            } else if (sr.node.type === 'home') {
              const homeFills = ['#064e3b', '#0e3b4e', '#3b0e4e', '#4e3b0e', '#0e4e2a']
              const homeHovers = ['#065f46', '#1a4a5a', '#4a1a5a', '#5a4a1a', '#1a5a3a']
              fill = homeFills[colorIdx % homeFills.length]; fillHov = homeHovers[colorIdx % homeHovers.length]
            } else {
              fill = FILLS[colorIdx]; fillHov = HOVERS[colorIdx]
            }

            ctx.beginPath()
            pathGen(sr.polygon.geometry as any)

            ctx.fillStyle = isHov ? fillHov : fill
            if (sr.node.color && isHov) ctx.filter = 'brightness(1.5)'

            let areaAlpha = 1
            if (hovRef.current && hovRef.current !== sr.node.id && !sr.node.id.startsWith(hovRef.current)) {
              areaAlpha = 0.3
            }
            if (sr.node.isEmpty) areaAlpha *= 0.15

            ctx.globalAlpha = areaAlpha
            ctx.fill()

            ctx.strokeStyle = sr.node.color ? 'rgba(0,0,0,0.15)' : 'rgba(180,210,255,0.08)'
            ctx.lineWidth = 1
            ctx.stroke()

            ctx.filter = 'none'
            ctx.globalAlpha = 1
          }

          // Hover glow
          const hovSr = subRegions.current.find(s => s.node.id === hovRef.current)
          if (hovSr) {
            ctx.beginPath()
            pathGen(hovSr.polygon.geometry as any)
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5
            ctx.shadowColor = '#fff'; ctx.shadowBlur = 12
            ctx.stroke(); ctx.shadowBlur = 0
          }

          ctx.restore()

          // Labels (outside clip)
          for (const sr of subRegions.current) {
            const isHov = sr.node.id === hovRef.current
            // Centroid of the polygon for better label placement
            const centroid = pathGen.centroid(sr.polygon.geometry as any)
            if (!centroid || isNaN(centroid[0])) continue

            const fs = Math.max(13, Math.min(20, 14 * c.scale * 0.15))
            ctx.font = `700 ${fs}px -apple-system, 'Segoe UI', sans-serif`
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
            ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'
            ctx.strokeText(sr.node.name, centroid[0], centroid[1])
            ctx.fillStyle = isHov ? '#ffeb3b' : '#ffffff'
            ctx.fillText(sr.node.name, centroid[0], centroid[1])

            if (sr.node.type !== 'home' && sr.node.children.length > 0) {
              const bfs = Math.max(10, fs * 0.6)
              ctx.font = `600 ${bfs}px sans-serif`
              ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.6)'
              ctx.strokeText(`${sr.node.children.length}`, centroid[0], centroid[1] + fs + 3)
              ctx.fillStyle = 'rgba(220,230,255,0.9)'
              ctx.fillText(`${sr.node.children.length}`, centroid[0], centroid[1] + fs + 3)
            }
          }
        }
      }

      // ── Trade Routes (Bağlantı Çizgileri - Global) ──
      ctx.save()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.setLineDash([4, 4])

      if (navigation.level === 'world') {
        for (const feat of features) {
          const vn = assignMap.current.get(feat.id ?? '')
          if (!vn || !vn.links || vn.links.length === 0) continue

          const p1 = geoCentroid(feat.geometry as any)
          const pt1 = proj(p1)
          if (!pt1) continue

          for (const linkName of vn.links) {
            const targetPath = linkToPathMap.current.get(linkName.toLowerCase())
            if (!targetPath) continue
            // targetNode'u bul
            const targetNode = globalNodesMap.current.get(targetPath)
            if (!targetNode) continue

            // Hedef node'un centroid'ini bulalım (Sadece world level'da başka ülkere bağlantı çiziyoruz şimdilik)
            // Eğer hedef başka bir ülkenin altındaysa, o ülkenin centroid'ini bul.
            const targetCountryId = targetNode.id.split('/')[0]
            const fTargetId = nodeToFeat.current.get(targetCountryId)
            if (!fTargetId) continue
            const ftFeat = features.find(f => f.id === fTargetId)
            if (!ftFeat) continue

            const p2 = geoCentroid(ftFeat.geometry as any)
            const pt2 = proj(p2)
            if (!pt2) continue

            ctx.beginPath()
            ctx.moveTo(pt1[0], pt1[1])
            // Quadratic curve ile hafif kavis:
            const cx = (pt1[0] + pt2[0]) / 2
            const cy = (pt1[1] + pt2[1]) / 2 - 50
            ctx.quadraticCurveTo(cx, cy, pt2[0], pt2[1])
            ctx.stroke()
          }
        }
      }
      ctx.restore()

    } catch (e) { console.error('WorldMap draw error:', e) }
    finally { ctx.restore() } // Canvas state HER ZAMAN temizlenir
  }, [features, navigation, vaultCountries])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw, hovered])

  /* ── Hit test ── */
  const hitWorld = useCallback((mx: number, my: number): HierarchyNode | null => {
    if (!canvasRef.current || features.length === 0) return null
    const c = cam.current; const w = canvasRef.current.clientWidth; const h = canvasRef.current.clientHeight
    const proj = geoNaturalEarth1().scale(200 * c.scale).translate([w / 2 + c.cx * 200 * c.scale, h / 2 + c.cy * 200 * c.scale])
    const off = document.createElement('canvas'); off.width = 1; off.height = 1
    const octx = off.getContext('2d')!; const op = geoPath(proj, octx)
    for (const feat of features) {
      const vn = assignMap.current.get(feat.id ?? '')
      if (!vn) continue
      octx.beginPath(); op(feat.geometry as any)
      if (octx.isPointInPath(mx, my)) return vn
    }
    return null
  }, [features])

  const hitSub = useCallback((mx: number, my: number): HierarchyNode | null => {
    if (!canvasRef.current || subRegions.current.length === 0) return null
    const c = cam.current; const w = canvasRef.current.clientWidth; const h = canvasRef.current.clientHeight
    const proj = geoNaturalEarth1().scale(200 * c.scale).translate([w / 2 + c.cx * 200 * c.scale, h / 2 + c.cy * 200 * c.scale])
    const testOff = document.createElement('canvas'); testOff.width = 1; testOff.height = 1
    const toctx = testOff.getContext('2d')!
    const op = geoPath(proj, toctx)
    for (const sr of subRegions.current) {
      toctx.beginPath(); op(sr.polygon.geometry as any)
      if (toctx.isPointInPath(mx, my)) return sr.node
    }
    return null
  }, [navigation.level])

  /* ── Events ── */
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { panning.current = true; panMoved.current = false; panLast.current = { x: e.clientX, y: e.clientY } }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    if (panning.current) {
      const dx = e.clientX - panLast.current.x; const dy = e.clientY - panLast.current.y
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) panMoved.current = true
      panLast.current = { x: e.clientX, y: e.clientY }
      const c = cam.current; const s = 200 * c.scale
      cam.current = { ...c, cx: c.cx + dx / s, cy: c.cy + dy / s }
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
      rafRef.current = requestAnimationFrame(draw)
      return
    }
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top
    const hit = navigation.level !== 'world' ? (hitSub(mx, my) ?? hitWorld(mx, my)) : hitWorld(mx, my)
    const newId = hit?.id ?? null
    if (newId !== hovRef.current) setHovered(newId)
    // Cursor: pointer on hoverable items
    if (canvasRef.current) canvasRef.current.style.cursor = hit ? 'pointer' : 'default'

    // Tooltip position update without React re-render
    if (tooltipRef.current) {
      // Yalnızca önizlemesi olan veya en alt seviye nota sahip alanlarda tooltip göster
      if (hit && (hit.type === 'home' || hit.preview)) {
        tooltipRef.current.style.transform = `translate(${e.clientX + 15}px, ${e.clientY + 15}px)`
        tooltipRef.current.style.opacity = '1'
      } else {
        tooltipRef.current.style.opacity = '0'
      }
    }
  }, [draw, hitWorld, hitSub, navigation.level])

  const onMouseUp = useCallback(() => { panning.current = false }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const f = e.deltaY > 0 ? 0.88 : 1.14
    cam.current = { ...cam.current, scale: Math.min(50, Math.max(0.3, cam.current.scale * f)) }
    rafRef.current = requestAnimationFrame(draw)
  }, [draw])

  const onClick = useCallback((e: React.MouseEvent) => {
    if (panMoved.current) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top
    const hit = navigation.level !== 'world' ? (hitSub(mx, my) ?? null) : hitWorld(mx, my)
    if (!hit) return
    if (hit.type === 'home') {
      if (!hierarchy) return
      const url = buildObsidianUrl(hierarchy.vaultName, hit.relativePath)
      window.api.openObsidian(url).catch(() => setError(language === 'tr' ? 'Obsidian açılamadı.' : 'Could not open Obsidian.'))
    } else { drillDown(hit) }
  }, [hitWorld, hitSub, navigation.level, hierarchy, drillDown, setError, language])

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top
    const hit = navigation.level !== 'world' ? (hitSub(mx, my) ?? hitWorld(mx, my)) : hitWorld(mx, my)
    if (hit) setRenameTarget(hit)
  }, [hitWorld, hitSub, navigation.level, setRenameTarget])

  const hoveredNode = useMemo(() => {
    if (!hovered) return null
    if (navigation.level === 'world') {
      for (const feat of features) {
        const vn = assignMap.current.get(feat.id ?? '')
        if (vn && vn.id === hovered) return vn
      }
    }
    return subRegions.current.find(s => s.node.id === hovered)?.node || null
  }, [hovered, navigation.level, features])

  return (
    <>
      <canvas ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onClick={onClick} onContextMenu={onContextMenu}
      />
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed', top: 0, left: 0,
          opacity: 0, pointerEvents: 'none', zIndex: 9999,
          background: 'rgba(15, 15, 30, 0.85)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(80, 80, 140, 0.4)',
          borderRadius: '8px', padding: '12px',
          color: '#e0e2ff', maxWidth: '300px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          transition: 'opacity 0.15s ease'
        }}
      >
        {hoveredNode && (
          <>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: hoveredNode.preview || hoveredNode.weight ? '6px' : '0' }}>
              {hoveredNode.name}
            </div>
            {hoveredNode.weight !== undefined && (
              <div style={{ fontSize: '11px', color: '#8a94ff', marginBottom: hoveredNode.preview ? '6px' : '0' }}>
                {(hoveredNode.weight / 1024).toFixed(1)} KB
              </div>
            )}
            {hoveredNode.preview && (
              <div style={{
                fontSize: '12px', color: '#a0a0cc', lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
              }}>
                {hoveredNode.preview}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
