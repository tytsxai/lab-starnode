// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from '@starnode/core'

vi.mock('@starnode/storage', () => ({
  loadNotes: () => [],
  saveNotes: () => undefined
}))

const { useNoteStore } = await import('./useNoteStore')

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

function resetStore(notes: Note[]) {
  useNoteStore.setState({
    notes,
    selectedPlanetId: 'p-life',
    editingNoteId: null,
    undoSnapshot: null
  })
}

describe('useNoteStore batch behavior', () => {
  beforeEach(() => {
    resetStore([
      createNote({ id: '1', planetId: 'p-life', isFrozen: false }),
      createNote({ id: '2', planetId: 'p-tech', isFrozen: false }),
      createNote({ id: '3', planetId: 'p-tech', isFrozen: true })
    ])
  })

  it('moveNotes should return accurate changed count and write undo snapshot', () => {
    const changed = useNoteStore.getState().moveNotes(['1', '2'], 'p-tech')

    expect(changed).toBe(1)
    expect(useNoteStore.getState().undoSnapshot?.message).toBe('已迁移 1 条笔记')
    expect(useNoteStore.getState().notes.find((note) => note.id === '1')?.planetId).toBe('p-tech')
  })

  it('setNotesFrozen should keep undo snapshot restorable', () => {
    const freezeChanged = useNoteStore.getState().setNotesFrozen(['1', '3'], true)
    expect(freezeChanged).toBe(1)
    expect(useNoteStore.getState().undoSnapshot?.message).toBe('已冰封 1 条笔记')

    useNoteStore.getState().undoLastAction()

    const note1 = useNoteStore.getState().notes.find((note) => note.id === '1')
    const note3 = useNoteStore.getState().notes.find((note) => note.id === '3')
    expect(note1?.isFrozen).toBe(false)
    expect(note3?.isFrozen).toBe(true)
    expect(useNoteStore.getState().undoSnapshot).toBeNull()
  })
})
