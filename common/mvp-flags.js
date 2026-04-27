/* ============================================================
   common/mvp-flags.js  (MVP Phase 1 用 中央フラグ)

   目的:
     2026-04-27 ユーザー指示。MVP は無料ゲームのみで先行リリース。
     報酬制度を一旦封印し、スタンプ収集だけが見える状態にする。

   PONO_MVP_NO_REWARDS = true のとき:
     - どんぐり (acorn) と ありがとう (thankyou) のバッジ・カウンタを全 UI から隠す
     - 各無料ゲームの「クリア時 どんぐり表示」を非表示
     - 宝箱 (treasure.js) の演出をスキップ
     - ホーム画面の「はじめての クリア！」祝賀ポップアップをスキップ
     - どんぐりショップへの導線を遮断 (バッジ非表示で達成)

     ※スタンプ自体は引き続き収集 (achievements.js は無変更)。
     ※どんぐり/ありがとうの内部加算は触らない (再公開時に値が引き継げる)。

   再公開する時はこのファイルの true を false に切り替えるだけで戻る。
   ============================================================ */
(function() {
  'use strict';

  window.PONO_MVP_NO_REWARDS = true;

  if (!window.PONO_MVP_NO_REWARDS) return;

  // バッジ・どんぐり関連 UI を CSS で一括非表示。
  // 個別ファイルで定義された表示要素は !important で上書きする。
  function injectHideCss() {
    var css = [
      '.acorn-badge,',
      '.acorn-badge-play,',
      '.thankyou-badge,',
      '.thankyou-badge-play,',
      '#acornBadge,',
      '#acornBadgePlay,',
      '#thankyouBadge,',
      '#thankyouBadgePlay,',
      '.complete-acorns,',
      '.daily-acorn-status,',
      '#modalDailyAcorn,',
      '.acorn-popup,',
      '.acorn-chip,',
      '.acorn-shop-hint',
      '{ display: none !important; }'
    ].join('\n');
    var s = document.createElement('style');
    s.setAttribute('data-mvp-flags', '1');
    s.textContent = css;
    if (document.head) {
      document.head.appendChild(s);
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        document.head.appendChild(s);
      });
    }
  }
  injectHideCss();
})();
