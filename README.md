# Takeda 社内自動化ツール

社内向けの自動化スクリプト集。GitHub Actionsで定期実行し、結果をGmail通知する構成。

## ツール一覧

| スクリプト | 内容 | 実行タイミング |
|---|---|---|
| `scripts/daily_schedule.py` | 今日のGoogleカレンダー予定をメール通知 | 毎朝8:00 JST |
| `scripts/instagram_analytics.py` | 投稿後10日時点のInstagram投稿インサイトを分析し、伸ばすための示唆をメール通知 | 毎朝9:00 JST |

---

## Instagram投稿分析ツール

### できること

1. 会社のInstagramビジネスアカウントの投稿のうち、**投稿から9〜11日経過したもの**を毎日自動でチェック
2. リーチ・いいね・コメント・保存・シェア・エンゲージメント率などの数値を自動集計
3. 過去投稿の実績（`data/instagram_posts.json`に蓄積）と比較し、
   - アカウント全体の平均との比較
   - 同じ投稿形式（フィード/リール）の平均との比較
   - 保存率・シェア率・フォロワーに対するリーチ率などの指標チェック
   - Instagramの一般的なアルゴリズム/運用トレンドを踏まえたヒント
   を組み合わせて「伸ばすための示唆」を自動生成
4. `ANTHROPIC_API_KEY` を設定すると、上記データをもとにClaudeがより踏み込んだ多角的な分析コメントを追加生成
5. 結果をメールで毎日レポート、データは `data/instagram_posts.json` に蓄積されて分析の精度が徐々に上がっていく

### ログイン方式について（重要）

「ID・パスワードでインスタにログインする」ブラウザ自動化は行っていません。理由:

- Instagramの利用規約違反にあたり、**アカウント凍結のリスク**がある
- パスワードをどこかに保存する必要があり、セキュリティ上望ましくない

代わりに、Meta公式の **Instagram Graph API** を使い、Facebookログインによる正規のOAuthでビジネスアカウントの投稿・インサイトデータを取得しています。これは企業がInstagram分析ツールを作る際の標準的な方法です。

### 事前準備

対象のInstagramアカウントが **ビジネスアカウント（またはクリエイターアカウント）** で、**Facebookページに連携済み**であることが前提です（未連携の場合はInstagramアプリの設定から連携してください）。

1. https://developers.facebook.com/ でMetaアプリを作成（種類: ビジネス）
2. アプリに「Instagram」プロダクトを追加
3. [Graph API Explorer](https://developers.facebook.com/tools/explorer/) で以下の権限を付与してUser Access Tokenを発行
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_show_list`
   - `pages_read_engagement`
4. 以下を実行してGitHub Secretsに設定する値を取得

   ```bash
   pip install requests
   python scripts/setup_instagram_oauth.py
   ```

   Meta App ID / App Secret / 上記で発行した短期トークンを入力すると、60日間有効な長期トークンと、連携されているInstagramビジネスアカウントIDが表示されます。

5. GitHubリポジトリの `Settings → Secrets and variables → Actions` に以下を設定

   | Secret名 | 内容 |
   |---|---|
   | `IG_ACCESS_TOKEN` | 上記で取得した長期アクセストークン |
   | `IG_BUSINESS_ACCOUNT_ID` | 分析対象のInstagramビジネスアカウントID |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` | メール送信用（`daily_schedule.py`と共通。未設定なら下記「Googleカレンダー通知ツール」の手順でセットアップ） |
   | `RECIPIENT_EMAIL` | レポート送信先メールアドレス |
   | `ANTHROPIC_API_KEY`（任意） | ClaudeによるAI分析コメントを追加したい場合に設定 |

6. `.github/workflows/instagram_analytics.yml` が毎朝9:00 JSTに自動実行される。手動テストはGitHubの「Actions」タブから該当ワークフローを選び「Run workflow」で実行可能

### 既知の制約・今後ブラッシュアップできる点

- 長期アクセストークンは約60日で失効する（自動更新は未実装。期限が近づいたら `setup_instagram_oauth.py` を再実行してSecretsを更新）
- 「市場分析」は現状、自社アカウントの過去実績比較＋Instagramの一般的な運用知見（`instagram_analytics.py` 内の `PLATFORM_NOTES`）＋Claudeの知識ベースの示唆にとどまり、競合アカウントの実績や外部トレンドデータのリアルタイム取得は行っていない
- レポートは現状メールのみ。ダッシュボード（スプレッドシートやWebページ）化、Slack通知、週次/月次サマリーなども拡張候補
- 初回実行時は比較対象の過去データがないため、示唆の精度は運用を重ねるごとに上がっていく設計

---

## Googleカレンダー通知ツール

`scripts/daily_schedule.py` が使用するGoogle認証は `scripts/google_utils.py` に共通化されており、Instagram分析ツールのメール送信もここを利用しています。

### セットアップ

```bash
pip install google-auth-oauthlib
python scripts/setup_oauth.py
```

表示された `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` / `RECIPIENT_EMAIL` をGitHub Secretsに設定してください。
