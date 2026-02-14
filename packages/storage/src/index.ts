import { PLANET_CONFIGS, type Note } from '@starnode/core'

const STORAGE_KEY = 'starnode:notes'
const SCHEMA_VERSION = 3
const SAVE_THROTTLE_MS = 300
const FALLBACK_PLANET_ID = PLANET_CONFIGS[0]?.id ?? 'p-life'
const VALID_PLANET_IDS = new Set(PLANET_CONFIGS.map((planet) => planet.id))
const FALLBACK_UPDATED_AT = '1970-01-01T00:00:00.000Z'

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
let lifecycleFlushBound = false

interface ParsedStorageResult {
  notes: Note[]
  needsRewrite: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeNote(value: Record<string, unknown>): Note | null {
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.content !== 'string' ||
    typeof value.planetId !== 'string'
  ) {
    return null
  }

  const normalizedPlanetId = VALID_PLANET_IDS.has(value.planetId) ? value.planetId : FALLBACK_PLANET_ID
  const normalizedUpdatedAt =
    typeof value.updatedAt === 'string' && Number.isFinite(new Date(value.updatedAt).getTime())
      ? value.updatedAt
      : FALLBACK_UPDATED_AT

  return {
    id: value.id,
    title: value.title,
    content: value.content,
    tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    // 非法星球 ID 会导致笔记在 UI 中“隐形”，这里统一兜底到默认星球。
    planetId: normalizedPlanetId,
    // 非法时间会破坏排序稳定性，统一回退到固定时间戳。
    updatedAt: normalizedUpdatedAt,
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

function parsePayload(raw: string): ParsedStorageResult {
  const parsed = JSON.parse(raw) as LegacyPayload

  // 兼容最早期纯数组结构（无 schemaVersion）
  if (Array.isArray(parsed)) {
    const v2 = migrateV1ToV2(parsed as LegacyNoteV1[])
    return {
      notes: migrateV2ToV3(v2),
      needsRewrite: true
    }
  }

  if (!isRecord(parsed)) {
    return { notes: [], needsRewrite: true }
  }

  const schemaVersion = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1
  const rawNotes = Array.isArray(parsed.notes) ? parsed.notes : []

  if (schemaVersion <= 1) {
    const v2 = migrateV1ToV2(rawNotes as LegacyNoteV1[])
    return {
      notes: migrateV2ToV3(v2),
      needsRewrite: true
    }
  }

  if (schemaVersion === 2) {
    return {
      notes: migrateV2ToV3(rawNotes as LegacyNoteV2[]),
      needsRewrite: true
    }
  }

  return {
    needsRewrite: schemaVersion !== SCHEMA_VERSION,
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
    if (payload.needsRewrite) {
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
  pendingNotes = null
  pendingSaveTimer = null
}

function bindLifecycleFlush(): void {
  if (typeof window === 'undefined') return
  if (lifecycleFlushBound) return

  const flush = () => {
    if (pendingSaveTimer !== null) {
      window.clearTimeout(pendingSaveTimer)
    }
    flushNotes()
  }

  window.addEventListener('pagehide', flush)
  window.addEventListener('beforeunload', flush)
  lifecycleFlushBound = true
}

export function saveNotes(notes: Note[]): void {
  if (typeof window === 'undefined') return

  bindLifecycleFlush()
  pendingNotes = notes
  if (pendingSaveTimer !== null) {
    window.clearTimeout(pendingSaveTimer)
  }

  pendingSaveTimer = window.setTimeout(() => {
    flushNotes()
  }, SAVE_THROTTLE_MS)
}

export function subscribeNotes(onChange: (notes: Note[]) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handler = (event: StorageEvent) => {
    if (event.storageArea && event.storageArea !== window.localStorage) return
    if (event.key !== STORAGE_KEY) return

    // 仅处理其他标签页变更；当前标签页写入不会触发该事件。
    if (!event.newValue) {
      onChange([])
      return
    }

    try {
      const payload = parsePayload(event.newValue)
      onChange(payload.notes)
    } catch {
      // 非法数据直接忽略，避免污染当前会话状态。
    }
  }

  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
