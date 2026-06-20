import { useRef, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useOverlayStore } from '../store'
import { MODES, IPC } from '../shared/constants'
import ResponseStream from './ResponseStream'
import TranscriptBar from './TranscriptBar'
import ActionItems from './ActionItems'
import type { AppMode } from '../shared/types'

interface CommandPanelProps {
  onClose: () => void
  onSubmit: () => void
  onSubmitWithScreenshot: () => void
  onToggleRecording: () => void
  onClipboardAccept: () => void
  onClipboardDismiss: () => void
}

export default function CommandPanel({
  onClose, onSubmit, onSubmitWithScreenshot, onToggleRecording,
  onClipboardAccept, onClipboardDismiss,
}: CommandPanelProps) {
  const {
    mode, query, messages, streamContent, isStreaming, isRecording,
    transcript, clipboardSuggestion, setMode, setQuery,
  } = useOverlayStore()

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Auto-resize textarea
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
  }, [setQuery])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault()
      onSubmit()
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      onSubmitWithScreenshot()
    }
  }, [onClose, onSubmit, onSubmitWithScreenshot])

  const openDashboard = useCallback(() => {
    invoke(IPC.OPEN_DASHBOARD).catch(() => {})
  }, [])

  const hasContent = messages.length > 0 || isStreaming

  return (
    <div className="wraith-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-header-left">
          <span className="panel-logo">WRAITH</span>
          {/* Mode tabs */}
          <div className="mode-tabs">
            {MODES.map(m => (
              <button
                key={m.id}
                className={`mode-tab ${mode === m.id ? 'active' : ''}`}
                onClick={() => setMode(m.id as AppMode)}
                title={`Switch to ${m.label} mode`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-header-right">
          {mode !== 'interview' && (
            <button
              className={`icon-btn ${isRecording ? 'active' : ''}`}
              onClick={onToggleRecording}
              title={isRecording ? 'Stop recording (Ctrl+Shift+Space)' : 'Start audio recording (Ctrl+Shift+Space)'}
            >
              {isRecording ? '⏹' : '🎙'}
            </button>
          )}
          <button className="icon-btn" onClick={openDashboard} title="Open dashboard (Ctrl+Shift+W)">
            ⚙
          </button>
          <button className="icon-btn" onClick={onClose} title="Collapse (Esc)">
            ×
          </button>
        </div>
      </div>

      {/* Clipboard suggestion */}
      {clipboardSuggestion && (
        <div className="clipboard-banner" onClick={onClipboardAccept}>
          <span className="clip-label">◈ CLIP</span>
          <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {clipboardSuggestion.slice(0, 80)}...
          </span>
          <span
            className="clip-dismiss"
            onClick={(e) => { e.stopPropagation(); onClipboardDismiss() }}
          >
            ×
          </span>
        </div>
      )}

      {/* Body — messages */}
      <div className="panel-body">
        {!hasContent ? (
          <div className="conversation-empty">
            <div className="empty-logo">◎</div>
            <div className="empty-hint">TYPE A COMMAND OR PRESS Ctrl+Enter FOR SCREEN CONTEXT</div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <ResponseStream key={msg.id} message={msg} isStreaming={false} />
            ))}
            {isStreaming && streamContent && (
              <ResponseStream
                message={{ id: 'stream', role: 'assistant', content: streamContent, timestamp: Date.now() }}
                isStreaming
              />
            )}
          </>
        )}
      </div>

      {/* Transcript bar */}
      {transcript.length > 0 && <TranscriptBar segments={transcript} />}

      {/* Meeting Action Items */}
      {mode === 'meeting' && <ActionItems />}

      {/* Footer — command input */}
      <div className="panel-footer">
        <div className="command-input-row">
          <span className="command-prefix">›</span>
          <textarea
            ref={textareaRef}
            className="command-input"
            placeholder="Ask anything... or use /code /fix /meet /play"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isStreaming}
          />
          <div className="command-actions">
            <span className="kbd-hint">↵ ask</span>
            {mode !== 'meeting' && <span className="kbd-hint">^↵ +screen</span>}
            <button
              className="submit-btn"
              onClick={onSubmit}
              disabled={isStreaming || !query.trim()}
            >
              ASK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
