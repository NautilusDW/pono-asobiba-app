// ── pakupaku-catch/js/game.js ──
// ぱくぱくキャッチ: canvas 描画・入力・ゲームループ (DOM 依存)。
// 純粋ロジック (加点/タイマー/出現カーブ) は js/logic.js の window.PakupakuLogic を参照する。
'use strict';

(function () {
  var L = window.PakupakuLogic;
  if (!L) { console.error('[pakupaku-catch] PakupakuLogic (js/logic.js) が読み込まれていません'); return; }

  // ═══ Canvas セットアップ (bubble/index.html の resize() パターンを踏襲) ═══
  var stageEl = document.getElementById('stage');
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0;
  var TARGET_RATIO = 9 / 16;

  function resize() {
    var winW = window.innerWidth;
    var winH = window.innerHeight;
    var winRatio = winW / winH;
    var cw, ch;
    if (winRatio > TARGET_RATIO) {
      ch = winH;
      cw = Math.round(winH * TARGET_RATIO);
    } else {
      cw = winW;
      ch = Math.round(winW / TARGET_RATIO);
    }
    W = canvas.width = cw;
    H = canvas.height = ch;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  function updateLandscapeNotice() {
    var notice = document.getElementById('landscape-notice');
    if (!notice) return;
    var isLandscape = window.innerWidth > window.innerHeight;
    var isTouch = matchMedia('(pointer: coarse)').matches;
    notice.style.display = (isLandscape && isTouch) ? 'flex' : 'none';
  }
  updateLandscapeNotice();
  window.addEventListener('orientationchange', function () {
    setTimeout(updateLandscapeNotice, 100);
    setTimeout(updateLandscapeNotice, 500);
  });
  window.addEventListener('resize', updateLandscapeNotice);

  // ═══ Pono 画像 (AR 厳守: 399x569 を必ず維持して描画) ═══
  var PONO_AR = 399 / 569;
  var ponoImg = new Image();
  var ponoLoaded = false;
  ponoImg.onload = function () { ponoLoaded = true; };
  ponoImg.onerror = function () { ponoLoaded = false; };
  ponoImg.src = '../assets/images/characters/pono/pono_001.png';

  // ═══ 落下物 描画テーブル (本番アート差し替えポイント) ═══
  // src に画像パスを入れれば、 読み込み後は画像本来の縦横比を維持したまま
  // drawImage に自動切替する (AR stretch は絶対禁止)。 現状は全て canvas 描画。
  var ITEM_ART = {
    acorn:   { src: null, img: null, loaded: false, draw: drawAcorn },
    onigiri: { src: null, img: null, loaded: false, draw: drawOnigiri },
    apple:   { src: null, img: null, loaded: false, draw: drawApple },
    golden:  { src: null, img: null, loaded: false, draw: drawGolden },
    igaguri: { src: null, img: null, loaded: false, draw: drawIgaguri },
    stone:   { src: null, img: null, loaded: false, draw: drawStone }
  };
  Object.keys(ITEM_ART).forEach(function (id) {
    var art = ITEM_ART[id];
    if (!art.src) return;
    art.img = new Image();
    art.img.onload = function () { art.loaded = true; };
    art.img.src = art.src;
  });

  function drawItemArt(id, x, y, r) {
    var art = ITEM_ART[id];
    if (!art) return;
    if (art.loaded && art.img) {
      var ar = art.img.naturalWidth / art.img.naturalHeight;
      var w = r * 2, h = (r * 2) / ar;
      if (h > r * 2) { h = r * 2; w = h * ar; }
      ctx.drawImage(art.img, x - w / 2, y - h / 2, w, h);
      return;
    }
    if (typeof art.draw === 'function') art.draw(x, y, r);
  }

  function drawAcorn(x, y, r) {
    ctx.fillStyle = '#c98a4b';
    ctx.beginPath();
    ctx.arc(x, y + r * 0.15, r * 0.78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b4423';
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.35, r * 0.85, r * 0.5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - r * 0.08, y - r * 0.55, r * 0.16, r * 0.25);
  }

  function drawOnigiri(x, y, r) {
    var s = r * 1.15;
    ctx.fillStyle = '#fefefe';
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x + s * 0.05, y - s * 0.9, x + s * 0.86, y + s * 0.5);
    ctx.quadraticCurveTo(x + s * 0.95, y + s * 0.72, x + s * 0.7, y + s * 0.72);
    ctx.lineTo(x - s * 0.7, y + s * 0.72);
    ctx.quadraticCurveTo(x - s * 0.95, y + s * 0.72, x - s * 0.86, y + s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(x - s * 0.42, y + s * 0.06, s * 0.84, s * 0.4);
  }

  function drawApple(x, y, r) {
    ctx.fillStyle = '#e0402f';
    ctx.beginPath();
    ctx.arc(x, y + r * 0.08, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.7);
    ctx.lineTo(x, y - r * 0.95);
    ctx.stroke();
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.25, y - r * 0.85, r * 0.28, r * 0.16, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGolden(x, y, r) {
    var grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, '#fff3b0');
    grad.addColorStop(1, '#e2a610');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(1, r * 0.08);
    for (var i = 0; i < 4; i++) {
      var ang = (Math.PI / 2) * i + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ang) * r * 0.3, y + Math.sin(ang) * r * 0.3);
      ctx.lineTo(x + Math.cos(ang) * r * 1.15, y + Math.sin(ang) * r * 1.15);
      ctx.stroke();
    }
  }

  function drawIgaguri(x, y, r) {
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.68, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5c3a1a';
    var spikes = 10;
    for (var i = 0; i < spikes; i++) {
      var ang = (Math.PI * 2 / spikes) * i;
      var bx = x + Math.cos(ang) * r * 0.6, by = y + Math.sin(ang) * r * 0.6;
      var tx = x + Math.cos(ang) * r * 1.25, ty = y + Math.sin(ang) * r * 1.25;
      var perp = ang + Math.PI / 2;
      var w = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(perp) * w, by + Math.sin(perp) * w);
      ctx.lineTo(bx - Math.cos(perp) * w, by - Math.sin(perp) * w);
      ctx.lineTo(tx, ty);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawStone(x, y, r) {
    ctx.fillStyle = '#9e9e9e';
    ctx.beginPath();
    var pts = 7;
    for (var i = 0; i < pts; i++) {
      var ang = (Math.PI * 2 / pts) * i;
      var rr = r * (0.65 + (i % 2 === 0 ? 0.25 : 0.05));
      var px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr * 0.85;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.2, y - r * 0.25, r * 0.25, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ═══ ゲーム状態 ═══
  var state = L.createInitialState();
  var phase = 'idle'; // idle -> countdown -> playing -> settling -> result
  var items = [];
  var spawnHistory = []; // NG連続禁止用 (出現時の型履歴)
  var spawnTimerMs = 0;
  var settleTimer = 0;

  var basketX = 0, basketTargetX = 0;
  var basketGeom = null;

  function resetGameState() {
    state = L.createInitialState();
    items = [];
    spawnHistory = [];
    spawnTimerMs = 0;
    settleTimer = 0;
    basketX = W / 2;
    basketTargetX = W / 2;
  }
  resetGameState();

  // ═══ 入力: iOS pointercancel 対策 (touchstart/touchend/touchcancel を必ず併用) ═══
  // memory: feedback_ios_pointercancel_native_pan — pointerdown/up だけで
  // 「指が接地中」を追跡しない。 画面のどこをドラッグしてもカゴが追従する。
  // タッチ/マウスの二重発火防止は各 pointer リスナーの e.pointerType !== 'mouse' 判定で
  // 行っている (実際のガード機構はそちらであり、専用フラグは持たない)。
  var touchId = null;
  var fingerDown = false;
  var mouseDown = false;

  function clientXToCanvasX(clientX) {
    var rect = canvas.getBoundingClientRect();
    return clientX - rect.left;
  }

  stageEl.addEventListener('touchstart', function (e) {
    var t = e.changedTouches[0];
    if (!t) return;
    touchId = t.identifier;
    fingerDown = true;
    basketTargetX = clientXToCanvasX(t.clientX);
  }, { passive: true });

  stageEl.addEventListener('touchmove', function (e) {
    if (!fingerDown) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === touchId) {
        basketTargetX = clientXToCanvasX(t.clientX);
        break;
      }
    }
  }, { passive: true });

  function onTouchEnd(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        fingerDown = false;
        touchId = null;
        break;
      }
    }
  }
  stageEl.addEventListener('touchend', onTouchEnd, { passive: true });
  stageEl.addEventListener('touchcancel', onTouchEnd, { passive: true });

  // マウス用 (pointer系はマウスのみ処理し、タッチとの二重発火を防ぐ)
  stageEl.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    mouseDown = true;
    basketTargetX = clientXToCanvasX(e.clientX);
  });
  stageEl.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || !mouseDown) return;
    basketTargetX = clientXToCanvasX(e.clientX);
  });
  window.addEventListener('pointerup', function (e) {
    if (e.pointerType !== 'mouse') return;
    mouseDown = false;
  });

  function updateBasketPosition() {
    basketX += (basketTargetX - basketX) * 0.35;
    var halfW = Math.max(50, W * 0.16);
    if (basketX < halfW) basketX = halfW;
    if (basketX > W - halfW) basketX = W - halfW;
  }

  function computeBasketGeom() {
    var basketW = Math.max(90, W * 0.34);
    var basketH = basketW * 0.55;
    var bottomMargin = H * 0.05;
    var basketBottomY = H - bottomMargin;
    var basketTopY = basketBottomY - basketH;
    var zoneY0 = basketTopY - 14;
    var zoneY1 = zoneY0 + 30;
    var zoneHalfW = (basketW * 0.9) / 2;
    return {
      x: basketX, w: basketW, h: basketH,
      topY: basketTopY, bottomY: basketBottomY,
      zoneX0: basketX - zoneHalfW, zoneX1: basketX + zoneHalfW,
      zoneY0: zoneY0, zoneY1: zoneY1
    };
  }

  function circleRectOverlap(cx, cy, r, x0, y0, x1, y1) {
    var nx = Math.max(x0, Math.min(cx, x1));
    var ny = Math.max(y0, Math.min(cy, y1));
    var dx = cx - nx, dy = cy - ny;
    return (dx * dx + dy * dy) <= r * r;
  }

  // ═══ パーティクル / 演出 ═══
  var particles = [];
  var confetti = [];
  var popups = [];

  function spawnCrumbParticles(x, y, big) {
    var count = big ? 14 : 7;
    for (var i = 0; i < count; i++) {
      var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      var speed = 120 + Math.random() * 160;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, size: 3 + Math.random() * 3,
        color: big ? '#ffd54f' : (Math.random() < 0.5 ? '#a0632c' : '#e8c27a')
      });
    }
  }

  function spawnDustPuff(x, y) {
    for (var i = 0; i < 5; i++) {
      var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
      var speed = 30 + Math.random() * 40;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0.6, size: 3 + Math.random() * 3, color: 'rgba(170,150,110,0.65)'
      });
    }
  }

  function updateAndDrawParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.vy += 480 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 1.3;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function spawnConfettiBurst(x, y, count) {
    var n = count || 16;
    var colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9f45'];
    for (var i = 0; i < n; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 100 + Math.random() * 220;
      confetti.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 160,
        rot: Math.random() * Math.PI * 2, rotSpd: (Math.random() - 0.5) * 6,
        life: 1, size: 5 + Math.random() * 5, color: colors[i % colors.length]
      });
    }
  }

  function updateAndDrawConfetti(dt) {
    for (var i = confetti.length - 1; i >= 0; i--) {
      var c = confetti[i];
      c.vy += 340 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.rotSpd * dt;
      c.life -= dt * 0.6;
      if (c.life <= 0 || c.y > H + 40) { confetti.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, c.life);
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function spawnPopup(x, y, text, color) {
    popups.push({ x: x, y: y, text: text, color: color, life: 1, vy: -40 });
  }

  function updateAndDrawPopups(dt) {
    ctx.textAlign = 'center';
    ctx.font = '900 20px "Zen Maru Gothic", sans-serif';
    for (var i = popups.length - 1; i >= 0; i--) {
      var p = popups[i];
      p.y += p.vy * dt;
      p.life -= dt * 0.9;
      if (p.life <= 0) { popups.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // ═══ 背景描画 (夕方の果樹園風グラデ + 草地帯) ═══
  function drawBackground() {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#ff9a56');
    grad.addColorStop(0.5, '#ffc98a');
    grad.addColorStop(1, '#fff3d6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    var groundH = H * 0.16;
    ctx.fillStyle = '#7cb342';
    ctx.fillRect(0, H - groundH, W, groundH);
    ctx.fillStyle = '#8bc34a';
    ctx.fillRect(0, H - groundH, W, groundH * 0.3);
  }

  // ═══ ポノ + カゴ描画 ═══
  var stunAnimT = 0;
  function isStunnedVisual() { return L.isStunned(state); }

  function drawPonoFallback(cx, footY, bodyR) {
    ctx.fillStyle = '#f5deb3';
    ctx.beginPath();
    ctx.arc(cx, footY - bodyR, bodyR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - bodyR * 0.7, footY - bodyR * 1.7, bodyR * 0.35, 0, Math.PI * 2);
    ctx.arc(cx + bodyR * 0.7, footY - bodyR * 1.7, bodyR * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a3a1c';
    ctx.beginPath();
    ctx.arc(cx - bodyR * 0.3, footY - bodyR * 1.05, bodyR * 0.08, 0, Math.PI * 2);
    ctx.arc(cx + bodyR * 0.3, footY - bodyR * 1.05, bodyR * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawStunStars(cx, cy) {
    stunAnimT += 0.12;
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#ffd54f';
    for (var i = 0; i < 3; i++) {
      var ang = stunAnimT + (Math.PI * 2 / 3) * i;
      var sx = cx + Math.cos(ang) * 24;
      var sy = cy + Math.sin(ang) * 10 - 30;
      ctx.fillText('★', sx, sy);
    }
  }

  function drawPonoAndBasket(geom) {
    var stunned = isStunnedVisual();
    var shakeX = stunned ? Math.sin(Date.now() * 0.05) * 4 : 0;
    var cx = geom.x + shakeX;

    // Pono (画像は必ず本来の AR (399x569) を維持して描画。stretch 禁止)
    var ph = H * 0.24;
    if (ponoLoaded) {
      var pw = ph * PONO_AR;
      var py0 = geom.bottomY - ph * 0.92;
      ctx.drawImage(ponoImg, cx - pw / 2, py0, pw, ph);
    } else {
      drawPonoFallback(cx, geom.bottomY - H * 0.02, H * 0.09);
    }

    // カゴ本体 (台形 + アーチ, placeholder 描画)
    ctx.save();
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.moveTo(cx - geom.w * 0.5, geom.topY);
    ctx.lineTo(cx + geom.w * 0.5, geom.topY);
    ctx.lineTo(cx + geom.w * 0.36, geom.bottomY);
    ctx.lineTo(cx - geom.w * 0.36, geom.bottomY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#5c3a1a';
    ctx.lineWidth = Math.max(3, geom.w * 0.05);
    ctx.beginPath();
    ctx.ellipse(cx, geom.topY, geom.w * 0.5, geom.h * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    for (var i = 1; i < 4; i++) {
      var yy = geom.topY + (geom.bottomY - geom.topY) * (i / 4);
      ctx.beginPath();
      ctx.moveTo(cx - geom.w * 0.46, yy);
      ctx.lineTo(cx + geom.w * 0.46, yy);
      ctx.stroke();
    }
    ctx.restore();

    if (stunned) drawStunStars(cx, geom.topY - ph * 0.5);
  }

  // ═══ 出現・落下・判定 ═══
  // memory: 座標・速度は canvas 高さ/幅比で保持し、 resize 耐性を確保する
  // (在空中の落下物が resize() で W/H が変わっても新ジオメトリに追従できるように)。
  // xR/yR は W/H に対する比率で保持する (半径は RADIUS_RATIO から都度算出)。
  // ピクセル値は currentItemPx() で毎フレーム導出するため、 落下中の resize() でも
  // 新しい W/H に自動追従できる。
  var RADIUS_RATIO = 0.045;
  var RADIUS_MIN_PX = 18;

  function currentItemPx(it) {
    var r = Math.max(RADIUS_MIN_PX, H * RADIUS_RATIO);
    return { x: it.xR * W, y: it.yR * H, r: r };
  }

  function spawnItem() {
    var id = L.pickItemId(state.elapsed, spawnHistory, Math.random);
    spawnHistory.push(L.ITEM_DEFS[id].type);
    if (spawnHistory.length > 8) spawnHistory.shift();
    var r = Math.max(RADIUS_MIN_PX, H * RADIUS_RATIO);
    var marginR = (r + 8) / W;
    var xR = marginR + Math.random() * (1 - marginR * 2);
    var yR = (-r - 4) / H;
    items.push({ id: id, xR: xR, yR: yR, def: L.ITEM_DEFS[id] });
  }

  function handleCatch(it, px) {
    L.applyCatch(state, it.id);
    if (it.def.type === 'ng') {
      if (window.Haptics) window.Haptics.fire('capsuleCrack');
      playNgSound();
      spawnPopup(px.x, px.y - 20, 'いたたた！', '#c62828');
    } else {
      var golden = it.id === 'golden';
      if (window.Haptics) window.Haptics.fire(golden ? 'gachaTurn3' : 'pageTurn');
      playCatchSound(golden);
      spawnCrumbParticles(px.x, px.y, golden);
      spawnPopup(px.x, px.y - 20, golden ? '✨きらーん！' : 'ぱくっ！', golden ? '#e2a610' : '#7a4a1f');
      if (window.incrementStat) {
        window.incrementStat('pakupaku_catches', 1);
        if (golden) window.incrementStat('pakupaku_golden', 1);
      }
      if (state.combo > 0 && state.combo % 5 === 0) {
        spawnConfettiBurst(px.x, px.y, 20);
        spawnPopup(W / 2, H * 0.22, '＋ボーナス！ combo ' + state.combo, '#ff6b35');
      }
    }
    updateHud();
  }

  function handleMiss(it) {
    if (it.def.type === 'ok') spawnDustPuff(it.xR * W, H - H * 0.06);
  }

  function updateItems(dt, geom) {
    var stunned = isStunnedVisual();
    var fallSpeedRatioPerSec = L.fallSpeedAt(state.elapsed);
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      it.yR += fallSpeedRatioPerSec * dt;
      var px = currentItemPx(it);
      if (!stunned && circleRectOverlap(px.x, px.y, px.r, geom.zoneX0, geom.zoneY0, geom.zoneX1, geom.zoneY1)) {
        handleCatch(it, px);
        items.splice(i, 1);
        continue;
      }
      if (px.y - px.r > H) {
        handleMiss(it);
        items.splice(i, 1);
      }
    }
  }

  function drawItems() {
    for (var i = 0; i < items.length; i++) {
      var px = currentItemPx(items[i]);
      drawItemArt(items[i].id, px.x, px.y, px.r);
    }
  }

  // ═══ HUD ═══
  var hudTimerEl = document.getElementById('hud-timer');
  var hudScoreEl = document.getElementById('hud-score');
  var lastTickSecond = -1;

  function updateHud() {
    var remaining = Math.max(0, Math.ceil(L.GAME_DURATION - state.elapsed));
    if (hudTimerEl) {
      hudTimerEl.textContent = '⏱ ' + remaining;
      hudTimerEl.classList.toggle('hud-low', remaining <= 10);
    }
    if (hudScoreEl) hudScoreEl.textContent = '🍙 ' + state.score;
    if (remaining <= 5 && remaining >= 1 && remaining !== lastTickSecond && phase === 'playing') {
      lastTickSecond = remaining;
      playTick();
    }
  }

  // ═══ 音 (WebAudio 直接合成。 bubble のペンタトニックとは違う音階で差別化) ═══
  var audioCtx = null;
  function ensureAudio() {
    if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return; }
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) audioCtx = new Ctor();
    } catch (e) {}
  }
  function tone(freq, startOffset, dur, type, gainVal) {
    if (!audioCtx) return;
    try {
      var t0 = audioCtx.currentTime + (startOffset || 0);
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(gainVal || 0.12, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) {}
  }
  function playCatchSound(golden) {
    if (golden) { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.08, 0.14, 'triangle', 0.12); }); return; }
    tone(400, 0, 0.08, 'square', 0.10);
    tone(660, 0.07, 0.10, 'square', 0.10);
  }
  function playNgSound() {
    if (!audioCtx) return;
    try {
      var t0 = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t0);
      osc.frequency.exponentialRampToValueAtTime(90, t0 + 0.35);
      gain.gain.setValueAtTime(0.12, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.42);
    } catch (e) {}
  }
  function playFanfare() {
    [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, i * 0.11, 0.18, 'triangle', 0.13); });
  }
  function playTick() { tone(880, 0, 0.05, 'square', 0.08); }

  // ═══ チュートリアル (bubble の tut-dim/tut-bubble CSS を流用) ═══
  var TUT_STEPS = [
    { icon: '🧺', text: 'カゴを ゆびで うごかして<br>たべものを キャッチしよう！' },
    { icon: '⚠️', text: 'とげとげ や いしを キャッチすると<br>すこし スタンしちゃうよ。げんてんは ないから あんしんしてね' }
  ];
  var tutStep = 0;
  function showTutorial() {
    tutStep = 0;
    renderTutStep();
  }
  function renderTutStep() {
    var dim = document.getElementById('tut-dim');
    var bubble = document.getElementById('tut-bubble');
    if (!dim || !bubble) return;
    var step = TUT_STEPS[tutStep];
    dim.classList.remove('hidden');
    bubble.classList.remove('hidden');
    bubble.innerHTML = '<div class="tut-icon">' + step.icon + '</div>' + step.text +
      '<br><button class="tut-next-btn" id="tut-next">' + (tutStep < TUT_STEPS.length - 1 ? 'つぎへ' : 'とじる') + '</button>';
    document.getElementById('tut-next').addEventListener('pointerdown', onTutNext);
  }
  function closeTutorial() {
    var dim = document.getElementById('tut-dim');
    var bubble = document.getElementById('tut-bubble');
    if (dim) dim.classList.add('hidden');
    if (bubble) bubble.classList.add('hidden');
  }
  function onTutNext(e) {
    e.preventDefault();
    e.stopPropagation();
    tutStep++;
    if (tutStep >= TUT_STEPS.length) { closeTutorial(); return; }
    renderTutStep();
  }
  var tutDimEl = document.getElementById('tut-dim');
  if (tutDimEl) tutDimEl.addEventListener('pointerdown', closeTutorial);

  // ═══ ゲームフロー: start → countdown → playing → settling → result ═══
  function beginCountdown() {
    phase = 'countdown';
    var cdScreen = document.getElementById('countdown-screen');
    var cdText = document.getElementById('cd-text');
    if (cdScreen) cdScreen.classList.add('show');
    if (cdText) cdText.textContent = 'よーい…';
    setTimeout(function () { if (cdText) cdText.textContent = 'すたーと！'; }, 600);
    setTimeout(function () {
      if (cdScreen) cdScreen.classList.remove('show');
      phase = 'playing';
      window._achDeferPopups = true;
      lastTs = null;
    }, 1200);
  }

  function finishGame() {
    phase = 'result';
    if (window.incrementStat) window.incrementStat('pakupaku_games', 1);
    if (window.setStatMax) window.setStatMax('pakupaku_best_combo', state.bestCombo);
    if (window.flushAchievementPopups) window.flushAchievementPopups();
    window._achDeferPopups = false;
    showResult();
  }

  function showResult() {
    var scoreEl = document.getElementById('result-score');
    if (scoreEl) scoreEl.textContent = state.score + ' てん';
    var rank = window.saveHighScore ? window.saveHighScore('pakupaku-catch', state.score) : 0;
    var newEl = document.getElementById('result-new');
    if (rank >= 1) {
      if (newEl) newEl.classList.remove('hidden');
      spawnConfettiBurst(W / 2, H * 0.25, rank === 1 ? 50 : 22);
      playFanfare();
      setTimeout(function () {
        if (window.showHighScoreTable) window.showHighScoreTable('pakupaku-catch', '🍙 ぱくぱくキャッチ ハイスコア');
      }, 900);
    } else {
      if (newEl) newEl.classList.add('hidden');
      playFanfare();
    }
    var overlay = document.getElementById('result-overlay');
    if (overlay) overlay.classList.add('show');
  }

  function startMenuOnce() {
    if (window._menuInited || typeof window.initMenu !== 'function') return;
    window.initMenu({
      tutorial: showTutorial,
      extraButtons: [{
        icon: '🏆',
        label: 'ハイスコア',
        onClick: function () { if (window.showHighScoreTable) window.showHighScoreTable('pakupaku-catch', '🍙 ぱくぱくキャッチ ハイスコア'); }
      }]
    });
    window._menuInited = true;
  }

  var startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      ensureAudio();
      var startScreen = document.getElementById('start-screen');
      if (startScreen) startScreen.style.display = 'none';
      startMenuOnce();
      beginCountdown();
    });
  }

  var retryBtn = document.getElementById('retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var overlay = document.getElementById('result-overlay');
      if (overlay) overlay.classList.remove('show');
      resetGameState();
      updateHud();
      beginCountdown();
    });
  }

  // ═══ メインループ ═══
  var lastTs = null;
  function loop(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = (ts - lastTs) / 1000;
    if (dt > 0.05) dt = 0.05; // タブ切替復帰時などの大ジャンプを吸収
    lastTs = ts;

    drawBackground();

    if (phase === 'playing' || phase === 'settling') {
      // state.time (壁時計) は settling 中も進める。 state.elapsed は finished 後
      // 固定されるが、 stun 判定 (isStunned) は state.time を見るため、 tickTimer は
      // フェーズに関わらず毎フレーム呼ぶ必要がある (でないと settling 中スタンが解除されない)。
      L.tickTimer(state, dt);
      if (phase === 'playing') {
        if (state.finished) {
          phase = 'settling';
          settleTimer = 0;
        } else {
          spawnTimerMs += dt * 1000;
          var interval = L.spawnIntervalAt(state.elapsed);
          if (spawnTimerMs >= interval) {
            spawnTimerMs = 0;
            spawnItem();
          }
        }
      } else {
        settleTimer += dt;
      }

      updateBasketPosition();
      basketGeom = computeBasketGeom();
      updateItems(dt, basketGeom);
      updateHud();

      if (phase === 'settling' && (items.length === 0 || settleTimer >= 2)) {
        finishGame();
      }
    } else {
      updateBasketPosition();
      basketGeom = computeBasketGeom();
    }

    drawItems();
    drawPonoAndBasket(basketGeom);
    updateAndDrawParticles(dt);
    updateAndDrawConfetti(dt);
    updateAndDrawPopups(dt);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
