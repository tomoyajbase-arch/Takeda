import { useWorkflowStore } from '../stores/workflowStore'
import { TaskPlan } from '../types'

export function useWorkflow() {
  const store = useWorkflowStore()

  const sendToSecretary = async (userMessage: string) => {
    store.addMessage({ role: 'user', content: userMessage })
    store.setIsSecretaryTyping(true)
    store.setPhase('clarifying')

    const allMessages = [
      ...store.messages,
      { role: 'user' as const, content: userMessage },
    ]

    let fullResponse = ''
    store.addMessage({ role: 'assistant', content: '' })

    try {
      const response = await fetch('/api/chat/secretary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages, apiKey: store.apiKey }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'chunk') {
                fullResponse += data.text
                store.updateLastAssistantMessage(data.text)
              } else if (data.type === 'done') {
                break
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      }
    } finally {
      store.setIsSecretaryTyping(false)
    }

    if (fullResponse.includes('[READY_TO_PLAN]')) {
      await generatePlan()
    }
  }

  const generatePlan = async () => {
    store.setPhase('planning')

    try {
      const response = await fetch('/api/workflow/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: store.messages,
          apiKey: store.apiKey,
        }),
      })

      const plan: TaskPlan = await response.json()
      store.setTaskPlan(plan)
      store.setPhase('awaiting_approval')
    } catch (error) {
      console.error('Plan generation failed:', error)
      store.setPhase('clarifying')
    }
  }

  const approvePlan = async (feedback?: string) => {
    if (!store.taskPlan) return

    store.setPhase('executing')

    try {
      const response = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: store.taskPlan,
          conversation: store.messages,
          userFeedback: feedback,
          apiKey: store.apiKey,
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'employee_start') {
                store.setEmployeeStatus(data.employeeId, 'working')
              } else if (data.type === 'employee_chunk') {
                store.appendEmployeeOutput(data.employeeId, data.chunk)
              } else if (data.type === 'employee_done') {
                store.setEmployeeStatus(data.employeeId, 'done')
              } else if (data.type === 'employee_error') {
                store.setEmployeeStatus(data.employeeId, 'error')
              } else if (data.type === 'all_done') {
                await reviewOutputs()
              }
            } catch {
              // skip malformed
            }
          }
        }
      }
    } catch (error) {
      console.error('Execution failed:', error)
    }
  }

  const reviewOutputs = async () => {
    if (!store.taskPlan) return

    store.setPhase('reviewing')
    store.setReviewText('')

    let reviewText = ''

    try {
      const response = await fetch('/api/workflow/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: store.taskPlan,
          outputs: store.employeeOutputs,
          conversation: store.messages,
          apiKey: store.apiKey,
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'chunk') {
                reviewText += data.text
                store.appendReviewText(data.text)
              } else if (data.type === 'done') {
                break
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (error) {
      console.error('Review failed:', error)
    }

    if (reviewText.includes('[APPROVED]')) {
      store.setPhase('presenting')
    } else if (reviewText.includes('[NEEDS_REVISION')) {
      // Re-execute with revision instructions
      await reviseOutputs(reviewText)
    } else {
      store.setPhase('presenting')
    }
  }

  const reviseOutputs = async (reviewInstructions: string) => {
    if (!store.taskPlan) return

    store.setPhase('executing')

    // Reset statuses for revision
    store.taskPlan.employees.forEach((e) => {
      store.setEmployeeStatus(e.id, 'waiting')
    })

    // Build revised plan with feedback
    try {
      const response = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: store.taskPlan,
          conversation: store.messages,
          userFeedback: `秘書からの修正指示:\n${reviewInstructions}\n\n前回のアウトプット:\n${JSON.stringify(store.employeeOutputs)}`,
          apiKey: store.apiKey,
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'employee_start') {
                store.setEmployeeStatus(data.employeeId, 'working')
              } else if (data.type === 'employee_chunk') {
                store.appendEmployeeOutput(data.employeeId, data.chunk)
              } else if (data.type === 'employee_done') {
                store.setEmployeeStatus(data.employeeId, 'done')
              } else if (data.type === 'all_done') {
                store.setPhase('presenting')
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (error) {
      console.error('Revision failed:', error)
      store.setPhase('presenting')
    }
  }

  const confirmComplete = () => {
    store.setPhase('complete')
  }

  const startNew = () => {
    store.reset()
  }

  return {
    sendToSecretary,
    approvePlan,
    confirmComplete,
    startNew,
  }
}
