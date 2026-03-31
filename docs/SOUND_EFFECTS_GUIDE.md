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

### プロンプト設計のポイント
- **具体的な楽器・素材名**を使う（「chime」ではなく「marimba」「kalimba」「woodblock」等）
- 各ゲームには**テーマ素材**がある（下記参照）— ゲーム内SEはそのテーマに沿わせる
- 「sparkle」「magical」「bright」「gentle」は控えめに — SUNOはこれらを同じキラキラ系シンセ音に変換しがち

---

## ゲーム別テーマ素材（SE差別化のための指針）

| ゲーム | テーマ素材 | 使うべきキーワード |
|--------|-----------|-------------------|
| writing | 鉛筆・紙・木 | pencil, paper, woodblock, marimba |
| drawing | 絵の具・筆 | paintbrush, canvas, marker, acrylic |
| coloring | クレヨン・色鉛筆 | crayon, wax, vibraphone, toy piano |
| stacking | 積み木・おもちゃ | wooden block, toy brick, temple block, drum |
| breakout | レトロゲーム | 8-bit, chiptune, square wave, pixel, NES |
| wordmatch | カード・紙 | card, paper snap, handclap |
| egg | 殻・生き物 | eggshell, ceramic, chirp, peep |
| room | 家具・部屋 | wood, fabric, porcelain, furniture |
| aquarium | 水・泡 | water, bubble, splash, underwater |
| slide | パズルピース | plastic, tile, click, snap |
| message | 手紙・郵便 | typewriter, paper airplane, brass bell |
| common | 各種ニュートラル | 上記のどれとも被らないユニークな音 |

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
| A1 | `tap.mp3` | ボタンタップ | One Shot | `short dry finger tap on hollow wood, single muted knock, no reverb, 0.2 seconds` |
| A2 | `transition.mp3` | 画面遷移 | One Shot | `quick airy woolen swoosh, fabric being pulled through air, soft and warm, 0.6 seconds` |
| A3 | `menu_open.mp3` | メニュー開く | One Shot | `three quick ascending marimba notes, playful staccato, wooden mallet on rosewood, 0.4 seconds` |
| A4 | `menu_close.mp3` | メニュー閉じる | One Shot | `two descending kalimba plucks, soft metallic decay, 0.3 seconds` |
| A5 | `achievement.mp3` | 実績解除 | One Shot | `toy trumpet fanfare with tambourine shake, triumphant 4-note melody, brass and percussion, children's parade, 2 seconds` |
| A6 | `login_bonus.mp3` | ログインボーナス | One Shot | `music box lid opening, slow ascending celesta arpeggio, warm analog reverb, treasure discovery, 2.5 seconds` |
| A7 | `point.mp3` | ポイント獲得 | One Shot | `single crisp coin landing on ceramic plate, clean metallic ring, short decay, 0.3 seconds` |
| A8 | `error.mp3` | エラー/不正解 | One Shot | `low rubber horn honk, muted and silly, cartoon-style wrong answer, not scary, 0.4 seconds` |
| A9 | `success.mp3` | 汎用成功 | One Shot | `warm ukulele strum chord, happy major resolution, Hawaiian feel, 1.5 seconds` |
| A10 | `countdown.mp3` | カウントダウン | One Shot | `three descending timpani beats then ascending horn blast, orchestral countdown 3-2-1-GO, 3.5 seconds` |
| A11 | `hint.mp3` | ヒント表示 | One Shot | `single glass bottle blow, hollow resonant hoot, owl-like soft tone, curious, 0.5 seconds` |
| A12 | `back.mp3` | 戻る | One Shot | `short reverse tape effect, quick rewind swoosh, going backward, 0.3 seconds` |

---

## B. writing（なぞり書き）SE - `assets/sounds/writing/`

テーマ: **鉛筆・紙・木の音**

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| B1 | `stroke.mp3` | なぞり中の筆音 | One Shot | `pencil scratching on textured paper, continuous graphite drawing sound, warm friction, ASMR writing, 1.5 seconds` |
| B2 | `stroke_done.mp3` | 一画完了 | One Shot | `single woodblock tick, sharp dry tap, no resonance, quick confirmation, 0.2 seconds` |
| B3 | `hanamaru.mp3` | 花丸（全画完成） | One Shot | `ascending xylophone run in C major scale, bouncy wooden mallet hits, ending on high octave with triangle ting, joyful completion, 2 seconds` |
| B4 | `stroke_miss.mp3` | 書き順ミス | One Shot | `muted rubber squeak, short dull thud on foam, soft and non-threatening, 0.3 seconds` |

---

## C. drawing（おえかき）SE - `assets/sounds/drawing/`

テーマ: **絵の具・筆・マーカー**

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| C1 | `brush_start.mp3` | ブラシ描き始め | One Shot | `wet paintbrush touching canvas, soft bristle spread sound, acrylic paint texture, 0.4 seconds` |
| C2 | `color_select.mp3` | 色選択 | One Shot | `plastic marker cap pop, tiny snap click, crisp and quick, 0.15 seconds` |
| C3 | `stamp.mp3` | スタンプ押し | One Shot | `rubber stamp press on ink pad then paper, firm cushioned thump, crafting desk, 0.3 seconds` |
| C4 | `eraser.mp3` | 消しゴム | One Shot | `soft eraser rubbing on paper, back-and-forth friction, chalky texture, 0.6 seconds` |
| C5 | `clear_all.mp3` | 全消し | One Shot | `large paintbrush sweeping across wet canvas, broad watery stroke, clean whoosh, 0.5 seconds` |

---

## D. coloring（ぬりえ）SE - `assets/sounds/coloring/`

テーマ: **クレヨン・色鉛筆**

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| D1 | `fill.mp3` | 塗り開始 | One Shot | `thick crayon coloring paper, waxy scribble stroke, satisfying fill texture, 0.4 seconds` |
| D2 | `color_select.mp3` | 色選択 | One Shot | `crayon box rattle, single crayon picked up from wooden box, light clatter, 0.2 seconds` |
| D3 | `area_done.mp3` | エリア塗り完了 | One Shot | `two ascending vibraphone notes a perfect fifth apart, warm metallic resonance, 0.4 seconds` |
| D4 | `complete.mp3` | 全部塗り完了 | One Shot | `toy piano playing cheerful 4-bar melody, upright miniature piano, nursery recital style, warm room acoustic, 2.5 seconds` |

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

テーマ: **積み木・木のおもちゃ**

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| E1 | `drop.mp3` | ブロック落下 | One Shot | `wooden building block dropping onto carpet, soft padded thud, toy playroom, 0.3 seconds` |
| E2 | `stack.mp3` | 積み上げ成功 | One Shot | `two wooden blocks clicking together, satisfying snap fit, toy brick alignment, 0.2 seconds` |
| E3 | `combo.mp3` | コンボ達成 | One Shot | `ascending wooden temple blocks, five rapid taps going higher in pitch, percussive roll, 0.8 seconds` |
| E4 | `collapse.mp3` | 崩壊 | One Shot | `pile of wooden blocks tumbling onto floor, cascading clatter, scattered toys, playful chaos, 1.2 seconds` |
| E5 | `clear.mp3` | クリア | One Shot | `toy drum roll ending with cymbal crash, children's marching band finish, triumphant, 2 seconds` |

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

テーマ: **カード・紙**

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| F1 | `flip.mp3` | カードめくり | One Shot | `playing card flick, single card turning over on table, crisp paper snap, 0.2 seconds` |
| F2 | `match.mp3` | マッチ成功 | One Shot | `two quick handclaps, rhythmic and cheerful, human clapping celebration, 0.4 seconds` |
| F3 | `miss.mp3` | マッチ失敗 | One Shot | `card sliding back, soft paper shuffle, quiet retreat sound, not discouraging, 0.3 seconds` |
| F4 | `clear.mp3` | レベルクリア | One Shot | `children clapping and giggling, group celebration, natural joyful reaction, 2 seconds` |

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

テーマ: **殻・生き物**

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| G1 | `tap.mp3` | タップ（コンコン） | One Shot | `fingernail tapping on hollow eggshell, delicate knock knock, ceramic resonance, 0.3 seconds` |
| G2 | `crack.mp3` | ひび割れ | One Shot | `eggshell cracking and splitting, thin ceramic fracture, crispy snap with fragments falling, 0.5 seconds` |
| G3 | `hatch.mp3` | 孵化 | One Shot | `eggshell breaking apart completely, fragments scattering on nest, followed by tiny bird peep, 1.5 seconds` |
| G4 | `creature.mp3` | 生き物登場 | One Shot | `baby chick chirping, tiny peep peep with fluttering wing sound, adorable newborn bird, 1 second` |

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

テーマ: **家具・部屋・インテリア**

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| H1 | `place_furniture.mp3` | 家具配置 | One Shot | `heavy wooden object placed on hardwood floor, solid satisfying thunk, furniture landing, 0.3 seconds` |
| H2 | `place_deco.mp3` | デコ設置 | One Shot | `small ceramic ornament placed on shelf, light porcelain tap, careful decoration placement, 0.2 seconds` |
| H3 | `dress_change.mp3` | 着替え | One Shot | `fabric rustling and clothing swoosh, quick outfit change, zipper and cloth sounds, 0.5 seconds` |
| H4 | `rotate.mp3` | 家具回転 | One Shot | `wooden furniture scraping slightly on floor, short grinding pivot turn, 0.25 seconds` |
| H5 | `remove.mp3` | 家具削除 | One Shot | `object being picked up from shelf, light suction release, lifting away sound, 0.3 seconds` |

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

テーマ: **手紙・郵便・タイプライター**

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| I1 | `type.mp3` | 文字入力 | One Shot | `old typewriter single keystroke, mechanical lever press and return, vintage click clack, 0.2 seconds` |
| I2 | `send.mp3` | 送信 | One Shot | `paper airplane throw, quick air release whoosh, letter flying, light and airy, 0.8 seconds` |
| I3 | `receive.mp3` | 受信 | One Shot | `mailbox opening, single brass hand bell ring, letter delivery notification, warm and clear, 0.6 seconds` |

---

## J. breakout（ブロックくずし）SE - `assets/sounds/breakout/`

テーマ: **レトロゲーム・8bit**

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| J1 | `paddle.mp3` | ボール打ち返し | One Shot | `retro 8-bit ball bounce, short square wave ping pong bleep, classic arcade reflect, 0.15 seconds` |
| J2 | `brick.mp3` | ブロック破壊 | One Shot | `8-bit explosion, short crunchy pixel destruction, retro NES block shatter, 0.2 seconds` |
| J3 | `fall.mp3` | 落下ミス | One Shot | `retro game descending wah-wah, 8-bit falling tone, classic arcade life lost, comedic not sad, 0.5 seconds` |
| J4 | `clear.mp3` | クリア | One Shot | `chiptune victory melody, 8-bit synthesizer fanfare, retro NES stage complete jingle, four ascending square wave notes, 2 seconds` |

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

テーマ: **パズルピース・プラスチック**

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| K1 | `slide.mp3` | タイルスライド | One Shot | `plastic puzzle tile clicking into slot, smooth sliding snap, mechanical grid movement, 0.2 seconds` |
| K2 | `complete.mp3` | 完成ファンファーレ | One Shot | `music box completing a phrase, final resolving notes with mechanical winding sound, puzzle solved, 2 seconds` |

---

## L. aquarium（すいそう）SE - `assets/sounds/aquarium/`

テーマ: **水・泡・水中**

| # | ファイル名 | 用途 | モード | SUNOプロンプト |
|---|-----------|------|--------|---------------|
| L1 | `tap_fish.mp3` | 生き物タップ | One Shot | `single underwater bubble pop, round watery blip, deep submerged plop, 0.2 seconds` |
| L2 | `bubbles.mp3` | 泡 | One Shot | `stream of small bubbles rising in water, effervescent fizzing, aquarium air pump, 1 second` |
| L3 | `feed.mp3` | 餌やり | One Shot | `small object splashing into water surface, tiny plop with ripple, fish food dropping, 0.3 seconds` |

---

## 総数

| 種別 | 数 |
|------|-----|
| 共通SE | 12 |
| ゲーム別SE | 43 |
| 新規BGM | 6 |
| **合計** | **61** |

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
      success.mp3
      countdown.mp3
      hint.mp3
      back.mp3
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
- [ ] A9: success.mp3
- [ ] A10: countdown.mp3
- [ ] A11: hint.mp3
- [ ] A12: back.mp3

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
