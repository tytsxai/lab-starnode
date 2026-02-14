'use client'

import { createNoteStore } from './noteStore/createNoteStore'

declare global {
  interface Window {
    __STAR_NODE_NOTE_STORE__?: ReturnType<typeof createNoteStore>
  }
}

function resolveStore() {
  if (typeof window === 'undefined') return createNoteStore()
  if (!window.__STAR_NODE_NOTE_STORE__) {
    window.__STAR_NODE_NOTE_STORE__ = createNoteStore()
  }
  return window.__STAR_NODE_NOTE_STORE__
}

export const useNoteStore = resolveStore()

export type { AddNoteInput, NoteState, UndoSnapshot, UpdateNoteInput } from './noteStore/types'
