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
  var AUDIO_VERSION = 'v1311';

  var REGISTRY = {
    tut:        ['tut_01.mp3', 'tut_02.mp3', 'tut_03.mp3'],
    basic_tut:  [
      'basic_tut_01.mp3',
      'basic_tut_02.mp3',
      'basic_tut_03.mp3',
      'basic_tut_04.mp3',
      'basic_tut_05.mp3',
      'basic_tut_06.mp3',
      'basic_tut_07.mp3',
      'basic_tut_08.mp3',
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

  function playFile(file) {
    var a = pool[file];
    if (!a) return null;
    // Stop anything currently playing first.
    stop();
    try { a.currentTime = 0; } catch (_) { /* some browsers throw if not ready */ }
    currentAudio = a;
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
          });
        }
      } catch (err) {
        try { console.warn('[PuzzleVoice] play() threw for', file, err && err.message); } catch (_) {}
      }
    });
    return a;
  }

  function playTut(stepIndex) {
    var list = REGISTRY.tut;
    var i = stepIndex | 0;
    if (i < 0 || i >= list.length) return null;
    var file = list[i];
    lastPlayedId.tut = file;
    return playFile(file);
  }

  function playBasicTut(stepIndex) {
    var list = REGISTRY.basic_tut;
    var i = stepIndex | 0;
    if (i < 0 || i >= list.length) return null;
    var file = list[i];
    lastPlayedId.basic_tut = file;
    return playFile(file);
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

  return {
    playTut: playTut,
    playBasicTut: playBasicTut,
    playRandom: playRandom,
    stop: stop,
    // Exposed for debugging / tests only.
    _registry: REGISTRY,
  };
})();
