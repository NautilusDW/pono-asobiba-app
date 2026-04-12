// ── common/treasure.js ──
// 宝箱演出モジュール
// 使い方: showTreasure({ name: 'アイテム名', img: 'path/to/img.png', onClose: fn, label: '...' })
// 各ゲームで <script src="../common/treasure.js"></script> として読み込む

(function() {
  'use strict';

  var _overlay = null;
  var _container = null;   // .treasure-container (video はここに都度 append)
  var _video = null;       // 毎回 showTreasure で新規生成
  var _reward = null;
  var _msg = null;
  var _closeBtn = null;
  var _onClose = null;
  var _pendingTimers = [];
  var _finished = false;
  var _fallbackStarted = false; // _fallbackCss 重複挿入ガード用

  // ── パス判定 ────────────────────────────────────────────────────────────────
  function _getBasePath() {
    if (document.querySelector('script[src*="../common/treasure.js"]')) {
      return '../assets/videos/';
    }
    return 'assets/videos/';
  }

  // ── タイマー管理 ─────────────────────────────────────────────────────────────
  function _clearPendingTimers() {
    _pendingTimers.forEach(function(t) { clearTimeout(t); });
    _pendingTimers = [];
  }
  function _later(fn, ms) {
    var id = setTimeout(fn, ms);
    _pendingTimers.push(id);
    return id;
  }

  // ── UI 構築（1回のみ）────────────────────────────────────────────────────────
  function _createUI() {
    if (_overlay) return;

    var style = document.createElement('style');
    style.textContent = [
      '#treasure-overlay {',
      '  display:none; position:fixed; inset:0; z-index:99999;',
      '  background:rgba(0,0,0,0.7);',
      '  align-items:center; justify-content:center; flex-direction:column;',
      '}',
      '#treasure-overlay.show { display:flex; }',
      '.treasure-container {',
      '  position:relative; width:280px; height:280px;',
      '  border-radius:24px; overflow:hidden;',
      '  background:#000;',
      '}',
      '.treasure-container video {',
      '  width:100%; height:100%; object-fit:cover;',
      '}',
      '.treasure-reward {',
      '  position:absolute; top:20%; left:50%;',
      '  transform:translateX(-50%) scale(0);',
      '  text-align:center; pointer-events:none;',
      '  transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1);',
      '}',
      '.treasure-reward.show {',
      '  transform:translateX(-50%) scale(1);',
      '}',
      '.treasure-reward img {',
      '  width:140px; height:140px; object-fit:contain;',
      '  filter:drop-shadow(0 4px 12px rgba(255,215,0,0.5));',
      '}',
      '.treasure-reward-name {',
      '  margin-top:4px; font-size:0.9rem; font-weight:900;',
      '  color:#fff; background:rgba(0,0,0,0.6);',
      '  padding:2px 12px; border-radius:10px;',
      '  text-shadow:0 1px 3px rgba(0,0,0,0.8);',
      '  font-family:"Zen Maru Gothic",sans-serif;',
      '}',
      '.treasure-msg {',
      '  margin-top:16px; font-size:1.1rem; font-weight:900;',
      '  color:#FFD700; text-shadow:0 2px 4px rgba(0,0,0,0.5);',
      '  opacity:0; transition:opacity 0.3s;',
      '  font-family:"Zen Maru Gothic",sans-serif;',
      '}',
      '.treasure-msg.show { opacity:1; }',
      '.treasure-close {',
      '  margin-top:16px; padding:12px 32px; border:none; border-radius:50px;',
      '  background:linear-gradient(135deg,#FFD84D,#F5A800);',
      '  color:#5C3A00; font-family:"Zen Maru Gothic",sans-serif;',
      '  font-size:1rem; font-weight:900; cursor:pointer;',
      '  opacity:0; transition:opacity 0.3s;',
      '}',
      '.treasure-close.show { opacity:1; }',
      '.treasure-close:active { transform:scale(0.95); }',
      '.treasure-label {',
      '  margin-bottom:12px; font-size:1rem; font-weight:900;',
      '  color:#fff; font-family:"Zen Maru Gothic",sans-serif;',
      '  text-shadow:0 2px 4px rgba(0,0,0,0.5);',
      '  letter-spacing:0.05em;',
      '}',
      /* CSS フォールバック: 動画再生完全失敗時の宝箱アニメ */
      '.treasure-fallback {',
      '  width:100%; height:100%;',
      '  display:flex; align-items:center; justify-content:center;',
      '  background:radial-gradient(circle at 50% 60%, #3D1A00 0%, #0D0500 100%);',
      '}',
      '.treasure-fallback-icon {',
      '  font-size:5rem; line-height:1;',
      '  animation:tboxOpen 0.5s 0.3s ease both;',
      '}',
      '@keyframes tboxOpen {',
      '  0%   { transform:scale(0.6) rotate(-8deg); opacity:0.5; }',
      '  60%  { transform:scale(1.2) rotate(4deg);  opacity:1; }',
      '  100% { transform:scale(1)   rotate(0deg);  opacity:1; }',
      '}',
    ].join('\n');
    document.head.appendChild(style);

    _overlay = document.createElement('div');
    _overlay.id = 'treasure-overlay';
    _overlay.innerHTML =
      '<div class="treasure-label" id="treasure-label"></div>' +
      '<div class="treasure-container" id="treasure-container">' +
        '<div class="treasure-reward" id="treasure-reward">' +
          '<img id="treasure-reward-img" alt="ごほうび">' +
          '<div class="treasure-reward-name" id="treasure-reward-name"></div>' +
        '</div>' +
      '</div>' +
      '<div class="treasure-msg" id="treasure-msg">🎉 ごほうびを ゲット！</div>' +
      '<button class="treasure-close" id="treasure-close">やったー！</button>';
    document.body.appendChild(_overlay);

    _container = document.getElementById('treasure-container');
    _reward    = document.getElementById('treasure-reward');
    _msg       = document.getElementById('treasure-msg');
    _closeBtn  = document.getElementById('treasure-close');

    _closeBtn.addEventListener('click', function() {
      _doClose();
    });
  }

  function _doClose() {
    _clearPendingTimers();
    _destroyVideo();
    _overlay.classList.remove('show');
    if (_onClose) { var cb = _onClose; _onClose = null; cb(); }
  }

  // ── 旧 video を完全破棄 ────────────────────────────────────────────────────
  function _destroyVideo() {
    if (_video) {
      _video.pause();
      _video.removeAttribute('src');
      try { _video.load(); } catch(e) {}
      if (_video.parentNode) _video.parentNode.removeChild(_video);
      _video = null;
    }
  }

  // ── サウンド（AudioContext ファンファーレ）────────────────────────────────────
  var _treasureAC = null;
  function _playFanfare() {
    try {
      if (!_treasureAC) _treasureAC = new (window.AudioContext || window.webkitAudioContext)();
      if (_treasureAC.state === 'suspended') _treasureAC.resume();
      var ac = _treasureAC;
      var notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      notes.forEach(function(freq, i) {
        var osc = ac.createOscillator();
        var g = ac.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ac.currentTime + i * 0.12);
        g.gain.setValueAtTime(0.15, ac.currentTime + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + i * 0.12 + 0.3);
        osc.connect(g); g.connect(ac.destination);
        osc.start(ac.currentTime + i * 0.12);
        osc.stop(ac.currentTime + i * 0.12 + 0.3);
      });
    } catch(e) {}
  }

  // ── 報酬・ボタン表示（排他制御付き）─────────────────────────────────────────
  function _showReward() {
    if (_finished) return;
    _finished = true;
    _clearPendingTimers();

    // 動画/フォールバックを隠して背景を表示
    if (_video) { _video.style.opacity = '0'; _video.style.transition = 'opacity 0.3s'; }
    var fb = _container.querySelector('.treasure-fallback');
    if (fb) { fb.style.opacity = '0'; fb.style.transition = 'opacity 0.3s'; }
    _container.style.background = 'radial-gradient(circle at 50% 50%, #FFD700 0%, #FF8C00 40%, #5C3A00 100%)';

    _playFanfare();
    _reward.classList.add('show');
    _later(function() { _msg.classList.add('show'); }, 400);
    _later(function() { _closeBtn.classList.add('show'); }, 800);
  }

  // ── CSS フォールバックアニメーション ──────────────────────────────────────────
  function _fallbackCss() {
    if (_fallbackStarted || _finished) return;
    _fallbackStarted = true;
    _destroyVideo(); // iOS: video要素を残すと黒い矩形が表示される
    var fb = document.createElement('div');
    fb.className = 'treasure-fallback';
    fb.innerHTML = '<div class="treasure-fallback-icon">🎁</div>';
    _container.insertBefore(fb, _container.firstChild);
    _later(function() { _showReward(); }, 1200);
  }

  // ── メイン: showTreasure ─────────────────────────────────────────────────────
  window.showTreasure = function(options) {
    // options: { name, img, onClose, label }
    _createUI();
    _clearPendingTimers();
    _destroyVideo();
    _finished = false;
    _fallbackStarted = false;

    // ラベル・アイテム設定
    var name  = (options && options.name)  || 'ごほうび';
    var label = (options && options.label) || '';
    var img   = (options && options.img)   || '';
    document.getElementById('treasure-label').textContent = label;
    var rewardImg = document.getElementById('treasure-reward-img');
    rewardImg.src          = img;
    rewardImg.style.display = img ? '' : 'none';
    document.getElementById('treasure-reward-name').textContent = name;
    _onClose = (options && options.onClose) || null;

    // リセット
    _reward.classList.remove('show');
    _msg.classList.remove('show');
    _closeBtn.classList.remove('show');
    // 前回のフォールバック要素を除去
    var oldFb = _container.querySelector('.treasure-fallback');
    if (oldFb) oldFb.remove();

    _overlay.classList.add('show');

    // ── 動画要素を毎回新規生成 ──
    var basePath = _getBasePath();
    var mp4Path  = basePath + 'TreasureBox.mp4'; // キャッシュバスターなし（iOS互換性）

    _video = document.createElement('video');
    _video.muted       = true;
    _video.playsInline = true;
    _video.preload     = 'auto';
    _video.setAttribute('playsinline', '');
    _video.setAttribute('webkit-playsinline', '');
    _video.src = mp4Path; // <source>ではなくsrc直接（iOS: errorイベントがvideo要素で発火する）

    _container.insertBefore(_video, _container.querySelector('.treasure-reward'));

    var capturedVideo = _video;
    var readyFired = false; // canplay/loadeddata/即座play の排他フラグ

    // ── 3秒 soft timeout ──
    var softTimeoutId = _later(function() {
      if (_video !== capturedVideo || readyFired) return;
      console.warn('[treasure] timeout → CSS fallback');
      _fallbackCss();
    }, 3000);

    // ── エラーハンドラ ──
    function onMediaError(e) {
      if (_video !== capturedVideo || readyFired) return;
      readyFired = true;
      clearTimeout(softTimeoutId);
      console.warn('[treasure] error → CSS fallback', e);
      _fallbackCss();
    }
    capturedVideo.addEventListener('error', onMediaError);

    // ── 再生成功時の共通処理 ──
    function onPlaySuccess() {
      if (_video !== capturedVideo) return;
      // ※ iOS: unmute しない（async unmute は iOS で再生停止の原因）
      capturedVideo.addEventListener('ended', function() {
        if (_video !== capturedVideo) return;
        _showReward();
      }, { once: true });
      // duration ベースのフォールバック
      var dur = capturedVideo.duration;
      var ms = (dur && isFinite(dur) && dur > 0) ? (dur * 1000 + 800) : 5000;
      _later(function() { if (_video === capturedVideo) _showReward(); }, ms);
    }

    // ── canplay / loadeddata → play() ──
    function onReady() {
      if (readyFired || _video !== capturedVideo) return;
      readyFired = true;
      clearTimeout(softTimeoutId);
      var p = capturedVideo.play();
      if (p && typeof p.then === 'function') {
        p.then(onPlaySuccess).catch(function() {
          if (_video !== capturedVideo) return;
          _fallbackCss();
        });
      } else {
        onPlaySuccess();
      }
    }
    capturedVideo.addEventListener('canplay', onReady, { once: true });
    capturedVideo.addEventListener('loadeddata', onReady, { once: true });

    // ── load + 即座に play() を試行（iOS muted autoplay） ──
    _video.load();
    var p0 = capturedVideo.play();
    if (p0 && typeof p0.then === 'function') {
      p0.then(function() {
        // 即座再生成功 → canplay/loadeddata リスナーを除去
        capturedVideo.removeEventListener('canplay', onReady);
        capturedVideo.removeEventListener('loadeddata', onReady);
        if (readyFired || _video !== capturedVideo) return;
        readyFired = true;
        clearTimeout(softTimeoutId);
        onPlaySuccess();
      }).catch(function() {
        // 即座の play 失敗 → canplay/loadeddata を待つ（何もしない）
      });
    }
  };
})();
