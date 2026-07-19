// ────────────────────────────────────────────────────────
// maze-shared.js — maze-rough.html / maze-editor.html 共通ヘルパー
// ────────────────────────────────────────────────────────
// 両ツールで body が完全一致していた関数・定数のみをここに集約する。
// 実装が異なる同名関数 (draw, pushHistory, showBanner, compressImageToDataURL,
// scheduleAutoSave 等) は各 HTML 側に残してあるので、ここに統合しないこと。
// このファイルは各 HTML のインライン <script> より前に読み込む前提
// (<script src="maze-shared.js"></script>)。tools/ は SW バイパスなので
// CACHE_VERSION バンプは不要。

// ── ラフ→エディタ handoff 共有キー ──
// ラフ側 (maze-rough.html) が常時 localStorage[HANDOFF_KEY] に handoff JSON
// (version:1, source:'maze-rough.html') を書き出し、エディタ側が起動時に取り込む。
const HANDOFF_KEY = 'pono_maze_rough_handoff_v1';
// 2画面ラフ (panels===2) の canvas snapshot (1920×1080 PNG dataURL × 2) を
// 受け渡す IndexedDB の所在。localStorage の 5MB 制限を回避するため別ストアに置く。
const HANDOFF_IDB_NAME = 'pono_maze_handoff_v1';
const HANDOFF_IDB_STORE = 'images';
const HANDOFF_IDB_KEY = 'rough_handoff_images';

// handoff 用 IndexedDB を開く (なければ objectStore を作成)。
// 書き込みはラフ側 _handoffIdbPut、読み出しはエディタ側 _handoffIdbGet が使う。
function _handoffIdbOpen() {
  return new Promise(function(res, rej) {
    try {
      const r = indexedDB.open(HANDOFF_IDB_NAME, 1);
      r.onupgradeneeded = function() {
        const db = r.result;
        if (!db.objectStoreNames.contains(HANDOFF_IDB_STORE)) {
          db.createObjectStore(HANDOFF_IDB_STORE);
        }
      };
      r.onsuccess = function() { res(r.result); };
      r.onerror = function() { rej(r.error); };
    } catch (e) { rej(e); }
  });
}

// ── GitHub commit (via /api/gh/ — Cloudflare Worker GitHub proxy) ──
const REPO_OWNER = 'NautilusDW';
const REPO_NAME = 'pono-asobiba-app';
const REPO_BRANCH = 'develop';

// UTF-8 セーフな btoa (日本語ステージ名対応)
function utf8Btoa(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

async function ghGet(path) {
  const url = '/api/gh/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' +
              encodeURI(path) + '?ref=' + REPO_BRANCH;
  const resp = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Accept': 'application/vnd.github+json' },
  });
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error('GH GET ' + path + ' → ' + resp.status + ' ' + (await resp.text()).slice(0, 200));
  return await resp.json();
}

async function ghPut(path, contentB64, message, sha) {
  const url = '/api/gh/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + encodeURI(path);
  const body = { message: message, content: contentB64, branch: REPO_BRANCH };
  if (sha) body.sha = sha;
  const resp = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/vnd.github+json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error('GH PUT ' + path + ' → ' + resp.status + ' ' + (await resp.text()).slice(0, 300));
  return await resp.json();
}
