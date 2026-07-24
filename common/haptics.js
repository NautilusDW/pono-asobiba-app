// ── common/haptics.js ──
// Shared Haptic feedback (振動) helper for Pono あそびば.
// Usage: <script src="../common/haptics.js"></script>
//   then: Haptics.fire('stickerPaste') / Haptics.fire('pageTurn')
// iOS Safari は Vibration API 未対応のため WebAudio sine で代替鳴動。
// localStorage 'pono_haptics_off' = '1' で完全 opt-out (毎回参照で即時反映)。

(function () {
  'use strict';

  var PATTERNS = Object.freeze({
    stickerPaste: 30,
    pageTurn: 8,
    // ── Daily Gacha (v1910) ─────────────────────────────────
    // turn 1/2: 軽い click / turn 3: 明確な final punch。
    // capsuleCrack: reveal (is-opened) 瞬間の割れ。
    // rare/super BadgePop: badge pop animation (openDelay + 420ms) と同期。
    // MIN_INTERVAL_MS=180 gate: turn 間隔 & (capsuleCrack→BadgePop 420ms) は自然通過。
    gachaTurn1_2: 12,
    gachaTurn3: [20, 50, 20],
    capsuleCrack: 100,
    rareBadgePop: [15, 40, 15, 80],
    superBadgePop: [10, 30, 10, 30, 10, 120],
    // ── guragura-seesaw (v1) ────────────────────────────────
    // near-balance: 「あとちょっと！」rising edge の単発ワンショット。
    // 頻繁に発火しうる (毎ラウンド最大1回程度) ため他パターンより短く軽量にする。
    nearBalance: 8,
  });

  var disabled = false;
  var iosAudioCtx = null;
  var iosCtxUnlocked = false;
  var iosLastFireTs = 0;
  // グローバル throttle: 同一 pattern を短時間で連発しない (drag 中の jitter 対策)。
  // navigator.vibrate 側 (Android) も、 iOS WebAudio fallback 側もこの gate を通す。
  var lastFireByPattern = Object.create(null);
  var MIN_INTERVAL_MS = 180;

  function isIOS() {
    try {
      var ua = navigator.userAgent || '';
      var iPadOS13Plus = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
      return /iPad|iPhone|iPod/.test(ua) || iPadOS13Plus;
    } catch (_) {
      return false;
    }
  }

  function ensureIosCtx() {
    try {
      if (!iosAudioCtx) {
        var Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return null;
        iosAudioCtx = new Ctor();
      }
      if (iosAudioCtx.state === 'suspended') {
        iosAudioCtx.resume();
      }
      return iosAudioCtx;
    } catch (_) {
      return null;
    }
  }

  function unlockIosCtx() {
    if (iosCtxUnlocked) return;
    iosCtxUnlocked = true;
    ensureIosCtx();
  }

  // iOS autoplay policy 対策: 初回 gesture で ctx を作成・resume。
  // Android/desktop では navigator.vibrate 経路のみで AudioContext は不要 → listener 登録もスキップ。
  try {
    if (isIOS()) {
      document.addEventListener('touchstart', unlockIosCtx, { once: true, passive: true });
      document.addEventListener('pointerdown', unlockIosCtx, { once: true, passive: true });
      document.addEventListener('click', unlockIosCtx, { once: true, passive: true });
    }
  } catch (_) {}

  function iosAudioFallback(ms) {
    try {
      var now = Date.now();
      if (now - iosLastFireTs < 100) return;
      iosLastFireTs = now;
      var ctx = ensureIosCtx();
      if (!ctx) return;
      var isShort = ms < 20;
      var frequency = isShort ? 660 : 440;
      var duration = isShort ? 0.012 : 0.020;
      var gainValue = isShort ? 0.10 : 0.15;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.value = gainValue;
      osc.connect(gain);
      gain.connect(ctx.destination);
      var t0 = ctx.currentTime;
      osc.start(t0);
      osc.stop(t0 + duration);
    } catch (_) {}
  }

  function isOptedOut() {
    try {
      return localStorage.getItem('pono_haptics_off') === '1';
    } catch (_) {
      return false;
    }
  }

  function fire(patternName) {
    try {
      if (isOptedOut()) return;
      if (disabled) return;
      var ms = PATTERNS[patternName];
      // v1910: pattern は number (単発) or number[] (Android vibrate パターン)
      var isArr = Array.isArray(ms);
      if (typeof ms !== 'number' && !isArr) return;
      // 全 platform 共通の throttle: 同一 pattern の連発を抑制
      // (slider drag 中に progress が jitter で edge を再横断しても 1 回で止める)。
      var now = Date.now();
      var last = lastFireByPattern[patternName] || 0;
      if (now - last < MIN_INTERVAL_MS) return;
      lastFireByPattern[patternName] = now;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(ms);
        return;
      }
      if (isIOS()) {
        // 配列パターンは代表 duration (最大要素) で fallback tone 発火。
        var fallbackMs = isArr ? Math.max.apply(null, ms.filter(function (n, i) { return i % 2 === 0; })) : ms;
        iosAudioFallback(fallbackMs);
      }
    } catch (_) {}
  }

  function isEnabled() {
    try {
      if (isOptedOut()) return false;
      if (disabled) return false;
      return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    } catch (_) {
      return false;
    }
  }

  function setEnabled(flag) {
    disabled = !flag;
  }

  window.Haptics = {
    fire: fire,
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    PATTERNS: PATTERNS,
  };
})();
