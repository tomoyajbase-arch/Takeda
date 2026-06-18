import { create } from "zustand";
import { SessionState, Message, Employee, Task, Plan, Phase } from "./types";
import { v4 as uuidv4 } from "uuid";

interface Store extends SessionState {
  addMessage: (role: "user" | "secretary", content: string) => void;
  setPhase: (phase: Phase) => void;
  setGoal: (goal: string) => void;
  setPlan: (plan: Plan) => void;
  setEmployees: (employees: Employee[]) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  setTasks: (tasks: Task[]) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  setFinalOutput: (output: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState: SessionState = {
  phase: "idle",
  messages: [],
  goal: "",
  plan: null,
  employees: [],
  tasks: [],
  finalOutput: "",
  isLoading: false,
};

export const useStore = create<Store>((set) => ({
  ...initialState,
  addMessage: (role, content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: uuidv4(), role, content, timestamp: new Date() },
      ],
    })),
  setPhase: (phase) => set({ phase }),
  setGoal: (goal) => set({ goal }),
  setPlan: (plan) => set({ plan }),
  setEmployees: (employees) => set({ employees }),
  updateEmployee: (id, updates) =>
    set((state) => ({
      employees: state.employees.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),
  setTasks: (tasks) => set({ tasks }),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  setFinalOutput: (finalOutput) => set({ finalOutput }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set(initialState),
}));
