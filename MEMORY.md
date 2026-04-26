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

### 2026-04-26T01:26:38Z - v278n: 6 件追補 — 妖精 bottom 16% に下げ、フル画面 battle-stage を translateY(-8vh)、妖精サイズを Hinoka に統一、launchMagicProjectile に targetEl opt 追加で heal を Hinoka slot へ、懇願シーンを battle_last_01 + memory_04 の紙芝居に、ノクス caption ひらがな化。sw 445
- **タスク**: v278n: 6 件追補 — 妖精 bottom 16% に下げ、フル画面 battle-stage を translateY(-8vh)、妖精サイズを Hinoka に統一、launchMagicProjectile に targetEl opt 追加で heal を Hinoka slot へ、懇願シーンを battle_last_01 + memory_04 の紙芝居に、ノクス caption ひらがな化。sw 445
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 285
- **エラー数**: 11
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 76, "Grep": 60, "Bash": 68, "Edit": 70, "Glob": 5, "Agent": 2, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-26T01:17:48Z - v278m: カゲロウ攻撃アニメ刷新 — imgAttackStrike を atk_2 に、kagerou-pose-atk2 で flip+scale 1.38 統一、idle を imgFireBreath として温存し C1 HP 全回復時に発火、火山 intro で 12 枚 prefetch。sw 444
- **タスク**: v278m: カゲロウ攻撃アニメ刷新 — imgAttackStrike を atk_2 に、kagerou-pose-atk2 で flip+scale 1.38 統一、idle を imgFireBreath として温存し C1 HP 全回復時に発火、火山 intro で 12 枚 prefetch。sw 444
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 259
- **エラー数**: 11
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 70, "Grep": 53, "Bash": 64, "Edit": 61, "Glob": 5, "Agent": 2, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-26T01:04:45Z - v278l: 山道 → カゲロウ登場 overlay 切替時にバトル画面が一瞬見える問題を修正。常駐黒幕 (#volcanoIntroBackdrop, z:1800) を火山ボス intro 開始時に貼り、Kagerou overlay の onDone で fade out → 撤去。sw 443
- **タスク**: v278l: 山道 → カゲロウ登場 overlay 切替時にバトル画面が一瞬見える問題を修正。常駐黒幕 (#volcanoIntroBackdrop, z:1800) を火山ボス intro 開始時に貼り、Kagerou overlay の onDone で fade out → 撤去。sw 443
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 230
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 62, "Grep": 48, "Bash": 57, "Edit": 52, "Glob": 5, "Agent": 2, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-26T00:59:22Z - v278k: 妖精パーティーを 1 キャラ分右 + 勇者足元レベルに移動。.party-fairies の left/bottom を 2.5%/20% → 6%/30% に。row-reverse の flex 親から自動的に riefa/serina も同様にシフト。sw 442
- **タスク**: v278k: 妖精パーティーを 1 キャラ分右 + 勇者足元レベルに移動。.party-fairies の left/bottom を 2.5%/20% → 6%/30% に。row-reverse の flex 親から自動的に riefa/serina も同様にシフト。sw 442
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 221
- **エラー数**: 9
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 60, "Grep": 47, "Bash": 54, "Edit": 49, "Glob": 5, "Agent": 2, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-26T00:38:02Z - v278j: 妖精 3 人の見せ場拡張 — Serina 足止め (B3.5 frozen-feet 永続化)、Riefa 風魔法合体 (B3.7 宣言 + B4 chant 内 windBoost 視覚)、Riefa 回復魔法見せ場 (B4.3 カゲロウ反撃 + B4.6 heal projectile)、_healFairy ヘルパー、frozen-feet を C1 で「闇の力で破壊」演出として解除。CSS フォールバック付き、画像支給を待たずに動作。sw 441
- **タスク**: v278j: 妖精 3 人の見せ場拡張 — Serina 足止め (B3.5 frozen-feet 永続化)、Riefa 風魔法合体 (B3.7 宣言 + B4 chant 内 windBoost 視覚)、Riefa 回復魔法見せ場 (B4.3 カゲロウ反撃 + B4.6 heal projectile)、_healFairy ヘルパー、frozen-feet を C1 で「闇の力で破壊」演出として解除。CSS フォールバック付き、画像支給を待たずに動作。sw 441
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 215
- **エラー数**: 9
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 59, "Grep": 47, "Bash": 52, "Edit": 46, "Glob": 5, "Agent": 2, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-26T00:06:14Z - v278i: 4件追補 — ヒノカ認識セリフ→ゴゴゴ間の全画面継続、ヒノカ位置を勇者左下に、60%スケール、float アニメ、in-battle のみ pixel art (hinoka_pixel_front.png) に差替 (onerror で hi-res にフォールバック)。sw 440
- **タスク**: v278i: 4件追補 — ヒノカ認識セリフ→ゴゴゴ間の全画面継続、ヒノカ位置を勇者左下に、60%スケール、float アニメ、in-battle のみ pixel art (hinoka_pixel_front.png) に差替 (onerror で hi-res にフォールバック)。sw 440
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 181
- **エラー数**: 7
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 49, "Grep": 47, "Bash": 42, "Edit": 38, "Glob": 5}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-25T23:44:17Z - v278h: 5件追補 — おてほん/なぞりスタートを noFullscreen で全画面 skip、妖精パーティーをフル画面時のみ勇者左下に斜め階段隊形、氷魔法投射 (launchMagicProjectile) でカゲロウ無効化演出、_hideBustups の race fix で Hinoka portrait 維持、chant ritual canvas を flex center に。sw 439
- **タスク**: v278h: 5件追補 — おてほん/なぞりスタートを noFullscreen で全画面 skip、妖精パーティーをフル画面時のみ勇者左下に斜め階段隊形、氷魔法投射 (launchMagicProjectile) でカゲロウ無効化演出、_hideBustups の race fix で Hinoka portrait 維持、chant ritual canvas を flex center に。sw 439
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 163
- **エラー数**: 6
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 48, "Grep": 46, "Bash": 34, "Edit": 30, "Glob": 5}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


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


