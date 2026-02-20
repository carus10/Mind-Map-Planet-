import { readdirSync, statSync, openSync, readSync, closeSync } from 'fs'
import { join, relative, extname, basename } from 'path'
import type { HierarchyNode, VaultHierarchy } from '../renderer/src/types/hierarchy'

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

function parseMarkdownNode(fullPath: string, stat: any, relPath: string, entry: string): HierarchyNode {
  let color: string | null = null
  let preview = ''
  let links: string[] = []

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

      // 4. Extract Links: [[target|display]] -> target
      const linkRegex = /\[\[(.*?)\]\]/g
      let match
      while ((match = linkRegex.exec(content)) !== null) {
        let linkTarget = match[1].split('|')[0].trim()
        if (linkTarget) {
          // Normalize link paths (obsidian allows just the filename)
          links.push(linkTarget)
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

      const dirLinks: string[] = []
      for (const child of children) {
        if (child.links) {
          dirLinks.push(...child.links)
        }
      }
      // Deduplicate links for the folder
      const uniqueLinks = Array.from(new Set(dirLinks))

      nodes.push({
        id: relPath,
        name: entry,
        absolutePath: fullPath,
        relativePath: relPath,
        type,
        children,
        isEmpty: children.length === 0,
        weight: Math.max(1000, dirWeight), // Folders have a minimum baseline weight
        links: uniqueLinks
      })
    } else if (extname(entry).toLowerCase() === '.md') {
      // .md dosyaları her seviyede home olarak göster
      nodes.push(parseMarkdownNode(fullPath, stat, relPath, entry))
    }
  }

  return nodes
}

export function scanVault(vaultPath: string): VaultHierarchy {
  const countries = scanDirectory(vaultPath, vaultPath, 1)
  return {
    vaultPath,
    vaultName: basename(vaultPath),
    scannedAt: Date.now(),
    countries
  }
}
