# Review A1 (independent, difficulty-focused)

## Overall verdict
- **部分採用** (Conditional acceptance with 2-3 必須修正)

実装者の提案は概ね妥当だが、以下の難易度面の懸念が残っており、追加調整が必要。
特に count_total Lv3 で「choices に 10 が含まれるが count 最大値が 9」という
パターンが 3 問あり、6 歳児の上限ぎりぎり。また order_color Lv3 #5 の
"みぎから 2 ばんめ" 化は方向性として正しいが、それでも Lv3 全体に「2 ばんめ」が
集中しすぎている。

## Difficulty calibration concerns

### order_color Lv3 全体: 「ばんめ」位置の偏り
提案後の Lv3 8 問の問題タイプ分布を確認すると:
- まんなか (5 色中の 3 番目): 3 問 (#1, #3, #8)
- ひだりから 2ばんめ: 1 問 (#2)
- ひだりから 3ばんめ: 1 問 (#6)
- みぎから 2ばんめ: 2 問 (#4, #5) ← #5 は実装者の修正で増えた
- みぎから 3ばんめ: 1 問 (#7)

「ひだりから 4 ばんめ」を「みぎから 2 ばんめ」に置換した結果、Lv3 で
**みぎから 2 ばんめが 2 問** に増加している。同一問い方が連続出題されると
飽きが早い。3-6 歳児は同パターン連続にも敏感なので、#5 の置換先は
別の表現 (例: 「ひだりから 4 ばんめ」のままで、items の並びを
「答えが yellow で 4 番目」になるよう簡単な色だけに差し替える) を
検討する方がベター。具体的には items=['red','blue','green','yellow','pink']
にすれば "ひだりから 4 ばんめ"=yellow となり、purple/cyan のような難色が
ない分、5 色順序問題として 6 歳児が手の届く難易度になる。

### count_total Lv3: choices に 10 を含む問題が 3 問
- #5: ichigo count=8, choices=[7,8,9,10]
- #6: mikan count=9, choices=[7,8,9,10]
- #8: hoshi count=9, choices=[7,8,9,10]

実装者は「6 歳児は『じゅう』を読めるため OK」としているが、
**count=9 のときに distractor として 10 が並ぶ**のは「9 と 10 の弁別」を
要求する設計で、これは 6 歳児上端の能力。3-6 歳の最広帯を想定するこの
アプリでは厳しすぎる可能性が高い。せめて 1 問 (#5 count=8) は残し、
#6 と #8 のどちらかは choices=[6,7,8,9] に寄せて「9 が最大」の
シンプルな選択肢に戻すべき。

特に **#8 hoshi count=9 choices=[7,8,9,10]** は最終問題として
出やすいため、Lv3 のハードキャップとして 10 を distractor に
出さない方が安全。

### order_color Lv1 のひっかけ的 distractor
- Lv1 #6: items=['pink','orange','blue'], q='まんなか' answer=0(orange),
  choices=['orange','pink','blue','green']
  → 正解 orange が choices[0]、 distractor pink (左端の色) が choices[1]。
  3 歳児には pink/orange の弁別自体が難しい (近い暖色)。 distractor として
  blue/green と並んでいるのは OK だが、pink を含むのは Lv1 として
  少し厳しい。 維持は許容範囲だが、「Lv1 で 3 歳児が真っ先に解く問題」
  という想定なら、pink/orange を同時提示しないほうが優しい。

## Specific question objections

### 1. **count_total Lv3 #6**: `mikan count=9 choices=[7,8,9,10]`
- 理由: count=9 で distractor に 10 を置くのは 6 歳児上端でも難しい。
  「9 個数えた後、選択肢に 10 がある」と「あれ、もう一個あったかな?」と
  迷いを誘発する設計。
- 推奨対応: **修正** — choices を `[6,7,8,9]` (answer=3) に変更。

### 2. **count_total Lv3 #8**: `hoshi count=9 choices=[7,8,9,10]`
- 理由: 上記 #6 と同じ。さらに hoshi (星) は形が複雑で重なって描画
  されるとカウントしにくい。9 個の星 + 10 を distractor にすると
  Lv3 の最終問題として難しすぎる。
- 推奨対応: **修正** — count を 8 に下げる、または choices を `[6,7,8,9]` に。
  個人的推奨は `count:8, choices:[6,7,8,9], answer:2`。

### 3. **order_color Lv3 #5 (実装者修正後)**: `みぎから 2ばんめ`
- 理由: 修正の方向性 (4 番目 → 2 ばんめ系に和らげる) は正しいが、
  Lv3 内で「みぎから 2 ばんめ」が #4 と #5 で連続/近接出題される。
- 推奨対応: **追加修正** — items を簡単 5 色 (red, blue, green, yellow, pink)
  に差し替えた上で、原案の「ひだりから 4 ばんめ」を維持する案を検討。
  または #5 を「みぎから 1 ばんめ」(=末端) に変更し
  items=['green','pink','blue','purple','yellow'] とすれば answer=yellow を維持しつつ
  Lv3 で末端問題を 1 つ入れて緩急をつけられる。

## Strengths to keep
- **answer index と choices の対応は全 48 問正確**。手検証で誤りなし。
- **count_total Lv1 の count 値分布 (1/2/3) が均等**。3 歳児にとって
  最初に出会う数の感覚が偏らない。
- **order_color Lv2 で 4 色問題に limited 色 (red/blue/yellow/green/pink/orange)
  を中心に使い、cyan/purple は 1 問ずつに抑えている**。これは難易度設計として適切。
- **count_total の item バリエーション (ringo/ichigo/hana/hoshi/mikan) を
  各レベルでローテーション**。同じ絵が連続しないので飽きにくい。
- **「まんなか」を Lv1 と Lv3 で活用**。順序数語彙の段階的導入として
  教育的に適切。

## Question-by-question annotations

### order_color
- **Lv1 #6** (`pink','orange','blue']`): pink/orange の近接色対比は 3 歳児には
  やや難。許容範囲だが要注意。
- **Lv3 #5**: 実装者修正で「みぎから 2ばんめ」化したが、#4 と被るため
  別表現への再検討を推奨。
- **Lv3 #6** (`['red','cyan','orange','purple','blue']`): cyan + purple +
  orange + blue という難色が 4 つも並ぶ。6 歳児でも「みずいろ vs あお」
  の弁別は難しい場合がある。choices=['orange','red','cyan','blue'] と
  cyan/blue が両方含まれており、誤答誘発が強い。**現状維持で OK だが、
  Lv3 の最難関枠として位置付けるべき**(連続出題は避ける)。

### count_total
- **Lv3 #5/#6/#8**: choices=[7,8,9,10] パターンが 3 問。最低 1 問は
  choices=[6,7,8,9] に戻すべき。
- **Lv3 全体**: count 値分布は 7×2, 8×2, 9×2, 6×2 で良好。

## Recommended deltas vs implementer's proposal

### 追加で削除すべき問題
- なし (全 48 問は維持で問題なし)

### 追加で修正すべき問題 (必須)
1. **count_total Lv3 #6** `mikan count=9` の choices を `[7,8,9,10]` →
   `[6,7,8,9]` に変更 (answer=3)。または #6 と #8 のどちらかを `[6,7,8,9]`
   ベースに揃える。
2. **count_total Lv3 #8** `hoshi count=9 choices=[7,8,9,10]` を
   `count=8 choices=[6,7,8,9] answer=2` に変更。理由: Lv3 最終問題として
   星 9 個 + 10 distractor は重い。

### 追加で修正すべき問題 (推奨)
3. **order_color Lv3 #5**: 「みぎから 2 ばんめ」が #4 と被るため、
   items を `['red','blue','green','yellow','pink']` に差し替えた上で
   原案 `q:'ひだりから 4ばんめは なにいろ？' answer=2 (green)` のような
   簡単 5 色にする案を検討。
   または現状維持のまま、ランダム出題ロジック側で「同じ問い方を連続させない」
   制御が入っているなら許容。

### 実装者の修正に同意できないもの
- **order_color Lv3 #5 の単純な問い方置換**: 方向性は理解できるが、
  Lv3 内の問い方分布バランスを崩しているため、items 側も合わせて
  調整するのがより良い。
- **count_total Lv3 で choices に 10 を残す判断**: 「6 歳児は 10 を
  読める」は事実だが、count=9 のときに 10 を distractor にするのは
  「9 と 10 の境界判別」を強いる設計で、3-6 歳の最広帯ターゲットでは
  最低 1 問は緩めるべき。

### 全体所感
実装者の提案は answer index 検証の質が高く、大規模な書き換えを
避けた判断は妥当。ただし「6 歳児が解ければ Lv3 OK」という基準で
止まっており、「3-6 歳の幅広い層が Lv3 でも諦めずチャレンジできる」
という観点が一部弱い。上記 #1〜#3 の修正で完成度が大幅に上がる。
