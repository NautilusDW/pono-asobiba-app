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

// AUDIT 3b: Real-junction count along the solution path
// A "real junction" is a cell where the player has ≥2 walkable directions
// (excluding the direction they came from). L-bends / corners count as 1 → snake.
// Returns: { totalClicks, realJunctionsOnSolution, allRealJunctions }
function realJunctionMetrics(g) {
  let s = null, gl = null;
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    if (g[r][c] === 'S') s = { r, c };
    if (g[r][c] === 'G') gl = { r, c };
  }
  // BFS to find shortest solution and trace back
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
  // Trace solution path of (cell, incomingDirection) pairs
  const trace = [];
  let cur = gl.r + ',' + gl.c;
  while (parent.has(cur)) {
    const p = parent.get(cur);
    const [r, c] = cur.split(',').map(Number);
    trace.unshift({ r, c, from: p.from, incoming: p.dirArr });
    cur = p.from;
  }
  // For each step in the solution (except final goal arrival), count
  // walkable choices at the START of that step
  let realJunctionsOnSolution = 0;
  // The "decision point" is the cell BEFORE each click. That's the parent.
  // Actually decision happens at the current pono position when clicking.
  // For each parent → child edge, check parent's openDirs (excluding back from previous).
  // For S, the back is null.
  for (let i = 0; i < trace.length; i++) {
    const step = trace[i];
    const [pr, pc] = step.from.split(',').map(Number);
    // Previous incoming direction (the back direction from parent's parent)
    let back = null;
    if (i > 0) {
      const prev = trace[i - 1];
      back = prev.incoming;
    }
    const dirs = openDirs(g, pr, pc, back);
    if (dirs.length >= 2) realJunctionsOnSolution++;
  }
  // Count all real junctions in the maze (anywhere)
  let allRealJunctions = 0;
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    if (!isW(g, r, c)) continue;
    if (g[r][c] === 'G') continue;
    if (openDirs(g, r, c, null).length >= 3) allRealJunctions++;
  }
  return {
    clicks: trace.length,
    realJunctionsOnSolution,
    allRealJunctions,
  };
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

// AUDIT 6: Obstacles must actually BLOCK something.
// For each obstacle (C/W/T/R), if we replace it with '.', the optimal solution
// click count must DECREASE (i.e. without it, the player has a shortcut).
// This guarantees the obstacle is forcing a detour, not just decoration.
function auditObstaclesAreBlockers(g) {
  const baseClicks = solveClicks(g);
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    const ch = g[r][c];
    if (ch !== 'C' && ch !== 'W' && ch !== 'T' && ch !== 'R') continue;
    // Replace this single obstacle with '.' and re-solve
    const grid2 = g.slice();
    const row = g[r].split('');
    row[c] = '.';
    grid2[r] = row.join('');
    const newClicks = solveClicks(grid2);
    // If removing the obstacle does NOT change clicks, it wasn't blocking anything
    if (newClicks === baseClicks) return false;
    if (newClicks < 0) return false;
  }
  return true;
}

// ─── Place apples (at dead-ends) and obstacles (ON the path, blocking shortcuts) ───
//
// Apples = bonus collectibles → at dead-ends is fine (player must detour to grab)
// Obstacles (C/W/T) = MUST block a path the player would otherwise take.
// Strategy:
//   1. Place apples at random dead-ends (player-reachable)
//   2. For each obstacle slot:
//      - Find a non-S, non-G, non-A path cell whose conversion to obstacle:
//        a) keeps the maze solvable
//        b) keeps no-dead-state property
//        c) keeps no-stranded (no orphaned path cells)
//        d) does NOT change other obstacles' positions to invalid
//        e) actually CHANGES the optimal solution click count (it's a blocker)
function placeObstacles(rawGrid, rng, obstacleCount, applesCount) {
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

  // ── 1. Apples at dead-ends ──
  let reachable = playerReachableCells(gridStr());
  let de = deadEnds(reachable);
  shuffle(de, rng);
  for (let i = 0; i < Math.min(applesCount, de.length); i++) {
    arr[de[i].r][de[i].c] = 'A';
  }

  // ── 2. Obstacles ON path cells, only if they actually block ──
  const obstacleChars = ['C', 'W', 'T'];
  let placed = 0;
  let attempts = 0;
  const maxAttempts = 200;
  while (placed < obstacleCount && attempts < maxAttempts) {
    attempts++;
    // Collect all candidate cells: '.' that are player-reachable
    reachable = playerReachableCells(gridStr());
    const candidates = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (arr[r][c] !== '.') continue;
      if (!reachable.has(r + ',' + c)) continue;
      // Skip dead-ends — not blockers
      let n = 0;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (isPath(r + dr, c + dc)) n++;
      }
      if (n === 1) continue;
      candidates.push({ r, c });
    }
    if (candidates.length === 0) break;
    shuffle(candidates, rng);
    // Try each candidate
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
        newClicks !== beforeClicks &&  // MUST change solution = actual blocker
        auditNoDeadStates(newGrid) &&
        auditNoStranded(newGrid)
      ) {
        success = true;
        placed++;
        break;
      } else {
        // Revert
        arr[cand.r][cand.c] = before;
      }
    }
    if (!success) break; // No more valid placements
  }

  return gridStr();
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function countCh(g, ch) {
  let n = 0;
  for (const row of g) for (const c of row) if (c === ch) n++;
  return n;
}

// ─── Search loop with full pipeline + real-junction + blocker audit ───
function findStage(cellRows, cellCols, minClicks, minRealJunctions, obstacleCount, applesCount) {
  let best = null;
  for (let seed = 1; seed <= 30000; seed++) {
    const rng = mulberry32(seed * 7919 + 13);
    const raw = genMaze(cellRows, cellCols, seed);
    const pruned = pruneUnreachable(raw);
    if (!pruned) continue;
    const final = placeObstacles(pruned, rng, obstacleCount, applesCount);
    if (countCh(final, 'C') + countCh(final, 'W') + countCh(final, 'T') < obstacleCount) continue;
    if (!auditNoDeadStates(final)) continue;
    if (!auditNoSpamSolve(final)) continue;
    if (!auditNoStranded(final)) continue;
    if (!auditNoUselessObstacles(final)) continue;
    if (!auditObstaclesAreBlockers(final)) continue;
    const clicks = solveClicks(final);
    if (clicks < minClicks) continue;
    const metrics = realJunctionMetrics(final);
    if (metrics.realJunctionsOnSolution < minRealJunctions) continue;
    const dirs = solutionDirections(final);
    const score = metrics.realJunctionsOnSolution * 100 + clicks * 10 + dirs * 3;
    if (!best || score > best.score) {
      best = {
        grid: final,
        clicks,
        dirs,
        seed,
        score,
        realJunctionsOnSolution: metrics.realJunctionsOnSolution,
        allRealJunctions: metrics.allRealJunctions,
      };
    }
    if (best && best.realJunctionsOnSolution >= minRealJunctions + 1 && best.clicks >= minClicks + 1) break;
  }
  return best;
}

// ─── Stage specs ───
// Tall layouts (rows >= cols) so cells stay big enough for arrow buttons.
// Viewport ~540×600 → max recommended grid: 11 cols × 14 rows ish.
const SPECS = [
  { rows: 4,  cols: 3, minClicks: 3,  minRealJunctions: 1, obstacles: 1, apples: 0, name: 'ステージ 2 — わかれみち' },
  { rows: 5,  cols: 4, minClicks: 5,  minRealJunctions: 2, obstacles: 1, apples: 1, name: 'ステージ 3 — ふかいもり' },
  { rows: 7,  cols: 5, minClicks: 8,  minRealJunctions: 3, obstacles: 2, apples: 2, name: 'ステージ 4 — めいろの もり' },
  { rows: 10, cols: 7, minClicks: 12, minRealJunctions: 5, obstacles: 3, apples: 3, name: 'ステージ 5 — まいごの もり' },
];

console.log('=== Generating stages ===\n');
const results = [];
for (const spec of SPECS) {
  const r = findStage(spec.rows, spec.cols, spec.minClicks, spec.minRealJunctions, spec.apples);
  if (!r) { console.log(spec.name, '— FAILED'); continue; }
  results.push(Object.assign({}, spec, r));
  const apples = countCh(r.grid, 'A');
  const cats = countCh(r.grid, 'C');
  const water = countCh(r.grid, 'W');
  const thorn = countCh(r.grid, 'T');
  console.log(spec.name);
  console.log(`  ${r.grid.length}x${r.grid[0].length}  clicks=${r.clicks}  realJ-on-sol=${r.realJunctionsOnSolution} (min=${spec.minRealJunctions})  dirs=${r.dirs}  seed=${r.seed}`);
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
  const metrics = realJunctionMetrics(r.grid);
  const realJOk = metrics.realJunctionsOnSolution >= r.minRealJunctions;
  const ok = widths.length === 1 && clicks >= r.minClicks && dead && noSpam && stranded && useless && realJOk;
  if (!ok) allOk = false;
  console.log(
    `${r.name}: w=${widths.join(',')} clicks=${clicks}/${r.minClicks} ` +
    `realJ=${metrics.realJunctionsOnSolution}/${r.minRealJunctions} ` +
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
