# 1436 こども恐竜救助背景 — raw 納品

GPT Image 2 の built-in image generation を使用した raw API 応答です。raw PNG は生成後に画素変更・クロップ・アルファ処理・最適化を行っていません。

## Selected raw pair

| State | Raw file | Size | SHA-256 |
| --- | --- | ---: | --- |
| 救助前 | `dino_rescue_children_before_raw_gpt-image-2.png` | 3,006,805 bytes | `c33661f6e9ea90e792d30b31f93b797c30276af06f5c23ef3184ba9fc790f8dc` |
| 救助後 | `dino_rescue_children_after_raw_gpt-image-2.png` | 2,936,969 bytes | `c35adeae97e7016eb2ae464f552b75012bd6607d6cccc79e29db6e987b9e0f79` |

どちらも 1536×1024 RGB PNG です。実装には別フォルダの lossless WebP promotion を使用します。

## Scene contract

- 成体・親恐竜は 0 頭。子どものパラサウロロフスは正確に 3 頭。
- 救助前は同じ大きさの3頭が左側のすみか入口内にいて、顔と上半身が見える。入口外に恐竜はいない。
- 救助後は救助前と同じ色・模様・とさかの3頭が全員入口外へ出て、入口内は空になる。
- カメラ、1536×1024 canvas、光、森、入口位置、右側の広い余白は前後で固定する。
- 右側は列車・クレーン・3区画platform用に空ける。恐竜は列車開始位置 x≈26.5% を越えない。
- 障害物は背景へ焼き込まず、既存の枝束・倒木・岩 overlay が入口前を塞ぐ。
- 成体、親、餌、かご、卵、足跡、線路、列車、クレーン、UI、文字、水、池、ティラノサウルスを含めない。

親が不在の理由は画像へ描き込まず、子ども向けUIで「おとなは えさを とりに いって まだ かえってないよ」と説明します。

## Prompt set

### Rescue before

現行の太古の森・すみか・光・カメラ・右余白を維持する精密編集として、既存の成体と子どもを削除し、同じ種類・同じ年齢感・近い大きさの子どものパラサウロロフス3頭だけを入口内へ配置しました。3頭の顔と上半身が横画面でも読め、成体に見える大個体を作らないこと、右側へ恐竜やゲーム物を追加しないことを固定条件にしました。

### Rescue after

救助前 raw を edit target とし、変更対象を「同じ3頭を入口内から入口外の左側へ移動し、入口を空にする」ことだけに限定しました。種類・色・模様・とさか、カメラ、背景、入口、光、右側の余白、成体0頭を不変条件として再指定しました。

## Follow-up

- 実装用候補: `../1436-nazonazo-dino-water-guidance-promotion/`
- promotion は raw の RGB 画素を保持した lossless WebP。
- raw↔WebP の RGB framemd5 一致を確認済み。
- canonical:
  - `assets/images/nazonazo-tunnel/branch_dino_adventure_rescue_children_before_20260723.webp`
  - `assets/images/nazonazo-tunnel/branch_dino_adventure_rescue_children_success_20260723.webp`
- 旧 batch 1435 の親子背景は履歴証跡として保持し、本 batch の子ども3頭背景で置き換えます。
