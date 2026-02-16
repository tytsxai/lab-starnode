'use client'

import { useMemo } from 'react'
import { calculateUniverseSnapshot } from '@starnode/core'
import { PlanetCanvas } from '@starnode/renderer'
import { useNoteStore } from '../lib/useNoteStore'

export function UniverseScene() {
  const notes = useNoteStore((state) => state.notes)
  const selectedPlanetId = useNoteStore((state) => state.selectedPlanetId)
  const setSelectedPlanetId = useNoteStore((state) => state.setSelectedPlanetId)

  // 与右侧面板共用同一份快照计算缓存，避免重复重算关联图。
  const snapshot = useMemo(() => calculateUniverseSnapshot(notes), [notes])

  return (
    <PlanetCanvas
      planets={snapshot.planets}
      links={snapshot.links}
      selectedPlanetId={selectedPlanetId}
      onSelectPlanet={setSelectedPlanetId}
    />
  )
}
