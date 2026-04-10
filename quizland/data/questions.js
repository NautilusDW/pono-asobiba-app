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
      q:'ひだりから 4ばんめは なにいろ？', answer:2, choices:['pink','blue','yellow','purple'] },
    { level:3, type:'order_color', items:['red','cyan','orange','purple','blue'],
      q:'ひだりから 3ばんめは なにいろ？', answer:0, choices:['orange','red','cyan','blue'] },
    { level:3, type:'order_color', items:['yellow','green','red','pink','orange'],
      q:'みぎから 3ばんめは なにいろ？', answer:1, choices:['green','red','yellow','orange'] },
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
    { level:3, type:'count_total', item:'hoshi',  count:9, q:'おほしさまは いくつ？', answer:2, choices:[7,8,9,10] }
  ],

  // ── かたち ────────────────────────────────────────
  shape_name: [
    // Level 1 (名前当て)
    { level:1, type:'shape_name', shape:'circle',    q:'これは どんな かたち？', answer:0, choices:['まる','しかく','さんかく','ほし'] },
    { level:1, type:'shape_name', shape:'square',    q:'これは どんな かたち？', answer:1, choices:['まる','しかく','さんかく','ほし'] },
    { level:1, type:'shape_name', shape:'triangle',  q:'これは どんな かたち？', answer:2, choices:['まる','しかく','さんかく','ほし'] },
    { level:1, type:'shape_name', shape:'heart',     q:'これは どんな かたち？', answer:0, choices:['ハート','まる','しかく','さんかく'] },
    { level:1, type:'shape_name', shape:'star',      q:'これは どんな かたち？', answer:2, choices:['まる','しかく','ほし','さんかく'] },
    { level:1, type:'shape_name', shape:'rectangle', q:'これは どんな かたち？', answer:1, choices:['しかく','ながしかく','まる','さんかく'] },

    // Level 2 (名前当て＋性質問題)
    { level:2, type:'shape_name', shape:'star',      q:'これは どんな かたち？', answer:3, choices:['まる','しかく','さんかく','ほし'] },
    { level:2, type:'shape_name', shape:'heart',     q:'これは なんの かたち？', answer:1, choices:['ほし','ハート','さんかく','まる'] },
    { level:2, type:'shape_name', shape:'diamond',   q:'これは どんな かたち？', answer:0, choices:['ひしがた','まる','しかく','さんかく'] },
    { level:2, type:'shape_name', shape:'oval',      q:'これは どんな かたち？', answer:3, choices:['まる','しかく','さんかく','たまごがた'] },
    { level:2, type:'shape_name', shape:'triangle',  q:'このかたちの かどは なんこ？', answer:1, choices:['2こ','3こ','4こ','5こ'] },
    { level:2, type:'shape_name', shape:'square',    q:'このかたちの かどは なんこ？', answer:2, choices:['3こ','5こ','4こ','2こ'] },
    { level:2, type:'shape_name', shape:'rectangle', q:'このかたちの なまえは？', answer:0, choices:['ながしかく','ひしがた','たまごがた','まる'] },

    // Level 3 (性質・知識問題)
    { level:3, type:'shape_name', shape:'circle',   q:'このかたちに かどは いくつ？', answer:1, choices:['2こ','0こ（ない）','4こ','1こ'] },
    { level:3, type:'shape_name', shape:'star',     q:'ほしの かどは なんこ？',       answer:0, choices:['5こ','4こ','6こ','3こ'] },
    { level:3, type:'shape_name', shape:'triangle', q:'このかたちは なん「かっけい」？', answer:1, choices:['しかっけい','さんかっけい','ごかっけい','ろっかっけい'] },
    { level:3, type:'shape_name', shape:'square',   q:'このかたちの かどは ぜんぶで いくつ？', answer:2, choices:['3こ','5こ','4こ','6こ'] },
    { level:3, type:'shape_name', shape:'diamond',  q:'ひしがたは どんな かたちの なかま？', answer:1, choices:['まるの なかま','しかくの なかま','さんかくの なかま','ほしの なかま'] },
    { level:3, type:'shape_name', shape:'rectangle', q:'ながしかくと しかくの ちがいは？', answer:0, choices:['たてと よこの ながさが ちがう','かどの かずが ちがう','まるい','いろが ちがう'] }
  ],

  // ── たべもの ──────────────────────────────────────
  food: [
    { level:1, type:'emoji_name', category:'food', img:'Apple/Apple_normal_1.png', q:'これは なに？', answer:0, choices:['りんご','バナナ','みかん','いちご'] },
    { level:1, type:'emoji_name', category:'food', img:'Banana/Banana_normal_1.png', q:'これは なに？', answer:2, choices:['りんご','いちご','バナナ','ぶどう'] },
    { level:1, type:'emoji_name', category:'food', img:'Strawberry/Strawberry_normal_1.png', q:'これは なに？', answer:1, choices:['バナナ','いちご','みかん','りんご'] },
    { level:1, type:'emoji_name', category:'food', img:'Peach/Peach_normal_1.png', q:'これは なに？', answer:0, choices:['もも','りんご','バナナ','いちご'] },
    { level:1, type:'emoji_name', category:'food', img:'Cherry/Cherry_normal_1.png', q:'これは なに？', answer:2, choices:['いちご','もも','さくらんぼ','ぶどう'] },
    { level:2, type:'emoji_name', category:'food', img:'Orange/Orange_normal_1.png', q:'これは なに？', answer:2, choices:['いちご','ぶどう','みかん','りんご'] },
    { level:2, type:'emoji_name', category:'food', img:'Grapes/Grapes_normal_1.png', q:'これは なに？', answer:0, choices:['ぶどう','バナナ','みかん','もも'] },
    { level:2, type:'emoji_name', category:'food', img:'Watermelon/Watermelon_normal_1.png', q:'これは なに？', answer:1, choices:['メロン','すいか','もも','バナナ'] },
    { level:2, type:'emoji_name', category:'food', img:'Carrot/Carrot_normal_1.png', q:'これは なに？', answer:0, choices:['にんじん','だいこん','トマト','かぼちゃ'] },
    { level:2, type:'emoji_name', category:'food', img:'Mushroom/Mushroom_normal_1.png', q:'これは なに？', answer:2, choices:['キャベツ','ブロッコリー','きのこ','たまねぎ'] },
    { level:2, type:'emoji_name', category:'food', img:'Lemon/Lemon_normal_1.png', q:'これは なに？', answer:1, choices:['みかん','レモン','バナナ','りんご'] },
    { level:3, type:'emoji_name', category:'food', img:'Avocado/Avocado_normal_1.png', q:'これは なに？', answer:0, choices:['アボカド','メロン','キウイ','なし'] },
    { level:3, type:'emoji_name', category:'food', img:'Blueberry/Blueberry_normal_1.png', q:'これは なに？', answer:1, choices:['ぶどう','ブルーベリー','さくらんぼ','くろまめ'] },
    { level:3, type:'emoji_name', category:'food', img:'Kiwi/Kiwi_normal_1.png', q:'これは なに？', answer:2, choices:['なし','レモン','キウイ','メロン'] },
    { level:3, type:'emoji_name', category:'food', img:'Corn/Corn_normal_1.png', q:'これは なに？', answer:0, choices:['とうもろこし','たけのこ','にんじん','だいこん'] },
    { level:3, type:'emoji_name', category:'food', img:'Edamame/Edamame_normal_1.png', q:'これは なに？', answer:1, choices:['きゅうり','えだまめ','レタス','アスパラ'] }
  ],

  // ── のりもの ──────────────────────────────────────
  vehicle: [
    { level:1, type:'emoji_name', category:'vehicle', img:'Car/Car_normal_1.png', q:'これは なに？', answer:1, choices:['バス','くるま','じてんしゃ','でんしゃ'] },
    { level:1, type:'emoji_name', category:'vehicle', img:'Train/Train_normal_1.png', q:'これは なに？', answer:0, choices:['でんしゃ','バス','くるま','ふね'] },
    { level:1, type:'emoji_name', category:'vehicle', img:'Airplane/Airplane_normal_1.png', q:'これは なに？', answer:2, choices:['ロケット','ヘリコプター','ひこうき','バルーン'] },
    { level:1, type:'emoji_name', category:'vehicle', img:'Bicycle/Bicycle_normal_1.png', q:'これは なに？', answer:1, choices:['オートバイ','じてんしゃ','キックボード','スクーター'] },
    { level:1, type:'emoji_name', category:'vehicle', img:'Taxi/Taxi_normal_1.png', q:'これは なに？', answer:0, choices:['タクシー','パトカー','バス','でんしゃ'] },
    { level:2, type:'emoji_name', category:'vehicle', img:'Bus/Bus_normal_1.png', q:'これは なに？', answer:1, choices:['タクシー','バス','でんしゃ','トラクター'] },
    { level:2, type:'emoji_name', category:'vehicle', img:'Fire_engine/Fire_engine_normal_1.png', q:'これは なに？', answer:0, choices:['しょうぼうしゃ','パトカー','きゅうきゅうしゃ','トラック'] },
    { level:2, type:'emoji_name', category:'vehicle', img:'Cruise_ship/Cruise_ship_normal_1.png', q:'これは なに？', answer:2, choices:['ボート','ヨット','ふね','フェリー'] },
    { level:2, type:'emoji_name', category:'vehicle', img:'Rocket/Rocket_normal_1.png', q:'これは なに？', answer:0, choices:['ロケット','ひこうき','UFO','たこあげ'] },
    { level:2, type:'emoji_name', category:'vehicle', img:'Ambulance/Ambulance_normal_1.png', q:'これは なに？', answer:2, choices:['しょうぼうしゃ','パトカー','きゅうきゅうしゃ','トラック'] },
    { level:2, type:'emoji_name', category:'vehicle', emoji:'🚓', q:'これは なに？', answer:1, choices:['しょうぼうしゃ','パトカー','きゅうきゅうしゃ','バス'] },
    { level:3, type:'emoji_name', category:'vehicle', img:'Helicopter/Helicopter_normal_1.png', q:'これは なに？', answer:0, choices:['ヘリコプター','ひこうき','ロケット','グライダー'] },
    { level:3, type:'emoji_name', category:'vehicle', img:'Tractor/Tractor_normal_1.png', q:'これは なに？', answer:1, choices:['くるま','トラクター','トラック','バス'] },
    { level:3, type:'emoji_name', category:'vehicle', img:'Sailboat/Sailboat_normal_1.png', q:'これは なに？', answer:2, choices:['ふね','ボート','ヨット','カヌー'] },
    { level:3, type:'emoji_name', category:'vehicle', img:'Ufo/Ufo_normal_1.png', q:'これは なに？', answer:0, choices:['UFO','ロケット','ひこうき','ヘリコプター'] },
    { level:3, type:'emoji_name', category:'vehicle', img:'Excavator/Excavator_normal_1.png', q:'これは なに？', answer:0, choices:['ショベルカー','トラクター','ブルドーザー','クレーン'] }
  ],

  // ── きょうりゅう ──────────────────────────────────
  dino: [
    // Level 1: 特徴問題（名前よりやさしい）
    { level:1, type:'emoji_name', category:'dino', img:'Brachiosaurus/Brachiosaurus_normal_1.png',
      q:'このきょうりゅうは なにを たべる？', answer:0, choices:['くさや はっぱ','おにく','さかな','きのみ'] },
    { level:1, type:'emoji_name', category:'dino', img:'Tyrannosaurus/Tyrannosaurus_normal_1.png',
      q:'このきょうりゅうは なにを たべる？', answer:1, choices:['くさ','おにく','はっぱ','きのみ'] },
    { level:1, type:'emoji_name', category:'dino', img:'Brachiosaurus/Brachiosaurus_normal_1.png',
      q:'このきょうりゅうの くびは？', answer:0, choices:['ながい','みじかい','ない','まるい'] },
    { level:1, type:'emoji_name', category:'dino', img:'Tyrannosaurus/Tyrannosaurus_normal_1.png',
      q:'このきょうりゅうの とくちょうは？', answer:1, choices:['くびが ながい','するどい きばが ある','はねが ある','ツノが ある'] },
    { level:1, type:'emoji_name', category:'dino', img:'Stegosaurus/Stegosaurus_normal_1.png',
      q:'きょうりゅうは いまも いきている？', answer:1, choices:['いる','いない','うみにいる','そらにいる'] },
    { level:1, type:'emoji_name', category:'dino', img:'Tyrannosaurus/Tyrannosaurus_normal_1.png',
      q:'このきょうりゅうは おおきい？ ちいさい？', answer:0, choices:['とても おおきい','ねこより ちいさい','にんげんと おなじ','ねずみより ちいさい'] },
    { level:1, type:'emoji_name', category:'dino', img:'Raptor/Raptor_normal_1.png',
      q:'このきょうりゅうに にている いきものは？', answer:2, choices:['いぬ','ねこ','トカゲや ワニ','さかな'] },
    { level:1, type:'emoji_name', category:'dino', img:'Plesiosaur/Plesiosaur_normal_1.png',
      q:'きょうりゅうは むかしの いきもの？ いまの いきもの？', answer:0, choices:['むかしの いきもの','いまの いきもの','どちらも','わからない'] },

    // Level 2: 名前当て（画像で出題）
    { level:2, type:'emoji_name', category:'dino', img:'Triceratops/Triceratops_normal_1.png', hint:'あたまに ツノが 3ぼん！',
      q:'この きょうりゅうは？', answer:2, choices:['ティラノサウルス','ブラキオサウルス','トリケラトプス','ステゴサウルス'] },
    { level:2, type:'emoji_name', category:'dino', img:'Stegosaurus/Stegosaurus_normal_1.png', hint:'せなかに たてがみ みたいな ほね！',
      q:'この きょうりゅうは？', answer:3, choices:['ブラキオサウルス','トリケラトプス','プテラノドン','ステゴサウルス'] },
    { level:2, type:'emoji_name', category:'dino', img:'Brachiosaurus/Brachiosaurus_normal_1.png', hint:'くびが とても とても ながい！',
      q:'この きょうりゅうは？', answer:1, choices:['ティラノサウルス','ブラキオサウルス','トリケラトプス','ステゴサウルス'] },
    { level:2, type:'emoji_name', category:'dino', img:'Pteranodon/Pteranodon_normal_1.png', hint:'そらを とんでいた！はねが ある！',
      q:'この きょうりゅうは？', answer:1, choices:['ティラノサウルス','プテラノドン','トリケラトプス','ブラキオサウルス'] },
    { level:2, type:'emoji_name', category:'dino', img:'Plesiosaur/Plesiosaur_normal_1.png', hint:'うみのなかを およいでいた！くびが ながい！',
      q:'この きょうりゅうは？', answer:2, choices:['ブラキオサウルス','ステゴサウルス','プレシオサウルス','ティラノサウルス'] },
    { level:2, type:'emoji_name', category:'dino', img:'Spinosaurus/Spinosaurus_normal_1.png', hint:'せなかに ほね（ひれ）がある！',
      q:'この きょうりゅうは？', answer:0, choices:['スピノサウルス','ティラノサウルス','アロサウルス','ブラキオサウルス'] },
    { level:2, type:'emoji_name', category:'dino', img:'Raptor/Raptor_normal_1.png', hint:'すばやく はしった にあしの きょうりゅう！',
      q:'この きょうりゅうは？', answer:3, choices:['ブラキオサウルス','トリケラトプス','スピノサウルス','ヴェロキラプトル'] },
    { level:2, type:'emoji_name', category:'dino', img:'Ankylosaurus/Ankylosaurus_normal_1.png', hint:'こうらの ような よろいで からだを まもる！',
      q:'この きょうりゅうは？', answer:2, choices:['トリケラトプス','ステゴサウルス','アンキロサウルス','ブラキオサウルス'] },

    // Level 3: 豆知識・trivia
    { level:3, type:'trivia', category:'dino',
      q:'そらを とべる きょうりゅうに にた いきものは？',
      hint:'プテラノドンは とぶ きょうりゅうの なかま！',
      answer:0, choices:['とり','さかな','うし','いぬ'] },
    { level:3, type:'emoji_name', category:'dino', img:'Tyrannosaurus/Tyrannosaurus_normal_1.png', hint:'かみつく ちからが いちばん つよい！',
      q:'この きょうりゅうは？', answer:0, choices:['ティラノサウルス','トリケラトプス','スピノサウルス','ブラキオサウルス'] },
    { level:3, type:'trivia', category:'dino',
      q:'きょうりゅうが ぜつめつ したのは なぜ？',
      answer:1, choices:['にんげんに たおされた','おおきな いんせきが ぶつかった','みずに しずんだ','きが なくなった'] },
    { level:3, type:'trivia', category:'dino',
      q:'ティラノサウルスの うでは？',
      hint:'からだが おおきい わりに うでは…',
      answer:0, choices:['とても みじかい','とても ながい','なかった','むしと おなじくらい'] },
    { level:3, type:'trivia', category:'dino',
      q:'きょうりゅうの なかまが いまも いきている？',
      hint:'ある いきものが きょうりゅうの しそん！',
      answer:1, choices:['いない','とりが きょうりゅうの なかま','さかなが なかま','ワニが なかま'] },
    { level:3, type:'trivia', category:'dino',
      q:'トリケラトプスの ツノは なんぼん？',
      answer:2, choices:['1ぽん','2ほん','3ぼん','4ほん'] },
    { level:3, type:'trivia', category:'dino',
      q:'かせきとは なに？',
      answer:0, choices:['むかしの いきものの ほねや あとが いしに なったもの','むかしの きのみ','むかしの みず','むかしの くも'] },
    { level:3, type:'trivia', category:'dino',
      q:'スピノサウルスの せなかの ほねは なんの ため？',
      hint:'たいおんの ちょうせつに やくだった！',
      answer:0, choices:['たいおんを ちょうせつする','とびやすくする','てきを おどかす','およぎやすくする'] }
  ],

  // ── てんき ────────────────────────────────────────
  weather: [
    // Level 1
    { level:1, type:'emoji_name', category:'weather', img:'Sun/Sun_normal_1.png', q:'この てんきは？', answer:0, choices:['はれ','くもり','あめ','ゆき'] },
    { level:1, type:'emoji_name', category:'weather', img:'Rain/Rain_normal_1.png', q:'この てんきは？', answer:2, choices:['はれ','くもり','あめ','ゆき'] },
    { level:1, type:'emoji_name', category:'weather', img:'Rainbow/Rainbow_normal_1.png', q:'これは なに？', answer:2, choices:['かみなり','くもり','にじ','あめ'] },
    { level:1, type:'emoji_name', category:'weather', img:'Thunder/Thunder_normal_1.png', q:'これは なに？', answer:0, choices:['かみなり','はれ','くもり','にじ'] },
    { level:1, type:'emoji_name', category:'weather', img:'Snow/Snow_normal_1.png', q:'この てんきは？', answer:2, choices:['はれ','あめ','ゆき','くもり'] },
    { level:1, type:'emoji_name', category:'weather', img:'Cloud/Cloud_normal_1.png', q:'この てんきは？', answer:1, choices:['はれ','くもり','あめ','ゆき'] },
    { level:1, type:'emoji_name', category:'weather', img:'Wind/Wind_normal_1.png', q:'これは なに？', answer:2, choices:['あめ','あらし','かぜ','ゆき'] },

    // Level 2
    { level:2, type:'emoji_name', category:'weather', img:'Cloud/Cloud_normal_1.png', q:'この てんきは？', answer:1, choices:['はれ','くもり','あめ','かぜ'] },
    { level:2, type:'trivia', category:'weather', q:'あさ、しろい もやが でる てんきを なんという？', answer:1, choices:['あめ','きり','ゆき','くもり'] },
    { level:2, type:'emoji_name', category:'weather', img:'Tornado/Tornado_normal_1.png', q:'これは なに？', answer:0, choices:['たつまき','おおかぜ','かみなり','あらし'] },
    { level:2, type:'emoji_name', category:'weather', img:'Hurricane/Hurricane_normal_1.png', q:'これは なに？', answer:2, choices:['こうずい','たつまき','たいふう','なみ'] },
    { level:2, type:'trivia', category:'weather',
      q:'にじは なんしょく？',
      answer:1, choices:['5しょく','7しょく','3しょく','10しょく'] },
    { level:2, type:'trivia', category:'weather',
      q:'ゆきの けっしょうは どんな かたち？',
      answer:1, choices:['まる','ろっかっけい（むつの かど）','しかく','さんかく'] },
    { level:2, type:'trivia', category:'weather',
      q:'かみなりは なぜ なる？',
      answer:0, choices:['くもの なかで でんきが たまるから','かみなりさまが たいこを たたくから','かわが かわくから','かぜが つよいから'] },
    { level:2, type:'trivia', category:'weather',
      q:'あめは もとは どこの みず？',
      answer:0, choices:['うみや かわの みず','くもの みず','やまの みず','じめんの みず'] },

    // Level 3
    { level:3, type:'trivia', category:'weather',
      q:'たいふうの かぜは どちらに まわっている？（にほん）',
      hint:'ひだりまわり か みぎまわり？',
      answer:0, choices:['ひだりまわり（はんとけいまわり）','みぎまわり','まわらない','バラバラ'] },
    { level:3, type:'trivia', category:'weather',
      q:'にじは いつ でる？',
      answer:1, choices:['あめの まえ','あめの あと はれたとき','くもりのとき','ゆきのとき'] },
    { level:3, type:'trivia', category:'weather',
      q:'かみなりは たかい ものに よく おちる。どうして？',
      hint:'くもから いちばん ちかい ところへ！',
      answer:1, choices:['ひくい ものが すき','たかい ものが いちばん ちかいから','まるい ものが すき','かたい ものが すき'] },
    { level:3, type:'trivia', category:'weather',
      q:'「あられ」と「ひょう」の ちがいは？',
      answer:1, choices:['いろ','おおきさ','かたち','おもさ'] },
    { level:3, type:'trivia', category:'weather',
      q:'きりは どんな てんきに できやすい？',
      answer:2, choices:['あつい ひる','かぜが つよい とき','あさや よるの すずしいとき','たいふうのとき'] },
    { level:3, type:'emoji_name', category:'weather', emoji:'🌡️',
      q:'これは なに？', answer:0, choices:['おんどけい','かぜけい','あめけい','ゆきけい'] },
    { level:3, type:'trivia', category:'weather',
      q:'ゆきが たくさん ふる ちほうを なんという？',
      answer:0, choices:['ゆきぐに','ゆきやま','ふゆのくに','こおりのくに'] },
    { level:3, type:'trivia', category:'weather',
      q:'1ねんで いちばん あつい きせつは？',
      answer:1, choices:['はる','なつ','あき','ふゆ'] }
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
    { level:2, type:'opposite', category:'opposite', word:'かたい',   q:'「かたい」の はんたいは？',   answer:1, choices:['かるい','やわらかい','やさしい','やすい'] },
    { level:2, type:'opposite', category:'opposite', word:'つよい',   q:'「つよい」の はんたいは？',   answer:0, choices:['よわい','おもい','ちいさい','おそい'] },
    { level:2, type:'opposite', category:'opposite', word:'あたらしい', q:'「あたらしい」の はんたいは？', answer:2, choices:['やすい','おもい','ふるい','かるい'] },
    { level:2, type:'opposite', category:'opposite', word:'おおい',   q:'「おおい」の はんたいは？',   answer:1, choices:['おおきい','すくない','ちいさい','よわい'] },

    // Level 3
    { level:3, type:'opposite', category:'opposite', word:'かるい',   q:'「かるい」の はんたいは？',   answer:2, choices:['やさしい','ふるい','おもい','ちいさい'] },
    { level:3, type:'opposite', category:'opposite', word:'あかるい', q:'「あかるい」の はんたいは？', answer:0, choices:['くらい','やさしい','きつい','ちいさい'] },
    { level:3, type:'opposite', category:'opposite', word:'うえ',     q:'「うえ」の はんたいは？',     answer:3, choices:['みぎ','まえ','ひだり','した'] },
    { level:3, type:'opposite', category:'opposite', word:'なく',     q:'「なく」の はんたいは？',     answer:2, choices:['えがく','おこる','わらう','ねる'] },
    { level:3, type:'opposite', category:'opposite', word:'たすける', q:'「たすける」の はんたいは？', answer:0, choices:['じゃまをする','たたかう','あそぶ','やすむ'] },
    { level:3, type:'opposite', category:'opposite', word:'でかける', q:'「でかける」の はんたいは？', answer:3, choices:['あそぶ','たべる','ねる','かえる'] },
    { level:3, type:'opposite', category:'opposite', word:'ほめる',   q:'「ほめる」の はんたいは？',   answer:0, choices:['しかる','おこる','いう','にらむ'] },
    { level:3, type:'opposite', category:'opposite', word:'おしえる', q:'「おしえる」の はんたいは？', answer:2, choices:['はなす','きく','ならう','よむ'] }
  ],

  // ── どうぶつ ──────────────────────────────────────
  animal: [
    // Level 1
    { level:1, type:'emoji_name', category:'animal', img:'Dog/Dog_normal_1.png', q:'これは なに？', answer:0, choices:['いぬ','ねこ','うさぎ','くま'] },
    { level:1, type:'emoji_name', category:'animal', img:'Cat/Cat_normal_1.png', q:'これは なに？', answer:1, choices:['いぬ','ねこ','うさぎ','くま'] },
    { level:1, type:'emoji_name', category:'animal', img:'Elephant/Elephant_normal_1.png', q:'これは なに？', answer:2, choices:['きりん','ライオン','ぞう','パンダ'] },
    { level:1, type:'emoji_name', category:'animal', img:'Panda/Panda_normal_1.png', q:'これは なに？', answer:0, choices:['パンダ','くま','ねこ','たぬき'] },
    { level:1, type:'emoji_name', category:'animal', img:'Rabbit/Rabbit_normal_1.png', q:'これは なに？', answer:2, choices:['いぬ','ねこ','うさぎ','くま'] },
    { level:1, type:'emoji_name', category:'animal', img:'Hamster/Hamster_normal_1.png', q:'これは なに？', answer:2, choices:['ねこ','リス','ハムスター','うさぎ'] },
    { level:1, type:'emoji_name', category:'animal', img:'Bear/Bear_normal_1.png', q:'これは なに？', answer:1, choices:['パンダ','くま','たぬき','いのしし'] },
    { level:1, type:'emoji_name', category:'animal', img:'Cow/Cow_normal_1.png', q:'これは なに？', answer:1, choices:['うま','うし','ひつじ','ぶた'] },

    // Level 2
    { level:2, type:'emoji_name', category:'animal', img:'Lion/Lion_normal_1.png', q:'これは なに？', answer:1, choices:['とら','ライオン','ひょう','チーター'] },
    { level:2, type:'emoji_name', category:'animal', img:'Giraffe/Giraffe_normal_1.png', q:'これは なに？', answer:2, choices:['うま','シマウマ','きりん','らくだ'] },
    { level:2, type:'emoji_name', category:'animal', img:'Frog/Frog_normal_1.png', q:'これは なに？', answer:0, choices:['かえる','トカゲ','かめ','ヘビ'] },
    { level:2, type:'emoji_name', category:'animal', img:'Tiger/Tiger_normal_1.png', q:'これは なに？', answer:3, choices:['ライオン','チーター','ひょう','とら'] },
    { level:2, type:'emoji_name', category:'animal', img:'Wolf/Wolf_normal_1.png', q:'これは なに？', answer:2, choices:['いぬ','キツネ','おおかみ','タヌキ'] },
    { level:2, type:'emoji_name', category:'animal', img:'Fox/Fox_normal_1.png', q:'これは なに？', answer:1, choices:['いぬ','キツネ','タヌキ','おおかみ'] },
    { level:2, type:'emoji_name', category:'animal', img:'Zebra/Zebra_normal_1.png', q:'これは なに？', answer:1, choices:['ロバ','シマウマ','らくだ','きりん'] },
    { level:2, type:'emoji_name', category:'animal', img:'Rhino/Rhino_normal_1.png', q:'これは なに？', answer:2, choices:['ゾウ','カバ','サイ','スイギュウ'] },

    // Level 3: 豆知識型
    { level:3, type:'trivia', category:'animal',
      q:'たまごを うむ ほにゅうるいは？',
      hint:'オーストラリアに すむ ふしぎな どうぶつ！',
      answer:1, choices:['コウモリ','カモノハシ','アルマジロ','センザンコウ'] },
    { level:3, type:'trivia', category:'animal',
      q:'コウモリは くらい ばしょで どうやって とぶ？',
      hint:'こえを だして かえってくる おとで しょうがいを さける！',
      answer:2, choices:['においで わかる','めで みえる','こえを つかう','かぜで わかる'] },
    { level:3, type:'trivia', category:'animal',
      q:'カンガルーの あかちゃんは どこで そだつ？',
      answer:0, choices:['おかあさんの おなかの ふくろ','きの うろ','じめんの あな','おかあさんの せなか'] },
    { level:3, type:'trivia', category:'animal',
      q:'ナマケモノは 1日に なんじかん くらい ねる？',
      hint:'とても よく ねる どうぶつ！',
      answer:2, choices:['8じかん','12じかん','20じかんくらい','2じかん'] },
    { level:3, type:'trivia', category:'animal',
      q:'ゾウの はなは なんのため？',
      answer:1, choices:['においを かぐだけ','みずを のんだり ものを つかんだり','なかまを よぶ','はしりやすくする'] },
    { level:3, type:'trivia', category:'animal',
      q:'ライオンで かりを するのは？',
      answer:1, choices:['オスの ライオン','メスの ライオン','こどもの ライオン','りょうほう'] },
    { level:3, type:'trivia', category:'animal',
      q:'ゴリラの いちばん ちかい なかまは？',
      hint:'ゴリラの DNAは にんげんと 98% おなじ！',
      answer:2, choices:['いぬ','ねこ','にんげん','くま'] },
    { level:3, type:'trivia', category:'animal',
      q:'キリンの したは なにいろ？',
      hint:'くろっぽい むらさき いろ！',
      answer:2, choices:['あかい','ピンク','むらさき','みどり'] }
  ],

  // ── むし ──────────────────────────────────────────
  insect: [
    // Level 1
    { level:1, type:'emoji_name', category:'insect', img:'Butterfly/Butterfly_normal_1.png', q:'これは なに？', answer:0, choices:['ちょうちょ','トンボ','はち','かぶとむし'] },
    { level:1, type:'emoji_name', category:'insect', img:'Ladybird/Ladybird_normal_1.png', q:'これは なに？', answer:2, choices:['はち','あり','てんとうむし','かぶとむし'] },
    { level:1, type:'emoji_name', category:'insect', img:'Garden_snail/Garden_snail_normal_1.png', q:'これは なに？', answer:0, choices:['かたつむり','ナメクジ','ダンゴムシ','あり'] },
    { level:1, type:'emoji_name', category:'insect', img:'Caterpillar/Caterpillar_normal_1.png', q:'これは なに？', answer:1, choices:['てんとうむし','いもむし','はち','あり'] },
    { level:1, type:'emoji_name', category:'insect', img:'Ant/Ant_normal_1.png', q:'これは なに？', answer:1, choices:['はち','あり','ちょうちょ','かぶとむし'] },
    { level:1, type:'emoji_name', category:'insect', img:'Mosquito/Mosquito_normal_1.png', q:'これは なに？', answer:2, choices:['はち','てんとうむし','か','あり'] },
    { level:1, type:'emoji_name', category:'insect', img:'Bee/Bee_normal_1.png', q:'これは なに？', answer:0, choices:['はち','あり','ちょうちょ','かぶとむし'] },
    { level:1, type:'emoji_name', category:'insect', img:'Grasshopper/Grasshopper_normal_1.png', q:'これは なに？', answer:1, choices:['バッタ','コオロギ','セミ','カマキリ'] },

    // Level 2
    { level:2, type:'emoji_name', category:'insect', img:'Bee/Bee_normal_1.png', q:'これは なに？', answer:1, choices:['あり','はち','ちょうちょ','かぶとむし'] },
    { level:2, type:'emoji_name', category:'insect', img:'Rhinoceros_beetle/Rhinoceros_beetle_normal_1.png', q:'これは なに？', answer:0, choices:['かぶとむし','クワガタ','ダンゴムシ','あり'] },
    { level:2, type:'emoji_name', category:'insect', img:'Ant/Ant_normal_1.png', q:'これは なに？', answer:3, choices:['はち','ちょうちょ','セミ','あり'] },
    { level:2, type:'emoji_name', category:'insect', img:'Grasshopper/Grasshopper_normal_1.png', q:'これは なに？', answer:0, choices:['コオロギ','バッタ','セミ','カマキリ'] },
    { level:2, type:'emoji_name', category:'insect', img:'Arachnid/Arachnid_normal_1.png', q:'これは なに？', answer:1, choices:['あり','クモ','ハチ','てんとうむし'] },
    { level:2, type:'trivia', category:'insect',
      q:'セミが なくのは オス？ メス？',
      answer:0, choices:['オス','メス','りょうほう','なかない'] },
    { level:2, type:'trivia', category:'insect',
      q:'ちょうちょに なるまえの すがたは？',
      answer:1, choices:['さなぎだけ','たまご → いもむし → さなぎ → ちょうちょ','いきなり ちょうちょ','うまれた ときから ちょうちょ'] },
    { level:2, type:'trivia', category:'insect',
      q:'カブトムシの ツノが あるのは？',
      answer:0, choices:['オスだけ','メスだけ','りょうほう','どちらにも ない'] },

    // Level 3: 豆知識型
    { level:3, type:'trivia', category:'insect',
      q:'セミは じめんの なかで どのくらい すごす？',
      hint:'おとなに なるまで とても ながい！',
      answer:1, choices:['1ねん','すうねん（7ねんくらい）','1かげつ','3かげつ'] },
    { level:3, type:'trivia', category:'insect',
      q:'カマキリは なにを たべる？',
      answer:0, choices:['ほかの むし','はっぱ','みつ','きのみ'] },
    { level:3, type:'trivia', category:'insect',
      q:'トンボの めは どのくらい みえる？',
      hint:'ほぼ まるごと まわりが みえちゃう！',
      answer:2, choices:['まえだけ みえる','うしろだけ みえる','ぐるっと まわり ぜんぶ みえる','まえと うしろだけ'] },
    { level:3, type:'trivia', category:'insect',
      q:'ホタルは なぜ ひかる？',
      hint:'からだの なかで かがくはんのうが おきる！',
      answer:0, choices:['からだの なかの かがくはんのうで ひかる','でんちを もっている','おひさまの あかりを ためる','まほうで ひかる'] },
    { level:3, type:'trivia', category:'insect',
      q:'ちょうちょの くちは どんなかたち？',
      answer:0, choices:['ストローのように まるまっている','きばが ある','とがっている','くちが ない'] },
    { level:3, type:'trivia', category:'insect',
      q:'アリの むれには なにが いる？',
      answer:0, choices:['じょおうアリが いて たまごを うむ','みんな おなじ アリ','リーダーが いない','おとなの アリだけ'] },
    { level:3, type:'trivia', category:'insect',
      q:'モンシロチョウの たまごは どこに うむ？',
      answer:0, choices:['キャベツなどの はっぱの うら','じめんの なか','はなの なか','みずの なか'] },
    { level:3, type:'trivia', category:'insect',
      q:'クモは むしの なかま？',
      hint:'あしの かずを かぞえてみよう！むしは 6ぽん、クモは…？',
      answer:1, choices:['むしの なかま','ちがう！クモは クモのなかま（くもがた）','さかなの なかま','は虫類の なかま'] }
  ],

  // ── トリビア（ふつう/むずかしい） ────────────────
  trivia: [
    // Level 2
    { level:2, type:'trivia', category:'trivia',
      q:'そらを とべない とりは どれ？',
      answer:1, choices:['タカ','ペンギン','ハト','ツバメ'] },
    { level:2, type:'trivia', category:'trivia',
      q:'タコの あしは なんぼん？',
      answer:1, choices:['6ぼん','8ぼん','10ぼん','4ぼん'] },
    { level:2, type:'trivia', category:'trivia',
      q:'せかいで いちばん はやい りくの どうぶつは？',
      answer:2, choices:['ライオン','シマウマ','チーター','キリン'] },
    { level:2, type:'trivia', category:'trivia',
      q:'にほんで いちばん たかい やまは？',
      answer:1, choices:['のりくらさん','ふじさん','きりしまやま','こうやさん'] },
    { level:2, type:'trivia', category:'trivia',
      q:'ふゆに ねむる（とうみん）どうぶつは どれ？',
      answer:2, choices:['ゾウ','ライオン','クマ','キリン'] },
    { level:2, type:'trivia', category:'trivia',
      q:'カメは どのくらい いきる？',
      answer:2, choices:['10ねんくらい','50ねんくらい','100ねんいじょう','3ねんくらい'] },
    { level:2, type:'trivia', category:'trivia',
      q:'あめが ふると つちから でてくる いきものは？',
      answer:1, choices:['チョウチョ','ミミズ','カブトムシ','セミ'] },
    { level:2, type:'trivia', category:'trivia',
      q:'コアラが たべるものは？',
      answer:2, choices:['バナナ','たけのこ','ユーカリの は','りんご'] },

    // Level 3
    { level:3, type:'trivia', category:'trivia',
      q:'せかいで いちばん おおきい さかなは？',
      hint:'クジラは さかなじゃなくて ほにゅうるい！',
      answer:2, choices:['マグロ','クジラ','ジンベイザメ','サメ'] },
    { level:3, type:'trivia', category:'trivia',
      q:'タコの しんぞうは いくつ ある？',
      answer:2, choices:['1つ','2つ','3つ','4つ'] },
    { level:3, type:'trivia', category:'trivia',
      q:'ハチは なかまに はなの ばしょを どうやって おしえる？',
      answer:1, choices:['なく','ダンスをする','においを つける','とんで みせる'] },
    { level:3, type:'trivia', category:'trivia',
      q:'イルカは なにの なかま？',
      hint:'さかなに みえるけど ほにゅうるいだよ！',
      answer:2, choices:['さかな','サメ','クジラ','タコ'] },
    { level:3, type:'trivia', category:'trivia',
      q:'ハヤブサは どんな とりに いちばん ちかい？',
      hint:'さいきんの けんきゅうで わかった びっくりな こと！',
      answer:2, choices:['ワシ・タカ','フクロウ','スズメ・インコ','ペンギン'] },
    { level:3, type:'trivia', category:'trivia',
      q:'ちきゅうで いちばん おおきい いきものは？',
      answer:2, choices:['ゾウ','ジンベイザメ','シロナガスクジラ','ダイオウイカ'] },
    { level:3, type:'trivia', category:'trivia',
      q:'タコや イカの ちの いろは？',
      hint:'にんげんの ちは あかいけど タコの ちは ちがうよ！',
      answer:0, choices:['あおい','あかい','みどり','しろい'] },
    { level:3, type:'trivia', category:'trivia',
      q:'めが 8つある いきものは？',
      hint:'あしも 8ぽん あるよ！むしじゃないよ！',
      answer:1, choices:['カブトムシ','クモ','チョウチョ','バッタ'] },
    { level:3, type:'trivia', category:'trivia',
      q:'キリンが 1日に ねむる じかんは？',
      hint:'とても みじかいよ！',
      answer:0, choices:['2じかんくらい','8じかんくらい','5じかんくらい','12じかんくらい'] },
    { level:3, type:'trivia', category:'trivia',
      q:'バナナは きの うえに なる？ つちの なかに なる？',
      answer:0, choices:['きの うえ','つちの なか','うみの なか','そらから ふる'] }
  ],

  // ── からだのぶぶん ────────────────────────────────
  body: [
    // Level 1
    { level:1, type:'emoji_name', category:'body', img:'Eyes/Eyes_normal_1.png', q:'これは からだの どこ？', answer:1, choices:['はな','め','くち','みみ'] },
    { level:1, type:'emoji_name', category:'body', img:'Mouth_part/Mouth_part_normal_1.png', q:'これは からだの どこ？', answer:2, choices:['め','みみ','くち','はな'] },
    { level:1, type:'emoji_name', category:'body', img:'Palm/Palm_normal_1.png', q:'これは からだの どこ？', answer:2, choices:['あし','かた','て','うで'] },
    { level:1, type:'emoji_name', category:'body', img:'Foot_part/Foot_part_normal_1.png', q:'これは からだの どこ？', answer:0, choices:['あし','て','かた','おなか'] },
    { level:1, type:'emoji_name', category:'body', img:'Forearm/Forearm_normal_1.png', q:'これは からだの どこ？', answer:3, choices:['て','あし','かた','うで'] },
    { level:1, type:'trivia', category:'body',
      q:'においを かぐのは からだの どこ？', answer:0, choices:['はな','くち','め','ほほ'] },
    { level:1, type:'trivia', category:'body',
      q:'ものを みるのは からだの どこ？', answer:1, choices:['くち','め','ほほ','ひたい'] },
    { level:1, type:'trivia', category:'body',
      q:'ものを きくのは からだの どこ？', answer:2, choices:['め','くち','みみ','はな'] },

    // Level 2
    { level:2, type:'emoji_name', category:'body', img:'Nose_part/Nose_part_normal_1.png', q:'これは からだの どこ？', answer:0, choices:['はな','くち','め','ほほ'] },
    { level:2, type:'emoji_name', category:'body', img:'Palm/Palm_normal_1.png', q:'これは からだの どこ？', answer:3, choices:['あし','おなか','かた','て'] },
    { level:2, type:'emoji_name', category:'body', img:'Teeth/Teeth_normal_1.png', q:'これは からだの なに？', answer:1, choices:['くちびる','は','した','くち'] },
    { level:2, type:'emoji_name', category:'body', emoji:'👅', q:'これは からだの なに？', answer:1, choices:['くちびる','した','は','くち'] },
    { level:2, type:'trivia', category:'body',
      q:'からだで いちばん おおきい きかんは？',
      hint:'からだの そとを おおっている！',
      answer:1, choices:['のう','ひふ','しんぞう','い'] },
    { level:2, type:'trivia', category:'body',
      q:'からだで いちばん かたい ぶぶんは？',
      answer:2, choices:['ほね','つめ','は（エナメルしつ）','かみのけ'] },
    { level:2, type:'trivia', category:'body',
      q:'ちを からだじゅうに おくる ぽんぷは？',
      answer:0, choices:['しんぞう','のう','ひふ','い'] },
    { level:2, type:'trivia', category:'body',
      q:'かたての ゆびは なんぼん？',
      answer:1, choices:['4ほん','5ほん','6ほん','3ほん'] },

    // Level 3
    { level:3, type:'emoji_name', category:'body', emoji:'🦵', q:'これは からだの どこ？', answer:1, choices:['うで','あし','おなか','せなか'] },
    { level:3, type:'emoji_name', category:'body', img:'Ear_part/Ear_part_normal_1.png', q:'これは からだの どこ？', answer:2, choices:['め','はな','みみ','くち'] },
    { level:3, type:'trivia', category:'body',
      q:'にんげんの ほねは ぜんぶで なんぼん？',
      answer:1, choices:['100ほん','206ほん','300ほん','50ほん'] },
    { level:3, type:'trivia', category:'body',
      q:'あかちゃんの ほねは おとなより おおい？ すくない？',
      hint:'あかちゃんの ほねは あとで くっついて へっていく！',
      answer:0, choices:['おおい（300ほんくらい）','すくない','おなじ','わからない'] },
    { level:3, type:'trivia', category:'body',
      q:'さむいとき からだが ふるえるのは なぜ？',
      answer:0, choices:['からだを あたためるため','こわいから','おなかが すいたから','ねむいから'] },
    { level:3, type:'trivia', category:'body',
      q:'にんげんの からだで いちばん おもい きかんは？',
      hint:'500グラムくらい ある！',
      answer:1, choices:['しんぞう','かんぞう（きも）','のう','い'] },
    { level:3, type:'trivia', category:'body',
      q:'ゆびのさきの もようを なんという？',
      answer:0, choices:['しもん','もよう','てもん','がら'] },
    { level:3, type:'trivia', category:'body',
      q:'にんげんは 1日に なんかい くらい まばたきする？',
      hint:'けっこう おおいよ！',
      answer:2, choices:['100かい','5000かい','15000かいくらい','50まんかい'] }
  ]
};

// ── カテゴリーメタデータ ──────────────────────────
const QUIZLAND_CATEGORIES = {
  order_color: { label: 'いろのじゅんばん', emoji: '🎨' },
  count_total:  { label: 'かずをかぞえよう', emoji: '🔢' },
  shape_name:   { label: 'かたち',           emoji: '⬛' },
  food:         { label: 'たべもの',         emoji: '🍎' },
  vehicle:      { label: 'のりもの',         emoji: '🚗' },
  dino:         { label: 'きょうりゅう',     emoji: '🦕' },
  animal:       { label: 'どうぶつ',         emoji: '🐘' },
  insect:       { label: 'むし',             emoji: '🦋' },
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
