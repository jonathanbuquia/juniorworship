import { useMemo } from 'react'
import { createAttendanceKey, createSundayColumns } from '../attendanceUtils.js'
import { useAttendance } from '../hooks/useAttendance.js'

export default function AttendancePage({ players }) {
  const { attendance, toggleAttendance } = useAttendance()
  const sundayColumns = useMemo(() => createSundayColumns(), [])

  return (
    <section className="panel attendance-page-shell">
      <div className="attendance-heading">
        <div>
          <div className="eyebrow">Attendance</div>
          <h2>Sunday Attendance</h2>
        </div>
        <strong>{players.length} players</strong>
      </div>

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

                    return (
                      <td className="attendance-check-cell" key={attendanceKey}>
                        <label className="attendance-check">
                          <input
                            checked={Boolean(attendance[attendanceKey])}
                            onChange={() => toggleAttendance(attendanceKey)}
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
