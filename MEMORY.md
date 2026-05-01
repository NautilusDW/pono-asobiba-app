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

### 2026-05-01T23:52:52Z - saved-layout を user の最新 da0409a ベースに 0.9 スケール + 端数丸め + 微小ずれ整列 (q-text-card tx -11→-10、hint/character tx 0統一、character ty -601.5→-601 等)。 + editable-text 選択子に runtime クラスが混入する bug 修正 (.selected/.edge-linked/.has-selection/.grid-mode を TRANSIENT_CLASSES に追加)
- **タスク**: saved-layout を user の最新 da0409a ベースに 0.9 スケール + 端数丸め + 微小ずれ整列 (q-text-card tx -11→-10、hint/character tx 0統一、character ty -601.5→-601 等)。 + editable-text 選択子に runtime クラスが混入する bug 修正 (.selected/.edge-linked/.has-selection/.grid-mode を TRANSIENT_CLASSES に追加)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 30
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"WebSearch": 8, "WebFetch": 4, "Bash": 209, "Write": 12, "Edit": 217, "Read": 42, "ToolSearch": 1, "Grep": 7}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-01T23:40:35Z - saved-layout 復元 + プレビューエディタに 3 機能追加 (複数選択 / 隣接フレームの辺リンク / 数値入力パネル)。 BCR fixup ロジックを performResize にリファクタして primary + linked で共有
- **タスク**: saved-layout 復元 + プレビューエディタに 3 機能追加 (複数選択 / 隣接フレームの辺リンク / 数値入力パネル)。 BCR fixup ロジックを performResize にリファクタして primary + linked で共有
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 32
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 210, "Edit": 219, "Read": 41, "Grep": 5, "ToolSearch": 2, "WebSearch": 10, "WebFetch": 4, "Write": 9}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-01T23:10:52Z - saved-layout.json の全 bbox を safe-area 1600x900 ギリギリまで拡張 (header 230h / 主要枠 1200w / board 400h / answer-tray 720x400 等)。 Codex 用の装飾 10-15% マージン分を内包。 ユーザー auto-commit と rebase 衝突を解消
- **タスク**: saved-layout.json の全 bbox を safe-area 1600x900 ギリギリまで拡張 (header 230h / 主要枠 1200w / board 400h / answer-tray 720x400 等)。 Codex 用の装飾 10-15% マージン分を内包。 ユーザー auto-commit と rebase 衝突を解消
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 34
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 221, "Edit": 219, "Read": 31, "Grep": 4, "ToolSearch": 2, "WebSearch": 10, "WebFetch": 4, "Write": 9}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-01T22:53:26Z - 16 placeholder PNG を削除 (stage-bg + grid/ 維持)、 ユーザー bbox 再調整中フラグを HANDOFF Active に立てた、 commit & push
- **タスク**: 16 placeholder PNG を削除 (stage-bg + grid/ 維持)、 ユーザー bbox 再調整中フラグを HANDOFF Active に立てた、 commit & push
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 34
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 220, "Edit": 222, "Read": 31, "Grep": 4, "ToolSearch": 2, "WebSearch": 10, "WebFetch": 4, "Write": 7}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-01T22:47:51Z - HANDOFF に Codex 向け 2 巡目修正依頼を追加 (装飾を外周 10% 以内に / 焼き込みサブフレーム剥がす / answer-tray 横長化)
- **タスク**: HANDOFF に Codex 向け 2 巡目修正依頼を追加 (装飾を外周 10% 以内に / 焼き込みサブフレーム剥がす / answer-tray 横長化)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 34
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 218, "Edit": 223, "Read": 32, "Grep": 4, "ToolSearch": 2, "WebSearch": 10, "WebFetch": 4, "Write": 7}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-01T18:29:55Z - sw.js 601→602 バンプ + Codex の RGBA 透過 + 仕様寸法 placeholder 再生成 反映 + HANDOFF Active クローズ
- **タスク**: sw.js 601→602 バンプ + Codex の RGBA 透過 + 仕様寸法 placeholder 再生成 反映 + HANDOFF Active クローズ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 34
- **検出された良いパターン**: テストを先に書いてから実装した (TDD), 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: テストを先に書いてから実装した (TDD), 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 218, "Edit": 223, "Read": 32, "Grep": 4, "ToolSearch": 2, "WebSearch": 10, "WebFetch": 4, "Write": 7}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-01T18:16:56Z - quizland/preview に 🔁 グリッド比較 トグル追加 + 旧グリッド placeholder 復元 + Codex 再依頼 HANDOFF 記述 + sw.js 600→601 バンプ
- **タスク**: quizland/preview に 🔁 グリッド比較 トグル追加 + 旧グリッド placeholder 復元 + Codex 再依頼 HANDOFF 記述 + sw.js 600→601 バンプ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 34
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 226, "Bash": 216, "Read": 31, "Grep": 4, "ToolSearch": 2, "WebSearch": 10, "WebFetch": 4, "Write": 7}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-01T18:07:55Z - sw.js CACHE_VERSION 599→600 バンプ + Codex の Quizland GPT Image 2 アセット差し替え反映 commit & push
- **タスク**: sw.js CACHE_VERSION 599→600 バンプ + Codex の Quizland GPT Image 2 アセット差し替え反映 commit & push
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 34
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 214, "Edit": 231, "Read": 32, "Grep": 1, "ToolSearch": 1, "WebSearch": 10, "WebFetch": 4, "Write": 7}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-01T15:21:47Z - sw.js CACHE_VERSION 596→597 バンプ + HANDOFF.md に Codex 完了記録追加 (placeholder 検証 commit 876b1a4)
- **タスク**: sw.js CACHE_VERSION 596→597 バンプ + HANDOFF.md に Codex 完了記録追加 (placeholder 検証 commit 876b1a4)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 35
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 37, "Bash": 209, "Edit": 231, "Grep": 1, "ToolSearch": 1, "WebSearch": 10, "WebFetch": 4, "Write": 7}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


