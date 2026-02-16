'use client'

import { useEffect, useMemo, useState } from 'react'
import { calculateUniverseSnapshot, getPlanetOptions } from '@starnode/core'
import { useNoteStore } from '../lib/useNoteStore'
import { LinkPanel } from './LinkPanel'
import { NoteListOverlay } from './universe/NoteListOverlay'
import { useBatchActions } from './universe/useBatchActions'
import { useNoteFilterState } from './universe/useNoteFilterState'
import type { SortBy } from './universe/types'

const PLANET_OPTIONS = getPlanetOptions()

export function UniversePanel() {
  const notes = useNoteStore((state) => state.notes)
  const selectedPlanetId = useNoteStore((state) => state.selectedPlanetId)
  const setSelectedPlanetId = useNoteStore((state) => state.setSelectedPlanetId)
  const editingNoteId = useNoteStore((state) => state.editingNoteId)
  const isFocusMode = useNoteStore((state) => state.isFocusMode)
  const syncNotice = useNoteStore((state) => state.syncNotice)
  const clearSyncNotice = useNoteStore((state) => state.clearSyncNotice)
  const deleteNote = useNoteStore((state) => state.deleteNote)
  const undoSnapshot = useNoteStore((state) => state.undoSnapshot)
  const undoLastAction = useNoteStore((state) => state.undoLastAction)
  const startEditNote = useNoteStore((state) => state.startEditNote)
  const deleteNotes = useNoteStore((state) => state.deleteNotes)
  const moveNotes = useNoteStore((state) => state.moveNotes)
  const setNotesFrozen = useNoteStore((state) => state.setNotesFrozen)
  const { query, setSearchTerm, setSortBy, setActiveTag, setVisibilityMode, resetFilters } = useNoteFilterState()
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([])
  const [batchTargetPlanetId, setBatchTargetPlanetId] = useState('p-tech')
  const [showAllLinks, setShowAllLinks] = useState(false)
  const [linkMode, setLinkMode] = useState<'all' | 'tag' | 'keyword' | 'mixed'>('all')
  const [toast, setToast] = useState<string | null>(null)

  const selectedNotes = useMemo(
    () => notes.filter((note) => note.planetId === selectedPlanetId),
    [notes, selectedPlanetId]
  )
  const availableTags = useMemo(() => {
    const tagCountMap = new Map<string, number>()
    for (const note of selectedNotes) {
      if (query.visibilityMode === 'active' && note.isFrozen) continue
      if (query.visibilityMode === 'frozen' && !note.isFrozen) continue
      for (const tag of note.tags) {
        tagCountMap.set(tag, (tagCountMap.get(tag) ?? 0) + 1)
      }
    }

    return Array.from(tagCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
  }, [query.visibilityMode, selectedNotes])
  const filteredNotes = useMemo(() => {
    const term = query.searchTerm.trim().toLowerCase()
    const list = selectedNotes.filter((note) => {
      if (query.visibilityMode === 'active' && note.isFrozen) return false
      if (query.visibilityMode === 'frozen' && !note.isFrozen) return false
      if (query.activeTag && !note.tags.includes(query.activeTag)) return false
      if (!term) return true

      const hitTitle = note.title.toLowerCase().includes(term)
      const hitContent = note.content.toLowerCase().includes(term)
      const hitTag = note.tags.some((tag) => tag.toLowerCase().includes(term))
      return hitTitle || hitContent || hitTag
    })

    if (query.sortBy === 'title_asc') {
      return [...list].sort((a, b) => a.title.localeCompare(b.title))
    }

    // 预计算时间戳，避免在 comparator 中反复解析时间。
    return list
      .map((note) => {
        const parsedMs = Date.parse(note.updatedAt)
        return {
          note,
          updatedAtMs: Number.isFinite(parsedMs) ? parsedMs : 0
        }
      })
      .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
      .map((item) => item.note)
  }, [query.activeTag, query.searchTerm, query.sortBy, query.visibilityMode, selectedNotes])
  const filteredNoteMap = useMemo(() => new Map(filteredNotes.map((note) => [note.id, note])), [filteredNotes])
  const planetNameMap = useMemo(() => new Map(PLANET_OPTIONS.map((planet) => [planet.id, planet.name])), [])
  const snapshot = useMemo(() => calculateUniverseSnapshot(notes), [notes])
  const allPlanetLinks = snapshot.links
  const visibleLinks = useMemo(() => {
    const scoped = allPlanetLinks.filter((link) => {
      if (showAllLinks) return true
      return link.sourcePlanetId === selectedPlanetId || link.targetPlanetId === selectedPlanetId
    })

    return scoped.filter((link) => {
      const hasTag = link.scoreBreakdown.tagScore > 0
      const hasKeyword = link.scoreBreakdown.keywordScore > 0

      if (linkMode === 'tag') return hasTag && !hasKeyword
      if (linkMode === 'keyword') return hasKeyword && !hasTag
      if (linkMode === 'mixed') return hasTag && hasKeyword
      return true
    })
  }, [allPlanetLinks, linkMode, selectedPlanetId, showAllLinks])
  const activeCount = useMemo(() => selectedNotes.filter((note) => !note.isFrozen).length, [selectedNotes])
  const frozenCount = selectedNotes.length - activeCount
  const hasSelected = selectedNoteIds.length > 0
  const selectedNoteIdSet = useMemo(() => new Set(selectedNoteIds), [selectedNoteIds])

  const { handleBatchMove, handleBatchFreeze, handleBatchUnfreeze, handleBatchDelete } = useBatchActions({
    selectedNoteMap: filteredNoteMap,
    moveNotes,
    setNotesFrozen,
    deleteNotes,
    clearSelection: () => setSelectedNoteIds([]),
    notify: setToast,
    confirm: (message) => window.confirm(message)
  })

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

  useEffect(() => {
    if (!syncNotice) return
    setToast(syncNotice)
    clearSyncNotice()
  }, [clearSyncNotice, syncNotice])

  useEffect(() => {
    // 过滤切换/外部同步后，主动清理不可见或已不存在的选中项，
    // 避免批量操作“作用于看不见的笔记”。
    setSelectedNoteIds((prev) => prev.filter((id) => filteredNoteMap.has(id)))
  }, [filteredNoteMap])

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds((prev) => {
      if (prev.includes(noteId)) return prev.filter((id) => id !== noteId)
      return [...prev, noteId]
    })
  }

  const clearSelection = () => setSelectedNoteIds([])
  const selectAllFiltered = () => setSelectedNoteIds(filteredNotes.map((note) => note.id))

  if (isFocusMode) return null

  return (
    <>
      <aside className="hud-sidebar" style={{ right: 0, borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: 'none' }}>
        <div className="card">
          <h3 className="title">
            <span>NAVIGATION</span>
          </h3>
          <div className="quick-actions">
            <button
              className={`mini-button ${query.visibilityMode === 'active' ? 'active' : ''}`}
              onClick={() => setVisibilityMode('active')}
            >
              ACTIVE
            </button>
            <button className={`mini-button ${query.visibilityMode === 'all' ? 'active' : ''}`} onClick={() => setVisibilityMode('all')}>
              ALL
            </button>
            <button
              className={`mini-button ${query.visibilityMode === 'frozen' ? 'active' : ''}`}
              onClick={() => setVisibilityMode('frozen')}
            >
              FROZEN
            </button>
          </div>
        </div>

        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 className="title">
            <span>SECTOR DATA / {selectedNotes.length}</span>
            <span className="hint-line">ACTIVE {activeCount} · FROZEN {frozenCount}</span>
          </h3>

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
              <div className="quick-actions">
                <button className="mini-button" onClick={() => handleBatchMove(selectedNoteIds, batchTargetPlanetId)}>
                  批量迁移
                </button>
                <button className="mini-button" onClick={() => handleBatchFreeze(selectedNoteIds)}>
                  批量冰封
                </button>
                <button className="mini-button" onClick={() => handleBatchUnfreeze(selectedNoteIds)}>
                  批量解冻
                </button>
                <button className="danger-button" onClick={() => handleBatchDelete(selectedNoteIds)}>
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
            value={query.searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="SEARCH DATABASE..."
          />
          <select
            className="select compact-input"
            value={query.sortBy}
            onChange={(event) => setSortBy(event.target.value as SortBy)}
          >
            <option value="updated_desc">按更新时间（新→旧）</option>
            <option value="title_asc">按标题（A→Z）</option>
          </select>

          <div className="tag-chip-wrap">
            <button className={`tag-chip ${query.activeTag === null ? 'active' : ''}`} onClick={() => setActiveTag(null)}>
              ALL
            </button>
            {availableTags.map(([tag, count]) => (
              <button key={tag} className={`tag-chip ${query.activeTag === tag ? 'active' : ''}`} onClick={() => setActiveTag(tag)}>
                #{tag} [{count}]
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
            <button className="mini-button" onClick={resetFilters}>
              重置过滤
            </button>
          </div>

          <NoteListOverlay
            notes={filteredNotes}
            selectedNotesCount={selectedNotes.length}
            editingNoteId={editingNoteId}
            selectedNoteIds={selectedNoteIdSet}
            onToggleNoteSelection={toggleNoteSelection}
            onStartEdit={(noteId, planetId) => {
              startEditNote(noteId)
              setSelectedPlanetId(planetId)
            }}
            onToggleFrozen={(note) => {
              const nextFrozen = !note.isFrozen
              const changed = setNotesFrozen([note.id], nextFrozen)
              if (changed > 0) setToast(nextFrozen ? '已冰封 1 条笔记' : '已解冻 1 条笔记')
            }}
            onDeleteNote={(noteId) => {
              const ok = window.confirm('确认删除这条笔记吗？此操作可撤销一次。')
              if (!ok) return
              const changed = deleteNote(noteId)
              if (changed > 0) setToast('已删除 1 条笔记')
            }}
          />
        </div>

        {toast && <div className="toast">{toast}</div>}
      </aside>

      <LinkPanel
        links={visibleLinks}
        showAllLinks={showAllLinks}
        onToggleShowAllLinks={() => setShowAllLinks((prev) => !prev)}
        linkMode={linkMode}
        onChangeLinkMode={setLinkMode}
        planetNameMap={planetNameMap}
        onSelectPlanet={setSelectedPlanetId}
        onPickEvidence={(value, kind) => {
          if (kind === 'tag') {
            setActiveTag(value)
            setToast(`已按标签 #${value} 过滤`)
            return
          }

          setSearchTerm(value)
          setToast(`已按关键词 ${value} 搜索`)
        }}
      />
    </>
  )
}
