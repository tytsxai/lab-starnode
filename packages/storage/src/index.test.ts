// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from '@starnode/core'
import {
  hasNotesSnapshot,
  loadNotes,
  saveNotes,
  subscribeNotes,
  subscribeNotesWithMeta,
  subscribeStorageIssues
} from './index'

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

  it('should distinguish missing snapshot from persisted empty notes', () => {
    expect(hasNotesSnapshot()).toBe(false)

    window.localStorage.setItem(
      'starnode:notes',
      JSON.stringify({
        schemaVersion: 3,
        notes: []
      })
    )

    expect(loadNotes()).toEqual([])
    expect(hasNotesSnapshot()).toBe(true)
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

    const rewritten = JSON.parse(window.localStorage.getItem('starnode:notes') ?? '{}')
    expect(rewritten.notes[0].planetId).toBe('p-life')
    expect(rewritten.notes[0].updatedAt).toBe('1970-01-01T00:00:00.000Z')
  })

  it('should not rewrite snapshots from newer schema versions', () => {
    const futurePayload = JSON.stringify({
      schemaVersion: 4,
      revision: 9,
      writtenAt: 9_999,
      writerId: 'writer-future',
      notes: [
        {
          ...createNote({ id: 'future-1', title: 'from-future' }),
          semanticVector: [0.1, 0.2, 0.3]
        }
      ],
      futureFeatureFlags: {
        aiIndex: true
      }
    })
    storageMap.set('starnode:notes', futurePayload)

    const setItemSpy = vi.fn((key: string, value: string) => {
      storageMap.set(key, value)
    })
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storageMap.get(key) ?? null,
        setItem: setItemSpy,
        removeItem: (key: string) => {
          storageMap.delete(key)
        },
        clear: () => {
          storageMap.clear()
        }
      }
    })

    const notes = loadNotes()
    expect(notes).toHaveLength(1)
    expect(notes[0].id).toBe('future-1')
    expect(setItemSpy).not.toHaveBeenCalled()
    expect(window.localStorage.getItem('starnode:notes')).toBe(futurePayload)
  })

  it('should still return parsed notes when migration rewrite fails', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onIssue = vi.fn()
    const unsubscribeIssue = subscribeStorageIssues(onIssue)

    window.localStorage.setItem(
      'starnode:notes',
      JSON.stringify([
        {
          id: 'legacy-1',
          title: 'legacy',
          content: 'content',
          tags: ['a'],
          planetId: 'p-life',
          updatedAt: '2026-02-14T00:00:00.000Z'
        }
      ])
    )

    const setItemSpy = vi.fn(() => {
      throw new Error('QuotaExceededError')
    })
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storageMap.get(key) ?? null,
        setItem: setItemSpy,
        removeItem: (key: string) => {
          storageMap.delete(key)
        },
        clear: () => {
          storageMap.clear()
        }
      }
    })

    const notes = loadNotes()
    expect(notes).toHaveLength(1)
    expect(notes[0].id).toBe('legacy-1')
    expect(setItemSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(onIssue).toHaveBeenCalledWith(expect.objectContaining({ kind: 'migration_rewrite_failed' }))
    unsubscribeIssue()
    consoleErrorSpy.mockRestore()
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
    expect(payload.revision).toBe(1)
    expect(typeof payload.writerId).toBe('string')
    expect(payload.writerId.length).toBeGreaterThan(0)
  })

  it('should persist snapshot value even if caller mutates source array before flush', () => {
    vi.useFakeTimers()

    const notes = [createNote({ id: 'a', title: 'snapshot' })]
    saveNotes(notes)
    notes[0].title = 'mutated-after-save'

    vi.advanceTimersByTime(300)

    const raw = window.localStorage.getItem('starnode:notes')
    expect(raw).not.toBeNull()
    const payload = JSON.parse(raw ?? '{}')
    expect(payload.notes[0].title).toBe('snapshot')
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

  it('should not throw when localStorage setItem fails', () => {
    vi.useFakeTimers()
    const onIssue = vi.fn()
    const unsubscribeIssue = subscribeStorageIssues(onIssue)

    const setItemSpy = vi.fn(() => {
      throw new Error('QuotaExceededError')
    })
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: setItemSpy,
        removeItem: () => {},
        clear: () => {}
      }
    })

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    saveNotes([createNote({ id: 'a', title: 'will-fail' })])

    expect(() => vi.advanceTimersByTime(300)).not.toThrow()
    expect(setItemSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(onIssue).toHaveBeenCalledWith(expect.objectContaining({ kind: 'save_failed' }))
    unsubscribeIssue()
    consoleErrorSpy.mockRestore()
  })

  it('should gracefully fallback when localStorage is unavailable', () => {
    const onIssue = vi.fn()
    const unsubscribeIssue = subscribeStorageIssues(onIssue)
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('SecurityError')
      }
    })

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(loadNotes()).toEqual([])
    expect(hasNotesSnapshot()).toBe(false)
    expect(() => saveNotes([createNote({ id: 'fallback' })])).not.toThrow()
    const unsubscribe = subscribeNotes(() => {})
    expect(typeof unsubscribe).toBe('function')
    unsubscribe()
    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(onIssue).toHaveBeenCalledWith(expect.objectContaining({ kind: 'storage_unavailable' }))
    unsubscribeIssue()
    consoleErrorSpy.mockRestore()
  })

  it('should emit storage_unavailable issue for each failed storage access', () => {
    const onIssue = vi.fn()
    const unsubscribeIssue = subscribeStorageIssues(onIssue)

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('SecurityError')
      }
    })

    loadNotes()
    saveNotes([createNote({ id: 'x' })])

    expect(onIssue).toHaveBeenCalledTimes(2)
    expect(onIssue).toHaveBeenNthCalledWith(1, expect.objectContaining({ kind: 'storage_unavailable' }))
    expect(onIssue).toHaveBeenNthCalledWith(2, expect.objectContaining({ kind: 'storage_unavailable' }))
    unsubscribeIssue()
  })

  it('should notify subscribers when notes changed from another tab', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeNotes(onChange)

    const payload = {
      schemaVersion: 3,
      revision: 1,
      writtenAt: 1000,
      writerId: 'writer-external',
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

  it('should ignore stale storage event when a newer snapshot already exists', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeNotes(onChange)

    window.localStorage.setItem(
      'starnode:notes',
      JSON.stringify({
        schemaVersion: 3,
        revision: 4,
        writtenAt: 4000,
        writerId: 'writer-new',
        notes: [createNote({ id: 'new', title: 'newer' })]
      })
    )

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'starnode:notes',
        newValue: JSON.stringify({
          schemaVersion: 3,
          revision: 3,
          writtenAt: 3000,
          writerId: 'writer-old',
          notes: [createNote({ id: 'old', title: 'older' })]
        })
      })
    )

    expect(onChange).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('should drop throttled pending save when external change arrives', () => {
    vi.useFakeTimers()

    const localDraft = [createNote({ id: 'local', title: 'local-draft' })]
    const externalPayload = {
      schemaVersion: 3,
      revision: 1,
      writtenAt: 1000,
      writerId: 'writer-external',
      notes: [createNote({ id: 'external', title: 'external-wins' })]
    }

    saveNotes(localDraft)

    const onChange = vi.fn()
    const unsubscribe = subscribeNotes(onChange)

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'starnode:notes',
        newValue: JSON.stringify(externalPayload)
      })
    )

    // 如果没有丢弃 pending save，这里 advance 后会被 local-draft 覆盖。
    vi.advanceTimersByTime(300)

    const raw = window.localStorage.getItem('starnode:notes')
    expect(raw).toBeNull()
    expect(onChange).toHaveBeenCalledWith(externalPayload.notes)
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

  it('should keep pending save when malformed external payload arrives', () => {
    vi.useFakeTimers()

    const localDraft = [createNote({ id: 'local', title: 'local-draft' })]
    saveNotes(localDraft)

    const onChange = vi.fn()
    const unsubscribe = subscribeNotes(onChange)

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'starnode:notes',
        newValue: '{invalid-json'
      })
    )

    vi.advanceTimersByTime(300)

    const raw = window.localStorage.getItem('starnode:notes')
    expect(raw).not.toBeNull()
    const payload = JSON.parse(raw ?? '{}')
    expect(payload.notes[0].id).toBe('local')
    expect(onChange).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('should emit sync meta with droppedPendingLocal=true when external update overrides local pending', () => {
    vi.useFakeTimers()

    saveNotes([createNote({ id: 'local', title: 'local-draft' })])

    const onChange = vi.fn()
    const unsubscribe = subscribeNotesWithMeta(onChange)

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'starnode:notes',
        newValue: JSON.stringify({
          schemaVersion: 3,
          revision: 1,
          writtenAt: 1000,
          writerId: 'writer-external',
          notes: [createNote({ id: 'external', title: 'external' })]
        })
      })
    )

    expect(onChange).toHaveBeenCalledTimes(1)
    const [notes, meta] = onChange.mock.calls[0]
    expect(notes).toEqual([createNote({ id: 'external', title: 'external' })])
    expect(meta).toEqual({
      reason: 'external_update',
      droppedPendingLocal: true
    })
    unsubscribe()
  })
})
