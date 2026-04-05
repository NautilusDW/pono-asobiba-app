// ── common/treasure.js ──
// 宝箱演出モジュール
// 使い方: showTreasure({ name: 'アイテム名', img: 'path/to/img.png' })
// 各ゲームで <script src="../common/treasure.js"></script> として読み込む

(function() {
  'use strict';

  var _overlay = null;
  var _video = null;
  var _reward = null;
  var _msg = null;
  var _closeBtn = null;
  var _onClose = null;

  function _createUI() {
    if (_overlay) return;

    // CSS
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
      '  width:80px; height:80px; object-fit:contain;',
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
    ].join('\n');
    document.head.appendChild(style);

    // HTML
    _overlay = document.createElement('div');
    _overlay.id = 'treasure-overlay';
    _overlay.innerHTML =
      '<div class="treasure-label" id="treasure-label"></div>' +
      '<div class="treasure-container">' +
        '<video id="treasure-video" playsinline muted>' +
          '<source src="' + _getVideoPath() + '" type="video/mp4">' +
        '</video>' +
        '<div class="treasure-reward" id="treasure-reward">' +
          '<img id="treasure-reward-img" alt="ごほうび">' +
          '<div class="treasure-reward-name" id="treasure-reward-name"></div>' +
        '</div>' +
      '</div>' +
      '<div class="treasure-msg" id="treasure-msg">🎉 ごほうびを ゲット！</div>' +
      '<button class="treasure-close" id="treasure-close">やったー！</button>';
    document.body.appendChild(_overlay);

    _video = document.getElementById('treasure-video');
    _reward = document.getElementById('treasure-reward');
    _msg = document.getElementById('treasure-msg');
    _closeBtn = document.getElementById('treasure-close');

    _closeBtn.addEventListener('click', function() {
      _overlay.classList.remove('show');
      _video.pause();
      if (_onClose) { _onClose(); _onClose = null; }
    });
  }

  function _getVideoPath() {
    // ゲームページ（../common/）からのパスとトップページ（common/）からのパスを判定
    if (document.querySelector('script[src*="../common/treasure.js"]')) {
      return '../assets/videos/TreasureBox.mp4';
    }
    return 'assets/videos/TreasureBox.mp4';
  }

  window.showTreasure = function(options) {
    // options: { name: 'アイテム名', img: 'path/to/img.png', onClose: function }
    _createUI();

    var name = options.name || 'ごほうび';
    var label = options.label || '';
    document.getElementById('treasure-label').textContent = label;
    var img = options.img || '';

    // リセット
    _reward.classList.remove('show');
    _msg.classList.remove('show');
    _closeBtn.classList.remove('show');

    // アイテム画像と名前
    var rewardImg = document.getElementById('treasure-reward-img');
    if (img) {
      rewardImg.src = img;
      rewardImg.style.display = '';
    } else {
      rewardImg.src = '';
      rewardImg.style.display = 'none';
    }
    document.getElementById('treasure-reward-name').textContent = name;
    _onClose = options.onClose || null;

    // 動画パスを再設定し、sourceも更新
    var vpath = _getVideoPath();
    _video.src = vpath;
    var sourceEl = _video.querySelector('source');
    if (sourceEl) sourceEl.src = vpath;
    _video.load();

    _overlay.classList.add('show');
    _video.play().then(function() {
      // 再生成功 — 動画の長さに基づいてフォールバック設定
      var dur = _video.duration;
      if (dur && isFinite(dur)) {
        // 動画終了+0.5秒後にもボタンが出てなければ強制表示
        setTimeout(function() {
          _msg.classList.add('show');
          _closeBtn.classList.add('show');
        }, (dur * 1000) + 500);
      } else {
        // 長さ不明の場合は6秒後にフォールバック
        setTimeout(function() {
          _msg.classList.add('show');
          _closeBtn.classList.add('show');
        }, 6000);
      }
    }).catch(function() {
      // 自動再生失敗時はスキップしてアイテム表示
      _reward.classList.add('show');
      _msg.classList.add('show');
      _closeBtn.classList.add('show');
    });

    // 宝箱が開くタイミング（約3秒後）でアイテムを表示
    setTimeout(function() {
      _reward.classList.add('show');
    }, 3000);

    // 動画終了後にメッセージとボタン表示
    _video.onended = function() {
      _msg.classList.add('show');
      _closeBtn.classList.add('show');
    };
  };
})();
