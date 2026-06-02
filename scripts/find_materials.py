"""
Google Drive を徘徊して「これは！」という素材を拾い上げ、Gmailで通知するスクリプト。
GitHub Actions から呼び出すことを想定。

選定基準:
  - 過去 DAYS_BACK 日以内に更新されたファイル
  - スター付きファイル
  - 共有されたばかりのファイル（自分以外がオーナー）
  - ファイルの種類ごとに重み付けしてスコア化し、上位 TOP_N 件を返す
"""

import os
import base64
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText

import pytz
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# ---- 設定 ----------------------------------------------------------------

SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]

TIMEZONE       = os.environ.get("TIMEZONE", "Asia/Tokyo")
RECIPIENT_EMAIL = os.environ.get("RECIPIENT_EMAIL", "tomoya.jbase@gmail.com")
DAYS_BACK      = int(os.environ.get("DAYS_BACK", "7"))
TOP_N          = int(os.environ.get("TOP_N", "10"))

# MIME タイプ → 表示名・スコア加算値
MIME_SCORES: dict[str, tuple[str, int]] = {
    "application/vnd.google-apps.presentation": ("📊 スライド", 3),
    "application/vnd.google-apps.spreadsheet":  ("📗 スプレッドシート", 2),
    "application/vnd.google-apps.document":     ("📄 ドキュメント", 2),
    "application/vnd.google-apps.form":         ("📋 フォーム", 1),
    "application/pdf":                           ("📕 PDF", 2),
    "image/png":                                 ("🖼 画像(PNG)", 1),
    "image/jpeg":                                ("🖼 画像(JPG)", 1),
    "video/mp4":                                 ("🎬 動画", 3),
    "audio/mpeg":                                ("🎵 音声", 2),
}
DEFAULT_TYPE = ("📁 ファイル", 1)

# ---- 認証 ----------------------------------------------------------------

def get_credentials() -> Credentials:
    creds = Credentials(
        token=None,
        refresh_token=os.environ["GOOGLE_REFRESH_TOKEN"],
        client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
        token_uri="https://oauth2.googleapis.com/token",
        scopes=SCOPES,
    )
    creds.refresh(Request())
    return creds

# ---- Drive 探索 ----------------------------------------------------------

def _rfc3339(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S+00:00")


def search_drive(creds: Credentials) -> list[dict]:
    service = build("drive", "v3", credentials=creds)
    cutoff = datetime.now(timezone.utc) - timedelta(days=DAYS_BACK)

    query = f"modifiedTime > '{_rfc3339(cutoff)}' and trashed = false"
    fields = (
        "nextPageToken, files("
        "id, name, mimeType, modifiedTime, viewedByMeTime, "
        "starred, owners, webViewLink, description"
        ")"
    )

    files: list[dict] = []
    page_token = None
    while True:
        resp = service.files().list(
            q=query,
            fields=fields,
            pageSize=100,
            orderBy="modifiedTime desc",
            pageToken=page_token,
        ).execute()
        files.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break

    return files


def score_file(f: dict) -> int:
    """ファイルの「面白さ」スコアを計算する。"""
    _, base_score = MIME_SCORES.get(f.get("mimeType", ""), DEFAULT_TYPE)
    score = base_score

    if f.get("starred"):
        score += 5

    # 自分以外がオーナー = 共有素材
    owners = f.get("owners", [])
    if owners and not owners[0].get("me", True):
        score += 2

    # 最近閲覧済み = 自分が気にしているファイル
    viewed = f.get("viewedByMeTime")
    if viewed:
        viewed_dt = datetime.fromisoformat(viewed.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) - viewed_dt < timedelta(days=1):
            score += 2

    return score


def pick_top(files: list[dict], n: int) -> list[dict]:
    scored = sorted(files, key=score_file, reverse=True)
    return scored[:n]

# ---- フォーマット ---------------------------------------------------------

def format_file_line(f: dict, tz: pytz.BaseTzInfo) -> str:
    label, _ = MIME_SCORES.get(f.get("mimeType", ""), DEFAULT_TYPE)
    name = f.get("name", "（名前なし）")
    link = f.get("webViewLink", "")
    modified = f.get("modifiedTime", "")
    if modified:
        dt = datetime.fromisoformat(modified.replace("Z", "+00:00")).astimezone(tz)
        modified_str = dt.strftime("%m/%d %H:%M")
    else:
        modified_str = "不明"

    star = "⭐ " if f.get("starred") else ""
    owners = f.get("owners", [])
    shared = "🤝 " if owners and not owners[0].get("me", True) else ""

    header = f"{star}{shared}{label}　{name}"
    meta   = f"   更新: {modified_str}　{link}"
    return f"{header}\n{meta}"


def build_body(files: list[dict], tz: pytz.BaseTzInfo) -> str:
    today = datetime.now(tz)
    lines = [
        f"こんにちは！\n",
        f"Google Drive を {DAYS_BACK} 日分さかのぼって、",
        f"気になる素材を {len(files)} 件ピックアップしました。\n",
        "─" * 40,
        "",
    ]
    for i, f in enumerate(files, 1):
        lines.append(f"【{i}】 {format_file_line(f, tz)}")
        lines.append("")

    lines += [
        "─" * 40,
        "",
        "⭐ = スター付き　🤝 = 他者共有",
        f"\n以上、Drive スカウト ({today.strftime('%Y/%m/%d %H:%M')} JST)",
    ]
    return "\n".join(lines)

# ---- Gmail 送信 ----------------------------------------------------------

def send_gmail(creds: Credentials, subject: str, body: str) -> None:
    service = build("gmail", "v1", credentials=creds)
    message = MIMEText(body, "plain", "utf-8")
    message["to"] = RECIPIENT_EMAIL
    message["subject"] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    service.users().messages().send(userId="me", body={"raw": raw}).execute()

# ---- エントリポイント ----------------------------------------------------

def main() -> None:
    tz    = pytz.timezone(TIMEZONE)
    today = datetime.now(tz)

    creds = get_credentials()

    print("🔍 Drive を探索中...")
    all_files = search_drive(creds)
    print(f"   {len(all_files)} 件のファイルが見つかりました")

    top_files = pick_top(all_files, TOP_N)
    print(f"   スコア上位 {len(top_files)} 件を選定しました")

    if not top_files:
        print("ℹ️  対象ファイルがなかったため通知をスキップします")
        return

    subject = f"🗂 Drive スカウト: 今週の注目素材 ({today.month}/{today.day})"
    body    = build_body(top_files, tz)

    send_gmail(creds, subject, body)
    print(f"✅ 送信完了: {subject}")


if __name__ == "__main__":
    main()
