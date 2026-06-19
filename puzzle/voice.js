// PuzzleVoice — preloaded HTMLAudioElement pool with simple play() helpers.
// Load this file BEFORE main.js.
//
// Public API:
//   PuzzleVoice.playTut(stepIndex)   - play tutorial line by 0-based step
//   PuzzleVoice.playBasicTut(stepIndex)
//                                    - play real-UI basic tutorial line by 0-based step
//   PuzzleVoice.playRandom(group)    - play a random line from group
//                                      ('clear' | 'all_clear' | 'hint' | 'next_nudge')
//   PuzzleVoice.stop()               - stop whichever audio is currently playing
//
// Notes:
//   - Voice always plays at volume 1.0. Caller is responsible for any BGM
//     ducking if desired (this module never touches BGM).
//   - All play() calls swallow rejection (mobile autoplay block is non-fatal).
//   - For random groups, lastPlayedId is tracked to avoid the same pick twice
//     in a row when the pool has >= 2 entries.
window.PuzzleVoice = (function () {
  'use strict';

  var BASE = '../assets/audio/puzzle/voice/';
  var AUDIO_VERSION = 'v1316';

  var REGISTRY = {
    tut:        ['tut_01.mp3', 'tut_02.mp3', 'tut_03.mp3'],
    basic_tut:  [
      'basic_tut_01.mp3',  // index 0 — intro
      'basic_tut_02.mp3',  // index 1 — drag demo
      'basic_tut_03.mp3',  // index 2 — drag try
      'basic_tut_04.mp3',  // index 3 — done -> peek practice
      'basic_tut_05.mp3',  // index 4 — peek press instruction ("まずは見るボタンを長く押してみよう")
      'basic_tut_06.mp3',  // index 5 — peek explanation ("見るボタンは長く押している間だけ絵が見えるよ")
      'basic_tut_07.mp3',  // index 6 — peek release, plays DURING press ("離すと、元のパズルに戻るよ")
      'basic_tut_08.mp3',  // index 7 — peek stuck note, plays AFTER release ("困った時に使ってね")
      'basic_tut_09.mp3',  // index 8 — hint intro ("次はヒントだよ。ヒントを押すと場所が光るよ")
      'basic_tut_10.mp3',  // index 9 — hint glow ("光った場所へピースを持っていくよ")
      'basic_tut_11.mp3',  // index 10 — finish ("できたね。わからない時は見るとヒントを使ってね")
      'basic_tut_12.mp3',  // index 11 — closing ("これで練習はおしまい。さあ、パズルで遊ぼう。")
    ],
    clear:      ['clear_01.mp3', 'clear_02.mp3', 'clear_03.mp3', 'clear_04.mp3', 'clear_05.mp3'],
    all_clear:  ['all_clear_01.mp3', 'all_clear_02.mp3'],
    hint:       ['hint.mp3'],
    next_nudge: ['next_nudge_01.mp3', 'next_nudge_02.mp3', 'next_nudge_03.mp3'],
  };

  // file id -> HTMLAudioElement
  var pool = {};
  // group -> last played file id (to avoid back-to-back repeats)
  var lastPlayedId = {};
  // The audio currently playing (if any), so stop() can target it.
  var currentAudio = null;
  // Shared AudioContext used only to satisfy the iOS/Safari unlock gesture.
  var unlockCtx = null;
  // True once the (heavy) unlock priming has run inside a real user gesture.
  var unlockPrimed = false;

  function makeAudio(file) {
    var a = new Audio(BASE + file + '?v=' + AUDIO_VERSION);
    a.preload = 'auto';
    a.volume = 1.0;
    // Avoid the browser re-fetching across page navigations within session.
    try { a.load(); } catch (_) { /* noop */ }
    return a;
  }

  // Preload one Audio per file (cheap, ~22 elements total).
  Object.keys(REGISTRY).forEach(function (group) {
    REGISTRY[group].forEach(function (file) {
      if (!pool[file]) pool[file] = makeAudio(file);
    });
  });

  // playFile(file, onReject)
  //   onReject (optional): invoked once if play() rejects/throws. Lets the
  //   caller's state machine advance promptly instead of waiting on a long
  //   fallback timer when mobile autoplay blocks the clip (NotAllowedError).
  function playFile(file, onReject) {
    var a = pool[file];
    if (!a) {
      // No audio element at all — let the caller advance immediately.
      if (typeof onReject === 'function') {
        try { onReject(null); } catch (_) {}
      }
      return null;
    }
    // Stop anything currently playing first.
    stop();
    try { a.currentTime = 0; } catch (_) { /* some browsers throw if not ready */ }
    currentAudio = a;
    var rejected = false;
    function fireReject(err) {
      if (rejected) return;
      rejected = true;
      // Only advance if this call is still the active one.
      if (currentAudio !== a) return;
      if (typeof onReject === 'function') {
        try { onReject(err || null); } catch (_) {}
      }
    }
    // Defer play() to a microtask so we break out of any synchronous chain from
    // a previous audio's 'ended' handler. On iOS Safari, calling play() on a
    // pooled audio synchronously from another audio's ended callback can
    // silently reject with NotAllowedError or AbortError. Deferring lets the
    // previous audio's lifecycle settle and ensures listeners attached by the
    // caller (e.g. 'ended', 'loadedmetadata') are wired up before play starts.
    Promise.resolve().then(function () {
      // Bail if a later playFile/stop superseded this call.
      if (currentAudio !== a) return;
      try {
        var p = a.play();
        if (p && typeof p.catch === 'function') {
          p.catch(function (err) {
            // Surface rejection so dev can spot real-browser failures.
            try { console.warn('[PuzzleVoice] play() rejected for', file, err && err.name); } catch (_) {}
            fireReject(err);
          });
        }
      } catch (err) {
        try { console.warn('[PuzzleVoice] play() threw for', file, err && err.message); } catch (_) {}
        fireReject(err);
      }
    });
    return a;
  }

  function playTut(stepIndex, onReject) {
    var list = REGISTRY.tut;
    var i = stepIndex | 0;
    if (i < 0 || i >= list.length) return null;
    var file = list[i];
    lastPlayedId.tut = file;
    return playFile(file, onReject);
  }

  function playBasicTut(stepIndex, onReject) {
    var list = REGISTRY.basic_tut;
    var i = stepIndex | 0;
    if (i < 0 || i >= list.length) {
      // Out-of-range index: there is no clip to play, so advance immediately.
      if (typeof onReject === 'function') { try { onReject(null); } catch (_) {} }
      return null;
    }
    var file = list[i];
    lastPlayedId.basic_tut = file;
    return playFile(file, onReject);
  }

  function playRandom(group) {
    var list = REGISTRY[group];
    if (!list || list.length === 0) return null;
    var pick;
    if (list.length === 1) {
      pick = list[0];
    } else {
      var last = lastPlayedId[group];
      // try a few times to avoid repeating last
      for (var i = 0; i < 5; i++) {
        pick = list[Math.floor(Math.random() * list.length)];
        if (pick !== last) break;
      }
    }
    lastPlayedId[group] = pick;
    return playFile(pick);
  }

  function stop() {
    if (!currentAudio) return;
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (_) { /* noop */ }
    currentAudio = null;
  }

  // unlock() — MUST be called synchronously from inside a real user gesture
  // (pointerdown / touchstart / click). On iOS Safari and mobile Chrome the
  // user-activation token granted by a tap expires after a short window, so a
  // gesture-less a.play() several seconds later (e.g. the auto-chained 見る /
  // ヒント narration) rejects with NotAllowedError and the clip is silent.
  //
  // To keep later gesture-less playback permitted we do two things here, while
  // we still hold a fresh activation token:
  //   1. Create/resume a shared AudioContext and play a 1-sample silent buffer
  //      (unlocks the Web Audio path; harmless if already unlocked elsewhere).
  //   2. Prime every pooled HTMLAudioElement with a muted play()+pause(). Once
  //      an element has been started inside a gesture, the browser treats it as
  //      user-approved and permits subsequent gesture-less play() calls on it.
  //
  // The heavy priming runs once (idempotent); the AudioContext resume is cheap
  // and may run every call so a re-suspended context gets revived.
  function unlock() {
    // (1) AudioContext: create/resume on every call (cheap, revives if needed).
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        if (!unlockCtx) unlockCtx = new Ctx();
        if (unlockCtx.state === 'suspended' && typeof unlockCtx.resume === 'function') {
          unlockCtx.resume().catch(function () {});
        }
        // Play a 1-sample silent buffer to satisfy the gesture requirement.
        try {
          var buf = unlockCtx.createBuffer(1, 1, 22050);
          var src = unlockCtx.createBufferSource();
          src.buffer = buf;
          src.connect(unlockCtx.destination);
          if (typeof src.start === 'function') src.start(0);
          else if (typeof src.noteOn === 'function') src.noteOn(0);
        } catch (_) { /* noop */ }
      }
    } catch (_) { /* noop */ }

    // (2) Prime pooled HTMLAudioElements once. Muted play()+pause() inside the
    // gesture marks each element as user-approved for later autoplay.
    if (unlockPrimed) return;
    unlockPrimed = true;
    Object.keys(pool).forEach(function (file) {
      var a = pool[file];
      if (!a) return;
      try {
        var prevMuted = a.muted;
        var prevVol = a.volume;
        a.muted = true;
        var p = a.play();
        var restore = function () {
          try { a.pause(); } catch (_) {}
          try { a.currentTime = 0; } catch (_) {}
          a.muted = prevMuted;
          a.volume = prevVol;
        };
        if (p && typeof p.then === 'function') {
          p.then(restore, function () {
            // Restore mute/volume even if priming rejected (still helps on some
            // engines that count the attempt as activation).
            a.muted = prevMuted;
            a.volume = prevVol;
          });
        } else {
          restore();
        }
      } catch (_) { /* noop */ }
    });
  }

  return {
    playTut: playTut,
    playBasicTut: playBasicTut,
    playRandom: playRandom,
    stop: stop,
    unlock: unlock,
    // Exposed for debugging / tests only.
    _registry: REGISTRY,
  };
})();
