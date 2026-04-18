import { useCallback, useEffect, useMemo, useState } from 'react'
import './AdminApp.css'
import AquariumScene from './components/AquariumScene'
import { hasSupabaseEnv, supabase } from './lib/supabase'

const ADMIN_PATH = '/admin'
const ADMIN_SECTIONS = {
  createPlayer: 'create-player',
  manageGold: 'manage-gold',
}
const QUICK_GOLD_ACTIONS = [25, 50, 100, -25, -50, -100]
const AUTH_VIEWS = {
  player: 'player',
  admin: 'admin',
}

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

function AdminPanel({
  adminSection,
  createPlayerForm,
  createPlayerPending,
  createPlayerResult,
  goldForm,
  goldPending,
  goldResult,
  onAdjustGold,
  onCreatePlayer,
  onCreatePlayerChange,
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
        ) : (
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
  onOpenProfileMenu,
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
      </div>

      <div className="header-center">
        {profile ? (
          <div className="gold-display-pill">
            <strong>GOLD: {profile.gold ?? 0}</strong>
          </div>
        ) : null}
      </div>

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
  const [playersMessage, setPlayersMessage] = useState(createEmptyMessage)
  const [goldResult, setGoldResult] = useState(createEmptyMessage)
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
    if (!viewingAdmin || !isAdmin || !session?.access_token) {
      return
    }

    loadPlayers()
  }, [viewingAdmin, isAdmin, session?.access_token, loadPlayers])

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
    navigate('/')
  }

  const handleToggleAdmin = () => {
    setAuthMenuOpen(false)
    setProfileMenuOpen(false)
    navigate(viewingAdmin ? '/' : ADMIN_PATH)
  }

  const handleSelectViewedPlayer = (playerId) => {
    setViewedPlayerId(playerId)
    setProfileMenuOpen(false)
  }

  const showSetupMessage = !hasSupabaseEnv
  const readyForProtectedView = !authLoading && !profileLoading && session && profile
  const showGameScene = readyForProtectedView || viewingAdmin

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
          onOpenProfileMenu={handleOpenProfileMenu}
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

        {viewingAdmin && readyForProtectedView && isAdmin ? (
          <div className="admin-stage">
            <AdminPanel
              adminSection={adminSection}
              createPlayerForm={createPlayerForm}
              createPlayerPending={createPlayerPending}
              createPlayerResult={createPlayerResult}
              goldForm={goldForm}
              goldPending={goldPending}
              goldResult={goldResult}
              onAdjustGold={handleAdjustGold}
              onCreatePlayer={handleCreatePlayer}
              onCreatePlayerChange={handleCreatePlayerChange}
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
