import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { setupSSE, sendSSEEvent, sendSSEDone } from '../utils/streaming';

const router = Router();

const SECRETARY_SYSTEM_PROMPT = `あなたは優秀な秘書、橘 リナです。社長（ユーザー）のタスクを理解し、適切な社員に振り分けます。

社長から抽象的な依頼を受けたら：
1. 依頼を正確に理解するため、必要な質問を順番に行う（一度に3つ以上聞かない）
2. 十分な情報が得られたら、「承知いたしました。プランを作成いたします。[READY_TO_PLAN]」と返す

話し方：丁寧で聡明、プロフェッショナル。日本語で会話する。
社長への敬語を忘れず、エレガントかつ知的な印象を心がけてください。
質問は簡潔に、1〜2つずつ行い、会話を自然な流れで進めてください。`;

router.post('/secretary', async (req: Request, res: Response) => {
  const { messages, apiKey } = req.body;

  if (!apiKey) {
    res.status(400).json({ error: 'API key is required' });
    return;
  }

  setupSSE(res);

  try {
    const client = new Anthropic({ apiKey });

    const stream = await client.messages.stream({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: SECRETARY_SYSTEM_PROMPT,
      messages: messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        sendSSEEvent(res, { type: 'chunk', text: chunk.delta.text });
      }
    }

    sendSSEDone(res);
  } catch (error: any) {
    sendSSEEvent(res, { type: 'error', message: error.message });
    res.end();
  }
});

export default router;
