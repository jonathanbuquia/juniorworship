import {
  GOLD_PER_QUIZ_POINT,
  MEMORY_VERSE_QUIZ_POINTS,
  QUIZ_QUESTION_COUNT,
} from '../app/constants.js'

export function createEmptyQuizQuestion(index = 0) {
  return {
    id: `quiz-question-${index + 1}`,
    prompt: '',
    points: '1',
    choices: ['', '', '', ''],
    correctChoiceIndex: '0',
  }
}

export function getQuizQuestionPoints(question) {
  return Number(question?.points) || 1
}

export function getQuizQuestionGold(question) {
  return getQuizQuestionPoints(question) * GOLD_PER_QUIZ_POINT
}

export function createEmptyQuizAwardScores() {
  return {}
}

export function getQuizAwardGold(score) {
  const scoreNumber = Number(score)

  if (!Number.isInteger(scoreNumber) || scoreNumber <= 0) {
    return 0
  }

  return scoreNumber * GOLD_PER_QUIZ_POINT
}

export function getChoiceLabel(choiceIndex) {
  return String.fromCharCode(65 + Number(choiceIndex || 0))
}

export function resolveCorrectChoiceIndex(answerText, choices) {
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

export function splitAnswerFromText(value) {
  const text = stripQuizQuestionIdentifier(value)
  const match = text.match(
    /^(.*?)(?:\s+|^)(?:[([]?\s*)?(?:correct answer|answer|ans|correct)\s*(?:is\s*)?[:=-]?\s*(.+?)\s*[)\]]?$/i,
  )

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

export function stripQuizQuestionIdentifier(value) {
  return String(value || '')
    .trim()
    .replace(/^(?:question|q)\s*\d+\s*[).:-]?\s*/i, '')
    .replace(/^(?:question|q)\s*[:.-]\s*/i, '')
    .trim()
}

export function collectAnswerKeyEntries(value, answerKey) {
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

export function parseQuizDraftText(text) {
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

export function createFixedQuizQuestions(savedQuestions = []) {
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
      correctChoiceIndex:
        Number.isInteger(correctChoiceIndex) && correctChoiceIndex >= 0 && correctChoiceIndex <= 3
          ? String(correctChoiceIndex)
          : '0',
    }
  })
}

export function createQuizItems(quizQuestions, memoryVerseDetails) {
  return [
    ...quizQuestions,
    {
      id: 'memory-verse-fill-blanks',
      isMemoryVerse: true,
      points: String(MEMORY_VERSE_QUIZ_POINTS),
      prompt: memoryVerseDetails.prompt || 'Set the memory verse first, then blanks 6 to 10 will appear here.',
    },
  ]
}
