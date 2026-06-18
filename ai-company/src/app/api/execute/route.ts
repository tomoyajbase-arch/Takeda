import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { task, employee, goal, allTasks } = await req.json();

  const systemPrompt = `あなたは${employee.role}の${employee.name}です。
専門性: ${employee.specialty}

あなたはAI会社の社員として、秘書から割り当てられたタスクを遂行します。
社長のゴール達成のために、あなたの専門性を最大限に発揮して、具体的で質の高いアウトプットを生成してください。

重要：
- 実際に役立つ、具体的なアウトプットを出す
- 作業の過程ではなく、成果物を出力する
- 日本語で出力する
- 適度な長さで、要点をまとめる`;

  const contextText = allTasks
    ? `\n\n【プロジェクト全体の他のタスク】\n${allTasks.map((t: { title: string }) => `- ${t.title}`).join("\n")}`
    : "";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: "claude-opus-4-5",
          max_tokens: 2000,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `【社長のゴール】\n${goal}${contextText}\n\n【あなたのタスク】\nタイトル: ${task.title}\n内容: ${task.description}\n\n上記のタスクを遂行してください。`,
            },
          ],
          stream: true,
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
              )
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error(err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
