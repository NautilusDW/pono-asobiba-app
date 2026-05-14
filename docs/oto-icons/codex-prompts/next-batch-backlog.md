# 音タッチ ボタン 次回バッチ backlog (3 枚)

前回 Phase1 で不足/弱い 3 枚を Codex に追加発注する。スタイルは既にデプロイ済の 21 枚と完全に揃える: ステッチ風円形 (クリーム背景, 縁に同色破線, 中央に可愛らしいイラスト, 既存21枚と質感統一)

## 不足 3 枚

| 役割 | 出力ファイル名 | モチーフ案 | 色相 | 備考 |
|---|---|---|---|---|
| ソ (水色音符差替) | btn_note_so.png | 水色のかわいいモチーフ (青空/水玉/水色の鳥/水色の宝石 等、水色がはっきり出るもの) | #3FD0E0 系 | 現状は鍵で代用しているが本来の水色ではない |
| 🔁 ループ (UI制御) | btn_ui_loop.png | 循環矢印 (リピートマーク) | 鮮やかな単色推奨 | DOM L783 で既に表示中の要素 |
| 💾 ほぞん (UI制御) | btn_ui_save.png | フロッピーディスク or 宝箱 or 保存箱 | 茶系 or 紺系 | 将来実装予定機能の予約 UI |

## スタイル指針 (既存21枚と統一)

- 円形 (約 400 × 400 px、透過 PNG)
- 縁: 同色の二重ステッチ (内側点線 + 外側破線)、クリーム/薄ベージュ背景
- 中央: 単一の可愛らしいイラスト、塗りはツヤ + ハイライトあり、輪郭線あり
- 透過背景推奨 (円の外側は完全に透明)
- 絵本系/水彩系の柔らかさ OK (前回方針変更によりステッチ風 = OK)
- 既にデプロイ済の 21 枚 (`assets/images/oto/buttons/btn_note_do.png` 〜 `btn_ui_help.png`) と質感・線の太さ・ステッチ密度を完全一致させること

## 参考: 既存 21 枚 (リポジトリ内パス)

```
assets/images/oto/buttons/
  btn_note_do.png         btn_note_re.png         btn_note_mi.png
  btn_note_fa.png         btn_note_so.png         btn_note_la.png
  btn_note_si.png         btn_note_do_high.png
  btn_set_doremi.png      btn_set_kira.png        btn_set_marimba.png
  btn_set_blip.png        btn_set_taiko.png       btn_set_animal.png
  btn_speed_slow.png      btn_speed_normal.png    btn_speed_fast.png
  btn_ui_scale.png        btn_ui_rec.png          btn_ui_menu.png
  btn_ui_help.png
```

新規 3 枚はこのフォルダに同名で追加する想定。

## Codex 発注プロンプト (コピペ用)

```
あなたは子供向け Web 知育アプリ「ポノのおへや / 音タッチ」のアイコンデザイナーです。
既にデプロイ済みのステッチ風ボタン 21 枚と完全に同じスタイル・質感で、
不足している 3 枚の追加ボタン PNG を生成してください。

【既存スタイル (厳守)】
- 円形 (約 400 × 400 px、透過 PNG、円の外側は完全透明)
- 縁: クリーム/薄ベージュ背景の円板に、同色トーンの二重ステッチ
  (内側点線 + 外側破線) を施す
- 中央: 単一モチーフのかわいいイラスト1点。塗りはツヤとハイライトあり、
  輪郭線あり。絵本系/水彩系の柔らかい雰囲気で OK
- 線の太さ、ステッチ密度、ハイライトの強さ、影の落とし方は
  既存 21 枚 (btn_note_do.png 〜 btn_ui_help.png) と
  並べたときに違和感ゼロになるよう完全に揃えること
- 文字や記号は入れない (純粋にイラストのみ)

【生成する 3 枚】

1. btn_note_so.png — ドレミの「ソ」用、水色音符差替アイコン
   - モチーフ案: 水色のかわいいモチーフ (青空 / 水玉 / 水色の小鳥 /
     水色の宝石 / 水しずく など、水色がはっきり出るもの)
   - 主色: #3FD0E0 系の水色
   - 用途: ドレミファソラシド の "ソ" を表す音符ボタン
   - NG: 現状は鍵モチーフで代用されているが、本来の水色を出したいので
     鍵以外のモチーフで再設計すること

2. btn_ui_loop.png — ループ (UI 制御)
   - モチーフ案: 循環矢印 / リピートマーク (🔁 のイラスト化)
   - 主色: 鮮やかな単色推奨 (緑 or オレンジ系)
   - 用途: 再生のループ ON/OFF トグル

3. btn_ui_save.png — ほぞん (UI 制御、将来機能予約)
   - モチーフ案: フロッピーディスク / 宝箱 / 保存箱 のいずれか
   - 主色: 茶系 or 紺系
   - 用途: 録音やプリセット保存ボタン (将来実装)

【出力】
- 透過 PNG 3 枚
- ファイル名: btn_note_so.png / btn_ui_loop.png / btn_ui_save.png
- 既存 21 枚と並べたモックアップ画像も 1 枚添付すると尚良し
  (整合性チェック用)

【最重要】
質感のばらつきは絶対 NG。既存 21 枚との「並べたときの違和感ゼロ」を
最優先で評価する。少しでもステッチや塗りが浮く場合はやり直すこと。
```

## 配置先

生成後、以下のパスに直接配置する:

```
d:/AppDevelopment/pono-asobiba-app/assets/images/oto/buttons/btn_note_so.png      (上書き)
d:/AppDevelopment/pono-asobiba-app/assets/images/oto/buttons/btn_ui_loop.png      (新規)
d:/AppDevelopment/pono-asobiba-app/assets/images/oto/buttons/btn_ui_save.png      (新規)
```

配置後は `sw.js` の `CACHE_VERSION` をバンプしてデプロイすること
(AGENTS.md の sw.js キャッシュバージョン規約に従う)。
