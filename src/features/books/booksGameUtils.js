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

export function createBooksQuestionId(windowStartIndex, blankOffset) {
  return `book-${windowStartIndex}-${blankOffset}`
}

export function getBooksQuestionIds(books) {
  if (books.length < 3) {
    return []
  }

  return Array.from({ length: books.length - 2 }, (_unused, windowStartIndex) =>
    Array.from({ length: 3 }, (_offsetUnused, blankOffset) => createBooksQuestionId(windowStartIndex, blankOffset)),
  ).flat()
}

export function createBooksRound(books, presentPlayers, usedQuestionIds = []) {
  if (books.length < 3 || !presentPlayers.length) {
    return null
  }

  const usedQuestionIdSet = new Set(usedQuestionIds)
  const availableQuestions = Array.from({ length: books.length - 2 }, (_unused, windowStartIndex) =>
    Array.from({ length: 3 }, (_offsetUnused, blankOffset) => ({
      blankOffset,
      questionId: createBooksQuestionId(windowStartIndex, blankOffset),
      windowStartIndex,
    })),
  )
    .flat()
    .filter((question) => !usedQuestionIdSet.has(question.questionId))

  if (!availableQuestions.length) {
    return null
  }

  const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)]
  const blankIndex = question.windowStartIndex + question.blankOffset
  const playerIndex = Math.floor(Math.random() * presentPlayers.length)
  const windowBooks = books.slice(question.windowStartIndex, question.windowStartIndex + 3)

  return {
    answer: books[blankIndex],
    blankIndex,
    blankOffset: question.blankOffset,
    books: windowBooks,
    id: `${Date.now()}-${question.questionId}-${presentPlayers[playerIndex].id}`,
    player: presentPlayers[playerIndex],
    questionId: question.questionId,
    windowStartIndex: question.windowStartIndex,
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
