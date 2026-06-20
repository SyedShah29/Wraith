import { useEffect, useState, useRef } from 'react'
import { useOverlayStore, useDashboardStore } from '../store'
import { streamAI } from '../services/ai-router'
import type { Message } from '../shared/types'

export default function ActionItems() {
  const { transcript } = useOverlayStore()
  const { settings } = useDashboardStore()
  const [items, setItems] = useState<string[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const lastExtractedLength = useRef(0)

  useEffect(() => {
    // Only extract if we have significant new transcript data (e.g. 5 new segments)
    if (transcript.length - lastExtractedLength.current > 5 && !isExtracting) {
      extractItems()
    }
  }, [transcript, isExtracting])

  const extractItems = async () => {
    setIsExtracting(true)
    lastExtractedLength.current = transcript.length
    
    const text = transcript.map(t => t.text).join(' ')
    const msgs: Message[] = [
      { id: '1', role: 'system', content: 'You are an action item extractor. Extract brief, concise action items from the meeting transcript. Output them as a simple bulleted list starting with "- ". Do not include any other text.', timestamp: 0 },
      { id: '2', role: 'user', content: `Transcript:\n${text}`, timestamp: 0 }
    ]

    const abort = new AbortController()
    let content = ''
    try {
      for await (const chunk of streamAI(msgs, settings, abort.signal)) {
        if (chunk.content) content += chunk.content
        if (chunk.done) break
      }
      
      const parsedItems = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-'))
        .map(line => line.substring(1).trim())

      if (parsedItems.length > 0) {
        setItems(parsedItems)
      }
    } catch {
      // Ignore errors
    } finally {
      setIsExtracting(false)
    }
  }

  if (items.length === 0) return null

  return (
    <div className="action-items-panel">
      <div className="ai-panel-title">ACTION ITEMS</div>
      <ul className="ai-list">
        {items.map((item, idx) => (
          <li key={idx} className="ai-item">{item}</li>
        ))}
      </ul>
      {isExtracting && <div className="ai-loading">Updating...</div>}
    </div>
  )
}
