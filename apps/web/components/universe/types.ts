import type { Note } from '@starnode/core'

export type SortBy = 'updated_desc' | 'title_asc'
export type VisibilityMode = 'active' | 'all' | 'frozen'

export interface NoteQueryState {
  searchTerm: string
  sortBy: SortBy
  activeTag: string | null
  visibilityMode: VisibilityMode
}

export interface NoteListOverlayProps {
  notes: Note[]
  selectedNotesCount: number
  editingNoteId: string | null
  selectedNoteIds: string[]
  onToggleNoteSelection: (noteId: string) => void
  onStartEdit: (noteId: string, planetId: string) => void
  onToggleFrozen: (note: Note) => void
  onDeleteNote: (noteId: string) => void
}
