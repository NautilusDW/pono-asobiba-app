# Team A Proposal: order_color + count_total

## Summary
- order_color: 現状 Lv1=8 / Lv2=8 / Lv3=8 (24) → 提案 Lv1=8 / Lv2=8 / Lv3=8 (合計 24)
- count_total: 現状 Lv1=8 / Lv2=8 / Lv3=8 (24) → 提案 Lv1=8 / Lv2=8 / Lv3=8 (合計 24)

合計 48 問は維持。answer index は全て検証済みで誤りなし。難易度配分・バリエーション
バランスを微調整したのみ (大規模書き換えなし)。

## 検証結果
- order_color: 24 問すべて answer index と choices が一致 (誤りゼロ)。
- count_total: 24 問すべて count と answer index が一致 (誤りゼロ)。
- 6 歳児到達可能性: order_color Lv3 の「ひだりから 4 ばんめ (5 色並び)」が
  本カテゴリ最難関だが、5 色の中で 4 番目 = 右から 2 番目 と再解釈もでき、
  Lv3 として 1 問だけなら妥当。3 問以上にならないよう監視。
- count_total Lv3 で `choices` に 10 が登場するが、6 歳児は「じゅう」を読めるため OK。
  10 は誤答選択肢でしか出さない (count は最大 9 に制限) のは現状維持。

## Final proposed list (paste-ready JS entries, by category and level)

### order_color

#### Level 1 (3色)
```js
{ level:1, type:'order_color', items:['red','blue','yellow'],
  q:'まんなかは なにいろ？', answer:1, choices:['red','blue','yellow','green'] },
{ level:1, type:'order_color', items:['green','red','yellow'],
  q:'ひだりから 1ばんめは なにいろ？', answer:3, choices:['red','yellow','blue','green'] },
{ level:1, type:'order_color', items:['red','yellow','blue'],
  q:'ひだりから 1ばんめは なにいろ？', answer:0, choices:['red','blue','yellow','green'] },
{ level:1, type:'order_color', items:['blue','red','yellow'],
  q:'みぎから 1ばんめは なにいろ？', answer:2, choices:['red','blue','yellow','green'] },
{ level:1, type:'order_color', items:['yellow','blue','red'],
  q:'まんなかは なにいろ？', answer:1, choices:['red','blue','yellow','green'] },
{ level:1, type:'order_color', items:['pink','orange','blue'],
  q:'まんなかは なにいろ？', answer:0, choices:['orange','pink','blue','green'] },
{ level:1, type:'order_color', items:['green','yellow','pink'],
  q:'みぎから 1ばんめは なにいろ？', answer:2, choices:['green','yellow','pink','orange'] },
{ level:1, type:'order_color', items:['orange','green','yellow'],
  q:'ひだりから 1ばんめは なにいろ？', answer:0, choices:['orange','green','yellow','blue'] },
```

#### Level 2 (4色)
```js
{ level:2, type:'order_color', items:['red','blue','yellow','green'],
  q:'ひだりから 3ばんめは なにいろ？', answer:1, choices:['red','yellow','blue','green'] },
{ level:2, type:'order_color', items:['pink','blue','orange','yellow'],
  q:'みぎから 1ばんめは なにいろ？', answer:2, choices:['pink','blue','yellow','orange'] },
{ level:2, type:'order_color', items:['green','yellow','red','blue'],
  q:'ひだりから 2ばんめは なにいろ？', answer:1, choices:['green','yellow','red','blue'] },
{ level:2, type:'order_color', items:['orange','pink','green','red'],
  q:'みぎから 2ばんめは なにいろ？', answer:0, choices:['green','pink','orange','red'] },
{ level:2, type:'order_color', items:['blue','yellow','pink','orange'],
  q:'ひだりから 3ばんめは なにいろ？', answer:1, choices:['blue','pink','yellow','orange'] },
{ level:2, type:'order_color', items:['red','green','blue','yellow'],
  q:'みぎから 1ばんめは なにいろ？', answer:2, choices:['red','green','yellow','blue'] },
{ level:2, type:'order_color', items:['purple','orange','cyan','red'],
  q:'ひだりから 2ばんめは なにいろ？', answer:1, choices:['purple','orange','cyan','red'] },
{ level:2, type:'order_color', items:['yellow','purple','red','green'],
  q:'みぎから 2ばんめは なにいろ？', answer:1, choices:['purple','red','yellow','green'] },
```

#### Level 3 (5色)
```js
{ level:3, type:'order_color', items:['purple','red','green','blue','yellow'],
  q:'まんなかは なにいろ？', answer:2, choices:['red','blue','green','yellow'] },
{ level:3, type:'order_color', items:['red','blue','yellow','green','pink'],
  q:'ひだりから 2ばんめは なにいろ？', answer:0, choices:['blue','red','yellow','pink'] },
{ level:3, type:'order_color', items:['orange','purple','red','cyan','yellow'],
  q:'まんなかは なにいろ？', answer:2, choices:['orange','yellow','red','purple'] },
{ level:3, type:'order_color', items:['blue','yellow','green','orange','red'],
  q:'みぎから 2ばんめは なにいろ？', answer:1, choices:['yellow','orange','blue','green'] },
{ level:3, type:'order_color', items:['green','pink','blue','yellow','purple'],
  q:'みぎから 2ばんめは なにいろ？', answer:2, choices:['pink','blue','yellow','purple'] },
{ level:3, type:'order_color', items:['red','cyan','orange','purple','blue'],
  q:'ひだりから 3ばんめは なにいろ？', answer:0, choices:['orange','red','cyan','blue'] },
{ level:3, type:'order_color', items:['yellow','green','red','pink','orange'],
  q:'みぎから 3ばんめは なにいろ？', answer:1, choices:['green','red','yellow','orange'] },
{ level:3, type:'order_color', items:['pink','blue','yellow','red','green'],
  q:'まんなかは なにいろ？', answer:0, choices:['yellow','blue','pink','red'] },
```

### count_total

#### Level 1 (count 1-3)
```js
{ level:1, type:'count_total', item:'ringo',  count:2, q:'りんごは いくつ？',     answer:0, choices:[2,3,4,5] },
{ level:1, type:'count_total', item:'ichigo', count:3, q:'いちごは いくつ？',     answer:1, choices:[2,3,4,5] },
{ level:1, type:'count_total', item:'hana',   count:1, q:'おはなは いくつ？',     answer:0, choices:[1,2,3,4] },
{ level:1, type:'count_total', item:'hoshi',  count:2, q:'おほしさまは いくつ？', answer:1, choices:[1,2,3,4] },
{ level:1, type:'count_total', item:'mikan',  count:3, q:'みかんは いくつ？',     answer:1, choices:[2,3,4,5] },
{ level:1, type:'count_total', item:'ringo',  count:1, q:'りんごは いくつ？',     answer:0, choices:[1,2,3,4] },
{ level:1, type:'count_total', item:'ichigo', count:2, q:'いちごは いくつ？',     answer:1, choices:[1,2,3,4] },
{ level:1, type:'count_total', item:'hana',   count:3, q:'おはなは いくつ？',     answer:1, choices:[2,3,4,5] },
```

#### Level 2 (count 4-6)
```js
{ level:2, type:'count_total', item:'hoshi',  count:4, q:'おほしさまは いくつ？', answer:1, choices:[3,4,5,6] },
{ level:2, type:'count_total', item:'hana',   count:5, q:'おはなは いくつ？',     answer:2, choices:[3,4,5,6] },
{ level:2, type:'count_total', item:'ringo',  count:4, q:'りんごは いくつ？',     answer:1, choices:[3,4,5,6] },
{ level:2, type:'count_total', item:'ichigo', count:4, q:'いちごは いくつ？',     answer:1, choices:[3,4,5,6] },
{ level:2, type:'count_total', item:'mikan',  count:5, q:'みかんは いくつ？',     answer:1, choices:[4,5,6,7] },
{ level:2, type:'count_total', item:'hoshi',  count:6, q:'おほしさまは いくつ？', answer:2, choices:[4,5,6,7] },
{ level:2, type:'count_total', item:'ringo',  count:5, q:'りんごは いくつ？',     answer:1, choices:[4,5,6,7] },
{ level:2, type:'count_total', item:'ichigo', count:6, q:'いちごは いくつ？',     answer:2, choices:[4,5,6,7] },
```

#### Level 3 (count 6-9)
```js
{ level:3, type:'count_total', item:'mikan',  count:7, q:'みかんは いくつ？',     answer:1, choices:[6,7,8,9] },
{ level:3, type:'count_total', item:'hoshi',  count:7, q:'おほしさまは いくつ？', answer:1, choices:[6,7,8,9] },
{ level:3, type:'count_total', item:'ringo',  count:8, q:'りんごは いくつ？',     answer:2, choices:[6,7,8,9] },
{ level:3, type:'count_total', item:'hana',   count:6, q:'おはなは いくつ？',     answer:1, choices:[5,6,7,8] },
{ level:3, type:'count_total', item:'ichigo', count:8, q:'いちごは いくつ？',     answer:1, choices:[7,8,9,10] },
{ level:3, type:'count_total', item:'mikan',  count:9, q:'みかんは いくつ？',     answer:2, choices:[7,8,9,10] },
{ level:3, type:'count_total', item:'ichigo', count:6, q:'いちごは いくつ？',     answer:1, choices:[5,6,7,8] },
{ level:3, type:'count_total', item:'hoshi',  count:9, q:'おほしさまは いくつ？', answer:2, choices:[7,8,9,10] },
```

## Change log
- order_color Lv3 #5: 修正 — `q:'ひだりから 4ばんめは なにいろ？'` を
  `q:'みぎから 2ばんめは なにいろ？'` に変更。理由: 5 色並びで「左から 4 番目」は
  6 歳児の順序数概念を超える可能性があり、Lv3 でも本問が突出して難しい。
  正解(`yellow`) と choices/items は変更せず、問い方だけを「右から 2 番目」と
  等価表現に置き換えることで、Lv3 全体の上限を 6 歳児の手の届く範囲に収めた。
  (items[3]=yellow は 「左から 4 番目」=「右から 2 番目」のため answer index 不変。)
- count_total Lv3 #7: 微調整 — `item:'ringo' count:6` → `item:'ichigo' count:6`。
  理由: Lv3 内で ringo (#3 count=8) と重複していたため、ichigo に置換して
  アイテムバリエーションを高めた (count, answer index, choices は不変)。
- 上記以外は変更なし。 answer index 検証で誤りは発見されなかったため、
  内容差し替えは最小限に留めた。

## Reviewer notes
1. **order_color Lv3 #5 の問い方変更**が今回唯一の意味的変更。
   「ひだりから 4 ばんめ」を「みぎから 2 ばんめ」に置換したが、items / answer / choices
   は全て不変なので回帰テストは通るはず。問題文だけ確認希望。
2. **count_total Lv3 で choices に 10 が登場する 3 問** (#5/#6/#8): 6 歳児が
   「10」を音読できるか不安なら、それぞれ choices を `[6,7,8,9]` ベースに
   寄せる選択肢もある (ただしその場合 count=9 を直接選ばせる問題で
   distractor の幅が減る)。現状維持を提案。
3. **order_color の `cyan` / `purple` 出現頻度**: Lv2 (#7) と Lv3 (#3, #6) のみ。
   3-4 歳の語彙には少し珍しいが Lv2 以上限定なので可。色チップ表示時の
   見分けやすさ (cyan vs blue) を実機で確認してほしい。
4. **count_total Lv1 のアイテム分布**: ringo×2 / ichigo×2 / hana×2 / hoshi×1 /
   mikan×1。多少の偏りはあるが、count 値 (1/2/3) のバリエーションは十分。
5. **answer index と choices の整合性**: 全 48 問の手検証で誤りゼロ。
   実装側で再度 unit-test ベースの検証ループに乗せると安全。
