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
  return local.length > 0 ? local : seedNotes
}

export function createNoteStore(customDeps: Partial<CreateNoteStoreDeps> = {}) {
  const deps: CreateNoteStoreDeps = {
    storage: customDeps.storage ?? browserStorageAdapter,
    now: customDeps.now ?? (() => new Date().toISOString()),
    uuid: customDeps.uuid ?? (() => crypto.randomUUID())
  }

  return create<NoteState>((set) => ({
    notes: resolveInitialNotes(deps.storage),
    selectedPlanetId: 'p-life',
    editingNoteId: null,
    undoSnapshot: null,
    isFocusMode: false,
    setSelectedPlanetId: (planetId) => set({ selectedPlanetId: planetId }),
    setFocusMode: (next) => set({ isFocusMode: next }),
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
}
