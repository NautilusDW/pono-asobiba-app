---
name: feature-puzzle-voice-pack
description: puzzle/ ゲームに 14 ボイス mp3 (tutorial / clear / all_clear / hint / next_nudge) を組み込み、 子供が文字を読めなくても音声で誘導する仕組み (sw v407)
metadata:
  type: project
---

# パズル ボイスパック (2026-05-17, sw v407)

## Why

子供 (Pono) が文字を読めないので、 チュートリアル・クリア褒め・ヒント・次へ催促を **音声で誘導** する。 ナレーターは既存 OP narration と同じ録音元 (ユーザー指定の声色) を使用し、 ゲーム全体の音声トーンを統一する。

## 構成 (14 mp3 ファイル)

`assets/audio/puzzle/voice/<id>.mp3` に配置。 用途別マッピング:

| グループ | ファイル | 用途 |
| --- | --- | --- |
| tutorial | `tut_01.mp3` / `tut_02.mp3` / `tut_03.mp3` | チュートリアル 3 step bubble 表示時に順次再生 |
| clear | `clear_01.mp3` / `clear_02.mp3` / `clear_03.mp3` / `clear_04.mp3` / `clear_05.mp3` | 通常クリア褒め (5 種からランダム、 `clear_06` は意図的に未録音) |
| all_clear | `all_clear_01.mp3` / `all_clear_02.mp3` | 最終ステージクリア時の特別褒め (2 種からランダム) |
| hint | `hint_01.mp3` | ヒントボタンタップ時 |
| next_nudge | `next_nudge_01.mp3` / `next_nudge_02.mp3` / `next_nudge_03.mp3` | success modal 表示中の「次へ」催促 (3 種からランダム) |

合計 14 ファイル (3 + 5 + 2 + 1 + 3)。

## 配置

```
assets/audio/puzzle/voice/
  tut_01.mp3 .. tut_03.mp3
  clear_01.mp3 .. clear_05.mp3
  all_clear_01.mp3 .. all_clear_02.mp3
  hint_01.mp3
  next_nudge_01.mp3 .. next_nudge_03.mp3
```

## API

`puzzle/voice.js` を **IIFE module** として実装し、 `window.PuzzleVoice` に 3 メソッドを公開。 `main.js` より **先に** 読み込む (index.html で script tag 順序を保証)。

```js
window.PuzzleVoice = {
  playTut(stepIndex),        // 0/1/2 → tut_01/02/03 を再生
  playRandom(group),         // 'clear' | 'all_clear' | 'hint' | 'next_nudge'
  stop(),                    // 現在再生中の全 voice を即停止
};
```

## 発火ポイント

| イベント | 呼び出し |
| --- | --- |
| `showTutorial` の各 step bubble 表示時 | `PuzzleVoice.playTut(stepIndex)` |
| `showSuccessModal` で fanfare 800ms 後 | `PuzzleVoice.playRandom(isLast ? 'all_clear' : 'clear')` |
| `btnHint` クリック時 | `PuzzleVoice.playRandom('hint')` |
| success modal 表示時 + 6 秒経過ごと | `PuzzleVoice.playRandom('next_nudge')` + 次へボタンに `.btn-pulse` (keyframes scale 1↔1.12 1s) 再付与 |

## 重要な設計判断

- **random picker は per-group `lastPlayedId` で back-to-back 重複回避**: 同じ group で連続再生する際、 直前に再生した id を除外候補としてランダム抽選。 候補が 1 個しかない group (hint) は除外せず素直に再生。
- **nudge interval は 5 exit path 全てで停止**:
  1. 次へボタンタップ
  2. もう一回ボタンタップ (play-again)
  3. `triggerFirstClearReward` (isLast は skip)
  4. modal が隠れた時 (self-stop)
  5. メニューもどる (location.href フル遷移で自動破棄)
- **各ファイルに専用 `Audio` element** (src 差替なしで 1 ファイル 1 element)。 iOS Safari の `load()` issue (`audio.src` 差替時に `audio.load()` 必須) を回避するため、 そもそも src を差し替えない設計に。
- **BGM ducking は しない**: caller 責務 (voice 自体は volume=1.0 固定で素直に重ねる)。 puzzle BGM は元々控えめ音量のため重なっても破綻しない。
- **`void offsetWidth` reflow trick**: 次へボタンに `.btn-pulse` を re-add する際、 同じクラスを連続付与しても animation が restart しないブラウザ仕様を回避するため、 一度クラスを外し → `void element.offsetWidth` で強制 reflow → 再度付与、 で animation を確実に restart させる。

## クロスレビュー指摘 P2 (未対応・記録のみ)

- **`preload="auto"` で 14 mp3 即時 download (~1MB)**: モバイル帯域考慮なら `metadata` も候補だが、 voice は短いため初回 `play()` 遅延の方が UX 悪化が大きいと判断し保留。 帯域問題が顕在化したら `metadata` 切替を検討。
- **`visibilitychange` で voice 停止せず**: ブラウザの自動 pause 任せ。 タブ切替復帰時に再生継続したい設計のため、 明示停止は入れていない。

## 関連

- [[feature-puzzle-opening-cutscene]] — タイトル→パズル間の OP narration (同じ録音元を使用)
- [[deploy-fact-cloudflare]] — sw.js CACHE_VERSION バンプ規約
