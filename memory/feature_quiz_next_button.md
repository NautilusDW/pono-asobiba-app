---
name: Quiz Next Button
description: 回答後のつぎへボタン仕様。center-bottom 固定オーバーレイ + progress-num.png ピル背景 + 全169問で表示 (旧: 自動進行 + img_answer 限定)
type: feature
---

# Quiz Next Button

**Status:** Implemented (2026-05-08)
**Type:** Feature — UX / Pacing

---

## Why

旧仕様の問題:
1. **位置が中途半端**: `showNextButton` が `#answer-panel` の中身を `innerHTML = ''` で消してボタン1個に置換していたため、4択グリッドのセル位置にボタンが残り、視覚的に「回答エリアの一部が消えた」ように見えた。
2. **カバレッジが不完全**: `currentQ.img_answer` が真の問題 (opposite + trivia 計51問) でしか出ず、 残り118問は `setTimeout(nextQuestion, 2000)` で自動進行。子供が detail テキストを読み終わる前に次の問題に進んでしまうことがあった。
3. **スタイルが他 UI と不一致**: 旧 .next-q-btn はオレンジ CSS グラデで「いかにも Web ボタン」感があり、 progress-num.png や Fukuro_frame など本物素材ベースの世界観から浮いていた。

ユーザ指示 (2026-05-08): 「回答後の次へボタンが中途半端な位置だから、真ん中下あたりに出すか。progress-num.pngに「つぎへ」テキスト載せて作って今何問かしか次へボタン出てないから全問題に付けて」

---

## Spec

### 配置
- 静的コンテナ `<div id="next-btn-area">` を `.safe-area` 直下に置く (`.stage-pono` の sibling)
- CSS: `position:absolute; left:50%; bottom:32px; transform:translateX(-50%); z-index:50; pointer-events:none`
- 内側ボタンは `pointer-events:auto` (コンテナはクリック透過)
- レイアウトエディタ (`QZ_RESIZABLE_SELECTORS`) には登録しない (saved-layout JSON マイグレ不要)

### 見た目
- 背景画像: `progress-num.png` (本来は問題番号ピル素材を流用)
- サイズ: 240×96px
- 文字: 「つぎへ」 (▶ 矢印は付けない — ピル形状にミスマッチ)
- 色: `#6B3F12` (warm dark brown, クリーム中央に読みやすい)
- フォント: Zen Maru Gothic 36px / weight 900
- アニメーション: `display:none → display:inline-block` + opacity/translate fade-in (`.show` クラス切替)

### 表示タイミング (onChoice 内、正解時のみ)
| 条件 | showNextButton 呼出までの遅延 | 補足 |
|---|---|---|
| `img_answer` あり + `detail` あり | 2200ms | リビール+detail を見せてから |
| `img_answer` あり + `detail` なし | 1500ms | リビールアニメ完了まで待つ |
| `detail` のみ (img_answer なし) | 2500ms | detail dialog 後 |
| シンプル系 (img_answer/detail 両方なし) | 1200ms | 正解 jingle 後すぐ |

不正解時は出さない (再挑戦のため)。

### クリーンアップ
- `_doNextQuestion` 冒頭で `hideNextButton()` を呼び、 ボタンが次問題に持ち越されないよう保険

---

## Implementation pointers

### `quizland/index.html`

| 領域 | 行 (実装時点) | 役割 |
|---|---|---|
| HTML container | ~2975 | `<div id="next-btn-area">` |
| CSS `.next-btn-area` + `.next-q-btn` | ~976-1012 | 旧オレンジグラデを削除して新ピル化 |
| `showNextButton(onClick)` | ~3951 | 新コンテナに append、 textContent='つぎへ'、 `requestAnimationFrame(() => btn.classList.add('show'))` |
| `hideNextButton()` | ~3970 | コンテナ innerHTML クリア + 迷子 `#next-q-btn` の保険削除 |
| `onChoice` 全分岐 | ~4428-4454 | 全パスで `showNextButton(nextQuestion)` 呼出に統一、 setTimeout(nextQuestion, ...) 廃止 |
| `_doNextQuestion` | ~4527 | 冒頭で hideNextButton() |

### CSS 抜粋
```css
.next-btn-area {
  position: absolute;
  left: 50%; bottom: 32px;
  transform: translateX(-50%);
  z-index: 50;
  pointer-events: none;
}
.next-q-btn {
  pointer-events: auto;
  display: none;
  width: 240px; height: 96px;
  background: url('../assets/images/quizland/progress-num.png') center / 100% 100% no-repeat;
  border: none; padding: 0;
  font-family: 'Zen Maru Gothic', sans-serif;
  font-size: 36px; font-weight: 900;
  color: #6B3F12;
  opacity: 0;
  transform: translateY(8px) scale(0.96);
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.next-q-btn.show {
  display: inline-block;
  opacity: 1;
  transform: translateX(0) translateY(0) scale(1);
}
```

---

## 既知の挙動 / 注意点

- 4択 chip は表示されたまま、 ボタンがその上に center-bottom で重なる (chip を消す UX も検討したが、 5-6 歳児が「なんで消えたの?」と混乱する可能性 → 残す方針)
- 不正解の chip は disabled 化されるが残る (再選択防止 + どれが NG か視認できる)
- `requestAnimationFrame` 1段で `.show` を付けているため、 一部モバイル WebView で fade-in がスキップされる可能性あり (表示はされるが 0→1 の補間が見えない)。 cosmetic only。 必要なら double-rAF or `getBoundingClientRect()` でリフロー強制
- `locked` フラグはボタン表示中も `true` のまま (chip 誤連打防止)。 `loadQuestion` で reset

---

## Migration notes

- 旧 `.next-q-btn` のオレンジグラデ CSS は完全削除済 (コンフリクト回避)
- 旧 `setTimeout(nextQuestion, 2000)` / `setTimeout(nextQuestion, 4500)` は onChoice から完全撤去
- 旧 `#answer-panel.innerHTML = ''` でグリッドを潰す挙動も廃止
- saved-layout.json マイグレ不要 (新コンテナは layout-applier 対象外)

---

## Future considerations

- もし「ボタンが出たら chip を fade out したい」という UX 要望が来たら、 `showNextButton` 内で `.chip` に `is-dimmed` クラスを付けて opacity 0.4 にすれば実装可能
- 配置を「stage 真ん中下」ではなく「左カラム (q-text-card) の下」など問題別に変えたい場合は、 `next-btn-area` を layout-applier 対象に組み込む選択肢あり (ただし全 saved-layout マイグレが発生)
- 子供が長時間ボタンを押さない場合の auto-advance フェイルセーフ (例: 30秒後に自動で次へ) は未実装

---

## Related

- [feature_quiz_question_reveal_sequence.md](feature_quiz_question_reveal_sequence.md): 問題開始時の段階リビール (こちらは showQuestion 側、 本仕様は answer 側)
- [feature_audio_balance.md](feature_audio_balance.md): 正解 jingle / 不正解 SFX の音量
- [feature_quizland_per_question_layout.md](feature_quizland_per_question_layout.md): saved-layout.json の whitelist セレクタリスト (next-btn-area は意図的に非登録)
