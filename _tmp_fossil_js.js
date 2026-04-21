
;

;

;

'use strict';

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
var gameState = 'WORLDMAP';
var currentStageIdx = 0;

// Tile types
// 0-5: legacy (stages 2/3). 6-11: v2 stage-1 overhaul (cliff/outcrop/slope/dry-wash/forest/nodule).
var T = {
  SAND:0, ROCK:1, CACTUS:2, RUIN:3, TENT:4, BONE:5,
  CLIFF:6, OUTCROP:7, SLOPE:8, DRY_WASH:9, FOREST_LIGHT:10, NODULE:11
};

// Stages layout: each cell is T.*
// Stage 0: 昼の砂漠 (10x7)
// Stage 1: 遺跡砂漠 (10x7)
// Stage 2: 夕焼け砂漠 (10x7)
var STAGES = [
  {
    // Stage 1 (v2): cliff/outcrop/nodule mix — see plan 2026-04-22
    mode: 'v2',
    cols: 10, rows: 7,
    fossils: [
      // Flat list kept so the existing stage-complete gate (stage.fossils.every(dug))
      // and achievement counters work unchanged. Coordinates match outcrop/nodule positions.
      { id:'Brachiosaurus', r:1, c:1 },  // outcrop
      { id:'Pteranodon',    r:6, c:5 },  // outcrop
      { id:'Triceratops',   r:1, c:9 },  // nodule
      { id:'Stegosaurus',   r:4, c:2 }   // nodule
    ],
    spawn: { r:3, c:0 },
    cells: [
      // 6=CLIFF 7=OUTCROP 8=SLOPE 9=DRY_WASH 10=FOREST_LIGHT 11=NODULE
      [6, 6, 6, 6, 6, 0, 0,10,10, 0],
      [6, 7, 0, 0, 6, 0, 0, 0, 0,11],
      [8, 0, 0, 0, 8, 0, 9, 0, 0, 0],
      [4, 0, 0, 0, 0, 0, 9, 0, 0,11],
      [0, 0,11, 0, 0, 0, 9, 0, 0, 0],
      [0, 0, 0, 0, 8, 8, 8, 0,10, 0],
      [0, 0,10, 0, 6, 7, 6, 6, 6, 6]
    ],
    outcrops: [
      { r:1, c:1, fossilId:'Brachiosaurus', fossilLayer:1,
        layerColors:['#C8A878','#A6864E','#7F6138','#5A4126'] },
      { r:6, c:5, fossilId:'Pteranodon', fossilLayer:2,
        layerColors:['#C8A878','#A6864E','#7F6138','#5A4126'] }
    ],
    nodules: [
      { r:1, c:9, content:{ kind:'fossil', fossilId:'Triceratops' } },
      { r:3, c:9, content:{ kind:'gem' } },
      { r:4, c:2, content:{ kind:'fossil', fossilId:'Stegosaurus' } },
      { r:6, c:2, content:{ kind:'empty' } }
    ],
    // Bone-chip density (1..3). Biased toward outcrop neighborhoods and dry washes.
    kakera: [
      { r:2, c:1, n:3 }, { r:2, c:2, n:2 }, { r:1, c:2, n:2 }, { r:3, c:1, n:1 },
      { r:5, c:4, n:2 }, { r:5, c:5, n:3 }, { r:5, c:6, n:2 }, { r:5, c:7, n:1 },
      { r:2, c:9, n:2 }, { r:3, c:8, n:1 }, { r:2, c:7, n:1 },
      { r:4, c:1, n:2 }, { r:4, c:3, n:2 }, { r:5, c:2, n:2 }, { r:6, c:1, n:1 }
    ]
  },
  {
    cols: 10, rows: 7,
    fossils: [
      { id:'Tyrannosaurus', r:2, c:5 },
      { id:'Raptor',        r:5, c:2 },
      { id:'Ankylosaurus',  r:1, c:8 },
      { id:'Spinosaurus',   r:4, c:6 },
      { id:'Plesiosaur',    r:6, c:8 }
    ],
    spawn: { r:0, c:0 },
    cells: [
      [0,0,3,0,0,0,0,0,3,0],
      [0,0,0,0,3,0,0,0,0,0],
      [0,3,0,0,0,0,0,0,3,0],
      [4,0,0,0,0,1,0,0,0,0],
      [0,0,3,0,0,0,0,0,0,0],
      [0,0,0,0,3,0,0,1,0,0],
      [0,1,0,0,0,0,3,0,0,0]
    ]
  },
  {
    cols: 10, rows: 7,
    fossils: [
      { id:'Parasaurolophus',    r:1, c:4 },
      { id:'Pachycephalosaurus', r:3, c:8 },
      { id:'Allosaurus',         r:5, c:3 },
      { id:'Mosasaurus',         r:5, c:7 },
      { id:'Dimetrodon',         r:2, c:1 },
      { id:'Iguanodon',          r:6, c:5 }
    ],
    spawn: { r:3, c:0 },
    cells: [
      [0,0,1,0,0,0,1,0,0,0],
      [0,1,0,0,0,0,0,0,0,1],
      [0,0,0,0,1,0,0,0,0,0],
      [4,0,1,0,0,0,1,0,0,0],
      [0,0,0,0,1,0,0,0,1,0],
      [0,1,0,0,0,0,0,0,0,0],
      [0,0,0,1,0,0,0,0,1,0]
    ]
  }
];

var stage = null;
var pono = { r:0, c:0 };
var walkAnim = null;
var cellSize = 48, gridOX = 0, gridOY = 0;

var collection = loadCollection();

// ═══════════════════════════════════════════════════════
// DOM refs
// ═══════════════════════════════════════════════════════
var gameWrap = document.getElementById('gameWrap');
var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');
var arrowLayer = document.getElementById('arrowLayer');
var hudStage = document.getElementById('hud-stage');
var hudFound = document.getElementById('hud-found');
var btnDig = document.getElementById('btnDig');
var radarSegs = document.getElementById('radarSegs');
var radarText = document.getElementById('radarText');
var radarEmoji = document.getElementById('radarEmoji');
var radarFace = document.getElementById('radarFace');
var edgePulse = document.getElementById('edgePulse');
var hintBubble = document.getElementById('hintBubble');
var flashOv = document.getElementById('flashOv');

// ═══════════════════════════════════════════════════════
// Images: preload pono sprites + dino images
// ═══════════════════════════════════════════════════════
var imgPono = new Image();
imgPono.src = '../assets/images/characters/pono/pono_001.png';
var imgPonoHooray = new Image();
imgPonoHooray.src = '../assets/images/characters/pono/dance/dance_hooray.png';
var imgPonoWave = new Image();
imgPonoWave.src = '../assets/images/characters/pono/dance/dance_wave.png';
var imgPonoPoint = new Image();
imgPonoPoint.src = '../assets/images/characters/pono/dance/dance_point.png';
var imgPonoSmile = new Image();
imgPonoSmile.src = '../assets/images/characters/pono/dance/dance_smile.png';
var imgPonoTilt = new Image();
imgPonoTilt.src = '../assets/images/characters/pono/dance/dance_tilt.png';
var imgHedgeSurprised = new Image();
imgHedgeSurprised.src = '../assets/images/characters/headgehog/headgehog_surprised.png';
var imgHedgeSmile = new Image();
imgHedgeSmile.src = '../assets/images/characters/headgehog/headgehog_smilewavinghands.png';
var imgHedgeWorried = new Image();
imgHedgeWorried.src = '../assets/images/characters/headgehog/headgehog_worried.png';

// Dino image cache
var dinoImgCache = {};
function getDinoImg(id) {
  if (dinoImgCache[id]) return dinoImgCache[id];
  var d = window.getFossilById(id);
  if (!d) return null;
  var img = new Image();
  img.src = d.img;
  dinoImgCache[id] = img;
  return img;
}
// Pre-warm
window.FOSSIL_DATA.forEach(function(d){ getDinoImg(d.id); });

// ═══════════════════════════════════════════════════════
// localStorage
// ═══════════════════════════════════════════════════════
function loadCollection() {
  try {
    var s = localStorage.getItem('pono_fossil_collection');
    return s ? JSON.parse(s) : {};
  } catch (e) { return {}; }
}
function saveCollection() {
  try { localStorage.setItem('pono_fossil_collection', JSON.stringify(collection)); }
  catch (e) { /* ignore */ }
}

// ═══════════════════════════════════════════════════════
// Canvas sizing
// ═══════════════════════════════════════════════════════
function resizeCanvas() {
  var w = gameWrap.clientWidth, h = gameWrap.clientHeight;
  var dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (stage) {
    layoutGrid(w, h);
    showArrows();
  }
}
function layoutGrid(w, h) {
  var padX = 20, padY = 20;
  cellSize = Math.floor(Math.min((w - padX*2) / stage.cols, (h - padY*2) / stage.rows));
  var gridW = cellSize * stage.cols, gridH = cellSize * stage.rows;
  gridOX = Math.floor((w - gridW) / 2);
  gridOY = Math.floor((h - gridH) / 2);
}
window.addEventListener('resize', resizeCanvas);

// ═══════════════════════════════════════════════════════
// Stage loading
// ═══════════════════════════════════════════════════════
function loadStage(idx) {
  currentStageIdx = idx;
  var sdef = STAGES[idx];
  stage = {
    mode: sdef.mode || 'legacy',
    cols: sdef.cols, rows: sdef.rows,
    cells: sdef.cells.map(function(row){ return row.slice(); }),
    fossils: sdef.fossils.map(function(f){ return { id:f.id, r:f.r, c:f.c, dug: !!collection[f.id] }; })
  };
  if (stage.mode === 'v2') {
    // Deep-copy v2-specific arrays so play doesn't mutate STAGES definitions.
    stage.outcrops = (sdef.outcrops || []).map(function(o){
      return {
        r:o.r, c:o.c,
        fossilId:o.fossilId, fossilLayer:o.fossilLayer,
        layerColors:(o.layerColors || []).slice(),
        cleared: !!collection[o.fossilId]
      };
    });
    stage.nodules = (sdef.nodules || []).map(function(n){
      var isFossil = n.content && n.content.kind === 'fossil';
      return {
        r:n.r, c:n.c,
        content: { kind: n.content.kind, fossilId: n.content.fossilId || null },
        opened: isFossil ? !!collection[n.content.fossilId] : false
      };
    });
    stage.kakera = (sdef.kakera || []).map(function(k){
      return { r:k.r, c:k.c, n:k.n };
    });
    // Opened nodules become rubble (walkable) so returning players don't re-enter the loop.
    stage.nodules.forEach(function(n){
      if (n.opened) stage.cells[n.r][n.c] = T.SAND;
    });
  }
  pono.r = sdef.spawn.r;
  pono.c = sdef.spawn.c;
  prevRadarTier = -1; // force radar face/segs refresh on first frame of new stage
  moveIntent = null;
  pendingInteract = null;
  lastKakeraHintAt = 0;
  hudStage.textContent = 'ステージ ' + (idx+1) + ' / ' + STAGES.length;
  // v2 stages replace hot/cold radar with ambient kakera hints + companion bubbles.
  gameWrap.classList.toggle('hide-radar', stage.mode === 'v2');
  updateFoundHud();
  resizeCanvas();
  showArrows();
}

function updateFoundHud() {
  var total = window.FOSSIL_DATA.length;
  var found = Object.keys(collection).length;
  hudFound.textContent = 'みつけた: ' + found + ' / ' + total;
}

// ═══════════════════════════════════════════════════════
// Walkability / movement
// ═══════════════════════════════════════════════════════
function isWalkable(r, c) {
  if (!stage) return false;
  if (r < 0 || r >= stage.rows || c < 0 || c >= stage.cols) return false;
  var t = stage.cells[r][c];
  if (t === T.SAND || t === T.TENT || t === T.BONE) return true;
  // v2 walkable: slope/dry-wash/light-forest. Cliff/outcrop/nodule = not walkable by design
  // (kids tap them from adjacent cells; pending-interact triggers the interaction).
  if (t === T.SLOPE || t === T.DRY_WASH || t === T.FOREST_LIGHT) return true;
  return false;
}

function startWalk(path) {
  if (!path.length) return;
  if (walkAnim) return;
  // Do NOT hide the D-pad here — it caused a blink every 180ms during keyboard /
  // long-press continuous move. D-pad stays visible during WORLDMAP; we only
  // refresh its disabled states when a step completes.
  walkAnim = { path:path, fromR:pono.r, fromC:pono.c, t0:performance.now(), perCell:180 };
}
function finishWalk() {
  if (!walkAnim) return;
  var last = walkAnim.path[walkAnim.path.length-1];
  pono.r = last.r; pono.c = last.c;
  walkAnim = null;
  updateRadarDigBtn();
  // v2: whisper a kakera hint if arrived near dense bone-chips
  maybeSayKakeraHint();
  // v2: if we auto-walked to interact with a nodule/outcrop, fire the interaction now
  if (pendingInteract) {
    var pi = pendingInteract;
    var adj = Math.abs(pi.r - pono.r) + Math.abs(pi.c - pono.c) === 1;
    pendingInteract = null;
    if (adj) {
      if (pi.kind === T.NODULE)  { openNodule(pi.r, pi.c); return; }
      if (pi.kind === T.OUTCROP) { openStrata(pi.r, pi.c); return; }
    }
  }
  // If a continuous intent is active and we didn't land on a fossil, keep going
  if (moveIntent && !btnDig.classList.contains('show')) {
    advanceOneStepFromIntent();
    if (walkAnim) return;
  }
  showArrows();
}

function fossilAt(r, c) {
  if (!stage) return null;
  for (var i = 0; i < stage.fossils.length; i++) {
    var f = stage.fossils[i];
    if (!f.dug && f.r === r && f.c === c) return f;
  }
  return null;
}

// ═══════════════════════════════════════════════════════
// Pathfinding (BFS) for tap-to-walk
// ═══════════════════════════════════════════════════════
function findPathBFS(sr, sc, tr, tc) {
  if (!stage) return null;
  if (sr === tr && sc === tc) return [];
  if (!isWalkable(tr, tc)) return null;
  var rows = stage.rows, cols = stage.cols;
  var total = rows * cols;
  var visited = new Uint8Array(total);
  var parent = new Int32Array(total);
  for (var i = 0; i < total; i++) parent[i] = -1;
  var start = sr*cols + sc;
  var goal = tr*cols + tc;
  var q = [start];
  var qHead = 0;
  visited[start] = 1;
  var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  var found = false;
  while (qHead < q.length) {
    var cur = q[qHead++]; // O(1) dequeue via head index (avoids O(n) shift)
    if (cur === goal) { found = true; break; }
    var r = Math.floor(cur/cols), c = cur%cols;
    for (var k = 0; k < 4; k++) {
      var nr = r+dirs[k][0], nc = c+dirs[k][1];
      if (nr<0||nr>=rows||nc<0||nc>=cols) continue;
      var idx = nr*cols + nc;
      if (visited[idx] || !isWalkable(nr, nc)) continue;
      visited[idx] = 1; parent[idx] = cur; q.push(idx);
    }
  }
  if (!found) return null;
  var path = [];
  var node = goal;
  while (node !== start) {
    var r2 = Math.floor(node/cols), c2 = node%cols;
    var p = parent[node];
    var pr = Math.floor(p/cols), pc = p%cols;
    path.push({ r:r2, c:c2, dr:r2-pr, dc:c2-pc });
    node = p;
  }
  return path.reverse();
}
function truncateAtFossil(path) {
  for (var i = 0; i < path.length; i++) {
    if (fossilAt(path[i].r, path[i].c)) return path.slice(0, i+1);
  }
  return path;
}

// ═══════════════════════════════════════════════════════
// Continuous movement intent (D-pad long-press / keyboard hold)
// ═══════════════════════════════════════════════════════
var moveIntent = null; // { dr, dc, source }
var dpadBtns = null;
var pendingInteract = null; // { kind:T.NODULE|T.OUTCROP, r, c } — fired from finishWalk after BFS adjacency walk
var lastKakeraHintAt = 0;

// v2 — after every step check if the new neighborhood is kakera-rich and tell kids via bubble
var KAKERA_HINT_LINES = [
  'ここ しろい すな！',
  'ほねの かけらが あるよ！',
  'なにか ある きがする！',
  'この へん あやしい！'
];
function maybeSayKakeraHint() {
  if (!stage || stage.mode !== 'v2') return;
  var now = performance.now();
  if (now - lastKakeraHintAt < 3000) return;
  var best = 0;
  for (var dr = -1; dr <= 1; dr++) {
    for (var dc = -1; dc <= 1; dc++) {
      var k = kakeraAt(pono.r + dr, pono.c + dc);
      if (k && k.n > best) best = k.n;
    }
  }
  if (best < 2) return;
  lastKakeraHintAt = now;
  var msg = KAKERA_HINT_LINES[Math.floor(Math.random() * KAKERA_HINT_LINES.length)];
  if (!hintBubble) return;
  hintBubble.textContent = msg;
  hintBubble.style.display = 'block';
  setTimeout(function(){
    if (hintBubble) hintBubble.style.display = 'none';
  }, 1500);
  try { speakJa(msg); } catch(_){}
}
function findAdjacentWalkable(tr, tc) {
  var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (var k = 0; k < 4; k++) {
    var nr = tr + dirs[k][0], nc = tc + dirs[k][1];
    if (isWalkable(nr, nc)) return { r:nr, c:nc };
  }
  return null;
}

function startContinuousMove(dr, dc, source) {
  if (gameState !== 'WORLDMAP') return;
  if (moveIntent && moveIntent.source === source
      && moveIntent.dr === dr && moveIntent.dc === dc) return;
  moveIntent = { dr: dr, dc: dc, source: source };
  if (!walkAnim) advanceOneStepFromIntent();
}
function stopContinuousMove(source) {
  if (moveIntent && moveIntent.source === source) moveIntent = null;
}
function advanceOneStepFromIntent() {
  if (!moveIntent || walkAnim) return;
  var nr = pono.r + moveIntent.dr;
  var nc = pono.c + moveIntent.dc;
  if (!isWalkable(nr, nc)) return; // wall blocks; intent stays until released
  startWalk([{ r:nr, c:nc, dr:moveIntent.dr, dc:moveIntent.dc }]);
}

function initDpad() {
  var dpad = document.getElementById('dpad');
  if (!dpad) return;
  dpadBtns = dpad.querySelectorAll('.dpad-btn');
  dpadBtns.forEach(function(btn){
    var dr = parseInt(btn.dataset.dr, 10);
    var dc = parseInt(btn.dataset.dc, 10);
    btn.addEventListener('pointerdown', function(e){
      e.preventDefault();
      if (gameState !== 'WORLDMAP') return;
      if (btn.disabled) return;
      btn.classList.add('pressed');
      if (btn.setPointerCapture) { try { btn.setPointerCapture(e.pointerId); } catch(_){} }
      playTap();
      startContinuousMove(dr, dc, 'dpad');
    });
    var release = function(){
      btn.classList.remove('pressed');
      stopContinuousMove('dpad');
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    // NOTE: no pointerleave listener. It conflicts with setPointerCapture
    // (capture suppresses leave) AND fires on multi-touch / finger-drift,
    // killing continuous move mid-press on kids' chaotic touches.
  });
}

// ═══════════════════════════════════════════════════════
// Arrow / D-pad show & hide
// ═══════════════════════════════════════════════════════
function showArrows() {
  if (!stage || gameState !== 'WORLDMAP') { hideArrows(); return; }
  var dpad = document.getElementById('dpad');
  if (!dpad || !dpadBtns) return;
  dpad.classList.add('show');
  dpadBtns.forEach(function(btn){
    var dr = parseInt(btn.dataset.dr, 10);
    var dc = parseInt(btn.dataset.dc, 10);
    btn.disabled = !isWalkable(pono.r + dr, pono.c + dc);
  });
}
function hideArrows() {
  var dpad = document.getElementById('dpad');
  if (dpad) dpad.classList.remove('show');
  while (arrowLayer.firstChild) arrowLayer.removeChild(arrowLayer.firstChild);
}

// ═══════════════════════════════════════════════════════
// Radar
// ═══════════════════════════════════════════════════════
var lastBeepAt = 0;
var radarCtx = null;
function getAudioCtx() {
  if (!radarCtx) {
    try { radarCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { radarCtx = null; }
  }
  return radarCtx;
}

function playBeep(freq, dur) {
  var ac = getAudioCtx();
  if (!ac) return;
  try {
    var osc = ac.createOscillator();
    var g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq || 880;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + (dur || 0.08));
    osc.connect(g); g.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + (dur || 0.08) + 0.01);
  } catch (e) { /* ignore */ }
}
function playTap() { playBeep(660, 0.04); }
function playFanfare() {
  var notes = [523, 659, 784, 1047];
  notes.forEach(function(n, i){
    setTimeout(function(){ playBeep(n, 0.16); }, i * 120);
  });
}

function nearestFossilDist() {
  if (!stage) return 99;
  var best = 99;
  for (var i = 0; i < stage.fossils.length; i++) {
    var f = stage.fossils[i];
    if (f.dug) continue;
    var d = Math.abs(f.r - pono.r) + Math.abs(f.c - pono.c);
    if (d < best) best = d;
  }
  return best;
}

// Distance-tier table for multi-modal radar
var RADAR_TIERS = [
  { text:'ここ！',     emoji:'🔥', count:7, cls:'on-max',  face:'dance_hooray', pulse:{opacity:0.7,  dur:500 } },
  { text:'あつい！',   emoji:'🔥', count:6, cls:'on-hot',  face:'dance_point',  pulse:{opacity:0.55, dur:700 } },
  { text:'あったかい', emoji:'☀️', count:4, cls:'on-mid',  face:'dance_smile',  pulse:{opacity:0.35, dur:1100} },
  { text:'ぬるい',     emoji:'🌤️', count:3, cls:'on-mid',  face:'dance_smile',  pulse:null },
  { text:'つめたい',   emoji:'❄️', count:1, cls:'on-cold', face:'dance_tilt',   pulse:null },
  { text:'かんじない…', emoji:'🥶', count:0, cls:'',        face:'dance_tilt',   pulse:null }
];
function radarTierOf(d) {
  if (d === 0) return 0;
  if (d <= 2)  return 1;
  if (d <= 4)  return 2;
  if (d <= 7)  return 3;
  if (d <= 10) return 4;
  return 5;
}
var prevRadarTier = -1;
function updateRadar(now) {
  if (gameState !== 'WORLDMAP') return;
  // v2 stages hide the hot/cold radar; ambient kakera hints + companion bubbles replace it.
  if (stage && stage.mode === 'v2') return;
  var d = nearestFossilDist();
  var tier = radarTierOf(d);
  var info = RADAR_TIERS[tier];

  // Tier-derived UI updates happen only on tier change (per-frame DOM writes hurt on older tablets)
  if (tier !== prevRadarTier) {
    var segs = radarSegs.children;
    for (var i = 0; i < 7; i++) {
      segs[i].className = 'radar-seg';
      if (i < info.count && info.cls) segs[i].classList.add(info.cls);
    }
    if (tier === 0) segs[6].classList.add('on-max');
    radarText.textContent = info.text;
    radarEmoji.textContent = info.emoji;
    radarFace.src = '../assets/images/characters/pono/dance/' + info.face + '.png';
    radarFace.classList.remove('pulse');
    void radarFace.offsetWidth;
    radarFace.classList.add('pulse');
    if (info.pulse) {
      edgePulse.style.setProperty('--pulse-opacity', info.pulse.opacity);
      edgePulse.style.setProperty('--pulse-dur', info.pulse.dur + 'ms');
      edgePulse.classList.add('on');
    } else {
      edgePulse.classList.remove('on');
    }
    prevRadarTier = tier;
  }

  // Beep interval (existing behavior)
  var interval = 80 + 120 * d;
  if (d >= 12) return;
  if (now - lastBeepAt > interval) {
    lastBeepAt = now;
    playBeep(d === 0 ? 1200 : 900, d === 0 ? 0.05 : 0.04);
  }
}

function updateRadarDigBtn() {
  // v2 skips the "step-on-fossil" dig-button model entirely — fossils live inside
  // nodules and outcrops, surfaced via their own tap interactions.
  if (stage && stage.mode === 'v2') {
    btnDig.classList.remove('show');
    var dpadV2 = document.getElementById('dpad');
    if (dpadV2) dpadV2.classList.remove('with-dig');
    return;
  }
  var f = fossilAt(pono.r, pono.c);
  var dpad = document.getElementById('dpad');
  if (f) {
    var isNewArrival = btnDig.dataset.fossilId !== f.id || !btnDig.classList.contains('show');
    btnDig.classList.add('show');
    btnDig.dataset.fossilId = f.id;
    if (isNewArrival) {
      flashOv.classList.add('on');
      setTimeout(function(){ flashOv.classList.remove('on'); }, 300);
    }
    if (dpad) dpad.classList.add('with-dig');
    moveIntent = null; // stop continuous move when fossil found
  } else {
    btnDig.classList.remove('show');
    if (dpad) dpad.classList.remove('with-dig');
  }
}

// ═══════════════════════════════════════════════════════
// v2 — NODULE cracking + OUTCROP strata entry
// ═══════════════════════════════════════════════════════
function openNodule(r, c) {
  var n = noduleAt(r, c);
  if (!n || n.opened) return;
  n.opened = true;
  stage.cells[r][c] = T.SAND; // cracked rubble becomes walkable afterward
  // Crack SFX
  playBeep(260, 0.10);
  setTimeout(function(){ playBeep(170, 0.16); }, 110);
  gameWrap.classList.add('shake');
  setTimeout(function(){ gameWrap.classList.remove('shake'); }, 260);
  moveIntent = null;

  if (n.content && n.content.kind === 'fossil' && n.content.fossilId) {
    // Route through the existing DIG flow so reveal/record/achievements fire uniformly
    setTimeout(function(){ openDig(n.content.fossilId); }, 220);
  } else if (n.content && n.content.kind === 'gem') {
    showNodulePop('💎', 'きれいな いしだ！');
  } else {
    showNodulePop('🪨', 'からっぽ…でも たのしい！');
  }
  showArrows();
}

function showNodulePop(emoji, msg) {
  var pop = document.getElementById('nodulePop');
  if (!pop) {
    pop = document.createElement('div');
    pop.id = 'nodulePop';
    pop.className = 'nodule-pop';
    pop.innerHTML = '<span class="np-emoji"></span><div class="np-msg"></div>';
    gameWrap.appendChild(pop);
  }
  pop.querySelector('.np-emoji').textContent = emoji;
  pop.querySelector('.np-msg').textContent = msg;
  pop.classList.add('show');
  try { speakJa(msg); } catch(_){}
  clearTimeout(showNodulePop._t);
  showNodulePop._t = setTimeout(function(){ pop.classList.remove('show'); }, 1400);
}

// ═══════════════════════════════════════════════════════
// STRATA (v2 outcrop vertical-layer dig screen)
// Kids brush through 4 stacked layers top→bottom; fossil lives in one layer.
// Concept: "deeper = older" (no era names).
// ═══════════════════════════════════════════════════════
var strataState = null;

function openStrata(r, c) {
  var oc = outcropAt(r, c);
  if (!oc) return;
  if (oc.cleared) {
    showNodulePop('✅', 'もう ほった！');
    return;
  }
  gameState = 'STRATA';
  hideArrows();
  moveIntent = null;

  var ov = document.getElementById('strataOverlay');
  ov.classList.add('show');
  document.getElementById('strataLayerLabel').textContent = '1ばん うえ';

  setTimeout(function(){ initStrataCanvases(oc); }, 30);
  // iOS speech warmup
  try { speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch(_){}
}

function initStrataCanvases(oc) {
  var wrap = document.getElementById('strataStage');
  var w = wrap.clientWidth, h = wrap.clientHeight;
  var dpr = window.devicePixelRatio || 1;
  var pw = Math.floor(w * dpr), ph = Math.floor(h * dpr);
  var fc = document.getElementById('strataFossilCanvas');
  var dc = document.getElementById('strataDirtCanvas');
  [fc, dc].forEach(function(cv){
    cv.width = pw; cv.height = ph;
    cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  });
  var fctx = fc.getContext('2d');
  var dctx = dc.getContext('2d');
  fctx.clearRect(0, 0, w, h);
  fc.classList.remove('revealed');

  var L = 4; // layers
  var layerH = h / L;

  // Pre-draw fossil on fossil-canvas inside its target layer's y-range
  var img = getDinoImg(oc.fossilId);
  var targetLayer = oc.fossilLayer | 0;
  function drawFossil() {
    if (!img.complete || !img.naturalWidth) return;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    // Fit the fossil into ~80% of a layer height
    var bandTop = targetLayer * layerH;
    var maxW = w * 0.78, maxH = layerH * 0.86;
    var scale = Math.min(maxW / iw, maxH / ih);
    var dw = iw * scale, dh = ih * scale;
    var dx = (w - dw) / 2, dy = bandTop + (layerH - dh) / 2;
    fctx.drawImage(img, dx, dy, dw, dh);
  }
  if (img.complete && img.naturalWidth > 0) drawFossil();
  else img.onload = drawFossil;

  // Draw 4 dirt bands (top → bottom)
  var colors = oc.layerColors && oc.layerColors.length === L
    ? oc.layerColors
    : ['#C8A878', '#A6864E', '#7F6138', '#5A4126'];
  function paintBand(i) {
    dctx.globalCompositeOperation = 'source-over';
    dctx.fillStyle = colors[i];
    dctx.fillRect(0, i * layerH, w, layerH);
    // Grain
    for (var j = 0; j < 240; j++) {
      dctx.fillStyle = 'rgba(0,0,0,' + (0.05 + Math.random() * 0.12) + ')';
      dctx.fillRect(Math.random() * w, i * layerH + Math.random() * layerH, 2, 2);
    }
    for (var j2 = 0; j2 < 60; j2++) {
      dctx.fillStyle = 'rgba(255,240,210,' + (0.04 + Math.random() * 0.10) + ')';
      dctx.fillRect(Math.random() * w, i * layerH + Math.random() * layerH, 1.5, 1.5);
    }
    // Seam line at bottom of band
    if (i < L - 1) {
      dctx.fillStyle = 'rgba(20,10,5,0.55)';
      dctx.fillRect(0, (i + 1) * layerH - 1, w, 2);
    }
  }
  for (var i = 0; i < L; i++) paintBand(i);

  strataState = {
    outcrop: oc,
    fctx: fctx, dctx: dctx,
    w: w, h: h, pw: pw, ph: ph, dpr: dpr,
    layers: L, layerH: layerH,
    active: 0, // top layer first
    drawing: false, lastX: 0, lastY: 0,
    lastCheckMs: 0,
    revealed: false
  };
  updateStrataLabel();
}
function updateStrataLabel() {
  if (!strataState) return;
  var labels = ['1ばん うえ', 'ちょっと ふかい', 'もっと ふかい', 'いちばん ふかい！'];
  document.getElementById('strataLayerLabel').textContent = labels[strataState.active] || '';
}

function strataBrushAt(ev) {
  if (!strataState) return;
  var dc = document.getElementById('strataDirtCanvas');
  var rect = dc.getBoundingClientRect();
  var cx = (ev.clientX != null ? ev.clientX : (ev.touches && ev.touches[0] && ev.touches[0].clientX)) - rect.left;
  var cy = (ev.clientY != null ? ev.clientY : (ev.touches && ev.touches[0] && ev.touches[0].clientY)) - rect.top;
  if (isNaN(cx) || isNaN(cy)) return;

  // Constrain clearing to the active layer band so kids feel the layer structure.
  var dctx = strataState.dctx;
  var bandTop = strataState.active * strataState.layerH;
  var bandBot = bandTop + strataState.layerH;
  // Outside band? No-op (no punish, no stroke).
  if (cy < bandTop - 4 || cy > bandBot + 4) return;

  dctx.save();
  dctx.beginPath();
  dctx.rect(0, bandTop, strataState.w, strataState.layerH);
  dctx.clip();

  dctx.globalCompositeOperation = 'destination-out';
  dctx.lineWidth = Math.max(34, strataState.w * 0.11);
  dctx.lineCap = 'round'; dctx.lineJoin = 'round';
  dctx.strokeStyle = 'rgba(0,0,0,1)';
  dctx.beginPath();
  if (strataState.drawing) {
    dctx.moveTo(strataState.lastX, strataState.lastY);
    dctx.lineTo(cx, cy);
  } else {
    dctx.moveTo(cx - 0.5, cy); dctx.lineTo(cx + 0.5, cy);
  }
  dctx.stroke();
  dctx.restore();
  strataState.lastX = cx; strataState.lastY = cy;
  strataState.drawing = true;
  if (Math.random() < 0.25) playBeep(200 + Math.random() * 80, 0.03);
  checkStrataProgress();
}

function checkStrataProgress() {
  if (!strataState || strataState.revealed) return;
  var now = performance.now();
  if (now - strataState.lastCheckMs < 150) return;
  strataState.lastCheckMs = now;

  var dctx = strataState.dctx;
  var pw = strataState.pw, ph = strataState.ph;
  var bandTopPx = Math.floor(strataState.active * strataState.layerH * strataState.dpr);
  var bandHPx = Math.max(1, Math.floor(strataState.layerH * strataState.dpr));
  if (bandTopPx + bandHPx > ph) bandHPx = ph - bandTopPx;
  if (bandHPx <= 0) return;

  var cleared = 0, total = 0;
  try {
    // Sample 30x20 grid within this band only (cheap readback)
    var sx = 30, sy = 20;
    var img = dctx.getImageData(0, bandTopPx, pw, bandHPx);
    var data = img.data;
    for (var yi = 0; yi < sy; yi++) {
      for (var xi = 0; xi < sx; xi++) {
        var px = Math.floor(pw * (xi + 0.5) / sx);
        var py = Math.floor(bandHPx * (yi + 0.5) / sy);
        var idx = (py * pw + px) * 4;
        total++;
        if (data[idx + 3] < 30) cleared++;
      }
    }
  } catch (e) { return; }
  var ratio = total > 0 ? cleared / total : 0;

  var targetLayer = strataState.outcrop.fossilLayer | 0;
  var atTarget = (strataState.active === targetLayer);
  var threshold = atTarget ? 0.68 : 0.55;
  if (ratio < threshold) return;

  if (atTarget) {
    strataState.revealed = true;
    triggerStrataReveal();
  } else {
    // Advance to next layer. Fade transition just via label update.
    strataState.active++;
    updateStrataLabel();
    playBeep(520, 0.08);
    setTimeout(function(){ playBeep(740, 0.10); }, 90);
  }
}

function triggerStrataReveal() {
  if (!strataState) return;
  var oc = strataState.outcrop;
  oc.cleared = true;
  document.getElementById('strataFossilCanvas').classList.add('revealed');
  playFanfare();
  setTimeout(function(){
    document.getElementById('strataOverlay').classList.remove('show');
    var fid = oc.fossilId;
    strataState = null;
    // Reuse REVEAL/RECORD pipeline to record + achievement
    var dino = window.getFossilById(fid);
    if (!dino) { gameState = 'WORLDMAP'; showArrows(); return; }
    gameState = 'REVEAL';
    // Present a tiny "revealed" overlay like normal dig does
    var revealOv = document.getElementById('revealOverlay');
    document.getElementById('revealImg').src = dino.img;
    document.getElementById('revealName').textContent = dino.jp + ' の かせきだ！';
    document.getElementById('revealTrivia').textContent = dino.trivia;
    revealOv.classList.add('show');
    // digState surrogate so revealContinue → openRecord(fid) works
    digState = { fossilId: fid };
    showCharBubble('pono', '../assets/images/characters/pono/dance/dance_hooray.png', 'みてみて！');
    speakJa('みてみて！');
    setTimeout(function(){
      showCharBubble('hedge', '../assets/images/characters/headgehog/headgehog_surprised.png', 'え？ なんですか？');
      speakJa('え？なんですか？');
    }, 800);
    setTimeout(function(){ speakJa(dino.jp + 'の かせきだ！'); }, 1800);
  }, 700);
}

// Strata dig pointer handlers
(function(){
  var dc = document.getElementById('strataDirtCanvas');
  if (!dc) return;
  function onPd(e){ e.preventDefault(); strataState && (strataState.drawing = false); strataBrushAt(e); }
  function onPm(e){ if (!strataState || !strataState.drawing) return; e.preventDefault(); strataBrushAt(e); }
  function onPu(){ if (strataState) strataState.drawing = false; }
  dc.addEventListener('pointerdown', onPd);
  dc.addEventListener('pointermove', onPm);
  dc.addEventListener('pointerup', onPu);
  dc.addEventListener('pointercancel', onPu);
  dc.addEventListener('pointerleave', onPu);
  dc.addEventListener('touchstart', function(e){ e.preventDefault(); }, { passive:false });
  dc.addEventListener('touchmove',  function(e){ e.preventDefault(); }, { passive:false });
})();

document.getElementById('strataClose').addEventListener('click', function(){
  document.getElementById('strataOverlay').classList.remove('show');
  strataState = null;
  if (gameState === 'STRATA') {
    gameState = 'WORLDMAP';
    showArrows();
  }
});

// ═══════════════════════════════════════════════════════
// Draw
// ═══════════════════════════════════════════════════════
function drawBg(w, h) {
  var s = STAGES[currentStageIdx];
  var fd = window.FOSSIL_STAGES[currentStageIdx];
  // Gradient background
  var grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, fd.bgStart);
  grad.addColorStop(1, fd.bgEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawCell(r, c) {
  var x = gridOX + c * cellSize;
  var y = gridOY + r * cellSize;
  var t = stage.cells[r][c];
  ctx.save();

  // Zone tint first (v2 only) so emoji sits on top
  if (stage.mode === 'v2') {
    if (t === T.CLIFF) {
      // Stratification stripes: kids see layered rock = "this is where strata live"
      ctx.fillStyle = '#7A5A35';
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.fillStyle = 'rgba(50,30,15,0.35)';
      var bandH = Math.max(3, Math.floor(cellSize / 6));
      for (var b = 0; b < cellSize; b += bandH * 2) {
        ctx.fillRect(x, y + b, cellSize, bandH);
      }
    } else if (t === T.OUTCROP) {
      ctx.fillStyle = '#8A6540';
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.fillStyle = 'rgba(60,35,15,0.45)';
      var bandH2 = Math.max(3, Math.floor(cellSize / 6));
      for (var b2 = 0; b2 < cellSize; b2 += bandH2 * 2) {
        ctx.fillRect(x, y + b2, cellSize, bandH2);
      }
      // A hint glow so kids notice the tap target
      ctx.fillStyle = 'rgba(255,220,120,0.22)';
      ctx.fillRect(x+2, y+2, cellSize-4, cellSize-4);
    } else if (t === T.SLOPE) {
      var grad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
      grad.addColorStop(0, '#D9B57A');
      grad.addColorStop(1, '#C79A5D');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, cellSize, cellSize);
    } else if (t === T.DRY_WASH) {
      ctx.fillStyle = '#C8B38A';
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.fillStyle = 'rgba(255,250,240,0.65)';
      for (var pi = 0; pi < 5; pi++) {
        var pdx = x + 4 + ((r*13 + c*19 + pi*29) % (cellSize - 8));
        var pdy = y + 4 + ((c*11 + r*23 + pi*17) % (cellSize - 8));
        ctx.beginPath();
        ctx.arc(pdx, pdy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Base sand dots per cell for texture (only on sand-family tiles)
  if (t === T.SAND || t === T.TENT || t === T.BONE || t === T.FOREST_LIGHT) {
    ctx.fillStyle = 'rgba(180,130,80,0.10)';
    for (var i = 0; i < 3; i++) {
      var px = x + ((r*31 + c*17 + i*11) % cellSize);
      var py = y + ((c*29 + r*13 + i*19) % cellSize);
      ctx.fillRect(px, py, 2, 2);
    }
  }

  ctx.font = Math.floor(cellSize * 0.62) + 'px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  var cx = x + cellSize/2, cy = y + cellSize/2;

  if (t === T.ROCK)   ctx.fillText('🪨', cx, cy);
  else if (t === T.CACTUS) ctx.fillText('🌵', cx, cy);
  else if (t === T.RUIN)   ctx.fillText('🏛️', cx, cy);
  else if (t === T.TENT)   ctx.fillText('⛺', cx, cy);
  else if (t === T.BONE)   ctx.fillText('🦴', cx, cy);
  else if (t === T.FOREST_LIGHT) {
    ctx.font = Math.floor(cellSize * 0.48) + 'px serif';
    ctx.fillText('🌳', cx, cy + cellSize * 0.04);
  } else if (t === T.NODULE) {
    var n = noduleAt(r, c);
    if (n && n.opened) {
      // Cracked rubble: small gray pebble pile
      ctx.font = Math.floor(cellSize * 0.42) + 'px serif';
      ctx.fillStyle = 'rgba(80,60,45,0.6)';
      ctx.fillText('🪨', cx - cellSize*0.12, cy + cellSize*0.04);
      ctx.fillText('🪨', cx + cellSize*0.12, cy + cellSize*0.04);
    } else {
      // Intact nodule (round stone) with a subtle crack line
      ctx.fillText('🪨', cx, cy);
      ctx.strokeStyle = 'rgba(40,25,10,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - cellSize*0.18, cy - cellSize*0.10);
      ctx.lineTo(cx - cellSize*0.02, cy + cellSize*0.06);
      ctx.lineTo(cx + cellSize*0.14, cy - cellSize*0.02);
      ctx.stroke();
    }
  } else if (t === T.OUTCROP) {
    // Dig icon in upper-left corner — tap target signifier
    ctx.font = Math.floor(cellSize * 0.36) + 'px serif';
    ctx.fillText('⛏️', x + cellSize * 0.22, y + cellSize * 0.22);
  }

  // v2 kakera overlay: small white-bone ellipses on walkable sand-family cells
  if (stage.mode === 'v2' && (t === T.SAND || t === T.DRY_WASH || t === T.FOREST_LIGHT || t === T.SLOPE)) {
    var k = kakeraAt(r, c);
    if (k && k.n > 0) {
      ctx.fillStyle = '#F8F0E0';
      ctx.strokeStyle = '#8A5A30';
      ctx.lineWidth = 1;
      var padKa = Math.max(6, cellSize * 0.15);
      for (var ki = 0; ki < k.n; ki++) {
        // Deterministic position per (r,c,i) so kakera don't jitter per frame
        var kpx = x + padKa + ((r*13 + c*7 + ki*23) % Math.max(1, (cellSize - padKa*2)));
        var kpy = y + padKa + ((c*11 + r*17 + ki*29) % Math.max(1, (cellSize - padKa*2)));
        ctx.beginPath();
        ctx.ellipse(kpx, kpy, Math.max(2.5, cellSize * 0.06), Math.max(1.2, cellSize * 0.03), (ki * 0.6), 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
    }
  }

  ctx.restore();
}

// v2 lookup helpers
function kakeraAt(r, c) {
  if (!stage || !stage.kakera) return null;
  for (var i = 0; i < stage.kakera.length; i++) {
    var k = stage.kakera[i];
    if (k.r === r && k.c === c) return k;
  }
  return null;
}
function noduleAt(r, c) {
  if (!stage || !stage.nodules) return null;
  for (var i = 0; i < stage.nodules.length; i++) {
    var n = stage.nodules[i];
    if (n.r === r && n.c === c) return n;
  }
  return null;
}
function outcropAt(r, c) {
  if (!stage || !stage.outcrops) return null;
  for (var i = 0; i < stage.outcrops.length; i++) {
    var o = stage.outcrops[i];
    if (o.r === r && o.c === c) return o;
  }
  return null;
}

function drawPono(now) {
  // finishWalk may start a new walkAnim via moveIntent; re-check in a loop
  // to avoid a 1-frame snap flicker at cell boundaries during continuous move.
  if (walkAnim) {
    if (Math.floor((now - walkAnim.t0) / walkAnim.perCell) >= walkAnim.path.length) {
      finishWalk();
    }
  }
  var pr, pc, dr = 0, dc = 0;
  if (walkAnim) {
    // Use max(now, walkAnim.t0) — if finishWalk just created a new walkAnim,
    // its t0 may be slightly after the `now` captured at the start of drawPono,
    // producing a negative elapsed / negative segIdx / walkAnim.path[-1] = undefined (crash).
    var nowSafe = now > walkAnim.t0 ? now : walkAnim.t0;
    var elapsed2 = nowSafe - walkAnim.t0;
    var segIdx = Math.floor(elapsed2 / walkAnim.perCell);
    if (segIdx < 0) segIdx = 0;
    if (segIdx >= walkAnim.path.length) segIdx = walkAnim.path.length - 1;
    var t = (elapsed2 - segIdx * walkAnim.perCell) / walkAnim.perCell;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    var seg = walkAnim.path[segIdx];
    var fromR = segIdx === 0 ? walkAnim.fromR : walkAnim.path[segIdx-1].r;
    var fromC = segIdx === 0 ? walkAnim.fromC : walkAnim.path[segIdx-1].c;
    pr = fromR + (seg.r - fromR) * t;
    pc = fromC + (seg.c - fromC) * t;
    dr = seg.dr; dc = seg.dc;
  } else {
    pr = pono.r; pc = pono.c;
  }
  var fx = gridOX + pc * cellSize + cellSize/2;
  var fy = gridOY + pr * cellSize + cellSize/2;
  var sz = Math.floor(cellSize * 0.78);
  if (imgPono.complete && imgPono.naturalWidth > 0) {
    ctx.drawImage(imgPono, fx - sz/2, fy - sz/2, sz, sz);
  } else {
    ctx.font = Math.floor(cellSize * 0.6) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🐻', fx, fy);
  }
}

function draw() {
  var w = gameWrap.clientWidth, h = gameWrap.clientHeight;
  if (!stage) { requestAnimationFrame(draw); return; }
  drawBg(w, h);
  for (var r = 0; r < stage.rows; r++) {
    for (var c = 0; c < stage.cols; c++) {
      drawCell(r, c);
    }
  }
  drawPono(performance.now());
  updateRadar(performance.now());
  requestAnimationFrame(draw);
}

// ═══════════════════════════════════════════════════════
// Keyboard (long-press continuous via self-managed intent)
// ═══════════════════════════════════════════════════════
window.addEventListener('keydown', function(e){
  if (gameState !== 'WORLDMAP') return;
  var dr = 0, dc = 0;
  if (e.key === 'ArrowUp')         dr = -1;
  else if (e.key === 'ArrowDown')  dr =  1;
  else if (e.key === 'ArrowLeft')  dc = -1;
  else if (e.key === 'ArrowRight') dc =  1;
  else return;
  e.preventDefault();
  if (e.repeat) return; // OS repeat ignored; we drive continuation via moveIntent
  startContinuousMove(dr, dc, 'key');
});
window.addEventListener('keyup', function(e){
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key) < 0) return;
  stopContinuousMove('key');
});

// ═══════════════════════════════════════════════════════
// Canvas tap → BFS auto-walk
// ═══════════════════════════════════════════════════════
canvas.addEventListener('pointerdown', function(e){
  if (gameState !== 'WORLDMAP') return;
  if (walkAnim) return;
  if (moveIntent) return; // ignore while D-pad / key is held
  if (!stage) return;
  var rect = canvas.getBoundingClientRect();
  var x = e.clientX - rect.left;
  var y = e.clientY - rect.top;
  var c = Math.floor((x - gridOX) / cellSize);
  var r = Math.floor((y - gridOY) / cellSize);
  if (r < 0 || r >= stage.rows || c < 0 || c >= stage.cols) return;
  if (r === pono.r && c === pono.c) return;

  // v2: tapping a nodule/outcrop routes to its interaction (after walking adjacent if needed)
  if (stage.mode === 'v2') {
    var tt = stage.cells[r][c];
    if (tt === T.NODULE || tt === T.OUTCROP) {
      var adjDist = Math.abs(r - pono.r) + Math.abs(c - pono.c);
      if (adjDist === 1) {
        playTap();
        if (tt === T.NODULE)  openNodule(r, c);
        else                  openStrata(r, c);
        return;
      }
      var near = findAdjacentWalkable(r, c);
      if (!near) { playBeep(300, 0.05); return; }
      var p2 = findPathBFS(pono.r, pono.c, near.r, near.c);
      if (!p2 || !p2.length) { playBeep(300, 0.05); return; }
      pendingInteract = { kind: tt, r:r, c:c };
      playTap();
      startWalk(p2);
      return;
    }
  }

  if (!isWalkable(r, c)) { playBeep(300, 0.05); return; }
  var path = findPathBFS(pono.r, pono.c, r, c);
  if (!path || !path.length) return;
  path = truncateAtFossil(path);
  playTap();
  startWalk(path);
});

// ═══════════════════════════════════════════════════════
// DIG Phase
// ═══════════════════════════════════════════════════════
var digState = null;

function openDig(fossilId) {
  gameState = 'DIG';
  hideArrows();
  btnDig.classList.remove('show');
  var dino = window.getFossilById(fossilId);
  if (!dino) return;

  var fossilCanvas = document.getElementById('fossilCanvas');
  var sandCanvas = document.getElementById('sandCanvas');
  var digStage = document.getElementById('digStage');
  document.getElementById('digTitle').textContent = 'ブラシで すなを はらおう！';
  document.getElementById('digOverlay').classList.add('show');
  fossilCanvas.classList.remove('revealed');

  // Reset stars
  for (var s = 0; s < 3; s++) {
    document.getElementById('digStar'+s).classList.remove('on');
  }

  // Size canvases
  setTimeout(function(){
    var w = digStage.clientWidth;
    var h = digStage.clientHeight;
    var dpr = window.devicePixelRatio || 1;
    var pw = Math.floor(w * dpr), ph = Math.floor(h * dpr);
    [fossilCanvas, sandCanvas].forEach(function(cv){
      cv.width = pw;
      cv.height = ph;
      var c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    });

    var fctx = fossilCanvas.getContext('2d');
    var sctx = sandCanvas.getContext('2d');
    fctx.clearRect(0, 0, w, h);

    // Create digState BEFORE drawing / mask-compute to avoid null-race on cached images
    digState = {
      fossilId: fossilId,
      fctx: fctx, sctx: sctx,
      w: w, h: h, pw: pw, ph: ph, dpr: dpr,
      drawing: false,
      lastX: 0, lastY: 0,
      maskPoints: null,
      revealed: 0,
      maskTotal: 0,
      lastCheckMs: 0
    };

    var img = getDinoImg(fossilId);
    function drawFossil() {
      if (!digState || !img.complete || !img.naturalWidth) return;
      var iw = img.naturalWidth, ih = img.naturalHeight;
      var scale = Math.min(w*0.85 / iw, h*0.85 / ih);
      var dw = iw * scale, dh = ih * scale;
      fctx.drawImage(img, (w-dw)/2, (h-dh)/2, dw, dh);
      digState.maskPoints = computeMask(fctx, pw, ph);
    }
    if (img.complete && img.naturalWidth > 0) drawFossil();
    else img.onload = drawFossil;

    // Sand base gradient
    sctx.globalCompositeOperation = 'source-over';
    var g = sctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#E4C48A');
    g.addColorStop(1, '#B8915A');
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, w, h);
    for (var i = 0; i < 800; i++) {
      var px = Math.random() * w;
      var py = Math.random() * h;
      sctx.fillStyle = 'rgba(120,80,40,' + (0.15 + Math.random()*0.25) + ')';
      sctx.fillRect(px, py, 2 + Math.random()*2, 2 + Math.random()*2);
    }
    for (var i = 0; i < 200; i++) {
      sctx.fillStyle = 'rgba(255,240,200,' + (0.08 + Math.random()*0.15) + ')';
      sctx.fillRect(Math.random()*w, Math.random()*h, 1.5, 1.5);
    }
  }, 30);

  // Warm up TTS
  try { speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch(e) {}
}

function computeMask(fctx, pw, ph) {
  // Sample 40x40 grid on physical canvas. Store point indexes (y*pw+x) so
  // checkRevealProgress can read them from a single batched getImageData.
  var pts = [];
  try {
    var img = fctx.getImageData(0, 0, pw, ph);
    var data = img.data;
    var step = 40;
    for (var yi = 0; yi < step; yi++) {
      for (var xi = 0; xi < step; xi++) {
        var px = Math.floor(pw * (xi+0.5) / step);
        var py = Math.floor(ph * (yi+0.5) / step);
        var idx = (py * pw + px) * 4;
        if (data[idx+3] > 30) pts.push(idx);
      }
    }
  } catch (e) { /* ignore */ }
  if (digState) digState.maskTotal = pts.length;
  return pts;
}

function brushAt(ev) {
  if (!digState) return;
  var sandCanvas = document.getElementById('sandCanvas');
  var rect = sandCanvas.getBoundingClientRect();
  var cx = (ev.clientX || (ev.touches && ev.touches[0].clientX)) - rect.left;
  var cy = (ev.clientY || (ev.touches && ev.touches[0].clientY)) - rect.top;
  if (isNaN(cx) || isNaN(cy)) return;
  var sctx = digState.sctx;
  sctx.globalCompositeOperation = 'destination-out';
  sctx.lineWidth = Math.max(36, digState.w * 0.09);
  sctx.lineCap = 'round';
  sctx.lineJoin = 'round';
  sctx.strokeStyle = 'rgba(0,0,0,1)';
  sctx.beginPath();
  if (digState.drawing) {
    sctx.moveTo(digState.lastX, digState.lastY);
    sctx.lineTo(cx, cy);
  } else {
    sctx.moveTo(cx-0.5, cy);
    sctx.lineTo(cx+0.5, cy);
  }
  sctx.stroke();
  digState.lastX = cx;
  digState.lastY = cy;
  digState.drawing = true;
  // Soft brush sfx
  if (Math.random() < 0.25) playBeep(200 + Math.random()*80, 0.03);
  checkRevealProgress();
}

function checkRevealProgress() {
  if (!digState || !digState.maskPoints) return;
  // Throttle to avoid full-canvas readbacks on every pointermove
  var now = performance.now();
  if (now - (digState.lastCheckMs || 0) < 150) return;
  digState.lastCheckMs = now;

  var sctx = digState.sctx;
  var pts = digState.maskPoints;
  var total = pts.length;
  if (total === 0) return;
  var cleared = 0;
  try {
    // ONE readback covering the whole sand canvas; index directly into the buffer.
    var img = sctx.getImageData(0, 0, digState.pw, digState.ph);
    var data = img.data;
    for (var i = 0; i < total; i++) {
      if (data[pts[i] + 3] < 30) cleared++;
    }
  } catch (e) { return; }
  var ratio = cleared / total;
  digState.revealed = ratio;

  // Update stars
  document.getElementById('digStar0').classList.toggle('on', ratio >= 0.25);
  document.getElementById('digStar1').classList.toggle('on', ratio >= 0.50);
  document.getElementById('digStar2').classList.toggle('on', ratio >= 0.70);

  if (ratio >= 0.70 && gameState === 'DIG') {
    triggerReveal(digState.fossilId);
  }
}

// Dig stage pointer handlers
(function(){
  var sandCanvas = document.getElementById('sandCanvas');
  function onPd(e){ e.preventDefault(); digState && (digState.drawing = false); brushAt(e); }
  function onPm(e){ if (!digState || !digState.drawing) return; e.preventDefault(); brushAt(e); }
  function onPu(){ if (digState) digState.drawing = false; }
  sandCanvas.addEventListener('pointerdown', onPd);
  sandCanvas.addEventListener('pointermove', onPm);
  sandCanvas.addEventListener('pointerup', onPu);
  sandCanvas.addEventListener('pointercancel', onPu);
  sandCanvas.addEventListener('pointerleave', onPu);
  sandCanvas.addEventListener('touchstart', function(e){ e.preventDefault(); }, { passive:false });
  sandCanvas.addEventListener('touchmove', function(e){ e.preventDefault(); }, { passive:false });
})();

document.getElementById('digClose').addEventListener('click', function(){
  document.getElementById('digOverlay').classList.remove('show');
  digState = null;
  gameState = 'WORLDMAP';
  showArrows();
  updateRadarDigBtn();
});

// ═══════════════════════════════════════════════════════
// REVEAL演出
// ═══════════════════════════════════════════════════════
var charBubbles = [];
function showCharBubble(kind, imgSrc, speech) {
  var wrap = document.createElement('div');
  wrap.className = 'char-bubble ' + (kind === 'pono' ? 'char-pono' : 'char-hedge');
  var sp = document.createElement('div');
  sp.className = 'char-speech';
  sp.textContent = speech;
  var im = document.createElement('img');
  im.className = 'char-img';
  im.src = imgSrc;
  wrap.appendChild(sp);
  wrap.appendChild(im);
  document.body.appendChild(wrap);
  charBubbles.push(wrap);
}
function clearCharBubbles() {
  charBubbles.forEach(function(el){ if (el.parentNode) el.parentNode.removeChild(el); });
  charBubbles = [];
}

function speakJa(text) {
  try {
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.rate = 1.0; u.pitch = 1.15;
    speechSynthesis.speak(u);
  } catch (e) { /* ignore */ }
}

function triggerReveal(fossilId) {
  gameState = 'REVEAL';
  var dino = window.getFossilById(fossilId);
  if (!dino) return;
  // Fade sand away
  var sandCanvas = document.getElementById('sandCanvas');
  sandCanvas.style.transition = 'opacity 0.6s';
  sandCanvas.style.opacity = '0';
  document.getElementById('fossilCanvas').classList.add('revealed');

  playFanfare();

  setTimeout(function(){
    // Close dig overlay, open reveal overlay
    document.getElementById('digOverlay').classList.remove('show');
    sandCanvas.style.opacity = '1';
    var revealOv = document.getElementById('revealOverlay');
    document.getElementById('revealImg').src = dino.img;
    document.getElementById('revealName').textContent = dino.jp + ' の かせきだ！';
    document.getElementById('revealTrivia').textContent = dino.trivia;
    revealOv.classList.add('show');

    // Show pono first
    showCharBubble('pono', '../assets/images/characters/pono/dance/dance_hooray.png', 'みてみて！');
    speakJa('みてみて！');

    // Then hedgehog
    setTimeout(function(){
      showCharBubble('hedge', '../assets/images/characters/headgehog/headgehog_surprised.png', 'え？ なんですか？');
      speakJa('え？なんですか？');
    }, 800);

    // Then reveal name
    setTimeout(function(){
      speakJa(dino.jp + 'の かせきだ！');
    }, 1800);

  }, 800);
}

document.getElementById('revealContinue').addEventListener('click', function(){
  var ro = document.getElementById('revealOverlay');
  ro.classList.remove('show');
  clearCharBubbles();
  openRecord(digState && digState.fossilId);
});

// ═══════════════════════════════════════════════════════
// RECORD to tablet
// ═══════════════════════════════════════════════════════
function openRecord(fossilId) {
  if (!fossilId) return;
  gameState = 'RECORD';
  var dino = window.getFossilById(fossilId);
  var isNew = !collection[fossilId];
  if (isNew) {
    collection[fossilId] = { foundAt: Date.now(), stageId: currentStageIdx };
    saveCollection();
    // Mark in stage
    if (stage) {
      stage.fossils.forEach(function(f){ if (f.id === fossilId) f.dug = true; });
    }
    updateFoundHud();
    grantAchievements();
  }

  document.getElementById('recTitle').textContent = dino.jp;
  document.getElementById('recImg').src = dino.img;
  document.getElementById('recEra').textContent = dino.era;
  var rec = collection[fossilId];
  var foundAt = (rec && typeof rec === 'object' && rec.foundAt) ? rec.foundAt : Date.now();
  document.getElementById('recDate').textContent = 'はっけんび: ' + new Date(foundAt).toLocaleDateString('ja-JP');
  document.getElementById('recordOverlay').classList.add('show');
}

document.getElementById('recBtn').addEventListener('click', function(){
  document.getElementById('recordOverlay').classList.remove('show');
  digState = null;
  gameState = 'WORLDMAP';

  // Check stage completion
  if (stage && stage.fossils.every(function(f){ return f.dug; })) {
    var next = currentStageIdx + 1;
    if (next < STAGES.length) {
      setTimeout(function(){
        showToast('ステージ ' + (currentStageIdx+1) + ' クリア！\nつぎの さばくへ いこう！', 1800);
        setTimeout(function(){ loadStage(next); }, 1900);
      }, 200);
    } else {
      if (Object.keys(collection).length >= window.FOSSIL_DATA.length) {
        setTimeout(function(){
          showToast('🎉 14たい ぜんぶ コンプリート！\nきょうりゅうはくぶつかんが オープンしたよ！', 2200);
          setTimeout(function(){ openMuseum(); }, 2300);
        }, 200);
      } else {
        showArrows();
      }
    }
  } else {
    showArrows();
    updateRadarDigBtn();
  }
});

// Toast helper (replaces alert for iOS PWA fullscreen safety)
var _toastTimer = null;
function showToast(msg, durationMs) {
  var el = document.getElementById('fossilToast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function(){ el.classList.remove('show'); }, durationMs || 1500);
}

// ═══════════════════════════════════════════════════════
// INDEX (図鑑)
// ═══════════════════════════════════════════════════════
var prevStateBeforeIndex = null;
document.getElementById('btnIndex').addEventListener('click', openIndex);
document.getElementById('indexClose').addEventListener('click', closeIndex);

function openIndex() {
  prevStateBeforeIndex = gameState;
  gameState = 'INDEX';
  buildIndexGrid();
  document.getElementById('indexOverlay').classList.add('show');
}
function closeIndex() {
  document.getElementById('indexOverlay').classList.remove('show');
  gameState = prevStateBeforeIndex || 'WORLDMAP';
  if (gameState === 'WORLDMAP') showArrows();
}

function buildIndexGrid() {
  var grid = document.getElementById('indexGrid');
  grid.innerHTML = '';
  var found = 0;
  window.FOSSIL_DATA.forEach(function(d){
    var cell = document.createElement('div');
    cell.className = 'index-cell' + (collection[d.id] ? '' : ' locked');
    var img = document.createElement('img');
    img.src = d.img;
    img.alt = d.jp;
    cell.appendChild(img);
    var nm = document.createElement('div');
    nm.className = 'index-name';
    nm.textContent = collection[d.id] ? d.jp : '？？？';
    cell.appendChild(nm);
    if (collection[d.id]) {
      found++;
      cell.addEventListener('click', function(){ showDetail(d.id); });
    }
    grid.appendChild(cell);
  });
  document.getElementById('indexProgress').textContent = found + ' / ' + window.FOSSIL_DATA.length;
  var btnQuiz = document.getElementById('btnQuizStart');
  var btnMus = document.getElementById('btnMuseum');
  if (found < 3) {
    btnQuiz.disabled = true;
    btnQuiz.textContent = '🧠 クイズ (あと ' + (3 - found) + ' たい)';
  } else {
    btnQuiz.disabled = false;
    btnQuiz.textContent = '🧠 クイズ スタート';
  }
  btnMus.disabled = (found < window.FOSSIL_DATA.length);
}

function showDetail(id) {
  var d = window.getFossilById(id);
  var rec = collection[id];
  if (!d || !rec) return;
  document.getElementById('detImg').src = d.img;
  document.getElementById('detName').textContent = d.jp;
  document.getElementById('detEra').textContent = d.era;
  document.getElementById('detTrivia').textContent = d.trivia;
  document.getElementById('detDate').textContent = 'はっけんび: ' + new Date(rec.foundAt).toLocaleDateString('ja-JP');
  document.getElementById('indexDetail').classList.add('show');
}
document.getElementById('detClose').addEventListener('click', function(){
  document.getElementById('indexDetail').classList.remove('show');
});

// ═══════════════════════════════════════════════════════
// QUIZ
// ═══════════════════════════════════════════════════════
var quizState = null;

document.getElementById('btnQuizStart').addEventListener('click', startQuiz);
document.getElementById('quizClose').addEventListener('click', closeQuiz);
document.getElementById('quizNext').addEventListener('click', nextQuizQuestion);

function startQuiz() {
  var foundIds = Object.keys(collection);
  if (foundIds.length < 3) return;
  // Build question list: 1 per found dino, max 8
  var qs = [];
  foundIds.forEach(function(id){
    var d = window.getFossilById(id);
    if (!d || !d.questions) return;
    var pick = d.questions[Math.floor(Math.random() * d.questions.length)];
    qs.push({ dino: d, q: pick });
  });
  // Shuffle & limit
  for (var i = qs.length-1; i > 0; i--) {
    var j = Math.floor(Math.random()*(i+1));
    var tmp = qs[i]; qs[i] = qs[j]; qs[j] = tmp;
  }
  if (qs.length > 8) qs = qs.slice(0, 8);

  quizState = { questions: qs, idx: 0, correct: 0 };
  gameState = 'QUIZ';
  document.getElementById('quizOverlay').classList.add('show');
  renderQuizQuestion();
}

function renderQuizQuestion() {
  if (!quizState) return;
  var q = quizState.questions[quizState.idx];
  document.getElementById('quizProgress').textContent = 'もんだい ' + (quizState.idx+1) + ' / ' + quizState.questions.length + '   せいかい: ' + quizState.correct;
  document.getElementById('quizImg').src = q.dino.img;
  document.getElementById('quizQ').textContent = q.q.q;
  var choicesDiv = document.getElementById('quizChoices');
  choicesDiv.innerHTML = '';
  q.q.choices.forEach(function(label, i){
    var b = document.createElement('button');
    b.className = 'quiz-choice';
    b.textContent = label;
    b.addEventListener('click', function(){ onQuizAnswer(i, b); });
    choicesDiv.appendChild(b);
  });
  document.getElementById('quizFeedback').textContent = '';
  document.getElementById('quizDetail').style.display = 'none';
  document.getElementById('quizNext').style.display = 'none';
  // Read question
  try {
    setTimeout(function(){ speakJa(q.q.q); }, 150);
  } catch (e) {}
}

function onQuizAnswer(idx, btn) {
  if (!quizState) return;
  var q = quizState.questions[quizState.idx];
  var correct = (idx === q.q.answer);
  // Disable all buttons
  var btns = document.querySelectorAll('#quizChoices .quiz-choice');
  btns.forEach(function(b){ b.disabled = true; });
  // Mark correct/wrong
  btns.forEach(function(b, i){
    if (i === q.q.answer) b.classList.add('correct');
    else if (i === idx && !correct) b.classList.add('wrong');
  });
  var fb = document.getElementById('quizFeedback');
  if (correct) {
    quizState.correct++;
    fb.textContent = '🎉 せいかい！';
    speakJa('せいかい！');
    playFanfare();
    try { window.incrementStat && window.incrementStat('fossil_quiz_correct', 1); } catch (e) {}
  } else {
    fb.textContent = '😊 ざんねん！ もういちど おぼえよう';
    speakJa('ざんねん');
    playBeep(300, 0.2);
  }
  if (q.q.detail) {
    document.getElementById('quizDetail').textContent = q.q.detail;
    document.getElementById('quizDetail').style.display = 'block';
  }
  document.getElementById('quizNext').style.display = 'block';
  document.getElementById('quizNext').textContent = (quizState.idx === quizState.questions.length-1) ? 'けっかを みる ▶' : 'つぎへ ▶';
}

function nextQuizQuestion() {
  if (!quizState) return;
  quizState.idx++;
  if (quizState.idx >= quizState.questions.length) {
    endQuiz();
  } else {
    renderQuizQuestion();
  }
}

function endQuiz() {
  var total = quizState.questions.length;
  var got = quizState.correct;
  var perfect = (got === total);
  if (perfect) {
    try { window.incrementStat && window.incrementStat('fossil_quiz_perfect', 1); } catch (e) {}
  }
  var msg = 'クイズ おわり！\n' + got + ' / ' + total + ' もん せいかい！';
  if (perfect) msg += '\n🎉 まんてんだよ！すごい！';
  showToast(msg, 2500);
  setTimeout(closeQuiz, 2600);
}

function closeQuiz() {
  document.getElementById('quizOverlay').classList.remove('show');
  quizState = null;
  gameState = 'INDEX';
  buildIndexGrid();
}

// ═══════════════════════════════════════════════════════
// MUSEUM
// ═══════════════════════════════════════════════════════
document.getElementById('btnMuseum').addEventListener('click', openMuseum);
document.getElementById('museumClose').addEventListener('click', function(){
  document.getElementById('museumOverlay').classList.remove('show');
  gameState = 'INDEX';
});

function openMuseum() {
  gameState = 'MUSEUM';
  var row = document.getElementById('museumRow');
  row.innerHTML = '';
  window.FOSSIL_DATA.forEach(function(d){
    var p = document.createElement('div');
    p.className = 'museum-pedestal';
    var im = document.createElement('img');
    im.src = d.img;
    im.alt = d.jp;
    p.appendChild(im);
    var nm = document.createElement('div');
    nm.className = 'm-name';
    nm.textContent = d.jp;
    p.appendChild(nm);
    row.appendChild(p);
  });
  document.getElementById('indexOverlay').classList.remove('show');
  document.getElementById('museumOverlay').classList.add('show');
}

// ═══════════════════════════════════════════════════════
// Stage Select (simple)
// ═══════════════════════════════════════════════════════
document.getElementById('btnStageSel').addEventListener('click', function(){
  if (gameState !== 'WORLDMAP') return;
  var list = document.getElementById('stagePickList');
  list.innerHTML = '';
  STAGES.forEach(function(s, i){
    var name = (window.FOSSIL_STAGES[i] && window.FOSSIL_STAGES[i].name) || ('ステージ ' + (i+1));
    var btn = document.createElement('button');
    btn.className = 'sp-btn';
    btn.textContent = (i+1) + '. ' + name;
    btn.addEventListener('click', function(){
      document.getElementById('stagePickOverlay').classList.remove('show');
      loadStage(i);
    });
    list.appendChild(btn);
  });
  document.getElementById('stagePickOverlay').classList.add('show');
});
document.getElementById('stagePickClose').addEventListener('click', function(){
  document.getElementById('stagePickOverlay').classList.remove('show');
});

// ═══════════════════════════════════════════════════════
// DIG button
// ═══════════════════════════════════════════════════════
btnDig.addEventListener('click', function(){
  if (gameState !== 'WORLDMAP') return;
  var fid = btnDig.dataset.fossilId;
  if (!fid) return;
  var f = fossilAt(pono.r, pono.c);
  if (!f || f.id !== fid) return;
  openDig(fid);
});

// ═══════════════════════════════════════════════════════
// Achievements helper
// ═══════════════════════════════════════════════════════
function grantAchievements() {
  try {
    var count = Object.keys(collection).length;
    if (window.incrementStat) {
      window.incrementStat('fossil_found', 1);
      // Also set max-style stats via direct read (achievements.js uses thresholds, so incrementing is enough
      // for cumulative stats; for milestones it'll auto-check)
    }
  } catch (e) { /* ignore */ }
}

// ═══════════════════════════════════════════════════════
// Intro
// ═══════════════════════════════════════════════════════
document.getElementById('introStart').addEventListener('click', function(){
  document.getElementById('introOverlay').classList.add('hidden');
  // iOS warmup
  try { speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch (e) {}
  try { getAudioCtx(); } catch (e) {}
  loadStage(0);
});

// Menu integration
if (window.initMenu) {
  window.initMenu({
    bgmToggle: function() { /* BGM not implemented for fossil MVP */ },
    tutorial: function() {
      showToast('🦕 あそびかた\n\n1. やじるしで マップを あるこう\n2. しろい ほねの かけらが おおい ほうを さがそう\n3. まるい いし (🪨) は タップして わろう\n4. ⛏️ の がけは タップして じめんを ふかく ほろう！ ふかいほど むかしの かせきだよ\n5. ずかんに きろくしたら クイズで まなぼう\n6. 14たい ぜんぶ あつめると はくぶつかんが ひらくよ！', 7500);
    }
  });
}

// ═══════════════════════════════════════════════════════
// Boot
// ═══════════════════════════════════════════════════════
initDpad();
resizeCanvas();
requestAnimationFrame(draw);

