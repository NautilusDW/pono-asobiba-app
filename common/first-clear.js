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
        img:  v.img
      };
    }
    return {
      icon: rw.icon,
      name: rw.name,
      type: rw.type,
      id:   rw.id,
      img:  rw.img
    };
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
      gameId: gameId,
      name:   rw.name || '',
      icon:   rw.icon || '🎁',
      type:   rw.type || '',
      id:     rw.id || '',
      img:    rw.img || '',
      ts:     Date.now()
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
    if (_isAlreadyGranted(gameId)) return Promise.resolve(false);

    return fetch(_rewardsPath() + '?_=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.firstClearRewards) return false;
        var raw = data.firstClearRewards[gameId];
        if (!raw) return false;

        var rw = _resolveGendered(raw);
        if (!rw || !rw.id) return false;

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
        if (window.showTreasure) {
          window.showTreasure({
            name: rw.name,
            img:  _resolveImgPath(rw.img),
            label: 'はじめての クリア！🎉',
            onClose: opts.onClose || null
          });
        } else if (opts.onClose) {
          // showTreasure が無い環境では直接 onClose を呼ぶ
          setTimeout(opts.onClose, 0);
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
