#!/bin/bash
# ダブルクリックで起動するMac用ランチャー
cd "$(dirname "$0")"

# ターミナルウィンドウのタイトル
echo -e "\033]0;Note Autoposter\007"
clear
echo "================================"
echo "   Note Autoposter 起動中..."
echo "================================"
echo ""

# Python確認
if ! command -v python3 &>/dev/null; then
  echo "❌ Python3が見つかりません。"
  echo "   https://www.python.org/downloads/ からインストールしてください。"
  read -p "Enterキーで閉じる..."
  exit 1
fi

# 依存パッケージのインストール（初回のみ時間かかります）
if [ ! -f ".deps_installed" ]; then
  echo "📦 必要なパッケージをインストール中（初回のみ・数分かかります）..."
  pip3 install -r backend/requirements.txt -q
  python3 -m playwright install chromium -q 2>/dev/null || true
  touch .deps_installed
  echo "✅ インストール完了"
  echo ""
fi

# .envがなければ作成
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "⚠️  .envファイルを作成しました。"
  echo "   ブラウザの「設定」タブでAPIキーとnoteのID/PWを入力してください。"
  echo ""
fi

mkdir -p data thumbnails

# ポート確認・既存プロセス終了
if lsof -Pi :8000 -sTCP:LISTEN -t &>/dev/null; then
  kill $(lsof -t -i:8000) 2>/dev/null || true
  sleep 1
fi

# サーバー起動
echo "🚀 サーバーを起動中..."
cd backend
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 &
SERVER_PID=$!
cd ..

# ブラウザが開けるまで待つ
echo "⏳ 起動を待っています..."
for i in {1..20}; do
  if curl -s http://127.0.0.1:8000/ > /dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# ブラウザを開く
echo "🌐 ブラウザを開いています..."
open "http://127.0.0.1:8000/"

echo ""
echo "================================"
echo "   ✅ Note Autoposter 起動完了"
echo "   http://127.0.0.1:8000/"
echo "================================"
echo ""
echo "このウィンドウは開いたままにしてください。"
echo "終了するには Ctrl+C を押してください。"
echo ""

# サーバーが終了するまで待機
wait $SERVER_PID
