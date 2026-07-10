import { useMemo } from 'react'
import { createAttendanceKey, createSundayColumns } from '../attendanceUtils.js'
import { useAttendance } from '../hooks/useAttendance.js'

export default function PublicAttendancePage({ players }) {
  const { attendance, attendanceLoading, attendanceMessage } = useAttendance({
    mergeLocalOnLoad: false,
  })
  const sundayColumns = useMemo(() => createSundayColumns(undefined, undefined, attendance), [attendance])

  return (
    <section className="panel attendance-page-shell public-attendance-page">
      <div className="attendance-heading">
        <div>
          <div className="eyebrow">Attendance</div>
          <h2>Attendance View</h2>
        </div>
        <strong>{attendanceLoading ? 'Loading...' : `${players.length} players`}</strong>
      </div>

      <p className="panel-note">View-only attendance. Only admin can edit the official records.</p>

      {attendanceMessage.text ? <p className={`status-line ${attendanceMessage.type}`}>{attendanceMessage.text}</p> : null}

      <div className="attendance-table-frame">
        <table className="attendance-table public-attendance-table">
          <thead>
            <tr>
              <th className="attendance-name-cell">Player</th>
              {sundayColumns.map((date) => (
                <th
                  className={`attendance-date-cell ${date.monthColorClass} ${date.isLastSundayOfMonth ? 'month-bonus' : ''}`}
                  key={date.id}
                >
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
                    const present = Boolean(attendance[createAttendanceKey(player.id, date.id)])

                    return (
                      <td className={`attendance-check-cell ${date.monthColorClass}`} key={`${player.id}:${date.id}`}>
                        <span className={`attendance-text-status ${present ? 'present' : 'absent'}`}>
                          {present ? 'Present' : '-'}
                        </span>
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
