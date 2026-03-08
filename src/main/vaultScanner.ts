import { readdirSync, statSync, openSync, readSync, closeSync } from 'fs'
import { join, relative, extname, basename } from 'path'
import type { HierarchyNode, VaultHierarchy, ResolvedLink } from '../renderer/src/types/hierarchy'

const HIDDEN_PATTERN = /^\./

// Tag to color map for fallback styling
const TAG_COLORS: Record<string, string> = {
  '#red': '#f44336',
  '#blue': '#2196f3',
  '#green': '#4caf50',
  '#yellow': '#ffeb3b',
  '#purple': '#9c27b0',
  '#orange': '#ff9800',
  '#pink': '#e91e63',
  '#important': '#d32f2f',
  '#todo': '#ffb300'
}

function extractFirstLines(text: string, count: number): string {
  // Remove frontmatter blocks entirely
  const noFrontmatter = text.replace(/^---\n[\s\S]*?\n---\n/, '')
  const lines = noFrontmatter.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  return lines.slice(0, count).join(' ').slice(0, 150)
}

function parseRawLink(raw: string): { normalizedTarget: string } {
  let target = raw.split('|')[0] // remove alias
  target = target.split('#')[0] // remove heading
  target = target.trim()
  if (target.toLowerCase().endsWith('.md')) {
    target = target.slice(0, -3)
  }
  target = target.replace(/\\/g, '/')
  return { normalizedTarget: target }
}

function parseMarkdownNode(fullPath: string, stat: any, relPath: string, entry: string): HierarchyNode {
  let color: string | null = null
  let preview = ''
  let links: ResolvedLink[] = []

  // Weight representation (file size in bytes, ensure at least 500 for visibility)
  const weight = Math.max(500, stat.size)

  try {
    const fd = openSync(fullPath, 'r')
    const buffer = Buffer.alloc(4096)
    const bytesRead = readSync(fd, buffer, 0, 4096, 0)
    closeSync(fd)

    if (bytesRead > 0) {
      const content = buffer.toString('utf8', 0, bytesRead)

      // 1. Parse Color from YAML: color: "#xyz" or color: red
      const colorMatch = content.match(/^color:\s*['"]?([^'"\n]+)['"]?/m)
      if (colorMatch) {
        color = colorMatch[1].trim()
      }

      // 2. Parse Tags for Color fallback
      if (!color) {
        const tagMatch = content.match(/#[a-zA-Z0-9_-]+/g)
        if (tagMatch) {
          for (const tag of tagMatch) {
            const lowerTag = tag.toLowerCase()
            if (TAG_COLORS[lowerTag]) {
              color = TAG_COLORS[lowerTag]
              break
            }
          }
        }
      }

      // 3. Extract Preview Text
      preview = extractFirstLines(content, 3)

      // 4. Extract Links
      const linkRegex = /\[\[(.*?)\]\]/g
      let match
      while ((match = linkRegex.exec(content)) !== null) {
        const raw = match[1].trim()
        if (raw) {
          const { normalizedTarget } = parseRawLink(raw)
          if (normalizedTarget) {
            links.push({
              raw,
              normalizedTarget,
              resolvedId: null,
              resolvedPath: null,
              isBroken: true,
              isAmbiguous: false,
              matchMode: 'unresolved'
            })
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse markdown node:', fullPath, err)
  }

  return {
    id: relPath,
    name: basename(entry, '.md'),
    absolutePath: fullPath,
    relativePath: relPath,
    type: 'home',
    children: [],
    isEmpty: stat.size === 0,
    weight,
    color,
    preview,
    links
  }
}

function isHidden(name: string): boolean {
  return HIDDEN_PATTERN.test(name)
}

function scanDirectory(
  dirPath: string,
  vaultPath: string,
  depth: number
): HierarchyNode[] {
  let entries: string[]
  try {
    entries = readdirSync(dirPath)
  } catch {
    return []
  }

  const nodes: HierarchyNode[] = []

  for (const entry of entries) {
    if (isHidden(entry)) continue

    const fullPath = join(dirPath, entry)
    let stat
    try {
      stat = statSync(fullPath)
    } catch {
      continue
    }

    const relPath = relative(vaultPath, fullPath).replace(/\\/g, '/')

    if (stat.isDirectory()) {
      // depth 1=country, 2=city, 3=town, daha derin klasörler yok sayılır
      if (depth > 3) continue
      const type = depth === 1 ? 'country' : depth === 2 ? 'city' : 'town'
      const children = scanDirectory(fullPath, vaultPath, depth + 1)

      const dirWeight = children.reduce((sum, child) => sum + (child.weight || 0), 0)

      nodes.push({
        id: relPath,
        name: entry,
        absolutePath: fullPath,
        relativePath: relPath,
        type,
        children,
        isEmpty: children.length === 0,
        weight: Math.max(1000, dirWeight), // Folders have a minimum baseline weight
        links: [] // will be aggregated after resolution
      })
    } else if (extname(entry).toLowerCase() === '.md') {
      // .md dosyaları her seviyede home olarak göster
      nodes.push(parseMarkdownNode(fullPath, stat, relPath, entry))
    }
  }

  return nodes
}

function resolveLinks(hierarchy: VaultHierarchy) {
  // 1. Build indexes
  const byPath = new Map<string, HierarchyNode>() // Lowercase normalized path
  const byBasename = new Map<string, HierarchyNode[]>() // Lowercase basename -> nodes

  function indexNode(node: HierarchyNode) {
    const normPath = node.relativePath.toLowerCase().replace(/\\/g, '/').replace(/\.md$/, '')
    byPath.set(normPath, node)

    const normBasename = node.name.toLowerCase().replace(/\.md$/, '')
    const arr = byBasename.get(normBasename) || []
    arr.push(node)
    byBasename.set(normBasename, arr)

    if (node.children) {
      node.children.forEach(indexNode)
    }
  }
  hierarchy.countries.forEach(indexNode)

  // 2. Resolve links for 'home' nodes (markdown files)
  function resolveNodeLinks(node: HierarchyNode) {
    if (node.type === 'home' && node.links) {
      for (const link of node.links) {
        const target = link.normalizedTarget.toLowerCase()

        // Exact relative path match
        if (byPath.has(target)) {
          const match = byPath.get(target)!
          link.resolvedId = match.id
          link.resolvedPath = match.relativePath
          link.isBroken = false
          link.isAmbiguous = false
          link.matchMode = 'exact-path'
          continue
        }

        // Basename match (or partial path matching if duplicate)
        const targetBasename = basename(target)
        const basenameMatches = byBasename.get(targetBasename)

        if (basenameMatches && basenameMatches.length > 0) {
          if (basenameMatches.length === 1) {
            const match = basenameMatches[0]
            link.resolvedId = match.id
            link.resolvedPath = match.relativePath
            link.isBroken = false
            link.isAmbiguous = false
            link.matchMode = 'basename'
          } else {
            // Ambiguous: check if any ends with the exact specified target string
            const exactEndingMatches = basenameMatches.filter(n =>
              n.relativePath.toLowerCase().replace(/\\/g, '/').replace(/\.md$/, '').endsWith(target)
            )

            if (exactEndingMatches.length === 1) {
              const match = exactEndingMatches[0]
              link.resolvedId = match.id
              link.resolvedPath = match.relativePath
              link.isBroken = false
              link.isAmbiguous = false
              link.matchMode = 'relative-path'
            } else {
              // Mark ambiguous and DO NOT resolve the link targets to prevent false jumps
              link.resolvedId = null
              link.resolvedPath = null
              link.isBroken = false
              link.isAmbiguous = true
              link.matchMode = 'basename'
            }
          }
          continue
        }

        // Unresolved / Broken
        link.isBroken = true
        link.isAmbiguous = false
        link.matchMode = 'unresolved'
      }
    }

    if (node.children) {
      node.children.forEach(resolveNodeLinks)
    }
  }
  hierarchy.countries.forEach(resolveNodeLinks)

  // 3. Aggregate folder links (from children)
  function aggregateFolderLinks(node: HierarchyNode) {
    if (node.children && node.children.length > 0) {
      node.children.forEach(aggregateFolderLinks)
      if (node.type !== 'home') {
        const allLinks: ResolvedLink[] = []
        const linkKeys = new Set<string>()

        node.children.forEach(child => {
          if (child.links) {
            child.links.forEach((l) => {
              const key = l.resolvedId ? `id:${l.resolvedId}` : `raw:${l.normalizedTarget}`
              if (!linkKeys.has(key)) {
                linkKeys.add(key)
                allLinks.push({ ...l })
              }
            })
          }
        })
        node.links = allLinks
      }
    }
  }
  hierarchy.countries.forEach(aggregateFolderLinks)
}

export function scanVault(vaultPath: string): VaultHierarchy {
  const countries = scanDirectory(vaultPath, vaultPath, 1)
  const hierarchy: VaultHierarchy = {
    vaultPath,
    vaultName: basename(vaultPath),
    scannedAt: Date.now(),
    countries
  }
  resolveLinks(hierarchy)
  return hierarchy
}

// Final verification commit for note link resolution.
