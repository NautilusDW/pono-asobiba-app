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

### 2026-04-18T14:27:43Z - 破片生成を放射状亀裂パターン(Voronoi風)に書き換え: 衝撃点起点の楔+同心リングで20-50個の不規則ポリゴン
- **タスク**: 破片生成を放射状亀裂パターン(Voronoi風)に書き換え: 衝撃点起点の楔+同心リングで20-50個の不規則ポリゴン
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 32
- **エラー数**: 6
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"ToolSearch": 1, "WebSearch": 5, "WebFetch": 3, "Agent": 3, "Write": 2, "ExitPlanMode": 1, "Read": 6, "Edit": 9, "Bash": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-18T14:20:18Z - Three.js による文字BOX破壊演出プロトタイプ (writing 1文字完了時) 実装
- **タスク**: Three.js による文字BOX破壊演出プロトタイプ (writing 1文字完了時) 実装
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 28
- **エラー数**: 6
- **検出された良いパターン**: 編集前にファイルを読んで理解した, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"ToolSearch": 1, "WebSearch": 5, "WebFetch": 3, "Agent": 3, "Write": 2, "ExitPlanMode": 1, "Read": 5, "Edit": 7, "Bash": 1}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-18T09:28:44Z - writing: portraitLock を無効化。PCで縦長ブラウザウィンドウだと '横にしてね' 誤発火していた (portraitレイアウトは整備済み)
- **タスク**: writing: portraitLock を無効化。PCで縦長ブラウザウィンドウだと '横にしてね' 誤発火していた (portraitレイアウトは整備済み)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 15
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 39, "Edit": 134, "Grep": 121, "Read": 174, "Write": 8, "Agent": 2, "ToolSearch": 9, "ExitPlanMode": 3, "Glob": 9, "ScheduleWakeup": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 3個の非効率パターンあり。


### 2026-04-18T09:13:13Z - oto: CSS cascade バグ修正 (landscape @media ブロックを base rules の後ろに移動)、portrait speed-btn white-space nowrap、writing word-card を canvas外に配置
- **タスク**: oto: CSS cascade バグ修正 (landscape @media ブロックを base rules の後ろに移動)、portrait speed-btn white-space nowrap、writing word-card を canvas外に配置
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 16
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 141, "Write": 8, "Read": 173, "Bash": 39, "Grep": 116, "Agent": 2, "ToolSearch": 9, "ExitPlanMode": 3, "Glob": 8, "ScheduleWakeup": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 3個の非効率パターンあり。


### 2026-04-18T08:47:10Z - writing: チュートリアルと完了モーダルが救出演出と被る問題を修正（モーダル→上部バナー化、完了オーバーレイ/ワードカードを2.4秒後に遅延）
- **タスク**: writing: チュートリアルと完了モーダルが救出演出と被る問題を修正（モーダル→上部バナー化、完了オーバーレイ/ワードカードを2.4秒後に遅延）
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 16
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 169, "Grep": 118, "Bash": 41, "Write": 9, "Edit": 140, "Agent": 2, "ToolSearch": 9, "ExitPlanMode": 3, "Glob": 8, "ScheduleWakeup": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-18T08:26:26Z - writing: 妖精救出ナラティブ導入 + キャンバス割れ演出 (悪役👾 + 破片8枚 + クラック+フラッシュ)
- **タスク**: writing: 妖精救出ナラティブ導入 + キャンバス割れ演出 (悪役👾 + 破片8枚 + クラック+フラッシュ)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 17
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 163, "Edit": 142, "Bash": 44, "Glob": 12, "Grep": 115, "Write": 9, "Agent": 2, "ToolSearch": 9, "ExitPlanMode": 3, "ScheduleWakeup": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-18T08:02:58Z - oto音タッチのレイアウト修正: 縦の楕円復活と横画面の左パネル整理
- **タスク**: oto音タッチのレイアウト修正: 縦の楕円復活と横画面の左パネル整理
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 16
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 48, "Grep": 113, "Read": 165, "Edit": 143, "Glob": 12, "Write": 8, "Agent": 1, "ToolSearch": 7, "ExitPlanMode": 2, "ScheduleWakeup": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-18T07:55:56Z - writing モンスター再設計: 右下覗き込み配置、吹き出し(招き入れ→お礼→退場)、🌰ドロップ演出、初回チュートリアル
- **タスク**: writing モンスター再設計: 右下覗き込み配置、吹き出し(招き入れ→お礼→退場)、🌰ドロップ演出、初回チュートリアル
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 19
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Grep": 117, "Read": 164, "Bash": 48, "Edit": 140, "Glob": 12, "Write": 8, "Agent": 1, "ToolSearch": 7, "ExitPlanMode": 2, "ScheduleWakeup": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-17T17:38:18Z - writing: どんぐり+モンスター演出、oto横向きレイアウト、admin 2タブ追加、全ゲームへどんぐり統合、play.html バッジ表示
- **タスク**: writing: どんぐり+モンスター演出、oto横向きレイアウト、admin 2タブ追加、全ゲームへどんぐり統合、play.html バッジ表示
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 439
- **エラー数**: 20
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 138, "Glob": 10, "Grep": 122, "Bash": 37, "ToolSearch": 5, "Edit": 119, "Write": 6, "Agent": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


