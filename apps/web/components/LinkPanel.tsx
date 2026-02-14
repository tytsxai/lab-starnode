'use client'

import type { PlanetLink } from '@starnode/core'

interface LinkPanelProps {
  links: PlanetLink[]
  showAllLinks: boolean
  onToggleShowAllLinks: () => void
  planetNameMap: Map<string, string>
  onSelectPlanet: (planetId: string) => void
}

export function LinkPanel({
  links,
  showAllLinks,
  onToggleShowAllLinks,
  planetNameMap,
  onSelectPlanet
}: LinkPanelProps) {
  return (
    <div className="overlay overlay-top">
      <h3 className="overlay-title">星际关联（可解释）</h3>
      <button className="ghost-button" onClick={onToggleShowAllLinks}>
        {showAllLinks ? '仅显示当前星球关联' : '显示全部关联'}
      </button>
      <div className="overlay-list">
        {links.slice(0, 6).map((link) => (
          <div
            key={`${link.sourcePlanetId}-${link.targetPlanetId}`}
            className="overlay-item overlay-item-column"
            role="button"
            onClick={() => onSelectPlanet(link.sourcePlanetId)}
          >
            <div className="overlay-note-title">
              {(planetNameMap.get(link.sourcePlanetId) ?? link.sourcePlanetId) +
                ' ↔ ' +
                (planetNameMap.get(link.targetPlanetId) ?? link.targetPlanetId)}
            </div>
            <div className="overlay-subline">
              共同标签：{link.sharedTags.join(', ')}（强度 {link.strength}）
            </div>
            <div className="overlay-actions">
              <button
                className="mini-button"
                onClick={(event) => {
                  event.stopPropagation()
                  onSelectPlanet(link.sourcePlanetId)
                }}
              >
                跳到左侧星球
              </button>
              <button
                className="mini-button"
                onClick={(event) => {
                  event.stopPropagation()
                  onSelectPlanet(link.targetPlanetId)
                }}
              >
                跳到右侧星球
              </button>
            </div>
          </div>
        ))}
        {links.length === 0 && (
          <div className="overlay-empty">暂无跨星球关联，试试给不同星球加相同标签。</div>
        )}
      </div>
    </div>
  )
}
