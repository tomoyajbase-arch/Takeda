import { useEffect, useRef, useState } from 'react'
import { useWorkflowStore } from '../stores/workflowStore'
import { useWorkflow } from '../hooks/useWorkflow'
import { ChatMessage } from './ChatMessage'
import { TypingIndicator } from './TypingIndicator'
import { Send } from 'lucide-react'

export function SecretaryPanel() {
  const { messages, isSecretaryTyping, phase } = useWorkflowStore()
  const { sendToSecretary, startNew } = useWorkflow()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSecretaryTyping])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isSecretaryTyping) return
    setInput('')
    sendToSecretary(text)
  }

  const canInput =
    !isSecretaryTyping &&
    (phase === 'idle' || phase === 'clarifying' || phase === 'complete')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-900/40">
                橘
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-navy-800" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">橘 リナ</p>
              <p className="text-gray-500 text-xs">秘書</p>
            </div>
          </div>
          {phase === 'complete' && (
            <button
              onClick={startNew}
              className="text-xs text-violet-400 hover:text-violet-300 border border-violet-500/30 hover:border-violet-400/50 px-3 py-1.5 rounded-lg transition-colors"
            >
              新しいタスク
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 animate-fade-in">
            <div className="text-4xl mb-4">👋</div>
            <p className="text-gray-400 text-sm leading-relaxed">
              社長、本日もよろしくお願いいたします。<br />
              ご要望をお気軽にお申し付けください。
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}

        {isSecretaryTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-800 p-4">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={
              canInput
                ? 'ご要望をどうぞ... (Enter で送信)'
                : phase === 'planning'
                ? 'プランを作成中...'
                : phase === 'executing'
                ? '社員が作業中...'
                : phase === 'reviewing'
                ? '秘書がレビュー中...'
                : phase === 'awaiting_approval'
                ? 'プランをご確認ください →'
                : phase === 'presenting'
                ? '成果物をご確認ください →'
                : '...'
            }
            disabled={!canInput}
            rows={1}
            className="flex-1 bg-navy-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors resize-none disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!canInput || !input.trim()}
            className="flex-shrink-0 w-10 h-10 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
