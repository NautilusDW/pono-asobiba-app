# Codex タスク指示書 — KawaGlint 拡張アート生成 (batch:1470)

作成: 2026-07-25 / 作成者: Claude Code (Opus 5)
対象ゲーム: `unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/` (Unity製 つりゲーム「KawaGlint」)
設計正本: `docs/KAWAGLINT_EXPANSION_DESIGN_2026-07-25.md` (5領域の設計 + 6件のクロスレビュー)

> **このファイルだけ読めば作業できるように書いてあります。** 設計書本体を読む必要はありません
> (読んでもよいが、アート発注に関しては**本ファイルが正**。設計書側の発注リストには重複・
> 矛盾・技術的に成立しない指定が含まれており、本ファイルで既に解消済みです。§9 参照)。

---

## 0. 冒頭指示 (AGENTS.md §5.1.0 準拠・必須)

> あなたは全体の進捗と品質管理に徹底し、今後タスクは行わないでください。実装はエージェント
> チームを組成して、なるべく並列で行ってください。レビューは必ずエージェント同士のクロス
> レビューをしてください。
>
> **画像生成モデルはすべて GPT Image 2 を使用することを厳格に守ってください。**
>
> **ユーザー指示に「生成」「生成して」「作って」等があり、対象が見た目素材なら、SVG / Canvas /
> CSS / PIL / 手書きベクター等で代用せず、GPT Image 2 で画像アセットを生成してください。**
>
> **アルファチャンネル抜きと切り抜きは行わないでください。** 生成された画像を
> そのまま raw 画像として保存してください。後処理は別タスクで自動スクリプトが行います (§8)。

### 0.1 背景色ポリシーの例外について (重要・誤解しないこと)

AGENTS.md §5.1.0 の一般ルールは「生成背景は原則 **白**」ですが、**KawaGlint だけは例外で
クロマキー背景 (純緑 `#00ff00` / 純マゼンタ `#ff00ff`) が正しい**です。理由:

- KawaGlint のアートは batch:1458 / batch:1467 で**自動クロマキー除去スクリプト**
  (`tmp/alpha_pending/1467-kawaglint-sea-depth-fishdex-art/process_kawaglint_art_1467.py`)
  を通しており、このスクリプトは **green / magenta の2キーしか受け付けない** (`KEY_KIND_CHANNELS`)。
- 白背景で納品されると既存パイプラインが `die()` して 1 枚も処理できません。
- 白 (`#FFFFFF`) / 中間グレー (`#808080`) / 淡色は**すべて不可**。必ず純緑か純マゼンタ。

---

## 1. このタスクの目的

ユーザーの実プレイフィードバック7件を受けた KawaGlint 大型拡張の設計が完了しました。
実装は別タスクで進みますが、**アートが無いと着地しない部分**が5領域あります:

| # | ユーザー要望 | 必要なアート |
| --- | --- | --- |
| 1 | 生き物の種類を倍に増やしたい (15種 → 32種) | 新種17種の catch 画像 |
| 2 | レア種は魚影が一目で違うと分かるようにしたい | アーキタイプ別 魚影 (silhouette) ライブラリ |
| 3 | ウキがしょぼい / 食いついた描写が欲しい | ウキ本体 + 引き波の泡 |
| 4 | 背景を静止画っぽくしたくない (雲が流れる・木々が揺れる) | 空/水面/前景のパララックスレイヤー素材 |
| 5 | 背景が「最低限」。サンゴ・岩・海藻をちゃんと作ってほしい | 水中の環境オブジェクト大幅拡充 |

**あなたの仕事は「画像を生成して所定の場所に保存する」ところまで**です。
Unity への統合・コード実装・クロマキー除去は別タスクが行います。

**生成は、あなた (Codex) 自身の GPT Image 機能で直接行ってください** (詳細は §2)。

---

## 2. 生成手段

**あなた (Codex) 自身の GPT Image 機能を使って直接生成してください。**
外部サービスの web UI や仲介ツールを経由する必要はありません。
本書の各エントリのプロンプトを、そのまま自分の画像生成機能に渡すだけです。

- **品質最優先です。枚数を惜しむ必要はありません。**
  構図・画風・クロマキー背景が指定どおりでない場合は、**何度でもリテイクしてください**
  (§9 の検品 1〜7 に1つでも引っかかったら迷わず作り直す)。
- 念のための保険として: 本書の §7 の各エントリは「プロンプト全文」「AR / 解像度」
  「クロマキー色」「保存ファイル名」が1件ずつ揃っているので、**万一あなたの側で生成できない
  場合は、人間が本ファイルを見ながら手動で生成することも可能**な形式になっています。
  その場合、あなたは「どの順で生成すべきか」「受け取った画像の検品」を担当してください。

---

## 3. 所要枚数の合計

| カテゴリ | 必須 (P0) | 推奨 (P1) | 任意 (P2) | 小計 |
| --- | ---: | ---: | ---: | ---: |
| **A. 新種の catch 画像** (種の倍増分) | 17 | 0 | 0 | **17** |
| **B. 魚影 (shadow) — レア差別化** | 7 | 3 | 0 | **10** |
| **C. ウキ (浮き) の実アート** | 2 | 0 | 1 | **3** |
| **D. 背景パララックスレイヤー** | 15 | 0 | 1 | **16** |
| **E. 環境オブジェクト (サンゴ/岩/海藻)** | 14 | 10 | 0 | **24** |
| **合計** | **55** | **13** | **2** | **70** |

**まず P0 の 55 枚を完走してください。** P1 13 枚はその後。P2 2 枚は最後 (やらなくても可)。

---

## 4. 生成の共通設定

| 項目 | 値 |
| --- | --- |
| モデル | **GPT Image 2** — AGENTS.md Hard Rule 7。他モデル絶対禁止 |
| quality | **high** (あなたの生成機能で選べる最高品質) |
| resolution | **2k 相当** (選べる最高解像度)。最終的に長辺 1024px へ自動縮小されるので、生成は大きく |
| count | 1枚ずつ (バリエーション比較したい時のみ複数可) |
| 背景 | **純緑 `#00ff00` または 純マゼンタ `#ff00ff` のベタ塗り** (§6.4 で1枚ごとに指定) |
| 後処理 | **やらない** (アルファ抜き・トリム・リサイズ・パディングは全部スクリプト側) |

---

## 5. スタイル指定 (最重要)

### 5.1 既存アートの画風 — これに揃えることが本タスクの成否

`unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/Content/Resources/KawaGlint/Sprites/` 配下の
既存アートを実際に開いて確認した結果、KawaGlint の画風は次のとおりです。
**必ず既存 PNG を数枚開いて目で確認してから生成を始めてください。**

**参照すべき既存ファイル (絶対パス):**
- `/Users/ndw_mac/AppDevelopment/pono-asobiba-app/unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/Content/Resources/KawaGlint/Sprites/fish_ayu_catch.png` — catch 画像の基準 (あゆ)
- 同 `/fish_tai_catch.png` — catch 画像の基準 (たい・レア)
- 同 `/fish_sake_shadow.png` — 魚影の基準 (さけ)
- 同 `/bg_river_crosssection.png` — 背景の基準 (川の断面図)
- 同 `/pono_angler_side.png` — キャラ (ポノ) の基準
- 同 `/Decor/kawa_rock_02.png` `/Decor/kawa_weed_01.png` `/Decor/umi_kelp_03.png` — 環境オブジェクトの良い例
- 同 `/Decor/umi_coral_01.png` — **悪い例** (硬い輪郭線・高彩度のベクタークリップアート調。
  背景と画風が衝突しており今回引退させる。**これに似せてはいけない**)

**画風の言語化 (プロンプトに反映済み、ここは理解用):**

- **技法**: 色鉛筆 (coloured pencil) を水彩紙 (textured watercolour paper) に重ねたタッチ。
  **紙の目 (paper tooth) が見える**こと、細かい方向性のあるハッチングが残っていることが必須。
  水彩の薄い滲みが少し混ざる。デジタルのフラットベクタ・エアブラシ・フェルト質感は不可。
- **輪郭**: **黒い輪郭線 (ink outline) を引かない。** 形は色の面と陰影だけで作る。
  既存の `umi_coral_01` が浮いている最大の原因が「硬い輪郭線」。
- **彩度**: **低彩度のパステル。** 原色・ネオン・蛍光色は使わない。
  たいの赤も「朱赤〜サーモンピンク」で、真っ赤ではない。
- **陰影**: やわらかいグラデーション。強いコントラスト・落ち影 (cast shadow)・
  ビネットは付けない。光は左上からの均一な柔らかい光。
- **生き物の描き方**: 図鑑的に正確だが**プロポーションは少し丸く・やさしく**。
  目は**大きめの丸い黒目 + 小さな白いハイライト1点**、口は穏やかに微笑んでいる。
  腹は白〜クリームに抜ける。牙・トゲ・鋭角・威嚇表情は作らない。
- **向き**: catch 画像も 魚影も **完全な真横 (broadside) / 頭が左・尾が右**。
  (甲殻類・貝・ヒトデ・タコ等の非遊泳生物は例外。§7.A の個別指定に従う)
- **背景の水中感**: 水中に置かれる素材 (E カテゴリ等) は、色を**わずかに寒色寄りに冷やし、
  彩度を少し落とす** — 淡いターコイズの水越しに見えている状態。
- **サイズ感**: 子供向け絵本の1ページに収まる、静かでやさしい雰囲気。怖くない。

### 5.2 STYLE BLOCK (プロンプトの先頭に必ず連結する)

以下の5種類のうち、各エントリで指定されたものを**そのままコピペ**して使ってください。
`#00ff00` 版と `#ff00ff` 版を別々に用意してあるので、色を書き換える作業は不要です。

<a id="style-catch-green"></a>
#### 【STYLE-CATCH-GREEN】 — 新種 catch 画像 (緑キー)

```
Children's picture-book illustration for a gentle Japanese nature picture book. Soft coloured pencil on textured watercolour paper: visible paper tooth and fine directional pencil hatching, soft graded shading, light watercolour wash, no ink outline, no hard vector edge. Pastel, low-saturation, warm and calm palette. A single creature, drawn accurately like a field-guide plate but with gentle, slightly rounded, friendly proportions. One large round dark eye with a single small white highlight, and a soft calm faintly smiling mouth. Pale cream belly. Even soft light from the upper left, no cast shadow. No water, no bubbles, no ground, no background scenery. The subject is isolated on a solid flat pure green #00ff00 chroma-key background that fills the entire frame edge to edge, completely even, with no gradient and no vignette. The subject must NOT touch any edge of the frame: leave an empty flat chroma margin of at least 10% of the frame on all four sides.
```

<a id="style-catch-magenta"></a>
#### 【STYLE-CATCH-MAGENTA】 — 新種 catch 画像 (マゼンタキー)

```
Children's picture-book illustration for a gentle Japanese nature picture book. Soft coloured pencil on textured watercolour paper: visible paper tooth and fine directional pencil hatching, soft graded shading, light watercolour wash, no ink outline, no hard vector edge. Pastel, low-saturation, warm and calm palette. A single creature, drawn accurately like a field-guide plate but with gentle, slightly rounded, friendly proportions. One large round dark eye with a single small white highlight, and a soft calm faintly smiling mouth. Pale cream belly. Even soft light from the upper left, no cast shadow. No water, no bubbles, no ground, no background scenery. The subject is isolated on a solid flat pure magenta #ff00ff chroma-key background that fills the entire frame edge to edge, completely even, with no gradient and no vignette. The subject must NOT touch any edge of the frame: leave an empty flat chroma margin of at least 10% of the frame on all four sides.
```

<a id="style-silhouette"></a>
#### 【STYLE-SILHOUETTE】 — 魚影 (shadow) 専用。**catch 画像とは全く別物なので絶対に混同しないこと**

```
A completely flat solid-colour silhouette, like a paper cut-out seen from the side. The whole shape is filled with ONE single uniform dark navy blue #0F2C56 — perfectly flat, no gradient, no shading, no texture, no paper grain, no outline, no highlight, no eye, no mouth, no scales, no pattern, no internal lines whatsoever. All the information is in the outer contour only. Exact side-on profile with the whole animal visible, HEAD POINTING TO THE LEFT and TAIL TO THE RIGHT, body horizontal and centred in the frame. The contour is smooth, rounded and friendly: no spikes, no fangs, no needle-sharp points, no jagged edges. The silhouette is isolated on a solid flat pure green #00ff00 chroma-key background filling the entire frame edge to edge, completely even, with no gradient. The silhouette must NOT touch any edge of the frame: leave an empty flat chroma margin of at least 10% of the frame on all four sides.
```

<a id="style-prop-water-green"></a>
#### 【STYLE-PROP-WATER-GREEN】 — 水中の環境オブジェクト (緑キー)

```
Children's picture-book illustration in soft coloured pencil on textured watercolour paper. Visible paper tooth and gentle directional pencil hatching. Pastel, low-saturation palette. No black outlines, no ink linework, no hard vector edge. Soft rounded shapes, gentle even lighting, no harsh shadows, no cast shadow. Flat side-on elevation view as if seen through clear shallow water, no perspective distortion. Underwater subject: colours slightly cooled and softened as if seen through pale turquoise water. Single subject isolated on a solid flat pure green #00ff00 chroma-key background filling the entire frame edge to edge, completely even, with no gradient and no vignette. The subject must NOT touch any edge of the frame: leave an empty flat chroma margin of at least 8% of the frame on all four sides. No ground plane under the subject.
```

<a id="style-prop-water-magenta"></a>
#### 【STYLE-PROP-WATER-MAGENTA】 — 水中の環境オブジェクト (マゼンタキー)

```
Children's picture-book illustration in soft coloured pencil on textured watercolour paper. Visible paper tooth and gentle directional pencil hatching. Pastel, low-saturation palette. No black outlines, no ink linework, no hard vector edge. Soft rounded shapes, gentle even lighting, no harsh shadows, no cast shadow. Flat side-on elevation view as if seen through clear shallow water, no perspective distortion. Underwater subject: colours slightly cooled and softened as if seen through pale turquoise water. Single subject isolated on a solid flat pure magenta #ff00ff chroma-key background filling the entire frame edge to edge, completely even, with no gradient and no vignette. The subject must NOT touch any edge of the frame: leave an empty flat chroma margin of at least 8% of the frame on all four sides. No ground plane under the subject.
```

<a id="style-prop-air-green"></a>
#### 【STYLE-PROP-AIR-GREEN】 / 【STYLE-PROP-AIR-MAGENTA】 — 水上 (空・岸辺) の素材

緑キー版:

```
Children's picture-book illustration in soft coloured pencil on textured watercolour paper. Visible paper tooth and gentle directional pencil hatching. Pastel, low-saturation, sunlit and airy palette. No black outlines, no ink linework, no hard vector edge. Soft rounded shapes, gentle even daylight from the upper left, no harsh shadows, no cast shadow. Flat side-on elevation view, no perspective distortion. Single subject isolated on a solid flat pure green #00ff00 chroma-key background filling the entire frame edge to edge, completely even, with no gradient and no vignette. The subject must NOT touch any edge of the frame: leave an empty flat chroma margin of at least 8% of the frame on all four sides. No ground plane, no horizon, no sky gradient.
```

<a id="style-prop-air-magenta"></a>
マゼンタキー版【STYLE-PROP-AIR-MAGENTA】 (上の文の `pure green #00ff00` を `pure magenta #ff00ff` に置き換えたもの):

```
Children's picture-book illustration in soft coloured pencil on textured watercolour paper. Visible paper tooth and gentle directional pencil hatching. Pastel, low-saturation, sunlit and airy palette. No black outlines, no ink linework, no hard vector edge. Soft rounded shapes, gentle even daylight from the upper left, no harsh shadows, no cast shadow. Flat side-on elevation view, no perspective distortion. Single subject isolated on a solid flat pure magenta #ff00ff chroma-key background filling the entire frame edge to edge, completely even, with no gradient and no vignette. The subject must NOT touch any edge of the frame: leave an empty flat chroma margin of at least 8% of the frame on all four sides. No ground plane, no horizon, no sky gradient.
```

### 5.3 NEGATIVE BLOCK (プロンプトの末尾に必ず連結する)

<a id="negative-common"></a>
#### 【NEGATIVE-COMMON】 — 全カテゴリ共通

```
No text, no letters, no numbers, no kanji, no logo, no watermark, no signature, no UI elements, no frame, no border, no colour swatch, no label, no multiple views, no collage, no grid of variations. Only one subject in the whole image. No people, no cartoon characters, no bear, no owl, no mascot. No fish, no crab, no shrimp, no squid, no octopus, no starfish, no seashell, no sea urchin unless the subject itself is one. Not photorealistic, not a 3D render, not CGI, no glossy plastic look, no heavy black outlines, no dark or scary mood, no horror, no sharp fangs, no teeth, no blood, no gore, no neon or fluorescent colours, no glitter, no sparkles, no lens flare, no bokeh. Never paint the chroma-key colour onto the subject itself; the chroma colour must appear only in the flat background.
```

### 5.4 プロンプトの組み立て方 (コピペ手順)

各エントリのプロンプトは、**3つのブロックを上から順に貼り付けて1つのテキストにする**だけです。
書き換え作業はありません。

```
[指定された STYLE BLOCK]  ← §5.2 からそのままコピー
[エントリ本文 (BODY)]      ← §7 の各エントリからそのままコピー
[NEGATIVE-COMMON]         ← §5.3 からそのままコピー
```

**完成例 (A-09 `fish_kisu_catch.png` の場合、これが実際に生成へ渡すプロンプト全文):**

```
Children's picture-book illustration for a gentle Japanese nature picture book. Soft coloured pencil on textured watercolour paper: visible paper tooth and fine directional pencil hatching, soft graded shading, light watercolour wash, no ink outline, no hard vector edge. Pastel, low-saturation, warm and calm palette. A single creature, drawn accurately like a field-guide plate but with gentle, slightly rounded, friendly proportions. One large round dark eye with a single small white highlight, and a soft calm faintly smiling mouth. Pale cream belly. Even soft light from the upper left, no cast shadow. No water, no bubbles, no ground, no background scenery. The subject is isolated on a solid flat pure green #00ff00 chroma-key background that fills the entire frame edge to edge, completely even, with no gradient and no vignette. The subject must NOT touch any edge of the frame: leave an empty flat chroma margin of at least 10% of the frame on all four sides.

A Japanese whiting (kisu, Sillago japonica): a slender elongated fish with a gently tapering pointed snout and a small mouth, a long low first dorsal fin and a second soft dorsal fin, and a shallow forked tail. Pearly pale sandy-beige along the back fading to a soft silvery cream belly, with a faint pale golden sheen along the flank. Fins are almost translucent pale cream. Slim and elegant, about four times as long as it is deep.

No text, no letters, no numbers, no kanji, no logo, no watermark, no signature, no UI elements, no frame, no border, no colour swatch, no label, no multiple views, no collage, no grid of variations. Only one subject in the whole image. No people, no cartoon characters, no bear, no owl, no mascot. No fish, no crab, no shrimp, no squid, no octopus, no starfish, no seashell, no sea urchin unless the subject itself is one. Not photorealistic, not a 3D render, not CGI, no glossy plastic look, no heavy black outlines, no dark or scary mood, no horror, no sharp fangs, no teeth, no blood, no gore, no neon or fluorescent colours, no glitter, no sparkles, no lens flare, no bokeh. Never paint the chroma-key colour onto the subject itself; the chroma colour must appear only in the flat background.
```

---

## 6. 絶対に守るルール (禁則事項)

### 6.1 画像の中身の禁則

1. **文字・数字・ロゴ・透かし・署名・UI要素・枠線を画像内に入れない。** 日本語も英語も不可。
2. **指定外のキャラクターを描かない。** ポノ (クマ)・ふくろう博士・パートナー動物・人物・
   釣り人・手・道具などを勝手に足さない。1枚に被写体は**1つだけ**。
3. **怖い絵にしない。** ダーク・ホラー・威嚇・牙・血・鋭利なトゲ・不気味な触手・
   深海の暗黒表現は禁止。3〜7歳向けです。とくに **リュウグウノツカイ (A-17)** と
   **なまず (A-07)** と **たこ (A-15)** は「怖くない・やさしい」を最優先してください。
4. **フォトリアル / 3DCG / ベクタークリップアート調にしない。** 必ず色鉛筆の手描き。
5. **黒い輪郭線を引かない。** ネオン・蛍光色・グリッター・キラキラ効果を使わない。
6. **捕獲対象種を背景装飾として描かない。** 環境オブジェクト (E) と背景レイヤー (D) の絵に
   **ヒトデ・貝がら・魚・エビ・カニ・イカ・タコ・ウニ**を描き込むのは**厳禁**です。
   これらは KawaGlint の「釣れる生き物」であり、装飾として画面に居ると図鑑と衝突して
   「釣れるはずのものが釣れない」と子供が混乱します。
   (被写体そのものがその生き物である A カテゴリは当然 OK)
7. **クロマキー色を被写体に塗らない。** 緑キーの絵に鮮やかな緑の被写体、マゼンタキーの絵に
   鮮やかなマゼンタ/紫の被写体を描くと、除去時に被写体ごと消えます。
8. **落ち影 (cast shadow) / 地面 / 水面線 / 空のグラデーション / ビネットを描かない。**
   被写体だけを浮かせてください。
9. **縦横比を歪めない。** 生成後に無理な引き伸ばしをしない (プロジェクトの AR 絶対遵守ルール)。

### 6.2 クロマキー背景の技術的禁則 (自動処理スクリプトの実要件)

処理スクリプトのソースから導いた**破ると1枚も処理できない**制約です。

1. **背景は純緑 `#00ff00` か純マゼンタ `#ff00ff` の2択のみ。**
   白・黒・グレー `#808080`・淡色・グラデーション背景は全部 NG (スクリプトが `die()` します)。
2. **被写体は画像の四辺のどこにも接してはいけない。**
   スクリプトは `MIN_BORDER_KEY_COVERAGE = 0.80` を持ち、**画像外周ピクセルの 80% 以上が
   クロマキー色でないと処理を中止**します。
   → **「edge to edge に広がる床の帯」「左下から画面外に切れる岩」のような構図は禁止**です。
   帯状の素材でも**フレーム幅の 85〜90% までに留め、左右と下に必ずクロマの余白を残す**こと。
   (Unity 側では自動トリム + 4% パディングが入るので、余白を残しても最終見た目は同じです)
3. **被写体の輪郭は「不規則でよいが、ぼかさない」。**
   `softly feathered edge` / `fades out into nothing` / `半透明のもや` のような
   **境界が徐々に消える表現はクロマキーと両立しません** (色フリンジが残ります)。
   柔らかさが欲しい部分は「小さな粒・房・不揃いな突起の集まり」で表現し、
   一つ一つの粒は不透明にしてください。透明度の演出はゲーム側の tint / α で付けます。
4. **被写体の色がキー色と近すぎないこと。** スクリプトは
   「緑キー: G > max(R,B) + 12 の画素」/「マゼンタキー: min(R,B) > G + 12 の画素」を
   背景候補とみなします。つまり:
   - 鮮やかな緑・オリーブ・青緑・ターコイズを含む被写体 → **必ずマゼンタキー**
   - 赤・ピンク・紫・マゼンタ寄りを含む被写体 → **必ず緑キー**
   - どちらでもない (白・グレー・砂色・茶・紺) → 緑キーでよい
   §7 の各エントリに1件ずつ指定してあるので、**指定どおりに**してください。

---

## 7. 発注一覧 (全70件)

各エントリの読み方:
- **STYLE**: §5.2 のどのブロックを先頭に貼るか
- **AR / 解像度**: 生成時に指定する縦横比。px は最終目安 (スクリプトが長辺 1024px に縮小します)
- **クロマ**: 背景色。`#00ff00` = 純緑 / `#ff00ff` = 純マゼンタ
- **保存名**: この名前で保存 (§8 の指定フォルダに)
- **BODY**: STYLE と NEGATIVE の間に挟む本文

---

### 7.A 新種の catch 画像 — 17点 (全て P0 必須)

**用途**: 釣り上げた瞬間のバナー表示と「おさかな図鑑」の図版。子供が一番よく見る絵です。
**保存先**: `species/`
**命名規則**: 既存カタログ (`KawaGlintSpriteCatalog.CatchPaths`) に合わせ `<speciesId>_catch.png`。
speciesId に `fish_` が付く種はファイル名にも付く。付かない種 (`sawagani`) は付けない。
**共通の絵づくり**: 完全な真横・**頭が左** (甲殻類/貝/ヒトデ/タコを除く)、体は水平、
背景なし、既存 `fish_ayu_catch.png` / `fish_tai_catch.png` と並べて違和感がないこと。

---

#### A-01 `fish_yamame_catch.png` — やまめ (川・normal)
- STYLE: [STYLE-CATCH-MAGENTA](#style-catch-magenta) / AR **16:9** (2048×1152) / クロマ **`#ff00ff`** (背が緑がかるため)
- 用途: せせらぎのあさせで釣れる渓流の主力魚

```
A yamame masu salmon (Oncorhynchus masou), seen exactly from the side with the head to the LEFT. A trim streamlined trout body with a small adipose fin, soft rounded fins and a shallow forked tail. Olive-green back fading through pale silver-grey flanks to a cream-white belly. Along the flank there is a neat row of about eight soft oval dusky-lavender parr marks, and a light scattering of small warm pink and dark grey speckles on the back and dorsal fin. Gentle and friendly, about three and a half times as long as it is deep.
```

#### A-02 `fish_dojou_catch.png` — どじょう (川・normal)
- STYLE: [STYLE-CATCH-MAGENTA](#style-catch-magenta) / AR **16:9** (2048×1152) / クロマ **`#ff00ff`** (体色がオリーブ)
- 用途: 童謡でおなじみ。細長シルエットで魚影の見分けがつく種

```
A Japanese weather loach (dojou, Misgurnus anguillicaudatus), seen exactly from the side with the head to the LEFT. A very long slender cylindrical eel-like body that tapers to a small rounded paddle tail, with tiny soft rounded fins set low on the body. Around the small downturned mouth there are several short soft whiskers (barbels) curving gently forward. Soft olive-brown and warm khaki mottling along the back, fading to a pale cream belly. Small friendly round eye. Slim and noodle-like, about seven times as long as it is deep. The whiskers are soft and rounded, never spiky.
```

#### A-03 `fish_haze_catch.png` — はぜ (川/河口・normal)
- STYLE: [STYLE-CATCH-MAGENTA](#style-catch-magenta) / AR **16:9** (2048×1152) / クロマ **`#ff00ff`** (オリーブ地)
- 用途: 子供の初釣りの定番。河口の砂泥

```
A yellowfin goby (haze, Acanthogobius flavimanus), seen exactly from the side with the head to the LEFT. A goby with a noticeably large blunt rounded head, a wide friendly mouth, a chunky front body tapering to a narrow tail, two soft rounded dorsal fins and broad fan-shaped pectoral fins tinted pale butter yellow. Soft sandy olive-brown with irregular darker brown mottled blotches along the flank, fading to a pale cream belly. Sturdy and endearing, about three times as long as it is deep.
```

#### A-04 `sawagani_catch.png` — さわがに (川・normal)
- STYLE: [STYLE-CATCH-GREEN](#style-catch-green) / AR **1:1** (2048×2048) / クロマ **`#00ff00`**
- 用途: ユーザー要望の「カニ」枠 (川)。上流の石の下
- 注意: **真上からの俯瞰 (top-down)**。頭が左のルールは適用しない

```
A Japanese freshwater river crab (sawagani, Geothelphusa dehaani), seen from directly above, centred and symmetrical. A small rounded squarish carapace in warm terracotta orange-brown with a soft cream underside showing at the front, eight walking legs spread evenly to the sides and two front claws held up and slightly open. Two tiny round eyes on short stalks at the front of the shell, drawn friendly and calm. All leg tips and claw tips are softly rounded, never sharp or spiky. Cute and small, like a little living pebble.
```

#### A-05 `fish_shijimi_catch.png` — しじみ (川/汽水・normal)
- STYLE: [STYLE-CATCH-GREEN](#style-catch-green) / AR **1:1** (2048×2048) / クロマ **`#00ff00`**
- 用途: お味噌汁でおなじみの「貝」枠 (川)
- 注意: 生き物の目は描かない (貝なので)。`no eye` を意識

```
A single freshwater basket clam (shijimi, Corbicula japonica) shell, closed, seen from the side of the shell face, centred. A small plump rounded-triangular bivalve shell with a gentle beak at the top, drawn with fine concentric growth rings following the curve of the shell edge. Deep slate blue-black shading to warm chestnut brown near the rim, with a soft pale bloom on the raised centre. Matte and softly shaded, never glossy. No eye, no face, no legs.
```

#### A-06 `fish_iwana_catch.png` — いわな (川・**rare**)
- STYLE: [STYLE-CATCH-MAGENTA](#style-catch-magenta) / AR **16:9** (2048×1152) / クロマ **`#ff00ff`** (濃いオリーブ)
- 用途: 渓流最上流の白身。やまめの一段上という関係が学べる

```
A white-spotted char (iwana, Salvelinus leucomaenis), seen exactly from the side with the head to the LEFT. A sturdy trout body slightly deeper than a yamame, with a small adipose fin, soft rounded fins and a squared-off tail. Deep olive-green to soft charcoal-green along the back, fading through warm bronze flanks to a soft apricot-cream belly. Scattered evenly over the back and flanks are many small soft pale cream and pale peach spots. The lower fins carry a thin ivory leading edge. Slightly larger, calmer and more dignified than a yamame.
```

#### A-07 `fish_namazu_catch.png` — なまず (川・**super**)
- STYLE: [STYLE-CATCH-MAGENTA](#style-catch-magenta) / AR **16:9** (2048×1152) / クロマ **`#ff00ff`** (暗いオリーブ)
- 用途: ヒゲ・大きい・子供が必ず知っている。下流の泥底
- 注意: **絶対に怖くしない。** ぬぼっとした、とぼけた、やさしい顔

```
A Japanese catfish (namazu, Silurus asotus), seen exactly from the side with the head to the LEFT. A large soft-bodied scaleless fish with a very wide flat rounded head, a broad gently smiling mouth, and small friendly round eyes set high. Four long soft whiskers (barbels) curve gently forward and downward from the upper and lower jaw, drawn as smooth rounded tapering strands. The body is thick at the front and flattens sideways toward a long low soft anal fin and a small rounded tail; a tiny soft dorsal fin sits near the shoulder. Soft mottled olive-grey and warm mud-brown marbling over the back and flanks, fading to a pale cream belly. Round, plump, calm and comical — friendly and never menacing. No teeth, no open jaws, no gloom.
```

#### A-08 `fish_itou_catch.png` — いとう (川・**legendary**)
- STYLE: [STYLE-CATCH-GREEN](#style-catch-green) / AR **16:9** (2048×1152) / クロマ **`#00ff00`** (銀色主体)
- 用途: 日本最大の淡水魚・「まぼろしの さかな」。川の伝説枠
- 注意: 他の16枚と同じ画風のまま、**わずかに発光する銀色の鱗**で「格」を出す

```
A Sakhalin taimen (itou, Parahucho perryi), seen exactly from the side with the head to the LEFT. A very long powerful salmonid with a slightly flattened head, a long low body, a small adipose fin and a broad shallow forked tail. The scales have a faint gentle inner luminosity — a soft pearlescent silver that glows very slightly from within, like moonlight on water — while staying within a pastel coloured-pencil palette and never becoming neon, metallic chrome or glittery. Cool silver-blue along the back fading to soft pearl-white on the flank and belly, with a light dusting of tiny dark grey speckles on the upper body and a faint warm rose blush along the lateral line. Calm, noble and gentle. Long and slender, about five times as long as it is deep.
```

#### A-09 `fish_kisu_catch.png` — きす (海・normal)
- STYLE: [STYLE-CATCH-GREEN](#style-catch-green) / AR **16:9** (2048×1152) / クロマ **`#00ff00`**
- 用途: 砂浜の最正解魚。白身・天ぷら

```
A Japanese whiting (kisu, Sillago japonica): a slender elongated fish with a gently tapering pointed snout and a small mouth, a long low first dorsal fin and a second soft dorsal fin, and a shallow forked tail. Pearly pale sandy-beige along the back fading to a soft silvery cream belly, with a faint pale golden sheen along the flank. Fins are almost translucent pale cream. Slim and elegant, about four times as long as it is deep.
```

#### A-10 `fish_asari_catch.png` — あさり (海・normal)
- STYLE: [STYLE-CATCH-GREEN](#style-catch-green) / AR **1:1** (2048×2048) / クロマ **`#00ff00`**
- 用途: 潮干狩り。「貝」枠 (海)

```
A single Manila clam (asari, Ruditapes philippinarum) shell, closed, seen from the side of the shell face, centred. A rounded-oval bivalve shell with fine radiating ribs and delicate concentric growth lines. The surface carries the characteristic soft zigzag chevron pattern in warm chestnut brown and slate grey over a pale cream and sand-beige ground, with a hint of dusty lilac near the hinge. Matte and softly shaded, never glossy. No eye, no face, no legs.
```

#### A-11 `fish_saba_catch.png` — さば (海・normal)
- STYLE: [STYLE-CATCH-MAGENTA](#style-catch-magenta) / AR **16:9** (2048×1152) / クロマ **`#ff00ff`** (背が青緑)
- 用途: 桟橋・沖の定番。塩焼き/みそ煮

```
A chub mackerel (saba, Scomber japonicus), seen exactly from the side with the head to the LEFT. A smooth spindle-shaped fish with a pointed snout, two separate dorsal fins, a row of small soft finlets running along the top and bottom of the narrow tail stalk, and a neat crescent-shaped forked tail. The back is a soft muted blue-green marked with a pattern of gentle dark wavy stripes; the flank fades through pale pearl-silver to a cream-white belly. The wavy stripes are soft pencil strokes, not hard black lines. Sleek and streamlined, about four times as long as it is deep.
```

#### A-12 `fish_sanma_catch.png` — さんま (海・normal)
- STYLE: [STYLE-CATCH-GREEN](#style-catch-green) / AR **16:9** (2048×1152) / クロマ **`#00ff00`**
- 用途: 沖の表層の群れ。秋の味覚

```
A Pacific saury (sanma, Cololabis saira), seen exactly from the side with the head to the LEFT. A very long slim ribbon-like fish with a slender pointed beak-like lower jaw, a small dorsal fin set far back, a row of tiny soft finlets before the small forked tail. Deep steel-blue along the back with a soft sheen, changing sharply along a clean line to a bright pearl-silver flank and a cream-white belly. Elegant and streamlined, about eight times as long as it is deep. The beak tip is softly rounded, never needle-sharp.
```

#### A-13 `fish_kani_catch.png` — わたりがに (海・normal)
- STYLE: [STYLE-CATCH-MAGENTA](#style-catch-magenta) / AR **1:1** (2048×2048) / クロマ **`#ff00ff`** (甲羅が青緑)
- 用途: ユーザー要望の「カニ」枠 (海)
- 注意: **真上からの俯瞰 (top-down)**

```
A Japanese blue swimming crab (watarigani, Portunus trituberculatus), seen from directly above, centred and symmetrical. A broad flattened carapace, wider than it is long, in soft muted teal blue-green with gentle cream marbled mottling and a warm sandy edge. Six walking legs spread to the sides, the rearmost pair ending in wide flat rounded paddle-shaped swimming legs. Two front claws held up and slightly open, banded in pale cream and soft blue. Two tiny round eyes on short stalks, drawn friendly and calm. The carapace side points and all claw and leg tips are softly rounded, never sharp or spiky.
```

#### A-14 `fish_sazae_catch.png` — さざえ (海・normal)
- STYLE: [STYLE-CATCH-MAGENTA](#style-catch-magenta) / AR **1:1** (2048×2048) / クロマ **`#ff00ff`** (殻がオリーブ緑)
- 用途: 磯の巻貝。つぼ焼き

```
A single horned turban shell (sazae, Turbo sazae), empty and closed with its round pale operculum lid in place, seen from the side and slightly above, centred. A chunky spiral cone-shaped sea snail shell with about four whorls, ringed with rows of short blunt rounded knobs and a few stubby rounded horn-like projections. Muted olive-green and dusty seaweed brown with pale cream banding along the spiral ridges, and a soft chalky bloom. The lid is a smooth pale cream disc with a fine spiral. Matte and softly shaded, never glossy. All knobs and horns are blunt and rounded, never sharp. No eye, no face, no body sticking out.
```

#### A-15 `fish_tako_catch.png` — たこ (海・**rare**)
- STYLE: [STYLE-CATCH-GREEN](#style-catch-green) / AR **1:1** (2048×2048) / クロマ **`#00ff00`**
- 用途: ユーザー要望の「タコ」枠。子供の人気が非常に高い
- 注意: **絶対に不気味にしない。** 触腕は太めで先が丸く、ゆるく巻く。ホラー要素ゼロ

```
A common octopus (tako, Octopus vulgaris) seen from the side and slightly front, centred and upright. A large round soft dome-shaped head, two big gentle round eyes with soft white highlights, and a small calm smiling expression. Eight thick soft arms of even length spread out and curl loosely downward and outward in gentle relaxed spirals, each arm tapering to a softly rounded tip — thick and rounded, never thin, never whip-like, never grasping. A row of small pale round suckers runs along the underside of each arm, drawn as soft dots. Warm terracotta orange-red mottled with dusty rose and soft cream, fading to a pale cream underside. Round, plump, friendly and comical. Absolutely not scary, not slimy, not menacing.
```

#### A-16 `fish_hirame_catch.png` — ひらめ (海・**rare**)
- STYLE: [STYLE-CATCH-GREEN](#style-catch-green) / AR **3:2** (2048×1365) / クロマ **`#00ff00`**
- 用途: 白身の王様。かれいとの「左右の違い」が知育ネタ
- 注意: **既存 `fish_karei_catch.png` (かれい) と対になる絵**。ひらめは**両目が左側**、
  かれいは右側。この違いが図鑑の学びどころなので、**目は必ず左側**に置くこと

```
A Japanese olive flounder (hirame, Paralichthys olivaceus), seen from directly above its eyed side, lying flat, body horizontal with the HEAD TO THE LEFT. A wide flat oval fish outlined by a continuous soft frill of long low dorsal and anal fins running all the way around the top and bottom edges of the body, ending in a small fan-shaped tail on the right. BOTH EYES ARE ON THE UPPER LEFT SIDE OF THE HEAD, close together, large and round and friendly, with a small gentle smiling mouth below them. Soft sandy olive-brown with fine darker mottling and a few soft pale ring-shaped spots scattered over the body, blending toward a lighter sandy edge along the fin frill. Calm and elegant.
```

#### A-17 `fish_ryuuguunotsukai_catch.png` — リュウグウノツカイ (海・**legendary**)
- STYLE: [STYLE-CATCH-GREEN](#style-catch-green) / AR **16:9** (2048×1152) / クロマ **`#00ff00`**
- 用途: 深海の幻。「竜宮」で子供の物語感に接続する海の伝説枠
- 注意: **深海=暗い/怖い にしない。** 明るい銀色でやさしい、おとぎ話の生き物として描く

```
An oarfish (ryuuguunotsukai, Regalecus glesne), seen exactly from the side with the head to the LEFT. An extremely long flat ribbon-shaped body that undulates in one or two very gentle wide S-curves across the frame, tapering slowly toward the right. A soft dusty coral-red dorsal fin runs along the entire length of the top edge like a delicate ribbon, and from the top of the small head rises a crown of three or four long soft coral-red plumes that trail backward. Two long slender pelvic rays with small rounded paddle tips hang down near the head. The body is bright pearly silver-white with a faint pale blue sheen and a scattering of soft grey dapples. One large round gentle dark eye with a white highlight, and a small calm mouth. Bright, luminous, elegant and dreamlike, like a creature from a gentle sea fairy tale — absolutely not dark, not deep-sea gloomy, not scary.
```

---

### 7.B 魚影 (shadow) — 10点

**用途**: 水中を近づいてくる「さかなの かげ」。レア種ほどシルエットが違って見えることで、
3〜7歳が「あ、いつもと違うのが来た!」と一目で分かるようにするための素材です。
**保存先**: `shadows/`
**命名規則**:
- アーキタイプ共有ライブラリ = `sil_<archetype>_shadow.png` (Unity 配置先 `Sprites/Shadows/`)
- 種専用 = `<speciesId>_shadow.png` (Unity 配置先 `Sprites/`)

> **catch 画像と絶対に混同しないこと。** これは色も目も模様も無い、**真っ平らな
> 単色 `#0F2C56` (濃紺) のシルエット**です。塗り絵の切り絵だと思ってください。
> ここに絵柄を描き込むと、ゲーム内で尾振りシェーダーが破綻します。

**全点共通のハード契約 (シェーダー `KawaFishWag.shader` の要求):**
- 塗りは **`#0F2C56` の完全な単色ベタ 1色のみ**。グラデ・輪郭線・目・模様・影・紙目は一切なし
- **真横視点・頭が左 (u=0) / 尾が右 (u=1)**。左右を間違えると尾が頭側から振れます
- 体は水平・フレーム中央。四辺に十分なクロマ余白 (トリムと 4% パディングはスクリプトが実施)
- 丸みのある子供向けプロポーション。トゲ・牙・鋭角を作らない

---

#### B-01 `sil_torpedo_giant_shadow.png` — **P0** / tier2 (スーパーレア) 既定 + まぐろ
- STYLE: [STYLE-SILHOUETTE](#style-silhouette) / AR **16:9** (2048×1152) / クロマ **`#00ff00`**
- 用途: 「うわ、でっかいのが来た」を一目で伝える最上位シルエット
- 追加メモ (統合担当者向け): 背びれが高いので、後処理の縦パディングを 4%→**6%** にすること

```
The silhouette is a huge powerful tuna-like fish: a very thick smooth spindle-shaped body, broadest just behind the head and tapering to a narrow tail stalk; a tall triangular dorsal fin standing up high on the back; long swept-back pectoral fins; a row of very small soft finlets along the top and bottom of the tail stalk; and a wide, clearly defined, deeply crescent-shaped (lunate) tail at the right end. Bold, heavy and impressive.
```

#### B-02 `sil_broad_fancy_shadow.png` — **P0** / tier1 (レア) 既定 + たい
- STYLE: [STYLE-SILHOUETTE](#style-silhouette) / AR **3:2** (2048×1365) / クロマ **`#00ff00`**
- 用途: 「かたちが ちがう…ごうかだ」を伝えるレア既定シルエット
- 追加メモ: 体高が高いので後処理の縦パディングを **6%** に

```
The silhouette is a tall elegant sea bream: a deep, tall, diamond-shaped body much deeper than a normal fish, with a smoothly curved high back and a rounded forehead; a long dorsal fin along the whole top of the back and a long anal fin along the bottom, both with softly rounded outlines; broad rounded pectoral and pelvic fins; and a large deeply forked tail with two long graceful tips. Graceful, luxurious and clearly wider-bodied than an ordinary fish.
```

#### B-03 `sil_tentacle_shadow.png` — **P0** / いか + たこ 共有
- STYLE: [STYLE-SILHOUETTE](#style-silhouette) / AR **16:9** (2048×1152) / クロマ **`#00ff00`**
- 用途: 「魚じゃない何かが来た」枠

```
The silhouette is a squid: a rounded torpedo-shaped mantle body with a pair of soft triangular fins along its sides, the pointed end of the mantle at the RIGHT of the frame and the head at the LEFT. From the head, five or six soft tentacles trail toward the LEFT, of slightly different lengths, curving loosely and gently. Each tentacle is fairly thick and ends in a rounded blunt tip — never thin, never whip-like, never sharp. Soft and friendly.
```

#### B-04 `sil_flat_disc_shadow.png` — **P0** / かれい + ひらめ 共有
- STYLE: [STYLE-SILHOUETTE](#style-silhouette) / AR **3:2** (2048×1365) / クロマ **`#00ff00`**
- 用途: ぺたんこの平べったい魚枠

```
The silhouette is a flatfish seen flat-on: a wide flat oval body, much wider than it is tall in outline, with a continuous soft frill of fin running all the way around the top and bottom edges of the body — the frill outline gently wavy with many small rounded scallops. A small rounded head at the LEFT and a small fan-shaped tail at the RIGHT. Very flat, wide and leaf-like.
```

#### B-05 `sil_regal_longfin_shadow.png` — **P0** / tier3 (レジェンド) 既定 + リュウグウノツカイ
- STYLE: [STYLE-SILHOUETTE](#style-silhouette) / AR **16:9** (2048×1152) / クロマ **`#00ff00`**
- 用途: 伝説種の到来。他のどのシルエットにも似ないこと が最重要

```
The silhouette is a long ribbon-like fish of legend: a very long, slender, flat body running the whole width of the frame in one gentle wide S-curve, tapering slowly toward the RIGHT, with the small head at the LEFT. A continuous soft ribbon-like fin runs along the ENTIRE top edge of the body from just behind the head to the tail. From the top of the head rise three or four long soft plume-like streamers that trail backward and curl gently. Two long slender rays with small rounded paddle tips hang downward from just behind the head. Flowing, regal and unmistakable — but soft and rounded everywhere, never spiky or snake-like-menacing.
```

#### B-06 `sil_barbel_heavy_shadow.png` — **P0** / なまず (川・super)
- STYLE: [STYLE-SILHOUETTE](#style-silhouette) / AR **16:9** (2048×1152) / クロマ **`#00ff00`**
- 用途: 「ひげのある大きいの」枠。クロスレビューで追加が必要と判明したアーキタイプ

```
The silhouette is a big catfish: a very wide flat blunt rounded head at the LEFT, a thick heavy front body that flattens sideways toward the rear, a long low fin running along the underside of the rear half, a small soft dorsal fin near the shoulder, and a small rounded paddle tail at the RIGHT. Four long soft whiskers curve gently forward and downward from the head, drawn as smooth rounded tapering strands of even thickness. Broad, heavy, rounded and gentle.
```

#### B-07 `fish_itou_shadow.png` — **P0** / いとう (川・legendary) 種専用
- STYLE: [STYLE-SILHOUETTE](#style-silhouette) / AR **16:9** (2048×1152) / クロマ **`#00ff00`**
- 用途: 川の伝説種。保存名に `sil_` は**付けない** (種専用スロット)

```
The silhouette is an enormous ancient river salmon: a very long, powerful, low-slung body with a slightly flattened blunt head at the LEFT, a long straight back with a small dorsal fin near the middle and a tiny adipose fin further back, broad rounded pectoral and pelvic fins, and a wide shallow forked tail at the RIGHT. Noticeably longer and heavier than an ordinary trout — about five times as long as it is deep. Calm, massive and dignified.
```

#### B-08 `sil_star5_shadow.png` — **P1 推奨** / ひとで
- STYLE: [STYLE-SILHOUETTE](#style-silhouette) / AR **1:1** (2048×2048) / クロマ **`#00ff00`**
- 用途: 手続き生成の星形の置換
- 注意: 星形なので「頭が左」ルールは適用しない。中央に配置し、腕を1本だけ真上に向ける

```
The silhouette is a starfish seen from directly above, centred in the frame: five thick arms of equal length radiating evenly from a rounded central disc, one arm pointing straight up. Each arm is broad at the base, tapers gently and ends in a soft rounded tip. Plump and friendly, never thin or spiky.
```

#### B-09 `sil_object_shell_shadow.png` — **P1 推奨** / 貝がら + あさり + しじみ 共有
- STYLE: [STYLE-SILHOUETTE](#style-silhouette) / AR **1:1** (2048×2048) / クロマ **`#00ff00`**
- 用途: 二枚貝枠。輪郭だけで放射状の筋は入れない
- 注意: 「頭が左」ルールは適用しない。中央配置・扇のとがった側 (蝶番) を下に

```
The silhouette is a single closed scallop-like bivalve seashell seen face-on, centred: a rounded fan shape, widest at the top with a softly scalloped wavy upper rim, narrowing to a small rounded hinge with two small flat wings at the bottom. Outline only — no radiating ribs, no internal lines. Simple, plump and instantly readable.
```

#### B-10 `sil_spiral_shell_shadow.png` — **P1 推奨** / さざえ (巻貝)
- STYLE: [STYLE-SILHOUETTE](#style-silhouette) / AR **1:1** (2048×2048) / クロマ **`#00ff00`**
- 用途: 二枚貝 (B-09) とは別形が必要というクロスレビュー指摘への対応
- 注意: 「頭が左」ルールは適用しない。中央配置

```
The silhouette is a single turban sea snail shell seen from the side, centred: a chunky cone-shaped spiral shell with about four whorls coiling up to a rounded point at the top right, and a wide rounded opening at the bottom left. Around the outside of each whorl there are several short blunt rounded bumps standing out from the outline. Outline only — no surface lines inside the shape. All bumps are blunt and rounded, never sharp or thorn-like.
```

---

### 7.C ウキ (浮き) の実アート — 3点

**用途**: 画面中央でずっと映っている「ウキ」。現在はコードで描いたフラットな図形で、
ユーザーから「しょぼい」と指摘された箇所です。ここだけ画風が浮いています。
**保存先**: `bobber/`

---

#### C-01 `bobber_float.png` — **P0 必須**
- STYLE: [STYLE-PROP-AIR-GREEN](#style-prop-air-green) / AR **2:3 縦** (1024×1536) / クロマ **`#00ff00`**
- 用途: ウキ本体。水面に立って浮いている状態を真横から
- **レイアウト厳守** (実装がこの比率に依存します):
  - くびれ (チャコールの帯) の中心 = 被写体の高さの**下から 38% ±3%**
  - アンテナの玉のてっぺん = 被写体の最上端
  - 胴体の最大幅 ≤ 被写体の高さの 42%
- 設計書は白背景 `#FFFFFF` を指定していますが、**処理スクリプトが白を扱えないため緑キーに
  変更しています**。赤+クリーム色の被写体は緑キーで安全に抜けます (マゼンタは赤と干渉するので不可)

```
A single classic fishing float (bobber) standing perfectly upright, viewed exactly from the side, centred. The upper part is a rounded dome in warm vermilion red with a soft highlight on the upper left; the lower part is a smooth cream-white teardrop tapering to a rounded point at the bottom; a thin charcoal-grey band separates the two at the widest point of the body, and the centre of that band sits at 38% of the total height measured from the bottom tip. A slim ivory antenna stem rises from the top of the red dome and ends in a small rounded warm-yellow bead at the very top. The body is at most 42% as wide as the whole object is tall. No water, no fishing line, no hook, no ripples.
```

#### C-02 `bobber_wake_foam.png` — **P0 必須**
- STYLE: [STYLE-PROP-AIR-GREEN](#style-prop-air-green) / AR **4:1 横** (2048×512) / クロマ **`#00ff00`**
- 用途: 魚が食いついてウキが引っ張られる時に出る、水面の白い引き波の泡
- **明るく厚い端が必ず左**。実装が `flipX` で牽引方向を反転します
- 設計書は中間グレー `#808080` を指定していますが、**処理スクリプトが green/magenta しか
  扱えないため緑キーに変更**しています (白+淡いシアンの泡は緑キーで安全)

```
A single small crescent of white water foam on a calm water surface, seen from the side at eye level. It is a low soft ridge of foam, thick and bright at the LEFT end and thinning steadily toward the RIGHT, made of many small rounded overlapping foam bubbles in soft white and very pale cyan with pale cream shading underneath. Toward the right end it does not fade away smoothly — instead it breaks up into a scattering of separate small rounded foam specks with clear crisp edges, each one fully opaque. A few tiny foam specks float just above the ridge. Nothing else in the image — no fish, no float, no sky, no horizon, no shoreline, no water surface line.
```

#### C-03 `bobber_splash_crown.png` — **P2 任意 (最後でよい)**
- STYLE: [STYLE-PROP-AIR-GREEN](#style-prop-air-green) / AR **1:1** (1024×1024) / クロマ **`#00ff00`**
- 用途: ウキが飛び込んだ瞬間の水しぶき。C-01/C-02 を実装した後、まだ安っぽく見える場合のみ使用

```
A small gentle splash crown of water, seen from the side at eye level: a low rounded ring of water rising upward and outward into several soft rounded droplets and short blunt water fingers, each tipped with a small round drop. Soft white and very pale cyan with pale cream shading. Every droplet has a crisp opaque edge — no smooth fade, no mist, no spray haze. Symmetric and cheerful, about as wide as it is tall. Nothing else in the image — no fish, no float, no water surface line, no sky.
```

---

### 7.D 背景のパララックスレイヤー — 16点

**用途**: 「背景を静止画っぽくしたくない。雲が流れる・木々が揺れる」というユーザー要望への
直接の回答。ゲームは静止した背景画1枚の上に、これらのレイヤーを重ねて別々の速度で
スクロール/揺らします。
**保存先**: `layers/`
**命名規則**: `layer_<用途>_<種別>.png` (全て小文字スネークケース)

> **重要**: D-01 / D-06 / D-07 はゲーム内で横方向に繰り返しタイルします。ただし
> **シームレス化 (継ぎ目消し) は Codex の仕事ではありません**。§6.2-2 の「四辺に
> クロマ余白を残す」を優先してください。継ぎ目処理は統合タスクで行います。

---

#### D-01 `layer_clouds_cirrus.png` — **P0** / 遠景の巻雲シート (全5ロケーション)
- STYLE: [STYLE-PROP-AIR-GREEN](#style-prop-air-green) / AR **4:1** (2048×512) / クロマ **`#00ff00`**

```
A wide horizontal band of thin wispy cirrus clouds high in a calm summer sky: five or six long soft streaks of white and very pale warm grey, drawn with light feathery coloured-pencil strokes, sparse and airy with plenty of open space between them, all running roughly horizontally with a slight tilt. The streaks have soft but clearly defined edges, never blurred into nothing. The cloud band occupies the middle of the frame only; the top quarter and the bottom quarter of the frame are empty flat chroma with no cloud in them at all. No sky colour, no gradient, no sun, no birds.
```

#### D-02 `layer_cloud_cumulus_a.png` — **P0** / 中景の積雲 その1
- STYLE: [STYLE-PROP-AIR-GREEN](#style-prop-air-green) / AR **2:1** (1024×512) / クロマ **`#00ff00`**

```
One single fluffy fair-weather cumulus cloud, seen from the side, floating alone: a soft rounded billowing top made of several overlapping puffs, and a flatter softer base. Bright white on the sunlit upper left, shading to gentle pale lavender-grey underneath. Soft rounded coloured-pencil edges that are clearly defined, never wispy and never fading into nothing. Wider than it is tall. No sky colour, no gradient, no sun rays, no birds, no other clouds.
```

#### D-03 `layer_cloud_cumulus_b.png` — **P0** / 中景の積雲 その2
- STYLE: [STYLE-PROP-AIR-GREEN](#style-prop-air-green) / AR **2:1** (1024×512) / クロマ **`#00ff00`**

```
One single fluffy fair-weather cumulus cloud, seen from the side, floating alone, with a clearly different outline from a simple round puff: a long low cloud with one taller rounded tower rising on its right side and a lower flatter shelf trailing off to the left. Bright white on the sunlit upper left, shading to gentle pale lavender-grey underneath. Soft rounded coloured-pencil edges that are clearly defined, never wispy and never fading into nothing. Much wider than it is tall. No sky colour, no gradient, no sun rays, no birds, no other clouds.
```

#### D-04 `layer_bird_gull.png` — **P0** / 空を横切るかもめ (海3ロケーション)
- STYLE: [STYLE-PROP-AIR-GREEN](#style-prop-air-green) / AR **2:1** (512×256) / クロマ **`#00ff00`**

```
One single seagull in flight, seen from the side and slightly below, with both wings spread wide and held in a gentle shallow M shape. Simplified and small, as if seen from far away: soft pale grey-white body, soft charcoal-grey wing tips and a tiny warm yellow beak, with almost no internal detail. Wings spread much wider than the body is long. Calm and graceful. No sky, no clouds, no other birds.
```

#### D-05 `layer_bird_small.png` — **P0** / 空を横切る小鳥/とんぼ (川2ロケーション)
- STYLE: [STYLE-PROP-AIR-GREEN](#style-prop-air-green) / AR **2:1** (512×256) / クロマ **`#00ff00`**

```
One single small dragonfly seen from the side and slightly above, flying level: a slim straight body and two pairs of long narrow rounded wings held out to the sides. Simplified and tiny, as if seen from a distance: soft warm amber-brown body with a hint of dusty blue, and very pale translucent-looking cream wings with the faintest hint of veining. Calm and gentle. No sky, no clouds, no other insects, no flowers.
```

#### D-06 `layer_haze_subsurface.png` — **P0** / 水面直下の淡い横縞ハイライト (全5ロケーション)
- STYLE: [STYLE-PROP-WATER-GREEN](#style-prop-water-green) / AR **4:1** (1024×256) / クロマ **`#00ff00`**

```
A band of soft horizontal light streaks just below the surface of clear water: six or seven long thin bands of pale white and very pale cream light lying almost horizontally, of different lengths and thicknesses, loosely spaced with clear gaps between them, drawn as gentle soft-edged coloured-pencil strokes with clearly defined ends. Nothing else at all — no water colour wash, no bubbles, no plants, no fish, no rocks, no surface line. The top eighth and the bottom eighth of the frame are empty flat chroma.
```

#### D-07 `layer_drift_plankton.png` — **P0** / 水中に漂う微粒子シート (全5ロケーション)
- STYLE: [STYLE-PROP-WATER-GREEN](#style-prop-water-green) / AR **1:1** (1024×1024) / クロマ **`#00ff00`**

```
A sparse scattering of about forty tiny drifting specks of plankton suspended in clear water, spread loosely and unevenly across the frame with plenty of empty space between them. Each speck is a small crisp opaque dot in soft white or very pale cream, of slightly different sizes, a few of them slightly elongated. Every dot has a clean defined edge — no glow, no blur, no halo, no fading. Nothing else at all — no water colour wash, no bubbles, no plants, no fish, no rocks. Keep a clear empty chroma margin around the whole group so no speck touches any edge of the frame.
```

#### D-08 `layer_debris_leaf.png` — **P0** / 水面に浮かぶ落ち葉 (川2ロケーション、海は tint 流用)
- STYLE: [STYLE-PROP-AIR-GREEN](#style-prop-air-green) / AR **1:1** (512×512) / クロマ **`#00ff00`**

```
One single small fallen autumn leaf, seen from directly above, lying flat, tilted at a gentle angle: a simple rounded oval leaf with a softly wavy edge, a slender stem at one end and a few faint veins. Warm amber and soft rust-orange fading to pale gold at the edges, with gentle pencil shading. Autumn colours only, no green. Nothing else — no water, no ripples, no other leaves.
```

#### D-09 `layer_fg_silhouette_rock.png` — **P0** / 手前の岩の縁 (asase / iwaba)
- STYLE: [STYLE-PROP-WATER-GREEN](#style-prop-water-green) / AR **8:5** (1024×640) / クロマ **`#00ff00`**
- 用途: 画面の一番手前に置き、魚がその裏に隠れる「額縁」。ゲーム側で画面下端で切れます
- 注意: **絵の中で画面外に切ってはいけません** (§6.2-2)。岩塊全体を描き、四辺に余白を残すこと

```
A near-foreground mass of overlapping underwater rocks forming one solid rocky ledge, seen from the side: five or six large boulders leaning against each other, rising from a broad flat base on the left up to a higher rounded shoulder on the right, with an irregular knobbly top outline. Because it is very close to the viewer it is deeper, cooler and a little darker than a distant rock — muted blue-grey and deep slate with soft olive-green algae patches on the upper surfaces — but it is still a soft coloured-pencil drawing with visible paper tooth, never a flat black silhouette and never pure black. Much wider than it is tall. The whole rock mass is fully inside the frame with a clear empty chroma margin all the way around it.
```

#### D-10 `layer_fg_silhouette_kelp.png` — **P0** / 手前の大きな海藻 (kakou / sunahama / iwaba)
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **5:8** (640×1024) / クロマ **`#ff00ff`** (被写体が緑)

```
A near-foreground cluster of three or four very large kelp blades rising from one holdfast at the bottom centre: long broad ribbon-shaped blades with gently rippled wavy edges, of different heights, leaning together and curving in the same direction as if in a slow current. Because they are very close to the viewer they are deeper and cooler in colour than distant seaweed — deep sea-green and dark olive with cool blue-grey shading and only a few pale highlights along the midribs — but still a soft coloured-pencil drawing with visible paper tooth, never a flat black silhouette. Taller than wide. The whole clump is fully inside the frame with a clear empty chroma margin all the way around it.
```

#### D-11 `layer_tree_riverbank_a.png` — **P0** / 川岸の広葉樹 その1 (asase)
- STYLE: [STYLE-PROP-AIR-MAGENTA](#style-prop-air-magenta) / AR **5:7** (640×896) / クロマ **`#ff00ff`** (葉が緑)
- 用途: 「木々が揺れる」要件の主役。根元が下端中央に来るように

```
One single broadleaf riverbank tree, seen from the side, standing alone: a slightly leaning warm grey-brown trunk rising from the bottom centre of the frame, splitting into three or four main branches, carrying a full rounded billowing canopy of soft leafy foliage made of many small overlapping clumps. Fresh spring-green and soft olive with pale yellow-green sunlit highlights on the upper left and cooler sage-green in the shaded lower right. Friendly, rounded and full. Taller than wide. No roots showing, no ground, no grass, no other trees, no birds.
```

#### D-12 `layer_tree_riverbank_b.png` — **P0** / 川岸の広葉樹 その2 (asase)
- STYLE: [STYLE-PROP-AIR-MAGENTA](#style-prop-air-magenta) / AR **5:7** (640×896) / クロマ **`#ff00ff`**
- 注意: **D-11 とはっきり違うシルエット**にすること (同じ木が2本並ぶと手抜きに見える)

```
One single broadleaf riverbank tree, seen from the side, standing alone, with a clearly different shape from a simple round tree: a straighter slender warm grey-brown trunk rising from the bottom centre, with a taller narrower canopy that is wider at the top than at the bottom and slightly lopsided, with one long low branch reaching out to the left. Foliage made of many small overlapping leafy clumps in soft olive-green and warm moss-green with pale butter-yellow sunlit highlights on the upper left. Friendly and rounded. Noticeably taller and narrower than a round tree. No roots showing, no ground, no grass, no other trees, no birds.
```

#### D-13 `layer_reed_cluster.png` — **P0** / 葦の束 (asase / kakou)
- STYLE: [STYLE-PROP-AIR-MAGENTA](#style-prop-air-magenta) / AR **1:1** (512×512) / クロマ **`#ff00ff`**

```
One clump of about nine tall riverside reeds growing from a single base at the bottom centre of the frame, with no trunk: long straight slender leaf blades of slightly different heights, most standing nearly upright and a few arching gently over to one side, each ending in a soft pointed but rounded tip. Fresh grass-green fading to warm straw-gold at the tips, with pale highlights along the blades. A few short blades at the base. No seed heads, no flowers, no ground, no water.
```

#### D-14 `layer_dunegrass_cluster.png` — **P0** / 砂丘の草の茂み (kakou / sunahama)
- STYLE: [STYLE-PROP-AIR-MAGENTA](#style-prop-air-magenta) / AR **10:7** (640×448) / クロマ **`#ff00ff`**

```
One low spreading clump of dune grass growing from a single base at the bottom centre of the frame: many fine narrow blades fanning outward and arching over in all directions like a soft fountain, of many different lengths, the outer blades bending almost horizontal. Soft sage-green and pale sea-green fading to warm straw-cream at the tips. Wider than it is tall. No sand, no ground, no flowers, no seed heads.
```

#### D-15 `layer_palmgrass_tuft.png` — **P0** / 浜辺の草の小さい房 (sunahama)
- STYLE: [STYLE-PROP-AIR-MAGENTA](#style-prop-air-magenta) / AR **1:1** (512×512) / クロマ **`#ff00ff`**

```
One small tuft of short beach grass growing from a single base at the bottom centre of the frame: about twelve short broad blades of slightly different heights, standing up and leaning gently to one side, each ending in a soft rounded tip. Soft muted sage-green and pale olive with warm cream at the very tips and a hint of dusty blue in the shade. Small, compact and low, roughly as wide as it is tall. No sand, no ground, no flowers.
```

#### D-16 `bg_tsuri_sea_sunahama_v2.png` — **P2 任意 (最後でよい)** / 砂浜の背景の撮り直し
- STYLE: **使わない** (これだけ特殊。下の BODY 単独 + NEGATIVE-COMMON) / AR **16:9** (2688×1520)
- クロマ: **なし。不透明な全画面背景画**。クロマキー処理も一切しません
- 用途: 現行の砂浜背景は水平線の位置が仕様と 59px ずれており、桟橋も高すぎます。
  **コード修正だけでも二重線は解消できるので、これは後追いで構いません**

```
A children's picture-book illustration of a calm Japanese sandy beach fishing spot, drawn in soft coloured pencil on textured watercolour paper with visible paper tooth, pastel low-saturation palette, no ink outlines, no photorealism. The view is a side-on cutaway: the upper part of the picture is a gentle pale blue summer sky with a few soft white cumulus clouds and a distant low green headland on the horizon; the lower part is clear pale turquoise seawater seen from the side, with rippled pale sand on the sea floor. The near white foam crest of the water surface runs horizontally across the picture at exactly 40% of the total image height measured from the top, and the wave amplitude is small and calm. A simple weathered wooden pier made of pale grey-brown planks on round pilings runs from the left toward the centre; the pier deck sits LOW, only a little above the water surface. Soft sunlight, warm and peaceful. No people, no boats, no fish, no crabs, no shells, no starfish, no text, no logo, no watermark, no UI.
```

---

### 7.E 環境オブジェクト (サンゴ / 岩 / 海藻) — 24点

**用途**: 「背景が最低限。サンゴ・岩・海藻をちゃんと作ってほしい」というユーザー要望への
直接の回答。現状の水中は 17.78 × 6.6 ワールド単位の空間に装飾が2〜4点しかなく、
画面の約 75% が無地のグラデーションです。
**保存先**: `props/`
**命名規則**: 既存踏襲。**川 = `kawa_*` / 海 = `umi_*`**、末尾に2桁連番。

> **§6.2-2 を必ず読んでから着手してください。** 設計書の原文には
> 「spans the full width of the frame edge to edge」という指定がありますが、
> **それをやると自動処理スクリプトが 1 枚も処理できません。** 本書では全て
> 「フレーム幅の約 88%、四辺にクロマ余白を残す」に修正済みです。
> Unity 側で自動トリムされるので、最終的な見た目は全く同じです。

---

#### Wave 1 (P0 必須 14点)

#### E-01 `kawa_bed_cobble_01.png` — 川の玉石床 (メイン)
- STYLE: [STYLE-PROP-WATER-GREEN](#style-prop-water-green) / AR **16:9** (2048×1152) / クロマ **`#00ff00`**

```
A wide horizontal bed of smooth river cobbles: dozens of rounded pebbles and stones in warm ochre, sand-beige, pale olive-grey and soft blue-grey, packed together and overlapping, with the larger stones along the bottom row and progressively smaller pebbles toward the top so the bed reads as receding away from the viewer. The stone bed spans about 88% of the frame width, and its top edge is irregular and knobbly — made of the crisp rounded outlines of the topmost pebbles, never blurred or faded. The bed occupies roughly the middle band of the frame, and there is empty flat chroma above it, below it and to the left and right of it.
```

#### E-02 `kawa_rock_cluster_01.png` — 川の岩の群れ
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **1:1** (2048×2048) / クロマ **`#ff00ff`** (苔が緑)

```
A cluster of five river boulders of different sizes leaning against each other to form one compact rocky mass, with a soft dark rounded crevice between two of the stones. Warm grey-brown and pale ochre stone with mottled pencil shading; the top surfaces carry a thin film of pale olive-green river algae and a few tiny tufts of short water grass. Small pebbles gather at the base. Wider than tall, with a stable readable silhouette.
```

#### E-03 `kawa_rock_mossy_01.png` — 苔むした大きな川石
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **1:1** (2048×2048) / クロマ **`#ff00ff`** (苔が緑)

```
A single large rounded river boulder seen from the side, slightly asymmetric with a flatter shoulder on one side. Its top third is covered in soft moss-green river algae with a few short strands trailing down; the lower body is warm grey-tan with gentle mottled pencil shading. Three or four small pebbles rest against its base.
```

#### E-04 `kawa_weed_clump_01.png` — 川の水草の株
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **9:16** (1152×2048) / クロマ **`#ff00ff`** (緑)

```
A dense clump of about ten tall freshwater ribbon-grass blades growing from one root base at the bottom centre of the frame. The blades are of slightly different heights and widths and curve gently to one side as if in a slow current; fresh yellow-green to soft grass-green with pale highlights along each blade; a few short blades at the base. The tips of the tallest blades stay well inside the frame with a clear empty chroma margin above them.
```

#### E-05 `kawa_grass_carpet_01.png` — 川底の短い草のカーペット
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **16:9** (2048×1152) / クロマ **`#ff00ff`** (緑)

```
A low wide carpet of short water grass growing across a riverbed: many small tufts of short soft green blades of varying heights, spanning about 88% of the frame width, all leaning gently in the same direction, denser in the centre and thinning to a few isolated tufts toward the left and right ends. The carpet is low and occupies only a band in the lower middle of the frame, with empty flat chroma above it, below it and at both ends. Every blade tip is a crisp defined stroke, never blurred or faded.
```

#### E-06 `umi_bed_sand_ripple_01.png` — 海の砂紋の床
- STYLE: [STYLE-PROP-WATER-GREEN](#style-prop-water-green) / AR **16:9** (2048×1152) / クロマ **`#00ff00`**

```
A wide strip of rippled sea-floor sand: gentle parallel wave ripples in pale cream, warm sand-beige and soft shell-pink, the ripple crests catching soft light, with a scattering of tiny pale gravel grains. The strip spans about 88% of the frame width and occupies a band in the lower middle of the frame; its top edge is irregular and gently undulating but crisply defined, never blurred or faded. There is empty flat chroma above it, below it and at both ends.
```

#### E-07 `umi_bed_gravel_01.png` — 磯の礫の床
- STYLE: [STYLE-PROP-WATER-GREEN](#style-prop-water-green) / AR **16:9** (2048×1152) / クロマ **`#00ff00`**

```
A wide strip of coastal shingle: densely packed flat rounded pebbles in cool grey, slate blue, pale ochre and soft mauve, of mixed sizes, larger toward the bottom and finer toward the top. The strip spans about 88% of the frame width and occupies a band in the lower middle of the frame; its top edge is irregular and knobbly, made of the crisp rounded outlines of the topmost pebbles, never blurred or faded. There is empty flat chroma above it, below it and at both ends.
```

#### E-08 `umi_reef_cluster_01.png` — 磯の礁のかたまり
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **1:1** (2048×2048) / クロマ **`#ff00ff`** (海藻が緑)

```
A rocky reef mound rising from the sea floor: overlapping weathered rocks forming one solid mass in muted slate-blue and grey-green stone with warm ochre patches. The surfaces are crusted with tiny pale barnacles and patches of soft olive and dusty rust-red seaweed film; two or three short soft corals and a few small green algae tufts grow from its ledges; a soft dark rounded crevice opens near the base. Wider than tall.
```

#### E-09 `umi_reef_cluster_02.png` — 魚が隠れるアーチのある礁
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **1:1** (2048×2048) / クロマ **`#ff00ff`** (海藻が緑)
- 用途: **最優先。**「いわの かげで なにか うごいたよ」演出の主役。魚影がこの裏に隠れます

```
A reef rock formation with an arch: a tall rocky outcrop whose upper part leans over to form an overhanging ledge with a wide open gap underneath, big enough for a fish to swim through. Muted grey-blue and sandy stone, barnacle crust, patches of soft olive and pale pink coralline algae, and a few short seaweed strands trailing from the overhang. Taller than wide, with a distinctive readable silhouette. The open gap under the arch shows flat chroma right through it.
```

#### E-10 `umi_coral_soft_01.png` — やわらかい扇サンゴ
- STYLE: [STYLE-PROP-WATER-GREEN](#style-prop-water-green) / AR **1:1** (2048×2048) / クロマ **`#00ff00`**
- 用途: 既存 `umi_coral_01` (硬輪郭・高彩度のベクタ調) の置換。**あれには似せないこと**

```
A soft fan coral growing on a small rock base: a broad rounded fan of fine lace-like branches in muted coral-pink fading to warm cream at the tips, with gentle pencil shading, slightly asymmetric and softly rounded. Muted and dusty, never bright, never neon pink. Drawn entirely with soft coloured pencil — no hard outlines, no flat vector shapes.
```

#### E-11 `umi_kelp_forest_01.png` — 緑の昆布の森
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **9:16** (1152×2048) / クロマ **`#ff00ff`** (緑)

```
A tall clump of about seven kelp fronds growing from one holdfast at the bottom centre of the frame: long ribbon blades with gently rippled wavy edges, of different heights, all curving in the same direction as if in a slow current. Deep sea-green to fresh olive-green with pale highlights along the midribs, denser near the base. The tips of the tallest blades stay well inside the frame with a clear empty chroma margin above them.
```

#### E-12 `umi_kelp_forest_02.png` — 褐色のアラメの森
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **9:16** (1152×2048) / クロマ **`#ff00ff`** (オリーブ)

```
A tall clump of about six arame brown-kelp fronds growing from one holdfast at the bottom centre of the frame: narrower strap-like blades with wavy frilled edges, warm golden-brown to deep amber with olive-green undertones and pale honey highlights, curving gently as if in a slow current. The tips of the tallest blades stay well inside the frame with a clear empty chroma margin above them.
```

#### E-13 `umi_seagrass_meadow_01.png` — アマモの草原
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **16:9** (2048×1152) / クロマ **`#ff00ff`** (緑)

```
A low wide eelgrass meadow: many slender flat grass blades of varying heights growing in loose tufts, spanning about 88% of the frame width, all leaning gently in the same direction, soft grass-green to pale sea-green, denser in the centre and thinning to a few isolated blades toward the left and right ends. The meadow occupies a band in the lower middle of the frame, with empty flat chroma above it, below it and at both ends. Every blade tip is a crisp defined stroke, never blurred or faded.
```

#### E-14 `umi_rock_boulder_01.png` — 海の大岩
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **1:1** (2048×2048) / クロマ **`#ff00ff`** (海藻が緑)

```
A single large sea boulder seen from the side: rounded but irregular, in cool slate-blue-grey stone with warm sand-ochre patches and soft mottled pencil shading. A crust of tiny pale barnacles covers its upper half; a few short olive-green and dusty rust-red seaweed strands trail from its shoulders; small pebbles rest at its base.
```

---

#### Wave 2 (P1 推奨 10点)

#### E-15 `kawa_bed_cobble_02.png` — 川の粗い石の床 (寒色寄り)
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **16:9** (2048×1152) / クロマ **`#ff00ff`**
- 注意: 設計書は緑キー指定ですが、「cool grey-**green**」が緑キーの判定閾値
  (G > max(R,B) + 12) を跨ぐ危険があるためマゼンタに変更しています

```
A wide horizontal bed of coarse river stones: fewer but larger flat rounded rocks in cool grey-green, pale slate and soft ochre, with patches of pale sand and fine gravel filling the gaps between them. The bed spans about 88% of the frame width and occupies a band in the lower middle of the frame; its top edge is irregular and knobbly, made of the crisp rounded outlines of the topmost stones, never blurred or faded. Cooler and greyer than a warm ochre pebble bed. There is empty flat chroma above it, below it and at both ends.
```

#### E-16 `kawa_weed_clump_02.png` — 羽毛状の川の水草
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **9:16** (1152×2048) / クロマ **`#ff00ff`** (緑)
- 用途: 既存 `kawa_weed_02` (陸生の低木に見える) の置換

```
A short bushy tuft of feathery freshwater pondweed: many fine soft fronds fanning outward from a single base at the bottom centre of the frame, deep sage green to soft olive with pale yellow-green tips, gently curving, fuller and wider in its upper half. Each frond is drawn as a crisp defined pencil stroke, never blurred into a haze.
```

#### E-17 `kawa_branch_01.png` — 沈んだ流木の枝
- STYLE: [STYLE-PROP-WATER-GREEN](#style-prop-water-green) / AR **16:9** (2048×1152) / クロマ **`#00ff00`**
- 用途: 既存 `kawa_log_01` (製材された木口が見えて薪に見える) の段階的置換

```
A bare fallen tree branch lying submerged on a riverbed: weathered driftwood in pale grey-brown with soft woodgrain, several thinner side twigs forking upward and sideways, one end thicker and slightly split. Natural broken ends only — no sawn flat cut end, no visible tree rings, no leaves, no bark peeling into sharp shapes. Much wider than tall.
```

#### E-18 `kawa_leaflitter_01.png` — 沈んだ落ち葉のたまり
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **16:9** (2048×1152) / クロマ **`#ff00ff`**

```
A scattered drift of sunken fallen leaves resting on a riverbed: about twenty maple and oak leaves in soft amber, rust-orange, pale gold and faded brown, overlapping loosely and lying flat at various angles, denser in the centre and scattering thinner toward the left and right ends. The drift spans about 88% of the frame width and occupies a band in the lower middle of the frame, with empty flat chroma above it, below it and at both ends. Autumn colours only, no green leaves.
```

#### E-19 `umi_coral_soft_02.png` — 背の高い枝サンゴ
- STYLE: [STYLE-PROP-WATER-GREEN](#style-prop-water-green) / AR **9:16** (1152×2048) / クロマ **`#00ff00`**

```
A tall slender branching coral: several upright finger-like branches of different heights rising from a small rock base at the bottom centre of the frame, pale lavender-mauve at the base fading to warm cream at the softly rounded tips, with a soft velvety pencil texture and gentle asymmetry. All branch tips are blunt and rounded, never pointed.
```

#### E-20 `umi_coral_table_01.png` — 平たいテーブルサンゴ
- STYLE: [STYLE-PROP-WATER-GREEN](#style-prop-water-green) / AR **16:9** (2048×1152) / クロマ **`#00ff00`**

```
A low wide table coral: a broad flat plate-like coral shelf with a softly scalloped rim and fine radiating surface texture, supported by a short thick stem. Muted sandy ochre with dusty rose edges. Distinctly wider than tall.
```

#### E-21 `umi_anemone_01.png` — イソギンチャクの群れ
- STYLE: [STYLE-PROP-WATER-GREEN](#style-prop-water-green) / AR **1:1** (2048×2048) / クロマ **`#00ff00`**
- 注意: **絶対に不気味にしない。** 小さなお花のようにやさしく

```
A cluster of three sea anemones of different sizes attached to a small pale rock: soft rounded columns in warm cream and pale peach, each crowned with many short soft rounded tentacles in pale rose-pink and cream tipped with soft lilac, gently swaying. Friendly and soft like little flowers — never spiky, never menacing, never grasping.
```

#### E-22 `umi_sponge_01.png` — 海綿の群れ
- STYLE: [STYLE-PROP-WATER-GREEN](#style-prop-water-green) / AR **1:1** (2048×2048) / クロマ **`#00ff00`**

```
A cluster of four barrel sponges of different heights on a small rock base: thick hollow tube shapes with softly rounded open tops and gently pitted textured surfaces, in muted ochre-yellow, warm terracotta and dusty cream.
```

#### E-23 `umi_drift_weed_01.png` — 漂う流れ藻 (沖)
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **16:9** (2048×1152) / クロマ **`#ff00ff`** (オリーブ緑)
- 用途: 沖 (床のないロケーション) で中層の寂しさを消す浮遊物

```
A floating raft of drifting sargassum seaweed suspended in open water: a loose horizontal mass of golden-brown branching fronds with many small round air-bladders and fine olive-green leaflets, with a few wispy strands trailing down from the underside. Wider than tall, with a softly irregular but crisply drawn outline on all four sides, and nothing anchoring it to anything. Every trailing strand ends in a defined tip, never fading away into nothing.
```

#### E-24 `umi_pinnacle_far_01.png` — 超遠景の海中岩峰 (沖)
- STYLE: [STYLE-PROP-WATER-MAGENTA](#style-prop-water-magenta) / AR **16:9** (2048×1152) / クロマ **`#ff00ff`**
- 注意: 設計書は緑キー指定ですが、**淡いティール (青緑) が緑キーの閾値に近い**ため
  マゼンタに変更。また設計書の「base fades out softly into nothing」は
  クロマキーと両立しないため「輪郭は薄い色だが明確に描く」に変更しています

```
A distant undersea rock pinnacle seen far away through clear water: a tall rock spire with a rounded top and a smaller companion spire beside it, rendered very pale and hazy in soft blue-grey and pale teal with almost no internal detail, as if fading into the water by colour alone. Very low contrast, atmospheric, ghostly but gentle. Even though the colour is extremely pale, the outline of the rock is drawn clearly and completely all the way around, including across the bottom — it must be a closed, fully drawn shape, never dissolving or blurring into the background. It sits alone in the frame with nothing under it.
```

---

## 8. 納品方法 (生成後の受け渡し)

### 8.1 保存先

すべて次のディレクトリ配下に、**カテゴリ別サブフォルダを作って**保存してください。

```
tmp/alpha_pending/1470-kawaglint-expansion-art/
├── species/     ← 7.A 新種 catch 17点
├── shadows/     ← 7.B 魚影 10点
├── bobber/      ← 7.C ウキ 3点
├── layers/      ← 7.D 背景パララックスレイヤー 16点
└── props/       ← 7.E 環境オブジェクト 24点
```

- **ファイル名は §7 の「保存名」どおり**、拡張子込みで一字一句そのまま (全て小文字)。
  Unity のカタログがファイル名で引くので、`fish_yamame_catch.png` を
  `yamame.png` や `fish_yamame_catch_v2.png` にすると読み込まれません。
- **形式は PNG**。生成された画像をそのまま置いてください。
  リサイズ・トリム・アルファ抜き・リネーム以外の加工は**一切不要**です。
- リテイクして複数候補が出た場合は、**採用する1枚だけを上記の名前で置き**、
  没案は `<カテゴリ>/rejected/` に退避してください (採用フォルダ直下に置かない)。

### 8.2 コミットは不要

`tmp/` は `.gitignore` の 38 行目で除外されています。**git add / commit は一切しないでください。**
生成物はローカルのワーキングディレクトリに置くだけで OK です。

---

## 9. クロマキー除去は Codex の仕事ではありません

**アルファ抜き・切り抜き・トリム・パディング・リサイズは一切やらないでください。**
後続タスクが既存スクリプトを流用して自動処理します:

```
tmp/alpha_pending/1467-kawaglint-sea-depth-fishdex-art/process_kawaglint_art_1467.py
```

このスクリプトが自動で行うこと (= あなたがやらなくてよいこと):
- 外周から連結したクロマキー領域の抽出とアルファ化 (green / magenta の2キー対応)
- スピル (色かぶり) 除去、被写体内部の穴埋め、ハロー抑制
- 被写体バウンディングボックスへのトリム + **四辺 4% の透明パディング**
- 長辺 1024px へのプリマルチプライド縮小
- QA (外周・角・フリンジ・内部不透明率のチェック)

**ただし、生成時に指定どおりのクロマキー背景になっていることの確認はお願いします。**
1枚ごとに、画像を実際に開いて次の4点を目視してください:

1. **背景が指定色のベタか。** 純緑 `#00ff00` / 純マゼンタ `#ff00ff` であること。
   白・グレー・淡色・グラデーション・ビネットが付いていたら**リテイク**。
2. **被写体が四辺のどこにも接していないか。** 接していたら**リテイク** (§6.2-2)。
   帯状の素材でも左右と上下にクロマの余白があること。
3. **クロマキー色が被写体側に載っていないか。** 緑キーの絵に鮮やかな緑の部分、
   マゼンタキーの絵に鮮やかなマゼンタ/紫の部分があれば**キーを入れ替えてリテイク**。
4. **輪郭が半透明にぼけていないか。** 「もや」「霞」「フェードアウト」で終わる縁があれば
   **リテイク** (色フリンジが残って使えません)。

加えて画風のチェック (これがこのタスクで一番大事です):

5. **既存アートと並べて違和感がないか。**
   `fish_ayu_catch.png` / `bg_river_crosssection.png` / `Decor/kawa_rock_02.png` を横に並べて、
   (a) 紙の目のテクスチャがあるか (b) 硬い輪郭線が出ていないか (c) 彩度が高すぎないか
   (d) フォトリアル/3D になっていないか を確認。既存の `umi_coral_01` が画風から外れた原因は
   まさにこの (a)(b) チェックの欠落です。
6. **禁則物が混入していないか。** 文字・ロゴ・キャラクター・ヒトデ・貝・魚・カニ・
   落ち影・地面・水面線。混入していたら**リテイク**。
7. **魚影 (B) が「頭が左」になっているか。** これを間違えるとゲーム内で尾振りが逆になります。
   ここは特に間違えやすいので、10枚全部を1枚ずつ確認してください。

---

## 10. 完了報告に含めてほしいこと

作業が終わったら、次の形で報告してください。

1. **カテゴリ別の生成枚数**: A / B / C / D / E それぞれ「発注 n 点 → 生成 n 点」
2. **未生成があればその一覧と理由** (P1/P2 を後回しにした場合もここに)
3. **リテイクした枚数と理由の傾向** (例: 「輪郭がぼけて再生成 6 枚」「緑キーに緑被写体が
   出てマゼンタに切替 3 枚」など。次バッチの改善材料になります)
4. **§9 の検品 1〜7 を全枚数について実施したか** (yes/no と、引っかかった枚数)
5. **画風の自己評価**: 既存アートと並べて違和感がないか。とくに不安な枚があれば名指しで
6. **生成に使った手段**: 自前の GPT Image 2 で生成した枚数。
   もし人間の手動生成に回した分があれば、その枚数と理由
7. **保存先のフルパス** と、各サブフォルダのファイル数

---

## 11. 参考: 発注から意図的に外したもの (生成しないでください)

設計書 (`docs/KAWAGLINT_EXPANSION_DESIGN_2026-07-25.md`) には載っているが、
クロスレビューで重複・不要と判定して本書から**削除済み**の項目です。うっかり作らないように。

| 設計書での名前 | 削除理由 |
| --- | --- |
| `kawa_front_edge_01` / `umi_front_edge_01` (環境案 #6 / #16) | 背景案の `layer_fg_silhouette_rock` / `layer_fg_silhouette_kelp` (D-09 / D-10) と役割・sortingOrder・配置ロケーションが完全に同一。背景案側 (揺れシェーダー適用可) に統合 |
| `umi_bubble_column_01` (環境案 #17) | 背景案の `BubbleRise` が ParticleSystem + 既存の手続き生成テクスチャで実装される。1枚絵に焼くと同じパターンがループして見える |
| `fish_tako_shadow` (種案 §10) | アーキタイプ `sil_tentacle_shadow` (B-03) と重複。種専用 PNG が優先解決されるため片方は永久に描画されない |
| `fish_hirame_shadow` (種案 §10) | アーキタイプ `sil_flat_disc_shadow` (B-04) と重複。かつ「ひらめ/かれいの左右の違い」は単色ベタの影では原理的に表現できない |
| `fish_ryuuguunotsukai_shadow` (種案 §10) | アーキタイプ `sil_regal_longfin_shadow` (B-05) に統合・昇格済み |
| `fish_namazu_shadow` (種案 §10) | アーキタイプ `sil_barbel_heavy_shadow` (B-06) に統合。将来ひげのある種を足しても使い回せる |

また、次のものは**アート発注ではなく手続き生成**で実装されるため、本書に含まれていません:
`HorizonHaze` (水平線のヘイズ帯) / `SunGlowArt` (太陽グロー) / `BubbleRise` の粒。

---

## 12. 参照ファイル (絶対パス)

- 設計正本: `/Users/ndw_mac/AppDevelopment/pono-asobiba-app/docs/KAWAGLINT_EXPANSION_DESIGN_2026-07-25.md`
- 既存アート: `/Users/ndw_mac/AppDevelopment/pono-asobiba-app/unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/Content/Resources/KawaGlint/Sprites/`
- 既存アート (環境オブジェクト): 同上 `/Decor/`
- クロマキー除去スクリプト (**読むだけ。実行は後続タスク**):
  `/Users/ndw_mac/AppDevelopment/pono-asobiba-app/tmp/alpha_pending/1467-kawaglint-sea-depth-fishdex-art/process_kawaglint_art_1467.py`
- 前回バッチの納品物 (フォルダ構成の実例):
  `/Users/ndw_mac/AppDevelopment/pono-asobiba-app/tmp/alpha_pending/1467-kawaglint-sea-depth-fishdex-art/`
- スプライトカタログ (命名規則の正本):
  `/Users/ndw_mac/AppDevelopment/pono-asobiba-app/unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/Runtime/Rendering/KawaGlintSpriteCatalog.cs`
- プロジェクト規約: `/Users/ndw_mac/AppDevelopment/pono-asobiba-app/AGENTS.md` (§2.7 Hard Rule 7 / §5.1 / §5.1.0)
- 並走 claim ボード: `/Users/ndw_mac/AppDevelopment/pono-asobiba-app/AGENTS_CLAIMS.md` (batch:1470 のエントリ)
