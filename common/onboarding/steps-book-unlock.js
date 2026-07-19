/* ============================================================
   common/onboarding/steps-book-unlock.js  (オンボーディング・ツアー: bookUnlock ステージ)

   ★★★ ここに実装する ★★★ (このファイルの担当者専有スコープ)

   このファイルは window.PonoOnboardingTour.registerStage('bookUnlock', ...)
   を 1 回呼び出すだけの内容ファイルです。 common/onboarding/tour-engine.js
   (エンジン本体) と common/onboarding/tour.css は別担当が作成済みなので
   触らないこと。 play.html / sw.js もこのファイルの担当では編集しない。

   ---- このステージが「後ろ倒し」されている理由 ----
   初回起動の1発目に物理書籍タイアップの案内を出すのは pushy に見えるため、
   初回シーケンス (avatarIntro→titleTour) からは外され、 titleTour 完了済の
   セッション (= 実質2回目以降の起動) でのみ表示される設計になっている。

   ---- 実装する登録内容 (確定仕様 batch:onboarding-tour より抜粋) ----

   stageId: 'bookUnlock'
   seenKey: 'pono_tour_book_unlock_seen_v1'
   ステップ数: 1件

   ステップ 'book-unlock-entry':
     - target: '#bookUnlockEntry'
     - text: "えほんを もっているひとへ\n「あいことば」か 「クイズ」で\nとくてんが ひらけます。"
       (1行目 "えほんを もっているひとへ" は既存モーダル見出し play.html:10446 と
        スペース・句点まで完全一致させること。 保護者向けのため文末のみ敬体)
     - placement: 'right' (左カラム内ボタンのため吹き出しを右側 = cards-col 側に)
     - nextLabel: 'わかった' (単独ステージなので明示指定する。 'つぎへ' のままにしない)

   ---- deferUntil (このステージだけが使う、 componentApiContract 参照) ----
   options.deferUntil: function (snapshot) { return snapshot.isSeen('titleTour'); }
     → start() 時点の titleTour seen スナップショットが false (= 初回セッション)
       の間は、 このステージを黙って持ち越す (reason:'deferred', seen はマーク
       しない)。 2回目以降の起動で titleTour が seen 済なら適格になる。
     この判定はエンジンが自動で行うので、 このファイルではオプションとして
     渡すだけでよい。

   ---- #bookUnlockEntry が hidden (=unlocked 済) の場合の扱い ----
   componentApiContract により、 target が不在/hidden の場合はエンジンが
   300ms×3 回リトライ後に「黙ってスキップ」しつつ、 このステージの最終
   (=唯一の) ステップなので同時に markStageSeen('bookUnlock') も行われる
   (tour-engine.js の「最後のステップを閉じた/スキップした時に stage を
   seen にする」共通ルールによる)。 つまり #bookUnlockEntry.hidden||
   offsetParent==null の判定・seen マークともにこのファイル側で個別実装
   する必要はない (エンジンの汎用機構だけで完結する)。

   ---- 進捗表示 ----
   単発表示なので 1/1。 分母/分子はエンジンが自動計算する。

   ---- 表示タイミング ----
   splash-dismissed +600ms 相当のタイミングでエンジンが自動的に開始する
   (avatarIntro/titleTour と同じ start() シーケンスの一部として評価される)。
   このファイル側では何もしなくてよい。

   ---- 登録テンプレート (componentApiContract 準拠、 読み込み順に依存しない) ----
   ============================================================ */
(function () {
  'use strict';

  var stageId = 'bookUnlock';

  var steps = [
    {
      id: 'book-unlock-entry',
      target: '#bookUnlockEntry',
      text: 'えほんを もっているひとへ\n「あいことば」か 「クイズ」で\nとくてんが ひらけます。',
      placement: 'right',
      nextLabel: 'わかった'
    }
  ];

  var options = {
    seenKey: 'pono_tour_book_unlock_seen_v1',
    deferUntil: function (snapshot) {
      try { return !!(snapshot && snapshot.isSeen('titleTour')); }
      catch (e) { return false; }
    }
  };

  if (window.PonoOnboardingTour) {
    window.PonoOnboardingTour.registerStage(stageId, steps, options);
  } else {
    (window.__ponoTourPendingStages = window.__ponoTourPendingStages || []).push([stageId, steps, options]);
  }
})();
