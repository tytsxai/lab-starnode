import { describe, expect, it } from 'vitest'
import {
  calculatePlanetLinks,
  calculatePlanetStats,
  extractKeywordMap,
  getTopKeywordsFromNote,
  normalizeTags,
  tokenizeText,
  type Note
} from './index'

function createNote(input: Partial<Note> & Pick<Note, 'id' | 'planetId'>): Note {
  return {
    id: input.id,
    title: input.title ?? 'title',
    content: input.content ?? 'content',
    tags: input.tags ?? [],
    planetId: input.planetId,
    updatedAt: input.updatedAt ?? '2026-02-14T00:00:00.000Z',
    isFrozen: input.isFrozen ?? false,
    frozenAt: input.frozenAt ?? null
  }
}

describe('normalizeTags', () => {
  it('should trim, lowercase and deduplicate tags', () => {
    const tags = normalizeTags(' AI, writing,ai, , Writing ')
    expect(tags).toEqual(['ai', 'writing'])
  })
})

describe('tokenizeText / extractKeywordMap', () => {
  it('should remove stopwords and noisy symbols', () => {
    const tokens = tokenizeText('This is THE test, and 我 也 来 test!!!')
    expect(tokens).toEqual(['test', '也', '来', 'test'])
  })

  it('should build frequency map for keywords', () => {
    const map = extractKeywordMap('Graph graph link focus')
    expect(map.get('graph')).toBe(2)
    expect(map.get('focus')).toBe(1)
  })

  it('should return top keywords by frequency', () => {
    const keywords = getTopKeywordsFromNote(
      {
        title: 'Graph graph note',
        content: 'link link focus'
      },
      2
    )
    expect(keywords).toEqual(['graph', 'link'])
  })
})

describe('calculatePlanetStats', () => {
  it('should ignore frozen notes in planet noteCount by default', () => {
    const notes: Note[] = [
      createNote({ id: 'a', planetId: 'p-life', isFrozen: false }),
      createNote({ id: 'b', planetId: 'p-life', isFrozen: true, frozenAt: '2026-02-14T00:00:00.000Z' }),
      createNote({ id: 'c', planetId: 'p-tech', isFrozen: false })
    ]

    const stats = calculatePlanetStats(notes)
    const life = stats.find((item) => item.id === 'p-life')
    const tech = stats.find((item) => item.id === 'p-tech')

    expect(life?.noteCount).toBe(1)
    expect(tech?.noteCount).toBe(1)
  })

  it('should include frozen notes when includeFrozen=true', () => {
    const notes: Note[] = [
      createNote({ id: 'a', planetId: 'p-life', isFrozen: false }),
      createNote({ id: 'b', planetId: 'p-life', isFrozen: true, frozenAt: '2026-02-14T00:00:00.000Z' })
    ]

    const stats = calculatePlanetStats(notes, { includeFrozen: true })
    const life = stats.find((item) => item.id === 'p-life')

    expect(life?.noteCount).toBe(2)
  })
})

describe('calculatePlanetLinks', () => {
  it('should only create links from active notes by default', () => {
    const notes: Note[] = [
      createNote({ id: '1', planetId: 'p-life', tags: ['focus'], isFrozen: false }),
      createNote({ id: '2', planetId: 'p-tech', tags: ['focus'], isFrozen: true, frozenAt: '2026-02-14T00:00:00.000Z' })
    ]

    const links = calculatePlanetLinks(notes)
    expect(links).toHaveLength(0)
  })

  it('should build mixed score with explainable evidence', () => {
    const notes: Note[] = [
      createNote({
        id: '1',
        planetId: 'p-life',
        tags: ['focus', 'daily'],
        title: 'graph thinking',
        content: 'note link graph'
      }),
      createNote({
        id: '2',
        planetId: 'p-tech',
        tags: ['focus', 'system'],
        title: 'graph engine',
        content: 'link architecture'
      })
    ]

    const links = calculatePlanetLinks(notes)
    expect(links).toHaveLength(1)

    const link = links[0]
    expect(link.sharedTags).toEqual(['focus'])
    expect(link.sharedKeywords).toEqual(expect.arrayContaining(['graph', 'link']))
    expect(link.evidenceTags).toEqual(['focus'])
    expect(link.evidenceKeywords).toEqual(expect.arrayContaining(['graph', 'link']))
    expect(link.scoreBreakdown.tagScore).toBe(2)
    expect(link.scoreBreakdown.keywordScore).toBeGreaterThanOrEqual(2)
    expect(link.scoreBreakdown.total).toBe(link.strength)
  })

  it('should include frozen notes when includeFrozen=true', () => {
    const notes: Note[] = [
      createNote({
        id: '1',
        planetId: 'p-life',
        tags: ['focus'],
        isFrozen: true,
        frozenAt: '2026-02-14T00:00:00.000Z'
      }),
      createNote({ id: '2', planetId: 'p-tech', tags: ['focus'] })
    ]

    const links = calculatePlanetLinks(notes, { includeFrozen: true })
    expect(links).toHaveLength(1)
    expect(links[0]?.sharedTags).toEqual(['focus'])
  })

  it('should be stable when scores are equal (updatedAt then planet pair)', () => {
    const notes: Note[] = [
      createNote({
        id: 'a1',
        planetId: 'p-life',
        tags: ['alpha'],
        title: 'alpha graph',
        content: 'alpha',
        updatedAt: '2026-02-10T00:00:00.000Z'
      }),
      createNote({
        id: 'a2',
        planetId: 'p-tech',
        tags: ['alpha'],
        title: 'alpha graph',
        content: 'alpha',
        updatedAt: '2026-02-11T00:00:00.000Z'
      }),
      createNote({
        id: 'b1',
        planetId: 'p-ops',
        tags: ['alpha'],
        title: 'alpha graph',
        content: 'alpha',
        updatedAt: '2026-02-09T00:00:00.000Z'
      })
    ]

    const links = calculatePlanetLinks(notes)

    // (p-life,p-tech) 与 (p-tech,p-ops) 得分一致，但前者最新更新时间更晚。
    expect(links[0].sourcePlanetId).toBe('p-life')
    expect(links[0].targetPlanetId).toBe('p-tech')
  })

  it('should keep source/target orientation stable regardless of note order', () => {
    const forward: Note[] = [
      createNote({ id: '1', planetId: 'p-tech', tags: ['focus'] }),
      createNote({ id: '2', planetId: 'p-life', tags: ['focus'] })
    ]
    const reverse: Note[] = [...forward].reverse()

    const forwardLink = calculatePlanetLinks(forward)[0]
    const reverseLink = calculatePlanetLinks(reverse)[0]

    expect(forwardLink.sourcePlanetId).toBe('p-life')
    expect(forwardLink.targetPlanetId).toBe('p-tech')
    expect(reverseLink.sourcePlanetId).toBe('p-life')
    expect(reverseLink.targetPlanetId).toBe('p-tech')
  })
})
