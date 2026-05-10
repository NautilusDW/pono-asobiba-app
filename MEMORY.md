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

### 2026-05-10T01:32:00Z - agent-4 mapselect-finalize: 残り3エリアhighlight取り込み + zukan-data worldHighlight追加 + 水色背景/hotspotハロー削除 + sign+silhouettesパネル追加 (sw v897)
- **タスク**: agent-4 mapselect-finalize: 残り3エリアhighlight取り込み + zukan-data worldHighlight追加 + 水色背景/hotspotハロー削除 + sign+silhouettesパネル追加 (sw v897)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 43
- **エラー数**: 3
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 7, "Agent": 21, "Bash": 15}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-10T01:07:13Z - zukan mapselect 花の小道ハイライト overlay (透過 PNG 全画面重ね + 発光パルス) を develop に commit (sw v896)
- **タスク**: zukan mapselect 花の小道ハイライト overlay (透過 PNG 全画面重ね + 発光パルス) を develop に commit (sw v896)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 74
- **エラー数**: 5
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 33, "Glob": 4, "Bash": 13, "Agent": 16, "ToolSearch": 3, "Write": 2, "ExitPlanMode": 1, "Edit": 2}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-10T00:47:53Z - agent-1 mapselect-highlight: Step 1 目視判定でMap_scenes画像がworld_mapとぴったり重ならないことを確認しケース2(コード未編集で保留報告)
- **タスク**: agent-1 mapselect-highlight: Step 1 目視判定でMap_scenes画像がworld_mapとぴったり重ならないことを確認しケース2(コード未編集で保留報告)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 66
- **エラー数**: 5
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 30, "Glob": 4, "Bash": 11, "Agent": 13, "ToolSearch": 3, "Write": 2, "ExitPlanMode": 1, "Edit": 2}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-10T00:11:55Z - ずかん 5-screen SPA 化 (タイトル→マップ選択→エリア内マップ→探索→図鑑コレクション) + 素材30件取り込み + クロスレビュー HIGH4+MED1 反映 + commit b505ffd (sw v895)
- **タスク**: ずかん 5-screen SPA 化 (タイトル→マップ選択→エリア内マップ→探索→図鑑コレクション) + 素材30件取り込み + クロスレビュー HIGH4+MED1 反映 + commit b505ffd (sw v895)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 64
- **エラー数**: 5
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 30, "Glob": 4, "Bash": 11, "Agent": 11, "ToolSearch": 3, "Write": 2, "ExitPlanMode": 1, "Edit": 2}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-10T00:04:52Z - agent-G review-fixer: HIGH4+MEDIUM1 (zukan誤字/touch二重発火/innerHTML脱却/stale closure/im-pinヒットエリア拡大) を修正
- **タスク**: agent-G review-fixer: HIGH4+MEDIUM1 (zukan誤字/touch二重発火/innerHTML脱却/stale closure/im-pinヒットエリア拡大) を修正
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 62
- **エラー数**: 4
- **検出された良いパターン**: 編集前にファイルを読んで理解した, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 30, "Glob": 4, "Bash": 10, "Agent": 10, "ToolSearch": 3, "Write": 2, "ExitPlanMode": 1, "Edit": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-09T23:56:39Z - sw.js CACHE_VERSION 894 -> 895 bump (zukan SPA + 30+ assets cache invalidation)
- **タスク**: sw.js CACHE_VERSION 894 -> 895 bump (zukan SPA + 30+ assets cache invalidation)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 55
- **エラー数**: 3
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 29, "Glob": 4, "Bash": 10, "Agent": 7, "ToolSearch": 3, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-09T23:53:42Z - zukan SPA: 既存1問のしらべるロジックを5-screen SPA (title/mapselect/innermap/search/collection) に拡張、データ駆動化、キラキラ + スタンプ演出、localStorage連携
- **タスク**: zukan SPA: 既存1問のしらべるロジックを5-screen SPA (title/mapselect/innermap/search/collection) に拡張、データ駆動化、キラキラ + スタンプ演出、localStorage連携
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 51
- **エラー数**: 3
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 29, "Glob": 4, "Bash": 10, "Agent": 4, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-09T23:50:45Z - agent-A asset-migrator: ポノのおへや図鑑素材30件をassets/zukan/配下にsnake_caseで取り込み (silhouettesは目視確認で再マッピング)
- **タスク**: agent-A asset-migrator: ポノのおへや図鑑素材30件をassets/zukan/配下にsnake_caseで取り込み (silhouettesは目視確認で再マッピング)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 51
- **エラー数**: 3
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 29, "Glob": 4, "Bash": 10, "Agent": 4, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-09T23:47:45Z - OP narration seg2 音声ファイル名のアンダースコア統一 (OP_NA_02.mp3 → OP_NA02.mp3、quizland/index.html + memory + sw v894)
- **タスク**: OP narration seg2 音声ファイル名のアンダースコア統一 (OP_NA_02.mp3 → OP_NA02.mp3、quizland/index.html + memory + sw v894)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 42
- **エラー数**: 3
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 7, "Agent": 20, "Bash": 15}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


