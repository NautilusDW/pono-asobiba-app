# ポノの海底アルバム Stage Plan

## Core Loop

1. Stage を選ぶ。
2. まっすぐ弾と、下へ落ちるぽよん弾で生き物を観察する。
3. 観察できた生き物がアルバムに登録される。
4. アルバムで「すむところ」「たべもの」「からだのひみつ」を読む。
5. 未発見カードとレアカードを集めるために再挑戦する。

## Weapon Growth

- Power 1: straight shot 1-way, bomb food orb 1
- Power 2: straight shot 2-way, bomb food orb 1
- Power 3: straight shot 3-way, bomb food orb 2
- Power 4: straight shot 3-way faster, bomb food orb 2 with wider splash

## Seven Stages

| Stage | Field | Regular album targets | Boss |
|---|---|---|---|
| 1 | しおだまりと浅瀬 | ヤドカリ、小エビ、ヒトデ、ハゼ、イソギンチャク | カブトガニ |
| 2 | サンゴの迷路 | クマノミ、ナンヨウハギ、チョウチョウウオ、タツノオトシゴ、クリーナーシュリンプ | オウムガイ |
| 3 | 海藻の森 | カニ、アワビ、ウニ、小魚群れ、イカ | ミズダコ |
| 4 | 外洋の青い道 | マンタ、マンボウ、トビウオ、クラゲ、イワシ群れ | メガマウス |
| 5 | 夕暮れの中層 | ハダカイワシ、ホウライエソ、細長い深海魚、クラゲ | リュウグウノツカイ |
| 6 | 深海の海底 | ダイオウグソクムシ、深海エビ、ナマコ、アンコウ、タカアシガニ系 | シーラカンス |
| 7 | 古代海底神殿 | ダイオウイカ、巨大クラゲ、古代魚風、深海甲殻類 | クラーケン伝説 |

## Stage 1 Alpha Asset Targets

After alpha/crop is done, save the final PNGs as:

```text
assets/images/sea-album/stage1/hermit_crab_normal.png
assets/images/sea-album/stage1/hermit_crab_eating.png
assets/images/sea-album/stage1/hermit_crab_happy.png
assets/images/sea-album/stage1/shrimp_normal.png
assets/images/sea-album/stage1/shrimp_eating.png
assets/images/sea-album/stage1/shrimp_happy.png
assets/images/sea-album/stage1/sea_star_normal.png
assets/images/sea-album/stage1/sea_star_eating.png
assets/images/sea-album/stage1/sea_star_happy.png
assets/images/sea-album/stage1/tidepool_goby_normal.png
assets/images/sea-album/stage1/tidepool_goby_eating.png
assets/images/sea-album/stage1/tidepool_goby_happy.png
assets/images/sea-album/stage1/sea_anemone_normal.png
assets/images/sea-album/stage1/sea_anemone_eating.png
assets/images/sea-album/stage1/sea_anemone_happy.png
assets/images/sea-album/stage1/horseshoe_crab_boss_normal.png
assets/images/sea-album/stage1/horseshoe_crab_boss_eating.png
assets/images/sea-album/stage1/horseshoe_crab_boss_happy.png
```

The player submarine uses the existing shared asset:

```text
assets/images/ocean/Submarine/Submarine_003.png
```

The current game uses canvas fallback drawings for creatures. After the expression files exist, set `USE_ALPHA_SPRITES` in `sea-album/index.html` to `true`.
