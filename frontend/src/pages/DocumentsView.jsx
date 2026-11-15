import React, { useState } from 'react'
import { DocumentUploader } from '../components/DocumentUploader'
import { DocumentPreviewModal } from '../components/DocumentPreviewModal'
import {
  BookOpenIcon,
  FileTextIcon,
  SparklesIcon,
  EyeIcon,
  SearchIcon,
  CheckCircleIcon,
} from '../components/Icons'

export function DocumentsView({
  documents = [],
  onUploadDocument,
  isUploading,
  onGenerateFromDoc,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [previewDoc, setPreviewDoc] = useState(null)

  const filteredDocs = documents.filter((doc) =>
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="documents-view-layout animate-fade-in">
      {/* Upload Header Section */}
      <section className="doc-upload-section">
        <div className="section-title-wrap">
          <span className="section-eyebrow">STUDY MATERIAL INGESTION</span>
          <h2>Upload Learning Resources</h2>
          <p>
            Add your textbooks, lecture notes, or research papers in PDF format. LearnIQ indexes key concepts to generate adaptive revision quizzes.
          </p>
        </div>

        <DocumentUploader onUpload={onUploadDocument} isUploading={isUploading} />
      </section>

      {/* Library Grid Section */}
      <section className="doc-library-section">
        <div className="library-header-row">
          <div className="library-headline">
            <h3>Indexed Documents</h3>
            <span className="library-count-badge">{documents.length} materials</span>
          </div>

          <div className="library-search-box">
            <SearchIcon size={16} className="search-icon-inside" />
            <input
              type="text"
              placeholder="Filter documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="library-search-input"
            />
          </div>
        </div>

        {filteredDocs.length > 0 ? (
          <div className="documents-cards-grid">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="document-item-card glass-panel">
                <div className="doc-card-top">
                  <div className="doc-icon-badge">
                    <FileTextIcon size={24} />
                  </div>
                  <span className="doc-status-pill">
                    <span className="live-dot" /> {doc.status || 'Ready'}
                  </span>
                </div>

                <div className="doc-card-main">
                  <h4 className="doc-title" title={doc.file_name}>
                    {doc.file_name}
                  </h4>
                  <div className="doc-meta-strip">
                    <span>{doc.size_mb || 'PDF'}</span>
                    <span>•</span>
                    <span>{doc.uploaded_at || 'Recently indexed'}</span>
                  </div>

                  {doc.topics && doc.topics.length > 0 && (
                    <div className="doc-topic-chips">
                      {doc.topics.slice(0, 2).map((t) => (
                        <span key={t} className="micro-topic-chip">
                          {t}
                        </span>
                      ))}
                      {doc.topics.length > 2 && (
                        <span className="micro-topic-chip subtle">+{doc.topics.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="doc-card-actions">
                  <button
                    type="button"
                    className="doc-action-btn secondary"
                    onClick={() => setPreviewDoc(doc)}
                    title="Preview key concepts"
                  >
                    <EyeIcon size={15} /> Preview
                  </button>
                  <button
                    type="button"
                    className="doc-action-btn primary glowing-button"
                    onClick={() => {
                      const topic = doc.topics?.[0] || doc.file_name.replace(/\.pdf$/i, '').replace(/_/g, ' ')
                      onGenerateFromDoc(topic, doc)
                    }}
                    title="Generate AI practice quiz"
                  >
                    <SparklesIcon size={15} /> Quiz
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-docs-state glass-panel">
            <BookOpenIcon size={40} className="empty-icon text-muted" />
            <h4>No documents found</h4>
            <p>
              {searchQuery
                ? `No documents match "${searchQuery}". Try a different keyword.`
                : 'Upload your first PDF study material above to begin generating smart quizzes.'}
            </p>
          </div>
        )}
      </section>

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onGenerateQuiz={(topic) => {
            setPreviewDoc(null)
            onGenerateFromDoc(topic, previewDoc)
          }}
        />
      )}
    </div>
  )
}
