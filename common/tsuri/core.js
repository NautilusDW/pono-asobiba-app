// ── common/tsuri/core.js ──
// ポノのつりゲーム 共有コア: 純粋ロジック (DOM 非依存)。
// DOM/描画/入力/セーブは各ゲームの js/logic.js + js/game.js が担当し、ここは
// node からも `require` できる純関数群のみを置く。トップレベルで document/window
// には一切触れないこと (guragura-seesaw/js/logic.js 冒頭の設計原則を踏襲)。
//
// 状態機械: cast → wait → bite(窓) → renda(連打ゲージ) → tug(オプショナル) → landed / escaped
// (企画書 docs/TSURI_FISHING_GAME_PLAN_2026-07-23.md §3.7/§9・§10確定ゲート項目3の
//  要求どおり、Phase 0 の確定 API 契約に「tug ステート(無効化フラグ付きスタブ)」を
//  含めた。 phase enum は
//  'idle'|'wait'|'bite'|'renda'|'tug'|'landed'|'escaped' の7つ。
//  tug 自体の挙動(左右ドラッグで魚の抵抗を押し返す等)は Phase 2 の実装対象であり、
//  ここでは状態名・関数シグネチャが Phase 2 で壊れないための骨組みのみを置く。
//  TUG_CONFIG.enabledDefault は Phase 0 では常に false なので、実際の
//  renda → tug 遷移は発生せず、既存の renda → landed / escaped の流れは不変
//  (2026-07-24: オーケストレーター確認済み・tugスタブ追加方針を確定し反映)。
'use strict';

// ═══ チューニング表 (数値は「初期目安値」、フィールド名は変更しないこと) ═══
var TUNING = Object.freeze({
  windowSec: { relaxed: 1.5, expert: 0.8 },        // 本あたり後のフッキング猶予(基本値)
  windowGraceSec: { relaxed: 0.5, expert: 0 },      // relaxedは実効2.0秒(猶予込み)
  gaugeFloorPct: 30,                                 // 連打ゲージが0まで落ちない床
  gaugeDecayPerSec: 4,                               // 放置時のゲージ減衰(gearMods.decayMulで補正、Phase0は1固定)
  assistDoubleWindowAfterMisses: 2,                  // 2連続逃し→3回目は窓2倍
  autoHookAfterMisses: 3,                            // 3連続逃し→4回目は自動フッキング(連打から開始)
  helpAfterFloorSec: 10,                             // 床到達から10秒でおたすけ発動(relaxedのみ)
  pityWindowBonusPctPerEscape: 20                    // 同一speciesを逃すたび窓+20%累積(super等の救済)
});

// 装備未実装 (Phase 0) の間、常にこれを gearMods として渡す。
var GEAR_MODS_NEUTRAL = Object.freeze({ windowMul: 1, gainMul: 1, decayMul: 1, lureTableId: null });

// ═══ tug ステート・スタブ設定 (企画書§3.7/§9: Phase 0 は常に無効) ═══
// TUNING 本体には入れない (TUNING は既存契約で形が固定済み・回帰テストが
// deepEqual で厳密比較しているため、新フィールド追加はその契約を壊す)。
// 独立の凍結定数として持つことで、Phase 0 の既存挙動を一切変えずに
// Phase 2 が「フラグを true 系に切り替えるだけ」で済むようにする。
var TUG_CONFIG = Object.freeze({
  enabledDefault: false // Phase 0 は常に false。 true化はPhase 2(左右ドラッグ実装)の仕事
});

/**
 * renda → tug 遷移を許可するかどうかを判定する骨組み。 TUG_CONFIG.enabledDefault
 * (グローバル既定) と gearMods.tugEnabled (将来 Phase 2/5 で装備やモード設定から
 * 生える想定のフィールド。 Phase 0 の GEAR_MODS_NEUTRAL には存在しないので常に
 * undefined) の両方を見る。 Phase 0 はどちらも真にならないため常に false を返し、
 * 呼び出し側の分岐は実質デッドコードのままになる(=既存フロー不変)。
 */
function isTugEnabled(gearMods) {
  var mods = gearMods || GEAR_MODS_NEUTRAL;
  return TUG_CONFIG.enabledDefault === true || mods.tugEnabled === true;
}

// ═══ 抽選補助定数 (TUNING には含めない = TUNING の形は契約どおり固定のため) ═══
// レアリティ既定重み。 Phase0の川5種は normal/rare のみ (super は未使用)。
var RARITY_BASE_WEIGHT = Object.freeze({ normal: 70, rare: 25, super: 5 });
// セッション内で既に釣った(landedした) speciesId は、再抽選時にこの倍率で重み減衰する
// (完全排除はしない = 図鑑コンプ待ちの子が同じ魚しか出ない詰みを作らない)。
var SESSION_DEDUPE_WEIGHT_MUL = 0.3;

// ═══ ヘルパー ════════════════════════════════════════════════════════
function toFiniteNumber(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

function clampMin(v, min) {
  return v < min ? min : v;
}

/** session を深く複製する (呼び出し側の state を絶対に mutate しないため)。 */
function cloneSession(session) {
  var s = session || {};
  return {
    speciesPool: (s.speciesPool || []).slice(),
    mode: s.mode === 'expert' ? 'expert' : 'relaxed',
    phase: s.phase || 'idle',
    speciesId: s.speciesId === undefined ? null : s.speciesId,
    waitRemainingSec: toFiniteNumber(s.waitRemainingSec),
    biteWindowRemainingSec: toFiniteNumber(s.biteWindowRemainingSec),
    gaugePct: toFiniteNumber(s.gaugePct),
    consecutiveMisses: toFiniteNumber(s.consecutiveMisses),
    pityBySpecies: Object.assign({}, s.pityBySpecies),
    sessionSeenIds: (s.sessionSeenIds || []).slice(),
    floorHeldSec: toFiniteNumber(s.floorHeldSec),
    caughtLog: (s.caughtLog || []).slice()
  };
}

// ═══ セッション生成 ══════════════════════════════════════════════════
/**
 * 新規セッション。 speciesPool/mode はここで固定し、以後 cast() が内部で参照する
 * (cast() 自体は speciesPool を引数に取らない契約のため)。
 */
function createSession(opts) {
  var o = opts || {};
  return {
    speciesPool: (o.speciesPool || []).slice(),
    mode: o.mode === 'expert' ? 'expert' : 'relaxed',
    phase: 'idle',
    speciesId: null,
    waitRemainingSec: 0,
    biteWindowRemainingSec: 0,
    gaugePct: 0,
    consecutiveMisses: 0,
    pityBySpecies: {},
    sessionSeenIds: [],
    floorHeldSec: 0,
    caughtLog: []
  };
}

// ═══ 抽選 ════════════════════════════════════════════════════════════
/**
 * speciesPool + sessionSeenIds から、種ごとの選択確率 (0〜1、合計1) を解析的に
 * 計算する純関数。 pickSpecies() の内部でも使うが、テスト側が Math.random に
 * 依存せず抽選ロジックを検証できるよう公開もしている(統計サンプリングによる
 * flaky テストを避ける狙い)。
 *
 * アルゴリズム: (1) プールに存在するレアリティだけで RARITY_BASE_WEIGHT を
 * 相対比較 (2) 同一レアリティ内では species.weight の比率で配分
 * (3) sessionSeenIds に含まれる種は SESSION_DEDUPE_WEIGHT_MUL を掛けて重み減衰。
 */
function computeSpeciesProbabilities(speciesPool, sessionSeenIds) {
  var pool = speciesPool || [];
  var seen = sessionSeenIds || [];
  var probs = {};
  if (!pool.length) return probs;

  var byRarity = {};
  var rarityOrder = [];
  for (var i = 0; i < pool.length; i++) {
    var sp = pool[i];
    if (!byRarity[sp.rarity]) {
      byRarity[sp.rarity] = [];
      rarityOrder.push(sp.rarity);
    }
    byRarity[sp.rarity].push(sp);
  }

  var rarityWeights = rarityOrder.map(function (r) {
    return RARITY_BASE_WEIGHT.hasOwnProperty(r) ? RARITY_BASE_WEIGHT[r] : 1;
  });
  var rarityTotal = rarityWeights.reduce(function (a, b) { return a + b; }, 0);

  rarityOrder.forEach(function (r, idx) {
    var rarityShare = rarityTotal > 0 ? rarityWeights[idx] / rarityTotal : 0;
    var speciesInRarity = byRarity[r];
    var speciesWeights = speciesInRarity.map(function (sp) {
      var w = typeof sp.weight === 'number' && sp.weight > 0 ? sp.weight : 1;
      if (seen.indexOf(sp.id) !== -1) w *= SESSION_DEDUPE_WEIGHT_MUL;
      return w;
    });
    var speciesTotal = speciesWeights.reduce(function (a, b) { return a + b; }, 0);
    speciesInRarity.forEach(function (sp, i) {
      var share = speciesTotal > 0 ? speciesWeights[i] / speciesTotal : 0;
      probs[sp.id] = rarityShare * share;
    });
  });

  return probs;
}

/**
 * 加重抽選で1種を選ぶ。 pityBySpecies は今回 (Phase0) は抽選そのものには使わず、
 * tick() 側の bite 窓計算にのみ使う契約 (pity=窓を広げる、出現率には介入しない)。
 * シグネチャに残してあるのは契約どおり + 将来の拡張余地のため。
 */
function pickSpecies(speciesPool, pityBySpecies, sessionSeenIds) { // eslint-disable-line no-unused-vars
  var pool = speciesPool || [];
  if (!pool.length) return null;
  var probs = computeSpeciesProbabilities(pool, sessionSeenIds);
  var total = 0;
  for (var i = 0; i < pool.length; i++) total += (probs[pool[i].id] || 0);
  if (total <= 0) return pool[0].id;
  var r = Math.random() * total;
  var acc = 0;
  for (var j = 0; j < pool.length; j++) {
    acc += (probs[pool[j].id] || 0);
    if (r < acc) return pool[j].id;
  }
  return pool[pool.length - 1].id;
}

// ═══ セッション進行 (cast / tick / tapHook / tapRenda) ════════════════

/**
 * idle/landed/escaped から wait へ。 それ以外のフェーズ中の呼び出しは無視する
 * (キャスト中の演出やめいろ的な多重発火を防ぐ、UI側でもボタン無効化はする想定)。
 */
function cast(session, opts) {
  var next = cloneSession(session);
  if (next.phase !== 'idle' && next.phase !== 'landed' && next.phase !== 'escaped') {
    return next;
  }
  var o = opts || {};
  var range = o.waitSecRange || [2, 5];
  var min = toFiniteNumber(range[0]);
  var max = toFiniteNumber(range[1]);
  if (max < min) { var tmp = min; min = max; max = tmp; }

  next.speciesId = pickSpecies(next.speciesPool, next.pityBySpecies, next.sessionSeenIds);
  next.waitRemainingSec = min + Math.random() * (max - min);
  next.biteWindowRemainingSec = 0;
  next.gaugePct = 0;
  next.floorHeldSec = 0;
  next.phase = 'wait';
  return next;
}

/** wait 終了時のフッキング猶予(秒)を計算する。 pity/assist/gearMods を全て反映済み。 */
function computeBiteWindowSec(mode, gearMods, pityPct, consecutiveMisses) {
  var base = TUNING.windowSec[mode] + TUNING.windowGraceSec[mode];
  var assistMul = consecutiveMisses === TUNING.assistDoubleWindowAfterMisses ? 2 : 1;
  var pityMul = 1 + (toFiniteNumber(pityPct) / 100);
  var windowMul = gearMods && typeof gearMods.windowMul === 'number' ? gearMods.windowMul : 1;
  return base * windowMul * assistMul * pityMul;
}

/**
 * 経過時間 dtSec を1フェーズぶんだけ進める純関数。 gearMods 省略時は
 * GEAR_MODS_NEUTRAL を使う。 idle/landed/escaped では何もしない
 * (次に進めるには呼び出し側が cast() を呼ぶ)。
 */
function tick(session, dtSec, gearMods) {
  var next = cloneSession(session);
  var mods = gearMods || GEAR_MODS_NEUTRAL;
  var dt = clampMin(toFiniteNumber(dtSec), 0);

  if (next.phase === 'wait') {
    next.waitRemainingSec -= dt;
    if (next.waitRemainingSec <= 0) {
      next.waitRemainingSec = 0;
      if (next.consecutiveMisses >= TUNING.autoHookAfterMisses) {
        // 3連続逃し→4回目は自動フッキング(連打から開始)。 モード設定に関係なく発動。
        next.phase = 'renda';
        next.gaugePct = 0;
        next.floorHeldSec = 0;
      } else {
        var pityPct = next.pityBySpecies[next.speciesId] || 0;
        next.biteWindowRemainingSec = computeBiteWindowSec(next.mode, mods, pityPct, next.consecutiveMisses);
        next.phase = 'bite';
      }
    }
    return next;
  }

  if (next.phase === 'bite') {
    next.biteWindowRemainingSec -= dt;
    if (next.biteWindowRemainingSec <= 0) {
      next.biteWindowRemainingSec = 0;
      next.phase = 'escaped';
      next.consecutiveMisses += 1;
      var prevPity = next.pityBySpecies[next.speciesId] || 0;
      next.pityBySpecies[next.speciesId] = prevPity + TUNING.pityWindowBonusPctPerEscape;
    }
    return next;
  }

  if (next.phase === 'renda') {
    var decayMul = typeof mods.decayMul === 'number' ? mods.decayMul : 1;
    var decay = TUNING.gaugeDecayPerSec * decayMul * dt;
    // 床(gaugeFloorPct)より下には絶対に落とさない(初期値0からの最初のtickでも
    // 床まで即座に持ち上がる=「連打ゲージが0まで落ちない」契約どおりの挙動)。
    next.gaugePct = Math.max(next.gaugePct - decay, TUNING.gaugeFloorPct);
    if (next.gaugePct <= TUNING.gaugeFloorPct) {
      next.floorHeldSec += dt;
    } else {
      next.floorHeldSec = 0;
    }
    if (next.mode === 'relaxed' && next.floorHeldSec >= TUNING.helpAfterFloorSec) {
      // NOTE(tugスタブ骨組み・Phase 2で中身実装予定): isTugEnabled() が true を
      // 返すようになったら、ここで landed に直行せず 'tug' へ一旦遷移させる
      // (企画書§3.7: renda → tug(オプショナル) → landed/escaped)。
      // Phase 0 は isTugEnabled() が常に false を返すため、この分岐は素通りし
      // 以下のおたすけ→landed直行フローは一切変わらない。
      if (isTugEnabled(mods)) {
        // Phase 2 で実装: next.phase = 'tug'; のような遷移をここに追加する。
        // Phase 0 では到達しない(TUG_CONFIG.enabledDefault===false)。
      }
      // おたすけ: ポノが一緒に引いて自動で釣り上がる(のんびりのみ)。
      next.gaugePct = 100;
      next.phase = 'landed';
      next.consecutiveMisses = 0;
      next.floorHeldSec = 0;
      markLanded(next);
    }
    return next;
  }

  return next; // idle/landed/escaped: 何もしない
}

/** landed 確定時の共通後処理 (sessionSeenIds 追記 + caughtLog 追記)。 next を mutate する。 */
function markLanded(next) {
  if (next.sessionSeenIds.indexOf(next.speciesId) === -1) {
    next.sessionSeenIds = next.sessionSeenIds.concat([next.speciesId]);
  }
  next.caughtLog = next.caughtLog.concat([{ speciesId: next.speciesId, at: Date.now() }]);
}

/**
 * phase==='bite' の時だけ有効。 早い/遅いを問わず窓が開いていれば即 renda へ。
 * それ以外のフェーズでは no-op (早すぎタップを失敗にしない、の実装)。
 */
function tapHook(session) {
  var next = cloneSession(session);
  if (next.phase !== 'bite') return next;
  next.phase = 'renda';
  next.gaugePct = 0;
  next.floorHeldSec = 0;
  next.biteWindowRemainingSec = 0;
  return next;
}

/**
 * phase==='renda' の時だけ有効。 gaugePct を species.challengeProfile.tapsBase
 * ベースで加算し、100超えで landed へ。 consecutiveMisses は landed で0にリセット。
 */
function tapRenda(session, species, gearMods) {
  var next = cloneSession(session);
  if (next.phase !== 'renda') return next;
  var mods = gearMods || GEAR_MODS_NEUTRAL;
  var gainMul = typeof mods.gainMul === 'number' ? mods.gainMul : 1;
  var tapsBase = (species && species.challengeProfile && species.challengeProfile.tapsBase) || 1;
  var gain = (100 / tapsBase) * gainMul;
  next.gaugePct = next.gaugePct + gain;
  next.floorHeldSec = 0; // タップがあった=床に留まっていない
  if (next.gaugePct >= 100) {
    next.gaugePct = 100;
    next.phase = 'landed';
    next.consecutiveMisses = 0;
    next.floorHeldSec = 0;
    markLanded(next);
  }
  return next;
}

/** phase が 'landed' または 'escaped' なら true。 */
function isTerminal(session) {
  return !!session && (session.phase === 'landed' || session.phase === 'escaped');
}

// ═══ 公開 API ════════════════════════════════════════════════════════
var PUBLIC_API = {
  TUNING: TUNING,
  GEAR_MODS_NEUTRAL: GEAR_MODS_NEUTRAL,
  RARITY_BASE_WEIGHT: RARITY_BASE_WEIGHT,
  SESSION_DEDUPE_WEIGHT_MUL: SESSION_DEDUPE_WEIGHT_MUL,
  TUG_CONFIG: TUG_CONFIG,
  isTugEnabled: isTugEnabled,
  createSession: createSession,
  cast: cast,
  tick: tick,
  tapHook: tapHook,
  tapRenda: tapRenda,
  isTerminal: isTerminal,
  pickSpecies: pickSpecies,
  computeSpeciesProbabilities: computeSpeciesProbabilities,
  computeBiteWindowSec: computeBiteWindowSec
};

if (typeof window !== 'undefined') {
  window.PonoTsuriCore = PUBLIC_API;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PUBLIC_API;
}
