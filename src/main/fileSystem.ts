import { renameSync, writeFileSync, mkdirSync, rmSync, unlinkSync, statSync } from 'fs'
import { join, dirname, basename } from 'path'

export interface RenameResult {
  success: boolean
  error?: string
}

export function renameNode(oldPath: string, newName: string): RenameResult {
  try {
    const newPath = join(dirname(oldPath), newName)
    renameSync(oldPath, newPath)
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

export function createNote(folderPath: string, noteName: string): RenameResult {
  try {
    const filename = noteName.endsWith('.md') ? noteName : `${noteName}.md`
    const newPath = join(folderPath, filename)
    writeFileSync(newPath, '', 'utf-8')
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

export function moveNode(sourcePath: string, targetFolderPath: string): RenameResult {
  try {
    const filename = basename(sourcePath)
    const newPath = join(targetFolderPath, filename)
    renameSync(sourcePath, newPath)
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

export function createFolder(parentPath: string, folderName: string): RenameResult {
  try {
    const newPath = join(parentPath, folderName)
    mkdirSync(newPath, { recursive: false })
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

export function deleteNode(targetPath: string): RenameResult {
  try {
    const stat = statSync(targetPath)
    if (stat.isDirectory()) {
      rmSync(targetPath, { recursive: true, force: true })
    } else {
      unlinkSync(targetPath)
    }
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}
