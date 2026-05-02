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


### 2026-05-02T07:30:17Z - zukan プレビュー: main.png のサイズを 1300x731 → 1430x804 (110%) に拡大。 sw.js 632→633
- **タスク**: zukan プレビュー: main.png のサイズを 1300x731 → 1430x804 (110%) に拡大。 sw.js 632→633
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 9
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 160, "Bash": 264, "Read": 42, "Write": 9, "Grep": 25}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-02T07:15:30Z - zukan プレビュー: main.png (絵本本体) を background-size cover → 固定 1300x731 px に変更。 cover がクロップしてタイトルが切れていた問題を解消。 BG.jpg は cover のまま (21:9 全面)。 sw.js 631→632
- **タスク**: zukan プレビュー: main.png (絵本本体) を background-size cover → 固定 1300x731 px に変更。 cover がクロップしてタイトルが切れていた問題を解消。 BG.jpg は cover のまま (21:9 全面)。 sw.js 631→632
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 8
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Grep": 28, "Read": 45, "Edit": 161, "Bash": 257, "Write": 9}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-02T07:09:51Z - zukan プレビュー: BG.png (bottom) + main.png (top) を 1600x900 にリサイズして 2 層重ねの background に設定。 CSS multi-bg で一番上 = main、 下 = BG、 fallback = #2a2a2a。 sw.js 630→631
- **タスク**: zukan プレビュー: BG.png (bottom) + main.png (top) を 1600x900 にリサイズして 2 層重ねの background に設定。 CSS multi-bg で一番上 = main、 下 = BG、 fallback = #2a2a2a。 sw.js 630→631
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 8
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 258, "ToolSearch": 1, "Grep": 28, "Read": 45, "Edit": 159, "Write": 9}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-02T07:01:41Z - quizland プレビュー: シート ON 時に装飾系 PNG (owl-icon/title-card/character/ctrl-btn/dot/audio/circle/hint) を残してフレーム系のみ隠す。 q-text (まんなかは なにいろ?) を RESIZABLE_SPEC に追加 + inline-block 化で移動可能に。 sw.js 629→630
- **タスク**: quizland プレビュー: シート ON 時に装飾系 PNG (owl-icon/title-card/character/ctrl-btn/dot/audio/circle/hint) を残してフレーム系のみ隠す。 q-text (まんなかは なにいろ?) を RESIZABLE_SPEC に追加 + inline-block 化で移動可能に。 sw.js 629→630
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 9
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 158, "Bash": 259, "ToolSearch": 1, "Grep": 28, "Read": 45, "Write": 9}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-02T06:57:27Z - ユーザー指定の Zukan\main.png を 1600x900 JPG にリサイズして assets/preview-placeholders/zukan-bg.jpg に保存、 zukan プレビューの stage 背景に center/cover で適用 (#2a2a2a fallback)。 sw.js 628→629
- **タスク**: ユーザー指定の Zukan\main.png を 1600x900 JPG にリサイズして assets/preview-placeholders/zukan-bg.jpg に保存、 zukan プレビューの stage 背景に center/cover で適用 (#2a2a2a fallback)。 sw.js 628→629
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 7
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 259, "Edit": 158, "Read": 47, "ToolSearch": 1, "Grep": 26, "Write": 9}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-02T06:51:44Z - シート画像 (quizland-sheet-v1.png) のフレーム実位置を PIL connected-component で解析し、 quizland saved-layout の hdr-left/q-text-card/board/answer-tray のサイズと tx/ty をシートに合わせ込み。 __headerH も 145→142 に。 sw.js 627→628
- **タスク**: シート画像 (quizland-sheet-v1.png) のフレーム実位置を PIL connected-component で解析し、 quizland saved-layout の hdr-left/q-text-card/board/answer-tray のサイズと tx/ty をシートに合わせ込み。 __headerH も 145→142 に。 sw.js 627→628
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 8
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 257, "Read": 48, "Edit": 159, "ToolSearch": 1, "Grep": 26, "Write": 9}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-02T06:38:12Z - ユーザー手作りの main_frame.png を 2688x1152→2100x900 (21:9) にリサイズして assets/preview-placeholders/quizland-sheet-v1.png に保存。 quizland プレビューに 🪟 シート画像 トグル追加 (個別 placeholder 隠す + シートを安全領域に被せる + テキスト/絵文字は上に重ねる)。 sw.js 625→627
- **タスク**: ユーザー手作りの main_frame.png を 2688x1152→2100x900 (21:9) にリサイズして assets/preview-placeholders/quizland-sheet-v1.png に保存。 quizland プレビューに 🪟 シート画像 トグル追加 (個別 placeholder 隠す + シートを安全領域に被せる + テキスト/絵文字は上に重ねる)。 sw.js 625→627
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 157, "Bash": 259, "Read": 48, "ToolSearch": 1, "Grep": 26, "Write": 9}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-02T06:26:16Z - プレビュー両側: ワイヤー PNG 書き出し時にセンターのマゼンタクロスヘア + ドットを描画しないよう変更 (ブラウザ内表示はそのまま)。 sw.js 624→625
- **タスク**: プレビュー両側: ワイヤー PNG 書き出し時にセンターのマゼンタクロスヘア + ドットを描画しないよう変更 (ブラウザ内表示はそのまま)。 sw.js 624→625
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 11
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 252, "Edit": 160, "Write": 11, "Read": 50, "ToolSearch": 1, "Grep": 26}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


