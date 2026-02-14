import { describe, expect, it } from 'vitest'
import { calculatePlanetLinks, calculatePlanetStats, normalizeTags, type Note } from './index'

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

describe('calculatePlanetStats', () => {
  it('should ignore frozen notes in planet noteCount', () => {
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
})

describe('calculatePlanetLinks', () => {
  it('should only create links from active notes', () => {
    const notes: Note[] = [
      createNote({ id: '1', planetId: 'p-life', tags: ['focus'], isFrozen: false }),
      createNote({ id: '2', planetId: 'p-tech', tags: ['focus'], isFrozen: true, frozenAt: '2026-02-14T00:00:00.000Z' })
    ]

    const links = calculatePlanetLinks(notes)
    expect(links).toHaveLength(0)
  })
})
