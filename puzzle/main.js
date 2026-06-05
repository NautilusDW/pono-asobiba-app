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

// ===== Assist Hook Registry =====
//
// Phase 1 で実装される独立ファイル (assists/*.js, partner-select.js, bond-ui.js 等) が
// main.js の主要イベントポイントに「挿入」できるようにするための薄いレジストリ。
// 既存ロジックを破壊しないために、 main.js 側は「フックを呼ぶ」だけ。フック関数の
// 例外は try/catch で握りつぶし、登録が無い場合は完全に no-op として動く。
//
// フック種別:
//   beforeStageStart(ctx)   — loadStage() 冒頭。 ctx={ stageIndex, stage, partner }
//   afterStageReady(ctx)    — initPuzzle() でピース配置完了直後。 ctx={ stageIndex, stage, partner }
//   duringDrag(ctx)         — pointermove ドラッグ中。 ctx={ piece, dx, dy, partner }
//   beforeSnap(ctx)         — trySnap() スナップ判定の手前。 false を返すとスナップキャンセル。
//                              ctx={ piece, partner }
//   afterSnap(ctx)          — スナップ成功後。 ctx={ piece, snappedCount, total, partner }
//   drawOverlay(ctx)        — redraw() のピース描画後。 ctx={ ctx: CanvasRenderingContext2D, partner }
//   beforeShowSuccess(ctx)  — showSuccessModal() 冒頭。 ctx={ stageIndex, stage, partner }
//   afterShowSuccess(ctx)   — showSuccessModal() 末尾。 ctx={ stageIndex, stage, partner, bondResult }
//
// window.PonoAssistRegister(hookName, fn) で登録、 window.PonoAssistHooks[hookName] が配列。
// 登録 API (PonoAssistHooks / PonoAssistRegister) は assists/_hooks-init.js が
// main.js より前に初期化する。main.js は使う側 (runAssistHooks / getCurrentPartner) のみを保持。

// 現在選択中のパートナーを取得 (未ロード時は null)。 hook context に渡すヘルパ。
function getCurrentPartner() {
  try {
    var id = (window.PonoBond && typeof window.PonoBond.getSelectedPartner === 'function')
      ? window.PonoBond.getSelectedPartner() : null;
    if (!id) return null;
    if (window.PonoPartners && typeof window.PonoPartners.get === 'function') {
      return window.PonoPartners.get(id) || null;
    }
  } catch (_) {}
  return null;
}

// hook 配列を順に呼ぶ。例外は握りつぶす。
// returnsBool=true の場合、 false を返したフックがあれば cancel=true を返す。
function runAssistHooks(hookName, ctx, returnsBool) {
  if (!window.PonoAssistHooks || !window.PonoAssistHooks[hookName]) return false;
  var hooks = window.PonoAssistHooks[hookName];
  var cancelled = false;
  for (var i = 0; i < hooks.length; i++) {
    try {
      var r = hooks[i](ctx);
      if (returnsBool && r === false) cancelled = true;
    } catch (e) {
      // フック例外は既存挙動に影響させない
      try { console.warn('[PonoAssistHooks] ' + hookName + ' threw:', e); } catch (_) {}
    }
  }
  return cancelled;
}

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
const btnPeek         = document.getElementById('btn-peek');
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

// ===== Audio: Scatter Shimmer (散布時の「シャラララ」) =====
// 4 つの高音サイン波を 60ms 間隔でかすかな triangle ノイズと共に重ねる。
// 子供にとって耳に痛くないよう gain は控えめ。 voice.js は使わず簡易 Web Audio API のみ。
function playScatterSfx() {
  withAudio(actx => {
    const base = actx.currentTime;
    const notes = [1568, 1976, 2349, 2794, 2093]; // G6, B6, D7, F7, C7 (キラキラ感)
    notes.forEach((freq, i) => {
      const t = base + i * 0.06;
      const osc = actx.createOscillator(), gain = actx.createGain();
      osc.connect(gain); gain.connect(actx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.start(t); osc.stop(t + 0.32);
    });
    // 上に triangle 波の短いブラシ感
    const brush = actx.createOscillator(), bg = actx.createGain();
    brush.connect(bg); bg.connect(actx.destination);
    brush.type = 'triangle';
    brush.frequency.setValueAtTime(4200, base);
    brush.frequency.exponentialRampToValueAtTime(2400, base + 0.45);
    bg.gain.setValueAtTime(0.0001, base);
    bg.gain.exponentialRampToValueAtTime(0.06, base + 0.04);
    bg.gain.exponentialRampToValueAtTime(0.001, base + 0.5);
    brush.start(base); brush.stop(base + 0.52);
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

// ===== Next-stage nudge (pulses btn-next-stage + voice prompt every 6s) =====
const nextNudge = {
  timer: null,
  start() {
    this.stop();
    this.timer = setInterval(() => {
      // If the modal is gone or the next button is hidden, auto-stop.
      if (!successModal || successModal.classList.contains('hidden')
          || !btnNextStage || btnNextStage.classList.contains('hidden')) {
        this.stop();
        return;
      }
      if (window.PuzzleVoice) window.PuzzleVoice.playRandom('next_nudge');
      if (btnNextStage) {
        // Restart the CSS animation each cycle so it visibly pulses.
        btnNextStage.classList.remove('btn-pulse');
        // Force reflow so re-adding the class restarts the animation.
        void btnNextStage.offsetWidth;
        btnNextStage.classList.add('btn-pulse');
      }
    }, 6000);
  },
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (btnNextStage) btnNextStage.classList.remove('btn-pulse');
  },
};

// ===== Success Modal =====
function showSuccessModal() {
  // === Assist hook: beforeShowSuccess ===
  var successPartner = getCurrentPartner();
  var successStage = STAGES[currentStageIndex] || null;
  var successStageId = successStage ? (successStage.id != null ? successStage.id : (currentStageIndex + 1)) : (currentStageIndex + 1);
  runAssistHooks('beforeShowSuccess', {
    stageIndex: currentStageIndex,
    stage: successStage,
    partner: successPartner,
  }, false);

  // === Bond: ハート加算 (必須) ===
  // partner 未選択時はスキップ。 leveledUp が true なら Lv 昇格演出フラグを保持。
  // stageId はここで Number に正規化して PonoBond / 後続フックに渡す
  // (bond.js は String() 変換するので number/string どちらでも動くが、型を揃えて混乱回避)
  var normalizedStageId = parseInt(successStageId, 10);
  if (!isFinite(normalizedStageId) || normalizedStageId <= 0) {
    normalizedStageId = currentStageIndex + 1;
  }
  var bondResult = null;
  try {
    if (successPartner && window.PonoBond && typeof window.PonoBond.addHeart === 'function') {
      bondResult = window.PonoBond.addHeart(successPartner.id, normalizedStageId);
    }
  } catch (e) {
    try { console.warn('[PonoBond] addHeart failed:', e); } catch (_) {}
  }
  // 他フックから参照できるよう公開
  window.PonoLastBondResult = bondResult;

  // === Fukurou unlock: Stage 20 クリアでフクロウ解禁 ===
  // プラン仕様: ステージ20クリア時に PonoBond.markFukurouUnlock() を呼ぶ
  try {
    if (normalizedStageId === 20 && window.PonoBond
        && typeof window.PonoBond.markFukurouUnlock === 'function'
        && typeof window.PonoBond.isFukurouUnlocked === 'function'
        && !window.PonoBond.isFukurouUnlocked()) {
      window.PonoBond.markFukurouUnlock();
      window.PonoFukurouJustUnlocked = true;
    }
  } catch (e) {
    try { console.warn('[PonoBond] markFukurouUnlock failed:', e); } catch (_) {}
  }

  playFanfare();
  spawnConfetti();

  // ★ 二重報酬防止 (high finding 修正):
  //   PonoPuzzleForceSnapPiece (アライグマ assist 等) が連続スナップで完了させた場合、
  //   showSuccessModal が複数回呼ばれる可能性がある。 incrementStat / addAcornsDaily は
  //   現状 idempotent ではないため、 ステージ単位で「報酬付与済みフラグ」を立てて
  //   2 回目以降の付与をスキップする。 フラグは loadStage() でリセット。
  var __rewardKey = '__pono_puzzle_reward_granted_' + (currentStageIndex);
  if (!window[__rewardKey]) {
    window[__rewardKey] = true;
    if (window.incrementStat) window.incrementStat('puzzle_clears', 1);
    if (window.addAcornsDaily) window.addAcornsDaily('puzzle', 5, 5, { reason: 'puzzle_clear' });

    // スタンプラリー: プレイ記録 (1ステージ 1 回でよいので報酬付与時にまとめる)
    (function() {
      var k = 'pono_played_' + new Date().toDateString();
      var a = JSON.parse(localStorage.getItem(k) || '[]');
      if (a.indexOf('puzzle') === -1) { a.push('puzzle'); localStorage.setItem(k, JSON.stringify(a)); }
    })();
  }

  const isLast = currentStageIndex >= STAGES.length - 1;
  if (isLast) {
    modalStageInfo.textContent = 'ぜんぶ クリア！！';
    btnNextStage.classList.add('hidden');
  } else {
    modalStageInfo.textContent = `ステージ ${currentStageIndex + 1} クリア！`;
    btnNextStage.classList.remove('hidden');
  }

  // クリア音声: fanfare と被らないよう ~800ms 遅延。isLast は全クリア専用ボイス。
  setTimeout(() => {
    if (!window.PuzzleVoice) return;
    window.PuzzleVoice.playRandom(isLast ? 'all_clear' : 'clear');
  }, 800);
  if (window.PONO_MVP_NO_REWARDS) {
    if (modalDailyAcorn) modalDailyAcorn.style.display = 'none';
  } else if (modalDailyAcorn && window.getDailyAcorns) {
    const n = window.getDailyAcorns('puzzle');
    modalDailyAcorn.textContent = n >= 5
      ? '🌰 きょうの どんぐりは おしまい！また あした！'
      : '🌰 きょうの どんぐり: ' + n + '/5';
    modalDailyAcorn.classList.toggle('full', n >= 5);
  }

  // モーダルが実際に表示された後で nudge を開始 (isLast 時はスキップ: 次へボタンが無い)
  function revealModal() {
    successModal.classList.remove('hidden');
    if (!isLast) nextNudge.start();
  }

  // ★ 全ステージクリア時は宝箱演出を先に表示、閉じたら成功モーダル
  if (isLast && window.triggerFirstClearReward) {
    window.triggerFirstClearReward('puzzle', {
      onClose: function() { revealModal(); }
    }).then(function(shown) {
      if (!shown) setTimeout(revealModal, 800);
    }).catch(function() { setTimeout(revealModal, 800); });
  } else {
    setTimeout(revealModal, 800);
  }

  // === Assist hook: afterShowSuccess ===
  runAssistHooks('afterShowSuccess', {
    stageIndex: currentStageIndex,
    stage: successStage,
    partner: successPartner,
    stageId: normalizedStageId,
    bondResult: bondResult,
  }, false);
}

function hideSuccessModal() {
  successModal.classList.add('hidden');
  nextNudge.stop();
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

  // === Assist hook: drawOverlay ===
  // ピース描画後にパートナーアニメ・ガイド線などを重ねるためのフック
  if (puzzleCtx) {
    runAssistHooks('drawOverlay', {
      ctx: puzzleCtx,
      partner: getCurrentPartner(),
      pieces: pieces,
      dragPiece: dragPiece,
      sourceImg: sourceImg,
      board: { x: boardX, y: boardY, w: boardW, h: boardH },
      pieceSize: { w: pieceW, h: pieceH },
      canvas: { w: canvasW, h: canvasH },
      requestRedraw: function () {
        // assist 側がピース座標を変えた後、 もう 1 フレーム描き直してほしい時に呼ぶ
        try { requestAnimationFrame(redraw); } catch (_) { redraw(); }
      },
    }, false);
  }
}

function hitTest(piece, px, py) {
  rebuildPath(piece);
  return puzzleCtx.isPointInPath(piece.path, px, py);
}

// ===== Shuffle =====
//
// 16:9 化に伴い、ピースは「フレーム全域 (中央ボード矩形を除く)」にランダム配置する。
// 各ピースで最大 SCATTER_ATTEMPTS 回試行し、既に配置済みピースとの最近傍距離が
// minDist (= max(pieceW, pieceH) * SEPARATION_RATIO) 以上になる位置を採用。
// 全試行で minDist 未達なら、最も離れた候補をベストとして採用する。
const SCATTER_ATTEMPTS = 24;
const SEPARATION_RATIO = 0.85;

function computePlacementZones() {
  const pad = Math.max(8, pieceW * 0.10);
  // 中央ボード矩形 (ピースが落ちるとスナップ判定が発火しうるエリア) — pad で僅かに膨らませる
  const bx0 = boardX - pad;
  const by0 = boardY - pad;
  const bx1 = boardX + boardW + pad;
  const by1 = boardY + boardH + pad;
  return { W: canvasW, H: canvasH, pad, bx0, by0, bx1, by1 };
}

function placePieceFallback(zones, w, h) {
  // 24 試行すべて失敗時の最終フォールバック: 左ストリップ or 右ストリップ
  // (中央ボード矩形を必ず避ける)。 縦は全域からサンプリング。
  const leftW  = Math.max(1, zones.bx0 - zones.pad - w);
  const rightW = Math.max(1, zones.W - zones.bx1 - zones.pad - w);
  const useLeft = (leftW > rightW) ? true
                  : (rightW > leftW) ? false
                  : (Math.random() < 0.5);
  const x = useLeft
    ? zones.pad + Math.random() * leftW
    : zones.bx1 + Math.random() * rightW;
  const y = zones.pad + Math.random() * Math.max(1, zones.H - 2 * zones.pad - h);
  return { x: Math.max(zones.pad, x), y };
}

function placePieceInZone(zones, w, h, placed) {
  const minDist = Math.max(w, h) * SEPARATION_RATIO;
  let best = null;
  let bestScore = -Infinity;
  for (let attempt = 0; attempt < SCATTER_ATTEMPTS; attempt++) {
    const x = zones.pad + Math.random() * Math.max(1, zones.W - 2 * zones.pad - w);
    const y = zones.pad + Math.random() * Math.max(1, zones.H - 2 * zones.pad - h);
    // ピース中心がボード矩形内に入る配置は除外 (スナップ誤発火防止)
    const cx = x + w / 2, cy = y + h / 2;
    const inBoard = (cx > zones.bx0 && cx < zones.bx1 && cy > zones.by0 && cy < zones.by1);
    if (inBoard) continue;
    // 既配置ピースとの最近傍距離をスコアに (大きい方が良い)
    let nearest = Infinity;
    for (const p of placed) {
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < nearest) nearest = d;
    }
    if (nearest >= minDist) {
      return { x, y };
    }
    if (nearest > bestScore) {
      bestScore = nearest;
      best = { x, y };
    }
  }
  return best || placePieceFallback(zones, w, h);
}

function scatterPiece(piece, index, zones, placed) {
  const pos = placePieceInZone(zones, pieceW, pieceH, placed || []);
  piece.x = pos.x;
  piece.y = pos.y;
  if (placed) placed.push({ x: pos.x, y: pos.y });
}

function shufflePieces() {
  snappedCount = 0;
  const zones = computePlacementZones();
  const placed = [];
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
    scatterPiece(p, i, zones, placed);
    p.zOrder = i;
    rebuildPath(p);
  });
  updateProgress();
  redraw();
}

// ===== Scatter Animation (prestart 専用) =====
//
// 「完成形 (homeX, homeY) から shuffled positions へ 1200ms で rAF 補間散布」する。
// 既存 shufflePieces() は即時シャッフル (まぜるボタン用) のため、本関数では
// 「ターゲット座標 (+回転) を先に計算 → ピース位置は homeX/Y のまま据え置き →
//  rAF ループで補間 → 完了時に正規ターゲットへ着地」のフローを行う。
//
// 進行中は scatterAnimating=true を立て、 puzzle-container に scatter-on を
// 付与してパズル canvas 入力を CSS で殺す (dragPiece=null も冒頭で念押し)。
let scatterAnimating = false;

function computeScatterTargets() {
  const zones = computePlacementZones();
  const placed = [];
  const targets = [];
  pieces.forEach(p => {
    // 散布後の回転 (チャレンジモード有効時のみランダム、なければ 0)
    let targetRot = 0;
    if (stageRotationActive) {
      const opts = stageAllowedRotations.filter(r => r !== 0);
      if (Math.random() < 0.75 && opts.length > 0) {
        targetRot = opts[Math.floor(Math.random() * opts.length)];
      }
    }
    const pos = placePieceInZone(zones, pieceW, pieceH, placed);
    placed.push({ x: pos.x, y: pos.y });
    targets.push({ x: pos.x, y: pos.y, rotation: targetRot });
  });
  return targets;
}

function animateShuffleScatter(onDone) {
  if (!pieces || !pieces.length) { if (onDone) onDone(); return; }
  if (scatterAnimating) return; // 二重起動防止

  // 全ピースを homeX/Y + rotation=0 + snapped=false に戻す (完成形配置)
  snappedCount = 0;
  pieces.forEach((p, i) => {
    p.snapped = false;
    p.rotation = 0;
    p.x = p.homeX;
    p.y = p.homeY;
    p.zOrder = i;
    rebuildPath(p);
  });
  updateProgress();

  // ターゲット位置・回転を先に計算 (ピース位置は据え置き)
  const targets = computeScatterTargets();
  const fromStates = pieces.map(p => ({ x: p.x, y: p.y, rotation: p.rotation || 0 }));

  // アニメ準備: 操作ロック
  scatterAnimating = true;
  dragPiece = null;
  if (puzzleContainer) puzzleContainer.classList.add('scatter-on');

  // 効果音
  try { playScatterSfx(); } catch (_) {}

  const DURATION = 1200;
  const startT = performance.now();

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function step(now) {
    const elapsed = now - startT;
    const t = Math.min(1, Math.max(0, elapsed / DURATION));
    const e = easeOutCubic(t);
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      const from = fromStates[i];
      const to = targets[i];
      p.x = from.x + (to.x - from.x) * e;
      p.y = from.y + (to.y - from.y) * e;
      // 回転は最終フレームでだけ反映 (途中は 0 のまま) — 子供向けに視覚混乱を抑える
      // 必要なら以下を有効化して途中で少し回す (今は無効):
      // p.rotation = from.rotation + (to.rotation - from.rotation) * e;
      rebuildPath(p);
    }
    redraw();
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      // 完全着地 + 回転確定
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        const to = targets[i];
        p.x = to.x;
        p.y = to.y;
        p.rotation = to.rotation;
        rebuildPath(p);
      }
      redraw();
      scatterAnimating = false;
      if (puzzleContainer) puzzleContainer.classList.remove('scatter-on');
      if (typeof onDone === 'function') onDone();
    }
  }
  requestAnimationFrame(step);
}

// ===== Prestart Overlay (完成形 → スタートボタン → 散布アニメ) =====
//
// initPuzzle() の末尾でこれを呼ぶと、 ピースは homeX/Y に並んだ「完成形」のまま
// 半透明の暗幕 + 中央の大きな「スタート」ボタンを puzzle-container に重ねる。
// ボタンタップで overlay を消し、 animateShuffleScatter() でプレイ可能状態へ遷移する。
let prestartOverlayEl = null;

function removePrestartOverlay() {
  if (prestartOverlayEl && prestartOverlayEl.parentNode) {
    prestartOverlayEl.parentNode.removeChild(prestartOverlayEl);
  }
  prestartOverlayEl = null;
  if (puzzleContainer) puzzleContainer.classList.remove('prestart-on');
}

function showPrestartOverlay() {
  if (!puzzleContainer) return;
  removePrestartOverlay(); // 古い overlay が残っていれば破棄

  // ピースを完成形に固定 (initPuzzle 直後の状態を保証)
  // buildPieces 後でピースは既に homeX/Y にあるはずだが、 念のため snapped=true 扱いせず
  // x/y/rotation を home 状態に正規化しておく。
  pieces.forEach(p => {
    p.x = p.homeX;
    p.y = p.homeY;
    p.rotation = 0;
    p.snapped = false;
    rebuildPath(p);
  });
  snappedCount = 0;
  updateProgress();
  redraw();

  const overlay = document.createElement('div');
  overlay.className = 'prestart-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'スタート');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'prestart-overlay__btn';
  btn.textContent = 'スタート';
  overlay.appendChild(btn);

  function onStart(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    btn.removeEventListener('pointerdown', onStart);
    // フェードアウト後に DOM 除去 → 散布アニメ起動
    overlay.classList.add('is-hide');
    setTimeout(() => {
      removePrestartOverlay();
      animateShuffleScatter();
    }, 200);
  }
  btn.addEventListener('pointerdown', onStart);

  puzzleContainer.appendChild(overlay);
  puzzleContainer.classList.add('prestart-on');
  prestartOverlayEl = overlay;
}

// ===== Snap =====
// チャレンジモードでは rotation === 0 (正位置) でないとスナップしない
function trySnap(piece) {
  if (Math.hypot(piece.x - piece.homeX, piece.y - piece.homeY) >= SNAP_DIST) return false;
  if (piece.rotation && piece.rotation !== 0) return false; // 回転中はスナップ不可

  // === Assist hook: beforeSnap (cancellable) ===
  var snapPartner = getCurrentPartner();
  var snapCancelled = runAssistHooks('beforeSnap', { piece: piece, partner: snapPartner }, true);
  if (snapCancelled) return false;

  piece.x = piece.homeX; piece.y = piece.homeY;
  piece.rotation = 0;
  piece.snapped = true;
  piece.zOrder = -1; // はめ込み済みは常に背後
  rebuildPath(piece);
  snappedCount++;
  updateProgress();
  playSnapSound();

  // === Assist hook: afterSnap ===
  runAssistHooks('afterSnap', {
    piece: piece,
    snappedCount: snappedCount,
    total: stageTotalPieces,
    partner: snapPartner,
  }, false);

  if (snappedCount >= stageTotalPieces) {
    redraw();
    setTimeout(showSuccessModal, 300);
  }
  return true;
}

// ===== Assist external helper: Force-snap a piece =====
//
// アシスト (araiguma 「ぴかっとおてつだい」等) が、 指定ピースを強制的に
// スナップ済み状態にするための public ヘルパ。
//
// 通常の trySnap() は「homeX/homeY との距離 < SNAP_DIST」を要求するが、
// この関数は距離判定をスキップしてそのままホーム位置にスナップする。
// beforeSnap フックも呼ばないので、 他アシストがキャンセルすることはない。
// (アライグマの自動スナップは「ボタン明示操作」なので、 他補助に拒否権を
//  与えると UX 上不自然なため)
//
// 戻り値: 実際にスナップした場合 true。 既にスナップ済み / 不正引数なら false。
window.PonoPuzzleForceSnapPiece = function (piece) {
  if (!piece || piece.snapped) return false;
  if (!pieces || pieces.indexOf(piece) < 0) return false;
  piece.x = piece.homeX;
  piece.y = piece.homeY;
  piece.rotation = 0;
  piece.snapped = true;
  piece.zOrder = -1;
  rebuildPath(piece);
  snappedCount++;
  updateProgress();
  playSnapSound();

  // === Assist hook: afterSnap ===
  runAssistHooks('afterSnap', {
    piece: piece,
    snappedCount: snappedCount,
    total: stageTotalPieces,
    partner: getCurrentPartner(),
  }, false);

  if (snappedCount >= stageTotalPieces) {
    redraw();
    setTimeout(showSuccessModal, 300);
  } else {
    redraw();
  }
  return true;
};

// 未スナップピースの read-only スナップショットを返す (アシスト向け)。
// 配列自体は新規生成し中身は参照共有 (assist 側からピース x/y を弄っても
// main 内部 pieces 配列の同じピース要素を指すので OK)。
window.PonoPuzzleGetUnsnappedPieces = function () {
  if (!pieces || !pieces.length) return [];
  var out = [];
  for (var i = 0; i < pieces.length; i++) {
    var p = pieces[i];
    if (p && !p.snapped) out.push(p);
  }
  return out;
};

// アシストが overlay を即時再描画したい時用。
window.PonoPuzzleRequestRedraw = function () {
  try { requestAnimationFrame(redraw); } catch (_) { try { redraw(); } catch (__) {} }
};

// ===== Hint System (Phase 3b Step 3) =====
//
// 旧仕様: ヒントボタン押下 → 完成形を全体表示。
// 新仕様: ① 盤外の未スナップピースをタップ → 黄色 pulse ring で選択
//         ② ヒントボタン押下 → 選択ピースのスロットに金色星 + radial glow を 2 秒
//         ③ 回数管理: ステージ毎に localStorage 保存
//         ④ パートナーのなかよし度に応じて初期回数 1/2/3/5
//
// PonoHintActive フラグ: ヒント選択中 (yellow pulse 表示中) は他アシスト発光を
// 30% 透明度に下げてもらうための共有フラグ。 assist 側は drawOverlay 内で
// window.PonoHintActive をチェックし、 true なら ctx.globalAlpha *= 0.3 する。
// (assist 各 .js への介入は Phase 3c 予定。 ここではフラグ供給のみ。)

let selectedPieceForHint = null;        // 現在ヒント対象として選択中のピース or null
let hintFlashUntil = 0;                 // 金色星演出の終了時刻 (Date.now ms)
let hintFlashPiece = null;              // 金色星演出の対象ピース
let hintAnimRafHandle = null;           // 黄 pulse / 金 star 用 rAF
let hintNoticeTimeout = null;           // 「ピースを えらんで〜」吹き出しの非表示タイマー

const HINT_FLASH_DURATION_MS = 1500;    // 金色星 + radial glow 表示時間 (Phase 3c: 2000→1500)

// Phase 3c 確定テーブル: パートナー / Lv / Stage に応じてヒント初期回数を計算
//   - 装備なし: base + (Lv3 で +1)、上限 3
//       base = {Stage 1-5: 1, Stage 6-12: 2, Stage 13-20: 3}
//   - キツネ装備: 3 + (Stage13以降で +1) + (Lv3 で +1)、上限 5
//   - user drawing stage (id >= 1000) は安全策として「装備なし base=3」相当扱い
function computeHintUses(stageNum, partnerId, level) {
  var lv = (typeof level === 'number' && isFinite(level)) ? level : 0;
  var lv3Bonus = (lv >= 3) ? 1 : 0;
  var sNum = (typeof stageNum === 'number' && isFinite(stageNum)) ? stageNum : 1;
  var isKitsune = (partnerId === 'kitsune');
  if (isKitsune) {
    var stageBonus = (sNum >= 13) ? 1 : 0;
    return Math.min(5, 3 + stageBonus + lv3Bonus);
  }
  // 装備なし / 他パートナー (現状はキツネだけがヒント特化)
  var base;
  if (sNum <= 5) base = 1;
  else if (sNum <= 12) base = 2;
  else base = 3;
  return Math.min(3, base + lv3Bonus);
}

// stageId (built-in: 1..20, user drawing: 1000+) → 計算用 stageNum
//   user drawing は上限ステージ (20) 相当として扱い、ベース base=3 を与える
function hintStageNumFor(stageId) {
  if (stageId == null) return 1;
  var n = Number(stageId);
  if (!isFinite(n)) return 1;
  if (n >= 1000) return 20; // user drawing → 最高難度扱い
  return n;
}

// 旧 API 互換: getHintUsesRemaining / 旧呼び出し元用ラッパー
function computeHintInitialUses(stageId) {
  try {
    var partnerId = (window.PonoBond && typeof window.PonoBond.getSelectedPartner === 'function')
      ? window.PonoBond.getSelectedPartner() : null;
    var lv = 0;
    if (partnerId && window.PonoBond && typeof window.PonoBond.getLevel === 'function') {
      lv = window.PonoBond.getLevel(partnerId, stageId) || 0;
    }
    return computeHintUses(hintStageNumFor(stageId), partnerId, lv);
  } catch (_) {
    return 1;
  }
}

// localStorage 名前空間 (puzzle/ もりのなかよし 専用ヒント残数ストレージ)
// - 旧 key 'pono_hint_uses_<id>' は他コンポーネントとの衝突リスクがあるため
//   'pono_puzzle_hint_uses_v1_<bucket>_<id>' に置き換え。
// - bucket: built-in stage(id<1000) と user drawing stage(id>=1000) を分離し、
//   万一 id 重複や領域の意味変更があっても汚染しないようにする。
// - スキーマバージョン key で他コードが同じ prefix を踏んだ際に検出できるようにする。
var PUZZLE_HINT_USES_KEY_PREFIX = 'pono_puzzle_hint_uses_v1_';
var PUZZLE_HINT_USES_SCHEMA_KEY = 'pono_puzzle_hint_uses_schema';
var PUZZLE_HINT_USES_SCHEMA_VERSION = '1';
var PUZZLE_HINT_USES_MIGRATION_FLAG = 'pono_puzzle_hint_uses_migrated_v1';

function isUserDrawingStageId(stageId) {
  // user drawing stages は id >= 1000 (main.js 内 既存規約)
  var n = (stageId == null) ? NaN : Number(stageId);
  return isFinite(n) && n >= 1000;
}

function hintUsesStorageKey(stageId) {
  var idPart = (stageId != null ? String(stageId) : 'unknown');
  var bucket = isUserDrawingStageId(stageId) ? 'u' : 'b';
  return PUZZLE_HINT_USES_KEY_PREFIX + bucket + '_' + idPart;
}

// 旧 key 'pono_hint_uses_<id>' から 新 key へ一度だけ移行 (既存ユーザのヒント残数を保持)
function migrateLegacyHintUsesKeysOnce() {
  try {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(PUZZLE_HINT_USES_MIGRATION_FLAG) === '1') return;
    var legacyPrefix = 'pono_hint_uses_';
    var legacyKeys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(legacyPrefix) === 0) legacyKeys.push(k);
    }
    for (var j = 0; j < legacyKeys.length; j++) {
      var oldKey = legacyKeys[j];
      var idStr = oldKey.substring(legacyPrefix.length);
      // 旧 key は 'unknown' を含むことがあるので numeric 以外は捨てる
      var idNum = parseInt(idStr, 10);
      var sid = isFinite(idNum) ? idNum : idStr;
      var newKey = hintUsesStorageKey(sid);
      try {
        var val = localStorage.getItem(oldKey);
        if (val != null && localStorage.getItem(newKey) == null) {
          localStorage.setItem(newKey, val);
        }
        localStorage.removeItem(oldKey);
      } catch (_) {}
    }
    // スキーマバージョン記録 + 二重移行防止フラグ
    try { localStorage.setItem(PUZZLE_HINT_USES_SCHEMA_KEY, PUZZLE_HINT_USES_SCHEMA_VERSION); } catch (_) {}
    try { localStorage.setItem(PUZZLE_HINT_USES_MIGRATION_FLAG, '1'); } catch (_) {}
  } catch (_) {}
}

// 初回呼び出し時に旧形式からの移行を試みる
try { migrateLegacyHintUsesKeysOnce(); } catch (_) {}

// 残回数を読み取り (未保存なら初期回数で初期化して書き込む)
function getHintUsesRemaining(stageId) {
  if (stageId == null) return 1;
  try {
    var key = hintUsesStorageKey(stageId);
    var raw = localStorage.getItem(key);
    if (raw == null) {
      var init = computeHintInitialUses(stageId);
      try { localStorage.setItem(key, String(init)); } catch (_) {}
      return init;
    }
    var n = parseInt(raw, 10);
    if (!isFinite(n) || n < 0) return 0;
    return n;
  } catch (_) {
    return computeHintInitialUses(stageId);
  }
}

function setHintUsesRemaining(stageId, n) {
  if (stageId == null) return;
  try {
    localStorage.setItem(hintUsesStorageKey(stageId), String(Math.max(0, n | 0)));
  } catch (_) {}
}

function getCurrentStageIdForHint() {
  var stage = STAGES[currentStageIndex];
  if (!stage) return null;
  return (stage.id != null ? stage.id : (currentStageIndex + 1));
}

// ヒントボタンの状態 (有効/グレーアウト/残数表示/😴) を更新
function refreshHintButtonState() {
  if (!btnHint) return;
  var sid = getCurrentStageIdForHint();
  var remaining = sid != null ? getHintUsesRemaining(sid) : 0;
  // Phase 3c: キツネ装備時はラベルを「ヒント🦊」に切り替えて視覚差別化
  var partnerIdForLabel = null;
  try {
    partnerIdForLabel = (window.PonoBond && typeof window.PonoBond.getSelectedPartner === 'function')
      ? window.PonoBond.getSelectedPartner() : null;
  } catch (_) { partnerIdForLabel = null; }
  var label = (partnerIdForLabel === 'kitsune') ? 'ヒント🦊' : 'ヒント';
  if (dragPiece) {
    // ドラッグ中は無効化 + 😴 マーク
    btnHint.classList.add('is-disabled', 'is-sleeping');
    btnHint.classList.remove('is-empty');
    btnHint.textContent = '😴 ' + label;
    btnHint.setAttribute('aria-disabled', 'true');
    return;
  }
  btnHint.classList.remove('is-sleeping');
  if (remaining <= 0) {
    btnHint.classList.add('is-disabled', 'is-empty');
    btnHint.textContent = label + ' (0)';
    btnHint.setAttribute('aria-disabled', 'true');
    return;
  }
  btnHint.classList.remove('is-disabled', 'is-empty');
  btnHint.textContent = label + ' (のこり ' + remaining + ')';
  btnHint.setAttribute('aria-disabled', 'false');
}

// ヒントボタンを軽く震わせる (残数 0 で押された時)
function shakeHintButton() {
  if (!btnHint) return;
  btnHint.classList.remove('is-shake');
  // 強制 reflow で animation 再起動
  void btnHint.offsetWidth;
  btnHint.classList.add('is-shake');
  setTimeout(function () { if (btnHint) btnHint.classList.remove('is-shake'); }, 400);
}

// 「ピースを えらんで からおしてね」吹き出しを表示
function showHintNotice() {
  if (!puzzleContainer) return;
  var existing = document.getElementById('hint-notice-bubble');
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  if (hintNoticeTimeout) { clearTimeout(hintNoticeTimeout); hintNoticeTimeout = null; }
  var el = document.createElement('div');
  el.id = 'hint-notice-bubble';
  el.className = 'hint-notice-bubble';
  el.textContent = 'ピースを えらんで からおしてね';
  puzzleContainer.appendChild(el);
  hintNoticeTimeout = setTimeout(function () {
    if (el && el.parentNode) el.parentNode.removeChild(el);
    hintNoticeTimeout = null;
  }, 1600);
}

// 黄色 pulse ring + 金色星 演出の rAF ループ。 必要時のみ起動・停止。
function ensureHintAnimLoop() {
  if (hintAnimRafHandle != null) return;
  function loop() {
    hintAnimRafHandle = null;
    var now = Date.now();
    var needYellow = !!(selectedPieceForHint && !selectedPieceForHint.snapped);
    var needGold   = !!(hintFlashPiece && now < hintFlashUntil);
    // 共有フラグ: ヒント選択中は assist の発光を抑えてもらう
    window.PonoHintActive = needYellow;
    if (!needYellow && !needGold) {
      window.PonoHintActive = false;
      // overlay クリアのため 1 回だけ redraw して終了
      try { redraw(); } catch (_) {}
      // hintFlashPiece の参照も解放
      if (now >= hintFlashUntil) hintFlashPiece = null;
      return;
    }
    try { redraw(); } catch (_) {}
    hintAnimRafHandle = requestAnimationFrame(loop);
  }
  hintAnimRafHandle = requestAnimationFrame(loop);
}

// ピース中心座標
function pieceCenter(piece, useHome) {
  if (useHome) {
    return { cx: piece.homeX + pieceW / 2, cy: piece.homeY + pieceH / 2 };
  }
  return { cx: piece.x + pieceW / 2, cy: piece.y + pieceH / 2 };
}

// drawOverlay フックから呼ばれる: 黄色 pulse ring + 金色星 + radial glow を描画
function drawHintOverlay(ctx) {
  if (!ctx) return;
  var now = Date.now();

  // ── 黄色 pulse ring (選択中ピース) ──
  if (selectedPieceForHint && !selectedPieceForHint.snapped
      && pieces && pieces.indexOf(selectedPieceForHint) >= 0) {
    var c = pieceCenter(selectedPieceForHint, false);
    var r = Math.max(pieceW, pieceH) * 0.62;
    var pulse = 0.5 + 0.5 * Math.sin(now / 220);  // 0..1
    var alpha = 0.55 + 0.35 * pulse;               // 0.55..0.90
    ctx.save();
    ctx.lineWidth = 4 + 2 * pulse;
    ctx.strokeStyle = 'rgba(250, 204, 21, ' + alpha.toFixed(3) + ')'; // amber-400
    ctx.shadowColor = 'rgba(250, 204, 21, 0.85)';
    ctx.shadowBlur = 18 + 10 * pulse;
    ctx.beginPath();
    ctx.arc(c.cx, c.cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── 金色星 + radial glow (ヒント発火後 1.5 秒) ──
  // Phase 3c: 「正解そのもの」感を抑える: 星 -20% / glow 半径 -30% / 表示時間 1500ms / 枠点滅は維持
  if (hintFlashPiece && now < hintFlashUntil
      && pieces && pieces.indexOf(hintFlashPiece) >= 0) {
    var t = (hintFlashUntil - now) / HINT_FLASH_DURATION_MS; // 1 → 0
    var phase = 1 - t;                                       // 0 → 1
    var slot = pieceCenter(hintFlashPiece, true);
    var blink = 0.5 + 0.5 * Math.sin(now / 120);             // 0..1
    // glow 半径 30% 縮小: 旧 0.4 + 0.5*phase → 0.28 + 0.35*phase
    var glowR = Math.max(pieceW, pieceH) * (0.28 + 0.35 * phase);

    ctx.save();
    // radial glow (alpha も少し控えめに)
    var grad = ctx.createRadialGradient(slot.cx, slot.cy, 4, slot.cx, slot.cy, glowR);
    grad.addColorStop(0,   'rgba(255, 215, 64, ' + (0.42 * (1 - phase * 0.4)).toFixed(3) + ')');
    grad.addColorStop(0.6, 'rgba(255, 200, 0, 0.12)');
    grad.addColorStop(1,   'rgba(255, 200, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(slot.cx, slot.cy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // 枠点滅 (どこか分かる程度 → 維持)
    ctx.lineWidth = 3 + 2 * blink;
    ctx.strokeStyle = 'rgba(255, 215, 64, ' + (0.6 + 0.35 * blink).toFixed(3) + ')';
    ctx.shadowColor = 'rgba(255, 215, 64, 0.9)';
    ctx.shadowBlur = 16 + 10 * blink;
    ctx.beginPath();
    buildPiecePath(ctx, hintFlashPiece.homeX, hintFlashPiece.homeY, pieceW, pieceH, hintFlashPiece.tabs);
    ctx.stroke();

    // 金色星 (5 つ尖り) — サイズ 20% 縮小: 0.32 → 0.256
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(255, 224, 102, ' + (0.85 + 0.15 * blink).toFixed(3) + ')';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.95)';
    ctx.lineWidth = 2.5;
    drawStar(ctx, slot.cx, slot.cy, Math.min(pieceW, pieceH) * 0.256, 5, 0.45);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// 5 角星を path に描く (fill / stroke は呼び出し側)
function drawStar(ctx, cx, cy, outerR, points, innerRatio) {
  var step = Math.PI / points;
  var innerR = outerR * innerRatio;
  ctx.beginPath();
  for (var i = 0; i < points * 2; i++) {
    var r = (i % 2 === 0) ? outerR : innerR;
    var a = -Math.PI / 2 + i * step;
    var px = cx + Math.cos(a) * r;
    var py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// drawOverlay フック登録 (assist と同じ薄いフレームに乗せる)
if (window.PonoAssistRegister) {
  window.PonoAssistRegister('drawOverlay', function (ctx) {
    if (!ctx || !ctx.ctx) return;
    drawHintOverlay(ctx.ctx);
  });
} else {
  // _hooks-init.js が未ロードでも動くよう、 PonoAssistHooks に直接 push
  try {
    window.PonoAssistHooks = window.PonoAssistHooks || {};
    window.PonoAssistHooks.drawOverlay = window.PonoAssistHooks.drawOverlay || [];
    window.PonoAssistHooks.drawOverlay.push(function (ctx) {
      if (!ctx || !ctx.ctx) return;
      drawHintOverlay(ctx.ctx);
    });
  } catch (_) {}
}

// 公開: クリックで選択を変更/解除する
function setSelectedPieceForHint(piece) {
  // null / 別ピースで上書き / 同一なら無変化
  if (piece === selectedPieceForHint) return;
  selectedPieceForHint = (piece && !piece.snapped) ? piece : null;
  if (selectedPieceForHint) {
    ensureHintAnimLoop();
  } else {
    // 解除時も 1 フレーム redraw して overlay を消す
    window.PonoHintActive = false;
    try { redraw(); } catch (_) {}
  }
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
  // 散布アニメ中・prestart 表示中は一切のドラッグを拒否 (CSS pointer-events と二重防御)
  if (scatterAnimating || prestartOverlayEl) return;
  const { x, y } = getPos(e);
  let found = null;
  for (const p of pieces) {
    if (p.snapped) continue;
    if (hitTest(p, x, y) && (!found || p.zOrder > found.zOrder)) found = p;
  }
  // タップ検出用の初期値はピース有無に関わらず常に記録 (空タップで選択解除のため)
  pointerDownTime = Date.now();
  pointerDownX = x;
  pointerDownY = y;
  pointerMoveDist = 0;

  if (!found) {
    // 空タップの可能性: pointerup で判定して selectedPieceForHint をクリアする。
    // dragPiece は立てないが、 pointerup ハンドラを通すため down ハンドラの中で
    // emptyTapPending フラグを立てておく。
    emptyTapPending = true;
    return;
  }
  emptyTapPending = false;
  dragPiece = found;
  dragOffX = x - found.x; dragOffY = y - found.y;
  dragPiece.zOrder = Math.max(...pieces.map(p => p.zOrder)) + 1;

  // ドラッグ開始時はヒントボタンを 😴 に
  refreshHintButtonState();

  redraw();
}

// onPointerDown で何もヒットしなかった時に立てる「空タップ判定保留」フラグ。
// canvas は capture を取らないので、 空タップ時は pointerup が来ない経路もあり得る。
// → puzzleCanvas に pointerup を別途バインドして、 emptyTapPending && 短距離・短時間
//   なら selectedPieceForHint = null にする (下の initPuzzle 内で登録)。
let emptyTapPending = false;

function onPointerMove(e) {
  if (!dragPiece) return;
  e.preventDefault();
  const { x, y } = getPos(e);
  pointerMoveDist = Math.hypot(x - pointerDownX, y - pointerDownY);
  const newX = Math.max(0, Math.min(canvasW - pieceW, x - dragOffX));
  const newY = Math.max(0, Math.min(canvasH - pieceH, y - dragOffY));
  const dxMove = newX - dragPiece.x;
  const dyMove = newY - dragPiece.y;
  dragPiece.x = newX;
  dragPiece.y = newY;
  rebuildPath(dragPiece);

  // === Assist hook: duringDrag ===
  runAssistHooks('duringDrag', {
    piece: dragPiece,
    dx: dxMove,
    dy: dyMove,
    partner: getCurrentPartner(),
  }, false);

  redraw();
}

function onPointerUp(e) {
  // 空タップ (どのピースにも当たらず pointerdown が始まった) のクリア処理
  if (!dragPiece) {
    if (emptyTapPending) {
      emptyTapPending = false;
      // 短距離・短時間なら選択解除 (盤面の何もない所をタップ)
      try {
        const { x: ex, y: ey } = getPos(e);
        const distNow = Math.hypot(ex - pointerDownX, ey - pointerDownY);
        const elapsedEmpty = Date.now() - pointerDownTime;
        if (distNow < TAP_MAX_DIST && elapsedEmpty < TAP_MAX_DURATION) {
          if (selectedPieceForHint) setSelectedPieceForHint(null);
        }
      } catch (_) {}
    }
    return;
  }
  e.preventDefault();
  const piece = dragPiece;
  dragPiece = null;
  emptyTapPending = false;

  const elapsed = Date.now() - pointerDownTime;
  const isTap = pointerMoveDist < TAP_MAX_DIST && elapsed < TAP_MAX_DURATION;

  // タップ判定 (移動 ≦ 8px / 300ms 以内) で 未スナップピース → ヒント対象として選択。
  // 回転モードが ON ならその後ろで rotation も行う (両立)。
  if (isTap && !piece.snapped) {
    setSelectedPieceForHint(piece);
  }

  // チャレンジモード有効 + タップ + スナップ済みでない → 90度時計回り回転
  if (isTap && stageRotationActive && !piece.snapped) {
    // タップ時はピース位置を元に戻す (ドラッグで微妙にズレた分を相殺)
    piece.x = pointerDownX - dragOffX;
    piece.y = pointerDownY - dragOffY;
    piece.x = Math.max(0, Math.min(canvasW - pieceW, piece.x));
    piece.y = Math.max(0, Math.min(canvasH - pieceH, piece.y));
    piece.rotation = ((piece.rotation || 0) + 90) % 360;
    rebuildPath(piece);
    refreshHintButtonState();
    redraw();
    return;
  }

  trySnap(piece);
  // スナップで選択中ピースが固定された場合は選択解除
  if (selectedPieceForHint && selectedPieceForHint.snapped) {
    setSelectedPieceForHint(null);
  }
  refreshHintButtonState();
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
  // innerHTML='' で旧 prestart overlay / peek canvas も巻き込んで除去されるので、
  // 対応する参照変数もクリアし、 残留クラスを念のため外す。
  puzzleContainer.innerHTML = '';
  prestartOverlayEl = null;
  peekCanvas = null;
  puzzleContainer.classList.remove('prestart-on', 'scatter-on', 'peek-on');
  scatterAnimating = false;

  puzzleCanvas = document.createElement('canvas');
  puzzleCanvas.width  = canvasW;
  puzzleCanvas.height = canvasH;
  puzzleCanvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
  puzzleContainer.appendChild(puzzleCanvas);
  puzzleCtx = puzzleCanvas.getContext('2d');

  // 16:9 フレーム化に伴いボード幅を 50% に抑え、フレーム全域をピース散布エリアとして利用する
  const boardMaxW = canvasW * 0.50;
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

  // ピースは buildPieces() で既に homeX/Y (完成形) に配置済み。
  // 即時シャッフルせず、 完成形を 1 フレーム描いてからプレスタートオーバーレイを表示する。
  // ユーザーが「スタート」を押した時点で散布アニメ → プレイ可能。
  snappedCount = 0;
  updateProgress();
  redraw();
  showPrestartOverlay();

  // === Assist hook: afterStageReady ===
  runAssistHooks('afterStageReady', {
    stageIndex: currentStageIndex,
    stage: STAGES[currentStageIndex] || null,
    partner: getCurrentPartner(),
    pieces: pieces,
    sourceImg: sourceImg,
    board: { x: boardX, y: boardY, w: boardW, h: boardH },
    pieceSize: { w: pieceW, h: pieceH },
    canvas: { w: canvasW, h: canvasH },
  }, false);
}

// ===== Load Stage =====
function loadStage(index) {
  // ステージ切替時は peek (いつでも みる) を必ず OFF にする
  // 旧ステージの完成形が新ステージに残らないように、画像差し替え前に閉じる。
  try { if (typeof setPeekOverlay === 'function') setPeekOverlay(false); } catch (_) {}
  // 旧ステージの prestart overlay が残っていれば破棄 (initPuzzle で innerHTML='' されるが二重防御)
  try { if (typeof removePrestartOverlay === 'function') removePrestartOverlay(); } catch (_) {}
  // 散布アニメ中フラグもリセット (新ステージ初期化で混入しないように)
  scatterAnimating = false;
  if (puzzleContainer) puzzleContainer.classList.remove('scatter-on');

  // ヒント関連 state リセット (前ステージの選択ピース・残数表示が混じらないように)
  selectedPieceForHint = null;
  hintFlashPiece = null;
  hintFlashUntil = 0;
  window.PonoHintActive = false;
  if (hintAnimRafHandle != null) {
    try { cancelAnimationFrame(hintAnimRafHandle); } catch (_) {}
    hintAnimRafHandle = null;
  }
  if (hintNoticeTimeout) { clearTimeout(hintNoticeTimeout); hintNoticeTimeout = null; }
  var oldNotice = document.getElementById('hint-notice-bubble');
  if (oldNotice && oldNotice.parentNode) oldNotice.parentNode.removeChild(oldNotice);

  currentStageIndex = index;
  const stage = STAGES[index];

  // ステージ毎のヒント回数を初期化 → ボタン表示を更新
  try {
    var sidForReset = (stage && stage.id != null) ? stage.id : (index + 1);
    localStorage.removeItem(hintUsesStorageKey(sidForReset));
    setHintUsesRemaining(sidForReset, computeHintInitialUses(sidForReset));
  } catch (_) {}
  refreshHintButtonState();

  // ★ 二重報酬防止フラグのリセット (showSuccessModal idempotency 用 — high finding 修正)
  //   新ステージに入る度に「報酬未付与」状態へ戻す。
  try { delete window['__pono_puzzle_reward_granted_' + index]; } catch (_) {
    window['__pono_puzzle_reward_granted_' + index] = false;
  }

  // === Assist hook: beforeStageStart ===
  runAssistHooks('beforeStageStart', {
    stageIndex: index,
    stage: stage,
    partner: getCurrentPartner(),
  }, false);

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

// ===== Peek Overlay (いつでも みる) =====
//
// 半透明の完成形画像を puzzle-container に独立 canvas として重ねるトグル機能。
// redraw() ループには介入しない (独立 canvas + CSS で重ねるだけ)。
// peek ON 中はパズル canvas の pointer-events を CSS で殺して誤ドラッグを防ぐ。
let peekOn = false;
let peekCanvas = null;

function ensurePeekCanvas() {
  if (peekCanvas && peekCanvas.isConnected) return peekCanvas;
  if (!puzzleContainer) return null;
  peekCanvas = document.createElement('canvas');
  peekCanvas.className = 'peek-overlay';
  // canvas の論理解像度は本体 puzzleCanvas に合わせる (なければコンテナ実寸)
  const w = (puzzleCanvas && puzzleCanvas.width)  || puzzleContainer.clientWidth  || 600;
  const h = (puzzleCanvas && puzzleCanvas.height) || puzzleContainer.clientHeight || 400;
  peekCanvas.width  = w;
  peekCanvas.height = h;
  puzzleContainer.appendChild(peekCanvas);
  return peekCanvas;
}

function drawPeekOverlay() {
  if (!peekCanvas || !sourceImg) return;
  const ctx = peekCanvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, peekCanvas.width, peekCanvas.height);
  ctx.save();
  ctx.globalAlpha = 0.55;
  // 既存 boardX/Y/W/H に合わせて完成形画像を描画 (ピース盤面と一致)
  ctx.drawImage(sourceImg, boardX, boardY, boardW, boardH);
  ctx.restore();
}

function setPeekOverlay(on) {
  const next = !!on;
  if (next === peekOn) return;
  peekOn = next;

  if (peekOn) {
    // ドラッグ中だった場合は確実にキャンセル
    dragPiece = null;
    const cv = ensurePeekCanvas();
    if (!cv) { peekOn = false; return; }
    drawPeekOverlay();
    if (puzzleContainer) puzzleContainer.classList.add('peek-on');
    if (btnPeek) {
      btnPeek.classList.add('is-active');
      btnPeek.setAttribute('aria-pressed', 'true');
      btnPeek.textContent = '× とじる';
    }
  } else {
    if (peekCanvas && peekCanvas.parentNode) {
      peekCanvas.parentNode.removeChild(peekCanvas);
    }
    peekCanvas = null;
    if (puzzleContainer) puzzleContainer.classList.remove('peek-on');
    if (btnPeek) {
      btnPeek.classList.remove('is-active');
      btnPeek.setAttribute('aria-pressed', 'false');
      btnPeek.textContent = '👁 みる';
    }
  }
}

function togglePeekOverlay() {
  setPeekOverlay(!peekOn);
}

// ===== Button Handlers =====
btnShuffle.addEventListener('click', () => {
  if (!puzzleCanvas) return;
  // 散布アニメ実行中は無効化 (二重起動防止)
  if (scatterAnimating) return;
  // peek ON のままシャッフルすると操作不能に見えるので OFF にしてから実行
  if (peekOn) setPeekOverlay(false);
  // prestart overlay 表示中にまぜるが押された場合は overlay を破棄してから即時シャッフル
  if (prestartOverlayEl) removePrestartOverlay();
  dragPiece = null;
  shufflePieces();
});

if (btnPeek) {
  btnPeek.addEventListener('click', () => {
    if (!puzzleCanvas) return;
    // 散布アニメ中・prestart 表示中は peek 無効 (完成形が既に見えている / アニメ中)
    if (scatterAnimating || prestartOverlayEl) return;
    togglePeekOverlay();
  });
}

// ===== Hint Button (Phase 3b Step 3 — 新仕様) =====
// 旧: 完成形を全体表示 → 散布
// 新: 選択中ピースのスロットに金色星+radial glow+枠点滅を 2 秒表示
btnHint.addEventListener('click', () => {
  if (!puzzleCanvas) return;
  // 散布アニメ中・prestart 表示中はヒント無効
  if (scatterAnimating || prestartOverlayEl) return;
  // ドラッグ中は 😴 状態 → 無効
  if (dragPiece) return;

  var sid = getCurrentStageIdForHint();
  var remaining = sid != null ? getHintUsesRemaining(sid) : 0;

  // 残数 0 → 震えるアニメ + 早期 return
  if (remaining <= 0) {
    shakeHintButton();
    return;
  }

  // 選択ピースが無い → 注意吹き出し + 早期 return (残数消費しない)
  if (!selectedPieceForHint || selectedPieceForHint.snapped
      || !pieces || pieces.indexOf(selectedPieceForHint) < 0) {
    selectedPieceForHint = null;
    showHintNotice();
    refreshHintButtonState();
    return;
  }

  // peek ON のままヒントを発動すると overlay が前面に残るので OFF
  if (peekOn) setPeekOverlay(false);

  if (window.PuzzleVoice) window.PuzzleVoice.playRandom('hint');

  // 金色星演出: 1.5 秒間 hintFlashPiece に対して描画 (Phase 3c: 2000→1500ms)
  hintFlashPiece = selectedPieceForHint;
  hintFlashUntil = Date.now() + HINT_FLASH_DURATION_MS;
  ensureHintAnimLoop();

  // Phase 3c: キツネ装備時はピース絵柄の grayscale シルエットを「手元」スロットへ追加転写
  //   - 実装は assists/kitsune.js 側 (window.PonoAssistKitsune.fireHintShape(piece, ctx))
  //   - 未ロード / 未実装でもヒント本体は機能するよう try/catch で隔離
  try {
    var partnerIdForFx = (window.PonoBond && typeof window.PonoBond.getSelectedPartner === 'function')
      ? window.PonoBond.getSelectedPartner() : null;
    if (partnerIdForFx === 'kitsune'
        && window.PonoAssistKitsune
        && typeof window.PonoAssistKitsune.fireHintShape === 'function') {
      var fxCtx = (puzzleCanvas && puzzleCanvas.getContext) ? puzzleCanvas.getContext('2d') : null;
      window.PonoAssistKitsune.fireHintShape(selectedPieceForHint, fxCtx);
    }
  } catch (_) { /* assist 側の例外で本体を止めない */ }

  // 残数を 1 消費
  setHintUsesRemaining(sid, Math.max(0, remaining - 1));
  refreshHintButtonState();
});

btnNextStage.addEventListener('click', () => {
  const nextIndex = currentStageIndex + 1;
  // 配列範囲外なら現状動作 (loadStage がエラーハンドリングする可能性)
  if (nextIndex < STAGES.length && window.PonoTier) {
    const nextStage = STAGES[nextIndex];
    const stageNum = nextStage.id;
    // user drawing stages (id >= 1000) はティアロック対象外 (自作コンテンツ)
    if (stageNum < 1000) {
      // ポノ特別枠 (id = 5/10/15/20) は別判定
      const isSpecial = [5, 10, 15, 20].indexOf(stageNum) >= 0;
      const stageIdStr = 'stage_' + String(stageNum).padStart(2, '0');
      const unlocked = isSpecial
        ? window.PonoTier.isPuzzlePonoSpecialUnlocked(stageIdStr)
        : window.PonoTier.isPuzzleStageUnlocked(stageNum);
      if (!unlocked) {
        window.PonoTier.showSubscribePromo({
          title: 'つぎの えは まだ あそべないよ',
          body: 'えほん モード や アプリ で あたらしい えが ふえていくよ！'
        });
        return;
      }
    }
  }
  hideSuccessModal();
  loadStage(nextIndex);
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
    // タイトル画面がある場合は finishOpeningAndEnterGame() で BGM 起動するため、
    // parse-time fallback は登録しない (オープニング再生中に narration と被るのを防ぐ)
    if (!document.getElementById('title-screen')) {
      document.addEventListener('touchstart', tryStartBgm, { once: true, passive: true });
      document.addEventListener('pointerdown', tryStartBgm, { once: true });
    }
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
  // 散布アニメ実行中は canvas 再生成で破綻するので resize 由来の再初期化を抑止
  if (scatterAnimating) return;
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
      if (window.PuzzleVoice) window.PuzzleVoice.playTut(0);
      requestAnimationFrame(() => {
        document.getElementById('tut-next').addEventListener('pointerdown', e => {
          e.preventDefault();
          if (window.PuzzleVoice) window.PuzzleVoice.stop();
          nextStep();
        });
      });
    },
    () => {
      bubble.className = 'tut-bubble';
      bubble.style.cssText = 'top:50%;left:50%;transform:translate(-50%,-50%)';
      bubble.innerHTML = 'ただしい ばしょに おくと<br>パチッとはまるよ 💡<br><button class="tut-next-btn" id="tut-next">つぎ →</button>';
      bubble.classList.remove('hidden');
      if (window.PuzzleVoice) window.PuzzleVoice.playTut(1);
      requestAnimationFrame(() => {
        document.getElementById('tut-next').addEventListener('pointerdown', e => {
          e.preventDefault();
          if (window.PuzzleVoice) window.PuzzleVoice.stop();
          nextStep();
        });
      });
    },
    () => {
      bubble.className = 'tut-bubble';
      bubble.style.cssText = 'top:50%;left:50%;transform:translate(-50%,-50%)';
      bubble.innerHTML = 'ぜんぶ はめたら できあがり！🎉<br><button class="tut-next-btn" id="tut-next">あそぼう！</button>';
      if (window.PuzzleVoice) window.PuzzleVoice.playTut(2);
      requestAnimationFrame(() => {
        document.getElementById('tut-next').addEventListener('pointerdown', e => {
          e.preventDefault();
          if (window.PuzzleVoice) window.PuzzleVoice.stop();
          endTut();
        });
      });
    }
  ];

  function nextStep() { step++; step < steps.length ? steps[step]() : endTut(); }
  function endTut() {
    dim.classList.add('hidden');
    bubble.classList.add('hidden');
    if (window.PuzzleVoice) window.PuzzleVoice.stop();
    localStorage.setItem('puzzle_tut_seen', '1');
  }

  steps[0]();
}

let pendingTitleTutorial = false;

function startFromTitleScreen() {
  if (titleScreen) titleScreen.classList.add('hidden');
  getSfxCtx().resume().catch(() => {});
  // BGM はオープニング再生中に被るので、終了後に開始する
  runOpeningCutscene(finishOpeningAndEnterGame);
}

function finishOpeningAndEnterGame() {
  if (bgmEnabled) {
    bgmStarted = false;
    tryStartBgm();
  }

  // === Partner select modal ===
  // Phase 1 で読み込まれた partner-select.js が DOM を注入する。
  // 未ロード時は graceful にスキップ (既存挙動を維持)。
  function afterPartnerSelected() {
    if (pendingTitleTutorial) {
      pendingTitleTutorial = false;
      setTimeout(showTutorial, 500);
    }
  }
  try {
    var stage = STAGES[currentStageIndex] || null;
    var stageId = stage ? (stage.id != null ? stage.id : (currentStageIndex + 1)) : 1;
    if (window.PonoPartnerSelect && typeof window.PonoPartnerSelect.show === 'function') {
      window.PonoPartnerSelect.show(stageId, function(selectedPartnerId) {
        // partner-select.js 側で PonoBond.setSelectedPartner を呼んでいる想定だが、
        // 念のため main.js でも保険として記録する。
        try {
          if (selectedPartnerId && window.PonoBond && typeof window.PonoBond.setSelectedPartner === 'function') {
            window.PonoBond.setSelectedPartner(selectedPartnerId);
          }
        } catch (_) {}
        // パートナー確定直後にバッジ + ヒントボタン表示を更新。
        // (afterStageReady 経由でも refreshBadge は走るが、ステージ開始前から
        //  ヒントボタンを非表示にしておくため即時呼び出しする)
        try {
          if (selectedPartnerId && window.PonoBondUI && typeof window.PonoBondUI.refreshBadge === 'function') {
            var partnerObj = (window.PonoPartners && window.PonoPartners.get)
              ? window.PonoPartners.get(selectedPartnerId)
              : null;
            if (partnerObj) {
              window.PonoBondUI.refreshBadge(partnerObj, stageId);
            }
          }
        } catch (_) {}
        afterPartnerSelected();
      });
      return;
    }
  } catch (e) {
    try { console.warn('[PonoPartnerSelect] show failed:', e); } catch (_) {}
  }
  afterPartnerSelected();
}

// ===== Opening Cutscene (owl-doctor style: per-cut audio + wooden-frame narration + fade-to-black) =====
// 編集しやすいように、各カットの画像 / 音声 / ナレーションテキストはこのテーブルに集約。
const OPENING_CUTS = [
  {
    id: 1,
    imgWebp: '../assets/images/puzzle/opening/cut01.webp',
    imgJpg:  '../assets/images/puzzle/opening/cut01.jpg',
    audioMp3:'../assets/audio/puzzle/opening_narration_c01.mp3',
    text: 'ここは、ポノの パズルひろば。\nきょうも おともだちが あつまってきました。',
  },
  {
    id: 2,
    imgWebp: '../assets/images/puzzle/opening/cut02.webp',
    imgJpg:  '../assets/images/puzzle/opening/cut02.jpg',
    audioMp3:'../assets/audio/puzzle/opening_narration_c02.mp3',
    text: 'みんなのまえには、たのしい パズルが いっぱい。',
  },
  {
    id: 3,
    imgWebp: '../assets/images/puzzle/opening/cut03.webp',
    imgJpg:  '../assets/images/puzzle/opening/cut03.jpg',
    audioMp3:'../assets/audio/puzzle/opening_narration_c03.mp3',
    text: 'きょうは、どのパズルで あそぼうかな。\nさあ、みんなで はじめましょう。',
  },
];

function runOpeningCutscene(onDone) {
  const overlay  = document.getElementById('puzzle-opening');
  const audio    = document.getElementById('op-narration');
  const skipBtn  = document.getElementById('op-skip');
  const narrEl   = document.getElementById('puzzle-op-narration');
  const fadeEl   = document.getElementById('puzzle-op-fade');
  const imgA     = document.getElementById('puzzle-op-img-a');
  const imgB     = document.getElementById('puzzle-op-img-b');
  if (!overlay || !audio || !narrEl || !imgA || !imgB) { if (onDone) onDone(); return; }

  // mobile autoplay ブロック時の保険タイマー (秒)。actual mp3 はもっと短いが余裕を持たせる。
  const FALLBACK_CUT_MS = 10000;
  const FADE_MS = 500;     // overlay → 黒
  const HOLD_BLACK_MS = 300;
  const CROSSFADE_MS = 250;

  let current = -1;
  let fallbackTimer = null;
  let ended = false;
  // 各 showCut 呼び出しごとに発行するワールドカウンタ。
  // src 差し替え後に過去カットの ended イベントが遅延発火しても、世代が違えば無視する。
  let cutGeneration = 0;
  // ダブルバッファ: 表示中=front, 待機=back を交互スワップして 250ms クロスフェード。
  let front = imgA;
  let back  = imgB;

  function clearFallback() {
    if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
  }

  // WebP → JPG フォールバック付きで img.src をセット。
  function setImgSrcWithFallback(imgEl, cut) {
    imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = cut.imgJpg; };
    imgEl.src = cut.imgWebp;
  }

  function showCut(i) {
    if (i < 0 || i >= OPENING_CUTS.length) return;
    if (i === current) return;
    current = i;
    const cut = OPENING_CUTS[i];

    // 画像クロスフェード (初回は front に直接入れて即表示)
    if (i === 0) {
      setImgSrcWithFallback(front, cut);
      front.classList.add('is-active');
      back.classList.remove('is-active');
    } else {
      setImgSrcWithFallback(back, cut);
      // 1tick 待ってから「変数スワップ → クラス切替」を同一フレームでアトミックに行う。
      // setTimeout 経由で遅延スワップすると、CROSSFADE_MS 内に再 showCut された場合に
      // front/back の指す要素が古いまま二重 is-active になり得るため。
      requestAnimationFrame(() => {
        const tmp = front; front = back; back = tmp;
        front.classList.add('is-active');
        back.classList.remove('is-active');
      });
    }

    // ナレーション文を一旦フェードアウト→更新→フェードイン
    narrEl.classList.add('is-hide');
    setTimeout(() => {
      narrEl.textContent = cut.text;
      narrEl.classList.remove('is-hide');
    }, 150);

    // 音声差し替え。iOS Safari は src 変更後 load() を呼ばないと readyState が HAVE_NOTHING のままで
    // play() が失敗 / 沈黙することがあるため明示的に load() する。また前カットの ended が遅延発火して
    // advanceOrFinish が二重実行されないよう、世代カウンタで listener をガードする。
    const myGen = ++cutGeneration;
    try {
      audio.pause();
      audio.src = cut.audioMp3;
      audio.load();
      audio.currentTime = 0;
    } catch (_) {}
    // 既存の per-call listener があれば外す (念のため)
    if (audio._endedHandler) {
      audio.removeEventListener('ended', audio._endedHandler);
      audio._endedHandler = null;
    }
    const endedHandler = () => {
      audio.removeEventListener('ended', endedHandler);
      if (audio._endedHandler === endedHandler) audio._endedHandler = null;
      if (myGen === cutGeneration && !ended) advanceOrFinish();
    };
    audio._endedHandler = endedHandler;
    audio.addEventListener('ended', endedHandler);
    const playP = audio.play();
    clearFallback();
    if (playP && typeof playP.then === 'function') {
      playP.catch(() => {
        // mobile autoplay ブロック: 映像だけ fallback タイマーで進める
        fallbackTimer = setTimeout(() => advanceOrFinish(), FALLBACK_CUT_MS);
      });
    } else {
      // 古いブラウザ: 念のため fallback も張る
      fallbackTimer = setTimeout(() => advanceOrFinish(), FALLBACK_CUT_MS);
    }
  }

  function advanceOrFinish() {
    clearFallback();
    if (current >= OPENING_CUTS.length - 1) {
      finishWithFade();
    } else {
      showCut(current + 1);
    }
  }

  function onStageTap(e) {
    if (skipBtn && (e.target === skipBtn || skipBtn.contains(e.target))) return;
    advanceOrFinish();
  }

  function onSkipClick(e) {
    e.preventDefault();
    e.stopPropagation();
    // スキップ = 即フェードアウトして終了
    finishWithFade();
  }

  // 最終カット後 (または skip) は黒フェード → hold → onDone
  function finishWithFade() {
    if (ended) return;
    ended = true;
    clearFallback();
    try { audio.pause(); audio.currentTime = 0; } catch (_) {}
    // per-call ended listener が残っていれば剥がす (世代 guard でも無害だが明示的に)
    if (audio._endedHandler) {
      audio.removeEventListener('ended', audio._endedHandler);
      audio._endedHandler = null;
    }
    overlay.removeEventListener('pointerdown', onStageTap);
    if (skipBtn) skipBtn.removeEventListener('pointerdown', onSkipClick);

    overlay.classList.add('is-fading');
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.classList.remove('is-fading');
      overlay.setAttribute('aria-hidden', 'true');
      if (typeof onDone === 'function') onDone();
    }, FADE_MS + HOLD_BLACK_MS);
  }

  // セットアップ
  overlay.classList.remove('hidden');
  overlay.classList.remove('is-fading');
  overlay.setAttribute('aria-hidden', 'false');
  if (fadeEl) fadeEl.style.opacity = ''; // CSS に任せる
  narrEl.classList.remove('is-hide');
  narrEl.textContent = '';

  overlay.addEventListener('pointerdown', onStageTap);
  if (skipBtn) skipBtn.addEventListener('pointerdown', onSkipClick);
  // ended listener は showCut 内で per-call + generation guard で張る (Safari 対策)

  // 先頭カット投入
  showCut(0);
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
