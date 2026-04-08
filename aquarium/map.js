/**
 * map.js — 水族館マップ画面
 * museums.json からゾーンを読み込み PIXI で 2D マップを描画。
 * open ゾーンをタップ → aquarium/index.html?zone=<id> に遷移。
 * locked ゾーンをタップ → トースト表示。
 */
(function () {
  'use strict';

  // ── Toast helper ────────────────────────────────────────────────────────────
  let _toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('mapToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  // ── PIXI setup ───────────────────────────────────────────────────────────────
  const canvas = document.getElementById('map-canvas');
  const W = () => canvas.offsetWidth || window.innerWidth;
  const H = () => canvas.offsetHeight || (window.innerHeight - 56);

  const app = new PIXI.Application({
    view: canvas,
    width: W(),
    height: H(),
    backgroundColor: 0x061428,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true
  });

  // ── Background gradient (drawn on Graphics) ─────────────────────────────────
  const bg = new PIXI.Graphics();
  app.stage.addChild(bg);

  function drawBackground() {
    bg.clear();
    const w = app.renderer.width / app.renderer.resolution;
    const h = app.renderer.height / app.renderer.resolution;

    // Deep ocean gradient via horizontal bands
    const bands = [
      [0,      0x0A2647],
      [0.35,   0x0C3260],
      [0.70,   0x0A1A3A],
      [1.00,   0x061028]
    ];
    bands.forEach(([frac, col], i) => {
      if (i === 0) return;
      const [prevFrac, prevCol] = bands[i - 1];
      const y0 = h * prevFrac, y1 = h * frac;
      bg.beginFill(col, 1);
      bg.drawRect(0, y0, w, y1 - y0);
      bg.endFill();
    });

    // Subtle bubble dots
    bg.beginFill(0x1E4F8C, 0.12);
    for (let i = 0; i < 30; i++) {
      const bx = (Math.sin(i * 137.5) * 0.5 + 0.5) * w;
      const by = (Math.cos(i * 97.3) * 0.5 + 0.5) * h;
      const br = 3 + (i % 5) * 2;
      bg.drawCircle(bx, by, br);
    }
    bg.endFill();
  }

  // ── Zone cards container ─────────────────────────────────────────────────────
  const zoneContainer = new PIXI.Container();
  app.stage.addChild(zoneContainer);

  function hexStr(s) {
    // Convert "0x2EB5E0" or "#2EB5E0" to number
    if (!s) return 0x2EB5E0;
    return parseInt(s.replace('0x', '').replace('#', ''), 16);
  }

  function buildZoneCard(zone, cw, ch) {
    const container = new PIXI.Container();
    const isOpen = zone.status === 'open';

    const cx = zone.mapX * cw;
    const cy = zone.mapY * ch;

    // Card dimensions: responsive to screen
    const cardW = Math.min(cw * 0.34, 160);
    const cardH = Math.min(ch * 0.28, 130);
    const r = 20;

    // Shadow
    const shadow = new PIXI.Graphics();
    shadow.beginFill(0x000000, 0.35);
    shadow.drawRoundedRect(-cardW / 2 + 4, -cardH / 2 + 4, cardW, cardH, r);
    shadow.endFill();
    container.addChild(shadow);

    // Card body
    const card = new PIXI.Graphics();
    const tint = hexStr(zone.tint);
    if (isOpen) {
      card.beginFill(tint, 0.88);
    } else {
      card.beginFill(0x1A2A3A, 0.72);
    }
    card.lineStyle(isOpen ? 2.5 : 1.5,
      isOpen ? 0xFFFFFF : 0x445566, isOpen ? 0.4 : 0.25);
    card.drawRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, r);
    card.endFill();
    container.addChild(card);

    // Locked overlay
    if (!isOpen) {
      const lockOverlay = new PIXI.Graphics();
      lockOverlay.beginFill(0x000000, 0.3);
      lockOverlay.drawRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, r);
      lockOverlay.endFill();
      container.addChild(lockOverlay);
    }

    // Icon (emoji rendered via Text)
    const iconStyle = new PIXI.TextStyle({
      fontSize: Math.round(cardH * 0.32),
      fill: '#ffffff'
    });
    const iconText = new PIXI.Text(zone.icon || '🐠', iconStyle);
    iconText.anchor.set(0.5);
    iconText.y = -cardH * 0.14;
    if (!isOpen) iconText.alpha = 0.4;
    container.addChild(iconText);

    // Display name
    const nameStyle = new PIXI.TextStyle({
      fontFamily: 'Zen Maru Gothic, sans-serif',
      fontSize: Math.max(12, Math.round(cardH * 0.16)),
      fontWeight: '900',
      fill: isOpen ? '#ffffff' : '#7799AA',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: cardW - 16
    });
    const nameText = new PIXI.Text(zone.displayName, nameStyle);
    nameText.anchor.set(0.5);
    nameText.y = cardH * 0.18;
    container.addChild(nameText);

    // Lock icon for locked zones
    if (!isOpen) {
      const lockStyle = new PIXI.TextStyle({ fontSize: Math.round(cardH * 0.18), fill: '#7799AA' });
      const lockIcon = new PIXI.Text('🔒', lockStyle);
      lockIcon.anchor.set(0.5);
      lockIcon.y = cardH * 0.36;
      container.addChild(lockIcon);
    }

    container.x = cx;
    container.y = cy;

    // Hit area (larger than visual for easier tapping)
    container.interactive = true;
    container.buttonMode = isOpen;
    container.hitArea = new PIXI.Rectangle(-cardW / 2 - 10, -cardH / 2 - 10, cardW + 20, cardH + 20);

    // Tap handler
    container.on('pointertap', () => {
      if (isOpen) {
        location.href = 'index.html?zone=' + zone.id;
      } else {
        showToast('もうすぐ あそべるよ！');
      }
    });

    // Hover/press effect for open zones
    if (isOpen) {
      container.on('pointerdown', () => {
        container.scale.set(0.95);
      });
      container.on('pointerup', () => {
        container.scale.set(1.0);
      });
      container.on('pointerupoutside', () => {
        container.scale.set(1.0);
      });
    }

    return container;
  }

  // ── Render zones ─────────────────────────────────────────────────────────────
  function renderZones(zones) {
    zoneContainer.removeChildren();
    const cw = app.renderer.width  / app.renderer.resolution;
    const ch = app.renderer.height / app.renderer.resolution;

    zones.forEach(zone => {
      const card = buildZoneCard(zone, cw, ch);
      zoneContainer.addChild(card);
    });
  }

  // ── Resize handler ──────────────────────────────────────────────────────────
  let _zones = [];
  function onResize() {
    const w = W();
    const h = H();
    app.renderer.resize(w, h);
    drawBackground();
    if (_zones.length) renderZones(_zones);
  }
  window.addEventListener('resize', onResize);

  // ── Load data and init ──────────────────────────────────────────────────────
  drawBackground();

  window.MuseumData.load('..').then(() => {
    _zones = window.MuseumData.getZones();
    renderZones(_zones);
  }).catch(err => {
    console.error('[map.js] MuseumData load failed:', err);
    showToast('よみこみ エラー');
  });

  // ── Gentle bubble float animation ───────────────────────────────────────────
  const bubbles = [];
  (function initBubbles() {
    const w = W(), h = H();
    for (let i = 0; i < 8; i++) {
      const g = new PIXI.Graphics();
      const r = 4 + Math.random() * 6;
      g.lineStyle(1, 0x7DD3FC, 0.3);
      g.drawCircle(0, 0, r);
      g.x = Math.random() * w;
      g.y = Math.random() * h;
      const speed = 0.3 + Math.random() * 0.5;
      bubbles.push({ g, speed, r, startY: g.y });
      app.stage.addChild(g);
    }
  })();

  app.ticker.add(() => {
    const h = app.renderer.height / app.renderer.resolution;
    bubbles.forEach(b => {
      b.g.y -= b.speed;
      b.g.alpha = 0.15 + 0.15 * Math.sin(Date.now() * 0.001 + b.r);
      if (b.g.y < -20) {
        b.g.y = h + 20;
        b.g.x = Math.random() * (app.renderer.width / app.renderer.resolution);
      }
    });
  });

})();
