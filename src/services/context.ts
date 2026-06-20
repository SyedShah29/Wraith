import type { AppMode } from '../shared/types'
import { APP_MODE_TRIGGERS } from '../shared/constants'

// ─── VAD: Voice Activity Detection ──────────────────────────────────────────
export class VoiceActivityDetector {
  private audioCtx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private stream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private silenceTimer: ReturnType<typeof setTimeout> | null = null
  private isRecording = false
  private SILENCE_THRESHOLD = 15
  private SILENCE_DURATION_MS = 1500

  async start(
    onSegment: (blob: Blob) => void,
    onError: (err: string) => void,
  ): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.audioCtx = new AudioContext()
      this.analyser = this.audioCtx.createAnalyser()
      this.analyser.fftSize = 512
      this.source = this.audioCtx.createMediaStreamSource(this.stream)
      this.source.connect(this.analyser)

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' })
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data)
      }
      this.mediaRecorder.onstop = () => {
        if (this.chunks.length > 0) {
          onSegment(new Blob(this.chunks, { type: 'audio/webm' }))
          this.chunks = []
        }
      }

      this.pollVAD(onSegment)
    } catch (err) {
      onError(String(err))
    }
  }

  private pollVAD(_onSegment: (blob: Blob) => void): void {
    if (!this.analyser) return
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    const check = () => {
      if (!this.analyser) return
      this.analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length

      if (avg > this.SILENCE_THRESHOLD) {
        // Speech detected
        if (!this.isRecording && this.mediaRecorder) {
          this.isRecording = true
          this.chunks = []
          this.mediaRecorder.start()
        }
        if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null }
      } else {
        // Silence detected
        if (this.isRecording && !this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            this.isRecording = false
            this.mediaRecorder?.stop()
          }, this.SILENCE_DURATION_MS)
        }
      }
      requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  }

  stop(): void {
    if (this.isRecording) this.mediaRecorder?.stop()
    this.stream?.getTracks().forEach(t => t.stop())
    this.audioCtx?.close()
    this.analyser = null
    this.source = null
    this.stream = null
    this.isRecording = false
    if (this.silenceTimer) clearTimeout(this.silenceTimer)
  }
}

// ─── Mode detection from active app ──────────────────────────────────────────
export function detectModeFromApp(app: { app_name: string, title: string }): AppMode {
  const exe = (app.app_name || '').toLowerCase()
  const title = (app.title || '').toLowerCase()
  for (const [pattern, mode] of Object.entries(APP_MODE_TRIGGERS)) {
    const key = pattern.replace('.exe', '').toLowerCase()
    if (exe.includes(key) || title.includes(key)) return mode as AppMode
  }
  return 'focus'
}

// ─── Clipboard intelligence ───────────────────────────────────────────────────
export type ClipboardIntent = 'code' | 'error' | 'url' | 'text' | null

export function detectClipboardIntent(text: string): ClipboardIntent {
  if (!text || text.length < 5) return null
  if (text.startsWith('http://') || text.startsWith('https://')) return 'url'
  if (/^(Error|TypeError|SyntaxError|Exception|Traceback|at .+:\d+)/m.test(text)) return 'error'
  if (/^(function|const|let|var|def |class |import |export |#include|public |private )/.test(text.trim())) return 'code'
  if (text.includes('\n') && (text.includes('{') || text.includes('='))) return 'code'
  return 'text'
}

export function clipboardPromptFor(intent: ClipboardIntent, text: string): string {
  switch (intent) {
    case 'code': return `Analyze this code:\n\`\`\`\n${text}\n\`\`\`\nExplain what it does, identify any bugs or improvements.`
    case 'error': return `I got this error:\n\`\`\`\n${text}\n\`\`\`\nWhat does it mean and how do I fix it?`
    case 'url': return `Summarize what this URL likely contains and what I should know about it: ${text}`
    default: return `Help me with this: ${text}`
  }
}
