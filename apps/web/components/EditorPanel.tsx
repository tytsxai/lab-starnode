'use client'

import { useEffect, useMemo, useState } from 'react'
import { calculatePlanetStats, getPlanetOptions, normalizeTags } from '@starnode/core'
import { useNoteStore } from '../lib/useNoteStore'

const PLANET_OPTIONS = getPlanetOptions()
const TITLE_MAX_LENGTH = 80
const TAG_MAX_COUNT = 10

export function EditorPanel() {
  const notes = useNoteStore((state) => state.notes)
  const addNote = useNoteStore((state) => state.addNote)
  const updateNote = useNoteStore((state) => state.updateNote)
  const editingNoteId = useNoteStore((state) => state.editingNoteId)
  const cancelEditNote = useNoteStore((state) => state.cancelEditNote)
  const selectedPlanetId = useNoteStore((state) => state.selectedPlanetId)
  const setSelectedPlanetId = useNoteStore((state) => state.setSelectedPlanetId)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [error, setError] = useState('')
  const planets = useMemo(() => calculatePlanetStats(notes), [notes])
  const editingNote = useMemo(
    () => notes.find((note) => note.id === editingNoteId) ?? null,
    [notes, editingNoteId]
  )
  const parsedTags = useMemo(() => normalizeTags(tagsRaw), [tagsRaw])
  const canSubmit = useMemo(() => {
    if (!title.trim() && !content.trim()) return false
    if (title.length > TITLE_MAX_LENGTH) return false
    if (parsedTags.length > TAG_MAX_COUNT) return false
    return true
  }, [content, parsedTags.length, title])

  useEffect(() => {
    if (!editingNote) return
    setTitle(editingNote.title)
    setContent(editingNote.content)
    setTagsRaw(editingNote.tags.join(','))
    setSelectedPlanetId(editingNote.planetId)
    setError('')
  }, [editingNote, setSelectedPlanetId])

  const submit = () => {
    if (!title.trim() && !content.trim()) {
      setError('标题和内容不能同时为空。')
      return
    }
    if (title.length > TITLE_MAX_LENGTH) {
      setError(`标题过长，最多 ${TITLE_MAX_LENGTH} 个字符。`)
      return
    }
    if (parsedTags.length > TAG_MAX_COUNT) {
      setError(`标签过多，最多 ${TAG_MAX_COUNT} 个。`)
      return
    }
    setError('')

    if (editingNote) {
      updateNote({ noteId: editingNote.id, title, content, tagsRaw, planetId: selectedPlanetId })
    } else {
      addNote({ title, content, tagsRaw, planetId: selectedPlanetId })
    }
    setTitle('')
    setContent('')
    setTagsRaw('')
  }

  const cancelEdit = () => {
    cancelEditNote()
    setTitle('')
    setContent('')
    setTagsRaw('')
    setError('')
  }

  return (
    <aside className="panel">
      <div className="card">
        <h2 className="title">StarNode / 写作舱{editingNote ? '（编辑模式）' : ''}</h2>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" />
        <div className="hint-line">标题长度：{title.length} / {TITLE_MAX_LENGTH}</div>
        <textarea
          className="textarea"
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
          }}
          placeholder="记录你的想法..."
        />
        <input
          className="input"
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="标签（逗号分隔，如：ai,writing,research）"
        />
        <div className="hint-line">标签数量：{parsedTags.length} / {TAG_MAX_COUNT}</div>
        <select className="select" value={selectedPlanetId} onChange={(e) => setSelectedPlanetId(e.target.value)}>
          {PLANET_OPTIONS.map((planet) => (
            <option key={planet.id} value={planet.id}>
              {planet.name}
            </option>
          ))}
        </select>
        <button className="button" onClick={submit} disabled={!canSubmit}>
          {editingNote ? '保存修改' : '写入宇宙'}
        </button>
        {editingNote && (
          <button className="button secondary-button" onClick={cancelEdit}>
            取消编辑
          </button>
        )}
        {error && <div className="error-text">{error}</div>}
      </div>
      <div className="card">
        <h3 className="title">星球概览</h3>
        {planets.map((planet) => (
          <div key={planet.id}>
            {planet.name} / 笔记 {planet.noteCount} / 阶段 {planet.stage}
          </div>
        ))}
      </div>
    </aside>
  )
}
