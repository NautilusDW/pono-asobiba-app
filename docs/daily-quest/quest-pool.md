# Daily Quest お題プール仕様書

> Phase 2-4 の実装エージェントが参照する `QUEST_POOL` の確定リスト + 決定的選定アルゴリズム。

## 確定 QUEST_POOL

```js
const QUEST_POOL = [
  { id: 'maze',     label: 'めいろ',       href: 'maze/',       eligible: () => true },
  { id: 'quizland', label: 'クイズランド',  href: 'quizland/',   eligible: () => true },
  { id: 'puzzle',   label: 'パズル',       href: 'puzzle/',     eligible: () => true },
  { id: 'oto',      label: 'おとあそび',   href: 'oto/',        eligible: () => true },
  { id: 'bento',    label: 'おべんとう',   href: 'bento/',      eligible: () => isBentoTutorialComplete() },
];
```

### 候補一覧

| id | label_ja | href | 候補条件 |
| --- | --- | --- | --- |
| `maze` | めいろ | `maze/` | 常時 OK |
| `quizland` | クイズランド | `quizland/` | 常時 OK |
| `puzzle` | パズル | `puzzle/` | 常時 OK |
| `oto` | おとあそび | `oto/` | 常時 OK |
| `bento` | おべんとう | `bento/` | sk-intro チュートリアル完了済の端末のみ |

bento を eligibility gate するのは、 sk-intro (3色グループ説明) を未通過の子供にいきなり「今日のお題: おべんとう」 を出すと UX が崩れるため。

---

## `isBentoTutorialComplete()` 実装方針

### 既存 LS マーカー (grep 結果)

`bento/index.html` で確認済みの **永続化マーカー**:

| Key | Value | 書込み箇所 | 意味 |
| --- | --- | --- | --- |
| `bento_sk_intro_done` | `'1'` | `bento/index.html:5430` | sk-intro モーダル (3色グループ説明) 通過済 |
| `bento_tutorial_done_v1` | `'1'` | `bento/index.html:5816` (`BENTO_TUTORIAL_STORAGE_KEY`) | 本編 10 ステップチュートリアル完了済 |
| `bento_tut_seen_v2` | `'1'` | `bento/index.html:5431` | 旧 sk-intro 通過 (v2) |

### 推奨実装

```js
function isBentoTutorialComplete() {
  try {
    // sk-intro 通過のみで OK (本編 10 ステップ完了まで待たない)。
    // sk-intro を見ていれば、 3色グループの概念は理解しているのでデイリークエストの対象にしてよい。
    return localStorage.getItem('bento_sk_intro_done') === '1';
  } catch (_) {
    // private mode で LS 取得失敗 → 安全側に倒して not-eligible
    return false;
  }
}
```

### 採用理由

- `bento_sk_intro_done` は sk-intro 通過 (10 ステップの 5/10 程度) で立つマーカー。 ここまで進んだ子供はおかず操作を一度は経験している。
- `bento_tutorial_done_v1` (本編完了) まで待つと 「sk-intro 通過したけど本編クリア前」 の中間状態の子供が永遠に bento お題を引けない。
- 新規 LS マーカーは追加不要 (既存マーカーで十分)。

### 万一マーカーが取得できない場合

`localStorage.getItem()` が例外を投げる (private mode 等) → `false` を返して候補から除外。 残り 4 候補 (maze/quizland/puzzle/oto) で十分プールが回る。

---

## 決定的選定アルゴリズム

同じ JST 日付なら端末跨いで同じお題を引く (家庭内で iPad と iPhone 両方使う場合の体験統一)。

### 擬似コード

```js
function pickToday() {
  const jstDate = todayKeyJST(); // "2026-06-25"
  const seed = fnv1aHash(jstDate);
  const eligible = QUEST_POOL.filter(q => q.eligible());
  if (eligible.length === 0) {
    // 全候補が eligible=false (理論上起きない、 maze は常時 true なので)
    return QUEST_POOL[0]; // フェイルセーフで maze
  }
  const idx = mulberry32(seed)() % eligible.length;
  return eligible[idx];
}
```

### JST 日付計算

`new Date()` だけだと端末 TZ に依存して家庭内でズレるので、 UTC 取得 → +9h オフセット:

```js
function todayKeyJST() {
  const now = new Date();
  // UTC ms に +9h を足して JST に揃え、 UTC 取得関数で日付要素を抜く
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

> 既存 `common/acorns.js` の `todayKey()` は `new Date()` の getFullYear/getMonth/getDate を使う **端末ローカル TZ 依存** 実装。 デイリークエストは家庭内統一の方が UX 価値が高いので、 別関数 `todayKeyJST()` を新設する。
> LS の `date` フィールドにも `todayKeyJST()` の戻り値を保存する。

### FNV-1a Hash (32-bit)

```js
function fnv1aHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
```

### Mulberry32 PRNG (シード固定の決定的乱数)

```js
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

---

## 選定フロー (起動時)

```
1. LS から pono_daily_quest_v1 を読む
2. record が無い / 壊れている / schemaVersion mismatch
   → pickToday() で新規選定 → 保存
3. record.date < todayKeyJST()
   → 日付ロールオーバー → pickToday() で新規選定 → 保存
4. record.date > todayKeyJST() (親が時計を未来に弄った)
   → 不正検知 → 破棄して pickToday() で新規選定
5. record.date === todayKeyJST()
   → そのまま採用 (clearedAt/bonusUsedAt の状態維持)
```

---

## 連続日防止 (将来拡張)

v1 では考慮しない (毎日 5 候補からランダムなので連続確率 1/5 = 20%、 子供向けには許容範囲)。
連続防止が必要になったら昨日の `questId` を比較して reroll する拡張余地を残す。
