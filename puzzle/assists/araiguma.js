// PonoAssist: アライグマ「ぴかっとおてつだい」(One-shot Auto-Snap)
// =============================================================================
// パートナー 'araiguma' を選択中のときだけ動作する特技ボタン型アシスト。
//
// 旧仕様「いろわけトレイ」(ピース下部に色帯を作って待機させる) は子供に伝わら
// なかったため全廃。代わりに**ワンショット式のおてつだいボタン**を画面右下に
// 出して、押すたびに未スナップピースの一部をランダムに自動スナップする
// シンプルな「お助けスキル」型に再設計した。
//
// 仕様:
//   なかよし Lv1 (or 未プレイ Lv0): 1ステージ につき 1回 / スナップ率 5%
//   なかよし Lv2:                    1ステージ につき 2回 / スナップ率 12%
//   なかよし Lv3:                    1ステージ につき 2回 / スナップ率 20%
//                                    (Lv3 はピース間スナップ間隔も短くする)
//   最低1個は必ず助ける (Math.max(1, Math.floor(unsnapped * pct)))
//
//   ボタン押下 → 未スナップピースから N 個ランダム選出 → 順番に
//     (1) ピース上に「ぴかっ」グロー演出 (0.30秒 / Lv3 のみ 0.18秒)
//     (2) アライグマ絵文字 🦝 がピースの隣に一瞬出現
//     (3) window.PonoPuzzleForceSnapPiece(piece) で強制スナップ
//         (= ホーム位置に瞬時に戻る + snappedCount++ + playSnapSound + 完了判定)
//   ボタンには「のこり N かい」表示。 残 0 で grayscale + tap 無効。
//   ステージ切替 (beforeStageStart) で使用回数をリセット。
//   ボタンは afterStageReady で出現、 アライグマ選択時のみ表示。
//
// 連携:
//   既存 drag / snap フローは触らない。 ボタンクリック時のみ強制スナップ。
//   main.js 側に追加した
//     window.PonoPuzzleForceSnapPiece(piece)   — 距離無視でスナップ確定
//     window.PonoPuzzleGetUnsnappedPieces()    — 未スナップピース列挙
//     window.PonoPuzzleRequestRedraw()         — overlay 即時再描画
//   を利用する。 これらが無い古い main.js では graceful にスキップ。
//
// 依存:
//   window.PonoAssistRegister
//   window.PonoBond.getLevel(partnerId, stageId)
//   window.PonoPuzzleForceSnapPiece / GetUnsnappedPieces / RequestRedraw
//   ctx.canvas / ctx.pieceSize / ctx.pieces (drawOverlay context)
// =============================================================================
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof window.PonoAssistRegister !== 'function') {
    return;
  }

  var PARTNER_ID = 'araiguma';
  var BTN_ID = 'pono-araiguma-btn';

  // Lv 別パラメータ
  //   uses  : 1ステージあたりの使用可能回数
  //   pct   : 押下 1 回で助けるピース割合 (未スナップピース数に対して)
  //   stepMs: 各ピース演出の間隔 (Lv3 は短く・テンポ良く)
  var LV_PROFILES = {
    1: { uses: 1, pct: 0.05, stepMs: 320 },
    2: { uses: 2, pct: 0.12, stepMs: 280 },
    3: { uses: 2, pct: 0.20, stepMs: 180 },
  };
  // Lv0 (なかよし度ゼロ) は Lv1 と同じ扱い (最低限の救済を必ず提供)
  function profileFor(lv) {
    if (lv >= 3) return LV_PROFILES[3];
    if (lv >= 2) return LV_PROFILES[2];
    return LV_PROFILES[1];
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  var state = {
    active: false,           // アライグマ選択中 + 環境 OK
    stageId: null,
    usesLeft: 0,
    profile: LV_PROFILES[1],
    // overlay 演出用キュー: 残った "光らせ中" のピース描画情報
    // [{ piece, untilTs, peakTs }]
    glowQueue: [],
    // 演出中フラグ (連打防止)
    busy: false,
    // 最新の overlay 描画コンテキスト保持 (canvas size / ctx)
    lastDrawCtx: null,
  };

  // ---------------------------------------------------------------------------
  // Bond Lv 取得
  // ---------------------------------------------------------------------------
  function resolveLevel(stage) {
    try {
      if (!stage) return 0;
      var sid = stage.id != null ? stage.id : null;
      if (sid == null) return 0;
      if (window.PonoBond && typeof window.PonoBond.getLevel === 'function') {
        var lv = window.PonoBond.getLevel(PARTNER_ID, sid) || 0;
        if (lv < 0) lv = 0;
        if (lv > 3) lv = 3;
        return lv;
      }
    } catch (_) {}
    return 0;
  }

  function isAraiguma(partner) {
    if (partner && partner.id === PARTNER_ID) return true;
    try {
      if (window.PonoBond && typeof window.PonoBond.getSelectedPartner === 'function') {
        return window.PonoBond.getSelectedPartner() === PARTNER_ID;
      }
    } catch (_) {}
    return false;
  }

  // ---------------------------------------------------------------------------
  // 「プレイ可能状態か?」判定 (Phase 4 修正)
  // ---------------------------------------------------------------------------
  // 実機FB: タイトル画面でアライグマボタンが見えてしまうバグの根本対応。
  // パートナーが araiguma で active=true でも、 以下のいずれかが真ならボタンは隠す:
  //   - タイトル画面 (#title-screen) が表示中 (hidden クラス無し)
  //   - オープニングカットシーン (#puzzle-opening) が表示中
  //   - パートナー選択モーダル (#pono-pselect-root) が DOM に存在
  //   - スクリーン上で prestart オーバーレイが出ている (puzzle-container.prestart-on)
  //   - 散布アニメ進行中 (puzzle-container.scatter-on)
  //   - クリア後の success-modal が表示中
  // main.js から expose されてない状態は document.body.classList / DOM プレゼンスで
  // 直接判定する (DOM 状態を信頼境界として参照)。
  function isPlayActive() {
    try {
      var title = document.getElementById('title-screen');
      if (title && !title.classList.contains('hidden')) return false;

      var opening = document.getElementById('puzzle-opening');
      if (opening && !opening.classList.contains('hidden')) return false;

      // パートナー選択モーダルが開いている間は不可
      if (document.getElementById('pono-pselect-root')) return false;

      var container = document.getElementById('puzzle-container');
      if (container) {
        if (container.classList.contains('prestart-on')) return false;
        if (container.classList.contains('scatter-on')) return false;
      } else {
        // puzzle-container が未生成ならまだプレイに入っていない
        return false;
      }

      var success = document.getElementById('success-modal');
      if (success && !success.classList.contains('hidden')) return false;
    } catch (_) {
      // DOM 取得失敗時は安全側 (非表示) に倒す
      return false;
    }
    return true;
  }

  // 「ボタンを表示してよいか?」 — state.active かつ isPlayActive かつ usesLeft>0
  function shouldShowButton() {
    if (!state.active) return false;
    if (state.usesLeft <= 0) return false;
    if (!isPlayActive()) return false;
    return true;
  }

  // ---------------------------------------------------------------------------
  // CSS injection (1 回だけ)
  // ---------------------------------------------------------------------------
  var cssInjected = false;
  function ensureCss() {
    if (cssInjected) return;
    cssInjected = true;
    // 設計メモ (Phase 3c 修正):
    //   ユーザー実機FB「アライグマの能力ボタンが見えない」を根本対応するため、
    //     (a) z-index を 9999 に引き上げ (success-modal / cutin / partner-select
    //         / どのオーバーレイよりも前面)
    //     (b) bond-badge (bottom:14 + 高さ~52) の上 10px に確実に配置
    //         → desktop: bottom = 14 + 52 + 10 = 76px
    //         → mobile : bottom = 10 + 44 + 10 = 64px
    //     (c) 最小タップ領域 64x64px を保証 (min-width / min-height)
    //     (d) ラベルを「🦝 ぴかっと のこり N」の 1 行構成に変更し
    //         可視性とタップ面積を確保
    var css =
      '#' + BTN_ID + '{' +
        'position:fixed;' +
        'right:14px;' +
        'bottom:76px;' +              // bond-badge (bottom:14, height~52) の上 10px
        'z-index:9999;' +             // どのオーバーレイ (cutin z=400 等) よりも前面
        'display:flex;' +
        'align-items:center;' +
        'justify-content:center;' +
        'gap:8px;' +
        'min-width:64px;' +
        'min-height:64px;' +
        'padding:10px 18px;' +
        'border:3px solid #FFFFFF;' + // 高コントラスト白枠で背景に埋もれない
        'border-radius:999px;' +
        'background:linear-gradient(135deg,#F7C948 0%,#F2915A 100%);' +
        'color:#5D3A00;' +
        'font-family:"Zen Maru Gothic","Hiragino Maru Gothic Pro",sans-serif;' +
        'font-weight:700;' +
        'font-size:16px;' +
        'line-height:1.1;' +
        'box-shadow:0 6px 16px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.6);' +
        'cursor:pointer;' +
        '-webkit-tap-highlight-color:transparent;' +
        'transition:transform .12s ease, filter .25s ease;' +
        'touch-action:manipulation;' +
        'user-select:none;' +
        '-webkit-user-select:none;' +
      '}' +
      '#' + BTN_ID + '.hidden{display:none!important;}' +
      '#' + BTN_ID + ':active{transform:scale(0.95);}' +
      '#' + BTN_ID + '.disabled{' +
        'filter:grayscale(1) brightness(0.85);' +
        'cursor:not-allowed;' +
        'pointer-events:none;' +
        'opacity:0.7;' +
      '}' +
      '#' + BTN_ID + ' .pono-araiguma-btn__icon{font-size:26px;line-height:1;}' +
      '#' + BTN_ID + ' .pono-araiguma-btn__label{display:flex;flex-direction:row;align-items:center;gap:6px;line-height:1.1;white-space:nowrap;}' +
      '#' + BTN_ID + ' .pono-araiguma-btn__title{font-size:15px;letter-spacing:0.02em;}' +
      '#' + BTN_ID + ' .pono-araiguma-btn__count{font-size:13px;color:#5D3A00;opacity:0.9;font-weight:700;}' +
      '@media (max-width:480px){' +
        '#' + BTN_ID + '{bottom:64px;right:10px;padding:8px 14px;font-size:14px;min-width:64px;min-height:64px;}' +
        '#' + BTN_ID + ' .pono-araiguma-btn__icon{font-size:22px;}' +
        '#' + BTN_ID + ' .pono-araiguma-btn__title{font-size:13px;}' +
        '#' + BTN_ID + ' .pono-araiguma-btn__count{font-size:12px;}' +
      '}' +
      '@keyframes ponoAraigumaPulse{' +
        '0%{box-shadow:0 4px 12px rgba(93,78,55,0.28),0 0 0 0 rgba(247,201,72,0.7);}' +
        '70%{box-shadow:0 4px 12px rgba(93,78,55,0.28),0 0 0 12px rgba(247,201,72,0);}' +
        '100%{box-shadow:0 4px 12px rgba(93,78,55,0.28),0 0 0 0 rgba(247,201,72,0);}' +
      '}' +
      '#' + BTN_ID + '.pulse{animation:ponoAraigumaPulse 1.6s ease-out infinite;}';
    try {
      var tag = document.createElement('style');
      tag.setAttribute('data-pono-araiguma', '1');
      tag.appendChild(document.createTextNode(css));
      document.head.appendChild(tag);
    } catch (_) {}
  }

  // ---------------------------------------------------------------------------
  // Button DOM
  // ---------------------------------------------------------------------------
  // NOTE (high finding 修正 / 設計メモ):
  //   main.js は initPuzzle で puzzleContainer.innerHTML = '' して全子要素を破棄する。
  //   この button は document.body 直下に append しているため innerHTML='' の影響は
  //   受けないが、 ensureButton() は呼ばれる度に document.getElementById で取り直し
  //   キャッシュしない設計にしてある (= 万一外部から remove されても自己復旧する)。
  //   将来的に何があっても「ステージ間で生き残った button 参照を信用しない」方針。
  function ensureButton() {
    var btn = document.getElementById(BTN_ID);
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.className = 'hidden';
    btn.setAttribute('aria-label', 'ぴかっとおてつだい');
    // ★ canonical state.usesLeft の DOM ミラー (high finding 修正 / 防御的検証用)。
    //   onButtonClick 内で state.usesLeft とこの data-uses-left の両方を検証し、
    //   仮に DevTools で textContent を書き換えられても実回数を超えるスナップは起きない。
    btn.setAttribute('data-uses-left', '0');
    // ラベルは「🦝 ぴかっと のこり N」を 1 行で表示 (タップ面積と可視性確保)
    btn.innerHTML =
      '<span class="pono-araiguma-btn__icon" aria-hidden="true">🦝</span>' +
      '<span class="pono-araiguma-btn__label">' +
        '<span class="pono-araiguma-btn__title">ぴかっと</span>' +
        '<span class="pono-araiguma-btn__count">のこり0</span>' +
      '</span>';
    btn.addEventListener('click', onButtonClick);
    // pointer 系: タッチ環境でも素早く反応
    btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    try { document.body.appendChild(btn); } catch (_) {}
    return btn;
  }

  function updateButtonUI() {
    var btn = document.getElementById(BTN_ID);
    if (!btn) return;
    // Phase 4 修正: タイトル / オープニング / partner-select / prestart / scatter /
    //   success-modal 表示中は state.active でも強制的に隠す。
    if (!shouldShowButton()) {
      btn.classList.add('hidden');
      btn.classList.remove('pulse');
      // 非表示時もミラー属性は canonical state と同期
      try { btn.setAttribute('data-uses-left', String(state.usesLeft || 0)); } catch (_) {}
      return;
    }
    btn.classList.remove('hidden');
    var countEl = btn.querySelector('.pono-araiguma-btn__count');
    if (countEl) countEl.textContent = 'のこり' + state.usesLeft;
    // ★ canonical state を data-uses-left にミラー (high finding 修正)。
    //   onButtonClick は state.usesLeft (closure) と data-uses-left (DOM) の両方を
    //   見て、 一致しなければ DOM 改ざんとみなして強制リジェクトする。
    try { btn.setAttribute('data-uses-left', String(state.usesLeft)); } catch (_) {}
    if (state.usesLeft <= 0 || state.busy) {
      btn.classList.add('disabled');
      btn.classList.remove('pulse');
    } else {
      btn.classList.remove('disabled');
      btn.classList.add('pulse');
    }
  }

  // ---------------------------------------------------------------------------
  // Click handler — 自動スナップ実行
  // ---------------------------------------------------------------------------
  function onButtonClick(e) {
    if (e) { try { e.preventDefault(); e.stopPropagation(); } catch (_) {} }
    if (!state.active || state.busy || state.usesLeft <= 0) return;
    // Phase 4 修正: 念のためタイトル/オープニング/partner-select/prestart/scatter 中の
    //   誤発火を最終ゲートで遮断 (タイミング上 button が一瞬見えてしまった場合の保険)
    if (!isPlayActive()) {
      updateButtonUI();
      return;
    }

    // ★ DOM 改ざん検知 (high finding 修正 / 多層防御):
    //   data-uses-left は updateButtonUI で常に state.usesLeft と同期している。
    //   万一 DevTools 等から残回数表示や属性が書き換えられても、 closure 上の
    //   canonical state.usesLeft とミラー DOM 値が食い違ったらリジェクトする。
    //   (closure 値が常に正なので機能的な悪用は元々不可能だが、 完了モーダルや
    //    なかよし加算がアシスト発火経由なので明示的なゲートを入れて将来の
    //    レイヤリング変更でも安全に倒れるようにする)
    try {
      var btn = document.getElementById(BTN_ID);
      if (btn) {
        var domUses = parseInt(btn.getAttribute('data-uses-left') || '0', 10);
        if (!isFinite(domUses) || domUses !== state.usesLeft) {
          try { console.warn('[araiguma] data-uses-left mismatch — reset & ignore'); } catch (_) {}
          updateButtonUI(); // canonical state で DOM を強制再同期
          return;
        }
      }
    } catch (_) { /* DOM 取得失敗時は closure 検証だけ通す */ }

    // main.js に強制スナップ API があるか確認 (古い main.js 互換性)
    if (typeof window.PonoPuzzleForceSnapPiece !== 'function' ||
        typeof window.PonoPuzzleGetUnsnappedPieces !== 'function') {
      try { console.warn('[araiguma] PonoPuzzleForceSnapPiece API missing — assist disabled'); } catch (_) {}
      state.active = false;
      updateButtonUI();
      return;
    }

    var unsnapped = window.PonoPuzzleGetUnsnappedPieces() || [];
    if (unsnapped.length === 0) return; // 全部はまってるなら何もしない

    var pct = state.profile.pct;
    var pickCount = Math.max(1, Math.floor(unsnapped.length * pct));
    // 残り少ないケースで割合計算が unsnapped 上回らないようクランプ
    if (pickCount > unsnapped.length) pickCount = unsnapped.length;

    // ランダム選択 (Fisher-Yates の先頭 pickCount 個)
    var pool = unsnapped.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    var picked = pool.slice(0, pickCount);

    try {
      if (typeof window.PonoPartnerAbilityCutin === 'function') {
        window.PonoPartnerAbilityCutin(PARTNER_ID, { label: 'ぴかっと!' });
      }
    } catch (_) {}

    state.usesLeft--;
    state.busy = true;
    updateButtonUI();

    var stepMs = state.profile.stepMs;
    picked.forEach(function (piece, idx) {
      setTimeout(function () {
        runSnapEffect(piece, stepMs);
        // 演出開始と同じタイミングで強制スナップ確定
        // (見た目: ピースの現在位置で「ぴかっ」と光る → 一瞬でホーム位置にスナップ)
        try {
          window.PonoPuzzleForceSnapPiece(piece);
        } catch (err) {
          try { console.warn('[araiguma] forceSnap failed:', err); } catch (_) {}
        }
      }, idx * stepMs);
    });

    // 全演出完了後に busy 解除
    setTimeout(function () {
      state.busy = false;
      updateButtonUI();
    }, picked.length * stepMs + 200);
  }

  // ---------------------------------------------------------------------------
  // Glow effect — 選ばれたピースのホーム位置に光リング
  // ---------------------------------------------------------------------------
  function runSnapEffect(piece, stepMs) {
    if (!piece) return;
    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    // glow 持続は stepMs の 1.4 倍 (次のピースとちょっと重なる)
    var dur = Math.max(220, Math.floor(stepMs * 1.4));
    state.glowQueue.push({
      piece: piece,
      startTs: now,
      endTs: now + dur,
      peakTs: now + dur * 0.35,
    });
    // overlay を即時再描画して光らせ始める
    if (typeof window.PonoPuzzleRequestRedraw === 'function') {
      try { window.PonoPuzzleRequestRedraw(); } catch (_) {}
    }
  }

  // ---------------------------------------------------------------------------
  // Visibility watchers (Phase 4 修正)
  // ---------------------------------------------------------------------------
  // タイトル / オープニング / partner-select / prestart / scatter / success-modal の
  // 表示状態は main.js から直接通知されないため、 (a) MutationObserver で body と
  // puzzle-container の DOM/class 変化を監視しつつ、 (b) 250ms ポーリングで保険を
  // 掛けて、 ボタン表示を自動で再評価する。 state.active=false の間は停止する。
  var _mo = null;
  var _poll = null;
  function startWatchers() {
    stopWatchers();
    try {
      if (typeof MutationObserver === 'function') {
        _mo = new MutationObserver(function () { updateButtonUI(); });
        var targets = [document.body];
        var pc = document.getElementById('puzzle-container');
        if (pc) targets.push(pc);
        var ts = document.getElementById('title-screen');
        if (ts) targets.push(ts);
        var po = document.getElementById('puzzle-opening');
        if (po) targets.push(po);
        var sm = document.getElementById('success-modal');
        if (sm) targets.push(sm);
        targets.forEach(function (t) {
          try {
            _mo.observe(t, { attributes: true, attributeFilter: ['class'], childList: (t === document.body) });
          } catch (_) {}
        });
      }
    } catch (_) {}
    try {
      _poll = setInterval(function () { updateButtonUI(); }, 250);
    } catch (_) {}
  }
  function stopWatchers() {
    if (_mo) { try { _mo.disconnect(); } catch (_) {} _mo = null; }
    if (_poll) { try { clearInterval(_poll); } catch (_) {} _poll = null; }
  }

  // ---------------------------------------------------------------------------
  // Hook: afterStageReady — ボタン表示 + 回数リセット
  // ---------------------------------------------------------------------------
  window.PonoAssistRegister('afterStageReady', function (ctx) {
    state.active = false;
    state.glowQueue = [];
    state.busy = false;
    if (!isAraiguma(ctx && ctx.partner)) {
      stopWatchers();
      updateButtonUI();
      return;
    }
    ensureCss();
    ensureButton();

    var stage = ctx && ctx.stage;
    if (!stage) {
      stopWatchers();
      updateButtonUI();
      return;
    }
    state.stageId = stage.id != null ? stage.id : null;

    var lv = resolveLevel(stage);
    state.profile = profileFor(lv);
    state.usesLeft = state.profile.uses;
    state.active = true;
    // Phase 4 修正: タイトル/オープニング/prestart/scatter 等の表示状態を継続監視し
    //   isPlayActive 切り替わりに追随してボタンを出し入れする。
    startWatchers();
    updateButtonUI();
  });

  // ---------------------------------------------------------------------------
  // Hook: beforeStageStart — ボタン隠す & クリア
  // ---------------------------------------------------------------------------
  window.PonoAssistRegister('beforeStageStart', function (ctx) {
    state.active = false;
    state.glowQueue = [];
    state.busy = false;
    state.usesLeft = 0;
    state.stageId = null;
    // active=false の間は watcher を止める (無駄なポーリング/MutationObserver を防ぐ)
    stopWatchers();
    updateButtonUI();
  });

  // ---------------------------------------------------------------------------
  // Hook: afterSnap — 全部はまったら自動でボタン無効化
  // ---------------------------------------------------------------------------
  window.PonoAssistRegister('afterSnap', function (ctx) {
    if (!state.active) return;
    if (!isAraiguma(ctx && ctx.partner)) return;
    // 完全クリアでボタン無効
    if (ctx && ctx.snappedCount >= ctx.total) {
      state.usesLeft = 0;
      updateButtonUI();
    }
  });

  // ---------------------------------------------------------------------------
  // Hook: drawOverlay — 光リング + アライグマアイコン
  // ---------------------------------------------------------------------------
  window.PonoAssistRegister('drawOverlay', function (ctx) {
    if (!state.active) {
      // 残った glow も非アクティブ時はクリア
      if (state.glowQueue.length) state.glowQueue = [];
      return;
    }
    if (!isAraiguma(ctx && ctx.partner)) return;
    if (!ctx || !ctx.ctx || !ctx.pieceSize) return;
    var queue = state.glowQueue;
    if (!queue || queue.length === 0) return;

    var c2d = ctx.ctx;
    var pw = ctx.pieceSize.w;
    var ph = ctx.pieceSize.h;
    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    // queue を歩いて期限切れを除去 + 描画
    var nextQueue = [];
    var hasLive = false;
    for (var i = 0; i < queue.length; i++) {
      var item = queue[i];
      if (!item || !item.piece) continue;
      if (now >= item.endTs) continue; // 期限切れ
      hasLive = true;
      nextQueue.push(item);

      // 進捗 0〜1
      var t = (now - item.startTs) / Math.max(1, item.endTs - item.startTs);
      if (t < 0) t = 0; else if (t > 1) t = 1;
      // 0 →peak で立ち上がり→ 1 で消える 形状 (sin)
      var alpha = Math.sin(t * Math.PI); // 0..1..0
      if (alpha <= 0.01) continue;

      // ピースの中心 (snap 後はホーム位置にいる)
      var piece = item.piece;
      var cx = piece.x + pw / 2;
      var cy = piece.y + ph / 2;

      // 外側のソフトリング (黄色)
      c2d.save();
      c2d.globalAlpha = 0.85 * alpha;
      var ringR = Math.max(pw, ph) * (0.55 + 0.35 * t); // 広がりつつ
      var grad;
      try {
        grad = c2d.createRadialGradient(cx, cy, ringR * 0.15, cx, cy, ringR);
        grad.addColorStop(0, 'rgba(255,245,180,0.95)');
        grad.addColorStop(0.55, 'rgba(247,201,72,0.55)');
        grad.addColorStop(1, 'rgba(247,201,72,0)');
        c2d.fillStyle = grad;
      } catch (_) {
        c2d.fillStyle = 'rgba(247,201,72,0.5)';
      }
      c2d.beginPath();
      c2d.arc(cx, cy, ringR, 0, Math.PI * 2);
      c2d.fill();
      c2d.restore();

      // 中央のシャープな白光 (ぴかっ)
      c2d.save();
      c2d.globalAlpha = 0.9 * alpha;
      var coreR = Math.max(pw, ph) * 0.22 * (0.8 + 0.4 * Math.sin(t * Math.PI));
      c2d.fillStyle = '#FFFFFF';
      c2d.beginPath();
      c2d.arc(cx, cy, coreR, 0, Math.PI * 2);
      c2d.fill();
      c2d.restore();

      // ピース輪郭を黄金で縁取り (どのピースが助けられたか分かる)
      c2d.save();
      c2d.globalAlpha = 0.9 * alpha;
      c2d.strokeStyle = '#F7C948';
      c2d.lineWidth = Math.max(3, pw * 0.08);
      c2d.beginPath();
      c2d.rect(piece.x + 2, piece.y + 2, pw - 4, ph - 4);
      c2d.stroke();
      c2d.restore();

      // アライグマ絵文字 🦝 をピース右上に配置 (フェード)
      c2d.save();
      c2d.globalAlpha = alpha;
      var emojiSize = Math.max(20, Math.floor(Math.min(pw, ph) * 0.55));
      c2d.font = emojiSize + 'px serif';
      c2d.textAlign = 'center';
      c2d.textBaseline = 'middle';
      // 影 (読みやすさのため)
      c2d.fillStyle = 'rgba(0,0,0,0.35)';
      c2d.fillText('🦝', cx + 2, cy - ph * 0.5 + 2);
      c2d.fillStyle = '#FFFFFF';
      c2d.fillText('🦝', cx, cy - ph * 0.5);
      c2d.restore();
    }
    state.glowQueue = nextQueue;

    // まだ生きてる演出があるなら次フレームも描画要求
    if (hasLive && typeof ctx.requestRedraw === 'function') {
      try { ctx.requestRedraw(); } catch (_) {}
    }
  });
})();
