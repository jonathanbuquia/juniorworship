import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './AdminApp.css'
import AquariumScene from './components/AquariumScene'
import AdminPanel from './features/admin/components/AdminPanel.jsx'
import AttendancePage from './features/attendance/components/AttendancePage.jsx'
import { useAuthState } from './features/auth/hooks/useAuthState.js'
import {
  ADMIN_PATH,
  ADMIN_SECTIONS,
  ATTENDANCE_PATH,
  GOLD_PER_QUIZ_POINT,
  MEMORY_PATH,
  POPOVER_TRANSITION,
  QUIZ_PATH,
  RAIL_TRANSITION,
  SHOP_NOTICE_DURATION,
  SHOP_PATH,
} from './features/app/constants.js'
import { createEmptyMessage, formatGoldChange, isAdminProfile, normalizeLoginName } from './features/app/utils.js'
import { usePathname } from './features/app/hooks/usePathname.js'
import CompactNavToggle from './features/layout/components/CompactNavToggle.jsx'
import GameTopBar from './features/layout/components/GameTopBar.jsx'
import { useResponsiveNavigation } from './features/layout/hooks/useResponsiveNavigation.js'
import MemoryVersePage from './features/memory/components/MemoryVersePage.jsx'
import { useMemoryVerseState } from './features/memory/hooks/useMemoryVerseState.js'
import {
  clampMemoryFontSize,
  getCoveredWordIndexes,
  getMemoryVerseWordCount,
  getRandomUncoveredWordIndex,
  shuffleWordIndexes,
} from './features/memory/memoryUtils.js'
import { usePlayerDirectory } from './features/players/hooks/usePlayerDirectory.js'
import ActivePlayerHud from './features/players/components/ActivePlayerHud.jsx'
import QuizPage from './features/quiz/components/QuizPage.jsx'
import { useQuizState } from './features/quiz/hooks/useQuizState.js'
import { SHOP_CATEGORIES } from '../shared/shopCatalog.js'
import { parseQuizDraftText } from './features/quiz/quizUtils.js'
import ShopPage from './features/shop/components/ShopPage.jsx'
import { bootstrapAdminAccount, loginAdmin } from './services/api/authService.js'
import { adjustPlayerGold, createPlayer, deletePlayer } from './services/api/playerService.js'
import { buyItemForPlayer } from './services/api/shopService.js'

const MotionDiv = motion.div
const MotionMain = motion.main
const DEFAULT_PATH = '/'

export default function AdminApp() {
  const { navigate, pathname } = usePathname()
  const {
    closeCompactNav,
    isCompactNav,
    navCollapsed,
    navDrawerOpen,
    toggleNavigation,
  } = useResponsiveNavigation()
  const {
    adminStatusError,
    applySession,
    authLoading,
    hasAdmin,
    hasSupabaseEnv,
    profile,
    profileError,
    profileLoading,
    session,
    setHasAdmin,
    setProfile,
    signOut,
  } = useAuthState()
  const {
    activeMemoryVerse,
    isMemoryFullscreen,
    memoryControlsOpen,
    memoryFontScale,
    memoryRewardsOpen,
    memoryVerseEditorOpen,
    memoryVerseForm,
    setActiveMemoryVerse,
    setIsMemoryFullscreen,
    setMemoryControlsOpen,
    setMemoryFontScale,
    setMemoryRewardsOpen,
    setMemoryVerseEditorOpen,
    setMemoryVerseForm,
  } = useMemoryVerseState()
  const {
    isQuizFullscreen,
    quizAwardScores,
    quizCurrentIndex,
    quizDraftText,
    quizFontScale,
    quizPreviewOpen,
    quizQuestions,
    quizRewardsOpen,
    setIsQuizFullscreen,
    setQuizAwardScores,
    setQuizCurrentIndex,
    setQuizDraftText,
    setQuizFontScale,
    setQuizPreviewOpen,
    setQuizQuestions,
    setQuizRewardsOpen,
  } = useQuizState()

  const accessToken = session?.access_token ?? ''
  const {
    aquariumFish,
    applyPlayerUpdate,
    applyPlayerUpdates,
    loadPlayers,
    loadPublicPlayers,
    loadViewedPlayerAquarium,
    players,
    playersLoading,
    playersMessage,
    publicPlayers,
    resetPlayerDirectory,
    selectedPlayer,
    selectedPlayerId,
    setSelectedPlayerId,
    setShopPlayerId,
    setViewedPlayerId,
    shopPlayer,
    shopPlayerId,
    viewedPlayer,
    viewedPlayerId,
  } = usePlayerDirectory({
    accessToken,
    profile,
  })

  const [authPending, setAuthPending] = useState(false)
  const [createPlayerPending, setCreatePlayerPending] = useState(false)
  const [goldPending, setGoldPending] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [adminSection, setAdminSection] = useState(ADMIN_SECTIONS.createPlayer)
  const [shopCategory, setShopCategory] = useState(() => SHOP_CATEGORIES[0]?.id ?? 'fish')
  const [shopPendingSlug, setShopPendingSlug] = useState('')
  const [shopNotice, setShopNotice] = useState(createEmptyMessage)
  const [activePlayerHudCollapsed, setActivePlayerHudCollapsed] = useState(false)
  const [authMenuOpen, setAuthMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [loginMessage, setLoginMessage] = useState(createEmptyMessage)
  const [setupMessage, setSetupMessage] = useState(createEmptyMessage)
  const [createPlayerResult, setCreatePlayerResult] = useState(createEmptyMessage)
  const [memoryVerseResult, setMemoryVerseResult] = useState(createEmptyMessage)
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
    confirmPassword: '',
    displayName: '',
    loginName: '',
    password: '',
  })
  const [createPlayerForm, setCreatePlayerForm] = useState({
    displayName: '',
    startingGold: '250',
  })
  const [goldForm, setGoldForm] = useState({
    amount: '',
  })

  const isAdmin = useMemo(() => isAdminProfile(profile), [profile])
  const viewingAdmin = pathname === ADMIN_PATH
  const viewingAttendance = pathname === ATTENDANCE_PATH
  const viewingMemory = pathname === MEMORY_PATH
  const viewingQuiz = pathname === QUIZ_PATH
  const viewingShop = pathname === SHOP_PATH
  const readyForProtectedView = !authLoading && !profileLoading && session && profile
  const showGameScene =
    !viewingAttendance && !viewingMemory && !viewingQuiz && !viewingAdmin && !viewingShop && Boolean(viewedPlayer)
  const isTeachingFullscreen = isMemoryFullscreen || isQuizFullscreen
  const showActivePlayerHud =
    Boolean(viewedPlayer) &&
    !viewingAdmin &&
    !viewingAttendance &&
    !viewingMemory &&
    !viewingQuiz &&
    !viewingShop &&
    !isTeachingFullscreen

  useEffect(() => {
    if (adminStatusError) {
      setSetupMessage({
        type: 'error',
        text: adminStatusError,
      })
    }
  }, [adminStatusError])

  useEffect(() => {
    if (profileError) {
      setLoginMessage({
        type: 'error',
        text: profileError,
      })
    }
  }, [profileError])

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
  }, [setIsMemoryFullscreen, setIsQuizFullscreen])

  useEffect(() => {
    if ((!viewingAdmin && !viewingAttendance && !viewingMemory && !viewingQuiz) || !isAdmin || !accessToken) {
      return
    }

    loadPlayers()
  }, [accessToken, isAdmin, loadPlayers, viewingAdmin, viewingAttendance, viewingMemory, viewingQuiz])

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

  const handleToggleAuthMenu = () => {
    setAuthMenuOpen((current) => !current)
    setProfileMenuOpen(false)
  }

  const handleOpenProfileMenu = () => {
    setProfileMenuOpen((current) => !current)
    setAuthMenuOpen(false)
  }

  const handleToggleNavCollapsed = () => {
    toggleNavigation()
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
      const data = await loginAdmin({
        loginName: normalizeLoginName(loginForm.loginName),
        password: loginForm.password,
      })

      await applySession(data.session)
      setLoginForm({
        loginName: '',
        password: '',
      })
      setAuthMenuOpen(false)
      setProfileMenuOpen(false)
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

      const data = await bootstrapAdminAccount({
        displayName: setupForm.displayName,
        loginName: normalizeLoginName(setupForm.loginName),
        password: setupForm.password,
      })

      await applySession(data.session)
      setHasAdmin(true)
      setSetupForm({
        confirmPassword: '',
        displayName: '',
        loginName: '',
        password: '',
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

      if (!accessToken) {
        throw new Error('Your admin session is missing. Please log in again.')
      }

      if (!Number.isInteger(startingGold) || startingGold < 0) {
        throw new Error('Starting gold must be a whole number that is zero or higher.')
      }

      const data = await createPlayer(accessToken, {
        displayName: createPlayerForm.displayName,
        startingGold,
      })

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
        preferredPlayerId: data.player.id,
        preserveSelection: false,
      })
      await loadPublicPlayers({
        preferredPlayerId: data.player.id,
        preserveSelection: false,
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

      if (!accessToken) {
        throw new Error('Your admin session is missing. Please log in again.')
      }

      if (!selectedPlayerId) {
        throw new Error('Select a player first.')
      }

      if (!Number.isInteger(amount) || amount === 0) {
        throw new Error('Enter a whole number that is not zero.')
      }

      const data = await adjustPlayerGold(accessToken, {
        amount,
        playerId: selectedPlayerId,
      })

      setGoldForm({ amount: '' })
      setGoldResult({
        type: 'success',
        text: `${formatGoldChange(amount)} gold applied to ${data.player.display_name}. New balance: ${data.player.gold}.`,
      })
      setDeleteResult(createEmptyMessage())
      applyPlayerUpdate(data.player)
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
      coveredCount: 0,
      coveredWordIndexes: [],
      reference: memoryVerseForm.reference.trim(),
      text: memoryVerseForm.text.trim(),
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

      return Math.min(current + 1, quizItemCount - 1)
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
      if (!accessToken || !isAdmin) {
        throw new Error('Sign in as admin to reward players.')
      }

      const data = await adjustPlayerGold(accessToken, {
        amount: 50,
        playerId,
      })

      setVerseAwardResult({
        type: 'success',
        text: `+50 gold added to ${data.player.display_name}.`,
      })
      applyPlayerUpdate(data.player)
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
      if (!accessToken || !isAdmin) {
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
          const data = await adjustPlayerGold(accessToken, {
            amount,
            playerId: player.id,
          })

          return data.player
        }),
      )

      setQuizAwardResult({
        type: 'success',
        text: `Quiz gold added to ${updatedPlayers.length} player${updatedPlayers.length === 1 ? '' : 's'}.`,
      })
      applyPlayerUpdates(updatedPlayers)
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
      if (!accessToken) {
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
      const data = await deletePlayer(accessToken, deletedPlayerId)

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
    await signOut()
    setProfile(null)
    resetPlayerDirectory()
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
    closeCompactNav()
    navigate(DEFAULT_PATH)
  }

  const handleToggleAdmin = () => {
    setAuthMenuOpen(false)
    setProfileMenuOpen(false)
    closeCompactNav()
    navigate(viewingAdmin ? DEFAULT_PATH : ADMIN_PATH)
  }

  const handleOpenMemoryVerse = () => {
    setAuthMenuOpen(false)
    setProfileMenuOpen(false)
    closeCompactNav()
    navigate(MEMORY_PATH)
  }

  const handleOpenAttendance = () => {
    setAuthMenuOpen(false)
    setProfileMenuOpen(false)
    closeCompactNav()
    navigate(ATTENDANCE_PATH)
  }

  const handleShowMemoryVerseEditor = () => {
    setMemoryVerseEditorOpen(true)
    setMemoryControlsOpen(true)
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
    closeCompactNav()
    navigate(QUIZ_PATH)
  }

  const handleOpenShop = () => {
    setAuthMenuOpen(false)
    setProfileMenuOpen(false)
    closeCompactNav()
    navigate(SHOP_PATH)
  }

  const handleShopPlayerChange = (event) => {
    setShopPlayerId(event.target.value)
    setShopNotice(createEmptyMessage())
  }

  const handleBuyShopItem = async (item) => {
    setShopNotice(createEmptyMessage())

    if (!accessToken || !isAdmin) {
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
      const data = await buyItemForPlayer(accessToken, {
        itemSlug: item.slug,
        playerId: shopPlayer.id,
      })

      applyPlayerUpdate(data.player)

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
    closeCompactNav()

    if (pathname !== DEFAULT_PATH) {
      navigate(DEFAULT_PATH)
    }
  }

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
        className={`portal-overlay top-layout ${isTeachingFullscreen ? 'fullscreen-active' : ''} ${isCompactNav ? 'compact-nav-mode' : ''}`}
        layout={!isCompactNav}
        transition={RAIL_TRANSITION}
      >
        {!isTeachingFullscreen && isCompactNav ? (
          <CompactNavToggle onClick={handleToggleNavCollapsed} open={navDrawerOpen} />
        ) : null}

        <AnimatePresence>
          {!isTeachingFullscreen && isCompactNav && navDrawerOpen ? (
            <motion.button
              animate={{ opacity: 1 }}
              aria-label="Close menu"
              className="compact-nav-backdrop"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={closeCompactNav}
              transition={POPOVER_TRANSITION}
              type="button"
            />
          ) : null}
        </AnimatePresence>

        {isTeachingFullscreen ? null : (
          <GameTopBar
            authMenuOpen={authMenuOpen}
            authPending={authPending}
            hasAdmin={hasAdmin}
            isAdmin={isAdmin}
            isCompactNav={isCompactNav}
            loginForm={loginForm}
            loginMessage={loginMessage}
            navCollapsed={navCollapsed}
            navDrawerOpen={navDrawerOpen}
            onBootstrapChange={handleBootstrapChange}
            onCloseCompactNav={closeCompactNav}
            onCreateAdmin={handleCreateAdmin}
            onLogin={handleLogin}
            onLoginChange={handleLoginChange}
            onOpenAdmin={handleToggleAdmin}
            onOpenAttendance={handleOpenAttendance}
            onOpenMemoryVerse={handleOpenMemoryVerse}
            onOpenProfileMenu={handleOpenProfileMenu}
            onOpenQuiz={handleOpenQuiz}
            onOpenShop={handleOpenShop}
            onSelectViewedPlayer={handleSelectViewedPlayer}
            onSignOut={handleSignOut}
            onToggleAuthMenu={handleToggleAuthMenu}
            onToggleNavCollapsed={handleToggleNavCollapsed}
            profile={profile}
            profileMenuOpen={profileMenuOpen}
            publicPlayers={publicPlayers}
            setupForm={setupForm}
            setupMessage={setupMessage}
            viewedPlayer={viewedPlayer}
            viewingAdmin={viewingAdmin}
            viewingAttendance={viewingAttendance}
            viewingMemory={viewingMemory}
            viewingQuiz={viewingQuiz}
            viewingShop={viewingShop}
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

        <MotionMain className="layout-main" layout={!isCompactNav} transition={RAIL_TRANSITION}>
          {!hasSupabaseEnv ? (
            <section className="env-warning panel">
              <div className="eyebrow">Setup Needed</div>
              <p className="panel-copy">
                Add your `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`
                values before using admin and account features.
              </p>
            </section>
          ) : null}

          {viewingAttendance && isAdmin ? (
            <div className="attendance-stage">
              <AttendancePage players={players.length ? players : publicPlayers} />
            </div>
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
                onCloseMemoryRewards={() => setMemoryRewardsOpen(false)}
                onCoverAll={handleCoverAll}
                onCoverNext={handleCoverNext}
                onDecreaseMemoryFont={handleDecreaseMemoryFont}
                onIncreaseMemoryFont={handleIncreaseMemoryFont}
                onMemoryVerseChange={handleMemoryVerseChange}
                onOpenMemoryRewards={() => setMemoryRewardsOpen(true)}
                onRedoCover={handleRedoCover}
                onResetCover={handleResetCover}
                onRunMemoryVerse={handleRunMemoryVerse}
                onShowMemoryVerseEditor={handleShowMemoryVerseEditor}
                onToggleMemoryControls={() => setMemoryControlsOpen((current) => !current)}
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
                isAdmin={isAdmin}
                isQuizFullscreen={isQuizFullscreen}
                onAwardPlayer={handleAwardQuizGold}
                onBackToQuizEditor={handleBackToQuizEditor}
                onCloseQuizPreview={() => setQuizPreviewOpen(false)}
                onCloseQuizRewards={handleCloseQuizRewards}
                onDecreaseQuizFont={handleDecreaseQuizFont}
                onIncreaseQuizFont={handleIncreaseQuizFont}
                onNextQuizQuestion={handleNextQuizQuestion}
                onOpenQuizPreview={() => setQuizPreviewOpen(true)}
                onOpenQuizRewards={handleOpenQuizRewards}
                onOrganizeQuizDraft={handleOrganizeQuizDraft}
                onPreviousQuizQuestion={handlePreviousQuizQuestion}
                onQuizAwardChange={handleQuizAwardChange}
                onQuizDraftChange={handleQuizDraftChange}
                onQuizQuestionChange={handleQuizQuestionChange}
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

          {(viewingAttendance || viewingMemory || viewingQuiz) && !isAdmin ? (
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
                onReturnToGame={() => navigate(DEFAULT_PATH)}
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
