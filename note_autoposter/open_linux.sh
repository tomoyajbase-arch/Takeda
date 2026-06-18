#!/bin/bash
cd "$(dirname "$0")"
clear
echo "================================"
echo "   Note Autoposter 起動中..."
echo "================================"

if ! command -v python3 &>/dev/null; then
  echo "❌ Python3が見つかりません: sudo apt install python3 python3-pip"
  exit 1
fi

if [ ! -f ".deps_installed" ]; then
  echo "📦 パッケージをインストール中..."
  pip3 install -r backend/requirements.txt -q
  python3 -m playwright install chromium -q 2>/dev/null || true
  touch .deps_installed
fi

[ ! -f ".env" ] && cp .env.example .env
mkdir -p data thumbnails

# ポート解放
fuser -k 8000/tcp 2>/dev/null; sleep 1

# サーバー起動
cd backend
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 &
SERVER_PID=$!
cd ..

# 起動待ち
for i in {1..20}; do
  curl -s http://127.0.0.1:8000/ > /dev/null 2>&1 && break
  sleep 0.5
done

# ブラウザを開く（環境に応じて）
xdg-open "http://127.0.0.1:8000/" 2>/dev/null || \
  gnome-open "http://127.0.0.1:8000/" 2>/dev/null || \
  echo "ブラウザで http://127.0.0.1:8000/ を開いてください"

echo ""
echo "✅ 起動完了 → http://127.0.0.1:8000/"
echo "終了: Ctrl+C"
wait $SERVER_PID
