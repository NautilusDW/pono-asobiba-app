// Maze generator + auto-pruner + simulator + auditor
// Run: node maze/_sim.js
//
// PIPELINE per stage:
//   1. Generate raw maze (recursive backtracker)
//   2. Prune cells the player cannot reach (auto-walk semantics) → walls
//   3. Place apples at dead-ends (collectible bonus)
//   4. Place obstacles ON path cells (must actually block a route the player would take)
//   5. Audit (must pass ALL):
//      - solvable
//      - dead-state-free (every reachable state has ≥1 walkable neighbor)
//      - no-spam-solve (single-direction spam fails)
//      - no-stranded ('.' cells must all be player-reachable)
//      - no-useless-obstacles (obstacle adjacent to a player-reachable cell)
//      - obstacles-are-blockers (removing any obstacle changes optimal solution)
//      - real-junctions on solution path ≥ minimum
//   6. Score by real-junctions, click count, direction variety; pick best per spec.
//
// LAYOUT: tall aspect (rows ≥ cols) so cells stay big enough for arrow buttons on phone.

function mulberry32(a) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ─── Recursive backtracker maze with cycle injection ───
// Pure recursive backtracker = tree → no detours possible.
// We knock down a fraction of additional walls to create cycles, so blockers
// can force the player around alternative routes.
function genMaze(cellRows, cellCols, seed, cycleRate) {
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
    shuffle(dirs, rng);
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
  // Inject cycles: knock down extra walls between adjacent cells
  // cycleRate = fraction of internal walls to remove (0 = pure tree, 0.5 = lots of loops)
  const cellWalls = [];
  for (let cr = 0; cr < cellRows; cr++) {
    for (let cc = 0; cc < cellCols; cc++) {
      // Check south wall
      if (cr + 1 < cellRows) cellWalls.push([2 * cr + 2, 2 * cc + 1]);
      // Check east wall
      if (cc + 1 < cellCols) cellWalls.push([2 * cr + 1, 2 * cc + 2]);
    }
  }
  shuffle(cellWalls, rng);
  const removeCount = Math.floor(cellWalls.length * cycleRate);
  for (let i = 0; i < removeCount; i++) {
    const [wr, wc] = cellWalls[i];
    if (grid[wr][wc] === '#') grid[wr][wc] = '.';
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

// Prune unreachable '.' cells → '#'.
function pruneUnreachable(rawGrid) {
  const reachable = playerReachableCells(rawGrid);
  const arr = rawGrid.map((r) => r.split(''));
  const rows = arr.length, cols = arr[0].length;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const ch = arr[r][c];
    if (ch === '.' && !reachable.has(r + ',' + c)) arr[r][c] = '#';
  }
  return arr.map((r) => r.join(''));
}

// ─── AUDITS ───

// 1: every reachable state has ≥1 walkable neighbor
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

// 2: spamming a single direction does NOT solve the stage
function auditNoSpamSolve(g) {
  let s = null;
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    if (g[r][c] === 'S') s = { r, c };
  }
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    let r = s.r, c = s.c, k = 100;
    while (k-- > 0) {
      if (!isW(g, r + dr, c + dc)) break;
      const p = autoWalk(g, r, c, dr, dc);
      if (p.length === 0) break;
      const l = p[p.length - 1];
      r = l.r; c = l.c;
      if (g[r][c] === 'G') return false;
    }
  }
  return true;
}

// 3: no stranded path cells
function auditNoStranded(g) {
  const reach = playerReachableCells(g);
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    if (g[r][c] === '.' && !reach.has(r + ',' + c)) return false;
  }
  return true;
}

// 4: obstacles must be adjacent to a player-reachable cell
function auditNoUselessObstacles(g) {
  const reach = playerReachableCells(g);
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    const ch = g[r][c];
    if (ch !== 'C' && ch !== 'W' && ch !== 'T' && ch !== 'R') continue;
    let any = false;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      if (reach.has((r + dr) + ',' + (c + dc))) { any = true; break; }
    }
    if (!any) return false;
  }
  return true;
}

// 5: each obstacle MUST change the optimal solution if removed (= it actually blocks)
function auditObstaclesAreBlockers(g) {
  const baseClicks = solveClicks(g);
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    const ch = g[r][c];
    if (ch !== 'C' && ch !== 'W' && ch !== 'T' && ch !== 'R') continue;
    const grid2 = g.slice();
    const row = g[r].split('');
    row[c] = '.';
    grid2[r] = row.join('');
    const newClicks = solveClicks(grid2);
    if (newClicks < 0) return false;
    if (newClicks === baseClicks) return false; // no effect = useless
  }
  return true;
}

// 6: real-junction count along the solution path
// "real junction" = cell where player has ≥2 walkable directions excluding back
function realJunctionMetrics(g) {
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
      parent.set(k, { from: u.r + ',' + u.c, dirArr: [dr, dc] });
      q.push({ r: l.r, c: l.c });
    }
  }
  const trace = [];
  let cur = gl.r + ',' + gl.c;
  while (parent.has(cur)) {
    const p = parent.get(cur);
    const [r, c] = cur.split(',').map(Number);
    trace.unshift({ r, c, from: p.from, incoming: p.dirArr });
    cur = p.from;
  }
  let realJunctionsOnSolution = 0;
  for (let i = 0; i < trace.length; i++) {
    const step = trace[i];
    const [pr, pc] = step.from.split(',').map(Number);
    let back = null;
    if (i > 0) back = trace[i - 1].incoming;
    const dirs = openDirs(g, pr, pc, back);
    if (dirs.length >= 2) realJunctionsOnSolution++;
  }
  return { clicks: trace.length, realJunctionsOnSolution };
}

function solutionDirections(g) {
  const m = realJunctionMetrics(g);
  return m.clicks; // approximation: not used as a hard gate
}

function countCh(g, ch) {
  let n = 0;
  for (const row of g) for (const c of row) if (c === ch) n++;
  return n;
}

// ─── Place apples (at dead-ends) and obstacles (ON path, real blockers) ───
function placeApplesAndObstacles(rawGrid, rng, obstacleCount, applesCount) {
  const arr = rawGrid.map((r) => r.split(''));
  const rows = arr.length, cols = arr[0].length;

  function gridStr() { return arr.map((r) => r.join('')); }
  function isPath(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    const ch = arr[r][c];
    return ch === '.' || ch === 'S' || ch === 'G' || ch === 'A';
  }

  // ── 1. Apples at dead-ends (player-reachable) ──
  function deadEnds() {
    const reachable = playerReachableCells(gridStr());
    const list = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (arr[r][c] !== '.') continue;
      if (!reachable.has(r + ',' + c)) continue;
      let n = 0;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (isPath(r + dr, c + dc)) n++;
      }
      if (n === 1) list.push({ r, c });
    }
    return list;
  }
  let de = deadEnds();
  shuffle(de, rng);
  for (let i = 0; i < Math.min(applesCount, de.length); i++) {
    arr[de[i].r][de[i].c] = 'A';
  }

  // ── 2. Obstacles on path cells, must actually be blockers ──
  // Each obstacle:
  //   - placed on a non-S, non-G, non-A, non-dead-end '.' cell
  //   - keeps maze solvable
  //   - keeps no-stranded property
  //   - changes the optimal solution click count (= true blocker)
  //   - keeps no-dead-state property
  const obstacleChars = ['C', 'W', 'T'];
  let placed = 0;
  let outerAttempts = 0;
  while (placed < obstacleCount && outerAttempts < 10) {
    outerAttempts++;
    const reach = playerReachableCells(gridStr());
    const candidates = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (arr[r][c] !== '.') continue;
      if (!reach.has(r + ',' + c)) continue;
      // Skip dead-ends — not blockers
      let n = 0;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (isPath(r + dr, c + dc)) n++;
      }
      if (n < 2) continue;
      candidates.push({ r, c });
    }
    if (candidates.length === 0) break;
    shuffle(candidates, rng);
    let success = false;
    for (const cand of candidates) {
      const ch = obstacleChars[Math.floor(rng() * obstacleChars.length)];
      const before = arr[cand.r][cand.c];
      const beforeClicks = solveClicks(gridStr());
      arr[cand.r][cand.c] = ch;
      const newGrid = gridStr();
      const newClicks = solveClicks(newGrid);
      if (
        newClicks > 0 &&
        newClicks !== beforeClicks &&
        auditNoDeadStates(newGrid) &&
        auditNoStranded(newGrid)
      ) {
        success = true;
        placed++;
        break;
      } else {
        arr[cand.r][cand.c] = before;
      }
    }
    if (!success) break;
  }

  return gridStr();
}

// ─── Search loop with full pipeline + all audits ───
function findStage(cellRows, cellCols, minClicks, minRealJunctions, obstacleCount, applesCount) {
  let best = null;
  // Try multiple cycle rates: more cycles = more detour opportunities
  const cycleRates = [0.15, 0.25, 0.35, 0.5];
  for (const cycleRate of cycleRates) {
    for (let seed = 1; seed <= 8000; seed++) {
      const rng = mulberry32(seed * 7919 + 13);
      const raw = genMaze(cellRows, cellCols, seed, cycleRate);
      const pruned = pruneUnreachable(raw);
      if (!pruned) continue;
      const final = placeApplesAndObstacles(pruned, rng, obstacleCount, applesCount);
      const obsPlaced = countCh(final, 'C') + countCh(final, 'W') + countCh(final, 'T');
      if (obsPlaced < obstacleCount) continue;
      if (countCh(final, 'A') < applesCount) continue;
      if (!auditNoDeadStates(final)) continue;
      if (!auditNoSpamSolve(final)) continue;
      if (!auditNoStranded(final)) continue;
      if (!auditNoUselessObstacles(final)) continue;
      if (!auditObstaclesAreBlockers(final)) continue;
      const clicks = solveClicks(final);
      if (clicks < minClicks) continue;
      const metrics = realJunctionMetrics(final);
      if (metrics.realJunctionsOnSolution < minRealJunctions) continue;
      const score = metrics.realJunctionsOnSolution * 100 + clicks * 5 + obsPlaced * 20;
      if (!best || score > best.score) {
        best = {
          grid: final,
          clicks,
          seed,
          cycleRate,
          score,
          realJunctionsOnSolution: metrics.realJunctionsOnSolution,
          obstacles: obsPlaced,
        };
      }
      if (best && best.realJunctionsOnSolution >= minRealJunctions + 1 && best.clicks >= minClicks + 1) break;
    }
    if (best) break;
  }
  return best;
}

// ─── Stage specs ───
// TALL aspect (rows ≥ cols), so cells stay big enough for arrow buttons.
// Player viewport ~ 540×600 px → recommended max ~11 cols × 14 rows.
// 11 stages: tutorial + 1..10. Difficulty curve:
//   - tutorial: tiny, 1 obstacle, learning the controls
//   - S1-S3: small, 1 obstacle, simple branches
//   - S4-S5: medium, 2 obstacles, multi-branch
//   - S6-S7: bigger, 2-3 obstacles
//   - S8: ≈ previous S5 difficulty (3 obstacles, 8x6)
//   - S9-S10: bigger than S8, more obstacles (4-5)
const SPECS = [
  { rows: 3, cols: 3, minClicks: 2,  minRealJunctions: 1, obstacles: 1, apples: 0, name: 'チュートリアル — やじるしを おしてみよう' },
  { rows: 4, cols: 3, minClicks: 3,  minRealJunctions: 1, obstacles: 1, apples: 0, name: 'ステージ 1 — どっちに いく？' },
  { rows: 5, cols: 3, minClicks: 4,  minRealJunctions: 2, obstacles: 1, apples: 1, name: 'ステージ 2 — わかれみち' },
  { rows: 5, cols: 4, minClicks: 5,  minRealJunctions: 2, obstacles: 1, apples: 1, name: 'ステージ 3 — ふかいもり' },
  { rows: 6, cols: 4, minClicks: 6,  minRealJunctions: 3, obstacles: 2, apples: 1, name: 'ステージ 4 — みっつの わかれみち' },
  { rows: 7, cols: 5, minClicks: 7,  minRealJunctions: 3, obstacles: 2, apples: 2, name: 'ステージ 5 — もりのおく' },
  { rows: 7, cols: 5, minClicks: 8,  minRealJunctions: 4, obstacles: 3, apples: 2, name: 'ステージ 6 — ちょうちょのもり' },
  { rows: 8, cols: 5, minClicks: 9,  minRealJunctions: 4, obstacles: 3, apples: 2, name: 'ステージ 7 — つきよのもり' },
  { rows: 8, cols: 6, minClicks: 10, minRealJunctions: 4, obstacles: 3, apples: 2, name: 'ステージ 8 — まいごの もり' },
  { rows: 8, cols: 6, minClicks: 11, minRealJunctions: 5, obstacles: 4, apples: 2, name: 'ステージ 9 — ふしぎの もり' },
  { rows: 9, cols: 6, minClicks: 12, minRealJunctions: 5, obstacles: 5, apples: 3, name: 'ステージ 10 — さいごの もり' },
];

console.log('=== Generating stages ===\n');
const results = [];
for (const spec of SPECS) {
  const r = findStage(
    spec.rows, spec.cols,
    spec.minClicks, spec.minRealJunctions,
    spec.obstacles, spec.apples
  );
  if (!r) { console.log(spec.name, '— FAILED'); continue; }
  results.push(Object.assign({}, spec, r));
  const apples = countCh(r.grid, 'A');
  const cats = countCh(r.grid, 'C');
  const water = countCh(r.grid, 'W');
  const thorn = countCh(r.grid, 'T');
  console.log(spec.name);
  console.log(
    `  ${r.grid.length}x${r.grid[0].length}  clicks=${r.clicks}  ` +
    `realJ=${r.realJunctionsOnSolution} (min=${spec.minRealJunctions})  seed=${r.seed}`
  );
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
  const blockers = auditObstaclesAreBlockers(r.grid);
  const metrics = realJunctionMetrics(r.grid);
  const realJOk = metrics.realJunctionsOnSolution >= r.minRealJunctions;
  const tall = r.grid.length >= r.grid[0].length;
  const ok = widths.length === 1 && clicks >= r.minClicks && dead && noSpam &&
             stranded && useless && blockers && realJOk && tall;
  if (!ok) allOk = false;
  console.log(
    `${r.name}: ${r.grid.length}x${widths[0]} clicks=${clicks}/${r.minClicks} ` +
    `realJ=${metrics.realJunctionsOnSolution}/${r.minRealJunctions} ` +
    `dead=${dead?'pass':'FAIL'} noSpam=${noSpam?'pass':'FAIL'} ` +
    `stranded=${stranded?'pass':'FAIL'} useless=${useless?'pass':'FAIL'} ` +
    `blockers=${blockers?'pass':'FAIL'} tall=${tall?'pass':'FAIL'} ` +
    `${ok ? 'OK' : 'FAIL'}`
  );
}

console.log('\n=== JS for STAGES ===');
for (const r of results) {
  console.log('  {');
  console.log(`    name: '${r.name}',`);
  console.log('    grid: [');
  for (const row of r.grid) console.log(`      '${row}',`);
  console.log('    ],');
  console.log('  },');
}

process.exit(allOk ? 0 : 1);
