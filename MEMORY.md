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

### 2026-05-03T23:57:20Z - layout-editor: bg-image natural size 100%リセット対応 + ドロップ差し替えトースト強化
- **タスク**: layout-editor: bg-image natural size 100%リセット対応 + ドロップ差し替えトースト強化
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 115
- **エラー数**: 13
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 83, "ToolSearch": 1, "Read": 3, "Write": 4, "Edit": 9, "Bash": 14, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-03T23:52:56Z - Team Golf-2: layout-editor 100%リセットを<img>選択時のみに制限 + selectedハンドル青を le-preferred で上書きしないよう修正
- **タスク**: Team Golf-2: layout-editor 100%リセットを<img>選択時のみに制限 + selectedハンドル青を le-preferred で上書きしないよう修正
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 114
- **エラー数**: 13
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 82, "ToolSearch": 1, "Read": 3, "Write": 4, "Edit": 9, "Bash": 14, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-03T23:43:40Z - Foxtrot-2: layout-editor ハンドル色の選択状態出し分け + 画像 W/H パーセント表示 + 100%リセットボタン
- **タスク**: Foxtrot-2: layout-editor ハンドル色の選択状態出し分け + 画像 W/H パーセント表示 + 100%リセットボタン
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 108
- **エラー数**: 12
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 81, "ToolSearch": 1, "Read": 3, "Write": 4, "Edit": 9, "Bash": 9, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-03T23:39:40Z - Echo-2: 完全重なりレイヤーの preferredTarget pointer-events 抑止実装
- **タスク**: Echo-2: 完全重なりレイヤーの preferredTarget pointer-events 抑止実装
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 107
- **エラー数**: 12
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 80, "ToolSearch": 1, "Read": 3, "Write": 4, "Edit": 9, "Bash": 9, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-03T23:29:33Z - illustration-list.json/md/codex-batch-generate.md にシート方式バッチ生成戦略を追加
- **タスク**: illustration-list.json/md/codex-batch-generate.md にシート方式バッチ生成戦略を追加
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 329
- **エラー数**: 25
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Glob": 1, "Read": 48, "Grep": 14, "Bash": 154, "Agent": 72, "ToolSearch": 2, "Write": 7, "Edit": 30, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-03T23:19:23Z - Team Delta-2: layout-editor.js 画像差し替え厳格化(img/bg-image/単一innerImg)+image-swap/bg-image-swap/insertのundo対応
- **タスク**: Team Delta-2: layout-editor.js 画像差し替え厳格化(img/bg-image/単一innerImg)+image-swap/bg-image-swap/insertのundo対応
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 103
- **エラー数**: 12
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 78, "ToolSearch": 1, "Read": 3, "Write": 3, "Edit": 8, "Bash": 9, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-03T23:15:20Z - Charlie-2: 要素一覧z-index降順ソート + preferredTargetピアススルー優先選択 (リスト経由選択を canvas drag で優先)
- **タスク**: Charlie-2: 要素一覧z-index降順ソート + preferredTargetピアススルー優先選択 (リスト経由選択を canvas drag で優先)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 102
- **エラー数**: 12
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 77, "ToolSearch": 1, "Read": 3, "Write": 3, "Edit": 8, "Bash": 9, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-03T17:42:04Z - Bravo-2続編: quizland 14:9メディアクエリにcharacter/chip/chip.circle/q-text-card.audioのwidth/height!important追加でiPad Pro 11inchのsaved-layout inline値を完全打ち消し
- **タスク**: Bravo-2続編: quizland 14:9メディアクエリにcharacter/chip/chip.circle/q-text-card.audioのwidth/height!important追加でiPad Pro 11inchのsaved-layout inline値を完全打ち消し
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 101
- **エラー数**: 12
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 76, "ToolSearch": 1, "Read": 3, "Write": 3, "Edit": 8, "Bash": 9, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-03T17:38:21Z - Bravo-2: quizland 詳細画面(char-hint長文)/trivia-display/emoji/opposite を 14:9/4:3/5:4 メディアクエリで visible slice 内に収める !important 追加
- **タスク**: Bravo-2: quizland 詳細画面(char-hint長文)/trivia-display/emoji/opposite を 14:9/4:3/5:4 メディアクエリで visible slice 内に収める !important 追加
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 99
- **エラー数**: 12
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 74, "ToolSearch": 1, "Read": 3, "Write": 3, "Edit": 8, "Bash": 9, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


