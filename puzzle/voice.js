// PuzzleVoice — preloaded HTMLAudioElement pool with simple play() helpers.
// Load this file BEFORE main.js.
//
// Public API:
//   PuzzleVoice.playTut(stepIndex)   - play tutorial line by 0-based step
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

  var REGISTRY = {
    tut:        ['tut_01.mp3', 'tut_02.mp3', 'tut_03.mp3'],
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
    var a = new Audio(BASE + file);
    a.preload = 'auto';
    a.volume = 1.0;
    // Avoid the browser re-fetching across page navigations within session.
    try { a.load(); } catch (_) { /* noop */ }
    return a;
  }

  // Preload one Audio per file (cheap, ~14 elements total).
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
    var p = a.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () { /* autoplay blocked — silent */ });
    }
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
    playRandom: playRandom,
    stop: stop,
    // Exposed for debugging / tests only.
    _registry: REGISTRY,
  };
})();
