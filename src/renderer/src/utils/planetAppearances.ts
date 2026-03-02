/* ═══════════════════════════════════════════════════════════
   Planet Appearance Definitions
   10 preset celestial bodies + custom image option
   Size ratios are relative (Earth = 1.0)
   ═══════════════════════════════════════════════════════════ */

export interface PlanetAppearance {
    key: string
    name: string
    emoji: string
    sizeRatio: number  // relative to Earth (1.0)
    /** Render type: 'preset' uses SVG gradients, 'custom' uses user image */
    type: 'preset' | 'custom'
    description: string
    /** Primary body color for gradient center */
    colorCenter: string
    /** Edge/dark side color */
    colorEdge: string
    /** Atmospheric glow color */
    glowColor: string
    /** Optional ring for Saturn */
    hasRing?: boolean
    ringColor?: string
    /** Band stripes (Jupiter-like) */
    bands?: string[]
    /** Crater overlay for rocky bodies */
    hasCraters?: boolean
    /** Polar ice cap */
    hasPolarCap?: boolean
    polarCapColor?: string
    /** Surface feature color (continents, patches) */
    featureColor?: string
}

export const PLANET_APPEARANCES: PlanetAppearance[] = [
    {
        key: 'earth',
        name: 'Dünya',
        emoji: '🌍',
        sizeRatio: 1.0,
        type: 'preset',
        description: 'Mavi okyanuslar ve yeşil kıtalar',
        colorCenter: '#1a6fa8',
        colorEdge: '#0a2d4a',
        glowColor: 'rgba(40,140,255,0.35)',
        featureColor: '#2d8a4a',
        hasPolarCap: true,
        polarCapColor: 'rgba(220,240,255,0.85)',
    },
    {
        key: 'mars',
        name: 'Mars',
        emoji: '🔴',
        sizeRatio: 0.8,
        type: 'preset',
        description: 'Kızıl gezegen, toz fırtınaları',
        colorCenter: '#c1440e',
        colorEdge: '#5a1a06',
        glowColor: 'rgba(200,80,40,0.35)',
        featureColor: '#8b3612',
        hasCraters: true,
        hasPolarCap: true,
        polarCapColor: 'rgba(255,240,230,0.8)',
    },
    {
        key: 'moon',
        name: 'Ay',
        emoji: '🌕',
        sizeRatio: 0.65,
        type: 'preset',
        description: 'Gri kraterlü uydu',
        colorCenter: '#b0b0b0',
        colorEdge: '#3a3a3a',
        glowColor: 'rgba(200,200,210,0.25)',
        featureColor: '#7a7a7a',
        hasCraters: true,
    },
    {
        key: 'jupiter',
        name: 'Jüpiter',
        emoji: '🟤',
        sizeRatio: 1.45,
        type: 'preset',
        description: 'Dev gezegen, fırtına bantları',
        colorCenter: '#c88b4a',
        colorEdge: '#5a3010',
        glowColor: 'rgba(200,140,80,0.35)',
        featureColor: '#e8a860',
        bands: ['#c8a070', '#b07040', '#d8b880', '#a06030', '#e0c090', '#906028'],
    },
    {
        key: 'saturn',
        name: 'Satürn',
        emoji: '🪐',
        sizeRatio: 1.35,
        type: 'preset',
        description: 'Halkalı sarı dev',
        colorCenter: '#d4b96a',
        colorEdge: '#6a5020',
        glowColor: 'rgba(220,190,100,0.35)',
        featureColor: '#e8d090',
        bands: ['#dcc070', '#c8a850', '#e8d888', '#b89040', '#f0e0a0'],
        hasRing: true,
        ringColor: 'rgba(210,180,100,0.55)',
    },
    {
        key: 'uranus',
        name: 'Uranüs',
        emoji: '🔵',
        sizeRatio: 1.25,
        type: 'preset',
        description: 'Buz devi, açık mavi',
        colorCenter: '#7de8e8',
        colorEdge: '#1a6868',
        glowColor: 'rgba(100,220,230,0.35)',
        featureColor: '#a0f0f0',
        hasRing: true,
        ringColor: 'rgba(140,230,240,0.25)',
    },
    {
        key: 'neptune',
        name: 'Neptün',
        emoji: '💙',
        sizeRatio: 1.2,
        type: 'preset',
        description: 'Derin mavi buz devi',
        colorCenter: '#2060d8',
        colorEdge: '#08144a',
        glowColor: 'rgba(50,100,255,0.4)',
        featureColor: '#4080f0',
        bands: ['#2060d8', '#1848b0', '#3070e0', '#4080f0', '#1040b0'],
    },
    {
        key: 'venus',
        name: 'Venüs',
        emoji: '☁️',
        sizeRatio: 0.95,
        type: 'preset',
        description: 'Sarı bulut örtüsü',
        colorCenter: '#e8c860',
        colorEdge: '#8a6010',
        glowColor: 'rgba(240,200,80,0.4)',
        featureColor: '#f0d880',
    },
    {
        key: 'mercury',
        name: 'Merkür',
        emoji: '⚫',
        sizeRatio: 0.6,
        type: 'preset',
        description: 'Küçük metalik kaya',
        colorCenter: '#909090',
        colorEdge: '#282828',
        glowColor: 'rgba(150,150,160,0.2)',
        featureColor: '#606060',
        hasCraters: true,
    },
    {
        key: 'pluto',
        name: 'Plüton',
        emoji: '❄️',
        sizeRatio: 0.55,
        type: 'preset',
        description: 'Cüce gezegen, buz dünyası',
        colorCenter: '#b8d0e8',
        colorEdge: '#304858',
        glowColor: 'rgba(160,200,240,0.25)',
        featureColor: '#8ab0d0',
        hasPolarCap: true,
        polarCapColor: 'rgba(240,248,255,0.9)',
        hasCraters: true,
    },
]

export const DEFAULT_APPEARANCE_KEY = 'earth'

export function getAppearance(key: string): PlanetAppearance {
    if (key === 'custom') {
        return {
            key: 'custom',
            name: 'Özel Görsel',
            emoji: '🖼️',
            sizeRatio: 1.0,
            type: 'custom',
            description: 'Kendi görselinizi seçin',
            colorCenter: '#666',
            colorEdge: '#222',
            glowColor: 'rgba(200,200,200,0.3)',
        }
    }
    return PLANET_APPEARANCES.find(a => a.key === key) ?? PLANET_APPEARANCES[0]
}
