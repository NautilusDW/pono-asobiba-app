// ── common/se.js ──
// Shared Sound Effect player for all games
// Usage: <script src="../common/se.js"></script>
// Then: SE.play('common/tap') or SE.play('breakout/brick')
// Path resolves to: assets/sounds/se/{name}.mp3

(function() {
  'use strict';

  let ctx = null;
  const cache = {};
  const SE_BASE = (function() {
    // Detect base path from script location
    const scripts = document.querySelectorAll('script[src*="common/se.js"]');
    if (scripts.length) {
      const src = scripts[scripts.length - 1].getAttribute('src');
      return src.replace('common/se.js', 'assets/sounds/se/');
    }
    return '../assets/sounds/se/';
  })();

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Unlock AudioContext on first user interaction (iOS requirement)
  function unlock() {
    getCtx();
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('click', unlock);
  }
  document.addEventListener('touchstart', unlock, { once: true });
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('click', unlock, { once: true });

  async function loadBuffer(name) {
    if (cache[name]) return cache[name];
    const url = SE_BASE + name + '.mp3';
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const audio = await getCtx().decodeAudioData(buf);
      cache[name] = audio;
      return audio;
    } catch (e) {
      console.warn('[SE] Failed to load:', name, e);
      return null;
    }
  }

  // Preload sounds for faster first play
  function preload(names) {
    names.forEach(n => loadBuffer(n));
  }

  // Play a sound effect
  // name: e.g. 'common/tap', 'breakout/brick'
  // options: { volume: 0-1 (default 0.7) }
  async function play(name, options) {
    const opts = Object.assign({ volume: 0.7 }, options);
    const buffer = await loadBuffer(name);
    if (!buffer) return;
    const c = getCtx();
    const source = c.createBufferSource();
    source.buffer = buffer;
    const gain = c.createGain();
    gain.gain.value = opts.volume;
    source.connect(gain);
    gain.connect(c.destination);
    source.start(0);
  }

  window.SE = { play, preload, getCtx };
})();
