import { useMemo, useState } from 'react'
import { ATTENDANCE_GOLD_REWARD } from '../../app/constants.js'
import { createAttendanceKey, createSundayColumns } from '../attendanceUtils.js'
import { useAttendance } from '../hooks/useAttendance.js'

export default function AttendancePage({ onAttendanceChange, players }) {
  const { attendance, setAttendanceValue } = useAttendance()
  const [pendingKey, setPendingKey] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const sundayColumns = useMemo(() => createSundayColumns(), [])

  const handleAttendanceChange = async (player, date, nextPresent) => {
    const attendanceKey = createAttendanceKey(player.id, date.id)

    if (pendingKey) {
      return
    }

    setPendingKey(attendanceKey)
    setMessage({ type: '', text: '' })

    try {
      await onAttendanceChange?.({
        date,
        player,
        present: nextPresent,
      })
      setAttendanceValue(attendanceKey, nextPresent)
      setMessage({
        type: 'success',
        text: nextPresent
          ? `${player.display_name} marked present. +${ATTENDANCE_GOLD_REWARD} gold added.`
          : `${player.display_name} marked absent. ${ATTENDANCE_GOLD_REWARD} gold removed.`,
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message,
      })
    } finally {
      setPendingKey('')
    }
  }

  return (
    <section className="panel attendance-page-shell">
      <div className="attendance-heading">
        <div>
          <div className="eyebrow">Attendance</div>
          <h2>Sunday Attendance</h2>
        </div>
        <strong>{players.length} players</strong>
      </div>

      <div className="attendance-reward-note">
        <span>Present</span>
        <strong>+{ATTENDANCE_GOLD_REWARD} gold</strong>
      </div>

      {message.text ? <p className={`status-line ${message.type}`}>{message.text}</p> : null}

      <div className="attendance-table-frame">
        <table className="attendance-table">
          <thead>
            <tr>
              <th className="attendance-name-cell">Player</th>
              {sundayColumns.map((date) => (
                <th className="attendance-date-cell" key={date.id}>
                  <span>{date.label}</span>
                  <small>{date.year}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.length ? (
              players.map((player) => (
                <tr key={player.id}>
                  <th className="attendance-name-cell" scope="row">
                    {player.display_name}
                  </th>
                  {sundayColumns.map((date) => {
                    const attendanceKey = createAttendanceKey(player.id, date.id)
                    const checked = Boolean(attendance[attendanceKey])
                    const pending = pendingKey === attendanceKey

                    return (
                      <td className="attendance-check-cell" key={attendanceKey}>
                        <label className={`attendance-check ${pending ? 'pending' : ''}`}>
                          <input
                            checked={checked}
                            disabled={Boolean(pendingKey)}
                            onChange={() => handleAttendanceChange(player, date, !checked)}
                            type="checkbox"
                          />
                          <span aria-hidden="true" />
                        </label>
                      </td>
                    )
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td className="attendance-empty-cell" colSpan={sundayColumns.length + 1}>
                  No players yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
