import { useCallback, useEffect, useMemo, useState } from 'react'
import './AdminApp.css'
import AquariumScene from './components/AquariumScene'
import { hasSupabaseEnv, supabase } from './lib/supabase'

const ADMIN_PATH = '/admin'
const MEMORY_PATH = '/memory-verse'
const QUIZ_PATH = '/quiz'
const ADMIN_SECTIONS = {
  createPlayer: 'create-player',
  manageGold: 'manage-gold',
  deletePlayer: 'delete-player',
}
const QUICK_GOLD_ACTIONS = [25, 50, 100, -25, -50, -100]
const AUTH_VIEWS = {
  player: 'player',
  admin: 'admin',
}
const MEMORY_VERSE_STORAGE_KEY = 'memory-verse-helper'
const QUIZ_STORAGE_KEY = 'quiz-helper'

function normalizeLoginName(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function readJson(response) {
  return response.json().catch(() => ({}))
}

function isAdminProfile(profile) {
  return profile?.role === 'admin'
}

function createEmptyMessage() {
  return {
    type: '',
    text: '',
  }
}

function formatGoldChange(amount) {
  return amount > 0 ? `+${amount}` : `${amount}`
}

function createEmptyMemoryVerseForm() {
  return {
    reference: '',
    text: '',
  }
}

function createEmptyActiveMemoryVerse() {
  return {
    reference: '',
    text: '',
    coveredCount: 0,
  }
}

function createEmptyQuizQuestion() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: '',
    points: '1',
  }
}

function buildQuizPointGroups(questions) {
  const groups = []

  questions.forEach((question, index) => {
    const points = Number(question.points) || 0
    const questionNumber = index + 1
    const lastGroup = groups[groups.length - 1]

    if (!lastGroup || lastGroup.points !== points || lastGroup.end !== questionNumber - 1) {
      groups.push({
        points,
        start: questionNumber,
        end: questionNumber,
      })
      return
    }

    lastGroup.end = questionNumber
  })

  return groups
}

function createEmptyQuizAwardForm() {
  return {
    amount: '50',
  }
}

function buildMemoryVerseTokens(text) {
  let wordIndex = -1

  return String(text || '')
    .split(/(\s+)/)
    .filter(Boolean)
    .map((token, tokenIndex) => {
      const isWord = !/^\s+$/.test(token)

      if (isWord) {
        wordIndex += 1
      }

      return {
        id: `${tokenIndex}-${token}`,
        isWord,
        text: token,
        wordIndex,
      }
    })
}

function getMemoryVerseWordCount(text) {
  return buildMemoryVerseTokens(text).filter((token) => token.isWord).length
}

function mergeViewedPlayer(player, profile) {
  if (!player) {
    return null
  }

  if (profile?.id === player.id && profile.role === 'player') {
    return {
      ...player,
      gold: profile.gold ?? player.gold,
      display_name: profile.display_name ?? player.display_name,
      login_name: profile.login_name ?? player.login_name,
    }
  }

  return player
}

function CreatePlayerSection({
  createPlayerForm,
  createPlayerPending,
  createPlayerResult,
  onCreatePlayer,
  onCreatePlayerChange,
  players,
}) {
  return (
    <div className="admin-content-stack">
      <div className="content-intro">
        <div>
          <div className="eyebrow">Player Accounts</div>
          <h2>Add a new player</h2>
        </div>
        <p className="panel-copy">
          Create the account yourself, then hand the login name and password to the player.
        </p>
      </div>

      <div className="workspace-grid">
        <form className="stack-form workspace-card" onSubmit={onCreatePlayer}>
          <label className="field">
            <span>Player display name</span>
            <input
              name="displayName"
              onChange={onCreatePlayerChange}
              placeholder="Alyssa"
              value={createPlayerForm.displayName}
            />
          </label>

          <label className="field">
            <span>Player login name</span>
            <input
              autoComplete="off"
              name="loginName"
              onChange={onCreatePlayerChange}
              placeholder="alyssa"
              value={createPlayerForm.loginName}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="new-password"
              name="password"
              onChange={onCreatePlayerChange}
              placeholder="Set the password they requested"
              type="password"
              value={createPlayerForm.password}
            />
          </label>

          <label className="field">
            <span>Starting gold</span>
            <input
              inputMode="numeric"
              name="startingGold"
              onChange={onCreatePlayerChange}
              placeholder="250"
              value={createPlayerForm.startingGold}
            />
          </label>

          {createPlayerResult.text ? (
            <p className={`status-line ${createPlayerResult.type}`}>{createPlayerResult.text}</p>
          ) : null}

          <button className="primary-button" disabled={createPlayerPending} type="submit">
            {createPlayerPending ? 'Creating player...' : 'Create player'}
          </button>
        </form>

        <div className="workspace-card player-preview-card">
          <div className="card-heading">
            <h3>Current players</h3>
            <span>{players.length}</span>
          </div>

          <div className="player-preview-list">
            {players.length ? (
              players.slice(0, 8).map((player) => (
                <div className="player-preview-row" key={player.id}>
                  <div>
                    <strong>{player.display_name}</strong>
                    <span>{player.login_name}</span>
                  </div>
                  <strong>{player.gold} gold</strong>
                </div>
              ))
            ) : (
              <p className="panel-note">No players yet. Your first new account will appear here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function GoldManagerSection({
  goldForm,
  goldPending,
  goldResult,
  onAdjustGold,
  onGoldFormChange,
  onQuickGoldAmount,
  onSelectPlayer,
  players,
  playersLoading,
  playersMessage,
  selectedPlayer,
}) {
  return (
    <div className="admin-content-stack">
      <div className="content-intro">
        <div>
          <div className="eyebrow">Gold Controls</div>
          <h2>Adjust player gold</h2>
        </div>
        <p className="panel-copy">
          Pick a player, then enter a positive or negative amount. Positive adds gold. Negative removes it.
        </p>
      </div>

      {playersMessage.text ? <p className={`status-line ${playersMessage.type}`}>{playersMessage.text}</p> : null}

      <div className="gold-layout">
        <div className="workspace-card player-browser-card">
          <div className="card-heading">
            <h3>Players</h3>
            <span>{players.length}</span>
          </div>

          {playersLoading ? (
            <p className="panel-note">Loading players...</p>
          ) : players.length ? (
            <div className="player-browser-list">
              {players.map((player) => (
                <button
                  className={`player-browser-item ${selectedPlayer?.id === player.id ? 'active' : ''}`}
                  key={player.id}
                  onClick={() => onSelectPlayer(player.id)}
                  type="button"
                >
                  <div>
                    <strong>{player.display_name}</strong>
                    <span>{player.login_name}</span>
                  </div>
                  <strong>{player.gold}</strong>
                </button>
              ))}
            </div>
          ) : (
            <p className="panel-note">Create at least one player before you start changing gold.</p>
          )}
        </div>

        <div className="workspace-card gold-editor-card">
          {selectedPlayer ? (
            <>
              <div className="selected-player-hero">
                <div>
                  <div className="eyebrow">Selected Player</div>
                  <h3>{selectedPlayer.display_name}</h3>
                  <p className="panel-note">Login: {selectedPlayer.login_name}</p>
                </div>
                <div className="gold-balance-badge">
                  <span>Current gold</span>
                  <strong>{selectedPlayer.gold}</strong>
                </div>
              </div>

              <div className="quick-gold-actions">
                {QUICK_GOLD_ACTIONS.map((amount) => (
                  <button
                    className={`quick-gold-chip ${amount > 0 ? 'add' : 'subtract'}`}
                    key={amount}
                    onClick={() => onQuickGoldAmount(amount)}
                    type="button"
                  >
                    {formatGoldChange(amount)}
                  </button>
                ))}
              </div>

              <form className="stack-form" onSubmit={onAdjustGold}>
                <label className="field">
                  <span>Gold change</span>
                  <input
                    inputMode="numeric"
                    name="amount"
                    onChange={onGoldFormChange}
                    placeholder="Example: 100 or -50"
                    value={goldForm.amount}
                  />
                </label>

                <p className="panel-note">
                  Example: <strong>100</strong> adds gold. <strong>-50</strong> removes gold.
                </p>

                {goldResult.text ? <p className={`status-line ${goldResult.type}`}>{goldResult.text}</p> : null}

                <button className="primary-button" disabled={goldPending} type="submit">
                  {goldPending ? 'Updating gold...' : 'Apply gold change'}
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state-card">
              <h3>Select a player</h3>
              <p className="panel-note">Choose a player from the list so you can add or remove gold.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DeletePlayerSection({
  deletePending,
  deleteResult,
  onDeletePlayer,
  onSelectPlayer,
  players,
  playersLoading,
  playersMessage,
  selectedPlayer,
}) {
  return (
    <div className="admin-content-stack">
      <div className="content-intro">
        <div>
          <div className="eyebrow">Delete Players</div>
          <h2>Remove a player account</h2>
        </div>
        <p className="panel-copy">
          This permanently deletes the player login, profile, and anything saved under that account.
        </p>
      </div>

      {playersMessage.text ? <p className={`status-line ${playersMessage.type}`}>{playersMessage.text}</p> : null}

      <div className="gold-layout">
        <div className="workspace-card player-browser-card">
          <div className="card-heading">
            <h3>Players</h3>
            <span>{players.length}</span>
          </div>

          {playersLoading ? (
            <p className="panel-note">Loading players...</p>
          ) : players.length ? (
            <div className="player-browser-list">
              {players.map((player) => (
                <button
                  className={`player-browser-item ${selectedPlayer?.id === player.id ? 'active' : ''}`}
                  key={player.id}
                  onClick={() => onSelectPlayer(player.id)}
                  type="button"
                >
                  <div>
                    <strong>{player.display_name}</strong>
                    <span>{player.login_name}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="panel-note">There are no player accounts to delete.</p>
          )}
        </div>

        <div className="workspace-card delete-player-card">
          {selectedPlayer ? (
            <>
              <div className="selected-player-hero">
                <div>
                  <div className="eyebrow">Selected Player</div>
                  <h3>{selectedPlayer.display_name}</h3>
                  <p className="panel-note">Login: {selectedPlayer.login_name}</p>
                </div>
              </div>

              <div className="danger-zone">
                <h3>Permanent delete</h3>
                <p className="panel-note">
                  This removes the player account completely, including their saved profile and owned data.
                </p>

                {deleteResult.text ? <p className={`status-line ${deleteResult.type}`}>{deleteResult.text}</p> : null}

                <button className="danger-button" disabled={deletePending} onClick={onDeletePlayer} type="button">
                  {deletePending ? 'Deleting player...' : 'Delete player'}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state-card">
              <h3>Select a player</h3>
              <p className="panel-note">Choose a player from the list before deleting the account.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AdminPanel({
  adminSection,
  createPlayerForm,
  createPlayerPending,
  createPlayerResult,
  deletePending,
  deleteResult,
  goldForm,
  goldPending,
  goldResult,
  onAdjustGold,
  onCreatePlayer,
  onCreatePlayerChange,
  onDeletePlayer,
  onGoldFormChange,
  onLogout,
  onQuickGoldAmount,
  onReturnToGame,
  onSectionChange,
  onSelectPlayer,
  players,
  playersLoading,
  playersMessage,
  profile,
  selectedPlayer,
}) {
  return (
    <section className="panel admin-panel-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-top">
          <div className="eyebrow">Admin Dashboard</div>
          <h2>{profile?.display_name || 'Admin'}</h2>
          <p className="panel-copy">
            Use the left controls to switch tasks. The larger workspace on the right is where you work.
          </p>
        </div>

        <nav aria-label="Admin sections" className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${adminSection === ADMIN_SECTIONS.createPlayer ? 'active' : ''}`}
            onClick={() => onSectionChange(ADMIN_SECTIONS.createPlayer)}
            type="button"
          >
            <span>Add player</span>
            <small>Create and hand out accounts</small>
          </button>

          <button
            className={`sidebar-nav-item ${adminSection === ADMIN_SECTIONS.manageGold ? 'active' : ''}`}
            onClick={() => onSectionChange(ADMIN_SECTIONS.manageGold)}
            type="button"
          >
            <span>Manage gold</span>
            <small>Add or remove player gold</small>
          </button>

          <button
            className={`sidebar-nav-item ${adminSection === ADMIN_SECTIONS.deletePlayer ? 'active' : ''}`}
            onClick={() => onSectionChange(ADMIN_SECTIONS.deletePlayer)}
            type="button"
          >
            <span>Delete player</span>
            <small>Remove a player account permanently</small>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="ghost-button" onClick={onReturnToGame} type="button">
            Back to game
          </button>
          <button className="ghost-button" onClick={onLogout} type="button">
            Log out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        {adminSection === ADMIN_SECTIONS.createPlayer ? (
          <CreatePlayerSection
            createPlayerForm={createPlayerForm}
            createPlayerPending={createPlayerPending}
            createPlayerResult={createPlayerResult}
            onCreatePlayer={onCreatePlayer}
            onCreatePlayerChange={onCreatePlayerChange}
            players={players}
          />
        ) : adminSection === ADMIN_SECTIONS.manageGold ? (
          <GoldManagerSection
            goldForm={goldForm}
            goldPending={goldPending}
            goldResult={goldResult}
            onAdjustGold={onAdjustGold}
            onGoldFormChange={onGoldFormChange}
            onQuickGoldAmount={onQuickGoldAmount}
            onSelectPlayer={onSelectPlayer}
            players={players}
            playersLoading={playersLoading}
            playersMessage={playersMessage}
            selectedPlayer={selectedPlayer}
          />
        ) : (
          <DeletePlayerSection
            deletePending={deletePending}
            deleteResult={deleteResult}
            onDeletePlayer={onDeletePlayer}
            onSelectPlayer={onSelectPlayer}
            players={players}
            playersLoading={playersLoading}
            playersMessage={playersMessage}
            selectedPlayer={selectedPlayer}
          />
        )}
      </div>
    </section>
  )
}

function AuthPopover({
  authPending,
  authView,
  hasAdmin,
  isAdmin,
  loginForm,
  loginMessage,
  onBootstrapChange,
  onCreateAdmin,
  onLogin,
  onLoginChange,
  onOpenAdmin,
  onSelectView,
  onSignOut,
  profile,
  setupForm,
  setupMessage,
  viewingAdmin,
}) {
  const showingPlayer = authView === AUTH_VIEWS.player

  return (
    <div className="auth-popover panel">
      {profile ? (
        <div className="auth-session-strip">
          <div>
            <div className="eyebrow">Signed In</div>
            <strong>{profile.display_name}</strong>
          </div>
          <div className="auth-session-actions">
            {isAdmin ? (
              <button className="ghost-button compact-button" onClick={onOpenAdmin} type="button">
                {viewingAdmin ? 'Back to game' : 'Open admin'}
              </button>
            ) : null}
            <button className="ghost-button compact-button" onClick={onSignOut} type="button">
              Sign out
            </button>
          </div>
        </div>
      ) : null}

      <div className="auth-switcher">
        <button
          className={`auth-switcher-chip ${showingPlayer ? 'active' : ''}`}
          onClick={() => onSelectView(AUTH_VIEWS.player)}
          type="button"
        >
          Player
        </button>
        <button
          className={`auth-switcher-chip ${!showingPlayer ? 'active' : ''}`}
          onClick={() => onSelectView(AUTH_VIEWS.admin)}
          type="button"
        >
          Admin
        </button>
      </div>

      {showingPlayer ? (
        <form className="stack-form" onSubmit={onLogin}>
          <div className="eyebrow">Player Sign In</div>
          <label className="field">
            <span>Login name</span>
            <input
              autoComplete="username"
              name="loginName"
              onChange={onLoginChange}
              placeholder="player login name"
              value={loginForm.loginName}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={onLoginChange}
              placeholder="Enter password"
              type="password"
              value={loginForm.password}
            />
          </label>

          {loginMessage.text ? <p className={`status-line ${loginMessage.type}`}>{loginMessage.text}</p> : null}

          <button className="primary-button" disabled={authPending} type="submit">
            {authPending ? 'Signing in...' : 'Enter game'}
          </button>
        </form>
      ) : hasAdmin ? (
        <form className="stack-form" onSubmit={onLogin}>
          <div className="eyebrow">Admin Sign In</div>
          <label className="field">
            <span>Login name</span>
            <input
              autoComplete="username"
              name="loginName"
              onChange={onLoginChange}
              placeholder="admin login name"
              value={loginForm.loginName}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={onLoginChange}
              placeholder="Enter password"
              type="password"
              value={loginForm.password}
            />
          </label>

          {loginMessage.text ? <p className={`status-line ${loginMessage.type}`}>{loginMessage.text}</p> : null}

          <button className="primary-button" disabled={authPending} type="submit">
            {authPending ? 'Signing in...' : 'Sign in as admin'}
          </button>
        </form>
      ) : (
        <form className="stack-form" onSubmit={onCreateAdmin}>
          <div className="eyebrow">Create First Admin</div>
          <label className="field">
            <span>Your display name</span>
            <input
              name="displayName"
              onChange={onBootstrapChange}
              placeholder="Teacher Maria"
              value={setupForm.displayName}
            />
          </label>

          <label className="field">
            <span>Admin login name</span>
            <input
              autoComplete="username"
              name="loginName"
              onChange={onBootstrapChange}
              placeholder="teacher maria"
              value={setupForm.loginName}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="new-password"
              name="password"
              onChange={onBootstrapChange}
              placeholder="At least 6 characters"
              type="password"
              value={setupForm.password}
            />
          </label>

          <label className="field">
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              name="confirmPassword"
              onChange={onBootstrapChange}
              placeholder="Type it again"
              type="password"
              value={setupForm.confirmPassword}
            />
          </label>

          {setupMessage.text ? <p className={`status-line ${setupMessage.type}`}>{setupMessage.text}</p> : null}

          <button className="primary-button" disabled={authPending} type="submit">
            {authPending ? 'Creating admin...' : 'Create admin'}
          </button>
        </form>
      )}
    </div>
  )
}

function ProfileMenu({ onSelectPlayer, players, selectedPlayerId }) {
  return (
    <div className="profile-menu panel">
      <div className="profile-menu-list">
        {players.length ? (
          players.map((player) => (
            <button
              className={`profile-menu-item ${selectedPlayerId === player.id ? 'active' : ''}`}
              key={player.id}
              onClick={() => onSelectPlayer(player.id)}
              type="button"
            >
              <span>{player.display_name}</span>
            </button>
          ))
        ) : (
          <p className="panel-note">No player profiles yet.</p>
        )}
      </div>
    </div>
  )
}

function GameTopBar({
  authMenuOpen,
  authView,
  hasAdmin,
  isAdmin,
  loginForm,
  loginMessage,
  onBootstrapChange,
  onCreateAdmin,
  onLogin,
  onLoginChange,
  onOpenAdmin,
  onOpenMemoryVerse,
  onOpenProfileMenu,
  onOpenQuiz,
  onOpenShop,
  onSelectViewedPlayer,
  onSelectAuthView,
  onSignOut,
  onToggleAuthMenu,
  profile,
  publicPlayers,
  profileMenuOpen,
  setupForm,
  setupMessage,
  authPending,
  viewedPlayer,
  viewingMemory,
  viewingQuiz,
  viewingAdmin,
}) {
  return (
    <header className="game-header">
      <div className="header-left">
        <div className="header-menu-wrap">
          <button className="header-menu-button" onClick={onOpenProfileMenu} type="button">
            VISIT
          </button>
          {profileMenuOpen ? (
            <ProfileMenu
              onSelectPlayer={onSelectViewedPlayer}
              players={publicPlayers}
              selectedPlayerId={viewedPlayer?.id ?? ''}
            />
          ) : null}
        </div>
        {isAdmin ? (
          <>
            <button
              className={`header-menu-button ${viewingMemory ? 'active' : ''}`}
              onClick={onOpenMemoryVerse}
              type="button"
            >
              MEMORY
            </button>
            <button
              className={`header-menu-button ${viewingQuiz ? 'active' : ''}`}
              onClick={onOpenQuiz}
              type="button"
            >
              QUIZ
            </button>
          </>
        ) : null}
      </div>

      <div className="header-center" />

      <div className="header-right">
        <button className="ghost-button" onClick={onOpenShop} type="button">
          SHOP
        </button>

        <div className="header-menu-wrap">
          <button className="primary-button" onClick={onToggleAuthMenu} type="button">
            SIGN IN
          </button>
          {authMenuOpen ? (
            <AuthPopover
              authPending={authPending}
              authView={authView}
              hasAdmin={hasAdmin}
              isAdmin={isAdmin}
              loginForm={loginForm}
              loginMessage={loginMessage}
              onBootstrapChange={onBootstrapChange}
              onCreateAdmin={onCreateAdmin}
              onLogin={onLogin}
              onLoginChange={onLoginChange}
              onOpenAdmin={onOpenAdmin}
              onSelectView={onSelectAuthView}
              onSignOut={onSignOut}
              profile={profile}
              setupForm={setupForm}
              setupMessage={setupMessage}
              viewingAdmin={viewingAdmin}
            />
          ) : null}
        </div>
      </div>
    </header>
  )
}

function MemoryVersePage({
  activeMemoryVerse,
  awardPendingPlayerId,
  isAdmin,
  memoryVerseForm,
  memoryVerseResult,
  onAwardPlayer,
  onCoverAll,
  onCoverNext,
  onMemoryVerseChange,
  onRedoCover,
  onResetCover,
  onRunMemoryVerse,
  onUndoCover,
  players,
  playersLoading,
  playersMessage,
  verseAwardResult,
}) {
  const tokens = useMemo(() => buildMemoryVerseTokens(activeMemoryVerse.text), [activeMemoryVerse.text])
  const totalWords = useMemo(() => getMemoryVerseWordCount(activeMemoryVerse.text), [activeMemoryVerse.text])
  const coveredCount = Math.min(activeMemoryVerse.coveredCount, totalWords)
  const hasVerse = Boolean(activeMemoryVerse.reference || activeMemoryVerse.text)

  return (
    <section className="panel memory-verse-shell">
      <div className="memory-verse-main">
        <div className="content-intro">
          <div>
            <div className="eyebrow">Memory Verse Helper</div>
            <h2>Paste the verse, then hide it little by little</h2>
          </div>
          <p className="panel-copy">
            Set the book and verse text, run the helper, then cover one word at a time while the players recite.
          </p>
        </div>

        <div className="memory-verse-grid">
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

          <div className="workspace-card memory-helper-card">
            {hasVerse ? (
              <>
                <div className="memory-helper-header">
                  <div>
                    <div className="eyebrow">Active Verse</div>
                    <h3>{activeMemoryVerse.reference || 'Memory verse'}</h3>
                  </div>
                  <div className="memory-progress-badge">
                    {coveredCount}/{totalWords || 0} covered
                  </div>
                </div>

                <div className="memory-helper-controls">
                  <button className="ghost-button compact-button" onClick={onCoverNext} type="button">
                    Cover next
                  </button>
                  <button className="ghost-button compact-button" onClick={onUndoCover} type="button">
                    &lt; Undo
                  </button>
                  <button className="ghost-button compact-button" onClick={onRedoCover} type="button">
                    Redo &gt;
                  </button>
                  <button className="ghost-button compact-button" onClick={onResetCover} type="button">
                    Reset
                  </button>
                  <button className="ghost-button compact-button" onClick={onCoverAll} type="button">
                    Cover all
                  </button>
                </div>

                <div className="memory-verse-display">
                  {tokens.map((token) =>
                    token.isWord ? (
                      <span
                        className={`memory-token ${token.wordIndex < coveredCount ? 'hidden' : ''}`}
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
              </>
            ) : (
              <div className="empty-state-card">
                <h3>No verse running yet</h3>
                <p className="panel-note">Paste a verse on the left and click `Run helper` to start covering words.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="memory-verse-sidebar workspace-card">
        <div className="content-intro">
          <div>
            <div className="eyebrow">Verse Rewards</div>
            <h3>Give 50 gold</h3>
          </div>
          <p className="panel-copy">When a player recites the verse, tap their button to reward them.</p>
        </div>

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
      </aside>
    </section>
  )
}

function QuizPage({
  isAdmin,
  onAddQuizQuestion,
  onAwardPlayer,
  onFinishQuiz,
  onNextQuizQuestion,
  onPreviousQuizQuestion,
  onQuizAwardChange,
  onQuizQuestionChange,
  onRemoveQuizQuestion,
  onStartQuiz,
  players,
  playersLoading,
  playersMessage,
  quizAwardForm,
  quizAwardPendingPlayerId,
  quizAwardResult,
  quizCurrentIndex,
  quizQuestions,
  selectedPlayerId,
  onSelectPlayer,
}) {
  const pointGroups = useMemo(() => buildQuizPointGroups(quizQuestions), [quizQuestions])
  const activeQuestion =
    quizCurrentIndex >= 0 && quizCurrentIndex < quizQuestions.length ? quizQuestions[quizCurrentIndex] : null
  const quizFinished = quizQuestions.length > 0 && quizCurrentIndex >= quizQuestions.length

  return (
    <section className="panel memory-verse-shell">
      <div className="memory-verse-main">
        <div className="content-intro">
          <div>
            <div className="eyebrow">Quiz Helper</div>
            <h2>Build the questions, then present them one by one</h2>
          </div>
          <p className="panel-copy">
            Add each question with its point value. The presentation card will show only the current question number,
            points, and text.
          </p>
        </div>

        <div className="memory-verse-grid">
          <div className="workspace-card quiz-editor-card">
            <div className="card-heading">
              <h3>Questions</h3>
              <button className="ghost-button compact-button" onClick={onAddQuizQuestion} type="button">
                Add question
              </button>
            </div>

            <div className="quiz-question-list">
              {quizQuestions.length ? (
                quizQuestions.map((question, index) => (
                  <div className="quiz-question-card" key={question.id}>
                    <div className="quiz-question-card-top">
                      <strong>Question {index + 1}</strong>
                      <button className="ghost-button compact-button" onClick={() => onRemoveQuizQuestion(question.id)} type="button">
                        Remove
                      </button>
                    </div>

                    <label className="field">
                      <span>Question text</span>
                      <textarea
                        name="prompt"
                        onChange={(event) => onQuizQuestionChange(question.id, 'prompt', event.target.value)}
                        rows={3}
                        value={question.prompt}
                      />
                    </label>

                    <label className="field">
                      <span>Points</span>
                      <input
                        inputMode="numeric"
                        name="points"
                        onChange={(event) => onQuizQuestionChange(question.id, 'points', event.target.value)}
                        value={question.points}
                      />
                    </label>
                  </div>
                ))
              ) : (
                <p className="panel-note">Add your first quiz question to begin.</p>
              )}
            </div>

            {pointGroups.length ? (
              <div className="quiz-points-summary">
                <div className="eyebrow">Point Summary</div>
                {pointGroups.map((group) => (
                  <div className="quiz-summary-row" key={`${group.start}-${group.end}-${group.points}`}>
                    <strong>
                      Question{group.start === group.end ? '' : 's'} {group.start}
                      {group.start === group.end ? '' : `-${group.end}`}
                    </strong>
                    <span>
                      {group.points} pt{group.points === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="workspace-card memory-helper-card">
            {quizQuestions.length ? (
              <>
                <div className="memory-helper-header">
                  <div>
                    <div className="eyebrow">Presentation</div>
                    <h3>{quizFinished ? 'Quiz finished' : `Question ${quizCurrentIndex + 1}`}</h3>
                  </div>
                  {!quizFinished && activeQuestion ? (
                    <div className="memory-progress-badge">
                      {Number(activeQuestion.points) || 0} pt{Number(activeQuestion.points) === 1 ? '' : 's'}
                    </div>
                  ) : null}
                </div>

                <div className="memory-helper-controls">
                  <button className="ghost-button compact-button" onClick={onStartQuiz} type="button">
                    Start
                  </button>
                  <button className="ghost-button compact-button" onClick={onPreviousQuizQuestion} type="button">
                    Previous
                  </button>
                  <button className="ghost-button compact-button" onClick={onNextQuizQuestion} type="button">
                    Next
                  </button>
                  <button className="ghost-button compact-button" onClick={onFinishQuiz} type="button">
                    Finish
                  </button>
                </div>

                <div className="memory-verse-display quiz-display-card">
                  {quizFinished ? (
                    <div className="quiz-finished-state">
                      <div className="eyebrow">Quiz Complete</div>
                      <h3>Now you can award the players on the right.</h3>
                    </div>
                  ) : activeQuestion ? (
                    <div className="quiz-display-content">
                      <div className="quiz-display-label">
                        Question {quizCurrentIndex + 1} ({Number(activeQuestion.points) || 0} pt
                        {(Number(activeQuestion.points) || 0) === 1 ? '' : 's'})
                      </div>
                      <div className="quiz-display-question">{activeQuestion.prompt || 'Add the question text on the left.'}</div>
                    </div>
                  ) : (
                    <div className="empty-state-card">
                      <h3>Ready to present</h3>
                      <p className="panel-note">Click `Start` when you are ready to show the first question.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state-card">
                <h3>No quiz yet</h3>
                <p className="panel-note">Create some questions first so the presentation view can start.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="memory-verse-sidebar workspace-card">
        <div className="content-intro">
          <div>
            <div className="eyebrow">Quiz Rewards</div>
            <h3>Add gold after the quiz</h3>
          </div>
          <p className="panel-copy">Select a player, set the gold amount, then award it directly from here.</p>
        </div>

        {!isAdmin ? (
          <p className="panel-note">Only the admin can award quiz gold.</p>
        ) : playersLoading ? (
          <p className="panel-note">Loading players...</p>
        ) : players.length ? (
          <>
            <div className="player-browser-list">
              {players.map((player) => (
                <button
                  className={`player-browser-item ${selectedPlayerId === player.id ? 'active' : ''}`}
                  key={player.id}
                  onClick={() => onSelectPlayer(player.id)}
                  type="button"
                >
                  <div>
                    <strong>{player.display_name}</strong>
                    <span>{player.gold} gold</span>
                  </div>
                </button>
              ))}
            </div>

            <label className="field">
              <span>Gold amount</span>
              <input
                inputMode="numeric"
                name="amount"
                onChange={onQuizAwardChange}
                value={quizAwardForm.amount}
              />
            </label>

            <button
              className="primary-button"
              disabled={!selectedPlayerId || Boolean(quizAwardPendingPlayerId)}
              onClick={() => onAwardPlayer(selectedPlayerId)}
              type="button"
            >
              {quizAwardPendingPlayerId ? 'Adding gold...' : 'Add gold to selected player'}
            </button>
          </>
        ) : (
          <p className="panel-note">Create player accounts first so you can reward them here.</p>
        )}

        {playersMessage.text ? <p className={`status-line ${playersMessage.type}`}>{playersMessage.text}</p> : null}
        {quizAwardResult.text ? <p className={`status-line ${quizAwardResult.type}`}>{quizAwardResult.text}</p> : null}
      </aside>
    </section>
  )
}

export default function AdminApp() {
  const [pathname, setPathname] = useState(() => window.location.pathname || '/')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [hasAdmin, setHasAdmin] = useState(false)
  const [authPending, setAuthPending] = useState(false)
  const [createPlayerPending, setCreatePlayerPending] = useState(false)
  const [playersLoading, setPlayersLoading] = useState(false)
  const [goldPending, setGoldPending] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [players, setPlayers] = useState([])
  const [publicPlayers, setPublicPlayers] = useState([])
  const [adminSection, setAdminSection] = useState(ADMIN_SECTIONS.createPlayer)
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [viewedPlayerId, setViewedPlayerId] = useState('')
  const [authMenuOpen, setAuthMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [authView, setAuthView] = useState(AUTH_VIEWS.player)
  const [loginMessage, setLoginMessage] = useState(createEmptyMessage)
  const [setupMessage, setSetupMessage] = useState(createEmptyMessage)
  const [createPlayerResult, setCreatePlayerResult] = useState(createEmptyMessage)
  const [memoryVerseResult, setMemoryVerseResult] = useState(createEmptyMessage)
  const [playersMessage, setPlayersMessage] = useState(createEmptyMessage)
  const [goldResult, setGoldResult] = useState(createEmptyMessage)
  const [deleteResult, setDeleteResult] = useState(createEmptyMessage)
  const [verseAwardResult, setVerseAwardResult] = useState(createEmptyMessage)
  const [quizAwardResult, setQuizAwardResult] = useState(createEmptyMessage)
  const [awardPendingPlayerId, setAwardPendingPlayerId] = useState('')
  const [quizAwardPendingPlayerId, setQuizAwardPendingPlayerId] = useState('')
  const [loginForm, setLoginForm] = useState({
    loginName: '',
    password: '',
  })
  const [setupForm, setSetupForm] = useState({
    displayName: '',
    loginName: '',
    password: '',
    confirmPassword: '',
  })
  const [createPlayerForm, setCreatePlayerForm] = useState({
    displayName: '',
    loginName: '',
    password: '',
    startingGold: '250',
  })
  const [memoryVerseForm, setMemoryVerseForm] = useState(createEmptyMemoryVerseForm)
  const [activeMemoryVerse, setActiveMemoryVerse] = useState(createEmptyActiveMemoryVerse)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizCurrentIndex, setQuizCurrentIndex] = useState(-1)
  const [quizAwardForm, setQuizAwardForm] = useState(createEmptyQuizAwardForm)
  const [goldForm, setGoldForm] = useState({
    amount: '',
  })
  const sessionUserId = session?.user?.id ?? ''

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname || '/')
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    try {
      const savedValue = window.localStorage.getItem(MEMORY_VERSE_STORAGE_KEY)

      if (!savedValue) {
        return
      }

      const parsed = JSON.parse(savedValue)
      setMemoryVerseForm(parsed.form || createEmptyMemoryVerseForm())
      setActiveMemoryVerse(parsed.active || createEmptyActiveMemoryVerse())
    } catch {
      setMemoryVerseForm(createEmptyMemoryVerseForm())
      setActiveMemoryVerse(createEmptyActiveMemoryVerse())
    }
  }, [])

  useEffect(() => {
    try {
      const savedValue = window.localStorage.getItem(QUIZ_STORAGE_KEY)

      if (!savedValue) {
        return
      }

      const parsed = JSON.parse(savedValue)
      setQuizQuestions(parsed.questions || [])
      setQuizCurrentIndex(typeof parsed.currentIndex === 'number' ? parsed.currentIndex : -1)
      setQuizAwardForm(parsed.awardForm || createEmptyQuizAwardForm())
    } catch {
      setQuizQuestions([])
      setQuizCurrentIndex(-1)
      setQuizAwardForm(createEmptyQuizAwardForm())
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      MEMORY_VERSE_STORAGE_KEY,
      JSON.stringify({
        form: memoryVerseForm,
        active: activeMemoryVerse,
      }),
    )
  }, [activeMemoryVerse, memoryVerseForm])

  useEffect(() => {
    window.localStorage.setItem(
      QUIZ_STORAGE_KEY,
      JSON.stringify({
        questions: quizQuestions,
        currentIndex: quizCurrentIndex,
        awardForm: quizAwardForm,
      }),
    )
  }, [quizAwardForm, quizCurrentIndex, quizQuestions])

  useEffect(() => {
    if (!hasSupabaseEnv || !supabase) {
      setAuthLoading(false)
      return undefined
    }

    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session ?? null)
        setAuthLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null)
      setAuthLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!hasSupabaseEnv) {
      return
    }

    let cancelled = false

    const loadAdminStatus = async () => {
      try {
        const response = await fetch('/api/admin-status')
        const data = await readJson(response)

        if (cancelled) {
          return
        }

        if (!response.ok) {
          throw new Error(data.error || 'Unable to check admin status.')
        }

        setHasAdmin(Boolean(data.hasAdmin))
      } catch (error) {
        if (!cancelled) {
          setSetupMessage({
            type: 'error',
            text: error.message,
          })
        }
      }
    }

    loadAdminStatus()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!sessionUserId || !supabase) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    let cancelled = false

    const loadProfile = async () => {
      setProfileLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, gold, login_name, role')
        .eq('id', sessionUserId)
        .single()

      if (cancelled) {
        return
      }

      if (error) {
        setProfile(null)
        setProfileLoading(false)
        setLoginMessage({
          type: 'error',
          text: error.message,
        })
        return
      }

      setProfile(data)
      setProfileLoading(false)
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [sessionUserId])

  const isAdmin = useMemo(() => isAdminProfile(profile), [profile])
  const viewingAdmin = pathname === ADMIN_PATH
  const viewingMemory = pathname === MEMORY_PATH
  const viewingQuiz = pathname === QUIZ_PATH
  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  )
  const viewedPlayer = useMemo(() => {
    const currentPlayer = publicPlayers.find((player) => player.id === viewedPlayerId) ?? null
    return mergeViewedPlayer(currentPlayer, profile)
  }, [profile, publicPlayers, viewedPlayerId])

  const navigate = (nextPath) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }

    setPathname(nextPath)
  }

  const applySession = async (nextSession) => {
    if (!supabase) {
      return
    }

    await supabase.auth.setSession({
      access_token: nextSession.access_token,
      refresh_token: nextSession.refresh_token,
    })
  }

  const loadPublicPlayers = useCallback(
    async ({ preferredPlayerId = '', preserveSelection = true } = {}) => {
      if (!hasSupabaseEnv) {
        setPublicPlayers([])
        setViewedPlayerId('')
        return
      }

      try {
        const response = await fetch('/api/public-players')
        const data = await readJson(response)

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load player profiles.')
        }

        const nextPlayers = data.players ?? []
        setPublicPlayers(nextPlayers)

        const currentProfileId = profile?.role === 'player' ? profile.id : ''
        const preferredId = preferredPlayerId || (preserveSelection ? viewedPlayerId : '') || currentProfileId
        const hasPreferred = nextPlayers.some((player) => player.id === preferredId)

        if (hasPreferred) {
          setViewedPlayerId(preferredId)
        } else if (nextPlayers.length) {
          setViewedPlayerId(nextPlayers[0].id)
        } else {
          setViewedPlayerId('')
        }
      } catch (error) {
        setPlayersMessage({
          type: 'error',
          text: error.message,
        })
      }
    },
    [profile, viewedPlayerId],
  )

  useEffect(() => {
    loadPublicPlayers()
  }, [loadPublicPlayers])

  useEffect(() => {
    if (profile?.role !== 'player') {
      return
    }

    if (publicPlayers.some((player) => player.id === profile.id)) {
      setViewedPlayerId(profile.id)
    }
  }, [profile, publicPlayers])

  const loadPlayers = useCallback(
    async ({ preserveSelection = true, preferredPlayerId = '' } = {}) => {
      if (!session?.access_token) {
        return
      }

      setPlayersLoading(true)
      setPlayersMessage(createEmptyMessage())

      try {
        const response = await fetch('/api/admin-players', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        const data = await readJson(response)

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load players.')
        }

        const nextPlayers = data.players ?? []
        setPlayers(nextPlayers)

        const preferredId = preferredPlayerId || (preserveSelection ? selectedPlayerId : '')
        const playerExists = nextPlayers.some((player) => player.id === preferredId)

        if (playerExists) {
          setSelectedPlayerId(preferredId)
        } else if (nextPlayers.length) {
          setSelectedPlayerId(nextPlayers[0].id)
        } else {
          setSelectedPlayerId('')
        }
      } catch (error) {
        setPlayersMessage({
          type: 'error',
          text: error.message,
        })
      } finally {
        setPlayersLoading(false)
      }
    },
    [selectedPlayerId, session?.access_token],
  )

  useEffect(() => {
    if ((!viewingAdmin && !viewingMemory && !viewingQuiz) || !isAdmin || !session?.access_token) {
      return
    }

    loadPlayers()
  }, [viewingAdmin, viewingMemory, viewingQuiz, isAdmin, session?.access_token, loadPlayers])

  const handleToggleAuthMenu = () => {
    setAuthMenuOpen((current) => !current)
    setProfileMenuOpen(false)
  }

  const handleOpenProfileMenu = () => {
    setProfileMenuOpen((current) => !current)
    setAuthMenuOpen(false)
  }

  const handleLoginChange = (event) => {
    const { name, value } = event.target
    setLoginForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleBootstrapChange = (event) => {
    const { name, value } = event.target
    setSetupForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleCreatePlayerChange = (event) => {
    const { name, value } = event.target
    setCreatePlayerForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleMemoryVerseChange = (event) => {
    const { name, value } = event.target
    setMemoryVerseForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleQuizAwardChange = (event) => {
    const { name, value } = event.target
    setQuizAwardForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleGoldFormChange = (event) => {
    const { name, value } = event.target
    setGoldForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoginMessage(createEmptyMessage())
    setSetupMessage(createEmptyMessage())
    setAuthPending(true)

    try {
      const response = await fetch('/api/login-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginName: normalizeLoginName(loginForm.loginName),
          password: loginForm.password,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to sign in.')
      }

      await applySession(data.session)
      setLoginForm({
        loginName: '',
        password: '',
      })
      setAuthMenuOpen(false)
      setProfileMenuOpen(false)
      setLoginMessage(createEmptyMessage())
    } catch (error) {
      setLoginMessage({
        type: 'error',
        text: error.message,
      })
    } finally {
      setAuthPending(false)
    }
  }

  const handleCreateAdmin = async (event) => {
    event.preventDefault()
    setSetupMessage(createEmptyMessage())
    setAuthPending(true)

    try {
      if (setupForm.password.length < 6) {
        throw new Error('Choose a password with at least 6 characters.')
      }

      if (setupForm.password !== setupForm.confirmPassword) {
        throw new Error('The password confirmation does not match.')
      }

      const response = await fetch('/api/bootstrap-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: setupForm.displayName,
          loginName: normalizeLoginName(setupForm.loginName),
          password: setupForm.password,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to create the admin account.')
      }

      await applySession(data.session)
      setHasAdmin(true)
      setSetupForm({
        displayName: '',
        loginName: '',
        password: '',
        confirmPassword: '',
      })
      setAuthMenuOpen(false)
      navigate(ADMIN_PATH)
    } catch (error) {
      setSetupMessage({
        type: 'error',
        text: error.message,
      })
    } finally {
      setAuthPending(false)
    }
  }

  const handleCreatePlayer = async (event) => {
    event.preventDefault()
    setCreatePlayerResult(createEmptyMessage())
    setCreatePlayerPending(true)

    try {
      const startingGold = Number(createPlayerForm.startingGold)

      if (!session?.access_token) {
        throw new Error('Your admin session is missing. Please log in again.')
      }

      if (createPlayerForm.password.length < 6) {
        throw new Error('Player passwords must be at least 6 characters long.')
      }

      if (!Number.isInteger(startingGold) || startingGold < 0) {
        throw new Error('Starting gold must be a whole number that is zero or higher.')
      }

      const response = await fetch('/api/create-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          displayName: createPlayerForm.displayName,
          loginName: normalizeLoginName(createPlayerForm.loginName),
          password: createPlayerForm.password,
          startingGold,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to create the player account.')
      }

      setCreatePlayerForm({
        displayName: '',
        loginName: '',
        password: '',
        startingGold: String(startingGold),
      })
      setCreatePlayerResult({
        type: 'success',
        text: `Player "${data.player.displayName}" created. Share the login name "${data.player.loginName}" with the password you set.`,
      })
      setDeleteResult(createEmptyMessage())
      await loadPlayers({
        preserveSelection: false,
        preferredPlayerId: data.player.id,
      })
      await loadPublicPlayers({
        preserveSelection: false,
        preferredPlayerId: data.player.id,
      })
      setAdminSection(ADMIN_SECTIONS.manageGold)
    } catch (error) {
      setCreatePlayerResult({
        type: 'error',
        text: error.message,
      })
    } finally {
      setCreatePlayerPending(false)
    }
  }

  const handleAdjustGold = async (event) => {
    event.preventDefault()
    setGoldResult(createEmptyMessage())
    setGoldPending(true)

    try {
      const amount = Number(goldForm.amount)

      if (!session?.access_token) {
        throw new Error('Your admin session is missing. Please log in again.')
      }

      if (!selectedPlayerId) {
        throw new Error('Select a player first.')
      }

      if (!Number.isInteger(amount) || amount === 0) {
        throw new Error('Enter a whole number that is not zero.')
      }

      const response = await fetch('/api/adjust-player-gold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          amount,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to update player gold.')
      }

      setGoldForm({ amount: '' })
      setGoldResult({
        type: 'success',
        text: `${formatGoldChange(amount)} gold applied to ${data.player.display_name}. New balance: ${data.player.gold}.`,
      })
      setDeleteResult(createEmptyMessage())

      setPlayers((current) =>
        current.map((player) => (player.id === data.player.id ? { ...player, ...data.player } : player)),
      )
      setPublicPlayers((current) =>
        current.map((player) => (player.id === data.player.id ? { ...player, ...data.player } : player)),
      )
    } catch (error) {
      setGoldResult({
        type: 'error',
        text: error.message,
      })
    } finally {
      setGoldPending(false)
    }
  }

  const handleQuickGoldAmount = (amount) => {
    setGoldForm({
      amount: String(amount),
    })
  }

  const handleRunMemoryVerse = (event) => {
    event.preventDefault()

    if (!memoryVerseForm.reference.trim() && !memoryVerseForm.text.trim()) {
      setMemoryVerseResult({
        type: 'error',
        text: 'Add the book title or the verse text first.',
      })
      return
    }

    setActiveMemoryVerse({
      reference: memoryVerseForm.reference.trim(),
      text: memoryVerseForm.text.trim(),
      coveredCount: 0,
    })
    setMemoryVerseResult({
      type: 'success',
      text: 'Memory verse helper is ready.',
    })
  }

  const handleCoverNext = () => {
    setActiveMemoryVerse((current) => {
      const totalWords = getMemoryVerseWordCount(current.text)

      return {
        ...current,
        coveredCount: Math.min(current.coveredCount + 1, totalWords),
      }
    })
  }

  const handleUndoCover = () => {
    setActiveMemoryVerse((current) => ({
      ...current,
      coveredCount: Math.max(current.coveredCount - 1, 0),
    }))
  }

  const handleRedoCover = () => {
    setActiveMemoryVerse((current) => {
      const totalWords = getMemoryVerseWordCount(current.text)

      return {
        ...current,
        coveredCount: Math.min(current.coveredCount + 1, totalWords),
      }
    })
  }

  const handleResetCover = () => {
    setActiveMemoryVerse((current) => ({
      ...current,
      coveredCount: 0,
    }))
  }

  const handleCoverAll = () => {
    setActiveMemoryVerse((current) => ({
      ...current,
      coveredCount: getMemoryVerseWordCount(current.text),
    }))
  }

  const handleAddQuizQuestion = () => {
    setQuizQuestions((current) => [...current, createEmptyQuizQuestion()])
    setQuizAwardResult(createEmptyMessage())
  }

  const handleQuizQuestionChange = (questionId, field, value) => {
    setQuizQuestions((current) =>
      current.map((question) => (question.id === questionId ? { ...question, [field]: value } : question)),
    )
  }

  const handleRemoveQuizQuestion = (questionId) => {
    setQuizQuestions((current) => {
      const nextQuestions = current.filter((question) => question.id !== questionId)
      setQuizCurrentIndex((currentIndex) => {
        if (!nextQuestions.length) {
          return -1
        }

        if (currentIndex >= nextQuestions.length) {
          return nextQuestions.length - 1
        }

        return currentIndex
      })
      return nextQuestions
    })
  }

  const handleStartQuiz = () => {
    if (!quizQuestions.length) {
      setQuizAwardResult({
        type: 'error',
        text: 'Add at least one question first.',
      })
      return
    }

    setQuizCurrentIndex(0)
    setQuizAwardResult(createEmptyMessage())
  }

  const handlePreviousQuizQuestion = () => {
    setQuizCurrentIndex((current) => Math.max(current - 1, 0))
  }

  const handleNextQuizQuestion = () => {
    setQuizCurrentIndex((current) => {
      if (!quizQuestions.length) {
        return -1
      }

      return Math.min(current + 1, quizQuestions.length)
    })
  }

  const handleFinishQuiz = () => {
    if (!quizQuestions.length) {
      return
    }

    setQuizCurrentIndex(quizQuestions.length)
  }

  const handleAwardMemoryGold = async (playerId) => {
    setVerseAwardResult(createEmptyMessage())
    setAwardPendingPlayerId(playerId)

    try {
      if (!session?.access_token || !isAdmin) {
        throw new Error('Sign in as admin to reward players.')
      }

      const response = await fetch('/api/adjust-player-gold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          playerId,
          amount: 50,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to add the verse reward.')
      }

      setVerseAwardResult({
        type: 'success',
        text: `+50 gold added to ${data.player.display_name}.`,
      })
      setPlayers((current) =>
        current.map((player) => (player.id === data.player.id ? { ...player, ...data.player } : player)),
      )
      setPublicPlayers((current) =>
        current.map((player) => (player.id === data.player.id ? { ...player, ...data.player } : player)),
      )
    } catch (error) {
      setVerseAwardResult({
        type: 'error',
        text: error.message,
      })
    } finally {
      setAwardPendingPlayerId('')
    }
  }

  const handleAwardQuizGold = async (playerId) => {
    setQuizAwardResult(createEmptyMessage())
    setQuizAwardPendingPlayerId(playerId)

    try {
      if (!session?.access_token || !isAdmin) {
        throw new Error('Sign in as admin to reward players.')
      }

      const amount = Number(quizAwardForm.amount)

      if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error('Enter a whole gold amount greater than zero.')
      }

      const response = await fetch('/api/adjust-player-gold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          playerId,
          amount,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to add quiz gold.')
      }

      setQuizAwardResult({
        type: 'success',
        text: `${formatGoldChange(amount)} gold added to ${data.player.display_name}.`,
      })
      setPlayers((current) =>
        current.map((player) => (player.id === data.player.id ? { ...player, ...data.player } : player)),
      )
      setPublicPlayers((current) =>
        current.map((player) => (player.id === data.player.id ? { ...player, ...data.player } : player)),
      )
    } catch (error) {
      setQuizAwardResult({
        type: 'error',
        text: error.message,
      })
    } finally {
      setQuizAwardPendingPlayerId('')
    }
  }

  const handleDeletePlayer = async () => {
    setDeleteResult(createEmptyMessage())
    setDeletePending(true)

    try {
      if (!session?.access_token) {
        throw new Error('Your admin session is missing. Please log in again.')
      }

      if (!selectedPlayerId || !selectedPlayer) {
        throw new Error('Select a player first.')
      }

      const confirmed = window.confirm(
        `Delete ${selectedPlayer.display_name}? This permanently removes the player account and saved data.`,
      )

      if (!confirmed) {
        return
      }

      const deletedPlayerId = selectedPlayer.id
      const response = await fetch('/api/delete-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          playerId: deletedPlayerId,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to delete the player account.')
      }

      setDeleteResult({
        type: 'success',
        text: `${data.player.display_name} was deleted permanently.`,
      })
      setGoldResult(createEmptyMessage())

      await loadPlayers({
        preserveSelection: false,
      })
      await loadPublicPlayers({
        preserveSelection: viewedPlayerId !== deletedPlayerId,
      })
    } catch (error) {
      setDeleteResult({
        type: 'error',
        text: error.message,
      })
    } finally {
      setDeletePending(false)
    }
  }

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }

    setProfile(null)
    setPlayers([])
    setSelectedPlayerId('')
    setAuthMenuOpen(false)
    setProfileMenuOpen(false)
    setLoginMessage(createEmptyMessage())
    setCreatePlayerResult(createEmptyMessage())
    setGoldResult(createEmptyMessage())
    setDeleteResult(createEmptyMessage())
    setVerseAwardResult(createEmptyMessage())
    setQuizAwardResult(createEmptyMessage())
    navigate('/')
  }

  const handleToggleAdmin = () => {
    setAuthMenuOpen(false)
    setProfileMenuOpen(false)
    navigate(viewingAdmin ? '/' : ADMIN_PATH)
  }

  const handleOpenMemoryVerse = () => {
    setAuthMenuOpen(false)
    setProfileMenuOpen(false)
    navigate(MEMORY_PATH)
  }

  const handleOpenQuiz = () => {
    setAuthMenuOpen(false)
    setProfileMenuOpen(false)
    navigate(QUIZ_PATH)
  }

  const handleSelectViewedPlayer = (playerId) => {
    setViewedPlayerId(playerId)
    setProfileMenuOpen(false)

    if (pathname !== '/') {
      navigate('/')
    }
  }

  const showSetupMessage = !hasSupabaseEnv
  const readyForProtectedView = !authLoading && !profileLoading && session && profile
  const showGameScene = !viewingMemory && !viewingQuiz && (readyForProtectedView || viewingAdmin)

  return (
    <div className={`portal-shell ${showGameScene ? 'game-mode' : 'auth-mode'}`}>
      {showGameScene ? (
        <div className="portal-scene">
          <AquariumScene />
        </div>
      ) : null}

      <div className="portal-overlay top-layout">
        <GameTopBar
          authMenuOpen={authMenuOpen}
          authPending={authPending}
          authView={authView}
          hasAdmin={hasAdmin}
          isAdmin={isAdmin}
          loginForm={loginForm}
          loginMessage={loginMessage}
          onBootstrapChange={handleBootstrapChange}
          onCreateAdmin={handleCreateAdmin}
          onLogin={handleLogin}
          onLoginChange={handleLoginChange}
          onOpenAdmin={handleToggleAdmin}
          onOpenMemoryVerse={handleOpenMemoryVerse}
          onOpenProfileMenu={handleOpenProfileMenu}
          onOpenQuiz={handleOpenQuiz}
          onOpenShop={() => {}}
          onSelectViewedPlayer={handleSelectViewedPlayer}
          onSelectAuthView={setAuthView}
          onSignOut={handleSignOut}
          onToggleAuthMenu={handleToggleAuthMenu}
          profile={profile}
          publicPlayers={publicPlayers}
          profileMenuOpen={profileMenuOpen}
          setupForm={setupForm}
          setupMessage={setupMessage}
          viewedPlayer={viewedPlayer}
          viewingMemory={viewingMemory}
          viewingQuiz={viewingQuiz}
          viewingAdmin={viewingAdmin}
        />

        {showSetupMessage ? (
          <section className="env-warning panel">
            <div className="eyebrow">Setup Needed</div>
            <p className="panel-copy">
              Add your `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`
              values before using admin and account features.
            </p>
          </section>
        ) : null}

        {viewingMemory && isAdmin ? (
          <div className="memory-stage">
            <MemoryVersePage
              activeMemoryVerse={activeMemoryVerse}
              awardPendingPlayerId={awardPendingPlayerId}
              isAdmin={isAdmin}
              memoryVerseForm={memoryVerseForm}
              memoryVerseResult={memoryVerseResult}
              onAwardPlayer={handleAwardMemoryGold}
              onCoverAll={handleCoverAll}
              onCoverNext={handleCoverNext}
              onMemoryVerseChange={handleMemoryVerseChange}
              onRedoCover={handleRedoCover}
              onResetCover={handleResetCover}
              onRunMemoryVerse={handleRunMemoryVerse}
              onUndoCover={handleUndoCover}
              players={players}
              playersLoading={playersLoading}
              playersMessage={playersMessage}
              verseAwardResult={verseAwardResult}
            />
          </div>
        ) : null}

        {viewingQuiz && isAdmin ? (
          <div className="memory-stage">
            <QuizPage
              isAdmin={isAdmin}
              onAddQuizQuestion={handleAddQuizQuestion}
              onAwardPlayer={handleAwardQuizGold}
              onFinishQuiz={handleFinishQuiz}
              onNextQuizQuestion={handleNextQuizQuestion}
              onPreviousQuizQuestion={handlePreviousQuizQuestion}
              onQuizAwardChange={handleQuizAwardChange}
              onQuizQuestionChange={handleQuizQuestionChange}
              onRemoveQuizQuestion={handleRemoveQuizQuestion}
              onSelectPlayer={setSelectedPlayerId}
              onStartQuiz={handleStartQuiz}
              players={players}
              playersLoading={playersLoading}
              playersMessage={playersMessage}
              quizAwardForm={quizAwardForm}
              quizAwardPendingPlayerId={quizAwardPendingPlayerId}
              quizAwardResult={quizAwardResult}
              quizCurrentIndex={quizCurrentIndex}
              quizQuestions={quizQuestions}
              selectedPlayerId={selectedPlayerId}
            />
          </div>
        ) : null}

        {(viewingMemory || viewingQuiz) && !isAdmin ? (
          <section className="panel memory-locked-panel">
            <div className="eyebrow">Admin Only</div>
            <h2>This page is only for the admin.</h2>
            <p className="panel-copy">Sign in with the admin account to open and control this teaching tool.</p>
          </section>
        ) : null}

        {viewingAdmin && readyForProtectedView && isAdmin ? (
          <div className="admin-stage">
            <AdminPanel
              adminSection={adminSection}
              createPlayerForm={createPlayerForm}
              createPlayerPending={createPlayerPending}
              createPlayerResult={createPlayerResult}
              deletePending={deletePending}
              deleteResult={deleteResult}
              goldForm={goldForm}
              goldPending={goldPending}
              goldResult={goldResult}
              onAdjustGold={handleAdjustGold}
              onCreatePlayer={handleCreatePlayer}
              onCreatePlayerChange={handleCreatePlayerChange}
              onDeletePlayer={handleDeletePlayer}
              onGoldFormChange={handleGoldFormChange}
              onLogout={handleSignOut}
              onQuickGoldAmount={handleQuickGoldAmount}
              onReturnToGame={() => navigate('/')}
              onSectionChange={setAdminSection}
              onSelectPlayer={setSelectedPlayerId}
              players={players}
              playersLoading={playersLoading}
              playersMessage={playersMessage}
              profile={profile}
              selectedPlayer={selectedPlayer}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
