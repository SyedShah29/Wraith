import type { TranscriptSegment } from '../shared/types'

interface TranscriptBarProps {
  segments: TranscriptSegment[]
}

export default function TranscriptBar({ segments }: TranscriptBarProps) {
  const latest = segments.slice(-3).map(s => s.text).join(' … ')

  return (
    <div className="transcript-bar">
      <span className="transcript-label">◉ MIC</span>
      <span className="transcript-text">{latest}</span>
    </div>
  )
}
