(function() {
    var comp = app.project.activeItem;
    if (!comp) return alert("コンポをアクティブにしてください。");

    var floorLayer = comp.layer("floor");
    var tlNull = comp.layer("Grid_TL"); // 左奥のヌル
    var brNull = comp.layer("Grid_BR"); // 右手前のヌル

    if (!floorLayer || !tlNull || !brNull) {
        return alert("「floor」「Grid_TL」「Grid_BR」の3つのレイヤーが必要です。");
    }

    // 計算用の一時的な3Dヌルレイヤーを作成
    var tempNull = comp.layers.addNull();
    tempNull.threeDLayer = true;
    var posProp = tempNull.property("Position");

    // ダミーレイヤーのエクスプレッションで正確にスクリーン座標へ変換
    function getScreenPos(localX, localY, localZ) {
        posProp.expression = 'thisComp.layer("' + floorLayer.name + '").toComp([' + localX + ', ' + localY + ', ' + localZ + ']);';
        var val = posProp.value;
        return { x: Math.round(val[0]), y: Math.round(val[1]) };
    }

    // 子レイヤーになっている前提で、ローカル座標（Position）を直接取得
    var tlLocal = tlNull.property("Position").value;
    var brLocal = brNull.property("Position").value;

    var rows = 4; // セルの行数
    var cols = 8; // セルの列数

    var output = "{\n";
    output += '  "resolution": {"width": ' + comp.width + ', "height": ' + comp.height + '},\n';
    output += '  "rows": ' + rows + ',\n';
    output += '  "cols": ' + cols + ',\n';
    output += '  "gridMatrix": [\n';

    // i=行 (0=奥, rows=手前)
    for (var i = 0; i <= rows; i++) {
        var v = i / rows;
        var localY = tlLocal[1] + (brLocal[1] - tlLocal[1]) * v;

        output += '    [\n';
        // j=列 (0=左, cols=右)
        for (var j = 0; j <= cols; j++) {
            var u = j / cols;
            var localX = tlLocal[0] + (brLocal[0] - tlLocal[0]) * u;

            // 3D空間上の分割ポイントを、2Dスクリーン座標に変換
            var pt = getScreenPos(localX, localY, 0);

            output += '      {"x": ' + pt.x + ', "y": ' + pt.y + '}';
            if (j < cols) output += ',';
            output += '\n';
        }
        output += '    ]';
        if (i < rows) output += ',\n';
        else output += '\n';
    }

    output += '  ]\n}';

    tempNull.remove();
    prompt("以下のJSONをClaude Codeへ渡してください", output);
})();
