# Team B Proposal: shape_name + opposite

## Summary
- shape_name: 現状 Lv1=5 / Lv2=8 (うち1件は line 111 で Lv1 ブロックに混入) / Lv3=6 (合計 19) → 提案 Lv1=8 / Lv2=8 / Lv3=8 (合計 24)
- opposite: 現状 Lv1=8 / Lv2=8 / Lv3=8 (合計 24) → 提案 Lv1=8 / Lv2=8 / Lv3=8 (合計 24, 内容変更なし／インデックス検証のみ)

全ての `answer` インデックスを検証した結果、現行 43 問すべて整合しており、誤りは見つからなかった。

## Final proposed list (paste-ready JS entries, by category and level)

### shape_name

#### Level 1 (8 問, 純粋なかたちの名前あて — 3歳児が答えられるレベル)
```js
{ level:1, type:'shape_name', shape:'circle',    q:'これは どんな かたち？', answer:0, choices:['まる','しかく','さんかく','ほし'] },
{ level:1, type:'shape_name', shape:'square',    q:'これは どんな かたち？', answer:1, choices:['まる','しかく','さんかく','ほし'] },
{ level:1, type:'shape_name', shape:'triangle',  q:'これは どんな かたち？', answer:2, choices:['まる','しかく','さんかく','ほし'] },
{ level:1, type:'shape_name', shape:'heart',     q:'これは どんな かたち？', answer:0, choices:['ハート','まる','しかく','さんかく'] },
{ level:1, type:'shape_name', shape:'star',      q:'これは どんな かたち？', answer:2, choices:['まる','しかく','ほし','さんかく'] },
{ level:1, type:'shape_name', shape:'rectangle', q:'これは どんな かたち？', answer:0, choices:['ながしかく','まる','さんかく','ほし'] },
{ level:1, type:'shape_name', shape:'oval',      q:'これは どんな かたち？', answer:0, choices:['たまごがた','まる','しかく','ハート'] },
{ level:1, type:'shape_name', shape:'diamond',   q:'これは どんな かたち？', answer:0, choices:['ひしがた','まる','ほし','ハート'] },
```

#### Level 2 (8 問, 名前あて+性質)
```js
{ level:2, type:'shape_name', shape:'rectangle', q:'これは どんな かたち？', answer:1, choices:['しかく','ちょうほうけい','まる','さんかく'] },
{ level:2, type:'shape_name', shape:'star',      q:'これは どんな かたち？', answer:3, choices:['まる','しかく','さんかく','ほし'] },
{ level:2, type:'shape_name', shape:'heart',     q:'これは なんの かたち？', answer:1, choices:['ほし','ハート','さんかく','まる'] },
{ level:2, type:'shape_name', shape:'diamond',   q:'これは どんな かたち？', answer:0, choices:['ひしがた','まる','しかく','さんかく'] },
{ level:2, type:'shape_name', shape:'oval',      q:'これは どんな かたち？', answer:3, choices:['まる','しかく','さんかく','たまごがた'] },
{ level:2, type:'shape_name', shape:'triangle',  q:'このかたちの かどは なんこ？', answer:1, choices:['2こ','3こ','4こ','5こ'] },
{ level:2, type:'shape_name', shape:'square',    q:'このかたちの かどは なんこ？', answer:2, choices:['3こ','5こ','4こ','2こ'] },
{ level:2, type:'shape_name', shape:'rectangle', q:'このかたちの なまえは？', answer:0, choices:['ちょうほうけい','ひしがた','たまごがた','まる'] },
```

#### Level 3 (8 問, 知識・性質問題 — 6歳が頑張れば届く範囲)
```js
{ level:3, type:'shape_name', shape:'circle',    q:'このかたちに かどは いくつ？', answer:1, choices:['2こ','0こ（ない）','4こ','1こ'] },
{ level:3, type:'shape_name', shape:'star',      q:'ほしの かどは なんこ？', answer:0, choices:['5こ','4こ','6こ','3こ'] },
{ level:3, type:'shape_name', shape:'triangle',  q:'このかたちは なん「かっけい」？', answer:1, choices:['しかっけい','さんかっけい','ごかっけい','ろっかっけい'] },
{ level:3, type:'shape_name', shape:'square',    q:'このかたちの かどは ぜんぶで いくつ？', answer:2, choices:['3こ','5こ','4こ','6こ'] },
{ level:3, type:'shape_name', shape:'rectangle',  q:'ちょうほうけいと しかくの ちがいは？', answer:0, choices:['たてと よこの ながさが ちがう','かどの かずが ちがう','まるい','いろが ちがう'] },
{ level:3, type:'shape_name', shape:'oval',      q:'たまごがたに かどは いくつ？', answer:0, choices:['0こ（ない）','2こ','3こ','4こ'] },
{ level:3, type:'shape_name', shape:'rectangle', q:'ちょうほうけいの かどは ぜんぶで いくつ？', answer:2, choices:['2こ','3こ','4こ','5こ'] },
{ level:3, type:'shape_name', shape:'diamond',   q:'ひしがたの かどは ぜんぶで いくつ？', answer:1, choices:['3こ','4こ','5こ','6こ'] },
```

### opposite

#### Level 1 (8 問, 変更なし)
```js
{ level:1, type:'opposite', category:'opposite', word:'おおきい', q:'「おおきい」の はんたいは？', answer:2, choices:['あかい','まるい','ちいさい','やさしい'] },
{ level:1, type:'opposite', category:'opposite', word:'あつい',   q:'「あつい」の はんたいは？',   answer:1, choices:['やわらかい','つめたい','はやい','くらい'] },
{ level:1, type:'opposite', category:'opposite', word:'まえ',     q:'「まえ」の はんたいは？',     answer:3, choices:['みぎ','ひだり','うえ','うしろ'] },
{ level:1, type:'opposite', category:'opposite', word:'たつ',     q:'「たつ」の はんたいは？',     answer:1, choices:['あるく','すわる','ねる','とぶ'] },
{ level:1, type:'opposite', category:'opposite', word:'あける',   q:'「あける」の はんたいは？',   answer:2, choices:['おす','ひく','しめる','まわす'] },
{ level:1, type:'opposite', category:'opposite', word:'すき',     q:'「すき」の はんたいは？',     answer:0, choices:['きらい','いい','わるい','おもしろい'] },
{ level:1, type:'opposite', category:'opposite', word:'よる',     q:'「よる」の はんたいは？',     answer:1, choices:['ゆうがた','あさ','ひる','まよなか'] },
{ level:1, type:'opposite', category:'opposite', word:'たくさん', q:'「たくさん」の はんたいは？', answer:3, choices:['おおきい','おおい','はやい','すこし'] },
```

#### Level 2 (8 問, 変更なし)
```js
{ level:2, type:'opposite', category:'opposite', word:'はやい',     q:'「はやい」の はんたいは？',     answer:0, choices:['おそい','かるい','やさしい','あかるい'] },
{ level:2, type:'opposite', category:'opposite', word:'たかい',     q:'「たかい」の はんたいは？',     answer:3, choices:['おもい','かたい','くらい','ひくい'] },
{ level:2, type:'opposite', category:'opposite', word:'ながい',     q:'「ながい」の はんたいは？',     answer:1, choices:['かわいい','みじかい','やわらかい','かるい'] },
{ level:2, type:'opposite', category:'opposite', word:'ふとい',     q:'「ふとい」の はんたいは？',     answer:2, choices:['おもい','ちいさい','ほそい','みじかい'] },
{ level:2, type:'opposite', category:'opposite', word:'かたい',     q:'「かたい」の はんたいは？',     answer:1, choices:['かるい','やわらかい','やさしい','やすい'] },
{ level:2, type:'opposite', category:'opposite', word:'つよい',     q:'「つよい」の はんたいは？',     answer:0, choices:['よわい','おもい','ちいさい','おそい'] },
{ level:2, type:'opposite', category:'opposite', word:'あたらしい', q:'「あたらしい」の はんたいは？', answer:2, choices:['やすい','おもい','ふるい','かるい'] },
{ level:2, type:'opposite', category:'opposite', word:'おおい',     q:'「おおい」の はんたいは？',     answer:1, choices:['おおきい','すくない','ちいさい','よわい'] },
```

#### Level 3 (8 問, 変更なし)
```js
{ level:3, type:'opposite', category:'opposite', word:'かるい',   q:'「かるい」の はんたいは？',   answer:2, choices:['やさしい','ふるい','おもい','ちいさい'] },
{ level:3, type:'opposite', category:'opposite', word:'あかるい', q:'「あかるい」の はんたいは？', answer:0, choices:['くらい','やさしい','きつい','ちいさい'] },
{ level:3, type:'opposite', category:'opposite', word:'うえ',     q:'「うえ」の はんたいは？',     answer:3, choices:['みぎ','まえ','ひだり','した'] },
{ level:3, type:'opposite', category:'opposite', word:'なく',     q:'「なく」の はんたいは？',     answer:2, choices:['えがく','おこる','わらう','ねる'] },
{ level:3, type:'opposite', category:'opposite', word:'たすける', q:'「たすける」の はんたいは？', answer:0, choices:['じゃまをする','たたかう','あそぶ','やすむ'] },
{ level:3, type:'opposite', category:'opposite', word:'でかける', q:'「でかける」の はんたいは？', answer:3, choices:['あそぶ','たべる','ねる','かえる'] },
{ level:3, type:'opposite', category:'opposite', word:'ほめる',   q:'「ほめる」の はんたいは？',   answer:0, choices:['しかる','おこる','いう','にらむ'] },
{ level:3, type:'opposite', category:'opposite', word:'おしえる', q:'「おしえる」の はんたいは？', answer:2, choices:['はなす','きく','ならう','よむ'] },
```

## Change log

### shape_name
- **line 111 (rectangle Lv2 entry が Lv1 ブロックに混入)**: そのままの内容で Lv2 ブロック先頭へ移動。これにより Lv1=5→5、Lv2=7→8 となる。
- **Lv1: +3 問追加** (合計 5→8):
  - `rectangle` 「ながしかく」: 3歳児にも親しみのある呼称。窓・ドアなど身近な形。`ちょうほうけい` は Lv2 で別形式の問題として既出のため、Lv1 では平易語を採用。
  - `oval` 「たまごがた」: 卵で連想しやすく、3歳児でも認識しやすい。
  - `diamond` 「ひしがた」: 単語自体は新規だが、4 択中ダミーが まる/ほし/ハート と明確に異なるため、絵を見れば消去法で正解可能。Lv1 に置くことで「初見の名前を絵から推測する」訓練になる。
- **Lv3 #5「ひしがたは どんな かたちの なかま？」を削除**: 「形の カテゴリー (なかま)」概念は 6歳児には抽象的すぎる。代わりに角の数を数える具体問題 (下記) に置き換え。
- **Lv3 #6「ちょうほうけいと しかくの ちがいは？」を維持**: 答え「たてと よこの ながさが ちがう」は視覚的に確認できる具体的差異であり、6歳児が観察すれば届く範囲。問題文・選択肢ともそのまま。
- **Lv3: +3 問追加** (削除1件込みで 6→8):
  - `oval` 「たまごがたに かどは いくつ？」 (answer 0こ): 既出の circle 角ゼロ問題と並び、丸系図形に角がない概念を強化。
  - `rectangle` 「ちょうほうけいの かどは ぜんぶで いくつ？」 (answer 4こ): 既出 square 角数問題と対になる具体問題。
  - `diamond` 「ひしがたの かどは ぜんぶで いくつ？」 (answer 4こ): 削除した抽象「なかま」問題の代替。「ひしがたも 4 つ角がある」という事実を通して しかく系の仲間であることを暗黙に伝える設計。

### opposite
- 全 24 問を全て維持。`answer` インデックスは全件検証済み・問題なし。
- **Lv3 #5「たすける」⇄「じゃまをする」を維持**: 「こまらせる」より意味の対比が明確で、幼児教材で慣用的な対義語ペア。負のニュアンスはあるが、「じゃま」は園児が日常で使う語彙。
- **Lv3 #6 (実体は #8)「おしえる」⇄「ならう」を維持**: 教える↔習う は古典的な正しい対義ペア。「ピアノを ならう」など 5-6 歳児が日常で耳にする語。

## Reviewer notes

1. **Lv1 で `ひしがた` を 3歳語彙として扱うことの妥当性**: 名称自体は難しいが、選択肢の他 3 つ (まる/ほし/ハート) と全く違う角ばった形なので、絵から消去法で正解は可能。それでも 3歳には早いと判断する場合、`diamond` を Lv1 から外し、代わりに `heart` を別の question 文 (例: 「これは なんの かたち？」) で再追加する案がある。
2. **Lv3 角数シリーズの粒度**: `oval/rectangle/diamond` の角数問題が増えたことで Lv3 が「角の数を数える」問題に偏る (8 問中 5 問)。バランス上、別軸の問題 (例: 「いちばん かどが おおい かたちは どれ？」) を 1 問足すか検討してほしい。
3. **`shape:` レンダリング対応の確認**: 新規追加した Lv1 の `rectangle/oval/diamond` は既に Lv2/Lv3 で `shape:` 値として使われており、CSS レンダリングは既存実装で対応済みのはず。要動作確認。
4. **opposite Lv3 全体トーン**: 「じゃまをする / しかる / おこる / にらむ」など否定的語彙が複数ある。3-6歳向けとして問題はないが、ポジティブな対義語へ差し替えたい場合 (例: たすける⇄こまらせる) は別途指示してほしい。
5. **Lv1 `rectangle` 「ながしかく」と Lv2 `rectangle` 「ちょうほうけい」の二段階呼称**: 同一形状を Lv1 では平易語、Lv2 では正式名で問う設計になった。これは段階学習として意図的だが、一貫性に違和感があれば Lv1 の rectangle を別形状に差し替える代案も用意可能。
