import type { Note } from '@starnode/core'

export const seedNotes: Note[] = [
  {
    id: 'n1',
    title: '第一条想法',
    content: '宇宙从一条笔记开始',
    tags: ['daily'],
    planetId: 'p-life',
    updatedAt: new Date().toISOString(),
    isFrozen: false,
    frozenAt: null
  },
  {
    id: 'n2',
    title: '渲染引擎',
    content: 'R3F 负责星球渲染',
    tags: ['tech'],
    planetId: 'p-tech',
    updatedAt: new Date().toISOString(),
    isFrozen: false,
    frozenAt: null
  }
]
