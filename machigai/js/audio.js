/* まちがいさがしランド — audio.js
 * engine担当。WebAudio APIでSFX/BGMをリアルタイム合成する。音声ファイルは一切使わない。
 * window.MSL.Audio に薄いAPIを公開する。
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'msl_muted_v1';

  var ctx = null;
  var muted = false;
  var bgmTimer = null;
  var bgmStep = 0;
  var masterGain = null;

  function loadMuted() {
    try {
      var v = window.localStorage.getItem(STORAGE_KEY);
      return v === '1';
    } catch (e) {
      return false;
    }
  }

  function saveMuted(v) {
    try {
      window.localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    } catch (e) {
      /* localStorage不可でも無視 */
    }
  }

  muted = loadMuted();

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : 1;
      masterGain.connect(ctx.destination);
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  /** iOS/Safari向け: ユーザー操作直後に呼んでロック解除する */
  function resume() {
    var c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') {
      c.resume().catch(function () {});
    }
  }

  function isSupported() {
    return !!ensureCtx();
  }

  /* ---- 単純な音源生成ヘルパ ---- */

  function playTone(freq, startOffset, duration, type, peakGain) {
    var c = ensureCtx();
    if (!c || muted) return;
    try {
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || 'square';
      var t0 = c.currentTime + (startOffset || 0);
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peakGain || 0.18, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch (e) {
      /* 合成に失敗しても無視 */
    }
  }

  function playSlide(freqFrom, freqTo, startOffset, duration, type, peakGain) {
    var c = ensureCtx();
    if (!c || muted) return;
    try {
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || 'sine';
      var t0 = c.currentTime + (startOffset || 0);
      osc.frequency.setValueAtTime(freqFrom, t0);
      osc.frequency.linearRampToValueAtTime(freqTo, t0 + duration);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peakGain || 0.16, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch (e) {
      /* 無視 */
    }
  }

  /* ---- 効果音 ---- */

  function playTap() {
    playTone(520, 0, 0.08, 'square', 0.12);
  }

  function playCorrect() {
    playTone(660, 0, 0.12, 'square', 0.16);
    playTone(880, 0.09, 0.16, 'square', 0.16);
  }

  function playWrong() {
    playSlide(360, 220, 0, 0.22, 'triangle', 0.14);
  }

  function playHint() {
    playTone(1000, 0, 0.08, 'sine', 0.12);
    playTone(1400, 0.06, 0.1, 'sine', 0.1);
  }

  function playFanfare() {
    var notes = [523, 659, 784, 1047];
    notes.forEach(function (f, i) {
      playTone(f, i * 0.13, 0.22, 'square', 0.16);
    });
  }

  /* ---- BGM: 矩形波+三角波の軽い8bitループ ---- */

  var BGM_NOTES = [392, 440, 523, 440, 392, 349, 392, 523];
  var BGM_STEP_SEC = 0.32;

  function scheduleBgmStep() {
    var c = ensureCtx();
    if (!c) return;
    if (!muted) {
      var freq = BGM_NOTES[bgmStep % BGM_NOTES.length];
      playTone(freq, 0, BGM_STEP_SEC * 0.85, 'triangle', 0.05);
      if (bgmStep % 2 === 0) {
        playTone(freq / 2, 0, BGM_STEP_SEC * 0.85, 'square', 0.03);
      }
    }
    bgmStep++;
  }

  function startBGM() {
    if (bgmTimer) return;
    var c = ensureCtx();
    if (!c) return;
    bgmStep = 0;
    scheduleBgmStep();
    bgmTimer = window.setInterval(scheduleBgmStep, BGM_STEP_SEC * 1000);
  }

  function stopBGM() {
    if (bgmTimer) {
      window.clearInterval(bgmTimer);
      bgmTimer = null;
    }
  }

  /* ---- ミュート管理 ---- */

  function setMuted(v) {
    muted = !!v;
    saveMuted(muted);
    if (masterGain) {
      masterGain.gain.value = muted ? 0 : 1;
    }
  }

  function toggleMuted() {
    setMuted(!muted);
    return muted;
  }

  function isMuted() {
    return muted;
  }

  window.MSL = window.MSL || {};
  window.MSL.Audio = {
    resume: resume,
    isSupported: isSupported,
    playTap: playTap,
    playCorrect: playCorrect,
    playWrong: playWrong,
    playHint: playHint,
    playFanfare: playFanfare,
    startBGM: startBGM,
    stopBGM: stopBGM,
    setMuted: setMuted,
    toggleMuted: toggleMuted,
    isMuted: isMuted
  };
})();
