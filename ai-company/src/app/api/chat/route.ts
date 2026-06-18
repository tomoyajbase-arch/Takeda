import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SECRETARY_SYSTEM = `あなたは優秀な秘書です。社長（ユーザー）のタスクを完全に理解し、遂行するための優れたコーディネーターです。

あなたの役割：
1. 社長から抽象的なゴールを受け取る
2. ゴールを具体化するために的確な質問をする（必要最小限で、1回に1〜3個まで）
3. 十分な情報が集まったら、タスクを細分化して専門の社員に振り分ける計画を立てる
4. 社員のアウトプットを確認し、必要に応じてブラッシュアップする
5. 最終成果物を社長に報告する

性格：
- 聡明で先回りして考える
- 丁寧だが無駄のないコミュニケーション
- 社長の意図を汲み取る力がある
- プロフェッショナルかつ温かみのある対応

言語：日本語で会話する

現在の状態を判断して適切に応答してください。`;

export async function POST(req: NextRequest) {
  const { messages, mode } = await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
          role: m.role === "secretary" ? "assistant" : "user",
          content: m.content,
        }));

        const response = await client.messages.create({
          model: "claude-opus-4-5",
          max_tokens: 2048,
          system: SECRETARY_SYSTEM + (mode === "questioning" ? "\n\n今は質問フェーズです。ゴールを明確化するための質問をしてください。" : ""),
          messages: anthropicMessages,
          stream: true,
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
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
