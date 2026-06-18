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
//   organic-jigsaw       (G) — 深さ/くびれもランダムな有機的カーブ
//   handcut-jigsaw       (H) — 手切り風の大きなずれと不均一カーブ
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
//   afterShowSuccess(ctx)   — showSuccessModal() 末尾。 ctx={ stageIndex, stage, partner, stageId }
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
      var partner = window.PonoPartners.get(id) || null;
      if (partner && typeof window.PonoPartners.isUnlocked === 'function'
          && !window.PonoPartners.isUnlocked(partner)) {
        return null;
      }
      return partner;
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

const PARTNER_ABILITY_CUTIN_COOLDOWN_MS = 1500;
let partnerAbilityCutinLast = { id: null, at: 0 };

function resolvePartnerForAbilityCutin(partnerOrId) {
  if (partnerOrId && typeof partnerOrId === 'object' && partnerOrId.id) {
    return partnerOrId;
  }
  var id = typeof partnerOrId === 'string' ? partnerOrId : null;
  if (!id) {
    var current = getCurrentPartner();
    if (current && current.id) return current;
  }
  try {
    if (id && window.PonoPartners && typeof window.PonoPartners.get === 'function') {
      return window.PonoPartners.get(id) || null;
    }
  } catch (_) {}
  return null;
}

function showPartnerAbilityCutin(partnerOrId, options) {
  var opts = options || {};
  var partner = resolvePartnerForAbilityCutin(partnerOrId);
  if (!partner || !partner.id) return false;

  var now = Date.now();
  if (!opts.force
      && partnerAbilityCutinLast.id === partner.id
      && now - partnerAbilityCutinLast.at < PARTNER_ABILITY_CUTIN_COOLDOWN_MS) {
    return false;
  }
  partnerAbilityCutinLast = { id: partner.id, at: now };

  if (window.PonoBondUI && typeof window.PonoBondUI.playPartnerPanelAction === 'function') {
    window.PonoBondUI.playPartnerPanelAction(partner, {
      type: 'ability',
      message: opts.message || 'がんばれ!',
      label: opts.label || '',
    });
  }

  try {
    if (navigator && navigator.vibrate) navigator.vibrate([22, 35, 22]);
  } catch (_) {}
  return true;
}

window.PonoPartnerAbilityCutin = showPartnerAbilityCutin;

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
  { id: 1,  title: 'あかい りんご',      rows: 2, cols: 2, pieceCount: 4,
    image: resolveStageImage(1),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'soft-rounded', snapAssist: 'very-strong' },
  { id: 2,  title: 'そらの ふうせん',    rows: 2, cols: 2, pieceCount: 4,
    image: resolveStageImage(2),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'soft-rounded', snapAssist: 'very-strong' },

  // ── Stage 03-05: 6 pieces / large-jigsaw / strong ──
  { id: 3,  title: 'おはなと ちょうちょ', rows: 2, cols: 3, pieceCount: 6,
    image: resolveStageImage(3),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'large-jigsaw', snapAssist: 'strong' },
  { id: 4,  title: 'みずの なかの きんぎょ', rows: 2, cols: 3, pieceCount: 6,
    image: resolveStageImage(4),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'large-jigsaw', snapAssist: 'strong' },
  { id: 5,  title: '✨ おやすみ ポノ',   rows: 2, cols: 3, pieceCount: 6,
    image: resolveStageImage(5),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'large-jigsaw', snapAssist: 'strong' },

  // ── Stage 06-08: 9 pieces / standard-jigsaw / strong ──
  { id: 6,  title: 'くだものの かご',    rows: 3, cols: 3, pieceCount: 9,
    image: resolveStageImage(6),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'standard-jigsaw', snapAssist: 'strong' },
  { id: 7,  title: 'おもちゃの がっき',  rows: 3, cols: 3, pieceCount: 9,
    image: resolveStageImage(7),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'standard-jigsaw', snapAssist: 'strong' },
  { id: 8,  title: 'おはなの はたけ',    rows: 3, cols: 3, pieceCount: 9,
    image: resolveStageImage(8),
    rotationEnabled: false, challengeRotationEnabled: false, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'standard-jigsaw', snapAssist: 'strong' },

  // ── Stage 09-12: 12 pieces / offset-jigsaw / medium-strong ──
  { id: 9,  title: 'うみの せかい',      rows: 3, cols: 4, pieceCount: 12,
    image: resolveStageImage(9),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'offset-jigsaw', snapAssist: 'medium-strong' },
  { id: 10, title: '✨ みずあそび ポノ', rows: 3, cols: 4, pieceCount: 12,
    image: resolveStageImage(10),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'offset-jigsaw', snapAssist: 'medium-strong' },
  { id: 11, title: 'あめあがりの にじ',  rows: 3, cols: 4, pieceCount: 12,
    image: resolveStageImage(11),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'offset-jigsaw', snapAssist: 'medium-strong' },
  { id: 12, title: 'ゆめの よぞら',      rows: 3, cols: 4, pieceCount: 12,
    image: resolveStageImage(12),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'offset-jigsaw', snapAssist: 'medium-strong' },

  // ── Stage 13-16: 16 pieces / organic-jigsaw / normal ──
  { id: 13, title: 'あまい おやつ',      rows: 4, cols: 4, pieceCount: 16,
    image: resolveStageImage(13),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'organic-jigsaw', snapAssist: 'normal' },
  { id: 14, title: 'もりの おんがくかい', rows: 4, cols: 4, pieceCount: 16,
    image: resolveStageImage(14),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'organic-jigsaw', snapAssist: 'normal' },
  { id: 15, title: '✨ きらきら ポノ',   rows: 4, cols: 4, pieceCount: 16,
    image: resolveStageImage(15),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'organic-jigsaw', snapAssist: 'normal' },
  { id: 16, title: 'のりものの まち',    rows: 4, cols: 4, pieceCount: 16,
    image: resolveStageImage(16),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'organic-jigsaw', snapAssist: 'normal' },

  // ── Stage 17-20: 20 pieces / handcut-jigsaw / light ──
  { id: 17, title: 'もりの ピクニック',  rows: 4, cols: 5, pieceCount: 20,
    image: resolveStageImage(17),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'handcut-jigsaw', snapAssist: 'light' },
  { id: 18, title: 'まほうの ほんだな',  rows: 4, cols: 5, pieceCount: 20,
    image: resolveStageImage(18),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'handcut-jigsaw', snapAssist: 'light' },
  { id: 19, title: 'おもちゃの テーブル', rows: 4, cols: 5, pieceCount: 20,
    image: resolveStageImage(19),
    rotationEnabled: false, challengeRotationEnabled: true, allowedRotations: [0, 90, 180, 270],
    pieceShapeStyle: 'handcut-jigsaw', snapAssist: 'light' },
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
      pieceShapeStyle: pc === 16 ? 'organic-jigsaw' : 'handcut-jigsaw',
      snapAssist: pc === 16 ? 'normal' : 'light',
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

// えほん版は序盤が平坦に感じにくいよう、built-in ステージを一つ飛びで進める。
// common/tier.js のロック定義は触らず、パズル内の進行順だけを変える。
const BOOK_PUZZLE_STAGE_SEQUENCE = [0, 2, 4, 6, 8, 10, 12, 14, 16];

function getPuzzleTier() {
  try {
    if (window.PonoTier && typeof window.PonoTier.getTier === 'function') {
      var t = window.PonoTier.getTier();
      if (t === 'free' || t === 'book' || t === 'sub') return t;
    }
  } catch (_) {}
  return 'free';
}

function isBuiltInPuzzleStage(stage) {
  if (!stage) return false;
  var id = stage.id != null ? Number(stage.id) : NaN;
  return isFinite(id) && id > 0 && id < 1000;
}

function getBookStageSequencePosition(index) {
  for (var i = 0; i < BOOK_PUZZLE_STAGE_SEQUENCE.length; i++) {
    if (BOOK_PUZZLE_STAGE_SEQUENCE[i] === index) return i;
  }
  return -1;
}

function getStageDisplayMeta(index) {
  var tier = getPuzzleTier();
  var stage = STAGES[index] || null;
  if (tier === 'book' && isBuiltInPuzzleStage(stage)) {
    var pos = getBookStageSequencePosition(index);
    if (pos >= 0) {
      return { num: pos + 1, total: BOOK_PUZZLE_STAGE_SEQUENCE.length };
    }
  }
  return { num: index + 1, total: STAGES.length };
}

function getNextStageIndexForFlow(index) {
  var current = (typeof index === 'number') ? index : currentStageIndex;
  var tier = getPuzzleTier();
  var stage = STAGES[current] || null;
  if (tier === 'book' && isBuiltInPuzzleStage(stage)) {
    var pos = getBookStageSequencePosition(current);
    if (pos >= 0 && pos < BOOK_PUZZLE_STAGE_SEQUENCE.length - 1) {
      return BOOK_PUZZLE_STAGE_SEQUENCE[pos + 1];
    }
    if (pos === BOOK_PUZZLE_STAGE_SEQUENCE.length - 1) {
      return current + 2;
    }
  }
  return current + 1;
}

function isStageUnlockedForCurrentFlow(index) {
  var stage = STAGES[index] || null;
  if (!stage) return false;
  if (!isBuiltInPuzzleStage(stage)) return true; // user drawing stages
  var tier = getPuzzleTier();
  if (tier === 'sub') return true;
  if (tier === 'book') {
    return getBookStageSequencePosition(index) >= 0;
  }
  if (!window.PonoTier) return true;
  var stageNum = stage.id != null ? Number(stage.id) : (index + 1);
  var isSpecial = [5, 10, 15, 20].indexOf(stageNum) >= 0;
  var stageIdStr = 'stage_' + String(stageNum).padStart(2, '0');
  return isSpecial
    ? window.PonoTier.isPuzzlePonoSpecialUnlocked(stageIdStr)
    : window.PonoTier.isPuzzleStageUnlocked(stageNum);
}

function canAdvanceToNextStage() {
  var nextIndex = getNextStageIndexForFlow(currentStageIndex);
  return nextIndex < STAGES.length && isStageUnlockedForCurrentFlow(nextIndex);
}

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
  'light':         0.25,
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
let stageRotationRate = 0.75;
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
const modalChallengeInfo = document.getElementById('modal-challenge-info');
const modalDailyAcorn = document.getElementById('modal-daily-acorn');
const btnNextStage    = document.getElementById('btn-next-stage');
const btnPlayAgain    = document.getElementById('btn-play-again');
const confettiContainer = document.getElementById('confetti-container');
const titleScreen     = document.getElementById('title-screen');
const titleGuideChoice = document.getElementById('title-guide-choice');
const titleGuideShowBtn = document.getElementById('title-guide-show');
const titleGuideStartBtn = document.getElementById('title-guide-start');
const titleGuideSkipCheck = document.getElementById('title-guide-skip');
const challengeStatusEl = document.getElementById('challenge-status');

// ===== Partner Challenge State =====
const RISU_TIME_LIMITS = [
  { max: 2,  sec: [35, 30, 25] },
  { max: 5,  sec: [50, 42, 35] },
  { max: 8,  sec: [75, 62, 50] },
  { max: 12, sec: [105, 88, 70] },
  { max: 16, sec: [145, 120, 95] },
  { max: 20, sec: [190, 155, 125] },
];

let activeChallenge = {
  type: null,
  partnerId: null,
  stageId: null,
  started: false,
  expired: false,
  limitMs: 0,
  startMs: 0,
  raf: null,
  resultText: '',
};

// 仲良し度システム廃止後の固定パラメータ。
// 旧 challengeRankFor は Lv 連動だったが、Lv 概念が無くなったため
// 全ての partner challenge は中庸 (旧 Lv2 相当) で固定とする。
function stageNumForChallenge(stageId) {
  var n = Number(stageId);
  if (!isFinite(n) || n <= 0) return 1;
  if (n >= 1000) return 20;
  return n;
}

function risuLimitSeconds(stageId) {
  var stageNum = stageNumForChallenge(stageId);
  var row = RISU_TIME_LIMITS[RISU_TIME_LIMITS.length - 1];
  for (var i = 0; i < RISU_TIME_LIMITS.length; i++) {
    if (stageNum <= RISU_TIME_LIMITS[i].max) {
      row = RISU_TIME_LIMITS[i];
      break;
    }
  }
  // 旧 Lv2 列 (index=1) で固定
  return row.sec[1];
}

function karasuRotationConfig() {
  // 旧 Lv2 相当 (回転率 52%, 0/90/180)
  return { rate: 0.52, rotations: [0, 90, 180] };
}

function formatChallengeTime(ms) {
  var total = Math.max(0, Math.ceil(ms / 1000));
  var min = Math.floor(total / 60);
  var sec = total % 60;
  return min + ':' + String(sec).padStart(2, '0');
}

function toFullWidthDigits(text) {
  var digits = '０１２３４５６７８９';
  return String(text).replace(/[0-9]/g, function (d) {
    return digits.charAt(Number(d));
  });
}

function setTimeChallengeStatus(remainMs) {
  if (!challengeStatusEl) return;
  var remain = Math.max(0, remainMs | 0);
  var ratio = activeChallenge.limitMs > 0
    ? Math.max(0, Math.min(1, remain / activeChallenge.limitMs))
    : 0;
  challengeStatusEl.innerHTML =
    '<span class="challenge-status__label">のこり</span>' +
    '<span class="challenge-status__time">' + toFullWidthDigits(formatChallengeTime(remain)) + '</span>';
  challengeStatusEl.style.setProperty('--challenge-fill', Math.round(ratio * 100) + '%');
  challengeStatusEl.classList.toggle('is-low', ratio <= 0.45 && ratio > 0.2);
  challengeStatusEl.classList.toggle('is-critical', ratio <= 0.2);
}

function stopChallengeTimer() {
  if (activeChallenge.raf != null) {
    try { cancelAnimationFrame(activeChallenge.raf); } catch (_) {}
  }
  activeChallenge.raf = null;
}

function hideChallengeStatus() {
  if (!challengeStatusEl) return;
  challengeStatusEl.classList.add('hidden');
  challengeStatusEl.classList.remove('is-expired', 'is-time', 'is-low', 'is-critical');
  challengeStatusEl.style.removeProperty('--challenge-fill');
  challengeStatusEl.innerHTML = '';
}

function resetPartnerChallenge(stageId) {
  stopChallengeTimer();
  activeChallenge = {
    type: null,
    partnerId: null,
    stageId: stageId,
    started: false,
    expired: false,
    limitMs: 0,
    startMs: 0,
    raf: null,
    resultText: '',
  };
  hideChallengeStatus();
}

function setupPartnerChallenge(stageId, partner) {
  resetPartnerChallenge(stageId);
  if (!partner || !partner.challengeType) return;
  activeChallenge.type = partner.challengeType;
  activeChallenge.partnerId = partner.id;
  activeChallenge.stageId = stageId;

  if (!challengeStatusEl) return;
  challengeStatusEl.classList.remove('hidden', 'is-expired');
  challengeStatusEl.classList.remove('is-time');
  if (partner.challengeType === 'time') {
    activeChallenge.limitMs = risuLimitSeconds(stageId) * 1000;
    challengeStatusEl.classList.add('is-time');
    setTimeChallengeStatus(activeChallenge.limitMs);
  } else if (partner.challengeType === 'less-hints') {
    challengeStatusEl.textContent = 'ヒントすくなめ';
  } else if (partner.challengeType === 'rotation') {
    challengeStatusEl.textContent = 'くるりチャレンジ';
  }
}

function startPartnerChallengeAfterScatter() {
  if (activeChallenge.type !== 'time' || activeChallenge.started || !challengeStatusEl) return;
  activeChallenge.started = true;
  activeChallenge.expired = false;
  activeChallenge.startMs = performance.now();
  challengeStatusEl.classList.remove('hidden', 'is-expired');

  function tick(now) {
    var remain = Math.max(0, activeChallenge.limitMs - (now - activeChallenge.startMs));
    if (!challengeStatusEl || activeChallenge.type !== 'time') return;
    if (remain <= 0) {
      activeChallenge.expired = true;
      challengeStatusEl.classList.add('is-expired');
      setTimeChallengeStatus(0);
      activeChallenge.raf = null;
      return;
    }
    setTimeChallengeStatus(remain);
    activeChallenge.raf = requestAnimationFrame(tick);
  }
  activeChallenge.raf = requestAnimationFrame(tick);
}

function currentChallengeResultText() {
  if (!activeChallenge.type) return '';
  if (activeChallenge.type === 'time') {
    return activeChallenge.expired
      ? 'リスチャレンジ: じかんを すぎたよ'
      : 'リスチャレンジ せいこう！';
  }
  if (activeChallenge.type === 'less-hints') {
    return 'ハリネズミチャレンジ せいこう！';
  }
  if (activeChallenge.type === 'rotation') {
    return 'カラスチャレンジ せいこう！';
  }
  return '';
}

// ===== Puzzle-local stamps =====
const PUZZLE_STAMP_KEY = 'pono_puzzle_partner_stamps_v1';
const PUZZLE_PARTNER_CLEAR_KEY = 'pono_puzzle_partner_clears_v1';
const PUZZLE_STAGE_CLEAR_KEY = 'pono_puzzle_stage_clears_v1';

function readLocalJson(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) || fallback) : fallback;
  } catch (_) {
    return fallback;
  }
}

function writeLocalJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

let puzzleStampToastQueue = [];
let puzzleStampToastShowing = false;

function showPuzzleStampToast(title, desc) {
  puzzleStampToastQueue.push({ title: title, desc: desc });
  drainPuzzleStampToastQueue();
}

function drainPuzzleStampToastQueue() {
  if (puzzleStampToastShowing || !puzzleStampToastQueue.length) return;
  puzzleStampToastShowing = true;
  var item = puzzleStampToastQueue.shift();
  try {
    var toast = document.createElement('div');
    toast.className = 'puzzle-stamp-toast';
    toast.innerHTML =
      '<div class="puzzle-stamp-toast__mark">★</div>' +
      '<div class="puzzle-stamp-toast__body">' +
        '<div class="puzzle-stamp-toast__title"></div>' +
        '<div class="puzzle-stamp-toast__desc"></div>' +
      '</div>';
    toast.querySelector('.puzzle-stamp-toast__title').textContent = item.title;
    toast.querySelector('.puzzle-stamp-toast__desc').textContent = item.desc || 'スタンプを もらったよ';
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('is-hide');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
        puzzleStampToastShowing = false;
        drainPuzzleStampToastQueue();
      }, 360);
    }, 2800);
  } catch (_) {
    puzzleStampToastShowing = false;
    drainPuzzleStampToastQueue();
  }
}

function grantPuzzleStamp(id, title, desc) {
  if (!id) return false;
  var stamps = readLocalJson(PUZZLE_STAMP_KEY, {});
  if (stamps[id]) return false;
  stamps[id] = { title: title, desc: desc || '', ts: Date.now() };
  writeLocalJson(PUZZLE_STAMP_KEY, stamps);
  showPuzzleStampToast(title, desc);
  return true;
}

function markPartnerClear(partnerId) {
  if (!partnerId) return;
  var clears = readLocalJson(PUZZLE_PARTNER_CLEAR_KEY, {});
  clears[partnerId] = true;
  writeLocalJson(PUZZLE_PARTNER_CLEAR_KEY, clears);
}

function markStageClear(stageId) {
  var sid = Number(stageId);
  if (!isFinite(sid) || sid <= 0 || sid >= 1000) return;
  var clears = readLocalJson(PUZZLE_STAGE_CLEAR_KEY, {});
  for (var i = 1; i <= sid; i++) {
    clears[String(i)] = true;
  }
  writeLocalJson(PUZZLE_STAGE_CLEAR_KEY, clears);
}

function allPartnersCleared() {
  if (!window.PonoPartners || !window.PonoPartners.list) return false;
  var clears = readLocalJson(PUZZLE_PARTNER_CLEAR_KEY, {});
  for (var i = 0; i < window.PonoPartners.list.length; i++) {
    if (!clears[window.PonoPartners.list[i].id]) return false;
  }
  return true;
}

function allBuiltInStagesCleared() {
  var clears = readLocalJson(PUZZLE_STAGE_CLEAR_KEY, {});
  for (var i = 1; i <= 20; i++) {
    if (!clears[String(i)]) return false;
  }
  return true;
}

function processPuzzleStamps(partner, stageId) {
  markStageClear(stageId);
  if (!partner) {
    if (allBuiltInStagesCleared()) {
      grantPuzzleStamp('stage_all_20', 'ぜんステージクリア', '20この えを クリアしたよ');
    }
    return;
  }

  markPartnerClear(partner.id);
  grantPuzzleStamp('partner_clear_' + partner.id, partner.name + 'と クリア', partner.name + 'と パズルを クリアしたよ');

  // 仲良し度システム廃止: partner_star3_* スタンプは付与しない (Lv 概念が無いため)

  if (partner.id === 'risu' && activeChallenge.type === 'time' && !activeChallenge.expired) {
    grantPuzzleStamp('challenge_risu_time', 'リスの はやわざ', 'じかんの なかで クリアしたよ');
  }
  if (partner.id === 'harinezumi' && activeChallenge.type === 'less-hints') {
    grantPuzzleStamp('challenge_harinezumi_clear', 'ハリネズミの がんばり', 'ヒントすくなめで クリアしたよ');
    if (stageHintUsesActual === 0) {
      grantPuzzleStamp('challenge_harinezumi_no_hint', 'ヒントなし チャレンジ', 'ヒントを つかわず クリアしたよ');
    }
  }
  if (partner.id === 'karasu' && activeChallenge.type === 'rotation') {
    grantPuzzleStamp('challenge_karasu_rotation', 'くるりマスター', 'まわった ピースを クリアしたよ');
  }
  if (allPartnersCleared()) {
    grantPuzzleStamp('all_partners_clear', 'パズルマスター', 'ぜんぶの パートナーと クリアしたよ');
  }
  if (allBuiltInStagesCleared()) {
    grantPuzzleStamp('stage_all_20', 'ぜんステージクリア', '20この えを クリアしたよ');
  }
}

window.PonoPuzzleStamps = {
  grant: grantPuzzleStamp,
  all: function () { return readLocalJson(PUZZLE_STAMP_KEY, {}); },
};

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
let successModalLifecycleActive = false;
let successModalAfterHideQueue = [];

function runAfterSuccessModalClosed(callback) {
  if (typeof callback !== 'function') return;
  if (!successModalLifecycleActive && (!successModal || successModal.classList.contains('hidden'))) {
    setTimeout(callback, 0);
    return;
  }
  successModalAfterHideQueue.push(callback);
}

function flushAfterSuccessModalClosedQueue() {
  if (!successModalAfterHideQueue.length) return;
  const queue = successModalAfterHideQueue.splice(0);
  setTimeout(() => {
    queue.forEach((callback) => {
      try { callback(); }
      catch (e) {
        try { console.warn('[PonoPuzzle] after success modal callback failed:', e); } catch (_) {}
      }
    });
  }, 180);
}

window.PonoPuzzleRunAfterSuccessModalClosed = runAfterSuccessModalClosed;

function showSuccessModal() {
  successModalLifecycleActive = true;

  // === Assist hook: beforeShowSuccess ===
  var successPartner = getCurrentPartner();
  var successStage = STAGES[currentStageIndex] || null;
  var successStageId = successStage ? (successStage.id != null ? successStage.id : (currentStageIndex + 1)) : (currentStageIndex + 1);
  runAssistHooks('beforeShowSuccess', {
    stageIndex: currentStageIndex,
    stage: successStage,
    partner: successPartner,
  }, false);

  // === Bond: クリア記録 (Lv/ハート概念廃止後の最小フラグ) ===
  // stageId はここで Number に正規化して PonoBond / 後続フックに渡す
  var normalizedStageId = parseInt(successStageId, 10);
  if (!isFinite(normalizedStageId) || normalizedStageId <= 0) {
    normalizedStageId = currentStageIndex + 1;
  }
  try {
    if (successPartner && window.PonoBond && typeof window.PonoBond.markCleared === 'function') {
      window.PonoBond.markCleared(successPartner.id, normalizedStageId);
    }
  } catch (e) {
    try { console.warn('[PonoBond] markCleared failed:', e); } catch (_) {}
  }
  stopChallengeTimer();
  activeChallenge.resultText = currentChallengeResultText();

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
    processPuzzleStamps(successPartner, normalizedStageId);

    // スタンプラリー: プレイ記録 (1ステージ 1 回でよいので報酬付与時にまとめる)
    (function() {
      var k = 'pono_played_' + new Date().toDateString();
      var a = JSON.parse(localStorage.getItem(k) || '[]');
      if (a.indexOf('puzzle') === -1) { a.push('puzzle'); localStorage.setItem(k, JSON.stringify(a)); }
    })();
  }

  const displayMeta = getStageDisplayMeta(currentStageIndex);
  const isLast = currentStageIndex >= STAGES.length - 1;
  var __stickerKey = '__pono_puzzle_sticker_granted_' + currentStageIndex;
  if (!window[__stickerKey] && window.PonoGameStickers) {
    window[__stickerKey] = true;
    window.PonoGameStickers.grant({
      gameId: 'puzzle',
      event: isLast ? 'clear' : 'stage_clear'
    });
  }
  if (isLast) {
    modalStageInfo.textContent = 'ぜんぶ クリア！！';
    btnNextStage.classList.add('hidden');
  } else {
    modalStageInfo.textContent = `ステージ ${displayMeta.num} クリア！`;
    btnNextStage.classList.remove('hidden');
  }
  if (modalChallengeInfo) {
    if (activeChallenge.resultText) {
      modalChallengeInfo.textContent = activeChallenge.resultText;
      modalChallengeInfo.classList.remove('hidden');
    } else {
      modalChallengeInfo.textContent = '';
      modalChallengeInfo.classList.add('hidden');
    }
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
    if (!isLast && canAdvanceToNextStage()) nextNudge.start();
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
  }, false);
}

function hideSuccessModal() {
  successModal.classList.add('hidden');
  nextNudge.stop();
  if (successModalLifecycleActive) {
    successModalLifecycleActive = false;
    flushAfterSuccessModalClosedQueue();
  }
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
  if (!e || typeof e !== 'object') return e;
  if (e.type === 'freeform') {
    const points = Array.isArray(e.points) ? e.points : [];
    return {
      ...e,
      points: points
        .map(function (pt) {
          return { t: 1 - pt.t, o: -pt.o };
        })
        .reverse(),
    };
  }
  const flipped = { ...e, dir: -e.dir, pos: 1 - e.pos };
  if (typeof e.skew === 'number') flipped.skew = -e.skew;
  return flipped;
}

function buildPiecePath(target, px, py, pw, ph, tabs) {
  function traceFreeformEdgeTo(x1, y1, x2, y2, edge, ux, uy, nx, ny, len) {
    const points = [{ x: x1, y: y1 }];
    const mids = Array.isArray(edge.points) ? edge.points : [];
    for (let i = 0; i < mids.length; i++) {
      const t = Math.max(0.06, Math.min(0.94, Number(mids[i].t) || 0));
      const o = Math.max(-0.32, Math.min(0.32, Number(mids[i].o) || 0));
      points.push({
        x: x1 + ux * t * len + nx * o * len,
        y: y1 + uy * t * len + ny * o * len,
      });
    }
    points.push({ x: x2, y: y2 });

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      target.bezierCurveTo(
        p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
        p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6,
        p2.x, p2.y
      );
    }
  }

  function traceEdgeTo(x1, y1, x2, y2, edge) {
    if (edge === 0) { target.lineTo(x2, y2); return; }

    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;

    if (edge && edge.type === 'freeform') {
      traceFreeformEdgeTo(x1, y1, x2, y2, edge, ux, uy, nx, ny, len);
      return;
    }

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
    const depth = (typeof edge.depth === 'number') ? edge.depth : 0.30;
    const neck = (typeof edge.neck === 'number') ? edge.neck : 0.55;
    const shoulder = (typeof edge.shoulder === 'number') ? edge.shoulder : 0.8;
    const skew = (typeof edge.skew === 'number') ? edge.skew : 0;
    const tabH  = len * depth * dir;  // knob height (signed)
    const tabHW = hw * len;            // half-width of tab mouth
    const neckH = tabH * neck;         // neck control height

    const psx = x1 + ux * (pos - hw) * len;  // mouth start
    const psy = y1 + uy * (pos - hw) * len;
    const pex = x1 + ux * (pos + hw) * len;  // mouth end
    const pey = y1 + uy * (pos + hw) * len;
    const topX = x1 + ux * (pos + skew) * len + nx * tabH;  // knob top center
    const topY = y1 + uy * (pos + skew) * len + ny * tabH;

    target.lineTo(psx, psy);
    target.bezierCurveTo(
      psx + nx * neckH,          psy + ny * neckH,
      topX - ux * tabHW * shoulder,  topY - uy * tabHW * shoulder,
      topX, topY
    );
    target.bezierCurveTo(
      topX + ux * tabHW * shoulder,  topY + uy * tabHW * shoulder,
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
//   offset-jigsaw      : { dir, pos: 0.34-0.66, hw/depth/neck ランダム }
//   organic-jigsaw     : { dir, pos: 0.25-0.75, hw/depth/neck/skew ランダム }
//   handcut-jigsaw     : { type:'freeform', points:[...] }  境界線自体がくねる自由曲線
function buildPieces() {
  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function makeFreeformEdge() {
    const sign = Math.random() < 0.5 ? 1 : -1;
    const amp = 0.10 + Math.random() * 0.11;
    const jitter = function (amount) { return (Math.random() - 0.5) * amount; };
    const mode = Math.random();
    let points;
    if (mode < 0.56) {
      // One broad lobe, like hand-cut cardboard puzzle edges.
      points = [
        { t: 0.22 + jitter(0.06), o: sign * amp * 0.18 },
        { t: 0.50 + jitter(0.08), o: sign * amp },
        { t: 0.78 + jitter(0.06), o: sign * amp * 0.18 },
      ];
    } else if (mode < 0.86) {
      // Gentle S curve, not a repeated wave.
      points = [
        { t: 0.22 + jitter(0.06), o: sign * amp * 0.70 },
        { t: 0.50 + jitter(0.08), o: -sign * amp * 0.36 },
        { t: 0.78 + jitter(0.06), o: -sign * amp * 0.66 },
      ];
    } else {
      // A slightly pinched asymmetric edge for the last few stages.
      points = [
        { t: 0.18 + jitter(0.04), o: sign * amp * 0.16 },
        { t: 0.38 + jitter(0.06), o: sign * amp * 0.95 },
        { t: 0.62 + jitter(0.06), o: -sign * amp * 0.48 },
        { t: 0.84 + jitter(0.04), o: -sign * amp * 0.14 },
      ];
    }
    points = points.map(function (pt) {
      return { t: clamp01(pt.t), o: pt.o };
    });
    points.sort(function (a, b) { return a.t - b.t; });
    return { type: 'freeform', points, style: 'handcut' };
  }

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
      case 'offset-jigsaw':
        return {
          dir,
          pos: 0.34 + Math.random() * 0.32,
          hw: 0.14 + Math.random() * 0.06,
          depth: 0.24 + Math.random() * 0.10,
          neck: 0.48 + Math.random() * 0.20,
          shoulder: 0.72 + Math.random() * 0.24,
          skew: (Math.random() - 0.5) * 0.04,
          style: 'offset',
        };
      case 'advanced-jigsaw':
        return { dir, pos: 0.32 + Math.random() * 0.36, hw: 0.14 + Math.random() * 0.07, style: 'standard' }; // pos 0.32-0.68
      case 'advanced-jigsaw-v2':
        return { dir, pos: 0.28 + Math.random() * 0.44, hw: 0.13 + Math.random() * 0.09, style: 'standard' }; // pos 0.28-0.72
      case 'organic-jigsaw':
        return {
          dir,
          pos: 0.25 + Math.random() * 0.50,
          hw: 0.12 + Math.random() * 0.10,
          depth: 0.22 + Math.random() * 0.16,
          neck: 0.42 + Math.random() * 0.28,
          shoulder: 0.60 + Math.random() * 0.38,
          skew: (Math.random() - 0.5) * 0.08,
          style: 'organic',
        };
      case 'handcut-jigsaw':
        return makeFreeformEdge();
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
        if (Math.random() < stageRotationRate && opts.length > 0) {
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

function getBasicPracticeFocusPieceForDim() {
  if (!partnerPracticeState || partnerPracticeState.mode !== 'basic') return null;
  var phase = partnerPracticeState.phase;
  var isPieceMovePhase = phase === 'basic-intro'
    || phase === 'basic-drag-demo'
    || phase === 'basic-drag-try'
    || phase === 'basic-drag-moving'
    || phase === 'basic-hint-demo-select'
    || phase === 'basic-hint-demo-button'
    || phase === 'basic-hint-demo-place'
    || phase === 'basic-hint-select-try'
    || phase === 'basic-hint-press-try'
    || phase === 'basic-hint-drag-try'
    || phase === 'basic-hint-drag-moving';
  return isPieceMovePhase ? partnerPracticeState.targetPiece : null;
}

function shouldDimBasicPracticePiece(piece) {
  var focusPiece = getBasicPracticeFocusPieceForDim();
  return !!(focusPiece && piece && piece !== focusPiece);
}

function drawBasicPracticeGhostPiece(ctx) {
  if (!ctx || !partnerPracticeState || !partnerPracticeState.loopCueGhost) return;
  var ghost = partnerPracticeState.loopCueGhost;
  var piece = ghost.piece;
  if (!piece || piece.snapped || !sourceImg) return;
  var gx = ghost.x;
  var gy = ghost.y;
  var rotation = ghost.rotation || 0;
  var alpha = ghost.alpha == null ? 0.36 : ghost.alpha;
  var cx = gx + pieceW / 2;
  var cy = gy + pieceH / 2;
  var rad = rotation * Math.PI / 180;

  ctx.save();
  ctx.globalAlpha = Math.max(0.12, Math.min(0.58, alpha));
  ctx.filter = 'saturate(0.72) brightness(1.08)';
  if (rotation) {
    ctx.translate(cx, cy);
    ctx.rotate(rad);
    ctx.translate(-cx, -cy);
  }
  ctx.beginPath();
  buildPiecePath(ctx, gx, gy, pieceW, pieceH, piece.tabs);
  ctx.clip();
  ctx.drawImage(sourceImg, boardX + (gx - piece.homeX), boardY + (gy - piece.homeY), boardW, boardH);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.64;
  if (rotation) {
    ctx.translate(cx, cy);
    ctx.rotate(rad);
    ctx.translate(-cx, -cy);
  }
  ctx.beginPath();
  buildPiecePath(ctx, gx, gy, pieceW, pieceH, piece.tabs);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.lineWidth = Math.max(3, Math.min(pieceW, pieceH) * 0.035);
  ctx.shadowColor = 'rgba(36, 145, 255, 0.76)';
  ctx.shadowBlur = 14;
  ctx.setLineDash([Math.max(8, pieceW * 0.08), Math.max(5, pieceW * 0.05)]);
  ctx.stroke();
  ctx.restore();
}

// ===== Draw a single piece =====
function drawPiece(piece) {
  const dimmedForBasicPractice = shouldDimBasicPracticePiece(piece);
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
  if (dimmedForBasicPractice) {
    puzzleCtx.filter = 'grayscale(1) saturate(0.28) brightness(1.02) contrast(0.98)';
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
  puzzleCtx.strokeStyle = dimmedForBasicPractice
    ? 'rgba(86, 86, 86, 0.82)'
    : (piece === dragPiece ? '#F2915A' : '#5D4E37');
  puzzleCtx.lineWidth = dimmedForBasicPractice ? 1.7 : (piece === dragPiece ? 2.5 : 1.8);
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
      buildPiecePath: buildPiecePath,
      requestRedraw: function () {
        // assist 側がピース座標を変えた後、 もう 1 フレーム描き直してほしい時に呼ぶ
        try { requestAnimationFrame(redraw); } catch (_) { redraw(); }
      },
    }, false);
  }
  drawBasicPracticeGhostPiece(puzzleCtx);
  drawPartnerPracticeCue(puzzleCtx);
}

function drawPartnerPracticeCue(ctx) {
  if (!ctx || !partnerPracticeState || !partnerPracticeState.cue) return;
  var cue = partnerPracticeState.cue;
  var piece = cue.piece;
  if (!piece || piece.snapped) return;
  var now = performance.now();
  var cx = piece.x + pieceW / 2;
  var cy = piece.y + pieceH / 2;
  var pulse = 0.5 + 0.5 * Math.sin(now / 180);

  if (cue.kind === 'tap-piece') {
    var minSide = Math.min(pieceW, pieceH);
    var tapR = minSide * (0.70 + pulse * 0.14);
    var glowR = tapR * (1.42 + pulse * 0.12);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var glow = ctx.createRadialGradient(cx, cy, tapR * 0.55, cx, cy, glowR);
    glow.addColorStop(0, 'rgba(255, 202, 68, 0.14)');
    glow.addColorStop(0.42, 'rgba(255, 176, 55,' + (0.32 + pulse * 0.14).toFixed(3) + ')');
    glow.addColorStop(0.76, 'rgba(255, 132, 35,' + (0.58 + pulse * 0.26).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(255, 226, 135, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowColor = 'rgba(255, 150, 38, 0.98)';
    ctx.shadowBlur = 38 + pulse * 24;
    ctx.beginPath();
    buildPiecePath(ctx, piece.x, piece.y, pieceW, pieceH, piece.tabs);
    ctx.strokeStyle = 'rgba(255, 120, 42,' + (0.90 + pulse * 0.10).toFixed(3) + ')';
    ctx.lineWidth = Math.max(6, minSide * 0.058);
    ctx.stroke();
    ctx.shadowColor = 'rgba(255, 210, 70, 0.95)';
    ctx.shadowBlur = 24 + pulse * 18;
    ctx.beginPath();
    ctx.arc(cx, cy, tapR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 174, 35,' + (0.72 + pulse * 0.28).toFixed(3) + ')';
    ctx.lineWidth = Math.max(5, minSide * 0.040);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx, cy, tapR * 1.16, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 235, 150,' + (0.60 + pulse * 0.30).toFixed(3) + ')';
    ctx.lineWidth = Math.max(4, minSide * 0.024);
    ctx.stroke();
    ctx.restore();
    recordBasicHintSelectCueVisible(now);
    ensurePartnerPracticeCueLoop();
    return;
  }

  if (cue.kind === 'selected-piece') {
    var selectedR = Math.min(pieceW, pieceH) * (0.58 + pulse * 0.05);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    buildPiecePath(ctx, piece.x, piece.y, pieceW, pieceH, piece.tabs);
    ctx.strokeStyle = 'rgba(35, 127, 232,' + (0.90 + pulse * 0.10).toFixed(3) + ')';
    ctx.lineWidth = Math.max(7, Math.min(pieceW, pieceH) * 0.072);
    ctx.shadowColor = 'rgba(48, 166, 255, 0.85)';
    ctx.shadowBlur = 18 + pulse * 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx, cy, selectedR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.lineWidth = Math.max(4, Math.min(pieceW, pieceH) * 0.032);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, selectedR * 1.16, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(33, 211, 238,' + (0.40 + pulse * 0.26).toFixed(3) + ')';
    ctx.lineWidth = Math.max(3, Math.min(pieceW, pieceH) * 0.025);
    ctx.stroke();
    ctx.fillStyle = 'rgba(31, 111, 214, 0.94)';
    ctx.beginPath();
    ctx.arc(cx + selectedR * 0.48, cy - selectedR * 0.48, Math.max(11, selectedR * 0.22), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(3, selectedR * 0.07);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + selectedR * 0.39, cy - selectedR * 0.49);
    ctx.lineTo(cx + selectedR * 0.47, cy - selectedR * 0.40);
    ctx.lineTo(cx + selectedR * 0.62, cy - selectedR * 0.58);
    ctx.stroke();
    ctx.restore();
    ensurePartnerPracticeCueLoop();
    return;
  }

  if (cue.kind === 'kojika-move-target') {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    buildPiecePath(ctx, piece.x, piece.y, pieceW, pieceH, piece.tabs);
    ctx.strokeStyle = 'rgba(242, 145, 90,' + (0.76 + pulse * 0.20).toFixed(3) + ')';
    ctx.lineWidth = Math.max(4, Math.min(pieceW, pieceH) * 0.04);
    ctx.stroke();

    ctx.beginPath();
    buildPiecePath(ctx, piece.homeX, piece.homeY, pieceW, pieceH, piece.tabs);
    ctx.strokeStyle = 'rgba(59, 130, 246,' + (0.72 + pulse * 0.24).toFixed(3) + ')';
    ctx.lineWidth = Math.max(5, Math.min(pieceW, pieceH) * 0.052);
    ctx.setLineDash([Math.max(8, pieceW * 0.08), Math.max(5, pieceW * 0.05)]);
    ctx.lineDashOffset = -now / 55;
    ctx.shadowColor = 'rgba(96, 165, 250, 0.72)';
    ctx.shadowBlur = 12 + pulse * 8;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    var hr = Math.min(pieceW, pieceH) * (0.54 + pulse * 0.08);
    var hx = piece.homeX + pieceW / 2;
    var hy = piece.homeY + pieceH / 2;
    var hGrad = ctx.createRadialGradient(hx, hy, 4, hx, hy, hr);
    hGrad.addColorStop(0, 'rgba(125, 190, 255, 0.22)');
    hGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ensurePartnerPracticeCueLoop();
    return;
  }

  if (cue.kind === 'kojika-glow') {
    var hx = piece.homeX + pieceW / 2;
    var hy = piece.homeY + pieceH / 2;
    var r = Math.min(pieceW, pieceH) * (0.78 + pulse * 0.08);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var grad = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r);
    grad.addColorStop(0, 'rgba(125, 190, 255, 0.72)');
    grad.addColorStop(0.42, 'rgba(59, 130, 246, 0.42)');
    grad.addColorStop(1, 'rgba(37, 99, 235, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    var homeR = r * 0.72;
    var homeGrad = ctx.createRadialGradient(hx, hy, homeR * 0.08, hx, hy, homeR);
    homeGrad.addColorStop(0, 'rgba(125, 190, 255, 0.54)');
    homeGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');
    ctx.fillStyle = homeGrad;
    ctx.beginPath();
    ctx.arc(hx, hy, homeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    buildPiecePath(ctx, piece.x, piece.y, pieceW, pieceH, piece.tabs);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.92)';
    ctx.lineWidth = Math.max(4, Math.min(pieceW, pieceH) * 0.04);
    ctx.stroke();
    ctx.restore();
    ensurePartnerPracticeCueLoop();
  }
}

function ensurePartnerPracticeCueLoop() {
  if (!partnerPracticeState || partnerPracticeState.cueRaf) return;
  partnerPracticeState.cueRaf = requestAnimationFrame(function tick() {
    if (!partnerPracticeState || !partnerPracticeState.active || !partnerPracticeState.cue) {
      if (partnerPracticeState) partnerPracticeState.cueRaf = null;
      return;
    }
    partnerPracticeState.cueRaf = null;
    redraw();
  });
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
      p.rotation = (Math.random() < stageRotationRate && opts.length > 0)
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
      if (Math.random() < stageRotationRate && opts.length > 0) {
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
      startPartnerChallengeAfterScatter();
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
//         ④ 初期回数: ステージ難度で base 1/2/3 (なかよし度システム廃止)
//            キツネ装備 +1 / ハリネズミ装備 -1 (下限0) / 上限 5
//
// PonoHintActive フラグ: ヒント選択中 (yellow pulse 表示中) は他アシスト発光を
// 30% 透明度に下げてもらうための共有フラグ。 assist 側は drawOverlay 内で
// window.PonoHintActive をチェックし、 true なら ctx.globalAlpha *= 0.3 する。
// (assist 各 .js への介入は Phase 3c 予定。 ここではフラグ供給のみ。)

let selectedPieceForHint = null;        // 現在ヒント対象として選択中のピース or null
let hintFlashUntil = 0;                 // 金色星演出の終了時刻 (Date.now ms)
let hintFlashPiece = null;              // 金色星演出の対象ピース
let hintAnimRafHandle = null;           // 黄 pulse / 金 star 用 rAF
let hintFlashVisibleAt = 0;             // 正解位置のヒント演出が実際に描画された時刻
let hintNoticeTimeout = null;           // 「ピースを えらんで〜」吹き出しの非表示タイマー
let stageHintUsesActual = 0;            // 今ステージで実際に使ったヒント回数

const HINT_FLASH_DURATION_MS = 2600;    // ヒント位置の強調表示時間

// ヒント初期回数 (仲良し度システム廃止後の確定テーブル):
//   base = {Stage 1-5: 1, Stage 6-12: 2, Stage 13-20: 3}
//   キツネ装備     : base + 1            (即時 +1)
//   ハリネズミ装備 : Math.max(0, base - 1) (即時 -1, 下限 0)
//   他 / 未選択    : base そのまま
//   上限 5
// user drawing stage (id >= 1000) は base=3 扱い。
function computeHintUses(stageNum, partnerId) {
  var sNum = (typeof stageNum === 'number' && isFinite(stageNum)) ? stageNum : 1;
  var base;
  if (sNum <= 5) base = 1;
  else if (sNum <= 12) base = 2;
  else base = 3;
  var adjusted = base;
  if (partnerId === 'kitsune') adjusted = base + 1;
  else if (partnerId === 'harinezumi') adjusted = Math.max(0, base - 1);
  return Math.min(5, Math.max(0, adjusted));
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
    var currentPartner = getCurrentPartner();
    var partnerId = currentPartner ? currentPartner.id : null;
    return computeHintUses(hintStageNumFor(stageId), partnerId);
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

function showHintIncreaseModal(fromCount, toCount, opts) {
  opts = opts || {};
  var from = Math.max(0, fromCount | 0);
  var toRaw = Math.max(0, toCount | 0);
  var to = opts.allowDecrease ? toRaw : Math.max(from + 1, toRaw);
  var existing = document.getElementById('hint-increase-modal');
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

  var overlay = document.createElement('div');
  overlay.id = 'hint-increase-modal';
  overlay.className = 'hint-increase-modal';
  overlay.classList.toggle('is-decrease', to < from);
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-live', 'assertive');

  var card = document.createElement('div');
  card.className = 'hint-increase-card';

  var badge = document.createElement('div');
  badge.className = 'hint-increase-card__badge';
  badge.textContent = opts.badgeText || 'ヒントが';

  var title = document.createElement('div');
  title.className = 'hint-increase-card__title';
  title.textContent = opts.titleText || 'ふえたよ';

  var meter = document.createElement('div');
  meter.className = 'hint-increase-card__meter';
  var before = document.createElement('span');
  before.className = 'hint-increase-card__count hint-increase-card__count--before';
  before.textContent = 'ヒント×' + from;
  var arrow = document.createElement('span');
  arrow.className = 'hint-increase-card__arrow';
  arrow.textContent = '→';
  var after = document.createElement('span');
  after.className = 'hint-increase-card__count hint-increase-card__count--after';
  after.textContent = 'ヒント×' + to;
  meter.appendChild(before);
  meter.appendChild(arrow);
  meter.appendChild(after);

  card.appendChild(badge);
  card.appendChild(title);
  card.appendChild(meter);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  requestAnimationFrame(function () {
    overlay.classList.add('is-visible');
    setTimeout(function () {
      overlay.classList.add('is-after');
    }, 520);
  });

  var closeDelay = opts.closeDelay || 1900;
  var didClose = false;
  var close = function () {
    if (didClose) return;
    didClose = true;
    overlay.classList.remove('is-visible');
    overlay.classList.add('is-leaving');
    setTimeout(function () {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof opts.onClose === 'function') {
        try { opts.onClose(); } catch (_) {}
      }
    }, 260);
  };
  overlay.addEventListener('click', close);
  setTimeout(close, closeDelay);
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
  var label = 'ヒント';
  var isBasicPracticeHintPhase = !!(partnerPracticeState
    && partnerPracticeState.mode === 'basic'
    && (partnerPracticeState.phase === 'hint-press'
      || partnerPracticeState.phase === 'basic-hint-select-try'
      || partnerPracticeState.phase === 'basic-hint-press-try'));
  var basicHintSelectWaiting = !!(isBasicPracticeHintPhase
    && partnerPracticeState.phase === 'basic-hint-select-try');
  var basicHintPressWaiting = !!(isBasicPracticeHintPhase
    && (partnerPracticeState.phase === 'hint-press'
      || partnerPracticeState.phase === 'basic-hint-press-try')
    && !partnerPracticeState.hintPressReady);
  if (dragPiece) {
    // ドラッグ中は無効化 + 😴 マーク
    btnHint.classList.add('is-disabled', 'is-sleeping');
    btnHint.classList.remove('is-empty');
    btnHint.textContent = '😴 ' + label;
    btnHint.setAttribute('aria-disabled', 'true');
    return;
  }
  btnHint.classList.remove('is-sleeping');
  if (basicHintSelectWaiting || basicHintPressWaiting) {
    btnHint.classList.add('is-disabled');
    btnHint.classList.remove('is-empty');
    btnHint.textContent = label + '×' + Math.max(0, remaining);
    btnHint.setAttribute('aria-disabled', 'true');
    return;
  }
  if (remaining <= 0) {
    btnHint.classList.add('is-disabled', 'is-empty');
    btnHint.textContent = label + '×0';
    btnHint.setAttribute('aria-disabled', 'true');
    return;
  }
  btnHint.classList.remove('is-disabled', 'is-empty');
  btnHint.textContent = label + '×' + remaining;
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

// 「ピースを 選んでから押してね」吹き出しを表示
function showHintNotice() {
  if (!puzzleContainer) return;
  var existing = document.getElementById('hint-notice-bubble');
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  if (hintNoticeTimeout) { clearTimeout(hintNoticeTimeout); hintNoticeTimeout = null; }
  var el = document.createElement('div');
  el.id = 'hint-notice-bubble';
  el.className = 'hint-notice-bubble';
  el.textContent = 'ピースを 選んでから押してね';
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
      if (now >= hintFlashUntil) {
        hintFlashPiece = null;
        hintFlashVisibleAt = 0;
      }
      return;
    }
    try { redraw(); } catch (_) {}
    hintAnimRafHandle = requestAnimationFrame(loop);
  }
  hintAnimRafHandle = requestAnimationFrame(loop);
}

function showHintGlowForPiece(piece, durationMs) {
  if (!piece || piece.snapped) return;
  hintFlashVisibleAt = 0;
  hintFlashPiece = piece;
  hintFlashUntil = Date.now() + Math.max(1, durationMs || HINT_FLASH_DURATION_MS);
  ensureHintAnimLoop();
}

function clearHintGlow() {
  hintFlashPiece = null;
  hintFlashUntil = 0;
  hintFlashVisibleAt = 0;
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

  // ── ヒント位置の強調: 青白い輪郭 + 広めの glow + 星 ──
  if (hintFlashPiece && now < hintFlashUntil
      && pieces && pieces.indexOf(hintFlashPiece) >= 0) {
    if (!hintFlashVisibleAt) {
      hintFlashVisibleAt = now;
      scheduleBasicHintDoneAfterFlashVisible();
    }
    var t = Math.max(0, Math.min(1, (hintFlashUntil - now) / HINT_FLASH_DURATION_MS)); // 1 → 0
    var phase = 1 - t;                                       // 0 → 1
    var slot = pieceCenter(hintFlashPiece, true);
    var blink = 0.5 + 0.5 * Math.sin(now / 120);             // 0..1
    var glowR = Math.max(pieceW, pieceH) * (0.62 + 0.22 * blink + 0.18 * Math.min(phase, 1));

    ctx.save();
    var grad = ctx.createRadialGradient(slot.cx, slot.cy, 4, slot.cx, slot.cy, glowR);
    grad.addColorStop(0,   'rgba(255, 255, 255, ' + (0.78 + 0.12 * blink).toFixed(3) + ')');
    grad.addColorStop(0.34, 'rgba(89, 209, 255, ' + (0.44 + 0.16 * blink).toFixed(3) + ')');
    grad.addColorStop(0.72, 'rgba(37, 99, 235, 0.20)');
    grad.addColorStop(1,   'rgba(37, 99, 235, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(slot.cx, slot.cy, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = Math.max(5, Math.min(pieceW, pieceH) * 0.07) + 2 * blink;
    ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.86 + 0.12 * blink).toFixed(3) + ')';
    ctx.shadowColor = 'rgba(48, 166, 255, 0.95)';
    ctx.shadowBlur = 24 + 14 * blink;
    ctx.beginPath();
    buildPiecePath(ctx, hintFlashPiece.homeX, hintFlashPiece.homeY, pieceW, pieceH, hintFlashPiece.tabs);
    ctx.stroke();

    ctx.setLineDash([Math.max(8, pieceW * 0.08), Math.max(5, pieceW * 0.05)]);
    ctx.lineDashOffset = -now / 42;
    ctx.lineWidth = Math.max(3, Math.min(pieceW, pieceH) * 0.038);
    ctx.strokeStyle = 'rgba(21, 142, 235, ' + (0.78 + 0.18 * blink).toFixed(3) + ')';
    ctx.shadowBlur = 10 + 8 * blink;
    ctx.beginPath();
    buildPiecePath(ctx, hintFlashPiece.homeX, hintFlashPiece.homeY, pieceW, pieceH, hintFlashPiece.tabs);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(255, 244, 136, ' + (0.90 + 0.10 * blink).toFixed(3) + ')';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.lineWidth = 2.5;
    drawStar(ctx, slot.cx, slot.cy, Math.min(pieceW, pieceH) * 0.34, 5, 0.45);
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
    onPartnerPracticePieceSelected(selectedPieceForHint);
  } else {
    // 解除時も 1 フレーム redraw して overlay を消す
    window.PonoHintActive = false;
    try { redraw(); } catch (_) {}
  }
}

// ===== Partner Practice Tutorial (real puzzle UI) =====
//
// パートナー初回時は独立した説明絵ではなく、実際のパズル画面に一時的な
// 9〜12ピース程度の練習ステージをロードし、既存ボタン/タイマー/ピースを
// 動かして特徴を見せる。終了後は元のステージを再ロードして本番に戻す。
const PARTNER_PRACTICE_SEEN_PREFIX = 'pono_partner_real_tutorial_seen_v1_';
const BASIC_PRACTICE_SEEN_KEY = 'pono_puzzle_basic_controls_tutorial_seen_v1';
const TITLE_GUIDE_CHOICE_KEY = 'pono_puzzle_title_guide_choice_v1';
const BASIC_PRACTICE_HAND_ASSETS = {
  open: '../assets/images/puzzle/ui/tutorial/hand_open_hover.png',
  release: '../assets/images/puzzle/ui/tutorial/hand_open_release.png',
  grab: '../assets/images/puzzle/ui/tutorial/hand_grab_ready.png',
  grip: '../assets/images/puzzle/ui/tutorial/hand_grip.png',
  pinch: '../assets/images/puzzle/ui/tutorial/hand_pinch.png',
  point: '../assets/images/puzzle/ui/tutorial/hand_point_left.png',
};
const BASIC_HAND_DEMO_MOVE_MS = 680;
const BASIC_HAND_DEMO_HOLD_MS = 420;
const BASIC_HAND_DEMO_AFTER_MS = 260;
const BASIC_DRAG_DEMO_DURATION_MS = 1250;
const BASIC_LOOP_HAND_CUE_START_MS = 900;
const BASIC_LOOP_HAND_CUE_MOVE_MS = 1050;
const BASIC_LOOP_HAND_CUE_REPEAT_MS = 820;
const BASIC_INTRO_DEMO_BANNER_DELAY_MS = 5200;
const BASIC_INTRO_DEMO_BANNER_MS = 3000;
const BASIC_DRAG_NA_START_DELAY_MS = 650;
const BASIC_DRAG_ORANGE_PRE_VOICE_MS = 180;
const BASIC_DRAG_BLUE_CUE_DELAY_MS = 2300;
const BASIC_TRY_BLUE_CUE_DELAY_MS = 3600;
const BASIC_TRY_BANNER_MS = 6800;
// Offsets measured from the moment the corresponding voice (basic_tut_02 for
// the demo phase, basic_tut_03 for the try phase) STARTS playing. The orange
// cue should appear when the narration says 「このピースをつかんで」 and the blue
// cue when it says 「青い場所へ」. These values were tuned to the current
// recordings; if narration timing changes, re-measure with audacity.
const BASIC_DRAG_DEMO_ORANGE_AT_VOICE_MS = 800;
const BASIC_DRAG_DEMO_BLUE_AT_VOICE_MS = 2500;
const BASIC_DRAG_TRY_ORANGE_AT_VOICE_MS = 700;
const BASIC_DRAG_TRY_BLUE_AT_VOICE_MS = 2400;
// If the audio element never fires 'play'/'playing' within this window (autoplay
// blocked, file 404, decode stall), we fall back to a wall-clock schedule so the
// orange/blue cues still appear and the child is never stuck without guidance.
const BASIC_CUE_PLAY_FALLBACK_MS = 1200;
const BASIC_AFTER_DRAG_SUCCESS_MS = 1700;
const BASIC_PEEK_HOLD_MS = 850;
const BASIC_AFTER_PEEK_SUCCESS_DELAY_MS = 1100;
const BASIC_SELECT_PIECE_AFTER_CUE_VISIBLE_MS = 1000;
const BASIC_HINT_DEMO_GLOW_MS = 5200;
const BASIC_HINT_TRY_GLOW_MS = 180000;
const BASIC_HINT_DONE_AFTER_FLASH_VISIBLE_MS = 360;
const BASIC_HINT_AUTO_SNAP_DELAY_MS = 2200;
const BASIC_HINT_AUTO_SNAP_DURATION_MS = 1200;
const BASIC_AFTER_AUTO_SNAP_FINISH_MS = 650;
const BASIC_MODE_BADGE_POP_MS = 3000;
// 'できたね！' success badge on a completed peek hold. Long enough to read but
// shorter than the narrated intro/try banners; the phase then moves on to the
// success narration + hint, so it doesn't need the full ~6.8s.
const BASIC_PEEK_DONE_BANNER_MS = 3500;
const PARTNER_PRACTICE_AFTER_TAP_DELAY_MS = 180;
const PARTNER_PRACTICE_MODAL_AFTER_HIDE_MS = 560;
const RISU_PRACTICE_TIMER_DEMO_MS = 3200;
const BASIC_TUT_FALLBACK_MS = [8900, 5100, 6800, 6300, 6800, 7200, 5400, 7600];
let pendingStageReadyCallbacks = [];
let partnerPracticeState = null;
let titleGuideChoiceOpen = false;

const PARTNER_PRACTICE_COPY = {
  kitsune: {
    title: 'キツネは、ヒントが ふえる',
    body: 'キツネと なかよくなると、ヒントの かいすうが ふえるよ。',
  },
  kojika: {
    title: 'こじかは、ちかいと ひかる',
    body: 'ピースが ちかづくと、あおく ひかるよ。',
  },
  araiguma: {
    title: 'アライグマは、すこし はめてくれる',
    body: 'ボタンを おすと、ピースを すこし はめてくれるよ。',
  },
  usagi: {
    title: 'ウサギは、むきを おしえてくれる',
    body: 'ピースを うごかすと、みみと やじるしで むきを おしえてくれるよ。',
  },
  fukurou: {
    title: 'フクロウは、となりを みつける',
    body: 'ピースを ながおしすると、となりの ピースを おしえてくれるよ。',
  },
  risu: {
    title: 'リスは、じかん チャレンジ',
    body: '「のこり」を みながら、すばやく クリアを めざすよ。',
  },
  harinezumi: {
    title: 'ハリネズミは、ヒント すくなめ',
    body: 'ヒントが すくない まま、クリアに ちょうせんするよ。',
  },
  karasu: {
    title: 'カラスは、ピースが まわる',
    body: 'ピースの むきを みて、タッチで なおしてから はめるよ。',
  },
};

function queueStageReadyCallback(cb) {
  if (typeof cb !== 'function') return;
  pendingStageReadyCallbacks.push(cb);
}

function flushStageReadyCallbacks() {
  if (!pendingStageReadyCallbacks.length) return;
  var callbacks = pendingStageReadyCallbacks.slice();
  pendingStageReadyCallbacks.length = 0;
  setTimeout(function () {
    for (var i = 0; i < callbacks.length; i++) {
      try { callbacks[i](); } catch (e) {
        try { console.warn('[PartnerPractice] callback failed:', e); } catch (_) {}
      }
    }
  }, 0);
}

function loadStageAndThen(index, cb) {
  queueStageReadyCallback(cb);
  loadStage(index);
}

function partnerPracticeKey(partnerId) {
  return PARTNER_PRACTICE_SEEN_PREFIX + String(partnerId || 'unknown');
}

function hasSeenPartnerPractice(partnerId) {
  try { return localStorage.getItem(partnerPracticeKey(partnerId)) === '1'; }
  catch (_) { return false; }
}

function markPartnerPracticeSeen(partnerId) {
  try { localStorage.setItem(partnerPracticeKey(partnerId), '1'); } catch (_) {}
}

function clearPartnerPracticeSeen(partnerId) {
  try { localStorage.removeItem(partnerPracticeKey(partnerId)); } catch (_) {}
}

function hasSeenBasicPractice() {
  try { return localStorage.getItem(BASIC_PRACTICE_SEEN_KEY) === '1'; }
  catch (_) { return false; }
}

function markBasicPracticeSeen() {
  try { localStorage.setItem(BASIC_PRACTICE_SEEN_KEY, '1'); } catch (_) {}
}

function clearBasicPracticeSeen() {
  try { localStorage.removeItem(BASIC_PRACTICE_SEEN_KEY); } catch (_) {}
}

function getBasicTutFallbackMs(stepIndex, fallbackMs) {
  var defaultMs = BASIC_TUT_FALLBACK_MS[stepIndex | 0] || 4300;
  return Math.max(defaultMs, fallbackMs || 0);
}

function playBasicPracticeVoice(stepIndex, onDone, fallbackMs) {
  if (!partnerPracticeState || partnerPracticeState.mode !== 'basic') return;
  if (partnerPracticeState.basicVoiceTimer) {
    try { clearTimeout(partnerPracticeState.basicVoiceTimer); } catch (_) {}
    partnerPracticeState.basicVoiceTimer = null;
  }
  var token = ((partnerPracticeState.basicVoiceToken || 0) + 1);
  partnerPracticeState.basicVoiceToken = token;
  partnerPracticeState.basicVoiceBusy = true;
  partnerPracticeState.basicVoiceStepIndex = stepIndex | 0;
  var audio = null;
  try {
    if (window.PuzzleVoice && typeof window.PuzzleVoice.playBasicTut === 'function') {
      audio = window.PuzzleVoice.playBasicTut(stepIndex);
    }
  } catch (_) {}
  var done = false;
  var startedAt = performance.now();
  var fallbackDelay = getBasicTutFallbackMs(stepIndex, fallbackMs);
  function setVoiceFallbackTimer(delayMs) {
    if (!partnerPracticeState || partnerPracticeState.basicVoiceToken !== token) return;
    if (partnerPracticeState.basicVoiceTimer) {
      try { clearTimeout(partnerPracticeState.basicVoiceTimer); } catch (_) {}
    }
    var elapsed = performance.now() - startedAt;
    var remaining = Math.max(0, delayMs - elapsed);
    partnerPracticeState.basicVoiceTimer = setTimeout(finish, remaining);
  }
  var finish = function () {
    if (done) return;
    if (!partnerPracticeState || partnerPracticeState.basicVoiceToken !== token) return;
    done = true;
    if (partnerPracticeState.basicVoiceTimer) {
      try { clearTimeout(partnerPracticeState.basicVoiceTimer); } catch (_) {}
    }
    partnerPracticeState.basicVoiceBusy = false;
    partnerPracticeState.basicVoiceStepIndex = null;
    partnerPracticeState.basicVoiceTimer = null;
    var queued = partnerPracticeState.basicVoiceQueued;
    partnerPracticeState.basicVoiceQueued = null;
    if (typeof onDone === 'function') onDone();
    if (typeof queued === 'function') queued();
  };
  if (audio && typeof audio.addEventListener === 'function') {
    try { audio.addEventListener('ended', finish, { once: true }); } catch (_) {}
    try {
      audio.addEventListener('loadedmetadata', function () {
        if (done || !partnerPracticeState || partnerPracticeState.basicVoiceToken !== token) return;
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          var durationMs = Math.ceil(audio.duration * 1000) + 850;
          if (durationMs > fallbackDelay) {
            fallbackDelay = durationMs;
            setVoiceFallbackTimer(fallbackDelay);
          }
        }
      }, { once: true });
    } catch (_) {}
    try {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        fallbackDelay = Math.max(fallbackDelay, Math.ceil(audio.duration * 1000) + 850);
      }
    } catch (_) {}
  }
  setVoiceFallbackTimer(fallbackDelay);
  return audio;
}

// Anchor the orange (tap-piece) and blue (kojika-move-target) cues to the
// ACTUAL audio playback of the narration, not to a setTimeout measured from
// scheduling time. We attach a one-time 'play'/'playing' listener on the audio
// element; when it fires, we schedule the cues at orangeMs/blueMs measured from
// that real playback start. If playback never starts within
// BASIC_CUE_PLAY_FALLBACK_MS (autoplay blocked / file missing / decode stall),
// we fall back to the old wall-clock schedule so cues still appear.
//
// opts: { audio, phase, piece, orangeMs, blueMs }
function scheduleBasicDragCuesOnVoice(opts) {
  if (!partnerPracticeState) return;
  var audio = opts.audio;
  var phase = opts.phase;
  var piece = opts.piece;
  var orangeMs = opts.orangeMs | 0;
  var blueMs = opts.blueMs | 0;
  var scheduledAt = performance.now();
  var fired = false; // cues scheduled once (either via play event or fallback)

  function stillValid() {
    return !!(partnerPracticeState
      && partnerPracticeState.phase === phase
      && (!piece || partnerPracticeState.targetPiece === piece));
  }

  function showOrange() {
    if (!stillValid()) return;
    partnerPracticeState.cue = { kind: 'tap-piece', piece: piece };
    redraw();
  }
  function showBlue() {
    if (!stillValid()) return;
    partnerPracticeState.cue = { kind: 'kojika-move-target', piece: piece };
    redraw();
  }

  // Schedule both cues relative to `anchorTime` (real or fallback playback
  // start). Offsets already elapsed since the anchor are clamped to 0 so a late
  // anchor still produces the cues immediately rather than skipping them.
  function scheduleFromAnchor(anchorTime) {
    if (fired) return;
    fired = true;
    var elapsed = Math.max(0, performance.now() - anchorTime);
    practiceSetTimeout(showOrange, Math.max(0, orangeMs - elapsed));
    practiceSetTimeout(showBlue, Math.max(0, blueMs - elapsed));
  }

  function onPlay() {
    cleanup();
    if (fired) return;
    // Anchor to the moment playback truly began.
    scheduleFromAnchor(performance.now());
  }

  function cleanup() {
    if (audio && typeof audio.removeEventListener === 'function') {
      try { audio.removeEventListener('play', onPlay); } catch (_) {}
      try { audio.removeEventListener('playing', onPlay); } catch (_) {}
    }
  }

  var hasAudio = !!(audio && typeof audio.addEventListener === 'function');
  if (hasAudio) {
    // If the audio is already playing by the time we get here, anchor now.
    try {
      if (!audio.paused && audio.currentTime > 0) {
        scheduleFromAnchor(performance.now() - (audio.currentTime * 1000));
      }
    } catch (_) {}
    if (!fired) {
      try { audio.addEventListener('play', onPlay, { once: true }); } catch (_) {}
      try { audio.addEventListener('playing', onPlay, { once: true }); } catch (_) {}
    }
  }

  // Fallback: if 'play' never fires (no audio element, autoplay blocked, 404,
  // decode stall), schedule from the original wall-clock so cues still appear.
  practiceSetTimeout(function () {
    if (fired) return;
    cleanup();
    scheduleFromAnchor(scheduledAt);
  }, hasAudio ? BASIC_CUE_PLAY_FALLBACK_MS : 0);
}

function queueBasicPracticeAfterVoice(fn) {
  if (!partnerPracticeState || typeof fn !== 'function') return;
  if (partnerPracticeState.basicVoiceBusy) {
    partnerPracticeState.basicVoiceQueued = fn;
    return;
  }
  fn();
}

function clearBasicPracticeVoiceQueue() {
  if (!partnerPracticeState) return;
  if (partnerPracticeState.basicVoiceTimer) {
    try { clearTimeout(partnerPracticeState.basicVoiceTimer); } catch (_) {}
  }
  partnerPracticeState.basicVoiceTimer = null;
  partnerPracticeState.basicVoiceQueued = null;
  partnerPracticeState.basicVoiceBusy = false;
  partnerPracticeState.basicVoiceStepIndex = null;
  partnerPracticeState.basicVoiceToken = ((partnerPracticeState.basicVoiceToken || 0) + 1);
}

function stopPuzzleVoice() {
  try {
    if (window.PuzzleVoice && typeof window.PuzzleVoice.stop === 'function') {
      window.PuzzleVoice.stop();
    }
  } catch (_) {}
}

function isTitleGuideChoiceEnabled() {
  try { return localStorage.getItem(TITLE_GUIDE_CHOICE_KEY) !== 'off'; }
  catch (_) { return true; }
}

function setTitleGuideChoiceEnabled(on) {
  try { localStorage.setItem(TITLE_GUIDE_CHOICE_KEY, on ? 'on' : 'off'); } catch (_) {}
  refreshTitleGuideChoiceMenuItem();
}

function resetPuzzlePracticeSeenFlags() {
  clearBasicPracticeSeen();
  try {
    if (window.PonoPartners && Array.isArray(window.PonoPartners.list)) {
      for (var i = 0; i < window.PonoPartners.list.length; i++) {
        var partner = window.PonoPartners.list[i];
        if (partner && partner.id) clearPartnerPracticeSeen(partner.id);
      }
    }
  } catch (_) {}
}

function clearActivePracticeSessionForReplay() {
  if (!partnerPracticeState) return;
  var originalTitle = partnerPracticeState.originalTitle;
  clearPartnerPracticeTimers();
  clearPracticeHighlights();
  setSelectedPieceForHint(null);
  hintFlashPiece = null;
  hintFlashUntil = 0;
  dragPiece = null;
  if (btnHint) btnHint.classList.remove('partner-practice-count-demo', 'is-count-pop');
  if (peekOn) setPeekOverlay(false);
  clearBasicPracticeVoiceQueue();
  stopPuzzleVoice();
  stopChallengeTimer();
  hideChallengeStatus();
  if (partnerPracticeState.coach && partnerPracticeState.coach.parentNode) {
    partnerPracticeState.coach.parentNode.removeChild(partnerPracticeState.coach);
  }
  removeBasicPracticeModeBanner();
  document.body.classList.remove('partner-practice-active');
  document.body.classList.remove('partner-practice-hint-on');
  document.body.classList.remove('partner-practice-peek-on');
  document.body.classList.remove('partner-practice-basic-layout');
  if (puzzleContainer) puzzleContainer.classList.remove('partner-practice-on', 'partner-practice-input-on');
  if (stageLabel && originalTitle) stageLabel.textContent = originalTitle;
  partnerPracticeState.active = false;
  partnerPracticeState = null;
  redraw();
}

function resetPuzzlePracticeAndReplay() {
  resetPuzzlePracticeSeenFlags();
  clearCurrentPartnerSelection();
  partnerChoiceDismissedStageId = null;
  clearActivePracticeSessionForReplay();
  showBasicPracticeIfNeeded(function () {}, true);
}

function choosePartnerPracticeStageIndex() {
  for (var i = 0; i < STAGES.length; i++) {
    var pc = STAGES[i] && (STAGES[i].pieceCount || (STAGES[i].rows * STAGES[i].cols));
    if (pc >= 10 && pc <= 12) return i;
  }
  for (var j = 0; j < STAGES.length; j++) {
    var fallbackPc = STAGES[j] && (STAGES[j].pieceCount || (STAGES[j].rows * STAGES[j].cols));
    if (fallbackPc >= 9 && fallbackPc <= 12) return j;
  }
  return Math.max(0, Math.min(STAGES.length - 1, 7));
}

function clearPartnerPracticeTimers() {
  if (!partnerPracticeState) return;
  clearPartnerPracticeTapToStart();
  clearBasicPracticeHand();
  partnerPracticeState.loopCueGhost = null;
  var timers = partnerPracticeState.timers || [];
  for (var i = 0; i < timers.length; i++) {
    try { clearTimeout(timers[i]); } catch (_) {}
  }
  partnerPracticeState.timers = [];
  var rafs = partnerPracticeState.rafs || [];
  for (var j = 0; j < rafs.length; j++) {
    try { cancelAnimationFrame(rafs[j]); } catch (_) {}
  }
  partnerPracticeState.rafs = [];
  if (partnerPracticeState.cueRaf) {
    try { cancelAnimationFrame(partnerPracticeState.cueRaf); } catch (_) {}
    partnerPracticeState.cueRaf = null;
  }
}

function practiceSetTimeout(fn, ms) {
  if (!partnerPracticeState) return 0;
  var id = setTimeout(function () {
    if (!partnerPracticeState || !partnerPracticeState.active) return;
    fn();
  }, ms);
  partnerPracticeState.timers.push(id);
  return id;
}

function clampBasicPracticeHandSize(size) {
  var viewportMin = Math.min(window.innerWidth || 800, window.innerHeight || 600);
  var maxSize = Math.max(72, Math.min(128, viewportMin * 0.18));
  return Math.max(54, Math.min(maxSize, size || 92));
}

function getBasicPracticeHandAnchor(pose) {
  if (pose === 'point') return { x: 0.08, y: 0.52 };
  if (pose === 'grab' || pose === 'grip' || pose === 'pinch') return { x: 0.48, y: 0.52 };
  return { x: 0.50, y: 0.52 };
}

function getBasicPracticeHandEl() {
  if (!partnerPracticeState) return null;
  if (partnerPracticeState.handEl && partnerPracticeState.handEl.isConnected) {
    return partnerPracticeState.handEl;
  }
  var el = document.createElement('div');
  el.className = 'partner-practice-hand';
  el.setAttribute('aria-hidden', 'true');
  var img = document.createElement('img');
  img.alt = '';
  img.draggable = false;
  el.appendChild(img);
  document.body.appendChild(el);
  partnerPracticeState.handEl = el;
  partnerPracticeState.handImg = img;
  return el;
}

function setBasicPracticeHand(point, pose, options) {
  if (!partnerPracticeState || !point) return;
  options = options || {};
  pose = pose || 'open';
  var el = getBasicPracticeHandEl();
  if (!el) return;
  var img = partnerPracticeState.handImg || el.querySelector('img');
  if (img) img.src = BASIC_PRACTICE_HAND_ASSETS[pose] || BASIC_PRACTICE_HAND_ASSETS.open;
  var size = clampBasicPracticeHandSize(options.size);
  var anchor = options.anchor || getBasicPracticeHandAnchor(pose);
  el.style.width = size.toFixed(1) + 'px';
  el.style.left = (point.x - size * anchor.x).toFixed(1) + 'px';
  el.style.top = (point.y - size * anchor.y).toFixed(1) + 'px';
  el.style.setProperty('--practice-hand-rotate', options.rotate || '0deg');
  el.style.setProperty('--practice-hand-scale', options.scale == null ? '1' : String(options.scale));
  el.classList.add('is-visible');
  el.classList.toggle('is-pressing', !!options.pressing);
  document.body.classList.add('partner-practice-hand-visible');
}

function hideBasicPracticeHand() {
  if (!partnerPracticeState || !partnerPracticeState.handEl) return;
  partnerPracticeState.handEl.classList.remove('is-visible', 'is-pressing');
  document.body.classList.remove('partner-practice-hand-visible');
}

function clearBasicPracticeHand() {
  if (!partnerPracticeState) return;
  if (partnerPracticeState.handEl && partnerPracticeState.handEl.parentNode) {
    partnerPracticeState.handEl.parentNode.removeChild(partnerPracticeState.handEl);
  }
  partnerPracticeState.handEl = null;
  partnerPracticeState.handImg = null;
  document.body.classList.remove('partner-practice-hand-visible');
}

function setBasicPracticeModeBanner(kind, text, visibleMs) {
  if (!partnerPracticeState || partnerPracticeState.mode !== 'basic') return;
  var el = partnerPracticeState.modeBadgeEl;
  if (!el || !el.isConnected) {
    el = document.createElement('div');
    el.className = 'partner-practice-mode-badge';
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
    partnerPracticeState.modeBadgeEl = el;
  }
  var mode = kind === 'try' ? 'try' : (kind === 'done' ? 'done' : 'demo');
  setBasicPracticeFrameMode(mode);
  el.className = 'partner-practice-mode-badge is-visible is-' + mode;
  el.textContent = text || (mode === 'try' ? 'やってみよう！' : (mode === 'done' ? 'できたね！' : 'おてほんをみてね'));
  var token = ((partnerPracticeState.modeBadgeToken || 0) + 1);
  partnerPracticeState.modeBadgeToken = token;
  var duration = Math.max(3000, visibleMs || BASIC_MODE_BADGE_POP_MS);
  practiceSetTimeout(function () {
    if (!partnerPracticeState || partnerPracticeState.modeBadgeToken !== token) return;
    if (el && el.isConnected) el.classList.remove('is-visible');
  }, duration);
}

function setBasicPracticeFrameMode(mode) {
  var frame = puzzleContainer && puzzleContainer.closest ? puzzleContainer.closest('.puzzle-frame') : null;
  if (!frame) frame = document.querySelector('.puzzle-frame');
  if (!frame) return;
  frame.classList.remove('is-practice-mode-pulsing', 'practice-mode-demo', 'practice-mode-try', 'practice-mode-done');
  if (mode) {
    frame.classList.add('is-practice-mode-pulsing', 'practice-mode-' + mode);
  }
}

function removeBasicPracticeModeBanner() {
  if (partnerPracticeState) {
    partnerPracticeState.modeBadgeToken = ((partnerPracticeState.modeBadgeToken || 0) + 1);
  }
  setBasicPracticeFrameMode(null);
  if (!partnerPracticeState || !partnerPracticeState.modeBadgeEl) return;
  if (partnerPracticeState.modeBadgeEl.parentNode) {
    partnerPracticeState.modeBadgeEl.parentNode.removeChild(partnerPracticeState.modeBadgeEl);
  }
  partnerPracticeState.modeBadgeEl = null;
}

function cancelBasicPracticeLoopCue() {
  if (!partnerPracticeState) return;
  partnerPracticeState.loopCueToken = ((partnerPracticeState.loopCueToken || 0) + 1);
  partnerPracticeState.loopCueActive = false;
  partnerPracticeState.loopCueGhost = null;
  hideBasicPracticeHand();
  redraw();
}

function practiceRectCenter(rect) {
  if (!rect) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function getPieceScreenCenter(piece, useHome) {
  var rect = useHome ? getPieceHomeScreenRect(piece) : getPieceScreenRect(piece);
  return practiceRectCenter(rect);
}

function getBasicHandSizeForRect(rect, scale) {
  if (!rect) return clampBasicPracticeHandSize(92);
  return clampBasicPracticeHandSize(Math.max(rect.width, rect.height) * (scale || 1.15));
}

function animateBasicPracticeHand(from, to, duration, pose, options, onFrame, onDone) {
  if (!partnerPracticeState || !from || !to) {
    if (typeof onDone === 'function') onDone();
    return;
  }
  options = options || {};
  var start = performance.now();
  function frame(now) {
    if (!partnerPracticeState || !partnerPracticeState.active) return;
    var t = Math.max(0, Math.min(1, (now - start) / Math.max(1, duration || BASIC_HAND_DEMO_MOVE_MS)));
    var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    var point = {
      x: from.x + (to.x - from.x) * ease,
      y: from.y + (to.y - from.y) * ease,
    };
    setBasicPracticeHand(point, pose, options);
    if (typeof onFrame === 'function') onFrame(ease, point);
    if (t < 1) {
      var raf = requestAnimationFrame(frame);
      if (partnerPracticeState) partnerPracticeState.rafs.push(raf);
      return;
    }
    if (typeof onDone === 'function') onDone();
  }
  var raf = requestAnimationFrame(frame);
  partnerPracticeState.rafs.push(raf);
}

function armBasicDragLoopCue(piece, phaseName) {
  if (!partnerPracticeState || !piece || !phaseName) return;
  cancelBasicPracticeLoopCue();
  var token = ((partnerPracticeState.loopCueToken || 0) + 1);
  partnerPracticeState.loopCueToken = token;
  partnerPracticeState.loopCueActive = true;

  function isCurrent() {
    return !!(partnerPracticeState
      && partnerPracticeState.active
      && partnerPracticeState.loopCueActive
      && partnerPracticeState.loopCueToken === token
      && partnerPracticeState.phase === phaseName
      && !dragPiece
      && piece
      && !piece.snapped);
  }

  function scheduleNext(delayMs) {
    practiceSetTimeout(function () {
      if (!isCurrent()) return;
      runOnce();
    }, delayMs);
  }

  function runOnce() {
    if (!isCurrent()) return;
    var pieceFrom = { x: piece.x, y: piece.y, rotation: piece.rotation || 0 };
    var pieceTo = { x: piece.homeX, y: piece.homeY, rotation: 0 };
    var from = getPieceScreenCenter(piece, false);
    var to = getPieceScreenCenter(piece, true);
    var rect = getPieceScreenRect(piece);
    if (!from || !to || !rect) return;
    var size = getBasicHandSizeForRect(rect, 1.14);
    partnerPracticeState.loopCueGhost = null;
    setBasicPracticeHand(from, 'open', { size: size });
    practiceSetTimeout(function () {
      if (!isCurrent()) return;
      setBasicPracticeHand(from, 'grab', { size: size, pressing: true, scale: 0.96 });
      practiceSetTimeout(function () {
        if (!isCurrent()) return;
        animateBasicPracticeHand(from, to, BASIC_LOOP_HAND_CUE_MOVE_MS, 'grip', {
          size: size,
          pressing: true,
          scale: 0.94,
        }, function (ease) {
          if (!isCurrent()) return;
          partnerPracticeState.loopCueGhost = {
            piece: piece,
            x: pieceFrom.x + (pieceTo.x - pieceFrom.x) * ease,
            y: pieceFrom.y + (pieceTo.y - pieceFrom.y) * ease,
            rotation: pieceFrom.rotation + (pieceTo.rotation - pieceFrom.rotation) * ease,
            alpha: 0.34,
          };
          redraw();
        }, function () {
          if (!isCurrent()) return;
          setBasicPracticeHand(to, 'release', { size: size, scale: 1 });
          practiceSetTimeout(function () {
            if (!isCurrent()) return;
            partnerPracticeState.loopCueGhost = null;
            redraw();
            hideBasicPracticeHand();
            scheduleNext(BASIC_LOOP_HAND_CUE_REPEAT_MS);
          }, BASIC_HAND_DEMO_AFTER_MS);
        });
      }, 180);
    }, 180);
  }

  scheduleNext(BASIC_LOOP_HAND_CUE_START_MS);
}

function practiceAddHighlight(el) {
  if (!el || !partnerPracticeState) return;
  el.classList.add('partner-practice-highlight');
  partnerPracticeState.highlighted.push(el);
}

function clearPracticeHighlights() {
  if (!partnerPracticeState) return;
  var list = partnerPracticeState.highlighted || [];
  for (var i = 0; i < list.length; i++) {
    try { list[i].classList.remove('partner-practice-highlight'); } catch (_) {}
  }
  partnerPracticeState.highlighted = [];
}

function createPartnerPracticeCoach(partnerId, partner) {
  var copy = PARTNER_PRACTICE_COPY[partnerId] || {
    title: (partner ? partner.name : 'パートナー') + 'のれんしゅう',
    body: 'ほんもののパズルで、なかまの うごきを みてみよう。',
  };
  var state = partnerPracticeState || {};
  var coach = document.createElement('div');
  coach.className = 'partner-practice-coach partner-practice-coach--' + (partnerId || 'basic');
  coach.setAttribute('role', 'dialog');
  coach.setAttribute('aria-live', 'polite');

  var face = document.createElement('div');
  face.className = 'partner-practice-coach__face';
  if (partner && partner.image) {
    var img = document.createElement('img');
    img.src = partner.image;
    img.alt = partner.name || '';
    face.appendChild(img);
  } else {
    var icon = document.createElement('span');
    icon.className = 'partner-practice-coach__icon';
    icon.textContent = '🧩';
    face.appendChild(icon);
  }
  coach.appendChild(face);

  var text = document.createElement('div');
  text.className = 'partner-practice-coach__text';
  var eyebrow = document.createElement('div');
  eyebrow.className = 'partner-practice-coach__eyebrow';
  eyebrow.textContent = 'ほんもののパズルでれんしゅう';
  var title = document.createElement('div');
  title.className = 'partner-practice-coach__title';
  title.textContent = copy.title;
  var body = document.createElement('div');
  body.className = 'partner-practice-coach__body';
  body.textContent = copy.body;
  text.appendChild(eyebrow);
  text.appendChild(title);
  text.appendChild(body);
  coach.appendChild(text);

  var actions = document.createElement('div');
  actions.className = 'partner-practice-coach__actions';
  var replay = document.createElement('button');
  replay.type = 'button';
  replay.className = 'partner-practice-coach__btn partner-practice-coach__btn--replay';
  replay.textContent = state.backLabel || 'もういちど';
  replay.addEventListener('click', function () {
    if (partnerPracticeState && partnerPracticeState.backAction === 'return') {
      returnPartnerPracticeToSelect();
      return;
    }
    replayPartnerPracticeDemo();
  });
  var start = document.createElement('button');
  start.type = 'button';
  start.className = 'partner-practice-coach__btn partner-practice-coach__btn--start';
  start.textContent = state.startLabel || 'ほんばんへ';
  start.addEventListener('click', finishPartnerPractice);
  actions.appendChild(replay);
  actions.appendChild(start);
  coach.appendChild(actions);

  if (state.mode === 'basic') {
    coach.classList.add('is-fixed-panel', 'is-actions-hidden');
  }
  var fixedPanelHost = state.mode === 'basic' ? document.querySelector('.main') : null;
  if (fixedPanelHost) {
    var frame = fixedPanelHost.querySelector('.puzzle-frame');
    if (frame && frame.nextSibling) {
      fixedPanelHost.insertBefore(coach, frame.nextSibling);
    } else {
      fixedPanelHost.appendChild(coach);
    }
  } else {
    document.body.appendChild(coach);
  }
  return coach;
}

function isBasicPracticeFixedPanelActive() {
  return !!(partnerPracticeState
    && partnerPracticeState.mode === 'basic'
    && partnerPracticeState.coach
    && partnerPracticeState.coach.classList.contains('is-fixed-panel'));
}

function clearPartnerPracticeCoachBubble() {
  if (!partnerPracticeState || !partnerPracticeState.coach) return;
  var coach = partnerPracticeState.coach;
  coach.classList.remove('is-bubble', 'is-quiet', 'is-basic-stable');
  coach.classList.toggle('is-actions-hidden', isBasicPracticeFixedPanelActive());
  coach.removeAttribute('data-side');
  coach.style.removeProperty('--partner-bubble-left');
  coach.style.removeProperty('--partner-bubble-top');
}

function hidePartnerPracticeCoach() {
  if (!partnerPracticeState || !partnerPracticeState.coach) return;
  partnerPracticeState.coach.classList.add('is-quiet');
}

function showPartnerPracticeCoach() {
  if (!partnerPracticeState || !partnerPracticeState.coach) return;
  partnerPracticeState.coach.classList.remove('is-quiet');
}

function clampPartnerBubble(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shouldUseBasicStableBubble() {
  if (!partnerPracticeState || partnerPracticeState.mode !== 'basic') return false;
  var viewportW = window.innerWidth || document.documentElement.clientWidth || 0;
  var viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
  return viewportW > viewportH;
}

function inflateScreenRect(rect, padX, padY) {
  if (!rect) return null;
  var x = padX || 0;
  var y = padY == null ? x : padY;
  return {
    left: rect.left - x,
    top: rect.top - y,
    right: rect.right + x,
    bottom: rect.bottom + y,
    width: rect.width + x * 2,
    height: rect.height + y * 2,
  };
}

function combineScreenRects(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  var left = Math.min(a.left, b.left);
  var top = Math.min(a.top, b.top);
  var right = Math.max(a.right, b.right);
  var bottom = Math.max(a.bottom, b.bottom);
  return {
    left: left,
    top: top,
    right: right,
    bottom: bottom,
    width: right - left,
    height: bottom - top,
  };
}

function screenRectOverlapArea(a, b) {
  if (!a || !b) return 0;
  var w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  var h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return w * h;
}

function positionBasicStablePracticeBubble(coach, targetRect) {
  if (!coach) return;
  coach.classList.add('is-basic-stable');
  var margin = 12;
  var gap = 12;
  var viewportW = window.innerWidth || document.documentElement.clientWidth || 800;
  var viewportH = window.innerHeight || document.documentElement.clientHeight || 600;
  var rect = coach.getBoundingClientRect();
  var bubbleW = rect.width || Math.min(520, viewportW - margin * 2);
  var bubbleH = rect.height || 92;
  var frameEl = puzzleContainer && puzzleContainer.closest ? puzzleContainer.closest('.puzzle-frame') : null;
  var frameRect = frameEl && frameEl.getBoundingClientRect ? frameEl.getBoundingClientRect() : null;
  var sidebarEl = document.querySelector('.sidebar');
  var sidebarRect = sidebarEl && sidebarEl.getBoundingClientRect ? sidebarEl.getBoundingClientRect() : null;
  var badgeEl = document.querySelector('.partner-practice-mode-badge.is-visible');
  var badgeRect = badgeEl && badgeEl.getBoundingClientRect ? badgeEl.getBoundingClientRect() : null;

  var left = clampPartnerBubble((viewportW - bubbleW) / 2, margin, Math.max(margin, viewportW - bubbleW - margin));
  var minTop = margin;
  if (badgeRect && badgeRect.height) {
    minTop = Math.max(minTop, badgeRect.bottom + gap);
  }
  if (frameRect && frameRect.height) {
    minTop = Math.max(minTop, frameRect.top + Math.min(18, frameRect.height * 0.06));
  }

  var bottomLimit = viewportH - margin;
  if (sidebarRect && sidebarRect.height) {
    bottomLimit = Math.min(bottomLimit, sidebarRect.top - gap);
  }
  var preferredTop = bottomLimit - bubbleH;
  if (frameRect && frameRect.height) {
    preferredTop = Math.min(preferredTop, frameRect.top + frameRect.height * 0.66);
  }
  var maxTop = Math.max(minTop, viewportH - bubbleH - margin);
  if (bottomLimit > margin) {
    maxTop = Math.max(minTop, Math.min(maxTop, bottomLimit - bubbleH));
  }
  var targetPiece = partnerPracticeState && partnerPracticeState.targetPiece;
  var pieceRectOnScreen = targetPiece ? getPieceScreenRect(targetPiece) : null;
  var homeRectOnScreen = targetPiece ? getPieceHomeScreenRect(targetPiece) : null;
  var pathRect = combineScreenRects(pieceRectOnScreen, homeRectOnScreen);
  var avoidRects = [];
  if (targetRect) avoidRects.push({ rect: inflateScreenRect(targetRect, 18, 14), weight: 1000 });
  if (pieceRectOnScreen) avoidRects.push({ rect: inflateScreenRect(pieceRectOnScreen, 20, 18), weight: 1200 });
  if (homeRectOnScreen) avoidRects.push({ rect: inflateScreenRect(homeRectOnScreen, 24, 20), weight: 1400 });
  if (pathRect) avoidRects.push({ rect: inflateScreenRect(pathRect, 10, 10), weight: 0.65 });

  var frameLeft = frameRect ? frameRect.left + 18 : margin;
  var frameRight = frameRect ? frameRect.right - bubbleW - 18 : viewportW - bubbleW - margin;
  var frameTop = frameRect ? Math.max(minTop, frameRect.top + 18) : minTop;
  var frameBottom = frameRect ? Math.min(maxTop, frameRect.bottom - bubbleH - 18) : maxTop;
  var centerLeft = clampPartnerBubble((viewportW - bubbleW) / 2, margin, Math.max(margin, viewportW - bubbleW - margin));
  var centerTop = clampPartnerBubble((frameTop + frameBottom) / 2, minTop, maxTop);
  var candidates = [
    { left: frameRight, top: frameTop, bias: 0 },
    { left: frameLeft, top: frameTop, bias: 4 },
    { left: frameLeft, top: frameBottom, bias: 8 },
    { left: frameRight, top: frameBottom, bias: 8 },
    { left: centerLeft, top: frameTop, bias: 14 },
    { left: centerLeft, top: frameBottom, bias: 16 },
    { left: frameRight, top: centerTop, bias: 18 },
    { left: frameLeft, top: centerTop, bias: 20 },
    { left: left, top: preferredTop, bias: 28 },
  ];
  var best = null;
  var bestScore = Infinity;
  candidates.forEach(function (candidate) {
    var candLeft = clampPartnerBubble(candidate.left, margin, Math.max(margin, viewportW - bubbleW - margin));
    var candTop = clampPartnerBubble(candidate.top, minTop, maxTop);
    var rectForScore = {
      left: candLeft,
      top: candTop,
      right: candLeft + bubbleW,
      bottom: candTop + bubbleH,
      width: bubbleW,
      height: bubbleH,
    };
    var score = candidate.bias || 0;
    for (var i = 0; i < avoidRects.length; i++) {
      score += screenRectOverlapArea(rectForScore, avoidRects[i].rect) * avoidRects[i].weight;
    }
    if (pieces && pieces.length) {
      for (var j = 0; j < pieces.length; j++) {
        if (!pieces[j] || pieces[j] === targetPiece || pieces[j].snapped) continue;
        score += screenRectOverlapArea(rectForScore, getPieceScreenRect(pieces[j])) * 0.25;
      }
    }
    if (score < bestScore) {
      bestScore = score;
      best = { left: candLeft, top: candTop };
    }
  });
  if (best) {
    left = best.left;
    preferredTop = best.top;
  }
  var top = clampPartnerBubble(preferredTop, minTop, maxTop);

  coach.dataset.side = 'stable';
  coach.style.setProperty('--partner-bubble-left', left.toFixed(1) + 'px');
  coach.style.setProperty('--partner-bubble-top', top.toFixed(1) + 'px');
}

function positionPartnerPracticeBubble(targetRect, preferredSide) {
  if (!partnerPracticeState || !partnerPracticeState.coach || !targetRect) return;
  var coach = partnerPracticeState.coach;
  showPartnerPracticeCoach();
  coach.classList.remove('is-basic-stable');
  if (shouldUseBasicStableBubble()) {
    positionBasicStablePracticeBubble(coach, targetRect);
    return;
  }
  var gap = 14;
  var margin = 10;
  var side = preferredSide || '';
  var viewportW = window.innerWidth || document.documentElement.clientWidth || 800;
  var viewportH = window.innerHeight || document.documentElement.clientHeight || 600;
  var rect = coach.getBoundingClientRect();
  var bubbleW = rect.width || Math.min(320, viewportW - margin * 2);
  var bubbleH = rect.height || 90;
  var centerX = targetRect.left + targetRect.width / 2;
  var centerY = targetRect.top + targetRect.height / 2;

  if (!side) {
    side = targetRect.left > viewportW * 0.58 ? 'left'
      : (targetRect.top < bubbleH + gap + margin ? 'below' : 'above');
  }

  var left;
  var top;
  if (side === 'left') {
    left = targetRect.left - bubbleW - gap;
    top = centerY - bubbleH / 2;
    if (left < margin) side = targetRect.top < bubbleH + gap + margin ? 'below' : 'above';
  }
  if (side === 'right') {
    left = targetRect.right + gap;
    top = centerY - bubbleH / 2;
    if (left + bubbleW > viewportW - margin) side = targetRect.top < bubbleH + gap + margin ? 'below' : 'above';
  }
  if (side === 'below') {
    left = centerX - bubbleW / 2;
    top = targetRect.bottom + gap;
    if (top + bubbleH > viewportH - margin) side = 'above';
  }
  if (side === 'above') {
    left = centerX - bubbleW / 2;
    top = targetRect.top - bubbleH - gap;
    if (top < margin) {
      side = 'below';
      top = targetRect.bottom + gap;
    }
  }
  if (side === 'below') {
    left = centerX - bubbleW / 2;
    top = targetRect.bottom + gap;
  }

  left = clampPartnerBubble(left, margin, Math.max(margin, viewportW - bubbleW - margin));
  top = clampPartnerBubble(top, margin, Math.max(margin, viewportH - bubbleH - margin));
  coach.dataset.side = side;
  coach.style.setProperty('--partner-bubble-left', left.toFixed(1) + 'px');
  coach.style.setProperty('--partner-bubble-top', top.toFixed(1) + 'px');
}

function setPartnerPracticeCoachBubbleForRect(targetRect, preferredSide, showActions) {
  if (!partnerPracticeState || !partnerPracticeState.coach || !targetRect) return;
  var coach = partnerPracticeState.coach;
  if (isBasicPracticeFixedPanelActive()) {
    coach.classList.remove('is-bubble', 'is-basic-stable');
    coach.classList.toggle('is-actions-hidden', !showActions);
    coach.removeAttribute('data-side');
    coach.style.removeProperty('--partner-bubble-left');
    coach.style.removeProperty('--partner-bubble-top');
    showPartnerPracticeCoach();
    return;
  }
  coach.classList.add('is-bubble');
  coach.classList.toggle('is-actions-hidden', !showActions);
  requestAnimationFrame(function () {
    positionPartnerPracticeBubble(targetRect, preferredSide);
  });
}

function setPartnerPracticeCoachBubble(targetEl, preferredSide, showActions) {
  if (!targetEl || !targetEl.getBoundingClientRect) return;
  setPartnerPracticeCoachBubbleForRect(targetEl.getBoundingClientRect(), preferredSide, showActions);
}

function setPartnerPracticeStartEnabled(on) {
  if (!partnerPracticeState || !partnerPracticeState.coach) return;
  var btn = partnerPracticeState.coach.querySelector('.partner-practice-coach__btn--start');
  if (!btn) return;
  btn.disabled = !on;
  btn.classList.toggle('is-disabled', !on);
}

function clearPartnerPracticeTapToStart() {
  if (!partnerPracticeState) return;
  if (partnerPracticeState.tapPromptEl && partnerPracticeState.tapPromptEl.parentNode) {
    partnerPracticeState.tapPromptEl.parentNode.removeChild(partnerPracticeState.tapPromptEl);
  }
  partnerPracticeState.tapPromptEl = null;
  if (partnerPracticeState.tapStartHandler) {
    try { document.removeEventListener('pointerdown', partnerPracticeState.tapStartHandler, true); } catch (_) {}
  }
  partnerPracticeState.tapStartHandler = null;
  if (partnerPracticeState.tapPromptResizeHandler) {
    try { window.removeEventListener('resize', partnerPracticeState.tapPromptResizeHandler); } catch (_) {}
  }
  partnerPracticeState.tapPromptResizeHandler = null;
  if (partnerPracticeState.tapPromptRaf) {
    try { cancelAnimationFrame(partnerPracticeState.tapPromptRaf); } catch (_) {}
  }
  partnerPracticeState.tapPromptRaf = null;
}

function positionPartnerPracticeTapPrompt() {
  if (!partnerPracticeState || !partnerPracticeState.tapPromptEl || !partnerPracticeState.coach) return;
  var prompt = partnerPracticeState.tapPromptEl;
  var coach = partnerPracticeState.coach;
  if (coach.classList.contains('is-quiet') || coach.classList.contains('is-bubble')) {
    prompt.classList.add('hidden');
    return;
  }
  var rect = coach.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    prompt.classList.add('hidden');
    return;
  }
  var viewportW = window.innerWidth || document.documentElement.clientWidth || 800;
  var viewportH = window.innerHeight || document.documentElement.clientHeight || 600;
  var promptRect = prompt.getBoundingClientRect();
  var promptW = promptRect.width || 190;
  var promptH = promptRect.height || 42;
  var margin = 10;
  var gap = 9;
  var left = Math.max(margin + promptW / 2, Math.min(viewportW - margin - promptW / 2, rect.left + rect.width / 2));
  var top = rect.bottom + gap;
  if (top + promptH > viewportH - margin) top = Math.max(margin, rect.top - promptH - gap);
  prompt.style.left = left.toFixed(1) + 'px';
  prompt.style.top = top.toFixed(1) + 'px';
  prompt.classList.remove('hidden');
}

function schedulePartnerPracticeTapPromptPosition() {
  if (!partnerPracticeState || !partnerPracticeState.tapPromptEl) return;
  if (partnerPracticeState.tapPromptRaf) {
    try { cancelAnimationFrame(partnerPracticeState.tapPromptRaf); } catch (_) {}
  }
  partnerPracticeState.tapPromptRaf = requestAnimationFrame(function () {
    if (!partnerPracticeState) return;
    partnerPracticeState.tapPromptRaf = null;
    positionPartnerPracticeTapPrompt();
  });
}

function showPartnerPracticeTapPrompt() {
  if (!partnerPracticeState || partnerPracticeState.tapPromptEl) return;
  var prompt = document.createElement('div');
  prompt.className = 'partner-practice-tap-prompt hidden';
  prompt.textContent = 'がめんを タップしてね';
  document.body.appendChild(prompt);
  partnerPracticeState.tapPromptEl = prompt;
  partnerPracticeState.tapPromptResizeHandler = schedulePartnerPracticeTapPromptPosition;
  window.addEventListener('resize', partnerPracticeState.tapPromptResizeHandler);
  schedulePartnerPracticeTapPromptPosition();
}

function isPartnerPracticeIntroControl(target) {
  if (!target || !target.closest) return false;
  return !!target.closest(
    '.partner-practice-coach__actions, .partner-practice-coach__btn, ' +
    '#hint-increase-modal, .pono-menu-toggle, .pono-dropdown, .modal-overlay'
  );
}

function startPartnerPracticeDemoFromTap(partnerId) {
  if (!partnerPracticeState || !partnerPracticeState.active) return;
  if (partnerPracticeState.phase !== 'partner-intro-wait') return;
  if (partnerPracticeState.introDemoStarted) return;
  partnerPracticeState.introDemoStarted = true;
  clearPartnerPracticeTapToStart();
  partnerPracticeState.phase = 'partner-demo';
  practiceSetTimeout(function () {
    runPartnerPracticeDemo(partnerId);
  }, PARTNER_PRACTICE_AFTER_TAP_DELAY_MS);
}

function armPartnerPracticeIntroTap(partnerId) {
  if (!partnerPracticeState || !partnerPracticeState.active) return;
  partnerPracticeState.phase = 'partner-intro-wait';
  partnerPracticeState.introPartnerId = partnerId;
  partnerPracticeState.introDemoStarted = false;
  showPartnerPracticeTapPrompt();
  partnerPracticeState.tapStartHandler = function (ev) {
    if (!partnerPracticeState || partnerPracticeState.phase !== 'partner-intro-wait') return;
    if (isPartnerPracticeIntroControl(ev.target)) return;
    startPartnerPracticeDemoFromTap(partnerId);
  };
  document.addEventListener('pointerdown', partnerPracticeState.tapStartHandler, true);
}

function getPieceScreenRect(piece) {
  if (!piece || !puzzleCanvas || !canvasW || !canvasH) return null;
  var rect = puzzleCanvas.getBoundingClientRect();
  var sx = rect.width / canvasW;
  var sy = rect.height / canvasH;
  return {
    left: rect.left + piece.x * sx,
    top: rect.top + piece.y * sy,
    right: rect.left + (piece.x + pieceW) * sx,
    bottom: rect.top + (piece.y + pieceH) * sy,
    width: pieceW * sx,
    height: pieceH * sy,
  };
}

function getPieceHomeScreenRect(piece) {
  if (!piece || !puzzleCanvas || !canvasW || !canvasH) return null;
  var rect = puzzleCanvas.getBoundingClientRect();
  var sx = rect.width / canvasW;
  var sy = rect.height / canvasH;
  return {
    left: rect.left + piece.homeX * sx,
    top: rect.top + piece.homeY * sy,
    right: rect.left + (piece.homeX + pieceW) * sx,
    bottom: rect.top + (piece.homeY + pieceH) * sy,
    width: pieceW * sx,
    height: pieceH * sy,
  };
}

function setPartnerPracticeCoachCopy(titleText, bodyText, eyebrowText) {
  if (!partnerPracticeState || !partnerPracticeState.coach) return;
  var coach = partnerPracticeState.coach;
  var eyebrow = coach.querySelector('.partner-practice-coach__eyebrow');
  var title = coach.querySelector('.partner-practice-coach__title');
  var body = coach.querySelector('.partner-practice-coach__body');
  if (eyebrow && eyebrowText != null) eyebrow.textContent = eyebrowText;
  if (title && titleText) title.textContent = titleText;
  if (body && bodyText != null) body.textContent = bodyText;
}

function getPracticePieces() {
  if (!pieces || !pieces.length) return [];
  return pieces.filter(function (p) { return p && !p.snapped; });
}

function getCurrentPieceRef(piece) {
  if (!piece || !pieces || !pieces.length) return null;
  if (pieces.indexOf(piece) >= 0) return piece;
  return pieces.find(function (p) {
    return p && p.row === piece.row && p.col === piece.col && !p.snapped;
  }) || null;
}

function scoreBasicPracticePieceImage(piece) {
  if (!piece || !sourceImg || !boardW || !boardH) return -1;
  try {
    var naturalW = sourceImg.naturalWidth || sourceImg.width || 0;
    var naturalH = sourceImg.naturalHeight || sourceImg.height || 0;
    if (!naturalW || !naturalH) return -1;
    var sx = Math.max(0, Math.floor((piece.homeX - boardX) / boardW * naturalW));
    var sy = Math.max(0, Math.floor((piece.homeY - boardY) / boardH * naturalH));
    var sw = Math.max(1, Math.ceil(pieceW / boardW * naturalW));
    var sh = Math.max(1, Math.ceil(pieceH / boardH * naturalH));
    if (sx + sw > naturalW) sw = naturalW - sx;
    if (sy + sh > naturalH) sh = naturalH - sy;
    if (sw <= 0 || sh <= 0) return -1;
    var sampleSize = 20;
    var canvas = scoreBasicPracticePieceImage._canvas;
    if (!canvas) {
      canvas = document.createElement('canvas');
      scoreBasicPracticePieceImage._canvas = canvas;
    }
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return -1;
    ctx.clearRect(0, 0, sampleSize, sampleSize);
    ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, sampleSize, sampleSize);
    var data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
    var count = 0;
    var sumR = 0;
    var sumG = 0;
    var sumB = 0;
    var sumSat = 0;
    var lumas = [];
    for (var i = 0; i < data.length; i += 4) {
      var a = data[i + 3];
      if (a < 16) continue;
      var r = data[i];
      var g = data[i + 1];
      var b = data[i + 2];
      var max = Math.max(r, g, b);
      var min = Math.min(r, g, b);
      var sat = max ? (max - min) / max : 0;
      var luma = r * 0.299 + g * 0.587 + b * 0.114;
      sumR += r;
      sumG += g;
      sumB += b;
      sumSat += sat;
      lumas.push(luma);
      count++;
    }
    if (!count) return -1;
    var meanLuma = lumas.reduce(function (acc, n) { return acc + n; }, 0) / count;
    var variance = lumas.reduce(function (acc, n) {
      var d = n - meanLuma;
      return acc + d * d;
    }, 0) / count;
    var avgSat = sumSat / count;
    var avgR = sumR / count;
    var avgG = sumG / count;
    var avgB = sumB / count;
    var colorDistance = Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB);
    var centerBias = 1 - Math.min(1, Math.hypot(
      (piece.col + 0.5) / Math.max(1, stageCols) - 0.5,
      (piece.row + 0.5) / Math.max(1, stageRows) - 0.5
    ));
    return variance * 0.7 + avgSat * 90 + colorDistance * 0.22 + centerBias * 18;
  } catch (_) {
    return -1;
  }
}

function getBasicPracticeAnchorPiece() {
  var list = getPracticePieces();
  if (!list.length) return null;
  var best = null;
  var bestScore = -Infinity;
  list.forEach(function (piece) {
    var score = scoreBasicPracticePieceImage(piece);
    if (score > bestScore) {
      bestScore = score;
      best = piece;
    }
  });
  if (best && bestScore > 18) {
    var oneUp = list.find(function (piece) {
      return piece && !piece.snapped && piece.col === best.col && piece.row === best.row - 1;
    });
    if (oneUp) return oneUp;
    return best;
  }
  return list.find(function (piece) {
    return piece && piece.row === 1 && piece.col === 1 && !piece.snapped;
  }) || list.find(function (piece) {
    return piece && piece.row >= 1 && piece.col >= 1 && !piece.snapped;
  }) || list[0] || null;
}

function getPracticeSafePadX() {
  return Math.max(14, Math.min(pieceW * 0.34, canvasW * 0.12));
}

function getPracticeSafePadY() {
  return Math.max(14, Math.min(pieceH * 0.34, canvasH * 0.12));
}

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function placePieceForPractice(piece, x, y, rotation) {
  if (!piece) return;
  if (partnerPracticeState && partnerPracticeState.mode === 'basic') {
    var safe = clampPracticePiecePos(x, y);
    piece.x = safe.x;
    piece.y = safe.y;
  } else {
    piece.x = Math.max(0, Math.min(canvasW - pieceW, x));
    piece.y = Math.max(0, Math.min(canvasH - pieceH, y));
  }
  piece.rotation = rotation || 0;
  piece.snapped = false;
  var maxZ = pieces && pieces.length
    ? Math.max.apply(null, pieces.map(function (p) { return p && p.zOrder ? p.zOrder : 0; }))
    : 0;
  piece.zOrder = Math.max(1, maxZ) + 20;
  rebuildPath(piece);
}

function placeBasicPracticeBoardPattern() {
  if (!pieces || !pieces.length) return;
  var padX = getPracticeSafePadX();
  var padY = getPracticeSafePadY();
  var maxX = Math.max(padX, canvasW - pieceW - padX);
  var maxY = Math.max(padY, canvasH - pieceH - padY);
  var gapX = Math.max(10, pieceW * 0.16);
  var gapY = Math.max(10, pieceH * 0.16);
  var leftX = clampValue(boardX - pieceW - gapX, padX, maxX);
  var rightX = clampValue(boardX + boardW + gapX, padX, maxX);
  var topY = clampValue(boardY + gapY, padY, maxY);
  var midY = clampValue(boardY + boardH * 0.50 - pieceH / 2, padY, maxY);
  var lowY = clampValue(boardY + boardH - pieceH - gapY, padY, maxY);
  var upperY = clampValue(boardY - pieceH - gapY, padY, maxY);
  var lowerY = clampValue(boardY + boardH + gapY, padY, maxY);
  var topX1 = clampValue(boardX + boardW * 0.12, padX, maxX);
  var topX2 = clampValue(boardX + boardW * 0.42, padX, maxX);
  var topX3 = clampValue(boardX + boardW * 0.72, padX, maxX);
  var lowX1 = clampValue(boardX + boardW * 0.08, padX, maxX);
  var lowX2 = clampValue(boardX + boardW * 0.38, padX, maxX);
  var lowX3 = clampValue(boardX + boardW * 0.68, padX, maxX);
  var candidates = [
    { x: leftX, y: topY },
    { x: rightX, y: topY },
    { x: leftX, y: lowY },
    { x: rightX, y: lowY },
    { x: leftX, y: midY },
    { x: rightX, y: midY },
    { x: topX1, y: upperY },
    { x: topX2, y: upperY },
    { x: topX3, y: upperY },
    { x: lowX1, y: lowerY },
    { x: lowX2, y: lowerY },
    { x: lowX3, y: lowerY },
  ];
  var anchor = getBasicPracticeAnchorPiece();
  var ordered = [];
  if (anchor) ordered.push(anchor);
  pieces.forEach(function (piece) {
    if (piece && piece !== anchor) ordered.push(piece);
  });
  ordered.forEach(function (piece, i) {
    var pos = candidates[i % candidates.length];
    piece.snapped = false;
    piece.rotation = 0;
    piece.x = pos.x;
    piece.y = pos.y;
    piece.zOrder = i;
    rebuildPath(piece);
  });
  snappedCount = 0;
  updateProgress();
  redraw();
}

function resetPracticeBoard() {
  setSelectedPieceForHint(null);
  hintFlashPiece = null;
  hintFlashUntil = 0;
  stageHintUsesActual = 0;
  dragPiece = null;
  if (btnHint) btnHint.classList.remove('partner-practice-count-demo', 'is-count-pop');
  hideBasicPracticeHand();
  if (partnerPracticeState) {
    partnerPracticeState.phase = 'reset';
    partnerPracticeState.targetPiece = null;
    partnerPracticeState.cue = null;
    partnerPracticeState.allowCanvasInput = false;
    partnerPracticeState.hintIntroDone = false;
  }
  document.body.classList.remove('partner-practice-hint-on');
  document.body.classList.remove('partner-practice-peek-on');
  if (puzzleContainer) puzzleContainer.classList.remove('partner-practice-input-on');
  clearPracticeHighlights();
  if (partnerPracticeState && partnerPracticeState.mode === 'basic') {
    placeBasicPracticeBoardPattern();
  } else {
    shufflePieces();
  }
  if (partnerPracticeState && partnerPracticeState.partnerId === 'risu') {
    activeChallenge.started = false;
    activeChallenge.expired = false;
    stopChallengeTimer();
    hideChallengeStatus();
  }
  if (partnerPracticeState && partnerPracticeState.partnerId === 'harinezumi') {
    try {
      var sid = getCurrentStageIdForHint();
      setHintUsesRemaining(sid, Math.min(1, computeHintInitialUses(sid)));
      refreshHintButtonState();
    } catch (_) {}
  }
}

function replayPartnerPracticeDemo() {
  if (!partnerPracticeState || !partnerPracticeState.active) return;
  clearPartnerPracticeTimers();
  resetPracticeBoard();
  startPartnerPracticeFlow(partnerPracticeState.partnerId);
}

function setPartnerPracticeInput(on) {
  if (!partnerPracticeState) return;
  partnerPracticeState.allowCanvasInput = !!on;
  document.body.classList.toggle('partner-practice-hint-on', !!on);
  if (puzzleContainer) puzzleContainer.classList.toggle('partner-practice-input-on', !!on);
}

function setPartnerPracticePeekInput(on) {
  document.body.classList.toggle('partner-practice-peek-on', !!on);
}

function pickHintPracticePiece() {
  var list = getPracticePieces();
  if (!list.length) return null;
  return list.find(function (piece) {
    return piece && piece.row >= 1 && piece.col >= 1 && !piece.snapped;
  }) || list[Math.min(2, list.length - 1)];
}

function placeHintPracticePiece(piece) {
  if (!piece) return;
  var x = Math.max(10, Math.min(canvasW - pieceW - 10, boardX - pieceW * 1.05));
  var y = Math.max(10, Math.min(canvasH - pieceH - 10, boardY - pieceH * 0.35));
  placePieceForPractice(piece, x, y, 0);
}

function makePieceRect(x, y, marginX, marginY) {
  var mx = marginX || 0;
  var my = marginY == null ? mx : marginY;
  return {
    left: x - mx,
    top: y - my,
    right: x + pieceW + mx,
    bottom: y + pieceH + my,
  };
}

function pieceRect(piece, marginX, marginY) {
  return makePieceRect(piece.x, piece.y, marginX, marginY);
}

function rectsOverlap(a, b) {
  return !!(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
}

function pointInPracticeRect(x, y, rect) {
  return !!(rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
}

function clampPracticePiecePos(x, y) {
  var padX = getPracticeSafePadX();
  var padY = getPracticeSafePadY();
  return {
    x: clampValue(x, padX, Math.max(padX, canvasW - pieceW - padX)),
    y: clampValue(y, padY, Math.max(padY, canvasH - pieceH - padY)),
  };
}

function isHintPracticePosClear(pos, avoidRect, placed, zones) {
  if (!pos) return false;
  var rect = makePieceRect(pos.x, pos.y, 0, 0);
  if (rectsOverlap(rect, avoidRect)) return false;
  var cx = pos.x + pieceW / 2;
  var cy = pos.y + pieceH / 2;
  if (cx > zones.bx0 && cx < zones.bx1 && cy > zones.by0 && cy < zones.by1) return false;
  for (var i = 0; i < placed.length; i++) {
    if (Math.hypot(pos.x - placed[i].x, pos.y - placed[i].y) < Math.max(pieceW, pieceH) * 0.72) {
      return false;
    }
  }
  return true;
}

function findHintPracticeAwayPos(avoidRect, placed) {
  var zones = computePlacementZones();
  var pad = zones.pad;
  var rightX = Math.max(zones.bx1 + pieceW * 0.35, canvasW - pieceW - pad);
  var leftX = pad;
  var topY = pad;
  var midY = Math.max(pad, Math.min(canvasH - pieceH - pad, boardY + boardH * 0.46));
  var lowY = Math.max(pad, Math.min(canvasH - pieceH - pad, canvasH - pieceH - pad));
  var candidates = [
    clampPracticePiecePos(rightX, topY),
    clampPracticePiecePos(rightX, midY),
    clampPracticePiecePos(rightX, lowY),
    clampPracticePiecePos(leftX, lowY),
    clampPracticePiecePos(boardX + boardW * 0.35, pad),
    clampPracticePiecePos(boardX + boardW * 0.55, lowY),
  ];
  for (var i = 0; i < candidates.length; i++) {
    if (isHintPracticePosClear(candidates[i], avoidRect, placed, zones)) return candidates[i];
  }

  if (partnerPracticeState && partnerPracticeState.mode === 'basic') {
    return clampPracticePiecePos(canvasW - pieceW - pad, canvasH - pieceH - pad);
  }

  var best = null;
  var bestScore = -Infinity;
  for (var attempt = 0; attempt < 72; attempt++) {
    var pos = placePieceInZone(zones, pieceW, pieceH, placed);
    if (!isHintPracticePosClear(pos, avoidRect, placed, zones)) continue;
    var nearest = Infinity;
    for (var j = 0; j < placed.length; j++) {
      var d = Math.hypot(pos.x - placed[j].x, pos.y - placed[j].y);
      if (d < nearest) nearest = d;
    }
    var score = nearest + Math.hypot(
      pos.x + pieceW / 2 - (avoidRect.left + avoidRect.right) / 2,
      pos.y + pieceH / 2 - (avoidRect.top + avoidRect.bottom) / 2
    ) * 0.18;
    if (score > bestScore) {
      bestScore = score;
      best = pos;
    }
  }
  return best || clampPracticePiecePos(canvasW - pieceW - pad, canvasH - pieceH - pad);
}

function clearHintPracticeTargetArea(targetPiece) {
  if (!targetPiece || !pieces || !pieces.length) return;
  var avoidRect = pieceRect(targetPiece, Math.max(24, pieceW * 0.55), Math.max(18, pieceH * 0.42));
  var placed = [{ x: targetPiece.x, y: targetPiece.y }];
  for (var i = 0; i < pieces.length; i++) {
    var p = pieces[i];
    if (!p || p === targetPiece || p.snapped) continue;
    if (!rectsOverlap(pieceRect(p, 0, 0), avoidRect)) placed.push({ x: p.x, y: p.y });
  }
  for (var j = 0; j < pieces.length; j++) {
    var piece = pieces[j];
    if (!piece || piece === targetPiece || piece.snapped) continue;
    if (!rectsOverlap(pieceRect(piece, 0, 0), avoidRect)) continue;
    var pos = findHintPracticeAwayPos(avoidRect, placed);
    piece.x = pos.x;
    piece.y = pos.y;
    piece.rotation = piece.rotation || 0;
    rebuildPath(piece);
    placed.push({ x: piece.x, y: piece.y });
  }
  rebuildPath(targetPiece);
}

function runBasicButtonHandDemo(targetEl, options, onDone) {
  if (!partnerPracticeState || !targetEl || !targetEl.getBoundingClientRect) {
    if (typeof onDone === 'function') onDone();
    return;
  }
  options = options || {};
  var rect = targetEl.getBoundingClientRect();
  var target = {
    x: rect.left + rect.width * 0.58,
    y: rect.top + rect.height * 0.52,
  };
  var start = {
    x: Math.min((window.innerWidth || 800) - 28, rect.right + Math.max(72, rect.width * 0.82)),
    y: target.y + Math.max(16, rect.height * 0.22),
  };
  var size = getBasicHandSizeForRect(rect, options.sizeScale || 1.28);
  setBasicPracticeHand(start, 'point', { size: size, scale: 1 });
  animateBasicPracticeHand(start, target, options.moveMs || BASIC_HAND_DEMO_MOVE_MS, 'point', { size: size }, null, function () {
    if (!partnerPracticeState || !partnerPracticeState.active) return;
    targetEl.classList.add('partner-practice-demo-pressed');
    setBasicPracticeHand(target, 'point', { size: size, pressing: true, scale: 0.94 });
    if (typeof options.onPress === 'function') options.onPress();
    practiceSetTimeout(function () {
      if (!partnerPracticeState || !partnerPracticeState.active) return;
      if (typeof options.onRelease === 'function') options.onRelease();
      targetEl.classList.remove('partner-practice-demo-pressed');
      setBasicPracticeHand(target, 'point', { size: size, scale: 1 });
      practiceSetTimeout(function () {
        hideBasicPracticeHand();
        if (typeof onDone === 'function') onDone();
      }, options.afterMs || BASIC_HAND_DEMO_AFTER_MS);
    }, options.holdMs || BASIC_HAND_DEMO_HOLD_MS);
  });
}

function runBasicPieceTapHandDemo(piece, onDone) {
  if (!partnerPracticeState || !piece) {
    if (typeof onDone === 'function') onDone();
    return;
  }
  var rect = getPieceScreenRect(piece);
  var target = practiceRectCenter(rect);
  if (!rect || !target) {
    if (typeof onDone === 'function') onDone();
    return;
  }
  var start = {
    x: Math.min((window.innerWidth || 800) - 36, rect.right + Math.max(54, rect.width * 0.8)),
    y: target.y + Math.max(12, rect.height * 0.18),
  };
  var size = getBasicHandSizeForRect(rect, 1.28);
  setBasicPracticeHand(start, 'point', { size: size });
  animateBasicPracticeHand(start, target, BASIC_HAND_DEMO_MOVE_MS, 'point', { size: size }, null, function () {
    if (!partnerPracticeState || !partnerPracticeState.active) return;
    setBasicPracticeHand(target, 'point', { size: size, pressing: true, scale: 0.94 });
    practiceSetTimeout(function () {
      if (!partnerPracticeState || !partnerPracticeState.active) return;
      setBasicPracticeHand(target, 'point', { size: size, scale: 1 });
      practiceSetTimeout(function () {
        hideBasicPracticeHand();
        if (typeof onDone === 'function') onDone();
      }, BASIC_HAND_DEMO_AFTER_MS);
    }, BASIC_HAND_DEMO_HOLD_MS);
  });
}

function runBasicDragHandDemo(piece, from, to, onDone) {
  if (!partnerPracticeState || !piece || !from || !to) {
    if (typeof onDone === 'function') onDone();
    return;
  }
  var rect = getPieceScreenRect(piece);
  var start = getPieceScreenCenter(piece, false);
  var target = getPieceScreenCenter(piece, true);
  if (!rect || !start) {
    if (typeof onDone === 'function') onDone();
    return;
  }
  var size = getBasicHandSizeForRect(rect, 1.2);
  setBasicPracticeHand(start, 'open', { size: size });
  practiceSetTimeout(function () {
    if (!partnerPracticeState || !partnerPracticeState.active) return;
    var grabPoint = getPieceScreenCenter(piece, false) || start;
    setBasicPracticeHand(grabPoint, 'grab', { size: size, pressing: true, scale: 0.98 });
    practiceSetTimeout(function () {
      if (!partnerPracticeState || !partnerPracticeState.active) return;
      setBasicPracticeHand(grabPoint, 'grip', { size: size, pressing: true, scale: 0.94 });
      animateBasicPracticeHand(start, target || start, BASIC_DRAG_DEMO_DURATION_MS, 'grip', {
        size: size,
        pressing: true,
        scale: 0.94,
      }, function (ease) {
        if (!partnerPracticeState || !partnerPracticeState.active) return;
        partnerPracticeState.loopCueGhost = {
          piece: piece,
          x: from.x + (to.x - from.x) * ease,
          y: from.y + (to.y - from.y) * ease,
          rotation: (from.rotation || 0) + ((to.rotation || 0) - (from.rotation || 0)) * ease,
          alpha: 0.34,
        };
        redraw();
      }, function () {
        if (!partnerPracticeState || !partnerPracticeState.active) return;
        var releasePoint = target || getPieceScreenCenter(piece, true) || grabPoint;
        setBasicPracticeHand(releasePoint, 'release', { size: size, scale: 1 });
        practiceSetTimeout(function () {
          if (partnerPracticeState) partnerPracticeState.loopCueGhost = null;
          redraw();
          hideBasicPracticeHand();
          if (typeof onDone === 'function') onDone();
        }, BASIC_HAND_DEMO_AFTER_MS);
      });
    }, 220);
  }, 260);
}

function runBasicHintPlaceHandDemo(piece, onDone) {
  if (!partnerPracticeState || !piece || !btnHint) {
    if (typeof onDone === 'function') onDone();
    return;
  }
  var from = { x: piece.x, y: piece.y, rotation: piece.rotation || 0 };
  var to = { x: piece.homeX, y: piece.homeY, rotation: 0 };
  setSelectedPieceForHint(null);
  clearPracticeHighlights();
  clearHintGlow();
  partnerPracticeState.phase = 'basic-hint-demo-select';
  partnerPracticeState.targetPiece = piece;
  partnerPracticeState.cue = { kind: 'tap-piece', piece: piece };
  partnerPracticeState.hintPressReady = false;
  partnerPracticeState.hintActivatedByButton = false;
  setPartnerPracticeInput(false);
  setPartnerPracticePeekInput(false);
  setBasicPracticeModeBanner('demo', 'おてほんをみてね');
  setPartnerPracticeCoachCopy(
    'まず みてね',
    '場所を 知りたい ピースを 選ぶよ',
    ''
  );
  setPartnerPracticeCoachBubbleForRect(getPieceScreenRect(piece), 'above', false);
  refreshHintButtonState();
  redraw();

  playBasicPracticeVoice(6, function () {
    if (!partnerPracticeState || partnerPracticeState.phase !== 'basic-hint-demo-select') return;
    runBasicPieceTapHandDemo(piece, function () {
      if (!partnerPracticeState || partnerPracticeState.phase !== 'basic-hint-demo-select') return;
      setSelectedPieceForHint(piece);
      partnerPracticeState.phase = 'basic-hint-demo-button';
      partnerPracticeState.cue = { kind: 'selected-piece', piece: piece };
      practiceAddHighlight(btnHint);
      setPartnerPracticeCoachCopy(
        'まず みてね',
        '次は「ヒント」を 押すよ',
        ''
      );
      setPartnerPracticeCoachBubble(btnHint, null, false);
      refreshHintButtonState();
      redraw();
      runBasicButtonHandDemo(btnHint, {
        moveMs: 920,
        holdMs: 900,
        afterMs: 520,
        onPress: function () {
          showHintGlowForPiece(piece, BASIC_HINT_DEMO_GLOW_MS);
        },
      }, function () {
        if (!partnerPracticeState || partnerPracticeState.phase !== 'basic-hint-demo-button') return;
        clearPracticeHighlights();
        partnerPracticeState.phase = 'basic-hint-demo-place';
        partnerPracticeState.cue = { kind: 'kojika-move-target', piece: piece };
        setPartnerPracticeCoachCopy(
          'まず みてね',
          '光った場所へ 持っていくよ',
          ''
        );
        setPartnerPracticeCoachBubbleForRect(getPieceHomeScreenRect(piece), 'left', false);
        showHintGlowForPiece(piece, BASIC_HINT_DEMO_GLOW_MS);
        runBasicDragHandDemo(piece, from, to, function () {
          if (!partnerPracticeState || partnerPracticeState.phase !== 'basic-hint-demo-place') return;
          placePieceForPractice(piece, from.x, from.y, from.rotation || 0);
          setSelectedPieceForHint(null);
          clearHintGlow();
          partnerPracticeState.cue = { kind: 'tap-piece', piece: piece };
          if (typeof onDone === 'function') onDone();
        });
      });
    });
  });
}

function pickBasicDragPracticePiece() {
  return getBasicPracticeAnchorPiece();
}

function startBasicDragPractice() {
  if (!partnerPracticeState) return;
  clearPartnerPracticeTimers();
  clearPracticeHighlights();
  setSelectedPieceForHint(null);
  hintFlashPiece = null;
  hintFlashUntil = 0;
  dragPiece = null;
  if (peekOn) setPeekOverlay(false);
  setPartnerPracticeInput(false);
  setPartnerPracticePeekInput(false);
  partnerPracticeState.phase = 'basic-drag-demo';
  partnerPracticeState.cue = null;
  partnerPracticeState.hintSelectReady = false;
  partnerPracticeState.hintPressReady = false;
  partnerPracticeState.hintActivatedByButton = false;
  var currentTarget = getCurrentPieceRef(partnerPracticeState.targetPiece);
  var piece = (currentTarget && !currentTarget.snapped)
    ? currentTarget
    : pickBasicDragPracticePiece();
  if (!piece) {
    startBasicPeekPractice();
    return;
  }
  var canReuseStart = currentTarget && currentTarget === partnerPracticeState.targetPiece;
  var start = (canReuseStart && partnerPracticeState.basicDragStart) || {
    x: piece.x,
    y: piece.y,
    rotation: piece.rotation || 0,
  };
  var to = { x: piece.homeX, y: piece.homeY, rotation: 0 };
  partnerPracticeState.targetPiece = piece;
  partnerPracticeState.basicDragStart = { x: start.x, y: start.y, rotation: start.rotation || 0 };
  placePieceForPractice(piece, start.x, start.y, start.rotation || 0);
  partnerPracticeState.cue = null;
  setBasicPracticeFrameMode('demo');
  clearPartnerPracticeCoachBubble();
  showPartnerPracticeCoach();
  if (partnerPracticeState.coach) partnerPracticeState.coach.classList.add('is-actions-hidden');
  setPartnerPracticeCoachCopy(
    'まず みてね',
    'このピースを つかんで 青い場所へ',
    ''
  );
  setPartnerPracticeCoachBubbleForRect(getPieceScreenRect(piece), 'above', false);
  redraw();

  // Start the voice FIRST after a short settle delay, then anchor the orange/blue
  // cues to the audio element's REAL playback start (scheduleBasicDragCuesOnVoice)
  // so they align with the spoken phrases (このピースをつかんで → orange,
  // 青い場所へ → blue) even when play() is delayed. Cue is null at phase entry so
  // the orange target doesn't appear at t=0 anymore.
  practiceSetTimeout(function () {
    if (!partnerPracticeState || partnerPracticeState.phase !== 'basic-drag-demo') return;
    if (partnerPracticeState.targetPiece !== piece) return;
    // Start the voice first, then anchor the orange/blue cues to the audio
    // element's real playback start (with a wall-clock fallback) so they line up
    // with the spoken 「このピースをつかんで」 / 「青い場所へ」 even if play() is
    // delayed by network / decode / autoplay gating.
    var demoAudio = playBasicPracticeVoice(1, function () {
      if (!partnerPracticeState || partnerPracticeState.phase !== 'basic-drag-demo') return;
      runBasicDragHandDemo(piece, { x: start.x, y: start.y, rotation: 0 }, to, function () {
        if (!partnerPracticeState || partnerPracticeState.phase !== 'basic-drag-demo') return;
        placePieceForPractice(piece, start.x, start.y, 0);
        clearHintPracticeTargetArea(piece);
        partnerPracticeState.phase = 'basic-drag-try';
        // Cue starts null for the try phase too; orange/blue come in with voice.
        partnerPracticeState.cue = null;
        setPartnerPracticeInput(false);
        setBasicPracticeModeBanner('try', 'やってみよう', BASIC_TRY_BANNER_MS);
        setPartnerPracticeCoachCopy(
          'やってみよう',
          'ピースを 持って、青い場所へ',
          ''
        );
        setPartnerPracticeCoachBubbleForRect(getPieceScreenRect(piece), 'above', false);
        redraw();
        // Start the try voice (basic_tut_03), then anchor the orange/blue cues to
        // its real playback start so 「このピースをつかんで」/「青い場所へ」 stay in
        // sync even if play() is delayed (wall-clock fallback inside the helper).
        var tryAudio = playBasicPracticeVoice(2, function () {
          if (!partnerPracticeState || partnerPracticeState.phase !== 'basic-drag-try') return;
          setPartnerPracticeInput(true);
          redraw();
          armBasicDragLoopCue(piece, 'basic-drag-try');
        });
        scheduleBasicDragCuesOnVoice({
          audio: tryAudio,
          phase: 'basic-drag-try',
          piece: piece,
          orangeMs: BASIC_DRAG_TRY_ORANGE_AT_VOICE_MS,
          blueMs: BASIC_DRAG_TRY_BLUE_AT_VOICE_MS,
        });
      });
    });
    scheduleBasicDragCuesOnVoice({
      audio: demoAudio,
      phase: 'basic-drag-demo',
      piece: piece,
      orangeMs: BASIC_DRAG_DEMO_ORANGE_AT_VOICE_MS,
      blueMs: BASIC_DRAG_DEMO_BLUE_AT_VOICE_MS,
    });
  }, BASIC_DRAG_NA_START_DELAY_MS);
}

function isBasicDragPracticePhase() {
  return !!(partnerPracticeState
    && partnerPracticeState.mode === 'basic'
    && (partnerPracticeState.phase === 'basic-drag-try'
      || partnerPracticeState.phase === 'basic-drag-moving'));
}

function isBasicHintDragPracticePhase() {
  return !!(partnerPracticeState
    && partnerPracticeState.mode === 'basic'
    && (partnerPracticeState.phase === 'basic-hint-drag-try'
      || partnerPracticeState.phase === 'basic-hint-drag-moving'));
}

function getBasicDragPracticeHitPiece(x, y) {
  if (!isBasicDragPracticePhase() && !isBasicHintDragPracticePhase()) return null;
  var piece = partnerPracticeState.targetPiece;
  if (!piece || piece.snapped) return null;
  var padX = Math.max(24, Math.min(52, pieceW * 0.42));
  var padY = Math.max(24, Math.min(52, pieceH * 0.42));
  return pointInPracticeRect(x, y, pieceRect(piece, padX, padY)) ? piece : null;
}

function isBasicDragPracticeNearHome(piece) {
  if (!piece) return false;
  return Math.hypot(piece.x - piece.homeX, piece.y - piece.homeY) <= Math.max(SNAP_DIST * 1.45, pieceW * 0.52);
}

function onBasicDragPracticeDragStart(piece) {
  if (!isBasicDragPracticePhase()) return;
  if (!piece || piece !== partnerPracticeState.targetPiece) return;
  partnerPracticeState.phase = 'basic-drag-moving';
  partnerPracticeState.cue = { kind: 'kojika-move-target', piece: piece };
  setPartnerPracticeCoachCopy(
    'そのまま うごかそう',
    '青い場所へ 持っていってね',
    ''
  );
  setPartnerPracticeCoachBubbleForRect(getPieceHomeScreenRect(piece), 'left', false);
}

function updateBasicDragPracticeDrag(piece) {
  if (!isBasicDragPracticePhase()) return;
  if (!piece || piece !== partnerPracticeState.targetPiece || piece.snapped) return;
  partnerPracticeState.cue = {
    kind: isBasicDragPracticeNearHome(piece) ? 'kojika-glow' : 'kojika-move-target',
    piece: piece,
  };
}

function onBasicDragPracticePieceDropped(piece, didSnap) {
  if (!isBasicDragPracticePhase()) return;
  if (!piece || piece !== partnerPracticeState.targetPiece) return;
  if (!didSnap && !piece.snapped && isBasicDragPracticeNearHome(piece)
      && typeof window.PonoPuzzleForceSnapPiece === 'function') {
    didSnap = window.PonoPuzzleForceSnapPiece(piece);
  }
  if (didSnap || piece.snapped) {
    partnerPracticeState.phase = 'basic-drag-done';
    partnerPracticeState.cue = null;
    setPartnerPracticeInput(false);
    setBasicPracticeModeBanner('done', 'できたね！');
    setPartnerPracticeCoachCopy(
      'できたね',
      '次は「見る」ボタンを 試すよ',
      ''
    );
    setPartnerPracticeCoachBubbleForRect(getPieceHomeScreenRect(piece) || getPieceScreenRect(piece), 'below', false);
    redraw();
    playBasicPracticeVoice(3, function () {
      if (!partnerPracticeState || partnerPracticeState.phase !== 'basic-drag-done') return;
      startBasicPeekPractice();
    }, Math.max(BASIC_AFTER_DRAG_SUCCESS_MS, 3000));
    return;
  }
  partnerPracticeState.phase = 'basic-drag-try';
  partnerPracticeState.cue = { kind: 'kojika-move-target', piece: piece };
  setBasicPracticeModeBanner('try', 'やってみよう！');
  setPartnerPracticeCoachCopy(
    'もういちど',
    '青い場所に 近づけて 離そう',
    ''
  );
  setPartnerPracticeCoachBubbleForRect(getPieceHomeScreenRect(piece), 'left', false);
  redraw();
  armBasicDragLoopCue(piece, 'basic-drag-try');
}

function startBasicHintPlaceTry(piece) {
  if (!partnerPracticeState || partnerPracticeState.mode !== 'basic') return;
  if (!piece || piece.snapped) return;
  clearPracticeHighlights();
  clearBasicPracticeHand();
  clearHintGlow();
  setSelectedPieceForHint(null);
  partnerPracticeState.phase = 'basic-hint-select-try';
  partnerPracticeState.targetPiece = piece;
  partnerPracticeState.cue = { kind: 'tap-piece', piece: piece };
  partnerPracticeState.hintSelectReady = true;
  partnerPracticeState.hintPressReady = false;
  partnerPracticeState.hintActivatedByButton = false;
  setPartnerPracticeInput(true);
  setPartnerPracticePeekInput(false);
  setBasicPracticeModeBanner('try', 'やってみよう！');
  showPartnerPracticeCoach();
  setPartnerPracticeCoachCopy(
    'やってみよう',
    '場所を 知りたい ピースを 選んでね',
    ''
  );
  setPartnerPracticeCoachBubbleForRect(getPieceScreenRect(piece), 'above', false);
  refreshHintButtonState();
  redraw();
}

function isBasicHintSelectPracticePhase() {
  return !!(partnerPracticeState
    && partnerPracticeState.mode === 'basic'
    && partnerPracticeState.phase === 'basic-hint-select-try');
}

function isBasicHintPressPracticePhase() {
  return !!(partnerPracticeState
    && partnerPracticeState.mode === 'basic'
    && partnerPracticeState.phase === 'basic-hint-press-try');
}

function onBasicHintSelectPracticePointerDown(piece) {
  if (!isBasicHintSelectPracticePhase()) return false;
  var targetPiece = partnerPracticeState.targetPiece;
  if (!targetPiece || targetPiece.snapped) return true;
  if (!piece || piece !== targetPiece) {
    partnerPracticeState.cue = { kind: 'tap-piece', piece: targetPiece };
    setPartnerPracticeCoachCopy(
      piece ? 'このピースだよ' : 'ピースを 選んでね',
      '場所を 知りたい ピースを タッチ',
      ''
    );
    setPartnerPracticeCoachBubbleForRect(getPieceScreenRect(targetPiece), 'above', false);
    redraw();
    return true;
  }

  setSelectedPieceForHint(piece);
  partnerPracticeState.phase = 'basic-hint-press-try';
  partnerPracticeState.cue = { kind: 'selected-piece', piece: piece };
  partnerPracticeState.hintSelectReady = false;
  partnerPracticeState.hintPressReady = true;
  partnerPracticeState.hintActivatedByButton = false;
  setPartnerPracticeInput(true);
  clearPracticeHighlights();
  practiceAddHighlight(btnHint);
  setPartnerPracticeCoachCopy(
    '次は「ヒント」',
    '「ヒント」を 押してみよう',
    ''
  );
  setPartnerPracticeCoachBubble(btnHint, null, false);
  refreshHintButtonState();
  redraw();
  return true;
}

function onBasicHintPracticeHintButtonUsed() {
  if (!partnerPracticeState || partnerPracticeState.phase !== 'basic-hint-press-try') return false;
  var piece = selectedPieceForHint || partnerPracticeState.targetPiece;
  if (!piece || piece.snapped) return false;
  clearPracticeHighlights();
  partnerPracticeState.phase = 'basic-hint-drag-try';
  partnerPracticeState.targetPiece = piece;
  partnerPracticeState.cue = { kind: 'kojika-move-target', piece: piece };
  partnerPracticeState.hintPressReady = false;
  partnerPracticeState.hintActivatedByButton = false;
  setPartnerPracticeInput(true);
  setPartnerPracticePeekInput(false);
  setBasicPracticeModeBanner('try', 'やってみよう！');
  showHintGlowForPiece(piece, BASIC_HINT_TRY_GLOW_MS);
  showPartnerPracticeCoach();
  setPartnerPracticeCoachCopy(
    'やってみよう',
    'ピースを 持って、光った場所へ',
    ''
  );
  setPartnerPracticeCoachBubbleForRect(getPieceScreenRect(piece), 'above', false);
  refreshHintButtonState();
  redraw();
  armBasicDragLoopCue(piece, 'basic-hint-drag-try');
  return true;
}

function onBasicHintDragPracticeDragStart(piece) {
  if (!isBasicHintDragPracticePhase()) return;
  if (!piece || piece !== partnerPracticeState.targetPiece) return;
  partnerPracticeState.phase = 'basic-hint-drag-moving';
  partnerPracticeState.cue = { kind: 'kojika-move-target', piece: piece };
  setPartnerPracticeCoachCopy(
    'そのまま うごかそう',
    '光った場所へ 持っていってね',
    ''
  );
  setPartnerPracticeCoachBubbleForRect(getPieceHomeScreenRect(piece), 'left', false);
}

function updateBasicHintDragPracticeDrag(piece) {
  if (!isBasicHintDragPracticePhase()) return;
  if (!piece || piece !== partnerPracticeState.targetPiece || piece.snapped) return;
  partnerPracticeState.cue = {
    kind: isBasicDragPracticeNearHome(piece) ? 'kojika-glow' : 'kojika-move-target',
    piece: piece,
  };
}

function onBasicHintDragPracticePieceDropped(piece, didSnap) {
  if (!isBasicHintDragPracticePhase()) return;
  if (!piece || piece !== partnerPracticeState.targetPiece) return;
  if (!didSnap && !piece.snapped && isBasicDragPracticeNearHome(piece)
      && typeof window.PonoPuzzleForceSnapPiece === 'function') {
    didSnap = window.PonoPuzzleForceSnapPiece(piece);
  }
  if (didSnap || piece.snapped) {
    clearHintGlow();
    setSelectedPieceForHint(null);
    partnerPracticeState.phase = 'basic-hint-drag-done';
    partnerPracticeState.cue = null;
    setPartnerPracticeInput(false);
    setBasicPracticeModeBanner('done', 'できたね！');
    setPartnerPracticeCoachCopy(
      'できたね',
      'ヒントの場所に 置けたよ',
      ''
    );
    setPartnerPracticeCoachBubbleForRect(getPieceHomeScreenRect(piece) || getPieceScreenRect(piece), 'below', false);
    redraw();
    practiceSetTimeout(function () {
      if (!partnerPracticeState || partnerPracticeState.phase !== 'basic-hint-drag-done') return;
      finishPartnerPractice();
    }, BASIC_AFTER_DRAG_SUCCESS_MS);
    return;
  }
  partnerPracticeState.phase = 'basic-hint-drag-try';
  partnerPracticeState.cue = { kind: 'kojika-move-target', piece: piece };
  showHintGlowForPiece(piece, BASIC_HINT_TRY_GLOW_MS);
  setBasicPracticeModeBanner('try', 'やってみよう！');
  setPartnerPracticeCoachCopy(
    'もういちど',
    '光った場所に 近づけて 離そう',
    ''
  );
  setPartnerPracticeCoachBubbleForRect(getPieceHomeScreenRect(piece), 'left', false);
  redraw();
  armBasicDragLoopCue(piece, 'basic-hint-drag-try');
}

function rearmBasicLoopCueIfWaiting() {
  if (!partnerPracticeState || !partnerPracticeState.targetPiece) return;
  if (partnerPracticeState.phase === 'basic-drag-try') {
    armBasicDragLoopCue(partnerPracticeState.targetPiece, 'basic-drag-try');
    return;
  }
  if (partnerPracticeState.phase === 'basic-hint-drag-try') {
    armBasicDragLoopCue(partnerPracticeState.targetPiece, 'basic-hint-drag-try');
  }
}

function startCommonHintPractice(partnerId) {
  if (!partnerPracticeState) return;
  clearPartnerPracticeTimers();
  clearPracticeHighlights();
  setPartnerPracticePeekInput(false);
  setSelectedPieceForHint(null);
  hintFlashPiece = null;
  hintFlashUntil = 0;
  dragPiece = null;
  var piece = pickHintPracticePiece();
  if (!piece) {
    startPartnerSpecificPractice(partnerId);
    return;
  }
  partnerPracticeState.phase = 'hint-select';
  partnerPracticeState.targetPiece = piece;
  partnerPracticeState.cue = { kind: 'tap-piece', piece: piece };
  partnerPracticeState.hintSelectReady = false;
  partnerPracticeState.hintPressReady = false;
  partnerPracticeState.hintActivatedByButton = false;
  partnerPracticeState.hintSelectCueVisibleAt = 0;
  partnerPracticeState.waitingForHintSelectCueNarration = false;
  partnerPracticeState.hintSelectCueNarrationScheduled = false;
  setPartnerPracticeInput(false);
  placeHintPracticePiece(piece);
  clearHintPracticeTargetArea(piece);
  refreshHintButtonState();
  if (partnerPracticeState.mode === 'basic') {
    setBasicPracticeModeBanner('demo', 'おてほんをみてね');
    clearPartnerPracticeCoachBubble();
    setPartnerPracticeCoachCopy('', '', '');
    hidePartnerPracticeCoach();
    partnerPracticeState.waitingForHintSelectCueNarration = true;
    redraw();
  } else {
    setPartnerPracticeCoachCopy(
      'この ピースを タッチ',
      '',
      ''
    );
    setPartnerPracticeCoachBubbleForRect(getPieceScreenRect(piece), 'right', false);
    redraw();
    partnerPracticeState.hintSelectReady = true;
    setPartnerPracticeInput(true);
  }
}

function startBasicIntroPractice() {
  if (!partnerPracticeState) return;
  clearPartnerPracticeTimers();
  clearPracticeHighlights();
  setSelectedPieceForHint(null);
  hintFlashPiece = null;
  hintFlashUntil = 0;
  dragPiece = null;
  if (btnHint) btnHint.classList.remove('partner-practice-count-demo', 'is-count-pop');
  if (peekOn) setPeekOverlay(false);
  partnerPracticeState.phase = 'basic-intro';
  partnerPracticeState.cue = null;
  partnerPracticeState.peekHoldStart = 0;
  partnerPracticeState.peekHoldReady = false;
  partnerPracticeState.peekReturnNarrationStarted = false;
  partnerPracticeState.peekReturnNarrationDone = false;
  partnerPracticeState.hintSelectReady = false;
  partnerPracticeState.hintPressReady = false;
  partnerPracticeState.hintActivatedByButton = false;
  var firstPiece = pickBasicDragPracticePiece();
  if (firstPiece) {
    partnerPracticeState.targetPiece = firstPiece;
    partnerPracticeState.basicDragStart = {
      x: firstPiece.x,
      y: firstPiece.y,
      rotation: firstPiece.rotation || 0,
    };
    placePieceForPractice(firstPiece, firstPiece.x, firstPiece.y, firstPiece.rotation || 0);
  }
  setPartnerPracticeInput(false);
  setPartnerPracticePeekInput(false);
  if (partnerPracticeState.coach) partnerPracticeState.coach.classList.add('is-actions-hidden');
  setPartnerPracticeCoachCopy(
    'あそびかたを れんしゅうするよ',
    '',
    ''
  );
  clearPartnerPracticeCoachBubble();
  practiceSetTimeout(function () {
    if (!partnerPracticeState || partnerPracticeState.phase !== 'basic-intro') return;
    setBasicPracticeModeBanner('demo', 'おてほんをみてね', BASIC_INTRO_DEMO_BANNER_MS);
  }, BASIC_INTRO_DEMO_BANNER_DELAY_MS);
  playBasicPracticeVoice(0, function () {
    if (!partnerPracticeState || partnerPracticeState.phase !== 'basic-intro') return;
    startBasicDragPractice();
  });
  redraw();
}

function startBasicPeekPractice() {
  if (!partnerPracticeState) return;
  // Invalidate any in-flight basic voice token + queued callbacks BEFORE
  // clearing timers, so the previous voice's synchronous onDone chain (which
  // may have called us) cannot fire a stale callback after we start voice(4).
  clearBasicPracticeVoiceQueue();
  clearPartnerPracticeTimers();
  // Explicitly stop any audio still playing so the new playBasicTut(4) has a
  // clean lifecycle to attach 'ended' to. The deferred play() in voice.js
  // ensures the stop -> play transition is not racy.
  stopPuzzleVoice();
  clearPracticeHighlights();
  setSelectedPieceForHint(null);
  hintFlashPiece = null;
  hintFlashUntil = 0;
  dragPiece = null;
  if (btnHint) btnHint.classList.remove('partner-practice-count-demo', 'is-count-pop');
  if (peekOn) setPeekOverlay(false);
  partnerPracticeState.phase = 'peek-demo';
  partnerPracticeState.cue = null;
  partnerPracticeState.peekHoldStart = 0;
  partnerPracticeState.peekHoldReady = false;
  partnerPracticeState.peekReturnNarrationStarted = false;
  partnerPracticeState.peekReturnNarrationDone = false;
  partnerPracticeState.hintSelectReady = false;
  partnerPracticeState.hintPressReady = false;
  partnerPracticeState.hintActivatedByButton = false;
  setPartnerPracticeInput(false);
  setPartnerPracticePeekInput(false);
  // Use the full fallback duration for basic_tut_05 (~6.8s) so the badge
  // stays visible for the entire intro narration, not just 3s.
  setBasicPracticeModeBanner('demo', 'おてほんをみてね', BASIC_TUT_FALLBACK_MS[4] || 6800);
  clearPartnerPracticeCoachBubble();
  showPartnerPracticeCoach();
  if (partnerPracticeState.coach) partnerPracticeState.coach.classList.add('is-actions-hidden');
  setPartnerPracticeCoachCopy(
    'まずは「見る」ボタン',
    '長く押すと、出来上がりの絵が見えるよ',
    ''
  );
  setPartnerPracticeCoachBubble(btnPeek, null, false);
  practiceAddHighlight(btnPeek);
  playBasicPracticeVoice(4, function () {
    if (!partnerPracticeState || partnerPracticeState.phase !== 'peek-demo') return;
    runBasicButtonHandDemo(btnPeek, {
      holdMs: BASIC_PEEK_HOLD_MS + 280,
      onPress: function () { setPeekOverlay(true); },
      onRelease: function () { setPeekOverlay(false); },
    }, function () {
      if (!partnerPracticeState || partnerPracticeState.phase !== 'peek-demo') return;
      clearPracticeHighlights();
      practiceAddHighlight(btnPeek);
      partnerPracticeState.phase = 'peek-press';
      setPartnerPracticePeekInput(true);
      setBasicPracticeModeBanner('try', 'やってみよう！', BASIC_TRY_BANNER_MS);
      setPartnerPracticeCoachCopy(
        'やってみよう',
        '「見る」ボタンを 長く押してね',
        ''
      );
      setPartnerPracticeCoachBubble(btnPeek, null, false);
    });
  });
  redraw();
}

function playBasicPeekHoldNarration() {
  if (!partnerPracticeState || partnerPracticeState.phase !== 'peek-hold' || !peekPressActive) return;
  setPartnerPracticeCoachCopy(
    'そのまま 見てね',
    '押している間、出来上がりの絵が見えるよ',
    ''
  );
  setPartnerPracticeCoachBubble(btnPeek, null, false);
  practiceSetTimeout(function () {
    if (!partnerPracticeState || partnerPracticeState.phase !== 'peek-hold' || !peekPressActive) return;
    partnerPracticeState.peekHoldReady = true;
    setPartnerPracticeCoachCopy(
      '離すと戻るよ',
      'わからなくなったら もう一度 長く押してね',
      ''
    );
    setPartnerPracticeCoachBubble(btnPeek, null, false);
    partnerPracticeState.peekReturnNarrationStarted = true;
    practiceSetTimeout(function () {
      if (!partnerPracticeState) return;
      partnerPracticeState.peekReturnNarrationDone = true;
    }, 700);
  }, 700);
}

function playBasicPeekSuccessThenHint() {
  if (!partnerPracticeState || partnerPracticeState.phase !== 'peek-done') return;
  playBasicPracticeVoice(5, function () {
    if (!partnerPracticeState || partnerPracticeState.phase !== 'peek-done') return;
    practiceSetTimeout(function () {
      if (!partnerPracticeState || partnerPracticeState.phase !== 'peek-done') return;
      if (peekOn) setPeekOverlay(false);
      startCommonHintPractice(null);
    }, BASIC_AFTER_PEEK_SUCCESS_DELAY_MS);
  });
}

function playBasicPeekReturnThenSuccess() {
  if (!partnerPracticeState || partnerPracticeState.phase !== 'peek-done') return;
  partnerPracticeState.peekReturnNarrationStarted = true;
  setPartnerPracticeCoachCopy(
    '見えたね',
    '離すと、パズルに戻るよ。わからなくなったら、もう一度長く押してね',
    ''
  );
  setPartnerPracticeCoachBubble(btnPeek, null, false);
  partnerPracticeState.peekReturnNarrationDone = true;
  playBasicPeekSuccessThenHint();
}

function onPartnerPracticePeekPressed() {
  if (!partnerPracticeState || partnerPracticeState.phase !== 'peek-press') return;
  if (!peekOn) return;
  clearPartnerPracticeTimers();
  partnerPracticeState.phase = 'peek-hold';
  partnerPracticeState.peekHoldStart = performance.now();
  partnerPracticeState.peekHoldReady = false;
  queueBasicPracticeAfterVoice(playBasicPeekHoldNarration);
}

function onPartnerPracticePeekReleased(heldMs, cancelled) {
  if (!partnerPracticeState) return;
  if (partnerPracticeState.phase !== 'peek-hold' && partnerPracticeState.phase !== 'peek-press') return;
  clearPartnerPracticeTimers();
  var enough = !cancelled && heldMs >= BASIC_PEEK_HOLD_MS;
  if (!enough) {
    partnerPracticeState.phase = 'peek-press';
    partnerPracticeState.peekHoldStart = 0;
    partnerPracticeState.peekHoldReady = false;
    partnerPracticeState.basicVoiceQueued = null;
    setPartnerPracticePeekInput(true);
    // Too-short press: keep the 'やってみよう！' re-prompt up as long as the
    // sibling try banner (peek-press entry uses BASIC_TRY_BANNER_MS) instead of
    // silently defaulting to 3s, so the retry instruction stays readable.
    setBasicPracticeModeBanner('try', 'やってみよう！', BASIC_TRY_BANNER_MS);
    clearPracticeHighlights();
    practiceAddHighlight(btnPeek);
    setPartnerPracticeCoachCopy(
      '長く押してね',
      '「見る」ボタンは 押している間だけ見えるよ',
      ''
    );
    setPartnerPracticeCoachBubble(btnPeek, null, false);
    return;
  }
  partnerPracticeState.phase = 'peek-done';
  clearPracticeHighlights();
  setPartnerPracticePeekInput(false);
  // Explicit duration (~3.5s) so 'できたね！' stays visible long enough to read
  // instead of the silent 3s default; the phase then moves to success narration.
  setBasicPracticeModeBanner('done', 'できたね！', BASIC_PEEK_DONE_BANNER_MS);
  setPartnerPracticeCoachCopy(
    '見えたね',
    '離すと、パズルに戻るよ。わからなくなったら、もう一度長く押してね',
    ''
  );
  setPartnerPracticeCoachBubble(btnPeek, null, false);
  queueBasicPracticeAfterVoice(playBasicPeekReturnThenSuccess);
}

function onPartnerPracticePieceSelected(piece) {
  if (!partnerPracticeState || partnerPracticeState.phase !== 'hint-select') return;
  if (!partnerPracticeState.hintSelectReady) return;
  if (!piece || piece.snapped) return;
  if (partnerPracticeState.targetPiece && piece !== partnerPracticeState.targetPiece) {
    selectedPieceForHint = null;
    window.PonoHintActive = false;
    setPartnerPracticeCoachCopy(
      'ひかる ピースだよ',
      '',
      ''
    );
    setPartnerPracticeCoachBubbleForRect(getPieceScreenRect(partnerPracticeState.targetPiece), 'right', false);
    refreshHintButtonState();
    redraw();
    return;
  }
  partnerPracticeState.phase = 'hint-demo';
  partnerPracticeState.targetPiece = piece;
  partnerPracticeState.cue = { kind: 'selected-piece', piece: piece };
  partnerPracticeState.hintPressReady = false;
  partnerPracticeState.hintActivatedByButton = false;
  practiceAddHighlight(btnHint);
  setPartnerPracticeInput(false);
  setPartnerPracticeCoachCopy(
    'まず みてね',
    '次は「ヒント」を 押すよ',
    ''
  );
  setPartnerPracticeCoachBubble(btnHint, null, false);
  runBasicButtonHandDemo(btnHint, { holdMs: 520 }, function () {
    if (!partnerPracticeState || partnerPracticeState.phase !== 'hint-demo') return;
    partnerPracticeState.phase = 'hint-press';
    setPartnerPracticeInput(true);
    setPartnerPracticeCoachCopy(
      'やってみよう',
      '「ヒント」を 押してみよう',
      ''
    );
    playBasicPracticeVoice(6, function () {
      if (!partnerPracticeState || partnerPracticeState.phase !== 'hint-press') return;
      partnerPracticeState.hintPressReady = true;
      refreshHintButtonState();
    });
    setPartnerPracticeCoachBubble(btnHint, null, false);
    refreshHintButtonState();
  });
  refreshHintButtonState();
}

function startBasicHintSelectTry(piece) {
  if (!partnerPracticeState || partnerPracticeState.phase !== 'hint-select') return;
  if (partnerPracticeState.mode !== 'basic') return;
  if (!piece || piece.snapped) return;
  showPartnerPracticeCoach();
  setPartnerPracticeInput(true);
  setBasicPracticeModeBanner('try', 'やってみよう！');
  setPartnerPracticeCoachCopy(
    'やってみよう',
    '場所を 知りたい ピースを 選んでね',
    ''
  );
  partnerPracticeState.hintSelectReady = true;
  setPartnerPracticeCoachBubbleForRect(getPieceScreenRect(piece), 'right', false);
}

function recordBasicHintSelectCueVisible(now) {
  if (!partnerPracticeState || partnerPracticeState.mode !== 'basic') return;
  if (partnerPracticeState.phase !== 'hint-select') return;
  if (!partnerPracticeState.waitingForHintSelectCueNarration) return;
  if (partnerPracticeState.hintSelectCueVisibleAt) return;
  partnerPracticeState.hintSelectCueVisibleAt = now || performance.now();
  scheduleBasicHintSelectAfterCueVisible();
}

function showBasicHintSelectNarration() {
  if (!partnerPracticeState || partnerPracticeState.phase !== 'hint-select') return;
  if (partnerPracticeState.mode !== 'basic') return;
  var piece = partnerPracticeState.targetPiece;
  if (!piece || piece.snapped) return;
  partnerPracticeState.waitingForHintSelectCueNarration = false;
  showPartnerPracticeCoach();
  setPartnerPracticeInput(false);
  runBasicHintPlaceHandDemo(piece, function () {
    if (!partnerPracticeState || partnerPracticeState.phase !== 'basic-hint-demo-place') return;
    startBasicHintPlaceTry(piece);
  });
}

function scheduleBasicHintSelectAfterCueVisible() {
  if (!partnerPracticeState || partnerPracticeState.mode !== 'basic') return;
  if (partnerPracticeState.phase !== 'hint-select') return;
  if (!partnerPracticeState.waitingForHintSelectCueNarration) return;
  if (partnerPracticeState.hintSelectCueNarrationScheduled) return;
  if (!partnerPracticeState.hintSelectCueVisibleAt) return;
  partnerPracticeState.hintSelectCueNarrationScheduled = true;
  practiceSetTimeout(function () {
    showBasicHintSelectNarration();
  }, BASIC_SELECT_PIECE_AFTER_CUE_VISIBLE_MS);
}

function showBasicHintDoneNarration() {
  if (!partnerPracticeState || partnerPracticeState.phase !== 'hint-done') return;
  if (partnerPracticeState.mode !== 'basic') return;
  partnerPracticeState.basicDoneVoiceDone = false;
  partnerPracticeState.basicDoneSnapDone = false;
  partnerPracticeState.basicDoneFinishScheduled = false;
  showPartnerPracticeCoach();
  setPartnerPracticeCoachCopy(
    '光ったね',
    '場所が わからないときは ヒントを 使ってね',
    ''
  );
  playBasicPracticeVoice(7, function () {
    if (!partnerPracticeState || partnerPracticeState.mode !== 'basic') return;
    partnerPracticeState.basicDoneVoiceDone = true;
    maybeFinishBasicPracticeAfterSnap();
  });
  partnerPracticeState.phase = 'basic-done';
  setPartnerPracticeCoachBubble(btnHint, null, false);
  practiceSetTimeout(function () {
    animateBasicHintPieceIntoPlace();
  }, BASIC_HINT_AUTO_SNAP_DELAY_MS);
}

function markBasicPracticePieceSnapped(piece) {
  if (!piece || piece.snapped) return false;
  piece.x = piece.homeX;
  piece.y = piece.homeY;
  piece.rotation = 0;
  piece.snapped = true;
  piece.zOrder = -1;
  rebuildPath(piece);
  snappedCount++;
  selectedPieceForHint = null;
  window.PonoHintActive = false;
  hintFlashPiece = null;
  hintFlashUntil = 0;
  updateProgress();
  playSnapSound();
  redraw();
  return true;
}

function animateBasicHintPieceIntoPlace() {
  if (!partnerPracticeState || partnerPracticeState.mode !== 'basic') return;
  if (partnerPracticeState.basicDoneSnapDone) return;
  var piece = partnerPracticeState.targetPiece;
  if (!piece || piece.snapped) {
    partnerPracticeState.basicDoneSnapDone = true;
    maybeFinishBasicPracticeAfterSnap();
    return;
  }
  partnerPracticeState.phase = 'basic-auto-snap';
  partnerPracticeState.cue = null;
  var from = { x: piece.x, y: piece.y, rotation: piece.rotation || 0 };
  var to = { x: piece.homeX, y: piece.homeY, rotation: 0 };
  animatePracticePiece(piece, from, to, BASIC_HINT_AUTO_SNAP_DURATION_MS, function () {
    if (!partnerPracticeState || partnerPracticeState.mode !== 'basic') return;
    markBasicPracticePieceSnapped(piece);
    partnerPracticeState.basicDoneSnapDone = true;
    maybeFinishBasicPracticeAfterSnap();
  }, { hand: true, handPose: 'grip', handSize: getBasicHandSizeForRect(getPieceScreenRect(piece), 1.2) });
}

function maybeFinishBasicPracticeAfterSnap() {
  if (!partnerPracticeState || partnerPracticeState.mode !== 'basic') return;
  if (!partnerPracticeState.basicDoneVoiceDone || !partnerPracticeState.basicDoneSnapDone) return;
  if (partnerPracticeState.basicDoneFinishScheduled) return;
  partnerPracticeState.basicDoneFinishScheduled = true;
  practiceSetTimeout(function () {
    if (!partnerPracticeState || partnerPracticeState.mode !== 'basic') return;
    finishPartnerPractice();
  }, BASIC_AFTER_AUTO_SNAP_FINISH_MS);
}

function scheduleBasicHintDoneAfterFlashVisible() {
  if (!partnerPracticeState || partnerPracticeState.mode !== 'basic') return;
  if (partnerPracticeState.phase !== 'hint-done') return;
  if (!partnerPracticeState.waitingForHintFlashDone) return;
  if (partnerPracticeState.hintFlashDoneScheduled) return;
  if (!hintFlashVisibleAt) return;
  partnerPracticeState.hintFlashDoneScheduled = true;
  practiceSetTimeout(function () {
    showBasicHintDoneNarration();
  }, BASIC_HINT_DONE_AFTER_FLASH_VISIBLE_MS);
}

function onPartnerPracticeHintUsed() {
  if (!partnerPracticeState || partnerPracticeState.phase !== 'hint-press') return;
  var isBasicPracticeHint = partnerPracticeState.mode === 'basic';
  if (isBasicPracticeHint && !partnerPracticeState.hintActivatedByButton) return;
  partnerPracticeState.phase = 'hint-done';
  partnerPracticeState.hintIntroDone = true;
  partnerPracticeState.hintActivatedByButton = false;
  clearPracticeHighlights();
  setPartnerPracticeInput(false);
  partnerPracticeState.cue = null;
  if (isBasicPracticeHint) {
    clearPartnerPracticeCoachBubble();
    setPartnerPracticeCoachCopy('', '', '');
    hidePartnerPracticeCoach();
    partnerPracticeState.waitingForHintFlashDone = true;
    partnerPracticeState.hintFlashDoneScheduled = false;
    scheduleBasicHintDoneAfterFlashVisible();
    return;
  }
  setPartnerPracticeCoachCopy(
    '光ったね',
    '場所が わからないときは ヒントを 使ってね',
    ''
  );
  playBasicPracticeVoice(7);
  setPartnerPracticeCoachBubble(btnHint, null, false);
  practiceSetTimeout(function () {
    startPartnerSpecificPractice(partnerPracticeState.partnerId);
  }, 1200);
}

function startPartnerPracticeFlow(partnerId) {
  resetPracticeBoard();
  if (partnerPracticeState && partnerPracticeState.mode === 'basic') {
    startBasicIntroPractice();
    return;
  }
  startPartnerSpecificPractice(partnerId);
}

function startPartnerSpecificPractice(partnerId) {
  if (!partnerPracticeState || !partnerPracticeState.active) return;
  clearPartnerPracticeTimers();
  clearPracticeHighlights();
  removeBasicPracticeModeBanner();
  clearPartnerPracticeCoachBubble();
  setPartnerPracticeInput(false);
  setPartnerPracticePeekInput(false);
  setSelectedPieceForHint(null);
  hintFlashPiece = null;
  hintFlashUntil = 0;
  var copy = PARTNER_PRACTICE_COPY[partnerId] || {};
  setPartnerPracticeCoachCopy(
    copy.title || 'なかまの れんしゅう',
    copy.body || 'なかまの うごきを みてみよう。',
    partnerId === 'kitsune' ? 'キツネの とくぎ' : 'なかまの とくぎ'
  );
  setPartnerPracticeStartEnabled(true);
  showPartnerPracticeCoach();
  armPartnerPracticeIntroTap(partnerId);
}

function runKitsuneHintCountDemo() {
  if (!btnHint) return;
  clearPartnerPracticeCoachBubble();
  hidePartnerPracticeCoach();
  practiceSetTimeout(function () {
    if (!partnerPracticeState || !btnHint) return;
    practiceAddHighlight(btnHint);
    btnHint.classList.add('partner-practice-count-demo');
    btnHint.textContent = 'ヒント×1';
    practiceSetTimeout(function () {
      if (!partnerPracticeState || !btnHint) return;
      btnHint.textContent = 'ヒント×2';
      btnHint.classList.remove('is-count-pop');
      void btnHint.offsetWidth;
      btnHint.classList.add('is-count-pop');
      showHintIncreaseModal(1, 2, {
        closeDelay: 1700,
        onClose: function () {
          showPartnerPracticeResultCoach(
            'ヒントが ふえたよ',
            'キツネと いると ヒントが ふえるよ'
          );
        },
      });
    }, 760);
  }, PARTNER_PRACTICE_MODAL_AFTER_HIDE_MS);
  practiceSetTimeout(function () {
    if (!btnHint) return;
    btnHint.classList.remove('is-count-pop');
  }, PARTNER_PRACTICE_MODAL_AFTER_HIDE_MS + 1800);
}

function showPartnerPracticeResultCoach(titleText, bodyText) {
  if (!partnerPracticeState || !partnerPracticeState.active) return;
  clearPartnerPracticeCoachBubble();
  showPartnerPracticeCoach();
  setPartnerPracticeStartEnabled(true);
  setPartnerPracticeCoachCopy(titleText, bodyText, '');
}

function runHarinezumiHintLimitDemo() {
  if (!btnHint) return;
  clearPartnerPracticeCoachBubble();
  hidePartnerPracticeCoach();
  practiceSetTimeout(function () {
    if (!partnerPracticeState || !btnHint) return;
    practiceAddHighlight(btnHint);
    btnHint.classList.add('partner-practice-count-demo');
    btnHint.textContent = 'ヒント×1';
    showHintIncreaseModal(2, 1, {
      allowDecrease: true,
      closeDelay: 1700,
      titleText: 'すくないよ',
      onClose: function () {
        showPartnerPracticeResultCoach(
          'ヒントは すくなめ',
          'ハリネズミと いると すくない ヒントで ちょうせんするよ'
        );
      },
    });
  }, PARTNER_PRACTICE_MODAL_AFTER_HIDE_MS);
}

function runRisuTimerDemo() {
  if (!challengeStatusEl) return;
  clearPartnerPracticeCoachBubble();
  hidePartnerPracticeCoach();
  activeChallenge.type = 'time';
  activeChallenge.limitMs = activeChallenge.limitMs || 35000;
  activeChallenge.started = false;
  activeChallenge.expired = false;
  stopChallengeTimer();
  hideChallengeStatus();
  practiceSetTimeout(function () {
    if (!partnerPracticeState || !challengeStatusEl) return;
    challengeStatusEl.classList.remove('hidden', 'is-expired');
    challengeStatusEl.classList.add('is-time');
    practiceAddHighlight(challengeStatusEl);
    var limit = activeChallenge.limitMs || 35000;
    var start = performance.now();
    function frame(now) {
      if (!partnerPracticeState || !partnerPracticeState.active) return;
      var t = Math.max(0, Math.min(1, (now - start) / RISU_PRACTICE_TIMER_DEMO_MS));
      var remain = Math.max(0, limit * (1 - t * 0.74));
      setTimeChallengeStatus(remain);
      if (t < 1) {
        var raf = requestAnimationFrame(frame);
        if (partnerPracticeState) partnerPracticeState.rafs.push(raf);
        return;
      }
      showPartnerPracticeResultCoach(
        'じかんが へるよ',
        'のこりを みながら、すばやく クリアを めざそう'
      );
    }
    setTimeChallengeStatus(limit);
    var raf = requestAnimationFrame(frame);
    partnerPracticeState.rafs.push(raf);
  }, PARTNER_PRACTICE_MODAL_AFTER_HIDE_MS);
}

function animatePracticePiece(piece, from, to, duration, onDone, options) {
  if (!partnerPracticeState || !piece) return;
  options = options || {};
  var start = performance.now();
  function frame(now) {
    if (!partnerPracticeState || !partnerPracticeState.active) return;
    var t = Math.max(0, Math.min(1, (now - start) / duration));
    var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    piece.x = from.x + (to.x - from.x) * ease;
    piece.y = from.y + (to.y - from.y) * ease;
    piece.rotation = from.rotation + (to.rotation - from.rotation) * ease;
    rebuildPath(piece);
    dragPiece = piece;
    runAssistHooks('duringDrag', { piece: piece, dx: to.x - from.x, dy: to.y - from.y, partner: getCurrentPartner() }, false);
    if (options.hand) {
      var handPoint = getPieceScreenCenter(piece, false);
      if (handPoint) {
        setBasicPracticeHand(handPoint, options.handPose || 'grip', {
          size: options.handSize,
          pressing: true,
          scale: 0.94,
        });
      }
    }
    redraw();
    if (t < 1) {
      var raf = requestAnimationFrame(frame);
      if (partnerPracticeState) partnerPracticeState.rafs.push(raf);
    } else {
      dragPiece = null;
      if (onDone) onDone();
      redraw();
    }
  }
  var raf = requestAnimationFrame(frame);
  partnerPracticeState.rafs.push(raf);
}

function pickKojikaPracticeStart(piece) {
  var farCandidates = [
    { x: 10, y: 10, rotation: 0 },
    { x: Math.max(10, canvasW - pieceW - 10), y: 10, rotation: 0 },
    { x: 10, y: Math.max(10, canvasH - pieceH - 10), rotation: 0 },
    { x: Math.max(10, canvasW - pieceW - 10), y: Math.max(10, canvasH - pieceH - 10), rotation: 0 },
    { x: Math.max(10, boardX - pieceW * 1.65), y: Math.max(10, Math.min(canvasH - pieceH - 10, boardY + boardH * 0.52)), rotation: 0 },
    { x: Math.max(10, Math.min(canvasW - pieceW - 10, boardX + boardW + pieceW * 0.65)), y: Math.max(10, Math.min(canvasH - pieceH - 10, boardY + boardH * 0.52)), rotation: 0 },
  ];
  return farCandidates.reduce(function (best, candidate) {
    var bestD = Math.hypot(best.x - piece.homeX, best.y - piece.homeY);
    var d = Math.hypot(candidate.x - piece.homeX, candidate.y - piece.homeY);
    return d > bestD ? candidate : best;
  }, farCandidates[0]);
}

function pickBasicDragPracticeStart(piece) {
  return {
    x: Math.max(10, canvasW - pieceW - 10),
    y: 10,
    rotation: 0,
  };
}

function startKojikaInteractivePractice(piece) {
  if (!partnerPracticeState || !piece) return;
  var from = pickKojikaPracticeStart(piece);
  placePieceForPractice(piece, from.x, from.y, 0);
  partnerPracticeState.phase = 'kojika-drag';
  partnerPracticeState.targetPiece = piece;
  partnerPracticeState.cue = { kind: 'kojika-move-target', piece: piece };
  partnerPracticeState.kojikaGlowShown = false;
  setPartnerPracticeInput(true);
  setPartnerPracticeStartEnabled(false);
  setPartnerPracticeCoachCopy(
    'この ピースを もってね',
    'あおい ばしょへ うごかそう',
    ''
  );
  setPartnerPracticeCoachBubbleForRect(getPieceScreenRect(piece), 'above', true);
  redraw();
}

function onKojikaPracticeDragStart(piece) {
  if (!partnerPracticeState || partnerPracticeState.partnerId !== 'kojika') return;
  if (partnerPracticeState.phase !== 'kojika-drag') return;
  if (piece !== partnerPracticeState.targetPiece) return;
  partnerPracticeState.phase = 'kojika-moving';
  partnerPracticeState.cue = { kind: 'kojika-move-target', piece: piece };
  setPartnerPracticeCoachCopy(
    'あおい ばしょへ',
    'ちかづくと ひかるよ',
    ''
  );
  setPartnerPracticeCoachBubbleForRect(getPieceHomeScreenRect(piece), 'left', true);
}

function isKojikaPracticeNearHome(piece) {
  if (!piece) return false;
  var dist = Math.hypot(piece.x - piece.homeX, piece.y - piece.homeY);
  var glowDist = Math.max(SNAP_DIST * 1.65, pieceW * 0.62);
  return dist <= glowDist;
}

function updateKojikaPracticeDrag(piece) {
  if (!partnerPracticeState || partnerPracticeState.partnerId !== 'kojika') return;
  if (partnerPracticeState.phase !== 'kojika-moving' && partnerPracticeState.phase !== 'kojika-drag') return;
  if (!piece || piece !== partnerPracticeState.targetPiece || piece.snapped) return;
  if (isKojikaPracticeNearHome(piece)) {
    partnerPracticeState.cue = { kind: 'kojika-glow', piece: piece };
    if (!partnerPracticeState.kojikaGlowShown) {
      partnerPracticeState.kojikaGlowShown = true;
      setPartnerPracticeCoachCopy(
        'ひかったね',
        'はなすと はまるよ',
        ''
      );
      setPartnerPracticeCoachBubbleForRect(getPieceScreenRect(piece), 'below', true);
    }
  } else {
    partnerPracticeState.cue = { kind: 'kojika-move-target', piece: piece };
  }
}

function onKojikaPracticePieceDropped(piece, didSnap) {
  if (!partnerPracticeState || partnerPracticeState.partnerId !== 'kojika') return;
  if (partnerPracticeState.phase !== 'kojika-moving' && partnerPracticeState.phase !== 'kojika-drag') return;
  if (!piece || piece !== partnerPracticeState.targetPiece) return;
  if (!didSnap && !piece.snapped && isKojikaPracticeNearHome(piece)
      && typeof window.PonoPuzzleForceSnapPiece === 'function') {
    didSnap = window.PonoPuzzleForceSnapPiece(piece);
  }
  if (didSnap || piece.snapped) {
    partnerPracticeState.phase = 'kojika-done';
    partnerPracticeState.cue = null;
    setPartnerPracticeInput(false);
    setPartnerPracticeStartEnabled(true);
    setPartnerPracticeCoachCopy(
      'できたね',
      'ちかいと ひかるよ',
      ''
    );
    setPartnerPracticeCoachBubbleForRect(getPieceScreenRect(piece) || getPieceHomeScreenRect(piece), 'below', true);
    redraw();
    return;
  }
  partnerPracticeState.cue = { kind: 'kojika-move-target', piece: piece };
  setPartnerPracticeCoachCopy(
    partnerPracticeState.kojikaGlowShown ? 'もうすこし ちかくへ' : 'あおい ばしょへ',
    'ピースを うごかしてね',
    ''
  );
  setPartnerPracticeCoachBubbleForRect(getPieceHomeScreenRect(piece), 'left', true);
  redraw();
}

function runPartnerPracticeDemo(partnerId) {
  var list = getPracticePieces();
  if (!list.length) return;
  var p = list[Math.min(2, list.length - 1)];

  if (partnerId === 'kitsune') {
    runKitsuneHintCountDemo();
    return;
  }

  if (partnerId === 'kojika') {
    startKojikaInteractivePractice(p);
    return;
  }

  if (partnerId === 'araiguma') {
    var araigumaBtn = document.getElementById('pono-araiguma-btn');
    practiceAddHighlight(araigumaBtn);
    practiceSetTimeout(function () {
      var btn = document.getElementById('pono-araiguma-btn');
      if (btn && !btn.classList.contains('hidden')) {
        btn.click();
        return;
      }
      var targets = getPracticePieces().slice(0, 4);
      for (var i = 0; i < targets.length; i++) {
        (function (piece, delay) {
          practiceSetTimeout(function () { window.PonoPuzzleForceSnapPiece(piece); }, delay);
        })(targets[i], i * 260);
      }
    }, 800);
    return;
  }

  if (partnerId === 'usagi') {
    var from = { x: Math.max(10, boardX - pieceW * 1.15), y: Math.max(10, boardY + boardH * 0.18), rotation: 0 };
    var to = { x: p.homeX + pieceW * 0.4, y: p.homeY + pieceH * 0.25, rotation: 0 };
    placePieceForPractice(p, from.x, from.y, 0);
    animatePracticePiece(p, from, to, 2100);
    return;
  }

  if (partnerId === 'fukurou') {
    var centerPiece = pieces.find(function (x) { return x && x.row === 1 && x.col === 1; }) || p;
    var neighbor = pieces.find(function (x) {
      return x && x !== centerPiece && x.row === centerPiece.row && x.col === centerPiece.col + 1;
    }) || list[0];
    setSelectedPieceForHint(centerPiece);
    practiceSetTimeout(function () {
      hintFlashPiece = neighbor;
      hintFlashUntil = Date.now() + 2600;
      ensureHintAnimLoop();
    }, 450);
    return;
  }

  if (partnerId === 'risu') {
    runRisuTimerDemo();
    return;
  }

  if (partnerId === 'harinezumi') {
    runHarinezumiHintLimitDemo();
    return;
  }

  if (partnerId === 'karasu') {
    var targets = list.slice(0, 4);
    for (var k = 0; k < targets.length; k++) {
      targets[k].rotation = (k % 2 === 0) ? 90 : 180;
      rebuildPath(targets[k]);
    }
    redraw();
    var rotPiece = targets[0] || p;
    practiceSetTimeout(function () {
      animatePracticePiece(rotPiece,
        { x: rotPiece.x, y: rotPiece.y, rotation: rotPiece.rotation || 90 },
        { x: rotPiece.x, y: rotPiece.y, rotation: 0 },
        1200
      );
    }, 650);
  }
}

function beginPartnerPractice(partnerId, returnIndex, done, options) {
  options = options || {};
  var partner = (window.PonoPartners && typeof window.PonoPartners.get === 'function')
    ? window.PonoPartners.get(partnerId)
    : null;
  if (!partner && options.mode !== 'basic') {
    if (typeof done === 'function') done();
    return;
  }

  partnerPracticeState = {
    active: true,
    partnerId: partnerId,
    returnIndex: returnIndex,
    done: done,
    mode: options.mode || 'partner',
    onBack: options.onBack || null,
    onConfirm: options.onConfirm || null,
    backAction: options.backAction || 'replay',
    backLabel: options.backLabel || 'もういちど',
    startLabel: options.startLabel || 'ほんばんへ',
    phase: 'start',
    timers: [],
    rafs: [],
    cueRaf: null,
    loopCueToken: 0,
    loopCueActive: false,
    loopCueGhost: null,
    modeBadgeEl: null,
    modeBadgeToken: 0,
    highlighted: [],
    targetPiece: null,
    cue: null,
    allowCanvasInput: false,
    hintIntroDone: false,
    peekHoldStart: 0,
    peekHoldReady: false,
    introPartnerId: null,
    introDemoStarted: false,
    tapPromptEl: null,
    tapStartHandler: null,
    tapPromptResizeHandler: null,
    tapPromptRaf: null,
    coach: null,
  };

  document.body.classList.add('partner-practice-active');
  document.body.classList.toggle('partner-practice-basic-layout', partnerPracticeState.mode === 'basic');
  if (puzzleContainer) puzzleContainer.classList.add('partner-practice-on');
  removePrestartOverlay();
  resetPracticeBoard();
  var originalTitle = stageLabel.textContent;
  stageLabel.textContent = partner ? (partner.name + 'の れんしゅう') : 'はじめての れんしゅう';
  partnerPracticeState.originalTitle = originalTitle;
  partnerPracticeState.coach = createPartnerPracticeCoach(partnerId, partner);
  startPartnerPracticeFlow(partnerId);
}

function finishPartnerPractice() {
  if (!partnerPracticeState) return;
  var partnerId = partnerPracticeState.partnerId;
  var returnIndex = partnerPracticeState.returnIndex;
  var done = partnerPracticeState.done;
  var mode = partnerPracticeState.mode;
  var onConfirm = partnerPracticeState.onConfirm;
  clearPartnerPracticeTimers();
  clearPracticeHighlights();
  setSelectedPieceForHint(null);
  hintFlashPiece = null;
  hintFlashUntil = 0;
  dragPiece = null;
  if (btnHint) btnHint.classList.remove('partner-practice-count-demo', 'is-count-pop');
  if (peekOn) setPeekOverlay(false);
  clearBasicPracticeVoiceQueue();
  stopPuzzleVoice();
  stopChallengeTimer();
  if (partnerPracticeState.coach && partnerPracticeState.coach.parentNode) {
    partnerPracticeState.coach.parentNode.removeChild(partnerPracticeState.coach);
  }
  removeBasicPracticeModeBanner();
  document.body.classList.remove('partner-practice-active');
  document.body.classList.remove('partner-practice-hint-on');
  document.body.classList.remove('partner-practice-peek-on');
  document.body.classList.remove('partner-practice-basic-layout');
  if (puzzleContainer) puzzleContainer.classList.remove('partner-practice-on', 'partner-practice-input-on');
  partnerPracticeState.active = false;
  partnerPracticeState = null;
  if (mode === 'basic') markBasicPracticeSeen();
  else markPartnerPracticeSeen(partnerId);
  if (typeof onConfirm === 'function') {
    try { onConfirm(partnerId); } catch (_) {}
  }
  loadStageAndThen(returnIndex, function () {
    if (typeof done === 'function') done();
  });
}

function returnPartnerPracticeToSelect() {
  if (!partnerPracticeState) return;
  var returnIndex = partnerPracticeState.returnIndex;
  var onBack = partnerPracticeState.onBack;
  clearPartnerPracticeTimers();
  clearPracticeHighlights();
  setSelectedPieceForHint(null);
  hintFlashPiece = null;
  hintFlashUntil = 0;
  dragPiece = null;
  if (peekOn) setPeekOverlay(false);
  clearBasicPracticeVoiceQueue();
  stopPuzzleVoice();
  stopChallengeTimer();
  if (partnerPracticeState.coach && partnerPracticeState.coach.parentNode) {
    partnerPracticeState.coach.parentNode.removeChild(partnerPracticeState.coach);
  }
  removeBasicPracticeModeBanner();
  document.body.classList.remove('partner-practice-active');
  document.body.classList.remove('partner-practice-hint-on');
  document.body.classList.remove('partner-practice-peek-on');
  document.body.classList.remove('partner-practice-basic-layout');
  if (puzzleContainer) puzzleContainer.classList.remove('partner-practice-on', 'partner-practice-input-on');
  partnerPracticeState.active = false;
  partnerPracticeState = null;
  loadStageAndThen(returnIndex, function () {
    if (typeof onBack === 'function') onBack();
  });
}

function showPartnerPracticeIfNeeded(partnerId, stageId, done) {
  if (!partnerId || !PARTNER_PRACTICE_COPY[partnerId] || hasSeenPartnerPractice(partnerId)) {
    if (typeof done === 'function') done();
    return;
  }
  var returnIndex = currentStageIndex;
  var practiceIndex = choosePartnerPracticeStageIndex();
  loadStageAndThen(practiceIndex, function () {
    beginPartnerPractice(partnerId, returnIndex, done);
  });
}

function showBasicPracticeIfNeeded(done, force) {
  if (!force && hasSeenBasicPractice()) {
    if (typeof done === 'function') done();
    return;
  }
  if (force && partnerPracticeState && partnerPracticeState.active) {
    clearActivePracticeSessionForReplay();
  }
  var returnIndex = currentStageIndex;
  var practiceIndex = choosePartnerPracticeStageIndex();
  loadStageAndThen(practiceIndex, function () {
    beginPartnerPractice(null, returnIndex, done, {
      mode: 'basic',
      backLabel: 'もういちど',
      startLabel: 'あそぶ',
    });
  });
}

function showPartnerPracticeForChoice(partnerId, opts) {
  opts = opts || {};
  var returnIndex = currentStageIndex;
  var practiceIndex = choosePartnerPracticeStageIndex();
  loadStageAndThen(practiceIndex, function () {
    beginPartnerPractice(partnerId, returnIndex, opts.onDone, {
      mode: 'partner-choice',
      backAction: 'return',
      backLabel: 'もどる',
      startLabel: 'このこにする',
      onBack: opts.onBack,
      onConfirm: opts.onConfirm,
    });
  });
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
  if (partnerPracticeState && partnerPracticeState.active && !partnerPracticeState.allowCanvasInput) return;
  cancelBasicPracticeLoopCue();
  const { x, y } = getPos(e);
  let found = null;
  for (const p of pieces) {
    if (p.snapped) continue;
    if (hitTest(p, x, y) && (!found || p.zOrder > found.zOrder)) found = p;
  }
  var basicDragHitPiece = getBasicDragPracticeHitPiece(x, y);
  if (basicDragHitPiece) found = basicDragHitPiece;
  // タップ検出用の初期値はピース有無に関わらず常に記録 (空タップで選択解除のため)
  pointerDownTime = Date.now();
  pointerDownX = x;
  pointerDownY = y;
  pointerMoveDist = 0;

  if (isBasicHintSelectPracticePhase()) {
    emptyTapPending = false;
    dragPiece = null;
    onBasicHintSelectPracticePointerDown(found);
    return;
  }

  if (isBasicHintPressPracticePhase()) {
    emptyTapPending = false;
    dragPiece = null;
    if (partnerPracticeState && partnerPracticeState.targetPiece) {
      partnerPracticeState.cue = { kind: 'selected-piece', piece: partnerPracticeState.targetPiece };
      setPartnerPracticeCoachCopy(
        '次は「ヒント」',
        '「ヒント」を 押してみよう',
        ''
      );
      setPartnerPracticeCoachBubble(btnHint, null, false);
      redraw();
    }
    return;
  }

  if (!found) {
    // 空タップの可能性: pointerup で判定して selectedPieceForHint をクリアする。
    // dragPiece は立てないが、 pointerup ハンドラを通すため down ハンドラの中で
    // emptyTapPending フラグを立てておく。
    emptyTapPending = true;
    rearmBasicLoopCueIfWaiting();
    return;
  }

  if (partnerPracticeState && partnerPracticeState.active
      && partnerPracticeState.partnerId === 'kojika'
      && (partnerPracticeState.phase === 'kojika-drag' || partnerPracticeState.phase === 'kojika-moving')
      && partnerPracticeState.targetPiece
      && found !== partnerPracticeState.targetPiece) {
    emptyTapPending = false;
    dragPiece = null;
    partnerPracticeState.cue = { kind: 'kojika-move-target', piece: partnerPracticeState.targetPiece };
    setPartnerPracticeCoachCopy(
      'こっちの ピースだよ',
      '',
      ''
    );
    setPartnerPracticeCoachBubbleForRect(getPieceScreenRect(partnerPracticeState.targetPiece), 'above', true);
    redraw();
    return;
  }

  if (isBasicDragPracticePhase()
      && partnerPracticeState.targetPiece
      && found !== partnerPracticeState.targetPiece) {
    emptyTapPending = false;
    dragPiece = null;
    partnerPracticeState.cue = { kind: 'kojika-move-target', piece: partnerPracticeState.targetPiece };
    setPartnerPracticeCoachCopy(
      'この ピースだよ',
      '',
      ''
    );
    setPartnerPracticeCoachBubbleForRect(getPieceScreenRect(partnerPracticeState.targetPiece), 'above', false);
    redraw();
    rearmBasicLoopCueIfWaiting();
    return;
  }

  if (isBasicHintDragPracticePhase()
      && partnerPracticeState.targetPiece
      && found !== partnerPracticeState.targetPiece) {
    emptyTapPending = false;
    dragPiece = null;
    partnerPracticeState.cue = { kind: 'kojika-move-target', piece: partnerPracticeState.targetPiece };
    setPartnerPracticeCoachCopy(
      'この ピースだよ',
      '',
      ''
    );
    setPartnerPracticeCoachBubbleForRect(getPieceScreenRect(partnerPracticeState.targetPiece), 'above', false);
    redraw();
    rearmBasicLoopCueIfWaiting();
    return;
  }

  emptyTapPending = false;
  dragPiece = found;
  dragOffX = x - found.x; dragOffY = y - found.y;
  dragPiece.zOrder = Math.max(...pieces.map(p => p.zOrder)) + 1;
  onKojikaPracticeDragStart(found);
  onBasicDragPracticeDragStart(found);
  onBasicHintDragPracticeDragStart(found);

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
  updateKojikaPracticeDrag(dragPiece);
  updateBasicDragPracticeDrag(dragPiece);
  updateBasicHintDragPracticeDrag(dragPiece);

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
  var isKojikaPracticeMove = !!(partnerPracticeState && partnerPracticeState.active
    && partnerPracticeState.partnerId === 'kojika'
    && (partnerPracticeState.phase === 'kojika-drag' || partnerPracticeState.phase === 'kojika-moving'));
  var isBasicDragPracticeMove = isBasicDragPracticePhase();
  var isBasicHintDragPracticeMove = isBasicHintDragPracticePhase();
  if (isTap && !piece.snapped && !isKojikaPracticeMove && !isBasicDragPracticeMove && !isBasicHintDragPracticeMove) {
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

  var didSnap = trySnap(piece);
  onKojikaPracticePieceDropped(piece, didSnap);
  onBasicDragPracticePieceDropped(piece, didSnap);
  onBasicHintDragPracticePieceDropped(piece, didSnap);
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

  // フレーム全域をピース散布エリアとして残しつつ、画角ごとに完成絵の見え方を調整する。
  // 4:3寄りは外側に余白が出やすいため、完成絵を大きめにしてアンバランスさを抑える。
  const isFourThreeLike = !!(window.matchMedia && window.matchMedia('(orientation: landscape) and (max-aspect-ratio: 3 / 2)').matches);
  const isShortLandscape = !!(window.matchMedia && window.matchMedia('(orientation: landscape) and (max-height: 430px)').matches);
  const boardMaxW = canvasW * (isFourThreeLike ? 0.66 : (isShortLandscape ? 0.58 : 0.56));
  const boardMaxH = canvasH * (isFourThreeLike ? 0.74 : (isShortLandscape ? 0.66 : 0.64));
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
  flushStageReadyCallbacks();
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
  stageHintUsesActual = 0;
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
  var currentPartnerForStage = getCurrentPartner();

  // ステージ毎のヒント回数を初期化 → ボタン表示を更新
  var sidForReset = (stage && stage.id != null) ? stage.id : (index + 1);
  setupPartnerChallenge(sidForReset, currentPartnerForStage);
  try {
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
  stageRotationRate = 0.75;
  if (currentPartnerForStage && currentPartnerForStage.challengeType === 'rotation') {
    var rotationConfig = karasuRotationConfig();
    stageAllowedRotations = rotationConfig.rotations;
    stageRotationRate = rotationConfig.rate;
    stageRotationActive = true;
  } else {
    // チャレンジモードが ON で、 かつステージ側も許可していれば回転モード有効
    stageRotationActive = isChallengeRotationOn() && stageChallengeRotationEnabled;
  }

  // ステージタイトル
  const title = stage.title || stage.stageText;
  const displayMeta = getStageDisplayMeta(index);
  stageLabel.textContent = title
    ? `${title} (${displayMeta.num}/${displayMeta.total})`
    : `ステージ ${displayMeta.num} / ${displayMeta.total}`;

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
let peekPressActive = false;
let peekPressPointerId = null;
let peekPressStartedAt = 0;

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
      btnPeek.textContent = '👁 みる';
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

function canUsePeekButton() {
  if (!puzzleCanvas) return false;
  if (scatterAnimating || prestartOverlayEl) return false;
  return true;
}

function startPeekPress(e) {
  if (!canUsePeekButton()) return;
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (peekPressActive) return;
  peekPressActive = true;
  peekPressPointerId = e && typeof e.pointerId === 'number' ? e.pointerId : null;
  peekPressStartedAt = performance.now();
  try {
    if (e && btnPeek && typeof btnPeek.setPointerCapture === 'function') {
      btnPeek.setPointerCapture(e.pointerId);
    }
  } catch (_) {}
  setPeekOverlay(true);
  onPartnerPracticePeekPressed();
}

function finishPeekPress(e, cancelled) {
  if (!peekPressActive) return;
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  var heldMs = Math.max(0, performance.now() - peekPressStartedAt);
  var pointerId = peekPressPointerId;
  peekPressActive = false;
  peekPressPointerId = null;
  peekPressStartedAt = 0;
  try {
    if (e && btnPeek && typeof btnPeek.releasePointerCapture === 'function') {
      btnPeek.releasePointerCapture(e.pointerId);
    } else if (pointerId != null && btnPeek && typeof btnPeek.releasePointerCapture === 'function') {
      btnPeek.releasePointerCapture(pointerId);
    }
  } catch (_) {}
  setPeekOverlay(false);
  onPartnerPracticePeekReleased(heldMs, !!cancelled);
}

// ===== Button Handlers =====
if (btnShuffle) {
  btnShuffle.addEventListener('click', () => {
    if (!puzzleCanvas) return;
    // 散布アニメ実行中は無効化 (二重起動防止)
    if (scatterAnimating) return;
    // peek ON のままシャッフルすると操作不能に見えるので OFF にしてから実行
    if (peekOn) setPeekOverlay(false);
    // prestart overlay 表示中にまぜるが押された場合は overlay を破棄してから即時シャッフル
    var wasPrestart = !!prestartOverlayEl;
    if (prestartOverlayEl) removePrestartOverlay();
    dragPiece = null;
    shufflePieces();
    if (wasPrestart) startPartnerChallengeAfterScatter();
  });
}

if (btnPeek) {
  btnPeek.addEventListener('pointerdown', startPeekPress, { passive: false });
  btnPeek.addEventListener('pointerup', function (e) {
    if (peekPressPointerId != null && e.pointerId !== peekPressPointerId) return;
    finishPeekPress(e, false);
  }, { passive: false });
  btnPeek.addEventListener('pointercancel', function (e) {
    if (peekPressPointerId != null && e.pointerId !== peekPressPointerId) return;
    finishPeekPress(e, true);
  }, { passive: false });
  btnPeek.addEventListener('lostpointercapture', function (e) {
    if (peekPressPointerId != null && e.pointerId !== peekPressPointerId) return;
    finishPeekPress(e, false);
  });
  btnPeek.addEventListener('keydown', function (e) {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    if (peekPressActive) return;
    startPeekPress(e);
  });
  btnPeek.addEventListener('keyup', function (e) {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    finishPeekPress(e, false);
  });
}

// ===== Hint Button (Phase 3b Step 3 — 新仕様) =====
// 旧: 完成形を全体表示 → 散布
// 新: 選択中ピースのスロットに金色星+radial glow+枠点滅を 2 秒表示
if (btnHint) {
  btnHint.addEventListener('click', () => {
    if (!puzzleCanvas) return;
    // 散布アニメ中・prestart 表示中はヒント無効
    if (scatterAnimating || prestartOverlayEl) return;
    // ドラッグ中は 😴 状態 → 無効
    if (dragPiece) return;

    var isBasicPracticeHint = !!(partnerPracticeState
      && partnerPracticeState.mode === 'basic'
      && (partnerPracticeState.phase === 'hint-press'
        || partnerPracticeState.phase === 'basic-hint-press-try'));
    if (isBasicPracticeHint && !partnerPracticeState.hintPressReady) {
      return;
    }

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

    if (isBasicPracticeHint) partnerPracticeState.hintActivatedByButton = true;
    if (!isBasicPracticeHint && window.PuzzleVoice) window.PuzzleVoice.playRandom('hint');

    // 金色星演出: 1.5 秒間 hintFlashPiece に対して描画 (Phase 3c: 2000→1500ms)
    hintFlashVisibleAt = 0;
    hintFlashPiece = selectedPieceForHint;
    hintFlashUntil = Date.now() + HINT_FLASH_DURATION_MS;
    ensureHintAnimLoop();

    // Phase 3c: キツネ装備時はピース絵柄の grayscale シルエットを「手元」スロットへ追加転写
    //   - 実装は assists/kitsune.js 側 (window.PonoAssistKitsune.fireHintShape(piece, ctx))
    //   - 未ロード / 未実装でもヒント本体は機能するよう try/catch で隔離
    try {
      var partnerForFx = getCurrentPartner();
      var partnerIdForFx = partnerForFx ? partnerForFx.id : null;
      if (partnerIdForFx === 'kitsune'
          && window.PonoAssistKitsune
          && typeof window.PonoAssistKitsune.fireHintShape === 'function') {
        showPartnerAbilityCutin(partnerForFx, { label: 'さきよみ!' });
        var fxCtx = (puzzleCanvas && puzzleCanvas.getContext) ? puzzleCanvas.getContext('2d') : null;
        window.PonoAssistKitsune.fireHintShape(selectedPieceForHint, fxCtx);
      }
    } catch (_) { /* assist 側の例外で本体を止めない */ }

    // 残数を 1 消費
    stageHintUsesActual++;
    setHintUsesRemaining(sid, Math.max(0, remaining - 1));
    refreshHintButtonState();
    if (partnerPracticeState && partnerPracticeState.phase === 'basic-hint-press-try') {
      onBasicHintPracticeHintButtonUsed();
    } else {
      onPartnerPracticeHintUsed();
    }
  });
}

btnNextStage.addEventListener('click', () => {
  const nextIndex = getNextStageIndexForFlow(currentStageIndex);
  if (nextIndex >= STAGES.length) return;
  if (!isStageUnlockedForCurrentFlow(nextIndex)) {
    nextNudge.stop();
    // NOTE: MVP では common/tier.js が PONO_TIER_GAME_LOCKS_ENABLED=false を設定するため、
    // isStageUnlockedForCurrentFlow() は常に true を返し、この分岐は到達しない。
    // Phase 2 でロック機能を再有効化する際に、本ブランチが復活する想定。
    if (window.PonoTier && typeof window.PonoTier.showSubscribePromo === 'function') {
      window.PonoTier.showSubscribePromo({
        title: 'つぎの えは まだ あそべないよ',
        body: 'えほん モード や アプリ で あたらしい えが ふえていくよ！'
      });
    }
    return;
  }
  hideSuccessModal();
  loadStageAndThen(nextIndex, function () {
    maybeShowPartnerChoiceForCurrentStage();
  });
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
  // チュートリアル中に canvas を作り直すと、案内中の targetPiece と
  // 新しく作られた pieces 配列がズレて、ピース形状が合わなくなる。
  if (partnerPracticeState && partnerPracticeState.active) return;
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

let partnerChoiceDismissedStageId = null;
const PARTNER_UNLOCK_NOTICE_KEY = 'pono_partner_unlock_notice_seen_v1';

function showTitleGuideChoice() {
  if (!titleGuideChoice || !isTitleGuideChoiceEnabled()) return false;
  titleGuideChoiceOpen = true;
  if (titleGuideSkipCheck) titleGuideSkipCheck.checked = false;
  document.body.classList.add('title-guide-choice-open');
  titleGuideChoice.classList.remove('hidden');
  titleGuideChoice.setAttribute('aria-hidden', 'false');
  setTimeout(function () {
    try { if (titleGuideShowBtn) titleGuideShowBtn.focus(); } catch (_) {}
  }, 0);
  return true;
}

function hideTitleGuideChoice() {
  titleGuideChoiceOpen = false;
  document.body.classList.remove('title-guide-choice-open');
  if (!titleGuideChoice) return;
  titleGuideChoice.classList.add('hidden');
  titleGuideChoice.setAttribute('aria-hidden', 'true');
}

function enterPuzzleAfterTitle(options) {
  options = options || {};
  hideTitleGuideChoice();
  if (titleScreen) titleScreen.classList.add('hidden');
  finishOpeningAndEnterGame(options);
}

function chooseTitleGuideAction(showPractice) {
  var skipNext = !!(titleGuideSkipCheck && titleGuideSkipCheck.checked);
  if (skipNext) setTitleGuideChoiceEnabled(false);
  enterPuzzleAfterTitle(showPractice ? { forceBasicPractice: true } : { skipBasicPractice: true });
}

function startFromTitleScreen(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (titleGuideChoiceOpen) return;
  getSfxCtx().resume().catch(() => {});
  if (showTitleGuideChoice()) return;
  enterPuzzleAfterTitle({ skipBasicPractice: true });
}

function finishOpeningAndEnterGame(options) {
  options = options || {};
  if (bgmEnabled) {
    bgmStarted = false;
    tryStartBgm();
  }

  if (options.forceBasicPractice || (!options.skipBasicPractice && isTitleGuideChoiceEnabled() && !hasSeenBasicPractice())) {
    clearCurrentPartnerSelection();
    showBasicPracticeIfNeeded(function () {
      maybeShowPartnerChoiceForCurrentStage();
    }, !!options.forceBasicPractice);
    return;
  }

  maybeShowPartnerChoiceForCurrentStage();
}

function getCurrentStageId() {
  var stage = STAGES[currentStageIndex] || null;
  return stage ? (stage.id != null ? stage.id : (currentStageIndex + 1)) : 1;
}

function hasAnyUnlockedPartner() {
  try {
    if (window.PonoPartners && typeof window.PonoPartners.hasAnyUnlocked === 'function') {
      return window.PonoPartners.hasAnyUnlocked();
    }
    if (window.PonoPartners && Array.isArray(window.PonoPartners.list)) {
      for (var i = 0; i < window.PonoPartners.list.length; i++) {
        if (window.PonoPartners.isUnlocked(window.PonoPartners.list[i])) return true;
      }
    }
  } catch (_) {}
  return false;
}

function readPartnerUnlockNoticeSeen() {
  try {
    var raw = localStorage.getItem(PARTNER_UNLOCK_NOTICE_KEY);
    return raw ? (JSON.parse(raw) || {}) : {};
  } catch (_) {
    return {};
  }
}

function writePartnerUnlockNoticeSeen(seen) {
  try { localStorage.setItem(PARTNER_UNLOCK_NOTICE_KEY, JSON.stringify(seen || {})); } catch (_) {}
}

function getUnlockedPartnersForNotice() {
  var out = [];
  try {
    if (window.PonoPartners && Array.isArray(window.PonoPartners.list)) {
      for (var i = 0; i < window.PonoPartners.list.length; i++) {
        var partner = window.PonoPartners.list[i];
        if (window.PonoPartners.isUnlocked(partner)) out.push(partner);
      }
    }
  } catch (_) {}
  return out;
}

function getNewPartnerUnlocksForNotice() {
  var seen = readPartnerUnlockNoticeSeen();
  return getUnlockedPartnersForNotice().filter(function (partner) {
    return partner && partner.id && !seen[partner.id];
  });
}

function markPartnerUnlockNoticeSeen(partners) {
  var seen = readPartnerUnlockNoticeSeen();
  for (var i = 0; i < (partners || []).length; i++) {
    var partner = partners[i];
    if (partner && partner.id) seen[partner.id] = 1;
  }
  writePartnerUnlockNoticeSeen(seen);
}

function removePartnerUnlockIntro(overlay) {
  if (!overlay) return;
  overlay.classList.add('is-hide');
  setTimeout(function () {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    try {
      if (!document.querySelector('.pono-pselect')) {
        document.body.classList.remove('partner-choice-ui-open');
      }
    } catch (_) {}
  }, 180);
}

function showPartnerUnlockIntro(partners, done) {
  partners = (partners || []).filter(Boolean);
  if (!partners.length) {
    if (typeof done === 'function') done();
    return;
  }
  try { document.body.classList.add('partner-choice-ui-open'); } catch (_) {}

  var overlay = document.createElement('div');
  overlay.className = 'partner-unlock-intro';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'あたらしい なかま');

  var panel = document.createElement('div');
  panel.className = 'partner-unlock-intro__panel';
  overlay.appendChild(panel);

  var burst = document.createElement('div');
  burst.className = 'partner-unlock-intro__burst';
  burst.setAttribute('aria-hidden', 'true');
  burst.textContent = '✦';
  panel.appendChild(burst);

  var title = document.createElement('div');
  title.className = 'partner-unlock-intro__title';
  title.textContent = partners.length > 1 ? 'なかまが ふえたよ' : (partners[0].name + 'が きたよ');
  panel.appendChild(title);

  var body = document.createElement('div');
  body.className = 'partner-unlock-intro__body';
  body.textContent = 'すすむと もっと なかまが ふえるよ';
  panel.appendChild(body);

  var list = document.createElement('div');
  list.className = 'partner-unlock-intro__list';
  for (var i = 0; i < partners.length; i++) {
    var partner = partners[i];
    var item = document.createElement('div');
    item.className = 'partner-unlock-intro__friend partner-unlock-intro__friend--' + (partner.tier || 'free');
    item.style.setProperty('--intro-delay', String(i * 95) + 'ms');
    var img = document.createElement('img');
    img.src = partner.image || '';
    img.alt = partner.name || '';
    item.appendChild(img);
    var name = document.createElement('span');
    name.textContent = partner.name || '';
    item.appendChild(name);
    list.appendChild(item);
  }
  panel.appendChild(list);

  var hint = document.createElement('div');
  hint.className = 'partner-unlock-intro__tiers';
  hint.innerHTML = '<span class="is-free">フリー</span><span class="is-book">えほん</span><span class="is-sub">サブスク</span>';
  panel.appendChild(hint);

  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'partner-unlock-intro__button';
  button.textContent = 'えらぶ';
  button.addEventListener('click', function (e) {
    e.preventDefault();
    markPartnerUnlockNoticeSeen(partners);
    removePartnerUnlockIntro(overlay);
    if (typeof done === 'function') {
      setTimeout(done, 150);
    }
  });
  panel.appendChild(button);

  document.body.appendChild(overlay);
  try { playFanfare(); } catch (_) {}
  setTimeout(function () {
    try { button.focus({ preventScroll: true }); } catch (_) {}
  }, 250);
}

function maybeShowPartnerUnlockIntro(stageId, done, options) {
  options = options || {};
  if (options.skipUnlockIntro) {
    if (typeof done === 'function') done();
    return;
  }
  var partners = getNewPartnerUnlocksForNotice();
  if (!partners.length) {
    if (typeof done === 'function') done();
    return;
  }
  showPartnerUnlockIntro(partners, done);
}

function clearCurrentPartnerSelection() {
  try {
    if (window.PonoBond && typeof window.PonoBond.clearSelectedPartner === 'function') {
      window.PonoBond.clearSelectedPartner();
    }
  } catch (_) {}
  try {
    if (window.PonoBondUI && typeof window.PonoBondUI.refreshBadge === 'function') {
      window.PonoBondUI.refreshBadge(null, getCurrentStageId());
    }
  } catch (_) {}
}

function confirmPartnerSelection(partnerId) {
  try {
    if (partnerId && window.PonoBond && typeof window.PonoBond.setSelectedPartner === 'function') {
      window.PonoBond.setSelectedPartner(partnerId);
    }
  } catch (_) {}
  // パートナー確定直後にヒント数を即時再計算 (キツネ +1 / ハリネズミ -1 を即反映)
  // setSelectedPartner 後でないと computeHintInitialUses が新しい partnerId を拾えない。
  try {
    var sidForHint = getCurrentStageIdForHint();
    if (sidForHint != null) {
      var recomputed = computeHintInitialUses(sidForHint);
      setHintUsesRemaining(sidForHint, recomputed);
    }
  } catch (_) {}
  try {
    if (typeof refreshHintButtonState === 'function') refreshHintButtonState();
  } catch (_) {}
  try {
    var stageId = getCurrentStageId();
    if (partnerId && window.PonoBondUI && typeof window.PonoBondUI.refreshBadge === 'function') {
      var partnerObj = (window.PonoPartners && window.PonoPartners.get)
        ? window.PonoPartners.get(partnerId)
        : null;
      if (partnerObj) window.PonoBondUI.refreshBadge(partnerObj, stageId);
    }
  } catch (_) {}
}

function maybeShowPartnerChoiceForCurrentStage(options) {
  options = options || {};
  var stageId = getCurrentStageId();
  if (getCurrentPartner()) return;
  if (partnerChoiceDismissedStageId === stageId && !options.force) return;
  if (!hasAnyUnlockedPartner()) {
    clearCurrentPartnerSelection();
    return;
  }
  try {
    if (window.PonoPartnerSelect && typeof window.PonoPartnerSelect.show === 'function') {
      var launchSelect = function (openOptions) {
        window.PonoPartnerSelect.show(stageId, handleChoice, {
          initialScrollLeft: (openOptions && openOptions.initialScrollLeft) || 0,
          focusPartnerId: (openOptions && openOptions.focusPartnerId) || null,
        });
      };
      var openSelect = function (openOptions) {
        maybeShowPartnerUnlockIntro(stageId, function () {
          launchSelect(openOptions);
        }, openOptions || {});
      };
      var handleChoice = function(result) {
        if (!result || result.action === 'cancel') {
          partnerChoiceDismissedStageId = stageId;
          clearCurrentPartnerSelection();
          return;
        }
        var selectedPartnerId = (typeof result === 'string') ? result : result.partnerId;
        if (!selectedPartnerId) {
          partnerChoiceDismissedStageId = stageId;
          clearCurrentPartnerSelection();
          return;
        }
        var scrollLeft = result.scrollLeft || 0;
        showPartnerPracticeForChoice(selectedPartnerId, {
          onConfirm: function () {
            partnerChoiceDismissedStageId = null;
            confirmPartnerSelection(selectedPartnerId);
          },
          onDone: function () {},
          onBack: function () {
            openSelect({
              initialScrollLeft: scrollLeft,
              focusPartnerId: selectedPartnerId,
              skipUnlockIntro: true,
            });
          },
        });
      };
      openSelect(options);
      return;
    }
  } catch (e) {
    try { console.warn('[PonoPartnerSelect] show failed:', e); } catch (_) {}
  }
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
function installAlbumMenuItem() {
  var dropdown = document.querySelector('.pono-dropdown');
  if (!dropdown || dropdown.querySelector('[data-puzzle-album-menu]')) return;

  var item = document.createElement('button');
  item.type = 'button';
  item.className = 'pono-dd-item';
  item.setAttribute('data-puzzle-album-menu', '1');
  item.innerHTML = '<span class="pono-dd-icon">📖</span><span class="pono-dd-label">もりのアルバム</span>';
  item.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    location.href = 'album.html';
  });
  dropdown.insertBefore(item, dropdown.firstChild);
}

function closePuzzleMenuDropdown() {
  var dropdown = document.querySelector('.pono-dropdown');
  var toggle = document.querySelector('.pono-menu-toggle');
  if (dropdown) dropdown.classList.remove('show');
  if (toggle) {
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
}

function refreshTitleGuideChoiceMenuItem() {
  var item = document.querySelector('[data-puzzle-title-guide-choice-menu]');
  if (!item) return;
  var on = isTitleGuideChoiceEnabled();
  var icon = item.querySelector('.pono-dd-icon');
  var label = item.querySelector('.pono-dd-label');
  if (icon) icon.textContent = on ? '🧩' : '⏭';
  if (label) label.textContent = on ? 'はじめの あそびかた ON' : 'はじめの あそびかた OFF';
  item.classList.toggle('bgm-off', !on);
}

function installTitleGuideChoiceMenuItem() {
  var dropdown = document.querySelector('.pono-dropdown');
  if (!dropdown || dropdown.querySelector('[data-puzzle-title-guide-choice-menu]')) return;

  var item = document.createElement('button');
  item.type = 'button';
  item.className = 'pono-dd-item';
  item.setAttribute('data-puzzle-title-guide-choice-menu', '1');
  item.innerHTML = '<span class="pono-dd-icon">🧩</span><span class="pono-dd-label">はじめの あそびかた ON</span>';
  item.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    setTitleGuideChoiceEnabled(!isTitleGuideChoiceEnabled());
    closePuzzleMenuDropdown();
  });

  var tutorialItem = Array.from(dropdown.querySelectorAll('.pono-dd-item')).find(function (button) {
    return button.textContent.indexOf('あそびかた') >= 0;
  });
  if (tutorialItem && tutorialItem.nextSibling) {
    dropdown.insertBefore(item, tutorialItem.nextSibling);
  } else {
    dropdown.appendChild(item);
  }
  refreshTitleGuideChoiceMenuItem();
}

function installPracticeResetMenuItem() {
  var dropdown = document.querySelector('.pono-dropdown');
  if (!dropdown || dropdown.querySelector('[data-puzzle-practice-reset-menu]')) return;

  var item = document.createElement('button');
  item.type = 'button';
  item.className = 'pono-dd-item';
  item.setAttribute('data-puzzle-practice-reset-menu', '1');
  item.innerHTML = '<span class="pono-dd-icon">🔁</span><span class="pono-dd-label">れんしゅうリセット</span>';
  item.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    closePuzzleMenuDropdown();
    resetPuzzlePracticeAndReplay();
  });

  var tutorialItem = Array.from(dropdown.querySelectorAll('.pono-dd-item')).find(function (button) {
    return button.textContent.indexOf('あそびかた') >= 0;
  });
  if (tutorialItem && tutorialItem.nextSibling) {
    dropdown.insertBefore(item, tutorialItem.nextSibling);
  } else {
    dropdown.appendChild(item);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Merge fixed stages with any saved drawings
  const drawingStages = loadDrawingStages();
  STAGES = [...BASE_STAGES, ...drawingStages];
  resizeObserver.observe(puzzleContainer);
  loadStage(0);

  if (titleScreen) {
    titleScreen.addEventListener('click', startFromTitleScreen);
  }
  if (titleGuideShowBtn) {
    titleGuideShowBtn.addEventListener('click', function (e) {
      e.preventDefault();
      chooseTitleGuideAction(true);
    });
  }
  if (titleGuideStartBtn) {
    titleGuideStartBtn.addEventListener('click', function (e) {
      e.preventDefault();
      chooseTitleGuideAction(false);
    });
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
      tutorial: function () {
        showBasicPracticeIfNeeded(function () {}, true);
      }
    });
    installAlbumMenuItem();
    installTitleGuideChoiceMenuItem();
    installPracticeResetMenuItem();
  }
});
