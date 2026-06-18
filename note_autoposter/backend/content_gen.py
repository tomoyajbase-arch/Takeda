"""
Content generator for note.com (tasty_hare849).
Uses real-time market research + learned author tone to produce
high-quality paid articles and free funnel articles.
"""

import anthropic
import asyncio
import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ── Author tone learned from real articles ──────────────────────────────────
# Source: actual article text provided by tasty_hare849
AUTHOR_TONE = """
【文体・トンマナ（@tasty_hare849の実際の記事から学習済み）】

●構造パターン
- 導入: 読者の現状・悩みを代弁→「なぜそうなるのか」の原因分析→解決策の提示→CTA
- 大見出しで章立て、各章を500〜800字で区切る
- 「〇〇の壁」「〇〇の罠」など名詞化した障壁フレームを使う
- 最後は「決断を迫る」クロージング

●語調・文体
- 「あなた」に直接語りかける二人称
- 「〜ですよね」「〜しませんか？」など問いかけを多用
- 断定 + 根拠の順（「〇〇です。なぜなら〜」）
- 数字・具体例を必ず入れる（「3ヶ月で月5万円」「7,000字」）
- 感情を揺さぶる対比（「買う側」vs「売る側」、「消費者」vs「創造主」）

●NG事項
- 根拠のない断言（「絶対稼げる」「誰でも100万」）
- 過度な煽り・不安の増幅だけで終わるもの
- 具体的手順なしのコンセプトだけの記事

●有料部分のクオリティ基準
- 購入者が「この値段なら安い」と感じる情報密度
- コピペ可能なプロンプト・テンプレート・コードを含む
- ステップ番号付き・再現手順を明記
"""

FALLBACK_MARKET = """
【note/brain市場データ（フォールバック）】
売れ筋タイトル例:
- AIで副業を始めた私が最初の3ヶ月で月5万円稼いだ全手順（¥980）
- ChatGPTで稼ぐ人が絶対に教えない「情報商材の作り方」完全版（¥500）
- 【完全自動化】Claudeを使ってnote記事を量産し月10万を達成した方法（¥1,480）

ブルーオーシャンニッチ:
- AIエージェントで完全自動化する副業ワークフロー
- ローカルLLMで情報漏洩ゼロの個人事業DX
- Claude+Pythonで自分だけの自動収益システムを構築
- AIでYouTubeショート量産→収益化の全手順

売れる価格帯: 300〜1,500円（500円が最多購入）
"""


def _build_market_context(market_data: dict | None) -> str:
    if not market_data or not market_data.get("scraped_ok"):
        return FALLBACK_MARKET

    titles = market_data.get("all_titles", [])[:10]
    avg = market_data.get("avg_price", 500)
    title_list = "\n".join(f"- {t}" for t in titles)
    return f"""
【リアルタイム市場調査結果（スクレイピング済み）】
直近の売れ筋タイトル:
{title_list}

平均価格: ¥{avg}
調査件数: {market_data.get('total_scraped', 0)}件

上記の傾向を踏まえ、競合が少ないがニーズが高いブルーオーシャンニッチを選んでください。
"""


def generate_article_idea(topic: str = "", market_data: dict | None = None) -> dict:
    """市場調査を踏まえたブルーオーシャン記事アイデアを生成"""
    topic_hint = f"テーマのヒント: {topic}" if topic else "テーマは自由に選んでください（ブルーオーシャンを優先）"
    market_ctx = _build_market_context(market_data)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""
{market_ctx}
{AUTHOR_TONE}
{topic_hint}

上記の市場データを踏まえ、note有料記事として最も売れそうなブルーオーシャンアイデアを1つ考案してください。

以下のJSON形式で返してください（他の文字は不要）:
{{
  "title": "記事タイトル（数字・結果・再現性を含む）",
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
    """アイデアから完全な有料記事（無料セールスレター＋有料コンテンツ）を生成"""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8000,
        messages=[{
            "role": "user",
            "content": f"""
{AUTHOR_TONE}

あなたはnoteクリエイター「tasty_hare849」として記事を書きます。
以下のアイデアから、必ず購入される高品質な有料記事を書いてください。

記事情報:
- タイトル: {idea['title']}
- コアバリュー: {idea['core_product']}
- ターゲット: {idea['target_reader']}
- 課題: {idea['pain_point']}
- 約束: {idea['promise']}

【無料部分（セールスレター）の要件】
- 「あなた」への語りかけで始める（読者の現状・悩みを代弁）
- 「なぜ稼げないのか」原因分析（〇〇の壁・罠フレーム）
- この記事で得られる具体的な成果を箇条書き
- 著者の実績・信頼性
- 購買意欲を高めるCTA（「決断を迫る」クロージング）
- 合計2000字以上

【有料部分（コアコンテンツ）の要件】
- ステップ番号付きの即実践できる手順
- コピペ可能なプロンプト・テンプレートを含む
- 失敗パターンと回避法
- 応用発展・さらに稼ぐTips
- 合計3500字以上

以下のJSON形式で返してください（他の文字は不要）:
{{
  "title": "最終タイトル",
  "free_content": "無料部分のMarkdown本文",
  "paid_content": "有料部分のMarkdown本文",
  "thumbnail_copy": "サムネイルに載せるキャッチコピー（20字以内）",
  "thumbnail_sub": "サムネイルのサブコピー（30字以内）"
}}
"""
        }]
    )
    return json.loads(response.content[0].text)


def generate_free_funnel_article(paid_article: dict) -> dict:
    """
    有料記事に対応する無料ファネル記事を生成。
    有料記事への自然な誘導線を含む。
    """
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=5000,
        messages=[{
            "role": "user",
            "content": f"""
{AUTHOR_TONE}

あなたはnoteクリエイター「tasty_hare849」です。
以下の有料記事のテーマに関連する「完全無料」の価値ある記事を書いてください。

有料記事タイトル: {paid_article['title']}
有料記事のコアバリュー: {paid_article.get('metadata', {}).get('core_product', '')}

【無料記事の目的】
- それ自体で価値がある（フォロワーを増やす）
- 有料記事への自然な橋渡しになる
- 「この人の有料記事を買いたい」と思わせる

【要件】
- 完全無料で提供できる入門・概念・Why の内容（How-toは有料へ）
- 2000字以上
- 末尾に有料記事への自然な誘導（売り込み感なし）
- 著者の人格・世界観が伝わる内容

以下のJSON形式で返してください（他の文字は不要）:
{{
  "title": "無料記事タイトル",
  "content": "無料記事のMarkdown本文（全文・無料公開）",
  "cta_to_paid": "有料記事への誘導文（150字以内）",
  "thumbnail_copy": "サムネイルコピー（20字以内）",
  "thumbnail_sub": "サブコピー（30字以内）"
}}
"""
        }]
    )
    data = json.loads(response.content[0].text)
    data["price"] = 0
    data["article_type"] = "free_funnel"
    data["linked_paid_title"] = paid_article["title"]
    return data


def score_article_quality(article: dict) -> dict:
    """
    生成された記事の品質を100点満点でスコアリング。
    70点未満は自動で再生成フラグを立てる。
    """
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": f"""
以下の有料記事の品質を評価してください。

タイトル: {article.get('title', '')}

無料部分（先頭500字）:
{(article.get('free_content') or '')[:500]}

有料部分（先頭500字）:
{(article.get('paid_content') or '')[:500]}

以下の観点で100点満点で採点し、JSON形式で返してください（他の文字は不要）:
{{
  "total_score": 0〜100の整数,
  "reproducibility": 0〜25（再現性・具体性のスコア）,
  "purchase_value": 0〜25（購入価値・情報密度のスコア）,
  "tone_match": 0〜25（@tasty_hare849のトンマナとの一致度）,
  "sales_letter": 0〜25（無料部分のセールス力）,
  "issues": ["問題点1", "問題点2"],
  "pass": true/false（70点以上でtrue）
}}
"""
        }]
    )
    return json.loads(response.content[0].text)


def generate_article_from_scratch(
    topic: str = "",
    price: int = 500,
    market_data: dict | None = None,
    auto_quality_check: bool = True,
    max_retries: int = 2,
) -> dict:
    """
    ゼロから完全な記事を生成（市場調査→アイデア→記事→品質チェック）。
    品質スコア70点未満は自動で再生成（最大2回）。
    """
    for attempt in range(max_retries + 1):
        idea = generate_article_idea(topic, market_data)
        idea["price"] = price
        article = generate_full_article(idea)
        article["price"] = price
        article["metadata"] = idea

        if auto_quality_check:
            score = score_article_quality(article)
            article["quality_score"] = score
            if score.get("pass", False) or attempt >= max_retries:
                break
        else:
            break

    return article
