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

  // ── 出力フォルダを選択
  var outFolder = Folder.selectDialog('分割PNGの保存先フォルダを選んでください');
  if (!outFolder) { tmpPng.remove(); return; }

  // ── B画像（左右反転版）も出力するか確認
  var exportFlipB = confirm(
    'B画像（左右反転版）も出力しますか？\n\n' +
    'はい → {name}_NNN_A.png と {name}_NNN_B.png を両方出力\n' +
    'いいえ → {name}_NNN.png のみ（従来通り）'
  );

  // ── Python 呼び出し（Windows: VBScript 経由、Mac: shell script 経由）
  var pyPath   = pyScript.fsName;
  var inPath   = tmpPng.fsName;
  var outPath  = outFolder.fsName;
  // レイヤー名をベース名として使用（ファイル名に使えない文字は_に置換）
  var baseName = doc.activeLayer.name.replace(/[\\\/:\*\?"<>\|]/g, '_');
  var modeLabel = exportFlipB ? '（A+B両方）' : '（通常）';

  if ($.os.indexOf('Windows') !== -1) {
    // Windows: VBScript で Python をサイレント実行
    // Chr(34) でクォートを安全に埋め込む
    var flipArg = exportFlipB ? ' & " " & Chr(34) & "--flip-b" & Chr(34)' : '';
    var vbs = new File(Folder.temp + '/run_split.vbs');
    vbs.open('w');
    vbs.writeln('Set sh = CreateObject("WScript.Shell")');
    vbs.writeln('cmd = "python " & Chr(34) & "' + pyPath + '" & Chr(34) & " " & Chr(34) & "' + inPath + '" & Chr(34) & " " & Chr(34) & "' + outPath + '" & Chr(34) & " " & Chr(34) & "' + baseName + '" & Chr(34)' + flipArg);
    vbs.writeln('sh.Run cmd, 0, True');
    // Python完了後に一時ファイルを削除してからダイアログ
    vbs.writeln('Set fso = CreateObject("Scripting.FileSystemObject")');
    vbs.writeln('If fso.FileExists("' + inPath + '") Then fso.DeleteFile "' + inPath + '"');
    vbs.writeln('MsgBox "分割完了！' + modeLabel + '" & Chr(10) & "' + outPath + '"');
    vbs.close();
    vbs.execute();
  } else {
    // Mac: bash スクリプトで実行
    var flipFlag = exportFlipB ? ' --flip-b' : '';
    var sh = new File(Folder.temp + '/run_split.sh');
    sh.open('w');
    sh.writeln('#!/bin/bash');
    sh.writeln('python3 "' + pyPath + '" "' + inPath + '" "' + outPath + '" "' + baseName + '"' + flipFlag);
    sh.writeln('open "' + outPath + '"');
    sh.close();
    sh.changePath(Folder.temp + '/run_split.sh');
    app.system('chmod +x "' + sh.fsName + '" && "' + sh.fsName + '"');
  }

  // tmpPng はVBScript/shell側でPython完了後に削除する

})();
