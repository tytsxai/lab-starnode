import type { Note } from '@starnode/core'

export interface UndoSnapshot {
  notes: Note[]
  selectedPlanetId: string
  draftPlanetId: string
  editingNoteId: string | null
  message: string
}

export interface AddNoteInput {
  title: string
  content: string
  tagsRaw: string
  planetId: string
}

export interface UpdateNoteInput extends AddNoteInput {
  noteId: string
}

export interface NoteState {
  notes: Note[]
  selectedPlanetId: string
  draftPlanetId: string
  editingNoteId: string | null
  undoSnapshot: UndoSnapshot | null
  isFocusMode: boolean
  setSelectedPlanetId: (planetId: string) => void
  setDraftPlanetId: (planetId: string) => void
  setFocusMode: (next: boolean) => void
  startEditNote: (noteId: string) => void
  cancelEditNote: () => void
  addNote: (input: AddNoteInput) => void
  updateNote: (input: UpdateNoteInput) => void
  deleteNote: (noteId: string) => number
  deleteNotes: (noteIds: string[]) => number
  moveNotes: (noteIds: string[], targetPlanetId: string) => number
  setNotesFrozen: (noteIds: string[], isFrozen: boolean) => number
  undoLastAction: () => void
}
