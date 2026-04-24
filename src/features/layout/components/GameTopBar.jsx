import { AnimatePresence, motion } from 'framer-motion'
import { POPOVER_TRANSITION, RAIL_TRANSITION } from '../../app/constants.js'
import AuthPopover from '../../auth/components/AuthPopover.jsx'
import ProfileMenu from '../../players/components/ProfileMenu.jsx'
import RailIcon from './RailIcon.jsx'

const MotionButton = motion.button
const MotionDiv = motion.div
const MotionHeader = motion.header
const MotionSpan = motion.span

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
  onOpenMemoryVerse,
  onOpenProfileMenu,
  onOpenQuiz,
  onOpenShop,
  onSelectViewedPlayer,
  onSignOut,
  onToggleAuthMenu,
  onToggleNavCollapsed,
  profile,
  profileMenuOpen,
  publicPlayers,
  setupForm,
  setupMessage,
  viewedPlayer,
  viewingAdmin,
  viewingMemory,
  viewingQuiz,
  viewingShop,
}) {
  const adminActionLabel = profile ? 'ADMIN' : hasAdmin ? 'ADMIN SIGN IN' : 'SET UP ADMIN'
  const effectiveCollapsed = isCompactNav ? false : navCollapsed

  return (
    <MotionHeader
      animate={
        isCompactNav
          ? {
              opacity: navDrawerOpen ? 1 : 0.92,
              x: navDrawerOpen ? 0 : -340,
            }
          : { width: navCollapsed ? 96 : 240 }
      }
      className={`game-header ${effectiveCollapsed ? 'collapsed' : ''} ${isCompactNav ? 'compact' : ''}`}
      layout={!isCompactNav}
      transition={RAIL_TRANSITION}
    >
      <div className="rail-header">
        <div className="rail-brand">
          <MotionButton
            aria-label={isCompactNav ? 'Close menu' : navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rail-brand-mark"
            onClick={isCompactNav ? onCloseCompactNav : onToggleNavCollapsed}
            type="button"
            whileHover={{ rotate: effectiveCollapsed ? -6 : 6, scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
          >
            <RailIcon type="brand" />
          </MotionButton>

          <AnimatePresence initial={false}>
            {!effectiveCollapsed ? (
              <MotionDiv
                animate={{ opacity: 1, x: 0 }}
                className="rail-brand-copy"
                exit={{ opacity: 0, x: -10 }}
                initial={{ opacity: 0, x: -10 }}
                key="brand-copy"
                transition={POPOVER_TRANSITION}
              >
                <div className="eyebrow">Dashboard</div>
                <strong>AQUARIUM</strong>
              </MotionDiv>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="rail-top">
        <div className="header-menu-wrap">
          <MotionButton
            aria-label="Profile"
            className="rail-button rail-button-secondary"
            layout
            onClick={onOpenProfileMenu}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span aria-hidden="true" className="rail-button-icon">
              <RailIcon type="profile" />
            </span>
            <AnimatePresence initial={false}>
              {!effectiveCollapsed ? (
                <MotionSpan
                  animate={{ opacity: 1, x: 0 }}
                  className="rail-button-label"
                  exit={{ opacity: 0, x: -8 }}
                  initial={{ opacity: 0, x: -8 }}
                  key="profile-label"
                  transition={POPOVER_TRANSITION}
                >
                  PROFILE
                </MotionSpan>
              ) : null}
            </AnimatePresence>
          </MotionButton>

          <AnimatePresence>
            {profileMenuOpen ? (
              <ProfileMenu
                onSelectPlayer={onSelectViewedPlayer}
                players={publicPlayers}
                selectedPlayerId={viewedPlayer?.id ?? ''}
              />
            ) : null}
          </AnimatePresence>
        </div>

        <MotionButton
          aria-label="Shop"
          className={`rail-button rail-button-secondary ${viewingShop ? 'active' : ''}`}
          layout
          onClick={onOpenShop}
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <span aria-hidden="true" className="rail-button-icon">
            <RailIcon type="shop" />
          </span>
          <AnimatePresence initial={false}>
            {!effectiveCollapsed ? (
              <MotionSpan
                animate={{ opacity: 1, x: 0 }}
                className="rail-button-label"
                exit={{ opacity: 0, x: -8 }}
                initial={{ opacity: 0, x: -8 }}
                key="shop-label"
                transition={POPOVER_TRANSITION}
              >
                SHOP
              </MotionSpan>
            ) : null}
          </AnimatePresence>
        </MotionButton>
      </div>

      <div className="rail-bottom">
        {isAdmin ? (
          <MotionDiv className="rail-admin-tools" layout>
            <MotionButton
              aria-label="Memory"
              className={`rail-button rail-button-secondary ${viewingMemory ? 'active' : ''}`}
              layout
              onClick={onOpenMemoryVerse}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span aria-hidden="true" className="rail-button-icon">
                <RailIcon type="memory" />
              </span>
              <AnimatePresence initial={false}>
                {!effectiveCollapsed ? (
                  <MotionSpan
                    animate={{ opacity: 1, x: 0 }}
                    className="rail-button-label"
                    exit={{ opacity: 0, x: -8 }}
                    initial={{ opacity: 0, x: -8 }}
                    key="memory-label"
                    transition={POPOVER_TRANSITION}
                  >
                    MEMORY
                  </MotionSpan>
                ) : null}
              </AnimatePresence>
            </MotionButton>

            <MotionButton
              aria-label="Quiz"
              className={`rail-button rail-button-secondary ${viewingQuiz ? 'active' : ''}`}
              layout
              onClick={onOpenQuiz}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span aria-hidden="true" className="rail-button-icon">
                <RailIcon type="quiz" />
              </span>
              <AnimatePresence initial={false}>
                {!effectiveCollapsed ? (
                  <MotionSpan
                    animate={{ opacity: 1, x: 0 }}
                    className="rail-button-label"
                    exit={{ opacity: 0, x: -8 }}
                    initial={{ opacity: 0, x: -8 }}
                    key="quiz-label"
                    transition={POPOVER_TRANSITION}
                  >
                    QUIZ
                  </MotionSpan>
                ) : null}
              </AnimatePresence>
            </MotionButton>
          </MotionDiv>
        ) : null}

        <div className="header-menu-wrap">
          <MotionButton
            aria-label={adminActionLabel}
            className="rail-button rail-button-primary"
            layout
            onClick={onToggleAuthMenu}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span aria-hidden="true" className="rail-button-icon">
              <RailIcon type="admin" />
            </span>
            <AnimatePresence initial={false}>
              {!effectiveCollapsed ? (
                <MotionSpan
                  animate={{ opacity: 1, x: 0 }}
                  className="rail-button-label"
                  exit={{ opacity: 0, x: -8 }}
                  initial={{ opacity: 0, x: -8 }}
                  key="admin-label"
                  transition={POPOVER_TRANSITION}
                >
                  {adminActionLabel}
                </MotionSpan>
              ) : null}
            </AnimatePresence>
          </MotionButton>

          <AnimatePresence>
            {authMenuOpen ? (
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
          </AnimatePresence>
        </div>
      </div>
    </MotionHeader>
  )
}
