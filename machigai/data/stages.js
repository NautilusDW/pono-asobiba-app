// data/stages.js — 最終ステージデータ（pipeline担当が生成 → labeling担当が目視検証・ラベル確定）
// 契約: docs/ARCHITECTURE.md §3。fetch不要で読み込める形式。
'use strict';

window.STAGE_DATA = {
  version: 1,
  stages: [
    {
      id: "park2",
      name: "こうえん",
      imgA: "assets/processed/park2_a.webp",
      imgB: "assets/processed/park2_b.webp",
      thumb: "assets/processed/park2_t.webp",
      differences: [
        { x: 0.7989, y: 0.4359, r: 0.0936, label: "ふうせん" },
        { x: 0.2061, y: 0.3650, r: 0.0484, label: "ことり" },
        { x: 0.3508, y: 0.8407, r: 0.0482, label: "ちょうちょ" }
      ]
    },
    {
      id: "ocean2",
      name: "うみのなか",
      imgA: "assets/processed/ocean2_a.webp",
      imgB: "assets/processed/ocean2_b.webp",
      thumb: "assets/processed/ocean2_t.webp",
      differences: [
        { x: 0.8099, y: 0.6951, r: 0.1349, label: "ひとで" },
        { x: 0.5482, y: 0.9047, r: 0.0638, label: "たからばこ" },
        { x: 0.8770, y: 0.1025, r: 0.0622, label: "さかな" }
      ]
    },
    {
      id: "farm2",
      name: "のうじょう",
      imgA: "assets/processed/farm2_a.webp",
      imgB: "assets/processed/farm2_b.webp",
      thumb: "assets/processed/farm2_t.webp",
      differences: [
        { x: 0.1645, y: 0.6493, r: 0.1063, label: "とらくたー" },
        { x: 0.8821, y: 0.6048, r: 0.0995, label: "ひまわり" },
        { x: 0.3404, y: 0.9067, r: 0.0448, label: "ひよこ" }
      ]
    },
    {
      id: "sweets",
      name: "おかしのくに",
      imgA: "assets/processed/sweets_a.webp",
      imgB: "assets/processed/sweets_b.webp",
      thumb: "assets/processed/sweets_t.webp",
      differences: [
        { x: 0.1787, y: 0.2708, r: 0.1279, label: "ぺろぺろきゃんでぃ" },
        { x: 0.8303, y: 0.5232, r: 0.0468, label: "さくらんぼ" },
        { x: 0.3668, y: 0.8802, r: 0.1015, label: "どーなつ" }
      ]
    },
    {
      id: "concert",
      name: "おんがくかい",
      imgA: "assets/processed/concert_a.webp",
      imgB: "assets/processed/concert_b.webp",
      thumb: "assets/processed/concert_t.webp",
      differences: [
        { x: 0.5523, y: 0.6560, r: 0.12, label: "たいこ" },
        { x: 0.2567, y: 0.1413, r: 0.0355, label: "おんぷ" },
        { x: 0.6381, y: 0.8907, r: 0.0510, label: "すず" }
      ]
    },
    {
      id: "market",
      name: "やおやさん",
      imgA: "assets/processed/market_a.webp",
      imgB: "assets/processed/market_b.webp",
      thumb: "assets/processed/market_t.webp",
      differences: [
        { x: 0.2467, y: 0.6871, r: 0.0400, label: "りんご" },
        { x: 0.5990, y: 0.6587, r: 0.0646, label: "ばなな" },
        { x: 0.7658, y: 0.6325, r: 0.0520, label: "ぱぷりか" },
        { x: 0.7203, y: 0.3663, r: 0.0491, label: "らんたん" }
      ]
    },
    {
      id: "station",
      name: "でんしゃのえき",
      imgA: "assets/processed/station_a.webp",
      imgB: "assets/processed/station_b.webp",
      thumb: "assets/processed/station_t.webp",
      differences: [
        { x: 0.6440, y: 0.4800, r: 0.2000, label: "でんしゃ" },
        { x: 0.1965, y: 0.8539, r: 0.0650, label: "はと" },
        { x: 0.2830, y: 0.7150, r: 0.0600, label: "かばん" },
        { x: 0.3370, y: 0.2540, r: 0.0450, label: "しんごう" }
      ]
    },
    {
      id: "construction",
      name: "こうじげんば",
      imgA: "assets/processed/construction_a.webp",
      imgB: "assets/processed/construction_b.webp",
      thumb: "assets/processed/construction_t.webp",
      differences: [
        { x: 0.342, y: 0.457, r: 0.13, label: "しょべるかー" },
        { x: 0.678, y: 0.7, r: 0.028, label: "こーん" },
        { x: 0.705, y: 0.755, r: 0.028, label: "すこっぷ" },
        { x: 0.782, y: 0.573, r: 0.045, label: "へるめっと" }
      ]
    },
    {
      id: "jungle",
      name: "ジャングル",
      imgA: "assets/processed/jungle_a.webp",
      imgB: "assets/processed/jungle_b.webp",
      thumb: "assets/processed/jungle_t.webp",
      differences: [
        { x: 0.171, y: 0.206, r: 0.074, label: "おうむ" },
        { x: 0.311, y: 0.499, r: 0.102, label: "さる" },
        { x: 0.873, y: 0.235, r: 0.082, label: "ばなな" },
        { x: 0.585, y: 0.888, r: 0.129, label: "おはな" }
      ]
    },
    {
      id: "bedroom",
      name: "よるのおへや",
      imgA: "assets/processed/bedroom_a.webp",
      imgB: "assets/processed/bedroom_b.webp",
      thumb: "assets/processed/bedroom_t.webp",
      differences: [
        { x: 0.237, y: 0.192, r: 0.044, label: "つき" },
        { x: 0.328, y: 0.202, r: 0.035, label: "ほし" },
        { x: 0.192, y: 0.66, r: 0.12, label: "ぬいぐるみ" },
        { x: 0.487, y: 0.552, r: 0.117, label: "もうふ" }
      ]
    },
    {
      id: "space",
      name: "うちゅう",
      imgA: "assets/processed/space_a.webp",
      imgB: "assets/processed/space_b.webp",
      thumb: "assets/processed/space_t.webp",
      differences: [
        { x: 0.257, y: 0.194, r: 0.13, label: "わくせい" },
        { x: 0.78, y: 0.161, r: 0.084, label: "つき" },
        { x: 0.478, y: 0.522, r: 0.06, label: "まど" },
        { x: 0.65, y: 0.7, r: 0.09, label: "ろけっと" },
        { x: 0.83, y: 0.79, r: 0.1, label: "ながれぼし" }
      ]
    },
    {
      id: "dino",
      name: "きょうりゅう",
      imgA: "assets/processed/dino_a.webp",
      imgB: "assets/processed/dino_b.webp",
      thumb: "assets/processed/dino_t.webp",
      differences: [
        { x: 0.2634, y: 0.0818, r: 0.1023, label: "かざん" },
        { x: 0.1192, y: 0.6592, r: 0.1038, label: "おはな" },
        { x: 0.7944, y: 0.7375, r: 0.0500, label: "たまご" },
        { x: 0.4367, y: 0.1454, r: 0.0646, label: "ちょうちょ" },
        { x: 0.8713, y: 0.2210, r: 0.0909, label: "やしのみ" }
      ]
    },
    {
      id: "festival",
      name: "おまつり",
      imgA: "assets/processed/festival_a.webp",
      imgB: "assets/processed/festival_b.webp",
      thumb: "assets/processed/festival_t.webp",
      differences: [
        { x: 0.67, y: 0.295, r: 0.06, label: "ちょうちん" },
        { x: 0.4463, y: 0.7973, r: 0.045, label: "きんぎょ" },
        { x: 0.2, y: 0.8, r: 0.12, label: "ゆかた" },
        { x: 0.67, y: 0.663, r: 0.082, label: "うちわ" },
        { x: 0.275, y: 0.195, r: 0.13, label: "はなび" }
      ]
    },
    {
      id: "snow",
      name: "ゆきのひ",
      imgA: "assets/processed/snow_a.webp",
      imgB: "assets/processed/snow_b.webp",
      thumb: "assets/processed/snow_t.webp",
      differences: [
        { x: 0.556, y: 0.55, r: 0.106, label: "まふらー" },
        { x: 0.258, y: 0.803, r: 0.092, label: "そり" },
        { x: 0.8, y: 0.801, r: 0.088, label: "ぺんぎん" },
        { x: 0.75, y: 0.27, r: 0.13, label: "つらら" },
        { x: 0.57, y: 0.72, r: 0.045, label: "ぼたん" }
      ]
    },
    {
      id: "castle",
      name: "まほうのおしろ",
      imgA: "assets/processed/castle_a.webp",
      imgB: "assets/processed/castle_b.webp",
      thumb: "assets/processed/castle_t.webp",
      differences: [
        { x: 0.327, y: 0.135, r: 0.04, label: "はた" },
        { x: 0.271, y: 0.682, r: 0.1, label: "どらごん" },
        { x: 0.652, y: 0.194, r: 0.13, label: "にじ" },
        { x: 0.315, y: 0.327, r: 0.04, label: "まど" },
        { x: 0.532, y: 0.796, r: 0.04, label: "おうかん" }
      ]
    }
  ]
};
