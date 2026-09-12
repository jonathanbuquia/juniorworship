import { motion } from 'framer-motion'
import { POPOVER_TRANSITION } from '../../app/constants.js'

const MotionButton = motion.button

export default function ProfilesPage({ onSelectPlayer, players = [], selectedPlayerId = '' }) {
  return (
    <section className="panel profiles-page-shell">
      <div className="profiles-page-heading">
        <div>
          <div className="eyebrow">Profiles</div>
          <h2>Choose a Player</h2>
        </div>
        <strong>{players.length} players</strong>
      </div>

      {players.length ? (
        <div className="profiles-card-grid">
          {players.map((player, index) => (
            <MotionButton
              animate={{ opacity: 1, y: 0 }}
              className={`profile-card ${selectedPlayerId === player.id ? 'active' : ''}`}
              initial={{ opacity: 0, y: 14 }}
              key={player.id}
              onClick={() => onSelectPlayer(player.id)}
              transition={{ ...POPOVER_TRANSITION, delay: Math.min(index * 0.025, 0.25) }}
              type="button"
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="profile-card-copy">
                <strong>{player.display_name}</strong>
                <small>{player.gold ?? 0} gold coins</small>
              </span>
            </MotionButton>
          ))}
        </div>
      ) : (
        <div className="profiles-empty-card">
          <h3>No player profiles yet.</h3>
          <p className="panel-note">Use Players to create the first profile.</p>
        </div>
      )}
    </section>
  )
}
