# MEMORY.md - Self-Evolving Framework Knowledge Base

## Framework Statistics

- 初期化日: 2026-02-25
- 総タスク数: 19+
- 成功率: 100%
- 詳細履歴: [memory/task-history.md](memory/task-history.md)
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
- **Quizland per-question layout**: [memory/feature_quizland_per_question_layout.md](memory/feature_quizland_per_question_layout.md) — `.emoji-display` / `.emoji-main-img` を問題ごと別座標で保存 (whitelist + `@${qid}` suffix + 旧 `|0` fallback、自動 migrate 無し、フクロウ共通維持)。GH 一時 404 + dirty 誤検知 + frozenQid race 防止の多重防御
- **「保存できない」系主訴の分解**: [memory/feedback_user_complaint_decompose.md](memory/feedback_user_complaint_decompose.md) — ユーザの表面症状をそのまま仮説化せず、最初に実機で「実際何が起きているか」を切り分ける。前任が見逃した本質を発見した経験から
- **Quizland 対象年齢**: [memory/project_quizland_target_age.md](memory/project_quizland_target_age.md) — trivia は **5-6 歳児用**（カタカナ読める前提）。L1 でも「絵=答え」のネタバレは不可。emoji_name 等は別年齢想定で OK
- **Quiz Question Revision & Illustration Delivery Pipeline**: [memory/feature_quiz_question_revision_pipeline.md](memory/feature_quiz_question_revision_pipeline.md) — クイズ問題改訂→Codex 画像発注→納品→配置の真実の源マップ。**【新規 2026-05-08】画像発注前は必ず (1) 参照画像の有無確認、(2) 既存類似画像の有無確認、(3) 背景仕様をエントリごとに明示 (Codex に判断委譲 NG) を最優先で実施**。リビールペア / spoiler 監査 / 既知バッチ一覧収録
- **Codex 画像 外周ぼかしルール**: [memory/feedback_codex_canvas_safe_margin.md](memory/feedback_codex_canvas_safe_margin.md) — シーン絵は外周をぼかして発注（後でフレーム差し替え時に切れないように）。オブジェクト単体絵は例外（上下左右切れない構図必須）。**全 Codex 発注で必須**
- **Quiz Question Reveal Sequence**: [memory/feature_quiz_question_reveal_sequence.md](memory/feature_quiz_question_reveal_sequence.md) — 問題開始時の段階リビール (プレート → typewriter 問題文 → イラスト fade in → 4 択 fade in)。Q1-5 のみプレート、Q6+ は typewriter から開始、tap-to-skip で全 stage 即 revealed
- **Quiz Framed Image Flag**: [memory/feature_quiz_framed_image_flag.md](memory/feature_quiz_framed_image_flag.md) — 背景シーン入り画像 (風景/紙風枠/草地ヴィネット等、計 32 種) は questions.js の `framed:true` / `framed_answer:true` でスロット単位に `.is-framed` を付与し共通 drop-shadow を抑止。`renderShapeName` も q.img 指定時は実物画像優先 + framed 対応済
- **Quiz Next Button**: [memory/feature_quiz_next_button.md](memory/feature_quiz_next_button.md) — 回答後のつぎへボタン仕様。center-bottom 固定オーバーレイ + progress-num.png ピル背景 + 全 169 問で表示 (旧: 自動進行 + img_answer 限定)。`#next-btn-area` は layout-applier 非対象
- **ポノのもりのずかん 全画面フロー (SPA)**: [memory/feature_zukan_full_flow.md](memory/feature_zukan_full_flow.md) — `zukan/index.html` を 5-screen SPA 化 (タイトル→マップ選択→エリア内マップ→探索→図鑑コレクション)。データ層 `zukan/data/zukan-data.js` (4 エリア × 1 spot × 1 animal の seed + 36 匹 collectionRoster)。素材は `assets/zukan/{title,map,innermap,collection,ui}/`。表示名/内部 ID 不一致表 + エディタパス (`zukan/preview/{investigation,innermap,full}/?edit=1`) 収録 (sw v895)

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

### 2026-05-10T03:17:51Z - OP cinematic (Q) 案完成: 立ち絵+対話+ナレ全部を 1 ボタンで全端末配信 (saved-layout.json __op_layout 新キー、editor 4 ボタン拡張、runtime _opLoadLayoutOverride/_opApplyLayoutOverride 新設、後方互換 __op_narration 温存) + cross-review HIGH-1/2/3 + LOW-1 fix (sw v904)
- **タスク**: OP cinematic (Q) 案完成: 立ち絵+対話+ナレ全部を 1 ボタンで全端末配信 (saved-layout.json __op_layout 新キー、editor 4 ボタン拡張、runtime _opLoadLayoutOverride/_opApplyLayoutOverride 新設、後方互換 __op_narration 温存) + cross-review HIGH-1/2/3 + LOW-1 fix (sw v904)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 70
- **エラー数**: 6
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 8, "Agent": 35, "Bash": 21, "Grep": 6}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-10T03:17:27Z - quizland-op (Q 案完成): 立ち絵+対話+ナレ全部を全端末配信 (sw v904), saved-layout.json __op_layout 新キー + cross-review HIGH-1/2/3 + LOW-1 fix, memory 更新 + commit b3f575b
- **タスク**: quizland-op (Q 案完成): 立ち絵+対話+ナレ全部を全端末配信 (sw v904), saved-layout.json __op_layout 新キー + cross-review HIGH-1/2/3 + LOW-1 fix, memory 更新 + commit b3f575b
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 69
- **エラー数**: 6
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 8, "Agent": 35, "Bash": 20, "Grep": 6}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-10T03:04:48Z - quizland-op (Q 案): saved-layout.json __op_layout 新キー追加 (立ち絵+対話+ナレ全部 per-VC) + editor 4 ボタン拡張 (📡/⟳/💾/📂、新旧 schema 両対応) + runtime _opApplyLayoutOverride 追加 (panel 切替時 inline style 注入 + finally 全クリア、後方互換 __op_narration 温存)
- **タスク**: quizland-op (Q 案): saved-layout.json __op_layout 新キー追加 (立ち絵+対話+ナレ全部 per-VC) + editor 4 ボタン拡張 (📡/⟳/💾/📂、新旧 schema 両対応) + runtime _opApplyLayoutOverride 追加 (panel 切替時 inline style 注入 + finally 全クリア、後方互換 __op_narration 温存)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 66
- **エラー数**: 6
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 8, "Agent": 32, "Bash": 20, "Grep": 6}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-10T02:40:30Z - agent-11 committer-handoff-fix: Codex 文字化け対策 (案A+B) commit 状態確認
- **タスク**: agent-11 committer-handoff-fix: Codex 文字化け対策 (案A+B) commit 状態確認
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 64
- **エラー数**: 6
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 8, "Agent": 30, "Bash": 20, "Grep": 6}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-10T02:38:11Z - agent-10 handoff-mojibake-fix: .editorconfig に md/json/html/css/js/py/sh の charset=utf-8+lf セクション明示追加 + AGENTS.md §4 ルール 7 に文字化け検知ヘッダ規約追加 + 既存ハンドオフ md 7 件 (HANDOFF.md / CODEX-PROMPT.md x2 / CODEX-ORDER.md x3 / codex-report.md) 冒頭に blockquote 警告挿入
- **タスク**: agent-10 handoff-mojibake-fix: .editorconfig に md/json/html/css/js/py/sh の charset=utf-8+lf セクション明示追加 + AGENTS.md §4 ルール 7 に文字化け検知ヘッダ規約追加 + 既存ハンドオフ md 7 件 (HANDOFF.md / CODEX-PROMPT.md x2 / CODEX-ORDER.md x3 / codex-report.md) 冒頭に blockquote 警告挿入
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 64
- **エラー数**: 6
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 8, "Agent": 30, "Bash": 20, "Grep": 6}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-10T02:35:25Z - OP narration JSON Export/Import 実装 (X 案): B 経路 revert 復活 (6c27168) + 「💾 NA Export」「📂 NA Import」ボタン追加 (ca1cb68) + cross-review HIGH-1/HIGH-2/MEDIUM-3 fix (c191465、buildRightPane / undo 集約 / schema 検証) (sw v903)
- **タスク**: OP narration JSON Export/Import 実装 (X 案): B 経路 revert 復活 (6c27168) + 「💾 NA Export」「📂 NA Import」ボタン追加 (ca1cb68) + cross-review HIGH-1/HIGH-2/MEDIUM-3 fix (c191465、buildRightPane / undo 集約 / schema 検証) (sw v903)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 63
- **エラー数**: 6
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 8, "Agent": 30, "Bash": 19, "Grep": 6}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-10T02:30:17Z - quizland-op: B 経路 revert + JSON Export/Import 追加 (X 案、 sw v902)
- **タスク**: quizland-op: B 経路 revert + JSON Export/Import 追加 (X 案、 sw v902)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 88
- **エラー数**: 5
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 34, "Glob": 4, "Bash": 16, "Agent": 25, "ToolSearch": 3, "Write": 2, "ExitPlanMode": 1, "Edit": 3}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-10T02:14:19Z - quizland-op: saved-layout.json 配信 (B 経路) 撤去、ローカル localStorage + CSS export ワークフローに戻す (sw v901、commit 2f68389)
- **タスク**: quizland-op: saved-layout.json 配信 (B 経路) 撤去、ローカル localStorage + CSS export ワークフローに戻す (sw v901、commit 2f68389)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 58
- **エラー数**: 5
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 8, "Agent": 26, "Bash": 18, "Grep": 6}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-10T02:05:06Z - OP narration レイアウト復元: saved-layout.json に __op_narration seed 挿入 + editor 起動時 load フォールバック (localStorage > seed > defaults) + 「⟳ 復元」ボタン (confirm + undo) + cross-review HIGH-1/HIGH-2/MEDIUM-3 fix (sw v900)
- **タスク**: OP narration レイアウト復元: saved-layout.json に __op_narration seed 挿入 + editor 起動時 load フォールバック (localStorage > seed > defaults) + 「⟳ 復元」ボタン (confirm + undo) + cross-review HIGH-1/HIGH-2/MEDIUM-3 fix (sw v900)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 57
- **エラー数**: 5
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 8, "Agent": 25, "Bash": 18, "Grep": 6}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


