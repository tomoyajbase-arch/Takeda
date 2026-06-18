import { create } from 'zustand'
import { Message, TaskPlan, EmployeeStatus, Phase } from '../types'

interface WorkflowStore {
  phase: Phase
  apiKey: string
  messages: Message[]
  taskPlan: TaskPlan | null
  employeeStatuses: Record<string, EmployeeStatus>
  employeeOutputs: Record<string, string>
  reviewText: string
  isSecretaryTyping: boolean

  setPhase: (phase: Phase) => void
  setApiKey: (key: string) => void
  addMessage: (message: Message) => void
  updateLastAssistantMessage: (text: string) => void
  setTaskPlan: (plan: TaskPlan) => void
  setEmployeeStatus: (id: string, status: EmployeeStatus) => void
  appendEmployeeOutput: (id: string, chunk: string) => void
  setReviewText: (text: string) => void
  appendReviewText: (chunk: string) => void
  setIsSecretaryTyping: (typing: boolean) => void
  reset: () => void
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  phase: 'setup',
  apiKey: localStorage.getItem('ai-company-api-key') || '',
  messages: [],
  taskPlan: null,
  employeeStatuses: {},
  employeeOutputs: {},
  reviewText: '',
  isSecretaryTyping: false,

  setPhase: (phase) => set({ phase }),
  setApiKey: (key) => {
    localStorage.setItem('ai-company-api-key', key)
    set({ apiKey: key })
  },
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateLastAssistantMessage: (text) =>
    set((state) => {
      const messages = [...state.messages]
      const last = messages[messages.length - 1]
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = { ...last, content: last.content + text }
      } else {
        messages.push({ role: 'assistant', content: text })
      }
      return { messages }
    }),
  setTaskPlan: (plan) => {
    const statuses: Record<string, EmployeeStatus> = {}
    const outputs: Record<string, string> = {}
    plan.employees.forEach((e) => {
      statuses[e.id] = 'waiting'
      outputs[e.id] = ''
    })
    set({ taskPlan: plan, employeeStatuses: statuses, employeeOutputs: outputs })
  },
  setEmployeeStatus: (id, status) =>
    set((state) => ({
      employeeStatuses: { ...state.employeeStatuses, [id]: status },
    })),
  appendEmployeeOutput: (id, chunk) =>
    set((state) => ({
      employeeOutputs: {
        ...state.employeeOutputs,
        [id]: (state.employeeOutputs[id] || '') + chunk,
      },
    })),
  setReviewText: (text) => set({ reviewText: text }),
  appendReviewText: (chunk) =>
    set((state) => ({ reviewText: state.reviewText + chunk })),
  setIsSecretaryTyping: (typing) => set({ isSecretaryTyping: typing }),
  reset: () =>
    set({
      phase: 'idle',
      messages: [],
      taskPlan: null,
      employeeStatuses: {},
      employeeOutputs: {},
      reviewText: '',
      isSecretaryTyping: false,
    }),
}))
