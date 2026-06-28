/* common/debug-features.js
 * Catalog of opt-in debug features exposed via PonoDebugMode (manage unlock).
 * Pure data file. Pairs with common/debug-mode.js (isFeatureEnabled / setFeatureEnabled).
 * Each entry: { id, label, description, default }
 *   - id: stable string used as localStorage suffix (pono_debug_feature_<id>)
 *   - label: short Japanese label shown in the debug board UI
 *   - description: optional longer hint for caregivers / devs
 *   - default: initial value if no localStorage entry exists (all false = opt-in)
 */
(function (global) {
  'use strict';
  if (!global) return;

  global.PonoDebugFeatures = [
    {
      id: 'maze-dev-bypass',
      label: 'めいろ ?dev=1 (tier+どんぐり cap 撤廃)',
      description: 'めいろの dev=1 URL bypass を許可。 tier ロック解除 + どんぐり消費 cap を一時的に外す (session 限定)。',
      default: false
    },
    {
      id: 'play-dev-mode',
      label: 'play.html ?dev=1 (dev-mode UI + dailyGacha 表示)',
      description: 'play.html の dev=1 を許可。 dev-mode クラスが付き、 dailyGacha デバッグ UI など開発者向け要素が出現。',
      default: false
    },
    {
      id: 'gacha-rarity-override',
      label: '?gachaRarity=X (sticker rarity 強制)',
      description: 'デイリーガチャの rarity を URL パラメータで強制 (例: ?gachaRarity=rare)。 通常の確率テーブルを bypass。',
      default: false
    },
    {
      id: 'quizland-debug-all',
      label: 'quizland ?debug=all (169問全プレイ)',
      description: 'quizland の debug=all を許可。 出題プールを全 169 問に拡大し、 出題順チェックや QA 用に使う。',
      default: false
    },
    {
      id: 'bento-tutreset',
      label: 'bento ?tutreset=1 (チュートリアル reset)',
      description: 'bento の初回チュートリアル進捗 (localStorage) をページ遷移時にクリア。 sk-intro と 10 step チュートリアルを再生。',
      default: false
    },
    {
      id: 'bento-maskedit',
      label: 'bento ?maskedit=1 (mask editor)',
      description: 'bento の mask editor (NPC 配置・透過マスク微調整 UI) を有効化。 admin 向けの bento タブ補助ツール。',
      default: false
    },
    {
      id: 'bento-npc-force',
      label: 'bento ?npc=X (NPC 強制選択)',
      description: 'bento の NPC を URL パラメータで強制 (例: ?npc=3)。 ランダム選定を bypass して特定キャラ動線を検証。',
      default: false
    },
    {
      id: 'bento-debug-log',
      label: 'bento [bento-debug] console.log 出力',
      description: 'bento ゲーム内の [bento-debug] prefix な console.log を解禁。 通常配信では noop。',
      default: false
    },
    {
      id: 'first-clear-reset',
      label: 'window.resetFirstClearRewards 公開',
      description: '初回クリア祝福 (first-clear rewards) のフラグを window.resetFirstClearRewards() で全消去できるようにする。 演出の再検証用。',
      default: false
    }
  ];
})(typeof window !== 'undefined' ? window : this);
