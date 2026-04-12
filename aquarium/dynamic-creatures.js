// ═══════════════════════════════════════════════════════════════════
// Dynamic Creatures Loader
// ═══════════════════════════════════════════════════════════════════
// assets/data/creatures.json を読み込み、aquarium のメインループ
// （creatures 配列を foreach する update ロジック）と互換性のある
// 生き物オブジェクトを動的に生成する。
//
// 既存の hardcode された 7 体（octopus/jellyfish/turtle/fish/submarine/
// sunfish/shark）はそのまま動作し、ここで追加するのは新規分のみ。
//
// 設計方針:
//   - 既存ループは c.pattern を見て分岐するので、同じプロパティを揃えれば
//     pulseTimer/driftNudgeTimer/panicTimer 等の動きは自動的に走る
//   - normal が複数枚あれば octTexNormal を配列で渡し、既存の animTimer
//     ベースの交互切替が動作する
//   - reactionType も既存の文字列を使えばタップ反応が動く
//
// 公開 API: window.AquariumDynamicCreatures
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var _config = null; // creatures.json の中身
  var _texCache = {}; // creature.id → { surprised, normal: [textures], happy }

  // creatures.json を読み込む（一度だけ）
  function loadConfig(basePath) {
    var url = (basePath || '../') + 'assets/data/creatures.json?_=' + Date.now();
    return fetch(url, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { creatures: [] }; })
      .then(function (data) {
        _config = data && data.creatures ? data : { creatures: [] };
        return _config;
      })
      .catch(function (e) {
        console.warn('[dynamic-creatures] failed to load creatures.json:', e);
        _config = { creatures: [] };
        return _config;
      });
  }

  // PIXI.Texture を 1 枚読み込む（valid 待ち）
  function _loadTex(path) {
    return new Promise(function (resolve) {
      try {
        var tex = PIXI.Texture.from(path);
        if (tex.baseTexture.valid) { resolve(tex); return; }
        tex.baseTexture.on('loaded', function () { resolve(tex); });
        tex.baseTexture.on('error', function () { resolve(null); });
      } catch (e) {
        resolve(null);
      }
    });
  }

  // 1 体分のテクスチャをすべて読み込む
  // expressions.normal は string でも配列でも受け付ける
  function _loadCreatureTextures(cfg, basePath) {
    var folder = (basePath || '../') + 'assets/images/ocean/' + cfg.folder + '/';
    var exp = cfg.expressions || {};

    var normalList = exp.normal;
    if (typeof normalList === 'string') normalList = [normalList];
    if (!Array.isArray(normalList) || normalList.length === 0) {
      console.warn('[dynamic-creatures] no normal expression for', cfg.id);
      return Promise.resolve(null);
    }
    if (!exp.surprised) {
      console.warn('[dynamic-creatures] no surprised expression for', cfg.id);
      return Promise.resolve(null);
    }

    var promises = [];
    promises.push(_loadTex(folder + exp.surprised));
    normalList.forEach(function (n) { promises.push(_loadTex(folder + n)); });
    if (exp.happy) promises.push(_loadTex(folder + exp.happy));

    return Promise.all(promises).then(function (texes) {
      var surprised = texes[0];
      var normalCount = normalList.length;
      var normal = texes.slice(1, 1 + normalCount).filter(Boolean);
      var happy = exp.happy ? texes[1 + normalCount] : null;
      if (!surprised || normal.length === 0) {
        console.warn('[dynamic-creatures] failed to load textures for', cfg.id);
        return null;
      }
      return { surprised: surprised, normal: normal, happy: happy };
    });
  }

  // すべての生き物のテクスチャを並列ロード
  function loadAllTextures(basePath) {
    if (!_config || !_config.creatures || _config.creatures.length === 0) {
      return Promise.resolve();
    }
    var promises = _config.creatures.map(function (cfg) {
      return _loadCreatureTextures(cfg, basePath).then(function (tex) {
        if (tex) _texCache[cfg.id] = tex;
      });
    });
    return Promise.all(promises);
  }

  // creature 1 体分の動きオブジェクトを生成
  // ctx: { creatures, layerMid, W, H, isMobile, mobSf } — aquarium から渡される
  function _spawnOne(cfg, tex, ctx) {
    var W = ctx.W, H = ctx.H, mobSf = ctx.mobSf;
    var baseSize = (cfg.baseSizePx + Math.random() * (cfg.baseSizeJitter || 0)) * mobSf();
    var imgWidth = cfg.imgWidthHint || 600;
    var s = baseSize / imgWidth;

    var safeBottom = H() * (ctx.isMobile() ? 0.55 : 0.75);
    var startX = 80 + Math.random() * Math.max(W() - 160, 1);
    var startY = 60 + Math.random() * Math.max(safeBottom - 120, 1);

    // 通常表情の最初の1枚を初期テクスチャに
    var initialTex = tex.normal[0];
    var obj = new PIXI.Sprite(initialTex);
    obj.anchor.set(0.5);
    obj.scale.set(s);
    obj.x = startX;
    obj.y = startY;

    var speedMin = cfg.speedMin != null ? cfg.speedMin : 0.04;
    var speedMax = cfg.speedMax != null ? cfg.speedMax : 0.07;
    var speed = speedMin + Math.random() * (speedMax - speedMin);

    // 向き: creatures.json の facingDir を尊重し、全個体を同じ方向に揃える
    // ('right' は画像が右向き → scale.x は正, vx は正 / 'left' は逆)
    var facingDir = cfg.facingDir === 'left' ? 'left' : 'right';
    var dirSign = facingDir === 'right' ? 1 : -1;
    obj.scale.x = Math.abs(obj.scale.x) * dirSign;

    var c = {
      obj: obj,
      pattern: cfg.pattern || 'swim',
      // 動的生成フラグ（既存ループでフィルタ可能にしておく）
      dynamicCreature: true,
      dynamicId: cfg.id,
      // 向き: 固定。画面端でも反転せず wrap around する
      facingDir: facingDir,
      facingSign: dirSign,
      // タップ反応の速さと時間の倍率（aquarium のタップハンドラが適用）
      // 1.0 が既存7体と同じ強さ。0.5 で半分、2.0 で倍
      reactionSpeedMul: cfg.reactionSpeed != null ? cfg.reactionSpeed : 1,
      reactionTimerMul: cfg.reactionDuration != null ? cfg.reactionDuration : 1,
      bgSprite: true,
      reactionType: cfg.reactionType || 'jump',
      // 既存の hardcode と同じプロパティ名を使う（octTexSurprised / octTexNormal）
      // → 既存のタップ反応・呼吸切替ロジックがそのまま動く
      octTexSurprised: tex.surprised,
      octTexNormal: tex.normal,
      // 笑う表情（餌を食べた直後に切り替え、1 秒後に normal に戻る）
      happyTex: tex.happy || null,
      happyTimer: 0,
      animFrame: 0,
      animTimer: Math.random() * 20,
      t: Math.random() * Math.PI * 2,
      baseX: startX,
      baseY: startY,
      vx: dirSign * speed,
      vy: (Math.random() - 0.5) * speed * 0.15,
      speed: speed,
      // 海流による後退モード（たまに発動して vx を一時反転）
      // 頭の向き (scale.x) は変えず、位置だけ後退する
      _driftBackTimer: 0,
      _driftCheckTimer: 120 + Math.random() * 180,
      panicTimer: 0,
      panicVx: 0,
      panicVy: 0,
      panicStyle: ['flee', 'dart_back', 'run_fwd', 'zoom'][Math.floor(Math.random() * 4)],
      _zoomPanic: false,
      baseSize: baseSize,
      halfH: baseSize * 0.5,
      tex: initialTex,
      wasInPanic: false,
      pulseTimer: 30 + Math.random() * 40,
      pulseDir: Math.random() * Math.PI * 2,
      driftNudgeTimer: 60 + Math.random() * 90,
      hiderState: null,
      hideRock: null
    };

    ctx.layerMid.addChild(obj);
    return c;
  }

  // 1 種類分の生き物をすべてスポーンする（既存の同 id を先に削除）
  function _addOneType(cfg, ctx) {
    var tex = _texCache[cfg.id];
    if (!tex) return;

    // 既存の同 dynamicId を削除（リスタート時の二重生成防止）
    var existing = ctx.creatures.filter(function (c) {
      return c.dynamicCreature && c.dynamicId === cfg.id;
    });
    // フライバイ中の creature が含まれていたら先に解除（aquarium 側の関数）
    if (typeof window._clearFlybyIfRemoved === 'function') window._clearFlybyIfRemoved(existing);
    existing.forEach(function (c) {
      // フライバイ中は layerFg にいる可能性もあるので parent から取り除く
      if (c.obj.parent) c.obj.parent.removeChild(c.obj);
    });
    var kept = ctx.creatures.filter(function (c) {
      return !(c.dynamicCreature && c.dynamicId === cfg.id);
    });
    ctx.creatures.length = 0;
    Array.prototype.push.apply(ctx.creatures, kept);

    var count = Math.min(cfg.spawnCount || 1, 10);
    for (var i = 0; i < count; i++) {
      var c = _spawnOne(cfg, tex, ctx);
      ctx.creatures.push(c);
    }
  }

  // ── 水族館に表示してよい生き物か判定 ──
  // museum: "aquarium" が設定されていればOK
  // museum 未設定でも、海の生き物カテゴリに属するものはOK
  // クイズ用イラスト（恐竜・動物・虫・天気・体・食べ物・乗り物）は除外
  var _AQUATIC_IDS = [
    'clownfish','blue_tang','pufferfish','mandarinfish','manta_ray',
    'sea_anemone','angelfish','seahorse','medaka','turtle','jellyfish',
    'whale','dolphin','starfish','crab','lobster','squid','coral',
    'penguin','seal','otter','walrus','narwhal','orca'
  ];
  function _isAquatic(cfg) {
    // 明示的に aquarium 所属ならOK
    if (cfg.museum === 'aquarium') return true;
    // 明示的に他のミュージアム所属ならNG
    if (cfg.museum && cfg.museum !== 'aquarium') return false;
    // 既知の水棲生物IDならOK
    if (_AQUATIC_IDS.indexOf(cfg.id) >= 0) return true;
    // folder名で海系を判定（ID先頭 or アンダースコア区切りで完全一致）
    var id = (cfg.id || '').toLowerCase();
    var parts = id.split('_');
    var seaWords = ['fish','shark','whale','dolphin','turtle','jelly','jellyfish',
      'octopus','squid','crab','lobster','coral','anemone','seahorse','manta',
      'ray','starfish','seal','otter','penguin','narwhal','orca','submarine','medaka',
      'clam','shrimp','eel','sea'];
    for (var i = 0; i < parts.length; i++) {
      if (seaWords.indexOf(parts[i]) >= 0) return true;
    }
    return false;
  }

  // 全部の生き物をスポーン（toggles で OFF のものはスキップ）
  // 水族館に表示してよい生き物のみスポーンする
  function addAllSelected(ctx) {
    if (!_config || !_config.creatures) return;
    _config.creatures.forEach(function (cfg) {
      // 水族館フィルター: 水棲生物以外はスキップ
      if (!_isAquatic(cfg)) return;
      // toggles[cfg.id] === false なら skip。未定義は出す
      if (ctx.toggles && ctx.toggles[cfg.id] === false) return;
      _addOneType(cfg, ctx);
    });
  }

  // 選択画面のトグルボタンを動的に生成して container に追加
  // hardcode の 7 体と同じ並びに追加される
  // textContent ベースで構築して XSS を防ぐ（creatures.json は信頼境界の外）
  function appendToggleButtons(container, toggles) {
    if (!_config || !_config.creatures || _config.creatures.length === 0) return;
    _config.creatures.forEach(function (cfg) {
      // 水族館フィルター: 水棲生物以外はスキップ
      if (!_isAquatic(cfg)) return;
      // 既に同じ data-creature が存在するならスキップ
      if (container.querySelector('[data-creature="' + cfg.id + '"]')) return;
      var btn = document.createElement('button');
      btn.className = 'creature-toggle';
      btn.dataset.creature = cfg.id;
      var iconSpan = document.createElement('span');
      iconSpan.className = 'creature-toggle-icon';
      iconSpan.textContent = cfg.icon || '🐠';
      btn.appendChild(iconSpan);
      btn.appendChild(document.createTextNode(cfg.displayName || cfg.id));
      // 初期状態（toggles に未定義なら ON、明示的に false なら OFF）
      if (toggles && toggles[cfg.id] === false) btn.classList.add('off');
      container.appendChild(btn);
    });
  }

  // 公開 API
  window.AquariumDynamicCreatures = {
    loadConfig: loadConfig,
    loadAllTextures: loadAllTextures,
    addAllSelected: addAllSelected,
    appendToggleButtons: appendToggleButtons,
    // 内部公開（デバッグ用）
    _getConfig: function () { return _config; },
    _getTexCache: function () { return _texCache; }
  };
})();
