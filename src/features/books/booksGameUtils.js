import { createAttendanceKey } from '../attendance/attendanceUtils.js'

const SUNDAY = 0

function createLocalDate(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function toDateKey(value) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function createBooksRound(books, presentPlayers) {
  if (books.length < 3 || !presentPlayers.length) {
    return null
  }

  const blankIndex = Math.floor(Math.random() * (books.length - 2)) + 1
  const playerIndex = Math.floor(Math.random() * presentPlayers.length)

  return {
    answer: books[blankIndex],
    blankIndex,
    id: `${Date.now()}-${blankIndex}-${presentPlayers[playerIndex].id}`,
    nextBook: books[blankIndex + 1],
    player: presentPlayers[playerIndex],
    previousBook: books[blankIndex - 1],
  }
}

export function getBooksGameAttendanceDate(value = new Date()) {
  const date = createLocalDate(value)
  const daysUntilSunday = (7 + SUNDAY - date.getDay()) % 7
  date.setDate(date.getDate() + daysUntilSunday)

  return {
    id: toDateKey(date),
  }
}

export function getPresentPlayersForDate(players, attendance, dateId) {
  if (!dateId) {
    return []
  }

  return players.filter((player) => Boolean(attendance[createAttendanceKey(player.id, dateId)]))
}
