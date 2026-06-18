import { create } from 'zustand';
import { Phase, Message, TaskPlan, EmployeeWork } from '../types';

interface WorkflowState {
  // Auth
  apiKey: string;
  setApiKey: (key: string) => void;

  // Phase
  phase: Phase;
  setPhase: (phase: Phase) => void;

  // Messages
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateLastMessage: (content: string) => void;
  clearMessages: () => void;

  // Secretary streaming
  secretaryStreaming: boolean;
  setSecretaryStreaming: (v: boolean) => void;
  streamingContent: string;
  setStreamingContent: (v: string) => void;
  appendStreamingContent: (v: string) => void;

  // Plan
  currentPlan: TaskPlan | null;
  setCurrentPlan: (plan: TaskPlan | null) => void;

  // Employee work
  employeeWorks: Record<string, EmployeeWork>;
  setEmployeeWork: (id: string, work: Partial<EmployeeWork>) => void;
  clearEmployeeWorks: () => void;

  // Review
  reviewText: string;
  setReviewText: (text: string) => void;
  appendReviewText: (text: string) => void;

  // Final output
  finalOutput: string;
  setFinalOutput: (text: string) => void;
  appendFinalOutput: (text: string) => void;

  // Revision rounds
  revisionRound: number;
  incrementRevisionRound: () => void;
  resetRevisionRound: () => void;

  // Reset everything
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  apiKey: localStorage.getItem('apiKey') || '',
  setApiKey: (key) => {
    localStorage.setItem('apiKey', key);
    set({ apiKey: key });
  },

  phase: localStorage.getItem('apiKey') ? 'idle' : 'setup',
  setPhase: (phase) => set({ phase }),

  messages: [],
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    }]
  })),
  updateLastMessage: (content) => set((state) => {
    const messages = [...state.messages];
    if (messages.length > 0) {
      messages[messages.length - 1] = {
        ...messages[messages.length - 1],
        content,
      };
    }
    return { messages };
  }),
  clearMessages: () => set({ messages: [] }),

  secretaryStreaming: false,
  setSecretaryStreaming: (v) => set({ secretaryStreaming: v }),
  streamingContent: '',
  setStreamingContent: (v) => set({ streamingContent: v }),
  appendStreamingContent: (v) => set((state) => ({ streamingContent: state.streamingContent + v })),

  currentPlan: null,
  setCurrentPlan: (plan) => set({ currentPlan: plan }),

  employeeWorks: {},
  setEmployeeWork: (id, work) => set((state) => ({
    employeeWorks: {
      ...state.employeeWorks,
      [id]: { ...state.employeeWorks[id], ...work, employeeId: id },
    }
  })),
  clearEmployeeWorks: () => set({ employeeWorks: {} }),

  reviewText: '',
  setReviewText: (text) => set({ reviewText: text }),
  appendReviewText: (text) => set((state) => ({ reviewText: state.reviewText + text })),

  finalOutput: '',
  setFinalOutput: (text) => set({ finalOutput: text }),
  appendFinalOutput: (text) => set((state) => ({ finalOutput: state.finalOutput + text })),

  revisionRound: 0,
  incrementRevisionRound: () => set((state) => ({ revisionRound: state.revisionRound + 1 })),
  resetRevisionRound: () => set({ revisionRound: 0 }),

  reset: () => set({
    phase: 'idle',
    messages: [],
    secretaryStreaming: false,
    streamingContent: '',
    currentPlan: null,
    employeeWorks: {},
    reviewText: '',
    finalOutput: '',
    revisionRound: 0,
  }),
}));
