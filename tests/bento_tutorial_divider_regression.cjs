'use strict';

// batch:1262 regression: 操作数どおりのundo・葉っぱ青枠・仕切り角度のAdmin同期に加え、
// 小さいおかず工程から通常プレイ用の「したに しく」へ逸れないことを守る。
// batch:1267 regression: お気に入り保存/×のあとに最後の案内を一度だけ再生し、
// 空のお弁当を最初から作る通常フローへ戻ることを守る。
// batch:1268 regression: 全しきりを全おかずより前面に保ち、全37音声の再収録版を配信する。

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'bento/index.html'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'admin/index.html'), 'utf8');

function extract(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `${label}: start marker not found`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `${label}: end marker not found`);
  return source.slice(start, end);
}

// 1. すべての classic inline script が構文的に有効。
let scriptCount = 0;
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
  scriptCount++;
  new vm.Script(match[1], { filename: `bento-inline-${scriptCount}.js` });
}
assert.ok(scriptCount >= 10, 'expected bento inline scripts');
assert.doesNotMatch(html, /タップ/, 'child-facing Bento copy must consistently use タッチ');

// 2. のりは 移動→undo→縮小→時計回り→undo→OK の実操作でだけ進む。
const steps = extract(html, 'const TUT2_STEPS = [', 'function tut2FindStep', 'tutorial steps');
const moveAt = steps.indexOf("id: 'tut2-nori-move'");
const moveUndoAt = steps.indexOf("id: 'tut2-nori-move-undo'");
const editAt = steps.indexOf("id: 'tut2-nori-edit'");
const undoAt = steps.indexOf("id: 'tut2-nori-undo'");
const okAt = steps.indexOf("id: 'tut2-nori-ok'");
assert.ok(moveAt >= 0 && moveAt < moveUndoAt && moveUndoAt < editAt && editAt < undoAt && undoAt < okAt,
  'nori steps must be move -> move undo -> edit -> final undo -> OK');
assert.match(steps, /id: 'tut2-nori-move-undo', single: true[^\n]*tut2RenderNoriMoveUndo/);
assert.match(steps, /id: 'tut2-nori-edit', single: true[^\n]*tut2RenderNoriEdit/);
assert.match(steps, /id: 'tut2-nori-undo', single: true[^\n]*tut2RenderNoriUndo/);
assert.match(steps, /id: 'tut2-nori-ok', single: true[^\n]*tut2RenderNoriOk/);

const moveHook = extract(html, 'function tutorialOnItemMoved(uid)', 'function tutorialNoriEditExpectedCopy', 'nori move hook');
assert.match(moveHook, /noriEditTargetUid = uid/);
assert.match(moveHook, /noriEditStage = 'shrink'/);
assert.match(moveHook, /noriMoveTargetUid[\s\S]*?uid !== tutorialState\.noriMoveTargetUid/);
assert.match(moveHook, /tutorialStopVoiceQueueForImmediateAdvance\(\)/);
assert.match(moveHook, /tutorialAdvance\('tut2-nori-move-undo'\)/);
assert.doesNotMatch(moveHook, /tutorialAdvance\('tut2-nori-edit'\)/);

const editHooks = extract(html, 'function tutorialNoriEditExpectedCopy()', '// 位置移動は直後に1回', 'nori edit hooks');
const state = { active: true, step: 'tut2-nori-edit', noriEditStage: 'shrink', noriEditTargetUid: 'mouth' };
const advances = [];
const eventVoices = [];
let renders = 0;
const hookContext = vm.runInNewContext(`(() => {
  ${editHooks}
  return { canUse: tutorialCanUseNoriEditAction, onEdit: tutorialOnNoriEditAction };
})()`, {
  tutorialState: state,
  setSpeech: () => {},
  showToast: () => {},
  tutorialRenderStep: () => { renders++; },
  tutorialClearTrims: () => {},
  tutorialHideFinger: () => {},
  tutorialPlayEventVoiceOnce: (key, id) => { eventVoices.push([key, id]); },
  tutorialAdvance: (next) => { advances.push(next); },
});
assert.equal(hookContext.canUse('mouth', 'grow'), false, 'grow must not replace the guided shrink action');
renders = 0;
hookContext.onEdit('mouth', 'shrink');
assert.equal(state.noriEditStage, 'rotate-clockwise');
assert.deepEqual(eventVoices, [['nori-rotate', 'tut2_06a_rotate']]);
assert.equal(hookContext.canUse('mouth', 'rotate-counterclockwise'), false,
  'counterclockwise must not replace the guided clockwise action');
hookContext.onEdit('mouth', 'rotate-clockwise');
assert.deepEqual(advances, ['tut2-nori-undo']);
assert.equal(state.noriEditStage, 'done', 'completed scale + rotation pair must lock before final undo');
assert.equal(renders, 1, 'only the shrink action re-renders inside the edit step; rotation advances');

const rotate = extract(html, 'function rotateSelectedItem(deltaAngle)', 'function canShowLayerControlsForItem', 'rotate handler');
assert.ok(rotate.indexOf('renderFreeLayoutControls();') < rotate.indexOf('tutorialOnNoriEditAction(item.uid, tutorialAction)'),
  'rotate must render before attaching the next outline');
assert.match(rotate, /deltaAngle < 0 \? 'rotate-counterclockwise' : 'rotate-clockwise'/);
assert.match(rotate, /commitFreeHistoryChange\(historyBefore\)/,
  'clockwise rotation must keep its own undo entry');
const scale = extract(html, 'function scaleSelectedDecorItem(factor)', '// batch:1057: decor 編集パネル', 'scale handler');
assert.ok(scale.indexOf('renderFreeLayoutControls();') < scale.indexOf('tutorialOnNoriEditAction(item.uid, tutorialAction)'),
  'scale must render before attaching the next outline');
assert.match(scale, /commitFreeHistoryChange\(historyBefore\)/,
  'guided shrink must keep its own undo entry');
assert.doesNotMatch(html, /tutorialRememberNoriEditHistory|tutorialCollapseNoriEditHistory/,
  'scale and rotation history must never be coalesced');

const undo = extract(html, 'function tutorialOnUndoPressed()', 'function tutorialOnItemPlaced', 'nori undo hook');
assert.equal((undo.match(/undoFreeItem\(\)/g) || []).length, 3,
  'undo has normal, move-undo and final-undo branches');
assert.match(undo, /tutorialAdvance\('tut2-nori-edit'\)/);
assert.match(undo, /tutorialAdvance\('tut2-nori-ok'\)/);
assert.match(undo, /tut2FaceAtDefault/);
const moveUndoRenderer = extract(html, 'function tut2RenderNoriMoveUndo(step)', 'function tutorialFindNoriEditPlaced', 'move undo renderer');
assert.match(moveUndoRenderer, /いちど「とりけす」/);
const undoRenderer = extract(html, 'function tut2RenderNoriUndo(step)', 'function tut2RenderNoriOk', 'final undo renderer');
assert.match(undoRenderer, /「とりけす」を 2かい/);
assert.match(undoRenderer, /あと 1かい/);
assert.doesNotMatch(undoRenderer, /もどるまで/);
const undoState = {
  active: true,
  step: 'tut2-nori-move-undo',
  noriEditStage: 'shrink',
  _noriMoveUndoDone: false,
  _noriUndoDone: false,
  _noriUndoAckTimer: null,
  _noriEditUndoRemaining: 0,
};
let undoCalls = 0;
let finalUndoCalls = 0;
let undoSucceeds = true;
let faceAtDefault = false;
const undoAdvances = [];
const undoEventVoices = [];
const undoTimers = [];
const undoApi = vm.runInNewContext(`(() => {
  ${undo}
  return { press: tutorialOnUndoPressed, redoLength: () => freeRedoStack.length };
})()`, {
  tutorialState: undoState,
  tutorialNoriEditExpectedCopy: () => 'edit next',
  setSpeech: () => {},
  showToast: () => {},
  tutorialRenderStep: () => {},
  tut2FaceAtDefault: () => faceAtDefault,
  undoFreeItem: () => {
    undoCalls++;
    if (!undoSucceeds) return false;
    if (undoState.step === 'tut2-nori-move-undo') faceAtDefault = true;
    else {
      finalUndoCalls++;
      faceAtDefault = finalUndoCalls >= 2;
    }
    return true;
  },
  freeRedoStack: [{ stale: true }],
  tutorialClearTrims: () => {},
  tutorialHideFinger: () => {},
  tutorialPlayEventVoiceOnce: (key, id) => { undoEventVoices.push([key, id]); },
  tutorialAdvance: (step) => { undoAdvances.push(step); },
  setTimeout: (fn) => { undoTimers.push(fn); return undoTimers.length; },
});
undoApi.press();
assert.equal(undoCalls, 1, 'one undo must restore the moved position');
assert.equal(undoState._noriMoveUndoDone, true);
assert.equal(undoTimers.length, 1);
undoTimers.shift()();
assert.deepEqual(undoAdvances, ['tut2-nori-edit']);

undoState.step = 'tut2-nori-undo';
undoState._noriMoveUndoDone = false;
undoState._noriUndoDone = false;
undoState._noriUndoAckTimer = null;
undoState._noriEditUndoRemaining = 2;
faceAtDefault = false;
undoSucceeds = false;
undoApi.press();
assert.equal(undoState._noriEditUndoRemaining, 2, 'a failed undo must not consume a guided press');
assert.equal(undoState._noriUndoDone, false);
undoSucceeds = true;
undoApi.press();
assert.equal(finalUndoCalls, 1, 'the first final undo must restore rotation only');
assert.equal(undoState._noriEditUndoRemaining, 1);
assert.equal(undoState._noriUndoDone, false, 'one successful press must not finish two edits');
assert.equal(undoTimers.length, 0);
assert.deepEqual(undoEventVoices, [['nori-undo-last', 'tut2_06b_editundo_last']]);
undoApi.press();
assert.equal(finalUndoCalls, 2, 'the second final undo must restore the scale');
assert.equal(undoState._noriEditUndoRemaining, 0);
assert.equal(undoState._noriUndoDone, true);
assert.equal(undoTimers.length, 1);
undoApi.press();
assert.equal(finalUndoCalls, 2, 'completion guard must preserve face-part placement history');
assert.equal(undoApi.redoLength(), 0, 'guided edit redo history must be cleared after restoration');
undoTimers.shift()();
assert.deepEqual(undoAdvances, ['tut2-nori-edit', 'tut2-nori-ok']);

const voiceMap = extract(html, 'const BENTO_TUTORIAL_STEP_VOICE = {', 'let bentoTutorialVoiceAudio', 'tutorial voice map');
assert.match(html, /const BENTO_TUTORIAL_VOICE_VERSION = 'v1268-consistent-blocks'/,
  'the shipped narration must use the all-cue consistency cache version');
assert.match(html, /const BENTO_TUTORIAL_MOCK_VOICE = false/,
  'the shipped narration must play real audio instead of mock timers');
[
  ['tut2-nori-ok', 'tut2_06c_noriok'],
  ['tut2-free-okazu', 'tut2_10b_freeokazu'],
  ['tut2-leaf-tab', 'tut2_17a_leaf_tab'],
  ['tut2-divider-place', 'tut2_11b_dividers'],
  ['tut2-pick-tab', 'tut2_11c_pick_tab'],
  ['tut2-pick-place', 'tut2_11d_pick_place'],
  ['tut2-self-start', 'tut2_14b_make_own'],
].forEach(([stepId, voiceId]) => {
  assert.match(voiceMap, new RegExp("'" + stepId + "':\\s*'" + voiceId + "'"));
});

// 2b. お気に入りを保存してもしなくても、締めのナレーションを最後まで聞いてから
// 空のお弁当へ一度だけ移る。お気に入り保存は先に確定し、途中の close は遮断する。
const endingStepIds = [...steps.matchAll(/\bid:\s*'([^']+)'/g)].map(match => match[1]);
const favoriteStepAt = endingStepIds.indexOf('tut2-favorite');
assert.ok(favoriteStepAt >= 0, 'favorite step must remain in the tutorial');
assert.equal(endingStepIds[favoriteStepAt + 1], 'tut2-self-start',
  'the self-start narration must immediately follow favorite');
assert.match(steps, /id: 'tut2-self-start'[^\n]*onVoiceEnded:\s*tutorialFinishSelfStart/,
  'the final step must finish from the narration ended/fallback callback');

const requestSelfStartSource = extract(
  html,
  'function tutorialRequestSelfStart()',
  'function tutorialFinishSelfStart()',
  'favorite to self-start transition',
);
assert.match(requestSelfStartSource, /tutorialState\._selfStartRequested/,
  'the favorite transition must have an exact-once state guard');
assert.match(requestSelfStartSource, /if\s*\([^)]*_selfStartRequested[^)]*\)\s*return(?:\s+false)?\s*;/,
  'a second favorite/close signal must not request the final step again');
assert.equal((requestSelfStartSource.match(/tutorialAdvance\('tut2-self-start'\)/g) || []).length, 1,
  'the guarded helper must contain one final-step advance');

const requestState = { active: true, step: 'tut2-favorite', _selfStartRequested: false };
const requestedSteps = [];
const requestSelfStart = vm.runInNewContext(`(() => {
  ${requestSelfStartSource}
  return tutorialRequestSelfStart;
})()`, {
  tutorialState: requestState,
  tutorialAdvance: step => requestedSteps.push(step),
});
requestSelfStart();
requestSelfStart();
assert.deepEqual(requestedSteps, ['tut2-self-start'],
  'favorite save and close races must still advance exactly once');

const favoriteSaveSource = extract(
  html,
  '    saveBtn.onclick = () => {',
  '  const detailBtn = document.getElementById(\'complete-detail-btn\');',
  'favorite save handler',
);
const saveFavoriteAt = favoriteSaveSource.indexOf('saveFavorite(snapshot)');
const favSavedAt = favoriteSaveSource.indexOf('favSaved = true');
const playPopAt = favoriteSaveSource.indexOf('playPop()');
const requestAfterSaveAt = favoriteSaveSource.indexOf('tutorialRequestSelfStart()');
assert.ok(saveFavoriteAt >= 0 && saveFavoriteAt < favSavedAt && favSavedAt < playPopAt && playPopAt < requestAfterSaveAt,
  'favorite save must persist, update its guard, and play feedback before leaving the step');
assert.equal((favoriteSaveSource.match(/tutorialRequestSelfStart\(\)/g) || []).length, 1,
  'the favorite save handler must request the final step once');

const favoriteRendererSource = extract(
  html,
  'function tut2RenderFavorite(step)',
  'function tut2RenderSelfStart(step)',
  'favorite renderer',
);
assert.doesNotMatch(favoriteRendererSource, /pointerdown|tutorialMarkDone/,
  'favorite rendering must not install early pointerdown completion hooks');
assert.match(favoriteRendererSource, /if\s*\(saveBtn\s*&&\s*favSaved\)[\s\S]*tutorialRequestSelfStart\(\)/,
  'an early star save during the completion animation must still continue after favorite audio');

const finishSelfStartSource = extract(
  html,
  'function tutorialFinishSelfStart()',
  'function tutorialStartOwnBentoAfterComplete()',
  'self-start narration completion',
);
assert.match(finishSelfStartSource, /tutorialState\._finishToSimpleStarted\s*=\s*true/,
  'the final narration callback must unlock its programmatic close');
assert.match(finishSelfStartSource, /getElementById\('complete-btn'\)/);
assert.match(finishSelfStartSource, /\.click\(\)/,
  'the final narration callback must programmatically continue');
assert.match(finishSelfStartSource, /hideBentoAcornModal\(\)/,
  'the no-autohide acorn modal must not cover the fresh own-Bento round');

const finishState = { active: true, step: 'tut2-self-start', _finishToSimpleStarted: false };
let programmaticCloseCount = 0;
const finishSelfStart = vm.runInNewContext(`(() => {
  ${finishSelfStartSource}
  return tutorialFinishSelfStart;
})()`, {
  tutorialState: finishState,
  document: { getElementById: id => id === 'complete-btn' ? { click: () => { programmaticCloseCount++; } } : null },
});
assert.equal(finishSelfStart(), true);
assert.equal(finishSelfStart(), false);
assert.equal(programmaticCloseCount, 1, 'ended and fallback races must close the exemplar once');

const ownBentoContinuationSource = extract(
  html,
  'function tutorialStartOwnBentoAfterComplete()',
  '// v1497 tutorial-autostart:',
  'own Bento continuation',
);
assert.match(ownBentoContinuationSource, /tutorialState\._selfStartConsumed/,
  'the new-round continuation must be idempotent');
assert.match(ownBentoContinuationSource, /tutorialMarkDone\(\)/,
  'the exemplar tutorial must be persisted as complete');
assert.match(ownBentoContinuationSource, /window\.__bentoTutorialPendingMode\s*=\s*null/,
  'the tutorial pending mode must be cleared before the own Bento begins');
assert.equal((ownBentoContinuationSource.match(/restartSimpleBentoRound\(\)/g) || []).length, 1,
  'the own-Bento continuation must restart simple mode exactly once');

const ownState = { active: true, _finishToSimpleStarted: true, _selfStartConsumed: false };
const ownWindow = { __bentoTutorialPendingMode: 'simple' };
let markDoneCount = 0;
let restartSimpleCount = 0;
const startOwnBento = vm.runInNewContext(`(() => {
  ${ownBentoContinuationSource}
  return tutorialStartOwnBentoAfterComplete;
})()`, {
  tutorialState: ownState,
  window: ownWindow,
  tutorialMarkDone: () => { markDoneCount++; },
  restartSimpleBentoRound: () => { restartSimpleCount++; },
});
assert.equal(startOwnBento(), true);
assert.equal(startOwnBento(), false);
assert.equal(markDoneCount, 1);
assert.equal(restartSimpleCount, 1);
assert.equal(ownWindow.__bentoTutorialPendingMode, null);

const completeCloseSource = extract(
  html,
  "  document.getElementById('complete-btn').onclick = () => {",
  '  // NPC 依頼者モード時は、 完成画面の前に「お弁当を渡す」演出を挟む。',
  'completion close handler',
);
assert.match(html, /let tutorialSelfStartCloseCommitted\s*=\s*false;\s*document\.getElementById\('complete-btn'\)\.onclick/,
  'each completion screen must get a fresh exact-once close guard');
assert.match(completeCloseSource, /tut2-complete[^\n]*tut2-w3-deliver[^\n]*return/,
  '× must not skip the completion voice before the favorite step appears');
assert.match(completeCloseSource, /tut2-favorite[\s\S]*tutorialRequestSelfStart\(\)[\s\S]*return/,
  '× on favorite must request the final narration instead of closing');
assert.match(completeCloseSource, /tut2-self-start[\s\S]*!tutorialState\._finishToSimpleStarted[\s\S]*return/,
  'manual close must not cut off the final narration');
assert.match(completeCloseSource, /tutorialSelfStartCloseCommitted[^\n]*return[\s\S]*tutorialSelfStartCloseCommitted\s*=\s*true/,
  'the final programmatic close and a simultaneous child close must commit atomically once');
assert.match(completeCloseSource, /finishingTutorialToOwn[\s\S]*tutorialMarkDone\(\)/,
  'the committed final close must tear down inactivity and observers before an async sticker');
assert.match(completeCloseSource, /if\s*\(!finishingTutorialToOwn\)[\s\S]*PonoRating\.maybeShowAfterClear/,
  'the tutorial-to-own transition must suppress the rating popup');

const closeState = {
  active: true,
  step: 'tut2-self-start',
  _finishToSimpleStarted: true,
};
const closeNodes = {
  'complete-btn': {},
  'complete-pono-slot': { classList: { remove: () => {} } },
  'complete-right': { classList: { remove: () => {} } },
  'complete-overlay': { classList: { add: () => {} } },
};
let closeMarkDoneCount = 0;
let stickerGrantCount = 0;
let stickerOnClose = null;
let continuationCount = 0;
const committedClose = vm.runInNewContext(`(() => {
  let tutorialSelfStartCloseCommitted = false;
  ${completeCloseSource}
  return document.getElementById('complete-btn').onclick;
})()`, {
  tutorialState: closeState,
  tutorialRequestSelfStart: () => {},
  tutorialShouldGrantPendingSticker: () => true,
  tutorialMarkDone: () => { closeMarkDoneCount++; closeState.active = false; closeState.step = 'done'; },
  tutorialGrantPendingStickerAfterClose: callback => { stickerGrantCount++; stickerOnClose = callback; },
  continueAfterCompleteClose: () => { continuationCount++; },
  clearRevealTimers: () => {},
  tutorialClearCompleteGuideTimers: () => {},
  syncCompleteChromeSafeArea: () => {},
  document: { getElementById: id => closeNodes[id] || null },
  window: {},
  setTimeout: () => { throw new Error('rating must be suppressed'); },
});
committedClose();
committedClose();
assert.equal(closeMarkDoneCount, 1);
assert.equal(stickerGrantCount, 1, 'double close must not start two sticker grants');
assert.equal(continuationCount, 0);
assert.equal(typeof stickerOnClose, 'function');
stickerOnClose();
assert.equal(continuationCount, 1, 'the sticker callback must continue once after the committed close');

const completionContinuationSource = extract(
  html,
  '  const continueAfterCompleteClose = () => {',
  "  document.getElementById('complete-btn').onclick = () => {",
  'post-completion continuation',
);
assert.match(completionContinuationSource, /tutorialStartOwnBentoAfterComplete\(\)/,
  'the close continuation must enter the fresh own-Bento round');

const stickerEligibilitySource = extract(
  html,
  'function tutorialShouldGrantPendingSticker()',
  'function tutorialGrantPendingStickerAfterClose',
  'tutorial sticker eligibility',
);
assert.match(stickerEligibilitySource,
  /completeDetailShown[\s\S]*\|\|[\s\S]*tutorialState\._finishToSimpleStarted/,
  'finishing the exemplar without opening detail must still grant its pending sticker');
const advanceSource = extract(html, 'function tutorialAdvance(nextStep)', 'function tutorialUninstallPaletteObserver', 'voice-safe advance');
assert.match(advanceSource, /audioDuration - \(audio\.currentTime \|\| 0\)/,
  'queued tutorial advance must use remaining narration duration');
assert.match(advanceSource, /Math\.ceil\(remainingMs \/ 500\) \* 500/,
  'narration guard must round the safety timeout up');

const groupIntroSource = extract(
  html,
  'function tutorialShowGroupIntroThen(nextStep)',
  'function tutorialOutlineElement',
  'greet to color-guide narration boundary',
);
const groupIntroState = {
  groupIntroShown: false,
  active: true,
  step: 'tut2-greet',
  _groupIntroVoiceWait: false,
  inactivityTimer: 42,
};
const voiceListeners = {};
const greetAudio = {
  paused: false,
  ended: false,
  duration: 4.8,
  currentTime: 0.4,
  addEventListener: (type, fn) => { voiceListeners[type] = fn; },
  removeEventListener: (type, fn) => {
    if (voiceListeners[type] === fn) delete voiceListeners[type];
  },
};
let colorGuideStarts = 0;
let colorGuideShows = 0;
let colorGuideClick = null;
const introEl = { classList: { remove: () => { colorGuideShows++; } } };
const introButton = { addEventListener: (type, fn) => { if (type === 'click') colorGuideClick = fn; } };
const waitTimers = [];
const clearedIntroTimers = [];
const groupIntroApi = vm.runInNewContext(`(() => {
  ${groupIntroSource}
  return { show: tutorialShowGroupIntroThen };
})()`, {
  tutorialState: groupIntroState,
  bentoTutorialVoiceAudio: greetAudio,
  document: { getElementById: id => id === 'sk-intro' ? introEl : id === 'sk-intro-btn' ? introButton : null },
  tutorialAdvance: () => {},
  tutorialHideBubble: () => {},
  tutorialHideFinger: () => {},
  tutorialClearTrims: () => {},
  tutorialClearMask: () => {},
  tutorialClearTargetCircle: () => {},
  tutorialClearOutlines: () => {},
  tutorialHidePonoCallout: () => {},
  startSkIntroGuide: () => { colorGuideStarts++; },
  setTimeout: fn => { waitTimers.push(fn); return waitTimers.length; },
  clearTimeout: id => { clearedIntroTimers.push(id); },
  window: {},
});
groupIntroApi.show('tut2-box');
assert.equal(groupIntroState._groupIntroVoiceWait, true,
  'an early start touch must wait for the greeting narration');
assert.equal(colorGuideStarts, 0, 'the color guide must not cut off the greeting narration');
assert.equal(typeof voiceListeners.ended, 'function', 'the greeting must install an ended listener');
greetAudio.ended = true;
voiceListeners.ended();
assert.equal(colorGuideStarts, 1, 'the color guide must start once after the greeting ends');
assert.equal(colorGuideShows, 1);
assert.equal(groupIntroState.groupIntroShown, true);
assert.deepEqual(clearedIntroTimers, [42], 'opening the color guide must stop the greet inactivity retry');
assert.equal(groupIntroState.inactivityTimer, 0);
assert.equal(typeof colorGuideClick, 'function');
assert.match(html, /btn\.disabled = true;\s*btn\.textContent = 'きいてね…';\s*tutorialShowGroupIntroThen\('tut2-box'\)/,
  'the pressed start button must show a child-readable waiting state');

const colorGuideGuardSource = extract(
  html,
  'function tutorialIsColorGuideBlocking()',
  'function tutorialRenderStep()',
  'color guide visibility guard',
);
const renderGuardHead = extract(
  html,
  'function tutorialRenderStep() {',
  '  tutorialDismissFreeGuideBlocker();',
  'color guide render guard',
);
const visibleColorGuide = { classList: { contains: () => false } };
const guardState = { active: true, step: 'tut2-greet' };
const guardCalls = [];
let portraitChecks = 0;
const colorGuideGuardApi = vm.runInNewContext(`(() => {
  ${colorGuideGuardSource}
  ${renderGuardHead}
  }
  return { blocks: tutorialIsColorGuideBlocking, render: tutorialRenderStep };
})()`, {
  tutorialState: guardState,
  document: { getElementById: id => id === 'sk-intro' ? visibleColorGuide : null },
  tutorialHideBubble: () => guardCalls.push('bubble'),
  tutorialHideFinger: () => guardCalls.push('finger'),
  tutorialClearTrims: () => guardCalls.push('trims'),
  tutorialClearMask: () => guardCalls.push('mask'),
  tutorialClearTargetCircle: () => guardCalls.push('target'),
  tutorialClearOutlines: () => guardCalls.push('outlines'),
  tutorialHidePonoCallout: () => guardCalls.push('callout'),
  tutorialHidePointingHand: () => guardCalls.push('hand'),
  tutorialIsPortraitBlocking: () => { portraitChecks++; return false; },
  tutorialShowBubble: () => guardCalls.push('portrait-bubble'),
});
assert.equal(colorGuideGuardApi.blocks(), true);
colorGuideGuardApi.render();
assert.deepEqual(guardCalls, ['bubble', 'finger', 'trims', 'mask', 'target', 'outlines', 'callout', 'hand'],
  'inactivity/resize renders must only clean tutorial chrome while the color guide is visible');
assert.equal(portraitChecks, 0, 'the color guide guard must run before any competing tutorial renderer');

const shippedVoiceIds = [
  'tut2_01_greet',
  'sk_intro_01', 'sk_intro_02', 'sk_intro_03', 'sk_intro_04', 'sk_intro_05',
  'tut2_02_box', 'tut2_03_rice', 'tut2_04a_eyes', 'tut2_04a_eyes_again',
  'tut2_04b_mouth_nose', 'tut2_04c_mouth',
  'tut2_05_norimove', 'tut2_05b_moveundo', 'tut2_06_noriedit', 'tut2_06a_rotate',
  'tut2_06b_editundo', 'tut2_06b_editundo_last', 'tut2_06c_noriok',
  'tut2_07_okazu', 'tut2_08_cupbtn', 'tut2_09_cup', 'tut2_10_cupfood',
  'tut2_10b_freeokazu', 'tut2_17a_leaf_tab', 'tut2_17_leafpick',
  'tut2_18_leafplace', 'tut2_11_tabs', 'tut2_11b_dividers',
  'tut2_11c_pick_tab', 'tut2_11d_pick_place', 'tut2_12_okazuok',
  'tut2_13_complete', 'tut2_14_fav', 'tut2_14b_make_own',
  'tut2_15_request', 'tut2_16_deliver',
];
assert.equal(new Set(shippedVoiceIds).size, 37, 'all shipped voice ids must be unique');
for (const voiceId of shippedVoiceIds) {
  const audioPath = path.join(root, 'assets/audio/bento/tutorial', `${voiceId}.mp3`);
  assert.ok(fs.existsSync(audioPath), `missing narration asset: ${voiceId}.mp3`);
  assert.ok(fs.statSync(audioPath).size > 1000, `narration asset is unexpectedly small: ${voiceId}.mp3`);
}

// 3. simple mode でも指定中の品目だけを許可し、誤選択はspeech/toastだけで拒否する。
const allowanceSource = extract(
  html,
  'function getTutorialPaletteAllowance(def)',
  'function unlockTutorialPaletteButton(btn)',
  'tutorial palette and tab allowance'
);
assert.doesNotMatch(allowanceSource, /simpleBentoMode\) return ok/,
  'simple tutorial mode must not bypass exact-item locks');
const gateState = {
  active: true,
  step: 'tut2-nori-face-eyes',
  noriQueue: ['nori_eye_round', 'nori_eye_round'],
  noriIdx: 0,
  leafTargetName: 'ハンバーグ',
};
let requiredMainSampleId = '';
const gateMessages = [];
const gates = vm.runInNewContext(`(() => {
  ${allowanceSource}
  return {
    allowance: getTutorialPaletteAllowance,
    show: showTutorialPaletteLockToast,
    tab: getTutorialTabAllowance,
  };
})()`, {
  tutorialState: gateState,
  getOkazuRole: def => def.okazuRole || 'main',
  tutorialGetNextMainOkazuSampleId: () => requiredMainSampleId,
  getSimpleSlotSampleIdForDef: def => def.simpleSampleId || '',
  setSpeech: message => gateMessages.push(['speech', message]),
  showToast: message => gateMessages.push(['toast', message]),
});
const eyeDef = { id: 'nori_eye_round', type: 'decor' };
const mouthDef = { id: 'nori_mouth_smile', type: 'decor' };
assert.equal(gates.allowance(eyeDef).allowed, true);
assert.equal(gates.allowance(mouthDef).allowed, false);
assert.match(gates.allowance(mouthDef).message, /それは ちがうよ。おめめに タッチしてね/);
assert.equal(gates.show(mouthDef), false);
assert.deepEqual(gateMessages.map(entry => entry[0]).sort(), ['speech', 'toast']);
gateState.step = 'tut2-nori-face-mouth-nose';
gateState.noriQueue = ['nori_nose_bear', 'nori_mouth_smile'];
gateState.noriIdx = 0;
assert.equal(gates.allowance({ id: 'nori_nose_bear', type: 'decor' }).allowed, true);
assert.equal(gates.allowance(mouthDef).allowed, false);
gateState.noriIdx = 1;
assert.equal(gates.allowance(mouthDef).allowed, true);
gateState.step = 'tut2-nori-move';
assert.equal(gates.allowance(eyeDef).allowed, false, 'move step must reject every new palette item');
gateState.step = 'tut2-okazu-main';
requiredMainSampleId = 'hamburger';
assert.equal(gates.allowance({ type: 'food', okazuRole: 'main', simpleSampleId: 'hamburger' }).allowed, true);
assert.equal(gates.allowance({ type: 'food', okazuRole: 'main', simpleSampleId: 'tako_wiener' }).allowed, false);
assert.match(gates.allowance({ type: 'food', okazuRole: 'main', simpleSampleId: 'tako_wiener' }).message,
  /それは ちがうよ。ハンバーグに タッチしてね/);
requiredMainSampleId = '';
gateState.step = 'tut2-leaf-tab';
assert.equal(gates.tab('leaf').allowed, true);
assert.equal(gates.tab('divider').allowed, false);
assert.match(gates.tab('divider').message, /それは ちがうよ。「はっぱ」に タッチしてね/);
gateState.step = 'tut2-cup-place';
assert.equal(gates.tab('accessory').allowed, true);
assert.equal(gates.tab('leaf').allowed, false, 'cup placement must not switch away from the cup tab');
gateState.step = 'tut2-free-okazu';
assert.equal(gates.tab('accessory').allowed, true);
assert.equal(gates.tab('pick').allowed, false, 'four-small-food step must stay on the cup tab');
gateState.step = 'tut2-leaf-place';
assert.equal(gates.tab('leaf').allowed, false, 're-touching the leaf tab must not clear the armed lettuce');
assert.match(gates.tab('leaf').message, /ハンバーグの うえに タッチしてね/);

const paletteFocusSource = extract(
  html,
  'function tutorialApplyPaletteFocus(predicate)',
  'function tutorialGetPaletteSampleId(btn)',
  'palette focus semantics'
);
assert.match(paletteFocusSource, /getTutorialPaletteAllowance\(btn\._freePaletteDef\)\.allowed/,
  'visual focus must defer real locks to the central allowance');
assert.match(html, /btn\._freePaletteDef = def/,
  'palette buttons must retain their source definition for allowance rechecks');
const simplePalettePlacement = extract(
  html,
  'function addSimpleFreePaletteItem(def)',
  'function armSimpleLeafForStageTap(def)',
  'simple palette placement guards'
);
assert.match(simplePalettePlacement, /mains\.length >= 1 && !hasHamburger[\s\S]*?それは ちがうよ。ハンバーグに タッチしてね/);

const moveAllowanceSource = extract(html, 'function canMoveFreeItemInCurrentTutorial(item)', 'function beginFreeItemDrag', 'tutorial move allowance');
const moveGateState = { active: true, step: 'tut2-nori-move', noriMoveTargetUid: 'eye-1', noriEditTargetUid: 'eye-1' };
const canMove = vm.runInNewContext(`(() => { ${moveAllowanceSource}; return canMoveFreeItemInCurrentTutorial; })()`, {
  tutorialState: moveGateState,
  placedItems: [{ uid: 'eye-1', type: 'decor' }, { uid: 'eye-2', type: 'decor' }],
  simpleBentoMode: true,
});
assert.equal(canMove({ uid: 'eye-1', type: 'decor' }), true);
assert.equal(canMove({ uid: 'eye-2', type: 'decor' }), false);
assert.equal(canMove({ uid: 'rice-1', type: 'rice' }), false);
moveGateState.step = 'tut2-nori-move-undo';
assert.equal(canMove({ uid: 'eye-1', type: 'decor' }), false);
moveGateState.step = 'tut2-nori-edit';
assert.equal(canMove({ uid: 'eye-1', type: 'decor' }), true,
  'the selected edit target must remain operable through its buttons');
assert.equal(canMove({ uid: 'eye-2', type: 'decor' }), false);

// 4. 小さいおかずは4個を数え、三色の短い再案内後にだけ葉っぱへ進む。
const requiredCounts = extract(
  html,
  'function getRequiredOkazuCountsForTier(tier)',
  '// v1490: tier のおかず充足状況',
  'required okazu counts'
);
assert.doesNotMatch(requiredCounts, /tutorialState[\s\S]*?side\s*=\s*1/,
  'tutorial must not lower the side-food requirement to one');
const freeOkazuRenderer = extract(html, 'function tut2RenderFreeOkazu(step)', 'function tut2RenderTabsIntro', 'free okazu renderer');
assert.match(freeOkazuRenderer, /tutorialCountSideFoodItems\(\)/);
assert.match(freeOkazuRenderer, /tutorialRequiredSideFoodCount\(\)/);
assert.doesNotMatch(freeOkazuRenderer, /tutorialCountFoodItems\(\)\s*>=\s*4/);
assert.match(html, /'tut2-cup-food': 'あか・きいろ・みどりの バランスを かんがえて えらぼう！'/);
assert.match(html, /'tut2-free-okazu': 'ちいさい おかずを 4つ いれよう！'/);
const cupCloseHook = extract(html, 'function tutorialOnCupEditorClosed()', '// legacy layer-edit callback', 'cup close tutorial hook');
assert.match(cupCloseHook, /tutorialAdvance\('tut2-free-okazu'\)/,
  'closing the first filled cup must join the four-small-food step');
assert.doesNotMatch(cupCloseHook, /tutorialAdvance\('tut2-leaf-tab'\)/,
  'closing the first filled cup must not bypass the four-small-food step');

const itemPlacementHook = extract(html, 'function tutorialOnItemPlaced(item)', 'function tutorialOnLeafPickerOpened', 'tutorial item placement hook');
const cupPlacementFlow = extract(itemPlacementHook, '// Step 9: cup placed', '// batch:1058-hotfix5 (WP2): はっぱ指定制', 'cup placement flow');
assert.match(cupPlacementFlow, /tut2-cup-place[\s\S]*?setTimeout\([\s\S]*?tutorialAdvance\('tut2-cup-food'\)/,
  'cup-food guidance must wait until the cup editor is open');
const cupFoodBranch = cupPlacementFlow.slice(cupPlacementFlow.indexOf('// Step 10:'));
assert.doesNotMatch(cupFoodBranch, /tutorialAdvance\('tut2-free-okazu'\)/,
  'the first cup food must wait for the editor to close before advancing');
assert.match(cupCloseHook, /tutorialState\.step === 'tut2-free-okazu'[\s\S]*?tutorialRenderStep\(\)/,
  'each later cup close must restore the color/remaining guide and cup target');
const sideState = {
  active: true,
  step: 'tut2-free-okazu',
  ricePlacedCount: 0,
  cupPlacedCount: 0,
  cupChildCount: 0,
  okazuPlacedCount: 0,
  decorPlacedCount: 0,
  _freeOkazuTimer: null,
  _freeOkazuDoneTimer: null,
};
let sideCount = 3;
const sideTimers = [];
const sideAdvances = [];
let sideRenders = 0;
const sideHook = vm.runInNewContext(`(() => { ${itemPlacementHook}; return tutorialOnItemPlaced; })()`, {
  tutorialState: sideState,
  tutorialCountSideFoodItems: () => sideCount,
  tutorialRequiredSideFoodCount: () => 4,
  tutorialResetInactivity: () => {},
  tutorialStopVoiceQueueForImmediateAdvance: () => {},
  tutorialAdvance: next => { sideAdvances.push(next); },
  tutorialRenderStep: () => { sideRenders++; },
  setSpeech: () => {},
  setTimeout: fn => { sideTimers.push(fn); return sideTimers.length; },
  clearTimeout: () => {},
});
sideHook({ type: 'food', parentCupId: 'cup-a' });
assert.equal(sideTimers.length, 0, 'three small foods must remain on the same step');
assert.deepEqual(sideAdvances, []);
sideCount = 4;
sideHook({ type: 'food', parentCupId: 'cup-b' });
assert.equal(sideTimers.length, 1, 'the fourth small food schedules the leaf transition once');
sideCount = 3;
sideTimers[0]();
assert.deepEqual(sideAdvances, [], 'undoing during the acknowledgment must cancel the leaf transition');
assert.equal(sideRenders, 1, 'a stale fourth-food timer must re-render the remaining-count guide');
sideCount = 4;
sideHook({ type: 'food', parentCupId: 'cup-c' });
assert.equal(sideTimers.length, 2);
sideTimers[1]();
assert.deepEqual(sideAdvances, ['tut2-leaf-tab']);

// 小さいおかず工程では配置済みメインを選べず、通常プレイ用の葉っぱ編集を開けない。
// 正規の leaf-place では内部 target だけ維持し、編集パネルは再表示しない。
const okazuEditGuardSource = extract(
  html,
  'function tutorialAllowsSimpleMainOkazuEditTarget()',
  'function getSimpleOkazuEditTarget()',
  'main okazu tutorial edit guards'
);
const okazuEditState = { active: false, step: '' };
const mainOkazu = { uid: 'hamburger-1', type: 'food', okazuRole: 'main' };
const okazuEditGuards = vm.runInNewContext(`(() => {
  ${okazuEditGuardSource}
  return {
    target: () => isSimpleMainOkazuEditTarget(mainOkazu),
    picker: tutorialAllowsSimpleMainOkazuEditPicker,
    panel: tutorialAllowsSimpleMainOkazuEditPanel,
  };
})()`, {
  tutorialState: okazuEditState,
  mainOkazu,
  simpleBentoMode: true,
  getOkazuRole: item => item.okazuRole,
  isOkazuGuideStep: () => true,
  freeMaskEditorMode: false,
  getEditingCup: () => null,
});
assert.equal(okazuEditGuards.target(), true, 'normal play keeps the main-food leaf editor');
assert.equal(okazuEditGuards.picker(), true);
assert.equal(okazuEditGuards.panel(), true);
okazuEditState.active = true;
for (const step of ['tut2-okazu-main', 'tut2-cup-food', 'tut2-free-okazu', 'tut2-leaf-tab', 'tut2-divider-place']) {
  okazuEditState.step = step;
  assert.equal(okazuEditGuards.target(), false, `${step} must not expose a leaf edit target`);
  assert.equal(okazuEditGuards.picker(), false, `${step} must not open the leaf picker`);
  assert.equal(okazuEditGuards.panel(), false, `${step} must not render the normal-play edit strip`);
}
okazuEditState.step = 'tut2-leaf-pick';
assert.equal(okazuEditGuards.target(), true, 'the guided lettuce picker keeps its seeded hamburger target');
assert.equal(okazuEditGuards.picker(), true, 'the guided lettuce picker remains available');
assert.equal(okazuEditGuards.panel(), false, 'the guided picker opens directly without the normal-play edit strip');
okazuEditState.step = 'tut2-leaf-place';
assert.equal(okazuEditGuards.target(), true, 'armed lettuce placement still resolves its hamburger target');
assert.equal(okazuEditGuards.picker(), false, 'lettuce placement must not reopen the edit panel');
assert.equal(okazuEditGuards.panel(), false);

const okazuToggle = extract(html, 'function toggleSimpleOkazuEditPicker(mode)', '// [おかずを かえる]', 'okazu picker toggle');
assert.match(okazuToggle, /if \(!tutorialAllowsSimpleMainOkazuEditPicker\(\)\) return;/,
  'a stale leaf button must be harmless after the tutorial step changes');
const toolbarSource = extract(html, 'function createFreeContextToolbar(opts = {})', 'function createFreeMainGuideTapLayer()', 'context toolbar');
assert.match(toolbarSource, /tutorialAllowsSimpleMainOkazuEditPanel\(\)[\s\S]*?isSimpleMainOkazuEditTarget\(item\)/,
  'the normal-play leaf action must never render during the tutorial');

const simpleSelectionSource = extract(
  html,
  'function canSelectFreeItemInCurrentMode(item)',
  'function clearSimpleSelectionIfBlockedByMode()',
  'simple selection guard'
);
const selectionState = { active: true, step: 'tut2-free-okazu' };
const selectionMessages = [];
const selectionGate = vm.runInNewContext(`(() => {
  ${simpleSelectionSource}
  return { canSelect: canSelectFreeItemInCurrentMode, show: showSimpleModeSelectionMessage };
})()`, {
  tutorialState: selectionState,
  simpleBentoMode: true,
  getOkazuRole: item => item.okazuRole,
  isSimpleDividerEditMode: () => false,
  isSimplePickEditMode: () => false,
  tutorialFreeOkazuProgressCopy: () => 'ちいさい おかずを あと 2こ いれてね！',
  setSpeech: message => selectionMessages.push(['speech', message]),
  showToast: message => selectionMessages.push(['toast', message]),
});
assert.equal(selectionGate.canSelect(mainOkazu), false, 'placed hamburger is not selectable during small-food guidance');
selectionGate.show(mainOkazu);
assert.deepEqual(selectionMessages, [
  ['speech', 'それは ちがうよ。ちいさい おかずを あと 2こ いれてね！'],
  ['toast', 'それは ちがうよ。ちいさい おかずを あと 2こ いれてね！'],
]);
assert.equal(selectionGate.canSelect({ type: 'food', okazuRole: 'side', parentCupId: 'cup-1' }), true,
  'cup food stays selectable in the same step');

// 5. 葉っぱはハンバーグ本体のタッチだけを受け、外れではarmed状態を維持して再案内する。
const leafTargetHelpers = extract(
  html,
  'function tutorialLeafTargetName()',
  'function tutorialFindFirstPaletteItemOfType(type)',
  'leaf target helpers'
);
const leafState = { active: true, step: 'tut2-leaf-place', leafTargetUid: 'hamburger-1', leafTargetName: 'ハンバーグ' };
const leafMessages = [];
let leafRenders = 0;
const leafHelpers = vm.runInNewContext(`(() => {
  ${leafTargetHelpers}
  return { hit: tutorialLeafTapHitsTarget, remind: tutorialRemindLeafTargetTap };
})()`, {
  tutorialState: leafState,
  tutorialFindPlacedElementForItem: ({ uid }) => uid === 'hamburger-1' ? {
    getBoundingClientRect: () => ({ left: 100, right: 200, top: 50, bottom: 150, width: 100, height: 100 }),
  } : null,
  setSpeech: message => { leafMessages.push(message); },
  showToast: message => { leafMessages.push(message); },
  tutorialRenderStep: () => { leafRenders++; },
});
assert.equal(leafHelpers.hit({ clientX: 40, clientY: 40 }), false, 'empty bento area must not place the leaf');
assert.equal(leafHelpers.hit({ clientX: 150, clientY: 100 }), true, 'hamburger center must place the leaf');
leafHelpers.remind();
assert.ok(leafMessages.every(message => message === 'それは ちがうよ。ハンバーグの うえに タッチしてね！'));
assert.equal(leafRenders, 0, 'wrong tap must keep the existing target ring without restarting its render');
const stageRenderer = extract(html, 'function renderFreeLayoutInto(host, opts = {})', 'function renderFreeLayoutStage(opts = {})', 'free stage renderer');
const leafGateAt = stageRenderer.indexOf('!tutorialLeafTapHitsTarget(e)');
const leafClearAt = stageRenderer.indexOf('clearSimpleLeafArmedState();', leafGateAt);
assert.ok(leafGateAt >= 0 && leafGateAt < leafClearAt,
  'wrong target must be rejected before the armed leaf state is cleared');
assert.match(stageRenderer, /tutorialRemindLeafTargetTap\(\);[\s\S]*?return;/);
const leafArm = extract(html, 'function armSimpleLeafForStageTap(def)', 'function placeSimpleLeafUnderOkazu(def)', 'leaf arm');
assert.match(leafArm, /renderFreeLayoutStage\(\{ immediate: true \}\);/,
  'armed leaf DOM must commit immediately so the first hamburger tap reaches the stage handler');
assert.match(leafArm, /simpleOkazuEditPickerMode = null;[\s\S]*?simpleOkazuEditPickerUid = null;/,
  'the picker must close after the correct lettuce so only the hamburger remains actionable');
const leafPicker = extract(html, 'function createSimpleOkazuEditPicker(item, leaf)', 'function renderSimpleOkazuEditPickerTray', 'leaf picker lock');
assert.match(leafPicker, /tut2-leaf-pick' \|\| tutorialState\.step === 'tut2-leaf-place'/);
assert.match(leafPicker, /setAttribute\('aria-disabled', 'true'\)/);
assert.match(leafPicker, /それは ちがうよ。レタスに タッチしてね！/);
const leafVisibility = extract(html, 'function isTutorialLeafTargetMainOkazu(item)', 'function shouldHideItemForSimpleLeafEdit', 'leaf target visibility');
assert.match(leafVisibility, /'tut2-leaf-pick', 'tut2-leaf-place'/);
assert.match(leafVisibility, /item\.uid === tutorialState\.leafTargetUid/,
  'only the required hamburger must stay fully visible during the target tap');
const leafTabRenderer = extract(html, 'function tut2RenderLeafTab(step)', 'function tut2EnsureLeafTabView', 'leaf tab circle');
assert.match(leafTabRenderer, /tutorialEnsureSingleTarget\(leafTab, \{ radius: 14, outline: true/,
  'the whole leaf button must receive a persistent blue outline');
assert.doesNotMatch(leafTabRenderer, /tutorialClearTrims\(\)/,
  'refreshing the leaf step must not recreate its trim ring');
const leafPickRenderer = extract(html, 'function tut2RenderLeafPick(step)', 'function tut2RenderLeafPlace', 'lettuce circle');
assert.match(leafPickRenderer, /tutorialEnsureSingleTarget\(choice, \{ radius: 14, outline: true/,
  'the whole lettuce choice must receive a persistent blue outline');
assert.doesNotMatch(leafPickRenderer, /tutorialClearTrims\(\)/,
  'refreshing the lettuce step must not recreate its trim ring');
const leafPlaceRenderer = extract(html, 'function tut2RenderLeafPlace(step)', 'function tut2RenderFreeOkazu', 'hamburger glow');
assert.match(leafPlaceRenderer, /tutorialEnsureSingleTarget\(target, \{ radius: 24, outline: true/,
  'the hamburger must receive the same visible focus treatment');
assert.doesNotMatch(leafPlaceRenderer, /tutorialClearTrims\(\)/,
  'refreshing the hamburger step must not recreate its trim ring');

const focusCss = extract(html, '.tut-focus-overlay {', '/* v3: drop target circle', 'persistent focus CSS');
assert.match(focusCss, /z-index: 9996/);
assert.match(focusCss, /\.tut-trim-box\.is-ready rect[\s\S]*?stroke-dashoffset: 0[\s\S]*?opacity: 1/);
assert.match(focusCss, /drop-shadow\(0 0 6px rgba\(30,127,216,0\.95\)\)/);
assert.match(html, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.tut-trim-box\.is-ready rect[\s\S]*?opacity: 1/);
assert.match(html, /\.tut-bubble--v3 \{[\s\S]*?z-index: 9997/,
  'instruction bubbles must remain above the focus overlay');
assert.match(html, /\.tut-bubble--center \{[\s\S]*?z-index: 9997/);
const focusLayerSource = extract(html, 'function tutorialEnsureLayer()', 'function tutorialHideFinger()', 'focus overlay root');
assert.match(focusLayerSource, /id = 'tut-focus-overlay'/);
const trimSource = extract(html, 'function tutorialTrimPath(targetEl, opts = {})', 'function tutorialClearTrims()', 'stable trim implementation');
assert.match(trimSource, /tutorialState\.focusOverlayEl \|\| document\.body/,
  'trim nodes must live below the observer-safe overlay root');
assert.match(trimSource, /function tutorialEnsureSingleTarget/);

// 6. 葉っぱ→しきりタブ→しきり全枠→ピックタブ→ピック配置→OK を実操作で進む。
const leafPlaceAt = steps.indexOf("id: 'tut2-leaf-place'");
const dividerTabAt = steps.indexOf("id: 'tut2-tabs-intro'");
const dividerPlaceAt = steps.indexOf("id: 'tut2-divider-place'");
const pickTabAt = steps.indexOf("id: 'tut2-pick-tab'");
const pickPlaceAt = steps.indexOf("id: 'tut2-pick-place'");
const finalOkAt = steps.indexOf("id: 'tut2-okazu-ok'");
assert.ok(leafPlaceAt < dividerTabAt && dividerTabAt < dividerPlaceAt
  && dividerPlaceAt < pickTabAt && pickTabAt < pickPlaceAt && pickPlaceAt < finalOkAt,
  'leaf, divider, pick and OK steps must stay in the guided order');
const tabSwitchHook = extract(html, 'function tutorialOnTabSwitch(tabId)', '// batch:1058 phase1: tut2 見本', 'tutorial tab switch hook');
assert.match(tabSwitchHook, /s === 'tut2-tabs-intro' && tabId === 'divider'[\s\S]*?advance\('tut2-divider-place'\)/);
assert.match(tabSwitchHook, /s === 'tut2-pick-tab' && tabId === 'pick'[\s\S]*?advance\('tut2-pick-place'\)/);
assert.doesNotMatch(tabSwitchHook, /s === 'tut2-tabs-intro'[\s\S]{0,120}?advance\('tut2-okazu-ok'\)/);
const tabsIntroRenderer = extract(html, 'function tut2RenderTabsIntro(step)', 'function tut2RenderDividerPlace(step)', 'divider tab renderer');
assert.doesNotMatch(tabsIntroRenderer, /_tabsChainTimer|tut2-okazu-ok/,
  'divider introduction must not auto-skip to OK');
assert.match(itemPlacementHook, /step === 'tut2-divider-place' && item\.type === 'divider'[\s\S]*?tutorialDividerSlotProgress\(\)/);
assert.match(itemPlacementHook, /latest\.filled >= latest\.total[\s\S]*?tutorialAdvance\('tut2-pick-tab'\)/,
  'divider placement may advance only after a recheck confirms every fixed slot');
assert.match(itemPlacementHook, /step === 'tut2-pick-place' && item\.type === 'pick'[\s\S]*?tutorialAdvance\('tut2-okazu-ok'\)/);

const dividerProgressSource = extract(
  html,
  'function tutorialDividerSlotProgress()',
  'function tutorialFindPlacedElementForItem',
  'divider fixed-slot progress'
);
const dividerSlots = Array.from({ length: 7 }, (_, index) => ({ index, filled: index < 6 }));
const dividerProgress = vm.runInNewContext(`(() => {
  ${dividerProgressSource}
  return tutorialDividerSlotProgress;
})()`, {
  getSimpleActiveDividerPaletteDef: () => ({ id: 'divider_wave', type: 'divider' }),
  bentoAccessories: [],
  getGuideTierForStep: () => 1,
  getSimpleFixedSlots: () => dividerSlots,
  getSimpleSlotBlockingItem: slot => slot.filled ? { type: 'divider', slotIndex: slot.index } : null,
  SIMPLE_SLOT_LAYOUT_LIMITS: { divider: 7 },
});
assert.deepEqual({ ...dividerProgress() }, { filled: 6, total: 7 },
  'six fixed slots must remain incomplete even if unrelated dividers exist elsewhere');
dividerSlots[6].filled = true;
assert.deepEqual({ ...dividerProgress() }, { filled: 7, total: 7 });

const dividerState = {
  active: true,
  step: 'tut2-divider-place',
  ricePlacedCount: 0,
  cupPlacedCount: 0,
  cupChildCount: 0,
  okazuPlacedCount: 0,
  decorPlacedCount: 0,
  _dividerDoneTimer: null,
};
let dividerFilled = 6;
let dividerRenders = 0;
const dividerTimers = [];
const dividerAdvances = [];
const dividerPlacement = vm.runInNewContext(`(() => { ${itemPlacementHook}; return tutorialOnItemPlaced; })()`, {
  tutorialState: dividerState,
  tutorialDividerSlotProgress: () => ({ filled: dividerFilled, total: 7 }),
  tutorialResetInactivity: () => {},
  tutorialStopVoiceQueueForImmediateAdvance: () => {},
  tutorialAdvance: next => { dividerAdvances.push(next); },
  tutorialRenderStep: () => { dividerRenders++; },
  setSpeech: () => {},
  setTimeout: (fn, delay) => { dividerTimers.push({ fn, delay }); return dividerTimers.length; },
  clearTimeout: () => {},
});
dividerPlacement({ type: 'divider' });
assert.equal(dividerTimers.length, 1);
assert.equal(dividerTimers[0].delay, 0, 'an incomplete divider set only refreshes the same guide');
dividerTimers.shift().fn();
assert.equal(dividerRenders, 1);
assert.deepEqual(dividerAdvances, []);
dividerFilled = 7;
dividerPlacement({ type: 'divider' });
assert.equal(dividerTimers.length, 1);
assert.equal(dividerTimers[0].delay, 600, 'the seventh fixed divider gets a short completion beat');
dividerTimers.shift().fn();
assert.deepEqual(dividerAdvances, ['tut2-pick-tab']);

// 7. 青枠はscroll安定後に1回だけ開始し、Phase A→Bやobserver更新で作り直さない。
assert.match(html, /\.tut-trim-box rect \{[\s\S]*?animation: none;/);
assert.match(html, /\.tut-trim-box rect \{[\s\S]*?stroke-dashoffset: 0;[\s\S]*?opacity: 0;/,
  'pre-ready trim stays hidden while retaining the complete line geometry');
assert.match(html, /\.tut-trim-box\.is-ready rect \{[\s\S]*?opacity: 1;[\s\S]*?tutTrimBlink/);
const trim = extract(html, 'function tutorialTrimPath(targetEl, opts = {})', 'function tutorialMarkTarget', 'trim lifecycle');
assert.ok(trim.indexOf('sync();') < trim.indexOf('(tutorialState.focusOverlayEl || document.body).appendChild(wrap)'),
  'trim geometry must be set before DOM connection');
assert.doesNotMatch(trim, /document\.body\.appendChild\(wrap\)/,
  'trim mutations must stay below the body-level MutationObserver');
assert.match(trim, /requestAnimationFrame\([\s\S]*?classList\.add\('is-ready'\)/);

const dispatcher = extract(html, 'function tutorialRenderStep()', '// .free-tab ボタンを ラベル', 'tutorial dispatcher');
const phaseCallback = extract(dispatcher, 'tutorialSetPhaseATimer', '} else {', 'phase transition');
assert.doesNotMatch(phaseCallback, /renderedStep\s*=\s*null/,
  'Phase A -> B must preserve the same trim node');

const noriPhase = extract(html, 'function tut2RenderNoriPhaseA(step)', 'function tut2RenderNoriMovePhaseA', 'nori palette phases');
assert.match(noriPhase, /_tutorialWaitForPaletteStable|tutorialScrollThenTap/);
assert.doesNotMatch(noriPhase, /tut2AnchorToPaletteIfVisible\(noriPaletteRef\)/,
  'nori must not draw a ring before scroll settles');
assert.match(noriPhase, /_noriBeatActive/);
const placement = extract(html, 'function tutorialOnItemPlaced(item)', '// Step 7:', 'nori placement beat');
assert.match(placement, /_noriBeatActive = true[\s\S]*?tutorialCancelPaletteScrollGuidance\(\)/);
assert.match(placement, /tutorialQueueNoriSubroundVoice\('nori-eye-again', 'tut2_04a_eyes_again', currentStep, 1\)/);
assert.match(placement, /tutorialQueueNoriSubroundVoice\('nori-mouth', 'tut2_04c_mouth', currentStep, 1\)/);
assert.match(html, /もう いっかい おめめを タッチしよう！/);
assert.match(html, /つぎは おくちを タッチしてね！/);

const faceState = {
  active: true,
  step: 'tut2-nori-face-eyes',
  noriQueue: ['nori_eye_round', 'nori_eye_round'],
  noriIdx: 0,
  ricePlacedCount: 0,
  cupPlacedCount: 0,
  cupChildCount: 0,
  okazuPlacedCount: 0,
  decorPlacedCount: 0,
  _noriBeatActive: false,
  _noriBeatTimer: null,
};
const faceTimers = [];
const queuedFaceVoices = [];
const facePlacement = vm.runInNewContext(`(() => { ${itemPlacementHook}; return tutorialOnItemPlaced; })()`, {
  tutorialState: faceState,
  tutorialCancelPaletteScrollGuidance: () => {},
  tutorialClearGhostLayer: () => {},
  tutorialClearPaletteFocus: () => {},
  tutorialClearTrims: () => {},
  tutorialHideFinger: () => {},
  setSpeech: () => {},
  clearTimeout: () => {},
  setTimeout: fn => { faceTimers.push(fn); return faceTimers.length; },
  tut2ApplyNoriSubroundSpeech: () => {},
  tutorialRenderStep: () => {},
  tutorialQueueNoriSubroundVoice: (...args) => queuedFaceVoices.push(args),
  tutorialAdvance: () => {},
  tutorialResetInactivity: () => {},
});
facePlacement({ type: 'decor', id: 'nori_eye_round' });
assert.equal(faceTimers.length, 1);
faceTimers.shift()();
assert.deepEqual(queuedFaceVoices.shift(), [
  'nori-eye-again', 'tut2_04a_eyes_again', 'tut2-nori-face-eyes', 1,
]);
faceState.step = 'tut2-nori-face-mouth-nose';
faceState.noriQueue = ['nori_nose_bear', 'nori_mouth_smile'];
faceState.noriIdx = 0;
facePlacement({ type: 'decor', id: 'nori_nose_bear' });
assert.equal(faceTimers.length, 1);
faceTimers.shift()();
assert.deepEqual(queuedFaceVoices.shift(), [
  'nori-mouth', 'tut2_04c_mouth', 'tut2-nori-face-mouth-nose', 1,
]);

const queuedVoiceSource = extract(
  html,
  'function tutorialQueueNoriSubroundVoice(eventKey, voiceId, expectedStep, expectedIdx)',
  '// v1497 cup-first: tutorialMarkCupOkAfterVoice',
  'queued face narration',
);
const queuedVoiceState = {
  active: true,
  step: 'tut2-nori-face-eyes',
  noriIdx: 1,
  _queuedEventVoiceKeys: Object.create(null),
};
const queuedVoiceListeners = {};
const currentFaceVoice = {
  paused: false,
  ended: false,
  duration: 6.8,
  currentTime: 3,
  addEventListener: (type, fn) => { queuedVoiceListeners[type] = fn; },
  removeEventListener: (type, fn) => {
    if (queuedVoiceListeners[type] === fn) delete queuedVoiceListeners[type];
  },
};
const queuedVoiceTimers = [];
const playedFaceVoices = [];
const queuedVoiceContext = {
  tutorialState: queuedVoiceState,
  bentoTutorialVoiceAudio: currentFaceVoice,
  tutorialPlayEventVoiceOnce: (...args) => playedFaceVoices.push(args),
  setTimeout: fn => { queuedVoiceTimers.push(fn); return queuedVoiceTimers.length; },
  clearTimeout: () => {},
};
const queuedVoiceApi = vm.runInNewContext(`(() => {
  ${queuedVoiceSource}
  return tutorialQueueNoriSubroundVoice;
})()`, queuedVoiceContext);
queuedVoiceApi('nori-eye-again', 'tut2_04a_eyes_again', 'tut2-nori-face-eyes', 1);
assert.deepEqual(playedFaceVoices, [], 'the second-eye cue must not cut off the current step narration');
assert.equal(typeof queuedVoiceListeners.ended, 'function');
queuedVoiceListeners.ended();
assert.deepEqual(playedFaceVoices, [['nori-eye-again', 'tut2_04a_eyes_again', 6500]]);
queuedVoiceApi('nori-eye-again', 'tut2_04a_eyes_again', 'tut2-nori-face-eyes', 1);
assert.equal(playedFaceVoices.length, 1, 'the same face cue must be queued only once');

const staleListeners = {};
queuedVoiceContext.bentoTutorialVoiceAudio = {
  paused: false,
  ended: false,
  duration: 5,
  currentTime: 1,
  addEventListener: (type, fn) => { staleListeners[type] = fn; },
  removeEventListener: () => {},
};
queuedVoiceState.step = 'tut2-nori-face-mouth-nose';
queuedVoiceState.noriIdx = 1;
queuedVoiceApi('nori-mouth', 'tut2_04c_mouth', 'tut2-nori-face-mouth-nose', 1);
queuedVoiceState.noriIdx = 2;
staleListeners.ended();
assert.equal(playedFaceVoices.length, 1,
  'a queued mouth cue must be discarded when the child already touched the mouth');

const scroll = extract(html, 'function _tutorialPaletteScrollParents(el)', 'function tutorialScheduleResync()', 'palette scroll lifecycle');
assert.match(scroll, /\.free-item-list/);
assert.match(scroll, /\.food-tray\.free-layout-controls/,
  'visibility must include the outer tray, not just the inner list');
assert.match(scroll, /_tutorialWaitForPaletteStable/);
assert.match(scroll, /_paletteSmoothScrollRaf/);
assert.match(scroll, /_paletteSettledRaf/);
assert.match(scroll, /_noriBeatActive/,
  'late settled/stable callbacks must not restart a ring during the placement beat');
const innerScroller = {
  scrollTop: 0,
  scrollHeight: 400,
  clientHeight: 100,
  getBoundingClientRect: () => ({ top: 80, bottom: 180, left: 0, right: 200 }),
};
const outerScroller = {
  scrollTop: 0,
  scrollHeight: 300,
  clientHeight: 140,
  getBoundingClientRect: () => ({ top: 0, bottom: 140, left: 0, right: 200 }),
};
const nestedTarget = {
  isConnected: true,
  closest: (selector) => selector === '.free-item-list' ? innerScroller : outerScroller,
  getBoundingClientRect: () => ({ top: 190, bottom: 230, left: 20, right: 120, width: 100, height: 40 }),
};
const scrollHelpers = extract(html, 'function _tutorialPaletteScrollParents(el)', '// 内外2つのスクロール領域', 'palette scroll plan');
const nestedPlan = vm.runInNewContext(`${scrollHelpers}; _tutorialPaletteScrollPlan(target);`, {
  target: nestedTarget,
});
assert.equal(nestedPlan.length, 2, 'both nested scroll containers must be settled before drawing');
assert.equal(nestedPlan[0].parent, innerScroller);
assert.equal(nestedPlan[1].parent, outerScroller);

// 8. 管理エディターの divider[0..6] = A..G を、座標・向きを変えず同じindex順で使う。
const adminDefs = extract(admin, "{ kind: 'divider', index: 0", "{ kind: 'other', index: 0", 'admin divider defs');
for (let index = 0; index < 7; index++) {
  assert.match(adminDefs, new RegExp(`kind: 'divider', index: ${index}, label: '仕切り${String.fromCharCode(65 + index)}'`));
}

const orderSource = extract(html, 'function orderSimpleSlotsForDef(def, slots)', 'function getSimpleMainSlotAnchorPoint', 'divider order');
const ordered = vm.runInNewContext(`${orderSource}; orderSimpleSlotsForDef({ type: 'divider' }, slots);`, {
  getSimpleSlotKind: () => 'divider',
  slots: [5, 2, 6, 0, 4, 1, 3].map(index => ({ index, key: `divider:1:${index}` })),
});
assert.deepEqual(Array.from(ordered, slot => slot.index), [0, 1, 2, 3, 4, 5, 6]);
assert.doesNotMatch(orderSource, /wantsVertical|compareSimpleSlotFrontLeftOrder/,
  'runtime must not reorder A-G by orientation or screen position');

const fixedSlotsSource = extract(html, 'function getSimpleFixedSlots(def, tier', 'function getSimpleSlotItem', 'fixed slots');
const points = Array.from({ length: 7 }, (_, index) => ({
  x: 100 + index * 11,
  y: 80 + index * 17,
  sampleId: index < 3 ? `divider_wave_vertical_${['back', 'mid', 'front'][index]}` : 'divider_wave',
}));
const resolved = [];
const fixedContext = {
  getSelectedBentoBox: () => ({ id: 'box' }),
  getSimpleSlotKind: () => 'divider',
  getSimpleDecorSlots: () => [],
  getSimpleFoodSlots: () => [],
  getSimplePickSlots: () => [],
  getSimpleSlotLayoutPoints: () => points,
  getSimpleLeafDividerSpreadPoints: () => [],
  getSimpleMappedReferenceSlotPoint: () => null,
  getSimpleDividerDefForSlot: (def, slot) => {
    resolved.push({ stage: 'orientation', index: slot.index, sampleId: slot.sourceSampleId });
    return { ...def, resolvedId: `oriented-${slot.index}` };
  },
  getSimpleSlotVariantDef: (def, slot) => {
    resolved.push({ stage: 'variant', index: slot.index, resolvedId: def.resolvedId });
    return def;
  },
  getSimpleSlotPointForDefWithSharedSize: (point, def) => ({ ...point, resolvedId: def.resolvedId }),
  makeSimpleSlot: (kind, tier, index, point) => ({ ...point, kind, tier, index, key: `${kind}:${tier}:${index}` }),
  orderSimpleSlotsForDef: (def, slots) => slots.slice().sort((a, b) => a.index - b.index),
  SIMPLE_SLOT_LAYOUT_LIMITS: { divider: 7, leaf: 6, cup: 4, other: 3 },
  SIMPLE_REFERENCE_BOX_ID: 'box',
};
const slots = vm.runInNewContext(`${fixedSlotsSource}; getSimpleFixedSlots({ type: 'divider' }, 1);`, fixedContext);
assert.deepEqual(Array.from(slots, slot => slot.index), [0, 1, 2, 3, 4, 5, 6]);
slots.forEach((slot, index) => {
  assert.equal(slot.x, points[index].x);
  assert.equal(slot.y, points[index].y);
  assert.equal(slot.sourceSampleId, points[index].sampleId);
  assert.equal(slot.resolvedId, `oriented-${index}`);
});
for (let index = 0; index < 7; index++) {
  const orientation = resolved.find(entry => entry.stage === 'orientation' && entry.index === index);
  const variant = resolved.find(entry => entry.stage === 'variant' && entry.index === index);
  assert.equal(orientation.sampleId, points[index].sampleId);
  assert.equal(variant.resolvedId, `oriented-${index}`,
    'orientation must be resolved before depth/size variant');
}

const verticalSource = extract(html, 'function isSimpleVerticalDividerSampleId', 'function getSimpleDividerFamily', 'divider orientation');
const orientation = vm.runInNewContext(`(() => { ${verticalSource}; return {
  vertical: isSimpleVerticalDividerSlot({ index: 0, sourceSampleId: 'divider_wave_vertical_back' }),
  horizontal: isSimpleVerticalDividerSlot({ index: 6, sourceSampleId: 'divider_wave' }),
  noForcedG: isSimpleVerticalDividerSlot({ index: 6 })
}; })()`);
assert.deepEqual({ ...orientation }, { vertical: true, horizontal: false, noForcedG: false });
assert.match(html, /id: 'divider_wood_vertical'[\s\S]{0,700}?key: 'back'[\s\S]{0,160}?size: 42/,
  'wood divider A must resolve to its vertical-back size instead of a horizontal shared size');

// 9. 横のなみなみ仕切りだけを水平補正し、全パーツを下から上へのY段差順で描く。
const runtimeDividerRotationMatch = html.match(/const BENTO_WAVE_DIVIDER_ROTATION = (-?[\d.]+);/);
const adminDividerRotationMatch = admin.match(/var BENTO_SLOT_WAVE_DIVIDER_ROTATION = (-?[\d.]+);/);
assert.ok(runtimeDividerRotationMatch && adminDividerRotationMatch,
  'runtime and Admin must both declare the horizontal divider correction');
const runtimeDividerRotation = Number(runtimeDividerRotationMatch[1]);
const adminDividerRotation = Number(adminDividerRotationMatch[1]);
assert.equal(runtimeDividerRotation, -4.4,
  'the measured image correction must remove the remaining up-left tilt');
assert.equal(adminDividerRotation, runtimeDividerRotation,
  'Admin preview and runtime must use the same horizontal divider angle');
assert.match(html, /id: 'divider_wave', type: 'divider'[^\n]*rotation: BENTO_WAVE_DIVIDER_ROTATION/);
assert.match(html, /id: 'divider_wave_vertical', type: 'divider'[^\n]*rotation: 0/);
assert.match(admin, /id: 'divider_wave'[^\n]*rotation: BENTO_SLOT_WAVE_DIVIDER_ROTATION/);
assert.match(admin, /id: 'divider_wave_vertical_back'[^\n]*rotation: 0/);
const runtimePlacementSource = extract(
  html,
  'function applySimpleSlotPlacementToItem(item, slot)',
  'function syncSimplePlacedItemsToCurrentSlots()',
  'runtime divider rotation path'
);
assert.match(runtimePlacementSource, /placementDef\.rotation != null \? placementDef\.rotation/,
  'runtime slot placement must consume the catalog rotation');
const adminPreviewSource = extract(
  admin,
  'function bentoSlotAppendSampleImage(stage, sample, point, extra)',
  'function bentoSlotCreateMaskFrame(box, className)',
  'Admin divider rotation path'
);
assert.match(adminPreviewSource, /sample\.rotation/,
  'the placement editor preview must consume the synchronized sample rotation');

const runtimeRowAlignSource = extract(
  html,
  'function alignSimpleHorizontalDividerRows(list)',
  'function normalizeSimpleSlotLayoutMap(map)',
  'runtime horizontal divider row alignment'
);
const adminRowAlignSource = extract(
  admin,
  'function bentoSlotAlignHorizontalDividerRows(list)',
  'function bentoSlotNormalizeLayout(map)',
  'Admin horizontal divider row alignment'
);
const rowFixture = [
  { y: 90, sampleId: 'divider_wave_vertical_back' },
  { y: 166.9, sampleId: 'divider_wave', sampleOverrides: { divider_wave: { y: 166.9, positionOverride: true } } },
  { y: 171.7, sampleId: 'divider_wave', sampleOverrides: { divider_wave: { y: 171.7, positionOverride: true } } },
  { y: 278.3, sampleId: 'divider_wave', sampleOverrides: { divider_wave: { y: 278.3, positionOverride: true } } },
  { y: 280.5, sampleId: 'divider_wave', sampleOverrides: { divider_wave: { y: 280.5, positionOverride: true } } },
];
const runtimeAlignRows = vm.runInNewContext(`(() => { ${runtimeRowAlignSource}; return alignSimpleHorizontalDividerRows; })()`, {
  FREE_LAYOUT_H: 460,
});
const adminAlignRows = vm.runInNewContext(`(() => { ${adminRowAlignSource}; return bentoSlotAlignHorizontalDividerRows; })()`, {
  BENTO_SLOT_H: 460,
  bentoSlotRound: value => Math.round(Number(value) * 10) / 10,
});
const runtimeAlignedRows = JSON.parse(JSON.stringify(runtimeAlignRows(rowFixture)));
const adminAlignedRows = JSON.parse(JSON.stringify(adminAlignRows(rowFixture)));
assert.deepEqual(runtimeAlignedRows, adminAlignedRows,
  'runtime and placement editor must normalize the same horizontal rows');
assert.deepEqual(runtimeAlignedRows.map(point => point.y), [90, 169.3, 169.3, 279.4, 279.4]);
assert.equal(runtimeAlignedRows[1].sampleOverrides.divider_wave.y, 169.3);
assert.equal(runtimeAlignedRows[4].sampleOverrides.divider_wave.y, 279.4);
const boundaryFixture = [100, 118, 127].map(y => ({ y, sampleId: 'divider_wave' }));
const runtimeBoundaryOnce = JSON.parse(JSON.stringify(runtimeAlignRows(boundaryFixture)));
const runtimeBoundaryTwice = JSON.parse(JSON.stringify(runtimeAlignRows(runtimeBoundaryOnce)));
const adminBoundaryOnce = JSON.parse(JSON.stringify(adminAlignRows(boundaryFixture)));
const adminBoundaryTwice = JSON.parse(JSON.stringify(adminAlignRows(adminBoundaryOnce)));
assert.deepEqual(runtimeBoundaryOnce.map(point => point.y), [115, 115, 115],
  'chained near-neighbours must converge in the first normalization');
assert.deepEqual(runtimeBoundaryTwice, runtimeBoundaryOnce,
  'runtime divider row alignment must be idempotent');
assert.deepEqual(adminBoundaryOnce, runtimeBoundaryOnce);
assert.deepEqual(adminBoundaryTwice, adminBoundaryOnce,
  'placement editor divider row alignment must be idempotent');
assert.match(html, /if \(kind === 'divider'\) points = alignSimpleHorizontalDividerRows\(points\)/);
assert.match(admin, /if \(kind === 'divider'\) points = bentoSlotAlignHorizontalDividerRows\(points\)/);

const runtimeLayerSource = extract(
  html,
  'function getDefaultFreeRenderLayerBase(item)',
  'function getLayerContextItems(item)',
  'runtime render layers'
);
const runtimePlacedItems = [];
const runtimeLayers = vm.runInNewContext(`(() => {
  ${runtimeLayerSource}
  return { base: getFreeRenderLayerBase, layer: getFreeItemRenderLayer };
})()`, {
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  FREE_LAYOUT_W: 740,
  FREE_LAYOUT_H: 500,
  getItemTier: () => 1,
  placedItems: runtimePlacedItems,
});
const hamburger = { uid: 'hamburger', type: 'food', id: 'hamburger', x: 540, y: 351, layer: 1 };
const lowerDivider = { uid: 'divider-lower', type: 'divider', id: 'divider_wave', x: 410, y: 279, layer: 1 };
const middleCup = { uid: 'cup-middle', type: 'cup', id: 'cup_blue_dot', x: 500, y: 235, layer: 1, snapTarget: true };
const middleFood = { uid: 'food-middle', type: 'food', id: 'momo', x: 500, y: 235, layer: 1, parentCupId: middleCup.uid };
const upperDivider = { uid: 'divider-upper', type: 'divider', id: 'divider_wave', x: 410, y: 169, layer: 1 };
const topCup = { uid: 'cup-top', type: 'cup', id: 'cup_blue_dot', x: 500, y: 113, layer: 1, snapTarget: true };
const topFood = { uid: 'food-top', type: 'food', id: 'egg', x: 500, y: 113, layer: 1, parentCupId: topCup.uid };
runtimePlacedItems.push(middleCup, topCup);
assert.equal(runtimeLayers.base(hamburger), 30);
assert.equal(runtimeLayers.base(lowerDivider), 40);
const verticalBack = { uid: 'vertical-back', type: 'divider', id: 'divider_wave_vertical', x: 410, y: 90, layer: 1 };
const verticalMid = { uid: 'vertical-mid', type: 'divider', id: 'divider_wave_vertical', x: 410, y: 219.6, layer: 1 };
const verticalFront = { uid: 'vertical-front', type: 'divider', id: 'divider_wave_vertical', x: 410, y: 341.5, layer: 1 };
const lettuce = { uid: 'lettuce', type: 'leaf', id: 'leaf_lettuce', x: 540, y: 351, layer: 1, stackTarget: true };
const decoration = { uid: 'decoration', type: 'decor', id: 'star', x: 540, y: 351, layer: 1 };
const pick = { uid: 'pick', type: 'pick', id: 'pick_flag', x: 540, y: 351, layer: 1 };
const runtimeFoodLayers = [hamburger, middleFood, topFood].map(item => runtimeLayers.layer(item));
const runtimeDividerLayers = [verticalFront, lowerDivider, verticalMid, upperDivider, verticalBack]
  .map(item => runtimeLayers.layer(item));
assert.deepEqual(runtimeFoodLayers, [3035154, 3025579, 3013366]);
assert.deepEqual(runtimeDividerLayers, [4034191, 4027941, 4022001, 4016941, 4009041]);
assert.ok(Math.min(...runtimeDividerLayers) > Math.max(...runtimeFoodLayers),
  'runtime must draw every divider above the hamburger and all other foods');
assert.ok(runtimeLayers.layer(lettuce) < runtimeLayers.layer(hamburger));
assert.ok(runtimeLayers.layer(hamburger) < runtimeLayers.layer(lowerDivider));
assert.ok(runtimeLayers.layer(lowerDivider) < runtimeLayers.layer(decoration));
assert.ok(runtimeLayers.layer(decoration) < runtimeLayers.layer(pick),
  'runtime must preserve leaf < food < divider < decor < pick tiers');
for (let index = 1; index < runtimeDividerLayers.length; index++) {
  assert.ok(runtimeDividerLayers[index - 1] > runtimeDividerLayers[index],
    'runtime must preserve the divider-only front-to-back Y order');
}

const adminLayerSource = extract(
  admin,
  'function bentoSlotRenderLayerBase(kind, sample)',
  'function bentoSlotCupSizeKeyForEntry(entry)',
  'admin preview render layers'
);
const adminLayers = vm.runInNewContext(`(() => {
  ${adminLayerSource}
  return { base: bentoSlotRenderLayerBase, layer: bentoSlotSampleRenderLayer };
})()`, {
  bentoSlotIsBottomLayerSample: kind => kind === 'leaf',
  bentoSlotClamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  BENTO_SLOT_W: 740,
  BENTO_SLOT_H: 500,
});
assert.equal(adminLayers.base('divider', { id: 'divider_wave', layer: 20 }), 40);
assert.equal(adminLayers.base('divider', { id: 'divider_wave_vertical_mid', layer: 20 }), 40);
assert.equal(adminLayers.base('main-food', { layer: 20 }), 30);
assert.equal(adminLayers.base('leaf', { id: 'leaf_lettuce', layer: 20 }), 29);
assert.equal(adminLayers.base('other', { id: 'pick_flag', layer: 70 }), 70);
const adminMiddleCup = { def: { kind: 'cup' }, sample: { id: 'cup_blue_dot', layer: 10 }, point: { x: 500, y: 235 } };
const adminTopCup = { def: { kind: 'cup' }, sample: { id: 'cup_blue_dot', layer: 10 }, point: { x: 500, y: 113 } };
const adminFoodEntries = [
  { def: { kind: 'main-food' }, sample: { id: 'hamburger', layer: 30 }, point: { x: 540, y: 351 } },
  { def: { kind: 'side-food' }, sample: { id: 'momo', layer: 54 }, point: { x: 500, y: 235 }, anchoredCupEntry: adminMiddleCup },
  { def: { kind: 'side-food' }, sample: { id: 'egg', layer: 34 }, point: { x: 500, y: 113 }, anchoredCupEntry: adminTopCup },
];
const adminDividerEntries = [
  { def: { kind: 'divider' }, sample: { id: 'divider_wave_vertical_front', layer: 20 }, point: { x: 410, y: 341.5 } },
  { def: { kind: 'divider' }, sample: { id: 'divider_wave', layer: 20 }, point: { x: 410, y: 279 } },
  { def: { kind: 'divider' }, sample: { id: 'divider_wave_vertical_mid', layer: 20 }, point: { x: 410, y: 219.6 } },
  { def: { kind: 'divider' }, sample: { id: 'divider_wave', layer: 20 }, point: { x: 410, y: 169 } },
  { def: { kind: 'divider' }, sample: { id: 'divider_wave_vertical_back', layer: 20 }, point: { x: 410, y: 90 } },
];
const adminFoodLayers = adminFoodEntries.map(entry => adminLayers.layer(entry));
const adminDividerLayers = adminDividerEntries.map(entry => adminLayers.layer(entry));
assert.deepEqual(adminFoodLayers, [3035154, 3025550, 3013350]);
assert.deepEqual(adminDividerLayers, [4034191, 4027941, 4022001, 4016941, 4009041]);
assert.ok(Math.min(...adminDividerLayers) > Math.max(...adminFoodLayers),
  'Admin preview must mirror the runtime divider-over-food order');
const adminLeafLayer = adminLayers.layer({
  def: { kind: 'leaf' }, sample: { id: 'leaf_lettuce', layer: 20 }, point: { x: 540, y: 351 },
});
const adminPickLayer = adminLayers.layer({
  def: { kind: 'other' }, sample: { id: 'pick_flag', layer: 70 }, point: { x: 540, y: 351 },
});
assert.ok(adminLeafLayer < adminFoodLayers[0]);
assert.ok(adminFoodLayers[0] < adminDividerLayers[1]);
assert.ok(adminDividerLayers[1] < adminPickLayer,
  'Admin preview must preserve leaf < food < divider < pick tiers');
for (let index = 1; index < adminDividerLayers.length; index++) {
  assert.ok(adminDividerLayers[index - 1] > adminDividerLayers[index],
    'Admin preview must preserve the divider-only front-to-back Y order');
}

console.log('bento tutorial/divider regression: PASS');
