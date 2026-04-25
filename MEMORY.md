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

### 2026-04-25T23:22:17Z - v278g: 3件一括 — フル画面戻り時キャンバス位置ずれ (visibility:hidden 化)、妖精スプライト Hinoka/Riefa/Serina_001 差替 + 半分縮小、バストアップ object-fit:contain で全身表示。sw 438
- **タスク**: v278g: 3件一括 — フル画面戻り時キャンバス位置ずれ (visibility:hidden 化)、妖精スプライト Hinoka/Riefa/Serina_001 差替 + 半分縮小、バストアップ object-fit:contain で全身表示。sw 438
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 119
- **エラー数**: 4
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 32, "Grep": 37, "Bash": 28, "Edit": 17, "Glob": 5}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-25T23:05:15Z - v278f: バトル中の narrative 会話 (_showBattleDialog) を battle-fullscreen-active クラスで全画面化、_awaitTapOnLog は対象外、battle-mode 解除時に確実クリーンアップ。sw 437
- **タスク**: v278f: バトル中の narrative 会話 (_showBattleDialog) を battle-fullscreen-active クラスで全画面化、_awaitTapOnLog は対象外、battle-mode 解除時に確実クリーンアップ。sw 437
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 69
- **エラー数**: 3
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 23, "Grep": 24, "Bash": 11, "Edit": 11}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-25T07:34:28Z - v278e: 大量微修正 — bustup 1.5x / 妖精スプライト stage 化 / combo 完全全画面 / chant 縦長 / Nokus 縦パン / 火の玉 finisher / われにかえった / battle_last_03 in-celebration / battle_last_02 仮面壊れ画像。sw 436
- **タスク**: v278e: 大量微修正 — bustup 1.5x / 妖精スプライト stage 化 / combo 完全全画面 / chant 縦長 / Nokus 縦パン / 火の玉 finisher / われにかえった / battle_last_03 in-celebration / battle_last_02 仮面壊れ画像。sw 436
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 191, "Read": 112, "Write": 7, "Bash": 111, "Agent": 6, "ToolSearch": 2, "ExitPlanMode": 4, "Grep": 66, "Skill": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-25T07:06:41Z - v278d: 6 件の微修正 — ノクス縦パン / 攻撃→仮面割れ順 / われにかえった統一 / どんぐりカット / celebration 読みやすく / 宝箱 z-index 昇格。sw 435
- **タスク**: v278d: 6 件の微修正 — ノクス縦パン / 攻撃→仮面割れ順 / われにかえった統一 / どんぐりカット / celebration 読みやすく / 宝箱 z-index 昇格。sw 435
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 12
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 106, "Edit": 189, "Grep": 66, "Bash": 118, "Write": 8, "Agent": 6, "ToolSearch": 2, "ExitPlanMode": 4, "Skill": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-25T06:58:23Z - v278c: caption ボックス化 / 装備行非表示 / 妖精 HP 横並び / 敵名画像下 / ヒノカ呼びかけ / memory_03 カット / chant canvas 拡大 / 連続技フェーズ全画面化。sw 434
- **タスク**: v278c: caption ボックス化 / 装備行非表示 / 妖精 HP 横並び / 敵名画像下 / ヒノカ呼びかけ / memory_03 カット / chant canvas 拡大 / 連続技フェーズ全画面化。sw 434
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 12
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 107, "Grep": 71, "Bash": 121, "Edit": 180, "Write": 8, "Agent": 6, "ToolSearch": 2, "ExitPlanMode": 4, "Skill": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-25T05:00:20Z - v278b: canonical 6 ターンフロー再構築 — 連続技 ほのお/ひのたま + HP 全回復絶望 + 妖精やられる + Phase D の climax を ん 後に移動。sw 433
- **タスク**: v278b: canonical 6 ターンフロー再構築 — 連続技 ほのお/ひのたま + HP 全回復絶望 + 妖精やられる + Phase D の climax を ん 後に移動。sw 433
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 15
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 117, "Bash": 125, "Grep": 69, "ToolSearch": 3, "Edit": 167, "Write": 8, "Agent": 6, "ExitPlanMode": 4, "Skill": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-25T04:52:08Z - v278a: 妖精パーティー HP ゲージ + 敵 HP 名前色化 (DQ 風)。volcano_lord 戦のみ起動、ヒノカ開幕表示・合流で全員。sw 432
- **タスク**: v278a: 妖精パーティー HP ゲージ + 敵 HP 名前色化 (DQ 風)。volcano_lord 戦のみ起動、ヒノカ開幕表示・合流で全員。sw 432
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 485
- **エラー数**: 15
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 114, "Bash": 122, "Grep": 67, "ToolSearch": 3, "Edit": 160, "Write": 8, "Agent": 6, "ExitPlanMode": 4, "Skill": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-25T04:28:39Z - v277l: v277k 誤適用 revert + bustup 正しく 70% + 下げる + hook v2 強化 (block-on-mismatch) + state files gitignore。sw 430
- **タスク**: v277l: v277k 誤適用 revert + bustup 正しく 70% + 下げる + hook v2 強化 (block-on-mismatch) + state files gitignore。sw 430
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 448
- **エラー数**: 14
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 105, "Bash": 115, "Grep": 61, "ToolSearch": 3, "Edit": 145, "Write": 8, "Agent": 6, "ExitPlanMode": 4, "Skill": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-25T04:14:38Z - v277k: ユーザースクショ通りに 6 件一括是正 (caption 統一/位置/カゲロウ名隠し/妖精 70%/カゲロウ位置/合流位置/ほむら誤植)。sw 429
- **タスク**: v277k: ユーザースクショ通りに 6 件一括是正 (caption 統一/位置/カゲロウ名隠し/妖精 70%/カゲロウ位置/合流位置/ほむら誤植)。sw 429
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 427
- **エラー数**: 13
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 102, "Bash": 107, "Grep": 61, "ToolSearch": 3, "Edit": 137, "Write": 6, "Agent": 6, "ExitPlanMode": 4, "Skill": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


