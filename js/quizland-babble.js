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

  var presets = {
    // Owl (フクロウ博士): low, square, calm.
    owl: {
      wave: 'square',
      baseFreq: 240,
      glide: -30,         // Hz delta from start to end (down = settled)
      duration: 0.085,
      attack: 0.006,
      release: 0.055,
      peakGain: 0.10,
      pitchSpread: 18     // Hz range for char-based microvariation
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
  // Track active oscillators so cancelAll can stop them cleanly (some browsers
  // leak short tails if we only ramp gain to 0).
  var activeNodes = [];

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

  function playChar(char, preset) {
    if (!ctx) return; // init() not called yet — silently no-op
    if (shouldSkip(char)) return;

    var p = presets[preset] || presets.default;
    var bus = ensureMaster();
    if (!bus) return;

    tryResume();

    // Char-based microvariation: keeps long strings from sounding like a buzzer.
    var code = String(char).charCodeAt(0) || 0;
    var variance = ((code % 7) - 3) / 3; // -1 .. +1 ish
    var startFreq = p.baseFreq + variance * p.pitchSpread;
    var endFreq = startFreq + p.glide;

    var now;
    try { now = ctx.currentTime; } catch (e) { return; }

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

    var entry = { osc: osc, gain: gain };
    activeNodes.push(entry);

    try { osc.start(now); } catch (e) { /* already started — ignore */ }
    try { osc.stop(releaseEnd + 0.02); } catch (e) {}

    osc.onended = function () {
      try { osc.disconnect(); } catch (e) {}
      try { gain.disconnect(); } catch (e) {}
      var idx = activeNodes.indexOf(entry);
      if (idx >= 0) activeNodes.splice(idx, 1);
    };
  }

  function cancelAll() {
    if (!ctx) { activeNodes.length = 0; return; }
    var now;
    try { now = ctx.currentTime; } catch (e) { now = 0; }
    var nodes = activeNodes.slice();
    activeNodes.length = 0;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      try { n.gain.gain.cancelScheduledValues(now); } catch (e) {}
      try { n.gain.gain.setValueAtTime(0.0001, now); } catch (e) {}
      try { n.osc.stop(now + 0.005); } catch (e) {}
      try { n.osc.disconnect(); } catch (e) {}
      try { n.gain.disconnect(); } catch (e) {}
    }
  }

  global.PonoBabble = {
    init: init,
    playChar: playChar,
    cancelAll: cancelAll,
    presets: presets
  };
})(typeof window !== 'undefined' ? window : this);
