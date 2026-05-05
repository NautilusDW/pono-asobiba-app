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
    cbFlip.value = false;

    var cbSquare = dlg.add('checkbox', undefined,
      '全出力を 1:1 の正方形にする（長辺に合わせて透明パディング）');
    cbSquare.value = true;

    var btns = dlg.add('group');
    btns.alignment = 'center';
    btns.spacing = 10;
    var okBtn     = btns.add('button', undefined, 'OK', { name: 'ok' });
    var cancelBtn = btns.add('button', undefined, 'キャンセル', { name: 'cancel' });

    var result = { ok: false, flipB: false, square: false };
    okBtn.onClick     = function() {
      result.ok = true;
      result.flipB  = cbFlip.value;
      result.square = cbSquare.value;
      dlg.close(1);
    };
    cancelBtn.onClick = function() { dlg.close(2); };

    dlg.show();
    return result;
  })();

  if (!exportOptions.ok) { tmpPng.remove(); return; }
  var exportFlipB   = exportOptions.flipB;
  var exportSquare  = exportOptions.square;

  // ── Python 呼び出し（Windows: VBScript 経由、Mac: shell script 経由）
  var pyPath   = pyScript.fsName;
  var inPath   = tmpPng.fsName;
  var outPath  = outFolder.fsName;
  // レイヤー名をベース名として使用（ファイル名に使えない文字は_に置換）
  var baseName = doc.activeLayer.name.replace(/[\\\/:\*\?"<>\|]/g, '_');
  var modeParts = [];
  if (exportFlipB)  modeParts.push('A+B両方');
  if (exportSquare) modeParts.push('1:1正方形');
  var modeLabel = modeParts.length ? '（' + modeParts.join(' / ') + '）' : '（通常）';

  if ($.os.indexOf('Windows') !== -1) {
    // Windows: VBScript で Python をサイレント実行
    // DQ = Chr(34) クォート変数を作って読みやすく組み立てる
    var vbs = new File(Folder.temp + '/run_split.vbs');
    vbs.open('w');
    vbs.writeln('Set sh = CreateObject("WScript.Shell")');
    vbs.writeln('DQ = Chr(34)');
    // コマンドを段階的に組み立てる
    vbs.writeln('cmd = "python " & DQ & "' + pyPath + '" & DQ');
    vbs.writeln('cmd = cmd & " " & DQ & "' + inPath + '" & DQ');
    vbs.writeln('cmd = cmd & " " & DQ & "' + outPath + '" & DQ');
    vbs.writeln('cmd = cmd & " " & DQ & "' + baseName + '" & DQ');
    if (exportFlipB) {
      vbs.writeln('cmd = cmd & " --flip-b"');
    }
    if (exportSquare) {
      vbs.writeln('cmd = cmd & " --square"');
    }
    vbs.writeln('sh.Run cmd, 0, True');
    // Python完了後に一時ファイルを削除してからダイアログ
    vbs.writeln('Set fso = CreateObject("Scripting.FileSystemObject")');
    vbs.writeln('If fso.FileExists("' + inPath + '") Then fso.DeleteFile "' + inPath + '"');
    vbs.writeln('MsgBox "分割完了！' + modeLabel + '" & Chr(10) & "' + outPath + '"');
    vbs.close();
    vbs.execute();
  } else {
    // Mac: bash スクリプトで実行
    var flipFlag   = exportFlipB  ? ' --flip-b' : '';
    var squareFlag = exportSquare ? ' --square' : '';
    var sh = new File(Folder.temp + '/run_split.sh');
    sh.open('w');
    sh.writeln('#!/bin/bash');
    sh.writeln('python3 "' + pyPath + '" "' + inPath + '" "' + outPath + '" "' + baseName + '"' + flipFlag + squareFlag);
    sh.writeln('open "' + outPath + '"');
    sh.close();
    sh.changePath(Folder.temp + '/run_split.sh');
    app.system('chmod +x "' + sh.fsName + '" && "' + sh.fsName + '"');
  }

  // tmpPng はVBScript/shell側でPython完了後に削除する

})();
