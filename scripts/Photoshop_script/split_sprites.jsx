/**
 * split_sprites.jsx
 * Photoshop スクリプト: アクティブレイヤーを個別PNGに自動分割
 *
 * インストール方法:
 *   このファイルを Photoshop/Presets/Scripts/ にコピーする
 *   split_sprites.py も同じフォルダに置く
 *
 * 使い方:
 *   ファイル → スクリプト → split_sprites
 */

#target photoshop

(function () {

  // ── Python スクリプトのパスを自動検出（JSXと同じフォルダ）
  var jsxFile  = new File($.fileName);
  var pyScript = new File(jsxFile.parent + '/split_sprites.py');

  if (!pyScript.exists) {
    alert('split_sprites.py が見つかりません。\n' + pyScript.fsName + '\nに置いてください。');
    return;
  }

  // ── 前回チェック値の永続保存先 (OS 適切な userData = Win: %APPDATA%, Mac: ~/Library/Preferences)
  var prefFile = new File(Folder.userData + '/split_sprites_prefs.json');
  function loadPrefs() {
    if (!prefFile.exists) return null;
    try {
      prefFile.encoding = 'UTF-8';
      prefFile.open('r');
      var raw = prefFile.read();
      prefFile.close();
      // ExtendScript の eval で JSON-ish を読む (信頼ソースのみなので OK)
      var p = eval('(' + raw + ')');
      if (typeof p !== 'object' || p === null) return null;
      return p;
    } catch (e) { return null; }
  }
  function savePrefs(p) {
    try {
      prefFile.encoding = 'UTF-8';
      prefFile.open('w');
      prefFile.writeln(
        '{"flipB":' + (p.flipB ? 'true' : 'false') +
        ',"square":' + (p.square ? 'true' : 'false') +
        ',"mergeAll":' + (p.mergeAll ? 'true' : 'false') +
        ',"mergeGap":' + (p.mergeGap || 0) +
        ',"lastFolder":"' + (p.lastFolder || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"}'
      );
      prefFile.close();
    } catch (e) { /* ignore — pref 保存失敗してもメイン処理は継続 */ }
  }
  var savedPrefs = loadPrefs() || { flipB: false, square: true, mergeAll: false, mergeGap: 0, lastFolder: '' };

  var doc = app.activeDocument;

  // ── アクティブレイヤーを一時PNGとして書き出し
  var tmpPng = new File(Folder.temp + '/ps_split_tmp.png');

  // 現在の表示レイヤーだけをPNG保存（他レイヤーを一時非表示）
  var allLayers = doc.layers;
  var prevVisibility = [];
  for (var i = 0; i < allLayers.length; i++) {
    prevVisibility[i] = allLayers[i].visible;
    allLayers[i].visible = (allLayers[i] === doc.activeLayer);
  }

  var pngOpts       = new PNGSaveOptions();
  pngOpts.interlaced = false;
  doc.saveAs(tmpPng, pngOpts, true, Extension.LOWERCASE);

  // 非表示を元に戻す
  for (var i = 0; i < allLayers.length; i++) {
    allLayers[i].visible = prevVisibility[i];
  }

  // 一時PNGが書き出せたか検証
  if (!tmpPng.exists || tmpPng.length === 0) {
    alert('一時PNGの書き出しに失敗しました:\n' + tmpPng.fsName);
    return;
  }

  // ── 出力フォルダを選択 (前回フォルダを初期値に)
  var initialFolder = null;
  if (savedPrefs.lastFolder) {
    var lastF = new Folder(savedPrefs.lastFolder);
    if (lastF.exists) initialFolder = lastF;
  }
  var outFolder = (initialFolder || Folder.desktop).selectDlg('分割PNGの保存先フォルダを選んでください');
  if (!outFolder) { tmpPng.remove(); return; }

  // ── 出力オプション (チェックボックス) を一括で確認
  var exportOptions = (function() {
    var dlg = new Window('dialog', '出力オプション');
    dlg.orientation = 'column';
    dlg.alignChildren = 'fill';
    dlg.margins = 20;
    dlg.spacing = 12;

    var msg = dlg.add('statictext', undefined,
      '分割PNGの出力オプションを選んでください。',
      { multiline: true });
    msg.preferredSize = [380, 24];

    var cbFlip = dlg.add('checkbox', undefined,
      'B画像（左右反転版）も出力する  → {name}_NNN_A.png と _B.png');
    cbFlip.value = !!savedPrefs.flipB;

    var cbSquare = dlg.add('checkbox', undefined,
      '全出力を 1:1 の正方形にする（長辺に合わせて透明パディング）');
    cbSquare.value = (savedPrefs.square !== false);

    var cbMergeAll = dlg.add('checkbox', undefined,
      '全部 1 つにまとめる（離れていても 1 ファイルに統合）');
    cbMergeAll.value = !!savedPrefs.mergeAll;

    var gapGroup = dlg.add('group');
    gapGroup.orientation = 'row';
    gapGroup.alignChildren = 'center';
    gapGroup.add('statictext', undefined, '結合距離 (px):');
    var etGap = gapGroup.add('edittext', undefined, String(savedPrefs.mergeGap || 0));
    etGap.characters = 6;
    gapGroup.add('statictext', undefined, '0=現状動作 / 1-100 = この距離以内なら同じ sprite');

    var btns = dlg.add('group');
    btns.alignment = 'center';
    btns.spacing = 10;
    var okBtn     = btns.add('button', undefined, 'OK', { name: 'ok' });
    var cancelBtn = btns.add('button', undefined, 'キャンセル', { name: 'cancel' });

    var result = { ok: false, flipB: false, square: false, mergeAll: false, mergeGap: 0 };
    okBtn.onClick     = function() {
      result.ok = true;
      result.flipB    = cbFlip.value;
      result.square   = cbSquare.value;
      result.mergeAll = cbMergeAll.value;
      var gapNum = parseInt(etGap.text, 10);
      if (isNaN(gapNum) || gapNum < 0) gapNum = 0;
      if (gapNum > 100) gapNum = 100;
      result.mergeGap = gapNum;
      // チェック値 + 保存先フォルダを次回に引き継ぐ
      savePrefs({
        flipB: result.flipB,
        square: result.square,
        mergeAll: result.mergeAll,
        mergeGap: result.mergeGap,
        lastFolder: outFolder.fsName
      });
      dlg.close(1);
    };
    cancelBtn.onClick = function() { dlg.close(2); };

    dlg.show();
    return result;
  })();

  if (!exportOptions.ok) { tmpPng.remove(); return; }
  var exportFlipB    = exportOptions.flipB;
  var exportSquare   = exportOptions.square;
  var exportMergeAll = exportOptions.mergeAll;
  var exportMergeGap = exportOptions.mergeGap;

  // ── Python 呼び出し（Windows: VBScript 経由、Mac: shell script 経由）
  var pyPath   = pyScript.fsName;
  var inPath   = tmpPng.fsName;
  var outPath  = outFolder.fsName;
  // レイヤー名をベース名として使用（ファイル名に使えない文字は_に置換）
  var baseName = doc.activeLayer.name.replace(/[\\\/:\*\?"<>\|]/g, '_');
  var modeParts = [];
  if (exportFlipB)        modeParts.push('A+B両方');
  if (exportSquare)       modeParts.push('1:1正方形');
  if (exportMergeAll)     modeParts.push('全部1つ');
  else if (exportMergeGap > 0) modeParts.push('結合距離 ' + exportMergeGap + 'px');
  var modeLabel = modeParts.length ? '（' + modeParts.join(' / ') + '）' : '（通常）';

  if ($.os.indexOf('Windows') !== -1) {
    // Windows: バッチで Python を同期実行し、stdout/stderr をログファイルに記録
    // → 終了コードが 0 でなければエラーログをユーザーに見せる
    var logFile = new File(Folder.temp + '/split_sprites_run.log');
    if (logFile.exists) logFile.remove();

    var batFile = new File(Folder.temp + '/split_sprites_run.bat');
    batFile.encoding = 'UTF-8';
    batFile.open('w');
    batFile.writeln('@echo off');
    batFile.writeln('chcp 65001 >nul');
    batFile.writeln('set PYTHONIOENCODING=utf-8');
    batFile.writeln('setlocal');
    batFile.writeln('set "PYCMD="');
    // Pillow を import できる Python を順番に探す (py ランチャーは別バージョンを掴むことがあるため)
    var candidates = [
      'python',
      'py -3.10', 'py -3.11', 'py -3.12', 'py -3.13',
      'py', 'python3'
    ];
    for (var ci = 0; ci < candidates.length; ci++) {
      batFile.writeln('if not defined PYCMD ' + candidates[ci] + ' -c "import PIL" >nul 2>&1 && set "PYCMD=' + candidates[ci] + '"');
    }
    batFile.writeln('if not defined PYCMD (');
    batFile.writeln('  echo ERROR: Pillow が import できる Python が見つかりません。 > "' + logFile.fsName + '"');
    batFile.writeln('  echo インストール: python -m pip install Pillow >> "' + logFile.fsName + '"');
    batFile.writeln('  exit /b 99');
    batFile.writeln(')');
    batFile.writeln('echo Using interpreter: %PYCMD% > "' + logFile.fsName + '"');
    var pyArgs =
      '"' + pyPath + '" "' + inPath + '" "' + outPath + '" "' + baseName + '"';
    if (exportFlipB)            pyArgs += ' --flip-b';
    if (exportSquare)           pyArgs += ' --square';
    if (exportMergeAll)         pyArgs += ' --merge-all';
    else if (exportMergeGap > 0) pyArgs += ' --merge-gap ' + exportMergeGap;
    batFile.writeln('%PYCMD% ' + pyArgs + ' >> "' + logFile.fsName + '" 2>&1');
    batFile.writeln('exit /b %errorlevel%');
    batFile.close();

    var exitCode = app.system('cmd.exe /c "' + batFile.fsName + '"');

    // ログ読み込み
    var logText = '(ログファイルが生成されませんでした)';
    if (logFile.exists) {
      logFile.encoding = 'UTF-8';
      logFile.open('r');
      logText = logFile.read();
      logFile.close();
    }

    // 一時PNG削除
    if (tmpPng.exists) tmpPng.remove();

    if (exitCode === 0) {
      // 成功時: アラートを出さず explorer も開かない (連続作業の邪魔にならないように)
      // ログは 失敗時に Folder.temp/split_sprites_run.log に残るのでデバッグ可
    } else {
      alert(
        'Python実行に失敗しました (exit code ' + exitCode + ')\n\n' +
        '実行バッチ: ' + batFile.fsName + '\n' +
        'ログ: ' + logFile.fsName + '\n\n' +
        '--- ログ ---\n' + logText
      );
    }
  } else {
    // Mac: bash スクリプトで実行 (ログ捕捉付き)
    var flipFlag   = exportFlipB  ? ' --flip-b' : '';
    var squareFlag = exportSquare ? ' --square' : '';
    var mergeFlag  = '';
    if (exportMergeAll)              mergeFlag = ' --merge-all';
    else if (exportMergeGap > 0)     mergeFlag = ' --merge-gap ' + exportMergeGap;
    var macLog = new File(Folder.temp + '/split_sprites_run.log');
    if (macLog.exists) macLog.remove();

    var sh = new File(Folder.temp + '/run_split.sh');
    sh.open('w');
    sh.writeln('#!/bin/bash');
    sh.writeln(
      'python3 "' + pyPath + '" "' + inPath + '" "' + outPath + '" "' + baseName + '"' +
      flipFlag + squareFlag + mergeFlag + ' > "' + macLog.fsName + '" 2>&1'
    );
    sh.writeln('echo $? > "' + macLog.fsName + '.exit"');
    sh.close();
    sh.changePath(Folder.temp + '/run_split.sh');
    app.system('chmod +x "' + sh.fsName + '" && "' + sh.fsName + '"');

    var logText2 = '';
    if (macLog.exists) {
      macLog.open('r'); logText2 = macLog.read(); macLog.close();
    }
    if (tmpPng.exists) tmpPng.remove();

    var exitCode2 = 0;
    var exitFile = new File(macLog.fsName + '.exit');
    if (exitFile.exists) {
      exitFile.open('r');
      exitCode2 = parseInt(exitFile.read(), 10) || 0;
      exitFile.close();
    }

    if (exitCode2 === 0) {
      // 成功時: アラート/Finder 自動オープンなし (連続作業の邪魔にならないように)
    } else {
      alert('Python実行に失敗しました (exit code ' + exitCode2 + ')\n\n--- ログ ---\n' + logText2);
    }
  }

})();
