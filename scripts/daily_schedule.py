"""
毎朝8時にGoogleカレンダーを取得してGmailで送信するスクリプト。
GitHub Actionsで実行することを想定。
"""
import os
import sys
from datetime import datetime, timedelta

import pytz
from googleapiclient.discovery import build

sys.path.insert(0, os.path.dirname(__file__))
from google_utils import get_credentials, send_gmail  # noqa: E402

SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]

TIMEZONE = os.environ.get("TIMEZONE", "Asia/Tokyo")
RECIPIENT_EMAIL = os.environ.get("RECIPIENT_EMAIL", "tomoya.jbase@gmail.com")
WEEKDAY_JA = ["月", "火", "水", "木", "金", "土", "日"]


def get_today_events(creds):
    service = build("calendar", "v3", credentials=creds)
    tz = pytz.timezone(TIMEZONE)
    today = datetime.now(tz).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    result = service.events().list(
        calendarId="primary",
        timeMin=today.isoformat(),
        timeMax=tomorrow.isoformat(),
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    return result.get("items", [])


def format_schedule(events):
    tz = pytz.timezone(TIMEZONE)

    if not events:
        return "今日の予定はありません。ゆっくりお過ごしください！"

    lines = []
    for event in events:
        summary = event.get("summary", "（タイトルなし）")
        start = event["start"].get("dateTime", event["start"].get("date"))
        end = event["end"].get("dateTime", event["end"].get("date"))
        location = event.get("location", "")

        if "T" in start:
            start_dt = datetime.fromisoformat(start).astimezone(tz)
            end_dt = datetime.fromisoformat(end).astimezone(tz)
            time_str = f"{start_dt.strftime('%H:%M')}〜{end_dt.strftime('%H:%M')}"
        else:
            time_str = "終日"

        line = f"■ {time_str}　{summary}"
        if location:
            line += f"\n   📍 {location}"
        lines.append(line)

    return "\n\n".join(lines)


def main():
    creds = get_credentials(SCOPES)

    tz = pytz.timezone(TIMEZONE)
    today = datetime.now(tz)
    weekday = WEEKDAY_JA[today.weekday()]
    date_str = f"{today.year}年{today.month}月{today.day}日（{weekday}）"

    events = get_today_events(creds)
    schedule = format_schedule(events)

    subject = f"📅 今日のスケジュール ({today.month}/{today.day})"
    body = (
        f"おはようございます！\n\n"
        f"{date_str} のスケジュールです。\n\n"
        f"{'─' * 30}\n\n"
        f"{schedule}\n\n"
        f"{'─' * 30}\n\n"
        f"よい一日をお過ごしください！"
    )

    send_gmail(creds, RECIPIENT_EMAIL, subject, body)
    print(f"✅ 送信完了: {subject}")


if __name__ == "__main__":
    main()
