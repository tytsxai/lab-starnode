import type { Note } from '@starnode/core'

function toIdSet(noteIds: string[]): Set<string> {
  return new Set(noteIds)
}

export function countExistingNotes(notes: Note[], noteIds: string[]): number {
  const idSet = toIdSet(noteIds)
  return notes.reduce((count, note) => (idSet.has(note.id) ? count + 1 : count), 0)
}

export function countMovableNotes(notes: Note[], noteIds: string[], targetPlanetId: string): number {
  const idSet = toIdSet(noteIds)
  return notes.reduce((count, note) => {
    if (!idSet.has(note.id)) return count
    return note.planetId === targetPlanetId ? count : count + 1
  }, 0)
}

export function countFreezableNotes(notes: Note[], noteIds: string[], nextFrozen: boolean): number {
  const idSet = toIdSet(noteIds)
  return notes.reduce((count, note) => {
    if (!idSet.has(note.id)) return count
    return note.isFrozen === nextFrozen ? count : count + 1
  }, 0)
}

export function mapNotesBySelection(
  notes: Note[],
  noteIds: string[],
  mapFn: (note: Note, now: string) => Note
): { notes: Note[]; changedCount: number } {
  const idSet = toIdSet(noteIds)
  const now = new Date().toISOString()
  let changedCount = 0

  const nextNotes = notes.map((note) => {
    if (!idSet.has(note.id)) return note
    const next = mapFn(note, now)
    if (next !== note) changedCount += 1
    return next
  })

  return { notes: nextNotes, changedCount }
}
