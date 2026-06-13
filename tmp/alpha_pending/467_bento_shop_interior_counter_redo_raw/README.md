> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Bento Shop Interior Counter Redo Raw

2026-06-13 / batch:467-bento-shop-interior-counter-redo / by Codex

## 目的

ユーザー指摘:

- 店外ではなく、店内にいる構図にする。
- ポノ、男の子、女の子はカウンターの向こう側。
- 店内にお弁当が山積みで売られている。
- ショーケースがある。
- 全体に差し色がほしい。

## 生成方針

- GPT Image 2 built-in imagegen raw。
- 既存 `assets/images/bento/title_back.webp` と `466_bento_shop_picturebook_natural_redo_raw` の絵本水彩テイストを参照。
- パン屋/カフェ/チェーン店感、使い捨て透明プラ容器は避ける。
- ゲーム内に出るような丸/四角/くま/ねこ型のお弁当箱をショーケースと棚に多めに配置。
- 差し色は赤、青、水色、黄色、ピンク、緑のお弁当箱や布で入れる。

## 納品物

- `shop_interior_counter_bento_staff_variant01_raw.png`
- `shop_interior_counter_bento_staff_variant02_raw.png`
- `shop_interior_counter_bento_staff_variant03_raw.png`
- `review_contact_sheet.jpg`

## 推奨

現時点では `shop_interior_counter_bento_staff_variant03_raw.png` が最も実装向き。

- カウンターの向こう側にポノ/男の子/女の子がいる。
- 下半分にショーケースと山積みのお弁当が多く、ゲーム内容が伝わる。
- 差し色が一番はっきりしている。
- 右上〜中央上に吹き出しUI用の余白が残っている。

`variant02` もバランスは良いが、スタッフがやや正面寄りでアニメ感が少し強い。
