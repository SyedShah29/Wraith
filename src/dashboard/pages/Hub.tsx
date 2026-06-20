import { useDashboardStore } from '../../store'
import { FREE_MODELS } from '../../shared/constants'

export default function Hub() {
  const { threads, settings } = useDashboardStore()
  const totalSessions = threads.length
  const hasKey = settings.providers.some(p => p.apiKey.trim())
  const activeModel = FREE_MODELS.find(m => m.id === settings.selectedModel)

  const setupSteps = [
    {
      label: 'Install WRAITH',
      desc: 'You\'re here. App is running.',
      done: true,
    },
    {
      label: 'Add a free API key',
      desc: 'Go to Settings → Providers. Get a free Groq key at console.groq.com (no credit card).',
      done: hasKey,
    },
    {
      label: 'Select your model',
      desc: 'Go to Models and pick one. Llama 3.3 70B via Groq is recommended to start.',
      done: !!activeModel,
    },
    {
      label: 'Use the overlay',
      desc: 'Press Ctrl+\\ to toggle. Ctrl+Enter to ask with screen context. Ctrl+Shift+Space for audio.',
      done: totalSessions > 0,
    },
  ]

  return (
    <>
      <div className="dash-page-title">HUB</div>

      {/* Stats */}
      <div className="hub-stats">
        <div className="stat-box">
          <div className="stat-value">{totalSessions}</div>
          <div className="stat-label">SESSIONS</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{hasKey ? 'ON' : 'OFF'}</div>
          <div className="stat-label">AI STATUS</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ fontSize: 14 }}>
            {activeModel ? activeModel.name.split(' ').slice(0, 2).join(' ') : '—'}
          </div>
          <div className="stat-label">ACTIVE MODEL</div>
        </div>
      </div>

      {/* Setup checklist */}
      <div>
        <div className="settings-section-title" style={{ marginBottom: 12 }}>QUICK SETUP</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {setupSteps.map((step, i) => (
            <div key={i} className="onboarding-step">
              <div className={`step-number ${step.done ? 'done' : ''}`}>
                {step.done ? '✓' : i + 1}
              </div>
              <div className="step-content">
                <div className="step-title">{step.label}</div>
                <div className="step-desc">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hotkeys */}
      <div>
        <div className="settings-section-title" style={{ marginBottom: 12 }}>HOTKEYS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['Ctrl+\\', 'Toggle overlay'],
            ['Ctrl+Enter', 'Ask AI (screen context)'],
            ['Ctrl+Shift+Enter', 'Ask AI (with screenshot)'],
            ['Ctrl+Shift+Space', 'Toggle audio recording'],
            ['Ctrl+Shift+W', 'Open this dashboard'],
          ].map(([key, desc]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="kbd-hint" style={{ minWidth: 160 }}>{key}</span>
              <span className="setting-desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
