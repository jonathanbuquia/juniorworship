import { ATTENDANCE_WEEK_COUNT } from '../app/constants.js'

const SUNDAY = 0
const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

function createLocalDate(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function toDateKey(value) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getStartingSunday(value = new Date()) {
  const date = createLocalDate(value)
  const daysUntilSunday = (7 + SUNDAY - date.getDay()) % 7
  date.setDate(date.getDate() + daysUntilSunday)

  return date
}

export function createSundayColumns(count = ATTENDANCE_WEEK_COUNT, startDate = new Date()) {
  const firstSunday = getStartingSunday(startDate)

  return Array.from({ length: count }, (_unused, index) => {
    const date = new Date(firstSunday)
    date.setDate(firstSunday.getDate() + index * 7)

    return {
      id: toDateKey(date),
      label: DATE_FORMATTER.format(date),
      year: date.getFullYear(),
    }
  })
}

export function createAttendanceKey(playerId, dateId) {
  return `${playerId}:${dateId}`
}
