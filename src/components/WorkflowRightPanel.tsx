import ReactMarkdown from 'react-markdown'
import { useWorkflowStore } from '../stores/workflowStore'
import { useWorkflow } from '../hooks/useWorkflow'
import { TaskApprovalModal } from './TaskApprovalModal'
import { EmployeeCard } from './EmployeeCard'
import { CheckCircle2, RefreshCw, Loader2 } from 'lucide-react'

export function WorkflowRightPanel() {
  const { phase, taskPlan, employeeStatuses, employeeOutputs, reviewText } = useWorkflowStore()
  const { confirmComplete, startNew } = useWorkflow()

  if (phase === 'idle' || phase === 'setup') {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div className="animate-fade-in">
          <div className="text-5xl mb-4">🏢</div>
          <h2 className="text-white font-semibold text-lg mb-2">AI Company</h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
            左の橘秘書にご要望をお伝えください。<br />
            タスクを整理して、最適な社員に振り分けます。
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 max-w-xs mx-auto">
            {['📊 リサーチ', '🎨 クリエイティブ', '⚙️ テクニカル', '✍️ ライティング', '📋 ストラテジー', '🔍 QA'].map((e) => (
              <div key={e} className="bg-navy-800 border border-gray-700/50 rounded-lg px-2 py-2 text-xs text-gray-400">
                {e}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'clarifying') {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div className="animate-fade-in">
          <div className="text-4xl mb-4">💬</div>
          <p className="text-gray-400 text-sm">
            秘書が詳細を確認中です。<br />
            左のチャットでご回答ください。
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'planning') {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div className="animate-fade-in">
          <Loader2 size={32} className="text-violet-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">プランを作成中...</p>
        </div>
      </div>
    )
  }

  if (phase === 'awaiting_approval') {
    return <TaskApprovalModal />
  }

  if (phase === 'executing' || phase === 'reviewing' || phase === 'presenting' || phase === 'complete') {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold text-sm">社員作業状況</h2>
              {taskPlan && (
                <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">{taskPlan.summary}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {phase === 'executing' && (
                <div className="flex items-center gap-1.5 text-blue-400 text-xs">
                  <Loader2 size={12} className="animate-spin" />
                  作業中
                </div>
              )}
              {phase === 'reviewing' && (
                <div className="flex items-center gap-1.5 text-violet-400 text-xs">
                  <Loader2 size={12} className="animate-spin" />
                  秘書レビュー中
                </div>
              )}
              {(phase === 'presenting' || phase === 'complete') && (
                <div className="flex items-center gap-1.5 text-green-400 text-xs">
                  <CheckCircle2 size={12} />
                  完了
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Employee cards */}
          {taskPlan?.employees.map((employee, i) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              status={employeeStatuses[employee.id] || 'waiting'}
              output={employeeOutputs[employee.id] || ''}
              index={i}
            />
          ))}

          {/* Review section */}
          {(phase === 'reviewing' || phase === 'presenting' || phase === 'complete') && reviewText && (
            <div className="bg-navy-800 border border-violet-500/30 rounded-xl p-4 animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white">
                  橘
                </div>
                <p className="text-violet-300 text-xs font-medium">秘書レビュー</p>
              </div>
              <div className="text-gray-300 text-xs leading-relaxed prose prose-invert prose-xs max-w-none">
                <ReactMarkdown>
                  {reviewText.replace(/\[APPROVED\]/g, '').replace(/\[NEEDS_REVISION:[^\]]+\]/g, '').trim()}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Final action */}
          {phase === 'presenting' && (
            <div className="animate-slide-up">
              <button
                onClick={confirmComplete}
                className="w-full bg-green-700 hover:bg-green-600 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                確認しました
              </button>
            </div>
          )}

          {phase === 'complete' && (
            <div className="text-center py-4 animate-fade-in">
              <div className="text-3xl mb-3">✅</div>
              <p className="text-green-400 font-medium text-sm mb-1">タスク完了</p>
              <p className="text-gray-500 text-xs mb-4">お疲れ様でした</p>
              <button
                onClick={startNew}
                className="text-xs text-violet-400 hover:text-violet-300 border border-violet-500/30 hover:border-violet-400/50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 mx-auto"
              >
                <RefreshCw size={12} />
                新しいタスクを始める
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
