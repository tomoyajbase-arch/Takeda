"use client";

import { RefreshCw, Copy, Check } from "lucide-react";
import { useState } from "react";

interface Props {
  output: string;
  onReset: () => void;
}

export function FinalReport({ output, onReset }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass rounded-xl p-5 animate-slide-up mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
          <span>📋</span> 最終報告書
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "コピー済み" : "コピー"}
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            新しいタスク
          </button>
        </div>
      </div>
      <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
        {output}
      </div>
    </div>
  );
}
