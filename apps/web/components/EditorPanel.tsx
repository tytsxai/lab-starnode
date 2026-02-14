'use client'

import { useEffect, useMemo, useState } from 'react'
import { calculatePlanetStats, getPlanetOptions } from '@starnode/core'
import { useNoteStore } from '../lib/useNoteStore'
import { getKeywordPreview, parseTags, validateNoteInput, TAG_MAX_COUNT, TITLE_MAX_LENGTH } from '../lib/noteForm'

const PLANET_OPTIONS = getPlanetOptions()
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
  const parsedTags = useMemo(() => parseTags(tagsRaw), [tagsRaw])
  const keywordPreview = useMemo(() => getKeywordPreview({ title, content }, 6), [content, title])
  const canSubmit = useMemo(() => {
    return validateNoteInput({ title, content, tagsRaw }).valid
  }, [content, tagsRaw, title])

  useEffect(() => {
    if (!editingNote) return
    setTitle(editingNote.title)
    setContent(editingNote.content)
    setTagsRaw(editingNote.tags.join(','))
    setSelectedPlanetId(editingNote.planetId)
    setError('')
  }, [editingNote, setSelectedPlanetId])

  const submit = () => {
    const validation = validateNoteInput({ title, content, tagsRaw })
    if (!validation.valid) {
      setError(validation.message)
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
        <div className="hint-line">关键词预览：</div>
        <div className="tag-chip-wrap">
          {keywordPreview.map((keyword) => (
            <span key={keyword} className="tag-chip">
              {keyword}
            </span>
          ))}
          {keywordPreview.length === 0 && <span className="overlay-subline">输入内容后自动提取</span>}
        </div>
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
