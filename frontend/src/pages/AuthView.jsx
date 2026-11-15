import React from 'react'
import { BrainIcon, SparklesIcon, CheckCircleIcon, BookOpenIcon, TrophyIcon } from '../components/Icons'

export function AuthView({
  authMode,
  setAuthMode,
  authForm,
  handleAuthChange,
  handleAuthSubmit,
  loading,
  error,
  success,
  onQuickDemoLogin,
}) {
  return (
    <div className="auth-canvas animate-fade-in">
      <div className="auth-hero-pane">
        <div className="auth-hero-content">
          <div className="brand-pill">
            <BrainIcon size={18} />
            <span>Next-Gen Learning OS</span>
          </div>

          <h1 className="hero-gradient-text">Master any topic at the speed of thought.</h1>
          <p className="hero-subtext">
            Upload course materials, generate intelligent adaptive quizzes, track your topic mastery in real-time, and eliminate study blindspots.
          </p>

          <div className="floating-metric-cards">
            <div className="glass-feature-item">
              <div className="feature-icon-badge">
                <SparklesIcon size={20} />
              </div>
              <div>
                <strong>AI Quiz Synthesis</strong>
                <p>Auto-generates questions directly from your PDFs & notes.</p>
              </div>
            </div>

            <div className="glass-feature-item">
              <div className="feature-icon-badge">
                <TrophyIcon size={20} />
              </div>
              <div>
                <strong>Adaptive Topic Mastery</strong>
                <p>Real-time analytics pinpoint your exact weak areas.</p>
              </div>
            </div>

            <div className="glass-feature-item">
              <div className="feature-icon-badge">
                <BookOpenIcon size={20} />
              </div>
              <div>
                <strong>Smart Study Library</strong>
                <p>Organize, extract, and convert PDFs into active recall drills.</p>
              </div>
            </div>
          </div>

          <div className="social-proof-strip">
            <div className="proof-avatars">
              <span className="proof-avatar a1">AR</span>
              <span className="proof-avatar a2">EL</span>
              <span className="proof-avatar a3">JS</span>
              <span className="proof-avatar a4">KM</span>
            </div>
            <span>Over 12,000+ quiz questions generated and mastered</span>
          </div>
        </div>
      </div>

      <div className="auth-form-pane">
        <div className="auth-form-card glass-panel">
          <div className="auth-card-header">
            <h3>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h3>
            <p>{authMode === 'login' ? 'Sign in to access your study library' : 'Start your adaptive learning journey'}</p>
          </div>

          <div className="auth-tab-slider">
            <button
              type="button"
              className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => setAuthMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="modern-auth-form">
            {authMode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={authForm.name}
                  onChange={handleAuthChange}
                  placeholder="e.g. Alex Rivera"
                  className="modern-input"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                value={authForm.email}
                onChange={handleAuthChange}
                placeholder="name@university.edu"
                className="modern-input"
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                value={authForm.password}
                onChange={handleAuthChange}
                placeholder="••••••••••••"
                className="modern-input"
                minLength={6}
                maxLength={128}
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>

            {error && <div className="auth-error-banner">{error}</div>}
            {success && <div className="auth-success-banner">{success}</div>}

            <button type="submit" className="primary-button glowing-button submit-auth-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="button-spinner" /> Processing...
                </>
              ) : authMode === 'login' ? (
                'Sign In to LearnIQ'
              ) : (
                'Create Free Account'
              )}
            </button>

            <div className="demo-divider">
              <span>OR TRY INSTANT DEMO</span>
            </div>

            <button
              type="button"
              className="quick-demo-btn"
              onClick={onQuickDemoLogin}
            >
              <SparklesIcon size={16} /> Explore with Demo Account (Instant Access)
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
