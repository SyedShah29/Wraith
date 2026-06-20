// ─── AI Providers ────────────────────────────────────────────────────────────
export type Provider = 'groq' | 'gemini' | 'mistral' | 'openrouter'

export interface ProviderConfig {
  id: Provider
  name: string
  apiKey: string
  baseUrl: string
  enabled: boolean
}

export interface AIModel {
  id: string
  name: string
  provider: Provider
  contextLength: number
  isFree: boolean
  description: string
}

// ─── Modes ───────────────────────────────────────────────────────────────────
export type AppMode = 'interview' | 'meeting' | 'focus'

export interface ModeConfig {
  id: AppMode
  label: string
  icon: string
  systemPromptSuffix: string
}

// ─── Messages & Threads ──────────────────────────────────────────────────────
export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  tokenCount?: number
  model?: string
  provider?: Provider
}

export interface Thread {
  id: string
  title: string
  mode: AppMode
  messages: Message[]
  createdAt: number
  updatedAt: number
  tags: string[]
}

// ─── Playbooks ───────────────────────────────────────────────────────────────
export interface Playbook {
  id: string
  name: string
  content: string
  tags: string[]
  active: boolean
  autoApplyModes: AppMode[]
  sourceUrl?: string
  createdAt: number
  updatedAt: number
}

// ─── Transcript ───────────────────────────────────────────────────────────────
export interface TranscriptSegment {
  id: string
  text: string
  timestamp: number
  isFinal: boolean
}

// ─── Action Items (Meeting Mode) ──────────────────────────────────────────────
export interface ActionItem {
  id: string
  text: string
  owner?: string
  isDone: boolean
  extractedAt: number
}

// ─── Settings ────────────────────────────────────────────────────────────────
export interface Settings {
  providers: ProviderConfig[]
  selectedModel: string
  selectedProvider: Provider
  overlayOpacity: number
  overlayPosition: { x: number; y: number }
  systemPrompt: string
  hotkeys: {
    askWithContext: string
    askWithScreenshot: string
    toggleOverlay: string
    toggleRecording: string
    openDashboard: string
  }
  autoMode: boolean
  whisperProvider: 'groq' | 'openai'
  theme: 'dark'
}

// ─── IPC Payloads ────────────────────────────────────────────────────────────
export interface AskPayload {
  query: string
  includeScreenshot: boolean
  mode: AppMode
}

export interface StreamChunk {
  content: string
  done: boolean
  model?: string
  provider?: Provider
  error?: string
}

// ─── App State ───────────────────────────────────────────────────────────────
export interface AppInfo {
  name: string
  exe: string
  context: string
}
