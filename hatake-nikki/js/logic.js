// ── hatake-nikki/js/logic.js ──
// ポノのはたけにっき: 純粋ロジック (DOM 非依存)。
// DOM/描画/入力は js/game.js が担当し、ここは node からも `require` できる
// 純関数群のみを置く。トップレベルで document/window の DOM API には一切触れないこと。
//
// NOTE: cloud-sync (端末間同期) は意図的にスコープ外。localStorage のみで完結。
// 将来 common/cloud-sync.js に統合する場合は lastSeenKey ベースの単調マージを検討
// (時刻チートは種解放が早まる程度なので防御しない)。
'use strict';

(function () {

  // ═══ 時刻抽象化 (Date.now() / new Date() の直接呼び出しはこのブロック内のみ) ═══
  var _nowOverride = null; // テスト専用。本番は常に null

  /** 現在時刻を返す。setNowForTest() で注入された値があればそれを複製して返す。 */
  function getNow() {
    return _nowOverride ? new Date(_nowOverride.getTime()) : new Date();
  }

  /** テスト用: 時刻を固定する。null を渡すと実時刻に戻る。 */
  function setNowForTest(d) {
    _nowOverride = d ? new Date(d.getTime()) : null;
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /** ローカル日付キー (YYYY-MM-DD)。toISOString は UTC ズレするので使用禁止。 */
  function dateKey(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /** dateKey 文字列を「その日の正午」の Date にパースする (DST 安全)。 */
  function _parseKeyToNoon(key) {
    var p = String(key).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0, 0);
  }

  /** dateKey に n日 (負値可) を加算した新しい dateKey を返す。 */
  function addDaysKey(key, n) {
    var p = String(key).split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    d.setDate(d.getDate() + Number(n));
    return dateKey(d);
  }

  /** keyA → keyB の日数差 (keyB が未来なら正の値)。ローカル正午基準で丸めるので DST 安全。 */
  function daysBetween(keyA, keyB) {
    var a = _parseKeyToNoon(keyA).getTime();
    var b = _parseKeyToNoon(keyB).getTime();
    return Math.round((b - a) / 86400000);
  }

  /** 決定論的ハッシュ (32bit FNV-1a 相当)。同一入力で常に同値を返す。 */
  function hashCode(str) {
    var s = String(str);
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  // ═══ 作物マスタ ═══
  var CROPS = {
    tomato: {
      id: 'tomato',
      name: 'とまと',
      inventoryId: 'tomato',
      img: '../assets/images/hatake-nikki/crops/tomato_stage_4_ready.webp',
      seedChoiceImg: '../assets/images/hatake-nikki/crops/tomato_seed_choice.webp',
      signImg: '../assets/images/hatake-nikki/crop_sign_tomato_iso_v3.webp',
      stageImages: [
        '../assets/images/hatake-nikki/crops/tomato_stage_0_seed.webp',
        '../assets/images/hatake-nikki/crops/tomato_stage_1_sprout.webp',
        '../assets/images/hatake-nikki/crops/tomato_stage_2_young.webp',
        '../assets/images/hatake-nikki/crops/tomato_stage_3_forming.webp',
        '../assets/images/hatake-nikki/crops/tomato_stage_4_ready.webp'
      ],
      progressThresholds: [1, 3, 5, 6],
      recipeIds: ['tomato']
    },
    ninjin: {
      id: 'ninjin',
      name: 'にんじん',
      inventoryId: 'carrot',
      img: '../assets/images/hatake-nikki/crops/ninjin_stage_4_ready.webp',
      seedChoiceImg: '../assets/images/hatake-nikki/crops/ninjin_seed_choice.webp',
      signImg: '../assets/images/hatake-nikki/crop_sign_ninjin_iso_v3.webp',
      stageImages: [
        '../assets/images/hatake-nikki/crops/ninjin_stage_0_seed.webp',
        '../assets/images/hatake-nikki/crops/ninjin_stage_1_sprout.webp',
        '../assets/images/hatake-nikki/crops/ninjin_stage_2_young.webp',
        '../assets/images/hatake-nikki/crops/ninjin_stage_3_forming.webp',
        '../assets/images/hatake-nikki/crops/ninjin_stage_4_ready.webp'
      ],
      progressThresholds: [1, 3, 5, 6],
      recipeIds: ['ninjin_ingen', 'kinpira', 'potato_salad', 'harumaki']
    },
    potato: {
      id: 'potato',
      name: 'じゃがいも',
      inventoryId: 'potato',
      img: '../assets/images/hatake-nikki/crops/potato_stage_4_ready.webp',
      seedChoiceImg: '../assets/images/hatake-nikki/crops/potato_seed_choice.webp',
      signImg: '../assets/images/hatake-nikki/crop_sign_potato_iso_v3.webp',
      stageImages: [
        '../assets/images/hatake-nikki/crops/potato_stage_0_seed.webp',
        '../assets/images/hatake-nikki/crops/potato_stage_1_sprout.webp',
        '../assets/images/hatake-nikki/crops/potato_stage_2_young.webp',
        '../assets/images/hatake-nikki/crops/potato_stage_3_forming.webp',
        '../assets/images/hatake-nikki/crops/potato_stage_4_ready.webp'
      ],
      progressThresholds: [1, 3, 5, 6],
      recipeIds: ['korokke', 'potato_salad']
    },
    onion: {
      id: 'onion',
      name: 'たまねぎ',
      inventoryId: 'onion',
      img: '../assets/images/hatake-nikki/crops/onion_stage_4_ready.webp',
      seedChoiceImg: '../assets/images/hatake-nikki/crops/onion_seed_choice.webp',
      signImg: '../assets/images/hatake-nikki/crop_sign_onion_iso_v3.webp',
      stageImages: [
        '../assets/images/hatake-nikki/crops/onion_stage_0_seed.webp',
        '../assets/images/hatake-nikki/crops/onion_stage_1_sprout.webp',
        '../assets/images/hatake-nikki/crops/onion_stage_2_young.webp',
        '../assets/images/hatake-nikki/crops/onion_stage_3_forming.webp',
        '../assets/images/hatake-nikki/crops/onion_stage_4_ready.webp'
      ],
      progressThresholds: [1, 3, 5, 6],
      recipeIds: ['hamburg', 'meatball', 'napolitan']
    }
  };
  var PLOT_COUNT = 9;

  /** 空の plot を生成する。 */
  function emptyPlot() {
    return { seedId: null, daysGrown: 0, wateredToday: false, wilted: false, bug: false };
  }

  function emptyPlots() {
    var plots = [];
    for (var i = 0; i < PLOT_COUNT; i++) plots.push(emptyPlot());
    return plots;
  }

  /** 新規ゲーム状態を生成する (最初から使えるplot 9枠)。 */
  function createInitialState(todayKey) {
    return { lastSeenKey: todayKey, plots: emptyPlots() };
  }

  /**
   * 日数と当日の水やりを、見た目用の「おせわ進行」へ変換する。
   * 1日を2目盛りにし、水やり直後の奇数目盛りで新しい絵を即時表示する。
   * 翌日の rollover では daysGrown+1 / wateredToday=false となって同じ偶数目盛りへ
   * 移るため、画像が元へ戻らない。3日の実待ちの中で5枚を順に見せられる。
   */
  function careProgressOf(plot) {
    if (!plot || !plot.seedId) return -1;
    var dg = (typeof plot.daysGrown === 'number' && isFinite(plot.daysGrown) && plot.daysGrown >= 0)
      ? plot.daysGrown : 0;
    return dg * 2 + (plot.wateredToday ? 1 : 0);
  }

  /** plot の成長段階 (0=たね,1=め,2=小さな株,3=できはじめ,4=しゅうかくOK)。未植栽は -1。 */
  function stageOf(plot) {
    if (!plot || !plot.seedId) return -1;
    var crop = CROPS[plot.seedId];
    if (!crop) return -1;
    var th = crop.progressThresholds;
    var progress = careProgressOf(plot);
    if (progress >= th[3]) return 4;
    if (progress >= th[2]) return 3;
    if (progress >= th[1]) return 2;
    if (progress >= th[0]) return 1;
    return 0;
  }

  /** 空 plot にのみ種を植える。成功時 true。 */
  function plantSeed(state, plotIdx, seedId) {
    if (!state || !state.plots || !state.plots[plotIdx]) return false;
    var plot = state.plots[plotIdx];
    if (plot.seedId) return false; // 既に何か植わっている
    if (!CROPS[seedId]) return false;
    plot.seedId = seedId;
    plot.daysGrown = 0;
    plot.wateredToday = false;
    plot.wilted = false;
    plot.bug = false;
    return true;
  }

  /** 水やり (冪等)。植栽済みの plot のみ有効。 */
  function waterPlot(state, plotIdx) {
    if (!state || !state.plots || !state.plots[plotIdx]) return false;
    var plot = state.plots[plotIdx];
    if (!plot.seedId) return false;
    plot.wateredToday = true;
    plot.wilted = false;
    return true;
  }

  /** 虫を追い払う。 */
  function shooBug(state, plotIdx) {
    if (!state || !state.plots || !state.plots[plotIdx]) return false;
    state.plots[plotIdx].bug = false;
    return true;
  }

  /** stage4 (しゅうかくOK) のみ収穫成功。plot は空に戻る。 */
  function harvest(state, plotIdx) {
    if (!state || !state.plots || !state.plots[plotIdx]) return { ok: false };
    var plot = state.plots[plotIdx];
    if (stageOf(plot) !== 4) return { ok: false };
    var seedId = plot.seedId;
    state.plots[plotIdx] = emptyPlot();
    return { ok: true, seedId: seedId };
  }

  /**
   * 虫が発生するかどうかを決定論的に判定する。
   * stage>=1 (め以上) の plot にのみ湧く。虫は成長を阻害しない演出専用フラグ。
   */
  function bugShouldSpawn(dateKey_, plotIdx, plot) {
    if (stageOf(plot) < 1) return false;
    return hashCode(dateKey_ + ':' + plotIdx) % 3 === 0;
  }

  /**
   * 1日分のロールオーバーを実施する (§2.2)。
   * 1. wateredToday===true → daysGrown+=1, wilted=false
   * 2. wateredToday===false かつ植栽済み → wilted=true (daysGrown は不変・枯れない)
   * 3. wateredToday を false にリセット
   * 4. 虫発生判定 (stage>=1 の plot に決定論ハッシュで抽選)
   */
  function advanceOneDay(state, newDayKey) {
    if (!state || !state.plots) return state;
    for (var i = 0; i < state.plots.length; i++) {
      var plot = state.plots[i];
      if (plot.seedId) {
        if (plot.wateredToday) {
          plot.daysGrown = (plot.daysGrown || 0) + 1;
          plot.wilted = false;
        } else {
          plot.wilted = true;
        }
      }
      plot.wateredToday = false;
      plot.bug = plot.seedId ? bugShouldSpawn(newDayKey, i, plot) : false;
    }
    state.lastSeenKey = newDayKey;
    return state;
  }

  /**
   * 複数日キャッチアップ (§2.3、最重要)。
   * state.lastSeenKey と todayKey の差分日数 n を求め、n>=1 なら advanceOneDay を
   * 1日ずつ逐次呼ぶ (ジャンプ計算禁止)。todayKey が過去 (時計巻き戻し) の場合は
   * no-op (state 不変・例外なし)。
   */
  function catchUpDays(state, todayKey) {
    if (!state) return { daysPassed: 0, events: [] };
    var n = daysBetween(state.lastSeenKey, todayKey);
    if (n <= 0) return { daysPassed: 0, events: [] };
    var events = [];
    for (var i = 1; i <= n; i++) {
      var nextKey = addDaysKey(state.lastSeenKey, 1);
      advanceOneDay(state, nextKey);
      events.push({ dateKey: nextKey });
    }
    return { daysPassed: n, events: events };
  }

  /** 壊れた/未知フィールドを含む plot 生データを妥当な plot に正規化する。 */
  function _normalizePlot(p) {
    var e = emptyPlot();
    if (!p || typeof p !== 'object') return e;
    if (typeof p.seedId === 'string' && CROPS[p.seedId]) e.seedId = p.seedId;
    if (!e.seedId) return e; // 未植栽なら以降のフィールドは意味を持たないので初期値のまま
    e.daysGrown = (typeof p.daysGrown === 'number' && isFinite(p.daysGrown) && p.daysGrown >= 0) ? p.daysGrown : 0;
    e.wateredToday = !!p.wateredToday;
    e.wilted = !!p.wilted;
    e.bug = !!p.bug;
    return e;
  }

  /**
   * localStorage から読み込んだ生データ (壊れたJSON parse後の値/未知フィールド/
   * plots欠損など) を、クラッシュせず妥当な state に正規化する (セーブ復元耐性)。
   */
  function normalizeState(raw) {
    var todayKey = dateKey(getNow());
    var out = { lastSeenKey: todayKey, plots: emptyPlots() };
    if (raw && typeof raw === 'object') {
      if (typeof raw.lastSeenKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.lastSeenKey)) {
        out.lastSeenKey = raw.lastSeenKey;
      }
      if (Array.isArray(raw.plots)) {
        // 旧3／4区画セーブは既存indexをそのまま保ち、9枠まで空畑で補う。
        // 10枠以上の未知データは、固定9区画の範囲外なので決定論的に切り捨てる。
        for (var i = 0; i < PLOT_COUNT; i++) {
          out.plots[i] = _normalizePlot(raw.plots[i]);
        }
      }
    }
    return out;
  }

  // ═══ ブラウザ / node 両対応公開 ═══
  var api = {
    getNow: getNow,
    setNowForTest: setNowForTest,
    dateKey: dateKey,
    addDaysKey: addDaysKey,
    daysBetween: daysBetween,
    hashCode: hashCode,
    CROPS: CROPS,
    PLOT_COUNT: PLOT_COUNT,
    createInitialState: createInitialState,
    emptyPlot: emptyPlot,
    careProgressOf: careProgressOf,
    stageOf: stageOf,
    plantSeed: plantSeed,
    waterPlot: waterPlot,
    shooBug: shooBug,
    harvest: harvest,
    bugShouldSpawn: bugShouldSpawn,
    advanceOneDay: advanceOneDay,
    catchUpDays: catchUpDays,
    normalizeState: normalizeState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.HatakeLogic = api;
  }
})();
