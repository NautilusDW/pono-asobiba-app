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
- **Babble Voice System (Quizland)**: [memory/feature_babble_voice.md](memory/feature_babble_voice.md) — フクロウ博士のしゃべり声 (タイピング + Web Audio 合成)。owl preset = 年配おじいさん風、5母音フォルマント切替、6.2Hz ビブラート。`js/quizland-babble.js` + `quizland/index.html` の `setHakaseDialogue` 改修。キャラ別 preset 拡張ポイント (pono / hedgehog 将来用)
- **Quizland Opening Cinematic**: [memory/feature_quizland_opening.md](memory/feature_quizland_opening.md) — 6 パネル導入演出 (Ken Burns ドリー + ナレーション + 博士⇄ポノ会話 + babble + スキップ)。mode-btn → `playOpeningCinematic()` → `initGame()` の async 経路。仮素材は `OP_BG.png` 共有、本素材は `tmp/quizland-op-cinematic/CODEX-PROMPT.md` 経由で Codex に依頼
- **Audio Volume Balance (app-wide)**: [memory/feature_audio_balance.md](memory/feature_audio_balance.md) — 全ゲーム共通の音量基準 (BGM 0.25 / SFX 0.45 / シネマナレ 0.65 + BGM ダック / babble・TTS 据え置き)。新ゲーム追加・改修時はこの値に合わせる。`createMediaElementSource` リーク防止と `finally` 一括復帰の実装パターン記載

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

### 2026-05-07T06:31:04Z - quizland: クイズスタート タイトルカード追加 (フクロウ博士+「なぞなぞスタート!!」、シネマ後 initGame 直前に 2.2s 表示、tap-to-skip)。並列 asset(WebP 84.9%削減) + impl エージェント、cross-review SHIP判定、sw 825→826
- **タスク**: quizland: クイズスタート タイトルカード追加 (フクロウ博士+「なぞなぞスタート!!」、シネマ後 initGame 直前に 2.2s 表示、tap-to-skip)。並列 asset(WebP 84.9%削減) + impl エージェント、cross-review SHIP判定、sw 825→826
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 113
- **エラー数**: 17
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 52, "Read": 13, "Grep": 3, "ToolSearch": 1, "Agent": 26, "Write": 2, "Edit": 16}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-07T06:28:21Z - Quizland: Quiz Start title card overlay (HTML/CSS/JS/preload/hook) between cinematic and initGame, tap-to-skip
- **タスク**: Quizland: Quiz Start title card overlay (HTML/CSS/JS/preload/hook) between cinematic and initGame, tap-to-skip
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 107
- **エラー数**: 15
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 49, "Read": 13, "Grep": 3, "ToolSearch": 1, "Agent": 25, "Write": 2, "Edit": 14}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-07T04:02:30Z - アプリ全体の音楽ボリュームバランス統一: BGM 全 15 ゲーム 0.25 統一 (0.06-0.45→0.25)、SFX 0.6→0.45、シネマナレ 0.65 + BGM ダック (finally で全パス restore + Web Audio ノード disconnect)、sw 824→825。並列 discovery+impl A/B+review+fix-up エージェント運用
- **タスク**: アプリ全体の音楽ボリュームバランス統一: BGM 全 15 ゲーム 0.25 統一 (0.06-0.45→0.25)、SFX 0.6→0.45、シネマナレ 0.65 + BGM ダック (finally で全パス restore + Web Audio ノード disconnect)、sw 824→825。並列 discovery+impl A/B+review+fix-up エージェント運用
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 93
- **エラー数**: 14
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 43, "Read": 11, "Grep": 3, "ToolSearch": 1, "Agent": 23, "Write": 1, "Edit": 11}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-07T03:56:41Z - audio polish: SFX 0.6→0.45 (quizland+maze), narration gain 0.65 + BGM duck (quizland OP cinematic)
- **タスク**: audio polish: SFX 0.6→0.45 (quizland+maze), narration gain 0.65 + BGM duck (quizland OP cinematic)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 85
- **エラー数**: 12
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 38, "Read": 11, "Grep": 3, "ToolSearch": 1, "Agent": 21, "Write": 1, "Edit": 10}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-07T03:43:38Z - quizland オープニング 3回目フィードバック: Panel 1 シャープ化 (ブラー除去), Panel 2-6 を新規屋内画 OP_BG02.webp (97.7%削減) に切替+ブラー継続, 会話UI 2x (font/padding/min-height), per-panel bg+blur 切替時 1frame flash 防止 (offsetWidth flush), モバイル overlap 防止調整, sw 823→824
- **タスク**: quizland オープニング 3回目フィードバック: Panel 1 シャープ化 (ブラー除去), Panel 2-6 を新規屋内画 OP_BG02.webp (97.7%削減) に切替+ブラー継続, 会話UI 2x (font/padding/min-height), per-panel bg+blur 切替時 1frame flash 防止 (offsetWidth flush), モバイル overlap 防止調整, sw 823→824
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 82
- **エラー数**: 11
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 38, "Read": 11, "Grep": 3, "ToolSearch": 1, "Agent": 18, "Write": 1, "Edit": 10}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-07T03:30:26Z - quizland オープニング 2回目フィードバック反映: WebP化-92%/プリロード+フェードイン/ナレ1.5s遅延/2セグ分割+新文言+大型化/固定ブラー全パネル/4:3セーフエリア+短尺audio防御。並列で asset+impl エージェント、クロスレビューで MAJOR 2 件即修正。sw 822→823
- **タスク**: quizland オープニング 2回目フィードバック反映: WebP化-92%/プリロード+フェードイン/ナレ1.5s遅延/2セグ分割+新文言+大型化/固定ブラー全パネル/4:3セーフエリア+短尺audio防御。並列で asset+impl エージェント、クロスレビューで MAJOR 2 件即修正。sw 822→823
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 69
- **エラー数**: 9
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 32, "Read": 10, "Grep": 3, "ToolSearch": 1, "Agent": 14, "Write": 1, "Edit": 8}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-07T03:10:13Z - quizland オープニング フィードバック反映: Pono 実アセット 5 枚切替+プリロード, パネル 2-6 背景 scenic-blur (scale 1.18 + blur 6px), 会話テンポ 700→2000ms, 吹き出し左右スワップ (Pono 左/博士 右), img width:auto, sw 821→822
- **タスク**: quizland オープニング フィードバック反映: Pono 実アセット 5 枚切替+プリロード, パネル 2-6 背景 scenic-blur (scale 1.18 + blur 6px), 会話テンポ 700→2000ms, 吹き出し左右スワップ (Pono 左/博士 右), img width:auto, sw 821→822
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 56
- **エラー数**: 7
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 26, "Read": 10, "Grep": 3, "ToolSearch": 1, "Agent": 10, "Write": 1, "Edit": 5}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-07T02:46:22Z - quizland なぞなぞオープニング 6 パネル導入演出を追加 (Ken Burns ドリー + OP_NA ナレーション + 博士⇄ポノ babble 会話 + スキップ可)。並列エージェント実装→クロスレビュー→MAJOR 5件即修正→commit auto-push でstaging
- **タスク**: quizland なぞなぞオープニング 6 パネル導入演出を追加 (Ken Burns ドリー + OP_NA ナレーション + 博士⇄ポノ babble 会話 + スキップ可)。並列エージェント実装→クロスレビュー→MAJOR 5件即修正→commit auto-push でstaging
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 42
- **エラー数**: 6
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 20, "Read": 9, "Grep": 3, "ToolSearch": 1, "Agent": 6, "Write": 1, "Edit": 2}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-07T02:43:06Z - quizland OP cinematic 5 review fixes (re-entry guard, hoist DOM lookups, iOS audio via audioCtx, idempotent finish() cleanup, skipBtn focus)
- **タスク**: quizland OP cinematic 5 review fixes (re-entry guard, hoist DOM lookups, iOS audio via audioCtx, idempotent finish() cleanup, skipBtn focus)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 27
- **エラー数**: 4
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 9, "Read": 8, "Grep": 3, "ToolSearch": 1, "Agent": 6}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


