// ─── ポノのおへや: アイテム定義 ───────────────────────────
// cat: 'wall'=壁紙, 'floor'=床, 'furn'=家具, 'deco'=かざり
// theme: 'boy'|'girl'|'all'
//
// ── 壁・床テクスチャ用フィールド（優先順位順） ──
// roomImg:   パース済みPNGのパス（assets/images/Rooms/floors/ or walls/ に配置）
//            → 背景全体を 100% × 100% で引き伸ばして表示。最優先。
// tileImage: シームレスPNGのパス（レガシー。roomImg がない場合に使用）
// tileSize:  background-size 値（例: '128px'）省略時は '200px'
// wallGrad/floorGrad: CSSグラジェント（画像が両方ない場合のフォールバック）
// img: ショップサムネイル用PNG（省略時は emoji を表示）
//
// ── roomImg の命名規則 ──
// 床: assets/images/Rooms/floors/floor_[素材]_[バリアント].png
//     例: floor_wood_natural.png / floor_carpet_pink.png / floor_tile_blue.png
// 壁: assets/images/Rooms/walls/wall_[素材]_[バリアント].png
//     例: wall_plain_sky.png / wall_brick_red.png / wall_wallpaper_floral.png

const ROOM_AREAS = [
  { id: 'living',  name: 'リビング',   emoji: '🏠', cost: 0   },
  { id: 'bedroom', name: 'しんしつ',   emoji: '🛏️', cost: 80  },
  { id: 'kitchen', name: 'だいどころ', emoji: '🍳', cost: 150 },
  { id: 'garden',  name: 'にわ',       emoji: '🌳', cost: 200 },
];

const ROOM_ITEMS = [
  // ══ デバッグ用グリッド背景（開発専用・price:0） ══════
  {
    id: 'wall_debug_grid', cat: 'wall', name: 'デバッググリッド', price: 0, theme: 'all',
    scope: 'room',
    roomImg: '../assets/images/Rooms/Room_Base_grid.png',
    wallGrad: 'linear-gradient(180deg, #3a6a8a 0%, #2c5f72 100%)',
  },
  // ══ かべがみ (wallpaper) ══════════════════════════════
  {
    id: 'wall_sky', cat: 'wall', name: 'そらいろ', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/walls/wall_plain_sky.png',
    wallGrad: 'linear-gradient(180deg, #87ceeb 0%, #c8e6ff 100%)',
  },
  {
    id: 'wall_stars', cat: 'wall', name: 'ほしぞら', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/walls/wall_plain_stars.png',
    wallGrad: 'linear-gradient(180deg, #0d1b3e 0%, #1a3080 100%)',
  },
  {
    id: 'wall_pink', cat: 'wall', name: 'ピンクの かべ', price: 15, theme: 'girl',
    roomImg: '../assets/images/Rooms/walls/wall_plain_pink.png',
    wallGrad: 'linear-gradient(180deg, #f8c8df 0%, #fce4ec 100%)',
  },
  {
    id: 'wall_forest', cat: 'wall', name: 'もりの かべ', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/walls/wall_plain_forest.png',
    wallGrad: 'linear-gradient(180deg, #a5d6a7 0%, #c8e6c9 100%)',
  },
  {
    id: 'wall_yellow', cat: 'wall', name: 'おひさまいろ', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/walls/wall_plain_yellow.png',
    wallGrad: 'linear-gradient(180deg, #fff176 0%, #fffde7 100%)',
  },
  {
    id: 'wall_cosmos', cat: 'wall', name: 'うちゅう', price: 20, theme: 'all',
    scope: 'room',
    roomImg: '../assets/images/Rooms/walls/wall_cosmos.png',
    wallGrad: 'linear-gradient(180deg, #f5e6c8 0%, #ede0b8 100%)',
  },
  {
    id: 'wall_night_stars', cat: 'wall', name: 'よるぞら', price: 20, theme: 'boy',
    scope: 'room',
    roomImg: '../assets/images/Rooms/walls/wall_night_stars.png',
    wallGrad: 'linear-gradient(180deg, #1a3a6e 0%, #243580 100%)',
  },
  {
    id: 'wall_balloons', cat: 'wall', name: 'バルーン', price: 20, theme: 'all',
    scope: 'room',
    roomImg: '../assets/images/Rooms/walls/wall_balloons_pastel.png',
    wallGrad: 'linear-gradient(180deg, #fdf3e7 0%, #fae8d4 100%)',
  },
  {
    id: 'wall_hearts', cat: 'wall', name: 'ハート', price: 20, theme: 'girl',
    scope: 'room',
    roomImg: '../assets/images/Rooms/walls/wall_hearts_pastel.jpeg',
    wallGrad: 'linear-gradient(180deg, #fdf0e0 0%, #fae8d0 100%)',
  },
  {
    id: 'wall_space_rockets', cat: 'wall', name: 'うちゅうロケット', price: 20, theme: 'boy',
    scope: 'room',
    roomImg: '../assets/images/Rooms/walls/wall_space_rockets.jpeg',
    wallGrad: 'linear-gradient(180deg, #0d1b3e 0%, #1a3080 100%)',
  },

  // ══ ゆか (flooring) ═════════════════════════════════
  {
    id: 'floor_wood', cat: 'floor', name: 'もくめの ゆか', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/floors/floor_wood_natural.png',
    floorGrad: 'linear-gradient(180deg, #b8860b 0%, #d4a866 100%)',
  },
  {
    id: 'floor_tile', cat: 'floor', name: 'あおい タイル', price: 15, theme: 'boy',
    roomImg: '../assets/images/Rooms/floors/floor_tile_blue.png',
    floorGrad: 'repeating-linear-gradient(90deg, #b3d9ff 0px, #b3d9ff 28px, #90c4f0 28px, #90c4f0 30px)',
  },
  {
    id: 'floor_pink', cat: 'floor', name: 'ふわふわ カーペット', price: 15, theme: 'girl',
    roomImg: '../assets/images/Rooms/floors/floor_carpet_pink.png',
    floorGrad: 'linear-gradient(180deg, #f48fb1 0%, #fce4ec 100%)',
  },
  {
    id: 'floor_grass', cat: 'floor', name: 'しばふ', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/floors/floor_grass_green.png',
    floorGrad: 'linear-gradient(180deg, #66bb6a 0%, #a5d6a7 100%)',
  },
  {
    id: 'floor_check', cat: 'floor', name: 'チェック', price: 15, theme: 'all',
    roomImg: '../assets/images/Rooms/floors/floor_check_bw.png',
    floorGrad: 'repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%) 0 0 / 28px 28px',
  },
  {
    id: 'floor_carpet_beige', cat: 'floor', name: 'ベージュ カーペット', price: 20, theme: 'all',
    roomImg: '../assets/images/Rooms/floors/floor_carpet_beige.png',
    floorGrad: 'linear-gradient(180deg, #d4bc9a 0%, #c9b08a 100%)',
  },
  {
    id: 'floor_wood_herringbone', cat: 'floor', name: 'ヘリンボーン', price: 25, theme: 'all',
    roomImg: '../assets/images/Rooms/floors/floor_wood_herringbone.jpeg',
    floorGrad: 'linear-gradient(180deg, #c49a6c 0%, #b8895a 100%)',
  },

  // ══ かぐ (furniture) ══════════════════════════════════
  {
    id: 'furn_sofa_blue', cat: 'furn', name: 'あおい ソファ', price: 30, theme: 'boy',
    emoji: '🛋️', emojiSize: '72px',
    img: '../assets/images/room/items/furn_sofa_blue.png',
  },
  {
    id: 'furn_sofa_pink', cat: 'furn', name: 'ピンクの ソファ', price: 30, theme: 'girl',
    emoji: '🛋️', emojiSize: '72px',
    img: '../assets/images/room/items/furn_sofa_pink.png',
  },
  {
    id: 'furn_table', cat: 'furn', name: 'まるい テーブル', price: 25, theme: 'all',
    emoji: '🪑', emojiSize: '66px',
    img: '../assets/images/room/items/furn_table.png',
  },
  {
    id: 'furn_bookshelf', cat: 'furn', name: 'ほんだな', price: 25, theme: 'all',
    emoji: '📚', emojiSize: '66px',
    img: '../assets/images/room/items/furn_bookshelf.png',
  },
  {
    id: 'furn_tv', cat: 'furn', name: 'テレビ', price: 40, theme: 'all',
    emoji: '📺', emojiSize: '72px',
    img: '../assets/images/room/items/furn_tv.png',
  },

  // ══ かざり (decoration) ════════════════════════════════
  {
    id: 'deco_cactus', cat: 'deco', name: 'サボテン', price: 10, theme: 'all',
    emoji: '🌵', emojiSize: '52px',
    img: '../assets/images/room/items/deco_cactus.png',
  },
  {
    id: 'deco_bear', cat: 'deco', name: 'くまの ぬいぐるみ', price: 10, theme: 'all',
    emoji: '🧸', emojiSize: '52px',
    img: '../assets/images/room/items/deco_bear.png',
  },
  {
    id: 'deco_rocket', cat: 'deco', name: 'ロケット', price: 15, theme: 'boy',
    emoji: '🚀', emojiSize: '52px',
    img: '../assets/images/room/items/deco_rocket.png',
  },
  {
    id: 'deco_unicorn', cat: 'deco', name: 'ユニコーン', price: 15, theme: 'girl',
    emoji: '🦄', emojiSize: '52px',
    img: '../assets/images/room/items/deco_unicorn.png',
  },
  {
    id: 'deco_rainbow', cat: 'deco', name: 'にじ', price: 10, theme: 'all',
    emoji: '🌈', emojiSize: '52px',
    img: '../assets/images/room/items/deco_rainbow.png',
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
