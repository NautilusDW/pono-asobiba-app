> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# AGENTS_CLAIMS — 「いま誰が何を触ってるか」 アクティブ・ボード

このファイルは **進行中の編集スコープだけ** を載せる短いボードです。 申し送り履歴・完了報告は [`HANDOFF.md`](./HANDOFF.md) が担当します。 詳細ルールは [AGENTS.md §4.9](./AGENTS.md) を参照。

---

## 使い方 (Claude / Codex / 人間 全員)

### 作業開始時 (新しいバッチを切る瞬間)
1. **このファイルを読む** (Active claims を全部見る)
2. 自分が触りたいパス (ディレクトリ or ファイル) と他者の active claim が **衝突していないか** 確認
3. 衝突あり → ユーザーに 1 行 ping (「○○ と被るけど続行します」 と宣言) → そのまま作業開始 (返答待ちで止まらない)。 自分の claim 行の末尾に `[overlap: <相手の batch ID>]` を付記。 物理衝突 (= 同じ行/関数) は `.git/hooks/pre-push` + `git pull --rebase` で必ず検知されるので、 そこが最後の砦。 ユーザーが明示的に「待って」 と言った時だけ停止
4. 衝突なし → 下の `## Active claims` セクションに **1 行追記** してから編集開始
5. 編集開始の前に `git pull --rebase origin <current-branch>` で最新を取り込む

### 作業終了時 (push が完了した直後)
- 自分の claim 行を **完全削除** して commit (`chore(claims): remove finished claim (no sw)` 等)
- HANDOFF.md には別途完了報告を残す (役割が違うので両方必要)
- 削除し忘れて 4 時間以上残っていたら、 他者が「これゾンビ?」 と ユーザーに確認して削除して OK

### push 直前
- もう一度 `git pull --rebase origin <current-branch>` を実行
- `.git/hooks/pre-push` が「behind なら block」 するので、 block されたら必ず pull --rebase してから再 push (`--no-verify` 禁止)

### claim 同時編集で merge conflict が出たとき

セッション A と B が同タイミングで claim 行を追記して push すると、 `AGENTS_CLAIMS.md` 自体が 3-way merge conflict になることがあります。 **どちらかを捨ててはいけません**。 両者ともまだアクティブな claim だからです。

対応手順:
1. `git pull --rebase origin <current-branch>` で conflict マーク (`<<<<<<<` / `=======` / `>>>>>>>`) が現れる
2. `AGENTS_CLAIMS.md` をエディタで開き、 `## Active claims` 内の **両方の claim 行を保持** (時系列順に並べる)
3. conflict マークを削除
4. `git add AGENTS_CLAIMS.md && git rebase --continue`
5. 再度 push

つまり claim conflict の「勝者・敗者」 は決めず、 **両方を共存** させる運用です。

---

## 行フォーマット

```
- <YYYY-MM-DD HH:MM> - <by Claude | by Codex | by Human> - [batch:NN-topic] - <touch paths (glob OK)> - <one-line goal>
```

例:
```
- 2026-06-27 10:32 - by Claude - [batch:858-puzzle-stage6] - puzzle/**, sw.js - stage6 追加 + sw bump
- 2026-06-27 10:35 - by Codex - [batch:859-lp-shop-copy] - index.html - LP 絵本セクションのコピー差し替え
- 2026-06-27 11:02 - by Human - [batch:860-hand-edit] - assets/ui/** - 画像 alpha 抜き手作業
```

---

## Active claims

- 2026-07-25 - by Codex - [batch:1474-towncraft-spritecook-dualgrid] - DONE - unity/PonoNativeGames/Assets/Pono/Games/TownCraft/**, docs/TOWNCRAFT_TOPDOWN_TILE_SYSTEM_2026-07-25.md, tmp/alpha_pending/1474-spritecook-towncraft-test/**, AGENTS.md, HANDOFF.md, AGENTS_CLAIMS.md - GPT Image 2固定のSpriteCookで控えめ草土15-pieceを追加生成。華やか／控えめatlasをローカル透過処理し、Unity dual-grid rendererと地形切替、道沿い街灯へ統合。EditMode 9/9、macOS実画面QA済み。既存KawaGlint/**と並走dirty metaは変更していない。

<!-- ↓ ここに 1 行ずつ追記。 終わったら自分の行を完全削除。 -->

- 2026-07-25 - by Claude - [batch:1470-kawaglint-species-x2-rarity-bg-depth-polish] - unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/**(既存ファイル変更+新規、AquaLumina等の保護4ディレクトリ不変更), tmp/alpha_pending/**(新規アート、gitignore対象)、docs/**、AGENTS_CLAIMS.md, HANDOFF.md - ユーザー実プレイフィードバック7件: ①生き物を約2倍(15→30種前後)に拡充、②抽選確率の再設計(連続で同じ種も出る独立抽選+レアは本当に稀+pity)、③レア種の魚影を一目で分かる差別化(シルエット/動き)、④背景のサンゴ/岩/海藻をちゃんと作る(現状13点は最低限)、⑤生態的整合性(沖の船で鮭が釣れる等)の見直し、⑥背景の多層化・アニメ化(雲が流れる/木々が揺れる/パララックス)、⑦水面が二重に見える不具合(背景アートの焼き込み水面線とSurfaceBandエフェクトのズレ)+ウキの見た目改善+食いつき時に引っ張られる描写の追加。**状態: 設計完了・実装未着手・Claude→次担当へ引き継ぎ中(2026-07-25)。** Opus5による5領域の並列設計+6件のクロスレビューは完了し、**全文を `docs/KAWAGLINT_EXPANSION_DESIGN_2026-07-25.md` に保存済み**(統合フェーズ実行中にセッション終了したため統合前の生テキスト。矛盾はクロスレビュー§6に指摘があるので実装前に必ず解消すること)。**アート生成の前提が途中で変わった重要事項**: ユーザーはHiggsfield ultimateプランのアンリミテッド枠を持つが、実データ確認の結果アンリミテッドは "Available on web" 限定で、**MCP経由の生成には適用されずクレジットを消費する**(Nano Banana Pro 2k=2cr / GPT Image 2 high 2k=7cr、残高892)。MCP側から有効化する手段は存在しない(ツール定義・モデル定義・プラン情報すべて確認済み)。よって**アート生成はMCPからではなく、web UI(またはClaude Cowork等ブラウザ操作可能な環境)でアンリミテッド生成する方針**にユーザーが決定。実装担当は発注書を「web UIにそのまま貼れる指示書」形式(1枚ごとにプロンプト全文/アスペクト比/解像度/クロマキー色/保存ファイル名)に整形して提供すること。詳細な引き継ぎ手順はHANDOFF.mdの本batchエントリ参照 [overlap: batch:1449-tsuri-unity-water-spike(KawaGlint本体、継続作業)]

- 2026-07-25 - by Codex - [batch:1468-machigai-tts31-narration] - machigai/**, tests/e2e/machigai/**, tests/machigai_*.cjs, sw.js, play.html, AGENTS_CLAIMS.md, HANDOFF.md - 間違い探しで実際に再生される全差分ラベルと完了文言を Gemini TTS 3.1 / Leda / 1.15倍へ統一し、音声形式・音量・faster-whisper台本キーワード・全manifest対応・連打/mute/cancelを検証してApp stagingへ反映する [overlap: batch:1464-hyokkori-sleep-feedback (sw.js/play.html), batch:1460-nazonazo-town-pitatto-round7 (sw.js/play.html)]



- 2026-07-24 - by Claude - [batch:1460-nazonazo-town-pitatto-round7] - nazonazo-tunnel/js/game.js, nazonazo-tunnel/index.html, nazonazo-tunnel/styles.css, tests/nazonazo_town_dock_regression.cjs, sw.js, play.html, AGENTS_CLAIMS.md, HANDOFF.md - batch:1453の続き(round7)。ユーザー実playtestingフィードバック反映: 各駅間レグを短い局所距離から実距離全区間に拡張、自動巡航ハンドオフ(driving=true再突入)を撤去して全区間プレイヤー手動保持制御に一本化、フロート型ゲージを廃止し実スクロール世界内のトラック上ブレーキゾーン帯+赤枠停止ボックス表示へ置換 [overlap: batch:1453-nazonazo-town-pitatto-teisha (同一機能の先行round、同ファイル群)]
- 2026-07-24 - by Claude - [batch:1460-nazonazo-town-pitatto-round8] - 同上ファイル群 - round7完了後の実playtestingで報告された2件を修正 (完了、以下は完了報告)。**Bug1(緑ゾーン内で止まったのに惜しい判定)**: 原因はブレーキゾーン帯/停止ボックス/矢印の画面位置を計算するtownDockWorldToScreenVw(worldSpaceX)がworldSpaceX-worldXのみを返し、「カメラ基準=画面vw0」を前提にしていたこと。しかし本物の汽車本体(#veh)はvw0ではなく常にvw=(50+TRAIN_RIGHT_SHIFT_VW)=55を中心に固定描画される(#worldの兄弟要素)。posがbounds.centerに到達した瞬間、ゾーン/ボックスは数式の恒等式として必ず画面vw=0にセンタリングされ汽車本体(vw39.5〜70.4)と重ならない位置に描かれていた(Playwright実測: pos=298.15、bounds.start=301の3vw弱手前=undershoot判定の停止で、停止ボックスが汽車表示域の95%を覆っていたことを確認)。判定側(bounds.start/center/end)は無変更、townDockWorldToScreenVwにTOWN_DOCK_TRAIN_CENTER_VW(=50+TRAIN_RIGHT_SHIFT_VW、#vehの固定描画中心と代数的に厳密一致)を足す1箇所の修正のみ。あわせて3駅目(oscAmplitude揺れ駅)のoscPhase更新順序がbounds計算より後だった1フレームずれも解消。**Bug2(最高速が遅い)**: TOWN_DOCK_STATIONSのcruiseSpeedを約1.5倍(19→28.5, 23→34.5)。Playwright実測: 1駅目約10.5秒、2/3駅目約11.5秒(旧12〜21秒から短縮)。**検証**: 全3駅を視覚ゾーン中央でリリースし毎回success(town_dock_visual_v6_station{0,1,2}_outcome.pngにぴたっと とまれたね!を確認)、15秒超無入力でfail-loop無し、fail→retry中の保持継続、3駅クリアでcompleteCurrentStage到達(pending:"tunnelEntry"/stageCompletionHandled:true)、コンソールエラー0件。tests/nazonazo_town_dock_regression.cjs更新し144 checks pass。CACHE_VERSION 2382→2383(sw.js/play.html同期)、nazonazo-tunnel/index.htmlのgame.js/styles.css?v=を20260724-1463へペア更新(この2ファイルのcache-bustトークンは常にペアで運用する既存contract、tests/nazonazo_tunnel_branch_quiz_art_alpha_regression.cjsのRUNTIME_TOKEN/nazonazo_admin_stage_select_regression.cjs/nazonazo_settings_menu_regression.cjsの古いトークン参照もあわせて更新)。全35本のnazonazo_*.cjsは21pass/14fail(既存不具合、本round8と無関係、変更前後で完全一致を確認済み)を維持。sw.js/play.html/game.js/styles.cssにgit conflict marker無しを確認。commit/pushは自動コミットフックに委譲(本セッションでは手動commit/push未実施、ユーザー指示により意図的)。





- 2026-07-24 - by Claude - [batch:1453-nazonazo-town-pitatto-teisha] - nazonazo-tunnel/js/game.js, nazonazo-tunnel/index.html, nazonazo-tunnel/styles.css, tests/nazonazo_town_dock_regression.cjs (新規), sw.js, play.html, docs/NAZONAZO_TRAIN_STAGE_REDESIGN_2026-07-24.md, AGENTS_CLAIMS.md - docs/NAZONAZO_TRAIN_STAGE_REDESIGN_2026-07-24.md townステージ(ぴたっと停車)の実装完了。5問クイズをホールド/リリースの停車ミニゲーム(3駅・3段階難度・段階的ヒント)へ置換。sonnet実装→クロスレビュー(実ブラウザPlaywright検証)で「ホールドしても列車が全く動かない」致命的バグ(armed判定なし+リトライ時clearTownDockPointers()がheldPointers消去)を検出→修正→再クロスレビューで実際に3駅完走・保持継続を確認済み。新規回帰テスト79チェックpass、既存nazonazo_*.cjs 21pass/14fail(全て本変更と無関係の既存不具合、pre-townDockコミットでの再現により裏取り済み)。sw v2369(並走のtsuri撤去batchが2368の上に追いバンプ、3値同期は維持)。**現状: 作業ツリーに変更あり(commit未確定、この repo のambient auto-commitフックのタイミング次第)、push未実施、ユーザー確認待ち**。repoルートに残った一時Playwright検証スクリプト4件(.town_dock_*.tmp.js, .towndock_*_tmp.cjs)はrm権限拒否のため未削除、無害だが手動削除推奨 [overlap: batch:1417-nazonazo-dino-train-crane (同ファイル群、dinoイベントのみ担当し無関係), batch:1452-tsuri-web-retire-unity-migrate (先方のcommitに本batchの変更が意図せず巻き込まれた形跡あり、機能破壊なしと双方確認済み)]

- 2026-07-24 - by Claude - [batch:1451-machizukuri-yasai-stand-weigh-reveal] - machizukuri/js/logic.js, machizukuri/js/game.js, machizukuri/index.html, machizukuri/styles.css, tests/machizukuri_regression.cjs, sw.js, play.html, AGENTS_CLAIMS.md - はたけにっき収穫の重さ(weightMultiplier)をやさいスタンドで計量リビールする機能を実装 (guragura-seesawのspringStep/isSettledパターンをmachizukuri/js/logic.jsに複製、common/hatake-harvest-bridge.js(hatake側で実装済み)のキューを読んでharvestSpentへボーナス還元)。node回帰(machizukuri_regression.cjs Stage1-3 + guragura_seesaw_regression.cjsのキャッシュバージョン3-way同期)green、sw v2365→2366。commit/push未実施 [overlap: batch:1437-machizukuri-new-feature (同機能の先行フェーズ、machizukuri/**を共有), batch:1450/1449/1447 (sw.js/play.html)]


- 2026-07-23 - by Claude - [batch:1437-machizukuri-new-feature] - machizukuri/** (新規), room/index.html, hatake-nikki/js/logic.js, hatake-nikki/js/game.js, play.html, sw.js, tests/machizukuri_*.cjs (新規), AGENTS_CLAIMS.md, HANDOFF.md - 新機能「ポノのまちづくり」設計+実装(room/はたけ連携)。fable設計→sonnet5実装のマルチエージェントworkflowで進行中 [overlap: play.html/sw.js は多数のbatchと共通]
- 2026-07-23 - by Claude - [batch:1440-guragura-doll-weight-v3-ui] - guragura-seesaw/index.html, guragura-seesaw/js/game.js, guragura-seesaw/styles.css, tests/e2e/guragura/twin-basket-round3.spec.ts, tests/e2e/guragura/remove-placed-item.spec.ts, tests/e2e/guragura/_manual_playtest_scratch.spec.ts, sw.js, play.html, AGENTS_CLAIMS.md - guragura-seesaw v3再設計(人形/大きさ=重さ統一・10ラウンド化・ふたご皿廃止、logic.js/回帰テストは前フェーズで更新済み)のUI側追従。roundDots 5→10個、.pan 17%→25%+item-box 9/12/15%→7/9/11%に調整して5個グループの縦一列タワー化を解消(#stage実測で確認)、ふたご皿UI(#panRightTwin等)は前フェーズの休眠方針を継承し実行時に絶対到達しないことをe2eで新規検証。tests/e2e/guragura/の旧ふたご皿前提テスト2本を10ラウンド構成に書き換え、node回帰30+9セクション・Playwright 26/26 green(このサンドボックスはchromiumのSIGSEGVがworker数に関係なくランダム発生する既知の環境フレーキネスあり、単体実行では常にpass)、実ドラッグで10ラウンド通しプレイし段階的カテゴリ導入(食べ物→人形→石)とdead-end無しを確認。sw v2355→2356。commit/push未実施 [overlap: batch:1429-guragura-weight-redesign-e2e (同ゲームの前回改修), batch:1437/1439 (play.html/sw.js/AGENTS_CLAIMS.md 共通ファイル)]
- 2026-07-23 - by Claude - [batch:1441-guragura-round-review-fixes] - guragura-seesaw/js/logic.js, guragura-seesaw/index.html, tests/guragura_seesaw_regression.cjs, sw.js, play.html, AGENTS_CLAIMS.md - guragura-seesaw v3.1のクロスレビュー軽微指摘3件是正。(1) R7(index6) tray の dog/cat/frog 3種同時登場を緩和 (frog削除+blueberry追加、新解dog+cat+lemon+blueberry+blueberry=22)。(2) R8/R9(index7/8) で mystery_stone/star_block が初登場ラウンドの tray に無く触れなかった不備を修正 (それぞれtrayへ追加、R9はtray6個維持のためmystery_stone→star_blockへ入替)。(3) mystery_stoneの意外性強化のためweight9→13へ変更(mサイズ帯6〜8から+1しか離れておらずサプライズが弱かったため)。作業開始時にgit pull --rebaseでplay.html/sw.jsのCACHE_VERSIONコメント衝突(batch:1437機構づくりv2357 vs batch:1440ぐらぐらUI v2356)を検出、両方の変更内容を保持したまま2358へ採番して解消(その上で本タスク分をさらに2359へ)。本番placeItemを呼ぶ全探索スクリプト(スクラッチパッド、検証後削除試行も権限denyのため要手動削除: /private/tmp/claude-501/-Users-ndw-mac-AppDevelopment-pono-asobiba-app/ee23af77-4b60-46a5-b635-ecc1f01ae52e/scratchpad/verify_guragura_rounds.cjs)で全10ラウンドの解到達可能性・slip到達可能性・near-balance到達可能性を再検証、node回帰30+9セクション green、Playwright 26/26 green(--workers=1、既知のSIGSEGVフレーキネス回避)。sw v2356→2358(rebase解消)→2359(本タスク)。guragura-seesaw/index.html ?v= 20260723-7→8。commit/push未実施 [overlap: batch:1437-machizukuri-new-feature (play.html/sw.js), batch:1440-guragura-doll-weight-v3-ui (同ゲーム、UI側は別担当で無変更)]
- 2026-07-23 11:54 - by Claude - [batch:1429-guragura-weight-redesign-e2e] - tests/e2e/guragura/twin-basket-round3.spec.ts, tests/e2e/guragura/remove-placed-item.spec.ts, sw.js, play.html, guragura-seesaw/index.html, AGENTS_CLAIMS.md - guragura-seesaw 重さ再設計(前フェーズでlogic.js/CATALOG/ROUNDS/TWIN_ROUND_CONFIG/SLIP_DIFF更新済み)に追従し、ハードコードされた旧解(dog+lemon等)を新解(dog+frog、A皿dog→cat/B皿frog→lemon等)へ更新。sw v2347→2348、guragura-seesaw/index.html の ?v= を20260723-4→5(logic.js/game.js/styles.css)、node回帰29+9セクション green、Playwright tests/e2e/guragura/ 26/26 green、実ブラウザで全5ラウンド手動プレイクリア確認済み。commit/push未実施 [overlap: batch:1428-hyokkori-central-combo-lane (sw.js/play.html), batch:1427-hatake-signs-wet-feedback (sw.js/play.html), batch:1426-guragura-pan-item-pointer-events-fix (guragura-seesaw/**, sw.js, play.html), batch:1423-guragura-startbtn-fix-round2 (guragura-seesaw/index.html, sw.js, play.html, tests/e2e/guragura/**)]
- 2026-07-23 - by Claude - [batch:1426-guragura-pan-item-pointer-events-fix] - guragura-seesaw/styles.css, guragura-seesaw/index.html, sw.js, play.html, tests/e2e/guragura/remove-placed-item.spec.ts (新規), AGENTS_CLAIMS.md - 「誤って乗せたアイテムを外せず詰む」報告の根本原因を特定・修正。 .pan-items{pointer-events:none}(初回実装 e46006e77 から存在、 今session の near-balance/twin-basket 追加とは無関係の既存バグ) が皿に置いた .item-box の touchstart/pointerdown を丸ごと無効化しており、 endDragSingle/endDragTwin の「皿外へドラッグで戻す」経路がデッドコード化していた。 .item-box に pointer-events:auto を明示して復旧。 sw v2342→2343、 既存回帰29+9セクション green、 新規e2e含むtests/e2e/guragura/ 26/26 green。 commit/push未実施 [overlap: batch:1423-guragura-startbtn-fix-round2 (guragura-seesaw/index.html, sw.js, play.html), batch:1424-hyokkori-combo-center-fireworks (sw.js, play.html), batch:1425-hatake-layout-signboard-plan (sw.js, HANDOFF.md, AGENTS_CLAIMS.md)]
- 2026-07-23 - by Claude - [batch:1423-guragura-startbtn-fix-round2] - guragura-seesaw/index.html, guragura-seesaw/js/game.js, sw.js, play.html, tests/e2e/guragura/screen-transitions.spec.ts, tests/e2e/guragura/orientation-api-exception.spec.ts (新規), AGENTS_CLAIMS.md - 「またタップで始められない」再発報告の調査・修正。logic.js読込リトライ(batch:1415)は健在だったが、横画面誤検知ガードが旧来のinnerHeight>=innerWidth素朴比較のままで未移植だった(hyokkori-hightouch等の姉妹ゲームは既に修正済みだったのがこのゲームだけ残課題)。screen.orientation.type優先+matchMediaフォールバック+fail-open+try/catch二重防御(computeIsPortrait/isCoarsePointer個別+boot()全体をbootInner()経由でtry/catch化)を移植、pageshow/load/visualViewport resizeの再評価トリガーも追加。staging上の旧コードに対しinnerWidth/innerHeight=0レース条件を注入し実際に誤検知することを確認、修正後は再現しないことも確認。sw v2340→2341、回帰29+9セクション・e2e 22/22 green。commit/push未実施 [overlap: batch:1422-hyokkori-combo-bonus (sw.js, play.html), batch:1417-nazonazo-dino-train-crane (対象外)]
- 2026-07-23 - by Codex - [batch:1417-nazonazo-dino-train-crane] - nazonazo-tunnel/index.html, nazonazo-tunnel/styles.css, nazonazo-tunnel/js/game.js, assets/images/nazonazo-tunnel/branch_dino_crane_*, tests/nazonazo_tunnel_dino_crane_regression.cjs, HANDOFF.md, AGENTS_CLAIMS.md - 恐竜イベント先頭に列車クレーンで倒木を湧き水から安全地帯へ運ぶ非クイズイベントを追加。既存 water / boss は設計変更せず crane→water→boss、無罰の同イベント再試行、pointer/keyboard/lifecycle/slow-decode/one-shot scoreを実装。sw.js/play.htmlは対象外
- 2026-07-21 - by Claude - [batch:1406-app-title-menu-devcontent] - play.html, sw.js, AGENTS_CLAIMS.md - APP_TITLE_MENU_IDS に開発中コンテンツ (starparodier/undersea-cave/sea-album を通常公開 + bubble/coloring/stacking/aquarium を comingSoon:true+debugPlayable:true で追加)
- 2026-07-22 - by Claude - [batch:1414b-hatake-seesaw-integration] - play.html, sw.js, AGENTS_CLAIMS.md - hatake-nikki / guragura-seesaw を GAMES + APP_TITLE_MENU_IDS に統合登録 + CACHE_VERSION バンプ [overlap: batch:1414-hatake-seesaw]
- 2026-06-28 09:27 - by Codex - [batch:877-gacha-tray-mask-lower] - play.html, sw.js, AGENTS_CLAIMS.md, HANDOFF.md - ガチャ受け皿マスクが上すぎるため奥壁ラインを下げて再調整 [overlap: batch:860-data-export-import]
- 2026-06-28 13:00 - by Claude - [batch:885-difficulty-label-phase3-fix] - quizland/index.html, puzzle/partner-select.js, bento/index.html - クロスレビュー Critical/High 修正 (quizland「かんたん」UI 露出 / puzzle partner「かんたん」/ bento aria-label hardcode) [overlap: batch:884-maze-water-line-skate]
- 2026-06-28 13:30 - by Claude - [batch:886-difficulty-label-sw-bump-1736] - sw.js, play.html - 難易度ラベル統一 Phase 2+4 fix を v1735→v1736 でバンプ (maze HUD / oto タブ / puzzle album / bento title / quizland UI / partner-select / common/difficulty.js は既登録) [overlap: batch:885-difficulty-label-phase3-fix]
- 2026-06-29 14:18 - by Codex - [batch:911-maze-water-bug-body-collision] - maze/index.html, AGENTS_CLAIMS.md, HANDOFF.md - みずすべりを場所判定ではなく動いているおじゃま虫本体のタイミング判定へ修正 [overlap: batch:909-gacha-mobile-mask-artifact, batch:910-bento-face-food-zones]
- 2026-06-29 09:28 - by Claude - [batch:920-shop-bgm-swap] - assets/audio/honey_bell_shop.mp3, play.html, sw.js, AGENTS_CLAIMS.md - shop BGM を Honey Bell Shop.mp3 に差し替え + sticker-book との兼用解消 + sw v1784
- 2026-06-29 10:34 - by Claude - [batch:921-lp-age-label-upper-limit-removal] - index.html, AGENTS_CLAIMS.md - LP hero CTA 横の推奨年齢 3〜6歳 → 3歳〜 (上限撤廃)
- 2026-07-02 12:00 - by Claude - [batch:931-sticker-book-engagement-research-v2] - docs/**, AGENTS_CLAIMS.md - sticker-book engagement research v2 + docs
- 2026-07-02 - by Claude - [batch:932-tray-gray-silhouette-phase1] - tmp/tray_baseline/**, AGENTS_CLAIMS.md - tray gray silhouette 実装 (第一弾)
- 2026-07-02 - by Claude - [batch:933-haptics-quick-win-phase1] - common/haptics.js, Prototypes/StickerBookThreeJS/**, play.html, sw.js, AGENTS_CLAIMS.md - haptics quick win 実装 (触覚 Phase 1)
- 2026-07-02 - by Claude - [batch:934-sticker-paste-particles] - Prototypes/StickerBookThreeJS/**, AGENTS_CLAIMS.md - sticker paste particles (骨格 4 の予告実装)
- 2026-07-02 - by Claude - [batch:935-paste-particles-v2-rework] - Prototypes/StickerBookThreeJS/**, AGENTS_CLAIMS.md - paste particles v2 rework (方向/位置/色/数/サイズ全面調整)
- 2026-07-05 - by Claude - [batch:948-oto-title-flow] - oto/index.html, sw.js, play.html, AGENTS_CLAIMS.md - オットタッチ: 「タップしてスタート」廃止 (起動即モード選択) + リズム→ステージ選択直行 (ステージ選択解放済み=何度目かの人のみ) + sw bump
- 2026-07-05 - by Claude - [batch:950-gacha-lever-hitarea-expand] - play.html, sw.js, AGENTS_CLAIMS.md - デイリーガチャレバーのタップ判定を子供向けに拡張 (::before 疑似要素で不可視ヒット領域を上下左右に inflate、 見た目とレバー中心座標は不変) + sw bump v1960→v1961
- 2026-07-05 - by Claude - [batch:951-gacha-lever-cache-sync-and-shell-clip] - play.html, AGENTS_CLAIMS.md - Finding A: PAGE_CACHE_VERSION 1960→1961 で sw.js と同期 (critical drift 解消)。 Finding B: mobile ::before の下方 inflation を -90%→-60% に絞って .daily-gacha-shell の overflow:hidden による下端クリップ (320×568 で 15.4px, 375×667 で 6.5px) を回避 [overlap: batch:950-gacha-lever-hitarea-expand]
- 2026-07-05 - by Claude - [batch:939b-survey-dedup-and-record-copy] - survey.html, common/rating-modal.js, sw.js, play.html, AGENTS_CLAIMS.md - survey.html 永久 dedup 実装漏れ修正 + record mode title/subcopy 差し替え + sw v1964→v1965
- 2026-07-06 - by Claude - [batch:tier-v3-phase1] - common/tier.js, assets/data/game-stickers.json, js/game-stickers.js, Prototypes/StickerBookThreeJS/**, play.html, oto/index.html, docs/**, sw.js - tier v3 Phase 1 実装 (fable/sonnet workflow) [overlap: batch:1131-avatar-40-fullbody-presets (play.html/sw.js)]
- 2026-07-06 - by Claude - [batch:1202-oto-quit-to-play-html] - oto/index.html, sw.js, play.html, AGENTS_CLAIMS.md - batch:1201 の音タッチ もどる/おしまい 実装を forward fix。音タッチ内タイトル (#start-mode-choice) 遷移を廃止し、#oto-menu-home と同型の ../play.html 遷移に訂正 + sw v2003→v2004 [overlap: batch:tier-v3-phase1 (oto/index.html, play.html, sw.js)]
- 2026-07-06 - by Claude - [batch:1203-ux-3fixes] - common/data-export.js, common/sw-update.js, sw.js, play.html, AGENTS_CLAIMS.md - UX 3件: Preview 強化 + SW toast 繰り返し抑制 + CORE_PRESERVE_IF_ABSENT 拡張 + sw v2006→v2007 [overlap: batch:tier-v3-phase1]
- 2026-07-06 21:04 - by Claude - [batch:1204-capacitor-phase1-scaffold] - native/** (新規), .gitignore, .assetsignore, common/sw-update.js, common/cloud-sync.js, bento/kitchen.html, AGENTS_CLAIMS.md - Capacitor Phase 1 scaffold (Android 先行、www build pipeline + Web側 SW gating 3点)。play.html/sw.js/CLAUDE.md/HANDOFF.md/MEMORY.md 等の既存 dirty 10 ファイルには一切 touch しない [overlap: batch:1203-ux-3fixes (common/sw-update.js), batch:952-cloud-sync-step-c (common/cloud-sync.js)]
- 2026-07-13 - by Claude - [batch:1284-lp-game-copy-rewrite] - index.html, AGENTS_CLAIMS.md - LP ゲーム/ガチャ/シール帳紹介モーダルの説明文を特徴・ベネフィット前面コピーへ全面リライト (fable orchestration + sonnet 実装 + クロスレビュー) [overlap: batch:1281-analytics-phase1 (index.html)]
- 2026-07-22 - by Claude - [batch:1411-tier-a-new-genre-games] - donguri-wakekko/** (新規), pakupaku-catch/** (新規), play.html, sw.js, tests/donguri_wakekko_regression.cjs (新規), tests/pakupaku_catch_regression.cjs (新規), AGENTS_CLAIMS.md - クイズ偏重脱却の新ジャンルゲーム2本(戦略かけひき系+アクション系)をプレースホルダー素材で新規実装 (fable設計 + sonnet実装 + クロスレビュー、docs/GAME_DIVERSIFICATION_PROPOSAL_2026-07-22.md のTier A)
- 2026-07-22 - by Claude - [batch:1412-hyokkori-hightouch] - hyokkori-hightouch/** (新規), play.html, sw.js, tests/hyokkori_hightouch_regression.cjs (新規), tests/nazonazo_tunnel_branch_background_assets_regression.cjs, tests/nazonazo_tunnel_branch_stage_polish_regression.cjs, tests/nazonazo_tunnel_depth_parallax_regression.cjs, tests/nazonazo_tunnel_dino_cat_world_density_regression.cjs, tests/nazonazo_tunnel_world_coherence_regression.cjs, AGENTS_CLAIMS.md - ひょっこりハイタッチ(ポジティブもぐらたたき)アクションゲームをプレースホルダー素材で新規実装 (fable設計+sonnet実装+クロスレビュー)。統合作業でsw.js CACHE_VERSION 2319→2320バンプに追従し、ハードコード期待値を持つnazonazo回帰テスト5本を2320に同期
## なぜ HANDOFF.md と別ファイルなのか

HANDOFF.md は履歴 (Done エントリ含む) が積み上がるため、 「いまアクティブな claim だけを瞬時に把握する」 用途には不向き。 このボードは **常に短い / 常に最新 / 行は使い捨て** という性質を維持することで、 衝突検出のコストをほぼゼロにする狙い。
## Transferred / closed claims

<!-- 履歴保全用。以下は Active claims ではありません。 -->

- 2026-07-19 12:00 - by Claude - [batch:1370-treasure-gender-choice] - common/treasure.js, common/first-clear.js, common/stamp-rally.js, sw.js, play.html, tests/**, AGENTS_CLAIMS.md - CLOSED/DONE 2026-07-21: 性別自動判定(pono_profile依存の壊れたfallback)を廃止し、宝箱を開ける瞬間に子供がboy/girl見た目をタップ選択する方式へ変更 [overlap: batch:1362-stamp-rally-slot-reward-boundary-fix (common/stamp-rally.js, sw.js, play.html)]
- 2026-07-13 - by Claude - [batch:1285-bento-shop-nori-set] - bento/index.html, sw.js, tests/**, docs/**, AGENTS_CLAIMS.md - CLOSED/DONE 2026-07-21: お店モードのご飯3択化 (白/うめぼし/のり弁セット=全箱マスクフィット) + のり細工を自由モード専用に分離 + お店モード初回橋渡しガイド + LPリライト記録doc [overlap: batch:1280 (docs/**), batch:1281 (sw.js)]

- 2026-07-20 21:55 - by Codex - [batch:1385-nazonazo-branch-stage-polish] - nazonazo-tunnel/index.html, nazonazo-tunnel/styles.css, nazonazo-tunnel/js/game.js, assets/images/nazonazo-tunnel/effect_snowflake_particle_20260720.webp, assets/images/nazonazo-tunnel/effect_diamond_dust_particle_20260720.webp, assets/images/nazonazo-tunnel/effect_fire_flame_particle_a_20260720.webp, assets/images/nazonazo-tunnel/effect_fire_ember_particle_20260720.webp, assets/images/nazonazo-tunnel/branch_dino_life_landmark_cutout_20260720.webp, assets/images/nazonazo-tunnel/branch_toy_mid_variety_cutout_loop_20260720.webp, assets/images/nazonazo-tunnel/branch_toy_decor_variety_cutout_loop_20260720.webp, assets/images/nazonazo-tunnel/branch_cat_cats_landmark_cutout_20260720.webp, sw.js, tests/nazonazo_tunnel_branch_background_assets_regression.cjs, tests/nazonazo_space_chase_boss_regression.cjs, tests/nazonazo_admin_stage_select_regression.cjs, tests/nazonazo_mountain_weather_regression.cjs, tests/nazonazo_space_parallax_regression.cjs, tests/nazonazo_sea_submarine_regression.cjs, tests/nazonazo_quiz_illustrations_regression.cjs, tests/nazonazo_settings_menu_regression.cjs, tests/nazonazo_smoke_density_regression.cjs, tests/nazonazo_ui_illustrations_regression.cjs, tests/nazonazo_tunnel_branch_stage_polish_regression.cjs, HANDOFF.md, AGENTS_CLAIMS.md - CLOSED/DONE 2026-07-21: GPT Image 2由来alpha 8点、snow/fire演出、dino/catランドマーク、toy差し替え、8分岐高さ補正、SW v2311、新規144 measured static contracts＋21/21 mutation回帰、全nazonazo回帰25/25を最終化。push/deploy未実施

- 2026-07-20 19:48 - by Codex - [batch:1382-nazonazo-branch-bg-raster-integration] - nazonazo-tunnel/js/game.js, nazonazo-tunnel/index.html, nazonazo-tunnel/styles.css, sw.js, tests/nazonazo_tunnel_branch_background_assets_regression.cjs, tests/nazonazo_admin_stage_select_regression.cjs, tests/nazonazo_mountain_weather_regression.cjs, tests/nazonazo_space_chase_boss_regression.cjs, tests/nazonazo_space_parallax_regression.cjs, tests/nazonazo_sea_submarine_regression.cjs, tests/nazonazo_quiz_illustrations_regression.cjs, tests/nazonazo_settings_menu_regression.cjs, tests/nazonazo_smoke_density_regression.cjs, tests/nazonazo_ui_illustrations_regression.cjs, AGENTS_CLAIMS.md, HANDOFF.md - CLOSED/DONE 2026-07-20: GPT Image 2生成済みの新規分岐8ステージ背景48枚をalpha付きラスター背景として統合。独立code review Major/Medium/Minor 0、runtime 64/64、HTTP 48/48、全nazonazo回帰24/24をPASS [overlap transferred with user approval: batch:1401-nazonazo-tunnel-branch, batch:1401b-nazonazo-admin-branch-preview]
- 2026-07-20 00:00 - by Claude - [batch:1401-nazonazo-tunnel-branch] - nazonazo-tunnel/js/game.js, nazonazo-tunnel/data/questions.js, nazonazo-tunnel/data/quiz-art.js, nazonazo-tunnel/index.html, nazonazo-tunnel/styles.css, sw.js, AGENTS_CLAIMS.md - CLOSED 2026-07-20 19:48: ユーザー承認により Codex agent team の batch:1382 へ移管。なぞなぞトレインにトンネル分岐(snow/fire)土台を実装、絵文字フォールバック修正 → トンネル内選択ゲートUI(#tunnelBranchGates)+出口色分岐演出を追加実装
- 2026-07-20 12:00 - by Claude - [batch:1401b-nazonazo-admin-branch-preview] - nazonazo-tunnel/js/game.js, admin/index.html, sw.js, tests/nazonazo_admin_stage_select_regression.cjs, tests/nazonazo_tunnel_branch_topology_regression.cjs, AGENTS_CLAIMS.md - CLOSED 2026-07-20 19:48: ユーザー承認により Codex agent team の batch:1382 へ移管。管理ダッシュボードに分岐先隠しステージ8つ(snow/fire/dino/toy/cat/fantasy/sky/ruins)のQAプレビューボタンを追加(本編openMapは無変更) [overlap: batch:1401-nazonazo-tunnel-branch]
- 2026-07-22 - by Claude - [batch:1413-hyokkori-hightouch-landscape] - hyokkori-hightouch/index.html, hyokkori-hightouch/styles.css, hyokkori-hightouch/js/game.js, tests/hyokkori_hightouch_regression.cjs, sw.js, play.html, AGENTS_CLAIMS.md - ひょっこりハイタッチを縦画面から横画面(16:9)に改修 (#stageレターボックス化 + 隠れ場所グリッド2x3→3x2転置 + landscape-notice向き反転) + sw bump
- 2026-07-23 - by Claude - [batch:1416-hyokkori-orientation-api-fail-open] - hyokkori-hightouch/js/game.js, tests/hyokkori_hightouch_regression.cjs, tests/e2e/hyokkori/orientation-api-exception.spec.ts (新規), AGENTS_CLAIMS.md - レビュー指摘対応: computeIsPortrait/isCoarsePointer/screen.orientation.addEventListener登録の3箇所に try/catch追加(fail-open)+boot()全体をbootInner()経由でtry/catch化+guragura-seesaw移植を誤って主張していたコメント訂正。sw.js/play.htmlは対象外 [overlap: batch:1413-hyokkori-hightouch-landscape]
- 2026-07-22 - by Claude - [batch:1414-hatake-seesaw] - hatake-nikki/** (新規), guragura-seesaw/** (新規), play.html, sw.js, tests/hatake_nikki_regression.cjs (新規), tests/guragura_seesaw_regression.cjs (新規), AGENTS_CLAIMS.md - 畑日記+シーソーの新規ミニゲーム2本をプレースホルダー素材で実装 (fable設計+sonnet実装+クロスレビュー)
- 2026-07-22 - by Claude - [batch:1415-guragura-startbtn-fix] - guragura-seesaw/index.html, guragura-seesaw/js/game.js, sw.js, play.html, tests/guragura_seesaw_regression.cjs, tests/e2e/guragura/logic-load-failure.spec.ts (新規), AGENTS_CLAIMS.md - guragura-seesaw「はじめる」ボタン無反応バグ修正 (logic.js読込失敗時の無言return対策: 自動リトライ1回+再読込UI + キャッシュバスティング付与)
