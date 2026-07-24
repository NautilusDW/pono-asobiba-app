// data/stages.js — 最終ステージデータ（pipeline担当が生成 → labeling担当が目視検証・ラベル確定）
// 契約: docs/ARCHITECTURE.md §3。fetch不要で読み込める形式。
// difficulty は easy / medium / hard。hard は variantBase:"A" と visual を使い、
// A画像を土台にした局所変形で、色・有無ではない細かな形／向き／配置差を作る。
// a / b は左右で位置が少し違う場合だけ使う任意座標。未指定時は従来の x/y/r が共通。
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
      variantBase: "A",
      imgA: "assets/processed/jungle_a.webp",
      imgB: "assets/processed/jungle_b.webp",
      thumb: "assets/processed/jungle_t.webp",
      differences: [
        {
          x: 0.171, y: 0.206, r: 0.074, label: "おうむ", kind: "direction",
          visual: { patchR: 0.13, rotate: -7, scaleX: 0.96 }
        },
        {
          x: 0.311, y: 0.499, r: 0.102, label: "さる", kind: "shape",
          visual: { patchR: 0.125, rotate: 5, scaleX: 0.93 }
        },
        {
          x: 0.873, y: 0.235, r: 0.082, label: "ばなな", kind: "direction",
          visual: { patchR: 0.105, rotate: -8, scaleX: 0.95 }
        },
        {
          x: 0.585, y: 0.888, r: 0.129, label: "おはな", kind: "shape",
          visual: { patchR: 0.135, rotate: 3, scaleX: 0.86 }
        }
      ]
    },
    {
      id: "bedroom",
      name: "よるのおへや",
      difficulty: "hard",
      variantBase: "A",
      imgA: "assets/processed/bedroom_a.webp",
      imgB: "assets/processed/bedroom_b.webp",
      thumb: "assets/processed/bedroom_t.webp",
      differences: [
        {
          x: 0.237, y: 0.192, r: 0.06, label: "つき", kind: "shape",
          visual: { patchR: 0.09, rotate: 7, scaleX: 0.83 }
        },
        {
          x: 0.334, y: 0.202, r: 0.055, label: "ほし", kind: "position",
          a: { x: 0.328, y: 0.202 }, b: { x: 0.340, y: 0.202 },
          visual: { patchR: 0.06, rotate: 12 }
        },
        {
          x: 0.192, y: 0.66, r: 0.12, label: "ぬいぐるみ", kind: "shape",
          visual: { patchR: 0.12, rotate: -4, scaleX: 0.90 }
        },
        {
          x: 0.487, y: 0.552, r: 0.117, label: "もうふ", kind: "pattern",
          visual: { patchR: 0.13, rotate: 2, scaleX: 0.92 }
        }
      ]
    },
    {
      id: "space",
      name: "うちゅう",
      difficulty: "hard",
      variantBase: "A",
      imgA: "assets/processed/space_a.webp",
      imgB: "assets/processed/space_b.webp",
      thumb: "assets/processed/space_t.webp",
      differences: [
        {
          x: 0.257, y: 0.194, r: 0.13, label: "わくせい", kind: "direction",
          visual: { patchR: 0.20, rotate: 8 }
        },
        {
          x: 0.78, y: 0.161, r: 0.084, label: "つき", kind: "shape",
          visual: { patchR: 0.105, rotate: -4, scaleX: 0.82 }
        },
        {
          x: 0.478, y: 0.522, r: 0.06, label: "まど", kind: "shape",
          visual: { patchR: 0.075, scaleX: 0.82 }
        },
        {
          x: 0.65, y: 0.7, r: 0.09, label: "ろけっと", kind: "shape",
          visual: { patchR: 0.125, rotate: -2, scaleY: 0.82 }
        },
        {
          x: 0.365, y: 0.832, r: 0.065, label: "ぶーつ", kind: "direction",
          visual: { patchR: 0.08, rotate: 10, scaleX: 0.94 }
        }
      ]
    },
    {
      id: "dino",
      name: "きょうりゅう",
      difficulty: "hard",
      variantBase: "A",
      imgA: "assets/processed/dino_a.webp",
      imgB: "assets/processed/dino_b.webp",
      thumb: "assets/processed/dino_t.webp",
      differences: [
        {
          x: 0.2634, y: 0.0818, r: 0.1023, label: "けむり", kind: "shape",
          visual: { patchR: 0.125, rotate: -8, scaleX: 0.90 }
        },
        {
          x: 0.1192, y: 0.6592, r: 0.1038, label: "おはな", kind: "shape",
          visual: { patchR: 0.11, rotate: 7, scaleX: 0.88 }
        },
        {
          x: 0.7944, y: 0.7375, r: 0.065, label: "たまご", kind: "shape",
          visual: { patchR: 0.08, scaleY: 0.82 }
        },
        {
          x: 0.625, y: 0.39, r: 0.065, label: "きょうりゅうの くち", kind: "shape",
          visual: { patchR: 0.075, rotate: 2, scaleX: 0.90 }
        },
        {
          x: 0.8713, y: 0.2210, r: 0.0909, label: "やしのみ", kind: "direction",
          visual: { patchR: 0.115, rotate: -8 }
        }
      ]
    },
    {
      id: "festival",
      name: "おまつり",
      difficulty: "hard",
      variantBase: "A",
      imgA: "assets/processed/festival_a.webp",
      imgB: "assets/processed/festival_b.webp",
      thumb: "assets/processed/festival_t.webp",
      differences: [
        {
          x: 0.67, y: 0.295, r: 0.065, label: "ちょうちん", kind: "shape",
          visual: { patchR: 0.075, rotate: 4, scaleY: 0.90 }
        },
        {
          x: 0.506, y: 0.755, r: 0.065, label: "きんぎょ", kind: "position",
          a: { x: 0.500, y: 0.755 }, b: { x: 0.512, y: 0.755 },
          visual: { patchR: 0.075, rotate: 8 }
        },
        {
          x: 0.178, y: 0.70, r: 0.075, label: "ゆかた", kind: "pattern",
          visual: { patchR: 0.08, rotate: -3, scaleX: 0.86 }
        },
        {
          x: 0.67, y: 0.663, r: 0.082, label: "うちわ", kind: "direction",
          visual: { patchR: 0.10, rotate: 9, scaleX: 0.95 }
        },
        {
          x: 0.295, y: 0.295, r: 0.075, label: "うさぎの みみ", kind: "shape",
          visual: { patchR: 0.085, rotate: -4, scaleX: 0.86 }
        }
      ]
    },
    {
      id: "snow",
      name: "ゆきのひ",
      difficulty: "hard",
      variantBase: "A",
      imgA: "assets/processed/snow_a.webp",
      imgB: "assets/processed/snow_b.webp",
      thumb: "assets/processed/snow_t.webp",
      differences: [
        {
          x: 0.556, y: 0.55, r: 0.106, label: "まふらー", kind: "shape",
          visual: { patchR: 0.135, rotate: 3, scaleX: 0.92 }
        },
        {
          x: 0.258, y: 0.803, r: 0.092, label: "そり", kind: "direction",
          visual: { patchR: 0.115, rotate: 4, scaleY: 0.94 }
        },
        {
          x: 0.273, y: 0.68, r: 0.085, label: "ぺんぎん", kind: "direction",
          visual: { patchR: 0.095, rotate: -5, scaleX: 0.93 }
        },
        {
          x: 0.75, y: 0.35, r: 0.09, label: "つらら", kind: "shape",
          visual: { patchR: 0.105, scaleY: 0.82 }
        },
        {
          x: 0.58, y: 0.38, r: 0.065, label: "にんじん", kind: "direction",
          visual: { patchR: 0.07, rotate: -9, scaleX: 0.94 }
        }
      ]
    },
    {
      id: "castle",
      name: "まほうのおしろ",
      difficulty: "hard",
      variantBase: "A",
      imgA: "assets/processed/castle_a.webp",
      imgB: "assets/processed/castle_b.webp",
      thumb: "assets/processed/castle_t.webp",
      differences: [
        {
          x: 0.327, y: 0.135, r: 0.065, label: "はた", kind: "shape",
          visual: { patchR: 0.07, rotate: -4, scaleX: 0.86 }
        },
        {
          x: 0.205, y: 0.67, r: 0.075, label: "どらごんの はね", kind: "shape",
          visual: { patchR: 0.085, rotate: 6, scaleY: 0.84 }
        },
        {
          x: 0.763, y: 0.19, r: 0.065, label: "ほし", kind: "shape",
          visual: { patchR: 0.07, rotate: 12, scaleX: 0.72 }
        },
        {
          x: 0.315, y: 0.327, r: 0.065, label: "まど", kind: "shape",
          visual: { patchR: 0.07, scaleX: 0.80 }
        },
        {
          x: 0.71, y: 0.595, r: 0.065, label: "おうかん", kind: "direction",
          visual: { patchR: 0.075, rotate: 10, scaleX: 0.94 }
        }
      ]
    }
  ]
};
