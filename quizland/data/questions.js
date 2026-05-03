// ─── Quizland 問題データ ──────────────────────────────
// type:
//   order_color : 色チップ並び → 何色？
//   count_total : 絵が N 個 → いくつ？
//   shape_name  : 形 → なんの形？
//   emoji_name  : 大きい emoji → 質問に答える（名前限らず特徴も可）
//   opposite    : 単語 → 反対語は？
//   trivia      : 💡 アイコン表示 → 知識問題
// level: 1(やさしい) 2(ふつう) 3(むずかしい)

const QUIZLAND_QUESTIONS = {

  // ── 色の順番 ─────────────────────────────────────
  order_color: [
    // Level 1 (3色)
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

    // Level 2 (4色)
    { level:2, type:'order_color', items:['red','blue','yellow','green'],
      q:'ひだりから 3ばんめは なにいろ？', hint:'1, 2, 3 と かぞえてみよう', answer:1, choices:['red','yellow','blue','green'] },
    { level:2, type:'order_color', items:['pink','blue','orange','yellow'],
      q:'みぎから 1ばんめは なにいろ？', answer:2, choices:['pink','blue','yellow','orange'] },
    { level:2, type:'order_color', items:['green','yellow','red','blue'],
      q:'ひだりから 2ばんめは なにいろ？', answer:1, choices:['green','yellow','red','blue'] },
    { level:2, type:'order_color', items:['orange','pink','green','red'],
      q:'みぎから 2ばんめは なにいろ？', answer:0, choices:['green','pink','orange','red'] },
    { level:2, type:'order_color', items:['blue','yellow','pink','orange'],
      q:'ひだりから 3ばんめは なにいろ？', hint:'1, 2, 3 と かぞえてみよう', answer:1, choices:['blue','pink','yellow','orange'] },
    { level:2, type:'order_color', items:['red','green','blue','yellow'],
      q:'みぎから 1ばんめは なにいろ？', answer:2, choices:['red','green','yellow','blue'] },
    { level:2, type:'order_color', items:['purple','orange','cyan','red'],
      q:'ひだりから 2ばんめは なにいろ？', answer:1, choices:['purple','orange','cyan','red'] },
    { level:2, type:'order_color', items:['yellow','purple','red','green'],
      q:'みぎから 2ばんめは なにいろ？', answer:1, choices:['purple','red','yellow','green'] },

    // Level 3 (5色)
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
    { level:3, type:'order_color', items:['red','blue','yellow','green','pink'],
      q:'いちばん ひだりは なにいろ？', answer:0, choices:['red','blue','yellow','green'] },
    { level:3, type:'order_color', items:['blue','red','yellow','green','purple'],
      q:'いちばん みぎは なにいろ？', answer:2, choices:['blue','red','purple','green'] },
    { level:3, type:'order_color', items:['pink','blue','yellow','red','green'],
      q:'まんなかは なにいろ？', answer:0, choices:['yellow','blue','pink','red'] }
  ],

  // ── 数をかぞえよう ────────────────────────────────
  count_total: [
    // Level 1 (count 1-3)
    { level:1, type:'count_total', item:'ringo',  count:2, q:'りんごは いくつ？',     answer:0, choices:[2,3,4,5] },
    { level:1, type:'count_total', item:'ichigo', count:3, q:'いちごは いくつ？',     answer:1, choices:[2,3,4,5] },
    { level:1, type:'count_total', item:'hana',   count:1, q:'おはなは いくつ？',     answer:0, choices:[1,2,3,4] },
    { level:1, type:'count_total', item:'hoshi',  count:2, q:'おほしさまは いくつ？', answer:1, choices:[1,2,3,4] },
    { level:1, type:'count_total', item:'mikan',  count:3, q:'みかんは いくつ？',     answer:1, choices:[2,3,4,5] },
    { level:1, type:'count_total', item:'ringo',  count:1, q:'りんごは いくつ？',     answer:0, choices:[1,2,3,4] },
    { level:1, type:'count_total', item:'ichigo', count:2, q:'いちごは いくつ？',     answer:1, choices:[1,2,3,4] },
    { level:1, type:'count_total', item:'hana',   count:3, q:'おはなは いくつ？',     answer:1, choices:[2,3,4,5] },

    // Level 2 (count 4-6)
    { level:2, type:'count_total', item:'hoshi',  count:4, q:'おほしさまは いくつ？', answer:1, choices:[3,4,5,6] },
    { level:2, type:'count_total', item:'hana',   count:5, q:'おはなは いくつ？',     answer:2, choices:[3,4,5,6] },
    { level:2, type:'count_total', item:'ringo',  count:4, q:'りんごは いくつ？',     answer:1, choices:[3,4,5,6] },
    { level:2, type:'count_total', item:'ichigo', count:4, q:'いちごは いくつ？',     answer:1, choices:[3,4,5,6] },
    { level:2, type:'count_total', item:'mikan',  count:5, q:'みかんは いくつ？',     answer:1, choices:[4,5,6,7] },
    { level:2, type:'count_total', item:'hoshi',  count:6, q:'おほしさまは いくつ？', answer:2, choices:[4,5,6,7] },
    { level:2, type:'count_total', item:'ringo',  count:5, q:'りんごは いくつ？',     answer:1, choices:[4,5,6,7] },
    { level:2, type:'count_total', item:'ichigo', count:6, q:'いちごは いくつ？',     answer:2, choices:[4,5,6,7] },

    // Level 3 (count 6-9)
    { level:3, type:'count_total', item:'mikan',  count:7, q:'みかんは いくつ？',     answer:1, choices:[6,7,8,9] },
    { level:3, type:'count_total', item:'hoshi',  count:7, q:'おほしさまは いくつ？', answer:1, choices:[6,7,8,9] },
    { level:3, type:'count_total', item:'ringo',  count:8, q:'りんごは いくつ？',     answer:2, choices:[6,7,8,9] },
    { level:3, type:'count_total', item:'hana',   count:6, q:'おはなは いくつ？',     answer:1, choices:[5,6,7,8] },
    { level:3, type:'count_total', item:'ichigo', count:8, q:'いちごは いくつ？',     answer:1, choices:[7,8,9,10] },
    { level:3, type:'count_total', item:'mikan',  count:9, q:'みかんは いくつ？',     answer:2, choices:[7,8,9,10] },
    { level:3, type:'count_total', item:'ringo',  count:6, q:'りんごは いくつ？',     answer:1, choices:[5,6,7,8] },
    { level:3, type:'count_total', item:'hoshi',  count:8, q:'おほしさまは いくつ？', answer:2, choices:[6,7,8,9] }
  ],

  // ── かたち ────────────────────────────────────────
  shape_name: [
    // Level 1 (名前当て — 3歳児が答えられるレベル)
    { level:1, type:'shape_name', shape:'circle',    q:'これは どんな かたち？', answer:0, choices:['まる','しかく','さんかく','ほし'] },
    { level:1, type:'shape_name', shape:'square',    q:'これは どんな かたち？', answer:1, choices:['まる','しかく','さんかく','ほし'] },
    { level:1, type:'shape_name', shape:'triangle',  q:'これは どんな かたち？', answer:2, choices:['まる','しかく','さんかく','ほし'] },
    { level:1, type:'shape_name', shape:'heart',     q:'これは どんな かたち？', answer:0, choices:['ハート','まる','しかく','さんかく'] },
    { level:1, type:'shape_name', shape:'star',      q:'これは どんな かたち？', answer:2, choices:['まる','しかく','ほし','さんかく'] },
    { level:1, type:'shape_name', shape:'rectangle', q:'これは どんな かたち？', answer:0, choices:['ながしかく','まる','さんかく','ほし'] },
    { level:1, type:'shape_name', shape:'oval',      q:'これは どんな かたち？', answer:0, choices:['たまごがた','まる','しかく','ハート'] },
    { level:1, type:'shape_name', shape:'heart',     q:'これは なんの かたち？', answer:1, choices:['まる','ハート','ほし','しかく'] },

    // Level 2 (名前当て＋性質問題)
    { level:2, type:'shape_name', shape:'star',      q:'ほしの かどは なんこ？', answer:0, choices:['5こ','4こ','6こ','3こ'] },
    { level:2, type:'shape_name', shape:'heart',     q:'これは なんの かたち？', answer:1, choices:['ほし','ハート','さんかく','まる'] },
    { level:2, type:'shape_name', shape:'diamond',   q:'これは どんな かたち？', answer:0, choices:['ダイヤのかたち','まる','さんかく','しかく'] },
    { level:2, type:'shape_name', shape:'oval',      q:'これは どんな かたち？', answer:3, choices:['まる','しかく','さんかく','たまごがた'] },
    { level:2, type:'shape_name', shape:'triangle',  q:'このかたちの かどは なんこ？', answer:1, choices:['2こ','3こ','4こ','5こ'] },
    { level:2, type:'shape_name', shape:'square',    q:'このかたちの かどは なんこ？', answer:2, choices:['3こ','5こ','4こ','2こ'] },
    { level:2, type:'shape_name', shape:'heart',     q:'ハートの かどは いくつ？', answer:0, choices:['1こ','2こ','3こ','4こ'] },
    { level:2, type:'shape_name', shape:'star',      q:'ほしと まるでは どちらが かどが おおい？', answer:0, choices:['ほし','まる','おなじ','どちらも かどが ない'] },

    // Level 3 (性質・知識問題)
    { level:3, type:'shape_name', shape:'circle',    q:'このかたちに かどは いくつ？', answer:1, choices:['2こ','0こ（ない）','4こ','1こ'] },
    { level:3, type:'shape_name', shape:'square',    q:'このかたちの かどは ぜんぶで いくつ？', answer:2, choices:['3こ','5こ','4こ','6こ'] },
    { level:3, type:'shape_name', shape:'oval',      q:'たまごがたに かどは いくつ？', answer:0, choices:['0こ（ない）','2こ','3こ','4こ'] },
    { level:3, type:'shape_name', shape:'diamond',   q:'ひしがたの かどは ぜんぶで いくつ？', answer:1, choices:['3こ','4こ','5こ','6こ'] },
    { level:3, type:'shape_name', shape:'triangle',  q:'まると さんかくでは どちらが かどが おおい？', answer:1, choices:['まる','さんかく','おなじ','どちらも かどが ない'] },
    { level:3, type:'shape_name', shape:'circle',    q:'ピザを はんぶんに きると どんな かたちに なる？', answer:0, choices:['さんかく','まる','しかく','たまごがた'] },
    { level:3, type:'shape_name', shape:'circle',    q:'とけいの かたちは ふつう なに？', answer:0, choices:['まる','しかく','さんかく','ほし'] },
    { level:3, type:'shape_name', shape:'circle',    q:'サッカーボールの かたちは？', answer:0, choices:['まる','しかく','さんかく','ほし'] }
  ],

  // ── たべもの / のりもの は「ずかん (wordmatch)」へ移管済み (2026-04-28) ──

  // ── てんき ────────────────────────────────────────
  weather: [
    // Level 1
    { level:1, type:'emoji_name', category:'weather', img:'Sun/Sun_normal_1.png', q:'この てんきは？', answer:0, choices:['はれ','くもり','あめ','ゆき'] },
    { level:1, type:'emoji_name', category:'weather', img:'Rain/Rain_normal_1.png', q:'この てんきは？', answer:2, choices:['はれ','くもり','あめ','ゆき'] },
    { level:1, type:'emoji_name', category:'weather', img:'Cloud/Cloud_normal_1.png', q:'この てんきは？', answer:1, choices:['はれ','くもり','あめ','ゆき'] },
    { level:1, type:'emoji_name', category:'weather', img:'Snow/Snow_normal_1.png', q:'この てんきは？', answer:2, choices:['はれ','あめ','ゆき','くもり'] },
    { level:1, type:'emoji_name', category:'weather', img:'Rainbow/Rainbow_normal_1.png', q:'これは なに？', answer:2, choices:['かみなり','くもり','にじ','あめ'] },
    { level:1, type:'emoji_name', category:'weather', img:'Thunder/Thunder_normal_1.png', q:'これは なに？', answer:0, choices:['かみなり','はれ','くもり','にじ'] },
    { level:1, type:'emoji_name', category:'weather', img:'Wind/Wind_normal_1.png', q:'これは なに？', answer:2, choices:['あめ','くもり','かぜ','ゆき'] },
    { level:1, type:'trivia', category:'weather',
      q:'そらに ある しろい ふわふわは なに？',
      answer:0, choices:['くも','けむり','わた','ほし'] ,
      detail:'くもは とっても ちいさな みずの つぶの あつまりだよ！'},

    // Level 2
    { level:2, type:'emoji_name', category:'weather', img:'Tornado/Tornado_normal_1.png', q:'これは なに？', answer:0, choices:['たつまき','つなみ','じしん','かみなり'] },
    { level:2, type:'trivia', category:'weather', q:'あさ、しろい もやが でる てんきを なんという？', answer:1, choices:['あめ','きり','ゆき','くもり'] ,
      detail:'きりは ちいさな みずの つぶが くうきに うかんでいる じょうたいだよ！'},
    { level:2, type:'trivia', category:'weather',
      q:'にじは なんしょく？',
      answer:1, choices:['5しょく','7しょく','3しょく','10しょく'] ,
      detail:'あか・だいだい・きいろ・みどり・あお・あいいろ・むらさきの 7しょくだよ！'},
    { level:2, type:'trivia', category:'weather',
      q:'みずたまりは いつ できる？',
      answer:0, choices:['あめのあと','はれのとき','ゆきのとき','よるだけ'] ,
      detail:'あめがふると みずがたまるよ！'},
    { level:2, type:'trivia', category:'weather',
      q:'かみなりは なぜ なる？',
      hint:'くもの なかで でんきが ピカッと！',
      answer:0, choices:['くもの なかで でんきが たまるから','かみなりさまが たいこを たたくから','かわが かわくから','かぜが つよいから'] ,
      detail:'くもの なかで こおりの つぶが ぶつかりあって でんきが たまるよ！'},
    { level:2, type:'trivia', category:'weather',
      q:'あめは どこから ふってくる？',
      answer:0, choices:['くも','そら','やま','うみ'] ,
      detail:'うみや かわの みずが くもになって、また あめになるよ！'},
    { level:2, type:'emoji_name', category:'weather', img:'Thermometer/Thermometer_normal_1.png',
      q:'これは なに？', answer:0, choices:['おんどけい','とけい','ものさし','コップ'] ,
      detail:'おんどけいは あつい・さむいを はかる どうぐだよ！'},
    { level:2, type:'trivia', category:'weather',
      q:'1ねんで いちばん あつい きせつは？',
      answer:1, choices:['はる','なつ','あき','ふゆ'] ,
      detail:'にほんでは 7がつ〜8がつが いちばん あつくなるよ！'},

    // Level 3
    { level:3, type:'emoji_name', category:'weather', img:'Hurricane/Hurricane_normal_1.png', q:'これは なに？', answer:2, choices:['おおあめ','たつまき','たいふう','なみ'] },
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
      answer:1, choices:['あつい ひる','すずしい あさ','つよい かぜ','たいふう'] ,
      detail:'くうきが ひえると みずが つぶに なって きりに なるよ！'},
    { level:3, type:'trivia', category:'weather',
      q:'ゆきが たくさん ふる ちほうを なんという？',
      answer:0, choices:['ゆきぐに','ゆきやま','ふゆのくに','こおりのくに'] ,
      detail:'にほんかいがわは ゆきが おおく「ゆきぐに」と よばれるよ！'},
    { level:3, type:'trivia', category:'weather',
      q:'うみや かわの みずが そらに のぼっていくのを なんという？',
      hint:'みずが あつくなって きえるみたいに みえるよ！',
      answer:0, choices:['じょうはつ','こおる','しずむ','とぶ'] ,
      detail:'おひさまに あたためられた みずが くうきに なって のぼり、くもに なるよ！'},
    { level:3, type:'trivia', category:'weather',
      q:'ふゆに いきが しろく みえるのは なぜ？',
      answer:0, choices:['いきの なかの みずが ひえて つぶに なるから','くちの なかが しろいから','ゆきが ふっているから','さむくて こおっているから'] ,
      detail:'あったかい いきが つめたい くうきで ひえて、ちいさな みずの つぶに なるよ！'},
    { level:3, type:'trivia', category:'weather',
      q:'ゆきの けっしょうは どんな かたち？',
      hint:'とても ちいさい こおりの かたち！',
      answer:2, choices:['まる','ほし','つの が 6つ ある かたち','しかく'] ,
      detail:'ゆきの つぶは とても ちいさい けど 6つの かどが ある かたちを しているよ！'}
  ],

  // ── はんたいことば ────────────────────────────────
  opposite: [
    // Level 1
    { level:1, type:'opposite', category:'opposite', word:'おおきい', q:'「おおきい」の はんたいは？', answer:2, choices:['あかい','まるい','ちいさい','やさしい'] },
    { level:1, type:'opposite', category:'opposite', word:'あつい',   q:'「あつい」の はんたいは？',   answer:1, choices:['やわらかい','つめたい','はやい','くらい'] },
    { level:1, type:'opposite', category:'opposite', word:'まえ',     q:'「まえ」の はんたいは？',     answer:3, choices:['みぎ','ひだり','うえ','うしろ'] },
    { level:1, type:'opposite', category:'opposite', word:'たつ',     q:'「たつ」の はんたいは？',     answer:1, choices:['あるく','すわる','ねる','とぶ'] },
    { level:1, type:'opposite', category:'opposite', word:'あける',   q:'「あける」の はんたいは？',   answer:2, choices:['おす','ひく','しめる','まわす'] },
    { level:1, type:'opposite', category:'opposite', word:'すき',     q:'「すき」の はんたいは？',     answer:0, choices:['きらい','いい','わるい','おもしろい'] },
    { level:1, type:'opposite', category:'opposite', word:'よる',     q:'「よる」の はんたいは？',     answer:1, choices:['ゆうがた','あさ','ひる','まよなか'] },
    { level:1, type:'opposite', category:'opposite', word:'たくさん', q:'「たくさん」の はんたいは？', answer:3, choices:['おおきい','おおい','はやい','すこし'] },

    // Level 2
    { level:2, type:'opposite', category:'opposite', word:'はやい',   q:'「はやい」の はんたいは？',   answer:0, choices:['おそい','かるい','やさしい','あかるい'] },
    { level:2, type:'opposite', category:'opposite', word:'たかい',   q:'「たかい」の はんたいは？',   answer:3, choices:['おもい','かたい','くらい','ひくい'] },
    { level:2, type:'opposite', category:'opposite', word:'ながい',   q:'「ながい」の はんたいは？',   answer:1, choices:['かわいい','みじかい','やわらかい','かるい'] },
    { level:2, type:'opposite', category:'opposite', word:'ふとい',   q:'「ふとい」の はんたいは？',   answer:2, choices:['おもい','ちいさい','ほそい','みじかい'] },
    { level:2, type:'opposite', category:'opposite', word:'かたい',   q:'「かたい」の はんたいは？',   answer:1, choices:['かるい','やわらかい','やさしい','つよい'] },
    { level:2, type:'opposite', category:'opposite', word:'つよい',   q:'「つよい」の はんたいは？',   answer:0, choices:['よわい','おもい','ちいさい','おそい'] },
    { level:2, type:'opposite', category:'opposite', word:'なく',     q:'「なく」の はんたいは？',     answer:2, choices:['えがく','おこる','わらう','ねる'] },
    { level:2, type:'opposite', category:'opposite', word:'おおい',   q:'「おおい」の はんたいは？',   answer:1, choices:['おおきい','すくない','ちいさい','よわい'] },

    // Level 3
    { level:3, type:'opposite', category:'opposite', word:'かるい',     q:'「かるい」の はんたいは？',     answer:2, choices:['やさしい','ふるい','おもい','ちいさい'] },
    { level:3, type:'opposite', category:'opposite', word:'あかるい',   q:'「あかるい」の はんたいは？',   answer:0, choices:['くらい','やさしい','きつい','ちいさい'] },
    { level:3, type:'opposite', category:'opposite', word:'うえ',       q:'「うえ」の はんたいは？',       answer:3, choices:['みぎ','まえ','ひだり','した'] },
    { level:3, type:'opposite', category:'opposite', word:'あたらしい', q:'「あたらしい」の はんたいは？', answer:2, choices:['やすい','おもい','ふるい','かるい'] },
    { level:3, type:'opposite', category:'opposite', word:'たすける',   q:'「たすける」の はんたいは？',   answer:1, choices:['いっしょに あそぶ','じゃまを する','なかよく する','なにも しない'] },
    { level:3, type:'opposite', category:'opposite', word:'でかける',   q:'「でかける」の はんたいは？',   answer:3, choices:['あそぶ','たべる','ねる','かえる'] },
    { level:3, type:'opposite', category:'opposite', word:'ほめる',     q:'「ほめる」の はんたいは？',     answer:0, choices:['しかる','おこる','いう','にらむ'] },
    { level:3, type:'opposite', category:'opposite', word:'おしえる',   q:'「おしえる」の はんたいは？',   answer:2, choices:['はなす','きく','ならう','よむ'] }
  ],

  // ── どうぶつ・むし は「ずかん (wordmatch)」へ移管済み (絵+名前マッチ) (2026-04-28) ──
  // ※ トリビアは下記 trivia / weather / body カテゴリで継続提供。

  // ── トリビア（やさしい/ふつう/むずかしい） ────────
  trivia: [
    // Level 1
    { level:1, type:'trivia', category:'trivia',
      q:'うれた バナナは なにいろ？',
      answer:1, choices:['あか','きいろ','あお','むらさき'] ,
      detail:'バナナは みどりから きいろに なって、あまく おいしく なるよ！'},
    { level:1, type:'trivia', category:'trivia',
      q:'ねこは なんて なく？',
      answer:2, choices:['ワンワン','モーモー','ニャーニャー','コケコッコー'] ,
      detail:'ねこは「ニャー」と なくよ。きげんが いいと「ゴロゴロ」も するよ！'},
    { level:1, type:'trivia', category:'trivia',
      q:'ぞうの からだで いちばん ながいのは どこ？',
      answer:0, choices:['はな','しっぽ','みみ','あし'] ,
      detail:'ぞうの ながい はなは「もの」を つかんだり、みずを のんだり できるよ！'},
    { level:1, type:'trivia', category:'trivia',
      q:'ふゆに そらから ふってくる しろい ものは？',
      answer:1, choices:['あめ','ゆき','すな','こおり'] ,
      detail:'ゆきは くもの なかで みずが こおって おちてくるよ！'},
    { level:1, type:'trivia', category:'trivia',
      q:'たまごから うまれる いきものは どれ？',
      answer:1, choices:['いぬ','にわとり','うし','ぶた'] ,
      detail:'にわとりは たまごを うんで、その たまごから ひよこが うまれるよ！'},
    { level:1, type:'trivia', category:'trivia',
      q:'ふつうの りんごは なにいろ？',
      answer:0, choices:['あか','あお','くろ','しろ'] ,
      detail:'りんごは あかい いろが おおいよ。みどりの りんごも あるんだ！'},
    { level:1, type:'trivia', category:'trivia',
      q:'おひさまが でてくるのは どっち？',
      answer:0, choices:['あさ','よる','まよなか','ゆうがた'] ,
      detail:'あさに おひさまが のぼって、よるは おつきさまが でてくるよ！'},
    { level:1, type:'trivia', category:'trivia',
      q:'うさぎの みみは どんな かたち？',
      answer:1, choices:['まるくて みじかい','ながくて たっている','まるい ちいさい','とがって ちいさい'] ,
      detail:'うさぎは ながい みみで とおくの おとを よく きけるんだ！'},

    // Level 2
    { level:2, type:'trivia', category:'trivia',
      q:'そらを とべない とりは どれ？',
      answer:1, choices:['タカ','ペンギン','ハト','ツバメ'] ,
      detail:'ペンギンは とべないけど うみを およぐのが とくいだよ！'},
    { level:2, type:'trivia', category:'trivia',
      q:'タコの あしは なんぼん？',
      answer:1, choices:['6ぼん','8ぼん','10ぼん','4ぼん'] ,
      detail:'8ぼんの うでで えものを つかまえたり あるいたりするよ！'},
    { level:2, type:'trivia', category:'trivia',
      q:'せかいで いちばん はやい りくの どうぶつは？',
      answer:2, choices:['ライオン','シマウマ','チーター','キリン'] ,
      detail:'チーターは じそく 100キロ いじょうで はしれるよ！'},
    { level:2, type:'trivia', category:'trivia',
      q:'にほんで いちばん たかい やまは？',
      answer:1, choices:['のりくらさん','ふじさん','きりしまやま','こうやさん'] ,
      detail:'ふじさんの たかさは 3776メートルだよ！'},
    { level:2, type:'trivia', category:'trivia',
      q:'ふゆに ねむる（とうみん）どうぶつは どれ？',
      answer:2, choices:['ゾウ','ライオン','クマ','キリン'] ,
      detail:'クマは ふゆの あいだ たべものを さがさず ねむって すごすよ！'},
    { level:2, type:'trivia', category:'trivia',
      q:'あめが ふると つちから でてくる いきものは？',
      answer:1, choices:['チョウチョ','ミミズ','カブトムシ','セミ'] ,
      detail:'ミミズは みずが にがてで、あめが ふると じめんに でてくるよ！'},
    { level:2, type:'trivia', category:'trivia',
      q:'コアラが たべるものは？',
      answer:2, choices:['バナナ','たけのこ','ユーカリの は','りんご'] ,
      detail:'ユーカリの はは どくが あるけど、コアラだけ たべられるよ！'},
    { level:2, type:'trivia', category:'trivia',
      q:'キリンが 1日に ねむる じかんは？',
      hint:'とても みじかいよ！',
      answer:1, choices:['1じかんくらい','3じかんくらい','5じかんくらい','12じかんくらい'] ,
      detail:'やせいの キリンは てきに おそわれないよう みじかく ねるよ！'},

    // Level 3
    { level:3, type:'trivia', category:'trivia',
      q:'せかいで いちばん おおきい さかなは？',
      hint:'クジラは さかなじゃなくて ほにゅうるい！',
      answer:2, choices:['マグロ','クジラ','ジンベイザメ','サメ'] ,
      detail:'ジンベイザメは やさしい さかなで プランクトンを たべるよ！'},
    { level:3, type:'trivia', category:'trivia',
      q:'イルカは なにの なかま？',
      hint:'さかなに みえるけど ほにゅうるいだよ！',
      answer:2, choices:['さかな','サメ','クジラ','タコ'] ,
      detail:'イルカは ちいさい クジラの なかまで、おなじ ほにゅうるいだよ！'},
    { level:3, type:'trivia', category:'trivia',
      q:'ちきゅうで いちばん おおきい いきものは？',
      answer:2, choices:['ゾウ','ジンベイザメ','シロナガスクジラ','ダイオウイカ'] ,
      detail:'シロナガスクジラは ながさ 30メートルにも なるよ！'},
    { level:3, type:'trivia', category:'trivia',
      q:'めが 8つある いきものは？',
      hint:'あしも 8ぽん あるよ！こんちゅう（むし）の なかまじゃないよ！',
      answer:1, choices:['カブトムシ','クモ','チョウチョ','バッタ'] ,
      detail:'クモは あしが 8ぽんで、こんちゅう（むし）とは ちがう なかまだよ！'},
    { level:3, type:'trivia', category:'trivia',
      q:'バナナの きは じつは なにの なかま？',
      hint:'たかい きに みえるけど…',
      answer:1, choices:['たけ','くさ','まつのき','さくら'] ,
      detail:'バナナの きは「くさ」の なかまで、ほんとうは「き」じゃないんだよ！'},
    { level:3, type:'trivia', category:'trivia',
      q:'タコの しんぞうは いくつ ある？',
      hint:'タコは 3つも あるんじゃ！',
      answer:2, choices:['1つ','2つ','3つ','4つ'] ,
      detail:'2つは えらに ちを おくり、1つが からだに ちを おくるよ！'},
    { level:3, type:'trivia', category:'trivia',
      q:'フラミンゴが ピンクいろなのは なぜ？',
      hint:'たべものの いろが からだに うつるよ！',
      answer:1, choices:['そらの いろを すいこむ','あかい たべものを たべる','ペンキを ぬる','にっこうで やける'] ,
      detail:'フラミンゴは あかい エビや ミジンコを たべるから ピンクに なるんだよ！'},
    { level:3, type:'trivia', category:'trivia',
      q:'ライオンの オスにだけ ある ものは？',
      hint:'かおの まわりに もこもこ！',
      answer:0, choices:['たてがみ','しっぽ','つの','はね'] ,
      detail:'オスの ライオンには かおの まわりに たてがみが あるよ！メスには ないんだ！'}
  ],

  // ── からだのぶぶん ────────────────────────────────
  body: [
    // Level 1
    { level:1, type:'emoji_name', category:'body', img:'Eyes/Eyes_normal_1.png', q:'これは からだの どこ？', answer:1, choices:['はな','め','くち','みみ'] },
    { level:1, type:'emoji_name', category:'body', img:'Mouth_part/Mouth_part_normal_1.png', q:'これは からだの どこ？', answer:2, choices:['め','みみ','くち','はな'] },
    { level:1, type:'emoji_name', category:'body', img:'Palm/Palm_normal_1.png', q:'これは からだの どこ？', answer:2, choices:['あし','かた','て','うで'] },
    { level:1, type:'emoji_name', category:'body', img:'Foot_part/Foot_part_normal_1.png', q:'これは からだの どこ？', answer:0, choices:['あし','て','かた','おなか'] },
    { level:1, type:'trivia', category:'body',
      q:'においを かぐのは からだの どこ？', answer:0, choices:['はな','くち','め','ほほ'] ,
      detail:'はなの おくに においを かんじる ばしょが あるよ！'},
    { level:1, type:'trivia', category:'body',
      q:'ものを みるのは からだの どこ？', answer:1, choices:['くち','め','ほほ','ひたい'] ,
      detail:'めに はいった ひかりを のうが かたちに かえるよ！'},
    { level:1, type:'trivia', category:'body',
      q:'ものを きくのは からだの どこ？', answer:2, choices:['め','くち','みみ','はな'] ,
      detail:'みみの なかの ちいさな ほねが おとを つたえるよ！'},
    { level:1, type:'trivia', category:'body',
      q:'かたての ゆびは なんぼん？',
      answer:1, choices:['4ほん','5ほん','6ほん','3ほん'] ,
      detail:'おやゆび・ひとさしゆび・なかゆび・くすりゆび・こゆびの 5ほんだよ！'},

    // Level 2
    { level:2, type:'emoji_name', category:'body', img:'Nose_part/Nose_part_normal_1.png', q:'これは からだの どこ？', answer:0, choices:['はな','くち','め','ほほ'] },
    { level:2, type:'emoji_name', category:'body', img:'Teeth/Teeth_normal_1.png', q:'これは からだの なに？', answer:1, choices:['ほね','は','つめ','かみ'] },
    { level:2, type:'emoji_name', category:'body', img:'Tongue/Tongue_normal_1.png', q:'これは からだの なに？', answer:1, choices:['ゆび','した','みみ','おなか'] ,
      detail:'したで あじを かんじているよ！'},
    { level:2, type:'emoji_name', category:'body', img:'Ear_part/Ear_part_normal_1.png', q:'これは からだの どこ？', answer:2, choices:['め','はな','みみ','くち'] },
    { level:2, type:'trivia', category:'body',
      q:'からだぜんたいを つつんで まもっているのは？',
      hint:'からだの そとを おおっている ぶぶんだよ！',
      answer:1, choices:['ふく','ひふ','ほね','け'] ,
      detail:'ひふは からだぜんたいを つつんで まもっている ぶぶんだよ！'},
    { level:2, type:'trivia', category:'body',
      q:'ちを からだじゅうに おくる ぽんぷは？',
      answer:0, choices:['しんぞう','のう','ひふ','い'] ,
      detail:'しんぞうは どきどき と うごいて ち を おくっているよ！'},
    { level:2, type:'trivia', category:'body',
      q:'たべものを かんで こなごなに するのは どこ？',
      answer:0, choices:['は','みみ','め','かみのけ'] ,
      detail:'は で たべものを かんでから のみこむと、おなかで しょうかしやすいよ！'},
    { level:2, type:'trivia', category:'body',
      q:'いきを すうのは からだの どこ？',
      answer:0, choices:['はい','い','こころ','ゆび'] ,
      detail:'はいで くうきを とりこんで、からだに さんそを おくるよ！'},

    // Level 3
    { level:3, type:'trivia', category:'body',
      q:'ねむっているとき からだは どうなっている？',
      answer:0, choices:['やすんでいる','たべている','はしっている','うごけない'] ,
      detail:'ねている あいだに からだは げんきを ためなおして、おおきく なっていくよ！'},
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
      answer:0, choices:['めを まもる','あそびの ため','こわい ため','ねむくなる ため'] ,
      detail:'まばたきで めに なみだを ながして、ほこりや ごみを ながしているよ！'},
    { level:3, type:'trivia', category:'body',
      q:'けがを すると かさぶたが できるのは なぜ？',
      answer:0, choices:['きずを まもって なおすため','いろを かえるため','かゆくする ため','いろを つけるため'] ,
      detail:'ちが かたまって フタの ように なって、きずを まもりながら なおしているよ！'}
  ]
};

// ── カテゴリーメタデータ ──────────────────────────
const QUIZLAND_CATEGORIES = {
  order_color: { label: 'いろのじゅんばん', emoji: '🎨' },
  count_total:  { label: 'かずをかぞえよう', emoji: '🔢' },
  shape_name:   { label: 'かたち',           emoji: '⬛' },
  trivia:       { label: 'びっくり豆知識',   emoji: '💡' },
  weather:      { label: 'てんき',           emoji: '☀️' },
  opposite:     { label: 'はんたいことば',   emoji: '🔄' },
  body:         { label: 'からだ',           emoji: '✋' }
};

// ── カラーパレット（CSS 描画用）────────────────────
const QUIZLAND_COLORS = {
  red:    { name: 'あか',     code: '#EF4444' },
  blue:   { name: 'あお',     code: '#3B82F6' },
  yellow: { name: 'きいろ',   code: '#FBBF24' },
  green:  { name: 'みどり',   code: '#10B981' },
  pink:   { name: 'ピンク',   code: '#EC4899' },
  orange: { name: 'オレンジ', code: '#F97316' },
  purple: { name: 'むらさき', code: '#8B5CF6' },
  cyan:   { name: 'みずいろ', code: '#06B6D4' }
};

// ── 絵パス（count_total 用）─────────────────────────
const QUIZLAND_WORD_IMG = '../assets/images/word/';
