import type { Note } from '@starnode/core'

const STORAGE_KEY = 'starnode:notes'
const SCHEMA_VERSION = 3
const SAVE_THROTTLE_MS = 300

interface StoragePayloadV3 {
  schemaVersion: 3
  notes: Note[]
}

interface LegacyNoteV1 {
  id: string
  title: string
  content: string
  tags?: unknown
  planetId: string
  updatedAt: string
}

interface LegacyNoteV2 extends LegacyNoteV1 {
  isFrozen?: boolean
  frozenAt?: string | null
}

type LegacyPayload = LegacyNoteV1[] | LegacyNoteV2[] | { schemaVersion?: number; notes?: unknown[] }

let pendingSaveTimer: number | null = null
let pendingNotes: Note[] | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeNote(value: Record<string, unknown>): Note | null {
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.content !== 'string' ||
    typeof value.planetId !== 'string' ||
    typeof value.updatedAt !== 'string'
  ) {
    return null
  }

  return {
    id: value.id,
    title: value.title,
    content: value.content,
    tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    planetId: value.planetId,
    updatedAt: value.updatedAt,
    isFrozen: value.isFrozen === true,
    frozenAt: typeof value.frozenAt === 'string' ? value.frozenAt : null
  }
}

function migrateV1ToV2(notes: LegacyNoteV1[]): LegacyNoteV2[] {
  return notes.map((note) => ({
    ...note,
    isFrozen: false,
    frozenAt: null
  }))
}

function migrateV2ToV3(notes: LegacyNoteV2[]): Note[] {
  return notes
    .map((note) => normalizeNote(note as unknown as Record<string, unknown>))
    .filter((note): note is Note => note !== null)
}

function parsePayload(raw: string): StoragePayloadV3 {
  const parsed = JSON.parse(raw) as LegacyPayload

  // 兼容最早期纯数组结构（无 schemaVersion）
  if (Array.isArray(parsed)) {
    const v2 = migrateV1ToV2(parsed as LegacyNoteV1[])
    return {
      schemaVersion: SCHEMA_VERSION,
      notes: migrateV2ToV3(v2)
    }
  }

  if (!isRecord(parsed)) {
    return { schemaVersion: SCHEMA_VERSION, notes: [] }
  }

  const schemaVersion = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1
  const rawNotes = Array.isArray(parsed.notes) ? parsed.notes : []

  if (schemaVersion <= 1) {
    const v2 = migrateV1ToV2(rawNotes as LegacyNoteV1[])
    return {
      schemaVersion: SCHEMA_VERSION,
      notes: migrateV2ToV3(v2)
    }
  }

  if (schemaVersion === 2) {
    return {
      schemaVersion: SCHEMA_VERSION,
      notes: migrateV2ToV3(rawNotes as LegacyNoteV2[])
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    notes: (rawNotes as Array<Partial<Note>>)
      .map((note) => normalizeNote(note as unknown as Record<string, unknown>))
      .filter((note): note is Note => note !== null)
  }
}

export function loadNotes(): Note[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const payload = parsePayload(raw)

    // 读时迁移，确保后续写入统一为最新版本。
    if (payload.schemaVersion !== SCHEMA_VERSION) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          schemaVersion: SCHEMA_VERSION,
          notes: payload.notes
        } satisfies StoragePayloadV3)
      )
    }

    return payload.notes
  } catch {
    return []
  }
}

function flushNotes(): void {
  if (typeof window === 'undefined') return
  if (!pendingNotes) return

  const payload: StoragePayloadV3 = {
    schemaVersion: SCHEMA_VERSION,
    notes: pendingNotes
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  pendingSaveTimer = null
}

export function saveNotes(notes: Note[]): void {
  if (typeof window === 'undefined') return

  pendingNotes = notes
  if (pendingSaveTimer !== null) {
    window.clearTimeout(pendingSaveTimer)
  }

  pendingSaveTimer = window.setTimeout(() => {
    flushNotes()
  }, SAVE_THROTTLE_MS)
}
