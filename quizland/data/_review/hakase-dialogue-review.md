# ふくろうはかせ セリフシステム レビュー

## Overall verdict
- 🟢 採用可

実装は仕様 (8 カテゴリ + 6 関数 + 5 ワイヤリング) を完全に満たしている。
inline JS は構文 OK、saved-layout 互換 OK、preview/full 未変更、sw.js は 691。
動作シミュレーションは全シナリオ整合。
軽微な視覚的注意 (吹き出し 235×63 + nowrap) は機能影響なしの 🔵 情報のみ。

## 1. Dialogue categories
| カテゴリ | 行数 | line 範囲 |
|---|---|---|
| `HAKASE_DIALOGUE.problem.general` | 6 行 | quizland/index.html:1187-1194 |
| `HAKASE_DIALOGUE.problem.byCategory` | 7 件 (order_color, count_total, shape_name, opposite, trivia, weather, body) | :1195-1203 |
| `HAKASE_DIALOGUE.hint1` | 5 行 | :1205-1211 |
| `HAKASE_DIALOGUE.hint2Fallback` | 4 行 | :1212-1217 |
| `HAKASE_DIALOGUE.correct` | 10 行 | :1218-1229 |
| `HAKASE_DIALOGUE.rarePraise` | 6 行 | :1230-1237 |
| `HAKASE_DIALOGUE.wrong` | 8 行 | :1238-1247 |
| `HAKASE_DIALOGUE.consecutiveMiss` | 6 行 | :1248-1255 |
| `HAKASE_DIALOGUE.clear.perfect/good/okay/tryAgain` | 3+3+3+3 = 12 行 | :1256-1277 |

全カテゴリ存在、行数一致。

## 2. Functions defined
| 関数 | 行 | 正しさ |
|---|---|---|
| `pickRandom(arr)` | quizland/index.html:1284 | `arr[Math.floor(Math.random()*arr.length)]` — 標準実装 ✓ |
| `setHakaseDialogue(text)` | :1291-1294 | `#char-hint-text` の `textContent` を更新、null guard あり ✓ |
| `showProblemDialogue(question)` | :1296-1309 | `_hintLevel=0` リセット、`question.category || _cat || type` で 50% カテゴリ別 / 50% general、`HINT_AUTO_DELAY_MS=5000` で `showHint1` を予約 ✓ |
| `showHint1()` | :1311-1314 | `_hintLevel=1`、`pickRandom(hint1)` ✓ |
| `showHint2(question)` | :1316-1320 | `_hintLevel=2`、`question.hint` を優先、無ければ `hint2Fallback` ✓ |
| `showCorrectDialogue()` | :1322-1329 | `_consecutiveMisses=0` リセット、`Math.random() < 0.1` で `rarePraise`、それ以外は `correct` ✓ |
| `showWrongDialogue()` | :1331-1337 | `_consecutiveMisses++`、`>= 2` で `consecutiveMiss`、未満で `wrong` ✓ |
| `showClearDialogue(correctCnt, totalCnt)` | :1339-1347 | `ratio = correct/total`; `=1 → perfect`, `≥0.8 → good`, `≥0.6 → okay`, else `tryAgain` ✓ |
| `_bindHakaseBubbleClick()` | :1350-1357 | `#char-hint-bubble` に click → `showHint2(currentQ)` バインド、cursor:pointer 設定 ✓ |

## 3. Wiring
| 呼び出し元 | 行 | 状態 |
|---|---|---|
| `loadQuestion(q)` 末尾で `showProblemDialogue(q)` | quizland/index.html:1760 | ✓ renderChoices/updateHUD/setupNarration の後で呼ばれている |
| `onChoice` 正解分岐で `showCorrectDialogue()` | :1819 | ✓ `showFeedback('やったー！')` の直後 |
| `onChoice` 不正解分岐で `showWrongDialogue()` | :1848 | ✓ `showFeedback('もういっかい！', true)` の直後 |
| `nextQuestion()` で `clearTimeout(_autoHintTimer)` | :1884 | ✓ 5秒タイマーのクリーンアップ |
| `showResult()` で `clearTimeout(_autoHintTimer)` + `showClearDialogue(correctCount, TOTAL_Q)` | :1897-1898 | ✓ |
| 吹き出しクリックで `showHint2(currentQ)` | :1354-1356 | ✓ DOMContentLoaded gating あり (:1358-1362) |

## 4. State management
- `_consecutiveMisses` は `showCorrectDialogue` (:1323) で 0 にリセット ✓
- `_hintLevel` は `showProblemDialogue` (:1297) で 0 にリセット ✓
- `_autoHintTimer` は次の問題開始 (`nextQuestion` :1884) と結果表示 (`showResult` :1897) でクリア、新しい問題開始時には `clearTimeout(_autoHintTimer)` の後に `setTimeout(...)` で再セット (:1305-1308) ✓
- 5秒タイマー発火時は `if (_hintLevel === 0)` チェックで、既にユーザーがヒント2へ進んでいたら hint1 で上書きしない ✓

## 5. DOM integrity
- `.char-hint` クラス保持: ✓ (quizland/index.html:1119, saved-layout.json:129 の `.char-hint|0` セレクタと整合)
- バブルの id: `id="char-hint-bubble"` ✓ (:1119)
- テキスト span の id: `id="char-hint-text"` ✓ (:1119)
- `QZ_RESIZABLE_SELECTORS` 内 `.char-hint` (:1409) に変更なし、layout-editor との互換維持 ✓
- 旧 `id="char-hint"` を `char-hint-bubble` に rename しているが、コードベース内に旧 id を参照する箇所は無し (Grep で確認済み)

## 6. Inline JS
- 構文: ✓ (`new Function(scriptBody)` で PARSE_OK / 29644 chars / 1 inline script)
- 未定義参照なし: `currentQ`, `playlist`, `TOTAL_Q`, `correctCount` は全て関数の外側でクロージャ内に宣言済み (:1152-1156)
- `clearTimeout(null)` の安全呼び出し → 標準動作で no-op、問題なし

## 7. sw.js
- 691: ✓ (sw.js:4 `const CACHE_VERSION = 691;`)
- 実装者報告通り 690 → 691 にバンプ済み

## 8. Mental simulation
| ステップ | 期待 | 検証 |
|---|---|---|
| Q1 ロード | 問題セリフ表示 | `loadQuestion` (:1742) → `showProblemDialogue(q)` (:1760) → `setHakaseDialogue` (:1303) ✓ |
| 5 秒経過 | hint1 セリフ | `setTimeout` (:1306-1308) → `_hintLevel===0` 通過 → `showHint1()` ✓ |
| 吹き出しタップ | hint2 表示 | bubble click handler (:1354-1356) → `showHint2(currentQ)` → `q.hint` or fallback ✓ |
| 正解タップ | correct セリフ (1/10 で rarePraise) | `onChoice` (:1819) → `showCorrectDialogue()` ✓ |
| 次問ロード | 新問題セリフ | `nextQuestion` (:1883) → `clearTimeout` (:1884) → `loadQuestion(playlist[idx])` → `showProblemDialogue` ✓ |
| Q2 で誤答 (1回目) | wrong セリフ | `showWrongDialogue` で `_consecutiveMisses=1`、`< 2` なので `wrong` プール ✓ |
| Q2 で連続誤答 (2回目) | consecutiveMiss セリフ | `_consecutiveMisses=2`、`>=2` で `consecutiveMiss` プール ✓ |
| 正解 → リセット | カウンタ=0 | `showCorrectDialogue` :1323 ✓ |
| 5問終了, 4 正解 (80%) | clear.good セリフ | `showClearDialogue(4, 5)`: `ratio=0.8 ≥ 0.8` → `good` プール ✓ |

全シナリオ整合。視覚的に確認可能なバブル変化が各ステップで発生する。

## 9. Backward compat
- `showFeedback()` (黄色トースト) は `showCorrectDialogue/showWrongDialogue` 直前に呼ばれており保持: ✓ (:1818, :1847)
- `currentQ` は IIFE 内クロージャ変数 (:1156) で `loadQuestion` (:1743) で更新 → bubble click handler (:1355) からアクセス可能 ✓
- saved-layout.json の `.char-hint|0` セレクタは `.char-hint` クラスに対して適用、 id 変更の影響なし ✓
- `showDetail` (💡 詳細ポップアップ) (:1854) はそのまま動作 ✓

## 10. preview/full untouched
- ✓ `git status quizland/preview/full/index.html` が空 (未変更)
- 直近の touch コミットは `2b76a53` (5月3日) でこのタスクとは無関係

## Issues
- 🔵 **(情報のみ)** `.char-hint` は `width: 235px; height: 63px; white-space: nowrap;` (quizland/index.html:653-666) なので、長いセリフ (例: `'ぜんもん せいかい！ きみは もう、もりの なぞなぞマスターじゃな！'` ≈ 35文字) は右にはみ出す可能性。 機能影響なしだが、見た目を整えたい場合は CSS で `white-space: normal; line-height: 1.2; padding: 4px 12px;` に切り替え検討。
- 🔵 **(情報のみ)** `byCategory` 内に `shape_name` (:1198), `opposite` (:1199), `trivia` (:1200), `weather` (:1201), `body` (:1202) は存在するが、 `count_total` (:1197) も含まれていて 7 件で仕様一致。 ただし `inspire`/`know` モード両方で全て使われるかは念のため再確認推奨 (実害なし)。
- 🔵 **(情報のみ)** `clear.perfect` は `ratio === 1` (厳密一致) で発火。 5問中 5問正解 (5/5=1.0) で問題なし。

🔴 重大な問題なし。
🟡 軽微修正なし。

## Recommended deltas
- (任意・採用ブロックなし) `.char-hint` の `white-space: nowrap` を `normal` + `padding`/`line-height` 調整 → 長いクリアセリフが綺麗に折り返される。 採用可否は UX 判断。
- (任意) `setHakaseDialogue` に `el.title = text;` を追加すると、 はみ出した場合でも mouseover でフルテキストが見える (children 向けには優先度低)。
- 動作確認 E2E (5 問通しプレイ + 連続ミス + 5秒待機) を Playwright に追加すると今後のリグレッション検出に有効。
