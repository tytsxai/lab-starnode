'use client'

import { create } from 'zustand'
import { normalizeTags, type Note } from '@starnode/core'
import { loadNotes, saveNotes } from '@starnode/storage'

interface UndoSnapshot {
  notes: Note[]
  selectedPlanetId: string
  editingNoteId: string | null
  message: string
}

interface NoteState {
  notes: Note[]
  selectedPlanetId: string
  editingNoteId: string | null
  undoSnapshot: UndoSnapshot | null
  setSelectedPlanetId: (planetId: string) => void
  startEditNote: (noteId: string) => void
  cancelEditNote: () => void
  addNote: (input: { title: string; content: string; tagsRaw: string; planetId: string }) => void
  updateNote: (input: { noteId: string; title: string; content: string; tagsRaw: string; planetId: string }) => void
  deleteNote: (noteId: string) => void
  deleteNotes: (noteIds: string[]) => void
  moveNotes: (noteIds: string[], targetPlanetId: string) => void
  setNotesFrozen: (noteIds: string[], isFrozen: boolean) => void
  undoLastAction: () => void
}

const seedNotes: Note[] = [
  {
    id: 'n1',
    title: '第一条想法',
    content: '宇宙从一条笔记开始',
    tags: ['daily'],
    planetId: 'p-life',
    updatedAt: new Date().toISOString(),
    isFrozen: false,
    frozenAt: null
  },
  {
    id: 'n2',
    title: '渲染引擎',
    content: 'R3F 负责星球渲染',
    tags: ['tech'],
    planetId: 'p-tech',
    updatedAt: new Date().toISOString(),
    isFrozen: false,
    frozenAt: null
  }
]

const initialNotes = (() => {
  const local = loadNotes()
  return local.length > 0 ? local : seedNotes
})()

export const useNoteStore = create<NoteState>((set) => ({
  notes: initialNotes,
  selectedPlanetId: 'p-life',
  editingNoteId: null,
  undoSnapshot: null,
  setSelectedPlanetId: (planetId) => set({ selectedPlanetId: planetId }),
  startEditNote: (noteId) => set({ editingNoteId: noteId }),
  cancelEditNote: () => set({ editingNoteId: null }),
  addNote: ({ title, content, tagsRaw, planetId }) => {
    if (!title.trim() && !content.trim()) return

    set((state) => {
      const next: Note = {
        id: crypto.randomUUID(),
        title: title.trim() || '未命名笔记',
        content,
        tags: normalizeTags(tagsRaw),
        planetId,
        updatedAt: new Date().toISOString(),
        isFrozen: false,
        frozenAt: null
      }
      const notes = [next, ...state.notes]
      saveNotes(notes)
      return { notes, undoSnapshot: null }
    })
  },
  updateNote: ({ noteId, title, content, tagsRaw, planetId }) => {
    set((state) => {
      const notes = state.notes.map((note) => {
        if (note.id !== noteId) return note
        return {
          ...note,
          title: title.trim() || '未命名笔记',
          content,
          tags: normalizeTags(tagsRaw),
          planetId,
          updatedAt: new Date().toISOString()
        }
      })
      saveNotes(notes)
      return {
        notes,
        selectedPlanetId: planetId,
        editingNoteId: null,
        undoSnapshot: null
      }
    })
  },
  deleteNote: (noteId) => {
    set((state) => {
      const exists = state.notes.some((note) => note.id === noteId)
      if (!exists) return state
      const notes = state.notes.filter((note) => note.id !== noteId)
      saveNotes(notes)
      return {
        notes,
        editingNoteId: state.editingNoteId === noteId ? null : state.editingNoteId,
        undoSnapshot: {
          notes: state.notes,
          selectedPlanetId: state.selectedPlanetId,
          editingNoteId: state.editingNoteId,
          message: '已删除 1 条笔记'
        }
      }
    })
  },
  deleteNotes: (noteIds) => {
    if (noteIds.length === 0) return
    const idSet = new Set(noteIds)
    set((state) => {
      const affectedCount = state.notes.reduce((count, note) => (idSet.has(note.id) ? count + 1 : count), 0)
      if (affectedCount === 0) return state
      const notes = state.notes.filter((note) => !idSet.has(note.id))
      saveNotes(notes)
      return {
        notes,
        editingNoteId: state.editingNoteId && idSet.has(state.editingNoteId) ? null : state.editingNoteId,
        undoSnapshot: {
          notes: state.notes,
          selectedPlanetId: state.selectedPlanetId,
          editingNoteId: state.editingNoteId,
          message: `已删除 ${affectedCount} 条笔记`
        }
      }
    })
  },
  moveNotes: (noteIds, targetPlanetId) => {
    if (noteIds.length === 0) return

    const idSet = new Set(noteIds)
    set((state) => {
      const affectedCount = state.notes.reduce((count, note) => {
        if (!idSet.has(note.id)) return count
        return note.planetId === targetPlanetId ? count : count + 1
      }, 0)
      if (affectedCount === 0) return state

      const notes = state.notes.map((note) => {
        if (!idSet.has(note.id)) return note
        if (note.planetId === targetPlanetId) return note
        return {
          ...note,
          planetId: targetPlanetId,
          updatedAt: new Date().toISOString()
        }
      })
      saveNotes(notes)
      return {
        notes,
        selectedPlanetId: targetPlanetId,
        undoSnapshot: {
          notes: state.notes,
          selectedPlanetId: state.selectedPlanetId,
          editingNoteId: state.editingNoteId,
          message: `已迁移 ${affectedCount} 条笔记`
        }
      }
    })
  },
  setNotesFrozen: (noteIds, isFrozen) => {
    if (noteIds.length === 0) return
    const idSet = new Set(noteIds)
    set((state) => {
      const changedCount = state.notes.reduce((count, note) => {
        if (!idSet.has(note.id)) return count
        return note.isFrozen === isFrozen ? count : count + 1
      }, 0)
      if (changedCount === 0) return state

      const now = new Date().toISOString()
      const notes = state.notes.map((note) => {
        if (!idSet.has(note.id)) return note
        if (note.isFrozen === isFrozen) return note
        return {
          ...note,
          isFrozen,
          frozenAt: isFrozen ? now : null,
          updatedAt: now
        }
      })
      saveNotes(notes)
      return {
        notes,
        undoSnapshot: {
          notes: state.notes,
          selectedPlanetId: state.selectedPlanetId,
          editingNoteId: state.editingNoteId,
          message: isFrozen ? `已冰封 ${changedCount} 条笔记` : `已解冻 ${changedCount} 条笔记`
        }
      }
    })
  },
  undoLastAction: () => {
    set((state) => {
      if (!state.undoSnapshot) return state
      saveNotes(state.undoSnapshot.notes)
      return {
        notes: state.undoSnapshot.notes,
        selectedPlanetId: state.undoSnapshot.selectedPlanetId,
        editingNoteId: state.undoSnapshot.editingNoteId,
        undoSnapshot: null
      }
    })
  }
}))
