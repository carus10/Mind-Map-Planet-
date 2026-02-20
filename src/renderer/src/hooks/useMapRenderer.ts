import { useMemo } from 'react'
import { useMapStore } from '../store/mapStore'
import type { MapItem, HierarchyNode } from '../types/hierarchy'

const ITEM_WIDTH = 160
const ITEM_HEIGHT = 100
const GAP_X = 60
const GAP_Y = 60
const COLS = 5

function layoutNodes(nodes: HierarchyNode[]): MapItem[] {
  return nodes.map((node, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    return {
      node,
      x: col * (ITEM_WIDTH + GAP_X),
      y: row * (ITEM_HEIGHT + GAP_Y),
      width: ITEM_WIDTH,
      height: ITEM_HEIGHT,
      isHovered: false
    }
  })
}

export function useMapRenderer(): MapItem[] {
  const { hierarchy, navigation, hoveredId } = useMapStore((s) => ({
    hierarchy: s.hierarchy,
    navigation: s.navigation,
    hoveredId: s.hoveredId
  }))

  return useMemo(() => {
    if (!hierarchy) return []

    let nodes: HierarchyNode[] = []

    if (navigation.level === 'world') {
      nodes = hierarchy.countries
    } else if (navigation.level === 'country' && navigation.selectedCountry) {
      nodes = navigation.selectedCountry.children
    } else if (navigation.level === 'city' && navigation.selectedCity) {
      nodes = navigation.selectedCity.children
    } else if (navigation.level === 'town' && navigation.selectedTown) {
      nodes = navigation.selectedTown.children
    }

    return layoutNodes(nodes).map((item) => ({
      ...item,
      isHovered: item.node.id === hoveredId
    }))
  }, [hierarchy, navigation, hoveredId])
}
