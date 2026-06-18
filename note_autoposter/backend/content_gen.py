"""
Market-researched content generator for note.com paid articles.

Market insights (pre-researched):
- Top sellers: AI副業・自動化ノウハウ, ChatGPT活用術, SNS運用テンプレ,
  副業収益化ロードマップ, Notion/Obsidian活用法
- Blue ocean niches: AIエージェントを使った無在庫転売自動化,
  Claude+Pythonで作る個人事業DX, note有料記事を自動生成して月10万円稼ぐ方法,
  AIでYouTubeサムネ生成→収益化フロー, ローカルLLMで情報漏洩ゼロの副業ワークフロー
- Key success factors: 再現性・具体性・即実践できる,
  タイトルに数字と結果を入れる, サムネに強いコピーを入れる
"""

import anthropic
import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# note.com/tasty_hare849 のトンマナ設定
# ターゲット: AI・副業・自動化に関心を持つ20〜40代
# 文体: 親しみやすいが信頼感あり、具体的・実践的、無駄なく読みやすい
# NGライン: 誇大広告、根拠のない断言、読者を煽るだけで実態のない内容
AUTHOR_TONE = """
【文体・トンマナ指定】
- 話し言葉と書き言葉の中間（「です・ます」基調、ときに「〜ですよね」など親近感）
- 根拠と再現性を必ず示す（「私が実際に〇〇した結果」「手順通りやれば誰でも」）
- 誇張なし・具体的数字あり（「稼げる」ではなく「月5万円の副収入を得た手順」）
- 見出し・箇条書きを多用して読みやすく
- ターゲット: AI・副業に興味があるが行動できていない人
- noteアカウント: tasty_hare849
"""

MARKET_CONTEXT = """
【note/brain市場リサーチ済みデータ】
売れ筋カテゴリ:
1. AI×副業自動化（月収10万〜100万）
2. ChatGPT/Claude活用プロンプト集
3. SNSマーケティング自動化
4. 無在庫転売・ドロップシッピング自動化
5. Notion/業務効率化テンプレート

ブルーオーシャンニッチ（競合少・需要あり）:
- AIエージェントで完全自動化する副業ワークフロー
- ローカルLLMで情報漏洩ゼロの個人事業DX
- Claudeを使ったnote記事自動生成→月収ビジネス
- AIでYouTubeショート量産→収益化の全手順
- Perplexity+Claude+Pythonで情報商材を0から作る方法

売れるタイトルの法則:
- 数字（月収〇万、〇日で、〇ステップ）
- 結果（稼いだ・達成した・自動化した）
- 再現性（誰でも・初心者でも・完全コピーで）
- 即効性（今日から・即実践・すぐ使える）

価格帯: 300〜3,000円が最も売れやすい（500円が最多購入）
"""

def generate_article_idea(topic: str = "") -> dict:
    """市場調査を踏まえたブルーオーシャン記事アイデアを生成"""
    topic_hint = f"テーマのヒント: {topic}" if topic else "テーマは自由に選んでください"

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""
{MARKET_CONTEXT}
{AUTHOR_TONE}
{topic_hint}

上記の市場データを踏まえ、note有料記事として最も売れそうなブルーオーシャンアイデアを1つ考案してください。

以下のJSON形式で返してください（他の文字は不要）:
{{
  "title": "記事タイトル（タイトルに数字・結果・再現性を含む）",
  "core_product": "有料部分で提供するコアバリュー（具体的なノウハウ・テンプレ・手順書）",
  "target_reader": "ターゲット読者像",
  "pain_point": "読者が抱える課題・悩み",
  "promise": "この記事を読んだ後の読者の状態・約束",
  "price": 500,
  "keywords": ["キーワード1", "キーワード2", "キーワード3"]
}}
"""
        }]
    )
    return json.loads(response.content[0].text)

def generate_full_article(idea: dict) -> dict:
    """アイデアから完全な有料記事（無料部分＋有料部分）を生成"""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8000,
        messages=[{
            "role": "user",
            "content": f"""
{AUTHOR_TONE}

あなたはnoteクリエイター「tasty_hare849」として記事を書きます。
AI・副業・自動化ノウハウを得意とし、再現性と具体性を最重視するスタイルです。
以下のアイデアから、必ず購入される高品質な有料記事を書いてください。

記事情報:
- タイトル: {idea['title']}
- コアバリュー: {idea['core_product']}
- ターゲット: {idea['target_reader']}
- 課題: {idea['pain_point']}
- 約束: {idea['promise']}

【無料部分（セールスレター）の要件】
- 読者の課題に深く共感する導入（300字以上）
- この記事で得られる具体的な成果を箇条書き
- 著者の実績・信頼性（AIエージェント活用の専門家として）
- 有料部分への強い導線・購買意欲を高める文章
- 「続きを読む」ボタンの直前に購入を後押しするCTA
- 合計1500字以上

【有料部分（コアコンテンツ）の要件】
- 即実践できる具体的な手順（ステップバイステップ）
- コードスニペット・テンプレート・プロンプトを含む
- スクリーンショットの代わりとなる詳細な説明
- よくある失敗パターンとその回避法
- 応用発展・さらに稼ぐためのTips
- 合計3000字以上

以下のJSON形式で返してください（他の文字は不要）:
{{
  "title": "最終タイトル",
  "free_content": "無料部分のMarkdown本文（## ## などの見出しを使う）",
  "paid_content": "有料部分のMarkdown本文（## ## などの見出しを使う）",
  "thumbnail_copy": "サムネイルに載せる強烈なキャッチコピー（20字以内）",
  "thumbnail_sub": "サムネイルのサブコピー（30字以内）"
}}
"""
        }]
    )
    return json.loads(response.content[0].text)

def generate_article_from_scratch(topic: str = "", price: int = 500) -> dict:
    """ゼロから完全な記事を生成（アイデア→記事の一気通貫）"""
    idea = generate_article_idea(topic)
    idea["price"] = price
    article = generate_full_article(idea)
    article["price"] = price
    article["metadata"] = idea
    return article
