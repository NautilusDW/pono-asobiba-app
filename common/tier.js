/* ============================================================
   common/tier.js  (tier policy centralization)

   ユーザー層判定の中央化。
   2026-07-08: maze / puzzle / oto / bento は free と book の差を復帰。
   quizland は v3 (2026-07-06, feature_tier_v3 参照) の
   free = book (機能差ゼロ) を維持する。 各ゲームの isXxxUnlocked() は
   「sub なら true、 それ以外は tier ごとの集合 (indexOf) に含まれるか」 の
   パターンで扱う。 book 向けの付録 (特別シール/特別表紙/welcome演出/
   月1おかえり) は本ファイルのゲームロック関数側では扱わない。
   aquarium (isAquariumCreatureUnlocked) / room (isRoomItemUnlocked) /
   bento の box・NPC (isBentoBoxUnlocked/isBentoNpcUnlocked) / oto の
   chord mode (isOtoChordModeUnlocked) も book > free の "伸びしろ" として扱う。

   公開API (window.PonoTier):
     - getTier()                           → 'free' | 'book' | 'sub'
     - isFree() / isBook() / isSub()       簡易判定
     - isAquariumCreatureUnlocked(id)      海の生き物が解放されているか
     - isRoomItemUnlocked(id, cat)         家具/かざりが解放されているか
     - isKatakanaUnlocked()                カタカナ編が解放されているか
     - isMonsterMathStageUnlocked(mode, stageNum)  モンスターさんすうの各モード×ステージが解放されているか
     - verifyBookPassword(val)             絵本印字パスワードを検証
     - showSubscribePromo(opts)            サブスク誘導モーダル（伸びしろ表現）
     - showBookLimitPromoOnce(gameId, opts) free で最後まで遊んだ後の一度だけ案内
     - BOOK_AQUARIUM_CREATURE_IDS          絵本層に見せる生き物 8種
     - BOOK_ROOM_ITEM_IDS                  絵本層に見せる家具・かざり 10種

   tier 判定の優先順位:
     pono_sub_active === '1' → 'sub'
     pono_premium    === '1' → 'book'   (本に印字パスワード → Web入力で解除)
     それ以外                → 'free'

   方針メモ (memory/project_growth_strategy.md 参照):
     絵本購入者の体験は "見せびらかしたくなる品質" である必要があるため、
     露骨なロック表現は避けて「毎月ふえていくよ」という "伸びしろ" の
     見せ方にする。showSubscribePromo のコピーもその原則に合わせる。
   ============================================================ */
(function() {
  'use strict';

  // ---- PonoDebugMode gating helper ----
  // common/debug-mode.js が定義する window.PonoDebugMode.isAllowed() を一元参照。
  // staging-only (localhost/127.0.0.1/*staging*) + sessionStorage('pono_debug_mode_session'==='1') を
  // 同時に満たした時のみ true を返す。 本番ホスト or unlock 前は常に false。
  //
  // 本ヘルパーは「クライアント側だけで完結する unlock 抜け穴」 (localStorage 'pono_premium' /
  // sessionStorage 'pono_capture_tier_override' / window.__APP_BUILD__ / 印字パスワード /
  // 管理用マスター) のゲートに使う。 正規の paid book/sub は将来 Stripe/IAP の
  // サーバ検証経由になるため、 ここでは無関係。
  function isTierUnlockAllowedClientSide() {
    try {
      var dm = window.PonoDebugMode;
      if (!dm || typeof dm.isAllowed !== 'function') return false;
      return !!dm.isAllowed();
    } catch (e) {
      return false;
    }
  }

  // Phase 2 (3-tier locks active) として運用中。 free / book / sub の解錠範囲は
  // 本ファイル下部の各 isXxxUnlocked 関数 (isQuizlandQuestionUnlocked / isMazeStageUnlocked /
  // isOtoSoundSetUnlocked / isPuzzleStageUnlocked / isBentoFoodUnlocked 等) を参照。
  //
  // DevTools / 後から読み込まれる任意のスクリプト / 旧 sw キャッシュ等による誤上書きを避けるため
  // Object.defineProperty で writable:false にする。 configurable:true なので、 将来運用方針が
  // 変わった場合 (緊急の全面無料化キャンペーン等) は再定義で切替可能。
  if (typeof window.PONO_TIER_GAME_LOCKS_ENABLED === 'undefined') {
    try {
      Object.defineProperty(window, 'PONO_TIER_GAME_LOCKS_ENABLED', {
        value: true,  // 3-tier (free / book / sub) ロック有効。 ユーザー確定方針 (2026-06-28)
        writable: false,
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      // 古いブラウザ等で defineProperty が失敗したらフォールバック (3-tier ロック有効を維持)
      window.PONO_TIER_GAME_LOCKS_ENABLED = true;
    }
  }
  function gameLocksEnabled() { return !!window.PONO_TIER_GAME_LOCKS_ENABLED; }

  // ---- APP_BUILD 判定 ----
  // アプリ版 (APP_BUILD=1) は URL 自体がアプリ版用ビルドであることを示すため、
  // localStorage 経由ではなく window.__APP_BUILD__ を見て tier を決定する。
  //
  // __APP_BUILD__ は wrangler.toml の [env.staging-app.vars] で staging-app 限定で
  // 立つフラグであり、 production には立たない。 つまりこのフラグ自体が server-side
  // で staging-app 環境を識別する正当ルートになっているため、 PonoDebugMode 経由の
  // 追加 gate は不要 (gate を入れると staging-app の sub tier ゲームが消える事故になる)。
  // v1581 で PonoDebugMode 縛りを撤去し、 staging-app 経由を正当経路として復活。
  function isAppBuild() {
    try {
      return (window.__APP_BUILD__ === 1 || window.__APP_BUILD__ === '1');
    } catch (e) { return false; }
  }

  // ---- capture mode 用 tier override ----
  // common/capture.js (スクショモード) が sub 限定の隠しゲーム (starparodier 等) を
  // 撮影するために、 session 限定で「sub tier 同等」 にアクセスできるようにするフラグ。
  // sessionStorage に保存 → タブを閉じれば消える。 localStorage には書かない。
  // 既存 tier_system_policy (free/book/sub 3 パターン) は非破壊 (override が立っていなければ
  // 通常の判定にフォールバック)。 APP_BUILD は書き換えない (Worker prepend の正規ルートを汚染しない)。
  var CAPTURE_OVERRIDE_KEY = 'pono_capture_tier_override';
  function isCaptureOverride() {
    try {
      if (sessionStorage.getItem(CAPTURE_OVERRIDE_KEY) !== '1') return false;
      // SECURITY: sessionStorage に手で '1' を入れるだけで sub 化できる抜け穴を塞ぐ。
      // capture mode は staging host 上での dev 機能なので debug-mode unlock 必須にしても
      // legitimate なスクショ撮影フロー (capture.js は staging host 限定で起動) を壊さない。
      return isTierUnlockAllowedClientSide();
    } catch (e) { return false; }
  }
  function setCaptureOverride(on) {
    try {
      if (on) sessionStorage.setItem(CAPTURE_OVERRIDE_KEY, '1');
      else    sessionStorage.removeItem(CAPTURE_OVERRIDE_KEY);
    } catch (e) {}
  }

  // ---- tier 判定 ----
  function getTier() {
    // capture mode 中は session 限定で sub 同等
    if (isCaptureOverride()) return 'sub';
    // アプリ版 (APP_BUILD=1) は無条件で sub tier (アプリ版 URL に来た時点で sub 想定)
    if (isAppBuild()) return 'sub';
    // 本版: localStorage 状態で book / free のみ。 sub には絶対到達しない
    //
    // pono_premium === '1' は verifyBookPassword 経由で立てた正当な永続フラグ
    // (絵本奥付パスワードを親が入力 → book tier 解放)。 v1581 で PonoDebugMode 縛りを撤去し、
    // 既存 book 購入者が本番で free に degrade する事故を解消。
    // 将来 Stripe/IAP で book 配信する時は server-set HttpOnly cookie or signed receipt 経由に
    // 置換する想定。
    try {
      if (localStorage.getItem('pono_premium') === '1') {
        return 'book';
      }
    } catch (e) {}
    return 'free';
  }
  function isFree() { return getTier() === 'free'; }
  function isBook() { return getTier() === 'book'; }
  function isSub()  { return getTier() === 'sub';  }

  // ---- 絵本購入者に解放する海の生き物 (aquarium) 8種 ----
  // 代表的なカラフルな魚 + アクセント生物をバランスよく配置。
  // 残りの生き物はサブスクで順次解放される想定。
  var BOOK_AQUARIUM_CREATURE_IDS = [
    'clownfish',    // カクレクマノミ
    'blue_tang',    // ナンヨウハギ
    'pufferfish',   // フグ
    'mandarinfish', // ニシキテグリ
    'manta_ray',    // マンタ
    'sea_anemone',  // イソギンチャク
    'angelfish',    // エンゼルフィッシュ
    'seahorse'      // タツノオトシゴ
  ];

  // ---- 絵本購入者に解放する家具・かざり 10種 ----
  // 壁紙 (cat='wall') と床 (cat='floor') は "背景" 扱いで制限しない。
  // 家具 (furn) + かざり (deco) の中から、性別/テーマが偏らないよう選定。
  var BOOK_ROOM_ITEM_IDS = [
    'furn_bear_1',       // くまぬいぐるみ (all)
    'furn_bed_wood',     // きのベッド (boy寄り、でも中性)
    'furn_toyshelf',     // おもちゃだな (all)
    'furn_bookshelf2',   // きのほんだな (all)
    'furn_desk2',        // きのつくえ (all)
    'furn_bed_pink',     // ピンクベッド (girl)
    'furn_desk_pink',    // ピンクつくえ (girl)
    'deco_dinosaur',     // きょうりゅう (boy)
    'deco_bear_ribbon',  // リボンくま (girl)
    'deco_rug_pink'      // ピンクラグ (girl)
  ];

  // ---- quizland ----
  // v3 (2026-07-08 tier v3): free = book (機能差ゼロ)。 1回5問を
  // Lv1 2問 / Lv2 2問 / Lv3 1問で組むため、固定26問プールも
  // Lv1=10 / Lv2=10 / Lv3=6 に寄せて直接指定する (集合方式)。
  // book 専用の広い level 判定 (旧 BOOK_QUIZLAND_MAX_LEVEL) は廃止し、
  // free と同じ固定リストに統一する。
  var FREE_QUIZLAND_QUESTION_IDS = [
    // Lv1: 10問
    'order_color|0','count_total|0','shape_name|0','weather|0',
    'opposite|0','trivia|0','body|0','number_sequence|0',
    'count_total|1','trivia|1',
    // Lv2: 10問
    'order_color|8','count_total|8','shape_name|7','weather|8',
    'opposite|8','trivia|9','body|8','number_sequence|6',
    'count_total|9','trivia|10',
    // Lv3: 6問
    'order_color|16','count_total|16','shape_name|15','weather|16',
    'opposite|16','number_sequence|10'
  ]; // Lv1=10 / Lv2=10 / Lv3=6、計26問

  // ---- maze ----
  // free: 3 ステージ。 book: free + 2 ステージ。
  // Stage 7 は最終ボス露出で物語破綻するため book でも除外。
  var FREE_MAZE_STAGE_IDS = [1, 3, 6];
  var BOOK_MAZE_STAGE_IDS = [1, 2, 3, 4, 6];

  // ---- puzzle ----
  // free: 4 ステージ。 book: free + 3 ステージ + Stage 5 のポノ特別枠。
  var FREE_PUZZLE_STAGE_IDS = [1, 4, 7, 13];
  var BOOK_PUZZLE_STAGE_IDS = [1, 4, 5, 7, 11, 13, 17];
  var BOOK_PUZZLE_PONO_SPECIAL_IDS = ['stage_05'];

  // ---- oto ----
  // free: 基本3音色 + 通常スケール。 book: 追加音色 + ペンタ + 和音。
  var FREE_OTO_SOUND_SETS = ['doremi', 'kira', 'animal'];
  var BOOK_OTO_SOUND_SETS = FREE_OTO_SOUND_SETS.concat(['taiko', 'marimba', 'blip']);
  var FREE_OTO_MODES = ['free', 'rhythm'];
  var BOOK_OTO_MODES = FREE_OTO_MODES.slice();
  var FREE_OTO_SCALES = ['major'];
  var BOOK_OTO_SCALES = FREE_OTO_SCALES.concat(['penta']);
  var FREE_OTO_RHYTHM_SONGS = ['kaeru'];
  var BOOK_OTO_RHYTHM_SONGS = FREE_OTO_RHYTHM_SONGS.slice();
  // chord mode は book の追加体験として 'on' を解放する。
  var FREE_OTO_CHORD_MODES = ['off'];
  var BOOK_OTO_CHORD_MODES = ['off', 'on'];

  // ---- bento: 30食材 / お弁当箱 / NPC ----
  // free: 基本10食材。 book: 追加6食材を足して16食材。
  var FREE_BENTO_FOOD_IDS = [
    'タコウインナー', 'ハンバーグ', 'からあげ', 'コロッケ',                    // 主菜4
    'たまごやき', 'キャベツ', 'プチトマト', 'ブロッコリー',                    // 副菜4
    'いちご', 'バナナ'                                                         // フルーツ2
  ];
  var BOOK_BENTO_FOOD_IDS = FREE_BENTO_FOOD_IDS.concat([
    'エビフライ', 'やきざけ', 'ぎょうざ',
    'にんじんいんげん', 'ミートボール',
    'みかん'
  ]);
  // のり基本パーツは free に残し、追加のり/かざりは bento 側の minTier で book に分ける。
  // NOTE: bento/index.html 側に isBentoDecorUnlocked('nori') 相当の callsite は現状存在しない
  // (nori のロックは bookDecorItem() ラッパーで inline 判定されている)。 この定数は次フェーズで
  // bento/index.html を v3 準拠に直す際の参照値として公開する。
  var FREE_BENTO_NORI_ENABLED = true;

  // sub 専用の残り14食材 (30 - 16)。 sub は ALL_BENTO_FOOD_NAMES で全解放。
  var ALL_BENTO_FOOD_NAMES = BOOK_BENTO_FOOD_IDS.concat([
    'コーンほうれんそう',
    'ナポリタン', 'はるまき', 'ベーコンまき',
    'きんぴらごぼう', 'えだまめ', 'ポテトサラダ', 'ハムサラダ',
    'メロン', 'りんご', 'パイナップル', 'もも', 'ぶどう', 'キウイ'
  ]);  // 16 + 14 = 30累計

  // box / NPC も book > free の差分として維持する。
  var FREE_BENTO_BOX_IDS = ['box_rect_split'];
  var BOOK_BENTO_BOX_IDS = FREE_BENTO_BOX_IDS.concat(['box_square','box_round']);
  // sub は判定 (isBentoBoxUnlocked) で常 true 返却 = 全箱解放
  var FREE_BENTO_NPCS = [];
  var BOOK_BENTO_NPCS = ['risu','inu','shika'];

  // ---- 各ゲームごとの解放判定 ----
  function isAquariumCreatureUnlocked(id) {
    var t = getTier();
    if (t === 'sub')  return true;
    if (t === 'book') return BOOK_AQUARIUM_CREATURE_IDS.indexOf(id) >= 0;
    return false; // 無料はそもそも aquarium に辿り着けない (保険)
  }

  function isRoomItemUnlocked(id, cat) {
    var t = getTier();
    if (t === 'sub')  return true;
    // 壁紙・床は背景扱いで全開放
    if (cat === 'wall' || cat === 'floor') return true;
    if (t === 'book') return BOOK_ROOM_ITEM_IDS.indexOf(id) >= 0;
    return false;
  }

  function isKatakanaUnlocked() {
    return getTier() === 'sub';
  }

  // ---- 共通5本のロック判定 (Phase 2: 3-tier locks active) ----
  // PONO_TIER_GAME_LOCKS_ENABLED=true で稼働中。 各関数は gameLocksEnabled() が false の場合のみ
  // 全開放 (true) を返すフェイルセーフを維持 (緊急の全面無料化キャンペーン等で切替可能)。
  // NOTE: プラン本文見出しでは「判定関数14個」と書かれているが、 同セクションの仕様列挙は
  // 12 関数 (下記) のみ。 ここでは列挙された 12 関数を実装。 既存の verifyBookPassword +
  // showSubscribePromo を含めて 14 と数える解釈もありえる。
  function isQuizlandQuestionUnlocked(qid, category, level) {
    if (!gameLocksEnabled()) return true;
    var t = getTier();
    if (t === 'sub') return true;
    // v3: free = book (機能差ゼロ)。 固定リスト (FREE_QUIZLAND_QUESTION_IDS) に含まれる
    // qid のみ解放 (free/book 共通)。
    // 空配列の場合はフェイルセーフで true (= 全開放) を返し、 万一 list が空になった瞬間に
    // free/book ユーザーの全クイズが false 判定で完全ロックされる事故を防ぐ。
    // 通常は L164-176 付近で 26 問が登録済 → 通常の indexOf 判定に切り替わる。
    if (FREE_QUIZLAND_QUESTION_IDS.length === 0) return true;
    return FREE_QUIZLAND_QUESTION_IDS.indexOf(qid) >= 0;
  }

  // ---- quizland 難易度ロック ----
  // 難易度 (easy=Lv1 / normal=Lv2 / hard=Lv3) を tier だけで判定する。
  //   free / book: easy のみ (Lv1) ※ v3 で free = book に統一
  //   sub: 全開放
  // DIFF_MIN_LEVEL は呼び出し側 (quizland) と整合: easy=1, normal=2, hard=3。
  function isQuizlandDifficultyUnlocked(diff, mode) {
    if (!gameLocksEnabled()) return true;
    var lvMap = { easy: 1, normal: 2, hard: 3 };
    var lv = lvMap[diff] || 1;
    var t = getTier();
    if (t === 'sub') return true;
    // v3: free = book (機能差ゼロ)
    return lv === 1;
  }

  function isMazeStageUnlocked(stageNum) {
    if (!gameLocksEnabled()) return true;
    var n = Number(stageNum);
    if (!isFinite(n)) return false;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'book') return BOOK_MAZE_STAGE_IDS.indexOf(n) >= 0;
    return FREE_MAZE_STAGE_IDS.indexOf(n) >= 0;
  }

  function isPuzzleStageUnlocked(stageNum) {
    if (!gameLocksEnabled()) return true;
    var n = Number(stageNum);
    if (!isFinite(n)) return false;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'book') return BOOK_PUZZLE_STAGE_IDS.indexOf(n) >= 0;
    return FREE_PUZZLE_STAGE_IDS.indexOf(n) >= 0;
  }

  function normalizePuzzleSpecialStageId(stageId) {
    var raw = String(stageId == null ? '' : stageId).trim();
    if (!raw) return '';
    var numeric = raw.match(/^(?:stage_)?(\d+)$/);
    if (!numeric) return raw;
    return 'stage_' + String(Number(numeric[1])).padStart(2, '0');
  }

  function isPuzzlePonoSpecialUnlocked(stageId) {
    if (!gameLocksEnabled()) return true;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'book') {
      return BOOK_PUZZLE_PONO_SPECIAL_IDS.indexOf(normalizePuzzleSpecialStageId(stageId)) >= 0;
    }
    return false;
  }

  function isOtoSoundSetUnlocked(setId) {
    if (!gameLocksEnabled()) return true;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'book') return BOOK_OTO_SOUND_SETS.indexOf(setId) >= 0;
    return FREE_OTO_SOUND_SETS.indexOf(setId) >= 0;
  }

  function isOtoModeUnlocked(mode) {
    if (!gameLocksEnabled()) return true;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'book') return BOOK_OTO_MODES.indexOf(mode) >= 0;
    return FREE_OTO_MODES.indexOf(mode) >= 0;
  }

  function isOtoScaleUnlocked(scale) {
    if (!gameLocksEnabled()) return true;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'book') return BOOK_OTO_SCALES.indexOf(scale) >= 0;
    return FREE_OTO_SCALES.indexOf(scale) >= 0;
  }

  function isOtoRhythmSongUnlocked(songId) {
    if (!gameLocksEnabled()) return true;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'book') return BOOK_OTO_RHYTHM_SONGS.indexOf(songId) >= 0;
    return FREE_OTO_RHYTHM_SONGS.indexOf(songId) >= 0;
  }

  function isOtoChordModeUnlocked(mode) {
    if (!gameLocksEnabled()) return true;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'book') return BOOK_OTO_CHORD_MODES.indexOf(mode) >= 0;
    return FREE_OTO_CHORD_MODES.indexOf(mode) >= 0;
  }

  function isBentoFoodUnlocked(foodNameOrObj) {
    if (!gameLocksEnabled()) return true;
    var name = typeof foodNameOrObj === 'string' ? foodNameOrObj : (foodNameOrObj && foodNameOrObj.name);
    if (!name) return false;
    var t = getTier();
    if (t === 'sub') return ALL_BENTO_FOOD_NAMES.indexOf(name) >= 0;
    if (t === 'book') return BOOK_BENTO_FOOD_IDS.indexOf(name) >= 0;
    return FREE_BENTO_FOOD_IDS.indexOf(name) >= 0;
  }

  function isBentoBoxUnlocked(boxId) {
    if (!gameLocksEnabled()) return true;
    if (!boxId) return false;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'book') return BOOK_BENTO_BOX_IDS.indexOf(boxId) >= 0;
    return FREE_BENTO_BOX_IDS.indexOf(boxId) >= 0;
  }

  function isBentoNpcUnlocked(npcId) {
    if (!gameLocksEnabled()) return true;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'book') return BOOK_BENTO_NPCS.indexOf(npcId) >= 0;
    return FREE_BENTO_NPCS.indexOf(npcId) >= 0;
  }

  // ---- monster_math (モンスターさんすう) ----
  // v3 (2026-07-06/07 ユーザー決定ログ §13.2 承認済): free = book (機能差ゼロ)。
  // [Phase R3 Fix (2026-07-07)] 旧3モード (かぞえる/10づくり/たしざん) は
  // テンメガネ (ten) / カクレン (kak) の2モードに統合された (engine.js MODE_ORDER 準拠)。
  // カクレン Stage1-2 (旧かぞえる相当) / テンメガネ Stage1 (旧10づくり相当) のみ解放、
  // 残りは sub。
  var FREE_MONSTER_MATH_STAGE_IDS = {
    kak: [1, 2],
    ten: [1]
  };

  function isMonsterMathStageUnlocked(mode, stageNum) {
    if (!gameLocksEnabled()) return true;
    var t = getTier();
    if (t === 'sub') return true;
    // v3: free = book (機能差ゼロ)
    var list = FREE_MONSTER_MATH_STAGE_IDS[mode];
    if (!list) return false; // 未知の mode 名は保険で全ロック (誤って全開放しない)
    return list.indexOf(stageNum) >= 0;
  }

  // ---- 絵本印字パスワード検証 ----
  // 絵本の奥付に印字する解錠コードをここで集中管理。
  // 絵本を増刷・新シリーズを出す時はこの配列に追記する想定。
  // 大文字/小文字どちらでも通るよう両方試す (子供/保護者が手入力するため)。
  // Closure に閉じるので window.PonoTier からは見えず、DevTools 経由で
  // 覗き見されにくい (完全な秘匿ではないが casual friction を維持)。
  // v17XX: abcd/1234 廃止、arigato_pono2026 1 本化。
  //   旧: BOOK_PASSWORDS = ['1234']  /  ADMIN_PASSWORDS = ['abcd']
  //   新: BOOK_PASSWORDS = ['arigato_pono2026'] 一本化、 ADMIN_PASSWORDS は撤去 (verifyAdminPassword も削除)
  //       理由: テスト用の弱パスワード (1234/abcd) が staging 経路から漏洩しても被害が出ない
  //       ように、 絵本奥付の本パスワード相当に統合。 callsite は全て verifyBookPassword に寄せる。
  var BOOK_PASSWORDS = ['arigato_pono2026'];
  function verifyBookPassword(val) {
    // 親が紙絵本の奥付に印字されたパスワードを入力する正当ルート。
    // PonoDebugMode 縛りは撤去済 (本番で book 解錠不能になる事故を解消)。
    // 将来 IAP 配備時はサーバ検証 (signed receipt) に置換する想定。
    // 比較は case-insensitive (raw / upper / 配列要素の upper を全て試す)。
    if (val == null) return false;
    var raw = String(val).trim();
    if (!raw) return false;
    var upper = raw.toUpperCase();
    for (var i = 0; i < BOOK_PASSWORDS.length; i++) {
      var p = BOOK_PASSWORDS[i];
      if (p === raw || p === upper || p.toUpperCase() === upper) return true;
    }
    return false;
  }
  // v17XX: ADMIN_PASSWORDS / verifyAdminPassword は削除済。
  // 管理用マスター解錠は廃止し、 admin tools 本体側の Basic Auth + KV ルートに一本化。
  // クライアント側で book 相当の追加解錠が必要な場合は verifyBookPassword (arigato_pono2026) を使用する。

  // ============================================================
  // ---- Book Tier Unlock 拡張: シリアル / 絵本クイズ ----
  //
  // 既存 verifyBookPassword (BOOK_PASSWORDS) は 「シリアル」 タブの一次経路として継続使用。
  // 追加で以下 2 種のクライアント側 verifier を提供する:
  //   1) verifySerialCode(val)             … BOOK_PASSWORDS 互換 + SERIAL_CODES 追加
  //   2) verifyQuizAnswer(questionId, val) … 絵本内容クイズの正解判定 (答え揺らぎ吸収)
  // ヘルパー pickRandomQuiz() / QUIZ_QUESTIONS / normalizeAnswer も合わせて公開。
  //
  // (v1996: Amazon 注文番号経路 (verifyOrderId / ORDER_ID_RE) は author 側で verify 不能のため撤去)
  //
  // 設計方針:
  //   - すべて client side のみで完結 (server 検証は将来 Stripe/IAP 経路で別途実装)
  //   - クイズ答え揺らぎは normalizeAnswer (全角→半角 / カナ→ひらがな / 空白除去 /
  //     語尾敬称除去 + lowercase) で吸収。 漢字バリアントは answers 配列に明示列挙
  // ============================================================

  // 印字シリアル候補 (将来 増刷時はここに追記)。 BOOK_PASSWORDS と論理的に同等扱い。
  var SERIAL_CODES = [];

  // 絵本内容クイズ (現状 1 問。 将来 admin から差替 or 配列追加)
  var QUIZ_QUESTIONS = [
    {
      id: 'pono_first_friend',
      q: 'えほんで さいしょに でてくる ポノの おともだちの どうぶつは？',
      answers: ['ハリネズミ', 'はりねずみ', '針鼠', 'ハリちゃん', 'ハリ']
    }
  ];

  /**
   * 答え揺らぎ吸収のための正規化関数。
   *  - trim 前後空白
   *  - 全角英数記号 (Ｕ＋ＦＦ０１..ＵＦＦ５Ｅ) → 半角 (0xFEE0 オフセット)
   *  - カタカナ (U+30A1..U+30F6) → ひらがな (-0x60)
   *  - 空白 / 全角空白 / 中黒 (・) を削除
   *  - 語尾 「くん」 「さん」 「ちゃん」 「さま」 「様」 を 1 度だけ削除
   *  - 最後に toLowerCase
   * @param {string} s 入力文字列
   * @returns {string} 正規化済み文字列 (照合用)
   */
  function normalizeAnswer(s) {
    if (s == null) return '';
    var t = String(s).trim();
    t = t.replace(/[！-～]/g, function(ch){ return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); });
    t = t.replace(/[ァ-ヶ]/g, function(ch){ return String.fromCharCode(ch.charCodeAt(0) - 0x60); });
    t = t.replace(/[\s　・]/g, '');
    t = t.replace(/(くん|さん|ちゃん|さま|様)$/, '');
    return t.toLowerCase();
  }

  /**
   * 印字シリアル / 旧 BOOK_PASSWORD を検証する。
   * 大文字小文字は無視。 BOOK_PASSWORDS と SERIAL_CODES の両方を試す。
   * @param {string} val ユーザー入力
   * @returns {boolean}
   */
  function verifySerialCode(val) {
    if (val == null) return false;
    var raw = String(val).trim();
    if (!raw) return false;
    var upper = raw.toUpperCase();
    var i, p;
    for (i = 0; i < BOOK_PASSWORDS.length; i++) {
      p = BOOK_PASSWORDS[i];
      if (p === raw || p === upper || p.toUpperCase() === upper) return true;
    }
    for (i = 0; i < SERIAL_CODES.length; i++) {
      p = SERIAL_CODES[i];
      if (p === raw || p === upper || p.toUpperCase() === upper) return true;
    }
    return false;
  }

  /**
   * 絵本クイズの解答を検証する。
   * 内部で normalizeAnswer を通してから answers と比較。
   * @param {string} questionId QUIZ_QUESTIONS の id
   * @param {string} val ユーザー入力
   * @returns {boolean}
   */
  function verifyQuizAnswer(questionId, val) {
    if (!questionId) return false;
    var q = null;
    for (var i = 0; i < QUIZ_QUESTIONS.length; i++) {
      if (QUIZ_QUESTIONS[i].id === questionId) { q = QUIZ_QUESTIONS[i]; break; }
    }
    if (!q) return false;
    var n = normalizeAnswer(val);
    if (!n) return false;
    for (var j = 0; j < q.answers.length; j++) {
      if (normalizeAnswer(q.answers[j]) === n) return true;
    }
    return false;
  }

  /**
   * QUIZ_QUESTIONS からランダムに 1 問を返す。 配列が空なら null。
   * @returns {{id:string, q:string, answers:string[]} | null}
   */
  function pickRandomQuiz() {
    if (!QUIZ_QUESTIONS.length) return null;
    var idx = Math.floor(Math.random() * QUIZ_QUESTIONS.length);
    return QUIZ_QUESTIONS[idx];
  }

  function getTierLockPromoCopy(opts) {
    opts = opts || {};
    if (getTier() === 'free') {
      return {
        tag: opts.freeTag || 'えほんがあると もっと ひろがるよ',
        title: opts.freeTitle || 'えほんの あいことばで つづきも あそべるよ',
        body: opts.freeBody || 'タイトルの えほんボタンから あいことばを いれてね'
      };
    }
    return {
      tag: opts.appTag || 'アプリで もっと',
      title: opts.appTitle || 'アプリで もっと ふえるよ',
      body: opts.appBody || 'あたらしい あそびを じゅんびしているよ'
    };
  }

  function _hasTierExtra(baseList, nextList) {
    if (!Array.isArray(baseList) || !Array.isArray(nextList)) return false;
    for (var i = 0; i < nextList.length; i++) {
      if (baseList.indexOf(nextList[i]) < 0) return true;
    }
    return false;
  }

  function hasBookUpgradeContent(gameId) {
    if (getTier() !== 'free') return false;
    switch (String(gameId || '')) {
      case 'maze':
        return _hasTierExtra(FREE_MAZE_STAGE_IDS, BOOK_MAZE_STAGE_IDS);
      case 'puzzle':
        return _hasTierExtra(FREE_PUZZLE_STAGE_IDS, BOOK_PUZZLE_STAGE_IDS)
          || BOOK_PUZZLE_PONO_SPECIAL_IDS.length > 0;
      case 'oto':
        return _hasTierExtra(FREE_OTO_SOUND_SETS, BOOK_OTO_SOUND_SETS)
          || _hasTierExtra(FREE_OTO_SCALES, BOOK_OTO_SCALES)
          || _hasTierExtra(FREE_OTO_CHORD_MODES, BOOK_OTO_CHORD_MODES)
          || _hasTierExtra(FREE_OTO_RHYTHM_SONGS, BOOK_OTO_RHYTHM_SONGS);
      case 'bento':
        return _hasTierExtra(FREE_BENTO_FOOD_IDS, BOOK_BENTO_FOOD_IDS)
          || _hasTierExtra(FREE_BENTO_BOX_IDS, BOOK_BENTO_BOX_IDS)
          || _hasTierExtra(FREE_BENTO_NPCS, BOOK_BENTO_NPCS);
      default:
        return false;
    }
  }

  function getBookLimitPromoCopy(gameId, opts) {
    opts = opts || {};
    var id = String(gameId || '');
    var body = 'えほんの あいことばで つづきも あそべるよ';
    if (id === 'maze' || id === 'puzzle') {
      body = 'えほんの あいことばで、あたらしい ステージが あそべるよ';
    } else if (id === 'oto') {
      body = 'えほんの あいことばで、ねいろや ライバルたちが ふえるよ';
    } else if (id === 'bento') {
      body = 'えほんの あいことばで、おかずや おべんとうばこ、おきゃくさんが ふえるよ';
    }
    return {
      tag: opts.tag || opts.freeTag || 'えほんがあると もっと ひろがるよ',
      title: Object.prototype.hasOwnProperty.call(opts, 'title') ? opts.title : (opts.freeTitle || ''),
      body: opts.body || opts.freeBody || body
    };
  }

  function _isPromoBlockedByRewardModal() {
    try {
      return !!document.querySelector('.pono-acorn-modal');
    } catch (e) {
      return false;
    }
  }

  function _showBookLimitPromoWhenQuiet(copy, opts, attempt) {
    opts = opts || {};
    attempt = attempt || 0;
    if (_isPromoBlockedByRewardModal() && attempt < 10) {
      setTimeout(function() {
        _showBookLimitPromoWhenQuiet(copy, opts, attempt + 1);
      }, 900);
      return true;
    }
    return showSubscribePromo({
      tag: copy.tag,
      title: copy.title,
      body: copy.body,
      buttonText: opts.buttonText || 'とじる',
      onClose: opts.onClose
    });
  }

  function showBookLimitPromo(gameId, opts) {
    opts = opts || {};
    if (getTier() !== 'free') return false;
    if (opts.requireUpgrade !== false && !hasBookUpgradeContent(gameId)) return false;
    var copy = getBookLimitPromoCopy(gameId, opts);
    var delay = Math.max(0, Number(opts.delayMs) || 0);
    if (delay > 0) {
      setTimeout(function() { _showBookLimitPromoWhenQuiet(copy, opts, 0); }, delay);
      return true;
    }
    return _showBookLimitPromoWhenQuiet(copy, opts, 0);
  }

  function showBookLimitPromoOnce(gameId, opts) {
    opts = opts || {};
    if (getTier() !== 'free') return false;
    var key = opts.onceKey || ('pono_book_limit_promo_seen_v1:' + String(gameId || ''));
    try {
      if (!opts.force && localStorage.getItem(key) === '1') return false;
      localStorage.setItem(key, '1');
    } catch (e) {}
    return showBookLimitPromo(gameId, opts);
  }

  function showTierLockPromo(opts) {
    opts = opts || {};
    var copy = getTierLockPromoCopy(opts);
    return showSubscribePromo({
      tag: copy.tag,
      title: copy.title,
      body: copy.body,
      onClose: opts.onClose
    });
  }

  // ---- ロック誘導モーダル ----
  // opts: { title, body, onClose }
  function showSubscribePromo(opts) {
    opts = opts || {};
    var defaultCopy = getTierLockPromoCopy(opts);
    // 既に開いていたら無視
    if (document.querySelector('.tier-promo-modal')) return;

    var ov = document.createElement('div');
    ov.className = 'tier-promo-modal';
    ov.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9999',
      'background:rgba(0,0,0,0.65)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'padding:20px', 'opacity:0',
      'transition:opacity 0.25s ease'
    ].join(';');

    var box = document.createElement('div');
    box.style.cssText = [
      'background:#fff', 'border-radius:22px',
      'padding:20px 22px 22px', 'text-align:center',
      'max-width:360px', 'width:100%',
      'box-shadow:0 10px 36px rgba(0,0,0,0.35)',
      'transform:scale(0.85)',
      'transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      'font-family:"Zen Maru Gothic", sans-serif'
    ].join(';');

    var tag = document.createElement('div');
    tag.style.cssText = [
      'display:inline-block', 'font-size:0.74rem', 'font-weight:900',
      'color:#fff',
      'background:linear-gradient(135deg,#34D399,#10B981)',
      'padding:4px 14px', 'border-radius:50px',
      'letter-spacing:0.06em', 'margin-bottom:10px'
    ].join(';');
    tag.textContent = opts.tag || defaultCopy.tag;
    box.appendChild(tag);

    var resolvedTitle = Object.prototype.hasOwnProperty.call(opts, 'title') ? opts.title : defaultCopy.title;
    if (resolvedTitle) {
      var title = document.createElement('div');
      title.style.cssText = 'font-size:1.1rem;font-weight:900;color:#5D4E37;margin-bottom:10px;line-height:1.4';
      title.textContent = resolvedTitle;
      box.appendChild(title);
    }

    var body = document.createElement('div');
    body.style.cssText = 'font-size:0.92rem;font-weight:700;color:#5D4E37;line-height:1.6;margin-bottom:16px';
    body.textContent = opts.body || defaultCopy.body;
    box.appendChild(body);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = [
      'padding:10px 32px', 'border:none', 'border-radius:50px',
      'background:linear-gradient(135deg,#60A5FA,#3B82F6)',
      'color:#fff', 'font-family:inherit',
      'font-size:0.95rem', 'font-weight:900', 'cursor:pointer',
      'box-shadow:0 4px 14px rgba(59,130,246,0.4)'
    ].join(';');
    btn.textContent = opts.buttonText || 'わかった！';
    box.appendChild(btn);

    ov.appendChild(box);
    document.body.appendChild(ov);

    requestAnimationFrame(function() {
      ov.style.opacity = '1';
      box.style.transform = 'scale(1)';
    });

    var closed = false;
    var autoTimer = null;
    function close() {
      if (closed) return;
      closed = true;
      if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
      ov.style.opacity = '0';
      box.style.transform = 'scale(0.85)';
      setTimeout(function() {
        if (ov.parentNode) ov.remove();
        if (opts.onClose) { try { opts.onClose(); } catch (e) {} }
      }, 260);
    }
    btn.addEventListener('click', close);
    ov.addEventListener('click', function(e) { if (e.target === ov) close(); });
    autoTimer = setTimeout(close, 6000);
  }

  // ---- export ----
  window.PonoTier = {
    getTier: getTier,
    isTierUnlockAllowedClientSide: isTierUnlockAllowedClientSide,
    isAppBuild: isAppBuild,
    isFree: isFree,
    isBook: isBook,
    isSub:  isSub,
    setCaptureOverride: setCaptureOverride,
    isCaptureOverride: isCaptureOverride,
    isAquariumCreatureUnlocked: isAquariumCreatureUnlocked,
    isRoomItemUnlocked: isRoomItemUnlocked,
    isKatakanaUnlocked: isKatakanaUnlocked,
    verifyBookPassword: verifyBookPassword,
    // verifyAdminPassword: 削除済 (v17XX: abcd 廃止、 arigato_pono2026 1 本化)。
    // Book Tier Unlock 拡張 (シリアル / 絵本クイズ の 2 経路。 Amazon 注文番号 verifyOrderId は v1997 で撤去済)
    verifySerialCode: verifySerialCode,
    verifyQuizAnswer: verifyQuizAnswer,
    pickRandomQuiz: pickRandomQuiz,
    normalizeAnswer: normalizeAnswer,
    QUIZ_QUESTIONS: QUIZ_QUESTIONS,
    showTierLockPromo: showTierLockPromo,
    showSubscribePromo: showSubscribePromo,
    showBookLimitPromo: showBookLimitPromo,
    showBookLimitPromoOnce: showBookLimitPromoOnce,
    hasBookUpgradeContent: hasBookUpgradeContent,
    BOOK_AQUARIUM_CREATURE_IDS: BOOK_AQUARIUM_CREATURE_IDS,
    BOOK_ROOM_ITEM_IDS:         BOOK_ROOM_ITEM_IDS,
    isQuizlandQuestionUnlocked: isQuizlandQuestionUnlocked,
    isQuizlandDifficultyUnlocked: isQuizlandDifficultyUnlocked,
    isMazeStageUnlocked: isMazeStageUnlocked,
    isPuzzleStageUnlocked: isPuzzleStageUnlocked,
    isPuzzlePonoSpecialUnlocked: isPuzzlePonoSpecialUnlocked,
    isOtoSoundSetUnlocked: isOtoSoundSetUnlocked,
    isOtoModeUnlocked: isOtoModeUnlocked,
    isOtoScaleUnlocked: isOtoScaleUnlocked,
    isOtoRhythmSongUnlocked: isOtoRhythmSongUnlocked,
    isOtoChordModeUnlocked: isOtoChordModeUnlocked,
    isBentoFoodUnlocked: isBentoFoodUnlocked,
    isBentoBoxUnlocked: isBentoBoxUnlocked,
    isBentoNpcUnlocked: isBentoNpcUnlocked,
    isMonsterMathStageUnlocked: isMonsterMathStageUnlocked,
    FREE_MONSTER_MATH_STAGE_IDS: FREE_MONSTER_MATH_STAGE_IDS,
    FREE_QUIZLAND_QUESTION_IDS: FREE_QUIZLAND_QUESTION_IDS,
    ALL_BENTO_FOOD_NAMES: ALL_BENTO_FOOD_NAMES,
    BOOK_BENTO_FOOD_NAMES: BOOK_BENTO_FOOD_IDS,
    FREE_BENTO_FOOD_NAMES: FREE_BENTO_FOOD_IDS,
    BOOK_BENTO_FOOD_IDS: BOOK_BENTO_FOOD_IDS,
    FREE_BENTO_FOOD_IDS: FREE_BENTO_FOOD_IDS,
    FREE_BENTO_NORI_ENABLED: FREE_BENTO_NORI_ENABLED,
    FREE_MAZE_STAGE_IDS: FREE_MAZE_STAGE_IDS,
    BOOK_MAZE_STAGE_IDS: BOOK_MAZE_STAGE_IDS,
    FREE_PUZZLE_STAGE_IDS: FREE_PUZZLE_STAGE_IDS,
    BOOK_PUZZLE_STAGE_IDS: BOOK_PUZZLE_STAGE_IDS,
    BOOK_PUZZLE_PONO_SPECIAL_IDS: BOOK_PUZZLE_PONO_SPECIAL_IDS,
    FREE_OTO_SOUND_SETS: FREE_OTO_SOUND_SETS,
    BOOK_OTO_SOUND_SETS: BOOK_OTO_SOUND_SETS,
    FREE_OTO_MODES: FREE_OTO_MODES,
    BOOK_OTO_MODES: BOOK_OTO_MODES,
    FREE_OTO_SCALES: FREE_OTO_SCALES,
    BOOK_OTO_SCALES: BOOK_OTO_SCALES,
    FREE_OTO_RHYTHM_SONGS: FREE_OTO_RHYTHM_SONGS,
    BOOK_OTO_RHYTHM_SONGS: BOOK_OTO_RHYTHM_SONGS
  };
})();
