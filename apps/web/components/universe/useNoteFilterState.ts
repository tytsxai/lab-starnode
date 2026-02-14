'use client'

import { useState } from 'react'
import type { NoteQueryState, SortBy, VisibilityMode } from './types'

const initialQuery: NoteQueryState = {
  searchTerm: '',
  sortBy: 'updated_desc',
  activeTag: null,
  visibilityMode: 'active'
}

export function useNoteFilterState() {
  const [query, setQuery] = useState<NoteQueryState>(initialQuery)

  const setSearchTerm = (searchTerm: string) => setQuery((prev) => ({ ...prev, searchTerm }))
  const setSortBy = (sortBy: SortBy) => setQuery((prev) => ({ ...prev, sortBy }))
  const setActiveTag = (activeTag: string | null) => setQuery((prev) => ({ ...prev, activeTag }))
  const setVisibilityMode = (visibilityMode: VisibilityMode) => setQuery((prev) => ({ ...prev, visibilityMode }))
  const resetFilters = () => setQuery((prev) => ({ ...prev, searchTerm: '', activeTag: null }))

  return {
    query,
    setSearchTerm,
    setSortBy,
    setActiveTag,
    setVisibilityMode,
    resetFilters
  }
}
