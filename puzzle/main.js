// ===== Stage Configuration =====
//
// 20ステージ進行 (4→4→6→6→6→9→9→9→12→12→12→12→16→16→16→16→20→20→20→20)
// 対象年齢: 3〜6歳。最大ピース数 20。
//
// 各ステージは以下スキーマ:
//   { id, title, rows, cols, pieceCount, image,
//     rotationEnabled, challengeRotationEnabled, allowedRotations,
//     pieceShapeStyle, snapAssist }
//
// pieceShapeStyle (Level A〜F):
//   soft-rounded         (A) — ほぼ四角・凹凸控えめ
//   large-jigsaw         (B) — 大きめ丸タブ・pos 0.5 固定
//   standard-jigsaw      (C) — 中サイズ・pos 0.5 固定
//   standard-jigsaw-v2   (D) — pos 0.40-0.60 ランダム
//   advanced-jigsaw      (E) — pos 0.32-0.68 ランダム
//   advanced-jigsaw-v2   (F) — pos 0.28-0.72 ランダム (最多様化)
//
// snapAssist (SNAP_DIST スケール、pieceW 比率):
//   very-strong   — pieceW * 0.55
//   strong        — pieceW * 0.45
//   medium-strong — pieceW * 0.38
//   normal        — pieceW * 0.30
//
// チャレンジモード (90度回転):
//   デフォルト OFF。 window.PUZZLE_CHALLENGE_ROTATION = true
//   または localStorage.puzzle_challenge_rotation === 'on' で有効化。
//   challengeRotationEnabled が true のステージで、 mode ON 時のみ回転状態を付与。

// Stage 20 のピース数はプレイテストで調整可能 (難しすぎる場合は 16 に下げる)
const STAGE_20_PIECE_COUNT = 20; // tweakable: 16 if too hard

// ステージ画像のパス解決
// 通常ステージ (01-04, 06-09, 11-14, 16-19) は assets/images/puzzle/stages/puzzle_stage_NN_<topic>.jpg を直接参照。
// ポノ特別枠 (05, 10, 15, 20) は既存の puzzle_pono_*.jpg を流用。
const STAGE_IMAGES = {
  1:  '../assets/images/puzzle/stages/puzzle_stage_01_apple_leaf.jpg',
  2:  '../assets/images/puzzle/stages/puzzle_stage_02_balloons.jpg',
  3:  '../assets/images/puzzle/stages/puzzle_stage_03_flower_butterfly.jpg',
  4:  '../assets/images/puzzle/stages/puzzle_stage_04_fish_waterplants.jpg',
  5:  '../assets/images/puzzle_pono_sleep.jpg',    // ポノ特別枠
  6:  '../assets/images/puzzle/stages/puzzle_stage_06_fruit_basket.jpg',
  7:  '../assets/images/puzzle/stages/puzzle_stage_07_music_toy_box.jpg',
  8:  '../assets/images/puzzle/stages/puzzle_stage_08_flower_field_bugs.jpg',
  9:  '../assets/images/puzzle/stages/puzzle_stage_09_underwater_world.jpg',
  10: '../assets/images/puzzle_pono_water.jpg',    // ポノ特別枠
  11: '../assets/images/puzzle/stages/puzzle_stage_11_rainbow_after_rain.jpg',
  12: '../assets/images/puzzle/stages/puzzle_stage_12_dream_night_sky.jpg',
  13: '../assets/images/puzzle/stages/puzzle_stage_13_sweets_table.jpg',
  14: '../assets/images/puzzle/stages/puzzle_stage_14_animal_music_concert.jpg',
  15: '../assets/images/puzzle_pono_sparkle.jpg',  // ポノ特別枠
  16: '../assets/images/puzzle/stages/puzzle_stage_16_vehicle_town.jpg',
  17: '../assets/images/puzzle/stages/puzzle_stage_17_forest_picnic.jpg',
  18: '../assets/images/puzzle/stages/puzzle_stage_18_magical_bookshelf.jpg',
  19: '../assets/images/puzzle/stages/puzzle_stage_19_puzzle_play_table.jpg',
  20: '../assets/images/puzzle_pono_owl.jpg',      // ポノ特別枠
};

function resolveStageImage(stageNum) {
  return STAGE_IMAGES[stageNum] || STAGE_IMAGES[1];
}

// 20 ステージ定義
const BASE_STAGES = [
  // ── Stage 01-02: 4 pieces / soft-rounded / very-strong ──
  { id: 1,  title: 'はじめての なかま',  rows: 2, cols: 2, pieceCount: 4,
    image: resolveStageImage(1),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'soft-rounded', snapAssist: 'very-strong' },
  { id: 2,  title: 'もりの どうぶつ',    rows: 2, cols: 2, pieceCount: 4,
    image: resolveStageImage(2),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'soft-rounded', snapAssist: 'very-strong' },

  // ── Stage 03-05: 6 pieces / large-jigsaw / strong ──
  { id: 3,  title: 'たのしい おさんぽ',  rows: 2, cols: 3, pieceCount: 6,
    image: resolveStageImage(3),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'large-jigsaw', snapAssist: 'strong' },
  { id: 4,  title: 'おひさま いっぱい',  rows: 2, cols: 3, pieceCount: 6,
    image: resolveStageImage(4),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'large-jigsaw', snapAssist: 'strong' },
  { id: 5,  title: '✨ おやすみ ポノ',   rows: 2, cols: 3, pieceCount: 6,
    image: resolveStageImage(5),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'large-jigsaw', snapAssist: 'strong' },

  // ── Stage 06-08: 9 pieces / standard-jigsaw / strong ──
  { id: 6,  title: 'なかよし ピクニック', rows: 3, cols: 3, pieceCount: 9,
    image: resolveStageImage(6),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'standard-jigsaw', snapAssist: 'strong' },
  { id: 7,  title: 'はらっぱで かけっこ', rows: 3, cols: 3, pieceCount: 9,
    image: resolveStageImage(7),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'standard-jigsaw', snapAssist: 'strong' },
  { id: 8,  title: 'おはなの はたけ',    rows: 3, cols: 3, pieceCount: 9,
    image: resolveStageImage(8),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'standard-jigsaw', snapAssist: 'strong' },

  // ── Stage 09-12: 12 pieces / standard-jigsaw-v2 / medium-strong ──
  { id: 9,  title: 'みずべの ぼうけん',  rows: 3, cols: 4, pieceCount: 12,
    image: resolveStageImage(9),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'standard-jigsaw-v2', snapAssist: 'medium-strong' },
  { id: 10, title: '✨ みずあそび ポノ', rows: 3, cols: 4, pieceCount: 12,
    image: resolveStageImage(10),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'standard-jigsaw-v2', snapAssist: 'medium-strong' },
  { id: 11, title: 'そらの くもさん',    rows: 3, cols: 4, pieceCount: 12,
    image: resolveStageImage(11),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'standard-jigsaw-v2', snapAssist: 'medium-strong' },
  { id: 12, title: 'やまの ハイキング',  rows: 3, cols: 4, pieceCount: 12,
    image: resolveStageImage(12),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'standard-jigsaw-v2', snapAssist: 'medium-strong' },

  // ── Stage 13-16: 16 pieces / advanced-jigsaw / normal ──
  { id: 13, title: 'うみの なかま',      rows: 4, cols: 4, pieceCount: 16,
    image: resolveStageImage(13),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'advanced-jigsaw', snapAssist: 'normal' },
  { id: 14, title: 'よるの ほしぞら',    rows: 4, cols: 4, pieceCount: 16,
    image: resolveStageImage(14),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'advanced-jigsaw', snapAssist: 'normal' },
  { id: 15, title: '✨ きらきら ポノ',   rows: 4, cols: 4, pieceCount: 16,
    image: resolveStageImage(15),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'advanced-jigsaw', snapAssist: 'normal' },
  { id: 16, title: 'ふゆの けしき',      rows: 4, cols: 4, pieceCount: 16,
    image: resolveStageImage(16),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'advanced-jigsaw', snapAssist: 'normal' },

  // ── Stage 17-20: 20 pieces / advanced-jigsaw-v2 / normal ──
  { id: 17, title: 'もりの ピクニック',  rows: 4, cols: 5, pieceCount: 20,
    image: resolveStageImage(17),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'advanced-jigsaw-v2', snapAssist: 'normal' },
  { id: 18, title: 'まちの たんけん',    rows: 4, cols: 5, pieceCount: 20,
    image: resolveStageImage(18),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'advanced-jigsaw-v2', snapAssist: 'normal' },
  { id: 19, title: 'おまつり よる',      rows: 4, cols: 5, pieceCount: 20,
    image: resolveStageImage(19),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'advanced-jigsaw-v2', snapAssist: 'normal' },
  // Stage 20: ピース数は STAGE_20_PIECE_COUNT で可変
  (function() {
    const pc = STAGE_20_PIECE_COUNT;
    // 20 → 4×5, 16 → 4×4
    const rows = pc === 16 ? 4 : 4;
    const cols = pc === 16 ? 4 : 5;
    return {
      id: 20, title: '✨ ポノと さいごのぼうけん', rows, cols, pieceCount: pc,
      image: resolveStageImage(20),
      rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
      pieceShapeStyle: pc === 16 ? 'advanced-jigsaw' : 'advanced-jigsaw-v2',
      snapAssist: 'normal',
    };
  })(),
];

// スキーマ検証: pieceCount === rows * cols
BASE_STAGES.forEach((s, i) => {
  if (s.rows * s.cols !== s.pieceCount) {
    console.warn(`[puzzle] Stage ${s.id} pieceCount mismatch: ${s.rows}*${s.cols} !== ${s.pieceCount}`);
  }
});

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
      // おえかきパズルは soft-rounded で簡単め (6 ピース)
      id: 1000 + i,
      title: `🎨 おえかきパズル ${i + 1}`,
      rows: 2, cols: 3, pieceCount: 6,
      imageDataUrl: d.dataUrl,
      rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
      pieceShapeStyle: 'large-jigsaw', snapAssist: 'strong',
      stageText: `🎨 おえかきパズル ${i + 1}`,
    }));
  } catch { return []; }
}

// snapAssist → SNAP_DIST 計算用比率
const SNAP_ASSIST_RATIO = {
  'very-strong':   0.55,
  'strong':        0.45,
  'medium-strong': 0.38,
  'normal':        0.30,
};

// チャレンジモード判定 (グローバル設定または localStorage)
function isChallengeRotationOn() {
  if (typeof window !== 'undefined' && window.PUZZLE_CHALLENGE_ROTATION === true) return true;
  try {
    return localStorage.getItem('puzzle_challenge_rotation') === 'on';
  } catch { return false; }
}

// ===== Stage State =====
let currentStageIndex = 0;
let stageCols = 2, stageRows = 2, stageTotalPieces = 4;
let stagePieceShapeStyle = 'soft-rounded';
let stageSnapAssist = 'very-strong';
let stageChallengeRotationEnabled = false;
let stageAllowedRotations = [0, 90, 180, 270];
let stageRotationActive = false;  // 現在のステージで実際に回転モードが有効か (challenge ON × stage allows)
let SNAP_DIST = 55;               // pieceW * ratio で毎ロード更新

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
const modalDailyAcorn = document.getElementById('modal-daily-acorn');
const btnNextStage    = document.getElementById('btn-next-stage');
const btnPlayAgain    = document.getElementById('btn-play-again');
const confettiContainer = document.getElementById('confetti-container');
const titleScreen     = document.getElementById('title-screen');

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
  if (window.addAcornsDaily) window.addAcornsDaily('puzzle', 5, 5, { reason: 'puzzle_clear' });

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
  if (window.PONO_MVP_NO_REWARDS) {
    if (modalDailyAcorn) modalDailyAcorn.style.display = 'none';
  } else if (modalDailyAcorn && window.getDailyAcorns) {
    const n = window.getDailyAcorns('puzzle');
    modalDailyAcorn.textContent = n >= 5
      ? '🌰 きょうの どんぐりは おしまい！また あした！'
      : '🌰 きょうの どんぐり: ' + n + '/5';
    modalDailyAcorn.classList.toggle('full', n >= 5);
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
//
// makeEdge() は stagePieceShapeStyle に応じて異なる形状パラメータを返す。
// 戻り値の解釈:
//   number      → 単一ベジエの小さいタブ (buildPiecePath の typeof === 'number' 分岐)
//   { dir, pos, hw, [softness] } → 2 ベジエの非対称なノブ
//
// パラメータ一覧 (buildPiecePath 側の解釈と整合):
//   soft-rounded       : number dir のみ。 buildPiecePath 側で softness 比率を小さくする
//   large-jigsaw       : { dir, pos: 0.5, hw: 0.18-0.22 }  大きめ丸タブ
//   standard-jigsaw    : { dir, pos: 0.5, hw: 0.16 }       中サイズ
//   standard-jigsaw-v2 : { dir, pos: 0.40-0.60, hw: 0.15-0.18 }
//   advanced-jigsaw    : { dir, pos: 0.32-0.68, hw: 0.14-0.21 }
//   advanced-jigsaw-v2 : { dir, pos: 0.28-0.72, hw: 0.13-0.22 }
function buildPieces() {
  function makeEdge() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    switch (stagePieceShapeStyle) {
      case 'soft-rounded':
        // ほぼ四角・凹凸ごく控えめ。 number sentinel に変換するため小さい number を返す。
        // buildPiecePath は number を受けると単一ベジエでタブを描く。
        // soft の場合は強度を弱めるため dir を 0.35 倍して返す ( buildPiecePath 内で len*0.32 がさらに掛かる)。
        return dir * 0.35;
      case 'large-jigsaw':
        return { dir, pos: 0.5, hw: 0.18 + Math.random() * 0.04, style: 'large' }; // hw 0.18–0.22
      case 'standard-jigsaw':
        return { dir, pos: 0.5, hw: 0.16, style: 'standard' };
      case 'standard-jigsaw-v2':
        return { dir, pos: 0.40 + Math.random() * 0.20, hw: 0.15 + Math.random() * 0.03, style: 'standard' }; // pos 0.40-0.60
      case 'advanced-jigsaw':
        return { dir, pos: 0.32 + Math.random() * 0.36, hw: 0.14 + Math.random() * 0.07, style: 'standard' }; // pos 0.32-0.68
      case 'advanced-jigsaw-v2':
        return { dir, pos: 0.28 + Math.random() * 0.44, hw: 0.13 + Math.random() * 0.09, style: 'standard' }; // pos 0.28-0.72
      default:
        return dir;
    }
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
      // チャレンジモード有効 + 現ステージ challengeRotationEnabled = true なら、 0/90/180/270 をランダム付与
      let rotation = 0;
      if (stageRotationActive) {
        const opts = stageAllowedRotations.filter(r => r !== 0);
        // 全ピース回転なしだとチャレンジ要素が薄れるため、 約 75% で非ゼロにする
        if (Math.random() < 0.75 && opts.length > 0) {
          rotation = opts[Math.floor(Math.random() * opts.length)];
        }
      }
      pieces.push({
        col, row, homeX, homeY, x: homeX, y: homeY,
        tabs: {
          top:    row === 0             ? 0 : vEdge[col][row - 1],
          bottom: row === stageRows - 1 ? 0 : vEdge[col][row],
          left:   col === 0             ? 0 : hEdge[col - 1][row],
          right:  col === stageCols - 1 ? 0 : hEdge[col][row],
        },
        rotation,             // 現在の回転角 (0/90/180/270)
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
  // 回転がない場合は単純に絶対座標で Path2D を作る。
  // 回転がある場合、 isPointInPath は Path2D の幾何形状で判定するので、
  // ピース中心で回転した path を作る (描画時の transform と合わせる)。
  const path = new Path2D();
  if (!piece.rotation) {
    buildPiecePath(path, piece.x, piece.y, pieceW, pieceH, piece.tabs);
  } else {
    // ピース中心で回転させた path を作るために、 一旦原点中心で path を作り、
    // 手動で回転変換 + 平行移動した別 Path2D に addPath で焼き付ける。
    const local = new Path2D();
    buildPiecePath(local, -pieceW / 2, -pieceH / 2, pieceW, pieceH, piece.tabs);
    const cx = piece.x + pieceW / 2, cy = piece.y + pieceH / 2;
    // DOMMatrix.rotate() は度数法
    const m = new DOMMatrix()
      .translate(cx, cy)
      .rotate(piece.rotation);
    path.addPath(local, m);
  }
  piece.path = path;
}

// ===== Draw a single piece =====
function drawPiece(piece) {
  const rotated = !!piece.rotation;
  const cx = piece.x + pieceW / 2;
  const cy = piece.y + pieceH / 2;
  const rad = (piece.rotation || 0) * Math.PI / 180;

  // ---- 画像クリップ描画 ----
  puzzleCtx.save();
  if (rotated) {
    puzzleCtx.translate(cx, cy);
    puzzleCtx.rotate(rad);
    puzzleCtx.translate(-cx, -cy);
  }
  puzzleCtx.beginPath();
  buildPiecePath(puzzleCtx, piece.x, piece.y, pieceW, pieceH, piece.tabs);
  puzzleCtx.clip();
  const imgOffX = boardX + (piece.x - piece.homeX);
  const imgOffY = boardY + (piece.y - piece.homeY);
  puzzleCtx.drawImage(sourceImg, imgOffX, imgOffY, boardW, boardH);
  puzzleCtx.restore();

  // ---- アウトライン ----
  puzzleCtx.save();
  if (rotated) {
    puzzleCtx.translate(cx, cy);
    puzzleCtx.rotate(rad);
    puzzleCtx.translate(-cx, -cy);
  }
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

  // ---- 回転インジケータ (チャレンジモードで未スナップ時のみ) ----
  if (rotated && !piece.snapped) {
    puzzleCtx.save();
    puzzleCtx.fillStyle = 'rgba(242, 145, 90, 0.85)';
    puzzleCtx.beginPath();
    puzzleCtx.arc(cx, cy, Math.min(pieceW, pieceH) * 0.12, 0, Math.PI * 2);
    puzzleCtx.fill();
    puzzleCtx.fillStyle = '#fff';
    puzzleCtx.font = `bold ${Math.floor(Math.min(pieceW, pieceH) * 0.16)}px sans-serif`;
    puzzleCtx.textAlign = 'center';
    puzzleCtx.textBaseline = 'middle';
    puzzleCtx.fillText('↻', cx, cy);
    puzzleCtx.restore();
  }
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
//
// 横画面最適化: ピースを「ボード左ゾーン」と「ボード右ゾーン」に半数ずつ分配する。
// 各ゾーン内では縦方向は全高、横方向はゾーン幅内でランダム配置。
// ゾーン幅が pieceW * 1.2 未満 (極端に細い余白) ならフォールバックで全域ランダム配置に切り替え。
function computePlacementZones() {
  const pad = 8;
  const leftZone = {
    minX: pad,
    maxX: boardX - pad - pieceW,
    minY: pad,
    maxY: canvasH - pad - pieceH,
  };
  const rightZone = {
    minX: boardX + boardW + pad,
    maxX: canvasW - pad - pieceW,
    minY: pad,
    maxY: canvasH - pad - pieceH,
  };
  const leftWidth  = leftZone.maxX  - leftZone.minX;
  const rightWidth = rightZone.maxX - rightZone.minX;
  const minWidth = pieceW * 0.2; // ゾーン幅 - pieceW で見た時の最小 (pieceW * 1.2 が元のしきい値相当)
  const ok = leftWidth >= minWidth && rightWidth >= minWidth;
  return { leftZone, rightZone, ok, pad };
}

function placePieceInZone(zone) {
  const x = zone.minX + Math.random() * Math.max(0, zone.maxX - zone.minX);
  const y = zone.minY + Math.random() * Math.max(0, zone.maxY - zone.minY);
  return { x, y };
}

function placePieceFallback(pad) {
  // フォールバック: 全域からランダムサンプリングしてボード上を避ける (旧挙動)
  let best = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const tx = pad + Math.random() * Math.max(0, canvasW - pieceW - pad * 2);
    const ty = pad + Math.random() * Math.max(0, canvasH - pieceH - pad * 2);
    const onBoard = (
      tx + pieceW > boardX + pad && tx < boardX + boardW - pad &&
      ty + pieceH > boardY + pad && ty < boardY + boardH - pad
    );
    if (!onBoard) return { x: tx, y: ty };
    if (!best) best = { x: tx, y: ty };
  }
  return best;
}

function scatterPiece(piece, index, zones) {
  let pos;
  if (zones.ok) {
    // 偶数 index → 左、 奇数 index → 右 で半数ずつ分配
    const zone = (index % 2 === 0) ? zones.leftZone : zones.rightZone;
    pos = placePieceInZone(zone);
  } else {
    pos = placePieceFallback(zones.pad);
  }
  piece.x = pos.x;
  piece.y = pos.y;
}

function shufflePieces() {
  snappedCount = 0;
  const zones = computePlacementZones();
  pieces.forEach((p, i) => {
    p.snapped = false;
    // チャレンジモード有効時は回転もランダム再設定
    if (stageRotationActive) {
      const opts = stageAllowedRotations.filter(r => r !== 0);
      p.rotation = (Math.random() < 0.75 && opts.length > 0)
        ? opts[Math.floor(Math.random() * opts.length)]
        : 0;
    } else {
      p.rotation = 0;
    }
    scatterPiece(p, i, zones);
    p.zOrder = i;
    rebuildPath(p);
  });
  updateProgress();
  redraw();
}

// ===== Snap =====
// チャレンジモードでは rotation === 0 (正位置) でないとスナップしない
function trySnap(piece) {
  if (Math.hypot(piece.x - piece.homeX, piece.y - piece.homeY) >= SNAP_DIST) return false;
  if (piece.rotation && piece.rotation !== 0) return false; // 回転中はスナップ不可

  piece.x = piece.homeX; piece.y = piece.homeY;
  piece.rotation = 0;
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

// タップ vs ドラッグ判別用の状態
let pointerDownTime = 0;
let pointerDownX = 0, pointerDownY = 0;
let pointerMoveDist = 0;
const TAP_MAX_DIST = 8;     // px (canvas 座標) — これ以下の累積移動量ならタップ
const TAP_MAX_DURATION = 300; // ms — これ以下の時間ならタップ

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

  // タップ検出用の初期値
  pointerDownTime = Date.now();
  pointerDownX = x;
  pointerDownY = y;
  pointerMoveDist = 0;

  redraw();
}

function onPointerMove(e) {
  if (!dragPiece) return;
  e.preventDefault();
  const { x, y } = getPos(e);
  pointerMoveDist = Math.hypot(x - pointerDownX, y - pointerDownY);
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

  const elapsed = Date.now() - pointerDownTime;
  const isTap = pointerMoveDist < TAP_MAX_DIST && elapsed < TAP_MAX_DURATION;

  // チャレンジモード有効 + タップ + スナップ済みでない → 90度時計回り回転
  if (isTap && stageRotationActive && !piece.snapped) {
    // タップ時はピース位置を元に戻す (ドラッグで微妙にズレた分を相殺)
    piece.x = pointerDownX - dragOffX;
    piece.y = pointerDownY - dragOffY;
    piece.x = Math.max(0, Math.min(canvasW - pieceW, piece.x));
    piece.y = Math.max(0, Math.min(canvasH - pieceH, piece.y));
    piece.rotation = ((piece.rotation || 0) + 90) % 360;
    rebuildPath(piece);
    redraw();
    return;
  }

  trySnap(piece);
  redraw();
}

// ===== Initialize Puzzle (called after image loads) =====
function initPuzzle(img) {
  sourceImg = img;

  const rect = puzzleContainer.getBoundingClientRect();
  canvasW = rect.width  || 600;
  canvasH = rect.height || 400;
  lastInitW = canvasW;
  lastInitH = canvasH;

  // Remove old canvas & listeners
  puzzleContainer.innerHTML = '';

  puzzleCanvas = document.createElement('canvas');
  puzzleCanvas.width  = canvasW;
  puzzleCanvas.height = canvasH;
  puzzleCanvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
  puzzleContainer.appendChild(puzzleCanvas);
  puzzleCtx = puzzleCanvas.getContext('2d');

  // 横画面最適化: ボード幅を 55% に抑え、左右に各 ~22.5% のピース展開エリアを確保
  const boardMaxW = canvasW * 0.55;
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

  // ステージ別 SNAP_DIST (pieceW * 比率)
  const ratio = SNAP_ASSIST_RATIO[stageSnapAssist] || SNAP_ASSIST_RATIO['normal'];
  SNAP_DIST = pieceW * ratio;

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
  stageCols              = stage.cols;
  stageRows              = stage.rows;
  stageTotalPieces       = stage.pieceCount || (stageCols * stageRows);
  stagePieceShapeStyle   = stage.pieceShapeStyle || 'standard-jigsaw';
  stageSnapAssist        = stage.snapAssist || 'normal';
  stageChallengeRotationEnabled = !!stage.challengeRotationEnabled;
  stageAllowedRotations  = stage.allowedRotations || [0, 90, 180, 270];
  // チャレンジモードが ON で、 かつステージ側も許可していれば回転モード有効
  stageRotationActive    = isChallengeRotationOn() && stageChallengeRotationEnabled;

  // ステージタイトル
  const title = stage.title || stage.stageText;
  stageLabel.textContent = title
    ? `${title} (${index + 1}/${STAGES.length})`
    : `ステージ ${index + 1} / ${STAGES.length}`;

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
  // ヒント: 一時的に完成形を見せる (回転モード時は正位置に戻して表示)
  const savedRotations = pieces.map(p => p.rotation || 0);
  pieces.forEach(p => { p.x = p.homeX; p.y = p.homeY; p.rotation = 0; rebuildPath(p); });
  redraw();
  setTimeout(() => {
    if (snappedCount < stageTotalPieces) {
      const zones = computePlacementZones();
      pieces.forEach((p, i) => {
        if (!p.snapped) {
          scatterPiece(p, i, zones);
          p.rotation = savedRotations[i]; // 回転状態を復元
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

bgm.volume = 0.25;

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
let lastInitW = 0, lastInitH = 0;
const resizeObserver = new ResizeObserver(() => {
  if (!sourceImg) return;
  const rect = puzzleContainer.getBoundingClientRect();
  // ピース 1 つ以上スナップ済 + サイズ差 ±20% 以内 なら 再初期化 skip
  // (子供向けで進捗を消したくないため、 微小 resize では CSS スケールに任せる)
  if (snappedCount > 0) {
    const dw = Math.abs(rect.width  - lastInitW) / Math.max(lastInitW, 1);
    const dh = Math.abs(rect.height - lastInitH) / Math.max(lastInitH, 1);
    if (dw < 0.2 && dh < 0.2) return;
  }
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

let pendingTitleTutorial = false;

function startFromTitleScreen() {
  if (titleScreen) titleScreen.classList.add('hidden');
  getSfxCtx().resume().catch(() => {});
  if (bgmEnabled) {
    bgmStarted = false;
    tryStartBgm();
  }
  if (pendingTitleTutorial) {
    pendingTitleTutorial = false;
    setTimeout(showTutorial, 500);
  }
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
    pendingTitleTutorial = true;
  }

  if (titleScreen) {
    titleScreen.addEventListener('click', startFromTitleScreen);
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
