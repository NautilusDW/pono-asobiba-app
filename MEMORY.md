# MEMORY.md - Self-Evolving Framework Knowledge Base

## Framework Statistics

- 初期化日: 2026-02-25
- 総タスク数: 19+
- 成功率: 100%
- 詳細履歴: [memory/task-history.md](memory/task-history.md)
- **部屋アイソメ引き継ぎ**: [memory/room-isometric-handoff.md](memory/room-isometric-handoff.md) — CSS mask未動作・17MB画像問題・巾木JS上書き問題
- **水族館エンハンス完了**: [memory/aquarium-enhancement-complete.md](memory/aquarium-enhancement-complete.md) — Phase1+2完了、Phase3見送り、卵育て構想
- **水族館UXフィードバック**: [memory/feedback_aquarium_ux.md](memory/feedback_aquarium_ux.md) — 矢印シンプル・ブースト大胆・音柔らか・複雑さ排除
- **デプロイ自動化 (Cloudflare Workers)**: [memory/feedback_auto_push.md](memory/feedback_auto_push.md) — post-commit で develop 自動 push → GitHub Actions が `wrangler deploy --env staging`
- **Umamiアナリティクス**: [memory/reference_umami.md](memory/reference_umami.md) — Umami Cloud設定情報
- **文字書きシンプルモード復活 Phase 1 + UIリデザイン**: [memory/feature_writing_simple_mode.md](memory/feature_writing_simple_mode.md) — RPG化前のロジックを `writing/simple.html` として復活、左右分割レイアウト・RPGダークテーマ統一・妖精2体fixed常駐応援、Phase 2 (行選択+単語フェーズ) は未実装
- **迷路 画像ステージ Phase 1**: [memory/feature_maze_image_stage.md](memory/feature_maze_image_stage.md) — `?image=<name>` でAI生成画像背景+ポリライン歩行+カメラ追従。横画面前提。Phase 2 (エディタ・細線化) 未着手
- **迷路ラフ作成ツール**: [memory/feature_maze_rough_maker.md](memory/feature_maze_rough_maker.md) — `tools/maze-rough.html` で 32×18 タイルラフを描いて PNG 出力 → 生成 AI に「道の形を守って絵本風に」と一緒に渡すワークフロー
- **クリーンエッジスタジオ タイムライン再生**: [memory/feature_timeline_player.md](memory/feature_timeline_player.md) — 分割スプライトをID連番順に並べてFPS+各コマフレーム数で即時再生。スプライトカードはサムネドラッグで並び替え可、🎯ボタンで比較タブの元矩形にジャンプ
- **Layout System (`common/layout/`)**: [memory/reference_layout_system.md](memory/reference_layout_system.md) — WYSIWYG レイアウトエディタ + applier 共通モジュール。`LayoutSystem.init()` 4 行で opt-in、`?edit=1` でエディタ遅延ロード。ページ author docs は `common/layout/README.md`

---

## Key Learnings

### 🚨🚨🚨 デプロイ手順 (Cloudflare Workers) 🚨🚨🚨

> **このプロジェクトは Cloudflare Workers で配信されている。Netlify は完全廃止済み。**
> Netlify という単語は二度と出さない (古いメモリ・ハンドオフドキュメントは過去のもの)。

#### 自動化フロー (develop)
1. `.git/hooks/post-commit` が develop ブランチで `git push origin develop` を実行 (バックグラウンド・flock ガード付き)
2. GitHub Actions (`.github/workflows/deploy.yml`) が `wrangler deploy --env staging` を実行
3. 数十秒で `https://pono-asobiba-staging.ndw.workers.dev/` に反映される

→ `git commit` するだけで staging に反映。Claude 側で `wrangler deploy` を手動実行する必要なし。

#### ブランチ運用ルール（厳守）
- **develop** = 開発・確認用。常用ブランチ。staging に自動反映
- **master** = 本番。ユーザーが「**本番にデプロイして**」と明示した時だけマージ
- **絶対に勝手に master へマージ・本番デプロイしない**

| ブランチ | 環境 | URL | 反映方法 |
|---------|------|-----|----------|
| develop | staging | `https://pono-asobiba-staging.ndw.workers.dev/` | commit → 自動 push → GH Actions |
| master  | production | `https://pono.kodama-no-mori.com/` (および `pono-asobiba-app.ndw.workers.dev`) | ユーザー明示指示時のみ手動 merge |

#### 本番反映時（ユーザー明示指示時のみ）
```
git checkout master && git merge develop && git push origin master
# → GH Actions が wrangler deploy (production) を実行
git checkout develop
```

#### 緊急時の手動デプロイ (GH Actions 死亡時のみ)
```
wrangler deploy --env staging   # develop 内容を staging に
wrangler deploy                  # master 内容を production に
```

### 単一HTMLファイルWebアプリ設計パターン
- Web Audio APIを使えば外部音声ファイルなしで効果音を生成可能
- Google Fonts `Zen Maru Gothic` は子ども向けの丸みフォントとして適切
- 全ゲーム共通: `touch-action: none` を持つ親要素の内側に overlay を置かない

### 文字なぞり・書き順ガイド（確定アーキテクチャ）
- **AnimCJK SVGデータが最適解**: 教科書体ベースのスケルトンデータ
  - かな: `cdn.jsdelivr.net/gh/parsimonhi/animCJK@master/svgsJaKana/{unicode}.svg`
  - 漢字: `cdn.jsdelivr.net/gh/parsimonhi/animCJK@master/svgsJa/{unicode}.svg`
  - viewBox: `0 0 1024 1024`
- SVG構造: stroke shapes (`path[id]`) = 輪郭, median paths (`path[clip-path]`) = 中心線
- 判定: `getPointAtLength()`で60点サンプリング → 精度/カバレッジ/方向の3条件
- Hanzi Writerは明朝体ベースで教育向きでない → AnimCJK直接利用が正解

### iOS Safari タッチイベントの落とし穴
- `backdrop-filter` を持つ要素の**子要素にタッチが届かない**既知バグあり → 使用しない
- `touch-action: none` の親要素内の `touchend` で `e.preventDefault()` を呼ぶと、子要素の `click` 合成が抑制される
- 修正パターン: 親の touchend でボタンタップを除外 + ボタンに `touchstart` ハンドラを直接登録
- `youtube-nocookie.com` は iOS Safari のトラッキング防止でブロックされることがある → `www.youtube.com/embed` + `?playsinline=1` を使う

### ゲーム実装パターン
- **ブロック崩し** (`breakout/index.html`): overlay は `#app` 直下（game-wrap の外）に配置
- **つみき** (`stacking/index.html`): Matter.js使用、スタート画面廃止・ページ開いたら即startGame()
- **お絵描き** (`drawing/index.html`): OpenMoji CDN でスタンプ、`crossOrigin='anonymous'` 必須
- **もじかき** (`writing/index.html`): AnimCJK SVGデータでなぞり書き

### orchestrator.py の既知バグ
- `compress` コマンドが別プロジェクト (`storyboard-generator`) のパスを参照してしまう
- → 圧縮は手動で行う（このファイルを直接編集）

---

## Recent Errors

(エラー発生時に自動追記されます)

## Task Analysis History

### 2026-05-05T08:29:30Z - creature_studio.html 背景除去が効かない問題: 1:1機能由来ではなく、表示背景=画像背景のUX衝突と判明。auto-reprocess を default ON 化、 表示背景が画像背景と同色なら自動でチェッカー柄に切替える safeguard 追加。Playwright で白/マゼンタ両ケース検証 PASS。
- **タスク**: creature_studio.html 背景除去が効かない問題: 1:1機能由来ではなく、表示背景=画像背景のUX衝突と判明。auto-reprocess を default ON 化、 表示背景が画像背景と同色なら自動でチェッカー柄に切替える safeguard 追加。Playwright で白/マゼンタ両ケース検証 PASS。
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 6
- **エラー数**: 0
- **検出された良いパターン**: 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 1, "Glob": 2, "Read": 3}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-05T07:52:07Z - creature_studio.html: 1:1 正方形強制クロップオプション追加 (UI checkbox + 出力サイズ select + expandToSquare + プリセット永続化)
- **タスク**: creature_studio.html: 1:1 正方形強制クロップオプション追加 (UI checkbox + 出力サイズ select + expandToSquare + プリセット永続化)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 354
- **エラー数**: 17
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 143, "Read": 68, "Glob": 3, "Grep": 17, "Edit": 90, "Write": 11, "ToolSearch": 2, "ExitPlanMode": 2, "Agent": 18}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-05T07:27:13Z - quizland debug mode で正解→setTimeout(nextQuestion)経路でコメント/スクショが保存されないバグ修正: nextQuestionをラップして必ず_qzPtSaveCurrentNoteを先行させる
- **タスク**: quizland debug mode で正解→setTimeout(nextQuestion)経路でコメント/スクショが保存されないバグ修正: nextQuestionをラップして必ず_qzPtSaveCurrentNoteを先行させる
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 335
- **エラー数**: 17
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 136, "Read": 59, "Glob": 3, "Grep": 17, "Edit": 88, "Write": 11, "ToolSearch": 2, "ExitPlanMode": 2, "Agent": 17}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-05T07:15:03Z - quizland debug mode に問題ごとコメント+スクショ添付機能を追加 (?debug=all 時のみ): textarea/自動キャプチャ/添付/ペースト/サムネ削除、次へ押下で playtest_notes.json + 個別スクショを GitHub commit、サイズ上限/localStorage backup/PUT 失敗時 b64 fallback
- **タスク**: quizland debug mode に問題ごとコメント+スクショ添付機能を追加 (?debug=all 時のみ): textarea/自動キャプチャ/添付/ペースト/サムネ削除、次へ押下で playtest_notes.json + 個別スクショを GitHub commit、サイズ上限/localStorage backup/PUT 失敗時 b64 fallback
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 328
- **エラー数**: 14
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 135, "Read": 57, "Glob": 3, "Grep": 17, "Edit": 86, "Write": 10, "ToolSearch": 2, "ExitPlanMode": 2, "Agent": 16}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-05T06:55:49Z - quizland order_color チップ丸が全部オレンジになるバグ修正
- **タスク**: quizland order_color チップ丸が全部オレンジになるバグ修正
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 324
- **エラー数**: 14
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 134, "Read": 57, "Glob": 3, "Grep": 17, "Edit": 85, "Write": 10, "ToolSearch": 2, "ExitPlanMode": 2, "Agent": 14}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-05T06:40:43Z - count_total問題の画像が縦横比崩れて潰れる問題のCSS修正
- **タスク**: count_total問題の画像が縦横比崩れて潰れる問題のCSS修正
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 323
- **エラー数**: 14
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 134, "Read": 57, "Glob": 3, "Grep": 17, "Edit": 85, "Write": 10, "ToolSearch": 2, "ExitPlanMode": 2, "Agent": 13}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-05T06:35:38Z - quizland に ?debug=all (全169問プレイ) デバッグモード追加: 固定順 playlist + 進捗表示 + 前/次/ジャンプナビ + DEBUG バッジ
- **タスク**: quizland に ?debug=all (全169問プレイ) デバッグモード追加: 固定順 playlist + 進捗表示 + 前/次/ジャンプナビ + DEBUG バッジ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 319
- **エラー数**: 14
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 133, "Read": 56, "Glob": 3, "Grep": 16, "Edit": 85, "Write": 10, "ToolSearch": 2, "ExitPlanMode": 2, "Agent": 12}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-05T06:23:16Z - trivia 55問にstage画像を配線 (img:対応をrenderTriviaに追加、富士山問題はAケースに置換、ゆきぐにに snow_country.png 配線)
- **タスク**: trivia 55問にstage画像を配線 (img:対応をrenderTriviaに追加、富士山問題はAケースに置換、ゆきぐにに snow_country.png 配線)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 310
- **エラー数**: 13
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 129, "Read": 55, "Glob": 3, "Grep": 16, "Edit": 83, "Write": 10, "ToolSearch": 2, "ExitPlanMode": 2, "Agent": 10}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-05T05:51:12Z - image_review_reminder.py クロスレビュー HIGH 3件修正 (JSON出力形式・co-occurrenceルール・キーワード追加)
- **タスク**: image_review_reminder.py クロスレビュー HIGH 3件修正 (JSON出力形式・co-occurrenceルール・キーワード追加)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 295
- **エラー数**: 12
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 124, "Read": 49, "Glob": 3, "Grep": 16, "Edit": 83, "Write": 10, "ToolSearch": 2, "ExitPlanMode": 2, "Agent": 6}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


