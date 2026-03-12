// ─── ポノのおへや: アイテム定義 ───────────────────────────
// cat: 'wall'=壁紙, 'floor'=床, 'furn'=家具, 'deco'=かざり
// theme: 'boy'|'girl'|'all'
//
// roomImg: マスク済みアルファ付きPNG（壁/床エリアのみ表示）
// → CSS mask-image と組み合わせて .room-wall/.room-floor に適用

const ROOM_AREAS = [
  { id: 'living',  name: 'リビング',   emoji: '🏠', cost: 0   },
  { id: 'bedroom', name: 'しんしつ',   emoji: '🛏️', cost: 80  },
  { id: 'kitchen', name: 'だいどころ', emoji: '🍳', cost: 150 },
  { id: 'garden',  name: 'にわ',       emoji: '🌳', cost: 200 },
];

const ROOM_ITEMS = [

  // ══ かべがみ ══════════════════════════════════════════
  {
    id: 'wall_kumo_pastel', cat: 'wall', name: 'パステルくも', price: 10, theme: 'all',
    emoji: '☁️',
    roomImg: '../assets/images/Rooms/walls/kumo_pastel.png',
  },
  {
    id: 'wall_kumo_niko', cat: 'wall', name: 'にこにこくも', price: 10, theme: 'all',
    emoji: '😊',
    roomImg: '../assets/images/Rooms/walls/kumo_niko.png',
  },
  {
    id: 'wall_mizutama', cat: 'wall', name: 'みずたま', price: 10, theme: 'all',
    emoji: '🔵',
    roomImg: '../assets/images/Rooms/walls/mizutama.png',
  },
  {
    id: 'wall_hoshi', cat: 'wall', name: 'おほしさま', price: 15, theme: 'boy',
    emoji: '⭐',
    roomImg: '../assets/images/Rooms/walls/hoshi.png',
  },
  {
    id: 'wall_mori', cat: 'wall', name: 'もりのどうぶつ', price: 20, theme: 'all',
    emoji: '🐻',
    roomImg: '../assets/images/Rooms/walls/mori_doubutsu.png',
  },
  {
    id: 'wall_stripe', cat: 'wall', name: 'ストライプ', price: 10, theme: 'all',
    emoji: '🌈',
    roomImg: '../assets/images/Rooms/walls/stripe.png',
  },
  {
    id: 'wall_heart', cat: 'wall', name: 'ハート', price: 15, theme: 'girl',
    emoji: '💖',
    roomImg: '../assets/images/Rooms/walls/heart.png',
  },
  {
    id: 'wall_aozora', cat: 'wall', name: 'あおぞら', price: 15, theme: 'all',
    emoji: '🌤️',
    roomImg: '../assets/images/Rooms/walls/aozora.png',
  },
  {
    id: 'wall_kyouryu', cat: 'wall', name: 'きょうりゅう', price: 20, theme: 'boy',
    emoji: '🦕',
    roomImg: '../assets/images/Rooms/walls/kyouryu.png',
  },
  {
    id: 'wall_kikyuu', cat: 'wall', name: 'ききゅう', price: 20, theme: 'all',
    emoji: '🎈',
    roomImg: '../assets/images/Rooms/walls/kikyuu.png',
  },
  {
    id: 'wall_uchuu', cat: 'wall', name: 'うちゅう', price: 25, theme: 'boy',
    emoji: '🚀',
    roomImg: '../assets/images/Rooms/walls/uchuu.png',
  },
  {
    id: 'wall_navy', cat: 'wall', name: 'ネイビー', price: 10, theme: 'boy',
    emoji: '🔷',
    roomImg: '../assets/images/Rooms/walls/navy_tile.png',
  },

  // ══ ゆか ═════════════════════════════════════════════
  {
    id: 'floor_wood_pastel', cat: 'floor', name: 'ナチュラルもくめ', price: 10, theme: 'all',
    emoji: '🪵',
    roomImg: '../assets/images/Rooms/floors/kumo_pastel.png',
  },
  {
    id: 'floor_wood_warm', cat: 'floor', name: 'あたたかもくめ', price: 10, theme: 'all',
    emoji: '🪵',
    roomImg: '../assets/images/Rooms/floors/kumo_niko.png',
  },
  {
    id: 'floor_wood_light', cat: 'floor', name: 'あかるいもくめ', price: 10, theme: 'all',
    emoji: '🪵',
    roomImg: '../assets/images/Rooms/floors/mizutama.png',
  },
  {
    id: 'floor_white_wood', cat: 'floor', name: 'しろもくめ', price: 15, theme: 'all',
    emoji: '🤍',
    roomImg: '../assets/images/Rooms/floors/hoshi.png',
  },
  {
    id: 'floor_herringbone', cat: 'floor', name: 'ヘリンボーン', price: 15, theme: 'all',
    emoji: '🔶',
    roomImg: '../assets/images/Rooms/floors/stripe.png',
  },
  {
    id: 'floor_pink', cat: 'floor', name: 'ピンク', price: 10, theme: 'girl',
    emoji: '💗',
    roomImg: '../assets/images/Rooms/floors/heart.png',
  },
  {
    id: 'floor_sand', cat: 'floor', name: 'すなはま', price: 15, theme: 'all',
    emoji: '🏖️',
    roomImg: '../assets/images/Rooms/floors/aozora.png',
  },
  {
    id: 'floor_wood_oak', cat: 'floor', name: 'オークもくめ', price: 10, theme: 'all',
    emoji: '🪵',
    roomImg: '../assets/images/Rooms/floors/kyouryu.png',
  },
  {
    id: 'floor_pink_plain', cat: 'floor', name: 'さくらいろ', price: 10, theme: 'girl',
    emoji: '🌸',
    roomImg: '../assets/images/Rooms/floors/kikyuu.png',
  },
  {
    id: 'floor_navy', cat: 'floor', name: 'こんいろ', price: 15, theme: 'boy',
    emoji: '🌌',
    roomImg: '../assets/images/Rooms/floors/uchuu.png',
  },
  {
    id: 'floor_white_tile', cat: 'floor', name: 'しろタイル', price: 15, theme: 'all',
    emoji: '🔲',
    roomImg: '../assets/images/Rooms/floors/navy_tile.png',
  },
  {
    id: 'floor_wood_forest', cat: 'floor', name: 'もりのもくめ', price: 10, theme: 'all',
    emoji: '🌿',
    roomImg: '../assets/images/Rooms/floors/mori_doubutsu.png',
  },

  // ══ かぐ ═════════════════════════════════════════════
  {
    id: 'furn_sofa_pink', cat: 'furn', name: 'ピンクソファ', price: 30, theme: 'girl',
    emoji: '🛋️', emojiSize: '72px',
  },
  {
    id: 'furn_sofa_blue', cat: 'furn', name: 'あおいソファ', price: 30, theme: 'boy',
    emoji: '🛋️', emojiSize: '72px',
  },
  {
    id: 'furn_bed', cat: 'furn', name: 'ベッド', price: 40, theme: 'all',
    emoji: '🛏️', emojiSize: '72px',
  },
  {
    id: 'furn_table', cat: 'furn', name: 'まるテーブル', price: 25, theme: 'all',
    emoji: '🪑', emojiSize: '66px',
  },
  {
    id: 'furn_bookshelf', cat: 'furn', name: 'ほんだな', price: 25, theme: 'all',
    emoji: '📚', emojiSize: '66px',
  },
  {
    id: 'furn_tv', cat: 'furn', name: 'テレビ', price: 40, theme: 'all',
    emoji: '📺', emojiSize: '72px',
  },
  {
    id: 'furn_piano', cat: 'furn', name: 'ピアノ', price: 50, theme: 'all',
    emoji: '🎹', emojiSize: '66px',
  },

  // ══ かざり ════════════════════════════════════════════
  {
    id: 'deco_cactus', cat: 'deco', name: 'サボテン', price: 10, theme: 'all',
    emoji: '🌵', emojiSize: '52px',
  },
  {
    id: 'deco_flower', cat: 'deco', name: 'おはな', price: 10, theme: 'girl',
    emoji: '🌸', emojiSize: '52px',
  },
  {
    id: 'deco_bear', cat: 'deco', name: 'くまのぬいぐるみ', price: 10, theme: 'all',
    emoji: '🧸', emojiSize: '52px',
  },
  {
    id: 'deco_rocket', cat: 'deco', name: 'ロケット', price: 15, theme: 'boy',
    emoji: '🚀', emojiSize: '52px',
  },
  {
    id: 'deco_unicorn', cat: 'deco', name: 'ユニコーン', price: 15, theme: 'girl',
    emoji: '🦄', emojiSize: '52px',
  },
  {
    id: 'deco_rainbow', cat: 'deco', name: 'にじ', price: 10, theme: 'all',
    emoji: '🌈', emojiSize: '52px',
  },
  {
    id: 'deco_globe', cat: 'deco', name: 'ちきゅうぎ', price: 15, theme: 'boy',
    emoji: '🌍', emojiSize: '52px',
  },
  {
    id: 'deco_cat', cat: 'deco', name: 'ねこ', price: 15, theme: 'all',
    emoji: '🐱', emojiSize: '52px',
  },
];

// ── ポイント獲得方法のリスト（説明画面用） ─────────────────
const POINT_GUIDE = [
  { emoji: '✏️', name: 'もじかき',         how: '1もじ れんしゅうしたら',          pt: 2  },
  { emoji: '🎌', name: 'もじかき（ボーナス）', how: 'ひらがな or カタカナ ぜんぶ！', pt: 20, bonus: true },
  { emoji: '🧩', name: 'パズル',           how: 'かんせいしたら',                  pt: 5  },
  { emoji: '🎨', name: 'ぬりえ',           how: 'ほぞんしたら',                    pt: 5  },
  { emoji: '🔤', name: 'ことばあわせ',     how: 'ぜんぶ あわせたら',               pt: 5  },
  { emoji: '🖼️', name: 'おえかき',        how: 'えを ほぞんしたら',               pt: 3  },
  { emoji: '🐠', name: 'うみのせかい',     how: '5ふん あそんだら',                pt: 3  },
  { emoji: '🦔', name: 'ブロック崩し',     how: '1ステージ クリアしたら',          pt: 5, premium: true },
  { emoji: '🏆', name: 'ブロック崩し（ボーナス）', how: 'ハイスコア こうしんしたら', pt: 10, premium: true, bonus: true },
  { emoji: '🐦', name: 'つみき',          how: '10こ つんだら',                    pt: 5, premium: true },
  { emoji: '🏆', name: 'つみき（ボーナス）', how: 'ハイスコア こうしんしたら',     pt: 10, premium: true, bonus: true },
  { emoji: '🦊', name: 'みちつなぎ',      how: '1ステージ クリアしたら',           pt: 5, premium: true },
  { emoji: '🌟', name: 'まいにちボーナス', how: 'まいにちあそんだら',              pt: 3  },
  { emoji: '📅', name: '1にちの さいだい', how: '（どのゲームでも うえかぎ）',     pt: 25, note: true },
];
