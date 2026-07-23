// ── common/tsuri/input.js ──
// ポノのつりゲーム 共有入力ハンドラ。
// トップレベルでは document/window に一切触れない (node から require しても
// 例外を投げない = DOM 非依存の契約はモジュール読み込み時点の話であり、
// attachTap/attachDrag が実際に呼ばれる時には el 経由で DOM を触る、という
// guragura-seesaw/js/game.js 確立済みの iOS pointercancel 対応パターン
// (touchstart/touchmove/touchend/touchcancel 必須、pointer 系は
// event.pointerType!=='mouse' で early return) をここに集約する。
'use strict';

var TAP_MOVE_THRESHOLD_PX = 12; // これ以上動いたらタップ扱いしない(スクロール/ドラッグ扱い)
// touchend の直後にブラウザが発火させる「合成click」だけを抑止するためのウィンドウ。
// 発火元を区別せず全タップに掛けると、連打(れんだ)フェーズの高速タップ列
// (touchstart/touchendの連続、clickを介さない)まで握りつぶしてしまうバグがあった
// (レビュー指摘: 2タップ/秒を超える連打が無音で欠落する)。 そのため
// 「直前の発火が touch 由来だった場合のみ、その直後の click を短時間だけ抑止する」
// 方式に変更し、touchend→touchend の正当な連続タップ列は一切抑止しない。
var CLICK_SUPPRESS_AFTER_TOUCH_MS = 350;
var DRAG_DIRECTION_THRESHOLD_PX = 24; // 左右ドラッグ判定の閾値(Phase 2 用)

function noop() {}

/**
 * el に「タップ」ハンドラを1つ付ける。 touchstart/touchend/touchcancel +
 * mouse(pointerType==='mouse' または非touch環境)click の両対応。
 * touchend 由来のタップの直後に発火する合成 click だけを短時間抑止し、
 * onTap が二重発火しないようにする。 touchend 同士の連続タップ(連打)は
 * dedupe の対象にならず、発火した回数だけ onTap が呼ばれる。
 * 戻り値: 登録した全リスナーを removeEventListener する後始末関数。
 */
function attachTap(el, onTap) {
  if (!el || typeof el.addEventListener !== 'function' || typeof onTap !== 'function') {
    return noop;
  }

  var touching = false;
  var startX = 0;
  var startY = 0;
  var lastTouchFireAt = -Infinity;

  function invokeOnTap(evt) {
    try { onTap(evt); } catch (_err) { /* ゲーム側の例外でリスナーを壊さない */ }
  }

  // touch 由来のタップは常に発火させる(連打対応)。 直後の合成 click を
  // 抑止できるよう発火時刻だけ記録する。
  function fireFromTouch(evt) {
    lastTouchFireAt = Date.now();
    invokeOnTap(evt);
  }

  // click は、直前に touch 由来のタップが CLICK_SUPPRESS_AFTER_TOUCH_MS 以内に
  // 発火していた場合のみ「合成click」とみなして抑止する。 それ以外(マウス環境や
  // 十分間隔が空いた click)は通常どおり発火させる。
  function fireFromClick(evt) {
    var now = Date.now();
    if (now - lastTouchFireAt < CLICK_SUPPRESS_AFTER_TOUCH_MS) return;
    invokeOnTap(evt);
  }

  function onTouchStart(e) {
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    touching = true;
    startX = t.clientX;
    startY = t.clientY;
  }

  function onTouchMove(e) {
    if (!touching) return;
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    var dx = t.clientX - startX;
    var dy = t.clientY - startY;
    if (Math.sqrt(dx * dx + dy * dy) > TAP_MOVE_THRESHOLD_PX) {
      touching = false; // 動きすぎたのでタップとしては扱わない(ドラッグ/スクロール扱い)
    }
  }

  function onTouchEnd(e) {
    if (!touching) return;
    touching = false;
    try { if (e.cancelable) e.preventDefault(); } catch (_err) { /* 合成clickの抑止はベストエフォート */ }
    fireFromTouch(e);
  }

  function onTouchCancel() {
    touching = false; // 「逃した」ではなく中立リセット。失敗イベントは出さない。
  }

  function onClick(e) {
    fireFromClick(e);
  }

  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: true });
  el.addEventListener('touchend', onTouchEnd, { passive: false });
  el.addEventListener('touchcancel', onTouchCancel, { passive: true });
  el.addEventListener('click', onClick);

  return function detachTap() {
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
    el.removeEventListener('touchcancel', onTouchCancel);
    el.removeEventListener('click', onClick);
  };
}

/**
 * 左右ドラッグ入力の骨組み (Phase 0 では呼び出し側は使わない。 Phase 2
 * (めいじんモードの「ぎゃくにひっぱって」)がシグネチャを変えず実装を足せる
 * ようにするためのスケルトン)。
 * 内部状態は isTouching/dragDirection(水平±24px閾値の符号のみ)/dragActive の
 * 3つだけ。 touchcancel は中立リセットのみで失敗イベントを発火しない。
 * 最初の1本の identifier のみ追跡する (2本目以降の指は無視)。
 * 戻り値: 後始末関数 (detach.state で内部状態を読み取れる、テスト用)。
 */
function attachDrag(el, handlers) {
  if (!el || typeof el.addEventListener !== 'function') {
    return noop;
  }
  var opts = handlers || {};
  var state = { isTouching: false, dragActive: false, dragDirection: 0 };
  var startX = 0;
  var activeTouchId = null;

  function callSafe(fn, arg) {
    if (typeof fn !== 'function') return;
    try { fn(arg); } catch (_err) { /* ゲーム側の例外でリスナーを壊さない */ }
  }

  function begin(x, touchId) {
    if (state.isTouching) return; // 1本目の指を優先、2本目以降は無視
    state.isTouching = true;
    state.dragActive = false;
    state.dragDirection = 0;
    startX = x;
    activeTouchId = touchId === undefined ? null : touchId;
    callSafe(opts.onDragStart);
  }

  function move(x) {
    if (!state.isTouching) return;
    var dx = x - startX;
    if (Math.abs(dx) >= DRAG_DIRECTION_THRESHOLD_PX) {
      state.dragActive = true;
      state.dragDirection = dx > 0 ? 1 : -1;
    }
    callSafe(opts.onDragMove, dx);
  }

  function end() {
    if (!state.isTouching) return;
    state.isTouching = false;
    state.dragActive = false;
    activeTouchId = null;
    callSafe(opts.onDragEnd);
  }

  function findTouch(touchList) {
    if (!touchList) return null;
    if (activeTouchId === null) return touchList[0] || null;
    for (var i = 0; i < touchList.length; i++) {
      if (touchList[i].identifier === activeTouchId) return touchList[i];
    }
    return null;
  }

  function onTouchStart(e) {
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    begin(t.clientX, t.identifier);
  }

  function onTouchMove(e) {
    var t = findTouch(e.changedTouches);
    if (!t) return;
    move(t.clientX);
  }

  function onTouchEnd(e) {
    var t = findTouch(e.changedTouches);
    if (!t) return;
    end();
  }

  function onTouchCancel() {
    end(); // 中立リセットのみ。失敗イベントは発火しない。
  }

  function onPointerDown(e) {
    if (e.pointerType !== 'mouse') return;
    begin(e.clientX);
  }

  function onPointerMove(e) {
    if (e.pointerType !== 'mouse') return;
    move(e.clientX);
  }

  function onPointerUp(e) {
    if (e.pointerType !== 'mouse') return;
    end();
  }

  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: true });
  el.addEventListener('touchend', onTouchEnd, { passive: true });
  el.addEventListener('touchcancel', onTouchCancel, { passive: true });
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);

  var detachDrag = function () {
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
    el.removeEventListener('touchcancel', onTouchCancel);
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
  };
  // テスト/デバッグ用に内部状態を露出する(公開契約は「後始末関数を返す」のみ。
  // 関数オブジェクトに state を生やしても呼び出し可能性は変わらないため契約に反しない)。
  detachDrag.state = state;
  return detachDrag;
}

var PUBLIC_API = {
  TAP_MOVE_THRESHOLD_PX: TAP_MOVE_THRESHOLD_PX,
  DRAG_DIRECTION_THRESHOLD_PX: DRAG_DIRECTION_THRESHOLD_PX,
  attachTap: attachTap,
  attachDrag: attachDrag
};

if (typeof window !== 'undefined') {
  window.PonoTsuriInput = PUBLIC_API;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PUBLIC_API;
}
