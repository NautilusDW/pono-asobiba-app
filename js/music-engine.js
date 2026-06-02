// music-engine.js — Procedural music-arrangement engine for pono-asobiba-app.
//
// PURE functions only. NO DOM, NO Node fs/path. Runs identically in the browser
// and in Node (dual-load via the UMD-ish guard at the very bottom).
//
// The synthesis math (note->MIDI->freq, square LEAD, triangle BASS, square PAD,
// kick/snare/hat drums, the 44-byte WAV writer, mix+normalize-to-peak) is ported
// VERBATIM from the proven Path B renderer (kirakira_boshi/render_pathB.js) and
// the bell/music-box additive timbre from the mary / hotaru seed renderers, then
// generalized so the engine can render ANY melody in ANY style preset.
//
// Determinism: snare/hat use noise, so they take a SEEDED PRNG (mulberry32). Same
// inputs => byte-identical WAV output (critical for the byte-compare smoke test).
'use strict';

(function (root, factory) {
  const MusicEngine = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = MusicEngine;
  else if (typeof window !== 'undefined') window.MusicEngine = MusicEngine;
})(this, function () {

  const DEFAULT_SR = 44100;
  const DEFAULT_TAIL_SEC = 0.4;
  const DEFAULT_TARGET_PEAK = 0.84;

  // ==========================================================================
  // Note name -> MIDI number (C4 = 60) -> frequency (A4 = 440 Hz).
  // VERBATIM from render_pathB.js (identical regex/semantics in all 3 seeds).
  // ==========================================================================
  const SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function noteToMidi(name) {
    const m = /^([A-G])([#b]?)(-?\d+)$/.exec(name);
    if (!m) throw new Error('Bad note name: ' + name);
    let semi = SEMITONE[m[1]];
    if (m[2] === '#') semi += 1;
    else if (m[2] === 'b') semi -= 1;
    const octave = parseInt(m[3], 10);
    return semi + (octave + 1) * 12; // C4 -> 60
  }
  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12); // A4 = 440 Hz
  }
  function noteToFreq(name) {
    return midiToFreq(noteToMidi(name));
  }
  // midi -> "C4" style name (sharps). Used to transpose triads by octaveShift.
  const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function midiToNote(midi) {
    const pc = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return PC_NAMES[pc] + octave;
  }

  // ==========================================================================
  // Deterministic PRNG — mulberry32. Seeded so noise voices are reproducible.
  // ==========================================================================
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Music-box / bell additive timbre — partials VERBATIM from the seed renderers.
  const BELL_PARTIALS = [
    { mult: 1, gain: 1.0 },
    { mult: 2, gain: 0.5 },
    { mult: 3, gain: 0.25 },
    { mult: 4, gain: 0.12 },
  ];

  // ==========================================================================
  // LEAD voice. timbre ∈ {square, triangle, bell, sine}. duty/peak override the
  // Path-B defaults (duty 0.5, peak 0.55). Square branch is VERBATIM Path B.
  // ==========================================================================
  function renderLeadNote(freq, slotSec, timbre, sampleRate) {
    const sr = sampleRate || DEFAULT_SR;
    timbre = timbre || {};
    const kind = timbre.kind || 'square';
    const slotN = Math.max(1, Math.round(slotSec * sr));
    const buf = new Float32Array(slotN);

    // Sound for ~88% of the slot, leaving a small gap so notes articulate.
    const soundSec = slotSec * 0.88;
    const soundN = Math.max(1, Math.round(soundSec * sr));

    const attackSec = 0.006;
    const attackN = Math.max(1, Math.round(attackSec * sr));
    const releaseSec = 0.03;
    const releaseN = Math.max(1, Math.round(releaseSec * sr));
    const decayTau = Math.max(0.25, slotSec * 0.9); // gentle decay across the slot

    const duty = (typeof timbre.duty === 'number') ? timbre.duty : 0.5;
    const peak = (typeof timbre.peak === 'number') ? timbre.peak : 0.55;

    const bellGainSum = BELL_PARTIALS.reduce((s, p) => s + p.gain, 0);

    for (let i = 0; i < soundN; i++) {
      const t = i / sr;
      const phase = (freq * t) % 1;
      let s;
      if (kind === 'square') {
        s = phase < duty ? 1 : -1;
      } else if (kind === 'triangle') {
        s = 4 * Math.abs(phase - 0.5) - 1; // -1..1 triangle
      } else if (kind === 'sine') {
        s = Math.sin(2 * Math.PI * phase);
      } else { // bell — additive partials, normalized to ~1
        let acc = 0;
        for (const p of BELL_PARTIALS) acc += p.gain * Math.sin(2 * Math.PI * freq * p.mult * t);
        s = acc / bellGainSum;
      }

      // Amplitude envelope: linear attack, slow exp decay, linear release at end.
      let env;
      if (i < attackN) env = i / attackN;
      else env = Math.exp(-(t - attackSec) / decayTau);
      const fromEnd = soundN - i;
      if (fromEnd < releaseN) env *= fromEnd / releaseN;

      buf[i] = peak * env * s;
    }
    return buf;
  }

  // ==========================================================================
  // BASS voice — triangle (softer 8-bit low end). VERBATIM Path B math; timbre
  // lets a preset override peak / kind (defaults: triangle, peak 0.6).
  // ==========================================================================
  function renderBassNote(freq, durSec, timbre, sr) {
    sr = sr || DEFAULT_SR;
    timbre = timbre || {};
    const kind = timbre.kind || 'triangle';
    const peak = (typeof timbre.peak === 'number') ? timbre.peak : 0.6;
    const duty = (typeof timbre.duty === 'number') ? timbre.duty : 0.5;

    const slotN = Math.max(1, Math.round(durSec * sr));
    const buf = new Float32Array(slotN);
    const soundN = Math.max(1, Math.round(durSec * 0.9 * sr));
    const attackN = Math.max(1, Math.round(0.005 * sr));
    const releaseN = Math.max(1, Math.round(0.02 * sr));
    const decayTau = Math.max(0.3, durSec * 1.2);
    for (let i = 0; i < soundN; i++) {
      const t = i / sr;
      const phase = (freq * t) % 1;
      let s;
      if (kind === 'square') s = phase < duty ? 1 : -1;
      else if (kind === 'sine') s = Math.sin(2 * Math.PI * phase);
      else s = 4 * Math.abs(phase - 0.5) - 1; // triangle (default)
      let env;
      if (i < attackN) env = i / attackN;
      else env = Math.exp(-(t - 0.005) / decayTau);
      const fromEnd = soundN - i;
      if (fromEnd < releaseN) env *= fromEnd / releaseN;
      buf[i] = peak * env * s;
    }
    return buf;
  }

  // ==========================================================================
  // PAD voice — quiet sustained chord per bar. VERBATIM Path B square pad;
  // timbre.kind can switch to bell/sine/triangle for softer presets (lullaby).
  // ==========================================================================
  function renderPadChord(freqs, durSec, timbre, sr) {
    sr = sr || DEFAULT_SR;
    timbre = timbre || {};
    const kind = timbre.kind || 'square';
    const duty = (typeof timbre.duty === 'number') ? timbre.duty : 0.5;

    const n = Math.max(1, Math.round(durSec * sr));
    const buf = new Float32Array(n);
    const attackN = Math.max(1, Math.round(0.04 * sr));
    const releaseN = Math.max(1, Math.round(0.08 * sr));
    const bellGainSum = BELL_PARTIALS.reduce((s, p) => s + p.gain, 0);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let env = 1;
      if (i < attackN) env = i / attackN;
      const fromEnd = n - i;
      if (fromEnd < releaseN) env *= fromEnd / releaseN;
      let s = 0;
      for (const f of freqs) {
        const phase = (f * t) % 1;
        if (kind === 'square') s += phase < duty ? 1 : -1;
        else if (kind === 'sine') s += Math.sin(2 * Math.PI * phase);
        else if (kind === 'triangle') s += 4 * Math.abs(phase - 0.5) - 1;
        else { // bell
          let acc = 0;
          for (const p of BELL_PARTIALS) acc += p.gain * Math.sin(2 * Math.PI * f * p.mult * t);
          s += acc / bellGainSum;
        }
      }
      s /= freqs.length;
      buf[i] = env * s;
    }
    return buf;
  }

  // ==========================================================================
  // DRUMS — VERBATIM Path B. Snare/hat take a SEEDED PRNG so output is
  // reproducible (Math.random replaced by rng()).
  // ==========================================================================
  // Kick: sine 140Hz -> 50Hz pitch drop, ~0.12s exp decay.
  function renderKick(sr) {
    sr = sr || DEFAULT_SR;
    const dur = 0.12;
    const n = Math.round(dur * sr);
    const buf = new Float32Array(n);
    const f0 = 140, f1 = 50, tau = 0.05;
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const k = t / dur;
      const f = f0 + (f1 - f0) * k;          // linear pitch drop
      phase += (2 * Math.PI * f) / sr;
      const env = Math.exp(-t / tau);
      buf[i] = Math.sin(phase) * env;
    }
    return buf;
  }
  // Snare: noise + 200Hz tone, high-passed (1-pole diff), ~0.12s decay.
  function renderSnare(rng, sr) {
    sr = sr || DEFAULT_SR;
    const rand = rng || Math.random;
    const dur = 0.12;
    const n = Math.round(dur * sr);
    const raw = new Float32Array(n);
    const tau = 0.045;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const env = Math.exp(-t / tau);
      const noise = (rand() * 2 - 1);
      const tone = 0.4 * Math.sin(2 * Math.PI * 200 * t);
      raw[i] = (noise + tone) * env;
    }
    const buf = new Float32Array(n);
    let prev = 0;
    for (let i = 0; i < n; i++) { buf[i] = raw[i] - prev; prev = raw[i]; }
    return buf;
  }
  // Hi-hat: very short high-passed noise (~0.03s).
  function renderHat(rng, sr) {
    sr = sr || DEFAULT_SR;
    const rand = rng || Math.random;
    const dur = 0.03;
    const n = Math.round(dur * sr);
    const raw = new Float32Array(n);
    const tau = 0.012;
    for (let i = 0; i < n; i++) {
      raw[i] = (rand() * 2 - 1) * Math.exp(-(i / sr) / tau);
    }
    const buf = new Float32Array(n);
    let prev = 0;
    for (let i = 0; i < n; i++) { buf[i] = raw[i] - prev; prev = raw[i]; }
    return buf;
  }

  // ==========================================================================
  // Mix helpers — VERBATIM Path B.
  // ==========================================================================
  function clampBuf(buf) {
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] > 1) buf[i] = 1;
      else if (buf[i] < -1) buf[i] = -1;
    }
    return buf;
  }
  function mixInto(dst, src, at, gain) {
    const end = Math.min(dst.length, at + src.length);
    for (let i = at, j = 0; i < end; i++, j++) dst[i] += gain * src[j];
  }

  // ==========================================================================
  // Diatonic harmony tables (major key). Triads I ii iii IV V vi (skip vii°).
  // Degrees are semitone offsets from the tonic pitch-class.
  // ==========================================================================
  const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B (for C)
  // [degreeIndex, romanLabel]; triad = scale[deg], scale[deg+2], scale[deg+4].
  const DIATONIC_TRIADS = [
    { roman: 'I', degree: 0 },
    { roman: 'ii', degree: 1 },
    { roman: 'iii', degree: 2 },
    { roman: 'IV', degree: 3 },
    { roman: 'V', degree: 4 },
    { roman: 'vi', degree: 5 },
  ];

  function scaleDegreePc(tonicPc, degIndex) {
    const octaveBump = Math.floor(degIndex / 7);
    return (tonicPc + MAJOR_SCALE[degIndex % 7] + octaveBump * 12) % 12;
  }

  // Build a {root, triad} object in a comfortable mid octave for a given roman.
  // Root sits around octave 3, triad notes ascend from the root.
  function buildChordForDegree(tonicPc, degree) {
    const rootPc = scaleDegreePc(tonicPc, degree);
    const thirdPc = scaleDegreePc(tonicPc, degree + 2);
    const fifthPc = scaleDegreePc(tonicPc, degree + 4);
    // Place root in octave 3 (midi 48..59), then stack the triad upward.
    const rootMidi = 48 + rootPc; // C3=48
    const thirdMidi = rootMidi + ((thirdPc - rootPc + 12) % 12);
    const fifthMidi = rootMidi + ((fifthPc - rootPc + 12) % 12);
    return {
      root: midiToNote(rootMidi),
      triad: [midiToNote(rootMidi), midiToNote(thirdMidi), midiToNote(fifthMidi)],
      pcs: [rootPc, thirdPc, fifthPc],
      roman: DIATONIC_TRIADS.find(d => d.degree === degree).roman,
    };
  }

  // ==========================================================================
  // inferChords — per-bar chord detection from the melody.
  // Algorithm (per the design spec):
  //  - split melody into 4-beat bars via prefix-sum of `beats` (a note that
  //    straddles a bar line contributes its duration to the bar it starts in).
  //  - per bar build a pitch-class histogram weighted by note duration.
  //  - score each diatonic triad (I ii iii IV V vi) by sum of histogram weight
  //    on its 3 chord-tones + a small prior (tonic +0.15; dominant +0.10 at a
  //    cadence i.e. final bar).
  //  - bar 1 -> I; final bar -> V or I cadence; empty bar inherits previous.
  //  - heavily-chromatic melody -> fall back to I-IV-V-I rotation.
  // ==========================================================================
  function inferChords(melody, key) {
    key = key || 'C';
    const tonicPc = ((noteToMidi(key + '4') % 12) + 12) % 12;

    // 1) Bucket notes into 4-beat bars by prefix-sum of beats.
    const totalBeats = melody.reduce((s, ev) => s + (ev.beats || 0), 0);
    const numBars = Math.max(1, Math.ceil(totalBeats / 4));
    const histos = []; // histos[bar] = Float pitch-class histogram (len 12)
    const barWeight = [];
    for (let b = 0; b < numBars; b++) { histos.push(new Float64Array(12)); barWeight.push(0); }

    let acc = 0;
    let chromaticWeight = 0, totalWeight = 0;
    for (const ev of melody) {
      const beats = ev.beats || 0;
      const bar = Math.min(numBars - 1, Math.floor(acc / 4));
      const pc = ((noteToMidi(ev.note) % 12) + 12) % 12;
      histos[bar][pc] += beats;
      barWeight[bar] += beats;
      // Track chromaticism relative to the key for the fallback decision.
      if (!MAJOR_SCALE.includes(((pc - tonicPc) + 12) % 12)) chromaticWeight += beats;
      totalWeight += beats;
      acc += beats;
    }

    // Heavily-chromatic -> fall back to I-IV-V-I rotation.
    if (totalWeight > 0 && chromaticWeight / totalWeight > 0.4) {
      const rotation = [0, 3, 4, 0]; // I IV V I (degrees)
      const out = [];
      for (let b = 0; b < numBars; b++) {
        let deg;
        if (b === 0) deg = 0;
        else if (b === numBars - 1) deg = 0; // resolve to I at the end
        else deg = rotation[b % rotation.length];
        out.push(buildChordForDegree(tonicPc, deg));
      }
      return out;
    }

    // 2) Score each bar.
    const result = [];
    for (let b = 0; b < numBars; b++) {
      // Empty bar inherits the previous chord (or I if it's the first).
      if (barWeight[b] === 0) {
        result.push(result.length ? result[result.length - 1] : buildChordForDegree(tonicPc, 0));
        continue;
      }
      const h = histos[b];
      let best = null, bestScore = -Infinity;
      for (const dt of DIATONIC_TRIADS) {
        const chord = buildChordForDegree(tonicPc, dt.degree);
        // Base score: histogram weight on the 3 chord-tones. The ROOT counts
        // extra (x1.6) and the FIFTH a touch (x1.1) so a bar dominated by a
        // non-tonic chord-tone (e.g. F => IV) is not always swamped by the
        // tonic triad's incidental overlap. Third = x1.0.
        let score = h[chord.pcs[0]] * 1.6 + h[chord.pcs[1]] * 1.0 + h[chord.pcs[2]] * 1.1;
        // Small priors (tie-breakers only): the primary functions I/IV/V are
        // gently preferred over the secondary triads ii/iii/vi, because the
        // target repertoire (children's songs) is built on the I-IV-V skeleton.
        // These nudges only decide otherwise-equal scores; real evidence wins.
        if (dt.degree === 0) score += 0.08;                       // tonic
        if (dt.degree === 3) score += 0.06;                       // subdominant IV
        if (dt.degree === 4) score += 0.05;                       // dominant V
        if (dt.degree === 4 && b === numBars - 1) score += 0.20;  // V at cadence
        if (score > bestScore) { bestScore = score; best = chord; }
      }
      result.push(best);
    }

    // 3) Cadence shaping: bar 1 -> I; final bar -> V or I.
    result[0] = buildChordForDegree(tonicPc, 0);
    if (numBars > 1) {
      const lastDeg = (result[numBars - 1].roman === 'V') ? 4 : 0;
      result[numBars - 1] = buildChordForDegree(tonicPc, lastDeg);
    }
    return result;
  }

  // ==========================================================================
  // renderArrangement — full mix. The LEAD reproduces the melody pitches AND
  // durations EXACTLY (the lead is laid on the exact beat grid, identical math
  // to Path B). Drums/bass/pad are driven by the style pattern + inferred chords.
  // ==========================================================================
  function renderArrangement(opts) {
    const melody = opts.melody;
    const style = opts.style;
    // Hard-guard bpm against 0/NaN/negative so QUARTER_SEC stays finite & > 0.
    const bpm = Math.max(1, Number(opts.bpm) || (style && style.defaultBpm) || 120);
    const key = opts.key || 'C';
    const sr = opts.sampleRate || DEFAULT_SR;

    const QUARTER_SEC = 60 / bpm;
    const beatN = Math.round(QUARTER_SEC * sr);
    const eighthN = Math.round((QUARTER_SEC / 2) * sr);

    const totalBeats = melody.reduce((s, ev) => s + (ev.beats || 0), 0);
    const numBars = Math.max(1, Math.ceil(totalBeats / 4));

    // ONE shared integer beat grid for drum/bass/pad placement. It must cover
    // the whole song even when totalBeats is fractional (e.g. Auld Lang Syne =
    // 39.5) AND span every full bar, so the last (possibly partial) beat's
    // backing hits are not truncated by an integer `totalBeats` loop bound.
    const gridBeats = Math.max(Math.ceil(totalBeats), numBars * 4);
    // Each beat's sample offset is computed from FRACTIONAL seconds so all
    // backing tracks share exactly the lead's accumulation grid (the lead lays
    // notes by round(slotSec*sr)); this removes integer-beat drift on dotted
    // songs while staying aligned with the lead's onsets.
    const beatOffsetN = (beat) => Math.round(beat * QUARTER_SEC * sr);

    const tailN = Math.round(DEFAULT_TAIL_SEC * sr);
    // Buffer length envelope: keep the integer beatN multiple (Path-B identical
    // length) but extend it to the full integer grid so the final beat fits.
    // gridBeats >= numBars*4 so this never shrinks the prior envelope.
    const totalN = gridBeats * beatN + tailN;

    const lead = new Float32Array(totalN);
    const drums = new Float32Array(totalN);
    const bass = new Float32Array(totalN);
    const pad = new Float32Array(totalN);

    const chords = inferChords(melody, key);

    // ---- LEAD: lay notes sequentially on the exact slot grid (Path B). The
    // onset of note i is the accumulated round(slotSec*sr) of all prior notes,
    // so pitches AND durations are preserved bit-for-bit.
    const leadTimbre = {
      kind: style.lead.timbre,
      duty: style.lead.duty,
      peak: style.lead.peak,
    };
    const leadOnsets = []; // sample offsets, for fidelity assertion
    let leadOff = 0;
    for (let i = 0; i < melody.length; i++) {
      const { note, beats } = melody[i];
      const slotSec = beats * QUARTER_SEC;
      const freq = noteToFreq(note);
      const noteBuf = renderLeadNote(freq, slotSec, leadTimbre, sr);
      mixInto(lead, noteBuf, leadOff, 1.0);
      leadOnsets.push({ at: leadOff, freq, note });
      leadOff += Math.round(slotSec * sr);
    }

    // ---- DRUMS: driven by style.drum pattern (kick/snare beat positions + hat).
    const drum = style.drum || {};
    const drumGains = drum.gains || {};
    if (drum.kick && drum.kick.length || drum.snare && drum.snare.length || (drum.hat && drum.hat !== 'none')) {
      // Seeded PRNG so snare/hat noise is reproducible -> byte-identical WAV.
      const rng = mulberry32((opts.seed != null ? opts.seed : 0x9E3779B1) >>> 0);
      const kick = renderKick(sr);
      const snare = renderSnare(rng, sr);
      const hat = renderHat(rng, sr);
      const kickSet = new Set(drum.kick || []);
      const snareSet = new Set(drum.snare || []);
      const gKick = (typeof drumGains.kick === 'number') ? drumGains.kick : 1.0;
      const gSnare = (typeof drumGains.snare === 'number') ? drumGains.snare : 0.7;
      const gHat = (typeof drumGains.hat === 'number') ? drumGains.hat : 0.32;
      // Loop over the full integer grid so the song's final (possibly partial)
      // beat is covered. beatStart uses the shared fractional offset so drums
      // line up with the lead's accumulation. mixInto already clips writes that
      // run past the buffer end, so the last beat near the tail stays in bounds.
      for (let beat = 0; beat < gridBeats; beat++) {
        const beatStart = beatOffsetN(beat);
        const posInBar = beat % 4;
        if (kickSet.has(posInBar)) mixInto(drums, kick, beatStart, gKick);
        if (snareSet.has(posInBar)) {
          mixInto(drums, snare, beatStart, gSnare);
          if (drum.snareDoubled) mixInto(drums, snare, beatStart + eighthN, gSnare * 0.7);
        }
        if (drum.hat === 'eighths') {
          mixInto(drums, hat, beatStart, gHat);
          mixInto(drums, hat, beatStart + eighthN, gHat * 0.8);
        } else if (drum.hat === 'quarters') {
          mixInto(drums, hat, beatStart, gHat);
        } else if (drum.hat === 'offbeats') {
          mixInto(drums, hat, beatStart + eighthN, gHat);
        }
      }
    }

    // ---- BASS: per-bar root / root-fifth-alt depending on bass.style.
    const bassCfg = style.bass || {};
    if (bassCfg.style && bassCfg.style !== 'none') {
      const octaveShift = bassCfg.octaveShift || 0;
      const bassTimbre = { kind: bassCfg.timbre || 'triangle', peak: bassCfg.peak };
      for (let bar = 0; bar < numBars; bar++) {
        const chord = chords[bar] || chords[chords.length - 1];
        const rootMidi = noteToMidi(chord.root) + 12 * octaveShift;
        const fifthMidi = noteToMidi(chord.triad[2]) + 12 * octaveShift;
        const rootFreq = midiToFreq(rootMidi);
        const fifthFreq = midiToFreq(fifthMidi);
        if (bassCfg.style === 'root-half') {
          const at = beatOffsetN(bar * 4);
          mixInto(bass, renderBassNote(rootFreq, 2 * QUARTER_SEC, bassTimbre, sr), at, 1.0);
          mixInto(bass, renderBassNote(rootFreq, 2 * QUARTER_SEC, bassTimbre, sr), beatOffsetN(bar * 4 + 2), 1.0);
        } else {
          for (let b = 0; b < 4; b++) {
            const at = beatOffsetN(bar * 4 + b);
            let f = rootFreq;
            if (bassCfg.style === 'root-fifth-alt') f = (b % 2 === 0) ? rootFreq : fifthFreq;
            mixInto(bass, renderBassNote(f, QUARTER_SEC, bassTimbre, sr), at, 1.0);
          }
        }
      }
    }

    // ---- PAD: one sustained chord per bar (if enabled). voicing controls notes.
    const padCfg = style.pad || {};
    if (padCfg.on) {
      const padTimbre = { kind: padCfg.timbre || 'square', duty: padCfg.duty };
      for (let bar = 0; bar < numBars; bar++) {
        const chord = chords[bar] || chords[chords.length - 1];
        let voiceNotes;
        if (padCfg.voicing === 'open5') {
          voiceNotes = [chord.triad[0], chord.triad[2]]; // root + fifth
        } else if (padCfg.voicing === 'thin') {
          voiceNotes = [chord.triad[0], chord.triad[2]]; // sparse root+fifth
        } else {
          voiceNotes = chord.triad; // full triad
        }
        const freqs = voiceNotes.map(noteToFreq);
        const barSec = 4 * QUARTER_SEC;
        mixInto(pad, renderPadChord(freqs, barSec, padTimbre, sr), beatOffsetN(bar * 4), 1.0);
      }
    }

    // ---- MIX with per-track gains (lead on top), then normalize to targetPeak.
    const gLead = (style.lead && typeof style.lead.gain === 'number') ? style.lead.gain : 0.85;
    const gDrum = drumGains.master != null ? drumGains.master : 0.55;
    const gBass = (typeof bassCfg.gain === 'number') ? bassCfg.gain : 0.40;
    const gPad = (typeof padCfg.gain === 'number') ? padCfg.gain : 0.10;
    const mix = new Float32Array(totalN);
    for (let i = 0; i < totalN; i++) {
      mix[i] = gLead * lead[i] + gDrum * drums[i] + gBass * bass[i] + gPad * pad[i];
    }

    const targetPeak = (style.master && typeof style.master.targetPeak === 'number')
      ? style.master.targetPeak : DEFAULT_TARGET_PEAK;
    let peak = 0;
    for (let i = 0; i < totalN; i++) { const a = Math.abs(mix[i]); if (a > peak) peak = a; }
    if (peak > 0) {
      const scale = peak > targetPeak ? targetPeak / peak : 1;
      for (let i = 0; i < totalN; i++) mix[i] *= scale;
    }
    clampBuf(mix);

    return {
      samples: mix,
      meta: {
        durationSec: mix.length / sr,
        totalBeats,
        numBars,
        sampleRate: sr,
        bpm,
        key,
        leadOnsets, // [{at, freq, note}] — exposed for fidelity verification
        chords,
      },
    };
  }

  // ==========================================================================
  // melodyToChart — taiko don/ka chart matching play.html RHYTHM_SONGS schema.
  // Bar downbeats / strong beats -> 'don'; offbeats / snare positions -> 'ka'.
  // times = absolute seconds (beatIndex * QUARTER_SEC), 2-dp rounded, sorted asc.
  // ==========================================================================
  function melodyToChart(melody, opts) {
    opts = opts || {};
    const bpm = opts.bpm || 120;
    const QUARTER_SEC = 60 / bpm;
    const totalBeats = melody.reduce((s, ev) => s + (ev.beats || 0), 0);

    // Map each melody onset to the nearest beat, classify by beat position.
    const notes = [];
    let acc = 0;
    for (const ev of melody) {
      const beatIndex = Math.round(acc);
      const posInBar = ((beatIndex % 4) + 4) % 4;
      // Strong beats (downbeat & beat 3) -> don; weak beats (2 & 4) -> ka.
      const type = (posInBar === 0 || posInBar === 2) ? 'don' : 'ka';
      const time = Math.round(beatIndex * QUARTER_SEC * 100) / 100;
      notes.push({ time, type });
      acc += (ev.beats || 0);
    }

    // Dedupe identical (time,type) collisions then sort ascending by time.
    const seen = new Set();
    const out = [];
    for (const n of notes) {
      const k = n.time + ':' + n.type;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(n);
    }
    out.sort((a, b) => a.time - b.time);
    return { notes: out, meta: { totalBeats, bpm } };
  }

  // ==========================================================================
  // encodeWav — 44-byte LE RIFF/PCM/mono header + int16 samples, via DataView
  // over an ArrayBuffer (NOT Node Buffer) so it runs identically everywhere.
  // ==========================================================================
  function encodeWav(samples, sampleRate) {
    const sr = sampleRate || DEFAULT_SR;
    const numSamples = samples.length;
    const bytesPerSample = 2;
    const numChannels = 1;
    const dataSize = numSamples * bytesPerSample;
    const ab = new ArrayBuffer(44 + dataSize);
    const dv = new DataView(ab);

    function writeStr(off, str) {
      for (let i = 0; i < str.length; i++) dv.setUint8(off + i, str.charCodeAt(i));
    }

    writeStr(0, 'RIFF');
    dv.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    dv.setUint32(16, 16, true);                       // Subchunk1Size (PCM)
    dv.setUint16(20, 1, true);                        // AudioFormat = PCM
    dv.setUint16(22, numChannels, true);              // mono
    dv.setUint32(24, sr, true);                       // sample rate
    dv.setUint32(28, sr * numChannels * bytesPerSample, true); // byte rate
    dv.setUint16(32, numChannels * bytesPerSample, true);      // block align
    dv.setUint16(34, 16, true);                       // bits per sample
    writeStr(36, 'data');
    dv.setUint32(40, dataSize, true);

    let p = 44;
    for (let i = 0; i < numSamples; i++) {
      let v = Math.round(samples[i] * 32767);
      if (v > 32767) v = 32767;
      else if (v < -32768) v = -32768;
      dv.setInt16(p, v, true);
      p += 2;
    }
    return ab;
  }

  // ==========================================================================
  // Public API surface (the stable contract the UI agent builds against).
  // ==========================================================================
  return {
    // note math
    noteToMidi, midiToFreq, noteToFreq, midiToNote,
    // voices
    renderLeadNote, renderBassNote, renderPadChord,
    renderKick, renderSnare, renderHat,
    // harmony + arrangement
    inferChords, renderArrangement, melodyToChart,
    // io
    encodeWav,
    // utilities / tables for tests
    mulberry32, SEMITONE, DIATONIC_TRIADS, MAJOR_SCALE,
  };
});
