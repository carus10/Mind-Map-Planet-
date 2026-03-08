/* ────────────────────────────────────────────
   Learn Engine – Persistent storage helpers
   Uses electron-store via IPC (store:get / store:set)
   ──────────────────────────────────────────── */

import type { LearnEngineData, LearnEngineStats } from '../types/learn'

const STORE_PREFIX = 'learn-engine:'

/** Build the store key for a given note path */
function storeKey(notePath: string): string {
    return `${STORE_PREFIX}${notePath}`
}

/** Create empty data for a note */
export function emptyLearnData(noteId: string, notePath: string): LearnEngineData {
    return {
        noteId,
        notePath,
        updatedAt: Date.now(),
        stats: { totalItems: 0, completedSessions: 0 },
        clozeItems: [],
        imageOcclusionItems: [],
        conceptMatchItems: [],
        quizItems: [],
        outputPredictionItems: [],
        apiRecallItems: [],
        realProblemItems: [],
    }
}

/** Recompute stats based on item arrays */
export function recomputeStats(data: LearnEngineData): LearnEngineStats {
    const totalItems =
        data.clozeItems.length +
        data.imageOcclusionItems.length +
        data.conceptMatchItems.length +
        data.quizItems.length +
        data.outputPredictionItems.length +
        data.apiRecallItems.length +
        data.realProblemItems.length

    return {
        ...data.stats,
        totalItems,
    }
}

/** Load learn data for a note from electron-store */
export async function loadLearnData(noteId: string, notePath: string): Promise<LearnEngineData> {
    try {
        const raw = await window.api.storeGet(storeKey(notePath))
        if (raw && typeof raw === 'object') {
            const parsed = raw as LearnEngineData
            // Ensure all arrays exist (migration safety)
            return {
                noteId: parsed.noteId ?? noteId,
                notePath: parsed.notePath ?? notePath,
                updatedAt: parsed.updatedAt ?? Date.now(),
                stats: parsed.stats ?? { totalItems: 0, completedSessions: 0 },
                clozeItems: parsed.clozeItems ?? [],
                imageOcclusionItems: parsed.imageOcclusionItems ?? [],
                conceptMatchItems: parsed.conceptMatchItems ?? [],
                quizItems: parsed.quizItems ?? [],
                outputPredictionItems: parsed.outputPredictionItems ?? [],
                apiRecallItems: parsed.apiRecallItems ?? [],
                realProblemItems: parsed.realProblemItems ?? [],
            }
        }
    } catch {
        // Fall through to empty data
    }
    return emptyLearnData(noteId, notePath)
}

/** Save learn data for a note to electron-store */
export async function saveLearnData(data: LearnEngineData): Promise<void> {
    const updated: LearnEngineData = {
        ...data,
        updatedAt: Date.now(),
        stats: recomputeStats(data),
    }
    await window.api.storeSet(storeKey(data.notePath), updated)
}

/** Generate a unique id for items */
export function generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
