import { useEffect, useState } from 'react'
import { QUIZ_STORAGE_KEY } from '../../app/constants.js'
import { createEmptyQuizAwardScores, createFixedQuizQuestions } from '../quizUtils.js'

function getInitialQuizState() {
  try {
    const savedValue = window.localStorage.getItem(QUIZ_STORAGE_KEY)

    if (!savedValue) {
      return {
        quizAwardScores: createEmptyQuizAwardScores(),
        quizCurrentIndex: -1,
        quizQuestions: createFixedQuizQuestions(),
      }
    }

    const parsed = JSON.parse(savedValue)

    return {
      quizAwardScores: parsed.awardScores || createEmptyQuizAwardScores(),
      quizCurrentIndex: typeof parsed.currentIndex === 'number' ? parsed.currentIndex : -1,
      quizQuestions: createFixedQuizQuestions(parsed.questions || []),
    }
  } catch {
    return {
      quizAwardScores: createEmptyQuizAwardScores(),
      quizCurrentIndex: -1,
      quizQuestions: createFixedQuizQuestions(),
    }
  }
}

export function useQuizState() {
  const initialState = getInitialQuizState()
  const [quizQuestions, setQuizQuestions] = useState(initialState.quizQuestions)
  const [quizCurrentIndex, setQuizCurrentIndex] = useState(initialState.quizCurrentIndex)
  const [quizAwardScores, setQuizAwardScores] = useState(initialState.quizAwardScores)
  const [quizRewardsOpen, setQuizRewardsOpen] = useState(false)
  const [quizDraftText, setQuizDraftText] = useState('')
  const [quizPreviewOpen, setQuizPreviewOpen] = useState(false)
  const [quizFontScale, setQuizFontScale] = useState(1.8)
  const [isQuizFullscreen, setIsQuizFullscreen] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(
      QUIZ_STORAGE_KEY,
      JSON.stringify({
        awardScores: quizAwardScores,
        currentIndex: quizCurrentIndex,
        questions: quizQuestions,
      }),
    )
  }, [quizAwardScores, quizCurrentIndex, quizQuestions])

  return {
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
  }
}
