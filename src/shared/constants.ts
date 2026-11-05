import type { AIModel, ModeConfig, Settings } from './types'

// ─── IPC Channel Names ───────────────────────────────────────────────────────
export const IPC = {
  ASK_AI: 'ask_ai',
  CANCEL_STREAM: 'cancel_stream',
  CAPTURE_SCREEN: 'capture_screen',
  TOGGLE_OVERLAY: 'toggle_overlay',
  OPEN_DASHBOARD: 'open_dashboard',
  GET_SETTINGS: 'get_settings',
  SET_SETTINGS: 'set_settings',
  GET_THREADS: 'get_threads',
  SAVE_THREAD: 'save_thread',
  DELETE_THREAD: 'delete_thread',
  GET_PLAYBOOKS: 'get_playbooks',
  SAVE_PLAYBOOK: 'save_playbook',
  DELETE_PLAYBOOK: 'delete_playbook',
  GET_ACTIVE_APP: 'get_active_app',
  START_AUDIO: 'start_audio',
  STOP_AUDIO: 'stop_audio',
  GET_TRANSCRIPT: 'get_transcript',
  CLEAR_TRANSCRIPT: 'clear_transcript',
} as const

// ─── Default Settings ────────────────────────────────────────────────────────
export const DEFAULT_SETTINGS: Settings = {
  providers: [
    { id: 'groq', name: 'Groq', apiKey: '', baseUrl: 'https://api.groq.com/openai/v1', enabled: true },
    { id: 'gemini', name: 'Google Gemini', apiKey: '', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', enabled: true },
    { id: 'mistral', name: 'Mistral', apiKey: '', baseUrl: 'https://api.mistral.ai/v1', enabled: false },
    { id: 'openrouter', name: 'OpenRouter', apiKey: '', baseUrl: 'https://openrouter.ai/api/v1', enabled: false },
  ],
  selectedModel: 'llama-3.3-70b-versatile',
  selectedProvider: 'groq',
  overlayOpacity: 0.95,
  overlayPosition: { x: 20, y: 20 },
  systemPrompt: `You are Wraith, a razor-sharp AI copilot running invisibly on the user's screen.
Be concise. Be precise. Prioritize actionable answers.
When given code: explain what's wrong first, then fix it.
When given a question in an interview context: give the best answer clearly, then explain reasoning briefly.
Format responses in clean markdown. Use code blocks for code.`,
  hotkeys: {
    askWithContext: 'CmdOrCtrl+Enter',
    askWithScreenshot: 'CmdOrCtrl+Shift+Enter',
    toggleOverlay: 'CmdOrCtrl+Backslash',
    toggleRecording: 'CmdOrCtrl+Shift+Space',
    openDashboard: 'CmdOrCtrl+Shift+W',
  },
  autoMode: true,
  whisperProvider: 'groq',
  theme: 'dark',
}

// ─── Free AI Models ──────────────────────────────────────────────────────────
export const FREE_MODELS: AIModel[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    provider: 'groq',
    contextLength: 128000,
    isFree: true,
    description: 'Best overall. Fast, smart, great for interviews + code.',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B (Instant)',
    provider: 'groq',
    contextLength: 128000,
    isFree: true,
    description: 'Fastest response. Use when speed is critical.',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    contextLength: 1000000,
    isFree: true,
    description: 'Huge context window. Best for long meetings + documents.',
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    provider: 'gemini',
    contextLength: 1000000,
    isFree: true,
    description: 'Ultra-fast Gemini. Zero cost.',
  },
  {
    id: 'mistral-small-latest',
    name: 'Mistral Small 3.1',
    provider: 'mistral',
    contextLength: 128000,
    isFree: true,
    description: 'Excellent at code and technical reasoning.',
  },
]

// ─── Modes ───────────────────────────────────────────────────────────────────
export const MODES: ModeConfig[] = [
  {
    id: 'interview',
    label: 'INTERVIEW',
    icon: '◈',
    systemPromptSuffix: 'The user is in a technical interview. Provide direct, correct answers. For coding problems, give optimal solutions with time/space complexity. Be concise.',
  },
  {
    id: 'meeting',
    label: 'MEETING',
    icon: '◉',
    systemPromptSuffix: 'The user is in a meeting. Extract key decisions, action items, and insights. Be brief. Format action items as "- [ ] Task (Owner)".',
  },
  {
    id: 'focus',
    label: 'FOCUS',
    icon: '◎',
    systemPromptSuffix: 'General productivity mode. Help the user efficiently.',
  },
]

// ─── App detection patterns → Mode triggers ──────────────────────────────────
export const APP_MODE_TRIGGERS: Record<string, string> = {
  'zoom.exe': 'meeting',
  'teams.exe': 'meeting',
  'slack.exe': 'meeting',
  'discord.exe': 'meeting',
  'chrome.exe': 'focus',
  'code.exe': 'interview',
  'cursor.exe': 'interview',
  'windsurf.exe': 'interview',
}
