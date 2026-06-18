import { useCallback } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';
import { useSSE } from './useSSE';
import { TaskPlan } from '../types';

export function useWorkflow() {
  const store = useWorkflowStore();
  const { startSSE } = useSSE();

  const sendMessage = useCallback(async (content: string) => {
    if (!store.apiKey) return;

    store.addMessage({ role: 'user', content });
    store.setPhase('clarifying');
    store.setSecretaryStreaming(true);
    store.setStreamingContent('');

    const messagesForAPI = [...store.messages, { role: 'user', content }].map(m => ({
      role: m.role,
      content: m.content,
    }));

    let fullResponse = '';

    await startSSE('/api/chat/secretary', {
      messages: messagesForAPI,
      apiKey: store.apiKey,
    }, {
      onChunk: (text) => {
        fullResponse += text;
        store.appendStreamingContent(text);
      },
      onDone: () => {
        store.setSecretaryStreaming(false);
        store.addMessage({ role: 'assistant', content: fullResponse });
        store.setStreamingContent('');

        if (fullResponse.includes('[READY_TO_PLAN]')) {
          store.setPhase('planning');
          generatePlan([...store.messages, { role: 'user', content }, { role: 'assistant', content: fullResponse }]);
        } else {
          store.setPhase('clarifying');
        }
      },
      onError: (err) => {
        store.setSecretaryStreaming(false);
        store.addMessage({ role: 'assistant', content: `エラーが発生しました: ${err}` });
        store.setPhase('idle');
      },
    });
  }, [store, startSSE]);

  const generatePlan = useCallback(async (allMessages?: any[]) => {
    const messages = allMessages || store.messages;
    store.setPhase('planning');

    try {
      const response = await fetch('/api/workflow/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: messages.map((m: any) => ({ role: m.role, content: m.content })),
          apiKey: store.apiKey,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      const plan: TaskPlan = await response.json();
      store.setCurrentPlan(plan);
      store.setPhase('awaiting_approval');
    } catch (error: any) {
      store.addMessage({ role: 'assistant', content: `プラン作成エラー: ${error.message}` });
      store.setPhase('clarifying');
    }
  }, [store]);

  const executePlan = useCallback(async (plan: TaskPlan, userFeedback?: string) => {
    store.setPhase('executing');
    store.clearEmployeeWorks();

    // Initialize all employees as waiting
    plan.employees.forEach(e => {
      store.setEmployeeWork(e.id, { status: 'waiting', output: '' });
    });

    await startSSE('/api/workflow/execute', {
      plan,
      conversation: store.messages.map(m => ({ role: m.role, content: m.content })),
      userFeedback,
      apiKey: store.apiKey,
    }, {
      onEvent: (event) => {
        if (event.type === 'employee_start') {
          store.setEmployeeWork(event.employeeId, { status: 'working' });
        } else if (event.type === 'employee_chunk') {
          const current = store.employeeWorks[event.employeeId];
          store.setEmployeeWork(event.employeeId, {
            output: (current?.output || '') + event.chunk,
          });
        } else if (event.type === 'employee_done') {
          store.setEmployeeWork(event.employeeId, { status: 'done' });
        } else if (event.type === 'all_done') {
          reviewOutputs(plan);
        } else if (event.type === 'error') {
          store.addMessage({ role: 'assistant', content: `実行エラー: ${event.message}` });
          store.setPhase('clarifying');
        }
      },
      onDone: () => {
        // all_done event handles the transition
      },
      onError: (err) => {
        store.addMessage({ role: 'assistant', content: `実行エラー: ${err}` });
        store.setPhase('clarifying');
      },
    });
  }, [store, startSSE]);

  const reviewOutputs = useCallback(async (plan: TaskPlan) => {
    store.setPhase('reviewing');
    store.setReviewText('');

    const outputs: Record<string, string> = {};
    plan.employees.forEach(e => {
      outputs[e.id] = store.employeeWorks[e.id]?.output || '';
    });

    let fullReview = '';

    await startSSE('/api/workflow/review', {
      plan,
      outputs,
      conversation: store.messages.map(m => ({ role: m.role, content: m.content })),
      apiKey: store.apiKey,
    }, {
      onChunk: (text) => {
        fullReview += text;
        store.appendReviewText(text);
      },
      onDone: () => {
        const needsRevision = fullReview.match(/\[NEEDS_REVISION:(\w+)\]/g);
        const approved = fullReview.includes('[APPROVED]');

        if (approved || store.revisionRound >= 1) {
          presentFinalOutput(plan);
        } else if (needsRevision && store.revisionRound < 2) {
          store.incrementRevisionRound();
          executePlan(plan, `レビュー結果: ${fullReview}`);
        } else {
          presentFinalOutput(plan);
        }
      },
      onError: (err) => {
        store.addMessage({ role: 'assistant', content: `レビューエラー: ${err}` });
        presentFinalOutput(plan);
      },
    });
  }, [store, startSSE]);

  const presentFinalOutput = useCallback(async (plan: TaskPlan) => {
    store.setPhase('presenting');
    store.setFinalOutput('');

    const outputs: Record<string, string> = {};
    plan.employees.forEach(e => {
      outputs[e.id] = store.employeeWorks[e.id]?.output || '';
    });

    await startSSE('/api/workflow/present', {
      plan,
      outputs,
      conversation: store.messages.map(m => ({ role: m.role, content: m.content })),
      apiKey: store.apiKey,
    }, {
      onChunk: (text) => {
        store.appendFinalOutput(text);
      },
      onDone: () => {
        store.setPhase('complete');
      },
      onError: (err) => {
        store.setFinalOutput(`エラー: ${err}`);
        store.setPhase('complete');
      },
    });
  }, [store, startSSE]);

  const approveAndExecute = useCallback(async (feedback?: string) => {
    if (!store.currentPlan) return;
    store.resetRevisionRound();
    await executePlan(store.currentPlan, feedback);
  }, [store, executePlan]);

  const startNewTask = useCallback(() => {
    store.reset();
  }, [store]);

  return {
    sendMessage,
    generatePlan,
    executePlan,
    reviewOutputs,
    presentFinalOutput,
    approveAndExecute,
    startNewTask,
  };
}
