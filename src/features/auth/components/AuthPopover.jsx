import { AnimatePresence, motion } from 'framer-motion'
import { POPOVER_TRANSITION } from '../../app/constants.js'

const MotionDiv = motion.div

export default function AuthPopover({
  authPending,
  hasAdmin,
  isAdmin,
  loginForm,
  loginMessage,
  onBootstrapChange,
  onCreateAdmin,
  onLogin,
  onLoginChange,
  onOpenAdmin,
  onSignOut,
  profile,
  setupForm,
  setupMessage,
  viewingAdmin,
}) {
  return (
    <MotionDiv
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      className="auth-popover panel"
      exit={{ opacity: 0, x: -8, y: 8, scale: 0.96 }}
      initial={{ opacity: 0, x: -12, y: 12, scale: 0.96 }}
      transition={POPOVER_TRANSITION}
    >
      <AnimatePresence mode="wait">
        {profile ? (
          <div className="auth-session-strip" key="session">
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
        ) : hasAdmin ? (
          <form className="stack-form" key="login" onSubmit={onLogin}>
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
          <form className="stack-form" key="setup" onSubmit={onCreateAdmin}>
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
      </AnimatePresence>
    </MotionDiv>
  )
}
