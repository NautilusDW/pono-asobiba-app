// data/stages.js — 最終ステージデータ（pipeline担当が生成 → labeling担当が目視検証・ラベル確定）
// 契約: docs/ARCHITECTURE.md §3。fetch不要で読み込める形式。
// difficulty は easy / medium / hard。
// hard は GPT Image 2 で局所編集したB画像を使い、形・向き・模様などの細かな差を含む。
'use strict';

window.STAGE_DATA = {
  version: 1,
  stages: [
    {
      id: "park2",
      name: "こうえん",
      difficulty: "easy",
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
      difficulty: "easy",
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
      difficulty: "easy",
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
      difficulty: "easy",
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
      difficulty: "easy",
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
      difficulty: "medium",
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
      difficulty: "medium",
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
      difficulty: "medium",
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
      difficulty: "hard",
      imgA: "assets/processed/jungle_a.webp",
      imgB: "assets/processed/jungle_b.webp",
      thumb: "assets/processed/jungle_t.webp",
      differences: [
        { x: 0.169, y: 0.218, r: 0.075, label: "おうむの はね", kind: "shape" },
        { x: 0.434, y: 0.326, r: 0.075, label: "さるの しっぽ", kind: "direction" },
        { x: 0.764, y: 0.267, r: 0.070, label: "きりんの みみ", kind: "direction" },
        { x: 0.229, y: 0.647, r: 0.110, label: "ぞうの みみ", kind: "shape" }
      ]
    },
    {
      id: "bedroom",
      name: "よるのおへや",
      difficulty: "hard",
      imgA: "assets/processed/bedroom_a.webp",
      imgB: "assets/processed/bedroom_b.webp",
      thumb: "assets/processed/bedroom_t.webp",
      differences: [
        { x: 0.222, y: 0.203, r: 0.080, label: "おつきさま", kind: "shape" },
        { x: 0.684, y: 0.341, r: 0.080, label: "うさぎの みみ", kind: "direction" },
        { x: 0.217, y: 0.684, r: 0.075, label: "ぞうの はな", kind: "direction" },
        { x: 0.719, y: 0.465, r: 0.080, label: "まくらの かど", kind: "shape" }
      ]
    },
    {
      id: "space",
      name: "うちゅう",
      difficulty: "hard",
      imgA: "assets/processed/space_a.webp",
      imgB: "assets/processed/space_b.webp",
      thumb: "assets/processed/space_t.webp",
      differences: [
        { x: 0.547, y: 0.185, r: 0.060, label: "ほしの かたち", kind: "shape" },
        { x: 0.823, y: 0.210, r: 0.070, label: "つきの さき", kind: "shape" },
        { x: 0.894, y: 0.340, r: 0.070, label: "うちゅうじんの しょっかく", kind: "direction" },
        { x: 0.478, y: 0.515, r: 0.070, label: "ろけっとの まど", kind: "pattern" },
        { x: 0.742, y: 0.752, r: 0.100, label: "ろけっとの ほのお", kind: "shape" }
      ]
    },
    {
      id: "dino",
      name: "きょうりゅう",
      difficulty: "hard",
      imgA: "assets/processed/dino_a.webp",
      imgB: "assets/processed/dino_b.webp",
      thumb: "assets/processed/dino_t.webp",
      differences: [
        { x: 0.294, y: 0.065, r: 0.110, label: "けむりの さき", kind: "shape" },
        { x: 0.199, y: 0.487, r: 0.090, label: "きょうりゅうの しっぽ", kind: "direction" },
        { x: 0.705, y: 0.388, r: 0.075, label: "きょうりゅうの くち", kind: "shape" },
        { x: 0.554, y: 0.651, r: 0.070, label: "きょうりゅうの つめ", kind: "shape" },
        { x: 0.748, y: 0.866, r: 0.085, label: "すの えだ", kind: "direction" }
      ]
    },
    {
      id: "festival",
      name: "おまつり",
      difficulty: "hard",
      imgA: "assets/processed/festival_a.webp",
      imgB: "assets/processed/festival_b.webp",
      thumb: "assets/processed/festival_t.webp",
      differences: [
        { x: 0.105, y: 0.085, r: 0.060, label: "ほしの かたち", kind: "shape" },
        { x: 0.667, y: 0.295, r: 0.070, label: "ちょうちんの しま", kind: "pattern" },
        { x: 0.763, y: 0.445, r: 0.065, label: "ねこの しま", kind: "shape" },
        { x: 0.478, y: 0.741, r: 0.065, label: "きんぎょの しっぽ", kind: "shape" },
        { x: 0.707, y: 0.741, r: 0.080, label: "うちわの ほね", kind: "pattern" }
      ]
    },
    {
      id: "snow",
      name: "ゆきのひ",
      difficulty: "hard",
      imgA: "assets/processed/snow_a.webp",
      imgB: "assets/processed/snow_b.webp",
      thumb: "assets/processed/snow_t.webp",
      differences: [
        { x: 0.490, y: 0.235, r: 0.100, label: "ぼうしの てっぺん", kind: "shape" },
        { x: 0.708, y: 0.456, r: 0.075, label: "えだの さき", kind: "direction" },
        { x: 0.571, y: 0.553, r: 0.080, label: "まふらーの あみめ", kind: "pattern" },
        { x: 0.160, y: 0.625, r: 0.080, label: "ぺんぎんの まふらー", kind: "direction" },
        { x: 0.407, y: 0.840, r: 0.080, label: "そりの さき", kind: "shape" }
      ]
    },
    {
      id: "castle",
      name: "まほうのおしろ",
      difficulty: "hard",
      imgA: "assets/processed/castle_a.webp",
      imgB: "assets/processed/castle_b.webp",
      thumb: "assets/processed/castle_t.webp",
      differences: [
        { x: 0.332, y: 0.133, r: 0.065, label: "はたの さき", kind: "shape" },
        { x: 0.763, y: 0.190, r: 0.060, label: "ほしの かたち", kind: "shape" },
        { x: 0.316, y: 0.328, r: 0.060, label: "おしろの まど", kind: "shape" },
        { x: 0.194, y: 0.681, r: 0.075, label: "どらごんの はね", kind: "shape" },
        { x: 0.708, y: 0.591, r: 0.060, label: "かんむりの まんなか", kind: "shape" }
      ]
    }
  ]
};
