import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  BrainIcon,
  BarChartIcon,
  BookOpenIcon,
  SparklesIcon,
  UserIcon,
  FlameIcon,
  SunIcon,
  MoonIcon,
  LogoutIcon,
} from './Icons'

export function Sidebar({ user, streak = 4, darkMode, onToggleTheme, onLogout, isDemoMode, onToggleDemo }) {
  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: <BarChartIcon size={18} /> },
    { to: '/documents', label: 'Study Library', icon: <BookOpenIcon size={18} /> },
    { to: '/quiz', label: 'Quiz Studio', icon: <SparklesIcon size={18} /> },
    { to: '/profile', label: 'Learner Profile', icon: <UserIcon size={18} /> },
  ]

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'S'

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand-header">
        <div className="brand-logo-glow">
          <BrainIcon size={24} className="brand-brain-icon" />
        </div>
        <div className="brand-text-col">
          <div className="brand-name-row">
            <h2>LearnIQ</h2>
            <span className="ai-version-chip">AI v2.0</span>
          </div>
          <span className="brand-tagline">Adaptive Intelligence</span>
        </div>
      </div>

      <div className="sidebar-streak-card">
        <div className="streak-icon-wrap">
          <FlameIcon size={20} className="flame-animate" />
        </div>
        <div className="streak-info">
          <strong>{streak} Day Streak!</strong>
          <small>Daily practice milestone</small>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-group-label">WORKSPACE</span>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span className="nav-item-label">{item.label}</span>
            <span className="active-glow-indicator" />
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom-actions">
        {/* Showcase / Demo toggle */}
        <div className="demo-toggle-wrap">
          <button
            type="button"
            className={`demo-mode-pill ${isDemoMode ? 'demo-on' : ''}`}
            onClick={onToggleDemo}
            title="Toggle interactive demo data"
          >
            <span className="demo-dot" />
            <span className="demo-label">{isDemoMode ? 'Demo Mode Active' : 'Use Demo Data'}</span>
          </button>
        </div>

        <div className="user-profile-widget">
          <div className="user-avatar-initials">{userInitial}</div>
          <div className="user-details-col">
            <span className="user-display-name">{user?.name || 'Active Student'}</span>
            <span className="user-role-label">Free Tier • Learner</span>
          </div>
          <button
            type="button"
            className="sidebar-theme-btn"
            onClick={onToggleTheme}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
        </div>

        <button type="button" className="sidebar-logout-btn" onClick={onLogout}>
          <LogoutIcon size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
