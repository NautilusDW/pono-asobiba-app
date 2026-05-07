# Quizland Opening Cinematic — Layout Redesign Handoff

> **目的:** Quizland (なぞなぞゲーム) のオープニング・シネマティック (6 パネル構成) のうち、**ダイアログ・パネル (パネル 2〜6) のレイアウト**を、Claude Design (Claude.ai のデザイン / アーティファクト機能) でゼロから設計し直す。
>
> このドキュメントは、コールドスタートする次のセッションが、過去の試行錯誤を繰り返さずに済むように、**現状・制約・失敗履歴・受け入れ基準**を完全な形で渡すために書かれている。

---

## 1. TL;DR (3 sentences max)

Quizland の難易度選択タップ後に再生される 6 パネル構成オープニングの**ダイアログ・パネル (Pono とフクロウ博士の会話、5 枚)** で、Pono 画像 5 種のアスペクト比が 0.55〜0.81 とバラついているため、**コマごとのキャラクター見た目サイズが大きく違ってしまう**こと、そして**フクロウ博士が Pono に対して小さすぎる**ことが主問題。これに加え、**横が切れる (clip-path/overflow:hidden) のは禁止**、**ダイアログボックスは固定サイズかつ 16:9 では横長**、**解像度ごとにレイアウトを変える**という要件がある。次のデザイナーは、JS 契約 (パネルデータ構造、CSS クラス、PonoBabble 呼び出し) を保持しつつ、**ウェスト・ショット (腰から上) フレーミングでサイズが揃って見える**新しいビジュアル仕様を作ってほしい。

---

## 2. Project & file map

### Project overview
- **Repo:** `pono-asobiba-app` (子供向け Web 知育アプリ、純 JS / HTML / PWA、Cloudflare Workers 配信)
- **Quizland (なぞなぞ):** その中の 1 ゲーム
- **Single-file pages:** `quizland/index.html` (約 5200 行、インライン CSS + インライン JS)
- **Service Worker:** `sw.js` (変更時は CACHE_VERSION を必ずバンプ)
- **Babble engine:** `js/quizland-babble.js` (Web Audio による発話風シンセサイズ。年配フクロウ風の声を `'owl'` プリセットで、Pono 用に `'pono'` プリセットで鳴らす)

### File map (relative to repo root)

| Path | Role |
|---|---|
| `quizland/index.html` | The single page that defines DOM, inline CSS for `.op-cinematic`, and the JS function `playOpeningCinematic()`. **The only file the next implementation will edit.** |
| `js/quizland-babble.js` | Per-character synthesized voice (called by `_opTypeInto`). Do not modify. |
| `sw.js` | Bump `CACHE_VERSION` when assets / HTML change. Do not modify in this design pass — implementation phase only. |
| `assets/images/quizland/OP/` | Backgrounds + narration audio + final title card. |
| `assets/images/characters/pono/dance/` | 5 Pono variants used in panels 2〜6. |
| `assets/images/quizland/owl_professor_guide.webp` | Owl professor (はかせ) — single image, reused in all 5 dialogue panels. |
| `docs/STORY_OPENING_ENDING.md` | Existing copy / story document for opening narration. |
| `docs/NARRATION_KANJI_SCRIPT.md` | Existing kanji-fixing rules for narration. |
| `memory/feature_babble_voice.md` | Babble voice settings memo (recent change). |

### Where the cinematic lives in the user flow

```
Title screen tap
  → Mode select (難易度) tap
    → playOpeningCinematic()      ← THIS is the redesign target
        Panel 1  : Narration (BG: OP_BG, audio: OP_NA.wav, 2 segments of text)
        Panel 2  : Dialogue (BG: OP_BG02, hakase + pono)
        Panel 3  : Dialogue
        Panel 4  : Dialogue
        Panel 5  : Dialogue
        Panel 6  : Dialogue
    → Quiz Start title card  (separate component, uses quiz_start_card.webp)
      → Quiz UI (existing)
```

---

## 3. Current state & failed attempts (what NOT to do)

The user has already cycled through three approaches in `quizland/index.html`. The next designer should **not retry these without understanding why they failed**.

### Attempt 1 — `width: 78%` baseline
- **Idea:** Size both Pono and the owl by `width: 78%` of their container.
- **Why it failed:** Pono image aspects vary 0.55〜0.81 across the 5 variants. Width-based scaling means the *height* of the rendered character varies enormously (a tall narrow image becomes much taller than a square-ish one). The owl, sized by the same rule, also looked tiny next to Pono.
- **User feedback:** 「フクロウがちっちゃい / コマごとに大きさが違う」.

### Attempt 2 — `height: 180% / 120%` + frame `overflow:hidden`
- **Idea:** Anchor by *height* so the body height is uniform, oversize the image, and crop the frame with `overflow: hidden` to make a "waist-shot" effect.
- **Why it failed:** The owl's pointer/teaching stick reaches into the upper-left of its canvas. Side cropping made the pointer disappear. Pono images that have arms wide (`dance_hi`, `dance_hooray`) had their arm tips cut off.
- **User feedback (verbatim):** 「キャラクターの横が切れるのはダメ」 (Do **NOT** crop the sides).

### Attempt 3 (current) — `width 75 / 95%` + `clip-path: inset(35%/25%) bottom`
- **Idea:** Width-based sizing + bottom clipping to hide the lower body for a waist-shot.
- **Why it still fails:** Sizes still vary. In the `think_arms_crossed_side` panel Pono looks huge; in `dance_hi` Pono looks normal. The owl is still smaller than Pono. Clip-path is a *CSS* clip — content outside the clip is invisible — so it does not change perceived width but also doesn't address the underlying aspect-ratio inconsistency.
- **User feedback:** 「ちょっとひどいな。大きさがコマによって違いすぎる」 / 「はかせもちっちゃすぎるよ」.

### Common pattern across failures
All three attempts tried to solve a **per-asset metric (aspect ratio)** with a **single CSS rule**. Without normalizing the source assets, no single rule can produce uniform perceived size across 5 different aspect ratios. The next designer must address this head-on (see §8).

---

## 4. User's design intent (verbatim quotes + interpretation)

| Verbatim (Japanese) | Interpretation |
|---|---|
| 「ちょっとひどいな。大きさがコマによって違いすぎる」 | Perceived character size must be **consistent across panels 2〜6**. The user does not perceive aspect-ratio differences as intentional — they look like a bug. |
| 「はかせもちっちゃすぎるよ」 | The owl (はかせ) must read as a **co-equal speaker** with Pono. Not smaller, not pet-sized. Roughly equivalent body height. |
| 「キャラクターの横が切れるのはダメ」 | **Do NOT crop characters horizontally.** No `clip-path: inset(... left/right)`, no `overflow:hidden` that crops sides, no negative-margin tricks that hide arms / pointer. Bottom-cropping (waist-shot) is OK because the dialog box covers it. |
| 「テキストボックスは固定にして」 | Dialog boxes have **fixed dimensions** within a viewport class. They should not reflow / resize as text types in. Reserve the space at panel start. |
| 「16対9の時は横長にしてもらっていい？」 | On wide aspects (16:9 and beyond), the dialog boxes should become **more horizontally rectangular** rather than staying tall/square. |
| 「解像度ごとに、レイアウト変更することとかも含めて」 | Per-viewport-class layouts are explicitly in scope. The redesign is **not** "one layout that scales" — it can be 3〜4 distinct layouts gated by media queries. |
| (waist-shot framing, paraphrased) | Characters appear from the **waist up**. Lower body is hidden behind / below the dialog box. This sells the "they're standing behind a podium / table" reading. |

### Tone / mood (inferred from existing assets)
- BG (OP_BG02) is a warm wood-paneled study with bookshelves, fireplace, telescope. Cozy, slightly old-fashioned, scholarly.
- Owl wears a mortarboard and holds a green book + wooden pointer — clearly the *teacher* archetype.
- Pono is a soft teddy bear — clearly the *student* / *friend* archetype.
- The mood is calm-and-curious, not action-y. Layout should not be visually loud — text and faces should be the focus.

---

## 5. Hard constraints (JS contracts, asset paths, audio)

The redesign **must preserve** the following contracts. The implementation is a CSS / DOM-structure refactor, not a logic refactor.

### 5.1 Per-panel data structure (do not change shape)

```js
const OP_PANELS = [
  // Panel 1 — narration
  {
    kind: 'narration',
    bg: '../assets/images/quizland/OP/OP_BG.webp',
    audio: '../assets/images/quizland/OP/OP_NA.wav',
    segments: [
      { lines: [{ text: '…', emphasis: false }, { text: '…', emphasis: false }, { text: '…', emphasis: false }] },
      { lines: [{ text: '…', emphasis: true  }, { text: '…', emphasis: true  }] }
    ]
  },
  // Panels 2〜6 — dialogue
  {
    kind: 'dialogue',
    bg: '../assets/images/quizland/OP/OP_BG02.webp',
    ponoImg: '../assets/images/characters/pono/dance/<file>.webp',
    dialogues: [
      { speaker: 'hakase', text: '…' },
      { speaker: 'pono',   text: '…' }
    ]
  },
  …
];
```

### 5.2 Function-scoped state (top of `playOpeningCinematic`)

```js
let __opOrigBgm = null;       // BGM duck/restore
let __opNarrSrc = null;       // createMediaElementSource result
let __opNarrGain = null;      // narration gain node, level 0.65
let _opCancelled = false;     // skip flag
let _opTypingToken = 0;       // tick race-prevention
let _opActiveAudio = null;    // currently-playing audio element
```

The redesign should not require new globals. If any new state is needed, scope it the same way.

### 5.3 Typing function

```js
async function _opTypeInto(elId, text, presetName) {
  // For each char c in text:
  //   - append c to el.textContent
  //   - PonoBabble.playChar(c, presetName)   // 'owl' or 'pono'
  //   - sleep ~95ms
  // Auto-scroll: el.closest('.op-dialogue').scrollTop = scrollHeight
  // Bail-out: if (token !== _opTypingToken) return
}
```

The dialog box **must scroll to bottom** on each char append. This means the dialog box has internal overflow when text is long. The redesign must keep this property — design dialog boxes large enough that scrolling is rare, but allow for it.

### 5.4 Class toggles set by JS (CSS must define these)

| Class | Effect |
|---|---|
| `.op-cinematic` | Root layer. `z-index: 300`, full-viewport, opaque black background. |
| `.op-cinematic.hidden` | `display: none`. |
| `.op-bg` | The background image layer behind the panel. |
| `.op-bg.is-revealed` | Cross-fade in: opacity 0 → 1 on cinematic open. |
| `.op-bg.is-static-blur` | Apply a subtle blur (e.g. 5px) during dialogue panels. **Removed** during the narration panel (narration uses a clean BG). |
| `.op-dialogue` | A dialog box. Default state: opacity 0.55 (dim, not the active speaker). |
| `.op-dialogue.is-speaking` | Active speaker: opacity 1.0. |

The redesign can rename or split these, but if it does, the Implementation Notes section of the final spec must list every JS site that needs editing.

### 5.5 Skip handler (must keep working)

```js
function onSkip() {
  _opCancelled = true;
  _opTypingToken++;
  audio.pause(); audio.currentTime = 0;
  PonoBabble.cancelAll();
  // BGM restore (early path; finally is the safety net)
}
```

If a "Skip" button is part of the redesign, position it in a corner (top-right is conventional) and keep it visible/tappable across all viewport classes.

### 5.6 Audio
- `OP_NA.wav` (~838 KB, 17.45 s). Played at gain 0.65 during panel 1 only.
- Background music (`bgmGain` node, target volume 0.25) is ducked while narration plays, restored after panel 1 ends. (Source: `memory/audio-balance.md` per project memory.)
- Per-character babble fires for each typed char during dialogue (panels 2〜6) via `PonoBabble.playChar`.

### 5.7 Asset path conventions
- All paths in the panel data are **relative from `quizland/index.html`**, hence the `../assets/...` prefix.
- The redesign markup must continue to use this convention or the implementation must update both data and markup atomically.

---

## 6. Asset inventory

> Use these in the Claude Design canvas to reference real artwork. Aspect = `width / height`.

### 6.1 Backgrounds

| File | Dim | Size | Aspect | Visual notes |
|---|---|---|---|---|
| `assets/images/quizland/OP/OP_BG.webp` | 800 × 343 | ~96 KB | 2.33 | Forest exterior. Used for panel 1 narration. Wide-aspect, atmospheric. |
| `assets/images/quizland/OP/OP_BG02.webp` | 958 × 410 | ~45 KB | 2.34 | Owl's interior study: warm wood, bookshelves, fireplace, telescope, rug. Used for panels 2〜6. Wide-aspect. |

> Both BGs are wider than 16:9 already. On portrait viewports they will need to be `object-fit: cover` (and likely cropped) or `object-fit: contain` (and letterboxed top/bottom).

### 6.2 Owl professor (はかせ)

| File | Dim | Aspect | Notes |
|---|---|---|---|
| `assets/images/quizland/owl_professor_guide.webp` | 700 × 569 | 1.23 | Owl with mortarboard, green book, wooden teaching pointer. Pointer extends to the **upper-left** of the canvas. Body is roughly centered vertically. **Reused in every dialogue panel.** |

> Cropping consequences: side-clipping cuts the pointer. Bottom-clipping safely produces a waist/torso shot.

### 6.3 Pono variants (5 used in cinematic)

| File | Dim | Aspect | Pose / mood |
|---|---|---|---|
| `assets/images/characters/pono/dance/dance_hi.webp` | 513 × 633 | 0.81 | Arms spread wide, friendly greeting. **Wide silhouette.** |
| `assets/images/characters/pono/dance/dance_hooray.webp` | 500 × 635 | 0.79 | Both arms raised banzai. Tall but moderate width. |
| `assets/images/characters/pono/dance/dance_smile.webp` | 419 × 541 | 0.77 | Eyes closed, soft smile. Calm. |
| `assets/images/characters/pono/dance/think_arms_crossed_side.webp` | 358 × 652 | **0.55** | Arms crossed at angle. **Narrow, very tall silhouette.** |
| `assets/images/characters/pono/dance/think_chin_clasp.webp` | 365 × 650 | **0.56** | Paws clasped at chest. **Narrow, very tall silhouette.** |

> The **0.55 → 0.81 aspect spread** is the technical root cause of the size-inconsistency problem. See §8.

### 6.4 Title card (post-cinematic, separate component)

| File | Dim | Notes |
|---|---|---|
| `assets/images/quizland/OP/quiz_start_card.webp` | 1024 × 1536 | Owl + 「ふくろう博士の なぞなぞスタート!!」 large title art. **Out of scope for this redesign** — only listed for completeness. |

### 6.5 Audio

| File | Length | Notes |
|---|---|---|
| `assets/images/quizland/OP/OP_NA.wav` | 17.45 s, ~838 KB | Narration audio for panel 1. Gain 0.65. Total panel 1 duration must accommodate or exceed this. |

---

## 7. Per-resolution layout requirements

> The user explicitly asked for per-viewport-class layouts. Treat these as **separate visual designs**, not a single fluid layout.

### 7.1 Viewport class table

| Class | Aspect range | Examples | Layout intent |
|---|---|---|---|
| **A. Mobile portrait** | aspect ≤ 0.85 | iPhone SE 375×667, iPhone 13 390×844 | Compact, vertical stack. Characters smaller (height-bound). Dialog boxes can be near full-width. Narration text box reaches close to side margins. Consider stacking the two dialog boxes vertically (hakase top, pono bottom) since horizontal space is tight. |
| **B. Tablet / 4:3** | 0.85 < aspect ≤ 1.4 | iPad 1024×768 (1.33), iPad mini portrait | **Primary target.** Sides 50/50 split. Each character gets one half. Dialog box sits **under each character** (or shared band across the bottom). Waist-up framing reads naturally. |
| **C. Widescreen 16:9** | 1.4 < aspect ≤ 1.9 | 1920×1080 (1.78), 1366×768 (1.78), MacBook displays | **Dialog boxes become more horizontally rectangular** (per user). Two options: (a) characters at left/right, dialog boxes wider but shorter height in the lower band; (b) letterbox the cinematic to a 4:3 safe area centered, leaving black bars left/right. Both are acceptable — propose one with rationale. |
| **D. Ultra-wide 21:9+** | aspect > 1.9 | 2560×1080 (2.37), 3440×1440 (2.39) | **Letterbox** to a sane stage aspect (e.g. 16:9 or 4:3 inner stage). Do not stretch the layout horizontally — characters would float far apart and lose connection. |

### 7.2 What each class spec must include (deliverable per class)

For **each** of A / B / C / D, the redesign must specify:

1. **Stage / safe-area aspect.** Is the cinematic full-viewport, or does it letterbox to an inner stage? If letterbox, what aspect, and what fills the bars (solid black? blurred BG)?
2. **Dialog box geometry.** Width range (px or % with min/max), height range, padding, corner radius, position anchor (centered? aligned to character?). The boxes must be **fixed in size** (per user) — pre-allocated, not text-driven.
3. **Character placement.** Container size (px), anchor (which corner / center?), what part of the character is visible (waist-up means roughly the top 60〜70% of the source).
4. **Narration text box.** Panel 1 only. Size, position, max-width, line-height. Two segments transition — does the box reflow or do segments cross-fade in place?
5. **Skip button placement.** Top-right is the convention; confirm.

### 7.3 Orientation switching
- A user starting on iPad portrait (class B) and rotating to landscape (still class B at 1.33 → flips to 1.50, may move into class C) is a valid case. The redesign should specify whether layout swap mid-cinematic is allowed or whether layout is locked at panel start.

---

## 8. The size-consistency problem

### 8.1 The technical root cause

The 5 Pono images have different transparent-canvas crops:

| Image | Canvas | Aspect | Approx body height as % of canvas |
|---|---|---|---|
| dance_hi | 513×633 | 0.81 | ~95% (canvas tightly fit body) |
| dance_hooray | 500×635 | 0.79 | ~95% |
| dance_smile | 419×541 | 0.77 | ~95% |
| think_arms_crossed_side | 358×652 | 0.55 | ~98% (very tight crop, taller body) |
| think_chin_clasp | 365×650 | 0.56 | ~98% |

The two `think_*` variants have a **narrower canvas with a taller character inside**, while the `dance_*` variants have wider canvases. So when CSS sizes by `width: X%`, the `think_*` variants render with much greater pixel-height than `dance_*`. When CSS sizes by `height: Y%`, `dance_hi` renders much wider than `think_chin_clasp`.

**There is no single CSS rule on aspect-mismatched assets that produces uniform perceived size.**

### 8.2 Four approaches

#### Approach A — Re-export Pono assets onto a uniform canvas (RECOMMENDED structural fix)

- Re-export all 5 PNGs onto a fixed transparent canvas (e.g. **600 × 800**, aspect 0.75), with the character **bottom-anchored, horizontally centered**, and body height normalized to ~85% of canvas height.
- Then a single CSS rule works for all 5: `.op-char-pono { aspect-ratio: 600/800; height: 100%; object-fit: contain; object-position: bottom center; }`.
- The owl asset (700×569, aspect 1.23) should also be considered — re-export it onto a wider uniform canvas (e.g. **800 × 800** or **900 × 800**) so its pointer is preserved with safe margin and its aspect is consistent with Pono's.
- **Pros:** Correct fix. Future Pono variants slot in. Eliminates per-image CSS overrides. Solves the "owl is too small" problem because both characters become height-anchored to canvases of known proportions.
- **Cons:** Asset pipeline work. Increases file size slightly (more transparent area). Requires user confirmation.
- **Action item:** *Ask the user whether they will re-export the 5 Pono PNGs + the owl PNG to uniform canvases. If yes, this is the path. The redesign brief should specify the target canvas size.*

#### Approach B — Per-image CSS overrides

- For each Pono filename, a different `.op-char-pono[data-img="dance_hi"] { ... }` rule.
- **Pros:** No asset re-export.
- **Cons:** Tedious. Doesn't scale to new Pono variants. The variation we'd be encoding is essentially "fix the bad source asset in CSS" — strictly worse than fixing the asset.
- **Recommendation:** Avoid.

#### Approach C — JS-driven sizing

- On panel start, measure `naturalWidth` / `naturalHeight` of the loaded image, compute a target rendered height that yields constant body-height across panels, and set inline style.
- **Pros:** No asset re-export. Adapts to new images automatically.
- **Cons:** Adds runtime complexity. Race conditions with image load. Non-trivial to debug. Doesn't help with the owl/Pono ratio problem unless extended further.
- **Recommendation:** Use only if Approach A is rejected and Approach D proves insufficient.

#### Approach D — CSS `object-fit: contain` on a fixed-aspect container (CSS-only interim)

- Each character is rendered into a fixed-aspect container:

  ```text
  .op-char-slot {
    aspect-ratio: 1 / 1.5;     /* example */
    width: <viewport-class-specific value>;
  }
  .op-char-slot img {
    width: 100%; height: 100%;
    object-fit: contain;
    object-position: bottom center;
  }
  ```

- Combined with bottom-only clipping (e.g. masking the bottom 25〜30% behind the dialog box) for waist-shot.
- **Pros:** No asset re-export, no JS. Standard CSS. Eliminates per-image variance because the *slot* is the size, and `object-fit: contain` letterboxes the character inside the slot.
- **Cons:** Narrow-aspect Pono variants (`think_*`) will have visible empty space on the left/right inside their slot. This is *visually invisible* (transparent PNG against the BG) but means the *body* in `think_*` panels will appear **slightly smaller** than in `dance_*` panels because the body fits into the slot's height while leaving width slack. This is much less jarring than the current state, but still not perfect.
- **Recommendation:** **Use this as the interim CSS-only solution.** If user wants pixel-perfect uniformity later, escalate to Approach A.

### 8.3 Recommended path
1. **Ask the user about Approach A first** (asset re-export). It's the cleanest and produces the best result.
2. If declined or deferred, **specify Approach D** in the redesign with a fixed slot aspect (recommend ~0.75 = 3:4 to favor `think_*` proportions and make `dance_*` letterbox slightly into transparent slack).
3. Both approaches require the **owl to be sized in the same slot system** so the user's "はかせもちっちゃすぎる" complaint is addressed. The owl should occupy a slot of roughly equal *height* to Pono's slot.

---

## 9. Acceptance criteria

The redesigned layout is "done" when **all** of the following hold across panels 2〜6:

### 9.1 Visual / perceptual
- [ ] Across all 5 dialogue panels, **Pono's perceived body height is the same** (within ~5% tolerance to the eye). Specifically: panels using `think_arms_crossed_side` and `think_chin_clasp` do not look "bigger Pono" than panels using `dance_*` variants.
- [ ] **Owl reads as a co-equal speaker** with Pono — roughly equivalent body height in the frame, not noticeably smaller.
- [ ] **No horizontal cropping of either character** (no missing pointer on the owl, no missing arm tips on Pono).
- [ ] Waist-shot framing: lower body is hidden behind / below the dialog box.
- [ ] Both characters are clearly visible against the blurred OP_BG02 background.

### 9.2 Layout / responsive
- [ ] Distinct visual designs for each viewport class (A / B / C / D in §7.1).
- [ ] On 16:9 widescreen, dialog boxes are **horizontally rectangular** (wider than they are tall) per user request.
- [ ] On ultra-wide (>1.9), the cinematic is **letterboxed** to a sane stage aspect — characters do not float far apart.
- [ ] Dialog boxes have **fixed dimensions** (don't reflow as text types in).
- [ ] Active speaker's box is fully opaque (1.0); inactive box is dimmed (0.55).

### 9.3 Functional / contract preservation
- [ ] `OP_PANELS` data structure unchanged (or documented diff with migration notes for every JS site that reads from it).
- [ ] All class toggles (`.is-speaking`, `.is-static-blur`, `.is-revealed`, `.hidden`) work as before.
- [ ] Per-character typing still produces visible babble + auto-scroll-to-bottom inside the box.
- [ ] Skip button is visible and tappable in every viewport class.
- [ ] Narration panel (panel 1) layout is preserved or improved — narration text box must comfortably hold 3 lines (segment 1) and 2 emphasized lines (segment 2).

### 9.4 Implementation handoff quality
- [ ] Each viewport class spec lists exact CSS variables / breakpoints (e.g. `aspect-ratio` thresholds in `@media`).
- [ ] An asset re-export task list (if Approach A is chosen) with target canvas sizes.
- [ ] A list of every JS reference that may need updating (DOM IDs, class names) if the markup changes.

---

## 10. Out of scope

Do **not** touch / propose changes to:

- **`quizland/index.html` outside the cinematic block.** The quiz UI proper, the title screen, the difficulty selector, the rewards screen are all out of scope.
- **Quiz Start title card** (post-cinematic). It uses `quiz_start_card.webp` and is a separate component.
- **`sw.js`.** Implementation phase will bump `CACHE_VERSION`; the design phase does not edit it.
- **`js/quizland-babble.js`.** Voice synthesis is settled (see `memory/feature_babble_voice.md` — recently tuned to "elderly owl"). The design must keep calling `PonoBabble.playChar(c, 'owl' | 'pono')` per character but should not propose voice changes.
- **Narration audio file.** `OP_NA.wav` is fixed at 17.45s. Layout must accommodate that duration but cannot ask for re-recording.
- **The `OP_PANELS` text content.** Story copy is locked (see `docs/STORY_OPENING_ENDING.md` and `docs/NARRATION_KANJI_SCRIPT.md`).
- **Other Quizland features** (categories, scoring, persistence, rewards) — irrelevant.
- **PWA manifest, icons, splash screens.**
- **Cloudflare Workers config** (`wrangler.toml`, `worker/`).
- **Adding new assets beyond re-exports of existing characters.** No new BG art, no new character poses.

---

## Appendix — Asset paths quick reference (for Claude Design canvas)

```
Backgrounds:
  assets/images/quizland/OP/OP_BG.webp        (800x343,  panel 1)
  assets/images/quizland/OP/OP_BG02.webp      (958x410,  panels 2-6)

Owl (used in every dialogue panel):
  assets/images/quizland/owl_professor_guide.webp   (700x569, aspect 1.23)

Pono variants (one per dialogue panel):
  assets/images/characters/pono/dance/dance_hi.webp                 (513x633, 0.81)
  assets/images/characters/pono/dance/dance_hooray.webp             (500x635, 0.79)
  assets/images/characters/pono/dance/dance_smile.webp              (419x541, 0.77)
  assets/images/characters/pono/dance/think_arms_crossed_side.webp  (358x652, 0.55)
  assets/images/characters/pono/dance/think_chin_clasp.webp         (365x650, 0.56)

Audio:
  assets/images/quizland/OP/OP_NA.wav         (17.45s, narration)

Title card (out of scope, listed for context):
  assets/images/quizland/OP/quiz_start_card.webp   (1024x1536)
```

---

## Appendix — Key Japanese phrases the next designer should recognize

| 日本語 | English meaning |
|---|---|
| なぞなぞ | riddle / Quizland's game name |
| ふくろう博士 / はかせ | the owl professor character |
| Pono / ポノ | the teddy bear character |
| コマ | panel (in a comic-strip sense) |
| 横が切れる | "the sides are cut off" — horizontal cropping |
| テキストボックス固定 | "dialog box is fixed (in size)" |
| 横長 | horizontally rectangular / landscape-oriented |
| 解像度ごとに | "per resolution / per viewport" |
| ウェスト・ショット (paraphrased: 腰から上) | waist-up framing |
