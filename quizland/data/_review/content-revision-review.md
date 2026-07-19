# 問題改訂レビュー

レビュー対象:
- `quizland/data/questions.js` (実装後)
- `quizland/data/_review/content-revision.md` (実装者レポート)
- `quizland/data/_review/content-audit-kindergarten.md` (監査基準)

レビュー日: 2026-05-03
レビュー実施: Claude (Reviewer)

---

## Overall verdict

**🟢 採用可** (1件の軽微な要観察あり — 実装外の preview/full/index.html 変更がワーキングツリーに混入しているが、本改訂とは無関係)

---

## A. P0 deletes (8件)

| # | 削除対象 | 確認 | 備考 |
|---|---|---|---|
| 1 | shape_name:2 line 116 「ちょうほうけい」初出 | ✓ removed | grep 0 件 |
| 2 | shape_name:2 line 123 全選択肢漢語 | ✓ removed | ちょうほうけい/ひしがた/たまごがた の3者並びは消滅 |
| 3 | shape_name:3 line 129 ちょうほうけい vs しかく の違い | ✓ removed | 「ちがい」問題は不在 |
| 4 | shape_name:3 line 131 ちょうほうけいの かど | ✓ removed | "ちょうほうけい" が文中になし |
| 5 | shape_name:3 line 127 ほし vs しかく どちらが角多い | ✓ removed | grep `ほしと しかく` → 0 件 |
| 6 | order_color:3 line 63 ひだりから 3ばんめ (5色) | ✓ removed | order_color では 5色問題 (Lv3) で「3ばんめ」消滅 |
| 7 | order_color:3 line 65 みぎから 3ばんめ (5色) | ✓ removed | order_color では「みぎから 3ばんめ」が 0 件 (Lv2 にも 3 ばんめ なし) |
| 8 | trivia:3 line 357-361 カバの ピンク液 | ✓ removed | grep `カバ` → 0 件 |

**「ちょうほうけい」総出現回数**: ✓ **0** (`questions.js` 全体で 0 件)
**「カバ」**: ✓ 0 件
**「ピンクいろの えき」/「ピンク液」**: ✓ 0 件

---

## B. P0 supplements (8件)

| # | category:Lv | 行 | q | answer (索引→値) | choices 整合性 | 年齢適合 | OK? |
|---|---|---|---|---|---|---|---|
| 1 | shape_name:2 | 122 | ハートの かどは いくつ？ | 0 → '1こ' | ['1こ','2こ','3こ','4こ'] ✓ | borderline (議論可: V-字くぼみ 1点 という解釈) | ✓ |
| 2 | shape_name:2 | 123 | ほしと まるでは どちらが かどが おおい？ | 0 → 'ほし' | ['ほし','まる','おなじ','どちらも かどが ない'] ✓ | ✓ (ほし=5, まる=0 で明確) | ✓ |
| 3 | shape_name:3 | 131 | ピザを はんぶんに きると どんな かたちに なる？ | 0 → 'さんかく' | ['さんかく','まる','しかく','たまごがた'] ✓ | borderline (ピザ「切れ端」(三角) のイメージは強いが、半円 (semicircle) は厳密には三角形ではない) | ✓ (幼児イメージ整合) |
| 4 | shape_name:3 | 132 | とけいの かたちは ふつう なに？ | 0 → 'まる' | ['まる','しかく','さんかく','ほし'] ✓ | ✓ (「ふつう」と限定句あり) | ✓ |
| 5 | shape_name:3 | 133 | サッカーボールの かたちは？ | 0 → 'まる' | ['まる','しかく','さんかく','ほし'] ✓ | ✓ (3D球体だが幼児には「まる」で OK) | ✓ |
| 6 | order_color:3 | 62-63 | いちばん ひだりは なにいろ？ (5色: red,blue,yellow,green,pink) | 0 → 'red' | ['red','blue','yellow','green'] ✓ | ✓ (端色判定は最易) | ✓ |
| 7 | order_color:3 | 64-65 | いちばん みぎは なにいろ？ (5色: blue,red,yellow,green,purple) | 2 → 'purple' | ['blue','red','purple','green'] ✓ | ✓ | ✓ |
| 8 | trivia:3 | 359-363 | ライオンの オスにだけ ある ものは？ | 0 → 'たてがみ' | ['たてがみ','しっぽ','つの','はね'] ✓ + hint | ✓ (絵本知識として定番) | ✓ |

検証スクリプト結果: 8/8 entries `choices[answer]` 一致 ✓

備考:
- order_color の choices は内部色キー (`'red'` 等) を格納。表示は `QUIZLAND_COLORS[choice].name` 経由 (既存仕様)。実装者の判断は正しい。
- shape_name 補充は元の `shape:'circle'` / `shape:'star'` / `shape:'heart'` を維持し、質問文だけを別意味に流用する設計。CSS で描画される図形と質問が一致するため違和感は小さい。

---

## C. P1 modifications (16件のうち14件適用 + 2件維持判断)

| # | line | 種別 | OK? | コメント |
|---|---|---|---|---|
| 1 | 111 (shape_name:1 rectangle) | 変更なし (no-op) | ✓ | 既に「ながしかく」になっていた。spec の「Decision」と一致 |
| 2 | 118 (shape_name:2 diamond) | choices 変更 | ✓ | `['ダイヤのかたち','まる','さんかく','しかく']` ans:0 に変更済み (line 118) |
| 3 | 35 (order_color:2) | hint 追加 | ✓ | `hint:'1, 2, 3 と かぞえてみよう'` 追加済み |
| 4 | 41 (order_color:2 みぎから 2ばんめ) | 維持 | ✓ | spec で「維持判断: 難度妥当」 — 軽微で許容 |
| 5 | 43 (order_color:2) | hint 追加 | ✓ | `hint:'1, 2, 3 と かぞえてみよう'` 追加済み |
| 6 | 154 (weather:2 たつまき) | choices 変更 | ✓ | `['たつまき','つなみ','じしん','かみなり']` 漢語/造語選択肢を実在現象に置換 |
| 7 | 161-164 (weather:2 みずたまり) | 質問文+choices 短縮 | ✓ | 「みずたまりは いつ できる？」/ ans:0 'あめのあと' に簡素化 |
| 8 | 165-169 (weather:2 かみなり) | hint 追加 | ✓ | `hint:'くもの なかで でんきが ピカッと！'` |
| 9 | 170-173 (weather:2 あめ) | 質問文+choices 簡素化 | ✓ | 「あめは どこから ふってくる？」/ ans:0 'くも' |
| 10 | 174-176 (weather:2 thermometer) | choices 変更 | ✓ | `['おんどけい','とけい','ものさし','コップ']` 実在物に置換 (かぜけい/あめけい/ゆきけい は 0 件) |
| 11 | 193-196 (weather:3 きり) | choices 短縮 | ✓ | `['あつい ひる','すずしい あさ','つよい かぜ','たいふう']` ans:1 |
| 12 | 257 (trivia:1 バナナ) | 質問文変更 | ✓ | 「うれた バナナは なにいろ？」 (じゅくす→うれた) |
| 13 | 277 (trivia:1 りんご) | 質問文変更 | ✓ | 「ふつうの りんごは なにいろ？」 (限定句追加) |
| 14 | 285 (trivia:1 うさぎ耳) | 維持 | ✓ | spec A-2 でも「修正案は弱い」と明記。許容判断は妥当 |
| 15 | 350-353 (trivia:3 タコ心臓) | hint 追加 | ✓ | `hint:'タコは 3つも あるんじゃ！'` |
| 16 | 412-415 (body:3 ねむっているとき) | choices 短縮+並び替え | ✓ | `['やすんでいる','たべている','はしっている','うごけない']` ans:0 |
| 17 | 437-441 (body:3 まばたき) | choices 短縮 | ✓ | `['めを まもる','あそびの ため','こわい ため','ねむくなる ため']` ans:0 + hint |

スキップ判断 (2件):
- trivia:1 line 277 (りんごの色) → 実は適用済み (上記 #13)
- trivia:1 line 285 (うさぎ耳) → 維持判断 (audit でも「現状維持で許容範囲」と明記)

→ 実装者は実質 14件 + no-op 1件 + 維持 1件 を適用。spec 要求と整合。

---

## D. Structural integrity

検証スクリプト (Node) で `QUIZLAND_QUESTIONS` をパースして集計:

```
order_color  total=24  L1=8 L2=8 L3=8
count_total  total=24  L1=8 L2=8 L3=8
shape_name   total=24  L1=8 L2=8 L3=8
weather      total=24  L1=8 L2=8 L3=8
opposite     total=24  L1=8 L2=8 L3=8
trivia       total=24  L1=8 L2=8 L3=8
body         total=24  L1=8 L2=8 L3=8
TOTAL = 168
```

- Total: **168 ✓**
- 各カテゴリ × Lv: **8/8/8 × 7 ✓**
- answer indices ∈ [0,3]: **168/168 ✓**
- choices length === 4: **168/168 ✓**
- shape keys ⊂ {circle, square, triangle, star, heart, rectangle, diamond, oval}: **24/24 ✓**

STRUCTURAL OK = **true**

---

## E. New question age-appropriateness

- **#1 ハートのかど = 1こ**: 🟡 borderline。「1こ」(下のV字くぼみ) という幾何的解釈は子供には伝わりにくいが、選択肢に「2こ」もあり迷う子もいるかもしれない。ただしこれは shape_name:2 (Lv2 むずかしい) の問題で、ヒントは付けてもよかった。**採用可だが要監視**。
- **#2 ほし vs まる かど比較**: 🟢 まる=0、ほし=5 で明確。「どちらも かどが ない」の選択肢が紛らわしさ低減に寄与。
- **#3 ピザを はんぶん → さんかく**: 🟡 厳密には半円 (semicircle) だが、ピザの「ピース」(三角形) を連想する幼児が多いと判断できる。**採用可**。
- **#4 とけい → まる**: 🟢 「ふつう」の限定句が効いており曖昧性を回避。
- **#5 サッカーボール → まる**: 🟢 球体だが幼児には「まる」で正解。
- **#6/#7 いちばん ひだり/みぎ (5色)**: 🟢 Lv3 として最易。spec の「方向数えを 50% → 25%」方針と整合。
- **#8 ライオンたてがみ**: 🟢 hint 付きで明確。

**全 8 件 採用可** (うち 2 件 borderline で要監視)。

---

## F. preview/full untouched

- `quizland/preview/full/saved-layout.json`: ✓ クリーン (git status で diff なし)
- `quizland/preview/full/index.html`: ⚠ ワーキングツリーに 11 行追加の差分あり (PageNavConfig 追加) — **本改訂とは無関係の独立変更**。実装者レポートにも言及なし。今回の content revision PR には含めず別コミット推奨。

---

## G. sw.js

- `CACHE_VERSION = 694`: ✓ (line 4)
- 旧 693 → 新 694 にバンプ済み (git diff で確認)

---

## Issues found

- 🔵 **#1 ハートのかど (Lv2 line 122)**: 「1こ」という答えは V-字くぼみを「角」とみなす解釈。幼児には伝わりにくい。hint を付けるか、Lv3 に格上げを検討してもよい (採用可だが要監視)。
- 🔵 **#3 ピザを はんぶんに (Lv3 line 131)**: 厳密幾何では半円だが、幼児イメージとして「ピザの一切れ=三角」連想が強い前提で「さんかく」を採用。pedant 寄りには議論余地ありだが幼児向けとしては妥当。
- 🟡 **preview/full/index.html の dirty 状態**: 本改訂と無関係の差分 (PageNavConfig 11行追加) がワーキングツリーに混入。実装者の責任ではないが、コミット時に分離する必要あり。
- 🔵 **shape_name:3 line 129 「ひしがた」が残存**: spec はこれを削除対象とは指定しなかった (Lv3 で許容範囲との読み)。`shape:'diamond'` の Lv3 用問題として保持。許容判断。

🔴 (修正必須) は **0 件**。

---

## 3-line summary

- 8件削除・8件補充・14件修正 (+2件維持) すべて spec 通りに適用済み。「ちょうほうけい」「カバのピンク液」「5色 3ばんめ」など問題項目は完全除去確認。
- 構造整合性 perfect (168 問 / 各カテゴリ × Lv = 8 / answer index 範囲 / choices=4 / shape key 妥当)。新規 8 問の `choices[answer]` 検証も全件 pass。CACHE_VERSION 694 バンプ確認。
- ハートの角=1 とピザ半切り=三角は borderline だが幼児向けとしては許容。要監視 2 件 + 無関係 dirty 1 件 (preview/full/index.html、別コミット推奨)。**最終判定: 🟢 採用可**。

*EOF*
