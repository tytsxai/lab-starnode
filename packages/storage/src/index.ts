import type { Note } from '@starnode/core'

const KEY = 'starnode:notes'

export function loadNotes(): Note[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as Array<Partial<Note>>
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is Partial<Note> & Pick<Note, 'id' | 'title' | 'content' | 'planetId' | 'updatedAt'> => {
        return (
          typeof item.id === 'string' &&
          typeof item.title === 'string' &&
          typeof item.content === 'string' &&
          typeof item.planetId === 'string' &&
          typeof item.updatedAt === 'string'
        )
      })
      .map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string') : [],
        planetId: item.planetId,
        updatedAt: item.updatedAt,
        isFrozen: item.isFrozen === true,
        frozenAt: typeof item.frozenAt === 'string' ? item.frozenAt : null
      }))
  } catch {
    return []
  }
}

export function saveNotes(notes: Note[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(notes))
}
