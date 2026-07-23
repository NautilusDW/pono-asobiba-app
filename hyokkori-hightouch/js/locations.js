// ── hyokkori-hightouch/js/locations.js ──
// ひょっこりハイタッチ: 場所・動物・さんぽ進行の純粋データ。
// DOM / localStorage には触れず、ブラウザと Node の両方から利用できる。
'use strict';

var ASSET_BASE = '../assets/images/hyokkori-hightouch/';
var WALK_SAVE_KEY = 'pono_hyokkori_walk_v1';
var WALK_STATE_VERSION = 1;
var ROUTE_ID = 'mori-3-v1';

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
    background: ASSET_BASE + 'bg_world_komorebi_lowangle_20260724.png',
    hideouts: {
      far: ASSET_BASE + 'hideout_world_komorebi_far_20260724.png',
      near: ASSET_BASE + 'hideout_world_komorebi_near_20260724.png'
    },
    hideoutLayouts: {
      far: { foregroundTop: 57, windowBottom: 38, charWidth: 54 },
      near: { foregroundTop: 62, windowBottom: 31, charWidth: 58 }
    },
    slots: [
      { x: 29, y: 46, depth: 0.82, hideout: 'far', rotate: -1.4 },
      { x: 81, y: 39, depth: 0.88, hideout: 'far', rotate: 1.2 },
      { x: 24, y: 61, depth: 0.93, hideout: 'near', rotate: 0.8 },
      { x: 76, y: 60, depth: 0.95, hideout: 'near', rotate: -1 },
      { x: 18, y: 82, depth: 1.06, hideout: 'near', rotate: 1.2 },
      { x: 82, y: 80, depth: 1.08, hideout: 'near', rotate: -1.2 }
    ],
    partnerIds: ['kitsune', 'usagi', 'risu', 'harinezumi', 'kojika', 'araiguma'],
    bonusPartnerId: 'hikari_momonga'
  },
  {
    id: 'donguri_path',
    name: 'どんぐりの こみち',
    shortName: 'こみち',
    background: ASSET_BASE + 'bg_world_donguri_overlook_20260724.png',
    hideouts: {
      far: ASSET_BASE + 'hideout_world_donguri_far_20260724.png',
      near: ASSET_BASE + 'hideout_world_donguri_near_20260724.png'
    },
    hideoutLayouts: {
      far: { foregroundTop: 59.5, windowBottom: 31, charWidth: 46 },
      near: { foregroundTop: 62, windowBottom: 26, charWidth: 46 }
    },
    slots: [
      { x: 18, y: 46, depth: 0.82, hideout: 'far', rotate: -2 },
      { x: 82, y: 32, depth: 0.86, hideout: 'far', rotate: 1.5 },
      { x: 27, y: 69, depth: 0.95, hideout: 'near', rotate: 1.5 },
      { x: 72, y: 65, depth: 0.97, hideout: 'near', rotate: -1.5 },
      { x: 50, y: 84, depth: 1.06, hideout: 'near', rotate: 0.6 }
    ],
    partnerIds: ['risu', 'harinezumi', 'fukurou', 'karasu', 'kitsune', 'tanuki'],
    bonusPartnerId: 'hikari_momonga'
  },
  {
    id: 'mizube',
    name: 'せせらぎの みずべ',
    shortName: 'みずべ',
    background: ASSET_BASE + 'bg_world_mizube_waterline_20260724.png',
    hideouts: {
      far: ASSET_BASE + 'hideout_world_mizube_far_20260724.png',
      near: ASSET_BASE + 'hideout_world_mizube_near_20260724.png'
    },
    hideoutLayouts: {
      far: { foregroundTop: 55.5, windowBottom: 40, charWidth: 50 },
      near: { foregroundTop: 57.5, windowBottom: 38, charWidth: 55 }
    },
    slots: [
      { x: 18, y: 43, depth: 0.82, hideout: 'far', rotate: -1 },
      { x: 80, y: 40, depth: 0.86, hideout: 'far', rotate: 1.2 },
      { x: 20, y: 79, depth: 1.04, hideout: 'near', rotate: 1.5 },
      { x: 80, y: 78, depth: 1.02, hideout: 'near', rotate: -1.2 }
    ],
    // かえるを追加する第2弾までは、見分けやすいふくろうを仮の6種目にする。
    partnerIds: ['araiguma', 'kojika', 'usagi', 'karasu', 'kawauso', 'fukurou'],
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
 * localStorage由来の値を、現在の3地点ルートの安全な状態へ正規化する。
 * 毎回新しいオブジェクトを返し、未知の場所・余分なキー・不正値は引き継がない。
 */
function normalizeWalkState(raw) {
  var source = parseRawState(raw);
  if (!source || typeof source !== 'object' || Array.isArray(source)) source = {};

  var completedSet = {};
  if (Array.isArray(source.completedLocationIds)) {
    for (var i = 0; i < source.completedLocationIds.length; i++) {
      var completedId = source.completedLocationIds[i];
      if (LOCATION_BY_ID[completedId]) completedSet[completedId] = true;
    }
  }
  var completedLocationIds = ROUTE_IDS.filter(function (id) { return completedSet[id]; });

  var selectedLocationId = LOCATION_BY_ID[source.selectedLocationId]
    ? source.selectedLocationId
    : null;
  var mode = source.mode === 'select' && selectedLocationId ? 'select' : 'route';

  return {
    version: WALK_STATE_VERSION,
    routeId: ROUTE_ID,
    routeCompletedRuns: nonNegativeInteger(source.routeCompletedRuns),
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
