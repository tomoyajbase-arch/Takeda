#!/bin/bash
set -e
echo "=== Note Autoposter セットアップ ==="

cd "$(dirname "$0")"

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✅ .envファイルを作成しました。APIキーとnoteのログイン情報を設定してください:"
  echo "   nano .env"
fi

echo ""
echo "Pythonパッケージをインストール中..."
pip install -r backend/requirements.txt -q

echo "Playwrightブラウザをインストール中..."
playwright install chromium --with-deps

mkdir -p data thumbnails assets/fonts

echo ""
echo "=== セットアップ完了 ==="
echo ""
echo "起動方法:"
echo "  ./start.sh"
echo ""
echo "まず .env を編集してください:"
echo "  ANTHROPIC_API_KEY=sk-ant-..."
echo "  NOTE_EMAIL=your@email.com"
echo "  NOTE_PASSWORD=your_password"
