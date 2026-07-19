# CODEX DELIVERY — room家具24点・角度補正

- Batch: 1371c-room-furniture-angle-correction
- 元Batch: 1371-room-furniture-repertoire-expansion
- 状態: local PASS / commit前 / push・staging反映前
- 最終QA正本: qa-final-assets.json
- 最終QA SHA256: cd2eb7d496d18d7a24b8ea3b8b50544dd617da0abbade862e75d70b2a76ef91b

## 目的と納品範囲

初回実装24点のアイソメトリック角度が既存room家具と揃っていないという指摘を受け、既存の24 ID、A/Bパス、theme、grid、配置範囲、angleB、pivotを変えずに画像内容だけを作り直した。GPT Image 2 built-inで角度を補正したraw候補を生成し、採用raw 14枚からcanonical source 24点（23点はA、ベンチだけB）を選定してfinal Aへ正規化した。その後、alpha化、crop、16px透明余白の付与を行い、runtime用A/B 48 PNGを assets/images/Rooms/furnitures_final/ に実装した。BはAの厳密な水平反転として作成した。

room/items.jsの対象24定義は変更していない。pivotX/pivotYとA/B個別pivotは全点0のまま維持しており、今後ユーザーがピボット調整ツールで調整できる。

## 生成モデルと参照画像

rawの生成・生成的編集はGPT Image 2 built-inのみを使用し、他の画像生成モデルは使用していない。alpha化、crop、透明余白、水平反転は build_final_assets.mjs による決定的な画像処理である。

必須スタイル参照は次の5点。

- assets/images/Rooms/furnitures_final/furn_bed_wood_A.png
- assets/images/Rooms/furnitures_final/furn_bed_pink_A.png
- assets/images/Rooms/furnitures_final/furn_desk2_A.png
- assets/images/Rooms/furnitures_final/furn_chest_pink_A.png
- assets/images/Rooms/furnitures_final/tea_A.png

補正後半の生成callでは、上記5画像を画素内容を描き直さずタイル化し、Room_Base_grid_squareを加えた3×2の refs/required5_grid_board_G.png（4800×1260）をInput 2として添付した。これは必須5参照の置換ではなく、同じ参照を常時見せながらroom gridの±30°/90°軸を明示するための補助である。初期callの個別添付形式は永続QAには記録されていないため、本書では「全callが同じ添付形式だった」とは断定しない。

free generationでは対応辺が±25/26°、±34/35°へ流れたり、奥行辺が2〜4°へ収束したりした。このため furn_chest_pink_A の採用品形状を角度の主アンカー／edit scaffoldとして再強調し、grid補助と併用した。難しいベンチ補正では、採用ソファと食卓椅子のfocused cropも補助参照にした。これらは画風・彩度・線画・縮尺の正本である必須5点を置き換えるものではない。

## built-in出力寸法の既知制約

採用raw 14枚はすべて8-bit RGB PNGでalpha channelを持たない。そのうち12枚は1254×1254、2枚（set02b_floor_cushion_raw.png、set07_sandbox_v2_raw.png）は1774×887で出力された。1254正方形のうち11枚は主に627×627のquadrantを使い、ベンチJ2だけは1254×1254 full frameを使う。1774×887の2枚は左887×887をcanonical sourceとして使う。

補正passは採用raw 14枚で24点をcoverしており、元依頼の「1 item = 1 sheet」とも異なる。生成されたA/B両panelをそのまま使わず、各点で選定したcanonical panelから片側を作り、もう片側をpixel-exact flipした。これはA/B間の角度・ライティング・材質差をなくすための補正実装である。

また、依頼時の「sheet全体2048×1024以上、1 panelあたり1024×1024相当」という元解像度条件は満たしていない。通常のquadrantは627×627、single-rowは887×887であり、2048相当と表現してはならない。GPT Image 2 built-inが今回上記寸法で返したrawを加工拡大せず保存し、runtime finalは内容bboxに16px透明余白を加えた実寸である。

## 採用raw 14枚

| filename | dimensions | bytes | SHA256 |
| --- | ---: | ---: | --- |
| set01_sofa_beige_pink_v3_chest_raw.png | 1254×1254 | 1320989 | f1f4aeeb0433b933f6ac011dadf49544e6b4fc043424727584422613d12becc3 |
| set02_sofa_blue_floor_cushion_raw.png | 1254×1254 | 1050228 | 6ac7cf40ab88f0cc3dbfb673d455ace13a0ddfdcd3bbd88f66f55fb519166d2f |
| set02b_floor_cushion_raw.png | 1774×887 | 1018726 | ed56c3de524cfa8b0890ab73c92a91a58adb216129f4620072b633895aaf4457 |
| set03_tv_counter_v2_chest_raw.png | 1254×1254 | 1327503 | fc7b9154a6696031ce564c1ce6042ffad9b04c56a62ca6bdc941caaa4c6d316d |
| set04_coffee_dining_raw.png | 1254×1254 | 1325122 | bc62d3cea2af571a12ba4d8988324a445c7ac3434ec8a31c2e85db5923021b4d |
| set05_fridge_kitchen_cabinet_raw.png | 1254×1254 | 1222552 | fc00c64bc04e543af31b1992b6ff9504c096ea2b864b5ea4d2d02ac0bbfb4c5d |
| set06_fruit_cookie_raw.png | 1254×1254 | 1327812 | 26e7635ad799a63fa869a599e14bc46704a2302f5adbc5028941c40f8e99086f |
| set07_bench_A_chairedit_J2_raw.png | 1254×1254 | 1050101 | 026352a4abad7cc40afc866b89d1f0515825816917a018aff87c244fdede80b0 |
| set07_sandbox_v2_raw.png | 1774×887 | 1107462 | 12a639515403daae2e9fd1ad8df7216406273dc529b57b727e5af451d50cce4d |
| set08_garden_table_planter_raw.png | 1254×1254 | 1371857 | 8c78f3c192485be39e4ad49ee7aef153a0424c5391eea4396c6bbb9cdb399c71 |
| set09_watering_birdhouse_v2_raw.png | 1254×1254 | 1026734 | 1dc42d0e8ee99b6e2c65032e40d0dda62fc124bb6f51b0c7a7a52c667c8a43aa |
| set10_wardrobe_wood_pink_raw.png | 1254×1254 | 1342614 | 0b0990a10a1f8805ad87c8a7d038bb7432114eb89ad0afc05ea33e0094a70420 |
| set11_wardrobe_blue_tanabata_v3_raw.png | 1254×1254 | 1162330 | 19fc7c835204eb41d8be9a4aa3bccf4bf5b5ab5ed18059f1d55d12a5a69ffdbb |
| set12_christmas_pumpkin_raw.png | 1254×1254 | 944573 | ac2a857900df788dab92b8ac0ecca03e2cc4d031de6e03c079ec1b1a9c54ac88 |

raw格納先: tmp/alpha_pending/1371c-room-furniture-angle-correction/raw/

## 24 ID source panel / orientation map

Rectはraw上の x,y,width,height。source orientationがBのベンチは、rawのcanonical Bを水平反転してfinal Aを作り、そのAからfinal Bを厳密反転している。

| id | adopted raw | panel | source orientation | rect |
| --- | --- | --- | --- | --- |
| furn_sofa_beige | set01_sofa_beige_pink_v3_chest_raw.png | TL | A | 0,0,627,627 |
| furn_sofa_pink | set01_sofa_beige_pink_v3_chest_raw.png | BL | A | 0,627,627,627 |
| furn_sofa_blue | set02_sofa_blue_floor_cushion_raw.png | TL | A | 0,0,627,627 |
| furn_tv_stand | set03_tv_counter_v2_chest_raw.png | TL | A | 0,0,627,627 |
| furn_coffee_table | set04_coffee_dining_raw.png | TL | A | 0,0,627,627 |
| deco_floor_cushion_stripe | set02b_floor_cushion_raw.png | LEFT_887 | A | 0,0,887,887 |
| furn_kitchen_counter | set03_tv_counter_v2_chest_raw.png | BL | A | 0,627,627,627 |
| furn_fridge | set05_fridge_kitchen_cabinet_raw.png | TL | A | 0,0,627,627 |
| furn_dining_table_set | set04_coffee_dining_raw.png | BL | A | 0,590,627,664 |
| furn_kitchen_cabinet | set05_fridge_kitchen_cabinet_raw.png | BL | A | 0,627,627,627 |
| deco_fruit_basket | set06_fruit_cookie_raw.png | TL | A | 0,0,627,627 |
| deco_cookie_jar | set06_fruit_cookie_raw.png | BL | A | 0,627,627,627 |
| furn_garden_bench | set07_bench_A_chairedit_J2_raw.png | FULL | B | 0,0,1254,1254 |
| furn_sandbox | set07_sandbox_v2_raw.png | LEFT_887 | A | 0,0,887,887 |
| furn_garden_table_parasol | set08_garden_table_planter_raw.png | TL | A | 0,0,627,680 |
| deco_planter_flowers | set08_garden_table_planter_raw.png | BL | A | 0,627,627,627 |
| deco_watering_can | set09_watering_birdhouse_v2_raw.png | TL | A | 0,0,627,627 |
| deco_birdhouse | set09_watering_birdhouse_v2_raw.png | BL | A | 0,627,627,627 |
| furn_wardrobe_wood | set10_wardrobe_wood_pink_raw.png | TL | A | 0,0,627,627 |
| furn_wardrobe_pink | set10_wardrobe_wood_pink_raw.png | BL | A | 0,627,627,627 |
| furn_wardrobe_blue | set11_wardrobe_blue_tanabata_v3_raw.png | TR | A | 627,0,627,627 |
| deco_tanabata_bamboo | set11_wardrobe_blue_tanabata_v3_raw.png | BL | A | 0,627,627,627 |
| deco_christmas_tree_mini | set12_christmas_pumpkin_raw.png | TL | A | 0,0,627,627 |
| deco_pumpkin_lantern | set12_christmas_pumpkin_raw.png | BL | A | 0,627,627,627 |

## final runtime PNG 48枚

全48枚は8-bit RGBA PNG。寸法、bytes、SHA256は最終 qa-final-assets.json と実ファイルの再計測が一致している。

| filename | dimensions | bytes | SHA256 |
| --- | ---: | ---: | --- |
| furn_sofa_beige_A.png | 538×511 | 268316 | 157a1cea4ca8896780afbd9ef8401da30ae52bc58207bd212e73e6586a50818c |
| furn_sofa_beige_B.png | 538×511 | 268649 | 27c0f4bdd845bcf6b36b6eae59cb3ad9d0ce49b70b5fdf81fb5234d80f1087df |
| furn_sofa_pink_A.png | 537×521 | 257978 | 8c6f31282fbcbf1b59acdd98d8362772d612f99721d96f4b6c990ba3bebe098c |
| furn_sofa_pink_B.png | 537×521 | 259338 | d135f17603920eb26154c6ee8cef77452cd7699575ba103e56440676197aa0ac |
| furn_sofa_blue_A.png | 572×517 | 221783 | 32b520ab73041ae5be5951e8730f3656b74875c06c39fc761136a8f8371278f9 |
| furn_sofa_blue_B.png | 572×517 | 226313 | bc068ff2f89e243564efa4b7441c5d4601ef38ecd4c23274c7f0b9a5f0ae3263 |
| furn_tv_stand_A.png | 474×604 | 274348 | 7e91164eabe7df11869b8997b3571f6097009b171d539fc69c03077246851a66 |
| furn_tv_stand_B.png | 474×604 | 278926 | 66cdb033f59a06f7c8ea2201a4c11437ed3a28172f72679a898586eb7af16a3c |
| furn_coffee_table_A.png | 552×433 | 239253 | 9f940f6aabd3cd839c155ab23dcf6da0ed17b7cb6a633076a3a76898d1b5928f |
| furn_coffee_table_B.png | 552×433 | 237055 | 0827ba3a5cae0128af67a96bae0c156e832c446df9081838f4f05e89eebd4f63 |
| deco_floor_cushion_stripe_A.png | 756×455 | 323730 | 2ecf7c539b0c2ea0ca5bac084c08f68ab71905ea2b067a66d34b2082c0d8ba7e |
| deco_floor_cushion_stripe_B.png | 756×455 | 319740 | 95dc812bb9c3bc5b14303d404aa8d84fd1328287fb62d9ecbe250b4475b7e81d |
| furn_kitchen_counter_A.png | 484×500 | 234797 | fa220b8fea900c0c222586da6255ad80652e2cd08b377aec277cd5b90ca9fdc4 |
| furn_kitchen_counter_B.png | 484×500 | 237728 | dae99323a27d447b847b6de2b3cf9312ee7b6d7280463d92ce5807c82990a2d1 |
| furn_fridge_A.png | 377×606 | 158668 | 84a4e515d8c1d66911cf99992fd30bfdcbbb230a570975a66e7fa28d7b3c2509 |
| furn_fridge_B.png | 377×606 | 161770 | 89cba59f29ecf1df81919b40f63dfd0b2f6535a7a896e96d8878f4547f87b575 |
| furn_dining_table_set_A.png | 537×555 | 343166 | 73c4c0708f5268219af1bd35fcaaa4715e4b455ecd58df1688c78721f6424d8b |
| furn_dining_table_set_B.png | 537×555 | 338292 | a8169f630552ea95e141fad1b41945e13c25d2f4b6f9c4eb7e74546f474f9a23 |
| furn_kitchen_cabinet_A.png | 405×633 | 308647 | 0ea39ffaeb97beb67a745ed667e78a6b93f3e840f6f39a3c070f8f689054cb09 |
| furn_kitchen_cabinet_B.png | 405×633 | 316210 | 178d99f897d23f9b88cf5630a77c258200539fc68f1dac96ef8772b61abd778a |
| deco_fruit_basket_A.png | 513×475 | 291352 | bc82f5dd6d5a21982f44f669c5a728b25f49fa1b7d3f6111f41d913931580949 |
| deco_fruit_basket_B.png | 513×475 | 290593 | 06c2ca61fab03db47b7b07f9b57c77c922b5a5d99f2c4563c67170569758e664 |
| deco_cookie_jar_A.png | 393×506 | 239831 | 03425b9ad7e1543509a55f78adb982a0b4b1f5126ba440155aa262bb8899dd08 |
| deco_cookie_jar_B.png | 393×506 | 240048 | a9ed29ee9ce0e8a58a43510ad0d2d066938f868622ac1f442bf10ebf43bcc9e4 |
| furn_garden_bench_A.png | 990×1136 | 684357 | fac4ac3501ea9fcbba025f6c98afe3149126c1c57b25e09ac9823bf8f7334c83 |
| furn_garden_bench_B.png | 990×1136 | 696513 | c6bbaff72790e5d84b414ee42a60d27e349e859d650935e281703e2bf39873b0 |
| furn_sandbox_A.png | 797×569 | 403875 | 5e4d6aa54ee0e19ed8c8dd23cb1d51550d31dba2de2b63135a1cc76cf16b73e2 |
| furn_sandbox_B.png | 797×569 | 403846 | 91e8d3f1c016497941d3c5ad3f159f8614cad5347a42da4a5717e46682d384eb |
| furn_garden_table_parasol_A.png | 451×624 | 266295 | d28c3a26b6a0dc51867f1a2bf36305e0b1c231e33182326c373f19db62e71121 |
| furn_garden_table_parasol_B.png | 451×624 | 265522 | 54963a365ef75bb0727924646a97a60458faf57662e7be18198a77ba9db55a67 |
| deco_planter_flowers_A.png | 486×501 | 300534 | 8c3675e0bb247b51ecfa3edbbdb71fb1412816475230125594ae3e8f743357f1 |
| deco_planter_flowers_B.png | 486×501 | 296795 | 2134be20bf23c5f68e62f02bf2cd87abee2f23f51d8e24e206fc870519921326 |
| deco_watering_can_A.png | 486×375 | 132123 | 47193887fd65b15e78ea93b0ae459eea15040877f1d6e5780f3a99185027c832 |
| deco_watering_can_B.png | 486×375 | 131950 | b44fe69ac346eb5987d50383cbcf26263ed09ce27cbc35f868c41028718d4f9f |
| deco_birdhouse_A.png | 431×507 | 185688 | 0b308d4657b5730c861974d7de1f8f7b6ece97c5069a7e62566d90fa33104596 |
| deco_birdhouse_B.png | 431×507 | 185980 | d5b7c143da7138f187a9969c11a3d2893ed0a6289852ac9bbbc9bd3a641fcff1 |
| furn_wardrobe_wood_A.png | 425×596 | 275745 | bfaa7847246b010907b0e4bd578ebb1ef7cac7ce64166d7b2ddd76a80b3a7088 |
| furn_wardrobe_wood_B.png | 425×596 | 277686 | 19d0887235b639d8e3974a9f937a12508b23ae83936867fb8a9d15e96a49d8f3 |
| furn_wardrobe_pink_A.png | 421×610 | 219839 | 2b787fae6067e707dff8b71a08edfd87174698f0bb6c1fa01b91f48e0a550b89 |
| furn_wardrobe_pink_B.png | 421×610 | 223681 | aec74841095d9b0c43eaf301491a1d599e8b48773faa4213d2f383b6f155feaa |
| furn_wardrobe_blue_A.png | 436×623 | 221034 | ed43558ccc50dee3e81afb76582f317f37ffcd6f042dad742c33fff9d266787e |
| furn_wardrobe_blue_B.png | 436×623 | 224613 | 4894ce87ff06c7381f1dce8c93669e20b187e799ec69823780dd7753791d6d0a |
| deco_tanabata_bamboo_A.png | 462×566 | 170745 | 97fcee714f39321c4f84fd19e515bc7363a302e78a931d9618241477f9162409 |
| deco_tanabata_bamboo_B.png | 462×566 | 172161 | d6b8a8110270e072f6f8fb84fcc21ab2b72d5fa62efe0dcf86b4f72cafd70251 |
| deco_christmas_tree_mini_A.png | 350×514 | 158301 | 1769a618e4d9a32f038bba88a39e6f790bd8eaf015d86c737262708ddd336088 |
| deco_christmas_tree_mini_B.png | 350×514 | 158369 | 557c112d52ac59cd8cb891f58c6092b3d06b51eda35587aae85a3444e413e2dd |
| deco_pumpkin_lantern_A.png | 382×407 | 153999 | 2c2e5562f08d073d092819a43a165a068bccc11f1d6cdc6aec4a7af4795304ec |
| deco_pumpkin_lantern_B.png | 382×407 | 153084 | 220cb50a1f03d2656f9892b98904262e1cd36f1ee0e0491379c2582c2b4ba30b |

final格納先: assets/images/Rooms/furnitures_final/

## alpha化・A/B QA

処理正本は build_final_assets.mjs（SHA256 24b70c0b651976e1dce6436d5a784df1b3b3c14a42b166b92ab32ee50229efa2）。

- rawの外周から白背景色を推定し、外周連結領域だけをalpha化した。
- partial alphaのRGBを背景色からdecontaminateし、透明画素RGBを0へ正規化した。
- panel境界3px、小さな孤立component、薄いdivider lineを除去した。
- 白い家具本体を欠損させないよう furn_kitchen_counter、furn_fridge、furn_kitchen_cabinet、deco_cookie_jar はenclosed whiteを保持した。
- 椅子間・ベンチ・持ち手内側の本来の空洞を残すため furn_dining_table_set、furn_garden_bench、deco_watering_can はpure-white hole判定を適用した。
- furn_dining_table_setとfurn_garden_table_parasolは被写体欠けを避けるcustom source rectを使用した。
- 最終48枚は全辺に16pxの透明余白、四隅alpha=0、3MB未満。最大は furn_garden_bench_B.png の696513 bytes。
- 各Bはdecoded pixel単位でAの厳密な水平反転。ライティング、木目、生地、線幅の生成差分はない。

qa/independent-audit.json（SHA256 5e18c313ed5a7690da1ebed67805dba5e90755f8402ffc3a551718b25a354284）は24点/48出力、RGBA、透明四隅、A/B exact flip、3MB未満、raw SHA不変、SW 2292を独立確認してPASSした。その後、cropを「source rectを±16pxでclampする方式」から「alpha 8以上のcontent bboxを新規透明canvasへ全辺16pxで配置する方式」へ正規化した。これによりpanel端で余白が9pxまたは3pxへ縮んでいたfurn_fridge、furn_kitchen_cabinet、furn_wardrobe_pink、furn_wardrobe_blueを全辺16pxへ直し、全点でbbox外のalpha 8未満の微小fringeを透明paddingへ持ち込まないようにした。opaque画素数は24点とも不変で、partial alphaだけが減少している。個別final PNGのbytes/SHAは、この最終補正後に更新したqa-final-assets.jsonと上表を正本とする。最終固定後にも別エージェントが48実ファイルを再decodeし、上表との一致とA/B exact flipを再確認した。

rawディレクトリ内27 PNGは処理前後のSHA256が全件一致し、alpha化・crop処理でraw自体を書き換えていない。採用14枚以外の候補も追跡用にrawのまま保持している。

## 不採用候補の理由要約

不採用13枚は削除せずrawへ保持した。主な理由は次のとおり。

- free候補で対応辺が±25/26°や±34/35°へずれ、奥行辺が2〜4°へ収束するgeometry不一致。
- 初回floor cushionが丸座布団ではなくpet-bedとして読めるsemantic不一致。専用single-rowのset02bへ変更。
- bench候補の一部がwooden sofaに見えるsemantic不一致、または±34° drift／対応辺の収束。J2だけgeometryとbench semanticを通過したがcanonical Bだったためfinal Aを反転生成。
- 初回sandboxは±35°へdriftしたためv2へ変更。
- 初回birdhouseはridge/eaveの軸がroom基準からdriftしたためv2へ変更。

## 実装・runtime・調整ツール確認

- room/items.js: 対象24 ID、A/Bパス、theme（all 20 / girl 2 / boy 2）、grid、cellSize、footprintSize、min/max、angleB、pivot値が補正前baselineと完全一致。
- tier: appでは新24点すべて利用可。book/freeでは新24点すべて利用不可。
- SW: sw.js CACHE_VERSION = 2292。対象48画像の更新をキャッシュ更新対象として反映。
- static: room/items.js、sw.js、build_final_assets.mjsのnode parse、room/index.htmlとroom/furniture_adjuster.htmlのinline script parse、git diff --checkをPASS。
- regression: room furniture app tier、book tier、pending section、shop furniture catalogをPASS。
- image load: 48/48をbrowser Image.decodeし、natural dimensionsが最終QAと一致。page errorと対象request failureは0。
- room代表操作: furn_sofa_beige、deco_cookie_jar、furn_kitchen_counterでA→B→reload（B維持）→A→reload（A維持）をPASS。
- responsive: 390×844、844×390、1024×768、1366×768で配置寸法が非ゼロ、document横overflowなし。
- furniture adjuster: 24点が各1件、pending 0、全点has-b、A/Bモデルとthumbnailが存在し、pivot A/Bは全点0。代表benchもA/Bと[0,0]を確認。page error 0。

## 現時点の変更範囲

このバッチのruntime差分は対象48 PNGとsw.js v2292。room/items.js、room/index.html、room/furniture_adjuster.html、common/tier.js、play.htmlは変更していない。納品文書として本ファイルとHANDOFF.mdの本バッチ1行を追加した。

現時点はlocal PASS / commit前であり、commit、push、staging deployは未実施。作業開始前からdirtyだったCLAUDE.mdとMEMORY.mdには触れていない。master、凍結develop、productionは変更していない。
