# icon_feedback_20260628.png — 仕様書 (GPT Image 2 で生成すること)

> このアイコンは **必ず GPT Image 2 で生成** してください。
> SVG / Canvas / CSS / PIL / Photoshop 自作などは **禁止** (system reminder ルール準拠)。
> 生成手段の候補: `fal-ai-media` skill (fal-ai/gpt-image-1) / OpenAI Image API / ChatGPT 直接。

---

## 1. 目的 (Purpose)

`play.html` の bottom-nav に **5 番目のボタン「ごかんそう」** (＝感想・フィードバック投稿) を追加するためのアイコン。

現状の bottom-nav は 4 ボタン (ヘルプ / おしらせ / シール / せってい) が 1 枚の木枠ストリップに baked されている (`title_bottom_nav_4_generated_20260626.webp`)。今回の `icon_feedback` は **将来 5 ボタン構成へ拡張する際の icon-only パーツ** として用意する (本体ストリップは別途差し替え予定)。

---

## 2. 出力仕様 (Output Spec)

| 項目 | 値 |
|---|---|
| ファイル名 | `icon_feedback_20260628.png` |
| 配置先 | `d:\AppDevelopment\pono-asobiba-app\assets\ui\icon_feedback_20260628.png` |
| サイズ | **64 × 64 px** (正方形・1:1) |
| 形式 | **PNG (RGBA)** — **背景完全透過 (alpha 0)** |
| カラー | 単色基調 (下記 "Style" 参照) |
| 余白 | アイコン本体は 64px 内側に 6-8px の余白を残す (端ベタ禁止) |
| 命名規約 | `icon_<feature>_<YYYYMMDD>.png` (今回は `_20260628`) |

> 生成 AI は 1024×1024 等の大サイズで出すことが多いので、 **生成後に 64×64 へ Lanczos 縮小** して保存すること。
> 透過背景が出ない場合は、 cream/wood 背景を後処理で alpha 抜き → 透明化。

---

## 3. デザイン仕様 (Style)

### モチーフ
- **紙 (notepaper)** + **鉛筆 (pencil)** の組み合わせ
- 紙: 1枚のメモ紙 (四角・角丸)、 ほんのり傾いた配置 (約 5-10度の回転)
- 鉛筆: 紙の上に**斜めに乗っている** (左下から右上に向かう構図が定番)
- 鉛筆は短めの「ちびえんぴつ」 風 (子供向け、 太め、 親しみのある寸胴シルエット)
- 紙には罫線や文字は描かない (シンプルな白紙 or ほんのりクリーム色)
- もし装飾を入れるなら、 紙の角に小さな折れ目 (dog-ear) を 1 箇所だけ

### カラー / マテリアル (既存アイコンと揃える)
- **基調色は warm wood (ハチミツ色 #C99A5C 〜 #B07A3D 系)**
- ベル (`button_bottom_005.png`) / 鍵 (`title_book_unlock_icon_generated_v3_20260626.webp`) と同じ **木彫り風 / 飴色エナメル** トーン
- 単色ベタ塗りではなく、 **柔らかい陰影 (soft shading)** とハイライトを少量入れる
- 線は **太め (約 4-6px @ 1024 換算)**、 端は丸い (round cap)
- 縁取り (outline) は本体より 1 段濃い焦げ茶 #6B4423

### 質感
- ハチミツの飴色 / 木目調 / pastel 寄り (毒々しさ NG)
- ベル icon と同等の "あたたかい木のおもちゃ" 感
- グロー / 過剰光沢 / メタリック禁止

---

## 4. 既存アイコン参考 (Visual Reference)

GPT Image 2 への入力に **以下を必ず添付** (またはスタイル参照として明示):

| 役割 | 実物パス | サイズ | 用途 |
|---|---|---|---|
| **最重要 / 単体アイコン基準** | `assets/ui/button_bottom_005.png` | 320×321 | ベル単体。 木枠+クリーム座布団のスタイル基準 (背景透過の場合はベル部分のみ抽出) |
| 4 ボタンストリップ (現行) | `assets/ui/title/title_bottom_nav_4_generated_20260626.webp` | 1831×579 (= 4 タイル) | ヘルプ ? / おしらせ 鈴 / シール 手帳 / せってい 歯車。 アイコンの線の太さ・色味の基準 |
| アンロック鍵アイコン | `assets/ui/title/title_book_unlock_icon_generated_v3_20260626.webp` | — | 同シリーズ単体アイコンの線太さ・陰影レベルの基準 |

**色味の数字基準** (現行アイコンを Read tool で目視確認した結果):
- 本体ハチミツ色: `#D9A55C` 〜 `#C28A47`
- 縁取り: `#6B4423` 〜 `#4F2E14`
- ハイライト: `#F2D8A8`
- 影: 透過の場合は drop-shadow 不要 (受け側の cushion 側で投影)

---

## 5. 推奨プロンプト (GPT Image 2 用、 日本語可)

### Prompt A (推奨・1 発生成用)

```
かわいい子供向け知育アプリ用のアイコンを 1 つ作って。

モチーフ: 「四角い 1 枚の紙 (角丸メモ用紙)」 の上に 「ちびえんぴつ (太めで短い
子供向け鉛筆)」 が **斜めに乗っている** デザイン。 紙はほんのり傾いて配置 (約 5-10度)、
鉛筆は左下から右上に向かう構図。 紙には罫線や文字は描かない (シンプルな白紙)、
紙の右上の角だけ小さく折れ目 (dog-ear) を入れてもよい。

スタイル: ハチミツ色の木彫りおもちゃ風。 紙のベース色は生クリーム色 (#FAF1DC 〜
#F2D8A8)、 鉛筆のボディはハチミツ色 (#D9A55C 〜 #C28A47)、 縁取りは焦げ茶
(#6B4423)、 鉛筆の芯先は濃いグレー (#3A2F2A)。 線は太めで丸い (round cap)、
ふんわりした陰影を少しだけ。 グロスや金属光沢、 ネオン、 過度なグラデーションは禁止。
ジブリ風のあたたかい絵本タッチ。

構図: アイコン中心、 正方形 1:1、 周囲に均等な余白 (6-8px)、 **背景は完全透過
(transparent PNG, alpha channel)**。 影は落とさない (drop shadow なし)。
高解像度 1024x1024 で出力 (後で 64x64 に縮小)。

参考: 同シリーズの 「鈴」 「歯車」 「手帳」 アイコンと同じテイスト
(同じ作者が彫った木のおもちゃ感)。
```

### Prompt B (英語短文・LLM がうるさい時用)

```
A single icon: a small square notepaper (rounded corners, slightly tilted ~5-10
degrees) with a short chubby pencil resting diagonally on top (going from
bottom-left to upper-right). The paper is blank cream/off-white (#FAF1DC ~
#F2D8A8) with optional tiny dog-ear on top-right corner. The pencil body is
warm honey wood (#D9A55C base, #6B4423 outline) with a dark graphite tip
(#3A2F2A). Wooden toy aesthetic, soft shading, thick rounded strokes, no
gloss/metal/neon. Children's storybook tone, Ghibli warmth. 1:1 square,
even padding, fully transparent background (PNG with alpha, no drop shadow).
1024x1024 high resolution. Same series as existing wooden bell / gear /
notebook icons.
```

### Negative / 避けたい要素 (必ず指示に含める)

- 文字や数字、 罫線を紙に描かない (シンプルな白紙 + 鉛筆のみ)
- 写実的・3D レンダリング・メタリック調 禁止
- ネオン光・グロウ・レンズフレア 禁止
- 背景に色や模様 (透過必須)
- drop shadow / 落ち影 を画像内に焼かない
- 怖い顔・歯・血のイメージ 禁止 (子供向け)

---

## 6. 生成後のチェックリスト

- [ ] 64×64 PNG に縮小済み (Lanczos)
- [ ] 背景が完全透過 (`alpha = 0`) — Photoshop / GIMP / `PIL.Image.getextrema()` で確認
- [ ] 上下左右に 6-8px の安全余白
- [ ] 既存 `button_bottom_005.png` と並べて違和感がない (同じ作家の彫った木のおもちゃに見える)
- [ ] 配置先 `assets/ui/icon_feedback_20260628.png` に保存
- [ ] (任意) `.webp` も生成して `assets/ui/icon_feedback_20260628.webp` に並置 (sw.js キャッシュ追加時に lossless webp 推奨)

---

## 7. 命名規約 (Naming Convention)

`icon_<feature>_<YYYYMMDD>.<ext>` (日付サフィックス必須 — sw.js キャッシュバスター兼用)

例:
- `icon_feedback_20260628.png` (今回)
- 将来差し替え時: `icon_feedback_20260815.png` 等 (旧版は削除 or `_legacy` リネーム)

---

## 8. 実装 (アイコン到着後のフォローアップ・参考メモ)

このアイコン単体では UI には組み込まれない。 到着後、 別タスクで以下を実装:

1. play.html bottom-nav を 4 タイル baked strip から **5 タイル構成** へ拡張
   (現行: `title_bottom_nav_4_generated_20260626.webp` を 5 ボタン版に差し替え or オーバーレイ合成)
2. ラベル「ごかんそう」 を icon 下に配置
3. タップ → フィードバック投稿モーダルを開く
4. `sw.js` の `CACHE_VERSION` バンプ (deployment-patterns ルール)

→ これらは本仕様書のスコープ外。 アイコン PNG が揃ったら別チケットで実装する。
