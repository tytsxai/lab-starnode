import { PLANET_CONFIGS, type Note } from '@starnode/core'

const STORAGE_KEY = 'starnode:notes'
const SCHEMA_VERSION = 3
const SAVE_THROTTLE_MS = 300
const FALLBACK_PLANET_ID = PLANET_CONFIGS[0]?.id ?? 'p-life'
const VALID_PLANET_IDS = new Set(PLANET_CONFIGS.map((planet) => planet.id))
const FALLBACK_UPDATED_AT = '1970-01-01T00:00:00.000Z'
const EMPTY_VERSION: SnapshotVersion = {
  revision: 0,
  writtenAt: 0,
  writerId: ''
}
const SESSION_WRITER_ID = createSessionWriterId()
let hasLoggedStorageUnavailable = false

interface SnapshotVersion {
  revision: number
  writtenAt: number
  writerId: string
}

interface StoragePayloadV3 {
  schemaVersion: 3
  notes: Note[]
  revision?: number
  writtenAt?: number
  writerId?: string
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
  version: SnapshotVersion
}

export interface NotesSyncMeta {
  reason: 'external_update' | 'external_clear'
  droppedPendingLocal: boolean
}

export type StorageIssueKind = 'storage_unavailable' | 'save_failed' | 'migration_rewrite_failed'

export interface StorageIssue {
  kind: StorageIssueKind
  at: number
}

type StorageIssueListener = (issue: StorageIssue) => void
const storageIssueListeners = new Set<StorageIssueListener>()

function emitStorageIssue(kind: StorageIssueKind): void {
  if (storageIssueListeners.size === 0) return
  const issue: StorageIssue = { kind, at: Date.now() }
  for (const listener of storageIssueListeners) {
    listener(issue)
  }
}

function getLocalStorageSafely(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch (error) {
    if (!hasLoggedStorageUnavailable) {
      hasLoggedStorageUnavailable = true
      console.error('[StarNode][storage-unavailable]', error)
    }
    emitStorageIssue('storage_unavailable')
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function createSessionWriterId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `writer-${Math.random().toString(36).slice(2)}`
}

function compareSnapshotVersion(left: SnapshotVersion, right: SnapshotVersion): number {
  if (left.revision !== right.revision) return left.revision - right.revision
  if (left.writtenAt !== right.writtenAt) return left.writtenAt - right.writtenAt
  if (left.writerId === right.writerId) return 0
  return left.writerId > right.writerId ? 1 : -1
}

function parseSnapshotVersion(value: Record<string, unknown>): SnapshotVersion {
  const revision = typeof value.revision === 'number' && Number.isFinite(value.revision) ? Math.max(0, value.revision) : 0
  const writtenAt = typeof value.writtenAt === 'number' && Number.isFinite(value.writtenAt) ? Math.max(0, value.writtenAt) : 0
  const writerId = typeof value.writerId === 'string' ? value.writerId : ''

  return {
    revision,
    writtenAt,
    writerId
  }
}

function buildPayload(notes: Note[], version: SnapshotVersion): StoragePayloadV3 {
  return {
    schemaVersion: SCHEMA_VERSION,
    notes,
    revision: version.revision,
    writtenAt: version.writtenAt,
    writerId: version.writerId
  }
}

interface NormalizeNoteResult {
  note: Note | null
  changed: boolean
}

function readPersistedVersion(): SnapshotVersion {
  const storage = getLocalStorageSafely()
  if (!storage) return EMPTY_VERSION
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_VERSION
    return parsePayload(raw).version
  } catch {
    return EMPTY_VERSION
  }
}

function createNextVersion(baseVersion: SnapshotVersion): SnapshotVersion {
  return {
    revision: baseVersion.revision + 1,
    writtenAt: Date.now(),
    writerId: SESSION_WRITER_ID
  }
}

function normalizeNoteWithMeta(value: unknown): NormalizeNoteResult {
  if (!isRecord(value)) {
    return {
      note: null,
      changed: true
    }
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.content !== 'string' ||
    typeof value.planetId !== 'string'
  ) {
    return {
      note: null,
      changed: true
    }
  }

  const normalizedPlanetId = VALID_PLANET_IDS.has(value.planetId) ? value.planetId : FALLBACK_PLANET_ID
  const normalizedUpdatedAt =
    typeof value.updatedAt === 'string' && Number.isFinite(new Date(value.updatedAt).getTime())
      ? value.updatedAt
      : FALLBACK_UPDATED_AT

  const normalizedTags = Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === 'string') : []
  const normalizedFrozenAt = typeof value.frozenAt === 'string' ? value.frozenAt : null
  const note: Note = {
    id: value.id,
    title: value.title,
    content: value.content,
    tags: normalizedTags,
    // 非法星球 ID 会导致笔记在 UI 中“隐形”，这里统一兜底到默认星球。
    planetId: normalizedPlanetId,
    // 非法时间会破坏排序稳定性，统一回退到固定时间戳。
    updatedAt: normalizedUpdatedAt,
    isFrozen: value.isFrozen === true,
    frozenAt: normalizedFrozenAt
  }

  const rawTags = Array.isArray(value.tags) ? value.tags : []
  const changed =
    normalizedPlanetId !== value.planetId ||
    normalizedUpdatedAt !== value.updatedAt ||
    normalizedFrozenAt !== value.frozenAt ||
    rawTags.length !== normalizedTags.length

  return {
    note,
    changed
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
    .map((note) => normalizeNoteWithMeta(note).note)
    .filter((note): note is Note => note !== null)
}

function normalizeNotesWithRewrite(rawNotes: unknown[]): { notes: Note[]; hadRewrite: boolean } {
  let hadRewrite = false
  const notes: Note[] = []

  for (const rawNote of rawNotes) {
    const { note, changed } = normalizeNoteWithMeta(rawNote)
    if (!note || changed) hadRewrite = true
    if (note) notes.push(note)
  }

  return { notes, hadRewrite }
}

function parsePayload(raw: string): ParsedStorageResult {
  const parsed = JSON.parse(raw) as LegacyPayload

  // 兼容最早期纯数组结构（无 schemaVersion）
  if (Array.isArray(parsed)) {
    const v2 = migrateV1ToV2(parsed as LegacyNoteV1[])
    return {
      notes: migrateV2ToV3(v2),
      needsRewrite: true,
      version: EMPTY_VERSION
    }
  }

  if (!isRecord(parsed)) {
    return { notes: [], needsRewrite: true, version: EMPTY_VERSION }
  }

  const schemaVersion = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1
  const rawNotes = Array.isArray(parsed.notes) ? parsed.notes : []
  const version = parseSnapshotVersion(parsed)

  if (schemaVersion <= 1) {
    const v2 = migrateV1ToV2(rawNotes as LegacyNoteV1[])
    return {
      notes: migrateV2ToV3(v2),
      needsRewrite: true,
      version
    }
  }

  if (schemaVersion === 2) {
    return {
      notes: migrateV2ToV3(rawNotes as LegacyNoteV2[]),
      needsRewrite: true,
      version
    }
  }

  const normalized = normalizeNotesWithRewrite(rawNotes)
  return {
    needsRewrite: schemaVersion !== SCHEMA_VERSION || normalized.hadRewrite,
    notes: normalized.notes,
    version
  }
}

export function loadNotes(): Note[] {
  const storage = getLocalStorageSafely()
  if (!storage) return []

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const payload = parsePayload(raw)

    // 读时迁移，确保后续写入统一为最新版本。
    if (payload.needsRewrite) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(buildPayload(payload.notes, payload.version)))
      } catch (error) {
        // 迁移回写失败不应影响读取结果，避免把可用快照误判为空。
        console.error('[StarNode][storage-migration-rewrite-failed]', error)
        emitStorageIssue('migration_rewrite_failed')
      }
    }

    return payload.notes
  } catch {
    return []
  }
}

export function hasNotesSnapshot(): boolean {
  const storage = getLocalStorageSafely()
  if (!storage) return false
  try {
    return storage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

function flushNotes(): void {
  if (typeof window === 'undefined') {
    pendingSaveTimer = null
    return
  }
  if (!pendingNotes) {
    pendingSaveTimer = null
    return
  }

  const storage = getLocalStorageSafely()
  if (!storage) {
    pendingSaveTimer = null
    return
  }

  const persistedVersion = readPersistedVersion()
  const nextVersion = createNextVersion(persistedVersion)
  const payload = buildPayload(pendingNotes, nextVersion)

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload))
    pendingNotes = null
  } catch (error) {
    // localStorage 可能因配额耗尽、隐私模式策略等原因写入失败。
    // 这里必须吞掉异常，避免定时器回调把整个应用打崩；
    // 并保留 pendingNotes，等待后续用户操作触发再次保存。
    console.error('[StarNode][storage-save-failed]', error)
    emitStorageIssue('save_failed')
  }
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

function clearPendingSave(): void {
  if (typeof window === 'undefined') return
  if (pendingSaveTimer !== null) {
    window.clearTimeout(pendingSaveTimer)
  }
  pendingSaveTimer = null
  pendingNotes = null
}

function cloneNotesSnapshot(notes: Note[]): Note[] {
  return notes.map((note) => ({
    ...note,
    tags: [...note.tags]
  }))
}

export function saveNotes(notes: Note[]): void {
  if (typeof window === 'undefined') return
  if (!getLocalStorageSafely()) return

  bindLifecycleFlush()
  // 持久化层应持有输入快照，而不是业务层可变引用。
  // 否则在 flush 触发前若上游数组被原地修改，落盘内容会出现“时间穿越”。
  pendingNotes = cloneNotesSnapshot(notes)
  if (pendingSaveTimer !== null) {
    window.clearTimeout(pendingSaveTimer)
  }

  pendingSaveTimer = window.setTimeout(() => {
    flushNotes()
  }, SAVE_THROTTLE_MS)
}

function subscribeNotesInternal(onChange: (notes: Note[], meta: NotesSyncMeta) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const storage = getLocalStorageSafely()
  if (!storage) return () => {}

  const handler = (event: StorageEvent) => {
    if (event.storageArea && event.storageArea !== storage) return
    // key === null 代表外部标签页调用了 localStorage.clear()，需要回收本地状态。
    if (event.key !== STORAGE_KEY && event.key !== null) return

    // 仅处理其他标签页变更；当前标签页写入不会触发该事件。
    if (event.key === null || !event.newValue) {
      const droppedPendingLocal = pendingNotes !== null
      // 跨标签页一致性原则：持久化层是单一事实源。
      // 外部已删除/清空快照时，必须丢弃本地 pending save，
      // 避免稍后 flush 把旧数据“复活”。
      clearPendingSave()
      onChange([], {
        reason: 'external_clear',
        droppedPendingLocal
      })
      return
    }

    try {
      const incoming = parsePayload(event.newValue)

      // 防御式校验：若事件载荷落后于当前 localStorage 快照，则直接丢弃。
      // 该分支可规避极端时序下的陈旧事件回放。
      const currentRaw = storage.getItem(STORAGE_KEY)
      if (currentRaw) {
        try {
          const current = parsePayload(currentRaw)
          if (compareSnapshotVersion(incoming.version, current.version) < 0) return
        } catch {
          // 当前快照损坏时，跳过陈旧校验，优先采用本次可解析的外部快照恢复一致性。
        }
      }

      const droppedPendingLocal = pendingNotes !== null
      // 仅在确认接收“有效且未过期”的外部快照后才丢弃 pending save。
      // 这样可以避免 malformed/stale 事件误清空本地待落盘数据。
      clearPendingSave()
      onChange(incoming.notes, {
        reason: 'external_update',
        droppedPendingLocal
      })
    } catch {
      // 非法数据直接忽略，避免污染当前会话状态。
    }
  }

  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

export function subscribeNotesWithMeta(onChange: (notes: Note[], meta: NotesSyncMeta) => void): () => void {
  return subscribeNotesInternal(onChange)
}

export function subscribeNotes(onChange: (notes: Note[]) => void): () => void {
  return subscribeNotesInternal((notes) => onChange(notes))
}

export function subscribeStorageIssues(onIssue: StorageIssueListener): () => void {
  storageIssueListeners.add(onIssue)
  return () => {
    storageIssueListeners.delete(onIssue)
  }
}
