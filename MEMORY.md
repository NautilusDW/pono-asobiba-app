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

### 2026-05-04T05:32:37Z - Team-1 quizland fix: 12 grid/* placeholder stubs を root の本物 PNG に差し替え + sheet-overlay opacity 0->0.4 + 4 P3-Medium rules を background shorthand から個別プロパティに分解 + 8 P3-Low rules から !important 削減
- **タスク**: Team-1 quizland fix: 12 grid/* placeholder stubs を root の本物 PNG に差し替え + sheet-overlay opacity 0->0.4 + 4 P3-Medium rules を background shorthand から個別プロパティに分解 + 8 P3-Low rules から !important 削減
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 31
- **エラー数**: 3
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Agent": 15, "Read": 6, "Glob": 2, "ToolSearch": 3, "Write": 1, "ExitPlanMode": 1, "Bash": 3}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-04T05:28:57Z - Team-2 chip overflow blocker fix: 14/9 220->216, 4/3 200->196, comment buffer clarification, 16:10 object-position
- **タスク**: Team-2 chip overflow blocker fix: 14/9 220->216, 4/3 200->196, comment buffer clarification, 16:10 object-position
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 30
- **エラー数**: 3
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Agent": 14, "Read": 6, "Glob": 2, "ToolSearch": 3, "Write": 1, "ExitPlanMode": 1, "Bash": 3}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-04T05:21:22Z - Team-3 quizland JS: aspect class toggle, fit-mode (cover/contain) switch, ?diag=1 verification harness, EditorBootstrapConfig beforeApply stub
- **タスク**: Team-3 quizland JS: aspect class toggle, fit-mode (cover/contain) switch, ?diag=1 verification harness, EditorBootstrapConfig beforeApply stub
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 23
- **エラー数**: 3
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Agent": 8, "Read": 6, "Glob": 2, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1, "Bash": 3}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-04T04:39:45Z - Team Whiskey-2: layout-editor の要素一覧/数値パネルにリサイズハンドル追加 (右下角ドラッグ、200<=W<=min(600,80vw)、200<=H<=90vh、localStorage永続化、ラベル title にフルテキスト付与)
- **タスク**: Team Whiskey-2: layout-editor の要素一覧/数値パネルにリサイズハンドル追加 (右下角ドラッグ、200<=W<=min(600,80vw)、200<=H<=90vh、localStorage永続化、ラベル title にフルテキスト付与)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 154
- **エラー数**: 19
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 98, "ToolSearch": 1, "Read": 7, "Write": 4, "Edit": 20, "Bash": 23, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-04T04:32:35Z - Team Victor-2: layout-editor に削除機能追加 (toolbar 🗑️ ボタン + 行 🗑 アイコン + Delete/Backspace キー削除化、Ctrl+Z で復活、contenteditable は通常文字削除)
- **タスク**: Team Victor-2: layout-editor に削除機能追加 (toolbar 🗑️ ボタン + 行 🗑 アイコン + Delete/Backspace キー削除化、Ctrl+Z で復活、contenteditable は通常文字削除)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 153
- **エラー数**: 19
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 97, "ToolSearch": 1, "Read": 7, "Write": 4, "Edit": 20, "Bash": 23, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-04T04:23:41Z - Team Uniform-2: pono-bubble W変更が効かない問題を flex制約全解除で根本対応 + 数値パネル/要素一覧パネルをドラッグ移動可能化 (localStorage永続/dblclick初期位置)
- **タスク**: Team Uniform-2: pono-bubble W変更が効かない問題を flex制約全解除で根本対応 + 数値パネル/要素一覧パネルをドラッグ移動可能化 (localStorage永続/dblclick初期位置)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 150
- **エラー数**: 19
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 96, "ToolSearch": 1, "Read": 7, "Write": 4, "Edit": 18, "Bash": 23, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-04T03:49:32Z - Team Tango-2: layout-editor flex親配下のW/H上書き(overrideFlexIfChild) + アスペクト比ボタン表示条件を単一選択に緩和+デバッグログ
- **タスク**: Team Tango-2: layout-editor flex親配下のW/H上書き(overrideFlexIfChild) + アスペクト比ボタン表示条件を単一選択に緩和+デバッグログ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 147
- **エラー数**: 19
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 95, "ToolSearch": 1, "Read": 7, "Write": 4, "Edit": 17, "Bash": 22, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-04T03:39:55Z - Team Sierra-2: layout-editor の📐ボタンを.pono-bubbleで自動再試行+ width/heightを!important化してflex/CSS制約を上書き
- **タスク**: Team Sierra-2: layout-editor の📐ボタンを.pono-bubbleで自動再試行+ width/heightを!important化してflex/CSS制約を上書き
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 145
- **エラー数**: 19
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 94, "ToolSearch": 1, "Read": 7, "Write": 4, "Edit": 17, "Bash": 21, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-04T03:20:09Z - Team Romeo-2: layout-editor に「📐 画像の比率に合わせる」ボタン追加 (img/.le-dropped-img/bg-image 対応, Quebec-2 で削除した bg-image probe を aspect 専用で部分復活)
- **タスク**: Team Romeo-2: layout-editor に「📐 画像の比率に合わせる」ボタン追加 (img/.le-dropped-img/bg-image 対応, Quebec-2 で削除した bg-image probe を aspect 専用で部分復活)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 137
- **エラー数**: 19
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 93, "ToolSearch": 1, "Read": 5, "Write": 4, "Edit": 15, "Bash": 18, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


