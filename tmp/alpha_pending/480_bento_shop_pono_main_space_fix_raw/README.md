> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Pono Main Space Fix Raw

- Batch: `480_bento_shop_pono_main_space_fix_raw`
- 目的: user 指摘「ポノが主役なのに諦めるのは違う / 左側の空間が空きすぎ」を受けた追加案。
- 生成: GPT Image 2 built-in imagegen 1案 + 既存ポノ素材の合成3案。
- 後処理: alpha 抜き、切り抜きなし。既存 alpha 付きポノ素材の合成のみ実施。

## 方針

- 背景、後ろ棚の小さい弁当箱、ショーケース、右側の弁当箱は batch 479 の当たり背景を維持。
- ポノは生成だけに任せると顔・毛・体型が揺れるため、既存の正しいポノ素材を大きめに配置した案を本命にした。
- 左側の空白を埋め、ポノが店員チームの主役として見えるサイズへ拡大。

## ファイル

- `shop_interior_pono_main_space_imagegen_edit_raw.png`
  - GPT Image 2 の編集生成案。
  - 店内へのなじみは良いが、ポノの顔は生成寄り。
- `shop_interior_pono_main_space_exact_front_large_variant02.png`
  - 推奨案。
  - 既存 `assets/images/bento/ui/decor_pono_front.png` を大きめに合成。黄色い前掛け付きで店員感があり、ポノ本人感も安定。
- `shop_interior_pono_main_space_exact_peek_large_variant03.png`
  - 既存 `assets/images/bento/ui/decor_pono_peek.png` を大きめに合成。
  - ポノ本人感は強いが、店員感はやや弱い。
- `shop_interior_pono_main_space_exact_fullbody_behind_counter_variant04.png`
  - 既存 `assets/images/characters/pono/pono_001.png` をカウンター奥に立たせた案。
  - 参考案。全身ポノの毛並みは出るが、カウンター仕事の自然さは弱い。
- `review_contact_sheet.jpg`
  - 上記4案の確認用コンタクトシート。
