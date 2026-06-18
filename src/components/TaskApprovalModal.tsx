import { useState } from 'react';
import { TaskPlan } from '../types';

interface Props {
  plan: TaskPlan;
  onApprove: (feedback?: string) => void;
  onClose: () => void;
}

export function TaskApprovalModal({ plan, onApprove, onClose }: Props) {
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121e] border border-[#2d2d4e] rounded-2xl w-full max-w-xl shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="border-b border-[#2d2d4e] px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center">
            📋
          </div>
          <div>
            <h2 className="text-white font-semibold">タスクプランの承認</h2>
            <p className="text-slate-500 text-xs">Task Plan Approval</p>
          </div>
        </div>

        {/* Summary */}
        <div className="px-6 pt-4 pb-2">
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2d2d4e]">
            <p className="text-slate-400 text-xs mb-2 uppercase tracking-wider">目標 / Objective</p>
            <p className="text-white text-sm leading-relaxed">{plan.summary}</p>
          </div>
        </div>

        {/* Employees */}
        <div className="px-6 py-4 space-y-3 max-h-72 overflow-y-auto">
          <p className="text-slate-400 text-xs uppercase tracking-wider">担当社員 / Assigned Employees</p>
          {plan.employees.map((emp) => (
            <div
              key={emp.id}
              className="flex gap-3 p-3 bg-[#1a1a2e] rounded-xl border border-[#2d2d4e]"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: emp.color + '33', border: `1px solid ${emp.color}66` }}
              >
                {emp.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-sm font-medium">{emp.name}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: emp.color + '22', color: emp.color }}
                  >
                    {emp.taskTitle}
                  </span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{emp.task}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Feedback section */}
        {showFeedback && (
          <div className="px-6 pb-4">
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="修正依頼やフィードバックをご記入ください... / Enter feedback or modification requests..."
              className="w-full bg-[#1a1a2e] border border-[#2d2d4e] rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none h-24"
            />
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-[#2d2d4e] px-6 py-4 flex gap-3">
          {!showFeedback ? (
            <>
              <button
                onClick={() => setShowFeedback(true)}
                className="flex-1 bg-[#1a1a2e] hover:bg-[#2a2a3e] border border-[#2d2d4e] text-slate-300 py-2.5 rounded-lg text-sm transition-colors"
              >
                修正を依頼 / Request Changes
              </button>
              <button
                onClick={() => onApprove()}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                ✓ 承認して実行 / Approve & Execute
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowFeedback(false)}
                className="flex-1 bg-[#1a1a2e] hover:bg-[#2a2a3e] border border-[#2d2d4e] text-slate-300 py-2.5 rounded-lg text-sm transition-colors"
              >
                キャンセル / Cancel
              </button>
              <button
                onClick={() => onApprove(feedback)}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                フィードバックと共に実行 / Execute with Feedback
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
