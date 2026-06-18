import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { goal, tasks, outputs } = await req.json();

  const systemPrompt = `あなたは優秀な秘書です。社員のアウトプットを確認し、社長のゴール達成のために最終レポートをまとめます。
  
各社員のアウトプットを統合し、わかりやすい最終報告書を作成してください。
- 見やすい構造にする（見出し、箇条書きなど）
- 社長が「なるほど、これで進められる」と思える内容にする
- 必要に応じて社員のアウトプットを補足・整理する
- 日本語で出力する`;

  const tasksText = tasks.map((t: { title: string; description: string }, i: number) => 
    `### ${t.title}\n${t.description}\n\n**アウトプット:**\n${outputs[i] || "（なし）"}`
  ).join("\n\n");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: "claude-opus-4-5",
          max_tokens: 3000,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `【社長のゴール】\n${goal}\n\n【社員のアウトプット】\n${tasksText}\n\n上記を統合して最終報告書を作成してください。`,
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
