/* ============================================================
   common/onboarding/steps-avatar.js  (オンボーディング・ツアー: avatarIntro ステージ)

   ★★★ ここに実装する ★★★ (このファイルの担当者専有スコープ)

   このファイルは window.PonoOnboardingTour.registerStage('avatarIntro', ...)
   を 1 回呼び出すだけの内容ファイルです。 common/onboarding/tour-engine.js
   (エンジン本体) と common/onboarding/tour.css は別担当が作成済みなので
   触らないこと。 play.html / sw.js もこのファイルの担当では編集しない。

   ---- 実装する登録内容 (確定仕様 batch:onboarding-tour より抜粋) ----

   stageId: 'avatarIntro'
   seenKey: 'pono_tour_avatar_intro_seen_v1'
   ステップ数: 1件

   ステップ 'avatar-welcome':
     - target: null (空文字列/未指定 = スポットライトなしの中央ウェルカム吹き出し。
       ウィザードはまだ開いておらず照らす対象が存在しないため)
     - text (そのまま使用、'\n' は改行として描画される):
         "ポノの あそびばへ ようこそ！\nはじめに きみの キャラクターを\nつくってみよう"
     - placement: 'center'
     - nextLabel: 'つくる！' (このステップだけ 'つぎへ' を上書き)
     - when: function () { return !(window.PonoPlayerProfile
                && window.PonoPlayerProfile.hasProfile
                && window.PonoPlayerProfile.hasProfile()); }
       → 既にプロフィールを作成済みのユーザーはこのステージ自体をスキップ
         (エンジン側が自動で ineligible 判定 + seen マークする)。

   ---- 重要: #profileModal ウィザード自体には一切触れないこと ----
   このステップを閉じた瞬間 (「つくる！」クリック) に、 エンジンが
   window.__ponoTourGatesFirstProfile = false を設定してゲートを解除し、
   既存の 700ms ポーリング (play.html の maybeOpenFirstProfile()) 経由で
   #profileModal が自動的に開く。 ウィザード内 (3ステップ: avatar/name/details)
   には一切オーバーレイ・吹き出しを出さない方針 ("中に入ったら詳しく説明しない")
   なので、 このファイルではステップを追加しないこと。

   進捗表示: 初回シーケンス全体 (avatarIntro 1 + titleTour 3) の 1/4 に相当する。
   分母/分子はエンジンが自動計算するため、 このファイル側では何もしなくてよい。

   ---- 登録テンプレート (componentApiContract 準拠、 読み込み順に依存しない) ----
   ============================================================ */
(function () {
  'use strict';

  var stageId = 'avatarIntro';

  var steps = [
    {
      id: 'avatar-welcome',
      target: null,
      text: 'ポノの あそびばへ ようこそ！\nはじめに きみの キャラクターを\nつくってみよう',
      placement: 'center',
      nextLabel: 'つくる！',
      when: function () {
        try {
          return !(window.PonoPlayerProfile
            && typeof window.PonoPlayerProfile.hasProfile === 'function'
            && window.PonoPlayerProfile.hasProfile());
        } catch (e) { return false; }
      }
    }
  ];

  var options = {
    seenKey: 'pono_tour_avatar_intro_seen_v1'
    // when は不要 (ステージ全体の可否ではなく、 上の単一ステップの when で
    // 判定する設計。 componentApiContract 上はステージ options.when も使えるが、
    // このステージは 1 ステップしかないため step.when だけで十分)。
  };

  if (window.PonoOnboardingTour) {
    window.PonoOnboardingTour.registerStage(stageId, steps, options);
  } else {
    (window.__ponoTourPendingStages = window.__ponoTourPendingStages || []).push([stageId, steps, options]);
  }
})();
