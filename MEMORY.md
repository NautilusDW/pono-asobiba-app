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

### 2026-04-24T03:45:41Z - TIER_POLICY.md 作成（free/book/sub の仕様を tier.js から書き起こし）
- **タスク**: TIER_POLICY.md 作成（free/book/sub の仕様を tier.js から書き起こし）
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 30
- **エラー数**: 0
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた
- **ツール使用統計**: {"Agent": 3, "ToolSearch": 1, "Write": 6, "ExitPlanMode": 4, "Edit": 3, "Read": 3, "Bash": 5, "Grep": 4, "Glob": 1}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-24T03:19:08Z - こだまの森エリア再編設計プラン合意とメモリ保存（実装はMVP後に延期）
- **タスク**: こだまの森エリア再編設計プラン合意とメモリ保存（実装はMVP後に延期）
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 19
- **エラー数**: 0
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた
- **ツール使用統計**: {"Agent": 3, "ToolSearch": 1, "Write": 5, "ExitPlanMode": 4, "Edit": 3, "Read": 1, "Bash": 2}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-24T02:01:20Z - 炎の妖精の幽閉経緯を確定 (A案: 火山の魂・噴火を拒否) + 妖精は同行仲間に統一 + ザガン本人→手下 訂正、鍵 handoff 氷の妖精へ全面移管、docs 同期、CACHE 386→389 (3回 bump)
- **タスク**: 炎の妖精の幽閉経緯を確定 (A案: 火山の魂・噴火を拒否) + 妖精は同行仲間に統一 + ザガン本人→手下 訂正、鍵 handoff 氷の妖精へ全面移管、docs 同期、CACHE 386→389 (3回 bump)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 334
- **エラー数**: 13
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 55, "Agent": 2, "Write": 5, "ToolSearch": 4, "ExitPlanMode": 6, "Grep": 36, "Edit": 111, "Bash": 115}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-24T01:51:06Z - 鍵 handoff バグ修正: 炎の妖精 (ら行) から 氷の妖精 (な行) へ移動。_rescueFairy shrine 分岐で 7 メッセージ + 🔑 reveal (青系)、_fireFairyFarewell 簡素化 3 メッセージ、_fireFairyKeyReveal 削除、docs 更新、CACHE 386→387
- **タスク**: 鍵 handoff バグ修正: 炎の妖精 (ら行) から 氷の妖精 (な行) へ移動。_rescueFairy shrine 分岐で 7 メッセージ + 🔑 reveal (青系)、_fireFairyFarewell 簡素化 3 メッセージ、_fireFairyKeyReveal 削除、docs 更新、CACHE 386→387
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 316
- **エラー数**: 13
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 54, "Agent": 2, "Write": 5, "ToolSearch": 4, "ExitPlanMode": 6, "Grep": 35, "Edit": 102, "Bash": 108}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-24T01:10:04Z - ED 音声 7 本統合 (E1/E2a/E2b/E2c/E3/E4/E4b)。ENDING_SCENES に voice フィールド追加、CACHE 383→384。OP/ED の音声が全て揃った
- **タスク**: ED 音声 7 本統合 (E1/E2a/E2b/E2c/E3/E4/E4b)。ENDING_SCENES に voice フィールド追加、CACHE 383→384。OP/ED の音声が全て揃った
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 272
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 44, "Agent": 2, "Write": 4, "ToolSearch": 2, "ExitPlanMode": 5, "Grep": 27, "Edit": 89, "Bash": 99}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-24T01:00:56Z - S4c 廃止 + S5c_c を S5d 直前に移動。襲撃→惨状(心を奪う)→じつは…の3段物語起伏を実現。画像/音声は未作成だが 💔 フォールバック運用、index 不変、旧 S4c.mp3 削除、CACHE 381→382
- **タスク**: S4c 廃止 + S5c_c を S5d 直前に移動。襲撃→惨状(心を奪う)→じつは…の3段物語起伏を実現。画像/音声は未作成だが 💔 フォールバック運用、index 不変、旧 S4c.mp3 削除、CACHE 381→382
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 259
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 44, "Agent": 2, "Write": 4, "ToolSearch": 2, "ExitPlanMode": 5, "Grep": 27, "Edit": 82, "Bash": 93}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-24T00:56:52Z - S5c 画像 2 枚化 + 横パン CSS + S5d 画像統合。PIL で 1600w JPG 変換、OPENING_SCENES 分割、音声は setVoice 同一src 継続、SHORT index 16→17、CACHE 380→381
- **タスク**: S5c 画像 2 枚化 + 横パン CSS + S5d 画像統合。PIL で 1600w JPG 変換、OPENING_SCENES 分割、音声は setVoice 同一src 継続、SHORT index 16→17、CACHE 380→381
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 247
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 44, "Agent": 2, "Write": 4, "ToolSearch": 2, "ExitPlanMode": 5, "Grep": 27, "Edit": 74, "Bash": 89}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-24T00:28:40Z - E4/E4b を「勇者セリフ+地の文」体裁に統一 (ナレーター読み上げ前提)。E4「…たすけだすぞ」と、ゆうしゃは こころのなかで つぶやいた。E4b「…やぶってみせるぞ」と、あらためてつよくけついするのであった。docs 同期、CACHE 378→379
- **タスク**: E4/E4b を「勇者セリフ+地の文」体裁に統一 (ナレーター読み上げ前提)。E4「…たすけだすぞ」と、ゆうしゃは こころのなかで つぶやいた。E4b「…やぶってみせるぞ」と、あらためてつよくけついするのであった。docs 同期、CACHE 378→379
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 213
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 41, "Agent": 2, "Write": 4, "ToolSearch": 2, "ExitPlanMode": 5, "Grep": 23, "Edit": 61, "Bash": 75}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-23T23:59:24Z - v266 ありがとうテーマ統合: common/thankyou.js API、play.html 💝バッジ、精霊浄化+1/ボス+2、妖精救出+3、バトル勝利モーダル行追加、OP S4c(ザガン動機)/S7c(勇者勅命) + ED E1{{THANKYOU}}動的置換/E4b追加、CACHE_VERSION bump 378
- **タスク**: v266 ありがとうテーマ統合: common/thankyou.js API、play.html 💝バッジ、精霊浄化+1/ボス+2、妖精救出+3、バトル勝利モーダル行追加、OP S4c(ザガン動機)/S7c(勇者勅命) + ED E1{{THANKYOU}}動的置換/E4b追加、CACHE_VERSION bump 378
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 203
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 39, "Agent": 2, "Write": 4, "ToolSearch": 2, "ExitPlanMode": 4, "Grep": 23, "Edit": 57, "Bash": 72}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


