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
    { level:1, type:'order_color', items:['red','blue','yellow'],
      q:'まんなかは なにいろ？', answer:1, choices:['red','blue','yellow','green'] },
    { level:1, type:'order_color', items:['green','red','yellow'],
      q:'ひだりから 1ばんめは なにいろ？', answer:3, choices:['red','yellow','blue','green'] },
    { level:2, type:'order_color', items:['red','blue','yellow','green'],
      q:'ひだりから 3ばんめは なにいろ？', answer:1, choices:['red','yellow','blue','green'] },
    { level:2, type:'order_color', items:['pink','blue','orange','yellow'],
      q:'みぎから 1ばんめは なにいろ？', answer:2, choices:['pink','blue','yellow','orange'] },
    { level:3, type:'order_color', items:['purple','red','green','blue','yellow'],
      q:'まんなかは なにいろ？', answer:2, choices:['red','blue','green','yellow'] }
  ],

  // ── 数をかぞえよう ────────────────────────────────
  count_total: [
    { level:1, type:'count_total', item:'ringo',  count:2, q:'りんごは いくつ？',     answer:0, choices:[2,3,4,5] },
    { level:1, type:'count_total', item:'ichigo', count:3, q:'いちごは いくつ？',     answer:1, choices:[2,3,4,5] },
    { level:2, type:'count_total', item:'hoshi',  count:4, q:'おほしさまは いくつ？', answer:1, choices:[3,4,5,6] },
    { level:2, type:'count_total', item:'hana',   count:5, q:'おはなは いくつ？',     answer:2, choices:[3,4,5,6] },
    { level:3, type:'count_total', item:'mikan',  count:7, q:'みかんは いくつ？',     answer:1, choices:[6,7,8,9] }
  ],

  // ── かたち ────────────────────────────────────────
  shape_name: [
    { level:1, type:'shape_name', shape:'circle',   q:'これは どんな かたち？', answer:0, choices:['まる','しかく','さんかく','ほし'] },
    { level:1, type:'shape_name', shape:'square',   q:'これは どんな かたち？', answer:1, choices:['まる','しかく','さんかく','ほし'] },
    { level:1, type:'shape_name', shape:'triangle', q:'これは どんな かたち？', answer:2, choices:['まる','しかく','さんかく','ほし'] },
    { level:2, type:'shape_name', shape:'star',     q:'これは どんな かたち？', answer:3, choices:['まる','しかく','さんかく','ほし'] },
    { level:2, type:'shape_name', shape:'heart',    q:'これは どんな かたち？', answer:1, choices:['ほし','はーと','さんかく','まる'] }
  ],

  // ── たべもの ──────────────────────────────────────
  food: [
    { level:1, type:'emoji_name', category:'food', emoji:'🍎', q:'これは なに？', answer:0, choices:['りんご','バナナ','みかん','いちご'] },
    { level:1, type:'emoji_name', category:'food', emoji:'🍌', q:'これは なに？', answer:2, choices:['りんご','いちご','バナナ','ぶどう'] },
    { level:1, type:'emoji_name', category:'food', emoji:'🍓', q:'これは なに？', answer:1, choices:['バナナ','いちご','みかん','りんご'] },
    { level:2, type:'emoji_name', category:'food', emoji:'🍊', q:'これは なに？', answer:2, choices:['いちご','ぶどう','みかん','りんご'] },
    { level:2, type:'emoji_name', category:'food', emoji:'🍇', q:'これは なに？', answer:0, choices:['ぶどう','バナナ','みかん','もも'] },
    { level:2, type:'emoji_name', category:'food', emoji:'🍉', q:'これは なに？', answer:1, choices:['メロン','すいか','もも','バナナ'] },
    { level:3, type:'emoji_name', category:'food', emoji:'🥕', q:'これは なに？', answer:0, choices:['にんじん','だいこん','トマト','かぼちゃ'] },
    { level:3, type:'emoji_name', category:'food', emoji:'🍄', q:'これは なに？', answer:2, choices:['キャベツ','ブロッコリー','きのこ','たまねぎ'] }
  ],

  // ── のりもの ──────────────────────────────────────
  vehicle: [
    { level:1, type:'emoji_name', category:'vehicle', emoji:'🚗', q:'これは なに？', answer:1, choices:['バス','くるま','じてんしゃ','でんしゃ'] },
    { level:1, type:'emoji_name', category:'vehicle', emoji:'🚂', q:'これは なに？', answer:0, choices:['でんしゃ','バス','くるま','ふね'] },
    { level:1, type:'emoji_name', category:'vehicle', emoji:'✈️', q:'これは なに？', answer:2, choices:['ロケット','ヘリコプター','ひこうき','バルーン'] },
    { level:2, type:'emoji_name', category:'vehicle', emoji:'🚌', q:'これは なに？', answer:1, choices:['くるま','バス','でんしゃ','トラック'] },
    { level:2, type:'emoji_name', category:'vehicle', emoji:'🚒', q:'これは なに？', answer:0, choices:['しょうぼうしゃ','パトカー','きゅうきゅうしゃ','トラック'] },
    { level:2, type:'emoji_name', category:'vehicle', emoji:'🚢', q:'これは なに？', answer:2, choices:['ボート','ヨット','ふね','フェリー'] },
    { level:3, type:'emoji_name', category:'vehicle', emoji:'🚀', q:'これは なに？', answer:0, choices:['ロケット','ひこうき','UFO','たこあげ'] },
    { level:3, type:'emoji_name', category:'vehicle', emoji:'🚲', q:'これは なに？', answer:1, choices:['オートバイ','じてんしゃ','キックボード','スクーター'] }
  ],

  // ── きょうりゅう ──────────────────────────────────
  // Level 1: 名前ではなく「特徴を当てる」形式（イラスト完成後に絵選択形式へ移行予定）
  dino: [
    { level:1, type:'emoji_name', category:'dino', emoji:'🦕',
      q:'このきょうりゅうは\nなにを たべる？',
      answer:0, choices:['くさや はっぱ','おにく','さかな','きのみ'] },
    { level:1, type:'emoji_name', category:'dino', emoji:'🦖',
      q:'このきょうりゅうは\nなにを たべる？',
      answer:0, choices:['おにく','くさ','はっぱ','きのみ'] },
    { level:2, type:'emoji_name', category:'dino', emoji:'🦕', hint:'あたまに ツノが 3ぼん！',
      q:'この きょうりゅうは？', answer:2, choices:['ティラノサウルス','ブラキオサウルス','トリケラトプス','ステゴサウルス'] },
    { level:2, type:'emoji_name', category:'dino', emoji:'🦕', hint:'せなかに たてがみみたいな ほね',
      q:'この きょうりゅうは？', answer:3, choices:['ブラキオサウルス','トリケラトプス','プテラノドン','ステゴサウルス'] },
    { level:3, type:'trivia', category:'dino',
      q:'そらを とべる きょうりゅうに にた いきものは？',
      hint:'プテラノドンは とぶ きょうりゅうの なかま！',
      answer:0, choices:['とり','さかな','うし','いぬ'] },
    { level:3, type:'emoji_name', category:'dino', emoji:'🦖', hint:'かみつく ちからが いちばん つよい',
      q:'この きょうりゅうは？', answer:0, choices:['ティラノサウルス','トリケラトプス','スピノサウルス','ブラキオサウルス'] }
  ],

  // ── てんき ────────────────────────────────────────
  // 虹・雷・雪はやさしいに移動
  weather: [
    { level:1, type:'emoji_name', category:'weather', emoji:'☀️', q:'この てんきは？', answer:0, choices:['はれ','くもり','あめ','ゆき'] },
    { level:1, type:'emoji_name', category:'weather', emoji:'🌧️', q:'この てんきは？', answer:2, choices:['はれ','くもり','あめ','ゆき'] },
    { level:1, type:'emoji_name', category:'weather', emoji:'🌈', q:'この てんきは？', answer:2, choices:['かみなり','くもり','にじ','あめ'] },
    { level:1, type:'emoji_name', category:'weather', emoji:'⚡', q:'この てんきは？', answer:0, choices:['かみなり','はれ','くもり','にじ'] },
    { level:1, type:'emoji_name', category:'weather', emoji:'❄️', q:'この てんきは？', answer:2, choices:['はれ','あめ','ゆき','くもり'] },
    { level:2, type:'emoji_name', category:'weather', emoji:'⛅', q:'この てんきは？', answer:1, choices:['はれ','くもり','あめ','かぜ'] }
  ],

  // ── はんたいことば ────────────────────────────────
  opposite: [
    { level:1, type:'opposite', category:'opposite', word:'おおきい', q:'「おおきい」の はんたいは？', answer:2, choices:['あかい','まるい','ちいさい','やさしい'] },
    { level:1, type:'opposite', category:'opposite', word:'あつい',   q:'「あつい」の はんたいは？',   answer:1, choices:['やわらかい','つめたい','はやい','くらい'] },
    { level:2, type:'opposite', category:'opposite', word:'はやい',   q:'「はやい」の はんたいは？',   answer:0, choices:['おそい','かるい','やさしい','あかるい'] },
    { level:2, type:'opposite', category:'opposite', word:'たかい',   q:'「たかい」の はんたいは？',   answer:3, choices:['おもい','かたい','くらい','ひくい'] },
    { level:2, type:'opposite', category:'opposite', word:'ながい',   q:'「ながい」の はんたいは？',   answer:1, choices:['かわいい','みじかい','やわらかい','かるい'] },
    { level:3, type:'opposite', category:'opposite', word:'かるい',   q:'「かるい」の はんたいは？',   answer:2, choices:['やさしい','ふるい','おもい','ちいさい'] },
    { level:3, type:'opposite', category:'opposite', word:'あかるい', q:'「あかるい」の はんたいは？', answer:0, choices:['くらい','やさしい','きつい','ちいさい'] },
    { level:3, type:'opposite', category:'opposite', word:'うえ',     q:'「うえ」の はんたいは？',     answer:3, choices:['みぎ','まえ','ひだり','した'] }
  ],

  // ── どうぶつ（名前当てではなく豆知識型） ──────────
  animal: [
    // Level 1
    { level:1, type:'trivia', category:'animal',
      q:'いちばん くびが ながい どうぶつは？',
      answer:1, choices:['ゾウ','キリン','シマウマ','ライオン'] },
    { level:1, type:'trivia', category:'animal',
      q:'いちばん おおきな りくの どうぶつは？',
      answer:0, choices:['ゾウ','カバ','サイ','キリン'] },
    { level:1, type:'trivia', category:'animal',
      q:'たけを たべる どうぶつは？',
      answer:2, choices:['ライオン','ゾウ','パンダ','キツネ'] },
    { level:1, type:'trivia', category:'animal',
      q:'しろと くろの しまもようの どうぶつは？',
      answer:1, choices:['うま','シマウマ','パンダ','タヌキ'] },
    // Level 2
    { level:2, type:'trivia', category:'animal',
      q:'うまは どうやって ねむる？',
      hint:'ねころばなくても ねむれるよ！',
      answer:0, choices:['たったまま','ねころんで','きに ぶらさがって','うみの なかで'] },
    { level:2, type:'trivia', category:'animal',
      q:'いちばん おそい どうぶつは？',
      answer:2, choices:['カタツムリ','カメ','ナマケモノ','ウシ'] },
    { level:2, type:'trivia', category:'animal',
      q:'カンガルーの あかちゃんは どこで そだつ？',
      answer:1, choices:['すの なか','おなかの ふくろ','きの うえ','あなの なか'] },
    { level:2, type:'trivia', category:'animal',
      q:'きつねの なきごえは？',
      answer:0, choices:['コンコン','ワンワン','ニャー','モー'] },
    // Level 3
    { level:3, type:'trivia', category:'animal',
      q:'たまごを うむ ほにゅうるいは？',
      hint:'オーストラリアに すむ ふしぎな どうぶつ！',
      answer:1, choices:['コウモリ','カモノハシ','アルマジロ','センザンコウ'] },
    { level:3, type:'trivia', category:'animal',
      q:'コウモリは くらい ばしょで どうやって とぶ？',
      hint:'こえを だして かえってくる おとで しょうがいを さける！',
      answer:2, choices:['においで わかる','めで みえる','こえを つかう','かぜで わかる'] }
  ],

  // ── むし（名前当てではなく豆知識型） ──────────────
  insect: [
    // Level 1
    { level:1, type:'trivia', category:'insect',
      q:'みつを あつめる むしは？',
      answer:0, choices:['ハチ','アリ','ちょうちょ','カブトムシ'] },
    { level:1, type:'trivia', category:'insect',
      q:'さなぎに なって へんしんする むしは？',
      answer:1, choices:['アリ','ちょうちょ','バッタ','セミ'] },
    // Level 2
    { level:2, type:'trivia', category:'insect',
      q:'むしの あしは なんぼん？',
      answer:1, choices:['4ぼん','6ぼん','8ぼん','10ぼん'] },
    { level:2, type:'trivia', category:'insect',
      q:'てんとうむしは なぜ あかい？',
      hint:'てきに にげてもらうためだよ！',
      answer:0, choices:['あぶないよと おしえるため','あたたかく するため','おなかが すいたから','たのしいから'] },
    { level:2, type:'trivia', category:'insect',
      q:'じぶんの からだより おもいものを はこべる むしは？',
      answer:2, choices:['ちょうちょ','セミ','アリ','ハチ'] },
    // Level 3
    { level:3, type:'trivia', category:'insect',
      q:'セミは ちめんの なかで どのくらい すごす？',
      hint:'おとなに なるまで とても ながい！',
      answer:1, choices:['1ねん','すうねん（7ねんくらい）','1かげつ','3かげつ'] },
    { level:3, type:'trivia', category:'insect',
      q:'カマキリは なにを たべる？',
      answer:0, choices:['ほかの むし','はっぱ','みつ','きのみ'] },
    { level:3, type:'trivia', category:'insect',
      q:'トンボの めは まわりの どのくらいが みえる？',
      hint:'ほぼ まるごと まわりが みえちゃう！',
      answer:2, choices:['まえだけ','うしろだけ','ほぼ360ど','まえと うしろだけ'] }
  ],

  // ── トリビア（ふつう/むずかしい） ────────────────
  trivia: [
    // ── Level 2: ふつう ─────────────────────────────
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
    // ── Level 3: むずかしい（びっくりトリビア）───────
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
      hint:'にんげんのちは あかいけど タコのちは ちがうよ！',
      answer:0, choices:['あおい','あかい','みどり','しろい'] },
    { level:3, type:'trivia', category:'trivia',
      q:'めが 8つある いきものは？',
      hint:'あしも 8ぽん あるよ！',
      answer:1, choices:['カブトムシ','クモ','チョウチョ','バッタ'] },
    { level:3, type:'trivia', category:'trivia',
      q:'クモは むしの なかま？',
      hint:'むしの あしは 6ぽん、クモの あしは 8ぽん！',
      answer:1, choices:['むしの なかま','ちがう！クモのなかま','さかなの なかま','は虫類の なかま'] },
    { level:3, type:'trivia', category:'trivia',
      q:'キリンが 1日に ねむる じかんは？',
      hint:'とても みじかいよ！',
      answer:0, choices:['2じかんくらい','8じかんくらい','5じかんくらい','12じかんくらい'] },
    { level:3, type:'trivia', category:'trivia',
      q:'バナナは きの うえに なる？つちの なかに なる？',
      answer:0, choices:['きの うえ','つちの なか','うみの なか','そらから ふる'] }
  ],

  // ── からだのぶぶん ────────────────────────────────
  body: [
    { level:1, type:'emoji_name', category:'body', emoji:'👁️', q:'これは からだの どこ？', answer:1, choices:['はな','め','くち','みみ'] },
    { level:1, type:'emoji_name', category:'body', emoji:'👄', q:'これは からだの どこ？', answer:2, choices:['め','みみ','くち','はな'] },
    { level:2, type:'emoji_name', category:'body', emoji:'👃', q:'これは からだの どこ？', answer:0, choices:['はな','くち','め','ほほ'] },
    { level:2, type:'emoji_name', category:'body', emoji:'✋', q:'これは からだの どこ？', answer:3, choices:['あし','おなか','かた','て'] },
    { level:3, type:'emoji_name', category:'body', emoji:'🦵', q:'これは からだの どこ？', answer:1, choices:['うで','あし','おなか','せなか'] },
    { level:3, type:'emoji_name', category:'body', emoji:'👂', q:'これは からだの どこ？', answer:2, choices:['め','はな','みみ','くち'] }
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
