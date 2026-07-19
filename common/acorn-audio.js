// ── common/acorn-audio.js ──
// Per-game impact SFX registry for acorn reward toast / modal.
// Usage:
//   <script src="../common/acorn-audio.js"></script>
//   PonoAcornAudio.register('oto', { impact: 'assets/audio/sfx/oto/oto_acorn_receive.mp3', volume: 0.45 });
//   PonoAcornAudio.play('oto');             // plays registered SFX, falls back to don.mp3 if unregistered
//   PonoAcornAudio.getDefault();            // { impact: 'assets/audio/sfx/quiz/don.mp3', volume: 0.48 }
//
// Backward compatibility:
//   game-stickers.js _playRewardImpactSfx() previously hard-coded don.mp3 @ 0.48.
//   PonoAcornAudio.play(gameId) preserves that behavior when gameId is unknown.
//
// SSR/Node safe: becomes a no-op when window is undefined.

(function (global) {
  'use strict';

  if (typeof global === 'undefined' || global === null) {
    // Node / SSR — nothing to attach to.
    return;
  }

  // Idempotent: don't clobber if already loaded (e.g. multiple game pages on same shell).
  if (global.PonoAcornAudio && global.PonoAcornAudio.__pono_acorn_audio__) {
    return;
  }

  var DEFAULT_CONFIG = Object.freeze({
    impact: 'assets/audio/sfx/acorn/acorn_get_festive_20260628.mp3',
    volume: 0.55
  });

  // Map<gameId, { impact, volume }>
  var registry = new Map();

  function clampVolume(v) {
    if (typeof v !== 'number' || !isFinite(v)) return DEFAULT_CONFIG.volume;
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  }

  function normalizeConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') return null;
    var impact = (typeof cfg.impact === 'string' && cfg.impact.trim()) ? cfg.impact.trim() : null;
    if (!impact) return null;
    return {
      impact: impact,
      volume: clampVolume(cfg.volume != null ? cfg.volume : DEFAULT_CONFIG.volume)
    };
  }

  function register(gameId, cfg) {
    if (typeof gameId !== 'string' || !gameId) return false;
    var normalized = normalizeConfig(cfg);
    if (!normalized) return false;
    registry.set(gameId, normalized);
    return true;
  }

  function unregister(gameId) {
    if (typeof gameId !== 'string' || !gameId) return false;
    return registry.delete(gameId);
  }

  function get(gameId) {
    if (typeof gameId === 'string' && registry.has(gameId)) {
      return registry.get(gameId);
    }
    return { impact: DEFAULT_CONFIG.impact, volume: DEFAULT_CONFIG.volume };
  }

  function getDefault() {
    return { impact: DEFAULT_CONFIG.impact, volume: DEFAULT_CONFIG.volume };
  }

  function has(gameId) {
    return typeof gameId === 'string' && registry.has(gameId);
  }

  function resolveSrc(src) {
    if (!src || typeof src !== 'string') return src;
    if (/^(?:https?:|data:|blob:|\/|\.\.?\/)/.test(src)) return src;
    if (src.indexOf('assets/') === 0) return '/' + src;
    return src;
  }

  // play(gameId, opts?) -> Promise<HTMLAudioElement | null>
  // opts: { volume?: number, src?: string } — overrides for one-shot playback.
  // Always resolves; autoplay failures are caught silently (returns null).
  //
  // Phase 1 callers (acorn-modal.js playSafe, game-stickers.js
  // _playRewardImpactSfx) intentionally ignore the returned Promise — audio is
  // non-critical and we preserve the legacy fire-and-forget behavior.
  // Callers MAY optionally await play() to detect autoplay rejection
  // (e.g. iOS Safari without user gesture) and surface a UI hint. Phase 2
  // may add retry-on-user-gesture logic.
  function play(gameId, opts) {
    var cfg = get(gameId);
    var src = (opts && typeof opts.src === 'string' && opts.src.trim()) ? opts.src.trim() : cfg.impact;
    var volume = (opts && opts.volume != null) ? clampVolume(opts.volume) : cfg.volume;

    if (typeof global.Audio !== 'function') {
      return Promise.resolve(null);
    }

    var audio;
    try {
      audio = new global.Audio();
      audio.src = resolveSrc(src);
      audio.volume = volume;
      audio.preload = 'auto';
    } catch (e) {
      return Promise.resolve(null);
    }

    var p;
    try {
      p = audio.play();
    } catch (e) {
      return Promise.resolve(null);
    }

    if (p && typeof p.then === 'function') {
      return p.then(function () { return audio; }, function () { return null; }).catch(function () { return null; });
    }
    // Older browsers return undefined from play(); treat as fire-and-forget success.
    return Promise.resolve(audio);
  }

  var api = {
    __pono_acorn_audio__: true,
    register: register,
    unregister: unregister,
    has: has,
    get: get,
    getDefault: getDefault,
    play: play
  };

  // Read-only-ish: prevent accidental whole-object replacement by downstream code.
  try {
    Object.defineProperty(global, 'PonoAcornAudio', {
      value: api,
      writable: false,
      configurable: false,
      enumerable: true
    });
  } catch (e) {
    // Fallback: plain assignment if defineProperty fails (e.g. strict CSP sandbox).
    global.PonoAcornAudio = api;
  }
})(typeof window !== 'undefined' ? window : null);
