export function createEmptyMemoryVerseForm() {
  return {
    reference: '',
    text: '',
  }
}

export function createEmptyActiveMemoryVerse() {
  return {
    reference: '',
    text: '',
    coveredCount: 0,
    coveredWordIndexes: [],
    undoneCoveredWordIndexes: [],
  }
}

export function clampMemoryFontSize(value) {
  return Math.min(5, Math.max(1, value))
}

export function buildMemoryVerseTokens(text) {
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

export function getMemoryVerseWordCount(text) {
  return buildMemoryVerseTokens(text).filter((token) => token.isWord).length
}

const QUIZ_BLANK_STOP_WORDS = new Set([
  'a',
  'ako',
  'am',
  'an',
  'and',
  'ang',
  'are',
  'as',
  'at',
  'ay',
  'be',
  'but',
  'by',
  'for',
  'from',
  'he',
  'her',
  'him',
  'his',
  'i',
  'if',
  'in',
  'is',
  'it',
  'its',
  'ka',
  'ko',
  'mga',
  'mo',
  'my',
  'na',
  'ng',
  'ni',
  'of',
  'on',
  'or',
  'our',
  'pa',
  'po',
  'sa',
  'she',
  'si',
  'so',
  'that',
  'the',
  'their',
  'them',
  'then',
  'they',
  'this',
  'to',
  'us',
  'was',
  'we',
  'were',
  'with',
  'you',
  'your',
])
const QUIZ_BLANK_SHORT_CONTENT_WORDS = new Set([
  'god',
  'joy',
  'law',
  'life',
  'lord',
  'love',
  'pray',
  'sin',
])

function normalizeQuizBlankWord(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/gi, '')
}

function isMeaningfulQuizBlankWord(token) {
  const word = normalizeQuizBlankWord(token.text)

  if (!word || QUIZ_BLANK_STOP_WORDS.has(word)) {
    return false
  }

  return word.length >= 4 || QUIZ_BLANK_SHORT_CONTENT_WORDS.has(word)
}

function pickSpreadWordIndexes(wordTokens, blankCount) {
  if (!wordTokens.length || blankCount <= 0) {
    return []
  }

  return Array.from({ length: Math.min(blankCount, wordTokens.length) }, (_unused, index) => {
    const tokenIndex = Math.min(
      wordTokens.length - 1,
      Math.floor(((index + 1) * wordTokens.length) / (Math.min(blankCount, wordTokens.length) + 1)),
    )

    return wordTokens[tokenIndex].wordIndex
  })
}

function getQuizBlankWordIndexes(wordTokens, blankCount) {
  const meaningfulTokens = wordTokens.filter(isMeaningfulQuizBlankWord)
  const selectedWordIndexes = pickSpreadWordIndexes(meaningfulTokens, blankCount)

  if (selectedWordIndexes.length >= blankCount) {
    return selectedWordIndexes
  }

  const selectedSet = new Set(selectedWordIndexes)
  const fallbackTokens = wordTokens.filter((token) => !selectedSet.has(token.wordIndex))

  return [...selectedWordIndexes, ...pickSpreadWordIndexes(fallbackTokens, blankCount - selectedWordIndexes.length)]
}

export function getCoveredWordIndexes(activeMemoryVerse, totalWords) {
  if (Array.isArray(activeMemoryVerse.coveredWordIndexes)) {
    return activeMemoryVerse.coveredWordIndexes.filter((wordIndex) => wordIndex >= 0 && wordIndex < totalWords)
  }

  const legacyCount = Math.min(activeMemoryVerse.coveredCount || 0, totalWords)
  return Array.from({ length: legacyCount }, (_unused, index) => index)
}

export function getRandomUncoveredWordIndex(totalWords, coveredWordIndexes) {
  const coveredSet = new Set(coveredWordIndexes)
  const availableWordIndexes = Array.from({ length: totalWords }, (_unused, index) => index).filter(
    (wordIndex) => !coveredSet.has(wordIndex),
  )

  if (!availableWordIndexes.length) {
    return null
  }

  return availableWordIndexes[Math.floor(Math.random() * availableWordIndexes.length)]
}

export function shuffleWordIndexes(totalWords) {
  const wordIndexes = Array.from({ length: totalWords }, (_unused, index) => index)

  for (let index = wordIndexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[wordIndexes[index], wordIndexes[swapIndex]] = [wordIndexes[swapIndex], wordIndexes[index]]
  }

  return wordIndexes
}

export function buildMemoryVerseQuizDetails(memoryVerse) {
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
    getQuizBlankWordIndexes(wordTokens, blankCount).map((wordIndex, index) => [wordIndex, index + 6]),
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
