---
name: Quizland Opening Cinematic
description: 6-panel intro that plays after mode-select (before initGame). Ken Burns dolly + narration + babble dialog + skip. Codex prompt for missing panel art at tmp/quizland-op-cinematic/. tap-hint dynamic-follow + editor→runtime override (sw v890+) + saved-layout.json 経由の全端末配信 (B 経路、sw v892+)。 ナレーション音声を seg1 (OP_NA01.mp3) / seg2 (OP_NA02.mp3) で per-seg 分割再生 (sw v893+、v894+ で seg2 ファイル名のアンダースコアを撤去)。 v900+ で saved-layout.json に seed を直接書き込み、 editor 起動時に localStorage > seed > defaults の 3 段優先で初期化 + 「⟳ 復元」 + v902+ で 「💾 Export」 / 「📂 Import」 で origin 跨ぎ (ローカル ↔ staging) JSON 移植。 **v904+ (Q 案完成) で saved-layout.json の主キーを `__op_layout: { B, C, D }` (新) に拡張、 各 VC で `pono / hakase / singleBox / narration` 4 オブジェクトを per-VC で配信** — 旧 `__op_narration` は後方互換のため温存され、立ち絵+対話+ナレ全部を「📡 GitHub 配信」 1 操作で全端末反映できる。 **v905+ でポノ立ち絵に `perVariant` (6 ポーズ × 6 slot フィールド、 hakase 発話用 `pono_001` 含む) を配信、 dialogue line ごとに variant 名 (line.ponoImg → panel.ponoImg basename) を抽出して `perVariant[variantName]` を flat より優先で適用** — ポーズ切替時に slot 位置・サイズが追従。 **v906+ で editor ヘッダの 17 散在ボタンを 3 ドロップダウン (📥 Export ▾ / 📤 Import ▾ / 📡 配信 ▾) に集約、 配信ドロップダウンは staging origin (`pono-asobiba-staging.ndw.workers.dev`) のみ表示する allowlist 方式で、 ローカル開発 (file:// / localhost / 私有 IP / ::1) と production (`pono.kodama-no-mori.com`) では非表示** — production は GH_BRANCH='develop' hardcode の誤配信防止。
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

新: `OP_NA01.mp3` (seg1) + `OP_NA02.mp3` (seg2) を `OP_PANELS[0].segments[i].audio` で **per-seg に格納**し、cinematic loop で seg を進めた瞬間に対応する Audio を強制停止する。タップで進めれば「読み終わるところまで」音声がきっちり止まる。

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

## Editor → runtime override 配線 (sw v890+ localStorage 経路、sw v892+ saved-layout.json 経路、sw v900+ seed 起動 fallback + 復元、 sw v904+ で立ち絵+対話+ナレ全部を全端末配信)

`tools/op-layout-editor.html` で編集した **立ち絵 (pono / hakase) + 対話ボックス (singleBox) + ナレーション (narration)** の `lineHeight` / `padding` / `fontSize` / `width` / `height` / 位置 / `bg` / `border` 等を runtime に反映する経路。**localStorage (A 経路、自端末のみ)** と **saved-layout.json 経由の GitHub 配信 (B 経路、全端末配信)** の 2 系統を併用し、runtime は以下の優先で適用する:

```
narration:
  優先度: window._currentLayoutData.__op_layout[vc].narration   (B 経路、新キー、 全端末配信)
        > window._currentLayoutData.__op_narration[vc]          (B 経路、旧キー、 後方互換)
        > localStorage[NARRATION_RUNTIME_PREFIX+vc]             (A 経路、dev 用 fallback)
        > null                                                   (CSS デフォルト温存)

pono / hakase / singleBox:
  優先度: window._currentLayoutData.__op_layout[vc].<obj>       (B 経路、新キー、 全端末配信)
        > null                                                   (CSS デフォルト温存)
```

新ヘルパ `_opLoadLayoutOverride(vc)` (runtime 側) と `buildRuntimeOpLayout()` / `applySeedToOpLayout(vc)` (editor 側) で両経路の snapshot 形 (フィールド名) を統一。 旧 `_opLoadNarrationOverride(vc)` も `__op_layout` を見るよう書き換え済 (旧 `__op_narration` キーも fallback で参照)。

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

### 保存側 (editor) — B 経路 (saved-layout.json 経由、sw v892+ 導入、 sw v904+ で `__op_layout` 新キーに拡張)

エディタの「📡 GitHub 配信」ボタン (`publishNarrationToSavedLayout()`) は、 sw v904+ で **立ち絵 (pono/hakase) + 対話ボックス (singleBox) + ナレーション (narration)** を全部書き出す経路に拡張された。 挙動:

1. `/api/gh/repos/NautilusDW/pono-asobiba-app/contents/quizland/saved-layout.json` を **GET** → `_ghGetSavedLayout()` で base64 decode + JSON parse
2. parse 後の object の **top-level に 2 つのキーを merge**:
   - `__op_layout: { B, C, D }` (新キー、 各 VC は `{ pono, hakase, singleBox, narration }` の 4 オブジェクト) — `buildRuntimeOpLayout()` で生成
   - `__op_narration: { B, C, D }` (旧キー、 narration のみ) — 後方互換用に **同時に書き続ける**
3. **PUT** 時には GET で取得した `sha` を引継ぎ。 既存 per-question keys (`q72`, `q83`, `__chip_text_overrides`, ...) は **`__op_layout` / `__op_narration` 以外を完全温存** (218+ keys)
4. 409 conflict (他者が同時編集) はユーザに通知して中断
5. `bgImagePath` / `boxImagePath` は frame ID から URL を解決した値で seed に補完される (HIGH-3 fix、 frame ID 直書きだと runtime 側で resolve できないため)

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
- `_opLoadLayoutOverride(vc)` (sw v904+ 新設、 ~L5223): `window._currentLayoutData?.__op_layout?.[vc]` を取得。 object でなければ null 返却。 立ち絵 / 対話 / ナレ 全部の per-VC snapshot 取得口。
- `_opLoadNarrationOverride(vc)`: **3 段優先で narration snapshot を返す** (sw v904+ で `__op_layout` 優先に書き換え済)。
  1. `_opLoadLayoutOverride(vc)?.narration` が object なら採用 (B 経路、 新キー)
  2. 無ければ `window._currentLayoutData?.__op_narration?.[vc]` を採用 (B 経路、 旧キー、 後方互換)
  3. それも無ければ `localStorage[NARRATION_RUNTIME_PREFIX + vc]` を JSON.parse (A 経路、dev 用 fallback)
  4. どれも無ければ null
- `_opApplyLayoutOverride()` (sw v904+ 新設、 ~L5243): `_opLoadLayoutOverride(_opGetCurrentVC())` で snapshot 取得 → `pono / hakase / singleBox / narration` 4 オブジェクトの inline style を **per-element に注入**。 narration は `_opApplyNarrationOverride(el)` に責務委譲して二重適用を回避 (HIGH-1 fix)。
- `_opHexToRgba(hex, opacity)`: `bgColor` (#rrggbb) + `bgOpacity` (0-1) → rgba 文字列。# 抜き / 3 桁 hex / 不正値も受ける (正規化、不正は null 返却)。
- `_opApplyNarrationOverride(narrEl)`: narration の **有効な値のみ** narrEl に inline style を注入。
  - `contentH === 0` (= レイアウト未確定) 時は早期 return (heightAuto=false 時に 0 を入れて潰すのを防ぐ)。
  - `value === undefined` / `NaN` / 空文字のフィールドは**注入スキップ** (CSS デフォルトを温存)。これは per-question layout の whitelist + opt-in 哲学を踏襲。
  - `bgMode === 'css'` で `bgColor` が不正値の場合、 `backgroundColor` は設定しないが `backgroundImage = 'none'` だけは確実に上書き (BG image override の残骸が漏れるのを防ぐ)。

呼び出しタイミング (sw v904+):
- panel ループ前 (~L5546): `_opApplyLayoutOverride()` で立ち絵 + 対話 + ナレ全部を 1 回注入
- narration セグメント可視化前 (~L5657): `_opApplyLayoutOverride()` を再度呼ぶ (narration テキスト差し替え時)
- dialogue panel 切替直後 (~L5752): `_opApplyLayoutOverride()` を再度呼ぶ (panel 跨ぎで立ち絵 / 対話の position が変わる場合に追従)
- `playOpeningCinematic` の `finally` (~L5810-L5839): pono / hakase / singleBox / narration **全部の inline style を全クリア** (replay 時に前回 override を持ち越さないため)

### 設計トレードオフ

- **A 経路 (localStorage)**: 同一 origin / 同一ブラウザ間でのみ共有。dev 中に「自分の手元でだけ確認」したい時に高速。
- **B 経路 (saved-layout.json)**: GitHub 経由で全端末・全ユーザに配信。 staging / production 共通の挙動を作るための本命。HIGH fix で parse 失敗時のロスを封じた上で、**`__op_layout` (新) / `__op_narration` (旧) は top-level の独立キー**として置くため、 per-question layout (`__chip_text_overrides` など) や qNN のキーとは**完全に非衝突**。 sw v904+ で `__op_layout` に拡張され、 立ち絵 / 対話 / ナレ全部を per-VC で配信。
- editor の CSS Export ボタンを使う既存ワークフロー (asymmetric padding を本番に焼き込む等) は無傷。CSS Export は **全ユーザ向けの恒久的な見た目変更**、 saved-layout.json 経路は **データ駆動の上書き** (CSS には書き出さず、 runtime が JSON を読んで inline style として反映) という棲み分け。
- **横展開予定**: 同じ「saved-layout.json の `__xxx` キーに JSON snapshot を merge → runtime が読んで inline 反映」という配信パターンは、他ゲームの layout 配信にも応用できる (例: zukan / character-builder / maze の layout エディタ)。

### Editor 起動時 seed fallback + 「⟳ 復元」ボタン (sw v900+)

`tools/op-layout-editor.html` を **別 origin** (例: ローカルで作業した値を staging で開く、 staging で作業した値をローカルで開く) で開いた際、 localStorage が origin スコープのため**編集値がまったく見えない**問題があった。 旧実装は `state[VC] = load(VC) || defaultsFor(VC)` で defaults に fallback してしまい、 既存の `quizland/saved-layout.json` (📡 GitHub 配信 で publish 済の正規値) が**まったく使われずデフォルト崩れ**を起こしていた。

これを解消するため:

1. **`quizland/saved-layout.json` の top-level に `__op_narration: { B, C, D }` を seed として直接書き込み** (commit a70ec33 で `quizland/index.html` の per-VC `@media` に hardcoded した CSS 値と完全一致)。 既存 219 keys (`q72`, `q83`, `__chip_text_overrides`, ...) は完全温存。
2. **editor 起動時に `init()` を async 化**し `await fetchSeedOpNarration()` で seed を fetch → `_seedOpNarration` にキャッシュ。
3. **`initVc(vc)` ヘルパで `localStorage > seed > defaults` の 3 段優先**で state を初期化:
   - localStorage 値があればそれを採用 (= 同 origin で過去に編集した値を尊重)
   - localStorage 空なら `defaultsFor(vc)` の上に `applySeedToNarration(vc)` で seed を merge → `migrateFrameIds` で sanitize
   - seed も無ければ defaults のまま
4. **「⟳ 復元」ボタン** (`📡 GitHub 配信` の隣) を追加。 `restoreNarrationFromSavedLayout()` で:
   - `confirm()` で誤クリック防止 (HIGH-1 fix)
   - `pushUndoSnapshot('⟳ 復元 ' + vc)` で復元前の状態を Undo スタックに積む (HIGH-1 fix、 万一 OK 押下後でも巻き戻せる)
   - 現 VC の `localStorage[STORAGE_PREFIX+vc]` と `localStorage[NARRATION_RUNTIME_PREFIX+vc]` を removeItem
   - `fetchSeedOpNarration(true)` で `cache: 'no-store'` 強制再 fetch (HIGH-2 fix、起動時のみ `cache: 'default'` でブラウザ HTTP キャッシュを利用し network round-trip を削る)
   - `defaults + seed merge → migrateFrameIds → state` 書き戻し → `save(vc)` → `render() / buildRightPane()`
5. seed の省略キー (例: `left=0`, `aspectLockRatio=0`) は `migrateFrameIds()` の narration backfill ロジックで 0 にフォールバックする。 将来 narration スキーマにフィールドが追加されたら seed 構造も合わせること (MEDIUM-3 fix で説明コメント追記済)。

#### 運用ガイダンス

- **ローカル → staging で編集値を移植したい場合**: 旧来は **手動 export/import が必須**だったが、 staging origin で「⟳ 復元」を押すか、 publish (📡 GitHub 配信) → そのまま staging を開けば seed として読み込まれる。
- **staging を「本物」にする運用**: 大きな変更は staging で編集 → publish → そのまま production / ローカル / 他端末も**自動で同じ値**で初期化される (= 1 回 publish で全 origin の defaults を正規値に揃えられる)。

#### 既知の制約

- localStorage は origin 跨ぎで共有されないため、 ローカルで「lineHeight 1.7」 staging で「lineHeight 1.5」 のように **同じ origin 内では** 各々の編集値が保持される (これは仕様)。 「ローカルで作業 → そのまま staging で続き」をやりたい場合は publish → staging で「⟳ 復元」を踏む。
- ただし seed 値が `quizland/index.html` の CSS hardcoded と一致しているので、 publish していなくても**大幅な崩れは起きない** (= seed の defaults 化により、 別 origin から開いても CSS と同じ値で initialize される)。
- `_seedOpNarration` は **process 内グローバルキャッシュ**。 publish 直後は「⟳ 復元」ボタンで `forceRefresh=true` 経由で再 fetch しないと古い値が残る (実装で考慮済 — `fetchSeedOpNarration(forceRefresh=true)` 時に `cache: 'no-store'`)。

### JSON Export / Import (X 案、 sw v902+) — origin 跨ぎ移植

`localStorage` が origin スコープのため、 ローカル `file://` で編集した値を staging origin に直接持っていけない問題があった (B 経路復活後も「ローカル編集 → 即 staging 配信」を成立させたい)。 これを解消するため、 editor に **「💾 NA Export」** / **「📂 NA Import」** ボタンと隠し `<input type="file">` を追加 (sw v902 で導入)。

#### 確定ワークフロー (X 案)

```
1. ローカル editor (file:// or localhost) で B/C/D narration を編集 → preview 確認
2. 「💾 NA Export」 → op-narration-<timestamp>.json をダウンロード
3. staging editor (本番 origin) を開いて 「📂 NA Import」 → JSON ファイル選択
4. 「📡 GitHub 配信」 → quizland/saved-layout.json の __op_narration を更新
5. 全端末・全ユーザに反映 (B 経路で fetch される)
```

ローカル ↔ staging のどちら方向にも双方向に移植可能。 「⟳ 復元」 (saved-layout.json から再 fetch) と組み合わせれば「staging で publish した値をローカルに持ち帰る」運用も可能。

#### JSON 形式

```json
{
  "schema": "pono-op-narration-v1",
  "exportedAt": "2026-05-09T10:30:45.123Z",
  "narration": {
    "B": { "lineHeight": 1.6, "paddingX": 28, "paddingY": 25, ... },
    "C": { ... },
    "D": { ... }
  }
}
```

- `narration[vc]` は `state[vc].narration` をそのままダンプ (フィールドはエディタが扱える narration スキーマと完全互換)
- 一部 VC が `null` でもエラーにならず該当 VC は import 時にスキップされる
- スキーマ名は `pono-op-narration-v1` (将来形式変更時はバージョンを bump)

#### 実装ポイント (`tools/op-layout-editor.html`)

- `exportNarrationJson()`: `state.B/C/D.narration` を JSON 化 → `Blob` → `<a download>` クリックで保存。 ファイル名は `op-narration-<ISO timestamp>.json`
- `importNarrationJsonFromFile(file)`:
  - `confirm()` で誤操作対策 (HIGH-1: 既存 narration を完全上書きするため必須)
  - 各 VC について `pushUndoSnapshot('NA Import ' + vc)` を積む (HIGH-2: 万一 OK 押下後でも巻き戻せる)
  - `state[vc].narration = Object.assign({}, state[vc].narration || {}, nr)` でフィールド単位の merge (= JSON 側に書かれているフィールドだけ上書き、 JSON 側に無いフィールドは現値維持)
  - `migrateFrameIds(state[vc])` で sanitize、 `save(vc)` で localStorage に永続化
  - 最後に `render()` で現 VC の preview を再描画
- イベント wire: `<button>` クリック → `<input type="file">` の `.click()` を呼んで file picker を開き、 `change` イベントで `importNarrationJsonFromFile(f)` 呼び出し。 `e.target.value = ''` で同じファイル再選択を許可

#### B 経路 / 既存ボタンとの併用

- 「📡 GitHub 配信」「⟳ 復元」「CSS Export」「JSON DL (= 全 layout snapshot)」の既存ボタンは**全て温存**。 NA Export/Import は narration の **3 VC 分のみ**を抜き出すコンパクトな移植経路で、 既存経路を一切壊さない
- `localStorage` も触らずに済むため、 ローカルで作業中の per-question layout (q72, q83 など) は import 時に**完全に無傷**

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

## (Q) 案完成 (sw v904+): 立ち絵+対話+ナレ全部を全端末配信

sw v902-v903 までの B 経路は **narration のみ** 配信していた。 sw v904+ (commit 予定の本変更) で **立ち絵 (pono / hakase) + 対話ボックス (singleBox) + ナレーション (narration) 全部** を per-VC で全端末配信できるよう拡張した (Q 案完成)。

### 効果

- editor の **「📡 GitHub 配信」 1 押**で全端末反映が完結。 立ち絵の位置 / 対話ボックスの bg / 文字サイズ等を編集 → 配信 → 全ユーザ環境に即反映
- **CSS DL → 開発者手動反映の手間ゼロ**: 旧来の 「CSS Export して quizland/index.html に手で貼り付け、 commit / push」 のフローを介さずに変更を全端末に届けられる
- 後方互換: 旧 narration-only JSON ファイル (`pono-op-narration-v1`) や 旧 `__op_narration` キーは引き続き読める。 既存ローカル editor 値も無傷

### 編集ワークフロー (確定)

```
1. ローカル editor (file:// or localhost) で B/C/D の立ち絵 / 対話 / ナレ を編集 → preview 即時反映
2. 「💾 Export」 → op-layout-<timestamp>.json をダウンロード
   (B/C/D 全部 + 立ち絵 / 対話 / ナレ 全フィールド、 schema=pono-op-layout-v1)
3. staging editor (本番 origin) を開いて 「📂 Import」 → JSON ファイル選択
   (旧 schema pono-op-narration-* も受入)
4. 「📡 GitHub 配信」 → quizland/saved-layout.json の __op_layout / __op_narration を更新
5. 全端末・全ユーザに反映 (B 経路で fetch される)
```

### 主キー構造

```json
{
  "__op_layout": {
    "B": { "pono": {...}, "hakase": {...}, "singleBox": {...}, "narration": {...} },
    "C": { ... },
    "D": { ... }
  },
  "__op_narration": {
    "B": { ... },     // 後方互換: narration のみ
    "C": { ... },
    "D": { ... }
  },
  "q72": { ... }, "q83": { ... }, "__chip_text_overrides": { ... }   // 既存 218+ keys は完全温存
}
```

### Cross-review fixes (本変更で同時投入)

- **HIGH-1**: narration の二重適用を解消。 旧 `_opApplyLayoutOverride` 末尾に narration の inline style 注入ブロックがあり、 直後の `_opApplyNarrationOverride` と二重に走っていた。 後者に責務統合し前者から削除
- **HIGH-2**: `fetchSeedOpNarration` の early-return 条件を **`_seedOpNarration && _seedOpLayout && !forceRefresh`** に厳密化。 旧来は `_seedOpNarration` だけ見ていたので、 `_seedOpLayout` (新キー) のキャッシュが空のまま 2 回目以降の fetch がスキップされる race があった
- **HIGH-3**: editor の `buildRuntimeOpLayout()` で `bgImagePath` / `boxImagePath` を frame ID から URL を resolve した値で seed に補完。 frame ID 直書きだと runtime 側で resolve できず BG が効かないバグ防止
- **LOW-1**: editor のコメント文言を実 DOM ラベルに最新化 (「NA Export/Import」 → 「Export/Import」)

## ポノ ポーズ別位置 (per-variant) 配信完成 (sw v905+)

sw v904 までの `__op_layout[VC].pono` は **flat フィールドのみ** (= 全 variant 共通の slot 位置) を配信していた。 sw v905+ で `state.pono.perVariant` を **そのまま publish payload に含める**よう拡張し、 runtime 側で **dialogue line ごとに variant 名を抽出して `perVariant[variantName]` を flat より優先で適用**できるようにした。 これでエディタで「Panel 4 で `think_arms_crossed_side` を画面右に寄せる」のような **variant 別の slot 位置編集** を全端末配信できる。

### Editor 側 (`tools/op-layout-editor.html`)

- 既存の `sideSnap(side)` を **`sideSnap(side, includePerVariant)`** に拡張 (~L2051-L2080)
  - `includePerVariant=true` のときに `side.perVariant` (object of `{variantName: slotEntry}`) を whitelist された 6 フィールド (`left`, `top`, `width`, `height`, `aspectLockRatio`, `clipBottomPct`) でフィルタして `out.perVariant` に格納
  - hakase は `sideSnap(s.hakase, false)` のまま (perVariant 概念が無い、 ポーズによる位置変化が無い前提)
- `buildRuntimeOpLayout()` の呼び出し箇所 (~L2104) で `pono: sideSnap(s.pono, true)`、 `hakase: sideSnap(s.hakase, false)` と分岐

### 6 variants (publish 対象)

```
dance_hi, dance_hooray, dance_smile,
think_arms_crossed_side, think_chin_clasp,
pono_001 (中立立ち姿、 はかせ発話時の聞き役ポノ)
```

`pono_001` は `OP_PANELS` の hakase line 側で参照される neutral 立ち姿 (Panel 2-5 で使用)。 v905 で `PONO_VARIANTS` / `defaultsFor` の `ponoPerVariantDefaults` 初期化 / `migrateFrameIds` の backfill リストに追加され、 editor 上でも 6 番目の variant として編集可能になった (cross-review HIGH-1 fix)。

### Runtime 側 (`quizland/index.html`)

新ヘルパ + 拡張:

- `_opCurrentPonoVariant(panel, line)` (~L5244): 現在ポノの variant 名を導出
  - 第 1 優先: `line.ponoImg` (line に optional でセットされるパス) の basename から拡張子除去
  - 第 2 優先: `panel.ponoImg` から同様に basename 抽出
  - パス末尾と variant 名の **命名乖離に両対応** (フルパス `.../dance_hi.webp` でも variant 名 `dance_hi` 単体でも basename 抽出で `dance_hi` に正規化)
  - 該当無しなら `null` 返却 (= flat にフォールバック)
- `_opApplyLayoutOverride(panel, line)` (~L5276) — **引数 `(panel, line)` を追加**
  - 内部の `applySide(sideKey, side, variantName)` も第 3 引数 `variantName` を追加 (~L5290)
  - `variantName` が指定されていて `side.perVariant[variantName]` が存在すれば、 **flat スロット値の上にマージしてから DOM 適用** (variant 値が flat より優先)
  - `variantName` が無い / `side.perVariant[variantName]` が空 → flat のみ適用 (後方互換)
  - hakase 側は variant 引数を常に `null` で呼ぶ (perVariant 概念無し)

呼び出し箇所 (~L5584 / L5698 / L5795 / L5886):
- 初回 (panel ループ前): `_opApplyLayoutOverride(null, null)` — variant 未確定なので明示 null (cross-review MEDIUM-1 fix)
- narration セグメント表示前: `_opApplyLayoutOverride(panel, null)` — narration panel は dialogue line 無し
- dialogue panel 切替直後: `_opApplyLayoutOverride(panel, null)` — panel 単位の variant (panel.ponoImg)
- **dialogue line ループ内: `_opApplyLayoutOverride(panel, d)`** — line ごとに line.ponoImg で variant が変わるので、 ポーズ切替に追従

### 効果

- editor で 「Panel 4 の `think_arms_crossed_side` だけ右下に詰める」 のような **variant 別 slot 編集** → 「📡 GitHub 配信」 → 全端末で line 切替時に slot 位置・サイズが追従
- hakase 側は flat のみ (perVariant 無し) — hakase はポーズによる位置変化が無い前提
- editor 内部 state は `panel.ponoImgFallback` (variant 名)、 export 時に runtime 用 `panel.ponoImg` (フルパス) に変換される命名乖離があるが、 runtime 側 `_opCurrentPonoVariant` がパスでも variant 名でも両対応するので吸収

### 既知の制約

- pono_001 は legacy editor state (commit `c119c78` 時点) では `perVariant` キーに存在しなかった。 v905 の `migrateFrameIds` に backfill ロジックを追加したので、 既存ユーザの editor を開けば `baseSlot` から自動補完される (= 既存 5 variant への影響なし、 新規 user は defaults で初期化、 既存 user は migrate 経由で 6 variant 揃う)
- editor の各立ち絵編集 UI には現状 `clip-path` の編集 UI が無い (CSS 側 hardcoded)
- 立ち絵 / 対話の bg を **「ユーザー追加フレーム (data: URL)」** にすると `boxImagePath: null` で publish される (data: URL は GitHub に publish しない仕様)

### 既知のリスク / TODO

- editor で立ち絵 / 対話の bg を **「ユーザー追加フレーム (data: URL)」** にすると、 `boxImagePath: null` で publish されてしまい、 runtime で背景なしになる (CSS デフォルトに fallback)。 現状は user-frame は localStorage 内のみで使う運用 (data: URL は GitHub に publish されない仕様)
- 「⟳ 復元」 / 「📂 Import」 / 「📡 GitHub 配信」 で `__op_layout` と `__op_narration` の **整合性が崩れた状態** (例: layout だけ古い / narration だけ古い) は今のところチェックなし。 publish 時に両方同時更新される実装に依存している
- editor の各立ち絵編集 UI には現状 **width / height / 位置 / opacity** はあるが、 `clip-path` の編集 UI が無い (CSS 側で per-VC hardcoded のまま)

## editor ヘッダ整理 (sw v906+): 3 ドロップダウン化 + ローカル/production で配信非表示

editor ヘッダに散在していた **17 個のボタン** (Export/Import/配信系で命名揺れ・並び順がバラバラ) を **HTML5 `<details>` ベースの 3 ドロップダウン** に集約 (2026-05-09)。 旧ボタン群は削除し、 関数本体は変更せず **wire のみ新 ID (`dd-*`) に再 bind** することでリスクを最小化。

### ドロップダウン構造

| ドロップダウン | 内訳 | 旧 ID → 新 ID |
|---|---|---|
| 📥 **Export ▾** | クリップボードへ全部 (CSS+JSON) / CSS ファイル (.css) / JSON ファイル (.json、 立ち絵+対話+ナレ全 variant) / シナリオ (OP_PANELS) クリップボード | `btn-export` 系 4 個 + `btn-export-narration-json` を統合 |
| 📤 **Import ▾** | JSON ファイルから取り込み (旧 narration-only 形式も読込可) | `btn-import-narration-json` を統合 |
| 📡 **配信 ▾** | GitHub 配信 / GitHub から復元 | `btn-publish-narration` + `btn-restore-narration` を統合 |

### 削除した旧ボタン (計 8 個)

- `btn-export-clipboard` (📋 クリップボードへ全部)
- `btn-export-css` (📄 CSS ファイル)
- `btn-export-json` (📄 全 layout JSON)
- `btn-export-scenario` (📜 シナリオ)
- `btn-export-narration-json` (💾 NA Export)
- `btn-import-narration-json` (📂 NA Import)
- `btn-publish-narration` (📡 GitHub 配信)
- `btn-restore-narration` (⟳ 復元)

### ドロップダウン挙動

- HTML5 `<details>` + `<summary>` ベース (= JS 不要で開閉)
- `header details.hdr-dd` を全部集めて `toggle` イベントで **相互排他** (1 つ開いたら他は close)
- `document.click` で外クリック検出 → 開いている dropdown を close (`details.contains(e.target)` で内側クリックは除外)

### `isStagingOrigin()`: 配信ドロップダウンを staging 限定で表示

旧実装は **denylist 方式** (`hostname === 'localhost'` 等を弾く) だったため、 production (`pono.kodama-no-mori.com`) で配信ボタンが見えてしまい、 押すと `GH_BRANCH='develop'` hardcode で develop ブランチに書き込まれて **意図しない反映** が起きる事故リスクがあった。 また `172.*` の startsWith over-exclusion (172.16-31 のみ RFC1918 だが全 172.x が拒否) や `::1` IPv6 loopback の漏れもあった。

これらをまとめて解消するため **allowlist 方式** に転換:

```js
const isStagingOrigin = () => {
  try {
    return window.location.hostname === 'pono-asobiba-staging.ndw.workers.dev';
  } catch (e) {
    return false;
  }
};
if (!isStagingOrigin()) {
  document.getElementById('dd-publish').style.display = 'none';
}
```

これで配信ドロップダウンが見えるのは staging origin **1 つだけ**。 ローカル開発 (file:// / localhost / 127.x / 192.168.x / 10.x / 172.x / ::1) も production も全て非表示で、 誤配信ガードが完成した。

#### Cross-review HIGH/MEDIUM fixes (allowlist 化で同時解消)

- **HIGH-1**: production で配信ボタンが見える → 非表示
- **HIGH-2**: `172.*` startsWith over-exclusion (172.0-15 / 172.32-255 を誤って拒否) → allowlist で無効化
- **MEDIUM-1**: `::1` IPv6 loopback 漏れ (旧 denylist で取りこぼし) → allowlist で無効化

### 設計指針

- **関数本体は無変更**: `exportCopy` / `download('css')` / `exportNarrationJson` / `exportScenario` / `importNarrationJsonFromFile` / `publishNarrationToSavedLayout` / `restoreNarrationFromSavedLayout` などは旧コードのまま。 `_bindDd(id, fn)` ヘルパで新 ID にだけ wire し直す。 これでリスクを「ボタン整理」のみに局所化
- **`<details>` 採用理由**: ライブラリレス (純 JS / 純 HTML) で aria 対応もブラウザ任せ。 子供向け教育 PWA でランタイム JS を増やさないポリシーに合致
- **production 非表示の運用**: 配信は **staging editor からのみ**。 staging で publish → develop ブランチに書き込み → Cloudflare Workers が develop を配信 → 全端末反映。 production からは「見たいだけ」 (= 編集 UI は使うが配信は禁止) という棲み分け
- **横展開予定**: 同じ「3 ドロップダウン + allowlist で staging 限定」 パターンは他ゲーム editor (zukan / character-builder / maze) にも適用可能

### 効果

- 旧来の **17 ボタン横並びで命名揺れ** (📋 / 📄 / 📜 / 💾 / 📂 / 📡 / ⟳ が混在) を解消、 視覚的に階層化されて UI 把握が早い
- production 誤配信ガード (HIGH-1) が allowlist 化で副作用ゼロで解消
- ローカル editor で「存在意義が無い」配信ボタン (どうせ /api/gh/ proxy が届かない) を排除して UX 統一

## Skip / Cancel semantics

- スキップボタン押下 → 即時：
  1. `_opCancelled = true`
  2. `_opActiveAudio.pause()`
  3. `PonoBabble.cancelAll()`
  4. 進行中の `_opTypeInto` ループは次の `tick()` で `_opCancelled` を見て resolve
  5. 200ms ポーリング interval も `finish()` を呼んで wait-promise 解放
  6. `playOpeningCinematic` の `finally` で overlay を hidden に戻し `_opRunning = false`
