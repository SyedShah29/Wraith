import { useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import Pill from './Pill'
import CommandPanel from './CommandPanel'
import { useOverlayStore, useDashboardStore } from '../store'
import { streamAI, transcribeAudio } from '../services/ai-router'
import { detectClipboardIntent, clipboardPromptFor, VoiceActivityDetector, detectModeFromApp } from '../services/context'
import { IPC, MODES } from '../shared/constants'
import type { Message, Settings, Thread, TranscriptSegment } from '../shared/types'

let abortController: AbortController | null = null
const vad = new VoiceActivityDetector()

export default function OverlayApp() {
  const {
    isExpanded, isVisible, mode, query, messages, settings, isRecording,
    transcript, streamContent, isStreaming, clipboardSuggestion,
    setExpanded, setMode, setQuery, setStreaming, appendStream, clearStream,
    addMessage, setRecording, addTranscript, setSettings, setClipboardSuggestion,
    clearTranscript,
  } = useOverlayStore()

  const abortRef = useRef<AbortController | null>(null)
  const autoModeRef = useRef(settings.autoMode)

  useEffect(() => {
    autoModeRef.current = settings.autoMode
  }, [settings.autoMode])

  // ─── Load settings on mount ────────────────────────────────────────────────
  useEffect(() => {
    invoke<Settings>(IPC.GET_SETTINGS).then(s => {
      if (s) setSettings(s)
    }).catch(() => {})
  }, [])

  // ─── Listen for global events from Tauri ──────────────────────────────────
  useEffect(() => {
    const unlisten: Array<() => void> = []

    listen<boolean>('wraith://toggle-overlay', () => {
      setExpanded(!isExpanded)
    }).then(u => unlisten.push(u))

    listen<{ query: string; includeScreenshot: boolean }>('wraith://ask', async (e) => {
      setExpanded(true)
      if (e.payload.query) setQuery(e.payload.query)
      await handleSubmit(e.payload.query, e.payload.includeScreenshot)
    }).then(u => unlisten.push(u))

    // Re-sync settings whenever dashboard saves them
    listen<Settings>('wraith://settings-changed', (e) => {
      if (e.payload) setSettings(e.payload)
    }).then(u => unlisten.push(u))

    return () => { unlisten.forEach(u => u()) }
  }, [isExpanded]) // minimal dependencies

  // ─── Auto-mode detection ──────────────────────────────────────────────────
  useEffect(() => {
    const unlisten: Array<() => void> = []

    listen<{ app_name: string, title: string }>('wraith://active-app', (e) => {
      console.log('[WRAITH] active-app event received:', e.payload)
      if (e.payload.app_name.toLowerCase().includes('wraith')) {
        console.log('[WRAITH] Ignoring self (Wraith window)')
        return
      }
      const detected = detectModeFromApp(e.payload)
      console.log('[WRAITH] autoMode:', autoModeRef.current, '→ detected mode:', detected)
      if (autoModeRef.current) {
        setMode(detected)
      }
    }).then(u => unlisten.push(u))

    return () => { unlisten.forEach(u => u()) }
  }, [])

  // ─── Clipboard watcher ─────────────────────────────────────────────────────
  useEffect(() => {
    let prev = ''
    const interval = setInterval(async () => {
      try {
        const text = await invoke<string>('get_clipboard')
        if (text && text !== prev && text.length > 10 && text.length < 5000) {
          prev = text
          const intent = detectClipboardIntent(text)
          if (intent === 'code' || intent === 'error') {
            setClipboardSuggestion(clipboardPromptFor(intent, text))
          }
        }
      } catch { /* clipboard access may fail */ }
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // ─── Handle ask submit ────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (overrideQuery?: string, overrideIncludeScreenshot?: boolean) => {
    let q = (overrideQuery ?? query).trim()
    let includeScreenshot = overrideIncludeScreenshot ?? false

    // ─── Parse Slash Commands ───────────────────────────────────────────────
    if (q.startsWith('/ask ')) {
      includeScreenshot = true
      q = q.replace('/ask ', '').trim()
    } else if (q.startsWith('/code ')) {
      setMode('focus')
      q = q.replace('/code ', '').trim()
      q = `Code generation request: ${q}`
    } else if (q.startsWith('/meet ')) {
      setMode('meeting')
      q = q.replace('/meet ', '').trim()
    } else if (q.startsWith('/clip ')) {
      q = q.replace('/clip ', '').trim()
      try {
        const text = await invoke<string>('get_clipboard')
        q = `Analyze this clipboard content:\n${text}\n\nUser request: ${q}`
      } catch { /* ignore */ }
    }

    if (mode === 'meeting') {
      includeScreenshot = false
    }

    if (!q && !includeScreenshot) return

    // Build context
    let contextText = ''
    if (includeScreenshot) {
      try {
        const capture = await invoke<any>(IPC.CAPTURE_SCREEN)
        let b64 = ''
        let txt = ''
        if (typeof capture === 'string') {
          b64 = capture
        } else {
          b64 = capture.base64
          txt = capture.text
        }
        
        contextText = `[SCREEN CONTEXT]\n${b64}\n`
        if (txt) {
          contextText += `\n[OCR EXTRACTED TEXT FROM SCREEN]\n${txt}\n`
        }
      } catch { /* OCR unavailable */ }
    }

    const transcriptText = transcript.slice(-10).map(s => s.text).join(' ')
    const modeCfg = MODES.find(m => m.id === mode)!

    const userContent = [
      contextText ? `[SCREEN CONTEXT]\n${contextText}\n\n` : '',
      transcriptText ? `[AUDIO TRANSCRIPT]\n${transcriptText}\n\n` : '',
      q.trim(),
    ].filter(Boolean).join('')

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: q.trim() || '(screenshot context)',
      timestamp: Date.now(),
    }
    addMessage(userMsg)
    setQuery('')
    clearStream()
    setStreaming(true)

    // Inject active playbooks
    const activePlaybooks = useDashboardStore.getState().playbooks.filter(p => p.active)
    let playbooksContext = ''
    if (activePlaybooks.length > 0) {
      playbooksContext = '[ACTIVE PLAYBOOKS (Context)]\n' + activePlaybooks.map(p => `--- ${p.name} ---\n${p.content}`).join('\n\n') + '\n\n'
    }

    const systemMsg = {
      role: 'system',
      content: playbooksContext + settings.systemPrompt + '\n\n' + modeCfg.systemPromptSuffix,
    }

    const historyMsgs = [...messages, userMsg].slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }))

    const allMsgs = [systemMsg, ...historyMsgs.slice(0, -1), { role: 'user', content: userContent }]

    abortRef.current = new AbortController()
    let fullContent = ''
    let finalProvider = ''

    try {
      for await (const chunk of streamAI(allMsgs, settings, abortRef.current.signal)) {
        if (chunk.error) {
          appendStream(chunk.content || chunk.error)
          break
        }
        appendStream(chunk.content, chunk.provider)
        fullContent += chunk.content
        finalProvider = chunk.provider ?? ''
        if (chunk.done) break
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        appendStream('\n\n⚠️ Stream interrupted.')
      }
    }

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: fullContent,
      timestamp: Date.now(),
      provider: finalProvider as any,
      model: settings.selectedModel,
    }
    addMessage(assistantMsg)
    setStreaming(false)

    // Save thread
    const thread: Thread = {
      id: crypto.randomUUID(),
      title: q.trim().slice(0, 60) || '(screenshot)',
      mode,
      messages: [...messages, userMsg, assistantMsg],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
    }
    invoke(IPC.SAVE_THREAD, { thread }).catch(() => {})
    clearTranscript()
  }, [query, transcript, mode, messages, settings, addMessage, setQuery, clearStream, setStreaming, appendStream, clearTranscript])

  // ─── Toggle audio recording ───────────────────────────────────────────────
  const toggleRecording = useCallback(async () => {
    if (mode === 'interview') return
    if (isRecording) {
      vad.stop()
      setRecording(false)
    } else {
      setRecording(true)
      await vad.start(
        async (blob) => {
          const groqKey = settings.providers.find(p => p.id === 'groq')?.apiKey ?? ''
          if (!groqKey) return
          const text = await transcribeAudio(blob, groqKey)
          if (text.trim()) {
            const seg: TranscriptSegment = {
              id: crypto.randomUUID(),
              text: text.trim(),
              timestamp: Date.now(),
              isFinal: true,
            }
            addTranscript(seg)
          }
        },
        (err) => {
          console.error('VAD error:', err)
          setRecording(false)
        },
      )
    }
  }, [isRecording, settings])

  if (!isVisible) return null

  return isExpanded ? (
    <CommandPanel
      onClose={() => setExpanded(false)}
      onSubmit={() => handleSubmit()}
      onSubmitWithScreenshot={() => handleSubmit(undefined, true)}
      onToggleRecording={toggleRecording}
      onClipboardAccept={() => {
        if (clipboardSuggestion) {
          setQuery(clipboardSuggestion)
          setClipboardSuggestion(null)
        }
      }}
      onClipboardDismiss={() => setClipboardSuggestion(null)}
    />
  ) : (
    <Pill onClick={() => setExpanded(true)} />
  )
}
