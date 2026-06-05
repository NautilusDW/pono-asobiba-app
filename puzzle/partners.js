// PonoPartners — パートナー定義テーブル。
// 「もりのなかよし」MVP のデータ層。main.js より先に読み込むこと。
// Public API:
//   PonoPartners.list                - 配列 (定義順)
//   PonoPartners.get(id)             - 単一定義、未知IDなら null
//   PonoPartners.defaultId           - 既定パートナーID ('kitsune')
//   PonoPartners.getTier             - 現在の利用ティア ('free'|'book'|'sub')
//   PonoPartners.isUnlocked(partner) - パートナーが現在ティアで使えるか
//   PonoPartners.getUnlockLabel(partner) - ロック表示文言
//
// 各エントリのスキーマは README およびプラン
// (misty-kindling-rainbow.md) の「パートナー仕様」を参照。
// 画像はパートナー選択カード用の専用 512px 正方形サムネイルを使う。
window.PonoPartners = (function () {
  'use strict';

  var PARTNER_IMAGES = '../assets/images/puzzle/partners/';

  var TIER_RANK = { free: 1, book: 2, sub: 3 };

  /** 配列順 = パートナー選択画面の並び順 */
  var PARTNERS = [
    {
      id: 'kitsune',
      name: 'キツネ',
      // ユーザーFB(2026-06-05): 「おませ」が「ちょっとずるい」と読まれ
      // 子どもに分かりにくいとの指摘 → 素直に「ものしり」表現に変更。
      trait: 'ものしりで かしこい',
      assistId: 'sakiyomi-ghost',
      assistDesc: 'えらんだ ピースを おく ばしょを おしえてくれる',
      voiceTag: 'partner_kitsune',
      image: PARTNER_IMAGES + 'partner_kitsune.webp',
      tier: 'free',
      locked: false,
      unlockCondition: null,
      ageHint: '5さい〜',
      difficulty: 'normal',
    },
    {
      id: 'kojika',
      name: 'コジカ',
      trait: 'やさしくて てれや',
      assistId: 'soft-magnet',
      assistDesc: 'ただしい ばしょに ちかいと ひかって おしえてくれる',
      voiceTag: 'partner_kojika',
      image: PARTNER_IMAGES + 'partner_kojika.webp',
      tier: 'free',
      locked: false,
      unlockCondition: null,
      ageHint: '3さい〜',
      difficulty: 'easy',
    },
    {
      id: 'risu',
      name: 'リス',
      trait: 'すばやくて げんき',
      assistId: 'time-challenge',
      assistDesc: 'じかんの なかで クリアに ちょうせんする',
      voiceTag: 'partner_risu',
      image: PARTNER_IMAGES + 'partner_risu.webp',
      tier: 'book',
      locked: false,
      unlockCondition: null,
      ageHint: '5さい〜',
      difficulty: 'tricky',
      challengeType: 'time',
    },
    {
      id: 'harinezumi',
      name: 'ハリネズミ',
      trait: 'こつこつ がんばりや',
      assistId: 'less-hints',
      assistDesc: 'ヒントが すくない まま クリアに ちょうせんする',
      voiceTag: 'partner_harinezumi',
      image: PARTNER_IMAGES + 'partner_harinezumi.webp',
      tier: 'book',
      locked: false,
      unlockCondition: null,
      ageHint: '5さい〜',
      difficulty: 'tricky',
      challengeType: 'less-hints',
    },
    {
      id: 'araiguma',
      name: 'アライグマ',
      trait: 'きれいずきな いろの たつじん',
      assistId: 'iro-tray',
      assistDesc: 'ボタンを おすと ピースを すこし はめてくれるよ',
      voiceTag: 'partner_araiguma',
      image: PARTNER_IMAGES + 'partner_araiguma.webp',
      tier: 'sub',
      locked: false,
      unlockCondition: null,
      ageHint: '4さい〜',
      difficulty: 'easy',
    },
    {
      id: 'usagi',
      name: 'ウサギ',
      trait: 'みみが よくて げんき',
      assistId: 'mimi-dowsing',
      assistDesc: 'ピースを おく ほうこうを みみで おしえてくれる',
      voiceTag: 'partner_usagi',
      image: PARTNER_IMAGES + 'partner_usagi.webp',
      tier: 'sub',
      locked: false,
      unlockCondition: null,
      ageHint: '3さい〜',
      difficulty: 'normal',
    },
    {
      id: 'fukurou',
      name: 'フクロウ',
      trait: 'もりの ものしり はかせ',
      assistId: 'naka-discovery',
      assistDesc: 'ピースを ながおしすると となりの ピースを おしえてくれる',
      voiceTag: 'partner_fukurou',
      image: PARTNER_IMAGES + 'partner_fukurou.webp',
      tier: 'sub',
      locked: true,
      unlockCondition: 'stage20_clear',
      ageHint: '5さい〜',
      difficulty: 'normal',
    },
    {
      id: 'karasu',
      name: 'カラス',
      trait: 'くるりと ひらめく',
      assistId: 'rotation-challenge',
      assistDesc: 'まわった ピースを もどして クリアに ちょうせんする',
      voiceTag: 'partner_karasu',
      image: PARTNER_IMAGES + 'partner_karasu.webp',
      tier: 'sub',
      locked: false,
      unlockCondition: null,
      ageHint: '6さい〜',
      difficulty: 'tricky',
      challengeType: 'rotation',
    },
  ];

  function getTier() {
    try {
      if (window.PonoTier && typeof window.PonoTier.getTier === 'function') {
        var t = window.PonoTier.getTier();
        if (t === 'free' || t === 'book' || t === 'sub') return t;
      }
    } catch (_) {}
    return 'free';
  }

  function tierAllows(requiredTier) {
    var req = TIER_RANK[requiredTier || 'free'] || TIER_RANK.free;
    var cur = TIER_RANK[getTier()] || TIER_RANK.free;
    return cur >= req;
  }

  function isUnlocked(partner) {
    if (!partner) return false;
    if (!tierAllows(partner.tier)) return false;
    if (partner.id === 'fukurou' && partner.locked) {
      if (getTier() === 'sub') return true;
      try {
        return !!(window.PonoBond
          && typeof window.PonoBond.isFukurouUnlocked === 'function'
          && window.PonoBond.isFukurouUnlocked());
      } catch (_) {
        return false;
      }
    }
    return !partner.locked;
  }

  function getUnlockLabel(partner) {
    if (!partner) return '🔒 まだ';
    if (!tierAllows(partner.tier)) {
      return partner.tier === 'book' ? '📖 えほん' : '⭐ サブスク';
    }
    if (partner.id === 'fukurou' && partner.locked && !isUnlocked(partner)) {
      return '🔒 さいごに';
    }
    return '🔒 まだ';
  }

  /** id 検索 (未知IDなら null) */
  function get(id) {
    for (var i = 0; i < PARTNERS.length; i++) {
      if (PARTNERS[i].id === id) return PARTNERS[i];
    }
    return null;
  }

  return {
    list: PARTNERS,
    get: get,
    getTier: getTier,
    isUnlocked: isUnlocked,
    getUnlockLabel: getUnlockLabel,
    defaultId: 'kitsune',
  };
})();
