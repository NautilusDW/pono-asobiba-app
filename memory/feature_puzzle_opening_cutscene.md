---
name: feature-puzzle-opening-cutscene
description: puzzle/ ゲームのタイトル→パズル間に 3 カット + ナレーション (約 17.7s) のオープニングを挿入 (sw v395)
metadata:
  type: project
---

# パズル オープニングカットシーン (2026-05-17, sw v395)

## 確定方針

- タイトル画面タップ → オープニング (3 カット + ナレーション) → パズル開始
- **毎回再生** (localStorage で初回判定しない)。スキップボタンと画面タップで早送り可。
- BGM (Cheery Strike Loop2) はオープニング再生中は **停止**。終了後に既存 `tryStartBgm()` を呼ぶ。
- ナレーション 1 本通し、約 1/3 ずつで自動的に次カットへ (実測 17.73 秒 / fallback 値)。
- 最終カットを 500ms 残してフェード終了 → そのままパズル画面。
- 既存チュートリアル表示判定 (`puzzle_tut_seen` flag) はオープニング終了後に発火。

**Why:** 子供 (Pono) が「これは何のゲームか」を物語的に理解できるよう、ポノと森の仲間たちがパズルで遊び始めるシーンを毎回見せたい。スキップ可なので飽きても進める。

**How to apply:** 他ゲーム (bento/quizland 等) で同様の OP を追加する場合、本ファイルの設計を踏襲。タイトル→OP→ゲームの 3 段階フローと、duration 取得→自動切替+タップ早送り+二重 finish ガードの実装パターンが鍵。

## ファイル構成

| 役割 | パス |
|---|---|
| カット 1 (玄関) | `assets/images/puzzle/opening/cut01.{png,webp,jpg}` |
| カット 2 (パズル箱発見) | `assets/images/puzzle/opening/cut02.{png,webp,jpg}` |
| カット 3 (パズル広げる) | `assets/images/puzzle/opening/cut03.{png,webp,jpg}` |
| ナレーション | `assets/audio/puzzle/opening_narration.{wav,mp3}` |
| HTML overlay | `puzzle/index.html` `<div id="puzzle-opening">` (title-screen 直後) |
| スタイル | `puzzle/style.css` `.puzzle-opening` / `.opening-skip` / `.opening-progress` |
| ロジック | `puzzle/main.js` `runOpeningCutscene(onDone)` + `finishOpeningAndEnterGame()` |

## 素材最適化結果

| ファイル | 元 (PNG/WAV) | webp/mp3 | jpg |
|---|---|---|---|
| cut01 | 2587 KB | **219 KB** | 332 KB |
| cut02 | 2658 KB | **247 KB** | 350 KB |
| cut03 | 2537 KB | **211 KB** | 323 KB |
| narration | 851 KB (wav) | **278 KB** (mp3 128kbps) | — |

- PNG/WAV はバックアップ保持。HTML は `<picture>` で webp 優先 + jpg フォールバック、`<audio>` は mp3 優先 + wav フォールバック。
- 画像は元 1600x893。リサイズ不要だったため品質維持。

## 実装の落とし穴

1. **ナレーション長さ**: 当初 byte_rate から 8.87s と推定したが、ffprobe 実測は **17.73s**。`audio.duration` を runtime で取得し相対 1/3 で切替えるため動作に問題なし。FALLBACK_DURATION も 17.73 に合わせ済み。
2. **モバイル autoplay**: タイトル画面タップ直後 (同期 user gesture stack 内) に `audio.play()` を呼ぶため通る想定。失敗しても catch して映像のみ進行。
3. **二重 finish ガード**: 「ナレーション ended」「自動終了タイマー」「スキップ」「最終カットでタップ」の 4 経路があるため、`ended` flag で重複防止。
4. **タップ vs スキップボタン**: skip btn は overlay 内のため pointerdown は overlay に bubble する。skip 側で `e.target === skipBtn` をチェックして overlay 側 handler を抑止。
5. **BGM 衝突**: 旧 `startFromTitleScreen` で即時 `tryStartBgm` 呼んでいた箇所を `finishOpeningAndEnterGame` に移動。

## 実機検証で発覚した罠 (2026-05-17 sw v395→v397)

実装直後の本番確認で「cut01 が背景に貼り付き + パズル普通に開始 + ナレーション無音 + tut 表示」の症状。 原因は **HTML だけ更新されて CSS/JS が古い v396 キャッシュから配信される ちぐはぐ状態** だった。

- HTML は `cache: 'no-store'` (sw.js:51-57) なので即時新規取得
- main.js / style.css は network-first + cache fallback (sw.js:104-115) で、ネットワーク不安定/PWA 起動時にキャッシュにフォールバック → 古い版が配信される
- 旧 CSS には `.puzzle-opening.hidden { display:none }` も `position:fixed` も無いので、新 HTML の overlay が **body の flex 子としてインライン展開** されて「左に cut01、右にパズル」の見た目になる
- 旧 main.js には `runOpeningCutscene` が無いのでナレーション/フロー切替が走らず、旧 startFromTitleScreen が即 tutorial を発火

**根本対策:** sw.js CACHE_VERSION の bump を必ずやる。 v395 bump 後にユーザー/別フックが v396 に上書きしていたため、 puzzle 変更が v395 に紐付かず古い v396 キャッシュが残った。 v397 で全キャッシュ削除 + clients.claim + postMessage reload。

**Why:** SW network-first + cache fallback は、 ネットワーク到達できる場合は必ず新版を取るが、 同一 CACHE_VERSION 期間中に複数のコード版をデプロイすると、 ユーザーの localStorage/SW cache に古い版が紛れ込み、 HTML/CSS/JS のバージョン整合性が崩れる。

**How to apply:** 機能追加コミット 1 つ = CACHE_VERSION 1 bump を厳守。 リンター/フックが自動 bump してくれる場合でも、 自分のコミット範囲が確実にカバーされているか git log で確認。 別人/別フックの bump に便乗してはいけない。

## 関連

- [[deploy-fact-cloudflare]] — sw v397 bump 必須
- [[feature-puzzle-20stage-redesign]] — パズル本体仕様
- [[feature-puzzle-landscape]] — 横画面前提 (OP も 16:9)
