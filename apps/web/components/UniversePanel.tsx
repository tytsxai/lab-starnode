'use client'

import { useEffect, useMemo, useState } from 'react'
import { calculatePlanetLinks, calculatePlanetStats, getPlanetOptions } from '@starnode/core'
import { PlanetCanvas } from '@starnode/renderer'
import { useNoteStore } from '../lib/useNoteStore'
import { LinkPanel } from './LinkPanel'

const PLANET_OPTIONS = getPlanetOptions()

export function UniversePanel() {
  const notes = useNoteStore((state) => state.notes)
  const selectedPlanetId = useNoteStore((state) => state.selectedPlanetId)
  const setSelectedPlanetId = useNoteStore((state) => state.setSelectedPlanetId)
  const editingNoteId = useNoteStore((state) => state.editingNoteId)
  const deleteNote = useNoteStore((state) => state.deleteNote)
  const undoSnapshot = useNoteStore((state) => state.undoSnapshot)
  const undoLastAction = useNoteStore((state) => state.undoLastAction)
  const startEditNote = useNoteStore((state) => state.startEditNote)
  const deleteNotes = useNoteStore((state) => state.deleteNotes)
  const moveNotes = useNoteStore((state) => state.moveNotes)
  const setNotesFrozen = useNoteStore((state) => state.setNotesFrozen)
  const [showAllLinks, setShowAllLinks] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'updated_desc' | 'title_asc'>('updated_desc')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [visibilityMode, setVisibilityMode] = useState<'active' | 'all' | 'frozen'>('active')
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([])
  const [batchTargetPlanetId, setBatchTargetPlanetId] = useState('p-tech')
  const [toast, setToast] = useState<string | null>(null)

  const planets = useMemo(() => calculatePlanetStats(notes), [notes])
  const links = useMemo(() => calculatePlanetLinks(notes), [notes])
  const planetNameMap = useMemo(() => {
    return new Map(planets.map((planet) => [planet.id, planet.name]))
  }, [planets])
  const selectedNotes = useMemo(
    () => notes.filter((note) => note.planetId === selectedPlanetId),
    [notes, selectedPlanetId]
  )
  const selectedNoteMap = useMemo(() => {
    return new Map(selectedNotes.map((note) => [note.id, note]))
  }, [selectedNotes])
  const activeCount = useMemo(() => selectedNotes.filter((note) => !note.isFrozen).length, [selectedNotes])
  const frozenCount = selectedNotes.length - activeCount
  const availableTags = useMemo(() => {
    const tagCountMap = new Map<string, number>()
    for (const note of selectedNotes) {
      if (visibilityMode === 'active' && note.isFrozen) continue
      if (visibilityMode === 'frozen' && !note.isFrozen) continue
      for (const tag of note.tags) {
        tagCountMap.set(tag, (tagCountMap.get(tag) ?? 0) + 1)
      }
    }
    return Array.from(tagCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  }, [selectedNotes, visibilityMode])
  const filteredNotes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const list = selectedNotes.filter((note) => {
      if (visibilityMode === 'active' && note.isFrozen) return false
      if (visibilityMode === 'frozen' && !note.isFrozen) return false
      if (activeTag && !note.tags.includes(activeTag)) return false
      if (!term) return true
      const hitTitle = note.title.toLowerCase().includes(term)
      const hitContent = note.content.toLowerCase().includes(term)
      const hitTag = note.tags.some((tag) => tag.toLowerCase().includes(term))
      return hitTitle || hitContent || hitTag
    })

    return [...list].sort((a, b) => {
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [activeTag, searchTerm, selectedNotes, sortBy, visibilityMode])
  const visibleLinks = useMemo(() => {
    if (showAllLinks) return links
    return links.filter(
      (link) => link.sourcePlanetId === selectedPlanetId || link.targetPlanetId === selectedPlanetId
    )
  }, [links, selectedPlanetId, showAllLinks])
  const hasSelected = selectedNoteIds.length > 0

  useEffect(() => {
    setSelectedNoteIds([])
    const fallback = PLANET_OPTIONS.find((planet) => planet.id !== selectedPlanetId)?.id ?? selectedPlanetId
    setBatchTargetPlanetId(fallback)
  }, [selectedPlanetId])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds((prev) => {
      if (prev.includes(noteId)) return prev.filter((id) => id !== noteId)
      return [...prev, noteId]
    })
  }

  const clearSelection = () => setSelectedNoteIds([])
  const selectAllFiltered = () => setSelectedNoteIds(filteredNotes.map((note) => note.id))

  return (
    <section className="canvas-wrap">
      <PlanetCanvas
        planets={planets}
        links={visibleLinks}
        selectedPlanetId={selectedPlanetId}
        onSelectPlanet={setSelectedPlanetId}
      />
      <div className="overlay">
        <h3 className="overlay-title">当前星球笔记（总计 {selectedNotes.length} / 活跃 {activeCount} / 冰封 {frozenCount}）</h3>
        {hasSelected && (
          <div className="batch-bar">
            <div className="batch-text">已选择 {selectedNoteIds.length} 条</div>
            <select
              className="select compact-input"
              value={batchTargetPlanetId}
              onChange={(event) => setBatchTargetPlanetId(event.target.value)}
            >
              {PLANET_OPTIONS.map((planet) => (
                <option key={planet.id} value={planet.id}>
                  迁移到：{planet.name}
                </option>
              ))}
            </select>
            <div className="batch-actions">
              <button
                className="mini-button"
                onClick={() => {
                  const movedCount = selectedNoteIds.reduce((count, id) => {
                    const note = selectedNoteMap.get(id)
                    if (!note) return count
                    return note.planetId === batchTargetPlanetId ? count : count + 1
                  }, 0)
                  if (movedCount === 0) {
                    setToast('没有可迁移的笔记')
                    return
                  }
                  moveNotes(selectedNoteIds, batchTargetPlanetId)
                  setToast(`已迁移 ${movedCount} 条笔记`)
                  clearSelection()
                }}
              >
                批量迁移
              </button>
              <button
                className="mini-button"
                onClick={() => {
                  const freezeCount = selectedNoteIds.reduce((count, id) => {
                    const note = selectedNoteMap.get(id)
                    if (!note) return count
                    return note.isFrozen ? count : count + 1
                  }, 0)
                  if (freezeCount === 0) {
                    setToast('没有可冰封的笔记')
                    return
                  }
                  setNotesFrozen(selectedNoteIds, true)
                  setToast(`已冰封 ${freezeCount} 条笔记`)
                  clearSelection()
                }}
              >
                批量冰封
              </button>
              <button
                className="mini-button"
                onClick={() => {
                  const unfreezeCount = selectedNoteIds.reduce((count, id) => {
                    const note = selectedNoteMap.get(id)
                    if (!note) return count
                    return note.isFrozen ? count + 1 : count
                  }, 0)
                  if (unfreezeCount === 0) {
                    setToast('没有可解冻的笔记')
                    return
                  }
                  setNotesFrozen(selectedNoteIds, false)
                  setToast(`已解冻 ${unfreezeCount} 条笔记`)
                  clearSelection()
                }}
              >
                批量解冻
              </button>
              <button
                className="danger-button"
                onClick={() => {
                  const deletableCount = selectedNoteIds.reduce(
                    (count, id) => (selectedNoteMap.has(id) ? count + 1 : count),
                    0
                  )
                  if (deletableCount === 0) {
                    setToast('没有可删除的笔记')
                    return
                  }
                  const ok = window.confirm(`确认删除选中的 ${selectedNoteIds.length} 条笔记吗？此操作可撤销一次。`)
                  if (!ok) return
                  deleteNotes(selectedNoteIds)
                  setToast(`已删除 ${deletableCount} 条笔记`)
                  clearSelection()
                }}
              >
                批量删除
              </button>
              <button className="mini-button" onClick={clearSelection}>
                取消多选
              </button>
            </div>
          </div>
        )}
        {undoSnapshot && (
          <div className="undo-bar">
            <div className="batch-text">{undoSnapshot.message}</div>
            <button
              className="mini-button"
              onClick={() => {
                undoLastAction()
                setToast('已撤销上一步')
              }}
            >
              撤销上一步
            </button>
          </div>
        )}
        <input
          className="input compact-input"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="搜索标题 / 内容 / 标签"
        />
        <select className="select compact-input" value={sortBy} onChange={(event) => setSortBy(event.target.value as 'updated_desc' | 'title_asc')}>
          <option value="updated_desc">按更新时间（新→旧）</option>
          <option value="title_asc">按标题（A→Z）</option>
        </select>
        <div className="quick-actions">
          <button
            className={`mini-button ${visibilityMode === 'active' ? 'mini-button-active' : ''}`}
            onClick={() => setVisibilityMode('active')}
          >
            只看活跃
          </button>
          <button
            className={`mini-button ${visibilityMode === 'all' ? 'mini-button-active' : ''}`}
            onClick={() => setVisibilityMode('all')}
          >
            查看全部
          </button>
          <button
            className={`mini-button ${visibilityMode === 'frozen' ? 'mini-button-active' : ''}`}
            onClick={() => setVisibilityMode('frozen')}
          >
            只看冰封
          </button>
        </div>
        <div className="tag-chip-wrap">
          <button
            className={`tag-chip ${activeTag === null ? 'tag-chip-active' : ''}`}
            onClick={() => setActiveTag(null)}
          >
            全部标签
          </button>
          {availableTags.map(([tag, count]) => (
            <button
              key={tag}
              className={`tag-chip ${activeTag === tag ? 'tag-chip-active' : ''}`}
              onClick={() => setActiveTag(tag)}
            >
              #{tag} ({count})
            </button>
          ))}
        </div>
        <div className="quick-actions">
          <button className="mini-button" onClick={selectAllFiltered} disabled={filteredNotes.length === 0}>
            全选过滤结果（{filteredNotes.length}）
          </button>
          <button className="mini-button" onClick={clearSelection} disabled={!hasSelected}>
            清空选择
          </button>
          <button
            className="mini-button"
            onClick={() => {
              setSearchTerm('')
              setActiveTag(null)
            }}
          >
            重置过滤
          </button>
        </div>
        <div className="overlay-list">
          {filteredNotes.slice(0, 8).map((note) => (
            <div
              key={note.id}
              className={`overlay-item ${editingNoteId === note.id ? 'overlay-item-active' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedNoteIds.includes(note.id)}
                onChange={() => toggleNoteSelection(note.id)}
              />
              <div className="overlay-note-main">
                <button
                  className="link-button overlay-note-title"
                  onClick={() => {
                    startEditNote(note.id)
                    setSelectedPlanetId(note.planetId)
                  }}
                >
                  {note.title}
                </button>
                <div className="overlay-subline">
                  状态：{note.isFrozen ? '已冰封' : '活跃'} / 标签：{note.tags.length > 0 ? note.tags.join(', ') : '无'} / 更新于{' '}
                  {new Date(note.updatedAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <button
                className="mini-button"
                onClick={() => {
                  const nextFrozen = !note.isFrozen
                  setNotesFrozen([note.id], nextFrozen)
                  setToast(nextFrozen ? '已冰封 1 条笔记' : '已解冻 1 条笔记')
                }}
              >
                {note.isFrozen ? '解冻' : '冰封'}
              </button>
              <button
                className="danger-button"
                onClick={() => {
                  const ok = window.confirm('确认删除这条笔记吗？此操作可撤销一次。')
                  if (!ok) return
                  deleteNote(note.id)
                  setToast('已删除 1 条笔记')
                }}
              >
                删除
              </button>
            </div>
          ))}
          {selectedNotes.length === 0 && <div className="overlay-empty">这里还没有笔记，先写下第一条。</div>}
          {selectedNotes.length > 0 && filteredNotes.length === 0 && (
            <div className="overlay-empty">没有匹配的结果，换个关键词试试。</div>
          )}
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
      <LinkPanel
        links={visibleLinks}
        showAllLinks={showAllLinks}
        onToggleShowAllLinks={() => setShowAllLinks((prev) => !prev)}
        planetNameMap={planetNameMap}
        onSelectPlanet={setSelectedPlanetId}
      />
    </section>
  )
}
