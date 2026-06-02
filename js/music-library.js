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
  // STYLES — 5 arrangement presets. Drum beat positions are 0-indexed within a
  // 4/4 bar (0,1,2,3 == beats 1,2,3,4). hat ∈ eighths|quarters|offbeats|none.
  // ==========================================================================
  const STYLES = {
    // chiptune — mirrors the proven Path B chiptune arrangement.
    chiptune: {
      id: 'chiptune',
      label: 'チップチューン (Chiptune)',
      defaultBpm: 120,
      feel: 'straight',
      drum: {
        kick: [0, 2], snare: [1, 3], hat: 'eighths',
        gains: { kick: 1.0, snare: 0.7, hat: 0.32, master: 0.55 },
      },
      bass: { style: 'root-quarters', octaveShift: 0, timbre: 'triangle', gain: 0.40 },
      pad: { on: true, voicing: 'thin', timbre: 'square', gain: 0.10 },
      lead: { timbre: 'square', duty: 0.5, peak: 0.55, gain: 0.85 },
      master: { targetPeak: 0.84 },
    },

    // happy-pop — bright pop with full pad and bell-ish lead.
    'happy-pop': {
      id: 'happy-pop',
      label: 'ハッピーポップ (Happy Pop)',
      defaultBpm: 112,
      feel: 'straight',
      drum: {
        kick: [0, 2], snare: [1, 3], hat: 'eighths',
        gains: { kick: 1.0, snare: 0.7, hat: 0.30, master: 0.55 },
      },
      bass: { style: 'root-quarters', octaveShift: 0, timbre: 'triangle', gain: 0.42 },
      pad: { on: true, voicing: 'triad', timbre: 'square', gain: 0.14 },
      lead: { timbre: 'bell', duty: 0.5, peak: 0.55, gain: 0.82 },
      master: { targetPeak: 0.84 },
    },

    // kids-dance — energetic four-on-the-floor dance groove.
    'kids-dance': {
      id: 'kids-dance',
      label: 'キッズダンス (Kids Dance)',
      defaultBpm: 128,
      feel: 'straight',
      drum: {
        kick: [0, 1, 2, 3], snare: [1, 3], hat: 'offbeats',
        gains: { kick: 0.95, snare: 0.68, hat: 0.32, master: 0.55 },
      },
      bass: { style: 'root-fifth-alt', octaveShift: 0, timbre: 'triangle', gain: 0.42 },
      pad: { on: true, voicing: 'open5', timbre: 'square', gain: 0.12 },
      lead: { timbre: 'square', duty: 0.5, peak: 0.55, gain: 0.82 },
      master: { targetPeak: 0.84 },
    },

    // lullaby — gentle, sparse, no drums.
    lullaby: {
      id: 'lullaby',
      label: '子守唄 (Lullaby)',
      defaultBpm: 72,
      feel: 'straight',
      drum: {
        kick: [], snare: [], hat: 'none',
        gains: { kick: 0, snare: 0, hat: 0, master: 0 },
      },
      bass: { style: 'root-half', octaveShift: 0, timbre: 'sine', peak: 0.5, gain: 0.34 },
      pad: { on: true, voicing: 'triad', timbre: 'sine', gain: 0.16 },
      lead: { timbre: 'bell', duty: 0.5, peak: 0.5, gain: 0.85 },
      master: { targetPeak: 0.84 },
    },

    // march — steady marching feel with doubled snare and quarter hats.
    march: {
      id: 'march',
      label: 'マーチ (March)',
      defaultBpm: 100,
      feel: 'straight',
      drum: {
        kick: [0, 2], snare: [1, 3], snareDoubled: true, hat: 'quarters',
        gains: { kick: 1.0, snare: 0.66, hat: 0.30, master: 0.55 },
      },
      bass: { style: 'root-quarters', octaveShift: 0, timbre: 'triangle', gain: 0.42 },
      pad: { on: false, voicing: 'triad', timbre: 'square', gain: 0.10 },
      lead: { timbre: 'square', duty: 0.5, peak: 0.55, gain: 0.84 },
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
