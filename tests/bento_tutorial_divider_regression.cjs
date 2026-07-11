'use strict';

// batch:1248 regression: のり操作の一本道・青枠の単一描画・仕切りA〜G正本を守る。

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

// 2. のりは 移動→縮小→拡大→回転→とりけす→OK の実操作でだけ進む。
const steps = extract(html, 'const TUT2_STEPS = [', 'function tut2FindStep', 'tutorial steps');
const moveAt = steps.indexOf("id: 'tut2-nori-move'");
const editAt = steps.indexOf("id: 'tut2-nori-edit'");
const undoAt = steps.indexOf("id: 'tut2-nori-undo'");
const okAt = steps.indexOf("id: 'tut2-nori-ok'");
assert.ok(moveAt >= 0 && moveAt < editAt && editAt < undoAt && undoAt < okAt,
  'nori steps must be move -> edit -> undo -> OK');
assert.match(steps, /id: 'tut2-nori-edit', single: true[^\n]*tut2RenderNoriEdit/);
assert.match(steps, /id: 'tut2-nori-undo', single: true[^\n]*tut2RenderNoriUndo/);
assert.match(steps, /id: 'tut2-nori-ok', single: true[^\n]*tut2RenderNoriOk/);

const moveHook = extract(html, 'function tutorialOnItemMoved(uid)', 'function tutorialNoriEditExpectedCopy', 'nori move hook');
assert.match(moveHook, /noriEditTargetUid = uid/);
assert.match(moveHook, /noriEditStage = 'shrink'/);
assert.match(moveHook, /tutorialAdvance\('tut2-nori-edit'\)/);
assert.doesNotMatch(moveHook, /tut2-nori-undo/);

const editHooks = extract(html, 'function tutorialNoriEditExpectedCopy()', '// のり編集で積まれた履歴', 'nori edit hooks');
const state = { active: true, step: 'tut2-nori-edit', noriEditStage: 'shrink', noriEditTargetUid: 'mouth' };
const advances = [];
let renders = 0;
const hookContext = vm.runInNewContext(`(() => {
  ${editHooks}
  return { canUse: tutorialCanUseNoriEditAction, onEdit: tutorialOnNoriEditAction };
})()`, {
  tutorialState: state,
  setSpeech: () => {},
  tutorialRenderStep: () => { renders++; },
  tutorialClearTrims: () => {},
  tutorialHideFinger: () => {},
  tutorialAdvance: (next) => { advances.push(next); },
});
assert.equal(hookContext.canUse('mouth', 'grow'), false, 'grow must not skip shrink');
renders = 0;
hookContext.onEdit('mouth', 'shrink');
assert.equal(state.noriEditStage, 'grow');
hookContext.onEdit('mouth', 'grow');
assert.equal(state.noriEditStage, 'rotate');
hookContext.onEdit('mouth', 'rotate');
assert.deepEqual(advances, ['tut2-nori-undo']);
assert.equal(state.noriEditStage, 'done', 'completed rotate must lock before a queued voice transition');
assert.equal(renders, 2, 'shrink and grow each render exactly one next target');

const rotate = extract(html, 'function rotateSelectedItem(deltaAngle)', 'function canShowLayerControlsForItem', 'rotate handler');
assert.ok(rotate.indexOf('renderFreeLayoutControls();') < rotate.indexOf("tutorialOnNoriEditAction(item.uid, 'rotate')"),
  'rotate must render before attaching the next outline');
const scale = extract(html, 'function scaleSelectedDecorItem(factor)', '// batch:1057: decor 編集パネル', 'scale handler');
assert.ok(scale.indexOf('renderFreeLayoutControls();') < scale.indexOf('tutorialOnNoriEditAction(item.uid, tutorialAction)'),
  'scale must render before attaching the next outline');

const undo = extract(html, 'function tutorialOnUndoPressed()', 'function tutorialOnItemPlaced', 'nori undo hook');
assert.equal((undo.match(/undoFreeItem\(\)/g) || []).length, 2,
  'undo has one normal branch and one tutorial branch');
assert.match(undo, /tutorialAdvance\('tut2-nori-ok'\)/);
assert.match(undo, /tut2FaceAtDefault/,
  'guided undo must finish from the actual initial-face condition, not a press count');
assert.doesNotMatch(undo, /いちど|pressCount|maxUndo|undoCount/,
  'guided undo must not impose a fixed number of presses');
const undoRenderer = extract(html, 'function tut2RenderNoriUndo(step)', 'function tut2RenderNoriOk', 'nori undo renderer');
assert.match(undoRenderer, /さいしょの おかおに もどるまで/);
assert.doesNotMatch(undoRenderer, /いちど/);
const undoState = { active: true, step: 'tut2-nori-edit', _noriUndoDone: false, _noriUndoAckTimer: null };
let undoCalls = 0;
let faceAtDefault = false;
let undoRenders = 0;
const undoAdvances = [];
const undoTimers = [];
const undoHook = vm.runInNewContext(`(() => { ${undo}; return tutorialOnUndoPressed; })()`, {
  tutorialState: undoState,
  tutorialNoriEditExpectedCopy: () => 'edit next',
  setSpeech: () => {},
  tutorialRenderStep: () => { undoRenders++; },
  tut2FaceAtDefault: () => faceAtDefault,
  undoFreeItem: () => {
    undoCalls++;
    // move / shrink / grow / rotate の4履歴を想定。最後の履歴で初期顔へ戻る。
    if (undoCalls === 4) faceAtDefault = true;
  },
  tutorialClearTrims: () => {},
  tutorialHideFinger: () => {},
  tutorialAdvance: (step) => { undoAdvances.push(step); },
  setTimeout: (fn) => { undoTimers.push(fn); return undoTimers.length; },
});
undoHook();
assert.equal(undoCalls, 0, 'undo must be blocked before the guided undo step');
undoState.step = 'tut2-nori-undo';
for (let i = 0; i < 3; i++) undoHook();
assert.equal(undoCalls, 3, 'guided undo must allow every incomplete history step');
assert.equal(undoState._noriUndoDone, false, 'incomplete face restoration must stay on undo');
assert.equal(undoRenders, 4, 'blocked edit plus each incomplete undo re-renders the current single target');
assert.deepEqual(undoAdvances, []);
undoHook();
assert.equal(undoCalls, 4, 'fourth history step restores the moved eye in this fixture');
assert.equal(undoState._noriUndoDone, true);
assert.equal(undoTimers.length, 1, 'completion delay starts only after the face is back at default');
undoHook();
assert.equal(undoCalls, 4, 'presses during completion must not undo face-part placement history');
assert.deepEqual(undoAdvances, []);
undoTimers[0]();
assert.deepEqual(undoAdvances, ['tut2-nori-ok']);

// 3. 青枠はscroll安定後に1回だけ開始し、Phase A→Bで作り直さない。
assert.match(html, /\.tut-trim-box rect \{[\s\S]*?animation: none;/);
assert.match(html, /\.tut-trim-box rect \{[\s\S]*?stroke-dashoffset: var\(--trim-len, 1000\);[\s\S]*?opacity: 0;/,
  'pre-ready trim must stay hidden at the undrawn offset');
assert.match(html, /\.tut-trim-box\.is-ready rect \{[\s\S]*?tutTrimDraw/);
const trim = extract(html, 'function tutorialTrimPath(targetEl, opts = {})', 'function tutorialMarkTarget', 'trim lifecycle');
assert.ok(trim.indexOf('sync();') < trim.indexOf('document.body.appendChild(wrap)'),
  'trim geometry must be set before DOM connection');
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

// 4. 管理エディターの divider[0..6] = A..G を、座標・向きを変えず同じindex順で使う。
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

console.log('bento tutorial/divider regression: PASS');
