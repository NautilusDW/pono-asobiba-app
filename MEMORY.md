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

### 2026-05-01T09:43:16Z - preview/full の注釈モード強化 (矩形・自由な矢印・個別削除を追加、 ツール選択式) sw.js 563→564 バンプ
- **タスク**: preview/full の注釈モード強化 (矩形・自由な矢印・個別削除を追加、 ツール選択式) sw.js 563→564 バンプ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 10, "ToolSearch": 5, "Write": 10, "Edit": 128, "ExitPlanMode": 3, "Bash": 265, "Read": 66, "Grep": 1, "WebSearch": 9, "WebFetch": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-01T09:03:20Z - Quizland 問題ボードの全 Variant ライブプレビュー (/quizland/preview/) を新規作成、 Row 3/4/5 + Grid 1〜9 を実寸表示、 sw.js 561→562 バンプ
- **タスク**: Quizland 問題ボードの全 Variant ライブプレビュー (/quizland/preview/) を新規作成、 Row 3/4/5 + Grid 1〜9 を実寸表示、 sw.js 561→562 バンプ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 67, "Edit": 128, "Bash": 265, "Agent": 10, "ToolSearch": 5, "Write": 9, "ExitPlanMode": 3, "Grep": 1, "WebSearch": 9, "WebFetch": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-30T23:13:03Z - sw.js CACHE_VERSION 560→561 バンプ (Codex の quizland 外枠スリム化 d0effc9 / ヘッダー左バー 700px / 問題82% / 4択72% / フクロウ外出し 反映)
- **タスク**: sw.js CACHE_VERSION 560→561 バンプ (Codex の quizland 外枠スリム化 d0effc9 / ヘッダー左バー 700px / 問題82% / 4択72% / フクロウ外出し 反映)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 21
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 130, "Bash": 272, "Read": 72, "Write": 9, "Agent": 10, "ToolSearch": 4, "ExitPlanMode": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-30T22:46:56Z - sw.js CACHE_VERSION 559→560 バンプ (Codex の quizland 中身優先再調整 40000f3 / 64fr-34fr / 縦積み4択 / フクロウ拡大 反映)
- **タスク**: sw.js CACHE_VERSION 559→560 バンプ (Codex の quizland 中身優先再調整 40000f3 / 64fr-34fr / 縦積み4択 / フクロウ拡大 反映)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 20
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 273, "Read": 73, "Edit": 128, "Write": 9, "Agent": 10, "ToolSearch": 4, "ExitPlanMode": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-30T22:27:33Z - sw.js CACHE_VERSION 558→559 バンプ + Codex の quizland 上段バー再スリム化 (1300x78 / panel 1000x790 / 560x790 + grid 9.2%) を反映 push
- **タスク**: sw.js CACHE_VERSION 558→559 バンプ + Codex の quizland 上段バー再スリム化 (1300x78 / panel 1000x790 / 560x790 + grid 9.2%) を反映 push
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 19
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 274, "Write": 10, "Read": 73, "Edit": 126, "Agent": 10, "ToolSearch": 4, "ExitPlanMode": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-30T15:53:59Z - sw.js CACHE_VERSION 557→558 バンプ (Codex の quizland 横向き固定再調整 7e922a0 反映)
- **タスク**: sw.js CACHE_VERSION 557→558 バンプ (Codex の quizland 横向き固定再調整 7e922a0 反映)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 18
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 276, "Write": 10, "Read": 73, "Edit": 124, "Agent": 10, "ToolSearch": 4, "ExitPlanMode": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-30T15:14:02Z - sw.js CACHE_VERSION 556→557 バンプ + Codex の quizland 参考イメージ寄せ再配置 (上段バー化・操作ボックス・冗長文非表示) を commit & push
- **タスク**: sw.js CACHE_VERSION 556→557 バンプ + Codex の quizland 参考イメージ寄せ再配置 (上段バー化・操作ボックス・冗長文非表示) を commit & push
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 18
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 278, "Write": 10, "Read": 73, "Edit": 122, "Agent": 10, "ToolSearch": 4, "ExitPlanMode": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-30T14:50:25Z - sw.js CACHE_VERSION 555→556 バンプ + Codex の quizland CSS-first テンプレート再設計 (16:9 内 grid-area で文字位置固定 + 1181px override 削除) を commit & push
- **タスク**: sw.js CACHE_VERSION 555→556 バンプ + Codex の quizland CSS-first テンプレート再設計 (16:9 内 grid-area で文字位置固定 + 1181px override 削除) を commit & push
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 18
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 280, "Write": 10, "Read": 73, "Edit": 120, "Agent": 10, "ToolSearch": 4, "ExitPlanMode": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-29T20:51:48Z - sw.js CACHE_VERSION 554→555 バンプ + Codex の木目風CSSフレーム統一改修 (9-slice border-image 廃止) を反映 push
- **タスク**: sw.js CACHE_VERSION 554→555 バンプ + Codex の木目風CSSフレーム統一改修 (9-slice border-image 廃止) を反映 push
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 17
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 122, "Bash": 278, "Write": 10, "Read": 73, "Agent": 10, "ToolSearch": 4, "ExitPlanMode": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


