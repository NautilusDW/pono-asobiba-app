// music-engine.js — Procedural music-arrangement engine for pono-asobiba-app (v2).
//
// PURE functions only. NO DOM, NO Node fs/path. Runs identically in the browser
// and in Node (dual-load via the UMD-ish guard at the very bottom).
//
// The core synthesis math (note->MIDI->freq, square LEAD, triangle BASS, square
// PAD, kick/snare/hat drums, the WAV writer, mix+normalize-to-peak) is ported
// VERBATIM from the proven Path B renderer (kirakira_boshi/render_pathB.js) and
// the bell/music-box additive timbre from the mary / hotaru seed renderers, then
// generalized so the engine can render ANY melody in ANY style preset.
//
// v2 adds (WITHOUT changing the main melody):
//   - Final-stage STEREO mixdown (constant-power pan; per-track MONO synthesis).
//   - Deterministic Schroeder REVERB as a send on lead + pad/comp.
//   - Lead timbre depth: optional ADSR, post-onset vibrato, detuned layer.
//   - Accompaniment richness: comping layer (arp/broken/stab), fuller diatonic
//     voicings, bass patterns (octave-bounce, walking-simple, ...).
//   - Development: sections w/ intensity ramp, drum fills, intro/outro.
//
// Determinism: snare/hat/fills use noise, so they take a SEEDED PRNG (mulberry32)
// drawn in a FIXED order. Same {melody,style,bpm,key,seed} => byte-identical WAV.
// No Math.random in the audible path.
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
  const BELL_GAIN_SUM = BELL_PARTIALS.reduce((s, p) => s + p.gain, 0);

  // Single-sample oscillator helper (phase in cycles, 0..1). Used by all voices
  // so the per-kind waveform math stays identical everywhere.
  function oscSample(kind, phase, duty, freq, t) {
    if (kind === 'square') return phase < duty ? 1 : -1;
    if (kind === 'triangle') return 4 * Math.abs(phase - 0.5) - 1;
    if (kind === 'sine') return Math.sin(2 * Math.PI * phase);
    // bell — additive partials, normalized to ~1 (needs absolute freq*t).
    let acc = 0;
    for (const p of BELL_PARTIALS) acc += p.gain * Math.sin(2 * Math.PI * freq * p.mult * t);
    return acc / BELL_GAIN_SUM;
  }

  // ==========================================================================
  // LEAD voice. timbre ∈ {square, triangle, bell, sine}. duty/peak override the
  // Path-B defaults (duty 0.5, peak 0.55). The square branch reproduces Path B
  // when no v2 timbre extras (adsr/vibrato/layer) are supplied.
  //
  // v2 extras (all opt-in; ABSENT => exact v1 envelope & onset pitch):
  //   timbre.adsr={a,d,s,r}  — replaces the v1 exp-decay envelope.
  //   timbre.vibrato={rateHz,depthCents,delaySec} — pitch FM applied ONLY after
  //       delaySec (ramped in), so the ONSET pitch is EXACTLY `freq`.
  //   timbre.layer={detuneCents,octave,gain} — a quiet 2nd oscillator for body.
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

    // --- v2 ADSR (opt-in). a/d/r in seconds, s in 0..1 sustain level.
    const adsr = timbre.adsr || null;
    let aN = 0, dN = 0, rN = 0, sLvl = 1;
    if (adsr) {
      aN = Math.max(1, Math.round((adsr.a || 0.006) * sr));
      dN = Math.max(0, Math.round((adsr.d || 0.0) * sr));
      rN = Math.max(1, Math.round((adsr.r || 0.03) * sr));
      sLvl = (typeof adsr.s === 'number') ? adsr.s : 1;
    }

    // --- v2 vibrato (opt-in). Onset stays exact freq: depth ramps in AFTER delay.
    const vib = timbre.vibrato || null;
    let vibDelayN = 0, vibRate = 0, vibDepthRatio = 0, vibRampN = 0;
    if (vib) {
      vibRate = vib.rateHz || 5.5;
      vibDepthRatio = (vib.depthCents || 0) / 1200; // exponent base for 2^()
      const vibDelaySec = (typeof vib.delaySec === 'number') ? vib.delaySec : 0.08;
      vibDelayN = Math.max(0, Math.round(vibDelaySec * sr));
      vibRampN = Math.max(1, Math.round(0.04 * sr)); // 40ms ramp once vibrato starts
    }

    // --- v2 detuned layer (opt-in). 2nd oscillator, quiet.
    const layer = timbre.layer || null;
    let layerFreq = 0, layerGain = 0;
    if (layer) {
      const detune = (layer.detuneCents || 0) / 1200;
      const oct = layer.octave || 0;
      layerFreq = freq * Math.pow(2, oct + detune);
      layerGain = Math.min(0.4, (typeof layer.gain === 'number') ? layer.gain : 0.2);
    }

    // Phase accumulators (vibrato changes instantaneous freq, so integrate phase).
    let phaseAcc = 0;      // main osc, cycles
    let layerPhaseAcc = 0; // layer osc, cycles
    const dtCycMain = freq / sr;
    const dtCycLayer = layerFreq / sr;

    for (let i = 0; i < soundN; i++) {
      const t = i / sr;

      // ---- instantaneous main frequency (vibrato). EXACT freq until vibDelayN.
      let fMain = freq;
      if (vib && i >= vibDelayN) {
        const since = i - vibDelayN;
        const ramp = since < vibRampN ? since / vibRampN : 1;
        const mod = Math.sin(2 * Math.PI * vibRate * (since / sr));
        fMain = freq * Math.pow(2, vibDepthRatio * ramp * mod);
      }

      // Phase for the main oscillator. For bell we still need absolute freq*t, so
      // when there is no vibrato keep phase = (freq*t)%1 (exact v1). With vibrato,
      // integrate the (slightly modulated) phase.
      let phase, sMain;
      if (vib) {
        phase = phaseAcc % 1;
        if (phase < 0) phase += 1;
        sMain = oscSample(kind, phase, duty, fMain, t);
        phaseAcc += fMain / sr;
      } else {
        phase = (freq * t) % 1;
        sMain = oscSample(kind, phase, duty, freq, t);
      }

      let s = sMain;
      if (layer) {
        let lphase;
        if (vib) { lphase = layerPhaseAcc % 1; if (lphase < 0) lphase += 1; layerPhaseAcc += layerFreq / sr; }
        else lphase = (layerFreq * t) % 1;
        s += layerGain * oscSample(kind, lphase, duty, layerFreq, t);
        s /= (1 + layerGain); // keep peak ~1 so onset level matches v1 closely
      }

      // ---- amplitude envelope.
      let env;
      if (adsr) {
        if (i < aN) env = i / aN;
        else if (i < aN + dN) env = 1 + (sLvl - 1) * ((i - aN) / Math.max(1, dN));
        else env = sLvl;
        const fromEnd = soundN - i;
        if (fromEnd < rN) env *= fromEnd / rN;
      } else {
        // EXACT v1 envelope.
        if (i < attackN) env = i / attackN;
        else env = Math.exp(-(t - attackSec) / decayTau);
        const fromEnd = soundN - i;
        if (fromEnd < releaseN) env *= fromEnd / releaseN;
      }

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
      const s = oscSample(kind, phase, duty, freq, t);
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
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let env = 1;
      if (i < attackN) env = i / attackN;
      const fromEnd = n - i;
      if (fromEnd < releaseN) env *= fromEnd / releaseN;
      let s = 0;
      for (const f of freqs) {
        const phase = (f * t) % 1;
        s += oscSample(kind, phase, duty, f, t);
      }
      s /= freqs.length;
      buf[i] = env * s;
    }
    return buf;
  }

  // ==========================================================================
  // COMP chord-hit — a single short/medium chord articulation used by the comping
  // layer for stab/broken/arp. Like the pad but with a tighter envelope so it
  // reads as a rhythmic comp, not a wash. durSec controls the hit length.
  // ==========================================================================
  function renderCompChord(freqs, durSec, timbre, sr) {
    sr = sr || DEFAULT_SR;
    timbre = timbre || {};
    const kind = timbre.kind || 'square';
    const duty = (typeof timbre.duty === 'number') ? timbre.duty : 0.5;
    const peak = (typeof timbre.peak === 'number') ? timbre.peak : 0.9;

    const slotN = Math.max(1, Math.round(durSec * sr));
    const buf = new Float32Array(slotN);
    const soundN = Math.max(1, Math.round(durSec * 0.92 * sr));
    const attackN = Math.max(1, Math.round(0.004 * sr));
    const releaseN = Math.max(1, Math.round(0.03 * sr));
    const decayTau = Math.max(0.12, durSec * 0.8);
    for (let i = 0; i < soundN; i++) {
      const t = i / sr;
      let env;
      if (i < attackN) env = i / attackN;
      else env = Math.exp(-(t - 0.004) / decayTau);
      const fromEnd = soundN - i;
      if (fromEnd < releaseN) env *= fromEnd / releaseN;
      let s = 0;
      for (const f of freqs) {
        const phase = (f * t) % 1;
        s += oscSample(kind, phase, duty, f, t);
      }
      s /= freqs.length;
      buf[i] = peak * env * s;
    }
    return buf;
  }

  // ==========================================================================
  // DRUMS — VERBATIM Path B. Snare/hat take a SEEDED PRNG so output is
  // reproducible (Math.random replaced by rng()).
  // ==========================================================================
  // Kick: sine 140Hz -> 50Hz pitch drop, ~0.12s exp decay. pitchScale lets a fill
  // reuse this as a "tom" (>1 raises the pitch); default 1 == verbatim Path B.
  function renderKick(sr, pitchScale) {
    sr = sr || DEFAULT_SR;
    const ps = pitchScale || 1;
    const dur = 0.12;
    const n = Math.round(dur * sr);
    const buf = new Float32Array(n);
    const f0 = 140 * ps, f1 = 50 * ps, tau = 0.05;
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
    const rand = rng || mulberry32(0x9e3779b9); // deterministic default (never Math.random) so determinism can't silently break
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
    const rand = rng || mulberry32(0x9e3779b9); // deterministic default (never Math.random) so determinism can't silently break
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
  // Crash: longer bright noise (~0.6s) for outro/section accents.
  function renderCrash(rng, sr) {
    sr = sr || DEFAULT_SR;
    const rand = rng || mulberry32(0x9e3779b9); // deterministic default (never Math.random) so determinism can't silently break
    const dur = 0.6;
    const n = Math.round(dur * sr);
    const raw = new Float32Array(n);
    const tau = 0.22;
    for (let i = 0; i < n; i++) {
      raw[i] = (rand() * 2 - 1) * Math.exp(-(i / sr) / tau);
    }
    const buf = new Float32Array(n);
    let prev = 0;
    for (let i = 0; i < n; i++) { buf[i] = raw[i] - prev * 0.7; prev = raw[i]; }
    return buf;
  }

  // ==========================================================================
  // applyReverb — deterministic Schroeder reverb (4 parallel feedback combs +
  // 2 series allpass). Output is WET only. No randomness; integer delays.
  // params: { sr, decay, predelayMs }. Hard caps keep it from blowing up.
  // ==========================================================================
  function applyReverb(input, sr, params) {
    sr = sr || DEFAULT_SR;
    params = params || {};
    const decay = (typeof params.decay === 'number') ? params.decay : 0.7;
    const predelayMs = (typeof params.predelayMs === 'number') ? params.predelayMs : 20;
    const scale = sr / 44100;

    const combDelays = [1557, 1617, 1491, 1422].map(d => Math.max(1, Math.round(d * scale)));
    const allpassDelays = [225, 556].map(d => Math.max(1, Math.round(d * scale)));
    const g = Math.min(0.89, 0.78 * decay); // hard-cap < 0.9 (anti-blowup)
    const apG = 0.7;

    const N = input.length;
    const predelayN = Math.max(0, Math.round((predelayMs / 1000) * sr));

    // Pre-delayed input feeding the combs.
    // --- 4 parallel feedback combs, summed, then ×0.25.
    const combSum = new Float32Array(N);
    for (let c = 0; c < combDelays.length; c++) {
      const D = combDelays[c];
      const buf = new Float32Array(D); // circular comb buffer
      let idx = 0;
      for (let i = 0; i < N; i++) {
        const srcIdx = i - predelayN;
        const x = srcIdx >= 0 ? input[srcIdx] : 0;
        const y = buf[idx];
        let v = x + g * y;
        if (!isFinite(v)) v = 0; // NaN/Inf guard
        buf[idx] = v;
        combSum[i] += y;
        idx++; if (idx >= D) idx = 0;
      }
    }
    for (let i = 0; i < N; i++) combSum[i] *= 0.25;

    // --- 2 series allpass filters.
    let cur = combSum;
    for (let a = 0; a < allpassDelays.length; a++) {
      const D = allpassDelays[a];
      const out = new Float32Array(N);
      const buf = new Float32Array(D);
      let idx = 0;
      for (let i = 0; i < N; i++) {
        const bufOut = buf[idx];
        const x = cur[i];
        let v = x + apG * bufOut;     // allpass internal state
        if (!isFinite(v)) v = 0;
        buf[idx] = v;
        let y = -apG * v + bufOut;    // allpass output
        if (!isFinite(y)) y = 0;
        out[i] = y;
        idx++; if (idx >= D) idx = 0;
      }
      cur = out;
    }
    // Final NaN/Inf scrub.
    for (let i = 0; i < N; i++) if (!isFinite(cur[i])) cur[i] = 0;
    return cur;
  }

  // ==========================================================================
  // Mix helpers — VERBATIM Path B (mono), plus constant-power pan for stereo.
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
  // Constant-power pan: add `src*gain` into left/right with cos/sin law.
  // pan ∈ [-1,1] (-1 = full left, +1 = full right).
  function panInto(left, right, src, gain, pan) {
    const theta = (pan + 1) * Math.PI / 4;
    const gL = Math.cos(theta), gR = Math.sin(theta);
    const N = src.length;
    const lim = Math.min(left.length, N);
    for (let i = 0; i < lim; i++) {
      const v = gain * src[i];
      left[i] += gL * v;
      right[i] += gR * v;
    }
  }

  // ==========================================================================
  // Diatonic harmony tables (major key). Triads I ii iii IV V vi (skip vii°).
  // Degrees are semitone offsets from the tonic pitch-class.
  // ==========================================================================
  const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B (for C)
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
  // Absolute MIDI for a scale degree relative to a root MIDI (handles octaves).
  function scaleDegreeMidiFromRoot(tonicPc, rootMidi, rootDeg, addDeg) {
    const targetPc = scaleDegreePc(tonicPc, rootDeg + addDeg);
    // climb upward from rootMidi to the nearest pc >= rootMidi by addDeg-ish steps
    const rootPc = ((rootMidi % 12) + 12) % 12;
    let semi = (targetPc - rootPc + 12) % 12;
    // each scale step adds roughly 2 semitones; force monotonic ascension by
    // bumping octaves for higher degrees.
    const octBump = Math.floor((rootDeg + addDeg) / 7) - Math.floor(rootDeg / 7);
    return rootMidi + semi + 12 * octBump;
  }

  // Build a chord object for a roman degree, with FULLER voicing options.
  // Root sits around octave 3, chord notes ascend from the root. The voicing
  // param chooses which color tones to include. Color tones are DIATONIC (built
  // from scale degrees) and are gated by caller (no add9/6/sus on V at cadence).
  function buildChordForDegree(tonicPc, degree, voicing) {
    const rootPc = scaleDegreePc(tonicPc, degree);
    const thirdPc = scaleDegreePc(tonicPc, degree + 2);
    const fifthPc = scaleDegreePc(tonicPc, degree + 4);
    const rootMidi = 48 + rootPc; // C3=48
    const thirdMidi = rootMidi + ((thirdPc - rootPc + 12) % 12);
    const fifthMidi = rootMidi + ((fifthPc - rootPc + 12) % 12);

    const triadMidis = [rootMidi, thirdMidi, fifthMidi];
    let voiceMidis = triadMidis.slice();

    switch (voicing) {
      case 'triad':
        voiceMidis = triadMidis.slice();
        break;
      case 'triad+oct':
        voiceMidis = triadMidis.concat([rootMidi + 12]);
        break;
      case 'open5':
        voiceMidis = [rootMidi, fifthMidi];
        break;
      case 'thin':
        voiceMidis = [rootMidi, fifthMidi];
        break;
      case 'add9': {
        const ninth = scaleDegreeMidiFromRoot(tonicPc, rootMidi, degree, 1) + 12; // 2nd up an octave
        voiceMidis = triadMidis.concat([ninth]);
        break;
      }
      case 'sus2': {
        const second = rootMidi + ((scaleDegreePc(tonicPc, degree + 1) - rootPc + 12) % 12);
        voiceMidis = [rootMidi, second, fifthMidi];
        break;
      }
      case 'six': {
        const sixth = rootMidi + ((scaleDegreePc(tonicPc, degree + 5) - rootPc + 12) % 12);
        voiceMidis = triadMidis.concat([sixth]);
        break;
      }
      default:
        voiceMidis = triadMidis.slice();
    }

    return {
      root: midiToNote(rootMidi),
      triad: [midiToNote(rootMidi), midiToNote(thirdMidi), midiToNote(fifthMidi)],
      voice: voiceMidis.map(midiToNote),       // chosen voicing notes (low->high)
      voiceMidis,
      triadMidis,
      degree,
      pcs: [rootPc, thirdPc, fifthPc],
      roman: DIATONIC_TRIADS.find(d => d.degree === degree).roman,
    };
  }

  // ==========================================================================
  // inferChords — per-bar chord detection from the melody. (UNCHANGED from v1
  // except it now also stamps a default 'triad' voicing on each chord.)
  // ==========================================================================
  function inferChords(melody, key) {
    key = key || 'C';
    const tonicPc = ((noteToMidi(key + '4') % 12) + 12) % 12;

    const totalBeats = melody.reduce((s, ev) => s + (ev.beats || 0), 0);
    const numBars = Math.max(1, Math.ceil(totalBeats / 4));
    const histos = [];
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
      if (!MAJOR_SCALE.includes(((pc - tonicPc) + 12) % 12)) chromaticWeight += beats;
      totalWeight += beats;
      acc += beats;
    }

    if (totalWeight > 0 && chromaticWeight / totalWeight > 0.4) {
      const rotation = [0, 3, 4, 0]; // I IV V I (degrees)
      const out = [];
      for (let b = 0; b < numBars; b++) {
        let deg;
        if (b === 0) deg = 0;
        else if (b === numBars - 1) deg = 0;
        else deg = rotation[b % rotation.length];
        out.push(buildChordForDegree(tonicPc, deg, 'triad'));
      }
      return out;
    }

    const result = [];
    for (let b = 0; b < numBars; b++) {
      if (barWeight[b] === 0) {
        result.push(result.length ? result[result.length - 1] : buildChordForDegree(tonicPc, 0, 'triad'));
        continue;
      }
      const h = histos[b];
      let best = null, bestScore = -Infinity;
      for (const dt of DIATONIC_TRIADS) {
        const chord = buildChordForDegree(tonicPc, dt.degree, 'triad');
        let score = h[chord.pcs[0]] * 1.6 + h[chord.pcs[1]] * 1.0 + h[chord.pcs[2]] * 1.1;
        if (dt.degree === 0) score += 0.08;
        if (dt.degree === 3) score += 0.06;
        if (dt.degree === 4) score += 0.05;
        if (dt.degree === 4 && b === numBars - 1) score += 0.20;
        if (score > bestScore) { bestScore = score; best = chord; }
      }
      result.push(best);
    }

    result[0] = buildChordForDegree(tonicPc, 0, 'triad');
    if (numBars > 1) {
      const lastDeg = (result[numBars - 1].roman === 'V') ? 4 : 0;
      result[numBars - 1] = buildChordForDegree(tonicPc, lastDeg, 'triad');
    }
    return result;
  }

  // ==========================================================================
  // chooseVoicing — pick a fuller, consonant voicing for a chord given its
  // degree and bar position. Color tones (add9/6/sus2) ONLY on I/IV/vi, NEVER
  // on V at a cadence. Falls back to triad+oct otherwise.
  // ==========================================================================
  function chooseVoicing(degree, requested, isCadence) {
    const colorful = (requested === 'add9' || requested === 'six' || requested === 'sus2');
    if (colorful) {
      const safeDegree = (degree === 0 || degree === 3 || degree === 5); // I, IV, vi
      const blockedAtCadence = (degree === 4 && isCadence);
      if (safeDegree && !blockedAtCadence) return requested;
      return 'triad+oct';
    }
    return requested || 'triad';
  }

  // ==========================================================================
  // computeSections — divide the song into N contiguous bar-ranges with an
  // intensity ramp. Tries phrase boundaries (a bar ending on a long note,
  // beats>=2, at a bar line); falls back to equal division into N=min(numBars,4).
  // Output: [{startBar,endBar,intensity}] (endBar inclusive).
  // ==========================================================================
  function computeSections(melody, numBars, profile) {
    profile = (profile && profile.length) ? profile.slice() : [1, 2, 3, 4];

    // ---- find candidate phrase boundaries: bars where a long note (beats>=2)
    // lands exactly on a bar line (its onset beat % 4 === 0... we approximate by
    // "ends a bar with a long held note"). We mark the bar index it completes.
    const boundaries = [];
    let acc = 0;
    for (const ev of melody) {
      const beats = ev.beats || 0;
      const onsetBeat = acc;
      // a long note (>=2 beats) whose onset is on a bar line is a phrase start;
      // the boundary is the bar it begins, splitting before it.
      if (beats >= 2 && Math.abs(onsetBeat % 4) < 1e-6 && onsetBeat > 0) {
        const barIdx = Math.round(onsetBeat / 4);
        if (barIdx > 0 && barIdx < numBars) boundaries.push(barIdx);
      }
      acc += beats;
    }
    // dedupe + sort
    const uniq = Array.from(new Set(boundaries)).sort((a, b) => a - b);

    // Build sections from boundaries; cap at 4 sections (merge by keeping a
    // roughly-even subset of boundaries) for a clean S1..S4 ramp.
    let cuts = uniq.slice();
    const maxSections = Math.min(numBars, 4);
    if (cuts.length + 1 > maxSections) {
      // keep evenly-spaced cuts to land on maxSections sections
      const want = maxSections - 1;
      const picked = [];
      for (let k = 1; k <= want; k++) {
        const idx = Math.round((k * cuts.length) / (want + 1)) - 1;
        const ci = Math.max(0, Math.min(cuts.length - 1, idx));
        if (picked.indexOf(cuts[ci]) === -1) picked.push(cuts[ci]);
      }
      cuts = picked.sort((a, b) => a - b);
    }

    let ranges;
    if (cuts.length < 1) {
      // fallback: equal division into N=min(numBars,4) sections, each >=1 bar.
      const N = maxSections;
      ranges = [];
      const base = Math.floor(numBars / N);
      let rem = numBars - base * N;
      let start = 0;
      for (let s = 0; s < N; s++) {
        const len = base + (s < rem ? 1 : 0);
        if (len <= 0) continue;
        ranges.push({ startBar: start, endBar: start + len - 1 });
        start += len;
      }
    } else {
      ranges = [];
      let start = 0;
      for (const c of cuts) {
        ranges.push({ startBar: start, endBar: c - 1 });
        start = c;
      }
      ranges.push({ startBar: start, endBar: numBars - 1 });
    }

    // assign intensity from the profile (clamp to profile length, ramp up).
    const out = [];
    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      const pIdx = Math.min(i, profile.length - 1);
      out.push({ startBar: r.startBar, endBar: r.endBar, intensity: profile[pIdx] });
    }
    return out;
  }

  // intensity -> per-track gain multipliers + comp/drum density flags.
  function intensityToDensity(intensity, style) {
    const padMap = { 1: 0.5, 2: 0.8, 3: 1, 4: 1 };
    const bassMap = { 0: 0, 1: 0, 2: 0.8, 3: 1, 4: 1 };
    let compMode;
    if (intensity <= 2) compMode = 'sustain';
    else if (intensity === 3) compMode = { mode: 'arp', subdiv: 8 };
    else compMode = { mode: 'arp', subdiv: 16 };
    return {
      padGain: padMap[intensity] != null ? padMap[intensity] : 1,
      bassGain: bassMap[intensity] != null ? bassMap[intensity] : 0,
      bassOn: intensity >= 2,
      drumsOn: intensity >= 3,
      fullKit: intensity >= 3,
      compMode,
    };
  }

  // ==========================================================================
  // renderComping — accompaniment comping layer. mode ∈ {sustain,arp,broken,stab}.
  // Positional scheduling only (no rng). Returns a mono buffer covering the song.
  // Each chord (per bar) uses the supplied voicing. Routed to reverb send.
  // ==========================================================================
  function renderComping(comp, chords, numBars, gridBeats, beatOffsetFn, QUARTER_SEC, sr, perBarGain, sectionVoicingFn) {
    const totalN = beatOffsetFn(gridBeats) + Math.round(DEFAULT_TAIL_SEC * sr);
    const buf = new Float32Array(totalN);
    const mode = comp.mode || 'sustain';
    const timbre = comp.timbre || { kind: 'square', duty: 0.5 };
    const baseGain = (typeof comp.gain === 'number') ? comp.gain : 1.0;
    const subdiv = comp.subdiv || 8;

    for (let bar = 0; bar < numBars; bar++) {
      const chord = chords[bar] || chords[chords.length - 1];
      const g = baseGain * (perBarGain ? perBarGain(bar) : 1);
      if (g <= 0) continue;
      const voicing = sectionVoicingFn ? sectionVoicingFn(bar, chord) : 'triad+oct';
      // Derive voiced notes by extending the chord's existing triad MIDIs so the
      // color tones stay diatonic to the key the chord was inferred in.
      const freqs = expandVoicing(chord, voicing).map(midiToFreq);

      const barStartBeat = bar * 4;
      if (mode === 'sustain') {
        const at = beatOffsetFn(barStartBeat);
        mixInto(buf, renderPadChord(freqs, 4 * QUARTER_SEC, timbre, sr), at, g);
      } else if (mode === 'arp') {
        // arpeggiate chord tones upward across the bar in `subdiv` steps.
        const steps = subdiv === 16 ? 16 : 8;
        const stepBeats = 4 / steps;
        for (let s = 0; s < steps; s++) {
          const f = freqs[s % freqs.length];
          const at = beatOffsetFn(barStartBeat + s * stepBeats);
          mixInto(buf, renderCompChord([f], stepBeats * QUARTER_SEC, timbre, sr), at, g);
        }
      } else if (mode === 'broken') {
        // stylized broken-chord: low, high, mid, high per beat (gentle, lullaby).
        const pat = [0, freqs.length - 1, Math.floor(freqs.length / 2), freqs.length - 1];
        for (let b = 0; b < 4; b++) {
          const f = freqs[Math.min(freqs.length - 1, pat[b])];
          const at = beatOffsetFn(barStartBeat + b);
          mixInto(buf, renderCompChord([f], QUARTER_SEC, timbre, sr), at, g * 0.9);
        }
      } else if (mode === 'stab') {
        // short chords on the offbeats (the "&" of each beat).
        for (let b = 0; b < 4; b++) {
          const at = beatOffsetFn(barStartBeat + b + 0.5);
          mixInto(buf, renderCompChord(freqs, 0.4 * QUARTER_SEC, timbre, sr), at, g);
        }
      }
    }
    return buf;
  }

  // expandVoicing — given an inferred chord (with triadMidis) produce the MIDI
  // list for a requested voicing. Color tones are derived from the chord's own
  // root/degree so they stay diatonic to the key the chord was built in.
  function expandVoicing(chord, voicing) {
    const [rootMidi, thirdMidi, fifthMidi] = chord.triadMidis;
    switch (voicing) {
      case 'triad': return [rootMidi, thirdMidi, fifthMidi];
      case 'open5': return [rootMidi, fifthMidi];
      case 'thin': return [rootMidi, fifthMidi];
      case 'triad+oct': return [rootMidi, thirdMidi, fifthMidi, rootMidi + 12];
      case 'add9': {
        // 9th = root + 14 semitones, but diatonic: it is the 2nd scale degree
        // above the root within the major scale -> root + (2nd interval) + 12.
        // For a diatonic major-key triad the 9th is +14 (whole-tone above oct).
        return [rootMidi, thirdMidi, fifthMidi, rootMidi + 14];
      }
      case 'sus2': {
        // replace third with the 2nd (root + 2 semitones, diatonic for sus2).
        return [rootMidi, rootMidi + 2, fifthMidi];
      }
      case 'six': {
        // major 6th = root + 9 semitones.
        return [rootMidi, thirdMidi, fifthMidi, rootMidi + 9];
      }
      default: return [rootMidi, thirdMidi, fifthMidi, rootMidi + 12];
    }
  }

  // ==========================================================================
  // renderArrangement — full v2 mix.
  // ==========================================================================
  function renderArrangement(opts) {
    const melody = opts.melody;
    const style = opts.style;
    const bpm = Math.max(1, Number(opts.bpm) || (style && style.defaultBpm) || 120);
    const key = opts.key || 'C';
    const sr = opts.sampleRate || DEFAULT_SR;
    const tonicPc = ((noteToMidi(key + '4') % 12) + 12) % 12;

    const QUARTER_SEC = 60 / bpm;
    const beatN = Math.round(QUARTER_SEC * sr);
    const eighthN = Math.round((QUARTER_SEC / 2) * sr);

    const totalBeats = melody.reduce((s, ev) => s + (ev.beats || 0), 0);
    const numBars = Math.max(1, Math.ceil(totalBeats / 4));

    // ---- v2 structure config.
    const intro = style.intro || {};
    const introBars = Math.max(0, intro.bars || 0);
    const introOffsetBeats = introBars * 4;
    const outro = style.outro || {};

    const sectionProfile = style.sectionProfile || [1, 2, 3, 4];
    const sections = computeSections(melody, numBars, sectionProfile);
    // per-bar -> intensity lookup.
    const barIntensity = new Array(numBars).fill(1);
    for (const sec of sections) {
      for (let b = sec.startBar; b <= sec.endBar && b < numBars; b++) barIntensity[b] = sec.intensity;
    }
    // last bar of each section (for fills).
    const sectionLastBar = new Set(sections.map(s => s.endBar));

    // ONE shared integer beat grid. Now padded by introOffsetBeats AND an outro
    // tail so the held outro chord / extended decay are not truncated.
    const outroExtraBeats = outro.heldChord ? 4 : 0;
    const gridBeats = Math.max(Math.ceil(totalBeats), numBars * 4) + introOffsetBeats + outroExtraBeats;
    // Apply the SINGLE intro offset uniformly through every grid placement.
    const beatOffsetN = (beat) => Math.round((beat + introOffsetBeats) * QUARTER_SEC * sr);

    const tailN = Math.round(DEFAULT_TAIL_SEC * sr);
    // Outro tail: extend the buffer so a held outro chord + reverb tail fit.
    const outroTailSec = outro.heldChord ? (4 * QUARTER_SEC + 0.6) : 0;
    const outroTailN = Math.round(outroTailSec * sr);
    const totalN = gridBeats * beatN + tailN + outroTailN;

    const lead = new Float32Array(totalN);
    const drums = new Float32Array(totalN);
    const bass = new Float32Array(totalN);
    const pad = new Float32Array(totalN);    // sustain comp (v1 pad path / comp sustain)
    const comp = new Float32Array(totalN);   // arp/broken/stab comp

    const chords = inferChords(melody, key);

    // Seeded PRNG — drawn in a FIXED order for determinism. We render the base
    // drum voices ONCE up front (kick/snare/hat/crash), then fills draw extra
    // rng() calls in a deterministic loop later. Crash is drawn last among base.
    const rng = mulberry32((opts.seed != null ? opts.seed : 0x9E3779B1) >>> 0);

    // ---- LEAD: lay notes on the exact slot grid (Path B). Onsets are offset by
    // the SAME introOffsetBeats constant so they stay aligned with the backing.
    const leadTimbre = {
      kind: style.lead.timbre,
      duty: style.lead.duty,
      peak: style.lead.peak,
      adsr: style.lead.adsr,
      vibrato: style.lead.vibrato,
      layer: style.lead.layer,
    };
    const leadStartN = Math.round(introOffsetBeats * QUARTER_SEC * sr);
    const leadOnsets = [];
    let leadOff = leadStartN;
    for (let i = 0; i < melody.length; i++) {
      const { note, beats } = melody[i];
      const slotSec = beats * QUARTER_SEC;
      const freq = noteToFreq(note);
      const noteBuf = renderLeadNote(freq, slotSec, leadTimbre, sr);
      mixInto(lead, noteBuf, leadOff, 1.0);
      leadOnsets.push({ at: leadOff, freq, note });
      leadOff += Math.round(slotSec * sr);
    }

    // ---- DRUMS (driven by style.drum pattern + section intensity gating).
    const drum = style.drum || {};
    const drumGains = drum.gains || {};
    const drumsConfigured = (drum.kick && drum.kick.length) || (drum.snare && drum.snare.length) || (drum.hat && drum.hat !== 'none');
    // base voices (drawn in fixed order: snare, hat, crash).
    const kick = renderKick(sr);
    const snare = drumsConfigured ? renderSnare(rng, sr) : new Float32Array(1);
    const hat = drumsConfigured ? renderHat(rng, sr) : new Float32Array(1);
    const crash = renderCrash(rng, sr); // always drawn so rng order is stable
    if (drumsConfigured) {
      const kickSet = new Set(drum.kick || []);
      const snareSet = new Set(drum.snare || []);
      const gKick = (typeof drumGains.kick === 'number') ? drumGains.kick : 1.0;
      const gSnare = (typeof drumGains.snare === 'number') ? drumGains.snare : 0.7;
      const gHat = (typeof drumGains.hat === 'number') ? drumGains.hat : 0.32;
      const fillsOn = !!style.fills;
      for (let beat = 0; beat < gridBeats; beat++) {
        const posInBar = beat % 4;
        // Which song bar is this beat in (accounting for intro offset)?
        const songBeat = beat - introOffsetBeats;
        const songBar = songBeat >= 0 ? Math.floor(songBeat / 4) : -1;
        const inSong = songBar >= 0 && songBar < numBars;
        const intensity = inSong ? barIntensity[songBar] : 0;
        const dens = intensityToDensity(intensity, style);

        const beatStart = beatOffsetN(beat);

        // Intro bar (songBar < 0): only a soft pickup hat on the last beat.
        if (!inSong) {
          if (songBeat < 0 && posInBar === 3) mixInto(drums, hat, beatStart, gHat * 0.6);
          continue;
        }

        // Drums only present at intensity>=3 (unless style has no fills/profile —
        // but presence still gates on density to create development).
        const playKit = dens.drumsOn;
        const isFillBar = fillsOn && sectionLastBar.has(songBar) && intensity >= 3;
        const lastBeatOfBar = posInBar === 3;

        if (isFillBar && lastBeatOfBar) {
          // FILL: replace beat 4 with a snare 16th roll, rising gain 0.5->1.0.
          const sixteenth = beatN / 4;
          for (let s = 0; s < 4; s++) {
            const g = 0.5 + 0.5 * (s / 3);
            // tom flavor on the first two, snare on the last two (deterministic).
            const tomGain = rng(); // draw extra rng() in fixed order
            if (s < 2) {
              const tom = renderKick(sr, 2.0 + tomGain * 0.5);
              mixInto(drums, tom, beatStart + s * sixteenth, gSnare * g);
            } else {
              mixInto(drums, snare, beatStart + s * sixteenth, gSnare * g);
            }
          }
          // keep the hat going under the fill if applicable
          if (drum.hat === 'eighths' && playKit) {
            mixInto(drums, hat, beatStart, gHat);
            mixInto(drums, hat, beatStart + eighthN, gHat * 0.8);
          }
          continue;
        }

        if (!playKit) continue; // section too quiet for the kit

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

    // ---- BASS: positional, diatonic, deterministic. pattern ∈
    //  {none, root-half, root-quarters, root-fifth-alt, octave-bounce, walking-simple}
    const bassCfg = style.bass || {};
    const bassPattern = bassCfg.pattern || (bassCfg.style /* v1 compat */) || 'none';
    if (bassPattern && bassPattern !== 'none') {
      const octaveShift = bassCfg.octaveShift || 0;
      const bassTimbre = { kind: bassCfg.timbre || 'triangle', peak: bassCfg.peak };
      for (let bar = 0; bar < numBars; bar++) {
        const intensity = barIntensity[bar];
        const dens = intensityToDensity(intensity, style);
        if (!dens.bassOn) continue;
        const bg = dens.bassGain;
        const chord = chords[bar] || chords[chords.length - 1];
        const nextChord = chords[bar + 1] || chord;
        const rootMidi = noteToMidi(chord.root) + 12 * octaveShift;
        const fifthMidi = noteToMidi(chord.triad[2]) + 12 * octaveShift;
        const thirdMidi = noteToMidi(chord.triad[1]) + 12 * octaveShift;
        const rootFreq = midiToFreq(rootMidi);
        const fifthFreq = midiToFreq(fifthMidi);
        const thirdFreq = midiToFreq(thirdMidi);
        const barBase = bar * 4;

        if (bassPattern === 'root-half') {
          mixInto(bass, renderBassNote(rootFreq, 2 * QUARTER_SEC, bassTimbre, sr), beatOffsetN(barBase), bg);
          mixInto(bass, renderBassNote(rootFreq, 2 * QUARTER_SEC, bassTimbre, sr), beatOffsetN(barBase + 2), bg);
        } else if (bassPattern === 'octave-bounce') {
          const seq = [rootFreq, midiToFreq(rootMidi + 12), rootFreq, midiToFreq(rootMidi + 12)];
          for (let b = 0; b < 4; b++) mixInto(bass, renderBassNote(seq[b], QUARTER_SEC, bassTimbre, sr), beatOffsetN(barBase + b), bg);
        } else if (bassPattern === 'walking-simple') {
          // beat1 root, beat2 chord-tone (third), beat3 fifth, beat4 diatonic
          // approach toward next bar root (one step below the next root).
          const nextRootMidi = noteToMidi(nextChord.root) + 12 * octaveShift;
          const approachMidi = nextRootMidi - 2; // whole-step approach (diatonic-ish)
          const seq = [rootFreq, thirdFreq, fifthFreq, midiToFreq(approachMidi)];
          for (let b = 0; b < 4; b++) mixInto(bass, renderBassNote(seq[b], QUARTER_SEC, bassTimbre, sr), beatOffsetN(barBase + b), bg);
        } else if (bassPattern === 'root-fifth-alt') {
          for (let b = 0; b < 4; b++) {
            const f = (b % 2 === 0) ? rootFreq : fifthFreq;
            mixInto(bass, renderBassNote(f, QUARTER_SEC, bassTimbre, sr), beatOffsetN(barBase + b), bg);
          }
        } else { // root-quarters (default)
          for (let b = 0; b < 4; b++) {
            mixInto(bass, renderBassNote(rootFreq, QUARTER_SEC, bassTimbre, sr), beatOffsetN(barBase + b), bg);
          }
        }
      }
    }

    // ---- COMP / PAD. The comp layer's mode can be overridden per-section by
    // intensity unless style.comp pins a mode. sustain -> pad buffer, else comp.
    const compCfg = style.comp || null;
    const padCfg = style.pad || {};
    const isCadenceBar = (bar) => bar === numBars - 1;

    // helper to pick the voicing for a given bar/chord.
    const baseVoicing = (compCfg && compCfg.voicing) || padCfg.voicing || 'triad+oct';
    const sectionVoicing = (bar, chord) => chooseVoicing(chord.degree, baseVoicing, isCadenceBar(bar));

    // per-bar gain from section intensity (pad/comp gain map).
    const compPerBarGain = (bar) => {
      const dens = intensityToDensity(barIntensity[bar], style);
      return dens.padGain;
    };

    if (compCfg) {
      // For each bar, decide comp mode: explicit style.comp.mode, OR section
      // density default when style sets mode:'auto'.
      // We render the whole-song comping in one pass per mode-group: simplest is
      // to render bar-by-bar by temporarily building a per-bar comp config.
      for (let bar = 0; bar < numBars; bar++) {
        const intensity = barIntensity[bar];
        const dens = intensityToDensity(intensity, style);
        let mode = compCfg.mode;
        let subdiv = compCfg.subdiv || 8;
        if (mode === 'auto') {
          if (typeof dens.compMode === 'string') mode = dens.compMode;
          else { mode = dens.compMode.mode; subdiv = dens.compMode.subdiv; }
        }
        const oneBarChords = chords.slice(bar, bar + 1);
        const dstIsPad = (mode === 'sustain');
        const dst = dstIsPad ? pad : comp;
        const perBar = () => compPerBarGain(bar);
        const sectVoice = (b, c) => sectionVoicing(bar, c);
        const oneBar = renderComping(
          { mode, subdiv, gain: compCfg.gain, timbre: compCfg.timbre },
          [chords[bar] || chords[chords.length - 1]], 1,
          gridBeats,
          (beat) => beatOffsetN(bar * 4 + beat), // beat offset is within this bar
          QUARTER_SEC, sr, perBar, sectVoice
        );
        // oneBar is a full-length buffer but only bar 0 region is populated; mix.
        mixInto(dst, oneBar, 0, 1.0);
      }
    } else if (padCfg.on) {
      // v1 pad path (no comp config): one sustained chord per bar.
      const padTimbre = { kind: padCfg.timbre || 'square', duty: padCfg.duty };
      for (let bar = 0; bar < numBars; bar++) {
        const intensity = barIntensity[bar];
        const dens = intensityToDensity(intensity, style);
        const chord = chords[bar] || chords[chords.length - 1];
        const voicing = chooseVoicing(chord.degree, padCfg.voicing || 'triad', isCadenceBar(bar));
        const freqs = expandVoicing(chord, voicing).map(midiToFreq);
        const barSec = 4 * QUARTER_SEC;
        mixInto(pad, renderPadChord(freqs, barSec, padTimbre, sr), beatOffsetN(bar * 4), dens.padGain);
      }
    }

    // ---- OUTRO: held final tonic (I) chord + optional crash over the tail.
    if (outro.heldChord) {
      const tonicChord = buildChordForDegree(tonicPc, 0, 'triad+oct');
      const freqs = expandVoicing(tonicChord, 'triad+oct').map(midiToFreq);
      const at = beatOffsetN(numBars * 4);
      const heldSec = 4 * QUARTER_SEC + 0.5;
      mixInto(pad, renderPadChord(freqs, heldSec, { kind: (padCfg.timbre || (compCfg && compCfg.timbre && compCfg.timbre.kind) || 'square'), duty: 0.5 }, sr), at, 0.9);
      if (outro.crash) mixInto(drums, crash, at, ((drumGains.crash != null) ? drumGains.crash : 0.5));
    }

    // ---- INTRO: soft pad on the intro bar (if any).
    if (introBars > 0) {
      const introChord = chords[0] || buildChordForDegree(tonicPc, 0, 'triad');
      const freqs = expandVoicing(introChord, 'open5').map(midiToFreq);
      // place at grid beat 0 (which is the intro bar start because lead starts later).
      // Intentional: the intro bar starts at absolute frame 0 (before the offset-shifted
      // melody). Do NOT "fix" this to use beatOffsetN — the intro precedes the lead.
      const at = Math.round(0 * QUARTER_SEC * sr); // absolute sample 0
      mixInto(pad, renderPadChord(freqs, introOffsetBeats * QUARTER_SEC, { kind: 'sine' }, sr), at, 0.4);
    }

    // ==========================================================================
    // MIX. Per-track gains (lead on top). v2: optional stereo + reverb send.
    // ==========================================================================
    const gLead = (style.lead && typeof style.lead.gain === 'number') ? style.lead.gain : 0.85;
    const gDrum = drumGains.master != null ? drumGains.master : 0.55;
    const gBass = (typeof bassCfg.gain === 'number') ? bassCfg.gain : 0.40;
    const gPad = (typeof padCfg.gain === 'number') ? padCfg.gain
      : (compCfg && typeof compCfg.gain === 'number') ? compCfg.gain : 0.10;
    const gComp = (compCfg && typeof compCfg.gain === 'number') ? compCfg.gain : gPad;

    const targetPeak = (style.master && typeof style.master.targetPeak === 'number')
      ? style.master.targetPeak : DEFAULT_TARGET_PEAK;

    // ---- REVERB send (lead + pad/comp), WET only.
    const reverbCfg = style.reverb || {};
    let wet = null;
    if (reverbCfg.on) {
      const sendLead = (reverbCfg.send && typeof reverbCfg.send.lead === 'number') ? reverbCfg.send.lead : 0.18;
      const sendPad = (reverbCfg.send && typeof reverbCfg.send.pad === 'number') ? reverbCfg.send.pad : 0.25;
      const reverbSend = new Float32Array(totalN);
      for (let i = 0; i < totalN; i++) {
        reverbSend[i] = gLead * lead[i] * sendLead + (gPad * pad[i] + gComp * comp[i]) * sendPad;
      }
      wet = applyReverb(reverbSend, sr, { decay: reverbCfg.decay, predelayMs: reverbCfg.predelayMs });
    }
    const wetGain = reverbCfg.on ? ((typeof reverbCfg.wet === 'number') ? reverbCfg.wet : 0.3) : 0;

    const stereoCfg = style.stereo || {};
    const stereoOn = !!stereoCfg.on;

    if (!stereoOn) {
      // ----- MONO PATH (exact v1 behaviour + optional reverb add) -----
      const mix = new Float32Array(totalN);
      for (let i = 0; i < totalN; i++) {
        mix[i] = gLead * lead[i] + gDrum * drums[i] + gBass * bass[i] + gPad * pad[i] + gComp * comp[i];
        if (wet) mix[i] += wetGain * wet[i];
      }
      let peak = 0;
      for (let i = 0; i < totalN; i++) { const a = Math.abs(mix[i]); if (a > peak) peak = a; }
      if (peak > 0) {
        const scale = peak > targetPeak ? targetPeak / peak : 1;
        for (let i = 0; i < totalN; i++) mix[i] *= scale;
      }
      clampBuf(mix);
      return {
        samples: mix,
        channels: 1,
        meta: buildMeta(mix.length, 1, totalBeats, numBars, sr, bpm, key, leadOnsets, chords,
          sections, introOffsetBeats, outroTailSec),
      };
    }

    // ----- STEREO PATH. Per-track MONO -> constant-power pan into L/R. -----
    const width = (typeof stereoCfg.width === 'number') ? stereoCfg.width : 0.6;
    const left = new Float32Array(totalN);
    const right = new Float32Array(totalN);
    // pans: lead 0, kick/snare 0, bass 0, pad/comp spread ±width, reverb ±0.9*width.
    panInto(left, right, lead, gLead, 0);
    panInto(left, right, drums, gDrum, 0);
    panInto(left, right, bass, gBass, 0);
    panInto(left, right, pad, gPad, -width);
    panInto(left, right, comp, gComp, +width);
    if (wet) {
      // Split wetGain across the two symmetric passes so total wet energy == wetGain
      // (avoids the wet reverb counting double and over-compressing the dry lead).
      panInto(left, right, wet, wetGain * 0.5, -0.9 * width);
      panInto(left, right, wet, wetGain * 0.5, +0.9 * width);
    }

    // Normalize using the SHARED max peak across BOTH channels (one scale).
    let peak = 0;
    for (let i = 0; i < totalN; i++) {
      const al = Math.abs(left[i]); if (al > peak) peak = al;
      const ar = Math.abs(right[i]); if (ar > peak) peak = ar;
    }
    if (peak > 0) {
      const scale = peak > targetPeak ? targetPeak / peak : 1;
      if (scale !== 1) for (let i = 0; i < totalN; i++) { left[i] *= scale; right[i] *= scale; }
    }
    clampBuf(left); clampBuf(right);

    // Interleave L,R,L,R...
    const samples = new Float32Array(totalN * 2);
    for (let i = 0, j = 0; i < totalN; i++, j += 2) {
      samples[j] = left[i];
      samples[j + 1] = right[i];
    }
    return {
      samples,
      channels: 2,
      meta: buildMeta(totalN, 2, totalBeats, numBars, sr, bpm, key, leadOnsets, chords,
        sections, introOffsetBeats, outroTailSec),
    };
  }

  function buildMeta(framesOrLen, channels, totalBeats, numBars, sr, bpm, key, leadOnsets, chords, sections, introOffsetBeats, outroTailSec) {
    const frames = framesOrLen; // framesOrLen is the per-channel frame count for both mono and stereo
    return {
      durationSec: frames / sr,
      totalBeats,
      numBars,
      sampleRate: sr,
      bpm,
      key,
      channels,
      leadOnsets,
      chords,
      sections,
      introOffsetBeats,
      outroTailSec,
    };
  }

  // ==========================================================================
  // melodyToChart — taiko don/ka chart (UNCHANGED from v1).
  // ==========================================================================
  function melodyToChart(melody, opts) {
    opts = opts || {};
    const bpm = opts.bpm || 120;
    const QUARTER_SEC = 60 / bpm;
    const totalBeats = melody.reduce((s, ev) => s + (ev.beats || 0), 0);

    const notes = [];
    let acc = 0;
    for (const ev of melody) {
      const beatIndex = Math.round(acc);
      const posInBar = ((beatIndex % 4) + 4) % 4;
      const type = (posInBar === 0 || posInBar === 2) ? 'don' : 'ka';
      const time = Math.round(beatIndex * QUARTER_SEC * 100) / 100;
      notes.push({ time, type });
      acc += (ev.beats || 0);
    }

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
  // encodeWav — RIFF/PCM header + int16 samples, via DataView over an
  // ArrayBuffer (NOT Node Buffer) so it runs identically everywhere.
  // numChannels defaults to 1 (mono) — existing mono callers unaffected.
  // For stereo callers, `samples` is ALREADY interleaved (L,R,L,R…), so its
  // length counts both channels — do NOT multiply dataSize by numChannels.
  // ==========================================================================
  function encodeWav(samples, sampleRate, numChannels) {
    const sr = sampleRate || DEFAULT_SR;
    const ch = numChannels || 1;
    const numSamples = samples.length;        // already interleaved for stereo
    const bytesPerSample = 2;
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
    dv.setUint16(22, ch, true);                       // num channels
    dv.setUint32(24, sr, true);                       // sample rate
    dv.setUint32(28, sr * ch * bytesPerSample, true); // byte rate
    dv.setUint16(32, ch * bytesPerSample, true);      // block align
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
  // Public API surface.
  // ==========================================================================
  return {
    // note math
    noteToMidi, midiToFreq, noteToFreq, midiToNote,
    // voices
    renderLeadNote, renderBassNote, renderPadChord, renderCompChord,
    renderKick, renderSnare, renderHat, renderCrash,
    // effects
    applyReverb,
    // harmony + arrangement
    inferChords, buildChordForDegree, expandVoicing, chooseVoicing,
    computeSections, renderComping,
    renderArrangement, melodyToChart,
    // io
    encodeWav,
    // utilities / tables for tests
    mulberry32, SEMITONE, DIATONIC_TRIADS, MAJOR_SCALE,
  };
});
