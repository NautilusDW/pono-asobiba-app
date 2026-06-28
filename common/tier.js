/* ============================================================
   common/tier.js  (Phase 3: 3階層の深さ制限)

   ユーザー層判定と、絵本購入者向けの "幅8割解放＋深さ制限" の中央化。

   公開API (window.PonoTier):
     - getTier()                           → 'free' | 'book' | 'sub'
     - isFree() / isBook() / isSub()       簡易判定
     - isAquariumCreatureUnlocked(id)      海の生き物が解放されているか
     - isRoomItemUnlocked(id, cat)         家具/かざりが解放されているか
     - isKatakanaUnlocked()                カタカナ編が解放されているか
     - verifyBookPassword(val)             絵本印字パスワードを検証
     - showSubscribePromo(opts)            サブスク誘導モーダル（伸びしろ表現）
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

  // Phase 1: 共通5本のロックを全て無効化するセーフフラグ。 Phase 2 で true に切替。
  // DevTools / 後から読み込まれる任意のスクリプト / 旧 sw キャッシュ等による誤上書きを避けるため
  // Object.defineProperty で writable:false にする。 Phase 2 で恒久的に true 動作へ移行する時は
  // configurable:true なので再定義で切替可能。
  if (typeof window.PONO_TIER_GAME_LOCKS_ENABLED === 'undefined') {
    try {
      Object.defineProperty(window, 'PONO_TIER_GAME_LOCKS_ENABLED', {
        value: true,  // Web MVP: 全機能無料公開 (Amazon 絵本購入者向け)
        writable: false,
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      // 古いブラウザ等で defineProperty が失敗したらフォールバック (Web MVP: ロック無効。Phase 2 復活時は true に戻すこと)
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
  var FREE_QUIZLAND_QUESTION_IDS = [
    'order_color|0','order_color|1','order_color|2',
    'count_total|0','count_total|1','count_total|2',
    'shape_name|0','shape_name|1','shape_name|2',
    'number_sequence|0','number_sequence|1','number_sequence|2',
    'weather|0','weather|1','weather|2',
    'opposite|0','opposite|1','opposite|2',
    'body|0','body|1','body|2',
    'trivia|0','trivia|1','trivia|2','trivia|3','trivia|4'
  ]; // Phase 2: 各カテゴリ Lv1 から3問 + trivia 5問 = 26問
  var BOOK_QUIZLAND_MAX_LEVEL = 2; // book はカテゴリを混ぜて Lv2 まで、sub は Lv3 まで

  // ---- maze ----
  var FREE_MAZE_MAX_STAGE = 3;
  var BOOK_MAZE_MAX_STAGE = 7;

  // ---- puzzle ----
  var FREE_PUZZLE_MAX_STAGE = 3;
  var BOOK_PUZZLE_MAX_STAGE = 9;
  var BOOK_PUZZLE_PONO_SPECIAL_IDS = ['stage_05']; // book に解放するポノ特別枠 (sub は #5/10/15/20 全部)

  // ---- oto ----
  var FREE_OTO_SETS = ['doremi','kira'];
  var BOOK_OTO_SETS = ['doremi','kira','marimba','animal'];
  var FREE_OTO_MODES = ['free'];
  var BOOK_OTO_MODES = ['free','rhythm'];
  var FREE_OTO_SCALES = ['major'];
  var BOOK_OTO_SCALES = ['major','penta'];
  var FREE_OTO_RHYTHM_SONGS = [];
  var BOOK_OTO_RHYTHM_SONGS = ['kaeru'];
  var FREE_OTO_CHORD_MODES = ['off'];
  var BOOK_OTO_CHORD_MODES = ['off','on'];

  // ---- bento: 30食材 / お弁当箱 / NPC ----
  var FREE_BENTO_FOOD_NAMES = [
    'タコウインナー','ハンバーグ','たまごやき',
    'キャベツ','プチトマト','ブロッコリー',
    'いちご','バナナ'
  ];  // 8食材

  var BOOK_BENTO_FOOD_NAMES = FREE_BENTO_FOOD_NAMES.concat([
    'からあげ','コロッケ','エビフライ','やきざけ','ミートボール',
    'にんじんいんげん','コーンほうれんそう'
  ]);  // +7 = 15累計

  var ALL_BENTO_FOOD_NAMES = BOOK_BENTO_FOOD_NAMES.concat([
    'ナポリタン','ぎょうざ','はるまき','ベーコンまき',
    'きんぴらごぼう','えだまめ','ポテトサラダ','ハムサラダ',
    'みかん','メロン','りんご','パイナップル','もも','ぶどう','キウイ'
  ]);  // +15 = 30累計
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

  // ---- Phase 1: 共通5本のロック判定 (セーフフラグ OFF の間は常に true) ----
  // NOTE: プラン本文見出しでは「判定関数14個」と書かれているが、 同セクションの仕様列挙は
  // 12 関数 (下記) のみ。 ここでは列挙された 12 関数だけを実装し、 残り 2 関数 (もし必要なら)
  // は Phase 2 wiring 時に planner と仕様合意の上で追加する方針。
  // 既存の verifyBookPassword + showSubscribePromo を含めて 14 と数える解釈もありえる。
  function isQuizlandQuestionUnlocked(qid, category, level) {
    if (!gameLocksEnabled()) return true;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'book') {
      return (level || 1) <= BOOK_QUIZLAND_MAX_LEVEL;
    }
    // free: 固定リスト (Phase 2 で qid 埋める)。
    // 空配列の間はフェイルセーフで true (= 全開放) を返し、 セーフフラグを ON にした瞬間に
    // free ユーザーの全クイズが false 判定で完全ロックされる事故を防ぐ。
    // Phase 2 で FREE_QUIZLAND_QUESTION_IDS に 26問の qid を埋めた時点で自動的に
    // 通常の indexOf 判定に切り替わる。
    if (FREE_QUIZLAND_QUESTION_IDS.length === 0) return true;
    return FREE_QUIZLAND_QUESTION_IDS.indexOf(qid) >= 0;
  }

  // ---- quizland 難易度ロック ----
  // 難易度 (easy=Lv1 / normal=Lv2 / hard=Lv3) を tier だけで判定する。
  //   free: easy のみ (Lv1)
  //   book: easy / normal (Lv1/2)
  //   sub: 全開放
  // DIFF_MIN_LEVEL は呼び出し側 (quizland) と整合: easy=1, normal=2, hard=3。
  function isQuizlandDifficultyUnlocked(diff, mode) {
    if (!gameLocksEnabled()) return true;
    var lvMap = { easy: 1, normal: 2, hard: 3 };
    var lv = lvMap[diff] || 1;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'free') return lv === 1;
    return lv <= BOOK_QUIZLAND_MAX_LEVEL;
  }

  function isMazeStageUnlocked(stageNum) {
    if (!gameLocksEnabled()) return true;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'book') return stageNum <= BOOK_MAZE_MAX_STAGE;
    return stageNum <= FREE_MAZE_MAX_STAGE;
  }

  function isPuzzleStageUnlocked(stageNum) {
    if (!gameLocksEnabled()) return true;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'book') return stageNum <= BOOK_PUZZLE_MAX_STAGE;
    return stageNum <= FREE_PUZZLE_MAX_STAGE;
  }

  function isPuzzlePonoSpecialUnlocked(stageId) {
    if (!gameLocksEnabled()) return true;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'book') return BOOK_PUZZLE_PONO_SPECIAL_IDS.indexOf(stageId) >= 0;
    return false;
  }

  function isOtoSoundSetUnlocked(setId) {
    if (!gameLocksEnabled()) return true;
    var t = getTier();
    if (t === 'sub') return true;
    if (t === 'book') return BOOK_OTO_SETS.indexOf(setId) >= 0;
    return FREE_OTO_SETS.indexOf(setId) >= 0;
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
    if (t === 'book') return BOOK_BENTO_FOOD_NAMES.indexOf(name) >= 0;
    return FREE_BENTO_FOOD_NAMES.indexOf(name) >= 0;
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

  // ---- 絵本印字パスワード検証 ----
  // 絵本の奥付に印字する解錠コードをここで集中管理。
  // 絵本を増刷・新シリーズを出す時はこの配列に追記する想定。
  // 大文字/小文字どちらでも通るよう両方試す (子供/保護者が手入力するため)。
  // Closure に閉じるので window.PonoTier からは見えず、DevTools 経由で
  // 覗き見されにくい (完全な秘匿ではないが casual friction を維持)。
  var BOOK_PASSWORDS = ['1234'];  // Web MVP: 全機能無料公開のため book/sub 区分は休眠。将来 IAP 復活時にここを埋める
  function verifyBookPassword(val) {
    // v1581: 親が紙絵本の奥付に印字されたパスワードを入力する正当ルート。
    // PonoDebugMode 縛りを撤去 (本番で book 解錠不能になる事故を解消)。
    // 将来 IAP 配備時はサーバ検証 (signed receipt) に置換する想定。
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

  // 管理用マスターパスワード。book + sub 両方を解放
  var ADMIN_PASSWORDS = ['abcd'];
  function verifyAdminPassword(val) {
    // v1581: 管理用マスターパスワード (book + sub 両方を解放)。 admin tools 本体は
    // Basic Auth + KV で保護されており、 ここはクライアント側 UX 用の柔らかいゲート。
    // PonoDebugMode 縛りを撤去 (本番 admin 経路を壊さない)。
    if (val == null) return false;
    var raw = String(val).trim();
    if (!raw) return false;
    var upper = raw.toUpperCase();
    for (var i = 0; i < ADMIN_PASSWORDS.length; i++) {
      var p = ADMIN_PASSWORDS[i];
      if (p === raw || p === upper || p.toUpperCase() === upper) return true;
    }
    return false;
  }

  // ============================================================
  // ---- Book Tier Unlock 拡張: シリアル / Amazon 注文番号 / 絵本クイズ ----
  //
  // 既存 verifyBookPassword (BOOK_PASSWORDS) は 「シリアル」 タブの一次経路として継続使用。
  // 追加で以下 3 種のクライアント側 verifier を提供する:
  //   1) verifySerialCode(val)             … BOOK_PASSWORDS 互換 + SERIAL_CODES 追加
  //   2) verifyOrderId(val)                … Amazon 注文番号の形式 (3-7-7) のみ照合
  //   3) verifyQuizAnswer(questionId, val) … 絵本内容クイズの正解判定 (答え揺らぎ吸収)
  // ヘルパー pickRandomQuiz() / QUIZ_QUESTIONS / normalizeAnswer も合わせて公開。
  //
  // 設計方針:
  //   - すべて client side のみで完結 (server 検証は将来 Stripe/IAP 経路で別途実装)
  //   - 注文番号は形式 spoofing 可能 (サーバ無しでは原理的に防げない) ため
  //     friction 低めの導線として割り切り、 重複 ID 検知だけ別途呼び出し側で行う想定
  //   - クイズ答え揺らぎは normalizeAnswer (全角→半角 / カナ→ひらがな / 空白除去 /
  //     語尾敬称除去 + lowercase) で吸収。 漢字バリアントは answers 配列に明示列挙
  // ============================================================

  // 印字シリアル候補 (将来 増刷時はここに追記)。 BOOK_PASSWORDS と論理的に同等扱い。
  var SERIAL_CODES = [];

  // Amazon 注文番号 (3桁-7桁-7桁)
  var ORDER_ID_RE = /^\d{3}-\d{7}-\d{7}$/;

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
   * Amazon 注文番号 (3桁-7桁-7桁) を検証する。
   * 形式チェックのみ。 全角数字 / 各種ダッシュ / 空白を半角ハイフンに正規化してから regex 照合。
   * @param {string} val ユーザー入力
   * @returns {boolean}
   */
  function verifyOrderId(val) {
    if (val == null) return false;
    var raw = String(val).trim()
      .replace(/[\s　]/g, '-')
      .replace(/[０-９]/g, function(ch){ return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); })
      .replace(/[ー–—−]/g, '-')
      .replace(/-+/g, '-');
    return ORDER_ID_RE.test(raw);
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
        tag: opts.freeTag || 'えほんで ひらくよ',
        title: opts.freeTitle || 'えほんの ひみつのことばで ひらくよ',
        body: opts.freeBody || 'タイトルの えほんボタンから ことばを いれてね'
      };
    }
    return {
      tag: opts.appTag || 'アプリで もっと',
      title: opts.appTitle || 'アプリで もっと ふえるよ',
      body: opts.appBody || 'あたらしい あそびを じゅんびしているよ'
    };
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

    var title = document.createElement('div');
    title.style.cssText = 'font-size:1.1rem;font-weight:900;color:#5D4E37;margin-bottom:10px;line-height:1.4';
    title.textContent = opts.title || defaultCopy.title;
    box.appendChild(title);

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
    btn.textContent = 'わかった！';
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
    verifyAdminPassword: verifyAdminPassword,
    // Book Tier Unlock 拡張 (シリアル / Amazon 注文番号 / 絵本クイズ)
    verifySerialCode: verifySerialCode,
    verifyOrderId: verifyOrderId,
    verifyQuizAnswer: verifyQuizAnswer,
    pickRandomQuiz: pickRandomQuiz,
    normalizeAnswer: normalizeAnswer,
    QUIZ_QUESTIONS: QUIZ_QUESTIONS,
    showTierLockPromo: showTierLockPromo,
    showSubscribePromo: showSubscribePromo,
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
    FREE_QUIZLAND_QUESTION_IDS: FREE_QUIZLAND_QUESTION_IDS,
    ALL_BENTO_FOOD_NAMES: ALL_BENTO_FOOD_NAMES,
    BOOK_BENTO_FOOD_NAMES: BOOK_BENTO_FOOD_NAMES,
    FREE_BENTO_FOOD_NAMES: FREE_BENTO_FOOD_NAMES
  };
})();
