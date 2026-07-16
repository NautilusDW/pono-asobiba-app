/* ============================================================
   common/mvp-flags.js  (MVP Phase 1 用 中央フラグ)

   ★ v1590 で MVP gate を解除。 tier system は復活済 (sw1066)、 rewards
     システムも有効化。 acorns/achievements/stickers の全 reward 経路が
     活性化し、 どんぐり経済 (1 ゲーム = 1 日 N 個 / 無料 25・有料 35 の
     1 日トータル cap / どんぐり 50 = シール 1 枚) が初めて完全動作する。

   ★ v1592: どんぐりのみ carve-out。 PONO_MVP_NO_REWARDS を元の true に戻し、
     アクアリウム生き物解錠 (achievements) / 部屋アイテム (achievements/stickers
     マイルストーン) / ログインボーナスシール (stickers.checkDailyLogin) は
     再び block 状態に復元。 ただし新フラグ PONO_MVP_ENABLE_ACORNS = true で
     どんぐり (common/acorns.js) だけは gate をすり抜けて働かせる。
     → maze クリア等の addAcornsDaily は active、 ガチャ/ショップの
       PonoGameStickers.grant も別系統で引き続き active。

   PONO_MVP_NO_REWARDS = true のとき (現在の状態):
     - どんぐり (acorn) / ありがとう (thankyou) / 宝箱 / 祝賀モーダル を全部抑止
       ※ ただし PONO_MVP_ENABLE_ACORNS = true なら acorns だけは通る (v1592)
     - スタンプ・実績・ログインシール・どんぐり加算を全部 no-op
       ※ どんぐり加算は v1592 で carve-out (上記参照)
     - 進捗系 LS (pono_stats / pono_stamp_log / pono_acorns / pono_thankyou /
       pono_stickers / pono_login_days 等) には書き込まない
     - スタンプラリー / スタンプカード / ボトムナビの 📋 スタンプボタンを CSS で
       非表示 (app tier は除外、common/stamp-rally.js が動作する)。
       🏠 おうち ボタンは tier 問わず引き続き非表示

   ※ ゲームクリア時の confetti / モーダル / ポノの褒めは累積じゃないので維持。
   ※ 緊急封印したい時は PONO_MVP_NO_REWARDS = true に戻すだけで全機能が抑止。
       LS は空のままなので、全ユーザーが「最初の 1 個目」をフレッシュに体験できる。
   ============================================================ */
(function() {
  'use strict';

  // v1590: MVP gate 解除。 rewards 全経路 (acorns / achievements / stickers /
  //         daily-quest / どんぐりショップ) を活性化。
  // v1592: 元の true に戻す。 アクアリウム / 部屋アイテム / ログインボーナス
  //         シールは再 block。 carve-out フラグ PONO_MVP_ENABLE_ACORNS で
  //         どんぐりのみ通す (common/acorns.js 参照)。
  window.PONO_MVP_NO_REWARDS = true;
  window.PONO_MVP_ENABLE_ACORNS = true;

  // app tier は carve-out フラグなしで一律ブロック解除 (PONO_MVP_NO_REWARDS / 個別 carve-out の
  // 挙動そのものは変更しない、app tier 判定を先頭に足すだけ)。
  function rewardsBlocked(carveOutFlagName) {
    try {
      if (window.PonoTier && typeof window.PonoTier.isApp === 'function' && window.PonoTier.isApp()) return false;
    } catch (e) {}
    if (!window.PONO_MVP_NO_REWARDS) return false;
    if (carveOutFlagName && window[carveOutFlagName] === true) return false;
    return true;
  }
  window.PonoMvpFlags = window.PonoMvpFlags || {};
  window.PonoMvpFlags.rewardsBlocked = rewardsBlocked;

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
      /* ボトムナビの 🏠 おうち ボタン */
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
      '.milestone-banner,',
      '.daily-progress,',
      '.daily-progress-bar,',
      /* ゲーム HUD の N/Total 風進捗 (ゲーム動作に必須でないバナー) */
      '.flower-enc-progress,',
      '.hud-mastery,',
      '.hud-target,',
      '.progress-banner',
      '{ display: none !important; }',
      'body:not([data-tier="app"]) .login-streak,',
      'body:not([data-tier="app"]) .streak-banner,',
      /* 進捗系セクション / ボトムナビの 📋 スタンプ ボタン (app tier は common/stamp-rally.js を表示) */
      'body:not([data-tier="app"]) .stamp-rally-section,',
      'body:not([data-tier="app"]) .stamp-card-section,',
      'body:not([data-tier="app"]) #stampRallySection,',
      'body:not([data-tier="app"]) #stampCardSection,',
      'body:not([data-tier="app"]) .bottom-nav .bn-item[data-action="stamp"]',
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
