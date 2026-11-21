import { useRef, useState } from 'react'
import { setPlayerAttendanceVisibility } from '../../../services/api/playerService.js'

export default function PlayerVisibilitySection({ accessToken, onPlayerUpdated, players, playersLoading }) {
  const [pendingId, setPendingId] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const inFlight = useRef(false)

  async function toggle(player) {
    if (inFlight.current) return
    inFlight.current = true
    setPendingId(player.id)
    setMessage({ type: '', text: '' })
    try {
      const { player: updated } = await setPlayerAttendanceVisibility(accessToken, player.id, !player.attendance_hidden)
      onPlayerUpdated(updated)
      setMessage({ type: 'success', text: `${updated.display_name} ${updated.attendance_hidden ? 'hidden from' : 'shown in'} attendance.` })
    } catch (error) { setMessage({ type: 'error', text: error.message }) }
    finally { inFlight.current = false; setPendingId('') }
  }

  return (
    <div className="admin-content-stack">
      <div className="content-intro"><div><div className="eyebrow">Attendance</div><h2>Hide / Unhide players</h2></div>
        <p className="panel-copy">Hide inactive players from attendance. Their gold, aquarium and past attendance stay saved.</p>
      </div>
      <div className="workspace-card">
        {message.text ? <p className={`status-line ${message.type}`} role="status">{message.text}</p> : null}
        {playersLoading ? <p>Loading players...</p> : (
          <div className="player-visibility-list">
            {players.map((player) => (
              <div className="player-preview-row" key={player.id}>
                <div><strong>{player.display_name}</strong><span className="panel-note">{player.attendance_hidden ? 'Hidden' : 'Visible'}</span></div>
                <button type="button" className="ghost-button compact-button" disabled={Boolean(pendingId)} aria-label={`${player.attendance_hidden ? 'Unhide' : 'Hide'} ${player.display_name}`} onClick={() => toggle(player)}>
                  {pendingId === player.id ? 'Saving...' : player.attendance_hidden ? 'Unhide' : 'Hide'}
                </button>
              </div>
            ))}
            {!players.length ? <p>No players yet.</p> : null}
          </div>
        )}
      </div>
    </div>
  )
}
