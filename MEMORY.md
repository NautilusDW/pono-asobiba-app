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


### 2026-05-02T06:22:17Z - プレビュー (両側): ワイヤー PNG 書き出しサイズを 21:9 (2100x900) → 16:9 (1600x900 = safe area) に変更。 zukan に userbox 塗り濃度スライダー追加 (--userbox-opacity CSS 変数経由、 localStorage 永続)。 sw.js 623→624
- **タスク**: プレビュー (両側): ワイヤー PNG 書き出しサイズを 21:9 (2100x900) → 16:9 (1600x900 = safe area) に変更。 zukan に userbox 塗り濃度スライダー追加 (--userbox-opacity CSS 変数経由、 localStorage 永続)。 sw.js 623→624
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 11
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 161, "Bash": 251, "Write": 11, "Read": 50, "ToolSearch": 1, "Grep": 26}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-02T05:58:25Z - quizland プレビューのワイヤー表示で 2 つのフクロウ絵文字 (.hdr-left .owl-icon と .character) を font-size:0 で非表示に。 sw.js 622→623
- **タスク**: quizland プレビューのワイヤー表示で 2 つのフクロウ絵文字 (.hdr-left .owl-icon と .character) を font-size:0 で非表示に。 sw.js 622→623
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 13
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 254, "Read": 51, "Edit": 157, "Write": 11, "ToolSearch": 1, "Grep": 26}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-02T05:54:23Z - プレビュー両側の修正: wireframe-only が placeholder PNG を消せていなかったバグを直接クラスセレクタで修正 (specificity 衝突解消) + ガイド線の hit 領域を 1px → ±6px 拡張 (掴みやすく)。 sw.js 621→622
- **タスク**: プレビュー両側の修正: wireframe-only が placeholder PNG を消せていなかったバグを直接クラスセレクタで修正 (specificity 衝突解消) + ガイド線の hit 領域を 1px → ±6px 拡張 (掴みやすく)。 sw.js 621→622
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 15
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 158, "Bash": 253, "Read": 51, "Write": 11, "ToolSearch": 1, "Grep": 26}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-02T05:50:05Z - quizland プレビューにワイヤー表示トグル + PNG 書き出し追加 (zukan の対応版を移植、 RESIZABLE_SPEC ラベル使用、 BCR 経由で位置取得) + zukan の STORAGE_KEY を quizland と分離 (anno collision バグ修正、 旧キーから auto migration)。 sw.js 620→621
- **タスク**: quizland プレビューにワイヤー表示トグル + PNG 書き出し追加 (zukan の対応版を移植、 RESIZABLE_SPEC ラベル使用、 BCR 経由で位置取得) + zukan の STORAGE_KEY を quizland と分離 (anno collision バグ修正、 旧キーから auto migration)。 sw.js 620→621
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 15
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 164, "Bash": 248, "Read": 51, "Write": 11, "ToolSearch": 1, "Grep": 25}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-02T05:38:02Z - zukan プレビュー: ワイヤー表示トグル + PNG 書き出し (Codex に渡せる 2100x900 の bbox 配置参照画像) を実装。 sw.js 619→620
- **タスク**: zukan プレビュー: ワイヤー表示トグル + PNG 書き出し (Codex に渡せる 2100x900 の bbox 配置参照画像) を実装。 sw.js 619→620
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 18
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"WebSearch": 1, "WebFetch": 1, "Bash": 250, "Read": 52, "Write": 12, "Edit": 161, "ToolSearch": 1, "Grep": 22}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


