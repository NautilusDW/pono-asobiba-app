// ── hyokkori-hightouch/js/locations.js ──
// ひょっこりハイタッチ: 場所・動物・さんぽ進行の純粋データ。
// DOM / localStorage には触れず、ブラウザと Node の両方から利用できる。
'use strict';

var ASSET_BASE = '../assets/images/hyokkori-hightouch/';
var WALK_SAVE_KEY = 'pono_hyokkori_walk_v1';
var WALK_STATE_VERSION = 2;
var ROUTE_ID = 'mori-5-v1';
var LEGACY_ROUTE_ID = 'mori-3-v1';

function partner(id) {
  return {
    id: id,
    awake: ASSET_BASE + 'friend_' + id + '_awake.png',
    sleeping: ASSET_BASE + 'friend_' + id + '_sleeping.png'
  };
}

var PARTNER_CATALOG = {
  araiguma: partner('araiguma'),
  fukurou: partner('fukurou'),
  harinezumi: partner('harinezumi'),
  karasu: partner('karasu'),
  kitsune: partner('kitsune'),
  kojika: partner('kojika'),
  risu: partner('risu'),
  usagi: partner('usagi'),
  tanuki: partner('tanuki'),
  kawauso: partner('kawauso'),
  kaeru: partner('kaeru'),
  yamane: partner('yamane'),
  hikari_momonga: {
    id: 'hikari_momonga',
    awake: ASSET_BASE + 'friend_hikari_momonga_bonus_awake.png',
    bonus: true
  }
};

var LOCATIONS = [
  {
    id: 'komorebi_clearing',
    name: 'こもれびの ひろば',
    shortName: 'ひろば',
    startStory: 'ひかりの たねを\nつきの はなへ とどけよう',
    resultStory: 'たねが こみちへ すすんだ！',
    background: ASSET_BASE + 'bg_world_komorebi_lowangle_20260724.png',
    hideouts: {
      far: ASSET_BASE + 'hideout_world_komorebi_far_v2_20260724.png',
      near: ASSET_BASE + 'hideout_world_komorebi_near_v2_20260724.png'
    },
    hideoutLayouts: {
      far: {
        groundAnchorY: 78.2,
        foregroundTop: 67,
        windowBottom: 30,
        charWidth: 52,
        charLiftCqh: 7.5
      },
      near: {
        groundAnchorY: 75.3,
        foregroundTop: 64,
        windowBottom: 28,
        charWidth: 58,
        charLiftCqh: 8
      }
    },
    slots: [
      { x: 27, groundY: 52, depth: 0.82, hideout: 'far', rotate: 0 },
      { x: 78, groundY: 49, depth: 0.88, hideout: 'far', rotate: 0 },
      { x: 24, groundY: 70.5, depth: 0.93, hideout: 'near', rotate: 0 },
      { x: 76, groundY: 70, depth: 0.95, hideout: 'near', rotate: 0 },
      { x: 18, groundY: 91.5, depth: 1.06, hideout: 'near', rotate: 0 },
      { x: 82, groundY: 91.5, depth: 1.08, hideout: 'near', rotate: 0 }
    ],
    partnerIds: ['kitsune', 'usagi', 'risu', 'harinezumi', 'kojika', 'araiguma'],
    bonusPartnerId: 'hikari_momonga'
  },
  {
    id: 'donguri_path',
    name: 'どんぐりの こみち',
    shortName: 'こみち',
    startStory: 'りすたちに みちを\nおしえて もらおう',
    resultStory: 'みずべまで きたよ！',
    background: ASSET_BASE + 'bg_world_donguri_overlook_20260724.png',
    hideouts: {
      far: ASSET_BASE + 'hideout_world_donguri_far_v2_20260724.png',
      near: ASSET_BASE + 'hideout_world_donguri_near_v2_20260724.png'
    },
    hideoutLayouts: {
      far: {
        groundAnchorY: 68.2,
        foregroundTop: 60,
        windowBottom: 30,
        charWidth: 48,
        charLiftCqh: 7.5
      },
      near: {
        groundAnchorY: 81,
        foregroundTop: 64,
        windowBottom: 28,
        charWidth: 52,
        charLiftCqh: 8.5
      }
    },
    slots: [
      { x: 18, groundY: 52, depth: 0.82, hideout: 'far', rotate: 0 },
      { x: 82, groundY: 38, depth: 0.86, hideout: 'far', rotate: 0 },
      { x: 27, groundY: 81, depth: 0.95, hideout: 'near', rotate: 0 },
      { x: 72, groundY: 77, depth: 0.97, hideout: 'near', rotate: 0 },
      { x: 50, groundY: 94, depth: 1.06, hideout: 'near', rotate: 0 }
    ],
    partnerIds: ['risu', 'harinezumi', 'fukurou', 'karasu', 'kitsune', 'tanuki'],
    bonusPartnerId: 'hikari_momonga'
  },
  {
    id: 'mizube',
    name: 'せせらぎの みずべ',
    shortName: 'みずべ',
    startStory: 'かわうそと たねを\nむこうぎしへ とどけよう',
    resultStory: 'ゆうやけの おかが みえた！',
    background: ASSET_BASE + 'bg_world_mizube_waterline_v2_20260724.png',
    hideouts: {
      far: ASSET_BASE + 'hideout_world_mizube_far_v2_20260724.png',
      near: ASSET_BASE + 'hideout_world_mizube_near_v2_20260724.png'
    },
    hideoutLayouts: {
      far: {
        groundAnchorY: 69.8,
        foregroundTop: 64,
        windowBottom: 30,
        charWidth: 50,
        charLiftCqh: 7
      },
      near: {
        groundAnchorY: 66.8,
        foregroundTop: 56,
        windowBottom: 28,
        charWidth: 55,
        charLiftCqh: 8
      }
    },
    slots: [
      { x: 13, groundY: 47, depth: 0.82, hideout: 'far', rotate: 0 },
      { x: 80, groundY: 45, depth: 0.86, hideout: 'far', rotate: 0 },
      { x: 20, groundY: 88, depth: 1.04, hideout: 'near', rotate: 0 },
      { x: 80, groundY: 87, depth: 1.02, hideout: 'near', rotate: 0 }
    ],
    partnerIds: ['araiguma', 'kojika', 'usagi', 'karasu', 'kawauso', 'kaeru'],
    bonusPartnerId: 'hikari_momonga'
  },
  {
    id: 'mushroom_hill',
    name: 'きのこの おか',
    shortName: 'おか',
    startStory: 'きのこの あかりを\nたよりに のぼろう',
    resultStory: 'つきあかりまで あと いっぽ！',
    background: ASSET_BASE + 'bg_world_mushroom_hill_sunset_20260724.png',
    hideouts: {
      far: ASSET_BASE + 'hideout_world_mushroom_far_20260724.png',
      near: ASSET_BASE + 'hideout_world_mushroom_near_20260724.png'
    },
    hideoutLayouts: {
      far: {
        groundAnchorY: 67.8,
        foregroundTop: 60,
        windowBottom: 30,
        charWidth: 50,
        charLiftCqh: 7.5
      },
      near: {
        groundAnchorY: 76.3,
        foregroundTop: 64,
        windowBottom: 28,
        charWidth: 55,
        charLiftCqh: 8
      }
    },
    slots: [
      { x: 30, groundY: 55, depth: 0.82, hideout: 'far', rotate: 0 },
      { x: 71, groundY: 40, depth: 0.86, hideout: 'far', rotate: 0 },
      { x: 18, groundY: 78, depth: 0.98, hideout: 'near', rotate: 0 },
      { x: 50, groundY: 84, depth: 1.07, hideout: 'near', rotate: 0 },
      { x: 82, groundY: 77, depth: 1, hideout: 'near', rotate: 0 }
    ],
    partnerIds: ['harinezumi', 'fukurou', 'kitsune', 'usagi', 'tanuki', 'yamane'],
    bonusPartnerId: 'hikari_momonga'
  },
  {
    id: 'moonlight_forest',
    name: 'つきあかりの もり',
    shortName: 'つきあかり',
    startStory: 'つきあかりへ たねを\nとどけよう',
    resultStory: 'つきの はなが さいた！',
    afterStory: 'あたらしい たねで また さんぽ！',
    background: ASSET_BASE + 'bg_world_moonlight_forest_clearing_20260724.png',
    hideouts: {
      far: ASSET_BASE + 'hideout_world_moonlight_far_20260724.png',
      near: ASSET_BASE + 'hideout_world_moonlight_near_20260724.png'
    },
    hideoutLayouts: {
      far: {
        groundAnchorY: 65.8,
        foregroundTop: 60,
        windowBottom: 30,
        charWidth: 50,
        charLiftCqh: 7.5
      },
      near: {
        groundAnchorY: 67.9,
        foregroundTop: 61,
        windowBottom: 28,
        charWidth: 55,
        charLiftCqh: 8
      }
    },
    slots: [
      { x: 27, groundY: 39, depth: 0.84, hideout: 'far', rotate: 0 },
      { x: 73, groundY: 39, depth: 0.86, hideout: 'far', rotate: 0 },
      { x: 21, groundY: 79, depth: 1.04, hideout: 'near', rotate: 0 },
      { x: 79, groundY: 79, depth: 1.04, hideout: 'near', rotate: 0 }
    ],
    partnerIds: ['fukurou', 'kitsune', 'karasu', 'usagi', 'tanuki', 'yamane'],
    bonusPartnerId: 'hikari_momonga'
  }
];

var LOCATION_BY_ID = Object.create(null);
for (var locationIndex = 0; locationIndex < LOCATIONS.length; locationIndex++) {
  LOCATION_BY_ID[LOCATIONS[locationIndex].id] = LOCATIONS[locationIndex];
}

var ROUTE_IDS = LOCATIONS.map(function (location) { return location.id; });

function nonNegativeInteger(value) {
  var number = Number(value);
  if (!isFinite(number) || number < 0) return 0;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(number));
}

function normalizedRunId(value) {
  if (typeof value !== 'string') return null;
  var trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 160);
}

function parseRawState(raw) {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

function normalizeLocationRecords(rawRecords) {
  var records = {};
  if (!rawRecords || typeof rawRecords !== 'object' || Array.isArray(rawRecords)) return records;

  for (var i = 0; i < ROUTE_IDS.length; i++) {
    var id = ROUTE_IDS[i];
    var rawRecord = rawRecords[id];
    if (!rawRecord || typeof rawRecord !== 'object' || Array.isArray(rawRecord)) continue;
    records[id] = {
      plays: nonNegativeInteger(rawRecord.plays),
      bestScore: nonNegativeInteger(rawRecord.bestScore),
      bestCombo: nonNegativeInteger(rawRecord.bestCombo)
    };
  }
  return records;
}

/**
 * localStorage由来の値を、現在の5地点ルートの安全な状態へ正規化する。
 * 毎回新しいオブジェクトを返し、未知の場所・余分なキー・不正値は引き継がない。
 */
function normalizeWalkState(raw) {
  var source = parseRawState(raw);
  if (!source || typeof source !== 'object' || Array.isArray(source)) source = {};
  var sourceRuns = nonNegativeInteger(source.routeCompletedRuns);
  var completedLegacyRoute = source.routeId === LEGACY_ROUTE_ID && sourceRuns >= 3;
  var routeCompletedRuns = completedLegacyRoute ? 3 : sourceRuns;

  var completedSet = {};
  if (Array.isArray(source.completedLocationIds)) {
    for (var i = 0; i < source.completedLocationIds.length; i++) {
      var completedId = source.completedLocationIds[i];
      if (LOCATION_BY_ID[completedId]) completedSet[completedId] = true;
    }
  }
  if (completedLegacyRoute) {
    completedSet.komorebi_clearing = true;
    completedSet.donguri_path = true;
    completedSet.mizube = true;
  }
  var completedLocationIds = ROUTE_IDS.filter(function (id) { return completedSet[id]; });

  var selectedLocationId = !completedLegacyRoute && LOCATION_BY_ID[source.selectedLocationId]
    ? source.selectedLocationId
    : null;
  var mode = source.mode === 'select' && selectedLocationId ? 'select' : 'route';

  return {
    version: WALK_STATE_VERSION,
    routeId: ROUTE_ID,
    routeCompletedRuns: routeCompletedRuns,
    completedLocationIds: completedLocationIds,
    mode: mode,
    selectedLocationId: selectedLocationId,
    lastCompletedRunId: normalizedRunId(source.lastCompletedRunId),
    locationRecords: normalizeLocationRecords(source.locationRecords)
  };
}

/**
 * 次のrunで遊ぶ場所を返す。一本道では完走回数だけから現在地を導出する。
 */
function locationForRun(state) {
  var normalized = normalizeWalkState(state);
  if (normalized.mode === 'select' && normalized.selectedLocationId) {
    return LOCATION_BY_ID[normalized.selectedLocationId];
  }
  return LOCATION_BY_ID[ROUTE_IDS[normalized.routeCompletedRuns % ROUTE_IDS.length]];
}

/**
 * 30秒完走を1回だけ反映する。
 * 同じrunIdの再呼び出しは無変更で返し、結果画面の二重発火で2歩進ませない。
 */
function advanceWalkState(state, completion) {
  var next = normalizeWalkState(state);
  var result = completion && typeof completion === 'object' ? completion : {};
  var runId = normalizedRunId(result.runId);
  var locationId = typeof result.locationId === 'string' ? result.locationId : '';

  if (!runId || !LOCATION_BY_ID[locationId] || next.lastCompletedRunId === runId) return next;

  var runMode = result.mode === 'select' || result.mode === 'route'
    ? result.mode
    : next.mode;
  var existingRecord = next.locationRecords[locationId] || {
    plays: 0,
    bestScore: 0,
    bestCombo: 0
  };
  next.locationRecords[locationId] = {
    plays: Math.min(Number.MAX_SAFE_INTEGER, existingRecord.plays + 1),
    bestScore: Math.max(existingRecord.bestScore, nonNegativeInteger(result.score)),
    bestCombo: Math.max(existingRecord.bestCombo, nonNegativeInteger(result.bestCombo))
  };

  if (next.completedLocationIds.indexOf(locationId) === -1) {
    next.completedLocationIds.push(locationId);
    next.completedLocationIds = ROUTE_IDS.filter(function (id) {
      return next.completedLocationIds.indexOf(id) !== -1;
    });
  }

  if (runMode === 'route') {
    var expectedLocationId = ROUTE_IDS[next.routeCompletedRuns % ROUTE_IDS.length];
    if (locationId === expectedLocationId) {
      next.routeCompletedRuns = Math.min(Number.MAX_SAFE_INTEGER, next.routeCompletedRuns + 1);
    }
  }

  next.lastCompletedRunId = runId;
  return next;
}

var PUBLIC_API = {
  PARTNER_CATALOG: PARTNER_CATALOG,
  LOCATIONS: LOCATIONS,
  LOCATION_BY_ID: LOCATION_BY_ID,
  ROUTE_IDS: ROUTE_IDS,
  WALK_SAVE_KEY: WALK_SAVE_KEY,
  normalizeWalkState: normalizeWalkState,
  locationForRun: locationForRun,
  advanceWalkState: advanceWalkState
};

if (typeof window !== 'undefined') {
  window.HyokkoriLocations = PUBLIC_API;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PUBLIC_API;
}
