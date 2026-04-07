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
  const seen = new Set();
  const q = [{r: start.r, c: start.c, clicks: 0}];
  seen.add(start.r + ',' + start.c);
  while (q.length) {
    const cur = q.shift();
    if (cur.r === goal.r && cur.c === goal.c) {
      return { reached: true, clicks: cur.clicks };
    }
    const dirs = getOpenDirs(stage, cur.r, cur.c, null);
    for (const [dr, dc] of dirs) {
      const path = autoWalk(stage, cur.r, cur.c, dr, dc);
      if (path.length === 0) continue;
      const last = path[path.length - 1];
      const key = last.r + ',' + last.c;
      if (seen.has(key)) continue;
      seen.add(key);
      q.push({ r: last.r, c: last.c, clicks: cur.clicks + 1 });
    }
  }
  return { reached: false };
}

function countDeadEnds(stageRaw) {
  const g = stageRaw.grid;
  const rows = g.length, cols = g[0].length;
  const stage = { grid: g, rows, cols };
  let n = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!isWalkable(stage, r, c)) continue;
    if (g[r][c] === 'S' || g[r][c] === 'G') continue;
    if (getOpenDirs(stage, r, c, null).length === 1) n++;
  }
  return n;
}

const STAGES = [
  {
    name: 'S1 — straight (1 click intro)',
    grid: [
      'S####',
      '.####',
      '.####',
      '.####',
      '....G',
    ],
  },
  {
    name: 'S2 — choice at S (1 click)',
    grid: [
      'S...C',
      '.####',
      '.####',
      '.####',
      'G####',
    ],
  },
  {
    name: 'S3 — 2 junctions cat+water',
    grid: [
      'S#####',
      '.#####',
      '.....C',
      '.####.',
      '....W.',
      '.####.',
      'G.....',
    ],
  },
  {
    name: 'S4 — 3 junctions',
    grid: [
      'S#####',
      '.#####',
      '.....C',
      '.####.',
      '.....C',
      '.####.',
      '.....W',
      '.####.',
      'G.....',
    ],
  },
  {
    name: 'S5 — 4 junctions + apple',
    grid: [
      'S#####',
      '.#####',
      '.A...C',
      '.####.',
      '.....C',
      '.####.',
      '.....C',
      '.####.',
      '.....W',
      '.####.',
      'G.....',
    ],
  },
  {
    name: 'S6 — 5 junctions + 2 apples',
    grid: [
      'S#####',
      '.#####',
      '.A...C',
      '.####.',
      '.....C',
      '.####.',
      '.A...C',
      '.####.',
      '.....C',
      '.####.',
      '.....W',
      '.####.',
      'G.....',
    ],
  },
];

let allOk = true;
for (const s of STAGES) {
  const widths = [...new Set(s.grid.map(r => r.length))];
  const res = solve(s);
  const dead = countDeadEnds(s);
  const ok = widths.length === 1 && res.reached;
  if (!ok) allOk = false;
  console.log(`${s.name}: ${s.grid.length}x${widths.join(',')} reach=${res.reached} clicks=${res.clicks||'-'} dead-ends=${dead} ${ok?'OK':'FAIL'}`);
}
process.exit(allOk ? 0 : 1);
