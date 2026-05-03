# Verify 2: Structural integrity

Verifier: Verifier 2 (structural / runtime integrity)
Source: `d:/AppDevelopment/pono-asobiba-app/quizland/data/questions.js`
Renderer: `d:/AppDevelopment/pono-asobiba-app/quizland/index.html`
SW: `d:/AppDevelopment/pono-asobiba-app/sw.js`
Date: 2026-05-03

## Node syntax check

- Result: OK (PASS)
- Method: `new Function(code)` over the full file (28,464 bytes).
- Output: `SYNTAX_OK`
- Globals exposed (via `eval` in Node sandbox):
  - `QUIZLAND_QUESTIONS` (object, 7 categories)
  - `QUIZLAND_CATEGORIES` (object, 7 entries)
  - `QUIZLAND_COLORS` (object, 8 entries: red/blue/yellow/green/pink/orange/purple/cyan)
  - `QUIZLAND_WORD_IMG` (string: `'../assets/images/word/'`) — note this is a path-prefix string, not an object. The renderer concatenates it as `QUIZLAND_WORD_IMG + q.item + '.png'` (index.html:2018), so this is correct by design.

All four globals are defined and non-corrupted.

## Independent count

| Category    | Lv1 | Lv2 | Lv3 | Total |
|-------------|-----|-----|-----|-------|
| order_color |  8  |  8  |  8  |  24   |
| count_total |  8  |  8  |  8  |  24   |
| shape_name  |  8  |  8  |  8  |  24   |
| weather     |  8  |  8  |  8  |  24   |
| opposite    |  8  |  8  |  8  |  24   |
| trivia      |  8  |  8  |  8  |  24   |
| body        |  8  |  8  |  8  |  24   |
| **Total**   | 56  | 56  | 56  | **168** |

All 7 categories x 3 levels are exactly 8 entries each. No "other"-level entries detected.

## Type distribution per category (sanity)

| Category    | Types observed              | Renderer support |
|-------------|-----------------------------|-------------------|
| order_color | order_color                 | renderOrderColor (index.html:2000) |
| count_total | count_total                 | renderCountTotal (index.html:2012) |
| shape_name  | shape_name                  | renderShapeName  (index.html:2025) |
| weather     | emoji_name, trivia          | renderEmojiName / renderTrivia |
| opposite    | opposite                    | renderOpposite   (index.html:2068) |
| trivia      | trivia                      | renderTrivia     (index.html:2075) |
| body        | emoji_name, trivia          | renderEmojiName / renderTrivia |

Note: `weather` and `body` are category keys (not `type` values). Their entries use `type: 'emoji_name'` or `type: 'trivia'`, both handled in the `loadQuestion` switch (index.html:2148-2155). No runtime breakage.

## answer index integrity

- Total entries: 168
- Index errors: 0
- Choice-length errors: 0 (all `choices.length === 4`)
- Empty-`q` errors: 0
- Empty-choice errors: 0
- Type errors on `answer`: 0 (all numeric)
- All `answer` values are within `[0, choices.length)`.

## count_total semantics

- Total count_total entries: 24
- Mismatches (`choices[answer] !== count`): 0
- Verdict: PASS

## order_color semantics

Position parsing rule:
- `まんなか` → `floor(items.length/2)`
- `ひだりから Nばんめ` → `N-1`
- `みぎから Nばんめ` → `items.length - N`

- Total order_color entries: 24
- Position mismatches (`items[implied_index] !== choices[answer]`): 0
- Verdict: PASS

## shape_name keys

- Used: `{circle, square, triangle, heart, star, rectangle, oval, diamond}` (all 8)
- Inventory expected by renderer: `{circle, square, triangle, star, heart, rectangle, diamond, oval}` (index.html:2028-2035)
- Out-of-inventory: 0
- Distribution: circle×2, square×3, triangle×3, heart×3, star×3, rectangle×5, oval×3, diamond×2 = 24
- Verdict: PASS

## emoji_name asset existence

- Total `img:` entries: 18 (10 in `weather`, 8 in `body`)
- Missing files: 0 (all verified to exist under `d:/AppDevelopment/pono-asobiba-app/assets/images/ocean/`)
- Total `emoji:` entries (no `img:`): 0
  - i.e. all visual entries route through the `img` path. The `emoji` field is unused in the merged file (the trivia category uses the ThinkingPono video instead, which is correct per renderTrivia).
- Verdict: PASS

Sample of img references (all verified):
- weather: Sun/Sun_normal_1.png, Rain/Rain_normal_1.png, Cloud/Cloud_normal_1.png, Snow/Snow_normal_1.png, Rainbow/Rainbow_normal_1.png, Thunder/Thunder_normal_1.png, Wind/Wind_normal_1.png, Tornado/Tornado_normal_1.png, Thermometer/Thermometer_normal_1.png, Hurricane/Hurricane_normal_1.png
- body: Eyes, Mouth_part, Palm, Foot_part, Nose_part, Teeth, Tongue, Ear_part (each `_normal_1.png`)

## Hiragana sanity

- Unique kanji used across ALL fields (q + choices + word + detail + hint): **`日`** (1 character only)
  - Used in `trivia`: `「キリンが 1日に ねむる じかんは？」` and detail `「やせいの キリンは てきに おそわれないよう みじかく ねるよ！」`. `日` is grade-1 kanji — acceptable for kids.
- Katakana usage: all reviewed, all intentional and appropriate:
  - `ハート` (shape_name × 4)
  - Animal/object names in trivia: ワンワン, モーモー, ニャーニャー, コケコッコー, ニャー, ゴロゴロ, タカ, ペンギン, ハト, ツバメ, タコ, ライオン, シマウマ, チーター, キリン, クマ, ゾウ, チョウチョ, ミミズ, カブトムシ, セミ, コアラ, バナナ, ユーカリ, マグロ, クジラ, ジンベイザメ, サメ, プランクトン
  - Loanwords in weather/trivia: アスファルト, キロ, メートル
  - Punctuation `・` in choice-list strings (acceptable in detail/explanation)
- No accidental katakana found in fields that should be hiragana-only.
- Verdict: PASS

## sw.js CACHE_VERSION

- Before (HEAD on disk previous): 663 (per `git show 986c73a:sw.js`)
- After (working tree): **664** (verified at sw.js:4)
- Diff confirmed: `-const CACHE_VERSION = 663;` → `+const CACHE_VERSION = 664;`
- Integrator's report (`integration-report.md:78,91`) consistent.
- Verdict: PASS

## Verdict

**採用可 (ACCEPT)** — all structural integrity gates pass.

## Issues requiring rework

None. No blockers. Optional notes (NOT blockers):
- `QUIZLAND_WORD_IMG` is a string prefix, not an object. This was confirmed-by-design from the renderer (index.html:2018). The verifier task description listing it among "globals to inspect" is satisfied — the global is defined and used correctly.
- No `emoji:` field is used anywhere in the merged data; only `img:`. This is fine for the renderer (renderEmojiName falls through to img branch when present).
