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

### 2026-05-05T09:39:57Z - quizland stage 全画像にソフトシャドウ統一適用 (--stage-shadow CSS 変数導入)
- **タスク**: quizland stage 全画像にソフトシャドウ統一適用 (--stage-shadow CSS 変数導入)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 423
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 177, "Read": 92, "Glob": 3, "Grep": 17, "Edit": 95, "Write": 12, "ToolSearch": 2, "ExitPlanMode": 2, "Agent": 23}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-05T09:34:28Z - quizland order_color の .chip .circle を CSS gradient から color_dot PNG (watercolor 風) に切替、 PNG 不存在時は CSS gradient へ自動 fallback
- **タスク**: quizland order_color の .chip .circle を CSS gradient から color_dot PNG (watercolor 風) に切替、 PNG 不存在時は CSS gradient へ自動 fallback
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 421
- **エラー数**: 21
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 176, "Read": 92, "Glob": 3, "Grep": 17, "Edit": 95, "Write": 12, "ToolSearch": 2, "ExitPlanMode": 2, "Agent": 22}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-05T08:53:18Z - renderOrderColor を <img> 化して watercolor PNG 表示に切替 + .color-chip CSS を img 対応
- **タスク**: renderOrderColor を <img> 化して watercolor PNG 表示に切替 + .color-chip CSS を img 対応
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 381
- **エラー数**: 18
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 151, "Read": 83, "Glob": 3, "Grep": 17, "Edit": 91, "Write": 11, "ToolSearch": 2, "ExitPlanMode": 2, "Agent": 21}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-05T08:45:16Z - split_sprites.py を自己完結化 (sprite_splitter.py 依存を内包) しPhotoshop Scripts単独配置で動作可能に。リポジトリ側canonicalはsprite_splitter.pyのまま、smokeテスト37件全通過
- **タスク**: split_sprites.py を自己完結化 (sprite_splitter.py 依存を内包) しPhotoshop Scripts単独配置で動作可能に。リポジトリ側canonicalはsprite_splitter.pyのまま、smokeテスト37件全通過
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 50
- **エラー数**: 2
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: なし
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 22, "Glob": 2, "Read": 11, "Edit": 9, "Write": 5, "Grep": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。


### 2026-05-05T08:40:41Z - split_sprites.jsx の無音失敗問題を解消: VBScriptをやめてバッチ+ログ捕捉に変更、Pillow検出機構で複数Python(py/python3.x)を自動選択、終了コードチェックで誤通知を防止、成功時はExplorer起動
- **タスク**: split_sprites.jsx の無音失敗問題を解消: VBScriptをやめてバッチ+ログ捕捉に変更、Pillow検出機構で複数Python(py/python3.x)を自動選択、終了コードチェックで誤通知を防止、成功時はExplorer起動
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 38
- **エラー数**: 2
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: なし
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 17, "Glob": 2, "Read": 9, "Edit": 7, "Write": 3}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。


### 2026-05-05T08:31:56Z - split_sprites を改良し全出力を1:1正方形に整形できるオプションを追加 (Python --square / JSXダイアログにチェックボックス, デフォルトON)
- **タスク**: split_sprites を改良し全出力を1:1正方形に整形できるオプションを追加 (Python --square / JSXダイアログにチェックボックス, デフォルトON)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 22
- **エラー数**: 0
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, 実装前にコードベースを探索した
- **検出された悪いパターン**: なし
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 9, "Glob": 2, "Read": 6, "Edit": 4, "Write": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。


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


