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

### 2026-04-17T02:49:44Z - 壁/床一括追加（重複スキップ 14+17+1件、マスク切り+items.js）
- **タスク**: 壁/床一括追加（重複スキップ 14+17+1件、マスク切り+items.js）
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 167, "Read": 141, "Grep": 65, "Edit": 109, "Write": 6, "ToolSearch": 4, "Monitor": 2, "ExitPlanMode": 2, "Agent": 4}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-17T02:36:58Z - 壁/床素材4点登録（マスク切り+items.js）+ CES マルチ合成モードでサムネクリック時に元画像/処理後プレビュー切替
- **タスク**: 壁/床素材4点登録（マスク切り+items.js）+ CES マルチ合成モードでサムネクリック時に元画像/処理後プレビュー切替
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 26
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Grep": 71, "Read": 145, "Edit": 108, "Bash": 159, "Write": 5, "ToolSearch": 4, "Monitor": 2, "ExitPlanMode": 2, "Agent": 4}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-16T23:10:45Z - admin reward picker: name follows new image selection (follow, not protect)
- **タスク**: admin reward picker: name follows new image selection (follow, not protect)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 30
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 115, "Edit": 136, "Bash": 166, "ToolSearch": 4, "Monitor": 3, "Agent": 10, "Grep": 59, "Write": 5, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-16T22:42:16Z - セッション全体: pivot/CES 連携契約リファクタ, 報酬監査・男女別9ゲーム化, おうちアンロック条件メッセージ, 複数選択削除, CES合成タブ コンパクト化
- **タスク**: セッション全体: pivot/CES 連携契約リファクタ, 報酬監査・男女別9ゲーム化, おうちアンロック条件メッセージ, 複数選択削除, CES合成タブ コンパクト化
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 29
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 116, "Edit": 137, "Bash": 164, "ToolSearch": 4, "Monitor": 3, "Agent": 10, "Grep": 59, "Write": 5, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-16T22:36:57Z - first-clear rewards: conditional afterMsg based on room unlock state
- **タスク**: first-clear rewards: conditional afterMsg based on room unlock state
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 29
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 118, "Bash": 162, "Edit": 137, "ToolSearch": 4, "Monitor": 3, "Agent": 10, "Grep": 59, "Write": 5, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-16T14:20:41Z - CES composite tab compact layout: inline band + collapsible canvas + unified toolbar
- **タスク**: CES composite tab compact layout: inline band + collapsible canvas + unified toolbar
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 28
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 143, "Bash": 158, "Read": 120, "ToolSearch": 4, "Monitor": 2, "Agent": 10, "Grep": 56, "Write": 5, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-16T14:07:26Z - CES local save filename collision fix + pivot tool local export feature
- **タスク**: CES local save filename collision fix + pivot tool local export feature
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 29
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 161, "Read": 120, "Write": 6, "ExitPlanMode": 3, "Edit": 142, "ToolSearch": 4, "Monitor": 2, "Agent": 10, "Grep": 52}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-16T14:05:09Z - rewards.json: gender all firstClearRewards + add writing/bento/quizland (9 games total)
- **タスク**: rewards.json: gender all firstClearRewards + add writing/bento/quizland (9 games total)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 29
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 145, "Bash": 162, "Read": 118, "Write": 6, "ExitPlanMode": 3, "ToolSearch": 4, "Monitor": 2, "Agent": 10, "Grep": 50}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-16T12:37:23Z - rewards.json: replace broken first-clear rewards with real deco items, remove sea/breakout refs
- **タスク**: rewards.json: replace broken first-clear rewards with real deco items, remove sea/breakout refs
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 29
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 160, "Edit": 146, "Read": 119, "Write": 6, "ExitPlanMode": 3, "ToolSearch": 4, "Monitor": 2, "Agent": 10, "Grep": 50}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


