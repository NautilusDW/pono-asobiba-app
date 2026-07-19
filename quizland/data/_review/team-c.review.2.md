# Review C2 (independent, factual + asset-focused)

## Overall verdict
- 修正後採用 (concept は強い、画像/事実は全て検証済み。Lv3 の「かさぶた」選択肢の文言と「7色」detail の語順、`Tongue` 画像化の妥当性、Lv1 weather 8問目の `q` 重複だけ要調整)

## Image base path
- 確認結果: `assets/images/ocean/` 配下 (`quizland/index.html` L2045 で `imgEl.src = '../assets/images/ocean/' + q.img + ...`)
- 実装者の主張は正しい。`assets/images/word/` は flat な png のみ (banana.png, bus.png, cake.png 等) でサブフォルダ構造を持たないため、`Sun/Sun_normal_1.png` のような 2 階層パスは `ocean/` 配下でしか解決しない。

## Image asset existence table
| referenced path | exists? |
| --- | --- |
| ocean/Sun/Sun_normal_1.png | ✓ |
| ocean/Rain/Rain_normal_1.png | ✓ |
| ocean/Rainbow/Rainbow_normal_1.png | ✓ |
| ocean/Thunder/Thunder_normal_1.png | ✓ |
| ocean/Snow/Snow_normal_1.png | ✓ |
| ocean/Cloud/Cloud_normal_1.png | ✓ |
| ocean/Wind/Wind_normal_1.png | ✓ |
| ocean/Tornado/Tornado_normal_1.png | ✓ |
| ocean/Hurricane/Hurricane_normal_1.png | ✓ |
| ocean/Thermometer/Thermometer_normal_1.png | ✓ (新規利用、ディレクトリ実在) |
| ocean/Tongue/Tongue_normal_1.png | ✓ (新規利用、ディレクトリ実在) |
| ocean/Eyes/Eyes_normal_1.png | ✓ |
| ocean/Mouth_part/Mouth_part_normal_1.png | ✓ |
| ocean/Palm/Palm_normal_1.png | ✓ |
| ocean/Foot_part/Foot_part_normal_1.png | ✓ |
| ocean/Forearm/Forearm_normal_1.png | ✓ |
| ocean/Nose_part/Nose_part_normal_1.png | ✓ |
| ocean/Teeth/Teeth_normal_1.png | ✓ |
| ocean/Ear_part/Ear_part_normal_1.png | ✓ |
| ocean/Leg/Leg_normal_1.png | ✓ |

→ 提案で参照される 20 個すべて実在を Glob で個別検証。`Thermometer/` `Tongue/` の画像化提案は両方ディレクトリ実在のため OK。

## Fact verification
| claim | verified? | source/basis |
| --- | --- | --- |
| 虹は7色 (赤橙黄緑青藍紫) | ✓ | 日本の小学校理科・気象庁慣例。文化圏 (米国 6色等) 差はあるが日本では 7色が標準 |
| 雷=雲内の氷晶/あられ衝突で電荷分離 | ✓ | 現代気象学の標準説明 (起電機構諸説あるが「氷の粒の摩擦」は子供向け説明として正確) |
| 台風=北半球で反時計回り | ✓ | コリオリの力に起因する低気圧渦の物理。Lv3 から削除する判断は妥当 |
| あられ <5mm ≦ ひょう | ✓ | 気象庁の用語定義 (5mm が境界)。Lv3 から削除する判断は妥当 (6yo にサイズ感覚不適) |
| ひふ=最大の臓器 | ✓ | 体表面積 1.5-2㎡、体重比 ~9-11% |
| エナメル質=人体最硬組織 | ✓ | モース硬度 5-6。「は」へ簡素化して残す方針は妥当 |
| 心臓 1日 約10万回 | ✓ | 60-80bpm × 1440min = 86,400-115,200 回 |
| 大人 206 本 / 赤ちゃん約 300 本 | ✓ | 一般慣用値。新生児は軟骨を含めて 270-300 本程度。具体数を Lv3 で問わない判断は妥当 |
| 1日のまばたき 15,000 回 | ✓ | 起床 16h × 15-20回/min ≒ 14,400-19,200。概念問への転換は妥当 |
| ゆきの結晶=六角形 | ✓ | 水分子の H 結合に起因。語彙難で Lv3 から削除は妥当 |
| きり=空中に漂う微小な水滴 | ✓ | 気象庁定義 (視程 1km 未満) |
| 雪国=日本海側 | ✓ | 慣用呼称。冬季季節風が日本海で湿気を取り、山脈で雪に |
| まばたきの目的=涙膜形成・異物除去 | ✓ | 解剖生理学的に正しい |
| 寒さで震える=骨格筋ふるえによる熱産生 | ✓ | shivering thermogenesis |
| 空腹時のグー=胃腸の蠕動音 (borborygmus) | ✓ | 胃が空気を撹拌して発生。提案の detail 表現で正確 |
| 指紋=一卵性双生児でも異なる | ✓ | 胎児期の指先と羊水の物理的接触により個別形成 |
| 雨の起源=海/川の蒸発→雲→雨 | ✓ | 水循環。提案の Lv3 「じょうはつ」と Lv2 「あめは もとは…」が呼応するのは良設計 |
| 台風=南の暖かい海で発生 | ✓ | 海面水温 26.5℃ 以上の熱帯低気圧 |
| 冬に息が白い=呼気の水蒸気が冷えて凝結 | ✓ | 飽和水蒸気量の温度依存。提案 detail は子供にも正確 |
| かさぶた=血液凝固によるかさぶた、創部保護と治癒 | ✓ | 血小板/フィブリンが凝固塊を形成 |
| 片手の指=5本 | ✓ | 自明 |

→ 事実誤りは見当たらず。すべて検証済。

## Index integrity sample
| # | category | level | answer | choices[answer] | OK? |
| --- | --- | --- | --- | --- | --- |
| W-L1-1 | weather | 1 | 0 | はれ (Sun) | ✓ |
| W-L1-2 | weather | 1 | 2 | あめ (Rain) | ✓ |
| W-L1-3 | weather | 1 | 1 | くもり (Cloud) | ✓ |
| W-L1-4 | weather | 1 | 2 | ゆき (Snow, choices=[はれ,あめ,ゆき,くもり]) | ✓ |
| W-L1-5 | weather | 1 | 2 | にじ (Rainbow) | ✓ |
| W-L1-6 | weather | 1 | 0 | かみなり (Thunder) | ✓ |
| W-L1-7 | weather | 1 | 2 | かぜ (Wind, choices=[あめ,あらし,かぜ,ゆき]) | ✓ |
| W-L1-8 | weather | 1 | 0 | くも (trivia) | ✓ |
| W-L2-1 | weather | 2 | 0 | たつまき (Tornado) | ✓ |
| W-L2-2 | weather | 2 | 2 | たいふう (Hurricane) | ✓ |
| W-L2-3 | weather | 2 | 1 | きり | ✓ |
| W-L2-4 | weather | 2 | 1 | 7しょく | ✓ |
| W-L2-5 | weather | 2 | 0 | じめんが…すいきれない | ✓ |
| W-L2-6 | weather | 2 | 0 | くもの なかで でんき | ✓ |
| W-L2-7 | weather | 2 | 0 | うみや かわの みず | ✓ |
| W-L2-8 | weather | 2 | 0 | おんどけい (Thermometer) | ✓ |
| W-L3-1 | weather | 3 | 1 | あめの あと はれたとき | ✓ |
| W-L3-2 | weather | 3 | 1 | たかい ものが いちばん ちかいから | ✓ |
| W-L3-3 | weather | 3 | 2 | あさや よるの すずしいとき | ✓ |
| W-L3-4 | weather | 3 | 0 | ゆきぐに | ✓ |
| W-L3-5 | weather | 3 | 1 | なつ | ✓ |
| W-L3-6 | weather | 3 | 0 | じょうはつ | ✓ |
| W-L3-7 | weather | 3 | 1 | みなみの あったかい うみ | ✓ |
| W-L3-8 | weather | 3 | 0 | いきの なかの みずが ひえて つぶに なるから | ✓ |
| B-L1-1 | body | 1 | 1 | め (Eyes) | ✓ |
| B-L1-2 | body | 1 | 2 | くち (Mouth_part) | ✓ |
| B-L1-3 | body | 1 | 2 | て (Palm) | ✓ |
| B-L1-4 | body | 1 | 0 | あし (Foot_part) | ✓ |
| B-L1-5 | body | 1 | 3 | うで (Forearm) | ✓ |
| B-L1-6 | body | 1 | 0 | はな (におい) | ✓ |
| B-L1-7 | body | 1 | 1 | め (みる) | ✓ |
| B-L1-8 | body | 1 | 2 | みみ (きく) | ✓ |
| B-L2-1 | body | 2 | 0 | はな (Nose_part) | ✓ |
| B-L2-2 | body | 2 | 1 | は (Teeth) | ✓ |
| B-L2-3 | body | 2 | 1 | した (Tongue) | ✓ |
| B-L2-4 | body | 2 | 2 | みみ (Ear_part) | ✓ |
| B-L2-5 | body | 2 | 1 | ひふ | ✓ |
| B-L2-6 | body | 2 | 0 | しんぞう | ✓ |
| B-L2-7 | body | 2 | 1 | 5ほん | ✓ |
| B-L2-8 | body | 2 | 0 | は (かんで こなごな) | ✓ |
| B-L3-1 | body | 3 | 1 | あし (Leg) | ✓ |
| B-L3-2 | body | 3 | 2 | は (かたい) | ✓ |
| B-L3-3 | body | 3 | 0 | おおい (赤ちゃん) | ✓ |
| B-L3-4 | body | 3 | 0 | からだを あたためるため | ✓ |
| B-L3-5 | body | 3 | 0 | おなかの なかで くうきが うごくから | ✓ |
| B-L3-6 | body | 3 | 0 | しもん | ✓ |
| B-L3-7 | body | 3 | 0 | めを うるおして… | ✓ |
| B-L3-8 | body | 3 | 0 | きずを まもって なおすため | ✓ |

→ 48 問すべての index ↔ choices ↔ 意味整合性は OK。

## Issues found

1. **[Lv3 body かさぶた、選択肢4の `(だけ)` 注釈が幼児に混乱]**
   `'ちが でないように するため (だけ)'` という選択肢は「だけ」のニュアンスで他選択肢と差別化する意図が読めるが、3-6 歳には「だけ」の限定意味が伝わらない。さらに正解の「きずを まもって なおすため」と意味的にかなり近く (両方「血を止める」と関連)、wrong-but-plausible ではなく wrong-but-ambiguous になっている。
   提案: `'ちが でないように するため (だけ)'` → `'いろを つけるため'` または `'ちが あかいから'` 等に置換し、選択肢4種を明確に分離させる。

2. **[Lv2 weather にじ detail の色順表記]**
   `detail:'あか・だいだい・きいろ・みどり・あお・あいいろ・むらさきの 7しょくだよ！'` は正確だが、「だいだい」は子供にとっては「オレンジ」の方が耳馴染みがある可能性。原文と同じ表記なので変更必須ではないが、保護者が読み聞かせるとき「だいだい？」と詰まる懸念あり。
   提案: `'あか・だいだい(オレンジ)・きいろ・みどり・あお・あいいろ・むらさきの 7しょくだよ！'` のように補足するか、原案維持 (現状維持で OK)。

3. **[Lv1 weather 重複し過ぎる `q:'この てんきは？'`]**
   Lv1 の Sun, Rain, Cloud, Snow が全て `q:'この てんきは？'` で、Rainbow/Thunder/Wind が `q:'これは なに？'`、最終問が `q:'そらに ある しろい ふわふわは なに？'`。これは原案の踏襲だが、画像問題 4 連続同じ q だと「読み上げ機能」を使う子に飽きが生じる。今回の提案は機能的に問題なし、現状維持で OK だが将来改善案として記録。

4. **[Lv3 body Leg を Lv1 の Forearm と重複認知の懸念]**
   Lv1 で `Forearm/Forearm_normal_1.png` (うで) を出題、Lv3 で `Leg/Leg_normal_1.png` (あし) を出題。`Leg` は太もも〜つま先全体、`Forearm` は前腕。Lv1 では Foot_part もあるため、Lv3 の Leg と Lv1 の Foot_part の差分 (足全体 vs 足首から下) が幼児に弁別困難な可能性。 ただし選択肢が違う (Lv1 Foot_part: あし/て/かた/おなか、Lv3 Leg: うで/あし/おなか/せなか) ので機能的には正解確定可能。Lv3 を画像問題にするより、Lv3 は概念問に振った方が level 構造がきれいかも。
   提案: 任意。Lv3 Leg を別の概念問 (例: `さむいときに しろくなる ところは？` → `はないき` とか) に置き換える検討余地あり。ただし提案は Team A/B/D の方針との整合性次第。

5. **[`Cloud` 画像の重複削除に関する自己言及]**
   実装者は「Lv1/Lv2 で Cloud が重複していた」と note しており、提案では Lv1 のみに残し Lv2 から Cloud 画像問題を削除している。これは正しく、提案後のリストで Lv2 の Cloud は登場しないことを確認した。OK。

6. **[`Tongue` 画像化の妥当性]**
   👅 emoji は子供が自分で舌を出して見せる体験と連動しやすい。`Tongue/Tongue_normal_1.png` は実在するが、画像化することで「これって何の絵？」と一瞬迷う可能性 (絵柄が抽象的な場合)。実画像を確認していないが、ディレクトリ実在は OK。Reviewer note 5 で実装者自身が懸念表明しているとおり、検討余地あり。
   提案: 実画像のレンダリングを目視確認してから決定。デフォルトは原案 (👅 emoji) 維持でも可。

7. **[Lv3 weather 「うみや かわの みずが くうに のぼっていくのを」の語感]**
   `くう` (空) はひらがなだと「食う」と同音で、3-6 歳には「そら」の方が直接的。
   提案: `q:'うみや かわの みずが そらに のぼっていくのを なんという？'` に修正。

## Recommended deltas

- **必須**: B-L3-8 (かさぶた) の choices[3] を `'ちが でないように するため (だけ)'` から非曖昧な誤答 (例: `'いろを つけるため'`) に変更。
- **必須**: W-L3-6 (じょうはつ) の `q` で `くう` → `そら` に置換し意味の明確化。
- **推奨**: 👅 → `Tongue/Tongue_normal_1.png` 画像化は実画像レンダリング確認後に決定。実装が間に合わなければ原案 (emoji) 維持。
- **推奨**: 🌡️ → `Thermometer/Thermometer_normal_1.png` 画像化は妥当 (端末 emoji 差異リスクが現実的に高い)。採用支持。
- **任意**: Lv2 にじ detail に `だいだい(オレンジ)` 注釈を追加。
- **任意**: B-L3-1 (Leg 画像問題) を概念問に置き換える検討。

## 知見活用
過去の知見 (画像パスは `assets/images/ocean/` 配下、`word/` は flat、emoji 端末差異リスク) を踏まえ、20 個全画像を Glob で個別実在検証 + base path を `index.html` ソースで物理確認。実装者の主張を鵜呑みにせず独立検証。
