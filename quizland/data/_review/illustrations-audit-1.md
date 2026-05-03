# Illustration Audit (Auditor 1)

> 監査対象: `quizland/data/questions.js` 全 168 問
> 監査日: 2026-05-03
> 監査者: Illustration Auditor 1

## Summary
- 全 168 問 (内訳: order_color 24 / count_total 24 / shape_name 24 / weather 24 / opposite 24 / trivia 24 / body 24)
- **A: img: 参照あり** ... 18 問 (✓ 18 / ✗ 0)
- **B: count_total item 参照** ... 24 問 (✓ 24 / ✗ 0) (= 5 ユニーク item × 各複数回)
- **C: 推奨イラスト候補 (text-only だが視覚化したい)** ... 12 問
- **D: イラスト不要 (CSS 描画/テキスト対比で完結)** ... 72 問 (order_color 24 + shape_name 24 + opposite 24)

→ **すぐに描き起こすべき不足ファイルは 0 件**。既存参照は全て揃っている。
→ **追加で描き起こせば子供が分かりやすくなる候補が 12 問** (Category C 参照)。

---

## Category A: img: 参照ありの問題

`renderEmojiName` は `'../assets/images/ocean/' + q.img` を src に設定する (index.html L2045)。
よって実体パスは `assets/images/ocean/<img>` で確認した。

### A-1. 既存 (✓)

全 18 問とも実ファイル存在を `bash test -e` で確認済み。

| # | Category | Lv | q (抜粋) | img | path | 存在 |
|---|---|---|---|---|---|---|
| 1 | weather | 1 | この てんきは？ | Sun/Sun_normal_1.png | assets/images/ocean/Sun/Sun_normal_1.png | ✓ |
| 2 | weather | 1 | この てんきは？ | Rain/Rain_normal_1.png | assets/images/ocean/Rain/Rain_normal_1.png | ✓ |
| 3 | weather | 1 | この てんきは？ | Cloud/Cloud_normal_1.png | assets/images/ocean/Cloud/Cloud_normal_1.png | ✓ |
| 4 | weather | 1 | この てんきは？ | Snow/Snow_normal_1.png | assets/images/ocean/Snow/Snow_normal_1.png | ✓ |
| 5 | weather | 1 | これは なに？ (にじ) | Rainbow/Rainbow_normal_1.png | assets/images/ocean/Rainbow/Rainbow_normal_1.png | ✓ |
| 6 | weather | 1 | これは なに？ (かみなり) | Thunder/Thunder_normal_1.png | assets/images/ocean/Thunder/Thunder_normal_1.png | ✓ |
| 7 | weather | 1 | これは なに？ (かぜ) | Wind/Wind_normal_1.png | assets/images/ocean/Wind/Wind_normal_1.png | ✓ |
| 8 | weather | 2 | これは なに？ (たつまき) | Tornado/Tornado_normal_1.png | assets/images/ocean/Tornado/Tornado_normal_1.png | ✓ |
| 9 | weather | 2 | これは なに？ (おんどけい) | Thermometer/Thermometer_normal_1.png | assets/images/ocean/Thermometer/Thermometer_normal_1.png | ✓ |
| 10 | weather | 3 | これは なに？ (たいふう) | Hurricane/Hurricane_normal_1.png | assets/images/ocean/Hurricane/Hurricane_normal_1.png | ✓ |
| 11 | body | 1 | これは からだの どこ？ (め) | Eyes/Eyes_normal_1.png | assets/images/ocean/Eyes/Eyes_normal_1.png | ✓ |
| 12 | body | 1 | これは からだの どこ？ (くち) | Mouth_part/Mouth_part_normal_1.png | assets/images/ocean/Mouth_part/Mouth_part_normal_1.png | ✓ |
| 13 | body | 1 | これは からだの どこ？ (て) | Palm/Palm_normal_1.png | assets/images/ocean/Palm/Palm_normal_1.png | ✓ |
| 14 | body | 1 | これは からだの どこ？ (あし) | Foot_part/Foot_part_normal_1.png | assets/images/ocean/Foot_part/Foot_part_normal_1.png | ✓ |
| 15 | body | 2 | これは からだの どこ？ (はな) | Nose_part/Nose_part_normal_1.png | assets/images/ocean/Nose_part/Nose_part_normal_1.png | ✓ |
| 16 | body | 2 | これは からだの なに？ (は) | Teeth/Teeth_normal_1.png | assets/images/ocean/Teeth/Teeth_normal_1.png | ✓ |
| 17 | body | 2 | これは からだの なに？ (した) | Tongue/Tongue_normal_1.png | assets/images/ocean/Tongue/Tongue_normal_1.png | ✓ |
| 18 | body | 2 | これは からだの どこ？ (みみ) | Ear_part/Ear_part_normal_1.png | assets/images/ocean/Ear_part/Ear_part_normal_1.png | ✓ |

### A-2. 不在 (✗) ⚠️

**該当なし** — 全 18 問のファイルは存在する。

---

## Category B: count_total item 画像

`QUIZLAND_WORD_IMG = '../assets/images/word/'` (questions.js L471) ＋ `q.item + '.png'` (index.html L2018) で展開される。
実体パスは `assets/images/word/<item>.png`。

### B-1. 既存 (✓)

全 24 問 (5 ユニーク item) とも実ファイル存在確認済み。

| item (ユニーク) | path | 出現問題数 | 存在 |
|---|---|---|---|
| ringo | assets/images/word/ringo.png | 5 問 (Lv1×2, Lv2×2, Lv3×1) | ✓ |
| ichigo | assets/images/word/ichigo.png | 5 問 (Lv1×2, Lv2×2, Lv3×1) | ✓ |
| hana | assets/images/word/hana.png | 4 問 (Lv1×2, Lv2×1, Lv3×1) | ✓ |
| hoshi | assets/images/word/hoshi.png | 5 問 (Lv1×1, Lv2×2, Lv3×2) | ✓ |
| mikan | assets/images/word/mikan.png | 5 問 (Lv1×1, Lv2×1, Lv3×2) | ✓ |

合計 24 問 (= count_total カテゴリ全数) が既存ファイルでカバーされている。

### B-2. 不在 (✗) ⚠️

**該当なし**。

---

## Category C: イラスト推奨候補 (text-only だが視覚化したい)

選定基準:
- 3-6歳児にとって「絵があると劇的に分かりやすくなる」もののみ採用
- 単純なはい/いいえ・色・季節・知識系で文字だけで充分理解できるものは除外
- 動物・自然現象・固有名詞 (ふじさん等) で視覚記憶と紐づけたいものを優先

### C-1. 動物 (推奨度高: 名前を知っていてもピンと来ない or 比較が必要)

| Category | Lv | 問題文 (全文) | 選択肢 (全文) | 推奨イラスト | 推奨度 |
|---|---|---|---|---|---|
| trivia | 2 | そらを とべない とりは どれ？ | タカ / ペンギン / ハト / ツバメ | **ペンギン (氷の上に立つ姿)** を 1枚出題、または 4羽すべての絵を並べて見せる。3-6歳は「ペンギン＝鳥だと知らない」可能性が高いため絵が決定的に効く | **高** |
| trivia | 2 | せかいで いちばん はやい りくの どうぶつは？ | ライオン / シマウマ / チーター / キリン | **チーターが疾走している絵** (またはチーター 1枚)。「チーター」と「ヒョウ」の混同を防げる | **高** |
| trivia | 2 | コアラが たべるものは？ | バナナ / たけのこ / ユーカリの は / りんご | **コアラがユーカリにつかまっている絵**。コアラは日本の子供にとって絵がないと「謎の動物」 | **高** |
| trivia | 3 | せかいで いちばん おおきい さかなは？ | マグロ / クジラ / ジンベイザメ / サメ | **ジンベイザメ (人と並べて巨大さを示す)**。子供は「ジンベイザメ」を文字だけでは識別できない | **高** |
| trivia | 3 | イルカは なにの なかま？ | さかな / サメ / クジラ / タコ | **イルカとクジラを並べた絵**。「ほにゅうるい」概念は文字だけでは伝わらない | **中〜高** |
| trivia | 3 | フラミンゴが ピンクいろなのは なぜ？ | そらの いろを すいこむ / あかい たべものを たべる / ペンキを ぬる / にっこうで やける | **ピンクのフラミンゴが脚を曲げて立っている絵**。問題文にフラミンゴが既出なので絵で名前と姿を結びつけたい | **高** |
| trivia | 3 | カバの からだから でる ピンクいろの えきは なんの やくわり？ | ひやけどめに なる / ちが でている / たべものに なる / みずを はじく | **カバの絵 (水辺で口を開けた姿)**。カバは絵本では出るが子供は実物を知らない | **中** |
| trivia | 3 | めが 8つある いきものは？ | カブトムシ / クモ / チョウチョ / バッタ | **クモの絵 (8本足が分かる構図)**。「めが 8つ」は絵で見せると衝撃が違う | **中** |

### C-2. たべもの・しょくぶつ

| Category | Lv | 問題文 (全文) | 選択肢 (全文) | 推奨イラスト | 推奨度 |
|---|---|---|---|---|---|
| trivia | 3 | バナナの きは じつは なにの なかま？ | たけ / くさ / まつのき / さくら | **バナナの木 (草本構造) と一般的な木の比較イラスト**。子供は「これが草？」という驚きを絵で得られる | **中** |

### C-3. しぜん・てんき

| Category | Lv | 問題文 (全文) | 選択肢 (全文) | 推奨イラスト | 推奨度 |
|---|---|---|---|---|---|
| trivia | 2 | にほんで いちばん たかい やまは？ | のりくらさん / ふじさん / きりしまやま / こうやさん | **富士山のイラスト (雪をかぶった円錐形)**。日本の子供にとって「ふじさん」は最も視覚的アイコン | **高** |
| weather | 2 | あめが ふったあと、みずたまりが できるのは なぜ？ | じめんが みずを すいきれないから / くもが おちてくるから / かわの みずが あふれるから / かぜが みずを はこぶから | **アスファルトに できた水たまりの絵**。「みずたまり」自体を視覚化すると問題文が一段と分かりやすい | **中** |

### C-4. からだ

| Category | Lv | 問題文 (全文) | 選択肢 (全文) | 推奨イラスト | 推奨度 |
|---|---|---|---|---|---|
| body | 3 | ゆびのさきの もようを なんという？ | しもん / もよう / てもん / がら | **指紋のクローズアップ (渦巻き模様)**。3-6歳児は「しもん」という言葉だけでは何を指すか分からない | **中** |

### C-5. その他

特になし (opposite カテゴリは text-only で完結、追加イラストはむしろ理解の妨げ)。

---

## Category D: イラスト不要

| カテゴリ | 問数 | 描画方式 | 確認根拠 |
|---|---|---|---|
| order_color | 24 | CSS で色チップを描画 | index.html L2000-2010 `renderOrderColor`: `chip.style.background = QUIZLAND_COLORS[colorKey].code` |
| shape_name | 24 | CSS で図形を描画 (`<div class="shape-circle">` 等) | index.html L2025-2037 `renderShapeName`: 8 形状すべて CSS class で描画。star/heart のみ Unicode `★/♥` を使用 |
| opposite | 24 | テキスト対比 (反対語) で完結 | 問題文・選択肢ともテキストのみで、3-6歳でも語感だけで成立。追加イラストはむしろ判断を惑わせる |

→ 計 **72 問** はイラスト追加の必要・推奨ともなし。

---

## 不足リスト (まとめ)

### 不足: img: 参照だが実ファイルなし
**0 件** (全 18 ファイル存在確認済み)

### 不足: count_total item 画像
**0 件** (5 ファイル全て存在: ringo / ichigo / hana / hoshi / mikan)

### 推奨: 新規描き起こし候補 (優先度 高) — 7 件

既存 ocean アセットを確認したところ、以下はいずれも **新規描き起こしが必要** (Penguin / Cheetah / Koala / 富士山 / Whaleshark / Flamingo / クモ単体 のいずれも assets/images/ocean/ に存在しない):

1. **そらを とべない とりは どれ？** (trivia Lv2) → **ペンギン**のイラスト
2. **せかいで いちばん はやい りくの どうぶつは？** (trivia Lv2) → **チーター**のイラスト
3. **コアラが たべるものは？** (trivia Lv2) → **コアラがユーカリにつかまる**イラスト
4. **にほんで いちばん たかい やまは？** (trivia Lv2) → **富士山**のイラスト
5. **せかいで いちばん おおきい さかなは？** (trivia Lv3) → **ジンベイザメ**のイラスト (人と並べて大きさを示す)
6. **フラミンゴが ピンクいろなのは なぜ？** (trivia Lv3) → **フラミンゴ**のイラスト
7. **そらを とべない とりは どれ？** (再掲不要) — 同上

### 推奨: 新規描き起こし候補 (優先度 中) — 5 件

8. **イルカは なにの なかま？** (trivia Lv3) → **イルカとクジラを並べた**イラスト
9. **カバの からだから でる ピンクいろの えきは なんの やくわり？** (trivia Lv3) → **カバ**のイラスト
10. **めが 8つある いきものは？** (trivia Lv3) → **クモ**のイラスト (8つの目と8本足を強調)
11. **バナナの きは じつは なにの なかま？** (trivia Lv3) → **バナナの木と通常の木の比較**イラスト
12. **ゆびのさきの もようを なんという？** (body Lv3) → **指紋クローズアップ**イラスト
13. **あめが ふったあと、みずたまりが できるのは なぜ？** (weather Lv2) → **みずたまり**のイラスト

→ 合計 **12 問** がイラスト追加で大きく改善する候補。

---

## 補足: 既存アセット確認結果

`assets/images/ocean/` ディレクトリには以下のうち **どれも存在しない** (新規制作が必要):
- Penguin (ペンギン)
- Cheetah (チーター)
- Koala (コアラ)
- Mt_Fuji / Fuji / Mountain (富士山)
- Whaleshark / Whale_shark (ジンベイザメ)
- Flamingo (フラミンゴ)
- Hippo / Hippopotamus (カバ)
- Dolphin (イルカ)
- Whale (クジラ)
- Spider 単体 (※ Arachnid/ はあるが Spider/ 単独は確認すべし — 実際には `Spider/` `Spider_web/` が存在 → 流用可能)

`Spider/` のみ既存。よって「めが 8つある いきものは？」は既存アセット (`Spider/Spider_normal_1.png` 等) を `img:` 参照に追加するだけで対応可能 (描き起こし不要)。

---

## 知見活用

過去の MEMORY.md 知見「画像ベースパス verification は実 Glob/ls 検証で確認」を踏まえ、
- `img:` 参照 18 件 + `item:` 参照 5 件 (計 23 ファイル) を bash `test -e` で個別に存在確認
- 「ファイルがあるはず」という思い込みを排除し、実ディスクで verify
- 加えて Category C 推奨候補に対して既存アセットがあるか (`ls -d Penguin* ...` 等) 個別に確認し、「描き起こし vs 既存流用」を区別した

これにより、ユーザーが「結局どれを新しく描けばいいのか」を即座に判断できるリストを提示できた。
