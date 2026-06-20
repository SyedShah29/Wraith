import { invoke } from '@tauri-apps/api/core'
import { useDashboardStore } from '../../store'
import { FREE_MODELS } from '../../shared/constants'
import { IPC } from '../../shared/constants'

export default function Models() {
  const { settings, setSettings } = useDashboardStore()

  const selectModel = async (modelId: string, provider: string) => {
    const updated = {
      ...settings,
      selectedModel: modelId,
      selectedProvider: provider as any,
    }
    setSettings(updated)
    await invoke(IPC.SET_SETTINGS, { settings: updated }).catch(() => {})
  }

  return (
    <>
      <div className="dash-page-title">MODELS</div>

      <div>
        <div className="settings-section-title" style={{ marginBottom: 12 }}>FREE MODELS</div>
        <div className="card-grid" style={{ gridTemplateColumns: '1fr' }}>
          {FREE_MODELS.map(model => {
            const isActive = settings.selectedModel === model.id
            return (
              <div
                key={model.id}
                className={`card ${isActive ? 'active-card' : ''}`}
                style={{ cursor: 'pointer', flexDirection: 'row', alignItems: 'center' }}
                onClick={() => selectModel(model.id, model.provider)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div className="card-title">{model.name}</div>
                    <span className={`provider-badge ${model.provider}`}>{model.provider.toUpperCase()}</span>
                    {model.isFree && <span className="free-badge">FREE</span>}
                  </div>
                  <div className="card-subtitle">{model.description}</div>
                  <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ghost-muted)', letterSpacing: '0.1em' }}>
                    {(model.contextLength / 1000).toFixed(0)}K CONTEXT
                  </div>
                </div>
                <div style={{
                  width: 8, height: 8, borderRadius: 0,
                  background: isActive ? 'var(--acid)' : 'var(--void-5)',
                  flexShrink: 0, marginLeft: 12,
                }} />
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div className="settings-section-title" style={{ marginBottom: 8 }}>PROVIDER API KEYS</div>
        <div className="setting-desc" style={{ marginBottom: 12 }}>
          Get free keys: <strong style={{ color: 'var(--ghost)' }}>console.groq.com</strong> · <strong style={{ color: 'var(--ghost)' }}>aistudio.google.com</strong> · <strong style={{ color: 'var(--ghost)' }}>console.mistral.ai</strong>
        </div>
        <div className="settings-section">
          {settings.providers.map((p, i) => (
            <div key={p.id} className="setting-row">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`provider-badge ${p.id}`}>{p.id.toUpperCase()}</span>
                <span className="setting-label">{p.name} API Key</span>
              </div>
              <input
                type="password"
                className="setting-input"
                placeholder={`Enter your ${p.name} API key...`}
                value={p.apiKey}
                onChange={async (e) => {
                  const updated = {
                    ...settings,
                    providers: settings.providers.map((pr, idx) =>
                      idx === i ? { ...pr, apiKey: e.target.value, enabled: e.target.value.length > 0 } : pr,
                    ),
                  }
                  setSettings(updated)
                  await invoke(IPC.SET_SETTINGS, { settings: updated }).catch(() => {})
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
