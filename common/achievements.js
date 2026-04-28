// ─── ポノのおへや 実績アンロックシステム ──────────────────────────────
// 全ゲームで <script src="../common/achievements.js"></script> として読み込む
// window.incrementStat(key, amount) でゲーム内統計をインクリメント
// → 自動で実績チェック → 解除時にポップアップ演出
(function () {
  'use strict';

  // ═══ 実績定義 ═══════════════════════════════════════════════════════
  var ACHIEVEMENTS = [
    // ── はじめて系（一回きり）───────────────────────────────────
    { id: 'first_login',     game: 'common',    name: 'はじめてのログイン',     desc: 'サイトを ひらこう',              target: 1, stat: 'login_first',       tier: 1, reward: { type: 'furn', id: 'ach_small_chair' } },
    { id: 'first_profile',   game: 'common',    name: 'なまえを きめた',       desc: 'プロフィールを せっていしよう',   target: 1, stat: 'profile_set',       tier: 1, reward: { type: 'furn', id: 'ach_pono_cushion' } },
    // 無料ゲームの報酬は furn (お部屋のかざり) に統一 (水族館は有料コンテンツのため)
    { id: 'first_puzzle',    game: 'puzzle',    name: 'はじめてのパズル',      desc: 'パズルを 1めん クリアしよう',     target: 1, stat: 'puzzle_clears',     tier: 1, reward: { type: 'furn', id: 'ach_picture_wall' } },
    { id: 'first_writing',   game: 'writing',   name: 'はじめてのもじかき',    desc: '1もじ かんせいしよう',            target: 1, stat: 'writing_chars',     tier: 1, reward: { type: 'furn', id: 'ach_bookshelf' } },
    { id: 'first_drawing',   game: 'drawing',   name: 'はじめてのおえかき',    desc: 'えを 1まい ほぞんしよう',         target: 1, stat: 'drawing_saves',     tier: 1, reward: { type: 'sea',  id: 'starfish' } },
    { id: 'first_bento',     game: 'bento',     name: 'はじめてのおべんとう',  desc: 'おべんとうを 1かい つくろう',     target: 1, stat: 'bento_complete',    tier: 1, reward: { type: 'furn', id: 'ach_crayon' } },
    { id: 'first_wordmatch', game: 'wordmatch', name: 'はじめてのことばあわせ',desc: '1もん せいかいしよう',            target: 1, stat: 'wordmatch_correct', tier: 1, reward: { type: 'furn', id: 'ach_coral_deco' } },
    { id: 'first_bowling',   game: 'bowling',   name: 'はじめてのボウリング',  desc: '1ラウンド あそぼう',              target: 1, stat: 'bowling_rounds',    tier: 1, reward: { type: 'sea',  id: 'neon_tetra' } },
    { id: 'first_breakout',  game: 'breakout',  name: 'はじめてのブロックくずし',desc: 'ステージ1を クリアしよう',       target: 1, stat: 'breakout_stages',   tier: 1, reward: { type: 'sea',  id: 'goldfish' } },
    { id: 'first_slide',     game: 'slide',     name: 'はじめてのみちつなぎ',  desc: 'ステージ1を クリアしよう',        target: 1, stat: 'slide_clears',      tier: 1, reward: { type: 'sea',  id: 'crab' } },
    { id: 'first_maze',      game: 'maze',      name: 'はじめてのめいろ',      desc: 'ステージ1を クリアしよう',        target: 1, stat: 'maze_clears',       tier: 1, reward: { type: 'furn', id: 'ach_hedgehog_plush' } },
    { id: 'first_quizland',  game: 'quizland',  name: 'はじめてのクイズ',      desc: '1もん せいかいしよう',            target: 1, stat: 'quizland_correct', tier: 1, reward: { type: 'furn', id: 'ach_quiz_pencil' } },
    { id: 'first_oto',         game: 'oto',        name: 'はじめてのおとタッチ', desc: 'ボタンを 1かい たたこう',         target: 1, stat: 'oto_taps',           tier: 1, reward: { type: 'furn', id: 'ach_pono_cushion' } },
    { id: 'first_quiz_sound',  game: 'quiz_sound', name: 'はじめてのおとあて',   desc: '1もん せいかいしよう',            target: 1, stat: 'quiz_sound_correct', tier: 1, reward: { type: 'furn', id: 'ach_quiz_pencil' } },
    { id: 'fossil_first',      game: 'fossil',     name: 'はつ かせき',          desc: 'かせきを 1たい はっけんしよう',    target: 1, stat: 'fossil_found',       tier: 1, reward: { type: 'furn', id: 'ach_quiz_pencil' } },
    { id: 'all_games',       game: 'common',    name: 'ぜんぶ あそんだ！',     desc: 'ぜんぶの ゲームを あそぼう',     target: 1, stat: 'all_games_played',  tier: 2, reward: { type: 'furn', id: 'ach_rainbow_mobile' } },

    // ── 中間 ─────────────────────────────────────────────────────
    { id: 'writing_20',    game: 'writing',   name: 'もじもじ がんばった',   desc: 'ひらがな 20もじ かこう',         target: 20, stat: 'writing_hiragana',  tier: 2, reward: { type: 'furn', id: 'ach_bookshelf' } },
    { id: 'puzzle_3',      game: 'puzzle',    name: 'パズルずき',           desc: 'パズルを 3めん クリアしよう',     target: 3,  stat: 'puzzle_clears',     tier: 2, reward: { type: 'furn', id: 'ach_picture_wall' } },
    { id: 'bento_3',       game: 'bento',     name: 'おべんとうずき',       desc: 'おべんとうを 3かい つくろう',     target: 3,  stat: 'bento_complete',    tier: 2, reward: { type: 'furn', id: 'ach_crayon' } },
    { id: 'breakout_3',    game: 'breakout',  name: 'どんどんくずす',       desc: 'ステージ3まで クリアしよう',      target: 3,  stat: 'breakout_stages',   tier: 2, reward: { type: 'furn', id: 'ach_block_deco' } },
    { id: 'slide_4',       game: 'slide',     name: 'みちつなぎずき',       desc: 'ステージ4まで クリアしよう',      target: 4,  stat: 'slide_clears',      tier: 2, reward: { type: 'furn', id: 'ach_book_deco' } },
    { id: 'maze_4',        game: 'maze',      name: 'めいろずき',           desc: 'ステージ4まで クリアしよう',      target: 4,  stat: 'maze_clears',       tier: 2, reward: { type: 'furn', id: 'ach_hedgehog_plush' } },
    { id: 'drawing_5',     game: 'drawing',   name: 'えかきさん',           desc: 'えを 5まい ほぞんしよう',         target: 5,  stat: 'drawing_saves',     tier: 2, reward: { type: 'furn', id: 'ach_easel' } },
    { id: 'bowling_5',     game: 'bowling',   name: 'ボウリングはじまった', desc: '5ラウンド あそぼう',              target: 5,  stat: 'bowling_rounds',    tier: 2, reward: { type: 'bg',   id: 'bg_bowling_dinasour' } },
    { id: 'bowling_10',    game: 'bowling',   name: 'ボウリングじょうず',   desc: '10ラウンド あそぼう',             target: 10, stat: 'bowling_rounds',    tier: 2, reward: { type: 'bg',   id: 'bg_bowling_neon_boy01' } },
    { id: 'bowling_20',    game: 'bowling',   name: 'ボウリングずき',       desc: '20ラウンド あそぼう',             target: 20, stat: 'bowling_rounds',    tier: 2, reward: { type: 'furn', id: 'ach_bowling_toy' } },
    { id: 'bowling_30',    game: 'bowling',   name: 'ボウリングプロ',       desc: '30ラウンド あそぼう',             target: 30, stat: 'bowling_rounds',    tier: 2, reward: { type: 'bg',   id: 'bg_bowling_pirates' } },
    { id: 'wordmatch_15',  game: 'wordmatch', name: 'ことばずき',           desc: '15もん せいかいしよう',           target: 15, stat: 'wordmatch_correct', tier: 2, reward: { type: 'furn', id: 'ach_coral_deco' } },
    { id: 'quizland_5',    game: 'quizland',  name: 'クイズはじめたよ',    desc: '5もん せいかいしよう',            target: 5,  stat: 'quizland_correct',  tier: 2, reward: { type: 'furn', id: 'ach_quiz_badge' } },
    { id: 'quizland_15',   game: 'quizland',  name: 'クイズじょうず',       desc: '15もん せいかいしよう',           target: 15, stat: 'quizland_correct',  tier: 2, reward: { type: 'furn', id: 'ach_quiz_ribbon' } },
    { id: 'quizland_30',   game: 'quizland',  name: 'クイズずき',           desc: '30もん せいかいしよう',           target: 30, stat: 'quizland_correct',  tier: 2, reward: { type: 'furn', id: 'ach_quiz_medal' } },
    { id: 'quizland_clear5', game: 'quizland',name: 'クイズ 5かいクリア',  desc: '5かい ぜんもん クリアしよう',     target: 5,  stat: 'quizland_clears',   tier: 2, reward: { type: 'furn', id: 'ach_quiz_trophy' } },
    { id: 'breakout_2',    game: 'breakout',  name: 'ブロック2だんめ',      desc: 'ステージ2まで クリアしよう',      target: 2,  stat: 'breakout_stages',   tier: 2, reward: { type: 'bg',   id: 'bg_breakout_forest_deep' } },
    { id: 'breakout_4',    game: 'breakout',  name: 'ブロック4だんめ',      desc: 'ステージ4まで クリアしよう',      target: 4,  stat: 'breakout_stages',   tier: 2, reward: { type: 'bg',   id: 'bg_breakout_cave_mushroom' } },
    { id: 'oto_50',          game: 'oto',        name: 'おとあそびずき',     desc: 'ボタンを 50かい たたこう',        target: 50, stat: 'oto_taps',           tier: 2, reward: { type: 'furn', id: 'ach_quiz_badge' } },
    { id: 'quiz_sound_10',   game: 'quiz_sound', name: 'おとあてずき',       desc: '10もん せいかいしよう',           target: 10, stat: 'quiz_sound_correct', tier: 2, reward: { type: 'furn', id: 'ach_quiz_ribbon' } },
    { id: 'quiz_sound_clear_3', game:'quiz_sound', name: 'おとあてくりかえし', desc: '5もんセットを 3かい クリア',    target: 3,  stat: 'quiz_sound_clears',  tier: 2, reward: { type: 'furn', id: 'ach_coral_deco' } },
    { id: 'fossil_hunter',   game: 'fossil',    name: 'かせきハンター',       desc: 'かせきを 5たい はっけんしよう',   target: 5,  stat: 'fossil_found',       tier: 2, reward: { type: 'furn', id: 'ach_quiz_badge' } },
    { id: 'fossil_scholar',  game: 'fossil',    name: 'はかせ みならい',      desc: 'かせきを 10たい はっけんしよう',  target: 10, stat: 'fossil_found',       tier: 2, reward: { type: 'furn', id: 'ach_quiz_ribbon' } },
    { id: 'fossil_quiz_perfect', game:'fossil',name: 'クイズ まんてん',     desc: 'かせきクイズで ぜんもん せいかい', target: 1, stat: 'fossil_quiz_perfect', tier: 2, reward: { type: 'furn', id: 'ach_quiz_medal' } },

    // ── マスター ─────────────────────────────────────────────────
    { id: 'puzzle_all',    game: 'puzzle',    name: 'パズルマスター',       desc: 'パズルを ぜんぶ クリアしよう',     target: 6,  stat: 'puzzle_clears',     tier: 3, reward: { type: 'furn', id: 'ach_quiz_crown' } },
    { id: 'writing_hira',  game: 'writing',   name: 'ひらがなマスター',     desc: 'ひらがな ぜんぶ かこう',           target: 46, stat: 'writing_hiragana',  tier: 3, reward: { type: 'furn', id: 'ach_quiz_star' } },
    { id: 'writing_kata',  game: 'writing',   name: 'カタカナマスター',     desc: 'カタカナ ぜんぶ かこう',           target: 46, stat: 'writing_katakana',  tier: 3, reward: { type: 'furn', id: 'ach_quiz_medal' } },
    { id: 'bowling_50',    game: 'bowling',   name: 'ボウリングマスター',   desc: '50ラウンド あそぼう',              target: 50, stat: 'bowling_rounds',    tier: 3, reward: { type: 'bg',   id: 'bg_bowling_space_boy01' } },
    { id: 'breakout_all',  game: 'breakout',  name: 'ブロックマスター',     desc: 'ぜんぶ クリアしよう',              target: 5,  stat: 'breakout_stages',   tier: 3, reward: { type: 'sea',  id: 'crocodile_sea' } },
    { id: 'breakout_all_bg', game: 'breakout', name: 'ブロックぜんせい',    desc: 'ぜんぶの ステージを クリアしよう', target: 5,  stat: 'breakout_stages',   tier: 3, reward: { type: 'bg',   id: 'bg_breakout_night_sky' } },
    { id: 'slide_all',     game: 'slide',     name: 'みちつなぎマスター',   desc: 'ぜんぶ クリアしよう',              target: 8,  stat: 'slide_clears',      tier: 3, reward: { type: 'sea',  id: 'dolphin' } },
    { id: 'maze_all',      game: 'maze',      name: 'めいろマスター',       desc: 'めいろを ぜんぶ クリアしよう',     target: 10, stat: 'maze_clears',       tier: 3, reward: { type: 'furn', id: 'ach_quiz_trophy' } },
    { id: 'drawing_10',    game: 'drawing',   name: 'アーティスト',         desc: 'えを 10まい ほぞんしよう',         target: 10, stat: 'drawing_saves',     tier: 3, reward: { type: 'sea',  id: 'seal' } },
    { id: 'wordmatch_all', game: 'wordmatch', name: 'ことばマスター',       desc: 'ぜんもん せいかいしよう',          target: 30, stat: 'wordmatch_correct', tier: 3, reward: { type: 'furn', id: 'ach_easel' } },
    { id: 'quizland_all',  game: 'quizland',  name: 'クイズマスター',       desc: '50もん せいかいしよう',            target: 50, stat: 'quizland_correct',  tier: 3, reward: { type: 'furn', id: 'ach_quiz_crown' } },
    { id: 'quizland_god',  game: 'quizland',  name: 'クイズのかみさま',     desc: '100もん せいかいしよう',           target: 100,stat: 'quizland_correct',  tier: 3, reward: { type: 'furn', id: 'ach_quiz_star' } },
    { id: 'bento_10',      game: 'bento',     name: 'おべんとうマスター',   desc: 'おべんとうを 10かい つくろう',     target: 10, stat: 'bento_complete',    tier: 3, reward: { type: 'furn', id: 'ach_book_deco' } },
    { id: 'oto_300',       game: 'oto',       name: 'おとマスター',         desc: 'ボタンを 300かい たたこう',        target: 300, stat: 'oto_taps',           tier: 3, reward: { type: 'furn', id: 'ach_block_deco' } },
    { id: 'quiz_sound_50', game: 'quiz_sound',name: 'おとあてマスター',     desc: '50もん せいかいしよう',            target: 50,  stat: 'quiz_sound_correct', tier: 3, reward: { type: 'furn', id: 'ach_bowling_toy' } },
    { id: 'fossil_master', game: 'fossil',    name: 'きょうりゅう はかせ',   desc: 'かせきを 14たい ぜんぶ あつめよう', target: 14, stat: 'fossil_found',       tier: 3, reward: { type: 'furn', id: 'ach_quiz_crown' } },
  ];

  // ═══ プレミアム初期特典 ═════════════════════════════════════════════
  var PREMIUM_BONUS = {
    wall:  ['wall_kumo_niko', 'wall_mizutama'],
    floor: ['floor_wood_warm', 'floor_wood_light'],
    furn:  ['ach_small_chair', 'ach_bookshelf'],
    sea:   ['clownfish', 'medaka'],
  };

  // ═══ localStorage ヘルパー ══════════════════════════════════════════
  var LS_STATS  = 'pono_stats';
  var LS_ACH    = 'pono_achievements';
  var LS_SEA    = 'pono_unlocked_sea';
  var LS_FURN   = 'pono_unlocked_furn';
  var LS_WALL   = 'pono_unlocked_wall';
  var LS_FLOOR  = 'pono_unlocked_floor';
  var LS_BG     = 'pono_unlocked_bg';

  function _getJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function _setJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // ═══ 統計インクリメント（グローバル）══════════════════════════════
  window.incrementStat = function (key, amount) {
    // MVP: 進捗系 LS への書き込みを完全停止 (フレッシュスタート方針)。
    if (window.PONO_MVP_NO_REWARDS) return 0;
    var stats = _getJSON(LS_STATS, {});
    stats[key] = (stats[key] || 0) + (amount || 1);
    _setJSON(LS_STATS, stats);
    _checkAchievements(stats);
    _showNextRewardHint(key, stats);
    return stats[key];
  };

  // 統計を直接セット（最大値の記録などに使用）
  window.setStatMax = function (key, value) {
    if (window.PONO_MVP_NO_REWARDS) return 0;
    var stats = _getJSON(LS_STATS, {});
    if (value > (stats[key] || 0)) {
      stats[key] = value;
      _setJSON(LS_STATS, stats);
      _checkAchievements(stats);
    }
    return stats[key];
  };

  // 現在の統計値を取得
  window.getStat = function (key) {
    var stats = _getJSON(LS_STATS, {});
    return stats[key] || 0;
  };

  // ═══ 実績チェック ══════════════════════════════════════════════════
  function _checkAchievements(stats) {
    var unlocked = _getJSON(LS_ACH, {});
    var newlyUnlocked = [];

    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var ach = ACHIEVEMENTS[i];
      if (unlocked[ach.id]) continue; // already unlocked
      var val = stats[ach.stat] || 0;
      if (val >= ach.target) {
        unlocked[ach.id] = true;
        _setJSON(LS_ACH, unlocked);
        _grantReward(ach.reward);
        newlyUnlocked.push(ach);
        // 実績解除でスタンプ+1（localStorageに直接加算）
        try {
          var _sl = JSON.parse(localStorage.getItem('pono_stamp_log') || '{"dates":[],"total":0}');
          var _sk = 'ach_' + ach.id;
          if (_sl.dates.indexOf(_sk) === -1) {
            _sl.dates.push(_sk);
            _sl.total = _sl.dates.length;
            localStorage.setItem('pono_stamp_log', JSON.stringify(_sl));
            // スタンプ理由をキューに保存（メニュー画面でポップアップに使う）
            var _pend = JSON.parse(localStorage.getItem('pono_stamp_pending') || '[]');
            _pend.push({ name: ach.name, desc: ach.desc });
            localStorage.setItem('pono_stamp_pending', JSON.stringify(_pend));
          }
        } catch(e) {}
      }
    }

    // Queue popups — show immediately or defer if game is busy
    if (newlyUnlocked.length > 0) {
      if (window._achDeferPopups) {
        // Game requested deferral — queue for later
        for (var k = 0; k < newlyUnlocked.length; k++) {
          _deferredQueue.push(newlyUnlocked[k]);
        }
      } else {
        _showAchievementQueue(newlyUnlocked);
      }
    }
  }

  window.checkAchievements = function () {
    if (window.PONO_MVP_NO_REWARDS) return;
    var stats = _getJSON(LS_STATS, {});
    _checkAchievements(stats);
  };

  // ═══ 報酬付与 ══════════════════════════════════════════════════════
  function _grantReward(reward) {
    if (!reward) return;
    var listKey;
    if (reward.type === 'sea')   listKey = LS_SEA;
    if (reward.type === 'furn')  listKey = LS_FURN;
    if (reward.type === 'deco')  listKey = LS_FURN;
    if (reward.type === 'wall')  listKey = LS_WALL;
    if (reward.type === 'floor') listKey = LS_FLOOR;
    if (reward.type === 'bg')    listKey = LS_BG;
    if (!listKey) return;

    var list = _getJSON(listKey, []);
    if (list.indexOf(reward.id) === -1) {
      list.push(reward.id);
      _setJSON(listKey, list);
    }
  }

  // 外部からの報酬付与用（スタンプラリーなど）
  window.grantReward = function (reward) {
    // MVP: 報酬付与も完全停止。LS の sea/furn/wall/floor リストにも書き込まない。
    if (window.PONO_MVP_NO_REWARDS) return;
    _grantReward(reward);
  };

  // 背景解除チェック
  window.isUnlockedBg = function (id) {
    return _getJSON(LS_BG, []).indexOf(id) !== -1;
  };
  window.getUnlockedBgs = function () {
    return _getJSON(LS_BG, []);
  };

  // ═══ プレミアムボーナス（パスワード入力時）══════════════════════
  window.grantPremiumBonus = function () {
    if (localStorage.getItem('pono_premium_bonus') === 'granted') return;

    var keys = { wall: LS_WALL, floor: LS_FLOOR, furn: LS_FURN, sea: LS_SEA };
    for (var cat in PREMIUM_BONUS) {
      var listKey = keys[cat];
      var list = _getJSON(listKey, []);
      var items = PREMIUM_BONUS[cat];
      for (var i = 0; i < items.length; i++) {
        if (list.indexOf(items[i]) === -1) {
          list.push(items[i]);
        }
      }
      _setJSON(listKey, list);
    }

    localStorage.setItem('pono_premium_bonus', 'granted');
  };

  // ═══ 実績一覧取得（UI用）══════════════════════════════════════════
  window.getAchievements = function () {
    return ACHIEVEMENTS;
  };

  window.getUnlockedAchievements = function () {
    return _getJSON(LS_ACH, {});
  };

  window.getUnlockedSea = function () {
    return _getJSON(LS_SEA, []);
  };

  window.getUnlockedFurn = function () {
    return _getJSON(LS_FURN, []);
  };

  window.getUnlockedWall = function () {
    return _getJSON(LS_WALL, []);
  };

  window.getUnlockedFloor = function () {
    return _getJSON(LS_FLOOR, []);
  };

  // ═══ 解除ポップアップUI ═══════════════════════════════════════════
  var _popupQueue = [];
  var _popupShowing = false;
  var _deferredQueue = [];

  // Games set window._achDeferPopups = true during active gameplay,
  // then call window.flushAchievementPopups() between stages
  window._achDeferPopups = false;
  window.flushAchievementPopups = function () {
    window._achDeferPopups = false;
    if (_deferredQueue.length > 0) {
      _showAchievementQueue(_deferredQueue.splice(0));
    }
  };

  function _showAchievementQueue(achList) {
    for (var i = 0; i < achList.length; i++) {
      _popupQueue.push(achList[i]);
    }
    if (!_popupShowing) _showNextPopup();
  }

  function _showNextPopup() {
    if (_popupQueue.length === 0) { _popupShowing = false; return; }
    _popupShowing = true;
    var ach = _popupQueue.shift();
    _renderPopup(ach);
  }

  function _renderPopup(ach) {
    // ゲーム中はポップアップを出さない（トップ画面に戻った時にまとめて表示）
    // スタンプはlocalStorageに加算済みなので、表示だけスキップ
    _showNextPopup();
    return;

    banner.appendChild(box);
    document.body.appendChild(banner);

    // Auto-dismiss after 3s
    var dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      banner.style.animation = 'achSlideUp 0.3s ease forwards';
      setTimeout(function () {
        if (banner.parentNode) banner.parentNode.removeChild(banner);
        _showNextPopup();
      }, 310);
    }

    box.addEventListener('pointerdown', dismiss);
    setTimeout(dismiss, 3000);
  }

  function _addParticles(container) {
    var colors = ['#ffd700', '#ff6f00', '#e040fb', '#00e5ff', '#76ff03', '#ff1744'];
    for (var i = 0; i < 20; i++) {
      var p = document.createElement('div');
      var size = 6 + Math.random() * 8;
      var x = 30 + Math.random() * 40; // % from left
      var delay = Math.random() * 0.3;
      p.style.cssText = [
        'position:absolute;',
        'width:' + size + 'px;height:' + size + 'px;',
        'background:' + colors[i % colors.length] + ';',
        'border-radius:50%;',
        'left:' + x + '%;top:50%;',
        'opacity:0;',
        'animation:achParticle 0.8s ' + delay + 's ease-out forwards;',
      ].join('');
      container.appendChild(p);
    }
  }

  // ═══ CSS注入（アニメーション）══════════════════════════════════════
  function _injectCSS() {
    var style = document.createElement('style');
    style.textContent = [
      '@keyframes achFadeIn{from{opacity:0}to{opacity:1}}',
      '@keyframes achBounceIn{',
        '0%{transform:scale(0.3);opacity:0}',
        '60%{transform:scale(1.05);opacity:1}',
        '100%{transform:scale(1)}',
      '}',
      '@keyframes achParticle{',
        '0%{opacity:1;transform:translate(0,0) scale(1)}',
        '100%{opacity:0;transform:translate(' + '#{dx}px,#{dy}px'.replace('#{dx}', '') + ') scale(0);',
              'transform:translate(calc(-50px + 100px * var(--r)),calc(-80px + 40px * var(--r))) scale(0)}',
      '}',
    ].join('');
    style.textContent = [
      '@keyframes achSlideDown{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}',
      '@keyframes achSlideUp{from{transform:translateY(0);opacity:1}to{transform:translateY(-100%);opacity:0}}',
      '@keyframes achParticle{',
        '0%{opacity:1;transform:translateY(0) scale(1)}',
        '100%{opacity:0;transform:translateY(-80px) scale(0)}',
      '}',
      '#ach-next-hint{',
        'position:fixed;bottom:12px;left:50%;z-index:9502;',
        'transform:translateX(-50%) translateY(10px);',
        'background:linear-gradient(135deg,#e0f7fa,#b2ebf2);',
        'color:#00695c;',
        'font-size:0.82rem;font-weight:bold;',
        'padding:8px 18px;border-radius:20px;',
        'box-shadow:0 3px 12px rgba(0,0,0,0.18);',
        'pointer-events:none;white-space:nowrap;',
        'opacity:0;transition:opacity 0.3s,transform 0.3s;',
        'font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN","BIZ UDPGothic",sans-serif;',
      '}',
      '#ach-next-hint.show{opacity:1;transform:translateX(-50%) translateY(0);}',
    ].join('');
    document.head.appendChild(style);
  }

  // ═══ 次の報酬ヒント ════════════════════════════════════════════════
  var _hintEl = null;
  var _hintTimer = null;

  function _getNextForStat(statKey, stats) {
    var unlocked = _getJSON(LS_ACH, {});
    var best = null;
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var a = ACHIEVEMENTS[i];
      if (a.stat !== statKey) continue;
      if (unlocked[a.id]) continue;
      if (!best || a.target < best.target) best = a;
    }
    if (!best) return null;
    var current = stats[statKey] || 0;
    var remaining = best.target - current;
    if (remaining <= 0) return null; // about to unlock — popup handles it
    var icon = best.reward.type === 'sea' ? '🐠' : '🪑';
    return { remaining: remaining, name: best.name, icon: icon };
  }

  function _showNextRewardHint(statKey, stats) {
    var info = _getNextForStat(statKey, stats);
    if (!info) return;
    if (!_hintEl) {
      _hintEl = document.createElement('div');
      _hintEl.id = 'ach-next-hint';
      document.body.appendChild(_hintEl);
    }
    _hintEl.textContent = 'あと ' + info.remaining + ' で ' + info.icon + ' ' + info.name + ' ゲット！';
    _hintEl.classList.add('show');
    clearTimeout(_hintTimer);
    _hintTimer = setTimeout(function () {
      if (_hintEl) _hintEl.classList.remove('show');
    }, 3500);
  }

  // ═══ 次の報酬を取得（外部から呼べるAPI）══════════════════════════
  window.getNextReward = function (game) {
    var stats = _getJSON(LS_STATS, {});
    var unlocked = _getJSON(LS_ACH, {});
    var best = null;
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var a = ACHIEVEMENTS[i];
      if (a.game !== game) continue;
      if (unlocked[a.id]) continue;
      if (!best || a.target < best.target) best = a;
    }
    if (!best) return null;
    var current = stats[best.stat] || 0;
    var remaining = best.target - current;
    var icon = best.reward.type === 'sea' ? '🐠' : '🪑';
    return { remaining: remaining, name: best.name, icon: icon, desc: best.desc };
  };

  // ═══ 初期化 ════════════════════════════════════════════════════════
  function _init() {
    _injectCSS();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
