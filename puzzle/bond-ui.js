// PonoBondUI — 選択中パートナーの画面表示モジュール (簡素化版)
// 仲良し度システム廃止後の最小UI層。
// 依存: window.PonoPartners, window.PonoBond, window.PonoAssistRegister
//
// 機能:
//   1. 右下バッジ: [partner image] + 名前 + 「がんばれ!」吹き出し
//      Lv 星 (★★☆) 表示は廃止。
//   2. クリアサマリー: 「<name> と クリアしたよ！」の 1 行のみ。
//      Lv 昇格カットイン / なかよし ★★☆ 表示は廃止。
//   3. playPartnerPanelAction(ability/celebrate) は維持 (cutin 用)。
//
// Public API:
//   window.PonoBondUI.init()
//   window.PonoBondUI.refreshBadge(partner, stageId)
//   window.PonoBondUI.playPartnerPanelAction(partner, opts)
window.PonoBondUI = (function () {
  'use strict';

  var BADGE_ID = 'pono-bond-badge';
  var SUMMARY_ID = 'pono-bond-summary';
  var panelActionTimer = null;

  // ===== Badge =====
  function ensureBadge() {
    var el = document.getElementById(BADGE_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = BADGE_ID;
    el.className = 'pono-bond-badge hidden';
    // 旧 .pono-bond-badge__stars span は削除。 (CSS は残置だが空 DOM)
    el.innerHTML =
      '<div class="pono-bond-badge__sparkles" aria-hidden="true"></div>' +
      '<div class="pono-bond-badge__bubble" aria-hidden="true">' +
        '<span class="pono-bond-badge__bubble-main">がんばれ!</span>' +
        '<span class="pono-bond-badge__bubble-sub hidden"></span>' +
      '</div>' +
      '<div class="pono-bond-badge__portrait">' +
        '<img class="pono-bond-badge__img" alt="">' +
      '</div>';
    document.body.appendChild(el);
    return el;
  }

  // Phase 3b Step 3 (継続): ヒントボタンは常に表示
  function syncHintBtnVisibility(_hasPartner) {
    try {
      var hintBtn = document.getElementById('btn-hint');
      if (!hintBtn) return;
      hintBtn.style.display = '';
    } catch (_) {}
  }

  function refreshBadge(partner, _stageId) {
    var el = ensureBadge();
    if (partner && window.PonoPartners && typeof window.PonoPartners.isUnlocked === 'function'
        && !window.PonoPartners.isUnlocked(partner)) {
      partner = null;
    }
    if (!partner) {
      el.classList.add('hidden');
      syncHintBtnVisibility(false);
      return;
    }
    var imgEl = el.querySelector('.pono-bond-badge__img');
    if (imgEl && partner.image) {
      if (imgEl.getAttribute('src') !== partner.image) {
        imgEl.src = partner.image;
      }
      imgEl.alt = partner.name || '';
    }
    el.setAttribute('data-partner-id', partner.id || '');
    setBadgeSpeech(el, 'がんばれ!', '');
    el.classList.remove('hidden');
    syncHintBtnVisibility(true);
  }

  function setBadgeSpeech(el, main, sub) {
    if (!el) return;
    var mainEl = el.querySelector('.pono-bond-badge__bubble-main');
    var subEl = el.querySelector('.pono-bond-badge__bubble-sub');
    if (mainEl) mainEl.textContent = main || 'がんばれ!';
    if (subEl) {
      subEl.textContent = sub || '';
      subEl.classList.toggle('hidden', !sub);
    }
  }

  function playPartnerPanelAction(partner, opts) {
    opts = opts || {};
    if (!partner) return false;
    var el = ensureBadge();
    refreshBadge(partner, opts.stageId);
    var type = opts.type === 'celebrate' ? 'celebrate' : 'ability';
    var message = opts.message || (type === 'celebrate' ? 'やったね!' : 'がんばれ!');
    var label = opts.label || '';
    setBadgeSpeech(el, message, label);

    el.classList.remove('is-ability', 'is-celebrate');
    void el.offsetWidth;
    el.classList.add(type === 'celebrate' ? 'is-celebrate' : 'is-ability');

    if (panelActionTimer) {
      clearTimeout(panelActionTimer);
      panelActionTimer = null;
    }
    panelActionTimer = setTimeout(function () {
      el.classList.remove('is-ability', 'is-celebrate');
      setBadgeSpeech(el, 'がんばれ!', '');
      panelActionTimer = null;
    }, type === 'celebrate' ? 2200 : 1500);
    return true;
  }

  // ===== Clear Summary =====
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureSummary() {
    var el = document.getElementById(SUMMARY_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = SUMMARY_ID;
    el.className = 'pono-bond-summary';
    // モーダル内に差し込む (success-modal の「つぎへ」ボタン直前)。
    var modalContent = document.querySelector('#success-modal .modal-content');
    if (modalContent) {
      var nextBtn = document.getElementById('btn-next-stage');
      if (nextBtn && nextBtn.parentNode === modalContent) {
        modalContent.insertBefore(el, nextBtn);
      } else {
        modalContent.appendChild(el);
      }
    } else {
      document.body.appendChild(el);
    }
    return el;
  }

  function renderSummary(ctx) {
    if (!ctx || !ctx.partner) return;
    var partner = ctx.partner;
    var stage = ctx.stage || {};
    var stageId = stage.id != null ? stage.id : (ctx.stageIndex + 1);

    var el = ensureSummary();
    var line = (partner.name || '') + 'と クリアしたよ！';
    el.innerHTML = '<p class="pono-bond-summary__line1">' + escapeHtml(line) + '</p>';
    el.classList.remove('hidden');

    // バッジ celebrate 演出
    refreshBadge(partner, stageId);
    playPartnerPanelAction(partner, {
      type: 'celebrate',
      stageId: stageId,
      message: 'やったね!',
      label: 'クリア!',
    });
  }

  // ===== Stage tracking (バッジ表示更新のみ) =====
  function onStageStart(ctx) {
    var partner = ctx && ctx.partner;
    var stage = ctx && ctx.stage;
    if (!partner || !stage) return;
    var stageId = stage.id != null ? stage.id : ((ctx.stageIndex | 0) + 1);
    refreshBadge(partner, stageId);
  }

  // ===== init =====
  var inited = false;
  function init() {
    if (inited) return;
    inited = true;
    ensureBadge();
    if (typeof window.PonoAssistRegister === 'function') {
      window.PonoAssistRegister('afterStageReady', onStageStart);
      window.PonoAssistRegister('afterShowSuccess', renderSummary);
    }
    // 初期バッジ: 既に選択済みパートナーがあれば描画
    try {
      var pid = window.PonoBond && window.PonoBond.getSelectedPartner && window.PonoBond.getSelectedPartner();
      if (pid && window.PonoPartners && window.PonoPartners.get) {
        var p = window.PonoPartners.get(pid);
        if (p) refreshBadge(p, null);
      }
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    setTimeout(init, 0);
  }

  return {
    init: init,
    refreshBadge: refreshBadge,
    playPartnerPanelAction: playPartnerPanelAction,
  };
})();
