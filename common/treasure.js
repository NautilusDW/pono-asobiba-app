// ── common/treasure.js ──
// 宝箱演出モジュール
// 使い方: showTreasure({ name: 'アイテム名', img: 'path/to/img.png', onClose: fn, label: '...' })
// 各ゲームで <script src="../common/treasure.js"></script> として読み込む

(function() {
  'use strict';

  // MVP フラグ: 報酬制度を封印中は宝箱演出をスキップ (onClose だけ呼ぶ)。
  // 切替は common/mvp-flags.js を参照。
  // common/first-clear.js の _rewardsBlocked() / common/achievements.js と同じ3段フォールバック
  // (PonoMvpFlags有無 → PONO_MVP_NO_REWARDS有無 → PonoTier.isApp()単独判定)。
  // window.PONO_MVP_NO_REWARDS 単独判定は tier を見ないため、app tier でも常に true になり
  // 宝箱演出が never 表示されない事故があった (2026-07-16)。
  function _isRewardsDisabled() {
    if (window.PonoMvpFlags && typeof window.PonoMvpFlags.rewardsBlocked === 'function') {
      return window.PonoMvpFlags.rewardsBlocked();
    }
    if (window.PONO_MVP_NO_REWARDS) return true;
    return !(window.PonoTier && typeof window.PonoTier.isApp === 'function' && window.PonoTier.isApp());
  }

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
  var _closing = false;         // _doClose 多重発火ガード (close btn / 背景タップ / auto-close が競合しても1回だけ実行)

  // ── 2択選択モード (性別自動判定の廃止に伴う追加、batch:1370) ──
  // gendered な報酬 (boy/girl 2バリアント) を子ども自身にタップで選ばせるための状態。
  // options.choices (配列2件、各 {name, img, ...任意のフィールド}) が渡された時だけ有効化。
  // 呼び出し側は options.onChoose(選ばれたchoiceオブジェクト) で選択結果を受け取り、
  // その中で grantReward などの確定処理を行う (= 見せる前に確定させない設計)。
  var _choiceGrid = null;
  var _choiceMode = false;
  var _choices = null;
  var _onChoose = null;
  var _choiceResolved = false;

  // ── 多重呼び出しキュー (batch:1371) ──
  // 同一実行内 (例: stamp-rally.js の checkSlotReward がスロット報酬とカード完成報酬を
  // それぞれ setTimeout(200ms) / setTimeout(1200ms) で独立に showTreasure() を呼ぶ) で
  // 2回目の呼び出しが発生すると、_choiceMode/_choices/_onChoose がモジュール単一状態のため
  // 1回目の選択がまだ確定していないうちに上書きされ、1回目の onChoose が永久に呼ばれず
  // grantReward がロストする事故があった (2026-07-19 実機検証で確認)。
  // 対策: showTreasure() の実処理は「busy でなければ即実行、busy ならキューに積む」方式にし、
  // 表示中の宝箱が完全に閉じきる (_doClose 完了 = onClose 発火後) まで次の呼び出しを
  // 待たせる。呼び出し側 (stamp-rally.js/first-clear.js) は何も意識しなくてよい設計。
  var _queue = [];
  var _busy = false;

  // past incident: オーバーレイが正常に閉じずページ全体のクリックを吸収した事故の再発防止 (batch:1320)
  var AUTO_CLOSE_MS = 10000;
  var _autoCloseTimer = null;

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
  function _clearAutoClose() {
    if (_autoCloseTimer) { clearTimeout(_autoCloseTimer); _autoCloseTimer = null; }
  }
  function _scheduleAutoClose() {
    _clearAutoClose();
    _autoCloseTimer = setTimeout(function() { _autoCloseTimer = null; _doClose(); }, AUTO_CLOSE_MS);
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
      /* ── 2択選択UI (batch:1370) ── */
      '.treasure-choice-grid {',
      '  position:absolute; inset:0;',
      '  display:flex; flex-direction:column;',
      '  align-items:center; justify-content:center;',
      '  gap:10px; padding:14px 10px;',
      '  transform:scale(0); transform-origin:center;',
      '  transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1);',
      '  pointer-events:none; z-index:2;',
      '}',
      '.treasure-choice-grid.show { transform:scale(1); pointer-events:auto; }',
      '.treasure-choice-prompt {',
      '  font-size:0.85rem; font-weight:900; color:#FFD700;',
      '  text-shadow:0 1px 3px rgba(0,0,0,0.7);',
      '  font-family:"Zen Maru Gothic",sans-serif;',
      '}',
      '.treasure-choice-row { display:flex; flex-direction:row; gap:14px; justify-content:center; align-items:stretch; }',
      '.treasure-choice-btn {',
      '  display:flex; flex-direction:column; align-items:center; justify-content:center;',
      '  gap:6px; min-width:104px; min-height:128px; padding:10px 8px;',
      '  border:3px solid rgba(255,255,255,0.5); border-radius:20px;',
      '  background:rgba(255,255,255,0.12);',
      '  cursor:pointer; -webkit-tap-highlight-color:transparent;',
      '  transition:transform .15s ease, border-color .15s ease, background .15s ease;',
      '}',
      '.treasure-choice-btn img {',
      '  width:64px; height:64px; object-fit:contain; flex-shrink:0;',
      '  filter:drop-shadow(0 4px 10px rgba(255,215,0,0.45));',
      '  pointer-events:none;',
      '}',
      '.treasure-choice-name {',
      '  font-size:0.72rem; font-weight:900; color:#fff; text-align:center;',
      '  text-shadow:0 1px 3px rgba(0,0,0,0.8);',
      '  font-family:"Zen Maru Gothic",sans-serif;',
      '  pointer-events:none;',
      '}',
      '.treasure-choice-btn:active { transform:scale(0.94); }',
      '.treasure-choice-btn.is-active {',
      '  border-color:#FFD700; background:rgba(255,215,0,0.38); transform:scale(1.06);',
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
        '<div class="treasure-choice-grid" id="treasure-choice-grid">' +
          '<div class="treasure-choice-prompt">どっちが すき？</div>' +
          '<div class="treasure-choice-row">' +
            '<button type="button" class="treasure-choice-btn" data-choice-idx="0" aria-pressed="false">' +
              '<img class="treasure-choice-img" alt="">' +
              '<div class="treasure-choice-name"></div>' +
            '</button>' +
            '<button type="button" class="treasure-choice-btn" data-choice-idx="1" aria-pressed="false">' +
              '<img class="treasure-choice-img" alt="">' +
              '<div class="treasure-choice-name"></div>' +
            '</button>' +
          '</div>' +
        '</div>' +
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
    _choiceGrid = document.getElementById('treasure-choice-grid');

    _closeBtn.addEventListener('click', function() {
      _doClose();
    });

    // 2択ボタン: タップされた瞬間の idx を _choices から都度読むので、
    // showTreasure() が毎回差し替える _choices の内容と常に一致する。
    var _choiceBtns = _choiceGrid.querySelectorAll('.treasure-choice-btn');
    for (var _cbi = 0; _cbi < _choiceBtns.length; _cbi++) {
      (function(idx) {
        _choiceBtns[idx].addEventListener('click', function() { _selectChoice(idx); });
      })(_cbi);
    }

    // 背景タップで閉じる。演出のごく初期(フェードイン中/報酬表示前)の誤タップで
    // 早期クローズしないよう、_finished (=閉じるボタン表示済み) になるまでは無効化する。
    _overlay.addEventListener('click', function(e) {
      if (e.target !== _overlay) return;
      if (!_finished) return;
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
    if (_closing) return;
    // 2択モードで子どもがタップせずオートクローズ/フォールバック終了まで進んだ場合の
    // safety net: 1つ目の選択肢を自動選択してから閉じる。onChoose は必ず1回発火するので
    // 呼び出し側 (first-clear.js/stamp-rally.js) は「選択されない」ケースを気にしなくてよい。
    if (_choiceMode && _choices && _choices.length && !_choiceResolved) {
      _selectChoice(0, true);
    }
    _closing = true;
    _clearAutoClose();
    _clearPendingTimers();
    // タップオーバーレイが残っていたら除去 (batch:1371: クラス名で確実に照合。
    // 旧 `[style*="z-index:3"]` はブラウザの style 属性再シリアライズで
    // "z-index: 3;" とスペースが入るため実ブラウザでは常に不一致だった)。
    if (_container) {
      var tap = _container.querySelector('.treasure-tap-overlay');
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
      _closing = false;
      if (_onClose) { var cb = _onClose; _onClose = null; cb(); }
      // この宝箱は完全に終了した。busy を解除し、待っている次の呼び出しがあれば処理する。
      // cb() が同期的に showTreasure() を呼んでいた場合でも、_busy はまだ true のまま
      // だったのでその呼び出しは _queue に積まれているだけ (即実行はされていない)。
      // ここで _busy=false にしてから _runQueue() することで、必ず正しい順序で処理される。
      _busy = false;
      _runQueue();
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
    if (_choiceMode && _choices && !_choiceResolved) {
      // 2択モード: 単一revealの代わりに2枚を並べて選ばせる。
      // 確定reveal・メッセージ表示は _selectChoice() が選択後に引き継ぐ。
      var btns = _choiceGrid.querySelectorAll('.treasure-choice-btn');
      for (var i = 0; i < btns.length && i < _choices.length; i++) {
        var c = _choices[i] || {};
        var img = btns[i].querySelector('.treasure-choice-img');
        var nm  = btns[i].querySelector('.treasure-choice-name');
        if (img) img.src = c.img || '';
        if (nm)  nm.textContent = c.name || '';
        btns[i].classList.remove('is-active');
        btns[i].setAttribute('aria-pressed', 'false');
      }
      _choiceGrid.classList.add('show');
      return;
    }
    _reward.classList.add('show');
    _later(function() { _msg.classList.add('show'); }, 400);
  }

  // ── 2択タップ確定 (batch:1370) ──
  // idx: タップされたボタンの index (0 or 1)。auto: 自動選択(タイムアウト safety net)時 true。
  function _selectChoice(idx, auto) {
    if (!_choiceMode || _choiceResolved || !_choices || !_choices[idx]) return;
    _choiceResolved = true;
    var picked = _choices[idx];

    if (!auto) {
      var btns = _choiceGrid.querySelectorAll('.treasure-choice-btn');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('is-active', i === idx);
        btns[i].setAttribute('aria-pressed', i === idx ? 'true' : 'false');
      }
    }

    // 呼び出し側の確定処理 (grantReward 等) をアニメーション完了を待たずに即実行。
    // タイマー競合を避けるため setTimeout ではなく同期呼び出し。
    if (_onChoose) { try { _onChoose(picked); } catch (e) {} }

    // 選択エフェクトを一瞬見せてから (auto 選択時は間を空けずに) 通常の単一reveal表示へ。
    _later(function() {
      _choiceGrid.classList.remove('show');
      var rewardImg = document.getElementById('treasure-reward-img');
      rewardImg.src = picked.img || '';
      rewardImg.style.display = picked.img ? '' : 'none';
      document.getElementById('treasure-reward-name').textContent = picked.name || '';
      _reward.classList.add('show');
      _later(function() { _msg.classList.add('show'); }, 400);
      // 動画終了などで既に _showCloseBtn() 側の「閉じるボタン表示」が保留されていた場合、
      // 選択確定後にここで表示する。
      if (_finished && !_closeBtn.classList.contains('show')) {
        _later(function() { _closeBtn.classList.add('show'); }, 400);
      }
    }, auto ? 0 : 550);
  }

  // ── 動画完了後に閉じるボタンを表示 ─────────────────────────────────────────
  function _showCloseBtn() {
    if (_finished) return;
    _finished = true;
    _clearPendingTimers();
    // 報酬が見えた状態からさらに10秒、閉じるボタンをタップする猶予を確保する
    // （オートクローズは「タップ待ち」の間に消費した時間を引き継がない）。
    _scheduleAutoClose();

    // 動画は最後のフレーム（宝箱が開いた状態）で停止させて残す
    if (_video) { _video.pause(); }
    // フォールバック（🎁アニメ）の場合のみ少し薄くする
    var fb = _container.querySelector('.treasure-fallback');
    if (fb) { fb.style.opacity = '0.4'; fb.style.transition = 'opacity 0.3s'; }

    // アイテムがまだ表示されていなければ表示
    _showReward();
    // 2択モードで未選択の間は閉じるボタンを出さない (選択後 _selectChoice() が表示する)。
    // タップせず放置した場合も _scheduleAutoClose() の safety net (_doClose 側) で
    // 自動選択されてから閉じるので、宝箱が開いたまま固まることはない。
    if (_choiceMode && _choices && !_choiceResolved) return;
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

  // ── キュー処理 (batch:1371) ──
  // _queue の先頭を1件取り出して実行する。空なら busy を解除して待機状態に戻る。
  // rewardsDisabled は呼び出しごとに再評価する (キュー投入時ではなく実行時)。
  // disabled の場合は何も表示せず onClose だけ即時発火し、そのまま次のキューへ進む
  // (=表示が発生しないので busy にする必要がない)。
  function _runQueue() {
    if (_queue.length === 0) { _busy = false; return; }
    var options = _queue.shift();
    if (_isRewardsDisabled()) {
      try { if (options && typeof options.onClose === 'function') options.onClose(); } catch (e) {}
      _runQueue();
      return;
    }
    _busy = true;
    _startTreasure(options);
  }

  // ── メイン: showTreasure ─────────────────────────────────────────────────────
  // 呼び出しは即実行せず必ずキューに積み、busy でなければその場で _runQueue() する。
  // これにより「表示中の宝箱がまだ閉じていない間に別の showTreasure() が呼ばれる」
  // ケース (例: stamp-rally.js の checkSlotReward がスロット報酬とカード完成報酬を
  // 200ms/1200ms の独立 setTimeout で呼ぶ) でも、後発呼び出しは先発が完全に閉じる
  // (onChoose 確定 + モーダル close) まで安全に待たされる。
  window.showTreasure = function(options) {
    _queue.push(options);
    if (!_busy) _runQueue();
  };

  // ── 実処理 (旧 showTreasure 本体。_runQueue() 経由でのみ呼ばれる) ──────────────
  function _startTreasure(options) {
    // options: { name, img, onClose, label }
    // 2択選択モード (batch:1370): options.choices = [choiceA, choiceB] (各 {name, img, ...})
    // を渡すと、単一revealの代わりに2枚並べてタップで選ばせる。選択結果は
    // options.onChoose(選ばれたchoiceオブジェクト) で受け取る (grantReward 等はそこで行う)。
    // choices が無い/不正な場合は従来通りの単一reveal (name/img) のまま変更なし。
    _createUI();
    _clearPendingTimers();
    _destroyVideo();
    _finished = false;
    _fallbackStarted = false;
    _rewardShown = false;
    _closing = false;

    _choiceMode = !!(options && Array.isArray(options.choices) && options.choices.length === 2 &&
                     options.choices[0] && options.choices[1] &&
                     options.choices[0].img && options.choices[1].img);
    _choices = _choiceMode ? options.choices : null;
    _onChoose = _choiceMode ? (options.onChoose || null) : null;
    _choiceResolved = false;
    if (_choiceGrid) {
      _choiceGrid.classList.remove('show');
      var _resetBtns = _choiceGrid.querySelectorAll('.treasure-choice-btn');
      for (var _rb = 0; _rb < _resetBtns.length; _rb++) {
        _resetBtns[_rb].classList.remove('is-active');
        _resetBtns[_rb].setAttribute('aria-pressed', 'false');
      }
    }
    // メインBGMをフェードアウト（演出中は静かに）
    _bgmFadeOut();
    // コンテナ背景をリセット（poster 読込失敗時の黒枠対策で茶系グラデを下敷きに）
    if (_container) {
      _container.style.background = '';
      _container.style.backgroundColor = '#3D1A00';
      _container.style.backgroundImage = '';
      // batch:1371: _doClose() のスケールアウト演出が inline style で
      // transform:scale(0) / 専用の easing (cubic-bezier(0.6,-0.28,0.74,0.05)) を
      // 直接セットしたままになっており、次の表示時にリセットしていなかった。
      // inline style は stylesheet 側の `#treasure-overlay.visible .treasure-container`
      // ルールより強いため、2回目以降の宝箱 (=今回のキュー機構で初めて同一ページ内で
      // 連続表示されるようになった経路) が永久に scale(0) のまま (=見た目上つぶれて
      // 消えたまま) になってしまう事故があった (2026-07-19 Playwright 実行時に発見)。
      // inline transform/transition をクリアし、CSS クラス側の制御に戻す。
      _container.style.transform = '';
      _container.style.transition = '';
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
    _scheduleAutoClose();

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
    // batch:1371: _doClose() 側の除去セレクタが `[style*="z-index:3"]` (スペース無し) だったが、
    // ブラウザは style 属性をシリアライズし直す際に "z-index: 3;" とコロン後にスペースを
    // 挿入するため、実ブラウザでは一度もマッチせず「タップして開けよう」ボタンが auto-close
    // (子どもがタップせず放置した場合の安全策クローズ) のたびに DOM に残留し続け、次の宝箱
    // 表示に古いボタンが重なって残る事故があった (2026-07-19 Playwright 検証で発見)。
    // style 文字列の照合ではなく専用クラス名で確実に識別できるようにする。
    tapOverlay.className = 'treasure-tap-overlay';
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

      // タップまでに掛かった時間ぶんオートクローズの残り時間が食われないよう、
      // ここで10秒の猶予を取り直す（動画(6s)+演出だけで budget を使い切らないため）。
      _scheduleAutoClose();

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
  }
})();
