'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'writing-mori/index.html'), 'utf8');

let inlineCount = 0;
for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/\bsrc=/.test(match[1])) continue;
  inlineCount += 1;
  new vm.Script(match[2], { filename: `writing-mori-inline-${inlineCount}.js` });
}
assert.equal(inlineCount, 2, 'unexpected writing-mori inline script count');

function between(start, end) {
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `missing source range: ${start} -> ${end}`);
  return html.slice(startIndex, endIndex);
}

assert.match(html, /const VISIBLE_GUIDE_DISTANCE_TOLERANCE = 24;/);
assert.match(html, /const VISIBLE_GUIDE_MIN_FILL_RATIO = 0\.30;/);
assert.match(html, /const VISIBLE_GUIDE_MAX_START_PROGRESS = 0\.35;/);
assert.match(html, /const VISIBLE_GUIDE_MIN_END_PROGRESS = 0\.62;/);
assert.match(html, /const VISIBLE_GUIDE_MIN_PROGRESS_SPAN = 0\.45;/);
assert.match(html, /const VISIBLE_GUIDE_MAX_BACKTRACK = 0\.20;/);
assert.match(html, /const VISIBLE_GUIDE_CLOSED_ENDPOINT_TOLERANCE = 1;/);
assert.match(html, /showHintAfterMisses: 2,/);
assert.doesNotMatch(html, /markStrokeCorrectAfterMisses:/);
assert.doesNotMatch(html, /pendingCorrectStroke|STROKE_END_PROGRESS_REQUIRED|PENDING_CONTINUATION|STROKE_ASSIST/);

const transformContext = {
  currentWriterSize: 360,
  WRITER_PADDING: 48,
  writingBoard: { getBoundingClientRect() { return { width: 610 }; } },
  HanziWriter: {
    getScalingTransform(width, height, padding) {
      const scale = (Math.min(width, height) - padding * 2) / 1024;
      return { x: padding, y: padding + 124 * scale, scale };
    }
  }
};
vm.createContext(transformContext);
vm.runInContext(
  between('function getPixelLetterPadding(', 'function makeStrokeMask('),
  transformContext,
  { filename: 'mojikko-writing-shared-transform.js' }
);
vm.runInContext(
  between('function rawMedianPointToGrid(', 'async function prepareWriterCharData('),
  transformContext,
  { filename: 'mojikko-writing-median-transform.js' }
);
const pixelPadding = transformContext.getPixelLetterPadding();
assert.equal(pixelPadding, (48 / 360) * 1000, 'pixel guide padding must exactly mirror HanziWriter padding');
const gridTransform = transformContext.getHanziGridTransform(132, pixelPadding);
const mappedPoint = transformContext.rawMedianPointToGrid([240, 700], 132, pixelPadding);
assert.equal(mappedPoint.x, gridTransform.x + 240 * gridTransform.scale);
assert.equal(mappedPoint.y, 132 - gridTransform.y - 700 * gridTransform.scale);
const roundTrip = transformContext.guideGridPointToRawMedian(mappedPoint, 132, pixelPadding);
assert.ok(Math.abs(roundTrip[0] - 240) < 1e-9);
assert.ok(Math.abs(roundTrip[1] - 700) < 1e-9);

const maskSource = between('async function buildPixelLetterMask(', 'function renderPixelLetter(');
assert.match(maskSource, /const offsetX = 0;\s*const offsetY = 0;/, 'per-character recentering must stay disabled');
assert.match(maskSource, /mapMedianPoint = \(point\) => rawMedianPointToGrid\(point, gridSize, pixelPadding\)/);
assert.match(maskSource, /splitGuideMaskByNearestMedian\(guideMask, data\.medians, gridSize, mapMedianPoint\)/);
assert.match(maskSource, /updateWriterDisplayOffset\(writerOffsetX, writerOffsetY, gridSize\)/);
assert.match(
  between('function makeStrokeMask(', 'function countMaskCells('),
  /getHanziGridTransform\(gridSize, pixelPadding\)[\s\S]*?transform\.scale[\s\S]*?gridSize - transform\.y/,
  'stroke paths must use the same positioner transform as HanziWriter'
);

const decisionContext = {
  activeAttemptStroke: 0,
  activeAttemptPainted: true,
  activeAttemptStartProgress: 0.1,
  activeAttemptMaxProgress: 0.7,
  activeAttemptLastProgress: 0.68,
  VISIBLE_GUIDE_MIN_FILL_RATIO: 0.30,
  VISIBLE_GUIDE_MAX_START_PROGRESS: 0.35,
  VISIBLE_GUIDE_MIN_END_PROGRESS: 0.62,
  VISIBLE_GUIDE_MIN_PROGRESS_SPAN: 0.45,
  VISIBLE_GUIDE_MAX_BACKTRACK: 0.20,
  activeAttemptClosedStroke: false,
  fillRatio: 0.30,
};
decisionContext.getStrokeFilledRatio = () => decisionContext.fillRatio;
vm.createContext(decisionContext);
vm.runInContext(
  between('function canAcceptVisibleGuideStroke(', 'function updateAttemptProgressForPoint('),
  decisionContext,
  { filename: 'mojikko-writing-visible-guide-decision.js' }
);
assert.equal(decisionContext.canAcceptVisibleGuideStroke(0), true, 'a meaningful forward guide trace must pass');
decisionContext.activeAttemptStroke = 1;
assert.equal(decisionContext.canAcceptVisibleGuideStroke(0), false, 'a future stroke must not pass');
decisionContext.activeAttemptStroke = 0;
decisionContext.activeAttemptStartProgress = 0.9;
decisionContext.activeAttemptMaxProgress = 1;
decisionContext.activeAttemptLastProgress = 0.1;
assert.equal(decisionContext.canAcceptVisibleGuideStroke(0), false, 'a backwards stroke must not pass');
decisionContext.activeAttemptStartProgress = 0.1;
decisionContext.activeAttemptMaxProgress = 0.4;
decisionContext.activeAttemptLastProgress = 0.4;
assert.equal(decisionContext.canAcceptVisibleGuideStroke(0), false, 'small jitter must not pass');
decisionContext.activeAttemptMaxProgress = 0.7;
decisionContext.activeAttemptLastProgress = 0.4;
assert.equal(decisionContext.canAcceptVisibleGuideStroke(0), false, 'a large backwards finish must not pass');
decisionContext.activeAttemptLastProgress = 0.68;
decisionContext.fillRatio = 0.299;
assert.equal(decisionContext.canAcceptVisibleGuideStroke(0), false, 'a sparse off-guide trace must not pass');
decisionContext.fillRatio = 0.30;
decisionContext.activeAttemptPainted = false;
assert.equal(decisionContext.canAcceptVisibleGuideStroke(0), false, 'endpoint taps without painted guide input must not pass');

function makeClosedProgressContext(progressSamples) {
  const samples = [...progressSamples];
  const context = {
    complete: false,
    currentCharData: {
      medians: [[[100, 100], [200, 200], [100, 100]]]
    },
    strokesCompleted: 0,
    activeAttemptStroke: 0,
    activeAttemptPainted: true,
    activeAttemptStartProgress: null,
    activeAttemptMaxProgress: 0,
    activeAttemptLastProgress: 0,
    activeAttemptPreviousRawProgress: null,
    activeAttemptClosedStroke: true,
    VISIBLE_GUIDE_CLOSED_ENDPOINT_TOLERANCE: 1,
    VISIBLE_GUIDE_MIN_FILL_RATIO: 0.30,
    VISIBLE_GUIDE_MAX_START_PROGRESS: 0.35,
    VISIBLE_GUIDE_MIN_END_PROGRESS: 0.62,
    VISIBLE_GUIDE_MIN_PROGRESS_SPAN: 0.45,
    VISIBLE_GUIDE_MAX_BACKTRACK: 0.20,
    getCurrentCharacter() { return { strokes: 1 }; },
    getStrokeProgressAtBoardPoint() { return samples.shift(); },
    getStrokeFilledRatio() { return 0.5; },
  };
  vm.createContext(context);
  vm.runInContext(
    between('function isClosedStrokeMedian(', 'function fillStrokePixels('),
    context,
    { filename: 'mojikko-writing-closed-loop-progress.js' }
  );
  return context;
}

const closedForward = makeClosedProgressContext([0, 0.2, 0.4, 0.65, 0.85, 0]);
assert.equal(closedForward.isClosedStrokeMedian(0), true);
for (let i = 0; i < 6; i++) closedForward.updateAttemptProgressForPoint({});
assert.ok(closedForward.activeAttemptLastProgress > 0.99, 'a closed guide must unwrap across its 1-to-0 seam');
assert.equal(closedForward.canAcceptVisibleGuideStroke(0), true, 'a forward circular trace must pass');

const closedPartial = makeClosedProgressContext([0, 0.2, 0.4, 0.65]);
for (let i = 0; i < 4; i++) closedPartial.updateAttemptProgressForPoint({});
assert.equal(closedPartial.canAcceptVisibleGuideStroke(0), true, 'about two thirds of a circular guide must pass');

const closedReverse = makeClosedProgressContext([0, 0.8, 0.6, 0.4, 0.2, 0]);
for (let i = 0; i < 6; i++) closedReverse.updateAttemptProgressForPoint({});
assert.ok(closedReverse.activeAttemptLastProgress < -0.99, 'reverse circular motion must unwrap backwards');
assert.equal(closedReverse.canAcceptVisibleGuideStroke(0), false, 'a reversed circular trace must not pass');

function makePointerDownContext() {
  const calls = { clear: 0, render: 0 };
  return {
    calls,
    complete: false,
    trailDrawing: false,
    activeTrailPointerId: null,
    activeTrailTouchId: null,
    trailDistance: 99,
    sparkleBudget: 0,
    trailAttemptId: 0,
    currentStrokeIndex: 0,
    strokesCompleted: 0,
    activeAttemptStroke: -1,
    activeAttemptCompletedBefore: 0,
    activeAttemptPainted: false,
    activeAttemptHadMistake: false,
    activeAttemptMaxProgress: 0.8,
    activeAttemptStartProgress: 0.4,
    activeAttemptLastProgress: 0.8,
    lastTrailPoint: null,
    LETTER_BRUSH_RADIUS: 4,
    playSfx() {},
    getCurrentCharacter() { return { strokes: 3 }; },
    clearStrokePixels() { calls.clear += 1; return 1; },
    renderPixelLetter() { calls.render += 1; },
    isClosedStrokeMedian() { return false; },
    boardPointFromEvent() { return { x: 200, y: 300 }; },
    updateAttemptProgressForPoint() {},
    fillLetterPixelsAt() { return { activeTouched: 1, changed: 1, touched: 1 }; },
    setMessage() {},
    maybeUpdateProgressAfterFill() {},
  };
}

const pointerDownSource = between('function onTrailPointerDown(', 'function onTrailPointerMove(');
const pointerDownContext = makePointerDownContext();
vm.createContext(pointerDownContext);
vm.runInContext(pointerDownSource, pointerDownContext, { filename: 'mojikko-writing-pointerdown.js' });
pointerDownContext.onTrailPointerDown({ pointerType: 'touch', button: 0, pointerId: 7 });
assert.equal(pointerDownContext.calls.clear, 1, 'a fresh retry must clear its unaccepted stroke');
assert.equal(pointerDownContext.activeAttemptMaxProgress, 0, 'each contact must reset guide progress');
assert.equal(pointerDownContext.activeAttemptStartProgress, null);
assert.equal(pointerDownContext.activeTrailPointerId, 7, 'the first contact must own the trail');
let secondPointerPrevented = false;
let secondPointerStopped = false;
pointerDownContext.onTrailPointerDown({
  pointerType: 'touch',
  button: 0,
  pointerId: 8,
  preventDefault() { secondPointerPrevented = true; },
  stopImmediatePropagation() { secondPointerStopped = true; },
});
assert.equal(secondPointerPrevented, true);
assert.equal(secondPointerStopped, true);
assert.equal(pointerDownContext.activeTrailPointerId, 7, 'a second finger must not replace trail ownership');

function makeFinishContext(acceptVisible) {
  const calls = { accepted: [], clear: 0, messages: [], timers: [], start: [] };
  const context = {
    calls,
    trailDrawing: false,
    activeTrailPointerId: 11,
    activeTrailTouchId: null,
    lastTrailPoint: null,
    complete: false,
    trailAttemptId: 7,
    activeAttemptStroke: 0,
    activeAttemptCompletedBefore: 0,
    strokesCompleted: 0,
    activeAttemptPainted: true,
    activeAttemptHadMistake: false,
    activeAttemptMaxProgress: 0.7,
    activeAttemptStartProgress: 0.1,
    activeAttemptLastProgress: 0.68,
    trailDistance: 120,
    ATTEMPT_CLEAR_DELAY_MS: 520,
    writingBoard: { getBoundingClientRect() { return { left: 0, top: 0, right: 500, bottom: 500 }; } },
    boardPointFromEvent() { return { x: 0, y: 0 }; },
    paintTrailSegment() { return 0; },
    updateAttemptProgressForPoint() {},
    maybeUpdateProgressAfterFill() {},
    canAcceptVisibleGuideStroke() { return acceptVisible; },
    acceptCorrectStroke(data, resync) { calls.accepted.push({ data, resync }); },
    startWriterQuiz(index) { calls.start.push(index); },
    clearStrokePixels() { calls.clear += 1; return 1; },
    renderPixelLetter() {},
    setMessage(text, sub) { calls.messages.push([text, sub]); },
    setTimeout(fn, delay) { calls.timers.push({ fn, delay }); return calls.timers.length; },
  };
  context.stopTrail = () => {
    context.trailDrawing = false;
    context.lastTrailPoint = null;
    context.activeTrailPointerId = null;
    context.activeTrailTouchId = null;
  };
  return context;
}

const finishSource = between('function appendFinalTrailPoint(', 'function onCorrectStroke(');
const acceptedFinish = makeFinishContext(true);
vm.createContext(acceptedFinish);
vm.runInContext(finishSource, acceptedFinish, { filename: 'mojikko-writing-finish-visible.js' });
acceptedFinish.finishTrailAttempt({ type: 'pointerup', pointerId: 11, clientX: 0, clientY: 0 });
assert.equal(acceptedFinish.calls.accepted.length, 1);
assert.equal(acceptedFinish.calls.accepted[0].data.source, 'visible-guide');
assert.equal(acceptedFinish.calls.accepted[0].resync, true, 'local guide acceptance must resync HanziWriter');
assert.equal(acceptedFinish.calls.timers.length, 0, 'an accepted guide trace must not schedule clearing');

const cancelledFinish = makeFinishContext(true);
vm.createContext(cancelledFinish);
vm.runInContext(finishSource, cancelledFinish, { filename: 'mojikko-writing-finish-cancel.js' });
cancelledFinish.finishTrailAttempt({ type: 'pointercancel', pointerId: 11 });
assert.equal(cancelledFinish.calls.accepted.length, 0, 'pointercancel must never complete a stroke');
assert.deepEqual(cancelledFinish.calls.start, [0], 'pointercancel must resync the expected stroke');
cancelledFinish.calls.timers[0].fn();
assert.equal(cancelledFinish.calls.clear, 1, 'cancelled input must still clear after the grace period');

const foreignFinish = makeFinishContext(true);
vm.createContext(foreignFinish);
vm.runInContext(finishSource, foreignFinish, { filename: 'mojikko-writing-finish-foreign.js' });
foreignFinish.finishTrailAttempt({ type: 'pointerup', pointerId: 99 });
assert.equal(foreignFinish.calls.accepted.length, 0);
assert.equal(foreignFinish.calls.timers.length, 0);
assert.equal(foreignFinish.activeTrailPointerId, 11);

const correctSource = between('function onCorrectStroke(', 'function acceptCorrectStroke(');
const correctCalls = { accepted: [], clear: [], start: [], messages: [] };
const correctContext = {
  strokesCompleted: 0,
  activeAttemptHadMistake: false,
  getCurrentCharacter() { return { strokes: 3 }; },
  acceptCorrectStroke(data) { correctCalls.accepted.push(data); },
  clearStrokePixels(index) { correctCalls.clear.push(index); },
  renderPixelLetter() {},
  startWriterQuiz(index) { correctCalls.start.push(index); },
  setMessage(text, sub) { correctCalls.messages.push([text, sub]); },
};
vm.createContext(correctContext);
vm.runInContext(correctSource, correctContext, { filename: 'mojikko-writing-oncorrect.js' });
correctContext.onCorrectStroke({ strokeNum: 0 });
assert.equal(correctCalls.accepted.length, 1, 'HanziWriter-correct strokes must be accepted immediately');
correctContext.onCorrectStroke({ strokeNum: 1 });
assert.deepEqual(correctCalls.start, [0], 'a future-stroke callback must rewind to the expected stroke');
assert.equal(correctCalls.accepted.length, 1, 'a future stroke must not advance');

const touchGuardContext = { activeTrailTouchId: null, trailDrawing: false, Array };
vm.createContext(touchGuardContext);
vm.runInContext(
  between('function getChangedTouchIds(', 'function onTrailPointerDown('),
  touchGuardContext,
  { filename: 'mojikko-writing-touch-guards.js' }
);
function fakeTouchEvent(ids, cancelable = true) {
  const state = { prevented: false, stopped: false };
  return {
    state,
    cancelable,
    changedTouches: ids.map((identifier) => ({ identifier })),
    preventDefault() { state.prevented = true; },
    stopImmediatePropagation() { state.stopped = true; },
  };
}
touchGuardContext.guardWritingTouchStart(fakeTouchEvent([21]));
assert.equal(touchGuardContext.activeTrailTouchId, 21);
touchGuardContext.trailDrawing = true;
const secondTouchStart = fakeTouchEvent([22]);
touchGuardContext.guardWritingTouchStart(secondTouchStart);
assert.deepEqual(secondTouchStart.state, { prevented: true, stopped: true });
const secondTouchEnd = fakeTouchEvent([22]);
touchGuardContext.guardWritingTouchEnd(secondTouchEnd);
assert.deepEqual(secondTouchEnd.state, { prevented: true, stopped: true });
assert.equal(touchGuardContext.activeTrailTouchId, 21);
const firstTouchEnd = fakeTouchEvent([21]);
touchGuardContext.guardWritingTouchEnd(firstTouchEnd);
assert.equal(touchGuardContext.activeTrailTouchId, null);

assert.match(html, /if \(strokeNum !== expectedStroke\)/, 'expected-stroke order guard was removed');
assert.match(html, /bestDistanceSq <= maxDistanceSq \?[^:]+: null;/, 'off-guide points must stay outside the guide');
assert.match(html, /addEventListener\('touchstart', guardWritingTouchStart, \{ capture: true, passive: false \}\)/);
assert.match(html, /addEventListener\('touchend', guardWritingTouchEnd, \{ capture: true, passive: false \}\)/);
assert.match(html, /if \(resyncWriter\)[\s\S]*?startWriterQuiz\(strokesCompleted\)/, 'local guide acceptance must resync the writer');
assert.match(
  between('function acceptCorrectStroke(', 'function onMistake('),
  /activeAttemptPreviousRawProgress = null;\s*activeAttemptClosedStroke = false;/,
  'acceptance must reset closed-loop progress state'
);
assert.match(
  between('function onMistake(', 'function onWriterComplete('),
  /activeAttemptPreviousRawProgress = null;\s*activeAttemptClosedStroke = false;/,
  'a rejected inactive attempt must reset closed-loop progress state'
);

console.log('Mojikko writing judgment regression: PASS');
