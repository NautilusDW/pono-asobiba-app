/* ============================================================
   common/promo.js  (Phase 1: 無料ユーザー向けプロモ表示)

   public API (window.PonoPromo):
     - showStoryboard(scenes, onDone)  紙芝居エンジン (writing から移植)
     - showShortOpening(onDone)        無料ユーザー向け短縮オープニング
     - showLockedPreview(cardId, onClose) カードタップ時プロモモーダル
     - shouldBlockFree(cardId)         無料ユーザーかつロック済みカードか
     - makePlaceholderImage(text, bg)  スクショ未貼付時のダミー画像
     - SHORT_OPENING_SCENES            短縮版シーン定義
     - GAME_PREVIEWS                   プレビュー情報（cardId で参照）

   Phase 2 で common/tier.js に分離する前提で、shouldBlockFree は単独関数。
   pono_premium !== '1' を「無料ユーザー」として扱う（暫定）。
   ============================================================ */
(function() {
  'use strict';

  // ---- ロック対象のカード ID（play.html L2024 lockedCards と同期） ----
  var LOCKED_CARD_IDS = [
    'card-writing',
    'card-drawing',
    'card-bowling',
    'card-breakout',
    'card-slide'
  ];

  // ---- プレビュー情報: 各ロック済みカードのスクショ + キャッチコピー ----
  // image: assets/images/previews/*.png が貼られたらそれを優先、
  //        無ければ makePlaceholderImage のダミーが自動 fallback。
  var GAME_PREVIEWS = [
    { id: 'card-writing',  title: 'もじかきクエスト',
      images: [
        '../assets/images/previews/writing_1.png',
        '../assets/images/previews/writing_2.png',
        '../assets/images/previews/writing_3.png'
      ],
      body: 'ゆうしゃに なって、もじを かいて まおうを たおそう！',
      color: '#F2915A' },
    { id: 'card-drawing',  title: 'おえかき',
      images: [
        '../assets/images/previews/drawing_1.png',
        '../assets/images/previews/drawing_2.png'
      ],
      body: 'じぶんで かいた え を、うみで およがせられるよ🐠',
      color: '#60A5FA' },
    { id: 'card-slide',    title: 'みちつなぎ',
      images: [
        '../assets/images/previews/slide_1.png',
        '../assets/images/previews/slide_2.png'
      ],
      body: 'みちを つないで、ポノが おかあさんに あいに いくよ。',
      color: '#34D399' },
    { id: 'card-bowling',  title: 'ボウリング',
      images: [
        '../assets/images/previews/bowling_1.png',
        '../assets/images/previews/bowling_2.png'
      ],
      body: 'フリックで ピンを たおそう！',
      color: '#F59E0B' },
    { id: 'card-breakout', title: 'ブロックくずし',
      images: [
        '../assets/images/previews/breakout_1.png',
        '../assets/images/previews/breakout_2.png'
      ],
      body: 'ボールで ブロックを ぜんぶ くずしてみよう。',
      color: '#A78BFA' }
  ];

  // ---- prefix を付けた画像パスに解決（play.html と writing/index.html で相対深さが違う） ----
  // play.html 直下からは assets/... なので prefix 無し、writing/index.html (サブディレクトリ) からは
  // ../assets/... となる。ここでは現在のロケーションから自動判定。
  function resolveAssetPath(path) {
    if (!path) return path;
    // 既に http:// / data: / 絶対パス (/) はそのまま
    if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('/')) return path;
    // 相対パス: ページが writing/ など1階層下にあるときは '../' を付ける
    var depth = (window.location.pathname.match(/\/[^\/]+\//g) || []).length - 1;
    if (depth <= 0) {
      // play.html 等 (root)
      return path.replace(/^\.\.\//, '');
    }
    // 1階層下 (writing/index.html 等): ../ を付加 (既に ../ で始まる場合は維持)
    return path.startsWith('../') ? path : '../' + path;
  }

  // ---- ユーザー層判定（Phase 2 で tier.js に分離） ----
  function isFree() {
    try { return localStorage.getItem('pono_premium') !== '1'; }
    catch (e) { return true; }
  }
  function shouldBlockFree(cardId) {
    if (!cardId) return false;
    return isFree() && LOCKED_CARD_IDS.indexOf(cardId) >= 0;
  }

  // ---- Canvas でダミースクショ画像を生成（素材未貼付時の fallback） ----
  function makePlaceholderImage(text, bgColor) {
    try {
      var cvs = document.createElement('canvas');
      cvs.width = 800; cvs.height = 600;
      var ctx = cvs.getContext('2d');
      // 背景グラデーション
      var grad = ctx.createLinearGradient(0, 0, 800, 600);
      grad.addColorStop(0, bgColor || '#60A5FA');
      grad.addColorStop(1, shadeColor(bgColor || '#60A5FA', -25));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 600);
      // 白縁
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 786, 586);
      // 主タイトル
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 68px "Zen Maru Gothic", sans-serif';
      ctx.fillText(text || 'あそびば', 400, 270);
      // サブ
      ctx.font = 'bold 28px "Zen Maru Gothic", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('スクショ じゅんびちゅう', 400, 350);
      return cvs.toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }

  // 色を明度調整（±%）
  function shadeColor(hex, percent) {
    try {
      var n = hex.replace('#','');
      if (n.length === 3) n = n.split('').map(function(c){return c+c;}).join('');
      var r = parseInt(n.substr(0,2),16), g = parseInt(n.substr(2,2),16), b = parseInt(n.substr(4,2),16);
      var f = (percent < 0) ? 0 : 255;
      var p = Math.abs(percent) / 100;
      r = Math.round((f - r) * p) + r;
      g = Math.round((f - g) * p) + g;
      b = Math.round((f - b) * p) + b;
      return '#' + [r,g,b].map(function(v){return ('0'+v.toString(16)).slice(-2);}).join('');
    } catch (e) { return hex; }
  }

  // ---- 紙芝居エンジン（writing/index.html の _showStoryboard から移植） ----
  function showStoryboard(scenes, onDone) {
    if (!scenes || !scenes.length) { if (onDone) onDone(); return; }
    // 再入防止: 既にオーバーレイが生きているなら何もしない
    if (document.querySelector('.storyboard-overlay')) { if (onDone) onDone(); return; }

    var ov = document.createElement('div');
    ov.className = 'storyboard-overlay';
    document.body.appendChild(ov);

    var art = document.createElement('div');
    art.className = 'storyboard-art';
    ov.appendChild(art);

    var txt = document.createElement('div');
    txt.className = 'storyboard-text';
    ov.appendChild(txt);

    var txtInner = document.createElement('span');
    txtInner.className = 'storyboard-text-inner';
    txt.appendChild(txtInner);

    var hint = document.createElement('div');
    hint.className = 'storyboard-hint';
    hint.textContent = '▼';
    txt.appendChild(hint);

    var idx = 0;
    var pages = [];
    var pageIdx = 0;
    var transitioning = false;
    var typeTimer = null;
    var typingDone = true;

    function escapeHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function splitPages(text) {
      text = text || '';
      var pagesArr;
      if (text.indexOf('\n\n') >= 0) {
        pagesArr = text.split('\n\n').map(function(p) { return p.split('\n').slice(0, 2); });
      } else {
        var lines = text.split('\n');
        pagesArr = [];
        for (var i = 0; i < lines.length; i += 2) {
          pagesArr.push(lines.slice(i, i + 2));
        }
      }
      return pagesArr.filter(function(p) { return p.length > 0 && p.some(function(l){ return l.length>0; }); });
    }
    function startTypewriter(pageLines) {
      if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
      typingDone = false;
      hint.classList.remove('visible');
      var nLines = Math.max(1, pageLines.length);
      txt.style.minHeight = 'calc(1.55em * ' + nLines + ' + 12px + 18px)';
      var fullText = pageLines.join('\n');
      var pos = 0;
      txtInner.innerHTML = '';
      function step() {
        typeTimer = null;
        if (pos >= fullText.length) {
          typingDone = true;
          updateHint();
          hint.classList.add('visible');
          return;
        }
        pos++;
        txtInner.innerHTML = escapeHtml(fullText.slice(0, pos)).replace(/\n/g, '<br>');
        var justTyped = fullText.charAt(pos - 1);
        var delay = 52;
        if (justTyped === '\n') delay = 220;
        typeTimer = setTimeout(step, delay);
      }
      step();
    }
    function updateHint() {
      var isLastPage = (pageIdx >= pages.length - 1);
      var isLastScene = (idx >= scenes.length - 1);
      hint.textContent = (isLastPage && isLastScene) ? '▶' : '▼';
    }
    function skipOrAdvance() {
      if (transitioning) return;
      if (!typingDone) {
        if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
        var full = (pages[pageIdx] || []).join('\n');
        txtInner.innerHTML = escapeHtml(full).replace(/\n/g, '<br>');
        typingDone = true;
        updateHint();
        hint.classList.add('visible');
        return;
      }
      if (pageIdx < pages.length - 1) {
        pageIdx++;
        startTypewriter(pages[pageIdx]);
      } else {
        advance();
      }
    }
    function paintScene(i) {
      var s = scenes[i];
      if (s.bg) ov.style.background = s.bg;
      art.innerHTML = '';
      var src = s.image ? resolveAssetPath(s.image) : '';
      if (src) {
        var img = document.createElement('img');
        img.src = src;
        img.alt = '';
        if (s.pan) img.classList.add('sb-pan-' + s.pan);
        img.onerror = function() {
          // fallback: placeholder があれば差し替え、無ければ emoji
          if (s.placeholder) {
            img.onerror = null;
            img.src = s.placeholder;
          } else {
            art.innerHTML = '';
            art.textContent = s.emoji || '';
          }
        };
        art.appendChild(img);
      } else if (s.placeholder) {
        var img2 = document.createElement('img');
        img2.src = s.placeholder;
        img2.alt = '';
        art.appendChild(img2);
      } else {
        art.textContent = s.emoji || '';
      }
      pages = splitPages(s.text || '');
      pageIdx = 0;
      art.classList.remove('sb-out'); txt.classList.remove('sb-out');
      void art.offsetWidth;
      art.classList.add('sb-in'); txt.classList.add('sb-in');
      setTimeout(function() { startTypewriter(pages[0] || ['']); }, 400);
    }
    function advance() {
      if (transitioning) return;
      transitioning = true;
      if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
      idx++;
      if (idx >= scenes.length) {
        art.classList.remove('sb-in');
        txt.classList.remove('sb-in');
        art.classList.add('sb-out');
        txt.classList.add('sb-out');
        ov.style.background = '#000';
        setTimeout(function() {
          art.style.visibility = 'hidden';
          txt.style.visibility = 'hidden';
        }, 500);
        setTimeout(function() {
          if (onDone) { try { onDone(); } catch (e) {} }
        }, 1700);
        setTimeout(function() { ov.classList.add('fade-out'); }, 2000);
        setTimeout(function() { if (ov.parentNode) ov.remove(); }, 2900);
        return;
      }
      art.classList.remove('sb-in'); txt.classList.remove('sb-in');
      art.classList.add('sb-out'); txt.classList.add('sb-out');
      setTimeout(function() {
        paintScene(idx);
        transitioning = false;
      }, 520);
    }

    ov.addEventListener('click', skipOrAdvance);
    paintScene(0);
  }

  // ---- 短縮オープニング（無料ユーザー用プロモ）----
  // 代表3シーン（王国 / ザガン手先 / 勇者召集）+ プレミアムゲーム紹介4枚 = 計7枚。
  // scene.placeholder は画像 404 時の Canvas フォールバック（素材貼付後は自動で実画像優先）。
  var _shortScenesCache = null;
  function buildShortOpeningScenes() {
    if (_shortScenesCache) return _shortScenesCache;
    _shortScenesCache = [
      { bg: '#1a1008',
        image: 'assets/images/story/opening_1.jpg',
        emoji: '🏰',
        text: 'むかし むかし、\nしあわせな おうこく が ありました。' },
      { bg: '#0f0820',
        image: 'assets/images/story/opening_6.jpg',
        emoji: '👺',
        text: 'ある ひ、\nまおう ザガン の てさき が\n\nおひめさま を さらって いった！' },
      { bg: '#0a1026',
        image: 'assets/images/story/opening_10.jpg',
        emoji: '⚔️',
        text: 'そして、 あなた が えらばれた のです。\n\n「ゆうしゃ よ、\nたすけだして くれ！」' },
      // ゲーム紹介（スクショ）— 未貼付時は Canvas ダミー
      { bg: '#2a1a40',
        image: 'assets/images/previews/writing.png',
        placeholder: makePlaceholderImage('もじかきクエスト', '#F2915A'),
        emoji: '✏️',
        text: 'ゆうしゃ の ぼうけん は\n「もじかきクエスト」 で\n\nはじまるよ！' },
      { bg: '#1a2a40',
        image: 'assets/images/previews/drawing.png',
        placeholder: makePlaceholderImage('おえかき', '#60A5FA'),
        emoji: '🎨',
        text: 'じぶん で かいた え が\n「おえかき」 で\nうみを およぐ よ！' },
      { bg: '#2a2a40',
        image: 'assets/images/previews/bowling.png',
        placeholder: makePlaceholderImage('ボウリング', '#F59E0B'),
        emoji: '🎳',
        text: 'ピン を たおして\nあそべる ゲーム も\nたくさん！' },
      { bg: '#1a1a1a',
        image: 'assets/images/pono/pono_face_circle.png',
        placeholder: makePlaceholderImage('またね！', '#34D399'),
        emoji: '🌰',
        text: 'えほん を かった ひと は\nぜんぶ あそべる よ！\n\nまずは むりょう で\nあそんで みてね！' }
    ];
    return _shortScenesCache;
  }

  function showShortOpening(onDone) {
    var scenes = buildShortOpeningScenes();
    showStoryboard(scenes, function() {
      try { localStorage.setItem('pono_intro_seen', '1'); } catch (e) {}
      if (onDone) { try { onDone(); } catch (e) {} }
    });
  }

  // ---- カードタップ時のプロモモーダル（3-5秒 auto-close + タップで即閉じ） ----
  function showLockedPreview(cardId, onClose) {
    // 既に開いていたら無視
    if (document.querySelector('.promo-modal')) return;

    var preview = null;
    for (var i = 0; i < GAME_PREVIEWS.length; i++) {
      if (GAME_PREVIEWS[i].id === cardId) { preview = GAME_PREVIEWS[i]; break; }
    }
    if (!preview) {
      preview = { title: 'ひみつの あそび', body: 'もうすぐ あそべるよ！', color: '#60A5FA' };
    }

    var ov = document.createElement('div');
    ov.className = 'promo-modal';

    var box = document.createElement('div');
    box.className = 'promo-modal-box';

    var tag = document.createElement('div');
    tag.className = 'promo-modal-tag';
    tag.textContent = 'えほんをかったひと だけ';
    box.appendChild(tag);

    var title = document.createElement('div');
    title.className = 'promo-modal-title';
    title.textContent = preview.title || '';
    box.appendChild(title);

    var shot = document.createElement('img');
    shot.className = 'promo-modal-screenshot';
    shot.alt = '';
    var placeholder = makePlaceholderImage(preview.title || '', preview.color || '#60A5FA');
    // images 配列優先 (複数枚スクショ対応)、image 単体 fallback
    var imgList = [];
    if (Array.isArray(preview.images) && preview.images.length > 0) {
      for (var k = 0; k < preview.images.length; k++) {
        imgList.push(resolveAssetPath(preview.images[k]));
      }
    } else if (preview.image) {
      imgList.push(resolveAssetPath(preview.image));
    }
    var imgIdx = 0;
    function _setShot(src) {
      shot.onerror = function() {
        if (placeholder) { shot.onerror = null; shot.src = placeholder; }
      };
      shot.src = src || placeholder;
    }
    _setShot(imgList[0]);
    box.appendChild(shot);

    var caption = document.createElement('div');
    caption.className = 'promo-modal-caption';
    caption.textContent = preview.body || '';
    box.appendChild(caption);

    // 2 枚以上ある場合は 1.8 秒ごとに切替 + インジケータ
    var dotsWrap = null;
    var rotateTimer = null;
    if (imgList.length >= 2) {
      dotsWrap = document.createElement('div');
      dotsWrap.style.cssText = 'display:flex;gap:6px;justify-content:center;margin:6px 0 2px;';
      var dots = [];
      for (var d = 0; d < imgList.length; d++) {
        var dot = document.createElement('span');
        dot.style.cssText = 'width:8px;height:8px;border-radius:50%;'
          + 'background:' + (d === 0 ? '#3B82F6' : '#CBD5E1') + ';'
          + 'transition:background 0.2s;';
        dotsWrap.appendChild(dot);
        dots.push(dot);
      }
      box.appendChild(dotsWrap);
      rotateTimer = setInterval(function() {
        imgIdx = (imgIdx + 1) % imgList.length;
        _setShot(imgList[imgIdx]);
        for (var n = 0; n < dots.length; n++) {
          dots[n].style.background = (n === imgIdx ? '#3B82F6' : '#CBD5E1');
        }
      }, 1800);
    }

    var hint = document.createElement('div');
    hint.className = 'promo-modal-hint';
    hint.textContent = 'ごほうびパック で あそべる ように なるよ';
    box.appendChild(hint);

    var btn = document.createElement('button');
    btn.className = 'promo-modal-close';
    btn.type = 'button';
    btn.textContent = 'わかった！';
    box.appendChild(btn);

    ov.appendChild(box);
    document.body.appendChild(ov);
    // fade-in
    requestAnimationFrame(function() { ov.classList.add('is-visible'); });

    var closed = false;
    var autoTimer = null;
    function close() {
      if (closed) return;
      closed = true;
      if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
      if (rotateTimer) { clearInterval(rotateTimer); rotateTimer = null; }
      ov.classList.remove('is-visible');
      setTimeout(function() {
        if (ov.parentNode) ov.remove();
        if (onClose) { try { onClose(); } catch (e) {} }
      }, 260);
    }
    btn.addEventListener('click', close);
    ov.addEventListener('click', function(e) { if (e.target === ov) close(); });

    // 画像 2 枚以上はローテーションが一周するまで auto-close しない
    var autoCloseMs = imgList.length >= 2 ? (1800 * imgList.length + 1500) : 5000;
    autoTimer = setTimeout(close, autoCloseMs);
  }

  // ---- 絵本層 解錠直後の歓迎モーダル ----
  // lockBtn でパスワードが通った初回のみ呼ばれる (play.html)。
  // 「これから あそべる ゲーム」を列挙して CTA で 'もじかきクエスト' へ誘導する。
  function showBookWelcome(onClose) {
    // 既に開いていたら無視
    if (document.querySelector('.promo-modal.welcome')) return;

    var games = [
      { icon: '📝', name: 'もじかきクエスト', lead: 'まずは ここから！' },
      { icon: '🎨', name: 'おえかき' },
      { icon: '🧩', name: 'みちつなぎ' },
      { icon: '🎳', name: 'ボウリング' },
      { icon: '🧱', name: 'ブロックくずし' }
    ];

    var ov = document.createElement('div');
    ov.className = 'promo-modal welcome';

    var box = document.createElement('div');
    box.className = 'promo-modal-box';

    var tag = document.createElement('div');
    tag.className = 'promo-modal-tag';
    tag.style.background = 'linear-gradient(135deg,#F59E0B,#EF4444)';
    tag.textContent = 'えほんをかったひと だけ';
    box.appendChild(tag);

    var title = document.createElement('div');
    title.className = 'promo-modal-title';
    title.textContent = 'ようこそ！ あたらしい ゲーム が ひらいたよ';
    box.appendChild(title);

    var list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin:12px 0 6px;text-align:left;';
    games.forEach(function(g) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 12px;'
        + 'background:#FFF7ED;border-radius:12px;font-weight:800;color:#5D4E37;'
        + 'font-size:1rem;';
      var ic = document.createElement('span');
      ic.style.cssText = 'font-size:1.5rem;flex:0 0 auto;';
      ic.textContent = g.icon;
      row.appendChild(ic);
      var name = document.createElement('span');
      name.style.cssText = 'flex:1;';
      name.textContent = g.name;
      row.appendChild(name);
      if (g.lead) {
        var lead = document.createElement('span');
        lead.style.cssText = 'font-size:0.75rem;color:#EF4444;font-weight:900;'
          + 'background:#FEF2F2;padding:2px 8px;border-radius:50px;white-space:nowrap;';
        lead.textContent = g.lead;
        row.appendChild(lead);
      }
      list.appendChild(row);
    });
    box.appendChild(list);

    var btn = document.createElement('button');
    btn.className = 'promo-modal-close';
    btn.type = 'button';
    btn.textContent = 'もじかきクエスト から はじめよう！';
    box.appendChild(btn);

    ov.appendChild(box);
    document.body.appendChild(ov);
    requestAnimationFrame(function() { ov.classList.add('is-visible'); });

    var closed = false;
    function close(goWriting) {
      if (closed) return;
      closed = true;
      try { localStorage.setItem('pono_welcome_book_seen', '1'); } catch (e) {}
      ov.classList.remove('is-visible');
      setTimeout(function() {
        if (ov.parentNode) ov.remove();
        if (goWriting) {
          try { window.location.href = 'writing/index.html'; } catch (e) {}
        }
        if (onClose) { try { onClose(); } catch (e) {} }
      }, 260);
    }
    btn.addEventListener('click', function() { close(true); });
    ov.addEventListener('click', function(e) { if (e.target === ov) close(false); });
  }

  // ---- export ----
  window.PonoPromo = {
    showStoryboard: showStoryboard,
    showShortOpening: showShortOpening,
    showLockedPreview: showLockedPreview,
    showBookWelcome: showBookWelcome,
    shouldBlockFree: shouldBlockFree,
    makePlaceholderImage: makePlaceholderImage,
    GAME_PREVIEWS: GAME_PREVIEWS,
    LOCKED_CARD_IDS: LOCKED_CARD_IDS,
    get SHORT_OPENING_SCENES() { return buildShortOpeningScenes(); }
  };
})();
