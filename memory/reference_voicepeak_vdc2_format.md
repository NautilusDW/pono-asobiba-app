---
name: VOICEPEAK ユーザー辞書 VDC2 フォーマット解明 + 完全ラウンドトリップ対応 (2026-05-12)
description: .vdc2 は UTF-8 JSON 配列。sur/pron/pos/priority/accentType/lang + 任意 overwriteAccents の 6+1 フィールド。CSV を 5 カラム化して順方向 + 逆方向の両 PowerShell スクリプトで完全ラウンドトリップ可能になった (2026-05-12)
type: reference
---

# VOICEPEAK VDC2 辞書フォーマット (解明済 + 完全ラウンドトリップ対応)

## 拡張子と中身
- **拡張子**: `.vdc2` (旧 `.vdc` から世代変わったらしい)
- **形式**: UTF-8 JSON 配列 (ヒューマンリーダブル、テキストエディタで開ける)
- **発見経緯**: 2026-05-12 にユーザー提供のサンプル `testword.vdc2` を解析。 同日中に `overwriteAccents` (モーラ単位の音高微調整) フィールドの存在も確認、 完全ラウンドトリップ (CSV ↔ VDC2 両方向で全フィールドが完全一致) が成立した。

## JSON フィールド構造
```json
[
  {
    "sur": "あか",
    "pron": "アカ",
    "pos": "Japanese_Futsuu_meishi",
    "priority": 5,
    "accentType": 0,
    "overwriteAccents": [8193, 8192],
    "lang": "ja"
  },
  ...
]
```

| フィールド | 意味 | 例 | 必須 |
|---|---|---|---|
| `sur` | surface (単語) | `"あか"` | 必須 |
| `pron` | pronunciation (カナ読み) | `"アカ"` | 必須 |
| `pos` | part of speech (品詞、 内部 ID) | `"Japanese_Futsuu_meishi"` (現状観測されているのはこれのみ) | 必須 |
| `priority` | 優先度 | 1-10 (5 が標準) | 必須 |
| `accentType` | アクセント核位置 (0=平板) | 0, 1, 2, ... | 必須 |
| `overwriteAccents` | モーラ単位の音高微調整 (整数配列、 GUI で手動調整した結果) | `[8193, 8192]` | 任意 |
| `lang` | 言語 | `"ja"` | 必須 |

### `pos` (品詞 ID) マッピング表

**重要 (2026-05-12 ユーザー指摘で確定)**: VOICEPEAK GUI の品詞ドロップダウンには **名詞系のみ** しか存在しない。 `動詞` / `形容詞` / `副詞` は VOICEPEAK では選択肢が出ない (例: 「吸う」 を 動詞 として登録しようとしても GUI 上不可)。 GUI で選べる選択肢は以下のみ:

- `普通名詞`
- `固有名詞:一般`
- `固有名詞:人名`
- `固有名詞:姓`
- `固有名詞:名`
- `固有名詞:地域`

VOICEPEAK 内部はアンダースコア区切りローマ字 ID で品詞を表現する。 CSV 4 列目に書く和名から以下のように相互変換する:

| CSV 和名 | VDC2 内部 ID | 備考 |
|---|---|---|
| `名詞` (または `普通名詞`) | `Japanese_Futsuu_meishi` | 現行 66 件すべてこれ。 test.vdc2 で実証済 |
| 未知/空 | `Japanese_Futsuu_meishi` (フォールバック) | - |

**固有名詞系 (`一般` / `人名` / `姓` / `名` / `地域`) の内部 ID は未確認。** 必要になったら GUI で 1 語登録 → export で実 ID を確認してからスクリプトに追記すること。 推測 ID をハードコードしない (誤った ID でインポートすると VOICEPEAK が無視 or エラーする恐れあり)。

逆方向 (VDC2 → CSV) も上記表の逆引きで対応 (未知 ID は `名詞` にフォールバック)。

### `overwriteAccents` の値域

- 整数配列、 長さは pron のモーラ数と一致 (例: `アカ` 2 モーラ → 長さ 2 配列)
- 観測値: `8192` / `8193` (= 0x2000 / 0x2001) の 2 値、 おそらく「下げる/上げる」 のフラグ
- 完全に欠けている (フィールド未指定) と空配列の意味は別: 欠けていれば「未指定 (= accentType の核位置どおり)」、 空配列はおそらくエラー扱いなので避ける
- ユーザーが GUI でモーラ単位の音高を手動調整して export した結果のみに出現

## CSV → VDC2 変換手順 (順方向)

### スクリプト
`tools/voicepeak/Convert-VoicepeakUserDictCsvToVdc2.ps1`

### 実行
```powershell
cd d:\AppDevelopment\pono-asobiba-app\tools\voicepeak
powershell -ExecutionPolicy Bypass -File .\Convert-VoicepeakUserDictCsvToVdc2.ps1
# → voicepeak_user_dict.vdc2 が生成される
```

### 入力 CSV フォーマット (5 カラム)
`tools/voicepeak/voicepeak_user_dict.csv`

```
単語,読み,アクセント核位置,品詞,モーラ音高
なにいろ,ナニイロ,0,名詞,
あか,アカ,0,名詞,8193;8192
吸う,スウ,1,名詞,
肺,ハイ,0,名詞,8192;8193
...
```

- 5 列目「モーラ音高」 は `;` 区切りの整数リスト (例: `8193;8192`)
- 空なら `overwriteAccents` フィールドを VDC2 に出力しない (省略)
- 値があれば VDC2 に `overwriteAccents` 配列として書き出す

### 出力 VDC2
`tools/voicepeak/voicepeak_user_dict.vdc2` (UTF-8、 BOM なし、 JSON 配列、 VOICEPEAK で「辞書 → VDC インポート」 で読み込める)

## VDC2 → CSV 変換手順 (逆方向 = 2026-05-12 新規)

### スクリプト
`tools/voicepeak/Convert-VoicepeakUserDictVdc2ToCsv.ps1`

### 用途
- VOICEPEAK GUI で手動微調整 → ユーザー辞書 export → `.vdc2` 取得
- その GUI 微調整値 (特に `overwriteAccents`) を CSV 側に取り込んで永続化したい

### 実行
```powershell
cd d:\AppDevelopment\pono-asobiba-app\tools\voicepeak
# デフォルト (voicepeak_user_dict.vdc2 → voicepeak_user_dict.csv)
powershell -ExecutionPolicy Bypass -File .\Convert-VoicepeakUserDictVdc2ToCsv.ps1

# 任意のファイル (例: ユーザーが新規 export した test.vdc2 を取り込む)
powershell -ExecutionPolicy Bypass -File .\Convert-VoicepeakUserDictVdc2ToCsv.ps1 `
  -InputVdc2 .\test\test.vdc2 -OutputCsv .\voicepeak_user_dict.csv
```

### 出力 CSV
- 5 カラム (`単語,読み,アクセント核位置,品詞,モーラ音高`)
- 文字コード: UTF-8、 BOM なし
- 改行: CRLF (Excel 互換)
- `overwriteAccents` (配列) は `;` 区切りの整数リストとして 5 列目に
- pos は和名にデコード (`Japanese_Futsuu_meishi → 名詞` 等)

## 完全ラウンドトリップ可能になった (2026-05-12)

順方向 (CSV → VDC2) + 逆方向 (VDC2 → CSV) の両スクリプトを Python json.load 比較で検証:

> test.vdc2 (65 entries) → 逆変換 → 一時 CSV → 順変換 → 一時 VDC2 → 元 test.vdc2 と全 65 エントリ × 全 7 フィールド (`sur` / `pron` / `pos` / `priority` / `accentType` / `lang` / `overwriteAccents`) が **完全一致**。

これにより以下が安全に運用可能:
- ユーザーが VOICEPEAK GUI でモーラ音高を微調整 → export → 逆変換で CSV に反映 → git commit (永続化)
- CSV 側で他の辞書語彙を追加・編集 → 順変換 → VDC2 再生成 → import (微調整値も保たれたまま)

## VOICEPEAK 操作 (辞書登録)
1. ユーザー辞書管理画面を開く
2. 「インポート」 → `voicepeak_user_dict.vdc2` を選択
3. 65 語が一発で登録される
4. (微調整したい場合) GUI で個別に編集 → 「エクスポート」 で `.vdc2` 取得 → 逆変換スクリプトで CSV に取り込み

## 関連ファイル
- 順方向スクリプト: `tools/voicepeak/Convert-VoicepeakUserDictCsvToVdc2.ps1`
- 逆方向スクリプト: `tools/voicepeak/Convert-VoicepeakUserDictVdc2ToCsv.ps1` (2026-05-12 新規)
- 入力/編集元 CSV: `tools/voicepeak/voicepeak_user_dict.csv` (65 語、 5 カラム化済、 5 件で `overwriteAccents` 値あり: あか / あお / みどり / オレンジ / 肺)
- 出力 VDC2: `tools/voicepeak/voicepeak_user_dict.vdc2` (test.vdc2 と完全一致)
- 正本サンプル (GUI 編集後 export): `tools/voicepeak/test/test.vdc2`
- README: `tools/voicepeak/README.md` (本文セクションを 5 カラム + ラウンドトリップ対応に書き換え済)

## 将来の更新時
- **新語追加**: CSV 編集 → 順方向スクリプト実行 → VDC2 再生成 → VOICEPEAK で再インポート (重複は VOICEPEAK 側で「マージ」or「置換」 を選択)
- **GUI で微調整した結果を CSV に取り込む**: VOICEPEAK で export → 逆方向スクリプト実行 → CSV に `overwriteAccents` 反映 → commit
- **PowerShell スクリプトは ASCII-only** (Windows PowerShell 5.1 が UTF-8 BOM なしの非 ASCII ソースを parse できないため、 日本語ラベルは `[char]0xXXXX` で構築)。 編集時にはこの制約を維持すること
