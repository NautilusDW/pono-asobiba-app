# Babble Voice System (Quizland)

**Status:** Implemented (2026-05-07)  
**Last Updated:** 2026-05-07  
**Type:** Feature — Sound & UX  

---

## Overview

Quizland's "フクロウ博士" (HAKASE) character speaks with character-driven pseudo-voice "babble" — Animal Crossing style.  
Two features unified:
1. **Character-by-character typing** (typewriter effect, 105ms/char)
2. **Programmatic Web Audio synthesis** (no pre-recorded assets) with vowel formant variation

---

## Implementation Files

### Core Babble Engine
- **`js/quizland-babble.js`** (IIFE, ~150 lines)
  - Public API: `window.PonoBabble = { init(audioCtx), playChar(char, presetName), cancelAll(), presets }`
  - SKIP_RE: Whitespace, punctuation, zero-width joiners produce no sound
  - Preset system: `owl` (implemented), `pono` (stub), `hedgehog` (stub), `default` (fallback)

### Integration Point
- **`quizland/index.html`** → `setHakaseDialogue(text)`
  - Line ~2500: `_typingToken` race-prevention counter
  - Line ~2502: `const HAKASE_TYPING_DELAY_MS = 105` (tunable parameter)
  - Line ~2504: Character-by-character typewriter loop + `PonoBabble.playChar()` hook
  - Calls to `setHakaseDialogue()`: problem, hints, correct, wrong, detail, clear states

### Cache Invalidation
- **`sw.js`** — CACHE_VERSION bumped (e.g., 815 → 817 in deployment commit)

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
// → keys: 'owl', 'pono', 'hedgehog', 'default'
// → each value: { voice, wave, baseFreq, duration, formants, ... }
```

---

## Future Expansion

### Character-Specific Presets
- **Pono:** Bright triangle, energetic (stub, not yet integrated)
- **Hedgehog:** Mid-range (stub, future use)
- Other NPCs can have unique voice colors by adding presets and calling `playChar(char, 'npc-name')`

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
