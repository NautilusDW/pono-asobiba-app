# お弁当ゲーム 新チュートリアル台本 (tut2)

> **ステータス: オーナーレビュー待ち (台本のみ、コード変更なし)**
> 旧チュートリアル (`BENTO_TUTORIAL_PAUSED = true` で停止中の D&D 台本) の全面書き直し。
> 現行のタップ式 + カップファースト UX (box → rice → decor → tier2Main → tier2Side → complete) に完全準拠。
> 音声は全て新規 ID (`tut2_XX_<slug>.mp3`)。旧 `basic_tut_*` は **ID ごと廃止・再利用禁止** (ファイル名と中身の不一致事故の再発防止)。

> ### 2026-07-11 batch:1058-tut2-hotfix5 とりけす教習 + はっぱ指定制 + テキスト整理 (implemented, sw v2083)
> owner フィードバック (2026-07-11、「のり移動後に顔がズレたまま のりOK に進んでしまう」「はっぱが自由選択で品目/置き場所が曖昧」「テキストボックスが混戦」「しきりの位置ずれ」) を受けて 5 点を実装。
>
> - **(a) 新 step `tut2-nori-undo` + のりOK ソフトゲート**: Step5 (のり移動) と Step6 (のり編集+のりOK) の間に挿入。 のりを動かした後、 目・鼻・口が既定位置からズレたまま「のりOK」に進んでしまう問題を解消するため、 まず「とりけす」ボタンの使い方を教え、`tut2FaceAtDefault()` (純関数。 `getSimpleDecorPlacement` の期待座標と実配置を許容誤差 ±8px / 回転差 ≤4° / サイズ比 0.95〜1.05 で比較。 目は左右を最近傍マッチングで対応付け) が `true` になってから Step6 の「のりOK」へ進めるようにした。 デフォルト到達後に更に「とりけす」を押しても Step4 の配置まで巻き戻らないようガード。 ゲートは 3 回ブロックしたら 4 回目は無条件で通す softlock 回避付き (`tutorialState._noriOkBlockCount`)。 voice: `tut2_05b_undo` (新規)。
> - **(b) はっぱ指定制 (自由選択を廃止)**: 品目は **レタス (`leaf_lettuce`) 固定**、 置き場所は **2 個目に置いたメインおかず (ハンバーグ優先) の下** に指定。 2 個目メインおかず確定時に `tutorialState.leafTargetUid` / `leafTargetName` を記録し、 はっぱタブ選択時に対象おかずを自動的に armed 状態にすることで、 子供は「おべんとうばこをタップ」するだけで所定のおかずの下にレタスが敷ける (対象おかずを個別にタップする操作を省略)。 「すきな はっぱ」 文言は全廃。 voice: `tut2_17_leafpick` / `tut2_18_leafplace` (新規)。
> - **(c) テキストチャネル・ポリシー確立 (1 step 1 テキスト)**: 常設のポノ吹き出し (`#free-speech` / `setSpeech`) を唯一の説明チャネルとし、 独立 floating bubble (`tutorialShowBubble`) は **greet / w2-request の中央カード、 tut2-complete / tut2-favorite (complete-overlay が `#free-speech` を覆うため)、 tut2-w3-deliver (お届けパネル `#bento-delivery` が `#free-speech` を覆うため) の 4 箇所限定**に整理。 box / cup-btn / free-okazu / leaf-tab / okazu-ok / okazu-main の 2 個目ガイド / nori-move / nori-edit / leaf-pick / leaf-place / tabs-intro にあった「setSpeech と同文の floating bubble」二重表示を setSpeech 一本化に統一 (視線誘導はトリム(青枠) + 指アニメが担う)。
> - **(d) しきり位置ズレ修正**: コード内蔵フォールバック格子 `getSimpleLeafDividerSpreadPoints` (divider 分岐) の rows を `[0.25, 0.50, 0.75]` → `[0.44, 0.62, 0.80]` に修正し、 実おかず配置 (`getSimpleFoodSpreadPoints` の yBottom≈0.72h / yMain≈0.88h) と整合させた。 admin/index.html の default grid (`#bento-slot-layout`) も同時更新。 **ただし 2026-07-11 時点で staging KV (`/api/bento/mask-defaults`) の `box_rect_split.divider` には既に admin 側で保存済みの手動座標 7 点が入っており、 KV 保存値がフォールバックより優先されるため、 このコード修正だけでは実画面の見た目は変わらない**。 フォールバックはあくまで「KV 未設定時の安全網」を正しい値にする修正であり、 現状の表示調整は admin の `#bento-slot-layout` で行う。
> - **(e) 完成画面レガシー二重系統の tut2 中無効化**: `tutorialStartCompleteGuidance` (`basic_tut_14`/`favorite_save_01` 等の実 mp3 再生 + `.tut-bubble` 上書き) と、 それを起動する `_showCompleteOverlay` 内の 3000ms タイマー、 および `tutorialOnCompleteDetailShown` の 3 箇所に `tutorialState.step` が `tut2-*` の間は即 return するガードを追加。 これにより `tutorialOnStageComplete` (tut2 dispatcher、 tut2-complete/tut2-favorite の即時+5500/6500ms チェーン) とのレース (同じ `.tut-bubble` を奪い合う) が tut2 中は発生しなくなる。 **非チュートリアル時 (`tutorialState.active === false`) の挙動は完全不変**。
>
> 新規音声 3 本 (§3 追記): `tut2_05b_undo` / `tut2_17_leafpick` / `tut2_18_leafplace`。 `tut2_11_tabs` の読み上げテキストは将来「しきり」単独紹介 (はっぱ紹介と分離) に改訂予定 — mp3 は未収録のため、 台本変更による実害は無い。

> ### 2026-07-07 batch:1058-tut2-hotfix4 UX 方針転換 (implemented, sw v2036)
> owner の v2029 プレイテスト後、 「バブルが 3〜4 箇所に散在」 「タップ前に半透明品目が箱内に floating」 「サブラウンド間の間がない」 「Step 6 の説明が曖昧」 「パレット項目が二重ブルーリング」 の 5 問題を UX 方針転換で解決。
>
> - **ナレーション主 channel = ポノ吹き出し (setSpeech)**。 独立 `tutorialShowBubble` は greet (Step 1) / Step 6 編集パネル walk-through / Step 11 タブ紹介 / button-only steps (Step 2/8/12/13/14) のみに限定。 palette-tap step (Step 3 rice / Step 4A/4B nori / Step 7 okazu-main / Step 9 cup-place / Step 10 cup-food) は独立バブルを廃止し、 ポノ setSpeech (TUT2_PONO_SPEECH map) 一本化。
> - **`tutorialRenderStep` firstRender で必ず `setSpeech(TUT2_PONO_SPEECH[stepId])`** を呼んで前ステップの stale setSpeech (leaf 系「べんとうばこを タップして はっぱを しこう！」 等) を強制上書き。 これにより Screenshot 3 の stale bubble 問題を根本解消。
> - **palette-tap Phase A の 2 段化**: T=0 で ring のみ、 T=+600ms (`_paletteTapDelayTimer`) で finger tap + ghost。 「タップ前に半透明品目が floating」 混乱を解消。
> - **サブラウンド間 800ms の「間」** (`_noriBeatTimer`): item-placed で ghost/ring/finger を先に掃除 → `setSpeech('できたね！')` → 800ms 待機 → 次サブラウンド Phase A。 サブラウンド毎の setSpeech は `tut2ApplyNoriSubroundSpeech` で更新 (4A: 「まずは おめめを タップ！」→「もう ひとつ おめめを タップ！」/ 4B: 「つぎは おはなを タップ！」→「さいごに おくちを タップ！」)。
> - **Step 6 nori-edit walk-through 拡張**: phaseAMs 2500→6000ms、 `_noriEditSeqTimers` で 400/1400/2800/4200/5600ms のシーケンス — (a) 400ms「のりを タップすると こんな パネルが でるよ」 setSpeech、 (b) 1400ms ↻ ring + 自動 pointerdown + 「「くるっ」で のりを まわせるよ」、 (c) 2800ms ちいさく ring + 自動 tap + 「「ちいさく」で ちいさく できるよ」、 (d) 4200ms おおきく ring + 自動 tap + 「「おおきく」で おおきく できるよ」、 (e) 5600ms 「できたら『のりOK』を おそう！」 → Phase B で のりOK 誘導。
> - **CSS: `.tut-focus-target` で二重ブルーリング解消**: selected background (picker_card_selected.png) / guidePulse 緑リング / outline / box-shadow を全て !important 抑制し、 tutorialTrimPath の青破線矩形 1 本に統一。

---

## 1. 概要 + 設計方針

- **1 本のコア組み立てチュートリアル (15 ステップ、うち のり配置は 4A/4B の 2 ラウンド)** を両モード共通で使い、おねがいモードは既存の開店カットシーン (音声収録済み) を「薄いラッパー」として前後に足すだけ。新規パネルは作らない。
- **見本 → まねっこ ペダゴジー (2026-07-07 オーナー決定)**: 各 ACTION ステップは 2 段構造 — **Phase A (見本)**: ゲームが自動で指ポインタ + アイテムのゴースト配置アニメを見せる (ユーザー入力不要、~1.5〜2.5s で自動遷移)。**Phase B (まねっこ)**: 指 + ナレで「おなじように」「〜してね」等の短いブリッジで促し、既存の item-placed / item-moved / tab フックでユーザー実操作を待つ。**button-only ステップ (box/のりOK/カップへ/おかずOK/おきにいり) は Phase A なし — スポットライト or ターゲットリングのみ**。理由: 3-6歳は「見て・まねする」学習が最短。**のりは品目固定 (無料 5 点内で完結する見本)**、**おかずは自由 (自分のお弁当なので)** で差を付ける。**アクション量が多いステップは 見本→まねっこ を複数ラウンドに分割 (のり = 2 ラウンド: 4A=おめめ×2 / 4B=はな+くち)** — 一度に 4 品目を覚えさせるより 2 品目ずつ 2 回に分けたほうが 3 歳児の集中が続く (2026-07-07 オーナー決定)。
- **進行は v3 ルール厳守**: button / tab / place / cup-editor-closed / stage-complete のフックだけが進行口。素の step 変化では進めない。音声終了 or Phase A タイマーで継ぐソフトチェーンは 3 系統のみ — (a) 完成後の complete → favorite ナレチェーン、(b) tabs-intro → okazu-ok (紹介ステップで操作を強制しないため)、(c) 各 ACTION ステップの **Phase A → Phase B** タイマー (見本アニメ終了で自動遷移、B はフックで待つ)。
- **ゲーム既存の setSpeech と喧嘩しない**: ゲームが既に喋るステップでは吹き出しはゲーム既存文をそのまま使い、ナレーションは同じ指示を温かく補強する文にする (同時に別内容を喋らせない)。ゲームが無言のステップだけチュートリアル専用吹き出しを出す。
- **声は女性ナレーター (読み聞かせ・三人称) のみ**。ポノや動物の一人称セリフは禁止。指示形 (「〜してみよう」「〜を おしてね」) と観察形 (「〜が よろこんでいるよ」) だけを使う。
- **教える範囲**: 箱は固定 (これでOKのみ・button-only) / ごはんタップ (見本→まねっこ) / のり配置 = **2 ラウンド**: (4A) 見本で **おめめ×2** をゴースト配置 → まねっこで 2 個 / (4B) 見本で **はな → くち** をゴースト配置 → まねっこで 2 個 (各ラウンド内は順序強制) + 移動 (見本→まねっこ) + 新編集パネル (見本で ↻ 1 回 → まねっこは任意) / のりOK (button-only) / メインおかず 1 個 (**見本→まねっこ・おかずは自由**) / カップへ (button-only) / カップ (見本→まねっこ・自由) / 自動ピッカー → おかず 1 個 (見本→まねっこ・自由) / おかずOK (button-only) / 完成 + おきにいり (button-only)。**レイヤー上下 (旧 layer-edit 系) は教えない** (自由発見に任せる)。**はっぱ / しきり は専用ステップ (`tut2-tabs-intro`) で紹介する** (操作は強制しない)、**ピックは おかずOK 前に一言**だけ触れる。オーナー方針: 「必要不可欠ではないので長々と説明しないが、ある程度は入れる」。
- **必要数はチュートリアル用オーバーライド維持**: main = 1、side (カップ内) = 1。SIMPLE_CUP_FOOD_LIMIT = 1。
- **子供が別の事をしても壊さない**: 全ステップで「フック対象以外の操作は自由・チュートリアルは待つ」。ソフトロックになり得る箇所には個別ガードを明記 (各ステップ表参照)。

### トリガー設計 (オーナー判断ボックス)

| 案 | 内容 | 備考 |
| --- | --- | --- |
| **A案 (推奨)** | **どちらのモードでも初回 1 回だけコア発火**。おねがいモード初回なら W1〜W3 ラッパーを追加。じぶんでつくる初回ならコアのみ。どちらかで完走したら `done` (もう片方では出ない) | タップ式の組み立て手順は両モード完全に同一。「じぶんでつくる (タップだけで かんたん)」を先に選ぶ子が多い想定なので、おねがい限定だと初回導線を素通りする |
| B案 (旧同様) | おねがいモード初回のみコア発火。じぶんでつくるは軽量ヒント (吹き出しのみ・音声なし) | 旧実装踏襲。じぶんでつくる先行ユーザーが無案内になるのが弱点 |

**推奨: A案**。sk-intro 3色モーダル (あか/きいろ/みどりの なかま、sk_intro_01〜05 収録済み) は**別システムとして現状維持** — 本台本では書き直さない。コアチュートリアルと同一ラウンドで重なる場合は「sk-intro → コア greet」の順で直列 (同時表示しない)。

---

## 2. ステップ表 (コア 15 ステップ、うち 4=4A/4B の 2 ラウンド)

### 早見表

構造欄: **A/B** = 見本 (Phase A) → まねっこ (Phase B) の 2 段。**btn-only** = button-only (見本なし・スポットライトのみ)。**intro** = 音声だけの紹介ステップ。

| # | step id | 教える内容 | 構造 | 進行フック | voice |
| --- | --- | --- | --- | --- | --- |
| 1 | `tut2-greet` | あいさつ | intro | button 「はじめる →」(`#tut-greet-next`) | tut2_01_greet |
| 2 | `tut2-box` | 箱かくにん (固定) + 「これでOK」 | btn-only | button `#free-box-confirm` | tut2_02_box |
| 3 | `tut2-rice` | 「ごはんを よそう」タップ | A/B | item-placed (rice) | tut2_03_rice |
| 4A | `tut2-nori-face-eyes` | のり 見本→まねっこ ラウンド1 (おめめ×2) | A/B (2 サブステップ) | item-placed (decor, `nori_eye_round` 一致) x2 → Step 4B | tut2_04a_eyes |
| 4B | `tut2-nori-face-mouth-nose` | のり 見本→まねっこ ラウンド2 (はな→くち) | A/B (2 サブステップ) | item-placed (decor, `nori_nose_bear`→`nori_mouth_smile` 順) x2 → Step 5 | tut2_04b_mouth_nose |
| 5 | `tut2-nori-move` | 置いたのりを指で動かす | A/B | item-moved (decor) ※編集パネル操作でも可 | tut2_05_norimove |
| 6 | `tut2-nori-edit` | 編集パネル紹介 + 「のりOK」 | A のみ (B 任意) | button のりOK (guide-change → tier2Main) | tut2_06_noriedit |
| 7 | `tut2-okazu-main` | メインおかず 1 個 (自由) | A/B (自由選択) | item-placed (food, カップ外) | tut2_07_okazu |
| 8 | `tut2-cup-btn` | 「カップへ」ボタン | btn-only | button カップへ (guide-change → tier2Side) | tut2_08_cupbtn |
| 9 | `tut2-cup-place` | カップ 1 個 (自由) | A/B (自由選択) | item-placed (cup) | tut2_09_cup |
| 10 | `tut2-cup-food` | ピッカーでおかず 1 個 (自由) | A/B (自由選択) | item-placed (food in cup) / cup-editor-closed | tut2_10_cupfood |
| 11 | `tut2-tabs-intro` | はっぱ・しきり の紹介 (操作強制なし) | intro | tab はっぱ/しきり タップ、または 音声終了+約4秒でソフトチェーン (おかずOK 直押しなら 13 へジャンプ) | tut2_11_tabs |
| 12 | `tut2-okazu-ok` | ピック一言 + 「おかずOK」 | btn-only | button おかずOK → stage-complete | tut2_12_okazuok |
| 13 | `tut2-complete` | 完成オーバーレイ | intro | stage-complete で表示、音声終了で 14 へチェーン | tut2_13_complete |
| 14 | `tut2-favorite` | ⭐おきにいり保存 | btn-only | button `#save-fav-btn` または × クローズ (強制しない) | tut2_14_fav |

> **全ステップ共通ガード (リスタートボタン)**: `#bento-restart-btn` (さいしょから) はビルド全編で表示され、押すと freeGuideStep が box に戻るのに tutorialState.step は残って desync する (v3 ルール上、何も再同期しない)。対策としてチュートリアル中はこのボタンを**非表示にする** (詳細と代替案は §5 実装メモの必須ガード参照)。このため各ステップのフォールバック欄には個別記載しない。

---

### Step 1 — `tut2-greet` (あいさつ)

- **画面状態/前提**: ラウンド開始直後。既存の greet カード (tutorialRenderStep の greet 分岐) を流用: 「はじめる →」(`#tut-greet-next`) / 「やめる」/ 「つぎから スキップする」チェックボックスの 3 導線をそのまま維持。sk-intro が出るラウンドなら sk-intro クローズ後に開始。横向き必須 (縦なら既存の「よこむきに してね」待機)。
- **ハイライト対象**: greet カード自身 (追加トリムなし)。
- **ポノ吹き出し**: greet カード内テキスト「いっしょに つくろう！」 (独立バブルは出さない)
- **ナレーション音声**: 「ようこそ、ポノの おべんとうやさんへ！きょうは いっしょに、すてきな おべんとうを つくってみよう。」 — カード表示と同時に再生。
- **voice**: `tut2_01_greet`
- **進行フック**: 「はじめる →」button (`#tut-greet-next`) → `tut2-box` (v3 準拠の button フック)。「やめる」/「つぎから スキップする」チェック → チュートリアル終了 (既存挙動維持)。
- **フォールバック/ガード**: 音声再生失敗・ミュートでもカードとボタンで進行可能 (音声は進行に関与しない)。ボタン押下時は再生中音声を `stopBentoTutorialVoice()` で止めてから進む。

### Step 2 — `tut2-box` (おべんとうばこ)

- **画面状態/前提**: freeGuideStep = box。箱パレット表示。**チュートリアル中は `box_rect_split` (ふつうの おべんとう) を自動プリセレクト・固定** (他の箱はタップしても切り替わらない。切替可のまま実装する場合でもハイライトは固定箱のまま — 推奨はタップ無効化、§5 実装メモ参照)。固定箱は tierCount:1 なので tier3/2段分岐なし。
- **ハイライト対象** (button-only 構造・見本なし): 固定箱 (`box_rect_split` ボタン) にトリム + `#free-box-confirm` (「これでOK」ボタン) にスポットライト/ターゲットリング。**指ポインタは出さない** (見本→まねっこは ACTION ステップのみ)。
- **ポノ吹き出し**: 「きょうは これを つかうよ！」 (チュートリアル専用。ゲーム既存の「まずは おべんとうばこを えらぼう！」は固定文脈と矛盾するため suppress — §5 実装メモ参照)
- **ナレーション音声**: 「きょうは この おべんとうばこを つかうよ。「これで オッケー」を タップしよう。」
- **voice**: `tut2_02_box`
- **進行フック**: `#free-box-confirm` 押下 (confirmFreeBentoBoxSelection 経由の button フック) → `tut2-rice`。
- **フォールバック/ガード**: 他の箱タップは無効 (または無視) で進まない (確定ボタンのみが進行口)。確定ボタンは常時表示なのでソフトロックなし。音声失敗 → 吹き出し + トリムは表示継続、進行は button なので影響なし。

### Step 3 — `tut2-rice` (ごはん)

- **画面状態/前提**: freeGuideStep = rice。ボタン 1 個のみの画面。
- **Phase A (見本, 自動)**: 指ポインタが「ごはんを よそう」ボタンへ滑り、タップアニメと同時に **ゲームがモックのごはんを箱内にゴースト配置** (opacity 0.7、tutorial demo layer)。約 2s で Phase B へ自動遷移 (この時ゴーストは消える or 透明のまま残す — §5 実装メモ参照)。
- **Phase B (まねっこ, ユーザー入力待ち)**: 指ポインタを 「ごはんを よそう」ボタンに再表示 + タップアニメをループ。ユーザーが実際にボタンを押すと本物のごはんが配置される。
- **ハイライト対象**: 「ごはんを よそう」ボタン (Phase A/B とも同じトリム + 指タップデモ)。
- **ポノ吹き出し**: (ゲーム既存: 「つぎは ごはんを よそおう！」)
- **ナレーション音声**: 「つぎは ごはん！「ごはんを よそう」を おすと、こんなふうに はいるよ。おなじように、タップしてね。」 (Phase A→B を 1 本でつなぐ)
- **voice**: `tut2_03_rice`
- **進行フック**: item-placed (rice) — `tutorialOnItemPlaced` の rice ガード → `tut2-nori-place`。ゲーム側はごはん配置で decor へ自動遷移するので同期して進む。Phase A のゴースト配置は本フックを発火しない (`tutorialDemo:true` フラグで side-effect スキップ、§5)。
- **フォールバック/ガード**: 他に押せる UI がないためロックなし。音声失敗しても Phase A→B タイマー + place で進行可能。

### Step 4A — `tut2-nori-face-eyes` (のり ラウンド 1: おめめ×2)

- **画面状態/前提**: freeGuideStep = decor。見出し「かざり」。**のり配置は 2 ラウンド構成、Step 4A は前半 — おめめを 2 個** (`nori_eye_round` x2)。参照実装: bento/index.html:7545 (全 tier で FREE_ASSET から表示)。まゆ (`nori_brow_left/right`) は自由発見に残す。
- **サブステップ**: `4A-a-eye1` / `4A-b-eye2`。各サブステップに Phase A / Phase B を持つ。
- **Phase A (見本, 各サブステップ)**: `nori_eye_round` 以外のパレット項目を CSS で dim (opacity 0.4)、期待品目にトリム + 指タップアニメ → **ゲームがゴースト配置** (4A-a=左目 x:-0.19,y:-0.24 / 4A-b=右目 x:+0.19,y:-0.24。既存 `nori_face_set_smile` のクラスタ座標 index.html:7522-7523 を流用)。約 1.5s で Phase B へ。
- **Phase B (まねっこ, 各サブステップ)**: `nori_eye_round` のパレットにトリムのみ (指はループ)、ユーザーの実タップ待ち。期待外タップの挙動は §6 未決事項 5 参照 (推奨: やんわり無視)。
- **ハイライト対象**: `nori_eye_round` の 1 品目のみトリム + 指 → 他はパレット上で dim。
- **ポノ吹き出し**: (ゲーム既存: 「ごはんを かざろう！」を初期表示に維持) + サブステップ小バブル: 4A-a「まず おめめだよ」/ 4A-b「もう ひとつ おめめ」。
- **ナレーション音声**: 「のりで おかおを つくろう！まずは、おめめを ふたつ おいてみよう。」 (2 文、約 5 秒。Phase A×2 + Phase B ×2 を覆う)
- **voice**: `tut2_04a_eyes`
- **進行フック**: item-placed (decor, `item.id === 'nori_eye_round'`) を 2 回 → **Step 4B (`tut2-nori-face-mouth-nose`)** へ遷移。期待外 id の place は無視 (§6 未決事項 5 で最終確定)。
- **フォールバック/ガード**: **ゼロのり直行ガード** — 「つぎへ」→ モーダル「のりは かざらないで すすむ？」→ すすむ で Step 4B/5/6 をスキップして `tut2-okazu-main` へジャンプ (guide-change ブリッジ、シーケンス中断)。ごはん削除ガード: rice の削除ブロック (§5 P1)。**dim パレット解除**: Step 4B 進入前にも一度 dim を刷新 (期待品目が変わるため)。

### Step 4B — `tut2-nori-face-mouth-nose` (のり ラウンド 2: はな + くち)

- **画面状態/前提**: Step 4A 完了直後 (おめめ 2 個が配置済み)。freeGuideStep は tier2Main へ進む前の decor のまま維持 (のりOK 押下待ち)。**Step 4B は後半 — はな (`nori_nose_bear`) と くち (`nori_mouth_smile`) を 1 個ずつ順に**。参照実装: bento/index.html:7546-7547。
- **サブステップ**: `4B-a-nose` / `4B-b-mouth`。順序は はな → くち で固定 (見本のアニメも同順)。
- **Phase A (見本, 各サブステップ)**: 期待品目以外のパレット項目を CSS で dim (opacity 0.4)、期待品目にトリム + 指タップアニメ → **ゲームがゴースト配置** (4B-a=鼻 x:0,y:0.01 / 4B-b=口 x:0,y:0.225。既存 `nori_face_set_smile` クラスタ座標 index.html:7524-7525 を流用)。約 1.5s で Phase B へ。
- **Phase B (まねっこ, 各サブステップ)**: 期待品目のパレットにトリムのみ (指はループ)、ユーザーの実タップ待ち。期待外タップの挙動は §6 未決事項 5 参照。
- **ハイライト対象**: 期待の 1 品目のみトリム + 指 → 他はパレット上で dim。
- **ポノ吹き出し**: サブステップ小バブル: 4B-a「つぎは おはな」/ 4B-b「さいごは おくち」。ゲーム既存吹き出しは Step 4A から流用 (再発火不要)。
- **ナレーション音声**: 「つぎは、はなと くちも おいてみて。」 (1 文、約 3 秒。Phase A×2 + Phase B ×2 を覆う。**「〜おいてみて」を採用し 4A の「〜おいてみよう」と連続エコーを回避**)
- **voice**: `tut2_04b_mouth_nose`
- **進行フック**: item-placed (decor, `item.id === 期待品目`) で内部サブステップを進める。4B-b 完了 (くち配置) で `tut2-nori-move` へ遷移。既存の `countDecorOnTier(1) > 0` 単純ガードは廃止。
- **フォールバック/ガード**: ゼロのり直行ガードは Step 4A と同じ経路 (「つぎへ」→ モーダル)。ごはん削除ガード: rice の削除ブロック (§5 P1)。**dim パレット解除**: Step 5 進入時に必ず CSS class を外す (leak 防止)。

### Step 5 — `tut2-nori-move` (のりを うごかす)

- **画面状態/前提**: のりが 4 個配置済み (Step 4 の 4 品目)。配置のりはドラッグ可能。
- **Phase A (見本)**: おかお 4 品目のうち **口 (くち)** をターゲットに、指が grip → 少し下方向へ「すーっ」と実際に位置を動かして戻す (or ゴースト矢印で動きだけ見せる、§5 参照)。約 2s。
- **Phase B (まねっこ)**: ナレの後半「〜うごかしてね。」に合わせて、指ポインタを置いたのりに乗せて grip アニメをループ、ユーザー操作待ち。
- **ハイライト対象**: 置いたのり (ターゲットサークル) + 指の「すーっ」移動デモ (grip ポインタ)。
- **ポノ吹き出し**: (ゲーム既存: 「のりは すきな ところに うごかせるよ。できたら のりOK を おしてね。」 — 配置時に発火済みの文をそのまま活かす)
- **ナレーション音声**: 「のりは ゆびで うごかせるよ。すきな ばしょまで、すーっと うごかしてね。」
- **voice**: `tut2_05_norimove`
- **進行フック**: item-moved (decor) — `tutorialOnItemMoved` を decor にも反応するよう拡張 → `tut2-nori-edit`。**編集パネルの ↺/↻/ちいさく/おおきく 押下も move 相当として進行扱い** (動かさずタップ→パネルで満足した子のロック防止)。
- **フォールバック/ガード**: のり追加配置は自由 (待つ)。「のりOK」を先に押したら guide-change ブリッジで Step 6 を飛ばして `tut2-okazu-main` へ (v3 の nori-ok→tab-okazu ブリッジ precedent と同型)。inactivity で Phase B の指デモをループ再生。ごはん削除ガードは Step 4 と同じ (rice けす をブロック — §5 実装メモ P1)。

### Step 6 — `tut2-nori-edit` (まわす・おおきさ + のりOK)

- **画面状態/前提**: のり移動済み。batch:1057 の decor 編集パネル (置いたのりを動かさずタップ → ↺↻ 15° / ちいさく・おおきく ±15%) が使える。
- **Phase A (見本のみ)**: 指が置いたのり (例: くち) をタップ → 編集パネルが開くアニメ → 指が **↻ を 1 回タップ** → のりが 15° 回転する。約 2.5s。パネルは自動で閉じる (or Phase B に持ち越し)。
- **Phase B (任意)**: 指ポインタは「のりOK」ボタンに移動 (ターゲットリング + バブル横付け)。**まねっこ強制なし** — パネルを試すもよし、そのまま「のりOK」を押すもよし (light touch)。
- **ハイライト対象**: Phase A 中は 置いたのり (軽いターゲットサークル) → Phase B で「のりOK」ボタンへトリム移動。
- **ポノ吹き出し**: Phase A「のりを タップすると まわせるよ」 / Phase B「できたら「のりOK」<br>を おそう」 (batch:1058-hotfix3 で 「ぽんと」 削除、平易化 + Phase A→B の位相リセットバグを修正して確実に Phase B へ遷移する)
- **ナレーション音声**: 「のりを タップすると、まわしたり おおきく できるよ。できたら「のり オッケー」を おそう。」
- **voice**: `tut2_06_noriedit`
- **進行フック**: 「のりOK」button (handleNoriOkPressed → guide-change tier2Main ブリッジ) → `tut2-okazu-main`。**パネル操作は任意** (試さなくても のりOK で進める — light touch)。
- **フォールバック/ガード**: のりを全部消してしまった場合はボタンが「つぎへ」+ 確認モーダルになるが、その確定でも同じ guide-change ブリッジで進行 (ロックなし)。ごはん削除ガードは Step 4 と同じ (rice けす をブロック — §5 実装メモ P1)。音声失敗 → 吹き出し表示のみで button 進行可能。

### Step 7 — `tut2-okazu-main` (メインの おかず・自由選択)

- **画面状態/前提**: freeGuideStep = tier2Main。おかずパレット (メインのみ)。**batch:1058-hotfix3: 実ゲームと同じく main = 2 を要求** (owner から「1個入れたらすぐカップへ遷移する」 指摘を受け tutorial main=1 override を撤廃)。side は 1 のまま緩和。
- **Phase A (見本)**: 指がパレット先頭のメインおかず (例: からあげ) をタップ → ゲームがモックのメインを箱内にゴースト配置 (opacity 0.7)。約 2s で Phase B。ゴーストは消えて空箱に戻る (子供が「もう入ってる」と混乱しないため)。
- **Phase B (まねっこ・自由)**: 指ポインタはパレット全体をふわっと指す (特定アイテムに固定しない)。dim もしない。ユーザーが**好きな 1 品を**選んで置く。
- **ハイライト対象**: Phase A = 先頭アイテム / Phase B = パレット全体 (特定 1 品にトリムしない)。
- **ポノ吹き出し**: (ゲーム既存: 「メインのおかずを 2こ いれてね！」) — 1 個目配置時は `tutorialShowPonoCallout('もう ひとつ<br>おかずを えらぼう！')` で追加誘導。
- **ナレーション音声**: 「つぎは メインの おかず！すきなのを ひとつ、タップして いれてみよう。」 (Phase A→B を 1 本で覆う。1 個目の callout は文字表示のみで音声は追加しない — 収録済み音声は変更なし)
- **voice**: `tut2_07_okazu`
- **進行フック**: item-placed (food, parentCupId なし) を 2 回受けたら `tut2-cup-btn`。1 回目は callout 表示のみで留まる。
- **フォールバック/ガード**: 置いたメインをタップして出る「したに しく🥬」等のパネルは自由操作として許可 (待つ、教えない)。パレットは常時表示でロックなし。

### Step 8 — `tut2-cup-btn` (「カップへ」)

- **画面状態/前提**: main 1 個配置済み → 「カップへ」ボタン (tryFinishOkazuTier) が有効化。
- **ハイライト対象** (button-only 構造・見本なし): 「カップへ」ボタンにスポットライト/ターゲットリング。**指ポインタは出さない**。
- **ポノ吹き出し**: (ゲーム既存: 「メインのおかずが そろったね！つぎは 「カップへ」を おしてね。」)
- **ナレーション音声**: 「おいしそうに はいったね。つぎは、「カップへ」を おしてね。」
- **voice**: `tut2_08_cupbtn`
- **進行フック**: 「カップへ」button (tryFinishOkazuTier → guide-change tier2Side ブリッジ) → `tut2-cup-place`。
- **フォールバック/ガード**: おかず追加タップはゲーム側 deny (「カップへ」の ボタンを おしてね) が出るだけで害なし。長い音声再生中のボタン押下は queue-lag 対策 (v1500 FIX6 precedent) として **押下時に stopBentoTutorialVoice して即進行**。

### Step 9 — `tut2-cup-place` (カップを おく・自由選択)

- **画面状態/前提**: freeGuideStep = tier2Side。タブ [カップ, はっぱ, しきり, ピック]、カップタブがアクティブ。オーバーライド side = 1。
- **Phase A (見本)**: 指がパレットの先頭カップ (例: `cup_flower`) をタップ → ゲームがモックのカップを特定スロットにゴースト配置 (opacity 0.7、~2s)。ゴーストは Phase B で消える。
- **Phase A (見本, ...続き)**: 「まずは カップを おこう！」 の吹き出しと同時。
- **Phase B (まねっこ・自由)**: 指ポインタはカップパレット全体をふわっと指す。ユーザーが**好きなカップを好きなスロットに**置ける。
- **ハイライト対象**: Phase A = 先頭カップ + 特定スロット / Phase B = カップパレット全体 (特定カップにトリムしない)。
- **ポノ吹き出し**: 「まずは カップを おこう！」 (チュートリアル専用)
- **ナレーション音声**: 「ちいさい おかずは カップに いれるよ。すきな カップを、ひとつ えらんで おこう。」 (「すきな」で自由選択を明示)
- **voice**: `tut2_09_cup`
- **進行フック**: item-placed (cup) → `tut2-cup-food`。配置と同時にゲームがカップエディタ (ピッカー) を自動オープンするので、**押下時点で再生中音声を stop してから進む** (v1500 FIX6 と同じ)。
- **フォールバック/ガード**: カップなしで side おかずをタップ → ゲーム既存「さきに カップを おいてね。」に任せる (チュートリアルは重ねて喋らない)。はっぱ/しきり/ピック タブへ寄り道しても待つ (タブのゲーム発話はそのまま流す)。inactivity で Phase B 指デモ再開。

### Step 10 — `tut2-cup-food` (カップの なかみ・自由選択)

- **画面状態/前提**: カップエディタ自動オープン中。SIMPLE_CUP_FOOD_LIMIT = 1。
- **Phase A (見本)**: 指がエディタ内の特定 side food (例: プチトマト) をタップ → カップにゴースト配置 (opacity 0.7、~2s)。ゴーストは Phase B で消える。エディタは開いたまま。
- **Phase B (まねっこ・自由)**: 指ポインタはエディタ内おかずリスト全体をふわっと指す。ユーザーが**好きな 1 品**をタップ。
- **ハイライト対象**: Phase A = 先頭 side food / Phase B = エディタ内おかずリスト (`.free-cup-editor-actions + .free-item-list .free-palette-item` — 既存セレクタ流用、特定 1 品にトリムしない)。
- **ポノ吹き出し**: (ゲーム既存: 「カップに いれる おかずを えらぼう！」)
- **ナレーション音声**: 「カップの なかに いれる おかずを、すきなの ひとつ えらんでね。」 (「すきなのを」で自由選択を明示)
- **voice**: `tut2_10_cupfood`
- **進行フック**: item-placed (food, parentCupId あり) **または** cup-editor-closed (子 1 個以上) → `tut2-tabs-intro`。両フック維持で自動クローズ / OK 押下の両経路をカバー (v1497 precedent)。
- **フォールバック/ガード**: おかずを入れずにエディタを閉じた場合は renderer が開き直す既存挙動に任せる (ロックなし)。

### Step 11 — `tut2-tabs-intro` (はっぱ・しきり の紹介)

- **画面状態/前提**: side 必要数 (1) 充足の瞬間に発火 (旧 Step 11 と同タイミング)。「おかずOK」ボタンは既に見えている。ゲーム既存発話「おかずが ぜんぶ そろったね！「おかずOK」を おしてね。」が同時に発火する。
- **ハイライト対象**: 指ポインタ / 軽いターゲットが **はっぱ タブ → しきり タブ** の順に移動 (どちらも**トリムしない** — 押下を強制しないため)。
- **ポノ吹き出し**: 「はっぱと しきりも つかえるよ！」 (チュートリアル専用)
- **ナレーション音声**: 「「はっぱ」を おすと、おかずの したに はっぱを しけるよ。「しきり」で なかを わけることも できるよ。」
- **voice**: `tut2_11_tabs`
- **進行フック**: (a) はっぱ or しきり タブのタップ (tab フック — 旧 tab-rice/tab-okazu と同系統) → `tut2-okazu-ok` / (b) 「おかずOK」直押し → stage-complete が発火するので `tut2-complete` へ**直接ジャンプ** (Step 11/12 で置き去りにならないようガード — `tutorialOnStageComplete` は現 step を問わず complete へ遷移する実装を維持) / (c) どちらもなければ 音声終了 + 約 4 秒 inactivity で `tut2-okazu-ok` へ自動進行。
- **備考 (ソフトチェーンの正当化)**: (c) は complete→favorite 以外で唯一の非操作進行。紹介だけのステップで操作を強制しない、というオーナー方針 (「必要不可欠ではないので長々と説明しない」) のための例外 — §1 設計方針に明記済み。
- **フォールバック/ガード**: はっぱ探索 (タブ → おかずタップ → はっぱピッカー) や しきり探索は完全に自由 — ゲーム既存発話 (「おかずを えらんで はっぱを しこう！」/「しきりモードだよ。しきりだけ うごかせるよ。」) に任せ、**探索中に新規ナレは流さない** (口うるさ回避)。探索が終わっても チュートリアルは Step 12 で おかずOK を待つだけ。音声失敗 → fallbackMs で (c) チェーン保証。

### Step 12 — `tut2-okazu-ok` (ピック一言 + おかずOK)

- **画面状態/前提**: Step 11 から進行 (タブタップ or ソフトチェーン)。「おかずOK」ボタン (1 段箱ラベル) 表示中。
- **ハイライト対象** (button-only 構造・見本なし): 「おかずOK」ボタンにスポットライト/ターゲットリング。**指ポインタは出さない**。
- **ポノ吹き出し**: (ゲーム既存: 「おかずが ぜんぶ そろったね！「おかずOK」を おしてね。」)
- **ナレーション音声**: 「ピックを さしても かわいいよ。できあがったら、「おかず オッケー」を おしてね。」
- **voice**: `tut2_12_okazuok`
- **進行フック**: 「おかずOK」button → stage-complete (`tutorialOnStageComplete`) → `tut2-complete`。
- **フォールバック/ガード**: タブ寄り道・おかず/カップ追加は全部自由 (待つ)。**ゲート解除ガード**: 子供がカップ内おかずを消してゲート未充足に戻ったら「おかずOK」が消える → resync でトリムをカップパレットに戻し、吹き出しはゲーム既存発話に任せる (新規ナレは流さない — 繰り返し否定/口うるさ回避)。再充足で本ステップの表示に復帰。

### Step 13 — `tut2-complete` (かんせい)

- **画面状態/前提**: 完成オーバーレイ「🎉 おべんとう かんせい！」表示 (`#complete-title`)。じぶんでつくるは採点なし / おねがいは星+どんぐり (スコアはおねがいのみ)。
- **ハイライト対象**: なし (オーバーレイ自身が主役。トリム/指は全消去 — `tutorialOnStageComplete` の既存クリア処理どおり)。
- **ポノ吹き出し**: なし。
- **ナレーション音声**: 「わあ、すてきな おべんとうが できたね！」
- **voice**: `tut2_13_complete`
- **進行フック**: stage-complete で本ステップ表示 → 音声終了 (onEnded) で `tut2-favorite` へチェーン (旧 complete-result チェーンと同型)。
- **フォールバック/ガード**: `fallbackMs: 5000` でチェーン保証。**この時点で `done` フラグ保存** (⭐を押さず × で閉じても完了扱い — 再表示しない)。

### Step 14 — `tut2-favorite` (おきにいり)

- **画面状態/前提**: 完成オーバーレイ表示継続。`#save-fav-btn` (「⭐ おきにいりに いれる」) が見えている。
- **ハイライト対象**: `#save-fav-btn` (ターゲットサークル)。
- **ポノ吹き出し**: 「おきにいりに とっておけるよ<br>ほしマークを おしてね」 (既存 19488 の文言を踏襲)
- **ナレーション音声**: 「つくった おべんとうは、おきにいりに とっておけるよ。ほしマークを おしてね。」
- **voice**: `tut2_14_fav`
- **進行フック**: `#save-fav-btn` 押下 **または** × クローズ → チュートリアル終了 (保存は強制しない)。
- **フォールバック/ガード**: どちらを押しても終了・以後は出ない (done は Step 13 で保存済み)。音声失敗 → 吹き出しのみで案内継続。

---

## 3. 音声生成リスト (TTS バッチ入力)

パイプライン: **既存 Gemini "Aoede" 1.15x (`bento_basic_tutorial` プリセットに一致、admin/index.html:1817-1820、style: `[cheerfully but calmly]`) 継続** ([[policy_no_fal_ai_tts]] — fal-ai TTS 不使用)。**AGENTS.md §2.5.3 は "Leda" と記述しているが、admin プリセットが実生成の正 (source of truth)**: bento は Aoede、stickerbook (admin:1872) は Leda で別系統。既存流用の sk-intro / 開店カットシーンも本 Aoede プリセットで生成された音声。生成後は **faster-whisper 文字起こし → キーワード照合まで必須** ([[feedback_tts_whisper_verify_required]])。
保存先: `assets/audio/bento/tutorial/`。「OK」は TTS 入力では「オッケー」表記で読みを固定。

### 新規収録 (20 本)

> batch:1058-tut2-hotfix5 (2026-07-11) で `tut2_05b_undo` / `tut2_17_leafpick` / `tut2_18_leafplace` の 3 本を追加 (17 本 → 20 本)。

| # | voice file id | 読み上げテキスト (TTS 入力そのまま) | 想定秒数 |
| --- | --- | --- | --- |
| 1 | `tut2_01_greet` | ようこそ、ポノの おべんとうやさんへ！きょうは いっしょに、すてきな おべんとうを つくってみよう。 | 約 6 秒 |
| 2 | `tut2_02_box` | きょうは この おべんとうばこを つかうよ。「これで オッケー」を タップしよう。 | 約 5 秒 |
| 3 | `tut2_03_rice` | つぎは ごはん！「ごはんを よそう」を おすと、こんなふうに はいるよ。おなじように、タップしてね。 | 約 7 秒 |
| 4A | `tut2_04a_eyes` | のりで おかおを つくろう！まずは、おめめを ふたつ おいてみよう。 | 約 5 秒 |
| 4B | `tut2_04b_mouth_nose` | つぎは、はなと くちも おいてみて。 | 約 3 秒 |
| 5 | `tut2_05_norimove` | のりは ゆびで うごかせるよ。すきな ばしょまで、すーっと うごかしてね。 | 約 5 秒 |
| 5B | `tut2_05b_undo` | うごかしたら、「とりけす」で もとに もどせるよ。「とりけす」を おして、おかおを もとに もどそう。 | 約 6 秒 |
| 6 | `tut2_06_noriedit` | のりを タップすると、まわしたり おおきく できるよ。できたら「のり オッケー」を おそう。 | 約 5 秒 |
| 7 | `tut2_07_okazu` | つぎは メインの おかず！すきなのを ひとつ、タップして いれてみよう。 | 約 5 秒 |
| 8 | `tut2_08_cupbtn` | おいしそうに はいったね。つぎは、「カップへ」を おしてね。 | 約 4 秒 |
| 9 | `tut2_09_cup` | ちいさい おかずは カップに いれるよ。すきな カップを、ひとつ えらんで おこう。 | 約 6 秒 |
| 10 | `tut2_10_cupfood` | カップの なかに いれる おかずを、すきなの ひとつ えらんでね。 | 約 5 秒 |
| 11 | `tut2_11_tabs` | 「はっぱ」を おすと、おかずの したに はっぱを しけるよ。「しきり」で なかを わけることも できるよ。 | 約 6 秒 |
| 12 | `tut2_12_okazuok` | ピックを さしても かわいいよ。できあがったら、「おかず オッケー」を おしてね。 | 約 5 秒 |
| 13 | `tut2_13_complete` | わあ、すてきな おべんとうが できたね！ | 約 3 秒 |
| 14 | `tut2_14_fav` | つくった おべんとうは、おきにいりに とっておけるよ。ほしマークを おしてね。 | 約 5 秒 |
| 15 | `tut2_15_request` | アライグマくんの おねがいに あわせて、おべんとうを つくって あげようね。 | 約 5 秒 |
| 16 | `tut2_16_deliver` | アライグマくん、とっても よろこんでいるよ！また つくって あげようね。 | 約 5 秒 |
| 17 | `tut2_17_leafpick` | はっぱの タブから、レタスを えらんでね。 | 約 3 秒 |
| 18 | `tut2_18_leafplace` | おべんとうばこを タップして、おかずの したに レタスを しこう。 | 約 4 秒 |

whisper 照合キーワード (全 20 本必須):
01=「おべんとうやさん」, 02=「おべんとうばこ」「タップしよう」, 03=「ごはんを よそう」「おなじように」, 04a=「おかお」「おめめ」「ふたつ」, 04b=「はな」「くち」「つぎは」, 05=「うごかして」「すきな ばしょ」, 05b=「とりけす」「もとに」, 06=「まわしたり」「おそう」, 07=「メイン」「すきなの」, 08=「カップへ」, 09=「すきな カップ」「えらんで」, 10=「なかに」「すきなの」「えらんで」, 11=「はっぱ」「しきり」, 12=「ピック」「オッケー」, 13=「できたね」, 14=「ほしマーク」, 15=「アライグマ」「おねがい」, 16=「アライグマ」「よろこんで」, 17=「レタス」, 18=「したに」「レタス」。

### 既存流用 (再録なし・変更禁止)

| 系統 | ファイル | 用途 |
| --- | --- | --- |
| sk-intro 3色モーダル | `sk_intro_01`〜`sk_intro_05` | あか/きいろ/みどりの なかま説明 (別システム、そのまま) |
| 開店カットシーン | `shop_opening_intro_01` / `shop_opening_customer_01` / `shop_opening_request_araiguma` (req.id 連動) | おねがいモード 3 枚パネル (収録済み・そのまま) |

### 廃止 (再利用禁止・ディスク残置)

`basic_tut_01`〜`basic_tut_15`, `okazu_more_01`, `okazu_more_02`, `favorite_save_01` — **ID を新台本にマップし直さない** (ファイル名と中身の対応事故防止のため、新ステップは必ず tut2_* を使う)。ファイル自体は削除しない。

---

## 4. おねがいモード差分 (薄いラッパー)

コア 15 ステップは両モード共通。おねがいモード初回のみ以下を追加。固定 NPC = `araiguma` (アライグマくん、`TUTORIAL_FIXED_REQUESTER_ID` 既存)。

| id | タイミング | 内容 | voice | 進行フック |
| --- | --- | --- | --- | --- |
| `tut2-w1-opening` | コア開始前 | 既存 開店カットシーン 3 枚 (ポノのおべんとうやさん → アライグマくんが きたよ → アライグマくんの おねがい)。**既存パネル・既存音声をそのまま再生**、チュートリアルは待機のみ | (既存流用) | カットシーン終了 (既存クローズ) |
| `tut2-w2-request` | カットシーン直後、`tut2-greet` の**代わり**に表示 | greet カード同型 (はじめる/やめる/スキップ導線維持)。カード内テキスト「アライグマくんの おねがいだよ！」+ カード表示中に橋渡しナレ 1 本再生 | `tut2_15_request` | button 「はじめる →」(`#tut-greet-next`) → `tut2-box` (Step 1 と同じ button フック) |
| `tut2-w3-deliver` | `tut2-okazu-ok` → stage-complete 後、既存お届けパネル「アライグマくん に おべんとうを わたしたよ」+ 採点結果の表示後 | 観察形ナレ 1 本 (キャラは喋らない)。その後 `tut2-favorite` へ合流 | `tut2_16_deliver` | 音声終了 → `tut2-favorite` (fallbackMs 6000) |

- おねがいモードでは `tut2-greet` (tut2_01) と `tut2-complete` (tut2_13_complete) を W2 / W3 が**置き換える** (じぶんでつくるでは tut2_01 / tut2_13 を使用)。box〜okazu-ok の 12 ステップ (box/rice/4A/4B/nori-move/nori-edit/okazu-main/cup-btn/cup-place/cup-food/tabs-intro/okazu-ok) は完全共通。
- 新規パネル・新規 UI は作らない。既存カットシーン / お届け演出 / 採点をそのまま流し、ナレ 2 本だけ足す。
- sk-intro はおねがいの回頭ガイドとして既存条件のまま表示 (本台本の管轄外)。

---

## 5. 実装メモ (簡潔)

- **voice registry**: `BENTO_TUTORIAL_STEP_VOICE` (bento/index.html:9422) を新 step id → tut2_* に総入れ替え。`BENTO_TUTORIAL_VOICE_VERSION` を新文字列にバンプ。例: `'tut2-box': 'tut2_02_box', 'tut2-nori-face-eyes': 'tut2_04a_eyes', 'tut2-nori-face-mouth-nose': 'tut2_04b_mouth_nose', … 'tut2-tabs-intro': 'tut2_11_tabs', 'tut2-okazu-ok': 'tut2_12_okazuok', 'tut2-favorite': 'tut2_14_fav', 'tut2-w2-request': 'tut2_15_request', 'tut2-w3-deliver': 'tut2_16_deliver'`。
- **死ぬ旧 step id**: `greet(旧) / box / rice-place / tab-rice / decor / nori-ok / tab-okazu / okazu-red / okazu-overlap / layer-edit / layer-edit-try / move-requested-food / okazu-more / small-accessory / small-cup-food / small-next / complete-result / favorite-save`。レイヤー教習系レンダラ (20896 前後の layer-edit-try / tutorialOnLayerMoved / tutorialSnapItemToLayerDemoPoint / tutorialMoveRequestedFoodToLowerPoint) は削除対象。
- **チュートリアル中の box 固定 (Step 2)**: `box_rect_split` を preselect し、他の箱の選択 (タップ切替) を無効化。理由: 無料 tier は元々 `box_rect_split` 1 箱のみ (common/tier.js:214-216 `FREE_BENTO_BOX_IDS`)。book/app で開放される他 6 箱は全て tierCount:2 のため、選ぶと OK ボタンが「2だんめOK」表記になり音声「これで オッケー」と食い違う + tier3/2段フロー分岐がコア 15 ステップの 1 段前提を壊すので排除。suppress: `setFreeGuideStep('box')` の既存 setSpeech (「まずは おべんとうばこを えらぼう！」) は tutorial 中のみ固定文「きょうは これを つかうよ！」に差し替え。
- **フック配線 (既存流用 + 差分)**:
  - `tutorialOnItemPlaced` (21311): rice/decor/cup/food ガードを新 step id に付け替え。small-cup-food 相当の in-cup 判定・トマト整列・パレットロック解除はそのまま流用。
  - `tutorialOnItemMoved` (21302): 対象を「decor (tut2-nori-move 中)」にも拡張。decor 編集パネルの ↺↻/ちいさく/おおきく 押下 (15517-15534) からも同フックを呼ぶ (move 相当扱い)。
  - `tutorialOnGuideChange` (21253): ブリッジを 2 本に — (a) nori 系 step 中に tier2Main へ進んだら `tut2-okazu-main`、(b) `tut2-cup-btn` 中に tier2Side へ進んだら `tut2-cup-place`。
  - `tutorialOnCupEditorClosed` (21266): step 名を `tut2-cup-food` に付け替えるだけ。
  - tab フック (`tutorialInstallTabHook` / 20496 の `.free-tab` クリック検知): `tut2-tabs-intro` 中の はっぱ/しきり タップ進行に流用 (旧 tab-rice/tab-okazu と同系統)。
  - `tutorialOnStageComplete` (21375): `tut2-complete` へ。**現 step を問わず遷移する既存実装を維持** (Step 11 で おかずOK 直押しされても置き去りにならないガード)。done フラグ保存をここに移す。
  - `tut2-tabs-intro` のソフトチェーン (音声終了 + 約 4 秒 inactivity → `tut2-okazu-ok`): complete チェーンと同じ onEnded + タイマー実装。タイマーは step 退出時に必ず clear (flag 系 setTimeout invariant 準拠 — state guard 付き)。
  - 長尺音声中のボタン押下は `stopBentoTutorialVoice()` → 即 advance (v1500 FIX6 の queue-lag 対策を box/カップへ/おかずOK にも適用)。
- **見本→まねっこ 2 段構造の実装方針 (2026-07-07 追加)**:
  - **Phase A の見本アニメ = 指ポインタ + アイテムゴースト配置**。ゴースト実装案 (実装バッチで確定):
    - **(a) tutorial ghost layer 案**: 既存 `createFreePlacedElement` を tutorial 専用レイヤーに描画。`opacity: 0.6` + `pointer-events: none`、動きだけ見せて Phase B 遷移時に消す。履歴 (undo) には載らない。**推奨** — side-effect (bgm/pop 音・ゲート再計算) が最小。
    - **(b) tutorialDemo フラグ案**: `addFreeLayoutItem({ tutorialDemo: true })` で実配置 → タイマーで即 `removeFreeItemData` (Undo / gate 計算スキップ)。既存 place パスと同一のためコード追加は少ないが、item-placed フックが誤発火しやすい (要フラグガード)。
  - Phase A → Phase B の遷移は 各ステップ 1.5〜2.5s のタイマー (state guard 付き, setTimeout invariant [[feedback_flag_encounter_settimeout_invariant]] 準拠、step 退出時に必ず clear)。
  - Phase B 中は 指 + トリムのみ (ゴーストなし)、実 item-placed / item-moved フックで進行。
- **Step 4A / 4B (のり 2 ラウンド固定シーケンス) の実装ヒント**:
  - **各ラウンドで独立キュー**:
    - Step 4A: `tutorialState.noriQueue = ['nori_eye_round', 'nori_eye_round']`, `noriIdx = 0` を Step 4A 進入時に seed。2 到達で Step 4B へ遷移し、キューを差し替え。
    - Step 4B: `tutorialState.noriQueue = ['nori_nose_bear', 'nori_mouth_smile']`, `noriIdx = 0` を Step 4B 進入時に seed。2 到達で `tut2-nori-move` へ遷移。
  - `tutorialOnItemPlaced` の decor 分岐で `item.id === noriQueue[noriIdx]` を照合 — 一致で `noriIdx++`。**不一致は無視** (§6 未決事項 5 で最終挙動確定)。既存の `countDecorOnTier(1) > 0` 単純ガードは廃止。
  - 期待外品目のパレット dim: tutorial 中のみ `.free-palette-item` に `data-tut-expected-id` 属性を付け、CSS で `opacity: 0.4` を非期待品目に適用。**ラウンド遷移時 (Step 4A → 4B) に attr を刷新**、Step 5 進入時に必ず属性除去 (leak 防止)。
  - サブステップ内のクラスタ座標は 既存 `nori_face_set_smile` の cluster (index.html:7521-7525 の x/y) を流用: 4A-a=7522 (左目)、4A-b=7523 (右目)、4B-a=7524 (鼻)、4B-b=7525 (口)。
- **必須 desync ガード (実装しないと v3 ルール上ソフトロック)**:
  - **C3 リスタートボタン**: `#bento-restart-btn` (5967) はビルド全編で表示 (hide リスト 21452 に tutorial 条件なし)。押すと restartSimpleBentoRound → loadFreeLayoutStage (17770) が freeGuideStep を box に戻すが tutorialState.step は残る → 完全 desync。対策 (a) **推奨**: tutorialState.active 中は 21452 の hide 条件に追加して非表示 (配線 1 行 + 途中リセットで作品を失う事故も同時に防げる) / 代替 (b): restart 経路にフックを足し、チュートリアル中の restart で tutorialState を `tut2-box` に再同期。
  - **P1 ごはん削除**: canRemoveFreeItemNow (14183-14186) が rice の「けす」を許可しており、decor 中に消すと のりOK 押下で rice step へ差し戻される (16725-16727) → 同型 desync。対策: **チュートリアル中は rice 削除をブロック (推奨)** / 代替: rice 差し戻し検知で `tut2-rice` に再同期。Step 4〜6 のフォールバック欄参照。
- **BENTO_TUTORIAL_PAUSED (6167) 解除条件**: (1) tut2_* 17 本生成 + faster-whisper キーワード照合 PASS、(2) step machine の新 id 配線 + 旧レンダラ削除 + 見本→まねっこ 2 段構造 + Step 4A/4B のり 2 ラウンド (各 2 品目) シーケンス配線、(3) 実ブラウザ (非モック Audio) で全 15 ステップ (4A/4B 含む) + Phase A/B の順 + 両モード回帰 ([[feedback_puzzle_tutorial_real_browser_trap]] — computed opacity 時系列 + 負コントロール)、(4) sk-intro 併存確認 (8579 の PAUSED 分岐は解除時に「おねがい回頭のみ」へ戻る — 挙動変化に注意)、(5) `sw.js` CACHE_VERSION バンプ。
- **storage key**: 旧 `bento_tutorial_done_v1` のままだと既存プレイヤーに新チュートリアルが出ない。`bento_tutorial_done_v2` へ更新推奨 (全員に新台本を 1 回見せる)。歯車の再表示ボタン (21401) の removeItem 対象も同時更新。
- **Phase A の パレット→目的地 演出はドラッグではなく [スクロール→タップ] に統一 (batch:1058 tap-scroll-fix)**: ゲーム本体がタップ専用配置 (batches 1040-1046 cup-first) のため、見本もタップに揃える。 対象 5 箇所: rice / nori 4A・4B (eyes / nose+mouth) / okazu-main / cup-place / cup-food。 パレット外にあるアイテム (SIMPLE_DECOR_PALETTE_ORDER の nori_nose_bear index 13 / nori_mouth_smile index 14 等、 book tier で section 見出しで押し出されるもの) は `paletteEl.scrollIntoView({ block:'nearest', inline:'nearest', behavior:'auto' })` → `requestAnimationFrame` で scroll コミット後の rect で `tutorialAnimateTap` を再開始 (helper: `tutorialScrollThenTap(paletteEl, step.id)`)。 step id ガードで in-flight step 遷移中の暴走を防ぐ。 ゴースト表示 (`#tut-ghost-layer` 内、 stage-relative の freeX/Y 座標) は不変。 **例外**: Step 5 (`tut2-nori-move` の `tutorialAnimateDrag(from, to, {})`) は「置いたのりを指で動かす」on-stage drag デモなのでそのまま維持。

---

## 6. 未決事項 (オーナー確認)

1. **トリガー案**: A案 (両モード初回どちらでもコア発火・推奨) / B案 (おねがい初回のみ) のどちらにしますか？
2. **storage key リセット**: `done_v1` → `done_v2` に変えて既存プレイヤーにも新チュートリアルを 1 回見せてよいですか？ (推奨: はい)
3. **Step 5 (のり移動) の必須度**: 現案は「実際に 1 回動かす (または編集パネルを触る) まで待つ」。3 歳児が詰まる懸念があれば「のりOK 押下でいつでもスキップ可」のガードは既に入れてありますが、そもそも移動を任意にして音声案内だけにする案もあります。どちらにしますか？
4. **W2 橋渡しナレ (tut2_15)**: 開店カットシーン (収録済み音声あり) の直後にもう 1 本ナレを足す案です。くどければ W2 を削って カットシーン → tut2-box 直行にできます (削れば 新録は 15 本)。
5. **Step 4A / 4B の 強制品目シーケンスで、途中で子供が違うのりをタップした場合の挙動 (両ラウンド共通ポリシー)**: (i) **やんわり無視・ハイライトの品目を待つ** (推奨。順序も選択肢も厳格) / (ii) **それも受け入れて次の品目へ** (順序は守るが選択肢は緩め、期待外の place も進行にカウント) / (iii) **完全に自由** (期待外 place でも `noriIdx` を進める。ラウンド終了条件は「そのラウンドの目標数 (2) が置かれたら」ではなく「期待品目が全部置かれたら」とするか、`countDecorOnTier(1) >= 4` の総数ガードへ後退)。推奨は (i) — 見本と一致させるほうが「まねっこ」が成立しやすく、4A→4B のリズムも保たれる。

---
*作成: 2026-07-03 / 対象コード: bento/index.html (BENTO_TUTORIAL_PAUSED=true 時点, branch develop-app)*
