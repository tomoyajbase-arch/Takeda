import { useWorkflowStore } from './stores/workflowStore'
import { ApiKeyModal } from './components/ApiKeyModal'
import { SecretaryPanel } from './components/SecretaryPanel'
import { WorkflowRightPanel } from './components/WorkflowRightPanel'
import { Settings } from 'lucide-react'
import { useState } from 'react'

function App() {
  const { phase, apiKey, setApiKey, setPhase } = useWorkflowStore()
  const [showSettings, setShowSettings] = useState(false)
  const [settingsInput, setSettingsInput] = useState(apiKey)

  if (phase === 'setup' || !apiKey) {
    return <ApiKeyModal />
  }

  return (
    <div className="h-screen bg-navy-950 flex flex-col overflow-hidden" style={{ fontFamily: "'Noto Sans JP', 'Inter', sans-serif" }}>
      {/* Top bar */}
      <div className="flex-shrink-0 h-12 border-b border-gray-800/60 flex items-center px-6 justify-between bg-navy-900/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-base">🏢</span>
          <span className="text-gray-300 text-sm font-medium">AI Company</span>
          <span className="text-gray-700 text-xs ml-2">橘秘書室</span>
        </div>
        <button
          onClick={() => {
            setSettingsInput(apiKey)
            setShowSettings(true)
          }}
          className="text-gray-600 hover:text-gray-400 transition-colors"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Main layout: left secretary panel, right workflow panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Secretary Panel */}
        <div className="w-[400px] flex-shrink-0 border-r border-gray-800 flex flex-col bg-navy-900/30">
          <SecretaryPanel />
        </div>

        {/* Workflow Panel */}
        <div className="flex-1 flex flex-col bg-navy-950/50">
          <WorkflowRightPanel />
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-navy-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-semibold mb-4">設定</h3>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">Anthropic APIキー</label>
              <input
                type="password"
                value={settingsInput}
                onChange={(e) => setSettingsInput(e.target.value)}
                className="w-full bg-navy-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 border border-gray-700 text-gray-400 text-sm py-2 rounded-lg hover:border-gray-600 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  setApiKey(settingsInput)
                    setShowSettings(false)
                }}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-sm py-2 rounded-lg transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
