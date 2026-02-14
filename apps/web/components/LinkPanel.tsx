'use client'

import type { PlanetLink } from '@starnode/core'

interface LinkPanelProps {
  links: PlanetLink[]
  showAllLinks: boolean
  onToggleShowAllLinks: () => void
  linkMode: 'all' | 'tag' | 'keyword' | 'mixed'
  onChangeLinkMode: (mode: 'all' | 'tag' | 'keyword' | 'mixed') => void
  planetNameMap: Map<string, string>
  onSelectPlanet: (planetId: string) => void
  onPickEvidence: (value: string, kind: 'tag' | 'keyword') => void
}

export function LinkPanel({
  links,
  showAllLinks,
  onToggleShowAllLinks,
  linkMode,
  onChangeLinkMode,
  planetNameMap,
  onSelectPlanet,
  onPickEvidence
}: LinkPanelProps) {
  return (
    <div className="overlay overlay-top">
      <h3 className="overlay-title">星际关联（可解释）</h3>
      <button className="ghost-button" onClick={onToggleShowAllLinks}>
        {showAllLinks ? '仅显示当前星球关联' : '显示全部关联'}
      </button>
      <div className="quick-actions">
        <button className={`mini-button ${linkMode === 'all' ? 'mini-button-active' : ''}`} onClick={() => onChangeLinkMode('all')}>
          全部
        </button>
        <button className={`mini-button ${linkMode === 'tag' ? 'mini-button-active' : ''}`} onClick={() => onChangeLinkMode('tag')}>
          仅标签
        </button>
        <button
          className={`mini-button ${linkMode === 'keyword' ? 'mini-button-active' : ''}`}
          onClick={() => onChangeLinkMode('keyword')}
        >
          仅关键词
        </button>
        <button
          className={`mini-button ${linkMode === 'mixed' ? 'mini-button-active' : ''}`}
          onClick={() => onChangeLinkMode('mixed')}
        >
          混合
        </button>
      </div>
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
              标签证据：
              {link.evidenceTags.length === 0 ? (
                ' 无'
              ) : (
                <>
                  {' '}
                  {link.evidenceTags.map((tag) => (
                    <button
                      key={`${link.sourcePlanetId}-${link.targetPlanetId}-tag-${tag}`}
                      className="evidence-chip"
                      onClick={(event) => {
                        event.stopPropagation()
                        onPickEvidence(tag, 'tag')
                      }}
                    >
                      #{tag}
                    </button>
                  ))}
                </>
              )}
            </div>
            <div className="overlay-subline">
              关键词证据：
              {link.evidenceKeywords.length === 0 ? (
                ' 无'
              ) : (
                <>
                  {' '}
                  {link.evidenceKeywords.map((keyword) => (
                    <button
                      key={`${link.sourcePlanetId}-${link.targetPlanetId}-keyword-${keyword}`}
                      className="evidence-chip"
                      onClick={(event) => {
                        event.stopPropagation()
                        onPickEvidence(keyword, 'keyword')
                      }}
                    >
                      {keyword}
                    </button>
                  ))}
                </>
              )}
            </div>
            <div className="overlay-subline">
              评分：标签 {link.scoreBreakdown.tagScore} + 关键词 {link.scoreBreakdown.keywordScore} ={' '}
              {link.scoreBreakdown.total}
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
