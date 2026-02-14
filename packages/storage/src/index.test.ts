// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from '@starnode/core'
import { loadNotes, saveNotes, subscribeNotes } from './index'

function createNote(input: Partial<Note> & Pick<Note, 'id'>): Note {
  return {
    id: input.id,
    title: input.title ?? 'title',
    content: input.content ?? 'content',
    tags: input.tags ?? [],
    planetId: input.planetId ?? 'p-life',
    updatedAt: input.updatedAt ?? '2026-02-14T00:00:00.000Z',
    isFrozen: input.isFrozen ?? false,
    frozenAt: input.frozenAt ?? null
  }
}

describe('storage migration and throttle', () => {
  const storageMap = new Map<string, string>()

  beforeEach(() => {
    storageMap.clear()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storageMap.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storageMap.set(key, value)
        },
        removeItem: (key: string) => {
          storageMap.delete(key)
        },
        clear: () => {
          storageMap.clear()
        }
      }
    })
    vi.useRealTimers()
  })

  it('should migrate legacy array payload to schema v3 note shape', () => {
    window.localStorage.setItem(
      'starnode:notes',
      JSON.stringify([
        {
          id: 'n1',
          title: 'legacy',
          content: 'content',
          tags: ['a'],
          planetId: 'p-life',
          updatedAt: '2026-02-14T00:00:00.000Z'
        }
      ])
    )

    const notes = loadNotes()

    expect(notes).toHaveLength(1)
    expect(notes[0].isFrozen).toBe(false)
    expect(notes[0].frozenAt).toBeNull()

    const rewritten = JSON.parse(window.localStorage.getItem('starnode:notes') ?? '{}')
    expect(rewritten.schemaVersion).toBe(3)
    expect(Array.isArray(rewritten.notes)).toBe(true)
  })

  it('should sanitize invalid planetId and updatedAt when loading', () => {
    window.localStorage.setItem(
      'starnode:notes',
      JSON.stringify({
        schemaVersion: 3,
        notes: [
          {
            id: 'broken',
            title: 'legacy',
            content: 'content',
            tags: ['a'],
            planetId: 'p-unknown',
            updatedAt: 'invalid-date'
          }
        ]
      })
    )

    const [note] = loadNotes()
    expect(note.planetId).toBe('p-life')
    expect(note.updatedAt).toBe('1970-01-01T00:00:00.000Z')
  })

  it('should throttle save and keep latest payload', () => {
    vi.useFakeTimers()

    const first = [createNote({ id: 'a', title: 'first' })]
    const second = [createNote({ id: 'a', title: 'second' })]

    saveNotes(first)
    saveNotes(second)

    expect(window.localStorage.getItem('starnode:notes')).toBeNull()

    vi.advanceTimersByTime(300)

    const raw = window.localStorage.getItem('starnode:notes')
    expect(raw).not.toBeNull()

    const payload = JSON.parse(raw ?? '{}')
    expect(payload.schemaVersion).toBe(3)
    expect(payload.notes[0].title).toBe('second')
  })

  it('should flush pending notes on pagehide before throttle timeout', () => {
    vi.useFakeTimers()
    const next = [createNote({ id: 'a', title: 'flush-on-hide' })]

    saveNotes(next)
    window.dispatchEvent(new Event('pagehide'))

    const raw = window.localStorage.getItem('starnode:notes')
    expect(raw).not.toBeNull()

    const payload = JSON.parse(raw ?? '{}')
    expect(payload.schemaVersion).toBe(3)
    expect(payload.notes[0].title).toBe('flush-on-hide')
  })

  it('should notify subscribers when notes changed from another tab', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeNotes(onChange)

    const payload = {
      schemaVersion: 3,
      notes: [createNote({ id: 'x', title: 'external' })]
    }
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'starnode:notes',
        newValue: JSON.stringify(payload)
      })
    )

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(payload.notes)

    unsubscribe()
  })

  it('should notify empty list when storage key removed in another tab', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeNotes(onChange)

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'starnode:notes',
        newValue: null
      })
    )

    expect(onChange).toHaveBeenCalledWith([])
    unsubscribe()
  })

  it('should notify empty list when another tab clears localStorage', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeNotes(onChange)

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: null,
        newValue: null
      })
    )

    expect(onChange).toHaveBeenCalledWith([])
    unsubscribe()
  })

  it('should ignore malformed external payload', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeNotes(onChange)

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'starnode:notes',
        newValue: '{invalid-json'
      })
    )

    expect(onChange).not.toHaveBeenCalled()
    unsubscribe()
  })
})
