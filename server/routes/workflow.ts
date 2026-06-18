import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { setupSSE, sendSSEEvent, sendSSEDone } from '../utils/streaming';
import { EMPLOYEES, getEmployeeById } from '../utils/employees';

const router = Router();

interface TaskEmployee {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  task: string;
  taskTitle: string;
}

interface TaskPlan {
  summary: string;
  employees: TaskEmployee[];
}

// Generate task plan from conversation
router.post('/plan', async (req: Request, res: Response) => {
  const { conversation, apiKey } = req.body;

  if (!apiKey) {
    res.status(400).json({ error: 'API key is required' });
    return;
  }

  try {
    const client = new Anthropic({ apiKey });

    const employeeList = EMPLOYEES.map(e =>
      `- ${e.id}: ${e.name} (${e.role}) ${e.emoji}`
    ).join('\n');

    const planningPrompt = `以下の会話をもとに、タスクの実行計画をJSON形式で作成してください。

利用可能な社員：
${employeeList}

会話内容：
${conversation.map((m: any) => `${m.role === 'user' ? '社長' : '秘書'}: ${m.content}`).join('\n')}

以下のJSON形式で返答してください（他のテキストは含めないこと）：
{
  "summary": "社長が達成したいことの要約（1〜2文）",
  "employees": [
    {
      "id": "社員ID",
      "name": "社員名",
      "role": "役割",
      "emoji": "絵文字",
      "color": "カラーコード",
      "task": "この社員に割り当てる具体的なタスクの詳細説明",
      "taskTitle": "タスクの短いタイトル（10文字以内）"
    }
  ]
}

注意：
- 通常2〜4名の社員を選択すること
- 各社員に明確で具体的なタスクを割り当てること
- 社員のcolor、emoji、nameは上記リストの定義通りに使用すること`;

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: planningPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      res.status(500).json({ error: 'Invalid response from AI' });
      return;
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: 'Could not parse plan' });
      return;
    }

    const plan: TaskPlan = JSON.parse(jsonMatch[0]);

    // Enrich with employee data
    plan.employees = plan.employees.map(e => {
      const emp = getEmployeeById(e.id);
      if (emp) {
        return { ...e, color: emp.color, emoji: emp.emoji };
      }
      return e;
    });

    res.json(plan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute tasks in parallel
router.post('/execute', async (req: Request, res: Response) => {
  const { plan, conversation, userFeedback, apiKey } = req.body as {
    plan: TaskPlan;
    conversation: any[];
    userFeedback?: string;
    apiKey: string;
  };

  if (!apiKey) {
    res.status(400).json({ error: 'API key is required' });
    return;
  }

  setupSSE(res);

  try {
    const client = new Anthropic({ apiKey });

    const contextSummary = conversation
      .map((m: any) => `${m.role === 'user' ? '社長' : '秘書'}: ${m.content}`)
      .join('\n');

    const feedbackNote = userFeedback
      ? `\n\n社長からのフィードバック：${userFeedback}`
      : '';

    // Run all employee tasks in parallel
    const employeeTasks = plan.employees.map(async (taskEmp) => {
      const employee = getEmployeeById(taskEmp.id);
      if (!employee) return;

      sendSSEEvent(res, { type: 'employee_start', employeeId: taskEmp.id });

      const taskPrompt = `プロジェクト概要：${plan.summary}

会話の背景：
${contextSummary}${feedbackNote}

あなたのタスク（${taskEmp.taskTitle}）：
${taskEmp.task}

上記タスクを完全に実行し、詳細な成果物を提供してください。`;

      const stream = await client.messages.stream({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        system: employee.systemPrompt,
        messages: [{ role: 'user', content: taskPrompt }],
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          sendSSEEvent(res, {
            type: 'employee_chunk',
            employeeId: taskEmp.id,
            chunk: chunk.delta.text,
          });
        }
      }

      sendSSEEvent(res, { type: 'employee_done', employeeId: taskEmp.id });
    });

    await Promise.all(employeeTasks);
    sendSSEEvent(res, { type: 'all_done' });
    sendSSEDone(res);
  } catch (error: any) {
    sendSSEEvent(res, { type: 'error', message: error.message });
    res.end();
  }
});

// Secretary reviews all outputs
router.post('/review', async (req: Request, res: Response) => {
  const { plan, outputs, conversation, apiKey } = req.body as {
    plan: TaskPlan;
    outputs: Record<string, string>;
    conversation: any[];
    apiKey: string;
  };

  if (!apiKey) {
    res.status(400).json({ error: 'API key is required' });
    return;
  }

  setupSSE(res);

  try {
    const client = new Anthropic({ apiKey });

    const outputSummary = plan.employees
      .map(e => `### ${e.name}（${e.taskTitle}）\n${outputs[e.id] || '（未完了）'}`)
      .join('\n\n');

    const reviewPrompt = `あなたは橘リナ秘書です。以下の社員の成果物をレビューし、社長に報告してください。

プロジェクト概要：${plan.summary}

各社員の成果物：
${outputSummary}

レビューの指針：
1. 各成果物の品質と完全性を評価する
2. 問題がある場合は [NEEDS_REVISION:社員ID] マーカーを使用する
3. 全て品質基準を満たしている場合は [APPROVED] マーカーを使用する
4. 社長への報告は丁寧で専門的な日本語で行う
5. 最終的な統合結果を簡潔にまとめる

例：
- 修正が必要な場合：「山田さんの分析は概ね良好ですが、〇〇の点で補足が必要です。[NEEDS_REVISION:yamada]」
- 承認の場合：「全ての成果物が基準を満たしております。[APPROVED]」`;

    const stream = await client.messages.stream({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: reviewPrompt }],
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

// Final presentation by secretary
router.post('/present', async (req: Request, res: Response) => {
  const { plan, outputs, conversation, apiKey } = req.body as {
    plan: TaskPlan;
    outputs: Record<string, string>;
    conversation: any[];
    apiKey: string;
  };

  if (!apiKey) {
    res.status(400).json({ error: 'API key is required' });
    return;
  }

  setupSSE(res);

  try {
    const client = new Anthropic({ apiKey });

    const outputSummary = plan.employees
      .map(e => `### ${e.name}（${e.taskTitle}）\n${outputs[e.id] || '（未完了）'}`)
      .join('\n\n');

    const presentPrompt = `あなたは橘リナ秘書です。社員の成果物を統合し、社長への最終報告を作成してください。

プロジェクト概要：${plan.summary}

各社員の成果物：
${outputSummary}

以下の形式で最終報告書を作成してください：
1. 冒頭：丁寧な挨拶と概要説明（秘書として）
2. 各パートの成果をわかりやすく統合・整理
3. 社長へのアクションアイテムや推奨事項（あれば）
4. 締めの挨拶

報告は日本語で、プロフェッショナルかつ読みやすい形式で提供してください。`;

    const stream = await client.messages.stream({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: presentPrompt }],
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
