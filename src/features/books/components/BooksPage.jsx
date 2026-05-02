import { Fragment, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BOOKS_GAME_GOLD_REWARD, BOOKS_GAME_SECONDS } from '../../app/constants.js'
import { useAttendance } from '../../attendance/hooks/useAttendance.js'
import { OLD_TESTAMENT_CATEGORIES, TESTAMENTS, getOldTestamentCategoryId } from '../bibleBooks.js'
import { createBooksRound, getBooksGameAttendanceDate, getPresentPlayersForDate } from '../booksGameUtils.js'

const MotionDiv = motion.div

export default function BooksPage({ awardMessage, awardPendingPlayerId, onAwardPlayer, players }) {
  const { attendance } = useAttendance()
  const [selectedTestamentId, setSelectedTestamentId] = useState(TESTAMENTS[0].id)
  const [oldTestamentView, setOldTestamentView] = useState('list')
  const [round, setRound] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(BOOKS_GAME_SECONDS)
  const [timerDone, setTimerDone] = useState(false)
  const [awardedRoundId, setAwardedRoundId] = useState('')
  const [usedPlayerIds, setUsedPlayerIds] = useState([])

  const selectedTestament = TESTAMENTS.find((testament) => testament.id === selectedTestamentId) ?? TESTAMENTS[0]
  const isOldTestament = selectedTestament.id === 'old'
  const showOldTestamentFilters = isOldTestament && !round
  const attendanceDate = useMemo(() => getBooksGameAttendanceDate(attendance), [attendance])
  const presentPlayers = useMemo(
    () => getPresentPlayersForDate(players, attendance, attendanceDate?.id),
    [attendance, attendanceDate?.id, players],
  )
  const presentPlayerIds = useMemo(() => new Set(presentPlayers.map((player) => player.id)), [presentPlayers])
  const effectiveUsedPlayerIds = useMemo(
    () => usedPlayerIds.filter((playerId) => presentPlayerIds.has(playerId)),
    [presentPlayerIds, usedPlayerIds],
  )
  const availablePlayers = useMemo(
    () => presentPlayers.filter((player) => !effectiveUsedPlayerIds.includes(player.id)),
    [effectiveUsedPlayerIds, presentPlayers],
  )
  const canAwardRound = round && timerDone && awardedRoundId !== round.id
  const turnsLeft = round ? availablePlayers.length : availablePlayers.length || presentPlayers.length

  useEffect(() => {
    if (!round || timerDone) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timerId)
          setTimerDone(true)
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [round, timerDone])

  const handleTestamentChange = (testamentId) => {
    setSelectedTestamentId(testamentId)
    setRound(null)
    setSecondsLeft(BOOKS_GAME_SECONDS)
    setTimerDone(false)
    setAwardedRoundId('')
    setUsedPlayerIds([])
  }

  const handleStartRound = () => {
    const roundPlayers = availablePlayers.length ? availablePlayers : presentPlayers
    const nextRound = createBooksRound(selectedTestament.books, roundPlayers)

    if (!nextRound) {
      return
    }

    setUsedPlayerIds(
      availablePlayers.length ? [...effectiveUsedPlayerIds, nextRound.player.id] : [nextRound.player.id],
    )
    setRound(nextRound)
    setSecondsLeft(BOOKS_GAME_SECONDS)
    setTimerDone(false)
    setAwardedRoundId('')
  }

  const handleStopRound = () => {
    if (round) {
      setUsedPlayerIds((current) => current.filter((playerId) => playerId !== round.player.id))
    }

    setRound(null)
    setSecondsLeft(BOOKS_GAME_SECONDS)
    setTimerDone(false)
    setAwardedRoundId('')
  }

  const handleAwardGold = async () => {
    if (!canAwardRound) {
      return
    }

    const awarded = await onAwardPlayer(round.player.id)

    if (awarded) {
      setAwardedRoundId(round.id)
    }
  }

  return (
    <section className="panel books-page-shell">
      <div className="books-topbar">
        <div>
          <div className="eyebrow">Books</div>
          <h2>Books of the Bible</h2>
        </div>

        <div className="books-testament-toggle" aria-label="Choose testament">
          {TESTAMENTS.map((testament) => (
            <Fragment key={testament.id}>
              <button
                className={selectedTestament.id === testament.id ? 'active' : ''}
                onClick={() => handleTestamentChange(testament.id)}
                type="button"
              >
                {testament.label}
              </button>
              {round && testament.id === 'old' ? (
                <button className="books-stop-button" onClick={handleStopRound} type="button">
                  Stop
                </button>
              ) : null}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="books-game-board">
        <div className="books-list-panel">
          <div className="books-list-heading">
            <strong>{selectedTestament.label}</strong>
            <span>{selectedTestament.books.length} books</span>
          </div>

          {isOldTestament && oldTestamentView === 'category' && !round ? (
            <div className="books-category-list">
              {OLD_TESTAMENT_CATEGORIES.map((category) => (
                <section className={`books-category-card ${category.id}`} key={category.id}>
                  <strong>{category.label}</strong>
                  <ol>
                    {category.books.map((book) => (
                      <li className={`category-${category.id}`} key={book}>
                        {book}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          ) : (
            <ol className="books-list">
              {selectedTestament.books.map((book, index) => {
                const categoryId = getOldTestamentCategoryId(book)
                const isBlank = round?.blankIndex === index

                return (
                  <li className={`${isBlank ? 'blank' : ''} ${categoryId ? `category-${categoryId}` : ''}`} key={book}>
                    <span>{index + 1}</span>
                    <strong>{isBlank ? '____________' : book}</strong>
                  </li>
                )
              })}
            </ol>
          )}
        </div>

        <aside className="books-side-panel">
          <div className="books-player-card">
            <span>Answering</span>
            <strong>{round?.player.display_name ?? 'Press Start'}</strong>
            <small>
              {turnsLeft} turn{turnsLeft === 1 ? '' : 's'} left
            </small>
          </div>

          <MotionDiv
            animate={{ scale: timerDone ? 1.04 : 1 }}
            className={`books-timer ${timerDone ? 'done' : ''}`}
            transition={{ type: 'spring', stiffness: 240, damping: 16 }}
          >
            <span>Timer</span>
            <strong>{secondsLeft}</strong>
          </MotionDiv>

          <div className="books-actions">
            {!round ? (
              <button
                className="primary-button books-start-button"
                disabled={!presentPlayers.length}
                onClick={handleStartRound}
                type="button"
              >
                Start
              </button>
            ) : null}

            {showOldTestamentFilters ? (
              <div className="books-view-filter" aria-label="Old Testament view filter">
                <span>View</span>
                <button
                  className={oldTestamentView === 'list' ? 'active' : ''}
                  onClick={() => setOldTestamentView('list')}
                  type="button"
                >
                  By List
                </button>
                <button
                  className={oldTestamentView === 'category' ? 'active' : ''}
                  onClick={() => setOldTestamentView('category')}
                  type="button"
                >
                  By Category
                </button>
              </div>
            ) : null}

            {round && !timerDone ? <p className="books-answer-hint">Identify the missing book.</p> : null}

            {timerDone ? (
              <>
                <div className="books-answer-card">
                  <span>Answer</span>
                  <strong>{round.answer}</strong>
                </div>
                <button
                  className="primary-button books-award-button"
                  disabled={!canAwardRound || awardPendingPlayerId === round.player.id}
                  onClick={handleAwardGold}
                  type="button"
                >
                  {awardedRoundId === round.id ? 'Awarded' : `+${BOOKS_GAME_GOLD_REWARD}`}
                </button>
                <button
                  className="ghost-button books-next-button"
                  disabled={!presentPlayers.length}
                  onClick={handleStartRound}
                  type="button"
                >
                  Next
                  <span aria-hidden="true">&gt;</span>
                </button>
              </>
            ) : null}

            {!presentPlayers.length ? (
              <p className="books-empty-note">Mark students present in Attendance first.</p>
            ) : null}

            {awardMessage.text ? <p className={`status-line ${awardMessage.type}`}>{awardMessage.text}</p> : null}
          </div>
        </aside>
      </div>
    </section>
  )
}
