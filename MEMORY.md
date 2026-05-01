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

### 2026-05-01T10:51:54Z - preview/full の注釈フィードバック反映: ヘッダー左ピル統合、 どんぐり削除、 board 460px 上半分に、 ヒント帯をフクロウ博士の横に移動、 sw.js 570→571 バンプ
- **タスク**: preview/full の注釈フィードバック反映: ヘッダー左ピル統合、 どんぐり削除、 board 460px 上半分に、 ヒント帯をフクロウ博士の横に移動、 sw.js 570→571 バンプ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 23
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 245, "Read": 68, "Edit": 161, "Agent": 4, "Write": 6, "ExitPlanMode": 1, "ToolSearch": 2, "Grep": 1, "WebSearch": 9, "WebFetch": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-01T10:32:57Z - preview/full に選択ツール追加 + localStorage 自動保存・復元、 注釈ツールの責務分離 (作成系は重ね置き OK、 移動/選択は select 専用)、 sw.js 569→570 バンプ
- **タスク**: preview/full に選択ツール追加 + localStorage 自動保存・復元、 注釈ツールの責務分離 (作成系は重ね置き OK、 移動/選択は select 専用)、 sw.js 569→570 バンプ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 24
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 69, "Edit": 156, "Bash": 249, "Agent": 4, "Write": 6, "ExitPlanMode": 1, "ToolSearch": 2, "Grep": 1, "WebSearch": 9, "WebFetch": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-01T10:21:03Z - preview/full の矢印太さ調整とテキスト/マーカーの移動ブロック解除、 sw.js 568→569 バンプ
- **タスク**: preview/full の矢印太さ調整とテキスト/マーカーの移動ブロック解除、 sw.js 568→569 バンプ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 25
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 5, "Write": 7, "ExitPlanMode": 2, "Bash": 253, "Read": 72, "Edit": 146, "ToolSearch": 2, "Grep": 1, "WebSearch": 9, "WebFetch": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-01T10:12:08Z - preview/full を 21:9 + 16:9 セーフエリア構成にリデザイン、 リファレンス画像に寄せた木枠/紙カードスタイル、 design_goal_quizland.md を memory に保存、 sw.js 567→568 バンプ
- **タスク**: preview/full を 21:9 + 16:9 セーフエリア構成にリデザイン、 リファレンス画像に寄せた木枠/紙カードスタイル、 design_goal_quizland.md を memory に保存、 sw.js 567→568 バンプ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 24
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 142, "Bash": 254, "Agent": 8, "Write": 7, "ExitPlanMode": 2, "Read": 72, "ToolSearch": 2, "Grep": 1, "WebSearch": 9, "WebFetch": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-01T10:03:25Z - preview/full の矢印エンドポイント掴みバグ (hit クラスの取りこぼしで新規マーカー追加されてた) を修正、 sw.js 566→567 バンプ
- **タスク**: preview/full の矢印エンドポイント掴みバグ (hit クラスの取りこぼしで新規マーカー追加されてた) を修正、 sw.js 566→567 バンプ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 25
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 256, "Agent": 9, "Edit": 141, "Read": 72, "Write": 5, "ExitPlanMode": 2, "ToolSearch": 2, "Grep": 1, "WebSearch": 9, "WebFetch": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-01T09:58:50Z - preview/full の注釈ツール改善 (矢印太く・矩形内側クリック可・ハンドル拡大・既存要素はどのツールでも移動可) sw.js 565→566 バンプ
- **タスク**: preview/full の注釈ツール改善 (矢印太く・矩形内側クリック可・ハンドル拡大・既存要素はどのツールでも移動可) sw.js 565→566 バンプ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 25
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 260, "Agent": 9, "Edit": 138, "Read": 71, "Write": 5, "ExitPlanMode": 2, "ToolSearch": 2, "Grep": 1, "WebSearch": 9, "WebFetch": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-01T09:49:52Z - preview/full に注釈の選択/移動/リサイズ/Undo Redo/Delete キーを追加 sw.js 564→565 バンプ
- **タスク**: preview/full に注釈の選択/移動/リサイズ/Undo Redo/Delete キーを追加 sw.js 564→565 バンプ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 23
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 267, "Write": 9, "Read": 66, "Edit": 132, "Agent": 9, "ExitPlanMode": 2, "ToolSearch": 2, "Grep": 1, "WebSearch": 9, "WebFetch": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


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


