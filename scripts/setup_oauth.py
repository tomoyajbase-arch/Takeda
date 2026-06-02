"""
初回セットアップ: OAuth認証を行いGitHub Secretsに設定するトークンを取得する。

使い方:
  pip install google-auth-oauthlib
  python scripts/setup_oauth.py
"""
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/drive.readonly",
]


def main():
    print("=== Google OAuth セットアップ ===")
    print("Google Cloud Console でOAuth2クライアントIDを作成してください。")
    print("種類: デスクトップアプリ\n")

    client_id = input("Client ID: ").strip()
    client_secret = input("Client Secret: ").strip()

    client_config = {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uris": ["http://localhost"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }

    flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
    creds = flow.run_local_server(port=0)

    print("\n=== GitHub Secrets に以下を設定してください ===")
    print(f"GOOGLE_CLIENT_ID     = {client_id}")
    print(f"GOOGLE_CLIENT_SECRET = {client_secret}")
    print(f"GOOGLE_REFRESH_TOKEN = {creds.refresh_token}")
    print(f"RECIPIENT_EMAIL      = (通知先メールアドレス)")
    print("\n設定場所: GitHub リポジトリ → Settings → Secrets and variables → Actions")


if __name__ == "__main__":
    main()
