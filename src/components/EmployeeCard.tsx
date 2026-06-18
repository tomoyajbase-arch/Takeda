import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Employee, EmployeeStatus } from '../types'
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

interface Props {
  employee: Employee
  status: EmployeeStatus
  output: string
  index: number
}

export function EmployeeCard({ employee, status, output, index }: Props) {
  const [expanded, setExpanded] = useState(false)

  const statusIcon = {
    waiting: <Clock size={14} className="text-gray-500" />,
    working: <Loader2 size={14} className="text-blue-400 animate-spin" />,
    done: <CheckCircle2 size={14} className="text-green-400" />,
    error: <AlertCircle size={14} className="text-red-400" />,
  }[status]

  const statusText = {
    waiting: '待機中',
    working: '作業中...',
    done: '完了',
    error: 'エラー',
  }[status]

  const statusBg = {
    waiting: 'bg-gray-800',
    working: 'bg-blue-950/50',
    done: 'bg-green-950/30',
    error: 'bg-red-950/30',
  }[status]

  return (
    <div
      className={`rounded-xl border transition-all duration-500 overflow-hidden animate-slide-in-right ${statusBg}`}
      style={{
        borderColor: status === 'working' ? employee.color + '60' : status === 'done' ? employee.color + '40' : '#374151',
        animationDelay: `${index * 100}ms`,
        boxShadow: status === 'working' ? `0 0 20px ${employee.color}20` : 'none',
      }}
    >
      {/* Card Header */}
      <div className="flex items-center gap-3 p-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 shadow-lg"
          style={{ backgroundColor: employee.color + '20', border: `2px solid ${employee.color}40` }}
        >
          {employee.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-medium text-sm">{employee.name}</p>
            <span className="text-gray-500 text-xs">•</span>
            <span className="text-xs" style={{ color: employee.color }}>{employee.role}</span>
          </div>
          <p className="text-gray-400 text-xs mt-0.5 truncate">{employee.taskTitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-navy-900 rounded-full px-2.5 py-1">
            {statusIcon}
            <span className="text-xs text-gray-400">{statusText}</span>
          </div>
        </div>
      </div>

      {/* Task description */}
      <div className="px-4 pb-3">
        <p className="text-gray-500 text-xs leading-relaxed">{employee.task}</p>
      </div>

      {/* Output (when done) */}
      {(status === 'done' || status === 'working') && output && (
        <div className="border-t border-gray-800">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span>アウトプット {status === 'working' ? '(作業中)' : ''}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expanded && (
            <div className="px-4 pb-4">
              <div
                className="text-xs text-gray-300 leading-relaxed bg-navy-950 rounded-lg p-3 max-h-64 overflow-y-auto prose prose-invert prose-xs max-w-none"
              >
                <ReactMarkdown>{output}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
