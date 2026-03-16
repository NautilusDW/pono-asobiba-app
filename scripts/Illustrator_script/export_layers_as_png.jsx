/**
 * export_layers_as_png.jsx  (Adobe Illustrator ExtendScript)
 *
 * 各レイヤーのコンテンツ範囲に合わせてα付きPNGを書き出す。
 * アートボードサイズではなく、レイヤー内オブジェクトの実サイズで切り出す。
 * 非表示レイヤーはスキップ。
 *
 * 使い方: Illustrator > ファイル > スクリプト > その他のスクリプト... でこのファイルを選択
 */

#target illustrator

(function () {
    if (app.documents.length === 0) {
        alert("ドキュメントを開いてから実行してください。");
        return;
    }

    var doc = app.activeDocument;

    // 前回の保存先を記憶するファイル（スクリプトと同じフォルダに作成）
    var scriptFile = new File($.fileName);
    var settingsFile = new File(scriptFile.parent.fsName + "/._last_export_folder.txt");

    // 前回のフォルダを読み込み → Folder.current に設定してダイアログの初期位置にする
    if (settingsFile.exists) {
        settingsFile.open("r");
        var savedPath = settingsFile.read();
        settingsFile.close();
        if (savedPath && new Folder(savedPath).exists) {
            Folder.current = new Folder(savedPath);
        }
    }

    // 書き出し先フォルダを選択
    var prompt = "PNG書き出し先フォルダを選択";
    if (Folder.current && Folder.current.exists) {
        prompt += "（前回: " + Folder.current.fsName + "）";
    }
    var outputFolder = Folder.selectDialog(prompt);
    if (!outputFolder) {
        alert("キャンセルされました。");
        return;
    }

    // 選択したフォルダを記憶
    settingsFile.open("w");
    settingsFile.write(outputFolder.fsName);
    settingsFile.close();
    Folder.current = outputFolder;

    // 元のアートボード情報を保存（後で復元）
    var ab = doc.artboards[0];
    var origRect = ab.artboardRect.slice(); // [left, top, right, bottom]

    // 全レイヤーの元の表示状態を記録
    var layerStates = [];
    for (var i = 0; i < doc.layers.length; i++) {
        layerStates.push({
            layer: doc.layers[i],
            visible: doc.layers[i].visible
        });
    }

    var exportedCount = 0;
    var skippedCount = 0;
    var errors = [];

    for (var i = 0; i < doc.layers.length; i++) {
        var layer = doc.layers[i];

        // 元々非表示のレイヤーはスキップ
        if (!layerStates[i].visible) {
            skippedCount++;
            continue;
        }

        // レイヤーにアイテムがなければスキップ
        if (layer.pageItems.length === 0) {
            skippedCount++;
            continue;
        }

        try {
            exportLayer(doc, layer, ab, outputFolder, i);
            exportedCount++;
        } catch (e) {
            errors.push(layer.name + ": " + e.message);
        }
    }

    // アートボードを元に戻す
    ab.artboardRect = origRect;

    // 全レイヤーの表示状態を復元
    for (var i = 0; i < layerStates.length; i++) {
        layerStates[i].layer.visible = layerStates[i].visible;
    }

    var msg = "完了！\n書き出し: " + exportedCount + " ファイル\nスキップ: " + skippedCount + " レイヤー";
    if (errors.length > 0) {
        msg += "\n\nエラー:\n" + errors.join("\n");
    }
    msg += "\n\n保存先: " + outputFolder.fsName;
    alert(msg);

    // -------------------------------------------------------
    function exportLayer(doc, layer, artboard, folder, layerIndex) {
        // 全レイヤーを非表示にしてから対象レイヤーだけ表示
        for (var j = 0; j < doc.layers.length; j++) {
            doc.layers[j].visible = (j === layerIndex);
        }

        // レイヤーのコンテンツ範囲を取得 (visibleBounds)
        // visibleBounds = [left, top, right, bottom] （ストローク含む）
        var bounds = getLayerBounds(layer);
        if (!bounds) return;

        // 少しパディングを追加（1px相当）
        var pad = 1;
        var rect = [
            bounds[0] - pad,  // left
            bounds[1] + pad,  // top（Illustratorは上がプラス）
            bounds[2] + pad,  // right
            bounds[3] - pad   // bottom
        ];

        // アートボードをレイヤー範囲にリサイズ
        artboard.artboardRect = rect;

        // ファイル名（レイヤー名から安全な文字列に）
        var safeName = layer.name.replace(/[\\\/:\*\?\x22<>\|]/g, "_");
        var file = new File(folder.fsName + "/" + safeName + ".png");

        // PNG書き出しオプション
        var opts = new ExportOptionsPNG24();
        opts.antiAliasing = true;
        opts.artBoardClipping = true;  // アートボード範囲で切り抜き
        opts.transparency = true;      // アルファ付き
        opts.horizontalScale = 100;    // 元サイズ (100%)
        opts.verticalScale = 100;

        doc.exportFile(file, ExportType.PNG24, opts);
    }

    function getLayerBounds(layer) {
        if (layer.pageItems.length === 0) return null;

        // 最初のアイテムのboundsで初期化
        var item0 = layer.pageItems[0];
        var vb = item0.visibleBounds; // [left, top, right, bottom]
        var left = vb[0], top = vb[1], right = vb[2], bottom = vb[3];

        // 残りのアイテムで拡張
        for (var k = 1; k < layer.pageItems.length; k++) {
            var b = layer.pageItems[k].visibleBounds;
            if (b[0] < left) left = b[0];
            if (b[1] > top) top = b[1];     // 上方向がプラス
            if (b[2] > right) right = b[2];
            if (b[3] < bottom) bottom = b[3]; // 下方向がマイナス
        }

        return [left, top, right, bottom];
    }

})();
