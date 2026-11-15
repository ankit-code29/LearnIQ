import React, { useEffect } from 'react'
import { CheckCircleIcon, XCircleIcon, AlertCircleIcon } from './Icons'

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="toast-container" role="region" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss()
    }, toast.duration || 4000)

    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  const icons = {
    success: <CheckCircleIcon size={20} className="toast-icon text-emerald" />,
    error: <XCircleIcon size={20} className="toast-icon text-rose" />,
    info: <AlertCircleIcon size={20} className="toast-icon text-indigo" />,
  }

  return (
    <div className={`toast-card toast-${toast.type || 'info'}`}>
      <div className="toast-icon-wrap">{icons[toast.type] || icons.info}</div>
      <div className="toast-content">
        {toast.title && <strong className="toast-title">{toast.title}</strong>}
        <p className="toast-message">{toast.message}</p>
      </div>
      <button type="button" className="toast-close" onClick={onDismiss} aria-label="Close notification">
        &times;
      </button>
      <div className="toast-progress-bar" style={{ animationDuration: `${toast.duration || 4000}ms` }} />
    </div>
  )
}
