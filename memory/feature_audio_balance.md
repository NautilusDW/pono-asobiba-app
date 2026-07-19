---
name: Audio Volume Balance (App-wide Policy)
description: アプリ全体で統一する BGM / SFX / ナレーション音量基準。新ゲーム追加・既存ゲーム改修時はこの値に合わせること。
type: project
---

# Audio Volume Balance — App-wide Policy

**Status:** Implemented (2026-05-07)
**Type:** Project-wide convention
**Authority:** This file is the source of truth. PR/コミットで音量を変える場合はこのファイルも同時更新。

---

## Why

旧状態は各ゲームが独自に音量を持ち、BGM が 0.06 (bubble、ほぼ無音) 〜 0.45 (aquarium、過大) と **7.5 倍の差**があった。SFX 0.6 が BGM 0.2 を埋め、シネマナレ 1.0 が BGM を完全に隠していた。子供向けアプリで「ゲーム間で音量が大きく変わる」UX は致命的なので、master = 1.0 に対する各カテゴリの統一目標値を定めた。

## Unified Volume Scheme (master = 1.0)

| カテゴリ | 値 | 適用範囲 |
|---|---|---|
| **BGM** | **0.25** | 全 15 ゲーム HTML / JS の `bgm.volume`, `bgmGain.gain.value`, `BGM_VOLUME` 等 |
| **SFX (correct/wrong/click 系)** | **0.45** | quizland `SE_VOLUME`, maze `_MZ_SE_VOLUME` 等の punctuation 系 |
| **SFX (連続タッチ feedback)** | **0.15-0.30** | writing/simple.html のストローク音、ぬり絵タッチ等。BGM より目立たないように |
| **シネマティック・ナレーション** | **0.65** + **BGM ダック** | quizland オープニングの OP_NA.wav 等 |
| **babble owl** | **0.5** (post-BPF 補正後) | quizland-babble.js owl preset。BPF を通すので実音圧は低い |
| **babble pono / hedgehog / default** | **0.11-0.12** | 単純チャープなのでそのまま |
| **TTS manifest narration** | **0.9** (ユーザ設定可、localStorage 保存) | common/narration.js。primary content なので大きめ |

## How to apply

新規ゲームを追加する / 既存ゲームの BGM・SFX を入れ替える場合:

```js
// BGM
audio.volume = 0.25;  // または gainNode.gain.value = 0.25

// SFX (punctuation, e.g. 正解/不正解/クリア音)
const SE_VOLUME = 0.45;

// シネマナレーション
const narrGain = audioCtx.createGain();
narrGain.gain.value = 0.65;
src.connect(narrGain);
narrGain.connect(audioCtx.destination);
audio.volume = 0.65;  // HTMLAudio fallback も常時設定
```

### BGM ダック (シネマナレ等で BGM を一時的に下げる)

```js
// 開始時
let __orig = bgmGain.gain.value;
bgmGain.gain.setTargetAtTime(__orig * 0.3, audioCtx.currentTime, 0.18);

// finally で必ず復帰させる (例外/skip/timeout 全パス対応)
try {
  if (bgmGain && bgmGain.gain && __orig != null) {
    bgmGain.gain.setTargetAtTime(__orig, audioCtx.currentTime, 0.15);
  }
} catch (e) {}
__orig = null;

// Web Audio ノードのリーク防止: createMediaElementSource したらリプレイ前に disconnect
try { if (narrSrc)  narrSrc.disconnect(); }  catch (e) {}
try { if (narrGain) narrGain.disconnect(); } catch (e) {}
```

## Known caveats

1. **mp3 マスタリングのムラ** — 0.25 統一でも `Bubble Hop Playground.mp3` (aquarium) のように元音圧が高いトラックは聴感的に大きく感じることがある。実機 A/B で違和感があれば ±0.05 単位で個別調整可。
2. **`createMediaElementSource` は同一 element に 2 回呼ぶと例外** — ループ／リプレイ時は新規 `Audio()` で element ごと作り直し、終了時に `disconnect()` でクリーンアップ。
3. **`audio.play()` 同期 throw** — `.catch()` ではキャッチできないので try/catch + finally で BGM 復帰を必ず保証する。
4. **`common/treasure.js` のフェード** — host ページの BGM 値を読み書きするヘルパー。ここでは literal を変えず、各ゲームの BGM 値に追従する設計。

## Centralized config の検討

現在は各ゲームに literal の 0.25 / 0.45 / 0.65 を直接書いている。将来的に `common/audio-config.js` に集約する案もあるが、今は**スコープ拡大を避けて literal で運用**。次に音量を全体で再調整する話が出たら、その時にまとめて config 化する。

## Files affected (last touch: 2026-05-07)

- `quizland/index.html`, `maze/index.html`, `aquarium/index.html`, `bento/index.html`, `bowling/index.html`, `breakout/index.html`, `bubble/index.html`, `drawing/index.html`, `play.html`, `play-all.html`, `puzzle/main.js`, `room/index.html`, `slide/index.html`, `writing/index.html`, `writing/simple.html`
- `sw.js` (CACHE_VERSION 825)
- 関連: `memory/feature_quizland_opening.md` (シネマナレ + BGM ダック を follow-up から実装済みに移動)
