'use client'

import { create } from 'zustand'
import { browserStorageAdapter, type NoteStorageAdapter } from './storageAdapter'
import { seedNotes } from './seedNotes'
import type { NoteState } from './types'
import {
  addNoteCommand,
  deleteNoteCommand,
  deleteNotesCommand,
  moveNotesCommand,
  setNotesFrozenCommand,
  undoLastActionCommand,
  updateNoteCommand
} from './noteCommands'

interface CreateNoteStoreDeps {
  storage: NoteStorageAdapter
  now: () => string
  uuid: () => string
}

function resolveInitialNotes(storage: NoteStorageAdapter) {
  const local = storage.loadNotes()
  if (storage.hasNotesSnapshot) {
    return storage.hasNotesSnapshot() ? local : seedNotes
  }
  return local.length > 0 ? local : seedNotes
}

function createNoteId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `note-${Math.random().toString(36).slice(2)}`
}

export function createNoteStore(customDeps: Partial<CreateNoteStoreDeps> = {}) {
  const deps: CreateNoteStoreDeps = {
    storage: customDeps.storage ?? browserStorageAdapter,
    now: customDeps.now ?? (() => new Date().toISOString()),
    uuid: customDeps.uuid ?? createNoteId
  }

  const store = create<NoteState>((set) => ({
    notes: resolveInitialNotes(deps.storage),
    selectedPlanetId: 'p-life',
    draftPlanetId: 'p-life',
    editingNoteId: null,
    undoSnapshot: null,
    syncNotice: null,
    isFocusMode: false,
    setSelectedPlanetId: (planetId) => set({ selectedPlanetId: planetId }),
    setDraftPlanetId: (planetId) => set({ draftPlanetId: planetId }),
    setFocusMode: (next) => set({ isFocusMode: next }),
    clearSyncNotice: () => set({ syncNotice: null }),
    startEditNote: (noteId) => set({ editingNoteId: noteId }),
    cancelEditNote: () => set({ editingNoteId: null }),
    addNote: (input) => {
      set((state) => {
        const result = addNoteCommand(state, input, deps)
        if (result.changedCount === 0) return state
        if (result.shouldPersist && result.patch.notes) deps.storage.saveNotes(result.patch.notes)
        return result.patch
      })
    },
    updateNote: (input) => {
      set((state) => {
        const result = updateNoteCommand(state, input, deps)
        if (result.changedCount === 0) return state
        if (result.shouldPersist && result.patch.notes) deps.storage.saveNotes(result.patch.notes)
        return result.patch
      })
    },
    deleteNote: (noteId) => {
      let changedCount = 0
      set((state) => {
        const result = deleteNoteCommand(state, noteId)
        changedCount = result.changedCount
        if (result.changedCount === 0) return state
        if (result.shouldPersist && result.patch.notes) deps.storage.saveNotes(result.patch.notes)
        return result.patch
      })
      return changedCount
    },
    deleteNotes: (noteIds) => {
      let changedCount = 0
      set((state) => {
        const result = deleteNotesCommand(state, noteIds)
        changedCount = result.changedCount
        if (result.changedCount === 0) return state
        if (result.shouldPersist && result.patch.notes) deps.storage.saveNotes(result.patch.notes)
        return result.patch
      })
      return changedCount
    },
    moveNotes: (noteIds, targetPlanetId) => {
      let changedCount = 0
      set((state) => {
        const result = moveNotesCommand(state, noteIds, targetPlanetId, deps)
        changedCount = result.changedCount
        if (result.changedCount === 0) return state
        if (result.shouldPersist && result.patch.notes) deps.storage.saveNotes(result.patch.notes)
        return result.patch
      })
      return changedCount
    },
    setNotesFrozen: (noteIds, isFrozen) => {
      let changedCount = 0
      set((state) => {
        const result = setNotesFrozenCommand(state, noteIds, isFrozen, deps)
        changedCount = result.changedCount
        if (result.changedCount === 0) return state
        if (result.shouldPersist && result.patch.notes) deps.storage.saveNotes(result.patch.notes)
        return result.patch
      })
      return changedCount
    },
    undoLastAction: () => {
      set((state) => {
        const result = undoLastActionCommand(state)
        if (result.changedCount === 0) return state
        if (result.shouldPersist && result.patch.notes) deps.storage.saveNotes(result.patch.notes)
        return result.patch
      })
    }
  }))

  const unsubscribeExternal = deps.storage.subscribeNotes?.((externalNotes, meta) => {
    store.setState((state) => {
      if (areNotesEqual(state.notes, externalNotes)) return state

      // 跨标签页同步策略：
      // 1) 以持久化层为单一事实源（last persisted state wins）
      // 2) 外部数据覆盖本地 notes，避免多标签页分叉
      // 3) 清理失效编辑态与撤销快照，防止“基于旧世界线”的误操作
      const nextEditingNoteId =
        state.editingNoteId && externalNotes.some((note) => note.id === state.editingNoteId) ? state.editingNoteId : null

      const syncNotice = meta?.droppedPendingLocal
        ? '检测到其他标签页更新，当前页面未落盘改动已被覆盖。'
        : state.syncNotice

      return {
        notes: externalNotes,
        editingNoteId: nextEditingNoteId,
        undoSnapshot: null,
        syncNotice
      }
    })
  })

  let cleanedUp = false
  const cleanup = () => {
    if (cleanedUp) return
    cleanedUp = true
    unsubscribeExternal?.()
  }

  return Object.assign(store, { cleanup })
}

function areNotesEqual(a: NoteState['notes'], b: NoteState['notes']): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false

  // 这里采用 O(n) 深比较，用于抑制无效 setState（避免外部同步造成渲染抖动）。
  // 当前列表规模为笔记级别，复杂度可接受。
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i]
    const right = b[i]
    if (
      left.id !== right.id ||
      left.title !== right.title ||
      left.content !== right.content ||
      left.planetId !== right.planetId ||
      left.updatedAt !== right.updatedAt ||
      left.isFrozen !== right.isFrozen ||
      left.frozenAt !== right.frozenAt
    ) {
      return false
    }

    if (left.tags.length !== right.tags.length) return false
    for (let j = 0; j < left.tags.length; j += 1) {
      if (left.tags[j] !== right.tags[j]) return false
    }
  }

  return true
}
