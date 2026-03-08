/* ────────────────────────────────────────────
   Learn Engine – Data types
   ──────────────────────────────────────────── */

/** Cloze deletion flashcard */
export interface ClozeItem {
    id: string
    sourceText: string
    hiddenText: string
    renderedPrompt: string
    answer: string
    hint?: string
    tags: string[]
    createdAt: number
}

/** Image occlusion mask */
export interface OcclusionMask {
    id: string
    x: number
    y: number
    width: number
    height: number
    answerLabel?: string
}

/** Image occlusion card */
export interface ImageOcclusionItem {
    id: string
    imageDataUrl: string
    masks: OcclusionMask[]
    title: string
    createdAt: number
}

/** Concept match pair */
export interface ConceptMatchPair {
    left: string
    right: string
}

/** Concept match game set */
export interface ConceptMatchItem {
    id: string
    title: string
    pairs: ConceptMatchPair[]
    createdAt: number
}

/** Quiz card */
export interface QuizItem {
    id: string
    question: string
    options: string[]
    correctIndex: number
    explanation?: string
    createdAt: number
}

/** Output prediction card */
export interface OutputPredictionItem {
    id: string
    language: string
    code: string
    expectedOutput: string
    explanation?: string
    createdAt: number
}

/** API recall card */
export interface ApiRecallItem {
    id: string
    apiName: string
    signature?: string
    usageDescription: string
    example?: string
    returnInfo?: string
    createdAt: number
}

/** Real problem card */
export interface RealProblemItem {
    id: string
    title: string
    problemStatement: string
    hints: string[]
    expectedApproach: string
    solutionNotes?: string
    difficulty?: 'easy' | 'medium' | 'hard'
    createdAt: number
}

/** Aggregate stats kept with each note */
export interface LearnEngineStats {
    totalItems: number
    completedSessions: number
    lastStudiedAt?: number
}

/** Root data structure for one note */
export interface LearnEngineData {
    noteId: string
    notePath: string
    updatedAt: number
    stats: LearnEngineStats
    clozeItems: ClozeItem[]
    imageOcclusionItems: ImageOcclusionItem[]
    conceptMatchItems: ConceptMatchItem[]
    quizItems: QuizItem[]
    outputPredictionItems: OutputPredictionItem[]
    apiRecallItems: ApiRecallItem[]
    realProblemItems: RealProblemItem[]
}

/** Available learning modes */
export type LearnMode =
    | 'overview'
    | 'cloze'
    | 'imageOcclusion'
    | 'conceptMatch'
    | 'quiz'
    | 'outputPrediction'
    | 'apiRecall'
    | 'realProblem'
