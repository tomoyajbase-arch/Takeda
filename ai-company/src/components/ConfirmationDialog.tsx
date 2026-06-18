"use client";

import { useState } from "react";
import { Plan } from "@/lib/types";
import { CheckCircle, AlertCircle } from "lucide-react";

interface Props {
  plan: Plan;
  onConfirm: (feedback?: string) => void;
  onRevise: (feedback: string) => void;
}

export function ConfirmationDialog({ plan, onConfirm, onRevise }: Props) {
  const [feedback, setFeedback] = useState("");
  const [mode, setMode] = useState<"view" | "revise">("view");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-thin p-6 animate-slide-up">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-semibold text-slate-100">タスク計画の確認</h2>
        </div>

        <p className="text-sm text-slate-400 mb-5">{plan.summary}</p>

        <div className="space-y-4 mb-6">
          {plan.employees.map((emp) => (
            <div key={emp.id} className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{emp.emoji}</span>
                <div>
                  <p className="font-medium text-slate-200 text-sm">{emp.name}</p>
                  <p className="text-xs text-slate-400">{emp.role}</p>
                </div>
              </div>
              <ul className="space-y-1.5 ml-2">
                {emp.tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-2">
                    <span className="text-sky-400 mt-0.5">›</span>
                    <div>
                      <p className="text-sm text-slate-300">{task.title}</p>
                      <p className="text-xs text-slate-500">{task.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {mode === "revise" && (
          <div className="mb-4">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="修正の指示を入力してください..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
              rows={3}
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-3">
          {mode === "view" ? (
            <>
              <button
                onClick={() => onConfirm()}
                className="flex-1 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                OK・このまま進める
              </button>
              <button
                onClick={() => setMode("revise")}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 py-2.5 rounded-xl text-sm font-medium transition-colors border border-white/10"
              >
                修正したい
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  if (feedback.trim()) onRevise(feedback);
                }}
                disabled={!feedback.trim()}
                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                修正指示を送る
              </button>
              <button
                onClick={() => setMode("view")}
                className="px-4 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-sm transition-colors"
              >
                戻る
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
