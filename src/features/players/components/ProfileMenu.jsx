import { motion } from 'framer-motion'
import { POPOVER_TRANSITION } from '../../app/constants.js'

const MotionDiv = motion.div

export default function ProfileMenu({ onSelectPlayer, players, selectedPlayerId }) {
  return (
    <MotionDiv
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      className="profile-menu panel"
      exit={{ opacity: 0, x: -8, y: -4, scale: 0.96 }}
      initial={{ opacity: 0, x: -12, y: 8, scale: 0.96 }}
      transition={POPOVER_TRANSITION}
    >
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
    </MotionDiv>
  )
}
