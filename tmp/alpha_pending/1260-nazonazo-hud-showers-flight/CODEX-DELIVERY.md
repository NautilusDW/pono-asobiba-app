> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ このファイルは UTF-8 (BOM なし) / LF で保存しています。

# なぞなぞトレイン ジャングル飛行素材

- バッチ: `1260-nazonazo-hud-showers-flight`
- 生成モデル: GPT Image 2
- 用途: ジャングル遠景を横切る鳥1羽と、空を不規則に飛ぶチョウ1匹の3コマアニメーション
- 主操作との関係: 非操作の背景演出。空中で静止させず、動きを減らす設定では非表示

## 納品ファイル

- `assets/images/nazonazo-tunnel/jungle_flying_toucan_3frame_20260712.webp` — 768×192、256×192を3コマ
- `assets/images/nazonazo-tunnel/jungle_flying_butterfly_3frame_20260712.webp` — 576×192、192×192を3コマ
- `raw/jungle_flying_toucan_3frame_raw.png` — GPT Image 2 生出力
- `raw/jungle_flying_butterfly_3frame_raw.png` — GPT Image 2 生出力
- `processed/` — 配置用WebPと同内容の透過処理済みsheet
- `process-sheets.cjs` — クロマキー除去、胴体位置合わせ、3コマ再梱包の処理記録

## 生成ブリーフ要点

鳥は既存の枝上オオハシとジャングル背景を参照し、同じ1羽が左向きで「羽を上げる・水平に広げる・下げる」の3姿勢になるよう生成した。白目は作らず、暗い目に小さなハイライトのみ許可した。枝、葉、果実、地面、追加の鳥は含めていない。

チョウは既存の青いチョウとジャングル背景を参照し、同じ青〜ターコイズ〜淡い紫の1匹が「羽を上げる・開く・下げる」の3姿勢になるよう生成した。花、枝、葉、追加のチョウは含めていない。

両素材とも一様なマゼンタ背景で生成し、透過抽出後に各セルの目または胴体を共通位置へそろえた。再生順は `0 → 1 → 2 → 1`。背景色へ合成して縁色と欠けが目立たないことを確認済み。
