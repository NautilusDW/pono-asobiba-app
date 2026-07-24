/* まちがいさがしランド — speech.js
 * TTS 3.1 / Leda の事前収録音声だけを再生する。
 * Web Speech API へは戻さず、欠落・再生拒否・通信失敗時はゲームを止めず無音で続行する。
 * window.MSL.Speech に公開する。
 */
(function () {
  'use strict';

  var catalog = window.MACHIGAI_NARRATION || null;
  var muted = false;
  var current = null;
  var generation = 0;
  var player = null;
  var preloadLinksByText = {};

  function getEntry(text) {
    if (!catalog || !catalog.entries || !text) return null;
    return catalog.entries[text] || null;
  }

  function isSupported() {
    return !!(
      catalog
      && catalog.entries
      && typeof window.Audio === 'function'
    );
  }

  function getPlayer() {
    if (player) return player;
    player = new window.Audio();
    player.preload = 'auto';
    return player;
  }

  function configurePlayer(entry) {
    var audio = getPlayer();
    audio.src = entry.file;
    audio.volume = Number(catalog.volume) || 0.92;
    // 1.15倍速はファイルへ焼き込み済み。二重加速しない。
    audio.defaultPlaybackRate = Number(catalog.playbackRate) || 1;
    audio.playbackRate = Number(catalog.playbackRate) || 1;
    return audio;
  }

  function stopAudio(audio) {
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {
      /* 無視 */
    }
  }

  function cancel() {
    generation++;
    if (!current) return;
    var active = current;
    current = null;
    active.finish('cancelled');
  }

  function setMuted(v) {
    muted = !!v;
    if (muted) cancel();
  }

  /**
   * 次のステージで使う数本だけを先読みする。前ステージ分は参照を外す。
   * @param {string[]} texts
   */
  function preload(texts) {
    if (!isSupported() || !Array.isArray(texts)) return;
    var wanted = {};
    texts.forEach(function (text) {
      if (getEntry(text)) wanted[text] = true;
    });

    Object.keys(preloadLinksByText).forEach(function (text) {
      if (wanted[text]) return;
      var oldLink = preloadLinksByText[text];
      if (oldLink.parentNode) oldLink.parentNode.removeChild(oldLink);
      delete preloadLinksByText[text];
    });

    if (!window.document || !window.document.head) return;

    Object.keys(wanted).forEach(function (text) {
      if (preloadLinksByText[text]) return;
      try {
        var link = window.document.createElement('link');
        link.rel = 'preload';
        link.as = 'audio';
        link.type = 'audio/mpeg';
        link.href = getEntry(text).file;
        window.document.head.appendChild(link);
        preloadLinksByText[text] = link;
      } catch (e) {
        delete preloadLinksByText[text];
      }
    });
  }

  /**
   * 最新の発話だけを再生する。必ず解決するPromiseを返す。
   * @param {string} text
   * @returns {Promise<{status:string,text:string}>}
   */
  function speak(text) {
    cancel();
    if (muted) {
      return Promise.resolve({ status: 'muted', text: text || '' });
    }
    var entry = getEntry(text);
    if (!entry || !isSupported()) {
      return Promise.resolve({ status: 'unavailable', text: text || '' });
    }

    var token = ++generation;
    var audio;
    try {
      audio = configurePlayer(entry);
      audio.currentTime = 0;
    } catch (e) {
      return Promise.resolve({ status: 'error', text: text });
    }

    return new Promise(function (resolve) {
      var settled = false;
      var durationMs = Math.max(0, Number(entry.durationSec) || 0) * 1000;
      var timeoutMs = Math.max(2500, Math.min(6000, durationMs + 1600));
      var timeoutId = 0;

      function cleanup() {
        window.clearTimeout(timeoutId);
        try {
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
          audio.removeEventListener('abort', onAbort);
        } catch (e) {
          /* 無視 */
        }
      }

      function finish(status) {
        if (settled) return;
        settled = true;
        cleanup();
        if (status !== 'ended') stopAudio(audio);
        if (current && current.token === token) current = null;
        resolve({ status: status, text: text });
      }

      function onEnded() {
        finish('ended');
      }

      function onError() {
        finish('error');
      }

      function onAbort() {
        finish('aborted');
      }

      current = { token: token, audio: audio, text: text, finish: finish };
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      audio.addEventListener('abort', onAbort);
      timeoutId = window.setTimeout(function () {
        if (generation === token) finish('timeout');
      }, timeoutMs);

      try {
        var playResult = audio.play();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(function () {
            if (generation === token) finish('blocked');
          });
        }
      } catch (e) {
        finish('error');
      }
    });
  }

  function getActiveText() {
    return current ? current.text : '';
  }

  window.MSL = window.MSL || {};
  window.MSL.Speech = {
    isSupported: isSupported,
    setMuted: setMuted,
    preload: preload,
    speak: speak,
    cancel: cancel,
    getActiveText: getActiveText
  };
})();
