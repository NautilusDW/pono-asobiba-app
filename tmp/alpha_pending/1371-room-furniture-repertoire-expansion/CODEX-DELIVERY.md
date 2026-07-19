# CODEX DELIVERY — room 家具レパートリー拡張 24点

- Batch ID: `batch:1371-room-furniture-repertoire-expansion`
- Delivery date: 2026-07-19
- Raw directory: `tmp/alpha_pending/1371-room-furniture-repertoire-expansion/raw/`
- Recommended candidates: 下表に記載した各IDの `*_raw.png` を採用候補とする。
- Status: raw asset sheets 納品済み。Photoshop後処理・runtime実装・staging統合は未実施。

## 生成・保存条件

- 生成は **built-in GPT Image 2 のみ**を使用した。別の画像生成モデル、SVG、Canvas、CSS、PIL、手書きベクターによる代用はない。
- 1回のAPI呼び出しにつき、1アイテム・1プロンプト・A/B横並び1 asset sheet を生成した。初回生成は24アイテムそれぞれ独立。クロスレビュー後の5点も、対象ごとに独立した1プロンプトで再生成した。
- 全API呼び出しに、指定された既存スタイル参照5枚をすべて添付した。
- 生成APIのPNG出力は内容を変換せず、採用rawへbyte-copyした。alpha化、crop、A/B split、resize、upscale、optimize、re-encode、背景除去は行っていない。
- 現物24ファイルはすべて **PNG / 8-bit RGB / alphaなし**。背景は白、中央に薄線または白余白、接地影は最小限。
- Raw count: **24**。全ファイルが3 MB未満（最大 `1316622` bytes）。
- 白背景の除去、透過化、A/B個別切り出しは、ユーザーがローカルのPhotoshopで手作業する予定。

## 既知の解像度制約

要求はシート全体で最低 `2048×1024` だったが、built-in GPT Image 2 が返した採用rawは全24点とも **`1774×887`** だった。

代表検証として `furn_sofa_beige` をnative `3840×1920`、絶対最低 `2048×1024` と強く指定して再生成したが、返却ファイルは同じ `1774×887` だった。そのため解像度目的の追加生成は停止した。要求寸法へ合わせるresize／upscaleは行っておらず、生成API rawをそのまま納品している。

## クロスレビュー

- 生成担当とは別のエージェントが全24点を相互クロスレビューした。
- 初回判定: **19 PASS / 5 REGENERATE**。
- 再生成して採用した5点:
  - `furn_sofa_pink`
  - `deco_cookie_jar`
  - `furn_garden_table_parasol`
  - `furn_wardrobe_pink`
  - `deco_birdhouse`
- 改善版の再クロスレビュー後: **全24点 visual PASS**。上記の解像度未達だけはvisual判定と分離した既知制約。

## 共通プロンプト要旨

- Use case: `stylized-concept`。3〜6歳向け「ポノのあそびば」の「わたしのおうち」room grid用家具／deco raw asset sheet。
- 参照画像の正面寄りアイソメ角度、カメラ高、光源方向、暖色茶の線画、線幅、パステルの彩度・明度、木目／生地表現、家具とdecoの縮尺感を踏襲。
- 左パネルAは参照と同じ向き、右パネルBはAのliteral horizontal mirror duplicate。形、色、柄、木目、装飾、陰影、輪郭、scale、余白を共通化し、差分は水平反転だけ。
- 背景は白 `#FFFFFF` を基本とし、中央に薄い境界線またはcropしやすい白余白。接地影はごく薄く、地面・部屋・背景物・余計な小物を置かない。
- 文字、ラベル、ロゴ、透かし、人物、キャラクター、UIを含めない。被写体を切らず、後のPhotoshop作業用rawとして白背景を維持。

### 添付したスタイル参照

1. `assets/images/Rooms/furnitures_final/furn_bed_wood_A.png`
2. `assets/images/Rooms/furnitures_final/furn_bed_pink_A.png`
3. `assets/images/Rooms/furnitures_final/furn_desk2_A.png`
4. `assets/images/Rooms/furnitures_final/furn_chest_pink_A.png`
5. `assets/images/Rooms/furnitures_final/tea_A.png`

## 採用raw一覧

寸法・byte size・SHA256・mode／alphaは、納品直前に下記現物から再計算した値。

| # | File | Item subject | Dimensions | Size (bytes) | Mode / alpha | SHA256 |
|---:|---|---|---:|---:|---|---|
| 1 | [`furn_sofa_beige_raw.png`](raw/furn_sofa_beige_raw.png) | ベージュの2〜3人掛けソファ、丸みのあるクッション、木脚 | 1774×887 | 1118288 | RGB 8-bit / none | `357ca36ca290fcc957fa8e545be0fa18f760326f3ab225ca82d6bdc5c796e6e7` |
| 2 | [`furn_sofa_pink_raw.png`](raw/furn_sofa_pink_raw.png) | ピンクの2人掛けソファ、独立した円形クッション2個、リボン1点 | 1774×887 | 1120879 | RGB 8-bit / none | `744ef33577abb9be84e12ea90c354b912489b906142cdb7bc062984d2270cb9b` |
| 3 | [`furn_sofa_blue_raw.png`](raw/furn_sofa_blue_raw.png) | 青い2〜3人掛けソファ、直線的でスポーティなboyテーマ | 1774×887 | 1020839 | RGB 8-bit / none | `e2cc8a8a0b508e91d7e8a299e7360cbf7f4f2612ade12d61ea1c2a9636f42499` |
| 4 | [`furn_tv_stand_raw.png`](raw/furn_tv_stand_raw.png) | 木製テレビ台、blankの小型テレビ、下段収納 | 1774×887 | 1019565 | RGB 8-bit / none | `1fbba18058f0d86e90118dd91c90f1b0002a14df64b13befa0007a38e120f41c` |
| 5 | [`furn_coffee_table_raw.png`](raw/furn_coffee_table_raw.png) | 丸みのある木製ローテーブル | 1774×887 | 871844 | RGB 8-bit / none | `c8624a37a454fe9c93b7d23e1f73a915fad5ff64c342075f7ef2c264ccb0c34e` |
| 6 | [`deco_floor_cushion_stripe_raw.png`](raw/deco_floor_cushion_stripe_raw.png) | パステルのボーダー柄、丸い小型座布団 | 1774×887 | 875663 | RGB 8-bit / none | `10280b167c9d1e3f314331051336fcdd6e44682d2a8a8dab96b0359cbe6af20f` |
| 7 | [`furn_kitchen_counter_raw.png`](raw/furn_kitchen_counter_raw.png) | 白いキッチンカウンター、シンクとコンロ一体 | 1774×887 | 1043209 | RGB 8-bit / none | `f50c31e9659b6ad5e9ef1afde172c6a18b7336dc42fcc400be4fa39a2119ab14` |
| 8 | [`furn_fridge_raw.png`](raw/furn_fridge_raw.png) | パステルミントの2ドア冷蔵庫 | 1774×887 | 905798 | RGB 8-bit / none | `0b0c2ef1b43af0df0367c164e8c5cb5559233a7ab7ba156b635637a94130f47a` |
| 9 | [`furn_dining_table_set_raw.png`](raw/furn_dining_table_set_raw.png) | 木の食卓と椅子2脚 | 1774×887 | 1047857 | RGB 8-bit / none | `f759efe3ea19bc124aa8c56ec91c9b511e82f32b9999c6995e1ce2d3df30eeee` |
| 10 | [`furn_kitchen_cabinet_raw.png`](raw/furn_kitchen_cabinet_raw.png) | ガラス扉から食器が見える木製食器棚 | 1774×887 | 1236562 | RGB 8-bit / none | `e4830bbb6ef07f0cf4883dda3a50928c795e26a0a67a0c304f120233901c22bc` |
| 11 | [`deco_fruit_basket_raw.png`](raw/deco_fruit_basket_raw.png) | りんごとバナナ入りの編みかご | 1774×887 | 969191 | RGB 8-bit / none | `e92260df246984d910dc1e56ece2fb202d3e66608b0e9fcdebc04adbb90c17b1` |
| 12 | [`deco_cookie_jar_raw.png`](raw/deco_cookie_jar_raw.png) | クッキー入り透明ガラス瓶 | 1774×887 | 1164151 | RGB 8-bit / none | `92e30bf45f6e22d48d5fac63feacc7338c7e0a134a5aab5fd73a3afccb397ea4` |
| 13 | [`furn_garden_bench_raw.png`](raw/furn_garden_bench_raw.png) | 木製の2人掛けガーデンベンチ | 1774×887 | 1316622 | RGB 8-bit / none | `a50b099198642b1c2363c1b6129f4d340614aef3d9a83020ba829abe981903eb` |
| 14 | [`furn_sandbox_raw.png`](raw/furn_sandbox_raw.png) | 木枠の砂場、小型スコップ付き | 1774×887 | 972581 | RGB 8-bit / none | `a93a3b400b718f44c5c6569f7d6790b0f3b07a9d911862e3635b2bbef8afd35c` |
| 15 | [`furn_garden_table_parasol_raw.png`](raw/furn_garden_table_parasol_raw.png) | パステルのパラソル付き丸いガーデンテーブル | 1774×887 | 1012960 | RGB 8-bit / none | `aa372d725c80afb9aa575a13be1626773c228265539694ae91e2f2821719f672` |
| 16 | [`deco_planter_flowers_raw.png`](raw/deco_planter_flowers_raw.png) | 花が咲いたプランター | 1774×887 | 1081555 | RGB 8-bit / none | `a00b4e9e6815ea0b3c5f92fa2fb7174dd303bc2bf200534e60fcbfbaad88aec4` |
| 17 | [`deco_watering_can_raw.png`](raw/deco_watering_can_raw.png) | パステルカラーのじょうろ | 1774×887 | 953176 | RGB 8-bit / none | `3bc16b93aefd3e078fa04d0ebcd91dd0ad1005edaeb643278afeac1184ca90d5` |
| 18 | [`deco_birdhouse_raw.png`](raw/deco_birdhouse_raw.png) | 屋根付き木製鳥の巣箱 | 1774×887 | 984991 | RGB 8-bit / none | `dbbc1bb7af88eb0b89642cb7e74873ce57d74f33a5b6e3f7866c467ba13473f6` |
| 19 | [`furn_wardrobe_wood_raw.png`](raw/furn_wardrobe_wood_raw.png) | 木製クローゼット、両開き扉 | 1774×887 | 1243351 | RGB 8-bit / none | `15b79d48ec222b2b12b53a78a314bd45f712bc97eb4fb0fdf9a12fc95bd11a14` |
| 20 | [`furn_wardrobe_pink_raw.png`](raw/furn_wardrobe_pink_raw.png) | ピンクのgirlテーマ両開きクローゼット | 1774×887 | 957881 | RGB 8-bit / none | `4e9570d8db1901cda62e143c24f5b0923c4df3810cc494ce977845b106c2662f` |
| 21 | [`furn_wardrobe_blue_raw.png`](raw/furn_wardrobe_blue_raw.png) | 青いboyテーマ両開きクローゼット | 1774×887 | 1018514 | RGB 8-bit / none | `a0d38261b4588f76b874df95d2f71fd678b100aef1b5bd442492d46d123fe591` |
| 22 | [`deco_christmas_tree_mini_raw.png`](raw/deco_christmas_tree_mini_raw.png) | オーナメント付き小型クリスマスツリー | 1774×887 | 974891 | RGB 8-bit / none | `5dd4c0256c7761cde57f6de140c6019f971009fec0616e4cbfcf899a152f0ada` |
| 23 | [`deco_tanabata_bamboo_raw.png`](raw/deco_tanabata_bamboo_raw.png) | 短冊を吊るした笹 | 1774×887 | 1085607 | RGB 8-bit / none | `ae5ef0c533482af807cd7441d39be2b725199e0d69ce91627dbfb105f7aabff8` |
| 24 | [`deco_pumpkin_lantern_raw.png`](raw/deco_pumpkin_lantern_raw.png) | ハロウィンのかぼちゃランタン | 1774×887 | 797183 | RGB 8-bit / none | `35922ed5922ee806a5b33b0627b926f15aa71598a68eeff12171cec7777f7b98` |

## 今後必要な工程（すべて未実施）

1. Photoshopで白背景をalpha化する。
2. 各sheetをA/Bの個別PNGへcropする。
3. 必要に応じて3 MB制限と表示品質を確認し、最適化する。
4. runtime用の `assets/` 配下へ配置する。
5. `room/items.js` などへcode hookupし、配置・pivot・縮尺を確認する。
6. 実装時に `sw.js` のcache versionを規約どおりbumpする。

現時点ではstagingへ統合しておらず、確認用プレビューURLはない。git add／commit／pushも未実施。
