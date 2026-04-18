import { useEffect, useMemo, useState } from 'react'
import './AdminApp.css'
import AquariumScene from './components/AquariumScene'
import { hasSupabaseEnv, supabase } from './lib/supabase'

const ADMIN_PATH = '/admin'

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
        <p className="panel-note">Checking the current setup…</p>
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

          {loginMessage.text && (
            <p className={`status-line ${loginMessage.type}`}>{loginMessage.text}</p>
          )}

          <button className="primary-button" disabled={authPending} type="submit">
            {authPending ? 'Signing in…' : 'Sign in'}
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

          {setupMessage.text && (
            <p className={`status-line ${setupMessage.type}`}>{setupMessage.text}</p>
          )}

          <button className="primary-button" disabled={authPending} type="submit">
            {authPending ? 'Creating admin…' : 'Create admin'}
          </button>
        </form>
      )}
    </section>
  )
}

function PlayerPanel({ isAdmin, onLogout, onOpenAdmin, profile }) {
  return (
    <section className="panel player-panel">
      <div className="eyebrow">Player View</div>
      <h2>Welcome, {profile?.display_name || 'Player'}</h2>
      <p className="panel-copy">
        This is the player side of the site. Your aquarium visuals stay here, and the admin tools live separately.
      </p>

      <div className="stat-row">
        <div>
          <span className="stat-label">Role</span>
          <strong>{profile?.role || 'player'}</strong>
        </div>
        <div>
          <span className="stat-label">Gold</span>
          <strong>{profile?.gold ?? 0}</strong>
        </div>
        <div>
          <span className="stat-label">Login</span>
          <strong>{profile?.login_name || 'not set'}</strong>
        </div>
      </div>

      <div className="button-row">
        {isAdmin ? (
          <button className="primary-button" onClick={onOpenAdmin} type="button">
            Open admin
          </button>
        ) : null}
        <button className="ghost-button" onClick={onLogout} type="button">
          Log out
        </button>
      </div>
    </section>
  )
}

function AdminPanel({
  createPlayerForm,
  createPlayerPending,
  createPlayerResult,
  onCreatePlayer,
  onCreatePlayerChange,
  onLogout,
  onReturnToPlayer,
  profile,
}) {
  return (
    <section className="panel admin-panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Admin Dashboard</div>
          <h2>{profile?.display_name || 'Admin'}</h2>
        </div>

        <div className="button-row compact">
          <button className="ghost-button" onClick={onReturnToPlayer} type="button">
            Back to player view
          </button>
          <button className="ghost-button" onClick={onLogout} type="button">
            Log out
          </button>
        </div>
      </div>

      <p className="panel-copy">
        This first admin version lets you create player accounts yourself. We can add weekly gold tools next.
      </p>

      <div className="admin-note">
        <strong>How players sign in:</strong> give them the login name and password you entered here. They use the same website as you.
      </div>

      <form className="stack-form" onSubmit={onCreatePlayer}>
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

        {createPlayerResult.text && (
          <p className={`status-line ${createPlayerResult.type}`}>{createPlayerResult.text}</p>
        )}

        <button className="primary-button" disabled={createPlayerPending} type="submit">
          {createPlayerPending ? 'Creating player…' : 'Create player'}
        </button>
      </form>
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
  const [loginMessage, setLoginMessage] = useState(createEmptyMessage)
  const [setupMessage, setSetupMessage] = useState(createEmptyMessage)
  const [createPlayerResult, setCreatePlayerResult] = useState(createEmptyMessage)
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
    if (!session || !supabase) {
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
        .eq('id', session.user.id)
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
  }, [session])

  const isAdmin = useMemo(() => isAdminProfile(profile), [profile])
  const viewingAdmin = pathname === ADMIN_PATH

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
    } catch (error) {
      setCreatePlayerResult({
        type: 'error',
        text: error.message,
      })
    } finally {
      setCreatePlayerPending(false)
    }
  }

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }

    setProfile(null)
    setLoginMessage(createEmptyMessage())
    setCreatePlayerResult(createEmptyMessage())
    navigate('/')
  }

  const showSetupMessage = !hasSupabaseEnv
  const readyForProtectedView = !authLoading && !profileLoading && session && profile

  return (
    <div className="portal-shell">
      <div className="portal-scene">
        <AquariumScene />
      </div>

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
              createPlayerForm={createPlayerForm}
              createPlayerPending={createPlayerPending}
              createPlayerResult={createPlayerResult}
              onCreatePlayer={handleCreatePlayer}
              onCreatePlayerChange={handleCreatePlayerChange}
              onLogout={handleLogout}
              onReturnToPlayer={() => navigate('/')}
              profile={profile}
            />
          ) : (
            <UnauthorizedPanel onGoPlayer={() => navigate('/')} onLogout={handleLogout} />
          )
        ) : (
          <PlayerPanel
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
