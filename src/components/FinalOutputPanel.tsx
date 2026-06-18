import { useWorkflowStore } from '../stores/workflowStore';
import { useWorkflow } from '../hooks/useWorkflow';

export function FinalOutputPanel() {
  const { finalOutput, phase } = useWorkflowStore();
  const { startNewTask } = useWorkflow();

  const handleExport = () => {
    const blob = new Blob([finalOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `takeda-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#12121e] border-b border-[#2d2d4e] px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm">橘</div>
          <div>
            <h2 className="text-white font-semibold text-sm">最終報告書</h2>
            <p className="text-slate-500 text-xs">Final Report by Secretary Tachibana</p>
          </div>
        </div>
        {phase === 'complete' && (
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="text-slate-400 hover:text-white text-xs px-3 py-1.5 border border-[#2d2d4e] hover:border-slate-500 rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              エクスポート / Export
            </button>
            <button
              onClick={startNewTask}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              新しいタスク / New Task
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {phase === 'presenting' && !finalOutput && (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-violet-400 text-sm">最終報告書を作成中...</span>
            </div>
          </div>
        )}

        {finalOutput && (
          <div className="max-w-3xl mx-auto">
            <div className="prose-dark text-sm whitespace-pre-wrap leading-relaxed">
              {finalOutput}
              {phase === 'presenting' && (
                <span className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 animate-pulse align-middle"></span>
              )}
            </div>

            {phase === 'complete' && (
              <div className="mt-8 border-t border-[#2d2d4e] pt-6 flex justify-center">
                <button
                  onClick={startNewTask}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-xl font-medium transition-colors"
                >
                  確認しました / Confirm
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
