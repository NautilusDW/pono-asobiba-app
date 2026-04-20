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

### 2026-04-20T05:51:53Z - battle v233: 戦闘UIを単一ドラクエ風ログに統合 + per-stroke soft additive glow (screen blend + blur) に置換
- **タスク**: battle v233: 戦闘UIを単一ドラクエ風ログに統合 + per-stroke soft additive glow (screen blend + blur) に置換
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 11
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 120, "Read": 144, "Edit": 132, "Agent": 7, "ToolSearch": 10, "Monitor": 2, "TaskStop": 1, "Grep": 75, "Write": 5, "ExitPlanMode": 4}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-20T05:46:24Z - 2D横スクロール背景エディタ作成 (tools/bg-editor.html + common/parallax.js + bg-editor-demo.html): 多重視差スクロール対応、tile/spritesモード、IDB保存、JSONエクスポート、ランタイムローダ、CSP/XSS/traversal対策込み
- **タスク**: 2D横スクロール背景エディタ作成 (tools/bg-editor.html + common/parallax.js + bg-editor-demo.html): 多重視差スクロール対応、tile/spritesモード、IDB保存、JSONエクスポート、ランタイムローダ、CSP/XSS/traversal対策込み
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 51
- **エラー数**: 3
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 6, "Write": 4, "ToolSearch": 2, "Edit": 26, "ExitPlanMode": 1, "Bash": 8, "Read": 4}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 3個の非効率パターンあり。


### 2026-04-20T05:05:08Z - battle v231: 炎動画差替 + シャキーン演出 + 敵攻撃告知 + 撃破ウィンドウ恒久化バグ修正
- **タスク**: battle v231: 炎動画差替 + シャキーン演出 + 敵攻撃告知 + 撃破ウィンドウ恒久化バグ修正
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 13
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Monitor": 5, "Bash": 132, "Grep": 75, "Edit": 132, "Read": 129, "ToolSearch": 10, "Agent": 7, "TaskStop": 1, "Write": 5, "ExitPlanMode": 4}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-20T04:45:50Z - battle v230: バトル導入モーダル刷新 + ポノ/ハリネズミを戦闘中は非表示 + 攻撃プランを通常3魔法2に固定 + 炎属性ハードコード
- **タスク**: battle v230: バトル導入モーダル刷新 + ポノ/ハリネズミを戦闘中は非表示 + 攻撃プランを通常3魔法2に固定 + 炎属性ハードコード
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 14
- **検出された良いパターン**: テストを先に書いてから実装した (TDD), 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: テストを先に書いてから実装した (TDD), 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 142, "Read": 123, "ToolSearch": 14, "Edit": 126, "Write": 6, "Monitor": 6, "TaskOutput": 1, "TaskStop": 3, "Grep": 68, "Agent": 7, "ExitPlanMode": 4}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-20T04:33:18Z - 魔法攻撃を「手前→奥へ飛ぶ光球+着弾破裂」に置換 (色味は行属性連動 fire/ice/thunder/light/...)、Unity ハイブリッド方針(案②) を project memory に保存 (v229)
- **タスク**: 魔法攻撃を「手前→奥へ飛ぶ光球+着弾破裂」に置換 (色味は行属性連動 fire/ice/thunder/light/...)、Unity ハイブリッド方針(案②) を project memory に保存 (v229)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 15
- **検出された良いパターン**: テストを先に書いてから実装した (TDD), 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: テストを先に書いてから実装した (TDD), 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 153, "Read": 118, "Edit": 127, "Grep": 62, "ToolSearch": 13, "Write": 6, "Monitor": 6, "TaskOutput": 1, "TaskStop": 3, "Agent": 7, "ExitPlanMode": 4}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-20T03:11:43Z - バトル: word モーダル/音声削除、魔法攻撃を spell_*.mp4 の screen 合成に、敵反撃タイミング&ダメージ表示を延長 (v228)
- **タスク**: バトル: word モーダル/音声削除、魔法攻撃を spell_*.mp4 の screen 合成に、敵反撃タイミング&ダメージ表示を延長 (v228)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 14
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Grep": 72, "Bash": 158, "Read": 113, "Write": 6, "ToolSearch": 14, "ExitPlanMode": 5, "Edit": 115, "Monitor": 6, "TaskOutput": 1, "TaskStop": 3, "Agent": 7}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-20T03:01:38Z - あ行選択→ワールドマップ探索→モンスター衝突→戦闘突入フローを writing/index.html に実装 (v227)
- **タスク**: あ行選択→ワールドマップ探索→モンスター衝突→戦闘突入フローを writing/index.html に実装 (v227)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 14
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Grep": 68, "ToolSearch": 15, "Write": 9, "Bash": 166, "Edit": 113, "Read": 104, "Agent": 10, "ExitPlanMode": 5, "Monitor": 6, "TaskOutput": 1, "TaskStop": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-20T00:58:14Z - ドラクエ風バトルステージ基盤(DOM/CSS/制御関数)実装・配線は次ステップ
- **タスク**: ドラクエ風バトルステージ基盤(DOM/CSS/制御関数)実装・配線は次ステップ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 27
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Grep": 66, "Read": 104, "Edit": 99, "Bash": 166, "Glob": 1, "Write": 16, "ToolSearch": 16, "ExitPlanMode": 6, "Skill": 1, "WebSearch": 5, "Agent": 10, "Monitor": 6, "TaskOutput": 1, "TaskStop": 3}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-20T00:41:13Z - writing: マップ/戦闘 BGM 4本導入 + setBgmFor 切替構造
- **タスク**: writing: マップ/戦闘 BGM 4本導入 + setBgmFor 切替構造
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 27
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 101, "Read": 108, "Bash": 160, "Grep": 70, "Glob": 1, "Write": 15, "ToolSearch": 15, "ExitPlanMode": 5, "Skill": 1, "WebSearch": 5, "Agent": 9, "Monitor": 6, "TaskOutput": 1, "TaskStop": 3}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


