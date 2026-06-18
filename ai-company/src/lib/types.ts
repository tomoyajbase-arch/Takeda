export type Phase =
  | "idle"
  | "questioning"
  | "planning"
  | "confirming"
  | "executing"
  | "reviewing"
  | "complete";

export interface Message {
  id: string;
  role: "user" | "secretary";
  content: string;
  timestamp: Date;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  specialty: string;
  emoji: string;
  status: "preparing" | "working" | "done" | "revising";
  tasks: Task[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  employeeId: string;
  employeeName: string;
  status: "pending" | "in-progress" | "done" | "revision";
  output?: string;
}

export interface Plan {
  employees: {
    id: string;
    name: string;
    role: string;
    specialty: string;
    emoji: string;
    tasks: {
      id: string;
      title: string;
      description: string;
    }[];
  }[];
  summary: string;
}

export interface SessionState {
  phase: Phase;
  messages: Message[];
  goal: string;
  plan: Plan | null;
  employees: Employee[];
  tasks: Task[];
  finalOutput: string;
  isLoading: boolean;
}
