---
name: Quizland リスのくるみちゃん（アシスタントキャラ）
description: フクロウ博士のクイズの新アシスタントキャラ。リスの女の子、元気で優しいお姉さん感、VOICEVOX 音声で問題文を読み上げる役。OP シネマティック (Panel 2 / 5 / 6) に組み込み済み (sw v921+ / クロスレビュー反映 v922+)
type: feature
---

# Quizland リスのくるみちゃん

## キャラクター設定
- **名前**: リスのくるみちゃん（くるみ）
- **種族**: リス（茶色＋クリーム色の毛色）
- **役割**: フクロウ博士のアシスタント。クイズの問題文と選択肢を読み上げる
- **見た目**:
  - ふさふさの大きなしっぽ
  - 首に赤いスカーフ
  - 頭に小さな紅葉/木の実のアクセサリー
  - ぱっちりした大きな目、ピンクの頬、いつも笑顔
- **性格**:
  - 元気で親しみやすい
  - 子供と仲良し、お姉さん感のある優しさ
  - 博士のアシスタントとして頼れる存在

## 採用経緯
- 元々は博士本人がクイズを読む設計だった (owl preset = 年配おじいさん風 babble voice)
- VOICEVOX で博士キャラに合うおじいさん風話者の候補が乏しく、採用断念
- 代わりにアシスタント役の新キャラとしてくるみちゃんを追加
- 博士キャラ自体は babble voice (`js/quizland-babble.js` の owl preset) で温存（OP シネマティック・ヒント等の博士セリフで継続使用）

## VOICEVOX 話者方針
- **元気で優しいお姉さん感の女声**
- 子供にも聞き取りやすいクリアな発音
- 明るすぎず暗すぎない、温かみのある声色
- 推奨候補（Cowork が VOICEVOX 最新版で試聴して最終選定）:
  - **冥鳴ひまり** ← 大人っぽい落ち着いた優しさ、お姉さん感、有力
  - **春日部つむぎ** ← 明るく元気、若い女子
  - **雨晴はう** ← 温かい優しさ、看護師さんイメージ
  - **九州そら / あまあま** ← 標準的な優しい大人女性
  - **WhiteCUL / ふつう** ← クリアで親しみやすい
  - **もち子さん** ← 可愛い元気
- 全 907 ファイル（テスト 27 + フル本体 880）を **同一話者で統一** (くるみちゃん = アシスタント = 問題読み上げ担当)

## 関連ファイル
- 発注書: `tmp/quizland-voicevox-order/COWORK-TEST-ORDER.md`, `tmp/quizland-voicevox-order/ORDER-FULL.md`
- 既存博士 voice: `js/quizland-babble.js` (owl preset、shift キャラ別)
- くるみ babble preset: `js/quizland-babble.js` の `kurumi` preset (下記「babble preset」参照)
- 立ち絵: `assets/images/characters/kurumi/dance/kurumi_001.webp` (439×602, 47KB, 透過維持)

## 役割設定 (確定: 2026-05-11)

- **博士の謎々を毎回出すアシスタント役**（毎回のルーチンとして定着している、初対面ではない）
- ポノとは元から知り合い → **「初めまして」系のセリフは絶対に入れない**（再会・初対面感の演出 NG）
- ポノの呼び方: **「ポノさん」**
- 博士の呼び方: **「はかせ」**（ひらがな統一、漢字「博士」はキャラ台詞では使わない）
- セリフトーン: 元気で優しい、お姉さん感
- OP 語彙統一: クイズ本編は「**なぞなぞ**」と呼ぶ。「クイズ」という単語をキャラ台詞では使わない

## OP シネマティック組み込み (Panel 2 / 5 / 6 + 表示維持仕様)

くるみちゃんは OP シネマティック (`quizland/index.html` 内 `playOpeningCinematic`) の **Panel 2 で初登場 → Panel 5 で博士から依頼を受ける → Panel 6 でも立ち絵が維持されたままクイズ本編へスムーズ遷移** する流れで組み込まれている。

### Panel 2 (3 行)

1. 博士「ほっほっほ…ポノか。よくきたのう」（既存）
2. **★追加** くるみ「こんにちは、ポノさん！」 (`speaker: 'kurumi'`、`kurumiImg: kurumi_001`)
3. ポノ「**はかせ**、くるみちゃん、あそびに きたよ！」（旧「はかせ、あそびに きたよ！」を修正、漢字「博士」を使わない）

### Panel 5 (4 行)

1. 博士「ほっほっほ、それでよい。…」（既存、3 行構成）
2. ポノ「うん！」（既存）
3. **★追加** 博士「くるみよ、いつもどおり **なぞなぞ**を おねがいするぞ」（OP 語彙統一で「クイズ」ではなく「なぞなぞ」）
4. **★追加** くるみ「はーい、まかせて！」 (`speaker: 'kurumi'`、`kurumiImg: kurumi_001`)

### Panel 6 (2 行、両方 line に `kurumiImg` 注入)

1. 博士「では、いくぞ…」 (`kurumiImg: kurumi_001` で立ち絵維持)
2. ポノ「うん！」 (`kurumiImg: kurumi_001` で立ち絵維持)

→ Panel 6 ではくるみは喋らないが **立ち絵だけは visible のまま**。クイズ本編に入る直前まで「くるみがそこにいる」状態を保ち、本編の問題読み上げ担当へスムーズに繋がる演出。

## 表示制御ロジック (実装)

`playOpeningCinematic` 内 dialogue render ループ (`quizland/index.html` ~L6094-L6122) の判定:

```js
const isKurumi = (d.speaker === 'kurumi');
// ...
const keepKurumiVisible = isKurumi || !!(d && d.kurumiImg);
if (keepKurumiVisible) {
  kurumiSide.classList.remove('hidden');
  kurumiSide.classList.add('is-visible');   // opacity 1 でフェードイン
} else {
  kurumiSide.classList.remove('is-visible'); // opacity 0 でフェードアウト
  // ただし src 未セットの panel では DOM ごと hidden にして領域を返す
  if (!kurumiImgEl || !kurumiImgEl.getAttribute('src')) {
    kurumiSide.classList.add('hidden');
  }
}
```

ポイント:
- **`speaker === 'kurumi'` または `d.kurumiImg` が定義されている line** で立ち絵 visible (= OR 条件)
- それ以外の line では opacity 0 で **フェードアウトのみ** (DOM は残置、レイアウトを動かさない)
- Panel 6 のように speaker は hakase/pono だが立ち絵は維持したい line は `kurumiImg: '...'` を明示注入
- `playOpeningCinematic` の `finally` で `is-visible` / `hidden` を全部クリア (replay 時の前回状態を持ち越さない)

## babble preset (確定値)

`js/quizland-babble.js` ~L71-L83:

```javascript
// Kurumi (リスのくるみちゃん): お姉さん感のある明るめ女声。
// baseFreq 450 = ポノ(520)より低くオウル(160)より高い、優しいお姉さん帯域。
// glide 上向き (元気)、 triangle で柔らかいトーン。
kurumi: {
  wave: 'triangle',
  baseFreq: 450,        // 博士(160) と ポノ(520) の中間、お姉さん感
  glide: 35,            // 上向き、元気
  duration: 0.08,
  attack: 0.006,
  release: 0.048,
  peakGain: 0.13,
  pitchSpread: 30
}
```

dialogue render ループでは `presetForLine = isHakase ? 'owl' : (isKurumi ? 'kurumi' : 'pono')` の 3 way で 1 文字ごとに `PonoBabble.playChar(c, preset)` を発火。

## CSS / DOM 構造

- HTML (`quizland/index.html` ~L3117): `.op-side.op-side-kurumi.op-side-overlay.hidden` の独立サイド要素
  - `<img class="op-char op-char-kurumi" id="op-char-kurumi">` を内包
- `.op-side-overlay` は **absolute オーバーレイ** で pono / hakase の 1:1 flex を壊さない
- フェード CSS (~L2407-L2410): `opacity 0 → 1` の 0.25s ease-out
- specificity 修正: `.op-sides > .op-side.op-side-overlay { flex: none; }` で flex item 化を確実に阻止 (cross-review HIGH 反映、sw v922+)
- 対話ボックスのラベル色: `.op-dialogue-single.is-kurumi .op-dialogue-label { background: #c46a4a; }` (茶色寄りオレンジ、リス感)
- speaker クラス切替: `.op-dialogue-single` に `is-pono` / `is-hakase` / `is-kurumi` の 3 way (~L6132)

## saved-layout.json での slot 配信

`quizland/saved-layout.json` の `__op_layout.{B,C,D}.kurumi` に slot + perVariant を持つ:

```json
"kurumi": {
  "slot": { "left": ..., "top": ..., "width": ..., "height": ..., "aspectLockRatio": ... },
  "perVariant": {
    "kurumi_001": { ... }
  }
}
```

初期値 (右寄せ配置、後で op-layout-editor で位置調整可能):
- B (1024×768): 280×380 程度、aspect 0.73
- C (1920×1080): 380×520 程度、aspect 0.73
- D (2560×1080): 460×630 程度、aspect 0.73

CSS デフォルト (`.op-side-kurumi .op-char-slot` per-VC media query) も同じ値で hardcode 済み。saved-layout.json で配信されない VC では CSS デフォルトに fallback。

## sw.js キャッシュバージョン

くるみ初投入時に `CACHE_VERSION = 921`、クロスレビュー指摘 4 件修正で `922` にバンプ済。
