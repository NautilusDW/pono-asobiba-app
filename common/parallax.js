// ════════════════════════════════════════════════════════════
// Parallax Scene Runtime
// 背景エディタ (/tools/bg-editor.html) で作ったシーンをゲームから読み込む。
//
// Usage:
//   const scene = await ParallaxScene.load('/assets/scenes/forest.json');
//   scene.attach(document.getElementById('myCanvas'));
//   scene.setCameraX(player.x * 0.5);   // ゲームループから毎フレーム
//   scene.start();                       // 内部 RAF 起動 (autoScroll, repaint)
//   scene.stop();
//
// グローバル: window.ParallaxScene
// ════════════════════════════════════════════════════════════
(function (global) {
  'use strict';

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('image load failed: ' + src));
      img.src = src;
    });
  }

  // Resolve serialized asset src → real URL the browser can fetch.
  // Blocks: external HTTP(S), path traversal, unknown schemes.
  function resolveAssetSrc(src, sceneBaseURL) {
    if (typeof src !== 'string' || !src) return null;
    if (src.startsWith('data:image/')) return src;             // inline image — OK
    if (src.startsWith('/assets/')) {
      if (src.includes('..')) return null;
      return src;
    }
    if (src.startsWith('assets:')) {
      const rel = src.slice('assets:'.length).replace(/^\/+/, '');
      if (rel.includes('..')) { console.warn('[parallax] traversal rejected:', src); return null; }
      return '/assets/images/' + rel;
    }
    if (src.startsWith('idb:')) {
      console.warn('[parallax] idb: src cannot be resolved at runtime. Re-export scene with inline assets:', src);
      return null;
    }
    // External (http/https) and other schemes are blocked by default.
    if (/^https?:\/\//i.test(src)) {
      console.warn('[parallax] external URL rejected:', src);
      return null;
    }
    // Relative path: only allow if it resolves under same-origin /assets/
    if (sceneBaseURL) {
      try {
        const u = new URL(src, sceneBaseURL);
        if (u.origin !== new URL(sceneBaseURL, location.href).origin) return null;
        if (!u.pathname.startsWith('/assets/')) return null;
        if (u.pathname.includes('..')) return null;
        return u.toString();
      } catch (e) { return null; }
    }
    return null;
  }

  function drawScene(ctx, scene, assetMap, cameraX, cameraY, tSec) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    if (scene.bgColor) {
      ctx.fillStyle = scene.bgColor;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.clearRect(0, 0, W, H);
    }

    for (const layer of scene.layers) {
      if (layer.visible === false) continue;
      ctx.save();
      ctx.globalAlpha = (layer.opacity != null ? layer.opacity : 1);
      ctx.globalCompositeOperation = layer.blendMode || 'source-over';
      const camX = cameraX * (layer.parallaxX || 0) - (layer.autoScrollX || 0) * tSec;
      const camY = cameraY * (layer.parallaxY || 0);

      if (layer.mode === 'tile') {
        drawTileLayer(ctx, layer, assetMap, camX, camY, W, H);
      } else if (layer.mode === 'sprites') {
        drawSpriteLayer(ctx, layer, assetMap, camX, camY, W, H);
      }
      ctx.restore();
    }
  }

  function drawTileLayer(ctx, layer, assetMap, camX, camY, W, H) {
    const img = assetMap.get(layer.srcAssetId);
    if (!img) return;
    const scale = layer.scale || 1;
    const sw = img.naturalWidth * scale;
    const sh = img.naturalHeight * scale;
    if (sw <= 0 || sh <= 0) return;
    let baseY = 0;
    if (layer.anchor === 'bottom') baseY = H - sh;
    else if (layer.anchor === 'center') baseY = (H - sh) / 2;
    baseY += (layer.offsetY || 0) - camY;

    if (layer.repeatX) {
      const startX = -(((camX % sw) + sw) % sw);
      if (layer.repeatY) {
        const startY = baseY - Math.ceil(baseY / sh) * sh;
        for (let y = startY; y < H; y += sh) {
          for (let x = startX; x < W; x += sw) ctx.drawImage(img, x, y, sw, sh);
        }
      } else {
        for (let x = startX; x < W; x += sw) ctx.drawImage(img, x, baseY, sw, sh);
      }
    } else {
      if (layer.repeatY) {
        const x = -camX;
        for (let y = baseY - Math.ceil(baseY / sh) * sh; y < H; y += sh) ctx.drawImage(img, x, y, sw, sh);
      } else {
        ctx.drawImage(img, -camX, baseY, sw, sh);
      }
    }
  }

  function drawSpriteLayer(ctx, layer, assetMap, camX, camY, W, H) {
    for (const sp of layer.sprites) {
      const img = assetMap.get(sp.assetId);
      if (!img) continue;
      const scale = sp.scale || 1;
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      const x = sp.x - camX - w / 2;
      const y = sp.y - camY - h / 2;
      if (x + w < -200 || x > W + 200) continue; // cull
      if (sp.opacity != null && sp.opacity !== 1) {
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = prev * sp.opacity;
        if (sp.flipX) {
          ctx.save();
          ctx.translate(x + w / 2, 0); ctx.scale(-1, 1);
          ctx.drawImage(img, -w / 2, y, w, h);
          ctx.restore();
        } else {
          ctx.drawImage(img, x, y, w, h);
        }
        ctx.globalAlpha = prev;
      } else if (sp.flipX) {
        ctx.save();
        ctx.translate(x + w / 2, 0); ctx.scale(-1, 1);
        ctx.drawImage(img, -w / 2, y, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(img, x, y, w, h);
      }
    }
  }

  class ParallaxSceneInstance {
    constructor(sceneData, assetMap, sceneBaseURL) {
      this.scene = sceneData;
      this.assetMap = assetMap;        // assetId -> Image
      this.sceneBaseURL = sceneBaseURL;
      this.canvas = null;
      this.ctx = null;
      this.cameraX = 0;
      this.cameraY = 0;
      this._rafId = null;
      this._startTime = 0;
      this._running = false;
    }

    attach(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      // Set canvas drawing buffer to scene viewport (caller may also override CSS size)
      if (this.scene.viewport) {
        if (!canvas.width || canvas.width === 300)  canvas.width = this.scene.viewport.w;
        if (!canvas.height || canvas.height === 150) canvas.height = this.scene.viewport.h;
      }
      this.render(0);
      return this;
    }

    setCameraX(x) { this.cameraX = x; }
    setCameraY(y) { this.cameraY = y; }
    getWorldWidth() { return this.scene.worldWidth || 0; }

    render(tSec) {
      if (!this.ctx) return;
      drawScene(this.ctx, this.scene, this.assetMap, this.cameraX, this.cameraY, tSec);
    }

    start() {
      if (this._running) return this;
      this._running = true;
      this._startTime = performance.now();
      const tick = (t) => {
        if (!this._running) return;
        const tSec = (t - this._startTime) / 1000;
        this.render(tSec);
        this._rafId = requestAnimationFrame(tick);
      };
      this._rafId = requestAnimationFrame(tick);
      return this;
    }

    stop() {
      this._running = false;
      if (this._rafId) cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    destroy() {
      this.stop();
      this.canvas = null;
      this.ctx = null;
    }
  }

  async function load(jsonURL) {
    const res = await fetch(jsonURL);
    if (!res.ok) throw new Error('scene fetch failed: ' + res.status);
    const data = await res.json();
    return loadFromObject(data, jsonURL);
  }

  async function loadFromObject(data, sceneBaseURL) {
    if (!data || !data.layers) throw new Error('invalid scene JSON');
    const assetMap = new Map();
    const assets = data._assets || [];
    await Promise.all(assets.map(async meta => {
      const url = resolveAssetSrc(meta.src, sceneBaseURL);
      if (!url) return;
      try {
        const img = await loadImage(url);
        assetMap.set(meta.id, img);
      } catch (e) { console.warn('[parallax] asset load failed:', meta, e); }
    }));
    return new ParallaxSceneInstance(data, assetMap, sceneBaseURL);
  }

  // Build a scene programmatically (for /tools/bg-editor-demo.html)
  function fromImages(layerSpecs) {
    // layerSpecs: [{ img, parallaxX, parallaxY, anchor, scale, opacity, autoScrollX, repeatX, repeatY }]
    const assetMap = new Map();
    const layers = layerSpecs.map((s, i) => {
      const id = 'a' + i;
      assetMap.set(id, s.img);
      return {
        id: 'l' + i,
        name: s.name || ('layer' + i),
        mode: 'tile',
        visible: true,
        parallaxX: s.parallaxX != null ? s.parallaxX : 0.5,
        parallaxY: s.parallaxY || 0,
        opacity: s.opacity != null ? s.opacity : 1,
        blendMode: s.blendMode || 'source-over',
        autoScrollX: s.autoScrollX || 0,
        srcAssetId: id,
        repeatX: s.repeatX !== false,
        repeatY: !!s.repeatY,
        anchor: s.anchor || 'bottom',
        scale: s.scale || 1,
        offsetY: s.offsetY || 0
      };
    });
    const scene = {
      version: 1,
      name: 'programmatic',
      viewport: { w: 1280, h: 720 },
      worldWidth: 5120,
      bgColor: '#000000',
      layers
    };
    return new ParallaxSceneInstance(scene, assetMap, null);
  }

  global.ParallaxScene = { load, loadFromObject, fromImages, drawScene };
})(typeof window !== 'undefined' ? window : globalThis);
