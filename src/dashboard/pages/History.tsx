import { useDashboardStore } from '../../store'
import { MODES } from '../../shared/constants'
import type { AppMode } from '../../shared/types'

export default function History() {
  const { threads } = useDashboardStore()

  if (threads.length === 0) {
    return (
      <>
        <div className="dash-page-title">HISTORY</div>
        <div style={{ color: 'var(--ghost-muted)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em' }}>
          NO SESSIONS YET — start a conversation in the overlay.
        </div>
      </>
    )
  }

  return (
    <>
      <div className="dash-page-title">HISTORY</div>
      <div className="card-grid" style={{ gridTemplateColumns: '1fr' }}>
        {[...threads].reverse().map(thread => {
          const modeCfg = MODES.find(m => m.id === thread.mode)!
          const firstMsg = thread.messages.find(m => m.role === 'user')
          const date = new Date(thread.createdAt)

          return (
            <div key={thread.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ghost-muted)', letterSpacing: '0.1em' }}>
                  {modeCfg.icon} {modeCfg.label}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ghost-muted)', marginLeft: 'auto', letterSpacing: '0.08em' }}>
                  {date.toLocaleDateString()} {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>
              <div className="card-title">
                {firstMsg?.content.slice(0, 80) ?? '(unnamed session)'}
                {(firstMsg?.content.length ?? 0) > 80 ? '…' : ''}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ghost-muted)', letterSpacing: '0.1em' }}>
                {thread.messages.length} MESSAGES
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
