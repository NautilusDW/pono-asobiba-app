// ─── ポノのおへや: アイテム定義 ───────────────────────────
// cat: 'wall'=壁紙, 'floor'=床, 'furn'=家具, 'deco'=かざり
// img: 実際のPNG画像パス（未用意の場合は emoji で代替表示）
// wallGrad/floorGrad: wallとfloor背景のCSS値（グラジェントフォールバック）
// theme: 'boy'|'girl'|'all'
//
// ── シームレステクスチャ対応フィールド ──
// tileImage: シームレスPNGのパス（例: '../assets/textures/wood_seamless.png'）
// tileSize:  background-size 値（例: '128px', '256px 128px'）省略時は '200px'
// ※ tileImage が指定されていると wallGrad/floorGrad より優先してタイリング表示される
// ※ tools/make_seamless.py で既存画像をシームレス化 → assets/textures/ に配置

const ROOM_AREAS = [
  { id: 'living',  name: 'リビング',   emoji: '🏠', cost: 0   },
  { id: 'bedroom', name: 'しんしつ',   emoji: '🛏️', cost: 80  },
  { id: 'kitchen', name: 'だいどころ', emoji: '🍳', cost: 150 },
  { id: 'garden',  name: 'にわ',       emoji: '🌳', cost: 200 },
];

const ROOM_ITEMS = [
  // ══ かべがみ (wallpaper) ══════════════════════════════
  {
    id: 'wall_sky', cat: 'wall', name: 'そらいろ', price: 15, theme: 'all',
    emoji: '☁️',
    wallGrad: 'linear-gradient(180deg, #87ceeb 0%, #c8e6ff 100%)',
    img: '../assets/images/room/bg/wall_sky.png',
  },
  {
    id: 'wall_stars', cat: 'wall', name: 'ほしぞら', price: 15, theme: 'boy',
    emoji: '⭐',
    wallGrad: 'linear-gradient(180deg, #0d1b3e 0%, #1a3080 100%)',
    img: '../assets/images/room/bg/wall_stars.png',
  },
  {
    id: 'wall_pink', cat: 'wall', name: 'ピンクの かべ', price: 15, theme: 'girl',
    emoji: '🌸',
    wallGrad: 'linear-gradient(180deg, #f8c8df 0%, #fce4ec 100%)',
    img: '../assets/images/room/bg/wall_pink.png',
  },
  {
    id: 'wall_forest', cat: 'wall', name: 'もりの かべ', price: 15, theme: 'all',
    emoji: '🌿',
    wallGrad: 'linear-gradient(180deg, #a5d6a7 0%, #c8e6c9 100%)',
    img: '../assets/images/room/bg/wall_forest.png',
  },
  {
    id: 'wall_yellow', cat: 'wall', name: 'おひさまいろ', price: 15, theme: 'all',
    emoji: '☀️',
    wallGrad: 'linear-gradient(180deg, #fff176 0%, #fffde7 100%)',
    img: '../assets/images/room/bg/wall_yellow.png',
  },

  // ══ ゆか (flooring) ═════════════════════════════════
  {
    id: 'floor_wood', cat: 'floor', name: 'もくめの ゆか', price: 15, theme: 'all',
    emoji: '🪵',
    floorGrad: 'linear-gradient(180deg, #b8860b 0%, #d4a866 100%)',
    img: '../assets/images/room/bg/floor_wood.png',
    tileImage: '../assets/textures/TIle01.png',
    tileSize: '256px',
  },
  {
    id: 'floor_tile', cat: 'floor', name: 'あおい タイル', price: 15, theme: 'boy',
    emoji: '🔷',
    floorGrad: 'repeating-linear-gradient(90deg, #b3d9ff 0px, #b3d9ff 28px, #90c4f0 28px, #90c4f0 30px)',
    img: '../assets/images/room/bg/floor_tile.png',
  },
  {
    id: 'floor_pink', cat: 'floor', name: 'ふわふわ カーペット', price: 15, theme: 'girl',
    emoji: '🎀',
    floorGrad: 'linear-gradient(180deg, #f48fb1 0%, #fce4ec 100%)',
    img: '../assets/images/room/bg/floor_pink.png',
  },
  {
    id: 'floor_grass', cat: 'floor', name: 'しばふ', price: 15, theme: 'all',
    emoji: '🌿',
    floorGrad: 'linear-gradient(180deg, #66bb6a 0%, #a5d6a7 100%)',
    img: '../assets/images/room/bg/floor_grass.png',
  },
  {
    id: 'floor_check', cat: 'floor', name: 'チェック', price: 15, theme: 'all',
    emoji: '🔲',
    floorGrad: 'repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%) 0 0 / 28px 28px',
    img: '../assets/images/room/bg/floor_check.png',
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
