// ─── Fossil Game 恐竜データ ──────────────────────────────
// 14種の恐竜 + クイズ問題（quizland/data/questions.js の dino から集約）
// 画像は ../assets/images/ocean/ 配下の既存恐竜イラストを流用

window.FOSSIL_DATA = [
  {
    id: 'Brachiosaurus', jp: 'ブラキオサウルス', era: 'ジュラき',
    img: '../assets/images/ocean/Brachiosaurus/Brachiosaurus_normal_1.png',
    trivia: 'くびが とても ながくて たかい きの はっぱを たべたよ！',
    questions: [
      { q: 'ブラキオサウルスの くびは？', choices: ['ながい','みじかい','まるい'], answer: 0,
        detail: 'たかい きの はっぱを たべるため くびが ながくなったよ！' },
      { q: 'ブラキオサウルスは なにを たべた？', choices: ['くさや はっぱ','おにく','さかな'], answer: 0,
        detail: 'そうしょくきょうりゅうで くさや はっぱを たくさん たべたよ！' }
    ]
  },
  {
    id: 'Tyrannosaurus', jp: 'ティラノサウルス', era: 'はくあき',
    img: '../assets/images/ocean/Tyrannosaurus/Tyrannosaurus_normal_1.png',
    trivia: 'するどい きばで えものを かみつく さいきょうの にくしょくきょうりゅう！',
    questions: [
      { q: 'ティラノサウルスは なにを たべた？', choices: ['くさ','おにく','はっぱ'], answer: 1,
        detail: 'にくしょくきょうりゅうで ほかの きょうりゅうを たべたよ！' },
      { q: 'ティラノサウルスの うでは？', choices: ['とても みじかい','とても ながい','なかった'], answer: 0,
        detail: 'からだは おおきいのに うでは にんげんの うでくらいだったよ！' }
    ]
  },
  {
    id: 'Triceratops', jp: 'トリケラトプス', era: 'はくあき',
    img: '../assets/images/ocean/Triceratops/Triceratops_normal_1.png',
    trivia: 'あたまに 3ぼんの ツノ！おでこに 2ほん、はなに 1ぽん！',
    questions: [
      { q: 'トリケラトプスの ツノは なんぼん？', choices: ['1ぽん','2ほん','3ぼん'], answer: 2,
        detail: 'おでこに 2ほん、はなに 1ぽんの あわせて 3ぼんだよ！' },
      { q: 'トリケラトプスは なにで たたかった？', choices: ['するどい きば','あたまの ツノ','はね'], answer: 1,
        detail: 'あたまの おおきな ツノで てきと たたかったよ！' }
    ]
  },
  {
    id: 'Stegosaurus', jp: 'ステゴサウルス', era: 'ジュラき',
    img: '../assets/images/ocean/Stegosaurus/Stegosaurus_normal_1.png',
    trivia: 'せなかに プレート（ほね）が ならんだ そうしょくきょうりゅう！',
    questions: [
      { q: 'ステゴサウルスの せなかに あるのは？', choices: ['はね','ツノ','プレート（ほね）'], answer: 2,
        detail: 'せなかの プレートで たいおんを ちょうせつしたと いわれているよ！' },
      { q: 'ステゴサウルスは どうやって たたかった？', choices: ['はねで とぶ','みずを かける','しっぽの トゲ'], answer: 2,
        detail: 'しっぽの さきに するどい トゲが 4ぼん ついていたよ！' }
    ]
  },
  {
    id: 'Pteranodon', jp: 'プテラノドン', era: 'はくあき',
    img: '../assets/images/ocean/Pteranodon/Pteranodon_normal_1.png',
    trivia: 'おおきな はねで そらを とんだ よくりゅう！',
    questions: [
      { q: 'プテラノドンは どこに いた？', choices: ['うみの なか','そら','つちの なか'], answer: 1,
        detail: 'おおきな はねで そらを じゆうに とびまわっていたよ！' },
      { q: 'プテラノドンは なにを たべた？', choices: ['くさ','さかな','きのみ'], answer: 1,
        detail: 'うみの うえを とんで さかなを とって たべたよ！' }
    ]
  },
  {
    id: 'Raptor', jp: 'ヴェロキラプトル', era: 'はくあき',
    img: '../assets/images/ocean/Raptor/Raptor_normal_1.png',
    trivia: 'あしに するどい つめを もつ すばしっこい にくしょくきょうりゅう！',
    questions: [
      { q: 'ヴェロキラプトルの ぶきは？', choices: ['ながい しっぽ','おおきな からだ','あしの するどい つめ'], answer: 2,
        detail: 'あしの するどい つめで えものを つかまえたよ！' },
      { q: 'ラプトルに にている いきものは？', choices: ['いぬ','トカゲや ワニ','さかな'], answer: 1,
        detail: 'きょうりゅうは トカゲや ワニと おなじ ハチュウるいの なかまだよ！' }
    ]
  },
  {
    id: 'Plesiosaur', jp: 'プレシオサウルス', era: 'ジュラき',
    img: '../assets/images/ocean/Plesiosaur/Plesiosaur_normal_1.png',
    trivia: 'ながい くびと 4ほんの ひれで うみを およいだ は虫るい！',
    questions: [
      { q: 'プレシオサウルスは どこに いた？', choices: ['そら','うみ','やま'], answer: 1,
        detail: 'ひれで およいで うみの なかで くらしていたよ！' },
      { q: 'プレシオサウルスの からだの とくちょうは？', choices: ['ひれ','はね','ツノ'], answer: 0,
        detail: '4ほんの おおきな ひれで うみを およいだよ！' }
    ]
  },
  {
    id: 'Ankylosaurus', jp: 'アンキロサウルス', era: 'はくあき',
    img: '../assets/images/ocean/Ankylosaurus/Ankylosaurus_normal_1.png',
    trivia: 'しっぽの さきに かたい かたまり！よろいの ような そうしょくきょうりゅう！',
    questions: [
      { q: 'アンキロサウルスの しっぽの さきに あるのは？', choices: ['おおきな かたまり','はね','ツノ'], answer: 0,
        detail: 'しっぽの さきの かたい かたまりで てきを たたいたよ！' },
      { q: 'アンキロサウルスの からだを まもる ものは？', choices: ['はね','かたい よろい','はやさ'], answer: 1,
        detail: 'せなかは よろいの ような かたい ほねで まもられていたよ！' }
    ]
  },
  {
    id: 'Spinosaurus', jp: 'スピノサウルス', era: 'はくあき',
    img: '../assets/images/ocean/Spinosaurus/Spinosaurus_normal_1.png',
    trivia: 'せなかに おおきな ほ（ほね）を もつ みずべの にくしょくきょうりゅう！',
    questions: [
      { q: 'スピノサウルスは なにを たべた？', choices: ['くさや はっぱ','さかな','きのみ'], answer: 1,
        detail: 'みずべで おおきな さかなを つかまえて たべたよ！' },
      { q: 'スピノサウルスの せなかに あるのは？', choices: ['ほのような ほね','ツノ','はね'], answer: 0,
        detail: 'ほのような たかい ほねで たいおんを ちょうせつしたよ！' }
    ]
  },
  {
    id: 'Parasaurolophus', jp: 'パラサウロロフス', era: 'はくあき',
    img: '../assets/images/ocean/Parasaurolophus_dino/Parasaurolophus_dino_normal_1.png',
    trivia: 'ながい トサカで おおきな こえを ひびかせた そうしょくきょうりゅう！',
    questions: [
      { q: 'パラサウロロフスの トサカは なんの ため？', choices: ['みずを ためる','てきを たたく','こえを ひびかせる'], answer: 2,
        detail: 'トサカの なかは ほねの パイプ！おおきな こえで なかまを よんだよ！' },
      { q: 'パラサウロロフスは なに しょく？', choices: ['そうしょく','にくしょく','むししょく'], answer: 0,
        detail: 'くさや はっぱを たべる そうしょくきょうりゅうだよ！' }
    ]
  },
  {
    id: 'Pachycephalosaurus', jp: 'パキケファロサウルス', era: 'はくあき',
    img: '../assets/images/ocean/Pachycephalosaurus_dino/Pachycephalosaurus_dino_normal_1.png',
    trivia: 'あたまが とても かたい！ずがいこつで ぶつかりあった きょうりゅう！',
    questions: [
      { q: 'パキケファロサウルスは なにで たたかった？', choices: ['ツノ','かたい あたま','しっぽ'], answer: 1,
        detail: 'あつい ずがい骨を ぶつけて なかまと たたかったよ！' },
      { q: 'パキケファロサウルスの あたまは？', choices: ['とても かたい','とても やわらかい','ちいさい'], answer: 0,
        detail: 'あたまの ほねは 25センチも あつかったよ！' }
    ]
  },
  {
    id: 'Allosaurus', jp: 'アロサウルス', era: 'ジュラき',
    img: '../assets/images/ocean/Allosaurus_dino/Allosaurus_dino_normal_1.png',
    trivia: 'ティラノサウルスより ずっと まえに いた にくしょくきょうりゅう！',
    questions: [
      { q: 'アロサウルスは ティラノと くらべて？', choices: ['ずっと まえの じだい','あとの じだい','おなじ じだい'], answer: 0,
        detail: 'アロサウルスは やく 1おく5000まんねんまえに いたよ！' },
      { q: 'アロサウルスは なに しょく？', choices: ['そうしょく','にくしょく','むししょく'], answer: 1,
        detail: 'するどい きばで えものを たべた にくしょくだよ！' }
    ]
  },
  {
    id: 'Mosasaurus', jp: 'モササウルス', era: 'はくあき',
    img: '../assets/images/ocean/Mosasaurus_marine_dino/Mosasaurus_marine_dino_normal_1.png',
    trivia: 'うみで くらした おおきな は虫るい！うみの さいきょうの ハンター！',
    questions: [
      { q: 'モササウルスは どこに いた？', choices: ['そら','うみ','やま'], answer: 1,
        detail: 'うみで くらした おおきな は虫るいだよ！' },
      { q: 'モササウルスは なにを たべた？', choices: ['くさ','さかなや は虫るい','きのみ'], answer: 1,
        detail: 'おおきな くちで さかなや ほかの は虫るいを たべたよ！' }
    ]
  },
  {
    id: 'Dimetrodon', jp: 'ディメトロドン', era: 'ペルムき',
    img: '../assets/images/ocean/Dimetrodon_prehistoric_creature/Dimetrodon_prehistoric_creature_normal_1.png',
    trivia: 'せなかに おおきな ほ（ひれ）！たいようで からだを あたためた！',
    questions: [
      { q: 'ディメトロドンの せなかの ほは なんの ため？', choices: ['たいおんの ちょうせつ','そらを とぶ','みずを はねる'], answer: 0,
        detail: 'ほに たいようを あてて からだを あたためたよ！' },
      { q: 'ディメトロドンは きょうりゅう？', choices: ['きょうりゅう','きょうりゅうじゃない','とり'], answer: 1,
        detail: 'じつは きょうりゅうが うまれる まえの いきものだよ！' }
    ]
  },
  {
    id: 'Iguanodon', jp: 'イグアノドン', era: 'はくあき',
    img: '../assets/images/ocean/Iguanodon/Iguanodon_normal_1.png',
    trivia: 'おやゆびが スパイクの ように とがった そうしょくきょうりゅう！',
    questions: [
      { q: 'イグアノドンの おやゆびは なんの ため？', choices: ['つえ','てきから みを まもる','ほりもの'], answer: 1,
        detail: 'スパイクの ような おやゆびで てきから みを まもったよ！' },
      { q: 'イグアノドンは なに しょく？', choices: ['そうしょく','にくしょく','さかなしょく'], answer: 0,
        detail: 'くさや はっぱを たべる そうしょくきょうりゅうだよ！' }
    ]
  }
];

// ─── 3ステージ構成：各ステージに配置する恐竜 ──────────────────────
// 各ステージのマップデータと化石位置は fossil/index.html 側で定義
window.FOSSIL_STAGES = [
  { id: 0, name: 'ひるの さばく', bgStart:'#FFE4A8', bgEnd:'#E8A85C',
    fossils: ['Brachiosaurus','Triceratops','Stegosaurus','Pteranodon'] },
  { id: 1, name: 'いせきの さばく', bgStart:'#F5D7A0', bgEnd:'#C49A6C',
    fossils: ['Tyrannosaurus','Raptor','Ankylosaurus','Spinosaurus','Plesiosaur'] },
  { id: 2, name: 'ゆうやけの さばく', bgStart:'#FFB088','bgEnd':'#E67845',
    fossils: ['Parasaurolophus','Pachycephalosaurus','Allosaurus','Mosasaurus','Dimetrodon','Iguanodon'] }
];

// 恐竜IDからデータを取得
window.getFossilById = function(id) {
  for (var i = 0; i < window.FOSSIL_DATA.length; i++) {
    if (window.FOSSIL_DATA[i].id === id) return window.FOSSIL_DATA[i];
  }
  return null;
};
