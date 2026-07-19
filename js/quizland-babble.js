/*!
 * quizland-babble.js
 * Animal-Crossing-style pseudo-voice "babble" for Pono quizland.
 * Pure programmatic Web Audio synthesis (no recorded assets).
 *
 * Public API: window.PonoBabble = { init, playChar, cancelAll, presets }
 */
(function (global) {
  'use strict';

  // Skip these characters entirely (no chirp emitted).
  // Includes ASCII whitespace/punct + common JP punctuation + zero-width joiners.
  var SKIP_RE = /[\s　.,!?:;"'`~\-_/\\(){}\[\]<>|@#$%^&*+=、。！？「」『』〈〉《》【】（）・…ー​-‍﻿]/;

  // Vowel formant table for owl voice (simplified — bandpass center freq only).
  // Picking 5 candidates gives "ふぉ・ぼ・ぶ・ぼ" style mouth-shape variation when
  // we cycle deterministically by character index.
  // Values lean low (700-1200 Hz) per "old man" formants.
  var OWL_FORMANTS = [
    { f: 720,  label: 'u' },  // う — most rounded / dark
    { f: 850,  label: 'o' },  // お — round
    { f: 950,  label: 'a' },  // あ — open
    { f: 1100, label: 'e' },  // え — mid-bright
    { f: 1250, label: 'i' }   // い — bright but kept low for elderly tone
  ];

  var presets = {
    // Owl (フクロウ博士): elderly-grandfather voice — programmatic vowel-like babble
    // with 2-osc body, bandpass formant, and ~6Hz tremolo.
    owl: {
      voice: true,                 // route through voice synth path
      wave: 'sawtooth',            // richer harmonic content for filter to shape
      wave2: 'triangle',           // softens the saw, adds chest resonance
      osc2Detune: -1200,           // sub-octave shadow for "old man chest"
      osc2Mix: 0.5,                // sub-octave blend (thicker low-end body)
      baseFreq: 160,               // low — settled, depth
      glide: -50,                  // strong downward inflection (語尾下降)
      duration: 0.120,             // slower, weightier
      attack: 0.016,               // softer onset (vocal cord ramp-up)
      release: 0.090,              // longer tail
      peakGain: 0.5,               // post-filter level (compensate BPF loss)
      pitchSpread: 26,             // Hz (relative to base)
      formants: OWL_FORMANTS,      // BPF center freq table
      formantSpread: 180,          // ± random jitter on chosen formant
      bpfQ: 3.5,                   // wider passband so fundamental/sub-harmonics survive
      vibratoRate: 6.2,            // Hz — elderly tremor band
      vibratoDepth: 5.5            // Hz — subtle but audible within 1 cycle
    },
    // Pono: bright, triangle, energetic.
    pono: {
      wave: 'triangle',
      baseFreq: 520,
      glide: 40,          // up = perky
      duration: 0.07,
      attack: 0.005,
      release: 0.045,
      peakGain: 0.12,
      pitchSpread: 28
    },
    // Hedgehog (ハリネズミ): mid, triangle, neutral.
    hedgehog: {
      wave: 'triangle',
      baseFreq: 390,
      glide: 20,
      duration: 0.075,
      attack: 0.005,
      release: 0.05,
      peakGain: 0.11,
      pitchSpread: 22
    },
    // Kurumi (リスのくるみちゃん): お姉さん感のある明るめ女声。
    // baseFreq 450 = ポノ(520)より低くオウル(160)より高い、優しいお姉さん帯域。
    // glide 上向き (元気)、 triangle で柔らかいトーン。
    kurumi: {
      wave: 'triangle',
      baseFreq: 450,
      glide: 35,
      duration: 0.08,
      attack: 0.006,
      release: 0.048,
      peakGain: 0.13,
      pitchSpread: 30
    },
    // Default: between pono and hedgehog.
    default: {
      wave: 'triangle',
      baseFreq: 460,
      glide: 25,
      duration: 0.075,
      attack: 0.005,
      release: 0.05,
      peakGain: 0.11,
      pitchSpread: 24
    }
  };

  var ctx = null;
  // Master gain lets cancelAll() abruptly mute everything in flight without
  // touching the shared destination, and gives us one knob for global trim.
  var master = null;
  // Track active nodes so cancelAll can stop them cleanly (some browsers
  // leak short tails if we only ramp gain to 0). Each entry may carry a
  // primary osc + optional secondary osc + LFO + filter + gains.
  var activeNodes = [];
  // Deterministic counter so consecutive calls cycle through vowels even when
  // the same kana repeats (charCode alone would give the same vowel each time).
  var voiceCounter = 0;

  function ensureMaster() {
    if (!ctx) return null;
    if (master) return master;
    master = ctx.createGain();
    master.gain.value = 1.0;
    try { master.connect(ctx.destination); } catch (e) { /* destination missing in tests */ }
    return master;
  }

  function init(audioCtx) {
    if (!audioCtx) return;
    // Idempotent: if same context re-passed, keep existing master.
    if (ctx === audioCtx && master) return;
    ctx = audioCtx;
    master = null; // force re-create against new ctx
    ensureMaster();
  }

  function shouldSkip(ch) {
    if (ch == null) return true;
    var s = String(ch);
    if (s.length === 0) return true;
    return SKIP_RE.test(s.charAt(0));
  }

  function tryResume() {
    if (!ctx) return;
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      try { ctx.resume(); } catch (e) { /* swallow: silent failure per spec */ }
    }
  }

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  // Tear down all nodes attached to an entry and remove it from activeNodes.
  function disposeEntry(entry) {
    if (!entry) return;
    var nodes = entry.nodes || [];
    for (var i = 0; i < nodes.length; i++) {
      try { nodes[i].disconnect(); } catch (e) {}
    }
    var idx = activeNodes.indexOf(entry);
    if (idx >= 0) activeNodes.splice(idx, 1);
  }

  // Voice-style synth path used for owl preset (and any preset with voice:true).
  // Chain: osc1 + osc2 -> mixGain -> bpf -> envGain -> bus
  //        LFO -> lfoGain -> osc1.frequency (and osc2.frequency)
  function playVoice(p, char, bus, now) {
    var code = String(char).charCodeAt(0) || 0;
    var variance = ((code % 7) - 3) / 3; // -1 .. +1 ish
    var startFreq = p.baseFreq + variance * p.pitchSpread;
    var endFreq = startFreq + p.glide;

    // Cycle vowels by counter so repeated kana don't stay on the same formant.
    var formants = p.formants && p.formants.length ? p.formants : OWL_FORMANTS;
    var vIndex = (voiceCounter++ + (code % formants.length)) % formants.length;
    var formant = formants[vIndex];
    var jitter = ((code * 31) % 1000) / 1000 - 0.5; // -0.5..+0.5 deterministic
    var bpfFreq = clamp(formant.f + jitter * (p.formantSpread || 0), 200, 4000);

    var osc1, osc2, mixGain, bpf, envGain, lfo, lfoGain;
    try {
      osc1 = ctx.createOscillator();
      mixGain = ctx.createGain();
      bpf = ctx.createBiquadFilter();
      envGain = ctx.createGain();
      lfo = ctx.createOscillator();
      lfoGain = ctx.createGain();
      // osc2 is optional; if it fails we still get a usable voice.
      try { osc2 = ctx.createOscillator(); } catch (_) { osc2 = null; }
    } catch (e) {
      return;
    }

    // ---- oscillator config ----
    osc1.type = p.wave || 'sawtooth';
    try {
      osc1.frequency.setValueAtTime(startFreq, now);
      osc1.frequency.linearRampToValueAtTime(endFreq, now + Math.min(p.duration, 0.07));
    } catch (e) {
      try { osc1.frequency.value = startFreq; } catch (_) {}
    }

    if (osc2) {
      osc2.type = p.wave2 || 'triangle';
      try { osc2.detune.value = (p.osc2Detune != null) ? p.osc2Detune : -1200; } catch (_) {}
      try {
        osc2.frequency.setValueAtTime(startFreq, now);
        osc2.frequency.linearRampToValueAtTime(endFreq, now + Math.min(p.duration, 0.07));
      } catch (e) {
        try { osc2.frequency.value = startFreq; } catch (_) {}
      }
    }

    // ---- bandpass formant ----
    try {
      bpf.type = 'bandpass';
      bpf.frequency.setValueAtTime(bpfFreq, now);
      bpf.Q.value = clamp(p.bpfQ != null ? p.bpfQ : 8, 1, 12);
    } catch (e) {}

    // ---- LFO (vibrato / elderly tremor) ----
    try {
      lfo.type = 'sine';
      lfo.frequency.value = clamp(p.vibratoRate != null ? p.vibratoRate : 6, 1, 12);
      lfoGain.gain.value = clamp(p.vibratoDepth != null ? p.vibratoDepth : 5, 0, 30);
      lfo.connect(lfoGain);
      try { lfoGain.connect(osc1.frequency); } catch (_) {}
      if (osc2) { try { lfoGain.connect(osc2.frequency); } catch (_) {} }
    } catch (e) {}

    // ---- mix osc1 + osc2 ----
    try {
      var mix2 = ctx.createGain();
      // osc1 dominant; osc2 quieter sub-octave shadow
      var osc1Level = 1 - (p.osc2Mix != null ? p.osc2Mix : 0.35);
      var osc2Level = (p.osc2Mix != null ? p.osc2Mix : 0.35);
      var g1 = ctx.createGain();
      g1.gain.value = osc1Level;
      osc1.connect(g1);
      g1.connect(mixGain);
      if (osc2) {
        mix2.gain.value = osc2Level;
        osc2.connect(mix2);
        mix2.connect(mixGain);
      }
      mixGain.connect(bpf);
      bpf.connect(envGain);
      envGain.connect(bus);

      // Track ALL of these for cleanup.
      var entry = {
        nodes: [osc1, g1, mixGain, bpf, envGain, lfo, lfoGain],
        primaryOsc: osc1,
        extraOscs: []
      };
      if (osc2) {
        entry.nodes.push(osc2);
        entry.nodes.push(mix2);
        entry.extraOscs.push(osc2);
      }
      entry.extraOscs.push(lfo);

      // ---- envelope ----
      var attackEnd = now + (p.attack != null ? p.attack : 0.012);
      var releaseEnd = now + p.duration + p.release;
      try {
        envGain.gain.setValueAtTime(0.0001, now);
        envGain.gain.linearRampToValueAtTime(p.peakGain, attackEnd);
        envGain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);
      } catch (e) {
        try { envGain.gain.value = p.peakGain; } catch (_) {}
      }

      activeNodes.push(entry);

      // ---- start / stop ----
      try { osc1.start(now); } catch (_) {}
      if (osc2) { try { osc2.start(now); } catch (_) {} }
      try { lfo.start(now); } catch (_) {}

      var stopAt = releaseEnd + 0.02;
      try { osc1.stop(stopAt); } catch (_) {}
      if (osc2) { try { osc2.stop(stopAt); } catch (_) {} }
      try { lfo.stop(stopAt); } catch (_) {}

      // Cleanup hooks on the primary osc — primary's onended is the canonical
      // signal that the voice has finished. Secondary oscs may end slightly
      // earlier or later, but disposing on primary covers all of them.
      osc1.onended = function () { disposeEntry(entry); };
    } catch (e) {
      // best-effort cleanup if wiring partially failed
      try { osc1.disconnect(); } catch (_) {}
      try { if (osc2) osc2.disconnect(); } catch (_) {}
      try { mixGain.disconnect(); } catch (_) {}
      try { bpf.disconnect(); } catch (_) {}
      try { envGain.disconnect(); } catch (_) {}
      try { lfo.disconnect(); } catch (_) {}
      try { lfoGain.disconnect(); } catch (_) {}
    }
  }

  // Simple chirp path used by pono / hedgehog / default presets (unchanged).
  function playSimple(p, char, bus, now) {
    // Char-based microvariation: keeps long strings from sounding like a buzzer.
    var code = String(char).charCodeAt(0) || 0;
    var variance = ((code % 7) - 3) / 3; // -1 .. +1 ish
    var startFreq = p.baseFreq + variance * p.pitchSpread;
    var endFreq = startFreq + p.glide;

    var osc, gain;
    try {
      osc = ctx.createOscillator();
      gain = ctx.createGain();
    } catch (e) {
      return;
    }

    osc.type = p.wave;
    try {
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.linearRampToValueAtTime(endFreq, now + Math.min(p.duration, 0.05));
    } catch (e) {
      try { osc.frequency.value = startFreq; } catch (_) {}
    }

    var attackEnd = now + p.attack;
    var releaseEnd = now + p.duration + p.release;
    try {
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(p.peakGain, attackEnd);
      // exponentialRamp can't hit zero — ramp toward a tiny floor for natural decay.
      gain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);
    } catch (e) {
      try { gain.gain.value = p.peakGain; } catch (_) {}
    }

    try {
      osc.connect(gain);
      gain.connect(bus);
    } catch (e) {
      return;
    }

    var entry = { nodes: [osc, gain], primaryOsc: osc, extraOscs: [] };
    activeNodes.push(entry);

    try { osc.start(now); } catch (e) { /* already started — ignore */ }
    try { osc.stop(releaseEnd + 0.02); } catch (e) {}

    osc.onended = function () { disposeEntry(entry); };
  }

  function playChar(char, preset) {
    if (!ctx) return; // init() not called yet — silently no-op
    if (shouldSkip(char)) return;

    var p = presets[preset] || presets.default;
    var bus = ensureMaster();
    if (!bus) return;

    tryResume();

    var now;
    try { now = ctx.currentTime; } catch (e) { return; }

    if (p.voice) {
      playVoice(p, char, bus, now);
    } else {
      playSimple(p, char, bus, now);
    }
  }

  function cancelAll() {
    if (!ctx) { activeNodes.length = 0; return; }
    var now;
    try { now = ctx.currentTime; } catch (e) { now = 0; }
    var nodes = activeNodes.slice();
    activeNodes.length = 0;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      // Stop primary + any extras (osc2, LFO).
      try { n.primaryOsc.stop(now + 0.005); } catch (e) {}
      if (n.extraOscs && n.extraOscs.length) {
        for (var j = 0; j < n.extraOscs.length; j++) {
          try { n.extraOscs[j].stop(now + 0.005); } catch (e) {}
        }
      }
      // Disconnect every tracked node.
      var list = n.nodes || [];
      for (var k = 0; k < list.length; k++) {
        try { list[k].disconnect(); } catch (e) {}
      }
    }
  }

  global.PonoBabble = {
    init: init,
    playChar: playChar,
    cancelAll: cancelAll,
    presets: presets
  };
})(typeof window !== 'undefined' ? window : this);
