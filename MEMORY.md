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

### 2026-05-03T02:59:13Z - quizland UI port v2 (Replace strategy: preview/full を視覚的土台に slim main logic を埋め込み、 sheet-on デフォルト + auto-fit stage 化、 sw.js 671→672)
- **タスク**: quizland UI port v2 (Replace strategy: preview/full を視覚的土台に slim main logic を埋め込み、 sheet-on デフォルト + auto-fit stage 化、 sw.js 671→672)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 73
- **エラー数**: 3
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Glob": 1, "Read": 15, "Grep": 2, "Bash": 24, "Agent": 22, "ToolSearch": 1, "Write": 4, "Edit": 4}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-03T02:12:16Z - quizland UI port: preview/full の新デザインを quizland/index.html に inject 戦略で適用 (acorns/garden/flowers 除外、 sound effects 保持、 168問対応維持)
- **タスク**: quizland UI port: preview/full の新デザインを quizland/index.html に inject 戦略で適用 (acorns/garden/flowers 除外、 sound effects 保持、 168問対応維持)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 62
- **エラー数**: 3
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Glob": 1, "Read": 15, "Grep": 2, "Bash": 18, "Agent": 19, "ToolSearch": 1, "Write": 3, "Edit": 3}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-03T00:48:11Z - Team C quiz refinement: weather + body カテゴリの難易度・正確性レビュー (questions.js 非改変、_review/team-c-weather-body.md を作成)
- **タスク**: Team C quiz refinement: weather + body カテゴリの難易度・正確性レビュー (questions.js 非改変、_review/team-c-weather-body.md を作成)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 23
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 171, "Bash": 222, "Read": 60, "Grep": 44, "Write": 2, "ToolSearch": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-03T00:47:53Z - Team D trivia quiz refinement: Lv1 8問新規作成 + Lv2/Lv3 評価提案 (_review/team-d-trivia.md)
- **タスク**: Team D trivia quiz refinement: Lv1 8問新規作成 + Lv2/Lv3 評価提案 (_review/team-d-trivia.md)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 23
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 223, "Edit": 170, "Read": 60, "Grep": 44, "Write": 2, "ToolSearch": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-02T11:07:27Z - zukan preview: Subdivided Corner Pin (3x3 mesh per page = 18 制御点)
- **タスク**: zukan preview: Subdivided Corner Pin (3x3 mesh per page = 18 制御点)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 14
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 252, "Read": 32, "Edit": 188, "Grep": 24, "Write": 3, "ToolSearch": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-02T10:10:50Z - zukan に Corner Pin (4 角 x 2 page、 matrix3d で射影変換、 userbox を center X で page container に reparent、 saved-layout 永続化) + 両エディタにグループ corner-drag 拡縮 (factor 計算 → group center 基準で全選択拡縮) を実装。 sw.js 641→642
- **タスク**: zukan に Corner Pin (4 角 x 2 page、 matrix3d で射影変換、 userbox を center X で page container に reparent、 saved-layout 永続化) + 両エディタにグループ corner-drag 拡縮 (factor 計算 → group center 基準で全選択拡縮) を実装。 sw.js 641→642
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 12
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 190, "Bash": 252, "Grep": 22, "Read": 32, "Write": 4}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-02T08:31:48Z - zukan に絵本見開きの草案レイアウト追加 (3x3 グリッド + うさぎ詳細イラスト + なまえ/こえ/すがた ラベル + ひとこと box の合計 15 userbox) + book-tilt 角度を 5°→10° に増加して可視化、 ユーザーの手動移動 (tx=97 ty=20) を rebase で尊重。 sw.js 639→640
- **タスク**: zukan に絵本見開きの草案レイアウト追加 (3x3 グリッド + うさぎ詳細イラスト + なまえ/こえ/すがた ラベル + ひとこと box の合計 15 userbox) + book-tilt 角度を 5°→10° に増加して可視化、 ユーザーの手動移動 (tx=97 ty=20) を rebase で尊重。 sw.js 639→640
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Grep": 29, "Read": 31, "Edit": 185, "Bash": 249, "Write": 6}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-02T08:22:51Z - hide/show 機能を numeric panel に追加 (両エディタ、 __hidden 永続化) + quizland に zukan の userbox 作成機能 (🆕 矩形追加 + drag-to-create + bgImage + ×削除 + __userboxes 永続) をフル移植 → 機能パリティ達成。 sw.js 638→639
- **タスク**: hide/show 機能を numeric panel に追加 (両エディタ、 __hidden 永続化) + quizland に zukan の userbox 作成機能 (🆕 矩形追加 + drag-to-create + bgImage + ×削除 + __userboxes 永続) をフル移植 → 機能パリティ達成。 sw.js 638→639
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 11
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 36, "Edit": 187, "Grep": 28, "Bash": 244, "Write": 5}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-02T08:05:23Z - quizland のスロットに wordmatch ocean のテストイラスト 9 種を順番に表示 + zukan に Approach A (本ページ立体モード: userbox X 中心で左/右ページ判定 → rotateY ±5deg + transform-origin 綴じ目側) を実装、 全 transform 設定を helper setElTransform 経由に refactor。 sw.js 635→636
- **タスク**: quizland のスロットに wordmatch ocean のテストイラスト 9 種を順番に表示 + zukan に Approach A (本ページ立体モード: userbox X 中心で左/右ページ判定 → rotateY ±5deg + transform-origin 綴じ目側) を実装、 全 transform 設定を helper setElTransform 経由に refactor。 sw.js 635→636
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 39, "Edit": 175, "Grep": 28, "Bash": 251, "Write": 7}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


