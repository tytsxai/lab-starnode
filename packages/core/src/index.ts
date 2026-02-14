export type PlanetStage = 'asteroid' | 'dwarf' | 'planet' | 'giant'

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  planetId: string
  updatedAt: string
  isFrozen: boolean
  frozenAt: string | null
}

export interface PlanetViewModel {
  id: string
  name: string
  noteCount: number
  mass: number
  stage: PlanetStage
  radius: number
  color: string
}

export interface PlanetLink {
  sourcePlanetId: string
  targetPlanetId: string
  strength: number
  sharedTags: string[]
}

export interface PlanetConfig {
  id: string
  name: string
  color: string
}

export const PLANET_CONFIGS: PlanetConfig[] = [
  { id: 'p-life', name: '生活星球', color: '#4ecdc4' },
  { id: 'p-tech', name: '技术星球', color: '#7a5cff' }
]

export function resolveStage(noteCount: number): PlanetStage {
  if (noteCount < 10) return 'asteroid'
  if (noteCount < 50) return 'dwarf'
  if (noteCount < 500) return 'planet'
  return 'giant'
}

export function calculatePlanetStats(notes: Note[]): PlanetViewModel[] {
  const grouped = new Map<string, Note[]>()

  for (const note of notes) {
    if (note.isFrozen) continue
    const list = grouped.get(note.planetId) ?? []
    list.push(note)
    grouped.set(note.planetId, list)
  }

  return PLANET_CONFIGS.map((config) => {
    const id = config.id
    const list = grouped.get(id) ?? []
    const noteCount = list.length
    const mass = list.reduce((sum, item) => sum + item.content.length + item.title.length * 2, 0)
    const stage = resolveStage(noteCount)

    return {
      id,
      name: config.name,
      noteCount,
      mass,
      stage,
      radius: Math.max(0.8, Math.min(3.6, 0.8 + Math.log10(mass + 10))),
      color: config.color
    }
  })
}

export function normalizeTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  )
}

export function calculatePlanetLinks(notes: Note[]): PlanetLink[] {
  const planetTagSetMap = new Map<string, Set<string>>()

  for (const note of notes) {
    if (note.isFrozen) continue
    const tagSet = planetTagSetMap.get(note.planetId) ?? new Set<string>()
    for (const tag of note.tags) {
      if (tag.trim()) tagSet.add(tag.trim().toLowerCase())
    }
    planetTagSetMap.set(note.planetId, tagSet)
  }

  const planetIds = Array.from(planetTagSetMap.keys())
  const links: PlanetLink[] = []

  for (let i = 0; i < planetIds.length; i += 1) {
    for (let j = i + 1; j < planetIds.length; j += 1) {
      const sourcePlanetId = planetIds[i]
      const targetPlanetId = planetIds[j]
      const sourceTags = planetTagSetMap.get(sourcePlanetId) ?? new Set<string>()
      const targetTags = planetTagSetMap.get(targetPlanetId) ?? new Set<string>()

      const sharedTags = Array.from(sourceTags).filter((tag) => targetTags.has(tag))
      if (sharedTags.length === 0) continue

      links.push({
        sourcePlanetId,
        targetPlanetId,
        sharedTags: sharedTags.slice(0, 5),
        strength: sharedTags.length
      })
    }
  }

  return links.sort((a, b) => b.strength - a.strength)
}

export function getPlanetOptions(): PlanetConfig[] {
  return PLANET_CONFIGS
}
