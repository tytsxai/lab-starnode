'use client'

import type { NoteListOverlayProps } from './types'

export function NoteListOverlay({
  notes,
  selectedNotesCount,
  editingNoteId,
  selectedNoteIds,
  onToggleNoteSelection,
  onStartEdit,
  onToggleFrozen,
  onDeleteNote
}: NoteListOverlayProps) {
  return (
    <div className="overlay-list">
      {notes.slice(0, 50).map((note) => (
        <div key={note.id} className={`overlay-item ${editingNoteId === note.id ? 'active' : ''}`}>
          <input type="checkbox" checked={selectedNoteIds.has(note.id)} onChange={() => onToggleNoteSelection(note.id)} />
          <div className="overlay-note-main">
            <button className="link-button overlay-note-title" onClick={() => onStartEdit(note.id, note.planetId)}>
              {note.title}
            </button>
            <div className="overlay-subline">
              状态：{note.isFrozen ? '已冰封' : '活跃'} / 标签：{note.tags.length > 0 ? note.tags.join(', ') : '无'} / 更新于{' '}
              {new Date(note.updatedAt).toLocaleDateString('zh-CN')}
            </div>
          </div>
          <button className="mini-button" onClick={() => onToggleFrozen(note)}>
            {note.isFrozen ? '解冻' : '冰封'}
          </button>
          <button className="danger-button" onClick={() => onDeleteNote(note.id)}>
            删除
          </button>
        </div>
      ))}
      {selectedNotesCount === 0 && <div className="overlay-empty">这里还没有笔记，先写下第一条。</div>}
      {selectedNotesCount > 0 && notes.length === 0 && <div className="overlay-empty">没有匹配的结果，换个关键词试试。</div>}
    </div>
  )
}
