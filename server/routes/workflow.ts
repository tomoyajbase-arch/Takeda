import { Router, Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { EMPLOYEE_POOL, SECRETARY_REVIEW_PROMPT } from '../utils/employees'

const router = Router()

// Generate task plan
router.post('/plan', async (req: Request, res: Response) => {
  const { conversation, apiKey } = req.body

  if (!apiKey) {
    res.status(400).json({ error: 'API key is required' })
    return
  }

  const client = new Anthropic({ apiKey })

  const employeeList = EMPLOYEE_POOL.map(
    (e) => `- ${e.id}: ${e.name}（${e.role}）`
  ).join('\n')

  const plannerPrompt = `あなたは優秀な秘書、橘リナです。社長との会話を分析し、タスクを適切な社員に割り振ります。

## 利用可能な社員
${employeeList}

## 指示
社長との会話内容を分析し、必要な社員とそれぞれのタスクを決定してください。
通常2〜4名の社員を選択します。タスクの性質に応じて最適な組み合わせを選んでください。

必ず以下のJSON形式で返してください（マークダウンなし、JSONのみ）:
{
  "summary": "社長が達成したいことの要約（1〜2文）",
  "employees": [
    {
      "id": "社員のID",
      "task": "この社員が担当する具体的なタスクの説明",
      "taskTitle": "タスクのタイトル（短く、10文字以内）"
    }
  ]
}`

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: plannerPrompt,
      messages: [
        {
          role: 'user',
          content: `以下の会話を分析してタスクプランを作成してください:\n\n${JSON.stringify(conversation)}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      res.status(500).json({ error: 'Failed to parse plan' })
      return
    }

    const rawPlan = JSON.parse(jsonMatch[0])

    // Enrich with full employee data
    const enrichedEmployees = rawPlan.employees.map((e: { id: string; task: string; taskTitle: string }) => {
      const def = EMPLOYEE_POOL.find((ep) => ep.id === e.id)
      if (!def) return null
      return {
        ...def,
        task: e.task,
        taskTitle: e.taskTitle,
      }
    }).filter(Boolean)

    res.json({ summary: rawPlan.summary, employees: enrichedEmployees })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

// Execute employee tasks with SSE streaming
router.post('/execute', async (req: Request, res: Response) => {
  const { plan, conversation, userFeedback, apiKey } = req.body

  if (!apiKey) {
    res.status(400).json({ error: 'API key is required' })
    return
  }

  const client = new Anthropic({ apiKey })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  const conversationContext = conversation
    .map((m: { role: string; content: string }) => `${m.role === 'user' ? '社長' : '橘秘書'}: ${m.content}`)
    .join('\n')

  const feedbackText = userFeedback ? `\n\n## 社長からの追加フィードバック\n${userFeedback}` : ''

  try {
    // Execute all employees in parallel but stream results as they come
    const tasks = plan.employees.map(async (employee: {
      id: string
      name: string
      role: string
      systemPrompt: string
      task: string
    }) => {
      sendEvent({ type: 'employee_start', employeeId: employee.id })

      const userMessage = `## 依頼内容の背景（社長との会話）
${conversationContext}${feedbackText}

## あなたへの担当タスク
${employee.task}

上記のタスクを担当してください。高品質なアウトプットを日本語で作成してください。`

      try {
        const stream = await client.messages.stream({
          model: 'claude-opus-4-8',
          max_tokens: 2048,
          system: employee.systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        })

        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            sendEvent({
              type: 'employee_chunk',
              employeeId: employee.id,
              chunk: chunk.delta.text,
            })
          }
        }

        sendEvent({ type: 'employee_done', employeeId: employee.id })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        sendEvent({ type: 'employee_error', employeeId: employee.id, message })
      }
    })

    await Promise.all(tasks)
    sendEvent({ type: 'all_done' })
    res.end()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    sendEvent({ type: 'error', message })
    res.end()
  }
})

// Secretary reviews outputs
router.post('/review', async (req: Request, res: Response) => {
  const { plan, outputs, conversation, apiKey } = req.body

  if (!apiKey) {
    res.status(400).json({ error: 'API key is required' })
    return
  }

  const client = new Anthropic({ apiKey })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  const conversationContext = conversation
    .map((m: { role: string; content: string }) => `${m.role === 'user' ? '社長' : '橘秘書'}: ${m.content}`)
    .join('\n')

  const outputsText = plan.employees
    .map((e: { id: string; name: string; role: string; taskTitle: string }) => {
      const output = outputs[e.id] || '（未完了）'
      return `### ${e.name}（${e.role}）- ${e.taskTitle}\n${output}`
    })
    .join('\n\n---\n\n')

  const reviewMessage = `## 社長の依頼（背景会話）
${conversationContext}

## タスク概要
${plan.summary}

## 各社員のアウトプット
${outputsText}

上記のアウトプットをレビューしてください。`

  try {
    const stream = await client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      system: SECRETARY_REVIEW_PROMPT,
      messages: [{ role: 'user', content: reviewMessage }],
    })

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        sendEvent({ type: 'chunk', text: chunk.delta.text })
      }
    }

    sendEvent({ type: 'done' })
    res.end()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    sendEvent({ type: 'error', message })
    res.end()
  }
})

export default router
