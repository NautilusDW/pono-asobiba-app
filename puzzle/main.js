// ===== Stage Configuration =====
const BASE_STAGES = [
  { cols: 2, rows: 2, image: '../assets/images/puzzle_bear.jpg'   },
  { cols: 3, rows: 2, image: '../assets/images/puzzle_cover.jpg'  },
  { cols: 4, rows: 2, image: '../assets/images/puzzle_birds.jpg'  },
  { cols: 4, rows: 3, image: '../assets/images/puzzle_P01_01.jpg' },
  { cols: 4, rows: 3, image: '../assets/images/puzzle_05.jpg', advanced: true },
  // ── 新ステージ ──
  { cols: 4, rows: 3, image: '../assets/images/puzzle_pono_sleep.jpg', advanced: true },
  { cols: 4, rows: 4, image: '../assets/images/puzzle_pono_water.jpg' },
  { cols: 4, rows: 4, image: '../assets/images/puzzle_pono_rock.jpg' },
  { cols: 4, rows: 4, image: '../assets/images/puzzle_pono_unsettled.jpg', advanced: true },
  { cols: 5, rows: 3, image: '../assets/images/puzzle_pono_sleepy.jpg' },
  { cols: 5, rows: 3, image: '../assets/images/puzzle_pono_sparkle.jpg', advanced: true },
  { cols: 5, rows: 4, image: '../assets/images/puzzle_pono_topdown.jpg' },
  { cols: 5, rows: 4, image: '../assets/images/puzzle_pono_icicle.jpg', advanced: true },
  { cols: 6, rows: 4, image: '../assets/images/puzzle_pono_owl.jpg', advanced: true },
];
let STAGES = [...BASE_STAGES];

function loadDrawingStages() {
  try {
    const drawings = JSON.parse(localStorage.getItem('pono_drawings')) || [];
    // migrate legacy single-drawing key
    if (drawings.length === 0) {
      const old = localStorage.getItem('pono_drawing');
      if (old) drawings.push({ dataUrl: old, ts: Date.now() });
    }
    return drawings.map((d, i) => ({
      cols: 3, rows: 2,
      imageDataUrl: d.dataUrl,
      stageText: `🎨 おえかきパズル ${i + 1}`,
    }));
  } catch { return []; }
}
const SNAP_DIST = 55;

// ===== Stage State =====
let currentStageIndex = 0;
let stageCols = 2, stageRows = 2, stageTotalPieces = 4;
let stageAdvanced = false;

// ===== Puzzle State =====
let pieces = [];
let snappedCount = 0;
let dragPiece = null;
let dragOffX = 0, dragOffY = 0;
let puzzleCanvas = null, puzzleCtx = null;
let sourceImg = null;
let boardX = 0, boardY = 0, boardW = 0, boardH = 0;
let pieceW = 0, pieceH = 0;
let canvasW = 0, canvasH = 0;

// ===== DOM =====
const puzzleContainer = document.getElementById('puzzle-container');
const loadingEl       = document.getElementById('loading');
const btnShuffle      = document.getElementById('btn-shuffle');
const btnHint         = document.getElementById('btn-hint');
const progressFill    = document.getElementById('progress-fill');
const progressText    = document.getElementById('progress-text');
const stageLabel      = document.getElementById('stage-label');
const successModal    = document.getElementById('success-modal');
const modalStageInfo  = document.getElementById('modal-stage-info');
const btnNextStage    = document.getElementById('btn-next-stage');
const btnPlayAgain    = document.getElementById('btn-play-again');
const confettiContainer = document.getElementById('confetti-container');

// ===== Audio Context (shared, iOS-safe) =====
let sfxCtx = null;
function getSfxCtx() {
  if (!sfxCtx) sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
  return sfxCtx;
}
// resume()後にコールバックを実行（iOS対応の確実なunlock）
function withAudio(fn) {
  const ctx = getSfxCtx();
  if (ctx.state === 'running') { fn(ctx); return; }
  ctx.resume().then(() => fn(ctx)).catch(() => {});
}
// iOSは最初のタッチでAudioContextをunlockする必要がある
document.addEventListener('touchstart', () => getSfxCtx().resume(), { once: true, passive: true });
document.addEventListener('pointerdown', () => getSfxCtx().resume(), { once: true });

// ===== Audio: Snap Sound =====
function playSnapSound() {
  withAudio(actx => {
    const osc = actx.createOscillator(), gain = actx.createGain();
    osc.connect(gain); gain.connect(actx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, actx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.2);
    osc.start(actx.currentTime); osc.stop(actx.currentTime + 0.2);
  });
}

// ===== Audio: Completion Fanfare =====
function playFanfare() {
  withAudio(actx => {
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = actx.createOscillator(), gain = actx.createGain();
      osc.connect(gain); gain.connect(actx.destination);
      osc.type = 'triangle'; osc.frequency.value = freq;
      const t = actx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.start(t); osc.stop(t + 0.4);
    });
  });
}

// ===== Confetti =====
function spawnConfetti() {
  const colors = ['#F2915A', '#8BC48A', '#F7C948', '#FF6B9D', '#60A5FA', '#C084FC'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = Math.random() * 100 + '%';
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay = Math.random() * 1.5 + 's';
    el.style.animationDuration = (2 + Math.random() * 2) + 's';
    el.style.width = (8 + Math.random() * 8) + 'px';
    el.style.height = (8 + Math.random() * 8) + 'px';
    confettiContainer.appendChild(el);
  }
  setTimeout(() => { confettiContainer.innerHTML = ''; }, 5000);
}

// ===== Progress =====
function updateProgress() {
  const pct = Math.min((snappedCount / stageTotalPieces) * 100, 100);
  progressFill.style.width = pct + '%';
  progressText.textContent = snappedCount + ' / ' + stageTotalPieces;
}

// ===== Success Modal =====
function showSuccessModal() {
  playFanfare();
  spawnConfetti();
  if (window.incrementStat) window.incrementStat('puzzle_clears', 1);
  if (window.addAcorns) window.addAcorns(3, { reason: 'puzzle_clear' });

  // スタンプラリー: プレイ記録
  (function() {
    var k = 'pono_played_' + new Date().toDateString();
    var a = JSON.parse(localStorage.getItem(k) || '[]');
    if (a.indexOf('puzzle') === -1) { a.push('puzzle'); localStorage.setItem(k, JSON.stringify(a)); }
  })();

  const isLast = currentStageIndex >= STAGES.length - 1;
  if (isLast) {
    modalStageInfo.textContent = 'ぜんぶ クリア！！';
    btnNextStage.classList.add('hidden');
  } else {
    modalStageInfo.textContent = `ステージ ${currentStageIndex + 1} クリア！`;
    btnNextStage.classList.remove('hidden');
  }

  // ★ 全ステージクリア時は宝箱演出を先に表示、閉じたら成功モーダル
  if (isLast && window.triggerFirstClearReward) {
    window.triggerFirstClearReward('puzzle', {
      onClose: function() { successModal.classList.remove('hidden'); }
    }).then(function(shown) {
      if (!shown) setTimeout(function() { successModal.classList.remove('hidden'); }, 800);
    }).catch(function() { setTimeout(function() { successModal.classList.remove('hidden'); }, 800); });
  } else {
    setTimeout(function() { successModal.classList.remove('hidden'); }, 800);
  }
}

function hideSuccessModal() {
  successModal.classList.add('hidden');
}

// ===== Placeholder Image =====
function createPlaceholderImage(width, height) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#FDDCBF'); grad.addColorStop(0.5, '#FFE8D6'); grad.addColorStop(1, '#D4EDDA');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);
  const cx = width / 2, cy = height / 2 - 10, r = Math.min(width, height) * 0.22;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = '#C49A6C'; ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - r * 0.7, cy - r * 0.7, r * 0.35, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.7, cy - r * 0.7, r * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = '#B08555'; ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - r * 0.7, cy - r * 0.7, r * 0.2, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.7, cy - r * 0.7, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#E8C9A0'; ctx.fill();
  ctx.fillStyle = '#3D2E1F'; ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.1, r * 0.08, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.3, cy - r * 0.1, r * 0.08, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy + r * 0.15, r * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#3D2E1F'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy + r * 0.2, r * 0.2, 0.1, Math.PI - 0.1);
  ctx.strokeStyle = '#3D2E1F'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
  ctx.font = `bold ${Math.floor(width * 0.06)}px 'Zen Maru Gothic', sans-serif`;
  ctx.textAlign = 'center'; ctx.fillStyle = '#5D4E37';
  ctx.fillText('くまのこ ポノ', cx, height * 0.88);
  const img = new Image(); img.src = c.toDataURL(); return img;
}

// ===== Jigsaw Edge Drawing =====
// Flip an edge for traversal in the opposite direction (bottom/left edges)
function flipEdge(e) {
  if (typeof e === 'number') return -e;
  return { dir: -e.dir, pos: 1 - e.pos, hw: e.hw };
}

function buildPiecePath(target, px, py, pw, ph, tabs) {
  function traceEdgeTo(x1, y1, x2, y2, edge) {
    if (edge === 0) { target.lineTo(x2, y2); return; }

    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;

    if (typeof edge === 'number') {
      // Simple single-Bézier centered tab (stages 1-4)
      const d = len * 0.32 * edge;
      const t30x = x1 + ux * len * 0.30, t30y = y1 + uy * len * 0.30;
      const t70x = x1 + ux * len * 0.70, t70y = y1 + uy * len * 0.70;
      target.lineTo(t30x, t30y);
      target.bezierCurveTo(t30x + nx * d, t30y + ny * d, t70x + nx * d, t70y + ny * d, t70x, t70y);
      target.lineTo(x2, y2);
      return;
    }

    // Advanced irregular knob: two-Bézier mushroom shape (stage 5+)
    const { dir, pos, hw } = edge;
    const tabH  = len * 0.30 * dir;   // knob height (signed)
    const tabHW = hw * len;            // half-width of tab mouth
    const neckH = tabH * 0.55;        // neck control height

    const psx = x1 + ux * (pos - hw) * len;  // mouth start
    const psy = y1 + uy * (pos - hw) * len;
    const pex = x1 + ux * (pos + hw) * len;  // mouth end
    const pey = y1 + uy * (pos + hw) * len;
    const topX = x1 + ux * pos * len + nx * tabH;  // knob top center
    const topY = y1 + uy * pos * len + ny * tabH;

    target.lineTo(psx, psy);
    target.bezierCurveTo(
      psx + nx * neckH,          psy + ny * neckH,
      topX - ux * tabHW * 0.8,  topY - uy * tabHW * 0.8,
      topX, topY
    );
    target.bezierCurveTo(
      topX + ux * tabHW * 0.8,  topY + uy * tabHW * 0.8,
      pex + nx * neckH,          pey + ny * neckH,
      pex, pey
    );
    target.lineTo(x2, y2);
  }

  target.moveTo(px, py);
  traceEdgeTo(px,      py,      px + pw, py,      tabs.top);
  traceEdgeTo(px + pw, py,      px + pw, py + ph, tabs.right);
  traceEdgeTo(px + pw, py + ph, px,      py + ph, flipEdge(tabs.bottom));
  traceEdgeTo(px,      py + ph, px,      py,      flipEdge(tabs.left));
  target.closePath();
}

// ===== Build pieces data =====
function buildPieces() {
  function makeEdge() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    if (!stageAdvanced) return dir;
    return {
      dir,
      pos: 0.32 + Math.random() * 0.36,  // 0.32 – 0.68
      hw:  0.14 + Math.random() * 0.07,  // 0.14 – 0.21
    };
  }

  const hEdge = [];
  for (let col = 0; col < stageCols - 1; col++) {
    hEdge[col] = [];
    for (let row = 0; row < stageRows; row++) {
      hEdge[col][row] = makeEdge();
    }
  }
  const vEdge = [];
  for (let col = 0; col < stageCols; col++) {
    vEdge[col] = [];
    for (let row = 0; row < stageRows - 1; row++) {
      vEdge[col][row] = makeEdge();
    }
  }

  pieces = [];
  for (let row = 0; row < stageRows; row++) {
    for (let col = 0; col < stageCols; col++) {
      const homeX = boardX + col * pieceW;
      const homeY = boardY + row * pieceH;
      pieces.push({
        col, row, homeX, homeY, x: homeX, y: homeY,
        tabs: {
          top:    row === 0             ? 0 : vEdge[col][row - 1],
          bottom: row === stageRows - 1 ? 0 : vEdge[col][row],
          left:   col === 0             ? 0 : hEdge[col - 1][row],
          right:  col === stageCols - 1 ? 0 : hEdge[col][row],
        },
        snapped: false,
        zOrder: col + row * stageCols,
        path: null,
      });
    }
  }
}

// ===== Draw Board =====
function drawBoard() {
  // キャンバスを透明にしてCSSの背景画像を見せる
  puzzleCtx.clearRect(0, 0, canvasW, canvasH);

  // 土台エリアに半透明のクリームオーバーレイ
  puzzleCtx.fillStyle = 'rgba(237, 232, 223, 0.72)';
  puzzleCtx.fillRect(boardX, boardY, boardW, boardH);

  // ピースのスロット輪郭
  for (const p of pieces) {
    if (p.snapped) continue;
    puzzleCtx.save();
    puzzleCtx.beginPath();
    buildPiecePath(puzzleCtx, p.homeX, p.homeY, pieceW, pieceH, p.tabs);
    puzzleCtx.fillStyle = 'rgba(93,78,55,0.07)';
    puzzleCtx.fill();
    puzzleCtx.strokeStyle = 'rgba(93,78,55,0.35)';
    puzzleCtx.lineWidth = 2;
    puzzleCtx.stroke();
    puzzleCtx.restore();
  }
}

function rebuildPath(piece) {
  const path = new Path2D();
  buildPiecePath(path, piece.x, piece.y, pieceW, pieceH, piece.tabs);
  piece.path = path;
}

// ===== Draw a single piece =====
function drawPiece(piece) {
  puzzleCtx.save();
  puzzleCtx.beginPath();
  buildPiecePath(puzzleCtx, piece.x, piece.y, pieceW, pieceH, piece.tabs);
  puzzleCtx.clip();
  const imgOffX = boardX + (piece.x - piece.homeX);
  const imgOffY = boardY + (piece.y - piece.homeY);
  puzzleCtx.drawImage(sourceImg, imgOffX, imgOffY, boardW, boardH);
  puzzleCtx.restore();

  puzzleCtx.save();
  puzzleCtx.beginPath();
  buildPiecePath(puzzleCtx, piece.x, piece.y, pieceW, pieceH, piece.tabs);
  puzzleCtx.strokeStyle = piece === dragPiece ? '#F2915A' : '#5D4E37';
  puzzleCtx.lineWidth = piece === dragPiece ? 2.5 : 1.8;
  puzzleCtx.stroke();
  if (piece === dragPiece) {
    puzzleCtx.beginPath();
    buildPiecePath(puzzleCtx, piece.x + 4, piece.y + 4, pieceW, pieceH, piece.tabs);
    puzzleCtx.strokeStyle = 'rgba(0,0,0,0.12)';
    puzzleCtx.lineWidth = 6;
    puzzleCtx.stroke();
  }
  puzzleCtx.restore();
}

function redraw() {
  puzzleCtx.clearRect(0, 0, canvasW, canvasH);
  drawBoard();
  const sorted = [...pieces].sort((a, b) => a.zOrder - b.zOrder);
  for (const p of sorted) drawPiece(p);

}

function hitTest(piece, px, py) {
  rebuildPath(piece);
  return puzzleCtx.isPointInPath(piece.path, px, py);
}

// ===== Shuffle =====
function shufflePieces() {
  snappedCount = 0;
  const pad = 8;
  pieces.forEach((p, i) => {
    p.snapped = false;
    let best = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const tx = pad + Math.random() * Math.max(0, canvasW - pieceW - pad * 2);
      const ty = pad + Math.random() * Math.max(0, canvasH - pieceH - pad * 2);
      const onBoard = (
        tx + pieceW > boardX + pad && tx < boardX + boardW - pad &&
        ty + pieceH > boardY + pad && ty < boardY + boardH - pad
      );
      if (!onBoard) { best = { x: tx, y: ty }; break; }
      if (!best) best = { x: tx, y: ty };
    }
    p.x = best.x; p.y = best.y;
    p.zOrder = i;
    rebuildPath(p);
  });
  updateProgress();
  redraw();
}

// ===== Snap =====
function trySnap(piece) {
  if (Math.hypot(piece.x - piece.homeX, piece.y - piece.homeY) < SNAP_DIST) {
    piece.x = piece.homeX; piece.y = piece.homeY;
    piece.snapped = true;
    piece.zOrder = -1; // はめ込み済みは常に背後
    rebuildPath(piece);
    snappedCount++;
    updateProgress();
    playSnapSound();
    if (snappedCount >= stageTotalPieces) {
      redraw();
      setTimeout(showSuccessModal, 300);
    }
    return true;
  }
  return false;
}

// ===== Pointer Events =====
function getPos(e) {
  const rect = puzzleCanvas.getBoundingClientRect();
  const sx = canvasW / rect.width, sy = canvasH / rect.height;
  if (e.touches) return {
    x: (e.touches[0].clientX - rect.left) * sx,
    y: (e.touches[0].clientY - rect.top)  * sy,
  };
  return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
}

function onPointerDown(e) {
  e.preventDefault();
  const { x, y } = getPos(e);
  let found = null;
  for (const p of pieces) {
    if (p.snapped) continue;
    if (hitTest(p, x, y) && (!found || p.zOrder > found.zOrder)) found = p;
  }
  if (!found) return;
  dragPiece = found;
  dragOffX = x - found.x; dragOffY = y - found.y;
  dragPiece.zOrder = Math.max(...pieces.map(p => p.zOrder)) + 1;
  redraw();
}

function onPointerMove(e) {
  if (!dragPiece) return;
  e.preventDefault();
  const { x, y } = getPos(e);
  dragPiece.x = Math.max(0, Math.min(canvasW - pieceW, x - dragOffX));
  dragPiece.y = Math.max(0, Math.min(canvasH - pieceH, y - dragOffY));
  rebuildPath(dragPiece);
  redraw();
}

function onPointerUp(e) {
  if (!dragPiece) return;
  e.preventDefault();
  const piece = dragPiece;
  dragPiece = null;
  trySnap(piece);
  redraw();
}

// ===== Initialize Puzzle (called after image loads) =====
function initPuzzle(img) {
  sourceImg = img;

  const rect = puzzleContainer.getBoundingClientRect();
  canvasW = rect.width  || 600;
  canvasH = rect.height || 400;

  // Remove old canvas & listeners
  puzzleContainer.innerHTML = '';

  puzzleCanvas = document.createElement('canvas');
  puzzleCanvas.width  = canvasW;
  puzzleCanvas.height = canvasH;
  puzzleCanvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
  puzzleContainer.appendChild(puzzleCanvas);
  puzzleCtx = puzzleCanvas.getContext('2d');

  const boardMaxW = canvasW * 0.60;
  const boardMaxH = canvasH * 0.60;
  // Use the image's natural aspect ratio to avoid stretching
  const imgAspect = (img.naturalWidth && img.naturalHeight)
    ? img.naturalWidth / img.naturalHeight
    : stageCols / stageRows;

  boardW = Math.min(boardMaxW, boardMaxH * imgAspect);
  boardH = boardW / imgAspect;
  if (boardH > boardMaxH) { boardH = boardMaxH; boardW = boardH * imgAspect; }

  boardX = (canvasW - boardW) / 2;
  boardY = (canvasH - boardH) / 2;
  pieceW = boardW / stageCols;
  pieceH = boardH / stageRows;

  snappedCount = 0;
  updateProgress();
  buildPieces();

  puzzleCanvas.addEventListener('pointerdown', function(e) {
    onPointerDown(e);
    if (dragPiece) puzzleCanvas.setPointerCapture(e.pointerId);
  }, { passive: false });
  puzzleCanvas.addEventListener('pointermove',   onPointerMove,  { passive: false });
  puzzleCanvas.addEventListener('pointerup',     onPointerUp,    { passive: false });
  puzzleCanvas.addEventListener('pointercancel', onPointerUp,    { passive: false });
  puzzleCanvas.addEventListener('lostpointercapture', onPointerUp);

  loadingEl.classList.add('hidden');
  shufflePieces();
}

// ===== Load Stage =====
function loadStage(index) {
  currentStageIndex = index;
  const stage = STAGES[index];
  stageCols        = stage.cols;
  stageRows        = stage.rows;
  stageTotalPieces = stageCols * stageRows;
  stageAdvanced    = !!stage.advanced;

  stageLabel.textContent = stage.stageText || `ステージ ${index + 1} / ${STAGES.length}`;

  loadingEl.classList.remove('hidden');
  dragPiece = null;

  const img = new Image();
  if (stage.imageDataUrl) {
    // drawing saved as data URL — no crossOrigin needed
    img.src = stage.imageDataUrl;
  } else {
    img.crossOrigin = 'anonymous';
    img.src = stage.image;
  }
  img.onload = () => initPuzzle(img);
  img.onerror = () => {
    const rect = puzzleContainer.getBoundingClientRect();
    const ph = createPlaceholderImage(rect.width || 600, rect.height || 400);
    ph.onload = () => initPuzzle(ph);
    if (ph.complete) initPuzzle(ph);
  };
}

// ===== Button Handlers =====
btnShuffle.addEventListener('click', () => {
  if (!puzzleCanvas) return;
  dragPiece = null;
  shufflePieces();
});

btnHint.addEventListener('click', () => {
  if (!puzzleCanvas) return;
  dragPiece = null;
  pieces.forEach(p => { p.x = p.homeX; p.y = p.homeY; rebuildPath(p); });
  redraw();
  setTimeout(() => {
    if (snappedCount < stageTotalPieces) {
      const margin = Math.min(pieceW, pieceH) * 0.3;
      pieces.forEach(p => {
        if (!p.snapped) {
          p.x = margin + Math.random() * (canvasW - pieceW - margin * 2);
          p.y = margin + Math.random() * (canvasH - pieceH - margin * 2);
          rebuildPath(p);
        }
      });
      redraw();
    }
  }, 1200);
});

btnNextStage.addEventListener('click', () => {
  hideSuccessModal();
  loadStage(currentStageIndex + 1);
});

if (btnPlayAgain) btnPlayAgain.addEventListener('click', () => {
  hideSuccessModal();
  dragPiece = null;
  shufflePieces();
});

// ===== BGM =====
const bgm    = document.getElementById('bgm');
let bgmEnabled = localStorage.getItem('pono_bgm_enabled') !== 'off';

bgm.volume = 0.2;

let bgmStarted = false;

function tryStartBgm() {
  if (!bgmEnabled || bgmStarted) return;
  bgm.play().then(() => {
    bgmStarted = true;
  }).catch(() => {
    // 失敗してもリスナーは残るので次の操作で再試行
  });
}

// BGM toggle is now handled by initMenu() via common/menu.js

// ページ読み込み時に即再生を試みる。ブロックされたら最初の操作で再試行
if (bgmEnabled) {
  bgm.play().then(() => {
    bgmStarted = true;
  }).catch(() => {
    document.addEventListener('touchstart', tryStartBgm, { once: true, passive: true });
    document.addEventListener('pointerdown', tryStartBgm, { once: true });
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { bgm.pause(); }
  else if (bgmEnabled) { bgm.play().catch(() => {}); }
});
window.addEventListener('blur',  () => bgm.pause());
window.addEventListener('focus', () => { if (bgmEnabled) bgm.play().catch(() => {}); });

// ===== Responsive Resize =====
let resizeTimer = null;
const resizeObserver = new ResizeObserver(() => {
  if (!sourceImg) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => initPuzzle(sourceImg), 250);
});

// ===== Tutorial =====
function showTutorial() {
  const dim = document.getElementById('tut-dim');
  const bubble = document.getElementById('tut-bubble');
  if (!dim || !bubble) return;

  let step = 0;
  const steps = [
    () => {
      dim.classList.remove('hidden');
      bubble.className = 'tut-bubble';
      bubble.style.cssText = 'top:50%;left:50%;transform:translate(-50%,-50%)';
      bubble.innerHTML = '🧩 ピースを ゆびで うごかそう！<br><button class="tut-next-btn" id="tut-next">つぎ →</button>';
      bubble.classList.remove('hidden');
      requestAnimationFrame(() => {
        document.getElementById('tut-next').addEventListener('pointerdown', e => { e.preventDefault(); nextStep(); });
      });
    },
    () => {
      bubble.className = 'tut-bubble';
      bubble.style.cssText = 'top:50%;left:50%;transform:translate(-50%,-50%)';
      bubble.innerHTML = 'ただしい ばしょに おくと<br>パチッとはまるよ 💡<br><button class="tut-next-btn" id="tut-next">つぎ →</button>';
      bubble.classList.remove('hidden');
      requestAnimationFrame(() => {
        document.getElementById('tut-next').addEventListener('pointerdown', e => { e.preventDefault(); nextStep(); });
      });
    },
    () => {
      bubble.className = 'tut-bubble';
      bubble.style.cssText = 'top:50%;left:50%;transform:translate(-50%,-50%)';
      bubble.innerHTML = 'ぜんぶ はめたら できあがり！🎉<br><button class="tut-next-btn" id="tut-next">あそぼう！</button>';
      requestAnimationFrame(() => {
        document.getElementById('tut-next').addEventListener('pointerdown', e => { e.preventDefault(); endTut(); });
      });
    }
  ];

  function nextStep() { step++; step < steps.length ? steps[step]() : endTut(); }
  function endTut() {
    dim.classList.add('hidden');
    bubble.classList.add('hidden');
    localStorage.setItem('puzzle_tut_seen', '1');
  }

  steps[0]();
}

// ===== Start =====
window.addEventListener('DOMContentLoaded', () => {
  // Merge fixed stages with any saved drawings
  const drawingStages = loadDrawingStages();
  STAGES = [...BASE_STAGES, ...drawingStages];
  resizeObserver.observe(puzzleContainer);
  loadStage(0);

  // Show tutorial on first visit
  localStorage.removeItem('puzzle_tut_seen'); // テスト用: 毎回表示
  if (!localStorage.getItem('puzzle_tut_seen')) {
    setTimeout(showTutorial, 500);
  }

  // Shared menu (gear icon) with BGM toggle
  if (window.initMenu) {
    initMenu({
      bgmToggle: () => {
        bgmEnabled = !bgmEnabled;
        localStorage.setItem('pono_bgm_enabled', bgmEnabled ? 'on' : 'off');
        if (bgmEnabled) {
          bgmStarted = false;
          tryStartBgm();
        } else {
          bgm.pause();
        }
              },
      tutorial: showTutorial
    });
  }
});
