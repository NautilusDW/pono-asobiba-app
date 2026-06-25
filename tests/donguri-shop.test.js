// Test harness for js/donguri-shop.js (rotation shop logic)
// Mocks window/localStorage/PonoGameStickers/spendAcorns and loads the script.
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ABS_SCRIPT_PATH = path.resolve(__dirname, '../js/donguri-shop.js');

let passed = 0;
let failed = 0;
const failures = [];
const tests = [];

function test(name, fn) { tests.push({ name, fn }); }

async function runTest({ name, fn }) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') await r;
    console.log('  PASS:', name);
    passed++;
  } catch (e) {
    console.log('  FAIL:', name);
    console.log('    ', e && e.message ? e.message : e);
    if (e && e.stack) console.log(e.stack.split('\n').slice(1, 4).join('\n'));
    failures.push(name);
    failed++;
  }
}

// ----- Mock environment -----
function makeMockLocalStorage(failingSetter) {
  const store = {};
  return {
    _store: store,
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) {
      if (failingSetter && failingSetter()) throw new Error('mock LS setItem failure');
      store[k] = String(v);
    },
    removeItem(k) { delete store[k]; },
    clear() { for (const k of Object.keys(store)) delete store[k]; },
  };
}

function makeMockWindow(localStorage) {
  const listeners = {};
  const events = [];
  const win = {
    localStorage,
    addEventListener(type, cb) { (listeners[type] = listeners[type] || []).push(cb); },
    removeEventListener(type, cb) {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter(x => x !== cb);
    },
    dispatchEvent(ev) {
      events.push(ev);
      const arr = listeners[ev.type] || [];
      for (const cb of arr.slice()) cb(ev);
      return true;
    },
    _listeners: listeners,
    _events: events,
  };
  win.CustomEvent = function (type, init) {
    this.type = type;
    this.detail = (init && init.detail) || null;
  };
  return win;
}

function makeMockPonoGameStickers(pages, ownedByGame) {
  const grants = [];
  return {
    _grants: grants,
    loadCatalog: () => Promise.resolve({ version: 1, pages: pages }),
    getOwned: (gameId) => {
      if (!gameId) {
        const all = {};
        for (const g of Object.keys(ownedByGame || {})) all[g] = { owned: ownedByGame[g] };
        return all;
      }
      return (ownedByGame && ownedByGame[gameId]) || {};
    },
    grant: (opts) => {
      grants.push(opts);
      return Promise.resolve({
        gameId: opts.gameId,
        stickerId: opts.stickerId,
        sticker: { id: opts.stickerId, name: 'mock' },
        count: 1,
        first: true,
      });
    },
  };
}

const SAMPLE_PAGES = {
  quizland: {
    title: 'なぞなぞランド',
    accent: '#7C5CFF',
    stickers: [
      { id: 'q1', name: 'なぞなぞ 1' },
      { id: 'q2', name: 'なぞなぞ 2' },
      { id: 'q3', name: 'なぞなぞ 3' },
    ],
  },
  maze: {
    title: 'もりの めいろ',
    accent: '#6C8E3F',
    stickers: [
      { id: 'm1', name: 'めいろ 1' },
      { id: 'm2', name: 'めいろ 2' },
    ],
  },
  bento: {
    title: 'おべんとう',
    accent: '#F2915A',
    stickers: [{ id: 'b1', name: 'おべんとう 1' }],
  },
};

// 30-sticker catalog for rotation statistical tests.
function makeBigPages(n) {
  const stickers = [];
  for (let i = 0; i < n; i++) stickers.push({ id: 's' + i, name: 'sticker ' + i });
  return { stickerland: { title: 'スティッカー', accent: '#888', stickers } };
}

function loadScript(win) {
  const src = fs.readFileSync(ABS_SCRIPT_PATH, 'utf8');
  const fn = new Function('window', 'localStorage', src);
  fn(win, win.localStorage);
  return win.PonoDonguriShop;
}

function setAcorns(win, n) {
  let bal = n;
  win.getAcorns = () => bal;
  win.spendAcorns = (cost) => {
    if (bal < cost) return false;
    bal -= cost;
    return true;
  };
  win._getBal = () => bal;
}

function preseed(win, record) {
  win.localStorage.setItem('pono_donguri_shop_v1', JSON.stringify(record));
}

// Force the rotation cache so existing legacy tests can rely on q1/q2/m1 being purchasable.
// shopKey is computed inside the script; we use __PonoDonguriShopNow to pin time at JST 00:00
// of an arbitrary date and seed the rotation LS to contain whatever ids the caller wants.
function pinTimeJST(win, year, month0, day, hourUtcInJst) {
  // hour given as JST hour 0..23.
  // _jstNow does Date.now()+9h then reads UTC fields. To make jstNow report
  // (year, month0, day, hourUtcInJst), our injected Date.now() must equal
  // Date.UTC(y,m,d,hour) - 9h.
  const targetUtcMs = Date.UTC(year, month0, day, hourUtcInJst, 0, 0, 0);
  const mockMs = targetUtcMs - 9 * 3600 * 1000;
  win.__PonoDonguriShopNow = () => mockMs;
  // shopKey: YYYY-MM-DD : floor(hour/3)
  const pad2 = (n) => (n < 10 ? '0' : '') + n;
  const shopKey = year + '-' + pad2(month0 + 1) + '-' + pad2(day) + ':' + Math.floor(hourUtcInJst / 3);
  return shopKey;
}

function seedRotation(win, shopKey, stickerIds, prevStickerIds) {
  win.localStorage.setItem('pono_donguri_shop_rotation_v1', JSON.stringify({
    schemaVersion: 1,
    shopKey,
    stickerIds,
    prevStickerIds: prevStickerIds || [],
    generatedAt: '2026-06-25T00:00:00+09:00'
  }));
}

// ============================================================================
// Sanity
// ============================================================================
test('script file exists and is non-empty', () => {
  const stat = fs.statSync(ABS_SCRIPT_PATH);
  assert.ok(stat.size > 100, 'script file should be > 100 bytes');
});

// ============================================================================
// LEGACY TESTS 1..15 (updated for rotation semantics)
// ============================================================================

// Legacy 1: getCatalog returns full pool (rotation is via getRotation()).
test('L1. getCatalog returns full pool [{id, gameId, name, owned, costAcorns:50}, ...]', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  win.PonoGameStickers = makeMockPonoGameStickers(SAMPLE_PAGES, {});
  const api = loadScript(win);
  const cat = await api.getCatalog();
  assert.ok(Array.isArray(cat), 'returns array');
  assert.strictEqual(cat.length, 6, 'has 6 stickers across 3 games');
  for (const entry of cat) {
    assert.ok(entry.id);
    assert.ok(entry.gameId);
    assert.strictEqual(typeof entry.name, 'string');
    assert.strictEqual(typeof entry.owned, 'boolean');
    assert.strictEqual(entry.costAcorns, 50);
  }
});

test('L2. getCatalog owned flag reflects PonoGameStickers state', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  win.PonoGameStickers = makeMockPonoGameStickers(SAMPLE_PAGES, {
    quizland: { q1: { count: 1 } },
  });
  const api = loadScript(win);
  const cat = await api.getCatalog();
  const q1 = cat.find(e => e.id === 'q1');
  const q2 = cat.find(e => e.id === 'q2');
  assert.strictEqual(q1.owned, true);
  assert.strictEqual(q2.owned, false);
});

test('L3. canPurchase true when balance>=50 AND sticker in rotation AND not owned', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 50);
  const shopKey = pinTimeJST(win, 2026, 5, 25, 12); // JST 12:00 -> slot 4
  seedRotation(win, shopKey, ['q1', 'q2', 'm1']);
  win.PonoGameStickers = makeMockPonoGameStickers(SAMPLE_PAGES, {});
  const api = loadScript(win);
  await api.getCatalog();
  assert.strictEqual(api.canPurchase('q1'), true);
});

test('L4. canPurchase false when balance < 50 (even if in rotation)', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 49);
  const shopKey = pinTimeJST(win, 2026, 5, 25, 12);
  seedRotation(win, shopKey, ['q1', 'q2', 'm1']);
  win.PonoGameStickers = makeMockPonoGameStickers(SAMPLE_PAGES, {});
  const api = loadScript(win);
  await api.getCatalog();
  assert.strictEqual(api.canPurchase('q1'), false);
});

test('L5. canPurchase false for unknown stickerId', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 1000);
  const shopKey = pinTimeJST(win, 2026, 5, 25, 12);
  seedRotation(win, shopKey, ['q1', 'q2', 'm1']);
  win.PonoGameStickers = makeMockPonoGameStickers(SAMPLE_PAGES, {});
  const api = loadScript(win);
  await api.getCatalog();
  assert.strictEqual(api.canPurchase('NOPE'), false);
});

test('L6. purchase success: balance 50->0, grant called, history logged', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 50);
  const shopKey = pinTimeJST(win, 2026, 5, 25, 12);
  seedRotation(win, shopKey, ['q1', 'q2', 'm1']);
  const stick = makeMockPonoGameStickers(SAMPLE_PAGES, {});
  win.PonoGameStickers = stick;
  const api = loadScript(win);
  await api.getCatalog();
  const r = await api.purchase('q1');
  assert.strictEqual(r.success, true);
  assert.ok(r.stickerResult);
  assert.strictEqual(win._getBal(), 0);
  assert.strictEqual(stick._grants.length, 1);
  assert.strictEqual(stick._grants[0].gameId, 'quizland');
  assert.strictEqual(stick._grants[0].stickerId, 'q1');
  assert.strictEqual(stick._grants[0].event, 'donguri_shop');
  const hist = api.getPurchaseHistory();
  assert.strictEqual(hist.length, 1);
  assert.strictEqual(hist[0].stickerId, 'q1');
  assert.strictEqual(hist[0].costAcorns, 50);
  assert.ok(hist[0].purchasedAt);
});

test('L7. purchase no-op when balance < 50', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 49);
  const shopKey = pinTimeJST(win, 2026, 5, 25, 12);
  seedRotation(win, shopKey, ['q1', 'q2', 'm1']);
  const stick = makeMockPonoGameStickers(SAMPLE_PAGES, {});
  win.PonoGameStickers = stick;
  const api = loadScript(win);
  await api.getCatalog();
  const r = await api.purchase('q1');
  assert.strictEqual(r.success, false);
  assert.strictEqual(r.reason, 'insufficient_acorns');
  assert.strictEqual(win._getBal(), 49);
  assert.strictEqual(stick._grants.length, 0);
  assert.strictEqual(api.getPurchaseHistory().length, 0);
});

test('L8. purchase no-op for unknown stickerId', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 1000);
  const shopKey = pinTimeJST(win, 2026, 5, 25, 12);
  seedRotation(win, shopKey, ['q1', 'q2', 'm1']);
  const stick = makeMockPonoGameStickers(SAMPLE_PAGES, {});
  win.PonoGameStickers = stick;
  const api = loadScript(win);
  await api.getCatalog();
  const r = await api.purchase('NOPE');
  assert.strictEqual(r.success, false);
  assert.strictEqual(r.reason, 'invalid_sticker');
  assert.strictEqual(win._getBal(), 1000);
  assert.strictEqual(stick._grants.length, 0);
});

test('L9. two consecutive purchases of distinct rotation items: 100 -> 50 -> 0', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  const shopKey = pinTimeJST(win, 2026, 5, 25, 12);
  seedRotation(win, shopKey, ['q1', 'q2', 'm1']);
  const stick = makeMockPonoGameStickers(SAMPLE_PAGES, {});
  win.PonoGameStickers = stick;
  const api = loadScript(win);
  await api.getCatalog();
  const r1 = await api.purchase('q1');
  assert.strictEqual(r1.success, true);
  assert.strictEqual(win._getBal(), 50);
  const r2 = await api.purchase('q2');
  assert.strictEqual(r2.success, true);
  assert.strictEqual(win._getBal(), 0);
  assert.strictEqual(api.getPurchaseHistory().length, 2);
});

test('L10. getPurchaseHistory returns oldest-first', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 200);
  const shopKey = pinTimeJST(win, 2026, 5, 25, 12);
  seedRotation(win, shopKey, ['q1', 'q2', 'm1']);
  const stick = makeMockPonoGameStickers(SAMPLE_PAGES, {});
  win.PonoGameStickers = stick;
  const api = loadScript(win);
  await api.getCatalog();
  await api.purchase('q1');
  await new Promise(r => setTimeout(r, 2));
  await api.purchase('q2');
  const hist = api.getPurchaseHistory();
  assert.strictEqual(hist.length, 2);
  assert.strictEqual(hist[0].stickerId, 'q1');
  assert.strictEqual(hist[1].stickerId, 'q2');
});

test('L11. v0 record discarded, starts with empty purchases', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  preseed(win, { schemaVersion: 0, purchases: [{ stickerId: 'old', costAcorns: 50, purchasedAt: '2025-01-01T00:00:00+09:00' }] });
  const stick = makeMockPonoGameStickers(SAMPLE_PAGES, {});
  win.PonoGameStickers = stick;
  const api = loadScript(win);
  await api.getCatalog();
  const hist = api.getPurchaseHistory();
  assert.strictEqual(hist.length, 0);
});

test('L12. LS write failure -> memory fallback, in-session still works', async () => {
  let writeFails = false;
  const ls = makeMockLocalStorage(() => writeFails);
  const win = makeMockWindow(ls);
  setAcorns(win, 200);
  const shopKey = pinTimeJST(win, 2026, 5, 25, 12);
  seedRotation(win, shopKey, ['q1', 'q2', 'm1']);
  const stick = makeMockPonoGameStickers(SAMPLE_PAGES, {});
  win.PonoGameStickers = stick;
  const api = loadScript(win);
  await api.getCatalog();
  writeFails = true;
  const r = await api.purchase('q1');
  assert.strictEqual(r.success, true);
  assert.strictEqual(win._getBal(), 150);
  const hist = api.getPurchaseHistory();
  assert.strictEqual(hist.length, 1);
  assert.strictEqual(hist[0].stickerId, 'q1');
});

test('L13. PonoGameStickers absent -> getCatalog empty, purchase invalid_sticker', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 1000);
  const api = loadScript(win);
  const cat = await api.getCatalog();
  assert.ok(Array.isArray(cat));
  assert.strictEqual(cat.length, 0);
  const r = await api.purchase('q1');
  assert.strictEqual(r.success, false);
  assert.strictEqual(r.reason, 'invalid_sticker');
});

test('L14. getCatalog returns unowned first', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  win.PonoGameStickers = makeMockPonoGameStickers(SAMPLE_PAGES, {
    quizland: { q1: { count: 1 } },
    maze: { m1: { count: 1 } },
  });
  const api = loadScript(win);
  const cat = await api.getCatalog();
  let firstOwnedIdx = cat.findIndex(e => e.owned);
  if (firstOwnedIdx === -1) firstOwnedIdx = cat.length;
  for (let i = firstOwnedIdx; i < cat.length; i++) {
    assert.strictEqual(cat[i].owned, true);
  }
});

test('L15. purchase dispatches PonoDonguriShopPurchased event', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  const shopKey = pinTimeJST(win, 2026, 5, 25, 12);
  seedRotation(win, shopKey, ['q1', 'q2', 'm1']);
  const stick = makeMockPonoGameStickers(SAMPLE_PAGES, {});
  win.PonoGameStickers = stick;
  const api = loadScript(win);
  await api.getCatalog();
  await api.purchase('q1');
  const ev = win._events.find(e => e.type === 'PonoDonguriShopPurchased');
  assert.ok(ev);
  assert.strictEqual(ev.detail.stickerId, 'q1');
  assert.strictEqual(ev.detail.costAcorns, 50);
});

// ============================================================================
// ROTATION TESTS R1..R14
// ============================================================================

test('R1. getRotation() returns 3 distinct stickerIds when catalog >= 3', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  pinTimeJST(win, 2026, 5, 25, 12);
  win.PonoGameStickers = makeMockPonoGameStickers(makeBigPages(30), {});
  const api = loadScript(win);
  await api.getCatalog();
  const rot = api.getRotation();
  assert.strictEqual(rot.stickerIds.length, 3);
  assert.strictEqual(new Set(rot.stickerIds).size, 3);
});

test('R2. getRotation() is DETERMINISTIC for same shopKey (100 calls -> same result)', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  pinTimeJST(win, 2026, 5, 25, 12);
  win.PonoGameStickers = makeMockPonoGameStickers(makeBigPages(30), {});
  const api = loadScript(win);
  await api.getCatalog();
  const first = api.getRotation();
  for (let i = 0; i < 100; i++) {
    api.__resetRotationLock();
    api.__clearRotationStore();
    // Re-seed catalogCache via _pickRotation path only — but catalog already cached.
    const r = api.getRotation();
    assert.deepStrictEqual(r.stickerIds, first.stickerIds, 'deterministic across reload, iter=' + i);
  }
});

test('R3. Different shopKey -> different rotations (statistical variety across 100 keys)', async () => {
  // Use one window to keep catalog loaded, then iterate by changing clock and clearing rotation.
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  pinTimeJST(win, 2026, 5, 25, 0);
  win.PonoGameStickers = makeMockPonoGameStickers(makeBigPages(30), {});
  const api = loadScript(win);
  await api.getCatalog();
  const sets = new Set();
  for (let i = 0; i < 100; i++) {
    // Vary by day, keep hour=0 so slotId=0.
    const day = 1 + (i % 28);
    pinTimeJST(win, 2026, 5, day, 0);
    api.__resetRotationLock();
    api.__clearRotationStore();
    const r = api.getRotation();
    sets.add(r.stickerIds.slice().sort().join(','));
  }
  // With 30 stickers and varying day, expect substantial variety.
  assert.ok(sets.size > 10, 'expected variety > 10 unique trios, got ' + sets.size);
});

test('R4. Weighted pick: ownedCount=0 -> all 3 results non-owned', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  pinTimeJST(win, 2026, 5, 25, 12);
  win.PonoGameStickers = makeMockPonoGameStickers(makeBigPages(30), {}); // no owned
  const api = loadScript(win);
  await api.getCatalog();
  const rot = api.getRotation();
  for (const sid of rot.stickerIds) {
    const own = api.getOwnershipState(sid);
    assert.strictEqual(own.owned, false, sid + ' should be unowned');
  }
});

test('R5. Weighted pick at ownedCount=15: 500 samples -> non-owned freq > 0.7', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  pinTimeJST(win, 2026, 5, 25, 0);
  const ownedDict = {};
  for (let i = 0; i < 15; i++) ownedDict['s' + i] = { count: 1 };
  win.PonoGameStickers = makeMockPonoGameStickers(makeBigPages(30), { stickerland: ownedDict });
  const api = loadScript(win);
  await api.getCatalog();
  let unownedHits = 0, total = 0;
  for (let i = 0; i < 500; i++) {
    const day = 1 + (i % 28);
    const hour = (i % 8) * 3;
    pinTimeJST(win, 2026, 5, day, hour);
    api.__resetRotationLock();
    api.__clearRotationStore();
    const r = api.getRotation();
    for (const sid of r.stickerIds) {
      total++;
      // unowned = id >= s15
      const idx = parseInt(sid.slice(1), 10);
      if (idx >= 15) unownedHits++;
    }
  }
  const freq = unownedHits / total;
  assert.ok(freq > 0.7, 'expected non-owned freq > 0.7, got ' + freq.toFixed(3));
});

test('R6. Weighted pick at ownedCount=29: missing sticker appears > 70% across 100 samples', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  pinTimeJST(win, 2026, 5, 25, 0);
  const ownedDict = {};
  for (let i = 0; i < 29; i++) ownedDict['s' + i] = { count: 1 }; // s29 is the missing one
  win.PonoGameStickers = makeMockPonoGameStickers(makeBigPages(30), { stickerland: ownedDict });
  const api = loadScript(win);
  await api.getCatalog();
  let hits = 0;
  const N = 100;
  for (let i = 0; i < N; i++) {
    const day = 1 + (i % 28);
    const hour = (i % 8) * 3;
    pinTimeJST(win, 2026, 5, day, hour);
    api.__resetRotationLock();
    api.__clearRotationStore();
    const r = api.getRotation();
    if (r.stickerIds.indexOf('s29') >= 0) hits++;
  }
  const freq = hits / N;
  assert.ok(freq > 0.7, 'expected s29 freq > 0.7, got ' + freq.toFixed(3));
});

test('R7. Weighted pick at ownedCount=30 (all): fallback, all 3 are owned', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  pinTimeJST(win, 2026, 5, 25, 12);
  const ownedDict = {};
  for (let i = 0; i < 30; i++) ownedDict['s' + i] = { count: 1 };
  win.PonoGameStickers = makeMockPonoGameStickers(makeBigPages(30), { stickerland: ownedDict });
  const api = loadScript(win);
  await api.getCatalog();
  const r = api.getRotation();
  assert.strictEqual(r.stickerIds.length, 3);
  for (const sid of r.stickerIds) {
    const own = api.getOwnershipState(sid);
    assert.strictEqual(own.owned, true, sid + ' should be owned in all-owned fallback');
  }
});

test('R8. In-session lock: cross slot boundary, getRotation() still returns original 3', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  pinTimeJST(win, 2026, 5, 25, 12); // slot 4
  win.PonoGameStickers = makeMockPonoGameStickers(makeBigPages(30), {});
  const api = loadScript(win);
  await api.getCatalog();
  const r1 = api.getRotation();
  // Move clock to next slot (15:00) but DO NOT reset lock.
  pinTimeJST(win, 2026, 5, 25, 15);
  const r2 = api.getRotation();
  assert.deepStrictEqual(r2.stickerIds, r1.stickerIds, 'lock should preserve original rotation');
  assert.strictEqual(r2.shopKey, r1.shopKey, 'shopKey preserved by lock');
});

test('R9. canPurchase(stickerId not in rotation) -> false (even with balance)', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 10000);
  const shopKey = pinTimeJST(win, 2026, 5, 25, 12);
  seedRotation(win, shopKey, ['q2', 'q3', 'm1']); // q1 NOT in rotation
  win.PonoGameStickers = makeMockPonoGameStickers(SAMPLE_PAGES, {});
  const api = loadScript(win);
  await api.getCatalog();
  assert.strictEqual(api.canPurchase('q1'), false);
  assert.strictEqual(api.canPurchase('q2'), true);
});

test('R10. canPurchase(owned sticker in rotation) -> false (heart UX, no double-buy)', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 10000);
  const shopKey = pinTimeJST(win, 2026, 5, 25, 12);
  seedRotation(win, shopKey, ['q1', 'q2', 'm1']);
  win.PonoGameStickers = makeMockPonoGameStickers(SAMPLE_PAGES, {
    quizland: { q1: { count: 1 } }, // q1 owned
  });
  const api = loadScript(win);
  await api.getCatalog();
  // Per spec note: owned stickers SHOULD appear in rotation but canPurchase returns FALSE.
  // UI shows heart-tap state instead of buy button.
  assert.strictEqual(api.canPurchase('q1'), false, 'owned -> false (heart UX)');
  assert.strictEqual(api.canPurchase('q2'), true, 'unowned in rotation -> true');
  const own = api.getOwnershipState('q1');
  assert.strictEqual(own.owned, true);
  assert.strictEqual(own.count, 1);
});

test('R11. isNew(stickerId): false when prev empty (NTH1, no isAlwaysNew illusion); reflects diff after a real prev', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  pinTimeJST(win, 2026, 5, 25, 12);
  win.PonoGameStickers = makeMockPonoGameStickers(makeBigPages(30), {});
  const api = loadScript(win);
  await api.getCatalog();
  const r1 = api.getRotation();
  // v1588 NTH1: initial rotation (prev empty) -> nothing is new.
  for (const sid of r1.stickerIds) {
    assert.strictEqual(api.isNew(sid), false, sid + ' should NOT be new on first rotation (prev empty)');
  }
  // Stable: re-read rotation in same lock, still nothing new.
  for (const sid of r1.stickerIds) assert.strictEqual(api.isNew(sid), false);
  // Advance to next shopKey so prev carries over from LS.
  pinTimeJST(win, 2026, 5, 26, 0); // next day, slot 0
  api.__resetRotationLock();
  const r2 = api.getRotation();
  // r2 prevStickerIds should equal r1.stickerIds (carried from LS).
  assert.deepStrictEqual(r2.prevStickerIds.slice().sort(), r1.stickerIds.slice().sort());
  // Any sticker in r2 AND in r1 -> not new; else -> new (prev now non-empty).
  for (const sid of r2.stickerIds) {
    const expected = r1.stickerIds.indexOf(sid) < 0;
    assert.strictEqual(api.isNew(sid), expected, sid + ' isNew should be ' + expected);
  }
});

test('R12. getSlotTimeUntilNext returns correct hoursRemaining for arbitrary JST times', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  win.PonoGameStickers = makeMockPonoGameStickers(SAMPLE_PAGES, {});
  const api = loadScript(win);
  await api.getCatalog();
  // At JST 12:00 -> next slot 15:00 -> 3h remaining.
  pinTimeJST(win, 2026, 5, 25, 12);
  let s = api.getSlotTimeUntilNext();
  assert.ok(Math.abs(s.hoursRemaining - 3) < 0.001, 'JST 12:00 -> 3h, got ' + s.hoursRemaining);
  assert.ok(s.nextSlotJST instanceof Date);
  // At JST 13:30 -> next slot 15:00 -> 1.5h.
  const targetUtcMs = Date.UTC(2026, 5, 25, 13, 30, 0, 0);
  win.__PonoDonguriShopNow = () => targetUtcMs - 9 * 3600 * 1000;
  s = api.getSlotTimeUntilNext();
  assert.ok(Math.abs(s.hoursRemaining - 1.5) < 0.001, 'JST 13:30 -> 1.5h, got ' + s.hoursRemaining);
  // At JST 23:00 -> next slot 00:00 next day -> 1h.
  const t2 = Date.UTC(2026, 5, 25, 23, 0, 0, 0);
  win.__PonoDonguriShopNow = () => t2 - 9 * 3600 * 1000;
  s = api.getSlotTimeUntilNext();
  assert.ok(Math.abs(s.hoursRemaining - 1) < 0.001, 'JST 23:00 -> 1h, got ' + s.hoursRemaining);
});

test('R13. LS schemaVersion mismatch -> recompute (rotation regenerated)', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  pinTimeJST(win, 2026, 5, 25, 12);
  // Pre-seed a v0 rotation record with bogus stickerIds.
  win.localStorage.setItem('pono_donguri_shop_rotation_v1', JSON.stringify({
    schemaVersion: 0, shopKey: 'bogus', stickerIds: ['BAD1', 'BAD2', 'BAD3']
  }));
  win.PonoGameStickers = makeMockPonoGameStickers(makeBigPages(30), {});
  const api = loadScript(win);
  await api.getCatalog();
  const r = api.getRotation();
  for (const sid of r.stickerIds) {
    assert.ok(sid.indexOf('BAD') < 0, 'bogus id should not appear: ' + sid);
    assert.ok(/^s\d+$/.test(sid), 'real id expected: ' + sid);
  }
});

test('R14. prevStickerIds carries over correctly after rotation change', async () => {
  const ls = makeMockLocalStorage();
  const win = makeMockWindow(ls);
  setAcorns(win, 100);
  pinTimeJST(win, 2026, 5, 25, 0); // day 25, slot 0
  win.PonoGameStickers = makeMockPonoGameStickers(makeBigPages(30), {});
  const api = loadScript(win);
  await api.getCatalog();
  const r1 = api.getRotation();
  assert.deepStrictEqual(r1.prevStickerIds, []);
  // Advance to day 26 slot 0, reset lock to allow recompute.
  pinTimeJST(win, 2026, 5, 26, 0);
  api.__resetRotationLock();
  const r2 = api.getRotation();
  assert.deepStrictEqual(r2.prevStickerIds.slice().sort(), r1.stickerIds.slice().sort());
  assert.notStrictEqual(r2.shopKey, r1.shopKey);
});

// ============================================================================
// Run
// ============================================================================
(async () => {
  for (const t of tests) await runTest(t);
  console.log('\n=========================================');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log('  -', f);
    process.exit(1);
  } else {
    console.log('All tests passed!');
    process.exit(0);
  }
})();
