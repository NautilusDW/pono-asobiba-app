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

`quizland/index.html` の mode-btn ハンドラ（line ~4085-4094）で `await playOpeningCinematic()` を `initGame()` の直前に挟んでいる。タイトルタップ → モード選択 → **オープニング** → 出題開始 のフロー。

```js
document.querySelectorAll('.mode-btn').forEach(function(btn) {
  btn.addEventListener('click', async function() {
    selectedMode = btn.dataset.mode;
    document.getElementById('mode-screen').classList.add('hidden');
    try { await playOpeningCinematic(); } catch (e) { console.warn(e); }
    initGame();
  });
});
```

## Panel Spec

| # | kind | bg | 内容 |
|---|------|-----|------|
| 1 | narration | `OP_BG.png` (Ken Burns 12s ドリー) | `OP_NA.wav` ナレーション + 5行テキスト（最後の2行は `.emphasis` 赤） |
| 2 | dialogue  | `OP_BG.png` (scenic-blur: scale 1.18 + blur 6px) | Pono = `dance_hi.png`、博士 = `owl_professor_guide.png`、台詞「ほっほっほ…ポノか。よくきたのう」「はかせ、あそびに きたよ！」 |
| 3 | dialogue  | 同上 | Pono = `dance_hooray.png`、台詞「きょうも なぞなぞを するかの？」「うん！やりたい！」 |
| 4 | dialogue  | 同上 | Pono = `think_arms_crossed_side.png`、台詞「ふむふむ… じしんは あるかな？」「うーん…でも がんばる！」 |
| 5 | dialogue  | 同上 | Pono = `dance_smile.png`、台詞「ほっほっほ、それでよい。まちがえても よいのじゃ。…」「うん！」 |
| 6 | dialogue  | 同上 | Pono = `think_chin_clasp.png`、台詞「では、いくぞ…」「うん！」 |

Pono は `assets/images/characters/pono/dance/` 配下の透過 PNG を panel ごとに表情/身振り別で切替。事前にナレーション中に `new Image()` で 5 枚プリロード済み（コールドキャッシュでも切替時 pop しない）。

## Implementation Files

- **`quizland/index.html`**:
  - CSS: 2121-2256（`.op-cinematic`, `@keyframes opDolly`, バブル、スキップボタン）
  - HTML: 2407-2429（`#op-cinematic` overlay）
  - JS: 3863-4078（`OP_PANELS`, `_opTypeInto`, `playOpeningCinematic`）+ mode-btn ハンドラ修正
- **`assets/images/quizland/OP/`**: `OP_BG.png` (3.0MB), `OP_NA.wav` (837KB)
- **`tmp/quizland-op-cinematic/CODEX-PROMPT.md`**: Panel 2-6 の絵生成仕様

## API / Public surface

- `playOpeningCinematic()` — async, シングルトン（`_opRunning` ガード）。返り値なし、終了で resolve。
- スキップ: `#op-skip` クリックで `_opCancelled = true` → 進行中の audio.pause + babble.cancelAll + タイピング tick 中断。

## Audio coordination

- `OP_NA.wav` は `new Audio()` を `audioCtx.createMediaElementSource()` で既存 AudioContext に接続（iOS のユーザージェスチャーコンテキスト失効対策）。BGM は title-tap 時に `startBGM()` で起動済みなので audioCtx は unlock 済み。
- パネル 2-6 は文字ごとに `PonoBabble.playChar(c, 'owl' | 'pono')`。

## Known follow-ups (not blockers)

1. **BGM duck during panel 1 narration** — 現在は narration と BGM が同時再生。`bgmGain.gain.setTargetAtTime(BGM_VOLUME * 0.2, ...)` で一時的にダックすると聞き取りやすくなる。
2. **Replay gate** — 毎回モード選択ごとに再生される。`sessionStorage.setItem('op_seen', '1')` で初回のみに制限する案あり。
3. **Pono character art** — 現在は 🧸 絵文字でプレースホルダー。Codex でパネル 2-6 を生成すれば `op-char-pono` の DOM 要素は不要になり、背景画像内に統合される。
4. **Pono voice** — 現状はシンプルなトライアングル単発音。owl と並ぶと差が大きいので、将来的に voice path（フォルマント+LFO）へ昇格させたい。
5. **Audio path convention** — `OP_NA.wav` が `assets/images/` 配下にあるのは命名規約違反。`assets/audio/quizland/OP/` に移動するのが本筋。

## Skip / Cancel semantics

- スキップボタン押下 → 即時：
  1. `_opCancelled = true`
  2. `_opActiveAudio.pause()`
  3. `PonoBabble.cancelAll()`
  4. 進行中の `_opTypeInto` ループは次の `tick()` で `_opCancelled` を見て resolve
  5. 200ms ポーリング interval も `finish()` を呼んで wait-promise 解放
  6. `playOpeningCinematic` の `finally` で overlay を hidden に戻し `_opRunning = false`
