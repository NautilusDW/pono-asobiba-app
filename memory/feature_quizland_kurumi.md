---
name: Quizland リスのくるみちゃん（アシスタントキャラ）
description: フクロウ博士のクイズの新アシスタントキャラ。リスの女の子、元気で優しいお姉さん感、VOICEVOX 音声で問題文を読み上げる役。立ち絵は 13 ポーズ variants を assets に展開済、OP シネマティック (Panel 2 / 5 / 6) に組み込み済 + op-layout-editor で 13 ポーズ × 3 VC の slot 個別調整可能 (sw v921 OP 初投入 / v922 クロスレビュー反映 / v923 13 ポーズ管理機能)
type: feature
---

# Quizland リスのくるみちゃん

## キャラクター設定
- **名前**: リスのくるみちゃん（くるみ）
- **種族**: リス（茶色＋クリーム色の毛色）
- **役割**: フクロウ博士のアシスタント。クイズの問題文と選択肢を読み上げる
- **見た目**:
  - ふさふさの大きなしっぽ
  - 首に **赤いもみじ風スカーフ**
  - 頭に **小さな紅葉 + どんぐり風アクセサリー**
  - ぱっちりした大きな目、ピンクの頬、いつも笑顔
- **絵柄スタイル基準**:
  - 絵本風水彩タッチ（やわらかいエッジ、淡い陰影）
  - パレット: 茶 + クリーム + アクセントの紅葉赤、全 variant で統一
  - 透過 PNG / WebP（背景なし）
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
- 立ち絵 13 variants: `assets/images/characters/kurumi/dance/kurumi_*.webp`（次節）

## 役割設定 (確定: 2026-05-11)

- **博士の謎々を毎回出すアシスタント役**（毎回のルーチンとして定着している、初対面ではない）
- ポノとは元から知り合い → **「初めまして」系のセリフは絶対に入れない**（再会・初対面感の演出 NG）
- ポノの呼び方: **「ポノさん」**
- 博士の呼び方: **「はかせ」**（ひらがな統一、漢字「博士」はキャラ台詞では使わない）
- セリフトーン: 元気で優しい、お姉さん感
- OP 語彙統一: クイズ本編は「**なぞなぞ**」と呼ぶ。「クイズ」という単語をキャラ台詞では使わない

## ポーズアセット運用 (13 variants 確定: sw v923+)

`assets/images/characters/kurumi/dance/` 配下に **基準スタイル統一済み 13 variants** を展開済み。 全 variant で **赤いもみじ風スカーフ・頭飾り（紅葉+どんぐり）・絵本風水彩タッチ・パレット** が完全一致しており、 ポーズだけが差し替わる構造。

| variant | ファイル | ポーズ説明 | 主な用途 |
|---|---|---|---|
| 001 | `kurumi_001.webp` | 基準正面立ち絵 | デフォルト立ち姿、 fallback、 saved-layout 初期値 |
| hi | `kurumi_hi.webp` | **左手大きく挨拶** | 元気な挨拶、 OP Panel 2 で「こんにちは、ポノさん！」 |
| wave | `kurumi_wave.webp` | 右手で控えめに振る | やわらかい挨拶、 軽い相槌 |
| hooray | `kurumi_hooray.webp` | 両腕万歳・正面笑顔 | 強い喜び、 正解時のお祝い |
| wink | `kurumi_wink.webp` | **ウインク + こぶし** | 元気な合意、 OP Panel 5 で「はーい、まかせて！」 |
| clasp | `kurumi_clasp.webp` | **両手胸前で組む** | 落ち着いた立ち姿、 OP Panel 6 で立ち絵維持 |
| idea | `kurumi_idea.webp` | 閃き・人差し指 + キラキラ | ヒント / 「わかった！」 / お助けセリフ |
| point | `kurumi_point.webp` | 左方向指差し | 「これは…」「みて」 系 / 答え誘導 |
| calm | `kurumi_calm.webp` | 両手頬に添える + 目閉じ微笑 | やさしい微笑、 静かな共感 |
| pray | `kurumi_pray.webp` | 両手お腹前で組む（お辞儀風） | 「おねがい」「ありがとう」 |
| book | `kurumi_book.webp` | 本を読む（緑表紙） | 問題文読み上げ、 学習シーン |
| cheer | `kurumi_cheer.webp` | 両腕万歳・応援風 | 応援、 励まし、 リトライ時 |
| greet | `kurumi_greet.webp` | 左手挨拶・控えめバリアント | hi より落ち着いた挨拶のバリアント |

### 生成元 / スタイル基準

- 元データ: `kurumi_001.webp` を基準に Codex 経由で再生成（visual style 抽出 → 詳細仕様化 → 12 ポーズ regen 発注、 後追いで `cheer` / `greet` を新規追加して計 13）
- 全 variant 共通:
  - 透過 PNG / WebP、 背景なし
  - 同一頭身比率（全身フレーム）
  - 正面寄り（横向き完全 90° は無し、 「やや斜め＋顔は正面」 が基本）
  - 表情ベースは笑顔、 ウインク・目閉じ等は variant ごとに差し替え

### 用途指針

- OP cinematic（次節）は `001` / `hi` / `wink` / `clasp` の 4 variants を使い分け
- 通常クイズ画面の演出（正解時 hooray / 励まし cheer / 読み上げ book / ヒント idea 等）は今後の拡張で variant を増やしていく余地あり
- editor (`tools/op-layout-editor.html`) で 13 variants 全部の slot 位置・サイズを per-VC で個別編集できる（次節「op-layout-editor 拡張」参照）

## OP シネマティック組み込み (Panel 2 / 5 / 6 + variant 確定値)

くるみちゃんは OP シネマティック (`quizland/index.html` 内 `playOpeningCinematic`) の **Panel 2 で初登場 → Panel 5 で博士から依頼を受ける → Panel 6 でも立ち絵が維持されたままクイズ本編へスムーズ遷移** する流れで組み込まれている。 各 Panel で使う立ち絵 variant は次のとおり確定 (sw v923+):

### Panel 2 (3 行)

1. 博士「ほっほっほ…ポノか。よくきたのう」（既存）
2. **★追加** くるみ「こんにちは、ポノさん！」 (`speaker: 'kurumi'`、`kurumiImg: kurumi_hi.webp` ← 左手大きく挨拶)
3. ポノ「**はかせ**、くるみちゃん、あそびに きたよ！」（旧「はかせ、あそびに きたよ！」を修正、漢字「博士」を使わない）

### Panel 5 (4 行)

1. 博士「ほっほっほ、それでよい。…」（既存、3 行構成）
2. ポノ「うん！」（既存）
3. **★追加** 博士「くるみよ、いつもどおり **なぞなぞ**を おねがいするぞ」（OP 語彙統一で「クイズ」ではなく「なぞなぞ」）
4. **★追加** くるみ「はーい、まかせて！」 (`speaker: 'kurumi'`、`kurumiImg: kurumi_wink.webp` ← ウインク + こぶし)

### Panel 6 (2 行、両方 line に `kurumiImg: kurumi_clasp.webp` 注入)

1. 博士「では、いくぞ…」 (`kurumiImg: kurumi_clasp.webp` で立ち絵維持)
2. ポノ「うん！」 (`kurumiImg: kurumi_clasp.webp` で立ち絵維持)

→ Panel 6 ではくるみは喋らないが **両手胸前で組んだ立ち姿（clasp）が visible のまま**。クイズ本編に入る直前まで「くるみがそこにいる」状態を保ち、本編の問題読み上げ担当へスムーズに繋がる演出。

### variant 選定の意図

- Panel 2 = `hi`: 初登場 → 大きな挨拶で目立たせる
- Panel 5 = `wink`: 「まかせて！」 の元気な合意 → ウインク + こぶしの自信ポーズ
- Panel 6 = `clasp`: 喋らずに立っているだけ → 両手胸前で組む落ち着いた立ち姿（hooray のような派手なポーズだと「待機」感が壊れるため）

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
- Panel 6 のように speaker は hakase/pono だが立ち絵は維持したい line は `kurumiImg: 'kurumi_clasp.webp'` のように **明示注入**
- `playOpeningCinematic` の `finally` で `is-visible` / `hidden` を全部クリア (replay 時の前回状態を持ち越さない)

## op-layout-editor 拡張 (sw v923+)

`tools/op-layout-editor.html` を拡張し、 ポノ / 博士に並ぶ **「くるみ側」タブ** を追加。 13 variants × 3 VC (B / C / D) で slot 位置・サイズ・透過オフセット等を個別編集して saved-layout.json に publish できる。

### 追加要素

| 要素 | 内容 |
|---|---|
| `KURUMI_VARIANTS` 定数 | 13 variants 名のリスト (`kurumi_001` / `kurumi_hi` / ... / `kurumi_greet`) |
| `kurumiPerVariantDefaults` | 13 variants 全部に per-variant defaults (基準は `kurumi_001` と同値、 後で editor で個別調整) |
| `defaultsFor()` 内 `kurumi` object | B / C / D 別の base slot サイズ (B 280×380 / C 380×520 / D 460×630、 aspect 0.73、 右寄せ) |
| 右ペイン (`buildRightPane()`) | くるみ variant ドロップダウン (13 ポーズから選択 → preview 即時切替) |
| `applySideToDom('kurumi')` 分岐 | くるみ側の slot inline style 適用処理 |
| `kurumiPathByName()` ヘルパ | variant 名 → assets パスの解決 |
| `buildRuntimeOpLayout()` | `kurumi: sideSnap(s.kurumi, true)` を追加（perVariant 込みで publish payload に含める） |
| CSS rule 生成ループ | `['pono', 'hakase', 'kurumi']` の 3 way に拡張 |
| Speaker ラジオ | 「ポノが話す / 博士が話す」 に **「くるみが話す」** を追加 |
| `migrateFrameIds` | 既存 editor state に kurumi seed を backfill + perVariant 13 ポーズを backfill |
| **mirror mode は kurumi 対象外** | mirror モード（左右反転して片方の編集を反映）は pono ⇄ hakase の 2 者間のみ。 くるみは独立 overlay なので対象外 |

### バグ修正（ついでに）

- `ponoPerVariantDefaults` の **`dance_wave` 漏れ** を修正（line 1697）。 v905 拡張時に backfill リストから漏れていたため、 既存 editor で `dance_wave` だけ defaults が空のまま読まれる事象を解消

### saved-layout.json `__op_layout` 拡張

`__op_layout.{B,C,D}.kurumi.perVariant` を **1 entry (`kurumi_001` のみ) → 13 entries** に拡張済。 全 variant が `kurumi_001` と同じ初期値で開始（後で editor の variant ドロップダウンで個別に調整可能）。

```json
"kurumi": {
  "slot": { "left": ..., "top": ..., "width": ..., "height": ..., "aspectLockRatio": ... },
  "perVariant": {
    "kurumi_001": { ... },
    "kurumi_hi":  { ... },
    "kurumi_wave": { ... },
    "kurumi_hooray": { ... },
    "kurumi_wink": { ... },
    "kurumi_clasp": { ... },
    "kurumi_idea": { ... },
    "kurumi_point": { ... },
    "kurumi_calm": { ... },
    "kurumi_pray": { ... },
    "kurumi_book": { ... },
    "kurumi_cheer": { ... },
    "kurumi_greet": { ... }
  }
}
```

初期値 (右寄せ配置、 後で op-layout-editor で位置調整可能):
- B (1024×768): 280×380 程度、 aspect 0.73
- C (1920×1080): 380×520 程度、 aspect 0.73
- D (2560×1080): 460×630 程度、 aspect 0.73

CSS デフォルト (`.op-side-kurumi .op-char-slot` per-VC media query) も同じ値で hardcode 済み。 saved-layout.json で配信されない VC では CSS デフォルトに fallback。

### 編集ワークフロー

1. ローカル editor (`?edit=1`) を開いて 「くるみ側」 タブを選択
2. variant ドロップダウンで対象ポーズ（例: `kurumi_clasp`）を選び、 slot をドラッグして位置・サイズを調整
3. 13 variants 分繰り返し（共通の slot で済むなら 1 回でも OK、 ポーズによってはみ出す場合は variant ごとに微調整）
4. 「📋 JSON のみクリップボード」 で `pono-op-layout-v1` schema をコピー → AI チャットに貼付け
5. orchestrator が `saved-layout.json` の `__op_layout.{B,C,D}.kurumi.perVariant.{variant}` をマージ + commit + auto push
6. develop → staging → 全端末反映

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

## sw.js キャッシュバージョン

- v921: くるみ初投入 (Panel 2 / 5 でセリフ追加 + babble preset + 立ち絵 1 variant)
- v922: クロスレビュー指摘 4 件修正 (Panel 6 立ち絵維持 + ひらがな統一 + 「なぞなぞ」語彙統一 + overlay specificity 強化)
- **v923 (現行)**: kurumi 13 ポーズ管理機能 (op-layout-editor 「くるみ側」 タブ + 13 variants × 3 VC perVariant 配信 + Panel 2/5/6 の variant 確定割当 + ponoPerVariantDefaults `dance_wave` 漏れ修正)
