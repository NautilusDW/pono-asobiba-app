> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Bento Shop Request Scene Raw Assets

2026-06-13 / batch:464-bento-shop-request-scene-raw / by Codex

## 方針

- ゲーム方向性: ポノと男の子・女の子がお弁当屋さんをしていて、動物のお客さんの注文に合わせてお弁当を作る。
- 画像生成: GPT Image 2 built-in imagegen raw。
- 後処理: alpha抜き、切り抜き、最終配置は未実施。白背景の動物シートはPhotoshop等で手作業処理する前提。
- 文字: 生成文字崩れを避けるため、看板やメニューは空白/読めない装飾にした。

## 背景

- `shop_exterior_staff_keyvisual_raw.png`
  - お弁当屋さん外観のキービジュアル。
  - 店員として、エプロン姿のポノ、普通の男の子、普通の女の子を配置。
  - 最初の世界観説明、タイトル差し替え候補、導入画面向け。

- `shop_request_counter_background_raw.png`
  - 注文シーン用の店内背景。
  - 店員側から見た視点で、中央に動物のお客さん、上中央に吹き出しを重ねる前提。
  - 動物・ポノ・子ども・吹き出しは入れていない。

## 動物シート

各ファイルは白背景、3行x3列。

- 1行目: 通常/注文待ち
- 2行目: ニコニコ/喜び。右列は大げさな成功演出向け。
- 3行目: ちょっとがっかり/惜しい/残念

対象:

- `npc_risu_3emotion_3variants_white_raw.png`
- `npc_inu_3emotion_3variants_white_raw.png`
- `npc_ahiru_3emotion_3variants_white_raw.png`
- `npc_shika_3emotion_3variants_white_raw.png`
- `npc_lesser_panda_3emotion_3variants_white_raw.png`
- `npc_neko_3emotion_3variants_white_raw.png`

## レビュー用

- `review_contact_sheet.jpg`
  - 生成物全体の目視確認用。実装素材ではなくレビュー補助。
