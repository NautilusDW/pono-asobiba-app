# MEMORY.md - Self-Evolving Framework Knowledge Base

## Framework Statistics

- 初期化日: 2026-02-25
- 総タスク数: 19+
- 成功率: 100%
- 詳細履歴: [memory/task-history.md](memory/task-history.md)
- **部屋アイソメ引き継ぎ**: [memory/room-isometric-handoff.md](memory/room-isometric-handoff.md) — CSS mask未動作・17MB画像問題・巾木JS上書き問題
- **水族館エンハンス完了**: [memory/aquarium-enhancement-complete.md](memory/aquarium-enhancement-complete.md) — Phase1+2完了、Phase3見送り、卵育て構想
- **水族館UXフィードバック**: [memory/feedback_aquarium_ux.md](memory/feedback_aquarium_ux.md) — 矢印シンプル・ブースト大胆・音柔らか・複雑さ排除
- **git push自動化**: [memory/feedback_auto_push.md](memory/feedback_auto_push.md) — post-commitフックでNetlify自動デプロイ
- **毎回デプロイ必須**: [memory/feedback_auto_deploy.md](memory/feedback_auto_deploy.md) — タスク完了時は確認せず自動でcommit+deploy
- **Umamiアナリティクス**: [memory/reference_umami.md](memory/reference_umami.md) — Umami Cloud設定情報

---

## Key Learnings

### 🚨🚨🚨 デプロイ手順 🚨🚨🚨

> **`.git/hooks/post-commit` で自動化済み** — developブランチでコミットすると自動でNetlifyデプロイが実行される。
> 手動デプロイは不要。git pushも不要（ただしリモートバックアップのためpushは推奨）。
>
> 万が一フックが動かなかった場合の手動コマンド:
```
netlify deploy --dir . --alias develop
```

**`git push` だけでは絶対にダメ。`netlify deploy` がなければユーザーには何も届かない。**

#### ブランチ運用ルール（厳守）
- **develop ブランチ** = 開発・確認用。通常の作業はすべてここ。
- **master ブランチ** = 本番。ユーザーが「**本番にデプロイして**」と明示した時だけ反映。
- **絶対に勝手に master へマージ・本番デプロイしない。**

| ブランチ | URL | デプロイコマンド |
|---------|-----|----------------|
| develop | `develop--pono-asobiba.netlify.app` | `netlify deploy --dir . --branch develop --alias develop` |
| master  | `pono-asobiba.netlify.app` | `netlify deploy --dir . --prod` |

#### 本番反映時（ユーザー明示指示時のみ）
```
git checkout master && git merge develop && git push origin master
netlify deploy --dir . --prod
git checkout develop
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

### 2026-04-08T15:01:31Z - 水族館UX修正（ゾーンヘッダー・横向き）+ 生き物バランス見直し + 管理ダッシュボード刷新Phase1
- **タスク**: 水族館UX修正（ゾーンヘッダー・横向き）+ 生き物バランス見直し + 管理ダッシュボード刷新Phase1
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 73
- **エラー数**: 3
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 23, "Grep": 5, "Glob": 2, "Bash": 15, "ToolSearch": 1, "Write": 9, "Edit": 17, "Agent": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-08T13:51:55Z - クリーンエッジスタジオのWeb版をtools/creature_studio.htmlとして作成、管理ダッシュボードのツールタブと海のいきものタブに統合
- **タスク**: クリーンエッジスタジオのWeb版をtools/creature_studio.htmlとして作成、管理ダッシュボードのツールタブと海のいきものタブに統合
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 26
- **エラー数**: 6
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 13, "Bash": 9, "Write": 1, "Edit": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-08T10:21:12Z - 水族館ミュージアム化 Phase 1 MVP 実装（マップ画面 + ゾーンルーティング）
- **タスク**: 水族館ミュージアム化 Phase 1 MVP 実装（マップ画面 + ゾーンルーティング）
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 35
- **エラー数**: 3
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 13, "Grep": 2, "Glob": 1, "Bash": 6, "ToolSearch": 1, "Write": 7, "Edit": 5}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-08T09:55:53Z - Dialog編集後にfilenameがUIに反映されないバグ修正 (rebuild呼び出しが manual_filename を捨てていた) + プロンプトに漠然ラベル禁止ルール追加で色・形で区別可能な命名
- **タスク**: Dialog編集後にfilenameがUIに反映されないバグ修正 (rebuild呼び出しが manual_filename を捨てていた) + プロンプトに漠然ラベル禁止ルール追加で色・形で区別可能な命名
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 234
- **エラー数**: 27
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"ToolSearch": 2, "Glob": 1, "Read": 8, "Write": 12, "Edit": 100, "ExitPlanMode": 1, "Bash": 105, "Grep": 3, "Agent": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-08T09:30:15Z - Filename を 3 つの ASCII slug の決定的連結に変更 (base_slug + variant_slug + motion_slug). AI には slug ペア型 vocabulary を渡し、コンポーズは Python 側で実行。VariantPickerDialog も 2 列 (日本語+slug) 化
- **タスク**: Filename を 3 つの ASCII slug の決定的連結に変更 (base_slug + variant_slug + motion_slug). AI には slug ペア型 vocabulary を渡し、コンポーズは Python 側で実行。VariantPickerDialog も 2 列 (日本語+slug) 化
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 227
- **エラー数**: 27
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"ToolSearch": 2, "Glob": 1, "Read": 8, "Write": 12, "Edit": 98, "ExitPlanMode": 1, "Bash": 100, "Grep": 3, "Agent": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-08T08:57:53Z - Gemini paid tier 動作確認 (live test 3 calls シーケンシャル+語彙統一 PASS)
- **タスク**: Gemini paid tier 動作確認 (live test 3 calls シーケンシャル+語彙統一 PASS)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 198
- **エラー数**: 25
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"ToolSearch": 2, "Glob": 1, "Read": 8, "Write": 12, "Edit": 81, "ExitPlanMode": 1, "Bash": 88, "Grep": 3, "Agent": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-08T08:35:52Z - AI naming 固まる原因 (全モデル daily quota 枯渇) 解決: 即fail+バッチabort+ダイアログ. shrink float化. Spinbox直接入力. プリセットbg_mode保存
- **タスク**: AI naming 固まる原因 (全モデル daily quota 枯渇) 解決: 即fail+バッチabort+ダイアログ. shrink float化. Spinbox直接入力. プリセットbg_mode保存
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 195
- **エラー数**: 25
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"ToolSearch": 2, "Glob": 1, "Read": 8, "Write": 12, "Edit": 81, "ExitPlanMode": 1, "Bash": 85, "Grep": 3, "Agent": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-08T08:19:24Z - Alpha shrink (MinFilter erosion) + プリセット保存システム (JSON+デフォルト指定+4ビルトイン) + HTTP 0 ネットワークリトライ
- **タスク**: Alpha shrink (MinFilter erosion) + プリセット保存システム (JSON+デフォルト指定+4ビルトイン) + HTTP 0 ネットワークリトライ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 167
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"ToolSearch": 2, "Glob": 1, "Read": 8, "Write": 12, "Edit": 62, "ExitPlanMode": 1, "Bash": 76, "Grep": 3, "Agent": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-08T08:05:29Z - AI命名: 語彙統一(連鎖直列実行+既存語彙プロンプト)+3フィールド編集ダイアログ+一括リネーム+ダブルクリック修正
- **タスク**: AI命名: 語彙統一(連鎖直列実行+既存語彙プロンプト)+3フィールド編集ダイアログ+一括リネーム+ダブルクリック修正
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 146
- **エラー数**: 20
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"ToolSearch": 2, "Glob": 1, "Read": 7, "Write": 11, "Edit": 49, "ExitPlanMode": 1, "Bash": 70, "Grep": 3, "Agent": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


