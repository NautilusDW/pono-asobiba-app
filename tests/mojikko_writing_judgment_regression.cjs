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

assert.match(html, /const STROKE_END_PROGRESS_REQUIRED = 0\.72;/);
assert.match(html, /const PENDING_CONTINUATION_MIN_DISTANCE = 45;/);
assert.match(html, /const PENDING_CONTINUATION_MIN_FILL_RATIO = 0\.45;/);
assert.match(html, /const STROKE_ASSIST_AFTER_MISSES = 3;/);
assert.match(html, /const STROKE_ASSIST_MIN_DISTANCE = 45;/);
assert.match(html, /const STROKE_ASSIST_MIN_FILL_RATIO = 0\.5;/);
assert.match(html, /const STROKE_ASSIST_MIN_PROGRESS_SPAN = 0\.45;/);
assert.match(html, /const STROKE_ASSIST_MAX_BACKTRACK = 0\.12;/);
assert.match(html, /showHintAfterMisses: 2,/);
assert.doesNotMatch(html, /markStrokeCorrectAfterMisses:/);

function between(start, end) {
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `missing source range: ${start} -> ${end}`);
  return html.slice(startIndex, endIndex);
}

const decisionContext = {
  currentCharData: { medians: [[], []] },
  strokesCompleted: 0,
  activeAttemptMaxProgress: 0,
  pendingCorrectStroke: null,
  activeAttemptPainted: false,
  trailDistance: 0,
  STROKE_END_PROGRESS_REQUIRED: 0.72,
  PENDING_CONTINUATION_MIN_DISTANCE: 45,
  PENDING_CONTINUATION_MIN_FILL_RATIO: 0.45,
  STROKE_ASSIST_AFTER_MISSES: 3,
  STROKE_ASSIST_MIN_DISTANCE: 45,
  STROKE_ASSIST_MIN_FILL_RATIO: 0.5,
  STROKE_ASSIST_MIN_PROGRESS_SPAN: 0.45,
  STROKE_ASSIST_MAX_BACKTRACK: 0.12,
  activeAttemptStroke: 0,
  activeAttemptStartProgress: 0,
  activeAttemptLastProgress: 0.45,
  fillRatio: 0,
};
decisionContext.getStrokeFilledRatio = () => decisionContext.fillRatio;
vm.createContext(decisionContext);
vm.runInContext(
  between('function hasAttemptReachedStrokeEnd(', 'function updateAttemptProgressForPoint('),
  decisionContext,
  { filename: 'mojikko-writing-decisions.js' },
);

decisionContext.activeAttemptMaxProgress = 0.719;
assert.equal(decisionContext.hasAttemptReachedStrokeEnd(0), false, '71.9% must remain below the endpoint boundary');
decisionContext.activeAttemptMaxProgress = 0.72;
assert.equal(decisionContext.hasAttemptReachedStrokeEnd(0), true, '72% must meet the relaxed endpoint boundary');

decisionContext.pendingCorrectStroke = { strokeNum: 0, data: {} };
decisionContext.activeAttemptPainted = true;
decisionContext.trailDistance = 45;
decisionContext.fillRatio = 0.45;
assert.equal(decisionContext.canAcceptPendingContinuation(0), true, 'meaningful continuation must be accepted');
decisionContext.trailDistance = 0;
assert.equal(decisionContext.canAcceptPendingContinuation(0), false, 'an endpoint tap must not accept a pending stroke');
decisionContext.trailDistance = 45;
decisionContext.fillRatio = 0.449;
assert.equal(decisionContext.canAcceptPendingContinuation(0), false, 'sparse off-guide movement must not accept');
decisionContext.fillRatio = 0.45;
decisionContext.pendingCorrectStroke = { strokeNum: 1, data: {} };
assert.equal(decisionContext.canAcceptPendingContinuation(0), false, 'a future-stroke continuation must not advance');

decisionContext.pendingCorrectStroke = null;
decisionContext.fillRatio = 0.5;
decisionContext.activeAttemptMaxProgress = 0.72;
decisionContext.activeAttemptLastProgress = 0.72;
assert.equal(
  decisionContext.canAcceptGuidedStrokeAssist(0, { mistakesOnStroke: 3 }),
  true,
  'the third meaningful forward trace must provide a bounded escape hatch',
);
assert.equal(
  decisionContext.canAcceptGuidedStrokeAssist(0, { mistakesOnStroke: 2 }),
  false,
  'the guided assist must not activate before the third genuine miss',
);
decisionContext.activeAttemptStartProgress = 1;
decisionContext.activeAttemptLastProgress = 0;
assert.equal(
  decisionContext.canAcceptGuidedStrokeAssist(0, { mistakesOnStroke: 3 }),
  false,
  'a backwards stroke must not receive the guided assist',
);
decisionContext.activeAttemptStartProgress = 0.4;
decisionContext.activeAttemptLastProgress = 0.5;
assert.equal(
  decisionContext.canAcceptGuidedStrokeAssist(0, { mistakesOnStroke: 3 }),
  false,
  'small jitter must not receive the guided assist',
);
decisionContext.activeAttemptStartProgress = 1;
decisionContext.activeAttemptLastProgress = 0.5;
assert.equal(
  decisionContext.canAcceptGuidedStrokeAssist(0, { mistakesOnStroke: 3 }),
  false,
  'an off-guide touch followed by a backwards stroke must not receive the assist',
);
decisionContext.activeAttemptStartProgress = 0;
decisionContext.activeAttemptMaxProgress = 1;
decisionContext.activeAttemptLastProgress = 0.5;
assert.equal(
  decisionContext.canAcceptGuidedStrokeAssist(0, { mistakesOnStroke: 3 }),
  false,
  'crossing the guide forward and then tracing backwards must not receive the assist',
);

function makePointerDownContext(pending) {
  const calls = { start: [], clear: 0, render: 0 };
  return {
    calls,
    complete: false,
    trailDrawing: false,
    activeTrailPointerId: null,
    trailDistance: 99,
    sparkleBudget: 0,
    trailAttemptId: 0,
    currentStrokeIndex: 0,
    strokesCompleted: 0,
    pendingCorrectStroke: pending,
    activeAttemptStroke: -1,
    activeAttemptCompletedBefore: 0,
    activeAttemptPainted: false,
    activeAttemptHadMistake: false,
    activeAttemptMaxProgress: 0.6,
    activeAttemptStartProgress: 0.1,
    activeAttemptLastProgress: 0.6,
    lastTrailPoint: null,
    LETTER_BRUSH_RADIUS: 4,
    playSfx() {},
    getCurrentCharacter() { return { strokes: 3 }; },
    startWriterQuiz(index) { calls.start.push(index); },
    clearStrokePixels() { calls.clear += 1; return 1; },
    renderPixelLetter() { calls.render += 1; },
    boardPointFromEvent() { return { x: 200, y: 300 }; },
    updateAttemptProgressForPoint() {},
    fillLetterPixelsAt() { return { activeTouched: 1, changed: 1, touched: 1 }; },
    setMessage() {},
    maybeUpdateProgressAfterFill() {},
  };
}

const pointerDownSource = between('function onTrailPointerDown(', 'function onTrailPointerMove(');
const continuingContext = makePointerDownContext({ strokeNum: 0, data: { strokeNum: 0 } });
vm.createContext(continuingContext);
vm.runInContext(pointerDownSource, continuingContext, { filename: 'mojikko-writing-pointerdown-continuation.js' });
continuingContext.onTrailPointerDown({ pointerType: 'touch', button: 0, pointerId: 7 });
assert.deepEqual(continuingContext.calls.start, [0], 'continuation must rewind HanziWriter to the pending stroke');
assert.equal(continuingContext.calls.clear, 0, 'continuation must keep the visible partial stroke');
assert.equal(continuingContext.pendingCorrectStroke.strokeNum, 0, 'continuation must retain the Hanzi-approved pending stroke');
assert.equal(continuingContext.activeAttemptMaxProgress, 0.6, 'continuation must retain prior endpoint progress');
assert.equal(continuingContext.activeAttemptStartProgress, null, 'each contact must begin a fresh direction check');
assert.equal(continuingContext.activeAttemptLastProgress, 0, 'each contact must reset its last sampled progress');
assert.equal(continuingContext.activeTrailPointerId, 7, 'the first contact must own the trail');

const freshContext = makePointerDownContext(null);
vm.createContext(freshContext);
vm.runInContext(pointerDownSource, freshContext, { filename: 'mojikko-writing-pointerdown-fresh.js' });
freshContext.onTrailPointerDown({ pointerType: 'touch', button: 0, pointerId: 8 });
assert.equal(freshContext.calls.clear, 1, 'a fresh retry must still clear its own unaccepted stroke');
assert.equal(freshContext.activeAttemptMaxProgress, 0, 'a fresh retry must reset endpoint progress');

function makeFinishContext(pending) {
  const calls = { clear: 0, messages: [], timers: [], start: [] };
  const context = {
    calls,
    trailDrawing: false,
    activeTrailPointerId: 11,
    lastTrailPoint: null,
    complete: false,
    trailAttemptId: 7,
    activeAttemptStroke: 0,
    activeAttemptCompletedBefore: 0,
    strokesCompleted: 0,
    pendingCorrectStroke: pending,
    activeAttemptPainted: true,
    activeAttemptHadMistake: false,
    activeAttemptMaxProgress: 0.6,
    trailDistance: 120,
    ATTEMPT_CLEAR_DELAY_MS: 520,
    writingBoard: { getBoundingClientRect() { return { left: 0, top: 0, right: 500, bottom: 500 }; } },
    appendFinalTrailPoint: undefined,
    boardPointFromEvent() { return { x: 0, y: 0 }; },
    paintTrailSegment() { return 0; },
    updateAttemptProgressForPoint() {},
    maybeUpdateProgressAfterFill() {},
    canAcceptPendingContinuation() { return false; },
    acceptCorrectStroke() { throw new Error('unexpected continuation acceptance'); },
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
  };
  return context;
}

const finishSource = between('function appendFinalTrailPoint(', 'function onCorrectStroke(');
const pendingFinish = makeFinishContext({ strokeNum: 0, data: { strokeNum: 0 } });
vm.createContext(pendingFinish);
vm.runInContext(finishSource, pendingFinish, { filename: 'mojikko-writing-finish-pending.js' });
pendingFinish.finishTrailAttempt({ type: 'pointercancel', pointerId: 11 });
assert.equal(pendingFinish.calls.timers.length, 1);
assert.equal(pendingFinish.calls.timers[0].delay, 520);
assert.deepEqual(pendingFinish.calls.start, [0], 'pointercancel must resync HanziWriter to the expected stroke');
pendingFinish.calls.timers[0].fn();
assert.equal(pendingFinish.calls.clear, 0, 'a Hanzi-approved partial stroke must survive pointer release');
assert.equal(pendingFinish.pendingCorrectStroke.strokeNum, 0, 'pending stroke must remain available for the next touch');
assert.equal(pendingFinish.activeAttemptMaxProgress, 0.6, 'pending endpoint progress must survive the release');
assert.match(pendingFinish.calls.messages.at(-1)[0], /つづきから/);

const rejectedFinish = makeFinishContext(null);
vm.createContext(rejectedFinish);
vm.runInContext(finishSource, rejectedFinish, { filename: 'mojikko-writing-finish-rejected.js' });
rejectedFinish.finishTrailAttempt({ type: 'pointercancel', pointerId: 11 });
rejectedFinish.calls.timers[0].fn();
assert.equal(rejectedFinish.calls.clear, 1, 'a genuinely rejected attempt must still clear after the grace period');
assert.equal(rejectedFinish.activeAttemptMaxProgress, 0, 'a rejected attempt must reset endpoint progress');

const foreignPointerFinish = makeFinishContext(null);
vm.createContext(foreignPointerFinish);
vm.runInContext(finishSource, foreignPointerFinish, { filename: 'mojikko-writing-finish-foreign-pointer.js' });
foreignPointerFinish.finishTrailAttempt({ type: 'pointerup', pointerId: 99 });
assert.equal(foreignPointerFinish.calls.timers.length, 0, 'a second finger must not finish the active trail');
assert.equal(foreignPointerFinish.activeTrailPointerId, 11, 'a second finger must not steal trail ownership');

assert.match(html, /if \(strokeNum !== expectedStroke\)/, 'expected-stroke order guard was removed');
assert.match(html, /bestDistanceSq <= maxDistanceSq \?[^:]+: null;/, 'off-guide points must not become fake zero progress');
assert.match(html, /if \(strokeNum > expectedStroke\)[\s\S]*?startWriterQuiz\(expectedStroke\)/, 'future-stroke recovery was removed');
assert.match(html, /acceptCorrectStroke\(pendingCorrectStroke\.data, true\)/, 'pending continuation must request writer resync');
assert.match(html, /if \(resyncWriter\)[\s\S]*?startWriterQuiz\(strokesCompleted\)/, 'writer resync after local continuation is missing');
assert.match(
  html,
  /if \(canAcceptGuidedStrokeAssist\(strokeNum, data\)\)[\s\S]*?source: 'guided-assist'[\s\S]*?true\);/,
  'the bounded third-miss assist or its writer resync is missing',
);

console.log('Mojikko writing judgment regression: PASS');
