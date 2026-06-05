// PonoPartners — 5パートナーの定義テーブル。
// 「もりのなかよし」MVP のデータ層。main.js より先に読み込むこと。
// Public API:
//   PonoPartners.list                - 配列 (定義順)
//   PonoPartners.get(id)             - 単一定義、未知IDなら null
//   PonoPartners.defaultId           - 既定パートナーID ('kitsune')
//
// 各エントリのスキーマは README およびプラン
// (misty-kindling-rainbow.md) の「パートナー仕様」を参照。
// 画像はパートナー選択カード用の専用 512px 正方形サムネイルを使う。
window.PonoPartners = (function () {
  'use strict';

  var PARTNER_IMAGES = '../assets/images/puzzle/partners/';

  /** 配列順 = パートナー選択画面の並び順 */
  var PARTNERS = [
    {
      id: 'kitsune',
      name: 'キツネ',
      // ユーザーFB(2026-06-05): 「おませ」が「ちょっとずるい」と読まれ
      // 子どもに分かりにくいとの指摘 → 素直に「ものしり」表現に変更。
      trait: 'ものしりで かしこい',
      assistId: 'sakiyomi-ghost',
      assistName: 'さきよみゴースト',
      assistDesc: 'もってる ピースの しるしを ばしょに みせてくれる',
      voiceTag: 'partner_kitsune',
      image: PARTNER_IMAGES + 'partner_kitsune.webp',
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
      assistName: 'そうっとガイド',
      assistDesc: 'ピースを ただしい ばしょに ちかづけると ひかるよ',
      voiceTag: 'partner_kojika',
      image: PARTNER_IMAGES + 'partner_kojika.webp',
      locked: false,
      unlockCondition: null,
      ageHint: '3さい〜',
      difficulty: 'easy',
    },
    {
      id: 'araiguma',
      name: 'アライグマ',
      trait: 'きれいずきな いろの たつじん',
      assistId: 'iro-tray',
      assistName: 'ぴかっとおてつだい',
      assistDesc: 'ボタンを おすと ピースを すこし はめてくれるよ',
      voiceTag: 'partner_araiguma',
      image: PARTNER_IMAGES + 'partner_araiguma.webp',
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
      assistName: 'みみダウジング',
      assistDesc: 'みみが ピースの こっち！ を おしえてくれる',
      voiceTag: 'partner_usagi',
      image: PARTNER_IMAGES + 'partner_usagi.webp',
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
      assistName: 'なかまはっけん',
      assistDesc: 'ピースを ながおしすると、となりに なる ピースを おしえてくれる',
      voiceTag: 'partner_fukurou',
      image: PARTNER_IMAGES + 'partner_fukurou.webp',
      locked: true,
      unlockCondition: 'stage20_clear',
      ageHint: '5さい〜',
      difficulty: 'normal',
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
