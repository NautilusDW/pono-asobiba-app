# Quizland イラスト発注リスト (シンプル版)

> deduplicate by visual asset (per-question 内訳は `illustration-needs-full.md` 参照)
> Codex / GPT Image 2 にコピペで投げられる prompt 付き

すべて以下のスタイルで:
- 子供向けキッズイラスト (3-6歳向け)
- 暖色系・木枠・紙質テーマ
- アルファチャンネル付き PNG
- 1024×1024 (色チップ・形・キャラ立ち絵) または 1536×1024 (シーン)

## 共通プロンプト要素 (base style)

すべての画像 prompt の末尾に以下を付与すると統一感が出る:

> `kid-friendly illustration for ages 3-6, hand-drawn watercolor style with subtle paper texture, warm wood/paper Japanese children's book aesthetic, soft drop shadow, transparent PNG, centered subject, no text, no labels`

---

## ① 色チップ (8枚)

正方形 + 角丸の塗りベタイラスト。色は QUIZLAND_COLORS の値を使う。

ファイル先: `assets/images/quizland/illust/color/`
サイズ: 1024×1024 transparent PNG

| ファイル | 色 | コード | プロンプト |
|---|---|---|---|
| `color_red.png`    | あか     | `#EF4444` | `A simple kid-friendly square color chip, solid red (#EF4444), rounded corners, soft drop shadow, hand-drawn watercolor style with subtle paper texture, warm Japanese children's book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `color_blue.png`   | あお     | `#3B82F6` | `A simple kid-friendly square color chip, solid blue (#3B82F6), rounded corners, soft drop shadow, hand-drawn watercolor style with subtle paper texture, warm Japanese children's book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `color_yellow.png` | きいろ   | `#FBBF24` | `A simple kid-friendly square color chip, solid yellow (#FBBF24), rounded corners, soft drop shadow, hand-drawn watercolor style with subtle paper texture, warm Japanese children's book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `color_green.png`  | みどり   | `#10B981` | `A simple kid-friendly square color chip, solid green (#10B981), rounded corners, soft drop shadow, hand-drawn watercolor style with subtle paper texture, warm Japanese children's book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `color_pink.png`   | ピンク   | `#EC4899` | `A simple kid-friendly square color chip, solid pink (#EC4899), rounded corners, soft drop shadow, hand-drawn watercolor style with subtle paper texture, warm Japanese children's book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `color_orange.png` | オレンジ | `#F97316` | `A simple kid-friendly square color chip, solid orange (#F97316), rounded corners, soft drop shadow, hand-drawn watercolor style with subtle paper texture, warm Japanese children's book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `color_purple.png` | むらさき | `#8B5CF6` | `A simple kid-friendly square color chip, solid purple (#8B5CF6), rounded corners, soft drop shadow, hand-drawn watercolor style with subtle paper texture, warm Japanese children's book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `color_cyan.png`   | みずいろ | `#06B6D4` | `A simple kid-friendly square color chip, solid cyan (#06B6D4), rounded corners, soft drop shadow, hand-drawn watercolor style with subtle paper texture, warm Japanese children's book aesthetic, transparent PNG 1024x1024, centered, no text.` |

---

## ② 形 (8枚)

子供っぽい単色イラスト。各形に固有色を割り当て。

ファイル先: `assets/images/quizland/illust/shape/`
サイズ: 1024×1024 transparent PNG

| ファイル | 形 | 色 | プロンプト |
|---|---|---|---|
| `shape_circle.png`    | まる       | yellow `#FBBF24` | `A single simple yellow circle (#FBBF24) for kids, solid fill, soft drop shadow, hand-drawn watercolor children's book style with subtle paper texture, transparent PNG 1024x1024, centered, no text.` |
| `shape_square.png`    | しかく     | blue `#60A5FA`   | `A single simple blue square (#60A5FA) for kids, solid fill with slightly rounded corners, soft drop shadow, hand-drawn watercolor children's book style with subtle paper texture, transparent PNG 1024x1024, centered, no text.` |
| `shape_triangle.png`  | さんかく   | green `#10B981`  | `A single simple green equilateral triangle (#10B981) for kids, solid fill with slightly rounded corners, soft drop shadow, hand-drawn watercolor children's book style with subtle paper texture, transparent PNG 1024x1024, centered, pointing up, no text.` |
| `shape_star.png`      | ほし       | orange `#F97316` | `A single simple orange 5-pointed star (#F97316) for kids, solid fill, soft drop shadow, hand-drawn watercolor children's book style with subtle paper texture, transparent PNG 1024x1024, centered, no text.` |
| `shape_heart.png`     | ハート     | pink `#EC4899`   | `A single simple pink heart (#EC4899) for kids, solid fill, soft drop shadow, hand-drawn watercolor children's book style with subtle paper texture, transparent PNG 1024x1024, centered, no text.` |
| `shape_rectangle.png` | ながしかく | purple `#8B5CF6` | `A single simple purple horizontal rectangle (#8B5CF6) for kids, solid fill with slightly rounded corners, wider than tall (3:2), soft drop shadow, hand-drawn watercolor children's book style with subtle paper texture, transparent PNG 1024x1024, centered, no text.` |
| `shape_diamond.png`   | ひしがた   | red `#EF4444`    | `A single simple red diamond / rhombus (#EF4444) for kids, solid fill with slightly rounded corners, oriented as a kite (one corner up, one down), soft drop shadow, hand-drawn watercolor children's book style with subtle paper texture, transparent PNG 1024x1024, centered, no text.` |
| `shape_oval.png`      | たまごがた | teal `#14B8A6`   | `A single simple teal oval / egg shape (#14B8A6) for kids, solid fill, slightly taller than wide, soft drop shadow, hand-drawn watercolor children's book style with subtle paper texture, transparent PNG 1024x1024, centered, no text.` |

---

## ③ 動物・トリビア (新規 13枚)

questions.js の trivia から unique 抽出。**既存ファイルは流用する** (新規生成は不要)。

ファイル先: `assets/images/quizland/illust/animal/`
サイズ: 1024×1024 transparent PNG

### 既存活用 (新規生成しない)
| 既存ファイル | 動物 | 用途 |
|---|---|---|
| `assets/images/word/zou.png`    | ぞう       | Lv1 はな / Lv3 おおきい |
| `assets/images/word/neko.png`   | ねこ       | Lv1 鳴き声 |
| `assets/images/word/usagi.png`  | うさぎ     | Lv1 みみ |
| `assets/images/word/kuma.png`   | クマ       | Lv2 ふゆねむる |
| `assets/images/word/kirin.png`  | キリン     | Lv2 ねむる時間 |
| `assets/images/word/lion.png`   | ライオン   | Lv3 たてがみ |
| `assets/images/word/iruka.png`  | イルカ     | Lv3 ほにゅうるい |
| `assets/images/word/kujira.png` | クジラ     | Lv3 ほにゅうるい |
| `assets/images/word/banana.png` | バナナ     | Lv1 きいろ |
| `assets/images/word/ringo.png`  | りんご     | Lv1 あか / count_total |
| `assets/images/ocean/Chicken/`  | にわとり   | Lv1 たまご (ocean 既存使えるか確認) |

### 新規生成
| ファイル | 動物 | 用途問題 | プロンプト |
|---|---|---|---|
| `animal_penguin.png`     | ペンギン       | Lv2 とべないとり        | `A cute friendly Emperor penguin standing upright on white snow, big round eyes, slight smile, looking forward. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `animal_octopus.png`     | タコ           | Lv2 8本足 / Lv3 心臓3つ | `A cute friendly red-pink octopus with 8 visible curly tentacles, big round friendly eyes, soft smile, sitting upright. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `animal_cheetah.png`     | チーター       | Lv2 はやい              | `A cute friendly cheetah running, spotted golden-yellow fur, slim body, motion-blur dust trail behind, smiling. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `animal_earthworm.png`   | ミミズ         | Lv2 雨の後              | `A cute friendly pink earthworm with a small smile, segmented body curving slightly, on wet brown soil with a few rain droplets nearby. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `animal_koala.png`       | コアラ         | Lv2 ユーカリ            | `A cute friendly grey koala hugging a eucalyptus branch, holding one eucalyptus leaf in mouth, big round nose, soft fur. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `animal_whaleshark.png`  | ジンベイザメ   | Lv3 大きい魚            | `A cute friendly large gentle whale shark with white-spotted blue-grey body, wide flat mouth slightly smiling, swimming horizontally. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `animal_bluewhale.png`   | シロナガスクジラ | Lv3 一番大きい         | `A cute friendly enormous blue whale, smooth blue-grey body, small visible flipper, gentle smile, water spout from blowhole. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `animal_spider.png`      | クモ           | Lv3 目8つ・足8本         | `A cute friendly cartoon spider with 8 round visible eyes and 8 thin legs, fuzzy round body, smiling. Not scary, kid-safe. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `animal_flamingo.png`    | フラミンゴ     | Lv3 ピンク色            | `A cute friendly pink flamingo standing on one leg, S-curved neck, small smile, soft pink feathers. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `animal_chicken.png`     | にわとり (新規候補) | Lv1 たまご          | `A cute friendly white hen chicken with red comb and yellow beak, sitting on a small egg in straw nest, small smile. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` *(ocean/Chicken 既存があれば不要)* |
| `animal_banana_tree.png` | バナナの木     | Lv3 草の仲間            | `A cute friendly banana plant (not a real tree, with soft herbaceous trunk) bearing a bunch of yellow bananas, large green leaves, slight smile on the trunk face. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |

---

## ④ 天気シーン (新規 4枚)

ファイル先: `assets/images/quizland/illust/weather/`
サイズ: 1024×1024 transparent PNG (`weather_typhoon.png` のみ 1536×1024)

### 既存活用 (新規生成しない)
ocean/ の以下を流用:
- `Sun/Sun_normal_1.png` (はれ)
- `Rain/Rain_normal_1.png` (あめ)
- `Cloud/Cloud_normal_1.png` (くもり)
- `Snow/Snow_normal_1.png` (ゆき)
- `Rainbow/Rainbow_normal_1.png` (にじ・通常)
- `Thunder/Thunder_normal_1.png` (かみなり)
- `Wind/Wind_normal_1.png` (かぜ)
- `Tornado/Tornado_normal_1.png` (たつまき)
- `Hurricane/Hurricane_normal_1.png` (たいふう・通常)
- `Thermometer/Thermometer_normal_1.png` (おんどけい)

### 新規生成
| ファイル | 内容 | 用途 | プロンプト |
|---|---|---|---|
| `weather_rainbow_7color.png`  | 7色の虹 (色がはっきり分かる) | Lv2 にじ7色   | `A bright clean 7-color rainbow arc with each band clearly distinct: red, orange, yellow, green, blue, indigo, violet, from outer to inner. Soft white cloud at each end. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `weather_puddle.png`          | みずたまり (雨上がり)        | Lv2 雨のあと  | `A small reflective puddle of water on grey asphalt ground, with a few ripples and a soft sky reflection in it, after rain. Couple of small raindrops nearby. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `weather_snowflake_hex.png`   | 雪の結晶 (六角形を強調)      | Lv3 6つのつの | `A single large hexagonal snowflake crystal with clearly visible 6 symmetrical arms, light blue-white delicate fractal pattern, sparkling. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `weather_typhoon.png`         | 台風 (上空からの渦巻き)      | Lv3 たいふう  | `A typhoon viewed from above (satellite-style but cartoon-friendly): large white spiral cloud system with a clear round eye in the center, blue ocean below. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1536x1024, centered, no text.` |

---

## ⑤ からだ図解 (新規 7枚)

ファイル先: `assets/images/quizland/illust/body/`
サイズ: 1024×1024 transparent PNG

### 既存活用 (新規生成しない)
ocean/ の以下を流用:
- `Eyes/Eyes_normal_1.png` (め)
- `Mouth_part/Mouth_part_normal_1.png` (くち)
- `Palm/Palm_normal_1.png` (て)
- `Foot_part/Foot_part_normal_1.png` (あし)
- `Forearm/` (うで)
- `Nose_part/Nose_part_normal_1.png` (はな)
- `Teeth/Teeth_normal_1.png` (は)
- `Tongue/Tongue_normal_1.png` (した)
- `Ear_part/Ear_part_normal_1.png` (みみ)

### 新規生成
| ファイル | 内容 | 用途 | プロンプト |
|---|---|---|---|
| `body_skin.png`        | ひふ (体表面の拡大図)       | Lv2 体を守る   | `A friendly cute illustration showing skin surface (the body's protective covering): a soft warm-toned skin layer with subtle pores and a tiny smiling face, viewed as a gentle close-up. Suggesting "skin is what wraps and protects the body." Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `body_heart.png`       | しんぞう (心臓 + どきどき)  | Lv2 血を送る   | `A cute friendly cartoon human heart organ (anatomical heart shape, not a Valentine heart), pinkish-red, with a small smiling face, with soft motion lines suggesting "doki-doki" pumping rhythm. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `body_lungs.png`       | はい (肺 + 呼吸)           | Lv2 息をする   | `A cute friendly pair of cartoon human lungs, soft pink with branching airways visible, small smiling face, gentle puffs of air around them suggesting breathing. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `body_bones.png`       | ほね (骨)                 | Lv3 一番かたい | `A cute friendly simplified human skeleton hand or torso bones, clean white, slightly cartoon-style with rounded edges (not scary, kid-safe), tiny smiling face on one bone. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `body_fingerprint.png` | しもん (指紋の拡大)         | Lv3 しもん     | `A close-up of a single human fingertip showing the swirling fingerprint pattern clearly, soft skin tone, slightly cartoon style, optional tiny magnifying glass icon. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `body_blink.png`       | まばたき (目 + 涙)         | Lv3 目を守る   | `A pair of cute kid eyes mid-blink (one slightly closed), with a single sparkly tear drop near the lower lid suggesting cleaning the eye. Friendly, no fear. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |
| `body_chew.png`        | は (歯で噛む)              | Lv2 食べ物砕く | `A cute friendly close-up of an open kid's mouth showing white teeth biting a piece of food (e.g. an apple slice), small smile, gentle. Hand-drawn watercolor children's book style for ages 3-6, subtle paper texture, soft drop shadow, warm Japanese picture book aesthetic, transparent PNG 1024x1024, centered, no text.` |

---

## ⑥ その他 (生成不要)

- **opposite (はんたいことば)**: テキストのみで十分。新規イラスト不要。
- **count_total**: ringo / ichigo / hana / hoshi / mikan は既存 `assets/images/word/` を流用。新規不要。
- **emoji 全般** (🦉 🌞 ☔ 等): CSS / 既存 ocean アセットで対応済み。

---

## 集計

| カテゴリ | 新規生成数 |
|---|---|
| ① 色チップ      | 8 |
| ② 形            | 8 |
| ③ 動物          | 11 (うち `animal_chicken.png` は ocean/Chicken 既存があれば 10) |
| ④ 天気シーン    | 4 |
| ⑤ からだ図解    | 7 |
| **合計**        | **38 (or 37)** |

既存流用は合計 **約 25 ファイル** (animal 10 / weather 10 / body 9)。

---

## 命名規則

```
assets/images/quizland/illust/
├── color/
│   └── color_<colorname>.png
├── shape/
│   └── shape_<shapename>.png
├── animal/
│   └── animal_<name>.png
├── weather/
│   └── weather_<scene>.png
└── body/
    └── body_<part>.png
```

## Codex / GPT Image 2 への投げ方

各 prompt はこのままコピペ可能。1枚ずつ投げて以下の保存先に置く:

```
d:/AppDevelopment/pono-asobiba-app/assets/images/quizland/illust/<category>/<filename>.png
```

生成後、`questions.js` 側で参照する場合は `QUIZLAND_ILLUST_IMG = '../assets/images/quizland/illust/'` のような新定数を追加して使う想定。
