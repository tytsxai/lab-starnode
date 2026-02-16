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

export interface ScoreBreakdown {
  tagScore: number
  keywordScore: number
  total: number
}

export interface PlanetLink {
  sourcePlanetId: string
  targetPlanetId: string
  strength: number
  sharedTags: string[]
  sharedKeywords: string[]
  keywordStrength: number
  evidenceTags: string[]
  evidenceKeywords: string[]
  scoreBreakdown: ScoreBreakdown
}

export interface PlanetConfig {
  id: string
  name: string
  color: string
}

export interface LinkCalculationOptions {
  includeFrozen?: boolean
  tagWeight?: number
  keywordWeight?: number
  maxEvidenceCount?: number
}

export interface PlanetStatsOptions {
  includeFrozen?: boolean
}

const DEFAULT_TAG_WEIGHT = 2
const DEFAULT_KEYWORD_WEIGHT = 1
const DEFAULT_EVIDENCE_COUNT = 5
const MIN_KEYWORD_LENGTH = 2
const MAX_KEYWORDS_PER_NOTE = 12
const linkCacheByNotesRef = new WeakMap<Note[], Map<string, PlanetLink[]>>()

const STOPWORDS = new Set<string>([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'how',
  'in',
  'into',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'were',
  'will',
  'with',
  'i',
  'you',
  'he',
  'she',
  'they',
  'we',
  '我',
  '我们',
  '你',
  '你们',
  '他',
  '她',
  '它',
  '以及',
  '并且',
  '如果',
  '因为',
  '所以',
  '但是',
  '然后',
  '这个',
  '那个',
  '一个',
  '一些',
  '没有',
  '可以',
  '需要',
  '已经',
  '还是',
  '就是',
  '还有',
  '进行',
  '通过',
  '关于'
])

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

function shouldIncludeNote(note: Note, includeFrozen: boolean): boolean {
  if (includeFrozen) return true
  return !note.isFrozen
}

function toTimestamp(value: string): number {
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function compareLexicographically(a: string, b: string): number {
  if (a === b) return 0
  return a > b ? 1 : -1
}

function stablePairKey(sourcePlanetId: string, targetPlanetId: string): string {
  return `${sourcePlanetId}|${targetPlanetId}`
}

function resolveLinkOptions(options: LinkCalculationOptions) {
  return {
    includeFrozen: options.includeFrozen ?? false,
    tagWeight: options.tagWeight ?? DEFAULT_TAG_WEIGHT,
    keywordWeight: options.keywordWeight ?? DEFAULT_KEYWORD_WEIGHT,
    maxEvidenceCount: options.maxEvidenceCount ?? DEFAULT_EVIDENCE_COUNT
  }
}

function buildLinkCacheKey(options: ReturnType<typeof resolveLinkOptions>): string {
  return `${options.includeFrozen ? 1 : 0}|${options.tagWeight}|${options.keywordWeight}|${options.maxEvidenceCount}`
}

interface UniverseSnapshot {
  planets: PlanetViewModel[]
  links: PlanetLink[]
}

const universeSnapshotCache = new WeakMap<Note[], UniverseSnapshot>()

export function calculatePlanetStats(notes: Note[], options: PlanetStatsOptions = {}): PlanetViewModel[] {
  const includeFrozen = options.includeFrozen ?? false
  const grouped = new Map<string, Note[]>()

  for (const note of notes) {
    if (!shouldIncludeNote(note, includeFrozen)) continue
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

export function tokenizeText(input: string): string[] {
  const cleaned = input.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ')
  return cleaned
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => {
      const hasCjk = /[\p{Script=Han}]/u.test(token)
      if (hasCjk) return token.length >= 1
      return token.length >= MIN_KEYWORD_LENGTH
    })
    .filter((token) => !STOPWORDS.has(token))
}

export function extractKeywordMap(input: string): Map<string, number> {
  const frequencies = new Map<string, number>()
  const tokens = tokenizeText(input)

  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1)
  }

  return frequencies
}

export function getTopKeywordsFromNote(note: Pick<Note, 'title' | 'content'>, topK = 8): string[] {
  const keywordMap = extractKeywordMap(`${note.title} ${note.content}`)

  return Array.from(keywordMap.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return compareLexicographically(a[0], b[0])
    })
    .slice(0, topK)
    .map(([keyword]) => keyword)
}

interface PlanetKeywordAggregate {
  tagSet: Set<string>
  keywordFrequency: Map<string, number>
  latestUpdatedAt: number
}

export function calculatePlanetLinks(notes: Note[], options: LinkCalculationOptions = {}): PlanetLink[] {
  const resolvedOptions = resolveLinkOptions(options)
  const cacheKey = buildLinkCacheKey(resolvedOptions)
  const cacheForNotes = linkCacheByNotesRef.get(notes)
  const cached = cacheForNotes?.get(cacheKey)
  if (cached) return cached

  const { includeFrozen, tagWeight, keywordWeight, maxEvidenceCount } = resolvedOptions

  const planetAggregateMap = new Map<string, PlanetKeywordAggregate>()

  for (const note of notes) {
    if (!shouldIncludeNote(note, includeFrozen)) continue

    const aggregate =
      planetAggregateMap.get(note.planetId) ??
      {
        tagSet: new Set<string>(),
        keywordFrequency: new Map<string, number>(),
        latestUpdatedAt: 0
      }

    for (const tag of note.tags) {
      const normalized = tag.trim().toLowerCase()
      if (normalized) aggregate.tagSet.add(normalized)
    }

    const noteKeywords = extractKeywordMap(`${note.title} ${note.content}`)
    const topKeywords = Array.from(noteKeywords.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]
        return compareLexicographically(a[0], b[0])
      })
      .slice(0, MAX_KEYWORDS_PER_NOTE)

    for (const [keyword, count] of topKeywords) {
      aggregate.keywordFrequency.set(keyword, (aggregate.keywordFrequency.get(keyword) ?? 0) + count)
    }

    aggregate.latestUpdatedAt = Math.max(aggregate.latestUpdatedAt, toTimestamp(note.updatedAt))
    planetAggregateMap.set(note.planetId, aggregate)
  }

  // 统一按字典序固定星球对方向，避免因笔记输入顺序变化导致 source/target 抖动。
  const planetIds = Array.from(planetAggregateMap.keys()).sort(compareLexicographically)
  const links: Array<PlanetLink & { latestUpdatedAt: number; pairKey: string }> = []

  for (let i = 0; i < planetIds.length; i += 1) {
    for (let j = i + 1; j < planetIds.length; j += 1) {
      const sourcePlanetId = planetIds[i]
      const targetPlanetId = planetIds[j]
      const source = planetAggregateMap.get(sourcePlanetId)
      const target = planetAggregateMap.get(targetPlanetId)
      if (!source || !target) continue

      const sharedTags = Array.from(source.tagSet).filter((tag) => target.tagSet.has(tag))
      sharedTags.sort(compareLexicographically)

      const sharedKeywordEntries: Array<[keyword: string, score: number]> = []
      for (const [keyword, sourceCount] of source.keywordFrequency) {
        const targetCount = target.keywordFrequency.get(keyword)
        if (!targetCount) continue
        sharedKeywordEntries.push([keyword, Math.min(sourceCount, targetCount)])
      }

      sharedKeywordEntries.sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]
        return compareLexicographically(a[0], b[0])
      })

      const sharedKeywords = sharedKeywordEntries.map(([keyword]) => keyword)
      const tagStrength = sharedTags.length
      const keywordStrength = sharedKeywords.length
      if (tagStrength === 0 && keywordStrength === 0) continue

      const tagScore = tagStrength * tagWeight
      const keywordScore = keywordStrength * keywordWeight
      const total = tagScore + keywordScore

      links.push({
        sourcePlanetId,
        targetPlanetId,
        strength: total,
        sharedTags,
        sharedKeywords,
        keywordStrength,
        evidenceTags: sharedTags.slice(0, maxEvidenceCount),
        evidenceKeywords: sharedKeywords.slice(0, maxEvidenceCount),
        scoreBreakdown: {
          tagScore,
          keywordScore,
          total
        },
        latestUpdatedAt: Math.max(source.latestUpdatedAt, target.latestUpdatedAt),
        pairKey: stablePairKey(sourcePlanetId, targetPlanetId)
      })
    }
  }

  const result = links
    .sort((a, b) => {
      if (b.scoreBreakdown.total !== a.scoreBreakdown.total) {
        return b.scoreBreakdown.total - a.scoreBreakdown.total
      }
      if (b.latestUpdatedAt !== a.latestUpdatedAt) {
        return b.latestUpdatedAt - a.latestUpdatedAt
      }
      return compareLexicographically(a.pairKey, b.pairKey)
    })
    .map(({ latestUpdatedAt: _latestUpdatedAt, pairKey: _pairKey, ...link }) => link)

  const nextCacheForNotes = cacheForNotes ?? new Map<string, PlanetLink[]>()
  nextCacheForNotes.set(cacheKey, result)
  if (!cacheForNotes) {
    linkCacheByNotesRef.set(notes, nextCacheForNotes)
  }

  return result
}

export function getPlanetOptions(): PlanetConfig[] {
  return PLANET_CONFIGS
}

export function calculateUniverseSnapshot(notes: Note[]): UniverseSnapshot {
  const cached = universeSnapshotCache.get(notes)
  if (cached) return cached

  const snapshot: UniverseSnapshot = {
    planets: calculatePlanetStats(notes),
    links: calculatePlanetLinks(notes)
  }
  universeSnapshotCache.set(notes, snapshot)
  return snapshot
}
