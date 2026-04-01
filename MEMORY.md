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

### 2026-04-01T01:33:28Z - wordmatch: word-tray align-content:start修正 + match stage繰り返し問題修正(8ステージ後はミックス生成)
- **タスク**: wordmatch: word-tray align-content:start修正 + match stage繰り返し問題修正(8ステージ後はミックス生成)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 181, "Bash": 127, "Edit": 96, "Agent": 32, "Write": 4, "Grep": 55, "Glob": 3, "ToolSearch": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-01T01:18:43Z - room/index.html: portrait-notice CSS media query削除→JS100%制御でホームボタンブロック修正
- **タスク**: room/index.html: portrait-notice CSS media query削除→JS100%制御でホームボタンブロック修正
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 181, "Bash": 127, "Edit": 96, "Agent": 32, "Write": 4, "Grep": 55, "Glob": 3, "ToolSearch": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-01T00:32:11Z - aquarium: チュートリアルダイアログdismiss修正+たからさがし説明追加+全生き物タップ音追加
- **タスク**: aquarium: チュートリアルダイアログdismiss修正+たからさがし説明追加+全生き物タップ音追加
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Grep": 56, "Edit": 97, "Read": 185, "Bash": 124, "Agent": 29, "Write": 4, "Glob": 3, "ToolSearch": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 3個の非効率パターンあり。


### 2026-04-01T00:30:43Z - menu.jsホームボタン位置調整(iPhone角丸対応) + room/wordmatch BGM追加
- **タスク**: menu.jsホームボタン位置調整(iPhone角丸対応) + room/wordmatch BGM追加
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Grep": 56, "Edit": 97, "Read": 185, "Bash": 124, "Agent": 29, "Write": 4, "Glob": 3, "ToolSearch": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 3個の非効率パターンあり。


### 2026-04-01T00:28:19Z - coloring/index.html横画面で選択画面スクロール不可修正（flex-shrink:0追加）
- **タスク**: coloring/index.html横画面で選択画面スクロール不可修正（flex-shrink:0追加）
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 126, "Grep": 56, "Edit": 97, "Read": 185, "Agent": 27, "Write": 4, "Glob": 3, "ToolSearch": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 3個の非効率パターンあり。


### 2026-04-01T00:18:33Z - stacking/index.html: landscape-notice→portrait-noticeにリネーム＋CSS media query追加＋JS確実制御（home button blocked after rotation fix）
- **タスク**: stacking/index.html: landscape-notice→portrait-noticeにリネーム＋CSS media query追加＋JS確実制御（home button blocked after rotation fix）
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 126, "Grep": 56, "Edit": 97, "Read": 185, "Agent": 27, "Write": 4, "Glob": 3, "ToolSearch": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 3個の非効率パターンあり。


### 2026-04-01T00:08:51Z - puzzle/style.cssにlandscape用レイアウト追加（@media orientation: landscape）+ HTML sidebar wrapper
- **タスク**: puzzle/style.cssにlandscape用レイアウト追加（@media orientation: landscape）+ HTML sidebar wrapper
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 126, "Grep": 56, "Edit": 97, "Read": 185, "Agent": 27, "Write": 4, "Glob": 3, "ToolSearch": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 3個の非効率パターンあり。


### 2026-04-01T00:08:19Z - 4ゲームページにランドスケープ検出＋縦向き回転通知を追加（bubble/breakout/stacking/slide）
- **タスク**: 4ゲームページにランドスケープ検出＋縦向き回転通知を追加（bubble/breakout/stacking/slide）
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 126, "Grep": 56, "Edit": 97, "Read": 185, "Agent": 27, "Write": 4, "Glob": 3, "ToolSearch": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 3個の非効率パターンあり。


### 2026-03-31T01:35:30Z - egg/index.htmlにBGMファイルサポート追加（audioタグ+再生制御ロジック）
- **タスク**: egg/index.htmlにBGMファイルサポート追加（audioタグ+再生制御ロジック）
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 15
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 132, "Bash": 124, "Read": 146, "Grep": 71, "Agent": 22, "Write": 2, "Glob": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 3個の非効率パターンあり。


