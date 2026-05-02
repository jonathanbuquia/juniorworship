import { createAttendanceKey, createSundayColumns } from '../attendance/attendanceUtils.js'

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

export function getBooksGameAttendanceDate(attendance) {
  return createSundayColumns(1, undefined, attendance)[0]
}

export function getPresentPlayersForDate(players, attendance, dateId) {
  if (!dateId) {
    return []
  }

  return players.filter((player) => Boolean(attendance[createAttendanceKey(player.id, dateId)]))
}
