import type { Note } from '@starnode/core'
import { hasNotesSnapshot, loadNotes, saveNotes, subscribeNotes } from '@starnode/storage'

export interface NoteStorageAdapter {
  loadNotes: () => Note[]
  hasNotesSnapshot?: () => boolean
  saveNotes: (notes: Note[]) => void
  subscribeNotes?: (onChange: (notes: Note[]) => void) => () => void
}

export const browserStorageAdapter: NoteStorageAdapter = {
  loadNotes,
  hasNotesSnapshot,
  saveNotes,
  subscribeNotes: (onChange) => subscribeNotes(onChange)
}
