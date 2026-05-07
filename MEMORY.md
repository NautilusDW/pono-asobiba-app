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

### 2026-05-07T09:31:32Z - Quizland per-Q layout Phase 2 / impl-B (formatQuizQid + LayoutApplier per-Q key + LayoutSystem qid injection + nav dirty hooks + CACHE_VERSION 832→833)
- **タスク**: Quizland per-Q layout Phase 2 / impl-B (formatQuizQid + LayoutApplier per-Q key + LayoutSystem qid injection + nav dirty hooks + CACHE_VERSION 832→833)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 9
- **エラー数**: 1
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 2, "Agent": 7}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-07T08:13:04Z - quizland: 多解像度対応 - 4:3 letterbox 厳格化 + 会話/ナレボックス固定化 + キャラを width 基準 + clip-path inset(N% bottom) で waist-shot (横切り禁止) + (min-aspect-ratio 16/10) と max-width 540 のメディアクエリ + _opTypeInto 自動スクロール、sw 830→832
- **タスク**: quizland: 多解像度対応 - 4:3 letterbox 厳格化 + 会話/ナレボックス固定化 + キャラを width 基準 + clip-path inset(N% bottom) で waist-shot (横切り禁止) + (min-aspect-ratio 16/10) と max-width 540 のメディアクエリ + _opTypeInto 自動スクロール、sw 830→832
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 152
- **エラー数**: 25
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 68, "Read": 15, "Grep": 3, "ToolSearch": 1, "Agent": 38, "Write": 2, "Edit": 25}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-07T07:39:29Z - quizland 次へ/前へで保存レイアウトが巻き戻るバグ修正: LayoutEditor に refreshCurrentFromLocal を追加し、renderChoices で apply 前に localStorage 最新値で _currentLayoutData を更新
- **タスク**: quizland 次へ/前へで保存レイアウトが巻き戻るバグ修正: LayoutEditor に refreshCurrentFromLocal を追加し、renderChoices で apply 前に localStorage 最新値で _currentLayoutData を更新
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 69
- **エラー数**: 1
- **検出された良いパターン**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 15, "Glob": 7, "Read": 7, "ToolSearch": 1, "Write": 7, "Agent": 32}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-07T07:33:12Z - quizland: 会話パネルのキャラサイズ調整 - width基準→height基準で per-character override (Pono 180/175%, 博士 120/118%)、博士の指示棒を温存、object-fit:contain dead code 除去、sw 829→830
- **タスク**: quizland: 会話パネルのキャラサイズ調整 - width基準→height基準で per-character override (Pono 180/175%, 博士 120/118%)、博士の指示棒を温存、object-fit:contain dead code 除去、sw 829→830
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 138
- **エラー数**: 22
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 62, "Read": 14, "Grep": 3, "ToolSearch": 1, "Agent": 35, "Write": 2, "Edit": 21}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-07T07:28:26Z - OPシネマティック対話画面 Pono/フクロウのキャラ寸法ミスマッチ修正(width-based→height-based + top-anchor、巨人対小人を解消)
- **タスク**: OPシネマティック対話画面 Pono/フクロウのキャラ寸法ミスマッチ修正(width-based→height-based + top-anchor、巨人対小人を解消)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 65
- **エラー数**: 1
- **検出された良いパターン**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 15, "Glob": 7, "Read": 7, "ToolSearch": 1, "Write": 7, "Agent": 28}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-07T07:26:53Z - quizland 4:3 .title-card font-size/min-width/padding を強制して small表示を修正
- **タスク**: quizland 4:3 .title-card font-size/min-width/padding を強制して small表示を修正
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 65
- **エラー数**: 1
- **検出された良いパターン**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 15, "Glob": 7, "Read": 7, "ToolSearch": 1, "Write": 7, "Agent": 28}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-07T07:03:38Z - quizland: シネマ refine 4点 (ナレ切替 11s タイミング, 後処理 2s hold, 会話レイアウト sides 縦積み waist-shot, blur 5px) + クイズ本編 setHakaseDialogue を一括表示に戻す (babble + typewriter は OP 専用化)、null guard 追加、sw 828→829
- **タスク**: quizland: シネマ refine 4点 (ナレ切替 11s タイミング, 後処理 2s hold, 会話レイアウト sides 縦積み waist-shot, blur 5px) + クイズ本編 setHakaseDialogue を一括表示に戻す (babble + typewriter は OP 専用化)、null guard 追加、sw 828→829
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 128
- **エラー数**: 20
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 59, "Read": 13, "Grep": 3, "ToolSearch": 1, "Agent": 32, "Write": 2, "Edit": 18}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-07T06:58:36Z - quizland OP cinematic 4-fix: narration switch >=11s+timeout12s / 2s post-narr hold / vertical side stack (char+dialog waist-shot) / blur 10→5px
- **タスク**: quizland OP cinematic 4-fix: narration switch >=11s+timeout12s / 2s post-narr hold / vertical side stack (char+dialog waist-shot) / blur 10→5px
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 63
- **エラー数**: 1
- **検出された良いパターン**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 15, "Glob": 7, "Read": 7, "ToolSearch": 1, "Write": 7, "Agent": 26}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-07T06:43:21Z - quizland: モード選択→オープニング遷移ちらつき修正 (mode-screen hide を playOpeningCinematic 内へ移動 / .op-cinematic 全体フェード廃止 / .op-bg 単独フェード化、黒ハードカット+BG OL)、sw 826→827。並列 impl + cross-review SHIP判定
- **タスク**: quizland: モード選択→オープニング遷移ちらつき修正 (mode-screen hide を playOpeningCinematic 内へ移動 / .op-cinematic 全体フェード廃止 / .op-bg 単独フェード化、黒ハードカット+BG OL)、sw 826→827。並列 impl + cross-review SHIP判定
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 58
- **エラー数**: 1
- **検出された良いパターン**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 14, "Glob": 7, "Read": 7, "ToolSearch": 1, "Write": 7, "Agent": 22}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


