/* まちがいさがしランド — speech.js
 * engine担当。Web Speech API (speechSynthesis) の安全な読み上げラッパ。
 * 非対応・失敗時は例外を投げず静かにスキップする。window.MSL.Speech に公開する。
 */
(function () {
  'use strict';

  var RATE = 0.9;
  var LANG = 'ja-JP';
  var muted = false;

  function isSupported() {
    return !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
  }

  function setMuted(v) {
    muted = !!v;
  }

  function cancel() {
    if (!isSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      /* 無視 */
    }
  }

  /**
   * テキストを読み上げる。非対応・ミュート・失敗はすべて無音でスキップ。
   * @param {string} text
   */
  function speak(text) {
    if (muted) return;
    if (!text) return;
    if (!isSupported()) return;
    try {
      window.speechSynthesis.cancel();
      var utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = LANG;
      utter.rate = RATE;
      utter.onerror = function () {
        /* エラー表示しない */
      };
      window.speechSynthesis.speak(utter);
    } catch (e) {
      /* 無視 */
    }
  }

  window.MSL = window.MSL || {};
  window.MSL.Speech = {
    isSupported: isSupported,
    setMuted: setMuted,
    speak: speak,
    cancel: cancel
  };
})();
