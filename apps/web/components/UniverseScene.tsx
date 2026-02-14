'use client'

import { useMemo } from 'react'
import { calculatePlanetLinks, calculatePlanetStats } from '@starnode/core'
import { PlanetCanvas } from '@starnode/renderer'
import { useNoteStore } from '../lib/useNoteStore'

export function UniverseScene() {
  const notes = useNoteStore((state) => state.notes)
  const selectedPlanetId = useNoteStore((state) => state.selectedPlanetId)
  const setSelectedPlanetId = useNoteStore((state) => state.setSelectedPlanetId)

  // 默认仅统计活跃笔记，保证与面板行为一致。
  const planets = useMemo(() => calculatePlanetStats(notes), [notes])
  const links = useMemo(() => calculatePlanetLinks(notes), [notes])

  return (
    <PlanetCanvas
      planets={planets}
      links={links}
      selectedPlanetId={selectedPlanetId}
      onSelectPlanet={setSelectedPlanetId}
    />
  )
}
