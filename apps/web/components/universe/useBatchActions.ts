'use client'

import type { Note } from '@starnode/core'

interface BatchActionDeps {
  selectedNoteMap: Map<string, Note>
  moveNotes: (noteIds: string[], targetPlanetId: string) => number
  setNotesFrozen: (noteIds: string[], isFrozen: boolean) => number
  deleteNotes: (noteIds: string[]) => number
  clearSelection: () => void
  notify: (message: string) => void
  confirm: (message: string) => boolean
}

export function useBatchActions(deps: BatchActionDeps) {
  const pickExistingIds = (selectedNoteIds: string[]): string[] =>
    selectedNoteIds.filter((id) => deps.selectedNoteMap.has(id))

  const handleBatchMove = (selectedNoteIds: string[], targetPlanetId: string) => {
    const targetIds = pickExistingIds(selectedNoteIds)
    if (targetIds.length === 0) {
      deps.notify('没有可迁移的笔记')
      return
    }

    const movedCount = deps.moveNotes(targetIds, targetPlanetId)
    if (movedCount === 0) {
      deps.notify('没有可迁移的笔记')
      return
    }

    deps.notify(`已迁移 ${movedCount} 条笔记`)
    deps.clearSelection()
  }

  const handleBatchFreeze = (selectedNoteIds: string[]) => {
    const targetIds = pickExistingIds(selectedNoteIds)
    if (targetIds.length === 0) {
      deps.notify('没有可冰封的笔记')
      return
    }

    const freezeCount = deps.setNotesFrozen(targetIds, true)
    if (freezeCount === 0) {
      deps.notify('没有可冰封的笔记')
      return
    }

    deps.notify(`已冰封 ${freezeCount} 条笔记`)
    deps.clearSelection()
  }

  const handleBatchUnfreeze = (selectedNoteIds: string[]) => {
    const targetIds = pickExistingIds(selectedNoteIds)
    if (targetIds.length === 0) {
      deps.notify('没有可解冻的笔记')
      return
    }

    const unfreezeCount = deps.setNotesFrozen(targetIds, false)
    if (unfreezeCount === 0) {
      deps.notify('没有可解冻的笔记')
      return
    }

    deps.notify(`已解冻 ${unfreezeCount} 条笔记`)
    deps.clearSelection()
  }

  const handleBatchDelete = (selectedNoteIds: string[]) => {
    // 只操作“当前仍存在”的笔记，彻底规避陈旧选择集误删风险。
    const targetIds = pickExistingIds(selectedNoteIds)
    if (targetIds.length === 0) {
      deps.notify('没有可删除的笔记')
      return
    }

    const ok = deps.confirm(`确认删除选中的 ${targetIds.length} 条笔记吗？此操作可撤销一次。`)
    if (!ok) return

    const deletedCount = deps.deleteNotes(targetIds)
    if (deletedCount === 0) {
      deps.notify('没有可删除的笔记')
      return
    }

    deps.notify(`已删除 ${deletedCount} 条笔记`)
    deps.clearSelection()
  }

  return {
    handleBatchMove,
    handleBatchFreeze,
    handleBatchUnfreeze,
    handleBatchDelete
  }
}
