'use strict';

// The meal schedule is defined in local wall-clock time. Pin the regression
// process so UTC CI and a developer machine exercise the same calendar edges.
process.env.TZ = 'Asia/Tokyo';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const pages = {
  care: fs.readFileSync(path.join(root, 'writing-mori/care.html'), 'utf8'),
  writing: fs.readFileSync(path.join(root, 'writing-mori/index.html'), 'utf8'),
  play: fs.readFileSync(path.join(root, 'writing-mori/play.html'), 'utf8')
};

const SLOT_IDS = ['morning', 'lunch', 'afternoon', 'dinner'];
const SOLID_FOOD_SLOTS = [
  { id: 'morning', foodId: 'moji_gohan' },
  { id: 'lunch', foodId: 'moji_gohan' },
  { id: 'afternoon', foodId: 'moji_cookie' },
  { id: 'dinner', foodId: 'moji_gohan' }
];
const CARE_STATE_KEY = 'mojikkoFarmCareStateV1';
const PENDING_REWARD_KEY = 'mojikkoFarmPendingWritingReward';
const FOOD_SYSTEM_VERSION = 2;

function compileInlineScripts(html, label) {
  let count = 0;
  for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc=/.test(match[1])) continue;
    count += 1;
    new vm.Script(match[2], { filename: `${label}-inline-${count}.js` });
  }
  assert.equal(count, 2, `unexpected ${label} inline script count`);
}

function between(html, start, end) {
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `missing source range: ${start} -> ${end}`);
  return html.slice(startIndex, endIndex);
}

function plain(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function localTime(day, hour, minute = 0, second = 0, millisecond = 0) {
  return new Date(2026, 6, day, hour, minute, second, millisecond).getTime();
}

Object.entries(pages).forEach(([label, html]) => compileInlineScripts(html, `mojikko-${label}`));

// ─── The V1 state is copied by care, writing and toy play. Keep it byte-level
// compatible: the same inventory, version, slot ids and token-shaped claims.
Object.entries(pages).forEach(([label, html]) => {
  assert.match(html, /const CARE_STATE_KEY = 'mojikkoFarmCareStateV1';/, `${label}: care key drifted`);
  assert.match(html, /const FOOD_SYSTEM_VERSION = 2;/, `${label}: food version drifted`);
  assert.match(html, /moji_milk:\s*\{[^}]*id: 'moji_milk'/, `${label}: milk missing from V1 inventory`);
  assert.match(html, /moji_gohan:\s*\{[^}]*id: 'moji_gohan'/, `${label}: meal missing from V1 inventory`);
  assert.match(html, /moji_cookie:\s*\{[^}]*id: 'moji_cookie'/, `${label}: cookie missing from V1 inventory`);
  assert.match(html, /feedingDay:/, `${label}: daily claims missing from V1 state`);
  assert.doesNotMatch(
    between(html, 'const FOOD_SYSTEM_VERSION = 2;', label === 'care' ? 'const defaultState' : 'function cloneDefault'),
    /['"]snack['"]|\bsnack:/,
    `${label}: the canonical afternoon slot id must not drift back to snack`
  );
});

assert.match(
  pages.care,
  /const MEAL_SLOT_ORDER = \['morning', 'lunch', 'afternoon', 'dinner'\];/,
  'care must use the shared four-slot order'
);
assert.match(pages.care, /afternoon:\s*\{\s*id: 'afternoon',\s*label: 'ごご',\s*start: 15,\s*end: 18\s*\}/);
assert.match(
  pages.writing,
  /\{ id: 'morning', foodId: 'moji_gohan' \},\s*\{ id: 'lunch', foodId: 'moji_gohan' \},\s*\{ id: 'afternoon', foodId: 'moji_cookie' \},\s*\{ id: 'dinner', foodId: 'moji_gohan' \}/,
  'writing: the next-needed 3:1 meal/cookie schedule drifted'
);

// ─── Pure care schedule helpers: exact boundaries, local day rollover,
// stage-dependent food, and no penalty for an unclaimed slot.
const careScheduleContext = {
  Date,
  Math,
  Number,
  String,
  JSON,
  Object,
  MEAL_SLOT_ORDER: SLOT_IDS,
  MEAL_SLOTS: {
    morning: { id: 'morning', label: 'あさ', start: 6, end: 11 },
    lunch: { id: 'lunch', label: 'ひる', start: 11, end: 15 },
    afternoon: { id: 'afternoon', label: 'ごご', start: 15, end: 18 },
    dinner: { id: 'dinner', label: 'ばん', start: 18, end: 21 }
  },
  careFoods: {
    moji_milk: { id: 'moji_milk', name: 'もじミルク' },
    moji_gohan: { id: 'moji_gohan', name: 'もじごはん' },
    moji_cookie: { id: 'moji_cookie', name: 'もじクッキー' }
  },
  state: null
};
vm.createContext(careScheduleContext);
vm.runInContext(
  between(pages.care, 'function getLocalDateKey(', 'function sanitizeMilmaruName('),
  careScheduleContext,
  { filename: 'mojikko-meal-day-state.js' }
);
vm.runInContext(
  between(pages.care, 'function getMealPeriod(', 'function markCareInteraction('),
  careScheduleContext,
  { filename: 'mojikko-meal-period-food.js' }
);

const boundaryCases = [
  [localTime(11, 5, 59, 59, 999), 'sleep', null],
  [localTime(11, 6, 0), 'meal', 'morning'],
  [localTime(11, 10, 59, 59, 999), 'meal', 'morning'],
  [localTime(11, 11, 0), 'meal', 'lunch'],
  [localTime(11, 14, 59, 59, 999), 'meal', 'lunch'],
  [localTime(11, 15, 0), 'meal', 'afternoon'],
  [localTime(11, 17, 59, 59, 999), 'meal', 'afternoon'],
  [localTime(11, 18, 0), 'meal', 'dinner'],
  [localTime(11, 20, 59, 59, 999), 'meal', 'dinner'],
  [localTime(11, 21, 0), 'sleep', null]
];
for (const [timestamp, type, slotId] of boundaryCases) {
  assert.deepEqual(
    plain(careScheduleContext.getMealPeriod(timestamp)),
    { type, slotId },
    `wrong meal period at ${new Date(timestamp).toString()}`
  );
}
assert.equal(careScheduleContext.getLocalDateKey(localTime(11, 23, 59, 59)), '2026-07-11');
assert.equal(careScheduleContext.getLocalDateKey(localTime(12, 0, 0, 0)), '2026-07-12');

const priorLastSeenAt = localTime(10, 9, 30);
const rolloverState = {
  hatched: true,
  sukusuku: 42,
  nakayoshi: 17,
  gokigen: 63,
  stars: 40,
  lastCareAt: priorLastSeenAt,
  feedingDay: {
    localDateKey: '2026-07-10',
    claimed: { morning: true, lunch: { token: 'old-lunch' } },
    lastSeenAt: priorLastSeenAt
  },
  inventory: {
    moji_milk: { count: 2 },
    moji_gohan: { count: 5 },
    moji_cookie: { count: 3 }
  }
};
const nonScheduleBefore = plain({
  nakayoshi: rolloverState.nakayoshi,
  gokigen: rolloverState.gokigen,
  stars: rolloverState.stars,
  inventory: rolloverState.inventory
});
assert.equal(careScheduleContext.ensureFeedingDayState(rolloverState, localTime(11, 6)), true);
assert.equal(rolloverState.feedingDay.localDateKey, '2026-07-11');
assert.deepEqual(plain(rolloverState.feedingDay.claimed), {}, 'missed slots must not carry into a new day');
assert.equal(rolloverState.feedingDay.lastSeenAt, priorLastSeenAt, 'day rollover must preserve lastSeenAt');
assert.deepEqual(
  plain({
    nakayoshi: rolloverState.nakayoshi,
    gokigen: rolloverState.gokigen,
    stars: rolloverState.stars,
    inventory: rolloverState.inventory
  }),
  nonScheduleBefore,
  'a missed meal must never reduce mood, friendship, stars or inventory'
);

const sameDayClaims = {
  lastCareAt: priorLastSeenAt,
  feedingDay: {
    localDateKey: '2026-07-11',
    claimed: {
      morning: true,
      lunch: { token: 'claim-lunch', at: localTime(11, 11, 59, 59) },
      afternoon: 'yes',
      dinner: { claimedAt: 5678 },
      unknown: true
    },
    lastSeenAt: priorLastSeenAt
  }
};
assert.equal(careScheduleContext.ensureFeedingDayState(sameDayClaims, localTime(11, 12)), false);
assert.equal(sameDayClaims.feedingDay.claimed.morning, true);
assert.deepEqual(plain(sameDayClaims.feedingDay.claimed.lunch), {
  token: 'claim-lunch',
  at: localTime(11, 11, 59, 59)
});
assert.equal(Object.hasOwn(sameDayClaims.feedingDay.claimed, 'afternoon'), false);
assert.equal(Object.hasOwn(sameDayClaims.feedingDay.claimed, 'dinner'), false);
assert.equal(Object.hasOwn(sameDayClaims.feedingDay.claimed, 'unknown'), false);
assert.equal(sameDayClaims.feedingDay.lastSeenAt, priorLastSeenAt);

const staleLockState = {
  lastCareAt: priorLastSeenAt,
  feedingDay: {
    localDateKey: '2026-07-11',
    claimed: { afternoon: { token: 'abandoned-tab', at: localTime(11, 15) } },
    lastSeenAt: priorLastSeenAt
  }
};
careScheduleContext.ensureFeedingDayState(staleLockState, localTime(11, 15, 0, 16));
assert.equal(
  Object.hasOwn(staleLockState.feedingDay.claimed, 'afternoon'),
  false,
  'an abandoned provisional claim must recover after its lock timeout'
);

for (const sukusuku of [0, 10, 25, 37.999]) {
  const babyState = { hatched: true, sukusuku };
  for (const slotId of SLOT_IDS) {
    assert.equal(
      careScheduleContext.getFoodForMeal(slotId, babyState)?.id,
      'moji_milk',
      `stage ${sukusuku} ${slotId} must stay on milk`
    );
  }
}
assert.equal(
  careScheduleContext.getFoodForMeal('morning', { hatched: false, sukusuku: 0 }),
  null,
  'an egg must not have a food offer'
);
for (const slot of SOLID_FOOD_SLOTS) {
  assert.equal(
    careScheduleContext.getFoodForMeal(slot.id, { hatched: true, sukusuku: 38 })?.id,
    slot.foodId,
    `solid-food boundary chose the wrong food for ${slot.id}`
  );
}
assert.equal(
  careScheduleContext.getMealFoodLabel(careScheduleContext.careFoods.moji_milk, 'afternoon'),
  'ごごの ミルク',
  'the baby afternoon slot must be milk time, not a snack'
);
assert.doesNotMatch(
  careScheduleContext.getMealFoodLabel(careScheduleContext.careFoods.moji_milk, 'afternoon'),
  /おやつ|クッキー/
);

// ─── All three pages must preserve true and token-object claims and must not
// overwrite lastSeenAt while merely normalizing or changing the local day.
function makeNormalizeContext(html, label) {
  const context = {
    Date,
    Math,
    Number,
    String,
    JSON,
    Object,
    CARE_STATE_KEY,
    DAILY_FEEDING_SLOTS: SOLID_FOOD_SLOTS
  };
  vm.createContext(context);
  if (label === 'care') {
    context.MEAL_SLOT_ORDER = SLOT_IDS;
    vm.runInContext(
      between(html, 'function getLocalDateKey(', 'function sanitizeMilmaruName('),
      context,
      { filename: `${label}-feeding-schema.js` }
    );
    context.normalizeFeedingDay = (value, timestamp) => {
      const holder = { lastCareAt: value?.lastSeenAt, feedingDay: plain(value) };
      context.ensureFeedingDayState(holder, timestamp);
      return holder.feedingDay;
    };
  } else {
    vm.runInContext(
      between(html, 'function getLocalDateKey(', 'function migrateFoodSystemV2('),
      context,
      { filename: `${label}-feeding-schema.js` }
    );
  }
  return context;
}

const normalizeContexts = Object.fromEntries(
  Object.entries(pages).map(([label, html]) => [label, makeNormalizeContext(html, label)])
);
for (const [label, context] of Object.entries(normalizeContexts)) {
  const sameDay = context.normalizeFeedingDay({
    localDateKey: '2026-07-11',
    claimed: {
      morning: true,
      lunch: { token: 'tab-a', at: localTime(11, 11, 59, 59) },
      afternoon: false,
      dinner: null
    },
    lastSeenAt: priorLastSeenAt
  }, localTime(11, 12));
  assert.equal(sameDay.claimed.morning, true, `${label}: boolean claim was lost`);
  assert.deepEqual(plain(sameDay.claimed.lunch), {
    token: 'tab-a',
    at: localTime(11, 11, 59, 59)
  }, `${label}: token claim was lost`);
  assert.notEqual(sameDay.claimed.lunch, false, `${label}: object claim was coerced to false`);
  assert.equal(sameDay.lastSeenAt, priorLastSeenAt, `${label}: normalization overwrote lastSeenAt`);

  const nextDay = context.normalizeFeedingDay(sameDay, localTime(12, 6));
  assert.equal(nextDay.localDateKey, '2026-07-12', `${label}: local day did not roll over`);
  assert.ok(SLOT_IDS.every((slotId) => nextDay.claimed[slotId] !== true && !nextDay.claimed[slotId]?.token));
  assert.equal(nextDay.lastSeenAt, priorLastSeenAt, `${label}: rollover destroyed lastSeenAt`);
}

// ─── V1 -> food-system-v2 migration grants three meals once, never on every
// page load, and keeps babies/eggs on their existing inventory.
function installMigration(context, html, label) {
  context.FOOD_SYSTEM_VERSION = FOOD_SYSTEM_VERSION;
  vm.runInContext(
    between(html, 'function migrateFoodSystemV2(', label === 'writing' ? 'function loadCareState(' : 'function sanitizeMilmaruName('),
    context,
    { filename: `${label}-food-migration.js` }
  );
}

for (const label of ['writing', 'play']) {
  const context = normalizeContexts[label];
  installMigration(context, pages[label], label);
  const oldAdult = {
    hatched: true,
    sukusuku: 38,
    inventory: { moji_gohan: { count: 0 } }
  };
  const oldParsed = { foodSystemVersion: 0, feedingDay: null };
  context.migrateFoodSystemV2(oldAdult, oldParsed);
  assert.equal(oldAdult.inventory.moji_gohan.count, 3, `${label}: first migration must grant three meals`);
  assert.equal(oldAdult.foodSystemVersion, FOOD_SYSTEM_VERSION);
  context.migrateFoodSystemV2(oldAdult, oldAdult);
  assert.equal(oldAdult.inventory.moji_gohan.count, 3, `${label}: migration grant repeated`);

  const oldBaby = {
    hatched: true,
    sukusuku: 37.999,
    inventory: { moji_gohan: { count: 0 } }
  };
  context.migrateFoodSystemV2(oldBaby, oldParsed);
  assert.equal(oldBaby.inventory.moji_gohan.count, 0, `${label}: a milk-stage save received solid food`);

  const capped = {
    hatched: true,
    sukusuku: 80,
    inventory: { moji_gohan: { count: 98 } }
  };
  context.migrateFoodSystemV2(capped, oldParsed);
  assert.equal(capped.inventory.moji_gohan.count, 99, `${label}: migration must respect the inventory cap`);
}

// Care has a richer loader; execute it against storage so its inline migration
// and malformed-save fallback are covered rather than relying on source text.
function makeCareLoadContext(rawValue) {
  const store = new Map();
  const warnings = [];
  if (rawValue !== undefined) store.set(CARE_STATE_KEY, rawValue);
  const context = {
    Date,
    Math,
    Number,
    String,
    JSON,
    Object,
    CARE_STATE_KEY,
    FOOD_SYSTEM_VERSION,
    console: { warn(...args) { warnings.push(args); } },
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, value); }
    },
    clamp(value, min, max) { return Math.max(min, Math.min(max, value)); },
    getGrowthStage(value) {
      if (value < 10) return { id: 'egg' };
      if (value < 25) return { id: 'baby' };
      if (value < 50) return { id: 'yochiyochi' };
      if (value < 80) return { id: 'kids' };
      return { id: 'pre_evolution' };
    }
  };
  vm.createContext(context);
  vm.runInContext(
    between(pages.care, 'const FOOD_SYSTEM_VERSION = 2;', 'const actionStarCost'),
    context,
    { filename: 'care-food-state-constants.js' }
  );
  vm.runInContext(
    between(pages.care, 'function cloneDefaultState(', 'function getMilmaruName('),
    context,
    { filename: 'care-food-state-helpers.js' }
  );
  vm.runInContext(
    between(pages.care, 'function loadState(', 'function configureDebugModeFromQuery('),
    context,
    { filename: 'care-food-state-load.js' }
  );
  return { context, store, warnings };
}

const oldAdultSave = {
  name: 'ミルマル',
  hatched: true,
  sukusuku: 38,
  foodSystemVersion: 0,
  inventory: {
    moji_milk: { count: 4 },
    moji_cookie: { count: 2 }
  },
  lastCareAt: priorLastSeenAt,
  lastMoodAt: priorLastSeenAt
};
const careMigration = makeCareLoadContext(JSON.stringify(oldAdultSave));
const migratedCare = careMigration.context.loadState();
assert.deepEqual(careMigration.warnings, [], `care migration warned: ${String(careMigration.warnings[0]?.[1] || '')}`);
assert.equal(migratedCare.inventory.moji_gohan.count, 3, 'care: first migration must grant three meals');
migratedCare.foodSystemVersion = FOOD_SYSTEM_VERSION;
careMigration.store.set(CARE_STATE_KEY, JSON.stringify(migratedCare));
assert.equal(careMigration.context.loadState().inventory.moji_gohan.count, 3, 'care: migration grant repeated');

const malformedCare = makeCareLoadContext('{broken');
const recoveredCare = malformedCare.context.loadState();
assert.equal(recoveredCare.inventory.moji_gohan.count, 0, 'malformed storage must fall back to an empty meal inventory');
assert.equal(
  recoveredCare.feedingDay.localDateKey,
  malformedCare.context.getLocalDateKey(Date.now()),
  'malformed storage must still receive a valid current feeding day'
);

// ─── Writing rewards cover the next unfilled 3:1 schedule need. A pending
// reward counts as already available so refresh/navigation cannot duplicate it.
const rewardStore = new Map();
const rewardContext = {
  Date,
  Math,
  Number,
  String,
  JSON,
  Object,
  FOOD_SYSTEM_VERSION,
  DAILY_FEEDING_SLOTS: SOLID_FOOD_SLOTS,
  PENDING_REWARD_KEY,
  localStorage: {
    getItem(key) { return rewardStore.has(key) ? rewardStore.get(key) : null; },
    setItem(key, value) { rewardStore.set(key, value); },
    removeItem(key) { rewardStore.delete(key); }
  },
  careFoodRewards: {
    moji_milk: { type: 'food', id: 'moji_milk', name: 'もじミルク' },
    moji_gohan: { type: 'food', id: 'moji_gohan', name: 'もじごはん' },
    moji_cookie: { type: 'food', id: 'moji_cookie', name: 'もじクッキー' }
  },
  careState: null,
  getInventoryCount(id) {
    return Math.max(0, Number(rewardContext.careState.inventory[id]?.count) || 0);
  }
};
vm.createContext(rewardContext);
vm.runInContext(
  between(pages.writing, 'function getLocalDateKey(', 'function migrateFoodSystemV2('),
  rewardContext,
  { filename: 'writing-reward-feeding-day.js' }
);
vm.runInContext(
  between(pages.writing, 'function getPendingRewardFoodId(', 'function setFoodIconClass('),
  rewardContext,
  { filename: 'writing-next-food-reward.js' }
);

function writingReward({ hatched = true, sukusuku = 38, gohan = 0, cookie = 0, claimed = {}, pending }) {
  rewardContext.careState = {
    hatched,
    sukusuku,
    inventory: {
      moji_milk: { count: 0 },
      moji_gohan: { count: gohan },
      moji_cookie: { count: cookie }
    },
    feedingDay: {
      localDateKey: rewardContext.getLocalDateKey(Date.now()),
      claimed: plain(claimed),
      lastSeenAt: priorLastSeenAt
    }
  };
  rewardStore.clear();
  if (pending !== undefined) rewardStore.set(PENDING_REWARD_KEY, pending);
  return rewardContext.getCurrentWritingReward();
}

assert.equal(writingReward({ hatched: false }), null, 'egg writing must award stars only');
assert.equal(writingReward({ sukusuku: 37.999 })?.id, 'moji_milk', 'milk stage writing reward drifted');
assert.equal(writingReward({ gohan: 0, cookie: 0 })?.id, 'moji_gohan');
assert.equal(writingReward({ gohan: 1, cookie: 0 })?.id, 'moji_gohan');
assert.equal(writingReward({ gohan: 2, cookie: 0 })?.id, 'moji_cookie');
assert.equal(writingReward({ gohan: 2, cookie: 1 })?.id, 'moji_gohan');
assert.equal(writingReward({ gohan: 3, cookie: 1 })?.id, 'moji_gohan', 'a filled day must continue with the next 3:1 cycle');
assert.equal(
  writingReward({ gohan: 1, pending: JSON.stringify({ result: { success: true, reward: { id: 'moji_gohan' } } }) })?.id,
  'moji_cookie',
  'pending meal reward was not counted before allocation'
);
assert.equal(
  writingReward({ gohan: 2, pending: JSON.stringify({ result: { success: true, reward: { id: 'moji_cookie' } } }) })?.id,
  'moji_gohan',
  'pending cookie reward was not counted before allocation'
);
assert.equal(
  writingReward({ gohan: 2, pending: '{broken' })?.id,
  'moji_cookie',
  'malformed pending data must be ignored safely'
);
assert.equal(
  writingReward({ gohan: 2, pending: JSON.stringify({ result: { success: true, reward: { id: 'unknown' } } }) })?.id,
  'moji_cookie',
  'unknown pending food must be ignored safely'
);
assert.equal(
  writingReward({ claimed: { morning: true, lunch: { token: 'done' } }, gohan: 0, cookie: 0 })?.id,
  'moji_cookie',
  'claimed slots, including token claims, must be removed from today\'s needs'
);

// ─── Care-side atomicity and stale-tab protection. The slot must be claimed
// and persisted before any sound/animation/reaction, and every click re-reads
// shared storage before deciding whether it can claim.
const feedSource = between(pages.care, 'function feedCookie(', 'function finishPettingMode(');
assert.match(feedSource, /if \(feedBusy\) return/, 'rapid clicks need an in-memory lock');
assert.match(feedSource, /state = loadState\(\)/, 'each feed click must re-read shared storage');
assert.match(feedSource, /getMealPeriod\(/, 'feeding must use the current local slot');
assert.match(feedSource, /isMealClaimed\(/, 'feeding must reject an already claimed slot');
assert.match(feedSource, /feedingDay\.claimed\[/, 'feeding must record the slot claim');
assert.match(feedSource, /token:/, 'claims need an ownership token for stale-tab verification');
assert.match(feedSource, /saveState\(/, 'the claim must be persisted synchronously');
const claimIndex = feedSource.indexOf('feedingDay.claimed[');
const saveIndex = feedSource.indexOf('saveState(', claimIndex);
const soundIndex = feedSource.indexOf("playSfx('feed')");
const foodFxIndex = feedSource.indexOf('spawnFoodFx(');
assert.ok(claimIndex >= 0 && saveIndex > claimIndex, 'claim must be stored before save');
assert.ok(soundIndex > saveIndex, 'claim must be persisted before feed sound');
assert.ok(foodFxIndex > saveIndex, 'claim must be persisted before food animation');
assert.match(feedSource, /feedBusy = false/, 'the click lock must have a release path');

const storageSource = between(pages.care, "window.addEventListener('storage'", 'setupDebugControls();');
assert.match(storageSource, /event\.key !== CARE_STATE_KEY|event\.key === CARE_STATE_KEY/);
assert.match(storageSource, /state = loadState\(\)/, 'a storage event must refresh the in-memory care state');
assert.match(storageSource, /render\(\)/, 'a storage event must refresh meal UI');

// Main meals grow; the afternoon cookie is friendship/mood only. The visual
// effect must distinguish all three food ids and the UI must expose the meal.
assert.match(pages.care, /moji_milk:\s*\{[^}]*gainSukusuku: 4[^}]*gainGokigen: 18/);
assert.match(pages.care, /moji_gohan:\s*\{[^}]*gainSukusuku: 4[^}]*gainGokigen: 18/);
assert.match(pages.care, /moji_cookie:\s*\{[^}]*gainNakayoshi: 4,\s*gainSukusuku: 0,\s*gainGokigen: 20/);
assert.match(pages.care, /\.food-fx\.gohan\s*\{[\s\S]*?var\(--care-icon-gohan\)/);
assert.match(
  between(pages.care, 'function spawnFoodFx(', 'function queueHatchStep('),
  /foodId[^\n]*moji_gohan|replace\('moji_', ''\)/,
  'food FX must have a distinct gohan class'
);
assert.match(pages.care, /getElementById\('gohanCount'\)\.textContent = String\(getInventoryCount\('moji_gohan'\)\)/);
assert.match(pages.care, /id="mealSchedule" aria-label="きょうの ごはん"/);
assert.match(pages.care, /<span class="meal-slot-label">あさ<\/span>/);
assert.match(pages.care, /<span class="meal-slot-label">ひる<\/span>/);
assert.match(pages.care, /<span class="meal-slot-label">ごご<\/span>/);
assert.match(pages.care, /<span class="meal-slot-label">ばん<\/span>/);
const mealCopySource = between(pages.care, 'function getMealStatusLabel(', 'function markCareInteraction(');
assert.doesNotMatch(mealCopySource, /[朝昼夕夜食済終]/, 'new child-facing meal copy must stay in kana');

// ─── Generated bitmap guards: exact implementation canvases, true alpha and
// transparent corners. This prevents an opaque generation background returning.
function decodeRgbaPng(file) {
  const png = fs.readFileSync(file);
  assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', `${file}: invalid PNG signature`);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.equal(png[24], 8, `${file}: expected 8-bit PNG`);
  assert.equal(png[25], 6, `${file}: expected RGBA PNG`);
  assert.equal(png[28], 0, `${file}: expected non-interlaced PNG`);
  const idat = [];
  for (let offset = 8; offset + 12 <= png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') idat.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const packed = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const rgba = Buffer.alloc(stride * height);
  let input = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = packed[input++];
    for (let x = 0; x < stride; x += 1) {
      const raw = packed[input++];
      const outputIndex = y * stride + x;
      const left = x >= 4 ? rgba[outputIndex - 4] : 0;
      const up = y > 0 ? rgba[outputIndex - stride] : 0;
      const upLeft = y > 0 && x >= 4 ? rgba[outputIndex - stride - 4] : 0;
      if (filter === 0) rgba[outputIndex] = raw;
      else if (filter === 1) rgba[outputIndex] = (raw + left) & 255;
      else if (filter === 2) rgba[outputIndex] = (raw + up) & 255;
      else if (filter === 3) rgba[outputIndex] = (raw + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : (pb <= pc ? up : upLeft);
        rgba[outputIndex] = (raw + predictor) & 255;
      } else {
        assert.fail(`${file}: unsupported PNG filter ${filter}`);
      }
    }
  }
  return { png, width, height, rgba };
}

const bitmapCases = [
  ['assets/images/mojikko/care/icon_moji_gohan_onigiri.png', 160, 160],
  ['assets/images/mojikko/writing/reward_box_blank.png', 311, 122]
];
for (const [relative, expectedWidth, expectedHeight] of bitmapCases) {
  const file = path.join(root, relative);
  const decoded = decodeRgbaPng(file);
  assert.equal(decoded.width, expectedWidth, `${relative}: width drifted`);
  assert.equal(decoded.height, expectedHeight, `${relative}: height drifted`);
  assert.ok(decoded.png.length < 3 * 1024 * 1024, `${relative}: exceeds repository image limit`);
  const alpha = [];
  for (let index = 3; index < decoded.rgba.length; index += 4) alpha.push(decoded.rgba[index]);
  assert.equal(Math.min(...alpha), 0, `${relative}: no transparent pixels`);
  assert.equal(Math.max(...alpha), 255, `${relative}: no fully opaque artwork`);
  const cornerAlpha = [
    decoded.rgba[3],
    decoded.rgba[(decoded.width - 1) * 4 + 3],
    decoded.rgba[(decoded.height - 1) * decoded.width * 4 + 3],
    decoded.rgba[(decoded.width * decoded.height - 1) * 4 + 3]
  ];
  assert.deepEqual(cornerAlpha, [0, 0, 0, 0], `${relative}: generated background leaked into a corner`);
}

assert.match(pages.care, /--care-icon-gohan:\s*url\('\.\.\/assets\/images\/mojikko\/care\/icon_moji_gohan_onigiri\.png'\)/);
assert.match(pages.writing, /--moji-icon-gohan:\s*url\('\.\.\/assets\/images\/mojikko\/care\/icon_moji_gohan_onigiri\.png'\)/);
assert.doesNotMatch(pages.care, /icon_moji_gohan\.png/, 'care must not keep serving the bowl-shaped meal icon');
assert.doesNotMatch(pages.writing, /icon_moji_gohan\.png/, 'writing must not keep serving the bowl-shaped meal icon');
assert.match(pages.writing, /--moji-reward-box:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/reward_box_blank\.png'\)/);
assert.match(pages.writing, /\.reward-box \.food-pixel\s*\{\s*display: block;/);

console.log('Mojikko meal schedule regression: PASS');
