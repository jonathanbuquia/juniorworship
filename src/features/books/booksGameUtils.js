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

export function createBooksQuestionId(blankIndex) {
  return `book-${blankIndex}`
}

export function getBooksQuestionIds(books) {
  if (books.length < 3) {
    return []
  }

  return Array.from({ length: books.length - 2 }, (_unused, index) => createBooksQuestionId(index + 1))
}

export function createBooksRound(books, presentPlayers, usedQuestionIds = []) {
  if (books.length < 3 || !presentPlayers.length) {
    return null
  }

  const usedQuestionIdSet = new Set(usedQuestionIds)
  const availableBlankIndexes = Array.from({ length: books.length - 2 }, (_unused, index) => index + 1).filter(
    (blankIndex) => !usedQuestionIdSet.has(createBooksQuestionId(blankIndex)),
  )

  if (!availableBlankIndexes.length) {
    return null
  }

  const blankIndex = availableBlankIndexes[Math.floor(Math.random() * availableBlankIndexes.length)]
  const playerIndex = Math.floor(Math.random() * presentPlayers.length)
  const questionId = createBooksQuestionId(blankIndex)

  return {
    answer: books[blankIndex],
    blankIndex,
    id: `${Date.now()}-${questionId}-${presentPlayers[playerIndex].id}`,
    nextBook: books[blankIndex + 1],
    player: presentPlayers[playerIndex],
    previousBook: books[blankIndex - 1],
    questionId,
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
