// ── common/treasure.js ──
// 宝箱演出モジュール
// 使い方: showTreasure({ name: 'アイテム名', img: 'path/to/img.png', onClose: fn, label: '...' })
// 各ゲームで <script src="../common/treasure.js"></script> として読み込む

(function() {
  'use strict';

  // MVP フラグ: 報酬制度を封印中は宝箱演出をスキップ (onClose だけ呼ぶ)。
  // 切替は common/mvp-flags.js を参照。
  function _isRewardsDisabled() { return !!window.PONO_MVP_NO_REWARDS; }

  var _overlay = null;
  var _container = null;   // .treasure-container (video はここに都度 append)
  var _video = null;       // 毎回 showTreasure で新規生成
  // ポスター画像をモジュールロード時にプリロードしてキャッシュ
  var _posterPreload = null;
  var _openPreload = null;
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

  // モジュール読み込み時にポスター画像をキャッシュ済みにしておく
  (function _preloadPosters() {
    try {
      var bp = _getBasePath();
      _posterPreload = new Image();
      _posterPreload.src = bp + 'TreasureBox_poster.jpg';
      _openPreload = new Image();
      _openPreload.src = bp + 'TreasureBox_open.jpg';
    } catch (e) {}
  })();

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
      '  background:rgba(0,0,0,0);',
      '  align-items:center; justify-content:center; flex-direction:column;',
      '  transition:background 0.3s;',
      '}',
      '#treasure-overlay.show { display:flex; }',
      '#treasure-overlay.visible { background:rgba(0,0,0,0.7); }',
      '.treasure-container {',
      '  position:relative; width:280px; height:280px;',
      '  border-radius:24px; overflow:hidden;',
      /* フォールバック色: 画像読込中や video の黒枠を隠すための茶系グラデ */
      '  background:radial-gradient(circle at 50% 60%, #3D1A00 0%, #0D0500 100%);',
      '  background-size:cover; background-position:center;',
      '  transform:scale(0);',
      '  transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);',
      '}',
      '#treasure-overlay.visible .treasure-container {',
      '  transform:scale(1);',
      '}',
      '.treasure-container video {',
      '  width:100%; height:100%; object-fit:cover;',
      '}',
      '.treasure-reward {',
      '  position:absolute; inset:0;',
      '  display:flex; flex-direction:column;',
      '  align-items:center; justify-content:center;',
      '  padding:12px 10px;',
      '  transform:scale(0);',
      '  text-align:center; pointer-events:none;',
      '  transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1);',
      '  z-index:2;',
      '}',
      '.treasure-reward.show {',
      '  transform:scale(1);',
      '}',
      '.treasure-reward img {',
      /* 縦長アイテム(家具/おもちゃ)は height:130px を基準にし、横長の壁紙・床でも */
      /* 同じ「高さ 130px」で出てくるように width:auto + max-width で揃える。    */
      '  height:130px; width:auto; max-width:220px;',
      '  object-fit:contain;',
      '  flex-shrink:0;',
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
      '  pointer-events:none;',
      '}',
      '.treasure-close.show { opacity:1; pointer-events:auto; }',
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
      '@keyframes stampBtnPulse {',
      '  0%, 100% { transform:scale(1); }',
      '  50% { transform:scale(1.08); }',
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

  // ── メインBGM フェード制御 ──
  // 宝箱演出中は完全消音せず、音量を下げるだけ (無音化が一瞬入るのが不自然なため)
  // 対象: play.html / 各ゲームの id="bgm" or id="play-bgm" 要素
  var _bgmFadeInterval = null;
  var _bgmOriginalVolume = null;
  var BGM_DUCK_RATIO = 0.25; // 元音量の 25% まで下げる (完全消音はしない)

  function _findBgmEl() {
    return document.getElementById('play-bgm') || document.getElementById('bgm');
  }
  function _fadeBgm(toVolume, durationMs, onDone) {
    var bgm = _findBgmEl();
    if (!bgm) { if (onDone) onDone(); return; }
    if (_bgmFadeInterval) { clearInterval(_bgmFadeInterval); _bgmFadeInterval = null; }
    var startVol = bgm.volume;
    var steps = Math.max(8, Math.round(durationMs / 50));
    var stepCount = 0;
    var delta = (toVolume - startVol) / steps;
    _bgmFadeInterval = setInterval(function() {
      stepCount++;
      var newVol = startVol + delta * stepCount;
      newVol = Math.max(0, Math.min(1, newVol));
      bgm.volume = newVol;
      if (stepCount >= steps) {
        clearInterval(_bgmFadeInterval);
        _bgmFadeInterval = null;
        // 完全消音時のみ pause (現在は使わないが安全策として残す)
        if (toVolume === 0) bgm.pause();
        if (onDone) onDone();
      }
    }, durationMs / steps);
  }
  function _bgmFadeOut() {
    var bgm = _findBgmEl();
    if (!bgm) return;
    if (_bgmOriginalVolume === null) _bgmOriginalVolume = bgm.volume;
    // 完全に 0 にせず、元音量の 25% までダッキング
    var duckTo = Math.max(0.05, _bgmOriginalVolume * BGM_DUCK_RATIO);
    _fadeBgm(duckTo, 400);
  }
  function _bgmFadeIn() {
    var bgm = _findBgmEl();
    if (!bgm) return;
    var target = _bgmOriginalVolume !== null ? _bgmOriginalVolume : 0.35;
    _bgmOriginalVolume = null;
    if (localStorage.getItem('pono_bgm_enabled') === 'off') return;
    // pause していないので play() は不要だが念のため (保険)
    if (bgm.paused) {
      var p = bgm.play();
      if (p && typeof p.catch === 'function') p.catch(function() {});
    }
    _fadeBgm(target, 600);
  }

  function _doClose() {
    _clearPendingTimers();
    // タップオーバーレイが残っていたら除去
    if (_container) {
      var tap = _container.querySelector('[style*="z-index:3"]');
      if (tap) tap.remove();
    }
    // 動画はまだ削除しない。代わりに「開いた宝箱」画像を背景にして見た目を維持
    if (_container) {
      var basePath = _getBasePath();
      _container.style.backgroundImage = "url('" + basePath + "TreasureBox_open.jpg')";
      _container.style.backgroundSize = 'cover';
      _container.style.backgroundPosition = 'center';
    }
    if (_video) {
      _video.pause();
      _video.style.transition = 'opacity 0.15s';
      _video.style.opacity = '0';
    }
    // スケールアウトアニメーション
    if (_container) {
      _container.style.transition = 'transform 0.3s cubic-bezier(0.6,-0.28,0.74,0.05)';
      _container.style.transform = 'scale(0)';
    }
    _overlay.classList.remove('visible');
    // メインBGMをフェードイン
    _bgmFadeIn();
    setTimeout(function() {
      // スケールアウト完了後に動画削除＆オーバーレイ非表示
      _destroyVideo();
      _overlay.classList.remove('show');
      if (_container) {
        _container.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
        _container.style.backgroundImage = '';
      }
      if (_onClose) { var cb = _onClose; _onClose = null; cb(); }
    }, 350);
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

  // ── サウンド ────────────────────────────────────────────────────────────────
  // グローバル共有AudioContext（1ページに1つ。スタンプ音と共有可能）
  function _getSoundBasePath() {
    if (document.querySelector('script[src*="../common/treasure.js"]')) {
      return '../assets/sounds/se/';
    }
    return 'assets/sounds/se/';
  }

  // グローバルAudioContextを取得または作成
  function _getGlobalAC() {
    if (!window._ponoAudioCtx) {
      try { window._ponoAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    return window._ponoAudioCtx;
  }

  // AudioContextのresume（ユーザージェスチャー内で呼ぶ）
  function _resumeAC() {
    var ac = _getGlobalAC();
    if (ac && ac.state === 'suspended') {
      ac.resume().catch(function() {});
    }
  }

  // MP3をAudioBufferとしてプリロード
  var _fanfareBuffer = null;
  var _fanfareLoading = false;
  function _loadFanfareBuffer() {
    if (_fanfareBuffer || _fanfareLoading) return;
    var ac = _getGlobalAC();
    if (!ac) return;
    _fanfareLoading = true;
    var src = _getSoundBasePath() + 'TreasureBox.mp3';
    fetch(src).then(function(r) { return r.arrayBuffer(); })
      .then(function(buf) { return ac.decodeAudioData(buf); })
      .then(function(decoded) { _fanfareBuffer = decoded; _fanfareLoading = false; })
      .catch(function() { _fanfareLoading = false; });
  }

  // ユーザージェスチャーでアンロック（touchstart/touchend/click）
  function _unlockAudio() {
    _resumeAC();
    _loadFanfareBuffer();
  }
  // 複数イベントで試行（iOSはtouchendが最も確実）
  document.addEventListener('touchstart', _unlockAudio, { passive: true });
  document.addEventListener('touchend', _unlockAudio, { passive: true });
  document.addEventListener('click', _unlockAudio);
  // ページ読み込み時にバッファのプリロードも開始（デコードだけなら制限なし）
  _loadFanfareBuffer();

  function _playFanfare() {
    try {
      var ac = _getGlobalAC();
      if (!ac) return;
      _resumeAC();
      if (!_fanfareBuffer) return;
      var source = ac.createBufferSource();
      source.buffer = _fanfareBuffer;
      source.connect(ac.destination);
      source.start(0);
    } catch(e) {}
  }

  // ── 報酬アイテム表示（動画再生中に呼ばれる）───────────────────────────────
  var _rewardShown = false;
  function _showReward() {
    if (_rewardShown) return;
    _rewardShown = true;
    // 音はタップ時に再生済み
    _reward.classList.add('show');
    _later(function() { _msg.classList.add('show'); }, 400);
  }

  // ── 動画完了後に閉じるボタンを表示 ─────────────────────────────────────────
  function _showCloseBtn() {
    if (_finished) return;
    _finished = true;
    _clearPendingTimers();

    // 動画は最後のフレーム（宝箱が開いた状態）で停止させて残す
    if (_video) { _video.pause(); }
    // フォールバック（🎁アニメ）の場合のみ少し薄くする
    var fb = _container.querySelector('.treasure-fallback');
    if (fb) { fb.style.opacity = '0.4'; fb.style.transition = 'opacity 0.3s'; }

    // アイテムがまだ表示されていなければ表示
    _showReward();
    _later(function() { _closeBtn.classList.add('show'); }, 400);
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
    _later(function() { _showReward(); }, 800);
    _later(function() { _showCloseBtn(); }, 2000);
  }

  // ── メイン: showTreasure ─────────────────────────────────────────────────────
  window.showTreasure = function(options) {
    // options: { name, img, onClose, label }
    if (_isRewardsDisabled()) {
      try { if (options && typeof options.onClose === 'function') options.onClose(); } catch (e) {}
      return;
    }
    _createUI();
    _clearPendingTimers();
    _destroyVideo();
    _finished = false;
    _fallbackStarted = false;
    _rewardShown = false;
    // メインBGMをフェードアウト（演出中は静かに）
    _bgmFadeOut();
    // コンテナ背景をリセット（poster 読込失敗時の黒枠対策で茶系グラデを下敷きに）
    if (_container) {
      _container.style.background = '';
      _container.style.backgroundColor = '#3D1A00';
      _container.style.backgroundImage = '';
    }

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

    // ── 動画要素を毎回新規生成 ──
    var basePath = _getBasePath();
    var mp4Path  = basePath + 'TreasureBox_opt.mp4';
    var posterPath = basePath + 'TreasureBox_poster.jpg';
    var openPath = basePath + 'TreasureBox_open.jpg';

    // コンテナの背景を「閉じた宝箱」のポスター画像にする（スケール中も真っ黒にならない）
    _container.style.backgroundImage = "url('" + posterPath + "')";
    _container.style.backgroundSize = 'cover';
    _container.style.backgroundPosition = 'center';

    _overlay.classList.add('show');
    _overlay.classList.remove('visible');

    _video = document.createElement('video');
    _video.muted       = true;
    _video.playsInline = true;
    _video.preload     = 'auto';
    _video.poster      = posterPath;
    _video.setAttribute('playsinline', '');
    _video.setAttribute('webkit-playsinline', '');
    _video.src = mp4Path;
    // スケール中に video の黒枠が見えないよう、再生開始までは opacity で隠す
    // （display:none だと iOS で load/preload が走らず動画が止まる事があるため）
    _video.style.opacity = '0';
    _video.style.transition = 'opacity 0.2s';
    _video.load();

    _container.insertBefore(_video, _container.querySelector('.treasure-reward'));

    // ポスター画像はすぐに表示できるので即スケールイン
    requestAnimationFrame(function() { _overlay.classList.add('visible'); });

    // ── 「タップして あけよう！」オーバーレイ（動画の最初のフレームの上に重ねる） ──
    var tapOverlay = document.createElement('div');
    tapOverlay.style.cssText =
      'position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:flex-end;padding-bottom:24px;cursor:pointer;';
    tapOverlay.innerHTML =
      '<button style="padding:12px 32px;border:none;border-radius:50px;' +
      'background:linear-gradient(135deg,#FFD84D,#F5A800);color:#5C3A00;' +
      'font-family:\'Zen Maru Gothic\',sans-serif;font-size:1rem;font-weight:900;' +
      'cursor:pointer;box-shadow:0 4px 16px rgba(245,168,0,0.5);' +
      'animation:stampBtnPulse 1.2s ease-in-out infinite;">タップして あけよう！</button>';
    _container.appendChild(tapOverlay);

    var capturedVideo = _video;

    // ── タップで宝箱を開ける ──
    tapOverlay.addEventListener('click', function _onTapOpen() {
      tapOverlay.removeEventListener('click', _onTapOpen);

      // AudioContextアンロック（ユーザージェスチャー内）→ 即座に音を再生
      _resumeAC();
      _playFanfare();

      // タップオーバーレイをフェードアウト
      tapOverlay.style.transition = 'opacity 0.3s';
      tapOverlay.style.opacity = '0';
      setTimeout(function() { if (tapOverlay.parentNode) tapOverlay.remove(); }, 300);

      // 動画を表示して再生開始（opacity で隠していたので戻す）
      capturedVideo.style.opacity = '1';
      var readyFired = false;

      // ── 3秒 soft timeout ──
      var softTimeoutId = _later(function() {
        if (_video !== capturedVideo || readyFired) return;
        _fallbackCss();
      }, 3000);

      // ── エラーハンドラ ──
      function onMediaError() {
        if (_video !== capturedVideo || readyFired) return;
        readyFired = true;
        clearTimeout(softTimeoutId);
        _fallbackCss();
      }
      capturedVideo.addEventListener('error', onMediaError);

      // ── 再生成功時の共通処理 ──
      function onPlaySuccess() {
        if (_video !== capturedVideo) return;
        // 動画終了0.3秒前にアイテムを表示（endedイベントより早い）
        var dur = capturedVideo.duration;
        if (dur && isFinite(dur) && dur > 1.5) {
          var showAt = dur - 3.2;
          capturedVideo.addEventListener('timeupdate', function _onTime() {
            if (_video !== capturedVideo) { capturedVideo.removeEventListener('timeupdate', _onTime); return; }
            if (capturedVideo.currentTime >= showAt) {
              capturedVideo.removeEventListener('timeupdate', _onTime);
              _showReward();
            }
          });
        }
        // endedイベント → 動画完了後に閉じるボタン表示
        capturedVideo.addEventListener('ended', function() {
          if (_video !== capturedVideo) return;
          _showCloseBtn();
        }, { once: true });
        // 最終フォールバック（endedが発火しない場合）
        var ms = (dur && isFinite(dur) && dur > 0) ? (dur * 1000 + 500) : 5000;
        _later(function() { if (_video === capturedVideo) _showCloseBtn(); }, ms);
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

      // 動画が既にロード済みなら即再生、そうでなければイベント待ち
      if (capturedVideo.readyState >= 3) {
        onReady();
      } else {
        capturedVideo.addEventListener('canplay', onReady, { once: true });
        capturedVideo.addEventListener('loadeddata', onReady, { once: true });
      }

      // 即座に play() を試行
      var p0 = capturedVideo.play();
      if (p0 && typeof p0.then === 'function') {
        p0.then(function() {
          capturedVideo.removeEventListener('canplay', onReady);
          capturedVideo.removeEventListener('loadeddata', onReady);
          if (readyFired || _video !== capturedVideo) return;
          readyFired = true;
          clearTimeout(softTimeoutId);
          onPlaySuccess();
        }).catch(function() {});
      }
    });
  };
})();
