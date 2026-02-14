import { describe, expect, it, vi } from 'vitest'
import type { Note } from '@starnode/core'
import { useBatchActions } from './useBatchActions'

function createNote(id: string): Note {
  return {
    id,
    title: id,
    content: 'content',
    tags: [],
    planetId: 'p-life',
    updatedAt: '2026-02-14T00:00:00.000Z',
    isFrozen: false,
    frozenAt: null
  }
}

describe('useBatchActions', () => {
  it('批量删除确认文案应使用可删除数量，且提示应与实际删除数一致', () => {
    const confirm = vi.fn(() => true)
    const notify = vi.fn()
    const clearSelection = vi.fn()
    const deleteNotes = vi.fn(() => 1)
    const selectedNoteMap = new Map<string, Note>([['n-1', createNote('n-1')]])

    const { handleBatchDelete } = useBatchActions({
      selectedNoteMap,
      moveNotes: vi.fn(),
      setNotesFrozen: vi.fn(),
      deleteNotes,
      clearSelection,
      notify,
      confirm
    })

    handleBatchDelete(['n-1', 'ghost'])

    expect(confirm).toHaveBeenCalledWith('确认删除选中的 1 条笔记吗？此操作可撤销一次。')
    expect(deleteNotes).toHaveBeenCalledWith(['n-1', 'ghost'])
    expect(notify).toHaveBeenCalledWith('已删除 1 条笔记')
    expect(clearSelection).toHaveBeenCalledTimes(1)
  })

  it('当删除动作实际无变化时，应给出 no-op 提示并保留选择', () => {
    const confirm = vi.fn(() => true)
    const notify = vi.fn()
    const clearSelection = vi.fn()
    const deleteNotes = vi.fn(() => 0)
    const selectedNoteMap = new Map<string, Note>([['n-1', createNote('n-1')]])

    const { handleBatchDelete } = useBatchActions({
      selectedNoteMap,
      moveNotes: vi.fn(),
      setNotesFrozen: vi.fn(),
      deleteNotes,
      clearSelection,
      notify,
      confirm
    })

    handleBatchDelete(['n-1'])

    expect(notify).toHaveBeenCalledWith('没有可删除的笔记')
    expect(clearSelection).not.toHaveBeenCalled()
  })
})
