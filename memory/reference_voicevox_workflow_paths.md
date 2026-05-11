---
name: VOICEVOX 音声生成 作業フォルダパス (固定)
description: ユーザーが accent_input.json/accent_overrides.json を置く場所。Claude は毎回このフォルダを確認すれば良い (パス再確認不要)
type: reference
---

# VOICEVOX 音声生成 作業フォルダ

## デフォルト作業フォルダ
**`D:\ポノのおへや\Dr.owl'quiz\NA\問題文\`**

(パスに日本語+アポストロフィ含む。Bash クォーティング失敗回避のため Python 経由でアクセス推奨)

## ファイル運用

### ユーザーが置くファイル
- **`accent_input_YYYYMMDDHHMMSS.json`**: ブラウザツール「機能 F: 未補正テキスト + audio_query エクスポート」の出力
  - ユーザーがこのフォルダにダウンロードする
  - Claude は最新ファイル (LastWriteTime 最新) を自動で選ぶ

### Claude が書き出すファイル
- **`accent_overrides.json`**: アクセント補正パッチ
  - Claude が新 accent_input を処理した後、このフォルダに上書き保存
  - 加えて、リポジトリ管理用に `d:\AppDevelopment\pono-asobiba-app\tools\voicevox-generator\accent_overrides.json` にも同内容を保存

### ユーザーがブラウザツール「機能 E: accent_overrides 読込」で選択
- 上記 `D:\ポノのおへや\Dr.owl'quiz\NA\問題文\accent_overrides.json` をファイル選択

### ユーザーがダウンロードする生成済 zip
- 同じフォルダに ブラウザツール「全 N ファイル生成」の zip もダウンロードされる
- ファイル名例: `quizland_voicevox_test_雨晴はう_ノーマル_YYYYMMDDHHMMSS.zip` (フォルダで保管)

## Claude が新セッションで動く時の手順

### サイクル開始時 (ユーザーが「accent_input 渡しました」と言う場面)
1. PowerShell で `Get-ChildItem -LiteralPath 'D:\ポノのおへや\Dr.owl''quiz\NA\問題文'` 実行
2. 最新の `accent_input_*.json` ファイルを特定
3. Python で UTF-8 読み込み (Bash 直接 cat は文字化けリスク)
4. アクセント判定 → `accent_overrides.json` 生成
5. リポジトリ + ユーザーフォルダ 両方に書き出し
6. ユーザーに「処理完了、機能 E で読み込んでください」と通知

### ユーザーが「ファイル名」だけ伝えた場合
- フォルダパスは固定なので、ファイル名だけで OK
- 例: 「accent_input_20260511110417.json で処理して」 → 上記フォルダから読む

## 関連 memory
- `feature_quizland_voicevox_order.md` (生成ツール本体仕様)
- `reference_op_layout_publish_workflow.md` (OP layout 配信フロー、ローカル editor → Claude 反映の類似パターン)
