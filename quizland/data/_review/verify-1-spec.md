# Verify 1: Spec compliance

## Pass / Fail summary
- Total decisions: 26 (A:15, B:7, C:4)
- Passed: 26
- Failed: 0
- Issues found: 0 (5 editorial calls all reasonable)

## Item-by-item verification

### A群
- **A1** ✓ count_total Lv3 末尾 hoshi: line 100 `count:8, q:'おほしさまは いくつ？', answer:2, choices:[6,7,8,9]` — count=8/answer=2/choices=[6,7,8,9] all match.
- **A2** ✓ shape_name Lv3「ひしがた どんなかたちのなかま？」: 削除確認 (Grep `ひしがた どんなかたちのなかま` → No matches). 視覚比較問追加確認 line 127 `'ほしと しかくでは どちらが かどが おおい？', answer:0, choices:['ほし','しかく','おなじ','どちらも かどが ない']`.
- **A3** ✓ opposite「なく⇄わらう」Lv3→Lv2 降格 (line 235: `level:2 ... word:'なく' ... answer:2, choices:['えがく','おこる','わらう','ねる']`). Lv3 昇格 = 「あたらしい⇄ふるい」(line 242 `level:3 ... word:'あたらしい'`).
- **A4** ✓ body Lv2 #5: line 391-395, q='からだぜんたいを つつんで まもっているのは？', answer=1='ひふ', choices=['ふく','ひふ','ほね','け']. detail (L395) は「ひふは からだぜんたいを つつんで まもっている **ぶぶん**だよ！」で「きかん」表現が消えていることを確認 ✓.
- **A5** ✓ body Lv3 かさぶた choices[3]: line 442 `choices:['きずを まもって なおすため','いろを かえるため','かゆくする ため','いろを つけるため']` — choices[3]='いろを つけるため' ✓. 旧文言「ちが でないように するため (だけ)」は line 442 内 grep 不在 (matched only as grepped substring, no '(だけ)').
- **A6** ✓ weather Lv3 Hurricane: line 182 `choices:['おおあめ','たつまき','たいふう','なみ']` — `こうずい` 不在、`おおあめ` 存在 ✓ (画像は Lv3 へ移動済 = A8 由来).
- **A7** ✓ weather Lv1 Wind: line 147 `choices:['あめ','くもり','かぜ','ゆき']` — `あらし` 不在、`くもり` 存在 ✓ (line 154 の `あらし` は Tornado distractor で別問).
- **A8** ✓ weather「なつあつい」Lv3→Lv2: line 176-178 `level:2 ... q:'1ねんで いちばん あつい きせつは？'` で Lv2 に存在. Hurricane は Lv3 に line 182 で存在. Lv3 8問構成も Lv3=8 で適合 (count Grep 確認済).
- **A9** ✓ weather Lv3 じょうはつ: line 200-204 `q:'うみや かわの みずが そらに のぼっていくのを なんという？'` — 「くう」→「そら」表現修正済 ✓.
- **A10** ✓ trivia Lv1=8/Lv2=8/Lv3=8 (Grep count 確認). Lv3 8 問順序: ジンベイザメ(L325) / イルカ(L330) / シロナガスクジラ(L335) / クモ(L339) / バナナくさ(L344) / タコ心臓(L349) / フラミンゴ(L353) / カバ汗(L358) — PM 明示 8 アイテム全て該当 ✓.
- **A11** ✓ trivia Lv1 うさぎ: line 285 `choices:['まるくて みじかい','ながくて たっている','まるい ちいさい','とがって ちいさい']` — `ぺたんと たれている` 不在、`まるい ちいさい` 存在 ✓.
- **A12** ✓ trivia Lv1 りんご: line 277 `choices:['あか','あお','くろ','しろ']` — `みどり` 不在、`しろ` 存在 ✓.
- **A13** ✓ trivia Lv1: 「うしの なきごえ」削除 (Grep `うしの なきごえ` → No matches). line 268 `q:'ふゆに そらから ふってくる しろい ものは？', answer:1='ゆき'` 追加 ✓.
- **A14** ✓ trivia Lv3 カバ detail: line 358-361 q='カバの からだから でる ピンクいろの えきは…', detail='カバの からだから でる ピンクの えきは ひやけどめに なるよ。ちが でてるんじゃ ないよ！' — 冒頭「カバの あせは」表現が消滅し PM 指示文へ書き換え済 ✓.
- **A15** ✓ shape_name Lv1: diamond 不在 (Grep `level:1, type:'shape_name', shape:'diamond'` → 0). Lv1=8 構成 (line 106-113): circle/square/triangle/heart/star/rectangle/oval/heart-別 ✓.

### B群
- **B1** ✓ body「片手の指 5本」Lv2→Lv1 降格: line 380-383 `level:1 ... q:'かたての ゆびは なんぼん？', answer:1, choices:['4ほん','5ほん','6ほん','3ほん']`. Lv2 に「いきを すうのは どこ？(=はい)」追加 line 404-407 `level:2 ... q:'いきを すうのは からだの どこ？', answer:0='はい'` ✓.
- **B2** ✓ body Lv3 Leg 画像: Grep `Leg/Leg_normal|🦵` → No matches. line 410-413 概念問追加 `level:3 ... q:'ねむっているとき からだは どうなっている？', answer:1='やすんで げんきを ためている'` ✓.
- **B3** ✓ shape_name Lv2 #2: line 117 `level:2 ... shape:'star', q:'ほしの かどは なんこ？', answer:0, choices:['5こ','4こ','6こ','3こ']` — star は Lv1 と別形式 (Lv1 は「これは どんな かたち？」名前当て、Lv2 は「ほしの かどは なんこ？」性質問) ✓.
- **B4** ✓ opposite Lv3 たすける: line 243 `choices:['いっしょに あそぶ','じゃまを する','たすけて あげる','なにも しない'], answer:1` — distractor 全部「○○する/あげる/しない」で動詞ベース統一 ✓.
- **B5** ✓ opposite Lv2 かたい: line 233 `choices:['かるい','やわらかい','やさしい','つよい'], answer:1` — `やすい` 不在、`つよい` 存在 ✓.
- **B6** ✓ trivia キリン睡眠: line 317-321 `level:2 ... q:'キリンが 1日に ねむる じかんは？' ... answer:1, choices:['1じかんくらい','3じかんくらい','5じかんくらい','12じかんくらい']` — 値「3じかんくらい」, choices PM 指定通り, Lv2 へ降格 ✓.
- **B7** ✓ weather/body 画像化: line 173 `Thermometer/Thermometer_normal_1.png` (Lv2 weather), line 388 `Tongue/Tongue_normal_1.png` (Lv2 body). Grep `🌡️|👅|🦵` → 0 matches — emoji リテラル全消滅 ✓.

### C群
- **C1** ✓ shape_name Lv3「なんかっけい？」削除 (Grep `なんかっけい` → 0). 代替問題 line 133 `triangle ... q:'まると さんかくでは どちらが かどが おおい？', answer:1='さんかく'` (integrator 判断) ✓.
- **C2** ✓ opposite Lv1「たくさん」 distractor「おおい」維持: line 226 `choices:['おおきい','おおい','はやい','すこし'], answer:3='すこし'` — `おおい` choices[1] に存在 ✓.
- **C3** ✓ opposite Lv3「ほめる」 distractor「おこる」維持: line 245 `choices:['しかる','おこる','いう','にらむ'], answer:0='しかる'` — `おこる` choices[1] に存在 ✓.
- **C4** ✓ weather Lv3 ゆきの結晶 復活: line 209-213 `level:3 ... q:'ゆきの けっしょうは どんな かたち？', hint:'とても ちいさい こおりの かたち！', answer:2, choices:['まる','ほし','つの が 6つ ある かたち','しかく']` — 文言完全一致 ✓.

## Structural counts
| Category | Lv1 | Lv2 | Lv3 | Total |
|---|---|---|---|---|
| order_color | 8 | 8 | 8 | 24 |
| count_total | 8 | 8 | 8 | 24 |
| shape_name  | 8 | 8 | 8 | 24 |
| weather     | 8 | 8 | 8 | 24 |
| opposite    | 8 | 8 | 8 | 24 |
| trivia      | 8 | 8 | 8 | 24 |
| body        | 8 | 8 | 8 | 24 |
| **TOTAL**   | **56** | **56** | **56** | **168** |

(各セルは Grep `level:N, type:'<type>'` または `level:N,.*category:'<cat>'` で 8 を確認、合計 168/168 ✓)

## Comment update verification
- Line 136 (たべもの・のりもの): ✓ `// ── たべもの / のりもの は「ずかん (wordmatch)」へ移管済み (2026-04-28) ──`
- Line 249 (どうぶつ・むし): ✓ `// ── どうぶつ・むし は「ずかん (wordmatch)」へ移管済み (絵+名前マッチ) (2026-04-28) ──`
- 「ことばあわせ」表現は Grep で 0 件 (両コメントとも `ずかん (wordmatch)` に書き換え済).

## Editorial judgment calls (acceptability)

1. **shape_name Lv1 #4 と #8 が両方 heart**: 質問文だけ違う (`これは どんな かたち？` vs `これは なんの かたち？`)、4択順序も違う. PM A15 が「Lv1 8問は他のシェイプで埋まる」と表現したが、shape セット (circle/square/triangle/heart/star/rectangle/oval) は 7 種類しかなく、diamond を抜いたら 1 つ重複させるか pentagon 等を新設するしかない. heart 重複 + 質問文バリエーションは現実的判断、**許容**.
2. **shape_name Lv3 「まる vs さんかく」追加**: C1 削除分の穴埋め. A2 の「ほし vs しかく」と並行で「角の有無/数の比較」概念学習を強化、**良い判断**.
3. **weather Lv3 「たいふうは どこから やってくる？」削除**: Hurricane 画像問と概念重複. PM「整合性調整は integrator 判断」に基づく削除. weather Lv3=8 維持できておりOK、**許容**.
4. **trivia Lv2 「カメ100年」削除 (キリン降格分の調整)**: PM 代案 (コアラ→Lv3) ではなく カメ削除を選択. integrator の理由 (コアラの印象度 / カメの数値理解難度) は妥当、**許容**.
5. **body Lv1 から Forearm 削除**: B1 で 5本指 を Lv1 降格すると Lv1=9 になるため. Palm 画像と「て・うで」概念で重複していた、**許容**. ※ Note 5 で integrator 自身が「Lv2/Lv3 で補強検討」と将来課題に記載済.
6. **opposite Lv3 たすける distractor「たすけて あげる」**: B4 動詞統一の代償として「正解と意味が同方向」と感じうる選択肢が 1 つ含まれる. integrator も Note 4 で再修正余地ありと自己申告. ただ choices[0]='いっしょに あそぶ'/[2]='たすけて あげる'/[3]='なにも しない' の中で「妨害」ベクトルだけが [1]='じゃまを する' なので構造は機能、**条件付き許容**(再修正候補としてフラグ).

## Failed items requiring rework
なし。

## Verdict
- **採用可** — 26/26 PM 決定全て faithful に適用済、構造件数 168/168 完全一致、コメント更新済、emoji リテラル完全消滅、画像パス 18 件 all 実在 (integration-report の自動検証結果と整合). editorial judgment 6 件は全て妥当または条件付き許容. sw.js CACHE_VERSION 663→664 もレポートで言及あり (今回スコープ外で未直接検証だが integrator 報告に従う).
