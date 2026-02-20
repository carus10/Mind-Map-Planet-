export interface HierarchyNode {
  id: string
  name: string
  absolutePath: string
  relativePath: string
  type: 'country' | 'city' | 'town' | 'home'
  children: HierarchyNode[]
  isEmpty: boolean
  color?: string | null
  weight?: number
  preview?: string
  links?: string[]
}

export interface VaultHierarchy {
  vaultPath: string
  vaultName: string
  scannedAt: number
  countries: HierarchyNode[]
}

export interface CameraState {
  x: number
  y: number
  scale: number
}

export interface NavigationState {
  level: 'world' | 'country' | 'city' | 'town'
  selectedCountry: HierarchyNode | null
  selectedCity: HierarchyNode | null
  selectedTown: HierarchyNode | null
}

export interface PersistedState {
  vaultPath: string | null
  camera: CameraState
  navigation: NavigationState
  language: 'en' | 'tr'
}

export interface MapItem {
  node: HierarchyNode
  x: number
  y: number
  width: number
  height: number
  isHovered: boolean
}
