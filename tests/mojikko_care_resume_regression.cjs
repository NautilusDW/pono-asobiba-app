'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const careHtml = fs.readFileSync(path.join(root, 'writing-mori/care.html'), 'utf8');
const writingHtml = fs.readFileSync(path.join(root, 'writing-mori/index.html'), 'utf8');

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

compileInlineScripts(careHtml, 'mojikko-care');
compileInlineScripts(writingHtml, 'mojikko-writing');

assert.match(careHtml, /const PET_STROKE_REQUIRED_DISTANCE = 90;/);
assert.match(careHtml, /\.milmaru-wrap \{[\s\S]*?touch-action: none;/);
assert.match(careHtml, /milmaruWrap\.addEventListener\('pointercancel', cancelPetStroke\);/);

const petFlowSource = between(careHtml, 'function beginPetMilmaru(', 'function completePetMilmaru(');
const petEndSource = between(careHtml, 'function endPetStroke(', 'function cancelPetStroke(');
assert.doesNotMatch(petEndSource, /showCareNotice/);
assert.doesNotMatch(petFlowSource, /あたまを ゆっくり なでると、ミルマルが よろこぶよ/);
assert.doesNotMatch(petFlowSource, /[卵頭喜]/, 'new child-facing pet guidance must stay in kana');
assert.match(petFlowSource, /'タマゴの まんなかを、やさしく なでてあげよう。'/);
assert.match(petFlowSource, /`\$\{getMilmaruName\(\)\}の あたまを、やさしく なでてあげよう。`/);

const pointContext = {
  stageWidth: 1600,
  stageEl: {
    getBoundingClientRect() {
      return { left: 0, top: 0, width: pointContext.stageWidth, height: pointContext.stageWidth * 0.5625 };
    }
  }
};
vm.createContext(pointContext);
vm.runInContext(
  between(careHtml, 'function getPetPointerPoint(', 'function isPetPointOnHead('),
  pointContext,
  { filename: 'mojikko-care-pet-point.js' }
);
const desktopStart = pointContext.getPetPointerPoint({ clientX: 100, clientY: 100 });
const desktopEnd = pointContext.getPetPointerPoint({ clientX: 190, clientY: 100 });
pointContext.stageWidth = 800;
const mobileStart = pointContext.getPetPointerPoint({ clientX: 50, clientY: 50 });
const mobileEnd = pointContext.getPetPointerPoint({ clientX: 95, clientY: 50 });
assert.equal(desktopEnd.x - desktopStart.x, 90, 'desktop pet distance must use design-space units');
assert.equal(mobileEnd.x - mobileStart.x, 90, 'scaled pet distance must match desktop behavior');

const addPointContext = {
  petStrokeActive: true,
  petLastPoint: { x: 0, y: 0 },
  petStrokeDistance: 0,
  PET_TRACE_DISTANCE_STEP: 42,
  PET_STROKE_REQUIRED_DISTANCE: 90,
  traceCalls: 0,
  completeCalls: 0,
  getPetPointerPoint(event) { return { x: event.clientX, y: event.clientY }; },
  spawnPetTrace() { addPointContext.traceCalls += 1; },
  completePetMilmaru() { addPointContext.completeCalls += 1; }
};
vm.createContext(addPointContext);
vm.runInContext(
  between(careHtml, 'function addPetStrokePoint(', 'function movePetStroke('),
  addPointContext,
  { filename: 'mojikko-care-pet-distance.js' }
);
assert.equal(addPointContext.addPetStrokePoint({ clientX: 30, clientY: 0 }), false);
assert.equal(addPointContext.petStrokeDistance, 30);
assert.equal(addPointContext.addPetStrokePoint({ clientX: 90, clientY: 0 }), true);
assert.equal(addPointContext.completeCalls, 1, 'accumulated gentle strokes must complete exactly once at the boundary');

function makeEndContext(hatched) {
  const calls = { speech: [], release: [] };
  const context = {
    calls,
    petStrokeActive: true,
    activePetPointerId: 7,
    petLastPoint: { x: 1, y: 1 },
    pettingMode: true,
    petStrokeDistance: 20,
    PET_STROKE_REQUIRED_DISTANCE: 90,
    petHintShown: false,
    state: { hatched },
    addPetStrokePoint() { return false; },
    getMilmaruName() { return 'ポポ'; },
    setSpeech(title, message) { calls.speech.push([title, message]); },
    milmaruWrap: { releasePointerCapture(id) { calls.release.push(id); } }
  };
  vm.createContext(context);
  vm.runInContext(petEndSource, context, { filename: `mojikko-care-pet-end-${hatched}.js` });
  return context;
}

const eggEnd = makeEndContext(false);
eggEnd.endPetStroke({ pointerId: 7, preventDefault() {} });
assert.equal(eggEnd.calls.speech.length, 1);
assert.match(eggEnd.calls.speech[0][1], /タマゴ/);
assert.doesNotMatch(eggEnd.calls.speech[0][1], /あたま|ミルマル|ポポ/);
eggEnd.endPetStroke({ pointerId: 7, preventDefault() {} });
assert.equal(eggEnd.calls.speech.length, 1, 'duplicate pointer endings must not repeat guidance');

const hatchedEnd = makeEndContext(true);
hatchedEnd.endPetStroke({ pointerId: 7, preventDefault() {} });
assert.match(hatchedEnd.calls.speech[0][1], /ポポ.*あたま/);
assert.doesNotMatch(hatchedEnd.calls.speech[0][1], /タマゴ/);

const cancelContext = {
  petStrokeActive: true,
  activePetPointerId: 11,
  petLastPoint: { x: 3, y: 4 }
};
vm.createContext(cancelContext);
vm.runInContext(
  between(careHtml, 'function cancelPetStroke(', 'function completePetMilmaru('),
  cancelContext,
  { filename: 'mojikko-care-pet-cancel.js' }
);
cancelContext.cancelPetStroke({ pointerId: 12 });
assert.equal(cancelContext.petStrokeActive, true, 'another pointer must not cancel the active stroke');
cancelContext.cancelPetStroke({ pointerId: 11 });
assert.equal(cancelContext.petStrokeActive, false);
assert.equal(cancelContext.activePetPointerId, null);

const secondaryContext = {
  petStrokeActive: true,
  activePetPointerId: 21,
  petStrokeDistance: 44,
  beginPetMilmaru() { throw new Error('secondary pointer must not restart petting'); },
  isPetPointOnHead() { throw new Error('secondary pointer must not run hit testing'); }
};
vm.createContext(secondaryContext);
vm.runInContext(
  between(careHtml, 'function startPetStroke(', 'function addPetStrokePoint('),
  secondaryContext,
  { filename: 'mojikko-care-pet-pointer-owner.js' }
);
let secondaryPrevented = false;
let secondaryStopped = false;
secondaryContext.startPetStroke({
  pointerType: 'touch',
  pointerId: 22,
  isPrimary: false,
  preventDefault() { secondaryPrevented = true; },
  stopImmediatePropagation() { secondaryStopped = true; }
});
assert.equal(secondaryPrevented, true);
assert.equal(secondaryStopped, true);
assert.equal(secondaryContext.activePetPointerId, 21);
assert.equal(secondaryContext.petStrokeDistance, 44, 'secondary contact must not reset accumulated progress');

assert.match(writingHtml, /const WRITING_CURSOR_KEY = 'mojikkoFarmWritingCursorV1';/);
const cursorSource = between(writingHtml, 'function saveWritingCursor(', 'function fitStage(');
const cursorStore = new Map();
const cursorWarnings = [];
const cursorContext = {
  writingCharacters: [
    { id: 'hiragana_3042', char: 'あ' },
    { id: 'hiragana_3044', char: 'い' },
    { id: 'katakana_30dd', char: 'ポ' }
  ],
  WRITING_CURSOR_KEY: 'mojikkoFarmWritingCursorV1',
  localStorage: {
    getItem(key) { return cursorStore.has(key) ? cursorStore.get(key) : null; },
    setItem(key, value) { cursorStore.set(key, value); }
  },
  window: { location: { search: '' } },
  URLSearchParams,
  console: { warn(...args) { cursorWarnings.push(args); } }
};
vm.createContext(cursorContext);
vm.runInContext(cursorSource, cursorContext, { filename: 'mojikko-writing-cursor.js' });
cursorContext.saveWritingCursor(1);
assert.deepEqual(JSON.parse(cursorStore.get(cursorContext.WRITING_CURSOR_KEY)), { characterId: 'hiragana_3044' });
assert.equal(cursorContext.getInitialWritingIndex(), 0, 'a direct visit must retain the familiar initial あ');
cursorContext.window.location.search = '?from=care';
assert.equal(cursorContext.getInitialWritingIndex(), 1, 'returning from care must resume the saved character');
cursorStore.set(cursorContext.WRITING_CURSOR_KEY, '{broken');
assert.equal(cursorContext.getInitialWritingIndex(), 0, 'broken cursor state must fall back safely');
cursorStore.set(cursorContext.WRITING_CURSOR_KEY, JSON.stringify({ characterId: 'unknown' }));
assert.equal(cursorContext.getInitialWritingIndex(), 0, 'unknown character ids must fall back safely');

function makeCompleteContext(currentIndex) {
  const calls = { cursor: [], completed: [], overlay: 0 };
  const characters = [
    { id: 'hiragana_3042', char: 'あ', group: 'hiragana', strokes: 1 },
    { id: 'katakana_30dd', char: 'ポ', group: 'katakana', strokes: 1 }
  ];
  const context = {
    calls,
    currentIndex,
    writingCharacters: characters,
    complete: false,
    completionQueued: false,
    writer: null,
    strokesCompleted: 1,
    currentStrokeIndex: 0,
    completedCharacters: new Set(),
    careState: { hatched: false },
    stars: 0,
    WRITING_STAR_REWARD: 10,
    writingBoard: { classList: { add() {} } },
    companionCard: { classList: { toggle() {} } },
    resultReward: { textContent: '' },
    resultRewardIcon: {},
    modalRetryBtn: { textContent: '' },
    starCountEl: { textContent: '' },
    resultOverlay: { classList: { add() { calls.overlay += 1; } } },
    getCurrentCharacter() { return characters[context.currentIndex]; },
    getWritingReadiness() { return { ready: true }; },
    playSfx() {},
    stopTrail() {},
    fillAllLetterPixels() {},
    renderPixelLetter() {},
    renderCanvasStrokeNumbers() {},
    saveWritingCursor(index) { calls.cursor.push(index); },
    renderStrokeOrder() {},
    updateCharacterButtons() {},
    setMessage() {},
    getCurrentWritingReward() { return { id: 'moji_cookie', name: 'もじクッキー' }; },
    setFoodIconClass() {},
    launchBurst() {},
    calculateAccuracy() { return 0.9; },
    onWritingComplete(result) { calls.completed.push(result); },
    setTimeout(fn) { fn(); return 1; }
  };
  vm.createContext(context);
  vm.runInContext(
    between(writingHtml, 'function completeWriting(', 'function onWritingComplete('),
    context,
    { filename: `mojikko-writing-complete-${currentIndex}.js` }
  );
  return context;
}

const firstComplete = makeCompleteContext(0);
firstComplete.completeWriting(false, { totalStrokes: 1 });
assert.deepEqual(firstComplete.calls.cursor, [1], 'completing あ must save the following character');
assert.equal(firstComplete.calls.completed.length, 1);

const lastComplete = makeCompleteContext(1);
lastComplete.completeWriting(false, { totalStrokes: 1 });
assert.deepEqual(lastComplete.calls.cursor, [0], 'the final character must wrap to あ');

assert.match(writingHtml, /currentIndex = getInitialWritingIndex\(\);\s*syncCurrentGroupFromCharacter\(\);\s*resetWriting\(\);/);

console.log('Mojikko care and resume regression: PASS');
