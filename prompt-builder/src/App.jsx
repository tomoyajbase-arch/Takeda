import { useState } from 'react'
import './App.css'

const QUESTIONS = [
  {
    id: 'purpose',
    question: 'どんな目的のツール・アプリを作りたいですか？\n（例：タスク管理、日程調整、データ分析、チャットボットなど）',
    placeholder: 'ユーザーが日々のタスクを管理できるWebアプリ',
  },
  {
    id: 'target_user',
    question: '誰が使いますか？\n（例：個人利用、チーム内、一般ユーザー向けなど）',
    placeholder: '個人で使う / 社内の営業チーム5名 / 一般公開する予定',
  },
  {
    id: 'core_features',
    question: '必ず入れたい機能を教えてください。\n（箇条書きでOK）',
    placeholder: '- タスクの追加・削除・完了チェック\n- 締め切り日の設定\n- カテゴリ分け',
  },
  {
    id: 'tech_stack',
    question: '使いたい技術スタックはありますか？\nなければ「おまかせ」と書いてください。',
    placeholder: 'React + TypeScript / Python (FastAPI) / おまかせ',
  },
  {
    id: 'ui_style',
    question: 'UIのイメージはありますか？\n（色味、雰囲気、参考にしたいサービスなど）',
    placeholder: 'シンプルでミニマル / Notionっぽい / ダークモードで格好よく',
  },
  {
    id: 'constraints',
    question: '制約や注意事項はありますか？\n（コスト、期間、認証不要など）',
    placeholder: 'ログイン不要 / サーバーレスで動かしたい / 1週間で完成させたい',
  },
  {
    id: 'output_format',
    question: '最終的にどんな形で欲しいですか？\n（例：コード一式、設計書のみ、デプロイまで、など）',
    placeholder: '動くコード一式 / まず設計書だけ / Vercelにデプロイまで',
  },
]

function buildPrompt(answers) {
  const lines = [
    '# 作成依頼プロンプト\n',
    `## 目的・概要\n${answers.purpose || '（未入力）'}`,
    `## ターゲットユーザー\n${answers.target_user || '（未入力）'}`,
    `## 必須機能\n${answers.core_features || '（未入力）'}`,
    `## 技術スタック\n${answers.tech_stack || '（未入力）'}`,
    `## UIイメージ\n${answers.ui_style || '（未入力）'}`,
    `## 制約・注意事項\n${answers.constraints || '（未入力）'}`,
    `## 期待する成果物\n${answers.output_format || '（未入力）'}`,
    '\n---\n上記の内容に基づいて実装してください。不明点があれば最初に質問してから進めてください。',
  ]
  return lines.join('\n\n')
}

export default function App() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState('')
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)

  const q = QUESTIONS[step]

  function handleNext() {
    const updated = { ...answers, [q.id]: current.trim() }
    setAnswers(updated)
    setCurrent('')
    if (step + 1 < QUESTIONS.length) {
      setStep(step + 1)
    } else {
      setDone(true)
    }
  }

  function handleBack() {
    if (step === 0) return
    const prevStep = step - 1
    setStep(prevStep)
    setCurrent(answers[QUESTIONS[prevStep].id] || '')
  }

  async function handleCopy() {
    const prompt = buildPrompt(answers)
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleRestart() {
    setStep(0)
    setAnswers({})
    setCurrent('')
    setDone(false)
    setCopied(false)
  }

  if (done) {
    const prompt = buildPrompt(answers)
    return (
      <div className="container">
        <div className="card result-card">
          <h1 className="title">生成されたプロンプト</h1>
          <pre className="prompt-output">{prompt}</pre>
          <div className="button-row">
            <button className="btn btn-primary" onClick={handleCopy}>
              {copied ? '✓ コピーしました！' : 'クリップボードにコピー'}
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
          <p className="app-subtitle">作りたいものの詳細をヒヤリングしてプロンプトを生成します</p>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
        <p className="step-label">
          {step + 1} / {QUESTIONS.length}
        </p>
        <h2 className="question">{q.question}</h2>
        <textarea
          className="answer-input"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder={q.placeholder}
          rows={5}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleNext()
          }}
        />
        <p className="hint">Ctrl+Enter で次へ進めます</p>
        <div className="button-row">
          <button
            className="btn btn-secondary"
            onClick={handleBack}
            disabled={step === 0}
          >
            ← 戻る
          </button>
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={!current.trim()}
          >
            {step + 1 === QUESTIONS.length ? '完成させる ✓' : '次へ →'}
          </button>
        </div>
      </div>
    </div>
  )
}
