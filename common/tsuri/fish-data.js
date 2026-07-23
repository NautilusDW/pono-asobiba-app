// ── common/tsuri/fish-data.js ──
// ポノのつりゲーム 魚マスターデータ (DOM 非依存、node からも require 可能)。
// Phase 0 は川5種のみ (企画書 docs/TSURI_FISHING_GAME_PLAN_2026-07-23.md §3.2 の
// 実データをそのまま使用。 数値は変更していない)。 海種・うなぎ・わかさぎ・
// 装備テーブルは Phase 2 以降で別担当が追加する。
'use strict';

var RIVER_SPECIES = [
  {
    id: 'fish_ayu', name: 'あゆ', rarity: 'normal', size: 's', zones: ['river'], edible: true,
    inventoryKey: 'fish_ayu', weight: 22, sizeRangeCm: [12, 22], movePattern: 'static',
    challengeProfile: { windowMul: 1.0, tapsBase: 8, runs: 0 }
  },
  {
    id: 'fish_nijimasu', name: 'にじます', rarity: 'normal', size: 'm', zones: ['river'], edible: true,
    inventoryKey: 'fish_nijimasu', weight: 20, sizeRangeCm: [20, 35], movePattern: 'static',
    challengeProfile: { windowMul: 1.0, tapsBase: 10, runs: 0 }
  },
  {
    id: 'zarigani', name: 'ざりがに', rarity: 'normal', size: 's', zones: ['river'], edible: false,
    inventoryKey: null, weight: 5, sizeRangeCm: [8, 12], movePattern: 'static',
    challengeProfile: { windowMul: 1.2, tapsBase: 6, runs: 0 }
  },
  {
    id: 'fish_salmon', name: 'さけ', rarity: 'rare', size: 'l', zones: ['river', 'sea'], edible: true,
    inventoryKey: 'fish_salmon', weight: 8, sizeRangeCm: [50, 75], movePattern: 'static',
    challengeProfile: { windowMul: 0.9, tapsBase: 12, runs: 0 }
  },
  {
    id: 'treasure_boot', name: 'ながぐつ', rarity: 'normal', size: 's', zones: ['river'], edible: false,
    inventoryKey: null, weight: 4, movePattern: 'static',
    challengeProfile: { windowMul: 1.3, tapsBase: 4, runs: 0 }
  }
];

var RIVER_SPECIES_BY_ID = {};
for (var _fi = 0; _fi < RIVER_SPECIES.length; _fi++) {
  RIVER_SPECIES_BY_ID[RIVER_SPECIES[_fi].id] = RIVER_SPECIES[_fi];
}

/** id → species エントリ (存在しない id は null)。 */
function getSpeciesById(id) {
  return RIVER_SPECIES_BY_ID.hasOwnProperty(id) ? RIVER_SPECIES_BY_ID[id] : null;
}

var PUBLIC_API = {
  RIVER_SPECIES: RIVER_SPECIES,
  RIVER_SPECIES_BY_ID: RIVER_SPECIES_BY_ID,
  getSpeciesById: getSpeciesById
};

if (typeof window !== 'undefined') {
  window.PonoFishData = PUBLIC_API;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PUBLIC_API;
}
