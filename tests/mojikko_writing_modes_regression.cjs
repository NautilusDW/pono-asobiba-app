'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'writing-mori/index.html'), 'utf8');
const wordDataSource = fs.readFileSync(path.join(root, 'mojicrane/data/words.js'), 'utf8');

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `missing source range: ${start} -> ${end}`);
  return source.slice(startIndex, endIndex);
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const failures = [];
function check(label, callback) {
  try {
    callback();
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
  }
}

const characterContext = {};
vm.createContext(characterContext);
vm.runInContext(
  `${between(html, 'const KANA_GROUPS =', 'const stageEl =')}\n` +
    'globalThis.productionWritingCharacters = writingCharacters;',
  characterContext,
  { filename: 'mojikko-writing-mode-characters.js' }
);
const writingCharacters = characterContext.productionWritingCharacters;

const constantsContext = {};
vm.createContext(constantsContext);
vm.runInContext(
  `${between(html, "const WRITING_MODE_STATE_KEY =", 'const FOOD_SYSTEM_VERSION =')}\n` +
    `globalThis.modeConstants = {
      WRITING_MODE_STATE_KEY,
      WORD_HOLE_STATE_KEY,
      DAILY_THREE_STATE_KEY,
      WRITING_MODES,
      WRITING_MODE_LABELS,
      WORD_HOLE_SESSION_SIZE,
      WORD_HOLE_MAX_ORDINAL,
      DAILY_THREE_SIZE,
      WORD_HOLE_CLEAR_KANA,
      WORD_HOLE_BLUEPRINTS,
      WORD_HOLE_STORYBOOK_ART
    };`,
  constantsContext,
  { filename: 'mojikko-writing-mode-constants.js' }
);
const modeConstants = constantsContext.modeConstants;

const wordDataContext = { window: {} };
vm.createContext(wordDataContext);
vm.runInContext(wordDataSource, wordDataContext, { filename: 'mojicrane-words.js' });
const wordData = wordDataContext.window.PonoMojicraneWords;

const progressAndModeSource = between(
  html,
  'function normalizeWritingCompletedIds(',
  'function fitStage('
);
const controllerSource = between(html, 'function isWordHoleStateComplete(', 'function escapeAttr(');

function makeModeContext(initial = {}, storageBehavior = {}, todayKey = '2026-07-15') {
  const store = new Map(Object.entries(initial));
  const calls = { get: [], set: [], warnings: [], listeners: {}, renders: 0 };
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
    ...modeConstants,
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
    updateCharacterButtons() {},
    pendingNextWritingIndex: null,
    pendingNextAction: null,
    pendingModeAdvanceTimer: null,
    complete: false,
    modalRetryBtn: { textContent: '' },
    wordHoleCatalog: [],
    wordHoleState: null,
    dailyThreeState: null,
    activeMode: modeConstants.WRITING_MODES.sequence,
    activeModeTaskId: null,
    allowBlockedModeTaskSettlement: false,
    writingModesInitialized: true,
    currentIndex: 0,
    getLocalDateKey() { return todayKey; },
    renderModePanel() { calls.renders += 1; },
    URLSearchParams,
    console: { warn(...args) { calls.warnings.push(args); } },
    clearTimeout() {},
    setTimeout() { return 1; }
  };
  vm.createContext(context);
  vm.runInContext(progressAndModeSource, context, { filename: 'mojikko-writing-mode-state.js' });
  context.wordHoleCatalog = context.buildValidatedWordHoleCatalog(wordData);
  vm.runInContext(controllerSource, context, { filename: 'mojikko-writing-mode-controller.js' });
  return { context, store, calls };
}

check('classic word dataset is loaded synchronously before the inline controller', () => {
  assert.match(
    html,
    /<script src="\.\.\/mojicrane\/data\/words\.js\?v=20260715-1307"><\/script>\s*<script>\s*'use strict';/,
    'word-hole mode must synchronously load the same-origin classic dataset'
  );
  assert.doesNotMatch(
    html,
    /<script[^>]+src="\.\.\/mojicrane\/data\/words\.js[^>]+(?:defer|type="module")/,
    'the dataset must be available before the body-end inline controller runs'
  );
  assert.doesNotMatch(html, /(?:fetch\s*\(|import\s*\()[^\n]*mojicrane\/data\/words/);
});

check('mode storage and public controller use separate V1 namespaces', () => {
  assert.equal(modeConstants.WRITING_MODE_STATE_KEY, 'mojikkoFarmWritingModeV1');
  assert.equal(modeConstants.WORD_HOLE_STATE_KEY, 'mojikkoFarmWordHoleV1');
  assert.equal(modeConstants.DAILY_THREE_STATE_KEY, 'mojikkoFarmDailyThreeV1');
  assert.deepEqual(plain(modeConstants.WRITING_MODES), {
    sequence: 'sequence',
    wordHole: 'word-hole',
    dailyThree: 'daily-three'
  });
  assert.match(html, /getMode:\s*\(\) => activeMode/);
  assert.match(html, /selectMode:\s*\(mode\) => activateWritingMode\(mode, \{ explicit: true \}\)/);
});

check('mode chooser is a labelled real dialog with real buttons and a back action', () => {
  assert.match(html, /<button[^>]+id="modeSwitchBtn"[^>]+aria-haspopup="dialog"/);
  assert.match(html, /id="modeChoiceOverlay"[^>]+role="dialog"[^>]+aria-modal="true"[^>]+aria-labelledby="modeChoiceTitle"/);
  assert.match(html, /<button[^>]+data-writing-mode="sequence"/);
  assert.match(html, /<button[^>]+data-writing-mode="word-hole"/);
  assert.match(html, /<button[^>]+data-writing-mode="daily-three"/);
  assert.match(html, /<button[^>]+id="modeChoiceCloseBtn"[^>]*>もどる<\/button>/);
  ['あそびを かえる', 'どれで かく？', 'じゅんばん', 'ことばの あな', 'きょうの 3もじ']
    .forEach((copy) => assert.ok(html.includes(copy), `missing child-facing copy: ${copy}`));
});

check('word-hole whitelist is exact, validated, clear, and answer-unique', () => {
  const expectedBlueprints = [
    ['ねこ', 1], ['いぬ', 1], ['くま', 1], ['ほし', 1], ['はな', 1], ['ふね', 1],
    ['かに', 1], ['たこ', 0], ['つき', 0], ['くるま', 1], ['さかな', 1], ['みかん', 2],
    ['とけい', 1], ['きりん', 1], ['こあら', 2], ['ひこうき', 2], ['らいおん', 2], ['ひまわり', 2]
  ];
  assert.deepEqual(
    plain(modeConstants.WORD_HOLE_BLUEPRINTS).map(({ word, blankIndex }) => [word, blankIndex]),
    expectedBlueprints
  );
  const { context } = makeModeContext();
  const catalog = context.buildValidatedWordHoleCatalog(wordData);
  assert.equal(catalog.length, 18);
  assert.equal(new Set(catalog.map((task) => task.id)).size, 18);
  assert.equal(new Set(catalog.map((task) => task.answer)).size, 18);
  catalog.forEach((task) => {
    assert.ok(Array.from(task.word).length >= 2 && Array.from(task.word).length <= 4);
    assert.equal(Array.from(task.word)[task.blankIndex], task.answer);
    assert.equal(writingCharacters.find((item) => item.id === task.characterId).char, task.answer);
    assert.ok(task.emoji);
  });
});

check('word-hole validation fails closed when the shared dataset is missing or incomplete', () => {
  const { context } = makeModeContext();
  assert.deepEqual(plain(context.buildValidatedWordHoleCatalog(undefined)), []);
  const incomplete = plain(wordData);
  incomplete.easy = incomplete.easy.filter((entry) => entry.word !== 'ねこ');
  assert.deepEqual(plain(context.buildValidatedWordHoleCatalog(incomplete)), []);
});

check('each word-hole ordinal creates five deterministic unique tasks and answers', () => {
  const { context } = makeModeContext();
  const first = context.createWordHoleSession(0);
  const reload = context.createWordHoleSession(0);
  const next = context.createWordHoleSession(1);
  assert.deepEqual(plain(first.tasks), plain(reload.tasks));
  assert.notEqual(first.nonce, reload.nonce);
  assert.notEqual(first.sessionId, reload.sessionId);
  assert.equal(first.tasks.length, 5);
  assert.equal(new Set(first.tasks).size, 5);
  const answers = first.tasks.map((id) => context.getWordHoleTask(id).characterId);
  assert.equal(new Set(answers).size, 5);
  assert.notDeepEqual(plain(first.tasks), plain(next.tasks));
  assert.equal(next.ordinal, 1);
  assert.ok(next.sessionId.startsWith('word-hole-1:'));
});

check('word-hole normalization resumes only a valid unfinished snapshot', () => {
  const { context } = makeModeContext();
  const state = context.createWordHoleSession(3);
  state.completedTaskIds = [state.tasks[1], 'unknown', state.tasks[0], state.tasks[1]];
  const normalized = context.normalizeWordHoleState(state);
  assert.deepEqual(plain(normalized.completedTaskIds), plain(state.tasks.slice(0, 2)));
  assert.equal(context.getFirstIncompleteTaskId(normalized.tasks, normalized.completedTaskIds), state.tasks[2]);
  assert.equal(context.normalizeWordHoleState({ ...state, sessionId: 'wrong' }), null);
  assert.equal(context.normalizeWordHoleState({ ...state, tasks: state.tasks.slice(0, 4) }), null);
});

check('daily-three chooses cursor-first incompletes plus a seeded review with unique fallbacks', () => {
  const { context } = makeModeContext();
  const ids = writingCharacters.map((item) => item.id);

  const fresh = context.createDailyThreeState('2026-07-15', { cursorId: ids[0], completedIds: [] });
  assert.deepEqual(plain(fresh.taskIds), plain(ids.slice(0, 3)), 'zero completed falls back to three incompletes');

  const completed = ids.slice(0, 6);
  const normal = context.createDailyThreeState('2026-07-15', { cursorId: ids[6], completedIds: completed });
  assert.deepEqual(plain(normal.taskIds.slice(0, 2)), plain(ids.slice(6, 8)));
  assert.ok(completed.includes(normal.taskIds[2]), 'third task should be a seeded review');
  assert.equal(new Set(normal.taskIds).size, 3);

  const onlyOneIncomplete = context.createDailyThreeState('2026-07-15', {
    cursorId: ids.at(-1),
    completedIds: ids.slice(0, -1)
  });
  assert.equal(onlyOneIncomplete.taskIds[0], ids.at(-1));
  assert.equal(new Set(onlyOneIncomplete.taskIds).size, 3);
  assert.ok(onlyOneIncomplete.taskIds.slice(1).every((id) => ids.slice(0, -1).includes(id)));

  const allComplete = context.createDailyThreeState('2026-07-15', {
    cursorId: ids[0],
    completedIds: ids
  });
  assert.equal(allComplete.taskIds.length, 3);
  assert.equal(new Set(allComplete.taskIds).size, 3);
  assert.ok(allComplete.taskIds.every((id) => ids.includes(id)));
});

check('daily-three is stable for the local date and rotates its seeded review on another date', () => {
  const { context } = makeModeContext();
  const ids = writingCharacters.map((item) => item.id);
  const progress = { cursorId: ids[20], completedIds: ids.slice(0, 20) };
  const todayA = context.createDailyThreeState('2026-07-15', progress);
  const todayB = context.createDailyThreeState('2026-07-15', progress);
  const tomorrow = context.createDailyThreeState('2026-07-16', progress);
  assert.deepEqual(plain(todayA), plain(todayB));
  assert.deepEqual(plain(todayA.taskIds.slice(0, 2)), plain(tomorrow.taskIds.slice(0, 2)));
  assert.notEqual(todayA.taskIds[2], tomorrow.taskIds[2]);
  assert.equal(context.createDailyThreeState('2026/07/15', progress), null);
});

check('daily-three normalization keeps only task completions and rejects corrupt snapshots', () => {
  const { context } = makeModeContext();
  const ids = writingCharacters.slice(0, 3).map((item) => item.id);
  const normalized = context.normalizeDailyThreeState({
    version: 1,
    dateKey: '2026-07-15',
    taskIds: ids,
    completedIds: [ids[1], 'unknown', ids[0], ids[1]]
  });
  assert.deepEqual(plain(normalized.completedIds), plain(ids.slice(0, 2)));
  assert.equal(context.normalizeDailyThreeState({ ...normalized, dateKey: 'bad' }), null);
  assert.equal(context.normalizeDailyThreeState({ ...normalized, taskIds: [ids[0], ids[0], ids[2]] }), null);
});

check('daily rollover ignores both future and past snapshots in favor of the local today plan', () => {
  for (const staleDate of ['2026-07-14', '2026-07-16']) {
    const { context, store } = makeModeContext({}, {}, '2026-07-15');
    const ids = writingCharacters.slice(0, 3).map((item) => item.id);
    const stale = context.normalizeDailyThreeState({
      version: 1,
      dateKey: staleDate,
      taskIds: ids,
      completedIds: ids
    });
    context.dailyThreeState = stale;
    store.set(context.DAILY_THREE_STATE_KEY, JSON.stringify(stale));
    const resolved = context.resolveDailyThreeModeTarget({ explicit: true });
    assert.equal(resolved.ok, true, `${staleDate} must not block today's entry`);
    assert.equal(context.dailyThreeState.dateKey, '2026-07-15');
    assert.equal(JSON.parse(store.get(context.DAILY_THREE_STATE_KEY)).dateKey, '2026-07-15');
  }
});

check('same-session word completions merge local and latest tab state', () => {
  const { context, store } = makeModeContext();
  const state = context.createWordHoleSession(0);
  context.wordHoleState = { ...state, completedTaskIds: [state.tasks[0]] };
  store.set(context.WORD_HOLE_STATE_KEY, JSON.stringify({
    ...plain(state),
    completedTaskIds: [state.tasks[1]]
  }));
  context.markWordHoleTaskCompleted(state.tasks[2]);
  assert.deepEqual(plain(context.wordHoleState.completedTaskIds), plain(state.tasks.slice(0, 3)));
  assert.deepEqual(JSON.parse(store.get(context.WORD_HOLE_STATE_KEY)).completedTaskIds, plain(state.tasks.slice(0, 3)));
});

check('same-snapshot daily completions merge local and latest tab state', () => {
  const { context, store } = makeModeContext();
  const ids = writingCharacters.slice(0, 3).map((item) => item.id);
  const state = { version: 1, dateKey: '2026-07-15', taskIds: ids, completedIds: [] };
  context.dailyThreeState = { ...state, completedIds: [ids[0]] };
  store.set(context.DAILY_THREE_STATE_KEY, JSON.stringify({ ...state, completedIds: [ids[1]] }));
  context.markDailyThreeTaskCompleted(ids[2]);
  assert.deepEqual(plain(context.dailyThreeState.completedIds), plain(ids));
  assert.deepEqual(JSON.parse(store.get(context.DAILY_THREE_STATE_KEY)).completedIds, plain(ids));
});

check('canonical word sessions prefer the highest ordinal and one deterministic same-ordinal plan', () => {
  const { context, store } = makeModeContext();
  const oldSession = context.createWordHoleSession(0);
  const newSession = context.createWordHoleSession(1);
  oldSession.completedTaskIds = [oldSession.tasks[0]];
  const highest = context.mergeCanonicalWordHoleStates(oldSession, newSession);
  assert.equal(highest.ordinal, 1);
  assert.deepEqual(plain(highest.completedTaskIds), []);

  const alternate = plain(newSession);
  alternate.tasks = alternate.tasks.slice().reverse();
  alternate.sessionId = context.createWordHoleSessionId(alternate.ordinal, alternate.tasks, alternate.nonce);
  alternate.planId = alternate.sessionId;
  alternate.completedTaskIds = [alternate.tasks[0]];
  const canonicalA = context.mergeCanonicalWordHoleStates(newSession, alternate);
  const canonicalB = context.mergeCanonicalWordHoleStates(alternate, newSession);
  assert.equal(canonicalA.planId, [newSession.planId, alternate.planId].sort()[0]);
  assert.deepEqual(plain(canonicalA), plain(canonicalB));

  context.wordHoleState = oldSession;
  store.set(context.WORD_HOLE_STATE_KEY, JSON.stringify(newSession));
  const staleReceipt = context.markWordHoleTaskCompleted(
    context.createWordHoleActiveTaskId(oldSession, oldSession.tasks[1])
  );
  assert.equal(staleReceipt.isNewCompletion, false);
  assert.equal(staleReceipt.state.ordinal, 1);
  assert.deepEqual(plain(staleReceipt.state.completedTaskIds), []);
});

check('canonical daily plans converge independently of merge order and reject stale plan tokens', () => {
  const { context, store } = makeModeContext();
  const ids = writingCharacters.slice(0, 4).map((item) => item.id);
  const planA = context.normalizeDailyThreeState({
    version: 1,
    dateKey: '2026-07-15',
    taskIds: ids.slice(0, 3),
    completedIds: [ids[0]]
  });
  const planB = context.normalizeDailyThreeState({
    version: 1,
    dateKey: '2026-07-15',
    taskIds: [ids[0], ids[1], ids[3]],
    completedIds: [ids[1]]
  });
  const canonicalA = context.mergeCanonicalDailyThreeStates(planA, planB);
  const canonicalB = context.mergeCanonicalDailyThreeStates(planB, planA);
  assert.equal(canonicalA.planId, [planA.planId, planB.planId].sort()[0]);
  assert.deepEqual(plain(canonicalA), plain(canonicalB));

  const stale = canonicalA.planId === planA.planId ? planB : planA;
  context.dailyThreeState = stale;
  store.set(context.DAILY_THREE_STATE_KEY, JSON.stringify(canonicalA));
  const staleReceipt = context.markDailyThreeTaskCompleted(
    context.createDailyThreeActiveTaskId(stale, stale.taskIds[0])
  );
  assert.equal(staleReceipt.isNewCompletion, false);
  assert.equal(staleReceipt.state.planId, canonicalA.planId);
});

check('storage snapshots union three sources while the visible task stays pinned until completion', () => {
  const { context, store, calls } = makeModeContext();
  const state = context.createWordHoleSession(0);
  context.activeMode = context.WRITING_MODES.wordHole;
  context.wordHoleState = { ...state, completedTaskIds: [state.tasks[0]] };
  const currentTaskId = state.tasks[1];
  const currentTask = context.getWordHoleTask(currentTaskId);
  context.activeModeTaskId = context.createWordHoleActiveTaskId(state, currentTaskId);
  context.currentIndex = context.getWritingCharacterIndex(currentTask.characterId);
  const pinnedToken = context.activeModeTaskId;
  const pinnedIndex = context.currentIndex;
  const incoming = { ...plain(state), completedTaskIds: [state.tasks[1]] };
  const stored = { ...plain(state), completedTaskIds: [state.tasks[2]] };
  store.set(context.WORD_HOLE_STATE_KEY, JSON.stringify(stored));

  context.handleWritingModeStorageEvent({
    key: context.WORD_HOLE_STATE_KEY,
    newValue: JSON.stringify(incoming),
    storageArea: context.localStorage
  });
  assert.deepEqual(plain(context.wordHoleState.completedTaskIds), plain(state.tasks.slice(0, 3)));
  assert.equal(context.activeModeTaskId, pinnedToken);
  assert.equal(context.currentIndex, pinnedIndex);
  assert.equal(calls.renders, 0);

  const duplicate = context.completeActiveModeTask(
    writingCharacters[context.currentIndex],
    pinnedToken
  );
  assert.equal(duplicate.isNewCompletion, false);
  assert.equal(duplicate.action.type, 'mode-task');
  assert.equal(duplicate.action.mode, context.WRITING_MODES.wordHole);
});

check('daily storage events also keep the visible character pinned and suppress a remote duplicate', () => {
  const { context, store, calls } = makeModeContext();
  const ids = writingCharacters.slice(0, 3).map((item) => item.id);
  const state = context.normalizeDailyThreeState({
    version: 1,
    dateKey: '2026-07-15',
    taskIds: ids,
    completedIds: []
  });
  context.activeMode = context.WRITING_MODES.dailyThree;
  context.dailyThreeState = state;
  context.activeModeTaskId = context.createDailyThreeActiveTaskId(state, ids[0]);
  context.currentIndex = context.getWritingCharacterIndex(ids[0]);
  const pinnedToken = context.activeModeTaskId;
  store.set(context.DAILY_THREE_STATE_KEY, JSON.stringify({ ...state, completedIds: [ids[0]] }));
  context.handleWritingModeStorageEvent({
    key: context.DAILY_THREE_STATE_KEY,
    newValue: JSON.stringify({ ...state, completedIds: [ids[0]] }),
    storageArea: context.localStorage
  });
  assert.equal(context.activeModeTaskId, pinnedToken);
  assert.equal(context.currentIndex, context.getWritingCharacterIndex(ids[0]));
  assert.equal(calls.renders, 0);
  const duplicate = context.completeActiveModeTask(writingCharacters[context.currentIndex], pinnedToken);
  assert.equal(duplicate.isNewCompletion, false);
  assert.equal(duplicate.action.type, 'mode-task');
  assert.equal(duplicate.action.characterId, ids[1]);
});

check('storage events reconcile task progress without forcing another active mode', () => {
  const { context, store } = makeModeContext();
  const wordState = context.createWordHoleSession(0);
  context.activeMode = context.WRITING_MODES.dailyThree;
  store.set(context.WORD_HOLE_STATE_KEY, JSON.stringify(wordState));
  context.handleWritingModeStorageEvent({ key: context.WORD_HOLE_STATE_KEY, storageArea: context.localStorage });
  assert.equal(context.activeMode, context.WRITING_MODES.dailyThree);
  assert.equal(context.wordHoleState.sessionId, wordState.sessionId);
});

check('unfinished preferred modes resume, while completed or corrupt ones fall back to sequence', () => {
  const wordBase = makeModeContext();
  const wordState = wordBase.context.createWordHoleSession(0);
  wordState.completedTaskIds = [wordState.tasks[0], wordState.tasks[1]];
  wordBase.store.set(wordBase.context.WORD_HOLE_STATE_KEY, JSON.stringify(wordState));
  wordBase.store.set(wordBase.context.WRITING_MODE_STATE_KEY, JSON.stringify({ version: 1, activeMode: 'word-hole' }));
  wordBase.context.wordHoleState = null;
  wordBase.context.restorePreferredWritingMode();
  assert.equal(wordBase.context.activeMode, 'word-hole');
  assert.equal(
    writingCharacters[wordBase.context.currentIndex].id,
    wordBase.context.getWordHoleTask(wordState.tasks[2]).characterId
  );

  wordState.completedTaskIds = wordState.tasks.slice();
  wordBase.store.set(wordBase.context.WORD_HOLE_STATE_KEY, JSON.stringify(wordState));
  wordBase.context.wordHoleState = null;
  wordBase.context.restorePreferredWritingMode();
  assert.equal(wordBase.context.activeMode, 'sequence');
  assert.equal(JSON.parse(wordBase.store.get(wordBase.context.WRITING_MODE_STATE_KEY)).activeMode, 'sequence');

  const corrupt = makeModeContext({
    mojikkoFarmWritingModeV1: '{broken',
    mojikkoFarmWordHoleV1: '{broken'
  });
  assert.doesNotThrow(() => corrupt.context.restorePreferredWritingMode());
  assert.equal(corrupt.context.activeMode, 'sequence');
});

check('daily snapshot resumes the next unfinished task and a completed day cannot loop rewards', () => {
  const { context, store } = makeModeContext();
  const ids = writingCharacters.map((item) => item.id);
  const daily = context.createDailyThreeState('2026-07-15', {
    cursorId: ids[8],
    completedIds: ids.slice(0, 8)
  });
  daily.completedIds = [daily.taskIds[0]];
  store.set(context.DAILY_THREE_STATE_KEY, JSON.stringify(daily));
  store.set(context.WRITING_MODE_STATE_KEY, JSON.stringify({ version: 1, activeMode: 'daily-three' }));
  context.dailyThreeState = null;
  context.restorePreferredWritingMode();
  assert.equal(context.activeMode, 'daily-three');
  assert.equal(writingCharacters[context.currentIndex].id, daily.taskIds[1]);

  daily.completedIds = daily.taskIds.slice();
  store.set(context.DAILY_THREE_STATE_KEY, JSON.stringify(daily));
  context.dailyThreeState = null;
  const result = context.resolveDailyThreeModeTarget({ explicit: true });
  assert.deepEqual(plain(result), { ok: false, reason: 'complete' });
  assert.deepEqual(JSON.parse(store.get(context.DAILY_THREE_STATE_KEY)).completedIds, plain(daily.taskIds));
});

check('explicitly reselecting a completed word session starts only the next ordinal', () => {
  const { context, store } = makeModeContext();
  const completed = context.createWordHoleSession(4);
  completed.completedTaskIds = completed.tasks.slice();
  context.wordHoleState = completed;
  store.set(context.WORD_HOLE_STATE_KEY, JSON.stringify(completed));
  const resolved = context.resolveWordHoleModeTarget({ explicit: true });
  assert.equal(resolved.ok, true);
  assert.equal(context.wordHoleState.ordinal, 5);
  assert.ok(context.wordHoleState.sessionId.startsWith('word-hole-5:'));
  assert.deepEqual(plain(context.wordHoleState.completedTaskIds), []);
});

check('mode storage failures stay fail-soft', () => {
  const getBlocked = makeModeContext({}, { throwGet: true });
  assert.doesNotThrow(() => getBlocked.context.restorePreferredWritingMode());
  assert.equal(getBlocked.context.activeMode, 'sequence');

  const setBlocked = makeModeContext({}, { throwSet: true });
  const session = setBlocked.context.createWordHoleSession(0);
  assert.doesNotThrow(() => setBlocked.context.writeWordHoleState(session));
  assert.doesNotThrow(() => setBlocked.context.writeDailyThreeState(
    setBlocked.context.createDailyThreeState('2026-07-15', { cursorId: writingCharacters[0].id, completedIds: [] })
  ));
  assert.doesNotThrow(() => setBlocked.context.writeWritingModePreference('word-hole'));
});

check('tier lock and portrait leave all three mode keys byte-identical and uninitialized', () => {
  const seeded = {
    mojikkoFarmWritingModeV1: '{"version":1,"activeMode":"word-hole"}',
    mojikkoFarmWordHoleV1: '{"sentinel":"word"}',
    mojikkoFarmDailyThreeV1: '{"sentinel":"daily"}'
  };
  for (const blockRuntime of [
    (windowObject) => { windowObject.__PONO_TIER_LOCKED__ = true; },
    (windowObject) => { windowObject.matchMedia = () => ({ matches: true }); }
  ]) {
    const { context, store, calls } = makeModeContext(seeded);
    context.writingModesInitialized = false;
    blockRuntime(context.window);
    const before = Array.from(store.entries());
    assert.equal(context.initializeWritingModesIfAllowed(), false);
    assert.equal(context.readWritingModePreference(), context.WRITING_MODES.sequence);
    assert.equal(context.readWordHoleState(), null);
    assert.equal(context.readDailyThreeState(), null);
    context.writeWritingModePreference(context.WRITING_MODES.dailyThree);
    context.writeWordHoleState(context.createWordHoleSession(0));
    context.writeDailyThreeState(context.createDailyThreeState('2026-07-15', {
      cursorId: writingCharacters[0].id,
      completedIds: []
    }));
    context.handleWritingModeStorageEvent({
      key: context.WORD_HOLE_STATE_KEY,
      newValue: JSON.stringify(context.createWordHoleSession(0)),
      storageArea: context.localStorage
    });
    assert.deepEqual(Array.from(store.entries()), before);
    assert.deepEqual(calls.get, []);
    assert.deepEqual(calls.set, []);
    assert.equal(context.writingModesInitialized, false);
  }
});

check('unavailable word data preserves both preference and session bytes for a later retry', () => {
  const { context, store } = makeModeContext();
  const session = context.createWordHoleSession(2);
  const preferenceRaw = JSON.stringify({ version: 1, activeMode: context.WRITING_MODES.wordHole });
  const sessionRaw = JSON.stringify(session);
  store.set(context.WRITING_MODE_STATE_KEY, preferenceRaw);
  store.set(context.WORD_HOLE_STATE_KEY, sessionRaw);
  context.wordHoleCatalog = [];
  context.wordHoleState = null;
  context.restorePreferredWritingMode();
  assert.equal(context.activeMode, context.WRITING_MODES.sequence);
  assert.equal(store.get(context.WRITING_MODE_STATE_KEY), preferenceRaw);
  assert.equal(store.get(context.WORD_HOLE_STATE_KEY), sessionRaw);
});

check('word validation rejects emoji values that become empty after trimming', () => {
  const { context } = makeModeContext();
  const blankEmojiData = plain(wordData);
  const source = ['easy', 'normal', 'challenge']
    .flatMap((level) => blankEmojiData[level])
    .find((entry) => entry.word === modeConstants.WORD_HOLE_BLUEPRINTS[0].word);
  source.emoji = '  \n\t ';
  assert.deepEqual(plain(context.buildValidatedWordHoleCatalog(blankEmojiData)), []);
});

check('word ordinals reject unsafe values and wrap a completed cap to ordinal one', () => {
  const { context, store } = makeModeContext();
  const maxOrdinal = 1000000;
  assert.match(html, /const WORD_HOLE_MAX_ORDINAL = 1000000;/);
  const unsafe = context.createWordHoleSession(0);
  unsafe.ordinal = Number.MAX_SAFE_INTEGER + 1;
  unsafe.sessionId = context.createWordHoleSessionId(unsafe.ordinal, unsafe.tasks, unsafe.nonce);
  unsafe.planId = unsafe.sessionId;
  assert.equal(context.normalizeWordHoleState(unsafe), null);

  const capped = context.createWordHoleSession(maxOrdinal);
  const oldReceiptId = context.createModeTaskReceiptId('word-hole', capped.planId, capped.tasks[0]);
  capped.completedTaskIds = capped.tasks.slice();
  context.wordHoleState = capped;
  store.set(context.WORD_HOLE_STATE_KEY, JSON.stringify(capped));
  const resolved = context.resolveWordHoleModeTarget({ explicit: true });
  assert.equal(resolved.ok, true);
  assert.equal(context.wordHoleState.ordinal, 1);
  assert.deepEqual(plain(context.wordHoleState.completedTaskIds), []);
  const newReceiptId = context.createModeTaskReceiptId(
    'word-hole',
    context.wordHoleState.planId,
    context.wordHoleState.tasks[0]
  );
  assert.notEqual(newReceiptId, oldReceiptId);
  assert.notEqual(context.wordHoleState.nonce, capped.nonce);
});

check('only final tasks show the modal; intermediate answers advance after 900ms', () => {
  const { context, store } = makeModeContext();
  const word = context.createWordHoleSession(0);
  context.activeMode = 'word-hole';
  context.wordHoleState = word;
  store.set(context.WORD_HOLE_STATE_KEY, JSON.stringify(word));
  const firstTask = context.getWordHoleTask(word.tasks[0]);
  context.activeModeTaskId = context.createWordHoleActiveTaskId(context.wordHoleState, word.tasks[0]);
  const intermediate = context.completeActiveModeTask(
    writingCharacters.find((item) => item.id === firstTask.characterId),
    context.activeModeTaskId
  );
  assert.equal(intermediate.action.type, 'mode-task');
  assert.equal(intermediate.action.showOverlay, false);

  context.wordHoleState.completedTaskIds = word.tasks.slice(0, 4);
  store.set(context.WORD_HOLE_STATE_KEY, JSON.stringify(context.wordHoleState));
  const lastTask = context.getWordHoleTask(word.tasks[4]);
  context.activeModeTaskId = context.createWordHoleActiveTaskId(context.wordHoleState, word.tasks[4]);
  const final = context.completeActiveModeTask(
    writingCharacters.find((item) => item.id === lastTask.characterId),
    context.activeModeTaskId
  );
  assert.equal(final.action.type, 'mode-finished');
  assert.equal(final.action.showOverlay, true);

  const completeSource = between(html, 'function completeWriting(', 'function onWritingComplete(');
  assert.match(completeSource, /if \(pendingNextAction\.showOverlay\)[\s\S]*?openResultOverlay\(\)[\s\S]*?else[\s\S]*?}, 900\);/);
});

check('accepted characters save global progress and grant the existing reward exactly once', () => {
  const completeSource = between(html, 'function completeWriting(', 'function onWritingComplete(');
  assert.equal((completeSource.match(/saveWritingCursor\(item\.id\)/g) || []).length, 1);
  assert.equal((completeSource.match(/onWritingComplete\(result,/g) || []).length, 1);
  assert.ok(completeSource.indexOf('if (complete || writingCompletionInFlight) return;') < completeSource.indexOf('saveWritingCursor(item.id)'));
  assert.ok(completeSource.indexOf('completeActiveModeTask(item, completingTaskToken, completingMode)') < completeSource.indexOf('saveWritingCursor(item.id)'));
  assert.ok(completeSource.indexOf('saveWritingCursor(item.id)') < completeSource.indexOf('onWritingComplete(result,'));
  const taskCompletionSource = between(html, 'function completeActiveModeTask(', 'function configureModeCompletion(');
  assert.doesNotMatch(taskCompletionSource, /WRITING_STAR_REWARD|onWritingComplete\(|changeInventory\(/);
});

check('task panels replace the list, mode switching preserves sessions, and final copy is exact', () => {
  const panelSource = between(html, 'function renderModePanel(', 'function renderWritingModePrompt(');
  assert.match(panelSource, /kanaTabsEl\.hidden = !isSequence/);
  assert.match(panelSource, /charListEl\.hidden = !isSequence/);
  assert.match(panelSource, /modeProgress\.hidden = isSequence/);
  assert.match(panelSource, /characterPanel\.setAttribute\('aria-label', isSequence \? 'もじリスト' : WRITING_MODE_LABELS\[activeMode\]\)/);
  const activateSource = between(html, 'function activateWritingMode(', 'function restorePreferredWritingMode(');
  assert.doesNotMatch(activateSource, /createWordHoleSession|createDailyThreeState|completedTaskIds\s*=|completedIds\s*=/);
  assert.match(html, /'ことばが 5こ できた！ ごほうびも ふえたよ！'/);
  assert.match(html, /'きょうの 3もじ できた！ ごほうびも ふえたよ！'/);
  assert.match(html, /modeChoiceMessage\.textContent = 'きょうは できた！ また あした あそぼう';/);
});

check('active task identity is pinned and duplicate mode completions gate every reward path', () => {
  assert.match(html, /let activeModeTaskId = null;/);
  assert.match(html, /function synchronizeActiveModeTaskAtBoundary\(/);
  assert.match(html, /function completeActiveModeTask\(item, taskToken = activeModeTaskId, mode = activeMode\)/);
  assert.match(html, /isNewCompletion/);
  const completeSource = between(html, 'function completeWriting(', 'function onWritingComplete(');
  assert.match(completeSource, /const completingTaskToken = activeModeTaskId;/);
  assert.match(completeSource, /modeCompletion = completeActiveModeTask\(item, completingTaskToken, completingMode\);/);
  assert.match(completeSource, /if \(isNewCompletion\)[\s\S]*?stars \+= WRITING_STAR_REWARD;[\s\S]*?onWritingComplete\(result, \{ silent:/);
});

check('mode rewards require an atomic durable receipt claim before state and global progress settle', () => {
  assert.match(html, /const MODE_TASK_RECEIPT_DB_NAME =/);
  assert.match(html, /function createModeTaskReceiptId\(/);
  assert.match(html, /function claimModeTaskCompletion\(receiptId\)/);
  assert.match(html, /indexedDB\.open\(/);
  assert.match(html, /objectStore\([^)]*\)\.add\(/);
  assert.match(html, /ConstraintError/);
  assert.match(html, /MODE_TASK_RECEIPT_FALLBACK_PREFIX/);
  const fallbackReceiptCheck = between(
    html,
    'function hasModeTaskReceiptFallback(receiptId)',
    'function claimModeTaskCompletionFallbackWithLock(receiptId)'
  );
  assert.match(fallbackReceiptCheck, /catch \(_\) \{[\s\S]*?return true;/);
  const claimSource = between(html, 'function claimModeTaskCompletion(receiptId)', 'function normalizeWritingModePreference(');
  assert.ok(claimSource.indexOf('hasModeTaskReceiptFallback(receiptId)') < claimSource.indexOf('indexedDB.open('));
  const completeSource = between(html, 'async function completeWriting(', 'function onWritingComplete(');
  assert.match(completeSource, /await claimModeTaskCompletion\(/);
  assert.ok(completeSource.indexOf('await claimModeTaskCompletion(') < completeSource.indexOf('saveWritingCursor(item.id)'));
});

check('word ordinals and daily plans have deterministic canonical merge rules', () => {
  assert.match(html, /function createWordHoleSessionId\(/);
  assert.match(html, /function mergeCanonicalWordHoleStates\(/);
  assert.match(html, /function createDailyThreePlanId\(/);
  assert.match(html, /function mergeCanonicalDailyThreeStates\(/);
  assert.match(html, /planId/);
});

check('storage events consume event snapshots and merge local event and stored state without rerendering', () => {
  const handler = between(html, 'function handleWritingModeStorageEvent(', 'function fitStage(');
  assert.match(handler, /event\.newValue/);
  assert.match(handler, /parseWritingModeStorageSnapshot/);
  assert.match(handler, /wordHoleState, incoming, stored/);
  assert.match(handler, /dailyThreeState, incoming, stored/);
  assert.doesNotMatch(handler, /renderModePanel\(/);
});

check('tier lock and portrait defer all mode storage initialization until playable landscape', () => {
  assert.match(html, /function isWritingModeRuntimeBlocked\(/);
  assert.match(html, /window\.__PONO_TIER_LOCKED__/);
  assert.match(html, /matchMedia\('\(orientation: portrait\)'\)/);
  assert.match(html, /function initializeWritingModesIfAllowed\(/);
  assert.match(html, /writingModesInitialized/);
});

check('daily canonical merge is local-today-only and the date key never uses UTC serialization', () => {
  const mergeSource = between(html, 'function mergeCanonicalDailyThreeStates(', 'function writeDailyThreeState(');
  assert.match(mergeSource, /getLocalDateKey\(\)/);
  assert.match(mergeSource, /state\.dateKey === todayKey/);
  const dateSource = between(html, 'function getLocalDateKey(', 'function createFeedingDay(');
  assert.doesNotMatch(dateSource, /toISOString|toUTCString|getUTC/);
});

check('unavailable words preserve preference and blank emoji entries fail closed', () => {
  assert.match(html, /resolved\.reason === 'unavailable'/);
  assert.match(html, /entry\.emoji\.trim\(\)/);
  assert.match(html, /if \(!emoji\) return;/);
});

check('completion timers are token guarded and cancelled by reset mode switch and navigation', () => {
  assert.match(html, /let pendingResultOverlayTimer = null;/);
  assert.match(html, /let writingCompletionToken = 0;/);
  assert.match(html, /function clearPendingWritingCompletionTimers\(/);
  assert.match(html, /completionToken !== writingCompletionToken/);
  assert.match(html, /window\.addEventListener\('pagehide', clearPendingWritingCompletionTimers\)/);
  assert.match(html, /let pendingAutoCompleteTimer = null;/);
  assert.match(html, /pendingAutoCompleteTimer = setTimeout/);
  assert.match(html, /if \(isWritingModeRuntimeBlocked\(\)\)\s*\{/);
});

check('intermediate feedback names the accepted reward and final summary covers the whole set', () => {
  assert.match(html, /スター \+\$\{WRITING_STAR_REWARD\}！/);
  assert.match(html, /ごほうびも ふえたよ！/);
  assert.match(html, /resultRewardWrap\.hidden = !isNewCompletion/);
  assert.match(html, /promptText\.textContent = isNewCompletion[\s\S]*?\$\{completedCopy\} \$\{rewardFeedback\}/);
});

check('short landscape key controls expose compact 44px-class hit areas and dialog traps Tab', () => {
  assert.match(html, /@media \(max-height: 500px\) and \(orientation: landscape\)[\s\S]*?\.back-btn[\s\S]*?height:\s*108px/);
  assert.match(html, /@media \(max-height: 500px\) and \(orientation: landscape\)[\s\S]*?\.mode-switch-btn[\s\S]*?height:\s*108px/);
  assert.match(html, /event\.key === 'Tab'/);
  assert.match(html, /modeChoiceReturnFocus/);
  assert.match(html, /\.mode-choice-close[\s\S]*?min-height:\s*116px/);
  assert.match(html, /#stage #careBtn,[\s\S]*?#stage #modalRetryBtn[\s\S]*?min-height:\s*124px/);
  assert.match(html, /id="modeChoiceOverlay"[^>]+inert/);
  assert.match(html, /modeChoiceOverlay\.inert = false/);
  assert.match(html, /modeChoiceOverlay\.inert = true/);
});

check('opening the chooser settles a completed pending action at a safe task boundary first', () => {
  const openSource = between(html, 'function openModeChoice(', 'function closeModeChoice(');
  assert.match(openSource, /if \(complete && pendingNextAction\)/);
  assert.match(openSource, /nextCharacter\(\)/);
});

if (failures.length) {
  throw new assert.AssertionError({
    message: `Mojikko writing modes regression failures:\n- ${failures.join('\n- ')}`,
    actual: failures.length,
    expected: 0,
    operator: 'strictEqual'
  });
}

console.log('Mojikko writing modes regression: PASS');
