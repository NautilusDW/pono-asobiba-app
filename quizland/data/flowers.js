// クイズランド お花畑ギミック — 花マスター + 季節ロジック
// index.html より <script src="./data/flowers.js"> で読み込み、window に公開

(function () {
  'use strict';

  var FLOWERS = [
    // 春 (spring, 3-5月)
    { id: 'sakura',      emoji: '🌸', name: 'さくら',        season: 'spring', bg: '#FFD6E0' },
    { id: 'tulip',       emoji: '🌷', name: 'チューリップ',  season: 'spring', bg: '#FFC1CC' },
    { id: 'tanpopo',     emoji: '🌼', name: 'たんぽぽ',      season: 'spring', bg: '#FFF3B0' },
    { id: 'nanohana',    emoji: '🌻', name: 'なのはな',      season: 'spring', bg: '#FFE88C' },
    { id: 'pansy',       emoji: '💠', name: 'パンジー',      season: 'spring', bg: '#D6C8FF' },

    // 夏 (summer, 6-8月)
    { id: 'himawari',    emoji: '🌻', name: 'ひまわり',      season: 'summer', bg: '#FFE082' },
    { id: 'asagao',      emoji: '🪻', name: 'あさがお',      season: 'summer', bg: '#B8C9FF' },
    { id: 'hibiscus',    emoji: '🌺', name: 'ハイビスカス',  season: 'summer', bg: '#FFB3C1' },
    { id: 'hasu',        emoji: '🪷', name: 'はす',          season: 'summer', bg: '#F8C8DC' },
    { id: 'lavender',    emoji: '💜', name: 'ラベンダー',    season: 'summer', bg: '#D1B3FF' },

    // 秋 (autumn, 9-11月)
    { id: 'cosmos',      emoji: '🌸', name: 'コスモス',      season: 'autumn', bg: '#FFC0D9' },
    { id: 'kiku',        emoji: '🏵️', name: 'きく',          season: 'autumn', bg: '#FFD9A6' },
    { id: 'higanbana',   emoji: '🔴', name: 'ひがんばな',    season: 'autumn', bg: '#FFB3B3' },
    { id: 'kinmokusei',  emoji: '🟡', name: 'きんもくせい',  season: 'autumn', bg: '#FFE08A' },
    { id: 'dahlia',      emoji: '💐', name: 'ダリア',        season: 'autumn', bg: '#FFCBA4' },

    // 冬 (winter, 12-2月)
    { id: 'tsubaki',     emoji: '🌹', name: 'つばき',        season: 'winter', bg: '#FFB8B8' },
    { id: 'ume',         emoji: '🌸', name: 'うめ',          season: 'winter', bg: '#FFDEE9' },
    { id: 'suisen',      emoji: '🌼', name: 'すいせん',      season: 'winter', bg: '#FFF2B8' },
    { id: 'shikuramen',  emoji: '🌷', name: 'シクラメン',    season: 'winter', bg: '#FFC5D9' },
    { id: 'yukiwarisou', emoji: '❄️', name: 'ゆきわりそう',  season: 'winter', bg: '#CDE7FF' }
  ];

  function getCurrentSeason() {
    var m = new Date().getMonth() + 1;
    if (m >= 3 && m <= 5)  return 'spring';
    if (m >= 6 && m <= 8)  return 'summer';
    if (m >= 9 && m <= 11) return 'autumn';
    return 'winter';
  }

  function pickFlower() {
    var season = getCurrentSeason();
    // 旬花は重み3、それ以外は重み1 → 旬花出現率 約3倍
    var pool = [];
    FLOWERS.forEach(function (f) {
      var w = (f.season === season) ? 3 : 1;
      for (var i = 0; i < w; i++) pool.push(f);
    });
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function findFlower(id) {
    for (var i = 0; i < FLOWERS.length; i++) {
      if (FLOWERS[i].id === id) return FLOWERS[i];
    }
    return null;
  }

  window.QUIZLAND_FLOWERS = FLOWERS;
  window.getCurrentSeason = getCurrentSeason;
  window.pickFlower = pickFlower;
  window.findFlower = findFlower;
})();
