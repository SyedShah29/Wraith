import { create } from 'zustand'
import type { AppMode, Message, Playbook, Settings, Thread, TranscriptSegment } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/constants'

// ─── Overlay Store ────────────────────────────────────────────────────────────
interface OverlayState {
  // UI state
  isExpanded: boolean
  isVisible: boolean
  mode: AppMode
  query: string
  isStreaming: boolean
  streamContent: string
  streamProvider: string

  // Conversation
  messages: Message[]
  activeThread: Thread | null

  // Audio / transcript
  isRecording: boolean
  transcript: TranscriptSegment[]

  // Settings
  settings: Settings

  // Clipboard suggestion
  clipboardSuggestion: string | null

  // Actions
  setExpanded: (v: boolean) => void
  setVisible: (v: boolean) => void
  setMode: (m: AppMode) => void
  setQuery: (q: string) => void
  setStreaming: (v: boolean) => void
  appendStream: (chunk: string, provider?: string) => void
  clearStream: () => void
  addMessage: (msg: Message) => void
  clearMessages: () => void
  setRecording: (v: boolean) => void
  addTranscript: (seg: TranscriptSegment) => void
  clearTranscript: () => void
  setSettings: (s: Settings) => void
  setClipboardSuggestion: (s: string | null) => void
}

export const useOverlayStore = create<OverlayState>((set) => ({
  isExpanded: false,
  isVisible: true,
  mode: 'focus',
  query: '',
  isStreaming: false,
  streamContent: '',
  streamProvider: '',
  messages: [],
  activeThread: null,
  isRecording: false,
  transcript: [],
  settings: DEFAULT_SETTINGS,
  clipboardSuggestion: null,

  setExpanded: (v) => set({ isExpanded: v }),
  setVisible: (v) => set({ isVisible: v }),
  setMode: (m) => set({ mode: m }),
  setQuery: (q) => set({ query: q }),
  setStreaming: (v) => set({ isStreaming: v }),
  appendStream: (chunk, provider) =>
    set((s) => ({ streamContent: s.streamContent + chunk, streamProvider: provider ?? s.streamProvider })),
  clearStream: () => set({ streamContent: '', streamProvider: '' }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [], activeThread: null }),
  setRecording: (v) => set({ isRecording: v }),
  addTranscript: (seg) => set((s) => ({ transcript: [...s.transcript.slice(-20), seg] })),
  clearTranscript: () => set({ transcript: [] }),
  setSettings: (settings) => set({ settings }),
  setClipboardSuggestion: (s) => set({ clipboardSuggestion: s }),
}))

// ─── Dashboard Store ──────────────────────────────────────────────────────────
interface DashboardState {
  page: 'hub' | 'models' | 'playbooks' | 'history' | 'settings'
  threads: Thread[]
  playbooks: Playbook[]
  settings: Settings
  setPage: (p: DashboardState['page']) => void
  setThreads: (t: Thread[]) => void
  setPlaybooks: (p: Playbook[]) => void
  setSettings: (s: Settings) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  page: 'hub',
  threads: [],
  playbooks: [],
  settings: DEFAULT_SETTINGS,
  setPage: (page) => set({ page }),
  setThreads: (threads) => set({ threads }),
  setPlaybooks: (playbooks) => set({ playbooks }),
  setSettings: (settings) => set({ settings }),
}))
