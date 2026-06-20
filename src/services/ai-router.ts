import type { Provider, Settings, StreamChunk } from '../shared/types'

// ─── Route: Pick best available provider ─────────────────────────────────────
function pickProvider(settings: Settings): { provider: Provider; apiKey: string; baseUrl: string } | null {
  const order: Provider[] = ['groq', 'gemini', 'mistral', 'openrouter']
  for (const id of order) {
    const cfg = settings.providers.find(p => p.id === id && p.enabled && p.apiKey.trim())
    if (cfg) return { provider: cfg.id, apiKey: cfg.apiKey, baseUrl: cfg.baseUrl }
  }
  return null
}

// ─── Groq streaming ──────────────────────────────────────────────────────────
async function* streamGroq(
  messages: { role: string; content: string }[],
  model: string,
  apiKey: string,
  signal: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const cleanMessages = messages.map(m => ({
    role: m.role,
    content: m.content.replace(/\[SCREEN CONTEXT\]\ndata:image\/[^;]+;base64,[^\n]+/, '[SCREEN CONTEXT: Image omitted, model is text-only]')
  }))

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: cleanMessages, stream: true, max_tokens: 2048 }),
    signal,
  })

  if (!res.ok) {
    const err = await res.text()
    yield { content: '', done: true, error: `Groq error: ${res.status} ${err}` }
    return
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') { yield { content: '', done: true, provider: 'groq' }; return }
      try {
        const json = JSON.parse(data)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) yield { content: delta, done: false, provider: 'groq' }
      } catch { /* skip malformed */ }
    }
  }
  yield { content: '', done: true, provider: 'groq' }
}

// ─── Gemini streaming ────────────────────────────────────────────────────────
async function* streamGemini(
  messages: { role: string; content: string }[],
  model: string,
  apiKey: string,
  signal: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => {
      const parts: any[] = []
      // Look for [SCREEN CONTEXT]\ndata:image/png;base64,...
      const imgMatch = m.content.match(/\[SCREEN CONTEXT\]\n(data:image\/[^;]+;base64,[^\n]+)/)
      let text = m.content
      
      if (imgMatch) {
        const fullDataUrl = imgMatch[1]
        const mimeType = fullDataUrl.split(';')[0].split(':')[1]
        const base64Data = fullDataUrl.split(',')[1]
        
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        })
        text = text.replace(imgMatch[0], '[SCREEN CONTEXT: Image attached]')
      }
      
      parts.push({ text })
      return { role: m.role === 'assistant' ? 'model' : 'user', parts }
    })

  const systemInstruction = messages.find(m => m.role === 'system')?.content

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
      generationConfig: { maxOutputTokens: 2048 },
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.text()
    yield { content: '', done: true, error: `Gemini error: ${res.status} ${err}` }
    return
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      try {
        const json = JSON.parse(data)
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) yield { content: text, done: false, provider: 'gemini' }
        if (json.candidates?.[0]?.finishReason) { yield { content: '', done: true, provider: 'gemini' }; return }
      } catch { /* skip */ }
    }
  }
  yield { content: '', done: true, provider: 'gemini' }
}

// ─── Mistral streaming ───────────────────────────────────────────────────────
async function* streamMistral(
  messages: { role: string; content: string }[],
  model: string,
  apiKey: string,
  signal: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const cleanMessages = messages.map(m => ({
    role: m.role,
    content: m.content.replace(/\[SCREEN CONTEXT\]\ndata:image\/[^;]+;base64,[^\n]+/, '[SCREEN CONTEXT: Image omitted, model is text-only]')
  }))

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: cleanMessages, stream: true, max_tokens: 2048 }),
    signal,
  })

  if (!res.ok) {
    yield { content: '', done: true, error: `Mistral error: ${res.status}` }
    return
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') { yield { content: '', done: true, provider: 'mistral' }; return }
      try {
        const json = JSON.parse(data)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) yield { content: delta, done: false, provider: 'mistral' }
      } catch { /* skip */ }
    }
  }
  yield { content: '', done: true, provider: 'mistral' }
}

// ─── Public: stream AI response ──────────────────────────────────────────────
export async function* streamAI(
  messages: { role: string; content: string }[],
  settings: Settings,
  signal: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const route = pickProvider(settings)

  if (!route) {
    yield {
      content: '⚠️ **No API key configured.** Open the Wraith dashboard (Ctrl+Shift+W) → Settings → add a free Groq or Gemini API key to get started.',
      done: true,
      error: 'no_provider',
    }
    return
  }

  const { provider, apiKey } = route
  const model = settings.selectedModel

  if (provider === 'groq') {
    yield* streamGroq(messages, model, apiKey, signal)
  } else if (provider === 'gemini') {
    yield* streamGemini(messages, model, apiKey, signal)
  } else if (provider === 'mistral') {
    yield* streamMistral(messages, model, apiKey, signal)
  } else {
    // OpenRouter (same format as OpenAI/Groq)
    yield* streamGroq(messages, model, apiKey, signal)
  }
}

// ─── Whisper transcription via Groq ─────────────────────────────────────────
export async function transcribeAudio(audioBlob: Blob, apiKey: string): Promise<string> {
  const form = new FormData()
  form.append('file', audioBlob, 'audio.webm')
  form.append('model', 'whisper-large-v3-turbo')
  form.append('response_format', 'text')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) return ''
  return res.text()
}
