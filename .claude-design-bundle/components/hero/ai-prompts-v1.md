# Pono LP Hero AI 生成プロンプト集 (v1)

## 採用デザイン概要

BG#3 (やぶれた絵本の見返し紙) × TYPO#2 (絵本タイトルロゴ風カリグラフィ) の組み合わせ。 ヒーロー上部 2/3 を温かいクリーム色の washi が覆い、 下辺は手でちぎった不規則エッジで素の背景 (#FFF8F0) に遷移する。 h1 「みて、 さわって、 あそぼう」 は AI 生成のカリグラフィ画像として配置し、 h2 はブラウザ側 Zen Maru Gothic 鉛筆風 CSS で描画する。 メインカラーは warm orange #F2915A、 アクセントは deep #C96A2E と light #FDDCBF、 文字補助は dark brown #5D4E37。

## ⚠️ morito への最初の注意 (必読)

1. **どのモデルも 1920x600 (16:5) を直接生成できない**。 16:9 または 1:1 で生成 → Photoshop / Figma / ImageMagick で 16:5 にクロップが必須。
2. **どのモデルも完全透過 PNG をワンショットで出力できない**。 必ず白背景で生成し、 `remove.bg` / `fal-ai/birefnet` / Photoshop の「背景を削除」 で透過抜きする後工程が入る。
3. **日本語ひらがな生成は DALL-E 3 と nano-banana (Gemini) が二強**。 flux-pro / midjourney は半数以上で文字が崩れる前提で 4-8 回試行を覚悟。 最悪、 日本語が出ない場合は **手書き → スキャン → ベクトル化** または **書道家への外注** に切り替える判断基準を持っておく。
4. **HEX カラーコード (#F2915A 等) は flux / midjourney では半分くらい無視される**。 色名 (warm orange / peach / burnt orange / dark warm brown) を必ず併記済 (本ファイルは併記済)。
5. 推奨試行順序: **DALL-E 3 → nano-banana → flux-pro → midjourney**。 DALL-E 3 で文字が読めるものが 1 枚出たら、 それを seed 画像にして他モデルで質感バリエーションを作るのが最速。

---

## プロンプト 1: h1 カリグラフィ 候補 A (クレヨン水彩)

絵本表紙風のやわらかいカリグラフィ。 クレヨンと水彩の重なりが温かみと手作り感を出す、 標準採用候補。

### Main Prompt

```
Hand-painted Japanese hiragana picture-book cover calligraphy, three lines stacked vertically reading "みて、" (mi-te) on the first line, "さわって、" (sa-wa-tte) on the second line, "あそぼう" (a-so-bo-u) on the third line, centered horizontally with generous breathing room. Soft crayon and watercolor texture, warm and inviting like a beloved children's storybook title in the style of Eric Carle or Komako Sakai picture books. Main strokes painted in a warm orange tone (warm orange, persimmon, hex #F2915A) with gentle watercolor bleeds; the small punctuation marks (、) and dakuten dots rendered in dark warm brown (dark warm brown, walnut, hex #5D4E37). Visible paper grain under the strokes, slight wax-resist texture, subtle uneven pigment density giving a handmade picture-book feel. Rounded, friendly, slightly wobbly handwritten letterforms with playful child-friendly proportions. Pure white background (will be removed in post-processing), no characters, no people, no extra decoration, no border, only the calligraphy text.
```

### Negative Prompt

```
photorealistic, 3d render, sharp vector, digital font, computer typography, gothic, serif, sans-serif, neon, glow, gradient mesh, drop shadow, outline border, frame, watermark, signature, logo, mascot, character, person, hand, animal, background fill, paper texture background, gradient background, color background, multiple colors beyond brown and orange, blue, green, purple, pink, red saturated, cluttered, busy composition, misspelled hiragana, latin letters, kanji, katakana, english text
```

### 仕様

- アスペクト比: 16:5
- 解像度: 1920x600px (高解像度版は 3840x1200 推奨)
- フォーマット: PNG (透過必須)

### ツール別補足

- **nano-banana (Gemini 2.5 Flash Image)**: 日本語ひらがなの再現精度が比較的高い (本件の本命)。 標準アスペクト比は 1:1 / 16:9 / 9:16 / 4:3 / 3:4 のみ → **16:9 で生成→上下クロップして 16:5 化** が王道。 文字が崩れたら "exact hiragana characters: み, て, さ, わ, っ, て, あ, そ, ぼ, う" と読み仮名を末尾に追加。 透過は生成後に背景白を抜く必要があるので、 white background → `remove.bg` または `fal-ai/birefnet` の二段で処理。
- **fal-ai flux-pro v1.1**: 日本語文字は崩れやすい (3-5 回再ロールが前提)。 prompt 末尾に `text content: "みて、さわって、あそぼう" rendered as three stacked lines` と明示。 `aspect_ratio: "16:9"` 指定後に上下クロップで 16:5 に整える。 透過は別途 `fal-ai/birefnet` で背景除去。
- **midjourney v6.1+**: `--ar 16:5` は **有効 (1:2 〜 2:1 範囲内)** だが極端比のため構図崩れやすい。 末尾に `--ar 16:5 --style raw --stylize 100 --q 2 --no background, text border, frame` を付与。 日本語は半数以上で崩れるので生成 4 枚から最も読める 1 枚を選び、 vary region で文字修正。 文字がどうしても出ない時は `--ar 3:1` で生成→クロップ。
- **DALL-E 3 (ChatGPT)**: 日本語表現は最強だが、 **アスペクト比は 1024x1024 / 1792x1024 / 1024x1792 の 3 種のみ** で 16:5 直接生成不可。 **1792x1024 (≒16:9) で生成→ Photoshop / Figma で上下クロップして 1920x600 化** が必須手順。 「3 行縦並びでひらがな表記、 1 行目みて、 2 行目さわって、 3 行目あそぼう」 と日本語追記で精度上昇。 背景は white で生成し、 別途 remove.bg 等で透過化。

### 使用方法 (生成後)

- ファイル名: `assets/lp/hero/h1_calligraphy_a.png` (高解像度は `h1_calligraphy_a@2x.png`)
- LP 組み込み: `<picture>` + `sr-only <h1>` + `aria-hidden="true" <img>`、 詳細は実装エージェント担当

---

## プロンプト 2: h1 カリグラフィ 候補 B (鉛筆 + 水彩 wash)

繊細・素朴・私信風。 「ノートにそっと書かれた一言」 のような優しい表情。

### Main Prompt

```
Delicate hand-drawn Japanese hiragana calligraphy on pure white background, three lines stacked vertically reading "みて、" (mi-te) on line one, "さわって、" (sa-wa-tte) on line two, "あそぼう" (a-so-bo-u) on line three, centered with airy spacing. Style reference: the tender hand-lettering of Komako Sakai or Akiko Hayashi picture books. Primary strokes drawn in fine pencil and thin ink line, then partially washed with translucent watercolor in a warm orange tone (warm orange, persimmon, hex #F2915A) where the brush gently kisses the letters; punctuation marks (、) and dakuten dots in soft dark brown (dark warm brown, walnut, hex #5D4E37). The feeling is a quiet handwritten letter in a sketchbook — fragile, tender, slightly imperfect, with visible graphite grain inside the strokes and tiny watercolor bleed halos along the edges. Loose, intimate, slightly cursive picture-book handwriting, not bold, not loud. Pure white background (will be removed in post-processing), no paper texture, no characters, no decorations, no border, only the calligraphy text.
```

### Negative Prompt

```
bold, thick brush, marker, heavy ink, crayon, oil paint, acrylic, digital font, vector, sans-serif, gothic, serif, neon, glow, drop shadow, outline border, frame, watermark, logo, mascot, character, person, animal, hand, background fill, gradient background, color background, blue, green, purple, pink, saturated red, cluttered, busy, misspelled hiragana, latin letters, kanji, katakana, english text
```

### 仕様

- アスペクト比: 16:5
- 解像度: 1920x600px (高解像度版は 3840x1200 推奨)
- フォーマット: PNG (透過必須)

### ツール別補足

- **nano-banana**: 細線が得意。 `thin pencil stroke, light watercolor wash` を強調すれば候補 A より淡くなる。 16:9 で生成→ 16:5 クロップ。
- **fal-ai flux-pro v1.1**: 鉛筆表現は強いが、 線が消えそうなときは `medium-weight pencil, visible line` で補強。 ステップ数 30、 `guidance_scale: 3.5-4.0` 推奨。
- **midjourney v6.1+**: `--style raw --stylize 100` で過剰な装飾を抑える。 `--ar 16:5 --q 2 --no background, paper texture, text frame`。
- **DALL-E 3**: 「鉛筆と水彩の手紙風カリグラフィ」 と日本語で追記すると意図が通りやすい。 候補 A より失敗確率高めなので 3-4 回試行を覚悟。 1792x1024 → 16:5 クロップ必須。

### 使用方法 (生成後)

- ファイル名: `assets/lp/hero/h1_calligraphy_b.png` (高解像度は `h1_calligraphy_b@2x.png`)
- LP 組み込み: `<picture>` + `sr-only <h1>` + `aria-hidden="true" <img>`、 詳細は実装エージェント担当

---

## プロンプト 3: h1 カリグラフィ 候補 C (大胆クレヨン)

子供がクレヨンで力強く描いたような bold で元気な表情。 LP のエネルギーを最も強く打ち出す候補。

### Main Prompt

```
Bold, energetic children's crayon hand-lettering of Japanese hiragana, three lines stacked vertically reading "みて、" (mi-te) on line one, "さわって、" (sa-wa-tte) on line two, "あそぼう" (a-so-bo-u) on line three, centered with confident spacing. Style reference: Eric Carle, Taro Gomi, and Leo Lionni picture-book cover lettering — bold, joyful, child-made. Thick waxy crayon strokes pressed firmly into textured paper, with playful unevenness as if drawn by a happy child. Main strokes in warm orange (warm orange, persimmon, hex #F2915A) layered with patches of lighter peach (peach, apricot cream, hex #FDDCBF) and deeper burnt orange (burnt sienna, deep terracotta, hex #C96A2E) where the crayon was pressed harder; punctuation marks (、) and dakuten dots in dark warm brown (dark warm brown, walnut, hex #5D4E37). Visible crayon wax grain, slight smudges, joyful imperfect letterforms with rounded child-like curves. Picture-book cover energy: cheerful, warm, hand-made, full of life. Pure white background (will be removed in post-processing), no paper texture visible, no characters, no people, no animals, no decorations, no border, only the calligraphy text.
```

### Negative Prompt

```
thin line, pencil, fineliner, ink pen, watercolor wash only, digital font, vector, sharp edge, sans-serif, gothic, serif, neon, glow, gradient mesh, drop shadow, outline border, frame, watermark, logo, mascot, character, person, animal, hand, background fill, gradient background, color background, blue, green, purple, pink, saturated red, cluttered, busy composition, misspelled hiragana, latin letters, kanji, katakana, english text
```

### 仕様

- アスペクト比: 16:5
- 解像度: 1920x600px (高解像度版は 3840x1200 推奨)
- フォーマット: PNG (透過必須)

### ツール別補足

- **nano-banana**: クレヨン質感の再現が得意。 `thick crayon, wax texture, child-like` が効きやすい。 16:9 で生成→ 16:5 クロップ。
- **fal-ai flux-pro v1.1**: 太いストロークは得意だが、 色が単色になりがちなので `multi-tone crayon layering: warm orange base, peach highlight, burnt sienna shadow (hex #F2915A / #FDDCBF / #C96A2E)` を明示。
- **midjourney v6.1+**: `--ar 16:5 --style raw --stylize 250 --q 2 --no background, text border, frame`。 子供っぽい質感が強く出るが、 stylize 250 は装飾過多になる場合あり (150 から段階的に試行)。
- **DALL-E 3**: 「子供がクレヨンで描いた大胆な手書き文字、 3 色のオレンジ重ね塗り」 と日本語で追記すると効果的。 1792x1024 → 16:5 クロップ必須。

### 使用方法 (生成後)

- ファイル名: `assets/lp/hero/h1_calligraphy_c.png` (高解像度は `h1_calligraphy_c@2x.png`)
- LP 組み込み: `<picture>` + `sr-only <h1>` + `aria-hidden="true" <img>`、 詳細は実装エージェント担当

---

## プロンプト 4: 背景 washi テクスチャ

ヒーロー上部 2/3 を覆う和紙背景。 真上俯瞰、 下辺が手でちぎった不規則エッジ。

### Main Prompt

```
Top-down flat macro photograph of a single sheet of warm cream-colored Japanese washi paper, filling the entire frame, photographed from directly above at 90 degrees. The paper color graduates softly between hex #FDDCBF and hex #FFF8F0, with natural fiber inclusions visible — long kozo plant fibers, tiny specks, organic irregular texture. The bottom edge of the paper is hand-torn with an uneven, slightly feathered deckle, exposing raw fiber tufts along the tear line. The top, left, and right edges extend cleanly beyond the frame (no visible edges there). Warm soft natural daylight from above, even illumination, absolutely no cast shadow on or under the paper, no curl, no fold, no crease. Calm, tactile, picture-book endpaper feeling. No text, no people, no characters, no animals, no objects, no border, no frame, no graphic overlay.
```

### Negative Prompt

```
shadow, drop shadow, cast shadow, curl, fold, crease, wrinkle, tilt, perspective, 3d angle, isometric, person, hand, character, animal, text, letters, hiragana, kanji, katakana, latin, calligraphy, logo, watermark, signature, frame, border, vignette, gradient overlay, color cast blue, color cast green, color cast purple, saturated, neon, glow, sparkle, glitter, decoration, sticker, stain, ink blot, blood, dark patches, mold, damaged paper, hole, rip beyond bottom edge
```

### 仕様

- アスペクト比: 16:5
- 解像度: 1920x600px (高解像度版は 3840x1200 推奨)
- フォーマット: PNG (透過不要、 JPG も可)

### ツール別補足

- **nano-banana**: マクロ写真表現が安定。 影が出る場合は `flat lighting, no shadow` を再強調。 16:9 で生成→ 16:5 クロップ。
- **fal-ai flux-pro v1.1**: 質感がきれいに出る。 `aspect_ratio: "21:9"` 生成→ 16:5 にクロップが扱いやすい (本テクスチャは背景文字より自由度が高く、 flux-pro が本命)。
- **midjourney v6.1+**: `--ar 16:5 --style raw --q 2 --no shadow, text, character, border`。 紙質表現が非常に強い。 washi 用途では本命候補。
- **DALL-E 3**: 「真上から撮った和紙のマクロ写真、 下辺が手でちぎられたエッジ、 影なし」 と日本語追記。 影が出やすいので複数試行推奨。 1792x1024 → 16:5 クロップ必須。

### 使用方法 (生成後)

- ファイル名: `assets/lp/hero/bg_washi.png` (または `bg_washi.jpg` で軽量化、 高解像度は `bg_washi@2x.png`)
- LP 組み込み: ヒーローセクション上部 2/3 に `background-image` として配置、 下辺の torn edge は CSS `clip-path` または PNG 透過エッジで素の背景 (#FFF8F0) に遷移。 詳細は実装エージェント担当

---

## 共通ガイダンス

### 「みて、 さわって、 あそぼう」 3 行表記時の改行位置

- 1 行目: 「みて、」 (読点込み)
- 2 行目: 「さわって、」 (読点込み)
- 3 行目: 「あそぼう」 (読点なし、 体言止めで力強く)

各行の文字数は 3 / 5 / 4 でリズムが整う。 視覚的には中央揃え、 ベースラインは緩やかなウェーブを許容。

### 日本語ひらがな生成のコツ

- ひらがなを正確に出すために、 main prompt の冒頭で `Japanese hiragana` を明示する。
- 文字列は引用符付きで列挙する (`"みて、"`, `"さわって、"`, `"あそぼう"`)。
- 失敗時は読み仮名 (例: `mi-te, sa-wa-tte, a-so-bo-u`) を末尾に補助情報として追加 (本ファイルは追加済)。
- flux 系・midjourney 系は日本語が崩れたら、 vary region / inpaint で文字部分だけ再生成するのが早い。
- DALL-E 3 と nano-banana が日本語に最も強い。 候補 1 本目はこの 2 つから始めるのが安全。

### 保険プラン (AI が日本語を出せなかった場合)

8-10 回試行しても可読な「みて、 さわって、 あそぼう」 が 1 枚も得られなかった場合の代替案:

1. **手書き → スキャン経路**: morito が紙にクレヨン/鉛筆で書いた h1 をスマホで撮影 → Photoshop で背景白抜き → PNG 化。 質感は AI 経由より自然になる。
2. **AI に「質感だけ」 描かせる経路**: 文字部分を空欄にしたカリグラフィ風テクスチャを flux で生成 → Figma / Illustrator で Zen Maru Gothic 等の日本語フォント上に質感をマスク適用。
3. **完全手書きフォント経路**: フォントワークス「マキナス」 や「ふい字」 など子供向け日本語フォントを商用利用可ライセンスで購入し、 CSS で h1 描画 (画像化不要)。 この場合は本ファイル不要。

morito 判断: 5 回試行で 1 枚も使えなかったら 1 を、 9-10 回試行でダメなら 3 に切り替えるのが現実的。

### 生成品質チェック観点

1. **可読性**: 「みて、 さわって、 あそぼう」 が一目で読めるか。 別文字に化けていないか。
2. **改行**: 3 行構成になっているか。 1 行や 2 行に崩れていないか。
3. **色味**: メイン色が #F2915A 近傍 (warm orange) か。 蛍光オレンジや赤に振れていないか。
4. **文字サイズバランス**: 1 行目と 3 行目の文字サイズが極端に違っていないか。
5. **透過**: h1 候補は完全透過か。 白背景が残っていないか。
6. **オフセット**: テキストが中央に配置されているか。 端に寄っていないか。
7. **色温度**: 寒色寄りに転んでいないか。 暖かみのある仕上がりか。
8. **背景 washi**: 影・折り目・テキストが入っていないか。 下辺の torn edge が自然か。

---

## 後工程 (生成完了後の手順)

1. morito が候補 A / B / C の 3 種類を見比べて、 採用する 1 本を選定する。
2. 採用ファイルと背景 washi を `assets/lp/hero/` に配置する (透過 PNG 推奨、 必要に応じて @2x も)。
3. Claude Code に 「採用したファイル名 + 配置パス」 を伝える (例: 「h1 は `h1_calligraphy_a.png` を採用、 背景は `bg_washi.png`」)。
4. 実装エージェントが `index.html` (LP セクション) を更新し、 `sw.js` の `CACHE_VERSION` をバンプ、 staging (`pono-asobiba-app-staging.ndw.workers.dev`) で表示確認する。
5. staging 確認後、 morito の OK を受けて本番ブランチへマージし、 Cloudflare Workers にデプロイする。
