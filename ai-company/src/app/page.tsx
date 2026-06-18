"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { Employee, Task, Plan } from "@/lib/types";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { EmployeeCard } from "@/components/EmployeeCard";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { FinalReport } from "@/components/FinalReport";
import { Send, Building2 } from "lucide-react";

async function streamText(
  url: string,
  body: object,
  onChunk: (text: string) => void
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) {
            full += parsed.text;
            onChunk(parsed.text);
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }
  return full;
}

export default function Home() {
  const store = useStore();
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [store.messages, streamingText]);

  useEffect(() => {
    if (!initialized.current && store.messages.length === 0) {
      initialized.current = true;
      store.addMessage(
        "secretary",
        "おはようございます、社長。本日はどのようなことをお手伝いいたしましょうか？\n\nどんな抽象的なゴールでも構いません。まずはお気軽にお申し付けください。"
      );
    }
  }, [store]);

  const sendToSecretary = useCallback(
    async (userMessage: string) => {
      store.addMessage("user", userMessage);
      store.setLoading(true);
      setStreamingText("");

      const messages = [
        ...store.messages,
        { role: "user" as const, content: userMessage },
      ];

      let accumulated = "";
      try {
        const full = await streamText(
          "/api/chat",
          { messages, mode: store.phase },
          (chunk) => {
            accumulated += chunk;
            setStreamingText(accumulated);
          }
        );
        setStreamingText("");
        store.addMessage("secretary", full);
      } catch (e) {
        setStreamingText("");
        store.addMessage("secretary", "申し訳ありません、エラーが発生しました。もう一度お試しください。");
      }

      store.setLoading(false);
      if (store.phase === "idle") store.setPhase("questioning");
    },
    [store]
  );

  const startPlanning = useCallback(async () => {
    store.setLoading(true);
    store.setPhase("planning");
    setStreamingText("");

    const userMessages = store.messages.filter((m) => m.role === "user");
    const goal = userMessages.map((m) => m.content).join(" / ");
    store.setGoal(goal);

    store.addMessage("secretary", "承知しました。最適な社員チームを編成し、タスクを割り当てています...");

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, conversation: store.messages }),
      });

      const { plan, error } = await res.json();

      if (error || !plan) {
        store.addMessage("secretary", "計画の作成に失敗しました。もう一度お試しください。");
        store.setPhase("questioning");
        store.setLoading(false);
        return;
      }

      store.setPlan(plan);
      store.setPhase("confirming");
      setShowConfirmation(true);
    } catch (e) {
      store.addMessage("secretary", "エラーが発生しました。もう一度お試しください。");
      store.setPhase("questioning");
    }

    store.setLoading(false);
  }, [store]);

  const executeAllTasks = useCallback(
    async (plan: Plan) => {
      store.setPhase("executing");
      setShowConfirmation(false);

      const employees: Employee[] = plan.employees.map((emp) => ({
        ...emp,
        status: "preparing" as const,
        tasks: emp.tasks.map((t) => ({
          ...t,
          employeeId: emp.id,
          employeeName: emp.name,
          status: "pending" as const,
        })),
      }));

      store.setEmployees(employees);
      const allTasks: Task[] = employees.flatMap((e) => e.tasks);
      store.setTasks(allTasks);

      store.addMessage(
        "secretary",
        `計画が確定しました。${employees.length}名の社員がタスクを開始します。`
      );

      const taskOutputs: Record<string, string> = {};

      await Promise.all(
        employees.map(async (employee) => {
          store.updateEmployee(employee.id, { status: "working" });

          for (const task of employee.tasks) {
            store.updateTask(task.id, { status: "in-progress" });

            let output = "";
            try {
              await streamText(
                "/api/execute",
                {
                  task,
                  employee,
                  goal: store.goal,
                  allTasks: allTasks.map((t) => ({ title: t.title })),
                },
                (chunk) => {
                  output += chunk;
                  store.updateTask(task.id, { output });
                }
              );
            } catch {
              output = "タスクの実行中にエラーが発生しました。";
            }

            store.updateTask(task.id, { status: "done", output });
            taskOutputs[task.id] = output;
          }

          store.updateEmployee(employee.id, { status: "done" });
        })
      );

      store.setPhase("reviewing");
      store.addMessage("secretary", "全社員のタスクが完了しました。報告書を取りまとめています...");

      const completedTasks = allTasks.map((t) => ({
        ...t,
        output: taskOutputs[t.id] || "",
      }));

      let finalOutput = "";
      setStreamingText("");

      try {
        await streamText(
          "/api/review",
          {
            goal: store.goal,
            tasks: completedTasks,
            outputs: completedTasks.map((t) => t.output),
          },
          (chunk) => {
            finalOutput += chunk;
            setStreamingText(finalOutput);
          }
        );
      } catch {
        finalOutput = completedTasks
          .map((t) => `## ${t.title}\n${t.output}`)
          .join("\n\n");
      }

      setStreamingText("");
      store.setFinalOutput(finalOutput);
      store.setPhase("complete");
      store.addMessage("secretary", "最終報告書が完成しました。ご確認ください。何かご不明な点があればお気軽にどうぞ。");
    },
    [store]
  );

  const handleRevise = useCallback(
    async (feedback: string) => {
      setShowConfirmation(false);
      store.setPhase("questioning");
      store.addMessage("user", `計画の修正依頼: ${feedback}`);
      store.setLoading(true);
      setStreamingText("");

      let accumulated = "";
      try {
        const full = await streamText(
          "/api/chat",
          {
            messages: [
              ...store.messages,
              { role: "user", content: `計画の修正依頼: ${feedback}` },
            ],
            mode: "revise",
          },
          (chunk) => {
            accumulated += chunk;
            setStreamingText(accumulated);
          }
        );
        setStreamingText("");
        store.addMessage("secretary", full);
      } catch {
        setStreamingText("");
        store.addMessage("secretary", "了解しました。計画を見直します。");
      }

      store.setLoading(false);
      setTimeout(() => startPlanning(), 800);
    },
    [store, startPlanning]
  );

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || store.isLoading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "48px";
    await sendToSecretary(text);
  }, [input, store.isLoading, sendToSecretary]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canProceed =
    store.phase !== "complete" &&
    store.phase !== "executing" &&
    store.phase !== "reviewing" &&
    store.phase !== "confirming" &&
    store.phase !== "planning" &&
    store.messages.filter((m) => m.role === "user").length >= 1 &&
    !store.isLoading;

  const phaseLabel: Record<string, string> = {
    planning: "📋 計画中",
    confirming: "⏳ 確認待ち",
    executing: "⚡ 実行中",
    reviewing: "🔍 レビュー中",
    complete: "✅ 完了",
  };

  return (
    <div className="flex h-screen bg-[#0f1117] overflow-hidden">
      {/* Left: Secretary Chat */}
      <div className="flex flex-col w-[460px] border-r border-white/10 flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-lg secretary-glow flex-shrink-0">
            👩‍💼
          </div>
          <div>
            <h1 className="font-semibold text-slate-200 text-sm">山田 綾</h1>
            <p className="text-xs text-sky-400">専属秘書</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-slate-500">オンライン</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {store.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {store.isLoading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                👩‍💼
              </div>
              <div className="glass rounded-2xl rounded-tl-sm max-w-[80%]">
                {streamingText ? (
                  <p className="px-4 py-3 text-sm text-slate-200 whitespace-pre-wrap">
                    {streamingText}
                  </p>
                ) : (
                  <TypingIndicator />
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Proceed to planning button */}
        {canProceed && (
          <div className="px-4 pb-2">
            <button
              onClick={startPlanning}
              className="w-full bg-sky-600/20 hover:bg-sky-600/30 border border-sky-600/40 text-sky-300 py-2.5 rounded-xl text-sm transition-colors"
            >
              ✨ 社員を編成してタスクを開始する
            </button>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="秘書に伝える... (Shift+Enterで改行)"
              disabled={store.isLoading}
              rows={1}
              style={{ minHeight: "48px", maxHeight: "120px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none disabled:opacity-50 scrollbar-thin"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || store.isLoading}
              className="w-10 h-10 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Company Floor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-slate-400" />
          <h2 className="font-medium text-slate-300 text-sm">会社フロア</h2>
          {store.employees.length > 0 && (
            <span className="ml-1 text-xs text-slate-500">
              {store.employees.length}名在籍
            </span>
          )}
          {phaseLabel[store.phase] && (
            <span className="ml-auto text-xs px-2.5 py-1 rounded-full glass text-sky-400">
              {phaseLabel[store.phase]}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {store.employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
              <div className="text-6xl mb-4">🏢</div>
              <p className="text-slate-500 text-sm">
                秘書にゴールを伝えると、最適な社員チームが編成されます
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {store.phase === "complete" && store.finalOutput && (
                <FinalReport output={store.finalOutput} onReset={store.reset} />
              )}

              {store.phase === "reviewing" && streamingText && (
                <div className="glass rounded-xl p-4 animate-fade-in mb-4">
                  <p className="text-xs text-sky-400 mb-2 font-medium">📝 報告書作成中...</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {streamingText}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {store.employees.map((emp) => (
                  <EmployeeCard key={emp.id} employee={emp} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && store.plan && (
        <ConfirmationDialog
          plan={store.plan}
          onConfirm={() => executeAllTasks(store.plan!)}
          onRevise={handleRevise}
        />
      )}
    </div>
  );
}
