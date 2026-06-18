# Note Autoposter

note.com（@tasty_hare849）への有料記事を自動生成・投稿するツール。

## 機能

| 機能 | 説明 |
|---|---|
| AI記事生成 | Claude APIが市場調査済みのニッチを選定し、無料部分（セールスレター）＋有料部分を生成 |
| サムネイル自動生成 | Pillowで1280×670のOGP画像を生成。5色カラースキームから選択可 |
| note自動投稿 | Playwrightでnote.comに自動ログイン→記事投稿（価格・予約設定対応） |
| 定期タスク | Cron式で完全自動化（例: 毎週月曜8時に自動生成→投稿） |
| 投稿予約 | 日時を指定して予約投稿 |

## セットアップ

```bash
cd note_autoposter
./setup.sh
```

`.env`を編集:
```
ANTHROPIC_API_KEY=sk-ant-...
NOTE_EMAIL=your@email.com
NOTE_PASSWORD=your_password
```

## 起動

```bash
./start.sh
```

ブラウザで http://localhost:8000 を開く。

## 使い方

1. **設定タブ** → APIキー・note認証情報を入力
2. **記事作成タブ** → 「AI生成」ボタンで1〜2分待つ
3. 生成された記事・サムネイルを確認・編集
4. 「noteに投稿」ボタンで自動投稿
5. **定期タスクタブ** → Cron式を設定して完全自動化

## ディレクトリ構成

```
note_autoposter/
├── backend/
│   ├── main.py          # FastAPI サーバー
│   ├── content_gen.py   # Claude API コンテンツ生成
│   ├── thumbnail.py     # Pillow サムネイル生成
│   ├── note_poster.py   # Playwright note.com 自動投稿
│   ├── scheduler.py     # APScheduler 定期タスク
│   ├── database.py      # SQLite DB
│   └── requirements.txt
├── frontend/
│   └── index.html       # UI（Tailwind CSS、レスポンシブ）
├── thumbnails/          # 生成サムネイル保存先
├── data/                # SQLite DB ファイル
├── .env                 # 認証情報（gitignore済み）
├── setup.sh
└── start.sh
```

## トンマナについて

生成AIはnote @tasty_hare849のトンマナ（AI・副業・自動化特化、再現性重視、誇張なし）を遵守するよう設定済み。
