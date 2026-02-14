import type { Note } from '@starnode/core'
import { loadNotes, saveNotes } from '@starnode/storage'

export interface NoteStorageAdapter {
  loadNotes: () => Note[]
  saveNotes: (notes: Note[]) => void
}

export const browserStorageAdapter: NoteStorageAdapter = {
  loadNotes,
  saveNotes
}
