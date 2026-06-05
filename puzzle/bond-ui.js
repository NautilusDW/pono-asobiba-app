// PonoBondUI — なかよし度の画面表示モジュール。
// 「もりのなかよし」MVP の UI 層。
// 依存: window.PonoPartners, window.PonoBond, window.PonoAssistRegister
//
// 機能:
//   1. 右下ハートバッジ: [partner image] ★★ (現在選択中パートナーの Lv 表示)
//   2. Lv 昇格カットイン: addHeart() の結果が leveledUp === true なら
//        Lv2 → 「○○と なかよし になったよ！」
//        Lv3 → 「○○と だいすき になったよ！」
//      を 3 秒間オーバーレイで表示。
//   3. クリアサマリー強化: afterShowSuccess hook で別 div を append し、
//      パートナー名 / ハート数 / Lv / クリア時間 (前回比) /
//      ヒント使用 / 連続スナップ最大数 を表示。
//
// localStorage keys (prefix: 'pono_bond_'):
//   pono_bond_last_time_<stageId>_<partnerId>   - 直近クリア時間 (ms)
//   pono_bond_hints_used_<stageId>_<partnerId>  - ヒント使用回数 (MVP 常に 0)
//   pono_bond_max_combo_<stageId>_<partnerId>   - 連続スナップ最大数
//
// Public API:
//   window.PonoBondUI.init()
//   window.PonoBondUI.showLevelUpCutIn(partner, level)
//   window.PonoBondUI.refreshBadge(partner, stageId)
window.PonoBondUI = (function () {
  'use strict';

  var PREFIX = 'pono_bond_';
  var LEVEL_LABELS = ['', 'はじめまして', 'なかよし', 'だいすき'];
  var BADGE_ID = 'pono-bond-badge';
  var CUTIN_ID = 'pono-bond-cutin';
  var SUMMARY_ID = 'pono-bond-summary';

  // 計測ステート (ステージ開始 → クリア間で保持)
  var stageStartMs = null;
  var stageHintsUsed = 0;
  var stageMaxCombo = 0;
  var stageCurCombo = 0;
  var trackedStageId = null;
  var trackedPartnerId = null;

  // localStorage 安全ラッパ
  function lsGet(key) {
    try { return window.localStorage.getItem(key); } catch (_) { return null; }
  }
  function lsSet(key, val) {
    try { window.localStorage.setItem(key, String(val)); } catch (_) {}
  }
  function readNumber(key) {
    var raw = lsGet(key);
    if (raw == null) return 0;
    var n = parseInt(raw, 10);
    return isFinite(n) && n >= 0 ? n : 0;
  }

  function lastTimeKey(stageId, partnerId) {
    return PREFIX + 'last_time_' + String(stageId) + '_' + String(partnerId);
  }
  function hintsKey(stageId, partnerId) {
    return PREFIX + 'hints_used_' + String(stageId) + '_' + String(partnerId);
  }
  function comboKey(stageId, partnerId) {
    return PREFIX + 'max_combo_' + String(stageId) + '_' + String(partnerId);
  }

  // ===== Badge =====
  function ensureBadge() {
    var el = document.getElementById(BADGE_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = BADGE_ID;
    el.className = 'pono-bond-badge hidden';
    el.innerHTML =
      '<img class="pono-bond-badge__img" alt="">' +
      '<span class="pono-bond-badge__stars" aria-label="なかよし度"></span>';
    document.body.appendChild(el);
    return el;
  }

  function starsForLevel(level) {
    var n = Math.max(0, Math.min(3, level | 0));
    var filled = '';
    for (var i = 0; i < n; i++) filled += '★';
    var empty = '';
    for (var j = n; j < 3; j++) empty += '☆';
    return filled + empty;
  }

  // Phase 3b Step 3 新仕様:
  // ヒントボタンはパートナー有無に関わらず常に表示する。
  // 旧仕様では partner 選択時は assist がヒント役を果たすので非表示にしていたが、
  // 新仕様ではヒントボタンが「選択ピース → 金色星」演出を提供する独立機能となり、
  // パートナー有無に依らず常時利用可能とする。 残回数は main.js 側で localStorage 管理。
  function syncHintBtnVisibility(_hasPartner) {
    try {
      var hintBtn = document.getElementById('btn-hint');
      if (!hintBtn) return;
      // 常に表示 (display プロパティをクリア)
      hintBtn.style.display = '';
    } catch (_) {}
  }

  function refreshBadge(partner, stageId) {
    var el = ensureBadge();
    if (!partner) {
      el.classList.add('hidden');
      syncHintBtnVisibility(false);
      return;
    }
    var imgEl = el.querySelector('.pono-bond-badge__img');
    var starsEl = el.querySelector('.pono-bond-badge__stars');
    if (imgEl && partner.image) {
      if (imgEl.getAttribute('src') !== partner.image) {
        imgEl.src = partner.image;
      }
      imgEl.alt = partner.name || '';
    }
    var level = 0;
    try {
      if (stageId != null && window.PonoBond && typeof window.PonoBond.getLevel === 'function') {
        level = window.PonoBond.getLevel(partner.id, stageId);
      }
    } catch (_) {}
    if (starsEl) starsEl.textContent = starsForLevel(level);
    el.classList.remove('hidden');
    syncHintBtnVisibility(true);
  }

  // ===== Level-Up Cut-In =====
  function ensureCutIn() {
    var el = document.getElementById(CUTIN_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = CUTIN_ID;
    el.className = 'pono-bond-cutin hidden';
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<div class="pono-bond-cutin__inner">' +
        '<img class="pono-bond-cutin__img" alt="">' +
        '<div class="pono-bond-cutin__text"></div>' +
      '</div>';
    document.body.appendChild(el);
    return el;
  }

  var cutInTimer = null;
  function showLevelUpCutIn(partner, level) {
    if (!partner) return;
    var lv = level | 0;
    if (lv < 2) return; // Lv2/Lv3 のみ演出対象
    var label = lv >= 3 ? 'だいすき' : 'なかよし';
    var name = partner.name || '';
    var msg = name + 'と ' + label + ' になったよ！';
    var el = ensureCutIn();
    var imgEl = el.querySelector('.pono-bond-cutin__img');
    var textEl = el.querySelector('.pono-bond-cutin__text');
    if (imgEl && partner.image) {
      imgEl.src = partner.image;
      imgEl.alt = name;
    }
    if (textEl) textEl.textContent = msg;
    el.classList.remove('hidden');
    // CSS アニメーションを再スタート
    el.classList.remove('is-active');
    void el.offsetWidth;
    el.classList.add('is-active');
    if (cutInTimer) { clearTimeout(cutInTimer); cutInTimer = null; }
    cutInTimer = setTimeout(function () {
      el.classList.add('hidden');
      el.classList.remove('is-active');
      cutInTimer = null;
    }, 3000);
  }

  // ===== Clear Summary =====
  function formatMs(ms) {
    if (!isFinite(ms) || ms <= 0) return '--';
    var sec = Math.round(ms / 1000);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    if (m <= 0) return s + 'びょう';
    return m + 'ふん' + (s < 10 ? '0' + s : s) + 'びょう';
  }

  function buildSummaryHtml(opts) {
    var partner = opts.partner;
    var stageNum = opts.stageNum;
    var hearts = opts.hearts;
    var level = opts.level;
    var elapsedMs = opts.elapsedMs;
    var prevMs = opts.prevMs;
    var hints = opts.hints;
    var maxCombo = opts.maxCombo;

    var line1 = (partner.name || '') + ' と ステージ' + stageNum +
      ' で ' + hearts + 'かい あそんだよ / Lv: ' + starsForLevel(level);

    var diffText = '';
    if (elapsedMs > 0 && prevMs > 0) {
      var diff = elapsedMs - prevMs;
      if (diff < -500) {
        diffText = ' (まえより ' + formatMs(-diff) + ' はやい！)';
      } else if (diff > 500) {
        diffText = ' (まえより ' + formatMs(diff) + ' おそい)';
      } else {
        diffText = ' (まえと おなじくらい)';
      }
    } else if (elapsedMs > 0) {
      diffText = ' (はじめての きろく)';
    }

    var line2parts = [];
    if (elapsedMs > 0) line2parts.push('じかん: ' + formatMs(elapsedMs) + diffText);
    line2parts.push('ヒント: ' + (hints | 0) + 'かい');
    line2parts.push('れんぞくスナップ: ' + (maxCombo | 0));

    return (
      '<p class="pono-bond-summary__line1">' + escapeHtml(line1) + '</p>' +
      '<p class="pono-bond-summary__line2">' + line2parts.map(escapeHtml).join(' / ') + '</p>'
    );
  }

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
    // モーダル内に差し込む。 modal-content の末尾。
    var modalContent = document.querySelector('#success-modal .modal-content');
    if (modalContent) {
      // 「つぎへ」ボタンの直前に挿入したい
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
    var stage = ctx.stage || {};
    var partner = ctx.partner;
    var bondResult = ctx.bondResult || {};
    var stageId = stage.id != null ? stage.id : (ctx.stageIndex + 1);
    var stageNum = (typeof ctx.stageIndex === 'number') ? (ctx.stageIndex + 1) : stageId;
    var hearts = bondResult.hearts != null ? bondResult.hearts : 0;
    var level = bondResult.level != null ? bondResult.level
      : (window.PonoBond ? window.PonoBond.getLevel(partner.id, stageId) : 0);

    // 経過時間の計測値を確定
    var elapsedMs = 0;
    if (stageStartMs && trackedStageId === stageId && trackedPartnerId === partner.id) {
      elapsedMs = Math.max(0, Math.round(performance.now() - stageStartMs));
    }
    var prevKey = lastTimeKey(stageId, partner.id);
    var prevMs = readNumber(prevKey);

    // 永続化
    if (elapsedMs > 0) lsSet(prevKey, elapsedMs);
    lsSet(hintsKey(stageId, partner.id), stageHintsUsed | 0);
    var prevCombo = readNumber(comboKey(stageId, partner.id));
    var newCombo = Math.max(prevCombo, stageMaxCombo | 0);
    lsSet(comboKey(stageId, partner.id), newCombo);

    var el = ensureSummary();
    el.innerHTML = buildSummaryHtml({
      partner: partner,
      stageNum: stageNum,
      hearts: hearts,
      level: level,
      elapsedMs: elapsedMs,
      prevMs: prevMs,
      hints: stageHintsUsed,
      maxCombo: newCombo,
    });
    el.classList.remove('hidden');

    // Lv 昇格カットイン
    if (bondResult.leveledUp && level >= 2) {
      showLevelUpCutIn(partner, level);
    }

    // バッジ更新
    refreshBadge(partner, stageId);
  }

  // ===== Stage tracking (時間 / コンボ計測) =====
  function onStageStart(ctx) {
    var partner = ctx && ctx.partner;
    var stage = ctx && ctx.stage;
    if (!partner || !stage) {
      stageStartMs = null;
      trackedStageId = null;
      trackedPartnerId = null;
      return;
    }
    var stageId = stage.id != null ? stage.id : ((ctx.stageIndex | 0) + 1);
    stageStartMs = performance.now();
    stageHintsUsed = 0;
    stageMaxCombo = 0;
    stageCurCombo = 0;
    trackedStageId = stageId;
    trackedPartnerId = partner.id;
    refreshBadge(partner, stageId);
  }

  function onAfterSnap(ctx) {
    if (!ctx) return;
    stageCurCombo = (stageCurCombo | 0) + 1;
    if (stageCurCombo > stageMaxCombo) stageMaxCombo = stageCurCombo;
  }

  function onHintUsed() {
    stageHintsUsed = (stageHintsUsed | 0) + 1;
    // ヒント使用でコンボリセット
    stageCurCombo = 0;
  }

  // ===== init =====
  var inited = false;
  function init() {
    if (inited) return;
    inited = true;
    // DOM 構築 (バッジは hidden 状態で待機)
    ensureBadge();
    // hook 登録 (PonoAssistRegister が無い場合は静かにスキップ)
    if (typeof window.PonoAssistRegister === 'function') {
      window.PonoAssistRegister('afterStageReady', onStageStart);
      window.PonoAssistRegister('afterSnap', onAfterSnap);
      window.PonoAssistRegister('afterShowSuccess', renderSummary);
    }
    // ヒントボタンがあれば計測対象に
    var hintBtn = document.getElementById('btn-hint');
    if (hintBtn) {
      hintBtn.addEventListener('click', onHintUsed);
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

  // DOMContentLoaded 後に init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    // 既に DOM 構築済みなら同期で
    setTimeout(init, 0);
  }

  return {
    init: init,
    showLevelUpCutIn: showLevelUpCutIn,
    refreshBadge: refreshBadge,
  };
})();
