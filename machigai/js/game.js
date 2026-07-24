/* まちがいさがしランド — game.js
 * engine担当。まちがいさがしのコアロジック（当たり判定・進行・星評価・進捗保存）。
 * DOM操作は一切行わない。window.MSL.Game に公開する。
 */
(function () {
  'use strict';

  var PROGRESS_KEY = 'msl_progress_v1';
  var HINT_COOLDOWN_MS = 5000;
  var HINT_GLOW_MS = 2000;
  var WRONG_STREAK_FOR_HINT_GLOW = 3;
  var MIN_EFFECTIVE_RADIUS = 0.055;
  var RADIUS_MULTIPLIER = 1.15;

  /* ---------- ステージデータアクセス（STAGE_DATA未定義でも安全） ---------- */

  function isDataReady() {
    return !!(
      window.STAGE_DATA &&
      Array.isArray(window.STAGE_DATA.stages) &&
      window.STAGE_DATA.stages.length > 0
    );
  }

  function getStages() {
    if (!isDataReady()) return [];
    return window.STAGE_DATA.stages;
  }

  function getStageById(id) {
    var stages = getStages();
    for (var i = 0; i < stages.length; i++) {
      if (stages[i].id === id) return stages[i];
    }
    return null;
  }

  function getNextStage(id) {
    var stages = getStages();
    var idx = -1;
    for (var i = 0; i < stages.length; i++) {
      if (stages[i].id === id) {
        idx = i;
        break;
      }
    }
    if (idx < 0 || idx + 1 >= stages.length) return null;
    return stages[idx + 1];
  }

  /* ---------- 進捗保存（localStorage、ステージ別ベスト星） ---------- */

  function loadProgress() {
    try {
      var raw = window.localStorage.getItem(PROGRESS_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress(progress) {
    try {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {
      /* 保存できなくても続行 */
    }
  }

  function getBestStars(stageId) {
    var p = loadProgress();
    return typeof p[stageId] === 'number' ? p[stageId] : 0;
  }

  function saveBestStars(stageId, stars) {
    var p = loadProgress();
    var current = typeof p[stageId] === 'number' ? p[stageId] : 0;
    if (stars > current) {
      p[stageId] = stars;
      saveProgress(p);
      return stars;
    }
    return current;
  }

  /* ---------- ゲームセッション（1ステージぶんの進行管理） ---------- */

  /**
   * @param {object} stageData window.STAGE_DATA.stages[n] 相当のオブジェクト
   */
  function createSession(stageData) {
    var diffs = (stageData.differences || []).map(function (d) {
      return {
        x: d.x,
        y: d.y,
        r: d.r,
        label: d.label,
        found: false
      };
    });

    var state = {
      stage: stageData,
      diffs: diffs,
      total: diffs.length,
      foundCount: 0,
      wrongStreak: 0,
      hintCount: 0
    };

    /** 正規化座標(0-1)のタップ判定。最も近い未発見の円がヒットすれば見つけた扱いにする */
    function checkHit(nx, ny) {
      var bestIndex = -1;
      var bestDist = Infinity;
      for (var i = 0; i < state.diffs.length; i++) {
        var d = state.diffs[i];
        if (d.found) continue;
        var dist = Math.hypot(nx - d.x, ny - d.y);
        var effR = Math.max(d.r * RADIUS_MULTIPLIER, MIN_EFFECTIVE_RADIUS);
        if (dist <= effR && dist < bestDist) {
          bestDist = dist;
          bestIndex = i;
        }
      }
      if (bestIndex >= 0) {
        state.diffs[bestIndex].found = true;
        state.foundCount++;
        state.wrongStreak = 0;
        return { hit: true, index: bestIndex, diff: state.diffs[bestIndex] };
      }
      state.wrongStreak++;
      return { hit: false, wrongStreak: state.wrongStreak };
    }

    function shouldPromptHint() {
      return state.wrongStreak >= WRONG_STREAK_FOR_HINT_GLOW;
    }

    function isComplete() {
      return state.foundCount >= state.total && state.total > 0;
    }

    /** 未発見の違いを1つ返す（無ければnull）。ヒント用 */
    function getHintTarget() {
      for (var i = 0; i < state.diffs.length; i++) {
        if (!state.diffs[i].found) return state.diffs[i];
      }
      return null;
    }

    function useHint() {
      var target = getHintTarget();
      if (target) state.hintCount++;
      return target;
    }

    /** ヒント使用回数から星評価を算出（0回=3 / 1〜2回=2 / 3回以上=1） */
    function computeStars() {
      if (state.hintCount === 0) return 3;
      if (state.hintCount <= 2) return 2;
      return 1;
    }

    return {
      state: state,
      checkHit: checkHit,
      shouldPromptHint: shouldPromptHint,
      isComplete: isComplete,
      getHintTarget: getHintTarget,
      useHint: useHint,
      computeStars: computeStars
    };
  }

  window.MSL = window.MSL || {};
  window.MSL.Game = {
    HINT_COOLDOWN_MS: HINT_COOLDOWN_MS,
    HINT_GLOW_MS: HINT_GLOW_MS,
    isDataReady: isDataReady,
    getStages: getStages,
    getStageById: getStageById,
    getNextStage: getNextStage,
    getBestStars: getBestStars,
    saveBestStars: saveBestStars,
    createSession: createSession
  };
})();
