// PonoPartners — 5パートナーの定義テーブル。
// 「もりのなかよし」MVP のデータ層。main.js より先に読み込むこと。
// Public API:
//   PonoPartners.list                - 配列 (定義順)
//   PonoPartners.get(id)             - 単一定義、未知IDなら null
//   PonoPartners.defaultId           - 既定パートナーID ('kitsune')
//
// 各エントリのスキーマは README およびプラン
// (misty-kindling-rainbow.md) の「パートナー仕様」を参照。
// 画像は当面オープニングのカット画像を流用する。
window.PonoPartners = (function () {
  'use strict';

  var OPENING = '../assets/images/puzzle/opening/';

  /** 配列順 = パートナー選択画面の並び順 */
  var PARTNERS = [
    {
      id: 'kitsune',
      name: 'キツネ',
      trait: 'ものしりで すこし おませ',
      assistId: 'sakiyomi-ghost',
      assistName: 'さきよみゴースト',
      voiceTag: 'partner_kitsune',
      image: OPENING + 'cut01.jpg',
      locked: false,
      unlockCondition: null,
      ageHint: '5さい〜',
    },
    {
      id: 'kojika',
      name: 'コジカ',
      trait: 'やさしくて てれや',
      assistId: 'soft-magnet',
      assistName: 'そうっとガイド',
      voiceTag: 'partner_kojika',
      image: OPENING + 'cut02.jpg',
      locked: false,
      unlockCondition: null,
      ageHint: '3さい〜',
    },
    {
      id: 'araiguma',
      name: 'アライグマ',
      trait: 'きれいずきな いろの たつじん',
      assistId: 'iro-tray',
      assistName: 'いろわけトレイ',
      voiceTag: 'partner_araiguma',
      image: OPENING + 'cut02.jpg',
      locked: false,
      unlockCondition: null,
      ageHint: '4さい〜',
    },
    {
      id: 'usagi',
      name: 'ウサギ',
      trait: 'みみが よくて げんき',
      assistId: 'mimi-dowsing',
      assistName: 'みみダウジング',
      voiceTag: 'partner_usagi',
      image: OPENING + 'cut03.jpg',
      locked: false,
      unlockCondition: null,
      ageHint: '3さい〜',
    },
    {
      id: 'fukurou',
      name: 'フクロウ',
      trait: 'もりの ものしり はかせ',
      assistId: 'monoshiri-xray',
      assistName: 'ものしりレントゲン',
      voiceTag: 'partner_fukurou',
      image: OPENING + 'cut03.jpg',
      locked: true,
      unlockCondition: 'stage20_clear',
      ageHint: '5さい〜',
    },
  ];

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
    defaultId: 'kitsune',
  };
})();
