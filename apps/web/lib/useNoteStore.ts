'use client'

import { createNoteStore } from './noteStore/createNoteStore'

export const useNoteStore = createNoteStore()

export type { AddNoteInput, NoteState, UndoSnapshot, UpdateNoteInput } from './noteStore/types'
