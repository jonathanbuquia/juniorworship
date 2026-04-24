import { useMemo } from 'react'
import {
  GOLD_PER_QUIZ_POINT,
  MEMORY_VERSE_QUIZ_POINTS,
} from '../../app/constants.js'
import {
  getChoiceLabel,
  getQuizAwardGold,
  getQuizQuestionGold,
} from '../quizUtils.js'
import { buildMemoryVerseQuizDetails } from '../../memory/memoryUtils.js'

export default function QuizPage({
  activeMemoryVerse,
  isAdmin,
  isQuizFullscreen,
  onAwardPlayer,
  onBackToQuizEditor,
  onCloseQuizPreview,
  onCloseQuizRewards,
  onDecreaseQuizFont,
  onIncreaseQuizFont,
  onNextQuizQuestion,
  onOpenQuizPreview,
  onOpenQuizRewards,
  onOrganizeQuizDraft,
  onPreviousQuizQuestion,
  onQuizAwardChange,
  onQuizDraftChange,
  onQuizQuestionChange,
  onStartQuiz,
  onToggleQuizFullscreen,
  players,
  playersLoading,
  playersMessage,
  quizAwardPendingPlayerId,
  quizAwardResult,
  quizAwardScores,
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
              <span>
                Memory verse fill in the blanks is last and worth {MEMORY_VERSE_QUIZ_POINTS * GOLD_PER_QUIZ_POINT} gold.
              </span>
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
