import { PLANET_CONFIGS, normalizeTags, type Note } from '@starnode/core'
import { countExistingNotes, countFreezableNotes, countMovableNotes, mapNotesBySelection } from '../batchHelpers'
import type { AddNoteInput, NoteState, UndoSnapshot, UpdateNoteInput } from './types'

type NoteStateSnapshot = Pick<NoteState, 'notes' | 'selectedPlanetId' | 'draftPlanetId' | 'editingNoteId' | 'undoSnapshot'>

interface CommandContext {
  now: () => string
  uuid: () => string
}

interface CommandResult {
  patch: Partial<NoteStateSnapshot>
  changedCount: number
  shouldPersist: boolean
}

const DEFAULT_PLANET_ID = PLANET_CONFIGS[0]?.id ?? 'p-life'
const VALID_PLANET_IDS = new Set(PLANET_CONFIGS.map((planet) => planet.id))

function toUndoSnapshot(state: NoteStateSnapshot, message: string): UndoSnapshot {
  return {
    notes: state.notes,
    selectedPlanetId: state.selectedPlanetId,
    draftPlanetId: state.draftPlanetId,
    editingNoteId: state.editingNoteId,
    message
  }
}

function noChangeResult(): CommandResult {
  return {
    patch: {},
    changedCount: 0,
    shouldPersist: false
  }
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false
  }
  return true
}

function resolvePlanetId(inputPlanetId: string, fallbackPlanetId: string): string {
  return VALID_PLANET_IDS.has(inputPlanetId) ? inputPlanetId : fallbackPlanetId
}

export function addNoteCommand(state: NoteStateSnapshot, input: AddNoteInput, ctx: CommandContext): CommandResult {
  if (!input.title.trim() && !input.content.trim()) return noChangeResult()
  const fallbackPlanetId = resolvePlanetId(state.draftPlanetId, resolvePlanetId(state.selectedPlanetId, DEFAULT_PLANET_ID))
  const nextPlanetId = resolvePlanetId(input.planetId, fallbackPlanetId)

  const next: Note = {
    id: ctx.uuid(),
    title: input.title.trim() || '未命名笔记',
    content: input.content,
    tags: normalizeTags(input.tagsRaw),
    planetId: nextPlanetId,
    updatedAt: ctx.now(),
    isFrozen: false,
    frozenAt: null
  }

  return {
    patch: {
      notes: [next, ...state.notes],
      undoSnapshot: null
    },
    changedCount: 1,
    shouldPersist: true
  }
}

export function updateNoteCommand(
  state: NoteStateSnapshot,
  input: UpdateNoteInput,
  ctx: CommandContext
): CommandResult {
  const target = state.notes.find((note) => note.id === input.noteId)
  if (!target) return noChangeResult()
  const nextPlanetId = resolvePlanetId(input.planetId, target.planetId)
  const nextTitle = input.title.trim() || '未命名笔记'
  const nextContent = input.content
  const nextTags = normalizeTags(input.tagsRaw)

  const noteContentUnchanged =
    target.title === nextTitle &&
    target.content === nextContent &&
    target.planetId === nextPlanetId &&
    areStringArraysEqual(target.tags, nextTags)

  // 仅 UI 状态发生变化（退出编辑），不需要触发持久化写入。
  if (noteContentUnchanged) {
    return {
      patch: {
        draftPlanetId: nextPlanetId,
        editingNoteId: null,
        undoSnapshot: null
      },
      changedCount: 1,
      shouldPersist: false
    }
  }

  const nextNotes = state.notes.map((note) => {
    if (note.id !== input.noteId) return note
    return {
      ...note,
      title: nextTitle,
      content: nextContent,
      tags: nextTags,
      planetId: nextPlanetId,
      updatedAt: ctx.now()
    }
  })

  return {
    patch: {
      notes: nextNotes,
      draftPlanetId: nextPlanetId,
      editingNoteId: null,
      undoSnapshot: null
    },
    changedCount: 1,
    shouldPersist: true
  }
}

export function deleteNoteCommand(state: NoteStateSnapshot, noteId: string): CommandResult {
  const exists = state.notes.some((note) => note.id === noteId)
  if (!exists) return noChangeResult()

  const nextNotes = state.notes.filter((note) => note.id !== noteId)

  return {
    patch: {
      notes: nextNotes,
      editingNoteId: state.editingNoteId === noteId ? null : state.editingNoteId,
      undoSnapshot: toUndoSnapshot(state, '已删除 1 条笔记')
    },
    changedCount: 1,
    shouldPersist: true
  }
}

export function deleteNotesCommand(state: NoteStateSnapshot, noteIds: string[]): CommandResult {
  if (noteIds.length === 0) return noChangeResult()

  const affectedCount = countExistingNotes(state.notes, noteIds)
  if (affectedCount === 0) return noChangeResult()

  const idSet = new Set(noteIds)
  const nextNotes = state.notes.filter((note) => !idSet.has(note.id))

  return {
    patch: {
      notes: nextNotes,
      editingNoteId: state.editingNoteId && idSet.has(state.editingNoteId) ? null : state.editingNoteId,
      undoSnapshot: toUndoSnapshot(state, `已删除 ${affectedCount} 条笔记`)
    },
    changedCount: affectedCount,
    shouldPersist: true
  }
}

export function moveNotesCommand(
  state: NoteStateSnapshot,
  noteIds: string[],
  targetPlanetId: string,
  ctx: Pick<CommandContext, 'now'>
): CommandResult {
  if (noteIds.length === 0) return noChangeResult()
  if (!VALID_PLANET_IDS.has(targetPlanetId)) return noChangeResult()

  const affectedCount = countMovableNotes(state.notes, noteIds, targetPlanetId)
  if (affectedCount === 0) return noChangeResult()

  const now = ctx.now()
  const { notes: nextNotes } = mapNotesBySelection(state.notes, noteIds, (note) => {
    if (note.planetId === targetPlanetId) return note
    return {
      ...note,
      planetId: targetPlanetId,
      updatedAt: now
    }
  })

  return {
    patch: {
      notes: nextNotes,
      selectedPlanetId: targetPlanetId,
      undoSnapshot: toUndoSnapshot(state, `已迁移 ${affectedCount} 条笔记`)
    },
    changedCount: affectedCount,
    shouldPersist: true
  }
}

export function setNotesFrozenCommand(
  state: NoteStateSnapshot,
  noteIds: string[],
  isFrozen: boolean,
  ctx: Pick<CommandContext, 'now'>
): CommandResult {
  if (noteIds.length === 0) return noChangeResult()

  const affectedCount = countFreezableNotes(state.notes, noteIds, isFrozen)
  if (affectedCount === 0) return noChangeResult()

  const now = ctx.now()
  const { notes: nextNotes } = mapNotesBySelection(state.notes, noteIds, (note) => {
    if (note.isFrozen === isFrozen) return note
    return {
      ...note,
      isFrozen,
      frozenAt: isFrozen ? now : null,
      updatedAt: now
    }
  })

  return {
    patch: {
      notes: nextNotes,
      undoSnapshot: toUndoSnapshot(state, isFrozen ? `已冰封 ${affectedCount} 条笔记` : `已解冻 ${affectedCount} 条笔记`)
    },
    changedCount: affectedCount,
    shouldPersist: true
  }
}

export function undoLastActionCommand(state: NoteStateSnapshot): CommandResult {
  if (!state.undoSnapshot) return noChangeResult()

  return {
    patch: {
      notes: state.undoSnapshot.notes,
      selectedPlanetId: state.undoSnapshot.selectedPlanetId,
      draftPlanetId: state.undoSnapshot.draftPlanetId,
      editingNoteId: state.undoSnapshot.editingNoteId,
      undoSnapshot: null
    },
    changedCount: 1,
    shouldPersist: true
  }
}
