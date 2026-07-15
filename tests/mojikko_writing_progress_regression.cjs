'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'writing-mori/index.html'), 'utf8');

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `missing source range: ${start} -> ${end}`);
  return source.slice(startIndex, endIndex);
}

const firstCharacters = [
  ['hiragana_3042', 'あ'],
  ['hiragana_3044', 'い'],
  ['hiragana_3046', 'う'],
  ['hiragana_3048', 'え'],
  ['hiragana_304a', 'お'],
  ['hiragana_304b', 'か']
].map(([id, char]) => ({ id, char, group: 'hiragana', strokes: 1 }));
const fillerCharacters = Array.from({ length: 135 }, (_, index) => ({
  id: `test_${String(index).padStart(3, '0')}`,
  char: `試${index}`,
  group: 'test',
  strokes: 1
}));
const writingCharacters = [
  ...firstCharacters,
  ...fillerCharacters,
  { id: 'katakana_30dd', char: 'ポ', group: 'katakana', strokes: 1 }
];
assert.equal(writingCharacters.length, 142, 'fixture must match the production progress cap');

const productionCharacterContext = {};
vm.createContext(productionCharacterContext);
vm.runInContext(
  `${between(html, 'const KANA_GROUPS =', 'const stageEl =')}\n` +
    'globalThis.productionWritingCharacters = writingCharacters;',
  productionCharacterContext,
  { filename: 'mojikko-production-writing-characters.js' }
);
const productionWritingCharacters = productionCharacterContext.productionWritingCharacters;
assert.equal(productionWritingCharacters.length, 142, 'production must expose all 142 kana');
assert.equal(
  new Set(productionWritingCharacters.map((item) => item.id)).size,
  142,
  'production stable IDs must be unique'
);

const progressSource = between(html, 'function normalizeWritingCompletedIds(', 'function fitStage(');

function makeContext(initial = {}, storageBehavior = {}) {
  const store = new Map(Object.entries(initial));
  const calls = { get: [], set: [], warnings: [], listeners: {}, buttonUpdates: 0 };
  const localStorage = {
    get length() {
      if (storageBehavior.throwGet) throw new Error('get blocked');
      return store.size;
    },
    key(index) {
      if (storageBehavior.throwGet) throw new Error('get blocked');
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key) {
      calls.get.push(key);
      if (storageBehavior.throwGet) throw new Error('get blocked');
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      calls.set.push([key, value]);
      if (storageBehavior.throwSet || storageBehavior.throwSetKey === key) throw new Error('set blocked');
      store.set(key, value);
    }
  };
  const context = {
    writingCharacters,
    completedCharacters: new Set(),
    WRITING_CURSOR_KEY: 'mojikkoFarmWritingCursorV1',
    WRITING_PROGRESS_KEY: 'mojikkoFarmWritingProgressV2',
    WRITING_COMPLETED_MARKER_PREFIX: 'mojikkoFarmWritingCompletedV1:',
    localStorage,
    window: {
      location: { search: '' },
      addEventListener(type, handler) { calls.listeners[type] = handler; }
    },
    updateCharacterButtons() { calls.buttonUpdates += 1; },
    pendingNextWritingIndex: null,
    complete: false,
    modalRetryBtn: { textContent: '' },
    URLSearchParams,
    console: { warn(...args) { calls.warnings.push(args); } }
  };
  vm.createContext(context);
  vm.runInContext(progressSource, context, { filename: 'mojikko-writing-progress-source.js' });
  return { context, store, calls };
}

const failures = [];
function check(label, callback) {
  try {
    callback();
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
  }
}

check('V2 schema key', () => {
  assert.match(html, /const WRITING_PROGRESS_KEY = 'mojikkoFarmWritingProgressV2';/);
  assert.match(html, /const WRITING_COMPLETED_MARKER_PREFIX = 'mojikkoFarmWritingCompletedV1:';/);
});

check('fresh install starts at あ', () => {
  const { context } = makeContext();
  assert.equal(context.getInitialWritingIndex(), 0);
  assert.deepEqual(Array.from(context.loadWritingProgress().completedIds), []);
});

check('all entry routes resume か and restore あ行 marks', () => {
  const completedIds = firstCharacters.slice(0, 5).map((item) => item.id);
  const { context } = makeContext({
    mojikkoFarmWritingProgressV2: JSON.stringify({
      version: 2,
      cursorId: 'hiragana_304b',
      completedIds
    })
  });
  ['', '?from=care', '?from=play', '?reload=1'].forEach((search) => {
    context.window.location.search = search;
    assert.equal(context.getInitialWritingIndex(), 5, `entry ${search || 'bare'} must resume か`);
  });
  assert.deepEqual(Array.from(context.loadWritingProgress().completedIds), completedIds);
});

check('completing the あ row advances persistent progress to か', () => {
  const { context, store } = makeContext();
  firstCharacters.slice(0, 5).forEach((item) => {
    context.saveWritingCursor(item.id);
    assert.equal(
      store.get(`${context.WRITING_COMPLETED_MARKER_PREFIX}${item.id}`),
      '1',
      `${item.char} completion must persist its idempotent marker`
    );
  });
  assert.deepEqual(JSON.parse(store.get(context.WRITING_PROGRESS_KEY)), {
    version: 2,
    cursorId: 'hiragana_304b',
    completedIds: firstCharacters.slice(0, 5).map((item) => item.id)
  });
});

check('completed IDs are stable, unique, known, ordered, and capped at 142', () => {
  const noisy = [
    17,
    'unknown',
    writingCharacters[1].id,
    writingCharacters[0].id,
    writingCharacters[1].id,
    ...writingCharacters.map((item) => item.id),
    ...writingCharacters.map((item) => item.id)
  ];
  const { context } = makeContext({
    mojikkoFarmWritingProgressV2: JSON.stringify({
      version: 2,
      cursorId: writingCharacters[5].id,
      completedIds: noisy
    })
  });
  const loaded = context.loadWritingProgress();
  assert.equal(loaded.completedIds.length, 142);
  assert.deepEqual(Array.from(loaded.completedIds), writingCharacters.map((item) => item.id));
});

check('legacy V1 object and raw string restore only the cursor', () => {
  const objectLegacy = makeContext({
    mojikkoFarmWritingCursorV1: JSON.stringify({ characterId: 'hiragana_304b' })
  }).context;
  assert.equal(objectLegacy.getInitialWritingIndex(), 5);
  assert.deepEqual(Array.from(objectLegacy.loadWritingProgress().completedIds), []);

  const stringLegacy = makeContext({
    mojikkoFarmWritingCursorV1: JSON.stringify('hiragana_304b')
  }).context;
  assert.equal(stringLegacy.getInitialWritingIndex(), 5);

  const rawLegacy = makeContext({ mojikkoFarmWritingCursorV1: 'hiragana_304b' }).context;
  assert.equal(rawLegacy.getInitialWritingIndex(), 5);
});

check('broken V2 falls back to valid V1 without inferring marks', () => {
  const { context } = makeContext({
    mojikkoFarmWritingProgressV2: '{broken',
    mojikkoFarmWritingCursorV1: JSON.stringify({ characterId: 'hiragana_304b' })
  });
  assert.equal(context.getInitialWritingIndex(), 5);
  assert.deepEqual(Array.from(context.loadWritingProgress().completedIds), []);
});

check('save unions another tab completed IDs and writes explicit V2', () => {
  const { context, store } = makeContext({
    mojikkoFarmWritingProgressV2: JSON.stringify({
      version: 2,
      cursorId: 'hiragana_3046',
      completedIds: ['hiragana_3042', 'hiragana_3044']
    })
  });
  const nextIndex = context.saveWritingCursor('hiragana_3048');
  assert.equal(nextIndex, 2, 'completing ahead of the sequential cursor must preserve that cursor');
  assert.deepEqual(JSON.parse(store.get(context.WRITING_PROGRESS_KEY)), {
    version: 2,
    cursorId: 'hiragana_3046',
    completedIds: ['hiragana_3042', 'hiragana_3044', 'hiragana_3048']
  });
  assert.deepEqual(Array.from(context.completedCharacters), [
    'hiragana_3048',
    'hiragana_3042',
    'hiragana_3044'
  ]);
});

check('legacy save migrates cursor but does not invent old completed IDs', () => {
  const { context, store } = makeContext({
    mojikkoFarmWritingCursorV1: JSON.stringify({ characterId: 'hiragana_304b' })
  });
  const nextIndex = context.saveWritingCursor('hiragana_304b');
  assert.equal(nextIndex, 6);
  assert.deepEqual(JSON.parse(store.get(context.WRITING_PROGRESS_KEY)), {
    version: 2,
    cursorId: writingCharacters[6].id,
    completedIds: ['hiragana_304b']
  });
});

check('sequential cursor never regresses for repeats or ahead-of-cursor practice', () => {
  const completedIds = firstCharacters.slice(0, 5).map((item) => item.id);
  const { context, store } = makeContext({
    mojikkoFarmWritingProgressV2: JSON.stringify({
      version: 2,
      cursorId: 'hiragana_304b',
      completedIds
    })
  });
  assert.equal(context.saveWritingCursor('hiragana_3042'), 5, 'repeating あ must keep か');
  assert.equal(JSON.parse(store.get(context.WRITING_PROGRESS_KEY)).cursorId, 'hiragana_304b');

  const aheadId = writingCharacters[10].id;
  assert.equal(context.saveWritingCursor(aheadId), 5, 'new manual practice ahead of か must keep か');
  assert.equal(JSON.parse(store.get(context.WRITING_PROGRESS_KEY)).cursorId, 'hiragana_304b');
});

check('completed markers recover lost V2 updates and storage events converge once', () => {
  const markerPrefix = 'mojikkoFarmWritingCompletedV1:';
  const { context, store, calls } = makeContext({
    mojikkoFarmWritingProgressV2: JSON.stringify({
      version: 2,
      cursorId: 'hiragana_3044',
      completedIds: ['hiragana_3042']
    }),
    [`${markerPrefix}hiragana_3042`]: '1',
    [`${markerPrefix}hiragana_3044`]: '1',
    [`${markerPrefix}unknown`]: '1',
    [`${markerPrefix}hiragana_3046`]: 'invalid'
  });
  const recovered = context.loadWritingProgress();
  assert.deepEqual(Array.from(recovered.completedIds), ['hiragana_3042', 'hiragana_3044']);
  assert.equal(recovered.cursorId, 'hiragana_3046');

  assert.equal(typeof calls.listeners.storage, 'function');
  const writesBefore = calls.set.length;
  calls.listeners.storage({
    key: `${markerPrefix}hiragana_3044`,
    newValue: '1',
    storageArea: context.localStorage
  });
  const canonical = JSON.parse(store.get(context.WRITING_PROGRESS_KEY));
  assert.deepEqual(canonical.completedIds, ['hiragana_3042', 'hiragana_3044']);
  assert.equal(canonical.cursorId, 'hiragana_3046');
  assert.ok(context.completedCharacters.has('hiragana_3044'));
  assert.equal(calls.buttonUpdates, 1);

  const writesAfterConvergence = calls.set.length;
  calls.listeners.storage({
    key: context.WRITING_PROGRESS_KEY,
    newValue: JSON.stringify(canonical),
    storageArea: context.localStorage
  });
  assert.equal(calls.set.length, writesAfterConvergence, 'canonical cache must not ping-pong');
  assert.ok(writesAfterConvergence > writesBefore);
});

check('V2 save dual-writes V1 even when V2 setItem fails', () => {
  const { context, store, calls } = makeContext({}, {
    throwSetKey: 'mojikkoFarmWritingProgressV2'
  });
  assert.equal(context.saveWritingCursor('hiragana_3042'), 1);
  assert.deepEqual(JSON.parse(store.get(context.WRITING_CURSOR_KEY)), {
    characterId: 'hiragana_3044'
  });
  assert.ok(calls.set.some(([key]) => key === context.WRITING_PROGRESS_KEY));
  assert.ok(calls.set.some(([key]) => key === context.WRITING_CURSOR_KEY));
});

check('completed cursor normalizes forward and all-complete state alone wraps to あ', () => {
  const cursorCompleted = makeContext({
    mojikkoFarmWritingProgressV2: JSON.stringify({
      version: 2,
      cursorId: 'hiragana_3042',
      completedIds: ['hiragana_3042']
    })
  }).context.loadWritingProgress();
  assert.equal(cursorCompleted.cursorId, 'hiragana_3044');

  const allIds = writingCharacters.map((item) => item.id);
  const { context } = makeContext({
    mojikkoFarmWritingProgressV2: JSON.stringify({
      version: 2,
      cursorId: 'hiragana_304b',
      completedIds: allIds
    })
  });
  assert.equal(context.loadWritingProgress().cursorId, 'hiragana_3042');
  assert.equal(context.saveWritingCursor('hiragana_3042'), 0);
  assert.equal(context.loadWritingProgress().cursorId, 'hiragana_3042');
});

check('storage exceptions never block play', () => {
  const getBlocked = makeContext({}, { throwGet: true }).context;
  assert.equal(getBlocked.getInitialWritingIndex(), 0);
  assert.doesNotThrow(() => getBlocked.saveWritingCursor('hiragana_3042'));

  const setBlocked = makeContext({}, { throwSet: true }).context;
  assert.doesNotThrow(() => setBlocked.saveWritingCursor('hiragana_3042'));
});

check('setItem failures do not block completion or its reward path', () => {
  const { context, calls } = makeContext({}, { throwSet: true });
  Object.assign(context, {
    currentIndex: 0,
    completionQueued: false,
    writer: null,
    strokesCompleted: 1,
    currentStrokeIndex: 0,
    careState: { hatched: false },
    stars: 0,
    WRITING_STAR_REWARD: 10,
    writingBoard: { classList: { add() {} } },
    companionCard: { classList: { toggle() {} } },
    resultReward: { textContent: '' },
    resultRewardIcon: {},
    resultRewardWrap: { hidden: false },
    starCountEl: { textContent: '' },
    resultOverlay: { classList: { add() { calls.overlay = (calls.overlay || 0) + 1; } } },
    pendingNextAction: null,
    pendingModeAdvanceTimer: null,
    pendingResultOverlayTimer: null,
    writingCompletionToken: 0,
    writingCompletionInFlight: false,
    allowBlockedModeTaskSettlement: false,
    pendingModeChoiceOpen: false,
    activeMode: 'sequence',
    activeModeTaskId: null,
    WRITING_MODES: { sequence: 'sequence', wordHole: 'word-hole', dailyThree: 'daily-three' },
    isWritingModeRuntimeBlocked() { return false; },
    getCurrentCharacter() { return writingCharacters[context.currentIndex]; },
    getWritingReadiness() { return { ready: true }; },
    playSfx() {},
    stopTrail() {},
    fillAllLetterPixels() {},
    renderPixelLetter() {},
    renderCanvasStrokeNumbers() {},
    renderStrokeOrder() {},
    setMessage() {},
    getCurrentWritingReward() { return { id: 'moji_cookie', name: 'もじクッキー' }; },
    setFoodIconClass() {},
    launchBurst() {},
    calculateAccuracy() { return 0.9; },
    completeActiveModeTask() {
      return {
        action: { type: 'sequence', mode: 'sequence', targetIndex: 1, showOverlay: true },
        isNewCompletion: true
      };
    },
    configureModeCompletion() {},
    onWritingComplete(result) { calls.rewardResult = result; },
    setTimeout(fn) { fn(); return 1; }
  });
  vm.runInContext(
    between(html, 'async function completeWriting(', 'function onWritingComplete('),
    context,
    { filename: 'mojikko-writing-complete-storage-failure.js' }
  );
  assert.doesNotThrow(() => context.completeWriting(false, { totalStrokes: 1 }));
  assert.ok(context.completedCharacters.has('hiragana_3042'));
  assert.equal(context.pendingNextWritingIndex, 1);
  assert.equal(context.stars, 10);
  assert.equal(calls.rewardResult.characterId, 'hiragana_3042');
  assert.equal(calls.overlay, 1);
});

check('manual selection, tab selection, and retry do not save progress', () => {
  const groupSource = between(html, 'function setCurrentGroup(', 'function escapeAttr(');
  const resetSource = between(html, 'function resetWriting(', 'function selectCharacter(');
  const selectSource = between(html, 'function selectCharacter(', 'function boardPointFromEvent(');
  const nextSource = between(html, 'function nextCharacter(', "document.addEventListener('pointerdown'");
  assert.doesNotMatch(groupSource, /saveWritingCursor|completedCharacters\.(?:add|delete|clear)/);
  assert.doesNotMatch(resetSource, /saveWritingCursor|completedCharacters\.(?:add|delete|clear)/);
  assert.doesNotMatch(selectSource, /saveWritingCursor|completedCharacters\.(?:add|delete|clear)/);
  assert.doesNotMatch(nextSource, /saveWritingCursor|completedCharacters\.(?:add|delete|clear)/);
});

check('result next action follows the confirmed pending cursor', () => {
  const nextSource = between(html, 'function nextCharacter(', "document.addEventListener('pointerdown'");
  const calls = { sync: 0, reset: 0, fallback: 0 };
  const context = {
    currentIndex: 0,
    pendingNextWritingIndex: 5,
    pendingNextAction: null,
    writingCharacters,
    syncCurrentGroupFromCharacter() { calls.sync += 1; },
    resetWriting() { calls.reset += 1; },
    getInitialWritingIndex() { calls.fallback += 1; return 0; }
  };
  vm.createContext(context);
  vm.runInContext(nextSource, context, { filename: 'mojikko-writing-next-character.js' });

  context.nextCharacter();
  assert.equal(context.currentIndex, 5, 'あ表示中でもconfirmed pending=かへ進む');
  assert.deepEqual(calls, { sync: 1, reset: 1, fallback: 0 });

  context.currentIndex = 4;
  context.pendingNextWritingIndex = 999;
  context.nextCharacter();
  assert.equal(context.currentIndex, 0, 'invalid pending cursor must use the normalized loader fallback');
  assert.deepEqual(calls, { sync: 2, reset: 2, fallback: 1 });
});

check('success alone records current and next, with ポ wrapping to あ', () => {
  const completeSource = between(html, 'async function completeWriting(', 'function onWritingComplete(');
  assert.match(completeSource, /pendingNextWritingIndex = saveWritingCursor\(item\.id\);/);
  assert.ok(completeSource.indexOf('if (!readiness.ready)') < completeSource.indexOf('saveWritingCursor(item.id)'));
});

check('initialization hydrates marks before rendering the restored cursor', () => {
  assert.match(
    html,
    /const initialWritingProgress = loadWritingProgress\(\);[\s\S]*?initialWritingProgress\.completedIds\.forEach\(\(id\) => completedCharacters\.add\(id\)\);[\s\S]*?if \(!initializeWritingModesIfAllowed\(\)\) \{[\s\S]*?resetWriting\(\{ skipModeBoundary: true \}\);\s*\}/
  );
});

if (failures.length) {
  throw new assert.AssertionError({
    message: `Mojikko writing progress regression failures:\n- ${failures.join('\n- ')}`,
    actual: failures.length,
    expected: 0,
    operator: 'strictEqual'
  });
}

console.log('Mojikko writing progress regression: PASS');
