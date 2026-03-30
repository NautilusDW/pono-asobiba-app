# ポノのあそびば - サウンドエフェクト制作ガイド

> このドキュメントを別のAIに渡して、SUNO AIでのSE制作を自動化するためのリファレンスです。

## 概要

子供向け（5歳）ひらがな学習アプリ「ポノのあそびば」の全画面で使用するサウンドエフェクト（SE）とBGMの一覧。
全てSUNO AI v5.5で生成する。

---

## SUNO AI 操作手順

### SE（効果音）の生成方法
1. suno.com → **Create** → **Custom** モード
2. ドロップダウンから **「Sounds」** を選択
3. **One Shot** を選択（単発SE用）
4. プロンプト欄に下記の英語プロンプトをコピペ
5. 生成（2バリエーション出る → 良い方を選択）
6. ダウンロード（MP3）

### BGM（背景音楽）の生成方法
1. suno.com → **Create** → **Custom** モード（通常のMusic）
2. **Style** 欄にプロンプトをコピペ
3. **Lyrics** 欄に `[Instrumental]` とだけ入力
4. 生成 → ダウンロード

### 共通の注意点
- 子供向けなので **怖い音・攻撃的な音は厳禁**
- SE は **短く**（0.2〜2.5秒）
- BGM は **ループ前提** で2〜3分程度
- 全て **ボーカルなし**（BGMは `no vocals, no humming, no singing, instrumental only` を必ず含める）

---

## ファイル命名規則

```
assets/sounds/{カテゴリ}/{ファイル名}.mp3
```

| カテゴリ | フォルダ |
|----------|----------|
| 共通SE | `assets/sounds/common/` |
| ゲーム別SE | `assets/sounds/{ゲーム名}/` |
| BGM | `assets/audio/` |

---

## A. 共通SE（common/） - 全画面で使用

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| A1 | `tap.mp3` | ボタンタップ | One Shot | `soft cute button click, bubbly digital pop, children's app UI, bright and gentle, 0.3 seconds` |
| A2 | `transition.mp3` | 画面遷移 | One Shot | `gentle whoosh transition, soft airy sweep with sparkle tail, kids app page turn, warm and playful, 0.8 seconds` |
| A3 | `menu_open.mp3` | メニュー開く | One Shot | `playful pop-up open sound, ascending bubbly chime, soft xylophone notes rising, children's app menu, 0.5 seconds` |
| A4 | `menu_close.mp3` | メニュー閉じる | One Shot | `soft descending chime, gentle closing sound, bubbly notes going down, warm children's UI, 0.4 seconds` |
| A5 | `achievement.mp3` | 実績解除 | One Shot | `cheerful achievement unlock jingle, bright glockenspiel fanfare with sparkle shimmer, rewarding and magical, children's game celebration, 2 seconds` |
| A6 | `login_bonus.mp3` | ログインボーナス | One Shot | `magical reward reveal, ascending harp glissando with sparkling chimes, warm and exciting surprise, treasure chest opening, 2.5 seconds` |
| A7 | `point.mp3` | ポイント獲得 | One Shot | `coin collect pickup, bright cheerful metallic ding with sparkle, cute game reward, 0.3 seconds` |
| A8 | `error.mp3` | エラー/不正解 | One Shot | `gentle wrong answer buzz, soft low-pitched wobble tone, not harsh or scary, friendly children's app error, 0.5 seconds` |

---

## B. writing（なぞり書き）SE - `assets/sounds/writing/`

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| B1 | `stroke.mp3` | なぞり中の筆音 | One Shot | `soft crayon drawing on paper, gentle continuous scratch texture, warm and satisfying, children writing sound, 1.5 seconds` |
| B2 | `stroke_done.mp3` | 一画完了 | One Shot | `gentle positive ping, soft ascending chime, subtle confirmation tone, warm and encouraging, 0.3 seconds` |
| B3 | `hanamaru.mp3` | 花丸（全画完成） | One Shot | `bright celebratory starburst jingle, sparkling chimes with xylophone melody, magical completion reward, adorable kids app success, 2 seconds` |
| B4 | `stroke_miss.mp3` | 書き順ミス | One Shot | `soft gentle nudge sound, friendly low boop, not scary or harsh, encouraging retry tone for children, 0.4 seconds` |

---

## C. drawing（おえかき）SE - `assets/sounds/drawing/`

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| C1 | `brush_start.mp3` | ブラシ描き始め | One Shot | `soft paint brush stroke start, gentle wet bristle touch on canvas, satisfying art sound, 0.5 seconds` |
| C2 | `color_select.mp3` | 色選択 | One Shot | `tiny bubbly pop, cute color palette selection, bright playful digital blip, 0.2 seconds` |
| C3 | `stamp.mp3` | スタンプ押し | One Shot | `rubber stamp press sound, soft thump with satisfying impact, cute crafting stamp, 0.3 seconds` |
| C4 | `eraser.mp3` | 消しゴム | One Shot | `soft eraser rubbing on paper, gentle friction sound, clean and satisfying, 0.8 seconds` |
| C5 | `clear_all.mp3` | 全消し | One Shot | `gentle sweeping clear sound, soft airy whoosh with sparkle, clean slate reset, 0.6 seconds` |

---

## D. coloring（ぬりえ）SE - `assets/sounds/coloring/`

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| D1 | `fill.mp3` | 塗り開始 | One Shot | `soft paint splash, gentle watercolor drip sound, colorful and playful, children's art app, 0.5 seconds` |
| D2 | `color_select.mp3` | 色選択 | One Shot | `cute bubbly pop, bright playful color selection blip, tiny digital chirp, 0.2 seconds` |
| D3 | `area_done.mp3` | エリア塗り完了 | One Shot | `gentle sparkle shimmer, soft magical completion chime, satisfying fill sound, 0.5 seconds` |
| D4 | `complete.mp3` | 全部塗り完了 | One Shot | `cheerful celebration fanfare, bright glockenspiel melody with sparkles, adorable kids app masterpiece complete, 2.5 seconds` |

### BGM（`assets/audio/coloring_bgm.mp3`）

**Style欄:**
```
lo-fi chill, gentle music box, soft xylophone, warm analog pad, dreamy and peaceful, no vocals, no humming, no singing, instrumental only, 90 BPM
```
**Lyrics欄:**
```
[Instrumental]
```

---

## E. stacking（つみき）SE - `assets/sounds/stacking/`

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| E1 | `drop.mp3` | ブロック落下 | One Shot | `wooden block dropping, soft thud landing impact, toy building block, satisfying and cute, 0.3 seconds` |
| E2 | `stack.mp3` | 積み上げ成功 | One Shot | `gentle stacking click, soft wooden block snapping into place, satisfying toy placement, 0.3 seconds` |
| E3 | `combo.mp3` | コンボ達成 | One Shot | `ascending cheerful combo chime, playful xylophone scale going up, exciting achievement cascade, 1 second` |
| E4 | `collapse.mp3` | 崩壊 | One Shot | `wooden blocks tumbling down, soft cascading clatter, toy blocks scattering, playful not scary, 1.5 seconds` |
| E5 | `clear.mp3` | クリア | One Shot | `bright victory jingle, cheerful celebration melody, sparkling chimes and xylophone, kids game level complete, 2 seconds` |

### BGM（`assets/audio/stacking_bgm.mp3`）

**Style欄:**
```
playful chiptune, cute 8-bit melody, bouncy toy piano, warm and cheerful, no vocals, no singing, instrumental only, 120 BPM
```
**Lyrics欄:**
```
[Instrumental]
```

---

## F. wordmatch（ことばあわせ）SE - `assets/sounds/wordmatch/`

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| F1 | `flip.mp3` | カードめくり | One Shot | `soft card flip sound, gentle paper turning, light and quick, 0.3 seconds` |
| F2 | `match.mp3` | マッチ成功 | One Shot | `bright happy match chime, two ascending sparkle tones, cheerful recognition ding, adorable kids game, 0.6 seconds` |
| F3 | `miss.mp3` | マッチ失敗 | One Shot | `soft gentle miss sound, two descending low tones, friendly and not discouraging, 0.5 seconds` |
| F4 | `clear.mp3` | レベルクリア | One Shot | `cheerful level complete jingle, bright melody with clapping percussion, kids game celebration, 2 seconds` |

### BGM（`assets/audio/wordmatch_bgm.mp3`）

**Style欄:**
```
gentle jazz, soft piano, light brushed drums, warm upright bass, cozy and focused, no vocals, no humming, instrumental only, 100 BPM
```
**Lyrics欄:**
```
[Instrumental]
```

---

## G. egg（たまご）SE - `assets/sounds/egg/`

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| G1 | `tap.mp3` | タップ（コンコン） | One Shot | `egg shell tapping, gentle knocking on hollow egg, cute tap tap sound, 0.3 seconds` |
| G2 | `crack.mp3` | ひび割れ | One Shot | `egg cracking sound, delicate shell fracturing, crispy crack with tiny fragments, 0.5 seconds` |
| G3 | `hatch.mp3` | 孵化 | One Shot | `magical hatching reveal, egg breaking open with sparkle burst, bright chimes ascending, wonderful surprise, 2 seconds` |
| G4 | `creature.mp3` | 生き物登場 | One Shot | `adorable creature appear sound, cute squeaky chirp with magical shimmer, baby animal reveal, 1 second` |

### BGM（`assets/audio/egg_bgm.mp3`）

**Style欄:**
```
gentle ambient, soft warm synth pad, twinkling music box, mysterious and cozy, no vocals, no humming, no singing, instrumental only, 80 BPM
```
**Lyrics欄:**
```
[Instrumental]
```

---

## H. room（おへや）SE - `assets/sounds/room/`

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| H1 | `place_furniture.mp3` | 家具配置 | One Shot | `soft furniture placement thud, gentle wooden drop on floor, satisfying room decoration, 0.4 seconds` |
| H2 | `place_deco.mp3` | デコ設置 | One Shot | `cute decorating pop, light sparkly placement sound, tiny cheerful blip, 0.3 seconds` |
| H3 | `dress_change.mp3` | 着替え | One Shot | `fabric rustling, soft clothing change swoosh, gentle wardrobe sound, 0.5 seconds` |
| H4 | `rotate.mp3` | 家具回転 | One Shot | `gentle turning click, soft mechanical rotation sound, smooth pivot, 0.3 seconds` |
| H5 | `remove.mp3` | 家具削除 | One Shot | `soft poof vanish sound, gentle airy disappear with tiny sparkle, 0.4 seconds` |

### BGM（`assets/audio/room_bgm.mp3`）

**Style欄:**
```
cozy room ambient, gentle music box melody, warm soft pad, peaceful and relaxing, children's bedroom music, no vocals, no humming, no singing, instrumental only, 85 BPM
```
**Lyrics欄:**
```
[Instrumental]
```

---

## I. message（おてがみ）SE - `assets/sounds/message/`

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| I1 | `type.mp3` | 文字入力 | One Shot | `soft typewriter key press, gentle mechanical click, cute vintage typing, 0.2 seconds` |
| I2 | `send.mp3` | 送信 | One Shot | `cheerful message sent whoosh, ascending sparkle trail, letter flying away sound, magical and happy, 1 second` |
| I3 | `receive.mp3` | 受信 | One Shot | `gentle notification arrival, soft bell chime with sparkle, new message alert, warm and inviting, 0.8 seconds` |

---

## J. breakout（ブロックくずし）SE - `assets/sounds/breakout/`

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| J1 | `paddle.mp3` | ボール打ち返し | One Shot | `paddle bounce hit, bright elastic boing, retro game ball reflect, clean and punchy, 0.2 seconds` |
| J2 | `brick.mp3` | ブロック破壊 | One Shot | `block break shatter, crispy digital destruction pop, retro arcade brick hit, satisfying, 0.3 seconds` |
| J3 | `fall.mp3` | 落下ミス | One Shot | `soft descending fail tone, gentle game over droop, not harsh, friendly miss sound, 0.6 seconds` |
| J4 | `clear.mp3` | クリア | One Shot | `retro arcade victory fanfare, bright chiptune celebration jingle, 8-bit triumph melody, 2 seconds` |

### BGM（`assets/audio/breakout_bgm.mp3`）

**Style欄:**
```
retro arcade, upbeat chiptune, 8-bit synthesizer, bouncy and energetic, no vocals, no singing, instrumental only, 130 BPM
```
**Lyrics欄:**
```
[Instrumental]
```

---

## K. slide（スライドパズル）SE - `assets/sounds/slide/`

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| K1 | `slide.mp3` | タイルスライド | One Shot | `smooth tile sliding click, soft plastic piece moving, satisfying puzzle slide, 0.2 seconds` |
| K2 | `complete.mp3` | 完成ファンファーレ | One Shot | `puzzle complete celebration, bright ascending chime melody with sparkle, magical jigsaw solved jingle, 2 seconds` |

---

## L. aquarium（すいそう）SE - `assets/sounds/aquarium/`

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| L1 | `tap_fish.mp3` | 生き物タップ | One Shot | `underwater bubble pop, soft aquatic blip, cute fish interaction, gentle and bubbly, 0.3 seconds` |
| L2 | `bubbles.mp3` | 泡 | One Shot | `tiny bubbles rising underwater, soft gurgling water sound, gentle aquarium ambience, 1 second` |
| L3 | `feed.mp3` | 餌やり | One Shot | `gentle splash, soft food dropping into water, tiny plop ripple sound, 0.4 seconds` |

---

## 総数

| 種別 | 数 |
|------|-----|
| 共通SE | 8 |
| ゲーム別SE | 43 |
| 新規BGM | 6 |
| **合計** | **57** |

---

## 既存BGMの活用（生成不要）

| ファイル | 現在の使用先 | 追加の使用先候補 |
|----------|-------------|-----------------|
| `Bubble Hop Playground.mp3` | aquarium | - |
| `Soft Crayon Day.mp3` | drawing | - |
| `Sunny Little Steps.mp3` | writing | - |
| `puzzle_bgm.mp3` | puzzle, slide | - |
| `Tap Tickle Loop.mp3` | bubble | - |
| `Soft Steps, Small Feet.mp3` | bubble | - |
| `title_bgm.mp3` | **未使用** | ホーム画面 |
| `こころにぽっぽっぽ.mp3` | **未使用** | room（BGM不要なら）or 予備 |

---

## フォルダ構成（最終形）

```
assets/
  audio/                          # BGM
    Bubble Hop Playground.mp3     # 既存: aquarium
    Soft Crayon Day.mp3           # 既存: drawing
    Sunny Little Steps.mp3        # 既存: writing
    puzzle_bgm.mp3                # 既存: puzzle, slide
    title_bgm.mp3                 # 既存: ホーム画面用
    こころにぽっぽっぽ.mp3          # 既存: 予備
    bubble/                       # 既存: bubble
      Tap Tickle Loop.mp3
      Soft Steps, Small Feet.mp3
    coloring_bgm.mp3              # 新規
    stacking_bgm.mp3              # 新規
    wordmatch_bgm.mp3             # 新規
    egg_bgm.mp3                   # 新規
    room_bgm.mp3                  # 新規
    breakout_bgm.mp3              # 新規
  sounds/                         # SE
    common/
      tap.mp3
      transition.mp3
      menu_open.mp3
      menu_close.mp3
      achievement.mp3
      login_bonus.mp3
      point.mp3
      error.mp3
    writing/
      stroke.mp3
      stroke_done.mp3
      hanamaru.mp3
      stroke_miss.mp3
    drawing/
      brush_start.mp3
      color_select.mp3
      stamp.mp3
      eraser.mp3
      clear_all.mp3
    coloring/
      fill.mp3
      color_select.mp3
      area_done.mp3
      complete.mp3
    stacking/
      drop.mp3
      stack.mp3
      combo.mp3
      collapse.mp3
      clear.mp3
    wordmatch/
      flip.mp3
      match.mp3
      miss.mp3
      clear.mp3
    egg/
      tap.mp3
      crack.mp3
      hatch.mp3
      creature.mp3
    room/
      place_furniture.mp3
      place_deco.mp3
      dress_change.mp3
      rotate.mp3
      remove.mp3
    message/
      type.mp3
      send.mp3
      receive.mp3
    breakout/
      paddle.mp3
      brick.mp3
      fall.mp3
      clear.mp3
    slide/
      slide.mp3
      complete.mp3
    aquarium/
      tap_fish.mp3
      bubbles.mp3
      feed.mp3
```

---

## 制作チェックリスト

生成したらチェックを入れてください:

### 共通SE
- [ ] A1: tap.mp3
- [ ] A2: transition.mp3
- [ ] A3: menu_open.mp3
- [ ] A4: menu_close.mp3
- [ ] A5: achievement.mp3
- [ ] A6: login_bonus.mp3
- [ ] A7: point.mp3
- [ ] A8: error.mp3

### writing
- [ ] B1: stroke.mp3
- [ ] B2: stroke_done.mp3
- [ ] B3: hanamaru.mp3
- [ ] B4: stroke_miss.mp3

### drawing
- [ ] C1: brush_start.mp3
- [ ] C2: color_select.mp3
- [ ] C3: stamp.mp3
- [ ] C4: eraser.mp3
- [ ] C5: clear_all.mp3

### coloring
- [ ] D1: fill.mp3
- [ ] D2: color_select.mp3
- [ ] D3: area_done.mp3
- [ ] D4: complete.mp3
- [ ] D5: coloring_bgm.mp3

### stacking
- [ ] E1: drop.mp3
- [ ] E2: stack.mp3
- [ ] E3: combo.mp3
- [ ] E4: collapse.mp3
- [ ] E5: clear.mp3
- [ ] E6: stacking_bgm.mp3

### wordmatch
- [ ] F1: flip.mp3
- [ ] F2: match.mp3
- [ ] F3: miss.mp3
- [ ] F4: clear.mp3
- [ ] F5: wordmatch_bgm.mp3

### egg
- [ ] G1: tap.mp3
- [ ] G2: crack.mp3
- [ ] G3: hatch.mp3
- [ ] G4: creature.mp3
- [ ] G5: egg_bgm.mp3

### room
- [ ] H1: place_furniture.mp3
- [ ] H2: place_deco.mp3
- [ ] H3: dress_change.mp3
- [ ] H4: rotate.mp3
- [ ] H5: remove.mp3
- [ ] H6: room_bgm.mp3

### message
- [ ] I1: type.mp3
- [ ] I2: send.mp3
- [ ] I3: receive.mp3

### breakout
- [ ] J1: paddle.mp3
- [ ] J2: brick.mp3
- [ ] J3: fall.mp3
- [ ] J4: clear.mp3
- [ ] J5: breakout_bgm.mp3

### slide
- [ ] K1: slide.mp3
- [ ] K2: complete.mp3

### aquarium
- [ ] L1: tap_fish.mp3
- [ ] L2: bubbles.mp3
- [ ] L3: feed.mp3
