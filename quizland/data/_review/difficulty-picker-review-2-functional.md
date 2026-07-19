# Difficulty Picker Review 2: Functional

## Overall verdict
- 🟢 **採用可** — すべての機能チェック (state mgmt / DIFF 定数バグ修正 / buildPlaylist 統合 / UI wiring / edge case ガード / 試験) が PASS。問題データも 7 カテゴリ × 各 Lv 8 問 = 56/56/56 = 168 で仕様通り。

## State management
| check | result |
|---|---|
| `selectedDifficulty` declaration | ✓ L1018 (`let selectedDifficulty = 'easy';`) — `let` で再代入可、初期値 `'easy'` |
| localStorage save | ✓ L1574 (`localStorage.setItem(DIFF_STORAGE_KEY, d)`、 try/catch 内) |
| localStorage restore | ✓ L1019-L1022 (起動時 try/catch で `getItem`、 `DIFF_LEVELS` 検証後に反映) |
| default 'easy' | ✓ L1018 (saved が無い/不正なら `'easy'` 維持) |
| invalid value guard | ✓ L1021 (`DIFF_LEVELS.indexOf(_saved) !== -1`) + L1572 (クリック時も `indexOf === -1` で return) |

## DIFF constants (bug fix verification)
| const | value | OK? |
|---|---|---|
| `DIFF_MIN_LEVEL.easy` | 1 | ✓ |
| `DIFF_MIN_LEVEL.normal` | 2 | ✓ (旧 `1` バグから修正) |
| `DIFF_MIN_LEVEL.hard` | 3 | ✓ |
| `DIFF_MAX_LEVEL.easy` | 1 | ✓ |
| `DIFF_MAX_LEVEL.normal` | 2 | ✓ |
| `DIFF_MAX_LEVEL.hard` | 3 | ✓ |
| `DIFF_LEVELS` | `['easy','normal','hard']` | ✓ L1014 |
| `DIFF_STORAGE_KEY` | `'pono_quizland_difficulty'` | ✓ L1017 |

`min === max` のため、 各難易度は単一レベル抽出 (`q.level >= minLv && q.level <= maxLv` で `q.level === N` と等価)。 旧コードの normal が Lv1+Lv2 を混ぜるバグは確実に解消。

## buildPlaylist pool size verification
buildPlaylist (L1188-L1202) が `selectedCategories` (mode-btn が決める) と `DIFF_MIN_LEVEL/MAX_LEVEL[selectedDifficulty]` で絞り込み、 各カテゴリから `perCat = ceil(5/cats)` 問抽出 → shuffle → 上位 5 問。

Node 計測スクリプトで pool 母数を実測:

| difficulty | mode | expected pool | actual pool | ✓ |
|---|---|---|---|---|
| easy   | inspire (3 cat) | 24 | **24** | ✓ |
| easy   | know    (4 cat) | 32 | **32** | ✓ |
| normal | inspire | 24 | **24** | ✓ |
| normal | know    | 32 | **32** | ✓ |
| hard   | inspire | 24 | **24** | ✓ |
| hard   | know    | 32 | **32** | ✓ |
| **TOTAL across 6** |  | **168** | **168** | ✓ |

(inspire = order_color/count_total/shape_name 各 8 問×3 lv = 24、 know = trivia/weather/body/opposite 各 8 問×4 cat ×1 lv = 32)

## UI wiring
- 3 buttons: L908-L910 (`data-diff="easy"` / `"normal"` / `"hard"`) — DOM 上に確実に存在。
- Click handler: L1569-L1577 で `querySelectorAll('.diff-btn').forEach` → 各ボタンに 1 つずつバインド (= 3 ハンドラ)。
- `refreshDiffActive()` (L1558-L1568): 全 `.diff-btn` を走査し、 一致するもののみ `is-active` クラス + `aria-pressed=true`、 他は外す + `false`。
- 初期化呼び出し: L1578 (`refreshDiffActive()`) — ロード時に必ず active クラスを付与する。
- mode-btn ハンドラ (L1540-L1555): `selectedMode` / `selectedCategories` のみ更新し、 `selectedDifficulty` は触らない (grep で `selectedDifficulty =` は L1018, L1021, L1573 の 3 箇所のみ確認済)。
- result-cat-btn (L1592-L1595) / hud-back-btn (L1581-L1584): mode-screen 表示のみ。 `selectedDifficulty` 未変更で OK。 戻ったとき pill の active は前回のまま (DOM 上の class は保持される、 mode-screen は単に `hidden` を付け外しするだけ)。

## Edge cases
- **localStorage に 'medium' などの無効値**: L1021 の `DIFF_LEVELS.indexOf` ガードで弾かれ、 `selectedDifficulty` は初期値 `'easy'` のまま。 ✓
- **localStorage 不可環境 (Safari private mode 等)**: L1019 try/catch で例外を握りつぶし、 デフォルト `'easy'` に。 setItem 側も L1574 try/catch でガード。 ✓
- **難易度未選択で mode タップ**: 初期値 `'easy'` (or 前回 saved 値) が即適用される。 buildPlaylist が空にはならない。 ✓
- **特定カテゴリに該当 Lv の問題が 0 個**: L1199 `if (pool.length > 0)` で空プール時はスキップ → 他カテゴリで補完。 全カテゴリ全 Lv で 8 問あるので現状は到達しないが、 将来の追加にも耐性あり。 ✓
- **無効 `data-diff` でクリック**: L1572 で `indexOf === -1` なら早期 return → state 不変。 ✓
- **複数同時 setAttribute**: `aria-pressed` は L1562/L1565 で `'true'`/`'false'` 文字列を確実に同期。 ✓

## Tests
- inline JS syntax: ✓ (Node `new Function(joinedScripts)` で OK、 21158 文字、 1 ブロック)
- orphan refs: なし。 grep で `selectedDifficulty` / `DIFF_*` / `diff-btn` / `diff-row` / `refreshDiffActive` を全 grep し、 全て CSS / DOM / JS で対応する定義が見つかる。
- sw.js `CACHE_VERSION = 673`: ✓ (sw.js L4: `const CACHE_VERSION = 673;`)

## Question count breakdown
(Node スクリプトで `QUIZLAND_QUESTIONS` を直接ロードして集計)

| category | Lv1 | Lv2 | Lv3 | total |
|---|---|---|---|---|
| order_color | 8 | 8 | 8 | 24 |
| count_total | 8 | 8 | 8 | 24 |
| shape_name  | 8 | 8 | 8 | 24 |
| weather     | 8 | 8 | 8 | 24 |
| opposite    | 8 | 8 | 8 | 24 |
| trivia      | 8 | 8 | 8 | 24 |
| body        | 8 | 8 | 8 | 24 |
| **TOTAL**   | **56** | **56** | **56** | **168** |

仕様 (各カテゴリ各レベル 8 問・全 168 問) と完全一致。

## Issues found
- なし (機能面で重大リグレッション無し)。
- 軽微な観察:
  - 同一画面に「やさしい」が 2 箇所 (mode-btn の inspire と diff-btn の easy) 存在。 機能上は問題ないが UX 観点で実装者も指摘済み (重点 3)。 **Visual Reviewer の判定領域**。
  - a11y: `role="radiogroup"` / `role="radio"` を使えばよりセマンティック。 現状は `aria-pressed` で toggle group を表現。 子供向けタッチ UI なので致命的ではない。
  - mode を切り替えても difficulty pill の active 状態は保持される (仕様通り、 localStorage と DOM class が両方残る)。

## Recommended deltas
- (採用可) **そのままマージ可**。 機能要件はすべて満たし、 既存バグ (`DIFF_MIN_LEVEL.normal=1`) も適切に修正されている。
- もし将来「mode を切り替えたら難易度をリセット」したい仕様変更があれば、 mode-btn ハンドラに `selectedDifficulty = 'easy'; refreshDiffActive(); localStorage.removeItem(DIFF_STORAGE_KEY);` を追加すればよい (現状は意図的に保持)。
- a11y を強化するなら `.diff-row[role=radiogroup]` + 各 `.diff-btn[role=radio][aria-checked]` への置換が候補だが、 必須ではない。

---
**最終判定**: 🟢 採用可 — Functional 観点で問題なし、 168 問 × 6 mode×diff 組み合わせの全到達性も保証。
