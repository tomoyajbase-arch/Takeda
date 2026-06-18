export type Phase =
  | 'setup'
  | 'idle'
  | 'clarifying'
  | 'planning'
  | 'awaiting_approval'
  | 'executing'
  | 'reviewing'
  | 'presenting'
  | 'complete';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface TaskEmployee {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  task: string;
  taskTitle: string;
}

export interface TaskPlan {
  summary: string;
  employees: TaskEmployee[];
}

export type EmployeeStatus = 'waiting' | 'working' | 'done' | 'revising';

export interface EmployeeWork {
  employeeId: string;
  status: EmployeeStatus;
  output: string;
}
