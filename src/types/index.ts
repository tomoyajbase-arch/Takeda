export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface Employee {
  id: string
  name: string
  nameEn: string
  role: string
  emoji: string
  color: string
  task: string
  taskTitle: string
}

export interface TaskPlan {
  summary: string
  employees: Employee[]
}

export type EmployeeStatus = 'waiting' | 'working' | 'done' | 'error'

export type Phase =
  | 'setup'
  | 'idle'
  | 'clarifying'
  | 'planning'
  | 'awaiting_approval'
  | 'executing'
  | 'reviewing'
  | 'presenting'
  | 'complete'
