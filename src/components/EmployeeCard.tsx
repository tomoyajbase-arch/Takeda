import { useState } from 'react';
import { TaskEmployee, EmployeeWork } from '../types';

interface Props {
  employee: TaskEmployee;
  work?: EmployeeWork;
  index: number;
}

export function EmployeeCard({ employee, work, index }: Props) {
  const [expanded, setExpanded] = useState(false);

  const status = work?.status || 'waiting';
  const output = work?.output || '';

  const statusConfig = {
    waiting: { label: '待機中', labelEn: 'Waiting', color: 'text-slate-500', bg: 'bg-slate-500/10' },
    working: { label: '作業中', labelEn: 'Working', color: 'text-amber-400', bg: 'bg-amber-400/10' },
    revising: { label: '修正中', labelEn: 'Revising', color: 'text-orange-400', bg: 'bg-orange-400/10' },
    done: { label: '完了', labelEn: 'Done', color: 'text-green-400', bg: 'bg-green-400/10' },
  };

  const sc = statusConfig[status];

  return (
    <div
      className="bg-[#12121e] border rounded-xl overflow-hidden employee-card-enter"
      style={{
        borderColor: employee.color + '44',
        animationDelay: `${index * 0.1}s`,
      }}
    >
      {/* Card header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ borderBottom: `1px solid ${employee.color}22` }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 relative"
          style={{ backgroundColor: employee.color + '22' }}
        >
          {employee.emoji}
          {status === 'working' && (
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ backgroundColor: employee.color }}
            ></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm">{employee.name}</span>
            {status === 'done' && (
              <span className="text-green-400 text-xs">✓</span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: employee.color + 'cc' }}>{employee.role}</p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.color} ${sc.bg}`}>
            {sc.label}
          </span>
          {output && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
            >
              {expanded ? '閉じる ↑' : '詳細 ↓'}
            </button>
          )}
        </div>
      </div>

      {/* Task info */}
      <div className="px-4 py-2 bg-[#0a0a14]/50">
        <p className="text-slate-500 text-xs mb-0.5">タスク / Task</p>
        <p className="text-slate-300 text-xs leading-relaxed line-clamp-2">{employee.task}</p>
      </div>

      {/* Output */}
      {status === 'working' && !output && (
        <div className="px-4 py-3 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0" style={{ borderColor: employee.color }}></div>
          <span className="text-xs text-slate-500">処理中...</span>
        </div>
      )}

      {output && (
        <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-96' : 'max-h-16'}`}>
          <div className="px-4 py-3 border-t border-[#1a1a2e]">
            <div className={`text-xs text-slate-400 leading-relaxed ${expanded ? '' : 'line-clamp-3'} whitespace-pre-wrap`}>
              {output}
              {status === 'working' && (
                <span className="inline-block w-0.5 h-3 ml-0.5 animate-pulse align-middle" style={{ backgroundColor: employee.color }}></span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
