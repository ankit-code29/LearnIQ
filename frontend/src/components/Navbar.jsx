import React from 'react'
import { SearchIcon } from './Icons'

export function Navbar({
  title = 'Dashboard',
  subtitle = 'Learning Workspace',
  searchQuery,
  onSearchChange,
  user,
  isDemoMode,
  llmInfo,
}) {
  const getAiBadgeLabel = () => {
    if (isDemoMode) return 'Preview Mode'
    if (llmInfo?.llm_configured) {
      const name = {
        gemini: 'Gemini',
        openrouter: 'OpenRouter',
        openai: 'OpenAI',
      }[llmInfo.llm_provider] || 'AI'
      return `${name} Connected`
    }
    if (llmInfo) return 'Local Quiz Mode'
    return 'AI Status Unknown'
  }

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <div className="topbar-title-block">
          <span className="topbar-eyebrow">{subtitle}</span>
          <h2 className="topbar-main-title">{title}</h2>
        </div>
      </div>

      <div className="topbar-center">
        <div className="quick-search-box">
          <SearchIcon size={16} className="search-icon-inside" />
          <input
            type="text"
            placeholder="Search topics, documents, concepts..."
            value={searchQuery || ''}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            className="quick-search-input"
          />
          <kbd className="search-kbd-hint">⌘K</kbd>
        </div>
      </div>

      <div className="topbar-right">
        {/* Live system & LLM status indicator */}
        <div className={`live-engine-chip ${llmInfo?.llm_configured ? 'chip-llm-connected' : ''}`}>
          <span className="live-pulse-dot" />
          <span className="engine-status-text">{getAiBadgeLabel()}</span>
        </div>

        <div className="topbar-user-chip">
          <span className="avatar-micro-dot" />
          <span className="user-name-text">{user?.name?.split(' ')[0] || 'Student'}</span>
        </div>
      </div>
    </header>
  )
}
