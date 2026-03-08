import { create } from 'zustand'
import type { VaultHierarchy, NavigationState, CameraState, HierarchyNode } from '../types/hierarchy'
import type { Language } from '../i18n/translations'
import { PLANET_APPEARANCES, DEFAULT_APPEARANCE_KEY } from '../utils/planetAppearances'

/* ── LocalStorage helpers ─────────────────────────────────── */
const LS_APPEARANCES = 'planet-appearances-v1'
const LS_CUSTOM_IMAGES = 'planet-custom-images-v1'
const LS_PLANET_SIZES = 'planet-sizes-v1'

function loadAppearances(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_APPEARANCES) ?? '{}') } catch { return {} }
}
function saveAppearances(data: Record<string, string>): void {
  try { localStorage.setItem(LS_APPEARANCES, JSON.stringify(data)) } catch { }
}
function loadCustomImages(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_CUSTOM_IMAGES) ?? '{}') } catch { return {} }
}
function saveCustomImages(data: Record<string, string>): void {
  try { localStorage.setItem(LS_CUSTOM_IMAGES, JSON.stringify(data)) } catch { }
}
function loadPlanetSizes(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(LS_PLANET_SIZES) ?? '{}') } catch { return {} }
}
function savePlanetSizes(data: Record<string, number>): void {
  try { localStorage.setItem(LS_PLANET_SIZES, JSON.stringify(data)) } catch { }
}

const MIN_SCALE = 0.2
const MAX_SCALE = 8

export type BackgroundTheme = 'default' | 'galaxy' | 'meteors' | 'constellation' | 'supernova'
const LS_BACKGROUND_THEME = 'background-theme-v1'

function loadBackgroundTheme(): BackgroundTheme {
  const saved = localStorage.getItem(LS_BACKGROUND_THEME) as BackgroundTheme | null
  if (saved && ['default', 'galaxy', 'meteors', 'constellation', 'supernova'].includes(saved)) {
    return saved
  }
  return 'default'
}

function saveBackgroundTheme(theme: BackgroundTheme): void {
  try { localStorage.setItem(LS_BACKGROUND_THEME, theme) } catch { }
}

interface MapStore {
  hierarchy: VaultHierarchy | null
  navigation: NavigationState
  camera: CameraState
  language: Language
  hoveredId: string | null
  renameTarget: HierarchyNode | null
  contextMenuTarget: { node: HierarchyNode; x: number; y: number; isPlanet?: boolean } | null
  error: string | null
  successMessage: string | null

  actionNoteTarget: HierarchyNode | null
  setActionNoteTarget: (node: HierarchyNode | null) => void
  editingNoteTarget: HierarchyNode | null
  setEditingNoteTarget: (node: HierarchyNode | null) => void

  backgroundTheme: BackgroundTheme
  setBackgroundTheme: (theme: BackgroundTheme) => void

  voronoiPath: HierarchyNode[]
  voronoiDrillDown: (node: HierarchyNode) => void
  voronoiGoBack: () => void
  voronoiNavigateToIndex: (index: number) => void
  voronoiJumpTo: (targetNode: HierarchyNode, rootCountries: HierarchyNode[]) => void

  setHierarchy: (h: VaultHierarchy) => void
  drillDown: (node: HierarchyNode) => void
  goBack: () => void
  navigateToLevel: (level: 'world' | 'country' | 'city' | 'town') => void
  setCamera: (c: Partial<CameraState>) => void
  setLanguage: (l: Language) => void
  setHovered: (id: string | null) => void
  setRenameTarget: (node: HierarchyNode | null) => void
  setContextMenuTarget: (target: { node: HierarchyNode; x: number; y: number; isPlanet?: boolean } | null) => void
  setError: (msg: string | null) => void
  setSuccessMessage: (msg: string | null) => void

  // --- Drag & Drop (Cargo Hold) ---
  stashedNodes: HierarchyNode[]
  activeDraggedNode: HierarchyNode | null
  setActiveDraggedNode: (node: HierarchyNode | null) => void
  stashNode: (node: HierarchyNode) => void
  unstashNode: (nodeId: string) => void
  clearStash: () => void
  // --------------------------------

  // --- Planet Appearances ---
  /**
   * Maps planetId → appearance key (e.g. 'earth', 'mars', 'custom').
   * Persisted in localStorage so it survives app restarts.
   */
  planetAppearances: Record<string, string>
  /**
   * Maps planetId → custom image data URL (base64).
   * Only set when appearance key is 'custom'.
   */
  customPlanetImages: Record<string, string>
  /**
   * Maps planetId → multiplier for base size (e.g. 1.0 is default, 1.5 is larger).
   */
  planetSizes: Record<string, number>
  setPlanetAppearance: (planetId: string, key: string) => void
  setCustomPlanetImage: (planetId: string, dataUrl: string) => void
  setPlanetSize: (planetId: string, size: number) => void
  ensurePlanetAppearance: (planetId: string) => void
  randomizeAllAppearances: () => void
  // ---------------------------
}

export const useMapStore = create<MapStore>((set) => ({
  hierarchy: null,
  navigation: { level: 'world', selectedCountry: null, selectedCity: null, selectedTown: null },
  camera: { x: 0, y: 0, scale: 1 },
  language: 'en',
  hoveredId: null,
  renameTarget: null,
  contextMenuTarget: null,
  error: null,
  successMessage: null,

  actionNoteTarget: null,
  editingNoteTarget: null,

  backgroundTheme: loadBackgroundTheme(),
  setBackgroundTheme: (theme) => set(() => {
    saveBackgroundTheme(theme)
    return { backgroundTheme: theme }
  }),

  // Voronoi navigasyon — klasör yolu stack'i
  voronoiPath: [],
  stashedNodes: [],
  planetAppearances: loadAppearances(),
  customPlanetImages: loadCustomImages(),
  planetSizes: loadPlanetSizes(),
  activeDraggedNode: null,

  voronoiDrillDown: (node) => set((state) => ({
    voronoiPath: [...state.voronoiPath, node]
  })),

  voronoiGoBack: () => set((state) => ({
    voronoiPath: state.voronoiPath.slice(0, -1)
  })),

  voronoiNavigateToIndex: (index) => set((state) => {
    // index = -1 → root (boş path)
    // index = 0..n → path[0..index]
    if (index < 0) return { voronoiPath: [] }
    return { voronoiPath: state.voronoiPath.slice(0, index + 1) }
  }),

  voronoiJumpTo: (targetNode, rootCountries) => set(() => {
    // Hedef node'u bul ve köke kadar olan yolu (path) inşa et
    let foundPath: HierarchyNode[] | null = null

    const findPath = (current: HierarchyNode, currentPath: HierarchyNode[]) => {
      if (foundPath) return
      const nextPath = [...currentPath, current]
      if (current.id === targetNode.id) {
        foundPath = nextPath
        return
      }
      if (current.children) {
        for (const child of current.children) {
          findPath(child, nextPath)
        }
      }
    }

    for (const root of rootCountries) {
      if (foundPath) break
      findPath(root, [])
    }

    if (foundPath) {
      // Eğer hedef node'un alt klasörü yoksa (bu bir dosya/yaprak ise),
      // kullanıcının o notun İÇİNE değil, o notu BARINDIRAN gezegene gitmesi gerekir.
      // Bu yüzden son düğümü (hedefin kendisini) path'ten çıkarıyoruz.
      const pathArray: HierarchyNode[] = foundPath
      const isLeaf = !targetNode.children || targetNode.children.length === 0
      const finalPath = isLeaf && pathArray.length > 1 ? pathArray.slice(0, -1) : pathArray

      return { voronoiPath: finalPath }
    }
    return {}
  }),

  setHierarchy: (h) => set((state) => {
    // 1. Bulk initialize missing appearances for the incoming hierarchy
    let appearancesChanged = false
    const nextAppearances = { ...state.planetAppearances }
    const presets = PLANET_APPEARANCES.filter(a => a.type === 'preset')

    const ensureDefaults = (nodes: HierarchyNode[]) => {
      for (const node of nodes) {
        if (!nextAppearances[node.id]) {
          const randomIndex = Math.floor(Math.random() * presets.length)
          nextAppearances[node.id] = presets[randomIndex]?.key || DEFAULT_APPEARANCE_KEY
          appearancesChanged = true
        }
        if (node.children) {
          ensureDefaults(node.children)
        }
      }
    }

    if (h.countries) {
      ensureDefaults(h.countries)
    }

    if (appearancesChanged) {
      saveAppearances(nextAppearances)
    }

    if (!state.hierarchy || state.hierarchy.vaultName !== h.vaultName) {
      // Farklı vault yüklendiyse state sıfırlanır
      return {
        hierarchy: h,
        voronoiPath: [],
        ...(appearancesChanged ? { planetAppearances: nextAppearances } : {})
      }
    }

    // Aynı vault'un 30 saniyelik arka plan güncellemesi
    // Kullanıcının bulunduğu derinliği (voronoiPath) kaybetmiyoruz ancak node referanslarını tazeliyoruz
    const newPath: HierarchyNode[] = []

    const findNodeById = (nodeList: HierarchyNode[], id: string): HierarchyNode | null => {
      for (const n of nodeList) {
        if (n.id === id) return n
        if (n.children) {
          const found = findNodeById(n.children, id)
          if (found) return found
        }
      }
      return null
    }

    // Kullanıcının mevcut path'i üzerindeki her bir ID için yeni taramadaki taze node'u bul
    for (const oldNode of state.voronoiPath) {
      const freshNode = findNodeById(h.countries, oldNode.id)
      if (freshNode) {
        newPath.push(freshNode)
      } else {
        // Eğer bir klasör silinmişse (freshNode bulunamadıysa) daha derine gitmeyi bırak
        break
      }
    }

    return {
      hierarchy: h,
      voronoiPath: newPath,
      ...(appearancesChanged ? { planetAppearances: nextAppearances } : {})
    }
  }),

  drillDown: (node) => set((state) => {
    const nav = state.navigation
    if (nav.level === 'world' && node.type === 'country')
      return { navigation: { ...nav, level: 'country', selectedCountry: node }, camera: { x: 0, y: 0, scale: 1 } }
    if (nav.level === 'country' && node.type === 'city')
      return { navigation: { ...nav, level: 'city', selectedCity: node }, camera: { x: 0, y: 0, scale: 1 } }
    if (nav.level === 'city' && node.type === 'town')
      return { navigation: { ...nav, level: 'town', selectedTown: node }, camera: { x: 0, y: 0, scale: 1 } }
    return {}
  }),

  goBack: () => set((state) => {
    const nav = state.navigation
    if (nav.level === 'town') return { navigation: { ...nav, level: 'city', selectedTown: null }, camera: { x: 0, y: 0, scale: 1 } }
    if (nav.level === 'city') return { navigation: { ...nav, level: 'country', selectedCity: null }, camera: { x: 0, y: 0, scale: 1 } }
    if (nav.level === 'country') return { navigation: { ...nav, level: 'world', selectedCountry: null }, camera: { x: 0, y: 0, scale: 1 } }
    return {}
  }),

  navigateToLevel: (level) => set((state) => {
    const nav = state.navigation
    if (level === 'world') return { navigation: { level: 'world', selectedCountry: null, selectedCity: null, selectedTown: null }, camera: { x: 0, y: 0, scale: 1 } }
    if (level === 'country') return { navigation: { ...nav, level: 'country', selectedCity: null, selectedTown: null }, camera: { x: 0, y: 0, scale: 1 } }
    if (level === 'city') return { navigation: { ...nav, level: 'city', selectedTown: null }, camera: { x: 0, y: 0, scale: 1 } }
    return {}
  }),

  setCamera: (c) => set((state) => ({
    camera: {
      x: c.x ?? state.camera.x,
      y: c.y ?? state.camera.y,
      scale: c.scale !== undefined ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, c.scale)) : state.camera.scale
    }
  })),

  setLanguage: (l) => set({ language: l }),
  setHovered: (id) => set({ hoveredId: id }),
  setRenameTarget: (node) => set({ renameTarget: node }),
  setContextMenuTarget: (target) => set({ contextMenuTarget: target }),
  setError: (msg) => set({ error: msg }),
  setSuccessMessage: (msg) => set({ successMessage: msg }),
  setActionNoteTarget: (node) => set({ actionNoteTarget: node }),
  setEditingNoteTarget: (node) => set({ editingNoteTarget: node }),

  // --- Drag & Drop (Cargo Hold) ---
  setActiveDraggedNode: (node) => set({ activeDraggedNode: node }),

  stashNode: (node) => set((state) => {
    // Avoid duplicates
    if (state.stashedNodes.some(n => n.id === node.id)) {
      return state
    }
    return { stashedNodes: [...state.stashedNodes, node] }
  }),
  unstashNode: (nodeId) => set((state) => ({
    stashedNodes: state.stashedNodes.filter(n => n.id !== nodeId)
  })),
  clearStash: () => set({ stashedNodes: [] }),

  // --- Planet Appearances ---
  setPlanetAppearance: (planetId, key) => set((state) => {
    const next = { ...state.planetAppearances, [planetId]: key }
    saveAppearances(next)
    return { planetAppearances: next }
  }),

  setCustomPlanetImage: (planetId, dataUrl) => set((state) => {
    const nextImages = { ...state.customPlanetImages, [planetId]: dataUrl }
    saveCustomImages(nextImages)
    // Also mark appearance as custom
    const nextApp = { ...state.planetAppearances, [planetId]: 'custom' }
    saveAppearances(nextApp)
    return { planetAppearances: nextApp, customPlanetImages: nextImages }
  }),

  setPlanetSize: (planetId, size) => set((state) => {
    const nextKeys = { ...state.planetSizes, [planetId]: size }
    savePlanetSizes(nextKeys)
    return { planetSizes: nextKeys }
  }),

  ensurePlanetAppearance: (planetId) => set((state) => {
    if (state.planetAppearances[planetId]) return {}

    // Pick a random preset
    const presets = PLANET_APPEARANCES.filter(a => a.type === 'preset')
    const randomIndex = Math.floor(Math.random() * presets.length)
    const randomKey = presets[randomIndex]?.key || DEFAULT_APPEARANCE_KEY

    const next = { ...state.planetAppearances, [planetId]: randomKey }
    saveAppearances(next)
    return { planetAppearances: next }
  }),

  randomizeAllAppearances: () => set((state) => {
    if (!state.hierarchy?.countries) return {}

    const nextAppearances = { ...state.planetAppearances }
    const presets = PLANET_APPEARANCES.filter(a => a.type === 'preset')
    let changed = false

    const randomizeNodes = (nodes: HierarchyNode[]) => {
      for (const node of nodes) {
        // Only override if not custom
        const current = nextAppearances[node.id]
        if (current !== 'custom') {
          const randomIndex = Math.floor(Math.random() * presets.length)
          nextAppearances[node.id] = presets[randomIndex]?.key || DEFAULT_APPEARANCE_KEY
          changed = true
        }

        if (node.children) {
          randomizeNodes(node.children)
        }
      }
    }

    randomizeNodes(state.hierarchy.countries)

    if (changed) {
      saveAppearances(nextAppearances)
      return { planetAppearances: nextAppearances }
    }
    return {}
  }),
  // ---------------------------
}))

