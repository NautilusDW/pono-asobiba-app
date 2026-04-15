// ─────────────────────────────────────────────────────────────
// SplitSheetToLayers.jsx
//   シートレイヤーを **ピクセル連結成分で自動分割** する。
//   creature_studio (クリーンエッジスタジオ) の splitSprites と同じ考え方:
//   非透過ピクセルの連結領域を Photoshop の Magic Wand で検出し、
//   各キャラクターを 個別のレイヤーに抽出する。
//
//   アルゴリズム:
//     1. 透過度をセレクション化 → Work Path 化し、各サブパスの中心点を
//        「候補点」として収集 (= 連結成分ごとの代表点になる)
//     2. 各候補点で Magic Wand (tolerance=0, contiguous=true) を発火
//        → Photoshop のネイティブ flood fill で正確な連結領域を取得
//     3. セレクションの bbox を記録 (重複する bbox は 1つに結合)
//     4. 各 bbox に対して:
//        - 矩形選択 (padding 付き) → 元レイヤーを複製 → 外側を削除
//     5. 元レイヤーは非表示にして残す
//
//   使い方:
//     1. シートレイヤーを選択
//     2. File > Scripts > Browse... で実行
//     3. padding (px) と merge gap (px) を入力
//
//   merge gap: 2つのキャラクターの bbox が この距離以下で近接している
//              場合、1つに結合する (近くに置いた小物を 1キャラ扱いに)
// ─────────────────────────────────────────────────────────────
#target photoshop

(function () {
  var doc;
  try { doc = app.activeDocument; } catch (e) {
    alert('ドキュメントが開かれていません'); return;
  }
  var src = doc.activeLayer;
  if (!src || src.typename !== 'ArtLayer') {
    alert('アートレイヤー (画像レイヤー) を選択してください'); return;
  }

  var padStr = prompt('各キャラの周囲 余白 (px):', '8');
  if (padStr === null) return;
  var pad = parseInt(padStr, 10); if (isNaN(pad) || pad < 0) pad = 0;
  var gapStr = prompt('近接 bbox を結合する距離 (px, 0 で結合しない):', '0');
  if (gapStr === null) return;
  var mergeGap = parseInt(gapStr, 10); if (isNaN(mergeGap) || mergeGap < 0) mergeGap = 0;
  var minSize = 30;

  var oldUnits = app.preferences.rulerUnits;
  app.preferences.rulerUnits = Units.PIXELS;
  var docW = doc.width.as('px');
  var docH = doc.height.as('px');

  // ─── ActionManager helpers ───
  function loadLayerTransparencyAsSelection(layer) {
    var ref = new ActionReference();
    ref.putProperty(charIDToTypeID('Chnl'), charIDToTypeID('fsel'));
    var desc = new ActionDescriptor();
    desc.putReference(charIDToTypeID('null'), ref);
    var sourceRef = new ActionReference();
    sourceRef.putEnumerated(charIDToTypeID('Chnl'), charIDToTypeID('Chnl'), charIDToTypeID('Trsp'));
    sourceRef.putIdentifier(charIDToTypeID('Lyr '), layer.id);
    desc.putReference(charIDToTypeID('T   '), sourceRef);
    executeAction(charIDToTypeID('setd'), desc, DialogModes.NO);
  }
  function magicWandAt(x, y, tolerance, antiAlias, contiguous, sampleAllLayers) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putProperty(charIDToTypeID('Chnl'), charIDToTypeID('fsel'));
    desc.putReference(charIDToTypeID('null'), ref);
    var pt = new ActionDescriptor();
    pt.putUnitDouble(charIDToTypeID('Hrzn'), charIDToTypeID('#Pxl'), x);
    pt.putUnitDouble(charIDToTypeID('Vrtc'), charIDToTypeID('#Pxl'), y);
    desc.putObject(charIDToTypeID('T   '), charIDToTypeID('Pnt '), pt);
    desc.putInteger(charIDToTypeID('Tlrn'), tolerance);
    desc.putBoolean(charIDToTypeID('AntA'), antiAlias);
    if (contiguous)      desc.putBoolean(charIDToTypeID('Cntg'), true);
    if (sampleAllLayers) desc.putBoolean(stringIDToTypeID('sampleAllLayers'), true);
    executeAction(charIDToTypeID('setd'), desc, DialogModes.NO);
  }
  function safeSelectionBounds() {
    try {
      var b = doc.selection.bounds;
      return { x1: b[0].as('px'), y1: b[1].as('px'), x2: b[2].as('px'), y2: b[3].as('px') };
    } catch (e) { return null; }
  }
  function deselectAll() { try { doc.selection.deselect(); } catch (e) {} }

  // ─── bbox 操作 ───
  function bbKey(b) {
    return Math.round(b.x1) + ',' + Math.round(b.y1) + ',' + Math.round(b.x2) + ',' + Math.round(b.y2);
  }
  function bbOverlapOrNear(a, b, gap) {
    return !(a.x2 + gap < b.x1 || b.x2 + gap < a.x1 || a.y2 + gap < b.y1 || b.y2 + gap < a.y1);
  }
  function mergeBBoxes(list, gap) {
    var changed = true;
    while (changed) {
      changed = false;
      for (var i = 0; i < list.length; i++) {
        for (var j = i + 1; j < list.length; j++) {
          if (bbOverlapOrNear(list[i], list[j], gap)) {
            list[i] = {
              x1: Math.min(list[i].x1, list[j].x1),
              y1: Math.min(list[i].y1, list[j].y1),
              x2: Math.max(list[i].x2, list[j].x2),
              y2: Math.max(list[i].y2, list[j].y2)
            };
            list.splice(j, 1); changed = true; break;
          }
        }
        if (changed) break;
      }
    }
    return list;
  }
  function pad3(n) { var s = String(n); while (s.length < 3) s = '0' + s; return s; }

  try {
    doc.activeLayer = src;

    // ── Step 1: 透過度 → セレクション → Work Path で候補点を列挙 ──
    loadLayerTransparencyAsSelection(src);
    var totalBB = safeSelectionBounds();
    if (!totalBB) { alert('このレイヤーは不透明か空です'); return; }

    doc.selection.makeWorkPath(1.0);
    var wp = null;
    for (var p = 0; p < doc.pathItems.length; p++) {
      if (doc.pathItems[p].kind === PathKind.WORKPATH) { wp = doc.pathItems[p]; break; }
    }
    if (!wp) { alert('Work Path 作成失敗'); return; }

    var candidates = [];
    for (var si = 0; si < wp.subPathItems.length; si++) {
      var sp = wp.subPathItems[si];
      var pts = sp.pathPoints;
      if (pts.length < 2) continue;
      var sx = 0, sy = 0;
      for (var pi = 0; pi < pts.length; pi++) {
        var a = pts[pi].anchor;
        sx += a[0]; sy += a[1];
      }
      candidates.push({ x: sx / pts.length, y: sy / pts.length });
    }
    try { wp.remove(); } catch (e) {}
    deselectAll();

    if (candidates.length === 0) { alert('候補点がありません'); return; }

    // ── Step 2: 各候補点で Magic Wand → 正確な連結領域 bbox を収集 ──
    var foundBoxes = [];
    var seenKeys = {};
    for (var ci = 0; ci < candidates.length; ci++) {
      var p = candidates[ci];
      // 既に見つかった bbox 内の点ならスキップ (同じコンポーネントの再検出)
      var covered = false;
      for (var fi = 0; fi < foundBoxes.length; fi++) {
        var fb = foundBoxes[fi];
        if (p.x >= fb.x1 && p.x <= fb.x2 && p.y >= fb.y1 && p.y <= fb.y2) { covered = true; break; }
      }
      if (covered) continue;

      deselectAll();
      doc.activeLayer = src;
      try {
        magicWandAt(Math.round(p.x), Math.round(p.y), 0, false, true, false);
      } catch (e) { continue; }
      var bb = safeSelectionBounds();
      if (!bb) continue;
      // 透過部分をクリックすると全体が選択されるケースを除外
      if ((bb.x2 - bb.x1) > docW * 0.95 && (bb.y2 - bb.y1) > docH * 0.95) continue;
      if ((bb.x2 - bb.x1) < minSize && (bb.y2 - bb.y1) < minSize) continue;

      var key = bbKey(bb);
      if (seenKeys[key]) continue;
      seenKeys[key] = true;
      foundBoxes.push(bb);
    }
    deselectAll();

    if (foundBoxes.length === 0) { alert('連結領域が見つかりませんでした'); return; }

    // ── Step 3: 近接 bbox を結合 (merge gap) ──
    if (mergeGap > 0) foundBoxes = mergeBBoxes(foundBoxes, mergeGap);

    // ── Step 4: 並び替え (上→下, 左→右) ──
    foundBoxes.sort(function (a, b) {
      var dy = a.y1 - b.y1;
      if (Math.abs(dy) < 30) return a.x1 - b.x1;
      return dy;
    });

    // ── Step 5: 各 bbox を別レイヤーに抽出 ──
    var grp = doc.layerSets.add();
    grp.name = src.name + ' (split)';

    for (var idx = 0; idx < foundBoxes.length; idx++) {
      var b = foundBoxes[idx];
      var x1 = Math.max(0, b.x1 - pad);
      var y1 = Math.max(0, b.y1 - pad);
      var x2 = Math.min(docW, b.x2 + pad);
      var y2 = Math.min(docH, b.y2 + pad);

      var dup = src.duplicate(grp, ElementPlacement.INSIDE);
      dup.name = src.name + '_' + pad3(idx + 1);
      doc.activeLayer = dup;

      doc.selection.select([
        [x1, y1], [x2, y1], [x2, y2], [x1, y2]
      ]);
      doc.selection.invert();
      try { dup.isBackgroundLayer = false; } catch (e) {}
      try { doc.selection.clear(); } catch (e) {}
      doc.selection.deselect();
    }

    src.visible = false;
    alert('✅ ' + foundBoxes.length + ' 個のキャラクターを "' + grp.name + '" に抽出しました。\n(候補点: ' + candidates.length + ' → 連結成分: ' + foundBoxes.length + ')');
  } catch (e) {
    alert('エラー: ' + e.message + (e.line ? '\nline: ' + e.line : ''));
  } finally {
    app.preferences.rulerUnits = oldUnits;
  }
})();
