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
- **画像生成ルート方針 (2026-05-11 更新)**: 一次経路は **Codex 経由の GPT-Image 2 (OpenAI `gpt-image-1` 系)** か **Higgsfield の Nano Banana Pro** の二択。被写体・用途で使い分ける (キャラ・人物系 → Nano Banana Pro / 抽象・UI 素材・テキスト含む系 → GPT-Image 2、運用知見が貯まり次第追記)。Claude Code セッションは生成タスクを直接抱えない — 生成は Codex / Higgsfield 側で行い、生成物は `tmp/alpha_pending/<NN>/` 経由で投入され、Claude は最終配置・最適化 (`assets/` への移動、ファイル名整備、軽量化、`sw.js` バンプ、commit) のみ担当。**以前の「GPT Image 2 単一・他モデル禁止」方針は撤回**、現方針は GPT-Image 2 / Nano Banana Pro の使い分け。解像度・SAFE エリア・外周ぼかし等の既存ガイドライン ([memory/feedback_codex_canvas_safe_margin.md](memory/feedback_codex_canvas_safe_margin.md)) はそのまま有効
- **【未対処懸案 2026-05-12】 develop / origin/develop divergence 同期残課題**: [memory/project_develop_origin_divergence_pending.md](memory/project_develop_origin_divergence_pending.md) — 19 behind / 5 ahead、 単純 pull --rebase NG (2026-05-12 大事故の根本)、 落ち着いた時間に手動同期 (hook 一時停止 + backup 切り + origin 19 commits 内容確認 → 同期 → hook 復帰)
- **【未対処懸案 2026-05-12】 chip-label v968 4 段防御で残るバグ + v969 attempt 破棄** (v970-v973 で完了): [memory/project_chip_label_v968_residual.md](memory/project_chip_label_v968_residual.md) — 288×240 + 改行混入が v968 で残存、 v969 attempt は rebase 混乱で broken 判定で全破棄。 **v970-v973 で完全解決** = [memory/feature_chip_label_editor_saga.md](memory/feature_chip_label_editor_saga.md) 参照
- **Quizland chip-label / chip-illust レイアウトエディタ編集系の v964-v973 連続修正 (2026-05-12 完了)**: [memory/feature_chip_label_editor_saga.md](memory/feature_chip_label_editor_saga.md) — v964 (.chip-label flex grow 化で wrap 位置ズレ修正) → v967 (.chip-text-editing scope で編集時のみ display:block 復活 + 「第N問」中の問題文/4択 隠蔽 案 C) → v968 (4 段防御: detach/reattach + cloneNode strip + tail regex + idempotency guard) → v970 (saved-layout.json git merge marker 解決 + 全角 [0-9０-９] + 2-pass + 固定点反復 + load-time sanitizer) → v971 (chip-illust img を chip-illust-wrap div でラップして個別 resize 化、 replaced element 問題回避) → v972 (broad strip `<br>` 除外が `<div>line</div>` 中身ごと削除する regression を DOM walk テキスト抽出に置換) → v973 (block 要素 leading `\n` 補完で iOS Safari / Shift+Enter 経路の `<div>` 改行も保護)。 layout-editor の resize handle が target 要素直接子として append される設計 + contenteditable の browser 挙動差異 (Chrome の `<br>` vs Safari の `<div>` vs Firefox 実装依存) への対処パターンは今後の必読知見
- **【恒久ルール 2026-05-12 大事故から導出】 auto-commit hook + 自動 pull --rebase が rebase paused 状態を巻き込む事故の防止策**: [memory/feedback_auto_commit_hook_rebase_risk.md](memory/feedback_auto_commit_hook_rebase_risk.md) — 重要 git 操作 (rebase / merge / cherry-pick / pull --rebase) 前のチェックリスト + 別チャット並走時の運用 + 根本治療オプション 3 案
- **【設計変更 2026-05-12】 VOICEPEAK 全カテゴリ + Phase 1/2 横断ユニーク化案 (次バッチから採用)**: [memory/feature_voicepeak_cross_category_dedup.md](memory/feature_voicepeak_cross_category_dedup.md) — 同一単語 (= 「二」 「三」 「七」 等の数字単独や色名・体パーツ等) を全カテゴリ + Phase 1/2 で 1 wav に集約、 アクセント違いが必要なら後で個別追加。 number_sequence バッチ完了後 order_color 着手前に設計実装
- **【恒久ルール 2026-05-12 大事故から導出】 questions.js の Q### 真値は QUIZLAND_CATEGORIES キー順、 ORDER-FULL.md の宣言順表記は信用しない**: [memory/feedback_questions_js_q_number_canonical_source.md](memory/feedback_questions_js_q_number_canonical_source.md) — Q### は CATEGORIES キー順 (= order_color Q1-24 / count_total Q25-48 / shape_name Q49-71 / **number_sequence Q72-83** / trivia Q84-109 / weather Q110-133 / opposite Q134-157 / body Q158-181) で決まる。 ORDER-FULL.md は宣言順表記で +1 以上ズレている可能性大、 必ず questions.js の CATEGORIES を真値として参照

- **コマ割アニメーションエディタ + manifest 駆動再生 (2026-05-13)**: [memory/feature_koma_wari_editor.md](memory/feature_koma_wari_editor.md) — `tools/koma-wari-editor.html` (= 単一 HTML、 IndexedDB プロジェクト管理 + Undo/Redo + ガイド線 + マスク + Ctrl+CV/Ctrl-drag + 調整ストック)、 `js/animation-player.js` で `assets/animations/<id>/` の manifest 駆動再生。 quizland `playStagePonoHooray` は新経路 + 旧 fallback で段階的移行

- **quizland 16:9 stage + 完全レターボックス + 継ぎ目=帯解消 (2026-05-14〜15, sw v993→v1001)**: [memory/feature_quizland_contain_fit.md](memory/feature_quizland_contain_fit.md) — v993 contain-fit デフォルト化 → v994 fit ターゲット safe-area 化 → v995 chip 幅微調整 → **v998 で `--canvas-w: 2100 → 1600` で stage を 16:9 化 (旧 21:9 outer 廃止、 saved-layout は tx/ty が natural-flow delta 設計のため無変更)** → **v1000 で 4 帯メディアクエリの `--safe-w` 動的縮小ブロックを全削除 (v998 単独では fitStage が縮小 safe-w を参照して効果ゼロだった残課題の解消)** → **v1001 で `.stage` の背景画像を削除して `.stage-wrap` の背景 1 枚に統一 (stage 内/外で同じ画像を異なるスケールで二重貼りしていたため境界に段差=帯が見えていた残課題の解消)**。 fitStage = `Math.min(w/1600, h/900)` で stage 全体 contain-fit、 画面比違いは 100% レターボックス。 saved-layout.json は v993 以降 0 行変更 (AGENTS.md §3 ルール厳守)。 `?fit=cover` 退避路維持。 **教訓 1: CSS 変数を変えるだけでは効果ゼロのケースあり (依存箇所を grep 全件追跡)。 教訓 2: 同じ画像を異なるスケールで二重貼りすると継ぎ目に段差が見える、 1 枚に統一すべき**

- **パズル 横画面専用化 (2026-05-14, sw v995→v997)**: [memory/feature_puzzle_landscape.md](memory/feature_puzzle_landscape.md) — `puzzle/` を縦画面強制 → 横画面専用に。画像は触らず CSS のみで対応。第1ラウンドで aspect-ratio 3/4→4/3 + notice 反転 + title 中央配置 (sw v996)、クロスレビュー HIGH 2/MED 2 を受けて第2ラウンドで `@media (orientation: landscape) and (pointer: coarse)` 新設し `.main { flex-direction: row }` の **左パズル+右 180px サイドバー** に切替、`.puzzle-frame` を高さベース計算 `min(100vw-220px, (100dvh-110px)*4/3)` に変更 (iPhone 横で 200px 切手化を解消)、ResizeObserver に snappedCount + ±20% 差分の進捗保護ガード追加 (sw v997)

- **writing-mori (かいてひらく！ポノのことばの森) Stage 1「しっぽの こみち」 (2026-05-16, sw v1026)**: [memory/feature_writing_mori_shi_stage1.md](memory/feature_writing_mori_shi_stage1.md) — 既存 `writing/` (RPG) と別の新ゲーム `writing-mori/index.html`。 文字「し」をなぞり → 線が小道に変化 → ポノが歩いてうさぎを発見 → カード獲得。 16:9 固定 1600x900 (contain-fit)、 AnimCJK SVG (U+3057 = 12375 dec、 raw.githubusercontent 一次 + jsdelivr 二次 + 内蔵ベジェ最終fallback)、 子供向けゆるい判定 (START/END_TOLERANCE 110/100px、 カバレッジ72%、 否定語ゼロ)、 `WRITING_STAGES[]` 配列で 50音追加可能。 既存 [pono_001.png] + [dance_hooray.png] 流用 (`naturalWidth/Height` で動的高さ計算)、 AnimCJK は DOMParser で XSS 配慮、 縦画面は `body::before` 警告。 Codex 発注書 = `tmp/alpha_pending/43/CODEX-ORDER-writing-mori-shi.md` (batch 43、 全10種 — 30/31 は別件占有のため空き43)
- **パズル 難易度20ステージ再設計 + 画面背景刷新 (2026-05-15, sw v1001→v1003)**: [memory/feature_puzzle_20stage_redesign.md](memory/feature_puzzle_20stage_redesign.md) — 対象年齢3〜6歳向けに **20ステージ進行 (4→4→6→6→6→9→9→9→12→12→12→12→16→16→16→16→20→20→20→20)** へ再設計。 **v1003 で画面背景を `assets/images/puzzle/bg_carpet_room.jpg` (木のお部屋+中央緑ラグ、 329KB) に差し替え** (中央ラグがパズルボード位置と一致、 左右は植物/本棚/クッション等でピース散布の周辺装飾、 旧 BG_03.webp は他9ゲーム使用中のため温存)。 `pieceShapeStyle` 6段階 (soft-rounded / large-jigsaw / standard-jigsaw / standard-jigsaw-v2 / advanced-jigsaw / advanced-jigsaw-v2)、 `snapAssist` 4段階 (very-strong/strong/medium-strong/normal、 SNAP_DIST = pieceW * ratio で動的計算)、 **90度チャレンジ回転モード** (デフォルトOFF、`window.PUZZLE_CHALLENGE_ROTATION = true` or `localStorage.puzzle_challenge_rotation = 'on'` で有効化、Stage 09 以降のみ作用、タップ検出 < 8px / < 300ms で90度回転、`rotation === 0` の時のみスナップ受理)、 任意角度回転は不可。 新ステージ画像16枚 (Codex 納品 `tmp/alpha_pending/29/` → `assets/images/puzzle/stages/` 配置・JPG最適化、合計5.27MB)、 ポノ特別枠 Stage 05/10/15/20 は既存 `puzzle_pono_*.jpg` 流用 (sleep/water/sparkle/owl)。 横画面用に **ボード幅 0.60→0.55** に縮小+`shufflePieces` を左右ゾーン分配方式に書き換え (偶数 index→左、奇数→右、ゾーン極細時は全域ランダムフォールバック)、 ヒントボタンも同ヘルパー (`scatterPiece`) で統一。 `STAGE_20_PIECE_COUNT` 定数で 20→16 への縮退切替可。 旧 `advanced: true|false` 二分岐は廃止、 全難易度設定は `BASE_STAGES` エントリへ集約 (受け入れ条件「コード直書きしすぎず、ステージ定義データで変更可」厳守)

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

### 2026-05-16T06:06:01Z - writing-mori クロスレビュー指摘 B-1/B-3/H-3/H-4/M-3/M-4/M-5/N-1/N-3 反映 (commit なし)
- **タスク**: writing-mori クロスレビュー指摘 B-1/B-3/H-3/H-4/M-3/M-4/M-5/N-1/N-3 反映 (commit なし)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 27
- **エラー数**: 3
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 10, "Glob": 7, "Bash": 3, "Agent": 6, "ToolSearch": 1}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-16T05:51:57Z - クイズランド: 正解アニメを loop=false で最終フレーム停止 + 全問題タイプ (trivia含む) で左下ポノ表示するよう has-trivia-pono ガードを 4 箇所撤去 (sw.js v1025)
- **タスク**: クイズランド: 正解アニメを loop=false で最終フレーム停止 + 全問題タイプ (trivia含む) で左下ポノ表示するよう has-trivia-pono ガードを 4 箇所撤去 (sw.js v1025)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 91
- **エラー数**: 2
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: なし
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 39, "ToolSearch": 1, "Grep": 1, "Bash": 46, "Read": 4}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。


### 2026-05-16T05:51:25Z - クイズランド: 左下ポノを全タイプ(trivia含む)で表示 (loadQuestionの分岐撤去 + body.has-trivia-pono .stage-pono display:none ルールをコメントアウト + playStagePonoThinking/Hoorayの has-trivia-pono ガード撤去 / sw v1025)
- **タスク**: クイズランド: 左下ポノを全タイプ(trivia含む)で表示 (loadQuestionの分岐撤去 + body.has-trivia-pono .stage-pono display:none ルールをコメントアウト + playStagePonoThinking/Hoorayの has-trivia-pono ガード撤去 / sw v1025)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 90
- **エラー数**: 2
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: なし
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 39, "ToolSearch": 1, "Grep": 1, "Bash": 45, "Read": 4}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。


### 2026-05-16T05:48:49Z - クイズランド正解スタンプアニメを1回再生で最終フレーム停止に変更 (manifest loop=false + playStagePonoHooray の 2.5s タイマー削除 / sw v1024)
- **タスク**: クイズランド正解スタンプアニメを1回再生で最終フレーム停止に変更 (manifest loop=false + playStagePonoHooray の 2.5s タイマー削除 / sw v1024)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 16
- **エラー数**: 3
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 8, "Glob": 5, "Bash": 1, "Agent": 2}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-16T05:07:44Z - ポノアニメ完全共通寸法化(478×394, 全9フレーム同一bbox) + セリフ編集エディタモード時に.char-hint強制可視化(ライブプレビューが見えるように) + 一時スクリプト掃除 (sw.js v1023)
- **タスク**: ポノアニメ完全共通寸法化(478×394, 全9フレーム同一bbox) + セリフ編集エディタモード時に.char-hint強制可視化(ライブプレビューが見えるように) + 一時スクリプト掃除 (sw.js v1023)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 87
- **エラー数**: 2
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: なし
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 37, "ToolSearch": 1, "Grep": 1, "Bash": 44, "Read": 4}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。


### 2026-05-16T05:06:57Z - エディタモードでフクロウ博士の吹き出しをライブプレビュー用に強制可視化 (.char-hint を display:flex/visibility:visible/opacity:0.95 で常時表示)
- **タスク**: エディタモードでフクロウ博士の吹き出しをライブプレビュー用に強制可視化 (.char-hint を display:flex/visibility:visible/opacity:0.95 で常時表示)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 84
- **エラー数**: 2
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: なし
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 37, "ToolSearch": 1, "Grep": 1, "Bash": 41, "Read": 4}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。


### 2026-05-16T05:05:14Z - pono-thinking/correct-stamp の全9フレームを共通union bboxで再クロップして同一寸法に統一 (478x394) + sw v1023
- **タスク**: pono-thinking/correct-stamp の全9フレームを共通union bboxで再クロップして同一寸法に統一 (478x394) + sw v1023
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 84
- **エラー数**: 2
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: なし
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 37, "ToolSearch": 1, "Grep": 1, "Bash": 41, "Read": 4}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。


### 2026-05-16T04:54:22Z - セリフ編集モーダル: ×ボタン修正 (.hidden クラス化) + 14:9/4:3 スライダー削除 16:9 単一化 + textarea/サイズのライブプレビューを実吹き出しに反映 (sw.js v1022) + 前タスクの v1021 (anim-player width/height 属性漏れ修正) 完了
- **タスク**: セリフ編集モーダル: ×ボタン修正 (.hidden クラス化) + 14:9/4:3 スライダー削除 16:9 単一化 + textarea/サイズのライブプレビューを実吹き出しに反映 (sw.js v1022) + 前タスクの v1021 (anim-player width/height 属性漏れ修正) 完了
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 81
- **エラー数**: 2
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: なし
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 35, "ToolSearch": 1, "Grep": 1, "Bash": 40, "Read": 4}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。


### 2026-05-16T04:53:45Z - セリフ編集モーダル: ×ボタン修復 / 16:9単一スライダー化 / ライブプレビュー追加 (sw v1022)
- **タスク**: セリフ編集モーダル: ×ボタン修復 / 16:9単一スライダー化 / ライブプレビュー追加 (sw v1022)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 80
- **エラー数**: 2
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: なし
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 35, "ToolSearch": 1, "Grep": 1, "Bash": 39, "Read": 4}
- **サマリ**: 成功タスク: 1個の有効パターンを検出。


