// common/narration.js — AI音声ナレーション再生ライブラリ
//
// 使い方（ゲーム側）:
//   <script src="../common/narration.js"></script>
//   Narration.play('quizland:order_color:0:q');
//   Narration.setMode('auto' | 'tap' | 'off');
//   Narration.prefetch(['quizland:...', 'quizland:...']);
//
// 動作:
//   - assets/tts/manifest.json をロード → textId → ファイルパス解決
//   - HTMLAudioElement で再生
//   - manifest 未反映 or key 不一致 → 警告なしで無音
//   - localStorage で mode / volume を永続化

(function(global) {
  var MANIFEST_URL = null;  // 相対パス自動解決
  function resolveManifestUrl() {
    if (MANIFEST_URL) return MANIFEST_URL;
    // 各ゲーム（/quizland/, /wordmatch/, ...）から相対で ../assets/tts/manifest.json
    var loc = location.pathname;
    // ルートからの階層数を雑に検出（ゲームは通常1階層下）
    var depth = (loc.match(/\//g) || []).length - 1;
    var prefix = '';
    for (var i = 0; i < depth; i++) prefix += '../';
    MANIFEST_URL = prefix + 'assets/tts/manifest.json';
    return MANIFEST_URL;
  }
  function assetUrl(file) {
    var root = resolveManifestUrl().replace(/manifest\.json$/, '');
    return root + file;
  }

  var manifestPromise = null;
  var manifest = null;
  var cache = {};                   // key → HTMLAudioElement
  var currentPlaying = null;        // 現在再生中の Audio（重複再生を止める）
  var mode = 'tap';                 // auto | tap | off
  var volume = 0.9;
  var rate = 1.0;

  // localStorage 初期化
  try {
    var m = localStorage.getItem('narration_mode');
    if (m === 'auto' || m === 'tap' || m === 'off') mode = m;
    var v = parseFloat(localStorage.getItem('narration_volume'));
    if (!isNaN(v) && v >= 0 && v <= 1) volume = v;
    var r = parseFloat(localStorage.getItem('narration_rate'));
    if (!isNaN(r) && r >= 0.5 && r <= 2) rate = r;
  } catch(e) {}

  function load() {
    if (manifestPromise) return manifestPromise;
    manifestPromise = fetch(resolveManifestUrl(), { cache: 'no-cache' })
      .then(function(r) {
        if (!r.ok) return { version: 1, entries: {} };
        return r.json();
      })
      .then(function(m) {
        manifest = m || { version: 1, entries: {} };
        if (!manifest.entries) manifest.entries = {};
        return manifest;
      })
      .catch(function() {
        manifest = { version: 1, entries: {} };
        return manifest;
      });
    return manifestPromise;
  }

  var SAFE_FILE_RE = /^[a-zA-Z0-9_\-/]+\.wav$/;
  function resolveUrl(key) {
    if (!manifest || !manifest.entries) return null;
    var e = manifest.entries[key];
    if (!e || !e.file) return null;
    if (!SAFE_FILE_RE.test(e.file) || e.file.indexOf('..') !== -1) return null;
    return assetUrl(e.file);
  }

  function getAudio(key) {
    if (cache[key]) return cache[key];
    var url = resolveUrl(key);
    if (!url) return null;
    var a = new Audio(url);
    a.preload = 'auto';
    cache[key] = a;
    return a;
  }

  function stopCurrent() {
    if (currentPlaying) {
      try { currentPlaying.pause(); currentPlaying.currentTime = 0; } catch(_) {}
      currentPlaying = null;
    }
  }

  var api = {
    load: load,
    getMode: function() { return mode; },
    setMode: function(m) {
      if (m !== 'auto' && m !== 'tap' && m !== 'off') return;
      mode = m;
      try { localStorage.setItem('narration_mode', m); } catch(_) {}
      if (m === 'off') stopCurrent();
    },
    getVolume: function() { return volume; },
    setVolume: function(v) {
      v = Math.max(0, Math.min(1, parseFloat(v) || 0));
      volume = v;
      try { localStorage.setItem('narration_volume', String(v)); } catch(_) {}
    },
    getRate: function() { return rate; },
    setRate: function(r) {
      r = Math.max(0.5, Math.min(2, parseFloat(r) || 1));
      rate = r;
      try { localStorage.setItem('narration_rate', String(r)); } catch(_) {}
    },
    hasEntry: function(key) {
      if (!manifest) return false;
      return !!(manifest.entries && manifest.entries[key]);
    },
    prefetch: function(keys) {
      return load().then(function() {
        (keys || []).forEach(function(k) { getAudio(k); });
      });
    },
    play: function(key) {
      if (mode === 'off') return Promise.resolve();
      return load().then(function() {
        var a = getAudio(key);
        if (!a) return;                       // 無音フォールバック
        stopCurrent();
        try {
          a.volume = volume;
          a.playbackRate = rate;
          a.currentTime = 0;
        } catch(_) {}
        currentPlaying = a;
        return a.play().catch(function() { /* autoplay blocked, ignore */ });
      });
    },
    playIfAuto: function(key) {
      if (mode !== 'auto') return Promise.resolve();
      return api.play(key);
    },
    stop: stopCurrent
  };

  global.Narration = api;
})(typeof window !== 'undefined' ? window : globalThis);
