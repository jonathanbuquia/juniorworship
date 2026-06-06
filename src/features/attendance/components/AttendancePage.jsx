import { useMemo, useState } from 'react'
import {
  ATTENDANCE_GOLD_REWARD,
  ATTENDANCE_MONTHLY_BONUS,
  MOON_JELLY_ATTENDANCE_BONUS,
  MOON_JELLY_ATTENDANCE_CLAIMS_STORAGE_KEY,
} from '../../app/constants.js'
import { MOON_JELLY_SLUG } from '../../../../shared/shopCatalog.js'
import {
  createAttendanceKey,
  createMoonJellyStreakClaimKey,
  createSundayColumns,
  getMoonJellyStreakBonusDateIds,
  isPlayerMonthComplete,
} from '../attendanceUtils.js'
import { useAttendance } from '../hooks/useAttendance.js'

function createLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getMoonJellyPurchaseDateId(aquarium) {
  const moonJelly = (aquarium?.fish ?? []).find(
    (item) => item.slug === MOON_JELLY_SLUG && Number(item.quantity) > 0 && item.purchasedAt,
  )

  return moonJelly ? createLocalDateKey(moonJelly.purchasedAt) : ''
}

function readMoonJellyAttendanceClaims() {
  try {
    const savedValue = window.localStorage.getItem(MOON_JELLY_ATTENDANCE_CLAIMS_STORAGE_KEY)

    if (!savedValue) {
      return {}
    }

    const parsed = JSON.parse(savedValue)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveMoonJellyAttendanceClaims(claims) {
  window.localStorage.setItem(MOON_JELLY_ATTENDANCE_CLAIMS_STORAGE_KEY, JSON.stringify(claims))
}

function getMoonJellyBonusChange({ attendance, claims, dateIds, playerId, purchaseDateId }) {
  const eligibleDateIds = getMoonJellyStreakBonusDateIds(playerId, dateIds, attendance, purchaseDateId)
  const eligibleKeys = new Set(eligibleDateIds.map((dateId) => createMoonJellyStreakClaimKey(playerId, dateId)))
  const playerClaimPrefix = `${playerId}:`
  const playerClaimKeys = Object.keys(claims).filter((key) => {
    const dateId = key.slice(playerClaimPrefix.length)
    return key.startsWith(playerClaimPrefix) && dateId >= purchaseDateId
  })
  const newlyEarnedKeys = [...eligibleKeys].filter((key) => !claims[key])
  const removedKeys = playerClaimKeys.filter((key) => !eligibleKeys.has(key))
  const nextClaims = { ...claims }

  newlyEarnedKeys.forEach((key) => {
    nextClaims[key] = true
  })
  removedKeys.forEach((key) => {
    delete nextClaims[key]
  })

  return {
    delta: (newlyEarnedKeys.length - removedKeys.length) * MOON_JELLY_ATTENDANCE_BONUS,
    earnedCount: newlyEarnedKeys.length,
    nextClaims,
    removedCount: removedKeys.length,
  }
}

export default function AttendancePage({ loadPlayerAquarium, onAttendanceChange, players }) {
  const { attendance, setAttendanceValue } = useAttendance()
  const [pendingKey, setPendingKey] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const sundayColumns = useMemo(() => createSundayColumns(undefined, undefined, attendance), [attendance])
  const monthDateIds = useMemo(
    () =>
      sundayColumns.reduce((months, date) => {
        return {
          ...months,
          [date.monthKey]: [...(months[date.monthKey] ?? []), date.id],
        }
      }, {}),
    [sundayColumns],
  )

  const handleAttendanceChange = async (player, date, nextPresent) => {
    const attendanceKey = createAttendanceKey(player.id, date.id)

    if (pendingKey) {
      return
    }

    setPendingKey(attendanceKey)
    setMessage({ type: '', text: '' })

    try {
      const dateIdsInMonth = monthDateIds[date.monthKey] ?? [date.id]
      const wasMonthComplete = isPlayerMonthComplete(player.id, dateIdsInMonth, attendance)
      const nextAttendance = {
        ...attendance,
        [attendanceKey]: nextPresent,
      }
      const willMonthComplete = isPlayerMonthComplete(player.id, dateIdsInMonth, nextAttendance)
      const attendanceDelta = nextPresent ? ATTENDANCE_GOLD_REWARD : -ATTENDANCE_GOLD_REWARD
      const monthlyBonusDelta =
        date.monthlyBonusEligible && !wasMonthComplete && willMonthComplete
          ? ATTENDANCE_MONTHLY_BONUS
          : date.monthlyBonusEligible && wasMonthComplete && !willMonthComplete
            ? -ATTENDANCE_MONTHLY_BONUS
            : 0
      let moonJellyBonusChange = {
        delta: 0,
        earnedCount: 0,
        nextClaims: null,
        removedCount: 0,
      }

      if (loadPlayerAquarium) {
        const aquarium = await loadPlayerAquarium(player.id)
        const moonJellyPurchaseDateId = getMoonJellyPurchaseDateId(aquarium)

        if (moonJellyPurchaseDateId) {
          moonJellyBonusChange = getMoonJellyBonusChange({
            attendance: nextAttendance,
            claims: readMoonJellyAttendanceClaims(),
            dateIds: sundayColumns.map((sunday) => sunday.id),
            playerId: player.id,
            purchaseDateId: moonJellyPurchaseDateId,
          })
        }
      }

      await onAttendanceChange?.({
        date,
        goldDelta: attendanceDelta + monthlyBonusDelta + moonJellyBonusChange.delta,
        monthlyBonusDelta,
        moonJellyBonusDelta: moonJellyBonusChange.delta,
        player,
        present: nextPresent,
      })
      if (moonJellyBonusChange.nextClaims) {
        saveMoonJellyAttendanceClaims(moonJellyBonusChange.nextClaims)
      }
      setAttendanceValue(attendanceKey, nextPresent)
      setMessage({
        type: 'success',
        text: [
          nextPresent
            ? `${player.display_name} marked present. +${ATTENDANCE_GOLD_REWARD} gold added.`
            : `${player.display_name} marked absent. ${ATTENDANCE_GOLD_REWARD} gold removed.`,
          monthlyBonusDelta > 0 ? `Monthly bonus +${ATTENDANCE_MONTHLY_BONUS} gold added.` : '',
          monthlyBonusDelta < 0 ? `Monthly bonus ${ATTENDANCE_MONTHLY_BONUS} gold removed.` : '',
          moonJellyBonusChange.earnedCount > 0
            ? `Moon Jelly streak +${moonJellyBonusChange.earnedCount * MOON_JELLY_ATTENDANCE_BONUS} gold added.`
            : '',
          moonJellyBonusChange.removedCount > 0
            ? `Moon Jelly streak ${moonJellyBonusChange.removedCount * MOON_JELLY_ATTENDANCE_BONUS} gold removed.`
            : '',
        ]
          .filter(Boolean)
          .join(' '),
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
        <span>Month Complete</span>
        <strong>+{ATTENDANCE_MONTHLY_BONUS} gold</strong>
        <span>Moon Jelly Streak</span>
        <strong>+{MOON_JELLY_ATTENDANCE_BONUS} gold</strong>
      </div>

      {message.text ? <p className={`status-line ${message.type}`}>{message.text}</p> : null}

      <div className="attendance-table-frame">
        <table className="attendance-table">
          <thead>
            <tr>
              <th className="attendance-name-cell">Player</th>
              {sundayColumns.map((date) => (
                <th
                  className={`attendance-date-cell ${date.monthColorClass} ${date.isLastSundayOfMonth ? 'month-bonus' : ''}`}
                  key={date.id}
                >
                  {date.isLastSundayOfMonth && date.monthlyBonusEligible ? (
                    <strong className="attendance-month-bonus">+{ATTENDANCE_MONTHLY_BONUS}</strong>
                  ) : null}
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
                      <td className={`attendance-check-cell ${date.monthColorClass}`} key={attendanceKey}>
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
