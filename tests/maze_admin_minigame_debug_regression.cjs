'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const maze = read('maze/index.html');
const admin = read('admin/index.html');
const editor = read('tools/maze-editor.html');
const worker = read('src/worker.js');
const sw = read('sw.js');
const stage4 = JSON.parse(read('maze/imageStages/stage4.json'));

function parseInlineScripts(label, html, expectedCount) {
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;
  while ((match = re.exec(html))) {
    if (/\bsrc=/.test(match[1])) continue;
    count++;
    new vm.Script(match[2], { filename: `${label}-inline-${count}.js` });
  }
  assert.equal(count, expectedCount, `${label}: unexpected inline script count`);
}

parseInlineScripts('maze', maze, 4);
parseInlineScripts('admin', admin, 2);
parseInlineScripts('maze-editor', editor, 1);

// Stage 4 keeps the pond encounter, but the retired pickup coordinates must be gone.
assert.deepEqual(
  Object.keys(stage4.waterGimmick || {}).sort(),
  ['encounterRadius', 'id', 'obstacleId'],
  'Stage 4 waterGimmick must no longer serialize the retired plank item',
);
assert.equal(stage4.waterGimmick.obstacleId, 'stage4-water-puddle');
assert.ok((stage4.obstacles || []).some((item) => item && item.id === 'stage4-water-puddle' && item.kind === 'pond'));
assert.match(maze, /const MAZE_DATA_REV = '20260712';/);

const retiredRuntimeTokens = [
  '_checkWaterPlankPickup',
  'plankCollected',
  'lineSkateReady',
  'MAZE_WATER_ASSETS.plankItem',
  'plank_item.png',
  'plank_bridge_complete.png',
  "_showItemHintModal('plank')",
];
for (const token of retiredRuntimeTokens) {
  assert.ok(!maze.includes(token), `Maze runtime still contains retired plank token: ${token}`);
}
assert.match(
  maze,
  /function _handleWaterGimmickObstacle\([\s\S]*?if \(st\.bridgeBuilt\) return false;[\s\S]*?_triggerWaterGimmickEncounter\(o\);/,
  'the pond must still open the current water-skate encounter directly',
);

// Editor UI/export cannot recreate the item, while old drafts are migrated on read.
assert.ok(!editor.includes('data-ikind="plank"'), 'editor still exposes the plank placement button');
assert.ok(!editor.includes("imageUrl: '../assets/images/maze/gimmicks/water/plank_item.png'"));
assert.ok(!/\n\s*plank:\s*\{/.test(editor), 'editor still registers a plank item definition');
assert.match(editor, /gimmickItems\.filter\(function\(item\) \{ return item && item\.kind !== 'plank'; \}\)/);
assert.match(editor, /state\.gimmickItems\.filter\(function\(it\) \{ return it && it\.kind !== 'plank' && !it\.isObstacleProxy; \}\)/);
assert.match(editor, /if \(state\.gimmickConfigs\.waterGimmick\) delete state\.gimmickConfigs\.waterGimmick\.plank;/);
assert.match(editor, /const waterExisting = state\.gimmickConfigs && state\.gimmickConfigs\.waterGimmick;[\s\S]*?def\.waterGimmick = waterCfg;/);
assert.match(editor, /\['waterGimmick', 'pond', null\]/, 'water event link repair must not depend on a pickup anchor');

const retiredFiles = [
  'assets/images/maze/gimmicks/water/plank_item.png',
  'assets/images/maze/gimmicks/water/plank_bridge_complete.png',
  'native/www/assets/images/maze/gimmicks/water/plank_item.png',
  'native/www/assets/images/maze/gimmicks/water/plank_bridge_complete.png',
];
for (const rel of retiredFiles) {
  assert.ok(!fs.existsSync(path.join(root, rel)), `retired plank file still exists: ${rel}`);
}

const retiredHashes = new Set([
  '58ab417ce3e57f1b817b4b59b24bf49e6e068fa215f963bcb00455fc71d65bab',
  'afb827531ba95e0e3a6d0e7b3825d2687dfe2b6b2974e57063c9682adcfcdd66',
]);
function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}
for (const file of walk(path.join(root, 'assets/images/maze'), [])) {
  const digest = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert.ok(!retiredHashes.has(digest), `retired plank bytes resurfaced as ${path.relative(root, file)}`);
}

// The management dashboard exposes each canonical game once; the legacy alias is internal only.
const canonicalGames = [
  'janken', 'truefalse', 'simon', 'silhouette', 'oddone',
  'flag', 'water_bridge', 'strength_push', 'donguri_bowl',
];
const adminButtons = Array.from(admin.matchAll(/data-maze-debug-game="([^"]+)"/g), (m) => m[1]);
assert.deepEqual(adminButtons.sort(), canonicalGames.slice().sort());
assert.equal(new Set(adminButtons).size, 9, 'admin must render exactly nine unique Maze launch buttons');
assert.ok(!adminButtons.includes('web_sweep'), 'legacy bowl alias must not be shown as a tenth game');
assert.equal((admin.match(/id="maze-debug-frame"/g) || []).length, 1, 'admin must reuse one preview iframe');
assert.match(admin, /id="maze-debug-frame"[^>]*allow="autoplay"[^>]*data-src="\.\.\/maze\/\?adminDebug=1"/);
assert.match(admin, /\.maze-debug-preview\s*\{[\s\S]*?aspect-ratio:\s*16\s*\/\s*9;/);
assert.match(admin, /\.maze-debug-game-btn\s*\{[\s\S]*?min-height:\s*48px;/);
assert.match(admin, /function mazeReloadMinigameDebug\(\) \{[\s\S]*?mazeDebugPendingGame = '';/);

const bridgeStart = maze.indexOf('// ===== Basic Auth 管理ダッシュボード専用ミニゲーム起動ブリッジ =====');
const bridgeEnd = maze.indexOf('\nfunction _closeEncounter(playerWon)', bridgeStart);
assert.ok(bridgeStart > 0 && bridgeEnd > bridgeStart, 'Maze admin debug bridge is missing');
const bridge = maze.slice(bridgeStart, bridgeEnd);
const bridgeContext = {
  window: {
    location: { origin: 'https://example.test', pathname: '/maze/' },
    parent: { location: { origin: 'https://example.test', pathname: '/admin/' } },
  },
};
vm.runInNewContext(
  bridge + '; this.__bridgeKeys = Object.keys(MAZE_ADMIN_DEBUG_GAMES); this.__trusted = _mazeAdminDebugParentIsTrusted();',
  bridgeContext,
);
assert.deepEqual(Array.from(bridgeContext.__bridgeKeys).sort(), canonicalGames.slice().sort());
assert.equal(bridgeContext.__trusted, true, 'same-origin /admin parent should be trusted');

const selfContext = { window: { location: { origin: 'https://example.test', pathname: '/maze/' } } };
selfContext.window.parent = selfContext.window;
vm.runInNewContext(bridge + '; this.__trusted = _mazeAdminDebugParentIsTrusted();', selfContext);
assert.equal(selfContext.__trusted, false, 'top-level/self messages must never enable the bridge');
const wrongParentContext = {
  window: {
    location: { origin: 'https://example.test', pathname: '/maze/' },
    parent: { location: { origin: 'https://example.test', pathname: '/play' } },
  },
};
vm.runInNewContext(bridge + '; this.__trusted = _mazeAdminDebugParentIsTrusted();', wrongParentContext);
assert.equal(wrongParentContext.__trusted, false, 'a non-admin same-origin parent must be rejected');

assert.match(bridge, /event\.origin !== window\.location\.origin \|\| event\.source !== window\.parent/);
assert.match(bridge, /Object\.prototype\.hasOwnProperty\.call\(MAZE_ADMIN_DEBUG_GAMES, gameId\)/);
assert.match(bridge, /_triggerEncounter\(creature\);/, 'admin launch must use the normal encounter/start-beat path');
assert.ok(!bridge.includes('_GAME_STARTERS[gameId]'), 'admin launch must not bypass the BGM/start button path');
assert.ok(!maze.includes('debugMinigame='), 'public query-string minigame launch must not exist');

// Rapid stop/switch must invalidate raw timers from the previous Janken/Simon run.
assert.match(maze, /let _encounterRunGeneration = 0;/);
assert.match(maze, /function _triggerEncounter\(c\) \{[\s\S]*?\+\+_encounterRunGeneration;/);
const jankenStart = maze.indexOf('function _resolveJanken(playerHand)');
const jankenEnd = maze.indexOf('\n// ════════════════════════════════════════════════════════════', jankenStart);
const jankenFn = maze.slice(jankenStart, jankenEnd);
assert.match(jankenFn, /const encounterGeneration = _encounterRunGeneration;/);
assert.match(jankenFn, /const encounterCreature = _currentCreature;/);
assert.ok(
  (jankenFn.match(/jankenEncounterIsCurrent\(\)/g) || []).length >= 3,
  'every delayed Janken phase/voice must reject a stale encounter',
);
assert.match(jankenFn, /_jankenEncounterKey\(encounterCreature\)/);

const simonStart = maze.indexOf('function _showSimonGame()');
const simonEnd = maze.indexOf('\nfunction _onSimonTap', simonStart);
const simonFn = maze.slice(simonStart, simonEnd);
assert.match(simonFn, /const simonEncounterIsCurrent = function\(\)/);
assert.match(simonFn, /if \(_simonCancelled \|\| !simonEncounterIsCurrent\(\)\) return;/);
assert.match(simonFn, /setTimeout\(function\(\) \{\s*if \(!simonEncounterIsCurrent\(\)\) return;/);

const closeStart = maze.indexOf('function _closeEncounter(playerWon)');
const closeEnd = maze.indexOf('\n// ====== Apple pickup popup', closeStart);
const closeFn = maze.slice(closeStart, closeEnd);
assert.match(closeFn, /\+\+_encounterRunGeneration;/);
const debugReturn = closeFn.indexOf('if (wasAdminDebug)');
assert.ok(debugReturn > 0, 'normal encounter close is missing the admin-debug early return');
assert.ok(debugReturn < closeFn.indexOf('if (playerWon)'), 'admin debug must exit before normal victory progression');
assert.ok(debugReturn < closeFn.indexOf('_defeatedCreatures.add(cid)'), 'admin debug must not mark a real creature defeated');
assert.match(maze, /function _closeFlagEncounterModalOnly\(\) \{[\s\S]*?const wasAdminDebug = _mazeAdminDebugActive;[\s\S]*?_mazeAdminDebugFinish/);
assert.match(maze, /function _closeFlagEncounterModalOnly\(\) \{[\s\S]*?\+\+_encounterRunGeneration;/);

// Preserve the server-side security boundary and the SW bypass needed for Basic Auth prompts.
assert.match(worker, /const PROTECTED_PREFIXES = \[[\s\S]*?'\/admin\/'[\s\S]*?'\/admin'/);
assert.match(worker, /function checkBasicAuth\(request, env\)/);
assert.match(sw, /event\.request\.url\.includes\('\/admin\/'\)[\s\S]*?return;/);

console.log('maze admin minigame debug / retired plank regression: PASS');
