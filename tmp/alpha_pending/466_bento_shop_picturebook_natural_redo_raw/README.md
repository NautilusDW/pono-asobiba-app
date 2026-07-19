> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Bento Shop Picturebook Natural Redo Raw

2026-06-13 / batch:466-bento-shop-picturebook-natural-redo / by Codex

## 目的

前回の `464_bento_shop_request_scene_raw` は、店構えがパン屋/カフェ寄りで、人物もやや商業アニメ寄りだった。
今回の再生成では、既存 `assets/images/bento/title_back.webp` に近い水彩紙質・絵本感を優先し、現代的なチェーン店ではなくナチュラルな日本のお弁当屋さんに寄せた。

## 生成方針

- GPT Image 2 built-in imagegen raw。
- alpha抜き、切り抜き、実装配置は未実施。
- パン、菓子、コーヒー、使い捨て透明プラ容器は禁止寄り。
- 店頭にはゲーム内に出てくるような丸/四角/くま/ねこ型のお弁当箱を並べる。
- 男の子・女の子はアニメ風を避け、絵本寄りに指定。

## 納品物

- `shop_exterior_natural_bento_staff_variant01_raw.png`
- `shop_exterior_natural_bento_staff_variant02_raw.png`
- `shop_exterior_natural_bento_staff_variant03_raw.png`
- `review_contact_sheet.jpg`

## 推奨

現時点では `shop_exterior_natural_bento_staff_variant03_raw.png` が最も意図に近い。

- 店頭のお弁当箱がゲーム内の箱に近い。
- パン屋/カフェ感が比較的少ない。
- 既存タイトル背景に近い水彩紙質と余白がある。

ただし、男の子/女の子の顔はまだ少し大きめで、完全に昔ながらの絵本顔ではない。さらに詰める場合は、人物を小さくするか、子どもを正面顔ではなく少し横向き/遠景にするとアニメ感を落としやすい。
