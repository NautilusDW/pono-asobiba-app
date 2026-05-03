# Illustration Audit (Auditor 2 — independent)

> Independent audit. Did not consult Auditor 1's file.
> Source: `d:/AppDevelopment/pono-asobiba-app/quizland/data/questions.js`
> Renderers verified in: `d:/AppDevelopment/pono-asobiba-app/quizland/index.html` (lines 2000-2089)
> Asset roots: `assets/images/ocean/<Dir>/<file>` (emoji_name) and `assets/images/word/<key>.png` (count_total)

## Summary
- Total questions: 168
  - order_color: 24 (CSS)
  - count_total: 24 (item images)
  - shape_name: 24 (CSS)
  - weather: 24 (mix: 11 emoji_name w/ img, 13 trivia text)
  - opposite: 24 (text only)
  - trivia: 24 (text only)
  - body: 24 (mix: 8 emoji_name w/ img, 16 trivia text)
- With `img:` field: 22 (existing 22 / missing 0)
- count_total item images: 24 questions referencing 5 unique item keys (existing 5/5 — all 24 questions render successfully)
- CSS-rendered (no file needed): 48 (24 order_color + 24 shape_name)
- Text-only questions evaluated: 74 (illustration recommended for ~13 high/medium-value cases — see Type 4)

## Type 1: emoji_name `img:` field — existence check

Renderer: `renderEmojiName` (index.html:2039) → `../assets/images/ocean/<img>?v=...`

| Category | Level | img | full path | exists? |
|---|---|---|---|---|
| weather | 1 | Sun/Sun_normal_1.png | assets/images/ocean/Sun/Sun_normal_1.png | YES |
| weather | 1 | Rain/Rain_normal_1.png | assets/images/ocean/Rain/Rain_normal_1.png | YES |
| weather | 1 | Cloud/Cloud_normal_1.png | assets/images/ocean/Cloud/Cloud_normal_1.png | YES |
| weather | 1 | Snow/Snow_normal_1.png | assets/images/ocean/Snow/Snow_normal_1.png | YES |
| weather | 1 | Rainbow/Rainbow_normal_1.png | assets/images/ocean/Rainbow/Rainbow_normal_1.png | YES |
| weather | 1 | Thunder/Thunder_normal_1.png | assets/images/ocean/Thunder/Thunder_normal_1.png | YES |
| weather | 1 | Wind/Wind_normal_1.png | assets/images/ocean/Wind/Wind_normal_1.png | YES |
| weather | 2 | Tornado/Tornado_normal_1.png | assets/images/ocean/Tornado/Tornado_normal_1.png | YES |
| weather | 2 | Thermometer/Thermometer_normal_1.png | assets/images/ocean/Thermometer/Thermometer_normal_1.png | YES |
| weather | 3 | Hurricane/Hurricane_normal_1.png | assets/images/ocean/Hurricane/Hurricane_normal_1.png | YES |
| body | 1 | Eyes/Eyes_normal_1.png | assets/images/ocean/Eyes/Eyes_normal_1.png | YES |
| body | 1 | Mouth_part/Mouth_part_normal_1.png | assets/images/ocean/Mouth_part/Mouth_part_normal_1.png | YES |
| body | 1 | Palm/Palm_normal_1.png | assets/images/ocean/Palm/Palm_normal_1.png | YES |
| body | 1 | Foot_part/Foot_part_normal_1.png | assets/images/ocean/Foot_part/Foot_part_normal_1.png | YES |
| body | 2 | Nose_part/Nose_part_normal_1.png | assets/images/ocean/Nose_part/Nose_part_normal_1.png | YES |
| body | 2 | Teeth/Teeth_normal_1.png | assets/images/ocean/Teeth/Teeth_normal_1.png | YES |
| body | 2 | Tongue/Tongue_normal_1.png | assets/images/ocean/Tongue/Tongue_normal_1.png | YES |
| body | 2 | Ear_part/Ear_part_normal_1.png | assets/images/ocean/Ear_part/Ear_part_normal_1.png | YES |

(22 emoji_name questions in total; the table aggregates the 18 unique image paths — all referenced files exist on disk.)

**Result: 22/22 emoji_name image references resolve. No missing files.**

## Type 2: count_total item images — existence check

Renderer: `renderCountTotal` (index.html:2012) → `QUIZLAND_WORD_IMG + q.item + '.png'` → `../assets/images/word/<item>.png`

Unique items used across the 24 count_total questions:

| item | path | exists? | used in N questions |
|---|---|---|---|
| ringo  | assets/images/word/ringo.png  | YES | 6 |
| ichigo | assets/images/word/ichigo.png | YES | 5 |
| hana   | assets/images/word/hana.png   | YES | 4 |
| hoshi  | assets/images/word/hoshi.png  | YES | 5 |
| mikan  | assets/images/word/mikan.png  | YES | 4 |

**Result: 5/5 unique item images present → all 24 count_total questions render successfully.**

## Type 3: CSS-rendered confirmation

- **shape_name** (24 Q): confirmed CSS in `renderShapeName` (index.html:2025) — uses `<div class="shape-circle/square/triangle/star/heart/rectangle/diamond/oval">`. star/heart use unicode glyphs ★/♥ inside a styled div. No image files needed. OK.
- **order_color** (24 Q): confirmed CSS in `renderOrderColor` (index.html:2000) — uses `<div class="color-chip">` with `style.background = QUIZLAND_COLORS[colorKey].code`. No image files needed. OK.

## Type 4: Text-only — illustration recommendations (selective)

Categories: `opposite` (24), `trivia` (24), `weather` text-only `trivia` (13), `body` text-only `trivia` (12). Total text-only questions evaluated: 73 (one weather question with `img:` is already covered).

Renderer for these is either `renderOpposite` (just shows the word) or `renderTrivia` (shows the ThinkingPono video — no concept illustration). For 3-6yo non-readers, an illustration would substantially aid comprehension on questions where the answer concept is **visually concrete and unambiguous**. I'm being deliberately selective.

### High value (significantly aids comprehension)

1. **「まえ」の はんたいは？** choices: [みぎ, ひだり, うえ, うしろ]
   → A child silhouette with arrows for front/back/left/right; or two arrows facing opposite directions (mae↔ushiro). Spatial concept is hard to grasp from kana alone for non-readers.

2. **「うえ」の はんたいは？** choices: [みぎ, まえ, ひだり, した]
   → Vertical stack with a star at top vs bottom and up/down arrows. Same reasoning — spatial.

3. **「ながい」の はんたいは？** choices: [かわいい, みじかい, やわらかい, かるい]
   → Side-by-side long vs short pencils/snakes. Concrete visual comparison.

4. **「ふとい」の はんたいは？** choices: [おもい, ちいさい, ほそい, みじかい]
   → Side-by-side fat vs thin tree trunks (or crayons). 3yo distinguishes width with picture much better than reading.

5. **「たかい」の はんたいは？** choices: [おもい, かたい, くらい, ひくい]
   → Tall building vs short building, or tall tree vs short tree. Visual is unambiguous.

6. **おなかが すいたとき「グー」と なるのは なぜ？** choices: [おなかの なかで くうきが うごくから, ほねが なるから, きんにくが うごくから, ちが ながれるから]
   → Cute belly cross-section showing air bubbles moving in stomach. Trivia detail mentions "い (stomach) が くうきを おしだして" — illustration cements the abstract idea.

7. **ゆきの けっしょうは どんな かたち？** choices: [まる, ほし, つの が 6つ ある かたち, しかく]
   → A magnified snowflake on a dark background (showing the 6-pointed crystal). The hint already says "とても ちいさい こおりの かたち" — picture would help non-readers connect concept to choice.

8. **タコの あしは なんぼん？** choices: [6ぼん, 8ぼん, 10ぼん, 4ぼん]
   → Friendly octopus illustration with 8 numbered tentacles. Letting a 4-year-old count is the entire point.

9. **かたての ゆびは なんぼん？** choices: [4ほん, 5ほん, 6ほん, 3ほん]
   → Open hand with each finger labeled. Same logic — countable visual.

10. **にじは なんしょく？** choices: [5しょく, 7しょく, 3しょく, 10しょく]
    → A clean rainbow with the 7 bands clearly delineated. Detail explicitly lists 7 colors — picture would let kids count them.

### Medium value

11. **「あつい」の はんたいは？** choices: [やわらかい, つめたい, はやい, くらい]
    → Steaming hot bowl vs ice cube. Concrete sensory contrast.

12. **「あかるい」の はんたいは？** choices: [くらい, やさしい, きつい, ちいさい]
    → Sun/lamp on vs night/dark room. Visual contrast helps comprehension.

13. **タコの しんぞうは いくつ ある？** choices: [1つ, 2つ, 3つ, 4つ]
    → Cute octopus diagram with 3 hearts highlighted. Surprising fact lands harder visually.

14. **そらを とべない とりは どれ？** choices: [タカ, ペンギン, ハト, ツバメ]
    → Mini icons of each bird beside its name (especially since the funny answer is the visually-distinct penguin). Helps pre-readers identify.

15. **ふゆに ねむる（とうみん）どうぶつは どれ？** choices: [ゾウ, ライオン, クマ, キリン]
    → Picture of a sleeping bear in a cave (zzz) — makes the concept of "winter sleep" vivid.

### Low value (text alone is fine — for transparency)

The remaining ~58 text-only questions are either:
- Pure linguistic opposites where the concept itself is non-visual (すき↔きらい, たすける↔じゃまをする, ほめる↔しかる, おしえる↔ならう, でかける↔かえる, あたらしい↔ふるい, つよい↔よわい, なく↔わらう, おおい↔すくない, たくさん↔すこし, あける↔しめる, たつ↔すわる, よる↔あさ, おおきい↔ちいさい, かたい↔やわらかい, かるい↔おもい — 16 items): word/concept is the point; an illustration adds little beyond the text labels.
- Knowledge-style trivia where the question is a categorical fact and the answer choices are word-only (e.g. "せかいで いちばん たかい やまは？", "ちきゅうで いちばん おおきい いきもの", "コアラが たべるものは？", "フラミンゴが ピンクいろなのは なぜ？", "カバの からだから でる…", "バナナの きは じつは なにの なかま？", "イルカは なにの なかま？", "せかいで いちばん おおきい さかなは？", "ねこは なんてなく？", "ぞうの からだで いちばん ながいのは どこ？", "りんごは なにいろ？", "おひさまが でてくるのは どっち？", "ふゆに そらから ふってくる…", "たまごから うまれる いきもの…", "うさぎの みみ…", "せかいで いちばん はやい りく…", "あめが ふると つちから でてくる…", "キリンが 1日に ねむる じかん…"): Pono ThinkingPono video already provides character context, and the trivia surprise lands in the `detail` post-answer.
- Body trivia answered with body-part naming where the part is already trivially imagined (はな、め、みみ、しんぞう、はい、ひふ、は、ほね、しもん): a generic "thinking" character is fine; specific anatomy diagrams would over-medicalize the mood.
- Weather trivia explaining process/causality (なぜ・どうして系: かみなり、あめの でき方、きり、いき が しろくなる、…): the explanatory `detail` already paints the picture verbally and is read aloud post-answer. An optional illustration in `detail` would be nice-to-have but not required for comprehension during the answering phase.

Count: ~58 questions evaluated, no illustration recommended.

## MISSING ASSETS (TOP-LINE)

### Critical (referenced but file missing)

**None.** All 22 `img:` references for emoji_name and all 5 `item` keys for count_total resolve to existing files on disk.

### Recommended new illustrations (high priority)

Add `img:` (or a new `illust:` field + renderer hook) for:

- **opposite まえ** (Q3 in opposite L1) — front/back arrows on a child silhouette
- **opposite うえ** (Q3 in opposite L3) — up/down arrows with stacked block
- **opposite ながい** (Q3 in opposite L2) — long vs short objects
- **opposite ふとい** (Q4 in opposite L2) — fat vs thin objects
- **opposite たかい** (Q2 in opposite L2) — tall vs short objects
- **trivia/body おなか グー** — belly with air bubbles
- **weather L3 ゆきの けっしょう** — 6-point snowflake
- **trivia L2 タコの あし** — labeled octopus tentacles
- **body L1 かたての ゆび** — labeled hand with 5 fingers
- **weather L2 にじは なんしょく** — full 7-color rainbow

### Recommended new illustrations (medium priority)

- **opposite あつい** — hot drink vs ice
- **opposite あかるい** — bright vs dark room
- **trivia L3 タコの しんぞう** — octopus with 3 hearts
- **trivia L2 とべない とり** — bird mini icons (esp. penguin)
- **trivia L2 とうみん** — sleeping bear

### Renderer note

Currently neither `renderOpposite` nor `renderTrivia` consumes an `img:` field. Adding visuals to text-only questions would require either:
1. Extending `renderOpposite`/`renderTrivia` to render `q.img` (preferred — minimal change), or
2. Switching those entries to `type:'emoji_name'` (would need additional rework so the answered concept stays the word, not the picture).

Path option (1) is the simpler change.
