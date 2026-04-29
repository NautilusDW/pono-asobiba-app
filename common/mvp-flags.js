/* ============================================================
   common/mvp-flags.js  (MVP Phase 1 用 中央フラグ)

   目的:
     2026-04-27 ユーザー指示。MVP は無料ゲームのみで先行リリース。
     報酬制度を封印し、進捗系も完全に no-op にしてフレッシュスタートを
     担保する (2026-04-28 追加方針)。

   PONO_MVP_NO_REWARDS = true のとき:
     - どんぐり (acorn) / ありがとう (thankyou) / 宝箱 / 祝賀モーダル を全部抑止
     - スタンプ・実績・ログインシール・どんぐり加算を全部 no-op
     - 進捗系 LS (pono_stats / pono_stamp_log / pono_acorns / pono_thankyou /
       pono_stickers / pono_login_days 等) には書き込まない
     - スタンプラリー / スタンプカード / ボトムナビの 📋 スタンプ・🏠 おうち
       ボタンを CSS で非表示

   ※ ゲームクリア時の confetti / モーダル / ポノの褒めは累積じゃないので維持。
   ※ 再公開する時は PONO_MVP_NO_REWARDS = false に戻すだけで全機能が復活。
       LS は空のままなので、全ユーザーが「最初の 1 個目」をフレッシュに体験できる。
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
      '.acorn-shop-hint,',
      /* 進捗系セクションの非表示 */
      '.stamp-rally-section,',
      '.stamp-card-section,',
      '#stampRallySection,',
      '#stampCardSection,',
      /* ボトムナビの 📋 スタンプ / 🏠 おうち ボタン */
      '.bottom-nav .bn-item[data-action="stamp"],',
      '.bottom-nav .bn-item[data-action="room"],',
      /* 達成・到達目標・進捗系の煽り UI ('あと N で〇〇マスター' など) */
      '#ach-next-hint,',
      '.ach-next-hint,',
      '.ach-popup,',
      '.ach-progress,',
      '.achievement-hint,',
      '.achievement-progress,',
      '.mastery-target,',
      '.target-progress,',
      '.next-reward,',
      '.login-streak,',
      '.streak-banner,',
      '.milestone-banner,',
      '.daily-progress,',
      '.daily-progress-bar,',
      /* ゲーム HUD の N/Total 風進捗 (ゲーム動作に必須でないバナー) */
      '.flower-enc-progress,',
      '.hud-mastery,',
      '.hud-target,',
      '.progress-banner',
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
