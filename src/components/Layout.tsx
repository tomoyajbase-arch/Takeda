import { SecretaryPanel } from './SecretaryPanel';
import { EmployeeWorkPanel } from './EmployeeWorkPanel';
import { useWorkflowStore } from '../stores/workflowStore';

export function Layout() {
  const { setPhase, setApiKey, reset } = useWorkflowStore();

  const handleLogout = () => {
    localStorage.removeItem('apiKey');
    setApiKey('');
    setPhase('setup');
  };

  return (
    <div className="h-screen bg-[#0a0a14] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-[#12121e] border-b border-[#2d2d4e] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏢</span>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">武田商事</h1>
            <p className="text-slate-500 text-xs">Takeda AI Company</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a2e] rounded-lg">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-slate-300 text-xs">社長モード / President Mode</span>
          </div>
          <button
            onClick={reset}
            className="text-slate-500 hover:text-slate-300 text-xs px-3 py-1.5 border border-[#2d2d4e] rounded-lg hover:border-slate-500 transition-colors"
          >
            新しいタスク / New Task
          </button>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-slate-300 text-xs px-3 py-1.5 border border-[#2d2d4e] rounded-lg hover:border-slate-500 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Secretary Panel */}
        <div className="w-2/5 flex-shrink-0 border-r border-[#2d2d4e]">
          <SecretaryPanel />
        </div>

        {/* Right: Employee Work Panel */}
        <div className="flex-1 overflow-hidden">
          <EmployeeWorkPanel />
        </div>
      </div>
    </div>
  );
}
