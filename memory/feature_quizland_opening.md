---
name: Quizland Opening Cinematic
description: 6-panel intro that plays after mode-select (before initGame). Ken Burns dolly + narration + babble dialog + skip. Codex prompt for missing panel art at tmp/quizland-op-cinematic/.
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

## ナレーション 2 セグメント切替タイミング (2026-05-07 調整)

panel 1 のナレーション (`OP_NA.wav`、17.45s) を 2 セグメントに分けて表示している:

- **seg1** (3 行 通常): もりの おくに… ふくろうの はかせが すんでいます。
- **seg2** (2 行 赤強調): ポノは、なかよしの はかせと、いつもの なぞなぞで あそぶために やってきました。

切替トリガは `audio.currentTime >= Math.max(audio.duration * 0.62, 11.0)` — 「はかせが すんでいます」の発話終了 (≈11s) 以降に切替。fallback timeout は 12s。旧 `audio.duration / 2` (≈8.7s) では「なんでも しっている」直後で seg1 が早く切れすぎていたため修正。

ナレ全文の audio.ended 後にさらに **2 秒の hold** を入れてから panel 2 (博士の発話) に遷移。博士の発話開始がナレ余韻と重ならないようにするため。

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

## Panel Spec

| # | kind | bg | 内容 |
|---|------|-----|------|
| 1 | narration | `OP_BG.webp` (森の家・外観、**シャープ／ブラー無し**) | seg1 (3行): もりの おくに… すんでいます。 / seg2 (2行 赤強調、新文言): ポノは、なかよしの はかせと、いつもの なぞなぞで あそぶために やってきました。 |
| 2 | dialogue  | `OP_BG02.webp` (**博士の家の屋内**、is-static-blur: scale 1.08 + blur 10px) | Pono panel 既定 = `dance_hi.webp`、**pono line で `dance_smile.webp` に override** (per-line ponoImg)、博士 = `owl_professor_guide.webp`、台詞「ほっほっほ…ポノか。よくきたのう」「はかせ、あそびに きたよ！」 |
| 3 | dialogue  | 同上 | Pono = `dance_hooray.webp` (panel + line とも同値)、台詞「きょうも なぞなぞを するかの？」「うん！やりたい！」 |
| 4 | dialogue  | 同上 | Pono = `think_arms_crossed_side.webp`、台詞「ふむふむ… じしんは あるかな？」「うーん…でも がんばる！」 |
| 5 | dialogue  | 同上 | Pono = `dance_smile.webp`、台詞「ほっほっほ、それでよい。まちがえても よいのじゃ。**かんがえることが たいせつじゃからの。**」「うん！」 (2026-05-08 拡張) |
| 6 | dialogue  | 同上 | Pono = `think_chin_clasp.webp`、台詞「では、いくぞ…」「うん！」 |

Pono は `assets/images/characters/pono/dance/` 配下の透過 PNG を panel ごとに表情/身振り別で切替。**2026-05-08 から per-line `ponoImg` 対応**: 各 dialogue line に optional `ponoImg` を持たせ、playOpeningCinematic が line 開始時に `d.ponoImg ?? panel.ponoImg` で `op-char-pono` の src を切替える (panel-level は fallback として残置 = 互換性維持)。事前にナレーション中に `new Image()` で全 panel + per-line ponoImg をプリロード済み（コールドキャッシュでも切替時 pop しない）。

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

## Skip / Cancel semantics

- スキップボタン押下 → 即時：
  1. `_opCancelled = true`
  2. `_opActiveAudio.pause()`
  3. `PonoBabble.cancelAll()`
  4. 進行中の `_opTypeInto` ループは次の `tick()` で `_opCancelled` を見て resolve
  5. 200ms ポーリング interval も `finish()` を呼んで wait-promise 解放
  6. `playOpeningCinematic` の `finally` で overlay を hidden に戻し `_opRunning = false`
