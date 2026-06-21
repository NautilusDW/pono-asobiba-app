# Codex 向け生成指示書 (Pono LP Hero 画像 4 枚)

> **morito → Codex への依頼**: このファイル全体をそのまま Codex CLI / ChatGPT (GPT-5 系) に貼り付けてください。 Codex は **画像生成 API (OpenAI Images / fal-ai 等) を呼び出す Python スクリプトを自分で書いて実行する** ことで 4 枚の AI 画像を生成し、 指定パスに保存し、 完了報告を返します。
>
> **重要な前提 (Codex は画像生成器ではない)**: Codex CLI 本体に画像生成機能はありません。 Codex の役割は ① `openai` / `fal-client` 等の Python SDK を呼ぶスクリプトを書く ② それを実行して PNG を取得する ③ ImageMagick / PIL / rembg で後処理する ④ 指定パスに配置する、 です。
>
> **環境前提が満たせない場合の代替経路**: もし API キーや Python 依存が揃わない場合は、 末尾の「Plan B: ブラウザ完結ルート」 セクションに従って ChatGPT Web UI (GPT-5 + 画像生成) で 4 枚生成 → morito が手動 DL → `assets/lp/hero/` に配置、 で進めても構いません。 どちらルートを取ったか報告に明記すること。

---

## あなた (Codex) への依頼

Pono Asobiba (子供向け Web 知育アプリ) の LP ヒーローセクション刷新のため、 **AI 画像 4 枚を生成して、 ローカルパス `d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/` 配下に PNG 保存** してください。 生成完了したら、 morito に「採用候補比較」 用のフォーマット報告を返してください。

**作業の進め方 (推奨: 段階分割実行)**: 21k 文字の本指示を 1 ターンで完遂しようとせず、 以下の 5 ステップに分けて実行してください。 各ステップ終わりで状態を簡潔に morito に報告してから次へ進む。

1. **Step 0**: 環境チェック (`echo $OPENAI_API_KEY` 等で API キー有無、 `python -c "import openai, PIL"` で依存有無、 ディレクトリ存在確認)。 不足があれば morito に通知して停止
2. **Step 1**: 画像 1 (h1 候補 A) を生成 → クロップ → 透過化 → 配置 → 中間確認
3. **Step 2**: 画像 2 (h1 候補 B) を Step 1 と同手順で
4. **Step 3**: 画像 3 (h1 候補 C) を Step 1 と同手順で
5. **Step 4**: 画像 4 (背景 washi) を生成 → クロップ → 配置
6. **Step 5**: 全 8 ファイル (各 1x + @2x) を確認して報告フォーマットで morito に提出

ツール選択、 試行回数管理、 後処理 (クロップ・透過化) は自律的に進めてよいですが、 5 回試行で失敗したら必ず morito に判断を仰ぐこと (勝手に諦めない)。

---

## 全体仕様 (4 枚共通の前提)

### 最終出力形式
- **解像度**: 1920×600 px (16:5 アスペクト比) — 高解像度版 `@2x` (3840×1200) も同時生成
- **フォーマット**: PNG (h1 候補 3 枚は **透過必須**、 背景 washi は不透過 OK)
- **色空間**: sRGB

### 直接生成不可制約 (重要)
1. **どの主要モデルも 16:5 を直接生成できない** → 必ず以下の二段工程で対応:
   - 第 1 段: 16:9 (DALL-E 3 なら 1792×1024、 nano-banana / flux なら `aspect_ratio: "16:9"`) で生成
   - 第 2 段: ImageMagick (`convert in.png -gravity center -crop 1920x600+0+0 +repage out.png`) または PIL / Sharp で **上下クロップ** して 1920×600 化
2. **どのモデルも完全透過 PNG をワンショットで出力できない** → 必ず以下の二段工程:
   - 第 1 段: 白背景 (pure white) で生成
   - 第 2 段: `fal-ai/birefnet` または `remove.bg` API または rembg (Python ローカル) で背景除去
3. **HEX カラーコードは flux / midjourney では半分くらい無視される** → 色名を併記済プロンプトを必ずそのまま使うこと (改変禁止)

### カラーパレット (LP のブランド色)
- `--primary` `#F2915A` warm orange / persimmon
- `--primary-deep` `#C96A2E` burnt sienna / deep terracotta
- `--primary-light` `#FDDCBF` peach / apricot cream
- `--text` `#5D4E37` walnut / dark warm brown
- LP 素地 `#FFF8F0` cream off-white

### ターゲット雰囲気
子供向け絵本 LP、 やわらかい、 あたたかい、 手作り感、 Komako Sakai / Akiko Hayashi / Eric Carle / Taro Gomi / Leo Lionni の絵本表紙系。

---

## ツール選択ガイダンス

### 日本語ひらがな生成成功率 (実績ベース)
| モデル | 日本語可読性 | 試行回数目安 | 備考 |
| --- | --- | --- | --- |
| DALL-E 3 (gpt-image-1 / ChatGPT) | ★★★★★ | 1-2 回 | 本命。 1792×1024 直接。 |
| nano-banana (Gemini 2.5 Flash Image) | ★★★★ | 2-3 回 | クレヨン/水彩質感が得意。 |
| fal-ai flux-pro v1.1 | ★★ | 4-8 回 | 質感○ 文字× |
| midjourney v6.1+ | ★★ | 4-8 回 | 質感○ 文字× |

### 推奨試行順序 (h1 カリグラフィ 3 枚)
**DALL-E 3 (gpt-image-1) → nano-banana → flux-pro → midjourney**

DALL-E 3 で文字が読めるものが 1 枚出たら、 それを seed 画像にして他モデルで質感バリエーションを作るのが最速。

### 推奨試行順序 (背景 washi)
**fal-ai flux-pro → midjourney → nano-banana → DALL-E 3**

washi はテキストなし・質感重視なので、 flux-pro と midjourney が本命。

### 5 回試行ルール (重要)
任意の 1 枚で 5 回試行しても日本語ひらがなが読めなかった場合:
- morito に「手書きスキャン経路」 または「日本語フォント切替経路」 への切り替えを提案
- 試行ログ (使用モデル × プロンプト × 結果サマリ) を morito に提示
- 勝手に当該カットを諦めて他カットだけ完成させず、 必ず途中で morito に判断を仰ぐ

---

## 画像 1: h1 カリグラフィ 候補 A (クレヨン水彩)

絵本表紙風のやわらかいカリグラフィ。 クレヨンと水彩の重なりが温かみと手作り感を出す、 標準採用候補。

### スペック
- 文言: 「みて、」「さわって、」「あそぼう」 を 3 行縦並び (中央揃え)
- スタイル: 絵本表紙風カリグラフィ、 クレヨン + 水彩、 Komako Sakai / Akiko Hayashi 系
- 色: メインストローク `#F2915A` warm orange、 句読点 (、) と濁点ドットは `#5D4E37` walnut
- アスペクト: 16:5 (16:9 生成 → 上下クロップ)
- 出力ファイル: `assets/lp/hero/h1_calligraphy_a.png` + `assets/lp/hero/h1_calligraphy_a@2x.png` (透過 PNG)

### Main Prompt (英語、 そのまま使用すること)
```
Hand-painted Japanese hiragana picture-book cover calligraphy, three lines stacked vertically reading "みて、" (mi-te) on the first line, "さわって、" (sa-wa-tte) on the second line, "あそぼう" (a-so-bo-u) on the third line, centered horizontally with generous breathing room. Soft crayon and watercolor texture, warm and inviting like a beloved children's storybook title in the style of Eric Carle or Komako Sakai picture books. Main strokes painted in a warm orange tone (warm orange, persimmon, hex #F2915A) with gentle watercolor bleeds; the small punctuation marks (、) and dakuten dots rendered in dark warm brown (dark warm brown, walnut, hex #5D4E37). Visible paper grain under the strokes, slight wax-resist texture, subtle uneven pigment density giving a handmade picture-book feel. Rounded, friendly, slightly wobbly handwritten letterforms with playful child-friendly proportions. Pure white background (will be removed in post-processing), no characters, no people, no extra decoration, no border, only the calligraphy text.
```

### Negative Prompt
```
photorealistic, 3d render, sharp vector, digital font, computer typography, gothic, serif, sans-serif, neon, glow, gradient mesh, drop shadow, outline border, frame, watermark, signature, logo, mascot, character, person, hand, animal, background fill, paper texture background, gradient background, color background, multiple colors beyond brown and orange, blue, green, purple, pink, red saturated, cluttered, busy composition, misspelled hiragana, latin letters, kanji, katakana, english text
```

### モデル別補助 (失敗時の追加指示)
- **DALL-E 3**: 「3 行縦並びでひらがな表記、 1 行目みて、 2 行目さわって、 3 行目あそぼう」 を日本語で追記
- **nano-banana**: 末尾に `exact hiragana characters: み, て, さ, わ, っ, て, あ, そ, ぼ, う` を追加
- **flux-pro**: 末尾に `text content: "みて、さわって、あそぼう" rendered as three stacked lines`、 `aspect_ratio: "16:9"`、 `guidance_scale: 3.5-4.0`
- **midjourney**: `--ar 16:5 --style raw --stylize 100 --q 2 --no background, text border, frame`、 ダメなら `--ar 3:1` で再試行

---

## 画像 2: h1 カリグラフィ 候補 B (鉛筆 + 水彩 wash)

繊細・素朴・私信風。 「ノートにそっと書かれた一言」 のような優しい表情。

### スペック
- 文言: 「みて、」「さわって、」「あそぼう」 を 3 行縦並び
- スタイル: 細い鉛筆線 + 薄い水彩 wash、 Komako Sakai / Akiko Hayashi 系
- 色: メイン `#F2915A` warm orange の淡い水彩、 句読点は `#5D4E37` walnut
- アスペクト: 16:5 (16:9 生成 → 上下クロップ)
- 出力ファイル: `assets/lp/hero/h1_calligraphy_b.png` + `assets/lp/hero/h1_calligraphy_b@2x.png` (透過 PNG)

### Main Prompt
```
Delicate hand-drawn Japanese hiragana calligraphy on pure white background, three lines stacked vertically reading "みて、" (mi-te) on line one, "さわって、" (sa-wa-tte) on line two, "あそぼう" (a-so-bo-u) on line three, centered with airy spacing. Style reference: the tender hand-lettering of Komako Sakai or Akiko Hayashi picture books. Primary strokes drawn in fine pencil and thin ink line, then partially washed with translucent watercolor in a warm orange tone (warm orange, persimmon, hex #F2915A) where the brush gently kisses the letters; punctuation marks (、) and dakuten dots in soft dark brown (dark warm brown, walnut, hex #5D4E37). The feeling is a quiet handwritten letter in a sketchbook — fragile, tender, slightly imperfect, with visible graphite grain inside the strokes and tiny watercolor bleed halos along the edges. Loose, intimate, slightly cursive picture-book handwriting, not bold, not loud. Pure white background (will be removed in post-processing), no paper texture, no characters, no decorations, no border, only the calligraphy text.
```

### Negative Prompt
```
bold, thick brush, marker, heavy ink, crayon, oil paint, acrylic, digital font, vector, sans-serif, gothic, serif, neon, glow, drop shadow, outline border, frame, watermark, logo, mascot, character, person, animal, hand, background fill, gradient background, color background, blue, green, purple, pink, saturated red, cluttered, busy, misspelled hiragana, latin letters, kanji, katakana, english text
```

### モデル別補助
- **nano-banana**: `thin pencil stroke, light watercolor wash` を強調
- **flux-pro**: 線が消えそうなら `medium-weight pencil, visible line` で補強、 `guidance_scale: 3.5-4.0`、 steps 30
- **midjourney**: `--ar 16:5 --style raw --stylize 100 --q 2 --no background, paper texture, text frame`
- **DALL-E 3**: 「鉛筆と水彩の手紙風カリグラフィ」 と日本語追記、 3-4 回試行覚悟

---

## 画像 3: h1 カリグラフィ 候補 C (大胆クレヨン)

子供がクレヨンで力強く描いたような bold で元気な表情。 LP のエネルギーを最も強く打ち出す候補。

### スペック
- 文言: 「みて、」「さわって、」「あそぼう」 を 3 行縦並び
- スタイル: 太く力強いクレヨンストローク、 Eric Carle / Taro Gomi / Leo Lionni 系
- 色: メイン `#F2915A` warm orange + ハイライト `#FDDCBF` peach + シャドウ `#C96A2E` burnt sienna の 3 色重ね塗り、 句読点は `#5D4E37` walnut
- アスペクト: 16:5 (16:9 生成 → 上下クロップ)
- 出力ファイル: `assets/lp/hero/h1_calligraphy_c.png` + `assets/lp/hero/h1_calligraphy_c@2x.png` (透過 PNG)

### Main Prompt
```
Bold, energetic children's crayon hand-lettering of Japanese hiragana, three lines stacked vertically reading "みて、" (mi-te) on line one, "さわって、" (sa-wa-tte) on line two, "あそぼう" (a-so-bo-u) on line three, centered with confident spacing. Style reference: Eric Carle, Taro Gomi, and Leo Lionni picture-book cover lettering — bold, joyful, child-made. Thick waxy crayon strokes pressed firmly into textured paper, with playful unevenness as if drawn by a happy child. Main strokes in warm orange (warm orange, persimmon, hex #F2915A) layered with patches of lighter peach (peach, apricot cream, hex #FDDCBF) and deeper burnt orange (burnt sienna, deep terracotta, hex #C96A2E) where the crayon was pressed harder; punctuation marks (、) and dakuten dots in dark warm brown (dark warm brown, walnut, hex #5D4E37). Visible crayon wax grain, slight smudges, joyful imperfect letterforms with rounded child-like curves. Picture-book cover energy: cheerful, warm, hand-made, full of life. Pure white background (will be removed in post-processing), no paper texture visible, no characters, no people, no animals, no decorations, no border, only the calligraphy text.
```

### Negative Prompt
```
thin line, pencil, fineliner, ink pen, watercolor wash only, digital font, vector, sharp edge, sans-serif, gothic, serif, neon, glow, gradient mesh, drop shadow, outline border, frame, watermark, logo, mascot, character, person, animal, hand, background fill, gradient background, color background, blue, green, purple, pink, saturated red, cluttered, busy composition, misspelled hiragana, latin letters, kanji, katakana, english text
```

### モデル別補助
- **nano-banana**: `thick crayon, wax texture, child-like` を強調
- **flux-pro**: 色が単色化する場合 `multi-tone crayon layering: warm orange base, peach highlight, burnt sienna shadow (hex #F2915A / #FDDCBF / #C96A2E)` を明示
- **midjourney**: `--ar 16:5 --style raw --stylize 250 --q 2 --no background, text border, frame` (装飾過多なら 150 から段階的に試行)
- **DALL-E 3**: 「子供がクレヨンで描いた大胆な手書き文字、 3 色のオレンジ重ね塗り」 と日本語追記

---

## 画像 4: 背景 washi テクスチャ

ヒーロー上部 2/3 を覆う和紙背景。 真上俯瞰、 下辺が手でちぎった不規則エッジ。

### スペック
- スタイル: 真上俯瞰マクロ写真、 和紙、 下辺が手ちぎりエッジ (deckle)、 影なし
- 色: `#FDDCBF` → `#FFF8F0` のグラデーション、 kozo 繊維の自然な inclusions
- アスペクト: 16:5 (16:9 または 21:9 生成 → クロップ)
- 出力ファイル: `assets/lp/hero/bg_washi.png` + `assets/lp/hero/bg_washi@2x.png` (透過不要、 JPG も可)

### Main Prompt
```
Top-down flat macro photograph of a single sheet of warm cream-colored Japanese washi paper, filling the entire frame, photographed from directly above at 90 degrees. The paper color graduates softly between hex #FDDCBF and hex #FFF8F0, with natural fiber inclusions visible — long kozo plant fibers, tiny specks, organic irregular texture. The bottom edge of the paper is hand-torn with an uneven, slightly feathered deckle, exposing raw fiber tufts along the tear line. The top, left, and right edges extend cleanly beyond the frame (no visible edges there). Warm soft natural daylight from above, even illumination, absolutely no cast shadow on or under the paper, no curl, no fold, no crease. Calm, tactile, picture-book endpaper feeling. No text, no people, no characters, no animals, no objects, no border, no frame, no graphic overlay.
```

### Negative Prompt
```
shadow, drop shadow, cast shadow, curl, fold, crease, wrinkle, tilt, perspective, 3d angle, isometric, person, hand, character, animal, text, letters, hiragana, kanji, katakana, latin, calligraphy, logo, watermark, signature, frame, border, vignette, gradient overlay, color cast blue, color cast green, color cast purple, saturated, neon, glow, sparkle, glitter, decoration, sticker, stain, ink blot, blood, dark patches, mold, damaged paper, hole, rip beyond bottom edge
```

### モデル別補助
- **flux-pro** (本命): `aspect_ratio: "21:9"` で生成して 16:5 にクロップが扱いやすい
- **midjourney**: `--ar 16:5 --style raw --q 2 --no shadow, text, character, border`
- **nano-banana**: 影が出る場合 `flat lighting, no shadow` を再強調
- **DALL-E 3**: 「真上から撮った和紙のマクロ写真、 下辺が手でちぎられたエッジ、 影なし」 と日本語追記

---

## 後処理ワークフロー (4 枚共通)

各画像について以下を順に実行:

### Step 1: 生成
推奨モデル順序に従って、 white background + 16:9 (or 21:9) で生成。 1 枚成功するまで最大 5 回試行。

### Step 2: 16:5 クロップ
```bash
# ImageMagick の例 (1920×600 を中央クロップ)
magick input.png -gravity center -resize 1920x1080^ -crop 1920x600+0+240 +repage output_cropped.png

# Python PIL の例
from PIL import Image
img = Image.open("input.png").resize((1920, 1080), Image.LANCZOS)
img.crop((0, 240, 1920, 840)).save("output_cropped.png")
```
ピクセル比 1920×600 (16:5) になることを確認。

### Step 3: 透過化 (h1 候補 A / B / C のみ、 背景 washi は不要)
推奨優先順位:
1. `fal-ai/birefnet` (API、 品質最高)
2. `remove.bg` API
3. `rembg` (Python ローカル: `rembg i input.png output.png`)

純白背景なので、 鉛筆系の細線が消えないよう **threshold を強めにしない** こと。 透過後に α チャンネルが正しく入っているか PIL / Photoshop で確認。

### Step 4: @2x 高解像度版生成
ベース 1920×600 を生成したら、 同じシードまたは同じ手順で 3840×1200 を生成 (または ESRGAN 等で 2x アップスケール)。

### Step 5: ファイル名と配置
```
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/h1_calligraphy_a.png
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/h1_calligraphy_a@2x.png
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/h1_calligraphy_b.png
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/h1_calligraphy_b@2x.png
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/h1_calligraphy_c.png
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/h1_calligraphy_c@2x.png
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/bg_washi.png
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/bg_washi@2x.png
```

**重要: ディレクトリは現状未作成** — `assets/lp/` も `assets/lp/hero/` も `_raw/` も存在しないので、 作業開始時に以下を必ず実行:

```bash
# Windows PowerShell の場合
mkdir -p d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/_raw

# Git Bash / WSL の場合
mkdir -p /d/AppDevelopment/pono-asobiba-app/assets/lp/hero/_raw
```

---

## 品質チェック観点 (生成後に必ず確認)

各カットを納品前に Codex 自身が以下を点検:

1. **可読性**: 「みて、 さわって、 あそぼう」 が一目で読めるか。 別文字に化けていないか。
2. **改行**: 3 行構成になっているか。 1 行や 2 行に崩れていないか。
3. **色味**: メイン色が `#F2915A` 近傍 (warm orange) か。 蛍光オレンジや赤に振れていないか。
4. **文字サイズバランス**: 1 行目と 3 行目の文字サイズが極端に違っていないか。
5. **透過**: h1 候補は完全透過か。 白背景が残っていないか (α チャンネル確認)。
6. **オフセット**: テキストが中央に配置されているか。 端に寄っていないか。
7. **色温度**: 寒色寄りに転んでいないか。 暖かみのある仕上がりか。
8. **背景 washi**: 影・折り目・テキストが入っていないか。 下辺の torn edge が自然か。

不合格なら同じカットを再試行 (5 回上限)。

---

## morito への報告フォーマット

全 4 枚 (高解像度版含めて 8 ファイル) が `assets/lp/hero/` に配置完了したら、 以下のフォーマットで morito に報告:

```
✅ Pono LP Hero 画像 生成完了

- h1_calligraphy_a.png + @2x  ([モデル名]、 試行 X 回目で成功)
- h1_calligraphy_b.png + @2x  ([モデル名]、 試行 Y 回目で成功)
- h1_calligraphy_c.png + @2x  ([モデル名]、 試行 Z 回目で成功)
- bg_washi.png + @2x          ([モデル名]、 試行 W 回目で成功)

配置先: d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/

品質チェック: 全項目クリア (可読性 / 改行 / 色味 / 透過 / 中央配置 / 暖色 / washi 影なし)

morito へ → 候補 A / B / C を見比べて採用 1 本を選び、 Claude Code に
「h1 は h1_calligraphy_X を採用」 と伝えてください。 実装エージェントが
index.html 更新と sw.js の CACHE_VERSION バンプを行います。
```

5 回試行で失敗したカットがある場合は、 上記の代わりに以下を返す:

```
⚠️ 一部カット生成失敗

成功:
- [成功カット一覧]

失敗:
- [カット名] (試行 5 回、 全モデル試行済み、 主な崩れ方: [説明])

morito 判断要請:
A. 手書きスキャン経路 (morito がクレヨン/鉛筆で書いて撮影 → 透過化)
B. 日本語フォント切替経路 (フォントワークス「マキナス」 等で CSS 描画化、 画像不要)

どちらに切り替えるか指示してください。
```

---

## 制約・禁止事項 (必ず守ること)

- **配信は Cloudflare Workers 一択**。 Netlify は廃止済 → 生成画像内にこれらの単語やロゴを描かないこと
- **子供のキャラ・人物・顔は描かない**。 Pono ブランドは別途キャラ素材があるため、 ヒーロー画像はテキスト + washi のみ
- **「無料」「Free」 のテキスト要素を絶対に描かない**。 景表法および 3 ティア (free/book/sub) ポリシー上の理由
- **HEX カラーコードを改変しない**。 プロンプト内の `#F2915A` 等はそのまま使う
- **モデルにアスペクト 16:5 を直接要求しない**。 必ず 16:9 / 21:9 / 3:1 等のサポート比で生成して後でクロップ
- **ファイル名を改変しない**。 LP 実装側が決め打ちで参照するため

---

## Codex の自律判断ガイド

- API キーや課金枠が足りない場合は morito に通知して停止。 勝手に低スペックモデルへフォールバックして品質劣化させない
- 一度成功した seed / プロンプトは試行ログに記録し、 @2x 生成時に再利用
- 中間ファイル (16:9 元画像、 透過化前) も `assets/lp/hero/_raw/` に保存して、 後から morito が手修正できるようにする
- 後処理コマンド (ImageMagick / rembg) が環境にない場合は `pip install rembg pillow` 等で自動セットアップ。 ImageMagick は Windows 11 では `winget install ImageMagick.ImageMagick` でも入る (ただし PATH 反映に再起動が必要なケースあり)。 失敗したら morito に通知

---

## Plan B: ブラウザ完結ルート (API キー / Python が無い場合)

morito の環境に OpenAI / fal-ai の API キーや Python が無い、 または Codex がスクリプト実行で詰まった場合は、 以下に切り替える:

1. **画像生成**: ChatGPT (Plus 以上) Web UI で GPT-5 + 画像生成 (gpt-image-1) を使い、 本指示書の「画像 1〜4」 セクションの Main Prompt を 1 枚ずつ貼り付けて生成
2. **クロップ (16:9 → 16:5)**: ブラウザの [squoosh.app](https://squoosh.app) または [iloveimg.com/crop-image](https://www.iloveimg.com/crop-image) で 1920×600 にクロップ
3. **透過化** (h1 候補のみ): [remove.bg](https://www.remove.bg) Web UI に DL した PNG をドラッグ → 透過 PNG を DL
4. **@2x**: ChatGPT に「同じプロンプトで 2 倍解像度版を再生成」 を依頼、 または [upscayl.org](https://upscayl.org) のデスクトップアプリで 2x アップスケール
5. **配置**: morito が手動で `d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/` に DL して配置 (ディレクトリが無ければ Windows エクスプローラで新規作成)

このルートを取った場合、 Codex は「Plan B 採用、 morito 手動配置待ち」 と報告すれば完了とみなす。

---

## morito 向け補足 (技術非依存メモ)

- Codex CLI を初めて使う場合: `codex` コマンドで起動 → このファイル全体を貼り付け → Enter
- Codex が途中で「API キーが見つからない」 等を聞いてきたら、 答えられる範囲で答える。 不明なら「Plan B でいい」 と返事すれば自動切替
- 生成中の中間ファイルは `assets/lp/hero/_raw/` に残るので、 気に入らなかったら後で morito が手動で差し替えできる
- 4 枚揃ったら、 morito は候補 A / B / C を目で見比べて 1 本選ぶだけ。 採用後の HTML / CSS / sw.js 更新は Claude Code 側 (実装エージェント) が引き取る

---

morito、 このファイル全体を Codex に貼り付ければ段階分割で完結します。 開始前に Codex に API キー (OpenAI / fal-ai / remove.bg のいずれか) が設定されているか確認 — 無ければ Plan B に自動切替されます。
