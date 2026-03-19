// ─── ポノのおへや 実績アンロックシステム ──────────────────────────────
// 全ゲームで <script src="../common/achievements.js"></script> として読み込む
// window.incrementStat(key, amount) でゲーム内統計をインクリメント
// → 自動で実績チェック → 解除時にポップアップ演出
(function () {
  'use strict';

  // ═══ 実績定義 ═══════════════════════════════════════════════════════
  var ACHIEVEMENTS = [
    // ── しゃぼんだま ─────────────────────────────────────────────
    { id: 'bubble_10',    game: 'bubble',   name: 'はじめてわれた',       desc: 'しゃぼんだまを 10こ わろう',       target: 10,   stat: 'bubble_pops',  tier: 1, reward: { type: 'sea',  id: 'clownfish' } },
    { id: 'bubble_50',    game: 'bubble',   name: 'ぱちぱちマスター',     desc: 'しゃぼんだまを 50こ わろう',       target: 50,   stat: 'bubble_pops',  tier: 2, reward: { type: 'furn', id: 'ach_small_chair' } },
    { id: 'bubble_200',   game: 'bubble',   name: 'しゃぼんだま名人',     desc: 'しゃぼんだまを 200こ わろう',      target: 200,  stat: 'bubble_pops',  tier: 3, reward: { type: 'sea',  id: 'octopus' } },
    { id: 'bubble_gold',  game: 'bubble',   name: 'ゴールデンハンター',   desc: 'きんシャボンを 10こ わろう',       target: 10,   stat: 'bubble_gold',  tier: 4, reward: { type: 'furn', id: 'ach_kira_wall' } },
    { id: 'bubble_chain', game: 'bubble',   name: 'れんさ名人',           desc: 'れんさ 5かい いじょう',            target: 5,    stat: 'bubble_chain', tier: 5, reward: { type: 'sea',  id: 'whale' } },
    { id: 'bubble_1000',  game: 'bubble',   name: '1000こ突破！',         desc: 'しゃぼんだまを 1000こ わろう',     target: 1000, stat: 'bubble_pops',  tier: 6, reward: { type: 'furn', id: 'ach_coral_table' } },

    // ── しゃぼんだま イベント ───────────────────────────────────────
    // ポノ発見
    { id: 'bubble_pono_1',  game: 'bubble', name: 'ポノ はっけん！',       desc: 'ポノを 1かい みつけよう',          target: 1,   stat: 'bubble_pono',          tier: 1, reward: { type: 'sea',  id: 'starfish_event' } },
    { id: 'bubble_pono_5',  game: 'bubble', name: 'ポノずき',             desc: 'ポノを 5かい みつけよう',          target: 5,   stat: 'bubble_pono',          tier: 2, reward: { type: 'furn', id: 'ach_pono_cushion' } },
    { id: 'bubble_pono_20', game: 'bubble', name: 'ポノマスター',         desc: 'ポノを 20かい みつけよう',         target: 20,  stat: 'bubble_pono',          tier: 3, reward: { type: 'furn', id: 'ach_pono_plush' } },
    // いきもの解放
    { id: 'bubble_creature_1',  game: 'bubble', name: 'いきもの はっけん！', desc: 'いきものを 1ぴき みつけよう',     target: 1,   stat: 'bubble_creatures',     tier: 1, reward: { type: 'sea',  id: 'butterfly_event' } },
    { id: 'bubble_creature_10', game: 'bubble', name: 'いきもの ともだち',   desc: 'いきものを 10ぴき みつけよう',    target: 10,  stat: 'bubble_creatures',     tier: 2, reward: { type: 'sea',  id: 'frog_event' } },
    { id: 'bubble_creature_30', game: 'bubble', name: 'いきもの はかせ',     desc: 'いきものを 30ぴき みつけよう',    target: 30,  stat: 'bubble_creatures',     tier: 3, reward: { type: 'sea',  id: 'parrot_event' } },
    // 星座完成
    { id: 'bubble_const_1',  game: 'bubble', name: 'はじめての せいざ',     desc: 'せいざを 1つ かんせいしよう',      target: 1,   stat: 'bubble_constellations', tier: 1, reward: { type: 'furn', id: 'ach_star_light' } },
    { id: 'bubble_const_6',  game: 'bubble', name: 'せいざ はかせ',         desc: 'せいざを 6つ かんせいしよう',      target: 6,   stat: 'bubble_constellations', tier: 2, reward: { type: 'furn', id: 'ach_telescope' } },
    { id: 'bubble_const_12', game: 'bubble', name: 'せいざマスター',       desc: 'せいざを 12かい かんせいしよう',   target: 12,  stat: 'bubble_constellations', tier: 3, reward: { type: 'furn', id: 'ach_planetarium' } },
    // 色あわせ
    { id: 'bubble_color_10',  game: 'bubble', name: 'いろ あわせ！',       desc: 'いろあわせ 10かい せいかい',       target: 10,  stat: 'bubble_color_score',   tier: 1, reward: { type: 'furn', id: 'ach_rainbow_mobile' } },
    { id: 'bubble_color_30',  game: 'bubble', name: 'いろいろ はかせ',     desc: 'いろあわせ 30かい せいかい',       target: 30,  stat: 'bubble_color_score',   tier: 2, reward: { type: 'furn', id: 'ach_color_pencils' } },
    { id: 'bubble_color_100', game: 'bubble', name: 'カラーマスター',      desc: 'いろあわせ 100かい せいかい',      target: 100, stat: 'bubble_color_score',   tier: 3, reward: { type: 'furn', id: 'ach_rainbow_wall' } },
    // おおきいシャボン
    { id: 'bubble_big_20',  game: 'bubble', name: 'おおきいの すき！',     desc: 'おおきいシャボンを 20こ わろう',   target: 20,  stat: 'bubble_big_pops',      tier: 1, reward: { type: 'furn', id: 'ach_big_bubble_deco' } },
    { id: 'bubble_big_100', game: 'bubble', name: 'パンパン名人',         desc: 'おおきいシャボンを 100こ わろう',  target: 100, stat: 'bubble_big_pops',      tier: 2, reward: { type: 'furn', id: 'ach_circus_tent' } },
    // なぞりわり
    { id: 'bubble_sweep_50', game: 'bubble', name: 'なぞりわり名人',      desc: 'なぞりわりで 50こ わろう',         target: 50,  stat: 'bubble_sweep_pops',    tier: 1, reward: { type: 'furn', id: 'ach_wave_rug' } },
    // にじ描き
    { id: 'bubble_rainbow_5', game: 'bubble', name: 'にじアーティスト',    desc: 'にじイベントを 5かい クリア',      target: 5,   stat: 'bubble_rainbow_trails', tier: 1, reward: { type: 'furn', id: 'ach_fireworks_wall' } },

    // ── もじかき ─────────────────────────────────────────────────
    { id: 'writing_5',       game: 'writing', name: 'はじめてかけた',       desc: '5もじ れんしゅうしよう',           target: 5,    stat: 'writing_chars',    tier: 1, reward: { type: 'sea',  id: 'shell' } },
    { id: 'writing_20',      game: 'writing', name: 'もじもじがんばった',   desc: 'ひらがな 20もじ かこう',           target: 20,   stat: 'writing_hiragana', tier: 2, reward: { type: 'furn', id: 'ach_bookshelf' } },
    { id: 'writing_hira',    game: 'writing', name: 'ひらがなマスター',     desc: 'ひらがな ぜんぶ かこう',           target: 46,   stat: 'writing_hiragana', tier: 3, reward: { type: 'sea',  id: 'turtle' } },
    { id: 'writing_kata20',  game: 'writing', name: 'カタカナチャレンジ',   desc: 'カタカナ 20もじ かこう',           target: 20,   stat: 'writing_katakana', tier: 4, reward: { type: 'furn', id: 'ach_sofa' } },
    { id: 'writing_kata',    game: 'writing', name: 'カタカナマスター',     desc: 'カタカナ ぜんぶ かこう',           target: 46,   stat: 'writing_katakana', tier: 5, reward: { type: 'sea',  id: 'shark' } },

    // ── パズル ───────────────────────────────────────────────────
    { id: 'puzzle_1',    game: 'puzzle', name: 'はじめてクリア',     desc: 'パズルを 1つ クリアしよう',         target: 1,  stat: 'puzzle_clears', tier: 1, reward: { type: 'sea',  id: 'medaka' } },
    { id: 'puzzle_3',    game: 'puzzle', name: 'パズルずき',         desc: 'パズルを 3つ クリアしよう',         target: 3,  stat: 'puzzle_clears', tier: 2, reward: { type: 'furn', id: 'ach_picture_wall' } },
    { id: 'puzzle_all',  game: 'puzzle', name: 'パズルマスター',     desc: 'パズルを ぜんぶ クリアしよう',      target: 6,  stat: 'puzzle_clears', tier: 3, reward: { type: 'sea',  id: 'pufferfish' } },
    { id: 'puzzle_2x',   game: 'puzzle', name: 'もういっかい！',     desc: 'ぜんぶ 2しゅう クリアしよう',       target: 12, stat: 'puzzle_clears', tier: 4, reward: { type: 'sea',  id: 'squid' } },
    { id: 'puzzle_3x',   game: 'puzzle', name: 'パズルの王さま',     desc: 'ぜんぶ 3しゅう クリアしよう',       target: 18, stat: 'puzzle_clears', tier: 5, reward: { type: 'furn', id: 'ach_sea_rug' } },

    // ── ボウリング ───────────────────────────────────────────────
    { id: 'bowling_5',     game: 'bowling', name: 'はじめてのショット',   desc: '5ラウンド あそぼう',             target: 5,  stat: 'bowling_rounds', tier: 1, reward: { type: 'sea',  id: 'neon_tetra' } },
    { id: 'bowling_20',    game: 'bowling', name: 'ボウリングずき',       desc: '20ラウンド あそぼう',            target: 20, stat: 'bowling_rounds', tier: 2, reward: { type: 'furn', id: 'ach_bowling_toy' } },
    { id: 'bowling_tier2', game: 'bowling', name: 'Tier2とうたつ',        desc: 'Tier2の ボールを つくろう',      target: 1,  stat: 'bowling_tier2',  tier: 3, reward: { type: 'sea',  id: 'crab' } },
    { id: 'bowling_tier3', game: 'bowling', name: 'Tier3とうたつ',        desc: 'Tier3の ボールを つくろう',      target: 1,  stat: 'bowling_tier3',  tier: 4, reward: { type: 'furn', id: 'ach_big_nuigurumi' } },
    { id: 'bowling_tier4', game: 'bowling', name: 'Tier4とうたつ',        desc: 'Tier4の ボールを つくろう',      target: 1,  stat: 'bowling_tier4',  tier: 5, reward: { type: 'sea',  id: 'blue_whale' } },

    // ── おえかき ─────────────────────────────────────────────────
    { id: 'drawing_1',     game: 'drawing', name: 'はじめてのえ',       desc: 'えを 1まい ほぞんしよう',         target: 1,  stat: 'drawing_saves',  tier: 1, reward: { type: 'sea',  id: 'starfish' } },
    { id: 'drawing_5',     game: 'drawing', name: 'えかきさん',         desc: 'えを 5まい ほぞんしよう',         target: 5,  stat: 'drawing_saves',  tier: 2, reward: { type: 'furn', id: 'ach_crayon' } },
    { id: 'drawing_10',    game: 'drawing', name: 'アーティスト',       desc: 'えを 10まい ほぞんしよう',        target: 10, stat: 'drawing_saves',  tier: 3, reward: { type: 'sea',  id: 'dolphin' } },
    { id: 'drawing_20',    game: 'drawing', name: 'だいアーティスト',   desc: 'えを 20まい ほぞんしよう',        target: 20, stat: 'drawing_saves',  tier: 4, reward: { type: 'furn', id: 'ach_easel' } },
    { id: 'drawing_stamp', game: 'drawing', name: 'スタンプマスター',   desc: 'スタンプを ぜんぶ つかおう',      target: 1,  stat: 'drawing_all_stamps', tier: 5, reward: { type: 'sea',  id: 'seal' } },

    // ── ことばあわせ ─────────────────────────────────────────────
    { id: 'wordmatch_5',     game: 'wordmatch', name: 'はじめてのことば',   desc: '5もん せいかいしよう',          target: 5,  stat: 'wordmatch_correct',  tier: 1, reward: { type: 'sea',  id: 'shrimp' } },
    { id: 'wordmatch_15',    game: 'wordmatch', name: 'ことばずき',         desc: '15もん せいかいしよう',         target: 15, stat: 'wordmatch_correct',  tier: 2, reward: { type: 'furn', id: 'ach_book_deco' } },
    { id: 'wordmatch_all',   game: 'wordmatch', name: 'ことばマスター',     desc: 'ぜんもん せいかいしよう',       target: 30, stat: 'wordmatch_correct',  tier: 3, reward: { type: 'sea',  id: 'butterfly_fish' } },
    { id: 'wordmatch_perf',  game: 'wordmatch', name: 'かんぺき！',         desc: 'ノーミスで ぜんもん',           target: 1,  stat: 'wordmatch_perfect',  tier: 4, reward: { type: 'sea',  id: 'lobster' } },
    { id: 'wordmatch_2x',    game: 'wordmatch', name: '2しゅうめ！',        desc: 'ぜんもん 2しゅう せいかい',     target: 60, stat: 'wordmatch_correct',  tier: 5, reward: { type: 'furn', id: 'ach_coral_deco' } },

    // ── ぬりえ ───────────────────────────────────────────────────
    { id: 'coloring_1', game: 'coloring', name: 'はじめてぬれた',   desc: 'ぬりえを 1まい かんせい',          target: 1, stat: 'coloring_complete', tier: 1, reward: { type: 'sea',  id: 'guppy' } },
    { id: 'coloring_3', game: 'coloring', name: 'ぬりえずき',       desc: 'ぬりえを 3まい かんせい',          target: 3, stat: 'coloring_complete', tier: 2, reward: { type: 'furn', id: 'ach_palette_deco' } },
    { id: 'coloring_5', game: 'coloring', name: 'ぬりえマスター',   desc: 'ぬりえを 5まい かんせい',          target: 5, stat: 'coloring_complete', tier: 3, reward: { type: 'sea',  id: 'giant_squid' } },

    // ── ブロックくずし ───────────────────────────────────────────
    { id: 'breakout_1', game: 'breakout', name: 'はじめてくずした',   desc: 'ステージ1を クリアしよう',         target: 1,  stat: 'breakout_stages', tier: 1, reward: { type: 'sea',  id: 'goldfish' } },
    { id: 'breakout_3', game: 'breakout', name: 'どんどんくずす',     desc: 'ステージ3まで クリアしよう',       target: 3,  stat: 'breakout_stages', tier: 2, reward: { type: 'furn', id: 'ach_block_deco' } },
    { id: 'breakout_5', game: 'breakout', name: 'ブロックマスター',   desc: 'ステージ5まで クリアしよう',       target: 5,  stat: 'breakout_stages', tier: 3, reward: { type: 'sea',  id: 'crocodile_sea' } },
    { id: 'breakout_all', game: 'breakout', name: 'ぜんぶくずした！', desc: 'ぜんぶ クリアしよう',              target: 10, stat: 'breakout_stages', tier: 4, reward: { type: 'furn', id: 'ach_castle' } },

    // ── つみき ───────────────────────────────────────────────────
    { id: 'stacking_10', game: 'stacking', name: 'はじめてつめた',   desc: '10だん つもう',                     target: 10, stat: 'stacking_height', tier: 1, reward: { type: 'sea',  id: 'harisenbou' } },
    { id: 'stacking_20', game: 'stacking', name: 'たかくつめた',     desc: '20だん つもう',                     target: 20, stat: 'stacking_height', tier: 2, reward: { type: 'furn', id: 'ach_tsumiki_deco' } },
    { id: 'stacking_30', game: 'stacking', name: 'つみきの王さま',   desc: '30だん つもう',                     target: 30, stat: 'stacking_height', tier: 3, reward: { type: 'sea',  id: 'penguin' } },
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

  function _getJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function _setJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // ═══ 統計インクリメント（グローバル）══════════════════════════════
  window.incrementStat = function (key, amount) {
    var stats = _getJSON(LS_STATS, {});
    stats[key] = (stats[key] || 0) + (amount || 1);
    _setJSON(LS_STATS, stats);
    _checkAchievements(stats);
    return stats[key];
  };

  // 統計を直接セット（最大値の記録などに使用）
  window.setStatMax = function (key, value) {
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
    var stats = _getJSON(LS_STATS, {});
    _checkAchievements(stats);
  };

  // ═══ 報酬付与 ══════════════════════════════════════════════════════
  function _grantReward(reward) {
    if (!reward) return;
    var listKey;
    if (reward.type === 'sea')  listKey = LS_SEA;
    if (reward.type === 'furn') listKey = LS_FURN;
    if (reward.type === 'wall') listKey = LS_WALL;
    if (reward.type === 'floor') listKey = LS_FLOOR;
    if (!listKey) return;

    var list = _getJSON(listKey, []);
    if (list.indexOf(reward.id) === -1) {
      list.push(reward.id);
      _setJSON(listKey, list);
    }
  }

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
    // Top banner — does NOT block taps on the game below
    var banner = document.createElement('div');
    banner.id = 'ach-popup-overlay';
    banner.style.cssText = [
      'position:fixed;top:0;left:0;width:100%;z-index:99999;',
      'pointer-events:none;',
      'display:flex;justify-content:center;',
      'padding:8px 12px;',
      'animation:achSlideDown 0.35s ease;',
      'font-family:"Hiragino Maru Gothic ProN","BIZ UDPGothic",sans-serif;',
    ].join('');

    // Reward icon
    var rewardIcon = '';
    if (ach.reward.type === 'sea') rewardIcon = '🐠';
    if (ach.reward.type === 'furn') rewardIcon = '🪑';

    // Stars
    var stars = '';
    for (var i = 0; i < ach.tier; i++) stars += '★';

    var box = document.createElement('div');
    box.style.cssText = [
      'background:linear-gradient(90deg,#fff8e1,#fffde7);',
      'border-radius:14px;padding:10px 20px;',
      'box-shadow:0 4px 16px rgba(0,0,0,0.3);',
      'display:flex;align-items:center;gap:10px;',
      'max-width:95%;width:100%;',
      'pointer-events:auto;',
    ].join('');

    box.innerHTML = [
      '<div style="font-size:1.6rem;flex-shrink:0;">🎉</div>',
      '<div style="flex:1;min-width:0;">',
        '<div style="font-size:0.85rem;font-weight:bold;color:#e65100;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">',
          stars + ' ' + ach.name,
        '</div>',
        '<div style="font-size:0.7rem;color:#6d4c41;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + ach.desc + '</div>',
      '</div>',
      '<div style="font-size:1.4rem;flex-shrink:0;">' + rewardIcon + '</div>',
    ].join('');

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
    ].join('');
    document.head.appendChild(style);
  }

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
