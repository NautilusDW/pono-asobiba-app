---
name: VOICEPEAK ユーザー辞書 VDC2 フォーマット解明 (2026-05-12)
description: .vdc2 は UTF-8 JSON 配列 (バイナリでない)。sur/pron/pos/priority/accentType/lang の 6 フィールド。Convert スクリプトで CSV から自動変換可能
type: reference
---

# VOICEPEAK VDC2 辞書フォーマット (解明済)

## 拡張子と中身
- **拡張子**: `.vdc2` (旧 `.vdc` から世代変わったらしい)
- **形式**: UTF-8 JSON 配列 (ヒューマンリーダブル、テキストエディタで開ける)
- **発見経緯**: Codex (2026-05-12) がユーザー提供のサンプル `testword.vdc2` を解析

## JSON フィールド構造
```json
[
  {
    "sur": "何色",
    "pron": "ナニイロ",
    "pos": "名詞",
    "priority": 5,
    "accentType": 0,
    "lang": "ja"
  },
  ...
]
```

| フィールド | 意味 | 例 |
|---|---|---|
| `sur` | surface (単語) | `"何色"` |
| `pron` | pronunciation (カナ読み) | `"ナニイロ"` |
| `pos` | part of speech (品詞) | `"名詞"` / `"動詞"` |
| `priority` | 優先度 | 1-10 (5 が標準) |
| `accentType` | アクセント核位置 (0=平板) | 0, 1, 2, ... |
| `lang` | 言語 | `"ja"` |

## CSV → VDC2 変換手順

### スクリプト
`tools/voicepeak/Convert-VoicepeakUserDictCsvToVdc2.ps1`

### 実行
```powershell
cd d:\AppDevelopment\pono-asobiba-app\tools\voicepeak
pwsh ./Convert-VoicepeakUserDictCsvToVdc2.ps1
# → voicepeak_user_dict.vdc2 が生成される
```

### 入力 CSV フォーマット
`tools/voicepeak/voicepeak_user_dict.csv` (5 列: 単語, 読み, アクセント核位置, 品詞)

### 出力 VDC2
`tools/voicepeak/voicepeak_user_dict.vdc2` (UTF-8 JSON 配列、VOICEPEAK で「辞書 → VDC インポート」で読み込める)

## VOICEPEAK 操作 (辞書登録)
1. ユーザー辞書管理画面を開く
2. 「インポート」 → `voicepeak_user_dict.vdc2` を選択
3. 65 語が一発で登録される

## 関連ファイル
- 変換スクリプト: `tools/voicepeak/Convert-VoicepeakUserDictCsvToVdc2.ps1`
- 入力 CSV: `tools/voicepeak/voicepeak_user_dict.csv` (65 語)
- 出力 VDC2: `tools/voicepeak/voicepeak_user_dict.vdc2`
- サンプル (Codex 解析用): `tools/voicepeak/test/testword.vdc2`
- HANDOFF.md line 20 (2026-05-12 by Codex) に経緯記録

## 将来の更新時
- 新語追加時は `voicepeak_user_dict.csv` を編集 → スクリプト再実行 → VDC2 再生成 → VOICEPEAK で再インポート (重複は VOICEPEAK 側で「マージ」or「置換」選択可)
