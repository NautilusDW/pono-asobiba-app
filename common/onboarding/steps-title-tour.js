/* ============================================================
   common/onboarding/steps-title-tour.js  (オンボーディング・ツアー: titleTour ステージ)

   ★★★ ここに実装する ★★★ (このファイルの担当者専有スコープ)

   このファイルは window.PonoOnboardingTour.registerStage('titleTour', ...)
   を 1 回呼び出すだけの内容ファイルです。 common/onboarding/tour-engine.js
   (エンジン本体) と common/onboarding/tour.css は別担当が作成済みなので
   触らないこと。 play.html / sw.js もこのファイルの担当では編集しない。

   対象要素が不在/hidden の場合はエンジンが 300ms×3 回リトライ後に黙って
   スキップする (このファイル側での存在チェックは不要)。

   ---- 実装する登録内容 (確定仕様 batch:onboarding-tour-fix より抜粋) ----

   stageId: 'titleTour'
   seenKey: 'pono_tour_title_seen_v1'
   ステップ数: 2件 (順番のまま実装すること)

   1) 'title-cards'
      - target: '#cardList'  ( '.cards-col' ではなく子要素の #cardList を使う。
        .cards-col は右カラムの全高 (プロフィール/設定エリアの手前まで) を
        占める flex コンテナで、 スポットライトの穴がゲームカード以外の
        下部 UI まで明るくなってしまう不具合があった。 #cardList は JS に
        より可視カード4枚ぶんの高さに正確にサイズされる実スクロール
        コンテナ (overflow-y:auto + touch-action:pan-y) なので、 これを
        target にすると穴が見えているカードの矩形だけに正確に絞られる)
      - text: "ここから すきな ゲームを\nえらべるよ。\nうえや したに うごかしてみてね"
      - placement: 'left'  (右カラムのため吹き出しは左 = brand-col 側に配置)
      - nextLabel: 省略可 ('つぎへ' が既定)

   2) 'title-gacha'  (このツアーの最終ステップ)
      - target: '#dailyGachaEntry'
      - text: "１にち１かい、ポノガチャで\nシールが もらえるよ"
        (「１にち１かい」はスペースなしでボタン実文言 play.html:9853 と完全一致
         させること。 「まいにち ひいてみてね」のような来訪促し文言は禁止。
         文言はガチャ紹介のみで締め文言は足さない — 締めくくり感は
         nextLabel の「あそぼう！」ボタン側が担う)
      - placement: 'right'  (左カラム下部のボタンなので吹き出しは右に)
      - nextLabel: 'あそぼう！' を明示指定 (bookUnlock の 'わかった' と同様に
        明示するスタイルに揃える。 エンジンは初回プランの最終ステップに
        'あそぼう！' を自動適用するが、 手動再実行時のフォールバック
        ('つぎへ') で締めが消えるのを避けるため明示する)

   ---- スコープ外 (今回は実装しない、 方針確認のみ) ----
   シール帳・どんぐり (通貨)・ショップ・ミュージアムの説明は今回のタイトル
   画面ツアーには含めない。 旧 'title-sticker-route' ステップ
   (#profileHomeBtn 経由でシールちょうへの導線を説明する内容) は削除した。
   これらは将来、 それぞれの機能に初めて進入したタイミングの個別チュート
   リアル (例: ガチャ初回起動時にガチャ詳細+シール入手を説明 → シール帳
   初回オープン時に貼り方を説明 → ショップ/ミュージアム初回進入時に各説明)
   で順を追って扱う想定。 tour-engine の registerStage + seenKey 方式は
   ステージ単位の初回判定をそのまま流用できる。

   ---- ウィザードとの橋渡し ----
   このステージは avatarIntro (#profileModal ウィザード) の close 検知後、
   600ms 待ってからエンジンが自動的に開始する。 このファイル側では何もしなくてよい。
   ただし『できたね』のような『ウィザードで作り終えた直後』を前提にした文言は
   使わないこと (「あとで つくる」でスキップした子にも同じ文言が出るため)。

   ---- 進捗表示 ----
   初回シーケンス全体 (avatarIntro 1 + titleTour 2) の 2/3, 3/3 に相当する。
   分母/分子はエンジンが registerStage された適格ステップ数から動的に自動
   計算する (tour-engine.js の planTotal()、 ハードコードなし) ため、 この
   ファイル側では何もしなくてよい。

   ---- 登録テンプレート (componentApiContract 準拠、 読み込み順に依存しない) ----
   ============================================================ */
(function () {
  'use strict';

  var stageId = 'titleTour';

  var steps = [
    {
      id: 'title-cards',
      target: '#cardList',
      text: 'ここから すきな ゲームを\nえらべるよ。\nうえや したに うごかしてみてね',
      placement: 'left'
    },
    {
      id: 'title-gacha',
      target: '#dailyGachaEntry',
      text: '１にち１かい、ポノガチャで\nシールが もらえるよ',
      placement: 'right',
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
