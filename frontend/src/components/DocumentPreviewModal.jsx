import React from 'react'
import { FileTextIcon, SparklesIcon, CheckCircleIcon } from './Icons'

export function DocumentPreviewModal({ document, onClose, onGenerateQuiz }) {
  if (!document) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="doc-icon-badge">
              <FileTextIcon size={24} />
            </div>
            <div>
              <h3>{document.file_name}</h3>
              <p className="modal-subtitle">Study Material • Indexed by LearnIQ Engine</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="doc-metadata-grid">
            <div className="doc-meta-item">
              <span className="meta-label">Status</span>
              <span className="status-indicator-chip active">
                <span className="live-dot" /> {document.status || 'Ready for Learning'}
              </span>
            </div>
            <div className="doc-meta-item">
              <span className="meta-label">File Type</span>
              <span className="meta-value">Portable Document Format (PDF)</span>
            </div>
            <div className="doc-meta-item">
              <span className="meta-label">Size</span>
              <span className="meta-value">{document.size_mb || '3.4 MB'}</span>
            </div>
            <div className="doc-meta-item">
              <span className="meta-label">Est. Study Time</span>
              <span className="meta-value">~25 mins</span>
            </div>
          </div>

          <div className="preview-section">
            <h4>
              <SparklesIcon size={16} /> Key Concepts Extracted
            </h4>
            <div className="preview-tags">
              {(document.topics || ['Core Fundamentals', 'Practical Applications', 'Architecture Patterns']).map((topic) => (
                <span key={topic} className="concept-pill">
                  <CheckCircleIcon size={14} /> {topic}
                </span>
              ))}
            </div>
          </div>

          <div className="preview-section summary-box">
            <h4>AI Content Summary</h4>
            <p>
              This document contains structured study notes covering key theoretical principles, architectural patterns, and real-world implementation nuances. LearnIQ has generated embeddings for automated quiz generation and adaptive reinforcement.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="primary-button glowing-button"
            onClick={() => {
              onClose()
              if (onGenerateQuiz) {
                const topic = document.topics?.[0] || document.file_name.replace(/\.pdf$/i, '').replace(/_/g, ' ')
                onGenerateQuiz(topic)
              }
            }}
          >
            <SparklesIcon size={16} /> Generate Quiz from this PDF
          </button>
        </div>
      </div>
    </div>
  )
}
