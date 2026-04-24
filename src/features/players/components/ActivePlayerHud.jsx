import { AnimatePresence, motion } from 'framer-motion'
import { POPOVER_TRANSITION } from '../../app/constants.js'

const MotionButton = motion.button
const MotionDiv = motion.div

export default function ActivePlayerHud({ collapsed, onToggleCollapsed, player }) {
  if (!player) {
    return null
  }

  return (
    <MotionDiv
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      className={`active-player-hud panel ${collapsed ? 'collapsed' : ''}`}
      exit={{ opacity: 0, x: 16, y: -12, scale: 0.96 }}
      initial={{ opacity: 0, x: 20, y: -16, scale: 0.96 }}
      layout
      transition={POPOVER_TRANSITION}
    >
      <MotionButton
        aria-label={collapsed ? 'Expand active player card' : 'Collapse active player card'}
        className="active-player-hud-toggle"
        onClick={onToggleCollapsed}
        type="button"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
      >
        {collapsed ? '+' : '-'}
      </MotionButton>

      <AnimatePresence initial={false}>
        {!collapsed ? (
          <>
            <MotionDiv
              animate={{ opacity: 1, x: 0 }}
              className="active-player-hud-copy"
              exit={{ opacity: 0, x: 8 }}
              initial={{ opacity: 0, x: 8 }}
              key="active-player-copy"
              transition={POPOVER_TRANSITION}
            >
              <div className="eyebrow">Active Player</div>
              <strong>{player.display_name}</strong>
            </MotionDiv>
            <MotionDiv
              animate={{ opacity: 1, x: 0 }}
              className="active-player-hud-gold"
              exit={{ opacity: 0, x: 8 }}
              initial={{ opacity: 0, x: 8 }}
              key="active-player-gold"
              transition={POPOVER_TRANSITION}
            >
              <span>Gold</span>
              <strong>{player.gold ?? 0}</strong>
            </MotionDiv>
          </>
        ) : null}
      </AnimatePresence>
    </MotionDiv>
  )
}
