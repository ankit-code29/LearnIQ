import React, { useState } from 'react'
import {
  SparklesIcon,
  FlameIcon,
  TrophyIcon,
  BookOpenIcon,
  ClockIcon,
  ChevronRightIcon,
  TargetIcon,
  CheckCircleIcon,
} from '../components/Icons'

export function DashboardView({
  documents = [],
  insights,
  history = [],
  studyFocus,
  bestTopic,
  onLaunchPractice,
  onNavigateTab,
}) {
  const [topicFilter, setTopicFilter] = useState('all')

  const totalDocs = documents.length
  const avgScore = insights?.average_score ? Math.round(insights.average_score) : 0
  const totalAttempts = insights?.total_attempts ?? (history.length || 0)
  const streakDays = insights?.streak_days || 4

  const topicMasteryList = insights?.topic_mastery || []
  const filteredTopics = topicMasteryList.filter((item) => {
    if (topicFilter === 'weak') return item.mastery_score < 70
    if (topicFilter === 'mastered') return item.mastery_score >= 80
    return true
  })

  return (
    <div className="dashboard-content-layout animate-fade-in">
      {/* Hero Study Focus Spotlight */}
      <section className="hero-snapshot-card glass-panel">
        <div className="snapshot-left-col">
          <div className="snapshot-pill-row">
            <span className="live-pill">
              <span className="live-dot" /> AI Recommendation
            </span>
            <span className="tag-pill">{studyFocus.tag}</span>
            {bestTopic && (
              <span className="mastery-pill">
                {bestTopic.mastery_score}% Current Mastery
              </span>
            )}
          </div>

          <h2 className="snapshot-title">{studyFocus.title}</h2>
          <p className="snapshot-description">{studyFocus.description}</p>

          <div className="snapshot-actions">
            <button
              type="button"
              className="primary-button glowing-button"
              onClick={() => {
                const topicName = bestTopic?.topic || 'Neural Networks'
                onLaunchPractice(topicName)
              }}
            >
              <SparklesIcon size={16} /> Start 3-Question Practice Sprint
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onNavigateTab('/documents')}
            >
              <BookOpenIcon size={16} /> View Study Materials
            </button>
          </div>
        </div>

        <div className="snapshot-right-col">
          <div className="mastery-orb-graphic">
            <div className="orb-inner">
              <span className="orb-val">{avgScore}%</span>
              <span className="orb-label">Avg Accuracy</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Column Live Metric HUD */}
      <section className="metrics-hud-grid">
        <div className="hud-metric-card glass-panel">
          <div className="metric-header">
            <span className="metric-label">Study Library</span>
            <div className="metric-icon-wrap bg-blue-subtle">
              <BookOpenIcon size={18} />
            </div>
          </div>
          <div className="metric-body">
            <strong className="metric-number">{totalDocs}</strong>
            <span className="metric-subtext">PDF documents indexed</span>
          </div>
        </div>

        <div className="hud-metric-card glass-panel">
          <div className="metric-header">
            <span className="metric-label">Overall Accuracy</span>
            <div className="metric-icon-wrap bg-emerald-subtle">
              <TrophyIcon size={18} />
            </div>
          </div>
          <div className="metric-body">
            <strong className="metric-number">{avgScore}%</strong>
            <span className="metric-subtext">Across all topics</span>
          </div>
        </div>

        <div className="hud-metric-card glass-panel">
          <div className="metric-header">
            <span className="metric-label">Drills Completed</span>
            <div className="metric-icon-wrap bg-purple-subtle">
              <TargetIcon size={18} />
            </div>
          </div>
          <div className="metric-body">
            <strong className="metric-number">{totalAttempts}</strong>
            <span className="metric-subtext">Quizzes submitted</span>
          </div>
        </div>

        <div className="hud-metric-card glass-panel">
          <div className="metric-header">
            <span className="metric-label">Learning Streak</span>
            <div className="metric-icon-wrap bg-amber-subtle">
              <FlameIcon size={18} />
            </div>
          </div>
          <div className="metric-body">
            <strong className="metric-number">{streakDays} Days 🔥</strong>
            <span className="metric-subtext">Top 5% consistency</span>
          </div>
        </div>
      </section>

      {/* Main Grid: Topic Mastery & Recommendations */}
      <div className="dashboard-columns-grid">
        {/* Left Column: Topic Mastery Radar */}
        <div className="dashboard-main-col">
          <div className="section-card glass-panel">
            <div className="section-card-header">
              <div>
                <h3 className="section-heading">Topic Mastery Breakdown</h3>
                <p className="section-subheading">Track your retention score across subjects</p>
              </div>

              <div className="filter-pill-group">
                <button
                  type="button"
                  className={`filter-chip ${topicFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTopicFilter('all')}
                >
                  All ({topicMasteryList.length})
                </button>
                <button
                  type="button"
                  className={`filter-chip ${topicFilter === 'weak' ? 'active' : ''}`}
                  onClick={() => setTopicFilter('weak')}
                >
                  Needs Work (&lt;70%)
                </button>
                <button
                  type="button"
                  className={`filter-chip ${topicFilter === 'mastered' ? 'active' : ''}`}
                  onClick={() => setTopicFilter('mastered')}
                >
                  Mastered (80%+)
                </button>
              </div>
            </div>

            <div className="topic-mastery-list">
              {filteredTopics.length > 0 ? (
                filteredTopics.map((item) => {
                  const score = Math.round(item.mastery_score)
                  let scoreColor = '#10b981'
                  if (score < 50) scoreColor = '#f43f5e'
                  else if (score < 80) scoreColor = '#f59e0b'

                  return (
                    <div key={item.topic} className="topic-mastery-item">
                      <div className="topic-meta-row">
                        <div className="topic-title-col">
                          <strong className="topic-name">{item.topic}</strong>
                          <span className="topic-attempts-count">
                            {item.attempts} {item.attempts === 1 ? 'drill' : 'drills'} taken
                          </span>
                        </div>
                        <div className="topic-score-action">
                          <span className="topic-percent-badge" style={{ color: scoreColor }}>
                            {score}%
                          </span>
                          <button
                            type="button"
                            className="micro-practice-btn"
                            onClick={() => onLaunchPractice(item.topic)}
                            title="Generate quiz on this topic"
                          >
                            <SparklesIcon size={14} /> Practice
                          </button>
                        </div>
                      </div>

                      <div className="topic-progress-track">
                        <div
                          className="topic-progress-fill"
                          style={{
                            width: `${score}%`,
                            backgroundColor: scoreColor,
                          }}
                        />
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="empty-state-card">
                  <TargetIcon size={32} className="empty-icon text-muted" />
                  <p>No topic data for this filter. Complete quizzes to unlock deeper insights.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Recommendations & Recent Activity */}
        <div className="dashboard-side-col">
          {/* AI Recommendations */}
          <div className="section-card glass-panel">
            <div className="section-card-header">
              <h3 className="section-heading">Smart Recommendations</h3>
            </div>

            <div className="recommendations-stack">
              {insights?.recommendations?.length ? (
                insights.recommendations.map((rec) => (
                  <div key={rec.topic} className="recommendation-item-card">
                    <div className="rec-card-top">
                      <strong className="rec-topic">{rec.topic}</strong>
                      <span className="priority-pill">{rec.priority}</span>
                    </div>
                    <p className="rec-reason">{rec.reason}</p>
                    <button
                      type="button"
                      className="rec-action-link"
                      onClick={() => onLaunchPractice(rec.topic)}
                    >
                      Target this weakness <ChevronRightIcon size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state-card">
                  <SparklesIcon size={28} className="empty-icon text-muted" />
                  <p>Recommendations will appear as you take quizzes.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Quiz Activity */}
          <div className="section-card glass-panel">
            <div className="section-card-header">
              <h3 className="section-heading">Recent Quiz Drills</h3>
            </div>

            <div className="recent-activity-list">
              {history.length ? (
                history.slice(0, 4).map((att) => (
                  <div key={att.attempt_id} className="activity-card-row">
                    <div className="activity-info">
                      <strong className="activity-topic">{att.topic}</strong>
                      <span className="activity-date">
                        <ClockIcon size={12} /> {att.correct_answers}/{att.total_questions} correct
                      </span>
                    </div>
                    <span
                      className={`activity-score-badge ${
                        att.percentage >= 80 ? 'high-score' : att.percentage >= 60 ? 'mid-score' : 'low-score'
                      }`}
                    >
                      {Math.round(att.percentage)}%
                    </span>
                  </div>
                ))
              ) : (
                <p className="empty-state-card">No quiz history recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
