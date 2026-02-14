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
  const handleBatchMove = (selectedNoteIds: string[], targetPlanetId: string) => {
    const movedCount = deps.moveNotes(selectedNoteIds, targetPlanetId)
    if (movedCount === 0) {
      deps.notify('没有可迁移的笔记')
      return
    }

    deps.notify(`已迁移 ${movedCount} 条笔记`)
    deps.clearSelection()
  }

  const handleBatchFreeze = (selectedNoteIds: string[]) => {
    const freezeCount = deps.setNotesFrozen(selectedNoteIds, true)
    if (freezeCount === 0) {
      deps.notify('没有可冰封的笔记')
      return
    }

    deps.notify(`已冰封 ${freezeCount} 条笔记`)
    deps.clearSelection()
  }

  const handleBatchUnfreeze = (selectedNoteIds: string[]) => {
    const unfreezeCount = deps.setNotesFrozen(selectedNoteIds, false)
    if (unfreezeCount === 0) {
      deps.notify('没有可解冻的笔记')
      return
    }

    deps.notify(`已解冻 ${unfreezeCount} 条笔记`)
    deps.clearSelection()
  }

  const handleBatchDelete = (selectedNoteIds: string[]) => {
    // 只按“当前仍存在”的笔记确认数量，避免提示与真实结果不一致。
    const deletableCount = selectedNoteIds.filter((id) => deps.selectedNoteMap.has(id)).length
    if (deletableCount === 0) {
      deps.notify('没有可删除的笔记')
      return
    }

    const ok = deps.confirm(`确认删除选中的 ${deletableCount} 条笔记吗？此操作可撤销一次。`)
    if (!ok) return

    const deletedCount = deps.deleteNotes(selectedNoteIds)
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
