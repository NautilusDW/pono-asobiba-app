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
- **Quizland number_sequence カテゴリ**: [memory/feature_quizland_number_sequence.md](memory/feature_quizland_number_sequence.md) — 3歳児向け新カテゴリ「かずのじゅん」(12問)。1〜10 の前後関係 (つぎ/まえ/あいだ)、inspire モードに統合
- **Quizland VOICEVOX 発注書**: [memory/feature_quizland_voicevox_order.md](memory/feature_quizland_voicevox_order.md) — 全181問×5音声+Q160補足2=907ファイルの音声発注。読み方ルール・命名規則・Q160同音異義両案運用
- **画像生成ルート方針 (2026-05-11 更新)**: 一次経路は **Codex 経由の GPT-Image 2 (OpenAI `gpt-image-1` 系)** か **Higgsfield の Nano Banana Pro** の二択。被写体・用途で使い分ける (キャラ・人物系 → Nano Banana Pro / 抽象・UI 素材・テキスト含む系 → GPT-Image 2、運用知見が貯まり次第追記)。Claude Code セッションは生成タスクを直接抱えない — 生成は Codex / Higgsfield 側で行い、生成物は `tmp/alpha_pending/<NN>/` 経由で投入され、Claude は最終配置・最適化 (`assets/` への移動、ファイル名整備、軽量化、`sw.js` バンプ、commit) のみ担当。**以前の「GPT Image 2 単一・他モデル禁止」方針は撤回**、現方針は GPT-Image 2 / Nano Banana Pro の使い分け。解像度・SAFE エリア・外周ぼかし等の既存ガイドライン ([memory/feedback_codex_canvas_safe_margin.md](memory/feedback_codex_canvas_safe_margin.md)) はそのまま有効

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

### 2026-05-11T00:28:36Z - ずかんエディター: 🌐ナビボタン追加 + 装飾フレームスロット構造化 + プレースホルダーSVG生成 + 画像生成基盤メモリ更新 (オーケストレーター運用、エージェント並列+クロスレビュー)
- **タスク**: ずかんエディター: 🌐ナビボタン追加 + 装飾フレームスロット構造化 + プレースホルダーSVG生成 + 画像生成基盤メモリ更新 (オーケストレーター運用、エージェント並列+クロスレビュー)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 25
- **エラー数**: 3
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Agent": 7, "Read": 3, "Grep": 9, "ToolSearch": 3, "Write": 1, "ExitPlanMode": 1, "Bash": 1}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-11T00:27:55Z - AGENTS.md §4 ルール 7 / 検知ヘッダ / HANDOFF.md / CODEX-ORDER*.md の PowerShell 読み方ガイド重複を §0.1 参照に圧縮 (5 ファイル編集、参照経路を §0.1 に集約、2 段階判定論理は維持)
- **タスク**: AGENTS.md §4 ルール 7 / 検知ヘッダ / HANDOFF.md / CODEX-ORDER*.md の PowerShell 読み方ガイド重複を §0.1 参照に圧縮 (5 ファイル編集、参照経路を §0.1 に集約、2 段階判定論理は維持)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 12
- **エラー数**: 1
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 4, "Bash": 2, "Grep": 1, "Agent": 4, "ToolSearch": 1}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-11T00:22:06Z - AGENTS.md / HANDOFF.md / CODEX-ORDER*.md に PowerShell素のGet-Content文字化けはfalse positiveとする2段階判定ルールを追加 (§0.1新設・§4ルール7改訂・検知ヘッダ2行化)
- **タスク**: AGENTS.md / HANDOFF.md / CODEX-ORDER*.md に PowerShell素のGet-Content文字化けはfalse positiveとする2段階判定ルールを追加 (§0.1新設・§4ルール7改訂・検知ヘッダ2行化)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 20
- **エラー数**: 2
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Agent": 6, "Read": 3, "Grep": 6, "ToolSearch": 3, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-11T00:10:27Z - Quizland VOICEVOX テスト発注書 (5問27ファイル) を新規作成。読み方ルール5種を網羅 (英→日変換/和語数詞/カギ括弧除去/同音異義補足/音読み)
- **タスク**: Quizland VOICEVOX テスト発注書 (5問27ファイル) を新規作成。読み方ルール5種を網羅 (英→日変換/和語数詞/カギ括弧除去/同音異義補足/音読み)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 12
- **エラー数**: 0
- **検出された良いパターン**: 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 実装前にコードベースを探索した
- **ツール使用統計**: {"Agent": 2, "Read": 3, "Grep": 6, "ToolSearch": 1}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-10T23:42:12Z - OP cinematic Panel 2 はかせ発話開始時の「ポノ」ラベル一瞬チラつきを解消 (#op-dialogue-label-single の HTML 初期テキスト hardcoded を空に変更、 line[0].speaker 反映で正しく上書き) (sw v918)
- **タスク**: OP cinematic Panel 2 はかせ発話開始時の「ポノ」ラベル一瞬チラつきを解消 (#op-dialogue-label-single の HTML 初期テキスト hardcoded を空に変更、 line[0].speaker 反映で正しく上書き) (sw v918)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 153
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 15, "Agent": 67, "Bash": 52, "Grep": 12, "Write": 3, "ToolSearch": 1, "ExitPlanMode": 1, "Edit": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-10T23:41:51Z - quizland OP Panel 2 開始時のラベル「ポノ」チラつき修正 (HTML初期textContentを空に, sw v917→918)
- **タスク**: quizland OP Panel 2 開始時のラベル「ポノ」チラつき修正 (HTML初期textContentを空に, sw v917→918)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 152
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 15, "Agent": 67, "Bash": 51, "Grep": 12, "Write": 3, "ToolSearch": 1, "ExitPlanMode": 1, "Edit": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-10T23:26:56Z - quizland order_color の選択肢ボタン英語表記バグ修正 (window.QUIZLAND_COLORS 参照を直接参照に変更, sw.js v916→917)
- **タスク**: quizland order_color の選択肢ボタン英語表記バグ修正 (window.QUIZLAND_COLORS 参照を直接参照に変更, sw.js v916→917)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 20
- **エラー数**: 1
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 1, "Agent": 14, "ToolSearch": 3, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-10T23:23:34Z - editor の dance_wave をデフォルト PONO_VARIANTS に昇格 (本番資産 b76d92b で追加済の dance_wave.webp に対応、 migrateFrameIds backfill も 7 variants 化)。 これで Export 警告が出なくなる (sw v916)
- **タスク**: editor の dance_wave をデフォルト PONO_VARIANTS に昇格 (本番資産 b76d92b で追加済の dance_wave.webp に対応、 migrateFrameIds backfill も 7 variants 化)。 これで Export 警告が出なくなる (sw v916)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 151
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 15, "Agent": 66, "Bash": 51, "Grep": 12, "Write": 3, "ToolSearch": 1, "ExitPlanMode": 1, "Edit": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-10T23:15:20Z - Panel 6 はかせ ponoImg を think_chin_clasp → pono_001 に更新 (1 行 diff、 segments.audio 温存、 他 panel 不変) (sw v915)
- **タスク**: Panel 6 はかせ ponoImg を think_chin_clasp → pono_001 に更新 (1 行 diff、 segments.audio 温存、 他 panel 不変) (sw v915)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 148
- **エラー数**: 10
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 15, "Agent": 65, "Bash": 49, "Grep": 12, "Write": 3, "ToolSearch": 1, "ExitPlanMode": 1, "Edit": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


