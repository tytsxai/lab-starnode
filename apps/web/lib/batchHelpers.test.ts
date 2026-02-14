import { describe, expect, it } from 'vitest'
import type { Note } from '@starnode/core'
import { countExistingNotes, countFreezableNotes, countMovableNotes } from './batchHelpers'

function createNote(input: Partial<Note> & Pick<Note, 'id'>): Note {
  return {
    id: input.id,
    title: input.title ?? 'title',
    content: input.content ?? 'content',
    tags: input.tags ?? [],
    planetId: input.planetId ?? 'p-life',
    updatedAt: input.updatedAt ?? '2026-02-14T00:00:00.000Z',
    isFrozen: input.isFrozen ?? false,
    frozenAt: input.frozenAt ?? null
  }
}

describe('batchHelpers', () => {
  const notes: Note[] = [
    createNote({ id: '1', planetId: 'p-life', isFrozen: false }),
    createNote({ id: '2', planetId: 'p-tech', isFrozen: false }),
    createNote({ id: '3', planetId: 'p-tech', isFrozen: true })
  ]

  it('countExistingNotes should only count existing ids', () => {
    expect(countExistingNotes(notes, ['1', 'x', '3'])).toBe(2)
  })

  it('countMovableNotes should ignore notes already in target planet', () => {
    expect(countMovableNotes(notes, ['1', '2'], 'p-tech')).toBe(1)
  })

  it('countFreezableNotes should reflect target frozen state', () => {
    expect(countFreezableNotes(notes, ['1', '2', '3'], true)).toBe(2)
    expect(countFreezableNotes(notes, ['1', '2', '3'], false)).toBe(1)
  })
})
