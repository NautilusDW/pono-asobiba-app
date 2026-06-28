// common/acorn-copy-loader.js
// acorn-copy.json を fetch して window.PonoAcornCopy.get(gameId, state) として公開する。
//
// 期待される JSON schema (acorn-copy.json):
//   {
//     "version": 1,
//     "games": {
//       "<gameId>": {
//         "idle":    { "title": "...", "main": "...", "copy": "..." },
//         "capped":  { ... },
//         "perfect": { ... }
//       }
//     },
//     "default": { "idle": {...}, "capped": {...}, "perfect": {...} }
//   }
//
// acorn-modal.js の normalizeCopy() がフィールドを {kicker, label, ariaLabel}
// にマップする (title→kicker, main→label, copy は補助)。
//
// このスクリプトは acorn-modal.js より前に読み込むこと。
// fetch は非同期だが、 PonoAcornCopy オブジェクト自体は即座に露出される
// (内部 _ready フラグで未ロード時は null を返してフォールバック動作になる)。
//
// 失敗時 (404 / parse error 等) は silent — modal は DEFAULT_COPY を使う。
//
// 非モジュール ES script 想定で window.PonoAcornCopy に露出する。
(function (window) {
  'use strict';

  if (!window || !window.document) return;
  // 多重ロード対策
  if (window.PonoAcornCopy && window.PonoAcornCopy.__pono_acorn_copy__) {
    return;
  }

  var data = null;
  var ready = false;

  function pickEntry(games, gameId, state) {
    if (!games || typeof games !== 'object') return null;
    var perGame = games[gameId];
    if (!perGame || typeof perGame !== 'object') return null;
    var entry = perGame[state];
    if (!entry || typeof entry !== 'object') return null;
    return entry;
  }

  function get(gameId, state) {
    if (!ready || !data) return null;
    var s = (state === 'capped' || state === 'perfect') ? state : 'idle';
    var entry = pickEntry(data.games, gameId, s);
    if (entry) return entry;
    // fallback: default schema
    if (data['default'] && data['default'][s]) {
      return data['default'][s];
    }
    return null;
  }

  function isReady() {
    return ready;
  }

  // acorn-copy.json の default.tapToDismiss を露出する。
  // acorn-modal.js が autoHide=0 (tap-only) のときの hint コピーとして使う。
  // catalog 未読込/未定義時は null。
  function getDefaultTapHint() {
    if (!ready || !data) return null;
    var d = data['default'];
    if (d && typeof d === 'object' && typeof d.tapToDismiss === 'string') {
      return d.tapToDismiss;
    }
    return null;
  }

  var api = {
    __pono_acorn_copy__: true,
    get: get,
    isReady: isReady,
    getDefaultTapHint: getDefaultTapHint
  };

  try {
    Object.defineProperty(window, 'PonoAcornCopy', {
      value: api,
      writable: false,
      configurable: false,
      enumerable: true
    });
  } catch (e) {
    window.PonoAcornCopy = api;
  }

  // resolve script URL → ../common/acorn-copy.json (同階層想定)
  function resolveJsonUrl() {
    try {
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        var src = scripts[i].src || '';
        if (src.indexOf('acorn-copy-loader.js') !== -1) {
          return src.replace(/acorn-copy-loader\.js(\?.*)?$/, 'acorn-copy.json');
        }
      }
    } catch (e) { /* noop */ }
    // フォールバック: 相対パス
    return 'acorn-copy.json';
  }

  function load() {
    if (typeof window.fetch !== 'function') return;
    var url = resolveJsonUrl();
    try {
      window.fetch(url, { credentials: 'same-origin' })
        .then(function (res) {
          if (!res || !res.ok) return null;
          return res.json();
        })
        .then(function (json) {
          if (json && typeof json === 'object') {
            data = json;
            ready = true;
          }
        })
        .catch(function () { /* silent */ });
    } catch (e) { /* silent */ }
  }

  load();
})(typeof window !== 'undefined' ? window : null);
