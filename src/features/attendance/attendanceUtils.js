import { ATTENDANCE_MONTHLY_BONUS_START_MONTH, ATTENDANCE_START_DATE, ATTENDANCE_WEEK_COUNT } from '../app/constants.js'

const SUNDAY = 0
const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})
const MONTH_COLOR_COUNT = 6

function createLocalDate(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function createDateFromDateKey(dateId) {
  const date = new Date(`${dateId}T00:00:00`)

  if (Number.isNaN(date.getTime()) || toDateKey(date) !== dateId) {
    return null
  }

  return date
}

function toDateKey(value) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function createColumnFromDate(date) {
  const month = date.getMonth()
  const nextSunday = new Date(date)
  nextSunday.setDate(date.getDate() + 7)
  const monthKey = `${date.getFullYear()}-${String(month + 1).padStart(2, '0')}`

  return {
    id: toDateKey(date),
    isLastSundayOfMonth: nextSunday.getMonth() !== month,
    label: DATE_FORMATTER.format(date),
    monthColorClass: `attendance-month-${month % MONTH_COLOR_COUNT}`,
    monthKey,
    monthlyBonusEligible: monthKey >= ATTENDANCE_MONTHLY_BONUS_START_MONTH,
    year: date.getFullYear(),
  }
}

function getDateIdFromAttendanceKey(key) {
  const dateId = key.split(':').at(-1)
  const date = createDateFromDateKey(dateId)

  if (!date || date.getDay() !== SUNDAY) {
    return ''
  }

  return dateId
}

function getStartingSunday(value = new Date()) {
  const date = createLocalDate(value)
  const daysUntilSunday = (7 + SUNDAY - date.getDay()) % 7
  date.setDate(date.getDate() + daysUntilSunday)

  return date
}

export function createSundayColumns(count = ATTENDANCE_WEEK_COUNT, startDate = new Date(), attendance = {}) {
  const currentFirstSunday = getStartingSunday(startDate)
  const configuredStartDate = createDateFromDateKey(ATTENDANCE_START_DATE)
  const firstSunday =
    configuredStartDate && configuredStartDate.getDay() === SUNDAY && configuredStartDate < currentFirstSunday
      ? configuredStartDate
      : currentFirstSunday
  const lastGeneratedSunday = new Date(currentFirstSunday)
  lastGeneratedSunday.setDate(currentFirstSunday.getDate() + (count - 1) * 7)
  const dateIds = new Set()

  Object.keys(attendance).forEach((key) => {
    const dateId = getDateIdFromAttendanceKey(key)

    if (dateId) {
      dateIds.add(dateId)
    }
  })

  for (const date = new Date(firstSunday); date <= lastGeneratedSunday; date.setDate(date.getDate() + 7)) {
    dateIds.add(toDateKey(date))
  }

  return Array.from(dateIds)
    .sort()
    .map((dateId) => {
      const date = createDateFromDateKey(dateId)
      return date ? createColumnFromDate(date) : null
    })
    .filter(Boolean)
}

export function createAttendanceKey(playerId, dateId) {
  return `${playerId}:${dateId}`
}

export function isPlayerMonthComplete(playerId, dateIds, attendance) {
  return dateIds.length > 0 && dateIds.every((dateId) => Boolean(attendance[createAttendanceKey(playerId, dateId)]))
}

function addDaysToDateKey(dateId, days) {
  const date = new Date(`${dateId}T00:00:00`)
  date.setDate(date.getDate() + days)

  return toDateKey(date)
}

export function createMoonJellyStreakClaimKey(playerId, dateId) {
  return `${playerId}:${dateId}`
}

export function getMoonJellyStreakBonusDateIds(playerId, dateIds, attendance, purchaseDateId) {
  if (!playerId || !purchaseDateId) {
    return []
  }

  let consecutiveCount = 0
  let previousDateId = ''
  const bonusDateIds = []

  dateIds
    .filter((dateId) => dateId >= purchaseDateId)
    .sort()
    .forEach((dateId) => {
      const present = Boolean(attendance[createAttendanceKey(playerId, dateId)])
      const consecutive = previousDateId && addDaysToDateKey(previousDateId, 7) === dateId

      consecutiveCount = present ? (consecutive ? consecutiveCount + 1 : 1) : 0
      previousDateId = dateId

      if (present && consecutiveCount > 0 && consecutiveCount % 3 === 0) {
        bonusDateIds.push(dateId)
      }
    })

  return bonusDateIds
}
