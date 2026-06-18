import { Router, Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { SECRETARY_SYSTEM_PROMPT } from '../utils/employees'

const router = Router()

router.post('/secretary', async (req: Request, res: Response) => {
  const { messages, apiKey } = req.body

  if (!apiKey) {
    res.status(400).json({ error: 'API key is required' })
    return
  }

  const client = new Anthropic({ apiKey })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const stream = await client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: SECRETARY_SYSTEM_PROMPT,
      messages,
    })

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk.delta.text })}\n\n`)
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`)
    res.end()
  }
})

export default router
