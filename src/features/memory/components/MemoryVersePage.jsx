import { useMemo } from 'react'
import {
  buildMemoryVerseTokens,
  getCoveredWordIndexes,
  getMemoryVerseWordCount,
} from '../memoryUtils.js'

export default function MemoryVersePage({
  activeMemoryVerse,
  awardPendingPlayerId,
  isAdmin,
  isMemoryFullscreen,
  memoryControlsOpen,
  memoryFontScale,
  memoryRewardsOpen,
  memoryVerseEditorOpen,
  memoryVerseForm,
  memoryVerseResult,
  onAwardPlayer,
  onCloseMemoryRewards,
  onCoverAll,
  onCoverNext,
  onDecreaseMemoryFont,
  onIncreaseMemoryFont,
  onMemoryVerseChange,
  onOpenMemoryRewards,
  onRedoCover,
  onResetCover,
  onRunMemoryVerse,
  onShowMemoryVerseEditor,
  onToggleMemoryControls,
  onToggleMemoryFullscreen,
  onUndoCover,
  players,
  playersLoading,
  playersMessage,
  verseAwardResult,
}) {
  const tokens = useMemo(() => buildMemoryVerseTokens(activeMemoryVerse.text), [activeMemoryVerse.text])
  const totalWords = useMemo(() => getMemoryVerseWordCount(activeMemoryVerse.text), [activeMemoryVerse.text])
  const coveredWordIndexes = useMemo(
    () => getCoveredWordIndexes(activeMemoryVerse, totalWords),
    [activeMemoryVerse, totalWords],
  )
  const coveredWords = useMemo(() => new Set(coveredWordIndexes), [coveredWordIndexes])
  const coveredCount = coveredWordIndexes.length
  const hasVerse = Boolean(activeMemoryVerse.reference || activeMemoryVerse.text)

  return (
    <section className="panel memory-verse-shell memory-page-shell">
      {hasVerse ? (
        <div className={`memory-top-controls ${memoryControlsOpen ? 'open' : 'collapsed'}`}>
          <div className="memory-top-status">
            <span>{coveredCount}/{totalWords || 0}</span>
            <button className="ghost-button compact-button" onClick={onToggleMemoryControls} type="button">
              {memoryControlsOpen ? 'Hide' : 'Show'}
            </button>
          </div>

          {memoryControlsOpen ? (
            <>
              <div className="memory-helper-controls memory-top-group">
                <button className="ghost-button compact-button" onClick={onCoverNext} type="button">
                  Cover
                </button>
                <button className="ghost-button compact-button" onClick={onUndoCover} type="button">
                  Undo
                </button>
                <button className="ghost-button compact-button" onClick={onRedoCover} type="button">
                  Redo
                </button>
                <button className="ghost-button compact-button" onClick={onResetCover} type="button">
                  Reset
                </button>
                <button className="ghost-button compact-button" onClick={onCoverAll} type="button">
                  All
                </button>
              </div>

              <div className="memory-text-controls memory-top-group">
                <button className="ghost-button compact-button" onClick={onDecreaseMemoryFont} type="button">
                  A-
                </button>
                <button className="ghost-button compact-button" onClick={onIncreaseMemoryFont} type="button">
                  A+
                </button>
              </div>

              {isAdmin ? (
                <div className="memory-drawer-actions memory-top-group">
                  {!memoryVerseEditorOpen ? (
                    <button className="ghost-button compact-button" onClick={onShowMemoryVerseEditor} type="button">
                      Edit
                    </button>
                  ) : null}
                  <button className="ghost-button compact-button" onClick={onToggleMemoryFullscreen} type="button">
                    {isMemoryFullscreen ? 'Exit' : 'Full'}
                  </button>
                  <button className="primary-button compact-button" onClick={onOpenMemoryRewards} type="button">
                    Rewards
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      <div className="memory-verse-main">
        <div className={`memory-verse-grid ${memoryVerseEditorOpen || !hasVerse ? '' : 'presentation-mode'}`}>
          {memoryVerseEditorOpen || !hasVerse ? (
            <form className="workspace-card stack-form" onSubmit={onRunMemoryVerse}>
              <label className="field">
                <span>Book / verse title</span>
                <input
                  name="reference"
                  onChange={onMemoryVerseChange}
                  placeholder="John 3:16"
                  value={memoryVerseForm.reference}
                />
              </label>

              <label className="field">
                <span>Verse text</span>
                <textarea
                  name="text"
                  onChange={onMemoryVerseChange}
                  placeholder="For God so loved the world..."
                  rows={6}
                  value={memoryVerseForm.text}
                />
              </label>

              {memoryVerseResult.text ? (
                <p className={`status-line ${memoryVerseResult.type}`}>{memoryVerseResult.text}</p>
              ) : null}

              <button className="primary-button" type="submit">
                Run helper
              </button>
            </form>
          ) : null}

          <div className="workspace-card memory-helper-card memory-helper-card-large">
            {hasVerse ? (
              <div className="memory-verse-display">
                <div className="memory-verse-title">
                  <div className="eyebrow">Active Verse</div>
                  <h3>{activeMemoryVerse.reference || 'Memory verse'}</h3>
                </div>

                <div className="memory-verse-text" style={{ fontSize: `${memoryFontScale}rem` }}>
                  {tokens.map((token) =>
                    token.isWord ? (
                      <span
                        className={`memory-token ${coveredWords.has(token.wordIndex) ? 'hidden' : ''}`}
                        key={token.id}
                      >
                        {token.text}
                      </span>
                    ) : (
                      <span className="memory-token space" key={token.id}>
                        {token.text}
                      </span>
                    ),
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state-card">
                <h3>No verse running yet</h3>
                <p className="panel-note">Paste a verse on the left and click `Run helper` to start covering words.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {memoryRewardsOpen ? (
        <div className="memory-dialog-backdrop">
          <div className="panel memory-dialog">
            <div className="memory-dialog-header">
              <div>
                <div className="eyebrow">Verse Rewards</div>
                <h3>Give 50 gold</h3>
              </div>
              <button className="ghost-button compact-button" onClick={onCloseMemoryRewards} type="button">
                Close
              </button>
            </div>

            <p className="panel-copy">When a player recites the verse, tap their button to reward them.</p>

            {!isAdmin ? (
              <p className="panel-note">Sign in as admin to give the 50 gold reward.</p>
            ) : playersLoading ? (
              <p className="panel-note">Loading players...</p>
            ) : players.length ? (
              <div className="memory-player-rewards">
                {players.map((player) => (
                  <div className="memory-player-row" key={player.id}>
                    <div>
                      <strong>{player.display_name}</strong>
                      <span>{player.gold} gold</span>
                    </div>
                    <button
                      className="primary-button compact-button"
                      disabled={awardPendingPlayerId === player.id}
                      onClick={() => onAwardPlayer(player.id)}
                      type="button"
                    >
                      {awardPendingPlayerId === player.id ? 'Adding...' : '+50 gold'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="panel-note">Create player accounts first so you can reward them here.</p>
            )}

            {playersMessage.text ? <p className={`status-line ${playersMessage.type}`}>{playersMessage.text}</p> : null}
            {verseAwardResult.text ? <p className={`status-line ${verseAwardResult.type}`}>{verseAwardResult.text}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
