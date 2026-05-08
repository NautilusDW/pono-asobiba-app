---
name: Quiz Framed Image Flag
description: 長方形の背景フレーム入り stage 画像 (rainbow_arc 等) に共通 drop-shadow を入れない仕組み。questions.js の framed/framed_answer フラグで opt-in
type: feature
---

# Quiz Framed Image Flag

**Status:** Implemented (2026-05-08)
**Type:** Feature — UX / Visual

---

## Why

Codex 発注の中には、画像自体に紙風 / 水彩風の長方形フレームが焼き込まれているものがある (例: `stage_weather_rainbow_arc.png`)。`.emoji-main-img` には共通で `--stage-shadow` (2-stop drop-shadow) が乗っているが、これらの「枠付き」画像には drop-shadow が浮いて見え、絵本的な雰囲気を壊す。

ユーザ feedback (2026-05-08): 「こういう長方形の背景付きのやつは影入れなくていいや」

逆に、シルエットや透明背景のオブジェクト/キャラクター画像 (kiba / hige / leaf / 体パーツ等) には drop-shadow を残す必要がある (浮き上がりと立体感が失われる)。

---

## How (実装概要)

### CSS ([quizland/index.html](../quizland/index.html#L902))

```css
.emoji-main-img.is-framed { filter: none; }
```

### questions.js — opt-in フラグ

```js
{ ..., img:'stage_weather_rainbow_arc.png', framed:true, ... }
```

リビールペアで「出題=透明、正解=枠付き」のような場合は `framed_answer: true` を併用:

```js
{ img:'silhouette.png', img_answer:'scene_with_frame.png', framed_answer:true, ... }
```

### render 関数 (3 箇所、同じパターン)

`renderEmojiName` / `renderOpposite` / `renderTrivia` で imgEl 作成後:

```js
imgEl.className = 'emoji-main-img';
if (q.framed) imgEl.classList.add('is-framed');
```

### revealAnswer

reveal 時に `framed_answer` で class を切替:

```js
if (q.framed_answer) imgEl.classList.add('is-framed');
else if (!q.framed) imgEl.classList.remove('is-framed');
```

---

## 適用済み (2026-05-08 時点)

- `stage_weather_rainbow_arc.png` を使う 2 問 (weather L2 / weather L3)

---

## How to apply (新規問題追加時)

1. Codex から納品された stage 画像が「長方形 + 紙風/水彩フレーム焼き込み」かを確認
2. そうなら questions.js のエントリに `framed: true` を追加
3. img_answer 側だけ枠付きなら `framed_answer: true`
4. CACHE_VERSION バンプ

迷ったら staging で実機確認 → 影が浮いてたら framed: true

---

## 設計 rationale

代替案 (採用しなかったもの):
- ファイル名パターンで自動判定 (`stage_*.png`) → false positive 多すぎ。同じ stage_ prefix でも silhouette のものがある
- CSS `:has()` 検出 → 画像の透明 alpha は CSS から読めない
- Codex 発注時に枠なしで統一 → 既に納品された大量の枠付き素材を再生成するのは現実的でない

opt-in フラグ方式が一番素直で、新規問題追加時のオーバーヘッドも 1 word。

---

## Related

- [feature_quiz_question_revision_pipeline.md](feature_quiz_question_revision_pipeline.md): 画像発注 Priority 3 で背景仕様を明示するルール (枠付き/透明の事前定義)
- [feature_quiz_question_reveal_sequence.md](feature_quiz_question_reveal_sequence.md): リビール時の class 切替ロジック
