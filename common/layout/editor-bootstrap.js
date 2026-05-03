/* ============================================================
 * common/layout/editor-bootstrap.js
 * ------------------------------------------------------------
 * 新規エディタ HTML 用 thin loader。
 *
 * 1 行 (`<script src=".../editor-bootstrap.js" defer></script>`) を貼って、
 * 直前に `window.EditorBootstrapConfig` を宣言するだけで、
 *
 *    layout-applier.js  →  layout-system.js  →  page-nav.js
 *
 * を **順序保証** で動的読み込みし、最後に `LayoutSystem.init(config)` を呼ぶ。
 *
 * 解消する罠 (本セッションで踏んだ事故):
 *   - Wave 5: HTML 側で layout-applier.js の defer プリロードを忘れて
 *             toolbar が出ない (LayoutApplier 未定義のまま init が走る)。
 *             → bootstrap が layout-applier.js を必ず先に注入する。
 *   - Wave 7: 個別エディタの CSS で `body.layout-editor-on .resizable
 *             { position: relative }` を書いて絶対配置レイヤーが消失。
 *             → CSS ルールは bootstrap では扱えないが、editor-skeleton.html
 *             の方で「絶対配置を維持する上書きルール」を雛形として提示し、
 *             同じ事故を引き起こさないようにする。
 *
 * HTML 側の使い方:
 *   <script>
 *     window.EditorBootstrapConfig = {
 *       layoutUrl: 'saved-layout.json',
 *       canvas: '#stage',
 *       editableSelectors: [
 *         ['.outer-bg', 'wh', '外側背景'],
 *         ['.layer-a',  'wh', 'レイヤー A'],
 *       ],
 *       ghPath: 'zukan/preview/investigation/saved-layout.json',
 *     };
 *   </script>
 *   <script src="../../../common/layout/editor-bootstrap.js" defer></script>
 *
 * `pages` は省略時 `window.PONO_PAGES` (page-nav.js が公開) を自動使用する。
 * defer なので DOMContentLoaded のタイミングで実行される。
 *
 * `window.EditorBootstrapConfig` 未定義時は警告ログだけ出して何もしない。
 * ============================================================ */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.__editorBootstrapStarted) return;
  window.__editorBootstrapStarted = true;

  var TAG = '[editor-bootstrap]';

  // -----------------------------------------------------------------
  //  自身のスクリプト URL を解決して、兄弟ファイルへの絶対 URL を作る
  //  HTML がどの階層に置かれていても動くように、相対パスではなく
  //  bootstrap.js 自身の src からの resolve を行う。
  // -----------------------------------------------------------------
  var SELF_SCRIPT = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && /editor-bootstrap\.js(\?.*)?$/.test(scripts[i].src)) {
        return scripts[i];
      }
    }
    return null;
  })();

  function siblingUrl(name) {
    if (!SELF_SCRIPT || !SELF_SCRIPT.src) return name;
    // editor-bootstrap.js  → 兄弟は layout-applier.js / layout-system.js
    return SELF_SCRIPT.src.replace(/editor-bootstrap\.js(\?.*)?$/, name);
  }

  // page-nav.js は editor-bootstrap.js から見て一階層上 (common/) にある。
  function commonUrl(name) {
    if (!SELF_SCRIPT || !SELF_SCRIPT.src) return name;
    // .../common/layout/editor-bootstrap.js  →  .../common/<name>
    return SELF_SCRIPT.src.replace(/layout\/editor-bootstrap\.js(\?.*)?$/, name);
  }

  // -----------------------------------------------------------------
  //  動的 script 注入を Promise 化 (順序保証のため async=false)
  // -----------------------------------------------------------------
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      // 二重ロード回避: 既に同じ src の <script> が居れば即 resolve
      var existing = document.querySelectorAll('script[src]');
      for (var i = 0; i < existing.length; i++) {
        if (existing[i].src === src) { resolve(); return; }
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = false; // 評価順を維持
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  // -----------------------------------------------------------------
  //  起動シーケンス
  //   1. layout-applier.js   (常時必要 / Wave 5 で抜けて死んだ部分)
  //   2. layout-system.js    (init / lazy editor load / observer)
  //   3. page-nav.js         (PONO_PAGES の単一ソース化済み)
  //   4. LayoutSystem.init(config) を呼ぶ
  // -----------------------------------------------------------------
  function bootstrap() {
    var config = window.EditorBootstrapConfig;
    if (!config || typeof config !== 'object') {
      console.warn(TAG, 'window.EditorBootstrapConfig が未定義のため起動を中止しました。' +
        ' HTML 側で `window.EditorBootstrapConfig = { layoutUrl, canvas, editableSelectors, ghPath }` を' +
        ' この bootstrap より前に宣言してください。');
      return;
    }

    var applierUrl = siblingUrl('layout-applier.js');
    var systemUrl  = siblingUrl('layout-system.js');
    var navUrl     = commonUrl('page-nav.js');

    // 直列ロード: applier → system → page-nav
    loadScript(applierUrl)
      .then(function () { return loadScript(systemUrl); })
      .then(function () { return loadScript(navUrl); })
      .then(function () {
        if (!window.LayoutSystem || typeof window.LayoutSystem.init !== 'function') {
          console.error(TAG, 'LayoutSystem.init が見つかりません (layout-system.js のロード失敗?)');
          return;
        }
        try {
          // pages 省略時は LayoutSystem 側が window.PONO_PAGES を自動採用する。
          window.LayoutSystem.init(config);
        } catch (e) {
          console.error(TAG, 'LayoutSystem.init 呼び出し中に例外', e);
        }
      })
      .catch(function (err) {
        console.error(TAG, 'スクリプトロード失敗:', err && err.message ? err.message : err);
      });
  }

  // defer 属性で読まれたとき、document はパース済みだが念のため readyState を判定。
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
