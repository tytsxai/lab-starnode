import type { Note } from '@starnode/core'
import { loadNotes, saveNotes, subscribeNotes } from '@starnode/storage'

export interface NoteStorageAdapter {
  loadNotes: () => Note[]
  saveNotes: (notes: Note[]) => void
  subscribeNotes?: (onChange: (notes: Note[]) => void) => () => void
}

export const browserStorageAdapter: NoteStorageAdapter = {
  loadNotes,
  saveNotes,
  subscribeNotes: (onChange) => subscribeNotes(onChange)
}
