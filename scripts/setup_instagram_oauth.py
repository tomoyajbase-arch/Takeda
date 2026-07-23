"""
初回セットアップ: Instagram Graph API用の長期アクセストークンと
ビジネスアカウントIDを取得する。

事前準備（Meta for Developersで実施）:
  1. https://developers.facebook.com/ でアプリを作成（種類: ビジネス）
  2. アプリに「Instagram」プロダクトを追加
  3. 対象のFacebookページに、分析したいInstagramビジネス/クリエイター
     アカウントを連携しておく
  4. Graph API Explorer (https://developers.facebook.com/tools/explorer/) で
     作成したアプリを選択し、次の権限を付与して「User Token」を発行する:
       - instagram_basic
       - instagram_manage_insights
       - pages_show_list
       - pages_read_engagement
  5. 発行された短期トークンをこのスクリプト実行時に貼り付ける

使い方:
  pip install requests
  python scripts/setup_instagram_oauth.py

注意:
  ここで得られる長期トークンは約60日で失効する。失効前にこのスクリプトを
  再実行してGitHub Secretsを更新すること（自動更新は未実装。README参照）。
"""
import requests

GRAPH_API_VERSION = "v21.0"
GRAPH_BASE_URL = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


def main():
    print("=== Instagram Graph API セットアップ ===\n")
    app_id = input("Meta App ID: ").strip()
    app_secret = input("Meta App Secret: ").strip()
    short_token = input("Graph API Explorerで発行した短期User Access Token: ").strip()

    resp = requests.get(f"{GRAPH_BASE_URL}/oauth/access_token", params={
        "grant_type": "fb_exchange_token",
        "client_id": app_id,
        "client_secret": app_secret,
        "fb_exchange_token": short_token,
    })
    resp.raise_for_status()
    long_token = resp.json()["access_token"]
    print("\n✅ 長期アクセストークン（約60日有効）を取得しました。")

    resp = requests.get(f"{GRAPH_BASE_URL}/me/accounts", params={
        "fields": "name,id,instagram_business_account",
        "access_token": long_token,
    })
    resp.raise_for_status()
    pages = resp.json().get("data", [])

    print("\n=== 連携されているFacebookページ ===")
    if not pages:
        print("（ページが見つかりません。Facebookページの管理者権限を確認してください）")
    for p in pages:
        ig = p.get("instagram_business_account")
        ig_id = ig["id"] if ig else "（Instagramビジネスアカウント未連携）"
        print(f"- {p['name']} (page_id={p['id']}) → instagram_business_account_id={ig_id}")

    print("\n=== GitHub Secrets に以下を設定してください ===")
    print(f"IG_ACCESS_TOKEN         = {long_token}")
    print("IG_BUSINESS_ACCOUNT_ID  = (上記のinstagram_business_account_idを指定)")
    print("\n※ 長期トークンは約60日で失効します。失効前に本スクリプトを再実行して更新してください。")
    print("設定場所: GitHub リポジトリ → Settings → Secrets and variables → Actions")


if __name__ == "__main__":
    main()
