import React, { useState, useRef } from 'react'
import { UploadCloudIcon, FileTextIcon, CheckCircleIcon, SparklesIcon } from './Icons'

export function DocumentUploader({ onUpload, isUploading }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadStep, setUploadStep] = useState('')
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setSelectedFile(file)
      } else {
        alert('Please drop a valid PDF file.')
      }
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile) return

    setUploadStep('Uploading PDF bytes...')
    setTimeout(() => setUploadStep('Indexing concepts & generating embeddings...'), 800)

    try {
      await onUpload(selectedFile)
      setSelectedFile(null)
      setUploadStep('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      setUploadStep('')
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  return (
    <div className="uploader-card">
      <form onSubmit={handleSubmit} className="uploader-form">
        <div
          className={`dropzone-box ${isDragOver ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="sr-only"
            disabled={isUploading}
          />

          {selectedFile ? (
            <div className="selected-file-preview animate-scale-in">
              <div className="file-icon-wrap">
                <FileTextIcon size={36} />
              </div>
              <div className="file-info-col">
                <strong className="file-name-text">{selectedFile.name}</strong>
                <span className="file-size-badge">{formatFileSize(selectedFile.size)}</span>
              </div>
              <button
                type="button"
                className="remove-file-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                disabled={isUploading}
              >
                &times;
              </button>
            </div>
          ) : (
            <div className="dropzone-empty-state">
              <div className="dropzone-icon-aura">
                <UploadCloudIcon size={32} />
              </div>
              <h4>Drag & drop study PDF here</h4>
              <p>or click to browse from your computer (up to 10 MB)</p>
              <div className="dropzone-meta-tags">
                <span className="meta-tag">
                  <CheckCircleIcon size={13} /> Auto-embeddings
                </span>
                <span className="meta-tag">
                  <SparklesIcon size={13} /> AI Quiz generation
                </span>
              </div>
            </div>
          )}
        </div>

        {isUploading && (
          <div className="upload-progress-container animate-fade-in">
            <div className="progress-status-row">
              <span className="status-spinner-dot" />
              <span>{uploadStep || 'Processing your document...'}</span>
            </div>
            <div className="animated-progress-stripes" />
          </div>
        )}

        <div className="uploader-footer">
          <p className="upload-hint">
            LearnIQ automatically creates adaptive flash assessments from your uploaded lecture notes and research papers.
          </p>
          <button
            type="submit"
            className="primary-button glowing-button upload-submit-btn"
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <span className="button-spinner" /> Processing PDF...
              </>
            ) : (
              <>
                <UploadCloudIcon size={18} /> Upload to Library
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
