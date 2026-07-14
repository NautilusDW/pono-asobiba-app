/* ============================================================
   common/onboarding/steps-title-tour.js  (オンボーディング・ツアー: titleTour ステージ)

   ★★★ ここに実装する ★★★ (このファイルの担当者専有スコープ)

   このファイルは window.PonoOnboardingTour.registerStage('titleTour', ...)
   を 1 回呼び出すだけの内容ファイルです。 common/onboarding/tour-engine.js
   (エンジン本体) と common/onboarding/tour.css は別担当が作成済みなので
   触らないこと。 play.html / sw.js もこのファイルの担当では編集しない。

   対象要素が不在/hidden の場合はエンジンが 300ms×3 回リトライ後に黙って
   スキップする (このファイル側での存在チェックは不要)。

   ---- 実装する登録内容 (確定仕様 batch:onboarding-tour より抜粋) ----

   stageId: 'titleTour'
   seenKey: 'pono_tour_title_seen_v1'
   ステップ数: 3件 (順番のまま実装すること)

   1) 'title-cards'
      - target: '.cards-col'  ( #cardList ではなく親の .cards-col。
        scroll-hint 矢印込みで囲め、 内部スクロール位置の影響を受けない)
      - text: "ここから すきな ゲームを\nえらべるよ。\nうえや したに うごかしてみてね"
      - placement: 'left'  (右カラムのため吹き出しは左 = brand-col 側に配置)
      - nextLabel: 省略可 ('つぎへ' が既定)

   2) 'title-gacha'
      - target: '#dailyGachaEntry'
      - text: "１にち１かい、ポノガチャで\nシールが もらえるよ"
        (「１にち１かい」はスペースなしでボタン実文言 play.html:9801 と完全一致
         させること。 「まいにち ひいてみてね」のような来訪促し文言は禁止)
      - placement: 'right'  (左カラム下部のボタンなので吹き出しは右に)
      - nextLabel: 省略可 ('つぎへ' が既定)

   3) 'title-sticker-route'  (初回ツアーの最終ステップ)
      - target: '#profileHomeBtn'
      - text: "ここから プロフィールを ひらくと\n「シールちょう」が あるよ。\nシールを あつめて はってみてね"
      - placement: 'above'  (画面下部 profile-wallet HUD 内のため吹き出しは上に)
      - nextLabel: 'あそぼう！' を明示指定するか、 省略してエンジンの既定
        (「初回ツアー最終ステップはエンジンが 'あそぼう！' を既定にする」) に
        任せてよい。 迷ったら明示指定のほうが安全 (bookUnlock の 'わかった' と
        同様に明示するスタイルに揃えられる)。
      - このステップは #profileHubModal を実際には開かない (一方的に一回
        見せるだけの方針)。 onShow 等で openProfileHub() を呼ばないこと。

   ---- ウィザードとの橋渡し ----
   このステージは avatarIntro (#profileModal ウィザード) の close 検知後、
   600ms 待ってからエンジンが自動的に開始する。 このファイル側では何もしなくてよい。
   ただし『できたね』のような『ウィザードで作り終えた直後』を前提にした文言は
   使わないこと (「あとで つくる」でスキップした子にも同じ文言が出るため)。

   ---- 進捗表示 ----
   初回シーケンス全体 (avatarIntro 1 + titleTour 3) の 2/4, 3/4, 4/4 に相当する。
   分母/分子はエンジンが自動計算するため、 このファイル側では何もしなくてよい。

   ---- 登録テンプレート (componentApiContract 準拠、 読み込み順に依存しない) ----
   ============================================================ */
(function () {
  'use strict';

  var stageId = 'titleTour';

  var steps = [
    {
      id: 'title-cards',
      target: '.cards-col',
      text: 'ここから すきな ゲームを\nえらべるよ。\nうえや したに うごかしてみてね',
      placement: 'left'
    },
    {
      id: 'title-gacha',
      target: '#dailyGachaEntry',
      text: '１にち１かい、ポノガチャで\nシールが もらえるよ',
      placement: 'right'
    },
    {
      id: 'title-sticker-route',
      target: '#profileHomeBtn',
      text: 'ここから プロフィールを ひらくと\n「シールちょう」が あるよ。\nシールを あつめて はってみてね',
      placement: 'above',
      nextLabel: 'あそぼう！'
    }
  ];

  var options = {
    seenKey: 'pono_tour_title_seen_v1'
    // when / deferUntil は不要 (常に適格。 avatarIntro との橋渡しはエンジン側で
    // #profileModal の MutationObserver を使って制御される)。
  };

  if (window.PonoOnboardingTour) {
    window.PonoOnboardingTour.registerStage(stageId, steps, options);
  } else {
    (window.__ponoTourPendingStages = window.__ponoTourPendingStages || []).push([stageId, steps, options]);
  }
})();
