---
name: Quiz Question Reveal Sequence
description: クイズ本編の問題開始時のリビールシーケンス (プレート → typewriter 問題文 → イラスト fade in → 4 択 fade in)。各 stage の DOM ターゲットとタイミング設計を記録。
type: feature
---

# Quiz Question Reveal Sequence

**Status:** Implemented (2026-05-08)
**Type:** Feature — UX / Pacing

---

## Why

クイズ本編で問題が「ドーン」と全部一気に表示されると、5-6 歳児が情報を一度に処理しきれない。視線誘導を作るために段階的にリビール:
1. プレート → 「これから第 N 問だぞ」
2. 問題文 typewriter → 「何を聞かれてるの？」と問題に集中
3. イラスト fade in → 「あ、これかな?」とヒントを得る
4. 4 択 fade in → 「答えはこの中のどれ?」と回答に進む

順番にすることで、子供が answers chip に飛びついて読まない問題を緩和。

---

## Sequence (5 stages)

```
┌────────────────────────────────────────────────┐
│ Q1-Q5 のみ                                     │
│  Stage A: プレート 「だい N もんめ!」         │
│           ドーン! オーバーシュート (~1.6s)     │
│  Stage B: プレート fade out                    │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ Q6+ もここから (200ms grace 後 typewriter 開始)│
│  Stage C: 問題文 typewriter (70ms/char)        │
│  Stage D: typewriter 50% 地点でイラスト fade in│
│  Stage C 完了 (text 全文表示)                  │
│  Stage E: 4 択 fade in                         │
└────────────────────────────────────────────────┘
```

各 stage 中に画面タップ → 全 pending stage を即時 revealed に (skip)。

---

## DOM ターゲット

| Stage | DOM 要素 | クラス制御 |
|---|---|---|
| プレート | `#qno-plate-overlay`, `#qno-plate-img` | `.is-impact` で `@keyframes qnoImpact` (1.6s) |
| 問題文 | `#q-text` | `dataset.pendingText` に保持、`textContent += char` で逐次追加 |
| イラスト | `.emoji-display`, `.emoji-main-img` (`#stage-area` 配下) | `.q-stage-pending` ↔ `.q-stage-revealed` |
| 4 択 | `#answer-panel` | 同上 |

`.q-stage-pending`: `opacity: 0; pointer-events: none; transition: opacity 0.4s ease-out;`
`.q-stage-revealed`: `opacity: 1; pointer-events: auto;`

---

## Implementation

### 主要関数 (`quizland/index.html`)

- **`playQuestionNumberPlate(qIdx)`** (line ~4899-4943): プレート表示 + アニメーション。`qIdx >= 5` で早期 return
- **`typeQuestionText(el, text)`** (line ~4518-4539): typewriter helper、Promise ベース、`_qTypingToken` で race-cancel
- **`_wireQuestionTypingSkip()`** (line ~4541-4556): document capture-phase click でタップ skip
- **`_revealAllPendingStages()`** (line ~4589-4594): 全 `.q-stage-pending` を即 revealed に昇格
- **`_runPlateAndType(qIdx)`** (line ~4620-4684): 全シーケンスのオーケストレータ。`playQuestionNumberPlate → setTimeout(illust reveal, halfwayMs) → typeQuestionText → finally で choices reveal`

### `loadQuestion()` での pending 化

```js
// 上端: 前問題の revealed クラス cleanup
document.querySelectorAll('.q-stage-revealed').forEach(el => el.classList.remove('q-stage-revealed'));

// renderChoices(q) の後: pending マーク
document.querySelectorAll('#stage-area .emoji-display, .emoji-main-img, #answer-panel')
  .forEach(el => el.classList.add('q-stage-pending'));
```

`#q-text` は `loadQuestion()` 内で空文字 + `dataset.pendingText` 化、`_runPlateAndType` 側で typewriter で埋める。

### 呼び出し点 (4 箇所)

`_runPlateAndType(qIdx)` を fire-and-forget で呼び出し:
1. `initGame()` (line 4368) — Q1 (新規セッション開始時)
2. `_doNextQuestion` (line 4314) — Q2-5 進行時
3. `_qzDebugGoto` (line 5123) — デバッグジャンプ
4. `_qzInitFullPlaylist` 復帰分岐 (line 5660)

---

## アセット

5 枚プレート (`assets/images/quizland/`):
- `qno_plate_1.png` (黄+オレンジ、660×334)
- `qno_plate_2.png` (緑、701×332)
- `qno_plate_3.png` (オレンジ、676×314)
- `qno_plate_4.png` (緑、688×312)
- `qno_plate_5.png` (オレンジ、737×316)

タイトルタップ時の `__preloadList` でプリロード済み。

---

## タイミング設計の根拠

| 設計値 | 値 | 根拠 |
|---|---|---|
| プレートアニメーション | 1.6s 計 | overshoot (250ms) + settle (200ms) + hold (~870ms) + fade out (300ms) |
| typewriter 速度 | 70ms/char | OP シネマ (95ms) より速い、子供が文字を追える最低速度 |
| イラスト fade in | typewriter 50% 地点 | 半分読んだら答えのヒント (絵) も見えるが、最後まで読まないと選択肢は見えない |
| イラスト/choices 遷移 | 0.4s ease-out | 「ふわっ」と入る、急すぎない |
| Q6+ grace | 200ms | プレートなしで突然 typewriter が始まると唐突なので |

---

## 既知の挙動

- **同じ問題への再ジャンプ**: プレート再生 + typewriter 再生される (デバッグ時)
- **Q1-5 で plate あり、Q6+ なし**: 1 セッション 5 問構成想定。問題数を増やしても既存実装を壊さない (qIdx 5 以上は plate スキップ)
- **タップ skip**: capture-phase なので answer chip タップでも先に発火、文字 skip + 全 stage 即 revealed → その後通常の chip click → 回答処理
- **誤回答 / 正解 → 次問題**: `_doNextQuestion` 経由で次の `_runPlateAndType(N)` が走り、クリーンに次問題のシーケンスが始まる

---

## Future considerations

- イラスト fade in タイミングを「typewriter 50%」固定 → 「最後の句読点後」のような構文ベースに変えると自然
- 4 択 fade in は順番に (1→2→3→4 が ~100ms ずつ ずれる stagger) すると ドーン感が出るかも
- Q6+ の 200ms grace を 「先頭 1 文字だけ書いてから 200ms」のように変えると区切りが付く

---

## Related

- [feature_quizland_opening.md](feature_quizland_opening.md): OP シネマの babble + typewriter (こちらは音声付き、_opTypeInto)
- [feature_babble_voice.md](feature_babble_voice.md): in-game の `setHakaseDialogue` は instant 表示 (キャラ無音方針)、本シーケンスの問題文は別系統で typewriter
