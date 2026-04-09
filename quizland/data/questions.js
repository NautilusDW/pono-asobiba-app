// ─── Quizland 問題データ ──────────────────────────────
// Phase 1 MVP: order_color / count_total / shape_name の 3 タイプ、各 5 問
// level: 1(やさしい) / 2(ふつう) / 3(むずかしい)
//
// - order_color: 色チップが並ぶ → 「ひだりから N ばんめは なにいろ？」
//   items: 並びの色配列、answer: 選択肢インデックス、choices: 色名配列
// - count_total: 絵が N 個並ぶ → 「いくつ あるかな？」
//   item: 絵の word ID、count: 個数、answer: 選択肢インデックス、choices: 数字配列
// - shape_name: 1 つの形を表示 → 「これは どんな かたち？」
//   shape: 形名、answer: 選択肢インデックス、choices: 形名配列

const QUIZLAND_QUESTIONS = {
  order_color: [
    {
      level: 1,
      type: 'order_color',
      items: ['red', 'blue', 'yellow'],
      q: 'まんなかは なにいろ？',
      answer: 1,
      choices: ['red', 'blue', 'yellow', 'green']
    },
    {
      level: 1,
      type: 'order_color',
      items: ['green', 'red', 'yellow'],
      q: 'ひだりから 1ばんめは なにいろ？',
      answer: 3,
      choices: ['red', 'yellow', 'blue', 'green']
    },
    {
      level: 2,
      type: 'order_color',
      items: ['red', 'blue', 'yellow', 'green'],
      q: 'ひだりから 3ばんめは なにいろ？',
      answer: 1,
      choices: ['red', 'yellow', 'blue', 'green']
    },
    {
      level: 2,
      type: 'order_color',
      items: ['pink', 'blue', 'orange', 'yellow'],
      q: 'みぎから 1ばんめは なにいろ？',
      answer: 2,
      choices: ['pink', 'blue', 'yellow', 'orange']
    },
    {
      level: 3,
      type: 'order_color',
      items: ['purple', 'red', 'green', 'blue', 'yellow'],
      q: 'まんなかは なにいろ？',
      answer: 2,
      choices: ['red', 'blue', 'green', 'yellow']
    }
  ],

  count_total: [
    {
      level: 1,
      type: 'count_total',
      item: 'ringo',
      count: 2,
      q: 'りんごは いくつ？',
      answer: 0,
      choices: [2, 3, 4, 5]
    },
    {
      level: 1,
      type: 'count_total',
      item: 'ichigo',
      count: 3,
      q: 'いちごは いくつ？',
      answer: 1,
      choices: [2, 3, 4, 5]
    },
    {
      level: 2,
      type: 'count_total',
      item: 'hoshi',
      count: 4,
      q: 'おほしさまは いくつ？',
      answer: 1,
      choices: [3, 4, 5, 6]
    },
    {
      level: 2,
      type: 'count_total',
      item: 'hana',
      count: 5,
      q: 'おはなは いくつ？',
      answer: 2,
      choices: [3, 4, 5, 6]
    },
    {
      level: 3,
      type: 'count_total',
      item: 'mikan',
      count: 7,
      q: 'みかんは いくつ？',
      answer: 1,
      choices: [6, 7, 8, 9]
    }
  ],

  shape_name: [
    {
      level: 1,
      type: 'shape_name',
      shape: 'circle',
      q: 'これは どんな かたち？',
      answer: 0,
      choices: ['まる', 'しかく', 'さんかく', 'ほし']
    },
    {
      level: 1,
      type: 'shape_name',
      shape: 'square',
      q: 'これは どんな かたち？',
      answer: 1,
      choices: ['まる', 'しかく', 'さんかく', 'ほし']
    },
    {
      level: 1,
      type: 'shape_name',
      shape: 'triangle',
      q: 'これは どんな かたち？',
      answer: 2,
      choices: ['まる', 'しかく', 'さんかく', 'ほし']
    },
    {
      level: 2,
      type: 'shape_name',
      shape: 'star',
      q: 'これは どんな かたち？',
      answer: 3,
      choices: ['まる', 'しかく', 'さんかく', 'ほし']
    },
    {
      level: 2,
      type: 'shape_name',
      shape: 'heart',
      q: 'これは どんな かたち？',
      answer: 1,
      choices: ['ほし', 'はーと', 'さんかく', 'まる']
    }
  ]
};

// カラーパレット（CSS 描画用）
const QUIZLAND_COLORS = {
  red:    { name: 'あか',    code: '#EF4444' },
  blue:   { name: 'あお',    code: '#3B82F6' },
  yellow: { name: 'きいろ',  code: '#FBBF24' },
  green:  { name: 'みどり',  code: '#10B981' },
  pink:   { name: 'ピンク',  code: '#EC4899' },
  orange: { name: 'オレンジ',code: '#F97316' },
  purple: { name: 'むらさき',code: '#8B5CF6' },
  cyan:   { name: 'みずいろ',code: '#06B6D4' }
};

// 絵パス（count_total 用、wordmatch の画像を流用）
const QUIZLAND_WORD_IMG = '../assets/images/word/';
