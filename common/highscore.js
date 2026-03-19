// ── common/highscore.js ──
// Shared high-score table for all games
// Usage: <script src="../common/highscore.js"></script>
// API:
//   saveHighScore(gameId, score, { difficulty })
//   showHighScoreTable(gameId, title)
//
// Stores top 5 scores per game in localStorage.
// Each entry: { score, difficulty, date, time }

(function() {
  'use strict';

  const MAX_ENTRIES = 5;
  const LS_PREFIX = 'pono_hiscore_';

  // ── Inject CSS ──
  const style = document.createElement('style');
  style.textContent = `
    .hs-overlay {
      position: fixed; inset: 0; z-index: 99998;
      background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; pointer-events: none;
      transition: opacity 0.25s;
    }
    .hs-overlay.show {
      opacity: 1; pointer-events: auto;
    }
    .hs-modal {
      background: #FFF8E7;
      border-radius: 24px;
      padding: 20px 18px 16px;
      min-width: 260px; max-width: 340px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
      transform: scale(0.85);
      transition: transform 0.25s;
    }
    .hs-overlay.show .hs-modal {
      transform: scale(1);
    }
    .hs-title {
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: 20px; font-weight: 900;
      text-align: center;
      color: #5B4A3F;
      margin-bottom: 14px;
    }
    .hs-table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: 13px;
    }
    .hs-table th {
      background: linear-gradient(135deg, #FFD700, #FFA500);
      color: #fff;
      font-weight: 900;
      padding: 6px 6px;
      text-align: center;
      font-size: 12px;
    }
    .hs-table th:first-child { border-radius: 10px 0 0 0; }
    .hs-table th:last-child  { border-radius: 0 10px 0 0; }
    .hs-table td {
      padding: 7px 6px;
      text-align: center;
      color: #5B4A3F;
      font-weight: 700;
      border-bottom: 1px solid #F0E6D6;
    }
    .hs-table tr:last-child td { border-bottom: none; }
    .hs-table tr:nth-child(even) td { background: rgba(255,215,0,0.08); }
    .hs-rank { font-size: 16px; }
    .hs-rank-1 { color: #FFD700; }
    .hs-rank-2 { color: #C0C0C0; }
    .hs-rank-3 { color: #CD7F32; }
    .hs-new-badge {
      display: inline-block;
      background: #EF4444;
      color: #fff;
      font-size: 9px;
      font-weight: 900;
      padding: 1px 5px;
      border-radius: 6px;
      margin-left: 4px;
      animation: hs-pulse 1s infinite;
    }
    @keyframes hs-pulse {
      0%,100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }
    .hs-empty {
      text-align: center;
      color: #A89585;
      font-size: 14px;
      padding: 24px 0;
      font-family: 'Zen Maru Gothic', sans-serif;
    }
    .hs-close {
      display: block;
      margin: 14px auto 0;
      background: linear-gradient(135deg, #a8e6cf, #88d8a8);
      color: #2d6a4f;
      border: none; border-radius: 16px;
      padding: 10px 28px;
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: 16px; font-weight: 900;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }
    .hs-close:active { transform: scale(0.95); }
  `;
  document.head.appendChild(style);

  // ── Helpers ──
  function getKey(gameId) { return LS_PREFIX + gameId; }

  function loadScores(gameId) {
    try { return JSON.parse(localStorage.getItem(getKey(gameId))) || []; }
    catch { return []; }
  }

  function saveScores(gameId, scores) {
    try { localStorage.setItem(getKey(gameId), JSON.stringify(scores)); } catch(e) {}
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return (d.getMonth()+1) + '/' + d.getDate();
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  const RANK_ICONS = ['🥇', '🥈', '🥉', '4', '5'];
  const RANK_CLASSES = ['hs-rank-1', 'hs-rank-2', 'hs-rank-3', '', ''];

  // ── Public API ──

  /**
   * Save a score. Returns the rank (1-5) if it made the top 5, or 0 if not.
   */
  window.saveHighScore = function(gameId, score, opts) {
    opts = opts || {};
    const entry = {
      score: score,
      difficulty: opts.difficulty || '',
      ts: Date.now(),
      isNew: true
    };

    const scores = loadScores(gameId);
    // Clear previous "isNew" flags
    scores.forEach(s => s.isNew = false);

    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    if (scores.length > MAX_ENTRIES) scores.length = MAX_ENTRIES;

    const rank = scores.findIndex(s => s === entry);
    if (rank === -1) return 0; // didn't make top 5

    saveScores(gameId, scores);
    return rank + 1;
  };

  /**
   * Show high score table overlay
   */
  window.showHighScoreTable = function(gameId, title) {
    title = title || '🏆 ハイスコア';

    // Remove existing overlay if any
    const existing = document.getElementById('hs-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'hs-overlay';
    overlay.className = 'hs-overlay';

    const scores = loadScores(gameId);

    let tableHTML = '';
    if (scores.length === 0) {
      tableHTML = '<div class="hs-empty">まだきろくがないよ！</div>';
    } else {
      tableHTML = '<table class="hs-table"><tr><th></th><th>スコア</th><th>ひづけ</th><th>じかん</th>';
      // Show difficulty column only if any entry has difficulty
      const hasDiff = scores.some(s => s.difficulty);
      if (hasDiff) tableHTML += '<th>むずかしさ</th>';
      tableHTML += '</tr>';

      scores.forEach((s, i) => {
        const rankClass = RANK_CLASSES[i] || '';
        const rankIcon = RANK_ICONS[i] || (i + 1);
        const newBadge = s.isNew ? '<span class="hs-new-badge">NEW</span>' : '';
        tableHTML += `<tr>
          <td class="hs-rank ${rankClass}">${rankIcon}</td>
          <td>${s.score.toLocaleString()}${newBadge}</td>
          <td>${formatDate(s.ts)}</td>
          <td>${formatTime(s.ts)}</td>`;
        if (hasDiff) {
          const diffLabel = { easy: '🐣', normal: '⭐', '': '—' }[s.difficulty] || s.difficulty;
          tableHTML += `<td>${diffLabel}</td>`;
        }
        tableHTML += '</tr>';
      });
      tableHTML += '</table>';
    }

    overlay.innerHTML = `
      <div class="hs-modal">
        <div class="hs-title">${title}</div>
        ${tableHTML}
        <button class="hs-close">とじる</button>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    function close() {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    }

    overlay.querySelector('.hs-close').addEventListener('pointerdown', e => {
      e.preventDefault();
      close();
    });
    overlay.addEventListener('pointerdown', e => {
      if (e.target === overlay) { e.preventDefault(); close(); }
    });
  };
})();
