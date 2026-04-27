// maze/image-runtime.js
// Phase 1: image-based maze stage runtime.
// Polyline walking + camera follow. No image processing yet (Phase 2).
// Stage data is hand-authored JSON: see imageStages/sample1.json
//
// Exposes window.MazeImage with:
//   buildStage(stageDef)           prepare runtime stage
//   computeAutoWalk(stage, id, dir) pick edge by initial tangent vs arrow
//   interpolate(poly, cum, t)      position+tangent along polyline
//   tangentToFace(tx, ty)          quantize to 4-dir for sprite
//   updateCamera(stage, x, y, ...) lerp+clamp camera
//   computeScale(stage, vw, vh)    scale = CSS px per world px
//   worldToScreen(stage, x, y, ...) world → screen
//   isPortrait()                   true if viewport is portrait

(function (global) {
  'use strict';

  function _finite(n) { return typeof n === 'number' && Number.isFinite(n); }
  function _validPoint(p) { return p && _finite(p.x) && _finite(p.y); }

  function buildStage(stageDef) {
    if (!stageDef || stageDef.type !== 'image') {
      throw new Error('MazeImage.buildStage: stageDef.type must be "image"');
    }
    if (!Array.isArray(stageDef.nodes) || !Array.isArray(stageDef.edges)) {
      throw new Error('MazeImage.buildStage: nodes/edges required');
    }
    // viewBox numeric check
    var vb = stageDef.viewBox || { w: 1920, h: 1080 };
    if (!_finite(vb.w) || !_finite(vb.h) || vb.w <= 0 || vb.h <= 0) {
      throw new Error('MazeImage.buildStage: invalid viewBox');
    }
    var nodesById = Object.create(null);
    for (var i = 0; i < stageDef.nodes.length; i++) {
      var n = stageDef.nodes[i];
      if (!n || typeof n.id !== 'string' || !_validPoint(n)) {
        throw new Error('MazeImage.buildStage: invalid node at index ' + i);
      }
      nodesById[n.id] = n;
    }
    var start = stageDef.nodes.find(function (n) { return n.kind === 'start'; });
    var goal  = stageDef.nodes.find(function (n) { return n.kind === 'goal';  });
    if (!start) throw new Error('image stage: no start node');
    if (!goal)  throw new Error('image stage: no goal node');

    var edges = stageDef.edges.map(function (e) {
      if (!nodesById[e.from] || !nodesById[e.to]) {
        throw new Error('image stage: edge refs missing node: ' + e.from + '→' + e.to);
      }
      if (!Array.isArray(e.polyline) || e.polyline.length < 2) {
        throw new Error('image stage: edge ' + e.from + '→' + e.to + ' polyline too short');
      }
      var cum = [0];
      var total = 0;
      for (var i = 1; i < e.polyline.length; i++) {
        if (!_validPoint(e.polyline[i]) || !_validPoint(e.polyline[i - 1])) {
          throw new Error('image stage: invalid polyline coord on edge ' + e.from + '→' + e.to);
        }
        var dx = e.polyline[i].x - e.polyline[i - 1].x;
        var dy = e.polyline[i].y - e.polyline[i - 1].y;
        total += Math.sqrt(dx * dx + dy * dy);
        cum.push(total);
      }
      return { from: e.from, to: e.to, polyline: e.polyline, length: total, cumLengths: cum };
    });

    var adjacency = Object.create(null);
    for (var k = 0; k < stageDef.nodes.length; k++) {
      adjacency[stageDef.nodes[k].id] = [];
    }
    for (var j = 0; j < edges.length; j++) {
      var ed = edges[j];
      adjacency[ed.from].push({ edge: ed, reversed: false, otherId: ed.to });
      adjacency[ed.to  ].push({ edge: ed, reversed: true,  otherId: ed.from });
    }

    var imageEl = null;
    if (stageDef.imageUrl) {
      imageEl = new Image();
      imageEl.onerror = function () {
        try { console.warn('[MazeImage] image failed to load:', stageDef.imageUrl); } catch (e) {}
      };
      imageEl.src = stageDef.imageUrl;
    }

    // Obstacles and creatures: pass through, validate coords if present.
    const obstacles = Array.isArray(stageDef.obstacles)
      ? stageDef.obstacles.filter(function(o) { return o && _validPoint(o); })
      : [];
    const creatures = Array.isArray(stageDef.creatures)
      ? stageDef.creatures.filter(function(c) { return c && _validPoint(c); })
      : [];

    return {
      type: 'image',
      name: stageDef.name || '',
      image: imageEl,
      viewBox: vb,
      cameraFollow: stageDef.cameraFollow !== false,
      orientation: stageDef.orientation || 'landscape',
      lantern: stageDef.lantern || false, // boolean or { innerRadius, outerRadius, ... }
      obstacles: obstacles,
      creatures: creatures,
      nodesById: nodesById,
      nodes: stageDef.nodes,
      edges: edges,
      adjacency: adjacency,
      start: start,
      goal: goal,
      camera: { x: start.x, y: start.y },
      // shims for HUD code that reads these on grid stages:
      totalApples: 0,
      cells: null,
    };
  }

  function angleDiff(a, b) {
    var d = Math.abs(a - b) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
  }

  function reverseCumLengths(cum) {
    var total = cum[cum.length - 1];
    var out = new Array(cum.length);
    for (var i = 0; i < cum.length; i++) out[i] = total - cum[cum.length - 1 - i];
    return out;
  }

  // arrowDir: { dx, dy } where (dx,dy) is one of (0,-1)(0,1)(-1,0)(1,0).
  // Returns walk plan or null if no edge within 60° tolerance.
  function computeAutoWalk(stage, currentNodeId, arrowDir) {
    var adj = stage.adjacency[currentNodeId] || [];
    var arrowAngle = Math.atan2(arrowDir.dy, arrowDir.dx);
    var TOLERANCE = Math.PI / 3; // 60°
    var best = null, bestDiff = Infinity;
    for (var i = 0; i < adj.length; i++) {
      var a = adj[i];
      var poly = a.reversed ? a.edge.polyline.slice().reverse() : a.edge.polyline;
      if (poly.length < 2) continue;
      var dx = poly[1].x - poly[0].x;
      var dy = poly[1].y - poly[0].y;
      var diff = angleDiff(arrowAngle, Math.atan2(dy, dx));
      if (diff < bestDiff) { bestDiff = diff; best = { adj: a, poly: poly }; }
    }
    if (!best || bestDiff > TOLERANCE) return null;

    var cum = best.adj.reversed
      ? reverseCumLengths(best.adj.edge.cumLengths)
      : best.adj.edge.cumLengths;

    return {
      edge: best.adj.edge,
      reversed: best.adj.reversed,
      otherId: best.adj.otherId,
      polyline: best.poly,
      cumLengths: cum,
      length: best.adj.edge.length,
    };
  }

  // Position + unit tangent along polyline at progress t in [0,1].
  function interpolate(polyline, cumLengths, t) {
    if (polyline.length === 0) return { x: 0, y: 0, tx: 1, ty: 0 };
    if (polyline.length === 1) return { x: polyline[0].x, y: polyline[0].y, tx: 1, ty: 0 };
    var total = cumLengths[cumLengths.length - 1];
    if (total === 0) return { x: polyline[0].x, y: polyline[0].y, tx: 1, ty: 0 };
    var clamped = t < 0 ? 0 : (t > 1 ? 1 : t);
    var target = clamped * total;
    var i = 1;
    while (i < cumLengths.length && cumLengths[i] < target) i++;
    if (i >= polyline.length) i = polyline.length - 1;
    var segStart = cumLengths[i - 1];
    var segLen = cumLengths[i] - segStart;
    var localT = segLen > 0 ? (target - segStart) / segLen : 0;
    var a = polyline[i - 1], b = polyline[i];
    var dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: a.x + dx * localT, y: a.y + dy * localT, tx: dx / len, ty: dy / len };
  }

  // Quantize unit tangent to one of 4 cardinals for the existing sprite system.
  function tangentToFace(tx, ty) {
    if (Math.abs(tx) >= Math.abs(ty)) return { dr: 0, dc: tx >= 0 ? 1 : -1 };
    return { dr: ty >= 0 ? 1 : -1, dc: 0 };
  }

  // dt: seconds since last frame. Time-independent smoothing.
  function updateCamera(stage, targetX, targetY, viewportW, viewportH, dt, scale) {
    if (!stage.cameraFollow) {
      stage.camera.x = stage.viewBox.w / 2;
      stage.camera.y = stage.viewBox.h / 2;
      return;
    }
    var lerp = 1 - Math.exp(-dt * 8);
    stage.camera.x += (targetX - stage.camera.x) * lerp;
    stage.camera.y += (targetY - stage.camera.y) * lerp;
    var halfW = (viewportW / scale) / 2;
    var halfH = (viewportH / scale) / 2;
    if (stage.viewBox.w * scale >= viewportW) {
      stage.camera.x = Math.max(halfW, Math.min(stage.viewBox.w - halfW, stage.camera.x));
    } else {
      stage.camera.x = stage.viewBox.w / 2;
    }
    if (stage.viewBox.h * scale >= viewportH) {
      stage.camera.y = Math.max(halfH, Math.min(stage.viewBox.h - halfH, stage.camera.y));
    } else {
      stage.camera.y = stage.viewBox.h / 2;
    }
  }

  // CSS px per world px.
  // Landscape stages: fit image height to viewport (96% margin), let width scroll horizontally.
  // Edge case: if the image's aspect ratio is taller than viewport's, height-fit would make
  // the image wider than the viewport, which is fine (horizontal scroll). If the image is
  // narrower than viewport at fit-height, we'd see letterboxing on left/right — acceptable.
  function computeScale(stage, viewportW, viewportH) {
    var fitH = (viewportH * 0.96) / stage.viewBox.h;
    return fitH;
  }

  function worldToScreen(stage, x, y, viewportW, viewportH, scale) {
    return {
      x: viewportW / 2 + (x - stage.camera.x) * scale,
      y: viewportH / 2 + (y - stage.camera.y) * scale,
    };
  }

  function isPortrait() {
    return window.innerHeight > window.innerWidth;
  }

  global.MazeImage = {
    buildStage: buildStage,
    computeAutoWalk: computeAutoWalk,
    interpolate: interpolate,
    tangentToFace: tangentToFace,
    updateCamera: updateCamera,
    computeScale: computeScale,
    worldToScreen: worldToScreen,
    isPortrait: isPortrait,
  };
})(typeof window !== 'undefined' ? window : this);
