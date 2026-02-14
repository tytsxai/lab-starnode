'use client'

import { useMemo } from 'react'
import { calculatePlanetLinks, calculatePlanetStats } from '@starnode/core'
import { PlanetCanvas } from '@starnode/renderer'
import { useNoteStore } from '../lib/useNoteStore'

export function UniverseScene() {
  const notes = useNoteStore((state) => state.notes)
  const selectedPlanetId = useNoteStore((state) => state.selectedPlanetId)
  const setSelectedPlanetId = useNoteStore((state) => state.setSelectedPlanetId)

  // 暂时展示全量宇宙（含冰封笔记），后续可按 HUD 查询状态收敛显示范围。
  const planets = useMemo(() => calculatePlanetStats(notes, { includeFrozen: true }), [notes])
  const links = useMemo(() => calculatePlanetLinks(notes, { includeFrozen: true }), [notes])

  return (
    <PlanetCanvas
      planets={planets}
      links={links}
      selectedPlanetId={selectedPlanetId}
      onSelectPlanet={setSelectedPlanetId}
    />
  )
}
