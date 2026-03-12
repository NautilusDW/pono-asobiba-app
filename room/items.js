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

  // ══ かぐ（アイソメ画像版） ═══════════════════════════
  // gridRow=u(右奥方向 0-7), gridCol=v(左奥方向 0-7)
  // cellSize: グリッドセル何個分の横幅か（画面サイズに連動）
  // pivotX/Y: 足元オフセット（%）
  {
    id: 'furn_rocket', cat: 'furn', name: 'ロケット', price: 20, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/rocket.png',
    gridRow: 1, gridCol: 5, cellSize: 0.6, pivotX: 0, pivotY: 1.7,
  },
  {
    id: 'furn_drum', cat: 'furn', name: 'たいこ', price: 20, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/drum.png',
    gridRow: 3, gridCol: 4, cellSize: 0.7, pivotX: -2.8, pivotY: 1.8,
  },
  {
    id: 'furn_ringtower', cat: 'furn', name: 'わなげ', price: 20, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/ringtower.png',
    gridRow: 5, gridCol: 5, cellSize: 0.6, pivotX: 0, pivotY: 1.7,
  },
  {
    id: 'furn_robot', cat: 'furn', name: 'ロボット', price: 20, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/robot.png',
    gridRow: 5, gridCol: 1, cellSize: 0.7, pivotX: 4.7, pivotY: 1.3,
  },
  {
    id: 'furn_car', cat: 'furn', name: 'あかいくるま', price: 20, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/car.png',
    gridRow: 3, gridCol: 2, cellSize: 1.0, pivotX: -13.0, pivotY: 1.9,
  },
  {
    id: 'furn_desk', cat: 'furn', name: 'あおいつくえ', price: 25, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/desk.png',
    gridRow: 2, gridCol: 2, cellSize: 1.8, pivotX: 15.7, pivotY: 1.1,
  },
  {
    id: 'furn_chest_1', cat: 'furn', name: 'しろいチェスト', price: 20, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/chest_1.png',
    gridRow: 1, gridCol: 3, cellSize: 1.6, pivotX: -20.0, pivotY: 0.9,
  },
  {
    id: 'furn_chest_2', cat: 'furn', name: 'しろいチェスト2', price: 20, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/chest_2.png',
    gridRow: 4, gridCol: 1, cellSize: 1.5, pivotX: 15.8, pivotY: 1.0,
  },
  {
    id: 'furn_lamp_1', cat: 'furn', name: 'しろいランプ', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/lamp_1.png',
    gridRow: 1, gridCol: 4, cellSize: 0.7, pivotX: 0, pivotY: 0.6,
  },
  {
    id: 'furn_lamp_2', cat: 'furn', name: 'しろいランプ2', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/lamp_2.png',
    gridRow: 6, gridCol: 3, cellSize: 0.6, pivotX: 0, pivotY: 0.8,
  },
  {
    id: 'furn_bear_1', cat: 'furn', name: 'くまぬいぐるみ', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/bear_1.png',
    gridRow: 2, gridCol: 1, cellSize: 0.7, pivotX: 3.3, pivotY: 1.3,
  },
  {
    id: 'furn_bear_2', cat: 'furn', name: 'くまぬいぐるみ2', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/bear_2.png',
    gridRow: 5, gridCol: 3, cellSize: 0.7, pivotX: 1.2, pivotY: 1.7,
  },

  // ══ かぐ（追加分） ═════════════════════════════════════
  {
    id: 'furn_bed_wood', cat: 'furn', name: 'きのベッド', price: 25, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_01_001.png',
    gridRow: 2, gridCol: 3, cellSize: 2.2, pivotX: 14.3, pivotY: 0.6,
  },
  {
    id: 'furn_bed_blue', cat: 'furn', name: 'あおいベッド', price: 30, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_04_001.png',
    gridRow: 4, gridCol: 2, cellSize: 2.2, pivotX: -15.6, pivotY: 0.7,
  },
  {
    id: 'furn_bookshelf_w', cat: 'furn', name: 'しろいほんだな', price: 20, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_01_003.png',
    gridRow: 1, gridCol: 2, cellSize: 1.2, pivotX: 17.5, pivotY: 0.7,
  },
  {
    id: 'furn_bookshelf_b', cat: 'furn', name: 'おおきなほんだな', price: 25, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_02_003.png',
    gridRow: 3, gridCol: 1, cellSize: 1.4, pivotX: -17.0, pivotY: 0.5,
  },
  {
    id: 'furn_toyshelf', cat: 'furn', name: 'おもちゃだな', price: 25, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_02_006.png',
    gridRow: 2, gridCol: 5, cellSize: 1.8, pivotX: -24.7, pivotY: 0.8,
  },
  {
    id: 'furn_desk_wood', cat: 'furn', name: 'きのつくえ', price: 20, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_01_002.png',
    gridRow: 3, gridCol: 3, cellSize: 1.8, pivotX: 10.1, pivotY: 0.7,
  },
  {
    id: 'furn_table_sq', cat: 'furn', name: 'しかくテーブル', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_03_006.png',
    gridRow: 4, gridCol: 4, cellSize: 1.5, pivotX: 0, pivotY: 1.1,
  },
  {
    id: 'furn_table_round', cat: 'furn', name: 'まるテーブル', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_02_010.png',
    gridRow: 5, gridCol: 4, cellSize: 1.2, pivotX: 0, pivotY: 1.2,
  },
  {
    id: 'furn_table_red', cat: 'furn', name: 'あかいテーブル', price: 15, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures/furniture_04_011.png',
    gridRow: 3, gridCol: 5, cellSize: 1.3, pivotX: 0, pivotY: 1.2,
  },
  {
    id: 'furn_chest_wood', cat: 'furn', name: 'きのチェスト', price: 20, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_01_005.png',
    gridRow: 4, gridCol: 2, cellSize: 1.2, pivotX: 15.4, pivotY: 1.0,
  },
  {
    id: 'furn_chair', cat: 'furn', name: 'きのいす', price: 10, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_03_016.png',
    gridRow: 5, gridCol: 2, cellSize: 0.8, pivotX: 1.6, pivotY: 1.3,
  },
  {
    id: 'furn_cabinet', cat: 'furn', name: 'キャビネット', price: 25, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_04_002.png',
    gridRow: 1, gridCol: 5, cellSize: 1.3, pivotX: -20.4, pivotY: 0.6,
  },

  // ══ かざり ═════════════════════════════════════════════
  {
    id: 'deco_dinosaur', cat: 'deco', name: 'きょうりゅう', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures/furniture_01_009.png',
    gridRow: 4, gridCol: 3, cellSize: 0.8, pivotX: -8.1, pivotY: 1.4,
  },
  {
    id: 'deco_train', cat: 'deco', name: 'きしゃ', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures/furniture_01_010.png',
    gridRow: 5, gridCol: 5, cellSize: 1.0, pivotX: -36.7, pivotY: 2.0,
  },
  {
    id: 'deco_airplane', cat: 'deco', name: 'ひこうき', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures/furniture_01_015.png',
    gridRow: 6, gridCol: 4, cellSize: 0.8, pivotX: -18.2, pivotY: 2.1,
  },
  {
    id: 'deco_truck', cat: 'deco', name: 'トラック', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures/furniture_03_014.png',
    gridRow: 3, gridCol: 6, cellSize: 0.9, pivotX: -15.8, pivotY: 1.5,
  },
  {
    id: 'deco_cloud_lamp', cat: 'deco', name: 'くもランプ', price: 20, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures/furniture_01_006.png',
    gridRow: 2, gridCol: 4, cellSize: 0.7, pivotX: 0, pivotY: 0.8,
  },
  {
    id: 'deco_desk_lamp', cat: 'deco', name: 'でんきスタンド', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_04_015.png',
    gridRow: 6, gridCol: 2, cellSize: 0.7, pivotX: 10.9, pivotY: 1.3,
  },
  {
    id: 'deco_toybox_wood', cat: 'deco', name: 'おもちゃばこ', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_01_007.png',
    gridRow: 5, gridCol: 6, cellSize: 1.0, pivotX: 0, pivotY: 1.4,
  },
  {
    id: 'deco_toybox_blue', cat: 'deco', name: 'あおいおもちゃばこ', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures/furniture_04_003.png',
    gridRow: 3, gridCol: 1, cellSize: 1.3, pivotX: -13.0, pivotY: 0.9,
  },
  {
    id: 'deco_photo_shelf', cat: 'deco', name: 'フォトフレーム', price: 10, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures/furniture_03_008.png',
    gridRow: 6, gridCol: 5, cellSize: 1.2, pivotX: 30.9, pivotY: 1.3,
  },
  {
    id: 'deco_wall_shelf', cat: 'deco', name: 'かべだな', price: 10, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_01_008.png',
    gridRow: 4, gridCol: 6, cellSize: 1.0, pivotX: 21.8, pivotY: 1.4,
  },
  {
    id: 'deco_stool', cat: 'deco', name: 'まるいす', price: 10, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_01_014.png',
    gridRow: 6, gridCol: 3, cellSize: 0.7, pivotX: 0, pivotY: 1.7,
  },
  {
    id: 'deco_blocks', cat: 'deco', name: 'つみき', price: 10, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_01_020.png',
    gridRow: 5, gridCol: 4, cellSize: 0.7, pivotX: -16.9, pivotY: 2.3,
  },
  {
    id: 'deco_block_castle', cat: 'deco', name: 'おおきなつみき', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_03_009.png',
    gridRow: 4, gridCol: 5, cellSize: 1.0, pivotX: 3.3, pivotY: 1.2,
  },
  {
    id: 'deco_beach_ball', cat: 'deco', name: 'ビーチボール', price: 10, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_02_026.png',
    gridRow: 6, gridCol: 6, cellSize: 0.6, pivotX: 0, pivotY: 2.3,
  },
  {
    id: 'deco_rug_pastel', cat: 'deco', name: 'パステルラグ', price: 15, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures/furniture_01_004.png',
    gridRow: 4, gridCol: 4, cellSize: 2.0, pivotX: 0, pivotY: 1.4,
  },
  {
    id: 'deco_rug_star', cat: 'deco', name: 'ほしのラグ', price: 15, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures/furniture_02_005.png',
    gridRow: 3, gridCol: 3, cellSize: 2.0, pivotX: 0, pivotY: 1.1,
  },
  {
    id: 'deco_rug_purple', cat: 'deco', name: 'むらさきラグ', price: 15, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures/furniture_03_007.png',
    gridRow: 5, gridCol: 3, cellSize: 2.0, pivotX: 0, pivotY: 1.5,
  },
  {
    id: 'deco_rug_yellow', cat: 'deco', name: 'きいろラグ', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_04_008.png',
    gridRow: 3, gridCol: 4, cellSize: 2.0, pivotX: 0, pivotY: 1.4,
  },
  {
    id: 'deco_books', cat: 'deco', name: 'つみあげほん', price: 10, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures/furniture_01_013.png',
    gridRow: 6, gridCol: 1, cellSize: 0.8, pivotX: 0, pivotY: 1.8,
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
