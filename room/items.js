// ─── ポノのおへや: アイテム定義 ───────────────────────────
// cat: 'wall'=壁紙, 'floor'=床, 'furn'=家具, 'deco'=かざり
// theme: 'boy'|'girl'|'all'
//
// アイソメ構成: wallGrad/floorGrad で .room-wall/.room-floor を塗る
// → SVGマスクが壁/床エリアだけ切り抜くので座標調整不要
// roomImg: アイソメ対応PNGが用意できたら追加予定

const ROOM_AREAS = [
  { id: 'living',  name: 'リビング',   emoji: '🏠', cost: 0   },
  { id: 'bedroom', name: 'しんしつ',   emoji: '🛏️', cost: 80  },
  { id: 'kitchen', name: 'だいどころ', emoji: '🍳', cost: 150 },
  { id: 'garden',  name: 'にわ',       emoji: '🌳', cost: 200 },
];

const ROOM_ITEMS = [

  // ══ かべがみ ══════════════════════════════════════════
  {
    id: 'wall_sky', cat: 'wall', name: 'そらいろ', price: 10, theme: 'all',
    wallGrad: 'linear-gradient(160deg, #aee4f7 0%, #d6f0fb 100%)',
  },
  {
    id: 'wall_pink', cat: 'wall', name: 'ピンク', price: 10, theme: 'girl',
    wallGrad: 'linear-gradient(160deg, #f9c8de 0%, #fde8f2 100%)',
  },
  {
    id: 'wall_mint', cat: 'wall', name: 'ミント', price: 10, theme: 'all',
    wallGrad: 'linear-gradient(160deg, #b2ead6 0%, #d8f5ea 100%)',
  },
  {
    id: 'wall_yellow', cat: 'wall', name: 'おひさま', price: 10, theme: 'all',
    wallGrad: 'linear-gradient(160deg, #ffe98a 0%, #fff7c2 100%)',
  },
  {
    id: 'wall_lavender', cat: 'wall', name: 'ラベンダー', price: 10, theme: 'girl',
    wallGrad: 'linear-gradient(160deg, #d4b8f0 0%, #ece2fa 100%)',
  },
  {
    id: 'wall_stars', cat: 'wall', name: 'ほしぞら', price: 20, theme: 'boy',
    wallGrad: 'linear-gradient(160deg, #0d2350 0%, #1a3a7a 100%)',
  },
  {
    id: 'wall_clouds', cat: 'wall', name: 'くももよう', price: 20, theme: 'all',
    wallGrad: 'linear-gradient(160deg, #c8e8fa 0%, #eef7fd 100%)',
  },
  {
    id: 'wall_rainbow', cat: 'wall', name: 'にじいろ', price: 25, theme: 'all',
    wallGrad: 'linear-gradient(160deg, #ffb3ba 0%, #ffdfba 33%, #ffffba 66%, #baffc9 100%)',
  },
  {
    id: 'wall_ocean', cat: 'wall', name: 'うみ', price: 20, theme: 'boy',
    wallGrad: 'linear-gradient(160deg, #0077b6 0%, #00b4d8 60%, #90e0ef 100%)',
  },
  {
    id: 'wall_forest', cat: 'wall', name: 'もり', price: 20, theme: 'all',
    wallGrad: 'linear-gradient(160deg, #2d6a4f 0%, #52b788 60%, #95d5b2 100%)',
  },

  // ══ ゆか ═════════════════════════════════════════════
  {
    id: 'floor_wood', cat: 'floor', name: 'もくめ', price: 10, theme: 'all',
    floorGrad: 'repeating-linear-gradient(90deg, #c8994a 0px, #c8994a 38px, #b8853a 38px, #b8853a 40px)',
  },
  {
    id: 'floor_carpet_pink', cat: 'floor', name: 'ピンクカーペット', price: 10, theme: 'girl',
    floorGrad: 'linear-gradient(135deg, #f9c8de 25%, #fde8f2 25%, #fde8f2 50%, #f9c8de 50%, #f9c8de 75%, #fde8f2 75%)',
  },
  {
    id: 'floor_grass', cat: 'floor', name: 'しばふ', price: 10, theme: 'all',
    floorGrad: 'repeating-linear-gradient(120deg, #52b788 0px, #52b788 18px, #40916c 18px, #40916c 20px)',
  },
  {
    id: 'floor_tile_blue', cat: 'floor', name: 'あおいタイル', price: 10, theme: 'boy',
    floorGrad: 'repeating-conic-gradient(#90caf9 0% 25%, #bbdefb 0% 50%) 0 0 / 28px 28px',
  },
  {
    id: 'floor_check', cat: 'floor', name: 'チェック', price: 10, theme: 'all',
    floorGrad: 'repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%) 0 0 / 28px 28px',
  },
  {
    id: 'floor_marble', cat: 'floor', name: 'マーブル', price: 20, theme: 'all',
    floorGrad: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 40%, #f5f5f5 60%, #bdbdbd 100%)',
  },
  {
    id: 'floor_star', cat: 'floor', name: 'ほしがら', price: 20, theme: 'all',
    floorGrad: 'repeating-conic-gradient(#ffe082 0% 25%, #fff9c4 0% 50%) 0 0 / 24px 24px',
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
