import React, { useState, useEffect } from 'react'
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  RefreshCwIcon,
  TrophyIcon,
} from './Icons'

export function QuizPlayer({
  quiz,
  answers,
  onAnswerChange,
  onSubmit,
  isSubmitting,
  submitResult,
  onReset,
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [viewMode, setViewMode] = useState('focus') // 'focus' | 'list'
  const [showReview, setShowReview] = useState(false)

  // Reset navigation state whenever a new quiz is loaded
  useEffect(() => {
    setCurrentIndex(0)
    setSecondsElapsed(0)
    setShowReview(false)
    setViewMode('focus')
  }, [quiz?.id, quiz?.topic])

  // Timer effect while quiz is active and not submitted
  useEffect(() => {
    if (submitResult) return

    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [submitResult])

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60)
    const remainingSecs = secs % 60
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return null
  }

  const questions = quiz.questions
  const total = questions.length
  const currentQuestion = questions[currentIndex]
  const answeredCount = questions.filter((q) => answers[q.id] && answers[q.id].trim() !== '').length
  const progressPercent = Math.round((answeredCount / total) * 100)

  // If submitted, show the live result celebration & review screen
  if (submitResult) {
    const isPassing = submitResult.percentage >= 70
    const perfectScore = submitResult.percentage === 100
    const reviewsByQuestionId = Object.fromEntries(
      (submitResult.reviews || []).map((review) => [review.question_id, review]),
    )

    return (
      <div className="quiz-result-hero animate-fade-in">
        <div className="result-card-banner">
          <div className="score-dial-wrap">
            <svg className="score-radial-svg" viewBox="0 0 120 120">
              <circle className="radial-track" cx="60" cy="60" r="50" />
              <circle
                className="radial-indicator"
                cx="60"
                cy="60"
                r="50"
                style={{
                  strokeDasharray: 314,
                  strokeDashoffset: 314 - (314 * submitResult.percentage) / 100,
                  stroke: isPassing ? '#10b981' : '#f59e0b',
                }}
              />
            </svg>
            <div className="radial-score-content">
              <span className="radial-percentage">{Math.round(submitResult.percentage)}%</span>
              <span className="radial-label">Mastery</span>
            </div>
          </div>

          <div className="result-headline-copy">
            <div className="result-badge-row">
              <span className={`pill-badge ${isPassing ? 'pill-success' : 'pill-warning'}`}>
                {perfectScore ? '🌟 Flawless Mastery' : isPassing ? '🎯 Mastered Topic' : '⚡ Reinforcement Needed'}
              </span>
              <span className="pill-badge pill-subtle">
                <ClockIcon size={14} /> Completed in {formatTime(secondsElapsed)}
              </span>
            </div>

            <h2>
              {perfectScore
                ? 'Outstanding work!'
                : isPassing
                  ? 'Great progress on this topic!'
                  : 'Good practice session! Keep going!'}
            </h2>
            <p>
              You got <strong>{submitResult.correct_answers}</strong> out of <strong>{submitResult.total_questions}</strong> questions correct in{' '}
              <span className="highlight-text">{quiz.topic}</span>.
            </p>

            <div className="result-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowReview((prev) => !prev)}
              >
                {showReview ? 'Hide Answer Review' : 'Review Explanations'}
              </button>
              <button type="button" className="primary-button glowing-button" onClick={onReset}>
                <RefreshCwIcon size={16} /> Take Another Quiz
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Question Review */}
        {showReview && (
          <div className="review-section-stack animate-slide-up">
            <h3 className="section-title">Question by Question Review</h3>
            <div className="review-cards-list">
              {questions.map((q, idx) => {
                const review = reviewsByQuestionId[q.id]
                const userAns = review?.selected_answer ?? answers[q.id]
                const correctAns = review?.correct_answer ?? q.correct_answer
                const isCorrect = review
                  ? review.is_correct
                  : correctAns
                    ? userAns === correctAns
                    : Boolean(userAns)
                return (
                  <div key={q.id} className={`review-card ${isCorrect ? 'review-correct' : 'review-incorrect'}`}>
                    <div className="review-card-header">
                      <span className="q-badge">Question {idx + 1}</span>
                      <span className="status-badge">
                        {isCorrect ? (
                          <>
                            <CheckCircleIcon size={16} /> Correct
                          </>
                        ) : (
                          <>
                            <XCircleIcon size={16} /> Incorrect
                          </>
                        )}
                      </span>
                    </div>

                    <h4>{q.question}</h4>

                    <div className="review-options-list">
                      {q.options.map((opt) => {
                        const isSelected = userAns === opt
                        const isTheCorrectOne = correctAns === opt
                        let optClass = 'review-opt'
                        if (isTheCorrectOne) optClass += ' opt-correct'
                        if (isSelected && !isTheCorrectOne) optClass += ' opt-user-wrong'

                        return (
                          <div key={opt} className={optClass}>
                            <span className="opt-marker">
                              {isTheCorrectOne ? '✓' : isSelected ? '✕' : '•'}
                            </span>
                            <span>{opt}</span>
                            {isSelected && <span className="opt-tag">Your Choice</span>}
                            {isTheCorrectOne && <span className="opt-tag-correct">Correct Answer</span>}
                          </div>
                        )
                      })}
                    </div>

                    {(review?.explanation || q.explanation) && (
                      <div className="explanation-callout">
                        <SparklesIcon size={16} />
                        <div>
                          <strong>Key Takeaway:</strong>
                          <p>{review?.explanation || q.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="live-quiz-player animate-fade-in">
      {/* Live Quiz HUD / Top Bar */}
      <div className="quiz-hud-bar">
        <div className="hud-left">
          <div className="live-status-pill">
            <span className="live-dot" />
            <span className="live-text">Live Sprint</span>
          </div>
          <span className="hud-topic">{quiz.topic}</span>
          <span className={`difficulty-badge diff-${quiz.difficulty}`}>
            {quiz.difficulty.toUpperCase()}
          </span>
        </div>

        <div className="hud-center">
          <div className="hud-progress-meter">
            <div className="progress-labels">
              <span>
                Progress: <strong>{answeredCount} of {total}</strong> answered
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="hud-right">
          <div className="live-timer-chip">
            <ClockIcon size={16} />
            <span>{formatTime(secondsElapsed)}</span>
          </div>
          <div className="view-mode-toggle">
            <button
              type="button"
              className={viewMode === 'focus' ? 'active' : ''}
              onClick={() => setViewMode('focus')}
              title="Single Question Focus Mode"
            >
              Focus
            </button>
            <button
              type="button"
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="List View All Mode"
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Stepper Navigation Pills */}
      <div className="question-stepper-pills">
        {questions.map((q, idx) => {
          const isAnswered = Boolean(answers[q.id])
          const isCurrent = idx === currentIndex
          return (
            <button
              key={q.id}
              type="button"
              className={`stepper-pill ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''}`}
              onClick={() => {
                setCurrentIndex(idx)
                if (viewMode === 'list') {
                  const el = document.getElementById(`question-card-${q.id}`)
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              }}
            >
              <span className="pill-num">{idx + 1}</span>
              {isAnswered && <span className="pill-dot" />}
            </button>
          )
        })}
      </div>

      {/* Question Content */}
      {viewMode === 'focus' ? (
        /* Single Question Focus View */
        <div className="focus-question-container animate-fade-in" key={currentQuestion.id}>
          <div className="question-card live-card">
            <div className="question-card-meta">
              <span className="q-number-chip">Question {currentIndex + 1} of {total}</span>
              {answers[currentQuestion.id] && (
                <span className="answered-status-tag">
                  <CheckCircleIcon size={14} /> Answered
                </span>
              )}
            </div>

            <h3 className="question-prompt-text">{currentQuestion.question}</h3>

            <div className="option-interactive-grid">
              {currentQuestion.options.map((option, optIdx) => {
                const isSelected = answers[currentQuestion.id] === option
                const keyLetter = String.fromCharCode(65 + optIdx)
                return (
                  <label
                    key={`${currentQuestion.id}-${option}`}
                    className={`option-tile ${isSelected ? 'selected' : ''}`}
                    onClick={() => onAnswerChange(currentQuestion.id, option)}
                  >
                    <div className="option-tile-left">
                      <span className="key-shortcut-badge">{keyLetter}</span>
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        checked={isSelected}
                        onChange={() => onAnswerChange(currentQuestion.id, option)}
                        className="sr-only"
                      />
                      <span className="option-text-val">{option}</span>
                    </div>
                    <div className="option-radio-indicator">
                      {isSelected ? <div className="indicator-checked" /> : null}
                    </div>
                  </label>
                )
              })}
            </div>

            <div className="focus-nav-footer">
              <button
                type="button"
                className="secondary-button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              >
                <ChevronLeftIcon size={16} /> Previous
              </button>

              <div className="focus-footer-center">
                <span className="step-count-text">
                  {currentIndex + 1} / {total}
                </span>
              </div>

              {currentIndex < total - 1 ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setCurrentIndex((prev) => Math.min(total - 1, prev + 1))}
                >
                  Next <ChevronRightIcon size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-button submit-btn glowing-button"
                  disabled={isSubmitting}
                  onClick={onSubmit}
                >
                  {isSubmitting ? 'Evaluating...' : 'Submit Final Answers'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List Mode View */
        <div className="list-questions-stack">
          {questions.map((q, idx) => (
            <div key={q.id} id={`question-card-${q.id}`} className="question-card live-card">
              <div className="question-card-meta">
                <span className="q-number-chip">Question {idx + 1} of {total}</span>
                {answers[q.id] && (
                  <span className="answered-status-tag">
                    <CheckCircleIcon size={14} /> Answered
                  </span>
                )}
              </div>

              <h4 className="question-prompt-text">{q.question}</h4>

              <div className="option-interactive-grid">
                {q.options.map((option, optIdx) => {
                  const isSelected = answers[q.id] === option
                  const keyLetter = String.fromCharCode(65 + optIdx)
                  return (
                    <label
                      key={`${q.id}-${option}`}
                      className={`option-tile ${isSelected ? 'selected' : ''}`}
                      onClick={() => onAnswerChange(q.id, option)}
                    >
                      <div className="option-tile-left">
                        <span className="key-shortcut-badge">{keyLetter}</span>
                        <input
                          type="radio"
                          name={`question-${q.id}`}
                          checked={isSelected}
                          onChange={() => onAnswerChange(q.id, option)}
                          className="sr-only"
                        />
                        <span className="option-text-val">{option}</span>
                      </div>
                      <div className="option-radio-indicator">
                        {isSelected ? <div className="indicator-checked" /> : null}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="list-submit-footer">
            <div className="submit-prompt-info">
              {answeredCount === total ? (
                <span className="all-answered-chip">
                  <CheckCircleIcon size={16} /> All questions completed!
                </span>
              ) : (
                <span className="partial-answered-chip">
                  {total - answeredCount} questions remaining
                </span>
              )}
            </div>
            <button
              type="button"
              className="primary-button submit-btn glowing-button"
              disabled={isSubmitting}
              onClick={onSubmit}
            >
              {isSubmitting ? 'Evaluating...' : 'Submit Final Answers'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
