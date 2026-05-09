---
name: Quizland Opening Cinematic
description: 6-panel intro that plays after mode-select (before initGame). Ken Burns dolly + narration + babble dialog + skip. Codex prompt for missing panel art at tmp/quizland-op-cinematic/. tap-hint dynamic-follow + editor→runtime narration override (sw v890+) + saved-layout.json 経由の全端末配信 (B 経路、sw v892+)。 ナレーション音声を seg1 (OP_NA01.mp3) / seg2 (OP_NA_02.mp3) で per-seg 分割再生 (sw v893+)。
type: project
---

# Quizland Opening Cinematic

**Status:** Implemented (2026-05-07) — staging
**Type:** Feature — UX / Storytelling

---

## Why

導入の物語性が弱く、子供向けにモード選択 → 即出題は唐突。森の家でフクロウ博士とポノが「なぞなぞやろう」と握手するワンシーンを挟むことで、世界観に入る前の助走を作る。スキップ可能なので飽きた周回ユーザーは1タップで本編へ。

## How to apply

- なぞなぞ系の演出/オープニング/フクロウ博士の台詞を改修するときは、まず本ファイルを参照して既存パネル構造とスキップ挙動を壊さないか確認する。
- パネル絵を差し替える場合は `tmp/quizland-op-cinematic/CODEX-PROMPT.md` の構図仕様に沿って Codex に依頼。`assets/images/quizland/OP/OP_panel_2.png` 〜 `OP_panel_6.png` を生成し、`OP_PANELS` 配列の `bg` を差し替える。
- Pono の声色を本格化する場合は `js/quizland-babble.js` の `pono` プリセットを `voice: true` 化（owl と同じ 2osc + BPF + LFO 経路）し、フォルマントを子供寄りに（u/a/e 中心、F1=900〜1300Hz）、`baseFreq` を 280〜340Hz に。

---

## Trigger Point

`quizland/index.html` の mode-btn ハンドラで `playOpeningCinematic()` → `playQuizStartCard()` → `initGame()` の async チェーン。タイトルタップ → モード選択 → **オープニング (6 パネル)** → **タイトルカード (~2.2s)** → 出題開始 のフロー。

```js
document.querySelectorAll('.mode-btn').forEach(function(btn) {
  btn.addEventListener('click', async function() {
    selectedMode = btn.dataset.mode;
    document.getElementById('mode-screen').classList.add('hidden');
    try { await playOpeningCinematic(); } catch (e) { console.warn(e); }
    try { await playQuizStartCard();   } catch (e) { console.warn(e); }
    initGame();
  });
});
```

### Quiz Start Title Card (`playQuizStartCard`)

シネマ終了後 `initGame()` 直前に挿入する静止画タイトルカード。`assets/images/quizland/OP/quiz_start_card.webp` (フクロウ博士 + 「ふくろう博士の なぞなぞスタート!!」、410KB / 元 2711KB から 84.9% 削減) を 2.2s 表示してフェードアウト。タップで即スキップ可。

- HTML: `#quiz-start-card` overlay (z-index 310、シネマ z-index 300 より上)
- CSS: opacity フェードイン (0.35s) + transform: scale(0.92→1.0) のポップ
- JS: `_qscRunning` 再入ガード、`{ once: true }` タップリスナー + `finally` で removeEventListener、22×100ms ホールドループで `cancelled` ポーリング
- preload: タイトルタップ時の `__preloadList` に追加 (ウォーミング ~17s 余裕あり)

## ナレーション音声 per-seg 分割 (sw v893+)

panel 1 のナレーション音声を **seg1 / seg2 で別ファイル化**して per-seg 再生する設計に切替えた (2026-05-09)。

### Why

旧: 単一 `OP_NA.wav` (17.45s, seg1+seg2 連結) を panel-level `audio` で再生。タップ待ちで seg1 が止まっていてもナレ音声だけは seg2 まで言い切ってしまい、テキストと音声がズレるバグがあった。

新: `OP_NA01.mp3` (seg1) + `OP_NA_02.mp3` (seg2) を `OP_PANELS[0].segments[i].audio` で **per-seg に格納**し、cinematic loop で seg を進めた瞬間に対応する Audio を強制停止する。タップで進めれば「読み終わるところまで」音声がきっちり止まる。

### 実装

- `OP_PANELS[0]` の panel-level `audio` を撤去、`segments[i].audio` を新設
- 新ヘルパ `__opStartSegAudio(segIdx)` / `__opStopSegAudio(a)` を `playOpeningCinematic` 内に追加し、 per-seg の Audio 生成・破棄を統一管理
  - `__opStartSegAudio` は前回の Audio / Web Audio routing を必ず disconnect してから新規 Audio を生成 (リーク防止)
  - URL は `segs[i].audio` 優先、 fallback で `panel.audio` (後方互換)
  - Web Audio routing は `audioCtx.createMediaElementSource(a)` → `__opNarrGain (0.65)` → destination
- BGM ducking は **seg1 起動時 1 回のみ**:`__opOrigBgm == null` の時のみ保存 + `setTargetAtTime(orig*0.3, ..., 0.18)`。 seg2 起動時は `__opOrigBgm` が既に保持済みなので **二重 duck をスキップ**
- BGM 復帰は seg2 終了 (or seg なし時の単一 seg 終了) で 1 回だけ `__opOrigBgm` を `setTargetAtTime` で復帰、`__opOrigBgm = null` にリセット
- preload も per-seg に汎用化: タイトルタップ時に `__preloadList` の隣で `OP_PANELS` を走査して `segments[i].audio` (+ panel.audio fallback) の URL を `__audSeen` 重複防止 dict 経由で全部 `new Audio().load()`
- 旧 `OP_NA.wav` ファイル自体は **削除しない** (rollback 用に残置)。コード参照のみ撤去

### Skip / cancel 経路

- `onSkip` (skip ボタン) は `_opActiveAudio.pause()` + BGM restore のみ呼ぶ。 Web Audio の `disconnect` は **`finally` ブロックの cleanup に依存** (single-run なら最終的に `__opStopSegAudio` で確実に切れるため安全)。 replay 時もこの `finally` が走るので routing リークはしない
- `_opCancelled = true` になると `_opWaitForAdvance` が即解除され、cinematic loop の `finally` で `__opStopSegAudio` が走って disconnect されるフロー

### 既知の保守性懸念 (cross-review MEDIUM 由来)

1. **`__opStopSegAudio(a)` の引数 `a` と module-level `__opNarrSrc` / `__opNarrGain` の implicit 結合**: 現状は seg 単一 caller なので問題ないが、 将来 `_opActiveAudio` を 2 つ並行で持つ設計に拡張する時はバインディングを明示化する必要あり (例: Audio 生成時に source/gain を return して closure に閉じ込める)
2. **`onSkip` の partial cleanup**: skip 直後は `pause` のみで `disconnect` しない。 即時に新 Audio を作って routing する経路が増えると、 古い routing が dangling する可能性あり。 現状の単一 cinematic 設計では `finally` 経由で必ず回収される

## ナレーション 2 セグメント切替タイミング (2026-05-07 調整)

panel 1 のナレーション (`OP_NA.wav`、17.45s) を 2 セグメントに分けて表示している:

- **seg1** (3 行 通常 黒): もりの おくに… ふくろうの はかせが すんでいます。
- **seg2** (2 行 黒): ポノは、なかよしの はかせと、いつもの なぞなぞで あそぶために やってきました。

**色運用（最終状態 2026-05-08）**: seg1 / seg2 ともに全行 **`emphasis: false` で黒**。一時期 seg2 を `emphasis: true` で赤強調にしたが「子供向けに赤は強すぎる／読み込まれると違和感がある」とのフィードバックで全面ロールバックし、`OP_PANELS[0].segments[1].lines[*].emphasis = false` に固定。Bold (font-weight: bold @ `.op-narration` base) で十分メリハリは出ているので追加色は不要。
赤強調用の CSS (`.op-narration p.emphasis { color: #c0392b; font-weight: 700; }`、本番側 quizland/index.html ~L2457) はエディタ parity の都合で残置 (将来 Panel が増えて使う可能性 + エディタプレビュー一致のため)。データ側で `emphasis: false` を維持している限り発火しない dormant rule。

切替トリガは `audio.currentTime >= Math.max(audio.duration * 0.62, 11.0)` — 「はかせが すんでいます」の発話終了 (≈11s) 以降に切替。fallback timeout は 12s。旧 `audio.duration / 2` (≈8.7s) では「なんでも しっている」直後で seg1 が早く切れすぎていたため修正。

ナレ全文の audio.ended 後にさらに **2 秒の hold** を入れてから panel 2 (博士の発話) に遷移。博士の発話開始がナレ余韻と重ならないようにするため。

## エディタ ⇄ 本番 parity (2026-05-08 修正)

`tools/op-layout-editor.html` の scenario プレビューが本番 typing engine と DOM 構造で乖離していたため、emphasis: true の行が本番で赤になるのにエディタプレビューでは黒のまま — という parity バグを抱えていた。以下のとおり修正済み:

- **`applyScenarioPreview()` の narration ブランチを本番 typing engine と同一構造に書き換え**:
  - 旧: `el.textContent = lines.join('\n')` のような単一テキストノード代入で emphasis 情報を失う
  - 新: `seg.lines.forEach` で `<p>` 要素を生成し、`line.emphasis === true` の行に `<p class="emphasis">` を付与 (本番 `quizland/index.html` ~L4907-L4914 の typing engine と 1:1 mirror)
- **エディタ `<style>` に対応 CSS を追加**:
  - `.op-narration-preview p { margin: 0.25em 0; }`
  - `.op-narration-preview p.emphasis { color: #c0392b; font-weight: 700; }`
  - 本番 `.op-narration p.emphasis` ルールと完全一致
- **`el.style.display = 'flex'` → `'block'` に修正**: 本番 `.op-narration` は flex ではなく block + `text-align: center` で水平センタリングしている。`flex` のままだと子 `<p>` が flex item になり、行間や中央寄せの挙動が本番と微妙にズレるため、display プロパティも本番と揃える。

これにより scenario モードでデータの emphasis フラグを切り替えると、**エディタプレビューも本番もまったく同じ見た目**で表示されるようになった。今後 emphasis を再導入する／別 panel に追加する際も、データの emphasis を編集すれば両方反映される。

## 会話レイアウト (2026-05-07 リデザイン、複数アスペクト対応)

panel 2-6 の会話は `.op-content > .op-narration + .op-sides > .op-side-pono / .op-side-hakase` の構成。

- 各 `op-side` = 縦積みの **`.op-char-frame` (上) + `.op-dialogue` (下)** で 50% 幅、`max-width: 540px` キャップで横伸縮を抑制
- キャラは waist-shot: `<img>.op-char { width: N%; clip-path: inset(0 0 N% 0) }` で底辺を画像自体からカット、横方向は素のまま (横切り禁止)
- 両方の `.op-dialogue` は常時表示・固定サイズ (`max-width: 480px`, `min-height: 120px`, `max-height: 200px`, `overflow-y: auto`)。発話側 opacity 1.0、非発話側 opacity 0.55 の dim で発話者を明示
- 旧 `.op-characters` (キャラ行) + `.op-dialogues` (吹き出し行) の 2 行レイアウトは廃止、`.op-side` 縦積みに統一

背景ブラーは `.op-bg.is-static-blur { filter: blur(5px) saturate(0.9) brightness(0.94) }` (旧 `blur(10px) saturate(0.85) brightness(0.92)` の半分強度)。`.op-bg` は letterbox 外まで全画面で延長 (`.op-cinematic` ルートに対する `position: absolute; inset: 0`)。

### アスペクト戦略: 4:3 letterbox + 解像度別調整

cinematic stage は `.op-content` で **4:3 を最大アスペクト** として letterbox する:

```css
.op-content {
  width: min(100vw, calc(100vh * 4 / 3));
  height: min(100vh, calc(100vw * 3 / 4));
  aspect-ratio: 4 / 3;
}
```

- 4:3 viewport (1024×768): 100vw × 100vh で full
- 16:9 viewport (1920×1080): 1440 × 1080 (左右に 240px の letterbox bar)
- 21:9 viewport (1920×800): 1067 × 800 (左右に 426px の letterbox bar)

これにより内部レイアウトは **4:3 1 つだけ**を考慮すればよくなる。背景ブラー画像は letterbox 外も覆うため画面全体は埋まる (黒帯にならない)。

解像度別の追加調整:
- `(min-aspect-ratio: 16/10)` ワイド画面: ナレーション max-width 720→900px (横長矩形化)、会話ボックス max-width 480→540px、文字 22→20px
- `(max-width: 540px)` モバイル: キャラ・ボックス共に縮小、ボックス max-width: 100%

### キャラサイズ: width 基準 + clip-path inset (重要設計指針)

過去に試した height 基準 (height 180%/120% で frame をはみ出させ overflow:hidden) は、横長アセット (例: 博士の指示棒が画像左端まで突き出ている) で **横が切れる**問題があった。ユーザ要件「キャラクターの横が切れるのはダメ」に基づき、設計を **width 基準 + clip-path** に転換:

```css
.op-char-frame { position: relative; /* overflow:hidden は不要 */ }
.op-char-pono   { width: 75%; max-width: 280px; clip-path: inset(0 0 35% 0); }
.op-char-hakase { width: 95%; max-width: 320px; clip-path: inset(0 0 25% 0); }
```

- 横方向は元画像の natural aspect で表示 (横切れゼロ)
- 縦方向の waist-shot は **画像自体の下 N% を clip-path: inset() でカット**
- frame の `overflow: hidden` は不要 (むしろあると label 等の絶対配置子が clip される弊害があるため撤去)

| キャラ | desktop | wide (≥16/10) | mobile | clip-path bottom |
|---|---|---|---|---|
| ポノ全 5 枚 | 75% / max 280px | max 240px | 80% / max 200px | **35%** カット |
| 博士 (`owl_professor_guide.webp`) | 95% / max 320px | max 280px | 95% / max 230px | **25%** カット (squat な体型なので少なめ) |

**新キャラ追加時の決め方**:
1. 画像のアスペクトと **底辺に何があるか** を視覚確認 (足先・尻尾・台座など、隠してよい要素か)
2. width % は他キャラと並べた時に頭サイズが揃うように調整 (Pono 75%, 博士 95% は経験値)
3. clip-path bottom % は visible top portion で **頭 + 胸 + 腰**が映るように設定。縦長キャラ (Pono) は 30-40%、横長キャラ (博士) は 20-25%
4. 横方向の clip は使わない (横切れ禁止)
5. 必ず実機 (staging) で 4:3, 16:9, 21:9, モバイル縦の組み合わせを目視確認

### 補足: 長セリフの auto-scroll

`_opTypeInto` の典型タイピング loop で `el.textContent += c` の直後に `el.closest('.op-dialogue').scrollTop = scrollHeight` を呼ぶ。`max-height: 200px + overflow-y: auto` のボックスで長セリフ (例: panel 5 「ほっほっほ、それでよい。…」) の末尾が下に隠れないようにするため。

## ナレーション asymmetric padding (視覚中央補正、2026-05-08)

ナレーションフレーム (Panel 1 で表示する縦長プレート風の枠) は、デザイン上の **視覚中央が幾何中央より上**にある (上部に装飾の余白、下部に細い帯がある等)。対称 padding (`padding: Npx Mpx`) のままだと、テキストが視覚中央より下にずれて「テキストが下に張り付いて見える」問題が出ていた。

これを解消するため、各 VC で `padding-top` を減らし `padding-bottom` を増やして **テキスト中心を上にシフト**する asymmetric padding を採用:

| VC | padding | シフト量 | 補足 |
|----|---------|----------|------|
| B  | `padding: 25px 28px 55px;` | top -15px / bottom +15px (合計上に 15px シフト) | font-size 30px |
| C  | `padding: 22px 36px 62px;` | top -20px / bottom +20px (合計上に 20px シフト) | font-size 44px |
| D  | `padding: 12px 40px 52px;` | top -20px / bottom +20px (合計上に 20px シフト) | font-size 52px |

(対応箇所: `quizland/index.html` ~L2552 / L2622 / L2692 周辺、各 VC の `.op-narration` ルール)

### 重要: エディタ Export との non-parity (TODO)

現状 `tools/op-layout-editor.html` の narration 編集 UI には **`paddingTop` / `paddingBottom` を独立に編集するコントロールが無い**。`padding` を `25px 28px 55px` のような 3 値ショートハンドで保持する仕組みがエディタ state に無いため、**エディタで CSS Export を実行すると asymmetric 値が消えて対称 padding に戻ってしまう可能性がある**。

回避策:
- Export 後にこの asymmetric 値を **手動で書き戻す** か、
- Export 前にデータを点検し、現状の手書き asymmetric 部分は **マージしない**。

恒久対応 TODO:
- エディタ narration セクションに `padding-top` / `padding-bottom` を独立スライダーとして追加し、state にも `paddingTop` / `paddingBottom` フィールドを持たせ、`applyNarrationToDom()` と CSS Export を 4 値分離型に書き換える。

## タップしてつづける の動的位置追従 (sw v890+)

`.op-tap-hint` (タップしてつづける) は、Panel 1 の `.op-narration` プレートの**高さ・位置に追従して直下に動的配置**される。固定 `bottom: 24-28px` (per-VC) のままだと、エディタで narration の `top` / `height` / `padding` を変更した瞬間に**プレートと tap-hint が物理的に重なる**バグがあったため。

実装ポイント (`quizland/index.html`):

- `_opPositionTapHintRelativeToNarration()` ヘルパを追加。`.op-content` を基準に `narration.offsetTop + offsetHeight` を計算し、 tap-hint をその直下 (gap **12px**) に inline `top: <px>px; bottom: auto` で配置。画面下方向の余白が tap-hint の高さ + 12px に満たない場合は narration の**直上**にフォールバック (`top: <narrTop - hintH - 12>px`)。
- `_opShowTapHint(showTextEl)` 内、tap-hint を表示する直前に上記ヘルパを呼ぶ。seg2 swap (narration テキスト差し替え) のタイミングでも再計算。
- `_opHideTapHint()` および `playOpeningCinematic()` の `finally` で tap-hint の inline `top` / `bottom` をクリア (replay 時の前回値持ち越し防止)。
- CSS の `.op-tap-hint { bottom: 24-28px }` (per-VC) は、**narration が非表示のシーン (panel 2-6 等) でのフォールバック値**としてそのまま温存。

設計指針: tap-hint は本来 narration の動線の一部 (「読み終わったらタップ」) なので、視覚的に narration に張り付く位置が正解。CSS だけで `narration の bottom + 12px` を表現する方法 (sibling selector / margin) は、 narration 自体が absolute / fixed 系のレイアウトに切替わった場合に破綻するため、JS で offsetTop ベースに再計算する方針を採用。

## Editor → runtime narration override 配線 (sw v890+ で localStorage 経路、sw v892+ で saved-layout.json 経路追加)

`tools/op-layout-editor.html` で編集した narration の `lineHeight` / `padding` / `fontSize` / `width` / `height` / 位置 / `bg` / `border` を runtime に反映する経路。**localStorage (A 経路、自端末のみ)** と **saved-layout.json 経由の GitHub 配信 (B 経路、全端末配信)** の 2 系統を併用し、runtime は 3 段優先で適用する:

```
優先度: window._currentLayoutData.__op_narration[vc]   (B 経路、全端末配信)
      > localStorage[NARRATION_RUNTIME_PREFIX+vc]     (A 経路、dev 用 fallback)
      > null                                          (CSS デフォルト温存)
```

`buildRuntimeNarration(vc)` ヘルパで両経路の snapshot 形 (フィールド名) を統一しているので、 runtime 側はソースを意識せず `_opApplyNarrationOverride(narrEl)` 内で同じロジックで処理できる。

### 保存側 (editor) — A 経路 (localStorage、自端末確認用)

`tools/op-layout-editor.html` の `save(vc)` で、既存の STORAGE_PREFIX (per-question layout snapshot) を**温存したまま**、 別キー `localStorage['pono.opNarration.runtime.<VC>']` に runtime 用 snapshot を JSON で書き出す。フィールド:

| field | 用途 |
|---|---|
| `lineHeight` | 行間 |
| `paddingX` / `paddingY` | 左右 / 上下 padding (px) |
| `fontSize` | px |
| `width` / `height` / `heightAuto` | サイズ (heightAuto=true なら height は注入しない) |
| `posMode` ('top' \| 'bottom') / `top` / `bottom` | 配置 (px) |
| `textAlignH` | 'left' \| 'center' \| 'right' |
| `bgMode` ('css' \| 'image' \| 'none') / `bgColor` (#hex) / `bgOpacity` | 背景 (image は本機能では未注入、css 時のみ rgba 合成) |
| `borderRadius` | px |
| `showShadow` | bool |

### 保存側 (editor) — B 経路 (saved-layout.json 経由、sw v892+、全端末配信)

エディタに新規「📡 GitHub 配信」ボタン (`publishNarrationToSavedLayout()`) を追加。挙動:

1. `/api/gh/repos/NautilusDW/pono-asobiba-app/contents/quizland/saved-layout.json` を **GET** → `_ghGetSavedLayout()` で base64 decode + JSON parse
2. parse 後の object の **top-level に `__op_narration`** キーを merge (`{ B: {...}, C: {...}, D: {...}}` の VC 別 dict、`buildRuntimeNarration(vc)` で生成した snapshot)
3. **PUT** 時には GET で取得した `sha` を引継ぎ。 既存 per-question keys (`q72`, `q83`, `__chip_text_overrides`, ...) は **`__op_narration` 以外を完全温存**
4. 409 conflict (他者が同時編集) はユーザに通知して中断

#### HIGH fix: `_ghGetSavedLayout` の parse 失敗時のデータロス防止

実装初期、`_ghGetSavedLayout` が **parse 失敗を黙って `{}` で返してしまう**バグがあった。これは「base64 が空 (= 新規ファイル)」と「base64 は中身あるが壊れている」を区別できず、後者の場合に **`{}` を merge → PUT で全 keys 喪失**という致命リスクがあった。

修正後は:
- base64 が空 (= ファイル未作成) なら `{}` を返す (正常系)
- base64 が非空かつ parse 失敗 → **throw** してエディタ UI に「saved-layout.json が壊れています、配信を中止」と通知
- エディタ側は throw を catch して `alert` + return、PUT には**進まない**

これにより saved-layout.json の他キー全消去リスクは封じられた。

### 反映側 (runtime / `quizland/index.html`)

新ヘルパ群:

- `_opGetCurrentVC()`: `matchMedia('(min-aspect-ratio: 19/10)')` → **'D'**, `(min-aspect-ratio: 14/10)` → **'C'**, `(min-aspect-ratio: 85/100)` → **'B'**, **どれにもマッチしないなら `null`**。CSS の `@media` ブレークポイント (D/C/B + 縦長端末) と完全一致するように上から順に評価。null の場合は inline style を**一切注入しない** (CSS デフォルトを尊重)。
- `_opLoadNarrationOverride(vc)`: **3 段優先で snapshot を返す**。
  1. `window._currentLayoutData?.__op_narration?.[vc]` が object なら採用 (B 経路、saved-layout.json から fetch されたもの)
  2. 無ければ `localStorage[NARRATION_RUNTIME_PREFIX + vc]` を JSON.parse (A 経路、dev 用 fallback)
  3. どちらも無ければ null
- `_opHexToRgba(hex, opacity)`: `bgColor` (#rrggbb) + `bgOpacity` (0-1) → rgba 文字列。# 抜き / 3 桁 hex / 不正値も受ける (正規化、不正は null 返却)。
- `_opApplyNarrationOverride(narrEl)`: 上記 3 つを束ねて、**有効な値のみ** narrEl に inline style を注入。

  - `contentH === 0` (= レイアウト未確定) 時は早期 return (heightAuto=false 時に 0 を入れて潰すのを防ぐ)。
  - `value === undefined` / `NaN` / 空文字のフィールドは**注入スキップ** (CSS デフォルトを温存)。これは per-question layout の whitelist + opt-in 哲学を踏襲。
  - `bgMode === 'css'` で `bgColor` が不正値の場合、 `backgroundColor` は設定しないが `backgroundImage = 'none'` だけは確実に上書き (BG image override の残骸が漏れるのを防ぐ)。

呼び出しタイミング:
- seg1 表示直前 ( narration 要素を visible にする直前) で `_opApplyNarrationOverride(narration)` を 1 回呼ぶ。
- `playOpeningCinematic` の `finally` で narration の inline style を**全クリア** (replay 時に前回 override を持ち越さないため)。

### 設計トレードオフ

- **A 経路 (localStorage)**: 同一 origin / 同一ブラウザ間でのみ共有。dev 中に「自分の手元でだけ確認」したい時に高速。
- **B 経路 (saved-layout.json)**: GitHub 経由で全端末・全ユーザに配信。 staging / production 共通の挙動を作るための本命。HIGH fix で parse 失敗時のロスを封じた上で、**`__op_narration` は top-level の独立キー**として置くため、 per-question layout (`__chip_text_overrides` など) や qNN のキーとは**完全に非衝突**。
- editor の CSS Export ボタンを使う既存ワークフロー (asymmetric padding を本番に焼き込む等) は無傷。CSS Export は **全ユーザ向けの恒久的な見た目変更**、 saved-layout.json 経路は **データ駆動の上書き** (CSS には書き出さず、 runtime が JSON を読んで inline style として反映) という棲み分け。
- **横展開予定**: 同じ「saved-layout.json の `__xxx` キーに JSON snapshot を merge → runtime が読んで inline 反映」という配信パターンは、他ゲームの layout 配信にも応用できる (例: zukan / character-builder / maze の layout エディタ)。

## Panel Spec

| # | kind | bg | 内容 |
|---|------|-----|------|
| 1 | narration | `OP_BG.webp` (森の家・外観、**シャープ／ブラー無し**、21:9 高解像度版に差し替え済み) | **ナレーションは全文 Bold** (font-weight: bold @ `.op-narration` base)、**全 5 行 黒で確定** (`OP_PANELS[0].segments[*].lines[*].emphasis = false`)。途中で seg2 (line 2 だけ → 全行) を `emphasis: true` で赤強調に切替えた経緯があるが「子供向けで赤強調は強すぎる／不要、Bold で十分」というフィードバックで **全面ロールバック済み**。seg1 (3行): もりの おくに… / そこには、なんでも しっている / ふくろうの はかせが すんでいます。 / seg2 (2行): ポノは、なかよしの はかせと、いつもの なぞなぞで / あそぶために やってきました。 |
| 2 | dialogue  | `OP_BG02.webp` (**博士の家の屋内**、is-static-blur: scale 1.08 + blur 5px) | **入室演出 (2026-05-08 追加)**: 最初の 2 秒は **BG を sharp で表示** (blur 無し / キャラ・Box 非表示) → 2 秒経過時に `is-static-blur` 追加 (filter フェード 0.6s) + sides / dialogueBox を opacity 0→1 で 0.5s フェードイン → 600ms マージン後に typing 開始。Pono panel 既定 = `dance_hi.webp`、**hakase line で `pono_001.webp` (neutral 立ち姿、聞き役)、pono line で `dance_smile.webp` に override**、博士 = `owl_professor_guide.webp`、台詞「ほっほっほ…ポノか。よくきたのう」「はかせ、あそびに きたよ！」 |
| 3 | dialogue  | 同上 | Pono panel 既定 = `dance_hooray.webp`、**hakase line で `pono_001.webp` (聞き役)、pono line で `dance_hooray.webp`**、台詞「きょうも なぞなぞを するかの？」「うん！やりたい！」 |
| 4 | dialogue  | 同上 | Pono panel 既定 = `think_arms_crossed_side.webp`、**hakase line で `pono_001.webp` (聞き役)、pono line で `think_arms_crossed_side.webp`**、台詞「ふむふむ… じしんは あるかな？」「うーん…でも がんばる！」 |
| 5 | dialogue  | 同上 | Pono panel 既定 = `dance_smile.webp`、**hakase line で `pono_001.webp` (聞き役)、pono line で `dance_smile.webp`**、台詞「ほっほっほ、それでよい。まちがえても よいのじゃ。**かんがえることが たいせつじゃからの。**」「うん！」 (2026-05-08 拡張) |
| 6 | dialogue  | 同上 | Pono panel 既定 = `think_chin_clasp.webp`、**hakase line / pono line とも `think_chin_clasp.webp`** (両者真剣な構え)、台詞「では、いくぞ…」「うん！」 |

Pono は `assets/images/characters/pono/dance/` 配下の透過 PNG を panel ごとに表情/身振り別で切替。**2026-05-08 から per-line `ponoImg` 対応** (speaker 関係なく全 line で指定可能): 各 dialogue line に optional `ponoImg` を持たせ、playOpeningCinematic が line 開始時に `d.ponoImg ?? panel.ponoImg` で `op-char-pono` の src を切替える (panel-level は fallback として残置 = 互換性維持)。**hakase 発話中も Pono は表示されているので、聞いている/驚いている等のリアクションを per-line ponoImg で表現できる。Panel 2-5 は `pono_001.webp` (neutral 立ち姿)、Panel 6 は `think_chin_clasp.webp` を使用**。事前にナレーション中に `new Image()` で全 panel + per-line ponoImg をプリロード済み（コールドキャッシュでも切替時 pop しない）。

**新規アセット (2026-05-08)**: `assets/images/characters/pono/dance/pono_001.webp` (399×569 RGBA, 46.5KB) — 元 `assets/images/characters/pono/pono_001.png` (303KB, 立ち姿 neutral) を WebP q85 で 85% 削減。元 PNG はそのまま残置 (他参照保護)。

## Implementation Files

- **`quizland/index.html`**:
  - CSS: ~2120-2310（`.op-cinematic`, `.op-bg.is-static-blur`, `.op-content` 4:3 セーフエリア, バブル、スキップボタン、フェードイン）
  - HTML: ~2459-2479（`#op-cinematic` overlay + `.op-content` ラッパー）
  - JS: ~3920-4200（`OP_PANELS` segments, `_opTypeInto`, `playOpeningCinematic` 2 セグメント crossfade）+ mode-btn ハンドラ修正 + 4253-4271 でタイトルタップ時に WebP 7 枚 + WAV をプリロード
- **アセット (WebP 化済み、PNG はフォールバックで残置)**:
  - `assets/images/quizland/OP/OP_BG.webp` (96KB / 元 2.2MB → 95.6% 削減)
  - `assets/images/quizland/owl_professor_guide.webp` (79KB / 元 1.5MB → 94.6% 削減)
  - `assets/images/characters/pono/dance/{dance_hi,dance_hooray,think_arms_crossed_side,dance_smile,think_chin_clasp}.webp` (各 33-51KB)
  - `OP_NA.wav` (837KB) — ナレーション、現状 17.45s
- **`tmp/quizland-op-cinematic/CODEX-PROMPT.md`**: Panel 2-6 の絵生成仕様（gitignored）

## API / Public surface

- `playOpeningCinematic()` — async, シングルトン（`_opRunning` ガード）。返り値なし、終了で resolve。
- スキップ: `#op-skip` クリックで `_opCancelled = true` → 進行中の audio.pause + babble.cancelAll + タイピング tick 中断。

## Audio coordination

- `OP_NA.wav` は `new Audio()` を `audioCtx.createMediaElementSource()` で既存 AudioContext に接続（iOS のユーザージェスチャーコンテキスト失効対策）。BGM は title-tap 時に `startBGM()` で起動済みなので audioCtx は unlock 済み。
- パネル 2-6 は文字ごとに `PonoBabble.playChar(c, 'owl' | 'pono')`。

## Audio levels (反映済み)

統一スキームは [feature_audio_balance.md](feature_audio_balance.md) を参照。シネマでの実装:
- ナレーション (`OP_NA.wav`): Web Audio gain 0.65 + HTMLAudio.volume 0.65 fallback (`__opNarrSrc`/`__opNarrGain` を関数スコープで追跡)
- BGM (`bgmGain`): ナレ再生中は元値の 30% にダック (tau 0.18)、終了/skip/timeout/throw 全パスで `finally` から復帰 (tau 0.15)
- リプレイ時の Web Audio ノードリーク防止: `finally` で `__opNarrSrc.disconnect()` / `__opNarrGain.disconnect()`

## Known follow-ups (not blockers)

1. **Replay gate** — 毎回モード選択ごとに再生。`sessionStorage.setItem('op_seen', '1')` で初回のみに制限する案あり。
2. **OP_NA.wav の文言ズレ** — 現在のセグメント 2 の表示文言は「ポノは、なかよしの はかせと、いつもの なぞなぞで あそぶために やってきました。」だが、wav の音声は元々の「なぞなぞで あそびに きました」のままなのでテキストと音声が不一致。再録音するか、ナレ末尾だけ別 wav に差し替えるのが本筋。
3. **Pono voice** — 現状はシンプルなトライアングル単発音。owl と並ぶと差が大きいので、voice path（フォルマント+LFO）へ昇格させたい。
4. **Audio path convention** — `OP_NA.wav` が `assets/images/` 配下にあるのは命名規約違反。`assets/audio/quizland/OP/` に移動するのが本筋。
5. **Dead CSS** — `@keyframes opDolly`, `.op-bg.dollying`, `.op-bg.scenic-blur` は static-blur 移行で未使用化。削除可。
6. **エディタ asymmetric padding 入力 UI** — narration `.op-narration` の `padding-top` / `padding-bottom` 独立コントロールがエディタに無い。CSS Export を回した際に手書きの asymmetric 値 (B: `25px 28px 55px` / C: `22px 36px 62px` / D: `12px 40px 52px`) が **対称化されてリグレッションする危険**あり。state とエディタ UI / `applyNarrationToDom` / CSS Export を 4 値分離型へ拡張するのが恒久対応。 (詳細: 「ナレーション asymmetric padding」セクション参照)
7. **VC C / D narration の overflow 脆弱性** — 現在 `.op-narration` は `height` 固定 + `overflow` 未指定。3 行は収まるが **4 行以上書くとフレーム外にあふれる**可能性。reviewer 推奨: `overflow: hidden` を追加して安全側に倒す (本番のテキストを 3 行以下に保つ運用ルールがあるが、エディタからミスで増える事故予防)。今回スコープ外で未対応。

## Skip / Cancel semantics

- スキップボタン押下 → 即時：
  1. `_opCancelled = true`
  2. `_opActiveAudio.pause()`
  3. `PonoBabble.cancelAll()`
  4. 進行中の `_opTypeInto` ループは次の `tick()` で `_opCancelled` を見て resolve
  5. 200ms ポーリング interval も `finish()` を呼んで wait-promise 解放
  6. `playOpeningCinematic` の `finally` で overlay を hidden に戻し `_opRunning = false`
