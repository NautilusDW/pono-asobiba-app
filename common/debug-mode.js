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

  global.PonoDebugMode = {
    isAllowed: isAllowed,
    isStagingHost: isStagingHost,
    unlock: unlock,
    lock: lock,
    promptUnlock: promptUnlock,
  };
})(typeof window !== 'undefined' ? window : this);
