"use client";

import { Employee, Task } from "@/lib/types";
import { CheckCircle, Loader2, RotateCcw, Clock } from "lucide-react";

interface Props {
  employee: Employee;
}

const statusConfig = {
  preparing: { label: "準備中", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  working: { label: "作業中", color: "text-sky-400", bg: "bg-sky-400/10" },
  done: { label: "完了", color: "text-green-400", bg: "bg-green-400/10" },
  revising: { label: "修正中", color: "text-orange-400", bg: "bg-orange-400/10" },
};

const taskStatusIcon = {
  pending: <Clock className="w-3 h-3 text-slate-500" />,
  "in-progress": <Loader2 className="w-3 h-3 text-sky-400 animate-spin" />,
  done: <CheckCircle className="w-3 h-3 text-green-400" />,
  revision: <RotateCcw className="w-3 h-3 text-orange-400" />,
};

export function EmployeeCard({ employee }: Props) {
  const status = statusConfig[employee.status];

  return (
    <div className="glass rounded-xl p-4 animate-bounce-in">
      <div className="flex items-start gap-3">
        <div className="text-3xl flex-shrink-0">{employee.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-200 text-sm">{employee.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">{employee.role} · {employee.specialty}</p>
          
          <div className="space-y-1.5">
            {employee.tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2">
                {taskStatusIcon[task.status]}
                <span className={`text-xs truncate ${
                  task.status === "done" ? "text-slate-500 line-through" : "text-slate-300"
                }`}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {employee.tasks.some((t) => t.status === "done" && t.output) && (
        <div className="mt-3 pt-3 border-t border-white/10">
          {employee.tasks
            .filter((t) => t.status === "done" && t.output)
            .map((task) => (
              <div key={task.id} className="mb-2">
                <p className="text-xs font-medium text-sky-400 mb-1">{task.title}</p>
                <p className="text-xs text-slate-400 line-clamp-3 whitespace-pre-wrap">
                  {task.output}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
