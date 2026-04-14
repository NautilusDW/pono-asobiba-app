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
  { id: 'garden',  name: 'テラス',     emoji: '🌳', cost: 200 },
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
    emoji: '🌲',
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
    id: 'wall_navy', cat: 'wall', name: 'ネイビー', price: 0, theme: 'all',
    emoji: '🔷', default: true,
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

  // ══ かぐ ═══════════════════════════════════════════════
  // gridRow=u(右奥方向 0-7), gridCol=v(左奥方向 0-7)
  // cellSize: グリッドセル何個分の高さか（画面サイズに連動）
  // pivotX/Y: 足元オフセット（%）
  // angleB: B角度用の個別パラメータ（省略時はA値を使用）
  {
    id: 'furn_bear_1', cat: 'deco', name: 'くまぬいぐるみ', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/bear_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/bear_B.png',
    gridRow: 2, gridCol: 1, cellSize: 0.7, pivotX: 3.3, pivotY: 20.5, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
    angleB: { cellSize: 0.7, pivotX: 3.3, pivotY: 26 , minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 },
  },
  {
    id: 'furn_bed_wood', cat: 'furn', name: 'きのベッド', price: 25, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/bed_A_01.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/bed_B_01.png',
    gridRow: 2, gridCol: 3, cellSize: 2, footprintSize: 3, pivotX: 11, pivotY: 11, minRow: 2, maxRow: 7, minCol: 1, maxCol: 7,
    angleB: { cellSize: 2, footprintSize: 3, pivotX: -13.5, pivotY: 9.6, minRow: 1, maxRow: 7, minCol: 2, maxCol: 7  },
    surfaceY: -91.5, surfaceYB: -74,
  },
  {
    id: 'furn_desk', cat: 'furn', name: 'あおいつくえ', price: 25, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/desk_A_01.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/desk_B_01.png',
    gridRow: 2, gridCol: 2, cellSize: 1.9, pivotX: 12.5, pivotY: 4.1, minRow: 1, maxRow: 6, minCol: 1, maxCol: 6,
    angleB: { cellSize: 1.9, pivotX: -8, pivotY: 4.1, minRow: 1, maxRow: 6, minCol: 1, maxCol: 6  },
    surfaceY: -136.5, surfaceYB: -129.5,
  },
  {
    id: 'furn_bookshelf_w', cat: 'furn', name: 'しろいほんだな', price: 20, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/BookShelf01_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/BookShelf01_B.png',
    gridRow: 1, gridCol: 2, cellSize: 2.3, footprintSize: 2, pivotX: -16.5, pivotY: 8.2, minRow: 0, maxRow: 7, minCol: 1, maxCol: 7,
    angleB: { cellSize: 2.4, footprintSize: 2, pivotX: 15, pivotY: 9.6, minRow: 1, maxRow: 7, minCol: 0, maxCol: 7  },
  },
  {
    id: 'furn_toyshelf', cat: 'furn', name: 'おもちゃだな', price: 25, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/Shelf01_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/Shelf01_B.png',
    gridRow: 2, gridCol: 5, cellSize: 1.4, pivotX: -15, pivotY: -84.9, minRow: 0, maxRow: 6, minCol: 0, maxCol: 6,
    angleB: { cellSize: 1.4, pivotX: 19, pivotY: -82.2, minRow: 1, maxRow: 6, minCol: 0, maxCol: 6  },
    surfaceY: -50, surfaceYB: -50,
  },
  {
    id: 'furn_bookshelf2', cat: 'furn', name: 'きのほんだな', price: 20, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/BookShelf02_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/BookShelf02_B.png',
    gridRow: 3, gridCol: 1, cellSize: 2.8, footprintSize: 2, pivotX: -13.5, pivotY: 8.2, minRow: 0, maxRow: 6, minCol: 1, maxCol: 6,
    angleB: { cellSize: 2.8, footprintSize: 2, pivotX: 16.5, pivotY: 9.6, minRow: 1, maxRow: 7, minCol: 0, maxCol: 7  },
  },
  {
    id: 'furn_shelf2', cat: 'furn', name: 'おおきなたな', price: 20, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/Shelf02_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/Shelf02_B.png',
    gridRow: 4, gridCol: 1, cellSize: 1.8, pivotX: 17.5, pivotY: 30.1, minRow: 0, maxRow: 7, minCol: 0, maxCol: 6,
    angleB: { cellSize: 1.8, pivotX: -17.5, pivotY: 30.1, minRow: 0, maxRow: 6, minCol: 0, maxCol: 7  },
    surfaceY: -125.5, surfaceYB: -125.5,
  },
  {
    id: 'furn_toyshelf2', cat: 'furn', name: 'おもちゃだな2', price: 25, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/ToyShelf01_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/ToyShelf01_B.png',
    gridRow: 5, gridCol: 1, cellSize: 2.3, footprintSize: 2, pivotX: -23, pivotY: 21.7, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
    angleB: { cellSize: 2.3, footprintSize: 2, pivotX: 15, pivotY: 9.6 , minRow: 1, maxRow: 7, minCol: 0, maxCol: 7 },
    surfaceY: -45, surfaceYB: -45,
  },
  {
    id: 'furn_desk2', cat: 'furn', name: 'きのつくえ', price: 25, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/desk02_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/desk02_B.png',
    gridRow: 3, gridCol: 4, cellSize: 1.6, pivotX: 12, pivotY: 6.3, minRow: 1, maxRow: 7, minCol: 1, maxCol: 7,
    angleB: { cellSize: 1.6, pivotX: -14.5, pivotY: 0, minRow: 1, maxRow: 6, minCol: 1, maxCol: 6  },
    surfaceY: -40, surfaceYB: -40,
  },

  {
    id: 'furn_bed_pink', cat: 'furn', name: 'ピンクベッド', price: 25, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures_final/bed_pink_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/bed_pink_B.png',
    gridRow: 3, gridCol: 5, cellSize: 2, footprintSize: 3, pivotX: 11, pivotY: 12.3, minRow: 2, maxRow: 7, minCol: 1, maxCol: 7,
    angleB: { cellSize: 2, footprintSize: 3, pivotX: -11, pivotY: 12.3, minRow: 1, maxRow: 7, minCol: 2, maxCol: 7  },
    surfaceY: -83, surfaceYB: -97.5,
  },
  {
    id: 'furn_desk_pink', cat: 'furn', name: 'ピンクつくえ', price: 25, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures_final/desk_pink_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/desk_pink_B.png',
    gridRow: 4, gridCol: 4, cellSize: 1.8, pivotX: 8, pivotY: 6.8, minRow: 1, maxRow: 7, minCol: 1, maxCol: 7,
    angleB: { cellSize: 1.8, pivotX: -13.5, pivotY: 9.6, minRow: 1, maxRow: 6, minCol: 1, maxCol: 6  },
    surfaceY: -123.5, surfaceYB: -129.5,
  },
  {
    id: 'furn_bookshelf_pink', cat: 'furn', name: 'ピンクほんだな', price: 20, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures_final/bookshelf_pink_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/bookshelf_pink_B.png',
    gridRow: 5, gridCol: 2, cellSize: 1.8, pivotX: -15, pivotY: 11, minRow: 0, maxRow: 6, minCol: 1, maxCol: 6,
    angleB: { cellSize: 1.8, pivotX: 15, pivotY: 11, minRow: 1, maxRow: 6, minCol: 0, maxCol: 6  },
  },
  {
    id: 'furn_chest_pink', cat: 'furn', name: 'ピンクチェスト', price: 20, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures_final/chest_pink_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/chest_pink_B.png',
    gridRow: 6, gridCol: 3, cellSize: 1.8, pivotX: 21.5, pivotY: 28.7, minRow: 0, maxRow: 7, minCol: 0, maxCol: 6,
    angleB: { cellSize: 1.8, pivotX: 16, pivotY: 14.7, minRow: 1, maxRow: 7, minCol: 0, maxCol: 7  },
    surfaceY: -131.5, surfaceYB: -131.5,
  },

  // ══ たまごのゆりかご（育成シミュレーション: 一時非表示）══
  // {
  //   id: 'furn_egg_incubator', cat: 'furn', name: 'たまごのゆりかご', price: 0, theme: 'all',
  //   emoji: '🪺',
  //   special: 'egg_incubator',
  //   gridRow: 4, gridCol: 4, cellSize: 1.0, pivotX: 0, pivotY: 0,
  //   hidden: true,
  // },

  // ══ かざり ═════════════════════════════════════════════
  {
    id: 'deco_dinosaur', cat: 'deco', name: 'きょうりゅう', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/Dinasour01_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/Dinasour01_B.png',
    gridRow: 4, gridCol: 3, cellSize: 0.8, pivotX: -8.1, pivotY: 19.2, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
    angleB: { cellSize: 0.8, pivotX: -8.1, pivotY: 27.4 , minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 },
  },
  {
    id: 'deco_bear_ribbon', cat: 'deco', name: 'リボンくま', price: 15, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures_final/bear_ribbon_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/bear_ribbon_B.png',
    gridRow: 5, gridCol: 4, cellSize: 0.7, pivotX: 0, pivotY: 26, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
    angleB: { cellSize: 0.7, pivotX: 0, pivotY: 26 , minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 },
  },
  {
    id: 'deco_bunny', cat: 'deco', name: 'うさぎぬいぐるみ', price: 15, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures_final/bunny_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/bunny_B.png',
    gridRow: 6, gridCol: 4, cellSize: 0.7, pivotX: 0, pivotY: 23.3, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
    angleB: { cellSize: 0.7, pivotX: 0, pivotY: 20.5 , minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 },
  },
  {
    id: 'deco_doll', cat: 'deco', name: 'おにんぎょう', price: 15, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures_final/doll_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/doll_B.png',
    gridRow: 5, gridCol: 5, cellSize: 0.7, pivotX: 0, pivotY: 24.7, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
    angleB: { cellSize: 0.7, pivotX: 0, pivotY: 24.7 , minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 },
  },
  {
    id: 'deco_carousel', cat: 'deco', name: 'メリーゴーランド', price: 20, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures_final/carousel.png',
    gridRow: 6, gridCol: 5, cellSize: 0.7, pivotX: 0, pivotY: 19.2, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
  },
  {
    id: 'deco_rug_pink', cat: 'deco', name: 'ピンクラグ', price: 15, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures_final/rug_pink.png',
    gridRow: 4, gridCol: 4, cellSize: 1.2, pivotX: 0, pivotY: 49.3, minRow: 1, maxRow: 6, minCol: 1, maxCol: 6,
  },
  {
    id: 'deco_babycar', cat: 'deco', name: 'ベビーカー', price: 20, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures_final/babycar_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/babycar_B.png',
    gridRow: 5, gridCol: 6, cellSize: 0.9, pivotX: 0, pivotY: 26, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
    angleB: { cellSize: 0.9, pivotX: 0, pivotY: 26 , minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 },
  },

  // ══ 共通かざり（追加）══════════════════════════════════════
  {
    id: 'deco_box', cat: 'deco', name: 'おもちゃばこ', price: 15, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures_final/box_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/box_B.png',
    gridRow: 6, gridCol: 2, cellSize: 0.8, pivotX: 11, pivotY: 20.5, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
    angleB: { cellSize: 0.8, pivotX: -12.5, pivotY: 20.5 , minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 },
  },
  {
    id: 'furn_shelf_toy', cat: 'furn', name: 'おもちゃだな3', price: 25, theme: 'all',
    roomImg: '../assets/images/Rooms/furnitures_final/shelf_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/shelf_B.png',
    gridRow: 5, gridCol: 3, cellSize: 1.9, pivotX: -16.5, pivotY: 11, minRow: 0, maxRow: 7, minCol: 1, maxCol: 7,
    angleB: { cellSize: 1.9, pivotX: 19, pivotY: 11, minRow: 1, maxRow: 7, minCol: 0, maxCol: 7  },
  },
  {
    id: 'deco_shelf_wall', cat: 'deco', name: 'かべだな', price: 15, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures_final/shelf2_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/shelf2_B.png',
    gridRow: 3, gridCol: 3, cellSize: 1.1, pivotX: -9.5, pivotY: -100, minRow: 0, maxRow: 7, minCol: 1, maxCol: 7,
    angleB: { cellSize: 1, pivotX: 0, pivotY: 0 , minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 },
  },
  {
    id: 'deco_tea', cat: 'deco', name: 'ティーセット', price: 15, theme: 'girl',
    roomImg: '../assets/images/Rooms/furnitures_final/tea_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/tea_B.png',
    gridRow: 4, gridCol: 5, cellSize: 0.5, pivotX: 0, pivotY: 45.2, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
    angleB: { cellSize: 0.8, pivotX: 0, pivotY: 0 , minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 },
  },

  // ══ boysテーマ ═════════════════════════════════════════════
  {
    id: 'deco_sportscar', cat: 'deco', name: 'スポーツカー', price: 25, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/sportscar_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/sportscar_B.png',
    gridRow: 4, gridCol: 3, cellSize: 0.5, pivotX: 0, pivotY: 49.3, minRow: 1, maxRow: 6, minCol: 1, maxCol: 6,
    angleB: { cellSize: 0.5, pivotX: 0, pivotY: 52.1, minRow: 1, maxRow: 6, minCol: 1, maxCol: 6  },
  },
  {
    id: 'furn_pcdesk', cat: 'furn', name: 'PCデスク＆チェア', price: 30, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/pcdesk_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/pcdesk_B.png',
    gridRow: 3, gridCol: 4, cellSize: 2, pivotX: 0, pivotY: 20.5, minRow: 1, maxRow: 7, minCol: 1, maxCol: 7,
    angleB: { cellSize: 2, pivotX: 0, pivotY: 11, minRow: 1, maxRow: 7, minCol: 1, maxCol: 7  },
    surfaceY: -40, surfaceYB: -40,
  },
  {
    id: 'deco_robot', cat: 'deco', name: 'ロボット', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/robot_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/robot_B.png',
    gridRow: 6, gridCol: 4, cellSize: 0.7, pivotX: 0, pivotY: 37, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
    angleB: { cellSize: 0.7, pivotX: 0, pivotY: 37 , minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 },
  },
  {
    id: 'deco_books', cat: 'deco', name: 'ほんのやま', price: 10, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/books_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/books_B.png',
    gridRow: 4, gridCol: 6, cellSize: 0.7, pivotX: 0, pivotY: 43, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
    angleB: { cellSize: 0.7, pivotX: 0, pivotY: 43 , minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 },
  },
  {
    id: 'furn_bookshelf_wood', cat: 'furn', name: 'きのほんだな2', price: 20, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/bookshelf_wood_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/bookshelf_wood_B.png',
    gridRow: 2, gridCol: 1, cellSize: 1.5, footprintSize: 2, pivotX: 0, pivotY: 0, minRow: 1, maxRow: 6, minCol: 1, maxCol: 6,
    angleB: { cellSize: 1.5, footprintSize: 2, pivotX: 0, pivotY: 0, minRow: 1, maxRow: 6, minCol: 1, maxCol: 6  },
  },
  {
    id: 'deco_lamp_floor', cat: 'deco', name: 'フロアランプ', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/lamp_floor.png',
    gridRow: 6, gridCol: 1, cellSize: 1.6, pivotX: 0, pivotY: 8.2, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
  },
  {
    id: 'deco_rug_space', cat: 'deco', name: 'うちゅうラグ', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/rug_space.png',
    gridRow: 4, gridCol: 4, cellSize: 1.1, pivotX: 0, pivotY: 50.7, minRow: 1, maxRow: 6, minCol: 1, maxCol: 6,
  },  {
    id: 'deco_plasma_ball', cat: 'deco', name: 'プラズマボール', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/plasma_ball.png',
    gridRow: 5, gridCol: 5, cellSize: 0.6, pivotX: 0, pivotY: 26, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
  },
  {
    id: 'deco_box_boy', cat: 'deco', name: 'おもちゃばこ', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/deco_box_boy_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/deco_box_boy_B.png',
    gridRow: 4, gridCol: 4, cellSize: 0.85, pivotX: 10.5, pivotY: 24.5, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
  
    angleB: { cellSize: 0.85, pivotX: -9, pivotY: 23.1, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 },
  },
  {
    id: 'furn_bed_blue_boy', cat: 'furn', name: 'あおいベッド', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/furn_bed_blue_boy_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/furn_bed_blue_boy_B.png',
    gridRow: 4, gridCol: 4, cellSize: 2.1, pivotX: 10.5, pivotY: 11.9, minRow: 2, maxRow: 7, minCol: 1, maxCol: 7,
  
    angleB: { cellSize: 2.1, pivotX: -12, pivotY: 11.9, minRow: 1, maxRow: 7, minCol: 2, maxCol: 7 },
  },
  {
    id: 'furn_bookshelf_blue_boy', cat: 'furn', name: 'あおいほんだな', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/furn_bookshelf_blue_boy_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/furn_bookshelf_blue_boy_B.png',
    gridRow: 4, gridCol: 4, cellSize: 2.3, pivotX: -17.5, pivotY: 9.1, minRow: 0, maxRow: 7, minCol: 1, maxCol: 7,
  
    angleB: { cellSize: 2.3, pivotX: 17.5, pivotY: 9.1, minRow: 1, maxRow: 7, minCol: 0, maxCol: 7 },
  },
  {
    id: 'furn_bookshelf_blue_round_boy', cat: 'furn', name: 'あおいまるいほんだな', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/furn_bookshelf_blue_round_boy_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/furn_bookshelf_blue_round_boy_B.png',
    gridRow: 4, gridCol: 4, cellSize: 1.7, pivotX: -16, pivotY: 13.3, minRow: 0, maxRow: 7, minCol: 1, maxCol: 7,
  
    angleB: { cellSize: 1.7, pivotX: 14.5, pivotY: 11.9, minRow: 1, maxRow: 7, minCol: 0, maxCol: 7 },
  },
  {
    id: 'deco_drone_white_boy', cat: 'deco', name: 'しろいドローン', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/deco_drone_white_boy_A.png',
    gridRow: 4, gridCol: 4, cellSize: 0.5, pivotX: 0, pivotY: 46.9, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
  },
  {
    id: 'furn_pcdesk_blue_boy', cat: 'furn', name: 'あおいPCデスク＆チェア', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/furn_pcdesk_blue_boy_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/furn_pcdesk_blue_boy_B.png',
    gridRow: 4, gridCol: 4, cellSize: 1.8, pivotX: 6.5, pivotY: 2.1, minRow: 1, maxRow: 7, minCol: 1, maxCol: 7,
  
    angleB: { cellSize: 1.8, pivotX: -0.5, pivotY: -0.7, minRow: 1, maxRow: 7, minCol: 1, maxCol: 7 },
  },
  {
    id: 'deco_vr_blue_boy', cat: 'deco', name: 'あおいVRゴーグル', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/deco_vr_blue_boy_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/deco_vr_blue_boy_B.png',
    gridRow: 4, gridCol: 4, cellSize: 0.4, pivotX: 0, pivotY: 44.1, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
  
    angleB: { cellSize: 0.4, pivotX: 0, pivotY: 44.1, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 },
  },
  {
    id: 'deco_rocket_boy', cat: 'deco', name: 'ロケット', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/furnitures_final/deco_rocket_boy_A.png',
    roomImgB: '../assets/images/Rooms/furnitures_final/deco_rocket_boy_B.png',
    gridRow: 4, gridCol: 4, cellSize: 0.5, pivotX: 0, pivotY: 25.9, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7,
  
    angleB: { cellSize: 0.5, pivotX: 0, pivotY: 25.9, minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 },
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
  { emoji: '🐠', name: 'すいぞくかん',     how: '5ふん あそんだら',                pt: 3  },
  { emoji: '🦔', name: 'ブロック崩し',     how: '1ステージ クリアしたら',          pt: 5, premium: true },
  { emoji: '🏆', name: 'ブロック崩し（ボーナス）', how: 'ハイスコア こうしんしたら', pt: 10, premium: true, bonus: true },
  { emoji: '🐦', name: 'つみき',          how: '10こ つんだら',                    pt: 5, premium: true },
  { emoji: '🏆', name: 'つみき（ボーナス）', how: 'ハイスコア こうしんしたら',     pt: 10, premium: true, bonus: true },
  { emoji: '🦊', name: 'みちつなぎ',      how: '1ステージ クリアしたら',           pt: 5, premium: true },
  { emoji: '🌟', name: 'まいにちボーナス', how: 'まいにちあそんだら',              pt: 3  },
  { emoji: '📅', name: '1にちの さいだい', how: '（どのゲームでも うえかぎ）',     pt: 25, note: true },
];
