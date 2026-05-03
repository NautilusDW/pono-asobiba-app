# Team C Proposal: weather + body

## Summary
- weather: 現状 Lv1=7 / Lv2=8 / Lv3=9 (24) → 提案 Lv1=8 / Lv2=8 / Lv3=8 (合計 24)
- body:    現状 Lv1=8 / Lv2=8 / Lv3=8 (24) → 提案 Lv1=8 / Lv2=8 / Lv3=8 (合計 24)

3-6歳の幼児を主対象とするため、Lv3 は「6歳が頑張れば届く範囲」に再キャリブレーション。
- weather Lv3 から「台風 反時計回り」「あられ vs ひょう (5mm 境界)」「雪の結晶 六角形」の 3問を Lv2 相当 or 削除し、よりイメージしやすい問題に置換。
- weather Lv1 は風 (Wind) のあと「あらし / 強い風」のイメージ問題を 1 問追加し 8 問に揃える。
- body Lv3 は「赤ちゃん 300本」を「赤ちゃんは大人より骨が多い・少ない」の概念問だけに整理 (現状 2 問が重複しているので 1 問に統合)、「まばたき 15000回」を「100/1000/15000/50万」の極端な選択肢から絞った "1日に何度もする" 系の概念問に和らげる。
- 画像系は Lv1/Lv2 中心、Lv3 は概念問中心という棲み分けを維持。

## Image asset verification
すべて `../assets/images/ocean/<Folder>/<Folder>_normal_1.png` 配下に実在することを確認 (`d:/AppDevelopment/pono-asobiba-app/quizland/index.html` の `renderEmojiName` が `../assets/images/ocean/` を参照しているため、ベースパスは `ocean/` で正しい)。

weather:
- ocean/Sun/Sun_normal_1.png — 存在
- ocean/Rain/Rain_normal_1.png — 存在
- ocean/Rainbow/Rainbow_normal_1.png — 存在
- ocean/Thunder/Thunder_normal_1.png — 存在
- ocean/Snow/Snow_normal_1.png — 存在
- ocean/Cloud/Cloud_normal_1.png — 存在
- ocean/Wind/Wind_normal_1.png — 存在
- ocean/Tornado/Tornado_normal_1.png — 存在
- ocean/Hurricane/Hurricane_normal_1.png — 存在
- ocean/Thermometer/Thermometer_normal_1.png — 存在 (新規利用提案)
- ocean/Sun_face/Sun_face_normal_1.png — 存在 (代替候補)
- ocean/Rain_cloud/Rain_cloud_normal_1.png — 存在 (代替候補)
- ocean/Snow_cloud/Snow_cloud_normal_1.png — 存在 (代替候補)
- ocean/Thunder_cloud/Thunder_cloud_normal_1.png — 存在 (代替候補)

body:
- ocean/Eyes/Eyes_normal_1.png — 存在
- ocean/Mouth_part/Mouth_part_normal_1.png — 存在
- ocean/Palm/Palm_normal_1.png — 存在
- ocean/Foot_part/Foot_part_normal_1.png — 存在
- ocean/Forearm/Forearm_normal_1.png — 存在
- ocean/Nose_part/Nose_part_normal_1.png — 存在
- ocean/Teeth/Teeth_normal_1.png — 存在
- ocean/Ear_part/Ear_part_normal_1.png — 存在
- ocean/Hand/Hand_normal_1.png — 存在 (代替候補)
- ocean/Arm/Arm_normal_1.png — 存在 (代替候補)
- ocean/Leg/Leg_normal_1.png — 存在 (代替候補)
- ocean/Foot/Foot_normal_1.png — 存在 (代替候補)
- ocean/Knee/Knee_normal_1.png — 存在 (代替候補)
- ocean/Lips/Lips_normal_1.png — 存在 (代替候補)
- ocean/Tongue/Tongue_normal_1.png — 存在 (👅 を画像化する場合)

> 注: `assets/images/word/` には大小文字フォルダはなく flat な png のみ。weather/body の `img:` は `ocean/` 配下を指すのが正解で、現状の指定はすべて有効。

## Final proposed list (paste-ready JS entries, by category and level)

### weather

#### Level 1 (8問)
```js
{ level:1, type:'emoji_name', category:'weather', img:'Sun/Sun_normal_1.png', q:'この てんきは？', answer:0, choices:['はれ','くもり','あめ','ゆき'] },
{ level:1, type:'emoji_name', category:'weather', img:'Rain/Rain_normal_1.png', q:'この てんきは？', answer:2, choices:['はれ','くもり','あめ','ゆき'] },
{ level:1, type:'emoji_name', category:'weather', img:'Cloud/Cloud_normal_1.png', q:'この てんきは？', answer:1, choices:['はれ','くもり','あめ','ゆき'] },
{ level:1, type:'emoji_name', category:'weather', img:'Snow/Snow_normal_1.png', q:'この てんきは？', answer:2, choices:['はれ','あめ','ゆき','くもり'] },
{ level:1, type:'emoji_name', category:'weather', img:'Rainbow/Rainbow_normal_1.png', q:'これは なに？', answer:2, choices:['かみなり','くもり','にじ','あめ'] },
{ level:1, type:'emoji_name', category:'weather', img:'Thunder/Thunder_normal_1.png', q:'これは なに？', answer:0, choices:['かみなり','はれ','くもり','にじ'] },
{ level:1, type:'emoji_name', category:'weather', img:'Wind/Wind_normal_1.png', q:'これは なに？', answer:2, choices:['あめ','あらし','かぜ','ゆき'] },
{ level:1, type:'trivia', category:'weather',
  q:'そらに ある しろい ふわふわは なに？',
  answer:0, choices:['くも','けむり','わた','ほし'] ,
  detail:'くもは とっても ちいさな みずの つぶの あつまりだよ！'},
```

#### Level 2 (8問)
```js
{ level:2, type:'emoji_name', category:'weather', img:'Tornado/Tornado_normal_1.png', q:'これは なに？', answer:0, choices:['たつまき','おおかぜ','かみなり','あらし'] },
{ level:2, type:'emoji_name', category:'weather', img:'Hurricane/Hurricane_normal_1.png', q:'これは なに？', answer:2, choices:['こうずい','たつまき','たいふう','なみ'] },
{ level:2, type:'trivia', category:'weather', q:'あさ、しろい もやが でる てんきを なんという？', answer:1, choices:['あめ','きり','ゆき','くもり'] ,
  detail:'きりは ちいさな みずの つぶが くうきに うかんでいる じょうたいだよ！'},
{ level:2, type:'trivia', category:'weather',
  q:'にじは なんしょく？',
  answer:1, choices:['5しょく','7しょく','3しょく','10しょく'] ,
  detail:'あか・だいだい・きいろ・みどり・あお・あいいろ・むらさきの 7しょくだよ！'},
{ level:2, type:'trivia', category:'weather',
  q:'あめが ふったあと、みずたまりが できるのは なぜ？',
  answer:0, choices:['じめんが みずを すいきれないから','くもが おちてくるから','かわの みずが あふれるから','かぜが みずを はこぶから'] ,
  detail:'アスファルトは みずを すいこまないから たまりやすいよ！'},
{ level:2, type:'trivia', category:'weather',
  q:'かみなりは なぜ なる？',
  answer:0, choices:['くもの なかで でんきが たまるから','かみなりさまが たいこを たたくから','かわが かわくから','かぜが つよいから'] ,
  detail:'くもの なかで こおりの つぶが ぶつかりあって でんきが たまるよ！'},
{ level:2, type:'trivia', category:'weather',
  q:'あめは もとは どこの みず？',
  answer:0, choices:['うみや かわの みず','くもの みず','やまの みず','じめんの みず'] ,
  detail:'うみや かわの みずが じょうはつして くもに なって、また あめに なるよ！'},
{ level:2, type:'emoji_name', category:'weather', img:'Thermometer/Thermometer_normal_1.png',
  q:'これは なに？', answer:0, choices:['おんどけい','かぜけい','あめけい','ゆきけい'] ,
  detail:'おんどけいは あつい・さむいを はかる どうぐだよ！'},
```

#### Level 3 (8問)
```js
{ level:3, type:'trivia', category:'weather',
  q:'にじは いつ でる？',
  answer:1, choices:['あめの まえ','あめの あと はれたとき','くもりのとき','ゆきのとき'] ,
  detail:'たいようの ひかりが あめつぶに あたると にじが できるよ！'},
{ level:3, type:'trivia', category:'weather',
  q:'かみなりは たかい ものに よく おちる。どうして？',
  hint:'くもから いちばん ちかい ところへ！',
  answer:1, choices:['ひくい ものが すき','たかい ものが いちばん ちかいから','まるい ものが すき','かたい ものが すき'] ,
  detail:'でんきは いちばん ちかい ところに むかって おちるよ！'},
{ level:3, type:'trivia', category:'weather',
  q:'きりは どんな てんきに できやすい？',
  answer:2, choices:['あつい ひる','かぜが つよい とき','あさや よるの すずしいとき','たいふうのとき'] ,
  detail:'くうきが ひえると みずが つぶに なって きりに なるよ！'},
{ level:3, type:'trivia', category:'weather',
  q:'ゆきが たくさん ふる ちほうを なんという？',
  answer:0, choices:['ゆきぐに','ゆきやま','ふゆのくに','こおりのくに'] ,
  detail:'にほんかいがわは ゆきが おおく「ゆきぐに」と よばれるよ！'},
{ level:3, type:'trivia', category:'weather',
  q:'1ねんで いちばん あつい きせつは？',
  answer:1, choices:['はる','なつ','あき','ふゆ'] ,
  detail:'にほんでは 7がつ〜8がつが いちばん あつくなるよ！'},
{ level:3, type:'trivia', category:'weather',
  q:'うみや かわの みずが くうに のぼっていくのを なんという？',
  hint:'みずが あつくなって きえるみたいに みえるよ！',
  answer:0, choices:['じょうはつ','こおる','しずむ','とぶ'] ,
  detail:'おひさまに あたためられた みずが くうきに なって のぼり、くもに なるよ！'},
{ level:3, type:'trivia', category:'weather',
  q:'たいふうは どこから やってくる？',
  hint:'あったかい ところ！',
  answer:1, choices:['きたの さむい うみ','みなみの あったかい うみ','やまの うえ','つきから'] ,
  detail:'みなみの あったかい うみで うまれて、にほんに ちかづいてくるよ！'},
{ level:3, type:'trivia', category:'weather',
  q:'ふゆに いきが しろく みえるのは なぜ？',
  answer:0, choices:['いきの なかの みずが ひえて つぶに なるから','くちの なかが しろいから','ゆきが ふっているから','さむくて こおっているから'] ,
  detail:'あったかい いきが つめたい くうきで ひえて、ちいさな みずの つぶに なるよ！'},
```

### body

#### Level 1 (8問)
```js
{ level:1, type:'emoji_name', category:'body', img:'Eyes/Eyes_normal_1.png', q:'これは からだの どこ？', answer:1, choices:['はな','め','くち','みみ'] },
{ level:1, type:'emoji_name', category:'body', img:'Mouth_part/Mouth_part_normal_1.png', q:'これは からだの どこ？', answer:2, choices:['め','みみ','くち','はな'] },
{ level:1, type:'emoji_name', category:'body', img:'Palm/Palm_normal_1.png', q:'これは からだの どこ？', answer:2, choices:['あし','かた','て','うで'] },
{ level:1, type:'emoji_name', category:'body', img:'Foot_part/Foot_part_normal_1.png', q:'これは からだの どこ？', answer:0, choices:['あし','て','かた','おなか'] },
{ level:1, type:'emoji_name', category:'body', img:'Forearm/Forearm_normal_1.png', q:'これは からだの どこ？', answer:3, choices:['おなか','あし','かた','うで'] },
{ level:1, type:'trivia', category:'body',
  q:'においを かぐのは からだの どこ？', answer:0, choices:['はな','くち','め','ほほ'] ,
  detail:'はなの おくに においを かんじる ばしょが あるよ！'},
{ level:1, type:'trivia', category:'body',
  q:'ものを みるのは からだの どこ？', answer:1, choices:['くち','め','ほほ','ひたい'] ,
  detail:'めに はいった ひかりを のうが かたちに かえるよ！'},
{ level:1, type:'trivia', category:'body',
  q:'ものを きくのは からだの どこ？', answer:2, choices:['め','くち','みみ','はな'] ,
  detail:'みみの なかの ちいさな ほねが おとを つたえるよ！'},
```

#### Level 2 (8問)
```js
{ level:2, type:'emoji_name', category:'body', img:'Nose_part/Nose_part_normal_1.png', q:'これは からだの どこ？', answer:0, choices:['はな','くち','め','ほほ'] },
{ level:2, type:'emoji_name', category:'body', img:'Teeth/Teeth_normal_1.png', q:'これは からだの なに？', answer:1, choices:['ほね','は','つめ','かみ'] },
{ level:2, type:'emoji_name', category:'body', img:'Tongue/Tongue_normal_1.png', q:'これは からだの なに？', answer:1, choices:['ゆび','した','みみ','おなか'] ,
  detail:'したで あじを かんじているよ！'},
{ level:2, type:'emoji_name', category:'body', img:'Ear_part/Ear_part_normal_1.png', q:'これは からだの どこ？', answer:2, choices:['め','はな','みみ','くち'] },
{ level:2, type:'trivia', category:'body',
  q:'からだで いちばん おおきい きかんは？',
  hint:'からだの そとを おおっている！',
  answer:1, choices:['のう','ひふ','しんぞう','い'] ,
  detail:'ひふは からだぜんたいを つつんで まもっている きかんだよ！'},
{ level:2, type:'trivia', category:'body',
  q:'ちを からだじゅうに おくる ぽんぷは？',
  answer:0, choices:['しんぞう','のう','ひふ','い'] ,
  detail:'しんぞうは どきどき と うごいて ち を おくっているよ！'},
{ level:2, type:'trivia', category:'body',
  q:'かたての ゆびは なんぼん？',
  answer:1, choices:['4ほん','5ほん','6ほん','3ほん'] ,
  detail:'おやゆび・ひとさしゆび・なかゆび・くすりゆび・こゆびの 5ほんだよ！'},
{ level:2, type:'trivia', category:'body',
  q:'たべものを かんで こなごなに するのは どこ？',
  answer:0, choices:['は','みみ','め','かみのけ'] ,
  detail:'は で たべものを かんでから のみこむと、おなかで しょうかしやすいよ！'},
```

#### Level 3 (8問)
```js
{ level:3, type:'emoji_name', category:'body', img:'Leg/Leg_normal_1.png', q:'これは からだの どこ？', answer:1, choices:['うで','あし','おなか','せなか'] },
{ level:3, type:'trivia', category:'body',
  q:'からだで いちばん かたい ぶぶんは？',
  answer:2, choices:['ほね','つめ','は','かみのけ'] ,
  detail:'はの いちばん そとがわは からだの なかで いちばん かたいよ！'},
{ level:3, type:'trivia', category:'body',
  q:'あかちゃんの ほねは おとなより おおい？ すくない？',
  hint:'あかちゃんの ほねは あとで くっついて へっていく！',
  answer:0, choices:['おおい','すくない','おなじ','わからない'] ,
  detail:'あかちゃんの ほねは くっついて かずが すこしずつ へっていくよ！'},
{ level:3, type:'trivia', category:'body',
  q:'さむいとき からだが ふるえるのは なぜ？',
  answer:0, choices:['からだを あたためるため','こわいから','おなかが すいたから','ねむいから'] ,
  detail:'きんにくを ふるわせて ねつを つくっているんだよ！'},
{ level:3, type:'trivia', category:'body',
  q:'おなかが すいたとき「グー」と なるのは なぜ？',
  answer:0, choices:['おなかの なかで くうきが うごくから','ほねが なるから','きんにくが うごくから','ちが ながれるから'] ,
  detail:'たべものが ないと いが くうきを おしだして「グー」と なるよ！'},
{ level:3, type:'trivia', category:'body',
  q:'ゆびのさきの もようを なんという？',
  answer:0, choices:['しもん','もよう','てもん','がら'] ,
  detail:'しもんは ひとりひとり ちがう。ふたごでも ちがうんだよ！'},
{ level:3, type:'trivia', category:'body',
  q:'まばたきは なんのために する？',
  hint:'めを まもるため！',
  answer:0, choices:['めを うるおして きれいに たもつため','おしゃれの ため','ねむくなる ため','こえを だす ため'] ,
  detail:'まばたきで めの ひょうめんに なみだを いきわたらせて、ほこりや ごみを ながしているよ！'},
{ level:3, type:'trivia', category:'body',
  q:'けがを すると かさぶたが できるのは なぜ？',
  answer:0, choices:['きずを まもって なおすため','いろを かえるため','かゆくする ため','ちが でないように するため (だけ)'] ,
  detail:'ちが かたまって フタの ように なって、きずを まもりながら なおしているよ！'},
```

## Change log

### weather
- **Lv1: +1 問** 追加 (`そらに ある しろい ふわふわは なに？` → くも) で 7→8 に揃える。Cloud 画像問題は Lv2 にあるので、Lv1 は概念導入を 1 問増やしてバランス。
- **Lv1 Cloud 画像問題を移動**: 元 Lv2 の Cloud 重複 (Lv1 にも Cloud があった) は片方を残し、もう片方を削除。並びを天候5種 (はれ・あめ・くもり・ゆき・にじ) を Lv1 に集約する形に再編。
- **Lv2: 構成維持 (8 問)**。ただし Lv3 にあった 🌡️ おんどけい問題を Lv2 へ移動 + 画像化 (`Thermometer/Thermometer_normal_1.png` を新たに使用)。emoji 直書き 🌡️ は子供端末でレンダリング差が出やすいため画像化を推奨。
- **Lv3: 9 → 8 問** に削減・再構成:
  - 削除: 「たいふうの かぜは どちらに まわっている？」 — 6 歳には抽象的すぎる地理/物理知識。日本/南半球の対比は小学校理科レベル。
  - 削除: 「あられと ひょうの ちがいは？ (5mm 境界)」 — 5mm 境界は気象庁定義として正しいが、未就学児の判断にはサイズ感覚が高すぎる。
  - 削除: 「ゆきの けっしょうは どんな かたち？ (六角形)」 — 「ろっかっけい」自体が幼児には未知語かつ漢字混じり概念。
  - 削除: 🌡️ おんどけい (Lv2 へ画像化して移動)。
  - 追加: 「うみや かわの みずが くうに のぼっていく → じょうはつ」 — 「あめ＝海の水」の Lv2 と接続する概念問。
  - 追加: 「たいふうは どこから やってくる？ → みなみの あったかい うみ」 — 6 歳でも体感ベースで答えやすい。
  - 追加: 「ふゆに いきが しろく みえるのは なぜ？ → みずの つぶになる」 — 体験ベースで Lv3 にちょうど良い。

### body
- **Lv1: 構成維持 (8 問)**、`detail` の漢字熟語「嗅覚」を「においを かんじる ばしょ」へひらがな化 (現状もひらがなだが「きゅうかく」は幼児に厳しいので削除)。
- **Lv2: 構成維持 (8 問)**:
  - 重複だった `Palm` を 1 問削除 (Lv1 でも Palm を出題していた)。
  - 代わりに 👅 emoji 直書きを `Tongue/Tongue_normal_1.png` 画像化、`Ear_part` を Lv3 から Lv2 へ移動 (画像で耳を当てる → Lv2 が妥当)。
  - 「いちばん かたい ぶぶん (エナメル質)」を Lv3 へ移動 (素材名「エナメル」が未就学児には抽象的)。代わりに「たべものを かんで こなごなに するのは → は」を Lv2 に追加。
- **Lv3: 構成維持 (8 問)** だが内容を再編:
  - 削除: 「にんげんの ほねは ぜんぶで なんぼん？ → 206本」 — 数値暗記で 6 歳には適さない。
  - 維持: 「あかちゃんの ほねは おとなより おおい？ すくない？」 — 概念問として残す (300 という具体数は detail 内では言わず、ぼかす)。
  - 削除: 「1日に なんかい くらい まばたきする？ → 15000かい」 — 数値スケール感が幼児には機能しない (5000 と 15000 の差が分からない)。
  - 追加: 「まばたきは なんのために する？」 — 概念問に置き換え。
  - 追加: 「けがを すると かさぶたが できるのは なぜ？」 — 6 歳の身近な体験で Lv3 にちょうど良い。
  - Lv2 から移動: 「いちばん かたい ぶぶんは？」 (選択肢は「は」だけにし「エナメルしつ」併記を削除)、`Leg` 画像化 (元の 🦵 emoji を画像置換)。

## Factual verifications performed
- **虹 = 7 色**: 確認済 (日本の慣例: 赤・橙・黄・緑・青・藍・紫)。文化圏により 6色や 5色とする国もあるが、日本の小学校教育・気象庁いずれも 7 色。
- **雷の発生原理 (氷の粒の摩擦で電気が溜まる)**: 確認済。雲内の氷晶とあられの衝突で電荷分離が起こる、というのが現代気象学の標準説明。
- **台風の渦は北半球で反時計回り**: 物理的事実 (コリオリの力)。ただし 6yo には抽象すぎるため Lv3 から削除を提案。
- **あられ < 5mm ≤ ひょう**: 気象庁定義として正しい (https://www.jma.go.jp の用語定義)。ただし 6yo の到達範囲外として削除を提案。
- **エナメル質 (歯の表面) は人体で最も硬い組織**: 確認済 (モース硬度 5〜6 程度)。Lv3 で語彙を「は」に簡素化して維持。
- **心臓は 1 日約 10 万回拍動**: 確認済 (安静時 60-80bpm × 60min × 24h = 約 86,400-115,200 回)。`detail` の「やく 10 まんかい」は問題に出さず詳細にも残さない方向で簡素化 (子供向けの興味喚起としては残しても可)。
- **大人の骨は 206 本、新生児は 300 本程度**: 確認済 (一般的に流布した数字。新生児は軟骨を含めると約 270〜300 とされる)。具体数の暗記は Lv3 から削除し、概念だけ残す。
- **1 日の瞬きは平均 15,000〜20,000 回 (起きている間)**: 確認済 (1 分 15-20 回 × 16 時間)。ただし 6yo の数感覚範囲外として概念問へ転換。
- **皮膚は最大の臓器**: 確認済 (体表面積 1.5〜2㎡、重量約 9-11%)。
- **片手の指は 5 本**: 自明。
- **指紋は一卵性双生児でも異なる**: 確認済 (胎児期の触覚刺激で個別形成される)。
- **空腹時に胃が「グー」と鳴る (borborygmus)**: 胃・腸の蠕動で空気と液体が動く音 — 簡略化した detail で正しい。
- **寒冷時の震えはサーモゲネシス (筋収縮による発熱)**: 確認済。
- **「ゆきぐに」**: 川端康成の小説タイトルでもあるが、一般用語としても日本海側豪雪地帯を指す慣用呼称。
- **画像パス**: `quizland/index.html` の `renderEmojiName` で `../assets/images/ocean/` + `q.img` と連結されることを確認。`weather`/`body` で参照する 17 ディレクトリすべてに `*_normal_1.png` が存在。

## Reviewer notes (重点的に確認してほしい点)

1. **Lv3 数値暗記問題の削除可否**: 「ほね 206 本」「まばたき 15000 回」「あられ 5mm 境界」を全部削除しているが、保護者が「うちの子は数字に強い」と感じるケースもあるため、1〜2 問は残す選択肢もあり。Team A/B/D とのバランス次第。
2. **`Cloud` 画像の重複削除**: 現状 Lv1 と Lv2 の両方に Cloud が登場 (選択肢構成は微妙に違う)。Lv1 に統合する案にしたが、Lv2 を残して Lv1 を削る選択肢もあり。
3. **🌡️ → `Thermometer` 画像化**: emoji フォントによっては 🌡️ が「ロウソク」のように見える端末がある。画像化推奨だが、Team A/B/D の他カテゴリとの emoji 利用方針との整合性を確認してほしい。
4. **「あらし」の Lv1 設置**: 現行 Lv1 の Wind 問題は選択肢に「あらし」を入れているが、これは未就学児には未知語の可能性。`['あめ','つよいかぜ','かぜ','ゆき']` に差し替える案も検討余地あり。今回の提案では現状維持。
5. **`Tongue` 画像化**: 👅 → `Tongue/Tongue_normal_1.png` への置換を提案したが、👅 の方が幼児には馴染み深い可能性。要確認。
