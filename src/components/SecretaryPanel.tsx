import { useState, useRef, useEffect } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';
import { useWorkflow } from '../hooks/useWorkflow';
import { ChatMessage } from './ChatMessage';
import { TaskApprovalModal } from './TaskApprovalModal';

export function SecretaryPanel() {
  const [input, setInput] = useState('');
  const [showApproval, setShowApproval] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    secretaryStreaming,
    streamingContent,
    phase,
    currentPlan,
  } = useWorkflowStore();
  const { sendMessage, approveAndExecute, startNewTask } = useWorkflow();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (phase === 'awaiting_approval') {
      setShowApproval(true);
    }
  }, [phase]);

  const handleSend = () => {
    if (!input.trim() || secretaryStreaming) return;
    const msg = input.trim();
    setInput('');
    sendMessage(msg);
  };

  const handleApprove = (feedback?: string) => {
    setShowApproval(false);
    approveAndExecute(feedback);
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case 'idle': return '待機中 / Waiting';
      case 'clarifying': return '確認中 / Clarifying';
      case 'planning': return 'プラン作成中...';
      case 'awaiting_approval': return '承認待ち / Awaiting Approval';
      case 'executing': return '実行中 / Executing';
      case 'reviewing': return 'レビュー中 / Reviewing';
      case 'presenting': return '最終報告中 / Presenting';
      case 'complete': return '完了 / Complete';
      default: return '';
    }
  };

  const canInput = ['idle', 'clarifying'].includes(phase);

  return (
    <div className="h-full flex flex-col bg-[#0a0a14]">
      {/* Secretary header */}
      <div className="bg-[#12121e] border-b border-[#2d2d4e] px-4 py-3 flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xl shadow-lg shadow-violet-900/50">
            👩‍💼
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#12121e] ${
            secretaryStreaming ? 'bg-violet-400 animate-pulse' : 'bg-green-400'
          }`}></div>
        </div>
        <div className="flex-1">
          <h2 className="text-white font-semibold text-sm">橘 リナ</h2>
          <p className="text-slate-500 text-xs">Secretary / Tachibana Rina</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-violet-400 font-medium">{getPhaseLabel()}</span>
        </div>
      </div>

      {/* Welcome message */}
      {messages.length === 0 && !secretaryStreaming && (
        <div className="px-4 pt-6 pb-4">
          <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-4 flex gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm flex-shrink-0">
              橘
            </div>
            <div className="text-sm text-slate-300 leading-relaxed">
              <p className="mb-2">いらっしゃいませ、社長。</p>
              <p className="mb-2">本日はどのようなご用件でしょうか？お気軽にお申し付けください。</p>
              <p className="text-slate-500 text-xs">What would you like to accomplish today? Please feel free to tell me.</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Streaming message */}
        {secretaryStreaming && (
          <div className="flex gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm flex-shrink-0 mt-1">
              橘
            </div>
            <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tl-sm bg-[#1a1a2e] border border-[#2d2d4e] text-sm text-slate-200">
              {streamingContent ? (
                <div className="whitespace-pre-wrap">
                  {streamingContent.replace(/\[READY_TO_PLAN\]/g, '').replace(/\[APPROVED\]/g, '').replace(/\[NEEDS_REVISION:\w+\]/g, '')}
                  <span className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 animate-pulse align-middle"></span>
                </div>
              ) : (
                <div className="typing-indicator flex gap-1.5 items-center py-1">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Planning indicator */}
        {phase === 'planning' && (
          <div className="flex gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm flex-shrink-0 mt-1">
              橘
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[#1a1a2e] border border-violet-500/30 text-sm text-violet-300">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                タスクプランを作成しております...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[#2d2d4e] p-4">
        {phase === 'complete' && (
          <button
            onClick={startNewTask}
            className="w-full mb-3 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            新しいタスクを開始 / Start New Task
          </button>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={canInput ? "社長からのご指示をどうぞ..." : "処理中..."}
            disabled={!canInput}
            className="flex-1 bg-[#12121e] border border-[#2d2d4e] rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!canInput || !input.trim()}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Approval Modal */}
      {showApproval && currentPlan && (
        <TaskApprovalModal
          plan={currentPlan}
          onApprove={handleApprove}
          onClose={() => setShowApproval(false)}
        />
      )}
    </div>
  );
}
