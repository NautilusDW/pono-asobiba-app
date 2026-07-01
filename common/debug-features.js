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
      label: 'めいろ：全ステージ + どんぐり制限なし',
      description: 'ON にすると、 めいろの全ステージが解錠されて、 タイトル画面に 「ステージセレクト」 ボタンが出る。 どんぐり取得制限もなくなる',
      default: false
    },
    {
      id: 'play-dev-mode',
      label: 'ホーム画面：管理者向けの隠しボタンを表示',
      description: 'URL に ?dev=1 を付けて開くと、 デイリーガチャ等の管理者向け要素が見えるようになる',
      default: false
    },
    {
      id: 'gacha-rarity-override',
      label: 'デイリーガチャ：レア度を指定',
      description: 'URL に ?gachaRarity=normal / rare / super を付けると、 そのレア度確定でガチャが回せる',
      default: false
    },
    {
      id: 'daily-gacha-unlimited',
      label: 'ポノガチャ：なんかいでも ひける',
      description: 'ON にすると、 デバッグちゅうだけ 1にちの かいすうせいげんを むししてポノガチャをまわせる',
      default: false
    },
    {
      id: 'shop-force-guide',
      label: 'おみせ：あんないを まいかいみる',
      description: 'ON にすると、 デバッグちゅうだけシールのおみせの あんないを まいかい かくにんできる',
      default: false
    },
    {
      id: 'quizland-debug-all',
      label: 'クイズ：全 169 問まとめてプレイ',
      description: 'URL に ?debug=all を付けると、 通常 5 問のところ全問を順番にプレイできる',
      default: false
    },
    {
      id: 'bento-tutreset',
      label: 'おべんとう：チュートリアルやり直し',
      description: 'URL に ?tutreset=1 を付けて開くと、 初回チュートリアルが再表示される',
      default: false
    },
    {
      id: 'bento-maskedit',
      label: 'おべんとう：お弁当箱の型枠を編集',
      description: 'URL に ?maskedit=1 を付けて開くと、 お弁当箱のどこに何を置けるかを編集する管理画面が出る',
      default: false
    },
    {
      id: 'bento-npc-force',
      label: 'おべんとう：注文キャラを指定',
      description: 'URL に ?npc=risu / inu / ahiru / shika / lesser_panda / neko を付けると、 そのキャラの注文だけ出せる',
      default: false
    },
    {
      id: 'bento-debug-log',
      label: 'おべんとう：裏側の動きを表示',
      description: 'ブラウザの開発者ツールを開いておくと、 おべんとう内部の細かい動き ([bento-debug] というメモ) が見えるようになる',
      default: false
    },
    {
      id: 'first-clear-reset',
      label: 'はじめてクリア報酬：記録をリセット',
      description: 'ブラウザコンソールから window.resetFirstClearRewards() で初回クリア報酬の付与記録を消せる',
      default: false
    }
  ];
})(typeof window !== 'undefined' ? window : this);
