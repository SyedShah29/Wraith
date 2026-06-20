import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useDashboardStore } from '../../store'
import { IPC } from '../../shared/constants'
import type { Settings } from '../../shared/types'

export default function Settings() {
  const { settings, setSettings } = useDashboardStore()
  const [local, setLocal] = useState<Settings>(settings)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setSettings(local)
    await invoke(IPC.SET_SETTINGS, { settings: local }).catch(() => {})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const update = (patch: Partial<Settings>) => setLocal(s => ({ ...s, ...patch }))

  return (
    <>
      <div className="dash-page-title">SETTINGS</div>

      {/* Overlay */}
      <div className="settings-section">
        <div className="settings-section-title">OVERLAY</div>

        <div className="setting-row">
          <label className="setting-label">Opacity</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="range"
              min={0.4}
              max={1}
              step={0.05}
              value={local.overlayOpacity}
              onChange={e => update({ overlayOpacity: parseFloat(e.target.value) })}
              style={{ flex: 1, accentColor: 'var(--acid)' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ghost-dim)', minWidth: 36 }}>
              {Math.round(local.overlayOpacity * 100)}%
            </span>
          </div>
        </div>

        <div className="setting-row">
          <label className="setting-label">Auto-detect mode</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label className="toggle">
              <input
                type="checkbox"
                checked={local.autoMode}
                onChange={e => update({ autoMode: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
            <span className="setting-desc">Automatically switch between Interview/Meeting/Focus based on active app</span>
          </div>
        </div>
      </div>

      {/* AI */}
      <div className="settings-section">
        <div className="settings-section-title">AI SYSTEM PROMPT</div>
        <div className="setting-row">
          <label className="setting-label">System prompt</label>
          <textarea
            className="setting-input setting-textarea"
            value={local.systemPrompt}
            onChange={e => update({ systemPrompt: e.target.value })}
            style={{ minHeight: 140 }}
          />
        </div>
      </div>

      {/* Hotkeys */}
      <div className="settings-section">
        <div className="settings-section-title">HOTKEYS</div>
        <div className="setting-desc" style={{ marginBottom: 8 }}>
          Restart required after changing hotkeys.
        </div>
        {Object.entries(local.hotkeys).map(([key, value]) => (
          <div className="setting-row" key={key}>
            <label className="setting-label">{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</label>
            <input
              className="setting-input"
              value={value}
              onChange={e => update({ hotkeys: { ...local.hotkeys, [key]: e.target.value } })}
              placeholder="e.g. CmdOrCtrl+Enter"
            />
          </div>
        ))}
      </div>

      <button className="save-btn" onClick={save}>
        {saved ? '✓ SAVED' : 'SAVE CHANGES'}
      </button>
    </>
  )
}
