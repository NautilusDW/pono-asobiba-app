/* common/debug-mode.js
 * Single source of truth for debug-mode gating across the app.
 * Pure JS, IIFE, exposes window.PonoDebugMode.
 */
(function (global) {
  'use strict';
  if (!global) return;

  var DEFAULT_PASSWORD = 'manage';
  var SS_KEY = 'pono_debug_mode_session';

  function getHostname() {
    try {
      return (global.location && global.location.hostname) || '';
    } catch (_e) {
      return '';
    }
  }

  function getSS() {
    try {
      return global.sessionStorage || null;
    } catch (_e) {
      return null;
    }
  }

  function isStagingHost() {
    var h = getHostname();
    if (!h) return false;
    if (h === 'localhost') return true;
    if (h === '127.0.0.1') return true;
    if (h.indexOf('staging') !== -1) return true;
    return false;
  }

  function isAllowed() {
    if (!isStagingHost()) return false;
    var ss = getSS();
    if (!ss) return false;
    try {
      return ss.getItem(SS_KEY) === '1';
    } catch (_e) {
      return false;
    }
  }

  function unlock(password) {
    if (!isStagingHost()) return false;
    if (password !== DEFAULT_PASSWORD) return false;
    var ss = getSS();
    if (!ss) return false;
    try {
      ss.setItem(SS_KEY, '1');
      return true;
    } catch (_e) {
      return false;
    }
  }

  function lock() {
    var ss = getSS();
    if (!ss) return;
    try {
      ss.removeItem(SS_KEY);
    } catch (_e) { /* noop */ }
  }

  function reload() {
    try {
      if (global.location && typeof global.location.reload === 'function') {
        global.location.reload();
      }
    } catch (_e) { /* noop */ }
  }

  function promptUnlock() {
    if (!isStagingHost()) return; // silent no-op on production
    try {
      if (isAllowed()) {
        if (global.confirm && global.confirm('Debug mode is ON. Lock it now?')) {
          lock();
          if (global.alert) global.alert('Debug mode locked.');
          reload();
        }
        return;
      }
      var pw = global.prompt ? global.prompt('Enter debug password:') : null;
      if (pw === null) return;
      if (unlock(pw)) {
        if (global.alert) global.alert('Debug mode unlocked.');
        reload();
      } else {
        if (global.alert) global.alert('Wrong password.');
      }
    } catch (_e) { /* noop */ }
  }

  // ===== Per-feature opt-in toggles (v1731) =====
  // Feature flags live in localStorage under pono_debug_feature_<id>.
  // Gated by isAllowed() so the toggles only act on staging + after manage unlock.
  // Catalog itself lives in common/debug-features.js (window.PonoDebugFeatures).
  var FEATURE_KEY_PREFIX = 'pono_debug_feature_';

  function sanitizeFeatureKey(featureKey) {
    if (typeof featureKey !== 'string') return '';
    // Allow alnum + dash/underscore only; matches the catalog ids.
    if (!/^[a-zA-Z0-9_-]+$/.test(featureKey)) return '';
    return featureKey;
  }

  function getLS() {
    try {
      return global.localStorage || null;
    } catch (_e) {
      return null;
    }
  }

  function isFeatureEnabled(featureKey) {
    if (!isAllowed()) return false;
    var key = sanitizeFeatureKey(featureKey);
    if (!key) return false;
    var ls = getLS();
    if (!ls) return false;
    try {
      return ls.getItem(FEATURE_KEY_PREFIX + key) === '1';
    } catch (_e) {
      return false;
    }
  }

  function setFeatureEnabled(featureKey, on) {
    // Writes are also gated by manage unlock so a non-dev session can't
    // turn flags on programmatically.
    if (!isAllowed()) return false;
    var key = sanitizeFeatureKey(featureKey);
    if (!key) return false;
    var ls = getLS();
    if (!ls) return false;
    try {
      if (on) {
        ls.setItem(FEATURE_KEY_PREFIX + key, '1');
      } else {
        ls.removeItem(FEATURE_KEY_PREFIX + key);
      }
      return true;
    } catch (_e) {
      return false;
    }
  }

  function listFeatures() {
    // Snapshot copy so callers can't mutate the registered catalog.
    var raw = (global.PonoDebugFeatures && global.PonoDebugFeatures.length)
      ? global.PonoDebugFeatures : [];
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var f = raw[i] || {};
      if (!f.id) continue;
      out.push({
        id: String(f.id),
        label: String(f.label || f.id),
        description: String(f.description || ''),
        default: !!f.default
      });
    }
    return out;
  }

  global.PonoDebugMode = {
    isAllowed: isAllowed,
    isStagingHost: isStagingHost,
    unlock: unlock,
    lock: lock,
    promptUnlock: promptUnlock,
    isFeatureEnabled: isFeatureEnabled,
    setFeatureEnabled: setFeatureEnabled,
    listFeatures: listFeatures,
  };
})(typeof window !== 'undefined' ? window : this);
