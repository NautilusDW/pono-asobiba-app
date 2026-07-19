---
name: feature-puzzle-landscape
description: puzzle/ を縦画面強制 → 横画面専用化 (sw v995→997)。CSS aspect-ratio 反転 + landscape MQ で flex-row レイアウト + ResizeObserver で回転中の進捗保護
metadata:
  type: project
---

# パズル 横画面専用化 (2026-05-14, sw v995→v997)

`puzzle/` を **縦画面強制 → 横画面専用** に変更。画像 (puzzle_P01_01.jpg 等) は縦長/正方形寄りのまま、レイアウトのみ横向きに最適化。

## 変更箇所サマリ

### 第1ラウンド (commit `c625ff0`)
- `puzzle/index.html:22` — 通知 「たてむき → よこむき」
- `puzzle/index.html:86` — 判定 `isLandscape && isTouch` → `!isLandscape && isTouch` (= portrait + touch で notice 表示)
- `puzzle/style.css` `.puzzle-frame` (line 150-) — aspect-ratio `3/4 → 4/3` + width 計算式の係数 `* 3/4 → * 4/3`
- `puzzle/style.css` `.title-screen__content` — `top: clamp() → 50%` + `transform: translate(-50%, -50%)` で完全中央配置
- `sw.js` — CACHE_VERSION 995 → 996

### 第2ラウンド (クロスレビュー HIGH/MED 修正、 working tree 段階で auto-commit 待ち)
- `puzzle/style.css:170+` — `@media (orientation: landscape) and (pointer: coarse)` 新設:
  - `.main { flex-direction: row }` で **左にパズル + 右に 180px サイドバー** に切替
  - `.puzzle-frame { width: min(calc(100vw - 220px), calc((100dvh - 110px) * 4 / 3)); min-width: 0 }` で **高さベース計算** に切替 (旧 `100dvh - 240px` が iPhone 横で 200px 切手化していた致命バグの対処)
  - `.sidebar { width: 180px; flex-direction: column }` + `.controls { flex-direction: column }`
  - `.header .title { font-size: 1.1rem }` 等で header 圧縮
- `puzzle/style.css:212+` — `@media (orientation: landscape) and (max-height: 480px)` でモーダル padding `32px → 16px` + emoji/title 圧縮 (iPhone 横画面 390dvh で溢れ対策)
- `puzzle/main.js:644-660` — ResizeObserver に **進捗保護ガード** 追加:
  - `let lastInitW, lastInitH` をモジュール変数化
  - `snappedCount > 0` かつ width/height 差分 ±20% 以内なら `initPuzzle` 再呼び出しを skip
  - 回転中の「ピース全部スキャター戻し」 を防止 (子供向け UX)
- `sw.js` — CACHE_VERSION 996 → 997

## 想定挙動

| デバイス | viewport | 結果 |
|--|--|--|
| iPhone 縦 | 390×844 | 通知「よこむきにしてね」 表示 |
| iPhone 横 | 844×390 | puzzle-frame 373×280 + 右サイドバー 180px |
| iPad 横 | 1024×768 | puzzle-frame 804×603 + 右サイドバー 180px |
| iPad 縦 | 768×1024 | 通知表示 (orientation: portrait) |
| デスクトップ | (pointer:fine) | 既存挙動、 notice 非表示 |

## 設計判断 / 注意点

- **`#landscape-notice` の id 名は意味的に反転**: 旧 「横画面で notice 表示 = 縦むき強制」 → 新 「縦画面で notice 表示 = 横むき強制」。 CSS / JS で参照されているため命名はそのまま維持。 将来リネームする場合は HTML / CSS / JS 同時更新の dedicated commit にする。
- **画像は触らない**: ユーザー確定方針。 既存の縦長/正方形寄り画像 (puzzle_P01_01.jpg 等) を 4:3 横長 frame に letterbox で配置。 board アスペクト比は `imgAspect = img.naturalWidth / img.naturalHeight` で自然に追従 ([puzzle/main.js:508-517](../puzzle/main.js#L508-L517))。
- **高さベース計算への切替が必須だった理由**: 旧式 `100dvh - 240px` は portrait 前提の式。 iPhone 横画面 (390dvh) では `(390-240)*4/3 = 200px` → min-width 240px clamp → 切手サイズ。 landscape は height-constrained なので、 高さから幅を逆算するロジックが必要。
- **ResizeObserver 進捗保護**: portrait 強制から landscape 強制への変更で「ユーザーが回転中に observer が発火 → ピース全消し」 のシナリオが頻発化。 ±20% 差分 + snappedCount 条件で 「微小 resize は無視、 大幅変更のみ再初期化」 に。
- **`@media (orientation: landscape) and (pointer: coarse)` の意図**: iPad / iPhone のタッチ端末でのみ横並びレイアウト適用。 デスクトップ Chrome の細い縦長ウィンドウでは適用されない (pointer: fine が排除)。

## クロスレビュー知見

- 「safe-area 配置 OK」 は内側 grid (chip / sidebar) が収まることを保証しない。 box-sizing 込みで再計算必須 (= [feature_quizland_contain_fit.md](feature_quizland_contain_fit.md) と同じ教訓)。
- puzzle-frame の `min-width: 240px` は portrait 前提で設定されていたが、 landscape では `min-width: 0` で解除しないと clamp で巨大化 / 小型化が起きる。
- `let lastInitW` の **TDZ リスク** は実害なし: image load は async なので、 callback 発火時点でモジュール末尾の `let` は既に初期化済み。 ただしコード品質的には `let` を `initPuzzle` 定義より上に置くのがクリーン (将来の cleanup タスク)。

## 関連メモリ

- [feature_quizland_contain_fit.md](feature_quizland_contain_fit.md) — 「safe-area 配置 OK」 が内側 grid を保証しない教訓
- [feedback_auto_commit_hook_rebase_risk.md](feedback_auto_commit_hook_rebase_risk.md) — auto-commit hook が edit を吸い上げる挙動
