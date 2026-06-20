import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Message } from '../shared/types'

interface ResponseStreamProps {
  message: Message
  isStreaming: boolean
}

export default function ResponseStream({ message, isStreaming }: ResponseStreamProps) {
  const isUser = message.role === 'user'
  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  return (
    <div className={`message-row ${message.role}`}>
      <div className="msg-meta">
        <span className="msg-role">{isUser ? 'YOU' : 'WRAITH'}</span>
        <span>{time}</span>
        {message.provider && !isUser && (
          <span className="msg-provider">via {message.provider}</span>
        )}
        {message.model && !isUser && (
          <span className="msg-provider">· {message.model}</span>
        )}
      </div>
      <div className="msg-content">
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className ?? '')
                const isBlock = match !== null
                return isBlock ? (
                  <SyntaxHighlighter
                    style={vscDarkPlus as any}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      background: 'var(--void-3)',
                      border: '1px solid var(--border)',
                      borderRadius: '2px',
                      fontSize: '11px',
                      margin: '8px 0',
                    }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>{children}</code>
                )
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
        {isStreaming && <span className="stream-cursor" />}
      </div>
    </div>
  )
}
