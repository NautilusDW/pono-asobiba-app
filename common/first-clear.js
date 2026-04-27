// ═══════════════════════════════════════════════════════════════════
// 共通ヘルパー: ゲーム初回クリア報酬
// ═══════════════════════════════════════════════════════════════════
// 各ゲームは最終ステージをクリアした直後に
//   window.triggerFirstClearReward('maze')
// を呼ぶ。このヘルパーが以下を実行する:
//   1. rewards.json の firstClearRewards[gameId] を取得
//   2. すでに付与済みならスキップ（二重付与防止）
//   3. gendered なら pono_profile.gender で boy/girl を選択
//   4. window.grantReward で部屋コレクションに追加
//   5. ホーム画面で再生するスタンプ演出の情報を localStorage に記録
//   6. window.showTreasure で宝箱演出を即座に表示
//
// 前提: 呼び出し元ページは common/achievements.js と common/treasure.js を
// 既に読み込んでいること（grantReward / showTreasure が window に存在）。
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var LS_GRANTED = 'pono_first_clear_granted';   // 付与済みゲームID配列
  var LS_PENDING = 'pono_pending_first_clear';    // ホーム帰還時に演出すべき項目

  function _getJSON(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function _setJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  // rewards.json のパス（ゲームページは ../assets/data/rewards.json）
  function _rewardsPath() {
    // このスクリプトが ../common/first-clear.js として読まれていればゲームページ
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('../common/first-clear.js') !== -1) {
        return '../assets/data/rewards.json';
      }
    }
    return 'assets/data/rewards.json';
  }

  // 画像パスをゲームページ用に補正（assets/ で始まるなら ../ を前置）
  function _resolveImgPath(p) {
    if (!p) return '';
    // 既に絶対・相対・URL・data URI ならそのまま使う
    if (/^\.\.?\//.test(p) || /^https?:/.test(p) || /^\//.test(p) || /^data:/.test(p)) return p;
    // ゲームページ用かホーム用か: _rewardsPath() と同じ判定
    if (_rewardsPath().indexOf('../') === 0) return '../' + p;
    return p;
  }

  // gendered エントリを現在のプロフィールに応じて解決
  function _resolveGendered(rw) {
    if (!rw) return null;
    if (rw.gendered) {
      var g = 'boy';
      try {
        g = JSON.parse(localStorage.getItem('pono_profile') || '{}').gender || 'boy';
      } catch (e) {}
      var v = rw[g] || rw.boy || {};
      return {
        icon: rw.icon,
        name: v.name || rw.name,
        type: v.type,
        id:   v.id,
        img:  v.img,
        afterMsg: v.afterMsg || rw.afterMsg || ''
      };
    }
    return {
      icon: rw.icon,
      name: rw.name,
      type: rw.type,
      id:   rw.id,
      img:  rw.img,
      afterMsg: rw.afterMsg || ''
    };
  }

  // ゲームページで showAfterMsgOverlay が無い場合のフォールバック
  function _simpleAfterMsg(name, img, msg, onDone) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:20px;padding:20px;text-align:center;max-width:280px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3);';
    if (img) {
      var i = document.createElement('img');
      i.src = img;
      i.style.cssText = 'width:80px;height:80px;object-fit:contain;margin-bottom:8px;';
      i.onerror = function () { this.style.display = 'none'; };
      box.appendChild(i);
    }
    if (name) {
      var n = document.createElement('div');
      n.style.cssText = 'font-size:0.85rem;font-weight:900;color:#F2915A;margin-bottom:8px;';
      n.textContent = name;
      box.appendChild(n);
    }
    var m = document.createElement('div');
    m.style.cssText = 'font-size:0.9rem;font-weight:900;color:#5D4E37;line-height:1.7;white-space:pre-line;';
    m.textContent = msg;
    box.appendChild(m);
    var btn = document.createElement('button');
    btn.textContent = 'わかった！';
    btn.style.cssText = 'margin-top:12px;padding:10px 28px;border:none;border-radius:50px;background:linear-gradient(135deg,#60A5FA,#3B82F6);color:#fff;font-family:inherit;font-size:0.9rem;font-weight:900;cursor:pointer;';
    btn.addEventListener('click', function () {
      ov.remove();
      if (onDone) onDone();
    });
    box.appendChild(btn);
    ov.appendChild(box);
    document.body.appendChild(ov);
  }

  // 付与済み判定
  function _isAlreadyGranted(gameId) {
    var list = _getJSON(LS_GRANTED, []);
    return Array.isArray(list) && list.indexOf(gameId) !== -1;
  }

  function _markGranted(gameId) {
    var list = _getJSON(LS_GRANTED, []);
    if (!Array.isArray(list)) list = [];
    if (list.indexOf(gameId) === -1) {
      list.push(gameId);
      _setJSON(LS_GRANTED, list);
    }
  }

  // ホーム帰還時に演出する情報をキュー
  function _queuePending(gameId, rw) {
    var pending = _getJSON(LS_PENDING, []);
    if (!Array.isArray(pending)) pending = [];
    pending.push({
      gameId:   gameId,
      name:     rw.name || '',
      icon:     rw.icon || '🎁',
      type:     rw.type || '',
      id:       rw.id || '',
      img:      rw.img || '',
      afterMsg: rw.afterMsg || '',
      ts:       Date.now()
    });
    _setJSON(LS_PENDING, pending);
  }

  // 外部 API: ゲームから呼ばれる
  // 引数: gameId (string), opts (object, 省略可)
  //   opts.onClose: 宝箱を閉じた時に呼ばれるコールバック（次の画面遷移に使う）
  // 戻り値: Promise<boolean>  true=演出発火、false=スキップ（既に付与済み／定義なし）
  window.triggerFirstClearReward = function (gameId, opts) {
    opts = opts || {};
    if (!gameId) return Promise.resolve(false);
    // MVP: 報酬制度封印中は宝箱・afterMsg 連鎖を全部止める。
    // grantReward / _markGranted / _queuePending も呼ばないので、再公開時に
    // ゲームをもう一度クリアした時点でリワードが正規に発火する。
    if (window.PONO_MVP_NO_REWARDS) {
      try { if (typeof opts.onClose === 'function') opts.onClose(); } catch (e) {}
      return Promise.resolve(false);
    }
    if (_isAlreadyGranted(gameId)) return Promise.resolve(false);

    return fetch(_rewardsPath() + '?_=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.firstClearRewards) return false;
        var raw = data.firstClearRewards[gameId];
        if (!raw) return false;

        var rw = _resolveGendered(raw);
        if (!rw || !rw.id) return false;

        // おうちアンロック状態に応じて afterMsg に案内文を追記
        //   ・未アンロック: 「スタンプを あつめて ベッドを もらったら、おへやに かざれるように なるよ！」
        //   ・アンロック済: 「おへやに かざってみてね！」
        // こうすることで「もらったけど今は使えない」状態でも子どもが混乱しない。
        try {
          var roomUnlocked = localStorage.getItem('pono_room_card_open') === '1';
          var hint = roomUnlocked
            ? 'おへやに かざってみてね！'
            : 'スタンプを あつめて ベッドを もらったら、おへやに かざれるように なるよ！';
          var base = (rw.afterMsg || '').replace(/\s+$/, '');
          rw.afterMsg = base ? (base + '\n\n' + hint) : hint;
        } catch (e) { /* localStorage 不能環境でも致命的ではないのでそのまま */ }

        // 先に部屋コレクションに付与（grantReward は idempotent なので二重付与の心配なし）
        // 失敗してもキャッチしてマーキング自体はスキップさせない
        var grantOk = false;
        try {
          if (window.grantReward) {
            window.grantReward({ type: rw.type, id: rw.id });
            grantOk = true;
          }
        } catch (e) {
          console.warn('[first-clear] grantReward failed:', e);
          // grantReward が失敗しても演出は出したいので続行
          // （マーキングはしないので次回もう1度試行される）
        }

        // grantReward 成功時のみマーキング（失敗時は次回リトライ）
        if (grantOk) _markGranted(gameId);

        // ホーム帰還時に演出する情報をキュー
        _queuePending(gameId, rw);

        // 宝箱演出を即座に表示
        // 閉じた後: afterMsg があれば表示 → opts.onClose を呼ぶ
        var resolvedImg = _resolveImgPath(rw.img);
        var chainedClose = function() {
          if (rw.afterMsg && typeof window.showAfterMsgOverlay === 'function') {
            window.showAfterMsgOverlay(
              { name: rw.name, img: resolvedImg, afterMsg: rw.afterMsg },
              opts.onClose || null
            );
          } else if (rw.afterMsg) {
            // showAfterMsgOverlay が無いゲームページ用の簡易実装
            _simpleAfterMsg(rw.name, resolvedImg, rw.afterMsg, opts.onClose || null);
          } else if (opts.onClose) {
            opts.onClose();
          }
        };

        if (opts.skipImmediate) {
          // ゲーム内では表示しない。pono_pending_first_clear にキュー済みなので
          // play.html の checkPendingFirstClear が帰還時に演出する。
          if (opts.onClose) opts.onClose();
        } else if (window.showTreasure) {
          window.showTreasure({
            name: rw.name,
            img:  resolvedImg,
            label: 'はじめての クリア！🎉',
            onClose: chainedClose
          });
        } else {
          chainedClose();
        }

        return true;
      })
      .catch(function (e) {
        console.warn('[first-clear] failed to load rewards.json:', e);
        // 失敗時はスキップ扱いなので、呼び出し元は fallback 処理に入る
        return false;
      });
  };

  // デバッグ用: 付与記録をリセット（開発時のみ）
  window.resetFirstClearRewards = function () {
    localStorage.removeItem(LS_GRANTED);
    localStorage.removeItem(LS_PENDING);
    console.log('[first-clear] reset granted + pending');
  };
})();
