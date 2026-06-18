import { useState } from 'react'
import { useWorkflowStore } from '../stores/workflowStore'

export function ApiKeyModal() {
  const { apiKey, setApiKey, setPhase } = useWorkflowStore()
  const [input, setInput] = useState(apiKey)
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!input.trim().startsWith('sk-ant-')) {
      setError('有効なAnthropicのAPIキーを入力してください（sk-ant-で始まります）')
      return
    }
    setApiKey(input.trim())
    setPhase('idle')
  }

  return (
    <div className="fixed inset-0 bg-navy-950 flex items-center justify-center z-50">
      <div className="bg-navy-800 border border-violet-500/30 rounded-2xl p-8 w-full max-w-md shadow-2xl shadow-violet-900/20 animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏢</div>
          <h1 className="text-2xl font-bold text-white mb-1">AI Company</h1>
          <p className="text-violet-300 text-sm">橘秘書室へようこそ</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">
            Anthropic APIキー
          </label>
          <input
            type="password"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="sk-ant-..."
            className="w-full bg-navy-950 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          <p className="text-gray-600 text-xs mt-2">
            APIキーはブラウザのlocalStorageにのみ保存されます
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-lg transition-colors"
        >
          入室する
        </button>
      </div>
    </div>
  )
}
