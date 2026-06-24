(function () {
  'use strict';

  if (window.PonoDailyChallenge) return;

  var LS_KEY = 'pono_daily_challenge';

  var CANDIDATES = [
    { id: 'maze',          label: 'めいろ',         href: 'maze/' },
    { id: 'quizland',      label: 'クイズランド',   href: 'quizland/' },
    { id: 'bento',         label: 'おべんとう',     href: 'bento/' },
    { id: 'puzzle',        label: 'パズル',         href: 'puzzle/' },
    { id: 'oto',           label: 'おとあそび',     href: 'oto/' },
    { id: 'breakout',      label: 'ボウリング',     href: 'breakout/' },
    { id: 'starparodier',  label: 'スター',         href: 'starparodier/' },
    { id: 'undersea-cave', label: 'かいてい',       href: 'undersea-cave/' }
  ];

  // acorns.js:53-59 と完全一致
  function todayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  // 文字列を 32bit 整数へ
  function hashString(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  // mulberry32 — seed から deterministic な [0,1)
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function readRaw() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      if (typeof obj.date !== 'string' || typeof obj.gameId !== 'string') return null;
      return obj;
    } catch (e) {
      return null;
    }
  }

  function writeRaw(state) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function findCandidate(gameId) {
    for (var i = 0; i < CANDIDATES.length; i++) {
      if (CANDIDATES[i].id === gameId) return CANDIDATES[i];
    }
    return null;
  }

  function decorate(state) {
    var c = findCandidate(state.gameId);
    return {
      date: state.date,
      gameId: state.gameId,
      label: c ? c.label : state.gameId,
      href: c ? c.href : '',
      completed: !!state.completed,
      claimed: !!state.claimed
    };
  }

  function pickForDate(dateStr) {
    var rng = mulberry32(hashString(dateStr));
    var idx = Math.floor(rng() * CANDIDATES.length) % CANDIDATES.length;
    return CANDIDATES[idx];
  }

  function getToday() {
    var today = todayKey();
    var state = readRaw();
    if (state && state.date === today && findCandidate(state.gameId)) {
      return decorate(state);
    }
    var pick = pickForDate(today);
    var next = {
      date: today,
      gameId: pick.id,
      completed: false,
      claimed: false
    };
    writeRaw(next);
    return decorate(next);
  }

  function markComplete(gameId) {
    var current = getToday();
    var wasMatch = (current.gameId === gameId);
    var alreadyCompleted = current.completed;
    if (wasMatch && !alreadyCompleted) {
      var state = readRaw() || {
        date: current.date, gameId: current.gameId, completed: false, claimed: false
      };
      state.completed = true;
      writeRaw(state);
      current = decorate(state);
    }
    return {
      wasMatch: wasMatch,
      alreadyCompleted: alreadyCompleted,
      state: current
    };
  }

  function claim() {
    var current = getToday();
    if (!current.completed || current.claimed) return false;
    var state = readRaw();
    if (!state || state.date !== current.date) return false;
    state.claimed = true;
    writeRaw(state);
    return true;
  }

  function reset() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch (e) {}
  }

  window.PonoDailyChallenge = {
    getToday: getToday,
    markComplete: markComplete,
    claim: claim,
    reset: reset,
    CANDIDATES: CANDIDATES.slice()
  };
})();
