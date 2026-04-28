// ─── ポノのおへや デイリーシール＋ログインボーナスシステム ──────────
// index.html で <script src="common/stickers.js"></script> として読み込む
// window.checkDailyLogin() をアプリ起動時に呼ぶ
(function () {
  'use strict';

  // ═══ シール定義（30種）══════════════════════════════════════════════
  var DAILY_STICKERS = [
    { id: 'dog',       emoji: '🐶', name: 'いぬ' },
    { id: 'cat',       emoji: '🐱', name: 'ねこ' },
    { id: 'rabbit',    emoji: '🐰', name: 'うさぎ' },
    { id: 'bear',      emoji: '', name: 'くま', img: '/assets/images/characters/pono/pono_face_circle.png' },
    { id: 'panda',     emoji: '🐼', name: 'パンダ' },
    { id: 'chick',     emoji: '🐥', name: 'ひよこ' },
    { id: 'penguin',   emoji: '🐧', name: 'ペンギン' },
    { id: 'frog',      emoji: '🐸', name: 'カエル' },
    { id: 'lion',      emoji: '🦁', name: 'ライオン' },
    { id: 'elephant',  emoji: '🐘', name: 'ゾウ' },
    { id: 'flower',    emoji: '🌸', name: 'おはな' },
    { id: 'sunflower', emoji: '🌻', name: 'ひまわり' },
    { id: 'tulip',     emoji: '🌷', name: 'チューリップ' },
    { id: 'rainbow',   emoji: '🌈', name: 'にじ' },
    { id: 'star',      emoji: '⭐', name: 'おほしさま' },
    { id: 'sun',       emoji: '☀️', name: 'おひさま' },
    { id: 'moon',      emoji: '🌙', name: 'おつきさま' },
    { id: 'cloud',     emoji: '☁️', name: 'くも' },
    { id: 'apple',     emoji: '🍎', name: 'りんご' },
    { id: 'strawberry', emoji: '🍓', name: 'いちご' },
    { id: 'cake',      emoji: '🍰', name: 'ケーキ' },
    { id: 'donut',     emoji: '🍩', name: 'ドーナツ' },
    { id: 'icecream',  emoji: '🍦', name: 'アイス' },
    { id: 'car',       emoji: '🚗', name: 'くるま' },
    { id: 'train',     emoji: '🚂', name: 'でんしゃ' },
    { id: 'rocket',    emoji: '🚀', name: 'ロケット' },
    { id: 'heart',     emoji: '❤️', name: 'ハート' },
    { id: 'crown',     emoji: '👑', name: 'おうかん' },
    { id: 'balloon',   emoji: '🎈', name: 'ふうせん' },
    { id: 'present',   emoji: '🎁', name: 'プレゼント' },
  ];

  // ═══ 壁紙/床マイルストーン定義 ════════════════════════════════════
  // 解除方法A: 累計ログイン日数
  var LOGIN_MILESTONES = [
    { days: 3,   reward: { type: 'floor', id: 'floor_wood_warm' },     msg: '3かい あそんだ！' },
    { days: 7,   reward: { type: 'wall',  id: 'wall_kumo_niko' },      msg: '1しゅうかん！' },
    { days: 12,  reward: { type: 'floor', id: 'floor_wood_light' },    msg: 'もう12かいも！' },
    { days: 20,  reward: { type: 'wall',  id: 'wall_mizutama' },       msg: '20かい すごい！' },
    { days: 30,  reward: { type: 'floor', id: 'floor_white_wood' },    msg: '1かげつ！' },
    { days: 45,  reward: { type: 'wall',  id: 'wall_hoshi' },          msg: 'おほしさま ゲット！' },
    { days: 60,  reward: { type: 'floor', id: 'floor_herringbone' },   msg: '2かげつ！' },
    { days: 80,  reward: { type: 'wall',  id: 'wall_mori' },           msg: 'もりの なかまたち！' },
    { days: 100, reward: { type: 'floor', id: 'floor_pink' },          msg: '100かい おめでとう！' },
    { days: 120, reward: { type: 'wall',  id: 'wall_stripe' },         msg: 'にじいろ ゲット！' },
  ];

  // 解除方法B: シールコレクション
  var STICKER_MILESTONES = [
    { unique: 5,  sparkle: 0,  reward: { type: 'wall',  id: 'wall_heart' },      msg: '5しゅるい あつめた！' },
    { unique: 10, sparkle: 0,  reward: { type: 'floor', id: 'floor_sand' },       msg: '10しゅるい！' },
    { unique: 15, sparkle: 0,  reward: { type: 'wall',  id: 'wall_kikyuu' },      msg: '15しゅるい！' },
    { unique: 20, sparkle: 0,  reward: { type: 'floor', id: 'floor_wood_oak' },   msg: '20しゅるい！' },
    { unique: 25, sparkle: 0,  reward: { type: 'wall',  id: 'wall_kyouryu' },     msg: '25しゅるい！' },
    { unique: 30, sparkle: 0,  reward: { type: 'wall',  id: 'wall_uchuu' },       msg: 'ぜんしゅるい コンプ！' },
    { unique: 0,  sparkle: 5,  reward: { type: 'floor', id: 'floor_pink_plain' }, msg: 'キラキラ 5こ！' },
    { unique: 0,  sparkle: 10, reward: { type: 'floor', id: 'floor_navy' },       msg: 'キラキラ 10こ！' },
    { unique: 0,  sparkle: 20, reward: { type: 'wall',  id: 'wall_navy' },        msg: 'キラキラ 20こ！' },
    { unique: 0,  sparkle: 30, reward: { type: 'floor', id: 'floor_white_tile' }, msg: 'キラキラ コンプ！' },
  ];

  // 7日連続ボーナス
  var STREAK_REWARDS = [
    { type: 'sea', id: 'starfish' },
    { type: 'furn', id: 'ach_kira_wall' },
    // 3回目以降: シール3枚ボーナス（コード内で処理）
  ];

  // ═══ localStorage キー ═════════════════════════════════════════════
  var LS_STICKERS     = 'pono_stickers';
  var LS_LOGIN_DAYS   = 'pono_login_days';
  var LS_LOGIN_LAST   = 'pono_login_last';
  var LS_LOGIN_STREAK = 'pono_login_streak';
  var LS_STREAK_COUNT = 'pono_streak_bonus_count';
  var LS_MILESTONE_DONE = 'pono_milestones_done';

  function _getJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function _setJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // ═══ デイリーログインチェック ══════════════════════════════════════
  window.checkDailyLogin = function () {
    // MVP: ログインボーナス・シール抽選・マイルストーン処理を全部スキップ。
    // pono_login_days / pono_stickers / pono_login_streak 等の LS は触らない。
    if (window.PONO_MVP_NO_REWARDS) return null;
    var today = new Date().toDateString();
    var lastLogin = localStorage.getItem(LS_LOGIN_LAST);

    if (lastLogin === today) return null; // already logged in today

    // Update login days
    var totalDays = parseInt(localStorage.getItem(LS_LOGIN_DAYS) || '0', 10) + 1;
    localStorage.setItem(LS_LOGIN_DAYS, totalDays);
    localStorage.setItem(LS_LOGIN_LAST, today);

    // Update streak
    var streak = _getJSON(LS_LOGIN_STREAK, { last: '', streak: 0 });
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var yesterdayStr = yesterday.toDateString();

    if (streak.last === yesterdayStr) {
      streak.streak += 1;
    } else {
      streak.streak = 1;
    }
    streak.last = today;
    _setJSON(LS_LOGIN_STREAK, streak);

    // Grant daily sticker (random)
    var idx = Math.floor(Math.random() * DAILY_STICKERS.length);
    var sticker = DAILY_STICKERS[idx];
    var stickers = _getJSON(LS_STICKERS, {});
    stickers[sticker.id] = (stickers[sticker.id] || 0) + 1;
    _setJSON(LS_STICKERS, stickers);

    // Check if sticker became sparkle (3+)
    var isSparkle = stickers[sticker.id] === 3;

    // Check login milestones
    var milestoneRewards = _checkLoginMilestones(totalDays);

    // Check sticker collection milestones
    var stickerMilestoneRewards = _checkStickerMilestones(stickers);

    // Check 7-day streak bonus
    var streakBonus = null;
    if (streak.streak > 0 && streak.streak % 7 === 0) {
      streakBonus = _grantStreakBonus();
    }

    return {
      sticker: sticker,
      stickerCount: stickers[sticker.id],
      isSparkle: isSparkle,
      totalDays: totalDays,
      streak: streak.streak,
      milestoneRewards: milestoneRewards,
      stickerMilestoneRewards: stickerMilestoneRewards,
      streakBonus: streakBonus,
    };
  };

  function _checkLoginMilestones(totalDays) {
    var done = _getJSON(LS_MILESTONE_DONE, []);
    var rewards = [];
    for (var i = 0; i < LOGIN_MILESTONES.length; i++) {
      var m = LOGIN_MILESTONES[i];
      var key = 'login_' + m.days;
      if (done.indexOf(key) !== -1) continue;
      if (totalDays >= m.days) {
        _grantWallFloor(m.reward);
        done.push(key);
        rewards.push({ msg: m.msg, reward: m.reward });
      }
    }
    _setJSON(LS_MILESTONE_DONE, done);
    return rewards;
  }

  function _checkStickerMilestones(stickers) {
    var done = _getJSON(LS_MILESTONE_DONE, []);
    var uniqueCount = Object.keys(stickers).length;
    var sparkleCount = 0;
    for (var id in stickers) {
      if (stickers[id] >= 3) sparkleCount++;
    }

    var rewards = [];
    for (var i = 0; i < STICKER_MILESTONES.length; i++) {
      var m = STICKER_MILESTONES[i];
      var key = 'sticker_u' + m.unique + '_s' + m.sparkle;
      if (done.indexOf(key) !== -1) continue;

      var met = true;
      if (m.unique > 0 && uniqueCount < m.unique) met = false;
      if (m.sparkle > 0 && sparkleCount < m.sparkle) met = false;
      if (met) {
        _grantWallFloor(m.reward);
        done.push(key);
        rewards.push({ msg: m.msg, reward: m.reward });
      }
    }
    _setJSON(LS_MILESTONE_DONE, done);
    return rewards;
  }

  function _grantWallFloor(reward) {
    var listKey = reward.type === 'wall' ? 'pono_unlocked_wall' : 'pono_unlocked_floor';
    var list = _getJSON(listKey, []);
    if (list.indexOf(reward.id) === -1) {
      list.push(reward.id);
      _setJSON(listKey, list);
    }
  }

  function _grantStreakBonus() {
    var count = parseInt(localStorage.getItem(LS_STREAK_COUNT) || '0', 10);
    localStorage.setItem(LS_STREAK_COUNT, count + 1);

    if (count < STREAK_REWARDS.length) {
      // Grant special item
      var reward = STREAK_REWARDS[count];
      var listKey = reward.type === 'sea' ? 'pono_unlocked_sea' : 'pono_unlocked_furn';
      var list = _getJSON(listKey, []);
      if (list.indexOf(reward.id) === -1) {
        list.push(reward.id);
        _setJSON(listKey, list);
      }
      return { type: 'item', reward: reward };
    } else {
      // Grant 3 random stickers
      var stickers = _getJSON(LS_STICKERS, {});
      var granted = [];
      for (var i = 0; i < 3; i++) {
        var idx = Math.floor(Math.random() * DAILY_STICKERS.length);
        var s = DAILY_STICKERS[idx];
        stickers[s.id] = (stickers[s.id] || 0) + 1;
        granted.push(s);
      }
      _setJSON(LS_STICKERS, stickers);
      return { type: 'stickers', stickers: granted };
    }
  }

  // ═══ シールデータ取得（UI用）══════════════════════════════════════
  window.getAllStickers = function () {
    return DAILY_STICKERS;
  };

  window.getOwnedStickers = function () {
    return _getJSON(LS_STICKERS, {});
  };

  window.getLoginInfo = function () {
    return {
      totalDays: parseInt(localStorage.getItem(LS_LOGIN_DAYS) || '0', 10),
      streak: _getJSON(LS_LOGIN_STREAK, { last: '', streak: 0 }).streak,
      lastLogin: localStorage.getItem(LS_LOGIN_LAST) || '',
    };
  };

  window.getNextLoginMilestone = function () {
    var totalDays = parseInt(localStorage.getItem(LS_LOGIN_DAYS) || '0', 10);
    var done = _getJSON(LS_MILESTONE_DONE, []);
    for (var i = 0; i < LOGIN_MILESTONES.length; i++) {
      var m = LOGIN_MILESTONES[i];
      if (done.indexOf('login_' + m.days) === -1) {
        return { days: m.days, remaining: m.days - totalDays, msg: m.msg };
      }
    }
    return null;
  };

  window.getNextStickerMilestone = function () {
    var stickers = _getJSON(LS_STICKERS, {});
    var uniqueCount = Object.keys(stickers).length;
    var sparkleCount = 0;
    for (var id in stickers) {
      if (stickers[id] >= 3) sparkleCount++;
    }
    var done = _getJSON(LS_MILESTONE_DONE, []);
    for (var i = 0; i < STICKER_MILESTONES.length; i++) {
      var m = STICKER_MILESTONES[i];
      var key = 'sticker_u' + m.unique + '_s' + m.sparkle;
      if (done.indexOf(key) !== -1) continue;
      if (m.unique > 0) return { target: m.unique, current: uniqueCount, type: 'unique', msg: m.msg };
      if (m.sparkle > 0) return { target: m.sparkle, current: sparkleCount, type: 'sparkle', msg: m.msg };
    }
    return null;
  };

  // ═══ シールちょうオーバーレイUI ═══════════════════════════════════
  window.showStickerBook = function () {
    if (document.getElementById('sticker-book-overlay')) return;

    var stickers = _getJSON(LS_STICKERS, {});
    var loginInfo = window.getLoginInfo();
    var nextLogin = window.getNextLoginMilestone();
    var nextSticker = window.getNextStickerMilestone();

    var overlay = document.createElement('div');
    overlay.id = 'sticker-book-overlay';
    overlay.style.cssText = [
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9800;',
      'background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;',
      'font-family:"Hiragino Maru Gothic ProN","BIZ UDPGothic",sans-serif;',
      'animation:achFadeIn 0.3s ease;',
    ].join('');

    var book = document.createElement('div');
    book.style.cssText = [
      'background:linear-gradient(135deg,#fff9e6,#fff3cd);',
      'border-radius:20px;padding:20px;',
      'width:90%;max-width:380px;max-height:85vh;overflow-y:auto;',
      'box-shadow:0 8px 32px rgba(0,0,0,0.3);',
    ].join('');

    // Title
    var html = '<div style="text-align:center;font-size:1.3rem;font-weight:bold;color:#5d4037;margin-bottom:12px;">📖 シールちょう</div>';

    // Sticker grid
    html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px;">';
    for (var i = 0; i < DAILY_STICKERS.length; i++) {
      var s = DAILY_STICKERS[i];
      var count = stickers[s.id] || 0;
      var isSparkle = count >= 3;
      var bg = count > 0 ? (isSparkle ? '#fff176' : '#fff8e1') : '#e0e0e0';
      var border = isSparkle ? '2px solid #ffd600' : '1px solid #d7ccc8';
      var opacity = count > 0 ? '1' : '0.4';

      html += '<div style="background:' + bg + ';border:' + border + ';border-radius:12px;padding:6px 2px;text-align:center;opacity:' + opacity + ';">';
      html += '<div style="font-size:1.5rem;">' + (s.img ? '<img src="' + s.img + '" style="width:1.2em;height:1.2em;vertical-align:middle">' : s.emoji) + '</div>';
      if (count > 0) {
        if (isSparkle) {
          html += '<div style="font-size:0.6rem;color:#f57f17;">✨×' + count + '</div>';
        } else {
          html += '<div style="font-size:0.6rem;color:#8d6e63;">×' + count + '</div>';
        }
      }
      html += '</div>';
    }
    html += '</div>';

    // Login streak
    html += '<div style="background:#fff;border-radius:12px;padding:12px;margin-bottom:10px;">';
    html += '<div style="font-size:0.85rem;font-weight:bold;color:#5d4037;">📅 れんぞく: ' + loginInfo.streak + 'かいめ</div>';

    // Week bar
    html += '<div style="display:flex;gap:4px;margin:8px 0;">';
    var days = ['月', '火', '水', '木', '金', '土', '日'];
    for (var d = 0; d < 7; d++) {
      var filled = d < (loginInfo.streak % 7 || (loginInfo.streak > 0 ? 7 : 0));
      var isBonus = d === 6;
      var cellBg = filled ? '#4caf50' : (isBonus ? '#ffd600' : '#e0e0e0');
      var cellText = filled ? '✅' : (isBonus ? '🎁' : '⬜');
      html += '<div style="flex:1;text-align:center;background:' + cellBg + ';border-radius:6px;padding:4px 0;font-size:0.7rem;">';
      html += cellText + '<br><span style="font-size:0.55rem;color:#666;">' + days[d] + '</span></div>';
    }
    html += '</div>';
    html += '</div>';

    // Progress
    html += '<div style="background:#fff;border-radius:12px;padding:12px;">';
    html += '<div style="font-size:0.85rem;font-weight:bold;color:#5d4037;margin-bottom:6px;">📊 あそんだ かいすう: ' + loginInfo.totalDays + 'かい</div>';
    if (nextLogin) {
      html += '<div style="font-size:0.75rem;color:#6d4c41;">つぎの ごほうび: あと ' + nextLogin.remaining + 'かい → ' + nextLogin.msg + '</div>';
    }
    if (nextSticker) {
      var label = nextSticker.type === 'unique' ? 'しゅるい' : 'キラキラ';
      html += '<div style="font-size:0.75rem;color:#6d4c41;margin-top:4px;">シール: ' + nextSticker.current + '/' + nextSticker.target + label + '</div>';
    }
    html += '</div>';

    // Close button
    html += '<div style="text-align:center;margin-top:12px;">';
    html += '<button id="sticker-close-btn" style="background:#8d6e63;color:#fff;border:none;border-radius:20px;padding:10px 32px;font-size:0.9rem;font-weight:bold;cursor:pointer;">とじる</button>';
    html += '</div>';

    book.innerHTML = html;
    overlay.appendChild(book);
    document.body.appendChild(overlay);

    document.getElementById('sticker-close-btn').addEventListener('click', function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }
    });
  };

  // ═══ じっせきボードオーバーレイUI ═════════════════════════════════
  window.showAchievementBoard = function () {
    if (document.getElementById('ach-board-overlay')) return;

    var achievements = window.getAchievements();
    var unlocked = window.getUnlockedAchievements();

    var overlay = document.createElement('div');
    overlay.id = 'ach-board-overlay';
    overlay.style.cssText = [
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9800;',
      'background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;',
      'font-family:"Hiragino Maru Gothic ProN","BIZ UDPGothic",sans-serif;',
      'animation:achFadeIn 0.3s ease;',
    ].join('');

    var board = document.createElement('div');
    board.style.cssText = [
      'background:linear-gradient(135deg,#efebe9,#d7ccc8);',
      'border-radius:20px;padding:20px;',
      'width:90%;max-width:380px;max-height:85vh;overflow-y:auto;',
      'box-shadow:0 8px 32px rgba(0,0,0,0.3);',
    ].join('');

    var html = '<div style="text-align:center;font-size:1.3rem;font-weight:bold;color:#4e342e;margin-bottom:12px;">🏆 できたこと</div>';

    // Group by game
    var gameIcons = {
      bubble: '🫧', writing: '✏️', puzzle: '🧩', bowling: '🎳',
      drawing: '🎨', wordmatch: '🔤', coloring: '🖍️', breakout: '🦔', stacking: '🐦',
    };
    var gameNames = {
      bubble: 'しゃぼんだま', writing: 'もじかき', puzzle: 'パズル', bowling: 'ボウリング',
      drawing: 'おえかき', wordmatch: 'ことばあわせ', coloring: 'ぬりえ', breakout: 'ブロックくずし', stacking: 'つみき',
    };

    var games = {};
    for (var i = 0; i < achievements.length; i++) {
      var a = achievements[i];
      if (!games[a.game]) games[a.game] = [];
      games[a.game].push(a);
    }

    for (var game in games) {
      var achs = games[game];
      var icon = gameIcons[game] || '🎮';
      var name = gameNames[game] || game;

      html += '<div style="background:#fff;border-radius:12px;padding:10px;margin-bottom:8px;">';
      html += '<div style="font-size:0.9rem;font-weight:bold;color:#5d4037;margin-bottom:6px;">' + icon + ' ' + name + '</div>';

      for (var j = 0; j < achs.length; j++) {
        var ach = achs[j];
        var done = !!unlocked[ach.id];
        var stars = '';
        for (var s = 0; s < ach.tier; s++) stars += done ? '★' : '☆';
        var opacity = done ? '1' : '0.5';
        var rewardIcon = ach.reward.type === 'sea' ? '🐠' : '🪑';

        html += '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;opacity:' + opacity + ';">';
        html += '<span style="font-size:0.7rem;color:#ff8f00;min-width:50px;">' + stars + '</span>';
        html += '<span style="font-size:0.75rem;color:#4e342e;flex:1;">' + ach.name + '</span>';
        if (done) {
          html += '<span style="font-size:0.8rem;">' + rewardIcon + '</span>';
        } else {
          html += '<span style="font-size:0.65rem;color:#bdbdbd;">???</span>';
        }
        html += '</div>';
      }
      html += '</div>';
    }

    // Stats summary
    var unlockedCount = Object.keys(unlocked).length;
    html += '<div style="text-align:center;font-size:0.8rem;color:#8d6e63;margin:8px 0;">' + unlockedCount + ' / ' + achievements.length + ' クリア</div>';

    // Close
    html += '<div style="text-align:center;margin-top:8px;">';
    html += '<button id="ach-close-btn" style="background:#5d4037;color:#fff;border:none;border-radius:20px;padding:10px 32px;font-size:0.9rem;font-weight:bold;cursor:pointer;">とじる</button>';
    html += '</div>';

    board.innerHTML = html;
    overlay.appendChild(board);
    document.body.appendChild(overlay);

    document.getElementById('ach-close-btn').addEventListener('click', function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }
    });
  };

  // ═══ ログインボーナスポップアップ ═════════════════════════════════
  window.showLoginBonusPopup = function (result) {
    if (!result) return;

    var overlay = document.createElement('div');
    overlay.id = 'login-bonus-overlay';
    overlay.style.cssText = [
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99998;',
      'display:flex;align-items:center;justify-content:center;',
      'background:rgba(0,0,0,0.45);',
      'animation:achFadeIn 0.3s ease;',
      'font-family:"Hiragino Maru Gothic ProN","BIZ UDPGothic",sans-serif;',
    ].join('');

    var box = document.createElement('div');
    box.style.cssText = [
      'background:linear-gradient(145deg,#e8f5e9,#f1f8e9);',
      'border-radius:24px;padding:24px 28px;text-align:center;',
      'box-shadow:0 8px 32px rgba(0,0,0,0.25);',
      'max-width:300px;width:85%;',
      'animation:achBounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1);',
    ].join('');

    var html = '<div style="font-size:2rem;margin-bottom:4px;">📅</div>';
    html += '<div style="font-size:1rem;font-weight:bold;color:#2e7d32;">' + result.totalDays + 'かいめ！</div>';
    html += '<div style="font-size:0.8rem;color:#558b2f;margin:4px 0;">れんぞく ' + result.streak + 'かい</div>';

    // Sticker reward
    html += '<div style="margin:12px 0;padding:10px;background:#fff;border-radius:14px;">';
    html += '<div style="font-size:2rem;">' + (result.sticker.img ? '<img src="' + result.sticker.img + '" style="width:1.2em;height:1.2em;vertical-align:middle">' : result.sticker.emoji) + '</div>';
    html += '<div style="font-size:0.8rem;color:#5d4037;">「' + result.sticker.name + '」の シール ゲット！</div>';
    if (result.isSparkle) {
      html += '<div style="font-size:0.75rem;color:#f57f17;font-weight:bold;">✨ キラキラに しんか！ ✨</div>';
    }
    html += '</div>';

    // Milestone rewards
    var allRewards = (result.milestoneRewards || []).concat(result.stickerMilestoneRewards || []);
    for (var i = 0; i < allRewards.length; i++) {
      var r = allRewards[i];
      html += '<div style="margin:6px 0;padding:8px;background:#fff3e0;border-radius:10px;">';
      html += '<div style="font-size:0.85rem;font-weight:bold;color:#e65100;">🎉 ' + r.msg + '</div>';
      var icon = r.reward.type === 'wall' ? '🎨' : '🪵';
      html += '<div style="font-size:0.75rem;color:#bf360c;">' + icon + ' あたらしい ' + (r.reward.type === 'wall' ? 'かべがみ' : 'ゆか') + '！</div>';
      html += '</div>';
    }

    // Streak bonus
    if (result.streakBonus) {
      html += '<div style="margin:6px 0;padding:8px;background:#e3f2fd;border-radius:10px;">';
      html += '<div style="font-size:0.85rem;font-weight:bold;color:#1565c0;">🎁 7かい れんぞく ボーナス！</div>';
      if (result.streakBonus.type === 'stickers') {
        html += '<div style="font-size:1.2rem;">';
        for (var j = 0; j < result.streakBonus.stickers.length; j++) {
          var sb = result.streakBonus.stickers[j];
          html += sb.img ? '<img src="' + sb.img + '" style="width:1.2em;height:1.2em;vertical-align:middle">' : sb.emoji;
        }
        html += '</div>';
      }
      html += '</div>';
    }

    box.innerHTML = html;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.addEventListener('pointerdown', function () {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.25s';
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 260);
    });

    // Auto dismiss after 5 seconds
    setTimeout(function () {
      if (overlay.parentNode) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.25s';
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 260);
      }
    }, 5000);
  };

})();
