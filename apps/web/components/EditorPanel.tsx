'use client'

import { useEffect, useMemo, useState } from 'react'
import { getPlanetOptions } from '@starnode/core'
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
  const isFocusMode = useNoteStore((state) => state.isFocusMode)
  const setFocusMode = useNoteStore((state) => state.setFocusMode)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [error, setError] = useState('')

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
    if (editingNote) {
      setTitle(editingNote.title)
      setContent(editingNote.content)
      setTagsRaw(editingNote.tags.join(','))
      setSelectedPlanetId(editingNote.planetId)
      setError('')
      return
    }

    // 目标笔记被删除或不可用时，主动清理编辑表单，避免残留脏状态误提交。
    if (editingNoteId) {
      cancelEditNote()
      setTitle('')
      setContent('')
      setTagsRaw('')
      setError('')
    }
  }, [cancelEditNote, editingNote, editingNoteId, setSelectedPlanetId])

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
    <aside className="hud-sidebar" style={{ left: 0 }}>
      <div className="card">
        <h2 className="title">
          <span>{editingNote ? 'EDITING SIGNAL' : 'NEW TRANSMISSION'}</span>
        </h2>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="SIGNAL TITLE"
          style={{ fontWeight: 600, letterSpacing: '0.05em' }}
        />
        <div className="hint-line">LENGTH: {title.length} / {TITLE_MAX_LENGTH}</div>

        <textarea
          className="textarea"
          rows={12}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
          }}
          placeholder="ENTER MESSAGE CONTENT..."
          style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
        />

        <input
          className="input"
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="TAGS (comma separated)"
          style={{ marginTop: 12 }}
        />
        <div className="hint-line">TAGS: {parsedTags.length} / {TAG_MAX_COUNT}</div>

        <div className="hint-line" style={{ marginTop: 12, textAlign: 'left' }}>DETECTED KEYWORDS:</div>
        <div className="tag-chip-wrap">
          {keywordPreview.map((keyword) => (
            <span key={keyword} className="tag-chip active">
              {keyword}
            </span>
          ))}
          {keywordPreview.length === 0 && <span className="tag-chip" style={{ opacity: 0.5 }}>WAITING FOR INPUT...</span>}
        </div>

        <select
          className="select"
          value={selectedPlanetId}
          onChange={(e) => setSelectedPlanetId(e.target.value)}
          style={{ marginTop: 16 }}
        >
          {PLANET_OPTIONS.map((planet) => (
            <option key={planet.id} value={planet.id}>
              SECTOR: {planet.name}
            </option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="button" onClick={submit} disabled={!canSubmit}>
            {editingNote ? 'UPDATE SIGNAL' : 'BROADCAST'}
          </button>
          {editingNote && (
            <button className="button secondary-button" onClick={cancelEdit}>
              CANCEL
            </button>
          )}
          <button
            className={`button secondary-button ${isFocusMode ? 'active' : ''}`}
            onClick={() => setFocusMode(!isFocusMode)}
            style={{ width: 'auto', paddingLeft: 12, paddingRight: 12 }}
            title="Toggle Focus Mode"
          >
            {isFocusMode ? '⊙' : '○'}
          </button>
        </div>

        {error && <div className="error-text">{error}</div>}
      </div>

      <div className="card" style={{ marginTop: 'auto' }}>
        <div className="hint-line" style={{ textAlign: 'center', opacity: 0.7 }}>
          SYSTEM STATUS: ONLINE <br />
          CONNECTION: SECURE
        </div>
      </div>
    </aside>
  )
}
