import { useOverlayStore } from '../store'
import { MODES } from '../shared/constants'

interface PillProps {
  onClick: () => void
}

export default function Pill({ onClick }: PillProps) {
  const { mode, isStreaming, isRecording } = useOverlayStore()
  const modeCfg = MODES.find(m => m.id === mode)!

  return (
    <div className="wraith-pill" onClick={onClick} title="Click to open Wraith (Ctrl+\)">
      <span className="pill-logo">WRAITH</span>
      <span className="pill-mode">{modeCfg.icon} {modeCfg.label}</span>
      <div className="pill-status">
        <div className={`status-dot ${isRecording ? 'recording' : isStreaming ? 'active' : ''}`} />
      </div>
    </div>
  )
}
