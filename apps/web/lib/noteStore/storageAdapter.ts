import type { Note } from '@starnode/core'
import {
  hasNotesSnapshot,
  loadNotes,
  saveNotes,
  subscribeNotesWithMeta,
  type NotesSyncMeta
} from '@starnode/storage'

export interface NoteStorageAdapter {
  loadNotes: () => Note[]
  hasNotesSnapshot?: () => boolean
  saveNotes: (notes: Note[]) => void
  subscribeNotes?: (onChange: (notes: Note[], meta: NotesSyncMeta) => void) => () => void
}

export const browserStorageAdapter: NoteStorageAdapter = {
  loadNotes,
  hasNotesSnapshot,
  saveNotes,
  subscribeNotes: (onChange) => subscribeNotesWithMeta(onChange)
}
