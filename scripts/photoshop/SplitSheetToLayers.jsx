// ─────────────────────────────────────────────────────────────
// SplitSheetToLayers.jsx
//   シートレイヤーを 行数 × 列数 のグリッドで分割し、
//   各セルを個別のレイヤーにする。グループ (レイヤーセット) にまとめて
//   "{元のレイヤー名}_001", "_002", ... と連番命名。
//
//   使い方:
//     1. Photoshop で対象のキャラクターシート PSD / PNG を開く
//     2. 分割したいレイヤー (シート1枚) を選択 (アクティブレイヤー化)
//     3. File > Scripts > Browse... からこの .jsx を実行
//     4. 行数 / 列数 を入力 → 分割後のグループが生成される
//
//   注意:
//     - 元のレイヤーは非表示にして残します (誤って削除しないよう保険)
//     - 各セルは矩形でクリップ (セル間の境界を超える画像は切れる)
//     - シートが均等グリッド前提 (例: 4行×3列 の 12ポーズ)
// ─────────────────────────────────────────────────────────────
#target photoshop

(function () {
  var doc;
  try { doc = app.activeDocument; } catch (e) {
    alert('ドキュメントが開かれていません'); return;
  }
  var src = doc.activeLayer;
  if (!src) { alert('レイヤーを選択してください'); return; }
  if (src.typename !== 'ArtLayer') {
    alert('アートレイヤー (画像レイヤー) を選択してください\n(グループではなく中の1枚)');
    return;
  }

  var rowsStr = prompt('行数 (例: 4):', '4');
  if (rowsStr === null) return;
  var colsStr = prompt('列数 (例: 3):', '3');
  if (colsStr === null) return;
  var rows = parseInt(rowsStr, 10);
  var cols = parseInt(colsStr, 10);
  if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1) {
    alert('行/列の値が無効です'); return;
  }

  var docW = doc.width.as('px');
  var docH = doc.height.as('px');
  var cellW = docW / cols;
  var cellH = docH / rows;

  // ruler 単位を px に統一 (復元用に保存)
  var oldUnits = app.preferences.rulerUnits;
  app.preferences.rulerUnits = Units.PIXELS;

  var grp = doc.layerSets.add();
  grp.name = src.name + ' (split)';
  // グループは元レイヤーの上に配置される

  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }

  try {
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var idx = r * cols + c;
        var dup = src.duplicate(grp, ElementPlacement.INSIDE);
        dup.name = src.name + '_' + pad(idx + 1, 3);

        // セル矩形を選択 → 反転 → 削除 = セル内だけ残す
        var x1 = c * cellW, y1 = r * cellH;
        var x2 = x1 + cellW, y2 = y1 + cellH;
        doc.selection.select([
          [x1, y1], [x2, y1], [x2, y2], [x1, y2]
        ]);
        doc.selection.invert();
        doc.activeLayer = dup;
        try { dup.isBackgroundLayer = false; } catch (e) {}
        try { doc.selection.clear(); } catch (e) {}
        doc.selection.deselect();
      }
    }
    src.visible = false;
    alert('✅ ' + (rows * cols) + ' 個のレイヤーを "' + grp.name + '" に分割しました。\n元レイヤーは非表示にしました。');
  } catch (e) {
    alert('エラー: ' + e.message);
  } finally {
    app.preferences.rulerUnits = oldUnits;
  }
})();
