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
- **Babble Voice System (Quizland)**: [memory/feature_babble_voice.md](memory/feature_babble_voice.md) — フクロウ博士・ポノ・くるみちゃんのしゃべり声 (タイピング + Web Audio 合成)。owl preset = 年配おじいさん風 (5母音フォルマント切替、6.2Hz ビブラート)、pono = bright triangle chirp、**kurumi = baseFreq 450Hz の優しいお姉さん声 chirp (2026-05-11 追加)**。`js/quizland-babble.js` + `quizland/index.html` の OP cinematic で `presetForLine = isHakase ? 'owl' : (isKurumi ? 'kurumi' : 'pono')` の 3 way 切替。hedgehog preset は stub のみ
- **OP Layout 配信ワークフロー（確定運用）**: [memory/reference_op_layout_publish_workflow.md](memory/reference_op_layout_publish_workflow.md) — **ローカル editor で位置調整 → 「📥 Export → JSON ファイル」 → ユーザーが Claude にファイル名を伝える → Claude エージェントが saved-layout.json に反映 + sw.js bump + commit** が唯一の確定運用フロー。「📡 配信」ボタンは話題にも出さない方針 (ユーザー明示)
- **Quizland Opening Cinematic**: [memory/feature_quizland_opening.md](memory/feature_quizland_opening.md) — 6 パネル導入演出 (Ken Burns ドリー + ナレーション + **博士・ポノ・くるみ 3 キャラ会話** + babble + スキップ)。**くるみちゃんは Panel 2 で `kurumi_hi` (左手挨拶) 初登場 → Panel 3/4 で `kurumi_clasp` (両手胸前) 立ち絵維持 (v937+ 追加) → Panel 5 で `kurumi_wink` (ウインク+こぶし) で依頼受け → Panel 6 で `kurumi_clasp` (両手胸前) 立ち絵維持の Panel 2-6 全 5 panel 連続 visible** で本編へ遷移、 「kurumi は Panel 2 で登場したら Panel 6 まで継続表示」 が v937+ 確定方針、 **v938 で Panel 2 line 3 (pono「はかせ、くるみちゃん、…」) と Panel 5 line 1/2/3 にも `kurumiImg` を注入し、 Panel 2 line 2 (kurumi 初登場) 以降の全 line に kurumiImg がカバーされ Panel 2 line 2 〜 Panel 6 末尾まで完全継続表示が成立 (= v937 まで残っていた Panel 2 line 3 / Panel 5 line 1/2/3 で消える残課題を解消)** (sw v921 OP 初投入 / v922 クロスレビュー反映 / v923 13 variants 管理機能 / v924 クロスレビュー C HIGH3+MED4 修正 / v925 editor 左ペインに Kurumi バリエーションサムネ + シナリオ speaker に kurumi 追加 / v926 editor `defaultScenario()` を本番 OP_PANELS と完全同期 (Panel 2/5 で kurumi line 追加 + Panel 3/4 hakase line に ponoImg:pono_001 明示 + Panel 6 両 line に kurumiImg:kurumi_clasp 注入) / v927 editor `migrateScenario` の speaker='kurumi' 強制 hakase 化バグ修正 + `kurumiImg` 空値正規化追加 + `buildScenarioPanelsLiteral` を 3-way 対応 + `kurumiFullPath` ヘルパー新設で kurumiImg シリアライズ対応 / v929 editor scenario の version 付き auto migration を実装 (`SCENARIO_DATA_VERSION` 定数 + version 不一致なら defaults 強制 → 既存ユーザーも editor リロードだけで自動移行) / v930 editor 「くるみ側」 タブ切替 defensive 強化 / v931 editor シナリオ dialogue 行に「ポノ」「はかせ」「くるみ」 の 3 dropdown 追加 (`appendCharImgSelect()` 共通ヘルパ + `HAKASE_VARIANTS` 定数 + `hakasePathByName` / `hakaseFullPath` ヘルパ + `migrateScenario` の hakaseImg 空値正規化 + `buildScenarioPanelsLiteral` の hakaseImg シリアライズ + SCENARIO_DATA_VERSION v927→v930 bump で auto migration 発火、 各 line で speaker と独立に 3 キャラの立ち絵 variant を編集可能) / v932 ローカル editor で位置調整した OP layout JSON (op-layout-2026-05-11-06-18-47.json) を `quizland/saved-layout.json` の `__op_layout` (B/C/D × pono/hakase/kurumi/singleBox/narration の 5 side) に反映、 220 keys 完全温存、 `kurumi.perVariant` の 13 entries が B のみ初期値から editor 編集後の実値に更新 (B では `kurumi_hi` slotW=280 / slotH=303、 `kurumi_clasp` slotW=280 / slotH=354、 `kurumi_hooray` slotW=280 / slotH=380 等、 各 variant のサイズ・オフセットが個別調整済)、 editor 経由で初の本格 publish が成立 / v933 runtime kurumi CSS の per-VC `.op-char-slot` を `right: 0` 右端アンカーから `left: 50% + transform: translate(-50%, -50%)` 中央アンカーに統一 (B/C/D 全 VC、 pono/hakase と同じ式で editor preview とも一致)、 v932 で焼き込んだ kurumi.perVariant slot 値がここで初めて runtime で「editor で見たまま」 の位置に再現されるようになった (v932 までは同じ JSON 値でも runtime は editor preview と最大 ~400px ずれていた致命バグの根本修正)、 quizland/index.html CSS 3 箇所のみ修正の最小局所変更で saved-layout.json は無変更 / v934 ユーザー誤指定で同値再 export (op-layout-2026-05-11-06-41-51.json) を merge した実質無変更 publish (sw だけバンプ) / v935 06-49-00 Export (op-layout-2026-05-11-06-49-00.json) を merge し VC C / D 側にも初めて hakase + kurumi の実値を publish (12 entries diff: B kurumi_clasp slotH 354→320 + slotOffsetY 0→19、 C hakase.slotOffsetX 0→-27 + kurumi.slotOffsetX 0→158、 D hakase.slotOffsetX -362→-142 + kurumi.slotH 489→413 + kurumi.slotOffsetX 654→158)、 全 VC で hakase + kurumi の主要 slot を実値 publish する成熟段階に入った / v936 07-22-05 Export (op-layout-2026-05-11-07-22-05.json) を merge し「全ポーズに反映」ボタン (sw v936 で前 task 実装) の初実用 publish。 deep diff 70 entries は全て kurumi.perVariant のみ — B では 13 variants 全部が `slotOffsetX=77, slotOffsetY=19` に統一 (22 entries)、 C では 12 variants の slotOffsetX 0→158 に統一 (12 entries、 kurumi_001 と揃った)、 D では 12 variants で slotW 280→550 / slotH 380→413 / slotOffsetX 0→158 一括変更 (36 entries)、 pono/hakase/singleBox/narration は差分ゼロ / v937 07-31-53 Export (op-layout-2026-05-11-07-31-53.json) を merge + Panel 3/4 にも kurumi_clasp 継続表示する仕様変更: OP_PANELS Panel 3 / 4 の各 line に `kurumiImg: kurumi_clasp.webp` 注入してくるみ立ち絵を Panel 2-6 全 5 panel 連続 visible 化、 op-layout-editor `defaultScenario()` も同期反映 + SCENARIO_DATA_VERSION v930→v937 bump で既存ユーザー auto migration、 saved-layout.json deep diff は 3 entries のみ (B kurumi の base box 微調整: `B.kurumi.slotH` 320→303 + `B.kurumi.perVariant.kurumi_001.slotW` 280→227 / `slotH` 278→269)、 C/D は変更なし、 pono/hakase/singleBox/narration も差分ゼロ。 「くるみは Panel 2 で登場したら Panel 6 まで継続表示」 がプロジェクト方針として確定 (Panel 3/4 で消す提案は今後しない、 ポーズ変化はシナリオに合わせて自由) / **v938 (現行) Panel 2 line 3 (pono「はかせ、くるみちゃん、…」) と Panel 5 line 1/2/3 にも `kurumiImg` を追加注入して全 line カバレッジ完全化**: v937 までは Panel 3/4 と Panel 6 でのみ追加注入していたため Panel 2 line 3 と Panel 5 line 1/2/3 で kurumi 立ち絵が一瞬消える残課題があった (kurumi 自身の発話 line と panel.kurumiImg 経由の line のみ visible)、 v938 で残り 4 line にも kurumiImg を明示注入することで **Panel 2 line 2 (kurumi 初登場) 〜 Panel 6 末尾までの全 12 line で kurumiImg がカバーされ完全継続表示**が実現 (Panel 1 ナレと Panel 2 line 1 だけは kurumi 登場前のため意図的に未注入)、 quizland/index.html OP_PANELS と op-layout-editor `defaultScenario()` を同期、 SCENARIO_DATA_VERSION v937→v938 bump で auto migration、 saved-layout.json は無変更 (= シナリオ JS のみの修正)、 kurumiImg variant 並びは Panel 2 line 2 `kurumi_hi` / line 3 `kurumi_hi` → Panel 3-4 全 line `kurumi_clasp` → Panel 5 line 1-3 `kurumi_clasp` / line 4 `kurumi_wink` → Panel 6 全 line `kurumi_clasp` で「kurumi 登場以降の line には必ず kurumiImg を注入する」 設計原則を明文化**)。mode-btn → `playOpeningCinematic()` → `initGame()` の async 経路。仮素材は `OP_BG.png` 共有、本素材は `tmp/quizland-op-cinematic/CODEX-PROMPT.md` 経由で Codex に依頼
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
- **Quizland VOICEVOX 発注書 + 生成ツール**: [memory/feature_quizland_voicevox_order.md](memory/feature_quizland_voicevox_order.md) — 全181問×5音声+Q160補足2=907ファイルの音声発注 (`docs/quizland-voicevox-order/`、git 管理、Claude エージェントが整備) + ローカル HTML 生成ツール (`tools/voicevox-generator/voicevox-generator.html`、Cowork 派生 **1570 行 + 6 機能拡張**: A ユーザー辞書一括登録 / B AccentPhrase 詳細編集 / C 発注書動的読み込み / D LLM 直接呼び出し (非推奨) / **E accent_overrides.json 読込** / **F 未補正テキスト + audio_query エクスポート**、52 語辞書 (`voicevox_user_dict.csv`、NHK ベース)、HIGH 6 + MED 7 のクロスレビュー反映済)。**役割分担: 発注書整備は git 管理 / 音声生成はツール実行**。**確定運用は Claude Code 一本化** (2026-05-11): 機能 F で未補正データを Export → Claude Code (Max plan) に渡してアクセント補正 JSON を生成 → 機能 E で読込 → synthesis → zip → 試聴。機能 D の API 直接呼び出しは課金回避できないため非推奨 (互換性のため残置)、Codex App Server 案は重いため見送り。読み方ルール・命名規則・Q160同音異義両案運用
- **VOICEVOX 作業フォルダパス**: [memory/reference_voicevox_workflow_paths.md](memory/reference_voicevox_workflow_paths.md) — `D:\ポノのおへや\Dr.owl'quiz\NA\問題文\` をデフォルト固定、accent_input/accent_overrides 両方ここで運用、Claude は最新 accent_input を自動検出
- **Quizland リスのくるみちゃん**: [memory/feature_quizland_kurumi.md](memory/feature_quizland_kurumi.md) — クイズアシスタントキャラ、リスの女の子、元気で優しいお姉さん感、VOICEVOX 女声話者で問題文を読み上げ。**立ち絵 13 variants (`kurumi_001` 基準正面 + `hi`/`wave`/`hooray`/`wink`/`clasp`/`idea`/`point`/`calm`/`pray`/`book`/`cheer`/`greet`、 全 variant 同一スタイル統一済 @ `assets/images/characters/kurumi/dance/`)、 OP シネマティック組み込み済 (Panel 2: `kurumi_hi` 発話 → Panel 3/4: `kurumi_clasp` 立ち絵維持 (v937+ 追加) → Panel 5: `kurumi_wink` 発話 → Panel 6: `kurumi_clasp` 立ち絵維持の Panel 2-6 全 5 panel 連続 visible、 「kurumi は Panel 2 で登場したら Panel 6 まで継続表示」 が v937+ プロジェクト確定方針、 **v938+ で Panel 2 line 3 と Panel 5 line 1/2/3 にも `kurumiImg` を追加注入して全 12 line に kurumiImg カバレッジ完了** = kurumi 登場以降の line には必ず kurumiImg を注入する設計原則が確定)、 op-layout-editor に「くるみ側」タブ追加 + **左ペインに Kurumi バリエーションサムネ一覧 (13 ポーズ、 サムネクリックで variant 切替、 ドラッグ&ドロップ未対応)** + **シナリオ行 speaker に「くるみ」追加 (ポノ / はかせ / くるみ の 3 way ラジオ)** + **scenario モードのデフォルトデータ (`defaultScenario()`) を本番 OP_PANELS と完全同期 (v926+)** + **migrate / export 経路の kurumi バグ 3 件修正 (v927+: speaker='kurumi' 強制 hakase 化バグ + buildScenarioPanelsLiteral の 2-way 判定 + kurumiImg シリアライズ追加)** + **scenario の version 付き auto migration (v929+: `SCENARIO_DATA_VERSION` 定数で version 不一致時に defaults 強制 → 既存ユーザーは editor リロードだけで自動移行、 DevTools 手順不要)** + **シナリオ dialogue 行に「ポノ」「はかせ」「くるみ」の 3 dropdown を並列追加 (v931+: `appendCharImgSelect()` 共通ヘルパ / `HAKASE_VARIANTS` + `hakasePathByName` / `hakaseFullPath` ヘルパ / `migrateScenario` の hakaseImg 空値正規化 / `buildScenarioPanelsLiteral` の hakaseImg シリアライズ / SCENARIO_DATA_VERSION v927→v930 bump、 各 line で speaker と独立に 3 キャラの立ち絵 variant を編集可能、 runtime hakaseImg 対応は HAKASE_VARIANTS 1 種のため未実装で将来タスク)** + ローカル editor (`tools/op-layout-editor.html`) → クリップボード Export → orchestrator が `quizland/saved-layout.json` の `__op_layout` にマージという編集ワークフローが v932 で B のみ kurumi の 13 perVariant 全量で正式運用 → v935 で C/D 側にも hakase + kurumi の主要 slot を実値 publish 開始、 B/C/D 全 VC の `kurumi.perVariant` 13 entries が初期値 (`kurumi_001` 値全コピー) から editor 編集後の個別調整値 (B では variant ごとに slotH=278〜380, slotOffsetX=54〜88 が分散、 v935 で `kurumi_clasp` slotH 354→320 / slotOffsetY 0→19 追加調整、 C は `kurumi_001` のみ slotOffsetX=158、 D は `kurumi_001` のみ slotW=550 / slotH=413 / slotOffsetX=158 で上書き) に更新済、 220 keys 完全温存 + v933 で runtime kurumi CSS の per-VC `.op-char-slot` を `right: 0` 右端アンカーから `left: 50% + transform: translate(-50%, -50%)` 中央アンカーに統一 (B/C/D 全 VC、 pono/hakase と同式で editor preview とも一致)、 v932 で焼き込んだ kurumi.perVariant slot 値が runtime で初めて editor で見たままに再現されるようになった (v932 までは runtime kurumi が `right:0` 右端アンカーで editor preview と最大 ~400px ずれていた致命バグの根本修正)、 saved-layout.json は無変更で直したのは「JSON の解釈側」だけの最小局所変更 + **v935 で 06-49-00 Export を merge し VC C / D の hakase.slotOffsetX (C=-27 / D=-142) と kurumi.slotOffsetX (C=158 / D=158) も実値化、 全 VC で hakase + kurumi の主要 slot を実値 publish する成熟段階に入った** + 13 variants × 3 VC で perVariant slot 配信、 babble preset `kurumi` (baseFreq 450)、 saved-layout.json `__op_layout.{B,C,D}.kurumi.perVariant` 13 entries 配信、 speaker は `'kurumi'` または `d.kurumiImg` がある line で立ち絵 visible (OR 条件)。 **editor の「くるみ側」タブは「対話 (P2-6)」モードでのみ表示 — 「ナレ」「シナリオ」モードでは tab-bar 全体が `display: none` になる仕様 (pono / hakase も同じ、 元からの仕様)** (sw v921 OP 初投入 / v922 クロスレビュー反映 / v923 13 variants 管理機能 / v924 クロスレビュー C HIGH3+MED4 修正 / v925 左ペイン Kurumi サムネ + シナリオ speaker 拡張 / v926 editor defaultScenario 本番同期 / v927 editor migrate + export を kurumi 対応 / v929 editor scenario auto migration / v930 editor くるみ側タブ defensive 強化 / v931 editor シナリオ行に hakase + kurumi dropdown 追加 + SCENARIO_DATA_VERSION v930 bump / v932 B の kurumi.perVariant 13 entries 初の本格 publish で実値化 / v933 runtime kurumi CSS 中央アンカー統一で editor preview と一致、 v932 publish 値が runtime で「editor で見たまま」反映 / v934 同値再 export の無変更 publish (sw だけバンプ) / v935 06-49-00 Export で C/D 側にも hakase + kurumi の実値 publish 開始 (12 entries diff) / v936 07-22-05 Export を merge し「全ポーズに反映」ボタンの初実用 publish (B 22 + C 12 + D 36 = 70 entries diff、 全 13 variants が同値同期、 kurumi.perVariant のみ更新で pono/hakase/singleBox/narration は差分ゼロ) / v937 07-31-53 Export merge + Panel 3/4 仕様変更: OP_PANELS Panel 3/4 の各 line に `kurumiImg: kurumi_clasp.webp` 注入 (Panel 2-6 全 5 panel 連続 visible)、 op-layout-editor `defaultScenario()` 同期 + SCENARIO_DATA_VERSION v930→v937 bump で auto migration、 saved-layout.json deep diff 3 entries のみ (B kurumi base box 微調整: `B.kurumi.slotH` 320→303 + `kurumi_001.slotW` 280→227 / `slotH` 278→269)、 C/D 変更なし、 220 keys 完全温存 / **v938 (現行) Panel 2 line 3 + Panel 5 line 1/2/3 にも kurumiImg 追加注入で全 12 line カバレッジ完了**: v937 で Panel 3/4 にも継続表示が成立した後の残課題 (Panel 2 line 3 と Panel 5 line 1/2/3 で kurumi 立ち絵が消えていた) を解消、 quizland/index.html OP_PANELS と op-layout-editor `defaultScenario()` を同期、 SCENARIO_DATA_VERSION v937→v938 bump で auto migration、 saved-layout.json は無変更 (シナリオ JS のみの修正)、 「kurumi 登場以降の全 line に kurumiImg を注入する」 設計原則を明文化、 全 12 line × kurumiImg 完全カバレッジで Panel 2 line 2 〜 Panel 6 末尾まで一切の途切れなく立ち絵 visible 維持)。 **配信フロー固定: ローカル editor → 「📥 Export → JSON ファイル」 → Claude エージェントで saved-layout.json 反映 + sw.js bump (= [reference_op_layout_publish_workflow.md](memory/reference_op_layout_publish_workflow.md))、 「📡 配信」ボタンは使わない**
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

### 2026-05-11T11:48:53Z - COWORK-TEST-ORDER.md q001_q speech をひらがな化 (真ん中は何色 -> 真ん中はなにいろ) で VOICEVOX ナンショク誤読を回避、ORDER-FULL.md は既にひらがな化済みで追加対応不要を確認
- **タスク**: COWORK-TEST-ORDER.md q001_q speech をひらがな化 (真ん中は何色 -> 真ん中はなにいろ) で VOICEVOX ナンショク誤読を回避、ORDER-FULL.md は既にひらがな化済みで追加対応不要を確認
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 124
- **エラー数**: 7
- **検出された良いパターン**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 14, "Agent": 83, "ToolSearch": 5, "Write": 3, "ExitPlanMode": 2, "Bash": 15, "Glob": 2}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-11T11:20:31Z - VOICEVOX 4サイクル目 accent_overrides.json 生成 (辞書反映確認込み、何色辞書未反映を検出)
- **タスク**: VOICEVOX 4サイクル目 accent_overrides.json 生成 (辞書反映確認込み、何色辞書未反映を検出)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 123
- **エラー数**: 7
- **検出された良いパターン**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 14, "Agent": 82, "ToolSearch": 5, "Write": 3, "ExitPlanMode": 2, "Bash": 15, "Glob": 2}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-11T11:09:44Z - VOICEVOX 辞書強化版 (3 サイクル目) accent_overrides.json 生成: 27 items / 19 patches / needs_listen 10 件 / ナニイロ 辞書未反映 (ナンショク のまま) を warning で報告
- **タスク**: VOICEVOX 辞書強化版 (3 サイクル目) accent_overrides.json 生成: 27 items / 19 patches / needs_listen 10 件 / ナニイロ 辞書未反映 (ナンショク のまま) を warning で報告
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 121
- **エラー数**: 7
- **検出された良いパターン**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 14, "Agent": 81, "ToolSearch": 5, "Write": 3, "ExitPlanMode": 2, "Bash": 14, "Glob": 2}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-11T11:06:57Z - VOICEVOX 作業フォルダパス (固定) を memory/reference_voicevox_workflow_paths.md として新規作成 + MEMORY.md インデックスに追記
- **タスク**: VOICEVOX 作業フォルダパス (固定) を memory/reference_voicevox_workflow_paths.md として新規作成 + MEMORY.md インデックスに追記
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 120
- **エラー数**: 7
- **検出された良いパターン**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 14, "Agent": 80, "ToolSearch": 5, "Write": 3, "ExitPlanMode": 2, "Bash": 14, "Glob": 2}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-11T10:30:06Z - voicevox_user_dict.csv に漢字→訓読み矯正辞書を13語追加 (52→65語)
- **タスク**: voicevox_user_dict.csv に漢字→訓読み矯正辞書を13語追加 (52→65語)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 76
- **エラー数**: 8
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Agent": 18, "Read": 22, "Grep": 21, "ToolSearch": 3, "Write": 1, "ExitPlanMode": 1, "Bash": 9, "Edit": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-11T10:26:57Z - VOICEVOX 漢字混じり版 accent_input から accent_overrides.json を再生成 (27 items / 20 patches)
- **タスク**: VOICEVOX 漢字混じり版 accent_input から accent_overrides.json を再生成 (27 items / 20 patches)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 117
- **エラー数**: 7
- **検出された良いパターン**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 14, "Agent": 78, "ToolSearch": 5, "Write": 3, "ExitPlanMode": 2, "Bash": 13, "Glob": 2}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-11T10:20:39Z - VOICEVOX 発注書 COWORK-TEST-ORDER.md の speech 列を最適化提案通りに 19 件更新（display 列・他セクションは無変更）
- **タスク**: VOICEVOX 発注書 COWORK-TEST-ORDER.md の speech 列を最適化提案通りに 19 件更新（display 列・他セクションは無変更）
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 115
- **エラー数**: 7
- **検出された良いパターン**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 14, "Agent": 77, "ToolSearch": 5, "Write": 3, "ExitPlanMode": 2, "Bash": 12, "Glob": 2}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-11T10:15:50Z - VOICEVOX 発注書 speech 列の最適化提案 (テスト 27 ファイル) を speech_optimization_proposal_test27.md として作成
- **タスク**: VOICEVOX 発注書 speech 列の最適化提案 (テスト 27 ファイル) を speech_optimization_proposal_test27.md として作成
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 114
- **エラー数**: 7
- **検出された良いパターン**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 14, "Agent": 76, "ToolSearch": 5, "Write": 3, "ExitPlanMode": 2, "Bash": 12, "Glob": 2}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-05-11T10:04:58Z - VOICEVOX accent_input.json から子供向けクイズ用 accent_overrides.json を生成 (27 items / 18 patches / needs_listen 8 / medium 1)
- **タスク**: VOICEVOX accent_input.json から子供向けクイズ用 accent_overrides.json を生成 (27 items / 18 patches / needs_listen 8 / medium 1)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 112
- **エラー数**: 7
- **検出された良いパターン**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 14, "Agent": 75, "ToolSearch": 5, "Write": 3, "ExitPlanMode": 2, "Bash": 11, "Glob": 2}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


