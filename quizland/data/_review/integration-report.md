# Integration Report

## Final counts
| Category | Lv1 | Lv2 | Lv3 | Total |
|---|---|---|---|---|
| order_color | 8 | 8 | 8 | 24 |
| count_total | 8 | 8 | 8 | 24 |
| shape_name | 8 | 8 | 8 | 24 |
| weather | 8 | 8 | 8 | 24 |
| opposite | 8 | 8 | 8 | 24 |
| trivia | 8 | 8 | 8 | 24 |
| body | 8 | 8 | 8 | 24 |
| **TOTAL** | **56** | **56** | **56** | **168** |

(自動検証スクリプトで確認済み — `node` で structural pass, errors=0)

## Decisions applied

### A群 (必須採用)
- **A1** ✓ count_total Lv3 末尾の hoshi count を 9 → 8 に変更 / choices `[6,7,8,9]` / answer index 2 (line ~100)
- **A2** ✓ shape_name Lv3「ひしがた どんなかたちのなかま？」を削除 →「ほしと しかくでは どちらが かどが おおい？」(answer:0='ほし') を追加
- **A3** ✓ opposite「なく⇄わらう」Lv3 → Lv2 に降格、「あたらしい⇄ふるい」Lv2 → Lv3 に昇格 (Lv2=8 / Lv3=8 維持)
- **A4** ✓ body Lv2 「いちばん おおきい きかんは？」を「からだぜんたいを つつんで まもっているのは？」に書き換え、choices=`['ふく','ひふ','ほね','け']` answer=1、detail も「きかん」→「ぶぶん」、hint も「つつんで いる」表現に
- **A5** ✓ body Lv3 かさぶた choices[3]: `'ちが でないように するため (だけ)'` → `'いろを つけるため'`
- **A6** ✓ weather Lv3 Hurricane (移動先) distractor「こうずい」→「おおあめ」に置換
- **A7** ✓ weather Lv1 Wind distractor「あらし」→「くもり」に置換
- **A8** ✓ weather Lv3「なつ あつい」を Lv2 に降格、Hurricane Lv2 を Lv3 に移動、C4 ゆきの結晶を Lv3 に追加。Team C 提案にあった「たいふうは どこから やってくる？」を削除して Lv3=8 を維持 (Hurricane image と概念重複)
- **A9** ✓ weather Lv3 じょうはつ問: q の「くう」→「そら」に修正
- **A10** ✓ trivia 最終構成 Lv1=8 / Lv2=8 / Lv3=8。Lv3 = ジンベイザメ / イルカ / シロナガスクジラ / クモ / バナナくさ / タコ心臓3つ / フラミンゴ / カバ汗。キリン睡眠は B6 値修正の上 Lv2 へ。Lv2 枠調整は カメ100年を削除して キリン を入れた (コアラは Lv2 維持、PM の代案ではなく カメ削除を選択)
- **A11** ✓ trivia Lv1 うさぎ distractor `'ぺたんと たれている'` → `'まるい ちいさい'`
- **A12** ✓ trivia Lv1 りんご distractor `'みどり'` → `'しろ'`
- **A13** ✓ trivia Lv1「うしの なきごえ」を削除 → 「ふゆに そらから ふってくる しろい もの＝ゆき」を追加
- **A14** ✓ trivia Lv3 カバ汗を「えき (ピンク)」表現に書き換え。q を「カバの からだから でる ピンクいろの えきは なんの やくわり？」、answer=0='ひやけどめに なる'、detail も冒頭で「カバの あせ」と言わず「カバの からだから でる ピンクの えきは ひやけどめに なるよ。ちが でてるんじゃ ないよ！」に変更
- **A15** ✓ shape_name Lv1 から `diamond` を外し、heart を別問題文 (「これは なんの かたち？」) で 2 問入れる構成 (8問: circle / square / triangle / heart / star / rectangle / oval / heart-別バージョン)

### B群 (強推奨)
- **B1** ✓ body「片手の指 5本」Lv2 → Lv1 降格。Lv2 に「いきを すうのは どこ？(=はい)」を新規追加。Lv1 は Forearm を抜いて 5本指 を入れて 8 問キープ
- **B2** ✓ body Lv3 Leg 画像を「ねむっているとき からだは どうなっている？」概念問に置換 (PM 提供例をそのまま採用)
- **B3** ✓ shape_name Lv2 #2 を「ほしの かどは なんこ？」(従来 Lv3) に差し替え。Lv3 は star vs square 比較問 (A2) で穴埋め
- **B4** ✓ opposite Lv3「たすける⇄じゃまをする」distractor を動詞ベースに統一: `['いっしょに あそぶ','じゃまを する','たすけて あげる','なにも しない']` answer=1
- **B5** ✓ opposite Lv2「かたい⇄やわらかい」distractor「やすい」→「つよい」
- **B6** ✓ trivia キリン睡眠: 値を `'2じかんくらい'` → `'3じかんくらい'`、choices=`['1じかんくらい','3じかんくらい','5じかんくらい','12じかんくらい']` answer=1、Lv2 へ降格
- **B7** ✓ weather/body 画像化: 🌡️ → `Thermometer/Thermometer_normal_1.png` (Lv2)、👅 → `Tongue/Tongue_normal_1.png` (Lv2)。emoji リテラル参照は questions data から完全消滅

### C群 (ユーザー判断結果)
- **C1** ✓ shape_name Lv3「なんかっけい？」を削除。Lv3 8問目に「まると さんかくでは どちらが かどが おおい？」を追加 (A2 と同じ「視覚比較形式」を踏襲)
- **C2** ✓ opposite Lv1「たくさん⇄すこし」distractor「おおい」維持
- **C3** ✓ opposite Lv3「ほめる⇄しかる」distractor「おこる」維持
- **C4** ✓ weather Lv3 ゆきの結晶 復活。文言は PM 指定どおり: `q:'ゆきの けっしょうは どんな かたち？', hint:'とても ちいさい こおりの かたち！', answer:2, choices:['まる','ほし','つの が 6つ ある かたち','しかく']`

### コメント更新
- line 131 (たべもの・のりもの) のコメント: 「ことばあわせ」→「ずかん (wordmatch)」
- line 240 相当 (どうぶつ・むし) のコメント: 「ことばあわせ」→「ずかん (wordmatch)」

## Editorial judgment calls (where I had latitude)

1. **shape_name Lv1 8問目**: PM A15 が許す範囲で `heart` を別問題文「これは なんの かたち？」で再採用 (Lv1 #4 が「これは どんな かたち？」、Lv1 #8 が「これは なんの かたち？」)。質問文の表現バリエーション学習にもなる。
2. **shape_name Lv3 8問目**: C1 で「なんかっけい？」削除分の穴埋めとして「まると さんかくでは どちらが かどが おおい？」(answer=1=さんかく) を追加。A2 の視覚比較問と並行で「角の有無/数の比較」軸を強化。
3. **weather Lv2/Lv3 構成**: A8 / C4 / A6 / Hurricane 移動を全部混ぜると Lv2=9 か Lv3=9 になる組み合わせがあったため、Team C 提案にあった Lv3「たいふうは どこから やってくる？」を削除 (Hurricane 画像問と概念重複) して Lv3=8 を維持。これは PM「整合性を保つ調整は integrator の判断に任せる」に基づく判断。
4. **trivia Lv2 構成**: A10 で キリン睡眠を Lv2 に降格すると Lv2=9 になるため、PM 代案 (コアラ→Lv3) ではなく Team D Lv2 の「カメは どのくらい いきる？」(100年級) を削除する方を選択。理由: コアラ-ユーカリは未就学児に印象的で「びっくり豆知識」価値が高い / カメ寿命は数値理解が必要で 4-5歳には数字感覚が伴いにくい。PM の Lv3 explicit list は不変。
5. **body Lv1 構成**: B1 で 5本指 を Lv1 に降格すると Lv1=9 になるため、Forearm 画像を削除 (Palm 画像と「て・うで」概念で重複していた)。Lv1 にとって Eyes/Mouth_part/Palm/Foot_part の 4 画像 + 5 trivia (においかぐ/みる/きく/5本指) という構成。
6. **opposite Lv3 たすける distractor**: B4「動詞ベース統一」要件を満たすため、`'たたかう'` を `'たすけて あげる'` に置換 (たたかう は動詞だが正解と意味が逆方向すぎ、distractor として機能せず誤誘導になりうる)。`'いっしょに あそぶ'` `'なにも しない'` `'たすけて あげる'` で「協力寄り」と「無関心」を並べ、`'じゃまを する'` だけが「妨害」になる構造。
7. **weather Lv1 Cloud + くも-trivia 重複**: Team C は意図的に両方残していた (画像=くもり天気、trivia=くも(雲そのもの))。PM 指示に削除指示なしのため維持。
8. **shape_name Lv2 重複懸念**: heart, oval が Lv1/Lv2 両方に登場 (Lv1=「どんなかたち」、Lv2=「なんのかたち」または「たまごがた」位置の選択肢シャッフル)。Team B 提案のままで段階学習意図あり、維持。

## Integrity verification
- **answer/choices integrity**: 168/168 ✓ (Node スクリプトで全件 `answer < choices.length` 検証)
- **count_total integrity**: `choices[answer] === count` を全 24 問で確認 ✓
- **order_color integrity**: 「ひだりから N ばんめ」「みぎから N ばんめ」「まんなか」表現を items[idx] に対して整合検証、24/24 ✓
- **shape key inventory**: circle / square / triangle / star / heart / rectangle / diamond / oval のみ使用 ✓
- **image paths**: 18 distinct paths、全て `assets/images/ocean/<dir>/<file>` 配下に実在を fs.existsSync で確認 ✓
  - Cloud, Ear_part, Eyes, Foot_part, Hurricane, Mouth_part, Nose_part, Palm, Rain, Rainbow, Snow, Sun, Teeth, **Thermometer (新規)**, Thunder, **Tongue (新規)**, Tornado, Wind
  - 新規追加 2 path: Thermometer, Tongue (両方とも team-c で実在確認済 + 直接 ls で再確認)
- **emoji リテラル**: questions data から完全消滅 (🌡️ / 👅 / 🦵 すべて画像化または概念問に置換) ✓
- **シンタックス**: Node でファイル全体を require できることを確認 ✓

## sw.js
- CACHE_VERSION: **663 → 664**
- ファイル: `d:/AppDevelopment/pono-asobiba-app/sw.js` line 4

## Notes for verifiers (重点的に見てほしい点)

1. **trivia Lv2 から「カメは 100年」を削除した判断**: PM 代案 (コアラ→Lv3) を採用しなかった。子どもがカメ問題を覚えていた場合、突然消えるので回帰確認希望。代わりに キリン睡眠 が Lv2 に増えている。
2. **shape_name Lv1 #4 と #8 が両方 heart**: 質問文だけ違う (`これは どんな かたち？` vs `これは なんの かたち？`)、4択順序も違う。同一カテゴリ Lv1 に同 shape を 2 度出すのは仕様上 OK だが、出題ロジック (重複回避シャッフル) で連続出題されないか実機確認希望。
3. **weather Lv1 Cloud 画像問題 + くも(空のふわふわ) trivia 問題が両方存在**: 別概念だが、子どもには区別が難しい可能性。1 問にまとめるか別途検討余地あり。
4. **opposite Lv3 たすける distractor**: B4 で動詞統一を行ったが、`'たすけて あげる'` は「たすける」と意味が同方向で distractor として「これも正解では？」と感じる子がいるかも。再修正の余地あり。
5. **body Lv1 から Forearm 画像削除**: Lv1 の身体イメージ画像が Eyes/Mouth/Palm/Foot_part の 4 つに減った。「うで」を独立して聞きたい場合は Lv2/Lv3 で補強検討。

## Files edited
- `d:/AppDevelopment/pono-asobiba-app/quizland/data/questions.js` (全面再構成)
- `d:/AppDevelopment/pono-asobiba-app/sw.js` (CACHE_VERSION 663 → 664)
- `d:/AppDevelopment/pono-asobiba-app/quizland/data/_review/integration-report.md` (このファイル / 新規)

## Confirmation
全 168 問 = 7 カテゴリ × 24 問 (Lv1/Lv2/Lv3 各 8 問) で構造検証済み・answer index 整合性 168/168 ✓・shape key 妥当性 ✓・画像パス実在性 18/18 ✓・syntactic validity (Node require) ✓。
