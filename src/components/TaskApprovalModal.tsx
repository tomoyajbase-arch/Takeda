import { useState } from 'react'
import { useWorkflowStore } from '../stores/workflowStore'
import { useWorkflow } from '../hooks/useWorkflow'
import { CheckCircle2, MessageSquare, Users } from 'lucide-react'

export function TaskApprovalModal() {
  const { taskPlan } = useWorkflowStore()
  const { approvePlan } = useWorkflow()
  const [feedback, setFeedback] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)

  if (!taskPlan) return null

  const handleApprove = () => {
    approvePlan(feedback || undefined)
  }

  const handleFeedbackSubmit = () => {
    if (feedback.trim()) {
      approvePlan(feedback)
    }
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-violet-400" />
          <h2 className="text-white font-semibold text-sm">タスクプランの確認</h2>
        </div>
        <p className="text-gray-500 text-xs mt-1">社員の配置とタスクをご確認ください</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Summary */}
        <div className="bg-violet-950/30 border border-violet-500/20 rounded-xl p-4">
          <p className="text-xs text-violet-400 mb-1 font-medium">ゴール</p>
          <p className="text-gray-200 text-sm leading-relaxed">{taskPlan.summary}</p>
        </div>

        {/* Employee assignments */}
        <div>
          <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">担当社員</p>
          <div className="space-y-3">
            {taskPlan.employees.map((employee, i) => (
              <div
                key={employee.id}
                className="bg-navy-800 border border-gray-700/50 rounded-xl p-4 animate-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: employee.color + '20', border: `2px solid ${employee.color}40` }}
                  >
                    {employee.emoji}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{employee.name}</p>
                    <p className="text-xs" style={{ color: employee.color }}>{employee.role}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="bg-navy-950 text-gray-400 text-xs px-2 py-1 rounded-full border border-gray-700">
                      {employee.taskTitle}
                    </span>
                  </div>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed ml-12">{employee.task}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback section */}
        {showFeedback && (
          <div className="animate-slide-up">
            <label className="block text-xs text-gray-500 mb-2 font-medium">
              <MessageSquare size={12} className="inline mr-1" />
              修正・追加の指示
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="例: もっとマーケティング視点を入れてほしい、競合分析も追加して..."
              rows={3}
              className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 border-t border-gray-800 px-6 py-4">
        <div className="flex gap-3">
          <button
            onClick={() => setShowFeedback(!showFeedback)}
            className="flex-1 border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-200 text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare size={14} />
            修正を加える
          </button>
          {showFeedback && feedback.trim() ? (
            <button
              onClick={handleFeedbackSubmit}
              className="flex-1 bg-orange-600 hover:bg-orange-500 text-white text-sm py-2.5 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={14} />
              修正して実行
            </button>
          ) : (
            <button
              onClick={handleApprove}
              className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-sm py-2.5 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={14} />
              OK、実行する
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
