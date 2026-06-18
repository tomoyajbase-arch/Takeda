import { useState } from 'react'
import './App.css'

const SECTIONS = [
  {
    title: '概要',
    questions: [
      {
        id: 'what',
        question: '何を作りますか？（1〜2文で）',
        placeholder: 'ユーザーが日々のタスクを登録・管理できるWebアプリ。締め切り・カテゴリ・優先度を設定でき、完了チェックができる。',
        required: true,
      },
      {
        id: 'why',
        question: 'なぜ作りますか？どんな課題を解決しますか？',
        placeholder: 'Excelで管理していたが見づらく、スマホでも確認したいため。',
        required: false,
      },
      {
        id: 'who',
        question: '誰が使いますか？規模は？',
        placeholder: '自分1人 / 社内チーム5名（全員PC操作に慣れている）/ 一般ユーザー向けに公開',
        required: true,
      },
    ],
  },
  {
    title: '機能',
    questions: [
      {
        id: 'features',
        question: '必須機能を列挙してください。（番号付きでOK）',
        placeholder: '1. タスク追加（タイトル・締め切り・カテゴリ・優先度）\n2. タスク一覧表示（フィルタ・並び替え対応）\n3. 完了チェック\n4. タスク削除',
        required: true,
      },
      {
        id: 'screens',
        question: 'どんな画面（ページ）が必要ですか？',
        placeholder: '- タスク一覧画面（メイン）\n- タスク追加/編集モーダル\n- 設定画面（カテゴリ管理）',
        required: true,
      },
      {
        id: 'out_of_scope',
        question: '今回スコープ外にする機能はありますか？',
        placeholder: 'ユーザー招待機能、通知機能は不要。モバイルアプリ版も不要（ブラウザのみ）。',
        required: false,
      },
    ],
  },
  {
    title: 'データ・認証',
    questions: [
      {
        id: 'auth',
        question: 'ログイン・認証は必要ですか？必要な場合、どの方式ですか？',
        placeholder: '不要（ログインなし） / メール＋パスワード / Googleログインのみ / 既存のAuth0を使う',
        required: true,
      },
      {
        id: 'data',
        question: 'データはどこに保存しますか？',
        placeholder: 'ブラウザのlocalStorageでOK / PostgreSQL（Supabase） / Firebase Firestore / 既存のMySQLサーバーに接続',
        required: true,
      },
      {
        id: 'data_model',
        question: 'データの構造・項目を教えてください。（わかる範囲でOK）',
        placeholder: 'タスク：id, title(string), dueDate(date), category(string), priority(high/mid/low), isDone(bool), createdAt\nカテゴリ：id, name, color',
        required: false,
      },
    ],
  },
  {
    title: '技術・環境',
    questions: [
      {
        id: 'tech',
        question: '使う技術スタックを指定してください。（なければ「おまかせ」）',
        placeholder: 'フロント: React + TypeScript + Tailwind\nバック: FastAPI (Python)\nDB: PostgreSQL\nおまかせ',
        required: true,
      },
      {
        id: 'deploy',
        question: 'どこにデプロイしますか？',
        placeholder: 'Vercel（フロント） + Railway（バック）/ ローカル動作のみでOK / AWS EC2 / おまかせ',
        required: true,
      },
      {
        id: 'existing',
        question: '既存コード・ライブラリ・APIはありますか？',
        placeholder: 'なし（ゼロから） / 既存のReactプロジェクトに機能追加 / Stripe APIと連携が必要',
        required: false,
      },
    ],
  },
  {
    title: 'UI・品質',
    questions: [
      {
        id: 'ui',
        question: 'UIのデザインイメージを教えてください。',
        placeholder: 'シンプル・ミニマル / Notionっぽい / ダークモード必須 / 既存の社内デザインに合わせる（赤と白ベース）',
        required: false,
      },
      {
        id: 'responsive',
        question: 'スマートフォン対応（レスポンシブ）は必要ですか？',
        placeholder: 'PCのみでOK / スマホでも使えるようにしたい / タブレット優先',
        required: true,
      },
      {
        id: 'error',
        question: 'エラー時・通信失敗時はどう振る舞えばいいですか？',
        placeholder: 'トースト通知でエラーを表示 / コンソールにログのみでOK / モーダルでエラー表示',
        required: false,
      },
    ],
  },
  {
    title: '完成の定義',
    questions: [
      {
        id: 'done',
        question: '「完成」の条件を教えてください。どうなれば完成ですか？',
        placeholder: '- タスクをCRUDできる\n- フィルタが動作する\n- ブラウザを閉じてもデータが残る\n- Vercelにデプロイ済みでURLにアクセスできる',
        required: true,
      },
      {
        id: 'assumptions',
        question: 'Claude Codeに「これは好きに決めてよい」と任せる部分はありますか？',
        placeholder: 'ライブラリの選定（React Query か SWR かなど）はおまかせ / ディレクトリ構成はおまかせ / アイコンはおまかせ',
        required: false,
      },
    ],
  },
]

const ALL_QUESTIONS = SECTIONS.flatMap((s) => s.questions)
const TOTAL = ALL_QUESTIONS.length

function buildPrompt(answers) {
  const get = (id) => answers[id]?.trim() || '（指定なし）'

  return `# 実装依頼仕様書

> **重要：この仕様書に記載のない事項は自分で判断して実装してください。不明点を質問せず、合理的な前提を置いて最後まで実装しきってください。前提を置いた場合は実装完了後にまとめて報告してください。**

---

## 1. プロジェクト概要

**何を作るか**
${get('what')}

**課題・背景**
${get('why')}

**ユーザー・規模**
${get('who')}

---

## 2. 機能要件

### 必須機能
${get('features')}

### 画面・ページ構成
${get('screens')}

### スコープ外（実装しない）
${get('out_of_scope')}

---

## 3. データ・認証

**認証方式**
${get('auth')}

**データ保存先**
${get('data')}

**データモデル**
${get('data_model')}

---

## 4. 技術スタック・環境

**使用技術**
${get('tech')}

**デプロイ先**
${get('deploy')}

**既存コード・外部API**
${get('existing')}

---

## 5. UI・品質要件

**デザインイメージ**
${get('ui')}

**レスポンシブ対応**
${get('responsive')}

**エラー・例外処理**
${get('error')}

---

## 6. 完成の定義（Definition of Done）

${get('done')}

---

## 7. 実装者への委任事項

以下は実装者が自由に決定してよい：
${get('assumptions')}

---

## 実装の進め方

1. まずこの仕様書を読み込んで全体設計を確認する
2. ディレクトリ構成・ファイル構成を決める
3. 機能を上から順に実装する
4. 完成の定義をすべて満たしたら完了を報告する

質問は不要です。判断に迷ったら合理的な選択をして進めてください。`
}

export default function App() {
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState('')
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)

  const q = ALL_QUESTIONS[qIndex]
  const sectionIndex = SECTIONS.findIndex((s) => s.questions.some((sq) => sq.id === q?.id))
  const section = SECTIONS[sectionIndex]

  function handleNext() {
    const updated = { ...answers, [q.id]: current }
    setAnswers(updated)
    setCurrent('')
    if (qIndex + 1 < TOTAL) {
      setQIndex(qIndex + 1)
    } else {
      setDone(true)
    }
  }

  function handleBack() {
    if (qIndex === 0) return
    const prev = qIndex - 1
    setQIndex(prev)
    setCurrent(answers[ALL_QUESTIONS[prev].id] || '')
  }

  function handleSkip() {
    const updated = { ...answers, [q.id]: '' }
    setAnswers(updated)
    setCurrent('')
    if (qIndex + 1 < TOTAL) {
      setQIndex(qIndex + 1)
    } else {
      setDone(true)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildPrompt(answers))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function handleRestart() {
    setQIndex(0)
    setAnswers({})
    setCurrent('')
    setDone(false)
    setCopied(false)
  }

  const canProceed = current.trim() || !q?.required

  if (done) {
    return (
      <div className="container">
        <div className="card result-card">
          <h1 className="title">生成されたプロンプト</h1>
          <p className="result-note">
            このプロンプトをClaude Codeに貼り付けるだけで、ラリーなしで実装が完了します。
          </p>
          <pre className="prompt-output">{buildPrompt(answers)}</pre>
          <div className="button-row">
            <button className="btn btn-primary" onClick={handleCopy}>
              {copied ? '✓ コピーしました！' : 'Claude Codeに貼り付ける用にコピー'}
            </button>
            <button className="btn btn-secondary" onClick={handleRestart}>
              最初からやり直す
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <h1 className="app-title">プロンプトビルダー</h1>
          <p className="app-subtitle">Claude Codeがラリーなしで実装できる仕様書を生成します</p>
        </div>

        <div className="section-label">{section?.title}</div>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((qIndex + 1) / TOTAL) * 100}%` }}
          />
        </div>
        <p className="step-label">
          {qIndex + 1} / {TOTAL}
        </p>

        <h2 className="question">
          {q.question}
          {q.required && <span className="required"> *</span>}
        </h2>

        <textarea
          className="answer-input"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder={q.placeholder}
          rows={6}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canProceed) handleNext()
          }}
        />
        <p className="hint">Ctrl+Enter で次へ {q.required ? '' : '/ 任意項目はスキップ可'}</p>

        <div className="button-row">
          <button className="btn btn-ghost" onClick={handleBack} disabled={qIndex === 0}>
            ← 戻る
          </button>
          <div className="right-buttons">
            {!q.required && (
              <button className="btn btn-secondary" onClick={handleSkip}>
                スキップ
              </button>
            )}
            <button className="btn btn-primary" onClick={handleNext} disabled={!canProceed}>
              {qIndex + 1 === TOTAL ? '仕様書を生成 ✓' : '次へ →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
