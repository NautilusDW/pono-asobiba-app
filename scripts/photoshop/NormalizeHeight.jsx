// ─────────────────────────────────────────────────────────────
// NormalizeHeight.jsx
//   グループ (レイヤーセット) 内の全レイヤーの 高さ (bounding box) を
//   揃えて、接地面 (底辺) を一直線に揃える。
//
//   使い方:
//     1. SplitSheetToLayers.jsx でシートを分割した後、生成された
//        グループを選択 (アクティブ化)
//     2. File > Scripts > Browse... からこの .jsx を実行
//     3. 基準高さ (px) を入力 — 空欄なら最大高さに合わせる
//     4. すべてのレイヤーが同じ bbox 高さにリサイズ
//        + 接地面 (一番下のレイヤーの底) に揃う
//
//   制限:
//     - "頭のてっぺん〜足先" 厳密な基準ではなく、bounding box を使用
//     - ポーズによって 手を頭より上に挙げている場合、bbox は手の
//       位置を含む → キャラクター自体は相対的に小さくなる
//     - arm-up ポーズだけ手動で調整するか、以下の "マーカー方式" を
//       使ってください:
//
//   マーカー方式 (オプション):
//     各レイヤーの head 位置 (頭のてっぺん) に、真っ赤 (#FF0000) の
//     1px ドットを入れると、スクリプトがそれを検出して「頭の高さ」
//     として使います。足先は bbox の底を使用。
//     この方式は低速 (ピクセル走査) なので ON にする時だけ。
//
//   注意:
//     - レイヤーサイズが変わる = 解像度低下の可能性 (スマートオブジェクト
//       化してから実行するとベター)
// ─────────────────────────────────────────────────────────────
#target photoshop

(function () {
  var doc;
  try { doc = app.activeDocument; } catch (e) {
    alert('ドキュメントが開かれていません'); return;
  }
  var grp = doc.activeLayer;
  if (!grp || grp.typename !== 'LayerSet') {
    alert('グループ (レイヤーセット) を選択してください');
    return;
  }
  var layers = grp.artLayers;
  if (layers.length === 0) {
    alert('グループ内にアートレイヤーがありません');
    return;
  }

  var useMarker = confirm(
    'マーカー方式を使いますか?\n\n' +
    'はい: 各レイヤーの #FF0000 の点を「頭の位置」として使う\n' +
    '     (ポーズで手を上げる場合も正確に揃えられるが 低速)\n\n' +
    'いいえ: bbox (画像の外形) で揃える (速いが手挙げポーズは縮む)'
  );

  var targetStr = prompt('基準とする高さ (px) — 空欄で最大に揃える:', '');
  var targetH = (targetStr && targetStr !== '') ? parseInt(targetStr, 10) : null;

  var oldUnits = app.preferences.rulerUnits;
  app.preferences.rulerUnits = Units.PIXELS;

  function layerHeadY(lyr) {
    // マーカー方式: 真っ赤 (#FF0000 ±tolerance) の最上部 Y を探す
    var b = lyr.bounds;
    var x1 = Math.floor(b[0].as('px'));
    var y1 = Math.floor(b[1].as('px'));
    var x2 = Math.ceil(b[2].as('px'));
    var y2 = Math.ceil(b[3].as('px'));
    // Photoshop ExtendScript のピクセル走査は遅い → サンプルサイズを制限
    doc.activeLayer = lyr;
    for (var y = y1; y <= y2; y++) {
      for (var x = x1; x <= x2; x++) {
        var c;
        try { c = doc.colorSamplers.add([[x, y]]).color; }
        catch (e) { continue; }
        try {
          var r = c.rgb.red, g = c.rgb.green, bl = c.rgb.blue;
          doc.colorSamplers.removeAll();
          if (r > 220 && g < 50 && bl < 50) return y;
        } catch (e) {}
      }
    }
    return null; // marker not found → fallback to bbox top
  }

  function layerBaselineInfo(lyr) {
    // 返り値: { top, bottom, height } (bbox 基準)
    var b = lyr.bounds;
    return {
      top:    b[1].as('px'),
      bottom: b[3].as('px'),
      height: b[3].as('px') - b[1].as('px')
    };
  }

  try {
    // Step 1: 各レイヤーの「有効高さ」を決定
    var info = [];
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      if (!L.visible) L.visible = true;
      var bb = layerBaselineInfo(L);
      var headY = null;
      if (useMarker) {
        try { headY = layerHeadY(L); } catch (e) { headY = null; }
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

    // Step 2: 各レイヤーをスケール (有効高さ基準、接地面アンカー)
    for (var k = 0; k < info.length; k++) {
      var it = info[k];
      if (it.height <= 0) continue;
      var scale = (targetH / it.height) * 100;
      doc.activeLayer = it.layer;
      it.layer.resize(scale, scale, AnchorPosition.BOTTOMCENTER);
    }

    // Step 3: 接地面 (最も下の底辺) に揃える
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

    alert('✅ 高さ揃え完了\n基準高さ: ' + Math.round(targetH) + 'px\n接地 Y: ' + Math.round(maxBottom) + 'px\nレイヤー数: ' + layers.length);
  } catch (e) {
    alert('エラー: ' + e.message + '\nline: ' + e.line);
  } finally {
    app.preferences.rulerUnits = oldUnits;
  }
})();
