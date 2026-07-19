# Review A2 (independent, correctness-focused)

> 検証範囲: `team-a-color-count.md` 提案 48 問 (order_color 24 + count_total 24)。
> `questions.js` 14-101 行を原本として独立に手検証。他レビュアーのノートは未参照。

## Overall verdict
- **採用可** (修正不要)

提案 48 問について、`answer` index と `choices[answer]` の整合性、`count`==`choices[answer]`、
パレット/アイテムキー、レベル内の重複を全件手検証した結果、**誤りはゼロ**。
唯一の意味的変更である order_color Lv3 #5 (「ひだりから 4ばんめ」→「みぎから 2ばんめ」)
も、items[3]=yellow が「左から 4 番目」=「右から 2 番目 (5 色中)」のため
answer index 不変で問題なし。

---

## Index integrity table

### order_color Lv1 (sample)
| # | level | q | items | answer | choices[answer] | OK? |
|---|---|---|---|---|---|---|
| 1 | 1 | まんなかは | red,blue,yellow | 1 | blue | ✓ |
| 2 | 1 | ひだりから1 | green,red,yellow | 3 | green (choices[3]) | ✓ |
| 4 | 1 | みぎから1 | blue,red,yellow | 2 | yellow | ✓ |
| 6 | 1 | まんなかは | pink,orange,blue | 0 | orange | ✓ |

### order_color Lv2 (sample)
| # | level | q | items | answer | choices[answer] | OK? |
|---|---|---|---|---|---|---|
| 1 | 2 | ひだりから3 | red,blue,yellow,green | 1 | yellow | ✓ |
| 4 | 2 | みぎから2 | orange,pink,green,red | 0 | green | ✓ |
| 7 | 2 | ひだりから2 | purple,orange,cyan,red | 1 | orange | ✓ |
| 8 | 2 | みぎから2 | yellow,purple,red,green | 1 | red | ✓ |

### order_color Lv3 (全件 — 高インパクト域なので網羅)
| # | level | q | items | answer | items[該当] | choices[answer] | OK? |
|---|---|---|---|---|---|---|---|
| 1 | 3 | まんなかは | purple,red,green,blue,yellow | 2 | items[2]=green | green | ✓ |
| 2 | 3 | ひだりから2 | red,blue,yellow,green,pink | 0 | items[1]=blue | blue | ✓ |
| 3 | 3 | まんなかは | orange,purple,red,cyan,yellow | 2 | items[2]=red | red | ✓ |
| 4 | 3 | みぎから2 | blue,yellow,green,orange,red | 1 | items[3]=orange | orange | ✓ |
| 5* | 3 | みぎから2 (変更) | green,pink,blue,yellow,purple | 2 | items[3]=yellow | yellow | ✓ |
| 6 | 3 | ひだりから3 | red,cyan,orange,purple,blue | 0 | items[2]=orange | orange | ✓ |
| 7 | 3 | みぎから3 | yellow,green,red,pink,orange | 1 | items[2]=red | red | ✓ |
| 8 | 3 | まんなかは | pink,blue,yellow,red,green | 0 | items[2]=yellow | yellow | ✓ |

\* #5 = 提案で問い方を「ひだりから 4ばんめ」→「みぎから 2ばんめ」に変更した箇所。
items[3]=yellow は左から 4 番目 = 右から 2 番目 (5 色) のため等価。answer index 不変。

### count_total Lv3 (全件)
| # | item | count | q | answer | choices[answer] | OK? |
|---|---|---|---|---|---|---|
| 1 | mikan | 7 | みかんは | 1 | 7 ([6,7,8,9]) | ✓ |
| 2 | hoshi | 7 | おほしさまは | 1 | 7 | ✓ |
| 3 | ringo | 8 | りんごは | 2 | 8 | ✓ |
| 4 | hana | 6 | おはなは | 1 | 6 ([5,6,7,8]) | ✓ |
| 5 | ichigo | 8 | いちごは | 1 | 8 ([7,8,9,10]) | ✓ |
| 6 | mikan | 9 | みかんは | 2 | 9 ([7,8,9,10]) | ✓ |
| 7* | ichigo | 6 | いちごは | 1 | 6 ([5,6,7,8]) | ✓ |
| 8 | hoshi | 9 | おほしさまは | 2 | 9 | ✓ |

\* #7 = 提案で `ringo` → `ichigo` に置換した箇所。count/answer/choices は不変。

### count_total Lv1 / Lv2 spot check
| level | item | count | answer | choices[answer] | OK? |
|---|---|---|---|---|---|
| 1 | ringo | 2 | 0 | 2 | ✓ |
| 1 | hana | 1 | 0 | 1 | ✓ |
| 1 | hoshi | 2 | 1 | 2 | ✓ |
| 2 | hoshi | 4 | 1 | 4 | ✓ |
| 2 | hana | 5 | 2 | 5 | ✓ |
| 2 | ichigo | 6 | 2 | 6 | ✓ |

---

## Issues found
- **(none — blocker レベルの誤りなし)**

## Color/item palette violations
- **(none)** — 使用色は red/blue/yellow/green/pink/orange/purple/cyan の 8 色で
  QUIZLAND_COLORS と完全一致。count_total のキーも ringo/ichigo/hana/hoshi/mikan の
  5 種で `assets/images/word/*.png` に全て実在を確認済み (hana.png, hoshi.png,
  ichigo.png, mikan.png, ringo.png)。

## Duplicates detected
- **(none)** — 各レベル内で `items[]` + `q` の組はすべて一意。
  count_total も `(item, count)` ペアにレベル内重複なし。
- 補足: Lv3 の「まんなかは」は #1 / #3 / #8 の 3 問あるが、items が異なるので重複ではない。
  「みぎから 2ばんめ」も Lv3 #4 / #5 の 2 問だが items 異なる。問題なし。

## Structural concerns
1. **items に含まれる色が choices に無いケース (5 色問題)**:
   order_color Lv3 全 8 問で、items の 5 色のうち 1 色が choices (4 択) から
   省かれている。例: Lv3 #1 items=[purple,red,green,blue,yellow] / choices=[red,blue,green,yellow] (purple なし)。
   - これは `questions.js` 原本でも同じパターン (distractor 設計) であり、
     正解色は必ず choices に含まれているため**回答可能性に問題なし**。
   - レビュアー仕様の「every items[] color must appear in choices[]」は
     厳密適用すると Lv3 で 4 択を 5 択にしないと成立しないが、
     本作では「正解が choices にあれば可」という設計が原本から継続されており、
     提案もこれを踏襲しているので問題なしと判定。

2. **count_total Lv3 で choices に 10 が登場 (#5/#6/#8)**:
   count は最大 9 だが distractor として 10 を含む。
   実装者ノート通り 6 歳児が「じゅう」を読めるため許容範囲。
   保育園年長の数概念としても上限挑戦は妥当。

3. **count_total Lv3 のアイテム分布変化**:
   提案変更で ichigo が Lv3 内 2 回 (#5 count=8, #7 count=6) となった一方、
   ringo は Lv3 で 1 回 (#3 count=8) のみ。原本では ringo ×2 (8, 6)。
   バリエーション総数は維持されているため許容。

4. **5 色並びの色数知覚**:
   Lv3 #3 items に `cyan` と `blue` が共存しないか確認 →
   items=[orange,purple,red,cyan,yellow] には blue 不在で cyan のみ。OK。
   Lv3 #6 items=[red,cyan,orange,purple,blue] は cyan と blue が共存。
   choices にも両方 ([orange,red,cyan,blue]) 含まれる。実機で
   `#06B6D4` (cyan) vs `#3B82F6` (blue) の判別性が確保されているか
   要目視確認 (これは原本踏襲のため Blocker ではない)。

## Recommended deltas vs implementer's proposal
- **基本そのまま採用**を推奨。 answer index 検証で誤りゼロ。
- **任意の追加微調整 (採用必須ではない)**:
  - 表現統一: order_color Lv1 の「ひだりから **1**ばんめ」「みぎから **1**ばんめ」と
    Lv2/Lv3 の「2ばんめ」「3ばんめ」混在は教育的に妥当 (やさしい→難しいの順序数学習)
    なので維持で良い。
  - count_total Lv3 #6 (mikan, count=9, choices=[7,8,9,10]) は
    Lv3 内で唯一「最大値=正解」の問題。distractor として 10 を入れる必要性は薄いが、
    難度演出としては許容。修正不要。

## Verification summary
- order_color: 24 問すべて answer ↔ choices ↔ items 整合。
- count_total: 24 問すべて count ↔ choices[answer] 整合、画像キー存在確認済み。
- Lv3 (8+8=16 問) は全件網羅検証済み。
- 提案の 2 件の意味的変更 (order_color Lv3 #5 / count_total Lv3 #7) は
  どちらも整合性を破壊せず、Lv3 全体の難度上限を抑制する方向で妥当。
- **結論: そのまま `questions.js` 14-101 行に差し替え可能**。
