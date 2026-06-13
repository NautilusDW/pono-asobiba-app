> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop 8 Medium Boxes Pono Neck Fix Raw

- Batch: `478_bento_shop_8_medium_boxes_pono_neck_fix_raw`
- 目的: user 指摘「8個でよかった / 477 は弁当箱が大きすぎる / ポノの首周りに輪郭線とシャドウが入っている」を反映した raw 修正版。
- 生成: GPT Image 2 built-in imagegen
- 後処理: alpha 抜き、切り抜き、最適化なし。生成結果を raw のまま保存。

## 修正内容

- ショーケース内を8個に戻し、2段×4個の構成にした。
- `477` の6個案より、ショーケース内の弁当箱を中サイズ寄りに下げた。
- 右側の平積み棚は極端なミニチュアにならないよう、ショーケース内と近い縮尺を維持。
- ポノの黄色い服は下だけのパンツ風ではなく、胸当てと肩ひも付きの前掛け / エプロンとして見える方向を維持。
- ポノの首元は、濃い影や輪郭線を弱める方向で再指定。

## ファイル

- `shop_interior_8_medium_boxes_pono_neck_fix_variant01_raw.png`
  - 8個に戻した案。
  - ポノの服に白い服っぽさが残り、カウンターもやや長めに見える。
- `shop_interior_8_medium_boxes_pono_neck_fix_variant02_raw.png`
  - 推奨案。
  - 8個構成、弁当箱は中サイズ寄り、右棚の縮尺も極端に小さくない。
- `review_contact_sheet.jpg`
  - 2案の確認用コンタクトシート。
