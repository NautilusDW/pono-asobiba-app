@echo off
chcp 65001 > nul
title VOICEVOX 生成ツール
echo VOICEVOX 生成ツールを起動します...
echo.
echo ブラウザで http://localhost:8765/voicevox-generator.html を開きます。
echo このウィンドウを閉じるとサーバーが停止します。
echo.

REM スクリプトのあるディレクトリに移動
cd /d "%~dp0"

REM 既に 8765 で起動中なら警告
netstat -ano | findstr :8765 > nul
if not errorlevel 1 (
  echo 警告: ポート 8765 は既に使用中です。
  echo 既存のサーバーを停止してから再実行するか、
  echo 既存サーバーで開かれているブラウザのタブを Ctrl+Shift+R でリロードしてください。
  echo.
  pause
  exit /b 1
)

REM ブラウザを少し遅らせて開く (サーバー起動完了を待つ)
start "" cmd /c "timeout /t 2 /nobreak > nul && start http://localhost:8765/voicevox-generator.html"

REM Python HTTP サーバー起動 (このプロセスはこのウィンドウで動き続ける)
python -m http.server 8765
