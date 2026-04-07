// Maze generator + simulator + auditor
// Run: node maze/_sim.js
// Generates stages where:
//   1. The maze is a proper recursive-backtracker tree (no trivial corridor)
//   2. Spamming a single direction does NOT solve the stage
//   3. Click count is at or above target
//   4. Every reachable cell has ≥1 walkable neighbor (no dead-arrow states)

function mulberry32(a) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Recursive backtracker ───
function genMaze(cellRows, cellCols, seed) {
  const rng = mulberry32(seed);
  const H = 2 * cellRows + 1, W = 2 * cellCols + 1;
  const grid = Array.from({ length: H }, () => '#'.repeat(W).split(''));
  const visited = Array.from({ length: cellRows }, () => Array(cellCols).fill(false));
  const stack = [[0, 0]];
  visited[0][0] = true;
  grid[1][1] = '.';
  while (stack.length) {
    const [cr, cc] = stack[stack.length - 1];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    let moved = false;
    for (const [dr, dc] of dirs) {
      const nr = cr + dr, nc = cc + dc;
      if (nr < 0 || nr >= cellRows || nc < 0 || nc >= cellCols) continue;
      if (visited[nr][nc]) continue;
      visited[nr][nc] = true;
      grid[2 * cr + 1 + dr][2 * cc + 1 + dc] = '.';
      grid[2 * nr + 1][2 * nc + 1] = '.';
      stack.push([nr, nc]);
      moved = true;
      break;
    }
    if (!moved) stack.pop();
  }
  grid[1][1] = 'S';
  grid[H - 2][W - 2] = 'G';
  return grid.map((r) => r.join(''));
}

// ─── Walk simulation (matches game logic) ───
function isW(g, r, c) {
  if (r < 0 || r >= g.length || c < 0 || c >= g[0].length) return false;
  const ch = g[r][c];
  return ch === '.' || ch === 'S' || ch === 'G' || ch === 'A';
}

function openDirs(g, r, c, ex) {
  const out = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    if (ex && dr === -ex[0] && dc === -ex[1]) continue;
    if (isW(g, r + dr, c + dc)) out.push([dr, dc]);
  }
  return out;
}

function autoWalk(g, sr, sc, dr, dc) {
  const path = [];
  let r = sr, c = sc;
  const v = new Set([r + ',' + c]);
  while (true) {
    const nr = r + dr, nc = c + dc;
    if (!isW(g, nr, nc)) break;
    const k = nr + ',' + nc;
    if (v.has(k)) break;
    r = nr; c = nc;
    path.push({ r, c });
    v.add(k);
    if (g[r][c] === 'G') break;
    const opts = openDirs(g, r, c, [dr, dc]);
    if (opts.length === 0) break;
    if (opts.length === 1) { dr = opts[0][0]; dc = opts[0][1]; continue; }
    break;
  }
  return path;
}

function solveClicks(g) {
  let s = null, gl = null;
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    if (g[r][c] === 'S') s = { r, c };
    if (g[r][c] === 'G') gl = { r, c };
  }
  if (!s || !gl) return -1;
  const seen = new Set([s.r + ',' + s.c]);
  const q = [{ r: s.r, c: s.c, n: 0 }];
  while (q.length) {
    const u = q.shift();
    if (u.r === gl.r && u.c === gl.c) return u.n;
    for (const [dr, dc] of openDirs(g, u.r, u.c, null)) {
      const p = autoWalk(g, u.r, u.c, dr, dc);
      if (p.length === 0) continue;
      const last = p[p.length - 1];
      const k = last.r + ',' + last.c;
      if (seen.has(k)) continue;
      seen.add(k);
      q.push({ r: last.r, c: last.c, n: u.n + 1 });
    }
  }
  return -1;
}

// AUDIT 1: Every reachable state has ≥1 walkable neighbor (no dead-arrow state)
function auditNoDeadStates(g) {
  let s = null;
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    if (g[r][c] === 'S') s = { r, c };
  }
  const seen = new Set([s.r + ',' + s.c]);
  const q = [s];
  while (q.length) {
    const u = q.shift();
    const dirs = openDirs(g, u.r, u.c, null);
    if (dirs.length === 0 && g[u.r][u.c] !== 'G') return false;
    for (const [dr, dc] of dirs) {
      const p = autoWalk(g, u.r, u.c, dr, dc);
      if (p.length === 0) continue;
      const l = p[p.length - 1];
      const k = l.r + ',' + l.c;
      if (seen.has(k)) continue;
      seen.add(k);
      q.push({ r: l.r, c: l.c });
    }
  }
  return true;
}

// AUDIT 2: Spamming a single direction does NOT solve the stage
// Player taps the same direction (one of 4) repeatedly. If they reach G, fail.
function auditNoSpamSolve(g) {
  let s = null;
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    if (g[r][c] === 'S') s = { r, c };
  }
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    let r = s.r, c = s.c;
    let safety = 50;
    while (safety-- > 0) {
      // simulate "click direction (dr,dc)" — only valid if walkable
      if (!isW(g, r + dr, c + dc)) break;
      const p = autoWalk(g, r, c, dr, dc);
      if (p.length === 0) break;
      const last = p[p.length - 1];
      r = last.r; c = last.c;
      if (g[r][c] === 'G') return false; // spam solves it → fail
    }
  }
  return true;
}

// AUDIT 3: Solution path uses at least N distinct directions (not just one)
function solutionDirections(g) {
  // BFS but track parent direction
  let s = null, gl = null;
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    if (g[r][c] === 'S') s = { r, c };
    if (g[r][c] === 'G') gl = { r, c };
  }
  const parent = new Map();
  const seen = new Set([s.r + ',' + s.c]);
  const q = [{ r: s.r, c: s.c }];
  while (q.length) {
    const u = q.shift();
    if (u.r === gl.r && u.c === gl.c) break;
    for (const [dr, dc] of openDirs(g, u.r, u.c, null)) {
      const p = autoWalk(g, u.r, u.c, dr, dc);
      if (p.length === 0) continue;
      const l = p[p.length - 1];
      const k = l.r + ',' + l.c;
      if (seen.has(k)) continue;
      seen.add(k);
      parent.set(k, { from: u.r + ',' + u.c, dir: dr + ',' + dc });
      q.push({ r: l.r, c: l.c });
    }
  }
  // Trace back
  const dirs = new Set();
  let cur = gl.r + ',' + gl.c;
  while (parent.has(cur)) {
    const p = parent.get(cur);
    dirs.add(p.dir);
    cur = p.from;
  }
  return dirs.size;
}

// ─── Place apples then obstacles at dead-ends ───
function placeObstacles(rawGrid, rng, applesCount) {
  const arr = rawGrid.map((r) => r.split(''));
  const rows = arr.length, cols = arr[0].length;
  function isPath(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    const ch = arr[r][c];
    return ch === '.' || ch === 'S' || ch === 'G' || ch === 'A';
  }
  function deadEnds() {
    const list = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (arr[r][c] !== '.') continue;
      let n = 0;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (isPath(r + dr, c + dc)) n++;
      }
      if (n === 1) list.push({ r, c });
    }
    return list;
  }
  let de = deadEnds();
  for (let i = de.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [de[i], de[j]] = [de[j], de[i]];
  }
  for (let i = 0; i < Math.min(applesCount, de.length); i++) {
    arr[de[i].r][de[i].c] = 'A';
  }
  de = deadEnds();
  for (let i = de.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [de[i], de[j]] = [de[j], de[i]];
  }
  const obstacles = ['C', 'W', 'T'];
  for (const d of de) {
    arr[d.r][d.c] = obstacles[Math.floor(rng() * obstacles.length)];
  }
  return arr.map((r) => r.join(''));
}

function countCh(g, ch) {
  let n = 0;
  for (const row of g) for (const c of row) if (c === ch) n++;
  return n;
}

// ─── Search ───
function findStage(cellRows, cellCols, minClicks, applesCount, requireNoSpam) {
  let best = null;
  for (let seed = 1; seed <= 5000; seed++) {
    const rng = mulberry32(seed * 7919 + 13);
    const raw = genMaze(cellRows, cellCols, seed);
    const final = placeObstacles(raw, rng, applesCount);
    if (!auditNoDeadStates(final)) continue;
    if (requireNoSpam && !auditNoSpamSolve(final)) continue;
    const clicks = solveClicks(final);
    if (clicks < minClicks) continue;
    const dirs = solutionDirections(final);
    // Score: prefer more clicks, more direction variety
    const score = clicks * 10 + dirs * 3;
    if (!best || score > best.score) {
      best = { grid: final, clicks, dirs, seed, score };
    }
    if (best && best.clicks >= minClicks + 2 && best.dirs >= 3) break;
  }
  return best;
}

// ─── Stage specs ───
// Realistic click maxima (verified): 3x3→2, 4x4→3, 5x5→5, 6x6→6, 7x7→7, 8x8→10, 10x10→13
const SPECS = [
  { rows: 2, cols: 2, minClicks: 1, apples: 0, noSpam: false, name: 'ステージ 1 — はじまりのもり' },
  { rows: 3, cols: 3, minClicks: 2, apples: 0, noSpam: true,  name: 'ステージ 2 — もりのなか' },
  { rows: 4, cols: 4, minClicks: 3, apples: 1, noSpam: true,  name: 'ステージ 3 — わかれみち' },
  { rows: 5, cols: 5, minClicks: 5, apples: 1, noSpam: true,  name: 'ステージ 4 — ふかいもり' },
  { rows: 7, cols: 7, minClicks: 7, apples: 2, noSpam: true,  name: 'ステージ 5 — めいろの もり' },
  { rows: 10, cols: 10, minClicks: 10, apples: 3, noSpam: true, name: 'ステージ 6 — まいごの もり' },
];

console.log('=== Generating ===\n');
const results = [];
for (const spec of SPECS) {
  const r = findStage(spec.rows, spec.cols, spec.minClicks, spec.apples, spec.noSpam);
  if (!r) { console.log(spec.name, '— FAILED'); continue; }
  results.push(Object.assign({}, spec, r));
  const apples = countCh(r.grid, 'A');
  const cats = countCh(r.grid, 'C');
  const water = countCh(r.grid, 'W');
  const thorn = countCh(r.grid, 'T');
  console.log(spec.name);
  console.log(`  ${r.grid.length}x${r.grid[0].length}  clicks=${r.clicks} (min=${spec.minClicks})  dirs=${r.dirs}  seed=${r.seed}`);
  console.log(`  apples=${apples} cats=${cats} water=${water} thorn=${thorn}`);
  for (const row of r.grid) console.log('  ' + row);
  console.log();
}

// ─── FINAL AUDIT ───
console.log('=== FINAL AUDIT ===');
let allOk = true;
for (const r of results) {
  const widths = [...new Set(r.grid.map((row) => row.length))];
  const clicks = solveClicks(r.grid);
  const dead = auditNoDeadStates(r.grid);
  const noSpam = auditNoSpamSolve(r.grid);
  const dirs = solutionDirections(r.grid);
  const ok =
    widths.length === 1 &&
    clicks >= r.minClicks &&
    dead &&
    (!r.noSpam || noSpam);
  if (!ok) allOk = false;
  console.log(
    `${r.name}: w=${widths.join(',')} clicks=${clicks}/${r.minClicks} dead-state=${dead?'pass':'FAIL'} no-spam=${noSpam?'pass':'FAIL'} dirs=${dirs} ${ok?'OK':'FAIL'}`
  );
}

console.log('\n=== JS for STAGES ===');
console.log('const STAGES = [');
for (const r of results) {
  console.log('  {');
  console.log(`    name: '${r.name}',`);
  console.log('    grid: [');
  for (const row of r.grid) console.log(`      '${row}',`);
  console.log('    ],');
  console.log('  },');
}
console.log('];');

process.exit(allOk ? 0 : 1);
