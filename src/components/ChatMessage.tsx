import ReactMarkdown from 'react-markdown'
import { Message } from '../types'

interface Props {
  message: Message
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'

  // Remove internal markers from display
  const displayContent = message.content
    .replace(/\[READY_TO_PLAN\]/g, '')
    .trim()

  if (!displayContent) return null

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-violet-900/40">
          橘
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-violet-600/20 border border-violet-500/30 text-white ml-auto'
            : 'bg-navy-700 border border-gray-700/50 text-gray-100'
        }`}
      >
        <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{displayContent}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
