import { create } from 'zustand'
import type { VaultHierarchy, NavigationState, CameraState, HierarchyNode } from '../types/hierarchy'
import type { Language } from '../i18n/translations'

const MIN_SCALE = 0.2
const MAX_SCALE = 8

interface MapStore {
  hierarchy: VaultHierarchy | null
  navigation: NavigationState
  camera: CameraState
  language: Language
  hoveredId: string | null
  renameTarget: HierarchyNode | null
  error: string | null

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
  setError: (msg: string | null) => void

  // --- Drag & Drop (Cargo Hold) ---
  stashedNodes: HierarchyNode[]
  activeDraggedNode: HierarchyNode | null
  setActiveDraggedNode: (node: HierarchyNode | null) => void
  stashNode: (node: HierarchyNode) => void
  unstashNode: (nodeId: string) => void
  clearStash: () => void
  // --------------------------------
}

export const useMapStore = create<MapStore>((set) => ({
  hierarchy: null,
  navigation: { level: 'world', selectedCountry: null, selectedCity: null, selectedTown: null },
  camera: { x: 0, y: 0, scale: 1 },
  language: 'en',
  hoveredId: null,
  renameTarget: null,
  error: null,

  // Voronoi navigasyon — klasör yolu stack'i
  voronoiPath: [],
  stashedNodes: [],
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
    if (!state.hierarchy || state.hierarchy.vaultName !== h.vaultName) {
      // Farklı vault yüklendiyse state sıfırlanır
      return { hierarchy: h, voronoiPath: [] }
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

    return { hierarchy: h, voronoiPath: newPath }
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
  setError: (msg) => set({ error: msg }),

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
  clearStash: () => set({ stashedNodes: [] })
}))

