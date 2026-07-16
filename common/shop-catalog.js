// ─── どんぐりショップ: 家具カタログ判定 ─────────────────────────
// room/items.js の家具のうち「実績専用」(ショップ非売品) か「ショップ販売対象」かを判定する。
// window.PonoShopCatalog 名前空間で export する。common/achievements.js / common/tier.js を
// 実行時に読み、実績専用idの一覧をハードコードしない。
(function (window) {
  'use strict';

  // room/items.js の cat と1対1対応 (wall=壁紙 / floor=床 / furn=家具 / deco=かざり)。
  // stamp-rally.js の reward.type は sea/bg 等ショップ家具カタログと無関係な値も取るため、
  // ここに列挙した型だけを実績(スタンプ)専用idの収集対象にする。
  var ROOM_CATALOG_REWARD_TYPES = { furn: true, deco: true, wall: true, floor: true };

  function _addRoomCatalogRewardId(ids, entry) {
    if (!entry) return;
    if (entry.gendered) {
      _addRoomCatalogRewardId(ids, entry.boy);
      _addRoomCatalogRewardId(ids, entry.girl);
      return;
    }
    if (entry.id && ROOM_CATALOG_REWARD_TYPES[entry.type]) ids.add(entry.id);
  }

  // rewards.json の firstClearRewards (各ゲーム初回クリア報酬) は
  // window.PonoStampRally 経由では取得できない (stamp-rally.js の _loadRewardsJSON は
  // slotRewards/cardCompleteRewards しか見ておらず、かつ相対パスが shop/やadmin/から
  // 404 する既知の問題があるため実質フォールバックのまま)。ここで独立に fetch し、
  // 取得できた分だけ実績専用集合へ足す。失敗時は空集合のまま (既存ロジックに影響なし)。
  var _firstClearAchievementIds = new Set();
  (function _loadFirstClearRewardIds() {
    try {
      var scriptEl = document.currentScript;
      var url = (scriptEl && scriptEl.src)
        ? scriptEl.src.replace(/common\/shop-catalog\.js(\?.*)?$/, 'assets/data/rewards.json')
        : '../assets/data/rewards.json';
      fetch(url)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !data.firstClearRewards) return;
          var fcr = data.firstClearRewards;
          for (var gameKey in fcr) {
            if (Object.prototype.hasOwnProperty.call(fcr, gameKey)) _addRoomCatalogRewardId(_firstClearAchievementIds, fcr[gameKey]);
          }
        })
        .catch(function () {});
    } catch (e) {}
  })();

  function computeAchievementOnlyIds() {
    var ids = new Set();
    try {
      var list = (typeof window.getActiveAchievements === 'function') ? window.getActiveAchievements() : [];
      for (var i = 0; i < list.length; i++) {
        var a = list[i];
        if (a && a.reward && a.reward.type === 'furn' && a.reward.id) ids.add(a.reward.id);
      }
    } catch (e) {}
    // PREMIUM_BONUS.furn (achievements.js) は非公開だが、common/tier.js の
    // BOOK_ROOM_ITEM_IDS と値を一致させる運用ルール (achievements.js のコメント参照) のため、
    // 公開済みの window.PonoTier.BOOK_ROOM_ITEM_IDS を実行時ソースとして使う。
    try {
      var premiumFurn = (window.PonoTier && Array.isArray(window.PonoTier.BOOK_ROOM_ITEM_IDS))
        ? window.PonoTier.BOOK_ROOM_ITEM_IDS : [];
      for (var j = 0; j < premiumFurn.length; j++) ids.add(premiumFurn[j]);
    } catch (e) {}
    // window.PonoStampRally 未読込のページ (どんぐりショップ等) では no-op。
    try {
      var rally = window.PonoStampRally;
      if (rally) {
        var slotRewards = rally.CARD_SLOT_REWARDS || {};
        for (var sk in slotRewards) {
          if (Object.prototype.hasOwnProperty.call(slotRewards, sk)) _addRoomCatalogRewardId(ids, slotRewards[sk]);
        }
        var completeRewards = rally.CARD_COMPLETE_REWARDS || [];
        for (var ci = 0; ci < completeRewards.length; ci++) _addRoomCatalogRewardId(ids, completeRewards[ci]);
      }
    } catch (e) {}
    // firstClearRewards は fetch 完了まで空集合 (呼び出しタイミング次第で反映が遅れうる)。
    try {
      _firstClearAchievementIds.forEach(function (id) { ids.add(id); });
    } catch (e) {}
    return ids;
  }

  function resolveFurnitureRarity(item) {
    if (!item || !item.id) return null;
    if (computeAchievementOnlyIds().has(item.id)) return null;
    if (typeof item.price === 'number') {
      if (item.price >= 35) return 'super';
      if (item.price >= 25) return 'rare';
      if (item.price >= 15) return 'normal';
    }
    if (item.cat === 'wall' || item.cat === 'floor') return 'normal';
    if (item.cat === 'deco') return 'normal';
    if (item.cat === 'furn' && item.theme === 'all') return 'rare';
    if (item.cat === 'furn' && (item.theme === 'boy' || item.theme === 'girl')) return 'super';
    return null;
  }

  window.PonoShopCatalog = {
    computeAchievementOnlyIds: computeAchievementOnlyIds,
    resolveFurnitureRarity: resolveFurnitureRarity
  };
})(typeof window !== 'undefined' ? window : this);
