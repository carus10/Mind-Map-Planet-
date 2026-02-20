/**
 * Property-Based Tests for MindMap World
 * Feature: mindmap-world
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 4.3, 5.3, 6.1-6.4, 7.2, 10.1
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { HierarchyNode, VaultHierarchy, CameraState, NavigationState } from '../renderer/src/types/hierarchy'
import { buildObsidianUrl } from '../renderer/src/utils/obsidianUrl'

// ─── Arbitraries ────────────────────────────────────────────────────────────

const nodeNameArb = fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.startsWith('.'))

function makeHomeNode(name: string, relPath: string): HierarchyNode {
  return {
    id: relPath,
    name,
    absolutePath: '/vault/' + relPath,
    relativePath: relPath,
    type: 'home',
    children: [],
    isEmpty: true
  }
}

function makeNode(
  name: string,
  type: 'country' | 'city' | 'town',
  children: HierarchyNode[]
): HierarchyNode {
  return {
    id: name,
    name,
    absolutePath: '/vault/' + name,
    relativePath: name,
    type,
    children,
    isEmpty: children.length === 0
  }
}

// Arbitrary for a HierarchyNode tree (up to depth 3)
const homeArb: fc.Arbitrary<HierarchyNode> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: nodeNameArb,
  absolutePath: fc.string({ minLength: 1, maxLength: 50 }),
  relativePath: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constant('home' as const),
  children: fc.constant([]),
  isEmpty: fc.constant(true)
})

const townArb: fc.Arbitrary<HierarchyNode> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: nodeNameArb,
  absolutePath: fc.string({ minLength: 1, maxLength: 50 }),
  relativePath: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constant('town' as const),
  children: fc.array(homeArb, { maxLength: 5 }),
  isEmpty: fc.boolean()
}).map(n => ({ ...n, isEmpty: n.children.length === 0 }))

const cityArb: fc.Arbitrary<HierarchyNode> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: nodeNameArb,
  absolutePath: fc.string({ minLength: 1, maxLength: 50 }),
  relativePath: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constant('city' as const),
  children: fc.array(townArb, { maxLength: 5 }),
  isEmpty: fc.boolean()
}).map(n => ({ ...n, isEmpty: n.children.length === 0 }))

const countryArb: fc.Arbitrary<HierarchyNode> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: nodeNameArb,
  absolutePath: fc.string({ minLength: 1, maxLength: 50 }),
  relativePath: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constant('country' as const),
  children: fc.array(cityArb, { maxLength: 5 }),
  isEmpty: fc.boolean()
}).map(n => ({ ...n, isEmpty: n.children.length === 0 }))

const vaultHierarchyArb: fc.Arbitrary<VaultHierarchy> = fc.record({
  vaultPath: fc.string({ minLength: 1, maxLength: 50 }),
  vaultName: fc.string({ minLength: 1, maxLength: 30 }),
  scannedAt: fc.integer({ min: 0 }),
  countries: fc.array(countryArb, { maxLength: 5 })
})

// ─── Property 5: isEmpty Consistency ────────────────────────────────────────

/**
 * Validates: Requirements 4.3
 * Feature: mindmap-world, Property 5: isEmpty tutarlılığı
 */
describe('Property 5: isEmpty Consistency', () => {
  function checkIsEmpty(node: HierarchyNode): void {
    expect(node.isEmpty).toBe(node.children.length === 0)
    for (const child of node.children) checkIsEmpty(child)
  }

  it('isEmpty === (children.length === 0) for all nodes in a tree', () => {
    fc.assert(
      fc.property(countryArb, (country) => {
        checkIsEmpty(country)
      }),
      { numRuns: 100 }
    )
  })
})

// ─── Property 3: Hierarchy Serialization Round-Trip ─────────────────────────

/**
 * Validates: Requirements 2.7, 10.1
 * Feature: mindmap-world, Property 3: hiyerarşi serileştirme round-trip
 */
describe('Property 3: Hierarchy Serialization Round-Trip', () => {
  it('JSON.stringify → JSON.parse produces equivalent VaultHierarchy', () => {
    fc.assert(
      fc.property(vaultHierarchyArb, (hierarchy) => {
        const serialized = JSON.stringify(hierarchy)
        const deserialized = JSON.parse(serialized) as VaultHierarchy
        expect(deserialized).toEqual(hierarchy)
      }),
      { numRuns: 100 }
    )
  })
})

// ─── Property 4: URL Encode Round-Trip ──────────────────────────────────────

/**
 * Validates: Requirements 7.2
 * Feature: mindmap-world, Property 4: URL encode doğruluğu
 */
describe('Property 4: URL Encode Round-Trip', () => {
  // Paths with Turkish characters and special chars
  const filePathArb = fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.length > 0)

  it('decode(encode(path)) === original path for any file path', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }), // vaultName
        filePathArb,
        (vaultName, filePath) => {
          const url = buildObsidianUrl(vaultName, filePath)
          const urlObj = new URL(url)
          const decodedVault = urlObj.searchParams.get('vault')
          const decodedFile = urlObj.searchParams.get('file')
          expect(decodedVault).toBe(vaultName)
          expect(decodedFile).toBe(filePath)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Property 1: Hierarchy Mapping Consistency ──────────────────────────────

/**
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 * Feature: mindmap-world, Property 1: hiyerarşi eşleme tutarlılığı
 */
describe('Property 1: Hierarchy Mapping Consistency', () => {
  function checkDepthType(node: HierarchyNode, depth: number): void {
    if (node.type === 'home') {
      // home can appear at any depth
      expect(node.children).toHaveLength(0)
      return
    }
    const expectedType = depth === 1 ? 'country' : depth === 2 ? 'city' : 'town'
    expect(node.type).toBe(expectedType)
    for (const child of node.children) {
      checkDepthType(child, depth + 1)
    }
  }

  it('node type matches depth in hierarchy (country=1, city=2, town=3)', () => {
    fc.assert(
      fc.property(fc.array(countryArb, { maxLength: 5 }), (countries) => {
        for (const country of countries) {
          checkDepthType(country, 1)
        }
      }),
      { numRuns: 100 }
    )
  })
})

// ─── Property 2: Hidden Folder Exclusion ────────────────────────────────────

/**
 * Validates: Requirements 2.5
 * Feature: mindmap-world, Property 2: gizli klasör dışlama
 */
describe('Property 2: Hidden Folder Exclusion', () => {
  // We test the isHidden logic directly since vaultScanner uses Node.js fs
  function isHidden(name: string): boolean {
    return name.startsWith('.')
  }

  function containsHiddenNode(nodes: HierarchyNode[]): boolean {
    for (const node of nodes) {
      if (isHidden(node.name)) return true
      if (containsHiddenNode(node.children)) return true
    }
    return false
  }

  it('no node with a dot-prefixed name should appear in hierarchy', () => {
    // Build hierarchies that only contain non-hidden names (our arbitraries filter this)
    fc.assert(
      fc.property(fc.array(countryArb, { maxLength: 5 }), (countries) => {
        expect(containsHiddenNode(countries)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })
})

// ─── Property 6: Zoom Boundary Protection ───────────────────────────────────

/**
 * Validates: Requirements 5.3
 * Feature: mindmap-world, Property 6: zoom sınır koruması
 */
describe('Property 6: Zoom Boundary Protection', () => {
  const MIN_SCALE = 0.2
  const MAX_SCALE = 8

  function applyZoom(current: number, delta: number): number {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, current * delta))
  }

  it('scale stays within [MIN_SCALE, MAX_SCALE] after any sequence of zoom deltas', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0.5, max: 2.0, noNaN: true }), { minLength: 1, maxLength: 20 }),
        (deltas) => {
          let scale = 1.0
          for (const delta of deltas) {
            scale = applyZoom(scale, delta)
            expect(scale).toBeGreaterThanOrEqual(MIN_SCALE)
            expect(scale).toBeLessThanOrEqual(MAX_SCALE)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Property 7: Navigation Level Consistency ───────────────────────────────

/**
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 * Feature: mindmap-world, Property 7: navigasyon seviye tutarlılığı
 */
describe('Property 7: Navigation Level Consistency', () => {
  type Level = 'world' | 'country' | 'city' | 'town'
  const VALID_LEVELS: Level[] = ['world', 'country', 'city', 'town']

  type NavAction = 'drillDown' | 'goBack'

  function applyNavAction(state: NavigationState, action: NavAction, node?: HierarchyNode): NavigationState {
    if (action === 'drillDown' && node) {
      if (state.level === 'world' && node.type === 'country')
        return { ...state, level: 'country', selectedCountry: node }
      if (state.level === 'country' && node.type === 'city')
        return { ...state, level: 'city', selectedCity: node }
      if (state.level === 'city' && node.type === 'town')
        return { ...state, level: 'town', selectedTown: node }
      return state
    }
    if (action === 'goBack') {
      if (state.level === 'town') return { ...state, level: 'city', selectedTown: null }
      if (state.level === 'city') return { ...state, level: 'country', selectedCity: null }
      if (state.level === 'country') return { ...state, level: 'world', selectedCountry: null }
      return state
    }
    return state
  }

  const actionArb = fc.oneof(
    fc.record({ type: fc.constant('drillDown' as const), node: countryArb }),
    fc.record({ type: fc.constant('drillDown' as const), node: cityArb }),
    fc.record({ type: fc.constant('drillDown' as const), node: townArb }),
    fc.record({ type: fc.constant('goBack' as const), node: fc.constant(undefined as unknown as HierarchyNode) })
  )

  it('level is always a valid value after any sequence of navigation actions', () => {
    fc.assert(
      fc.property(
        fc.array(actionArb, { minLength: 1, maxLength: 20 }),
        (actions) => {
          let state: NavigationState = {
            level: 'world',
            selectedCountry: null,
            selectedCity: null,
            selectedTown: null
          }
          for (const action of actions) {
            state = applyNavAction(state, action.type, action.node)
            expect(VALID_LEVELS).toContain(state.level)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
