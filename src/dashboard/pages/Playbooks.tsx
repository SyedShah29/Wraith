import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useDashboardStore } from '../../store'
import { IPC } from '../../shared/constants'
import type { Playbook, AppMode } from '../../shared/types'

export default function Playbooks() {
  const { playbooks, setPlaybooks } = useDashboardStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const savePlaybook = async (pb: Playbook) => {
    const updated = playbooks.map(p => p.id === pb.id ? pb : p)
    setPlaybooks(updated)
    await invoke(IPC.SAVE_PLAYBOOK, { playbook: pb }).catch(() => {})
    setEditingId(null)
  }

  const createPlaybook = async () => {
    if (!newName.trim()) return
    const pb: Playbook = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      content: newContent.trim(),
      tags: [],
      active: true,
      autoApplyModes: ['focus', 'interview', 'meeting'] as AppMode[],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const updated = [...playbooks, pb]
    setPlaybooks(updated)
    await invoke(IPC.SAVE_PLAYBOOK, { playbook: pb }).catch(() => {})
    setNewName('')
    setNewContent('')
    setIsCreating(false)
  }

  const deletePlaybook = async (id: string) => {
    const updated = playbooks.filter(p => p.id !== id)
    setPlaybooks(updated)
    await invoke(IPC.DELETE_PLAYBOOK, { id }).catch(() => {})
  }

  const toggleActive = async (pb: Playbook) => {
    await savePlaybook({ ...pb, active: !pb.active })
  }

  return (
    <>
      <div className="dash-page-title">PLAYBOOKS</div>

      <div className="setting-desc">
        Playbooks are context documents injected into every AI prompt. Use them for job descriptions, meeting agendas, personal notes, or coding context.
      </div>

      {/* Create new */}
      {isCreating ? (
        <div className="card" style={{ gap: 12 }}>
          <div className="card-title">NEW PLAYBOOK</div>
          <input
            className="setting-input"
            placeholder="Playbook name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            autoFocus
          />
          <textarea
            className="setting-input setting-textarea"
            placeholder="Paste content, notes, job description, or anything the AI should know..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            style={{ minHeight: 120 }}
          />
          <div className="card-actions">
            <button className="action-btn primary" onClick={createPlaybook}>CREATE</button>
            <button className="action-btn" onClick={() => setIsCreating(false)}>CANCEL</button>
          </div>
        </div>
      ) : (
        <button className="action-btn primary" onClick={() => setIsCreating(true)}>
          + NEW PLAYBOOK
        </button>
      )}

      {/* Playbook list */}
      {playbooks.length === 0 ? (
        <div style={{ color: 'var(--ghost-muted)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em' }}>
          NO PLAYBOOKS — create one above.
        </div>
      ) : (
        <div className="card-grid" style={{ gridTemplateColumns: '1fr' }}>
          {playbooks.map(pb => (
            <div key={pb.id} className={`card ${pb.active ? 'active-card' : ''}`}>
              {editingId === pb.id ? (
                <PlaybookEditor playbook={pb} onSave={savePlaybook} onCancel={() => setEditingId(null)} />
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="card-title" style={{ flex: 1 }}>{pb.name}</div>
                    <label className="toggle">
                      <input type="checkbox" checked={pb.active} onChange={() => toggleActive(pb)} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  <div className="card-subtitle" style={{
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {pb.content || '(empty)'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ghost-muted)', letterSpacing: '0.1em' }}>
                    {pb.content.length} CHARS · {new Date(pb.updatedAt).toLocaleDateString()}
                  </div>
                  <div className="card-actions">
                    <button className="action-btn" onClick={() => setEditingId(pb.id)}>EDIT</button>
                    <button className="action-btn danger" onClick={() => deletePlaybook(pb.id)}>DELETE</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function PlaybookEditor({ playbook, onSave, onCancel }: {
  playbook: Playbook
  onSave: (pb: Playbook) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(playbook.name)
  const [content, setContent] = useState(playbook.content)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        className="setting-input"
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
      />
      <textarea
        className="setting-input setting-textarea"
        value={content}
        onChange={e => setContent(e.target.value)}
        style={{ minHeight: 120 }}
      />
      <div className="card-actions">
        <button
          className="action-btn primary"
          onClick={() => onSave({ ...playbook, name, content, updatedAt: Date.now() })}
        >
          SAVE
        </button>
        <button className="action-btn" onClick={onCancel}>CANCEL</button>
      </div>
    </div>
  )
}
