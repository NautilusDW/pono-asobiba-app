/* ============================================================
   common/tier.js  (Phase 3: 3階層の深さ制限)

   ユーザー層判定と、絵本購入者向けの "幅8割解放＋深さ制限" の中央化。

   公開API (window.PonoTier):
     - getTier()                           → 'free' | 'book' | 'sub'
     - isFree() / isBook() / isSub()       簡易判定
     - isAquariumCreatureUnlocked(id)      海の生き物が解放されているか
     - isRoomItemUnlocked(id, cat)         家具/かざりが解放されているか
     - isKatakanaUnlocked()                カタカナ編が解放されているか
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

  // ---- tier 判定 ----
  function getTier() {
    try {
      if (localStorage.getItem('pono_sub_active') === '1') return 'sub';
      if (localStorage.getItem('pono_premium')    === '1') return 'book';
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

  // ---- サブスク誘導モーダル ("伸びしろ" の見せ方) ----
  // opts: { title, body, onClose }
  function showSubscribePromo(opts) {
    opts = opts || {};
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
    tag.textContent = 'まいつき ふえていくよ';
    box.appendChild(tag);

    var title = document.createElement('div');
    title.style.cssText = 'font-size:1.1rem;font-weight:900;color:#5D4E37;margin-bottom:10px;line-height:1.4';
    title.textContent = opts.title || 'もっと たくさん あるよ！';
    box.appendChild(title);

    var body = document.createElement('div');
    body.style.cssText = 'font-size:0.92rem;font-weight:700;color:#5D4E37;line-height:1.6;margin-bottom:16px';
    body.textContent = opts.body || 'サブスクで あたらしい なかまが まいつき ふえていくよ！';
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
    isFree: isFree,
    isBook: isBook,
    isSub:  isSub,
    isAquariumCreatureUnlocked: isAquariumCreatureUnlocked,
    isRoomItemUnlocked: isRoomItemUnlocked,
    isKatakanaUnlocked: isKatakanaUnlocked,
    showSubscribePromo: showSubscribePromo,
    BOOK_AQUARIUM_CREATURE_IDS: BOOK_AQUARIUM_CREATURE_IDS,
    BOOK_ROOM_ITEM_IDS:         BOOK_ROOM_ITEM_IDS
  };
})();
