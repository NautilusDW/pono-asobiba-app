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

### 2026-04-27T13:27:11Z - ステージラベルをナンバーのみ表示+透明度を上げて控えめに
- **タスク**: ステージラベルをナンバーのみ表示+透明度を上げて控えめに
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 124, "Edit": 252, "Read": 60, "Write": 13, "Grep": 38, "Agent": 3, "WebSearch": 4, "ToolSearch": 4, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-27T13:24:36Z - 迷路: 障害物衝突で 1 秒静止してから戻る + お邪魔虫ミニゲームをランダム化
- **タスク**: 迷路: 障害物衝突で 1 秒静止してから戻る + お邪魔虫ミニゲームをランダム化
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 23
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 123, "Edit": 253, "Read": 61, "Write": 13, "Grep": 37, "Agent": 3, "WebSearch": 4, "ToolSearch": 4, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-27T13:14:50Z - 迷路: 行き止まり/障害物で吹き出し + ゴールインジケータ タップで自動スクロール
- **タスク**: 迷路: 行き止まり/障害物で吹き出し + ゴールインジケータ タップで自動スクロール
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 23
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 123, "Read": 62, "Edit": 253, "Write": 13, "Grep": 36, "Agent": 3, "WebSearch": 4, "ToolSearch": 4, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-27T13:00:34Z - 迷路にゴール方向インジケーターと手動カメラパン追加 (横長ステージで右端ゴール切れ対策)
- **タスク**: 迷路にゴール方向インジケーターと手動カメラパン追加 (横長ステージで右端ゴール切れ対策)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 21
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Grep": 40, "Edit": 248, "Write": 14, "Read": 60, "Bash": 125, "Agent": 3, "WebSearch": 4, "ToolSearch": 4, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-27T03:49:31Z - MVP用報酬制度封印の二次対応：宝箱以外に残っていた報酬連動モーダル全てをフラグでガード（おもちゃばこ説明/ベッド説明/おへやアンロック/カード完成/first-clear連鎖/スロットヒント/トリビア）
- **タスク**: MVP用報酬制度封印の二次対応：宝箱以外に残っていた報酬連動モーダル全てをフラグでガード（おもちゃばこ説明/ベッド説明/おへやアンロック/カード完成/first-clear連鎖/スロットヒント/トリビア）
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 145
- **エラー数**: 5
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 3, "ToolSearch": 1, "Write": 8, "ExitPlanMode": 4, "Edit": 27, "Read": 45, "Bash": 7, "Grep": 49, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 3個の非効率パターンあり。


### 2026-04-27T01:33:03Z - クリーンエッジスタジオにタイムライン再生機能を実装 (スプライトカードのドラッグ並び替え + タイムラインタブ + 比較タブハイライト連携)
- **タスク**: クリーンエッジスタジオにタイムライン再生機能を実装 (スプライトカードのドラッグ並び替え + タイムラインタブ + 比較タブハイライト連携)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 60
- **エラー数**: 2
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Agent": 4, "Read": 16, "Grep": 5, "Write": 3, "ToolSearch": 2, "ExitPlanMode": 1, "Edit": 20, "Bash": 9}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-27T00:30:57Z - 迷路ミニエディタ tools/maze-editor.html 作成 (画像ドロップ→ノード&道クリック定義→JSON書出し、Phase 1.5)
- **タスク**: 迷路ミニエディタ tools/maze-editor.html 作成 (画像ドロップ→ノード&道クリック定義→JSON書出し、Phase 1.5)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 93
- **エラー数**: 7
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 4, "ToolSearch": 4, "Write": 6, "Edit": 31, "ExitPlanMode": 1, "Bash": 19, "Read": 19, "Grep": 9}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 3個の非効率パターンあり。


### 2026-04-27T00:20:18Z - 迷路に画像ベースステージ Phase1 追加 (?image=sample1 で読込、ポリライン歩行+カメラ追従+横画面オーバーレイ、レビュー指摘5件反映)
- **タスク**: 迷路に画像ベースステージ Phase1 追加 (?image=sample1 で読込、ポリライン歩行+カメラ追従+横画面オーバーレイ、レビュー指摘5件反映)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 75
- **エラー数**: 6
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 4, "ToolSearch": 3, "Write": 4, "Edit": 26, "ExitPlanMode": 1, "Bash": 12, "Read": 17, "Grep": 8}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 3個の非効率パターンあり。


### 2026-04-26T22:26:56Z - v278u: 9 件 — 山道 caption 1 行化、Hinoka 認識+魔法相性 bustup を left に、フル画面妖精 3 体を勇者左 7-11% にクラスタ化、Hiragino フォント全箇所に DotGothic16 を先頭追加、'ザガン が しこんだ' → 'ザガン に かけられた'、Serina+Riefa セリフを 2 行に再構成、_showMemoryFlashback img を 100vw/100vh cover でフル画面化。sw 454
- **タスク**: v278u: 9 件 — 山道 caption 1 行化、Hinoka 認識+魔法相性 bustup を left に、フル画面妖精 3 体を勇者左 7-11% にクラスタ化、Hiragino フォント全箇所に DotGothic16 を先頭追加、'ザガン が しこんだ' → 'ザガン に かけられた'、Serina+Riefa セリフを 2 行に再構成、_showMemoryFlashback img を 100vw/100vh cover でフル画面化。sw 454
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 446
- **エラー数**: 13
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 114, "Grep": 70, "Bash": 119, "Edit": 132, "Glob": 5, "Agent": 2, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


