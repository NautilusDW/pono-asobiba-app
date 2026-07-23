// ── tsuri-kawa/js/logic.js ──
// ポノの かわづり: 「coreへのチューニング注入層」(DOM 非依存、node からも require 可能)。
// common/tsuri/core.js の状態機械そのものは一切変更せず、川づり固有のチューニング値
// (waitSecRange 等) と、保存キー `pono_tsuri_kawa_v1` のセーブ形状・正規化・
// 冪等な釣果反映だけをここに持つ。DOM/描画/入力/localStorage の実 I/O は
// js/game.js が担当する (hatake-nikki/js/logic.js と同じ役割分担)。
'use strict';

(function () {

  // ═══ 保存キー・形状 ═══════════════════════════════════════════════════
  var SAVE_KEY = 'pono_tsuri_kawa_v1';
  var SAVE_VERSION = 1;
  // catchLog は無限増大させない (既存ゲーム全般の規約)。直近 N 件で十分。
  var MAX_CATCH_LOG = 30;

  // 川は海より短くテンポよく釣れる、という企画書§2.1の方針。
  // 数値は「初期目安値」(実装者判断で微調整可、フィールド名は変更しないこと)。
  var WAIT_SEC_RANGE = [2, 5];
  // 2連続以上逃した直後の再キャストは、企画書§2.3「待ち時間半減で即・次のあたりへ」
  // を「次にキャストした時の待ちを短くする」という形で実現する (core.js の
  // cast() シグネチャ自体は waitSecRange を受け取るだけの契約なので変更不要)。
  var WAIT_SEC_RANGE_AFTER_MISS = [1, 2.5];

  // Phase 0 はのんびりモードのみ実際に使う (めいじんは Phase 2 以降)。
  var MODE = 'relaxed';

  function isFiniteNumber(v) {
    return typeof v === 'number' && isFinite(v);
  }

  // ═══ 魚データ参照 (common/tsuri/fish-data.js への依存を1箇所に集約) ═══
  function _getFishDataModule() {
    if (typeof window !== 'undefined' && window.PonoFishData) return window.PonoFishData;
    if (typeof require === 'function') {
      try { return require('../../common/tsuri/fish-data.js'); } catch (_e) { return null; }
    }
    return null;
  }

  /** 川づりで使う魚種プール。fish-data.js 未読込時は空配列 (呼び出し側は cast 不能として扱う)。 */
  function getSpeciesPool() {
    var mod = _getFishDataModule();
    if (!mod || !Array.isArray(mod.RIVER_SPECIES)) return [];
    // 契約上 RIVER_SPECIES は既に zones に 'river' を含む前提だが、
    // 念のため防御的にフィルタする (壊れたデータで川づりに海専用種が混入しない)。
    return mod.RIVER_SPECIES.filter(function (sp) {
      return sp && Array.isArray(sp.zones) && sp.zones.indexOf('river') !== -1;
    });
  }

  function getSpeciesById(id) {
    var mod = _getFishDataModule();
    if (mod && typeof mod.getSpeciesById === 'function') return mod.getSpeciesById(id);
    return null;
  }

  /** 次にキャストする際の waitSecRange。連続逃し中は短めにして「すぐ次のあたり」を作る。 */
  function nextWaitSecRange(consecutiveMisses) {
    return (isFiniteNumber(consecutiveMisses) && consecutiveMisses > 0)
      ? WAIT_SEC_RANGE_AFTER_MISS.slice()
      : WAIT_SEC_RANGE.slice();
  }

  // ═══ セーブ形状 ═══════════════════════════════════════════════════════
  function createDefaultSave() {
    return {
      version: SAVE_VERSION,
      mode: MODE,
      totalCatches: 0,
      catchLog: [],
      dailyAcornsGivenDate: null,
      dailyAcornsGivenCount: 0
    };
  }

  /** 壊れた JSON / 未知フィールドを含む生データを、クラッシュせず妥当な save に正規化する。 */
  function normalizeSave(raw) {
    var out = createDefaultSave();
    if (!raw || typeof raw !== 'object') return out;

    out.mode = raw.mode === 'expert' ? 'expert' : MODE;
    out.totalCatches = (isFiniteNumber(raw.totalCatches) && raw.totalCatches >= 0)
      ? Math.floor(raw.totalCatches) : 0;

    if (Array.isArray(raw.catchLog)) {
      var cleaned = [];
      for (var i = 0; i < raw.catchLog.length; i++) {
        var entry = raw.catchLog[i];
        if (!entry || typeof entry !== 'object') continue;
        if (typeof entry.opId !== 'string' || !entry.opId) continue;
        if (typeof entry.speciesId !== 'string' || !entry.speciesId) continue;
        cleaned.push({
          opId: entry.opId,
          speciesId: entry.speciesId,
          rarity: typeof entry.rarity === 'string' ? entry.rarity : 'normal',
          sizeCm: isFiniteNumber(entry.sizeCm) ? entry.sizeCm : null,
          caughtAt: isFiniteNumber(entry.caughtAt) ? entry.caughtAt : 0
        });
      }
      out.catchLog = cleaned.slice(-MAX_CATCH_LOG);
    }

    if (typeof raw.dailyAcornsGivenDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.dailyAcornsGivenDate)) {
      out.dailyAcornsGivenDate = raw.dailyAcornsGivenDate;
    }
    out.dailyAcornsGivenCount = (isFiniteNumber(raw.dailyAcornsGivenCount) && raw.dailyAcornsGivenCount >= 0)
      ? Math.floor(raw.dailyAcornsGivenCount) : 0;

    return out;
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /** ローカル日付キー (YYYY-MM-DD)。 */
  function todayDateKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function randomOpId() {
    return 'fishcatch:' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function randomSizeCm(species) {
    if (!species || !Array.isArray(species.sizeRangeCm) || species.sizeRangeCm.length !== 2) return null;
    var min = species.sizeRangeCm[0];
    var max = species.sizeRangeCm[1];
    if (!isFiniteNumber(min) || !isFiniteNumber(max)) return null;
    if (max < min) { var tmp = min; min = max; max = tmp; }
    return Math.round(min + Math.random() * (max - min));
  }

  /**
   * 釣果確定イベントを生成する (企画書§3.3のイベント形状に準拠)。
   * source は 'fishing_river' 固定 (川づりゲーム専用)。
   */
  function buildCatchEvent(species) {
    if (!species) return null;
    return {
      opId: randomOpId(),
      source: 'fishing_river',
      speciesId: species.id,
      rarity: species.rarity || 'normal',
      sizeCm: randomSizeCm(species),
      caughtAt: Date.now()
    };
  }

  /**
   * save に釣果イベントを冪等に反映する。同一 opId が既に catchLog にあれば no-op
   * (isNew:false) で返す。save を mutate せず新しいオブジェクトを返す。
   */
  function applyCatchEvent(save, event) {
    var base = normalizeSave(save);
    if (!event || typeof event.opId !== 'string' || !event.opId) {
      return { save: base, isNew: false };
    }
    for (var i = 0; i < base.catchLog.length; i++) {
      if (base.catchLog[i].opId === event.opId) {
        return { save: base, isNew: false }; // 既に反映済み (二重加算防止)
      }
    }
    var nextLog = base.catchLog.concat([{
      opId: event.opId,
      speciesId: event.speciesId,
      rarity: event.rarity || 'normal',
      sizeCm: isFiniteNumber(event.sizeCm) ? event.sizeCm : null,
      caughtAt: isFiniteNumber(event.caughtAt) ? event.caughtAt : Date.now()
    }]).slice(-MAX_CATCH_LOG);
    var next = {
      version: base.version,
      mode: base.mode,
      totalCatches: base.totalCatches + 1,
      catchLog: nextLog,
      dailyAcornsGivenDate: base.dailyAcornsGivenDate,
      dailyAcornsGivenCount: base.dailyAcornsGivenCount
    };
    return { save: next, isNew: true };
  }

  /**
   * どんぐり付与を自前記録する (addAcornsDaily 側の cap 8 と二重にならないよう
   * 「今日すでに何個渡したか」だけを保持する参考記録。 cap の正本は addAcornsDaily 側)。
   */
  function recordDailyAcornsGiven(save, grantedCount, dateKey) {
    var base = normalizeSave(save);
    var today = (typeof dateKey === 'string' && dateKey) ? dateKey : todayDateKey();
    var prevCount = (base.dailyAcornsGivenDate === today) ? base.dailyAcornsGivenCount : 0;
    var granted = isFiniteNumber(grantedCount) ? Math.max(0, Math.floor(grantedCount)) : 0;
    return {
      version: base.version,
      mode: base.mode,
      totalCatches: base.totalCatches,
      catchLog: base.catchLog,
      dailyAcornsGivenDate: today,
      dailyAcornsGivenCount: prevCount + granted
    };
  }

  // ═══ 公開 API ════════════════════════════════════════════════════════
  var api = {
    SAVE_KEY: SAVE_KEY,
    SAVE_VERSION: SAVE_VERSION,
    MAX_CATCH_LOG: MAX_CATCH_LOG,
    WAIT_SEC_RANGE: WAIT_SEC_RANGE,
    WAIT_SEC_RANGE_AFTER_MISS: WAIT_SEC_RANGE_AFTER_MISS,
    MODE: MODE,
    getSpeciesPool: getSpeciesPool,
    getSpeciesById: getSpeciesById,
    nextWaitSecRange: nextWaitSecRange,
    createDefaultSave: createDefaultSave,
    normalizeSave: normalizeSave,
    todayDateKey: todayDateKey,
    buildCatchEvent: buildCatchEvent,
    applyCatchEvent: applyCatchEvent,
    recordDailyAcornsGiven: recordDailyAcornsGiven
  };

  if (typeof window !== 'undefined') {
    window.TsuriKawaLogic = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
