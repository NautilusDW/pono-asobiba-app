# Codex 向け生成指示書 (Pono LP ブランドロゴ画像 4 候補)

> **morito → Codex への依頼**: このファイル全体をそのまま Codex CLI / ChatGPT (GPT-5 系) に貼り付けてください。 Codex は **画像生成 API (OpenAI Images / fal-ai 等) を呼び出す Python スクリプトを自分で書いて実行する** ことで 4 候補の AI 画像を生成し、 指定パスに保存し、 完了報告を返します。
>
> **重要な前提 (Codex は画像生成器ではない)**: Codex CLI 本体に画像生成機能はありません。 Codex の役割は ① `openai` / `fal-client` 等の Python SDK を呼ぶスクリプトを書く ② それを実行して PNG を取得する ③ ImageMagick / PIL / rembg で後処理する ④ 指定パスに配置する、 です。
>
> **環境前提が満たせない場合の代替経路**: もし API キーや Python 依存が揃わない場合は、 末尾の「Plan B: ブラウザ完結ルート」 セクションに従って ChatGPT Web UI (GPT-5 + 画像生成) で 4 候補生成 → morito が手動 DL → `assets/lp/hero/` に配置、 で進めても構いません。 どちらルートを取ったか報告に明記すること。

---

## ⚠️ morito からの最重要注意

これは既存の **キャッチコピー画像 (`h1_calligraphy_*.png`、 「みて、 さわって、 あそぼう」 3 行) とは別物**です。 今回作るのは LP / アプリストア / SNS / 絵本宣伝にも転用できる **公式ブランドロゴ「ポノのあそびば」 (7 文字、 先頭 2 字「ポノ」 のみカタカナ + 残り 5 字「のあそびば」 ひらがな、 横 1 行)** です。

> **⚠️ アスペクト比注意**: 最終納品は **16:5 (1920×600)** だが、 DALL-E 3 / nano-banana / flux / midjourney いずれも 16:5 を直接生成できない。 **必ず 16:9 で生成 → ImageMagick / PIL で上下クロップ** する二段工程を踏むこと。 詳細は「後処理ワークフロー」 参照。
>
> **⚠️ 透過注意**: 全候補とも透過 PNG 必須。 ワンショットでは出ない。 **必ず白背景で生成 → birefnet / remove.bg / rembg で α 抜き** する二段工程を踏むこと。 既存 h1 (`h1_calligraphy.png`) と同じ手順で揃えること。

LP の現状ヒーローでは「みて、 さわって、 あそぼう」 ばかりが大きく出ていて、 本来のサイト名が抜けています。 想定構造は以下:

```
[小〜中] みて、 さわって、 あそぼう   ← キャッチコピー (kicker、 既存 h1 画像を維持)
[大]    ポノのあそびば            ← ブランドロゴ (今回これを作る)
[lead]   ポノの あそびばで できること
```

つまりこの画像は **既存 h1 画像と縦に並んで違和感がない、 同じ世界観の手描きトーン** であることが最優先。 既存 h1 のトーン (ガッシュ + 水彩ハイブリッド、 warm orange 系、 句読点は walnut brown) と並べて喧嘩しないこと。

---

## あなた (Codex) への依頼

Pono Asobiba (子供向け Web 知育アプリ) の LP ヒーローセクション刷新のため、 **ブランドロゴ「ポノのあそびば」 を 4 バリエ生成して、 ローカルパス `d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/` 配下に PNG 保存** してください。 生成完了したら、 morito に「採用候補比較」 用のフォーマット報告を返してください。

**作業の進め方 (推奨: 段階分割実行)**: 本指示を 1 ターンで完遂しようとせず、 以下の 6 ステップに分けて実行してください。 各ステップ終わりで状態を簡潔に morito に報告してから次へ進む。

1. **Step 0**: 環境チェック (`echo $OPENAI_API_KEY` 等で API キー有無、 `python -c "import openai, PIL"` で依存有無、 ディレクトリ存在確認)。 不足があれば morito に通知して停止
2. **Step 1**: 候補 A (純粋テキストロゴ) を生成 → クロップ → 透過化 → 配置 → 中間確認
3. **Step 2**: 候補 B (テキスト + ポノ silhouette) を Step 1 と同手順で
4. **Step 3**: 候補 C (テキスト + 装飾要素) を Step 1 と同手順で
5. **Step 4**: 候補 D (キャラ全身入りロゴ) を Step 1 と同手順で
6. **Step 5**: 全 8 ファイル (各 1x + @2x) を確認して報告フォーマットで morito に提出

ツール選択、 試行回数管理、 後処理 (クロップ・透過化) は自律的に進めてよいですが、 5 回試行で失敗したら必ず morito に判断を仰ぐこと (勝手に諦めない)。

---

## 全体仕様 (4 候補共通の前提)

### 最終出力形式
- **解像度**: 1920×600 px (16:5 アスペクト比) — 高解像度版 `@2x` (3840×1200) も同時生成
- **フォーマット**: PNG (全候補とも **透過必須**)
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
- アクセント (teal) `#3E8B8B` muted teal (既存 h1 が orange + teal + orange の 3 色構成のため、 並びで違和感を出さないために選択肢として保持)

### ターゲット雰囲気
絵本『ありがとうって、 うれしいね』 (くまのこポノ) の世界観。 子供向け絵本 LP、 やわらかい、 あたたかい、 手作り感、 Komako Sakai / Akiko Hayashi / Eric Carle / Taro Gomi / Leo Lionni の絵本表紙系。 既存 h1 カリグラフィ (`impact_balanced_02`) と並べて違和感のないガッシュ + 水彩ハイブリッド。

### 「ポノ」 キャラ仕様 (候補 B / C / D で使用)
- くまのこ。 体色は warm orange (`#F2915A`)〜apricot cream (`#FDDCBF`) のグラデーション
- 丸い耳、 丸い頭、 ふんわりした輪郭、 シンプルな点目と小さなにっこり口
- Komako Sakai 系のやさしい筆致、 過度にデフォルメせず、 やや幼児向けの素朴な造形
- 服は着ていない (キャラの素体だけ)、 アクセサリーなし

---

## ツール選択ガイダンス

### 日本語ひらがな生成成功率 (実績ベース)
| モデル | 日本語可読性 | 試行回数目安 | 備考 |
| --- | --- | --- | --- |
| DALL-E 3 (gpt-image-1 / ChatGPT) | ★★★★★ | 1-2 回 | 本命。 1792×1024 直接。 |
| nano-banana (Gemini 2.5 Flash Image) | ★★★★ | 2-3 回 | クレヨン/水彩質感が得意。 |
| fal-ai flux-pro v1.1 | ★★ | 4-8 回 | 質感○ 文字× |
| midjourney v6.1+ | ★★ | 4-8 回 | 質感○ 文字× |

### 推奨試行順序 (4 候補すべて文字含む)
**DALL-E 3 (gpt-image-1) → nano-banana → flux-pro → midjourney**

DALL-E 3 で「ポノのあそびば」 7 文字が正しく読めるものが 1 枚出たら、 それを seed 画像にして他モデルで質感バリエーションを作るのが最速。

### 5 回試行ルール (重要)
任意の 1 候補で 5 回試行しても日本語ひらがなが読めなかった場合:
- morito に「手書きスキャン経路」 または「日本語フォント切替経路」 への切り替えを提案
- 試行ログ (使用モデル × プロンプト × 結果サマリ) を morito に提示
- 勝手に当該カットを諦めて他カットだけ完成させず、 必ず途中で morito に判断を仰ぐ

### 日本語生成が難しいモデルへの回避策
- **flux-pro / midjourney**: 「ポノのあそびば」 が読めない場合は、 DALL-E 3 / nano-banana で生成した文字部分を seed (img2img) として渡し、 質感だけ swap させる
- **どうしても文字が崩れる**: 候補 D (キャラ全身入り) では文字を諦めて、 「文字なし版 (キャラ + 装飾のみ)」 を生成 → morito 側で SVG / CSS でテキスト重畳する Plan C への切替を提案

---

## 候補 A: 純粋テキストロゴ (シンプル王道)

ポノ silhouette なし、 文字だけで構成する最もシンプル・汎用な候補。 アプリストアアイコン横や favicon 周辺など、 サイズが小さい場面でも視認性が落ちない。

### スペック
- 文言: 「ポノのあそびば」 (横 1 行、 中央揃え、 **7 文字**: ポ / ノ / の / あ / そ / び / ば)
- スタイル: 絵本表紙風カリグラフィ、 ガッシュ + 水彩ハイブリッド、 Komako Sakai / Akiko Hayashi 系。 既存 h1 (`impact_balanced_02`) と同トーン
- 色: 「ポノ」 = warm orange `#F2915A`、 「の」 = muted teal `#3E8B8B` (既存 h1 の中央 1 文字 teal を踏襲)、 「あそびば」 = warm orange `#F2915A`、 濁点ドットのみ walnut `#5D4E37`
- アスペクト: 16:5 (16:9 生成 → 上下クロップ)
- 出力ファイル: `assets/lp/hero/brand_logo_a.png` + `assets/lp/hero/brand_logo_a@2x.png` (透過 PNG)

### Main Prompt (英語、 そのまま使用すること)
```
Hand-painted Japanese picture-book brand title, a single horizontal line of exactly seven Japanese characters reading "ポノのあそびば" (romaji: po-no-no-a-so-bi-ba). Character roster in strict left-to-right order: character 1 = katakana ポ (katakana ho with a small handakuten circle at the upper right), character 2 = katakana ノ, character 3 = hiragana の, character 4 = hiragana あ, character 5 = hiragana そ, character 6 = hiragana び (hiragana hi with a small dakuten pair at the upper right), character 7 = hiragana ば (hiragana ha with a small dakuten pair at the upper right). Note: characters 1 and 2 are katakana, characters 3 through 7 are hiragana. Centered horizontally with generous breathing room above and below. Soft gouache and watercolor hybrid texture, warm and inviting like a beloved children's storybook title in the style of Komako Sakai, Akiko Hayashi, and Eric Carle picture book covers. Color treatment: the first two characters "ポノ" (po-no, katakana) and the last four characters "あそびば" (a-so-bi-ba, hiragana) painted in a warm orange tone (warm orange, persimmon, hex #F2915A); the single middle particle character "の" (no, hiragana) painted in a soft muted teal (muted teal, dusty blue-green, hex #3E8B8B) so it sits as a quiet accent between the two orange words; the small handakuten circle on ポ and the small dakuten dot pairs on び and ば rendered in dark warm brown (dark warm brown, walnut, hex #5D4E37). Visible paper grain under the strokes, gentle watercolor bleeds at edges, slight uneven pigment density giving a handmade picture-book feel. Rounded, friendly, slightly wobbly handwritten letterforms with playful child-friendly proportions, sized to feel like a confident brand title (larger than the catch copy line "みて、さわって、あそぼう" that will appear above it elsewhere in the layout). Pure white background (will be removed in post-processing), no people, no animals, no extra decoration, no border, no frame, only the calligraphy text.
```

### Negative Prompt
```
photorealistic, 3d render, sharp vector, digital font, computer typography, gothic, serif, sans-serif, neon, glow, gradient mesh, drop shadow, outline border, frame, watermark, signature, mascot, character, person, hand, animal, bear, leaf, star, heart, background fill, paper texture background, gradient background, color background, multiple colors beyond orange and teal and brown, blue saturated, green saturated, purple, pink, red saturated, cluttered, busy composition, misspelled japanese, wrong stroke order, latin letters, kanji, english text, extra glyphs, fewer than seven characters, more than seven characters, ポ rendered as ぽ, の rendered as ぬ, び rendered as ぴ or ひ, ば rendered as ぱ or は
```

### モデル別補助 (失敗時の追加指示)
- **DALL-E 3**: 「7 文字 (カタカナ「ポノ」 + ひらがな「のあそびば」) 横 1 行、 ポノのあそびば、 「の」 だけ teal、 残りは warm orange」 を日本語で追記
- **nano-banana**: 末尾に `exact 7 Japanese characters in order: ポ (katakana), ノ (katakana), の (hiragana), あ (hiragana), そ (hiragana), び (hiragana), ば (hiragana)` を追加
- **flux-pro**: 末尾に `text content: "ポノのあそびば" rendered as a single horizontal line`、 `aspect_ratio: "16:9"`、 `guidance_scale: 3.5-4.0`
- **midjourney**: `--ar 16:5 --style raw --stylize 100 --q 2 --no background, text border, frame, character, animal`、 ダメなら `--ar 3:1` で再試行

---

## 候補 B: テキスト + 小さなポノ silhouette (上品)

ロゴの左肩 (または右肩) に小さなくまのこポノの silhouette を寄り添わせる。 ブランドの主役キャラが控えめに同居する、 大人っぽくも温かい構成。

### スペック
- 文言: 「ポノのあそびば」 (横 1 行、 中央やや右寄せ、 7 文字: ポ / ノ / の / あ / そ / び / ば)
- silhouette: 左肩にくまのこポノの顔 + 上半身、 文字の高さの約 1.1 倍、 文字に少し被るくらいの距離
- スタイル: 候補 A と同トーン (ガッシュ + 水彩ハイブリッド)、 silhouette も同じ筆致で
- 色: 文字色は候補 A と同じ (ポノ orange、 の teal、 あそびば orange、 濁点 walnut)。 silhouette は warm orange `#F2915A` ベース + apricot cream `#FDDCBF` のハイライト + burnt sienna `#C96A2E` のシャドウの 3 色重ね
- アスペクト: 16:5 (16:9 生成 → 上下クロップ)
- 出力ファイル: `assets/lp/hero/brand_logo_b.png` + `assets/lp/hero/brand_logo_b@2x.png` (透過 PNG)

### Main Prompt
```
Hand-painted Japanese picture-book brand title with a small bear character beside it. Composition: on the left, a small painted silhouette of a baby bear cub named Pono — round head, round ears, gentle round body, simple dot eyes, tiny soft smile, no clothing, no accessories, facing slightly toward the text on the right; to the right of the cub, a single horizontal line of exactly seven Japanese characters reading "ポノのあそびば" (romaji: po-no-no-a-so-bi-ba), in this strict order: katakana ポ, katakana ノ, hiragana の, hiragana あ, hiragana そ, hiragana び, hiragana ば. The cub gently leans toward the first character. The cub is sized at roughly 1.1 times the cap height of the calligraphy so it feels like a friendly companion, not the main element. Both the bear and the text share the same hand-painted gouache and watercolor hybrid technique, like a Komako Sakai or Akiko Hayashi picture book cover. Color treatment for the text: the characters "ポノ" and "あそびば" in warm orange (warm orange, persimmon, hex #F2915A); the single middle particle "の" in soft muted teal (muted teal, dusty blue-green, hex #3E8B8B); dakuten dots on び and ば in dark warm brown (dark warm brown, walnut, hex #5D4E37). The bear cub painted with a warm orange base (hex #F2915A), apricot cream highlights (hex #FDDCBF), and burnt sienna shading (burnt sienna, deep terracotta, hex #C96A2E). Visible paper grain, soft watercolor bleeds, rounded child-friendly forms throughout. Pure white background (will be removed in post-processing), no extra characters, no extra animals, no people, no decoration beyond the bear, no border, no frame.
```

### Negative Prompt
```
photorealistic, 3d render, sharp vector, digital font, gothic, serif, sans-serif, neon, glow, drop shadow, outline border, frame, watermark, mascot logo style, cartoon mascot, anime, manga, multiple bears, multiple animals, full scene, background fill, gradient background, color background, blue saturated, green saturated, purple, pink, red saturated, cluttered, busy composition, misspelled japanese, wrong stroke order, latin letters, kanji, english text, extra glyphs, fewer than seven characters, more than seven characters, ポ rendered as ぽ, の rendered as ぬ, び rendered as ぴ or ひ, ば rendered as ぱ or は, bear wearing clothes, bear with accessories, bear with hat, bear with bow, multiple poses
```

### モデル別補助
- **DALL-E 3**: 「左肩に小さなくまのこ silhouette、 右に 7 文字ポノのあそびば (カタカナ「ポノ」+ ひらがな「のあそびば」)、 文字と silhouette は同じ手描きトーン」 を日本語で追記
- **nano-banana**: silhouette の描き込みすぎを抑えるため `simplified silhouette, no facial detail beyond dot eyes and tiny smile, no fur texture` を追加
- **flux-pro**: 文字とキャラが分離しすぎる場合 `tight composition, bear cub overlaps the first character slightly` を追加
- **midjourney**: `--ar 16:5 --style raw --stylize 150 --q 2 --no clothes, accessories, hat, multiple animals`

---

## 候補 C: テキスト + 装飾要素 (絵本世界観盛り)

文字の周りに葉・星・小さなハート・どんぐりなどポノ世界観の小物が控えめに散りばめられる。 LP のヒーロー帯としての存在感が最も高く、 SNS バナーや絵本帯のような華やぎを持つ。

### スペック
- 文言: 「ポノのあそびば」 (横 1 行、 中央揃え、 7 文字: ポ / ノ / の / あ / そ / び / ば)
- 装飾: 文字の上下左右に小さな葉 2-3 枚、 小さな星 1-2 個、 小さなハート 1 個、 小さなどんぐり 1 個。 文字の可読性を阻害しない程度に余白を確保
- スタイル: 候補 A と同トーン (ガッシュ + 水彩ハイブリッド)、 装飾も同じ筆致で
- 色: 文字色は候補 A と同じ。 装飾は warm orange `#F2915A` / muted teal `#3E8B8B` / apricot cream `#FDDCBF` / walnut `#5D4E37` の範囲内で配色
- アスペクト: 16:5 (16:9 生成 → 上下クロップ)
- 出力ファイル: `assets/lp/hero/brand_logo_c.png` + `assets/lp/hero/brand_logo_c@2x.png` (透過 PNG)

### Main Prompt
```
Hand-painted Japanese picture-book brand title surrounded by a few tiny picture-book ornaments. Composition: in the center, a single horizontal line of exactly seven Japanese characters reading "ポノのあそびば" (romaji: po-no-no-a-so-bi-ba), in strict order: katakana ポ, katakana ノ, hiragana の, hiragana あ, hiragana そ, hiragana び, hiragana ば; scattered loosely around the text with generous breathing room, a small constellation of picture-book motifs — two or three little leaves, one or two small five-pointed stars, one small heart, one small acorn — none of which touch or overlap the calligraphy, all clearly subordinate to the text. Both the calligraphy and the ornaments share the same hand-painted gouache and watercolor hybrid technique, like a Komako Sakai or Akiko Hayashi picture book cover. Color treatment for the text: the characters "ポノ" and "あそびば" in warm orange (warm orange, persimmon, hex #F2915A); the single middle particle "の" in soft muted teal (muted teal, dusty blue-green, hex #3E8B8B); dakuten dots on び and ば in dark warm brown (dark warm brown, walnut, hex #5D4E37). Ornaments painted within the palette: leaves in muted teal (hex #3E8B8B), stars in apricot cream (hex #FDDCBF) outlined gently in walnut (hex #5D4E37), heart in warm orange (hex #F2915A), acorn cap in walnut (hex #5D4E37) and body in apricot cream (hex #FDDCBF). All elements rendered with visible paper grain, soft watercolor bleeds, rounded child-friendly forms. Pure white background (will be removed in post-processing), no characters, no people, no animals, no border, no frame, no patterns beyond the listed motifs.
```

### Negative Prompt
```
photorealistic, 3d render, sharp vector, digital font, gothic, serif, sans-serif, neon, glow, drop shadow, outline border, frame, watermark, mascot, character, person, animal, bear, dense pattern, busy ornament, repeating motif, wallpaper pattern, background fill, gradient background, color background, blue saturated, green saturated, purple, pink saturated, red saturated, cluttered, decoration overlapping text, motif larger than text, misspelled japanese, wrong stroke order, latin letters, kanji, english text, extra glyphs, fewer than seven characters, more than seven characters, ポ rendered as ぽ, の rendered as ぬ, び rendered as ぴ or ひ, ば rendered as ぱ or は
```

### モデル別補助
- **DALL-E 3**: 「7 文字ポノのあそびば (カタカナ「ポノ」+ ひらがな「のあそびば」)、 周りに小さな葉/星/ハート/どんぐりが少しだけ、 文字に被らない」 を日本語で追記
- **nano-banana**: 装飾過多になりがちなので `at most six tiny ornaments total, generous negative space` を強調
- **flux-pro**: 装飾が文字を侵食する場合 `ornaments strictly in margins, text region clean` を追加
- **midjourney**: `--ar 16:5 --style raw --stylize 150 --q 2 --no busy pattern, dense ornament, frame, character, bear` (装飾過多なら 100 に下げて再試行)

---

## 候補 D: キャラ全身入りロゴ (絵本表紙級)

くまのこポノが文字の隣に全身で立ち、 まるで絵本の表紙のように構成された豪華版ロゴ。 絵本宣伝・公式ストア・大型バナーで主役級に使える。

### スペック
- 文言: 「ポノのあそびば」 (横 1 行、 右寄せ または 左寄せ、 7 文字: ポ / ノ / の / あ / そ / び / ば)
- キャラ: くまのこポノが全身、 二足で立つ自然なポーズ、 こちらを向いて穏やかに微笑む。 高さは文字の約 1.8〜2.2 倍
- スタイル: 候補 A と同トーン (ガッシュ + 水彩ハイブリッド)、 キャラも同じ筆致で
- 色: 文字色は候補 A と同じ。 キャラは候補 B と同じ 3 色重ね (orange base / apricot cream highlight / burnt sienna shadow)
- アスペクト: 16:5 (16:9 生成 → 上下クロップ)
- 出力ファイル: `assets/lp/hero/brand_logo_d.png` + `assets/lp/hero/brand_logo_d@2x.png` (透過 PNG)

### Main Prompt
```
Hand-painted Japanese picture-book brand title styled like a storybook cover, with a baby bear cub standing beside the title. Composition: on the left, a hand-painted baby bear cub named Pono shown in full body — round head, round ears, soft rounded torso and limbs, standing naturally on two feet, facing the viewer with a calm gentle smile, simple dot eyes, no clothing, no accessories; the cub is roughly 1.8 to 2.2 times the cap height of the calligraphy. On the right, a single horizontal line of exactly seven Japanese characters reading "ポノのあそびば" (romaji: po-no-no-a-so-bi-ba), in strict order: katakana ポ, katakana ノ, hiragana の, hiragana あ, hiragana そ, hiragana び, hiragana ば. The cub and the text sit together as a balanced pair like a picture-book cover layout. Both the bear and the text share the same hand-painted gouache and watercolor hybrid technique, in the style of Komako Sakai, Akiko Hayashi, and Eric Carle picture-book covers. Color treatment for the text: the characters "ポノ" and "あそびば" in warm orange (warm orange, persimmon, hex #F2915A); the single middle particle "の" in soft muted teal (muted teal, dusty blue-green, hex #3E8B8B); dakuten dots on び and ば in dark warm brown (dark warm brown, walnut, hex #5D4E37). The bear cub painted with a warm orange base (hex #F2915A), apricot cream highlights (hex #FDDCBF), and burnt sienna shading (burnt sienna, deep terracotta, hex #C96A2E); subtle walnut (hex #5D4E37) for tiny features. Visible paper grain, soft watercolor bleeds, rounded child-friendly forms. Pure white background (will be removed in post-processing), no other characters, no other animals, no people, no background scenery, no border, no frame, no decoration beyond the bear and the text.
```

### Negative Prompt
```
photorealistic, 3d render, sharp vector, digital font, gothic, serif, sans-serif, neon, glow, drop shadow, outline border, frame, watermark, mascot logo style, cartoon mascot, anime, manga, chibi, kawaii sticker style, multiple bears, multiple animals, family scene, background scenery, landscape, ground, floor line, sky, tree, house, gradient background, color background, blue saturated, green saturated, purple, pink saturated, red saturated, cluttered, busy composition, bear wearing clothes, bear with accessories, bear with hat, bear with bow, bear holding objects, misspelled japanese, wrong stroke order, latin letters, kanji, english text, extra glyphs, fewer than seven characters, more than seven characters, ポ rendered as ぽ, の rendered as ぬ, び rendered as ぴ or ひ, ば rendered as ぱ or は
```

### モデル別補助
- **DALL-E 3**: 「絵本表紙のような構図、 左にポノ全身、 右に 7 文字ポノのあそびば (カタカナ「ポノ」+ ひらがな「のあそびば」)、 同じ手描きトーン」 を日本語で追記
- **nano-banana**: 過度にキャラっぽくなりがちなので `picture-book illustration, not mascot, not anime, painterly` を強調
- **flux-pro**: 文字とキャラのスケールが暴れる場合 `bear height is roughly twice the text cap height, balanced cover composition` を追加
- **midjourney**: `--ar 16:5 --style raw --stylize 150 --q 2 --no clothes, accessories, hat, scene, background, multiple animals`、 ダメなら `--ar 3:1` で再試行

---

## 後処理ワークフロー (4 候補共通)

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

### Step 3: 透過化 (4 候補すべて必須)
推奨優先順位:
1. `fal-ai/birefnet` (API、 品質最高)
2. `remove.bg` API
3. `rembg` (Python ローカル: `rembg i input.png output.png`)

純白背景なので、 細い線や淡い水彩部分が消えないよう **threshold を強めにしない** こと。 候補 B / D のキャラ silhouette の輪郭が雑にならないか α チャンネルを必ず PIL / Photoshop で確認。

### Step 4: @2x 高解像度版生成
ベース 1920×600 を生成したら、 同じシードまたは同じ手順で 3840×1200 を生成 (または ESRGAN 等で 2x アップスケール)。

### Step 5: ファイル名と配置
```
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/brand_logo_a.png
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/brand_logo_a@2x.png
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/brand_logo_b.png
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/brand_logo_b@2x.png
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/brand_logo_c.png
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/brand_logo_c@2x.png
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/brand_logo_d.png
d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/brand_logo_d@2x.png
```

**重要: `assets/lp/hero/` ディレクトリが未作成の場合は最初に作成** (既存 h1 生成タスクで作られていれば不要):

```bash
# Windows PowerShell の場合
mkdir -p d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/_raw

# Git Bash / WSL の場合
mkdir -p /d/AppDevelopment/pono-asobiba-app/assets/lp/hero/_raw
```

中間ファイル (16:9 元画像、 透過化前) は `assets/lp/hero/_raw/brand_logo_*_raw.png` に保存。

---

## 品質チェック観点 (生成後に必ず確認)

各候補を納品前に Codex 自身が以下を点検:

1. **可読性**: 「ポノのあそびば」 が一目で読めるか。 別文字に化けていないか。 化けやすい字を 1 字ずつ目視チェック: **ポ vs ぽ (大きさと角ばり)**、 **ノ vs ん や ソ**、 **の vs ぬ や ぬ**、 **び vs ぴ vs ひ**、 **ば vs ぱ vs は**、 **あ vs お**、 **そ vs と** の混同に最警戒。 濁点 (゛) と半濁点 (゜) の点の数と位置 (右上か右下に流れていないか) も拡大確認
2. **文字数**: 必ず **7 文字** (ポ / ノ / の / あ / そ / び / ば)。 先頭 2 字「ポノ」 はカタカナ、 残り 5 字「のあそびば」 はひらがな。 濁点・半濁点付きの「ポ」「び」「ば」 はそれぞれ 1 文字としてカウント。 5 文字 / 6 文字 / 8 文字に化けたら必ず再試行
3. **色味**: 「の」 だけが muted teal `#3E8B8B`、 残り 6 文字 (「ポノあそびば」) が warm orange `#F2915A` 近傍か。 蛍光や赤に振れていないか
4. **既存 h1 との並び**: 既存 h1 (`assets/lp/hero/h1_calligraphy_*.png`) と縦に並べて違和感がないか (トーン・筆致・色温度)。 ある場合は 1 つ画面に並べて目視確認
5. **透過**: 完全透過か。 白背景が残っていないか (α チャンネル確認)
6. **オフセット**: テキスト/キャラが意図通りのレイアウト (中央 / 左寄せ / 右寄せ) になっているか
7. **色温度**: 寒色寄りに転んでいないか。 暖かみのある仕上がりか
8. **(候補 B / D) キャラの素直さ**: ポノが「アニメ・mascot・ぬいぐるみ」 風になっていないか。 絵本表紙級の painterly な質感か
9. **(候補 C) 装飾過多チェック**: モチーフが 6 個以下、 文字に被っていない、 文字より大きくない

不合格なら同じカットを再試行 (5 回上限)。

---

## morito への報告フォーマット

全 4 候補 (高解像度版含めて 8 ファイル) が `assets/lp/hero/` に配置完了したら、 以下のフォーマットで morito に報告:

```
✅ Pono LP ブランドロゴ 生成完了

- brand_logo_a.png + @2x  (純粋テキスト、         [モデル名]、 試行 X 回目で成功)
- brand_logo_b.png + @2x  (テキスト + silhouette、 [モデル名]、 試行 Y 回目で成功)
- brand_logo_c.png + @2x  (テキスト + 装飾、       [モデル名]、 試行 Z 回目で成功)
- brand_logo_d.png + @2x  (キャラ全身入り、       [モデル名]、 試行 W 回目で成功)

配置先: d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/

品質チェック: 全項目クリア (可読性 / 7 文字 / 色味 / h1 並び / 透過 / 配置 / 暖色 / キャラ painterly / 装飾抑制)

morito へ → 候補 A / B / C / D を見比べて採用 1 本を選び、 Claude Code に
「ブランドロゴは brand_logo_X を採用」 と伝えてください。 実装エージェントが
index.html ヒーロー構造の更新 (kicker→brand logo→lead の 3 段化) と
sw.js の CACHE_VERSION バンプを行います。
```

5 回試行で失敗した候補がある場合は、 上記の代わりに以下を返す:

```
⚠️ 一部候補生成失敗

成功:
- [成功候補一覧]

失敗:
- [候補名] (試行 5 回、 全モデル試行済み、 主な崩れ方: [説明 — 例: 「の」 が「ぬ」 になる / 「び」 が「ひ」 になる / キャラが anime 化])

morito 判断要請:
A. 手書きスキャン経路 (morito が筆ペン/水彩で「ポノのあそびば」 を書いて撮影 → 透過化)
B. 日本語フォント切替経路 (フォントワークス「マキナス」 や「こども丸ゴシック」 等で CSS 描画化、 画像不要)
C. キャラ別レイヤー経路 (候補 D の文字部分は候補 A から流用、 キャラだけ別 PNG として生成 → CSS で合成)

どれに切り替えるか指示してください。
```

---

## 制約・禁止事項 (必ず守ること)

- **配信は Cloudflare Workers 一択**。 生成画像内にホスティング系サービス名・ロゴを描かないこと
- **「無料」「Free」 のテキスト要素を絶対に描かない**。 景表法および 3 ティア (free/book/sub) ポリシー上の理由
- **HEX カラーコードを改変しない**。 プロンプト内の `#F2915A` 等はそのまま使う
- **モデルにアスペクト 16:5 を直接要求しない**。 必ず 16:9 / 21:9 / 3:1 等のサポート比で生成して後でクロップ
- **ファイル名を改変しない**。 LP 実装側が決め打ちで参照するため
- **7 文字以外で生成された画像は採用しない**。 「ポノのあそびば」 が 5 / 6 / 8 文字に化けたり、 ポ→ぽ・の→ぬ・び→ぴ・ば→ぱ 等に化けたら必ず再試行
- **既存キャッチコピー画像 (`h1_calligraphy_*.png`) を上書きしない**。 今回作るのは別ファイル (`brand_logo_*.png`)
- **キャラに服や帽子を着せない**。 ポノは素体のみ (ブランド統一上の理由)

---

## Codex の自律判断ガイド

- API キーや課金枠が足りない場合は morito に通知して停止。 勝手に低スペックモデルへフォールバックして品質劣化させない
- 一度成功した seed / プロンプトは試行ログに記録し、 @2x 生成時に再利用
- 中間ファイル (16:9 元画像、 透過化前) も `assets/lp/hero/_raw/` に保存して、 後から morito が手修正できるようにする
- 既存の `h1_calligraphy_*.png` が既に存在する場合は、 1 枚開いて色温度・筆致を目視確認してから候補 A を生成すると並びが揃いやすい
- 後処理コマンド (ImageMagick / rembg) が環境にない場合は `pip install rembg pillow` 等で自動セットアップ。 ImageMagick は Windows 11 では `winget install ImageMagick.ImageMagick` でも入る (ただし PATH 反映に再起動が必要なケースあり)。 失敗したら morito に通知

---

## Plan B: ブラウザ完結ルート (API キー / Python が無い場合)

morito の環境に OpenAI / fal-ai の API キーや Python が無い、 または Codex がスクリプト実行で詰まった場合は、 以下に切り替える:

1. **画像生成**: ChatGPT (Plus 以上) Web UI で GPT-5 + 画像生成 (gpt-image-1) を使い、 本指示書の「候補 A〜D」 セクションの Main Prompt を 1 枚ずつ貼り付けて生成
2. **クロップ (16:9 → 16:5)**: ブラウザの [squoosh.app](https://squoosh.app) または [iloveimg.com/crop-image](https://www.iloveimg.com/crop-image) で 1920×600 にクロップ
3. **透過化**: [remove.bg](https://www.remove.bg) Web UI に DL した PNG をドラッグ → 透過 PNG を DL
4. **@2x**: ChatGPT に「同じプロンプトで 2 倍解像度版を再生成」 を依頼、 または [upscayl.org](https://upscayl.org) のデスクトップアプリで 2x アップスケール
5. **配置**: morito が手動で `d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/` に DL して配置 (ディレクトリが無ければ Windows エクスプローラで新規作成)

このルートを取った場合、 Codex は「Plan B 採用、 morito 手動配置待ち」 と報告すれば完了とみなす。

---

## morito 向け補足 (技術非依存メモ)

- Codex CLI を初めて使う場合: `codex` コマンドで起動 → このファイル全体を貼り付け → Enter
- Codex が途中で「API キーが見つからない」 等を聞いてきたら、 答えられる範囲で答える。 不明なら「Plan B でいい」 と返事すれば自動切替
- 生成中の中間ファイルは `assets/lp/hero/_raw/` に残るので、 気に入らなかったら後で morito が手動で差し替えできる
- 4 候補揃ったら、 morito は A / B / C / D を目で見比べて 1 本選ぶだけ。 採用後の HTML / CSS / sw.js 更新は Claude Code 側 (実装エージェント) が引き取る
- 採用候補が決まったら、 既存 h1 画像と縦に並べた状態のスクショを 1 枚撮って Claude Code に渡すと、 ヒーロー全体のバランス調整がスムーズ

---

morito、 このファイル全体を Codex に貼り付ければ段階分割で完結します。 開始前に Codex に API キー (OpenAI / fal-ai / remove.bg のいずれか) が設定されているか確認 — 無ければ Plan B に自動切替されます。
