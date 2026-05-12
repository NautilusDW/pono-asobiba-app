---
name: Quizland リスのくるみちゃん（アシスタントキャラ）
description: フクロウ博士のクイズの新アシスタントキャラ。リスの女の子、元気で優しいお姉さん感、**VOICEPEAK 「女性4」 プリセットで問題文を読み上げ (2026-05-12 確定、 VOICEVOX 雨晴はうは試聴比較の結果却下、 中継案 「女の子」 も同日内 27 ファイル試聴で却下 → 「女性4」 へ再差替 = [feature_quizland_voicepeak_pivot_jyosei4.md](feature_quizland_voicepeak_pivot_jyosei4.md))**。立ち絵は 13 ポーズ variants を assets に展開済、**OP シネマティック Panel 2 で初登場したら Panel 6 まで継続表示する仕様 (v937 以降の確定方針、 v938 で全 12 line に kurumiImg 注入完了で完全継続表示が成立)** — Panel 2 (`kurumi_hi` 挨拶 + line 3 にも `kurumi_hi` 注入) → Panel 3 (`kurumi_clasp` 立ち絵維持) → Panel 4 (`kurumi_clasp` 立ち絵維持) → Panel 5 (line 1-3 `kurumi_clasp` 維持 + line 4 `kurumi_wink` 「まかせて！」) → Panel 6 (`kurumi_clasp` 立ち絵維持) の 5 panel ずっと visible、ポーズだけシナリオに合わせて変化する設計 + op-layout-editor で 13 ポーズ × 3 VC の slot 個別調整可能 + 左ペインに Kurumi バリエーションサムネ追加 + シナリオ行 speaker に「くるみ」追加 + scenario モードのデフォルトデータを本番 OP_PANELS と同期 + scenario state に version 付き auto migration を実装し既存ユーザーも editor リロードだけで新 defaults へ自動移行 + シナリオ編集モードの dialogue 行に「ポノ」「はかせ」「くるみ」3 dropdown を追加 (各 line で 3 キャラの立ち絵 variant を独立に選択可能) + ローカル editor → クリップボード Export → orchestrator が saved-layout.json `__op_layout.{B,C,D}.kurumi.perVariant` にマージというワークフローが v932 で初めて 13 entries 全量で正式運用、 全 VC の kurumi.perVariant が初期値 (`kurumi_001` 値全コピー) から editor 編集後の個別調整値に更新 (B では variant ごとに slotH=278〜380, slotOffsetX=54〜88 が分散) + **v933 で runtime kurumi CSS の per-VC `.op-char-slot` を `right: 0` 右端アンカーから `left: 50% + transform: translate(-50%, -50%)` 中央アンカーへ統一 (B/C/D 全 VC、 pono/hakase と同じ式)、 これにより editor preview と runtime の transform 計算式が完全一致し、 editor で詰めた slotOffsetX/Y がそのまま runtime に反映される根本修正** (sw v921 OP 初投入 / v922 クロスレビュー反映 / v923 13 ポーズ管理機能 / v924 クロスレビュー C HIGH3+MED4 修正 / v925 左ペイン Kurumi サムネ + シナリオ speaker 拡張 / v926 defaultScenario() を本番 OP_PANELS 同期 / v927 migrateScenario の kurumi 強制 hakase 化バグ修正 + buildScenarioPanelsLiteral の kurumi シリアライズ対応 + kurumiImg 空値正規化 / v929 SCENARIO_DATA_VERSION='v927' 導入で auto migration 実装、 DevTools 手動 reset 手順は不要に / v931 シナリオ dialogue line に「はかせ」「くるみ」 dropdown 追加 + HAKASE_VARIANTS 定数 + hakasePathByName/hakaseFullPath ヘルパ + buildScenarioPanelsLiteral に hakaseImg シリアライズ + migrateScenario に hakaseImg 空値正規化 + SCENARIO_DATA_VERSION v927→v930 / v932 ローカル editor 編集値を saved-layout.json `__op_layout` に反映、 kurumi.perVariant 13 entries 初の本格 publish、 220 keys 完全温存 / v933 runtime CSS アンカーを editor preview と統一、 saved-layout.json の kurumi slot 値が runtime で初めて editor で見たとおりに再現される / v934 ユーザー誤指定で同値再 export の無変更 publish (sw だけバンプ) / v935 06-49-00 Export を merge し VC C / D 側にも初めて hakase + kurumi の実値を publish (12 entries diff、 B は kurumi_clasp の slotH/slotOffsetY 微調整、 C/D は hakase.slotOffsetX と kurumi.slotOffsetX/slotH を実値化) / v936 07-22-05 Export を merge し editor の「全ポーズに反映」ボタン (前 task で実装) の初実用 publish。 70 entries diff は全て kurumi.perVariant のみで、 3 VC × 12-13 variants の一括同期 (B: 13 variants 全部 slotOffsetX=77/slotOffsetY=19 統一、 C: 12 variants slotOffsetX=158 で kurumi_001 と揃え、 D: 12 variants slotW=550/slotH=413/slotOffsetX=158 で kurumi_001 と揃え)、 pono/hakase/singleBox/narration は差分ゼロ。 配信フローは「ローカル editor → 📥 Export → JSON ファイル → Claude にファイル名を伝える → Claude エージェントで反映」 が確定運用 (詳細は [reference_op_layout_publish_workflow.md](reference_op_layout_publish_workflow.md)) / v937 — 仕様変更: 「kurumi は Panel 2 で登場したら Panel 6 まで継続表示」をプロジェクト方針として確定。 quizland/index.html の OP_PANELS Panel 3 / Panel 4 の各 line に `kurumiImg: kurumi_clasp.webp` を注入し、 op-layout-editor の `defaultScenario()` にも同期反映、 SCENARIO_DATA_VERSION を `'v930'` → `'v937'` に bump して既存ユーザーも auto migration で取り込み。 同時に 07-31-53 Export を merge — B kurumi.flat の slotH 320→303、 perVariant.kurumi_001 の slotW 280→227 / slotH 278→269 のみの小さな調整 (B kurumi_001 の base box 微調整、 C/D は変更なし、 pono/hakase/singleBox/narration も差分ゼロ)。 220 keys 完全温存、 kurumi.perVariant 13 entries 全 VC 維持 / **v938 (現行) — 全 12 line に kurumiImg 注入完了で完全継続表示が成立**: v937 までは Panel 2 line 3 (pono「はかせ、くるみちゃん、…」) と Panel 5 line 1/2/3 で kurumiImg 未注入のため kurumi 立ち絵が一瞬消える残課題があったが、 v938 で残り 4 line にも `kurumiImg` を明示注入 (Panel 2 line 3 = `kurumi_hi`、 Panel 5 line 1/2/3 = `kurumi_clasp`)、 Panel 2 line 2 (kurumi 初登場) 〜 Panel 6 末尾までの **全 12 line で kurumiImg がカバーされ完全継続表示**が実現。 SCENARIO_DATA_VERSION を `'v937'` → `'v938'` に bump で auto migration、 quizland/index.html OP_PANELS と op-layout-editor `defaultScenario()` を同期、 saved-layout.json は無変更 (= シナリオ JS 側だけの修正、 slot 値や 220 keys 完全温存)。 「kurumi 登場以降の line には必ず kurumiImg を注入する」 設計原則を明文化、 今後新しい Panel/line を追加する際もこの原則に従う**)
type: feature
---

# Quizland リスのくるみちゃん

## キャラクター設定
- **名前**: リスのくるみちゃん（くるみ）
- **種族**: リス（茶色＋クリーム色の毛色）
- **役割**: フクロウ博士のアシスタント。クイズの問題文と選択肢を読み上げる
- **見た目**:
  - ふさふさの大きなしっぽ
  - 首に **赤いもみじ風スカーフ**
  - 頭に **小さな紅葉 + どんぐり風アクセサリー**
  - ぱっちりした大きな目、ピンクの頬、いつも笑顔
- **絵柄スタイル基準**:
  - 絵本風水彩タッチ（やわらかいエッジ、淡い陰影）
  - パレット: 茶 + クリーム + アクセントの紅葉赤、全 variant で統一
  - 透過 PNG / WebP（背景なし）
- **性格**:
  - 元気で親しみやすい
  - 子供と仲良し、お姉さん感のある優しさ
  - 博士のアシスタントとして頼れる存在

## 採用経緯
- 元々は博士本人がクイズを読む設計だった (owl preset = 年配おじいさん風 babble voice)
- VOICEVOX で博士キャラに合うおじいさん風話者の候補が乏しく、採用断念
- 代わりにアシスタント役の新キャラとしてくるみちゃんを追加
- 博士キャラ自体は babble voice (`js/quizland-babble.js` の owl preset) で温存（OP シネマティック・ヒント等の博士セリフで継続使用）

## 音声エンジン方針 (2026-05-12 確定: VOICEPEAK 「女性4」 一本化、 旧 「女の子」 中継案は再試聴で却下)

- **2026-05-12 ユーザー判断 (二段階)**:
  1. まず VOICEVOX 雨晴はうは試聴で雰囲気が合わず却下、 VOICEPEAK 「女の子」 で統一決定 (中継確定)
  2. 同日内に 27 ファイル試聴の結果 「女の子」 も雰囲気が合わずユーザー判断で却下 → **VOICEPEAK 「女性4」 プリセット** に再差替で最終確定
- くるみ全件 (912 件想定 = 問題本編 907 + 第1〜5問目 5) を **VOICEPEAK 「女性4」 プリセット (2026-05-12 確定、 旧「女の子」 試聴の結果却下)** で統一録音
- 博士担当 (48 件) は **VOICEPEAK 「ナレーター おじいさん」 (秦なおき声、 ¥5,980 単体購入確定 2026-05-12)** で確定。 詳細は [feature_quizland_voicepeak_pivot.md](feature_quizland_voicepeak_pivot.md) 参照
- 全件を同一エンジン (VOICEPEAK) で録ることで、 くるみ・博士・ナレ間の音色統一が成立する利点
- 詳細な方針転換の経緯と原則は [feature_quizland_voicepeak_pivot.md](feature_quizland_voicepeak_pivot.md) と [feature_quizland_voicepeak_pivot_jyosei4.md](feature_quizland_voicepeak_pivot_jyosei4.md) を参照

### 【廃案 2026-05-12】 VOICEPEAK 「女の子」 中継案 (履歴温存)
- 2026-05-12 一段階目で VOICEVOX 雨晴はう廃案後、 中継候補として VOICEPEAK 「女の子」 (おまけプリセット) で全 912 件を統一録音する方針が一旦確定 → COWORK-TEST 27 ファイル試聴
- ユーザーが「急遽変更」 とコメントし試聴の結果で却下 (詳細理由は推測のみ)
- → 同日内に **VOICEPEAK 「女性4」 プリセット** へ再差替で最終確定
- 関連 documentation の旧 「女の子」 記述は削除せず 【廃案 2026-05-12】 マーカー付きで履歴温存

### 【廃案 2026-05-12】 VOICEVOX 雨晴はう案 (履歴温存)
- 当初は VOICEVOX 雨晴はう (女声話者、 看護師さん風の温かい優しさ) を第一候補として 907 ファイルを発注予定だった
- ユーザーが試聴比較で「くるみちゃんの雰囲気と合わない」と判断 → 却下
- 比較用候補だった「冥鳴ひまり」「春日部つむぎ」「九州そら / あまあま」「WhiteCUL / ふつう」「もち子さん」 もすべて廃案
- VOICEVOX 関連スクリプト・ツール (`tools/voicevox-generator/`) は当面温存 (削除はユーザー判断待ち)、 主軸は VOICEPEAK に一本化

## 「第N問」 音声 MVP 組み込み (2026-05-12 / sw v957)

- **目的**: 912 件の本格収録に先立ち、 まず 「第1〜5問」 の 5 件 (= `DEFAULT_TOTAL_Q = 5` ぶん) で動作確認
- **配置**: `assets/audio/sfx/quiz/kurumi_dai{1-5}mon.wav` (元素材は `tmp/quizland_NA/kurumi_expanded/kurumi_dai{1-5}mon.wav` に温存)
- **再生タイミング**: `loadQuestion()` 末尾 (mode-btn タップ後 = user gesture 後)
- **重ね合わせ NG → 順次再生**: `playSe('nextQuestion')` (don.mp3) の戻り値 `<audio>` 要素に `ended` イベントを `{ once: true }` でフックし、 終了後に `playSe('kurumi_dai' + N)` を発火 (don 取得失敗時は 300ms フォールバック setTimeout)
- **questionIdx ガード**: `(questionIdx + 1) >= 1 && <= 5` で kurumi 再生、 6 問目以降は don.mp3 のみ (MVP 5 問固定で起きないが念のため)
- **playSe 改修**: 戻り値を `<audio>` 要素 (or null) に変更、 既存呼び出し側 (`playCorrect` 等) は戻り値無視で互換
- **SE_PATHS 追加**: `kurumi_dai1` 〜 `kurumi_dai5` の 5 keys、 wav はそのまま (mp3 化しない)
- **sw.js**: CACHE_VERSION 956 → 957 (precache リストには quiz sfx 含まれないので追加不要、 直前の 1a0079e で既に 956 にセット済だったため新規バンプは 957)

## don → kurumi ラグ短縮 第 2 弾 (2026-05-12 / sw v962)

ユーザー再フィードバック「SE からナレーションまでの間が長い」 を受けて、 v961 の preload + setTimeout(0) では不足だった分を **2 段構え** で更に短縮:

### 改善 A: don.mp3 の `timeupdate` で kurumi 早期 trigger (コードのみ)
- `loadQuestion()` 末尾の don ended ベース順次再生を **timeupdate ベースの早期 trigger に置き換え**
- don.mp3 の `currentTime >= duration - 0.05` (= 残り 50ms) になった時点で `_startKurumi()` を発火
- iOS Safari の timeupdate は ~250ms 間隔のことがあり残り 50ms 以下を見逃す可能性があるため、 **ended fallback も併用** (どちらか早い方で発火)
- **`_kurumiTriggered` フラグ**で二重発火を完全防止 (timeupdate と ended が両方発火するケース対応)
- 効果: don ended → kurumi の固有遅延を **約 50ms 削減**
- don 末尾と kurumi 冒頭が数十 ms 重なる可能性ありだが、 don 末尾の音量は decay で小さく、 kurumi 冒頭は元々 preroll silence (改善 B で除去済) なので **聴感上はむしろ自然な遷移**

### 改善 B: kurumi.wav 5 本の冒頭無音をトリミング (asset 編集、 ffmpeg)
- VOICEPEAK 「女性4」 出力には冒頭 78〜119ms の preroll silence (-40dB 以下) があった
- ffmpeg `silenceremove=start_periods=1:start_duration=0.01:start_threshold=-40dB` で削除
- 削減量 (実測): dai1=115ms / dai2=130ms / dai3=125ms / dai4=130ms / dai5=130ms
- 効果: kurumi 再生開始から「あ」の発音までの遅延を **約 100〜130ms 削減**
- 元 wav は **`tmp/quizland_NA/kurumi_expanded/kurumi_dai{1-5}mon.wav`** に温存済 (本タスクでは別途 backup を作っていない、 必要なら tmp 元素材から再展開可)

### 合計ラグ短縮見込み
- 改善 A: ~50ms
- 改善 B: ~100〜130ms
- 合計: **約 150〜180ms 短縮**
- v961 の preload + setTimeout(0) (~50ms) と合算で v957 比 **~200〜230ms 短縮** に到達

### sw.js
- CACHE_VERSION 961 → 962
- precache リストに quiz sfx は含まれないため追加不要 (HTTP cache でブラウザが取り直す)

### コード参照
- `quizland/index.html` `loadQuestion()` 末尾 (`_donAudio` まわり、 `// v962:` コメントブロック)
- 旧 v961 までの ended ベースは履歴削除 (timeupdate + ended fallback の併用に置換)

### 動作確認手順 (ユーザー向け)
1. ハードリロード (Cmd/Ctrl + Shift + R) で sw v962 取得
2. クイズ第 1 問 〜 第 5 問で don.mp3 → kurumi 「第N問」 の遷移が更に短縮されているか体感確認
3. 違和感 (don 末尾と kurumi 冒頭の重なり等) がないかも合わせて確認

## don → kurumi ラグ短縮 第 3 弾 (2026-05-12 / sw v963)

ユーザー再々フィードバック「SE から第 1 問のナレーションまでまだ空きすぎ、 テンポが乱れる」 を受けて、 v962 (timeupdate 50ms + kurumi 冒頭 -40dB cut) では不足だった分を **3 段** で更に短縮。 最大の効きは改善 A (don.mp3 末尾 silence の大幅カット)。

### 改善 A: don.mp3 末尾の trailing silence カット (asset 編集、 ffmpeg)
- 元 don.mp3 (1.999979s) は **末尾 -40dB 以下が 1.027s 〜 1.999s = 約 973ms にわたり無音** だった (don の太鼓音は ~1s で鳴り終わるが、 ファイル自体は 2 秒で作られていた)
- ffmpeg `areverse + silenceremove(start_periods=1, start_duration=0.05, start_threshold=-50dB) + areverse` で末尾の無音をトリム
  - 注: 単純な `silenceremove=stop_periods=-1:stop_duration=0.01:stop_threshold=-40dB` は decay 中の小さな谷も「内部 silence」 として刈り取って 0.77s まで縮めてしまうため不採用 (太鼓音の余韻も削れる)
  - areverse 経由なら **末尾の連続 silence のみ** をトリムできる (内部 silence は触らない)
  - 閾値 -50dB は -40dB より「より静かなところまで残す」 = decay tail を保護
- **結果: 1.999979s → 1.195771s (804ms 短縮)** ← v963 で最も効いた改善
- 元 don.mp3 は **`tmp/audio_backup/don_original.mp3`** にバックアップ済 (v963 タスクで初めて backup フォルダ作成)

### 改善 B: kurumi.wav 冒頭を更に攻めてカット — **断念、 v962 baseline 維持**
- v962 で `start_threshold=-40dB / start_duration=0.01` で 78〜119ms カット済
- v963 当初指定の `-50dB / start_duration=0.005` を試すと、 silenceremove の挙動上 **-50dB は -40dB より cut が小さくなる** (より静かな閾値で「無音判定」しやすくなり、 voice の attack が早めに「無音じゃない」と判定されて keep 開始 = 結果として元音声が長く残る)
  - dai1: -40dB 115ms cut → -50dB 108ms cut (= +7ms 戻る)
  - dai4: -40dB 130ms cut → -50dB 79ms cut (= +51ms 戻る)
- 逆方向 (-30dB / -25dB) を試しても voice attack が steep なので追加 cut は ±2-5ms 程度しか増えず、 voice 頭を切るリスクが上回る
- **結論: v962 baseline (-40dB / 0.01) を維持** (= ファイル無変更)。 dai1=1.025828s / dai2=1.025420s / dai3=1.108277s / dai4=1.103175s / dai5=1.088934s
- 元 wav は引き続き `tmp/quizland_NA/kurumi_expanded/` に温存

### 改善 C: timeupdate trigger 閾値 50ms → 150ms 拡大 (コードのみ)
- `quizland/index.html` `loadQuestion()` 末尾の `_onDonTimeupdate` の判定式
  - 修正前: `if (_dur > 0 && _remaining > 0 && _remaining <= 0.05)`
  - 修正後: `if (_dur > 0 && _remaining > 0 && _remaining <= 0.15)`
- don 末尾と kurumi 冒頭が **約 100ms 重なる** (聴感上は自然な遷移、 テンポが詰まる)
- iOS Safari の timeupdate ~250ms 間隔でも 150ms 閾値なら捕捉率が大幅に向上 (ended fallback も従来どおり併用、 _kurumiTriggered で二重発火防止)

### 合計ラグ短縮見込み (v962 比)
- 改善 A (don 末尾カット): **~800ms** (絶対時間短縮として最大、 ただし元々 don 末尾は無音でほぼ無音だったため聴感ラグへの寄与は ~200ms 体感)
- 改善 B (kurumi 冒頭): 0ms (見送り)
- 改善 C (timeupdate 拡大): **~100ms** (don 末尾 0.15s 時点で kurumi 開始 = don と 100ms オーバーラップ)
- **合計: 体感ラグで ~200〜300ms 短縮 (v962 比)、 v957 比 ~400〜500ms 短縮**

### sw.js
- CACHE_VERSION 962 → 963
- precache リストに quiz sfx は含まれないため追加不要 (HTTP cache でブラウザが取り直す)

### コード参照
- `quizland/index.html` `loadQuestion()` 末尾 (`_donAudio` まわり、 `// v963:` コメントブロック + `_remaining <= 0.15`)
- ついでに同行のコメントの typo (`\` → `//`) も同時修正

### 動作確認手順 (ユーザー向け)
1. ハードリロード (Cmd/Ctrl + Shift + R) で sw v963 取得
2. クイズ第 1 問 〜 第 5 問で don.mp3 → kurumi 「第N問」 の遷移が更にテンポよく繋がっているか
3. don の末尾と kurumi の冒頭が **被って聞こえる** が違和感なく自然か (改善 C による 100ms オーバーラップ)
4. 違和感が強い場合は改善 C の閾値を 0.10〜0.12 に下げる余地あり

### 注意点 / 既知の制約
- 改善 A の don.mp3 トリム結果 (1.196s) はファイル先頭の太鼓音 + 短い decay まで保持しており、 太鼓音そのものは欠けていない (ffmpeg `silencedetect` で再確認済 = -50dB 以下の trailing silence ゼロ)
- 改善 B 見送りの理由は ffmpeg silenceremove の動作特性 (start_threshold が低いほど cut が控えめ) によるものであり、 v962 が既に voice attack 直前まで取り切っている
- 改善 C は 150ms 重なるため、 ユーザー試聴で「重なりすぎ」 と感じた場合は段階的に 0.12 → 0.10 へ下げる方針
- iOS Safari の HW デコーダーで mp3 末尾再生がうまくいかないケースに備え、 ended fallback は引き続き必須

## 関連ファイル
- 発注書: `docs/quizland-voicevox-order/COWORK-TEST-ORDER.md`, `docs/quizland-voicevox-order/ORDER-FULL.md`
- 既存博士 voice: `js/quizland-babble.js` (owl preset、shift キャラ別)
- くるみ babble preset: `js/quizland-babble.js` の `kurumi` preset (下記「babble preset」参照)
- 立ち絵 13 variants: `assets/images/characters/kurumi/dance/kurumi_*.webp`（次節）

## 役割設定 (確定: 2026-05-11)

- **博士の謎々を毎回出すアシスタント役**（毎回のルーチンとして定着している、初対面ではない）
- ポノとは元から知り合い → **「初めまして」系のセリフは絶対に入れない**（再会・初対面感の演出 NG）
- ポノの呼び方: **「ポノさん」**
- 博士の呼び方: **「はかせ」**（ひらがな統一、漢字「博士」はキャラ台詞では使わない）
- セリフトーン: 元気で優しい、お姉さん感
- OP 語彙統一: クイズ本編は「**なぞなぞ**」と呼ぶ。「クイズ」という単語をキャラ台詞では使わない

## ポーズアセット運用 (13 variants 確定: sw v923+)

`assets/images/characters/kurumi/dance/` 配下に **基準スタイル統一済み 13 variants** を展開済み。 全 variant で **赤いもみじ風スカーフ・頭飾り（紅葉+どんぐり）・絵本風水彩タッチ・パレット** が完全一致しており、 ポーズだけが差し替わる構造。

| variant | ファイル | ポーズ説明 | 主な用途 |
|---|---|---|---|
| 001 | `kurumi_001.webp` | 基準正面立ち絵 | デフォルト立ち姿、 fallback (v936 時点の saved-layout では D で `slotW=550 / slotH=413 / slotOffsetX=158` で全 13 variants 統一、 C でも `slotOffsetX=158` で全 13 variants 統一、 B でも `slotOffsetX=77 / slotOffsetY=19` で全 13 variants 統一 — v936 「全ポーズに反映」 ボタン発火) |
| hi | `kurumi_hi.webp` | **左手大きく挨拶** | 元気な挨拶、 OP Panel 2 で「こんにちは、ポノさん！」 |
| wave | `kurumi_wave.webp` | 右手で控えめに振る | やわらかい挨拶、 軽い相槌 |
| hooray | `kurumi_hooray.webp` | 両腕万歳・正面笑顔 | 強い喜び、 正解時のお祝い |
| wink | `kurumi_wink.webp` | **ウインク + こぶし** | 元気な合意、 OP Panel 5 で「はーい、まかせて！」 |
| clasp | `kurumi_clasp.webp` | **両手胸前で組む** | 落ち着いた立ち姿、 OP Panel 6 で立ち絵維持 |
| idea | `kurumi_idea.webp` | 閃き・人差し指 + キラキラ | ヒント / 「わかった！」 / お助けセリフ |
| point | `kurumi_point.webp` | 左方向指差し | 「これは…」「みて」 系 / 答え誘導 |
| calm | `kurumi_calm.webp` | 両手頬に添える + 目閉じ微笑 | やさしい微笑、 静かな共感 |
| pray | `kurumi_pray.webp` | 両手お腹前で組む（お辞儀風） | 「おねがい」「ありがとう」 |
| book | `kurumi_book.webp` | 本を読む（緑表紙） | 問題文読み上げ、 学習シーン |
| cheer | `kurumi_cheer.webp` | 両腕万歳・応援風 | 応援、 励まし、 リトライ時 |
| greet | `kurumi_greet.webp` | 左手挨拶・控えめバリアント | hi より落ち着いた挨拶のバリアント |

### 生成元 / スタイル基準

- 元データ: `kurumi_001.webp` を基準に Codex 経由で再生成（visual style 抽出 → 詳細仕様化 → 12 ポーズ regen 発注、 後追いで `cheer` / `greet` を新規追加して計 13）
- 全 variant 共通:
  - 透過 PNG / WebP、 背景なし
  - 同一頭身比率（全身フレーム）
  - 正面寄り（横向き完全 90° は無し、 「やや斜め＋顔は正面」 が基本）
  - 表情ベースは笑顔、 ウインク・目閉じ等は variant ごとに差し替え

### 用途指針

- OP cinematic（次節）は `001` / `hi` / `wink` / `clasp` の 4 variants を使い分け
- 通常クイズ画面の演出（正解時 hooray / 励まし cheer / 読み上げ book / ヒント idea 等）は今後の拡張で variant を増やしていく余地あり
- editor (`tools/op-layout-editor.html`) で 13 variants 全部の slot 位置・サイズを per-VC で個別編集できる（次節「op-layout-editor 拡張」参照）

## OP シネマティック組み込み (Panel 2-6 全 12 line で完全継続表示、 sw v938 以降の確定方針)

くるみちゃんは OP シネマティック (`quizland/index.html` 内 `playOpeningCinematic`) で **Panel 2 line 2 で初登場したら Panel 6 末尾まで一度も消えずに立ち絵を継続表示** する流れで組み込まれている。 sw v937 で「kurumi は Panel 2 で登場したら Panel 6 まで継続表示」 がプロジェクト方針として明文化され、 sw v938 で **全 12 line に `kurumiImg` を注入** (Panel 2 line 3 + Panel 5 line 1/2/3 を v938 で追加注入) することで line 切替時の一瞬消失も完全に解消され完全継続表示が成立。 過去版で Panel 3 / 4 で消える挙動 (sw v921-v936) や Panel 2 line 3 / Panel 5 line 1-3 で消える挙動 (sw v921-v937) は **撤廃**。 Claude は今後「kurumi 登場以降の line で kurumiImg を省く」 「特定 panel/line で kurumi を消す」のような提案をしてはならない。 ポーズ (variant) はシナリオに合わせて変化させるが、 立ち絵は全 5 panel × 全 12 line ずっと visible 維持。 各 Panel/line で使う立ち絵 variant は次のとおり確定 (sw v938+):

### kurumiImg カバレッジ表 (sw v938 時点、 全 12 line)

| Panel.line | speaker | kurumiImg | 注入時期 |
|---|---|---|---|
| 2.1 | hakase | (なし) | くるみ登場前のため意図的に未注入 |
| 2.2 | kurumi | `kurumi_hi` | 既存 (初登場、 sw v921+) |
| 2.3 | pono | `kurumi_hi` | **v938 追加** (line 切替時に消えないように) |
| 3.1 | hakase | `kurumi_clasp` | sw v937+ |
| 3.2 | pono | `kurumi_clasp` | sw v937+ |
| 4.1 | hakase | `kurumi_clasp` | sw v937+ |
| 4.2 | pono | `kurumi_clasp` | sw v937+ |
| 5.1 | hakase | `kurumi_clasp` | **v938 追加** |
| 5.2 | pono | `kurumi_clasp` | **v938 追加** |
| 5.3 | hakase | `kurumi_clasp` | **v938 追加** |
| 5.4 | kurumi | `kurumi_wink` | 既存 (kurumi 発話、 sw v921+) |
| 6.1 | hakase | `kurumi_clasp` | 既存 (sw v922+ Panel 6 残置維持クロスレビュー HIGH 反映) |
| 6.2 | pono | `kurumi_clasp` | 既存 (sw v922+ 同上) |

Panel 1 (ナレーション) と Panel 2 line 1 (kurumi 登場前) は kurumiImg なし (登場前なので意図通り)。 それ以外の **全 12 line** には kurumiImg が必ず注入されている = 「kurumi 登場以降の line には必ず kurumiImg を注入」 という設計原則の物理実装。

### ポーズ並び (Panel 2 → 6)

| Panel | 発話キャラ | kurumi の状態 | kurumi variant |
|---|---|---|---|
| Panel 2 | 博士 / kurumi / ポノ (3 行) | **初登場で発話** (1 line) → 立ち絵 visible 開始 | **`kurumi_hi`** (左手大きく挨拶) |
| Panel 3 | 博士 / ポノ (2 行) | 発話なし、 **立ち絵維持** (両 line に kurumiImg 注入) | **`kurumi_clasp`** (両手胸前で組む待機ポーズ) |
| Panel 4 | 博士 / ポノ (2 行) | 発話なし、 **立ち絵維持** (両 line に kurumiImg 注入) | **`kurumi_clasp`** (待機ポーズ継続) |
| Panel 5 | 博士 / ポノ / 博士 / kurumi (4 行) | **発話** (4 行目) | **`kurumi_wink`** (ウインク + こぶし、 「はーい、まかせて！」) |
| Panel 6 | 博士 / ポノ (2 行) | 発話なし、 **立ち絵維持** (両 line に kurumiImg 注入) | **`kurumi_clasp`** (待機ポーズ、 本編へ遷移) |

→ Panel 2 で `hi` で挨拶 → Panel 3-4 は `clasp` でおとなしく聞いている待機 → Panel 5 で `wink` で「まかせて！」 と返事 → Panel 6 で `clasp` に戻って本編へ。 ポーズだけシナリオに合わせて差し替え、 立ち絵自体は **Panel 2-6 全部で visible**。

### Panel 2 (3 行、 v938 で line 3 にも `kurumiImg: kurumi_hi.webp` 追加注入)

1. 博士「ほっほっほ…ポノか。よくきたのう」 (kurumi 登場前のため kurumiImg なし、 既存)
2. くるみ「こんにちは、ポノさん！」 (`speaker: 'kurumi'`、 `kurumiImg: kurumi_hi.webp` ← 左手大きく挨拶、 既存・初登場)
3. ポノ「**はかせ**、くるみちゃん、あそびに きたよ！」 (`kurumiImg: kurumi_hi.webp` で立ち絵維持、 **v938 で追加注入**)

→ v937 までは line 3 に kurumiImg が無く kurumi が一瞬消える挙動だったが、 v938 で line 3 にも `kurumi_hi` を注入することで Panel 2 line 2 → line 3 の遷移で立ち絵が継続維持される。

### Panel 3 (2 行、 v937 で両 line に `kurumiImg: kurumi_clasp.webp` 注入)

1. 博士「きょうも なぞなぞを するかの？」 (`kurumiImg: kurumi_clasp.webp` で立ち絵維持)
2. ポノ「うん！やりたい！」 (`kurumiImg: kurumi_clasp.webp` で立ち絵維持)

→ くるみは喋らないが **両手胸前で組んだ立ち姿 (clasp) が visible のまま**。 v936 までは Panel 3-4 で kurumiImg 未注入のため立ち絵が消える挙動だったが、 v937 で本仕様に修正。

### Panel 4 (2 行、 v937 で両 line に `kurumiImg: kurumi_clasp.webp` 注入)

1. 博士「ふむふむ… じしんは あるかな？」 (`kurumiImg: kurumi_clasp.webp` で立ち絵維持)
2. ポノ「うーん…でも がんばる！」 (`kurumiImg: kurumi_clasp.webp` で立ち絵維持)

→ Panel 3 と同じく **kurumi_clasp で待機ポーズ継続**。

### Panel 5 (4 行、 v938 で line 1/2/3 にも `kurumiImg: kurumi_clasp.webp` 追加注入)

1. 博士「ほっほっほ、それでよい。…」 (`kurumiImg: kurumi_clasp.webp` で立ち絵維持、 **v938 で追加注入**、 既存 3 行構成本文据置)
2. ポノ「うん！」 (`kurumiImg: kurumi_clasp.webp` で立ち絵維持、 **v938 で追加注入**)
3. 博士「くるみよ、いつもどおり **なぞなぞ**を おねがいするぞ」 (`kurumiImg: kurumi_clasp.webp` で立ち絵維持、 **v938 で追加注入**、 OP 語彙統一で「クイズ」ではなく「なぞなぞ」)
4. くるみ「はーい、まかせて！」 (`speaker: 'kurumi'`、 `kurumiImg: kurumi_wink.webp` ← ウインク + こぶし、 既存)

→ v937 までは line 1/2/3 に kurumiImg が無く kurumi が消えていて line 4 で `kurumi_wink` が突然 fade in する挙動だったが、 v938 で line 1-3 にも `kurumi_clasp` を注入することで Panel 4 → 5 への遷移、 さらに line 1-3 の間も立ち絵が継続維持され、 line 4 では `kurumi_clasp` → `kurumi_wink` のポーズ切替のみが起こる滑らかな演出になった。

### Panel 6 (2 行、 両 line に `kurumiImg: kurumi_clasp.webp` 注入)

1. 博士「では、いくぞ…」 (`kurumiImg: kurumi_clasp.webp` で立ち絵維持)
2. ポノ「うん！」 (`kurumiImg: kurumi_clasp.webp` で立ち絵維持)

→ Panel 6 でもくるみは喋らないが **両手胸前で組んだ立ち姿 (clasp) が visible のまま**。 クイズ本編に入る直前まで「くるみがそこにいる」状態を保ち、 本編の問題読み上げ担当へスムーズに繋がる演出。

### variant 選定の意図

- Panel 2 line 2/3 = `hi`: 初登場 → 大きな挨拶で目立たせる、 line 2 で発話 → line 3 ポノが「くるみちゃん…」と紹介する間も同じ挨拶ポーズを維持 (v938 で line 3 にも `kurumi_hi` 注入)
- Panel 3 / 4 全 line = `clasp`: 博士とポノの会話を聞いている → 両手胸前で組む待機ポーズ (v937 で追加、 落ち着いた立ち姿で会話の邪魔をしない)
- Panel 5 line 1-3 = `clasp` (v938 で追加注入): 博士・ポノが会話している間は待機ポーズを継続。 「くるみよ、いつもどおり なぞなぞを おねがいするぞ」 で依頼を聞いている表情も `clasp` 維持
- Panel 5 line 4 = `wink`: 「はーい、まかせて！」 の元気な合意 → ウインク + こぶしの自信ポーズ (line 3 → 4 で `clasp` → `wink` のポーズ切替が発生)
- Panel 6 全 line = `clasp`: 喋らずに立っているだけ → 両手胸前で組む落ち着いた立ち姿 (hooray のような派手なポーズだと「待機」感が壊れるため)

### プロジェクト方針 (重要、 v937 で確定 / v938 で完全実装)

- **「くるみは Panel 2 で登場したら Panel 6 まで継続表示」** が確定方針 (v937 で明文化、 v938 で全 12 line に kurumiImg 注入完了で完全実装)
- 「Panel 3/4 で消す」 「特定の panel/line だけ非表示にする」 のような提案は今後しない
- ポーズ変化はシナリオに合わせて自由 (clasp / wink / hi / その他 13 variants から選択可) — ただし立ち絵自体は visible 維持
- **「kurumi 立ち絵の継続表示は全 line に kurumiImg を注入することで実現」 が設計原則** (v938 で確定)。 今後新しい Panel/line を追加する際も、 kurumi 登場以降 (= Panel 2 line 2 以降) の line には必ず `kurumiImg` を注入すること。 注入しないと line 切替時に立ち絵が一瞬消える (= `keepKurumiVisible = isKurumi || !!d.kurumiImg` の OR 条件で kurumiImg 未注入かつ speaker !== kurumi の line では visible にならないため)
- ユーザー指示原文: 「くるみはその場所にずっと出てていい。一度最初に出たらずっとそこにいていい。シナリオでポーズも変化させたりはしている」

## 表示制御ロジック (実装)

`playOpeningCinematic` 内 dialogue render ループ (`quizland/index.html` ~L6094-L6122) の判定:

```js
const isKurumi = (d.speaker === 'kurumi');
// ...
const keepKurumiVisible = isKurumi || !!(d && d.kurumiImg);
if (keepKurumiVisible) {
  kurumiSide.classList.remove('hidden');
  kurumiSide.classList.add('is-visible');   // opacity 1 でフェードイン
} else {
  kurumiSide.classList.remove('is-visible'); // opacity 0 でフェードアウト
  // ただし src 未セットの panel では DOM ごと hidden にして領域を返す
  if (!kurumiImgEl || !kurumiImgEl.getAttribute('src')) {
    kurumiSide.classList.add('hidden');
  }
}
```

ポイント:
- **`speaker === 'kurumi'` または `d.kurumiImg` が定義されている line** で立ち絵 visible (= OR 条件)
- それ以外の line では opacity 0 で **フェードアウトのみ** (DOM は残置、レイアウトを動かさない)
- Panel 6 のように speaker は hakase/pono だが立ち絵は維持したい line は `kurumiImg: 'kurumi_clasp.webp'` のように **明示注入**
- `playOpeningCinematic` の `finally` で `is-visible` / `hidden` を全部クリア (replay 時の前回状態を持ち越さない)

## op-layout-editor 拡張 (sw v923+ / v924 クロスレビュー C 修正 / v925 左ペイン Kurumi サムネ + シナリオ speaker / v926 defaultScenario 同期 / v927 migrate + export 修正 / v929 scenario auto migration / v931 シナリオ行に hakase + kurumi dropdown 追加 / v932 ローカル editor → saved-layout.json マージで kurumi.perVariant 13 entries 初の本格 publish 成立 / v933 runtime kurumi CSS アンカーを editor preview と統一 (B/C/D 全 VC を `left:50% + transform:translate(-50%,-50%)` 中央起点に揃え、 editor で詰めた slot 値が runtime にも正しく反映されるよう根本修正) / v934 同値再 export の無変更 publish (sw だけバンプ) / v935 06-49-00 Export を merge し C/D 側にも hakase + kurumi の実値 publish が始まる (12 entries diff: B kurumi_clasp 微調整、 C/D は hakase.slotOffsetX + kurumi.slotOffsetX/slotH を実値化) / v936 07-22-05 Export を merge し editor の「全ポーズに反映」 ボタンの初実用 publish (deep diff 70 entries 全て kurumi.perVariant のみ) / v937 — 仕様変更: 「kurumi は Panel 2 で登場したら Panel 6 まで継続表示」 を確定方針化、 OP_PANELS Panel 3 / 4 各 line に kurumiImg: kurumi_clasp 注入 + editor `defaultScenario()` 同期 + SCENARIO_DATA_VERSION v930→v937 bump、 同時に 07-31-53 Export merge で B kurumi base box 微調整 (3 entries) / **v938 (現行) — 全 12 line × kurumiImg 完全カバレッジ完了: Panel 2 line 3 + Panel 5 line 1/2/3 にも `kurumiImg` 追加注入 (Panel 2 line 3 = `kurumi_hi`、 Panel 5 line 1/2/3 = `kurumi_clasp`)、 quizland/index.html OP_PANELS と editor `defaultScenario()` を同期 + SCENARIO_DATA_VERSION v937→v938 bump で auto migration 発火、 saved-layout.json は無変更 (= シナリオ JS のみの修正)、 「kurumi 登場以降の line には必ず kurumiImg を注入する」 設計原則を明文化**)

`tools/op-layout-editor.html` を拡張し、 ポノ / 博士に並ぶ **「くるみ側」タブ** を追加。 13 variants × 3 VC (B / C / D) で slot 位置・サイズ・透過オフセット等を個別編集して saved-layout.json に publish できる。 v925 で **左ペインに Kurumi バリエーションサムネ一覧** + **シナリオ行 speaker に「くるみ」を追加** し、 ポノとほぼ同等の編集 UI を提供。 v926 で **scenario モードのデフォルトデータ (`defaultScenario()`) を本番 quizland/index.html の OP_PANELS (Panel 2/5 で kurumi line 追加 + Panel 6 で kurumiImg 注入) と完全一致**させた。 v927 で **migrateScenario / buildScenarioPanelsLiteral の kurumi 周り 3 件のバグ** (speaker='kurumi' を hakase に強制変換 / export 時に kurumiImg をシリアライズしない / kurumi line を 2-way 判定で hakase に化けさせる) を一括修正。 **v929 で `SCENARIO_DATA_VERSION` 定数を導入し scenario state を version 付き auto migration 化** — `loadScenario()` が saved state の version を見て不一致なら `defaultScenario()` を強制採用、 `saveScenario()` は保存時に最新 version を確実に埋め込むため、 既存ユーザーも editor をリロードするだけで自動的に新 defaults に移行する (DevTools コンソール手順は不要になった)。 **v931 で「シナリオ編集モード」 の各 dialogue 行に「ポノ」「はかせ」「くるみ」 の 3 dropdown を追加** し (`appendCharImgSelect()` 共通ヘルパで実装)、 各 line で `line.ponoImg` / `line.hakaseImg` / `line.kurumiImg` を speaker と独立に編集できるようにした。 同時に **`HAKASE_VARIANTS` 定数 + `hakasePathByName()` / `hakaseFullPath()` ヘルパを新設**、 `buildScenarioPanelsLiteral()` に `hakaseImg` シリアライズを追加、 `migrateScenario` で `line.hakaseImg` 空値正規化を追加、 `SCENARIO_DATA_VERSION` を `'v927'` → `'v930'` に bump (defaults 構造自体は未変更だが、 line に新フィールドが入る余地が広がったため auto migration を発火させて既存ユーザーも新 schema に揃える)。

### 追加要素 (v923 → v931 累積)

| 要素 | 内容 |
|---|---|
| `KURUMI_VARIANTS` 定数 (~L1184) | 13 variants 名のリスト (`kurumi_001` / `kurumi_hi` / `kurumi_wave` / `kurumi_hooray` / `kurumi_wink` / `kurumi_clasp` / `kurumi_idea` / `kurumi_point` / `kurumi_calm` / `kurumi_pray` / `kurumi_book` / `kurumi_cheer` / `kurumi_greet`) |
| `kurumiPerVariantDefaults` | 13 variants 全部に per-variant defaults (基準は `kurumi_001` と同値、 後で editor で個別調整) |
| `defaultsFor()` 内 `kurumi` object | B / C / D 別の base slot サイズ (B 280×380 / C 380×520 / D 460×630、 aspect 0.73、 右寄せ) |
| 右ペイン (`buildRightPane()`) | くるみ variant ドロップダウン (13 ポーズから選択 → preview 即時切替、 ~L5467-L5469) |
| **左ペイン Kurumi セクション (v925 追加、 ~L1073-L1077)** | `<div class="section" id="kurumi-section" data-drop="kurumi">` を PONO セクション直後に追加。 `<div id="kurumi-grid" class="preset-grid"></div>` で **13 ポーズのサムネ一覧表示**、 サムネクリックで `state[currentVC].kurumi.variant` 切替 + perVariant slot 同期 + render。 info 文: 「サムネクリックで現在 VC のくるみ立ち絵を切替（slot 値は variant ごとに保存）」 |
| **`makeKurumiThumb(v)` 関数 (v925 追加、 ~L2703)** | `makePonoThumb` を完全踏襲。 thumb クリックで `pushUndoSnapshot('くるみ画像選択')` → `kurumiState.variant = v.name` → `syncFlatFromVariant(kurumiState)` → `save(currentVC)` → `render()` → `buildRightPane()`。 **ドラッグ&ドロップは未対応** (kurumi user-added 画像追加機能は未実装)、 info 文でその旨明示 |
| **`buildPresetGrid()` 内呼び出し (v925、 ~L2766-L2772)** | `KURUMI_VARIANTS.forEach(v => kurumiGrid.appendChild(makeKurumiThumb(v)))` を pono / frame と並べて追加 |
| **`render()` の thumbnail highlight 切替 (v925、 ~L3573)** | `#kurumi-grid .preset-thumb` に対し現 variant の `selected` クラス付与 (pono と同様) |
| `applySideToDom('kurumi')` 分岐 | くるみ側の slot inline style 適用処理 |
| `kurumiPathByName()` ヘルパ | variant 名 → assets パスの解決 |
| `buildRuntimeOpLayout()` | `kurumi: sideSnap(s.kurumi, true)` を追加（perVariant 込みで publish payload に含める） |
| CSS rule 生成ループ | `['pono', 'hakase', 'kurumi']` の 3 way に拡張 |
| Speaker ラジオ (右ペイン preview) | 「ポノが話す / 博士が話す」 に **「くるみが話す」** を追加 |
| **シナリオ行 speaker (v925 追加、 ~L5151)** | `buildScenarioDialogueLineRow` 内の speaker forEach を `['hakase', 'pono']` → **`['hakase', 'pono', 'kurumi']`** に拡張、 ラベル: ポノ / はかせ / くるみ の 3 way ラジオ |
| `migrateFrameIds` | 既存 editor state に kurumi seed を backfill + perVariant 13 ポーズを backfill |
| **mirror mode は kurumi 対象外** | mirror モード（左右反転して片方の編集を反映）は pono ⇄ hakase の 2 者間のみ。 くるみは独立 overlay なので対象外 (mirror 関数冒頭で `'kurumi'` の場合は無条件 skip、 ~L1649) |
| **`SCENARIO_DATA_VERSION` 定数 (v929 追加、 v931 / v937 / v938 で bump、 ~L1250)** | **`'v938'` (v938 時点)** (`'v937'` → `'v938'` に bump)。 `defaultScenario()` の構造を変更したら bump する。 `loadScenario()` / `saveScenario()` / `defaultScenario()` の 3 箇所で参照される唯一の真実。 v937 では Panel 3/4 各 line に `kurumiImg` 注入、 v938 では Panel 2 line 3 + Panel 5 line 1/2/3 にも `kurumiImg` 追加注入で全 12 line カバレッジ完了したため、 いずれも auto migration で既存ユーザーへ反映 |
| **`loadScenario()` の version check (v929 追加、 ~L1534-L1546)** | `localStorage[SCENARIO_STORAGE_KEY]` から読んだ object の `version` フィールドが現行 `SCENARIO_DATA_VERSION` と不一致なら、 saved state を捨てて `defaultScenario()` を返す (= 自動 migration)。 不一致時は console.log で `'<old> → <new>'` 表示。 一致時のみ `migrateScenario(parsed)` を実行 |
| **`saveScenario()` の version embed (v929 追加、 ~L1554-L1564)** | 保存時に `Object.assign({}, state.scenario, { version: SCENARIO_DATA_VERSION })` で必ず最新 version を上書きしてから JSON.stringify。 import 経由などで version 欠落の state が入っても保存後は揃う |
| **`HAKASE_VARIANTS` 定数 (v931 追加、 ~L1205)** | はかせ立ち絵の variant リスト。 現状 1 entry (`{ name: 'owl_professor_guide', path: '../assets/images/quizland/owl_professor_guide.webp' }`) のみ。 将来 `owl_professor_explain` 等を追加するだけで dropdown が自動拡張される設計 (forEach で `<option>` 生成)。 `HAKASE_VARIANT_NAMES = HAKASE_VARIANTS.map(v => v.name)` も同時定義 |
| **`hakasePathByName(name)` ヘルパ (v931 追加、 ~L3255)** | basename → assets フルパス解決。 `HAKASE_VARIANTS.find(x => x.name === name)` で検索、 未知名は `HAKASE_VARIANTS[0].path` (= `owl_professor_guide`) fallback。 pono / kurumi の同名ヘルパと完全に同パターン |
| **`hakaseFullPath(input)` ヘルパ (v931 追加、 ~L6381)** | `buildScenarioPanelsLiteral` 用の export ヘルパ。 basename / フルパス / 拡張子付き basename いずれの input でも variant 名抽出 → `HAKASE_VARIANTS` から path 解決、 未知名は `kurumi_001` 相当の `HAKASE_VARIANTS[0].path` fallback。 ponoFullPath / kurumiFullPath と同パターン |
| **`appendCharImgSelect(opts)` 共通ヘルパ (v931 追加、 ~L5270)** | `buildScenarioDialogueLineRow` 内で `line.ponoImg` / `line.hakaseImg` / `line.kurumiImg` の 3 dropdown を生成する共通 builder。 引数 `opts = { label, variants, currentName, onChange, fallbackName }`。 forEach で `<option>` 生成、 select の onchange で各 line の対応フィールドを更新。 3 キャラで重複していたビルダーロジックを 1 関数に集約 |
| **シナリオ行 dialogue line 3 dropdown (v931 追加、 ~L5303-L5345)** | `buildScenarioDialogueLineRow` 内、 既存ポノ dropdown の下に 「はかせの表情/ポーズ」 「くるみの表情/ポーズ」 dropdown を追加。 **speaker に関係なく常時 3 dropdown が表示**され、 各 line で 3 キャラの立ち絵 variant を独立に編集可能。 内部 state では `line.ponoImg` / `line.hakaseImg` / `line.kurumiImg` を basename (例 `'dance_hi'` / `'owl_professor_guide'` / `'kurumi_hi'`) で保持 |
| **`migrateScenario` に hakaseImg 空値正規化 (v931 追加、 ~L1480-L1495)** | `kurumiImg` と同パターン、 `line.hakaseImg` が空文字 / 非文字列なら delete。 renderer 側で意図しない立ち絵切替が起きないように |
| **`buildScenarioPanelsLiteral` に hakaseImg シリアライズ (v931 追加、 ~L6452-L6456)** | line に `d.hakaseImg` があれば `hakaseImg: '<full path>'` を行内シリアライズ (basename → `hakaseFullPath()` でフルパス化)。 runtime はまだ hakaseImg を読まない (HAKASE_VARIANTS が 1 種のみのため実害なし) が、 export スキーマを 3 キャラで揃えて将来拡張に備える |

### v924 クロスレビュー C 修正 (HIGH 3 + MEDIUM 4)

v923 投入直後にクロスレビュー C で指摘された 7 件の不具合を v924 で一括修正:

- **HIGH-1 (propagateMirror に kurumi ガード)**: mirror モードで pono ⇄ hakase 反映時に kurumi も巻き込まれて values が消える事象を修正、 `propagateMirror` 冒頭で `currentTab === 'kurumi'` を無条件 skip (mirror 対象外を明示)
- **HIGH-2 (editor preview に op-side-overlay クラス + CSS で production と同位置)**: editor preview の `<div class="op-side op-side-kurumi">` に `op-side-overlay` クラスを追加 + CSS で本番と同等の absolute レイヤー化 (`.op-sides > .op-side.op-side-overlay { flex: none; position: absolute; ... }`)、 editor で見る kurumi の位置 = 本番位置の parity を確立
- **HIGH-3 (importNarrationJsonFromFile に ent.kurumi 分岐)**: JSON Import 時に kurumi の slot/perVariant が読み捨てられていた事象を修正、 `ent.kurumi` の存在チェックを追加して state にマージ
- **MED-1 (scenario preview text + speaker label 3 way)**: scenario プレビューの speaker 表示に 'くるみ' ラベル追加 (~L5398)、 dialogueBox の class toggle も 3 way 対応
- **MED-2 (scenario preview line.kurumiImg → 画像/slot 反映)**: シナリオ行に `kurumiImg` がセットされている line を preview したとき、 `op-char-kurumi` の src と slot 位置を反映
- **MED-4 (onFrameAspectLoaded を kurumi 対応 + frame removal cleanup)**: frame アスペクト変更時の slot 再計算ロジックを kurumi にも拡張、 frame 削除時の inline style cleanup も対称に
- **MED-5 (height/box guides を kurumi 対応)**: stage 上の height/box ガイドラインに kurumi 用色 (`#fb923c` 橙) を追加、 視覚区別

### バグ修正（v923 同時投入）

- `ponoPerVariantDefaults` の **`dance_wave` 漏れ** を修正（line 1697）。 v905 拡張時に backfill リストから漏れていたため、 既存 editor で `dance_wave` だけ defaults が空のまま読まれる事象を解消

### editor タブ表示モード制限 (元からの仕様、 v925 で明文化)

editor の「くるみ側」タブ (および pono / hakase タブ) は **「対話 (P2-6)」モードでのみ表示** される。 「ナレ」「シナリオ」モードでは tab-bar 全体が `display: none` になる:

```css
/* tools/op-layout-editor.html ~L659-L667 */
#right.is-narration .speaker-row,
#right.is-narration .mirror-row,
#right.is-narration .tab-bar { display: none; }
#right.is-scenario .speaker-row,
#right.is-scenario .mirror-row,
#right.is-scenario .tab-bar { display: none; }
```

これは元からの仕様 (pono / hakase でも同じ)、 シナリオモードでは tab-bar 全体が隠れて各 line で speaker 選択する流れになるため。 kurumi も同パターンに従う。 「対話モード以外で『くるみ側』タブが見えない」 のはバグではなく仕様。 ナレ / シナリオモードで kurumi の slot 編集をしたい場合は一旦「対話 (P2-6)」モードに切替えて編集 → モードを戻す。

### saved-layout.json `__op_layout` の kurumi / hakase 配信状態 (v938 時点の実態 = v937 値温存、 v938 はシナリオ JS のみの修正で saved-layout は無変更)

`__op_layout.{B,C,D}.kurumi.perVariant` は **13 entries** で配信中。 v923 で 1 entry → 13 entries にスキーマ拡張、 v932 で **B のみ** ローカル editor の位置調整 Export (`op-layout-2026-05-11-06-18-47.json`) を orchestrator 経由で merge し B の 13 variants が初期値 (`kurumi_001` 値全コピー) から個別調整値に更新済 (C/D はこの時点で初期値のまま温存)、 **v933 で runtime kurumi CSS の per-VC `.op-char-slot` を中央アンカー (`left:50% + transform:translate(-50%,-50%)`) に統一**したことで、 ここに格納した slotW/slotH/slotOffsetX/slotOffsetY 値はそのまま editor で見たままの位置で runtime に反映されるようになった (v932 までは runtime kurumi CSS が `right: 0` 右端アンカーだったため、 同じ JSON 値でも runtime では editor preview と最大 ~400px ずれていた)。 v934 はユーザー誤指定で **同値再 Export を merge した実質的な無変更 publish** (sw だけバンプ)。 v935 (06-49-00 Export) で初めて C / D 側にも実値編集を流し込み、 kurumi だけでなく hakase の slotOffsetX も C/D で publish 開始。 v936 (07-22-05 Export) で editor 「全ポーズに反映」 ボタン (前 task で実装、 同一 VC の perVariant 13 entries を 1 ボタンで同値同期する機能) の初実用 publish が成立 — 70 entries diff は全て `kurumi.perVariant` のみで、 B では 13 variants 全部が `slotOffsetX=77 / slotOffsetY=19` に統一 (22 entries)、 C では `kurumi_001` 以外の 12 variants の slotOffsetX が 0→158 に統一 (12 entries、 `kurumi_001` と完全一致)、 D では 12 variants の `slotW: 280→550 / slotH: 380→413 / slotOffsetX: 0→158` が一括変更 (36 entries、 `kurumi_001` と完全一致)。 **v937 (07-31-53 Export、 現行) で B kurumi の base box を微調整した小規模 publish** — 差分は `B.kurumi.flat.slotH` 320→**303** + `B.kurumi.perVariant.kurumi_001.slotW` 280→**227** + `B.kurumi.perVariant.kurumi_001.slotH` 278→**269** の 3 値のみ (kurumi_001 = 基準正面立ち絵の枠サイズ詰め)。 C / D は変更なし、 pono / hakase / singleBox / narration も差分ゼロ。 `quizland/saved-layout.json` の top-level keys 220 件 (`q72`, `q83`, `__chip_text_overrides` 等の per-question overrides + `__op_layout` + `__op_narration` 等) は引き続き完全温存、 kurumi.perVariant 13 entries も全 VC 維持。

#### v937 の実差分 (v936 → v937 deep diff、 3 entries のみ B kurumi の base box 微調整)

07-31-53 Export を merge した小規模 publish。 v936 で「全ポーズに反映」 ボタンによる VC 単位の一括同期が成立した後の、 v937 は **B kurumi_001 (= 基準正面立ち絵) の枠サイズだけ詰め直した微調整**。 C / D は v936 値完全温存、 pono / hakase / singleBox / narration も差分ゼロ。

**B (3 entries 変更 — kurumi の base box を少し小さく)**
- `B.kurumi.slotH`: 320 → **303** (flat 側の slotH を縮小)
- `B.kurumi.perVariant.kurumi_001.slotW`: 280 → **227** (基準正面立ち絵の幅を詰め)
- `B.kurumi.perVariant.kurumi_001.slotH`: 278 → **269** (基準正面立ち絵の高さを微縮小)

**C / D**: v936 値温存
- C: 13 variants 全部 `slotOffsetX=158 / slotW=280 / slotH=380` 維持
- D: 13 variants 全部 `slotW=550 / slotH=413 / slotOffsetX=158` 維持

#### v937 publish の特徴

v936 の「全ポーズに反映」 一括同期と対照的に、 v937 は **`kurumi_001` 1 variant の枠サイズだけを詰める個別調整** に戻った publish。 v932-v935 までの「variant 単位の細かい調整」 と v936 の「VC 単位の一括統一」、 そして v937 の「base 1 variant のみ調整」 という 3 種類の運用パターンが揃った形。 sw v937 で OP の **「kurumi は Panel 2-6 継続表示」 仕様変更** (Panel 3/4 で kurumi_clasp 注入) と同時 publish されたため、 base box 詰めは Panel 3/4 で初めて kurumi が visible になる挙動を実機で確認しながらの調整と推定される。

```json
"B": {
  "kurumi": {
    "slotW": 280,
    "slotH": 303,
    "slotOffsetX": 77,
    "slotOffsetY": 19,
    "perVariant": {
      "kurumi_001":   { "slotW": 227, "slotH": 269, "slotOffsetX": 77, "slotOffsetY": 19, "slotAspect": "fixed_0.73", "objectPosition": "bottom" },
      "kurumi_hi":    { "slotW": 280, "slotH": 303, "slotOffsetX": 77, "slotOffsetY": 19, "slotAspect": "fixed_0.73", "objectPosition": "bottom" },
      "kurumi_wave":  { "slotW": 280, "slotH": 303, "slotOffsetX": 77, "slotOffsetY": 19, "slotAspect": "fixed_0.73", "objectPosition": "bottom" },
      "kurumi_hooray":{ "slotW": 280, "slotH": 380, "slotOffsetX": 77, "slotOffsetY": 19, "slotAspect": "fixed_0.73", "objectPosition": "bottom" },
      "kurumi_wink":  { "slotW": 280, "slotH": 295, "slotOffsetX": 77, "slotOffsetY": 19, "slotAspect": "fixed_0.73", "objectPosition": "bottom" },
      "kurumi_clasp": { "slotW": 280, "slotH": 320, "slotOffsetX": 77, "slotOffsetY": 19, "slotAspect": "fixed_0.73", "objectPosition": "bottom" },
      "kurumi_idea":  { "slotW": 280, "slotH": 345, "slotOffsetX": 77, "slotOffsetY": 19, "slotAspect": "fixed_0.73", "objectPosition": "bottom" },
      "kurumi_point": { "slotW": 280, "slotH": 328, "slotOffsetX": 77, "slotOffsetY": 19, "slotAspect": "fixed_0.73", "objectPosition": "bottom" },
      "kurumi_calm":  { "slotW": 280, "slotH": 328, "slotOffsetX": 77, "slotOffsetY": 19, "slotAspect": "fixed_0.73", "objectPosition": "bottom" },
      "kurumi_pray":  { "slotW": 280, "slotH": 303, "slotOffsetX": 77, "slotOffsetY": 19, "slotAspect": "fixed_0.73", "objectPosition": "bottom" },
      "kurumi_book":  { "slotW": 280, "slotH": 320, "slotOffsetX": 77, "slotOffsetY": 19, "slotAspect": "fixed_0.73", "objectPosition": "bottom" },
      "kurumi_cheer": { "slotW": 280, "slotH": 328, "slotOffsetX": 77, "slotOffsetY": 19, "slotAspect": "fixed_0.73", "objectPosition": "bottom" },
      "kurumi_greet": { "slotW": 280, "slotH": 320, "slotOffsetX": 77, "slotOffsetY": 19, "slotAspect": "fixed_0.73", "objectPosition": "bottom" }
    }
  }
}
```

(上記は B の実値スナップショット、 **v937 時点**。 v936 から `B.kurumi.slotH` 320→303 + `B.kurumi.perVariant.kurumi_001.slotW` 280→227 + `kurumi_001.slotH` 278→269 のみ変更。 13 variants 全部の slotOffsetX / slotOffsetY が `77 / 19` に統一されているのは v936 「全ポーズに反映」 ボタン発火痕跡が温存されている状態。 各 variant の slotH のみ個別 — **`kurumi_001=269 (v937 で 278→269)`**, `kurumi_hi/wave/pray=303`, `kurumi_wink=295`, `kurumi_clasp/book/greet=320`, `kurumi_point/calm/cheer=328`, `kurumi_idea=345`, `kurumi_hooray=380` — はポーズによる立ち絵高さ差を反映)

#### VC 別の編集状況 (v938 時点 = v937 値温存、 v938 はシナリオ JS のみの修正で saved-layout 無変更)

| VC | kurumi.perVariant の編集状況 | hakase の編集状況 |
|---|---|---|
| **B** (1024×768) | **13 variants 全部が `slotOffsetX=77 / slotOffsetY=19` に統一** (v936 「全ポーズに反映」 ボタン発火継続)。 slotH のみポーズ高さに合わせて variant 個別 (`kurumi_001=269 ←v937 で 278→269`、 他 12 variants は 295〜380 のまま)。 **`kurumi_001` は v937 で `slotW=227 / slotH=269` に詰め直し** (基準正面立ち絵の base box を縮小)、 他 12 variants は `slotW=280` / `slotAspect='fixed_0.73'` / `objectPosition='bottom'` で v936 値温存。 flat 側は v937 で `slotH=303` (320→303) | 初期値のまま (v937 でも触らず) |
| **C** (1920×1080) | **13 variants 全部が `slotOffsetX=158` に統一** (v936 値温存、 v937 でも変更なし)。 全 variant `slotW=280 / slotH=380 / slotOffsetY=0 / slotAspect='fixed_0.73' / objectPosition='bottom'` | v935 値温存 (`slotOffsetX=-27`) |
| **D** (2560×1080) | **13 variants 全部が `slotW=550 / slotH=413 / slotOffsetX=158` に統一** (v936 値温存、 v937 でも変更なし)。 `slotOffsetY=0` / `slotAspect='fixed_0.73'` / `objectPosition='bottom'` も全 variant 統一 | v935 値温存 (`slotOffsetX=-142`) |

CSS デフォルト (`.op-side-kurumi .op-char-slot` per-VC media query) は B 280×380 / C 380×520 / D 460×630 (aspect 0.73) で hardcode 済み。 saved-layout.json で配信されない VC / variant では CSS デフォルトに fallback。

#### 配信ワークフロー（確定運用 — 詳細は [reference_op_layout_publish_workflow.md](reference_op_layout_publish_workflow.md)）

1. ローカル editor (`tools/op-layout-editor.html?edit=1`) を「対話 (P2-6)」モードで開く
2. 「くるみ側」タブ または 左ペインの Kurumi サムネで variant 選択 → slot ドラッグで位置・サイズ調整
3. 同 VC の他 variant にも同値を適用したい場合は **「全ポーズに反映」ボタン** で perVariant 13 entries を一括同期 (v936 で実用化)
4. ヘッダの **「📥 Export → JSON ファイル」** で JSON ダウンロード → `D:\ポノのおへや\Dr.owl'quiz\` に保存
5. ファイル名 (例: `op-layout-2026-05-11-07-22-05.json`) を Claude チャットに伝える
6. Claude エージェントが `quizland/saved-layout.json` の `__op_layout` のみ merge (他 219 keys 完全温存) + `sw.js` CACHE_VERSION バンプ
7. post-commit hook で develop に auto push → GH Actions が staging へ自動反映 → 全端末で新値が読まれる

過去に `__op_narration` / pono.perVariant / singleBox / narration 等で実証されていたフローを、 kurumi の 13 variants 全量で初めて回し切ったのが v932 (B のみ)、 hakase 含めて C/D も実値 publish が始まったのが v935 (06-49-00 版)、 「全ポーズに反映」 ボタンで VC 単位の perVariant 13 entries 一括同期が成立したのが v936 (07-22-05 版)、 **v937 (07-31-53 版) では Panel 3/4 に kurumi_clasp を継続表示する仕様変更と同時に B kurumi_001 base box を微調整する小規模 publish**。

> **重要 (運用方針、 v906/v907 で実装した「📡 配信」ボタンは廃止扱い)**:
> 過去に staging editor から直接 GitHub に書き込む 「📡 配信」 ボタン (`isStagingOrigin()` ガード付き) を実装した経緯はあるが、 **運用上はこのボタンを使わない方針** がユーザーから明確に示されている。 Claude は今後 「staging editor の配信ボタンを使えば...」 のような提案を一切してはならない。 配信は必ず **「📥 Export → JSON ファイル」 → Claude エージェントで反映** の経路を通すこと。

**v933 補足 (重要)**: v932 までの runtime kurumi CSS は **`right: 0` 右端アンカー** で、 editor preview (`tools/op-layout-editor.html`、 元から `left: 50%` 中央アンカー) と **transform 計算式が完全に乖離**していた。 結果として saved-layout.json `__op_layout.{B,C,D}.kurumi.{slot,perVariant}` にいくら正しい値を書き込んでも、 runtime では editor preview と最大 ~400px ずれて再現される致命バグが残っていた (v932 publish の時点でも、 ユーザーが editor で詰めた値は実機では「正しい場所」に出ていなかった)。 v933 で **runtime per-VC `.op-char-slot` の CSS を中央アンカー (`left:50% + transform:translate(-50%,-50%)`) に統一**したことで、 v932 で焼き込んだ kurumi.perVariant の slot 値がここで初めて editor で見たままに runtime に反映されるようになった。 saved-layout.json は無変更、 直したのは「JSON 値の解釈側 (= runtime CSS)」だけ。

**v934 / v935 補足**: v934 はユーザー誤指定で **v932 と同値の Export を再 merge した実質無変更 publish** (sw.js だけバンプ、 saved-layout.json `__op_layout` 中身は v933 と完全一致)。 v935 では改めて 06-49-00 版 Export を取り直し、 **B では `kurumi_clasp` の slotH 354→320 / slotOffsetY 0→19**、 **C では `hakase.slotOffsetX` 0→-27 / `kurumi.slotOffsetX` 0→158** (kurumi_001 perVariant も同期)、 **D では `hakase.slotOffsetX` -362→-142 / `kurumi.slotH` 489→413 / `kurumi.slotOffsetX` 654→158** (kurumi_001 perVariant も同期) を merge。 v932 の時点で C/D は kurumi.flat / hakase 含めて初期値温存だったが、 v935 で **C/D も hakase + kurumi の主要 slot を含めた実値 publish が始まった** (= 1024×768 だけでなく 1920×1080 / 2560×1080 でも editor で詰めた位置が runtime に届くようになった配信成熟マイルストーン)。

> **教訓 (将来 hakase 等で複数 variants 対応する際の伏線)**: **runtime と editor preview の CSS アンカーが乖離していると、 saved-layout.json の値はいくら正しくても runtime で再現されない**。 publish 経路の正しさだけでは不十分で、 「editor preview の transform 計算式」と「runtime per-VC `@media` の CSS 計算式」が **同一アンカー (今回の場合は中央起点) で揃っていること** を確認する必要がある。 hakase に複数 variants を持たせる将来タスクでは、 kurumi の v933 修正と同等のアンカー統一を hakase 側でも行うこと (hakase は OP 内で 1 variant しか使わないため現状ではこの問題は顕在化しない)。

### 編集ワークフロー（確定運用）

1. ローカル editor (`?edit=1`) を開いて **「対話 (P2-6)」モード**を選択 (シナリオ / ナレモードでは tab-bar が隠れるため)
2. 「くるみ側」タブを選択、 または **左ペインの Kurumi バリエーションサムネ一覧から目的のポーズを直接クリック** (v925 で追加、 variant ドロップダウンと同等)
3. 右ペインの variant ドロップダウンで対象ポーズ（例: `kurumi_clasp`）を選び、 slot をドラッグして位置・サイズを調整
4. 同じ slot 値を 13 variants 全部に展開したい場合は **「全ポーズに反映」ボタン** (v936 で実用化) で同 VC の perVariant 13 entries を一括同期
5. ポーズによってはみ出す variant がある場合は個別に微調整 (v932-v935 主体だった variant 単位の細かい調整は引き続き有効)
6. ヘッダの **「📥 Export → JSON ファイル」** でダウンロード → `D:\ポノのおへや\Dr.owl'quiz\` に保存
7. ファイル名を Claude に伝える → Claude エージェントが `saved-layout.json` の `__op_layout.{B,C,D}.kurumi.perVariant.{variant}` をマージ + sw.js bump + post-commit hook で auto push
8. develop → staging → 全端末反映

> 詳細は [reference_op_layout_publish_workflow.md](reference_op_layout_publish_workflow.md) を参照。 「📡 配信」 ボタンは話題に出さない方針。

### シナリオ speaker 編集 + 3 キャラ dropdown (v925 / v927 / v931)

シナリオモード (各 panel の dialogue 行を編集する画面) で、 各 line の speaker ラジオに **「くるみ」が選択肢として追加** (v925) + **各 line に「ポノ」「はかせ」「くるみ」の立ち絵 variant 選択 dropdown を 3 つ並列表示** (v931):

#### speaker ラジオ 3 way 化 (v925 / v927 で migrate バグ修正)

- 旧: ポノ / はかせ の 2 way
- 新: ポノ / はかせ / くるみ の 3 way (`buildScenarioDialogueLineRow` 内の speaker forEach を `['hakase', 'pono', 'kurumi']` に拡張)
- これによりシナリオエディタから「くるみが喋る line」を直接追加可能、 OP_PANELS の dialogue 配列に `speaker: 'kurumi'` line を generate
- **v927 修正**: 過去版の `migrateScenario` が **`speaker !== 'pono' && speaker !== 'hakase'` なら強制的に `'hakase'` 化**するロジックだったため、 ユーザーが editor で speaker を 'kurumi' に切替えて save → reload した瞬間に **'hakase' に化ける致命的バグ**があった。 v927 で `speaker !== 'pono' && speaker !== 'hakase' && speaker !== 'kurumi'` の 3 way 判定に修正、 kurumi line も保持されるようになった (`tools/op-layout-editor.html` ~L1480 周辺)。 同時に **`kurumiImg` フィールドの空値正規化** (空文字 / 非文字列なら delete) を追加し、 renderer 側で意図しない立ち絵 visibility が誘発されないようにした

#### 3 キャラ dropdown 並列表示 (v931 追加)

- 各 dialogue line に対し **「ポノの表情/ポーズ」「はかせの表情/ポーズ」「くるみの表情/ポーズ」 の 3 dropdown を常時並列表示** (`buildScenarioDialogueLineRow` 内、 既存ポノ dropdown の下にはかせ・くるみ dropdown を追加)
- **speaker に関係なく 3 dropdown 全部が表示**される (= speaker='pono' の line でも はかせ立ち絵を独立に切替えられる)
- 内部実装は **`appendCharImgSelect(opts)` 共通ヘルパ** で 3 キャラ統一 (引数: `{ label, variants, currentName, onChange, fallbackName }`、 forEach で `<option>` 生成 + onchange で各フィールド更新)
- 各 dropdown は `line.ponoImg` / `line.hakaseImg` / `line.kurumiImg` を **独立に編集**。 内部 state では basename (例 `'dance_hi'` / `'owl_professor_guide'` / `'kurumi_hi'`) で保持、 export 時にフルパス化
- これにより Panel 6 のような「kurumi が喋らないが立ち絵 visible」 line を **scenario エディタから直接構築可能** (旧来は OP_PANELS を手編集する必要があった)
- HAKASE_VARIANTS が 1 entry のみの現状でも UI は配置済、 将来 `owl_professor_explain` 等を `HAKASE_VARIANTS` に追加すれば自動的に dropdown が拡張される

#### データスキーマ

- 内部 (localStorage scenario state): basename で保持 (`'dance_hi'`, `'owl_professor_guide'`, `'kurumi_hi'`)
- export (`buildScenarioPanelsLiteral` 出力 = OP_PANELS リテラル): フルパス (`'../assets/images/characters/pono/dance/dance_hi.webp'` 等) で出力。 `ponoFullPath()` / `hakaseFullPath()` / `kurumiFullPath()` の 3 ヘルパで basename → フルパス変換

#### runtime 側 hakaseImg 対応 (未実装、 将来タスク)

現時点では **runtime (`quizland/index.html` の `playOpeningCinematic`) は `line.hakaseImg` を読まない**。 HAKASE_VARIANTS が `owl_professor_guide` の 1 種のみで切替の余地がないため、 export しても実害が無い (常に 1 種類しかないので無視されても結果は同じ)。 将来 HAKASE_VARIANTS を 2 種以上に増やす際は以下の対応が必要:

- `playOpeningCinematic` 内で line.hakaseImg → `#img-hakase.src` 更新ロジック (kurumi の `_opCurrentKurumiVariant` と同パターン)
- `_opCurrentHakaseVariant(panel, line)` 関数 (kurumi 用と同パターン)
- saved-layout.json の `__op_layout.{B,C,D}.hakase.perVariant` フィールド (kurumi.perVariant と同構造、 現状 hakase は flat slot のみで perVariant なし)
- editor 側 `sideSnap(s.hakase, true)` への変更 + `hakasePerVariantDefaults` 追加

### v926: defaultScenario() を本番 OP_PANELS と同期

editor の scenario モードで初期表示されるシナリオデータ (`defaultScenario()` の戻り値、 `tools/op-layout-editor.html` ~L1339-L1424) が、 sw v921-v925 の段階で本番 `quizland/index.html` の `OP_PANELS` から大きく乖離していた問題を v926 で解消。 全 6 panel を runtime と完全一致させた:

| Panel | 旧 default | 新 default (v926+, 本番 OP_PANELS と一致) |
|---|---|---|
| Panel 1 (narration) | seg2 が 2 行 + 一部 emphasis:true | **seg2 を 3 行 + 全行 emphasis:false** に修正 (赤強調全廃の最終状態と一致) |
| Panel 2 (dialogue) | 2 行 (hakase / pono) | **3 行**: ① hakase「ほっほっほ…ポノか。よくきたのう」 ponoImg:`pono_001` / ② **★kurumi**「こんにちは、ポノさん！」 ponoImg:`pono_001` + **kurumiImg:`kurumi_hi`** / ③ pono「**はかせ、くるみちゃん、あそびに きたよ！**」 ponoImg:`dance_wave` |
| Panel 3 / 4 (dialogue) | hakase line に ponoImg 未指定 | **hakase line に `ponoImg: 'pono_001'` を明示** (本番と一致、 中身の台詞は同じ) |
| Panel 5 (dialogue) | 2 行 (hakase / pono) | **4 行**: ① hakase「ほっほっほ、それでよい。\nまちがえても よいのじゃ。\nかんがえることが たいせつじゃからの。」 / ② pono「うん！」 / ③ **★hakase**「くるみよ、いつもどおり なぞなぞを おねがいするぞ」 / ④ **★kurumi**「はーい、まかせて！」 ponoImg:`pono_001` + **kurumiImg:`kurumi_wink`** |
| Panel 6 (dialogue) | 2 行、 kurumiImg 注入なし | 2 行は据置、 ただし **両 line に `kurumiImg: 'kurumi_clasp'` を注入** して立ち絵 visible 維持の本番挙動と一致させた |

**v929 以前の補足**: かつては defaultScenario() の更新が **新規ユーザー (= localStorage に scenario state が無いユーザー)** にしか反映されず、 既に編集経験のあるユーザーは古い saved state がそのまま読まれる問題があった。 v929 で **`SCENARIO_DATA_VERSION` 定数による version 付き auto migration** を導入したため、 既存ユーザーも editor をリロードした瞬間に新 defaults へ自動移行する。 詳細は次節「v929: scenario state の version 付き auto migration」を参照。

### v927: buildScenarioPanelsLiteral() の kurumi export 対応

editor の `📋 JSON のみクリップボード` (= `buildScenarioPanelsLiteral()`) で本番 `OP_PANELS` 配列の JS リテラルを生成して export するロジックが、 kurumi に対応していなかった 2 つのバグを v927 で修正:

1. **speaker 判定が 2-way だった**: 旧コードは `(d.speaker === 'pono') ? 'pono' : 'hakase'` の 3 項演算で **kurumi line も hakase に化けていた**。 v927 で `(d.speaker === 'pono' || d.speaker === 'kurumi') ? d.speaker : 'hakase'` の 3 way 判定に修正 (`tools/op-layout-editor.html` ~L6281-L6284)
2. **`kurumiImg` フィールドのシリアライズが無かった**: 旧コードは `d.ponoImg` のみシリアライズしていたため、 export された OP_PANELS には kurumiImg が一切含まれず、 Panel 6 のような「喋らないが立ち絵 visible」 line が **立ち絵なしで export** されていた。 v927 で **`kurumiFullPath()` ヘルパー新設** (basename / フルパス両対応、 未知名は `kurumi_001` fallback) + line に `d.kurumiImg` があれば `kurumiImg: '<full path>'` を行内にシリアライズ (~L6231-L6238 / ~L6292-L6297)、 ponoImg と kurumiImg が同一 line に共存するケース (Panel 6) も対応

これにより editor で編集した kurumi line + Panel 6 の立ち絵注入が **export → 本番 OP_PANELS への手動反映** で完全に保たれるようになった。

### v929: scenario state の version 付き auto migration

v926 で `defaultScenario()` を本番 OP_PANELS と同期して以降、 「**既存ユーザーは localStorage に古い saved state が残っているため、 editor をリロードしても新 defaults が反映されない**」 という運用課題があった。 v929 で **scenario state にスキーマ version を持たせて自動 migration する仕組み**を導入し、 この課題を恒久解消した。

実装は `tools/op-layout-editor.html` 内の以下 4 箇所 (v931 時点の現行値で記載):

1. **`SCENARIO_DATA_VERSION` 定数** (~L1250): 現行値 **`'v938'`** (v931 で `'v927'` → `'v930'`、 v937 で `'v930'` → `'v937'`、 v938 で `'v937'` → `'v938'` に bump)。 `defaultScenario()` の構造または line に入る可能性のあるフィールド構成が変わったら bump する単一の真実
2. **`defaultScenario()`** (~L1370 周辺): 戻り値の object に `version: SCENARIO_DATA_VERSION` を埋め込む
3. **`loadScenario()`** (~L1534-L1546): localStorage から読んだ state の `parsed.version !== SCENARIO_DATA_VERSION` なら、 saved state を **強制的に捨てて `defaultScenario()` を返す**。 不一致時は console.log で `'<old> → <new>'` を表示
4. **`saveScenario()`** (~L1554-L1564): 保存時に `Object.assign({}, state.scenario, { version: SCENARIO_DATA_VERSION })` で必ず最新 version を上書きしてから JSON.stringify。 import 経由などで version 欠落のまま state が入った場合も、 1 回保存すれば次回 load で正しく一致判定される

これにより、 **既存ユーザーは editor をリロードするだけで自動的に新 defaults へ移行**する (DevTools コンソールでの手動 `localStorage.removeItem(...)` は不要)。 影響範囲は **scenario state のみ** で、 layout state (slot 値、 frame 設定、 dropped assets 等) や narration state (`pono.opNarration.runtime.{B,C,D}`) は **別キー管理のため一切 touch されない**。

**運用上の注意**:

- 個別カスタマイズ (= editor で手編集した scenario の line) は version 不一致時に消える。 現状 defaults のままが大半なので許容しているが、 **シナリオを手編集している場合は事前に「📋 シナリオ (OP_PANELS) クリップボード」 で export してバックアップを取る** こと
- `SCENARIO_DATA_VERSION` を bump するタイミング: `defaultScenario()` の panel 構成 / line 順 / speaker 構成を変えたとき。 純粋にテキストだけ修正する場合は bump 不要 (saved state を温存したいケース)
- v927 以前に保存した scenario state には、 過去の `migrateScenario` の **kurumi → hakase 強制変換バグ** によって `speaker: 'hakase'` に化けてしまっている line が含まれている可能性があった。 v929 の auto migration によりそうした state も `version` 不一致でリセットされ、 v927 のバグ修正後の defaults に揃う

## babble preset (確定値)

`js/quizland-babble.js` ~L71-L83:

```javascript
// Kurumi (リスのくるみちゃん): お姉さん感のある明るめ女声。
// baseFreq 450 = ポノ(520)より低くオウル(160)より高い、優しいお姉さん帯域。
// glide 上向き (元気)、 triangle で柔らかいトーン。
kurumi: {
  wave: 'triangle',
  baseFreq: 450,        // 博士(160) と ポノ(520) の中間、お姉さん感
  glide: 35,            // 上向き、元気
  duration: 0.08,
  attack: 0.006,
  release: 0.048,
  peakGain: 0.13,
  pitchSpread: 30
}
```

dialogue render ループでは `presetForLine = isHakase ? 'owl' : (isKurumi ? 'kurumi' : 'pono')` の 3 way で 1 文字ごとに `PonoBabble.playChar(c, preset)` を発火。

## CSS / DOM 構造

- HTML (`quizland/index.html` ~L3117): `.op-side.op-side-kurumi.op-side-overlay.hidden` の独立サイド要素
  - `<img class="op-char op-char-kurumi" id="op-char-kurumi">` を内包
- `.op-side-overlay` は **absolute オーバーレイ** で pono / hakase の 1:1 flex を壊さない
- フェード CSS (~L2407-L2410): `opacity 0 → 1` の 0.25s ease-out
- specificity 修正: `.op-sides > .op-side.op-side-overlay { flex: none; }` で flex item 化を確実に阻止 (cross-review HIGH 反映、sw v922+)
- 対話ボックスのラベル色: `.op-dialogue-single.is-kurumi .op-dialogue-label { background: #c46a4a; }` (茶色寄りオレンジ、リス感)
- speaker クラス切替: `.op-dialogue-single` に `is-pono` / `is-hakase` / `is-kurumi` の 3 way (~L6132)
- **per-VC `.op-side-kurumi .op-char-slot` の位置アンカー (sw v933+)**: B (~L2644-L2655) / C (~L2727-L2738) / D (~L2811-L2822) の 3 箇所、 全て `top: 50%; left: 50%; right: auto; transform: translate(-50%, -50%)` の **中央起点** (pono / hakase と同式、 editor preview とも一致)。 v932 以前は `right: 0; transform: translate(calc(0% + -Xpx), ...)` の右端起点で editor preview と最大 ~400px ずれていたが v933 で根本修正済。 `applySide('kurumi', ...)` が runtime に inline transform を上書きする前のフラッシュ防止デフォルトでもある

## sw.js キャッシュバージョン

- v921: くるみ初投入 (Panel 2 / 5 でセリフ追加 + babble preset + 立ち絵 1 variant)
- v922: クロスレビュー指摘 4 件修正 (Panel 6 立ち絵維持 + ひらがな統一 + 「なぞなぞ」語彙統一 + overlay specificity 強化)
- v923: kurumi 13 ポーズ管理機能 (op-layout-editor 「くるみ側」 タブ + 13 variants × 3 VC perVariant 配信 + Panel 2/5/6 の variant 確定割当 + ponoPerVariantDefaults `dance_wave` 漏れ修正)
- v924: クロスレビュー C HIGH 3 + MEDIUM 4 修正 (HIGH-1 propagateMirror に kurumi ガード / HIGH-2 editor preview に op-side-overlay クラス + CSS で production と同位置 / HIGH-3 importNarrationJsonFromFile に ent.kurumi 分岐 / MED-1 scenario preview text + speaker label 3 way / MED-2 scenario line.kurumiImg → 画像/slot 反映 / MED-4 onFrameAspectLoaded を kurumi 対応 + frame removal cleanup / MED-5 height/box guides を kurumi 対応 #fb923c 橙)
- v925: editor 左ペインに **Kurumi バリエーションサムネ一覧 (13 ポーズ、 makeKurumiThumb)** + **シナリオ行 speaker に「くるみ」追加 (ポノ / はかせ / くるみ の 3 way ラジオ)**。 kurumi user-added 画像のドラッグ&ドロップは未対応 (info 文で明示)。 editor の「くるみ側」タブは「対話 (P2-6)」モードでのみ表示される仕様 (CSS line 661/667 で `is-narration` / `is-scenario` 時に tab-bar 全体が `display: none`) を memory 文書に明文化
- v926: editor `defaultScenario()` を本番 `OP_PANELS` (sw v926 時点) と完全同期。 Panel 1 seg2 を 3 行 emphasis:false / Panel 2 を 3 行 (kurumi `kurumi_hi` 挨拶追加, ポノ「はかせ、くるみちゃん、あそびに きたよ！」 + ponoImg `dance_wave`) / Panel 3-4 hakase line に `ponoImg: pono_001` 明示 / Panel 5 を 4 行 (kurumi `kurumi_wink` バトンタッチ追加) / Panel 6 両 line に `kurumiImg: kurumi_clasp` 注入。 当初は既存 saved state を持つユーザーへの反映が手動 reset 必須だったが、 v929 で auto migration 化されて解消
- v927: editor の **scenario migrate / export を kurumi 対応** に修正 — (a) `migrateScenario` の `speaker !== 'pono' && speaker !== 'hakase'` 強制 hakase 化判定を **3-way (kurumi も valid)** に修正、 kurumi line を save → reload で hakase 化する致命バグ解消 (~L1466-L1472); (b) **`kurumiImg` 空値正規化** を migrate に追加 (空文字 / 非文字列なら delete、 ~L1478-L1483); (c) `buildScenarioPanelsLiteral()` の speaker 判定を 2-way → **3-way** に修正 + **`kurumiFullPath()` ヘルパー新設** (basename/フルパス両対応 + 未知名は `kurumi_001` fallback) で **line.kurumiImg のシリアライズ対応**、 Panel 6 のように ponoImg と kurumiImg が共存する line も export 可能に (~L6231-L6238 / ~L6281-L6297)
- v928: auto-commit (post-commit hook 由来の自動上昇)
- v929: editor の **scenario state に version 付き auto migration を実装** — `SCENARIO_DATA_VERSION = 'v927'` 定数を新設、 `defaultScenario()` の戻り値に `version` フィールドを埋め込み、 `loadScenario()` で saved state の `version` が現行値と不一致なら **defaults を強制使用**、 `saveScenario()` で保存時に `version` を確実に上書き。 これにより **既存ユーザーも editor リロードだけで自動的に新 defaults へ移行**、 過去の DevTools コンソール手順 (`localStorage.removeItem('pono.opLayoutEditor.v1.scenario')`) は不要に。 影響範囲は scenario state のみで layout / narration state は touch しない
- v930: editor の **「くるみ側」タブ切替 defensive 強化** (active class 即時更新 + state.kurumi 欠落時の自動 seed + try/catch wrap) — 以前タブ切替時に稀に kurumi state が undefined のまま render に進んで例外で UI が固まる事象があったため、 タブクリックハンドラで state を必ず seed してから active class を切替えるように修正
- v931: editor の **シナリオ編集モードの各 dialogue 行に「ポノ」「はかせ」「くるみ」 の 3 dropdown を追加** — `HAKASE_VARIANTS` 定数 + `hakasePathByName()` / `hakaseFullPath()` ヘルパ + `appendCharImgSelect()` 共通ヘルパで 3 キャラ統一実装、 各 line で `line.ponoImg` / `line.hakaseImg` / `line.kurumiImg` を speaker と独立に編集可能に。 同時に `migrateScenario` で `line.hakaseImg` 空値正規化 + `buildScenarioPanelsLiteral` で `hakaseImg` シリアライズ追加 + `SCENARIO_DATA_VERSION` を `'v927'` → `'v930'` に bump (defaults 構造自体は未変更だが、 line に新フィールドが入る余地が広がったため auto migration を発火させて既存ユーザーも新 schema に揃える)。 runtime 側の hakaseImg 対応は未実装 (HAKASE_VARIANTS が 1 種のみのため実害なし、 2 種以上に増やす際の将来タスクとして本ドキュメントに明記)
- v932: ローカル editor (`tools/op-layout-editor.html`) で kurumi 13 variants × 3 VC の slot 位置・サイズを微調整 → 「📋 JSON のみクリップボード」 で `pono-op-layout-v1` schema を export → orchestrator (Claude) が `quizland/saved-layout.json` の **`__op_layout` のみ merge** (top-level 220 keys 完全温存、 `__op_narration` / pono / hakase / singleBox / narration 等は touch せず) + commit + post-commit hook で develop へ auto push → GH Actions が staging へ自動反映、 という 「ローカル editor → AI 経由 publish → 全端末配信」 のワークフローが kurumi の 13 perVariant 全量で初めて回り切った。 結果: B (kurumi 13 variants 全部で個別調整 / `kurumi_pray` だけ slotOffsetY=-4)、 C (13 variants は今回 touch せず初期値温存)、 D (`kurumi_001` のみ大きく上書き、 他 12 は初期値) の状態で `__op_layout.{B,C,D}.kurumi.perVariant` が saved-layout.json に焼かれた。 editor 側のコード変更はなし (v931 までで完成済の Export 経路をそのまま使った publish イベント = 配信品質 milestone)
- v933: **runtime kurumi CSS の per-VC `.op-char-slot` を中央アンカーに統一** (`quizland/index.html` ~L2644-L2655 / ~L2727-L2738 / ~L2811-L2822 の 3 箇所、 B/C/D 全 VC 共通)。 旧: `top: 50%; left: auto; right: 0; transform: translate(calc(0% + -Xpx), calc(-50% + -Ypx))` の **右端起点** → 新: `top: 50%; left: 50%; right: auto; transform: translate(-50%, -50%)` の **中央起点** (pono / hakase と完全同式)。 これにより editor preview (`tools/op-layout-editor.html`、 元から中央起点) と runtime の transform 計算式が完全一致し、 **editor で詰めた `slotOffsetX` / `slotOffsetY` が runtime にもそのまま反映**される (v932 までは同じ JSON 値でも runtime は editor preview と最大 ~400px 右にずれていた致命バグ)。 pono / hakase の CSS は無変更 (元から中央起点)、 editor 側 (`tools/op-layout-editor.html`) も無変更 (元から中央起点)、 saved-layout.json も無変更 (slot 値は v932 のまま、 解釈側だけが editor preview と一致するように直された)。 修正は CSS 3 箇所だけの最小局所変更だが配信品質に対する効果は大きい (kurumi の per-VC 微調整がここで初めて runtime に正しく届くようになった)
- v934: ユーザー誤指定で **`op-layout-2026-05-11-06-41-51.json` (v932 と同値の Export) を再 merge した実質的な無変更 publish**。 saved-layout.json の `__op_layout` 中身は v932 から差分なし、 sw.js だけがバンプされた (= キャッシュは新しくなったが配信内容は v933 と同じ)。 この種の同値再 export を merge してしまった経緯を将来のデバッグ用に明記
- v935: ローカル editor の **06-49-00 Export** (`op-layout-2026-05-11-06-49-00.json`) を merge、 v932 → v935 の deep diff は **12 entries** で、 初めて C / D 側にも実値が流し込まれた。 **B**: `kurumi_clasp` の slotH 354→320 / slotOffsetY 0→19 (両手胸前の立ち姿を少し低く詰める調整)、 flat の `B.kurumi.slotH` / `slotOffsetY` も同期。 **C**: `hakase.slotOffsetX` 0→-27 (はかせを少し左寄せ)、 `kurumi.slotOffsetX` 0→158 + `kurumi_001` perVariant も同期 (くるみを右寄せ)。 **D**: `hakase.slotOffsetX` -362→-142 (はかせを大幅に右寄せ)、 `kurumi.slotH` 489→413 + `kurumi.slotOffsetX` 654→158 + `kurumi_001` perVariant も同期 (くるみを 「画面右端の大サイズ」 から 「中央寄りの中サイズ」 に再配置)。 v932 までは VC C / D は kurumi.flat / hakase 含めて初期値温存だったが、 v935 で **C/D も hakase + kurumi の主要 slot を含めた実値 publish が始まった** = 配信成熟度が一段上がったマイルストーン。 saved-layout.json top-level 220 keys は引き続き完全温存、 editor 側のコード変更はなし (v931 完成済の Export 経路を再利用した publish イベント)
- v936: ローカル editor の **07-22-05 Export** (`op-layout-2026-05-11-07-22-05.json`) を merge、 v935 → v936 の deep diff は **70 entries で全て kurumi.perVariant のみ** (pono / hakase / singleBox / narration は差分ゼロ)。 editor の **「全ポーズに反映」 ボタン** (前 task で実装、 同一 VC の perVariant 13 entries に同値を一括コピー) の **初実用 publish**。 **B (22 entries)**: 13 variants 全部の `slotOffsetX=77 / slotOffsetY=19` に統一 (旧 slotOffsetX 54〜88 / slotOffsetY 0/19/-4 が分散していたものをフラット化)。 **C (12 entries)**: `kurumi_001` 以外の 12 variants の `slotOffsetX` 0→158 (kurumi_001 と完全一致)。 **D (36 entries)**: `kurumi_001` 以外の 12 variants の `slotW: 280→550 / slotH: 380→413 / slotOffsetX: 0→158` 一括統一 (kurumi_001 と完全一致)。 「VC ごとに 1 variant を詰めたら 13 variants 全部に反映する」 という新しい運用パターンが editor → JSON Export → Claude エージェント反映 → saved-layout.json まで往復成立した配信成熟マイルストーン。 saved-layout.json top-level 220 keys は引き続き完全温存、 editor 側のコード変更はなし (前 task の「全ポーズに反映」 ボタン実装が初実用された publish イベント)。 配信フローは [reference_op_layout_publish_workflow.md](reference_op_layout_publish_workflow.md) で確定運用化、 「📡 配信」 ボタンは廃止扱い
- v937: **「kurumi は Panel 2 で登場したら Panel 6 まで継続表示」** をプロジェクト方針として確定 + ローカル editor の **07-31-53 Export** (`op-layout-2026-05-11-07-31-53.json`) を merge。 **仕様変更**: `quizland/index.html` の `OP_PANELS` Panel 3 / Panel 4 の各 line に `kurumiImg: '../assets/images/characters/kurumi/dance/kurumi_clasp.webp'` を注入 (Panel 3 hakase line + Panel 3 pono line + Panel 4 hakase line + Panel 4 pono line の計 4 line)。 同時に `tools/op-layout-editor.html` の `defaultScenario()` Panel 3 / 4 の各 line にも `kurumiImg: 'kurumi_clasp'` (basename) を注入し editor デフォルトデータも同期、 `SCENARIO_DATA_VERSION` を `'v930'` → `'v937'` に bump して既存ユーザーへも auto migration で反映。 ポーズ並びは Panel 2 (`kurumi_hi`) → Panel 3 (`kurumi_clasp`) → Panel 4 (`kurumi_clasp`) → Panel 5 (`kurumi_wink`) → Panel 6 (`kurumi_clasp`) の 5 panel 連続 visible に確定。 **saved-layout.json deep diff は 3 entries のみ** (B kurumi の base box 微調整): `B.kurumi.slotH` 320→303 / `B.kurumi.perVariant.kurumi_001.slotW` 280→227 / `B.kurumi.perVariant.kurumi_001.slotH` 278→269。 C / D は変更なし、 pono / hakase / singleBox / narration も差分ゼロ。 220 keys 完全温存、 kurumi.perVariant 13 entries 全 VC 維持。 ユーザー指示原文「くるみはその場所にずっと出てていい。一度最初に出たらずっとそこにいていい。シナリオでポーズも変化させたりはしている」
- **【誤実装 2026-05-12 / v961 で完全削除】 v959**: **「第N問」 音声タイミング短縮 + 「第N問」 バナー UI 追加** (2026-05-12 ユーザー staging 試聴フィードバック反映) — ⚠️ **本セクション中の「(2) 「第N問」 バナー UI」 (CSS バナー / `#kurumi-q-banner` / `showKurumiQBanner` / `_KURUMI_Q_KANJI`) はユーザー意図と異なる誤実装だった**。 ユーザー要望は **「既存の qno_plate 画像を kurumi 音声中ずっと長く表示してほしい」** であり、 別 DOM の CSS バナーを新規追加することは求められていなかった。 **v961 で CSS バナー関連は完全削除** (DOM / CSS / JS / 関数すべて)、 代わりに `playQuestionNumberPlate` を 2 段階化して plate 画像を kurumi ended +0.3s まで表示する仕様に正しく実装し直した。 (1) **タイミング改善**: `quizland/index.html` の SE 初期化セクション (~L3851 周辺) に `preloadKurumiNumberSe()` IIFE を追加、 起動時に `nextQuestion` (don.mp3) と `kurumi_dai1` 〜 `kurumi_dai5` を `new Audio() + load()` で事前確保し、 1 回目の `loadQuestion()` での「new Audio + 初回 load」 ラグを解消。 さらに `loadQuestion()` 末尾の don ended → kurumi 開始経路に `setTimeout(0)` を挟んで次マイクロタスクで `playSe(kurumiKey)` を発火、 ended ハンドラ内で同期 play() するよりブラウザ側のラグが体感的に短くなる (合計で数十〜100ms の体感ラグ削減) — **このタイミング改善側 (preload IIFE / setTimeout(0) / SE_PATHS の kurumi_dai1-5 追加 / playSe 戻り値変更 / don→kurumi 順次再生) は v961 でも維持**。 (2) **【誤実装 / v961 で削除】 「第N問」 バナー UI**: `quizland/index.html` ~L3147 周辺に `<div id="kurumi-q-banner" class="kurumi-q-banner" aria-hidden="true">` を追加 (qno-plate-overlay の直後)、 CSS は `position: fixed / top: 22vh / 中央寄せ / 白文字 + #6B3F12 ストローク + オレンジグラデ背景 + 白枠 + 角丸 / font-size: clamp(48px, 8vw, 96px) / Zen Maru Gothic 900 / opacity 0 → 1 transition 0.3s` の子供向け大型バナー。 JS 側に `showKurumiQBanner(monNum, audio)` 関数を新設し、 漢数字配列 `['一','二','三','四','五']` で `第N問` テキストをセット → kurumi audio の ended で `setTimeout(300ms)` 後に visible 外し → 0.32s 後に `aria-hidden=true`。 don.mp3 ended の `_startKurumiAndBanner` から `playSe(kurumiKey)` の戻り値を audio として渡し、 ended で自動消去。 audio 取れない場合は 1500ms 固定タイマで消去、 ended が発火しない場合の fallback として 6000ms で強制消去。 既存 `playQuestionNumberPlate` (qno_plate_*.png 画像プレート) は touch せず、 別レイヤとして共存 (画像プレートは _runPlateAndType で先に再生 ~1.6s、 バナーは don.mp3 終了から kurumi 終了 +0.3s まで visible)。 layout-applier 非対象 (動的 overlay)、 iOS Safari の touch / autoplay 制約に配慮し user gesture 後の loadQuestion からのみ発火。 sw.js CACHE_VERSION 958 → 959 bump、 saved-layout.json / OP_PANELS / scenario / SE_PATHS は無変更(1) **タイミング改善**: `quizland/index.html` の SE 初期化セクション (~L3851 周辺) に `preloadKurumiNumberSe()` IIFE を追加、 起動時に `nextQuestion` (don.mp3) と `kurumi_dai1` 〜 `kurumi_dai5` を `new Audio() + load()` で事前確保し、 1 回目の `loadQuestion()` での「new Audio + 初回 load」 ラグを解消。 さらに `loadQuestion()` 末尾の don ended → kurumi 開始経路に `setTimeout(0)` を挟んで次マイクロタスクで `playSe(kurumiKey)` を発火、 ended ハンドラ内で同期 play() するよりブラウザ側のラグが体感的に短くなる (合計で数十〜100ms の体感ラグ削減)。 (2) **「第N問」 バナー UI**: `quizland/index.html` ~L3147 周辺に `<div id="kurumi-q-banner" class="kurumi-q-banner" aria-hidden="true">` を追加 (qno-plate-overlay の直後)、 CSS は `position: fixed / top: 22vh / 中央寄せ / 白文字 + #6B3F12 ストローク + オレンジグラデ背景 + 白枠 + 角丸 / font-size: clamp(48px, 8vw, 96px) / Zen Maru Gothic 900 / opacity 0 → 1 transition 0.3s` の子供向け大型バナー。 JS 側に `showKurumiQBanner(monNum, audio)` 関数を新設し、 漢数字配列 `['一','二','三','四','五']` で `第N問` テキストをセット → kurumi audio の ended で `setTimeout(300ms)` 後に visible 外し → 0.32s 後に `aria-hidden=true`。 don.mp3 ended の `_startKurumiAndBanner` から `playSe(kurumiKey)` の戻り値を audio として渡し、 ended で自動消去。 audio 取れない場合は 1500ms 固定タイマで消去、 ended が発火しない場合の fallback として 6000ms で強制消去。 既存 `playQuestionNumberPlate` (qno_plate_*.png 画像プレート) は touch せず、 別レイヤとして共存 (画像プレートは _runPlateAndType で先に再生 ~1.6s、 バナーは don.mp3 終了から kurumi 終了 +0.3s まで visible)。 layout-applier 非対象 (動的 overlay)、 iOS Safari の touch / autoplay 制約に配慮し user gesture 後の loadQuestion からのみ発火。 sw.js CACHE_VERSION 958 → 959 bump、 saved-layout.json / OP_PANELS / scenario / SE_PATHS は無変更
- v938: **kurumi 立ち絵の継続表示を全 line に kurumiImg 注入で完全実装** — v937 で Panel 3/4 と Panel 6 へ追加注入したことで「Panel 2 で登場 → Panel 6 まで継続表示」 が概ね成立していたが、 **Panel 2 line 3 (pono「はかせ、くるみちゃん、…」) と Panel 5 line 1/2/3 (博士/ポノ/博士の 3 行)** で `kurumiImg` 未注入のため line 切替時に kurumi 立ち絵が一瞬消える残課題があった (`keepKurumiVisible = isKurumi || !!d.kurumiImg` の OR 条件で kurumi 自身の発話 line と kurumiImg 注入済 line のみ visible になるため、 未注入 line では DOM 残置の上 `is-visible` が外れて opacity 0 にフェードアウトしていた)。 v938 で残り 4 line にも kurumiImg を明示注入: **Panel 2 line 3** に `kurumiImg: '../assets/images/characters/kurumi/dance/kurumi_hi.webp'` (line 2 の挨拶ポーズを維持)、 **Panel 5 line 1/2/3** に `kurumiImg: '../assets/images/characters/kurumi/dance/kurumi_clasp.webp'` (line 4 の `kurumi_wink` 発話直前まで待機ポーズ維持)。 これにより **Panel 2 line 2 (kurumi 初登場) 〜 Panel 6 末尾までの全 12 line で kurumiImg がカバーされ完全継続表示**が物理実装された (Panel 1 ナレと Panel 2 line 1 だけは kurumi 登場前のため意図的に未注入)。 同時に `tools/op-layout-editor.html` の `defaultScenario()` Panel 2 line 3 + Panel 5 line 1/2/3 にも `kurumiImg` (basename) を注入し editor デフォルトデータを同期、 `SCENARIO_DATA_VERSION` を `'v937'` → `'v938'` に bump で auto migration を発火し既存ユーザーも新 defaults に移行。 **saved-layout.json は無変更** (= シナリオ JS のみの修正、 slot 値や 220 keys 完全温存、 kurumi.perVariant 13 entries も全 VC 維持)。 「kurumi 登場以降の line には必ず kurumiImg を注入する」 設計原則が v938 で確定し、 今後新しい Panel/line を追加する際もこの原則に従う
- **v961 (現行)**: **v959 の CSS バナー誤実装を完全削除 + 既存 qno_plate 画像表示を kurumi 音声 ended まで延長** (2026-05-12 ユーザー指摘 → 即時修正) — v959 で別 Agent が誤って新規追加していた CSS バナー (`#kurumi-q-banner` DOM + `.kurumi-q-banner` CSS + `showKurumiQBanner` JS + `_KURUMI_Q_KANJI` 定数 + `_startKurumiAndBanner` 関数) を **完全削除**。 ユーザー本来の要望は **「既存の qno_plate 画像 (qno_plate_{1-5}.png) を kurumi 音声 (kurumi_dai{N}mon) 中ずっと長く表示してほしい」** であり、 別 DOM のバナー新設ではなかった。 (1) **削除**: `quizland/index.html` から CSS バナー DOM (~3 行) + `.kurumi-q-banner` CSS + `@media (max-width: 540px)` 調整 (合計 ~38 行) + `showKurumiQBanner` 関数 + `_KURUMI_Q_KANJI` 定数 + `loadQuestion` 末尾の `showKurumiQBanner(...)` 呼び出し。 (2) **plate 表示延長**: `playQuestionNumberPlate(qIdx)` の挙動を 2 段階化 — 旧: 1.6s 自動消去 (CSS animation `qnoImpact` 100% で opacity 0)、 新: スケールイン (~0.45s) のみで自動消去せず visible 維持、 `hideQuestionNumberPlate()` を新設して外部から fade out + DOM hide を発火。 CSS は `qnoImpact` キーフレームを 0.45s scale-in only に短縮 (旧 1.6s から 100% で opacity 1 のまま hold)、 新 `.qno-plate-overlay.is-fadeout` modifier で `transition: opacity 0.35s ease` を発火させ 360ms 後に hidden 化。 (3) **kurumi ended で plate hide**: `loadQuestion` 末尾の don ended → kurumi 開始経路で `playSe(kurumiKey)` の戻り値 audio に `ended` ハンドラを `{ once: true }` で登録 → 終了で `setTimeout(hideQuestionNumberPlate, 300)` (0.3s 余韻)。 fallback: kurumi audio 取得失敗時は 1500ms で hide、 ended が発火しない場合は 6000ms で強制 hide (取りこぼし防止)。 (4) **タップで即 hide**: plate 表示中のタップで `hideQuestionNumberPlate()` を即時呼び出し (旧 cancelled flag 即フェードアウト挙動を踏襲)。 (5) **維持したもの**: `preloadKurumiNumberSe()` IIFE / SE_PATHS の kurumi_dai1-5 / playSe 戻り値 (`<audio>`) / don→kurumi 順次再生 / `_qnoRunning` ガード / iOS Safari autoplay 対応 (user gesture 後 loadQuestion 限定発火)。 sw.js CACHE_VERSION 960 → 961 bump (HEAD は別 commit で既に 960 の状態)、 saved-layout.json / OP_PANELS / scenario / SE_PATHS は無変更。 「ユーザー要望は既存資産の挙動調整であり、 新規 UI 追加ではない」 という読み違いの教訓を v959 セクションに 【誤実装】 マーカー付きで履歴温存
