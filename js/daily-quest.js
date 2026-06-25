(function () {
  if (typeof window === 'undefined') return;
  if (window.PonoDailyQuest) return;

  var LS_KEY = 'pono_daily_quest_v1';
  var SCHEMA_VERSION = 1;
  var BENTO_MARKER = 'bento_sk_intro_done';

  function safeGet(k) { try { return window.localStorage && window.localStorage.getItem(k); } catch (_) { return null; } }
  function safeSet(k, v) { try { window.localStorage && window.localStorage.setItem(k, v); return true; } catch (_) { return false; } }
  function safeRemove(k) { try { window.localStorage && window.localStorage.removeItem(k); } catch (_) {} }

  function isBentoTutorialComplete() { return safeGet(BENTO_MARKER) === '1'; }

  var QUEST_POOL = [
    { id: 'maze',     label: 'めいろ',       href: 'maze/',     eligible: function () { return true; } },
    { id: 'quizland', label: 'クイズランド', href: 'quizland/', eligible: function () { return true; } },
    { id: 'puzzle',   label: 'パズル',       href: 'puzzle/',   eligible: function () { return true; } },
    { id: 'oto',      label: 'おとあそび',   href: 'oto/',      eligible: function () { return true; } },
    { id: 'bento',    label: 'おべんとう',   href: 'bento/',    eligible: function () { return isBentoTutorialComplete(); } },
  ];

  function jstNow() { return new Date(Date.now() + 9 * 60 * 60 * 1000); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function todayKeyJST() {
    var j = jstNow();
    return j.getUTCFullYear() + '-' + pad2(j.getUTCMonth() + 1) + '-' + pad2(j.getUTCDate());
  }
  function isoJST() {
    var j = jstNow();
    return j.getUTCFullYear() + '-' + pad2(j.getUTCMonth() + 1) + '-' + pad2(j.getUTCDate()) +
           'T' + pad2(j.getUTCHours()) + ':' + pad2(j.getUTCMinutes()) + ':' + pad2(j.getUTCSeconds()) + '+09:00';
  }

  function fnv1aHash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
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
  function pickForDate(date) {
    var eligible = QUEST_POOL.filter(function (q) { return q.eligible(); });
    if (eligible.length === 0) return QUEST_POOL[0];
    var rng = mulberry32(fnv1aHash(date));
    rng(); // discard first output: mulberry32's first step from low-entropy seeds is mildly biased
    return eligible[Math.floor(rng() * eligible.length) % eligible.length];
  }

  // In-memory mirror for LS-failure fallback (private mode / quota errors).
  var _memState = null;

  function readState() {
    var raw = safeGet(LS_KEY);
    if (raw == null) return _memState;
    try {
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      if (obj.schemaVersion !== SCHEMA_VERSION) return null;
      if (typeof obj.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(obj.date)) return null;
      return obj;
    } catch (_) { return null; }
  }
  function writeState(state) { _memState = state; safeSet(LS_KEY, JSON.stringify(state)); }
  function freshState(date) {
    return { schemaVersion: SCHEMA_VERSION, date: date, questId: pickForDate(date).id, clearedAt: null, bonusUsedAt: null };
  }
  function ensureToday() {
    var today = todayKeyJST();
    var s = readState();
    // Discard if missing, mismatched schema, or date != today (incl. future-date attack).
    if (!s || s.date !== today) { s = freshState(today); writeState(s); }
    return s;
  }
  function questById(id) {
    for (var i = 0; i < QUEST_POOL.length; i++) if (QUEST_POOL[i].id === id) return QUEST_POOL[i];
    return null;
  }

  function getToday() {
    var s = ensureToday();
    var q = questById(s.questId) || QUEST_POOL[0];
    return { date: s.date, questId: s.questId, label: q.label, href: q.href, clearedAt: s.clearedAt, bonusUsedAt: s.bonusUsedAt };
  }
  function markCleared(gameId) {
    var s = ensureToday();
    if (typeof gameId !== 'string' || gameId !== s.questId) return { wasMatch: false, alreadyCleared: false, state: getToday() };
    if (s.clearedAt) return { wasMatch: true, alreadyCleared: true, state: getToday() };
    s.clearedAt = isoJST(); writeState(s);
    return { wasMatch: true, alreadyCleared: false, state: getToday() };
  }
  function isClearedToday() { return !!ensureToday().clearedAt; }
  function isBonusActive() { var s = ensureToday(); return !!s.clearedAt && !s.bonusUsedAt; }
  function markBonusUsed() {
    var s = ensureToday();
    if (!s.clearedAt || s.bonusUsedAt) return false;
    s.bonusUsedAt = isoJST(); writeState(s); return true;
  }
  function reset() { _memState = null; safeRemove(LS_KEY); }

  var _subscribers = [];
  function subscribe(cb) {
    if (typeof cb !== 'function') return function () {};
    _subscribers.push(cb);
    return function () { _subscribers = _subscribers.filter(function (x) { return x !== cb; }); };
  }
  function notify() {
    var snap = getToday();
    for (var i = 0; i < _subscribers.length; i++) { try { _subscribers[i](snap); } catch (_) {} }
  }

  var _lastSeenDate = todayKeyJST();
  function checkRollover() {
    var today = todayKeyJST();
    if (_lastSeenDate !== today) { _lastSeenDate = today; ensureToday(); notify(); }
  }
  ensureToday();

  window.addEventListener('storage', function (e) {
    if (e && e.key && e.key !== LS_KEY) return;
    _memState = null; // force LS re-read
    notify();
  });
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') checkRollover();
    });
  }
  try { window.setInterval(checkRollover, 60000); } catch (_) {}

  // v1573 phase 6 must-fix #2: filter to game-clear events only.
  // donguri_shop / daily_gacha 由来の grant は markCleared させない (お題未クリアで bonus 抜け防止)
  var QUEST_CLEAR_EVENTS = ['clear', 'stage_clear', 'perfect', 'complete'];
  window.addEventListener('PonoGameStickerGranted', function (e) {
    if (!e || !e.detail || !e.detail.gameId) return;
    var ev = e.detail.event || 'clear';
    if (QUEST_CLEAR_EVENTS.indexOf(ev) < 0) return;
    var r = markCleared(e.detail.gameId);
    if (r.wasMatch && !r.alreadyCleared) {
      try {
        window.dispatchEvent(new window.CustomEvent('PonoDailyQuestCleared', { detail: { questId: e.detail.gameId, date: r.state.date } }));
      } catch (_) {}
    }
  });

  window.PonoDailyQuest = {
    getToday: getToday,
    markCleared: markCleared,
    isClearedToday: isClearedToday,
    isBonusActive: isBonusActive,
    markBonusUsed: markBonusUsed,
    reset: reset,
    QUEST_POOL: QUEST_POOL.map(function (q) { return { id: q.id, label: q.label, href: q.href }; }),
    subscribe: subscribe,
  };
})();
