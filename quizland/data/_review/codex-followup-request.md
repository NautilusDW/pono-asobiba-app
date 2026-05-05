# Codex Follow-up 依頼: image_manifest.json v1.1 化 + 不足画像生成

> このドキュメントを Codex に渡してください。1 往復で完結する依頼です。

---

## 必読

1. **`quizland/data/_review/codex-naming-contract.md`** v1.1
   - 重要: 末尾の「v1.1 改訂内容」セクション (context_tags 必須化, 既存資産優先ルール強化, 画像不要ホワイトリスト)
2. **`quizland/data/_review/image_manifest.json`** (現行 v1.0)
   - これを v1.1 に書き直してください
3. **`quizland/data/_review/missing_labels_categorized.json`**
   - 不足 101 label の分類結果 (a)/(b)/(c)
4. **`quizland/data/questions.js`**
   - 現行クイズデータ

---

## やってほしいこと (3 つ)

### Task 1: image_manifest.json を v1.1 化 (211 エントリ全部)

各エントリに `context_tags` を追加してください。値は v1.1 改訂セクションの語彙から選定:

```jsonc
{
  "id": "shape_circle",
  "save_path": "assets/images/quizland/illust/shape/shape_circle.png",
  "jp_labels": ["まる"],
  "context_tags": ["shape"],     // ← 追加必須
  ...
}
```

#### context_tags 推論ルール (フォルダ位置から)

| save_path のパターン | context_tags |
|---|---|
| `illust/shape/*.png` | `["shape"]` |
| `illust/color/*.png` | `["color"]` |
| `illust/weather/*.png` | `["weather"]` |
| `illust/animal/*.png` | `["animal"]` (鳥なら `["bird"]`、魚なら `["fish"]`、虫なら `["bug"]`) |
| `illust/choice/snowflake_*.png` | `["snowflake", "weather"]` |
| `illust/choice/face_smile/cry/angry/disappointed/scold/glare/speak/angry2.png` | `["face", "emotion"]` |
| `illust/choice/face_eye/mouth/nose/ear/cheek/forehead.png` | `["face", "body"]` |
| `illust/choice/pose_*.png` | `["posture"]` |
| `illust/choice/door_*.png` | `["door"]` |
| `illust/choice/prop_*.png` | `["prop"]` |
| `illust/choice/sky_*.png` | `["time_of_day"]` |
| `illust/choice/{neko,inu,zou,kuma,kirin,...}.png` | `["animal"]` |
| `illust/choice/{kabutomushi,chocho,batta,semi,kumo,mimizu}.png` | `["bug"]` |
| `illust/choice/{maguro,kujira,jinbeizame,sakana,tako,...}.png` | `["fish"]` |
| `illust/choice/{taka,penguin,hato,tsubame,niwatori}.png` | `["bird"]` |
| `illust/choice/{banana,ringo,ichigo,mikan,takenoko}.png` | `["food"]` |
| `illust/choice/{eucalyptus_leaf}.png` | `["plant"]` |
| `illust/choice/{cloud,smoke,cotton,star,sky,mountain,ocean,rain_drop,snow_flake,sand,ice}.png` | `["nature"]` (cloud は `["weather", "nature"]` で OK) |
| `illust/choice/{heart_organ,brain,skin,stomach,bone,teeth,lungs,finger,tongue,kaminoke,clothes,tsume,mane,horn,wing}.png` | `["body"]` |
| `illust/choice/{part_*}.png` | `["body", "animal"]` (動物の体パーツ) |
| `illust/choice/{ear_*}.png` | `["animal"]` (うさぎ等の耳形バリエーション) |
| `illust/choice/{color_dot_*}.png` | `["color"]` |
| `illust/stage/stage_*.png` | save_path とサブジェクトから個別判断 (例: `stage_weather_cloud_sky` → `["weather"]`、`stage_body_heart_pump` → `["body"]`) |

### Task 2: 既存ファイル reuse の追加 (Phase A の (a) 6 件)

`missing_labels_categorized.json` の `categories.reuseable` (6 件) を manifest に登録:

```jsonc
// 例
{
  "id": "arm_emoji",
  "save_path": "assets/images/ocean/Arm/Arm_normal_1.png",  // 既存ファイル
  "jp_labels": ["うで"],
  "context_tags": ["body"],
  "usage": ["stage", "choice"],
  "source_sheet": null,
  "subject_detailed": "腕のクローズアップ。既存 ocean/ から reuse",
  "alternatives": [],
  "status": "generated"
}
```

該当 6 件:
- うで → `assets/images/ocean/Arm/Arm_normal_1.png` (context: `["body"]`)
- おんどけい → `assets/images/ocean/Thermometer/Thermometer_normal_1.png` (context: `["nature", "weather"]`)
- かぜ → `assets/images/ocean/Wind/Wind_normal_1.png` (context: `["weather", "nature"]`)
- たつまき → `assets/images/ocean/Tornado/Tornado_normal_1.png` (context: `["weather", "nature"]`)
- て → `assets/images/ocean/Palm/Palm_normal_1.png` (context: `["body"]`)
- はれ → `assets/images/ocean/Sun/Sun_normal_1.png` (context: `["weather", "nature"]`)

### Task 3: 真の新規生成 (Phase A の (b) 37 件)

以下を生成して、`assets/images/quizland/illust/choice/<id>.png` に配置 + manifest に登録。
**この 37 件は `missing_labels_categorized.json` の `categories.need_generation` と完全一致** します。

> **補足**: 旧 v1.0 で言及されていた face_cry / face_disappointed の 2 件は、opposite 問題の
> `word:` フィールド (問題文の上に表示される単語) として登場するもので、choices: には含まれません。
> 現状ゲームはテキスト表示のみで成立するため、本タスクのスコープ外とします。
> 必要なら別途依頼しますが、今回は **choices: に出てくる 37 件だけ** に集中してください。

| jp_label | 提案 id | context_tags | 用途 |
|---|---|---|---|
| きり | `kiri` | `["weather", "nature"]` | trivia (朝の白いもや) |
| もよう | `moyou` | `["nature"]` | trivia |
| さくら | `sakura` | `["plant", "nature"]` | trivia |
| くさ | `kusa` | `["plant", "nature"]` | trivia |
| たけ | `take` | `["plant"]` | trivia |
| まつのき | `matsu_no_ki` | `["plant"]` | trivia |
| ふじさん | `mt_fuji` | `["nature", "place"]` | trivia (日本一高い山) |
| きりしまやま | `mt_kirishima` | `["nature", "place"]` | trivia |
| こうやさん | `mt_koya` | `["nature", "place"]` | trivia |
| のりくらさん | `mt_norikura` | `["nature", "place"]` | trivia |
| ゆきやま | `snow_mountain` | `["nature", "weather"]` | trivia |
| ゆきぐに | `snow_country` | `["nature", "weather"]` | trivia |
| ふゆのくに | `winter_country` | `["nature", "weather"]` | trivia |
| こおりのくに | `ice_country` | `["nature", "weather"]` | trivia |
| くもりのとき | `cloudy_time` | `["weather", "nature"]` | trivia |
| はれのとき | `sunny_time` | `["weather", "nature"]` | trivia |
| ゆきのとき | `snowy_time` | `["weather", "nature"]` | trivia |
| よるだけ | `night_only` | `["time_of_day"]` | trivia |
| ねむいから | `sleepy_reason` | `["emotion"]` | trivia |
| たべている | `eating_action` | `["action"]` | trivia |
| はしっている | `running_action` | `["action"]` | trivia |
| やすんでいる | `resting_action` | `["action"]` | trivia |
| わからない | `dont_know` | `["abstract"]` | trivia (?マーク等) |
| てもん | `temon` | `["body"]` | trivia |
| コケコッコー | `sound_kokekokko` | `["sound"]` | trivia (にわとり鳴き声) |
| モーモー | `sound_momo` | `["sound"]` | trivia (うし鳴き声) |
| ワンワン | `sound_wanwan` | `["sound"]` | trivia (いぬ鳴き声) |
| おおあめ | `heavy_rain` | `["weather", "nature"]` | emoji_name |
| おなか | `belly_part` | `["body"]` | emoji_name |
| かた | `shoulder_part` | `["body"]` | emoji_name |
| かみ | `hair_part` | `["body"]` | emoji_name |
| じしん | `earthquake` | `["nature"]` | emoji_name |
| つなみ | `tsunami` | `["nature", "weather"]` | emoji_name |
| なみ | `wave` | `["nature"]` | emoji_name |
| とけい | `clock` | `["object"]` | emoji_name |
| ものさし | `ruler` | `["object"]` | emoji_name |
| コップ | `cup` | `["object"]` | emoji_name |

> 注意: 鳴き声 (コケコッコー等) は文字をビジュアル化した「!? !」風の擬音マークか、対象動物を擬音気味に描いた絵で OK。
> 山名は具体的な特徴 (ふじさん = 雪を被った富士の形、きりしまやま = 火山っぽい形 等) で。

---

## 出力 (チャットに JSON 3 ファイルをコードブロックで貼り付け、UTF-8 BOM なし)

1. **新 `image_manifest.json`** (v1.1)
   - 全エントリに `context_tags` 付与
   - reuse 6 件 + 新規 37 件 = 43 件追加
   - 計 254 エントリ前後になる想定

2. **`gaps.json`** (空でも提出)
   - Task 3 で生成した分は manifest 側に入るので、gaps からは除外
   - 残るギャップが無ければ `{"missing_choices": []}` で OK

3. **`dedupe_proposal.json`**
   - 既存 30 件の重複案件は変更不要、そのまま再提出 OK

加えて、新規生成した 37 PNG は **チャットに添付 or ダウンロード可能リンク** で個別提供してください。

---

## 注意事項

- **画像不要ホワイトリスト** (contract v1.1 セクション 5) に該当する 58 件は **manifest 登録不要**、**生成不要**、**gaps.json 不要** です。完全スキップで OK。
- Codex の自然言語理解で context_tags を判断する際、不明なら `subject_detailed` から推論し、不明な場合は `["other"]` でも構いません (後で audit 側で見て手動修正)。
- 既存資産 reuse 案件 (Task 2 の 6 件) は新規生成厳禁。`save_path` は既存ファイルを指して、`status: "generated"` にしてください。
- v1.0 の既存エントリは `subject_detailed`, `alternatives`, `usage`, `source_sheet` をそのまま保持してください。**追加するのは `context_tags` だけ** です。

---

## 受領後のプロジェクト側ワークフロー (参考)

1. Claude Code が JSON 3 ファイルを `quizland/data/_review/` に配置
2. PNG 37 枚を `assets/images/quizland/illust/choice/` に配置
3. `python scripts/validate_image_manifest.py` で検証
4. audit.html を v1.1 対応 (context 駆動 lookup) に更新
5. staging で audit ページ確認 → 「画像必要」未生成バッジが 0 件になっていれば完了
