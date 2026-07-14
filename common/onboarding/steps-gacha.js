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

   ---- 登録内容 (確定仕様 batch:gacha-tour-note より) ----
   stageId: 'gachaIntro'
   seenKey: 'pono_tour_gacha_intro_seen_v1'
   ステップ数: 2件 (2ステップ分割)

   分割理由: 「シールが もらえたよ」 (シール本体、 画面中央) と、
   既に表示されている「シールちょうに はって あそぼう」ノート
   (#dailyGachaRewardNote、 top:94px/right:22px の右上) は物理的に離れており、
   tour-engine の単一矩形スポットライトでは1ステップで両方を照らせない。
   ステップ2の target はボタン (#dailyGachaCloseupBook) ではなくノート本体
   (#dailyGachaRewardNote) — ノートの吹き出し形状が既にボタンを上向きに指して
   おり、 ノートを照らせば視線は自然にボタンへ流れる。

   ステップ 'gacha-sticker-collect':
     - target: '#dailyGachaReward' (獲得シール本体。 スピン後の is-opened
       演出が出そろった時点で hidden 属性なし・完全表示済み)
     - placement: 'below' (画面に収まらない場合は engine の flip 機構が
       'above' に自動反転する)
     - nextLabel: 'つぎへ' (最終ステップではなくなったため明示指定)

   ステップ 'gacha-sticker-book-note':
     - target: '#dailyGachaRewardNote' (「シールちょうに はって あそぼう」
       既存ノート。 起動タイミング時点で play.html 側の CSS transition が
       完了済みで可視 — 呼び出し側の安全マージン設計により保証済み)
     - placement: 'below' (ノートは画面上端付近 top:94px にあるため 'above'
       への flip リスクはほぼゼロで、 'below' が確実に成立する)
     - nextLabel: 'わかった' (最終ステップ)
     - text は「ここを みてね！」の1行のみ。 ノート既存文言 (「シールちょうに」
       「はって」「あそぼう」等) と語彙が重複しないよう、 説明はスポットライト
       されたノート自身に委ね、 ツアー側の吹き出しは最小限に留める。

   起動タイミング・呼び出し側の契約 (play.html 側の責務、 このファイルは
   関与しない): runDailyGacha() の演出シーケンス末尾
   (revealProfile.actionsDelay の既存タイマー) の直後に、 恒久ノート
   「また あした やろうね」の CSS transition が完了するまでの安全マージンを
   置いてから requestStage('gachaIntro') を呼ぶ。 呼び出し前に
   markStageSeen('gachaIntro') を先に済ませておくことで、 「とばす」/Esc で
   閉じた場合も含め 1 回だけ受動的に見せる契約を全経路で保証する
   (endManualRun() は seen を一切マークしないため)。 この起動フックは今回の
   2ステップ化にあたり変更していない。
   ============================================================ */
(function () {
  'use strict';

  var stageId = 'gachaIntro';

  var steps = [
    {
      id: 'gacha-sticker-collect',
      target: '#dailyGachaReward',
      text: 'シールが もらえたよ！',
      placement: 'below',
      nextLabel: 'つぎへ'
    },
    {
      id: 'gacha-sticker-book-note',
      target: '#dailyGachaRewardNote',
      text: 'ここを みてね！',
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
