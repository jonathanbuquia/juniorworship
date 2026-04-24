import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './AdminApp.css'
import AquariumScene from './components/AquariumScene'
import { hasSupabaseEnv, supabase } from './lib/supabase'
import { SHOP_CATEGORIES, getShopItemsByCategory } from '../shared/shopCatalog.js'

const ADMIN_PATH = '/admin'
const MEMORY_PATH = '/memory-verse'
const QUIZ_PATH = '/quiz'
const SHOP_PATH = '/shop'
const ADMIN_SECTIONS = {
  createPlayer: 'create-player',
  manageGold: 'manage-gold',
  deletePlayer: 'delete-player',
}
const QUICK_GOLD_ACTIONS = [25, 50, 100, -25, -50, -100]
const QUIZ_QUESTION_COUNT = 5
const GOLD_PER_QUIZ_POINT = 20
const MEMORY_VERSE_QUIZ_POINTS = 5
const MEMORY_VERSE_STORAGE_KEY = 'memory-verse-helper'
const QUIZ_STORAGE_KEY = 'quiz-helper'
const SHOP_NOTICE_DURATION = 3200
const RAIL_TRANSITION = {
  type: 'spring',
  stiffness: 280,
  damping: 28,
}
const POPOVER_TRANSITION = {
  duration: 0.2,
  ease: 'easeOut',
}
const MotionButton = motion.button
const MotionDiv = motion.div
const MotionHeader = motion.header
const MotionMain = motion.main
const MotionSpan = motion.span

function normalizeLoginName(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function readJson(response) {
  return response.json().catch(() => ({}))
}

function isAdminProfile(profile) {
  return profile?.role === 'admin'
}

function createEmptyMessage() {
  return {
    type: '',
    text: '',
  }
}

function formatGoldChange(amount) {
  return amount > 0 ? `+${amount}` : `${amount}`
}

function createEmptyMemoryVerseForm() {
  return {
    reference: '',
    text: '',
  }
}

function createEmptyActiveMemoryVerse() {
  return {
    reference: '',
    text: '',
    coveredCount: 0,
    coveredWordIndexes: [],
    undoneCoveredWordIndexes: [],
  }
}

function clampMemoryFontSize(value) {
  return Math.min(5, Math.max(1, value))
}

function createEmptyQuizQuestion(index = 0) {
  return {
    id: `quiz-question-${index + 1}`,
    prompt: '',
    points: '1',
    choices: ['', '', '', ''],
    correctChoiceIndex: '0',
  }
}

function getQuizQuestionPoints(question) {
  return Number(question?.points) || 1
}

function getQuizQuestionGold(question) {
  return getQuizQuestionPoints(question) * GOLD_PER_QUIZ_POINT
}

function createEmptyQuizAwardScores() {
  return {}
}

function getQuizAwardGold(score) {
  const scoreNumber = Number(score)

  if (!Number.isInteger(scoreNumber) || scoreNumber <= 0) {
    return 0
  }

  return scoreNumber * GOLD_PER_QUIZ_POINT
}

function getChoiceLabel(choiceIndex) {
  return String.fromCharCode(65 + Number(choiceIndex || 0))
}

function resolveCorrectChoiceIndex(answerText, choices) {
  const normalizedAnswer = String(answerText || '').trim()
  const letterMatch = normalizedAnswer.match(/^(?:option|choice)?\s*([A-D])(?:\b|[).:-])/i)

  if (letterMatch) {
    return String(letterMatch[1].toUpperCase().charCodeAt(0) - 65)
  }

  const normalizedAnswerText = normalizedAnswer.toLowerCase()
  const matchingChoiceIndex = choices.findIndex((choice) => {
    const normalizedChoice = String(choice || '').trim().toLowerCase()
    return normalizedChoice && (normalizedChoice === normalizedAnswerText || normalizedChoice.includes(normalizedAnswerText))
  })

  return matchingChoiceIndex >= 0 ? String(matchingChoiceIndex) : '0'
}

function splitAnswerFromText(value) {
  const text = stripQuizQuestionIdentifier(value)
  const match = text.match(/^(.*?)(?:\s+|^)(?:[([]?\s*)?(?:correct answer|answer|ans|correct)\s*(?:is\s*)?[:=-]?\s*(.+?)\s*[)\]]?$/i)

  if (!match) {
    return {
      answerText: '',
      cleanText: text,
    }
  }

  return {
    answerText: match[2].trim(),
    cleanText: match[1].trim(),
  }
}

function stripQuizQuestionIdentifier(value) {
  return String(value || '')
    .trim()
    .replace(/^(?:question|q)\s*\d+\s*[).:-]?\s*/i, '')
    .replace(/^(?:question|q)\s*[:.-]\s*/i, '')
    .trim()
}

function collectAnswerKeyEntries(value, answerKey) {
  const text = String(value || '')
    .replace(/\s+(?=(?:q(?:uestion)?\s*)?\d+\s*[).:-])/gi, '\n')
    .split(/\r?\n|[,;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
  let foundAnswer = false

  text.forEach((entry) => {
    const numberedAnswerMatch =
      entry.match(/^(?:q(?:uestion)?\s*)?(\d+)\s*[).:-]\s*(.+)$/i) ||
      entry.match(/^(?:q(?:uestion)?\s*)?(\d+)\s+(.+)$/i)

    if (!numberedAnswerMatch) {
      return
    }

    const questionNumber = Number(numberedAnswerMatch[1])
    const answerText = numberedAnswerMatch[2].trim()

    if (!Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > QUIZ_QUESTION_COUNT || !answerText) {
      return
    }

    answerKey.set(questionNumber, answerText)
    foundAnswer = true
  })

  return foundAnswer
}

function parseQuizDraftText(text) {
  const answerKey = new Map()
  const lines = String(text || '')
    .replace(/\s+(?=(?:(?:question|q)\s*)?\d+[).:-]\s*)/gi, '\n')
    .replace(/\s+(?=[A-Da-d][).:-]\s+)/g, '\n')
    .replace(/\s+(?=(?:correct answer|answer|ans|correct)\s*(?:is\s*)?[:=-])/gi, '\n')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const parsedQuestions = []
  let currentQuestion = null
  let answerKeyMode = false

  const pushCurrentQuestion = () => {
    if (!currentQuestion) {
      return
    }

    if (currentQuestion.prompt || currentQuestion.choices.some(Boolean)) {
      const { _correctAnswerText, ...question } = currentQuestion
      parsedQuestions.push({
        ...question,
        correctChoiceIndex: resolveCorrectChoiceIndex(_correctAnswerText ?? question.correctChoiceIndex, question.choices),
        prompt: stripQuizQuestionIdentifier(question.prompt),
      })
    }

    currentQuestion = null
  }

  const ensureCurrentQuestion = () => {
    if (!currentQuestion) {
      currentQuestion = createEmptyQuizQuestion(parsedQuestions.length)
    }

    return currentQuestion
  }

  lines.forEach((line) => {
    const questionHeaderMatch = line.match(/^(?:(?:question|q)\s*)?(\d+)[).:-]\s*$/i)
    const questionMatch = line.match(/^(?:(?:question|q)\s*)?(\d+)[).:-]\s*(.+)$/i)
    const namedQuestionMatch = line.match(/^(?:question|q)\s*[:.-]\s*(.+)$/i)
    const optionMatch = line.match(/^(?:[-*]\s*)?([A-D])[).:-]\s*(.+)$/i)
    const answerKeyHeaderMatch = line.match(/^(?:answer key|answers|correct answers)\s*[:.-]?\s*(.*)$/i)
    const answerMatch = line.match(/^(?:correct answer|answer|ans|correct)\s*(?:is\s*)?[:.-]?\s*(.+)$/i)

    if (answerKeyHeaderMatch) {
      pushCurrentQuestion()
      answerKeyMode = true
      collectAnswerKeyEntries(answerKeyHeaderMatch[1], answerKey)
      return
    }

    if (answerKeyMode && collectAnswerKeyEntries(line, answerKey)) {
      return
    }

    if (answerKeyMode && (questionHeaderMatch || questionMatch || namedQuestionMatch || optionMatch)) {
      answerKeyMode = false
    }

    if (questionHeaderMatch) {
      pushCurrentQuestion()
      currentQuestion = createEmptyQuizQuestion(parsedQuestions.length)
      return
    }

    if (questionMatch && !optionMatch) {
      const { answerText, cleanText } = splitAnswerFromText(questionMatch[2])
      pushCurrentQuestion()
      currentQuestion = createEmptyQuizQuestion(parsedQuestions.length)
      currentQuestion.prompt = stripQuizQuestionIdentifier(cleanText)
      currentQuestion._correctAnswerText = answerText || currentQuestion._correctAnswerText
      return
    }

    if (namedQuestionMatch) {
      const { answerText, cleanText } = splitAnswerFromText(namedQuestionMatch[1])
      pushCurrentQuestion()
      currentQuestion = createEmptyQuizQuestion(parsedQuestions.length)
      currentQuestion.prompt = stripQuizQuestionIdentifier(cleanText)
      currentQuestion._correctAnswerText = answerText || currentQuestion._correctAnswerText
      return
    }

    if (optionMatch) {
      const question = ensureCurrentQuestion()
      const { answerText, cleanText } = splitAnswerFromText(optionMatch[2])
      const choiceIndex = optionMatch[1].toUpperCase().charCodeAt(0) - 65
      const nextChoices = [...question.choices]
      nextChoices[choiceIndex] = cleanText
      currentQuestion = {
        ...question,
        choices: nextChoices,
        _correctAnswerText: answerText || question._correctAnswerText,
      }
      return
    }

    if (answerMatch) {
      const question = ensureCurrentQuestion()
      currentQuestion = {
        ...question,
        _correctAnswerText: answerMatch[1],
      }
      return
    }

    const question = ensureCurrentQuestion()
    const { answerText, cleanText } = splitAnswerFromText(line)
    currentQuestion = {
      ...question,
      prompt: cleanText
        ? stripQuizQuestionIdentifier(question.prompt ? `${question.prompt} ${cleanText}` : cleanText)
        : question.prompt,
      _correctAnswerText: answerText || question._correctAnswerText,
    }
  })

  pushCurrentQuestion()

  return createFixedQuizQuestions(parsedQuestions.slice(0, QUIZ_QUESTION_COUNT)).map((question, index) => {
    const answerText = answerKey.get(index + 1)

    if (!answerText) {
      return question
    }

    return {
      ...question,
      correctChoiceIndex: resolveCorrectChoiceIndex(answerText, question.choices),
    }
  })
}

function createFixedQuizQuestions(savedQuestions = []) {
  return Array.from({ length: QUIZ_QUESTION_COUNT }, (_unused, index) => {
    const savedQuestion = savedQuestions[index] || {}
    const savedChoices = Array.isArray(savedQuestion.choices) ? savedQuestion.choices : []
    const correctChoiceIndex = Number(savedQuestion.correctChoiceIndex)

    return {
      ...createEmptyQuizQuestion(index),
      ...savedQuestion,
      id: savedQuestion.id || `quiz-question-${index + 1}`,
      points: '1',
      choices: Array.from({ length: 4 }, (_choice, choiceIndex) => savedChoices[choiceIndex] || ''),
      correctChoiceIndex: Number.isInteger(correctChoiceIndex) && correctChoiceIndex >= 0 && correctChoiceIndex <= 3
        ? String(correctChoiceIndex)
        : '0',
    }
  })
}

function buildMemoryVerseTokens(text) {
  let wordIndex = -1

  return String(text || '')
    .split(/(\s+)/)
    .filter(Boolean)
    .map((token, tokenIndex) => {
      const isWord = !/^\s+$/.test(token)

      if (isWord) {
        wordIndex += 1
      }

      return {
        id: `${tokenIndex}-${token}`,
        isWord,
        text: token,
        wordIndex,
      }
    })
}

function getMemoryVerseWordCount(text) {
  return buildMemoryVerseTokens(text).filter((token) => token.isWord).length
}

function getCoveredWordIndexes(activeMemoryVerse, totalWords) {
  if (Array.isArray(activeMemoryVerse.coveredWordIndexes)) {
    return activeMemoryVerse.coveredWordIndexes.filter((wordIndex) => wordIndex >= 0 && wordIndex < totalWords)
  }

  const legacyCount = Math.min(activeMemoryVerse.coveredCount || 0, totalWords)
  return Array.from({ length: legacyCount }, (_unused, index) => index)
}

function getRandomUncoveredWordIndex(totalWords, coveredWordIndexes) {
  const coveredSet = new Set(coveredWordIndexes)
  const availableWordIndexes = Array.from({ length: totalWords }, (_unused, index) => index).filter(
    (wordIndex) => !coveredSet.has(wordIndex),
  )

  if (!availableWordIndexes.length) {
    return null
  }

  return availableWordIndexes[Math.floor(Math.random() * availableWordIndexes.length)]
}

function shuffleWordIndexes(totalWords) {
  const wordIndexes = Array.from({ length: totalWords }, (_unused, index) => index)

  for (let index = wordIndexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[wordIndexes[index], wordIndexes[swapIndex]] = [wordIndexes[swapIndex], wordIndexes[index]]
  }

  return wordIndexes
}

function buildMemoryVerseQuizDetails(memoryVerse) {
  const tokens = buildMemoryVerseTokens(memoryVerse?.text || '')
  const wordTokens = tokens.filter((token) => token.isWord)

  if (!memoryVerse?.text || wordTokens.length === 0) {
    return {
      answers: [],
      prompt: '',
    }
  }

  const blankCount = Math.min(5, wordTokens.length)
  const blankWordIndexes = new Map(
    Array.from({ length: blankCount }, (_unused, index) =>
      Math.min(wordTokens.length - 1, Math.floor(((index + 1) * wordTokens.length) / (blankCount + 1))),
    ).map((wordTokenIndex, index) => [wordTokens[wordTokenIndex].wordIndex, index + 6]),
  )
  const answerByNumber = new Map(
    wordTokens
      .filter((token) => blankWordIndexes.has(token.wordIndex))
      .map((token) => [blankWordIndexes.get(token.wordIndex), token.text]),
  )

  return {
    answers: Array.from(answerByNumber, ([number, answer]) => ({ answer, number })).sort(
      (first, second) => first.number - second.number,
    ),
    prompt: tokens
      .map((token) => {
        if (!token.isWord) {
          return token.text
        }

        return blankWordIndexes.has(token.wordIndex) ? `(${blankWordIndexes.get(token.wordIndex)}) _____` : token.text
      })
      .join(''),
  }
}

function mergeViewedPlayer(player, profile) {
  if (!player) {
    return null
  }

  if (profile?.id === player.id && profile.role === 'player') {
    return {
      ...player,
      gold: profile.gold ?? player.gold,
      display_name: profile.display_name ?? player.display_name,
      login_name: profile.login_name ?? player.login_name,
    }
  }

  return player
}

function CreatePlayerSection({
  createPlayerForm,
  createPlayerPending,
  createPlayerResult,
  onCreatePlayer,
  onCreatePlayerChange,
  players,
}) {
  return (
    <div className="admin-content-stack">
      <div className="content-intro">
        <div>
          <div className="eyebrow">Player Accounts</div>
          <h2>Add a new player</h2>
        </div>
        <p className="panel-copy">Add a player profile with a name and starting gold.</p>
      </div>

      <div className="workspace-grid">
        <form className="stack-form workspace-card" onSubmit={onCreatePlayer}>
          <label className="field">
            <span>Player display name</span>
            <input
              name="displayName"
              onChange={onCreatePlayerChange}
              placeholder="Alyssa"
              value={createPlayerForm.displayName}
            />
          </label>

          <label className="field">
            <span>Starting gold</span>
            <input
              inputMode="numeric"
              name="startingGold"
              onChange={onCreatePlayerChange}
              placeholder="250"
              value={createPlayerForm.startingGold}
            />
          </label>

          {createPlayerResult.text ? (
            <p className={`status-line ${createPlayerResult.type}`}>{createPlayerResult.text}</p>
          ) : null}

          <button className="primary-button" disabled={createPlayerPending} type="submit">
            {createPlayerPending ? 'Creating player...' : 'Create player'}
          </button>
        </form>

        <div className="workspace-card player-preview-card">
          <div className="card-heading">
            <h3>Current players</h3>
            <span>{players.length}</span>
          </div>

          <div className="player-preview-list">
            {players.length ? (
              players.slice(0, 8).map((player) => (
                <div className="player-preview-row" key={player.id}>
                  <div>
                    <strong>{player.display_name}</strong>
                  </div>
                  <strong>{player.gold} gold</strong>
                </div>
              ))
            ) : (
              <p className="panel-note">No players yet. Your first new account will appear here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function GoldManagerSection({
  goldForm,
  goldPending,
  goldResult,
  onAdjustGold,
  onGoldFormChange,
  onQuickGoldAmount,
  onSelectPlayer,
  players,
  playersLoading,
  playersMessage,
  selectedPlayer,
}) {
  return (
    <div className="admin-content-stack">
      <div className="content-intro">
        <div>
          <div className="eyebrow">Gold Controls</div>
          <h2>Adjust player gold</h2>
        </div>
        <p className="panel-copy">
          Pick a player, then enter a positive or negative amount. Positive adds gold. Negative removes it.
        </p>
      </div>

      {playersMessage.text ? <p className={`status-line ${playersMessage.type}`}>{playersMessage.text}</p> : null}

      <div className="gold-layout">
        <div className="workspace-card player-browser-card">
          <div className="card-heading">
            <h3>Players</h3>
            <span>{players.length}</span>
          </div>

          {playersLoading ? (
            <p className="panel-note">Loading players...</p>
          ) : players.length ? (
            <div className="player-browser-list">
              {players.map((player) => (
                <button
                  className={`player-browser-item ${selectedPlayer?.id === player.id ? 'active' : ''}`}
                  key={player.id}
                  onClick={() => onSelectPlayer(player.id)}
                  type="button"
                >
                  <div>
                    <strong>{player.display_name}</strong>
                  </div>
                  <strong>{player.gold}</strong>
                </button>
              ))}
            </div>
          ) : (
            <p className="panel-note">Create at least one player before you start changing gold.</p>
          )}
        </div>

        <div className="workspace-card gold-editor-card">
          {selectedPlayer ? (
            <>
              <div className="selected-player-hero">
                <div>
                  <div className="eyebrow">Selected Player</div>
                  <h3>{selectedPlayer.display_name}</h3>
                  <p className="panel-note">Use the controls below to update this player's gold.</p>
                </div>
                <div className="gold-balance-badge">
                  <span>Current gold</span>
                  <strong>{selectedPlayer.gold}</strong>
                </div>
              </div>

              <div className="quick-gold-actions">
                {QUICK_GOLD_ACTIONS.map((amount) => (
                  <button
                    className={`quick-gold-chip ${amount > 0 ? 'add' : 'subtract'}`}
                    key={amount}
                    onClick={() => onQuickGoldAmount(amount)}
                    type="button"
                  >
                    {formatGoldChange(amount)}
                  </button>
                ))}
              </div>

              <form className="stack-form" onSubmit={onAdjustGold}>
                <label className="field">
                  <span>Gold change</span>
                  <input
                    inputMode="numeric"
                    name="amount"
                    onChange={onGoldFormChange}
                    placeholder="Example: 100 or -50"
                    value={goldForm.amount}
                  />
                </label>

                <p className="panel-note">
                  Example: <strong>100</strong> adds gold. <strong>-50</strong> removes gold.
                </p>

                {goldResult.text ? <p className={`status-line ${goldResult.type}`}>{goldResult.text}</p> : null}

                <button className="primary-button" disabled={goldPending} type="submit">
                  {goldPending ? 'Updating gold...' : 'Apply gold change'}
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state-card">
              <h3>Select a player</h3>
              <p className="panel-note">Choose a player from the list so you can add or remove gold.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DeletePlayerSection({
  deletePending,
  deleteResult,
  onDeletePlayer,
  onSelectPlayer,
  players,
  playersLoading,
  playersMessage,
  selectedPlayer,
}) {
  return (
    <div className="admin-content-stack">
      <div className="content-intro">
        <div>
          <div className="eyebrow">Delete Players</div>
          <h2>Remove a player account</h2>
        </div>
        <p className="panel-copy">This permanently deletes the player profile and anything saved under it.</p>
      </div>

      {playersMessage.text ? <p className={`status-line ${playersMessage.type}`}>{playersMessage.text}</p> : null}

      <div className="gold-layout">
        <div className="workspace-card player-browser-card">
          <div className="card-heading">
            <h3>Players</h3>
            <span>{players.length}</span>
          </div>

          {playersLoading ? (
            <p className="panel-note">Loading players...</p>
          ) : players.length ? (
            <div className="player-browser-list">
              {players.map((player) => (
                <button
                  className={`player-browser-item ${selectedPlayer?.id === player.id ? 'active' : ''}`}
                  key={player.id}
                  onClick={() => onSelectPlayer(player.id)}
                  type="button"
                >
                  <div>
                    <strong>{player.display_name}</strong>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="panel-note">There are no player accounts to delete.</p>
          )}
        </div>

        <div className="workspace-card delete-player-card">
          {selectedPlayer ? (
            <>
              <div className="selected-player-hero">
                <div>
                  <div className="eyebrow">Selected Player</div>
                  <h3>{selectedPlayer.display_name}</h3>
                  <p className="panel-note">This action cannot be undone.</p>
                </div>
              </div>

              <div className="danger-zone">
                <h3>Permanent delete</h3>
                <p className="panel-note">
                  This removes the player completely, including their saved profile and owned data.
                </p>

                {deleteResult.text ? <p className={`status-line ${deleteResult.type}`}>{deleteResult.text}</p> : null}

                <button className="danger-button" disabled={deletePending} onClick={onDeletePlayer} type="button">
                  {deletePending ? 'Deleting player...' : 'Delete player'}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state-card">
              <h3>Select a player</h3>
              <p className="panel-note">Choose a player from the list before deleting the account.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AdminPanel({
  adminSection,
  createPlayerForm,
  createPlayerPending,
  createPlayerResult,
  deletePending,
  deleteResult,
  goldForm,
  goldPending,
  goldResult,
  onAdjustGold,
  onCreatePlayer,
  onCreatePlayerChange,
  onDeletePlayer,
  onGoldFormChange,
  onLogout,
  onQuickGoldAmount,
  onReturnToGame,
  onSectionChange,
  onSelectPlayer,
  players,
  playersLoading,
  playersMessage,
  profile,
  selectedPlayer,
}) {
  return (
    <section className="panel admin-panel-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-top">
          <div className="eyebrow">Admin Dashboard</div>
          <h2>{profile?.display_name || 'Admin'}</h2>
          <p className="panel-copy">
            Use the left controls to switch tasks. The larger workspace on the right is where you work.
          </p>
        </div>

        <nav aria-label="Admin sections" className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${adminSection === ADMIN_SECTIONS.createPlayer ? 'active' : ''}`}
            onClick={() => onSectionChange(ADMIN_SECTIONS.createPlayer)}
            type="button"
          >
            <span>Add player</span>
            <small>Create and hand out accounts</small>
          </button>

          <button
            className={`sidebar-nav-item ${adminSection === ADMIN_SECTIONS.manageGold ? 'active' : ''}`}
            onClick={() => onSectionChange(ADMIN_SECTIONS.manageGold)}
            type="button"
          >
            <span>Manage gold</span>
            <small>Add or remove player gold</small>
          </button>

          <button
            className={`sidebar-nav-item ${adminSection === ADMIN_SECTIONS.deletePlayer ? 'active' : ''}`}
            onClick={() => onSectionChange(ADMIN_SECTIONS.deletePlayer)}
            type="button"
          >
            <span>Delete player</span>
            <small>Remove a player account permanently</small>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="ghost-button" onClick={onReturnToGame} type="button">
            Back to game
          </button>
          <button className="ghost-button" onClick={onLogout} type="button">
            Log out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        {adminSection === ADMIN_SECTIONS.createPlayer ? (
          <CreatePlayerSection
            createPlayerForm={createPlayerForm}
            createPlayerPending={createPlayerPending}
            createPlayerResult={createPlayerResult}
            onCreatePlayer={onCreatePlayer}
            onCreatePlayerChange={onCreatePlayerChange}
            players={players}
          />
        ) : adminSection === ADMIN_SECTIONS.manageGold ? (
          <GoldManagerSection
            goldForm={goldForm}
            goldPending={goldPending}
            goldResult={goldResult}
            onAdjustGold={onAdjustGold}
            onGoldFormChange={onGoldFormChange}
            onQuickGoldAmount={onQuickGoldAmount}
            onSelectPlayer={onSelectPlayer}
            players={players}
            playersLoading={playersLoading}
            playersMessage={playersMessage}
            selectedPlayer={selectedPlayer}
          />
        ) : (
          <DeletePlayerSection
            deletePending={deletePending}
            deleteResult={deleteResult}
            onDeletePlayer={onDeletePlayer}
            onSelectPlayer={onSelectPlayer}
            players={players}
            playersLoading={playersLoading}
            playersMessage={playersMessage}
            selectedPlayer={selectedPlayer}
          />
        )}
      </div>
    </section>
  )
}

function AuthPopover({
  authPending,
  hasAdmin,
  isAdmin,
  loginForm,
  loginMessage,
  onBootstrapChange,
  onCreateAdmin,
  onLogin,
  onLoginChange,
  onOpenAdmin,
  onSignOut,
  profile,
  setupForm,
  setupMessage,
  viewingAdmin,
}) {
  return (
    <MotionDiv
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      className="auth-popover panel"
      exit={{ opacity: 0, x: -8, y: 8, scale: 0.96 }}
      initial={{ opacity: 0, x: -12, y: 12, scale: 0.96 }}
      transition={POPOVER_TRANSITION}
    >
      {profile ? (
        <div className="auth-session-strip">
          <div>
            <div className="eyebrow">Signed In</div>
            <strong>{profile.display_name}</strong>
          </div>
          <div className="auth-session-actions">
            {isAdmin ? (
              <button className="ghost-button compact-button" onClick={onOpenAdmin} type="button">
                {viewingAdmin ? 'Back to game' : 'Open admin'}
              </button>
            ) : null}
            <button className="ghost-button compact-button" onClick={onSignOut} type="button">
              Sign out
            </button>
          </div>
        </div>
      ) : hasAdmin ? (
        <form className="stack-form" onSubmit={onLogin}>
          <div className="eyebrow">Admin Sign In</div>
          <label className="field">
            <span>Login name</span>
            <input
              autoComplete="username"
              name="loginName"
              onChange={onLoginChange}
              placeholder="admin login name"
              value={loginForm.loginName}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={onLoginChange}
              placeholder="Enter password"
              type="password"
              value={loginForm.password}
            />
          </label>

          {loginMessage.text ? <p className={`status-line ${loginMessage.type}`}>{loginMessage.text}</p> : null}

          <button className="primary-button" disabled={authPending} type="submit">
            {authPending ? 'Signing in...' : 'Sign in as admin'}
          </button>
        </form>
      ) : (
        <form className="stack-form" onSubmit={onCreateAdmin}>
          <div className="eyebrow">Create First Admin</div>
          <label className="field">
            <span>Your display name</span>
            <input
              name="displayName"
              onChange={onBootstrapChange}
              placeholder="Teacher Maria"
              value={setupForm.displayName}
            />
          </label>

          <label className="field">
            <span>Admin login name</span>
            <input
              autoComplete="username"
              name="loginName"
              onChange={onBootstrapChange}
              placeholder="teacher maria"
              value={setupForm.loginName}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="new-password"
              name="password"
              onChange={onBootstrapChange}
              placeholder="At least 6 characters"
              type="password"
              value={setupForm.password}
            />
          </label>

          <label className="field">
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              name="confirmPassword"
              onChange={onBootstrapChange}
              placeholder="Type it again"
              type="password"
              value={setupForm.confirmPassword}
            />
          </label>

          {setupMessage.text ? <p className={`status-line ${setupMessage.type}`}>{setupMessage.text}</p> : null}

          <button className="primary-button" disabled={authPending} type="submit">
            {authPending ? 'Creating admin...' : 'Create admin'}
          </button>
        </form>
      )}
    </MotionDiv>
  )
}

function ProfileMenu({ onSelectPlayer, players, selectedPlayerId }) {
  return (
    <MotionDiv
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      className="profile-menu panel"
      exit={{ opacity: 0, x: -8, y: -4, scale: 0.96 }}
      initial={{ opacity: 0, x: -12, y: 8, scale: 0.96 }}
      transition={POPOVER_TRANSITION}
    >
      <div className="profile-menu-list">
        {players.length ? (
          players.map((player) => (
            <button
              className={`profile-menu-item ${selectedPlayerId === player.id ? 'active' : ''}`}
              key={player.id}
              onClick={() => onSelectPlayer(player.id)}
              type="button"
            >
              <span>{player.display_name}</span>
            </button>
          ))
        ) : (
          <p className="panel-note">No player profiles yet.</p>
        )}
      </div>
    </MotionDiv>
  )
}

function ActivePlayerHud({ collapsed, onToggleCollapsed, player }) {
  if (!player) {
    return null
  }

  return (
    <MotionDiv
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      className={`active-player-hud panel ${collapsed ? 'collapsed' : ''}`}
      exit={{ opacity: 0, x: 16, y: -12, scale: 0.96 }}
      initial={{ opacity: 0, x: 20, y: -16, scale: 0.96 }}
      layout
      transition={POPOVER_TRANSITION}
    >
      <MotionButton
        aria-label={collapsed ? 'Expand active player card' : 'Collapse active player card'}
        className="active-player-hud-toggle"
        onClick={onToggleCollapsed}
        type="button"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
      >
        {collapsed ? '+' : '−'}
      </MotionButton>

      <AnimatePresence initial={false}>
        {!collapsed ? (
          <>
            <MotionDiv
              animate={{ opacity: 1, x: 0 }}
              className="active-player-hud-copy"
              exit={{ opacity: 0, x: 8 }}
              initial={{ opacity: 0, x: 8 }}
              key="active-player-copy"
              transition={POPOVER_TRANSITION}
            >
              <div className="eyebrow">Active Player</div>
              <strong>{player.display_name}</strong>
            </MotionDiv>
            <MotionDiv
              animate={{ opacity: 1, x: 0 }}
              className="active-player-hud-gold"
              exit={{ opacity: 0, x: 8 }}
              initial={{ opacity: 0, x: 8 }}
              key="active-player-gold"
              transition={POPOVER_TRANSITION}
            >
              <span>Gold</span>
              <strong>{player.gold ?? 0}</strong>
            </MotionDiv>
          </>
        ) : null}
      </AnimatePresence>
    </MotionDiv>
  )
}

function RailIcon({ type }) {
  if (type === 'brand') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 12c3.4-4 8.1-6 13-6v4l3-2.5L17 5v4c-4.7 0-8.2 1.2-11 3 2.8 1.8 6.3 3 11 3v4l3-2.5L17 14v4c-4.9 0-9.6-2-13-6Z" />
        <circle cx="9.25" cy="10" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  if (type === 'profile') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5.5 19a7.5 7.5 0 0 1 13 0" />
      </svg>
    )
  }

  if (type === 'shop') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M7 9h10l-1 10H8L7 9Z" />
        <path d="M9.5 9a2.5 2.5 0 0 1 5 0" />
      </svg>
    )
  }

  if (type === 'memory') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M6.5 5.5h8a2 2 0 0 1 2 2v11l-4-2-4 2v-11a2 2 0 0 0-2-2Z" />
        <path d="M6.5 5.5h8" />
      </svg>
    )
  }

  if (type === 'quiz') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M9.25 9a2.75 2.75 0 1 1 4.4 2.2c-.96.72-1.65 1.3-1.65 2.3" />
        <circle cx="12" cy="17.5" r="0.8" fill="currentColor" stroke="none" />
        <path d="M5.5 5.5h13v13h-13Z" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3.5 18.5 6v5.5c0 4.1-2.5 7.1-6.5 9-4-1.9-6.5-4.9-6.5-9V6L12 3.5Z" />
      <path d="M12 9v5" />
      <path d="M9.5 11.5H12" />
    </svg>
  )
}

function GameTopBar({
  authMenuOpen,
  hasAdmin,
  isAdmin,
  loginForm,
  loginMessage,
  onBootstrapChange,
  onCreateAdmin,
  onLogin,
  onLoginChange,
  onOpenAdmin,
  onOpenMemoryVerse,
  onOpenProfileMenu,
  onOpenQuiz,
  onOpenShop,
  onSelectViewedPlayer,
  onSignOut,
  onToggleAuthMenu,
  profile,
  publicPlayers,
  profileMenuOpen,
  setupForm,
  setupMessage,
  authPending,
  navCollapsed,
  onToggleNavCollapsed,
  viewedPlayer,
  viewingShop,
  viewingMemory,
  viewingQuiz,
  viewingAdmin,
}) {
  const adminActionLabel = profile ? 'ADMIN' : hasAdmin ? 'ADMIN SIGN IN' : 'SET UP ADMIN'

  return (
    <MotionHeader
      animate={{ width: navCollapsed ? 96 : 240 }}
      className={`game-header ${navCollapsed ? 'collapsed' : ''}`}
      layout
      transition={RAIL_TRANSITION}
    >
      <div className="rail-header">
        <div className="rail-brand">
          <MotionButton
            aria-label={navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rail-brand-mark"
            onClick={onToggleNavCollapsed}
            type="button"
            whileHover={{ scale: 1.06, rotate: navCollapsed ? -6 : 6 }}
            whileTap={{ scale: 0.96 }}
          >
            <RailIcon type="brand" />
          </MotionButton>
          <AnimatePresence initial={false}>
            {!navCollapsed ? (
              <MotionDiv
                animate={{ opacity: 1, x: 0 }}
                className="rail-brand-copy"
                exit={{ opacity: 0, x: -10 }}
                initial={{ opacity: 0, x: -10 }}
                key="brand-copy"
                transition={POPOVER_TRANSITION}
              >
                <div className="eyebrow">Dashboard</div>
                <strong>AQUARIUM</strong>
              </MotionDiv>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="rail-top">
        <div className="header-menu-wrap">
          <MotionButton
            aria-label="Profile"
            className="rail-button rail-button-secondary"
            layout
            onClick={onOpenProfileMenu}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span aria-hidden="true" className="rail-button-icon">
              <RailIcon type="profile" />
            </span>
            <AnimatePresence initial={false}>
              {!navCollapsed ? (
                <MotionSpan
                  animate={{ opacity: 1, x: 0 }}
                  className="rail-button-label"
                  exit={{ opacity: 0, x: -8 }}
                  initial={{ opacity: 0, x: -8 }}
                  key="profile-label"
                  transition={POPOVER_TRANSITION}
                >
                  PROFILE
                </MotionSpan>
              ) : null}
            </AnimatePresence>
          </MotionButton>
          <AnimatePresence>
            {profileMenuOpen ? (
              <ProfileMenu
                onSelectPlayer={onSelectViewedPlayer}
                players={publicPlayers}
                selectedPlayerId={viewedPlayer?.id ?? ''}
              />
            ) : null}
          </AnimatePresence>
        </div>

          <MotionButton
            aria-label="Shop"
            className={`rail-button rail-button-secondary ${viewingShop ? 'active' : ''}`}
            layout
            onClick={onOpenShop}
            type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <span aria-hidden="true" className="rail-button-icon">
            <RailIcon type="shop" />
          </span>
          <AnimatePresence initial={false}>
            {!navCollapsed ? (
              <MotionSpan
                animate={{ opacity: 1, x: 0 }}
                className="rail-button-label"
                exit={{ opacity: 0, x: -8 }}
                initial={{ opacity: 0, x: -8 }}
                key="shop-label"
                transition={POPOVER_TRANSITION}
              >
                SHOP
              </MotionSpan>
            ) : null}
          </AnimatePresence>
        </MotionButton>
      </div>

      <div className="rail-bottom">
        {isAdmin ? (
          <MotionDiv className="rail-admin-tools" layout>
            <MotionButton
              aria-label="Memory"
              className={`rail-button rail-button-secondary ${viewingMemory ? 'active' : ''}`}
              layout
              onClick={onOpenMemoryVerse}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span aria-hidden="true" className="rail-button-icon">
                <RailIcon type="memory" />
              </span>
              <AnimatePresence initial={false}>
                {!navCollapsed ? (
                  <MotionSpan
                    animate={{ opacity: 1, x: 0 }}
                    className="rail-button-label"
                    exit={{ opacity: 0, x: -8 }}
                    initial={{ opacity: 0, x: -8 }}
                    key="memory-label"
                    transition={POPOVER_TRANSITION}
                  >
                    MEMORY
                  </MotionSpan>
                ) : null}
              </AnimatePresence>
            </MotionButton>
            <MotionButton
              aria-label="Quiz"
              className={`rail-button rail-button-secondary ${viewingQuiz ? 'active' : ''}`}
              layout
              onClick={onOpenQuiz}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span aria-hidden="true" className="rail-button-icon">
                <RailIcon type="quiz" />
              </span>
              <AnimatePresence initial={false}>
                {!navCollapsed ? (
                  <MotionSpan
                    animate={{ opacity: 1, x: 0 }}
                    className="rail-button-label"
                    exit={{ opacity: 0, x: -8 }}
                    initial={{ opacity: 0, x: -8 }}
                    key="quiz-label"
                    transition={POPOVER_TRANSITION}
                  >
                    QUIZ
                  </MotionSpan>
                ) : null}
              </AnimatePresence>
            </MotionButton>
          </MotionDiv>
        ) : null}

        <div className="header-menu-wrap">
          <MotionButton
            aria-label={adminActionLabel}
            className="rail-button rail-button-primary"
            layout
            onClick={onToggleAuthMenu}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span aria-hidden="true" className="rail-button-icon">
              <RailIcon type="admin" />
            </span>
            <AnimatePresence initial={false}>
              {!navCollapsed ? (
                <MotionSpan
                  animate={{ opacity: 1, x: 0 }}
                  className="rail-button-label"
                  exit={{ opacity: 0, x: -8 }}
                  initial={{ opacity: 0, x: -8 }}
                  key="admin-label"
                  transition={POPOVER_TRANSITION}
                >
                  {adminActionLabel}
                </MotionSpan>
              ) : null}
            </AnimatePresence>
          </MotionButton>
          <AnimatePresence>
            {authMenuOpen ? (
              <AuthPopover
                authPending={authPending}
                hasAdmin={hasAdmin}
                isAdmin={isAdmin}
                loginForm={loginForm}
                loginMessage={loginMessage}
                onBootstrapChange={onBootstrapChange}
                onCreateAdmin={onCreateAdmin}
                onLogin={onLogin}
                onLoginChange={onLoginChange}
                onOpenAdmin={onOpenAdmin}
                onSignOut={onSignOut}
                profile={profile}
                setupForm={setupForm}
                setupMessage={setupMessage}
                viewingAdmin={viewingAdmin}
              />
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </MotionHeader>
  )
}

function ShopFishPreview({ item, index }) {
  return (
    <div className="shop-card-preview">
      <span className="shop-card-glow" style={{ '--shop-glow': item.accentColor }} />
      <span className="shop-card-bubble bubble-a" />
      <span className="shop-card-bubble bubble-b" />
      <span className="shop-card-bubble bubble-c" />
      <span className="shop-card-seaweed seaweed-a" />
      <span className="shop-card-seaweed seaweed-b" />
      <motion.div
        animate={{
          rotate: [-3, 2, -3],
          x: ['-10%', '8%', '-10%'],
          y: [0, -7, 0, 5, 0],
        }}
        className="shop-fish-swim"
        transition={{
          duration: 4.8 + index * 0.55,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
      >
        <div
          className="fish-swim shop-card-fish"
          style={{
            '--accent': item.accentColor,
            '--eye': '#1f2c46',
            '--eye-x': 0,
            '--eye-y': 0,
            '--fin': item.finColor,
            '--fish-facing': index % 2 === 0 ? 1 : -1,
            '--fish-scale': 0.96,
            '--fish-tilt': '0deg',
            '--light': item.detailColor,
            '--main': item.bodyColor,
            '--mouth': '#8b3f25',
            '--swim-x': '0px',
            '--swim-y': '0px',
          }}
        >
          <div className="fish-motion">
            <div className="fish-bob">
              <div className="fish-illustration">
                <div className="fish-tail" />
                <div className="fish-fin dorsal" />
                <div className="fish-fin side" />
                <div className="fish-fin belly" />
                <div className="fish-body">
                  <div className="fish-face" />
                  <div className="fish-eye">
                    <span className="fish-pupil">
                      <span className="eye-spark" />
                    </span>
                  </div>
                  <div className="fish-mouth" />
                  <div className="fish-gill" />
                  <div className="fish-highlight" />
                  <div className="fish-stripe stripe-a" />
                  <div className="fish-stripe stripe-b" />
                  <div className="fish-stripe stripe-c" />
                  <div className="fish-scale scale-a" />
                  <div className="fish-scale scale-b" />
                  <div className="fish-scale scale-c" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function ShopPage({
  isAdmin,
  onBuyItem,
  onCategoryChange,
  onPlayerChange,
  pendingItemSlug,
  players,
  selectedCategory,
  selectedPlayer,
  selectedPlayerId,
}) {
  const activeCategory = SHOP_CATEGORIES.find((category) => category.id === selectedCategory) ?? SHOP_CATEGORIES[0]
  const visibleItems = getShopItemsByCategory(activeCategory.id)

    return (
      <section className="panel shop-page-shell">
        <div className="shop-shell">
          <div className="shop-hero">
            <div>
              <div className="eyebrow">Shop</div>
              <h2>Aquarium Shop</h2>
            </div>

          <div className="shop-player-panel">
            {isAdmin ? (
              <>
                <label className="field shop-player-field">
                  <span>Player</span>
                  <select onChange={onPlayerChange} value={selectedPlayerId}>
                    <option value="">Choose a player</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.display_name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={`shop-player-gold ${selectedPlayer ? 'ready' : ''}`}>
                  <span>{selectedPlayer ? selectedPlayer.display_name : 'Player'}</span>
                  <strong>
                    <i aria-hidden="true">●</i>
                    {selectedPlayer ? `${selectedPlayer.gold} gold` : 'Pick a player'}
                  </strong>
                </div>
              </>
            ) : (
              <div className="shop-player-view-note">
                <strong>Admin only</strong>
              </div>
            )}
          </div>
        </div>

        <div className="shop-category-row">
          {SHOP_CATEGORIES.map((category) => (
            <button
              className={`shop-category-chip ${selectedCategory === category.id ? 'active' : ''}`}
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              type="button"
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="shop-category-copy">
          <strong>{activeCategory.label}</strong>
        </div>

        {visibleItems.length ? (
          <div className="shop-card-grid">
            {visibleItems.map((item, index) => {
              const needsMoreGold = selectedPlayer ? selectedPlayer.gold < item.price : false

              return (
                <MotionDiv
                  animate={{ opacity: 1, y: 0 }}
                  className="shop-item-card"
                  initial={{ opacity: 0, y: 14 }}
                  key={item.slug}
                  transition={{ delay: index * 0.05, duration: 0.24, ease: 'easeOut' }}
                  whileHover={{ y: -4 }}
                >
                  <ShopFishPreview index={index} item={item} />

                  <div className="shop-item-copy">
                    <div className="shop-item-heading">
                      <strong>{item.name}</strong>
                    </div>

                    <div className="shop-item-footer">
                      <div className="shop-item-price">
                        <span>Price</span>
                        <strong>{item.price} gold</strong>
                      </div>
                      <button
                        className={`primary-button compact-button ${needsMoreGold ? 'warning' : ''}`}
                        disabled={!isAdmin || Boolean(pendingItemSlug)}
                        onClick={isAdmin ? () => onBuyItem(item) : undefined}
                        type="button"
                      >
                        {!isAdmin ? 'Admin only' : pendingItemSlug === item.slug ? 'Buying...' : 'Buy'}
                      </button>
                    </div>
                  </div>
                </MotionDiv>
              )
            })}
          </div>
        ) : (
          <div className="shop-coming-grid">
            {Array.from({ length: 3 }, (_unused, index) => (
              <div className="shop-coming-card" key={`${activeCategory.id}-${index}`}>
                <div className="eyebrow">Coming Soon</div>
                <strong>{activeCategory.label} slot {index + 1}</strong>
                <p className="panel-note">This part of the shop is still being prepared.</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function MemoryVersePage({
  activeMemoryVerse,
  awardPendingPlayerId,
  isAdmin,
  isMemoryFullscreen,
  memoryControlsOpen,
  memoryFontScale,
  memoryRewardsOpen,
  memoryVerseEditorOpen,
  memoryVerseForm,
  memoryVerseResult,
  onAwardPlayer,
  onCoverAll,
  onCoverNext,
  onCloseMemoryRewards,
  onDecreaseMemoryFont,
  onIncreaseMemoryFont,
  onOpenMemoryRewards,
  onMemoryVerseChange,
  onRedoCover,
  onResetCover,
  onRunMemoryVerse,
  onShowMemoryVerseEditor,
  onToggleMemoryControls,
  onToggleMemoryFullscreen,
  onUndoCover,
  players,
  playersLoading,
  playersMessage,
  verseAwardResult,
}) {
  const tokens = useMemo(() => buildMemoryVerseTokens(activeMemoryVerse.text), [activeMemoryVerse.text])
  const totalWords = useMemo(() => getMemoryVerseWordCount(activeMemoryVerse.text), [activeMemoryVerse.text])
  const coveredWordIndexes = useMemo(
    () => getCoveredWordIndexes(activeMemoryVerse, totalWords),
    [activeMemoryVerse, totalWords],
  )
  const coveredWords = useMemo(() => new Set(coveredWordIndexes), [coveredWordIndexes])
  const coveredCount = coveredWordIndexes.length
  const hasVerse = Boolean(activeMemoryVerse.reference || activeMemoryVerse.text)

  return (
    <section className="panel memory-verse-shell memory-page-shell">
      {hasVerse ? (
        <button
          aria-label={memoryControlsOpen ? 'Hide memory controls' : 'Show memory controls'}
          className="memory-control-tab"
          onClick={onToggleMemoryControls}
          type="button"
        >
          {memoryControlsOpen ? '<' : '>'}
        </button>
      ) : null}

      {hasVerse && memoryControlsOpen ? (
        <aside className="panel memory-controls-drawer">
          <div className="memory-drawer-heading">
            <div>
              <div className="eyebrow">Memory Controls</div>
              <strong>{coveredCount}/{totalWords || 0} covered</strong>
            </div>
            <button className="ghost-button compact-button" onClick={onToggleMemoryControls} type="button">
              Hide
            </button>
          </div>

          <div className="memory-helper-controls">
            <button className="ghost-button compact-button" onClick={onCoverNext} type="button">
              Cover next
            </button>
            <button className="ghost-button compact-button" onClick={onUndoCover} type="button">
              &lt; Undo
            </button>
            <button className="ghost-button compact-button" onClick={onRedoCover} type="button">
              Redo &gt;
            </button>
            <button className="ghost-button compact-button" onClick={onResetCover} type="button">
              Reset
            </button>
            <button className="ghost-button compact-button" onClick={onCoverAll} type="button">
              Cover all
            </button>
          </div>

          <div className="memory-text-controls">
            <span className="memory-text-size-label">Text size</span>
            <button className="ghost-button compact-button" onClick={onDecreaseMemoryFont} type="button">
              A-
            </button>
            <button className="ghost-button compact-button" onClick={onIncreaseMemoryFont} type="button">
              A+
            </button>
          </div>

          {isAdmin ? (
            <div className="memory-drawer-actions">
              {!memoryVerseEditorOpen ? (
                <button className="ghost-button compact-button" onClick={onShowMemoryVerseEditor} type="button">
                  Edit verse
                </button>
              ) : null}
              <button className="ghost-button compact-button" onClick={onToggleMemoryFullscreen} type="button">
                {isMemoryFullscreen ? 'Exit full screen' : 'Full screen'}
              </button>
              <button className="primary-button compact-button" onClick={onOpenMemoryRewards} type="button">
                Add rewards
              </button>
            </div>
          ) : null}
        </aside>
      ) : null}

      <div className="memory-verse-main">
        <div className={`memory-verse-grid ${memoryVerseEditorOpen || !hasVerse ? '' : 'presentation-mode'}`}>
          {memoryVerseEditorOpen || !hasVerse ? (
            <form className="workspace-card stack-form" onSubmit={onRunMemoryVerse}>
              <label className="field">
                <span>Book / verse title</span>
                <input
                  name="reference"
                  onChange={onMemoryVerseChange}
                  placeholder="John 3:16"
                  value={memoryVerseForm.reference}
                />
              </label>

              <label className="field">
                <span>Verse text</span>
                <textarea
                  name="text"
                  onChange={onMemoryVerseChange}
                  placeholder="For God so loved the world..."
                  rows={6}
                  value={memoryVerseForm.text}
                />
              </label>

              {memoryVerseResult.text ? (
                <p className={`status-line ${memoryVerseResult.type}`}>{memoryVerseResult.text}</p>
              ) : null}

              <button className="primary-button" type="submit">
                Run helper
              </button>
            </form>
          ) : null}

          <div className="workspace-card memory-helper-card memory-helper-card-large">
            {hasVerse ? (
              <>
                <div className="memory-verse-display">
                  <div className="memory-verse-title">
                    <div className="eyebrow">Active Verse</div>
                    <h3>{activeMemoryVerse.reference || 'Memory verse'}</h3>
                  </div>

                  <div className="memory-verse-text" style={{ fontSize: `${memoryFontScale}rem` }}>
                    {tokens.map((token) =>
                      token.isWord ? (
                        <span
                          className={`memory-token ${coveredWords.has(token.wordIndex) ? 'hidden' : ''}`}
                          key={token.id}
                        >
                          {token.text}
                        </span>
                      ) : (
                        <span className="memory-token space" key={token.id}>
                          {token.text}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state-card">
                <h3>No verse running yet</h3>
                <p className="panel-note">Paste a verse on the left and click `Run helper` to start covering words.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {memoryRewardsOpen ? (
        <div className="memory-dialog-backdrop">
          <div className="panel memory-dialog">
            <div className="memory-dialog-header">
              <div>
                <div className="eyebrow">Verse Rewards</div>
                <h3>Give 50 gold</h3>
              </div>
              <button className="ghost-button compact-button" onClick={onCloseMemoryRewards} type="button">
                Close
              </button>
            </div>

            <p className="panel-copy">When a player recites the verse, tap their button to reward them.</p>

            {!isAdmin ? (
              <p className="panel-note">Sign in as admin to give the 50 gold reward.</p>
            ) : playersLoading ? (
              <p className="panel-note">Loading players...</p>
            ) : players.length ? (
              <div className="memory-player-rewards">
                {players.map((player) => (
                  <div className="memory-player-row" key={player.id}>
                    <div>
                      <strong>{player.display_name}</strong>
                      <span>{player.gold} gold</span>
                    </div>
                    <button
                      className="primary-button compact-button"
                      disabled={awardPendingPlayerId === player.id}
                      onClick={() => onAwardPlayer(player.id)}
                      type="button"
                    >
                      {awardPendingPlayerId === player.id ? 'Adding...' : '+50 gold'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="panel-note">Create player accounts first so you can reward them here.</p>
            )}

            {playersMessage.text ? <p className={`status-line ${playersMessage.type}`}>{playersMessage.text}</p> : null}
            {verseAwardResult.text ? <p className={`status-line ${verseAwardResult.type}`}>{verseAwardResult.text}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function QuizPage({
  activeMemoryVerse,
  isQuizFullscreen,
  isAdmin,
  onAwardPlayer,
  onBackToQuizEditor,
  onCloseQuizRewards,
  onDecreaseQuizFont,
  onIncreaseQuizFont,
  onNextQuizQuestion,
  onOpenQuizRewards,
  onPreviousQuizQuestion,
  onQuizAwardChange,
  onQuizDraftChange,
  onQuizQuestionChange,
  onCloseQuizPreview,
  onOrganizeQuizDraft,
  onOpenQuizPreview,
  onStartQuiz,
  onToggleQuizFullscreen,
  players,
  playersLoading,
  playersMessage,
  quizAwardScores,
  quizAwardPendingPlayerId,
  quizAwardResult,
  quizCurrentIndex,
  quizDraftResult,
  quizDraftText,
  quizFontScale,
  quizPreviewOpen,
  quizQuestions,
  quizRewardsOpen,
}) {
  const memoryVerseDetails = useMemo(() => buildMemoryVerseQuizDetails(activeMemoryVerse), [activeMemoryVerse])
  const quizItems = useMemo(
    () => [
      ...quizQuestions,
      {
        id: 'memory-verse-fill-blanks',
        isMemoryVerse: true,
        points: String(MEMORY_VERSE_QUIZ_POINTS),
        prompt: memoryVerseDetails.prompt || 'Set the memory verse first, then blanks 6 to 10 will appear here.',
      },
    ],
    [memoryVerseDetails.prompt, quizQuestions],
  )
  const answerKey = useMemo(
    () => [
      ...quizQuestions.map((question, index) => {
        const correctChoiceIndex = Number(question.correctChoiceIndex) || 0

        return {
          answer: question.choices[correctChoiceIndex] || `Choice ${correctChoiceIndex + 1}`,
          label: `Question ${index + 1}`,
          marker: getChoiceLabel(correctChoiceIndex),
        }
      }),
      ...memoryVerseDetails.answers.map((item) => ({
        answer: item.answer,
        label: `Blank ${item.number}`,
        marker: String(item.number),
      })),
    ],
    [memoryVerseDetails.answers, quizQuestions],
  )
  const activeQuestion =
    quizCurrentIndex >= 0 && quizCurrentIndex < quizItems.length ? quizItems[quizCurrentIndex] : null
  const quizStarted = quizCurrentIndex >= 0
  const isLastQuestion = quizStarted && quizCurrentIndex === quizItems.length - 1

  return (
    <section className="panel memory-verse-shell memory-page-shell quiz-page-shell">
      <div className="memory-verse-main">
        {!quizStarted && !quizRewardsOpen ? (
          <div className="workspace-card quiz-setup-panel">
            <div className="card-heading">
              <h3>Quiz setup</h3>
              <button className="primary-button compact-button" onClick={onStartQuiz} type="button">
                Start
              </button>
            </div>

            <div className="quiz-budget-card">
              <strong>5 questions at {GOLD_PER_QUIZ_POINT} gold each</strong>
              <span>Memory verse fill in the blanks is last and worth {MEMORY_VERSE_QUIZ_POINTS * GOLD_PER_QUIZ_POINT} gold.</span>
            </div>

            <div className="quiz-import-card quiz-organizer-panel">
              <div>
                <div className="eyebrow">Organizer</div>
                <h3>Paste and organize</h3>
              </div>

              <label className="field">
                <span>Paste quiz text</span>
                <textarea
                  name="quizDraftText"
                  onChange={onQuizDraftChange}
                  placeholder={`1.What is 9 x 8? Answer: A\nA. 72\nB. 81\nC. 64\nD. 70`}
                  rows={7}
                  value={quizDraftText}
                />
              </label>
              <div className="quiz-import-actions">
                <p className="panel-note">Use your format: 1.Question? Answer: A, then A-D choices below. I will organize them into the 5 slots.</p>
                <button className="primary-button compact-button" onClick={onOrganizeQuizDraft} type="button">
                  Organize pasted quiz
                </button>
                <button className="ghost-button compact-button" onClick={onOpenQuizPreview} type="button">
                  Show preview
                </button>
              </div>
              {quizDraftResult.text ? <p className={`status-line ${quizDraftResult.type}`}>{quizDraftResult.text}</p> : null}
            </div>

            <div className="quiz-editor-panel">
              <div className="quiz-editor-panel-heading">
                <div>
                  <div className="eyebrow">Editor</div>
                  <h3>Final quiz slots</h3>
                </div>
                <button className="ghost-button compact-button" onClick={onOpenQuizPreview} type="button">
                  Show preview
                </button>
              </div>

              <div className="quiz-question-list quiz-fixed-question-list">
                {quizQuestions.map((question, index) => (
                  <div className="quiz-question-card" key={question.id}>
                    <div className="quiz-question-card-top">
                      <strong>Question {index + 1} ({GOLD_PER_QUIZ_POINT} gold)</strong>
                    </div>

                    <label className="field">
                      <span>Question text</span>
                      <textarea
                        name="prompt"
                        onChange={(event) => onQuizQuestionChange(question.id, 'prompt', event.target.value)}
                        rows={3}
                        value={question.prompt}
                      />
                    </label>

                    <div className="quiz-choice-grid">
                      {question.choices.map((choice, choiceIndex) => (
                        <label className="field" key={`${question.id}-choice-${choiceIndex + 1}`}>
                          <span>Choice {choiceIndex + 1}</span>
                          <input
                            name={`choice-${choiceIndex + 1}`}
                            onChange={(event) => onQuizQuestionChange(question.id, `choice-${choiceIndex}`, event.target.value)}
                            value={choice}
                          />
                        </label>
                      ))}
                    </div>

                    <label className="field quiz-answer-picker">
                      <span>Correct answer</span>
                      <select
                        name="correctChoiceIndex"
                        onChange={(event) => onQuizQuestionChange(question.id, 'correctChoiceIndex', event.target.value)}
                        value={question.correctChoiceIndex}
                      >
                        {question.choices.map((_choice, choiceIndex) => (
                          <option key={`${question.id}-answer-${choiceIndex}`} value={String(choiceIndex)}>
                            {getChoiceLabel(choiceIndex)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {quizStarted && !quizRewardsOpen ? (
          <div className="memory-verse-grid presentation-mode">
            <div className="workspace-card memory-helper-card memory-helper-card-large">
              <div className="memory-verse-display quiz-display-card">
                {activeQuestion ? (
                  <div className="quiz-display-content" style={{ '--quiz-font-scale': quizFontScale }}>
                    <div className="quiz-display-label">
                      {activeQuestion.isMemoryVerse ? 'Memory Verse' : `Question ${quizCurrentIndex + 1}`} (
                      {getQuizQuestionGold(activeQuestion)} gold)
                    </div>
                    <div className="quiz-display-question">{activeQuestion.prompt || 'Add the question text in controls.'}</div>
                    {!activeQuestion.isMemoryVerse ? (
                      <div className="quiz-display-choices">
                        {activeQuestion.choices.map((choice, choiceIndex) => (
                          <div className="quiz-display-choice" key={`${activeQuestion.id}-display-choice-${choiceIndex + 1}`}>
                            <strong>{String.fromCharCode(65 + choiceIndex)}.</strong>
                            <span>{choice || `Choice ${choiceIndex + 1}`}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="empty-state-card">
                    <h3>Ready</h3>
                    <p className="panel-note">Click Start to begin.</p>
                  </div>
                )}
              </div>

              <div className="quiz-presentation-controls">
                <button className="ghost-button compact-button" onClick={onBackToQuizEditor} type="button">
                  Back to quiz editor
                </button>
                <button className="ghost-button compact-button" onClick={onPreviousQuizQuestion} type="button">
                  Back
                </button>
                {isLastQuestion ? (
                  <button className="primary-button compact-button" onClick={onOpenQuizRewards} type="button">
                    Proceed to rewards
                  </button>
                ) : (
                  <button className="primary-button compact-button" onClick={onNextQuizQuestion} type="button">
                    Next
                  </button>
                )}
                <button className="ghost-button compact-button" onClick={onDecreaseQuizFont} type="button">
                  A-
                </button>
                <button className="ghost-button compact-button" onClick={onIncreaseQuizFont} type="button">
                  A+
                </button>
                <button className="ghost-button compact-button" onClick={onToggleQuizFullscreen} type="button">
                  {isQuizFullscreen ? 'Exit full screen' : 'Full screen'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {quizRewardsOpen ? (
          <div className="workspace-card quiz-rewards-panel">
            <div className="card-heading">
              <h3>Quiz rewards</h3>
              <div className="quiz-heading-actions">
                <button className="ghost-button compact-button" onClick={onBackToQuizEditor} type="button">
                  Back to quiz editor
                </button>
                <button className="ghost-button compact-button" onClick={onCloseQuizRewards} type="button">
                  Back to quiz
                </button>
              </div>
            </div>

            <div className="quiz-answer-key">
              <div className="eyebrow">Correct Answers</div>
              {answerKey.length ? (
                <div className="quiz-answer-grid">
                  {answerKey.map((item) => (
                    <div className="quiz-answer-row" key={`${item.label}-${item.marker}`}>
                      <strong>{item.label}</strong>
                      <span>
                        {item.marker}. {item.answer}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="panel-note">The answer key will appear after you set the quiz answers.</p>
              )}
            </div>

            {!isAdmin ? (
              <p className="panel-note">Only the admin can award quiz gold.</p>
            ) : playersLoading ? (
              <p className="panel-note">Loading players...</p>
            ) : players.length ? (
              <div className="quiz-reward-list">
                {players.map((player) => {
                  const score = quizAwardScores[player.id] || ''
                  const gold = getQuizAwardGold(score)

                  return (
                    <div className="quiz-reward-row" key={player.id}>
                      <div>
                        <strong>{player.display_name}</strong>
                        <span>{player.gold} gold</span>
                      </div>
                      <label className="field quiz-reward-score-field">
                        <span>Score</span>
                        <input
                          inputMode="numeric"
                          onChange={(event) => onQuizAwardChange(player.id, event.target.value)}
                          value={score}
                        />
                      </label>
                      <div className="quiz-reward-gold-preview">
                        <span>Gold</span>
                        <strong>{gold}</strong>
                      </div>
                    </div>
                  )
                })}
                <button
                  className="primary-button quiz-award-all-button"
                  disabled={Boolean(quizAwardPendingPlayerId)}
                  onClick={onAwardPlayer}
                  type="button"
                >
                  {quizAwardPendingPlayerId ? 'Adding gold...' : 'Add gold to scored players'}
                </button>
              </div>
            ) : (
              <p className="panel-note">Create player accounts first.</p>
            )}

            {playersMessage.text ? <p className={`status-line ${playersMessage.type}`}>{playersMessage.text}</p> : null}
            {quizAwardResult.text ? <p className={`status-line ${quizAwardResult.type}`}>{quizAwardResult.text}</p> : null}
          </div>
        ) : null}
      </div>

      {quizPreviewOpen ? (
        <div className="memory-dialog-backdrop">
          <div className="panel memory-dialog quiz-preview-dialog">
            <div className="memory-dialog-header">
              <div>
                <div className="eyebrow">Quiz Preview</div>
                <h3>Organized questions</h3>
              </div>
              <button className="ghost-button compact-button" onClick={onCloseQuizPreview} type="button">
                Close
              </button>
            </div>

            <div className="quiz-preview-list">
              {quizQuestions.map((question, index) => {
                const correctChoiceIndex = Number(question.correctChoiceIndex) || 0

                return (
                  <div className="quiz-preview-card" key={`quiz-preview-${question.id}`}>
                    <div className="quiz-question-card-top">
                      <strong>Question {index + 1}</strong>
                      <span>{getChoiceLabel(correctChoiceIndex)} correct</span>
                    </div>
                    <p>{question.prompt || 'No question text yet.'}</p>
                    <div className="quiz-preview-choice-list">
                      {question.choices.map((choice, choiceIndex) => (
                        <div
                          className={`quiz-preview-choice ${correctChoiceIndex === choiceIndex ? 'correct' : ''}`}
                          key={`${question.id}-preview-choice-${choiceIndex}`}
                        >
                          <strong>{getChoiceLabel(choiceIndex)}.</strong>
                          <span>{choice || `Choice ${choiceIndex + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default function AdminApp() {
  const [pathname, setPathname] = useState(() => window.location.pathname || '/')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [hasAdmin, setHasAdmin] = useState(false)
  const [authPending, setAuthPending] = useState(false)
  const [createPlayerPending, setCreatePlayerPending] = useState(false)
  const [playersLoading, setPlayersLoading] = useState(false)
  const [goldPending, setGoldPending] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [players, setPlayers] = useState([])
  const [publicPlayers, setPublicPlayers] = useState([])
  const [aquariumFish, setAquariumFish] = useState([])
  const [adminSection, setAdminSection] = useState(ADMIN_SECTIONS.createPlayer)
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [viewedPlayerId, setViewedPlayerId] = useState('')
  const [shopPlayerId, setShopPlayerId] = useState('')
  const [shopCategory, setShopCategory] = useState(() => SHOP_CATEGORIES[0]?.id ?? 'fish')
  const [shopPendingSlug, setShopPendingSlug] = useState('')
  const [shopNotice, setShopNotice] = useState(createEmptyMessage)
  const [activePlayerHudCollapsed, setActivePlayerHudCollapsed] = useState(false)
  const [authMenuOpen, setAuthMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [loginMessage, setLoginMessage] = useState(createEmptyMessage)
  const [setupMessage, setSetupMessage] = useState(createEmptyMessage)
  const [createPlayerResult, setCreatePlayerResult] = useState(createEmptyMessage)
  const [memoryVerseResult, setMemoryVerseResult] = useState(createEmptyMessage)
  const [playersMessage, setPlayersMessage] = useState(createEmptyMessage)
  const [goldResult, setGoldResult] = useState(createEmptyMessage)
  const [deleteResult, setDeleteResult] = useState(createEmptyMessage)
  const [verseAwardResult, setVerseAwardResult] = useState(createEmptyMessage)
  const [quizAwardResult, setQuizAwardResult] = useState(createEmptyMessage)
  const [quizDraftResult, setQuizDraftResult] = useState(createEmptyMessage)
  const [awardPendingPlayerId, setAwardPendingPlayerId] = useState('')
  const [quizAwardPendingPlayerId, setQuizAwardPendingPlayerId] = useState('')
  const [loginForm, setLoginForm] = useState({
    loginName: '',
    password: '',
  })
  const [setupForm, setSetupForm] = useState({
    displayName: '',
    loginName: '',
    password: '',
    confirmPassword: '',
  })
  const [createPlayerForm, setCreatePlayerForm] = useState({
    displayName: '',
    startingGold: '250',
  })
  const [memoryVerseForm, setMemoryVerseForm] = useState(createEmptyMemoryVerseForm)
  const [activeMemoryVerse, setActiveMemoryVerse] = useState(createEmptyActiveMemoryVerse)
  const [memoryVerseEditorOpen, setMemoryVerseEditorOpen] = useState(true)
  const [memoryRewardsOpen, setMemoryRewardsOpen] = useState(false)
  const [memoryControlsOpen, setMemoryControlsOpen] = useState(true)
  const [memoryFontScale, setMemoryFontScale] = useState(1.6)
  const [isMemoryFullscreen, setIsMemoryFullscreen] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState(() => createFixedQuizQuestions())
  const [quizCurrentIndex, setQuizCurrentIndex] = useState(-1)
  const [quizAwardScores, setQuizAwardScores] = useState(createEmptyQuizAwardScores)
  const [quizRewardsOpen, setQuizRewardsOpen] = useState(false)
  const [quizDraftText, setQuizDraftText] = useState('')
  const [quizPreviewOpen, setQuizPreviewOpen] = useState(false)
  const [quizFontScale, setQuizFontScale] = useState(1.8)
  const [isQuizFullscreen, setIsQuizFullscreen] = useState(false)
  const [goldForm, setGoldForm] = useState({
    amount: '',
  })
  const sessionUserId = session?.user?.id ?? ''

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname || '/')
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    try {
      const savedValue = window.localStorage.getItem(MEMORY_VERSE_STORAGE_KEY)

      if (!savedValue) {
        return
      }

      const parsed = JSON.parse(savedValue)
      setMemoryVerseForm(parsed.form || createEmptyMemoryVerseForm())
      setActiveMemoryVerse(parsed.active || createEmptyActiveMemoryVerse())
      setMemoryVerseEditorOpen(!(parsed.active?.reference || parsed.active?.text))
    } catch {
      setMemoryVerseForm(createEmptyMemoryVerseForm())
      setActiveMemoryVerse(createEmptyActiveMemoryVerse())
      setMemoryVerseEditorOpen(true)
    }
  }, [])

  useEffect(() => {
    try {
      const savedValue = window.localStorage.getItem(QUIZ_STORAGE_KEY)

      if (!savedValue) {
        return
      }

      const parsed = JSON.parse(savedValue)
      setQuizQuestions(createFixedQuizQuestions(parsed.questions || []))
      setQuizCurrentIndex(typeof parsed.currentIndex === 'number' ? parsed.currentIndex : -1)
      setQuizAwardScores(parsed.awardScores || createEmptyQuizAwardScores())
    } catch {
      setQuizQuestions(createFixedQuizQuestions())
      setQuizCurrentIndex(-1)
      setQuizAwardScores(createEmptyQuizAwardScores())
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      MEMORY_VERSE_STORAGE_KEY,
      JSON.stringify({
        form: memoryVerseForm,
        active: activeMemoryVerse,
      }),
    )
  }, [activeMemoryVerse, memoryVerseForm])

  useEffect(() => {
    window.localStorage.setItem(
      QUIZ_STORAGE_KEY,
      JSON.stringify({
        questions: quizQuestions,
        currentIndex: quizCurrentIndex,
        awardScores: quizAwardScores,
      }),
    )
  }, [quizAwardScores, quizCurrentIndex, quizQuestions])

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement)
      setIsMemoryFullscreen(isFullscreen && window.location.pathname === MEMORY_PATH)
      setIsQuizFullscreen(isFullscreen && window.location.pathname === QUIZ_PATH)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    if (!hasSupabaseEnv || !supabase) {
      setAuthLoading(false)
      return undefined
    }

    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session ?? null)
        setAuthLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null)
      setAuthLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!hasSupabaseEnv) {
      return
    }

    let cancelled = false

    const loadAdminStatus = async () => {
      try {
        const response = await fetch('/api/admin-status')
        const data = await readJson(response)

        if (cancelled) {
          return
        }

        if (!response.ok) {
          throw new Error(data.error || 'Unable to check admin status.')
        }

        setHasAdmin(Boolean(data.hasAdmin))
      } catch (error) {
        if (!cancelled) {
          setSetupMessage({
            type: 'error',
            text: error.message,
          })
        }
      }
    }

    loadAdminStatus()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!sessionUserId || !supabase) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    let cancelled = false

    const loadProfile = async () => {
      setProfileLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, gold, login_name, role')
        .eq('id', sessionUserId)
        .single()

      if (cancelled) {
        return
      }

      if (error) {
        setProfile(null)
        setProfileLoading(false)
        setLoginMessage({
          type: 'error',
          text: error.message,
        })
        return
      }

      setProfile(data)
      setProfileLoading(false)
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [sessionUserId])

  const isAdmin = useMemo(() => isAdminProfile(profile), [profile])
  const viewingAdmin = pathname === ADMIN_PATH
  const viewingMemory = pathname === MEMORY_PATH
  const viewingQuiz = pathname === QUIZ_PATH
  const viewingShop = pathname === SHOP_PATH
  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  )
  const shopPlayer = useMemo(
    () => publicPlayers.find((player) => player.id === shopPlayerId) ?? null,
    [publicPlayers, shopPlayerId],
  )
  const viewedPlayer = useMemo(() => {
    const currentPlayer = publicPlayers.find((player) => player.id === viewedPlayerId) ?? null
    return mergeViewedPlayer(currentPlayer, profile)
  }, [profile, publicPlayers, viewedPlayerId])

  const navigate = (nextPath) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }

    setPathname(nextPath)
  }

  const applySession = async (nextSession) => {
    if (!supabase) {
      return
    }

    await supabase.auth.setSession({
      access_token: nextSession.access_token,
      refresh_token: nextSession.refresh_token,
    })
  }

  const loadPublicPlayers = useCallback(
    async ({ preferredPlayerId = '', preserveSelection = true } = {}) => {
      if (!hasSupabaseEnv) {
        setPublicPlayers([])
        setViewedPlayerId('')
        return
      }

      try {
        const response = await fetch('/api/public-players')
        const data = await readJson(response)

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load player profiles.')
        }

        const nextPlayers = data.players ?? []
        setPublicPlayers(nextPlayers)

        const preferredId = preferredPlayerId || (preserveSelection ? viewedPlayerId : '')
        const hasPreferred = nextPlayers.some((player) => player.id === preferredId)

        if (hasPreferred) {
          setViewedPlayerId(preferredId)
        } else {
          setViewedPlayerId('')
        }
      } catch (error) {
        setPlayersMessage({
          type: 'error',
          text: error.message,
        })
      }
    },
    [viewedPlayerId],
  )

  useEffect(() => {
    loadPublicPlayers()
  }, [loadPublicPlayers])

  useEffect(() => {
    if (profile?.role !== 'player') {
      return
    }

    if (publicPlayers.some((player) => player.id === profile.id)) {
      setViewedPlayerId(profile.id)
    }
  }, [profile, publicPlayers])

  useEffect(() => {
    if (!publicPlayers.length) {
      setShopPlayerId('')
      return
    }

    if (!publicPlayers.some((player) => player.id === shopPlayerId)) {
      setShopPlayerId('')
    }
  }, [publicPlayers, shopPlayerId])

  useEffect(() => {
    if (!shopNotice.text) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setShopNotice(createEmptyMessage())
    }, SHOP_NOTICE_DURATION)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [shopNotice])

  const loadPlayers = useCallback(
    async ({ preserveSelection = true, preferredPlayerId = '' } = {}) => {
      if (!session?.access_token) {
        return
      }

      setPlayersLoading(true)
      setPlayersMessage(createEmptyMessage())

      try {
        const response = await fetch('/api/admin-players', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        const data = await readJson(response)

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load players.')
        }

        const nextPlayers = data.players ?? []
        setPlayers(nextPlayers)

        const preferredId = preferredPlayerId || (preserveSelection ? selectedPlayerId : '')
        const playerExists = nextPlayers.some((player) => player.id === preferredId)

        if (playerExists) {
          setSelectedPlayerId(preferredId)
        } else if (nextPlayers.length) {
          setSelectedPlayerId(nextPlayers[0].id)
        } else {
          setSelectedPlayerId('')
        }
      } catch (error) {
        setPlayersMessage({
          type: 'error',
          text: error.message,
        })
      } finally {
        setPlayersLoading(false)
      }
    },
    [selectedPlayerId, session?.access_token],
  )

  const loadViewedPlayerAquarium = useCallback(async (playerId) => {
    if (!playerId) {
      setAquariumFish([])
      return
    }

    try {
      const response = await fetch(`/api/public-player-aquarium?playerId=${encodeURIComponent(playerId)}`)
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load aquarium items.')
      }

      setAquariumFish(data.fish ?? [])
    } catch {
      setAquariumFish([])
    }
  }, [])

  useEffect(() => {
    if ((!viewingAdmin && !viewingMemory && !viewingQuiz) || !isAdmin || !session?.access_token) {
      return
    }

    loadPlayers()
  }, [viewingAdmin, viewingMemory, viewingQuiz, isAdmin, session?.access_token, loadPlayers])

  useEffect(() => {
    loadViewedPlayerAquarium(viewedPlayerId)
  }, [loadViewedPlayerAquarium, viewedPlayerId])

  const handleToggleAuthMenu = () => {
    setAuthMenuOpen((current) => !current)
    setProfileMenuOpen(false)
  }

  const handleOpenProfileMenu = () => {
    setProfileMenuOpen((current) => !current)
    setAuthMenuOpen(false)
  }

  const handleToggleNavCollapsed = () => {
    setNavCollapsed((current) => !current)
    setAuthMenuOpen(false)
    setProfileMenuOpen(false)
  }

  const handleLoginChange = (event) => {
    const { name, value } = event.target
    setLoginForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleBootstrapChange = (event) => {
    const { name, value } = event.target
    setSetupForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleCreatePlayerChange = (event) => {
    const { name, value } = event.target
    setCreatePlayerForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleMemoryVerseChange = (event) => {
    const { name, value } = event.target
    setMemoryVerseForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleQuizAwardChange = (playerId, value) => {
    setQuizAwardScores((current) => ({
      ...current,
      [playerId]: value,
    }))
  }

  const handleQuizDraftChange = (event) => {
    setQuizDraftText(event.target.value)
    setQuizDraftResult(createEmptyMessage())
  }

  const handleGoldFormChange = (event) => {
    const { name, value } = event.target
    setGoldForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoginMessage(createEmptyMessage())
    setSetupMessage(createEmptyMessage())
    setAuthPending(true)

    try {
      const response = await fetch('/api/login-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginName: normalizeLoginName(loginForm.loginName),
          password: loginForm.password,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to sign in.')
      }

      await applySession(data.session)
      setLoginForm({
        loginName: '',
        password: '',
      })
      setAuthMenuOpen(false)
      setProfileMenuOpen(false)
      setLoginMessage(createEmptyMessage())
    } catch (error) {
      setLoginMessage({
        type: 'error',
        text: error.message,
      })
    } finally {
      setAuthPending(false)
    }
  }

  const handleCreateAdmin = async (event) => {
    event.preventDefault()
    setSetupMessage(createEmptyMessage())
    setAuthPending(true)

    try {
      if (setupForm.password.length < 6) {
        throw new Error('Choose a password with at least 6 characters.')
      }

      if (setupForm.password !== setupForm.confirmPassword) {
        throw new Error('The password confirmation does not match.')
      }

      const response = await fetch('/api/bootstrap-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: setupForm.displayName,
          loginName: normalizeLoginName(setupForm.loginName),
          password: setupForm.password,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to create the admin account.')
      }

      await applySession(data.session)
      setHasAdmin(true)
      setSetupForm({
        displayName: '',
        loginName: '',
        password: '',
        confirmPassword: '',
      })
      setAuthMenuOpen(false)
      navigate(ADMIN_PATH)
    } catch (error) {
      setSetupMessage({
        type: 'error',
        text: error.message,
      })
    } finally {
      setAuthPending(false)
    }
  }

  const handleCreatePlayer = async (event) => {
    event.preventDefault()
    setCreatePlayerResult(createEmptyMessage())
    setCreatePlayerPending(true)

    try {
      const startingGold = Number(createPlayerForm.startingGold)

      if (!session?.access_token) {
        throw new Error('Your admin session is missing. Please log in again.')
      }

      if (!Number.isInteger(startingGold) || startingGold < 0) {
        throw new Error('Starting gold must be a whole number that is zero or higher.')
      }

      const response = await fetch('/api/create-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          displayName: createPlayerForm.displayName,
          startingGold,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to create the player account.')
      }

      setCreatePlayerForm({
        displayName: '',
        startingGold: String(startingGold),
      })
      setCreatePlayerResult({
        type: 'success',
        text: `Player "${data.player.displayName}" created.`,
      })
      setDeleteResult(createEmptyMessage())
      await loadPlayers({
        preserveSelection: false,
        preferredPlayerId: data.player.id,
      })
      await loadPublicPlayers({
        preserveSelection: false,
        preferredPlayerId: data.player.id,
      })
      setAdminSection(ADMIN_SECTIONS.manageGold)
    } catch (error) {
      setCreatePlayerResult({
        type: 'error',
        text: error.message,
      })
    } finally {
      setCreatePlayerPending(false)
    }
  }

  const handleAdjustGold = async (event) => {
    event.preventDefault()
    setGoldResult(createEmptyMessage())
    setGoldPending(true)

    try {
      const amount = Number(goldForm.amount)

      if (!session?.access_token) {
        throw new Error('Your admin session is missing. Please log in again.')
      }

      if (!selectedPlayerId) {
        throw new Error('Select a player first.')
      }

      if (!Number.isInteger(amount) || amount === 0) {
        throw new Error('Enter a whole number that is not zero.')
      }

      const response = await fetch('/api/adjust-player-gold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          amount,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to update player gold.')
      }

      setGoldForm({ amount: '' })
      setGoldResult({
        type: 'success',
        text: `${formatGoldChange(amount)} gold applied to ${data.player.display_name}. New balance: ${data.player.gold}.`,
      })
      setDeleteResult(createEmptyMessage())

      setPlayers((current) =>
        current.map((player) => (player.id === data.player.id ? { ...player, ...data.player } : player)),
      )
      setPublicPlayers((current) =>
        current.map((player) => (player.id === data.player.id ? { ...player, ...data.player } : player)),
      )
    } catch (error) {
      setGoldResult({
        type: 'error',
        text: error.message,
      })
    } finally {
      setGoldPending(false)
    }
  }

  const handleQuickGoldAmount = (amount) => {
    setGoldForm({
      amount: String(amount),
    })
  }

  const handleRunMemoryVerse = (event) => {
    event.preventDefault()

    if (!memoryVerseForm.reference.trim() && !memoryVerseForm.text.trim()) {
      setMemoryVerseResult({
        type: 'error',
        text: 'Add the book title or the verse text first.',
      })
      return
    }

    setActiveMemoryVerse({
      reference: memoryVerseForm.reference.trim(),
      text: memoryVerseForm.text.trim(),
      coveredCount: 0,
      coveredWordIndexes: [],
      undoneCoveredWordIndexes: [],
    })
    setMemoryVerseEditorOpen(false)
    setMemoryControlsOpen(true)
    setMemoryVerseResult({
      type: 'success',
      text: 'Memory verse helper is ready.',
    })
  }

  const handleCoverNext = () => {
    setActiveMemoryVerse((current) => {
      const totalWords = getMemoryVerseWordCount(current.text)
      const coveredWordIndexes = getCoveredWordIndexes(current, totalWords)
      const nextWordIndex = getRandomUncoveredWordIndex(totalWords, coveredWordIndexes)

      if (nextWordIndex === null) {
        return current
      }

      return {
        ...current,
        coveredCount: Math.min(coveredWordIndexes.length + 1, totalWords),
        coveredWordIndexes: [...coveredWordIndexes, nextWordIndex],
        undoneCoveredWordIndexes: [],
      }
    })
  }

  const handleUndoCover = () => {
    setActiveMemoryVerse((current) => {
      const totalWords = getMemoryVerseWordCount(current.text)
      const coveredWordIndexes = getCoveredWordIndexes(current, totalWords)

      if (!coveredWordIndexes.length) {
        return current
      }

      const nextCoveredWordIndexes = coveredWordIndexes.slice(0, -1)
      const undoneWordIndex = coveredWordIndexes[coveredWordIndexes.length - 1]

      return {
        ...current,
        coveredCount: nextCoveredWordIndexes.length,
        coveredWordIndexes: nextCoveredWordIndexes,
        undoneCoveredWordIndexes: [undoneWordIndex, ...(current.undoneCoveredWordIndexes || [])],
      }
    })
  }

  const handleRedoCover = () => {
    setActiveMemoryVerse((current) => {
      const totalWords = getMemoryVerseWordCount(current.text)
      const coveredWordIndexes = getCoveredWordIndexes(current, totalWords)
      const [redoWordIndex, ...remainingUndoneWordIndexes] = current.undoneCoveredWordIndexes || []

      if (redoWordIndex === undefined) {
        const nextWordIndex = getRandomUncoveredWordIndex(totalWords, coveredWordIndexes)

        if (nextWordIndex === null) {
          return current
        }

        return {
          ...current,
          coveredCount: Math.min(coveredWordIndexes.length + 1, totalWords),
          coveredWordIndexes: [...coveredWordIndexes, nextWordIndex],
          undoneCoveredWordIndexes: [],
        }
      }

      return {
        ...current,
        coveredCount: Math.min(coveredWordIndexes.length + 1, totalWords),
        coveredWordIndexes: [...coveredWordIndexes, redoWordIndex],
        undoneCoveredWordIndexes: remainingUndoneWordIndexes,
      }
    })
  }

  const handleResetCover = () => {
    setActiveMemoryVerse((current) => ({
      ...current,
      coveredCount: 0,
      coveredWordIndexes: [],
      undoneCoveredWordIndexes: [],
    }))
  }

  const handleCoverAll = () => {
    setActiveMemoryVerse((current) => {
      const totalWords = getMemoryVerseWordCount(current.text)

      return {
        ...current,
        coveredCount: totalWords,
        coveredWordIndexes: shuffleWordIndexes(totalWords),
        undoneCoveredWordIndexes: [],
      }
    })
  }

  const handleQuizQuestionChange = (questionId, field, value) => {
    setQuizQuestions((current) => {
      if (field.startsWith('choice-')) {
        const choiceIndex = Number(field.replace('choice-', ''))

        return current.map((question) => {
          if (question.id !== questionId) {
            return question
          }

          const nextChoices = [...question.choices]
          nextChoices[choiceIndex] = value
          return {
            ...question,
            choices: nextChoices,
          }
        })
      }

      return current.map((question) => (question.id === questionId ? { ...question, [field]: value } : question))
    })
  }

  const handleOrganizeQuizDraft = () => {
    if (!quizDraftText.trim()) {
      setQuizDraftResult({
        type: 'error',
        text: 'Paste the quiz text first.',
      })
      return
    }

    const nextQuestions = parseQuizDraftText(quizDraftText)
    const filledQuestions = nextQuestions.filter((question) => question.prompt || question.choices.some(Boolean))

    setQuizQuestions(nextQuestions)
    setQuizPreviewOpen(true)
    setQuizDraftResult({
      type: filledQuestions.length ? 'success' : 'error',
      text: filledQuestions.length
        ? `Organized ${filledQuestions.length} question${filledQuestions.length === 1 ? '' : 's'} into the quiz editor.`
        : 'I could not find questions yet. Try using lines like "1. Question", "A. Option", and "Answer: B".',
    })
    setQuizCurrentIndex(-1)
    setQuizRewardsOpen(false)
  }

  const handleOpenQuizPreview = () => {
    setQuizPreviewOpen(true)
  }

  const handleCloseQuizPreview = () => {
    setQuizPreviewOpen(false)
  }

  const handleStartQuiz = () => {
    if (!quizQuestions.length) {
      setQuizAwardResult({
        type: 'error',
        text: 'Set up the quiz questions first.',
      })
      return
    }

    setQuizCurrentIndex(0)
    setQuizAwardResult(createEmptyMessage())
    setQuizRewardsOpen(false)
  }

  const handlePreviousQuizQuestion = () => {
    setQuizCurrentIndex((current) => Math.max(current - 1, 0))
  }

  const handleNextQuizQuestion = () => {
    setQuizCurrentIndex((current) => {
      const quizItemCount = quizQuestions.length + 1

      if (!quizItemCount) {
        return -1
      }

      return Math.min(current + 1, quizItemCount)
    })
  }

  const handleOpenQuizRewards = () => {
    const quizItemCount = quizQuestions.length + 1

    if (!quizItemCount || quizCurrentIndex < quizItemCount - 1) {
      setQuizAwardResult({
        type: 'error',
        text: 'Finish the quiz first before giving quiz rewards.',
      })
      return
    }

    setQuizRewardsOpen(true)
  }

  const handleCloseQuizRewards = () => {
    setQuizRewardsOpen(false)
    setQuizCurrentIndex(Math.max(0, quizQuestions.length))
  }

  const handleBackToQuizEditor = () => {
    setQuizRewardsOpen(false)
    setQuizCurrentIndex(-1)
    setQuizAwardResult(createEmptyMessage())
  }

  const handleAwardMemoryGold = async (playerId) => {
    setVerseAwardResult(createEmptyMessage())
    setAwardPendingPlayerId(playerId)

    try {
      if (!session?.access_token || !isAdmin) {
        throw new Error('Sign in as admin to reward players.')
      }

      const response = await fetch('/api/adjust-player-gold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          playerId,
          amount: 50,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to add the verse reward.')
      }

      setVerseAwardResult({
        type: 'success',
        text: `+50 gold added to ${data.player.display_name}.`,
      })
      setPlayers((current) =>
        current.map((player) => (player.id === data.player.id ? { ...player, ...data.player } : player)),
      )
      setPublicPlayers((current) =>
        current.map((player) => (player.id === data.player.id ? { ...player, ...data.player } : player)),
      )
    } catch (error) {
      setVerseAwardResult({
        type: 'error',
        text: error.message,
      })
    } finally {
      setAwardPendingPlayerId('')
    }
  }

  const handleAwardQuizGold = async () => {
    setQuizAwardResult(createEmptyMessage())
    setQuizAwardPendingPlayerId('all')

    try {
      if (!session?.access_token || !isAdmin) {
        throw new Error('Sign in as admin to reward players.')
      }

      const awards = players
        .map((player) => ({
          player,
          rawScore: String(quizAwardScores[player.id] || '').trim(),
        }))
        .filter(({ rawScore }) => rawScore)
        .map(({ player, rawScore }) => {
          const score = Number(rawScore)

          if (!Number.isInteger(score) || score <= 0) {
            throw new Error(`Enter a whole score greater than zero for ${player.display_name}.`)
          }

          return {
            amount: score * GOLD_PER_QUIZ_POINT,
            player,
          }
        })

      if (!awards.length) {
        throw new Error('Type at least one player score first.')
      }

      const updatedPlayers = await Promise.all(
        awards.map(async ({ amount, player }) => {
          const response = await fetch('/api/adjust-player-gold', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              playerId: player.id,
              amount,
            }),
          })
          const data = await readJson(response)

          if (!response.ok) {
            throw new Error(data.error || `Unable to add quiz gold for ${player.display_name}.`)
          }

          return data.player
        }),
      )
      const updatedPlayerMap = new Map(updatedPlayers.map((player) => [player.id, player]))

      setQuizAwardResult({
        type: 'success',
        text: `Quiz gold added to ${updatedPlayers.length} player${updatedPlayers.length === 1 ? '' : 's'}.`,
      })
      setPlayers((current) =>
        current.map((player) =>
          updatedPlayerMap.has(player.id) ? { ...player, ...updatedPlayerMap.get(player.id) } : player,
        ),
      )
      setPublicPlayers((current) =>
        current.map((player) =>
          updatedPlayerMap.has(player.id) ? { ...player, ...updatedPlayerMap.get(player.id) } : player,
        ),
      )
    } catch (error) {
      setQuizAwardResult({
        type: 'error',
        text: error.message,
      })
    } finally {
      setQuizAwardPendingPlayerId('')
    }
  }

  const handleDeletePlayer = async () => {
    setDeleteResult(createEmptyMessage())
    setDeletePending(true)

    try {
      if (!session?.access_token) {
        throw new Error('Your admin session is missing. Please log in again.')
      }

      if (!selectedPlayerId || !selectedPlayer) {
        throw new Error('Select a player first.')
      }

      const confirmed = window.confirm(
        `Delete ${selectedPlayer.display_name}? This permanently removes the player and saved data.`,
      )

      if (!confirmed) {
        return
      }

      const deletedPlayerId = selectedPlayer.id
      const response = await fetch('/api/delete-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          playerId: deletedPlayerId,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to delete the player account.')
      }

      setDeleteResult({
        type: 'success',
        text: `${data.player.display_name} was deleted permanently.`,
      })
      setGoldResult(createEmptyMessage())

      await loadPlayers({
        preserveSelection: false,
      })
      await loadPublicPlayers({
        preserveSelection: viewedPlayerId !== deletedPlayerId,
      })
    } catch (error) {
      setDeleteResult({
        type: 'error',
        text: error.message,
      })
    } finally {
      setDeletePending(false)
    }
  }

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }

    setProfile(null)
    setPlayers([])
    setAquariumFish([])
    setSelectedPlayerId('')
    setShopPlayerId('')
    setShopPendingSlug('')
    setShopNotice(createEmptyMessage())
    setAuthMenuOpen(false)
    setProfileMenuOpen(false)
    setLoginMessage(createEmptyMessage())
    setCreatePlayerResult(createEmptyMessage())
    setGoldResult(createEmptyMessage())
    setDeleteResult(createEmptyMessage())
    setVerseAwardResult(createEmptyMessage())
    setQuizAwardResult(createEmptyMessage())
    setMemoryRewardsOpen(false)
    setQuizRewardsOpen(false)
    navigate('/')
  }

  const handleToggleAdmin = () => {
    setAuthMenuOpen(false)
    setProfileMenuOpen(false)
    navigate(viewingAdmin ? '/' : ADMIN_PATH)
  }

  const handleOpenMemoryVerse = () => {
    setAuthMenuOpen(false)
    setProfileMenuOpen(false)
    navigate(MEMORY_PATH)
  }

  const handleShowMemoryVerseEditor = () => {
    setMemoryVerseEditorOpen(true)
    setMemoryControlsOpen(true)
  }

  const handleOpenMemoryRewards = () => {
    setMemoryRewardsOpen(true)
  }

  const handleCloseMemoryRewards = () => {
    setMemoryRewardsOpen(false)
  }

  const handleToggleMemoryFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }

      await document.documentElement.requestFullscreen()
    } catch (error) {
      setMemoryVerseResult({
        type: 'error',
        text: error.message || 'Unable to enter full screen mode.',
      })
    }
  }

  const handleToggleMemoryControls = () => {
    setMemoryControlsOpen((current) => !current)
  }

  const handleIncreaseMemoryFont = () => {
    setMemoryFontScale((current) => clampMemoryFontSize(current + 0.4))
  }

  const handleDecreaseMemoryFont = () => {
    setMemoryFontScale((current) => clampMemoryFontSize(current - 0.4))
  }

  const handleToggleQuizFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }

      await document.documentElement.requestFullscreen()
    } catch (error) {
      setQuizAwardResult({
        type: 'error',
        text: error.message || 'Unable to enter full screen mode.',
      })
    }
  }

  const handleIncreaseQuizFont = () => {
    setQuizFontScale((current) => clampMemoryFontSize(current + 0.4))
  }

  const handleDecreaseQuizFont = () => {
    setQuizFontScale((current) => clampMemoryFontSize(current - 0.4))
  }

  const handleOpenQuiz = () => {
    setAuthMenuOpen(false)
    setProfileMenuOpen(false)
    navigate(QUIZ_PATH)
  }

  const handleOpenShop = () => {
    setAuthMenuOpen(false)
    setProfileMenuOpen(false)
    navigate(SHOP_PATH)
  }

  const handleShopPlayerChange = (event) => {
    setShopPlayerId(event.target.value)
    setShopNotice(createEmptyMessage())
  }

  const handleBuyShopItem = async (item) => {
    setShopNotice(createEmptyMessage())

    if (!session?.access_token || !isAdmin) {
      setShopNotice({
        type: 'warning',
        text: 'Sign in as admin first before buying from the shop.',
      })
      return
    }

    if (!shopPlayer) {
      setShopNotice({
        type: 'warning',
        text: 'Choose a player first before buying an item.',
      })
      return
    }

    if (shopPlayer.gold < item.price) {
      setShopNotice({
        type: 'warning',
        text: `${shopPlayer.display_name} does not have enough gold for ${item.name}.`,
      })
      return
    }

    setShopPendingSlug(item.slug)

    try {
      const response = await fetch('/api/admin-buy-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          itemSlug: item.slug,
          playerId: shopPlayer.id,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to complete the purchase.')
      }

        setPlayers((current) =>
          current.map((player) => (player.id === data.player.id ? { ...player, ...data.player } : player)),
        )
        setPublicPlayers((current) =>
          current.map((player) => (player.id === data.player.id ? { ...player, ...data.player } : player)),
        )

        if (viewedPlayerId === data.player.id) {
          await loadViewedPlayerAquarium(data.player.id)
        }

        setShopNotice({
          type: 'success',
          text: `${data.item.name} bought for ${data.player.display_name}. ${data.player.gold} gold left.`,
        })
    } catch (error) {
      setShopNotice({
        type: 'warning',
        text: error.message,
      })
    } finally {
      setShopPendingSlug('')
    }
  }

  const handleSelectViewedPlayer = (playerId) => {
    setViewedPlayerId(playerId)
    setActivePlayerHudCollapsed(false)
    setProfileMenuOpen(false)

    if (pathname !== '/') {
      navigate('/')
    }
  }

  const showSetupMessage = !hasSupabaseEnv
  const readyForProtectedView = !authLoading && !profileLoading && session && profile
  const showGameScene = !viewingMemory && !viewingQuiz && !viewingAdmin && !viewingShop && Boolean(viewedPlayer)
  const isTeachingFullscreen = isMemoryFullscreen || isQuizFullscreen
  const showActivePlayerHud =
    Boolean(viewedPlayer) && !viewingAdmin && !viewingMemory && !viewingQuiz && !viewingShop && !isTeachingFullscreen

  return (
    <div className={`portal-shell ${showGameScene ? 'game-mode' : 'auth-mode'}`}>
        {showGameScene ? (
          <div className="portal-scene">
            <AquariumScene
              key={viewedPlayer?.id ?? 'no-player'}
              movable={false}
              ownedFish={aquariumFish}
              playerId={viewedPlayer?.id ?? ''}
            />
          </div>
        ) : null}

      <MotionDiv
        className={`portal-overlay top-layout ${isTeachingFullscreen ? 'fullscreen-active' : ''}`}
        layout
        transition={RAIL_TRANSITION}
      >
        {isTeachingFullscreen ? null : (
          <GameTopBar
            authMenuOpen={authMenuOpen}
            authPending={authPending}
            hasAdmin={hasAdmin}
            isAdmin={isAdmin}
            loginForm={loginForm}
            loginMessage={loginMessage}
            navCollapsed={navCollapsed}
            onBootstrapChange={handleBootstrapChange}
            onCreateAdmin={handleCreateAdmin}
            onLogin={handleLogin}
            onLoginChange={handleLoginChange}
            onOpenAdmin={handleToggleAdmin}
            onOpenMemoryVerse={handleOpenMemoryVerse}
            onOpenProfileMenu={handleOpenProfileMenu}
            onOpenQuiz={handleOpenQuiz}
            onOpenShop={handleOpenShop}
            onSelectViewedPlayer={handleSelectViewedPlayer}
            onSignOut={handleSignOut}
            onToggleNavCollapsed={handleToggleNavCollapsed}
            onToggleAuthMenu={handleToggleAuthMenu}
            profile={profile}
            publicPlayers={publicPlayers}
            profileMenuOpen={profileMenuOpen}
            setupForm={setupForm}
            setupMessage={setupMessage}
            viewedPlayer={viewedPlayer}
            viewingShop={viewingShop}
            viewingMemory={viewingMemory}
            viewingQuiz={viewingQuiz}
            viewingAdmin={viewingAdmin}
          />
        )}

        <AnimatePresence>
          {showActivePlayerHud ? (
            <ActivePlayerHud
              collapsed={activePlayerHudCollapsed}
              onToggleCollapsed={() => setActivePlayerHudCollapsed((current) => !current)}
              player={viewedPlayer}
            />
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {viewingShop && shopNotice.text ? (
            <MotionDiv
              animate={{ opacity: 1, x: 0, y: 0 }}
              className={`shop-floating-notice ${shopNotice.type || 'warning'}`}
              exit={{ opacity: 0, x: 20, y: -12 }}
              initial={{ opacity: 0, x: 20, y: -12 }}
              transition={POPOVER_TRANSITION}
            >
              <strong>{shopNotice.type === 'success' ? 'Purchase complete' : 'Shop notice'}</strong>
              <span>{shopNotice.text}</span>
            </MotionDiv>
          ) : null}
        </AnimatePresence>

        <MotionMain className="layout-main" layout transition={RAIL_TRANSITION}>
        {showSetupMessage ? (
          <section className="env-warning panel">
            <div className="eyebrow">Setup Needed</div>
            <p className="panel-copy">
              Add your `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`
              values before using admin and account features.
            </p>
          </section>
        ) : null}

        {viewingMemory && isAdmin ? (
          <div className="memory-stage">
            <MemoryVersePage
              activeMemoryVerse={activeMemoryVerse}
              awardPendingPlayerId={awardPendingPlayerId}
              isAdmin={isAdmin}
              isMemoryFullscreen={isMemoryFullscreen}
              memoryControlsOpen={memoryControlsOpen}
              memoryFontScale={memoryFontScale}
              memoryRewardsOpen={memoryRewardsOpen}
              memoryVerseEditorOpen={memoryVerseEditorOpen}
              memoryVerseForm={memoryVerseForm}
              memoryVerseResult={memoryVerseResult}
              onAwardPlayer={handleAwardMemoryGold}
              onCoverAll={handleCoverAll}
              onCoverNext={handleCoverNext}
              onCloseMemoryRewards={handleCloseMemoryRewards}
              onDecreaseMemoryFont={handleDecreaseMemoryFont}
              onIncreaseMemoryFont={handleIncreaseMemoryFont}
              onOpenMemoryRewards={handleOpenMemoryRewards}
              onMemoryVerseChange={handleMemoryVerseChange}
              onRedoCover={handleRedoCover}
              onResetCover={handleResetCover}
              onRunMemoryVerse={handleRunMemoryVerse}
              onShowMemoryVerseEditor={handleShowMemoryVerseEditor}
              onToggleMemoryControls={handleToggleMemoryControls}
              onToggleMemoryFullscreen={handleToggleMemoryFullscreen}
              onUndoCover={handleUndoCover}
              players={players}
              playersLoading={playersLoading}
              playersMessage={playersMessage}
              verseAwardResult={verseAwardResult}
            />
          </div>
        ) : null}

        {viewingQuiz && isAdmin ? (
          <div className="memory-stage">
            <QuizPage
              activeMemoryVerse={activeMemoryVerse}
              isQuizFullscreen={isQuizFullscreen}
              isAdmin={isAdmin}
              onAwardPlayer={handleAwardQuizGold}
              onBackToQuizEditor={handleBackToQuizEditor}
              onCloseQuizRewards={handleCloseQuizRewards}
              onDecreaseQuizFont={handleDecreaseQuizFont}
              onIncreaseQuizFont={handleIncreaseQuizFont}
              onNextQuizQuestion={handleNextQuizQuestion}
              onOpenQuizRewards={handleOpenQuizRewards}
              onPreviousQuizQuestion={handlePreviousQuizQuestion}
              onQuizAwardChange={handleQuizAwardChange}
              onQuizDraftChange={handleQuizDraftChange}
              onQuizQuestionChange={handleQuizQuestionChange}
              onCloseQuizPreview={handleCloseQuizPreview}
              onOrganizeQuizDraft={handleOrganizeQuizDraft}
              onOpenQuizPreview={handleOpenQuizPreview}
              onStartQuiz={handleStartQuiz}
              onToggleQuizFullscreen={handleToggleQuizFullscreen}
              players={players}
              playersLoading={playersLoading}
              playersMessage={playersMessage}
              quizAwardPendingPlayerId={quizAwardPendingPlayerId}
              quizAwardResult={quizAwardResult}
              quizAwardScores={quizAwardScores}
              quizCurrentIndex={quizCurrentIndex}
              quizDraftResult={quizDraftResult}
              quizDraftText={quizDraftText}
              quizFontScale={quizFontScale}
              quizPreviewOpen={quizPreviewOpen}
              quizQuestions={quizQuestions}
              quizRewardsOpen={quizRewardsOpen}
            />
          </div>
        ) : null}

        {viewingShop ? (
          <div className="shop-stage">
            <ShopPage
              isAdmin={isAdmin}
              onBuyItem={handleBuyShopItem}
              onCategoryChange={setShopCategory}
              onPlayerChange={handleShopPlayerChange}
              pendingItemSlug={shopPendingSlug}
              players={publicPlayers}
              selectedCategory={shopCategory}
              selectedPlayer={shopPlayer}
              selectedPlayerId={shopPlayerId}
            />
          </div>
        ) : null}

        {(viewingMemory || viewingQuiz) && !isAdmin ? (
          <section className="panel memory-locked-panel">
            <div className="eyebrow">Admin Only</div>
            <h2>This page is only for the admin.</h2>
            <p className="panel-copy">Sign in with the admin account to open and control this page.</p>
          </section>
        ) : null}

        {viewingAdmin && readyForProtectedView && isAdmin ? (
          <div className="admin-stage">
            <AdminPanel
              adminSection={adminSection}
              createPlayerForm={createPlayerForm}
              createPlayerPending={createPlayerPending}
              createPlayerResult={createPlayerResult}
              deletePending={deletePending}
              deleteResult={deleteResult}
              goldForm={goldForm}
              goldPending={goldPending}
              goldResult={goldResult}
              onAdjustGold={handleAdjustGold}
              onCreatePlayer={handleCreatePlayer}
              onCreatePlayerChange={handleCreatePlayerChange}
              onDeletePlayer={handleDeletePlayer}
              onGoldFormChange={handleGoldFormChange}
              onLogout={handleSignOut}
              onQuickGoldAmount={handleQuickGoldAmount}
              onReturnToGame={() => navigate('/')}
              onSectionChange={setAdminSection}
              onSelectPlayer={setSelectedPlayerId}
              players={players}
              playersLoading={playersLoading}
              playersMessage={playersMessage}
              profile={profile}
              selectedPlayer={selectedPlayer}
            />
          </div>
        ) : null}
        </MotionMain>
      </MotionDiv>
    </div>
  )
}
