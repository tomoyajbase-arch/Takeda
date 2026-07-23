"""
投稿後10日時点のInstagram投稿インサイトを自動集計し、アカウントの推移や
投稿属性・Instagramの一般的な運用トレンドを多角的に踏まえて「伸ばすための示唆」を
メールでレポートするスクリプト。GitHub Actionsで毎日実行することを想定。

【ログイン方式について】
ID/パスワードによるブラウザ自動ログインはInstagram利用規約違反であり、
アカウント凍結リスクもあるため採用していない。代わりにMeta公式の
Instagram Graph API（Facebookログインによる正規OAuth）でビジネス
アカウントのインサイトを取得する。事前準備は README.md を参照。
"""
import json
import os
import re
import sys
from datetime import datetime, timedelta

import pytz
import requests

sys.path.insert(0, os.path.dirname(__file__))
from google_utils import get_credentials, send_gmail  # noqa: E402

GRAPH_API_VERSION = os.environ.get("GRAPH_API_VERSION", "v21.0")
GRAPH_BASE_URL = f"https://graph.facebook.com/{GRAPH_API_VERSION}"

IG_ACCESS_TOKEN = os.environ.get("IG_ACCESS_TOKEN")
IG_BUSINESS_ACCOUNT_ID = os.environ.get("IG_BUSINESS_ACCOUNT_ID")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")

TIMEZONE = os.environ.get("TIMEZONE", "Asia/Tokyo")
RECIPIENT_EMAIL = os.environ.get("RECIPIENT_EMAIL", "tomoya.jbase@gmail.com")
GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
HISTORY_PATH = os.path.join(DATA_DIR, "instagram_posts.json")

# 投稿後この日数の範囲に入った投稿をレポート対象にする（毎日実行前提で9〜11日に幅を持たせる）
TARGET_DAYS_MIN = 9
TARGET_DAYS_MAX = 11
LOOKBACK_DAYS = 14

WEEKDAY_JA = ["月", "火", "水", "木", "金", "土", "日"]

# Instagram運用の一般的な知見（示唆出しの土台。内容は定期的に見直すこと）
PLATFORM_NOTES = [
    "Instagramのアルゴリズムは「保存」「シェア」「滞在時間」を重視する傾向が強く、"
    "単純な『いいね』数より保存・共有されやすい構成（ノウハウ・リスト・比較形式など）が"
    "リーチ拡大に有利とされている。",
    "リール（ショート動画）は発見タブ・おすすめ経由での新規リーチ獲得に依然として強く、"
    "フィード投稿のみのアカウントはリーチが頭打ちになりやすい。",
    "投稿直後30〜60分の反応速度が初速の配信範囲に影響するとされ、"
    "フォロワーがアクティブな時間帯への投稿が初速に有利に働く。",
]


class GraphAPIError(Exception):
    def __init__(self, message):
        super().__init__(message)
        self.message = message


def graph_get(url_or_path, params=None):
    if url_or_path.startswith("http"):
        resp = requests.get(url_or_path, timeout=30)
    else:
        params = dict(params or {})
        params["access_token"] = IG_ACCESS_TOKEN
        resp = requests.get(f"{GRAPH_BASE_URL}/{url_or_path}", params=params, timeout=30)
    payload = resp.json()
    if "error" in payload:
        raise GraphAPIError(payload["error"].get("message", str(payload["error"])))
    return payload


def parse_ts(ts):
    dt = datetime.fromisoformat(ts)
    return dt.astimezone(pytz.timezone(TIMEZONE))


def get_recent_media(now):
    """直近LOOKBACK_DAYS日分＋αの投稿一覧を取得する。"""
    media = []
    cutoff = now - timedelta(days=LOOKBACK_DAYS + 2)
    data = graph_get(f"{IG_BUSINESS_ACCOUNT_ID}/media", {
        "fields": "id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count",
        "limit": 50,
    })
    while True:
        items = data.get("data", [])
        media.extend(items)
        if items and parse_ts(items[-1]["timestamp"]) < cutoff:
            break
        next_url = data.get("paging", {}).get("next")
        if not next_url or len(media) > 150:
            break
        data = graph_get(next_url)
    return media


def fetch_media_insights(media_id, media_product_type):
    """like/commentは media フィールドから別途取得するため、ここではreach系のみ扱う。
    メトリクス名はAPIバージョンで変わることがあるため、無効なメトリクスは
    エラーメッセージから特定して除外し再試行する。"""
    metrics = ["reach", "saved", "shares", "total_interactions"]
    if media_product_type == "REELS":
        metrics.append("plays")

    for _ in range(len(metrics) + 1):
        if not metrics:
            return {}
        try:
            data = graph_get(f"{media_id}/insights", {"metric": ",".join(metrics)})
            return {item["name"]: item["values"][0]["value"] for item in data.get("data", [])}
        except GraphAPIError as e:
            removed = False
            for m in list(metrics):
                if m in str(e.message):
                    metrics.remove(m)
                    removed = True
                    break
            if not removed:
                print(f"  ⚠️ insights取得失敗 ({media_id}): {e.message}")
                return {}
    return {}


def load_history():
    if not os.path.exists(HISTORY_PATH):
        return []
    with open(HISTORY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_history(history):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def build_record(media, posted_at, days_since, insights, followers_count):
    likes = media.get("like_count", 0) or 0
    comments = media.get("comments_count", 0) or 0
    saved = insights.get("saved", 0)
    shares = insights.get("shares", 0)
    reach = insights.get("reach", 0)
    total_interactions = insights.get("total_interactions", likes + comments + saved + shares)
    plays = insights.get("plays")

    engagement_rate = round((likes + comments + saved + shares) / reach * 100, 2) if reach else None
    reach_per_follower = round(reach / followers_count * 100, 2) if reach and followers_count else None

    caption = media.get("caption") or ""
    hashtag_count = len(re.findall(r"#\S+", caption))

    return {
        "media_id": media["id"],
        "permalink": media.get("permalink"),
        "caption_excerpt": caption[:60].replace("\n", " "),
        "media_type": media.get("media_type"),
        "media_product_type": media.get("media_product_type", "FEED"),
        "posted_at": posted_at.isoformat(),
        "analyzed_at": datetime.now(pytz.timezone(TIMEZONE)).isoformat(),
        "days_since_post": days_since,
        "posted_weekday": WEEKDAY_JA[posted_at.weekday()],
        "posted_hour": posted_at.hour,
        "likes": likes,
        "comments": comments,
        "saved": saved,
        "shares": shares,
        "reach": reach,
        "plays": plays,
        "total_interactions": total_interactions,
        "engagement_rate_pct": engagement_rate,
        "reach_per_follower_pct": reach_per_follower,
        "caption_length": len(caption),
        "hashtag_count": hashtag_count,
    }


def compute_baseline(history, media_product_type=None):
    pool = [r for r in history if r.get("engagement_rate_pct") is not None]
    if media_product_type:
        pool = [r for r in pool if r.get("media_product_type") == media_product_type]
    if not pool:
        return {}

    def avg(key):
        vals = [r[key] for r in pool if r.get(key) is not None]
        return round(sum(vals) / len(vals), 2) if vals else None

    return {
        "count": len(pool),
        "engagement_rate_pct": avg("engagement_rate_pct"),
        "reach": avg("reach"),
        "saved": avg("saved"),
        "shares": avg("shares"),
        "comments": avg("comments"),
        "likes": avg("likes"),
    }


def build_heuristic_insights(r, baseline, format_baseline):
    tips = []

    if baseline.get("engagement_rate_pct") is not None and r["engagement_rate_pct"] is not None:
        diff = r["engagement_rate_pct"] - baseline["engagement_rate_pct"]
        direction = "上回って" if diff >= 0 else "下回って"
        tips.append(
            f"エンゲージメント率は{r['engagement_rate_pct']}%で、過去平均"
            f"（{baseline['engagement_rate_pct']}%, n={baseline['count']}）を"
            f"{abs(round(diff, 2))}pt {direction}いる。"
        )

    if format_baseline.get("engagement_rate_pct") is not None and r["engagement_rate_pct"] is not None:
        diff = r["engagement_rate_pct"] - format_baseline["engagement_rate_pct"]
        if abs(diff) >= 0.5:
            better_worse = "好調" if diff >= 0 else "低調"
            tips.append(
                f"同じ投稿形式（{r['media_product_type']}）の過去平均"
                f"（{format_baseline['engagement_rate_pct']}%）と比べても{better_worse}。"
            )

    if r["reach"]:
        saved_rate = r["saved"] / r["reach"] * 100
        if saved_rate < 1.0:
            tips.append(
                f"保存率が{round(saved_rate, 2)}%と低め。ノウハウ・チェックリスト・比較表など"
                "後で見返したくなる構成にすると保存されやすくなり、発見タブでの露出増加が期待できる。"
            )
        share_rate = r["shares"] / r["reach"] * 100
        if share_rate < 0.3:
            tips.append(
                f"シェア率が{round(share_rate, 2)}%と低め。共感・驚き・"
                "『友達に送りたくなる』切り口を意識すると、DM経由の二次拡散が伸びやすい。"
            )

    if r.get("reach_per_follower_pct") is not None and r["reach_per_follower_pct"] < 30:
        tips.append(
            f"リーチ数がフォロワーの{r['reach_per_follower_pct']}%にとどまっている。"
            "フォロワー外への配信が弱い可能性があり、リール活用やトレンド音源・"
            "トピックの併用でアルゴリズム経由の新規リーチを狙いたい。"
        )

    if r["comments"] == 0:
        tips.append(
            "コメントが0件。キャプション末尾に質問や『あなたはどう思う？』"
            "のような一言を入れるとコメントを誘発しやすい。"
        )

    tips.extend(PLATFORM_NOTES)
    return tips


def build_ai_insight(record, baseline, history):
    try:
        import anthropic
    except ImportError:
        return None

    recent = history[-10:]
    recent_summary = "\n".join(
        f"- {h['posted_at'][:10]} {h['media_product_type']}: "
        f"エンゲージメント率{h.get('engagement_rate_pct')}%, リーチ{h.get('reach')}"
        for h in recent
    )

    prompt = f"""あなたはInstagram運用の分析アドバイザーです。以下の投稿データをもとに、
①アカウントの推移傾向　②投稿属性（形式・時間帯・キャプション等）　③Instagramの
一般的なアルゴリズム/トレンド動向 の3つの観点から、次の投稿を伸ばすための具体的な
示唆を日本語で3〜4個、箇条書きで簡潔に（各項目1〜2文）提案してください。

【今回の投稿】
投稿形式: {record['media_product_type']}
投稿日時: {record['posted_at']}（{record['posted_weekday']}曜・{record['posted_hour']}時）
キャプション冒頭: {record['caption_excerpt']}
ハッシュタグ数: {record['hashtag_count']}
リーチ: {record['reach']} / いいね: {record['likes']} / コメント: {record['comments']} / 保存: {record['saved']} / シェア: {record['shares']}
エンゲージメント率: {record['engagement_rate_pct']}%

【アカウントの過去平均】
{json.dumps(baseline, ensure_ascii=False)}

【直近投稿の推移】
{recent_summary if recent_summary else "データなし（初回分析）"}
"""

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=700,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()
    except Exception as e:
        print(f"  ⚠️ AI分析の生成に失敗: {e}")
        return None


def format_email(records, baseline, followers_count):
    tz = pytz.timezone(TIMEZONE)
    today = datetime.now(tz)
    subject = f"\U0001f4ca Instagram投稿分析（投稿後10日）{today.month}/{today.day} - {len(records)}件"

    lines = [
        "おはようございます。投稿後10日が経過した投稿の分析レポートです。",
        f"（フォロワー数: {followers_count}人）",
        "",
        "=" * 40,
    ]

    for r in records:
        lines.append("")
        lines.append(
            f"■ {r['posted_at'][:10]}（{r['posted_weekday']}・{r['posted_hour']}時）投稿 "
            f"/ {r['media_product_type']}"
        )
        lines.append(f"  {r['caption_excerpt']}...")
        lines.append(f"  {r['permalink']}")
        lines.append("")
        lines.append(
            f"  リーチ {r['reach']:,} / いいね {r['likes']:,} / コメント {r['comments']:,} / "
            f"保存 {r['saved']:,} / シェア {r['shares']:,}"
        )
        if r["engagement_rate_pct"] is not None:
            lines.append(f"  エンゲージメント率: {r['engagement_rate_pct']}%")
        lines.append("")
        lines.append("  【伸ばすための示唆】")
        for tip in r["heuristic_insights"]:
            lines.append(f"  ・{tip}")
        if r.get("ai_insight"):
            lines.append("")
            lines.append("  【AIによる多角的分析】")
            for line in r["ai_insight"].splitlines():
                lines.append(f"  {line}")
        lines.append("")
        lines.append("-" * 40)

    if baseline.get("count"):
        lines.append("")
        lines.append(f"参考: 過去{baseline['count']}件の平均エンゲージメント率 {baseline['engagement_rate_pct']}%")

    return subject, "\n".join(lines)


def main():
    if not IG_ACCESS_TOKEN or not IG_BUSINESS_ACCOUNT_ID:
        print("❌ IG_ACCESS_TOKEN / IG_BUSINESS_ACCOUNT_ID が設定されていません。README.md を参照して設定してください。")
        sys.exit(1)

    tz = pytz.timezone(TIMEZONE)
    now = datetime.now(tz)

    history = load_history()
    analyzed_ids = {r["media_id"] for r in history}

    account = graph_get(IG_BUSINESS_ACCOUNT_ID, {"fields": "followers_count,username"})
    followers_count = account.get("followers_count")

    media_list = get_recent_media(now)
    targets = []
    for m in media_list:
        if m["id"] in analyzed_ids:
            continue
        posted_at = parse_ts(m["timestamp"])
        days_since = (now.date() - posted_at.date()).days
        if TARGET_DAYS_MIN <= days_since <= TARGET_DAYS_MAX:
            targets.append((m, posted_at, days_since))

    if not targets:
        print("本日レポート対象の投稿（投稿後9〜11日）はありません。")
        return

    new_records = []
    for m, posted_at, days_since in targets:
        insights = fetch_media_insights(m["id"], m.get("media_product_type", "FEED"))
        record = build_record(m, posted_at, days_since, insights, followers_count)
        new_records.append(record)
        print(f"  ✅ 分析: {m['id']} (engagement {record['engagement_rate_pct']}%)")

    baseline = compute_baseline(history)
    format_baseline_cache = {}
    for r in new_records:
        fmt = r["media_product_type"]
        if fmt not in format_baseline_cache:
            format_baseline_cache[fmt] = compute_baseline(history, media_product_type=fmt)
        r["heuristic_insights"] = build_heuristic_insights(r, baseline, format_baseline_cache[fmt])
        r["ai_insight"] = build_ai_insight(r, baseline, history) if ANTHROPIC_API_KEY else None

    subject, body = format_email(new_records, baseline, followers_count)

    creds = get_credentials(GMAIL_SCOPES)
    send_gmail(creds, RECIPIENT_EMAIL, subject, body)
    print(f"✅ メール送信完了: {subject}")

    history.extend(new_records)
    save_history(history)


if __name__ == "__main__":
    main()
