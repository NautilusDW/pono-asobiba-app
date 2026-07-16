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
- **maze ラフ → エディタ シームレス auto-handoff + start/goal radius 可変**: [memory/feature_maze_rough_to_editor_workflow.md](memory/feature_maze_rough_to_editor_workflow.md) — ラフを編集すると裏で常時 localStorage に nodes/edges/polyline を書き出し、 エディタタブを開くと自動取り込み (画像差し替えだけで作業継続)。 handoff の viewBox を保持して画像読み込み時に sx=imgW/vb.w で全座標 rescale。 start/goal radius slider 追加 + edges 一括削除 + gh proxy 日本語ファイル名対応 + maze-rough PNG インポート (sw v1000)
- **迷路 1+5 面 story 復元 + maze-editor サーバーステージ load UI** (2026-06-03): ステージ JSON の `story` (animal / animalLabel / cryingIconUrl / reliefIconUrl) が 1+5 面で初版から欠落していて救助対象が出現しないバグを ねこさん (`neko`) / レッサーパンダ (`lesser_panda`) で復元 (アイコンは `maze/imageStages/animals/` 既存)。 `tools/maze-editor.html` に `_index.json` overrides 経由で全ステージを enumerate して読み込む `🌲 既存ステージから開く` ドロップダウン + 4 系統 (auto-draft/named/download/server) を一覧する `💾 保存場所について` details パネル追加。 既知 pre-existing: `_index.json` key `"4"` が `____4_______` placeholder を指して整備済み `ステージ4_キノコの小道.json` がインデックス未登録。 詳細: [project_maze_image_stages.md](C:/Users/surfe/.claude/projects/d--AppDevelopment-pono-asobiba-app/memory/project_maze_image_stages.md) 末尾。 (sw v754)
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
- **ずかん 調査画面 背景バリアント**: [memory/feature_zukan_bg_variants.md](memory/feature_zukan_bg_variants.md) — 1 エリアあたり最大 5 種の背景画像を v1〜v5 で切替。 `zukan/data/zukan-data.js` の spot に `fieldBgVariants` 配列 (length 5, null=未生成) 追加 + 投資画面エディタ (`zukan/preview/investigation/`) に「🌅 背景バリアント」ドロップダウン追加 (HTTP probe で 404 を未生成にダウングレード)。 saved-layout は全 variant で共有 (Phase 1)。 命名規則 `<area>_field_16x9_v<N>.png` (sw v941)
- **Quizland number_sequence カテゴリ**: [memory/feature_quizland_number_sequence.md](memory/feature_quizland_number_sequence.md) — 3歳児向け新カテゴリ「かずのじゅん」(12問)。1〜10 の前後関係 (つぎ/まえ/あいだ)、inspire モードに統合
- **Quizland 最終問題バルーン (sw v1098)**: [memory/feature_quizland_final_q_balloon.md](memory/feature_quizland_final_q_balloon.md) — 最終問題で「だい5もんめ」plate の上に「さいごの もんだい！」透過バルーンを同時表示。ゲートは `totalQuestions>1 && qIdx===total-1`。黒(実は茶ビネット)背景の切り出しは雲/光線別マスク必須
- **Quizland 音声発注書 + 生成ツール (【主軸変更 2026-05-12】 VOICEPEAK 一本化、 VOICEVOX 雨晴はう廃案、 くるみ話者は 「女の子」 → 「女性4」 に再差替)**: [memory/feature_quizland_voicevox_order.md](memory/feature_quizland_voicevox_order.md) — **【主軸変更 2026-05-12】 VOICEVOX 雨晴はう案は廃案、 VOICEPEAK に一本化。 くるみ話者は同日内に 「女の子」 中継確定 → 27 ファイル試聴で却下 → 最終的に 「女性4」 プリセットに再差替で確定** (くるみ 912 件 = 907 + 5、 博士 48 件は VOICEPEAK 「ナレーター おじいさん」 単体購入済)。 発注書 3 本 (`docs/quizland-voicevox-order/COWORK-TEST-ORDER.md` 27件 / `ORDER-FULL.md` 907件 / `ORDER-EXTRA-NON-QUIZ.md` 53件、 全て VOICEPEAK 化書き換え済 + 「女性4」 反映済) + ツールは `tools/voicepeak/` 配下の Convert スクリプト + 辞書 CSV/VDC2 (CSV ナレーター名置換は別 Agent 並列実施中)。 旧 VOICEVOX 関連記述と HTML ツール (`tools/voicevox-generator/voicevox-generator.html` 1570 行 + 52 語辞書)、 および旧 「女の子」 中継案記述は **「【廃案】 過去の検討経緯」 / 「【廃案ツール】」 / 【廃案 2026-05-12】 マーカーとして履歴温存** (削除はユーザー判断待ち)。 ファイル名 `feature_quizland_voicevox_order.md` はリネームすると参照が壊れるため温存、 中身で主軸変更と話者再差替を明示。 詳細な方針転換は [memory/feature_quizland_voicepeak_pivot.md](memory/feature_quizland_voicepeak_pivot.md) と [memory/feature_quizland_voicepeak_pivot_jyosei4.md](memory/feature_quizland_voicepeak_pivot_jyosei4.md)
- **くるみ話者「女の子」→「女性4」 再差替 (2026-05-12 急遽変更)**: [memory/feature_quizland_voicepeak_pivot_jyosei4.md](memory/feature_quizland_voicepeak_pivot_jyosei4.md) — 一度確定した VOICEPEAK 「女の子」 プリセットを 27 ファイル試聴の結果 NG で却下、 「女性4」 プリセットに再差替で最終確定。 全 CSV のナレーター名統一は別 Agent が並列実施中、 本記録は memory + documentation 側の更新ログ。 「女性4」 が 6 ナレーターセット内 or 別売かは要ユーザー確認
- **VOICEVOX 作業フォルダパス (【廃案 2026-05-12】 VOICEVOX 主軸変更で当面不参照)**: [memory/reference_voicevox_workflow_paths.md](memory/reference_voicevox_workflow_paths.md) — **【廃案 2026-05-12】 VOICEVOX 用作業フォルダ。 主軸が VOICEPEAK に切り替わったため当面参照不要**。 旧記述 (`D:\ポノのおへや\Dr.owl'quiz\NA\問題文\` 固定 / accent_input/accent_overrides 運用 / Claude が最新 accent_input を自動検出) は履歴として温存。 VOICEPEAK 作業フォルダは別途定まる。 方針転換は [memory/feature_quizland_voicepeak_pivot.md](memory/feature_quizland_voicepeak_pivot.md)
- **VOICEPEAK VDC2 フォーマット解明**: [memory/reference_voicepeak_vdc2_format.md](memory/reference_voicepeak_vdc2_format.md) — `.vdc2` は UTF-8 JSON 配列、CSV → VDC2 変換スクリプト (Codex by 2026-05-12)
- **【主軸変更 2026-05-12】 VOICEVOX 雨晴はう廃案 + くるみ全件 VOICEPEAK 「女性4」 統一 (旧 「女の子」 中継案は同日内に再試聴で却下) + 博士=ナレーター おじいさん 確定**: [memory/feature_quizland_voicepeak_pivot.md](memory/feature_quizland_voicepeak_pivot.md) — 元々 VOICEVOX 雨晴はうで 907 件の問題本編を発注予定だったが、 試聴で雰囲気が合わず却下。 全 912 件 (= 問題本編 907 + 第1〜5問目 5) を一旦 VOICEPEAK 「女の子」 プリセット (中継) に統一する方針へ → 同日内 27 ファイル試聴で 「女の子」 も却下 → **VOICEPEAK 「女性4」 プリセット** に再差替で最終確定。 **博士担当 48 件 = VOICEPEAK 「ナレーター おじいさん」 (秦なおき声、 2026-05-12 ユーザー単体購入確定 ¥5,980)** で確定 (Plan B = 「男性3 + パラメータ調整 (¥0)」 を温存)、 ポノ = 音声化保留 (babble のまま)。 VOICEVOX 関連スクリプト・ツール・辞書および旧 「女の子」 関連記述は当面温存 (削除はユーザー判断待ち、 【廃案 2026-05-12】 マーカー)。 **【MVP スコープ 2026-05-12 ユーザー確定】 MVP は くるみ 912 件のみ、 博士 48 件は MVP 後回し** (関連準備 — 漢字混じり化 / 辞書 9 語追加 / 「ナレーター おじいさん」 購入済 / 発注書 53 件構造 — はすべて完了済で温存、 MVP リリース後に着手 → 試聴 → 確定値で本格収録)。 今後 「くるみ音声」 「VOICEVOX」 「雨晴はう」 「女の子」 「女性4」 「博士の声」 「ナレーター おじいさん」 「秦なおき」 のキーワードが出たら必ず本ファイル + [memory/feature_quizland_voicepeak_pivot_jyosei4.md](memory/feature_quizland_voicepeak_pivot_jyosei4.md) を参照して文脈確認
- **VOICEPEAK 購入済ボイス一覧 (用途マッピング)**: [memory/reference_voicepeak_voices_purchased.md](memory/reference_voicepeak_voices_purchased.md) — pono-asobiba-app で使用する VOICEPEAK ボイスの購入履歴 + 用途マッピング。 商用可能 6 ナレーターセット (くるみ = **「女性4」 912 件、 2026-05-12 確定、 旧 「女の子」 試聴の結果却下**、 「女性4」 が 6 ナレーターセット内 or 別売かは要ユーザー確認) + 商用可能 ナレーター おじいさん (秦なおき声、 2026-05-12 購入 ¥5,980、 博士 48 件) の 2 製品保有 (+ 「女性4」 別売の場合は 3 製品)。 全製品商用ライセンス内、 サブスクなし買い切り、 1 ライセンス 1 PC で再アクティベーション可
- **Quizland リスのくるみちゃん**: [memory/feature_quizland_kurumi.md](memory/feature_quizland_kurumi.md) — クイズアシスタントキャラ、リスの女の子、元気で優しいお姉さん感、**VOICEPEAK 「女性4」 プリセットで問題文を読み上げ (2026-05-12 確定、 VOICEVOX 雨晴はうは却下、 中継案 「女の子」 も同日内 27 ファイル試聴で却下 → 「女性4」 へ再差替 = [memory/feature_quizland_voicepeak_pivot_jyosei4.md](memory/feature_quizland_voicepeak_pivot_jyosei4.md))**。**立ち絵 13 variants (`kurumi_001` 基準正面 + `hi`/`wave`/`hooray`/`wink`/`clasp`/`idea`/`point`/`calm`/`pray`/`book`/`cheer`/`greet`、 全 variant 同一スタイル統一済 @ `assets/images/characters/kurumi/dance/`)、 OP シネマティック組み込み済 (Panel 2: `kurumi_hi` 発話 → Panel 3/4: `kurumi_clasp` 立ち絵維持 (v937+ 追加) → Panel 5: `kurumi_wink` 発話 → Panel 6: `kurumi_clasp` 立ち絵維持の Panel 2-6 全 5 panel 連続 visible、 「kurumi は Panel 2 で登場したら Panel 6 まで継続表示」 が v937+ プロジェクト確定方針、 **v938+ で Panel 2 line 3 と Panel 5 line 1/2/3 にも `kurumiImg` を追加注入して全 12 line に kurumiImg カバレッジ完了** = kurumi 登場以降の line には必ず kurumiImg を注入する設計原則が確定)、 op-layout-editor に「くるみ側」タブ追加 + **左ペインに Kurumi バリエーションサムネ一覧 (13 ポーズ、 サムネクリックで variant 切替、 ドラッグ&ドロップ未対応)** + **シナリオ行 speaker に「くるみ」追加 (ポノ / はかせ / くるみ の 3 way ラジオ)** + **scenario モードのデフォルトデータ (`defaultScenario()`) を本番 OP_PANELS と完全同期 (v926+)** + **migrate / export 経路の kurumi バグ 3 件修正 (v927+: speaker='kurumi' 強制 hakase 化バグ + buildScenarioPanelsLiteral の 2-way 判定 + kurumiImg シリアライズ追加)** + **scenario の version 付き auto migration (v929+: `SCENARIO_DATA_VERSION` 定数で version 不一致時に defaults 強制 → 既存ユーザーは editor リロードだけで自動移行、 DevTools 手順不要)** + **シナリオ dialogue 行に「ポノ」「はかせ」「くるみ」の 3 dropdown を並列追加 (v931+: `appendCharImgSelect()` 共通ヘルパ / `HAKASE_VARIANTS` + `hakasePathByName` / `hakaseFullPath` ヘルパ / `migrateScenario` の hakaseImg 空値正規化 / `buildScenarioPanelsLiteral` の hakaseImg シリアライズ / SCENARIO_DATA_VERSION v927→v930 bump、 各 line で speaker と独立に 3 キャラの立ち絵 variant を編集可能、 runtime hakaseImg 対応は HAKASE_VARIANTS 1 種のため未実装で将来タスク)** + ローカル editor (`tools/op-layout-editor.html`) → クリップボード Export → orchestrator が `quizland/saved-layout.json` の `__op_layout` にマージという編集ワークフローが v932 で B のみ kurumi の 13 perVariant 全量で正式運用 → v935 で C/D 側にも hakase + kurumi の主要 slot を実値 publish 開始、 B/C/D 全 VC の `kurumi.perVariant` 13 entries が初期値 (`kurumi_001` 値全コピー) から editor 編集後の個別調整値 (B では variant ごとに slotH=278〜380, slotOffsetX=54〜88 が分散、 v935 で `kurumi_clasp` slotH 354→320 / slotOffsetY 0→19 追加調整、 C は `kurumi_001` のみ slotOffsetX=158、 D は `kurumi_001` のみ slotW=550 / slotH=413 / slotOffsetX=158 で上書き) に更新済、 220 keys 完全温存 + v933 で runtime kurumi CSS の per-VC `.op-char-slot` を `right: 0` 右端アンカーから `left: 50% + transform: translate(-50%, -50%)` 中央アンカーに統一 (B/C/D 全 VC、 pono/hakase と同式で editor preview とも一致)、 v932 で焼き込んだ kurumi.perVariant slot 値が runtime で初めて editor で見たままに再現されるようになった (v932 までは runtime kurumi が `right:0` 右端アンカーで editor preview と最大 ~400px ずれていた致命バグの根本修正)、 saved-layout.json は無変更で直したのは「JSON の解釈側」だけの最小局所変更 + **v935 で 06-49-00 Export を merge し VC C / D の hakase.slotOffsetX (C=-27 / D=-142) と kurumi.slotOffsetX (C=158 / D=158) も実値化、 全 VC で hakase + kurumi の主要 slot を実値 publish する成熟段階に入った** + 13 variants × 3 VC で perVariant slot 配信、 babble preset `kurumi` (baseFreq 450)、 saved-layout.json `__op_layout.{B,C,D}.kurumi.perVariant` 13 entries 配信、 speaker は `'kurumi'` または `d.kurumiImg` がある line で立ち絵 visible (OR 条件)。 **editor の「くるみ側」タブは「対話 (P2-6)」モードでのみ表示 — 「ナレ」「シナリオ」モードでは tab-bar 全体が `display: none` になる仕様 (pono / hakase も同じ、 元からの仕様)** (sw v921 OP 初投入 / v922 クロスレビュー反映 / v923 13 variants 管理機能 / v924 クロスレビュー C HIGH3+MED4 修正 / v925 左ペイン Kurumi サムネ + シナリオ speaker 拡張 / v926 editor defaultScenario 本番同期 / v927 editor migrate + export を kurumi 対応 / v929 editor scenario auto migration / v930 editor くるみ側タブ defensive 強化 / v931 editor シナリオ行に hakase + kurumi dropdown 追加 + SCENARIO_DATA_VERSION v930 bump / v932 B の kurumi.perVariant 13 entries 初の本格 publish で実値化 / v933 runtime kurumi CSS 中央アンカー統一で editor preview と一致、 v932 publish 値が runtime で「editor で見たまま」反映 / v934 同値再 export の無変更 publish (sw だけバンプ) / v935 06-49-00 Export で C/D 側にも hakase + kurumi の実値 publish 開始 (12 entries diff) / v936 07-22-05 Export を merge し「全ポーズに反映」ボタンの初実用 publish (B 22 + C 12 + D 36 = 70 entries diff、 全 13 variants が同値同期、 kurumi.perVariant のみ更新で pono/hakase/singleBox/narration は差分ゼロ) / v937 07-31-53 Export merge + Panel 3/4 仕様変更: OP_PANELS Panel 3/4 の各 line に `kurumiImg: kurumi_clasp.webp` 注入 (Panel 2-6 全 5 panel 連続 visible)、 op-layout-editor `defaultScenario()` 同期 + SCENARIO_DATA_VERSION v930→v937 bump で auto migration、 saved-layout.json deep diff 3 entries のみ (B kurumi base box 微調整: `B.kurumi.slotH` 320→303 + `kurumi_001.slotW` 280→227 / `slotH` 278→269)、 C/D 変更なし、 220 keys 完全温存 / **v938 (現行) Panel 2 line 3 + Panel 5 line 1/2/3 にも kurumiImg 追加注入で全 12 line カバレッジ完了**: v937 で Panel 3/4 にも継続表示が成立した後の残課題 (Panel 2 line 3 と Panel 5 line 1/2/3 で kurumi 立ち絵が消えていた) を解消、 quizland/index.html OP_PANELS と op-layout-editor `defaultScenario()` を同期、 SCENARIO_DATA_VERSION v937→v938 bump で auto migration、 saved-layout.json は無変更 (シナリオ JS のみの修正)、 「kurumi 登場以降の全 line に kurumiImg を注入する」 設計原則を明文化、 全 12 line × kurumiImg 完全カバレッジで Panel 2 line 2 〜 Panel 6 末尾まで一切の途切れなく立ち絵 visible 維持)。 **配信フロー固定: ローカル editor → 「📥 Export → JSON ファイル」 → Claude エージェントで saved-layout.json 反映 + sw.js bump (= [reference_op_layout_publish_workflow.md](memory/reference_op_layout_publish_workflow.md))、 「📡 配信」ボタンは使わない**
- **博士最上級セリフ「はかせを こえとるかも しれんのう」 全カテゴリ制覇限定昇格** (未着手): [memory/feature_quizland_hakase_perfect_master_seal.md](memory/feature_quizland_hakase_perfect_master_seal.md) — clear.perfect[2] を 5/5 ランダム発火から「難しい/優しい/物知り 全カテゴリパーフェクトクリア」 限定発火に格上げ、 音声録音は今進める / 発動条件改修は録音完了後
- **過去の候補を ID/ラベルで参照する時は本文併記** (恒久ルール): [memory/feedback_restate_content_when_referring.md](memory/feedback_restate_content_when_referring.md) — D/B1 等の短縮 ID だけで参照せず、 必ず本文を併記してユーザーがスクロールせずに済むようにする
- **Quizland 音声プロジェクト 引き継ぎ書 (次セッション用)**: [tools/voicepeak/HANDOFF-NEXT-SESSION.md](tools/voicepeak/HANDOFF-NEXT-SESSION.md) — sw v966 終了時点の到達点 (くるみ第1-5問目 5 件 mp3 配置完了 / 問題本編 907 件未着手)、 次バッチ = number_sequence (20 ユニーク → 24 q###)、 確定話者 = VOICEPEAK 「女性4」 (くるみ) + 「ナレーター おじいさん」 (博士、 MVP 後回し)、 やってはいけないこと (CSS バナー新規作成 NG / qno_plate デフォルト消去 NG / don 別途再生 NG / VOICEVOX や 「女の子」 提案 NG)、 準備済 CSV/JSON/スクリプト/発注書一覧、 関連 memory ファイル 10 本
- **Quizland VOICEPEAK 進捗追跡 (sw v383, 2026-05-16 = 60/181 問 33%)**: [memory/feature_quizland_voicepeak_progress.md](memory/feature_quizland_voicepeak_progress.md) — 完了 3 (order_color / count_total / number_sequence) + 準備完了 1 (shape_name) + 未着手 4 (trivia / weather / opposite / body)。 セッション再開時に最初に Read して現状把握する進捗追跡メモリ
- **画像生成ルート方針 (2026-06-04 再撤回 = gpt-image-2 単一に戻す)**: 一次経路は **Codex 経由の GPT-Image 2 (OpenAI `gpt-image-1` 系) 単一**。**【履歴】 2026-05-11 に「GPT-Image 2 / Higgsfield の Nano Banana Pro の二択 (キャラ・人物系 → Nano Banana Pro / 抽象・UI 素材・テキスト含む系 → GPT-Image 2)」へ一旦撤回したが、 2026-06-04 にユーザー確認の上で再撤回し、 当初の「GPT-Image 2 単一・他モデル禁止」方針へ戻した** (Nano Banana Pro / Higgsfield ルートは現方針では不採用、 履歴文脈として記録のみ)。Claude Code セッションは生成タスクを直接抱えない — 生成は Codex 側で行い、生成物は `tmp/alpha_pending/<NN>/` 経由で投入され、Claude は最終配置・最適化 (`assets/` への移動、ファイル名整備、軽量化、`sw.js` バンプ、commit) のみ担当。解像度・SAFE エリア・外周ぼかし等の既存ガイドライン ([memory/feedback_codex_canvas_safe_margin.md](memory/feedback_codex_canvas_safe_margin.md)) はそのまま有効
- **【未対処懸案 2026-05-12】 develop / origin/develop divergence 同期残課題**: [memory/project_develop_origin_divergence_pending.md](memory/project_develop_origin_divergence_pending.md) — 19 behind / 5 ahead、 単純 pull --rebase NG (2026-05-12 大事故の根本)、 落ち着いた時間に手動同期 (hook 一時停止 + backup 切り + origin 19 commits 内容確認 → 同期 → hook 復帰)
- **【未対処懸案 2026-05-12】 chip-label v968 4 段防御で残るバグ + v969 attempt 破棄** (v970-v973 で完了): [memory/project_chip_label_v968_residual.md](memory/project_chip_label_v968_residual.md) — 288×240 + 改行混入が v968 で残存、 v969 attempt は rebase 混乱で broken 判定で全破棄。 **v970-v973 で完全解決** = [memory/feature_chip_label_editor_saga.md](memory/feature_chip_label_editor_saga.md) 参照
- **Quizland chip-label / chip-illust レイアウトエディタ編集系の v964-v973 連続修正 (2026-05-12 完了)**: [memory/feature_chip_label_editor_saga.md](memory/feature_chip_label_editor_saga.md) — v964 (.chip-label flex grow 化で wrap 位置ズレ修正) → v967 (.chip-text-editing scope で編集時のみ display:block 復活 + 「第N問」中の問題文/4択 隠蔽 案 C) → v968 (4 段防御: detach/reattach + cloneNode strip + tail regex + idempotency guard) → v970 (saved-layout.json git merge marker 解決 + 全角 [0-9０-９] + 2-pass + 固定点反復 + load-time sanitizer) → v971 (chip-illust img を chip-illust-wrap div でラップして個別 resize 化、 replaced element 問題回避) → v972 (broad strip `<br>` 除外が `<div>line</div>` 中身ごと削除する regression を DOM walk テキスト抽出に置換) → v973 (block 要素 leading `\n` 補完で iOS Safari / Shift+Enter 経路の `<div>` 改行も保護)。 layout-editor の resize handle が target 要素直接子として append される設計 + contenteditable の browser 挙動差異 (Chrome の `<br>` vs Safari の `<div>` vs Firefox 実装依存) への対処パターンは今後の必読知見
- **【恒久ルール 2026-05-12 大事故から導出】 auto-commit hook + 自動 pull --rebase が rebase paused 状態を巻き込む事故の防止策**: [memory/feedback_auto_commit_hook_rebase_risk.md](memory/feedback_auto_commit_hook_rebase_risk.md) — 重要 git 操作 (rebase / merge / cherry-pick / pull --rebase) 前のチェックリスト + 別チャット並走時の運用 + 根本治療オプション 3 案
- **【設計変更 2026-05-12】 VOICEPEAK 全カテゴリ + Phase 1/2 横断ユニーク化案 (次バッチから採用)**: [memory/feature_voicepeak_cross_category_dedup.md](memory/feature_voicepeak_cross_category_dedup.md) — 同一単語 (= 「二」 「三」 「七」 等の数字単独や色名・体パーツ等) を全カテゴリ + Phase 1/2 で 1 wav に集約、 アクセント違いが必要なら後で個別追加。 number_sequence バッチ完了後 order_color 着手前に設計実装
- **【恒久ルール 2026-05-12 大事故から導出】 questions.js の Q### 真値は QUIZLAND_CATEGORIES キー順、 ORDER-FULL.md の宣言順表記は信用しない**: [memory/feedback_questions_js_q_number_canonical_source.md](memory/feedback_questions_js_q_number_canonical_source.md) — Q### は CATEGORIES キー順 (= order_color Q1-24 / count_total Q25-48 / shape_name Q49-71 / **number_sequence Q72-83** / trivia Q84-109 / weather Q110-133 / opposite Q134-157 / body Q158-181) で決まる。 ORDER-FULL.md は宣言順表記で +1 以上ズレている可能性大、 必ず questions.js の CATEGORIES を真値として参照

- **develop / develop-app 単一トランク統合 (2026-07-10 承認・同日 Phase 1-4 実装完了)**: [memory/project_single_trunk_migration.md](memory/project_single_trunk_migration.md) — 2 ブランチ並行開発を廃止し `develop-app` 単一トランク + APP_BUILD/tier 出し分けへ**統合済み**。develop-app push 1回で App/LP 両 staging に自動デプロイ (sw v2078 byte 一致検証済)、**develop は凍結 (0dacb4e4、push 禁止、BRANCH_FROZEN.md)**。Phase 5 (本番) のみ未実施。⚠️ webapp 本番 404 再発中 (error 1042、統合と無関係)。正本は [docs/branch-unification-plan.md](docs/branch-unification-plan.md)、現行ルールは `AGENTS.md` §1.1/§1.2 に反映済み
- **【恒久ルール 2026-07-11】ゲーム開放はユーザーのローンチ判断のみ**: [memory/feedback_no_premature_game_launch.md](memory/feedback_no_premature_game_launch.md) — もじっこファーム (writing-mori) / トントンキッチン (bento/kitchen.html、コロッケ・から揚げ・千切り・肉こね実装済みの完成コード) は**「MVPじゃないからまだダメ」(ユーザー明示)** — コード完成 ≠ ローンチ可。comingSoon+app (旧 sub、2026-07-11 tier 名リネーム) のまま維持し、開放提案を先走らない。未ローンチコンテンツの直 URL 漏れをガードで塞ぐ提案は歓迎
- **batch:1210 パフォーマンス改善後のキャッシュ規約 (2026-07-10, sw v2073)**: [memory/project_perf_batch_1210_cache_conventions.md](memory/project_perf_batch_1210_cache_conventions.md) — HTML no-cache 化 / sw.js 画像・動画・音声 cache-first 化 (**同一URL上書き差し替え NG、要リネーム or ?v バンプ**) / cover-first フラッシュ防止原則 (OP前は不透明カバー→await→旧画面hide の順) / Date.now() バスター原則禁止 (editor 経路のみ可) / 新設定数 QUIZLAND_ASSET_VERSION・MAZE_DATA_REV / WebP 494枚変換 285MB→36MB (原本PNG温存、cleanup 別タスク) / **native/www ミラーは pre-batch のまま要再同期**

- **コマ割アニメーションエディタ + manifest 駆動再生 (2026-05-13)**: [memory/feature_koma_wari_editor.md](memory/feature_koma_wari_editor.md) — `tools/koma-wari-editor.html` (= 単一 HTML、 IndexedDB プロジェクト管理 + Undo/Redo + ガイド線 + マスク + Ctrl+CV/Ctrl-drag + 調整ストック)、 `js/animation-player.js` で `assets/animations/<id>/` の manifest 駆動再生。 quizland `playStagePonoHooray` は新経路 + 旧 fallback で段階的移行

- **quizland 16:9 stage + 完全レターボックス + 継ぎ目=帯解消 (2026-05-14〜15, sw v993→v1001)**: [memory/feature_quizland_contain_fit.md](memory/feature_quizland_contain_fit.md) — v993 contain-fit デフォルト化 → v994 fit ターゲット safe-area 化 → v995 chip 幅微調整 → **v998 で `--canvas-w: 2100 → 1600` で stage を 16:9 化 (旧 21:9 outer 廃止、 saved-layout は tx/ty が natural-flow delta 設計のため無変更)** → **v1000 で 4 帯メディアクエリの `--safe-w` 動的縮小ブロックを全削除 (v998 単独では fitStage が縮小 safe-w を参照して効果ゼロだった残課題の解消)** → **v1001 で `.stage` の背景画像を削除して `.stage-wrap` の背景 1 枚に統一 (stage 内/外で同じ画像を異なるスケールで二重貼りしていたため境界に段差=帯が見えていた残課題の解消)**。 fitStage = `Math.min(w/1600, h/900)` で stage 全体 contain-fit、 画面比違いは 100% レターボックス。 saved-layout.json は v993 以降 0 行変更 (AGENTS.md §3 ルール厳守)。 `?fit=cover` 退避路維持。 **教訓 1: CSS 変数を変えるだけでは効果ゼロのケースあり (依存箇所を grep 全件追跡)。 教訓 2: 同じ画像を異なるスケールで二重貼りすると継ぎ目に段差が見える、 1 枚に統一すべき**

- **パズル 横画面専用化 (2026-05-14, sw v995→v997)**: [memory/feature_puzzle_landscape.md](memory/feature_puzzle_landscape.md) — `puzzle/` を縦画面強制 → 横画面専用に。画像は触らず CSS のみで対応。第1ラウンドで aspect-ratio 3/4→4/3 + notice 反転 + title 中央配置 (sw v996)、クロスレビュー HIGH 2/MED 2 を受けて第2ラウンドで `@media (orientation: landscape) and (pointer: coarse)` 新設し `.main { flex-direction: row }` の **左パズル+右 180px サイドバー** に切替、`.puzzle-frame` を高さベース計算 `min(100vw-220px, (100dvh-110px)*4/3)` に変更 (iPhone 横で 200px 切手化を解消)、ResizeObserver に snappedCount + ±20% 差分の進捗保護ガード追加 (sw v997)

- **writing-mori (かいてひらく！ポノのことばの森) Stage 1「しっぽの こみち」 (2026-05-16, sw v1026)**: [memory/feature_writing_mori_shi_stage1.md](memory/feature_writing_mori_shi_stage1.md) — 既存 `writing/` (RPG) と別の新ゲーム `writing-mori/index.html`。 文字「し」をなぞり → 線が小道に変化 → ポノが歩いてうさぎを発見 → カード獲得。 16:9 固定 1600x900 (contain-fit)、 AnimCJK SVG (U+3057 = 12375 dec、 raw.githubusercontent 一次 + jsdelivr 二次 + 内蔵ベジェ最終fallback)、 子供向けゆるい判定 (START/END_TOLERANCE 110/100px、 カバレッジ72%、 否定語ゼロ)、 `WRITING_STAGES[]` 配列で 50音追加可能。 既存 [pono_001.png] + [dance_hooray.png] 流用 (`naturalWidth/Height` で動的高さ計算)、 AnimCJK は DOMParser で XSS 配慮、 縦画面は `body::before` 警告。 Codex 発注書 = `tmp/alpha_pending/43/CODEX-ORDER-writing-mori-shi.md` (batch 43、 全10種 — 30/31 は別件占有のため空き43)
- **パズル 難易度20ステージ再設計 + 画面背景刷新 (2026-05-15, sw v1001→v1003)**: [memory/feature_puzzle_20stage_redesign.md](memory/feature_puzzle_20stage_redesign.md) — 対象年齢3〜6歳向けに **20ステージ進行 (4→4→6→6→6→9→9→9→12→12→12→12→16→16→16→16→20→20→20→20)** へ再設計。 **v1003 で画面背景を `assets/images/puzzle/bg_carpet_room.jpg` (木のお部屋+中央緑ラグ、 329KB) に差し替え** (中央ラグがパズルボード位置と一致、 左右は植物/本棚/クッション等でピース散布の周辺装飾、 旧 BG_03.webp は他9ゲーム使用中のため温存)。 `pieceShapeStyle` 6段階 (soft-rounded / large-jigsaw / standard-jigsaw / standard-jigsaw-v2 / advanced-jigsaw / advanced-jigsaw-v2)、 `snapAssist` 4段階 (very-strong/strong/medium-strong/normal、 SNAP_DIST = pieceW * ratio で動的計算)、 **90度チャレンジ回転モード** (デフォルトOFF、`window.PUZZLE_CHALLENGE_ROTATION = true` or `localStorage.puzzle_challenge_rotation = 'on'` で有効化、Stage 09 以降のみ作用、タップ検出 < 8px / < 300ms で90度回転、`rotation === 0` の時のみスナップ受理)、 任意角度回転は不可。 新ステージ画像16枚 (Codex 納品 `tmp/alpha_pending/29/` → `assets/images/puzzle/stages/` 配置・JPG最適化、合計5.27MB)、 ポノ特別枠 Stage 05/10/15/20 は既存 `puzzle_pono_*.jpg` 流用 (sleep/water/sparkle/owl)。 横画面用に **ボード幅 0.60→0.55** に縮小+`shufflePieces` を左右ゾーン分配方式に書き換え (偶数 index→左、奇数→右、ゾーン極細時は全域ランダムフォールバック)、 ヒントボタンも同ヘルパー (`scatterPiece`) で統一。 `STAGE_20_PIECE_COUNT` 定数で 20→16 への縮退切替可。 旧 `advanced: true|false` 二分岐は廃止、 全難易度設定は `BASE_STAGES` エントリへ集約 (受け入れ条件「コード直書きしすぎず、ステージ定義データで変更可」厳守) // v411: 16:9 フレーム + 全面散布 + ベージュ背景 (4:3→16:9, P02.png→#F5E6D3 beige, boardMaxW 0.55→0.50, scatter "left/right zone" → "full-frame minus board rect + nearest-neighbor 0.85*pieceSize separation 24 attempts")
- **Quizland ?edit=1 Pause トグル + 結果画面復活** (2026-05-16, sw v1034): [memory/feature_quizland_editor_pause_toggle.md](memory/feature_quizland_editor_pause_toggle.md) — ⏸/▶ トグルで「次の問題への進行」 だけ凍結、 本番と同じ結果画面まで表示できるよう L5565-5571 のスキップガードも撤去。 共通 interface = `window._quizlandPaused || body.layout-editor-paused` の OR 判定
- **パズル オープニングカットシーン (owl-style + per-cut 木枠ナレ + 黒フェード)** (2026-05-17, sw v395 → v400): [memory/feature_puzzle_opening_cutscene.md](memory/feature_puzzle_opening_cutscene.md) — タイトル→パズル間に **3 カット + 木枠ナレ + 黒フェード**。 **v400 で quizland owl doctor `.op-narration` スタイル踏襲** (cream `#fff8e7` + brown shadow + 18px radius + bold 32px + `white-space:pre-wrap`)、 **per-cut MP3 方式** (cut1→OP_C01 11s / cut2→OP_C02 7s / cut3→OP_C03 10s、 各 `audio.ended` で次カットへ)、 cut3 終了で overlay 全体を `.is-fading` 黒 500ms + 300ms hold → パズル開始。 v395 bump 後に別フックが v396 上書きしてキャッシュ整合崩れ (旧 CSS/JS で「cut01 が左に貼り付き右にパズル + ナレ無音 + tut 即発火」現象) → v397 bump で根治。 iOS Safari 対策 (P1 fix): `audio.src` 差替時に `audio.load()` 必須、 `ended` イベント per-cut generation guard、 ダブルバッファ swap は class toggle の前。 教訓: 同一コミット内 = 同一 CACHE_VERSION bump で完結させる、 別フック便乗厳禁
- **パズル ボイスパック 14音声** (2026-05-17, sw v407): [memory/feature_puzzle_voice_pack.md](memory/feature_puzzle_voice_pack.md) — `window.PuzzleVoice` (IIFE, 3 method: playTut/playRandom/stop) で tut 3 + clear 5 + all_clear 2 + hint 1 + next_nudge 3 = 14 mp3 を子供向け音声誘導として組込み。 tutorial step bubble / success modal fanfare / hint btn / next-nudge 6s interval + `.btn-pulse` (scale 1↔1.12) で発火。 per-group `lastPlayedId` で back-to-back 重複回避、 nudge interval は 5 exit path 全停止
- **音タッチ リズムモード Guitar Hero 化** (2026-05-31, sw v703→v722): [memory/feature_oto_rhythm_guitar_hero.md](memory/feature_oto_rhythm_guitar_hero.md) — `oto/index.html` のリズムモードのみ、**画面右78% (left:22%)** に8レーン横一列 + ノート真上から垂直落下 (3.2s) + 鍵盤上端ヒットライン判定方式へ。**v713+ で左メニュー圧縮**: chord-pill 隠し / 11%-160px / ねいろ 3x2 (44px) / ばんそう縦並び 130px、ボタン left = `22% + (idx+0.5)*9.75%` でノート x 座標と viewport 完全一致。v714 で band-group の translateX(-50%) 残置 = 小画面左端切れ修正。v715 で iPad 大画面横向きで鍵盤が消えるバグ修正 = 楕円配置 rule 3 ブロック (portrait base / landscape / iPad landscape) に `body:not(.rhythm-layout)` ガード付与で構造的分離。v716 で `#rhythm-lanes` の不透明背景が全要素を覆い隠すバグ修正 = 背景を `#stage::before` z:1 疑似要素に分離してコンテナ自体は透明化。v717-v718 で **`.gh-lane` の fallback height:100% が JS 同期前に鍵盤エリアを覆うバグ** と **portrait での `.band-group z:11` 中央底配置鍵盤被り** を修正 = `#instruments` を z:5 に昇格 + 左メニュー類を z:2 に下げる + `.instr-btn` 位置に `!important`、最終階層は bgCanvas(0)→背景(1)→Pono/左メニュー(2)→レーン(4)→鍵盤(5)→HUD(8+)。**v711 で真因「AC↔perfクロック累積ドリフト」を発見** = synth/mp3 stems が AC 時間でサンプル精度スケジュール、視覚ノートは perf.now ベース、両クロック ~数 ms/s ドリフトで数秒で音ずれ → `_rhythm.startAcTime` (sec, AC基準) 保持 + `_rhythmTick` 毎フレーム再導出でゼロ化。v712 で `_bandStartAC === 0` 時の即 miss バグ修正 + cleanup 対称化。レーン背景は暗色 navy グラデ (`#050814→#121a33`)、赤ミスフラッシュは `activeNotes.length > 0` のみ発火。**教訓: AudioContext と performance.now は別クロック、長時間ループする音楽同期では毎フレーム AC 基準で再同期が必要**。v720-v721 で GH 化と無関係の**既存バグ**を発見・修正 = ペンタスケール `DOREMI_PENTA=[C4,D4,E4,G4,A4,C5,D5,E5]` (F/Bスキップ) なのにラベル「ファ・シ」のまま残り「ファ以降の音が高い」現象 → `SCALE_LABELS_PENTA=[ド,レ,ミ,ソ,ラ,ド,レ,ミ]` 追加 + `_applyScaleLabels()` でスケール切替時にラベル更新、リズムは SCALE_MODE='major' 強制で譜面と一致。**v722 でタイミング根本治療** = ドラム kick は `subInBar===0` (= 4拍周期 = 小節境界) のみ発火、なのに v721 までは startAcTime を「拍境界」スナップで弱拍に乗ることがあった → **小節境界スナップ** (`bandStartAC + nBars*4*beatSec`) に変更 + **321 カウントダウン** を band beat 同期で AC 由来 perf 時刻 setTimeout で打ち、「スタート!」の瞬間 = 次の小節線 = ドラム kick = 主旋律 1ノート目ヒットライン到達で完全一致。「カウント開始が今より過去になる場合は次の小節まで待ってからカウント開始」を `requiredAheadSec = max(fallSec, countBeats*beatSec)+0.15` で自動確保
- **プロシージャル音楽生成プログラム (Suno風・非ニューラル・決定論的) — sw v746→v747** (2026-06-02): [memory/feature_music_maker.md](memory/feature_music_maker.md) — `js/music-engine.js` (純関数・browser+Node 共用 UMD-ish・DataView WAV・seeded noise) + `js/music-library.js` (5スタイル chiptune/happy-pop/kids-dance/lullaby/march + 3 PD曲 twinkle/mary/auld_lang_syne) + `tools/music-maker.html` (メロディsource→スタイル/BPM/key→`renderArrangement`生成→AudioBuffer再生(preview==export)/WAV保存/太鼓譜面export/波形/?test=1)。メロディ+スタイル→ドラム/ベース/コード/パッド合成、**主旋律不変**、`melodyToChart`で太鼓notesも出力。Path Bプロトタイプを汎用化。Node CLI 17/17 + 15組合せ全非無音 + LEAD忠実度onset完全一致 + 決定論検証済。クロスレビューで MEDIUM 2件(ドラム非整数拍truncate/拍gridドリフト)修正。**v2 (sw v747)** で「伴奏しょぼい/単調」FB対応: ステレオ化+決定論Schroederリバーブ+リードADSR/ビブラート+コンピング(arp/broken/stab)+ベースパターン+`computeSections`セクション強弱+drumフィル+intro/outro、主旋律はbit-exact維持、`minimal`プリセットでv1ロールバック。CLI ALL PASS(636/636 onset exact/section RMS昇順/決定論)、レビューでMEDIUM2件(リバーブ二重パン/Math.random fallback)修正。**恒久ルール**: browser+Node共用JSは純関数+DataView+UMDガード/音声はraw sample数学(Web Audioノードは非決定論)/preview==exportはレンダ済samplesをAudioBuffer再生/noiseはseeded PRNG(Math.random fallback禁止)/拍gridは全トラックround(beat*QUARTER_SEC*sr)統一/ステレオは最終ミックス段に閉じる/dynamicsはbacking密度で出しlead gainは不変/vibrato等変調はonset後rampでonset音程exact死守/intro等のグリッド移動は全トラック+leadを同一offsetで。**Suno教訓**: 有名すぎる曲(きらきら星等)は自作合成でもSuno content-IDの音響指紋照合で"matches an existing recording"弾き(PD無関係)→本ツールでSuno不要化が本筋
- **Mojikko お世話フローのミニトイ (太鼓 + 積み木 + PD童謡Sunoパイプライン) — sw v742→v745** (2026-06-02): [memory/feature_mojikko_care_toys.md](memory/feature_mojikko_care_toys.md) — writing-mori/play.html 内 3 トイ (ball/rattle=太鼓/blocks=積み木)。**太鼓**: v742 で太鼓化したが Web Audio 合成メロディがつっかえる主訴 → **v743 で MP3+chart アーキに全面書き直し** (`HTMLAudioElement` で本物 MP3 連続再生、`audio.currentTime` が唯一の真クロック、入力は譜面側のみ突合でメロディ絶対淀まず、`don.mp3`/新規 `ka.mp3` を AudioBufferSourceNode 再生、譜面 JSON `{audio,startOffset,endOffset,notes:[{time,type}]}`、`playMelodyNote`/`buildDrumChart` 等旧合成系は削除)。**積み木**: v742 の Matter 数値ポート (slop削除/gravity1.0/wall50px 等) は的外れ (物理は正しく視覚側が真因) → v743-v745 で真因修正 = (1)CSS specificity 衝突で `falling` が `top:42px` 重畳し視覚が物理から42px下ズレ→物理時 `falling` 不付与、(2)`setStatic(true)` 凍結で揺れ死→`Sleeping.set`、(3)`enableSleeping:true` 欠落で Sleeping.set が no-op→追加、(4)端っこ抜け→最上段だけ awake+velocityIter 8→12、(5)「ばしょ」ゲージ= `.power-meter` (共有) を `data-toy="blocks"` にスコープして非表示+地面 stageH 314→364 で +50px 下げ (視覚↔物理 lockstep y=340)。**恒久ルール**: 効かない修正は別レイヤー(CSS/DOM/body-state)を疑う/`Sleeping.set`は`enableSleeping:true`必須/setStatic凍結は揺れを殺す/視覚↔物理は常時lockstep/共有UIをトイ別に隠す時は`data-toy`値を実機確認/小ブロックにslop明示禁止/dt clamp 16.67ms。**PD童謡 Suno**: 既存PD録音は content-ID指紋で弾かれる→PDメロディをオルゴール風に新規合成し指紋回避、`tmp/sunoseed/<id>/upload_seed.mp3` 3曲 (きらきら星96/メリー110/蛍の光76 BPM) を Cover種として用意 (Instrument Stemのみ+Coverモード+no vocals、敵対的検証で Auld Lang Syne の音の並び崩れを捕捉・再合成)。残課題: `.rattle-tap-cue` が ka 時も「ドン」表示 / `isStackBodyOut` 天井チェック無し (Low)
- **「もりのなかよし」MVP + Phase 2/3a/3b/3c/3d/3e/3f 改善 — ポノのなかよしパズル パートナー協力モード** (2026-06-05, sw v819): **Phase 3f** で **アライグマボタン表示制御バグ修正** (タイトル画面/パートナー選択モーダル/prestart 中にも 🦝 ぴかっとボタンが表示されるバグを `isPlayActive()` ゲート + MutationObserver + 250ms ポーリングで全状態監視) + **partner-select カード画像レスポンシブ対応** (ポートレート枠を aspect-ratio: 4/5 → 固定高さ 180px、CSS変数 `--pos-default`/`--pos-wide` を @media (min-aspect-ratio: 3/2) で出し分け、partners.js に `imagePositionWide` フィールド追加) + **Codex 発注書作成** (`tmp/alpha_pending/246/CODEX-ORDER-puzzle-partner-portraits.md`: 5キャラ独立立ち絵 1024×1280 GPT-Image 2 単一、cut01-03 集合シーン使い回しを抜本廃止する道筋)。 commit chain 追加: 7abc9cf+277336f (Phase 3f)。 **Phase 3e** で 難易度ラベルを **「かんたん/ふつう/むずかしい」の3段階に統一** (Phase 3d の「ものしり/できる/やさしい」は性格と難易度が混在で混乱を招いたためユーザーFBで撤回)、**星マーク★★★ と「おすすめ」バッジを完全廃止** (基準不明・年齢依存で固定表示は不適切)。最終分類: かんたん=コジカ+アライグマ / ふつう=キツネ+ウサギ+フクロウ / むずかしい=該当なし (将来用に枠のみ残置)。年齢ガイド「3さい〜/4さい〜/5さい〜」は維持。commit chain 追加: 9b04eed (Phase 3e)。 **Phase 3c** で キツネ自動廃止+ヒント統合 (装備時はヒントが「位置+手元シルエット転写」に強化、ドラッグ自動発火完全廃止) / **ヒント回数新テーブル** (装備なし: base1-3+(Lv3で+1)上限3 / キツネ装備: 3+(Stage13+で+1)+(Lv3で+1)上限5) / コジカ全面修正 (緑→青光#3B82F6、反応範囲狭く distMul 1.0/1.2/1.4、最近接スロットのみ反応、離すと magnetic snap SNAP_DIST×1.5-1.9、Stage4以降バグ修正) / アライグマボタン可視化 (z-index 9999, 64x64px最小タップ, 1行ラベル) / partner-select 1行+横スクロール+scroll-snap-type:x / difficulty フィールド追加。 **Phase 3d** で 難易度ラベル文言を子供向けに「ものしり/できる/やさしい」へ + ネガティブ赤を廃止して紫に + opening cut02/cut03 画像内の各キャラ位置を実物確認して object-position 個別調整 (kitsune:18%60% / kojika:78%55% / araiguma:50%60% / usagi:85%75% / fukurou:cut03+50%40%+🔒) + ポートレート枠 1:1→4:5 縦長+150pxに拡大。 フクロウは opening に未登場のため Codex 立ち絵発注書が必要 (要ユーザー判断)。 commit chain: 04a8123(3b実装)+347e5e8(3bdocs)+f2b3118(3c実装)+697f24a(3cdocs)+209a6ca(3d)。 Phase 3b で **フクロウ「なかまはっけん」全面再設計** (盤外ピース長押し0.6秒で隣接ピースを青緑グロー#00C49A、Lv1=1枚/Lv2=2枚+方向ラベル/Lv3=3枚+点線) + **3つの新標準機能**: 「👁 みる」ボタン (半透明完成形重ね表示、トグル常時) / **スタートアニメ** (完成形→「スタート」押下→1200ms 散布アニメ+SE) / **ヒントボタン再設計** (ピース軽タップで選択→押下で正解スロットに金色星、Lv0=1/Lv1=2/Lv2=3/Lv3=5回) + ウサギ「↑」だけ耳と同期rotate (「こっち」テキストは水平固定) を追加。 7要素 (5パートナー+2標準) が色×領域×トリガで完全直交。 commit chain: 04a8123 (Phase 3b 実装) + 347e5e8 (Phase 3b docs)。 [memory/feature_puzzle_mori_no_nakayoshi.md](C:/Users/surfe/.claude/projects/d--AppDevelopment-pono-asobiba-app/memory/feature_puzzle_mori_no_nakayoshi.md) — puzzle/ に 5パートナー (キツネ/コジカ/アライグマ/ウサギ/フクロウ=Stage20解禁) の協力モード追加。 **Phase 3a で各特技の体感を実機FB反映**: **キツネ=手元シルエット透視** (掴んだピース絵柄を正解スロットにgrayscale転写、Lv1=輪郭α0.15/Lv2=画像α0.30/Lv3=画像α0.40+ring3px、オレンジリングで背景隔離) / **コジカ=近接ガイド+枠線強化** (α 0.55/0.70/0.85、ピース本体オレンジ枠線の上に**緑#22c55e 2倍太さ**を nearness 補間で重ね描画) / **アライグマ=ぴかっとおてつだい (ワンショット系新規導入)** (Lv1: 1回×5% / Lv2: 2回×12% / Lv3: 2回×20%、ボタン押下で未スナップピースをランダム自動スナップ、🦝 emoji+黄色glow+金色outline、`window.PonoPuzzleForceSnapPiece()` helper を main.js に追加) / **ウサギ=方向ヒント+「↑こっち」上下反転バグ修正** (テキストを耳と切り離して常時水平表示) / フクロウ=完成形全景プレビュー (Phase 3b で再ブレスト予定)。 設計指針が拡張: 既存5特技は全て continuous だったが **ワンショット系 (回数制限) を採用** = なかよし度の表現が continuous=効果強化 / one-shot=回数増加 の2軸に。 パートナー選択中は `#btn-hint` を非表示にしてフォールバック保険として残す。 partner-select の各カードに assistDesc (動作説明文) を追加。 **なかよし度メーターは「ステージ × パートナー」二次元グリッドで設計** (グローバル累積式は Stage1乱獲でLv5作成→難ステージ一発クリアでリプレイ動機構造的に消失する devil-advocate 指摘を回避)、 ハート 1/3/7 で Lv1「はじめまして」/ Lv2「なかよし」/ Lv3「だいすき」、 Lv昇格カットイン 3000ms (UXレビューで 2s→3s 改修)。 **コレクション画面は「もりのアルバム」** (5×20 グリッドヒートマップ)、 「ずかん」「図鑑」を機能名から外した = 既存 `wordmatch=ポノのもりのずかん` / `zukan=ポノのもりのずかん` / `quizland=フクロウはかせ図鑑系` との「ずかん3兄弟」化重複回避。 ゲーム名「ポノのなかよしパズル」自体は維持し意味づけは機能で実装。 新規モジュール: `puzzle/partners.js` (5キャラ定義) + `bond.js` (localStorage管理、prefix `pono_bond_`) + `assists/{kitsune,kojika,araiguma,usagi,fukurou}.js` + `partner-select.js`/`.css` + `bond-ui.js` + `album.html`/`.js`/`.css`。 main.js は **PonoAssistHooks レジストリ** (8種フック: beforeStageStart/afterStageReady/duringDrag/beforeSnap/afterSnap/drawOverlay/beforeShowSuccess/afterShowSuccess) を介して最小編集。 commit chain: dde67ce + cec372d (auto-commit) + 8bb336b (最終調整)、 オーケストレーション履歴 = ブレスト3 + 実装/修正2 = 計37エージェント・約190万トークン
- **ポノのトントンキッチン Phase 1 (bento/kitchen.html)** (2026-05-16〜17, sw v419): [memory/feature_bento_tonton_kitchen_phase1.md](memory/feature_bento_tonton_kitchen_phase1.md) — 既存お弁当の前段ミニゲーム。 **SPA 3画面構造 (select / chop / fridge)** で各画面1ステップ集中、 5ステップフローチップで動的アクティブ化＋強制切替。 にんじん 1材料 end-to-end (5タップで切る → 冷蔵庫 NEW! バッジ → レシピ3種解放)、 残り5材料は Phase 2。 `unlockedIngredients` は解放型 (localStorage `bentoUnlockedIngredients` / `bentoNewIngredients`)。 冷蔵庫は `rotateY(-92deg)` で左ヒンジ扉が開く演出。 chop 進捗中の「もどる」は画面内モーダルで確認。 **v382 で 16:9 contain-fit (1600×900 stage)化、 v387〜v391 で chop 画面背景 PNG 化 + cutting-board 基準 % レイアウト、 v393 で chop メカニクス (startX_pct/endX_pct/liftY_pct/chopY_pct/maskAxis/bladeTipOffsetX_pct) をコード管理化 + chopProgress 1 つの式で包丁横移動とマスク削れを完全連動、 v398 で editor マーカー 4 種導入したが v399 で 3 マーカー撤去 (ユーザー混乱「赤いやつ何のため？」「マスク？それはまだつけなくていい」)、 にんじん位置は chopMechanics.ingredientLeft/Top/Width_pct で Claude がコード値調整する方式に、 v401 で .knife の pointer-events:none drag 不能バグ解消 + 新 knife.png (953×1242 縦長、余白削減) 差替 + bladeTipOffsetX_pct -12.34→-39 再測定、 v402 で chopY-marker も同 pointer-events バグ + 視認性不足解消、 v403 で saved-layout.json の `.chopY-marker|0@carrot: { tx:0, ty:0 }` エントリ削除で画面外消滅 1 つ目解消、 v405 で chopY-marker editor mode 消滅の真因 (editor が `.resizable` クラス付与 → `body.layout-editor-on .resizable:not([data-le-keep-position])` で `position:absolute → relative` 強制変換 → 中央寄せ崩壊) を `data-le-keep-position="1"` 属性付与 + CSS `position: absolute !important` の二段構えで解消 (恒久ルール: editor 対象で position: absolute を維持する要素は data-le-keep-position 必須)、 v406 で v399 撤去の `.ingredient-bbox-marker` (緑 dashed rect) を v405 知見ベース (data-le-keep-position + position:absolute !important) で再導入して食材本体の位置・サイズを editor で WYSIWYG 調整可能化、 applyIngredientPlacement (コード値) と marker 編集の二段レイヤリングで共存、 v408 で bbox-marker 初期位置ずれを seedIngredientBboxFromOnBoard で解消 + MutationObserver で marker.style 変化を監視してリアルタイム drag/resize 同期 (今後 marker 追加時の定型パターンとして確立)、 v410 で startX/endX 青/赤 縦線 marker を editor 化 (合計 4 marker)、 v411 で縦線 marker hit area 24×100px 拡大 + ::before で視覚分離して本体 drag 可能化、 v412 で z-index 階層化 (縦線最前面 z:6)、 v414 で **chop メカニクスをモデル A→B に変更** (`t = (chopProgress - 1) / (chopCount - 1)` で startX = 最初の切り口、 endX = 最後の切り口、 ユーザー直感通り)、 chopCount を食材ごとに変えるだけで切り方アレンジ可能 (にんじん 5 / キャベツ千切り 15-20 / ハンバーグこね 3 等)、 v415 で editor mode 時の画面上部 toolbar 隠れ問題を fitStage で toolbar 分オフセット、 v417 で **包丁 Y 移動が動かない真因 (CSS 変数を transform 内に置くと transition 不発、 Chrome 119+/Safari 18+ 挙動) を style.transform 直接代入で解消** (恒久ルール: transform 内に var() を入れない、 動的変更は JS から transform 文字列を直接代入)、 v419 で **chop アニメを直角リニアモーション化** (knife を wrapper + inner の 2 層構造に再編、 wrapper = editor 用 / inner = chop アニメ用で責務分離して「同じ要素の transform を奪い合う」競合を解消、 アニメは「下 → 上 → 左」の 3 フェーズ 0.1s linear で完全直角化、 恒久ルール: editor と独自アニメが同じプロパティを書く時は wrapper/inner で DOM 階層分離)**。 既存 `bento/index.html` (おかず49種+NPC6体+三色sk判定) は無変更で温存、 Phase 3 で連携予定。 仕様書 = `tmp/Bento/pono_tonton_kitchen_claude_code_instructions.md`

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

### 2026-07-16T13:05:01Z - 独立レビュー指摘3件(oto set-trigger fail-safe proxy)の精査と修正: 誤診断コメント訂正+rhythm-layout追従バグ修正+sw.js CACHE_VERSIONバンプ
- **タスク**: 独立レビュー指摘3件(oto set-trigger fail-safe proxy)の精査と修正: 誤診断コメント訂正+rhythm-layout追従バグ修正+sw.js CACHE_VERSIONバンプ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 0
- **エラー数**: 0
- **検出された良いパターン**: なし
- **検出された悪いパターン**: なし
- **有効だったアクション**: 特になし
- **ツール使用統計**: {}
- **サマリ**: 行動ログが空のため分析できません。


### 2026-07-16T12:43:23Z - 設定ボタンが複数ゲームで反応しない緊急バグの修正 (batch:1320)
- **タスク**: 設定ボタンが複数ゲームで反応しない緊急バグの修正 (batch:1320)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 0
- **エラー数**: 0
- **検出された良いパターン**: なし
- **検出された悪いパターン**: なし
- **有効だったアクション**: 特になし
- **ツール使用統計**: {}
- **サマリ**: 行動ログが空のため分析できません。


### 2026-07-16T11:34:57Z - わたしのおうちをプロフィールへ移設 + パズルのチュートリアルOFF時タイトル閉塞バグ修正 (batch:1319)
- **タスク**: わたしのおうちをプロフィールへ移設 + パズルのチュートリアルOFF時タイトル閉塞バグ修正 (batch:1319)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 0
- **エラー数**: 0
- **検出された良いパターン**: なし
- **検出された悪いパターン**: なし
- **有効だったアクション**: 特になし
- **ツール使用統計**: {}
- **サマリ**: 行動ログが空のため分析できません。


### 2026-07-16T11:05:38Z - わたしのおうち導線を設定モーダルからプロフィール画面へ移設(ストリームA)
- **タスク**: わたしのおうち導線を設定モーダルからプロフィール画面へ移設(ストリームA)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 0
- **エラー数**: 0
- **検出された良いパターン**: なし
- **検出された悪いパターン**: なし
- **有効だったアクション**: 特になし
- **ツール使用統計**: {}
- **サマリ**: 行動ログが空のため分析できません。


### 2026-07-16T10:40:53Z - 「今日のチャレンジ」とスタンプラリーの一本化 + 関連バグ3件修正 (batch:1318)
- **タスク**: 「今日のチャレンジ」とスタンプラリーの一本化 + 関連バグ3件修正 (batch:1318)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 0
- **エラー数**: 0
- **検出された良いパターン**: なし
- **検出された悪いパターン**: なし
- **有効だったアクション**: 特になし
- **ツール使用統計**: {}
- **サマリ**: 行動ログが空のため分析できません。


### 2026-07-16T10:14:57Z - bento/kitchen.html クッキングお題の誤発火バグ修正(refreshUnlockedRecipesにfromGameplayフラグ追加)
- **タスク**: bento/kitchen.html クッキングお題の誤発火バグ修正(refreshUnlockedRecipesにfromGameplayフラグ追加)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 0
- **エラー数**: 0
- **検出された良いパターン**: なし
- **検出された悪いパターン**: なし
- **有効だったアクション**: 特になし
- **ツール使用統計**: {}
- **サマリ**: 行動ログが空のため分析できません。


### 2026-07-16T09:55:24Z - 独立レビュー指摘(Holistic)の精査と修正: 宝箱演出tier判定漏れ/レガシーデイリーラリーno-op漏れ/batch ID drift
- **タスク**: 独立レビュー指摘(Holistic)の精査と修正: 宝箱演出tier判定漏れ/レガシーデイリーラリーno-op漏れ/batch ID drift
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 0
- **エラー数**: 0
- **検出された良いパターン**: なし
- **検出された悪いパターン**: なし
- **有効だったアクション**: 特になし
- **ツール使用統計**: {}
- **サマリ**: 行動ログが空のため分析できません。


### 2026-07-16T09:39:10Z - 4ストリーム統合: sw.js CACHE_VERSION 2234->2235バンプ + play.htmlバージョン同期(今日のチャレンジ一本化/宝箱演出復旧/first-clear tier修正)
- **タスク**: 4ストリーム統合: sw.js CACHE_VERSION 2234->2235バンプ + play.htmlバージョン同期(今日のチャレンジ一本化/宝箱演出復旧/first-clear tier修正)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 0
- **エラー数**: 0
- **検出された良いパターン**: なし
- **検出された悪いパターン**: なし
- **有効だったアクション**: 特になし
- **ツール使用統計**: {}
- **サマリ**: 行動ログが空のため分析できません。


### 2026-07-16T09:25:05Z - QUEST_POOL拡張(なぞなぞ/クッキング/もじっこファーム)+3新ゲームへのPonoGameStickerGranted完了シグナル追加
- **タスク**: QUEST_POOL拡張(なぞなぞ/クッキング/もじっこファーム)+3新ゲームへのPonoGameStickerGranted完了シグナル追加
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 0
- **エラー数**: 0
- **検出された良いパターン**: なし
- **検出された悪いパターン**: なし
- **有効だったアクション**: 特になし
- **ツール使用統計**: {}
- **サマリ**: 行動ログが空のため分析できません。


