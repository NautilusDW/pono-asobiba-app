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

### 2026-04-23T13:45:00Z - storyboard generator logs の pono 汚染クリーンアップ (action_log.jsonl + .bak × 211 削除、一時スクリプト撤収)
- **タスク**: storyboard generator logs の pono 汚染クリーンアップ (action_log.jsonl + .bak × 211 削除、一時スクリプト撤収)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 72
- **エラー数**: 8
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 42, "Grep": 14, "Read": 11, "Edit": 3, "Write": 2}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-23T13:34:40Z - ルートフォルダリネーム後の残存参照クリーンアップ (_*_import.py 削除 + 旧パスallow削除 + orchestrator.py/settings.jsonの別プロジェクト参照修正)
- **タスク**: ルートフォルダリネーム後の残存参照クリーンアップ (_*_import.py 削除 + 旧パスallow削除 + orchestrator.py/settings.jsonの別プロジェクト参照修正)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 37
- **エラー数**: 4
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 12, "Grep": 14, "Read": 8, "Edit": 3}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-23T11:49:49Z - セッション終了: デプロイ状況確認 (本番 pono.kodama-no-mori.com / staging / auto-deploy パイプライン全て稼働中を検証)
- **タスク**: セッション終了: デプロイ状況確認 (本番 pono.kodama-no-mori.com / staging / auto-deploy パイプライン全て稼働中を検証)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 27
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Grep": 53, "Read": 96, "Edit": 139, "Bash": 189, "Agent": 10, "ToolSearch": 4, "Write": 7, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-23T11:44:03Z - staging/prod 環境分離 + 独自ドメイン kodama-no-mori.com 取得 + pono.kodama-no-mori.com 本番接続 + auto-commit→auto-push→auto-deploy の完全自動化 + pre-commit 機密ガード + post-commit flock ガード
- **タスク**: staging/prod 環境分離 + 独自ドメイン kodama-no-mori.com 取得 + pono.kodama-no-mori.com 本番接続 + auto-commit→auto-push→auto-deploy の完全自動化 + pre-commit 機密ガード + post-commit flock ガード
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 27
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 98, "Edit": 143, "Grep": 53, "Bash": 183, "Agent": 10, "ToolSearch": 4, "Write": 7, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-23T10:57:28Z - GitHub Actions 自動デプロイ稼働確認 (Secrets 登録 + workflow_dispatch で deploy 成功)
- **タスク**: GitHub Actions 自動デプロイ稼働確認 (Secrets 登録 + workflow_dispatch で deploy 成功)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 19
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Edit": 153, "Grep": 71, "Read": 117, "Bash": 144, "Agent": 8, "ToolSearch": 3, "Write": 2, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-23T10:49:10Z - Cloudflare API Token の新規作成方針を決定・計画策定 (既存 2 個は残す、github-actions-deploy として新規発行)
- **タスク**: Cloudflare API Token の新規作成方針を決定・計画策定 (既存 2 個は残す、github-actions-deploy として新規発行)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 19
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 158, "Grep": 71, "Read": 117, "Bash": 139, "Agent": 8, "ToolSearch": 3, "Write": 2, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-23T10:13:49Z - GitHub Actions での Cloudflare Workers 自動デプロイ設定 (deploy.yml 作成 + push)
- **タスク**: GitHub Actions での Cloudflare Workers 自動デプロイ設定 (deploy.yml 作成 + push)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 19
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 161, "Read": 121, "ToolSearch": 3, "Grep": 72, "Bash": 132, "Agent": 8, "Write": 2, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-23T09:40:19Z - MVP\u30b9\u30b3\u30fc\u30d7\u78ba\u5b9a\u4ed6: \u30d1\u30b9\u30ef\u30fc\u30c9\u7ba1\u7406\u96c6\u7d04 (common/tier.js verifyBookPassword) / \u7d75\u672c\u5c64\u6b53\u8fce\u30e2\u30fc\u30c0\u30eb (PonoPromo.showBookWelcome) / \u8907\u6570\u679a\u30b9\u30af\u30b7\u30e7\u5bfe\u5fdc + docs/SCREENSHOT_GUIDE.md / \u304b\u305b\u304d\u306f\u3063\u304f\u3064\u3092\u30b0\u30ec\u30fc\u30a2\u30a6\u30c8\u964d\u683c
- **タスク**: MVP\u30b9\u30b3\u30fc\u30d7\u78ba\u5b9a\u4ed6: \u30d1\u30b9\u30ef\u30fc\u30c9\u7ba1\u7406\u96c6\u7d04 (common/tier.js verifyBookPassword) / \u7d75\u672c\u5c64\u6b53\u8fce\u30e2\u30fc\u30c0\u30eb (PonoPromo.showBookWelcome) / \u8907\u6570\u679a\u30b9\u30af\u30b7\u30e7\u5bfe\u5fdc + docs/SCREENSHOT_GUIDE.md / \u304b\u305b\u304d\u306f\u3063\u304f\u3064\u3092\u30b0\u30ec\u30fc\u30a2\u30a6\u30c8\u964d\u683c
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 199
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 57, "Agent": 13, "Write": 13, "Edit": 59, "ToolSearch": 6, "ExitPlanMode": 3, "Bash": 11, "Grep": 34, "Glob": 3}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-23T09:02:44Z - オープニング仕上げ: BGM 4sフェード, 同一絵トランジション省略, S2aズーム, S1b/S8レターボックス, キノコ横画面0.75x
- **タスク**: オープニング仕上げ: BGM 4sフェード, 同一絵トランジション省略, S2aズーム, S1b/S8レターボックス, キノコ横画面0.75x
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 18
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Edit": 175, "Glob": 2, "Write": 3, "Grep": 77, "Read": 119, "Bash": 118, "ToolSearch": 2, "Agent": 4}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


