# Babble Voice System (Quizland)

**Status:** Implemented (2026-05-07), scope narrowed to OP cinematic only (2026-05-07), kurumi preset added (2026-05-11)
**Last Updated:** 2026-05-11
**Type:** Feature — Sound & UX

---

## Overview

Quizland uses programmatic "babble" pseudo-voice (Animal Crossing style) **only during the opening cinematic** for narrative dialogue between Pono, the owl professor, and the squirrel assistant Kurumi. **In-game quiz dialogue (problem text, hints, correct/wrong feedback, etc.) is silent and instant** — the owl does NOT chat character-by-character during gameplay.

Why the scope split: in the main quiz body the kid is reading the problem, considering hints, and parsing feedback — having the owl "speaking" each character is intrusive and slows their thinking. The babble + typewriter combo is reserved for the cinematic moments where character voice IS the content (introductions, story beats).

Two features still bundled (cinematic only):
1. **Character-by-character typing** (typewriter effect, ~95ms/char in cinematic)
2. **Programmatic Web Audio synthesis** (no pre-recorded assets) with vowel formant variation

---

## Implementation Files

### Core Babble Engine (unchanged scope)
- **`js/quizland-babble.js`** (IIFE, ~150 lines)
  - Public API: `window.PonoBabble = { init(audioCtx), playChar(char, presetName), cancelAll(), presets }`
  - SKIP_RE: Whitespace, punctuation, zero-width joiners produce no sound
  - Preset system: `owl` (full voice path), `pono` (simple chirp), `hedgehog` (simple chirp), **`kurumi` (お姉さん感のある女声 chirp)**, `default` (fallback)

### Integration Points

#### Opening Cinematic (uses babble + typewriter)
- **`quizland/index.html`** → `_opTypeInto(elId, text, presetName)` inside `playOpeningCinematic`
  - Separate from in-game dialogue — uses its own race-prevention counter `_opTypingToken`
  - ~95ms/char tick, calls `PonoBabble.playChar(c, 'owl' | 'pono' | 'kurumi')` per character
  - Active during dialogue panels (panels 2-6) of the opening cinematic only
  - Speaker → preset mapping (~L6139): `presetForLine = isHakase ? 'owl' : (isKurumi ? 'kurumi' : 'pono')`

#### In-Game Quiz Dialogue (instant, no babble)
- **`quizland/index.html`** → `setHakaseDialogue(text)` (around line 2777)
  - **Reverted to instant `el.textContent = text`** as of 2026-05-07
  - No typewriter, no `PonoBabble.playChar()` call
  - Calls `PonoBabble.cancelAll()` defensively to silence any leaked babble from the cinematic
  - Removed: `_typingToken` counter and `HAKASE_TYPING_DELAY_MS` constant (no longer needed)
  - Used by 9 call sites: problem display, hints, correct, wrong, detail, clear states, etc.

### Cache Invalidation
- **`sw.js`** — CACHE_VERSION bumped on each deployment touching cinematic or babble code

---

## Owl Preset Specification

**Voice Profile:** Elderly grandfather (confirmed user preference)

**Synthesis Algorithm:**
- **Oscillators:** Sawtooth + Triangle (sub-octave, -1200 cents) for chest resonance
- **Base Pitch:** 160 Hz (low, settled)
- **Glide:** -50 Hz downward inflection (語尾下降)
- **Duration:** 120 ms (slower, weightier than playful presets)
- **Envelope:** Attack 16ms / Release 90ms (vocal cord ramp-up)
- **Gain:** 0.10 post-filter

**Formants (Vowel-like Resonance):**
- **Filter:** Biquad bandpass, Q=8
- **5 Candidates:** u(720Hz) / o(850Hz) / a(950Hz) / e(1100Hz) / i(1250Hz)
- **Selection:** Deterministic by character index (mod 5)
- **Formant Spread:** ±180 Hz random jitter per character (natural variation)

**Articulation:**
- **Tremolo/Vibrato:** LFO 6.2 Hz, depth 5.5 Hz (elderly tremor band)
- **Pitch Spread:** ±26 Hz relative to base (dialect accent)

---

## Kurumi Preset Specification (added 2026-05-11)

**Voice Profile:** Bright, gentle big-sister voice (お姉さん感) for the squirrel assistant Kurumi.

**Synthesis:**
- **Wave:** Triangle (柔らかいトーン)
- **Base Pitch:** 450 Hz — sits between owl (160) and pono (520), giving a warm mid-female feel
- **Glide:** +35 Hz (upward inflection, energetic)
- **Duration:** 80 ms
- **Envelope:** Attack 6ms / Release 48ms
- **Gain:** 0.13 (peakGain)
- **Pitch Spread:** ±30 Hz random jitter per character

**Used by:** Panel 2 (こんにちは、ポノさん！) and Panel 5 (はーい、まかせて！) of the OP cinematic. See `memory/feature_quizland_kurumi.md` for the full character + dialogue spec.

---

## API Contract

```javascript
// Initialize once per page (idempotent)
PonoBabble.init(audioContext);

// Play single character with voice color
PonoBabble.playChar(char, presetName);
// → if char matches SKIP_RE, no sound
// → oscillators and filters start/stop cleanly (onended cleanup)

// Cancel all in-flight sounds (called before new dialogue)
PonoBabble.cancelAll();
// → calls stop() on all active oscillators, gains
// → clears internal node references

// Preset definitions (read-only)
PonoBabble.presets
// → keys: 'owl', 'pono', 'hedgehog', 'kurumi', 'default'
// → each value: { voice, wave, baseFreq, duration, formants, ... }
```

---

## Future Expansion

### Character-Specific Presets
- **Owl (博士):** Full voice path (sawtooth + triangle + 5 母音フォルマント + LFO)、 OP cinematic で稼働中
- **Pono:** Bright triangle chirp, OP cinematic で稼働中 (Panel 2-6 の pono speaker line)
- **Kurumi (リスのくるみちゃん):** お姉さん感のある女声 chirp, OP cinematic で稼働中 (Panel 2 / 5 の kurumi speaker line)。詳細は上記「Kurumi Preset Specification」と `memory/feature_quizland_kurumi.md` を参照
- **Hedgehog:** Mid-range chirp (stub、 quizland では未使用、 他ゲーム流用待ち)
- 新 NPC を増やすときは preset を追加して `playChar(char, 'npc-name')` を呼ぶだけ。 owl のような voice path を使うかは音色要件次第 (現状 owl のみ voice:true)

### User Preferences
- **Typing Speed:** Adjust `HAKASE_TYPING_DELAY_MS` (currently 105ms → smooth but readable)
- **Babble Volume:** Scale `peakGain` per preset (currently 0.10 post-filter)
- **Formant Range:** Expand vowel set or tone (currently 5 fixed candidates)

---

## Related Areas

- **Dialogue Management:** `quizland/index.html` state machine (problem → hint1 → hint2 → correct/wrong/clear)
- **Audio Context Lifecycle:** Shared via `window.audioCtx` (initialized by `narration.js`)
- **Cache Busting:** `sw.js` CACHE_VERSION must bump after any babble.js changes

---

## Quality Notes

- **No External Audio Files:** Synthesis runs at runtime, no bandwidth cost.
- **Voice Profiles Deterministic:** Same character input always produces same pitch/formant (replayability).
- **Performance:** Per-character node cleanup prevents audio context runaway.
- **Accessibility:** SKIP_RE filters silence punctuation; legible even without sound.
