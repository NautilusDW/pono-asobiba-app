// Simulator for junction-based maze movement
// Usage: node maze/_sim.js

function isWalkable(stage, r, c) {
  if (r < 0 || r >= stage.rows || c < 0 || c >= stage.cols) return false;
  const ch = stage.grid[r][c];
  return ch === '.' || ch === 'S' || ch === 'G' || ch === 'A';
}

function getOpenDirs(stage, r, c, excludeDir) {
  const dirs = [];
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    if (excludeDir && dr === -excludeDir[0] && dc === -excludeDir[1]) continue;
    if (isWalkable(stage, r+dr, c+dc)) dirs.push([dr,dc]);
  }
  return dirs;
}

function autoWalk(stage, startR, startC, dr, dc) {
  const path = [];
  let r = startR, c = startC;
  const visited = new Set();
  visited.add(r+','+c);
  while (true) {
    const nr = r + dr, nc = c + dc;
    if (!isWalkable(stage, nr, nc)) break;
    if (visited.has(nr+','+nc)) break;
    r = nr; c = nc;
    path.push({r, c});
    visited.add(r+','+c);
    if (stage.grid[r][c] === 'G') break;
    const opts = getOpenDirs(stage, r, c, [dr, dc]);
    if (opts.length === 0) break;
    if (opts.length === 1) { [dr, dc] = opts[0]; continue; }
    break;
  }
  return path;
}

// Find shortest sequence of player choices from S to G
function solve(stageRaw) {
  const grid = stageRaw.grid;
  const rows = grid.length;
  const cols = grid[0].length;
  let start = null, goal = null;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (grid[r][c] === 'S') start = {r, c};
    if (grid[r][c] === 'G') goal = {r, c};
  }
  const stage = { grid, rows, cols };
  // BFS over (r,c) states. Each step = one player direction choice.
  const seen = new Set();
  const q = [{r: start.r, c: start.c, clicks: 0, history: []}];
  seen.add(start.r + ',' + start.c);
  while (q.length) {
    const cur = q.shift();
    if (cur.r === goal.r && cur.c === goal.c) {
      return { reached: true, clicks: cur.clicks, history: cur.history };
    }
    const dirs = getOpenDirs(stage, cur.r, cur.c, null);
    for (const [dr, dc] of dirs) {
      const path = autoWalk(stage, cur.r, cur.c, dr, dc);
      if (path.length === 0) continue;
      const last = path[path.length - 1];
      const key = last.r + ',' + last.c;
      if (seen.has(key)) continue;
      seen.add(key);
      q.push({
        r: last.r, c: last.c,
        clicks: cur.clicks + 1,
        history: cur.history.concat([{
          dir: dr === -1 ? '↑' : dr === 1 ? '↓' : dc === -1 ? '←' : '→',
          to: key,
          steps: path.length
        }])
      });
    }
  }
  return { reached: false };
}

function countJunctions(stageRaw) {
  const grid = stageRaw.grid;
  const rows = grid.length, cols = grid[0].length;
  const stage = { grid, rows, cols };
  let junctions = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!isWalkable(stage, r, c)) continue;
    const dirs = getOpenDirs(stage, r, c, null);
    if (dirs.length >= 3) junctions++;
  }
  return junctions;
}

const STAGES = [
  {
    name: 'S1 — straight L',
    grid: [
      'S####',
      '.####',
      '.####',
      '.####',
      '....G',
    ],
  },
  {
    name: 'S2 — choice at S',
    grid: [
      'S...C',
      '.####',
      '.####',
      '.####',
      'G####',
    ],
  },
  {
    name: 'S3 — mid corridor + cat dead end',
    grid: [
      'S.....',
      '.#####',
      '..A...',
      '####C.',
      '.....G',
    ],
  },
  {
    name: 'S4 — water blocks side branch',
    grid: [
      'S.....',
      '.####.',
      '...W..',
      '.####.',
      'G.....',
    ],
  },
  {
    name: 'S5 — bigger snake with thorn',
    grid: [
      'S.....',
      '.####.',
      '...T..',
      '.####.',
      '......',
      '.####.',
      'G.....',
    ],
  },
  {
    name: 'S6 — long with apple bonus',
    grid: [
      'S......',
      '.#####.',
      '.......',
      '.#####.',
      '.A.....',
      '######.',
      'G......',
    ],
  },
];

let allOk = true;
for (const s of STAGES) {
  const res = solve(s);
  const j = countJunctions(s);
  console.log(`${s.name}: reached=${res.reached} clicks=${res.clicks||'-'} junctions=${j}`);
  if (!res.reached) { allOk = false; console.log('  HISTORY:', res.history); }
  else if (res.history.length <= 5) console.log('  path:', res.history.map(h => h.dir).join(' '));
}
process.exit(allOk ? 0 : 1);
