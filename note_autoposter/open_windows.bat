@echo off
chcp 65001 > nul
title Note Autoposter
cd /d "%~dp0"

echo ================================
echo    Note Autoposter 起動中...
echo ================================
echo.

:: Python確認
python --version > nul 2>&1
if errorlevel 1 (
  echo [ERROR] Pythonが見つかりません。
  echo https://www.python.org/downloads/ からインストールしてください。
  echo インストール時に「Add Python to PATH」にチェックを入れてください。
  pause
  exit /b 1
)

:: 依存パッケージのインストール（初回のみ）
if not exist ".deps_installed" (
  echo [INFO] 必要なパッケージをインストール中（初回のみ・数分かかります）...
  pip install -r backend\requirements.txt -q
  python -m playwright install chromium 2>nul
  echo. > .deps_installed
  echo [OK] インストール完了
  echo.
)

:: .envがなければ作成
if not exist ".env" (
  copy .env.example .env > nul
  echo [INFO] .envファイルを作成しました。
  echo        ブラウザの「設定」タブでAPIキーとnoteのID/PWを入力してください。
  echo.
)

if not exist "data" mkdir data
if not exist "thumbnails" mkdir thumbnails

:: 既存プロセスを終了
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
  taskkill /F /PID %%a > nul 2>&1
)
timeout /t 1 /nobreak > nul

:: サーバー起動
echo [INFO] サーバーを起動中...
cd backend
start /B python -m uvicorn main:app --host 127.0.0.1 --port 8000
cd ..

:: 起動待ち
echo [INFO] 起動を待っています...
:WAIT_LOOP
timeout /t 1 /nobreak > nul
curl -s http://127.0.0.1:8000/ > nul 2>&1
if errorlevel 1 goto WAIT_LOOP

:: ブラウザを開く
echo [INFO] ブラウザを開いています...
start http://127.0.0.1:8000/

echo.
echo ================================
echo    Note Autoposter 起動完了
echo    http://127.0.0.1:8000/
echo ================================
echo.
echo このウィンドウは開いたままにしてください。
echo 終了するには Ctrl+C を押してください。
echo.

:: 待機
:KEEP_ALIVE
timeout /t 60 /nobreak > nul
goto KEEP_ALIVE
