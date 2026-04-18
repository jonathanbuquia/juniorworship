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

function AuthCard({
  adminStatusLoading,
  authPending,
  hasAdmin,
  loginForm,
  loginMessage,
  onBootstrapChange,
  onCreateAdmin,
  onLogin,
  onLoginChange,
  setupForm,
  setupMessage,
}) {
  return (
    <section className="panel auth-card">
      <div className="eyebrow">Aquarium Control</div>
      <h1>{hasAdmin ? 'Sign in to continue' : 'Create the first admin'}</h1>
      <p className="panel-copy">
        {hasAdmin
          ? 'Players and admins use the same site. Your admin account unlocks the protected dashboard.'
          : 'Set up your owner account first. After that, you will create every player account yourself.'}
      </p>

      {adminStatusLoading ? (
        <p className="panel-note">Checking the current setup...</p>
      ) : hasAdmin ? (
        <form className="stack-form" onSubmit={onLogin}>
          <label className="field">
            <span>Login name</span>
            <input
              autoComplete="username"
              name="loginName"
              onChange={onLoginChange}
              placeholder="teacher maria"
              value={loginForm.loginName}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={onLoginChange}
              placeholder="Enter your password"
              type="password"
              value={loginForm.password}
            />
          </label>

          {loginMessage.text ? <p className={`status-line ${loginMessage.type}`}>{loginMessage.text}</p> : null}

          <button className="primary-button" disabled={authPending} type="submit">
            {authPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      ) : (
        <form className="stack-form" onSubmit={onCreateAdmin}>
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
    </section>
  )
}

function PlayerHud({ isAdmin, onLogout, onOpenAdmin, profile }) {
  return (
    <header className="game-header">
      <div className="game-brand">
        <span className="eyebrow">Sunday School</span>
        <strong>{profile?.display_name || 'Player'}</strong>
      </div>

      <div className="game-stats">
        <div className="game-stat-pill">
          <span>Role</span>
          <strong>{profile?.role || 'player'}</strong>
        </div>
        <div className="game-stat-pill">
          <span>Gold</span>
          <strong>{profile?.gold ?? 0}</strong>
        </div>
        <div className="game-stat-pill">
          <span>Login</span>
          <strong>{profile?.login_name || 'not set'}</strong>
        </div>
      </div>

      <div className="game-actions">
        {isAdmin ? (
          <button className="primary-button" onClick={onOpenAdmin} type="button">
            Open admin
          </button>
        ) : null}
        <button className="ghost-button" onClick={onLogout} type="button">
          Log out
        </button>
      </div>
    </header>
  )
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
  onReturnToPlayer,
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
          <button className="ghost-button" onClick={onReturnToPlayer} type="button">
            Back to player view
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

function UnauthorizedPanel({ onGoPlayer, onLogout }) {
  return (
    <section className="panel auth-card">
      <div className="eyebrow">Access Blocked</div>
      <h2>This page is for admins only</h2>
      <p className="panel-copy">
        Your account can still use the player side of the site, but it does not have permission to open the admin tools.
      </p>
      <div className="button-row">
        <button className="primary-button" onClick={onGoPlayer} type="button">
          Go to player view
        </button>
        <button className="ghost-button" onClick={onLogout} type="button">
          Log out
        </button>
      </div>
    </section>
  )
}

export default function AdminApp() {
  const [pathname, setPathname] = useState(() => window.location.pathname || '/')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [adminStatusLoading, setAdminStatusLoading] = useState(true)
  const [hasAdmin, setHasAdmin] = useState(false)
  const [authPending, setAuthPending] = useState(false)
  const [createPlayerPending, setCreatePlayerPending] = useState(false)
  const [playersLoading, setPlayersLoading] = useState(false)
  const [goldPending, setGoldPending] = useState(false)
  const [players, setPlayers] = useState([])
  const [adminSection, setAdminSection] = useState(ADMIN_SECTIONS.createPlayer)
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
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
      setAdminStatusLoading(false)
      return
    }

    let cancelled = false

    const loadAdminStatus = async () => {
      setAdminStatusLoading(true)

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
      } finally {
        if (!cancelled) {
          setAdminStatusLoading(false)
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
      setLoginMessage({
        type: 'success',
        text: 'Signed in successfully.',
      })
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
      setSetupMessage({
        type: 'success',
        text: 'Admin account created.',
      })
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

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }

    setProfile(null)
    setPlayers([])
    setSelectedPlayerId('')
    setLoginMessage(createEmptyMessage())
    setCreatePlayerResult(createEmptyMessage())
    setGoldResult(createEmptyMessage())
    navigate('/')
  }

  const showSetupMessage = !hasSupabaseEnv
  const readyForProtectedView = !authLoading && !profileLoading && session && profile
  const showGameScene = readyForProtectedView
  const authMode = showSetupMessage || !readyForProtectedView

  return (
    <div className={`portal-shell ${authMode ? 'auth-mode' : 'game-mode'}`}>
      {showGameScene ? (
        <div className="portal-scene">
          <AquariumScene />
        </div>
      ) : null}

      <div className="portal-overlay">
        {showSetupMessage ? (
          <section className="panel auth-card">
            <div className="eyebrow">Setup Needed</div>
            <h1>Supabase environment variables are missing</h1>
            <p className="panel-copy">
              Add your `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`
              values before using admin and account features.
            </p>
          </section>
        ) : !readyForProtectedView ? (
          <AuthCard
            adminStatusLoading={adminStatusLoading}
            authPending={authPending}
            hasAdmin={hasAdmin}
            loginForm={loginForm}
            loginMessage={loginMessage}
            onBootstrapChange={handleBootstrapChange}
            onCreateAdmin={handleCreateAdmin}
            onLogin={handleLogin}
            onLoginChange={handleLoginChange}
            setupForm={setupForm}
            setupMessage={setupMessage}
          />
        ) : viewingAdmin ? (
          isAdmin ? (
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
              onLogout={handleLogout}
              onQuickGoldAmount={handleQuickGoldAmount}
              onReturnToPlayer={() => navigate('/')}
              onSectionChange={setAdminSection}
              onSelectPlayer={setSelectedPlayerId}
              players={players}
              playersLoading={playersLoading}
              playersMessage={playersMessage}
              profile={profile}
              selectedPlayer={selectedPlayer}
            />
          ) : (
            <UnauthorizedPanel onGoPlayer={() => navigate('/')} onLogout={handleLogout} />
          )
        ) : (
          <PlayerHud
            isAdmin={isAdmin}
            onLogout={handleLogout}
            onOpenAdmin={() => navigate(ADMIN_PATH)}
            profile={profile}
          />
        )}
      </div>
    </div>
  )
}
