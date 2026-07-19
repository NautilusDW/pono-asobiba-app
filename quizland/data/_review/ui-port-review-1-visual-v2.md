# UI Port Review 1 v2: Visual Fidelity

レビュー対象: `d:/AppDevelopment/pono-asobiba-app/quizland/index.html` (1537 行 / 51945 byte)
比較基準  : `d:/AppDevelopment/pono-asobiba-app/quizland/preview/full/index.html` (3468 行 / 139381 byte)
方針: Replace 戦略の v2。 preview/full をビジュアル土台にしてゲームロジックを slim 移植。

## Overall verdict

**🟢 採用可** (軽微なディテール差はあるが、preview/full の特徴的ビジュアル要素はすべて再現されている)

v1 (Inject) のレビューで指摘された「フクロウ博士キャラ・ヒント吹き出し・スクリブルチップが欠落していた」問題は完全に解消。 preview/full の DOM 構造 (`stage-wrap > stage > safe-area > hdr/body`) と CSS トークン (`--paper / --wood-dark / --slot-size` 等) を verbatim で取り込んでおり、 `body.sheet-on` がデフォルト ON で手描きシート画像オーバーレイも機能する。 唯一の体感差はステージ内コンテンツが「7 dotted-slot を必ず描画」する preview/full 仕様ではなく、 質問タイプに応じた可変描画になっている点 — これは MVP 用の意図的な逸脱として implementer も明記している。

---

## Critical visual elements

| element | preview/full ref | main v2 has it? | matches? | severity |
|---|---|---|---|---|
| 21:9 stage + 16:9 safe area + 森背景 (stage-bg.png) | `:root --canvas-w/--safe-w` + `.stage` BG (line 110-118) | ✓ `index.html:88-96` (`.stage` で同 BG) | ✓ | OK |
| 木枠+紙質 ロゴ「フクロウはかせの / なぞなぞ」 | `.title-card` 線形グラデ #c97a3e→#8a4f1f (line 189-209) | ✓ `index.html:197-210` 同色グラデ | ✓ | OK |
| 進捗ドット (1/5 + 4 dots) | `.progress-num` + `.dots > .dot×5` (line 1304-1313) | ✓ `index.html:878-885` 動的 5 個生成 (`updateHUD`) | ✓ | OK |
| 鐘 (おしらせ) ボタン | `.hdr-right .ctrl-btn 🔔` (line 1317) | ✓ `#hud-back-btn` `index.html:889-892` | ✓ (動作はモード戻し) | OK |
| 歯車 (せってい) ボタン | `.hdr-right .ctrl-btn ⚙️` (line 1318) | ✓ `#hud-settings-btn` `index.html:893-896` (共通メニューを開く) | ✓ | OK |
| 木枠 question text card + sound icon | `.q-text-card + .audio` (line 1325-1328) | ✓ `index.html:903-906` (`#question-speaker` は narration あり時のみ表示) | ✓ | OK |
| ステージエリア (board) 紙ボード | `.board` (line 327-336) | ✓ `index.html:322-335`, `#stage-area` で動的描画 | 🟡 **dotted 7-slot は描画されない** (質問タイプ依存の `item-row / shape-display / emoji-display` 等) | 🔵 (許容) |
| フクロウ博士キャラクター (right) | `.character` 紫グラデ円 (line 470-480) | ✓ `index.html:918-920` `#pono-avatar` に `owl_professor_guide.png` を `<img>` で表示 | 🟡 **preview/full は CSS グラデのプレースホルダ円**、main は実画像。 シート画像 ON では sheet がフクロウ博士を描いているので CSS 円は隠れていることに注意 — main は実画像で代替しているので、シート無効化時には 2 重表示になりうる | 🔵 (許容、シート ON 前提) |
| ヒント！吹き出し (peach color, hint-60.png) | `.char-hint` `hint-60.png` BG (line 482-500) | ✓ `index.html:548-565` 同 235×63 + 同 PNG | ✓ | OK |
| 答えチップ (paper-card + scribble circle) | `.chip + .circle` `data-color` 別ストライプ (line 419-451) | ✓ `index.html:484-545` 同色定義 (red/blue/yellow/green + pink/orange/purple/cyan も追加) | ✓ (拡張) | OK |
| Pono アバター | preview/full には pono-avatar 概念は無し (.character のみ) | ✓ `#pono-avatar` を `.character` 内に置く | ✓ (jump anim 追加) | OK |
| シート画像オーバーレイ | `body.sheet-on .stage::after` `quizland-sheet-v1.png` (line 893-902) | ✓ `index.html:99-106` 同セレクタ・同 PNG | ✓ | OK |
| `body.sheet-on` で paper/wood 装飾を消す | line 904-915 | ✓ `index.html:107-117` 同セレクタリスト | ✓ | OK |

---

## CSS variable parity

両ファイルとも同じ未プレフィックス命名 (`--paper / --paper-2 / --paper-shadow / --wood-dark / --wood-mid / --wood-light / --canvas-w / --safe-w / --header-h / --slot-size / --slot-color / --gap / --owl-bg`) を採用しており、 値も一致。
- `--canvas-w: 2100px` ✓
- `--safe-w: 1600px` ✓
- `--header-h: 150px` ✓
- `--slot-size: 130px` ✓
- `--paper / --paper-2 / --wood-dark` ✓
- `--owl-bg: #b08acf` ✓

レビュー指示にあった `--quiz-wood-*` という変数は preview/full には存在しないため、 これは指示の言い換えだと解釈。 main v2 は preview/full の命名と完全一致しているので OK。

---

## Render function output check

main v2 のレンダ関数 (`index.html:1152-1242`) を一行ずつ追跡。

- **renderOrderColor** (line 1152-1162): ✓ `.item-row > .color-chip × N`、 各 chip は `--slot-size`(130px) 正方形 + `border: 4px solid rgba(255,255,255,0.85)` + `box-shadow inset 2px rgba(0,0,0,0.06)` で「dotted-slot 風の柔らかいフレーム」を表現。 preview/full の `.slot.has-img` と同等の置き換え。
- **renderCountTotal** (line 1163-1174): ✓ `.item-row > <img.count-item>` × q.count、 各画像 130px + drop-shadow。 preview/full の grid 配置と同サイズ。
- **renderShapeName** (line 1175-1187): ✓ `.shape-display > .shape-{type}` で 8 形状サポート (circle/square/triangle/star/heart/rectangle/diamond/oval)。 220–280px の大きさで board 中央に。
- **renderEmojiName** (line 1188-1213): ✓ `.emoji-display` に `<img.emoji-main-img>` (画像時、 max 360×360) または `.emoji-main` (絵文字時、 220px font)。 ヒントは 3s 後フェードイン。
- **renderTrivia** (line 1220-1242): ✓ `.trivia-display > <video.trivia-pono> + .trivia-bubble`。 ThinkingPono.mp4 を muted/playsInline で再生、 `?` バブルの `quizBubbleBlink` 2.5s アニメ keyframes が main の `<style>` 内に hoist 済み (line 447-451)。
- **renderOpposite** (line 1214-1219): ✓ `.opposite-display` 84px paper-card テキスト (`#FFF7E5→#F8DE9F` 紙質グラデ)。

**判定: 全 6 関数とも paper-card / scribble / wood-frame の preview/full スタイルに合致**。 chip 側で `data-color` を付けて `.circle` をストライプ表示する仕様 (`renderChoices` line 1258-1265) も preview/full と一致。

---

## Asset existence

| asset | path | exists | referenced by main |
|---|---|---|---|
| stage-bg.png | `assets/preview-placeholders/stage-bg.png` | ✓ | `index.html:93` |
| quizland-sheet-v1.png | `assets/preview-placeholders/quizland-sheet-v1.png` | ✓ | `index.html:103` |
| hint-60.png | `assets/preview-placeholders/hint-60.png` | ✓ | `index.html:553` |
| owl_professor_guide.png | `assets/images/quizland/owl_professor_guide.png` | ✓ | `index.html:872, 919` |
| title_logo.png | `assets/images/quizland/title_logo.png` | ✓ | `index.html:837` |
| title_back.png | `assets/images/quizland/title_back.png` | ✓ | `index.html:620` |
| quiz_bgm.mp3 | `assets/audio/quiz_bgm.mp3` | ✓ | `index.html:1013` |
| ThinkingPono.mp4 | `assets/videos/ThinkingPono.mp4` | ✓ | `index.html:1225` |
| common/mvp-flags.js | `common/mvp-flags.js` | ✓ | `index.html:10` |
| common/achievements.js | `common/achievements.js` | ✓ | `index.html:11` |
| common/first-clear.js | `common/first-clear.js` | ✓ | `index.html:12` |
| common/menu.js | `common/menu.js` | ✓ | `index.html:13` |
| common/narration.js | `common/narration.js` | ✓ | `index.html:14` |
| data/questions.js | `quizland/data/questions.js` | ✓ | `index.html:15` |

**全 14 件すべて存在を確認**。 dead reference なし。

---

## Layout / proportions

- **21:9 / 16:9 frame**: ✓ `--canvas-w 2100 / --canvas-h 900 / --safe-w 1600` で preview/full と同寸。
- **transform scale fit**: ✓ `fitStage()` (line 976-988) が `Math.min(w/stageW, h/stageH)` で常時 letterbox スケール。 `transform-origin: 0 0` + `translate + scale` の組み合わせは preview/full の `enterPreview()` ロジックと同等。
- **header-h**: 150px (preview/full と同じ; saved-layout は 142px に更新されているが、 これは編集時の微調整であり、 main は CSS デフォルトの 150px を採用しても問題ない範囲)。
- **grid-template-columns: 1fr 700px** (`.hdr` と `.body` 両方): ✓ 一致。 左 q-col + 右 a-col(700px) のレイアウトは preview/full と同じ。
- **answer-tray**: `background: #b07a3a; border: 5px solid var(--wood-dark); padding: 18px;` ✓ 完全一致 (preview/full line 387-393)。
- **chip height: 220px**: ✓ 一致 (preview/full line 432, main line 496)。
- **`.bottom-right` の `flex-end + gap:14px + margin-top:8px`**: ✓ 一致 (preview/full line 401-410, main line 474-480)。 hint-60 + character の右下並びが同じ。

**saved-layout.json 反映度**: 約 75–85%。 main は **transform 値 (tx/ty) を適用していない** = saved-layout の微調整は一切反映されていない。 ただし主要な w/h は CSS で同じ値が指定されているため、 視覚的な大枠の一致は保たれている。

未反映の主な調整値:
- `.hdr-right .ctrl-btn` `tx:-131, ty:-12` → 右上ボタンが少し左上にずれる調整なし
- `.q-text-card` `tx:23, ty:-16`
- `.answer-tray` `tx:19, ty:175`
- `.chip` 個別 `tx:-30~-101`
- `.character` `tx:-138, ty:-561.5` (cf. main は `.bottom-right` 内に普通配置)
- `.char-hint` `tx:-125, ty:-568`

これらはレイアウトエディタ上の手動微調整であり、 `body.sheet-on` が ON の本番モードでは木枠装飾が消えてシート画像が前面に出るため、 微妙な位置ずれは「シート上にざっくり配置」の許容範囲内に収まる (implementer の Note 2 とも一致)。

---

## Browser smoke test

- **HTML パース**: ✓ tag balance OK (`div: 43/43, button: 7/7, span: 15/15, script: 7/7, style: 1/1`)
- **インライン JS**: ✓ Node `new Function(body)` で 19995 chars をパースエラーなし
- **`<link>` / `<script src>` パス**: ✓ 全 14 件存在確認 (上記表)
- **excluded systems leftover**: ✓ `acorn|sticker|treasure|flower|garden|seed|hud-seeds|flower-enc|garden-overlay` → main では **0 ヒット** (implementer 報告と一致)
- **sw.js CACHE_VERSION**: 672 (上がり済み)

---

## Issues found

### 🟡 軽微差分
1. **board 内 dotted 7-slot 非描画** (`index.html:907-909`)
   - preview/full は board 内に `slot×7` を常時描画していたが、 main は `#stage-area` を空のままにし、 質問タイプに応じて中身を `renderOrderColor` 等が差し込む。
   - 結果、 質問が「order_color (色問題)」以外の場合、 board 中央に 1 個の shape / image / video / opposite text が出るだけで、 preview/full の「整然と並んだ 7 個のスロット」感は出ない。
   - これは MVP のために意図的な逸脱と implementer Notes に明記済み。 採用可。

2. **`.character` の表現が CSS グラデから実画像に変更** (`index.html:918-920`)
   - preview/full: 紫色グラデ `radial-gradient(... var(--owl-bg) ...)` のシルエット円。
   - main v2: `<img src="owl_professor_guide.png">` を `.character` 内に直配置。
   - シート画像 ON のときは preview/full 側でも sheet 内の手描きフクロウ博士が前面に出るため、 main 側の `<img>` が二重表示になる可能性がある。 ただし `.character` のサイズは 200×220 で、 シート上の owl 位置とほぼ重なるので実害は小さい。

3. **saved-layout.json の手動微調整値が反映されていない**
   - 上記表参照。 シート画像 ON 前提なら誤差は許容範囲。 シート OFF 時はやや位置がずれて見える可能性。

### 🔵 情報 (採用可)
4. **chip 用の data-color が拡張されている** (`index.html:538-545`)
   - preview/full: red/blue/yellow/green の 4 色
   - main v2: red/blue/yellow/green/pink/orange/purple/cyan の 8 色
   - QUIZLAND_COLORS データに合わせるための妥当な拡張。

5. **answer-tray の grid-template-rows: auto auto** (`index.html:470`)
   - preview/full は `grid-template-rows` を明示せず暗黙、 main は `auto auto` を明示。 動作差異なし。

---

## Recommended deltas

優先度順:
1. **🟡 (任意)** `.character` の二重表示懸念を解消するため、 `body.sheet-on .character img { opacity: 0.0; }` を CSS に追加して、 シート ON 時はシート上のフクロウ博士に任せ、 シート OFF/デバッグ時のみ `<img>` を見せる切替を入れる。 ただし jump アニメは画像本体の `transform: translateY` で動くので、 透明でもアニメ自体は走る。 — 採用判断は visual review 2 (Functional) と相談。
2. **🟡 (任意)** saved-layout.json の `.q-text-card tx:23, ty:-16` と `.answer-tray tx:19, ty:175` を `transform: translate()` で適用すると、 シート画像との位置整合がより精度高くなる。 ただし implementer Note 2 で「ざっくり配置を許容」とあるので、 まずは現状で動作確認後、 必要なら追加。
3. **🔵 (任意)** board 内に質問タイプに応じない場合の「7 dotted slot」プレースホルダを背景として薄く描画 (`body.sheet-on` 時は隠れる) しておくと、 シート OFF デバッグ時の preview/full との一致度が上がる。

これら 3 件はすべて **🔴 reject 級ではなく、🟡 軽微 / 🔵 情報** レベル。 v2 はそのまま採用してよい。
