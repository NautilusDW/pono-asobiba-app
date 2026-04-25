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


### 2026-04-25T01:16:59Z - v277b: わ行イントロをフル画面化 — 山道は下→上 10s 縦パン、カゲロウ登場は cover+kenBurns、ヒノカ認識は『まって！』撤去+『けはい』誤字修正で 4 ビート化。docs 同時更新。sw 420
- **タスク**: v277b: わ行イントロをフル画面化 — 山道は下→上 10s 縦パン、カゲロウ登場は cover+kenBurns、ヒノカ認識は『まって！』撤去+『けはい』誤字修正で 4 ビート化。docs 同時更新。sw 420
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 206
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 60, "Bash": 56, "Grep": 32, "ToolSearch": 3, "Edit": 47, "Write": 5, "Agent": 1, "ExitPlanMode": 1, "Skill": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-25T00:59:46Z - v277: カゲロウ最終バトル 2 段儀式 (Chant Ritual) 実装 — _showChantRitual + 2 テーマ (awakening/starmark) + _crackKagerouMask + _playKagerouClimax の Beat 1/5 後に挿入。sw 419
- **タスク**: v277: カゲロウ最終バトル 2 段儀式 (Chant Ritual) 実装 — _showChantRitual + 2 テーマ (awakening/starmark) + _crackKagerouMask + _playKagerouClimax の Beat 1/5 後に挿入。sw 419
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 148
- **エラー数**: 9
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 49, "Bash": 30, "Grep": 30, "ToolSearch": 3, "Edit": 31, "Write": 3, "Agent": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-25T00:26:45Z - v276c: ノクス名の reveal タイミング修正 — ひらがな編ではセリフタグを「かめんのおとこ」に戻し、カタカナ編の魔王城で名乗るまで伏せる。memory/docs に方針明記。sw 418
- **タスク**: v276c: ノクス名の reveal タイミング修正 — ひらがな編ではセリフタグを「かめんのおとこ」に戻し、カタカナ編の魔王城で名乗るまで伏せる。memory/docs に方針明記。sw 418
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 121
- **エラー数**: 7
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 40, "Bash": 26, "Grep": 25, "ToolSearch": 1, "Edit": 27, "Write": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-25T00:21:57Z - v276b: 仮面の魔人を「ノクス」と命名。index.html のセリフ (かめんのおとこ→ノクス) / コード内コメント / STORY_OPENING_ENDING.md キャラ表・Beat 2 見出し・セリフ / project_characters memory 追加。sw 417
- **タスク**: v276b: 仮面の魔人を「ノクス」と命名。index.html のセリフ (かめんのおとこ→ノクス) / コード内コメント / STORY_OPENING_ENDING.md キャラ表・Beat 2 見出し・セリフ / project_characters memory 追加。sw 417
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 113
- **エラー数**: 6
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 39, "Bash": 24, "Grep": 25, "ToolSearch": 1, "Edit": 23, "Write": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-25T00:16:49Z - v276: カゲロウ body 補正 scale(1.38) + container 220px / ADV bustup を battle-stage 内 scoped (blur が文字に被らない) / 山道+再呪印 画像配線 / なぞりスタート+おてほんちゅう 縮小 / memory flashback caption フェード順序修正 / sw 416
- **タスク**: v276: カゲロウ body 補正 scale(1.38) + container 220px / ADV bustup を battle-stage 内 scoped (blur が文字に被らない) / 山道+再呪印 画像配線 / なぞりスタート+おてほんちゅう 縮小 / memory flashback caption フェード順序修正 / sw 416
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 87
- **エラー数**: 5
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 36, "Bash": 21, "Grep": 19, "ToolSearch": 1, "Edit": 10}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-24T23:22:06Z - v275: カゲロウ idle再マッピング+サイズ200px+炎ブレス flip修正/ ADV風バストアップ会話オーバーレイ新設/ memory flashback slow zoom+captions/ 仮面の男キャプション撤去/ ピクシー戦闘表示縮小/ sw 415
- **タスク**: v275: カゲロウ idle再マッピング+サイズ200px+炎ブレス flip修正/ ADV風バストアップ会話オーバーレイ新設/ memory flashback slow zoom+captions/ 仮面の男キャプション撤去/ ピクシー戦闘表示縮小/ sw 415
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 209
- **エラー数**: 9
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 56, "Grep": 28, "Read": 63, "Edit": 54, "Agent": 5, "ToolSearch": 1, "Write": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


