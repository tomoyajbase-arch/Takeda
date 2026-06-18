import { useState } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';

export function ApiKeyModal() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const { setApiKey, setPhase } = useWorkflowStore();

  const handleSubmit = async () => {
    if (!key.trim()) {
      setError('APIキーを入力してください');
      return;
    }
    if (!key.startsWith('sk-')) {
      setError('有効なAnthropicのAPIキーを入力してください（sk-で始まる）');
      return;
    }

    // Test the key
    try {
      const res = await fetch('/api/chat/secretary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'こんにちは' }],
          apiKey: key,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(`APIキーが無効です: ${err.error}`);
        return;
      }
      setApiKey(key);
      setPhase('idle');
    } catch (e) {
      setApiKey(key);
      setPhase('idle');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center p-4">
      <div className="bg-[#12121e] border border-[#2d2d4e] rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏢</div>
          <h1 className="text-2xl font-bold text-white mb-2">武田商事 AI</h1>
          <p className="text-slate-400 text-sm">Takeda AI Company</p>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4 p-4 bg-[#1a1a2e] rounded-xl border border-[#2d2d4e]">
            <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-lg">橘</div>
            <div>
              <p className="text-white text-sm font-medium">橘 リナ 秘書</p>
              <p className="text-slate-400 text-xs">Secretary - Tachibana Rina</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm text-center">
            ご利用にはAnthropicのAPIキーが必要です。<br/>
            キーはブラウザのローカルストレージに保存されます。
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-sm mb-2 block">Anthropic API Key</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="sk-ant-..."
              className="w-full bg-[#1a1a2e] border border-[#2d2d4e] rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 rounded-lg transition-colors"
          >
            開始する / Start
          </button>
        </div>

        <p className="text-slate-600 text-xs text-center mt-4">
          APIキーはこのブラウザのみに保存され、サーバーには保存されません
        </p>
      </div>
    </div>
  );
}
