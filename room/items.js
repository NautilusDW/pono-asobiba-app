// ─── ポノのおへや: アイテム定義 ───────────────────────────
// cat: 'wall'=壁紙, 'floor'=床, 'furn'=家具, 'deco'=かざり
// theme: 'boy'|'girl'|'all'
//
// ── 壁・床テクスチャ用フィールド ──
// roomImg:   アイソメPNGのパス（100%×100%で表示、SVGマスクで切り抜き）
// tileImage: シームレスPNG（roomImgがない場合）
// wallGrad/floorGrad: CSSグラジェント（フォールバック）

const ROOM_AREAS = [
  { id: 'living',  name: 'リビング',   emoji: '🏠', cost: 0   },
  { id: 'bedroom', name: 'しんしつ',   emoji: '🛏️', cost: 80  },
  { id: 'kitchen', name: 'だいどころ', emoji: '🍳', cost: 150 },
  { id: 'garden',  name: 'にわ',       emoji: '🌳', cost: 200 },
];

const ROOM_ITEMS = [
  // アイソメ対応アイテムは今後追加予定
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
