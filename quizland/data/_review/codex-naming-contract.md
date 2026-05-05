# Codex 画像生成パイプライン 命名契約 (Naming Contract)

> **このドキュメントは Codex 用です。** 画像を生成または棚卸しする際は、必ずこの契約に従ってください。
> 違反するとクイズ本体での画像表示が壊れ、重複生成のコストが発生します。

---

## なぜこの契約があるのか

過去の生成サイクルで以下の問題が発生しました:

1. **JP→英 ID マッピングの齟齬**
   - 例: 選択肢「くもり」が画像 `cloud` と紐付いてないため、未生成扱いされる
   - 原因: 命名対応表が存在せず、自然言語の説明文 (`subject_detailed`) からの推測に頼っていた
2. **既存資産の重複生成**
   - 例: `assets/images/ocean/Cloud/Cloud_normal_1.png` (stage 用) が既に存在するのに、選択肢用に別の `cloud.png` を生成
   - 例: `face_eye.png` を 4 つの異なるシートで再生成
3. **生成完了台帳の更新漏れ**
   - `_completed_codex_assignment.json` が古いまま、何が出来てるか不明に

→ 今後はすべての生成を **`image_manifest.json` 単一源** で管理し、Codex が自律的に重複防止・既存活用・台帳更新までやる体制にします。

---

## 1. マニフェスト必須スキーマ

**ファイル**: `quizland/data/_review/image_manifest.json`

```jsonc
{
  "version": 1,
  "generated_at": "2026-05-05T...",       // ISO 8601
  "images": [
    {
      "id": "heart_organ",                 // ASCII snake_case、save_path のファイル名と一致
      "save_path": "assets/images/quizland/illust/choice/heart_organ.png",
      "jp_labels": ["しんぞう"],            // questions.js の choice text と byte-for-byte 一致 (配列)
      "usage": ["choice"],                 // ["choice"] / ["stage"] / ["choice","stage"]
      "source_sheet": "choice_body_pump_set", // 由来シート ID。個別生成なら null
      "subject_detailed": "心臓のクローズアップ、ピンク色、左右の心房・心室、子供向け...",
      "alternatives": [],                  // 同概念の既存画像パス (cross-domain reuse 候補)
      "status": "generated"                // "generated" | "planned" | "deferred"
    },
    {
      "id": "cloud_choice",
      "save_path": "assets/images/quizland/illust/choice/cloud.png",
      "jp_labels": ["くもり", "くも"],
      "usage": ["choice", "stage"],
      "source_sheet": "choice_weather_cloud_set",
      "subject_detailed": "灰色寄りの雲1個、ふくらみのある形",
      "alternatives": [
        "assets/images/ocean/Cloud/Cloud_normal_1.png"  // ← 既存の stage 用も同概念
      ],
      "status": "generated"
    }
  ]
}
```

### フィールド詳細

| フィールド | 型 | 必須 | ルール |
|---|---|---|---|
| `id` | string | ✓ | ASCII snake_case のみ。1 概念 1 id。バリエーションは `_v2`/`_alt` サフィックスで区別 |
| `save_path` | string | ✓ | プロジェクトルートからの相対パス。`assets/images/...` で始まる |
| `jp_labels` | string[] | ✓ | 1 つ以上。`questions.js` の choice text と **完全一致** (空白・濁点まで) |
| `usage` | string[] | ✓ | `"choice"` / `"stage"` のいずれか or 両方。`choice` は 4択チップ用 (40-80px)、`stage` は問題ボード用 (1024×1024) |
| `source_sheet` | string \| null | ✓ | 由来シート ID。個別生成なら `null` |
| `subject_detailed` | string | ✓ | 構図・色・特徴の説明 (再生成時の参考用) |
| `alternatives` | string[] | ✓ | 同概念の既存画像パス。空配列でも OK |
| `status` | string | ✓ | `"generated"`(完了) / `"planned"`(計画済み未着手) / `"deferred"`(意図的に保留) |

---

## 2. 生成前の重複チェック義務 (CRITICAL)

新規生成の依頼を受けたら、Codex は **必ず以下の順序で事前スキャン** すること。1 つでも該当があれば新規生成を**しない**。

### スキャン対象

1. **現行 `image_manifest.json`** の全 `images[]`
   - 各エントリの `jp_labels` と新規依頼の choice text を照合
   - 一致したら → 既存 `save_path` を `alternatives` に記録、生成スキップ

2. **クロスドメインフォルダの既存ファイル**
   - `assets/images/quizland/illust/**/*.png` (選択肢用)
   - `assets/images/ocean/**/*.png` (stage 用、ファイル名が JP 概念に対応している場合あり)
   - `assets/images/word/**/*.png` (古い stage 用)
   - 一致したら → manifest にエントリ追加 (新規生成ではなく既存登録)

3. **同概念の英名チェック** (jp_label が無い場合の保険)
   - 例: 依頼が「雲のアイコン」なら、`cloud`, `Cloud`, `kumo` を含むファイルを検索
   - 該当があれば、それを reuse か新規生成かをユーザーに確認

### 重複検出時の挙動

```
[Codex 出力例]
重複検出: 依頼された "くもり" 用画像は既に存在します:
  - assets/images/quizland/illust/choice/cloud.png (manifest 登録済)
  - assets/images/ocean/Cloud/Cloud_normal_1.png (manifest 未登録 — 追加します)

新規生成は不要です。manifest を以下のように更新します: ...
```

---

## 3. 命名規則

### id の命名

- ASCII snake_case **のみ** (大文字・ハイフン禁止)
- 1 概念 1 id (バリエーションは `_v2` `_alt` `_smile` 等のサフィックス)
- sheet 由来の id は所属 sheet の prefix を踏襲する慣習に従う:
  - `choice_body_pump_set` の crops → `heart_organ`, `brain`, `skin`, `stomach`
  - `sheet_animal_extras` の crops → `zou`, `neko`, `usagi`, ...

### save_path の決め方

| 種類 | 配置先 |
|---|---|
| 選択肢用 (chip) | `assets/images/quizland/illust/choice/<id>.png` |
| stage 用 (大きな1枚絵) | `assets/images/quizland/illust/stage/<id>.png` |
| 中間生成シート | `assets/images/quizland/illust/_sheets/<sheet_id>.png` |
| カテゴリ別フォルダ | `assets/images/quizland/illust/{color,shape,weather,animal}/<id>.png` |
| 既存 stage の上書き | `assets/images/{ocean,word}/<existing_path>.png` (legacy 互換) |

### jp_labels のルール

- **byte-for-byte で一致** が必須 (空白・濁点・句読点まで完全一致)
- questions.js の `choices: ['しんぞう', 'のう', 'ひふ', 'い']` に対し、`jp_labels: ["しんぞう"]` のように個別エントリ
- 同義語は配列で複数登録可: `["くもり", "くも"]`、`["ねこ", "猫"]` 等
- 必ず 1 つ以上

---

## 4. usage の判定基準

| usage 値 | 用途 | 表示サイズ目安 | 判定基準 |
|---|---|---|---|
| `choice` | 4択ボタン内に小さく表示 | 40-80px | 一瞬で識別可能なシンプルな絵 |
| `stage` | 問題ボード中央の大きな1枚絵 | 1024×1024 | 情景・比較・原因説明を視覚化 |
| `choice` + `stage` | 両方で使える | (両対応) | シンプル + 大きく拡大しても見栄えする (cloud 等) |

**重要**: `choice` 用と `stage` 用が同じ概念ならなるべく `["choice", "stage"]` にして reuse を増やす。クロップ違いで分けるなら `_choice` `_stage` サフィックスで別 id にする。

---

## 5. 生成完了時の更新義務

各生成サイクル終了時、以下を **必ず** 実施して提出すること。

### 提出物 (Codex のチャット出力)

1. **`image_manifest.json` (フル)**
   - 全 `images[]` を含む完全版
   - 既存エントリは保持しつつ、新規エントリを追加 (再生成画像は status/timestamp 更新)

2. **`gaps.json`**
   - questions.js の choice text のうち、manifest の jp_labels で解決できないものの一覧
   - 真の未生成リスト (次サイクルの依頼ベース)
   ```json
   {
     "generated_at": "...",
     "missing_choices": [
       {
         "choice_text": "がっかり",
         "questions_using_it": ["opposite/level2/idx5"],
         "suggested_id": "face_disappointed",
         "suggested_path": "assets/images/quizland/illust/choice/face_disappointed.png"
       }
     ]
   }
   ```

3. **`dedupe_proposal.json`**
   - 同じ画像を複数 sheet で生成した重複の整理案
   - どれを正 (primary)、どれを reference 化するか
   ```json
   {
     "duplicates": [
       {
         "id": "face_eye",
         "sheets": ["choice_body_smell_face_set", "choice_body_see_face_set", "choice_body_hear_face_set", "choice_body_chew_set"],
         "primary_sheet": "choice_body_chew_set",
         "action": "他 sheet では再生成せず、primary を reference"
       }
     ]
   }
   ```

### 提出方法

- チャット応答に **3 つの JSON をコードブロックで貼り付け** (UTF-8 BOM なし)
- ファイルとして直接 commit はしない (Claude Code 側で受領 → 配置)

### 重複検出時の手順

生成サイクル冒頭で重複を検出した場合は、**生成を始める前に報告して指示を仰ぐ**こと。

```
[Codex 報告例]
重複検出: 今回依頼された 4 件のうち、以下 2 件は既に生成済みです:
- "くもり" → assets/images/quizland/illust/choice/cloud.png (既存)
- "あめ" → assets/images/quizland/illust/choice/rain_drop.png (既存)

残り 2 件 ("きり", "もや") のみ新規生成しますが、よろしいですか?
```

---

## 6. legacy ファイルの位置付け

過去のサイクルで使われていた以下のファイルは **legacy 参考情報** として残しますが、**新サイクルでは更新しなくて OK** です:

- `_completed_codex_assignment.json` — 旧式の完了 ID リスト (manifest の `images[].status === "generated"` で代替)
- `_choice_jp_to_id.json` — auto抽出マップ (manifest の `jp_labels` で代替)
- `_choice_jp_to_id_overrides.json` — 手動オーバーライド (manifest で吸収)
- `_disk_inventory.json` — ディスク棚卸し (manifest が source of truth)
- `_handoff_audit.json` — handoff 突き合わせ結果 (manifest 移行で不要)

`codex_assignment.md/json` (元の指示書) は仕様参考のため残します。新規依頼時はこの contract を主、assignment を従として参照してください。

---

## 7. 検証 (プロジェクト側で実行)

Codex から manifest を受領後、プロジェクト側で以下を実行して整合性を検証します:

```bash
python scripts/validate_image_manifest.py
```

### チェック項目

- [ ] 各 `save_path` がディスク上に実在するか (orphans 検出)
- [ ] 重複 (同じ `save_path` が複数エントリにある) が無いか
- [ ] `id` と `save_path` のファイル名が一致しているか
- [ ] questions.js の choice text 全てが少なくとも 1 つの manifest エントリの `jp_labels` で解決できるか (gaps 検出)
- [ ] `usage` が valid な値か
- [ ] `status` が valid な値か

違反があれば exit code 1 + 詳細レポート。マージ前必須。

---

## 8. 既存 211 PNG の棚卸し (初回タスク)

この契約導入時の **初回タスク** として、Codex に以下を依頼します:

> 現状ディスクに存在する全 211 PNG を再認識し、`image_manifest.json` を完全に書き起こしてください。
> 各画像について:
> - id, save_path はディスク状態から確定
> - jp_labels は `questions.js` の choices と byte-for-byte 一致するもの (画像が表現する概念に対応する和名)
> - usage は実際の使用箇所から判断
> - source_sheet は `_sheets_index.json` から導出
> - alternatives は ocean/word 等の同概念既存ファイルを横断スキャン
> - subject_detailed は `codex_assignment.json` の既存記述を移植 (なければ画像から推測)
> - status は全て `"generated"` (既にディスクにあるため)
>
> 加えて `gaps.json` (本当に未生成なもの) と `dedupe_proposal.json` (30 件の重複の整理案) も提出。

---

## チェックリスト (Codex セルフチェック用)

新規生成サイクル開始前:

- [ ] `image_manifest.json` を読み、既存エントリを把握した
- [ ] `assets/images/quizland/illust/`, `assets/images/ocean/`, `assets/images/word/` をスキャンして既存資産を確認した
- [ ] 依頼された各 choice text を既存 `jp_labels` と照合した
- [ ] 重複検出があれば、生成前に報告した

新規生成サイクル終了時:

- [ ] manifest 全体を更新した (新規エントリ追加 + 既存変更があれば反映)
- [ ] 全エントリに必須フィールド (id, save_path, jp_labels, usage, source_sheet, subject_detailed, alternatives, status) が揃っている
- [ ] jp_labels が questions.js と byte-for-byte 一致している
- [ ] gaps.json を更新した
- [ ] dedupe_proposal.json を更新した
- [ ] チャット出力で 3 ファイル (manifest / gaps / dedupe) を提出した

---

**契約バージョン**: 1.0 (2026-05-05)
**問い合わせ**: 不明点があれば生成前に確認してください。生成後の修正は手戻りが大きいです。
