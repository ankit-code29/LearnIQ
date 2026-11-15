import React from 'react'
import { QuizPlayer } from '../components/QuizPlayer'
import {
  SparklesIcon,
  FlameIcon,
  TrophyIcon,
  TargetIcon,
  RefreshCwIcon,
} from '../components/Icons'

export function QuizView({
  quizForm,
  setQuizForm,
  handleQuizGenerate,
  generatedQuiz,
  quizAnswers,
  handleAnswerChange,
  handleSubmitQuiz,
  submitResult,
  loading,
  studyFocus,
  history,
  onResetQuiz,
  isDemoMode,
}) {
  const suggestedTopics = [
    'Neural Networks',
    'FastAPI Architecture',
    'Distributed Systems',
    'CAP Theorem',
    'Transformer Attention',
    'Python AsyncIO',
  ]

  return (
    <div className="quiz-view-layout animate-fade-in">
      {generatedQuiz ? (
        /* Active Interactive Quiz Player */
        <div className="active-quiz-container">
          <QuizPlayer
            quiz={generatedQuiz}
            answers={quizAnswers}
            onAnswerChange={handleAnswerChange}
            onSubmit={handleSubmitQuiz}
            isSubmitting={loading}
            submitResult={submitResult}
            onReset={onResetQuiz}
          />
        </div>
      ) : (
        /* Quiz Studio Generator Configuration */
        <div className="quiz-generator-studio">
          <div className="generator-main-pane glass-panel">
            <div className="generator-header">
              <div className="header-pill">
                <SparklesIcon size={16} /> AI Quiz Studio
              </div>
              <h2>Generate Adaptive Quiz</h2>
              <p>
                Configure your sprint parameters. LearnIQ analyzes your uploaded documents and conceptual models to generate tailored questions.
              </p>
              {isDemoMode && (
                <p className="form-hint">
                  Demo Mode uses sample quizzes. Sign in to a live account to analyze uploaded PDFs.
                </p>
              )}
              {quizForm.document_id && (
                <p className="form-hint">
                  Questions will be generated from {quizForm.document_name}.
                </p>
              )}
            </div>

            <form onSubmit={handleQuizGenerate} className="generator-form">
              <div className="form-group">
                <label className="form-label">
                  Topic or Concept
                  <span className="label-hint">What do you want to test?</span>
                </label>
                <input
                  type="text"
                  value={quizForm.topic}
                  onChange={(e) => setQuizForm((prev) => ({ ...prev, topic: e.target.value }))}
                  placeholder="e.g. Neural Networks, FastAPI Dependency Injection..."
                  className="modern-input"
                  required
                />

                <div className="suggested-topics-row">
                  <span className="suggested-label">Suggestions:</span>
                  <div className="topic-chips-wrap">
                    {suggestedTopics.map((top) => (
                      <button
                        key={top}
                        type="button"
                        className="quick-chip-btn"
                        onClick={() => setQuizForm((prev) => ({ ...prev, topic: top }))}
                      >
                        {top}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="generator-parameters-grid">
                <div className="form-group">
                  <label className="form-label">Difficulty Tier</label>
                  <div className="difficulty-toggle-group">
                    {[
                      { key: 'easy', label: 'Easy', color: 'emerald' },
                      { key: 'medium', label: 'Medium', color: 'amber' },
                      { key: 'hard', label: 'Hard', color: 'rose' },
                    ].map((diff) => (
                      <button
                        key={diff.key}
                        type="button"
                        className={`diff-select-btn ${quizForm.difficulty === diff.key ? 'active' : ''} diff-${diff.color}`}
                        onClick={() => setQuizForm((prev) => ({ ...prev, difficulty: diff.key }))}
                      >
                        {diff.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Question Count: <strong>{quizForm.question_count} questions</strong>
                  </label>
                  <div className="question-count-slider-wrap">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={quizForm.question_count}
                      onChange={(e) =>
                        setQuizForm((prev) => ({
                          ...prev,
                          question_count: Number(e.target.value),
                        }))
                      }
                      className="modern-range-slider"
                    />
                    <div className="slider-ticks">
                      <span>1</span>
                      <span>3</span>
                      <span>5</span>
                      <span>10</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="generator-submit-row">
                <button
                  type="submit"
                  className="primary-button glowing-button generate-launch-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="button-spinner" /> Generating AI Assessment...
                    </>
                  ) : (
                    <>
                      <SparklesIcon size={18} /> Launch Quiz Sprint
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="generator-side-pane">
            <div className="side-card glass-panel">
              <div className="side-card-header">
                <span className="side-badge">
                  <TargetIcon size={14} /> AI Recommendation
                </span>
                <h4>{studyFocus.title}</h4>
              </div>
              <p className="side-card-copy">{studyFocus.description}</p>
              <button
                type="button"
                className="side-action-btn"
                onClick={() =>
                  setQuizForm((prev) => ({
                    ...prev,
                    topic: studyFocus.title.replace(/^Focus on\s*/i, '').replace(/^Review\s*/i, ''),
                  }))
                }
              >
                Use Recommended Topic
              </button>
            </div>

            <div className="side-card glass-panel">
              <div className="side-card-header">
                <span className="side-badge">
                  <TrophyIcon size={14} /> Recent Record
                </span>
                <h4>
                  {history[0] ? `${Math.round(history[0].percentage)}% on ${history[0].topic}` : 'No quizzes yet'}
                </h4>
              </div>
              <p className="side-card-copy">
                Regular testing enhances long-term memory retention by up to 2.5x compared to passive reading.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
