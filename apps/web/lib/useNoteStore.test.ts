// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from '@starnode/core'
import { createNoteStore } from './noteStore/createNoteStore'
import type { NoteStorageAdapter } from './noteStore/storageAdapter'

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

describe('useNoteStore command behavior', () => {
  let saveNotesSpy: ReturnType<typeof vi.fn>
  let subscribeNotesSpy: ReturnType<typeof vi.fn>
  let externalChangeHandler: ((notes: Note[]) => void) | null
  let store: ReturnType<typeof createNoteStore>

  beforeEach(() => {
    saveNotesSpy = vi.fn()
    externalChangeHandler = null
    subscribeNotesSpy = vi.fn((onChange: (notes: Note[]) => void) => {
      externalChangeHandler = onChange
      return () => {
        externalChangeHandler = null
      }
    })
    const storage: NoteStorageAdapter = {
      loadNotes: () => [],
      saveNotes: saveNotesSpy,
      subscribeNotes: subscribeNotesSpy
    }

    store = createNoteStore({
      storage,
      now: () => '2026-02-14T08:00:00.000Z',
      uuid: () => 'generated-id'
    })
  })

  it('createNoteStore 应注册外部存储订阅以支持多标签页同步', () => {
    expect(subscribeNotesSpy).toHaveBeenCalledTimes(1)
  })

  it('moveNotes no-op 时不落盘', () => {
    store.setState({
      notes: [createNote({ id: '1', planetId: 'p-tech' })],
      selectedPlanetId: 'p-tech',
      editingNoteId: null,
      undoSnapshot: null,
      isFocusMode: false
    })

    const changed = store.getState().moveNotes(['1'], 'p-tech')

    expect(changed).toBe(0)
    expect(saveNotesSpy).not.toHaveBeenCalled()
    expect(store.getState().undoSnapshot).toBeNull()
  })

  it('deleteNotes 会清理编辑态并写入 undo 快照', () => {
    store.setState({
      notes: [createNote({ id: '1' }), createNote({ id: '2' })],
      selectedPlanetId: 'p-life',
      editingNoteId: '2',
      undoSnapshot: null,
      isFocusMode: false
    })

    const changed = store.getState().deleteNotes(['2', '3'])

    expect(changed).toBe(1)
    expect(store.getState().editingNoteId).toBeNull()
    expect(store.getState().undoSnapshot?.message).toBe('已删除 1 条笔记')
    expect(saveNotesSpy).toHaveBeenCalledTimes(1)
  })

  it('setNotesFrozen 只修改必要条目', () => {
    store.setState({
      notes: [createNote({ id: '1', isFrozen: false }), createNote({ id: '2', isFrozen: true })],
      selectedPlanetId: 'p-life',
      editingNoteId: null,
      undoSnapshot: null,
      isFocusMode: false
    })

    const changed = store.getState().setNotesFrozen(['1', '2'], true)

    expect(changed).toBe(1)
    expect(store.getState().notes.find((note) => note.id === '1')?.isFrozen).toBe(true)
    expect(store.getState().notes.find((note) => note.id === '1')?.frozenAt).toBe('2026-02-14T08:00:00.000Z')
    expect(store.getState().notes.find((note) => note.id === '2')?.isFrozen).toBe(true)
  })

  it('undoLastAction 会完整恢复快照并清空 undo', () => {
    store.setState({
      notes: [createNote({ id: '1', planetId: 'p-life' })],
      selectedPlanetId: 'p-life',
      editingNoteId: null,
      undoSnapshot: null,
      isFocusMode: false
    })

    store.getState().moveNotes(['1'], 'p-tech')
    store.getState().undoLastAction()

    expect(store.getState().notes.find((note) => note.id === '1')?.planetId).toBe('p-life')
    expect(store.getState().selectedPlanetId).toBe('p-life')
    expect(store.getState().undoSnapshot).toBeNull()
  })

  it('updateNote 会同步 selectedPlanetId 并退出编辑态', () => {
    store.setState({
      notes: [createNote({ id: '1', planetId: 'p-life' })],
      selectedPlanetId: 'p-life',
      editingNoteId: '1',
      undoSnapshot: null,
      isFocusMode: false
    })

    store.getState().updateNote({
      noteId: '1',
      title: 'next',
      content: 'content',
      tagsRaw: 'alpha,beta',
      planetId: 'p-tech'
    })

    const target = store.getState().notes.find((note) => note.id === '1')
    expect(target?.planetId).toBe('p-tech')
    expect(target?.tags).toEqual(['alpha', 'beta'])
    expect(target?.updatedAt).toBe('2026-02-14T08:00:00.000Z')
    expect(store.getState().selectedPlanetId).toBe('p-tech')
    expect(store.getState().editingNoteId).toBeNull()
  })

  it('addNote 空输入时应 no-op', () => {
    const before = store.getState().notes.length

    store.getState().addNote({
      title: '   ',
      content: '   ',
      tagsRaw: '',
      planetId: 'p-life'
    })

    expect(store.getState().notes).toHaveLength(before)
    expect(saveNotesSpy).not.toHaveBeenCalled()
    expect(store.getState().undoSnapshot).toBeNull()
  })

  it('外部存储更新后应同步笔记并清空失效编辑态/撤销快照', () => {
    store.setState({
      notes: [createNote({ id: '1', title: 'old' })],
      selectedPlanetId: 'p-life',
      editingNoteId: '1',
      undoSnapshot: {
        notes: [createNote({ id: 'shadow' })],
        selectedPlanetId: 'p-life',
        editingNoteId: null,
        message: 'undo'
      },
      isFocusMode: false
    })

    externalChangeHandler?.([createNote({ id: '2', title: 'from-external' })])

    const state = store.getState()
    expect(state.notes).toHaveLength(1)
    expect(state.notes[0].id).toBe('2')
    expect(state.editingNoteId).toBeNull()
    expect(state.undoSnapshot).toBeNull()
  })
})
