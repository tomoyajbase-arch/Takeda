"use client";

import { RefreshCw } from "lucide-react";

interface Props {
  output: string;
  onReset: () => void;
}

export function FinalReport({ output, onReset }: Props) {
  return (
    <div className="glass rounded-xl p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
          <span>📋</span> 最終報告書
        </h3>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          新しいタスク
        </button>
      </div>
      <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
        {output}
      </div>
    </div>
  );
}
