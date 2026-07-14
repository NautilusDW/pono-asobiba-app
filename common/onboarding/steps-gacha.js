/* ============================================================
   common/onboarding/steps-gacha.js  (オンボーディング・ツアー: gachaIntro ステージ)

   このファイルは window.PonoOnboardingTour.registerStage('gachaIntro', ...)
   を 1 回呼び出すだけの内容ファイルです。 common/onboarding/tour-engine.js
   (エンジン本体) と common/onboarding/tour.css は別担当が作成済みなので
   触らないこと。

   ---- 'gachaIntro' が STAGE_ORDER に載っていない理由 ----
   tour-engine.js の起動時オートラン (splash-dismissed 契機の自動シーケンス)
   には意図的に乗らない。 ガチャ詳細モーダルを実際に開いて 1 回スピンした
   直後にだけ、 play.html 側から window.PonoOnboardingTour.requestStage
   ('gachaIntro') で手動起動する requestStage 専用ステージ。

   ---- 登録内容 (確定仕様 batch:onboarding-tour-gacha より) ----
   stageId: 'gachaIntro'
   seenKey: 'pono_tour_gacha_intro_seen_v1'
   ステップ数: 1件

   ステップ 'gacha-sticker-collect':
     - target: '#dailyGachaReward' (獲得シール本体。 スピン後の is-opened
       演出が出そろった時点で hidden 属性なし・完全表示済み)
     - placement: 'below' (画面に収まらない場合は engine の flip 機構が
       'above' に自動反転する)
     - nextLabel: 'わかった' (単独ステージなので明示指定)

   起動タイミング・呼び出し側の契約 (play.html 側の責務、 このファイルは
   関与しない): runDailyGacha() の演出シーケンス末尾
   (revealProfile.actionsDelay の既存タイマー) の直後に、 恒久ノート
   「また あした やろうね」の CSS transition が完了するまでの安全マージンを
   置いてから requestStage('gachaIntro') を呼ぶ。 呼び出し前に
   markStageSeen('gachaIntro') を先に済ませておくことで、 「とばす」/Esc で
   閉じた場合も含め 1 回だけ受動的に見せる契約を全経路で保証する
   (endManualRun() は seen を一切マークしないため)。
   ============================================================ */
(function () {
  'use strict';

  var stageId = 'gachaIntro';

  var steps = [
    {
      id: 'gacha-sticker-collect',
      target: '#dailyGachaReward',
      text: 'シールが もらえたよ！\nシールちょうに\nどんどん たまっていくよ',
      placement: 'below',
      nextLabel: 'わかった'
    }
  ];

  var options = {
    seenKey: 'pono_tour_gacha_intro_seen_v1'
  };

  if (window.PonoOnboardingTour) {
    window.PonoOnboardingTour.registerStage(stageId, steps, options);
  } else {
    (window.__ponoTourPendingStages = window.__ponoTourPendingStages || []).push([stageId, steps, options]);
  }
})();
