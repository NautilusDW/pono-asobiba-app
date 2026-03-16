/**
 * export_layers_as_png.jsx
 * 各レイヤーを個別のα付きPNGとして指定フォルダに書き出す
 * 非表示レイヤーはスキップ / レイヤーマスクも保持
 *
 * 使い方: Photoshop > ファイル > スクリプト > 参照... でこのファイルを選択
 */

#target photoshop

(function () {
    var doc = app.activeDocument;

    // 書き出し先フォルダを選択
    var outputFolder = Folder.selectDialog("書き出し先フォルダを選択してください");
    if (!outputFolder) {
        alert("キャンセルされました。");
        return;
    }

    // PNG保存オプション（α付き）
    var pngOptions = new PNGSaveOptions();
    pngOptions.interlaced = false;
    pngOptions.compression = 0;

    // ルーラー単位をピクセルに固定して width/height を取得
    var originalRuler = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;
    var docWidth     = doc.width.value;
    var docHeight    = doc.height.value;
    var docRes       = doc.resolution;
    app.preferences.rulerUnits = originalRuler;

    var exportedCount = 0;
    var skippedCount  = 0;

    processLayers(doc.layers);

    alert("完了！\n書き出し: " + exportedCount + " ファイル\nスキップ(非表示): " + skippedCount + " レイヤー\n\n保存先: " + outputFolder.fsName);

    // -------------------------------------------------------
    function processLayers(layers) {
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];

            if (!layer.visible) {
                skippedCount++;
                continue;
            }

            if (layer.typename === "LayerSet") {
                processLayers(layer.layers);
            } else {
                exportLayer(layer);
            }
        }
    }

    function exportLayer(layer) {
        var safeName = layer.name.replace(/[\\\/:\*\?\x22<>\|]/g, "_");
        var filePath = outputFolder.fsName + "/" + safeName + ".png";

        // 新規ドキュメント（透明背景）を作成
        var newDoc = app.documents.add(
            docWidth, docHeight, docRes,
            safeName,
            NewDocumentMode.RGB,
            DocumentFill.TRANSPARENT
        );

        // 元のドキュメントに戻してレイヤーを複製
        app.activeDocument = doc;
        layer.duplicate(newDoc, ElementPlacement.PLACEATBEGINNING);

        // 新規ドキュメントに切り替えて書き出し
        app.activeDocument = newDoc;

        // duplicate で追加されたデフォルトの空レイヤーを削除
        // （レイヤー数が2以上のときだけ末尾を削除）
        if (newDoc.layers.length > 1) {
            newDoc.layers[newDoc.layers.length - 1].remove();
        }

        // トリミング（透明部分を除去したい場合は下をコメント解除）
        // newDoc.trim(TrimType.TRANSPARENT);

        newDoc.saveAs(new File(filePath), pngOptions, true, Extension.LOWERCASE);
        newDoc.close(SaveOptions.DONOTSAVECHANGES);

        // 元のドキュメントに戻す
        app.activeDocument = doc;

        exportedCount++;
    }

})();
