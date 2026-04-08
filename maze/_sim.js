// Maze generator + auto-pruner + simulator + auditor
// Run: node maze/_sim.js
//
// Pipeline per stage:
//   1. Generate raw maze (recursive backtracker)
//   2. Prune cells the player cannot reach (auto-walk semantics) → walls
//   3. Place apples + obstacles only at player-reachable dead-ends
//   4. Audit:
//      - solvable
//      - dead-state free (every reachable state has ≥1 walkable neighbor)
//      - no-spam-solve (single-direction spam fails)
//      - no useless obstacles
//      - no stranded path cells (every '.' must be in player-reachable set)
//   5. Score by click count + direction variety, pick best per spec

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

// Auto-walk STRAIGHT only. Stops at obstacle, L-bend, junction, or goal.
function autoWalk(g, sr, sc, dr, dc) {
  const path = [];
  let r = sr, c = sc;
  while (true) {
    const nr = r + dr, nc = c + dc;
    if (!isW(g, nr, nc)) break;
    r = nr; c = nc;
    path.push({ r, c });
    if (g[r][c] === 'G') break;
    if (!isW(g, r + dr, c + dc)) break;
    let sides = 0;
    if (dr === 0) {
      if (isW(g, r - 1, c)) sides++;
      if (isW(g, r + 1, c)) sides++;
    } else {
      if (isW(g, r, c - 1)) sides++;
      if (isW(g, r, c + 1)) sides++;
    }
    if (sides > 0) break;
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

// All cells the player can VISIT through auto-walk from S, treating G as terminal.
function playerReachableCells(g) {
  let s = null;
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    if (g[r][c] === 'S') s = { r, c };
  }
  if (!s) return new Set();
  const visited = new Set([s.r + ',' + s.c]);
  const seenStates = new Set([s.r + ',' + s.c]);
  const q = [s];
  while (q.length) {
    const u = q.shift();
    if (g[u.r][u.c] === 'G') continue;
    for (const [dr, dc] of openDirs(g, u.r, u.c, null)) {
      const path = autoWalk(g, u.r, u.c, dr, dc);
      for (const p of path) visited.add(p.r + ',' + p.c);
      if (path.length === 0) continue;
      const last = path[path.length - 1];
      const key = last.r + ',' + last.c;
      if (seenStates.has(key)) continue;
      seenStates.add(key);
      q.push({ r: last.r, c: last.c });
    }
  }
  return visited;
}

// Prune any '.' cells that are NOT in player-reachable set → '#'
// Returns null if pruning would disconnect S from G.
function pruneUnreachable(rawGrid) {
  const reachable = playerReachableCells(rawGrid);
  const arr = rawGrid.map((r) => r.split(''));
  const rows = arr.length, cols = arr[0].length;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const ch = arr[r][c];
    if (ch === '.' && !reachable.has(r + ',' + c)) {
      arr[r][c] = '#';
    }
  }
  return arr.map((r) => r.join(''));
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
function auditNoSpamSolve(g) {
  let s = null;
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    if (g[r][c] === 'S') s = { r, c };
  }
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    let r = s.r, c = s.c;
    let safety = 100;
    while (safety-- > 0) {
      if (!isW(g, r + dr, c + dc)) break;
      const p = autoWalk(g, r, c, dr, dc);
      if (p.length === 0) break;
      const last = p[p.length - 1];
      r = last.r; c = last.c;
      if (g[r][c] === 'G') return false;
    }
  }
  return true;
}

// AUDIT 3: Solution path uses N distinct directions
function solutionDirections(g) {
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
  const dirs = new Set();
  let cur = gl.r + ',' + gl.c;
  while (parent.has(cur)) {
    const p = parent.get(cur);
    dirs.add(p.dir);
    cur = p.from;
  }
  return dirs.size;
}

// AUDIT 4: No stranded path cells (every '.' must be in player-reachable set)
function auditNoStranded(g) {
  const reachable = playerReachableCells(g);
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    const ch = g[r][c];
    if (ch === '.' && !reachable.has(r + ',' + c)) return false;
  }
  return true;
}

// AUDIT 5: No useless obstacles (must be adjacent to a player-reachable cell)
function auditNoUselessObstacles(g) {
  const reachable = playerReachableCells(g);
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    const ch = g[r][c];
    if (ch !== 'C' && ch !== 'W' && ch !== 'T' && ch !== 'R') continue;
    let any = false;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      if (reachable.has((r + dr) + ',' + (c + dc))) { any = true; break; }
    }
    if (!any) return false;
  }
  return true;
}

// ─── Place apples then obstacles at player-reachable dead-ends ───
function placeObstacles(rawGrid, rng, applesCount) {
  const arr = rawGrid.map((r) => r.split(''));
  const rows = arr.length, cols = arr[0].length;

  function gridStr() { return arr.map((r) => r.join('')); }
  function isPath(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    const ch = arr[r][c];
    return ch === '.' || ch === 'S' || ch === 'G' || ch === 'A';
  }
  function deadEnds(reachable) {
    const list = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (arr[r][c] !== '.') continue;
      if (reachable && !reachable.has(r + ',' + c)) continue;
      let n = 0;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (isPath(r + dr, c + dc)) n++;
      }
      if (n === 1) list.push({ r, c });
    }
    return list;
  }

  let reachable = playerReachableCells(gridStr());
  let de = deadEnds(reachable);
  for (let i = de.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [de[i], de[j]] = [de[j], de[i]];
  }
  for (let i = 0; i < Math.min(applesCount, de.length); i++) {
    arr[de[i].r][de[i].c] = 'A';
  }
  reachable = playerReachableCells(gridStr());
  de = deadEnds(reachable);
  for (let i = de.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [de[i], de[j]] = [de[j], de[i]];
  }
  const obstacles = ['C', 'W', 'T'];
  for (const d of de) {
    arr[d.r][d.c] = obstacles[Math.floor(rng() * obstacles.length)];
  }
  return gridStr();
}

function countCh(g, ch) {
  let n = 0;
  for (const row of g) for (const c of row) if (c === ch) n++;
  return n;
}

// ─── Search loop with full pipeline ───
function findStage(cellRows, cellCols, minClicks, applesCount) {
  let best = null;
  for (let seed = 1; seed <= 8000; seed++) {
    const rng = mulberry32(seed * 7919 + 13);
    const raw = genMaze(cellRows, cellCols, seed);
    // Step 1: prune unreachable corridors
    const pruned = pruneUnreachable(raw);
    if (!pruned) continue;
    // Step 2: place obstacles
    const final = placeObstacles(pruned, rng, applesCount);
    // Step 3: full audit
    if (!auditNoDeadStates(final)) continue;
    if (!auditNoSpamSolve(final)) continue;
    if (!auditNoStranded(final)) continue;
    if (!auditNoUselessObstacles(final)) continue;
    const clicks = solveClicks(final);
    if (clicks < minClicks) continue;
    const dirs = solutionDirections(final);
    const score = clicks * 10 + dirs * 3;
    if (!best || score > best.score) {
      best = { grid: final, clicks, dirs, seed, score };
    }
    if (best && best.clicks >= minClicks + 2 && best.dirs >= 3) break;
  }
  return best;
}

// ─── Stage specs ───
const SPECS = [
  { rows: 3, cols: 3, minClicks: 3, apples: 0, name: 'ステージ 2 — わかれみち' },
  { rows: 4, cols: 4, minClicks: 5, apples: 1, name: 'ステージ 3 — ふかいもり' },
  { rows: 6, cols: 6, minClicks: 8, apples: 2, name: 'ステージ 4 — めいろの もり' },
  { rows: 9, cols: 9, minClicks: 12, apples: 3, name: 'ステージ 5 — まいごの もり' },
];

console.log('=== Generating stages ===\n');
const results = [];
for (const spec of SPECS) {
  const r = findStage(spec.rows, spec.cols, spec.minClicks, spec.apples);
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
  const stranded = auditNoStranded(r.grid);
  const useless = auditNoUselessObstacles(r.grid);
  const ok = widths.length === 1 && clicks >= r.minClicks && dead && noSpam && stranded && useless;
  if (!ok) allOk = false;
  console.log(
    `${r.name}: w=${widths.join(',')} clicks=${clicks}/${r.minClicks} ` +
    `dead=${dead?'pass':'FAIL'} noSpam=${noSpam?'pass':'FAIL'} ` +
    `noStranded=${stranded?'pass':'FAIL'} noUseless=${useless?'pass':'FAIL'} ` +
    `${ok ? 'OK' : 'FAIL'}`
  );
}

console.log('\n=== JS for STAGES (paste into index.html, after tutorial+stage1) ===');
for (const r of results) {
  console.log('  {');
  console.log(`    name: '${r.name}',`);
  console.log('    grid: [');
  for (const row of r.grid) console.log(`      '${row}',`);
  console.log('    ],');
  console.log('  },');
}

process.exit(allOk ? 0 : 1);
