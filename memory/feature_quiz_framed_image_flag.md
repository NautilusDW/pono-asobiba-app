---
name: Quiz Framed Image Flag
description: 背景シーン入りの stage 画像 (rainbow / 風景 / 室内 / 草地ヴィネット等) に共通 drop-shadow を入れない仕組み。questions.js の framed/framed_answer フラグでスロット単位 opt-in
type: feature
---

# Quiz Framed Image Flag

**Status:** Implemented (2026-05-08), 全画像 audit 適用済 (2026-05-08 21時台)
**Type:** Feature — UX / Visual

---

## Why

Codex 発注の stage 画像には大きく 2 系統ある:

| 系統 | 例 | drop-shadow を入れた時の見え方 |
|---|---|---|
| 背景入り (FRAMED) | rainbow_arc / deep_breath (boy in tree+grass scene) / morning_clear (mountain landscape) / munching (boy with grass vignette) | 紙風フレーム or 風景の上に CSS 影が浮いて絵本世界観を破壊 |
| 透明・単体 (TRANSPARENT) | rabbit (full body on white) / dolphin / kasabuta / heart_pump | 共通 drop-shadow で立体感が生まれる (papyrus background から浮く) |

ユーザ指示 (2026-05-08): 「こういう背景入りの時のドロップシャドウは全問題でなくして」(deep_breath のスクショを見せて)

判定基準は **"背景シーンが含まれているか"** (=「背景入り」)。厳密な「長方形紙フレーム」ではなく、 **柔らかい円形ヴィネット (草地・空など) の中に被写体が置かれている場合も FRAMED 扱い** とする。純粋に白背景の単体オブジェクト/シルエットだけが TRANSPARENT。

---

## How (実装概要)

### CSS ([quizland/index.html](../quizland/index.html#L902))

```css
.emoji-main-img.is-framed,
.shape-img.is-framed { filter: none; }
```

`.shape-img` まで含めるのは renderShapeName の `q.img` 対応を入れた後に、 notebook / soccerball など shape_name 系の框付き素材も対象になったため。

### questions.js — スロット単位の opt-in フラグ

問題出題側 (`img:` または `img_word:`) が背景入りなら `framed:true`、 リビール側 (`img_answer:`) が背景入りなら `framed_answer:true`。両方ならば両方付ける。

```js
{ ..., img:'stage_weather_rainbow_arc.png', framed:true, ... }   // 出題のみ framed
{ ..., img:'stage_weather_morning_clear.png', img_answer:'stage_weather_distant_mist.png', framed:true, framed_answer:true, ... }  // 両方 framed
{ ..., img:'silhouette.png', img_answer:'scene_with_frame.png', framed_answer:true, ... }  // reveal 側のみ framed
```

### render 関数 4 箇所 (同じパターン)

`renderEmojiName` / `renderOpposite` / `renderTrivia` / `renderShapeName` で imgEl 作成後:

```js
imgEl.className = 'emoji-main-img';   // (renderShapeName は 'shape-img')
if (q.framed) imgEl.classList.add('is-framed');
```

`renderShapeName` は元々 `shape_<q.shape>.png` を強制ロードする抽象描画だったが、 2026-05-08 に `q.img` がある場合は `stage/` 配下の実物を優先するよう改修 (notebook=実物のノートブック、 soccerball=実物のサッカーボールを見せたい意図)。

### revealAnswer

reveal 時に `framed_answer` で class を切替:

```js
if (q.framed_answer) imgEl.classList.add('is-framed');
else if (!q.framed) imgEl.classList.remove('is-framed');
```

---

## 適用済み (2026-05-08 時点、計 27 エントリ)

すべての stage_*.png + bear_winter_cave_entrance.png を視覚審査して FRAMED/TRANSPARENT に分類。詳細マトリクスは現行 [quizland/data/questions.js](../quizland/data/questions.js) を grep:

```bash
grep -n "framed:true\|framed_answer:true" quizland/data/questions.js
```

**FRAMED と判定された PNG (32 種):** rainbow_arc / opposite_bright_dark / opposite_night_sky / ocean_silhouettes_4 / sleeping_bear_cave / weather (puddle, rain_from_cloud, thunder, cloud_sky, river_steam, distant_mist, winter_breath, sky_question, rain_ground, morning_clear) / snowy_landscape / seed_germinate / deep_breath / earthworm_dirt_only / egg_unhatched / winter_sky_only / seed_in_dirt / elephant_silhouette / bug_silhouettes / lion_osu_silhouette / lion_osu_mesu_compare / giraffe_full / munching / shape_notebook / shape_soccerball / rabbit_no_ears_face_crop / unripe_banana / teeth_replacement / bear_winter_cave_entrance

**TRANSPARENT と判定された PNG (47 種):** rabbit / dolphin / heart_pump / kasabuta / koala_eucalyptus / spider_eyes / opposite/* (cutout キャラ) / heart_pump / lungs_breath / chewing_teeth / その他白背景単体絵 ほか

orphan FRAMED 資産 (questions.js 未配線): `opposite_bright_dark` / `opposite_night_sky` / `ocean_silhouettes_4` の 3 種。問題作成時に配線すれば足りる。

---

## How to apply (新規問題追加時)

1. Codex から納品された画像を Read tool で**実物を視認**する。テキスト/ファイル名/メタデータだけで判断しない (`MEMORY.md` の画像レビュー必須ルール)。
2. 「背景入り」かを判定:
   - 風景 / 室内 / 紙風フレーム / 草地ヴィネット / 雪景色など被写体以外のシーン要素あり → **FRAMED**
   - 白透明背景に被写体だけ (動物カットアウト、文字シルエット、葉オブジェクト) → **TRANSPARENT**
3. FRAMED なら questions.js のスロットに対応するフラグを追加:
   - `img:` / `img_word:` のスロットが framed → `framed:true,`
   - `img_answer:` のスロットが framed → `framed_answer:true,`
   - 両方 framed → 両方
4. `node --check quizland/data/questions.js` で構文確認
5. CACHE_VERSION バンプ
6. staging で実機確認 → 影が浮いてたら framed の指定漏れ、 影が消えすぎてのっぺりしたら誤指定 (修正)

迷ったら **Read で実物を見る**。リスト/メモリだけで判断しない。

---

## 設計 rationale

代替案 (採用しなかったもの):
- ファイル名パターンで自動判定 (`stage_*.png`) → false positive 多すぎ。同じ stage_ prefix でも silhouette のものがある (例: `stage_trivia_rabbit.png`=透明)
- CSS `:has()` 検出 → 画像の透明 alpha は CSS から読めない
- Codex 発注時に枠なしで統一 → 既に納品された大量の枠付き素材を再生成するのは現実的でない
- デフォルトを「影なし」に反転 (透明側を opt-in) → 透明画像の方が多いので bookkeeping が増える

スロット単位の opt-in フラグ方式が現状最良。新規問題追加時のオーバーヘッドも 1 word。

---

## 関連: renderShapeName の q.img 対応 (2026-05-08)

過去の `renderShapeName` は `q.shape` から `shape_<q.shape>.png` を強制ロードしていたが、 ノート/サッカーボールなど「実物の物品で形を当てさせる」問題では `q.img` で実物画像 (stage_shape_notebook.png 等) を渡す設計だった。 古い renderer はこれを無視していたため、 「ノートのかたちは？」→ 抽象シカクが表示される無意味な絵が出ていた。

修正: `q.img` 指定時は `stage/` 配下の `q.img` を優先、 未指定時は従来の `shape_<q.shape>.png` にフォールバック。 onerror フォールバック (CSS shape) は温存。

---

## Related

- [feature_quiz_question_revision_pipeline.md](feature_quiz_question_revision_pipeline.md): 画像発注 Priority 3 で背景仕様を明示するルール (枠付き/透明の事前定義)
- [feature_quiz_question_reveal_sequence.md](feature_quiz_question_reveal_sequence.md): リビール時の class 切替ロジック
