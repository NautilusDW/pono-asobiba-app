// music-library.js — DATA only for the procedural music-arrangement engine.
//
// Contains STYLE presets and public-domain MELODY note arrays. The melody note
// arrays are copied VERBATIM from the proven seed/Path-B renderers so the tunes
// are guaranteed unchanged:
//   - twinkle        : kirakira_boshi/render_pathB.js (42 notes, BPM 96, key C)
//   - mary           : mary_san_no_hitsuji/render_seed.js (BPM 110, key C)
//   - auld_lang_syne : hotaru_no_hikari/render_seed.js (BPM 76, key C)
//
// NO DOM, NO Node fs/path. Dual-load (browser + Node) via the guard at the bottom.
'use strict';

(function (root, factory) {
  const MusicLibrary = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = MusicLibrary;
  else if (typeof window !== 'undefined') window.MusicLibrary = MusicLibrary;
})(this, function () {

  // ==========================================================================
  // MELODIES — verbatim public-domain note arrays.
  // ==========================================================================
  const q = 1, h = 2;

  // --- きらきら星 / Twinkle Twinkle — VERBATIM from render_pathB.js ---
  const twinkleMelody = [
    // Phrase 1
    { note: 'C4', beats: q }, { note: 'C4', beats: q }, { note: 'G4', beats: q }, { note: 'G4', beats: q },
    { note: 'A4', beats: q }, { note: 'A4', beats: q }, { note: 'G4', beats: h },
    { note: 'F4', beats: q }, { note: 'F4', beats: q }, { note: 'E4', beats: q }, { note: 'E4', beats: q },
    { note: 'D4', beats: q }, { note: 'D4', beats: q }, { note: 'C4', beats: h },
    // Phrase 2
    { note: 'G4', beats: q }, { note: 'G4', beats: q }, { note: 'F4', beats: q }, { note: 'F4', beats: q },
    { note: 'E4', beats: q }, { note: 'E4', beats: q }, { note: 'D4', beats: h },
    { note: 'G4', beats: q }, { note: 'G4', beats: q }, { note: 'F4', beats: q }, { note: 'F4', beats: q },
    { note: 'E4', beats: q }, { note: 'E4', beats: q }, { note: 'D4', beats: h },
    // Phrase 3 (reprise of phrase 1)
    { note: 'C4', beats: q }, { note: 'C4', beats: q }, { note: 'G4', beats: q }, { note: 'G4', beats: q },
    { note: 'A4', beats: q }, { note: 'A4', beats: q }, { note: 'G4', beats: h },
    { note: 'F4', beats: q }, { note: 'F4', beats: q }, { note: 'E4', beats: q }, { note: 'E4', beats: q },
    { note: 'D4', beats: q }, { note: 'D4', beats: q }, { note: 'C4', beats: h },
  ];

  // --- メリーさんのひつじ / Mary Had a Little Lamb — VERBATIM from mary render_seed.js ---
  const maryMelody = [
    // Phrase 1: Ma-ry had a lit-tle lamb
    { note: 'E4', beats: 1 },
    { note: 'D4', beats: 1 },
    { note: 'C4', beats: 1 },
    { note: 'D4', beats: 1 },
    { note: 'E4', beats: 1 },
    { note: 'E4', beats: 1 },
    { note: 'E4', beats: 2 },   // (h)
    // Phrase 2: lit-tle lamb
    { note: 'D4', beats: 1 },
    { note: 'D4', beats: 1 },
    { note: 'D4', beats: 2 },   // (h)
    // Phrase 3: lit-tle lamb (E G G)
    { note: 'E4', beats: 1 },
    { note: 'G4', beats: 1 },
    { note: 'G4', beats: 2 },   // (h)
    // Phrase 4: Ma-ry had a lit-tle lamb, its fleece was white as snow
    { note: 'E4', beats: 1 },
    { note: 'D4', beats: 1 },
    { note: 'C4', beats: 1 },
    { note: 'D4', beats: 1 },
    { note: 'E4', beats: 1 },
    { note: 'E4', beats: 1 },
    { note: 'E4', beats: 1 },
    { note: 'E4', beats: 1 },
    { note: 'D4', beats: 1 },
    { note: 'D4', beats: 1 },
    { note: 'E4', beats: 1 },
    { note: 'D4', beats: 1 },
    { note: 'C4', beats: 4 },   // (whole)
  ];

  // --- 蛍の光 / Auld Lang Syne — VERBATIM from hotaru render_seed.js ---
  const auldLangSyneMelody = [
    // ----- VERSE LINE 1 -----
    { note: 'G3', beats: 1 },      // Should (pickup)
    { note: 'C4', beats: 1.5 },    // auld
    { note: 'C4', beats: 0.5 },    // ac-
    { note: 'C4', beats: 1 },      // quain-
    { note: 'E4', beats: 1 },      // tance
    { note: 'D4', beats: 1.5 },    // be
    { note: 'C4', beats: 0.5 },    // for-
    { note: 'D4', beats: 1 },      // got,
    { note: 'E4', beats: 1 },      // and
    { note: 'C4', beats: 1.5 },    // ne-
    { note: 'C4', beats: 0.5 },    // ver
    { note: 'E4', beats: 1 },      // brought
    { note: 'G4', beats: 1 },      // to
    { note: 'A4', beats: 3 },      // mind?  (held)
    // ----- VERSE LINE 2 -----
    { note: 'A4', beats: 1 },      // Should (pickup)
    { note: 'G4', beats: 1.5 },    // auld
    { note: 'E4', beats: 0.5 },    // ac-
    { note: 'E4', beats: 1 },      // quain-
    { note: 'G4', beats: 1 },      // tance
    { note: 'D4', beats: 1.5 },    // be
    { note: 'C4', beats: 0.5 },    // for-
    { note: 'D4', beats: 1 },      // got,
    { note: 'E4', beats: 1 },      // and
    { note: 'C4', beats: 1.5 },    // days
    { note: 'C4', beats: 0.5 },    // of
    { note: 'A3', beats: 1 },      // auld
    { note: 'G3', beats: 1 },      // lang
    { note: 'C4', beats: 3 },      // syne?  (held tonic)
    // ----- REPRISE TAG -----
    { note: 'G3', beats: 1 },      // (Should)
    { note: 'C4', beats: 1.5 },    // auld
    { note: 'C4', beats: 0.5 },    // ac-
    { note: 'C4', beats: 1 },      // quain-
    { note: 'E4', beats: 1 },      // tance
    { note: 'D4', beats: 1.5 },    // be
    { note: 'C4', beats: 0.5 },    // for-
    { note: 'D4', beats: 1 },      // got,
    { note: 'E4', beats: 1 },      // and
    { note: 'C4', beats: 3 },      // (resolve) final held tonic
  ];

  const MELODIES = {
    twinkle: {
      id: 'twinkle',
      label: 'きらきら星 (Twinkle Twinkle)',
      defaultBpm: 96,
      defaultKey: 'C',
      melody: twinkleMelody,
    },
    mary: {
      id: 'mary',
      label: 'メリーさんのひつじ (Mary Had a Little Lamb)',
      defaultBpm: 110,
      defaultKey: 'C',
      melody: maryMelody,
    },
    auld_lang_syne: {
      id: 'auld_lang_syne',
      label: '蛍の光 (Auld Lang Syne)',
      defaultBpm: 76,
      defaultKey: 'C',
      melody: auldLangSyneMelody,
    },
  };

  // ==========================================================================
  // STYLES — arrangement presets (v2). Drum beat positions are 0-indexed within
  // a 4/4 bar (0,1,2,3 == beats 1,2,3,4). hat ∈ eighths|quarters|offbeats|none.
  //
  // v2 fields (all optional; absent => v1 behaviour for that aspect):
  //   stereo:{on,width}                — final-stage stereo mixdown.
  //   reverb:{on,wet,send:{lead,pad},decay,predelayMs} — Schroeder reverb send.
  //   lead:{...,adsr,vibrato,layer}    — lead timbre depth (onset pitch exact).
  //   comp:{mode,subdiv,gain,timbre,voicing} — comping layer (replaces pad when
  //                                     present; mode 'auto' follows section
  //                                     intensity). mode ∈ sustain|arp|broken|stab.
  //   bass:{pattern,...}               — pattern ∈ none|root-half|root-quarters|
  //                                     root-fifth-alt|octave-bounce|walking-simple.
  //   sectionProfile:[i1,i2,i3,i4]     — per-section intensity ramp (1..4).
  //   fills:bool                       — snare/tom fill at the last bar of a
  //                                     section (intensity>=3).
  //   intro:{bars}                     — bars of intro before the lead enters.
  //   outro:{heldChord,crash}          — held tonic chord + optional crash tail.
  // ==========================================================================
  const STYLES = {
    // chiptune — bright 8-bit; arp-8 comp, octave-bounce bass, fills, wide image.
    chiptune: {
      id: 'chiptune',
      label: 'チップチューン (Chiptune)',
      defaultBpm: 120,
      feel: 'straight',
      drum: {
        kick: [0, 2], snare: [1, 3], hat: 'eighths',
        gains: { kick: 1.0, snare: 0.7, hat: 0.32, master: 0.55 },
      },
      bass: { pattern: 'octave-bounce', octaveShift: 0, timbre: 'triangle', gain: 0.40 },
      comp: { mode: 'auto', subdiv: 8, gain: 0.13, timbre: { kind: 'square', duty: 0.25 }, voicing: 'triad+oct' },
      lead: {
        timbre: 'square', duty: 0.5, peak: 0.55, gain: 0.85,
        vibrato: { rateHz: 6.0, depthCents: 6, delaySec: 0.10 },
        layer: { detuneCents: 8, octave: 0, gain: 0.18 },
      },
      stereo: { on: true, width: 0.6 },
      reverb: { on: true, wet: 0.22, send: { lead: 0.16, pad: 0.26 }, decay: 0.6, predelayMs: 18 },
      sectionProfile: [1, 2, 3, 4],
      fills: true,
      intro: { bars: 0 },
      outro: { heldChord: true, crash: true },
      master: { targetPeak: 0.84 },
    },

    // happy-pop — bright pop; arp+add9 comp, bell+octave lead layer, 1-bar intro.
    'happy-pop': {
      id: 'happy-pop',
      label: 'ハッピーポップ (Happy Pop)',
      defaultBpm: 112,
      feel: 'straight',
      drum: {
        kick: [0, 2], snare: [1, 3], hat: 'eighths',
        gains: { kick: 1.0, snare: 0.7, hat: 0.30, master: 0.55 },
      },
      bass: { pattern: 'root-quarters', octaveShift: 0, timbre: 'triangle', gain: 0.42 },
      comp: { mode: 'auto', subdiv: 8, gain: 0.15, timbre: { kind: 'square', duty: 0.5 }, voicing: 'add9' },
      lead: {
        timbre: 'bell', duty: 0.5, peak: 0.55, gain: 0.82,
        vibrato: { rateHz: 5.5, depthCents: 8, delaySec: 0.09 },
        layer: { detuneCents: 0, octave: 1, gain: 0.16 },
      },
      stereo: { on: true, width: 0.65 },
      reverb: { on: true, wet: 0.28, send: { lead: 0.20, pad: 0.30 }, decay: 0.7, predelayMs: 20 },
      sectionProfile: [1, 2, 3, 4],
      fills: true,
      intro: { bars: 1 },
      outro: { heldChord: true, crash: true },
      master: { targetPeak: 0.84 },
    },

    // kids-dance — four-on-the-floor; stab comp, root-fifth bass, 1-bar intro.
    'kids-dance': {
      id: 'kids-dance',
      label: 'キッズダンス (Kids Dance)',
      defaultBpm: 128,
      feel: 'straight',
      drum: {
        kick: [0, 1, 2, 3], snare: [1, 3], hat: 'offbeats',
        gains: { kick: 0.95, snare: 0.68, hat: 0.32, master: 0.55 },
      },
      bass: { pattern: 'root-fifth-alt', octaveShift: 0, timbre: 'triangle', gain: 0.42 },
      comp: { mode: 'stab', subdiv: 8, gain: 0.14, timbre: { kind: 'square', duty: 0.5 }, voicing: 'open5' },
      lead: {
        timbre: 'square', duty: 0.5, peak: 0.55, gain: 0.82,
        vibrato: { rateHz: 6.5, depthCents: 5, delaySec: 0.10 },
        layer: { detuneCents: 10, octave: 0, gain: 0.16 },
      },
      stereo: { on: true, width: 0.7 },
      reverb: { on: true, wet: 0.18, send: { lead: 0.12, pad: 0.22 }, decay: 0.5, predelayMs: 14 },
      sectionProfile: [1, 2, 3, 4],
      fills: true,
      intro: { bars: 1 },
      outro: { heldChord: true, crash: true },
      master: { targetPeak: 0.84 },
    },

    // lullaby — gentle, sine timbres, broken-chord comp, NO drums, flat-low
    // profile so it stays soft, longer reverb, no crash.
    lullaby: {
      id: 'lullaby',
      label: '子守唄 (Lullaby)',
      defaultBpm: 72,
      feel: 'straight',
      drum: {
        kick: [], snare: [], hat: 'none',
        gains: { kick: 0, snare: 0, hat: 0, master: 0 },
      },
      bass: { pattern: 'root-half', octaveShift: 0, timbre: 'sine', peak: 0.5, gain: 0.34 },
      comp: { mode: 'broken', subdiv: 4, gain: 0.16, timbre: { kind: 'sine', peak: 0.7 }, voicing: 'triad' },
      lead: {
        timbre: 'bell', duty: 0.5, peak: 0.5, gain: 0.85,
        vibrato: { rateHz: 5.0, depthCents: 6, delaySec: 0.12 },
      },
      stereo: { on: true, width: 0.5 },
      reverb: { on: true, wet: 0.34, send: { lead: 0.24, pad: 0.30 }, decay: 0.85, predelayMs: 24 },
      sectionProfile: [2, 2, 2, 2], // flat LOW profile — stays soft, no big ramp
      fills: false,
      intro: { bars: 0 },
      outro: { heldChord: true, crash: false },
      master: { targetPeak: 0.84 },
    },

    // march — steady; doubled snare, walking bass, punchy/dry (reverb off).
    march: {
      id: 'march',
      label: 'マーチ (March)',
      defaultBpm: 100,
      feel: 'straight',
      drum: {
        kick: [0, 2], snare: [1, 3], snareDoubled: true, hat: 'quarters',
        gains: { kick: 1.0, snare: 0.66, hat: 0.30, master: 0.55 },
      },
      bass: { pattern: 'walking-simple', octaveShift: 0, timbre: 'triangle', gain: 0.42 },
      comp: { mode: 'auto', subdiv: 8, gain: 0.11, timbre: { kind: 'square', duty: 0.5 }, voicing: 'triad' },
      lead: {
        timbre: 'square', duty: 0.5, peak: 0.55, gain: 0.84,
        vibrato: { rateHz: 5.5, depthCents: 4, delaySec: 0.10 },
      },
      stereo: { on: true, width: 0.45 },
      reverb: { on: false, wet: 0, send: { lead: 0, pad: 0 }, decay: 0.5, predelayMs: 10 },
      sectionProfile: [2, 3, 3, 4],
      fills: true,
      intro: { bars: 0 },
      outro: { heldChord: true, crash: true },
      master: { targetPeak: 0.84 },
    },

    // minimal — ROLLBACK ANCHOR. Reproduces v1-ish mono: stereo off, reverb off,
    // comp sustain (v1 pad), bass root-quarters, flat profile [3,3,3,3] (full
    // density everywhere, no development), no intro/outro, v1 lead envelope (no
    // adsr/vibrato/layer).
    minimal: {
      id: 'minimal',
      label: 'ミニマル (Minimal / v1)',
      defaultBpm: 120,
      feel: 'straight',
      drum: {
        kick: [0, 2], snare: [1, 3], hat: 'eighths',
        gains: { kick: 1.0, snare: 0.7, hat: 0.32, master: 0.55 },
      },
      bass: { pattern: 'root-quarters', octaveShift: 0, timbre: 'triangle', gain: 0.40 },
      comp: { mode: 'sustain', subdiv: 8, gain: 0.10, timbre: { kind: 'square', duty: 0.5 }, voicing: 'thin' },
      lead: { timbre: 'square', duty: 0.5, peak: 0.55, gain: 0.85 },
      stereo: { on: false, width: 0 },
      reverb: { on: false, wet: 0, send: { lead: 0, pad: 0 }, decay: 0.5, predelayMs: 0 },
      sectionProfile: [3, 3, 3, 3],
      fills: false,
      intro: { bars: 0 },
      outro: { heldChord: false, crash: false },
      master: { targetPeak: 0.84 },
    },
  };

  return {
    MELODIES,
    STYLES,
    MELODY_KEYS: Object.keys(MELODIES),
    STYLES_KEYS: Object.keys(STYLES),
  };
});
