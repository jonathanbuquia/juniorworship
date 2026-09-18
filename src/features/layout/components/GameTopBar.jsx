import AuthPopover from '../../auth/components/AuthPopover.jsx'
import RailIcon from './RailIcon.jsx'

export default function GameTopBar({
  authMenuOpen,
  authPending,
  hasAdmin,
  isAdmin,
  isCompactNav,
  loginForm,
  loginMessage,
  navCollapsed,
  navDrawerOpen,
  onBootstrapChange,
  onCloseCompactNav,
  onCreateAdmin,
  onLogin,
  onLoginChange,
  onOpenAdmin,
  onOpenAttendance,
  onOpenBooks,
  onOpenHome,
  onOpenMemoryVerse,
  onOpenProfileMenu,
  onOpenQuiz,
  onOpenShop,
  onSignOut,
  onToggleAuthMenu,
  onToggleNavCollapsed,
  profile,
  setupForm,
  setupMessage,
  viewingAdmin,
  viewingAttendance,
  viewingBooks,
  viewingHome,
  viewingMemory,
  viewingProfiles,
  viewingQuiz,
  viewingShop,
}) {
  const adminActionLabel = isAdmin ? 'PLAYERS' : hasAdmin ? 'ADMIN SIGN IN' : 'SET UP ADMIN'
  const effectiveCollapsed = isCompactNav ? false : navCollapsed

  return (
    <header
      style={
        isCompactNav
          ? { transform: navDrawerOpen ? 'none' : 'translateX(-340px)' }
          : { width: navCollapsed ? 96 : 240 }
      }
      className={`game-header ${effectiveCollapsed ? 'collapsed' : ''} ${isCompactNav ? 'compact' : ''}`}
    >
      <div className="rail-header">
        <div className="rail-brand">
          <button
            aria-label={isCompactNav ? 'Close menu' : navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rail-brand-mark"
            onClick={isCompactNav ? onCloseCompactNav : onToggleNavCollapsed}
            type="button"
          >
            <RailIcon type="brand" />
          </button>

          {!effectiveCollapsed ? (
            <div
              className="rail-brand-copy"
              key="brand-copy"
            >
              <div className="eyebrow">Dashboard</div>
              <strong>AQUARIUM</strong>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rail-top">
        <button
          aria-label="Home"
          className={`rail-button rail-button-secondary ${viewingHome ? 'active' : ''}`}
          onClick={onOpenHome}
          type="button"
        >
          <span aria-hidden="true" className="rail-button-icon">
            <RailIcon type="home" />
          </span>
          {!effectiveCollapsed ? (
            <span
              className="rail-button-label"
              key="home-label"
            >
              HOME
            </span>
          ) : null}
        </button>

        <button
          aria-label="Profile"
          className={`rail-button rail-button-secondary ${viewingProfiles ? 'active' : ''}`}
          onClick={onOpenProfileMenu}
          type="button"
        >
          <span aria-hidden="true" className="rail-button-icon">
            <RailIcon type="profile" />
          </span>
          {!effectiveCollapsed ? (
            <span
              className="rail-button-label"
              key="profile-label"
            >
              PROFILE
            </span>
          ) : null}
        </button>

        <button
          aria-label="Shop"
          className={`rail-button rail-button-secondary ${viewingShop ? 'active' : ''}`}
          onClick={onOpenShop}
          type="button"
        >
          <span aria-hidden="true" className="rail-button-icon">
            <RailIcon type="shop" />
          </span>
          {!effectiveCollapsed ? (
            <span
              className="rail-button-label"
              key="shop-label"
            >
              SHOP
            </span>
          ) : null}
        </button>
      </div>

      <div className="rail-bottom">
        {isAdmin ? (
          <div className="rail-admin-tools">
            <button
              aria-label="Attendance"
              className={`rail-button rail-button-secondary ${viewingAttendance ? 'active' : ''}`}
              onClick={onOpenAttendance}
              type="button"
            >
              <span aria-hidden="true" className="rail-button-icon">
                <RailIcon type="attendance" />
              </span>
              {!effectiveCollapsed ? (
                <span
                  className="rail-button-label"
                  key="attendance-label"
                >
                  ATTENDANCE
                </span>
              ) : null}
            </button>

            <button
              aria-label="Books"
              className={`rail-button rail-button-secondary ${viewingBooks ? 'active' : ''}`}
              onClick={onOpenBooks}
              type="button"
            >
              <span aria-hidden="true" className="rail-button-icon">
                <RailIcon type="books" />
              </span>
              {!effectiveCollapsed ? (
                <span
                  className="rail-button-label"
                  key="books-label"
                >
                  BOOKS
                </span>
              ) : null}
            </button>

            <button
              aria-label="Memory"
              className={`rail-button rail-button-secondary ${viewingMemory ? 'active' : ''}`}
              onClick={onOpenMemoryVerse}
              type="button"
            >
              <span aria-hidden="true" className="rail-button-icon">
                <RailIcon type="memory" />
              </span>
              {!effectiveCollapsed ? (
                <span
                  className="rail-button-label"
                  key="memory-label"
                >
                  MEMORY
                </span>
              ) : null}
            </button>

            <button
              aria-label="Quiz"
              className={`rail-button rail-button-secondary ${viewingQuiz ? 'active' : ''}`}
              onClick={onOpenQuiz}
              type="button"
            >
              <span aria-hidden="true" className="rail-button-icon">
                <RailIcon type="quiz" />
              </span>
              {!effectiveCollapsed ? (
                <span
                  className="rail-button-label"
                  key="quiz-label"
                >
                  QUIZ
                </span>
              ) : null}
            </button>
          </div>
        ) : null}

        <div className="header-menu-wrap">
          <button
            aria-label={adminActionLabel}
            className="rail-button rail-button-primary"
            onClick={isAdmin ? onOpenAdmin : onToggleAuthMenu}
            type="button"
          >
            <span aria-hidden="true" className="rail-button-icon">
              <RailIcon type="admin" />
            </span>
            {!effectiveCollapsed ? (
              <span
                className="rail-button-label"
                key="admin-label"
              >
                {adminActionLabel}
              </span>
            ) : null}
          </button>

          {authMenuOpen && !isAdmin ? (
            <AuthPopover
              authPending={authPending}
              hasAdmin={hasAdmin}
              isAdmin={isAdmin}
              loginForm={loginForm}
              loginMessage={loginMessage}
              onBootstrapChange={onBootstrapChange}
              onCreateAdmin={onCreateAdmin}
              onLogin={onLogin}
              onLoginChange={onLoginChange}
              onOpenAdmin={onOpenAdmin}
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
