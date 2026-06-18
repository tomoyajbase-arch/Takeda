import { useWorkflowStore } from '../stores/workflowStore';
import { EmployeeCard } from './EmployeeCard';
import { FinalOutputPanel } from './FinalOutputPanel';

export function EmployeeWorkPanel() {
  const {
    phase,
    currentPlan,
    employeeWorks,
    reviewText,
  } = useWorkflowStore();

  if (phase === 'idle') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏢</div>
          <h2 className="text-white text-xl font-semibold mb-2">武田商事 AI Company</h2>
          <p className="text-slate-500 text-sm mb-1">左のパネルで橘秘書に指示をお出しください</p>
          <p className="text-slate-600 text-xs">Give instructions to Secretary Tachibana in the left panel</p>
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-md mx-auto">
            {[
              { emoji: '📊', name: '山田 賢司', role: 'Research' },
              { emoji: '🎨', name: '佐藤 美咲', role: 'Creative' },
              { emoji: '⚙️', name: '田中 剛', role: 'Technical' },
              { emoji: '✍️', name: '鈴木 花子', role: 'Writing' },
              { emoji: '📋', name: '高橋 誠', role: 'Strategy' },
              { emoji: '🔍', name: '伊藤 優', role: 'QC' },
            ].map(e => (
              <div key={e.name} className="bg-[#12121e] border border-[#2d2d4e] rounded-xl p-3 text-center opacity-50">
                <div className="text-2xl mb-1">{e.emoji}</div>
                <p className="text-slate-400 text-xs font-medium">{e.name}</p>
                <p className="text-slate-600 text-xs">{e.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'clarifying' || phase === 'planning') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-violet-400 font-medium">
            {phase === 'planning' ? 'プランを作成中...' : '橘秘書が状況を確認中...'}
          </p>
          <p className="text-slate-600 text-sm mt-1">
            {phase === 'planning' ? 'Generating task plan...' : 'Secretary is clarifying...'}
          </p>
        </div>
      </div>
    );
  }

  if ((phase === 'presenting' || phase === 'complete')) {
    return <FinalOutputPanel />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Panel header */}
      <div className="bg-[#12121e] border-b border-[#2d2d4e] px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-white font-semibold text-sm">社員の作業状況</h2>
          <p className="text-slate-500 text-xs">Employee Work Status</p>
        </div>
        {currentPlan && (
          <div className="text-right">
            <p className="text-slate-400 text-xs truncate max-w-xs">{currentPlan.summary}</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Awaiting approval */}
        {phase === 'awaiting_approval' && currentPlan && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-white font-semibold mb-2">プランが準備できました</p>
              <p className="text-slate-500 text-sm">Task plan is ready for your approval</p>
              <p className="text-violet-400 text-sm mt-3">左パネルのモーダルでご確認ください</p>
            </div>
          </div>
        )}

        {/* Employee cards */}
        {currentPlan && ['executing', 'reviewing'].includes(phase) && (
          <div className="space-y-4">
            {currentPlan.employees.map((emp, i) => (
              <EmployeeCard
                key={emp.id}
                employee={emp}
                work={employeeWorks[emp.id]}
                index={i}
              />
            ))}
          </div>
        )}

        {/* Review section */}
        {phase === 'reviewing' && reviewText && (
          <div className="mt-6 bg-[#12121e] border border-violet-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-xs">橘</div>
              <span className="text-violet-400 text-sm font-medium">橘秘書のレビュー</span>
              <div className="flex-1"></div>
              <div className="typing-indicator flex gap-1 items-center">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {reviewText.replace(/\[APPROVED\]/g, '').replace(/\[NEEDS_REVISION:\w+\]/g, '')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
