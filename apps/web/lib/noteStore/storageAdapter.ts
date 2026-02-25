import type { Note } from '@starnode/core'
import {
  hasNotesSnapshot,
  loadNotes,
  saveNotes,
  subscribeStorageIssues,
  subscribeNotesWithMeta,
  type StorageIssue,
  type NotesSyncMeta
} from '@starnode/storage'

export interface NoteStorageAdapter {
  loadNotes: () => Note[]
  hasNotesSnapshot?: () => boolean
  saveNotes: (notes: Note[]) => void
  subscribeNotes?: (onChange: (notes: Note[], meta: NotesSyncMeta) => void) => () => void
  subscribeStorageIssues?: (onIssue: (issue: StorageIssue) => void) => () => void
}

export const browserStorageAdapter: NoteStorageAdapter = {
  loadNotes,
  hasNotesSnapshot,
  saveNotes,
  subscribeNotes: (onChange) => subscribeNotesWithMeta(onChange),
  subscribeStorageIssues: (onIssue) => subscribeStorageIssues(onIssue)
}
