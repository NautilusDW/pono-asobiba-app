# MEMORY.md - Self-Evolving Framework Knowledge Base

## Framework Statistics

- 初期化日: 2026-02-25
- 総タスク数: 19+
- 成功率: 100%
- 詳細履歴: [memory/task-history.md](memory/task-history.md)
- **部屋アイソメ引き継ぎ**: [memory/room-isometric-handoff.md](memory/room-isometric-handoff.md) — CSS mask未動作・17MB画像問題・巾木JS上書き問題
- **水族館エンハンス完了**: [memory/aquarium-enhancement-complete.md](memory/aquarium-enhancement-complete.md) — Phase1+2完了、Phase3見送り、卵育て構想
- **水族館UXフィードバック**: [memory/feedback_aquarium_ux.md](memory/feedback_aquarium_ux.md) — 矢印シンプル・ブースト大胆・音柔らか・複雑さ排除
- **デプロイ自動化 (Cloudflare Workers)**: [memory/feedback_auto_push.md](memory/feedback_auto_push.md) — post-commit で develop 自動 push → GitHub Actions が `wrangler deploy --env staging`
- **Umamiアナリティクス**: [memory/reference_umami.md](memory/reference_umami.md) — Umami Cloud設定情報
- **文字書きシンプルモード復活 Phase 1 + UIリデザイン**: [memory/feature_writing_simple_mode.md](memory/feature_writing_simple_mode.md) — RPG化前のロジックを `writing/simple.html` として復活、左右分割レイアウト・RPGダークテーマ統一・妖精2体fixed常駐応援、Phase 2 (行選択+単語フェーズ) は未実装
- **迷路 画像ステージ Phase 1**: [memory/feature_maze_image_stage.md](memory/feature_maze_image_stage.md) — `?image=<name>` でAI生成画像背景+ポリライン歩行+カメラ追従。横画面前提。Phase 2 (エディタ・細線化) 未着手
- **迷路ラフ作成ツール**: [memory/feature_maze_rough_maker.md](memory/feature_maze_rough_maker.md) — `tools/maze-rough.html` で 32×18 タイルラフを描いて PNG 出力 → 生成 AI に「道の形を守って絵本風に」と一緒に渡すワークフロー
- **クリーンエッジスタジオ タイムライン再生**: [memory/feature_timeline_player.md](memory/feature_timeline_player.md) — 分割スプライトをID連番順に並べてFPS+各コマフレーム数で即時再生。スプライトカードはサムネドラッグで並び替え可、🎯ボタンで比較タブの元矩形にジャンプ
- **Layout System (`common/layout/`)**: [memory/reference_layout_system.md](memory/reference_layout_system.md) — WYSIWYG レイアウトエディタ + applier 共通モジュール。`LayoutSystem.init()` 4 行で opt-in、`?edit=1` でエディタ遅延ロード。ページ author docs は `common/layout/README.md`

---

## Key Learnings

### 🚨🚨🚨 デプロイ手順 (Cloudflare Workers) 🚨🚨🚨

> **このプロジェクトは Cloudflare Workers で配信されている。Netlify は完全廃止済み。**
> Netlify という単語は二度と出さない (古いメモリ・ハンドオフドキュメントは過去のもの)。

#### 自動化フロー (develop)
1. `.git/hooks/post-commit` が develop ブランチで `git push origin develop` を実行 (バックグラウンド・flock ガード付き)
2. GitHub Actions (`.github/workflows/deploy.yml`) が `wrangler deploy --env staging` を実行
3. 数十秒で `https://pono-asobiba-staging.ndw.workers.dev/` に反映される

→ `git commit` するだけで staging に反映。Claude 側で `wrangler deploy` を手動実行する必要なし。

#### ブランチ運用ルール（厳守）
- **develop** = 開発・確認用。常用ブランチ。staging に自動反映
- **master** = 本番。ユーザーが「**本番にデプロイして**」と明示した時だけマージ
- **絶対に勝手に master へマージ・本番デプロイしない**

| ブランチ | 環境 | URL | 反映方法 |
|---------|------|-----|----------|
| develop | staging | `https://pono-asobiba-staging.ndw.workers.dev/` | commit → 自動 push → GH Actions |
| master  | production | `https://pono.kodama-no-mori.com/` (および `pono-asobiba-app.ndw.workers.dev`) | ユーザー明示指示時のみ手動 merge |

#### 本番反映時（ユーザー明示指示時のみ）
```
git checkout master && git merge develop && git push origin master
# → GH Actions が wrangler deploy (production) を実行
git checkout develop
```

#### 緊急時の手動デプロイ (GH Actions 死亡時のみ)
```
wrangler deploy --env staging   # develop 内容を staging に
wrangler deploy                  # master 内容を production に
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

### 2026-05-06T16:34:26Z - quizland editor: textOnly preset 保存が withImage chip illust 個別 entry を消すクロス汚染を修正、 result modal 経路調査
- **タスク**: quizland editor: textOnly preset 保存が withImage chip illust 個別 entry を消すクロス汚染を修正、 result modal 経路調査
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 30
- **エラー数**: 3
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 5, "Agent": 11, "ToolSearch": 1, "Bash": 12, "Edit": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-06T16:10:41Z - quizland editor mode で完走時リザルトモーダルを抑止し先頭ループに変更 (sw v783)
- **タスク**: quizland editor mode で完走時リザルトモーダルを抑止し先頭ループに変更 (sw v783)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 18
- **エラー数**: 0
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた
- **ツール使用統計**: {"Read": 5, "Agent": 7, "ToolSearch": 1, "Bash": 4, "Edit": 1}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-06T15:55:58Z - quizland chip preset を 4 slot 別構造に拡張 (Phase 1)。エージェントチームで planner→implementer→code-reviewer+要件適合性レビュー→HIGH 修正の流れをクロスレビュー込で完遂
- **タスク**: quizland chip preset を 4 slot 別構造に拡張 (Phase 1)。エージェントチームで planner→implementer→code-reviewer+要件適合性レビュー→HIGH 修正の流れをクロスレビュー込で完遂
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 10
- **エラー数**: 0
- **検出された良いパターン**: なし
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 特になし
- **ツール使用統計**: {"Read": 2, "Agent": 5, "ToolSearch": 1, "Bash": 2}
- **サマリ**: 成功タスク: 0個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-06T15:55:03Z - code review HIGH 2件修正: _normalizeChipPresets を純粋関数化 + _findChipSlot を answer-panel スコープに限定、 sw v782
- **タスク**: code review HIGH 2件修正: _normalizeChipPresets を純粋関数化 + _findChipSlot を answer-panel スコープに限定、 sw v782
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 8
- **エラー数**: 0
- **検出された良いパターン**: なし
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 特になし
- **ツール使用統計**: {"Read": 2, "Agent": 5, "ToolSearch": 1}
- **サマリ**: 成功タスク: 0個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-06T15:48:19Z - quizland chip preset を 4-slot (0/1/2/3) 構造に拡張: applier に _normalizeChipPresets 追加(deep clone)、 editor で saveChipPreset/clearChipOverridesForType を slot 単位で動作化、 数値パネルの preset 表示も slot 別ネスト + max-height/scroll、 sw v781
- **タスク**: quizland chip preset を 4-slot (0/1/2/3) 構造に拡張: applier に _normalizeChipPresets 追加(deep clone)、 editor で saveChipPreset/clearChipOverridesForType を slot 単位で動作化、 数値パネルの preset 表示も slot 別ネスト + max-height/scroll、 sw v781
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 4
- **エラー数**: 0
- **検出された良いパターン**: なし
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 特になし
- **ツール使用統計**: {"Read": 2, "Agent": 2}
- **サマリ**: 成功タスク: 0個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-06T14:14:42Z - chip preset 保存バグ修正 (saveChipPreset/clearChipOverridesForType に DOM→_currentLayoutData 同期を追加、 sw.js CACHE_VERSION 779→780)
- **タスク**: chip preset 保存バグ修正 (saveChipPreset/clearChipOverridesForType に DOM→_currentLayoutData 同期を追加、 sw.js CACHE_VERSION 779→780)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 31
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 119, "Bash": 183, "Edit": 140, "Grep": 26, "Write": 8, "Agent": 16, "ToolSearch": 2, "Glob": 4, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-06T13:59:02Z - batch:07 Codex followup md を user レビュー反映で 14 件確定 (#1 chewing_teeth → tongue 修正、 #4 普段着、 #8 大型動物のみ、 #15 削除) → push 済
- **タスク**: batch:07 Codex followup md を user レビュー反映で 14 件確定 (#1 chewing_teeth → tongue 修正、 #4 普段着、 #8 大型動物のみ、 #15 削除) → push 済
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 32
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 179, "Read": 132, "Edit": 135, "Grep": 25, "Write": 8, "Agent": 13, "ToolSearch": 2, "Glob": 4, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-06T12:56:37Z - code review HIGH 指摘 (clearChipOverridesForType で .chip|N を削除する prefixCoverage バグ) を即座に追修正、 sw v778 で push
- **タスク**: code review HIGH 指摘 (clearChipOverridesForType で .chip|N を削除する prefixCoverage バグ) を即座に追修正、 sw v778 で push
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 34
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 141, "Write": 8, "Bash": 165, "Edit": 144, "Grep": 25, "Agent": 12, "ToolSearch": 2, "Glob": 3}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-06T12:35:11Z - chip preset から chip.tx/ty を除外、 他 chip が飛ぶアーキテクチャ的バグを根治 (preset = 子要素配置 + chip.w/h のみ、 chip 自体の cell 配置は個別 entry に分離)
- **タスク**: chip preset から chip.tx/ty を除外、 他 chip が飛ぶアーキテクチャ的バグを根治 (preset = 子要素配置 + chip.w/h のみ、 chip 自体の cell 配置は個別 entry に分離)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 36
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 164, "Edit": 144, "Read": 145, "Write": 8, "Grep": 25, "Agent": 11, "ToolSearch": 2, "Glob": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


