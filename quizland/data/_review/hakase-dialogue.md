# ふくろうはかせ Dialogue System — Implementation Report

## 概要
quizland/index.html の `.char-hint` 吹き出しを、静的な「ヒント！」表示から
ふくろうはかせのキャラクター動的セリフシステムへ置換。8カテゴリのセリフを実装。

## sw.js Version
- **Before**: 690 (直近の auto-commit で既に 690)
- **After**: 691 (今回の本変更でバンプ)
- 注: タスク指示は「689 → 690」だったが、実ファイルは別コミットで既に 690 に達していたため、AGENTS.md の `sw.js bump rule` (内容変更時に必ずバンプ) に従い 690 → 691 とした。

## ファイル変更
| ファイル | 変更概要 |
|---|---|
| `d:/AppDevelopment/pono-asobiba-app/quizland/index.html` | 吹き出し HTML 修正 + セリフ定数 + 6関数 + ワイヤリング |
| `d:/AppDevelopment/pono-asobiba-app/sw.js` | CACHE_VERSION 690 → 691 |

## HTML 変更
- L1119: `<div class="char-hint" id="char-hint">ヒント！</div>`
  → `<div class="char-hint" id="char-hint-bubble"><span id="char-hint-text">ヒント！</span></div>`
- `.char-hint` クラスは保持 (saved-layout.json の selector との互換維持)

## セリフ定数 (quizland/index.html)
- `HAKASE_DIALOGUE`              … L1186〜L1283 (約 98 行)
  - `problem.general` (6種), `problem.byCategory` (7種)
  - `hint1` (5種), `hint2Fallback` (4種)
  - `correct` (10種), `rarePraise` (6種)
  - `wrong` (8種), `consecutiveMiss` (6種)
  - `clear.perfect` / `good` / `okay` / `tryAgain` (各 3種)
- `RARE_PRAISE_CHANCE = 0.1`     … L1285
- `CONSECUTIVE_MISS_THRESHOLD = 2` … L1286
- `HINT_AUTO_DELAY_MS = 5000`    … L1287
- `pickRandom(arr)`              … L1289

## ダイアログ関数 (quizland/index.html)
| 関数 | 行 | 役割 |
|---|---|---|
| `setHakaseDialogue(text)`        | L1296 | 吹き出し DOM テキスト更新 |
| `showProblemDialogue(question)`  | L1301 | ① 問題表示時 (5秒タイマー起動) |
| `showHint1()`                    | L1313 | ② ヒント1段階目 |
| `showHint2(question)`            | L1318 | ③ ヒント2段階目 (question.hint or fallback) |
| `showCorrectDialogue()`          | L1324 | ④ 正解時 + 1/10 で⑤レア褒め (連続ミスリセット) |
| `showWrongDialogue()`            | L1333 | ⑥ 不正解時 + 連続2回で⑦連続ミス |
| `showClearDialogue(correct,tot)` | L1341 | ⑧ クリア時 (正解率分岐) |
| `_bindHakaseBubbleClick()`       | L1352 | 吹き出しクリックでヒント2を表示 |

## ワイヤリング (既存ゲームフローへの埋め込み)
| 呼び出し元 | 行 | 内容 |
|---|---|---|
| `loadQuestion(q)`                | L1758 | `showProblemDialogue(q)` ※renderChoices/updateHUD/setupNarration の後 |
| `onChoice` 正解分岐               | L1816 | `showCorrectDialogue()` ※`showFeedback('やったー！')` の直後 (既存トーストは保持) |
| `onChoice` 不正解分岐             | L1843 | `showWrongDialogue()` ※`showFeedback('もういっかい！', true)` の直後 |
| `nextQuestion()`                 | L1880 | `clearTimeout(_autoHintTimer)` (タイマークリーンアップ) |
| `showResult()`                   | L1893 | `clearTimeout(_autoHintTimer)` + `showClearDialogue(correctCount, TOTAL_Q)` |
| 吹き出しクリック                   | L1357 | `addEventListener('click', () => showHint2(currentQ))` |

## 動作シミュレーション (mental simulation)

1. **新問題出題** → 吹き出し: 「さてさて…これは わかるかな？」 等 (50% カテゴリ別 / 50% general)
   - 例: order_color → 50% で「なにいろに みえるかな？」
2. **5秒経過 (無回答)** → 自動でヒント1: 「ふむ… すこし むずかしいかな？」 等
3. **吹き出しタップ** → ヒント2:
   - `question.hint` があればその内容
   - なければフォールバック: 「ほっほっほ、もうすこしじゃ」 等
4. **正解タップ** → `showFeedback('やったー！')` (既存) + 吹き出し: 「おお！ せいかいじゃ！」 等 (1/10 確率で「これは てんさいじゃな！」 等のレア褒め)
   - 連続ミスカウンタは正解時にリセット
5. **不正解タップ** → `showFeedback('もういっかい！', true)` (既存) + 吹き出し: 「ふむ… ちがったようじゃな」 等
6. **連続不正解 (2回目)** → 吹き出し: 「むずかしいかの？」「ヒントを みてみるかい？」 等
7. **5問終了**:
   - 5/5 → 「ぜんもん せいかい！ きみは もう、もりの なぞなぞマスターじゃな！」
   - 4/5 → 「りっぱじゃ！ よくできた！」
   - 3/5 → 「よくがんばったのう」
   - 0-2/5 → 「また あそびに きてくれよな」

## 検証
- inline `<script>` 全体を `new Function()` で構文チェック → **PARSE_OK**
- 8カテゴリのセリフ配列すべて定義済み
- 5箇所のワイヤリング (problem / correct / wrong / clear / hint click) 確認
- saved-layout.json: 未変更
- preview/, common/layout/, questions.js: 未変更
- ひらがな + やさしい漢字 (見/分/事 等) のみ使用

## 既存挙動の保持
- 既存トースト `showFeedback` は維持 (キャラ吹き出しは追加レイヤ)
- `showDetail` (💡 詳細ポップアップ) は影響なし
- `_consecutiveMisses` は正解時に 0 リセット
- 5秒タイマーは next/result に入る前にクリーンアップ
