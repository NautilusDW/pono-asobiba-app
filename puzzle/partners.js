// PonoPartners — 5パートナーの定義テーブル。
// 「もりのなかよし」MVP のデータ層。main.js より先に読み込むこと。
// Public API:
//   PonoPartners.list                - 配列 (定義順)
//   PonoPartners.get(id)             - 単一定義、未知IDなら null
//   PonoPartners.defaultId           - 既定パートナーID ('kitsune')
//
// 各エントリのスキーマは README およびプラン
// (misty-kindling-rainbow.md) の「パートナー仕様」を参照。
// 画像は当面オープニングのカット画像 (cut01-03.jpg) を流用し、
// imagePosition で各キャラの顔位置にクロップする。
// 配分: kitsune→cut01(左) / kojika→cut02(右) / araiguma→cut03(中央)
//      usagi→cut01(右端) / fukurou→cut03 (暫定・ロック中)
window.PonoPartners = (function () {
  'use strict';

  var OPENING = '../assets/images/puzzle/opening/';

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
      // cut01.jpg: 森の入り口シーン。キツネは画面左で全身が大きく描かれている。
      // 縦長 (4:5) クロップでも顔〜上半身が中央に収まるよう x=18% / y=58%。
      image: OPENING + 'cut01.jpg',
      imagePosition: '18% 58%',
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
      // cut02.jpg: コジカは画面右寄り (アライグマの右隣) に立っている。
      // 単独で見えるよう x=80% / y=50%。
      image: OPENING + 'cut02.jpg',
      imagePosition: '80% 50%',
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
      // cut03.jpg: アライグマは画面中央 (パズルに手を出している) で
      // 縞しっぽも見えるので識別しやすい。x=50% / y=50%。
      image: OPENING + 'cut03.jpg',
      imagePosition: '50% 50%',
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
      // cut01.jpg: ウサギは画面右端で1匹だけ後ろ姿で跳ねている。
      // 単独で見えるので識別しやすい。x=88% / y=65%。
      image: OPENING + 'cut01.jpg',
      imagePosition: '88% 65%',
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
      // フクロウは opening カットに未登場 (Stage20 解禁の後付けキャラ)。
      // ロック中はカード全体が暗転 + 🔒 オーバーレイで表示されるため、
      // 暫定で cut03 を流用。専用立ち絵は後続フェーズで差し替え予定。
      image: OPENING + 'cut03.jpg',
      imagePosition: '50% 40%',
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
