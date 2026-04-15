// ─────────────────────────────────────────────────────────────
// NormalizeHeight.jsx
//   選択中のレイヤー群 (複数選択可) の 高さを揃えて、接地面 (底辺) を
//   一直線に揃える。
//
//   使い方:
//     1. レイヤーパネルで 対象レイヤーを 複数選択 (Ctrl/Cmd+クリック)
//        - グループ (レイヤーセット) を選択した場合は その中の全レイヤー
//        - 単一アートレイヤーを選択した場合は そのレイヤーのみ
//     2. File > Scripts > Browse... からこの .jsx を実行
//     3. マーカー方式を使うか選択 → 基準高さ入力 → 実行
//
//   制限 / マーカー方式については README.md を参照
// ─────────────────────────────────────────────────────────────
#target photoshop

(function () {
  var doc;
  try { doc = app.activeDocument; } catch (e) {
    alert('ドキュメントが開かれていません'); return;
  }

  // ─── 選択中のレイヤーを取得 ───
  function getSelectedLayers() {
    var out = [];
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID('Dcmn'), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'));
    var desc = executeActionGet(ref);
    var tlKey = stringIDToTypeID('targetLayers');
    if (desc.hasKey(tlKey)) {
      var list = desc.getList(tlKey);
      // バックグラウンドレイヤーがあるかで index が 1 ずれる
      var hasBg = false;
      try { hasBg = !!doc.backgroundLayer; } catch (e) {}
      for (var i = 0; i < list.count; i++) {
        var idx = list.getReference(i).getIndex();
        if (!hasBg) idx += 1;
        var lyr = _layerByIndex(idx);
        if (lyr) out.push(lyr);
      }
    }
    if (out.length === 0 && doc.activeLayer) out.push(doc.activeLayer);
    return out;
  }
  function _layerByIndex(idx) {
    // ドキュメント全体を走査して指定 index のレイヤーを取得
    var found = null;
    function walk(group) {
      for (var i = 0; i < group.layers.length; i++) {
        var L = group.layers[i];
        if (_getLayerIndex(L) === idx) { found = L; return; }
        if (L.typename === 'LayerSet') { walk(L); if (found) return; }
      }
    }
    walk(doc);
    return found;
  }
  function _getLayerIndex(layer) {
    var ref = new ActionReference();
    ref.putIdentifier(charIDToTypeID('Lyr '), layer.id);
    return executeActionGet(ref).getInteger(stringIDToTypeID('itemIndex'));
  }

  // ─── 対象レイヤー展開 (グループが含まれていたら中のアートレイヤーに) ───
  var selected = getSelectedLayers();
  var layers = [];
  for (var si = 0; si < selected.length; si++) {
    var s = selected[si];
    if (s.typename === 'LayerSet') {
      for (var ai = 0; ai < s.artLayers.length; ai++) layers.push(s.artLayers[ai]);
    } else if (s.typename === 'ArtLayer') {
      layers.push(s);
    }
  }
  if (layers.length === 0) {
    alert('対象レイヤーがありません。レイヤーパネルで 1枚以上を選択してから実行してください');
    return;
  }

  var useMarker = confirm(
    '選択レイヤー ' + layers.length + ' 枚 を高さ揃えします。\n\n' +
    'マーカー方式を使いますか?\n\n' +
    'はい: 各レイヤーの #FF0000 の点を「頭の位置」として使う\n' +
    '     (手を上げるポーズでも正確に揃う / 低速)\n\n' +
    'いいえ: bbox (画像の外形) で揃える (速い / 手挙げは縮む)'
  );

  var targetStr = prompt('基準とする高さ (px) — 空欄で最大に揃える:', '');
  var targetH = (targetStr && targetStr !== '') ? parseInt(targetStr, 10) : null;

  var oldUnits = app.preferences.rulerUnits;
  app.preferences.rulerUnits = Units.PIXELS;

  function layerHeadYByMarker(lyr) {
    // 真っ赤 (#FF0000 ±tolerance) の最上部 Y を探す (低速)
    var b = lyr.bounds;
    var x1 = Math.floor(b[0].as('px'));
    var y1 = Math.floor(b[1].as('px'));
    var x2 = Math.ceil(b[2].as('px'));
    var y2 = Math.ceil(b[3].as('px'));
    doc.activeLayer = lyr;
    for (var y = y1; y <= y2; y++) {
      for (var x = x1; x <= x2; x++) {
        try {
          var cs = doc.colorSamplers.add([[x, y]]);
          var c = cs.color;
          var r = c.rgb.red, g = c.rgb.green, bl = c.rgb.blue;
          doc.colorSamplers.removeAll();
          if (r > 220 && g < 50 && bl < 50) return y;
        } catch (e) {
          try { doc.colorSamplers.removeAll(); } catch (e2) {}
        }
      }
    }
    return null;
  }

  function bboxInfo(lyr) {
    var b = lyr.bounds;
    return {
      top:    b[1].as('px'),
      bottom: b[3].as('px'),
      height: b[3].as('px') - b[1].as('px')
    };
  }

  try {
    // Step 1: 各レイヤーの 有効高さ算出
    var info = [];
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      if (!L.visible) L.visible = true;
      var bb = bboxInfo(L);
      var headY = null;
      if (useMarker) {
        try { headY = layerHeadYByMarker(L); } catch (e) { headY = null; }
      }
      var topY = (headY !== null) ? headY : bb.top;
      var effH = bb.bottom - topY;
      info.push({ layer: L, top: topY, bottom: bb.bottom, height: effH });
    }

    // ターゲット高さ決定
    if (!targetH || isNaN(targetH)) {
      targetH = 0;
      for (var j = 0; j < info.length; j++) if (info[j].height > targetH) targetH = info[j].height;
    }

    // Step 2: 各レイヤーをスケール (接地面アンカー)
    for (var k = 0; k < info.length; k++) {
      var it = info[k];
      if (it.height <= 0) continue;
      var scale = (targetH / it.height) * 100;
      doc.activeLayer = it.layer;
      it.layer.resize(scale, scale, AnchorPosition.BOTTOMCENTER);
    }

    // Step 3: 接地面 (最も下の底辺) に揃える — 選択レイヤーの中で最大の底
    var maxBottom = 0;
    for (var m = 0; m < layers.length; m++) {
      var bn = layers[m].bounds;
      var bot = bn[3].as('px');
      if (bot > maxBottom) maxBottom = bot;
    }
    for (var n = 0; n < layers.length; n++) {
      var bn2 = layers[n].bounds;
      var dy = maxBottom - bn2[3].as('px');
      if (dy !== 0) layers[n].translate(0, dy);
    }

    alert('✅ 高さ揃え完了\n対象: ' + layers.length + ' 枚\n基準高さ: ' + Math.round(targetH) + 'px\n接地 Y: ' + Math.round(maxBottom) + 'px');
  } catch (e) {
    alert('エラー: ' + e.message + (e.line ? '\nline: ' + e.line : ''));
  } finally {
    app.preferences.rulerUnits = oldUnits;
  }
})();
