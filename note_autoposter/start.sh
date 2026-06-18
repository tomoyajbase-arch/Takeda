#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ ! -f ".env" ]; then
  echo "❌ .envファイルが見つかりません。setup.sh を先に実行してください。"
  exit 1
fi

export $(grep -v '^#' .env | xargs 2>/dev/null) || true

mkdir -p data thumbnails

echo "🚀 Note Autoposter 起動中..."
echo "   ブラウザで http://localhost:8000 を開いてください"
echo ""

cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
