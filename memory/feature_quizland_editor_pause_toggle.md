---
name: feature-quizland-editor-pause-toggle
description: quizland ?edit=1 レイアウトエディターに ⏸/▶ Pause トグル追加 + 結果画面スキップガード撤去 (sw v1034, 2026-05-16)。 pause 中は「次の問題への進行」 だけ凍結、 チップタップ・正解判定・SE・アニメは通常動作。 共通 interface: window._quizlandPaused + body.layout-editor-paused の OR 判定。
metadata:
  type: feature
---

# quizland ?edit=1 Pause トグル + 結果画面復活 (sw v1034, 2026-05-16)

## なに

`quizland/?edit=1` レイアウトエディターに **⏸ 一時停止 / ▶ 再開 トグルボタン** を追加し、 「普通にゲームを進めながら任意の位置で止めて位置調整する」 を可能にした。 同時に、 `?edit=1` モードで結果画面をスキップして Q1 にループバックしていた既存ガード (`quizland/index.html` L5565-5571 付近) を完全撤去し、 本番と同じく結果画面まで自然に到達できるようにした。

## なぜ

v1034 以前の `?edit=1` モードには 2 つの編集阻害要因があった:

1. **結果画面が出ない** — `?edit=1` 中は最後の問題の後に強制的に Q1 へループバックしていたため、 リザルト画面 (パーフェクト演出 / カテゴリ別スコア / 「もういちど」 ボタン等) のレイアウトを編集できなかった
2. **任意位置で止められない** — 正解後に自動で次問題へ進むため、 「この問題の状態でじっくり座標を調整したい」 ができなかった (タップ判定で勝手に進んでしまう)

ユーザー要件は 「普通のゲームとして進められる + 任意の位置で止めて位置調整したい」。 1 つ目を撤去で解消、 2 つ目を新規 Pause トグルで解消。

## どう実装

### A. quizland/index.html — pause guard 追加 + スキップガード撤去

`nextQuestion` / `_doNextQuestion` の **冒頭** に pause guard を挿入 (早期 return):

```js
if (window._quizlandPaused ||
    (document.body && document.body.classList.contains('layout-editor-paused'))) {
  return;
}
```

判定は **OR** (どちらか truthy なら pause 扱い)。 通常モード (`?edit=1` 無し) では layout-editor.js が遅延ロードされず `window._quizlandPaused` は `undefined` のまま → falsy 判定で guard が素通り、 通常進行に影響ゼロ。

同時に、 既存の `?edit=1` 結果画面スキップ + Q1 ループバックガード (L5565-5571 付近) を完全撤去。 → `?edit=1` でも本番と同じく結果画面まで到達。

### B. common/layout/layout-editor.js — toolbar に Pause トグル追加

toolbar 構築箇所 (L6230 付近) に `<button id="le-pause-toggle">` を追加。 ヘルパ `applyPauseState(paused, btn, silent)` で以下を一括反映:

- `document.body.classList.toggle('layout-editor-paused', !!paused)`
- `window._quizlandPaused = !!paused` (try/catch でガード)
- ボタン文字: `⏸ 一時停止` ⇔ `▶ 再開`
- ボタン `.active` class on/off (CSS 赤系で active 状態を可視化)
- `#le-paused-overlay` (右上 fixed の `⏸ EDIT PAUSED` ラベル) の表示切替

クリック時は `body.layout-editor-paused` を見て次状態を計算し、 `localStorage.setItem('le-quiz-paused', next ? '1' : '0')` で永続化。 初期化時は `localStorage.getItem('le-quiz-paused') === '1'` で復元 (silent=true で副作用なし)。

`disable()` 経路 (L8047 付近) では:

- `body.layout-editor-paused` class を除去
- `window._quizlandPaused = false` に強制リセット
- `#le-paused-overlay` を DOM から remove

→ エディター OFF 時に通常プレイ側に状態が残らない完全 cleanup。

### C. common/layout/layout-editor.css — 視覚 hint

- `#le-pause-toggle.active` — 赤系背景で active 状態 (L1172 付近)
- `#le-paused-overlay` — 右上 `position: fixed`, `pointer-events: none`, `z-index: 999999`, テキスト `⏸ EDIT PAUSED` をオレンジ系で表示 (L1181-1196)
- `@keyframes le-paused-pulse` — 1.6s ease-in-out infinite の優しい pulse アニメ (L1198)

`pointer-events: none` でゲーム操作を遮らない。 z-index 999999 でレイアウトハンドル類より前面。

### D. sw.js — CACHE_VERSION bump

`CACHE_VERSION = 1033 → 1034`。 PWA キャッシュ更新で `layout-editor.js` / `layout-editor.css` / `quizland/index.html` の新版が確実に配信される。

### E. saved-layout.json — 完全無変更

AGENTS.md §3 厳守 (本機能はランタイム挙動の追加のみ、 レイアウト座標は一切触らない)。

## 共通 interface

| 項目 | 値 |
|---|---|
| pause 判定 | `window._quizlandPaused \|\| document.body.classList.contains('layout-editor-paused')` の **OR** |
| 切替 | `applyPauseState(paused)` が両方を同期トグル |
| 永続化キー | `localStorage['le-quiz-paused']` (`'1'` / `'0'`) |
| 視覚 hint | toolbar ボタン文字 + `.active` class + `#le-paused-overlay` の 3 系統 |
| cleanup | `disable()` で class / flag / overlay の 3 系統すべて完全リセット |
| 通常モード影響 | layout-editor.js 自体が `?edit=1` 限定遅延ロード → `window._quizlandPaused = undefined` で falsy、 guard 素通り |

## ユーザーへの見え方

- pause 中も **チップタップ / 正解判定 / SE / アニメ / スタンプ / reveal シーケンス / 「次へ」 ボタン表示は全部通常通り**
- 唯一の違い: 「次へ」 ボタンを押しても次問題に **進まない** (guard で早期 return)
- 状態認識: 右上の `⏸ EDIT PAUSED` ラベル (オレンジ pulse アニメ) + toolbar ボタンが `▶ 再開` 表示 + 赤系 active 状態
- リロードしても pause 状態は復元される (`localStorage` 永続化)
- エディター OFF (?edit=1 を外して再読み込み) すれば pause 状態は痕跡なく消える

## 設計判断

- **「次へ」 ボタン自体の `disabled` 化は見送り** — 最小実装方針。 ボタンは見えるが押しても何も起きない (= guard で早期 return)。 状態認識はオーバーレイラベル `⏸ EDIT PAUSED` で十分とユーザー判断
- **キーボードショートカット (Space 等) は今回スコープ外** — toolbar ボタンのみで完結、 将来必要なら追加検討
- **結果画面スキップガード撤去で副次効果** — リザルト画面のレイアウトも編集可能に。 v1034 以前は不可能だった「もういちど」 ボタン / カテゴリ別スコア / パーフェクト演出の位置調整がエディター内で完結
- **localStorage 永続化採用** — リロードで pause 状態が消えると編集中に戸惑う UX。 永続化で「リロード後もそのまま止まったままで作業継続」 が成立

## 関連メモリ

- [[reference-layout-system]] — `common/layout/` の共通レイアウトモジュール基盤 (LayoutSystem.init / `?edit=1` 遅延ロード)
- [[feature-quizland-per-question-layout]] — 問題ごとの emoji-display 個別座標。 pause 中に編集する主要対象
- [[feature-quizland-contain-fit-default]] — 16:9 (1600×900) 完全固定 stage の base。 本機能はこの上で動く

## 関連ファイル (file:line)

- `quizland/index.html:5533-5536` — `nextQuestion` 冒頭の pause guard (OR 判定)
- `quizland/index.html:5568-5571` — `_doNextQuestion` 冒頭の pause guard (同上)
- `quizland/index.html` — 旧 L5565-5571 付近の `?edit=1` 結果画面スキップ + Q1 ループバックガードを完全撤去 (v1034)
- `common/layout/layout-editor.js:6155-6200` — `applyPauseState()` ヘルパ (class + flag + ボタン文字 + overlay の一括反映)
- `common/layout/layout-editor.js:6228-6230` — toolbar の `<button id="le-pause-toggle">` 追加
- `common/layout/layout-editor.js:6325-6345` — 初期化 + クリックハンドラ + localStorage 永続化
- `common/layout/layout-editor.js:8047-8055` — `disable()` での完全 cleanup (class 除去 + flag リセット + overlay remove)
- `common/layout/layout-editor.css:1172` — `#le-pause-toggle.active` 赤系 active 状態
- `common/layout/layout-editor.css:1181-1196` — `#le-paused-overlay` 右上 fixed ラベル
- `common/layout/layout-editor.css:1198` — `@keyframes le-paused-pulse` 1.6s ease-in-out infinite
- `sw.js:4` — `CACHE_VERSION = 1034`
