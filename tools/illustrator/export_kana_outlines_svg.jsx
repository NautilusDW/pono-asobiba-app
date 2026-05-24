/**
 * export_kana_outlines_svg.jsx  (Adobe Illustrator ExtendScript)
 *
 * フォントで打ったかな文字を1文字ずつアウトライン化し、SVGとして書き出す。
 * もじっこファームの「表示用ガイド文字」素材を作るための補助スクリプト。
 *
 * 出力:
 * - 1024 x 1024 pt のアートボード
 * - 文字は中央寄せ
 * - fill は黒、stroke なし
 * - 1文字 = 1 SVG ファイル
 *
 * 使い方:
 * 1. Illustrator を開く
 * 2. ファイル > スクリプト > その他のスクリプト...
 * 3. このファイルを選択
 * 4. フォント名またはフォントファミリー名を入力
 *    例: Zen Maru Gothic / Kozuka Gothic Pr6N / UD Digi Kyokasho NP-R など
 *
 * 注意:
 * - ここで作れるのは「表示用の文字外形」です。
 * - 書き順や中心線データは出力されません。
 * - フォントに存在しない文字は豆腐グリフとして出る可能性があります。
 */

#target illustrator

(function () {
    var CONFIG = {
        artboardSize: 1024,
        padding: 92,
        sourceFontSize: 820,
        defaultFontQuery: "Zen Maru Gothic",
        outputSubfolder: "kana_svg_outlines",
        onlyCharacters: "", // 例: "あいうえお"。空なら下の全文字セットを書き出す。
        includeHiragana: true,
        includeKatakana: true,
        includeSmallKana: true,
        includeDakutenKana: true,
        coordinatePrecision: 3
    };

    var oldInteractionLevel = app.userInteractionLevel;
    var createdCount = 0;
    var skippedCount = 0;
    var errors = [];

    try {
        var fontQuery = prompt(
            "書き出しに使うフォント名、またはフォントファミリー名を入力してください。\n" +
            "PostScript名が分かる場合はそれが一番確実です。",
            CONFIG.defaultFontQuery
        );
        if (fontQuery === null) return;
        fontQuery = trim(fontQuery);
        if (!fontQuery) {
            alert("フォント名が空です。処理を中止しました。");
            return;
        }

        var textFont = findFont(fontQuery);
        if (!textFont) {
            var listFile = writeFontList();
            alert(
                "指定フォントが見つかりませんでした。\n\n" +
                "入力: " + fontQuery + "\n\n" +
                "Illustratorが認識しているフォント一覧を書き出しました。\n" +
                listFile.fsName + "\n\n" +
                "一覧の name / family を見て、もう一度実行してください。"
            );
            return;
        }

        var outputFolder = chooseOutputFolder();
        if (!outputFolder) return;

        var chars = buildCharacterList();
        chars = filterCharacters(chars, CONFIG.onlyCharacters);
        if (chars.length === 0) {
            alert("書き出す文字がありません。CONFIG.onlyCharacters を確認してください。");
            return;
        }

        var ok = confirm(
            "以下の設定でSVGを書き出します。\n\n" +
            "フォント: " + textFont.name + "\n" +
            "文字数: " + chars.length + "\n" +
            "保存先: " + outputFolder.fsName + "\n\n" +
            "続行しますか？"
        );
        if (!ok) return;

        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

        for (var i = 0; i < chars.length; i++) {
            exportCharacterSvg(chars[i], textFont, outputFolder);
        }

        alert(
            "完了しました。\n\n" +
            "書き出し: " + createdCount + " ファイル\n" +
            "スキップ: " + skippedCount + " 文字\n" +
            (errors.length ? "\nエラー:\n" + errors.join("\n") + "\n" : "") +
            "\n保存先:\n" + outputFolder.fsName
        );
    } catch (e) {
        alert("処理中にエラーが発生しました。\n\n" + e.message);
    } finally {
        app.userInteractionLevel = oldInteractionLevel;
    }

    function exportCharacterSvg(entry, textFont, outputFolder) {
        var doc = null;
        try {
            var size = CONFIG.artboardSize;
            doc = app.documents.add(DocumentColorSpace.RGB, size, size);
            doc.rulerUnits = RulerUnits.Points;
            doc.artboards[0].artboardRect = [0, size, size, 0];

            var outline = createOutlinedCharacter(doc, entry.character, textFont);
            if (!outline) {
                skippedCount++;
                return;
            }

            forceBlackFill(outline);
            fitAndCenter(outline, size, CONFIG.padding);

            var file = new File(outputFolder.fsName + "/" + entry.fileName + ".svg");
            exportSvg(doc, file);
            createdCount++;
        } catch (e) {
            errors.push(entry.fileName + " (" + entry.character + "): " + e.message);
        } finally {
            if (doc) {
                doc.close(SaveOptions.DONOTSAVECHANGES);
            }
        }
    }

    function createOutlinedCharacter(doc, character, textFont) {
        var tf = doc.textFrames.add();
        tf.contents = character;
        tf.position = [CONFIG.padding, CONFIG.artboardSize - CONFIG.padding];
        tf.textRange.characterAttributes.textFont = textFont;
        tf.textRange.characterAttributes.size = CONFIG.sourceFontSize;
        tf.textRange.characterAttributes.fillColor = makeRgb(0, 0, 0);
        tf.textRange.characterAttributes.strokeColor = makeNoColor();
        return tf.createOutline();
    }

    function fitAndCenter(item, artboardSize, padding) {
        var bounds = item.visibleBounds;
        var width = bounds[2] - bounds[0];
        var height = bounds[1] - bounds[3];
        if (width <= 0 || height <= 0) {
            throw new Error("文字の外形サイズを取得できませんでした。");
        }

        var targetSize = artboardSize - padding * 2;
        var scale = Math.min(targetSize / width, targetSize / height) * 100;
        item.resize(scale, scale, true, true, true, true, scale, Transformation.CENTER);

        bounds = item.visibleBounds;
        var centerX = (bounds[0] + bounds[2]) / 2;
        var centerY = (bounds[1] + bounds[3]) / 2;
        item.translate(artboardSize / 2 - centerX, artboardSize / 2 - centerY);
    }

    function exportSvg(doc, file) {
        var opts = new ExportOptionsSVG();
        safeSet(opts, "embedRasterImages", false);
        safeSet(opts, "fontSubsetting", SVGFontSubsetting.None);
        safeSet(opts, "cssProperties", SVGCSSPropertyLocation.STYLEATTRIBUTES);
        safeSet(opts, "documentEncoding", SVGDocumentEncoding.UTF8);
        safeSet(opts, "coordinatePrecision", CONFIG.coordinatePrecision);
        safeSet(opts, "preserveEditability", false);
        safeSet(opts, "compressed", false);
        safeSet(opts, "saveMultipleArtboards", false);
        safeSet(opts, "artboardRange", "1");
        doc.exportFile(file, ExportType.SVG, opts);
    }

    function forceBlackFill(item) {
        var black = makeRgb(0, 0, 0);
        applyFillRecursive(item, black);
    }

    function applyFillRecursive(item, fillColor) {
        if (!item) return;

        if (item.typename === "PathItem") {
            item.filled = true;
            item.fillColor = fillColor;
            item.stroked = false;
            return;
        }

        if (item.typename === "CompoundPathItem") {
            for (var c = 0; c < item.pathItems.length; c++) {
                item.pathItems[c].filled = true;
                item.pathItems[c].fillColor = fillColor;
                item.pathItems[c].stroked = false;
            }
            return;
        }

        if (item.pageItems) {
            for (var i = 0; i < item.pageItems.length; i++) {
                applyFillRecursive(item.pageItems[i], fillColor);
            }
        }
    }

    function chooseOutputFolder() {
        var scriptFile = new File($.fileName);
        var settingsFile = new File(scriptFile.parent.fsName + "/._last_kana_svg_export_folder.txt");
        var lastFolder = null;

        if (settingsFile.exists) {
            settingsFile.open("r");
            var savedPath = settingsFile.read();
            settingsFile.close();
            if (savedPath && new Folder(savedPath).exists) {
                lastFolder = new Folder(savedPath);
            }
        }

        var initialPath = lastFolder
            ? lastFolder.fsName + "/export_here.svg"
            : "~/Desktop/export_here.svg";
        var selected = new File(initialPath).saveDlg(
            "書き出し先フォルダを開いて「保存」を押してください。ファイル名は無視されます。",
            "SVG:*.svg"
        );

        if (!selected) {
            alert("キャンセルされました。");
            return null;
        }

        var baseFolder = selected.parent;
        settingsFile.open("w");
        settingsFile.write(baseFolder.fsName);
        settingsFile.close();

        var outputFolder = new Folder(baseFolder.fsName + "/" + CONFIG.outputSubfolder);
        if (!outputFolder.exists) outputFolder.create();
        return outputFolder;
    }

    function buildCharacterList() {
        var out = [];
        if (CONFIG.includeHiragana) addHiragana(out);
        if (CONFIG.includeKatakana) addKatakana(out);
        return out;
    }

    function addHiragana(out) {
        addSeries(out, "hiragana", "あいうえお", ["a", "i", "u", "e", "o"]);
        addSeries(out, "hiragana", "かきくけこ", ["ka", "ki", "ku", "ke", "ko"]);
        addSeries(out, "hiragana", "さしすせそ", ["sa", "shi", "su", "se", "so"]);
        addSeries(out, "hiragana", "たちつてと", ["ta", "chi", "tsu", "te", "to"]);
        addSeries(out, "hiragana", "なにぬねの", ["na", "ni", "nu", "ne", "no"]);
        addSeries(out, "hiragana", "はひふへほ", ["ha", "hi", "fu", "he", "ho"]);
        addSeries(out, "hiragana", "まみむめも", ["ma", "mi", "mu", "me", "mo"]);
        addSeries(out, "hiragana", "やゆよ", ["ya", "yu", "yo"]);
        addSeries(out, "hiragana", "らりるれろ", ["ra", "ri", "ru", "re", "ro"]);
        addSeries(out, "hiragana", "わをん", ["wa", "wo", "n"]);

        if (CONFIG.includeSmallKana) {
            addSeries(out, "hiragana", "ぁぃぅぇぉ", ["small_a", "small_i", "small_u", "small_e", "small_o"]);
            addSeries(out, "hiragana", "ゃゅょっゎ", ["small_ya", "small_yu", "small_yo", "small_tsu", "small_wa"]);
        }

        if (CONFIG.includeDakutenKana) {
            addSeries(out, "hiragana", "がぎぐげご", ["ga", "gi", "gu", "ge", "go"]);
            addSeries(out, "hiragana", "ざじずぜぞ", ["za", "ji", "zu", "ze", "zo"]);
            addSeries(out, "hiragana", "だぢづでど", ["da", "di", "du", "de", "do"]);
            addSeries(out, "hiragana", "ばびぶべぼ", ["ba", "bi", "bu", "be", "bo"]);
            addSeries(out, "hiragana", "ぱぴぷぺぽ", ["pa", "pi", "pu", "pe", "po"]);
            addSeries(out, "hiragana", "ゔ", ["vu"]);
        }
    }

    function addKatakana(out) {
        addSeries(out, "katakana", "アイウエオ", ["a", "i", "u", "e", "o"]);
        addSeries(out, "katakana", "カキクケコ", ["ka", "ki", "ku", "ke", "ko"]);
        addSeries(out, "katakana", "サシスセソ", ["sa", "shi", "su", "se", "so"]);
        addSeries(out, "katakana", "タチツテト", ["ta", "chi", "tsu", "te", "to"]);
        addSeries(out, "katakana", "ナニヌネノ", ["na", "ni", "nu", "ne", "no"]);
        addSeries(out, "katakana", "ハヒフヘホ", ["ha", "hi", "fu", "he", "ho"]);
        addSeries(out, "katakana", "マミムメモ", ["ma", "mi", "mu", "me", "mo"]);
        addSeries(out, "katakana", "ヤユヨ", ["ya", "yu", "yo"]);
        addSeries(out, "katakana", "ラリルレロ", ["ra", "ri", "ru", "re", "ro"]);
        addSeries(out, "katakana", "ワヲン", ["wa", "wo", "n"]);
        addSeries(out, "katakana", "ー", ["prolonged_sound"]);

        if (CONFIG.includeSmallKana) {
            addSeries(out, "katakana", "ァィゥェォ", ["small_a", "small_i", "small_u", "small_e", "small_o"]);
            addSeries(out, "katakana", "ャュョッヮ", ["small_ya", "small_yu", "small_yo", "small_tsu", "small_wa"]);
        }

        if (CONFIG.includeDakutenKana) {
            addSeries(out, "katakana", "ガギグゲゴ", ["ga", "gi", "gu", "ge", "go"]);
            addSeries(out, "katakana", "ザジズゼゾ", ["za", "ji", "zu", "ze", "zo"]);
            addSeries(out, "katakana", "ダヂヅデド", ["da", "di", "du", "de", "do"]);
            addSeries(out, "katakana", "バビブベボ", ["ba", "bi", "bu", "be", "bo"]);
            addSeries(out, "katakana", "パピプペポ", ["pa", "pi", "pu", "pe", "po"]);
            addSeries(out, "katakana", "ヴ", ["vu"]);
        }
    }

    function addSeries(out, scriptName, chars, ids) {
        for (var i = 0; i < chars.length; i++) {
            out.push({
                character: chars.charAt(i),
                fileName: scriptName + "_" + ids[i]
            });
        }
    }

    function filterCharacters(chars, onlyCharacters) {
        onlyCharacters = trim(onlyCharacters || "");
        if (!onlyCharacters) return chars;

        var wanted = {};
        for (var i = 0; i < onlyCharacters.length; i++) {
            wanted[onlyCharacters.charAt(i)] = true;
        }

        var filtered = [];
        for (var j = 0; j < chars.length; j++) {
            if (wanted[chars[j].character]) filtered.push(chars[j]);
        }
        return filtered;
    }

    function findFont(query) {
        query = normalize(query);
        var i;
        for (i = 0; i < app.textFonts.length; i++) {
            if (normalize(app.textFonts[i].name) === query) return app.textFonts[i];
        }
        for (i = 0; i < app.textFonts.length; i++) {
            if (normalize(app.textFonts[i].family) === query) return app.textFonts[i];
        }
        for (i = 0; i < app.textFonts.length; i++) {
            if (normalize(app.textFonts[i].name).indexOf(query) >= 0) return app.textFonts[i];
        }
        for (i = 0; i < app.textFonts.length; i++) {
            if (normalize(app.textFonts[i].family).indexOf(query) >= 0) return app.textFonts[i];
        }
        return null;
    }

    function writeFontList() {
        var file = new File("~/Desktop/illustrator-font-list.txt");
        file.encoding = "UTF-8";
        file.open("w");
        file.writeln("name\tfamily\tstyle");
        for (var i = 0; i < app.textFonts.length; i++) {
            var f = app.textFonts[i];
            file.writeln(f.name + "\t" + f.family + "\t" + f.style);
        }
        file.close();
        return file;
    }

    function makeRgb(r, g, b) {
        var color = new RGBColor();
        color.red = r;
        color.green = g;
        color.blue = b;
        return color;
    }

    function makeNoColor() {
        return new NoColor();
    }

    function safeSet(obj, key, value) {
        try {
            obj[key] = value;
        } catch (e) {
            // Illustratorのバージョン差で存在しないオプションは無視する。
        }
    }

    function trim(value) {
        return String(value).replace(/^\s+|\s+$/g, "");
    }

    function normalize(value) {
        return trim(value).toLowerCase();
    }
})();
