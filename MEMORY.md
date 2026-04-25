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


### 2026-04-25T03:53:48Z - v277j: ありがとう吹き出しをカゲロウだけ skip + bow セリフ revert + れんぞくわざ 読み修正。sw 428
- **タスク**: v277j: ありがとう吹き出しをカゲロウだけ skip + bow セリフ revert + れんぞくわざ 読み修正。sw 428
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 403
- **エラー数**: 13
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 99, "Bash": 102, "Grep": 57, "ToolSearch": 3, "Edit": 125, "Write": 6, "Agent": 6, "ExitPlanMode": 4, "Skill": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-25T03:49:12Z - v277i: finisher 再構成 (ん → かげろう連続技) + カゲロウ感謝削除 + celebration 妖精高解像度 + 宝箱モーダル時の隠蔽。sw 427
- **タスク**: v277i: finisher 再構成 (ん → かげろう連続技) + カゲロウ感謝削除 + celebration 妖精高解像度 + 宝箱モーダル時の隠蔽。sw 427
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 390
- **エラー数**: 13
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 97, "Bash": 98, "Grep": 56, "ToolSearch": 3, "Edit": 119, "Write": 6, "Agent": 6, "ExitPlanMode": 4, "Skill": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-25T03:35:11Z - v277h: 自律モードでギャップ調査 → 妖精合流位置移動 + ヒノカ軽傷 mini-cut 新設 + コードレビュー指摘 (HIGH#1 フラグ 2 段化, HIGH#2 cleanup selector, MEDIUM#1 cancellable timer, LOW#2 comment) すべて修正してデプロイ。sw 426
- **タスク**: v277h: 自律モードでギャップ調査 → 妖精合流位置移動 + ヒノカ軽傷 mini-cut 新設 + コードレビュー指摘 (HIGH#1 フラグ 2 段化, HIGH#2 cleanup selector, MEDIUM#1 cancellable timer, LOW#2 comment) すべて修正してデプロイ。sw 426
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 367
- **エラー数**: 13
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 89, "Bash": 95, "Grep": 52, "ToolSearch": 3, "Edit": 111, "Write": 6, "Agent": 6, "ExitPlanMode": 4, "Skill": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-25T03:07:46Z - v277f+g: ほむらのうたリネーム + ノクス勝利後の不敵な笑みエピローグ + ザガン名の明示。sw 425
- **タスク**: v277f+g: ほむらのうたリネーム + ノクス勝利後の不敵な笑みエピローグ + ザガン名の明示。sw 425
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 332
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 82, "Bash": 89, "Grep": 48, "ToolSearch": 3, "Edit": 97, "Write": 6, "Agent": 2, "ExitPlanMode": 4, "Skill": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-25T02:38:12Z - v277e: ノクス再登場画像+セリフ刷新 / ヒノカ語彙修正 / ダイアログ統一 / カゲロウ位置+影修正。sw 423
- **タスク**: v277e: ノクス再登場画像+セリフ刷新 / ヒノカ語彙修正 / ダイアログ統一 / カゲロウ位置+影修正。sw 423
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 294
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 75, "Bash": 82, "Grep": 45, "ToolSearch": 3, "Edit": 77, "Write": 6, "Agent": 2, "ExitPlanMode": 3, "Skill": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-25T02:10:15Z - v277d: Phase B 第 1 弾 — 妖精合流シーン + Beat 0 魔法相性デモ + Hinoka 高解像度 + カゲロウ顔切れ修正 + ノクスダイアログ可視化。sw 422
- **タスク**: v277d: Phase B 第 1 弾 — 妖精合流シーン + Beat 0 魔法相性デモ + Hinoka 高解像度 + カゲロウ顔切れ修正 + ノクスダイアログ可視化。sw 422
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 272
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 72, "Bash": 77, "Grep": 39, "ToolSearch": 3, "Edit": 69, "Write": 6, "Agent": 2, "ExitPlanMode": 3, "Skill": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-25T01:51:31Z - v277c: わ行イントロ刷新バグ修正 - 山道パン反転 / カゲロウ斜めパン解消 / ナレーションテロップ追加 / battleStage 手動 reveal / Ashen Guardian BGM / ED 6 枚差し替え。sw 421
- **タスク**: v277c: わ行イントロ刷新バグ修正 - 山道パン反転 / カゲロウ斜めパン解消 / ナレーションテロップ追加 / battleStage 手動 reveal / Ashen Guardian BGM / ED 6 枚差し替え。sw 421
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 242
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 65, "Bash": 65, "Grep": 37, "ToolSearch": 3, "Edit": 60, "Write": 6, "Agent": 2, "ExitPlanMode": 3, "Skill": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


