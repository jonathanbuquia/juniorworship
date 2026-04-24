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
