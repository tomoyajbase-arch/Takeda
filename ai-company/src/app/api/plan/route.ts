import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { goal, conversation } = await req.json();

  const systemPrompt = `あなたは優秀な秘書です。社長のゴールと会話履歴を元に、タスク実行計画をJSON形式で作成してください。

必ず以下のJSON形式で返答してください（他のテキストは含めないでください）：
{
  "summary": "計画の概要（2-3文）",
  "employees": [
    {
      "id": "emp_1",
      "name": "田中 優",
      "role": "役割（例：リサーチャー）",
      "specialty": "専門領域の説明",
      "emoji": "👩‍💼",
      "tasks": [
        {
          "id": "task_1",
          "title": "タスクのタイトル",
          "description": "具体的な作業内容の説明"
        }
      ]
    }
  ]
}

重要なルール：
- 社員は2〜5名程度（タスクの規模に合わせて）
- 各社員は明確な専門性を持つ
- タスクは具体的で実行可能な粒度に分解する
- 社員の名前は日本人名で
- 絵文字は役割に合ったものを選ぶ（例：研究者→🔬、デザイナー→🎨、エンジニア→💻、ライター→✍️、アナリスト→📊）
- JSON以外は絶対に出力しない`;

  const conversationText = conversation
    .map((m: { role: string; content: string }) => `${m.role === "user" ? "社長" : "秘書"}: ${m.content}`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 3000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `社長のゴール: ${goal}\n\n会話履歴:\n${conversationText}\n\n上記を元に実行計画をJSONで作成してください。`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Invalid response" }, { status: 500 });
  }

  try {
    // Extract JSON from the response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const plan = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ plan });
  } catch (e) {
    return NextResponse.json({ error: "Parse error", raw: content.text }, { status: 500 });
  }
}
