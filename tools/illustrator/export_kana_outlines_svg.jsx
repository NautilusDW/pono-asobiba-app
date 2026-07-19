/**
 * export_kana_outlines_svg.jsx  (Adobe Illustrator ExtendScript)
 *
 * Illustrator上で手作業で打ったテキストを正本にして、1文字ずつアウトラインSVGへ書き出す。
 * フォント選びをIllustrator上で試しながら、決まった文字列とフォントだけをSVG化するための補助スクリプト。
 *
 * 基本の使い方:
 * 1. Illustratorで任意のテキストオブジェクトを作る
 * 2. 書き出したい文字列を入力する
 * 3. フォントファミリー / ウェイト / 字形をIllustrator上で選んで見た目を確認する
 * 4. そのテキストオブジェクトを選択する
 * 5. ファイル > スクリプト > その他のスクリプト... からこのJSXを実行する
 *
 * 出力:
 * - 選択テキスト内の文字を1文字ずつSVG化
 * - 1024 x 1024 pt のアートボード
 * - 文字は中央寄せ
 * - fill は黒、stroke なし
 * - 同じ文字が複数ある場合は最初の1回だけ出力
 *
 * 注意:
 * - ここで作れるのは「表示用の文字外形」です。
 * - 書き順や中心線データは出力されません。
 * - 選択テキスト内で文字ごとに違うフォントを使った場合は、その文字に適用されているフォントで出力します。
 */

#target illustrator

(function () {
    var CONFIG = {
        artboardSize: 1024,
        padding: 92,
        sourceFontSize: 820,
        outputSubfolder: "kana_svg_outlines",
        skipWhitespace: true,
        uniqueCharactersOnly: true,
        coordinatePrecision: 3,
        sampleText: "あいうえお\nアイウエオ"
    };

    var oldInteractionLevel = app.userInteractionLevel;
    var createdCount = 0;
    var skippedCount = 0;
    var errors = [];
    var KANA_FILE_NAMES = buildKanaFileNameMap();

    try {
        var ranges = getSelectedTextRanges();
        if (ranges.length === 0) {
            offerSampleDocument();
            return;
        }

        var entries = collectCharacterEntries(ranges);
        if (entries.length === 0) {
            alert("選択中のテキストに書き出せる文字がありません。");
            return;
        }

        var outputFolder = chooseOutputFolder();
        if (!outputFolder) return;

        var ok = confirm(
            "選択中のテキストからSVGを書き出します。\n\n" +
            "書き出し文字数: " + entries.length + "\n" +
            "フォント: " + summarizeFonts(entries) + "\n" +
            "保存先: " + outputFolder.fsName + "\n\n" +
            "続行しますか？"
        );
        if (!ok) return;

        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

        for (var i = 0; i < entries.length; i++) {
            exportCharacterSvg(entries[i], outputFolder);
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

    function exportCharacterSvg(entry, outputFolder) {
        var doc = null;
        try {
            var size = CONFIG.artboardSize;
            doc = app.documents.add(DocumentColorSpace.RGB, size, size);
            doc.rulerUnits = RulerUnits.Points;
            doc.artboards[0].artboardRect = [0, size, size, 0];

            var outline = createOutlinedCharacter(doc, entry);
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

    function createOutlinedCharacter(doc, entry) {
        var tf = doc.textFrames.add();
        tf.contents = entry.character;
        tf.position = [CONFIG.padding, CONFIG.artboardSize - CONFIG.padding];
        tf.textRange.characterAttributes.textFont = entry.textFont;
        tf.textRange.characterAttributes.size = CONFIG.sourceFontSize;
        tf.textRange.characterAttributes.fillColor = makeRgb(0, 0, 0);
        tf.textRange.characterAttributes.strokeColor = makeNoColor();
        return tf.createOutline();
    }

    function getSelectedTextRanges() {
        var ranges = [];
        if (app.documents.length === 0) return ranges;
        var sel = app.selection;
        if (!sel) return ranges;

        if (sel.typename === "TextRange") {
            ranges.push(sel);
            return ranges;
        }

        if (sel.length === undefined) return ranges;

        for (var i = 0; i < sel.length; i++) {
            collectTextRangesFromItem(sel[i], ranges);
        }
        return ranges;
    }

    function collectTextRangesFromItem(item, ranges) {
        if (!item) return;

        if (item.typename === "TextFrame") {
            ranges.push(item.textRange);
            return;
        }

        if (item.typename === "TextRange") {
            ranges.push(item);
            return;
        }

        if (item.pageItems) {
            for (var i = 0; i < item.pageItems.length; i++) {
                collectTextRangesFromItem(item.pageItems[i], ranges);
            }
        }
    }

    function collectCharacterEntries(ranges) {
        var entries = [];
        var used = {};

        for (var r = 0; r < ranges.length; r++) {
            var chars = ranges[r].characters;
            for (var i = 0; i < chars.length; i++) {
                var ch = chars[i].contents;
                if (!ch || isSkippedCharacter(ch)) {
                    skippedCount++;
                    continue;
                }

                if (CONFIG.uniqueCharactersOnly && used[ch]) {
                    skippedCount++;
                    continue;
                }
                used[ch] = true;

                var textFont = getCharacterFont(chars[i], ranges[r]);
                if (!textFont) {
                    errors.push("フォント取得失敗: " + ch);
                    skippedCount++;
                    continue;
                }

                entries.push({
                    character: ch,
                    textFont: textFont,
                    fileName: makeUniqueFileName(makeFileName(ch), entries)
                });
            }
        }

        return entries;
    }

    function getCharacterFont(characterRange, fallbackRange) {
        try {
            if (characterRange.characterAttributes.textFont) {
                return characterRange.characterAttributes.textFont;
            }
        } catch (e1) {}

        try {
            if (fallbackRange.characterAttributes.textFont) {
                return fallbackRange.characterAttributes.textFont;
            }
        } catch (e2) {}

        return null;
    }

    function isSkippedCharacter(ch) {
        if (!CONFIG.skipWhitespace) return false;
        return ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\u3000";
    }

    function offerSampleDocument() {
        var message =
            "選択中のテキストオブジェクトがありません。\n\n" +
            "先にIllustratorで文字を打ち、フォントを選んでから、そのテキストを選択して実行してください。\n\n" +
            "入力用のサンプルドキュメントを作りますか？";

        if (!confirm(message)) return;

        var doc = app.documents.add(DocumentColorSpace.RGB, 1400, 900);
        doc.rulerUnits = RulerUnits.Points;
        var tf = doc.textFrames.add();
        tf.contents = CONFIG.sampleText;
        tf.position = [100, 760];
        tf.textRange.characterAttributes.size = 150;
        tf.textRange.characterAttributes.fillColor = makeRgb(0, 0, 0);
        app.selection = null;
        tf.selected = true;
        alert(
            "サンプルテキストを作りました。\n\n" +
            "1. 文字列を必要な内容に変更\n" +
            "2. フォントを選択\n" +
            "3. テキストオブジェクトを選択したまま、このスクリプトをもう一度実行\n\n" +
            "この流れでSVGを書き出せます。"
        );
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

    function summarizeFonts(entries) {
        var seen = {};
        var names = [];
        for (var i = 0; i < entries.length; i++) {
            var name = entries[i].textFont ? entries[i].textFont.name : "(unknown)";
            if (!seen[name]) {
                seen[name] = true;
                names.push(name);
            }
        }
        if (names.length <= 3) return names.join(", ");
        return names.slice(0, 3).join(", ") + " ほか " + (names.length - 3) + " 件";
    }

    function makeFileName(ch) {
        if (KANA_FILE_NAMES[ch]) return KANA_FILE_NAMES[ch];
        return "u" + getCodePointHex(ch);
    }

    function makeUniqueFileName(base, entries) {
        var name = base;
        var suffix = 2;
        while (hasFileName(name, entries)) {
            name = base + "_" + suffix;
            suffix++;
        }
        return name;
    }

    function hasFileName(name, entries) {
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].fileName === name) return true;
        }
        return false;
    }

    function getCodePointHex(ch) {
        var first = ch.charCodeAt(0);
        var code = first;
        if (first >= 0xD800 && first <= 0xDBFF && ch.length > 1) {
            var second = ch.charCodeAt(1);
            if (second >= 0xDC00 && second <= 0xDFFF) {
                code = ((first - 0xD800) * 0x400) + (second - 0xDC00) + 0x10000;
            }
        }
        var hex = code.toString(16).toUpperCase();
        while (hex.length < 4) hex = "0" + hex;
        return hex;
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

    function buildKanaFileNameMap() {
        return {
        "あ": "hiragana_a", "い": "hiragana_i", "う": "hiragana_u", "え": "hiragana_e", "お": "hiragana_o",
        "か": "hiragana_ka", "き": "hiragana_ki", "く": "hiragana_ku", "け": "hiragana_ke", "こ": "hiragana_ko",
        "さ": "hiragana_sa", "し": "hiragana_shi", "す": "hiragana_su", "せ": "hiragana_se", "そ": "hiragana_so",
        "た": "hiragana_ta", "ち": "hiragana_chi", "つ": "hiragana_tsu", "て": "hiragana_te", "と": "hiragana_to",
        "な": "hiragana_na", "に": "hiragana_ni", "ぬ": "hiragana_nu", "ね": "hiragana_ne", "の": "hiragana_no",
        "は": "hiragana_ha", "ひ": "hiragana_hi", "ふ": "hiragana_fu", "へ": "hiragana_he", "ほ": "hiragana_ho",
        "ま": "hiragana_ma", "み": "hiragana_mi", "む": "hiragana_mu", "め": "hiragana_me", "も": "hiragana_mo",
        "や": "hiragana_ya", "ゆ": "hiragana_yu", "よ": "hiragana_yo",
        "ら": "hiragana_ra", "り": "hiragana_ri", "る": "hiragana_ru", "れ": "hiragana_re", "ろ": "hiragana_ro",
        "わ": "hiragana_wa", "を": "hiragana_wo", "ん": "hiragana_n",
        "ぁ": "hiragana_small_a", "ぃ": "hiragana_small_i", "ぅ": "hiragana_small_u", "ぇ": "hiragana_small_e", "ぉ": "hiragana_small_o",
        "ゃ": "hiragana_small_ya", "ゅ": "hiragana_small_yu", "ょ": "hiragana_small_yo", "っ": "hiragana_small_tsu", "ゎ": "hiragana_small_wa",
        "が": "hiragana_ga", "ぎ": "hiragana_gi", "ぐ": "hiragana_gu", "げ": "hiragana_ge", "ご": "hiragana_go",
        "ざ": "hiragana_za", "じ": "hiragana_ji", "ず": "hiragana_zu", "ぜ": "hiragana_ze", "ぞ": "hiragana_zo",
        "だ": "hiragana_da", "ぢ": "hiragana_di", "づ": "hiragana_du", "で": "hiragana_de", "ど": "hiragana_do",
        "ば": "hiragana_ba", "び": "hiragana_bi", "ぶ": "hiragana_bu", "べ": "hiragana_be", "ぼ": "hiragana_bo",
        "ぱ": "hiragana_pa", "ぴ": "hiragana_pi", "ぷ": "hiragana_pu", "ぺ": "hiragana_pe", "ぽ": "hiragana_po",
        "ゔ": "hiragana_vu",

        "ア": "katakana_a", "イ": "katakana_i", "ウ": "katakana_u", "エ": "katakana_e", "オ": "katakana_o",
        "カ": "katakana_ka", "キ": "katakana_ki", "ク": "katakana_ku", "ケ": "katakana_ke", "コ": "katakana_ko",
        "サ": "katakana_sa", "シ": "katakana_shi", "ス": "katakana_su", "セ": "katakana_se", "ソ": "katakana_so",
        "タ": "katakana_ta", "チ": "katakana_chi", "ツ": "katakana_tsu", "テ": "katakana_te", "ト": "katakana_to",
        "ナ": "katakana_na", "ニ": "katakana_ni", "ヌ": "katakana_nu", "ネ": "katakana_ne", "ノ": "katakana_no",
        "ハ": "katakana_ha", "ヒ": "katakana_hi", "フ": "katakana_fu", "ヘ": "katakana_he", "ホ": "katakana_ho",
        "マ": "katakana_ma", "ミ": "katakana_mi", "ム": "katakana_mu", "メ": "katakana_me", "モ": "katakana_mo",
        "ヤ": "katakana_ya", "ユ": "katakana_yu", "ヨ": "katakana_yo",
        "ラ": "katakana_ra", "リ": "katakana_ri", "ル": "katakana_ru", "レ": "katakana_re", "ロ": "katakana_ro",
        "ワ": "katakana_wa", "ヲ": "katakana_wo", "ン": "katakana_n", "ー": "katakana_prolonged_sound",
        "ァ": "katakana_small_a", "ィ": "katakana_small_i", "ゥ": "katakana_small_u", "ェ": "katakana_small_e", "ォ": "katakana_small_o",
        "ャ": "katakana_small_ya", "ュ": "katakana_small_yu", "ョ": "katakana_small_yo", "ッ": "katakana_small_tsu", "ヮ": "katakana_small_wa",
        "ガ": "katakana_ga", "ギ": "katakana_gi", "グ": "katakana_gu", "ゲ": "katakana_ge", "ゴ": "katakana_go",
        "ザ": "katakana_za", "ジ": "katakana_ji", "ズ": "katakana_zu", "ゼ": "katakana_ze", "ゾ": "katakana_zo",
        "ダ": "katakana_da", "ヂ": "katakana_di", "ヅ": "katakana_du", "デ": "katakana_de", "ド": "katakana_do",
        "バ": "katakana_ba", "ビ": "katakana_bi", "ブ": "katakana_bu", "ベ": "katakana_be", "ボ": "katakana_bo",
        "パ": "katakana_pa", "ピ": "katakana_pi", "プ": "katakana_pu", "ペ": "katakana_pe", "ポ": "katakana_po",
        "ヴ": "katakana_vu"
        };
    }
})();
