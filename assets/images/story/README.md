# ストーリー紙芝居用 画像

オープニング / エンディングで `_showStoryboard` が参照する画像を置く場所。

## 対応シーン

### オープニング (opening_1.png 〜 opening_10.png) — 全10ビート

2026-04-23 再マッピング。S1 / S2 / S5 を 2 ビートに分割、S3 / S4 / S6 / S7 は 1 ビート。

| ファイル | 元ファイル | シーン | 内容 |
|------|------|------|------|
| opening_1.png  | OP_S01_C01 | S1a | 王国 前半 |
| opening_2.png  | OP_S01_C02 | S1b | 王国 後半 |
| opening_3.png  | OP_S02_C01 | S2a | 姫 前半 |
| opening_4.png  | OP_S02_C02 | S2b | 姫 後半 |
| opening_5.png  | OP_S03     | S3  | ふしぎな ひかり |
| opening_6.png  | OP_S04     | S4  | まおう の てさき |
| opening_7.png  | OP_S05_C01 | S5a | つれさられる 前半 |
| opening_8.png  | OP_S05_C02 | S5b | つれさられる 後半 |
| opening_9.png  | OP_S06     | S6  | おうさま の さけび |
| opening_10.png | OP_S07     | S7  | ゆうしゃ しょうしゅう |

### エンディング (ending_1.png 〜 ending_4.png)

| ファイル | シーン | 想定絵柄 |
|------|------|------|
| ending_1.png | 振り返り | 3 妖精の姿（旅の象徴） |
| ending_2.png | 焚き火 | 森の夜、焚き火と妖精3人 |
| ending_3.png | 星空 | 夜空と星、静かな余韻 |
| ending_4.png | 決意 | 遠景に魔王城、勇者の決意 |

## 仕様

- 推奨アスペクト比: **16:9 (横長)** または **4:3**
- 推奨最小サイズ: 1280×720
- フォーマット: PNG (または WEBP)
- ファイル名は上記固定 (JS の `OPENING_SCENES` / `ENDING_SCENES` がハードコード参照)
- 画像が存在しない場合は絵文字（🏰👸⚔️ 等）にフォールバックするので、段階的に追加して OK
