import React from 'react'
import {
  UserIcon,
  TrophyIcon,
  FlameIcon,
  BookOpenIcon,
  TargetIcon,
  ClockIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '../components/Icons'

export function ProfileView({
  user,
  documents = [],
  insights,
  history = [],
  onRetakeTopic,
}) {
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'S'
  const avgScore = insights?.average_score ? Math.round(insights.average_score) : 0
  const totalAttempts = insights?.total_attempts ?? history.length
  const bestTopic = insights?.topic_mastery?.[0]?.topic || 'Neural Networks'

  const badges = [
    {
      id: 'b1',
      title: 'Neural Master',
      desc: 'Achieved >90% on Machine Learning',
      icon: '🧠',
      unlocked: true,
    },
    {
      id: 'b2',
      title: 'Streak Keeper',
      desc: 'Maintained 4-day study consistency',
      icon: '🔥',
      unlocked: true,
    },
    {
      id: 'b3',
      title: 'PDF Scholar',
      desc: 'Uploaded and indexed 3+ study papers',
      icon: '📚',
      unlocked: documents.length >= 3,
    },
    {
      id: 'b4',
      title: 'Quiz Titan',
      desc: 'Completed 10+ practice assessments',
      icon: '⚡',
      unlocked: totalAttempts >= 10,
    },
  ]

  return (
    <div className="profile-view-layout animate-fade-in">
      {/* Profile Header Hero */}
      <section className="profile-hero-card glass-panel">
        <div className="profile-hero-avatar">
          <div className="avatar-giant">{userInitial}</div>
          <span className="avatar-online-dot" />
        </div>

        <div className="profile-hero-details">
          <div className="profile-name-row">
            <h2>{user?.name || 'Active Student'}</h2>
            <span className="pro-badge">PRO LEARNER</span>
          </div>
          <span className="profile-email">{user?.email || 'student@learniq.ai'}</span>
          <p className="profile-bio">
            Adaptive AI Learning Platform member. Mastering deep concepts with active recall and automated spaced repetition drills.
          </p>
        </div>

        <div className="profile-stat-blocks">
          <div className="stat-pill-box">
            <span className="stat-num">{avgScore}%</span>
            <span className="stat-label">Average Score</span>
          </div>
          <div className="stat-pill-box">
            <span className="stat-num">{totalAttempts}</span>
            <span className="stat-label">Drills Taken</span>
          </div>
          <div className="stat-pill-box">
            <span className="stat-num">{documents.length}</span>
            <span className="stat-label">PDFs Indexed</span>
          </div>
        </div>
      </section>

      {/* Badges / Milestones Showcase */}
      <section className="achievements-section glass-panel">
        <div className="achievements-header">
          <h3>
            <TrophyIcon size={20} className="text-amber" /> Mastery Badges & Achievements
          </h3>
          <span className="badge-count-tag">
            {badges.filter((b) => b.unlocked).length} of {badges.length} Unlocked
          </span>
        </div>

        <div className="badges-grid">
          {badges.map((b) => (
            <div key={b.id} className={`badge-card ${b.unlocked ? 'unlocked' : 'locked'}`}>
              <div className="badge-emoji-wrap">{b.icon}</div>
              <div className="badge-text-col">
                <strong>{b.title}</strong>
                <p>{b.desc}</p>
              </div>
              {b.unlocked && <span className="badge-check-icon">✓</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Complete Quiz History */}
      <section className="history-table-section glass-panel">
        <div className="history-header">
          <h3>Full Assessment History</h3>
          <span className="history-sub">Track all completed quiz attempts</span>
        </div>

        {history.length > 0 ? (
          <div className="history-cards-stack">
            {history.map((att) => {
              const score = Math.round(att.percentage)
              const isPassing = score >= 70
              return (
                <div key={att.attempt_id} className="history-item-row">
                  <div className="history-left">
                    <span className={`score-circle ${isPassing ? 'pass' : 'warn'}`}>{score}%</span>
                    <div className="history-topic-details">
                      <strong>{att.topic}</strong>
                      <span className="history-meta">
                        <ClockIcon size={12} /> {att.created_at || 'Recent Attempt'} • {att.correct_answers}/
                        {att.total_questions} questions correct
                      </span>
                    </div>
                  </div>

                  <div className="history-right">
                    <button
                      type="button"
                      className="history-retake-btn"
                      onClick={() => onRetakeTopic && onRetakeTopic(att.topic)}
                    >
                      <SparklesIcon size={14} /> Retake Drill
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-history-state">
            <TargetIcon size={36} className="text-muted" />
            <p>No assessment history yet. Complete your first quiz to record progress.</p>
          </div>
        )}
      </section>
    </div>
  )
}
